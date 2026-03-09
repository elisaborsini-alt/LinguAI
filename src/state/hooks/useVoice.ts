import type {VoiceState, LearningGoal} from '@appTypes/domain';
import {voiceService, speechRecognition, textToSpeech} from '@core/voice';
import {audioSessionGuard} from '@core/voice/audioSessionGuard';
import {useUserStore} from '@state/stores/userStore';
import {useVoiceStore} from '@state/stores/voiceStore';
import {useCallback, useEffect, useRef, useState} from 'react';

interface UseVoiceReturn {
  // State
  voiceState: VoiceState;
  isCallActive: boolean;
  isMuted: boolean;
  currentTranscript: string;
  interimTranscript: string;
  isSpeaking: boolean;
  isAISpeaking: boolean;
  error: string | null;
  isConnected: boolean;
  conversationId: string | null;
  permissionGranted: boolean;

  // Actions
  startListening: () => Promise<void>;
  stopListening: () => Promise<void>;
  speak: (text: string) => Promise<void>;
  stopSpeaking: () => void;
  startCall: (options?: {goal?: LearningGoal; scenarioId?: string}) => Promise<void>;
  endCall: () => Promise<void>;
  toggleMute: () => void;
  interrupt: () => void;
  connect: () => void;
  disconnect: () => void;
  requestPermission: () => Promise<boolean>;
}

export const useVoice = (): UseVoiceReturn => {
  const {
    voiceState,
    isCallActive,
    isMuted,
    currentTranscript,
    interimTranscript,
    isSpeaking,
    error,
    setVoiceState,
    startCall: storeStartCall,
    endCall: storeEndCall,
    toggleMute: storeToggleMute,
    setCurrentTranscript,
    setInterimTranscript,
    clearTranscript,
    setSpeaking,
    setError,
    clearError,
  } = useVoiceStore();

  const {profile} = useUserStore();

  const [isConnected, setIsConnected] = useState(false);
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const isListeningRef = useRef(false);

  // --------------------------------------------------------------------------
  // Initialize services (once)
  // --------------------------------------------------------------------------
  useEffect(() => {
    const initServices = async () => {
      await speechRecognition.initialize();
      await textToSpeech.initialize();

      // Check permission status on init (don't request yet)
      const status = await audioSessionGuard.checkPermission();
      setPermissionGranted(status === 'granted');
    };

    initServices();

    return () => {
      speechRecognition.destroy();
      textToSpeech.destroy();
    };
  }, []);

  // --------------------------------------------------------------------------
  // Speech recognition callbacks — raw PCM audio → server
  // --------------------------------------------------------------------------
  useEffect(() => {
    speechRecognition.setCallbacks({
      onStart: () => {
        setVoiceState('listening');
        clearError();
      },
      onEnd: () => {
        if (isListeningRef.current) {
          setVoiceState('processing');
        }
      },
      // Raw PCM chunk → forward to server via Socket.IO
      onAudioData: (base64) => {
        if (voiceService.isConnected()) {
          voiceService.sendAudio(base64);
        }
      },
      onVolumeChanged: (_volume) => {
        // Could drive a mic-level UI indicator here
      },
      onError: (errorMsg) => {
        setError(errorMsg);
        setVoiceState('error');
        isListeningRef.current = false;
      },
    });
  }, [setVoiceState, setError, clearError]);

  // --------------------------------------------------------------------------
  // TTS callbacks — sequential MP3 playback
  // Guard handles playback lock/unlock internally (textToSpeech.ts).
  // --------------------------------------------------------------------------
  useEffect(() => {
    textToSpeech.setCallbacks({
      onStart: () => setSpeaking(true),
      onFinish: () => {
        setSpeaking(false);
        setIsAISpeaking(false);
        setVoiceState('idle');
        // Guard has already unlocked playback (textToSpeech.playNext does it).
        // Resume listening if the call is still active.
        if (isCallActive && !isMuted) {
          startListening();
        }
      },
      onCancel: () => {
        setSpeaking(false);
        setIsAISpeaking(false);
      },
      onError: (errorMsg) => setError(errorMsg),
    });
  }, [setSpeaking, setError, isCallActive, isMuted]);

  // --------------------------------------------------------------------------
  // Voice service (Socket.IO) callbacks
  // --------------------------------------------------------------------------
  useEffect(() => {
    voiceService.connect({
      onStateChange: (state) => {
        console.log('[useVoice] Voice service state:', state);
        if (state === 'disconnected') {
          setIsConnected(false);
        } else if (state === 'idle' || state === 'listening') {
          setIsConnected(true);
        }
      },

      // Server-side Deepgram transcripts
      onTranscript: (transcript, isFinal) => {
        if (isFinal) {
          setCurrentTranscript(transcript);
        } else {
          setInterimTranscript(transcript);
        }
      },

      // Text subtitle (always emitted, even if audio fails)
      onAIChunk: (_text) => {
        // Text-only — used for subtitle display; no TTS here.
      },

      // Server-side ElevenLabs MP3 audio chunk → queue for playback
      onAIAudio: (audio, _text, _isFinal) => {
        setIsAISpeaking(true);
        textToSpeech.queueAudio(audio, _isFinal);
      },

      onAIComplete: (_text) => {
        // All chunks delivered; playback will finish via queue.
      },

      onAISpeaking: (speaking) => {
        setIsAISpeaking(speaking);
        setSpeaking(speaking);
        if (speaking) {
          setVoiceState('speaking');
          // Guard's lockForPlayback (called by TTS) already prevents mic.
          // Stop the stream explicitly if it's running.
          if (isListeningRef.current) {
            speechRecognition.stopListening();
            isListeningRef.current = false;
          }
        } else {
          setVoiceState('idle');
        }
      },

      onAIInterrupted: () => {
        textToSpeech.stop();
        setIsAISpeaking(false);
        setSpeaking(false);
      },

      onError: (errorMsg) => {
        setError(errorMsg);
      },

      onSessionStarted: async (data) => {
        setConversationId(data.conversationId);
        storeStartCall();

        // Play greeting audio if the server sent it
        if (data.greetingAudio) {
          setIsAISpeaking(true);
          await textToSpeech.queueAudio(data.greetingAudio, true);
        }
      },

      onSessionEnded: (_data) => {
        setConversationId(null);
        storeEndCall();
      },
    });

    return () => {
      voiceService.disconnect();
    };
  }, []);

  // --------------------------------------------------------------------------
  // Actions
  // --------------------------------------------------------------------------

  const requestPermission = useCallback(async (): Promise<boolean> => {
    const granted = await audioSessionGuard.requestPermission();
    setPermissionGranted(granted);
    return granted;
  }, []);

  const startListening = useCallback(async () => {
    if (isListeningRef.current || isMuted || isAISpeaking) {return;}

    try {
      clearTranscript();
      clearError();
      isListeningRef.current = true;

      // speechRecognition.startListening() now calls guard.acquireMic()
      // internally — handles permission + playback lock checks.
      const success = await speechRecognition.startListening();
      if (!success) {
        isListeningRef.current = false;
        setError('Failed to start speech recognition');
      }
    } catch (err) {
      console.error('Error starting voice recognition:', err);
      setError('Failed to start voice recognition');
      isListeningRef.current = false;
    }
  }, [isMuted, isAISpeaking, clearTranscript, clearError, setError]);

  const stopListening = useCallback(async () => {
    if (!isListeningRef.current) {return;}

    try {
      isListeningRef.current = false;
      // speechRecognition.stopListening() now calls guard.releaseMic()
      await speechRecognition.stopListening();
      if (voiceService.isConnected()) {
        voiceService.endSpeech();
      }
    } catch (err) {
      console.error('Error stopping voice recognition:', err);
    }
  }, []);

  const speak = useCallback(
    async (_text: string) => {
      // Legacy path — in voice calls audio comes from the server.
      console.warn('[useVoice] speak() is deprecated for voice calls');
    },
    [],
  );

  const stopSpeaking = useCallback(() => {
    textToSpeech.stop();
    setSpeaking(false);
    setIsAISpeaking(false);
    setVoiceState('idle');
  }, [setSpeaking, setVoiceState]);

  const startCall = useCallback(
    async (options?: {goal?: LearningGoal; scenarioId?: string}) => {
      try {
        // Connect if not connected
        if (!voiceService.isConnected()) {
          voiceService.connect({});
          await new Promise<void>(resolve => setTimeout(() => resolve(), 1000));
        }

        voiceService.startSession({
          goal: options?.goal || profile?.currentGoal,
          scenarioId: options?.scenarioId,
        });
      } catch (err) {
        console.error('Error starting call:', err);
        setError('Failed to start voice call');
      }
    },
    [profile, setError],
  );

  const endCall = useCallback(async () => {
    await stopListening();
    stopSpeaking();
    voiceService.endSession();
  }, [stopListening, stopSpeaking]);

  const toggleMute = useCallback(() => {
    if (!isMuted) {
      stopListening();
    }
    storeToggleMute();
    voiceService.setMuted(!isMuted);
  }, [isMuted, stopListening, storeToggleMute]);

  const interrupt = useCallback(() => {
    stopSpeaking();
    voiceService.interrupt();
    startListening();
  }, [stopSpeaking, startListening]);

  const connect = useCallback(() => {
    voiceService.connect({
      onStateChange: (state) => {
        setIsConnected(state !== 'disconnected');
      },
    });
  }, []);

  const disconnect = useCallback(() => {
    voiceService.disconnect();
    setIsConnected(false);
  }, []);

  return {
    voiceState,
    isCallActive,
    isMuted,
    currentTranscript,
    interimTranscript,
    isSpeaking,
    isAISpeaking,
    error,
    isConnected,
    conversationId,
    permissionGranted,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
    startCall,
    endCall,
    toggleMute,
    interrupt,
    connect,
    disconnect,
    requestPermission,
  };
};

export default useVoice;
