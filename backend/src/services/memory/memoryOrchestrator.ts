import { v4 as uuidv4 } from 'uuid';
import { ShortTermMemoryManager, getShortTermMemory } from './shortTermMemory';
import { LongTermMemoryManager, getLongTermMemory } from './longTermMemory';
import { AdaptationEngine, getAdaptationEngine } from './adaptationEngine';
import { MemoryAwarePromptGenerator, generateMemoryAwarePrompt } from '../ai/memoryAwarePrompts';
import {
  ShortTermMemory,
  SessionError,
  DetectedError,
  EmotionalState,
  ConfidenceSignalType,
  CEFRLevel,
  MemoryContextForAI,
  SessionSummary,
  ErrorCategory,
} from './types';
import { logger } from '../../utils/logger';

// ============================================
// Memory Orchestrator
// Unified interface for all memory operations
// ============================================

export interface ConversationSession {
  conversationId: string;
  userId: string;
  level: CEFRLevel;
  languageCode: string;
  languageVariant: string;
  mode: 'chat' | 'voice';
  voiceArchetype?: string;
  voiceIdentity?: string;
  scenarioContext?: {
    name: string;
    aiRole: string;
    userRole: string;
    context: string;
  };
}

export interface MessageAnalysis {
  content: string;
  errors: DetectedError[];
  responseTimeMs?: number;
  emotionalHints?: string[];
  topicDetected?: string;
}

export class MemoryOrchestrator {
  private stm: ShortTermMemoryManager;
  private ltm: LongTermMemoryManager;
  private adaptationEngine: AdaptationEngine;
  private promptGenerator: MemoryAwarePromptGenerator;

  constructor() {
    this.stm = getShortTermMemory();
    this.ltm = getLongTermMemory();
    this.adaptationEngine = getAdaptationEngine();
    this.promptGenerator = new MemoryAwarePromptGenerator();
  }

  // ============================================
  // Session Lifecycle
  // ============================================

  /**
   * Initialize a new conversation session
   */
  async startSession(config: ConversationSession): Promise<string> {
    const { conversationId, userId, level } = config;

    // Initialize short-term memory for this session
    this.stm.createSession(conversationId, level);

    // Ensure long-term memory exists
    await this.ltm.initializeMemory(userId);

    logger.info(`Started memory session for conversation ${conversationId}`);

    return conversationId;
  }

  /**
   * End session and consolidate memories
   */
  async endSession(conversationId: string, userId: string): Promise<SessionSummary | null> {
    const session = this.stm.endSession(conversationId);

    // Clean up circuit breaker state for this session
    this.adaptationEngine.cleanupSession(conversationId);

    if (!session) {
      logger.warn(`No session found to end: ${conversationId}`);
      return null;
    }

    // Consolidate short-term to long-term memory
    await this.ltm.consolidateSession(userId, session);

    logger.info(`Ended and consolidated session ${conversationId}`);

    // Return final session summary
    const recentSessions = await this.ltm.getRecentSessions(userId, 1);
    return recentSessions[0] || null;
  }

  // ============================================
  // Message Processing
  // ============================================

  /**
   * Process an incoming user message
   * Returns memory context for AI response generation
   */
  async processUserMessage(
    conversationId: string,
    userId: string,
    message: string,
    analysis?: MessageAnalysis
  ): Promise<MemoryContextForAI> {
    // Tick circuit breaker cooldown on each user message
    this.adaptationEngine.tickCircuitBreakerCooldown(conversationId);

    // Record message in short-term memory
    const sessionMessage = this.stm.addMessage(conversationId, {
      role: 'user',
      content: message,
      responseTimeMs: analysis?.responseTimeMs,
      errors: analysis?.errors,
      hesitationDetected: this.detectHesitation(message, analysis),
      emotionalState: this.inferEmotionalState(message, analysis?.emotionalHints),
    });

    // Record any errors
    if (analysis?.errors) {
      for (const error of analysis.errors) {
        this.stm.recordError(conversationId, error);
      }
    }

    // Extract and record personal facts if detected
    await this.extractAndStoreFacts(userId, message);

    // Add topic if detected
    if (analysis?.topicDetected) {
      this.stm.addTopic(conversationId, analysis.topicDetected);
    }

    // Process for adaptation signals
    this.adaptationEngine.processMessageForAdaptation(
      conversationId,
      message,
      'user',
      {
        errors: analysis?.errors?.map(e => ({ category: e.category, severity: e.severity })),
        responseTimeMs: analysis?.responseTimeMs,
        emotionalHints: analysis?.emotionalHints,
      }
    );

    // Build and return memory context for AI
    return this.adaptationEngine.buildMemoryContext(userId, conversationId, message);
  }

  /**
   * Process AI assistant response
   */
  processAssistantMessage(
    conversationId: string,
    content: string,
    corrections?: DetectedError[]
  ): void {
    this.stm.addMessage(conversationId, {
      role: 'assistant',
      content,
      correctionGiven: corrections && corrections.length > 0,
    });

    // Mark addressed errors
    if (corrections) {
      for (const correction of corrections) {
        if (correction.relatedPatternId) {
          this.stm.markErrorAddressed(conversationId, correction.relatedPatternId);
        }
      }
    }
  }

  // ============================================
  // Prompt Generation
  // ============================================

  /**
   * Generate complete system prompt with memory context
   */
  async generateSystemPrompt(
    config: ConversationSession,
    currentMessage: string
  ): Promise<string> {
    const memoryContext = await this.adaptationEngine.buildMemoryContext(
      config.userId,
      config.conversationId,
      currentMessage
    );

    const prompt = this.promptGenerator.generateSystemPrompt(memoryContext, {
      mode: config.mode,
      voiceArchetype: config.voiceArchetype,
      voiceIdentity: config.voiceIdentity,
      targetLanguage: config.languageCode,
      targetVariant: config.languageVariant,
      scenarioContext: config.scenarioContext,
    });

    // If the challenge section was included, mark this turn and schedule the next one
    const level = memoryContext.userProfile.currentLevel;
    const suppressChallenge = ['frustrated', 'anxious', 'tired', 'confused'].includes(memoryContext.currentMood);
    if (!suppressChallenge && !memoryContext.circuitBreakerActive && level !== 'C2' && memoryContext.adaptiveChallengeAllowed) {
      this.stm.markAdaptiveChallengeTurn(config.conversationId);
    }

    return prompt;
  }

  // ============================================
  // Memory Access (public API for IntelligenceService)
  // ============================================

  /**
   * Get long-term memory for a user.
   * Public accessor so IntelligenceService doesn't need to reach into private fields.
   */
  async getMemoryContext(userId: string) {
    return this.ltm.getMemory(userId);
  }

  /**
   * Get active conversation threads for cross-session continuity.
   */
  async getActiveThreads(userId: string) {
    return this.ltm.getActiveThreads(userId);
  }

  // ============================================
  // Real-Time Signals
  // ============================================

  /**
   * Record confidence signal in real-time
   */
  recordConfidenceSignal(
    conversationId: string,
    type: ConfidenceSignalType,
    context: string,
    severity: 'low' | 'medium' | 'high' = 'medium'
  ): void {
    this.stm.recordConfidenceSignal(conversationId, type, context, severity);
  }

  /**
   * Record emotional state in real-time.
   * Also feeds the circuit breaker in the adaptation engine.
   */
  recordEmotionalState(
    conversationId: string,
    state: EmotionalState,
    confidence: number,
    trigger?: string
  ): void {
    this.stm.recordEmotionalState(conversationId, state, confidence, trigger);

    // Feed emotional safety circuit breaker
    this.adaptationEngine.processEmotionalSafety(conversationId, state);
  }

  // ============================================
  // Vocabulary Tracking
  // ============================================

  /**
   * Record vocabulary usage
   */
  async recordVocabularyUsage(
    userId: string,
    word: string,
    context: string,
    wasCorrect: boolean,
    translation?: string
  ): Promise<void> {
    await this.ltm.recordVocabulary(userId, word, context, wasCorrect, translation);
  }

  // ============================================
  // Query Methods
  // ============================================

  /**
   * Check if the emotional safety circuit breaker is active.
   */
  isCircuitBreakerActive(conversationId: string): boolean {
    return this.adaptationEngine.isCircuitBreakerActive(conversationId);
  }

  /**
   * Get current adaptation state
   */
  getAdaptationState(conversationId: string) {
    return this.stm.getAdaptationState(conversationId);
  }

  /**
   * Get session performance metrics
   */
  getSessionPerformance(conversationId: string) {
    return this.stm.getPerformanceSummary(conversationId);
  }

  /**
   * Get emotional trajectory
   */
  getEmotionalTrend(conversationId: string) {
    return this.stm.getEmotionalTrend(conversationId);
  }

  /**
   * Get recent context for AI
   */
  getRecentMessages(conversationId: string, count: number = 10) {
    return this.stm.getRecentMessages(conversationId, count);
  }

  // ============================================
  // Private Helpers
  // ============================================

  private detectHesitation(message: string, analysis?: MessageAnalysis): boolean {
    const lowerMessage = message.toLowerCase();

    // Filler words
    const fillers = ['um', 'uh', 'like', 'well', 'so', 'you know'];
    if (fillers.some(f => lowerMessage.includes(f))) return true;

    // Long response time
    if (analysis?.responseTimeMs && analysis.responseTimeMs > 8000) return true;

    // Short uncertain response
    if (message.length < 10 && message.includes('?')) return true;

    return false;
  }

  private inferEmotionalState(
    message: string,
    hints?: string[]
  ): EmotionalState {
    const lowerMessage = message.toLowerCase();

    // From hints
    if (hints?.includes('frustrated')) return 'frustrated';
    if (hints?.includes('confident')) return 'confident';
    if (hints?.includes('anxious')) return 'anxious';

    // From content
    if (lowerMessage.includes('frustrat') || lowerMessage.includes("can't")) {
      return 'frustrated';
    }
    if (lowerMessage.includes('confus') || lowerMessage.includes("don't understand")) {
      return 'confused';
    }
    if (message.includes('!') && message.length > 20) {
      return 'excited';
    }
    if (message.length > 50) {
      return 'engaged';
    }

    return 'neutral';
  }

  private async extractAndStoreFacts(userId: string, message: string): Promise<void> {
    // Simple pattern matching for common personal facts
    // In production, use NLP/Claude for extraction

    const patterns = [
      { regex: /my name is (\w+)/i, category: 'name' as const },
      { regex: /I work (?:at|for) ([^.!?]+)/i, category: 'workplace' as const },
      { regex: /I(?:'m| am) (?:a|an) ([^.!?]+)/i, category: 'occupation' as const },
      { regex: /I live in ([^.!?]+)/i, category: 'location' as const },
      { regex: /I(?:'m| am) (?:learning|studying) .* for ([^.!?]+)/i, category: 'goal_specific' as const },
      { regex: /I like (?:to )?([^.!?]+)/i, category: 'hobby' as const },
      { regex: /I(?:'m| am) moving to ([^.!?]+)/i, category: 'life_event' as const },
    ];

    for (const { regex, category } of patterns) {
      const match = message.match(regex);
      if (match && match[1]) {
        await this.ltm.recordPersonalFact(
          userId,
          category,
          match[1].trim(),
          'conversational',
          0.7
        );
        logger.debug(`Extracted fact [${category}]: ${match[1].trim()}`);
      }
    }
  }
}

// ============================================
// Singleton and Factory
// ============================================

let orchestratorInstance: MemoryOrchestrator | null = null;

export function getMemoryOrchestrator(): MemoryOrchestrator {
  if (!orchestratorInstance) {
    orchestratorInstance = new MemoryOrchestrator();
  }
  return orchestratorInstance;
}

export default MemoryOrchestrator;
