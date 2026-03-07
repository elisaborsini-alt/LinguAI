import { config } from '../../config';
import { logger } from '../../utils/logger';
import { LanguageCode } from '../../types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ElevenLabsVoiceConfig {
  voiceId: string;
  modelId?: string;
  outputFormat?: string;
  stability?: number;
  similarityBoost?: number;
  style?: number;
}

// ---------------------------------------------------------------------------
// ElevenLabsService
// ---------------------------------------------------------------------------

/**
 * Converts text to speech using the ElevenLabs streaming HTTP API.
 *
 * Each call to `streamSpeech` POSTs a sentence to the
 * `/v1/text-to-speech/{voice_id}/stream` endpoint and yields
 * MP3 audio chunks as they arrive from the response body.
 */
export class ElevenLabsService {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.elevenlabs.io/v1';
  private static readonly REQUEST_TIMEOUT_MS = 10_000;

  constructor() {
    this.apiKey = config.voice.elevenlabsApiKey || '';
  }

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  /**
   * Pick the right ElevenLabs voice ID based on user's language and gender
   * preference.  Falls back to English female if nothing matches.
   */
  selectVoice(
    languageCode: LanguageCode,
    voiceGender: 'male' | 'female' = 'female',
  ): string {
    const voices = config.voice.elevenLabs.voices;
    const langVoices = voices[languageCode] || voices['en'];
    return langVoices[voiceGender] || langVoices['female'];
  }

  /**
   * Stream TTS for a piece of text (typically one sentence).
   *
   * Yields MP3 audio `Buffer` chunks as they arrive from
   * the ElevenLabs streaming endpoint.
   */
  async *streamSpeech(
    text: string,
    voiceConfig: ElevenLabsVoiceConfig,
  ): AsyncGenerator<Buffer, void, unknown> {
    if (!this.apiKey) {
      throw new Error('ELEVENLABS_API_KEY is not configured');
    }

    const elCfg = config.voice.elevenLabs;
    const url = `${this.baseUrl}/text-to-speech/${voiceConfig.voiceId}/stream`;

    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      ElevenLabsService.REQUEST_TIMEOUT_MS,
    );

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'xi-api-key': this.apiKey,
          'Content-Type': 'application/json',
          Accept: 'audio/mpeg',
        },
        body: JSON.stringify({
          text,
          model_id: voiceConfig.modelId || elCfg.model,
          voice_settings: {
            stability: voiceConfig.stability ?? 0.5,
            similarity_boost: voiceConfig.similarityBoost ?? 0.75,
            style: voiceConfig.style ?? 0.0,
          },
          output_format: voiceConfig.outputFormat || elCfg.outputFormat,
        }),
        signal: controller.signal,
      });
    } catch (error: any) {
      clearTimeout(timeout);
      if (error.name === 'AbortError') {
        logger.warn('[ElevenLabs] TTS request timed out');
        throw new Error('ElevenLabs TTS request timed out');
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '(unreadable)');
      logger.error(
        `[ElevenLabs] API ${response.status}: ${errorBody.slice(0, 200)}`,
      );
      throw new Error(`ElevenLabs API error: ${response.status}`);
    }

    if (!response.body) {
      throw new Error('ElevenLabs returned no response body');
    }

    // Stream the response using a Node.js-compatible reader.
    // Node 18+ fetch returns a Web ReadableStream; iterate via getReader().
    const reader = (response.body as ReadableStream<Uint8Array>).getReader();
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        yield Buffer.from(value);
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Synthesize the full audio for a short text in one shot
   * (useful for greetings or short phrases where streaming isn't needed).
   *
   * Returns the complete MP3 audio as a single `Buffer`.
   */
  async synthesize(
    text: string,
    voiceConfig: ElevenLabsVoiceConfig,
  ): Promise<Buffer> {
    const chunks: Buffer[] = [];
    for await (const chunk of this.streamSpeech(text, voiceConfig)) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  }

  /**
   * Quick health-check: returns true if the API key is set and the
   * voices endpoint responds.  Useful for startup validation.
   */
  async isAvailable(): Promise<boolean> {
    if (!this.apiKey) return false;

    try {
      const res = await fetch(`${this.baseUrl}/voices`, {
        headers: { 'xi-api-key': this.apiKey },
      });
      return res.ok;
    } catch {
      return false;
    }
  }
}

export default ElevenLabsService;
