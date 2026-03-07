import { Response, NextFunction } from 'express';
import prisma from '../../db/client';
import { SessionReportGenerator } from '../../services/reports/sessionReportGenerator';
import { AppError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../../types';

const reportGenerator = new SessionReportGenerator();

/**
 * Reconstruct report response from stored DB columns
 */
function formatStoredReport(r: any) {
  return {
    id: r.id,
    conversationId: r.conversationId,
    summary: r.summary,
    duration: r.duration,
    overallScore: r.overallScore,
    fluencyScore: r.fluencyScore,
    accuracyScore: r.accuracyScore,
    vocabularyScore: r.vocabularyScore,
    strengths: r.strengths || [],
    areasToImprove: r.areasToImprove || [],
    mistakes: r.mistakes || [],
    newVocabulary: r.newVocabulary || [],
    suggestions: r.suggestions || [],
    nextSteps: r.nextSteps || [],
    dominantEmotion: r.dominantEmotion,
    emotionalJourney: r.emotionalJourney,
    engagementLevel: r.engagementLevel,
    createdAt: r.createdAt,
  };
}

/**
 * Generate a session report for a conversation
 */
export const generateReport = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user!.id;

    // Verify conversation belongs to user and is completed
    const conversation = await prisma.conversation.findFirst({
      where: { id: conversationId, userId },
    });

    if (!conversation) {
      throw new AppError(404, 'NOT_FOUND', 'Conversation not found');
    }

    if (conversation.status !== 'completed') {
      throw new AppError(400, 'CONVERSATION_ACTIVE', 'Cannot generate report for active conversation');
    }

    // Check if report already exists
    const existingReport = await prisma.sessionReport.findFirst({
      where: { conversationId },
    });

    if (existingReport) {
      res.json({
        success: true,
        data: formatStoredReport(existingReport),
      });
      return;
    }

    // Generate new report
    const report = await reportGenerator.generateReport(conversationId);

    res.json({
      success: true,
      data: report,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get a specific session report
 */
export const getReport = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { reportId } = req.params;
    const userId = req.user!.id;

    const report = await prisma.sessionReport.findFirst({
      where: { id: reportId, conversation: { userId } },
    });

    if (!report) {
      throw new AppError(404, 'NOT_FOUND', 'Report not found');
    }

    res.json({
      success: true,
      data: formatStoredReport(report),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * List user's session reports
 */
export const listReports = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id;
    const { limit = 20, offset = 0 } = req.query;

    const whereClause = { conversation: { userId } };

    const [reports, total] = await Promise.all([
      prisma.sessionReport.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        take: Number(limit),
        skip: Number(offset),
        include: {
          conversation: {
            select: { goal: true, mode: true, startedAt: true },
          },
        },
      }),
      prisma.sessionReport.count({ where: whereClause }),
    ]);

    res.json({
      success: true,
      data: {
        reports: reports.map(r => ({
          id: r.id,
          conversationId: r.conversationId,
          summary: r.summary,
          overallScore: r.overallScore,
          accuracyScore: r.accuracyScore,
          vocabularyScore: r.vocabularyScore,
          fluencyScore: r.fluencyScore,
          mistakeCount: Array.isArray(r.mistakes) ? (r.mistakes as any[]).length : 0,
          newWordsCount: Array.isArray(r.newVocabulary) ? (r.newVocabulary as any[]).length : 0,
          conversationGoal: r.conversation?.goal,
          conversationMode: r.conversation?.mode,
          conversationDate: r.conversation?.startedAt,
          createdAt: r.createdAt,
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
 * Get aggregated report statistics
 */
export const getReportStats = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id;
    const { period = '30' } = req.query;

    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - Number(period));

    const reports = await prisma.sessionReport.findMany({
      where: {
        conversation: { userId },
        createdAt: { gte: daysAgo },
      },
      orderBy: { createdAt: 'asc' },
    });

    if (reports.length === 0) {
      res.json({
        success: true,
        data: {
          totalReports: 0,
          averageScore: 0,
          averageAccuracy: 0,
          averageVocabulary: 0,
          averageFluency: 0,
          totalMistakes: 0,
          totalNewWords: 0,
          trend: [],
        },
      });
      return;
    }

    const totalReports = reports.length;
    const averageScore = reports.reduce((sum, r) => sum + r.overallScore, 0) / totalReports;
    const averageAccuracy = reports.reduce((sum, r) => sum + r.accuracyScore, 0) / totalReports;
    const averageVocabulary = reports.reduce((sum, r) => sum + r.vocabularyScore, 0) / totalReports;
    const averageFluency = reports.reduce((sum, r) => sum + r.fluencyScore, 0) / totalReports;
    const totalMistakes = reports.reduce((sum, r) => {
      return sum + (Array.isArray(r.mistakes) ? (r.mistakes as any[]).length : 0);
    }, 0);
    const totalNewWords = reports.reduce((sum, r) => {
      return sum + (Array.isArray(r.newVocabulary) ? (r.newVocabulary as any[]).length : 0);
    }, 0);

    const trend = reports.map(r => ({
      date: r.createdAt.toISOString().split('T')[0],
      overallScore: r.overallScore,
      accuracyScore: r.accuracyScore,
      vocabularyScore: r.vocabularyScore,
      fluencyScore: r.fluencyScore,
    }));

    res.json({
      success: true,
      data: {
        totalReports,
        averageScore: Math.round(averageScore),
        averageAccuracy: Math.round(averageAccuracy),
        averageVocabulary: Math.round(averageVocabulary),
        averageFluency: Math.round(averageFluency),
        totalMistakes,
        totalNewWords,
        trend,
      },
    });
  } catch (error) {
    next(error);
  }
};
