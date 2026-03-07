import { Request } from 'express';
import { User } from '@prisma/client';

// ============================================
// Express Extensions
// ============================================

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
}

// ============================================
// Language Types
// ============================================

export type LanguageCode = string;   // ISO 639-1 or ISO 639-3

export type LanguageVariant = string;

export interface TargetLanguage {
  code: LanguageCode;
  variant: LanguageVariant;
}

// ============================================
// CEFR Levels
// ============================================

export type CEFRLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

export interface LevelEstimates {
  grammar: CEFRLevel;
  vocabulary: CEFRLevel;
  fluency: CEFRLevel;
  overall: CEFRLevel;
  confidence: number;
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

export type VoiceArchetype =
  | 'neutral_mirror'
  | 'gentle_friend'
  | 'curious_companion'
  | 'calm_mentor';

export type VoiceIdentity =
  | 'warm_female'
  | 'warm_male'
  | 'energetic_friend'
  | 'calm_mentor_voice';

// ============================================
// Message Analysis
// ============================================

export interface DetectedError {
  type: 'grammar' | 'vocabulary' | 'pronunciation' | 'usage';
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
  complexity: 'simple' | 'moderate' | 'complex';
}

// ============================================
// AI Conversation Types
// ============================================

export interface ConversationContext {
  userId: string;
  conversationId: string;
  mode: 'chat' | 'call';
  goal: LearningGoal;
  language: TargetLanguage;
  scenario?: ScenarioContext;
  userLevels: LevelEstimates;
  memoryContext: string;
  recentMessages: ConversationMessage[];
}

export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

export interface ScenarioContext {
  id: string;
  name: string;
  description: string;
  aiRole: string;
  userRole: string;
  context: string;
}

export interface AIResponse {
  content: string;
  analysis?: MessageAnalysis;
  corrections?: DetectedError[];
  memoryUpdates?: MemoryUpdate[];
  levelAssessment?: Partial<LevelEstimates>;
}

// ============================================
// Memory Types
// ============================================

export interface MemoryUpdate {
  type: 'fact' | 'error' | 'vocabulary' | 'preference';
  action: 'add' | 'update' | 'remove';
  data: Record<string, unknown>;
}

export interface MemoryContext {
  facts: string[];
  recentErrors: string[];
  vocabulary: string[];
  preferences: {
    topics: string[];
    avoidTopics: string[];
    style: string;
    pace: string;
  };
  sessionHistory: string[];
}

// ============================================
// Session Report Types
// ============================================

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
  mistakes: MistakeDetail[];
  newVocabulary: VocabularyItem[];
  suggestions: string[];
  nextSteps: string[];
  recommendedScenarios: string[];
}

export interface MistakeDetail {
  type: string;
  original: string;
  correction: string;
  explanation: string;
  frequency: number;
}

export interface VocabularyItem {
  word: string;
  translation?: string;
  context: string;
  difficulty: CEFRLevel;
}

// ============================================
// Voice Types
// ============================================

export interface TranscriptionResult {
  transcript: string;
  confidence: number;
  words?: WordTiming[];
  isFinal: boolean;
}

export interface WordTiming {
  word: string;
  start: number;
  end: number;
  confidence: number;
}

export interface SpeechSynthesisOptions {
  text: string;
  language: string;
  voiceId?: string;
  speed?: number;
  pitch?: number;
}

// ============================================
// API Response Types
// ============================================

export interface ApiResponse<T = unknown> {
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
  page: number;
  limit: number;
  hasMore: boolean;
}
