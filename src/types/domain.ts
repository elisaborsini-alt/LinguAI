// ============================================
// Language Types
// ============================================

export type LanguageCode = string;   // ISO 639-1 or ISO 639-3

export type LanguageVariant = string;

export interface TargetLanguage {
  code: LanguageCode;
  variant: LanguageVariant;
}

export interface LanguageConfig {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
  rtl?: boolean;
  variants: {
    code: string;
    name: string;
    flag: string;
    locale: string;
  }[];
  defaultVariant: string;
}

// ============================================
// Learning Goals
// ============================================

export type LearningGoal =
  | 'professional'
  | 'travel'
  | 'conversation'
  | 'interviews'
  | 'customer_support'
  | 'social';

export interface GoalConfig {
  id: LearningGoal;
  name: string;
  description: string;
  icon: string;
  scenarios: ScenarioTemplate[];
  toneGuidelines: string;
  vocabularyFocus: string[];
}

export interface ScenarioTemplate {
  id: string;
  name: string;
  description: string;
  aiRole: string;
  userRole: string;
  context: string;
  difficulty: CEFRLevel;
}

// ============================================
// User Types
// ============================================

export type CEFRLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

export interface LevelEstimates {
  grammar: CEFRLevel;
  vocabulary: CEFRLevel;
  fluency: CEFRLevel;
  overall: CEFRLevel;
  confidence: number; // 0-1, increases with more data
  lastUpdated: Date;
}

export interface UserPreferences {
  correctionIntensity: 'minimal' | 'moderate' | 'detailed';
  speakingSpeed: 'slow' | 'normal' | 'fast';
  voiceGender: 'male' | 'female';
  sessionLengthMinutes: number;
  notificationsEnabled: boolean;
  hapticFeedback: boolean;
}

export interface UserProfile {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string;
  nativeLanguage: LanguageCode;
  targetLanguage: TargetLanguage;
  currentGoal: LearningGoal;
  preferences: UserPreferences;
  estimatedLevels: LevelEstimates;
  onboardingCompleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// Memory Types
// ============================================

export type MemoryFactCategory =
  | 'personal'
  | 'work'
  | 'preference'
  | 'goal'
  | 'context'
  | 'hobby';

export interface MemoryFact {
  id: string;
  category: MemoryFactCategory;
  content: string;
  confidence: number; // 0-1
  createdAt: Date;
  lastReferencedAt: Date;
}

export type ErrorCategory = 'grammar' | 'vocabulary' | 'pronunciation' | 'usage';

export interface ErrorPattern {
  id: string;
  category: ErrorCategory;
  pattern: string;
  examples: string[];
  frequency: number;
  lastOccurred: Date;
  corrected: boolean;
}

export interface SessionSummary {
  sessionId: string;
  date: Date;
  durationMinutes: number;
  goal: LearningGoal;
  topicsDiscussed: string[];
  keyMistakes: string[];
  improvements: string[];
  vocabularyIntroduced: string[];
}

export interface InferredPreferences {
  preferredTopics: string[];
  avoidTopics: string[];
  responseStylePreference: 'formal' | 'casual' | 'mixed';
  pacePreference: 'slow' | 'moderate' | 'fast';
}

export interface UserMemory {
  userId: string;
  languageCode: LanguageCode;
  facts: MemoryFact[];
  recurringErrors: ErrorPattern[];
  sessionSummaries: SessionSummary[];
  inferredPreferences: InferredPreferences;
  updatedAt: Date;
}

// ============================================
// Conversation Types
// ============================================

export type ConversationMode = 'chat' | 'call';

export interface ScenarioContext {
  id: string;
  type: string;
  description: string;
  aiRole: string;
  userRole: string;
}

export interface Conversation {
  id: string;
  userId: string;
  mode: ConversationMode;
  goal: LearningGoal;
  language: TargetLanguage;
  scenario?: ScenarioContext;
  startedAt: Date;
  endedAt?: Date;
  metrics: ConversationMetrics;
}

export interface ConversationMetrics {
  totalMessages: number;
  userSpeakingTimeSeconds: number;
  wordsSpoken: number;
  uniqueWords: number;
  errorsDetected: number;
  errorsCorrected: number;
  averageResponseTimeMs: number;
}

export type MessageRole = 'user' | 'assistant' | 'system';

export interface DetectedError {
  type: ErrorCategory;
  original: string;
  correction: string;
  explanation: string;
  severity: 'minor' | 'moderate' | 'significant';
}

export interface MessageAnalysis {
  errors: DetectedError[];
  vocabularyLevel: CEFRLevel;
  grammarLevel: CEFRLevel;
  fluencyScore: number; // 0-100
  sentiment: 'positive' | 'neutral' | 'frustrated';
  wordCount: number;
  uniqueWords: string[];
}

export type EmotionalState =
  | 'confident'
  | 'enthusiastic'
  | 'frustrated'
  | 'anxious'
  | 'bored'
  | 'confused'
  | 'tired'
  | 'neutral';

export interface Message {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  audioUrl?: string;
  analysis?: MessageAnalysis;
  corrections?: DetectedError[];
  timestamp: Date;
  // Emotion tracking
  emotionDetected?: EmotionalState;
  emotionConfidence?: number;
}

// ============================================
// Progress Types
// ============================================

export interface DailyStats {
  date: string; // YYYY-MM-DD
  speakingTimeMinutes: number;
  messagesCount: number;
  wordsSpoken: number;
  errorsCount: number;
  sessionsCount: number;
}

export interface WeeklyProgress {
  weekStart: string;
  dailyStats: DailyStats[];
  levelChanges: {
    grammar: { from: CEFRLevel; to: CEFRLevel } | null;
    vocabulary: { from: CEFRLevel; to: CEFRLevel } | null;
    fluency: { from: CEFRLevel; to: CEFRLevel } | null;
  };
  topErrors: ErrorPattern[];
  newVocabulary: string[];
  streak: number;
}

export interface ProgressOverview {
  totalSpeakingTimeMinutes: number;
  totalSessions: number;
  totalWords: number;
  currentStreak: number;
  longestStreak: number;
  levelHistory: {
    date: Date;
    levels: LevelEstimates;
  }[];
  strengths: string[];
  weaknesses: string[];
  suggestedFocus: string[];
}

// ============================================
// Voice Types
// ============================================

export type VoiceState =
  | 'idle'
  | 'listening'
  | 'processing'
  | 'speaking'
  | 'error';

export interface VoiceConfig {
  language: string;
  voiceId: string;
  speed: number; // 0.5 - 2.0
  pitch: number; // 0.5 - 2.0
}

export interface SpeechRecognitionResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
}

// ============================================
// API Response Types
// ============================================

export interface AIResponse {
  content: string;
  analysis?: MessageAnalysis;
  corrections?: DetectedError[];
  memoryUpdates?: Partial<UserMemory>;
  suggestedFollowUp?: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}
