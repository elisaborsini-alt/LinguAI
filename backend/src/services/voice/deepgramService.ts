import WebSocket from 'ws';
import { EventEmitter } from 'events';
import { config } from '../../config';
import { logger } from '../../utils/logger';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DeepgramTranscript {
  transcript: string;
  confidence: number;
  isFinal: boolean;
  words?: Array<{
    word: string;
    start: number;
    end: number;
    confidence: number;
  }>;
  /** True when Deepgram considers the utterance fully complete */
  speechFinal: boolean;
}

export interface DeepgramSessionConfig {
  /** BCP-47 language code, e.g. 'en', 'es', 'fr' */
  language: string;
  model?: string;
  sampleRate?: number;
  channels?: number;
  encoding?: string;
}

// ---------------------------------------------------------------------------
// DeepgramService
// ---------------------------------------------------------------------------

/**
 * Manages per-voice-session WebSocket connections to Deepgram's
 * streaming speech-to-text API.
 *
 * Events emitted:
 *  - transcript  { sessionId, result: DeepgramTranscript }
 *  - utteranceEnd  { sessionId }
 *  - connected  { sessionId }
 *  - disconnected  { sessionId, code }
 *  - error  { sessionId, error }
 *  - reconnectFailed  { sessionId }
 */
export class DeepgramService extends EventEmitter {
  private connections = new Map<string, WebSocket>();
  private reconnectAttempts = new Map<string, number>();
  private static readonly MAX_RECONNECT = 3;

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  /**
   * Open a Deepgram streaming STT session.
   */
  startSession(sessionId: string, sessionConfig: DeepgramSessionConfig): void {
    // Close stale connection if one exists
    if (this.connections.has(sessionId)) {
      this.endSession(sessionId);
    }

    const dgCfg = config.voice.deepgram;

    const params = new URLSearchParams({
      model: sessionConfig.model || dgCfg.model,
      language: sessionConfig.language,
      sample_rate: String(sessionConfig.sampleRate || dgCfg.sampleRate),
      channels: String(sessionConfig.channels || dgCfg.channels),
      encoding: sessionConfig.encoding || dgCfg.encoding,
      punctuate: 'true',
      smart_format: 'true',
      interim_results: 'true',
      utterance_end_ms: '1500',
      vad_events: 'true',
      endpointing: '300',
    });

    const url = `wss://api.deepgram.com/v1/listen?${params.toString()}`;

    const ws = new WebSocket(url, {
      headers: {
        Authorization: `Token ${config.voice.deepgramApiKey}`,
      },
    });

    ws.on('open', () => {
      logger.info(`[Deepgram] Session ${sessionId} connected`);
      this.reconnectAttempts.set(sessionId, 0);
      this.emit('connected', { sessionId });
    });

    ws.on('message', (raw: Buffer) => {
      this.handleMessage(sessionId, raw);
    });

    ws.on('close', (code, reason) => {
      logger.info(
        `[Deepgram] Session ${sessionId} closed: ${code} ${reason?.toString() ?? ''}`,
      );
      this.connections.delete(sessionId);
      this.emit('disconnected', { sessionId, code });

      // Reconnect on unexpected close
      if (code !== 1000 && code !== 1001) {
        this.attemptReconnect(sessionId, sessionConfig);
      }
    });

    ws.on('error', (error) => {
      logger.error(`[Deepgram] WebSocket error (${sessionId}):`, error);
      this.emit('error', { sessionId, error });
    });

    this.connections.set(sessionId, ws);
  }

  /**
   * Forward a raw PCM audio chunk to Deepgram.
   * @param audioData  Buffer of 16-bit 16 kHz mono PCM
   */
  sendAudio(sessionId: string, audioData: Buffer): void {
    const ws = this.connections.get(sessionId);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(audioData);
    }
  }

  /**
   * Gracefully close a session.
   */
  endSession(sessionId: string): void {
    const ws = this.connections.get(sessionId);
    if (ws) {
      if (ws.readyState === WebSocket.OPEN) {
        // Deepgram protocol: send CloseStream to flush final results
        ws.send(JSON.stringify({ type: 'CloseStream' }));
      }
      ws.close(1000, 'Session ended');
      this.connections.delete(sessionId);
      this.reconnectAttempts.delete(sessionId);
    }
  }

  /**
   * Check whether a session has an active Deepgram WebSocket.
   */
  isSessionActive(sessionId: string): boolean {
    const ws = this.connections.get(sessionId);
    return ws !== undefined && ws.readyState === WebSocket.OPEN;
  }

  /**
   * Tear down all active sessions.
   */
  closeAll(): void {
    for (const sessionId of this.connections.keys()) {
      this.endSession(sessionId);
    }
  }

  // -----------------------------------------------------------------------
  // Internal
  // -----------------------------------------------------------------------

  private handleMessage(sessionId: string, raw: Buffer): void {
    try {
      const response = JSON.parse(raw.toString());

      if (response.type === 'Results') {
        const alt = response.channel?.alternatives?.[0];
        if (alt && alt.transcript) {
          const result: DeepgramTranscript = {
            transcript: alt.transcript,
            confidence: alt.confidence ?? 0,
            isFinal: response.is_final ?? false,
            words: alt.words,
            speechFinal: response.speech_final ?? false,
          };
          this.emit('transcript', { sessionId, result });
        }
      }

      if (response.type === 'UtteranceEnd') {
        this.emit('utteranceEnd', { sessionId });
      }
    } catch (error) {
      logger.error(`[Deepgram] Parse error (${sessionId}):`, error);
    }
  }

  private attemptReconnect(
    sessionId: string,
    sessionConfig: DeepgramSessionConfig,
  ): void {
    const attempts = this.reconnectAttempts.get(sessionId) || 0;
    if (attempts >= DeepgramService.MAX_RECONNECT) {
      logger.error(
        `[Deepgram] Max reconnect attempts reached for ${sessionId}`,
      );
      this.emit('reconnectFailed', { sessionId });
      return;
    }

    this.reconnectAttempts.set(sessionId, attempts + 1);
    const delay = Math.pow(2, attempts) * 1000; // 1s, 2s, 4s

    setTimeout(() => {
      logger.info(
        `[Deepgram] Reconnecting ${sessionId}, attempt ${attempts + 1}`,
      );
      this.startSession(sessionId, sessionConfig);
    }, delay);
  }
}

export default DeepgramService;
