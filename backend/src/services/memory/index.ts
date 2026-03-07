// Core memory services
export {
  VectorStore,
  getVectorStore,
  type VectorMetadata,
  type VectorSearchResult,
} from './vectorStore';
export {
  MemoryRetriever,
  getMemoryRetriever,
  type RetrievedMemory,
  type MemoryContext,
  type RetrievalOptions,
} from './memoryRetriever';

// Short-term memory (session state)
export {
  ShortTermMemoryManager,
  getShortTermMemory,
} from './shortTermMemory';

// Long-term memory (cross-session persistence)
export {
  LongTermMemoryManager,
  getLongTermMemory,
} from './longTermMemory';

// Adaptation engine (dynamic AI behavior)
export {
  AdaptationEngine,
  getAdaptationEngine,
  type AdaptationRules,
  type LevelAdaptationConfig,
} from './adaptationEngine';

// Memory orchestrator (unified interface)
export {
  MemoryOrchestrator,
  getMemoryOrchestrator,
  type ConversationSession,
  type MessageAnalysis,
} from './memoryOrchestrator';

// Types
export * from './types';
