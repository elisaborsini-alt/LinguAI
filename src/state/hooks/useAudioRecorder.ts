import {useState, useCallback, useRef, useEffect} from 'react';
import LiveAudioStream from 'react-native-live-audio-stream';
import RNFS from 'react-native-fs';
import {Platform} from 'react-native';

interface AudioRecorderOptions {
  maxDuration?: number; // seconds
  sampleRate?: number;
  channels?: 1 | 2;
  bitsPerSample?: 8 | 16;
  onAudioLevel?: (level: number) => void;
  onDurationUpdate?: (duration: number) => void;
}

interface AudioRecorderState {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  audioLevel: number;
  recordingUri: string | null;
  error: string | null;
}

interface AudioRecorderActions {
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<string | null>;
  pauseRecording: () => void;
  resumeRecording: () => void;
  cancelRecording: () => void;
  reset: () => void;
}

const DEFAULT_OPTIONS: Required<Omit<AudioRecorderOptions, 'onAudioLevel' | 'onDurationUpdate'>> = {
  maxDuration: 30,
  sampleRate: 44100,
  channels: 1,
  bitsPerSample: 16,
};

export function useAudioRecorder(
  options: AudioRecorderOptions = {},
): AudioRecorderState & AudioRecorderActions {
  const mergedOptions = {...DEFAULT_OPTIONS, ...options};

  const [state, setState] = useState<AudioRecorderState>({
    isRecording: false,
    isPaused: false,
    duration: 0,
    audioLevel: 0,
    recordingUri: null,
    error: null,
  });

  const audioDataRef = useRef<number[]>([]);
  const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const recordingIdRef = useRef<string>('');

  // Calculate audio level from raw PCM data
  const calculateAudioLevel = useCallback((data: number[]): number => {
    if (data.length === 0) return 0;

    // Calculate RMS (Root Mean Square)
    const sum = data.reduce((acc, sample) => acc + sample * sample, 0);
    const rms = Math.sqrt(sum / data.length);

    // Normalize to 0-1 range (assuming 16-bit audio)
    const maxValue = 32768;
    const normalized = Math.min(rms / maxValue, 1);

    // Apply some smoothing/scaling for better visualization
    return Math.pow(normalized, 0.5);
  }, []);

  // Convert base64 audio chunk to samples
  const decodeAudioChunk = useCallback((base64Data: string): number[] => {
    try {
      // Decode base64 to binary string
      const binaryString = atob(base64Data);
      const samples: number[] = [];

      // Convert to 16-bit samples
      for (let i = 0; i < binaryString.length; i += 2) {
        const low = binaryString.charCodeAt(i);
        const high = binaryString.charCodeAt(i + 1);
        // Combine bytes (little-endian)
        let sample = (high << 8) | low;
        // Convert to signed
        if (sample >= 32768) sample -= 65536;
        samples.push(sample);
      }

      return samples;
    } catch {
      return [];
    }
  }, []);

  // Generate output file path
  const generateRecordingPath = useCallback((): string => {
    const timestamp = Date.now();
    const dir =
      Platform.OS === 'ios'
        ? RNFS.DocumentDirectoryPath
        : RNFS.CachesDirectoryPath;
    return `${dir}/pronunciation_${timestamp}.wav`;
  }, []);

  // Create WAV file from PCM data
  const createWavFile = useCallback(
    async (samples: number[], filePath: string): Promise<void> => {
      const {sampleRate, channels, bitsPerSample} = mergedOptions;
      const byteRate = (sampleRate * channels * bitsPerSample) / 8;
      const blockAlign = (channels * bitsPerSample) / 8;
      const dataSize = samples.length * 2; // 16-bit = 2 bytes per sample

      // WAV header (44 bytes)
      const header = new ArrayBuffer(44);
      const view = new DataView(header);

      // "RIFF" chunk descriptor
      writeString(view, 0, 'RIFF');
      view.setUint32(4, 36 + dataSize, true);
      writeString(view, 8, 'WAVE');

      // "fmt " sub-chunk
      writeString(view, 12, 'fmt ');
      view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
      view.setUint16(20, 1, true); // AudioFormat (1 = PCM)
      view.setUint16(22, channels, true);
      view.setUint32(24, sampleRate, true);
      view.setUint32(28, byteRate, true);
      view.setUint16(32, blockAlign, true);
      view.setUint16(34, bitsPerSample, true);

      // "data" sub-chunk
      writeString(view, 36, 'data');
      view.setUint32(40, dataSize, true);

      // Convert header to base64
      const headerArray = new Uint8Array(header);
      let headerBase64 = '';
      for (let i = 0; i < headerArray.length; i++) {
        headerBase64 += String.fromCharCode(headerArray[i]);
      }
      headerBase64 = btoa(headerBase64);

      // Convert samples to base64
      const dataBuffer = new ArrayBuffer(dataSize);
      const dataView = new DataView(dataBuffer);
      samples.forEach((sample, i) => {
        dataView.setInt16(i * 2, sample, true);
      });

      const dataArray = new Uint8Array(dataBuffer);
      let dataBase64 = '';
      // Process in chunks to avoid call stack issues
      const chunkSize = 32768;
      for (let i = 0; i < dataArray.length; i += chunkSize) {
        const chunk = dataArray.slice(i, i + chunkSize);
        for (let j = 0; j < chunk.length; j++) {
          dataBase64 += String.fromCharCode(chunk[j]);
        }
      }
      dataBase64 = btoa(dataBase64);

      // Combine and write to file
      const combinedBase64 = headerBase64 + dataBase64;
      await RNFS.writeFile(filePath, combinedBase64, 'base64');
    },
    [mergedOptions],
  );

  // Helper to write string to DataView
  const writeString = (view: DataView, offset: number, str: string): void => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  // Start recording
  const startRecording = useCallback(async (): Promise<void> => {
    try {
      setState(prev => ({...prev, error: null, recordingUri: null}));

      // Initialize audio stream
      LiveAudioStream.init({
        sampleRate: mergedOptions.sampleRate,
        channels: mergedOptions.channels as number,
        bitsPerSample: mergedOptions.bitsPerSample as number,
        audioSource: 6, // VOICE_RECOGNITION
        bufferSize: 4096,
        wavFile: '', // Not using wav file output, streaming raw PCM
      });

      // Clear previous data
      audioDataRef.current = [];
      recordingIdRef.current = `rec_${Date.now()}`;
      startTimeRef.current = Date.now();

      // Handle audio data
      LiveAudioStream.on('data', (base64Data: string) => {
        const samples = decodeAudioChunk(base64Data);
        audioDataRef.current.push(...samples);

        // Calculate and report audio level
        const level = calculateAudioLevel(samples);
        setState(prev => ({...prev, audioLevel: level}));
        options.onAudioLevel?.(level);
      });

      // Start recording
      LiveAudioStream.start();

      // Start duration timer
      durationIntervalRef.current = setInterval(() => {
        const elapsed = (Date.now() - startTimeRef.current) / 1000;
        setState(prev => ({...prev, duration: elapsed}));
        options.onDurationUpdate?.(elapsed);

        // Check max duration
        if (elapsed >= mergedOptions.maxDuration) {
          stopRecording();
        }
      }, 100);

      setState(prev => ({...prev, isRecording: true, duration: 0}));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to start recording';
      setState(prev => ({...prev, error: message}));
    }
  }, [mergedOptions, options, decodeAudioChunk, calculateAudioLevel]);

  // Stop recording and save file
  const stopRecording = useCallback(async (): Promise<string | null> => {
    try {
      // Stop the audio stream
      LiveAudioStream.stop();

      // Clear duration timer
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }

      // Check if we have audio data
      if (audioDataRef.current.length === 0) {
        setState(prev => ({
          ...prev,
          isRecording: false,
          audioLevel: 0,
          error: 'No audio data recorded',
        }));
        return null;
      }

      // Generate file path and save WAV
      const filePath = generateRecordingPath();
      await createWavFile(audioDataRef.current, filePath);

      const fileUri = Platform.OS === 'ios' ? filePath : `file://${filePath}`;

      setState(prev => ({
        ...prev,
        isRecording: false,
        audioLevel: 0,
        recordingUri: fileUri,
      }));

      return fileUri;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save recording';
      setState(prev => ({
        ...prev,
        isRecording: false,
        audioLevel: 0,
        error: message,
      }));
      return null;
    }
  }, [generateRecordingPath, createWavFile]);

  // Pause recording (not all platforms support this)
  const pauseRecording = useCallback((): void => {
    // LiveAudioStream doesn't support pause, so we simulate it
    // by stopping the timer
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
    setState(prev => ({...prev, isPaused: true}));
  }, []);

  // Resume recording
  const resumeRecording = useCallback((): void => {
    if (state.isPaused) {
      const currentDuration = state.duration;
      startTimeRef.current = Date.now() - currentDuration * 1000;

      durationIntervalRef.current = setInterval(() => {
        const elapsed = (Date.now() - startTimeRef.current) / 1000;
        setState(prev => ({...prev, duration: elapsed}));
        options.onDurationUpdate?.(elapsed);
      }, 100);

      setState(prev => ({...prev, isPaused: false}));
    }
  }, [state.isPaused, state.duration, options]);

  // Cancel recording without saving
  const cancelRecording = useCallback((): void => {
    LiveAudioStream.stop();

    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }

    audioDataRef.current = [];

    setState(prev => ({
      ...prev,
      isRecording: false,
      isPaused: false,
      duration: 0,
      audioLevel: 0,
    }));
  }, []);

  // Reset state
  const reset = useCallback((): void => {
    if (state.isRecording) {
      cancelRecording();
    }

    // Delete previous recording file if exists
    if (state.recordingUri) {
      const filePath = state.recordingUri.replace('file://', '');
      RNFS.unlink(filePath).catch(() => {
        // Ignore errors during cleanup
      });
    }

    audioDataRef.current = [];
    setState({
      isRecording: false,
      isPaused: false,
      duration: 0,
      audioLevel: 0,
      recordingUri: null,
      error: null,
    });
  }, [state.isRecording, state.recordingUri, cancelRecording]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
      LiveAudioStream.stop();
    };
  }, []);

  return {
    ...state,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    cancelRecording,
    reset,
  };
}

export default useAudioRecorder;
