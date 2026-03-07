import prisma from '../../db/client';

// ============================================
// Types
// ============================================

export interface MomentumInsight {
  type: 'resolved_weakness' | 'new_strength' | 'accuracy_gain' | 'consistency';
  message: string;
}

// ============================================
// MomentumService
// ============================================

export class MomentumService {
  /**
   * Detect a meaningful improvement over time.
   * Returns a single reflective insight or null if none found.
   *
   * Requirements:
   * - At least 5 reports spanning 2+ weeks
   * - Detectable change in one of: weakness resolved, new strength, accuracy gain, consistency
   * - Priority: resolved weakness > new strength > accuracy gain > consistency
   */
  async detectInsight(userId: string): Promise<MomentumInsight | null> {
    // Fetch user's native language for message generation
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { nativeLanguage: true },
    });
    const lang = user?.nativeLanguage || 'it';
    const t = getMomentumStrings(lang);

    const reports = await prisma.sessionReport.findMany({
      where: { conversation: { userId } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    if (reports.length < 5) return null;

    // Check time span: oldest report must be 2+ weeks before newest
    const newest = reports[0].createdAt;
    const oldest = reports[reports.length - 1].createdAt;
    const twoWeeksMs = 14 * 24 * 60 * 60 * 1000;
    if (newest.getTime() - oldest.getTime() < twoWeeksMs) return null;

    // Split into recent (last 3) and early (oldest 3+)
    const recent = reports.slice(0, 3);
    const early = reports.slice(-3);

    // --- Priority 1: Resolved weakness ---
    const resolvedWeakness = detectResolvedWeakness(early, recent, t);
    if (resolvedWeakness) {
      return {
        type: 'resolved_weakness',
        message: resolvedWeakness,
      };
    }

    // --- Priority 2: New strength ---
    const newStrength = detectNewStrength(early, recent, t);
    if (newStrength) {
      return {
        type: 'new_strength',
        message: newStrength,
      };
    }

    // --- Priority 3: Accuracy gain ---
    const accuracyGain = detectAccuracyGain(early, recent, t);
    if (accuracyGain) {
      return {
        type: 'accuracy_gain',
        message: accuracyGain,
      };
    }

    // --- Priority 4: Consistency ---
    const consistency = detectConsistency(reports, t);
    if (consistency) {
      return {
        type: 'consistency',
        message: consistency,
      };
    }

    return null;
  }
}

// ============================================
// Localized Momentum Strings
// ============================================

interface MomentumStrings {
  resolvedWeakness: (weakness: string) => string;
  resolvedMistakeType: (type: string) => string;
  newStrength: (strength: string) => string;
  accuracyGain: (gain: number) => string;
  consistency: (weeks: number) => string;
}

const MOMENTUM_STRINGS: Record<string, MomentumStrings> = {
  it: {
    resolvedWeakness: (weakness) =>
      `Qualche settimana fa "${weakness}" compariva spesso. Nelle ultime sessioni non è più apparso.`,
    resolvedMistakeType: (type) =>
      `Gli errori di tipo "${type}" erano frequenti nelle prime sessioni. Ora non compaiono più.`,
    newStrength: (strength) =>
      `"${strength}" ora appare costantemente. All'inizio non era presente.`,
    accuracyGain: (gain) =>
      `La precisione è cambiata di ${gain} punti rispetto alle prime sessioni.`,
    consistency: (weeks) =>
      `Hai praticato in ${weeks} settimane diverse. Questa continuità parla da sola.`,
  },
  en: {
    resolvedWeakness: (weakness) =>
      `A few weeks ago "${weakness}" came up often. It no longer appears in recent sessions.`,
    resolvedMistakeType: (type) =>
      `Errors of type "${type}" were frequent in early sessions. They no longer appear.`,
    newStrength: (strength) =>
      `"${strength}" now appears consistently. It was not present at the beginning.`,
    accuracyGain: (gain) =>
      `Accuracy has shifted by ${gain} points compared to early sessions.`,
    consistency: (weeks) =>
      `You have practiced across ${weeks} different weeks. That continuity speaks for itself.`,
  },
  es: {
    resolvedWeakness: (weakness) =>
      `Hace unas semanas "${weakness}" aparecía a menudo. En las últimas sesiones ya no aparece.`,
    resolvedMistakeType: (type) =>
      `Los errores de tipo "${type}" eran frecuentes en las primeras sesiones. Ya no aparecen.`,
    newStrength: (strength) =>
      `"${strength}" ahora aparece de forma constante. Al principio no estaba presente.`,
    accuracyGain: (gain) =>
      `La precisión ha cambiado en ${gain} puntos respecto a las primeras sesiones.`,
    consistency: (weeks) =>
      `Has practicado durante ${weeks} semanas diferentes. Esa continuidad habla por sí sola.`,
  },
  pt: {
    resolvedWeakness: (weakness) =>
      `Algumas semanas atrás "${weakness}" aparecia com frequência. Nas últimas sessões, não apareceu mais.`,
    resolvedMistakeType: (type) =>
      `Erros do tipo "${type}" eram frequentes nas primeiras sessões. Agora não aparecem mais.`,
    newStrength: (strength) =>
      `"${strength}" agora aparece de forma consistente. No início não estava presente.`,
    accuracyGain: (gain) =>
      `A precisão mudou em ${gain} pontos em relação às primeiras sessões.`,
    consistency: (weeks) =>
      `Você praticou em ${weeks} semanas diferentes. Essa continuidade fala por si.`,
  },
  fr: {
    resolvedWeakness: (weakness) =>
      `Il y a quelques semaines, "${weakness}" revenait souvent. Dans les dernières sessions, il n'apparaît plus.`,
    resolvedMistakeType: (type) =>
      `Les erreurs de type "${type}" étaient fréquentes au début. Elles n'apparaissent plus.`,
    newStrength: (strength) =>
      `"${strength}" apparaît maintenant de façon régulière. Au début, ce n'était pas le cas.`,
    accuracyGain: (gain) =>
      `La précision a changé de ${gain} points par rapport aux premières sessions.`,
    consistency: (weeks) =>
      `Tu as pratiqué pendant ${weeks} semaines différentes. Cette régularité parle d'elle-même.`,
  },
  de: {
    resolvedWeakness: (weakness) =>
      `Vor einigen Wochen tauchte "${weakness}" häufig auf. In den letzten Sitzungen ist es nicht mehr erschienen.`,
    resolvedMistakeType: (type) =>
      `Fehler vom Typ "${type}" waren in den ersten Sitzungen häufig. Sie treten nicht mehr auf.`,
    newStrength: (strength) =>
      `"${strength}" taucht jetzt regelmäßig auf. Am Anfang war das nicht so.`,
    accuracyGain: (gain) =>
      `Die Genauigkeit hat sich um ${gain} Punkte im Vergleich zu den ersten Sitzungen verändert.`,
    consistency: (weeks) =>
      `Du hast in ${weeks} verschiedenen Wochen geübt. Diese Beständigkeit spricht für sich.`,
  },
  ar: {
    resolvedWeakness: (weakness) =>
      `قبل بضعة أسابيع، كان "${weakness}" يظهر كثيرًا. في الجلسات الأخيرة لم يعد يظهر.`,
    resolvedMistakeType: (type) =>
      `كانت أخطاء من نوع "${type}" متكررة في الجلسات الأولى. لم تعد تظهر الآن.`,
    newStrength: (strength) =>
      `"${strength}" يظهر الآن بشكل مستمر. في البداية لم يكن موجودًا.`,
    accuracyGain: (gain) =>
      `تغيرت الدقة بمقدار ${gain} نقطة مقارنة بالجلسات الأولى.`,
    consistency: (weeks) =>
      `لقد تدربت خلال ${weeks} أسابيع مختلفة. هذا الاستمرار يتحدث عن نفسه.`,
  },
  ru: {
    resolvedWeakness: (weakness) =>
      `Несколько недель назад "${weakness}" появлялось часто. В последних сессиях это больше не встречается.`,
    resolvedMistakeType: (type) =>
      `Ошибки типа "${type}" были частыми в первых сессиях. Теперь они больше не появляются.`,
    newStrength: (strength) =>
      `"${strength}" теперь появляется постоянно. В начале этого не было.`,
    accuracyGain: (gain) =>
      `Точность изменилась на ${gain} пунктов по сравнению с первыми сессиями.`,
    consistency: (weeks) =>
      `Ты практиковался в течение ${weeks} разных недель. Эта последовательность говорит сама за себя.`,
  },
  ja: {
    resolvedWeakness: (weakness) =>
      `数週間前は「${weakness}」がよく出ていました。最近のセッションではもう現れていません。`,
    resolvedMistakeType: (type) =>
      `「${type}」タイプのエラーは最初のセッションでは頻繁でした。今はもう現れません。`,
    newStrength: (strength) =>
      `「${strength}」が安定して現れるようになりました。最初はなかったものです。`,
    accuracyGain: (gain) =>
      `最初のセッションと比べて、正確さが${gain}ポイント変化しました。`,
    consistency: (weeks) =>
      `${weeks}つの異なる週にわたって練習しました。この継続性が物語っています。`,
  },
};

function getMomentumStrings(lang: string): MomentumStrings {
  return MOMENTUM_STRINGS[lang] || MOMENTUM_STRINGS['en'];
}

// ============================================
// Detection Helpers
// ============================================

type ReportSlice = Array<{
  accuracyScore: number;
  strengths: string[];
  areasToImprove: string[];
  mistakes: unknown;
  createdAt: Date;
}>;

/**
 * Detect if a weakness that appeared frequently in early sessions
 * no longer appears in recent sessions.
 */
function detectResolvedWeakness(
  early: ReportSlice,
  recent: ReportSlice,
  t: MomentumStrings,
): string | null {
  const earlyWeaknesses = countItems(early.flatMap(r => r.areasToImprove || []));
  const recentWeaknesses = new Set(recent.flatMap(r => r.areasToImprove || []));

  for (const [weakness, count] of earlyWeaknesses) {
    if (count >= 2 && !recentWeaknesses.has(weakness)) {
      return t.resolvedWeakness(weakness);
    }
  }

  // Also check mistake types
  const earlyMistakeTypes = countItems(extractMistakeTypes(early));
  const recentMistakeTypes = new Set(extractMistakeTypes(recent));

  for (const [type, count] of earlyMistakeTypes) {
    if (count >= 3 && !recentMistakeTypes.has(type)) {
      return t.resolvedMistakeType(type);
    }
  }

  return null;
}

/**
 * Detect a strength that appears consistently in recent sessions
 * but was absent in early sessions.
 */
function detectNewStrength(
  early: ReportSlice,
  recent: ReportSlice,
  t: MomentumStrings,
): string | null {
  const earlyStrengths = new Set(early.flatMap(r => r.strengths || []));
  const recentStrengthCounts = countItems(recent.flatMap(r => r.strengths || []));

  for (const [strength, count] of recentStrengthCounts) {
    if (count >= 2 && !earlyStrengths.has(strength)) {
      return t.newStrength(strength);
    }
  }

  return null;
}

/**
 * Detect a meaningful accuracy improvement (10+ points) between
 * early and recent sessions.
 */
function detectAccuracyGain(
  early: ReportSlice,
  recent: ReportSlice,
  t: MomentumStrings,
): string | null {
  const earlyAvg = safeAvg(early.map(r => r.accuracyScore));
  const recentAvg = safeAvg(recent.map(r => r.accuracyScore));
  const gain = Math.round(recentAvg - earlyAvg);

  if (gain >= 10) {
    return t.accuracyGain(gain);
  }

  return null;
}

/**
 * Detect consistent practice: sessions in at least 3 distinct weeks.
 */
function detectConsistency(reports: ReportSlice, t: MomentumStrings): string | null {
  const weeks = new Set(
    reports.map(r => {
      const d = new Date(r.createdAt);
      const yearWeek = `${d.getFullYear()}-W${getWeekNumber(d)}`;
      return yearWeek;
    }),
  );

  if (weeks.size >= 4) {
    return t.consistency(weeks.size);
  }

  return null;
}

// ============================================
// Utility Helpers
// ============================================

function countItems(items: string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const item of items) {
    if (item) {
      counts.set(item, (counts.get(item) || 0) + 1);
    }
  }
  return counts;
}

function extractMistakeTypes(reports: ReportSlice): string[] {
  const types: string[] = [];
  for (const r of reports) {
    const mistakes = Array.isArray(r.mistakes) ? r.mistakes : [];
    for (const m of mistakes) {
      const type = (m as Record<string, unknown>).type;
      if (typeof type === 'string') {
        types.push(type);
      }
    }
  }
  return types;
}

function safeAvg(values: number[]): number {
  const valid = values.filter(v => typeof v === 'number' && !isNaN(v));
  if (valid.length === 0) return 0;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
}

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

// ============================================
// Singleton
// ============================================

let instance: MomentumService | null = null;

export function getMomentumService(): MomentumService {
  if (!instance) {
    instance = new MomentumService();
  }
  return instance;
}

export default MomentumService;
