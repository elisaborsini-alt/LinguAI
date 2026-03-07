import { sendMessage, streamMessage } from './claudeClient';
import { buildSystemPrompt, buildAnalysisPrompt, PromptContext } from '../../prompts/systemPrompts';
import { getMemoryRetriever, MemoryContext } from '../memory/memoryRetriever';
import prisma from '../../db/client';
import { logger } from '../../utils/logger';
import {
  LanguageCode,
  LanguageVariant,
  LearningGoal,
  CEFRLevel,
  LevelEstimates,
  DetectedError,
  MessageAnalysis,
  ConversationMessage,
} from '../../types';

// ============================================
// Types
// ============================================

export interface ConversationState {
  conversationId: string;
  userId: string;
  languageCode: LanguageCode;
  languageVariant: LanguageVariant;
  goal: LearningGoal;
  levels: LevelEstimates;
  correctionIntensity: 'minimal' | 'moderate' | 'detailed';
  isCallMode: boolean;
  scenario?: {
    id: string;
    name: string;
    description: string;
    aiRole: string;
    userRole: string;
    context: string;
  };
  // Dynamic state that changes during conversation
  sessionStats: {
    messageCount: number;
    errorCount: number;
    correctionCount: number;
    avgResponseLength: number;
    lastEmotionalState: EmotionalState;
    topicFlow: string[];
    difficultyAdjustment: number; // -1 = easier, 0 = same, +1 = harder
  };
  messages: ConversationMessage[];
}

export type EmotionalState =
  | 'confident'
  | 'engaged'
  | 'frustrated'
  | 'anxious'
  | 'bored'
  | 'confused'
  | 'tired'
  | 'neutral';

export interface AIResponse {
  content: string;
  analysis?: MessageAnalysis;
  corrections?: DetectedError[];
  emotionalStateDetected?: EmotionalState;
  suggestedAdaptation?: {
    difficultyChange: number;
    toneChange?: string;
    encouragement?: boolean;
  };
}

// ============================================
// Conversation Engine
// ============================================

export class ConversationEngine {
  private memoryRetriever = getMemoryRetriever();
  private stateCache: Map<string, ConversationState> = new Map();

  /**
   * Initialize a new conversation
   */
  async initializeConversation(
    conversationId: string,
    userId: string,
    options: {
      languageCode: LanguageCode;
      languageVariant: LanguageVariant;
      goal: LearningGoal;
      correctionIntensity?: 'minimal' | 'moderate' | 'detailed';
      isCallMode: boolean;
      scenarioId?: string;
    }
  ): Promise<ConversationState> {
    // Get user's level estimates
    const levelEstimate = await prisma.levelEstimate.findUnique({
      where: { userId },
    });

    const levels: LevelEstimates = levelEstimate ? {
      grammar: levelEstimate.grammarLevel as CEFRLevel,
      vocabulary: levelEstimate.vocabularyLevel as CEFRLevel,
      fluency: levelEstimate.fluencyLevel as CEFRLevel,
      overall: levelEstimate.overallLevel as CEFRLevel,
      confidence: levelEstimate.confidence,
    } : {
      grammar: 'A2',
      vocabulary: 'A2',
      fluency: 'A2',
      overall: 'A2',
      confidence: 0.3,
    };

    // Get scenario if provided
    let scenario: ConversationState['scenario'] | undefined;
    if (options.scenarioId) {
      const scenarioData = await prisma.scenario.findUnique({
        where: { id: options.scenarioId },
      });
      if (scenarioData) {
        scenario = {
          id: scenarioData.id,
          name: scenarioData.name,
          description: scenarioData.description,
          aiRole: scenarioData.aiRole,
          userRole: scenarioData.userRole,
          context: scenarioData.context,
        };
      }
    }

    const state: ConversationState = {
      conversationId,
      userId,
      languageCode: options.languageCode,
      languageVariant: options.languageVariant,
      goal: options.goal,
      levels,
      correctionIntensity: options.correctionIntensity || 'moderate',
      isCallMode: options.isCallMode,
      scenario,
      sessionStats: {
        messageCount: 0,
        errorCount: 0,
        correctionCount: 0,
        avgResponseLength: 0,
        lastEmotionalState: 'neutral',
        topicFlow: [],
        difficultyAdjustment: 0,
      },
      messages: [],
    };

    this.stateCache.set(conversationId, state);
    return state;
  }

  /**
   * Process user message and generate AI response
   */
  async processMessage(
    conversationId: string,
    userMessage: string,
    emotionalHints?: {
      voiceTone?: 'confident' | 'hesitant' | 'frustrated' | 'neutral';
      speechPace?: 'fast' | 'normal' | 'slow';
      pausesDuration?: 'short' | 'normal' | 'long';
    }
  ): Promise<AIResponse> {
    const state = this.stateCache.get(conversationId);
    if (!state) {
      throw new Error('Conversation not initialized');
    }

    try {
      // 1. Analyze user message
      const analysis = await this.analyzeUserMessage(userMessage, state);

      // 2. Detect emotional state from content and voice hints
      const emotionalState = this.detectEmotionalState(userMessage, analysis, emotionalHints);

      // 3. Calculate dynamic adaptations
      const adaptation = this.calculateAdaptation(state, analysis, emotionalState);

      // 4. Get relevant memory context
      const memoryContext = await this.getMemoryContext(state.userId, userMessage, state);

      // 5. Build adapted system prompt
      const systemPrompt = this.buildAdaptedPrompt(state, memoryContext, adaptation);

      // 6. Add user message to history
      state.messages.push({
        role: 'user',
        content: userMessage,
        timestamp: new Date(),
      });

      // 7. Generate AI response
      const aiContent = await this.generateResponse(systemPrompt, state.messages, state.isCallMode);

      // 8. Prepare corrections based on intensity and emotional state
      const corrections = this.prepareCorrections(analysis, state, emotionalState);

      // 9. Add AI response to history
      state.messages.push({
        role: 'assistant',
        content: aiContent,
        timestamp: new Date(),
      });

      // 10. Update session stats
      this.updateSessionStats(state, userMessage, analysis, corrections, emotionalState);

      // 11. Store messages in database
      await this.persistMessages(state.conversationId, userMessage, aiContent, analysis, corrections);

      return {
        content: aiContent,
        analysis,
        corrections,
        emotionalStateDetected: emotionalState,
        suggestedAdaptation: adaptation,
      };
    } catch (error) {
      logger.error('Error processing message:', error);
      throw error;
    }
  }

  /**
   * Stream AI response for real-time voice
   */
  async *streamResponse(
    conversationId: string,
    userMessage: string,
    emotionalHints?: {
      voiceTone?: 'confident' | 'hesitant' | 'frustrated' | 'neutral';
      speechPace?: 'fast' | 'normal' | 'slow';
    }
  ): AsyncGenerator<string, AIResponse, unknown> {
    const state = this.stateCache.get(conversationId);
    if (!state) {
      throw new Error('Conversation not initialized');
    }

    // Quick analysis for streaming
    const analysis = await this.analyzeUserMessage(userMessage, state);
    const emotionalState = this.detectEmotionalState(userMessage, analysis, emotionalHints);
    const adaptation = this.calculateAdaptation(state, analysis, emotionalState);
    const memoryContext = await this.getMemoryContext(state.userId, userMessage, state);
    const systemPrompt = this.buildAdaptedPrompt(state, memoryContext, adaptation);

    state.messages.push({
      role: 'user',
      content: userMessage,
      timestamp: new Date(),
    });

    let fullResponse = '';

    // Stream the response via callbacks
    await streamMessage(systemPrompt, state.messages as any, {
      onText: (chunk: string) => { fullResponse += chunk; },
      onComplete: () => {},
      onError: (err: Error) => { throw err; },
    });

    state.messages.push({
      role: 'assistant',
      content: fullResponse,
      timestamp: new Date(),
    });

    const corrections = this.prepareCorrections(analysis, state, emotionalState);
    this.updateSessionStats(state, userMessage, analysis, corrections, emotionalState);
    await this.persistMessages(state.conversationId, userMessage, fullResponse, analysis, corrections);

    return {
      content: fullResponse,
      analysis,
      corrections,
      emotionalStateDetected: emotionalState,
      suggestedAdaptation: adaptation,
    };
  }

  // ============================================
  // Private Methods
  // ============================================

  private async analyzeUserMessage(
    message: string,
    state: ConversationState
  ): Promise<MessageAnalysis> {
    const analysisPrompt = buildAnalysisPrompt(state.languageCode, state.levels.overall);

    try {
      const response = await sendMessage(
        analysisPrompt,
        [{ role: 'user', content: message }],
        { temperature: 0.2, maxTokens: 500 }
      );

      const parsed = JSON.parse(response);
      return {
        errors: parsed.errors || [],
        vocabularyLevel: parsed.vocabularyLevel || state.levels.vocabulary,
        grammarLevel: parsed.grammarLevel || state.levels.grammar,
        fluencyScore: parsed.fluencyScore || 70,
        sentiment: parsed.sentiment || 'neutral',
        wordCount: message.split(/\s+/).length,
        uniqueWords: [...new Set(message.toLowerCase().split(/\s+/))],
        complexity: this.assessComplexity(message),
      };
    } catch (error) {
      logger.error('Error analyzing message:', error);
      return {
        errors: [],
        vocabularyLevel: state.levels.vocabulary,
        grammarLevel: state.levels.grammar,
        fluencyScore: 70,
        sentiment: 'neutral',
        wordCount: message.split(/\s+/).length,
        uniqueWords: [...new Set(message.toLowerCase().split(/\s+/))],
        complexity: 'simple',
      };
    }
  }

  private detectEmotionalState(
    message: string,
    analysis: MessageAnalysis,
    voiceHints?: {
      voiceTone?: 'confident' | 'hesitant' | 'frustrated' | 'neutral';
      speechPace?: 'fast' | 'normal' | 'slow';
      pausesDuration?: 'short' | 'normal' | 'long';
    }
  ): EmotionalState {
    // Priority to voice hints if available
    if (voiceHints?.voiceTone === 'frustrated') return 'frustrated';
    if (voiceHints?.voiceTone === 'hesitant') return 'anxious';
    if (voiceHints?.voiceTone === 'confident') return 'confident';

    // Text-based analysis
    const lowerMessage = message.toLowerCase();

    // Frustration signals
    if (lowerMessage.includes("don't understand") ||
        lowerMessage.includes('confused') ||
        lowerMessage.includes('too hard') ||
        lowerMessage.includes('too fast') ||
        analysis.sentiment === 'frustrated') {
      return 'frustrated';
    }

    // Anxiety signals
    if (lowerMessage.includes('sorry') ||
        lowerMessage.includes('not sure') ||
        lowerMessage.includes('i think') && analysis.errors.length > 2) {
      return 'anxious';
    }

    // Confidence signals
    if (analysis.fluencyScore > 80 && analysis.errors.length === 0) {
      return 'confident';
    }

    // Engagement signals
    if (message.includes('?') || message.length > 50) {
      return 'engaged';
    }

    // Low engagement signals
    if (message.length < 10 || message.split(/\s+/).length < 3) {
      return 'bored';
    }

    return 'neutral';
  }

  private calculateAdaptation(
    state: ConversationState,
    analysis: MessageAnalysis,
    emotionalState: EmotionalState
  ): {
    difficultyChange: number;
    toneChange?: string;
    encouragement?: boolean;
  } {
    const adaptation: {
      difficultyChange: number;
      toneChange?: string;
      encouragement?: boolean;
    } = {
      difficultyChange: 0,
    };

    // Error rate adaptation
    const recentErrorRate = state.sessionStats.messageCount > 0
      ? state.sessionStats.errorCount / state.sessionStats.messageCount
      : 0;

    if (recentErrorRate > 0.5 || emotionalState === 'frustrated') {
      adaptation.difficultyChange = -1;
      adaptation.toneChange = 'more supportive, slower pace';
      adaptation.encouragement = true;
    } else if (recentErrorRate < 0.1 && state.sessionStats.messageCount >= 5) {
      adaptation.difficultyChange = 1;
    }

    // Emotional adaptations
    switch (emotionalState) {
      case 'frustrated':
        adaptation.toneChange = 'very supportive, acknowledge difficulty, simplify';
        adaptation.encouragement = true;
        break;
      case 'anxious':
        adaptation.toneChange = 'gentle, reassuring, normalize mistakes';
        adaptation.encouragement = true;
        break;
      case 'bored':
        adaptation.toneChange = 'more engaging questions, change topic';
        if (state.sessionStats.messageCount > 3) {
          adaptation.difficultyChange = 1;
        }
        break;
      case 'confident':
        adaptation.toneChange = 'can be more challenging';
        break;
    }

    return adaptation;
  }

  private async getMemoryContext(
    userId: string,
    currentMessage: string,
    state: ConversationState
  ): Promise<string> {
    try {
      await this.memoryRetriever.initialize();
      const context = await this.memoryRetriever.getRelevantMemories(
        userId,
        currentMessage,
        { maxFacts: 5, maxErrors: 3, maxVocabulary: 5 }
      );
      return context.formattedContext;
    } catch (error) {
      logger.error('Error getting memory context:', error);
      return 'No previous context available.';
    }
  }

  private buildAdaptedPrompt(
    state: ConversationState,
    memoryContext: string,
    adaptation: { difficultyChange: number; toneChange?: string; encouragement?: boolean }
  ): string {
    // Adjust levels based on adaptation
    const adaptedLevels = { ...state.levels };
    if (adaptation.difficultyChange !== 0) {
      const levelOrder: CEFRLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
      const currentIndex = levelOrder.indexOf(adaptedLevels.overall);
      const newIndex = Math.max(0, Math.min(5, currentIndex + adaptation.difficultyChange));
      adaptedLevels.overall = levelOrder[newIndex];
    }

    const promptContext: PromptContext = {
      languageCode: state.languageCode,
      languageVariant: state.languageVariant,
      goal: state.goal,
      levels: adaptedLevels,
      correctionIntensity: state.correctionIntensity,
      memoryContext,
      scenario: state.scenario,
      isCallMode: state.isCallMode,
    };

    let prompt = buildSystemPrompt(promptContext);

    // Add dynamic adaptations
    if (adaptation.toneChange || adaptation.encouragement) {
      prompt += `

═══════════════════════════════════════════════
REAL-TIME ADAPTATION (THIS RESPONSE)
═══════════════════════════════════════════════
${adaptation.toneChange ? `Tone adjustment: ${adaptation.toneChange}` : ''}
${adaptation.encouragement ? `Include encouragement: Acknowledge their effort, normalize mistakes, be supportive.` : ''}
${adaptation.difficultyChange < 0 ? `SIMPLIFY: The learner is struggling. Use simpler vocabulary and shorter sentences.` : ''}
${adaptation.difficultyChange > 0 ? `CHALLENGE: The learner is doing well. You can increase complexity slightly.` : ''}

Remember: This is a phone call, not a lesson. Be human.`;
    }

    return prompt;
  }

  private async generateResponse(
    systemPrompt: string,
    messages: ConversationMessage[],
    isCallMode: boolean
  ): Promise<string> {
    const formattedMessages = messages.map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    const response = await sendMessage(
      systemPrompt,
      formattedMessages,
      {
        temperature: 0.7,
        maxTokens: isCallMode ? 150 : 300, // Shorter for voice
      }
    );

    return response;
  }

  private prepareCorrections(
    analysis: MessageAnalysis,
    state: ConversationState,
    emotionalState: EmotionalState
  ): DetectedError[] {
    if (analysis.errors.length === 0) return [];

    // Reduce corrections if frustrated or anxious
    const maxCorrections =
      emotionalState === 'frustrated' ? 0 :
      emotionalState === 'anxious' ? 1 :
      state.correctionIntensity === 'minimal' ? 1 :
      state.correctionIntensity === 'moderate' ? 2 : 3;

    // Prioritize errors by severity and frequency
    const sortedErrors = [...analysis.errors].sort((a, b) => {
      const severityOrder = { significant: 0, moderate: 1, minor: 2 };
      return (severityOrder[a.severity] || 2) - (severityOrder[b.severity] || 2);
    });

    return sortedErrors.slice(0, maxCorrections);
  }

  private updateSessionStats(
    state: ConversationState,
    userMessage: string,
    analysis: MessageAnalysis,
    corrections: DetectedError[],
    emotionalState: EmotionalState
  ): void {
    state.sessionStats.messageCount++;
    state.sessionStats.errorCount += analysis.errors.length;
    state.sessionStats.correctionCount += corrections.length;
    state.sessionStats.avgResponseLength =
      (state.sessionStats.avgResponseLength * (state.sessionStats.messageCount - 1) + userMessage.length)
      / state.sessionStats.messageCount;
    state.sessionStats.lastEmotionalState = emotionalState;
  }

  private async persistMessages(
    conversationId: string,
    userMessage: string,
    aiResponse: string,
    analysis: MessageAnalysis,
    corrections: DetectedError[]
  ): Promise<void> {
    await prisma.message.createMany({
      data: [
        {
          conversationId,
          role: 'user',
          content: userMessage,
          analysis: analysis as any,
        },
        {
          conversationId,
          role: 'assistant',
          content: aiResponse,
          corrections: corrections as any,
        },
      ],
    });
  }

  private assessComplexity(text: string): 'simple' | 'moderate' | 'complex' {
    const words = text.split(/\s+/);
    const avgWordLength = words.reduce((sum, w) => sum + w.length, 0) / words.length;
    const sentences = text.split(/[.!?]+/).filter(s => s.trim());
    const avgSentenceLength = words.length / Math.max(1, sentences.length);

    if (avgWordLength < 4 && avgSentenceLength < 8) return 'simple';
    if (avgWordLength > 6 || avgSentenceLength > 15) return 'complex';
    return 'moderate';
  }

  /**
   * Get current conversation state
   */
  getState(conversationId: string): ConversationState | undefined {
    return this.stateCache.get(conversationId);
  }

  /**
   * End conversation and cleanup
   */
  async endConversation(conversationId: string): Promise<void> {
    const state = this.stateCache.get(conversationId);
    if (state) {
      // Update conversation in database
      await prisma.conversation.update({
        where: { id: conversationId },
        data: {
          status: 'ended',
          endedAt: new Date(),
        },
      });

      // Update metrics
      await prisma.conversationMetrics.update({
        where: { conversationId },
        data: {
          totalMessages: state.sessionStats.messageCount * 2,
          userMessages: state.sessionStats.messageCount,
          errorsDetected: state.sessionStats.errorCount,
          errorsCorrected: state.sessionStats.correctionCount,
        },
      });
    }
    this.stateCache.delete(conversationId);
  }
}

// Singleton
let engineInstance: ConversationEngine | null = null;

export function getConversationEngine(): ConversationEngine {
  if (!engineInstance) {
    engineInstance = new ConversationEngine();
  }
  return engineInstance;
}

export default ConversationEngine;
