import * as fs from 'fs';
import * as path from 'path';
import {PrismaClient} from '@prisma/client';

interface ReferenceAudio {
  id: string;
  phraseId: string;
  audioUrl: string;
  durationMs: number;
  waveformData: number[] | null;
  pitchContour: Array<{time: number; frequency: number}> | null;
  speakerGender?: string;
  speakerAccent?: string;
}

interface GenerateTTSOptions {
  text: string;
  languageCode: string;
  variant?: string;
  speed?: number;
  voiceGender?: 'male' | 'female';
}

export class ReferenceAudioService {
  private readonly prisma: PrismaClient;
  private readonly audioBasePath: string;
  private readonly cacheDir: string;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.audioBasePath = path.join(process.cwd(), 'audio', 'pronunciation');
    this.cacheDir = path.join(process.cwd(), 'cache', 'audio');

    // Ensure directories exist
    [this.audioBasePath, this.cacheDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, {recursive: true});
      }
    });
  }

  /**
   * Get reference audio for a phrase
   * Returns pre-recorded audio if available, otherwise generates via TTS
   */
  async getReferenceAudio(
    phraseId: string,
    options?: {variant?: string; speed?: number},
  ): Promise<ReferenceAudio | null> {
    // First, try to get pre-recorded reference from database
    const existing = await this.prisma.referenceAudio.findFirst({
      where: {phraseId},
    });

    if (existing) {
      return {
        id: existing.id,
        phraseId: existing.phraseId,
        audioUrl: existing.audioUrl,
        durationMs: existing.durationMs,
        waveformData: existing.waveformData as number[] | null,
        pitchContour: existing.pitchContour as Array<{
          time: number;
          frequency: number;
        }> | null,
      };
    }

    // No pre-recorded audio, generate via TTS
    const phrase = await this.prisma.pronunciationPhrase.findUnique({
      where: {id: phraseId},
    });

    if (!phrase) {
      return null;
    }

    const generated = await this.generateTTSAudio({
      text: phrase.text,
      languageCode: phrase.languageCode,
      variant: options?.variant || phrase.languageVariant || undefined,
      speed: options?.speed || 1.0,
    });

    // Save generated audio to database
    const saved = await this.prisma.referenceAudio.create({
      data: {
        phraseId,
        audioUrl: generated.audioUrl,
        durationMs: generated.durationMs,
        waveformData: generated.waveformData,
        pitchContour: generated.pitchContour,
      },
    });

    return {
      id: saved.id,
      phraseId: saved.phraseId,
      audioUrl: saved.audioUrl,
      durationMs: saved.durationMs,
      waveformData: saved.waveformData as number[] | null,
      pitchContour: saved.pitchContour as Array<{
        time: number;
        frequency: number;
      }> | null,
    };
  }

  /**
   * Generate audio using Text-to-Speech
   * In production, this would use Google Cloud TTS, Amazon Polly, or similar
   */
  async generateTTSAudio(options: GenerateTTSOptions): Promise<{
    audioUrl: string;
    durationMs: number;
    waveformData: number[];
    pitchContour: Array<{time: number; frequency: number}>;
  }> {
    const {text, languageCode, variant, speed = 1.0} = options;

    // In production, call actual TTS API:
    // - Google Cloud Text-to-Speech
    // - Amazon Polly
    // - Azure Cognitive Services Speech
    // - ElevenLabs

    // Generate a unique filename
    const hash = this.hashString(`${text}_${languageCode}_${variant}_${speed}`);
    const filename = `tts_${hash}.mp3`;
    const audioPath = path.join(this.cacheDir, filename);

    // Check cache first
    if (fs.existsSync(audioPath)) {
      const cached = await this.loadCachedAudioData(audioPath);
      return cached;
    }

    // Simulate TTS generation
    // In production, this would be replaced with actual API call
    const simulatedDuration = this.estimateDuration(text, speed);
    const waveformData = this.generateMockWaveform(simulatedDuration);
    const pitchContour = this.generateMockPitchContour(simulatedDuration);

    // For mock, create a placeholder file
    // In production, the actual audio bytes would be written here
    if (!fs.existsSync(audioPath)) {
      fs.writeFileSync(audioPath, 'mock_audio_data');
    }

    // Construct public URL
    const audioUrl = `/audio/cache/${filename}`;

    return {
      audioUrl,
      durationMs: simulatedDuration,
      waveformData,
      pitchContour,
    };
  }

  /**
   * Get pre-recorded audio from file system
   */
  async getPrerecordedAudio(
    languageCode: string,
    variant: string,
    phraseId: string,
  ): Promise<{path: string; exists: boolean}> {
    const audioDir = path.join(
      this.audioBasePath,
      languageCode,
      variant,
      'phrases',
      phraseId,
    );

    const audioFile = path.join(audioDir, 'reference.mp3');
    const exists = fs.existsSync(audioFile);

    return {path: audioFile, exists};
  }

  /**
   * Extract waveform data from audio file
   * In production, use ffmpeg or Web Audio API
   */
  async extractWaveform(audioPath: string): Promise<number[]> {
    // In production, use ffmpeg to extract amplitude data:
    // ffmpeg -i input.mp3 -af "aresample=8000,aformat=sample_fmts=s16" -f s16le -
    // Then process the raw PCM data

    // For now, return mock data
    const duration = 2000; // Would be extracted from file
    return this.generateMockWaveform(duration);
  }

  /**
   * Extract pitch contour from audio file
   * In production, use praat-parselmouth or similar
   */
  async extractPitchContour(
    audioPath: string,
  ): Promise<Array<{time: number; frequency: number}>> {
    // In production, use pitch detection algorithms:
    // - praat-parselmouth (Python)
    // - crepe (neural network-based)
    // - pYIN

    // For now, return mock data
    const duration = 2000;
    return this.generateMockPitchContour(duration);
  }

  /**
   * Pre-compute and cache waveform/pitch data for a phrase
   */
  async precomputeAudioData(phraseId: string): Promise<void> {
    const referenceAudio = await this.prisma.referenceAudio.findFirst({
      where: {phraseId},
    });

    if (!referenceAudio) return;

    // If data already exists, skip
    if (referenceAudio.waveformData && referenceAudio.pitchContour) {
      return;
    }

    const audioPath = this.getLocalPath(referenceAudio.audioUrl);
    if (!audioPath || !fs.existsSync(audioPath)) {
      return;
    }

    const [waveformData, pitchContour] = await Promise.all([
      this.extractWaveform(audioPath),
      this.extractPitchContour(audioPath),
    ]);

    await this.prisma.referenceAudio.update({
      where: {id: referenceAudio.id},
      data: {
        waveformData,
        pitchContour,
      },
    });
  }

  /**
   * Batch pre-compute audio data for all phrases in a category
   */
  async precomputeCategoryAudioData(categoryId: string): Promise<void> {
    const phrases = await this.prisma.pronunciationPhrase.findMany({
      where: {categoryId},
      select: {id: true},
    });

    for (const phrase of phrases) {
      await this.precomputeAudioData(phrase.id);
    }
  }

  // Helper methods

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16);
  }

  private estimateDuration(text: string, speed: number): number {
    // Rough estimate: ~150 words per minute at normal speed
    const words = text.split(/\s+/).length;
    const baseDurationMs = (words / 150) * 60 * 1000;
    return Math.round(baseDurationMs / speed);
  }

  private generateMockWaveform(durationMs: number): number[] {
    const numSamples = Math.max(50, Math.round(durationMs / 40));
    return Array.from({length: numSamples}, () => Math.random() * 0.8 + 0.1);
  }

  private generateMockPitchContour(
    durationMs: number,
  ): Array<{time: number; frequency: number}> {
    const numPoints = Math.max(20, Math.round(durationMs / 50));
    const basePitch = 150;
    const contour: Array<{time: number; frequency: number}> = [];

    for (let i = 0; i < numPoints; i++) {
      const time = (i / numPoints) * (durationMs / 1000);
      const progress = i / numPoints;
      const variation = Math.sin(progress * Math.PI * 2) * 30;
      const noise = (Math.random() - 0.5) * 10;

      contour.push({
        time,
        frequency: basePitch + variation + noise,
      });
    }

    return contour;
  }

  private getLocalPath(audioUrl: string): string | null {
    if (audioUrl.startsWith('/audio/')) {
      return path.join(process.cwd(), audioUrl);
    }
    return null;
  }

  private async loadCachedAudioData(audioPath: string): Promise<{
    audioUrl: string;
    durationMs: number;
    waveformData: number[];
    pitchContour: Array<{time: number; frequency: number}>;
  }> {
    const filename = path.basename(audioPath);
    const audioUrl = `/audio/cache/${filename}`;

    // In production, would read actual audio metadata
    const durationMs = 2000;
    const waveformData = this.generateMockWaveform(durationMs);
    const pitchContour = this.generateMockPitchContour(durationMs);

    return {
      audioUrl,
      durationMs,
      waveformData,
      pitchContour,
    };
  }
}

export default ReferenceAudioService;
