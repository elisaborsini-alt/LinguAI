import {
  AudioContext,
  type AudioBuffer,
  type AudioBufferSourceNode,
} from 'react-native-audio-api';

import {audioSessionGuard} from './audioSessionGuard';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TTSState = 'idle' | 'speaking' | 'paused' | 'error';

export interface TTSCallbacks {
  onStart?: () => void;
  onProgress?: (event: {location: number; length: number}) => void;
  onFinish?: () => void;
  onCancel?: () => void;
  onError?: (error: string) => void;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

/**
 * Plays MP3 audio buffers received from the server (ElevenLabs).
 *
 * Audio chunks arrive as base64 strings via Socket.IO.  Each chunk is
 * decoded via `react-native-audio-api`'s AudioContext, pushed into a FIFO
 * queue, and played sequentially so sentences flow naturally.
 *
 * react-native-audio-api v0.3 API notes:
 *  - `decodeAudioDataSource(url)` accepts a URL (including data URIs) and
 *    calls native `decodeAudioData` under the hood.
 *  - `AudioBufferSourceNode` has no `onended` event — we derive playback
 *    duration from `AudioBuffer.duration` and schedule the next chunk via
 *    `setTimeout`.
 */
class TextToSpeechService {
  private callbacks: TTSCallbacks = {};
  private state: TTSState = 'idle';
  private isInitialized: boolean = false;

  private audioContext: AudioContext | null = null;
  private queue: string[] = []; // base64 MP3 strings waiting to play
  private isPlaying: boolean = false;
  private currentSource: AudioBufferSourceNode | null = null;
  private nextChunkTimer: ReturnType<typeof setTimeout> | null = null;

  // -------------------------------------------------------------------------
  // Lifecycle
  // -------------------------------------------------------------------------

  async initialize(): Promise<boolean> {
    if (this.isInitialized) {
      return true;
    }
    try {
      this.audioContext = new AudioContext();
      this.isInitialized = true;
      console.log('[TTS] Initialized (AudioContext)');
      return true;
    } catch (error) {
      console.error('[TTS] Initialization error:', error);
      return false;
    }
  }

  setCallbacks(callbacks: TTSCallbacks): void {
    this.callbacks = callbacks;
  }

  destroy(): void {
    this.stop();
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.isInitialized = false;
    this.state = 'idle';
    console.log('[TTS] Destroyed');
  }

  // Language / rate are handled server-side — no-ops.
  async setLanguage(_code: string, _variant?: string): Promise<void> {}
  async setRate(_rate: number): Promise<void> {}
  async setRateForLevel(_level: string): Promise<void> {}
  async setPitch(_pitch: number): Promise<void> {}

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  /**
   * Enqueue a base64-encoded MP3 chunk for sequential playback.
   * Called once per `ai:audio` event from the server.
   */
  async queueAudio(base64MP3: string, _isFinal: boolean = false): Promise<void> {
    if (!this.isInitialized) {
      const ok = await this.initialize();
      if (!ok) {
        this.callbacks.onError?.('AudioContext not available');
        return;
      }
    }

    this.queue.push(base64MP3);

    if (!this.isPlaying) {
      this.playNext();
    }
  }

  /**
   * Stop all playback and clear the queue.
   */
  async stop(): Promise<void> {
    this.queue = [];

    if (this.nextChunkTimer) {
      clearTimeout(this.nextChunkTimer);
      this.nextChunkTimer = null;
    }

    if (this.currentSource) {
      try {
        this.currentSource.stop();
      } catch {
        // Already stopped
      }
      this.currentSource = null;
    }

    this.isPlaying = false;
    this.state = 'idle';
    await audioSessionGuard.unlockPlayback();
    this.callbacks.onCancel?.();
  }

  /**
   * @deprecated — TTS synthesis is now server-side.
   */
  async speak(_text: string): Promise<void> {
    console.warn('[TTS] speak() is deprecated — audio is now server-side');
  }

  /**
   * @deprecated — TTS synthesis is now server-side.
   */
  async speakChunk(_text: string, _isLast: boolean = false): Promise<void> {
    console.warn('[TTS] speakChunk() is deprecated — audio is now server-side');
  }

  pause(): void {
    // react-native-audio-api AudioContext doesn't expose suspend/resume
    if (this.state === 'speaking') {
      this.state = 'paused';
    }
  }

  resume(): void {
    if (this.state === 'paused') {
      this.state = 'speaking';
    }
  }

  getState(): TTSState {
    return this.state;
  }

  isSpeaking(): boolean {
    return this.state === 'speaking';
  }

  // -------------------------------------------------------------------------
  // Internal: sequential queue playback
  // -------------------------------------------------------------------------

  private async playNext(): Promise<void> {
    if (!this.audioContext || this.queue.length === 0) {
      this.isPlaying = false;
      if (this.state === 'speaking') {
        this.state = 'idle';
        await audioSessionGuard.unlockPlayback();
        this.callbacks.onFinish?.();
      }
      return;
    }

    // First chunk → lock for playback and notify start
    if (!this.isPlaying) {
      await audioSessionGuard.lockForPlayback();
      this.isPlaying = true;
      this.state = 'speaking';
      this.callbacks.onStart?.();
    }

    const base64 = this.queue.shift()!;

    try {
      // Convert base64 MP3 → data URI → AudioBuffer via native decoding
      const dataUri = `data:audio/mpeg;base64,${base64}`;
      const audioBuffer: AudioBuffer = await this.audioContext.decodeAudioDataSource(dataUri);

      const source: AudioBufferSourceNode = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.audioContext.destination);
      this.currentSource = source;

      source.start(0);

      // No onended event in react-native-audio-api — schedule next chunk
      // using the buffer's duration (+ small safety margin).
      const durationMs = audioBuffer.duration * 1000 + 50;
      this.nextChunkTimer = setTimeout(() => {
        this.currentSource = null;
        this.nextChunkTimer = null;
        this.playNext();
      }, durationMs);
    } catch (error: unknown) {
      console.error('[TTS] Playback error:', error);
      const message = error instanceof Error ? error.message : 'Audio decode/playback failed';
      this.callbacks.onError?.(message);
      // Skip bad chunk and try next
      this.currentSource = null;
      this.playNext();
    }
  }
}

// Export singleton instance
export const textToSpeech = new TextToSpeechService();

export default textToSpeech;
