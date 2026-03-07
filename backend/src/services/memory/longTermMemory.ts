import { v4 as uuidv4 } from 'uuid';
import prisma from '../../db/client';
import { getVectorStore, VectorStore } from './vectorStore';
import { sendMessage } from '../ai/claudeClient';
import {
  LongTermMemory,
  LearningProfile,
  ErrorPattern,
  ErrorCategory,
  VocabularyItem,
  PersonalFact,
  PersonalFactCategory,
  SessionSummary,
  PronunciationProfile,
  AdaptationPreferences,
  ShortTermMemory,
  SessionError,
  EmotionalState,
  CEFRLevel,
  ForgetCriteria,
  GrammarMastery,
  LearningGoal,
} from './types';
import { logger } from '../../utils/logger';

// ============================================
// Long-Term Memory Manager
// Handles cross-session persistence
// ============================================

const DEFAULT_FORGET_CRITERIA: ForgetCriteria = {
  maxAgeWithoutReference: 90, // 90 days
  minConfidenceThreshold: 0.3,
  maxErrorsPerCategory: 50,
  maxVocabularyItems: 2000,
  protectedCategories: ['name', 'occupation', 'goal_specific', 'life_event'],
  protectedPatterns: ['grammar_tense', 'grammar_agreement'],
};

export class LongTermMemoryManager {
  private vectorStore: VectorStore;

  constructor() {
    this.vectorStore = getVectorStore();
  }

  // ============================================
  // Core Operations
  // ============================================

  async getMemory(userId: string): Promise<LongTermMemory | null> {
    const userMemory = await prisma.userMemory.findUnique({
      where: { userId },
      include: {
        facts: true,
        errorPatterns: true,
        vocabulary: true,
        sessionSummaries: { orderBy: { date: 'desc' }, take: 10 },
      },
    });

    if (!userMemory) return null;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { levelEstimates: true },
    });

    if (!user) return null;

    return this.mapToLongTermMemory(user, userMemory);
  }

  async initializeMemory(userId: string): Promise<LongTermMemory> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { levelEstimates: true },
    });

    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }

    // Create UserMemory if doesn't exist
    let userMemory = await prisma.userMemory.findUnique({
      where: { userId },
    });

    if (!userMemory) {
      userMemory = await prisma.userMemory.create({
        data: {
          userId,
          preferredTopics: [],
          avoidTopics: [],
          responseStyle: 'mixed',
          pacePreference: 'moderate',
        },
      });
    }

    return this.mapToLongTermMemory(user, {
      ...userMemory,
      facts: [],
      errorPatterns: [],
      vocabulary: [],
      sessionSummaries: [],
    });
  }

  // ============================================
  // Error Pattern Management
  // ============================================

  async recordErrorPattern(
    userId: string,
    error: SessionError
  ): Promise<ErrorPattern> {
    const memoryId = await this.ensureMemoryExists(userId);

    // Check if pattern already exists
    const existing = await prisma.errorPattern.findFirst({
      where: {
        memoryId,
        category: error.category,
        pattern: { contains: error.original.substring(0, 50) },
      },
    });

    if (existing) {
      // Update existing pattern
      const updated = await prisma.errorPattern.update({
        where: { id: existing.id },
        data: {
          frequency: { increment: 1 },
          examples: {
            push: error.original,
          },
          lastOccurredAt: new Date(),
        },
      });

      // Index in vector store for semantic search
      await this.vectorStore.upsert(
        `error_${existing.id}`,
        `Error pattern: ${existing.pattern}. Latest example: ${error.original}`,
        {
          userId,
          type: 'pattern',
          category: error.category,
          sourceId: existing.id,
          createdAt: new Date().toISOString(),
        }
      );

      return this.mapDbPatternToErrorPattern(updated);
    }

    // Create new pattern
    const patternDescription = this.generatePatternDescription(error);
    const newPattern = await prisma.errorPattern.create({
      data: {
        memoryId,
        category: error.category,
        pattern: patternDescription,
        examples: [error.original],
        frequency: 1,
        corrected: false,
        lastOccurredAt: new Date(),
      },
    });

    // Index in vector store
    await this.vectorStore.upsert(
      `error_${newPattern.id}`,
      `Error pattern: ${patternDescription}. Example: ${error.original}`,
      {
        userId,
        type: 'pattern',
        category: error.category,
        sourceId: newPattern.id,
        createdAt: new Date().toISOString(),
      }
    );

    return this.mapDbPatternToErrorPattern(newPattern);
  }

  async getActiveErrorPatterns(
    userId: string,
    limit: number = 10
  ): Promise<ErrorPattern[]> {
    const userMemory = await prisma.userMemory.findUnique({
      where: { userId },
    });

    if (!userMemory) return [];

    const patterns = await prisma.errorPattern.findMany({
      where: {
        memoryId: userMemory.id,
        corrected: false,
      },
      orderBy: [
        { frequency: 'desc' },
        { lastOccurredAt: 'desc' },
      ],
      take: limit,
    });

    return patterns.map(p => this.mapDbPatternToErrorPattern(p));
  }

  async markPatternImproving(
    userId: string,
    patternId: string,
    improvementRate: number
  ): Promise<void> {
    await prisma.errorPattern.update({
      where: { id: patternId },
      data: {
        corrected: improvementRate > 0.7,
      },
    });
  }

  // ============================================
  // Vocabulary Management
  // ============================================

  async recordVocabulary(
    userId: string,
    word: string,
    context: string,
    wasCorrect: boolean,
    translation?: string
  ): Promise<VocabularyItem> {
    const memoryId = await this.ensureMemoryExists(userId);

    const existing = await prisma.learnedVocabulary.findFirst({
      where: { memoryId, word: word.toLowerCase() },
    });

    if (existing) {
      // Update spaced repetition data
      const newMastery = this.calculateNewMastery(
        existing.mastery,
        existing.timesUsed,
        wasCorrect
      );

      const updated = await prisma.learnedVocabulary.update({
        where: { id: existing.id },
        data: {
          timesUsed: { increment: 1 },
          mastery: newMastery,
          lastUsedAt: new Date(),
          context: wasCorrect ? context : existing.context, // Keep context from correct usage
        },
      });

      return this.mapDbVocabToVocabularyItem(updated);
    }

    // Create new vocabulary entry
    const newVocab = await prisma.learnedVocabulary.create({
      data: {
        memoryId,
        word: word.toLowerCase(),
        translation,
        context,
        timesUsed: 1,
        mastery: wasCorrect ? 0.3 : 0.1,
        learnedAt: new Date(),
        lastUsedAt: new Date(),
      },
    });

    // Index in vector store for semantic retrieval
    await this.vectorStore.upsert(
      `vocab_${newVocab.id}`,
      `Vocabulary: ${word}${translation ? ` means ${translation}` : ''}. Context: ${context}`,
      {
        userId,
        type: 'vocabulary',
        category: 'vocabulary',
        sourceId: newVocab.id,
        confidence: newVocab.mastery,
        createdAt: new Date().toISOString(),
      }
    );

    return this.mapDbVocabToVocabularyItem(newVocab);
  }

  async getVocabularyForReinforcement(
    userId: string,
    limit: number = 10
  ): Promise<VocabularyItem[]> {
    const userMemory = await prisma.userMemory.findUnique({
      where: { userId },
    });

    if (!userMemory) return [];

    // Get words with low mastery or not used recently
    const vocabulary = await prisma.learnedVocabulary.findMany({
      where: {
        memoryId: userMemory.id,
        mastery: { lt: 0.7 },
      },
      orderBy: [
        { mastery: 'asc' },
        { lastUsedAt: 'asc' },
      ],
      take: limit,
    });

    return vocabulary.map(v => this.mapDbVocabToVocabularyItem(v));
  }

  // ============================================
  // Personal Facts Management
  // ============================================

  async recordPersonalFact(
    userId: string,
    category: PersonalFactCategory,
    content: string,
    source: 'user_stated' | 'inferred' | 'conversational',
    confidence: number = 0.8
  ): Promise<PersonalFact> {
    const memoryId = await this.ensureMemoryExists(userId);

    // Check for similar existing fact
    const existing = await prisma.memoryFact.findFirst({
      where: {
        memoryId,
        category,
        content: { contains: content.substring(0, 30) },
      },
    });

    if (existing) {
      // Update confidence and reference
      const updated = await prisma.memoryFact.update({
        where: { id: existing.id },
        data: {
          confidence: Math.max(existing.confidence, confidence),
          lastReferencedAt: new Date(),
        },
      });

      return this.mapDbFactToPersonalFact(updated, source);
    }

    // Create new fact
    const newFact = await prisma.memoryFact.create({
      data: {
        memoryId,
        category,
        content,
        confidence,
        createdAt: new Date(),
        lastReferencedAt: new Date(),
      },
    });

    // Index in vector store for semantic retrieval
    await this.vectorStore.upsert(
      `fact_${newFact.id}`,
      `${category}: ${content}`,
      {
        userId,
        type: 'fact',
        category,
        sourceId: newFact.id,
        confidence,
        createdAt: new Date().toISOString(),
      }
    );

    return this.mapDbFactToPersonalFact(newFact, source);
  }

  async getRelevantFacts(
    userId: string,
    context: string,
    limit: number = 5
  ): Promise<PersonalFact[]> {
    // Use vector search for semantic relevance
    const vectorResults = await this.vectorStore.search(context, userId, {
      limit,
      types: ['fact', 'preference'],
      minScore: 0.6,
    });

    return vectorResults.map(r => ({
      id: r.id,
      category: r.category as PersonalFactCategory,
      content: r.content,
      confidence: r.metadata.confidence || 0.5,
      source: 'conversational' as const,
      firstMentioned: new Date(r.metadata.createdAt),
      lastReferenced: new Date(),
      referenceCount: 1,
      isActive: true,
    }));
  }

  // ============================================
  // Session Summary Management
  // ============================================

  async saveSessionSummary(
    userId: string,
    summary: Omit<SessionSummary, 'id'>
  ): Promise<SessionSummary> {
    const memoryId = await this.ensureMemoryExists(userId);

    const saved = await prisma.sessionSummary.create({
      data: {
        memoryId,
        conversationId: uuidv4(),
        date: summary.date,
        durationMinutes: summary.durationMinutes,
        topicsDiscussed: summary.topicsDiscussed,
        keyMistakes: summary.errorsAddressed,
        improvements: summary.breakthroughs,
        vocabularyIntroduced: summary.newVocabulary,
        fluencyScore: summary.fluencyScore,
        accuracyScore: summary.accuracyScore,
        summary: summary.narrativeSummary,
      },
    });

    // Index summary for context retrieval
    await this.vectorStore.upsert(
      `session_${saved.id}`,
      summary.narrativeSummary,
      {
        userId,
        type: 'session',
        category: 'session_summary',
        sourceId: saved.id,
        createdAt: saved.date.toISOString(),
      }
    );

    return {
      ...summary,
      id: saved.id,
    };
  }

  async getRecentSessions(
    userId: string,
    limit: number = 5
  ): Promise<SessionSummary[]> {
    const userMemory = await prisma.userMemory.findUnique({
      where: { userId },
    });

    if (!userMemory) return [];

    const sessions = await prisma.sessionSummary.findMany({
      where: { memoryId: userMemory.id },
      orderBy: { date: 'desc' },
      take: limit,
    });

    return sessions.map(s => ({
      id: s.id,
      date: s.date,
      durationMinutes: s.durationMinutes,
      overallScore: ((s.fluencyScore || 0) + (s.accuracyScore || 0)) / 2,
      fluencyScore: s.fluencyScore || 0,
      accuracyScore: s.accuracyScore || 0,
      topicsDiscussed: s.topicsDiscussed,
      newVocabulary: s.vocabularyIntroduced,
      errorsAddressed: s.keyMistakes,
      breakthroughs: s.improvements,
      startingMood: 'neutral' as EmotionalState,
      endingMood: 'neutral' as EmotionalState,
      emotionalTrend: 'stable' as const,
      narrativeSummary: s.summary || '',
      keyInsights: [],
      recommendedFocus: [],
    }));
  }

  // ============================================
  // Conversation Thread Management
  // ============================================

  /**
   * Get active conversation threads for a user, ordered by recency.
   */
  async getActiveThreads(
    userId: string,
    limit: number = 3
  ): Promise<Array<{
    topic: string;
    context: string;
    lastMentionedAt: Date;
    mentions: number;
  }>> {
    const threads = await prisma.conversationThread.findMany({
      where: { userId, status: 'open' },
      orderBy: { lastMentionedAt: 'desc' },
      take: limit,
    });

    return threads.map(t => ({
      topic: t.topic,
      context: t.context,
      lastMentionedAt: t.lastMentionedAt,
      mentions: t.mentions,
    }));
  }

  /**
   * Extract conversation threads from a completed session using Claude.
   * Called during consolidation after saveSessionSummary.
   * Non-fatal: failures are logged but never propagate.
   */
  async extractConversationThreads(
    userId: string,
    shortTermMemory: ShortTermMemory
  ): Promise<void> {
    try {
      // Skip short sessions (< 4 user messages) to save API costs
      const userMessages = shortTermMemory.recentMessages.filter(m => m.role === 'user');
      if (userMessages.length < 4) {
        logger.debug(`[Threads] Skipping extraction for ${userId}: only ${userMessages.length} user messages`);
        return;
      }

      // Get existing open threads to pass to Claude
      const existingThreads = await prisma.conversationThread.findMany({
        where: { userId, status: 'open' },
        orderBy: { lastMentionedAt: 'desc' },
        take: 10,
      });

      // Build conversation transcript for analysis
      const transcript = shortTermMemory.recentMessages
        .map(m => `${m.role === 'user' ? 'Learner' : 'Tutor'}: ${m.content}`)
        .join('\n');

      const existingThreadsList = existingThreads.length > 0
        ? existingThreads.map(t => `- "${t.topic}" (context: ${t.context})`).join('\n')
        : 'None';

      const extractionPrompt = `Analyze this language practice conversation and extract personally meaningful topics the learner mentioned — things a friend would remember and follow up on later.

EXISTING OPEN THREADS:
${existingThreadsList}

CONVERSATION:
${transcript}

Respond with a JSON object:
{
  "new_threads": [
    {
      "topic": "short topic label",
      "context": "1-2 sentence context about what was said",
      "emotion": "emotional context if notable (e.g. nervous, excited) or null"
    }
  ],
  "updated_threads": [
    {
      "topic": "exact topic from existing threads that was referenced again",
      "context": "updated context based on new info"
    }
  ],
  "resolved_threads": [
    "exact topic from existing threads that is now complete/resolved"
  ]
}

Rules:
- Only extract topics that are PERSONALLY meaningful (life events, goals, plans, relationships, milestones)
- Do NOT extract generic conversation topics like "weather" or "food preferences"
- A thread is "resolved" if the learner indicates it's done (e.g. "the interview went great!")
- Maximum 3 new threads per session
- If nothing meaningful was discussed, return empty arrays`;

      const response = await sendMessage(
        'You are a conversation analyst. Respond only with valid JSON.',
        [{ role: 'user', content: extractionPrompt }],
        { temperature: 0.2, maxTokens: 500 }
      );

      // Parse Claude's response
      const parsed = JSON.parse(response);

      // Create new threads
      if (parsed.new_threads && Array.isArray(parsed.new_threads)) {
        for (const thread of parsed.new_threads.slice(0, 3)) {
          if (thread.topic && thread.context) {
            await prisma.conversationThread.create({
              data: {
                userId,
                topic: thread.topic,
                context: thread.context,
                emotion: thread.emotion || null,
                status: 'open',
                mentions: 1,
                lastMentionedAt: new Date(),
              },
            });
            logger.debug(`[Threads] Created thread for ${userId}: "${thread.topic}"`);
          }
        }
      }

      // Update existing threads that were referenced again
      if (parsed.updated_threads && Array.isArray(parsed.updated_threads)) {
        for (const update of parsed.updated_threads) {
          const existing = existingThreads.find(t => t.topic === update.topic);
          if (existing) {
            await prisma.conversationThread.update({
              where: { id: existing.id },
              data: {
                context: update.context || existing.context,
                mentions: { increment: 1 },
                lastMentionedAt: new Date(),
              },
            });
            logger.debug(`[Threads] Updated thread for ${userId}: "${update.topic}"`);
          }
        }
      }

      // Resolve completed threads
      if (parsed.resolved_threads && Array.isArray(parsed.resolved_threads)) {
        for (const topic of parsed.resolved_threads) {
          const existing = existingThreads.find(t => t.topic === topic);
          if (existing) {
            await prisma.conversationThread.update({
              where: { id: existing.id },
              data: { status: 'resolved' },
            });
            logger.debug(`[Threads] Resolved thread for ${userId}: "${topic}"`);
          }
        }
      }
    } catch (error) {
      // Non-fatal: thread extraction should never break session consolidation
      logger.error('[Threads] Error extracting conversation threads:', error);
    }
  }

  // ============================================
  // Memory Consolidation
  // Called at end of session
  // ============================================

  async consolidateSession(
    userId: string,
    shortTermMemory: ShortTermMemory
  ): Promise<void> {
    logger.info(`Consolidating session for user ${userId}`);

    // 1. Process and save error patterns
    for (const error of shortTermMemory.sessionErrors) {
      await this.recordErrorPattern(userId, error);
    }

    // 2. Process vocabulary
    const uniqueWords = Array.from(shortTermMemory.vocabularyUsed);
    for (const word of uniqueWords) {
      // Determine if word was used correctly (simplified - real impl would check)
      const wasCorrect = !shortTermMemory.sessionErrors.some(
        e => e.original.toLowerCase().includes(word)
      );
      await this.recordVocabulary(userId, word, 'conversation', wasCorrect);
    }

    // 3. Update adaptation preferences based on session
    await this.updateAdaptationPreferences(userId, shortTermMemory);

    // 4. Generate and save session summary
    const summary = await this.generateSessionSummary(shortTermMemory);
    await this.saveSessionSummary(userId, summary);

    // 5. Extract conversation threads (after summary, before level estimates)
    await this.extractConversationThreads(userId, shortTermMemory);

    // 6. Update level estimates
    await this.updateLevelEstimates(userId, shortTermMemory);

    // 7. Run forgetting process
    await this.runForgettingProcess(userId);

    logger.info(`Session consolidation complete for user ${userId}`);
  }

  // ============================================
  // Forgetting Process
  // What to intentionally forget
  // ============================================

  async runForgettingProcess(
    userId: string,
    criteria: ForgetCriteria = DEFAULT_FORGET_CRITERIA
  ): Promise<void> {
    const userMemory = await prisma.userMemory.findUnique({
      where: { userId },
    });

    if (!userMemory) return;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - criteria.maxAgeWithoutReference);

    // 0. Expire conversation threads older than 30 days
    const threadCutoffDate = new Date();
    threadCutoffDate.setDate(threadCutoffDate.getDate() - 30);
    await prisma.conversationThread.updateMany({
      where: {
        userId,
        status: 'open',
        lastMentionedAt: { lt: threadCutoffDate },
      },
      data: { status: 'expired' },
    });

    // 1. Deprioritize old, low-confidence facts
    await prisma.memoryFact.updateMany({
      where: {
        memoryId: userMemory.id,
        lastReferencedAt: { lt: cutoffDate },
        confidence: { lt: criteria.minConfidenceThreshold },
        category: { notIn: criteria.protectedCategories },
      },
      data: {
        confidence: 0, // Mark for potential cleanup
      },
    });

    // 2. Archive old resolved error patterns
    await prisma.errorPattern.deleteMany({
      where: {
        memoryId: userMemory.id,
        corrected: true,
        lastOccurredAt: { lt: cutoffDate },
        category: { notIn: criteria.protectedPatterns },
      },
    });

    // 3. Limit vocabulary to top N by mastery and recency
    const vocabCount = await prisma.learnedVocabulary.count({
      where: { memoryId: userMemory.id },
    });

    if (vocabCount > criteria.maxVocabularyItems) {
      // Get IDs of vocabulary to keep
      const toKeep = await prisma.learnedVocabulary.findMany({
        where: { memoryId: userMemory.id },
        orderBy: [
          { mastery: 'desc' },
          { lastUsedAt: 'desc' },
        ],
        take: criteria.maxVocabularyItems,
        select: { id: true },
      });

      const keepIds = toKeep.map(v => v.id);

      // Delete the rest
      await prisma.learnedVocabulary.deleteMany({
        where: {
          memoryId: userMemory.id,
          id: { notIn: keepIds },
        },
      });
    }

    // 4. Limit error patterns per category
    const categories = Object.values(prisma.errorPattern.fields) as unknown as ErrorCategory[];
    // Get unique categories from existing patterns
    const existingCategories = await prisma.errorPattern.groupBy({
      by: ['category'],
      where: { memoryId: userMemory.id },
    });

    for (const { category } of existingCategories) {
      const count = await prisma.errorPattern.count({
        where: { memoryId: userMemory.id, category },
      });

      if (count > criteria.maxErrorsPerCategory) {
        const toKeep = await prisma.errorPattern.findMany({
          where: { memoryId: userMemory.id, category },
          orderBy: [
            { frequency: 'desc' },
            { lastOccurredAt: 'desc' },
          ],
          take: criteria.maxErrorsPerCategory,
          select: { id: true },
        });

        const keepIds = toKeep.map(p => p.id);

        await prisma.errorPattern.deleteMany({
          where: {
            memoryId: userMemory.id,
            category,
            id: { notIn: keepIds },
          },
        });
      }
    }

    logger.debug(`Forgetting process complete for user ${userId}`);
  }

  // ============================================
  // Private Helper Methods
  // ============================================

  private async ensureMemoryExists(userId: string): Promise<string> {
    let userMemory = await prisma.userMemory.findUnique({
      where: { userId },
    });

    if (!userMemory) {
      userMemory = await prisma.userMemory.create({
        data: {
          userId,
          preferredTopics: [],
          avoidTopics: [],
          responseStyle: 'mixed',
          pacePreference: 'moderate',
        },
      });
    }

    return userMemory.id;
  }

  private calculateNewMastery(
    currentMastery: number,
    exposureCount: number,
    wasCorrect: boolean
  ): number {
    // Spaced repetition inspired algorithm
    const learningRate = 1 / (exposureCount + 1);

    if (wasCorrect) {
      return Math.min(1, currentMastery + learningRate * (1 - currentMastery) * 0.3);
    } else {
      return Math.max(0, currentMastery - learningRate * currentMastery * 0.5);
    }
  }

  private generatePatternDescription(error: SessionError): string {
    const categoryDescriptions: Record<ErrorCategory, string> = {
      'grammar_tense': 'Incorrect verb tense usage',
      'grammar_agreement': 'Subject-verb or noun-adjective agreement error',
      'grammar_articles': 'Article (a/an/the) usage error',
      'grammar_prepositions': 'Preposition choice error',
      'grammar_word_order': 'Word order error',
      'vocabulary_wrong_word': 'Wrong word choice',
      'vocabulary_false_friend': 'False friend error (similar word, different meaning)',
      'vocabulary_collocation': 'Collocation error',
      'pronunciation_vowel': 'Vowel pronunciation error',
      'pronunciation_consonant': 'Consonant pronunciation error',
      'pronunciation_stress': 'Word stress error',
      'pronunciation_intonation': 'Intonation pattern error',
      'usage_register': 'Register/formality mismatch',
      'usage_idiom': 'Idiom misuse',
      'usage_formality': 'Formality level error',
    };

    return `${categoryDescriptions[error.category]}: "${error.original}" should be "${error.correction}"`;
  }

  private async updateAdaptationPreferences(
    userId: string,
    stm: ShortTermMemory
  ): Promise<void> {
    // Infer preferences from session behavior
    const hesitationRate = stm.confidenceSignals.filter(
      s => ['long_pause', 'filler_words'].includes(s.type)
    ).length / Math.max(1, stm.recentMessages.length);

    const preferredPace = hesitationRate > 0.3 ? 'slower' :
                          hesitationRate < 0.1 ? 'faster' : 'normal';

    // Update in database
    await prisma.userMemory.update({
      where: { userId },
      data: {
        pacePreference: preferredPace === 'slower' ? 'slow' :
                        preferredPace === 'faster' ? 'fast' : 'moderate',
        preferredTopics: { push: stm.topicsDiscussed.slice(-3) },
      },
    });
  }

  private async generateSessionSummary(
    stm: ShortTermMemory
  ): Promise<Omit<SessionSummary, 'id'>> {
    const duration = Math.floor((Date.now() - stm.startedAt.getTime()) / 60000);
    const errorRate = stm.sessionErrors.length /
      Math.max(1, stm.currentPerformance.userMessageCount);

    const startMood = stm.emotionalTrajectory[0]?.state || 'neutral';
    const endMood = stm.emotionalTrajectory[stm.emotionalTrajectory.length - 1]?.state || 'neutral';

    const positiveStates = ['confident', 'engaged', 'excited'];
    const emotionalTrend: 'improved' | 'stable' | 'declined' =
      positiveStates.includes(endMood) && !positiveStates.includes(startMood) ? 'improved' :
      !positiveStates.includes(endMood) && positiveStates.includes(startMood) ? 'declined' :
      'stable';

    return {
      date: new Date(),
      durationMinutes: duration,
      overallScore: Math.round((1 - errorRate) * 100),
      fluencyScore: Math.round((1 - stm.currentPerformance.hesitationCount /
        Math.max(1, stm.currentPerformance.userMessageCount)) * 100),
      accuracyScore: Math.round((1 - errorRate) * 100),
      topicsDiscussed: stm.topicsDiscussed,
      newVocabulary: Array.from(stm.vocabularyUsed).slice(0, 10),
      errorsAddressed: stm.sessionErrors
        .filter(e => e.wasAddressed)
        .map(e => e.original),
      breakthroughs: [],
      startingMood: startMood as EmotionalState,
      endingMood: endMood as EmotionalState,
      emotionalTrend,
      narrativeSummary: this.generateNarrativeSummary(stm),
      keyInsights: [],
      recommendedFocus: this.generateRecommendedFocus(stm),
    };
  }

  private generateNarrativeSummary(stm: ShortTermMemory): string {
    const duration = Math.floor((Date.now() - stm.startedAt.getTime()) / 60000);
    const topics = stm.topicsDiscussed.slice(0, 3).join(', ') || 'general conversation';
    const errorCount = stm.sessionErrors.length;
    const wordCount = stm.currentPerformance.totalWords;

    return `${duration}-minute session discussing ${topics}. Used ${wordCount} words with ${errorCount} corrections. ${this.summarizeEmotionalJourney(stm)}`;
  }

  private summarizeEmotionalJourney(stm: ShortTermMemory): string {
    if (stm.emotionalTrajectory.length < 2) return 'Neutral throughout.';

    const start = stm.emotionalTrajectory[0].state;
    const end = stm.emotionalTrajectory[stm.emotionalTrajectory.length - 1].state;

    if (start === end) return `Maintained ${start} mood.`;
    return `Started ${start}, ended ${end}.`;
  }

  private generateRecommendedFocus(stm: ShortTermMemory): string[] {
    const focus: string[] = [];

    // Group errors by category
    const errorsByCategory = new Map<ErrorCategory, number>();
    for (const error of stm.sessionErrors) {
      errorsByCategory.set(
        error.category,
        (errorsByCategory.get(error.category) || 0) + 1
      );
    }

    // Find top error categories
    const sortedCategories = [...errorsByCategory.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2);

    for (const [category, count] of sortedCategories) {
      if (count >= 2) {
        focus.push(`Practice ${category.replace(/_/g, ' ')}`);
      }
    }

    // Check hesitation
    if (stm.currentPerformance.hesitationCount > 5) {
      focus.push('Work on speaking fluency and confidence');
    }

    return focus;
  }

  private async updateLevelEstimates(
    userId: string,
    stm: ShortTermMemory
  ): Promise<void> {
    const estimates = await prisma.levelEstimate.findUnique({
      where: { userId },
    });

    if (!estimates) return;

    // Calculate session-based adjustments
    const errorRate = stm.sessionErrors.length /
      Math.max(1, stm.currentPerformance.userMessageCount);
    const grammarErrorRate = stm.currentPerformance.grammarErrors /
      Math.max(1, stm.currentPerformance.userMessageCount);
    const vocabErrorRate = stm.currentPerformance.vocabularyErrors /
      Math.max(1, stm.currentPerformance.userMessageCount);

    // Small adjustments based on performance
    const grammarDelta = grammarErrorRate < 0.1 ? 0.02 : grammarErrorRate > 0.3 ? -0.01 : 0;
    const vocabDelta = vocabErrorRate < 0.1 ? 0.02 : vocabErrorRate > 0.3 ? -0.01 : 0;

    await prisma.levelEstimate.update({
      where: { userId },
      data: {
        grammarScore: Math.max(0, Math.min(100, estimates.grammarScore + grammarDelta * 100)),
        vocabularyScore: Math.max(0, Math.min(100, estimates.vocabularyScore + vocabDelta * 100)),
        confidence: Math.min(1, estimates.confidence + 0.01),
        updatedAt: new Date(),
      },
    });
  }

  private mapToLongTermMemory(user: any, userMemory: any): LongTermMemory {
    return {
      userId: user.id,
      createdAt: userMemory.createdAt || new Date(),
      lastUpdatedAt: userMemory.updatedAt || new Date(),
      learningProfile: {
        nativeLanguage: user.nativeLanguage,
        targetLanguage: user.targetLanguageCode,
        targetVariant: user.targetLanguageVariant,
        primaryGoal: user.currentGoal as LearningGoal,
        secondaryGoals: [],
        levels: {
          grammar: (user.levelEstimates?.grammarLevel || 'A2') as CEFRLevel,
          vocabulary: (user.levelEstimates?.vocabularyLevel || 'A2') as CEFRLevel,
          fluency: (user.levelEstimates?.fluencyLevel || 'A2') as CEFRLevel,
          pronunciation: 'A2' as CEFRLevel,
          overall: (user.levelEstimates?.overallLevel || 'A2') as CEFRLevel,
          confidence: user.levelEstimates?.confidence || 0.5,
        },
        learningSpeed: 'moderate',
        retentionRate: 0.7,
        practiceFrequency: 'occasional',
        averageSessionLength: 15,
        motivationTriggers: [],
        frustrationTriggers: [],
      },
      errorPatterns: (userMemory.errorPatterns || []).map(this.mapDbPatternToErrorPattern),
      vocabularyBank: (userMemory.vocabulary || []).map(this.mapDbVocabToVocabularyItem),
      grammarMastery: [],
      personalFacts: (userMemory.facts || []).map((f: any) =>
        this.mapDbFactToPersonalFact(f, 'conversational')
      ),
      sessionHistory: [],
      pronunciationProfile: {
        weakSounds: [],
        intonationPatterns: [],
        rhythmIssues: [],
        overallClarity: 70,
        nativeAccentInfluence: [],
      },
      adaptationPreferences: {
        preferredCorrectionTiming: 'immediate',
        correctionDetail: 'moderate',
        preferExplicitCorrection: true,
        preferredPace: userMemory.pacePreference === 'slow' ? 'slower' :
                       userMemory.pacePreference === 'fast' ? 'faster' : 'normal',
        vocabularyComplexity: 'matched',
        sentenceLength: 'normal',
        formality: userMemory.responseStyle === 'formal' ? 'formal' :
                   userMemory.responseStyle === 'casual' ? 'casual' : 'neutral',
        encouragementLevel: 'moderate',
        humorAppreciation: true,
        preferredTopics: userMemory.preferredTopics || [],
        avoidTopics: userMemory.avoidTopics || [],
        prefersExamples: true,
        prefersRules: false,
        prefersRepetition: true,
      },
    };
  }

  private mapDbPatternToErrorPattern(pattern: any): ErrorPattern {
    return {
      id: pattern.id,
      category: pattern.category as ErrorCategory,
      pattern: pattern.pattern,
      examples: pattern.examples.map((e: string) => ({
        original: e,
        correction: '',
        context: '',
        date: pattern.lastOccurredAt,
      })),
      frequency: pattern.frequency,
      lastOccurrence: pattern.lastOccurredAt,
      firstOccurrence: pattern.createdAt,
      status: pattern.corrected ? 'resolved' : 'active',
      improvementRate: 0,
    };
  }

  private mapDbVocabToVocabularyItem(vocab: any): VocabularyItem {
    return {
      id: vocab.id,
      word: vocab.word,
      translation: vocab.translation,
      partOfSpeech: 'unknown',
      mastery: vocab.mastery,
      exposureCount: vocab.timesUsed,
      correctUsageCount: Math.floor(vocab.timesUsed * vocab.mastery),
      incorrectUsageCount: Math.floor(vocab.timesUsed * (1 - vocab.mastery)),
      nextReviewDate: new Date(),
      easeFactor: 2.5,
      interval: 1,
      learnedContext: vocab.context || '',
      relatedWords: [],
      firstSeen: vocab.learnedAt,
      lastUsed: vocab.lastUsedAt,
    };
  }

  private mapDbFactToPersonalFact(
    fact: any,
    source: 'user_stated' | 'inferred' | 'conversational'
  ): PersonalFact {
    return {
      id: fact.id,
      category: fact.category as PersonalFactCategory,
      content: fact.content,
      confidence: fact.confidence,
      source,
      firstMentioned: fact.createdAt,
      lastReferenced: fact.lastReferencedAt,
      referenceCount: 1,
      isActive: fact.confidence > 0,
    };
  }
}

// Singleton
let ltmInstance: LongTermMemoryManager | null = null;

export function getLongTermMemory(): LongTermMemoryManager {
  if (!ltmInstance) {
    ltmInstance = new LongTermMemoryManager();
  }
  return ltmInstance;
}

export default LongTermMemoryManager;
