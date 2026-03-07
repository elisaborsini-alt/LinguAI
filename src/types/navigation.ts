import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {BottomTabScreenProps} from '@react-navigation/bottom-tabs';
import type {CompositeScreenProps, NavigatorScreenParams} from '@react-navigation/native';

import type {LearningGoal, LanguageCode, TargetLanguage, ScenarioContext} from './domain';
import type {SessionReportData} from './api';

// ============================================
// Auth Stack
// ============================================

export type AuthStackParamList = {
  Welcome: undefined;
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
};

export type AuthStackScreenProps<T extends keyof AuthStackParamList> = NativeStackScreenProps<
  AuthStackParamList,
  T
>;

// ============================================
// Onboarding Stack
// ============================================

export type OnboardingStackParamList = {
  NativeLanguage: undefined;
  TargetLanguage: {nativeLanguage: LanguageCode};
  LanguageVariant: {nativeLanguage: LanguageCode; targetLanguage: LanguageCode};
  GoalSelect: {nativeLanguage: LanguageCode; targetLanguage: TargetLanguage};
  LevelAssessment: {
    nativeLanguage: LanguageCode;
    targetLanguage: TargetLanguage;
    goal: LearningGoal;
  };
  PlacementChat: {
    nativeLanguage: LanguageCode;
    targetLanguage: TargetLanguage;
    goal: LearningGoal;
  };
  Preferences: {
    nativeLanguage: LanguageCode;
    targetLanguage: TargetLanguage;
    goal: LearningGoal;
  };
  OnboardingComplete: undefined;
};

export type OnboardingStackScreenProps<T extends keyof OnboardingStackParamList> =
  NativeStackScreenProps<OnboardingStackParamList, T>;

// ============================================
// Main Tab Navigator
// ============================================

export type MainTabParamList = {
  HomeTab: NavigatorScreenParams<HomeStackParamList>;
  ConversationTab: NavigatorScreenParams<ConversationStackParamList>;
  ProgressTab: NavigatorScreenParams<ProgressStackParamList>;
  SettingsTab: NavigatorScreenParams<SettingsStackParamList>;
};

export type MainTabScreenProps<T extends keyof MainTabParamList> = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, T>,
  NativeStackScreenProps<RootStackParamList>
>;

// ============================================
// Home Stack
// ============================================

export type HomeStackParamList = {
  Home: undefined;
  QuickStart: {scenario?: ScenarioContext};
  DailyChallenge: undefined;
};

export type HomeStackScreenProps<T extends keyof HomeStackParamList> = CompositeScreenProps<
  NativeStackScreenProps<HomeStackParamList, T>,
  MainTabScreenProps<'HomeTab'>
>;

// ============================================
// Conversation Stack
// ============================================

export type ConversationStackParamList = {
  ConversationHome: undefined;
  ScenarioSelect: {goal?: LearningGoal};
  Chat: {
    conversationId?: string;
    scenario?: ScenarioContext;
  };
  Call: {
    conversationId?: string;
    scenario?: ScenarioContext;
  };
  SessionSummary: {
    conversationId: string;
    report?: SessionReportData;
  };
  // Pronunciation Practice
  PronunciationPractice: undefined;
  PronunciationSession: {
    phraseId: string;
    categoryId?: string;
  };
  PronunciationResults: {
    sessionId: string;
    phraseId: string;
    recordingUri: string;
  };
  PronunciationHistory: {
    phraseId?: string;
  };
};

export type ConversationStackScreenProps<T extends keyof ConversationStackParamList> =
  CompositeScreenProps<
    NativeStackScreenProps<ConversationStackParamList, T>,
    MainTabScreenProps<'ConversationTab'>
  >;

// ============================================
// Progress Stack
// ============================================

export type ProgressStackParamList = {
  ProgressDashboard: undefined;
  SessionReport: {
    conversationId: string;
    report?: {
      summary: string;
      duration: number;
      scores: {
        overall: number;
        fluency: number;
        accuracy: number;
        vocabulary: number;
      };
      strengths: string[];
      areasToImprove: string[];
      mistakes: Array<{
        type: string;
        original: string;
        correction: string;
        explanation: string;
        frequency: number;
      }>;
      newVocabulary: Array<{
        word: string;
        translation?: string;
        context: string;
        difficulty: string;
      }>;
      suggestions: string[];
      nextSteps: string[];
      achievements?: Array<{
        type: string;
        description: string;
      }>;
    };
  };
  DetailedStats: undefined;
  ErrorPatterns: undefined;
  VocabularyList: undefined;
  LevelHistory: undefined;
  TimeMachine: {data?: unknown} | undefined;
};

export type ProgressStackScreenProps<T extends keyof ProgressStackParamList> = CompositeScreenProps<
  NativeStackScreenProps<ProgressStackParamList, T>,
  MainTabScreenProps<'ProgressTab'>
>;

// ============================================
// Settings Stack
// ============================================

export type SettingsStackParamList = {
  Settings: undefined;
  Profile: undefined;
  LanguageSettings: undefined;
  VoiceSettings: undefined;
  NotificationSettings: undefined;
  PrivacySettings: undefined;
  About: undefined;
};

export type SettingsStackScreenProps<T extends keyof SettingsStackParamList> = CompositeScreenProps<
  NativeStackScreenProps<SettingsStackParamList, T>,
  MainTabScreenProps<'SettingsTab'>
>;

// ============================================
// Root Stack
// ============================================

export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Onboarding: NavigatorScreenParams<OnboardingStackParamList>;
  Main: NavigatorScreenParams<MainTabParamList>;
};

export type RootStackScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<
  RootStackParamList,
  T
>;

// ============================================
// Declaration Merging for useNavigation
// ============================================

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
