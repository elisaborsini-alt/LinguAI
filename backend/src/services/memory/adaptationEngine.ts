import {
  AdaptationState,
  AdaptationDirective,
  CEFRLevel,
  EmotionalState,
  ConfidenceSignal,
  LearningProfile,
  ErrorPattern,
  VocabularyItem,
  CorrectionFrequency,
  EncouragementLevel,
  MemoryContextForAI,
  PersonalFact,
  PersonalFactCategory,
  LearningGoal,
} from './types';
import { ShortTermMemoryManager, getShortTermMemory } from './shortTermMemory';
import { LongTermMemoryManager, getLongTermMemory } from './longTermMemory';
import { logger } from '../../utils/logger';
import { getGrowthMomentDetector } from '../progress/growthMomentDetector';

// ============================================
// Adaptation Engine
// Core differentiator: Dynamic AI behavior
// ============================================

export interface AdaptationRules {
  // How many errors before reducing complexity
  errorThresholdForSimplification: number;

  // How many correct responses before increasing complexity
  successThresholdForChallenge: number;

  // Hesitation ratio that triggers slower pace
  hesitationThresholdForSlowdown: number;

  // Emotional states that trigger specific adaptations
  emotionalTriggers: Map<EmotionalState, AdaptationAction[]>;

  // Level-specific rules
  levelRules: Map<CEFRLevel, LevelAdaptationConfig>;
}

export interface AdaptationAction {
  type: 'adjust_complexity' | 'adjust_pace' | 'adjust_correction' | 'adjust_encouragement';
  delta?: number;
  value?: string;
}

export interface LevelAdaptationConfig {
  // Sentence construction
  maxWordsPerSentence: number;
  maxClausesPerSentence: number;
  preferredTenses: string[];
  allowedGrammaticalStructures: string[];

  // Vocabulary
  targetVocabularyRange: number; // Most common N words
  cognatesAllowed: boolean;
  idiomFrequency: 'never' | 'rarely' | 'sometimes' | 'often';

  // Corrections
  defaultCorrectionFrequency: CorrectionFrequency;
  correctionExplicitness: 'recast' | 'implicit' | 'explicit';

  // Encouragement
  encouragementFrequency: number; // Every N exchanges
  praiseForCorrectness: boolean;
  praiseForAttempt: boolean;
}

// Default rules by CEFR level
const LEVEL_CONFIGS: Record<CEFRLevel, LevelAdaptationConfig> = {
  A1: {
    maxWordsPerSentence: 8,
    maxClausesPerSentence: 1,
    preferredTenses: ['present_simple'],
    allowedGrammaticalStructures: ['svo', 'questions_yes_no'],
    targetVocabularyRange: 500,
    cognatesAllowed: true,
    idiomFrequency: 'never',
    defaultCorrectionFrequency: 'significant_only',
    correctionExplicitness: 'recast',
    encouragementFrequency: 2,
    praiseForCorrectness: true,
    praiseForAttempt: true,
  },
  A2: {
    maxWordsPerSentence: 12,
    maxClausesPerSentence: 2,
    preferredTenses: ['present_simple', 'past_simple', 'future_going_to'],
    allowedGrammaticalStructures: ['svo', 'questions_wh', 'negation'],
    targetVocabularyRange: 1500,
    cognatesAllowed: true,
    idiomFrequency: 'rarely',
    defaultCorrectionFrequency: 'significant_only',
    correctionExplicitness: 'implicit',
    encouragementFrequency: 3,
    praiseForCorrectness: true,
    praiseForAttempt: true,
  },
  B1: {
    maxWordsPerSentence: 18,
    maxClausesPerSentence: 2,
    preferredTenses: ['present_simple', 'past_simple', 'present_perfect', 'future_will'],
    allowedGrammaticalStructures: ['svo', 'relative_clauses', 'conditionals_1'],
    targetVocabularyRange: 3000,
    cognatesAllowed: true,
    idiomFrequency: 'sometimes',
    defaultCorrectionFrequency: 'every_error',
    correctionExplicitness: 'explicit',
    encouragementFrequency: 4,
    praiseForCorrectness: true,
    praiseForAttempt: false,
  },
  B2: {
    maxWordsPerSentence: 25,
    maxClausesPerSentence: 3,
    preferredTenses: ['all_common_tenses'],
    allowedGrammaticalStructures: ['all_common', 'conditionals_2', 'passive'],
    targetVocabularyRange: 5000,
    cognatesAllowed: true,
    idiomFrequency: 'often',
    defaultCorrectionFrequency: 'every_error',
    correctionExplicitness: 'explicit',
    encouragementFrequency: 5,
    praiseForCorrectness: false,
    praiseForAttempt: false,
  },
  C1: {
    maxWordsPerSentence: 35,
    maxClausesPerSentence: 4,
    preferredTenses: ['all_tenses'],
    allowedGrammaticalStructures: ['all', 'conditionals_3', 'subjunctive'],
    targetVocabularyRange: 8000,
    cognatesAllowed: true,
    idiomFrequency: 'often',
    defaultCorrectionFrequency: 'every_error',
    correctionExplicitness: 'explicit',
    encouragementFrequency: 8,
    praiseForCorrectness: false,
    praiseForAttempt: false,
  },
  C2: {
    maxWordsPerSentence: 50,
    maxClausesPerSentence: 5,
    preferredTenses: ['all_tenses'],
    allowedGrammaticalStructures: ['all', 'complex_inversions'],
    targetVocabularyRange: 15000,
    cognatesAllowed: true,
    idiomFrequency: 'often',
    defaultCorrectionFrequency: 'periodic_summary',
    correctionExplicitness: 'explicit',
    encouragementFrequency: 10,
    praiseForCorrectness: false,
    praiseForAttempt: false,
  },
};

export class AdaptationEngine {
  private stm: ShortTermMemoryManager;
  private ltm: LongTermMemoryManager;

  // ── Emotional Safety Circuit Breaker ──
  /** Consecutive negative emotional signals per session */
  private frustrationCounters = new Map<string, number>();
  /** Whether the circuit breaker is currently active */
  private circuitBreakerActive = new Map<string, boolean>();
  /**
   * Cooldown counter: how many user messages remain before the circuit
   * breaker deactivates.  Gives the user breathing room.
   */
  private circuitBreakerCooldown = new Map<string, number>();

  /** Number of consecutive negative signals that triggers the breaker */
  private static readonly CIRCUIT_BREAKER_THRESHOLD = 3;
  /** Messages of "calm mode" before the breaker auto-deactivates */
  private static readonly CIRCUIT_BREAKER_COOLDOWN_MESSAGES = 2;

  constructor() {
    this.stm = getShortTermMemory();
    this.ltm = getLongTermMemory();
  }

  // ============================================
  // Emotional Safety Circuit Breaker
  // ============================================

  private static readonly NEGATIVE_EMOTIONS: EmotionalState[] = [
    'frustrated', 'anxious', 'confused', 'tired',
  ];

  /**
   * Process an emotional signal and evaluate whether to activate
   * the circuit breaker.
   *
   * Rules:
   * - 3 consecutive negative signals → ACTIVATE
   * - Any positive signal decays the counter
   * - Once active, stays on for COOLDOWN_MESSAGES user messages
   * - Activation injects calming directives + suppresses corrections
   */
  processEmotionalSafety(conversationId: string, emotion: EmotionalState): void {
    const counter = this.frustrationCounters.get(conversationId) || 0;

    if (AdaptationEngine.NEGATIVE_EMOTIONS.includes(emotion)) {
      const newCount = counter + 1;
      this.frustrationCounters.set(conversationId, newCount);

      logger.debug(
        `[CircuitBreaker] ${conversationId} negative signal #${newCount}: ${emotion}`,
      );

      // Activate circuit breaker at threshold
      if (
        newCount >= AdaptationEngine.CIRCUIT_BREAKER_THRESHOLD &&
        !this.circuitBreakerActive.get(conversationId)
      ) {
        this.activateCircuitBreaker(conversationId, emotion);
      }
    } else {
      // Positive / neutral signal: decay counter (never below 0)
      this.frustrationCounters.set(conversationId, Math.max(0, counter - 1));

      // If counter hits 0 and breaker is in cooldown, deactivate
      if (counter <= 1 && this.circuitBreakerActive.get(conversationId)) {
        this.deactivateCircuitBreaker(conversationId, 'positive_signal_recovery');
      }
    }
  }

  /**
   * Called after each user message to tick down the cooldown counter.
   * When cooldown reaches 0, the breaker deactivates automatically.
   */
  tickCircuitBreakerCooldown(conversationId: string): void {
    if (!this.circuitBreakerActive.get(conversationId)) return;

    const remaining = (this.circuitBreakerCooldown.get(conversationId) || 0) - 1;
    this.circuitBreakerCooldown.set(conversationId, remaining);

    if (remaining <= 0) {
      this.deactivateCircuitBreaker(conversationId, 'cooldown_expired');
    }
  }

  private activateCircuitBreaker(conversationId: string, trigger: EmotionalState): void {
    this.circuitBreakerActive.set(conversationId, true);
    this.circuitBreakerCooldown.set(
      conversationId,
      AdaptationEngine.CIRCUIT_BREAKER_COOLDOWN_MESSAGES,
    );

    logger.warn(
      `[CircuitBreaker] ACTIVATED for ${conversationId} — trigger: ${trigger}`,
    );

    // Immediately adjust STM adaptation state
    this.stm.setCorrectionFrequency(
      conversationId,
      'on_request',
      'Circuit breaker activated — suppress corrections',
    );
    this.stm.setEncouragementLevel(
      conversationId,
      'intensive',
      'Circuit breaker activated — maximum encouragement',
    );
    this.stm.adjustPace(
      conversationId,
      -1,
      'Circuit breaker activated — slow down',
    );
  }

  private deactivateCircuitBreaker(conversationId: string, reason: string): void {
    this.circuitBreakerActive.delete(conversationId);
    this.circuitBreakerCooldown.delete(conversationId);
    this.frustrationCounters.set(conversationId, 0);

    logger.info(
      `[CircuitBreaker] Deactivated for ${conversationId} — reason: ${reason}`,
    );

    // Restore to balanced defaults (STM will re-adapt from there)
    this.stm.setCorrectionFrequency(
      conversationId,
      'significant_only',
      'Circuit breaker deactivated — restore corrections',
    );
    this.stm.setEncouragementLevel(
      conversationId,
      'supportive',
      'Circuit breaker deactivated — ease back',
    );
  }

  /**
   * Check if the circuit breaker is currently active for a session.
   */
  isCircuitBreakerActive(conversationId: string): boolean {
    return this.circuitBreakerActive.get(conversationId) || false;
  }

  /**
   * Get the frustration level (0 = calm, THRESHOLD+ = circuit breaker)
   */
  getFrustrationLevel(conversationId: string): number {
    return this.frustrationCounters.get(conversationId) || 0;
  }

  /**
   * Clean up circuit breaker state when a session ends.
   */
  cleanupSession(conversationId: string): void {
    this.frustrationCounters.delete(conversationId);
    this.circuitBreakerActive.delete(conversationId);
    this.circuitBreakerCooldown.delete(conversationId);
  }

  // ============================================
  // Main Adaptation Methods
  // ============================================

  /**
   * Build complete memory context for AI prompts
   */
  async buildMemoryContext(
    userId: string,
    conversationId: string,
    currentMessage: string
  ): Promise<MemoryContextForAI> {
    // Get short-term session state
    const session = this.stm.getSession(conversationId);

    // Get long-term memory
    const ltMemory = await this.ltm.getMemory(userId);

    // Get relevant facts based on current context
    const relevantFacts = await this.ltm.getRelevantFacts(userId, currentMessage, 5);

    // Get active error patterns
    const errorPatterns = await this.ltm.getActiveErrorPatterns(userId, 5);

    // Get vocabulary for reinforcement
    const vocabularyFocus = await this.ltm.getVocabularyForReinforcement(userId, 5);

    // Get recent sessions for continuity
    const recentSessions = await this.ltm.getRecentSessions(userId, 1);

    // Get active conversation threads
    const activeThreads = await this.ltm.getActiveThreads(userId, 3);

    // Calculate adaptation directives
    const directives = this.calculateAdaptationDirectives(session, ltMemory);

    // Detect growth moment (lightweight, short-circuits fast)
    const currentMood = session?.emotionalTrajectory.slice(-1)[0]?.state || 'neutral';
    let growthMoment: MemoryContextForAI['growthMoment'];
    try {
      const detector = getGrowthMomentDetector();
      const moment = await detector.detect(userId, conversationId, currentMood as EmotionalState);
      if (moment) {
        growthMoment = moment;
      }
    } catch (e) {
      logger.error('[GrowthMoment] Detection error (non-fatal):', e);
    }

    return {
      userProfile: {
        name: relevantFacts.find(f => f.category === 'name')?.content,
        nativeLanguage: ltMemory?.learningProfile.nativeLanguage || 'unknown',
        primaryGoal: ltMemory?.learningProfile.primaryGoal || 'conversation',
        currentLevel: ltMemory?.learningProfile.levels.overall || 'A2',
        levelConfidence: ltMemory?.learningProfile.levels.confidence || 0.5,
      },
      activeErrorPatterns: errorPatterns.map(p => ({
        pattern: p.pattern,
        category: p.category,
        frequency: p.frequency,
        recentExample: p.examples[p.examples.length - 1]?.original,
      })),
      vocabularyFocus: vocabularyFocus.map(v => ({
        word: v.word,
        mastery: v.mastery,
        needsReinforcement: v.mastery < 0.5,
      })),
      pronunciationWeaknesses: ltMemory?.pronunciationProfile.weakSounds
        .filter(s => s.severity !== 'minor')
        .map(s => `${s.sound} confused with ${s.confusedWith}`) || [],
      relevantFacts: relevantFacts.map(f => ({
        category: f.category,
        content: f.content,
      })),
      lastSessionSummary: recentSessions[0]?.narrativeSummary,
      continuityPoints: this.extractContinuityPoints(recentSessions[0]),
      activeThreads,
      currentMood: session?.emotionalTrajectory.slice(-1)[0]?.state || 'neutral',
      recentConfidenceSignals: session?.confidenceSignals.slice(-5) || [],
      sessionErrorCount: session?.sessionErrors.length || 0,
      circuitBreakerActive: this.isCircuitBreakerActive(conversationId),
      frustrationLevel: this.getFrustrationLevel(conversationId),
      adaptiveChallengeAllowed: this.stm.isAdaptiveChallengeAllowed(conversationId),
      sessionTopics: this.stm.getTopicsDiscussed(conversationId),
      adaptationDirectives: directives,
      growthMoment,
    };
  }

  /**
   * Get level-appropriate constraints for AI response generation
   */
  getLevelConstraints(level: CEFRLevel): LevelAdaptationConfig {
    return LEVEL_CONFIGS[level];
  }

  /**
   * Calculate dynamic complexity level based on session performance
   */
  calculateEffectiveLevel(
    baseLevel: CEFRLevel,
    session: ReturnType<ShortTermMemoryManager['getSession']>
  ): CEFRLevel {
    if (!session) return baseLevel;

    const levels: CEFRLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
    const baseIndex = levels.indexOf(baseLevel);

    // Apply complexity modifier from session
    const modifier = session.currentAdaptation.complexityModifier;
    const adjustedIndex = Math.max(0, Math.min(5, Math.round(baseIndex + modifier)));

    return levels[adjustedIndex];
  }

  /**
   * Generate speaking guidelines for current adaptation state
   */
  generateSpeakingGuidelines(
    level: CEFRLevel,
    adaptationState: AdaptationState,
    emotionalState: EmotionalState
  ): string {
    const config = LEVEL_CONFIGS[level];
    const guidelines: string[] = [];

    // Sentence length guidance
    const sentenceLengthGuide = adaptationState.targetSentenceLength === 'short'
      ? `Use very short sentences (max ${Math.floor(config.maxWordsPerSentence * 0.6)} words).`
      : adaptationState.targetSentenceLength === 'long'
      ? `Use natural flowing sentences (up to ${config.maxWordsPerSentence} words).`
      : `Use moderate sentence length (around ${Math.floor(config.maxWordsPerSentence * 0.8)} words).`;

    guidelines.push(sentenceLengthGuide);

    // Vocabulary guidance
    guidelines.push(`Vocabulary: Target the most common ${config.targetVocabularyRange} words.`);

    if (config.idiomFrequency === 'never') {
      guidelines.push('Avoid idioms and figurative language entirely.');
    } else if (config.idiomFrequency === 'rarely') {
      guidelines.push('Use only very common, easily understood idioms.');
    }

    // Pace guidance
    if (adaptationState.paceModifier <= -1) {
      guidelines.push('Speak slowly and clearly. Pause between clauses.');
    } else if (adaptationState.paceModifier >= 1) {
      guidelines.push('Speak at natural conversational pace.');
    }

    // Emotional adaptation
    switch (emotionalState) {
      case 'frustrated':
        guidelines.push('Be extra patient. Validate their effort. Offer gentle alternatives.');
        break;
      case 'confused':
        guidelines.push('Simplify immediately. Ask clarifying questions. Offer examples.');
        break;
      case 'bored':
        guidelines.push('Introduce more challenging elements. Ask thought-provoking questions.');
        break;
      case 'anxious':
        guidelines.push('Be calm and reassuring. Give space, then gently continue.');
        break;
      case 'confident':
        guidelines.push('Challenge them appropriately. Engage in natural discourse.');
        break;
    }

    return guidelines.join('\n');
  }

  /**
   * Generate correction strategy for current state
   */
  generateCorrectionStrategy(
    level: CEFRLevel,
    adaptationState: AdaptationState,
    emotionalState: EmotionalState,
    activePatterns: ErrorPattern[]
  ): string {
    const config = LEVEL_CONFIGS[level];
    const strategies: string[] = [];

    // Base correction frequency
    switch (adaptationState.correctionFrequency) {
      case 'every_error':
        strategies.push('Correct all errors immediately after the learner speaks.');
        break;
      case 'significant_only':
        strategies.push('Only correct errors that impede understanding or are significant grammar mistakes.');
        break;
      case 'periodic_summary':
        strategies.push('Note errors silently and provide a summary at natural breaks in conversation.');
        break;
      case 'on_request':
        strategies.push('Only provide corrections when the learner asks for them.');
        break;
    }

    // Correction style
    switch (config.correctionExplicitness) {
      case 'recast':
        strategies.push('Use recasting: repeat what they said correctly in your response without explicitly pointing out the error.');
        break;
      case 'implicit':
        strategies.push('Use implicit corrections embedded in your response, with slight emphasis on the corrected form.');
        break;
      case 'explicit':
        strategies.push('Explicitly point out errors with the correction and a brief explanation.');
        break;
    }

    // Pattern-aware corrections
    if (activePatterns.length > 0) {
      const topPatterns = activePatterns.slice(0, 2);
      strategies.push(
        `Watch especially for these recurring issues: ${topPatterns.map(p => p.pattern).join('; ')}.`
      );
    }

    // Emotional modulation
    if (emotionalState === 'frustrated' || emotionalState === 'anxious') {
      strategies.push('Reduce correction frequency. Focus only on what impedes communication.');
    }

    return strategies.join('\n');
  }

  /**
   * Generate encouragement guidelines
   */
  generateEncouragementGuidelines(
    level: CEFRLevel,
    adaptationState: AdaptationState,
    emotionalState: EmotionalState
  ): string {
    const config = LEVEL_CONFIGS[level];
    const guidelines: string[] = [];

    switch (adaptationState.encouragementLevel) {
      case 'minimal':
        guidelines.push('Engage naturally with the content. Do not comment on quality.');
        break;
      case 'balanced':
        guidelines.push('Engage with what the learner says. Mirror correct usage naturally.');
        break;
      case 'supportive':
        guidelines.push('Be present and attentive. If they struggle, give space. Then gently offer a word or rephrase.');
        break;
      case 'intensive':
        guidelines.push('Be calm and patient. Simplify. Remove all pressure. Continue the conversation gently from wherever they are.');
        break;
    }

    // Level-specific acknowledgment rules
    if (config.praiseForCorrectness) {
      guidelines.push('Mirror correct usage of challenging structures back naturally in your reply.');
    }
    if (config.praiseForAttempt) {
      guidelines.push('Acknowledge attempts by engaging with the content, not evaluating the quality.');
    }

    // Emotional adaptation
    if (emotionalState === 'frustrated' || emotionalState === 'tired') {
      guidelines.push('Be calm and present. Simplify. Do not evaluate.');
    } else if (emotionalState === 'confident') {
      guidelines.push('Match their energy naturally. No need for validation.');
    }

    return guidelines.join('\n');
  }

  // ============================================
  // Real-Time Adaptation
  // ============================================

  /**
   * Process a new message and update adaptation state
   */
  processMessageForAdaptation(
    conversationId: string,
    messageContent: string,
    role: 'user' | 'assistant',
    analysis?: {
      errors?: Array<{ category: string; severity: string }>;
      responseTimeMs?: number;
      emotionalHints?: string[];
    }
  ): void {
    const session = this.stm.getSession(conversationId);
    if (!session) return;

    if (role === 'user') {
      // Analyze for hesitation signals
      this.detectHesitationSignals(conversationId, messageContent, analysis);

      // Analyze for emotional signals
      this.detectEmotionalSignals(conversationId, messageContent, analysis?.emotionalHints);

      // Check error rate for complexity adjustment
      this.checkErrorRateAdaptation(conversationId);
    }
  }

  /**
   * Detect hesitation and confidence signals
   */
  private detectHesitationSignals(
    conversationId: string,
    content: string,
    analysis?: { responseTimeMs?: number }
  ): void {
    const lowerContent = content.toLowerCase();

    // Filler words
    const fillerWords = ['um', 'uh', 'like', 'you know', 'well', 'so', 'eh', 'hmm'];
    const fillerCount = fillerWords.filter(f => lowerContent.includes(f)).length;
    if (fillerCount >= 2) {
      this.stm.recordConfidenceSignal(conversationId, 'filler_words', content, 'medium');
    }

    // Long response time (if available)
    if (analysis?.responseTimeMs && analysis.responseTimeMs > 10000) {
      this.stm.recordConfidenceSignal(conversationId, 'long_pause', 'Took over 10 seconds', 'high');
    }

    // Explicit confusion
    const confusionPhrases = ["don't understand", 'not sure', 'confused', 'what do you mean', 'can you repeat'];
    if (confusionPhrases.some(p => lowerContent.includes(p))) {
      this.stm.recordConfidenceSignal(conversationId, 'explicit_confusion', content, 'high');
    }

    // Request for repetition
    const repeatPhrases = ['say that again', 'repeat', 'one more time', 'sorry?', 'pardon'];
    if (repeatPhrases.some(p => lowerContent.includes(p))) {
      this.stm.recordConfidenceSignal(conversationId, 'repetition_request', content, 'medium');
    }

    // Self-correction
    if (lowerContent.includes('i mean') || lowerContent.includes('sorry,') || lowerContent.includes('wait,')) {
      this.stm.recordConfidenceSignal(conversationId, 'self_correction', content, 'low');
    }

    // Positive signals
    if (content.length > 50 && fillerCount === 0) {
      this.stm.recordConfidenceSignal(conversationId, 'elaboration', content, 'medium');
    }
  }

  /**
   * Detect emotional state from content
   */
  private detectEmotionalSignals(
    conversationId: string,
    content: string,
    hints?: string[]
  ): void {
    const lowerContent = content.toLowerCase();

    // Frustration indicators
    const frustrationWords = ['frustrating', 'difficult', 'hard', 'give up', "can't", 'impossible', 'ugh', 'argh'];
    if (frustrationWords.some(w => lowerContent.includes(w))) {
      this.stm.recordEmotionalState(conversationId, 'frustrated', 0.7, 'Frustration words detected');
      return;
    }

    // Confusion indicators
    const confusionWords = ['confused', "don't understand", 'lost', 'unclear'];
    if (confusionWords.some(w => lowerContent.includes(w))) {
      this.stm.recordEmotionalState(conversationId, 'confused', 0.7, 'Confusion expressed');
      return;
    }

    // Excitement indicators
    const excitementWords = ['great!', 'amazing', 'love it', 'wonderful', 'excited', '!'];
    const excitementCount = excitementWords.filter(w => lowerContent.includes(w)).length;
    if (excitementCount >= 1 || (content.includes('!') && content.length < 30)) {
      this.stm.recordEmotionalState(conversationId, 'engaged', 0.6, 'Positive engagement');
      return;
    }

    // Boredom indicators
    const boredWords = ['boring', 'bored', 'whatever', 'ok', 'meh'];
    if (boredWords.some(w => lowerContent.includes(w)) || content.length < 5) {
      this.stm.recordEmotionalState(conversationId, 'bored', 0.5, 'Short/disengaged response');
      return;
    }

    // Use external hints if available
    if (hints?.includes('frustrated')) {
      this.stm.recordEmotionalState(conversationId, 'frustrated', 0.8, 'Voice analysis');
    } else if (hints?.includes('confident')) {
      this.stm.recordEmotionalState(conversationId, 'confident', 0.7, 'Voice analysis');
    }
  }

  /**
   * Check error rate and adjust complexity if needed
   */
  private checkErrorRateAdaptation(conversationId: string): void {
    const session = this.stm.getSession(conversationId);
    if (!session) return;

    const perf = session.currentPerformance;
    if (perf.userMessageCount < 3) return; // Need enough data

    const totalErrors = perf.grammarErrors + perf.vocabularyErrors;
    const errorRate = totalErrors / perf.userMessageCount;

    // High error rate - simplify
    if (errorRate > 0.4 && session.currentAdaptation.complexityModifier > -2) {
      this.stm.adjustComplexity(
        conversationId,
        -0.5,
        `High error rate: ${(errorRate * 100).toFixed(0)}%`
      );
    }

    // Low error rate - can increase challenge
    if (errorRate < 0.1 && perf.userMessageCount > 10 &&
        session.currentAdaptation.complexityModifier < 2) {
      this.stm.adjustComplexity(
        conversationId,
        0.5,
        `Low error rate: ${(errorRate * 100).toFixed(0)}%`
      );
    }
  }

  // ============================================
  // Adaptation Directive Calculation
  // ============================================

  private calculateAdaptationDirectives(
    session: ReturnType<ShortTermMemoryManager['getSession']>,
    ltMemory: Awaited<ReturnType<LongTermMemoryManager['getMemory']>>
  ): AdaptationDirective[] {
    const directives: AdaptationDirective[] = [];

    if (!session) return directives;

    const conversationId = session.sessionId;

    // ── Circuit Breaker Override ──
    // When active, all directives point toward calming the user
    if (this.isCircuitBreakerActive(conversationId)) {
      directives.push({
        type: 'decrease',
        aspect: 'correction',
        reason: 'CIRCUIT BREAKER ACTIVE: Stop all corrections. '
          + 'User has shown sustained frustration/anxiety. '
          + 'Focus entirely on emotional support and keeping the conversation going.',
      });
      directives.push({
        type: 'increase',
        aspect: 'encouragement',
        reason: 'CIRCUIT BREAKER ACTIVE: Maximum encouragement. '
          + 'Validate every attempt. Use calming phrases.',
      });
      directives.push({
        type: 'decrease',
        aspect: 'complexity',
        reason: 'CIRCUIT BREAKER ACTIVE: Simplify language. '
          + 'Use shorter sentences, simpler vocabulary.',
      });
      directives.push({
        type: 'decrease',
        aspect: 'pace',
        reason: 'CIRCUIT BREAKER ACTIVE: Slow down. '
          + 'Give the learner space to breathe and think.',
      });
      return directives; // Skip normal directives when breaker is active
    }

    const perf = session.currentPerformance;
    const emotionalState = session.emotionalTrajectory.slice(-1)[0]?.state || 'neutral';
    const recentSignals = session.confidenceSignals.slice(-5);

    // Complexity adjustment
    if (perf.grammarErrors > perf.userMessageCount * 0.3) {
      directives.push({
        type: 'decrease',
        aspect: 'complexity',
        reason: 'High grammar error rate',
      });
    } else if (perf.grammarErrors === 0 && perf.userMessageCount > 5) {
      directives.push({
        type: 'increase',
        aspect: 'complexity',
        reason: 'No errors with sufficient samples',
      });
    }

    // Pace adjustment
    const hesitationSignals = recentSignals.filter(
      s => ['long_pause', 'filler_words', 'repetition_request'].includes(s.type)
    ).length;
    if (hesitationSignals >= 2) {
      directives.push({
        type: 'decrease',
        aspect: 'pace',
        reason: 'Multiple hesitation signals detected',
      });
    }

    // Correction frequency
    if (emotionalState === 'frustrated' || emotionalState === 'anxious') {
      directives.push({
        type: 'decrease',
        aspect: 'correction',
        reason: 'User showing negative emotional state',
      });
    }

    // Encouragement
    if (emotionalState === 'frustrated' || emotionalState === 'tired') {
      directives.push({
        type: 'increase',
        aspect: 'encouragement',
        reason: 'User needs emotional support',
      });
    } else if (emotionalState === 'confident' || emotionalState === 'engaged') {
      directives.push({
        type: 'maintain',
        aspect: 'encouragement',
        reason: 'User in positive state',
      });
    }

    return directives;
  }

  private extractContinuityPoints(lastSession?: {
    topicsDiscussed: string[];
    narrativeSummary: string;
    recommendedFocus: string[];
  }): string[] {
    if (!lastSession) return [];

    const points: string[] = [];

    // Recent topics
    if (lastSession.topicsDiscussed.length > 0) {
      points.push(`Last discussed: ${lastSession.topicsDiscussed.slice(0, 2).join(', ')}`);
    }

    // Recommended focus from last session
    if (lastSession.recommendedFocus.length > 0) {
      points.push(`Suggested focus: ${lastSession.recommendedFocus[0]}`);
    }

    return points;
  }
}

// Singleton
let adaptationEngineInstance: AdaptationEngine | null = null;

export function getAdaptationEngine(): AdaptationEngine {
  if (!adaptationEngineInstance) {
    adaptationEngineInstance = new AdaptationEngine();
  }
  return adaptationEngineInstance;
}

export default AdaptationEngine;
