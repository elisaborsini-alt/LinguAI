import { Server as SocketServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import prisma from '../../db/client';
import { config } from '../../config';
import { logger } from '../../utils/logger';
import { VoiceSessionManager } from './voiceSessionManager';
import { ConversationOrchestrator } from '../ai/conversationOrchestrator';
import { IntelligenceService, getIntelligenceService } from '../intelligence/intelligenceService';
import { DeepgramService, DeepgramSessionConfig } from './deepgramService';
import { ElevenLabsService, ElevenLabsVoiceConfig } from './elevenLabsService';
import { AdaptiveResponseController, ResponseDecisionEvent } from './adaptiveResponseController';
import { ClaudeMessage, ClaudeStreamCallbacks } from '../ai/claudeClient';
import { LearningGoal, LanguageCode } from '../../types';
import { getVoiceIdentity } from '../../config/voiceIdentities';
import { getSnapshotCaptureService } from '../progress/snapshotCaptureService';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AuthenticatedSocket extends Socket {
  userId?: string;
  sessionId?: string;
}

// ---------------------------------------------------------------------------
// VoiceSocketHandler
// ---------------------------------------------------------------------------

export class VoiceSocketHandler {
  private io: SocketServer;
  private sessionManager: VoiceSessionManager;
  private orchestrator: ConversationOrchestrator;
  private intelligenceService: IntelligenceService;
  private deepgramService: DeepgramService;
  private elevenLabsService: ElevenLabsService;
  private adaptiveController: AdaptiveResponseController;

  /** Per-session ElevenLabs voice config */
  private sessionVoiceConfig = new Map<string, ElevenLabsVoiceConfig>();

  /** Per-session processing lock to prevent duplicate processUserSpeech calls */
  private processingLocks = new Map<string, boolean>();

  /** Last processed transcript per session for deduplication */
  private lastProcessedTranscript = new Map<string, string>();

  constructor(io: SocketServer) {
    this.io = io;
    this.sessionManager = new VoiceSessionManager();
    this.orchestrator = new ConversationOrchestrator();
    this.intelligenceService = getIntelligenceService();
    this.deepgramService = new DeepgramService();
    this.elevenLabsService = new ElevenLabsService();
    this.adaptiveController = new AdaptiveResponseController();

    this.setupSocketAuthentication();
    this.setupSessionEvents();
    this.setupDeepgramEvents();
    this.setupAdaptiveController();
    this.setupConnectionHandler();
  }

  // =========================================================================
  // Socket.IO authentication
  // =========================================================================

  private setupSocketAuthentication(): void {
    this.io.use(async (socket: AuthenticatedSocket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.query.token;

        if (!token) {
          return next(new Error('Authentication required'));
        }

        const decoded = jwt.verify(token as string, config.jwt.secret) as { userId: string };
        socket.userId = decoded.userId;

        const user = await prisma.user.findUnique({
          where: { id: decoded.userId },
        });

        if (!user) {
          return next(new Error('User not found'));
        }

        next();
      } catch (error) {
        logger.error('Socket authentication error:', error);
        next(new Error('Authentication failed'));
      }
    });
  }

  // =========================================================================
  // VoiceSessionManager events
  // =========================================================================

  private setupSessionEvents(): void {
    // Completed speech → AI processing
    // (skipped for adaptive sessions — AdaptiveResponseController handles timing)
    this.sessionManager.on('speechComplete', async (data) => {
      if (this.adaptiveController.hasSession(data.sessionId)) return;
      await this.processUserSpeech(data.sessionId, data.transcript, data.messages);
    });

    this.sessionManager.on('interrupted', (data) => {
      this.io.to(data.sessionId).emit('ai:interrupted', {
        interruptionCount: data.interruptionCount,
      });
    });

    this.sessionManager.on('aiSpeechStart', (data) => {
      this.io.to(data.sessionId).emit('ai:speaking', { isSpeaking: true });
      this.adaptiveController.onAISpeechStart(data.sessionId);
    });

    this.sessionManager.on('aiSpeechEnd', (data) => {
      this.io.to(data.sessionId).emit('ai:speaking', { isSpeaking: false });
      this.adaptiveController.onAISpeechEnd(data.sessionId);
    });

    this.sessionManager.on('sessionEnded', async (data) => {
      this.io.to(data.sessionId).emit('session:ended', {
        reason: data.reason,
        duration: data.duration,
        messageCount: data.messageCount,
      });
      await this.endConversation(data.conversationId, data.userId, data.sessionId);
    });

    this.sessionManager.on('streamChunk', (data) => {
      this.io.to(data.sessionId).emit('ai:chunk', { text: data.chunk });
    });

    this.sessionManager.on('streamCancelled', (data) => {
      this.io.to(data.sessionId).emit('ai:cancelled', { reason: data.reason });
    });
  }

  // =========================================================================
  // Deepgram transcript events
  // =========================================================================

  private setupDeepgramEvents(): void {
    this.deepgramService.on('transcript', ({ sessionId, result }) => {
      // Forward transcript to client for real-time display
      this.io.to(sessionId).emit('voice:transcript', {
        transcript: result.transcript,
        isFinal: result.isFinal,
      });

      // Feed into session manager (transcript accumulation + state)
      this.sessionManager.handleSpeechInput(
        sessionId,
        result.transcript,
        result.isFinal,
      );

      // Feed adaptive controller (timing decisions)
      this.adaptiveController.onTranscript(sessionId, result.transcript, result.isFinal);
    });

    this.deepgramService.on('utteranceEnd', ({ sessionId }) => {
      // Deepgram detected end-of-utterance → force-process immediately
      const session = this.sessionManager.getSession(sessionId);
      if (session && session.currentTranscript?.trim()) {
        if (session.silenceTimer) {
          clearTimeout(session.silenceTimer);
        }
        // In non-adaptive mode, trigger processing directly
        if (!this.adaptiveController.hasSession(sessionId)) {
          this.sessionManager.handleSpeechInput(sessionId, '', true);
        }
      }

      // Notify adaptive controller
      this.adaptiveController.onUtteranceEnd(sessionId);
    });

    this.deepgramService.on('error', ({ sessionId }) => {
      this.io.to(sessionId).emit('voice:error', {
        message: 'Speech recognition error',
      });
    });

    this.deepgramService.on('reconnectFailed', ({ sessionId }) => {
      this.io.to(sessionId).emit('voice:error', {
        message: 'Speech recognition connection lost',
      });
    });
  }

  // =========================================================================
  // Adaptive response controller
  // =========================================================================

  private setupAdaptiveController(): void {
    this.adaptiveController.on('responseDecision', async (event: ResponseDecisionEvent) => {
      const { sessionId, decision } = event;

      // Only act on "respond" decisions — wait/extend_wait are logged internally
      if (decision === 'wait' || decision === 'extend_wait') {
        return;
      }

      // respond_eager | respond_normal | respond_encourage → trigger processing
      const session = this.sessionManager.getSession(sessionId);
      if (!session || !session.currentTranscript.trim()) return;

      logger.info(`[Adaptive] Triggering processUserSpeech: ${decision}`);
      this.sessionManager.triggerProcessing(sessionId);
    });
  }

  // =========================================================================
  // Socket.IO connection handler
  // =========================================================================

  private setupConnectionHandler(): void {
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      logger.info(`Socket connected: ${socket.id}, user: ${socket.userId}`);

      socket.on('voice:start', async (data) => {
        await this.handleVoiceStart(socket, data);
      });

      // Raw audio from client → Deepgram
      socket.on('voice:audio', (data: { audio: string }) => {
        this.handleAudioInput(socket, data.audio);
      });

      // Text transcript fallback (kept for backward compatibility)
      socket.on('voice:speech', (data) => {
        this.handleSpeechInput(socket, data);
      });

      socket.on('voice:speechEnd', () => {
        this.handleSpeechEnd(socket);
      });

      socket.on('voice:interrupt', () => {
        this.handleInterrupt(socket);
      });

      socket.on('voice:mute', (data) => {
        this.handleMute(socket, data.muted);
      });

      socket.on('voice:end', () => {
        this.handleVoiceEnd(socket);
      });

      socket.on('voice:getState', (callback) => {
        const state = socket.sessionId
          ? this.sessionManager.getState(socket.sessionId)
          : null;
        callback({ state });
      });

      socket.on('disconnect', () => {
        this.handleDisconnect(socket);
      });

      socket.on('error', (error) => {
        logger.error(`Socket error for ${socket.id}:`, error);
      });
    });
  }

  // =========================================================================
  // Event handlers
  // =========================================================================

  /**
   * Start a voice session: create conversation, start Deepgram STT,
   * configure ElevenLabs TTS, send greeting audio.
   */
  private async handleVoiceStart(
    socket: AuthenticatedSocket,
    data: { conversationId?: string; goal?: LearningGoal; scenarioId?: string },
  ): Promise<void> {
    try {
      const userId = socket.userId!;
      let conversationId = data.conversationId;
      let greeting: string | undefined;

      // ── Fetch user language info (needed for conversation + STT/TTS + memory) ──
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          targetLanguageCode: true,
          targetLanguageVariant: true,
          voiceGender: true,
          voiceIdentity: true,
          levelEstimates: { select: { overallLevel: true } },
        },
      });

      // ── Create conversation if not resuming ──
      if (!conversationId) {
        const conversation = await prisma.conversation.create({
          data: {
            userId,
            mode: 'call',
            goal: data.goal || 'conversation',
            languageCode: user?.targetLanguageCode || 'en',
            languageVariant: user?.targetLanguageVariant || 'US',
            scenarioId: data.scenarioId,
            status: 'active',
          },
        });
        conversationId = conversation.id;

        const init = await this.orchestrator.initializeConversation(
          userId,
          conversationId,
          'call',
          data.goal || 'conversation',
          data.scenarioId,
        );
        greeting = init.greeting;

        await prisma.message.create({
          data: { conversationId, role: 'assistant', content: greeting },
        });
      }

      // ── Initialize memory session (STM + LTM) ──
      await this.intelligenceService.onSessionStart({
        conversationId,
        userId,
        level: (user?.levelEstimates?.overallLevel || 'A1') as any,
        languageCode: user?.targetLanguageCode || 'en',
        languageVariant: user?.targetLanguageVariant || 'US',
        mode: 'voice',
      });

      // ── Gather context messages ──
      const existingMessages = await prisma.message.findMany({
        where: { conversationId },
        orderBy: { createdAt: 'asc' },
        take: 20,
      });

      const messages: ClaudeMessage[] = existingMessages.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

      // ── Create voice session ──
      const sessionId = `voice_${socket.id}_${Date.now()}`;
      this.sessionManager.createSession(sessionId, conversationId, userId, messages);
      this.sessionManager.setAdaptiveMode(sessionId, true);
      this.adaptiveController.registerSession(sessionId);
      socket.sessionId = sessionId;
      socket.join(sessionId);

      // ── Start Deepgram STT ──
      const dgConfig: DeepgramSessionConfig = {
        language: user?.targetLanguageCode || 'en',
      };
      this.deepgramService.startSession(sessionId, dgConfig);

      // ── Configure ElevenLabs voice from voice identity ──
      const identity = getVoiceIdentity(user?.voiceIdentity || 'warm_female');
      const voiceId = this.elevenLabsService.selectVoice(
        (user?.targetLanguageCode || 'en') as LanguageCode,
        identity.gender,
      );
      const voiceConfig: ElevenLabsVoiceConfig = {
        voiceId,
        stability: identity.tts.stability,
        similarityBoost: identity.tts.similarityBoost,
        style: identity.tts.style,
      };
      this.sessionVoiceConfig.set(sessionId, voiceConfig);

      // ── Synthesise greeting audio ──
      let greetingAudio: string | undefined;
      if (greeting) {
        try {
          const audioBuf = await this.elevenLabsService.synthesize(greeting, voiceConfig);
          greetingAudio = audioBuf.toString('base64');
        } catch (err) {
          logger.error('Error synthesizing greeting audio:', err);
          // Non-fatal: greeting text will still be sent
        }
      }

      // ── Start snapshot capture (non-blocking, fire-and-forget) ──
      getSnapshotCaptureService()
        .startCapture(sessionId, userId, conversationId!, user?.targetLanguageCode || 'en')
        .catch((e) => logger.error('[Snapshot] Error starting capture:', e));

      socket.emit('voice:started', {
        sessionId,
        conversationId,
        greeting,
        greetingAudio,
      });

      // Also emit greeting as an ai:audio event so the client can play it
      // through the standard audio pipeline
      if (greetingAudio) {
        this.io.to(sessionId).emit('ai:audio', {
          audio: greetingAudio,
          text: greeting,
          isFinal: true,
        });
      }

      logger.info(`Voice session started: ${sessionId} for user ${userId}`);
    } catch (error) {
      logger.error('Error starting voice session:', error);
      socket.emit('voice:error', { message: 'Failed to start voice session' });
    }
  }

  /**
   * Receive raw PCM audio from client → forward to Deepgram.
   */
  private handleAudioInput(socket: AuthenticatedSocket, base64Audio: string): void {
    if (!socket.sessionId) return;
    const audioBuffer = Buffer.from(base64Audio, 'base64');
    getSnapshotCaptureService().feedAudio(socket.sessionId, audioBuffer);
    this.deepgramService.sendAudio(socket.sessionId, audioBuffer);
  }

  /**
   * Text transcript fallback (backward-compat with old frontend).
   */
  private handleSpeechInput(
    socket: AuthenticatedSocket,
    data: { transcript: string; isFinal: boolean },
  ): void {
    if (!socket.sessionId) {
      socket.emit('voice:error', { message: 'No active session' });
      return;
    }

    this.sessionManager.handleSpeechInput(
      socket.sessionId,
      data.transcript,
      data.isFinal,
    );

    socket.emit('voice:transcript', {
      transcript: data.transcript,
      isFinal: data.isFinal,
    });
  }

  private handleSpeechEnd(socket: AuthenticatedSocket): void {
    if (!socket.sessionId) return;

    const session = this.sessionManager.getSession(socket.sessionId);
    if (session && session.currentTranscript) {
      if (session.silenceTimer) {
        clearTimeout(session.silenceTimer);
      }
      this.sessionManager.handleSpeechInput(socket.sessionId, '', true);
    }
  }

  private handleInterrupt(socket: AuthenticatedSocket): void {
    if (!socket.sessionId) return;
    this.sessionManager.stopAISpeech(socket.sessionId);
    socket.emit('ai:stopped', { reason: 'user_interrupt' });
  }

  private handleMute(socket: AuthenticatedSocket, muted: boolean): void {
    if (!socket.sessionId) return;
    socket.emit('voice:muteStatus', { muted });
    logger.debug(`User ${muted ? 'muted' : 'unmuted'} in session ${socket.sessionId}`);
  }

  private handleVoiceEnd(socket: AuthenticatedSocket): void {
    if (!socket.sessionId) return;

    this.cleanupSession(socket.sessionId);
    this.sessionManager.endSession(socket.sessionId, 'user_ended');
    socket.leave(socket.sessionId);
    socket.sessionId = undefined;
  }

  private handleDisconnect(socket: AuthenticatedSocket): void {
    logger.info(`Socket disconnected: ${socket.id}`);
    if (socket.sessionId) {
      const session = this.sessionManager.getSession(socket.sessionId);

      this.cleanupSession(socket.sessionId);
      this.sessionManager.endSession(socket.sessionId, 'connection_lost');

      // Ensure endConversation runs even on unexpected disconnect
      if (session && session.state !== 'ended') {
        this.endConversation(session.conversationId, session.userId, socket.sessionId).catch(
          (e) => logger.error('[Voice] Error ending conversation on disconnect:', e),
        );
      }
    }
  }

  // =========================================================================
  // Core: process speech → Claude → sentence buffer → ElevenLabs → client
  // =========================================================================

  // Sentence-boundary detection constants
  private static readonly SENTENCE_END = /[.!?;]\s*$/;
  private static readonly CLAUSE_END = /[,:]\s*$/;
  private static readonly MIN_CHUNK_LEN = 40;
  private static readonly MAX_CHUNK_LEN = 200;

  private async processUserSpeech(
    sessionId: string,
    transcript: string,
    messages: ClaudeMessage[],
  ): Promise<void> {
    const session = this.sessionManager.getSession(sessionId);
    if (!session) return;

    // ── Deduplication: skip if identical transcript just processed ──
    const lastTranscript = this.lastProcessedTranscript.get(sessionId);
    if (lastTranscript && lastTranscript === transcript.trim()) {
      logger.debug('[Voice] Skipping duplicate transcript');
      return;
    }

    // ── Processing lock: prevent concurrent processUserSpeech for same session ──
    const lockKey = session.conversationId;
    if (this.processingLocks.get(lockKey)) {
      logger.debug('[Voice] Skipping duplicate processUserSpeech — already processing');
      return;
    }
    this.processingLocks.set(lockKey, true);
    this.lastProcessedTranscript.set(sessionId, transcript.trim());

    // ── Feed emotional state to adaptive controller for turn-taking patience ──
    try {
      const memoryContext = await this.intelligenceService.onUserMessage(
        session.conversationId,
        session.userId,
        transcript,
      );
      // Update the adaptive controller's emotional state so silence
      // thresholds adapt to the user's current mood
      this.adaptiveController.setEmotionalState(
        sessionId,
        memoryContext.currentMood as any,
      );
    } catch (e) {
      // Non-fatal: don't block speech processing if memory fails
      logger.error('[Voice] Error updating emotional state:', e);
    }

    try {
      // Store user message
      await prisma.message.create({
        data: {
          conversationId: session.conversationId,
          role: 'user',
          content: transcript,
        },
      });

      this.sessionManager.startAISpeech(sessionId);

      let fullResponse = '';
      let sentenceBuffer = '';
      const voiceConfig = this.sessionVoiceConfig.get(sessionId);

      // ── Flush a buffered sentence to ElevenLabs TTS ──
      const flushToTTS = async (text: string, isFinal: boolean): Promise<void> => {
        const trimmed = text.trim();
        if (!trimmed || !voiceConfig) return;
        if (this.sessionManager.getState(sessionId) === 'interrupted') return;

        try {
          const audioChunks: Buffer[] = [];
          for await (const chunk of this.elevenLabsService.streamSpeech(trimmed, voiceConfig)) {
            audioChunks.push(chunk);
          }
          const audioBuf = Buffer.concat(audioChunks);

          this.io.to(sessionId).emit('ai:audio', {
            audio: audioBuf.toString('base64'),
            text: trimmed,
            isFinal,
          });
        } catch (err) {
          logger.error('[TTS] ElevenLabs error, falling back to text:', err);
          // Graceful degradation: the text was already sent via ai:chunk
        }
      };

      // ── Streaming callbacks from Claude ──
      const callbacks: ClaudeStreamCallbacks = {
        onText: (text) => {
          if (this.sessionManager.getState(sessionId) === 'interrupted') return;

          fullResponse += text;
          sentenceBuffer += text;

          // Always emit text for subtitle display
          this.io.to(sessionId).emit('ai:chunk', { text });

          // Decide whether to flush sentence buffer to TTS
          const shouldFlush =
            VoiceSocketHandler.SENTENCE_END.test(sentenceBuffer) ||
            (VoiceSocketHandler.CLAUSE_END.test(sentenceBuffer) &&
              sentenceBuffer.length > VoiceSocketHandler.MIN_CHUNK_LEN) ||
            sentenceBuffer.length > VoiceSocketHandler.MAX_CHUNK_LEN;

          if (shouldFlush) {
            const toSpeak = sentenceBuffer;
            sentenceBuffer = '';
            // Fire-and-forget: don't block the streaming hot-path
            flushToTTS(toSpeak, false).catch((e) =>
              logger.error('[TTS] Flush error:', e),
            );
          }
        },

        onComplete: async (completeText) => {
          // Flush any remaining text
          if (sentenceBuffer.trim()) {
            await flushToTTS(sentenceBuffer, true);
            sentenceBuffer = '';
          }

          // Persist AI message (unless interrupted)
          if (this.sessionManager.getState(sessionId) !== 'interrupted') {
            await prisma.message.create({
              data: {
                conversationId: session.conversationId,
                role: 'assistant',
                content: completeText,
              },
            });
            this.io.to(sessionId).emit('ai:complete', { text: completeText });
          }

          this.sessionManager.endAISpeech(sessionId, completeText);

          // Update memory asynchronously (fire-and-forget)
          this.orchestrator
            .updateMemoryAfterStream(
              session.userId,
              session.conversationId,
              transcript,
              completeText,
            )
            .catch((e) => logger.error('[Memory] Post-stream update error:', e));
        },

        onError: (error) => {
          logger.error('AI streaming error:', error);
          this.io.to(sessionId).emit('ai:error', { message: 'AI response error' });
          this.sessionManager.endAISpeech(sessionId, '');
        },
      };

      // ── Stream Claude response ──
      await this.orchestrator.streamResponse(
        session.userId,
        session.conversationId,
        transcript,
        messages.slice(0, -1), // Exclude the message we just stored
        callbacks,
      );
    } catch (error) {
      logger.error('Error processing speech:', error);
      this.io.to(sessionId).emit('ai:error', { message: 'Failed to process speech' });
      this.sessionManager.endAISpeech(sessionId, '');
    } finally {
      this.processingLocks.delete(lockKey);
    }
  }

  // =========================================================================
  // End conversation (session summary, metrics)
  // =========================================================================

  private async endConversation(
    conversationId: string,
    userId: string,
    _sessionId: string,
  ): Promise<void> {
    try {
      // Consolidate STM → LTM via IntelligenceService
      await this.intelligenceService.onSessionEnd(conversationId, userId);

      const messages = await prisma.message.findMany({
        where: { conversationId },
        orderBy: { createdAt: 'asc' },
      });

      await prisma.conversation.update({
        where: { id: conversationId },
        data: { status: 'completed', endedAt: new Date() },
      });

      const userMessages = messages.filter((m) => m.role === 'user');
      const wordCount = userMessages.reduce(
        (sum, m) => sum + m.content.split(/\s+/).length,
        0,
      );

      const existingMetrics = await prisma.conversationMetrics.findUnique({
        where: { conversationId },
      });

      if (!existingMetrics) {
        await prisma.conversationMetrics.create({
          data: {
            conversationId,
            totalMessages: messages.length,
            userMessages: userMessages.length,
            wordsSpoken: wordCount,
          },
        });
      }

      logger.info(`Conversation ${conversationId} completed`);
    } catch (error) {
      logger.error('Error ending conversation:', error);
    }
  }

  // =========================================================================
  // Cleanup helpers
  // =========================================================================

  private cleanupSession(sessionId: string): void {
    this.deepgramService.endSession(sessionId);
    this.sessionVoiceConfig.delete(sessionId);
    this.adaptiveController.unregisterSession(sessionId);
    this.lastProcessedTranscript.delete(sessionId);
    getSnapshotCaptureService()
      .finalizeCapture(sessionId)
      .catch((e) => logger.error('[Snapshot] Error finalizing capture:', e));
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function setupVoiceSocket(io: SocketServer): VoiceSocketHandler {
  return new VoiceSocketHandler(io);
}

export default VoiceSocketHandler;
