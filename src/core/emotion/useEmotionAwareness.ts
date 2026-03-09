import {useState, useEffect, useCallback, useRef} from 'react';

import {audioAnalyzer, EmotionSignals} from './audioAnalyzer';

export type EmotionalState =
  | 'confident'
  | 'enthusiastic'
  | 'frustrated'
  | 'anxious'
  | 'bored'
  | 'confused'
  | 'tired'
  | 'neutral';

export interface EmotionFeedback {
  primaryEmotion: EmotionalState;
  confidence: number;
  message?: string;
  suggestion?: string;
  encouragement?: string;
}

export interface EmotionAwarenessState {
  currentEmotion: EmotionalState;
  confidence: number;
  emotionHistory: Array<{emotion: EmotionalState; timestamp: number}>;
  isAnalyzing: boolean;
  feedback: EmotionFeedback | null;
}

interface UseEmotionAwarenessReturn extends EmotionAwarenessState {
  startAnalysis: () => void;
  stopAnalysis: () => void;
  updateFromTranscript: (transcript: string) => void;
  getEmotionSignals: (messageCount: number) => EmotionSignals;
  reset: () => void;
  getEmotionColor: (emotion: EmotionalState) => string;
  getEmotionIcon: (emotion: EmotionalState) => string;
}

// Emotion display configuration
const EMOTION_CONFIG: Record<
  EmotionalState,
  {color: string; icon: string; message: string; suggestion: string}
> = {
  confident: {
    color: '#4CAF50',
    icon: '',
    message: '',
    suggestion: '',
  },
  enthusiastic: {
    color: '#FF9800',
    icon: '',
    message: '',
    suggestion: '',
  },
  frustrated: {
    color: '#F44336',
    icon: '',
    message: 'Prendiamola con calma',
    suggestion: 'Possiamo provare qualcosa di diverso',
  },
  anxious: {
    color: '#9C27B0',
    icon: '',
    message: 'Nessuna fretta',
    suggestion: 'Siamo qui insieme',
  },
  bored: {
    color: '#607D8B',
    icon: '',
    message: '',
    suggestion: 'Possiamo cambiare direzione',
  },
  confused: {
    color: '#FF5722',
    icon: '',
    message: 'Possiamo guardare questo da un altro punto',
    suggestion: '',
  },
  tired: {
    color: '#795548',
    icon: '',
    message: 'Forse basta per oggi',
    suggestion: 'Una pausa fa parte del percorso',
  },
  neutral: {
    color: '#2196F3',
    icon: '',
    message: '',
    suggestion: '',
  },
};

export function useEmotionAwareness(): UseEmotionAwarenessReturn {
  const [state, setState] = useState<EmotionAwarenessState>({
    currentEmotion: 'neutral',
    confidence: 0.5,
    emotionHistory: [],
    isAnalyzing: false,
    feedback: null,
  });

  const transcriptRef = useRef<string>('');
  const messageCountRef = useRef<number>(0);
  const analysisIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Start emotion analysis
  const startAnalysis = useCallback(async () => {
    await audioAnalyzer.initialize();
    setState(prev => ({...prev, isAnalyzing: true}));

    // Periodically analyze emotional state
    analysisIntervalRef.current = setInterval(() => {
      analyzeCurrentState();
    }, 5000); // Every 5 seconds
  }, []);

  // Stop emotion analysis
  const stopAnalysis = useCallback(() => {
    if (analysisIntervalRef.current) {
      clearInterval(analysisIntervalRef.current);
      analysisIntervalRef.current = null;
    }
    setState(prev => ({...prev, isAnalyzing: false}));
  }, []);

  // Update from transcript
  const updateFromTranscript = useCallback((transcript: string) => {
    transcriptRef.current = transcript;
    audioAnalyzer.updateWordCount(transcript);
  }, []);

  // Get emotion signals for backend
  const getEmotionSignals = useCallback(
    (messageCount: number): EmotionSignals => {
      messageCountRef.current = messageCount;
      return audioAnalyzer.getEmotionSignals(transcriptRef.current, messageCount);
    },
    [],
  );

  // Analyze current emotional state
  const analyzeCurrentState = useCallback(() => {
    const signals = audioAnalyzer.getEmotionSignals(
      transcriptRef.current,
      messageCountRef.current,
    );

    // Simple client-side emotion detection (backup for when backend isn't available)
    const emotion = detectEmotionFromSignals(signals);

    setState(prev => {
      const newHistory = [
        ...prev.emotionHistory,
        {emotion: emotion.primaryEmotion, timestamp: Date.now()},
      ].slice(-20); // Keep last 20

      const config = EMOTION_CONFIG[emotion.primaryEmotion];

      return {
        ...prev,
        currentEmotion: emotion.primaryEmotion,
        confidence: emotion.confidence,
        emotionHistory: newHistory,
        feedback: {
          primaryEmotion: emotion.primaryEmotion,
          confidence: emotion.confidence,
          message: config.message,
          suggestion: config.suggestion,
        },
      };
    });
  }, []);

  // Reset analyzer state
  const reset = useCallback(() => {
    audioAnalyzer.reset();
    transcriptRef.current = '';
    messageCountRef.current = 0;
    setState({
      currentEmotion: 'neutral',
      confidence: 0.5,
      emotionHistory: [],
      isAnalyzing: false,
      feedback: null,
    });
  }, []);

  // Get emotion color
  const getEmotionColor = useCallback((emotion: EmotionalState): string => {
    return EMOTION_CONFIG[emotion].color;
  }, []);

  // Get emotion icon
  const getEmotionIcon = useCallback((emotion: EmotionalState): string => {
    return EMOTION_CONFIG[emotion].icon;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (analysisIntervalRef.current) {
        clearInterval(analysisIntervalRef.current);
      }
      audioAnalyzer.destroy();
    };
  }, []);

  return {
    ...state,
    startAnalysis,
    stopAnalysis,
    updateFromTranscript,
    getEmotionSignals,
    reset,
    getEmotionColor,
    getEmotionIcon,
  };
}

/**
 * Simple client-side emotion detection from audio signals
 */
function detectEmotionFromSignals(signals: EmotionSignals): {
  primaryEmotion: EmotionalState;
  confidence: number;
} {
  const scores: Record<EmotionalState, number> = {
    confident: 0,
    enthusiastic: 0,
    frustrated: 0,
    anxious: 0,
    bored: 0,
    confused: 0,
    tired: 0,
    neutral: 0.3,
  };

  // Frustrated detection
  if (signals.fluency.hesitations >= 3) {scores.frustrated += 0.3;}
  if (signals.fluency.restarts >= 2) {scores.frustrated += 0.3;}
  if (signals.pauses.frequency >= 4) {scores.frustrated += 0.2;}

  // Anxious detection
  if (signals.speechRate.wordsPerMinute >= 160) {scores.anxious += 0.3;}
  if (signals.pitch.variance >= 50) {scores.anxious += 0.3;}
  if (signals.energy.variance >= 0.3) {scores.anxious += 0.2;}

  // Bored detection
  if (signals.speechRate.wordsPerMinute <= 100) {scores.bored += 0.3;}
  if (signals.pitch.variance <= 20) {scores.bored += 0.3;}
  if (signals.energy.mean <= 0.3) {scores.bored += 0.3;}

  // Enthusiastic detection
  if (signals.speechRate.wordsPerMinute >= 140) {scores.enthusiastic += 0.25;}
  if (signals.energy.mean >= 0.6) {scores.enthusiastic += 0.35;}

  // Tired detection
  if (signals.speechRate.wordsPerMinute <= 90) {scores.tired += 0.3;}
  if (signals.energy.mean <= 0.25) {scores.tired += 0.4;}
  if (signals.pauses.averageDuration >= 800) {scores.tired += 0.2;}

  // Confused detection
  if (signals.fluency.incompleteUtterances >= 2) {scores.confused += 0.4;}
  if (signals.pauses.frequency >= 5) {scores.confused += 0.3;}
  if (signals.pitch.trend === 'rising') {scores.confused += 0.2;}

  // Confident detection
  if (
    signals.fluency.hesitations < 2 &&
    signals.fluency.restarts < 1 &&
    signals.energy.mean > 0.4 &&
    signals.speechRate.wordsPerMinute > 100
  ) {
    scores.confident += 0.6;
  }

  // Find highest scoring emotion
  const entries = Object.entries(scores) as Array<[EmotionalState, number]>;
  entries.sort((a, b) => b[1] - a[1]);

  const [primaryEmotion, score] = entries[0];
  const maxScore = Math.max(...Object.values(scores));
  const confidence = maxScore > 0 ? score / maxScore : 0.5;

  return {
    primaryEmotion,
    confidence: Math.min(1, confidence),
  };
}

export default useEmotionAwareness;
