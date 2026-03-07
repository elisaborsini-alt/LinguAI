import { Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import prisma from '../../db/client';
import { LevelAnalyzer } from '../../services/ai/levelAnalyzer';
import { getProgressService } from '../../services/progress/progressService';
import { getMomentumService } from '../../services/progress/momentumService';
import { getTimeMachineService } from '../../services/progress/timeMachineService';
import { AppError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../../types';

const levelAnalyzer = new LevelAnalyzer();

/**
 * Get overall progress overview
 */
export const getOverview = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id;

    const [user, stats, levels, memory] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          sessionLengthMinutes: true,
          createdAt: true,
        },
      }),
      prisma.progressStats.findUnique({
        where: { userId },
      }),
      prisma.levelEstimate.findUnique({
        where: { userId },
      }),
      prisma.userMemory.findUnique({
        where: { userId },
        include: {
          vocabulary: { select: { id: true } },
          errorPatterns: { select: { id: true } },
        },
      }),
    ]);

    if (!user || !stats) {
      throw new AppError(404, 'NOT_FOUND', 'User data not found');
    }

    // Get today's stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayStats = await prisma.dailyStats.findFirst({
      where: { progressStatsId: stats.id, date: today },
    });

    // Calculate days since joined
    const daysSinceJoined = Math.floor(
      (Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24)
    );

    res.json({
      success: true,
      data: {
        streak: {
          current: stats.currentStreak,
          longest: stats.longestStreak,
          lastActiveDate: stats.lastActivityDate,
        },
        today: {
          minutesPracticed: todayStats?.speakingTimeMin || 0,
          goalMinutes: user.sessionLengthMinutes,
          conversations: todayStats?.sessionsCount || 0,
          messages: todayStats?.messagesCount || 0,
          wordsUsed: todayStats?.wordsSpoken || 0,
          errors: todayStats?.errorsCount || 0,
        },
        lifetime: {
          totalMinutes: stats.totalSpeakingTimeMin,
          totalConversations: stats.totalSessions,
          totalMessages: stats.totalWords,
          daysSinceJoined,
          averageMinutesPerDay: daysSinceJoined > 0
            ? Math.round(stats.totalSpeakingTimeMin / daysSinceJoined)
            : 0,
        },
        levels: levels ? {
          grammar: { level: levels.grammarLevel, score: levels.grammarScore },
          vocabulary: { level: levels.vocabularyLevel, score: levels.vocabularyScore },
          fluency: { level: levels.fluencyLevel, score: levels.fluencyScore },
          overall: { level: levels.overallLevel, score: levels.fluencyScore },
          confidence: levels.confidence,
        } : null,
        learning: {
          vocabularyCount: memory?.vocabulary.length || 0,
          errorPatternCount: memory?.errorPatterns.length || 0,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get weekly progress
 */
export const getWeeklyProgress = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id;
    const { weekStart } = req.query;

    // Calculate week boundaries
    let startDate: Date;
    if (weekStart) {
      startDate = new Date(weekStart as string);
    } else {
      startDate = new Date();
      startDate.setDate(startDate.getDate() - startDate.getDay()); // Start of week (Sunday)
    }
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 7);

    const stats = await prisma.progressStats.findUnique({ where: { userId } });

    // Get daily stats for the week
    const dailyStats = stats ? await prisma.dailyStats.findMany({
      where: {
        progressStatsId: stats.id,
        date: {
          gte: startDate,
          lt: endDate,
        },
      },
      orderBy: { date: 'asc' },
    }) : [];

    // Create full week array with all days
    const weekDays = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(startDate);
      day.setDate(day.getDate() + i);

      const dayStats = dailyStats.find(
        d => d.date.toISOString().split('T')[0] === day.toISOString().split('T')[0]
      );

      weekDays.push({
        date: day.toISOString().split('T')[0],
        dayOfWeek: day.toLocaleDateString('en-US', { weekday: 'short' }),
        totalMinutes: dayStats?.speakingTimeMin || 0,
        conversationCount: dayStats?.sessionsCount || 0,
        messageCount: dayStats?.messagesCount || 0,
        wordCount: dayStats?.wordsSpoken || 0,
        errorCount: dayStats?.errorsCount || 0,
        averageFluencyScore: null as number | null,
      });
    }

    // Calculate week totals
    const weekTotals = weekDays.reduce(
      (acc, day) => ({
        totalMinutes: acc.totalMinutes + day.totalMinutes,
        conversationCount: acc.conversationCount + day.conversationCount,
        messageCount: acc.messageCount + day.messageCount,
        wordCount: acc.wordCount + day.wordCount,
        errorCount: acc.errorCount + day.errorCount,
      }),
      { totalMinutes: 0, conversationCount: 0, messageCount: 0, wordCount: 0, errorCount: 0 }
    );

    res.json({
      success: true,
      data: {
        weekStart: startDate.toISOString().split('T')[0],
        weekEnd: new Date(endDate.getTime() - 1).toISOString().split('T')[0],
        days: weekDays,
        totals: weekTotals,
        activeDays: weekDays.filter(d => d.totalMinutes > 0).length,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get daily stats for a date range
 */
export const getDailyStats = async (
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
    const { startDate, endDate } = req.query;

    const start = new Date(startDate as string);
    start.setHours(0, 0, 0, 0);

    const end = new Date(endDate as string);
    end.setHours(23, 59, 59, 999);

    // Limit range to 90 days
    const maxRange = 90 * 24 * 60 * 60 * 1000;
    if (end.getTime() - start.getTime() > maxRange) {
      throw new AppError(400, 'RANGE_TOO_LARGE', 'Date range cannot exceed 90 days');
    }

    const progressStats = await prisma.progressStats.findUnique({ where: { userId } });

    const dailyStatsResult = progressStats ? await prisma.dailyStats.findMany({
      where: {
        progressStatsId: progressStats.id,
        date: {
          gte: start,
          lte: end,
        },
      },
      orderBy: { date: 'asc' },
    }) : [];

    res.json({
      success: true,
      data: dailyStatsResult.map(s => ({
        date: s.date.toISOString().split('T')[0],
        totalMinutes: s.speakingTimeMin,
        conversationCount: s.sessionsCount,
        messageCount: s.messagesCount,
        wordCount: s.wordsSpoken,
        errorCount: s.errorsCount,
        averageFluencyScore: null as number | null,
      })),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get level history
 */
export const getLevelHistory = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id;

    const levelEstimate = await prisma.levelEstimate.findUnique({ where: { userId } });

    const levelHistory = levelEstimate ? await prisma.levelHistory.findMany({
      where: { levelEstimateId: levelEstimate.id },
      orderBy: { recordedAt: 'asc' },
    }) : [];

    // Group by month for chart display
    const monthlyProgress: Record<string, any> = {};

    levelHistory.forEach(entry => {
      const monthKey = entry.recordedAt.toISOString().substring(0, 7); // YYYY-MM

      if (!monthlyProgress[monthKey]) {
        monthlyProgress[monthKey] = {
          month: monthKey,
          entries: [],
        };
      }
      monthlyProgress[monthKey].entries.push({
        grammarLevel: entry.grammarLevel,
        vocabularyLevel: entry.vocabularyLevel,
        fluencyLevel: entry.fluencyLevel,
        overallLevel: entry.overallLevel,
        assessedAt: entry.recordedAt,
      });
    });

    // Get latest entry per month
    const chartData = Object.values(monthlyProgress).map((m: any) => {
      const latest = m.entries[m.entries.length - 1];
      return {
        month: m.month,
        grammar: latest.grammarLevel,
        vocabulary: latest.vocabularyLevel,
        fluency: latest.fluencyLevel,
        overall: latest.overallLevel,
      };
    });

    res.json({
      success: true,
      data: {
        history: levelHistory.map(h => ({
          grammarLevel: h.grammarLevel,
          vocabularyLevel: h.vocabularyLevel,
          fluencyLevel: h.fluencyLevel,
          overallLevel: h.overallLevel,
          assessedAt: h.recordedAt,
        })),
        chartData,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get strengths and weaknesses analysis
 */
export const getAnalysis = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id;

    const [levels, errorPatterns, vocabulary] = await Promise.all([
      prisma.levelEstimate.findUnique({ where: { userId } }),
      (async () => {
        const mem = await prisma.userMemory.findUnique({ where: { userId } });
        if (!mem) return [];
        return (await prisma.errorPattern.findMany({
          where: { memoryId: mem.id },
          orderBy: { frequency: 'desc' },
          take: 10,
        })).map(e => ({ pattern: e.pattern, examples: e.examples, frequency: e.frequency }));
      })(),
      (async () => {
        const mem = await prisma.userMemory.findUnique({ where: { userId } });
        if (!mem) return [];
        return (await prisma.learnedVocabulary.findMany({
          where: { memoryId: mem.id, mastery: { lt: 0.9 } },
          orderBy: [{ mastery: 'asc' }, { lastUsedAt: 'asc' }],
          take: 20,
        })).map(v => ({ word: v.word, context: v.context || '', mastery: v.mastery }));
      })(),
    ]);

    if (!levels) {
      res.json({
        success: true,
        data: {
          strengths: [],
          weaknesses: [],
          recommendations: ['Start practicing to get personalized analysis'],
          topErrorPatterns: [],
          vocabularyToReview: [],
        },
      });
      return;
    }

    // Build assessment for analysis
    const assessment = {
      grammarScore: levels.grammarScore || 50,
      vocabularyScore: levels.vocabularyScore || 50,
      fluencyScore: levels.fluencyScore || 50,
      levels: {
        grammar: levels.grammarLevel as any,
        vocabulary: levels.vocabularyLevel as any,
        fluency: levels.fluencyLevel as any,
        overall: levels.overallLevel as any,
      },
      confidence: levels.confidence,
    };

    const { strengths, weaknesses, recommendations } = levelAnalyzer.analyzeSkillGaps(assessment);

    // Add error-pattern-based recommendations
    if (errorPatterns.length > 0) {
      const topPattern = errorPatterns[0];
      recommendations.push(`Focus on: ${topPattern.pattern}`);
    }

    // Add vocabulary recommendations
    if (vocabulary.length > 0) {
      recommendations.push(`Review ${vocabulary.length} vocabulary words that need practice`);
    }

    res.json({
      success: true,
      data: {
        strengths,
        weaknesses,
        recommendations: recommendations.slice(0, 5),
        topErrorPatterns: errorPatterns.slice(0, 5).map(e => ({
          pattern: e.pattern,
          frequency: e.frequency,
          examples: e.examples.slice(0, 3),
        })),
        vocabularyToReview: vocabulary.slice(0, 10).map(v => ({
          word: v.word,
          context: v.context,
          mastery: v.mastery,
        })),
        skillBreakdown: {
          grammar: {
            level: levels.grammarLevel,
            score: levels.grammarScore,
            description: getSkillDescription('grammar', levels.grammarScore || 50),
          },
          vocabulary: {
            level: levels.vocabularyLevel,
            score: levels.vocabularyScore,
            description: getSkillDescription('vocabulary', levels.vocabularyScore || 50),
          },
          fluency: {
            level: levels.fluencyLevel,
            score: levels.fluencyScore,
            description: getSkillDescription('fluency', levels.fluencyScore || 50),
          },
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// Helper function
function getSkillDescription(skill: string, score: number): string {
  const descriptions: Record<string, Record<string, string>> = {
    grammar: {
      low: 'Focus on basic sentence structures and verb forms',
      medium: 'Working on more complex grammar patterns',
      high: 'Strong grammar foundation, refining advanced structures',
    },
    vocabulary: {
      low: 'Building essential vocabulary for daily communication',
      medium: 'Expanding vocabulary for more nuanced expression',
      high: 'Rich vocabulary, working on specialized and idiomatic expressions',
    },
    fluency: {
      low: 'Developing confidence in spoken expression',
      medium: 'Building natural speech patterns and flow',
      high: 'Speaking with natural rhythm and expression',
    },
  };

  const level = score < 40 ? 'low' : score < 70 ? 'medium' : 'high';
  return descriptions[skill]?.[level] || 'Keep practicing!';
}

/**
 * Get retention-oriented progress summary
 */
export const getProgressSummary = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id;
    const progressService = getProgressService();
    const summary = await progressService.getProgressSummary(userId);

    res.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get time machine comparison (then vs now voice snapshots)
 */
export const getTimeMachine = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id;
    const timeMachineService = getTimeMachineService();
    const result = await timeMachineService.getComparison(userId);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get momentum insight (reflective message about long-term improvement)
 */
export const getMomentumInsight = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id;
    const momentumService = getMomentumService();
    const insight = await momentumService.detectInsight(userId);

    res.json({
      success: true,
      data: insight,
    });
  } catch (error) {
    next(error);
  }
};
