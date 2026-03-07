import { v4 as uuidv4 } from 'uuid';
import {
  ShortTermMemory,
  SessionMessage,
  SessionPerformance,
  EmotionalSnapshot,
  EmotionalState,
  ConfidenceSignal,
  ConfidenceSignalType,
  SessionError,
  ErrorCategory,
  DetectedError,
  AdaptationState,
  CEFRLevel,
  CorrectionFrequency,
  EncouragementLevel,
} from './types';
import { logger } from '../../utils/logger';

// ============================================
// Short-Term Memory Manager
// Handles current session state
// ============================================

export class ShortTermMemoryManager {
  private sessions: Map<string, ShortTermMemory> = new Map();
  private cleanupInterval: ReturnType<typeof setInterval>;

  private static readonly STALE_CHECK_MS = 5 * 60 * 1000; // 5 minutes
  private static readonly STALE_MAX_AGE_MS = 30 * 60 * 1000; // 30 minutes

  constructor() {
    // Periodically clean up orphaned STM sessions
    this.cleanupInterval = setInterval(
      () => this.cleanupStaleSessions(),
      ShortTermMemoryManager.STALE_CHECK_MS,
    );
  }

  /**
   * Remove sessions that have been alive longer than maxAge.
   * Catches orphaned sessions from unexpected disconnects.
   */
  cleanupStaleSessions(maxAgeMs = ShortTermMemoryManager.STALE_MAX_AGE_MS): void {
    const now = Date.now();
    for (const [convId, session] of this.sessions) {
      if (now - session.startedAt.getTime() > maxAgeMs) {
        logger.warn(`[STM] Cleaning stale session ${convId}`);
        this.sessions.delete(convId);
      }
    }
  }

  /**
   * Stop the cleanup interval (for graceful shutdown)
   */
  destroy(): void {
    clearInterval(this.cleanupInterval);
  }

  // ============================================
  // Session Lifecycle
  // ============================================

  createSession(conversationId: string, initialLevel: CEFRLevel): ShortTermMemory {
    const session: ShortTermMemory = {
      sessionId: conversationId,
      startedAt: new Date(),
      recentMessages: [],
      currentPerformance: this.initializePerformance(),
      emotionalTrajectory: [{
        timestamp: new Date(),
        state: 'neutral',
        confidence: 0.5,
      }],
      confidenceSignals: [],
      sessionErrors: [],
      vocabularyUsed: new Set(),
      topicsDiscussed: [],
      currentAdaptation: this.initializeAdaptation(initialLevel),
      turnCount: 0,
      nextAdaptiveChallengeTurn: ShortTermMemoryManager.randomChallengeInterval(0),
    };

    this.sessions.set(conversationId, session);
    logger.debug(`Created short-term memory session: ${conversationId}`);
    return session;
  }

  getSession(conversationId: string): ShortTermMemory | undefined {
    return this.sessions.get(conversationId);
  }

  endSession(conversationId: string): ShortTermMemory | undefined {
    const session = this.sessions.get(conversationId);
    if (session) {
      this.sessions.delete(conversationId);
      logger.debug(`Ended short-term memory session: ${conversationId}`);
    }
    return session;
  }

  // ============================================
  // Message Tracking
  // ============================================

  addMessage(
    conversationId: string,
    message: Omit<SessionMessage, 'id' | 'timestamp' | 'wordCount'>
  ): SessionMessage {
    const session = this.sessions.get(conversationId);
    if (!session) {
      throw new Error(`Session not found: ${conversationId}`);
    }

    const fullMessage: SessionMessage = {
      ...message,
      id: uuidv4(),
      timestamp: new Date(),
      wordCount: this.countWords(message.content),
    };

    session.recentMessages.push(fullMessage);

    // Keep only last 50 messages in memory
    if (session.recentMessages.length > 50) {
      session.recentMessages = session.recentMessages.slice(-50);
    }

    // Update performance metrics
    this.updatePerformance(session, fullMessage);

    // Extract vocabulary and increment turn counter
    if (message.role === 'user') {
      session.turnCount++;
      this.extractVocabulary(session, message.content);
    }

    return fullMessage;
  }

  getRecentMessages(
    conversationId: string,
    count: number = 10
  ): SessionMessage[] {
    const session = this.sessions.get(conversationId);
    if (!session) return [];
    return session.recentMessages.slice(-count);
  }

  getLastUserMessage(conversationId: string): SessionMessage | undefined {
    const session = this.sessions.get(conversationId);
    if (!session) return undefined;
    return [...session.recentMessages].reverse().find(m => m.role === 'user');
  }

  // ============================================
  // Adaptive Challenge Frequency Guard
  // ============================================

  /**
   * Whether the current turn is eligible for an adaptive challenge.
   */
  isAdaptiveChallengeAllowed(conversationId: string): boolean {
    const session = this.sessions.get(conversationId);
    if (!session) return false;
    return session.turnCount >= session.nextAdaptiveChallengeTurn;
  }

  /**
   * Mark that a challenge was included this turn and schedule the next one
   * at a randomized interval (4-6 turns from now).
   */
  markAdaptiveChallengeTurn(conversationId: string): void {
    const session = this.sessions.get(conversationId);
    if (session) {
      session.nextAdaptiveChallengeTurn = ShortTermMemoryManager.randomChallengeInterval(session.turnCount);
    }
  }

  /**
   * Returns a random next-eligible turn: currentTurn + random(4, 6).
   */
  private static randomChallengeInterval(currentTurn: number): number {
    return currentTurn + 4 + Math.floor(Math.random() * 3); // 4, 5, or 6
  }

  // ============================================
  // Error Tracking
  // ============================================

  recordError(
    conversationId: string,
    error: DetectedError,
    wasAddressed: boolean = false
  ): SessionError {
    const session = this.sessions.get(conversationId);
    if (!session) {
      throw new Error(`Session not found: ${conversationId}`);
    }

    const sessionError: SessionError = {
      id: error.id,
      timestamp: new Date(),
      category: error.category,
      original: error.original,
      correction: error.correction,
      explanation: error.explanation,
      severity: error.severity,
      wasAddressed,
      userAcknowledged: false,
    };

    session.sessionErrors.push(sessionError);

    // Update performance counters
    this.incrementErrorCount(session, error.category);

    return sessionError;
  }

  markErrorAddressed(conversationId: string, errorId: string): void {
    const session = this.sessions.get(conversationId);
    if (!session) return;

    const error = session.sessionErrors.find(e => e.id === errorId);
    if (error) {
      error.wasAddressed = true;
    }
  }

  getUnaddressedErrors(conversationId: string): SessionError[] {
    const session = this.sessions.get(conversationId);
    if (!session) return [];
    return session.sessionErrors.filter(e => !e.wasAddressed);
  }

  getErrorsByCategory(
    conversationId: string,
    category: ErrorCategory
  ): SessionError[] {
    const session = this.sessions.get(conversationId);
    if (!session) return [];
    return session.sessionErrors.filter(e => e.category === category);
  }

  // ============================================
  // Emotional State Tracking
  // ============================================

  recordEmotionalState(
    conversationId: string,
    state: EmotionalState,
    confidence: number,
    trigger?: string
  ): void {
    const session = this.sessions.get(conversationId);
    if (!session) return;

    const snapshot: EmotionalSnapshot = {
      timestamp: new Date(),
      state,
      confidence,
      trigger,
    };

    session.emotionalTrajectory.push(snapshot);

    // Keep last 20 snapshots
    if (session.emotionalTrajectory.length > 20) {
      session.emotionalTrajectory = session.emotionalTrajectory.slice(-20);
    }

    // Trigger adaptation if needed
    this.checkEmotionalAdaptation(session, state);
  }

  getCurrentEmotionalState(conversationId: string): EmotionalSnapshot {
    const session = this.sessions.get(conversationId);
    if (!session || session.emotionalTrajectory.length === 0) {
      return { timestamp: new Date(), state: 'neutral', confidence: 0.5 };
    }
    return session.emotionalTrajectory[session.emotionalTrajectory.length - 1];
  }

  getEmotionalTrend(conversationId: string): 'improving' | 'stable' | 'declining' {
    const session = this.sessions.get(conversationId);
    if (!session || session.emotionalTrajectory.length < 3) {
      return 'stable';
    }

    const recent = session.emotionalTrajectory.slice(-5);
    const positiveStates = ['confident', 'engaged', 'curious', 'excited'];
    const negativeStates = ['frustrated', 'anxious', 'bored', 'confused', 'tired'];

    const scores = recent.map(s => {
      if (positiveStates.includes(s.state)) return 1;
      if (negativeStates.includes(s.state)) return -1;
      return 0;
    });

    const trend = scores.reduce((a: number, b) => a + b, 0) / scores.length;
    const firstHalf = scores.slice(0, Math.floor(scores.length / 2));
    const secondHalf = scores.slice(Math.floor(scores.length / 2));
    const firstAvg = firstHalf.reduce((a: number, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a: number, b) => a + b, 0) / secondHalf.length;

    if (secondAvg > firstAvg + 0.3) return 'improving';
    if (secondAvg < firstAvg - 0.3) return 'declining';
    return 'stable';
  }

  // ============================================
  // Confidence Signal Tracking
  // ============================================

  recordConfidenceSignal(
    conversationId: string,
    type: ConfidenceSignalType,
    context: string,
    severity: 'low' | 'medium' | 'high' = 'medium'
  ): void {
    const session = this.sessions.get(conversationId);
    if (!session) return;

    const signal: ConfidenceSignal = {
      timestamp: new Date(),
      type,
      context,
      severity,
    };

    session.confidenceSignals.push(signal);

    // Update hesitation count for certain signals
    if (['long_pause', 'filler_words', 'self_correction', 'repetition_request'].includes(type)) {
      session.currentPerformance.hesitationCount++;
    }

    // Trigger adaptation based on signals
    this.checkConfidenceAdaptation(session, type, severity);
  }

  getRecentConfidenceSignals(
    conversationId: string,
    minutes: number = 5
  ): ConfidenceSignal[] {
    const session = this.sessions.get(conversationId);
    if (!session) return [];

    const cutoff = new Date(Date.now() - minutes * 60 * 1000);
    return session.confidenceSignals.filter(s => s.timestamp >= cutoff);
  }

  // ============================================
  // Adaptation State Management
  // ============================================

  getAdaptationState(conversationId: string): AdaptationState | undefined {
    return this.sessions.get(conversationId)?.currentAdaptation;
  }

  adjustComplexity(conversationId: string, delta: number, reason: string): void {
    const session = this.sessions.get(conversationId);
    if (!session) return;

    const newValue = Math.max(-2, Math.min(2,
      session.currentAdaptation.complexityModifier + delta
    ));

    session.currentAdaptation.complexityModifier = newValue;
    session.currentAdaptation.adjustments.push({
      timestamp: new Date(),
      trigger: delta > 0 ? 'low_error_rate' : 'high_error_rate',
      action: `complexity ${delta > 0 ? '+' : ''}${delta}`,
      reason,
    });

    // Update target vocabulary level
    session.currentAdaptation.targetVocabularyLevel =
      this.calculateTargetLevel(session.currentAdaptation.complexityModifier);

    logger.debug(`Adjusted complexity for ${conversationId}: ${newValue} (${reason})`);
  }

  adjustPace(conversationId: string, delta: number, reason: string): void {
    const session = this.sessions.get(conversationId);
    if (!session) return;

    const newValue = Math.max(-2, Math.min(2,
      session.currentAdaptation.paceModifier + delta
    ));

    session.currentAdaptation.paceModifier = newValue;
    session.currentAdaptation.adjustments.push({
      timestamp: new Date(),
      trigger: delta > 0 ? 'confidence_spike' : 'confusion_detected',
      action: `pace ${delta > 0 ? '+' : ''}${delta}`,
      reason,
    });

    // Update sentence length target
    if (newValue <= -1) {
      session.currentAdaptation.targetSentenceLength = 'short';
    } else if (newValue >= 1) {
      session.currentAdaptation.targetSentenceLength = 'long';
    } else {
      session.currentAdaptation.targetSentenceLength = 'medium';
    }

    logger.debug(`Adjusted pace for ${conversationId}: ${newValue} (${reason})`);
  }

  setCorrectionFrequency(
    conversationId: string,
    frequency: CorrectionFrequency,
    reason: string
  ): void {
    const session = this.sessions.get(conversationId);
    if (!session) return;

    session.currentAdaptation.correctionFrequency = frequency;
    session.currentAdaptation.adjustments.push({
      timestamp: new Date(),
      trigger: 'explicit_request',
      action: `correction_frequency: ${frequency}`,
      reason,
    });
  }

  setEncouragementLevel(
    conversationId: string,
    level: EncouragementLevel,
    reason: string
  ): void {
    const session = this.sessions.get(conversationId);
    if (!session) return;

    session.currentAdaptation.encouragementLevel = level;
    session.currentAdaptation.adjustments.push({
      timestamp: new Date(),
      trigger: 'frustration_detected',
      action: `encouragement: ${level}`,
      reason,
    });
  }

  // ============================================
  // Topic Tracking
  // ============================================

  addTopic(conversationId: string, topic: string): void {
    const session = this.sessions.get(conversationId);
    if (!session) return;

    if (!session.topicsDiscussed.includes(topic)) {
      session.topicsDiscussed.push(topic);
    }
  }

  getTopicsDiscussed(conversationId: string): string[] {
    return this.sessions.get(conversationId)?.topicsDiscussed || [];
  }

  // ============================================
  // Performance Summary
  // ============================================

  getPerformanceSummary(conversationId: string): SessionPerformance | undefined {
    return this.sessions.get(conversationId)?.currentPerformance;
  }

  getSessionDuration(conversationId: string): number {
    const session = this.sessions.get(conversationId);
    if (!session) return 0;
    return Math.floor((Date.now() - session.startedAt.getTime()) / 60000);
  }

  getVocabularyUsed(conversationId: string): string[] {
    const session = this.sessions.get(conversationId);
    if (!session) return [];
    return Array.from(session.vocabularyUsed);
  }

  // ============================================
  // Private Helper Methods
  // ============================================

  private initializePerformance(): SessionPerformance {
    return {
      messageCount: 0,
      userMessageCount: 0,
      totalWords: 0,
      uniqueWords: 0,
      grammarErrors: 0,
      vocabularyErrors: 0,
      pronunciationErrors: 0,
      correctUsages: 0,
      newWordsUsedCorrectly: 0,
      avgResponseTimeMs: 0,
      hesitationCount: 0,
      selfCorrections: 0,
      fillerWordCount: 0,
    };
  }

  private initializeAdaptation(level: CEFRLevel): AdaptationState {
    // Set defaults based on level
    const levelIndex = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].indexOf(level);

    return {
      complexityModifier: 0,
      paceModifier: levelIndex < 2 ? -1 : 0, // Slower for beginners
      correctionFrequency: levelIndex < 2 ? 'significant_only' : 'every_error',
      encouragementLevel: levelIndex < 2 ? 'supportive' : 'balanced',
      targetSentenceLength: levelIndex < 2 ? 'short' : 'medium',
      targetVocabularyLevel: level,
      adjustments: [],
    };
  }

  private countWords(text: string): number {
    return text.split(/\s+/).filter(w => w.length > 0).length;
  }

  private updatePerformance(session: ShortTermMemory, message: SessionMessage): void {
    session.currentPerformance.messageCount++;
    session.currentPerformance.totalWords += message.wordCount;

    if (message.role === 'user') {
      session.currentPerformance.userMessageCount++;

      // Update response time average
      if (message.responseTimeMs) {
        const prev = session.currentPerformance.avgResponseTimeMs;
        const count = session.currentPerformance.userMessageCount;
        session.currentPerformance.avgResponseTimeMs =
          (prev * (count - 1) + message.responseTimeMs) / count;
      }
    }
  }

  private extractVocabulary(session: ShortTermMemory, content: string): void {
    // Simple tokenization - in production use proper NLP
    const words = content.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 2);

    const prevSize = session.vocabularyUsed.size;
    words.forEach(word => session.vocabularyUsed.add(word));
    session.currentPerformance.uniqueWords = session.vocabularyUsed.size;
  }

  private incrementErrorCount(session: ShortTermMemory, category: ErrorCategory): void {
    if (category.startsWith('grammar')) {
      session.currentPerformance.grammarErrors++;
    } else if (category.startsWith('vocabulary')) {
      session.currentPerformance.vocabularyErrors++;
    } else if (category.startsWith('pronunciation')) {
      session.currentPerformance.pronunciationErrors++;
    }
  }

  private checkEmotionalAdaptation(session: ShortTermMemory, state: EmotionalState): void {
    switch (state) {
      case 'frustrated':
        this.adjustComplexity(session.sessionId, -1, 'User showing frustration');
        this.setEncouragementLevel(session.sessionId, 'intensive', 'Frustration detected');
        break;
      case 'confused':
        this.adjustPace(session.sessionId, -1, 'User confused');
        this.setCorrectionFrequency(session.sessionId, 'significant_only', 'Reduce cognitive load');
        break;
      case 'bored':
        this.adjustComplexity(session.sessionId, 1, 'User seems bored, increase challenge');
        break;
      case 'confident':
      case 'engaged':
        // Positive states - can gradually increase challenge
        if (session.currentPerformance.grammarErrors === 0 &&
            session.currentPerformance.userMessageCount > 5) {
          this.adjustComplexity(session.sessionId, 0.5, 'Sustained confidence with low errors');
        }
        break;
      case 'tired':
        this.adjustPace(session.sessionId, -1, 'User fatigued');
        this.setEncouragementLevel(session.sessionId, 'supportive', 'Support through fatigue');
        break;
    }
  }

  private checkConfidenceAdaptation(
    session: ShortTermMemory,
    signalType: ConfidenceSignalType,
    severity: 'low' | 'medium' | 'high'
  ): void {
    // Check for patterns in recent signals
    const recentSignals = session.confidenceSignals.slice(-5);
    const hesitationSignals = recentSignals.filter(s =>
      ['long_pause', 'filler_words', 'repetition_request', 'explicit_confusion'].includes(s.type)
    );

    if (hesitationSignals.length >= 3) {
      this.adjustComplexity(session.sessionId, -1, 'Multiple hesitation signals detected');
      this.adjustPace(session.sessionId, -1, 'Slow down due to hesitation');
    }

    // Native fallback is a strong signal
    if (signalType === 'native_fallback' && severity === 'high') {
      this.adjustComplexity(session.sessionId, -1, 'User fell back to native language');
    }

    // Positive signals
    if (signalType === 'elaboration' || signalType === 'natural_flow') {
      const positiveCount = recentSignals.filter(s =>
        ['quick_confident', 'elaboration', 'natural_flow'].includes(s.type)
      ).length;

      if (positiveCount >= 3) {
        this.adjustComplexity(session.sessionId, 0.5, 'Strong positive confidence signals');
      }
    }
  }

  private calculateTargetLevel(complexityModifier: number): CEFRLevel {
    // Base levels adjusted by modifier
    const levels: CEFRLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
    const baseIndex = 2; // B1 as default
    const targetIndex = Math.max(0, Math.min(5,
      Math.round(baseIndex + complexityModifier)
    ));
    return levels[targetIndex];
  }
}

// Singleton instance
let stmInstance: ShortTermMemoryManager | null = null;

export function getShortTermMemory(): ShortTermMemoryManager {
  if (!stmInstance) {
    stmInstance = new ShortTermMemoryManager();
  }
  return stmInstance;
}

export default ShortTermMemoryManager;
