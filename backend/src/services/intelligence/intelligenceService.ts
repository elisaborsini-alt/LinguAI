import {
  MemoryOrchestrator,
  getMemoryOrchestrator,
  ConversationSession,
  MessageAnalysis,
} from '../memory/memoryOrchestrator';
import {
  MemoryContextForAI,
  SessionSummary,
  ConfidenceSignalType,
  EmotionalState,
} from '../memory/types';
import { logger } from '../../utils/logger';

// ============================================
// IntelligenceService
// Unified gateway for memory + adaptation
// ============================================

export class IntelligenceService {
  private memoryOrchestrator: MemoryOrchestrator;

  constructor() {
    this.memoryOrchestrator = getMemoryOrchestrator();
  }

  /**
   * Initialize a new conversation session (STM + LTM)
   */
  async onSessionStart(config: ConversationSession): Promise<string> {
    return this.memoryOrchestrator.startSession(config);
  }

  /**
   * Process an incoming user message and return memory context for AI
   */
  async onUserMessage(
    conversationId: string,
    userId: string,
    message: string,
    analysis?: MessageAnalysis
  ): Promise<MemoryContextForAI> {
    return this.memoryOrchestrator.processUserMessage(
      conversationId,
      userId,
      message,
      analysis
    );
  }

  /**
   * Record AI assistant response in STM
   */
  onAssistantMessage(
    conversationId: string,
    content: string,
    corrections?: import('../memory/types').DetectedError[]
  ): void {
    this.memoryOrchestrator.processAssistantMessage(conversationId, content, corrections);
  }

  /**
   * End session: consolidate STM → LTM, run forgetting, return summary
   */
  async onSessionEnd(
    conversationId: string,
    userId: string
  ): Promise<SessionSummary | null> {
    return this.memoryOrchestrator.endSession(conversationId, userId);
  }

  /**
   * Generate a complete memory-aware system prompt.
   * This is the CANONICAL prompt pipeline — it includes CEFR adaptation,
   * adaptive challenge, circuit breaker, growth moments, continuity, etc.
   */
  async generateSystemPrompt(
    config: ConversationSession,
    currentMessage: string
  ): Promise<string> {
    return this.memoryOrchestrator.generateSystemPrompt(config, currentMessage);
  }

  /**
   * Get formatted memory context string for system prompts
   */
  async getContextForPrompt(userId: string, conversationId: string, currentMessage: string): Promise<string> {
    const memory = await this.memoryOrchestrator.getMemoryContext(userId);

    if (!memory) {
      return 'No previous context available. This is a new learner.';
    }

    const sections: string[] = [];

    // Known facts about the user
    if (memory.personalFacts.length > 0) {
      const factsByCategory = memory.personalFacts.reduce((acc, f) => {
        if (!acc[f.category]) acc[f.category] = [];
        acc[f.category].push(f.content);
        return acc;
      }, {} as Record<string, string[]>);

      const factLines = Object.entries(factsByCategory)
        .map(([cat, facts]) => `${cat}: ${facts.join(', ')}`)
        .join('\n');
      sections.push(`Known about learner:\n${factLines}`);
    }

    // Common errors to watch for
    if (memory.errorPatterns.length > 0) {
      const patterns = memory.errorPatterns
        .slice(0, 5)
        .map(e => `- ${e.pattern} (occurs frequently)`)
        .join('\n');
      sections.push(`Common error patterns:\n${patterns}`);
    }

    // Vocabulary needing practice
    const lowMasteryWords = memory.vocabularyBank
      .filter(v => v.mastery < 0.5)
      .map(v => v.word)
      .slice(0, 10);
    if (lowMasteryWords.length > 0) {
      sections.push(`Vocabulary to reinforce: ${lowMasteryWords.join(', ')}`);
    }

    // Session history
    if (memory.sessionHistory.length > 0) {
      sections.push(`Last session: ${memory.sessionHistory[0].narrativeSummary}`);
    }

    // Preferences
    if (memory.adaptationPreferences.preferredTopics.length > 0) {
      sections.push(`Enjoys discussing: ${memory.adaptationPreferences.preferredTopics.join(', ')}`);
    }
    if (memory.adaptationPreferences.avoidTopics.length > 0) {
      sections.push(`Avoid topics: ${memory.adaptationPreferences.avoidTopics.join(', ')}`);
    }

    return sections.join('\n\n') || 'New learner — no history yet.';
  }

  /**
   * Get active conversation threads for cross-session continuity.
   */
  async getActiveThreads(userId: string) {
    return this.memoryOrchestrator.getActiveThreads(userId);
  }

  /**
   * Record a confidence signal in real-time
   */
  recordConfidenceSignal(
    conversationId: string,
    type: ConfidenceSignalType,
    context: string,
    severity: 'low' | 'medium' | 'high' = 'medium'
  ): void {
    this.memoryOrchestrator.recordConfidenceSignal(conversationId, type, context, severity);
  }

  /**
   * Record emotional state in real-time
   */
  recordEmotionalState(
    conversationId: string,
    state: EmotionalState,
    confidence: number,
    trigger?: string
  ): void {
    this.memoryOrchestrator.recordEmotionalState(conversationId, state, confidence, trigger);
  }
}

// ============================================
// Singleton
// ============================================

let intelligenceServiceInstance: IntelligenceService | null = null;

export function getIntelligenceService(): IntelligenceService {
  if (!intelligenceServiceInstance) {
    intelligenceServiceInstance = new IntelligenceService();
  }
  return intelligenceServiceInstance;
}

export default IntelligenceService;
