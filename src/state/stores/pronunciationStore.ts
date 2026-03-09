import type {
  PronunciationPhrase,
  ReferenceAudio,
  PronunciationAnalysis,
  PronunciationFeedback,
  PronunciationAttempt,
  PronunciationSessionState,
  PhraseCategory,
  PitchPoint,
} from '@appTypes/pronunciation';
import {storage} from '@data/storage/mmkv';
import {create} from 'zustand';
import {persist, createJSONStorage} from 'zustand/middleware';
import {immer} from 'zustand/middleware/immer';


interface PronunciationState {
  // Categories
  categories: PhraseCategory[];
  categoriesLoading: boolean;

  // Phrases
  phrases: PronunciationPhrase[];
  phrasesLoading: boolean;
  selectedCategoryId: string | null;

  // Current session
  currentPhrase: PronunciationPhrase | null;
  referenceAudio: ReferenceAudio | null;
  sessionState: PronunciationSessionState;

  // Recording data
  userRecordingUri: string | null;
  userWaveform: number[];
  userPitchContour: PitchPoint[];
  recordingDurationMs: number;

  // Analysis
  analysisResult: PronunciationAnalysis | null;
  feedback: PronunciationFeedback | null;
  isAnalyzing: boolean;

  // Playback state
  isPlayingReference: boolean;
  isPlayingUser: boolean;
  playbackSpeed: number;
  referencePlaybackPosition: number;
  userPlaybackPosition: number;

  // History
  recentAttempts: PronunciationAttempt[];
  phraseAttempts: Record<string, PronunciationAttempt[]>;

  // Error
  error: string | null;

  // Actions - Categories
  setCategories: (categories: PhraseCategory[]) => void;
  setCategoriesLoading: (loading: boolean) => void;

  // Actions - Phrases
  setPhrases: (phrases: PronunciationPhrase[]) => void;
  setPhrasesLoading: (loading: boolean) => void;
  setSelectedCategory: (categoryId: string | null) => void;
  updatePhraseScore: (phraseId: string, score: number) => void;

  // Actions - Session
  startSession: (phrase: PronunciationPhrase, reference: ReferenceAudio) => void;
  setSessionState: (state: PronunciationSessionState) => void;
  endSession: () => void;

  // Actions - Recording
  setUserRecording: (uri: string, durationMs: number) => void;
  setUserWaveform: (waveform: number[]) => void;
  setUserPitchContour: (contour: PitchPoint[]) => void;
  clearRecording: () => void;

  // Actions - Analysis
  setAnalysisResult: (analysis: PronunciationAnalysis, feedback: PronunciationFeedback) => void;
  setAnalyzing: (analyzing: boolean) => void;
  clearAnalysis: () => void;

  // Actions - Playback
  setPlayingReference: (playing: boolean) => void;
  setPlayingUser: (playing: boolean) => void;
  setPlaybackSpeed: (speed: number) => void;
  setReferencePlaybackPosition: (position: number) => void;
  setUserPlaybackPosition: (position: number) => void;

  // Actions - History
  addAttempt: (attempt: PronunciationAttempt) => void;
  loadHistory: (phraseId?: string) => PronunciationAttempt[];
  getBestScore: (phraseId: string) => number | undefined;

  // Actions - Error
  setError: (error: string | null) => void;

  // Actions - Reset
  resetSession: () => void;
  resetAll: () => void;
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

const initialSessionState = {
  currentPhrase: null,
  referenceAudio: null,
  sessionState: 'idle' as PronunciationSessionState,
  userRecordingUri: null,
  userWaveform: [],
  userPitchContour: [],
  recordingDurationMs: 0,
  analysisResult: null,
  feedback: null,
  isAnalyzing: false,
  isPlayingReference: false,
  isPlayingUser: false,
  playbackSpeed: 1,
  referencePlaybackPosition: 0,
  userPlaybackPosition: 0,
  error: null,
};

export const usePronunciationStore = create<PronunciationState>()(
  persist(
    immer((set, get) => ({
      // Initial state
      categories: [],
      categoriesLoading: false,
      phrases: [],
      phrasesLoading: false,
      selectedCategoryId: null,
      recentAttempts: [],
      phraseAttempts: {},
      ...initialSessionState,

      // Categories
      setCategories: (categories) =>
        set((state) => {
          state.categories = categories;
        }),

      setCategoriesLoading: (loading) =>
        set((state) => {
          state.categoriesLoading = loading;
        }),

      // Phrases
      setPhrases: (phrases) =>
        set((state) => {
          state.phrases = phrases;
        }),

      setPhrasesLoading: (loading) =>
        set((state) => {
          state.phrasesLoading = loading;
        }),

      setSelectedCategory: (categoryId) =>
        set((state) => {
          state.selectedCategoryId = categoryId;
        }),

      updatePhraseScore: (phraseId, score) =>
        set((state) => {
          const phrase = state.phrases.find((p) => p.id === phraseId);
          if (phrase) {
            if (!phrase.bestScore || score > phrase.bestScore) {
              phrase.bestScore = score;
            }
            phrase.lastPracticed = new Date().toISOString();
            phrase.attemptCount = (phrase.attemptCount || 0) + 1;
          }
        }),

      // Session
      startSession: (phrase, reference) =>
        set((state) => {
          state.currentPhrase = phrase;
          state.referenceAudio = reference;
          state.sessionState = 'ready';
          state.error = null;
          // Clear previous recording
          state.userRecordingUri = null;
          state.userWaveform = [];
          state.userPitchContour = [];
          state.recordingDurationMs = 0;
          state.analysisResult = null;
          state.feedback = null;
        }),

      setSessionState: (sessionState) =>
        set((state) => {
          state.sessionState = sessionState;
        }),

      endSession: () =>
        set((state) => {
          Object.assign(state, initialSessionState);
        }),

      // Recording
      setUserRecording: (uri, durationMs) =>
        set((state) => {
          state.userRecordingUri = uri;
          state.recordingDurationMs = durationMs;
          state.sessionState = 'processing';
        }),

      setUserWaveform: (waveform) =>
        set((state) => {
          state.userWaveform = waveform;
        }),

      setUserPitchContour: (contour) =>
        set((state) => {
          state.userPitchContour = contour;
        }),

      clearRecording: () =>
        set((state) => {
          state.userRecordingUri = null;
          state.userWaveform = [];
          state.userPitchContour = [];
          state.recordingDurationMs = 0;
          state.sessionState = 'ready';
        }),

      // Analysis
      setAnalysisResult: (analysis, feedback) =>
        set((state) => {
          state.analysisResult = analysis;
          state.feedback = feedback;
          state.isAnalyzing = false;
          state.sessionState = 'complete';
        }),

      setAnalyzing: (analyzing) =>
        set((state) => {
          state.isAnalyzing = analyzing;
          if (analyzing) {
            state.sessionState = 'processing';
          }
        }),

      clearAnalysis: () =>
        set((state) => {
          state.analysisResult = null;
          state.feedback = null;
        }),

      // Playback
      setPlayingReference: (playing) =>
        set((state) => {
          state.isPlayingReference = playing;
          if (playing) {
            state.isPlayingUser = false;
          }
        }),

      setPlayingUser: (playing) =>
        set((state) => {
          state.isPlayingUser = playing;
          if (playing) {
            state.isPlayingReference = false;
          }
        }),

      setPlaybackSpeed: (speed) =>
        set((state) => {
          state.playbackSpeed = speed;
        }),

      setReferencePlaybackPosition: (position) =>
        set((state) => {
          state.referencePlaybackPosition = position;
        }),

      setUserPlaybackPosition: (position) =>
        set((state) => {
          state.userPlaybackPosition = position;
        }),

      // History
      addAttempt: (attempt) =>
        set((state) => {
          // Add to recent attempts
          state.recentAttempts.unshift(attempt);
          if (state.recentAttempts.length > 50) {
            state.recentAttempts = state.recentAttempts.slice(0, 50);
          }

          // Add to phrase-specific history
          if (!state.phraseAttempts[attempt.phraseId]) {
            state.phraseAttempts[attempt.phraseId] = [];
          }
          state.phraseAttempts[attempt.phraseId].unshift(attempt);
          if (state.phraseAttempts[attempt.phraseId].length > 20) {
            state.phraseAttempts[attempt.phraseId] =
              state.phraseAttempts[attempt.phraseId].slice(0, 20);
          }
        }),

      loadHistory: (phraseId) => {
        const state = get();
        if (phraseId) {
          return state.phraseAttempts[phraseId] || [];
        }
        return state.recentAttempts;
      },

      getBestScore: (phraseId) => {
        const state = get();
        const attempts = state.phraseAttempts[phraseId] || [];
        if (attempts.length === 0) {return undefined;}
        return Math.max(...attempts.map((a) => a.overallScore));
      },

      // Error
      setError: (error) =>
        set((state) => {
          state.error = error;
          if (error) {
            state.sessionState = 'error';
          }
        }),

      // Reset
      resetSession: () =>
        set((state) => {
          Object.assign(state, initialSessionState);
        }),

      resetAll: () =>
        set((state) => {
          state.categories = [];
          state.phrases = [];
          state.selectedCategoryId = null;
          state.recentAttempts = [];
          state.phraseAttempts = {};
          Object.assign(state, initialSessionState);
        }),
    })),
    {
      name: 'pronunciation-storage',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({
        recentAttempts: state.recentAttempts.slice(0, 20),
        phraseAttempts: Object.fromEntries(
          Object.entries(state.phraseAttempts).map(([k, v]) => [k, v.slice(0, 10)]),
        ),
      }),
    },
  ),
);

// Selectors
export const selectCurrentSession = (state: PronunciationState) => ({
  phrase: state.currentPhrase,
  reference: state.referenceAudio,
  state: state.sessionState,
});

export const selectRecording = (state: PronunciationState) => ({
  uri: state.userRecordingUri,
  waveform: state.userWaveform,
  pitchContour: state.userPitchContour,
  durationMs: state.recordingDurationMs,
});

export const selectAnalysis = (state: PronunciationState) => ({
  result: state.analysisResult,
  feedback: state.feedback,
  isAnalyzing: state.isAnalyzing,
});

export const selectPlayback = (state: PronunciationState) => ({
  isPlayingReference: state.isPlayingReference,
  isPlayingUser: state.isPlayingUser,
  speed: state.playbackSpeed,
  referencePosition: state.referencePlaybackPosition,
  userPosition: state.userPlaybackPosition,
});

export default usePronunciationStore;
