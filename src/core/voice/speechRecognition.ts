import LiveAudioStream from 'react-native-live-audio-stream';

import {audioSessionGuard} from './audioSessionGuard';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SpeechRecognitionState =
  | 'idle'
  | 'starting'
  | 'listening'
  | 'error';

export interface SpeechRecognitionCallbacks {
  onStart?: () => void;
  onEnd?: () => void;
  /** Raw PCM audio chunk encoded as base64 — send straight to the server */
  onAudioData?: (base64: string) => void;
  onError?: (error: string) => void;
  onVolumeChanged?: (volume: number) => void;
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const AUDIO_CONFIG = {
  sampleRate: 16000,
  channels: 1,
  bitsPerSample: 16,
  audioSource: 6, // VOICE_RECOGNITION on Android
  bufferSize: 2048, // ~128 ms at 16 kHz mono 16-bit
  wavFile: '', // Not saving to file — streaming only
};

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

class SpeechRecognitionService {
  private callbacks: SpeechRecognitionCallbacks = {};
  private state: SpeechRecognitionState = 'idle';
  private isInitialized: boolean = false;

  /**
   * Initialize the live audio stream (one-time setup).
   */
  async initialize(): Promise<boolean> {
    if (this.isInitialized) {
      return true;
    }

    try {
      LiveAudioStream.init(AUDIO_CONFIG);

      LiveAudioStream.on('data', (base64: string) => {
        this.callbacks.onAudioData?.(base64);

        // Derive approximate volume for UI visualisation
        const volume = this.calculateVolume(base64);
        this.callbacks.onVolumeChanged?.(volume);
      });

      this.isInitialized = true;
      console.log('[SpeechRecognition] Initialized (live-audio-stream)');
      return true;
    } catch (error) {
      console.error('[SpeechRecognition] Initialization error:', error);
      return false;
    }
  }

  /**
   * Set callbacks for speech events.
   */
  setCallbacks(callbacks: SpeechRecognitionCallbacks): void {
    this.callbacks = callbacks;
  }

  /**
   * Language is now configured server-side in Deepgram — no-op here.
   */
  setLanguage(_languageCode: string, _variant?: string): void {
    // Server-side Deepgram session carries the language.
  }

  /**
   * Start capturing raw PCM audio from the microphone.
   */
  async startListening(): Promise<boolean> {
    // Guard: acquire mic (checks permission, prevents double-start & playback overlap)
    const allowed = await audioSessionGuard.acquireMic();
    if (!allowed) {
      this.callbacks.onError?.('Microphone not available');
      return false;
    }

    if (!this.isInitialized) {
      const ok = await this.initialize();
      if (!ok) {
        await audioSessionGuard.releaseMic();
        this.callbacks.onError?.('Audio capture not available');
        return false;
      }
    }

    if (this.state === 'listening') {
      return true;
    }

    try {
      this.state = 'starting';
      LiveAudioStream.start();
      this.state = 'listening';
      this.callbacks.onStart?.();
      console.log('[SpeechRecognition] Started listening');
      return true;
    } catch (error: any) {
      console.error('[SpeechRecognition] Start error:', error);
      this.state = 'error';
      await audioSessionGuard.releaseMic();
      this.callbacks.onError?.(error.message || 'Failed to start audio capture');
      return false;
    }
  }

  /**
   * Stop capturing audio.
   */
  async stopListening(): Promise<void> {
    if (this.state !== 'listening' && this.state !== 'starting') {
      return;
    }

    try {
      await LiveAudioStream.stop();
      this.state = 'idle';
      await audioSessionGuard.releaseMic();
      this.callbacks.onEnd?.();
      console.log('[SpeechRecognition] Stopped listening');
    } catch (error: any) {
      console.error('[SpeechRecognition] Stop error:', error);
      await audioSessionGuard.releaseMic();
      this.callbacks.onError?.(error.message || 'Failed to stop audio capture');
    }
  }

  /**
   * Cancel = stop (no separate concept for raw streams).
   */
  async cancel(): Promise<void> {
    await this.stopListening();
  }

  /**
   * Tear down the audio stream entirely.
   */
  async destroy(): Promise<void> {
    await this.stopListening();
    this.isInitialized = false;
    console.log('[SpeechRecognition] Destroyed');
  }

  getState(): SpeechRecognitionState {
    return this.state;
  }

  isListening(): boolean {
    return this.state === 'listening';
  }

  // --------------------------------------------------------------------------
  // Internal helpers
  // --------------------------------------------------------------------------

  /**
   * Compute an RMS-based volume level (0–1) from a base64-encoded
   * 16-bit PCM buffer.  Used to drive the mic-level UI indicator.
   */
  private calculateVolume(base64: string): number {
    try {
      const bytes = this.decodeBase64(base64);
      if (bytes.length < 2) {return 0;}

      let sum = 0;
      const sampleCount = bytes.length / 2;
      for (let i = 0; i < bytes.length; i += 2) {
        // Little-endian 16-bit signed
        const lo = bytes[i];
        const hi = bytes[i + 1];
        const sample = ((hi << 8) | lo) << 16 >> 16; // sign-extend
        sum += sample * sample;
      }
      const rms = Math.sqrt(sum / sampleCount);
      return Math.min(1, rms / 32768);
    } catch {
      return 0;
    }
  }

  /** Minimal base64 → Uint8Array decoder (no Buffer/atob dependency). */
  private decodeBase64(input: string): Uint8Array {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    const lookup = new Uint8Array(128);
    for (let i = 0; i < chars.length; i++) {
      lookup[chars.charCodeAt(i)] = i;
    }

    // Strip padding
    let len = input.length;
    while (len > 0 && input[len - 1] === '=') {len--;}

    const outLen = (len * 3) >> 2;
    const out = new Uint8Array(outLen);
    let j = 0;

    for (let i = 0; i < len; i += 4) {
      const a = lookup[input.charCodeAt(i)];
      const b = i + 1 < len ? lookup[input.charCodeAt(i + 1)] : 0;
      const c = i + 2 < len ? lookup[input.charCodeAt(i + 2)] : 0;
      const d = i + 3 < len ? lookup[input.charCodeAt(i + 3)] : 0;

      out[j++] = (a << 2) | (b >> 4);
      if (j < outLen) {out[j++] = ((b & 0x0f) << 4) | (c >> 2);}
      if (j < outLen) {out[j++] = ((c & 0x03) << 6) | d;}
    }

    return out;
  }
}

// Export singleton instance
export const speechRecognition = new SpeechRecognitionService();

export default speechRecognition;
