import {io, Socket} from 'socket.io-client';
import {storage} from '@data/storage/mmkv';
import {API_BASE_URL} from '@utils/constants';

export type VoiceSessionState =
  | 'disconnected'
  | 'connecting'
  | 'idle'
  | 'listening'
  | 'processing'
  | 'speaking'
  | 'interrupted'
  | 'ended';

export interface VoiceCallbacks {
  onStateChange: (state: VoiceSessionState) => void;
  onTranscript: (transcript: string, isFinal: boolean) => void;
  onAIChunk: (text: string) => void;
  onAIComplete: (text: string) => void;
  /** Server-side ElevenLabs MP3 audio chunk */
  onAIAudio: (audio: string, text: string, isFinal: boolean) => void;
  onAISpeaking: (isSpeaking: boolean) => void;
  onAIInterrupted: () => void;
  onError: (error: string) => void;
  onSessionStarted: (data: {sessionId: string; conversationId: string; greeting?: string; greetingAudio?: string}) => void;
  onSessionEnded: (data: {reason: string; duration: number; messageCount: number}) => void;
}

class VoiceService {
  private socket: Socket | null = null;
  private callbacks: Partial<VoiceCallbacks> = {};
  private currentState: VoiceSessionState = 'disconnected';
  private sessionId: string | null = null;
  private conversationId: string | null = null;

  /**
   * Initialize voice service connection
   */
  connect(callbacks: Partial<VoiceCallbacks>): void {
    this.callbacks = callbacks;

    const token = storage.getString('accessToken');
    if (!token) {
      this.emitError('Not authenticated');
      return;
    }

    this.setState('connecting');

    // Connect to WebSocket server
    this.socket = io(API_BASE_URL.replace('/api', ''), {
      auth: {token},
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.setupSocketListeners();
  }

  /**
   * Set up socket event listeners
   */
  private setupSocketListeners(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('[VoiceService] Connected to server');
      this.setState('idle');
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[VoiceService] Disconnected:', reason);
      this.setState('disconnected');
    });

    this.socket.on('connect_error', (error) => {
      console.error('[VoiceService] Connection error:', error);
      this.emitError('Failed to connect to voice server');
      this.setState('disconnected');
    });

    // Voice session events
    this.socket.on('voice:started', (data) => {
      console.log('[VoiceService] Session started:', data);
      this.sessionId = data.sessionId;
      this.conversationId = data.conversationId;
      this.callbacks.onSessionStarted?.(data);
      this.setState('idle');
    });

    this.socket.on('voice:transcript', (data) => {
      this.callbacks.onTranscript?.(data.transcript, data.isFinal);
    });

    this.socket.on('voice:error', (data) => {
      this.emitError(data.message);
    });

    // AI response events
    this.socket.on('ai:speaking', (data) => {
      this.callbacks.onAISpeaking?.(data.isSpeaking);
      if (data.isSpeaking) {
        this.setState('speaking');
      } else {
        this.setState('idle');
      }
    });

    this.socket.on('ai:chunk', (data) => {
      this.callbacks.onAIChunk?.(data.text);
    });

    this.socket.on('ai:audio', (data) => {
      this.callbacks.onAIAudio?.(data.audio, data.text, data.isFinal);
    });

    this.socket.on('ai:complete', (data) => {
      this.callbacks.onAIComplete?.(data.text);
    });

    this.socket.on('ai:interrupted', () => {
      this.callbacks.onAIInterrupted?.();
      this.setState('interrupted');
    });

    this.socket.on('ai:stopped', () => {
      this.callbacks.onAISpeaking?.(false);
      this.setState('listening');
    });

    this.socket.on('ai:error', (data) => {
      this.emitError(data.message);
    });

    // Session events
    this.socket.on('session:ended', (data) => {
      console.log('[VoiceService] Session ended:', data);
      this.callbacks.onSessionEnded?.(data);
      this.sessionId = null;
      this.conversationId = null;
      this.setState('ended');
    });
  }

  /**
   * Start a voice conversation session
   */
  startSession(options?: {
    conversationId?: string;
    goal?: string;
    scenarioId?: string;
  }): void {
    if (!this.socket?.connected) {
      this.emitError('Not connected to server');
      return;
    }

    this.socket.emit('voice:start', {
      conversationId: options?.conversationId,
      goal: options?.goal,
      scenarioId: options?.scenarioId,
    });
  }

  /**
   * Send speech transcript to server
   */
  sendSpeech(transcript: string, isFinal: boolean): void {
    if (!this.socket?.connected || !this.sessionId) {
      return;
    }

    this.socket.emit('voice:speech', {transcript, isFinal});

    if (isFinal) {
      this.setState('processing');
    } else {
      this.setState('listening');
    }
  }

  /**
   * Send raw PCM audio (base64) to server for Deepgram STT.
   * Uses volatile emit — drops silently if the transport isn't ready.
   */
  sendAudio(base64: string): void {
    if (!this.socket?.connected || !this.sessionId) {
      return;
    }

    this.socket.volatile.emit('voice:audio', {audio: base64});
  }

  /**
   * Signal that user finished speaking
   */
  endSpeech(): void {
    if (!this.socket?.connected || !this.sessionId) {
      return;
    }

    this.socket.emit('voice:speechEnd');
    this.setState('processing');
  }

  /**
   * Interrupt AI speech
   */
  interrupt(): void {
    if (!this.socket?.connected || !this.sessionId) {
      return;
    }

    this.socket.emit('voice:interrupt');
    this.setState('interrupted');
  }

  /**
   * Set mute state
   */
  setMuted(muted: boolean): void {
    if (!this.socket?.connected) {
      return;
    }

    this.socket.emit('voice:mute', {muted});
  }

  /**
   * End the voice session
   */
  endSession(): void {
    if (!this.socket?.connected) {
      return;
    }

    this.socket.emit('voice:end');
    this.sessionId = null;
    this.setState('ended');
  }

  /**
   * Get current state
   */
  getState(): VoiceSessionState {
    return this.currentState;
  }

  /**
   * Get current session ID
   */
  getSessionId(): string | null {
    return this.sessionId;
  }

  /**
   * Get current conversation ID
   */
  getConversationId(): string | null {
    return this.conversationId;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  /**
   * Disconnect from server
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.sessionId = null;
    this.conversationId = null;
    this.setState('disconnected');
  }

  /**
   * Reconnect to server
   */
  reconnect(): void {
    if (this.socket) {
      this.socket.connect();
    } else {
      this.connect(this.callbacks);
    }
  }

  /**
   * Update state and notify listeners
   */
  private setState(state: VoiceSessionState): void {
    if (this.currentState !== state) {
      this.currentState = state;
      this.callbacks.onStateChange?.(state);
    }
  }

  /**
   * Emit error to listeners
   */
  private emitError(message: string): void {
    console.error('[VoiceService] Error:', message);
    this.callbacks.onError?.(message);
  }
}

// Export singleton instance
export const voiceService = new VoiceService();

export default voiceService;
