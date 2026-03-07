// ============================================
// Conversational Memory & Adaptation Types
// Core differentiator vs Praktika.ai
// ============================================

// ============================================
// Short-Term Memory (Current Session)
// ============================================

export interface ShortTermMemory {
  sessionId: string;
  startedAt: Date;

  // Real-time conversation buffer
  recentMessages: SessionMessage[];

  // Live performance tracking
  currentPerformance: SessionPerformance;

  // Emotional state tracking
  emotionalTrajectory: EmotionalSnapshot[];

  // Hesitation/confidence signals
  confidenceSignals: ConfidenceSignal[];

  // Errors detected this session
  sessionErrors: SessionError[];

  // Vocabulary used this session
  vocabularyUsed: Set<string>;

  // Topics discussed
  topicsDiscussed: string[];

  // Adaptation state - how AI has adjusted this session
  currentAdaptation: AdaptationState;

  // Turn counter for adaptive challenge frequency control
  turnCount: number;
  nextAdaptiveChallengeTurn: number; // turn number at which next challenge is allowed
}

export interface SessionMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;

  // Analysis metadata
  wordCount: number;
  responseTimeMs?: number;

  // For user messages
  errors?: DetectedError[];
  hesitationDetected?: boolean;
  emotionalState?: EmotionalState;

  // For assistant messages
  complexityLevel?: ComplexityLevel;
  correctionGiven?: boolean;
}

export interface SessionPerformance {
  messageCount: number;
  userMessageCount: number;
  totalWords: number;
  uniqueWords: number;

  // Error tracking
  grammarErrors: number;
  vocabularyErrors: number;
  pronunciationErrors: number;

  // Positive signals
  correctUsages: number;
  newWordsUsedCorrectly: number;

  // Response quality
  avgResponseTimeMs: number;
  hesitationCount: number;

  // Fluency indicators
  selfCorrections: number;
  fillerWordCount: number;
}

export interface EmotionalSnapshot {
  timestamp: Date;
  state: EmotionalState;
  confidence: number;
  trigger?: string; // What caused this state
}

export type EmotionalState =
  | 'confident'
  | 'engaged'
  | 'curious'
  | 'frustrated'
  | 'anxious'
  | 'bored'
  | 'confused'
  | 'tired'
  | 'excited'
  | 'neutral';

export interface ConfidenceSignal {
  timestamp: Date;
  type: ConfidenceSignalType;
  context: string;
  severity: 'low' | 'medium' | 'high';
}

export type ConfidenceSignalType =
  | 'long_pause'          // Took too long to respond
  | 'filler_words'        // "um", "uh", "like"
  | 'self_correction'     // User corrected themselves
  | 'question_avoidance'  // Gave short/evasive answer
  | 'native_fallback'     // Used native language
  | 'repetition_request'  // Asked AI to repeat
  | 'explicit_confusion'  // "I don't understand"
  | 'quick_confident'     // Fast, accurate response
  | 'elaboration'         // User elaborated unprompted
  | 'natural_flow';       // Smooth conversation flow

export interface SessionError {
  id: string;
  timestamp: Date;
  category: ErrorCategory;
  original: string;
  correction: string;
  explanation: string;
  severity: 'minor' | 'moderate' | 'significant';
  wasAddressed: boolean;
  userAcknowledged: boolean;
}

export type ErrorCategory =
  | 'grammar_tense'
  | 'grammar_agreement'
  | 'grammar_articles'
  | 'grammar_prepositions'
  | 'grammar_word_order'
  | 'vocabulary_wrong_word'
  | 'vocabulary_false_friend'
  | 'vocabulary_collocation'
  | 'pronunciation_vowel'
  | 'pronunciation_consonant'
  | 'pronunciation_stress'
  | 'pronunciation_intonation'
  | 'usage_register'
  | 'usage_idiom'
  | 'usage_formality';

// ============================================
// Long-Term Memory (Cross-Session)
// ============================================

export interface LongTermMemory {
  userId: string;
  createdAt: Date;
  lastUpdatedAt: Date;

  // Learning profile
  learningProfile: LearningProfile;

  // Persistent error patterns
  errorPatterns: ErrorPattern[];

  // Vocabulary mastery
  vocabularyBank: VocabularyItem[];

  // Grammar mastery by construct
  grammarMastery: GrammarMastery[];

  // Personal facts for natural conversation
  personalFacts: PersonalFact[];

  // Session history summaries
  sessionHistory: SessionSummary[];

  // Pronunciation weaknesses
  pronunciationProfile: PronunciationProfile;

  // Adaptation preferences learned over time
  adaptationPreferences: AdaptationPreferences;
}

export interface LearningProfile {
  // User-stated info
  nativeLanguage: string;
  targetLanguage: string;
  targetVariant: string;
  primaryGoal: LearningGoal;
  secondaryGoals: LearningGoal[];

  // Estimated levels (continuously updated)
  levels: {
    grammar: CEFRLevel;
    vocabulary: CEFRLevel;
    fluency: CEFRLevel;
    pronunciation: CEFRLevel;
    overall: CEFRLevel;
    confidence: number; // How confident we are in these estimates
  };

  // Learning patterns
  learningSpeed: 'slow' | 'moderate' | 'fast';
  retentionRate: number; // 0-1, how well they remember
  practiceFrequency: 'rare' | 'occasional' | 'regular' | 'daily';
  averageSessionLength: number; // minutes

  // Best times and patterns
  peakPerformanceTime?: 'morning' | 'afternoon' | 'evening' | 'night';

  // Motivation patterns
  motivationTriggers: string[];
  frustrationTriggers: string[];
}

export type LearningGoal =
  | 'conversation'
  | 'business'
  | 'travel'
  | 'interview'
  | 'relocation'
  | 'academic'
  | 'certification'
  | 'culture'
  | 'romance'
  | 'family';

export type CEFRLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

export interface ErrorPattern {
  id: string;
  category: ErrorCategory;
  pattern: string; // e.g., "Confuses 'make' and 'do'"
  specificRule?: string;
  examples: ErrorExample[];
  frequency: number;
  lastOccurrence: Date;
  firstOccurrence: Date;
  status: 'active' | 'improving' | 'resolved';
  improvementRate: number; // -1 to 1, negative = getting worse
}

export interface ErrorExample {
  original: string;
  correction: string;
  context: string;
  date: Date;
}

export interface VocabularyItem {
  id: string;
  word: string;
  translation?: string;
  partOfSpeech: string;

  // Mastery tracking
  mastery: number; // 0-1
  exposureCount: number;
  correctUsageCount: number;
  incorrectUsageCount: number;

  // Spaced repetition data
  nextReviewDate: Date;
  easeFactor: number;
  interval: number; // days

  // Context
  learnedContext: string;
  lastUsedContext?: string;
  relatedWords: string[];

  // Dates
  firstSeen: Date;
  lastUsed: Date;
}

export interface GrammarMastery {
  construct: string; // e.g., "present_perfect", "subjunctive"
  level: CEFRLevel;
  mastery: number; // 0-1
  commonErrors: string[];
  lastPracticed: Date;
  practiceCount: number;
}

export interface PersonalFact {
  id: string;
  category: PersonalFactCategory;
  content: string;
  confidence: number; // 0-1
  source: 'user_stated' | 'inferred' | 'conversational';
  firstMentioned: Date;
  lastReferenced: Date;
  referenceCount: number;
  isActive: boolean; // false if outdated
}

export type PersonalFactCategory =
  | 'name'
  | 'occupation'
  | 'workplace'
  | 'family'
  | 'hobby'
  | 'travel'
  | 'food_preference'
  | 'location'
  | 'education'
  | 'goal_specific'  // e.g., "preparing for interview at Google"
  | 'life_event'     // e.g., "moving to Spain next month"
  | 'preference'     // e.g., "prefers formal language"
  | 'cultural';      // e.g., "from Brazil, values casual interaction"

export interface SessionSummary {
  id: string;
  date: Date;
  durationMinutes: number;

  // Performance
  overallScore: number;
  fluencyScore: number;
  accuracyScore: number;

  // Key events
  topicsDiscussed: string[];
  newVocabulary: string[];
  errorsAddressed: string[];
  breakthroughs: string[];

  // Emotional journey
  startingMood: EmotionalState;
  endingMood: EmotionalState;
  emotionalTrend: 'improved' | 'stable' | 'declined';

  // AI summary
  narrativeSummary: string;
  keyInsights: string[];
  recommendedFocus: string[];
}

export interface PronunciationProfile {
  weakSounds: SoundWeakness[];
  intonationPatterns: IntonationIssue[];
  rhythmIssues: string[];
  overallClarity: number; // 0-100
  nativeAccentInfluence: string[];
}

export interface SoundWeakness {
  sound: string; // IPA
  targetSound: string;
  confusedWith?: string;
  severity: 'minor' | 'moderate' | 'significant';
  examples: string[];
  practiceCount: number;
  improvement: number; // -1 to 1
}

export interface IntonationIssue {
  pattern: string;
  description: string;
  examples: string[];
}

export interface AdaptationPreferences {
  // Correction style
  preferredCorrectionTiming: 'immediate' | 'delayed' | 'end_of_thought';
  correctionDetail: 'minimal' | 'moderate' | 'detailed';
  preferExplicitCorrection: boolean;

  // Pace and complexity
  preferredPace: 'slower' | 'normal' | 'faster';
  vocabularyComplexity: 'simpler' | 'matched' | 'challenging';
  sentenceLength: 'shorter' | 'normal' | 'longer';

  // Interaction style
  formality: 'casual' | 'neutral' | 'formal';
  encouragementLevel: 'minimal' | 'moderate' | 'high';
  humorAppreciation: boolean;

  // Topics
  preferredTopics: string[];
  avoidTopics: string[];

  // Learning style
  prefersExamples: boolean;
  prefersRules: boolean;
  prefersRepetition: boolean;
}

// ============================================
// Adaptation Engine Types
// ============================================

export interface AdaptationState {
  // Current adjustments active
  complexityModifier: number; // -2 to +2
  paceModifier: number; // -2 to +2
  correctionFrequency: CorrectionFrequency;
  encouragementLevel: EncouragementLevel;

  // Sentence construction guidance
  targetSentenceLength: 'short' | 'medium' | 'long';
  targetVocabularyLevel: CEFRLevel;

  // Dynamic adjustments this session
  adjustments: AdaptationAdjustment[];
}

export type CorrectionFrequency =
  | 'every_error'
  | 'significant_only'
  | 'periodic_summary'
  | 'on_request';

export type EncouragementLevel =
  | 'minimal'    // Just correct, no praise
  | 'balanced'   // Occasional encouragement
  | 'supportive' // Frequent positive reinforcement
  | 'intensive'; // Heavy encouragement for struggling users

export interface AdaptationAdjustment {
  timestamp: Date;
  trigger: AdaptationTrigger;
  action: string;
  reason: string;
}

export type AdaptationTrigger =
  | 'high_error_rate'
  | 'low_error_rate'
  | 'frustration_detected'
  | 'boredom_detected'
  | 'confidence_spike'
  | 'confusion_detected'
  | 'fatigue_detected'
  | 'flow_state'
  | 'topic_change'
  | 'explicit_request'
  | 'circuit_breaker_activated'
  | 'circuit_breaker_deactivated';

// ============================================
// Memory Operation Types
// ============================================

export interface MemoryWriteOperation {
  type: MemoryWriteType;
  category: string;
  content: string;
  confidence: number;
  sourceMessageId?: string;
  shouldIndex: boolean; // For vector store
}

export type MemoryWriteType =
  | 'error_pattern'
  | 'vocabulary'
  | 'personal_fact'
  | 'preference'
  | 'pronunciation'
  | 'session_summary'
  | 'breakthrough';

export interface MemoryConsolidation {
  shortTermToProcess: ShortTermMemory;
  updatedPatterns: ErrorPattern[];
  updatedVocabulary: VocabularyItem[];
  newFacts: PersonalFact[];
  sessionSummary: SessionSummary;
  toForget: string[]; // Memory IDs to deprioritize
}

export interface ForgetCriteria {
  // When to forget/deprioritize
  maxAgeWithoutReference: number; // days
  minConfidenceThreshold: number;
  maxErrorsPerCategory: number;
  maxVocabularyItems: number;

  // What never to forget
  protectedCategories: PersonalFactCategory[];
  protectedPatterns: ErrorCategory[];
}

// ============================================
// Detected Errors (Used in Messages)
// ============================================

export interface DetectedError {
  id: string;
  category: ErrorCategory;
  original: string;
  correction: string;
  explanation: string;
  severity: 'minor' | 'moderate' | 'significant';
  isRecurring: boolean;
  relatedPatternId?: string;
}

export type ComplexityLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

// ============================================
// Memory Context for AI Prompts
// ============================================

export interface MemoryContextForAI {
  // Who the user is
  userProfile: {
    name?: string;
    nativeLanguage: string;
    primaryGoal: LearningGoal;
    currentLevel: CEFRLevel;
    levelConfidence: number;
  };

  // What they struggle with
  activeErrorPatterns: Array<{
    pattern: string;
    category: ErrorCategory;
    frequency: number;
    recentExample?: string;
  }>;

  // Vocabulary state
  vocabularyFocus: Array<{
    word: string;
    mastery: number;
    needsReinforcement: boolean;
  }>;

  // Pronunciation weak spots
  pronunciationWeaknesses: string[];

  // Personal context for natural conversation
  relevantFacts: Array<{
    category: PersonalFactCategory;
    content: string;
  }>;

  // Recent session context
  lastSessionSummary?: string;
  continuityPoints: string[]; // Things to follow up on

  // Active conversation threads for cross-session continuity
  activeThreads: Array<{
    topic: string;
    context: string;
    lastMentionedAt: Date;
    mentions: number;
  }>;

  // Current session state
  currentMood: EmotionalState;
  recentConfidenceSignals: ConfidenceSignal[];
  sessionErrorCount: number;

  // Emotional safety
  circuitBreakerActive: boolean;
  frustrationLevel: number; // 0-5, consecutive negative signals

  // Adaptation directives
  adaptationDirectives: AdaptationDirective[];

  // Adaptive challenge frequency guard
  adaptiveChallengeAllowed: boolean; // true when enough turns have passed (randomized interval)

  // Current session topics (from STM) for relational memory references
  sessionTopics: string[];

  // Growth moment observation (optional, rare)
  growthMoment?: {
    type: string;
    observation: string;
    dataPoints: {
      before: string;
      after: string;
      timespan: string;
    };
  };
}

export interface AdaptationDirective {
  type: 'increase' | 'decrease' | 'maintain';
  aspect: 'complexity' | 'pace' | 'correction' | 'encouragement';
  reason: string;
}
