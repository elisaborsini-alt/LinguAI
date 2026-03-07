import prisma from '../../db/client';
import { logger } from '../../utils/logger';

// ============================================
// Types
// ============================================

export interface TimeMachineSnapshot {
  audioUrl: string;
  transcript: string | null;
  cefrLevel: string;
  capturedAt: string;
  label: string;
}

export interface TimeMachineResult {
  early: TimeMachineSnapshot;
  recent: TimeMachineSnapshot;
  message: string;
  weeksBetween: number;
}

// ============================================
// Localized Strings
// ============================================

interface TimeMachineStrings {
  earlyLabel: string;
  recentLabel: string;
  messages: ((weeks: number) => string)[];
}

const TIME_MACHINE_STRINGS: Record<string, TimeMachineStrings> = {
  it: {
    earlyLabel: 'Qualche tempo fa',
    recentLabel: 'Oggi',
    messages: [
      (weeks) =>
        `Questa è la tua voce di ${weeks} settimane fa, e questa è la tua voce oggi. Il cambiamento parla da solo.`,
      () =>
        'Ascolta la differenza. Non servono numeri per notarlo.',
      () =>
        'La fluidità ha una forma diversa ora. Prova ad ascoltare.',
    ],
  },
  en: {
    earlyLabel: 'A while back',
    recentLabel: 'Today',
    messages: [
      (weeks) =>
        `This is your voice from ${weeks} weeks ago, and this is your voice today. The change speaks for itself.`,
      () =>
        'Listen to the difference. No numbers needed to notice it.',
      () =>
        'Fluency has a different shape now. Try listening.',
    ],
  },
  es: {
    earlyLabel: 'Hace un tiempo',
    recentLabel: 'Hoy',
    messages: [
      (weeks) =>
        `Esta es tu voz de hace ${weeks} semanas, y esta es tu voz hoy. El cambio habla por sí solo.`,
      () =>
        'Escucha la diferencia. No hacen falta números para notarlo.',
      () =>
        'La fluidez tiene otra forma ahora. Intenta escuchar.',
    ],
  },
  pt: {
    earlyLabel: 'Um tempo atrás',
    recentLabel: 'Hoje',
    messages: [
      (weeks) =>
        `Esta é a sua voz de ${weeks} semanas atrás, e esta é a sua voz hoje. A mudança fala por si.`,
      () =>
        'Ouça a diferença. Não são necessários números para perceber.',
      () =>
        'A fluência tem outra forma agora. Tente ouvir.',
    ],
  },
  fr: {
    earlyLabel: 'Il y a quelque temps',
    recentLabel: "Aujourd'hui",
    messages: [
      (weeks) =>
        `Voici ta voix d'il y a ${weeks} semaines, et voici ta voix aujourd'hui. Le changement parle de lui-même.`,
      () =>
        'Écoute la différence. Pas besoin de chiffres pour le remarquer.',
      () =>
        "La fluidité a une autre forme maintenant. Essaie d'écouter.",
    ],
  },
  de: {
    earlyLabel: 'Vor einiger Zeit',
    recentLabel: 'Heute',
    messages: [
      (weeks) =>
        `Das ist deine Stimme von vor ${weeks} Wochen, und das ist deine Stimme heute. Die Veränderung spricht für sich.`,
      () =>
        'Hör den Unterschied. Man braucht keine Zahlen, um es zu bemerken.',
      () =>
        'Die Sprachflüssigkeit hat jetzt eine andere Form. Versuch hinzuhören.',
    ],
  },
  ar: {
    earlyLabel: 'منذ فترة',
    recentLabel: 'اليوم',
    messages: [
      (weeks) =>
        `هذا صوتك من ${weeks} أسابيع مضت، وهذا صوتك اليوم. التغيير يتحدث عن نفسه.`,
      () =>
        'استمع إلى الفرق. لا حاجة لأرقام لملاحظته.',
      () =>
        'الطلاقة لها شكل مختلف الآن. حاول أن تستمع.',
    ],
  },
  ru: {
    earlyLabel: 'Некоторое время назад',
    recentLabel: 'Сегодня',
    messages: [
      (weeks) =>
        `Это твой голос ${weeks} недель назад, а это твой голос сегодня. Изменение говорит само за себя.`,
      () =>
        'Послушай разницу. Цифры не нужны, чтобы это заметить.',
      () =>
        'Беглость речи теперь звучит иначе. Попробуй послушать.',
    ],
  },
  ja: {
    earlyLabel: '少し前',
    recentLabel: '今日',
    messages: [
      (weeks) =>
        `これは${weeks}週間前のあなたの声、そしてこれが今日のあなたの声です。変化がすべてを物語っています。`,
      () =>
        '違いを聴いてみてください。数字がなくても気づけるはずです。',
      () =>
        '流暢さの形が変わりました。聴いてみてください。',
    ],
  },
};

function getTimeMachineStrings(lang: string): TimeMachineStrings {
  return TIME_MACHINE_STRINGS[lang] || TIME_MACHINE_STRINGS['en'];
}

// Minimum separation between early and recent snapshots
const MIN_SEPARATION_WEEKS = 4;
const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;

// Recent snapshot must be from within the last 2 weeks
const RECENT_MAX_AGE_WEEKS = 2;

// ============================================
// TimeMachineService
// ============================================

export class TimeMachineService {
  /**
   * Find a "then vs now" comparison pair for the user.
   * Returns null if requirements aren't met (too few snapshots, too close together, etc.)
   */
  async getComparison(userId: string): Promise<TimeMachineResult | null> {
    try {
      // Fetch user's native language
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { nativeLanguage: true, targetLanguageCode: true },
      });

      const lang = user?.nativeLanguage || 'it';
      const targetLang = user?.targetLanguageCode || 'en';
      const t = getTimeMachineStrings(lang);

      // Get all snapshots for the user's target language, ordered by date
      const snapshots = await prisma.voiceSnapshot.findMany({
        where: {
          userId,
          languageCode: targetLang,
        },
        orderBy: { capturedAt: 'asc' },
      });

      if (snapshots.length < 2) return null;

      const early = snapshots[0];
      const recent = snapshots[snapshots.length - 1];

      // Check minimum separation (4+ weeks)
      const separationMs = recent.capturedAt.getTime() - early.capturedAt.getTime();
      if (separationMs < MIN_SEPARATION_WEEKS * MS_PER_WEEK) return null;

      // Recent snapshot must be from the last 2 weeks
      const recentAgeMs = Date.now() - recent.capturedAt.getTime();
      if (recentAgeMs > RECENT_MAX_AGE_WEEKS * MS_PER_WEEK) return null;

      const weeksBetween = Math.round(separationMs / MS_PER_WEEK);

      // Pick a message (deterministic based on snapshot count to avoid randomness)
      const messageIndex = snapshots.length % t.messages.length;
      const message = t.messages[messageIndex](weeksBetween);

      return {
        early: {
          audioUrl: early.audioUrl,
          transcript: early.transcript,
          cefrLevel: early.cefrLevel,
          capturedAt: early.capturedAt.toISOString(),
          label: t.earlyLabel,
        },
        recent: {
          audioUrl: recent.audioUrl,
          transcript: recent.transcript,
          cefrLevel: recent.cefrLevel,
          capturedAt: recent.capturedAt.toISOString(),
          label: t.recentLabel,
        },
        message,
        weeksBetween,
      };
    } catch (error) {
      logger.error('Failed to get time machine comparison:', error);
      return null;
    }
  }
}

// ============================================
// Singleton
// ============================================

let instance: TimeMachineService | null = null;

export function getTimeMachineService(): TimeMachineService {
  if (!instance) {
    instance = new TimeMachineService();
  }
  return instance;
}

export default TimeMachineService;
