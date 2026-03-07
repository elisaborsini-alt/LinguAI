import {create} from 'zustand';
import {persist, createJSONStorage} from 'zustand/middleware';
import {immer} from 'zustand/middleware/immer';

import type {
  ProgressOverview,
  WeeklyProgress,
  DailyStats,
  ErrorPattern,
  CEFRLevel,
  EmotionalState,
} from '@appTypes/domain';
import {storage} from '@data/storage/mmkv';

// Emotion tracking types
export interface EmotionSessionData {
  sessionId: string;
  date: string;
  dominantEmotion: EmotionalState;
  engagementLevel: 'high' | 'medium' | 'low';
  emotionDistribution: Array<{emotion: EmotionalState; percentage: number}>;
  duration: number;
}

export interface EmotionSummary {
  dominantEmotion: EmotionalState;
  engagementLevel: 'high' | 'medium' | 'low';
  trend: 'improving' | 'stable' | 'declining';
  emotionDistribution: Array<{emotion: EmotionalState; percentage: number}>;
  insights: string[];
}

interface ProgressState {
  // Overview data
  overview: ProgressOverview | null;
  weeklyProgress: WeeklyProgress | null;
  dailyStats: DailyStats[];

  // Error patterns for review
  errorPatterns: ErrorPattern[];

  // Vocabulary learned
  vocabulary: string[];

  // Streak tracking
  currentStreak: number;
  lastActivityDate: string | null;

  // Emotion tracking
  emotionSessions: EmotionSessionData[];
  emotionSummary: EmotionSummary | null;

  // Loading states
  isLoadingOverview: boolean;
  isLoadingWeekly: boolean;

  // Actions
  setOverview: (overview: ProgressOverview) => void;
  setWeeklyProgress: (progress: WeeklyProgress) => void;
  setDailyStats: (stats: DailyStats[]) => void;
  addDailyStat: (stat: DailyStats) => void;
  updateTodayStats: (updates: Partial<DailyStats>) => void;

  setErrorPatterns: (patterns: ErrorPattern[]) => void;
  addErrorPattern: (pattern: ErrorPattern) => void;
  markErrorCorrected: (patternId: string) => void;

  addVocabulary: (words: string[]) => void;
  clearVocabulary: () => void;

  updateStreak: () => void;
  resetStreak: () => void;

  // Emotion actions
  addEmotionSession: (session: EmotionSessionData) => void;
  updateEmotionSummary: () => void;
  clearEmotionData: () => void;

  setLoadingOverview: (loading: boolean) => void;
  setLoadingWeekly: (loading: boolean) => void;
}

const zustandStorage = {
  getItem: (name: string) => {
    const value = storage.getString(name);
    return value ?? null;
  },
  setItem: (name: string, value: string) => {
    storage.set(name, value);
  },
  removeItem: (name: string) => {
    storage.delete(name);
  },
};

const getTodayString = (): string => {
  return new Date().toISOString().split('T')[0];
};

export const useProgressStore = create<ProgressState>()(
  persist(
    immer((set, get) => ({
      // Initial state
      overview: null,
      weeklyProgress: null,
      dailyStats: [],
      errorPatterns: [],
      vocabulary: [],
      currentStreak: 0,
      lastActivityDate: null,
      emotionSessions: [],
      emotionSummary: null,
      isLoadingOverview: false,
      isLoadingWeekly: false,

      // Actions
      setOverview: (overview) =>
        set((state) => {
          state.overview = overview;
        }),

      setWeeklyProgress: (progress) =>
        set((state) => {
          state.weeklyProgress = progress;
        }),

      setDailyStats: (stats) =>
        set((state) => {
          state.dailyStats = stats;
        }),

      addDailyStat: (stat) =>
        set((state) => {
          const existingIndex = state.dailyStats.findIndex((s) => s.date === stat.date);
          if (existingIndex !== -1) {
            state.dailyStats[existingIndex] = stat;
          } else {
            state.dailyStats.push(stat);
          }
        }),

      updateTodayStats: (updates) =>
        set((state) => {
          const today = getTodayString();
          const existingIndex = state.dailyStats.findIndex((s) => s.date === today);

          if (existingIndex !== -1) {
            state.dailyStats[existingIndex] = {
              ...state.dailyStats[existingIndex],
              ...updates,
            };
          } else {
            state.dailyStats.push({
              date: today,
              speakingTimeMinutes: 0,
              messagesCount: 0,
              wordsSpoken: 0,
              errorsCount: 0,
              sessionsCount: 0,
              ...updates,
            });
          }
        }),

      setErrorPatterns: (patterns) =>
        set((state) => {
          state.errorPatterns = patterns;
        }),

      addErrorPattern: (pattern) =>
        set((state) => {
          const existingIndex = state.errorPatterns.findIndex(
            (p) => p.pattern === pattern.pattern,
          );
          if (existingIndex !== -1) {
            state.errorPatterns[existingIndex].frequency += 1;
            state.errorPatterns[existingIndex].lastOccurred = new Date();
            state.errorPatterns[existingIndex].examples.push(...pattern.examples);
            // Keep only last 5 examples
            state.errorPatterns[existingIndex].examples =
              state.errorPatterns[existingIndex].examples.slice(-5);
          } else {
            state.errorPatterns.push(pattern);
          }
        }),

      markErrorCorrected: (patternId) =>
        set((state) => {
          const pattern = state.errorPatterns.find((p) => p.id === patternId);
          if (pattern) {
            pattern.corrected = true;
          }
        }),

      addVocabulary: (words) =>
        set((state) => {
          const uniqueWords = words.filter((w) => !state.vocabulary.includes(w));
          state.vocabulary.push(...uniqueWords);
        }),

      clearVocabulary: () =>
        set((state) => {
          state.vocabulary = [];
        }),

      updateStreak: () =>
        set((state) => {
          const today = getTodayString();
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayString = yesterday.toISOString().split('T')[0];

          if (state.lastActivityDate === today) {
            // Already logged today, no change
            return;
          }

          if (state.lastActivityDate === yesterdayString) {
            // Consecutive day
            state.currentStreak += 1;
          } else if (state.lastActivityDate !== today) {
            // Streak broken or first activity
            state.currentStreak = 1;
          }

          state.lastActivityDate = today;
        }),

      resetStreak: () =>
        set((state) => {
          state.currentStreak = 0;
          state.lastActivityDate = null;
        }),

      // Emotion tracking actions
      addEmotionSession: (session) =>
        set((state) => {
          state.emotionSessions.push(session);
          // Keep only last 50 sessions
          if (state.emotionSessions.length > 50) {
            state.emotionSessions = state.emotionSessions.slice(-50);
          }
        }),

      updateEmotionSummary: () =>
        set((state) => {
          if (state.emotionSessions.length === 0) {
            state.emotionSummary = null;
            return;
          }

          // Calculate aggregate emotion distribution
          const emotionCounts: Record<EmotionalState, number> = {
            confident: 0,
            enthusiastic: 0,
            frustrated: 0,
            anxious: 0,
            bored: 0,
            confused: 0,
            tired: 0,
            neutral: 0,
          };

          const recentSessions = state.emotionSessions.slice(-10);
          let totalWeight = 0;

          recentSessions.forEach((session, index) => {
            const weight = index + 1; // More recent = more weight
            totalWeight += weight;
            session.emotionDistribution.forEach((dist) => {
              emotionCounts[dist.emotion] += dist.percentage * weight;
            });
          });

          // Normalize to percentages
          const distribution = Object.entries(emotionCounts)
            .map(([emotion, count]) => ({
              emotion: emotion as EmotionalState,
              percentage: (count / totalWeight) || 0,
            }))
            .filter((d) => d.percentage > 0)
            .sort((a, b) => b.percentage - a.percentage);

          // Find dominant emotion
          const dominantEmotion = distribution[0]?.emotion || 'neutral';

          // Calculate engagement level
          const avgEngagement = recentSessions.reduce((sum, s) => {
            return sum + (s.engagementLevel === 'high' ? 3 : s.engagementLevel === 'medium' ? 2 : 1);
          }, 0) / recentSessions.length;
          const engagementLevel = avgEngagement >= 2.5 ? 'high' : avgEngagement >= 1.5 ? 'medium' : 'low';

          // Calculate trend by comparing first half to second half
          const halfPoint = Math.floor(recentSessions.length / 2);
          const firstHalf = recentSessions.slice(0, halfPoint);
          const secondHalf = recentSessions.slice(halfPoint);

          const firstHalfPositive = firstHalf.filter((s) =>
            ['confident', 'enthusiastic'].includes(s.dominantEmotion),
          ).length;
          const secondHalfPositive = secondHalf.filter((s) =>
            ['confident', 'enthusiastic'].includes(s.dominantEmotion),
          ).length;

          let trend: 'improving' | 'stable' | 'declining' = 'stable';
          if (secondHalfPositive > firstHalfPositive + 1) {
            trend = 'improving';
          } else if (firstHalfPositive > secondHalfPositive + 1) {
            trend = 'declining';
          }

          // Generate insights
          const insights: string[] = [];
          if (emotionCounts.frustrated > 20) {
            insights.push('Consider shorter sessions when feeling challenged');
          }
          if (emotionCounts.confident > 40) {
            insights.push('Your confidence is growing - try harder material!');
          }
          if (emotionCounts.tired > 25) {
            insights.push('Taking breaks can improve retention');
          }
          if (engagementLevel === 'high') {
            insights.push('Great engagement levels - keep up the momentum!');
          }

          state.emotionSummary = {
            dominantEmotion,
            engagementLevel,
            trend,
            emotionDistribution: distribution,
            insights,
          };
        }),

      clearEmotionData: () =>
        set((state) => {
          state.emotionSessions = [];
          state.emotionSummary = null;
        }),

      setLoadingOverview: (loading) =>
        set((state) => {
          state.isLoadingOverview = loading;
        }),

      setLoadingWeekly: (loading) =>
        set((state) => {
          state.isLoadingWeekly = loading;
        }),
    })),
    {
      name: 'progress-storage',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({
        currentStreak: state.currentStreak,
        lastActivityDate: state.lastActivityDate,
        vocabulary: state.vocabulary.slice(-500), // Keep last 500 words
        emotionSessions: state.emotionSessions.slice(-30), // Keep last 30 sessions
      }),
    },
  ),
);

// Selectors
export const selectOverview = (state: ProgressState) => state.overview;
export const selectWeeklyProgress = (state: ProgressState) => state.weeklyProgress;
export const selectDailyStats = (state: ProgressState) => state.dailyStats;
export const selectErrorPatterns = (state: ProgressState) => state.errorPatterns;
export const selectVocabulary = (state: ProgressState) => state.vocabulary;
export const selectCurrentStreak = (state: ProgressState) => state.currentStreak;
export const selectEmotionSessions = (state: ProgressState) => state.emotionSessions;
export const selectEmotionSummary = (state: ProgressState) => state.emotionSummary;
