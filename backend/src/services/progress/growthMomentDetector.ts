import prisma from '../../db/client';
import { logger } from '../../utils/logger';
import { EmotionalState } from '../memory/types';

// ============================================
// Types
// ============================================

export interface GrowthMoment {
  type: 'resolved_error' | 'vocabulary_expansion' | 'fluency_gain' | 'level_advancement';
  observation: string;
  dataPoints: {
    before: string;
    after: string;
    timespan: string;
  };
}

// Moods that block growth moment delivery
const BLOCKED_MOODS: EmotionalState[] = ['frustrated', 'anxious', 'tired', 'confused'];

// Minimum completed sessions between growth moments
const MIN_SESSIONS_BETWEEN = 3;

// ============================================
// GrowthMomentDetector
// ============================================

export class GrowthMomentDetector {
  /** Conversations where a growth moment was already delivered this process lifetime */
  private deliveredThisSession = new Set<string>();

  /**
   * Detect a growth moment for the user.
   * Returns null if no moment is available or conditions aren't met.
   */
  async detect(
    userId: string,
    conversationId: string,
    currentMood: EmotionalState,
  ): Promise<GrowthMoment | null> {
    try {
      // Layer 1: Per-session gate
      if (this.deliveredThisSession.has(conversationId)) return null;

      // Layer 2: Emotional gate
      if (BLOCKED_MOODS.includes(currentMood)) return null;

      // Layer 3: Cross-session cooldown
      const userMemory = await prisma.userMemory.findUnique({
        where: { userId },
        select: { id: true, lastGrowthMomentAt: true },
      });

      if (!userMemory) return null;

      if (userMemory.lastGrowthMomentAt) {
        const sessionsSince = await prisma.conversation.count({
          where: {
            userId,
            status: 'completed',
            endedAt: { gt: userMemory.lastGrowthMomentAt },
          },
        });
        if (sessionsSince < MIN_SESSIONS_BETWEEN) return null;
      }

      // Run detection checks in priority order
      const moment =
        (await this.detectResolvedError(userMemory.id)) ||
        (await this.detectVocabularyExpansion(userMemory.id)) ||
        (await this.detectFluencyGain(userId)) ||
        (await this.detectLevelAdvancement(userId));

      if (!moment) return null;

      // Mark as delivered
      this.deliveredThisSession.add(conversationId);
      await prisma.userMemory.update({
        where: { userId },
        data: { lastGrowthMomentAt: new Date() },
      });

      logger.info(`Growth moment detected for user ${userId}: ${moment.type}`);
      return moment;
    } catch (error) {
      logger.error('Error detecting growth moment:', error);
      return null;
    }
  }

  // ============================================
  // Detection Checks
  // ============================================

  /**
   * Priority 1: An error pattern that was frequent is now resolved.
   */
  private async detectResolvedError(memoryId: string): Promise<GrowthMoment | null> {
    const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

    const resolved = await prisma.errorPattern.findFirst({
      where: {
        memoryId,
        corrected: true,
        frequency: { gte: 3 },
        lastOccurredAt: { lt: twoWeeksAgo },
      },
      orderBy: { frequency: 'desc' },
    });

    if (!resolved) return null;

    const weeksAgo = Math.round(
      (Date.now() - resolved.createdAt.getTime()) / (7 * 24 * 60 * 60 * 1000),
    );

    return {
      type: 'resolved_error',
      observation: `The learner used to frequently make errors with "${resolved.pattern}" (${resolved.category}). This error appeared ${resolved.frequency} times but has not appeared in recent sessions.`,
      dataPoints: {
        before: `Frequent errors with: ${resolved.pattern}`,
        after: 'This error no longer appears',
        timespan: `${weeksAgo} weeks ago`,
      },
    };
  }

  /**
   * Priority 2: Significant vocabulary growth in the last 30 days.
   */
  private async detectVocabularyExpansion(memoryId: string): Promise<GrowthMoment | null> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [totalMastered, masteredBefore] = await Promise.all([
      prisma.learnedVocabulary.count({
        where: { memoryId, mastery: { gte: 0.7 } },
      }),
      prisma.learnedVocabulary.count({
        where: { memoryId, mastery: { gte: 0.7 }, learnedAt: { lt: thirtyDaysAgo } },
      }),
    ]);

    const recentGain = totalMastered - masteredBefore;
    if (recentGain < 10) return null;

    // Get an example word from recent mastered vocabulary
    const example = await prisma.learnedVocabulary.findFirst({
      where: { memoryId, mastery: { gte: 0.7 }, learnedAt: { gte: thirtyDaysAgo } },
      orderBy: { mastery: 'desc' },
      select: { word: true },
    });

    return {
      type: 'vocabulary_expansion',
      observation: `The learner has mastered ${recentGain} new words in the last month. Words like "${example?.word || '...'}" are now used naturally.`,
      dataPoints: {
        before: `${masteredBefore} mastered words`,
        after: `${totalMastered} mastered words (+${recentGain})`,
        timespan: 'in the last month',
      },
    };
  }

  /**
   * Priority 3: Fluency score improved by 10+ points.
   */
  private async detectFluencyGain(userId: string): Promise<GrowthMoment | null> {
    const reports = await prisma.sessionReport.findMany({
      where: { conversation: { userId } },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { fluencyScore: true, createdAt: true },
    });

    if (reports.length < 6) return null;

    // Check time span: need at least 2 weeks of data
    const twoWeeksMs = 14 * 24 * 60 * 60 * 1000;
    if (reports[0].createdAt.getTime() - reports[reports.length - 1].createdAt.getTime() < twoWeeksMs) {
      return null;
    }

    const recent = reports.slice(0, 3);
    const early = reports.slice(-3);

    const recentAvg = average(recent.map((r) => r.fluencyScore));
    const earlyAvg = average(early.map((r) => r.fluencyScore));
    const gain = Math.round(recentAvg - earlyAvg);

    if (gain < 10) return null;

    const weeksSpan = Math.round(
      (reports[0].createdAt.getTime() - reports[reports.length - 1].createdAt.getTime()) /
        (7 * 24 * 60 * 60 * 1000),
    );

    return {
      type: 'fluency_gain',
      observation:
        "The learner's fluency has noticeably improved. Sentences flow more naturally, with fewer pauses and hesitations.",
      dataPoints: {
        before: `Fluency score ~${Math.round(earlyAvg)}`,
        after: `Fluency score ~${Math.round(recentAvg)}`,
        timespan: `over the past ${weeksSpan} weeks`,
      },
    };
  }

  /**
   * Priority 4: A CEFR sub-level has advanced a full step.
   */
  private async detectLevelAdvancement(userId: string): Promise<GrowthMoment | null> {
    const levelEstimate = await prisma.levelEstimate.findUnique({
      where: { userId },
      select: {
        id: true,
        grammarLevel: true,
        vocabularyLevel: true,
        fluencyLevel: true,
      },
    });

    if (!levelEstimate) return null;

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const earliest = await prisma.levelHistory.findFirst({
      where: {
        levelEstimateId: levelEstimate.id,
        recordedAt: { lt: thirtyDaysAgo },
      },
      orderBy: { recordedAt: 'asc' },
    });

    if (!earliest) return null;

    const CEFR_ORDER = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
    const skills = [
      { name: 'grammar', old: earliest.grammarLevel, current: levelEstimate.grammarLevel },
      { name: 'vocabulary', old: earliest.vocabularyLevel, current: levelEstimate.vocabularyLevel },
      { name: 'fluency', old: earliest.fluencyLevel, current: levelEstimate.fluencyLevel },
    ];

    for (const skill of skills) {
      const oldIdx = CEFR_ORDER.indexOf(skill.old);
      const newIdx = CEFR_ORDER.indexOf(skill.current);
      if (newIdx > oldIdx && oldIdx >= 0) {
        const weeksAgo = Math.round(
          (Date.now() - earliest.recordedAt.getTime()) / (7 * 24 * 60 * 60 * 1000),
        );

        return {
          type: 'level_advancement',
          observation: `The learner's ${skill.name} has advanced from ${skill.old} to ${skill.current} over the past ${weeksAgo} weeks.`,
          dataPoints: {
            before: `${skill.name}: ${skill.old}`,
            after: `${skill.name}: ${skill.current}`,
            timespan: `over the past ${weeksAgo} weeks`,
          },
        };
      }
    }

    return null;
  }
}

// ============================================
// Helpers
// ============================================

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

// ============================================
// Singleton
// ============================================

let instance: GrowthMomentDetector | null = null;

export function getGrowthMomentDetector(): GrowthMomentDetector {
  if (!instance) {
    instance = new GrowthMomentDetector();
  }
  return instance;
}

export default GrowthMomentDetector;
