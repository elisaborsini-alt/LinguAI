import { Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import prisma from '../../db/client';
import { getMemoryRetriever } from '../../services/memory/memoryRetriever';
import { getVectorStore, VectorMetadata } from '../../services/memory/vectorStore';
import { getIntelligenceService } from '../../services/intelligence/intelligenceService';
import { AppError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../../types';
import { logger } from '../../utils/logger';

const intelligenceService = getIntelligenceService();
const memoryRetriever = getMemoryRetriever();
const vectorStore = getVectorStore();

/**
 * Get memory overview
 */
export const getMemoryOverview = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id;

    const memory = await prisma.userMemory.findUnique({
      where: { userId },
      include: {
        facts: {
          orderBy: { confidence: 'desc' },
          take: 10,
        },
        errorPatterns: {
          orderBy: { frequency: 'desc' },
          take: 5,
        },
        sessionSummaries: {
          orderBy: { date: 'desc' },
          take: 5,
        },
        vocabulary: {
          orderBy: { lastUsedAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!memory) {
      // Return empty memory structure
      res.json({
        success: true,
        data: {
          totalSessions: 0,
          knownFacts: [],
          errorPatterns: [],
          recentSessions: [],
          vocabulary: [],
          preferredTopics: [],
          avoidTopics: [],
          responseStyle: 'mixed',
          pacePreference: 'moderate',
        },
      });
      return;
    }

    res.json({
      success: true,
      data: {
        totalSessions: memory.sessionSummaries.length,
        knownFacts: memory.facts.map(f => ({
          id: f.id,
          category: f.category,
          content: f.content,
          confidence: f.confidence,
        })),
        errorPatterns: memory.errorPatterns.map(e => ({
          id: e.id,
          category: e.category,
          pattern: e.pattern,
          examples: e.examples,
          frequency: e.frequency,
          lastOccurred: e.lastOccurredAt,
        })),
        recentSessions: memory.sessionSummaries.map(s => ({
          id: s.id,
          conversationId: s.conversationId,
          summary: s.summary,
          topicsDiscussed: s.topicsDiscussed,
          date: s.date,
        })),
        vocabulary: memory.vocabulary.map(v => ({
          id: v.id,
          word: v.word,
          context: v.context,
          mastery: v.mastery,
          timesUsed: v.timesUsed,
          lastUsedAt: v.lastUsedAt,
        })),
        preferredTopics: memory.preferredTopics,
        avoidTopics: memory.avoidTopics,
        responseStyle: memory.responseStyle,
        pacePreference: memory.pacePreference,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get vocabulary list with filtering
 */
export const getVocabulary = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id;
    const { limit = 50, offset = 0, sortBy = 'lastUsedAt', filter } = req.query;

    const memory = await prisma.userMemory.findUnique({
      where: { userId },
    });

    if (!memory) {
      res.json({
        success: true,
        data: { vocabulary: [], total: 0 },
      });
      return;
    }

    const where: any = { memoryId: memory.id };

    if (filter === 'needs_practice') {
      where.mastery = { lt: 0.5 };
    } else if (filter === 'mastered') {
      where.mastery = { gte: 0.8 };
    } else if (filter === 'learning') {
      where.mastery = { gte: 0.5, lt: 0.8 };
    }

    const orderBy: any = {};
    if (sortBy === 'mastery') {
      orderBy.mastery = 'asc';
    } else if (sortBy === 'timesUsed') {
      orderBy.timesUsed = 'desc';
    } else if (sortBy === 'word') {
      orderBy.word = 'asc';
    } else {
      orderBy.lastUsedAt = 'desc';
    }

    const [vocabulary, total] = await Promise.all([
      prisma.learnedVocabulary.findMany({
        where,
        orderBy,
        take: Number(limit),
        skip: Number(offset),
      }),
      prisma.learnedVocabulary.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        vocabulary: vocabulary.map(v => ({
          id: v.id,
          word: v.word,
          context: v.context,
          mastery: v.mastery,
          timesUsed: v.timesUsed,
          learnedAt: v.learnedAt,
          lastUsedAt: v.lastUsedAt,
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
 * Get vocabulary for practice
 */
export const getVocabularyForPractice = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id;
    const { limit = 10 } = req.query;

    const memory = await prisma.userMemory.findUnique({ where: { userId } });
    const vocabulary = memory ? (await prisma.learnedVocabulary.findMany({
      where: { memoryId: memory.id, mastery: { lt: 0.9 } },
      orderBy: [{ mastery: 'asc' }, { lastUsedAt: 'asc' }],
      take: Number(limit),
    })).map(v => ({ word: v.word, context: v.context || '', mastery: v.mastery })) : [];

    res.json({
      success: true,
      data: vocabulary,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get error patterns
 */
export const getErrorPatterns = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id;
    const { limit = 10 } = req.query;

    const mem = await prisma.userMemory.findUnique({ where: { userId } });
    const patterns = mem ? (await prisma.errorPattern.findMany({
      where: { memoryId: mem.id },
      orderBy: { frequency: 'desc' },
      take: Number(limit),
    })).map(e => ({ pattern: e.pattern, examples: e.examples, frequency: e.frequency })) : [];

    res.json({
      success: true,
      data: patterns,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get session summaries
 */
export const getSessionSummaries = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id;
    const { limit = 10, offset = 0 } = req.query;

    const memory = await prisma.userMemory.findUnique({
      where: { userId },
    });

    if (!memory) {
      res.json({
        success: true,
        data: { summaries: [], total: 0 },
      });
      return;
    }

    const [summaries, total] = await Promise.all([
      prisma.sessionSummary.findMany({
        where: { memoryId: memory.id },
        orderBy: { date: 'desc' },
        take: Number(limit),
        skip: Number(offset),
      }),
      prisma.sessionSummary.count({ where: { memoryId: memory.id } }),
    ]);

    res.json({
      success: true,
      data: {
        summaries: summaries.map(s => ({
          id: s.id,
          conversationId: s.conversationId,
          summary: s.summary,
          topicsDiscussed: s.topicsDiscussed,
          vocabularyIntroduced: s.vocabularyIntroduced,
          keyMistakes: s.keyMistakes,
          improvements: s.improvements,
          goal: s.goal,
          durationMinutes: s.durationMinutes,
          date: s.date,
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
 * Update topic preferences
 */
export const updateTopicPreferences = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Invalid input', { errors: errors.array() });
    }

    const userId = req.user!.id;
    const { preferredTopics, avoidTopics } = req.body;

    const updates: Record<string, unknown> = {};
    if (preferredTopics) updates.preferredTopics = preferredTopics;
    if (avoidTopics) updates.avoidTopics = avoidTopics;
    if (Object.keys(updates).length > 0) {
      await prisma.userMemory.update({ where: { userId }, data: updates });
    }

    res.json({
      success: true,
      data: { message: 'Preferences updated' },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Add a memory fact manually
 */
export const addFact = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Invalid input', { errors: errors.array() });
    }

    const userId = req.user!.id;
    const { category, content } = req.body;

    let memory = await prisma.userMemory.findUnique({
      where: { userId },
    });

    if (!memory) {
      memory = await prisma.userMemory.create({
        data: { userId },
      });
    }

    const fact = await prisma.memoryFact.create({
      data: {
        memoryId: memory.id,
        category,
        content,
        confidence: 1.0, // User-provided facts have high confidence
      },
    });

    res.status(201).json({
      success: true,
      data: {
        id: fact.id,
        category: fact.category,
        content: fact.content,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a memory fact
 */
export const deleteFact = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id;
    const { factId } = req.params;

    const memory = await prisma.userMemory.findUnique({
      where: { userId },
    });

    if (!memory) {
      throw new AppError(404, 'NOT_FOUND', 'Memory not found');
    }

    const fact = await prisma.memoryFact.findFirst({
      where: { id: factId, memoryId: memory.id },
    });

    if (!fact) {
      throw new AppError(404, 'NOT_FOUND', 'Fact not found');
    }

    await prisma.memoryFact.delete({
      where: { id: factId },
    });

    res.json({
      success: true,
      data: { message: 'Fact deleted' },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get context summary (for debugging/admin)
 */
export const getContextSummary = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id;

    const summary = await intelligenceService.getContextForPrompt(userId, '', '');

    res.json({
      success: true,
      data: { summary },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================
// Semantic Search Endpoints
// ============================================

/**
 * Search memories semantically using vector similarity
 */
export const searchMemories = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Invalid input', { errors: errors.array() });
    }

    const userId = req.user!.id;
    const { query, limit = 10, minScore = 0.5, types } = req.body;

    const results = await vectorStore.search(query, userId, {
      limit,
      minScore,
      types: types as VectorMetadata['type'][],
    });

    res.json({
      success: true,
      data: {
        results: results.map(r => ({
          id: r.id,
          content: r.content,
          type: r.type,
          category: r.category,
          score: r.score,
          createdAt: r.metadata.createdAt,
        })),
        total: results.length,
        query,
      },
    });
  } catch (error) {
    logger.error('Error searching memories:', error);
    next(error);
  }
};

/**
 * Get relevant context for a conversation
 */
export const getRelevantContext = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Invalid input', { errors: errors.array() });
    }

    const userId = req.user!.id;
    const { currentContext, maxFacts, maxErrors, maxVocabulary } = req.body;

    // Initialize retriever if needed
    await memoryRetriever.initialize();

    const context = await memoryRetriever.getRelevantMemories(userId, currentContext, {
      maxFacts,
      maxErrors,
      maxVocabulary,
    });

    res.json({
      success: true,
      data: {
        relevantFacts: context.relevantFacts,
        recentErrors: context.recentErrors,
        vocabularyContext: context.vocabularyContext,
        sessionHistory: context.sessionHistory,
        preferences: context.preferences,
        formattedContext: context.formattedContext,
      },
    });
  } catch (error) {
    logger.error('Error getting relevant context:', error);
    next(error);
  }
};

/**
 * Sync user memories to vector store
 */
export const syncToVectorStore = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id;

    // Initialize retriever if needed
    await memoryRetriever.initialize();

    const count = await memoryRetriever.syncUserMemoriesToVectorStore(userId);

    res.json({
      success: true,
      data: {
        message: 'Memories synced to vector store',
        memoriesSynced: count,
      },
    });
  } catch (error) {
    logger.error('Error syncing to vector store:', error);
    next(error);
  }
};
