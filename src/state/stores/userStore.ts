import {create} from 'zustand';
import {persist, createJSONStorage} from 'zustand/middleware';
import {immer} from 'zustand/middleware/immer';

import type {
  UserProfile,
  UserPreferences,
  LevelEstimates,
  TargetLanguage,
  LearningGoal,
  LanguageCode,
} from '@appTypes/domain';
import {storage} from '@data/storage/mmkv';

interface UserState {
  // Onboarding state
  onboardingData: {
    nativeLanguage?: LanguageCode;
    targetLanguage?: TargetLanguage;
    goal?: LearningGoal;
    preferences?: Partial<UserPreferences>;
  };
  onboardingStep: number;

  // User data
  profile: UserProfile | null;
  preferences: UserPreferences | null;
  levels: LevelEstimates | null;

  // Actions
  setOnboardingData: (data: Partial<UserState['onboardingData']>) => void;
  setOnboardingStep: (step: number) => void;
  resetOnboarding: () => void;

  setProfile: (profile: UserProfile | null) => void;
  updateProfile: (updates: Partial<UserProfile>) => void;

  setPreferences: (preferences: UserPreferences) => void;
  updatePreferences: (updates: Partial<UserPreferences>) => void;

  setLevels: (levels: LevelEstimates) => void;
  updateLevels: (updates: Partial<LevelEstimates>) => void;
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

const defaultPreferences: UserPreferences = {
  correctionIntensity: 'moderate',
  speakingSpeed: 'normal',
  voiceGender: 'female',
  sessionLengthMinutes: 15,
  notificationsEnabled: true,
  hapticFeedback: true,
};

export const useUserStore = create<UserState>()(
  persist(
    immer((set) => ({
      // Initial state
      onboardingData: {},
      onboardingStep: 0,
      profile: null,
      preferences: null,
      levels: null,

      // Onboarding actions
      setOnboardingData: (data) =>
        set((state) => {
          state.onboardingData = {...state.onboardingData, ...data};
        }),

      setOnboardingStep: (step) =>
        set((state) => {
          state.onboardingStep = step;
        }),

      resetOnboarding: () =>
        set((state) => {
          state.onboardingData = {};
          state.onboardingStep = 0;
        }),

      // Profile actions
      setProfile: (profile) =>
        set((state) => {
          state.profile = profile;
          if (profile) {
            state.preferences = profile.preferences;
            state.levels = profile.estimatedLevels;
          }
        }),

      updateProfile: (updates) =>
        set((state) => {
          if (state.profile) {
            state.profile = {...state.profile, ...updates};
          }
        }),

      // Preferences actions
      setPreferences: (preferences) =>
        set((state) => {
          state.preferences = preferences;
        }),

      updatePreferences: (updates) =>
        set((state) => {
          state.preferences = {
            ...(state.preferences || defaultPreferences),
            ...updates,
          };
        }),

      // Levels actions
      setLevels: (levels) =>
        set((state) => {
          state.levels = levels;
        }),

      updateLevels: (updates) =>
        set((state) => {
          if (state.levels) {
            state.levels = {...state.levels, ...updates, lastUpdated: new Date()};
          }
        }),
    })),
    {
      name: 'user-storage',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({
        onboardingData: state.onboardingData,
        onboardingStep: state.onboardingStep,
        preferences: state.preferences,
      }),
    },
  ),
);

// Selectors
export const selectProfile = (state: UserState) => state.profile;
export const selectPreferences = (state: UserState) => state.preferences;
export const selectLevels = (state: UserState) => state.levels;
export const selectOnboardingData = (state: UserState) => state.onboardingData;
export const selectOnboardingStep = (state: UserState) => state.onboardingStep;
