import { EventEmitter } from 'events';
import { logger } from '../../utils/logger';
import { ClaudeMessage } from '../ai/claudeClient';

export type VoiceSessionState =
  | 'idle'
  | 'listening'
  | 'processing'
  | 'speaking'
  | 'interrupted'
  | 'ended';

export interface VoiceSession {
  id: string;
  conversationId: string;
  userId: string;
  state: VoiceSessionState;
  messages: ClaudeMessage[];
  currentTranscript: string;
  isAISpeaking: boolean;
  lastUserSpeechTime: number;
  silenceTimer?: NodeJS.Timeout;
  interruptionCount: number;
  startedAt: Date;
  /** True when the client is streaming raw PCM audio (Deepgram pipeline) */
  audioActive: boolean;
  /** When true, silence timer is managed by AdaptiveResponseController */
  adaptiveMode: boolean;
}

export interface VoiceSessionConfig {
  silenceThresholdMs: number;
  interruptionThresholdMs: number;
  maxSessionDurationMs: number;
  minSpeechLengthMs: number;
}

const DEFAULT_CONFIG: VoiceSessionConfig = {
  silenceThresholdMs: 1500,        // Wait 1.5s of silence before processing
  interruptionThresholdMs: 300,    // Detect interruption after 300ms of user speech
  maxSessionDurationMs: 30 * 60 * 1000, // 30 minutes max
  minSpeechLengthMs: 500,          // Minimum speech duration to process
};

export class VoiceSessionManager extends EventEmitter {
  private sessions: Map<string, VoiceSession> = new Map();
  private config: VoiceSessionConfig;
  private cleanupInterval: ReturnType<typeof setInterval>;

  private static readonly STALE_SESSION_CHECK_MS = 5 * 60 * 1000; // 5 minutes
  private static readonly STALE_SESSION_MAX_AGE_MS = 30 * 60 * 1000; // 30 minutes

  constructor(config?: Partial<VoiceSessionConfig>) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Periodically clean up stale sessions
    this.cleanupInterval = setInterval(
      () => this.cleanupStaleSessions(),
      VoiceSessionManager.STALE_SESSION_CHECK_MS,
    );
  }

  /**
   * Clean up sessions that have been inactive for too long.
   * Catches sessions left behind by unexpected disconnects.
   */
  private cleanupStaleSessions(): void {
    const now = Date.now();
    for (const [id, session] of this.sessions) {
      const age = now - session.startedAt.getTime();
      const idleSince = now - session.lastUserSpeechTime;
      // Remove if session is older than max age AND idle for > 5 min
      if (
        age > VoiceSessionManager.STALE_SESSION_MAX_AGE_MS &&
        (session.lastUserSpeechTime === 0 || idleSince > VoiceSessionManager.STALE_SESSION_CHECK_MS)
      ) {
        logger.warn(`[SessionManager] Cleaning stale session ${id} (age: ${Math.round(age / 60000)}m)`);
        this.endSession(id, 'stale_cleanup');
      }
    }
  }

  /**
   * Stop the cleanup interval (for graceful shutdown)
   */
  destroy(): void {
    clearInterval(this.cleanupInterval);
  }

  /**
   * Create a new voice session
   */
  createSession(
    sessionId: string,
    conversationId: string,
    userId: string,
    existingMessages: ClaudeMessage[] = []
  ): VoiceSession {
    const session: VoiceSession = {
      id: sessionId,
      conversationId,
      userId,
      state: 'idle',
      messages: existingMessages,
      currentTranscript: '',
      isAISpeaking: false,
      lastUserSpeechTime: 0,
      interruptionCount: 0,
      startedAt: new Date(),
      audioActive: false,
      adaptiveMode: false,
    };

    this.sessions.set(sessionId, session);
    logger.info(`Voice session created: ${sessionId}`);

    // Set max session duration timer
    setTimeout(() => {
      this.endSession(sessionId, 'max_duration_reached');
    }, this.config.maxSessionDurationMs);

    return session;
  }

  /**
   * Get an existing session
   */
  getSession(sessionId: string): VoiceSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Handle incoming speech-to-text result
   */
  handleSpeechInput(sessionId: string, transcript: string, isFinal: boolean): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const now = Date.now();
    session.lastUserSpeechTime = now;

    // Check for interruption
    if (session.isAISpeaking) {
      this.handleInterruption(session, transcript);
      return;
    }

    // Update transcript
    if (isFinal) {
      session.currentTranscript += (session.currentTranscript ? ' ' : '') + transcript;
    }

    // Reset silence timer
    if (session.silenceTimer) {
      clearTimeout(session.silenceTimer);
    }

    // Set new silence timer for final transcripts
    // (skipped in adaptive mode — AdaptiveResponseController manages timing)
    if (isFinal) {
      session.state = 'listening';
      if (!session.adaptiveMode) {
        session.silenceTimer = setTimeout(() => {
          this.processSpeechComplete(session);
        }, this.config.silenceThresholdMs);
      }
    }

    this.emit('transcriptUpdate', {
      sessionId,
      transcript: session.currentTranscript,
      isFinal,
    });
  }

  /**
   * Handle user interrupting AI speech
   */
  private handleInterruption(session: VoiceSession, transcript: string): void {
    session.interruptionCount++;
    session.state = 'interrupted';
    session.isAISpeaking = false;

    logger.info(`Interruption detected in session ${session.id}: "${transcript}"`);

    this.emit('interrupted', {
      sessionId: session.id,
      interruptionCount: session.interruptionCount,
      userSaid: transcript,
    });

    // Clear any pending transcript and start fresh with interruption
    session.currentTranscript = transcript;

    // Give a short delay before processing to catch any continued speech
    session.silenceTimer = setTimeout(() => {
      this.processSpeechComplete(session);
    }, this.config.silenceThresholdMs);
  }

  /**
   * Process completed speech input
   */
  private processSpeechComplete(session: VoiceSession): void {
    if (!session.currentTranscript.trim()) {
      session.state = 'idle';
      return;
    }

    session.state = 'processing';

    // Add user message to history
    const userMessage: ClaudeMessage = {
      role: 'user',
      content: session.currentTranscript.trim(),
    };
    session.messages.push(userMessage);

    this.emit('speechComplete', {
      sessionId: session.id,
      transcript: session.currentTranscript.trim(),
      messages: session.messages,
    });

    // Clear current transcript for next turn
    session.currentTranscript = '';
  }

  /**
   * Mark AI as starting to speak
   */
  startAISpeech(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.state = 'speaking';
    session.isAISpeaking = true;

    this.emit('aiSpeechStart', { sessionId });
  }

  /**
   * Mark AI as finished speaking
   */
  endAISpeech(sessionId: string, response: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    // Only add to messages if not interrupted
    if (session.state !== 'interrupted') {
      session.messages.push({
        role: 'assistant',
        content: response,
      });
    }

    session.state = 'idle';
    session.isAISpeaking = false;

    this.emit('aiSpeechEnd', { sessionId, response });
  }

  /**
   * Handle streaming AI response
   */
  handleStreamChunk(sessionId: string, chunk: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    // Check if user is trying to interrupt
    if (session.state === 'interrupted') {
      this.emit('streamCancelled', { sessionId, reason: 'user_interruption' });
      return;
    }

    this.emit('streamChunk', { sessionId, chunk });
  }

  /**
   * Force stop AI speech (for interruption handling)
   */
  stopAISpeech(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.isAISpeaking = false;
    session.state = 'listening';

    this.emit('aiSpeechStopped', { sessionId });
  }

  /**
   * Get session state
   */
  getState(sessionId: string): VoiceSessionState | null {
    return this.sessions.get(sessionId)?.state || null;
  }

  /**
   * Get message history
   */
  getMessages(sessionId: string): ClaudeMessage[] {
    return this.sessions.get(sessionId)?.messages || [];
  }

  /**
   * End a voice session
   */
  endSession(sessionId: string, reason: string = 'user_ended'): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    if (session.silenceTimer) {
      clearTimeout(session.silenceTimer);
    }

    session.state = 'ended';

    const duration = Date.now() - session.startedAt.getTime();

    this.emit('sessionEnded', {
      sessionId,
      conversationId: session.conversationId,
      userId: session.userId,
      reason,
      duration,
      messageCount: session.messages.length,
      interruptionCount: session.interruptionCount,
    });

    this.sessions.delete(sessionId);
    logger.info(`Voice session ended: ${sessionId}, reason: ${reason}`);
  }

  /**
   * Check if user is currently speaking
   */
  isUserSpeaking(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    const timeSinceLastSpeech = Date.now() - session.lastUserSpeechTime;
    return timeSinceLastSpeech < this.config.silenceThresholdMs;
  }

  /**
   * Get all active session IDs
   */
  getActiveSessions(): string[] {
    return Array.from(this.sessions.keys());
  }

  /**
   * Set whether the client is streaming raw audio for this session.
   */
  setAudioActive(sessionId: string, active: boolean): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.audioActive = active;
    }
  }

  /**
   * Enable/disable adaptive response mode for a session.
   * When enabled, the silence timer in handleSpeechInput is skipped —
   * the AdaptiveResponseController manages timing instead.
   */
  setAdaptiveMode(sessionId: string, enabled: boolean): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.adaptiveMode = enabled;
      if (enabled && session.silenceTimer) {
        clearTimeout(session.silenceTimer);
        session.silenceTimer = undefined;
      }
    }
  }

  /**
   * Externally trigger speech processing (used by AdaptiveResponseController).
   * Equivalent to the silence timer firing.
   */
  triggerProcessing(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session || !session.currentTranscript.trim()) return;
    if (session.silenceTimer) {
      clearTimeout(session.silenceTimer);
      session.silenceTimer = undefined;
    }
    this.processSpeechComplete(session);
  }

  /**
   * Get session stats
   */
  getSessionStats(sessionId: string): object | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    return {
      duration: Date.now() - session.startedAt.getTime(),
      messageCount: session.messages.length,
      interruptionCount: session.interruptionCount,
      state: session.state,
    };
  }
}

export default VoiceSessionManager;
