import prisma from '../../db/client';
import { sendMessage, streamMessage, ClaudeMessage, ClaudeStreamCallbacks } from './claudeClient';
import { buildAnalysisPrompt } from '../../prompts/systemPrompts';
import { IntelligenceService, getIntelligenceService } from '../intelligence/intelligenceService';
import { ConversationSession } from '../memory/memoryOrchestrator';
import { LevelAnalyzer } from './levelAnalyzer';
import {
  EmotionAnalyzer,
  EmotionSignals,
  EmotionAnalysis,
  generateEmotionPromptModifier,
  calculateCoachingAdaptation,
} from '../emotion';
import { logger } from '../../utils/logger';
import {
  ConversationContext,
  AIResponse,
  MessageAnalysis,
  DetectedError,
  LanguageCode,
  LearningGoal,
  CEFRLevel,
} from '../../types';

export interface EmotionAwareResponse extends AIResponse {
  emotionAnalysis?: EmotionAnalysis;
}

export class ConversationOrchestrator {
  private intelligenceService: IntelligenceService;
  private levelAnalyzer: LevelAnalyzer;
  private emotionAnalyzer: EmotionAnalyzer;

  // Track emotion analyzers per conversation
  private conversationEmotions: Map<string, EmotionAnalyzer> = new Map();

  constructor() {
    this.intelligenceService = getIntelligenceService();
    this.levelAnalyzer = new LevelAnalyzer();
    this.emotionAnalyzer = new EmotionAnalyzer();
  }

  /**
   * Get or create emotion analyzer for a conversation
   */
  private getEmotionAnalyzer(conversationId: string): EmotionAnalyzer {
    if (!this.conversationEmotions.has(conversationId)) {
      this.conversationEmotions.set(conversationId, new EmotionAnalyzer());
    }
    return this.conversationEmotions.get(conversationId)!;
  }

  /**
   * Clean up emotion analyzer for ended conversation
   */
  cleanupConversation(conversationId: string): void {
    this.conversationEmotions.delete(conversationId);
  }

  /**
   * Initialize a new conversation
   */
  async initializeConversation(
    userId: string,
    conversationId: string,
    mode: 'chat' | 'call',
    goal: LearningGoal,
    scenarioId?: string
  ): Promise<{ systemPrompt: string; greeting: string }> {
    // Get user data
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        levelEstimates: true,
        memory: true,
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Get scenario if provided
    let scenario;
    if (scenarioId) {
      scenario = await prisma.scenario.findUnique({ where: { id: scenarioId } });
    }

    // Build session config for the unified prompt pipeline
    const sessionConfig: ConversationSession = {
      conversationId,
      userId,
      level: (user.levelEstimates?.overallLevel || 'A1') as CEFRLevel,
      languageCode: user.targetLanguageCode || 'en',
      languageVariant: user.targetLanguageVariant || '',
      mode: mode === 'call' ? 'voice' : 'chat',
      voiceArchetype: user.voiceArchetype || 'neutral_mirror',
      voiceIdentity: user.voiceIdentity || 'warm_female',
      scenarioContext: scenario ? {
        name: scenario.name,
        aiRole: scenario.aiRole,
        userRole: scenario.userRole,
        context: scenario.context,
      } : undefined,
    };

    // Generate system prompt through unified memory-aware pipeline
    const systemPrompt = await this.intelligenceService.generateSystemPrompt(sessionConfig, '');

    // Fetch active conversation threads for greeting personalization
    const activeThreads = await this.intelligenceService.getActiveThreads(userId);

    // Generate greeting
    const greeting = await this.generateGreeting(systemPrompt, goal, scenario, activeThreads);

    return { systemPrompt, greeting };
  }

  /**
   * Process a user message and generate AI response with emotion awareness
   */
  async processMessage(
    userId: string,
    conversationId: string,
    userMessage: string,
    previousMessages: ClaudeMessage[],
    audioSignals?: Partial<EmotionSignals>
  ): Promise<EmotionAwareResponse> {
    // Get user and conversation data
    const [user, conversation, messageCount] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        include: { levelEstimates: true, memory: true },
      }),
      prisma.conversation.findUnique({
        where: { id: conversationId },
      }),
      prisma.message.count({ where: { conversationId } }),
    ]);

    if (!user || !conversation) {
      throw new Error('User or conversation not found');
    }

    // Get emotion analyzer for this conversation
    const emotionAnalyzer = this.getEmotionAnalyzer(conversationId);

    // Analyze emotion from text and audio signals
    const sessionDuration = Math.floor(
      (Date.now() - conversation.startedAt.getTime()) / 1000
    );
    const errorCount = await prisma.message.count({
      where: {
        conversationId,
        role: 'user',
        corrections: { not: { equals: null } },
      },
    });

    const emotionAnalysis = await emotionAnalyzer.analyzeMultimodal(
      audioSignals || {},
      userMessage,
      {
        previousMessages: previousMessages.map(m => m.content),
        sessionDuration,
        errorCount,
      }
    );

    // Log emotion
    await prisma.emotionLog.create({
      data: {
        conversationId,
        primaryEmotion: emotionAnalysis.primaryEmotion,
        confidence: emotionAnalysis.confidence,
        secondaryEmotion: emotionAnalysis.secondaryEmotion,
        audioSignals: audioSignals as object,
        paceAdjustment: emotionAnalysis.recommendations.paceAdjustment,
        difficultyAdjustment: emotionAnalysis.recommendations.difficultyAdjustment,
        toneAdjustment: emotionAnalysis.recommendations.toneAdjustment,
      },
    });

    // Get emotion history and calculate coaching adaptation
    const emotionHistory = emotionAnalyzer.getEmotionHistory();
    const coachingAdaptation = calculateCoachingAdaptation(
      emotionAnalysis,
      emotionHistory,
      (user.levelEstimates?.overallLevel || 'A1') as CEFRLevel,
      conversation.goal as LearningGoal
    );

    // Build session config for the unified prompt pipeline
    const sessionConfig: ConversationSession = {
      conversationId,
      userId,
      level: (user.levelEstimates?.overallLevel || 'A1') as CEFRLevel,
      languageCode: user.targetLanguageCode || 'en',
      languageVariant: user.targetLanguageVariant || '',
      mode: conversation.mode === 'call' ? 'voice' : 'chat',
      voiceArchetype: user.voiceArchetype || 'neutral_mirror',
      voiceIdentity: user.voiceIdentity || 'warm_female',
      scenarioContext: conversation.scenarioId ? {
        name: conversation.scenarioType || '',
        aiRole: conversation.aiRole || '',
        userRole: conversation.userRole || '',
        context: '',
      } : undefined,
    };

    // Generate system prompt through unified memory-aware pipeline
    let systemPrompt = await this.intelligenceService.generateSystemPrompt(sessionConfig, userMessage || '');

    const overallLevel = (user.levelEstimates?.overallLevel || 'A1') as CEFRLevel;

    // Add emotion-aware modifications
    const emotionModifier = generateEmotionPromptModifier(
      emotionAnalysis,
      emotionHistory,
      overallLevel,
      conversation.goal as LearningGoal
    );
    systemPrompt += '\n\n' + emotionModifier;

    // Add coaching instructions
    if (coachingAdaptation.aiInstructions.length > 0) {
      systemPrompt += '\n\n## Special Instructions for This Response:\n';
      systemPrompt += coachingAdaptation.aiInstructions.map(i => `- ${i}`).join('\n');
    }

    // Analyze user message
    const analysis = await this.analyzeUserMessage(
      userMessage,
      user.targetLanguageCode as LanguageCode,
      overallLevel
    );

    // Generate AI response
    const messages: ClaudeMessage[] = [
      ...previousMessages,
      { role: 'user', content: userMessage },
    ];

    const aiContent = await sendMessage(systemPrompt, messages);

    // Extract corrections from AI response (if present)
    const corrections = this.extractCorrections(aiContent, user.correctionIntensity);

    // Update memory with new information
    await this.intelligenceService.onUserMessage(
      conversationId,
      userId,
      userMessage,
      { content: userMessage, errors: corrections as any }
    );
    this.intelligenceService.onAssistantMessage(conversationId, aiContent, corrections as any);

    // Update level estimates
    const levels = {
      grammar: (user.levelEstimates?.grammarLevel || 'A1') as CEFRLevel,
      vocabulary: (user.levelEstimates?.vocabularyLevel || 'A1') as CEFRLevel,
      fluency: (user.levelEstimates?.fluencyLevel || 'A1') as CEFRLevel,
      overall: overallLevel,
      confidence: user.levelEstimates?.confidence || 0.1,
    };
    const levelAssessment = await this.levelAnalyzer.assessFromMessage(
      userMessage,
      analysis,
      levels
    );

    if (levelAssessment) {
      await prisma.levelEstimate.update({
        where: { userId },
        data: {
          grammarScore: levelAssessment.grammarScore,
          vocabularyScore: levelAssessment.vocabularyScore,
          fluencyScore: levelAssessment.fluencyScore,
          confidence: Math.min(1, (user.levelEstimates?.confidence || 0.1) + 0.02),
        },
      });
    }

    return {
      content: aiContent,
      analysis,
      corrections,
      levelAssessment: levelAssessment?.levels,
      emotionAnalysis,
    };
  }

  /**
   * Adapt correction intensity based on emotional state
   */
  private adaptCorrectionIntensity(
    baseIntensity: 'minimal' | 'moderate' | 'detailed',
    adaptation: ReturnType<typeof calculateCoachingAdaptation>
  ): 'minimal' | 'moderate' | 'detailed' {
    const intensityOrder = ['minimal', 'moderate', 'detailed'] as const;
    const currentIndex = intensityOrder.indexOf(baseIntensity);

    // Reduce correction frequency for frustrated/anxious users
    if (adaptation.correctionBehavior.frequency === 'minimal' && currentIndex > 0) {
      return intensityOrder[currentIndex - 1];
    }
    // Increase for engaged users
    if (adaptation.correctionBehavior.frequency === 'detailed' && currentIndex < 2) {
      return intensityOrder[currentIndex + 1];
    }

    return baseIntensity;
  }

  /**
   * Stream AI response (for real-time voice mode) with emotion awareness
   */
  async streamResponse(
    userId: string,
    conversationId: string,
    userMessage: string,
    previousMessages: ClaudeMessage[],
    callbacks: ClaudeStreamCallbacks,
    audioSignals?: Partial<EmotionSignals>
  ): Promise<EmotionAnalysis | undefined> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { levelEstimates: true },
    });

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!user || !conversation) {
      throw new Error('User or conversation not found');
    }

    // Get emotion analyzer for this conversation
    const emotionAnalyzer = this.getEmotionAnalyzer(conversationId);

    // Analyze emotion
    const sessionDuration = Math.floor(
      (Date.now() - conversation.startedAt.getTime()) / 1000
    );

    const emotionAnalysis = await emotionAnalyzer.analyzeMultimodal(
      audioSignals || {},
      userMessage,
      {
        previousMessages: previousMessages.map(m => m.content),
        sessionDuration,
        errorCount: 0,
      }
    );

    // Log emotion
    await prisma.emotionLog.create({
      data: {
        conversationId,
        primaryEmotion: emotionAnalysis.primaryEmotion,
        confidence: emotionAnalysis.confidence,
        secondaryEmotion: emotionAnalysis.secondaryEmotion,
        audioSignals: audioSignals as object,
        paceAdjustment: emotionAnalysis.recommendations.paceAdjustment,
        difficultyAdjustment: emotionAnalysis.recommendations.difficultyAdjustment,
        toneAdjustment: emotionAnalysis.recommendations.toneAdjustment,
      },
    });

    // Get emotion history and calculate coaching adaptation
    const emotionHistory = emotionAnalyzer.getEmotionHistory();
    const coachingAdaptation = calculateCoachingAdaptation(
      emotionAnalysis,
      emotionHistory,
      (user.levelEstimates?.overallLevel || 'A1') as CEFRLevel,
      conversation.goal as LearningGoal
    );

    // Build session config for the unified prompt pipeline
    const sessionConfig: ConversationSession = {
      conversationId,
      userId,
      level: (user.levelEstimates?.overallLevel || 'A1') as CEFRLevel,
      languageCode: user.targetLanguageCode || 'en',
      languageVariant: user.targetLanguageVariant || '',
      mode: 'voice',
      voiceArchetype: user.voiceArchetype || 'neutral_mirror',
      voiceIdentity: user.voiceIdentity || 'warm_female',
    };

    // Generate system prompt through unified memory-aware pipeline
    let systemPrompt = await this.intelligenceService.generateSystemPrompt(sessionConfig, userMessage || '');

    // Add emotion-aware modifications
    const emotionModifier = generateEmotionPromptModifier(
      emotionAnalysis,
      emotionHistory,
      (user.levelEstimates?.overallLevel || 'A1') as CEFRLevel,
      conversation.goal as LearningGoal
    );
    systemPrompt += '\n\n' + emotionModifier;

    // Add coaching instructions for voice mode
    if (coachingAdaptation.aiInstructions.length > 0) {
      systemPrompt += '\n\n## Voice Mode Adjustments:\n';
      systemPrompt += coachingAdaptation.aiInstructions.slice(0, 3).map(i => `- ${i}`).join('\n');
    }

    // Adjust response length based on emotion
    let maxTokens = 200;
    if (coachingAdaptation.responseStyle.length === 'shorter') {
      maxTokens = 100;
    } else if (coachingAdaptation.responseStyle.length === 'longer') {
      maxTokens = 300;
    }

    const messages: ClaudeMessage[] = [
      ...previousMessages,
      { role: 'user', content: userMessage },
    ];

    await streamMessage(systemPrompt, messages, callbacks, {
      maxTokens,
    });

    return emotionAnalysis;
  }

  /**
   * Update memory after a streaming voice turn completes.
   *
   * Runs message analysis, correction extraction, vocabulary/error tracking,
   * and level re-estimation WITHOUT generating another AI response.
   *
   * Designed to be called fire-and-forget from the voice socket handler.
   * Failures are logged but never propagated — memory updates must never
   * break the real-time voice flow.
   */
  async updateMemoryAfterStream(
    userId: string,
    conversationId: string,
    userMessage: string,
    aiResponse: string,
  ): Promise<void> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { levelEstimates: true },
      });

      if (!user) return;

      const languageCode = user.targetLanguageCode as LanguageCode;
      const overallLevel = (user.levelEstimates?.overallLevel || 'A1') as CEFRLevel;

      // Analyse the user's message (errors, vocabulary, fluency)
      const analysis = await this.analyzeUserMessage(
        userMessage,
        languageCode,
        overallLevel,
      );

      // Extract corrections the AI embedded in its response
      const corrections = this.extractCorrections(
        aiResponse,
        user.correctionIntensity || 'moderate',
      );

      // Persist facts, error patterns, vocabulary, topics
      await this.intelligenceService.onUserMessage(
        conversationId,
        userId,
        userMessage,
        { content: userMessage, errors: corrections as any },
      );
      this.intelligenceService.onAssistantMessage(conversationId, aiResponse, corrections as any);

      // Re-estimate CEFR levels
      const levelAssessment = await this.levelAnalyzer.assessFromMessage(
        userMessage,
        analysis,
        {
          grammar: (user.levelEstimates?.grammarLevel || 'A1') as CEFRLevel,
          vocabulary: (user.levelEstimates?.vocabularyLevel || 'A1') as CEFRLevel,
          fluency: (user.levelEstimates?.fluencyLevel || 'A1') as CEFRLevel,
          overall: overallLevel,
          confidence: user.levelEstimates?.confidence || 0.1,
        },
      );

      if (levelAssessment) {
        await prisma.levelEstimate.update({
          where: { userId },
          data: {
            grammarScore: levelAssessment.grammarScore,
            vocabularyScore: levelAssessment.vocabularyScore,
            fluencyScore: levelAssessment.fluencyScore,
            confidence: Math.min(1, (user.levelEstimates?.confidence || 0.1) + 0.02),
          },
        });
      }

      logger.debug(`[Memory] Updated after voice turn for user ${userId}`);
    } catch (error) {
      // Non-fatal — log and move on
      logger.error('[Memory] Error updating after stream:', error);
    }
  }

  /**
   * Analyze a user message for errors, level, etc.
   */
  private async analyzeUserMessage(
    message: string,
    languageCode: LanguageCode,
    userLevel: CEFRLevel
  ): Promise<MessageAnalysis> {
    try {
      const analysisPrompt = buildAnalysisPrompt(languageCode, userLevel);

      const analysisResponse = await sendMessage(
        analysisPrompt,
        [{ role: 'user', content: `Analyze this message: "${message}"` }],
        { temperature: 0.2 }
      );

      // Parse JSON response
      const analysis = JSON.parse(analysisResponse);

      return {
        errors: analysis.errors || [],
        vocabularyLevel: analysis.vocabularyLevel || userLevel,
        grammarLevel: analysis.grammarLevel || userLevel,
        fluencyScore: analysis.fluencyScore || 70,
        sentiment: analysis.sentiment || 'neutral',
        wordCount: message.split(/\s+/).length,
        uniqueWords: [...new Set(message.toLowerCase().split(/\s+/))],
        complexity: analysis.complexity || 'moderate',
      };
    } catch (error) {
      logger.error('Error analyzing message:', error);
      // Return default analysis on error
      return {
        errors: [],
        vocabularyLevel: userLevel,
        grammarLevel: userLevel,
        fluencyScore: 70,
        sentiment: 'neutral',
        wordCount: message.split(/\s+/).length,
        uniqueWords: [...new Set(message.toLowerCase().split(/\s+/))],
        complexity: 'moderate',
      };
    }
  }

  /**
   * Extract corrections from AI response
   */
  private extractCorrections(
    aiResponse: string,
    intensity: string
  ): DetectedError[] {
    // Look for correction patterns in the response
    const corrections: DetectedError[] = [];

    // Pattern: "Instead of X, you could say Y"
    const pattern1 = /[Ii]nstead of ['"]([^'"]+)['"],?\s*(?:you could|try|say)\s*['"]([^'"]+)['"]/g;
    let match;

    while ((match = pattern1.exec(aiResponse)) !== null) {
      corrections.push({
        type: 'usage',
        original: match[1],
        correction: match[2],
        explanation: 'More natural expression',
        severity: 'minor',
      });
    }

    // Pattern: "X should be Y"
    const pattern2 = /['"]([^'"]+)['"]\s*should be\s*['"]([^'"]+)['"]/g;
    while ((match = pattern2.exec(aiResponse)) !== null) {
      corrections.push({
        type: 'grammar',
        original: match[1],
        correction: match[2],
        explanation: 'Grammar correction',
        severity: 'moderate',
      });
    }

    return corrections;
  }

  /**
   * Generate appropriate greeting based on context
   */
  private async generateGreeting(
    systemPrompt: string,
    goal: LearningGoal,
    scenario?: { name: string; aiRole?: string; starterMessage?: string | null } | null,
    activeThreads?: Array<{ topic: string; context: string; lastMentionedAt: Date; mentions: number }>
  ): Promise<string> {
    // Use scenario starter if available
    if (scenario?.starterMessage) {
      return scenario.starterMessage;
    }

    let greetingPrompt: string;

    if (scenario) {
      greetingPrompt = `Generate a short opening line in character as ${scenario.aiRole || 'your role'}. Start the ${scenario.name} scenario naturally. 1-2 sentences max.`;
    } else if (activeThreads && activeThreads.length > 0) {
      // Thread-aware greeting: instruct Claude to naturally reference a thread
      const threadList = activeThreads.map(
        t => `- "${t.topic}" (${t.context})`
      ).join('\n');

      greetingPrompt = `Generate a warm, natural greeting to start a practice session. The learner previously mentioned these topics:\n${threadList}\n\nNaturally reference ONE of these topics like a friend who remembered, e.g. "Hey! How did that interview go?" or "So, any news about the move to Spain?"\n\n1-2 sentences max. Be warm and curious, not formal. Do NOT mention all topics — pick the most natural one.`;
    } else {
      greetingPrompt = `Generate a warm, natural greeting to start a ${goal} practice session. 1-2 sentences max. Be welcoming but not overly enthusiastic.`;
    }

    const greeting = await sendMessage(
      systemPrompt,
      [{ role: 'user', content: greetingPrompt }],
      { maxTokens: 100 }
    );

    return greeting;
  }
}

export default ConversationOrchestrator;
