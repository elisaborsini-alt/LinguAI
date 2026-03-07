import OpenAI from 'openai';
import prisma from '../../db/client';
import { logger } from '../../utils/logger';

// ============================================
// Types
// ============================================

export interface VectorMetadata {
  userId: string;
  content: string;
  type: 'fact' | 'preference' | 'event' | 'pattern' | 'session' | 'vocabulary';
  category: string;
  sourceId?: string;
  createdAt: string;
  confidence?: number;
}

export interface VectorSearchResult {
  id: string;
  content: string;
  type: VectorMetadata['type'];
  category: string;
  score: number;
  metadata: VectorMetadata;
}

// ============================================
// VectorStore Class (pgvector + OpenAI embeddings)
// ============================================

export class VectorStore {
  private openai: OpenAI | null = null;
  private embeddingsEnabled: boolean;
  private static readonly EMBEDDING_TIMEOUT_MS = 5_000;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey) {
      this.openai = new OpenAI({ apiKey });
      this.embeddingsEnabled = true;
    } else {
      logger.warn('[VectorStore] OPENAI_API_KEY not set — semantic search disabled, falling back to Prisma queries');
      this.embeddingsEnabled = false;
    }
  }

  /**
   * Generate embedding for text using OpenAI text-embedding-3-small
   */
  private async generateEmbedding(text: string): Promise<number[] | null> {
    if (!this.openai) return null;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(
        () => controller.abort(),
        VectorStore.EMBEDDING_TIMEOUT_MS,
      );

      try {
        const response = await this.openai.embeddings.create(
          {
            model: 'text-embedding-3-small',
            input: text.substring(0, 8000), // API limit safety
          },
          { signal: controller.signal as any },
        );
        return response.data[0].embedding;
      } finally {
        clearTimeout(timeout);
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        logger.warn('[VectorStore] Embedding request timed out');
      } else {
        logger.error('[VectorStore] Embedding generation failed:', error);
      }
      return null;
    }
  }

  /**
   * Store or update a memory vector
   */
  async upsert(
    id: string,
    content: string,
    metadata: Omit<VectorMetadata, 'content'>
  ): Promise<void> {
    try {
      const embedding = await this.generateEmbedding(content);

      if (embedding) {
        const embeddingStr = `[${embedding.join(',')}]`;
        await prisma.$executeRawUnsafe(
          `INSERT INTO "MemoryEmbedding" ("id", "userId", "content", "type", "category", "sourceId", "confidence", "createdAt", "embedding")
           VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8::vector)
           ON CONFLICT ("id") DO UPDATE SET
             "content" = EXCLUDED."content",
             "confidence" = EXCLUDED."confidence",
             "embedding" = EXCLUDED."embedding"`,
          id,
          metadata.userId,
          content,
          metadata.type,
          metadata.category,
          metadata.sourceId || null,
          metadata.confidence || 0.5,
          embeddingStr
        );
      } else {
        // Store without embedding (still useful for non-semantic queries)
        await prisma.$executeRawUnsafe(
          `INSERT INTO "MemoryEmbedding" ("id", "userId", "content", "type", "category", "sourceId", "confidence", "createdAt")
           VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
           ON CONFLICT ("id") DO UPDATE SET
             "content" = EXCLUDED."content",
             "confidence" = EXCLUDED."confidence"`,
          id,
          metadata.userId,
          content,
          metadata.type,
          metadata.category,
          metadata.sourceId || null,
          metadata.confidence || 0.5
        );
      }

      logger.debug(`[VectorStore] Stored memory vector: ${id}`);
    } catch (error) {
      logger.error('[VectorStore] Failed to upsert vector:', error);
    }
  }

  /**
   * Store multiple memory vectors in batch
   */
  async upsertBatch(
    records: Array<{
      id: string;
      content: string;
      metadata: Omit<VectorMetadata, 'content'>;
    }>
  ): Promise<void> {
    for (const record of records) {
      await this.upsert(record.id, record.content, record.metadata);
    }
  }

  /**
   * Search for similar memories using cosine distance
   */
  async search(
    query: string,
    userId: string,
    options: {
      limit?: number;
      minScore?: number;
      types?: VectorMetadata['type'][];
      categories?: string[];
    } = {}
  ): Promise<VectorSearchResult[]> {
    const { limit = 10, minScore = 0.5, types, categories } = options;

    if (!this.embeddingsEnabled) {
      // Fallback: return recent matching records without semantic ranking
      return this.fallbackSearch(userId, { limit, types, categories });
    }

    try {
      const queryEmbedding = await this.generateEmbedding(query);
      if (!queryEmbedding) {
        return this.fallbackSearch(userId, { limit, types, categories });
      }

      const embeddingStr = `[${queryEmbedding.join(',')}]`;

      // Build dynamic WHERE clauses
      const conditions: string[] = ['"userId" = $1', '"embedding" IS NOT NULL'];
      const params: unknown[] = [userId];
      let paramIndex = 2;

      if (types && types.length > 0) {
        const placeholders = types.map((_, i) => `$${paramIndex + i}`);
        conditions.push(`"type" IN (${placeholders.join(',')})`);
        params.push(...types);
        paramIndex += types.length;
      }

      if (categories && categories.length > 0) {
        const placeholders = categories.map((_, i) => `$${paramIndex + i}`);
        conditions.push(`"category" IN (${placeholders.join(',')})`);
        params.push(...categories);
        paramIndex += categories.length;
      }

      const whereClause = conditions.join(' AND ');

      // cosine distance: 0 = identical, 2 = opposite; convert to similarity score
      const sql = `
        SELECT
          "id", "userId", "content", "type", "category", "sourceId",
          "confidence", "createdAt",
          1 - ("embedding" <=> $${paramIndex}::vector) AS score
        FROM "MemoryEmbedding"
        WHERE ${whereClause}
        ORDER BY "embedding" <=> $${paramIndex}::vector
        LIMIT $${paramIndex + 1}
      `;
      params.push(embeddingStr, limit);

      const results = await prisma.$queryRawUnsafe<Array<{
        id: string;
        userId: string;
        content: string;
        type: string;
        category: string;
        sourceId: string | null;
        confidence: number;
        createdAt: Date;
        score: number;
      }>>(sql, ...params);

      return results
        .filter(r => r.score >= minScore)
        .map(r => ({
          id: r.id,
          content: r.content,
          type: r.type as VectorMetadata['type'],
          category: r.category,
          score: r.score,
          metadata: {
            userId: r.userId,
            content: r.content,
            type: r.type as VectorMetadata['type'],
            category: r.category,
            sourceId: r.sourceId || undefined,
            confidence: r.confidence,
            createdAt: r.createdAt.toISOString(),
          },
        }));
    } catch (error) {
      logger.error('[VectorStore] Search failed:', error);
      return [];
    }
  }

  /**
   * Fallback search without embeddings — returns recent records by type/category
   */
  private async fallbackSearch(
    userId: string,
    options: {
      limit?: number;
      types?: VectorMetadata['type'][];
      categories?: string[];
    }
  ): Promise<VectorSearchResult[]> {
    const { limit = 10, types, categories } = options;

    const where: Record<string, unknown> = { userId };
    if (types && types.length > 0) where.type = { in: types };
    if (categories && categories.length > 0) where.category = { in: categories };

    const results = await prisma.memoryEmbedding.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return results.map(r => ({
      id: r.id,
      content: r.content,
      type: r.type as VectorMetadata['type'],
      category: r.category,
      score: r.confidence, // Use confidence as proxy score
      metadata: {
        userId: r.userId,
        content: r.content,
        type: r.type as VectorMetadata['type'],
        category: r.category,
        sourceId: r.sourceId || undefined,
        confidence: r.confidence,
        createdAt: r.createdAt.toISOString(),
      },
    }));
  }

  /**
   * Delete a memory vector by ID
   */
  async delete(id: string): Promise<void> {
    try {
      await prisma.memoryEmbedding.delete({ where: { id } });
      logger.debug(`[VectorStore] Deleted memory vector: ${id}`);
    } catch (error) {
      logger.error('[VectorStore] Failed to delete vector:', error);
    }
  }

  /**
   * Delete all memories for a user
   */
  async deleteByUser(userId: string): Promise<void> {
    try {
      await prisma.memoryEmbedding.deleteMany({ where: { userId } });
      logger.info(`[VectorStore] Deleted all memory vectors for user: ${userId}`);
    } catch (error) {
      logger.error('[VectorStore] Failed to delete user vectors:', error);
    }
  }
}

// ============================================
// Singleton Instance
// ============================================

let vectorStoreInstance: VectorStore | null = null;

export function getVectorStore(): VectorStore {
  if (!vectorStoreInstance) {
    vectorStoreInstance = new VectorStore();
  }
  return vectorStoreInstance;
}

export default VectorStore;
