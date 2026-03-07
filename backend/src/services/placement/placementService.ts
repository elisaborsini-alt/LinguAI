import Redis from 'ioredis';
import prisma from '../../db/client';
import { sendMessage } from '../ai/claudeClient';
import { LongTermMemoryManager, getLongTermMemory } from '../memory/longTermMemory';
import { config } from '../../config';
import { logger } from '../../utils/logger';
import { CEFRLevel } from '../../types';

// ============================================
// Placement Test Service
// Conversational CEFR calibration in ~3 minutes
// ============================================

/** CEFR levels ordered for numeric comparison */
const CEFR_ORDER: CEFRLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

/** Weight per turn (ice-breaker counts less, narration counts most) */
const TURN_WEIGHTS = [0.15, 0.25, 0.35, 0.25];

/** Maximum turns before forced completion */
const MAX_TURNS = 5;

/** Minimum turns before completion is allowed */
const MIN_TURNS = 3;

/** Redis key prefix and TTL */
const REDIS_PREFIX = 'placement:';
const REDIS_TTL_SECONDS = 600; // 10 minutes

// ============================================
// Types
// ============================================

export interface PlacementSession {
  userId: string;
  languageCode: string;
  languageVariant: string;
  startedAt: number; // epoch ms
  currentTurn: number;
  transcript: PlacementTurn[];
  runningEstimates: TurnEstimate[];
}

interface PlacementTurn {
  role: 'assistant' | 'user';
  content: string;
  analysis?: TurnAnalysis;
}

interface TurnAnalysis {
  grammarStructuresUsed: string[];
  vocabularyLevelEstimate: CEFRLevel;
  fluencyIndicators: string[];
  errors: string[];
  cefrEstimate: CEFRLevel;
}

interface TurnEstimate {
  turn: number;
  grammar: CEFRLevel;
  vocabulary: CEFRLevel;
  fluency: CEFRLevel;
  overall: CEFRLevel;
}

export interface PlacementStartResult {
  sessionId: string;
  message: string;
  turn: number;
  totalTurns: number;
}

export interface PlacementTurnResult {
  message: string;
  turn: number;
  totalTurns: number;
  isComplete: boolean;
}

export interface PlacementFinalResult {
  grammarLevel: CEFRLevel;
  vocabularyLevel: CEFRLevel;
  fluencyLevel: CEFRLevel;
  overallLevel: CEFRLevel;
  confidence: number;
  turns: number;
  durationSeconds: number;
}

// ============================================
// Redis + In-Memory Fallback Store
// ============================================

class SessionStore {
  private redis: Redis | null = null;
  private fallback = new Map<string, { data: PlacementSession; expiresAt: number }>();

  constructor() {
    try {
      this.redis = new Redis(config.redis.url, {
        maxRetriesPerRequest: 1,
        lazyConnect: true,
        connectTimeout: 3000,
      });

      this.redis.on('error', (err) => {
        logger.warn('[Placement] Redis unavailable, using in-memory fallback:', err.message);
        this.redis?.disconnect();
        this.redis = null;
      });

      this.redis.connect().catch(() => {
        logger.warn('[Placement] Redis connection failed, using in-memory fallback');
        this.redis = null;
      });
    } catch {
      logger.warn('[Placement] Redis init failed, using in-memory fallback');
      this.redis = null;
    }
  }

  async get(key: string): Promise<PlacementSession | null> {
    if (this.redis) {
      try {
        const data = await this.redis.get(REDIS_PREFIX + key);
        return data ? JSON.parse(data) : null;
      } catch {
        // Fallback on error
      }
    }

    const entry = this.fallback.get(key);
    if (entry && entry.expiresAt > Date.now()) {
      return entry.data;
    }
    this.fallback.delete(key);
    return null;
  }

  async set(key: string, session: PlacementSession): Promise<void> {
    if (this.redis) {
      try {
        await this.redis.setex(
          REDIS_PREFIX + key,
          REDIS_TTL_SECONDS,
          JSON.stringify(session),
        );
        return;
      } catch {
        // Fallback on error
      }
    }

    this.fallback.set(key, {
      data: session,
      expiresAt: Date.now() + REDIS_TTL_SECONDS * 1000,
    });
  }

  async del(key: string): Promise<void> {
    if (this.redis) {
      try {
        await this.redis.del(REDIS_PREFIX + key);
      } catch {
        // Ignore
      }
    }
    this.fallback.delete(key);
  }
}

// ============================================
// Service
// ============================================

export class PlacementService {
  private store: SessionStore;
  private ltm: LongTermMemoryManager;

  constructor() {
    this.store = new SessionStore();
    this.ltm = getLongTermMemory();
  }

  /**
   * Start a new placement session or resume an existing one.
   */
  async startPlacement(
    userId: string,
    languageCode: string,
    languageVariant: string,
  ): Promise<PlacementStartResult> {
    // Check for existing in-flight session (resume)
    const existing = await this.store.get(userId);
    if (existing) {
      const lastAssistant = [...existing.transcript]
        .reverse()
        .find(t => t.role === 'assistant');

      if (lastAssistant) {
        logger.info(`[Placement] Resuming session for ${userId}, turn ${existing.currentTurn}`);
        return {
          sessionId: userId,
          message: lastAssistant.content,
          turn: existing.currentTurn,
          totalTurns: MAX_TURNS,
        };
      }
    }

    // Check if user already has a placement result
    const existingResult = await prisma.placementResult.findUnique({
      where: { userId },
    });
    if (existingResult) {
      logger.info(`[Placement] User ${userId} already has placement result, allowing re-test`);
    }

    // Generate first question
    const langName = this.getLanguageName(languageCode, languageVariant);
    const firstMessage = await this.generateFirstMessage(langName);

    const session: PlacementSession = {
      userId,
      languageCode,
      languageVariant,
      startedAt: Date.now(),
      currentTurn: 1,
      transcript: [{ role: 'assistant', content: firstMessage }],
      runningEstimates: [],
    };

    await this.store.set(userId, session);

    logger.info(`[Placement] Started session for ${userId} (${langName})`);

    return {
      sessionId: userId,
      message: firstMessage,
      turn: 1,
      totalTurns: MAX_TURNS,
    };
  }

  /**
   * Process a user response in the placement test.
   * Single Claude call: analyze + generate next question.
   */
  async processResponse(
    userId: string,
    userMessage: string,
  ): Promise<PlacementTurnResult> {
    const session = await this.store.get(userId);
    if (!session) {
      throw new PlacementError('NO_SESSION', 'No active placement session found');
    }

    // Add user message to transcript
    session.transcript.push({ role: 'user', content: userMessage });

    // Single Claude call: analyze response + generate next question
    const langName = this.getLanguageName(session.languageCode, session.languageVariant);
    const claudeResult = await this.analyzeAndContinue(session, langName);

    // Record turn estimate
    if (claudeResult.analysis) {
      session.runningEstimates.push({
        turn: session.currentTurn,
        grammar: claudeResult.analysis.cefrEstimate,
        vocabulary: claudeResult.analysis.vocabularyLevelEstimate,
        fluency: claudeResult.analysis.cefrEstimate, // fluency derived from overall
        overall: claudeResult.analysis.cefrEstimate,
      });

      // Attach analysis to the user message
      session.transcript[session.transcript.length - 1].analysis = claudeResult.analysis;
    }

    const shouldEnd = claudeResult.shouldEnd || session.currentTurn >= MAX_TURNS;

    if (shouldEnd && session.currentTurn >= MIN_TURNS) {
      // Generate closing message and complete
      const closingMessage = claudeResult.nextMessage;
      session.transcript.push({ role: 'assistant', content: closingMessage });
      session.currentTurn++;

      // Save final result
      const finalResult = await this.finalizePlacement(session);

      // Clean up session
      await this.store.del(userId);

      return {
        message: closingMessage,
        turn: session.currentTurn,
        totalTurns: MAX_TURNS,
        isComplete: true,
      };
    }

    // Continue conversation
    session.currentTurn++;
    session.transcript.push({ role: 'assistant', content: claudeResult.nextMessage });

    await this.store.set(userId, session);

    return {
      message: claudeResult.nextMessage,
      turn: session.currentTurn,
      totalTurns: MAX_TURNS,
      isComplete: false,
    };
  }

  /**
   * Get current placement status for a user.
   */
  async getStatus(userId: string): Promise<{
    hasActiveSession: boolean;
    hasCompletedPlacement: boolean;
    currentTurn?: number;
    result?: PlacementFinalResult;
  }> {
    const session = await this.store.get(userId);
    const result = await prisma.placementResult.findUnique({
      where: { userId },
    });

    return {
      hasActiveSession: !!session,
      hasCompletedPlacement: !!result,
      currentTurn: session?.currentTurn,
      result: result ? {
        grammarLevel: result.grammarLevel as CEFRLevel,
        vocabularyLevel: result.vocabularyLevel as CEFRLevel,
        fluencyLevel: result.fluencyLevel as CEFRLevel,
        overallLevel: result.overallLevel as CEFRLevel,
        confidence: result.confidence,
        turns: result.turns,
        durationSeconds: result.durationSeconds,
      } : undefined,
    };
  }

  // ============================================
  // Private Methods
  // ============================================

  /**
   * Generate the first warm message (A2 anchor level).
   */
  private async generateFirstMessage(langName: string): Promise<string> {
    const prompt = `You are a warm, friendly conversation partner meeting someone for the first time.
Generate a SHORT greeting (1-2 sentences) in ${langName} that:
- Says hi warmly
- Asks their name AND one simple question (where they're from, or what they do)
- Uses A2-level language (simple but natural)
- Feels like chatting with a friend, NOT a test

Respond ONLY with the greeting message, nothing else.`;

    return sendMessage(
      'You are a friendly language tutor. Respond only in the target language.',
      [{ role: 'user', content: prompt }],
      { maxTokens: 100, temperature: 0.8 },
    );
  }

  /**
   * Single Claude call: analyze user response + generate next question.
   */
  private async analyzeAndContinue(
    session: PlacementSession,
    langName: string,
  ): Promise<{
    analysis: TurnAnalysis | null;
    nextMessage: string;
    shouldEnd: boolean;
  }> {
    const conversationSoFar = session.transcript
      .map(t => `${t.role === 'user' ? 'Learner' : 'You'}: ${t.content}`)
      .join('\n');

    const currentEstimate = session.runningEstimates.length > 0
      ? session.runningEstimates[session.runningEstimates.length - 1].overall
      : 'A2';

    const turnNumber = session.currentTurn;
    const isLastTurn = turnNumber >= MAX_TURNS;

    const systemPrompt = `You are a warm, curious conversation partner getting to know someone in ${langName}.
Your HIDDEN goal is to assess their CEFR level through natural conversation.

CRITICAL RULES:
- NEVER mention tests, levels, assessment, or evaluation
- NEVER correct their errors
- Be genuinely warm and curious about them as a person
- Keep your responses to 1-2 sentences
- Speak in ${langName} at a level slightly above their apparent ability

ESCALATION STRATEGY:
- Turn 1-2: Simple questions (present tense, daily life) → targets A1-A2
- Turn 3: Ask them to describe or narrate something → targets B1
- Turn 4: Ask for an opinion or hypothesis → targets B2+
- If they struggle, stay at the same level or go simpler
- Current estimate: ${currentEstimate}

${isLastTurn ? 'THIS IS THE LAST TURN. Generate a warm closing message ("It was great chatting! I feel like I know you better now." in the target language). Set should_end to true.' : ''}
${turnNumber >= MIN_TURNS ? 'You may set should_end to true if the level is already clear from the conversation.' : 'Do NOT end yet, we need more data.'}`;

    const userPrompt = `CONVERSATION SO FAR:
${conversationSoFar}

Turn ${turnNumber}/${MAX_TURNS}.

Analyze the learner's LAST message and generate your next response.

Respond with ONLY this JSON (no markdown, no code fences):
{
  "analysis": {
    "grammar_structures_used": ["list of grammar structures the learner used"],
    "vocabulary_level_estimate": "A1|A2|B1|B2|C1|C2",
    "fluency_indicators": ["list: sentence length, connectors, self-correction, etc."],
    "errors": ["list of errors made, empty if none"],
    "cefr_estimate_this_turn": "A1|A2|B1|B2|C1|C2"
  },
  "next_message": "your next conversational message in ${langName}",
  "should_end": false
}`;

    try {
      const response = await sendMessage(systemPrompt, [{ role: 'user', content: userPrompt }], {
        temperature: 0.3,
        maxTokens: 400,
      });

      // Parse response — handle potential markdown fences
      const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(cleaned);

      const analysis: TurnAnalysis = {
        grammarStructuresUsed: parsed.analysis?.grammar_structures_used || [],
        vocabularyLevelEstimate: this.validateCEFR(parsed.analysis?.vocabulary_level_estimate),
        fluencyIndicators: parsed.analysis?.fluency_indicators || [],
        errors: parsed.analysis?.errors || [],
        cefrEstimate: this.validateCEFR(parsed.analysis?.cefr_estimate_this_turn),
      };

      return {
        analysis,
        nextMessage: parsed.next_message || 'Interessante! Dimmi di più.',
        shouldEnd: !!parsed.should_end,
      };
    } catch (error) {
      logger.error('[Placement] Error in analyzeAndContinue:', error);

      // Safe fallback: generic follow-up, no analysis
      return {
        analysis: null,
        nextMessage: 'Interessante! Raccontami di più.',
        shouldEnd: session.currentTurn >= MAX_TURNS,
      };
    }
  }

  /**
   * Calculate final levels from weighted turn estimates and persist result.
   */
  private async finalizePlacement(session: PlacementSession): Promise<PlacementFinalResult> {
    const estimates = session.runningEstimates;
    const userId = session.userId;

    // Weighted average of turn estimates
    const finalLevels = this.calculateWeightedLevels(estimates);
    const durationSeconds = Math.floor((Date.now() - session.startedAt) / 1000);

    // Confidence: more turns + more agreement = higher confidence
    const confidence = this.calculateConfidence(estimates);

    const result: PlacementFinalResult = {
      ...finalLevels,
      confidence,
      turns: estimates.length,
      durationSeconds,
    };

    // Persist to database (upsert for re-tests)
    await prisma.placementResult.upsert({
      where: { userId },
      create: {
        userId,
        grammarLevel: result.grammarLevel,
        vocabularyLevel: result.vocabularyLevel,
        fluencyLevel: result.fluencyLevel,
        overallLevel: result.overallLevel,
        confidence: result.confidence,
        turns: result.turns,
        durationSeconds: result.durationSeconds,
        transcript: session.transcript as any,
        languageCode: session.languageCode,
        languageVariant: session.languageVariant,
      },
      update: {
        grammarLevel: result.grammarLevel,
        vocabularyLevel: result.vocabularyLevel,
        fluencyLevel: result.fluencyLevel,
        overallLevel: result.overallLevel,
        confidence: result.confidence,
        turns: result.turns,
        durationSeconds: result.durationSeconds,
        transcript: session.transcript as any,
        languageCode: session.languageCode,
        languageVariant: session.languageVariant,
      },
    });

    // Update LevelEstimate with calibrated values
    await prisma.levelEstimate.upsert({
      where: { userId },
      create: {
        userId,
        grammarLevel: result.grammarLevel,
        vocabularyLevel: result.vocabularyLevel,
        fluencyLevel: result.fluencyLevel,
        overallLevel: result.overallLevel,
        confidence: result.confidence,
        grammarScore: this.cefrToScore(result.grammarLevel),
        vocabularyScore: this.cefrToScore(result.vocabularyLevel),
        fluencyScore: this.cefrToScore(result.fluencyLevel),
      },
      update: {
        grammarLevel: result.grammarLevel,
        vocabularyLevel: result.vocabularyLevel,
        fluencyLevel: result.fluencyLevel,
        overallLevel: result.overallLevel,
        confidence: result.confidence,
        grammarScore: this.cefrToScore(result.grammarLevel),
        vocabularyScore: this.cefrToScore(result.vocabularyLevel),
        fluencyScore: this.cefrToScore(result.fluencyLevel),
      },
    });

    // Extract personal facts from the transcript (name, job, hobbies, etc.)
    await this.extractPersonalFacts(userId, session.transcript);

    logger.info(
      `[Placement] Completed for ${userId}: ${result.overallLevel} (confidence: ${result.confidence.toFixed(2)}, ${result.turns} turns, ${result.durationSeconds}s)`,
    );

    return result;
  }

  /**
   * Extract personal facts mentioned during placement and store in LTM.
   */
  private async extractPersonalFacts(
    userId: string,
    transcript: PlacementTurn[],
  ): Promise<void> {
    try {
      const userMessages = transcript
        .filter(t => t.role === 'user')
        .map(t => t.content)
        .join(' ');

      // Reuse the same pattern-based extraction from MemoryOrchestrator
      const patterns: Array<{ regex: RegExp; category: 'name' | 'workplace' | 'occupation' | 'location' | 'hobby' | 'goal_specific' | 'life_event' }> = [
        { regex: /(?:my name is|I'm|I am|mi chiamo|me llamo|je m'appelle|ich bin|ich heiße)\s+(\w+)/i, category: 'name' },
        { regex: /I (?:work|worked) (?:at|for|in) ([^.!?,]+)/i, category: 'workplace' },
        { regex: /I(?:'m| am) (?:a|an) ([^.!?,]+)/i, category: 'occupation' },
        { regex: /I (?:live|come from|am from) (?:in )?([^.!?,]+)/i, category: 'location' },
        { regex: /I (?:like|love|enjoy) (?:to )?([^.!?,]+)/i, category: 'hobby' },
      ];

      for (const { regex, category } of patterns) {
        const match = userMessages.match(regex);
        if (match?.[1]) {
          await this.ltm.recordPersonalFact(
            userId,
            category,
            match[1].trim(),
            'conversational',
            0.7,
          );
          logger.debug(`[Placement] Extracted fact [${category}]: ${match[1].trim()}`);
        }
      }
    } catch (error) {
      // Non-fatal
      logger.error('[Placement] Error extracting personal facts:', error);
    }
  }

  /**
   * Calculate weighted CEFR levels from turn estimates.
   */
  private calculateWeightedLevels(estimates: TurnEstimate[]): {
    grammarLevel: CEFRLevel;
    vocabularyLevel: CEFRLevel;
    fluencyLevel: CEFRLevel;
    overallLevel: CEFRLevel;
  } {
    if (estimates.length === 0) {
      return { grammarLevel: 'A2', vocabularyLevel: 'A2', fluencyLevel: 'A2', overallLevel: 'A2' };
    }

    const weightedAvg = (
      levels: CEFRLevel[],
      weights: number[],
    ): CEFRLevel => {
      let totalWeight = 0;
      let weightedSum = 0;

      for (let i = 0; i < levels.length; i++) {
        const w = weights[i] || weights[weights.length - 1];
        weightedSum += CEFR_ORDER.indexOf(levels[i]) * w;
        totalWeight += w;
      }

      const avgIndex = Math.round(weightedSum / totalWeight);
      return CEFR_ORDER[Math.max(0, Math.min(CEFR_ORDER.length - 1, avgIndex))];
    };

    const weights = TURN_WEIGHTS;

    return {
      grammarLevel: weightedAvg(estimates.map(e => e.grammar), weights),
      vocabularyLevel: weightedAvg(estimates.map(e => e.vocabulary), weights),
      fluencyLevel: weightedAvg(estimates.map(e => e.fluency), weights),
      overallLevel: weightedAvg(estimates.map(e => e.overall), weights),
    };
  }

  /**
   * Calculate confidence from agreement between turns.
   */
  private calculateConfidence(estimates: TurnEstimate[]): number {
    if (estimates.length <= 1) return 0.5;

    // Base confidence from number of turns
    const turnConfidence = Math.min(0.8, 0.4 + estimates.length * 0.1);

    // Agreement bonus: if estimates converge, confidence goes up
    const levels = estimates.map(e => CEFR_ORDER.indexOf(e.overall));
    const variance = this.calculateVariance(levels);
    const agreementBonus = variance < 0.5 ? 0.1 : variance < 1.0 ? 0.05 : 0;

    return Math.min(0.85, turnConfidence + agreementBonus);
  }

  private calculateVariance(values: number[]): number {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    return values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
  }

  private validateCEFR(level: string | undefined): CEFRLevel {
    if (level && CEFR_ORDER.includes(level as CEFRLevel)) {
      return level as CEFRLevel;
    }
    return 'A2';
  }

  private cefrToScore(level: CEFRLevel): number {
    const scores: Record<CEFRLevel, number> = {
      A1: 10, A2: 25, B1: 45, B2: 65, C1: 82, C2: 95,
    };
    return scores[level];
  }

  private getLanguageName(code: string, variant: string): string {
    const names: Record<string, string> = {
      'en-US': 'American English', 'en-UK': 'British English',
      'es-ES': 'Spanish (Spain)', 'es-LATAM': 'Latin American Spanish',
      'pt-BR': 'Brazilian Portuguese', 'pt-PT': 'European Portuguese',
      'fr-FR': 'French', 'de-DE': 'German',
      'it-IT': 'Italian', 'ar-MSA': 'Arabic',
    };
    return names[`${code}-${variant}`] || `${code} (${variant})`;
  }
}

// ============================================
// Error Class
// ============================================

export class PlacementError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'PlacementError';
  }
}

// ============================================
// Singleton
// ============================================

let placementServiceInstance: PlacementService | null = null;

export function getPlacementService(): PlacementService {
  if (!placementServiceInstance) {
    placementServiceInstance = new PlacementService();
  }
  return placementServiceInstance;
}

export default PlacementService;
