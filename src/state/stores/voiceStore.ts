import type {VoiceState, VoiceConfig} from '@appTypes/domain';
import {create} from 'zustand';
import {immer} from 'zustand/middleware/immer';


interface VoiceStoreState {
  // Voice state
  voiceState: VoiceState;
  isCallActive: boolean;
  isMuted: boolean;
  isSpeakerOn: boolean;

  // Speech recognition
  currentTranscript: string;
  interimTranscript: string;
  recognitionConfidence: number;

  // Text-to-speech
  isSpeaking: boolean;
  speakingProgress: number; // 0-100

  // Configuration
  config: VoiceConfig;

  // Audio levels
  inputLevel: number; // 0-100, microphone input level
  outputLevel: number; // 0-100, speaker output level

  // Error handling
  error: string | null;

  // Actions
  setVoiceState: (state: VoiceState) => void;
  startCall: () => void;
  endCall: () => void;
  toggleMute: () => void;
  toggleSpeaker: () => void;

  setCurrentTranscript: (transcript: string) => void;
  setInterimTranscript: (transcript: string) => void;
  appendTranscript: (text: string) => void;
  clearTranscript: () => void;
  setRecognitionConfidence: (confidence: number) => void;

  setSpeaking: (speaking: boolean) => void;
  setSpeakingProgress: (progress: number) => void;

  setConfig: (config: Partial<VoiceConfig>) => void;

  setInputLevel: (level: number) => void;
  setOutputLevel: (level: number) => void;

  setError: (error: string | null) => void;
  clearError: () => void;

  reset: () => void;
}

const defaultConfig: VoiceConfig = {
  language: 'en-US',
  voiceId: 'default',
  speed: 1.0,
  pitch: 1.0,
};

export const useVoiceStore = create<VoiceStoreState>()(
  immer((set) => ({
    // Initial state
    voiceState: 'idle',
    isCallActive: false,
    isMuted: false,
    isSpeakerOn: true,
    currentTranscript: '',
    interimTranscript: '',
    recognitionConfidence: 0,
    isSpeaking: false,
    speakingProgress: 0,
    config: defaultConfig,
    inputLevel: 0,
    outputLevel: 0,
    error: null,

    // Actions
    setVoiceState: (voiceState) =>
      set((state) => {
        state.voiceState = voiceState;
      }),

    startCall: () =>
      set((state) => {
        state.isCallActive = true;
        state.voiceState = 'idle';
        state.isMuted = false;
        state.currentTranscript = '';
        state.interimTranscript = '';
        state.error = null;
      }),

    endCall: () =>
      set((state) => {
        state.isCallActive = false;
        state.voiceState = 'idle';
        state.isMuted = false;
        state.currentTranscript = '';
        state.interimTranscript = '';
        state.isSpeaking = false;
        state.speakingProgress = 0;
        state.inputLevel = 0;
        state.outputLevel = 0;
      }),

    toggleMute: () =>
      set((state) => {
        state.isMuted = !state.isMuted;
      }),

    toggleSpeaker: () =>
      set((state) => {
        state.isSpeakerOn = !state.isSpeakerOn;
      }),

    setCurrentTranscript: (transcript) =>
      set((state) => {
        state.currentTranscript = transcript;
      }),

    setInterimTranscript: (transcript) =>
      set((state) => {
        state.interimTranscript = transcript;
      }),

    appendTranscript: (text) =>
      set((state) => {
        state.currentTranscript += text;
      }),

    clearTranscript: () =>
      set((state) => {
        state.currentTranscript = '';
        state.interimTranscript = '';
      }),

    setRecognitionConfidence: (confidence) =>
      set((state) => {
        state.recognitionConfidence = confidence;
      }),

    setSpeaking: (speaking) =>
      set((state) => {
        state.isSpeaking = speaking;
        state.voiceState = speaking ? 'speaking' : 'idle';
        if (!speaking) {
          state.speakingProgress = 0;
        }
      }),

    setSpeakingProgress: (progress) =>
      set((state) => {
        state.speakingProgress = progress;
      }),

    setConfig: (config) =>
      set((state) => {
        state.config = {...state.config, ...config};
      }),

    setInputLevel: (level) =>
      set((state) => {
        state.inputLevel = Math.min(100, Math.max(0, level));
      }),

    setOutputLevel: (level) =>
      set((state) => {
        state.outputLevel = Math.min(100, Math.max(0, level));
      }),

    setError: (error) =>
      set((state) => {
        state.error = error;
        state.voiceState = error ? 'error' : state.voiceState;
      }),

    clearError: () =>
      set((state) => {
        state.error = null;
        if (state.voiceState === 'error') {
          state.voiceState = 'idle';
        }
      }),

    reset: () =>
      set((state) => {
        state.voiceState = 'idle';
        state.isCallActive = false;
        state.isMuted = false;
        state.isSpeakerOn = true;
        state.currentTranscript = '';
        state.interimTranscript = '';
        state.recognitionConfidence = 0;
        state.isSpeaking = false;
        state.speakingProgress = 0;
        state.inputLevel = 0;
        state.outputLevel = 0;
        state.error = null;
      }),
  })),
);

// Selectors
export const selectVoiceState = (state: VoiceStoreState) => state.voiceState;
export const selectIsCallActive = (state: VoiceStoreState) => state.isCallActive;
export const selectIsMuted = (state: VoiceStoreState) => state.isMuted;
export const selectCurrentTranscript = (state: VoiceStoreState) =>
  state.currentTranscript;
export const selectInterimTranscript = (state: VoiceStoreState) =>
  state.interimTranscript;
export const selectIsSpeaking = (state: VoiceStoreState) => state.isSpeaking;
export const selectVoiceConfig = (state: VoiceStoreState) => state.config;
export const selectVoiceError = (state: VoiceStoreState) => state.error;
