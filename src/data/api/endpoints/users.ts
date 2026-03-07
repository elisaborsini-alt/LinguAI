import {api} from '../client';
import type {UserProfile, LevelEstimates, LanguageCode, LanguageVariant, LearningGoal} from '@appTypes/domain';

export interface UpdateProfileRequest {
  name?: string;
  nativeLanguage?: string;
  timezone?: string;
  avatarUrl?: string;
}

export interface UpdateLanguageRequest {
  languageCode: LanguageCode;
  languageVariant?: LanguageVariant;
}

export interface UpdatePreferencesRequest {
  currentGoal?: LearningGoal;
  correctionIntensity?: 'minimal' | 'moderate' | 'detailed';
  dailyGoalMinutes?: number;
  notificationsEnabled?: boolean;
}

export interface OnboardingData {
  nativeLanguage: string;
  targetLanguageCode: LanguageCode;
  targetLanguageVariant?: LanguageVariant;
  currentGoal: LearningGoal;
  estimatedLevel?: string;
  correctionIntensity?: 'minimal' | 'moderate' | 'detailed';
  dailyGoalMinutes?: number;
}

export interface LevelResponse {
  grammar: {
    level: string;
    score: number;
  };
  vocabulary: {
    level: string;
    score: number;
  };
  fluency: {
    level: string;
    score: number;
  };
  overall: {
    level: string;
    score: number;
  };
  confidence: number;
  lastAssessedAt: string;
}

export interface StreakResponse {
  currentStreak: number;
  longestStreak: number;
}

export const usersApi = {
  /**
   * Get current user profile
   */
  getProfile: (): Promise<UserProfile> =>
    api.get<UserProfile>('/users/profile'),

  /**
   * Update user profile
   */
  updateProfile: (data: UpdateProfileRequest): Promise<UserProfile> =>
    api.patch<UserProfile>('/users/profile', data),

  /**
   * Update language settings
   */
  updateLanguage: (data: UpdateLanguageRequest): Promise<{
    targetLanguage: {
      code: LanguageCode;
      variant?: LanguageVariant;
    };
    levels: LevelEstimates;
  }> =>
    api.patch('/users/language', data),

  /**
   * Update learning preferences
   */
  updatePreferences: (data: UpdatePreferencesRequest): Promise<{
    currentGoal: LearningGoal;
    correctionIntensity: string;
    dailyGoalMinutes: number;
    notificationsEnabled: boolean;
  }> =>
    api.patch('/users/preferences', data),

  /**
   * Complete onboarding
   */
  completeOnboarding: (data: OnboardingData): Promise<UserProfile> =>
    api.post<UserProfile>('/users/onboarding/complete', data),

  /**
   * Get user's level estimates
   */
  getLevels: (): Promise<LevelResponse> =>
    api.get<LevelResponse>('/users/levels'),

  /**
   * Update streak (called on app open)
   */
  updateStreak: (): Promise<StreakResponse> =>
    api.post<StreakResponse>('/users/streak'),

  /**
   * Delete account
   */
  deleteAccount: (): Promise<{message: string}> =>
    api.delete('/users/account'),
};

export default usersApi;
