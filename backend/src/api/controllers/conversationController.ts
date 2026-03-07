import { Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import prisma from '../../db/client';
import { ConversationOrchestrator } from '../../services/ai/conversationOrchestrator';
import { IntelligenceService, getIntelligenceService } from '../../services/intelligence/intelligenceService';
import { AppError } from '../middleware/errorHandler';
import { AuthenticatedRequest, LearningGoal } from '../../types';
import { ClaudeMessage } from '../../services/ai/claudeClient';
import { SessionReportGenerator } from '../../services/reports/sessionReportGenerator';
import { logger } from '../../utils/logger';

const orchestrator = new ConversationOrchestrator();
const intelligenceService = getIntelligenceService();
const reportGenerator = new SessionReportGenerator();

/**
 * Start a new conversation
 */
export const startConversation = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Invalid input', { errors: errors.array() });
    }

    const { mode, goal, scenarioId } = req.body;
    const userId = req.user!.id;

    // Get user for language info
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError(404, 'NOT_FOUND', 'User not found');
    }

    // Create conversation record
    const conversation = await prisma.conversation.create({
      data: {
        userId,
        mode: mode || 'chat',
        goal: goal || 'conversation',
        languageCode: user.targetLanguageCode,
        languageVariant: user.targetLanguageVariant,
        scenarioId,
        status: 'active',
      },
    });

    // Initialize conversation with AI
    const { systemPrompt, greeting } = await orchestrator.initializeConversation(
      userId,
      conversation.id,
      mode || 'chat',
      goal || 'conversation',
      scenarioId
    );

    // Store the greeting as first AI message
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: 'assistant',
        content: greeting,
      },
    });

    res.status(201).json({
      success: true,
      data: {
        conversationId: conversation.id,
        greeting,
        mode: conversation.mode,
        goal: conversation.goal,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Send a message in a conversation
 */
export const sendMessage = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Invalid input', { errors: errors.array() });
    }

    const { conversationId } = req.params;
    const { message } = req.body;
    const userId = req.user!.id;

    // Verify conversation belongs to user
    const conversation = await prisma.conversation.findFirst({
      where: { id: conversationId, userId },
    });

    if (!conversation) {
      throw new AppError(404, 'NOT_FOUND', 'Conversation not found');
    }

    if (conversation.status !== 'active') {
      throw new AppError(400, 'CONVERSATION_ENDED', 'This conversation has ended');
    }

    // Store user message
    await prisma.message.create({
      data: {
        conversationId,
        role: 'user',
        content: message,
      },
    });

    // Get previous messages for context
    const previousMessages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      take: 20, // Limit context window
    });

    const claudeMessages: ClaudeMessage[] = previousMessages.map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    // Process message and get AI response
    const aiResponse = await orchestrator.processMessage(
      userId,
      conversationId,
      message,
      claudeMessages.slice(0, -1) // Exclude the message we just added
    );

    // Store AI response
    await prisma.message.create({
      data: {
        conversationId,
        role: 'assistant',
        content: aiResponse.content,
        analysis: aiResponse.analysis as object,
        corrections: aiResponse.corrections as object[],
      },
    });

    // Update conversation metrics
    await updateConversationMetrics(conversationId, message, aiResponse);

    res.json({
      success: true,
      data: {
        response: aiResponse.content,
        analysis: aiResponse.analysis,
        corrections: aiResponse.corrections,
        levelAssessment: aiResponse.levelAssessment,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * End a conversation and generate report
 */
export const endConversation = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user!.id;

    // Verify conversation belongs to user
    const conversation = await prisma.conversation.findFirst({
      where: { id: conversationId, userId },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
        metrics: true,
      },
    });

    if (!conversation) {
      throw new AppError(404, 'NOT_FOUND', 'Conversation not found');
    }

    // Get user for language info
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    // End session: consolidate STM → LTM
    const sessionResult = await intelligenceService.onSessionEnd(conversationId, userId);
    const summary = sessionResult?.narrativeSummary || 'Session completed.';

    // Update conversation status
    await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        status: 'completed',
        endedAt: new Date(),
      },
    });

    // Update daily stats
    await updateDailyStats(userId, conversation);

    // Auto-generate session report (non-fatal)
    let report = null;
    try {
      report = await reportGenerator.generateReport(conversationId);
    } catch (err) {
      logger.warn('Report generation failed:', err);
    }

    // Calculate duration from timestamps
    const durationSeconds = conversation.endedAt && conversation.startedAt
      ? Math.floor((new Date().getTime() - conversation.startedAt.getTime()) / 1000)
      : 0;

    res.json({
      success: true,
      data: {
        conversationId,
        summary,
        duration: durationSeconds,
        messageCount: conversation.messages.length,
        report: report || null,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get conversation history
 */
export const getConversation = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user!.id;

    const conversation = await prisma.conversation.findFirst({
      where: { id: conversationId, userId },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
        metrics: true,
      },
    });

    if (!conversation) {
      throw new AppError(404, 'NOT_FOUND', 'Conversation not found');
    }

    res.json({
      success: true,
      data: {
        id: conversation.id,
        mode: conversation.mode,
        goal: conversation.goal,
        status: conversation.status,
        scenario: conversation.scenarioId ? {
          scenarioType: conversation.scenarioType,
          scenarioDesc: conversation.scenarioDesc,
          aiRole: conversation.aiRole,
          userRole: conversation.userRole,
        } : null,
        messages: conversation.messages.map(m => ({
          id: m.id,
          role: m.role,
          content: m.content,
          corrections: m.corrections,
          createdAt: m.createdAt,
        })),
        metrics: conversation.metrics,
        startedAt: conversation.startedAt,
        endedAt: conversation.endedAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * List user's conversations
 */
export const listConversations = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id;
    const { limit = 20, offset = 0, status } = req.query;

    const where: any = { userId };
    if (status) {
      where.status = status;
    }

    const [conversations, total] = await Promise.all([
      prisma.conversation.findMany({
        where,
        orderBy: { startedAt: 'desc' },
        take: Number(limit),
        skip: Number(offset),
        include: {
          messages: {
            take: 1,
            orderBy: { createdAt: 'desc' },
          },
          metrics: true,
        },
      }),
      prisma.conversation.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        conversations: conversations.map(c => ({
          id: c.id,
          mode: c.mode,
          goal: c.goal,
          status: c.status,
          scenarioType: c.scenarioType,
          lastMessage: c.messages[0]?.content?.substring(0, 100),
          messageCount: c.metrics?.totalMessages || 0,
          wordsSpoken: c.metrics?.wordsSpoken || 0,
          startedAt: c.startedAt,
          endedAt: c.endedAt,
        })),
        total,
        limit: Number(limit),
        offset: Number(offset),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get available scenarios
 */
export const getScenarios = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { goal } = req.query;

    const where: any = { isActive: true };
    if (goal) where.goal = goal;

    const scenarios = await prisma.scenario.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    res.json({
      success: true,
      data: scenarios.map(s => ({
        id: s.id,
        name: s.name,
        description: s.description,
        goal: s.goal,
        difficulty: s.difficulty,
        aiRole: s.aiRole,
        userRole: s.userRole,
      })),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get conversation messages
 */
export const getMessages = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const conversation = await prisma.conversation.findFirst({
      where: { id, userId },
    });

    if (!conversation) {
      throw new AppError(404, 'NOT_FOUND', 'Conversation not found');
    }

    const messages = await prisma.message.findMany({
      where: { conversationId: id },
      orderBy: { createdAt: 'asc' },
      skip: offset,
      take: limit,
    });

    res.json({
      success: true,
      data: messages.map(m => ({
        id: m.id,
        role: m.role,
        content: m.content,
        createdAt: m.createdAt,
      })),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get session report for a conversation
 */
export const getSessionReport = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const report = await prisma.sessionReport.findFirst({
      where: { conversationId: id, conversation: { userId } },
    });

    if (!report) {
      throw new AppError(404, 'NOT_FOUND', 'Session report not found');
    }

    res.json({
      success: true,
      data: report,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a conversation
 */
export const deleteConversation = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const conversation = await prisma.conversation.findFirst({
      where: { id, userId },
    });

    if (!conversation) {
      throw new AppError(404, 'NOT_FOUND', 'Conversation not found');
    }

    await prisma.conversation.delete({ where: { id } });

    res.json({
      success: true,
      data: { message: 'Conversation deleted' },
    });
  } catch (error) {
    next(error);
  }
};

// Helper functions

async function updateConversationMetrics(
  conversationId: string,
  userMessage: string,
  aiResponse: { content: string; analysis?: any; corrections?: any[] }
) {
  const existing = await prisma.conversationMetrics.findUnique({
    where: { conversationId },
  });

  const wordCount = userMessage.split(/\s+/).length;
  const errorCount = aiResponse.corrections?.length || 0;

  if (existing) {
    await prisma.conversationMetrics.update({
      where: { conversationId },
      data: {
        totalMessages: { increment: 2 }, // User + AI
        userMessages: { increment: 1 },
        wordsSpoken: { increment: wordCount },
        errorsDetected: { increment: errorCount },
      },
    });
  } else {
    await prisma.conversationMetrics.create({
      data: {
        conversationId,
        totalMessages: 2,
        userMessages: 1,
        wordsSpoken: wordCount,
        errorsDetected: errorCount,
      },
    });
  }
}

async function updateDailyStats(userId: string, conversation: any) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const progressStats = await prisma.progressStats.findUnique({
    where: { userId },
  });

  if (!progressStats) return;

  const totalMessages = conversation.metrics?.totalMessages || 0;
  const errorsDetected = conversation.metrics?.errorsDetected || 0;
  const wordsSpoken = conversation.metrics?.wordsSpoken || 0;
  const speakingTimeMs = conversation.metrics?.userSpeakingTimeMs || 0;
  const speakingTimeMin = Math.floor(speakingTimeMs / 60000);

  const existing = await prisma.dailyStats.findFirst({
    where: {
      progressStatsId: progressStats.id,
      date: today,
    },
  });

  if (existing) {
    await prisma.dailyStats.update({
      where: { id: existing.id },
      data: {
        speakingTimeMin: { increment: speakingTimeMin },
        sessionsCount: { increment: 1 },
        messagesCount: { increment: totalMessages },
        errorsCount: { increment: errorsDetected },
        wordsSpoken: { increment: wordsSpoken },
      },
    });
  } else {
    await prisma.dailyStats.create({
      data: {
        progressStatsId: progressStats.id,
        date: today,
        speakingTimeMin,
        sessionsCount: 1,
        messagesCount: totalMessages,
        errorsCount: errorsDetected,
        wordsSpoken,
      },
    });
  }

  // Update progress stats
  await prisma.progressStats.update({
    where: { userId },
    data: {
      totalSessions: { increment: 1 },
      totalSpeakingTimeMin: { increment: speakingTimeMin },
      totalWords: { increment: wordsSpoken },
    },
  });
}
