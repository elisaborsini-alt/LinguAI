import prisma from '../../db/client';
import { VectorStore, VectorSearchResult, VectorMetadata, getVectorStore } from './vectorStore';
import { logger } from '../../utils/logger';

// ============================================
// Types
// ============================================

export interface RetrievedMemory {
  id: string;
  content: string;
  type: VectorMetadata['type'];
  category: string;
  relevanceScore: number;
  source: 'vector' | 'database';
  createdAt?: string;
}

export interface MemoryContext {
  relevantFacts: RetrievedMemory[];
  recentErrors: RetrievedMemory[];
  vocabularyContext: RetrievedMemory[];
  sessionHistory: RetrievedMemory[];
  preferences: {
    preferredTopics: string[];
    avoidTopics: string[];
    responseStyle: string;
    pacePreference: string;
  };
  formattedContext: string;
}

export interface RetrievalOptions {
  maxFacts?: number;
  maxErrors?: number;
  maxVocabulary?: number;
  maxSessions?: number;
  minRelevanceScore?: number;
  includeTypes?: VectorMetadata['type'][];
}

// ============================================
// MemoryRetriever Class
// ============================================

export class MemoryRetriever {
  private vectorStore: VectorStore;

  constructor() {
    this.vectorStore = getVectorStore();
  }

  /**
   * Initialize the retriever
   */
  async initialize(): Promise<void> {
    // VectorStore (pgvector) is always ready — no initialization needed
  }

  /**
   * Get relevant memories for a conversation context
   */
  async getRelevantMemories(
    userId: string,
    currentContext: string,
    options: RetrievalOptions = {}
  ): Promise<MemoryContext> {
    const {
      maxFacts = 10,
      maxErrors = 5,
      maxVocabulary = 10,
      maxSessions = 3,
      minRelevanceScore = 0.5,
    } = options;

    try {
      // Parallel retrieval for efficiency
      const [
        vectorResults,
        userMemory,
        recentSessions,
      ] = await Promise.all([
        // Semantic search for relevant memories
        this.vectorStore.search(currentContext, userId, {
          limit: maxFacts + maxErrors + maxVocabulary,
          minScore: minRelevanceScore,
        }),
        // Get user preferences from database
        prisma.userMemory.findUnique({
          where: { userId },
          include: {
            facts: {
              where: { confidence: { gte: 0.5 } },
              orderBy: { lastReferencedAt: 'desc' },
              take: maxFacts,
            },
            errorPatterns: {
              orderBy: { frequency: 'desc' },
              take: maxErrors,
            },
            vocabulary: {
              where: { mastery: { lt: 0.8 } },
              orderBy: { lastUsedAt: 'desc' },
              take: maxVocabulary,
            },
            sessionSummaries: {
              orderBy: { date: 'desc' },
              take: maxSessions,
            },
          },
        }),
        // Get recent session summaries
        prisma.sessionSummary.findMany({
          where: {
            memory: { userId },
          },
          orderBy: { date: 'desc' },
          take: maxSessions,
        }),
      ]);

      // Categorize vector results
      const categorizedResults = this.categorizeVectorResults(vectorResults);

      // Merge with database results for comprehensive context
      const relevantFacts = this.mergeMemories(
        categorizedResults.facts,
        (userMemory?.facts || []).map(f => ({
          id: f.id,
          content: f.content,
          type: 'fact' as const,
          category: f.category,
          relevanceScore: f.confidence,
          source: 'database' as const,
          createdAt: f.createdAt.toISOString(),
        })),
        maxFacts
      );

      const recentErrors = this.mergeMemories(
        categorizedResults.errors,
        (userMemory?.errorPatterns || []).map(e => ({
          id: e.id,
          content: `${e.pattern} (occurred ${e.frequency} times)`,
          type: 'pattern' as const,
          category: e.category,
          relevanceScore: Math.min(1, e.frequency / 10),
          source: 'database' as const,
          createdAt: e.lastOccurredAt.toISOString(),
        })),
        maxErrors
      );

      const vocabularyContext = this.mergeMemories(
        categorizedResults.vocabulary,
        (userMemory?.vocabulary || []).map(v => ({
          id: v.id,
          content: `${v.word}${v.translation ? ` (${v.translation})` : ''}: ${v.context || 'No context'}`,
          type: 'vocabulary' as const,
          category: 'vocabulary',
          relevanceScore: 1 - v.mastery, // Lower mastery = more relevant to practice
          source: 'database' as const,
          createdAt: v.learnedAt.toISOString(),
        })),
        maxVocabulary
      );

      const sessionHistory = recentSessions.map(s => ({
        id: s.id,
        content: s.summary || `Session on ${s.date.toLocaleDateString()}: ${s.topicsDiscussed.join(', ')}`,
        type: 'session' as const,
        category: 'session',
        relevanceScore: 1,
        source: 'database' as const,
        createdAt: s.date.toISOString(),
      }));

      // Build preferences
      const preferences = {
        preferredTopics: userMemory?.preferredTopics || [],
        avoidTopics: userMemory?.avoidTopics || [],
        responseStyle: userMemory?.responseStyle || 'mixed',
        pacePreference: userMemory?.pacePreference || 'moderate',
      };

      // Format context string for AI prompt
      const formattedContext = this.formatContextForPrompt({
        relevantFacts,
        recentErrors,
        vocabularyContext,
        sessionHistory,
        preferences,
      });

      return {
        relevantFacts,
        recentErrors,
        vocabularyContext,
        sessionHistory,
        preferences,
        formattedContext,
      };
    } catch (error) {
      logger.error('Error retrieving memories:', error);
      // Return empty context on error
      return {
        relevantFacts: [],
        recentErrors: [],
        vocabularyContext: [],
        sessionHistory: [],
        preferences: {
          preferredTopics: [],
          avoidTopics: [],
          responseStyle: 'mixed',
          pacePreference: 'moderate',
        },
        formattedContext: 'No previous context available.',
      };
    }
  }

  /**
   * Store a new memory with vector embedding
   */
  async storeMemory(
    userId: string,
    content: string,
    type: VectorMetadata['type'],
    category: string,
    options: {
      sourceId?: string;
      confidence?: number;
    } = {}
  ): Promise<string> {
    const id = `${userId}_${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    await this.vectorStore.upsert(id, content, {
      userId,
      type,
      category,
      sourceId: options.sourceId,
      confidence: options.confidence,
      createdAt: new Date().toISOString(),
    });

    return id;
  }

  /**
   * Sync database memories to vector store
   */
  async syncUserMemoriesToVectorStore(userId: string): Promise<number> {
    const userMemory = await prisma.userMemory.findUnique({
      where: { userId },
      include: {
        facts: true,
        errorPatterns: true,
        sessionSummaries: true,
        vocabulary: true,
      },
    });

    if (!userMemory) {
      return 0;
    }

    const records: Array<{
      id: string;
      content: string;
      metadata: Omit<VectorMetadata, 'content'>;
    }> = [];

    // Add facts
    for (const fact of userMemory.facts) {
      records.push({
        id: `fact_${fact.id}`,
        content: fact.content,
        metadata: {
          userId,
          type: 'fact',
          category: fact.category,
          sourceId: fact.id,
          confidence: fact.confidence,
          createdAt: fact.createdAt.toISOString(),
        },
      });
    }

    // Add error patterns
    for (const pattern of userMemory.errorPatterns) {
      records.push({
        id: `pattern_${pattern.id}`,
        content: `Error pattern: ${pattern.pattern}. Examples: ${pattern.examples.slice(0, 3).join(', ')}`,
        metadata: {
          userId,
          type: 'pattern',
          category: pattern.category,
          sourceId: pattern.id,
          createdAt: pattern.createdAt.toISOString(),
        },
      });
    }

    // Add session summaries
    for (const session of userMemory.sessionSummaries) {
      if (session.summary) {
        records.push({
          id: `session_${session.id}`,
          content: session.summary,
          metadata: {
            userId,
            type: 'session',
            category: 'session_summary',
            sourceId: session.id,
            createdAt: session.date.toISOString(),
          },
        });
      }
    }

    // Add vocabulary items
    for (const vocab of userMemory.vocabulary) {
      records.push({
        id: `vocab_${vocab.id}`,
        content: `${vocab.word}${vocab.translation ? ` means ${vocab.translation}` : ''}.${vocab.context ? ` Context: ${vocab.context}` : ''}`,
        metadata: {
          userId,
          type: 'vocabulary',
          category: 'vocabulary',
          sourceId: vocab.id,
          confidence: vocab.mastery,
          createdAt: vocab.learnedAt.toISOString(),
        },
      });
    }

    if (records.length > 0) {
      await this.vectorStore.upsertBatch(records);
    }

    logger.info(`Synced ${records.length} memories to vector store for user ${userId}`);
    return records.length;
  }

  /**
   * Delete all memories for a user
   */
  async deleteUserMemories(userId: string): Promise<void> {
    await this.vectorStore.deleteByUser(userId);
    logger.info(`Deleted all vector memories for user ${userId}`);
  }

  // ============================================
  // Private Helper Methods
  // ============================================

  private categorizeVectorResults(results: VectorSearchResult[]): {
    facts: RetrievedMemory[];
    errors: RetrievedMemory[];
    vocabulary: RetrievedMemory[];
    sessions: RetrievedMemory[];
  } {
    const categorized = {
      facts: [] as RetrievedMemory[],
      errors: [] as RetrievedMemory[],
      vocabulary: [] as RetrievedMemory[],
      sessions: [] as RetrievedMemory[],
    };

    for (const result of results) {
      const memory: RetrievedMemory = {
        id: result.id,
        content: result.content,
        type: result.type,
        category: result.category,
        relevanceScore: result.score,
        source: 'vector',
        createdAt: result.metadata.createdAt,
      };

      switch (result.type) {
        case 'fact':
        case 'preference':
        case 'event':
          categorized.facts.push(memory);
          break;
        case 'pattern':
          categorized.errors.push(memory);
          break;
        case 'vocabulary':
          categorized.vocabulary.push(memory);
          break;
        case 'session':
          categorized.sessions.push(memory);
          break;
      }
    }

    return categorized;
  }

  private mergeMemories(
    vectorMemories: RetrievedMemory[],
    dbMemories: RetrievedMemory[],
    limit: number
  ): RetrievedMemory[] {
    // Combine and deduplicate by content similarity
    const seen = new Set<string>();
    const merged: RetrievedMemory[] = [];

    // Add vector memories first (higher relevance)
    for (const mem of vectorMemories) {
      const key = mem.content.substring(0, 50).toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        merged.push(mem);
      }
    }

    // Add database memories
    for (const mem of dbMemories) {
      const key = mem.content.substring(0, 50).toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        merged.push(mem);
      }
    }

    // Sort by relevance and limit
    return merged
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, limit);
  }

  private formatContextForPrompt(context: Omit<MemoryContext, 'formattedContext'>): string {
    const sections: string[] = [];

    // Known facts about the learner
    if (context.relevantFacts.length > 0) {
      sections.push('KNOWN ABOUT LEARNER:');
      for (const fact of context.relevantFacts.slice(0, 5)) {
        sections.push(`- ${fact.content}`);
      }
    }

    // Recent error patterns
    if (context.recentErrors.length > 0) {
      sections.push('\nCOMMON ERROR PATTERNS TO WATCH FOR:');
      for (const error of context.recentErrors.slice(0, 3)) {
        sections.push(`- ${error.content}`);
      }
    }

    // Vocabulary to reinforce
    if (context.vocabularyContext.length > 0) {
      const vocabWords = context.vocabularyContext
        .slice(0, 5)
        .map(v => v.content.split(':')[0])
        .join(', ');
      sections.push(`\nVOCABULARY TO REINFORCE: ${vocabWords}`);
    }

    // Recent session summary
    if (context.sessionHistory.length > 0) {
      const lastSession = context.sessionHistory[0];
      sections.push(`\nLAST SESSION: ${lastSession.content}`);
    }

    // Preferences
    if (context.preferences.preferredTopics.length > 0) {
      sections.push(`\nENJOYS DISCUSSING: ${context.preferences.preferredTopics.join(', ')}`);
    }
    if (context.preferences.avoidTopics.length > 0) {
      sections.push(`AVOID TOPICS: ${context.preferences.avoidTopics.join(', ')}`);
    }

    return sections.length > 0
      ? sections.join('\n')
      : 'No previous context available. This is a new learner.';
  }
}

// ============================================
// Singleton Instance
// ============================================

let memoryRetrieverInstance: MemoryRetriever | null = null;

export function getMemoryRetriever(): MemoryRetriever {
  if (!memoryRetrieverInstance) {
    memoryRetrieverInstance = new MemoryRetriever();
  }
  return memoryRetrieverInstance;
}

export default MemoryRetriever;
