import { EventEmitter } from 'events';
import { logger } from '../../utils/logger';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ResponseDecision =
  | 'respond_eager'
  | 'respond_normal'
  | 'respond_encourage'
  | 'wait'
  | 'extend_wait';

export interface ResponseDecisionEvent {
  sessionId: string;
  decision: ResponseDecision;
  reason: string;
  transcript: string;
}

export interface AdaptiveResponseConfig {
  /** Base silence duration before responding (ms). Default: 1200 */
  defaultSilenceMs: number;
  /** Extended wait for short/incomplete fragments (ms). Default: 2500 */
  extendedSilenceMs: number;
  /** Fast response for direct questions (ms). Default: 800 */
  eagerSilenceMs: number;
  /** Slightly faster response for hesitation encouragement (ms). Default: 1000 */
  encourageSilenceMs: number;
  /** Ignore transcripts shorter than this (chars). Default: 3 */
  minTranscriptLength: number;
}

interface SessionState {
  level?: string;
  lastTranscript: string;
  isInterimFlowing: boolean;
  isAISpeaking: boolean;
  silenceTimer: ReturnType<typeof setTimeout> | null;
  lastTranscriptTime: number;
  /** Current emotional state — used for turn-taking patience */
  emotionalState: EmotionalState;
}

/** Emotional states that warrant extra patience (longer silence thresholds) */
type EmotionalState =
  | 'confident' | 'engaged' | 'curious'
  | 'frustrated' | 'anxious' | 'bored'
  | 'confused' | 'tired' | 'excited' | 'neutral';

const HESITANT_EMOTIONS: EmotionalState[] = ['confused', 'anxious', 'frustrated', 'tired'];

// ---------------------------------------------------------------------------
// Detection patterns
// ---------------------------------------------------------------------------

/** Filler / hesitation patterns (multilingual) */
const FILLER_PATTERNS: RegExp[] = [
  /\b(umm?|uh+|uhm|ehm?|euh|hmm+|mmm+)\b/i,
  /\b(come si dice|how do you say|comment dire|wie sagt man|cómo se dice)\b/i,
  /\b(let me think|aspetta|attendez|warte|espera)\b/i,
];

/** Interrogative words at the start of an utterance (multilingual) */
const INTERROGATIVE_START =
  /^(what|how|why|where|when|who|which|do|does|is|are|can|could|would|should|che|cosa|come|perch[eé]|dove|quando|chi|quale|qu[eé]|c[oó]mo|por\s?qu[eé]|d[oó]nde|cu[aá]ndo|qui[eé]n)\b/i;

/** Sentence-ending punctuation */
const SENTENCE_END = /[.!;]\s*$/;

// ---------------------------------------------------------------------------
// Default config
// ---------------------------------------------------------------------------

const DEFAULT_CONFIG: AdaptiveResponseConfig = {
  defaultSilenceMs: 1200,
  extendedSilenceMs: 2500,
  eagerSilenceMs: 800,
  encourageSilenceMs: 1000,
  minTranscriptLength: 3,
};

// ---------------------------------------------------------------------------
// Controller
// ---------------------------------------------------------------------------

/**
 * Monitors Deepgram transcript events and decides *when* and *how* the AI
 * should respond.  Emits `responseDecision` events consumed by
 * VoiceSocketHandler to gate `processUserSpeech()`.
 *
 * Product-vision rules encoded:
 *  - Never interrupt the user while they are speaking.
 *  - Detect hesitation / fillers → encourage with simpler language.
 *  - Give the user time to speak (default bias toward waiting).
 *  - Respond quickly to direct questions.
 */
export class AdaptiveResponseController extends EventEmitter {
  private sessions = new Map<string, SessionState>();
  private config: AdaptiveResponseConfig;

  constructor(config?: Partial<AdaptiveResponseConfig>) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // -----------------------------------------------------------------------
  // Session lifecycle
  // -----------------------------------------------------------------------

  registerSession(sessionId: string, context?: { level?: string }): void {
    this.sessions.set(sessionId, {
      level: context?.level,
      lastTranscript: '',
      isInterimFlowing: false,
      isAISpeaking: false,
      silenceTimer: null,
      lastTranscriptTime: 0,
      emotionalState: 'neutral',
    });
    logger.info(`[Adaptive] Registered session ${sessionId}`);
  }

  /**
   * Update the emotional state for a session.
   * Used by VoiceSocketHandler to feed emotional signals from the
   * adaptation engine, enabling turn-taking patience for hesitant users.
   */
  setEmotionalState(sessionId: string, emotion: EmotionalState): void {
    const state = this.sessions.get(sessionId);
    if (state) {
      state.emotionalState = emotion;
    }
  }

  unregisterSession(sessionId: string): void {
    const state = this.sessions.get(sessionId);
    if (state?.silenceTimer) {
      clearTimeout(state.silenceTimer);
    }
    this.sessions.delete(sessionId);
    logger.info(`[Adaptive] Unregistered session ${sessionId}`);
  }

  hasSession(sessionId: string): boolean {
    return this.sessions.has(sessionId);
  }

  // -----------------------------------------------------------------------
  // Transcript events (from Deepgram via VoiceSocketHandler)
  // -----------------------------------------------------------------------

  onTranscript(sessionId: string, transcript: string, isFinal: boolean): void {
    const state = this.sessions.get(sessionId);
    if (!state) return;

    if (!isFinal) {
      // Interim transcript — user is still speaking
      state.isInterimFlowing = true;
      this.clearTimer(state);
      logger.debug(`[Adaptive] ${sessionId} | interim flowing — waiting`);
      return;
    }

    // Final transcript
    state.isInterimFlowing = false;
    state.lastTranscriptTime = Date.now();

    if (transcript.trim()) {
      state.lastTranscript += (state.lastTranscript ? ' ' : '') + transcript.trim();
    }

    logger.debug(
      `[Adaptive] ${sessionId} | final transcript: "${state.lastTranscript}"`,
    );

    // Start the silence evaluation timer
    this.startEvaluationTimer(sessionId, state);
  }

  /**
   * Deepgram VAD detected end-of-utterance → evaluate immediately.
   */
  onUtteranceEnd(sessionId: string): void {
    const state = this.sessions.get(sessionId);
    if (!state) return;

    this.clearTimer(state);

    if (state.lastTranscript.trim()) {
      logger.debug(`[Adaptive] ${sessionId} | utteranceEnd — evaluating now`);
      this.evaluate(sessionId, state);
    }
  }

  // -----------------------------------------------------------------------
  // AI speech state
  // -----------------------------------------------------------------------

  onAISpeechStart(sessionId: string): void {
    const state = this.sessions.get(sessionId);
    if (state) {
      state.isAISpeaking = true;
    }
  }

  onAISpeechEnd(sessionId: string): void {
    const state = this.sessions.get(sessionId);
    if (state) {
      state.isAISpeaking = false;
    }
  }

  // -----------------------------------------------------------------------
  // Internal: evaluation logic
  // -----------------------------------------------------------------------

  private startEvaluationTimer(sessionId: string, state: SessionState): void {
    this.clearTimer(state);

    // Determine base delay from transcript analysis + emotional state
    const delayMs = this.getInitialDelay(state.lastTranscript, state.emotionalState);

    state.silenceTimer = setTimeout(() => {
      state.silenceTimer = null;
      this.evaluate(sessionId, state);
    }, delayMs);
  }

  /**
   * Pick the silence duration based on a quick scan of the transcript
   * and the user's emotional state.
   *
   * Turn-taking patience: when the user is anxious, confused, or
   * frustrated, we give them significantly more time to formulate
   * their thoughts before the AI jumps in.
   */
  private getInitialDelay(transcript: string, emotionalState: EmotionalState = 'neutral'): number {
    const trimmed = transcript.trim();

    // ── Patience multiplier for hesitant users ──
    const patienceMultiplier = HESITANT_EMOTIONS.includes(emotionalState) ? 1.8 : 1.0;

    // Questions → respond faster (but still apply patience if user is struggling)
    if (trimmed.endsWith('?') || INTERROGATIVE_START.test(trimmed)) {
      return Math.round(this.config.eagerSilenceMs * patienceMultiplier);
    }

    // Fillers → encourage quickly (patience helps here too)
    if (this.detectFiller(trimmed)) {
      return Math.round(this.config.encourageSilenceMs * patienceMultiplier);
    }

    return Math.round(this.config.defaultSilenceMs * patienceMultiplier);
  }

  /**
   * Core decision engine.  Called after the silence timer fires or on
   * utteranceEnd.  Emits exactly one `responseDecision` event.
   */
  private evaluate(sessionId: string, state: SessionState): void {
    const transcript = state.lastTranscript.trim();
    const silenceMs = Date.now() - state.lastTranscriptTime;

    // ── 1. AI is speaking — never stack responses ──
    if (state.isAISpeaking) {
      this.emitDecision(sessionId, 'wait', 'AI is speaking', transcript);
      return;
    }

    // ── 2. User still speaking (interim transcripts flowing) ──
    if (state.isInterimFlowing) {
      this.emitDecision(sessionId, 'wait', 'User still speaking', transcript);
      return;
    }

    // ── 3. Transcript too short — give user more time ──
    if (transcript.length < this.config.minTranscriptLength) {
      this.emitDecision(
        sessionId,
        'extend_wait',
        `Short fragment (${transcript.length} chars), giving user more time`,
        transcript,
      );
      this.startExtendedTimer(sessionId, state);
      return;
    }

    // ── 4. Filler / hesitation patterns → encourage ──
    const filler = this.detectFiller(transcript);
    if (filler) {
      this.emitDecision(
        sessionId,
        'respond_encourage',
        `Hesitation detected: "${filler}"`,
        transcript,
      );
      // Clear transcript for next turn
      state.lastTranscript = '';
      return;
    }

    // ── 5. Question → respond eagerly ──
    if (transcript.endsWith('?') || INTERROGATIVE_START.test(transcript)) {
      this.emitDecision(
        sessionId,
        'respond_eager',
        `Question detected | silence=${silenceMs}ms`,
        transcript,
      );
      state.lastTranscript = '';
      return;
    }

    // ── 6. Complete sentence → respond normally ──
    if (SENTENCE_END.test(transcript)) {
      this.emitDecision(
        sessionId,
        'respond_normal',
        `Complete sentence | silence=${silenceMs}ms`,
        transcript,
      );
      state.lastTranscript = '';
      return;
    }

    // ── 7. Incomplete fragment → extend wait ──
    this.emitDecision(
      sessionId,
      'extend_wait',
      `Incomplete fragment, giving user more time | silence=${silenceMs}ms`,
      transcript,
    );
    this.startExtendedTimer(sessionId, state);
  }

  /**
   * Start a secondary (longer) timer.  When it fires, respond normally —
   * the user has had enough time.
   */
  private startExtendedTimer(sessionId: string, state: SessionState): void {
    this.clearTimer(state);

    // Apply patience multiplier for hesitant users
    const patienceMultiplier = HESITANT_EMOTIONS.includes(state.emotionalState) ? 1.8 : 1.0;
    const extendedMs = Math.round(this.config.extendedSilenceMs * patienceMultiplier);

    state.silenceTimer = setTimeout(() => {
      state.silenceTimer = null;
      const transcript = state.lastTranscript.trim();

      if (!transcript || state.isAISpeaking || state.isInterimFlowing) {
        return;
      }

      const silenceMs = Date.now() - state.lastTranscriptTime;
      this.emitDecision(
        sessionId,
        'respond_normal',
        `Extended wait expired | silence=${silenceMs}ms`,
        transcript,
      );
      state.lastTranscript = '';
    }, extendedMs);
  }

  // -----------------------------------------------------------------------
  // Helpers
  // -----------------------------------------------------------------------

  private detectFiller(transcript: string): string | null {
    for (const pattern of FILLER_PATTERNS) {
      const match = transcript.match(pattern);
      if (match) return match[0];
    }
    return null;
  }

  private emitDecision(
    sessionId: string,
    decision: ResponseDecision,
    reason: string,
    transcript: string,
  ): void {
    const event: ResponseDecisionEvent = { sessionId, decision, reason, transcript };

    logger.info(
      `[Adaptive] ${sessionId} | decision=${decision} | reason=${reason} | transcript="${transcript.slice(0, 80)}"`,
    );

    this.emit('responseDecision', event);
  }

  private clearTimer(state: SessionState): void {
    if (state.silenceTimer) {
      clearTimeout(state.silenceTimer);
      state.silenceTimer = null;
    }
  }
}

export default AdaptiveResponseController;
