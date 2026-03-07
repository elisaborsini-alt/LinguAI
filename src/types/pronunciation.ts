// ============================================
// Pronunciation Practice Types
// ============================================

export type PronunciationDifficulty = 'beginner' | 'intermediate' | 'advanced';

export interface PhraseCategory {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  sortOrder: number;
  phraseCount?: number;
}

export interface PronunciationPhrase {
  id: string;
  text: string;
  phoneticIPA?: string;
  languageCode: string;
  languageVariant?: string;
  categoryId?: string;
  categoryName?: string;
  difficulty: PronunciationDifficulty;
  isCustom: boolean;
  // User progress
  bestScore?: number;
  lastPracticed?: string;
  attemptCount?: number;
}

export interface ReferenceAudio {
  id: string;
  phraseId: string;
  speakerId?: string;
  speakerName?: string;
  speakerGender?: 'male' | 'female';
  audioUrl: string;
  durationMs: number;
  waveformData?: number[];
  pitchContour?: PitchPoint[];
  timingSegments?: TimingSegment[];
}

// ============================================
// Audio Analysis Types
// ============================================

export interface PitchPoint {
  timestamp: number; // ms from start
  frequency: number; // Hz
  confidence: number; // 0-1
}

export interface TimingSegment {
  start: number; // ms
  end: number; // ms
  label?: string; // word or syllable
  type: 'speech' | 'pause';
}

export interface WaveformData {
  amplitudes: number[]; // normalized 0-1
  sampleRate: number;
  durationMs: number;
}

// ============================================
// Analysis & Scoring Types
// ============================================

export interface PronunciationAnalysis {
  overallScore: number; // 0-100
  rhythmScore: number; // 0-100
  pitchScore: number; // 0-100
  clarityScore: number; // 0-100

  // Timing comparison
  userDurationMs: number;
  referenceDurationMs: number;
  durationDifferencePercent: number;

  // Detailed comparisons
  pitchComparison: PitchComparison;
  timingComparison: TimingComparison;
  wordAnalysis: WordAnalysis[];

  // STT result
  transcript: string;
  transcriptConfidence: number;
}

export interface PitchComparison {
  correlationCoefficient: number; // -1 to 1
  avgPitchDifferenceHz: number;
  avgPitchDifferenceSemitones: number;
  userPitchMean: number;
  referencePitchMean: number;
  userPitchVariance: number;
  referencePitchVariance: number;
  // Segments where pitch diverges significantly
  divergentSegments: Array<{
    startMs: number;
    endMs: number;
    difference: number;
  }>;
}

export interface TimingComparison {
  overallAlignmentScore: number; // 0-100
  tempoRatio: number; // user tempo / reference tempo
  // Per-word timing differences
  wordTimings: Array<{
    word: string;
    referenceDurationMs: number;
    userDurationMs: number;
    differenceMs: number;
  }>;
}

export interface WordAnalysis {
  word: string;
  position: number; // word index
  recognized: boolean;
  confidence: number; // 0-1
  pronunciationScore: number; // 0-100
  issues?: string[]; // specific pronunciation issues
}

// ============================================
// Feedback Types
// ============================================

export type FeedbackCategory =
  | 'rhythm_too_fast'
  | 'rhythm_too_slow'
  | 'rhythm_uneven'
  | 'pitch_monotone'
  | 'pitch_exaggerated'
  | 'pitch_wrong_pattern'
  | 'unclear_consonants'
  | 'unclear_vowels'
  | 'stress_incorrect'
  | 'missing_words'
  | 'extra_words'
  | 'general_good'
  | 'general_excellent';

export type FeedbackSeverity = 'minor' | 'moderate' | 'significant';

export interface SpecificFeedback {
  category: FeedbackCategory;
  segment?: string; // word or phrase segment
  message: string;
  severity: FeedbackSeverity;
  suggestion?: string;
}

export interface PronunciationFeedback {
  overallMessage: string;
  specificIssues: SpecificFeedback[];
  encouragement: string;
  focusArea: string;
  nextSteps: string[];
  // Score thresholds for badges
  badges?: PronunciationBadge[];
}

export interface PronunciationBadge {
  type: 'perfect_pitch' | 'rhythm_master' | 'clear_speaker' | 'first_try' | 'improvement';
  label: string;
  icon: string;
}

// ============================================
// Attempt & History Types
// ============================================

export interface PronunciationAttempt {
  id: string;
  userId: string;
  phraseId: string;
  phraseText: string;
  audioUrl: string;
  durationMs: number;
  overallScore: number;
  rhythmScore: number;
  pitchScore: number;
  clarityScore: number;
  transcript?: string;
  feedback: PronunciationFeedback;
  createdAt: string;
}

export interface PronunciationHistory {
  attempts: PronunciationAttempt[];
  totalAttempts: number;
  averageScore: number;
  bestScore: number;
  improvement: number; // score change from first to last
}

export interface PronunciationTrend {
  phraseId: string;
  phraseText: string;
  dataPoints: Array<{
    date: string;
    score: number;
  }>;
  overallTrend: 'improving' | 'stable' | 'declining';
  improvementRate: number; // score improvement per attempt
}

// ============================================
// Session State Types
// ============================================

export type PronunciationSessionState =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'playing_reference'
  | 'recording'
  | 'recorded'
  | 'processing'
  | 'complete'
  | 'error';

export interface PronunciationSession {
  phrase: PronunciationPhrase;
  referenceAudio: ReferenceAudio;
  state: PronunciationSessionState;
  userRecordingUri?: string;
  userWaveform?: number[];
  userPitchContour?: PitchPoint[];
  analysis?: PronunciationAnalysis;
  feedback?: PronunciationFeedback;
  error?: string;
}

// ============================================
// API Types
// ============================================

export interface ListPhrasesParams {
  categoryId?: string;
  languageCode?: string;
  difficulty?: PronunciationDifficulty;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface ListPhrasesResponse {
  phrases: PronunciationPhrase[];
  total: number;
  hasMore: boolean;
}

export interface GetPhraseResponse {
  phrase: PronunciationPhrase;
  reference: ReferenceAudio;
  userBestScore?: number;
  userAttemptCount?: number;
}

export interface AnalyzeRecordingRequest {
  phraseId: string;
  audioFile?: File | Blob;
  audioUri?: string;
  referenceId?: string;
  referenceAudioId?: string;
}

export interface AnalyzeRecordingResponse {
  analysis: PronunciationAnalysis;
  feedback: PronunciationFeedback;
  attempt: PronunciationAttempt;
}

export interface GetHistoryParams {
  phraseId?: string;
  limit?: number;
  offset?: number;
}

export interface GetHistoryResponse {
  attempts: PronunciationAttempt[];
  total: number;
  stats: {
    totalAttempts: number;
    averageScore: number;
    bestScore: number;
    mostPracticedPhraseId?: string;
  };
}

// ============================================
// Type Aliases (used by API endpoints layer)
// ============================================

export type PhrasesListResponse = ListPhrasesResponse;
export type PhraseDetailResponse = GetPhraseResponse;
export type PracticeHistoryResponse = GetHistoryResponse;

// ============================================
// Initial Phrase Categories
// ============================================

export const DEFAULT_CATEGORIES: Omit<PhraseCategory, 'id'>[] = [
  {name: 'Greetings', description: 'Common greetings and farewells', icon: '👋', sortOrder: 1},
  {name: 'Numbers', description: 'Numbers and counting', icon: '🔢', sortOrder: 2},
  {name: 'Colors', description: 'Color names', icon: '🎨', sortOrder: 3},
  {name: 'Common Phrases', description: 'Everyday expressions', icon: '💬', sortOrder: 4},
  {name: 'Questions', description: 'Common question patterns', icon: '❓', sortOrder: 5},
  {name: 'Tongue Twisters', description: 'Challenging pronunciation exercises', icon: '👅', sortOrder: 6},
  {name: 'Business', description: 'Professional vocabulary', icon: '💼', sortOrder: 7},
];

export const SAMPLE_PHRASES: Omit<PronunciationPhrase, 'id'>[] = [
  // Greetings
  {text: 'Hello', phoneticIPA: 'həˈloʊ', languageCode: 'en', languageVariant: 'US', difficulty: 'beginner', isCustom: false},
  {text: 'Good morning', phoneticIPA: 'ɡʊd ˈmɔːrnɪŋ', languageCode: 'en', languageVariant: 'US', difficulty: 'beginner', isCustom: false},
  {text: 'How are you?', phoneticIPA: 'haʊ ɑːr juː', languageCode: 'en', languageVariant: 'US', difficulty: 'beginner', isCustom: false},
  {text: 'Nice to meet you', phoneticIPA: 'naɪs tuː miːt juː', languageCode: 'en', languageVariant: 'US', difficulty: 'beginner', isCustom: false},
  {text: 'See you later', phoneticIPA: 'siː juː ˈleɪtər', languageCode: 'en', languageVariant: 'US', difficulty: 'beginner', isCustom: false},

  // Common Phrases
  {text: 'Thank you very much', phoneticIPA: 'θæŋk juː ˈveri mʌtʃ', languageCode: 'en', languageVariant: 'US', difficulty: 'beginner', isCustom: false},
  {text: 'Excuse me', phoneticIPA: 'ɪkˈskjuːz miː', languageCode: 'en', languageVariant: 'US', difficulty: 'beginner', isCustom: false},
  {text: 'I would like', phoneticIPA: 'aɪ wʊd laɪk', languageCode: 'en', languageVariant: 'US', difficulty: 'intermediate', isCustom: false},
  {text: 'Could you please', phoneticIPA: 'kʊd juː pliːz', languageCode: 'en', languageVariant: 'US', difficulty: 'intermediate', isCustom: false},

  // Tongue Twisters
  {text: 'She sells seashells by the seashore', phoneticIPA: 'ʃiː selz ˈsiːʃelz baɪ ðə ˈsiːʃɔːr', languageCode: 'en', languageVariant: 'US', difficulty: 'advanced', isCustom: false},
  {text: 'Peter Piper picked a peck of pickled peppers', phoneticIPA: 'ˈpiːtər ˈpaɪpər pɪkt ə pek əv ˈpɪkld ˈpepərz', languageCode: 'en', languageVariant: 'US', difficulty: 'advanced', isCustom: false},
  {text: 'How much wood would a woodchuck chuck', phoneticIPA: 'haʊ mʌtʃ wʊd wʊd ə ˈwʊdtʃʌk tʃʌk', languageCode: 'en', languageVariant: 'US', difficulty: 'advanced', isCustom: false},

  // Business
  {text: 'I have a meeting at three', phoneticIPA: 'aɪ hæv ə ˈmiːtɪŋ æt θriː', languageCode: 'en', languageVariant: 'US', difficulty: 'intermediate', isCustom: false},
  {text: 'Let me check my schedule', phoneticIPA: 'let miː tʃek maɪ ˈskedʒuːl', languageCode: 'en', languageVariant: 'US', difficulty: 'intermediate', isCustom: false},
];
