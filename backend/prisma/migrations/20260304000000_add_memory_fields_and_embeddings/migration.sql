-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Add missing fields to UserMemory
ALTER TABLE "UserMemory" ADD COLUMN IF NOT EXISTS "recentTopics" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "UserMemory" ADD COLUMN IF NOT EXISTS "totalSessions" INTEGER NOT NULL DEFAULT 0;

-- Add defaults to SessionSummary
ALTER TABLE "SessionSummary" ALTER COLUMN "durationMinutes" SET DEFAULT 0;
ALTER TABLE "SessionSummary" ALTER COLUMN "goal" SET DEFAULT 'conversation';

-- Create MemoryEmbedding table
CREATE TABLE IF NOT EXISTS "MemoryEmbedding" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "sourceId" TEXT,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MemoryEmbedding_pkey" PRIMARY KEY ("id")
);

-- Add vector column for embeddings
ALTER TABLE "MemoryEmbedding" ADD COLUMN IF NOT EXISTS "embedding" vector(1536);

-- Create indexes
CREATE INDEX IF NOT EXISTS "MemoryEmbedding_userId_idx" ON "MemoryEmbedding"("userId");
CREATE INDEX IF NOT EXISTS "MemoryEmbedding_type_idx" ON "MemoryEmbedding"("type");

-- Create IVFFlat index for approximate nearest neighbor search
-- Note: This index requires at least some rows to exist; it will be created
-- but won't be effective until there's data. For small datasets, exact search
-- (without this index) is fine.
CREATE INDEX IF NOT EXISTS "MemoryEmbedding_embedding_idx"
    ON "MemoryEmbedding"
    USING ivfflat ("embedding" vector_cosine_ops)
    WITH (lists = 100);
