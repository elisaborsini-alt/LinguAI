import * as fs from 'fs';
import * as path from 'path';
import prisma from '../../db/client';
import { logger } from '../../utils/logger';

// ============================================
// Types
// ============================================

interface CaptureSession {
  userId: string;
  conversationId: string;
  languageCode: string;
  chunks: Buffer[];
  totalBytes: number;
  startedAt: number;
  finalized: boolean;
}

// PCM config (must match frontend: 16kHz, 16-bit, mono)
const SAMPLE_RATE = 16000;
const BITS_PER_SAMPLE = 16;
const NUM_CHANNELS = 1;
const BYTES_PER_SAMPLE = BITS_PER_SAMPLE / 8;

// Capture limits
const MAX_DURATION_SECONDS = 20;
const MAX_BYTES = SAMPLE_RATE * BYTES_PER_SAMPLE * NUM_CHANNELS * MAX_DURATION_SECONDS;
const COOLDOWN_DAYS = 7;
const MAX_SNAPSHOTS_PER_USER = 20;

// Storage
const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'voice-snapshots');

// ============================================
// SnapshotCaptureService
// ============================================

export class SnapshotCaptureService {
  private sessions = new Map<string, CaptureSession>();

  /**
   * Start capturing audio for a voice session.
   * Checks cooldown and cap before activating.
   */
  async startCapture(
    sessionId: string,
    userId: string,
    conversationId: string,
    languageCode: string,
  ): Promise<void> {
    try {
      // Check if user already has a recent snapshot (cooldown)
      const cooldownDate = new Date(Date.now() - COOLDOWN_DAYS * 24 * 60 * 60 * 1000);
      const recentCount = await prisma.voiceSnapshot.count({
        where: {
          userId,
          capturedAt: { gte: cooldownDate },
        },
      });

      if (recentCount > 0) {
        logger.debug(`Snapshot capture skipped for user ${userId}: cooldown active`);
        return;
      }

      // Check total snapshot cap
      const totalCount = await prisma.voiceSnapshot.count({
        where: { userId },
      });

      if (totalCount >= MAX_SNAPSHOTS_PER_USER) {
        logger.debug(`Snapshot capture skipped for user ${userId}: cap reached (${totalCount})`);
        return;
      }

      this.sessions.set(sessionId, {
        userId,
        conversationId,
        languageCode,
        chunks: [],
        totalBytes: 0,
        startedAt: Date.now(),
        finalized: false,
      });

      logger.debug(`Snapshot capture started for session ${sessionId}`);
    } catch (error) {
      logger.error('Failed to start snapshot capture:', error);
    }
  }

  /**
   * Feed raw PCM audio into the capture buffer.
   * Stops accepting once MAX_BYTES is reached.
   */
  feedAudio(sessionId: string, audioBuffer: Buffer): void {
    const session = this.sessions.get(sessionId);
    if (!session || session.finalized) return;

    if (session.totalBytes >= MAX_BYTES) return;

    const remaining = MAX_BYTES - session.totalBytes;
    const chunk = remaining >= audioBuffer.length
      ? audioBuffer
      : audioBuffer.subarray(0, remaining);

    session.chunks.push(chunk);
    session.totalBytes += chunk.length;
  }

  /**
   * Finalize capture: write WAV file and create DB record.
   */
  async finalizeCapture(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session || session.finalized) return;

    session.finalized = true;
    this.sessions.delete(sessionId);

    // Need at least 2 seconds of audio to be useful
    const minBytes = SAMPLE_RATE * BYTES_PER_SAMPLE * NUM_CHANNELS * 2;
    if (session.totalBytes < minBytes) {
      logger.debug(`Snapshot capture discarded for session ${sessionId}: too short (${session.totalBytes} bytes)`);
      return;
    }

    try {
      const pcmData = Buffer.concat(session.chunks, session.totalBytes);
      const wavData = createWavBuffer(pcmData);
      const durationMs = Math.round((session.totalBytes / (SAMPLE_RATE * BYTES_PER_SAMPLE * NUM_CHANNELS)) * 1000);

      // Write WAV file
      const snapshotId = crypto.randomUUID();
      const userDir = path.join(UPLOAD_DIR, session.userId);
      fs.mkdirSync(userDir, { recursive: true });
      const filePath = path.join(userDir, `${snapshotId}.wav`);
      fs.writeFileSync(filePath, wavData);

      const audioUrl = `/uploads/voice-snapshots/${session.userId}/${snapshotId}.wav`;

      // Get transcript from the conversation's first user message
      const firstMessage = await prisma.message.findFirst({
        where: {
          conversationId: session.conversationId,
          role: 'user',
        },
        orderBy: { createdAt: 'asc' },
        select: { content: true },
      });

      // Get current CEFR level
      const levelEstimate = await prisma.levelEstimate.findUnique({
        where: { userId: session.userId },
        select: { overallLevel: true },
      });

      await prisma.voiceSnapshot.create({
        data: {
          id: snapshotId,
          userId: session.userId,
          conversationId: session.conversationId,
          audioUrl,
          durationMs,
          transcript: firstMessage?.content || null,
          languageCode: session.languageCode,
          cefrLevel: levelEstimate?.overallLevel || 'A1',
        },
      });

      logger.info(`Voice snapshot saved: ${audioUrl} (${durationMs}ms)`);
    } catch (error) {
      logger.error('Failed to finalize snapshot capture:', error);
    }
  }

  /**
   * Abort capture without saving (e.g. on unexpected disconnect with very little audio).
   */
  abortCapture(sessionId: string): void {
    this.sessions.delete(sessionId);
  }
}

// ============================================
// WAV File Helpers
// ============================================

/**
 * Prepend a standard 44-byte WAV header to raw PCM data.
 * Format: RIFF/WAVE, PCM, 16kHz, 16-bit, mono.
 */
function createWavBuffer(pcmData: Buffer): Buffer {
  const dataSize = pcmData.length;
  const header = Buffer.alloc(44);

  const byteRate = SAMPLE_RATE * NUM_CHANNELS * BYTES_PER_SAMPLE;
  const blockAlign = NUM_CHANNELS * BYTES_PER_SAMPLE;

  // RIFF chunk
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write('WAVE', 8);

  // fmt sub-chunk
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);            // sub-chunk size
  header.writeUInt16LE(1, 20);             // PCM format
  header.writeUInt16LE(NUM_CHANNELS, 22);
  header.writeUInt32LE(SAMPLE_RATE, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(BITS_PER_SAMPLE, 34);

  // data sub-chunk
  header.write('data', 36);
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, pcmData]);
}

// ============================================
// Singleton
// ============================================

let instance: SnapshotCaptureService | null = null;

export function getSnapshotCaptureService(): SnapshotCaptureService {
  if (!instance) {
    instance = new SnapshotCaptureService();
  }
  return instance;
}

export default SnapshotCaptureService;
