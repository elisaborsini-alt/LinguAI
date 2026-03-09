import type {
  PronunciationPhrase,
  ReferenceAudio,
  PronunciationAnalysis,
  PronunciationFeedback,
  PronunciationSessionState,
} from '@appTypes/pronunciation';
import {pronunciationApi} from '@data/api/endpoints/pronunciation';
import {useState, useCallback, useEffect, useRef} from 'react';
import {
  AudioContext,
  type AudioBufferSourceNode,
} from 'react-native-audio-api';

import {usePronunciationStore} from '../stores/pronunciationStore';

import {useAudioRecorder} from './useAudioRecorder';

interface UsePronunciationSessionOptions {
  autoPlayReference?: boolean;
  maxRecordingDuration?: number;
}

interface SessionData {
  phrase: PronunciationPhrase | null;
  referenceAudio: ReferenceAudio | null;
  sessionState: PronunciationSessionState;
  error: string | null;
}

interface RecordingData {
  isRecording: boolean;
  recordingDuration: number;
  audioLevel: number;
  recordingUri: string | null;
  userWaveform: number[];
}

interface AnalysisData {
  isAnalyzing: boolean;
  analysis: PronunciationAnalysis | null;
  feedback: PronunciationFeedback | null;
}

interface PlaybackData {
  isPlayingReference: boolean;
  isPlayingUser: boolean;
  playbackSpeed: number;
  referencePosition: number;
  userPosition: number;
}

interface SessionActions {
  loadPhrase: (phraseId: string) => Promise<void>;
  playReference: () => Promise<void>;
  pauseReference: () => void;
  setPlaybackSpeed: (speed: number) => void;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  playUserRecording: () => Promise<void>;
  pauseUserRecording: () => void;
  analyzeRecording: () => Promise<void>;
  retryRecording: () => void;
  endSession: () => void;
}

export function usePronunciationSession(
  options: UsePronunciationSessionOptions = {},
): SessionData & RecordingData & AnalysisData & PlaybackData & SessionActions {
  const {autoPlayReference = false, maxRecordingDuration = 10} = options;

  // Store actions
  const store = usePronunciationStore();

  // Audio recorder
  const recorder = useAudioRecorder({
    maxDuration: maxRecordingDuration,
    onAudioLevel: (level) => {
      setLocalState(prev => ({...prev, audioLevel: level}));
    },
    onDurationUpdate: (duration) => {
      setLocalState(prev => ({...prev, recordingDuration: duration}));
    },
  });

  // Local state for real-time updates
  const [localState, setLocalState] = useState({
    audioLevel: 0,
    recordingDuration: 0,
  });

  // Audio contexts for playback
  const audioContextRef = useRef<AudioContext | null>(null);
  const referenceSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const userSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const playbackStartTimeRef = useRef<number>(0);
  const playbackIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Initialize audio context
  useEffect(() => {
    audioContextRef.current = new AudioContext();
    return () => {
      audioContextRef.current?.close();
    };
  }, []);

  // Load phrase and reference audio
  const loadPhrase = useCallback(async (phraseId: string): Promise<void> => {
    try {
      store.setPhrasesLoading(true);
      store.setError(null);

      // Fetch phrase and reference audio from API
      const response = await pronunciationApi.getPhrase(phraseId);

      if (response.phrase && response.reference) {
        store.startSession(response.phrase, response.reference);

        // Auto-play reference if enabled
        if (autoPlayReference) {
          setTimeout(() => {
            playReference();
          }, 500);
        }
      } else {
        store.setError('Phrase not found');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load phrase';
      store.setError(message);
    } finally {
      store.setPhrasesLoading(false);
    }
  }, [store, autoPlayReference]);

  // Play reference audio
  const playReference = useCallback(async (): Promise<void> => {
    if (!store.referenceAudio?.audioUrl || !audioContextRef.current) {return;}

    try {
      // Stop any current playback
      if (referenceSourceRef.current) {
        referenceSourceRef.current.stop();
      }
      store.setPlayingUser(false);

      // Decode audio via react-native-audio-api (accepts URL / data URI)
      const audioBuffer = await audioContextRef.current.decodeAudioDataSource(
        store.referenceAudio.audioUrl,
      );

      // Create source node
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.playbackRate.value = store.playbackSpeed;
      source.connect(audioContextRef.current.destination);

      referenceSourceRef.current = source;
      playbackStartTimeRef.current = audioContextRef.current.currentTime;

      // Track playback position
      playbackIntervalRef.current = setInterval(() => {
        if (audioContextRef.current && store.referenceAudio) {
          const elapsed = (audioContextRef.current.currentTime - playbackStartTimeRef.current) * store.playbackSpeed;
          const position = elapsed / (store.referenceAudio.durationMs / 1000);
          store.setReferencePlaybackPosition(Math.min(position, 1));
        }
      }, 50);

      // Schedule end-of-playback handler (react-native-audio-api
      // AudioBufferSourceNode does not support onended)
      const durationMs = (audioBuffer.duration / store.playbackSpeed) * 1000 + 50;
      setTimeout(() => {
        store.setPlayingReference(false);
        store.setReferencePlaybackPosition(0);
        if (playbackIntervalRef.current) {
          clearInterval(playbackIntervalRef.current);
        }

        // Transition to 'ready' state after first listen
        if (store.sessionState === 'idle') {
          store.setSessionState('ready');
        }
      }, durationMs);

      source.start();
      store.setPlayingReference(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to play audio';
      store.setError(message);
    }
  }, [store]);

  // Pause reference audio
  const pauseReference = useCallback((): void => {
    if (referenceSourceRef.current) {
      referenceSourceRef.current.stop();
      referenceSourceRef.current = null;
    }
    if (playbackIntervalRef.current) {
      clearInterval(playbackIntervalRef.current);
    }
    store.setPlayingReference(false);
  }, [store]);

  // Set playback speed
  const setPlaybackSpeed = useCallback((speed: number): void => {
    store.setPlaybackSpeed(speed);
    if (referenceSourceRef.current) {
      referenceSourceRef.current.playbackRate.value = speed;
    }
  }, [store]);

  // Start recording
  const startRecording = useCallback(async (): Promise<void> => {
    try {
      // Stop any playback
      pauseReference();
      if (userSourceRef.current) {
        userSourceRef.current.stop();
      }
      store.setPlayingUser(false);

      store.setSessionState('recording');
      store.clearRecording();

      await recorder.startRecording();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to start recording';
      store.setError(message);
    }
  }, [recorder, store, pauseReference]);

  // Stop recording
  const stopRecording = useCallback(async (): Promise<void> => {
    try {
      const uri = await recorder.stopRecording();

      if (uri) {
        store.setUserRecording(uri, recorder.duration * 1000);

        // Generate waveform data from recording
        // In production, this would extract actual waveform data
        const mockWaveform = Array.from({length: 50}, () => Math.random() * 0.8 + 0.1);
        store.setUserWaveform(mockWaveform);

        store.setSessionState('recorded');
      } else {
        store.setError('No audio recorded');
        store.setSessionState('ready');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to stop recording';
      store.setError(message);
      store.setSessionState('ready');
    }
  }, [recorder, store]);

  // Play user recording
  const playUserRecording = useCallback(async (): Promise<void> => {
    if (!store.userRecordingUri || !audioContextRef.current) {return;}

    try {
      // Stop any current playback
      if (userSourceRef.current) {
        userSourceRef.current.stop();
      }
      pauseReference();

      // Decode audio via react-native-audio-api (accepts file URI)
      const audioBuffer = await audioContextRef.current.decodeAudioDataSource(
        store.userRecordingUri,
      );

      // Create source node
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);

      userSourceRef.current = source;
      playbackStartTimeRef.current = audioContextRef.current.currentTime;

      // Track playback position
      playbackIntervalRef.current = setInterval(() => {
        if (audioContextRef.current && store.recordingDurationMs) {
          const elapsed = audioContextRef.current.currentTime - playbackStartTimeRef.current;
          const position = elapsed / (store.recordingDurationMs / 1000);
          store.setUserPlaybackPosition(Math.min(position, 1));
        }
      }, 50);

      // Schedule end-of-playback handler
      const durationMs = audioBuffer.duration * 1000 + 50;
      setTimeout(() => {
        store.setPlayingUser(false);
        store.setUserPlaybackPosition(0);
        if (playbackIntervalRef.current) {
          clearInterval(playbackIntervalRef.current);
        }
      }, durationMs);

      source.start();
      store.setPlayingUser(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to play recording';
      store.setError(message);
    }
  }, [store, pauseReference]);

  // Pause user recording playback
  const pauseUserRecording = useCallback((): void => {
    if (userSourceRef.current) {
      userSourceRef.current.stop();
      userSourceRef.current = null;
    }
    if (playbackIntervalRef.current) {
      clearInterval(playbackIntervalRef.current);
    }
    store.setPlayingUser(false);
  }, [store]);

  // Analyze recording
  const analyzeRecording = useCallback(async (): Promise<void> => {
    if (!store.userRecordingUri || !store.currentPhrase) {return;}

    try {
      store.setAnalyzing(true);

      const result = await pronunciationApi.analyzeRecording({
        phraseId: store.currentPhrase.id,
        audioUri: store.userRecordingUri,
        referenceAudioId: store.referenceAudio?.id,
      });

      store.setAnalysisResult(result.analysis, result.feedback);

      // Add attempt to history
      store.addAttempt({
        id: `attempt_${Date.now()}`,
        phraseId: store.currentPhrase.id,
        phraseText: store.currentPhrase.text,
        userId: 'current-user', // Would come from auth
        audioUrl: store.userRecordingUri,
        durationMs: store.recordingDurationMs || 0,
        overallScore: result.analysis.overallScore,
        rhythmScore: result.analysis.rhythmScore,
        pitchScore: result.analysis.pitchScore,
        clarityScore: result.analysis.clarityScore,
        feedback: result.feedback,
        createdAt: new Date().toISOString(),
      });

      // Update phrase best score
      store.updatePhraseScore(store.currentPhrase.id, result.analysis.overallScore);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to analyze recording';
      store.setError(message);
    } finally {
      store.setAnalyzing(false);
    }
  }, [store]);

  // Retry recording
  const retryRecording = useCallback((): void => {
    recorder.reset();
    store.clearRecording();
    store.clearAnalysis();
    store.setSessionState('ready');
    setLocalState({audioLevel: 0, recordingDuration: 0});
  }, [recorder, store]);

  // End session
  const endSession = useCallback((): void => {
    // Stop all playback
    pauseReference();
    pauseUserRecording();

    // Cancel any recording
    if (recorder.isRecording) {
      recorder.cancelRecording();
    }

    // Reset recorder
    recorder.reset();

    // Reset store
    store.endSession();

    // Reset local state
    setLocalState({audioLevel: 0, recordingDuration: 0});
  }, [recorder, store, pauseReference, pauseUserRecording]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (playbackIntervalRef.current) {
        clearInterval(playbackIntervalRef.current);
      }
      if (referenceSourceRef.current) {
        try {
          referenceSourceRef.current.stop();
        } catch {
          // Ignore errors during cleanup
        }
      }
      if (userSourceRef.current) {
        try {
          userSourceRef.current.stop();
        } catch {
          // Ignore errors during cleanup
        }
      }
    };
  }, []);

  return {
    // Session data
    phrase: store.currentPhrase,
    referenceAudio: store.referenceAudio,
    sessionState: store.sessionState,
    error: store.error,

    // Recording data
    isRecording: recorder.isRecording,
    recordingDuration: localState.recordingDuration,
    audioLevel: localState.audioLevel,
    recordingUri: store.userRecordingUri,
    userWaveform: store.userWaveform,

    // Analysis data
    isAnalyzing: store.isAnalyzing,
    analysis: store.analysisResult,
    feedback: store.feedback,

    // Playback data
    isPlayingReference: store.isPlayingReference,
    isPlayingUser: store.isPlayingUser,
    playbackSpeed: store.playbackSpeed,
    referencePosition: store.referencePlaybackPosition,
    userPosition: store.userPlaybackPosition,

    // Actions
    loadPhrase,
    playReference,
    pauseReference,
    setPlaybackSpeed,
    startRecording,
    stopRecording,
    playUserRecording,
    pauseUserRecording,
    analyzeRecording,
    retryRecording,
    endSession,
  };
}

export default usePronunciationSession;
