import type {
  UserProfile,
  UserPreferences,
  TargetLanguage,
  LearningGoal,
  LevelEstimates,
  Conversation,
  Message,
  UserMemory,
  ProgressOverview,
  WeeklyProgress,
  DailyStats,
  CEFRLevel,
  AIResponse,
} from './domain';

// ============================================
// Auth API Types
// ============================================

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name?: string;
}

export interface AuthResponse {
  user: UserProfile;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

// ============================================
// User API Types
// ============================================

export interface UpdateProfileRequest {
  name?: string;
  avatarUrl?: string;
  nativeLanguage?: string;
  targetLanguage?: TargetLanguage;
  currentGoal?: LearningGoal;
}

export interface UpdatePreferencesRequest extends Partial<UserPreferences> {}

export interface UpdateLevelsRequest {
  grammar?: CEFRLevel;
  vocabulary?: CEFRLevel;
  fluency?: CEFRLevel;
}

export interface CompleteOnboardingRequest {
  nativeLanguage: string;
  targetLanguage: TargetLanguage;
  goal: LearningGoal;
  preferences: UserPreferences;
  initialLevels?: LevelEstimates;
}

// ============================================
// Conversation API Types
// ============================================

export interface CreateConversationRequest {
  mode: 'chat' | 'call';
  goal: LearningGoal;
  scenarioId?: string;
}

export interface CreateConversationResponse {
  conversation: Conversation;
  systemPrompt: string;
  memoryContext: string;
}

export interface SendMessageRequest {
  conversationId: string;
  content: string;
  audioUrl?: string;
}

export interface SendMessageResponse {
  userMessage: Message;
  assistantMessage: Message;
  aiResponse: AIResponse;
}

export interface EndConversationRequest {
  conversationId: string;
}

export interface SessionReportData {
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
}

export interface EndConversationResponse {
  conversationId: string;
  summary: string;
  duration: number;
  messageCount: number;
  report: {
    summary: string;
    duration: number;
    performance: {
      overallScore: number;
      grammarScore: number;
      vocabularyScore: number;
      fluencyScore: number;
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
    vocabulary: {
      newWords: Array<{
        word: string;
        translation?: string;
        context: string;
        level: string;
      }>;
    };
    recommendations: Array<{
      suggestion: string;
    }>;
    nextSteps: string[];
    achievements?: Array<{
      type: string;
      description: string;
    }>;
  } | null;
}

export interface GetConversationHistoryRequest {
  conversationId: string;
  limit?: number;
  offset?: number;
}

export interface GetConversationHistoryResponse {
  messages: Message[];
  hasMore: boolean;
  total: number;
}

export interface ListConversationsRequest {
  limit?: number;
  offset?: number;
  goal?: LearningGoal;
  mode?: 'chat' | 'call';
}

export interface ListConversationsResponse {
  conversations: Conversation[];
  hasMore: boolean;
  total: number;
}

// ============================================
// Memory API Types
// ============================================

export interface GetMemoryResponse {
  memory: UserMemory;
}

export interface UpdateMemoryRequest {
  facts?: {
    add?: Array<{category: string; content: string}>;
    remove?: string[];
  };
  preferences?: {
    preferredTopics?: string[];
    avoidTopics?: string[];
  };
}

export interface ClearMemoryRequest {
  clearFacts?: boolean;
  clearErrors?: boolean;
  clearSessions?: boolean;
}

// ============================================
// Progress API Types
// ============================================

export interface GetProgressOverviewResponse {
  overview: ProgressOverview;
}

export interface GetWeeklyProgressRequest {
  weekStart?: string; // YYYY-MM-DD
}

export interface GetWeeklyProgressResponse {
  progress: WeeklyProgress;
}

export interface GetDailyStatsRequest {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
}

export interface GetDailyStatsResponse {
  stats: DailyStats[];
}

// ============================================
// Voice API Types
// ============================================

export interface TranscribeAudioRequest {
  audioData: string; // Base64 encoded
  language: string;
  format: 'wav' | 'mp3' | 'webm';
}

export interface TranscribeAudioResponse {
  transcript: string;
  confidence: number;
  words?: Array<{
    word: string;
    start: number;
    end: number;
    confidence: number;
  }>;
}

export interface SynthesizeSpeechRequest {
  text: string;
  language: string;
  voiceId: string;
  speed?: number;
}

export interface SynthesizeSpeechResponse {
  audioUrl: string;
  durationMs: number;
}

// ============================================
// Streaming Types
// ============================================

export interface StreamingMessageChunk {
  type: 'content' | 'analysis' | 'correction' | 'done' | 'error';
  content?: string;
  data?: unknown;
  error?: string;
}

// ============================================
// Generic API Types
// ============================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}
