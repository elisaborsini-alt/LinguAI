import prisma from '../../db/client';
import { logger } from '../../utils/logger';

// ============================================
// Types
// ============================================

export interface ProgressSummary {
  hasEnoughData: boolean;
  trend?: 'improving' | 'stable' | 'declining';
  delta?: number;
  topStrength?: string;
  topWeakness?: string;
  suggestedFocus?: string;
  sessionsCompleted?: number;
  lastSessionDate?: Date;
}

// ============================================
// ProgressService
// ============================================

export class ProgressService {
  /**
   * Compute a retention-oriented progress summary from the last N session reports.
   * Pure DB queries + math — no AI calls.
   */
  async getProgressSummary(userId: string): Promise<ProgressSummary> {
    const reports = await prisma.sessionReport.findMany({
      where: { conversation: { userId } },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    if (reports.length < 2) {
      return { hasEnoughData: false };
    }

    // --- Trend ---
    const recent = reports.slice(0, 2);
    const older = reports.slice(2);
    const recentAvg = safeAvg(recent, 'accuracyScore');
    const olderAvg = older.length > 0
      ? safeAvg(older, 'accuracyScore')
      : Number(recent[1]?.accuracyScore || 0);
    const deltaRaw = recentAvg - olderAvg;
    const delta = Math.round(deltaRaw);

    let trend: 'improving' | 'stable' | 'declining';
    if (delta > 3) {
      trend = 'improving';
    } else if (delta < -3) {
      trend = 'declining';
    } else {
      trend = 'stable';
    }

    // --- Top Weakness (most frequent mistake category) ---
    const topWeakness = mostFrequentMistakeType(reports) || 'Keep practicing';

    // --- Top Strength (most recurring strength across sessions) ---
    const topStrength = mostFrequentItem(
      reports.flatMap(r => r.strengths || []),
    ) || 'Consistent practice';

    // --- Suggested Focus ---
    const suggestedFocus =
      reports[0].areasToImprove?.[0] || `Focus on ${topWeakness}`;

    return {
      hasEnoughData: true,
      trend,
      delta,
      topStrength,
      topWeakness,
      suggestedFocus,
      sessionsCompleted: reports.length,
      lastSessionDate: reports[0].createdAt,
    };
  }
}

// ============================================
// Helpers
// ============================================

function safeAvg(arr: Array<Record<string, any>>, key: string): number {
  if (!arr.length) return 0;
  const sum = arr.reduce((acc, r) => acc + (Number(r[key]) || 0), 0);
  return sum / arr.length;
}

/** Find the most frequently occurring `type` across all mistake Json arrays. */
function mostFrequentMistakeType(
  reports: Array<{ mistakes: any }>,
): string | null {
  const counts = new Map<string, number>();

  for (const r of reports) {
    const mistakes = Array.isArray(r.mistakes) ? r.mistakes : [];
    for (const m of mistakes) {
      const type = (m as any).type;
      if (type) {
        counts.set(type, (counts.get(type) || 0) + 1);
      }
    }
  }

  if (counts.size === 0) return null;

  let top = '';
  let max = 0;
  for (const [type, count] of counts) {
    if (count > max) {
      top = type;
      max = count;
    }
  }
  return top;
}

/** Find the most frequently occurring string in a list. */
function mostFrequentItem(items: string[]): string | null {
  if (items.length === 0) return null;

  const counts = new Map<string, number>();
  for (const item of items) {
    counts.set(item, (counts.get(item) || 0) + 1);
  }

  let top = '';
  let max = 0;
  for (const [item, count] of counts) {
    if (count > max) {
      top = item;
      max = count;
    }
  }
  return top;
}

// ============================================
// Singleton
// ============================================

let instance: ProgressService | null = null;

export function getProgressService(): ProgressService {
  if (!instance) {
    instance = new ProgressService();
  }
  return instance;
}

export default ProgressService;
