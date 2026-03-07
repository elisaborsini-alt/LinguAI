import { Router } from 'express';
import { body, query } from 'express-validator';
import * as memoryController from '../controllers/memoryController';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// ============================================
// Memory Overview
// ============================================

// Get user memory overview
router.get('/', memoryController.getMemoryOverview);

// Get context summary (formatted for AI prompts)
router.get('/context', memoryController.getContextSummary);

// ============================================
// Semantic Search (Vector Store)
// ============================================

// Search memories semantically
router.post(
  '/search',
  [
    body('query').isString().isLength({ min: 1, max: 500 }),
    body('limit').optional().isInt({ min: 1, max: 50 }),
    body('minScore').optional().isFloat({ min: 0, max: 1 }),
    body('types').optional().isArray(),
  ],
  memoryController.searchMemories
);

// Get relevant context for a conversation
router.post(
  '/context/relevant',
  [
    body('currentContext').isString().isLength({ min: 1, max: 2000 }),
    body('maxFacts').optional().isInt({ min: 1, max: 20 }),
    body('maxErrors').optional().isInt({ min: 1, max: 10 }),
    body('maxVocabulary').optional().isInt({ min: 1, max: 20 }),
  ],
  memoryController.getRelevantContext
);

// Sync memories to vector store
router.post('/sync', memoryController.syncToVectorStore);

// ============================================
// Facts
// ============================================

// Add a fact manually
router.post(
  '/facts',
  [
    body('category').isString().isIn(['personal', 'work', 'preference', 'goal', 'context', 'hobby']),
    body('content').isString().isLength({ min: 1, max: 500 }),
  ],
  memoryController.addFact
);

// Delete a fact
router.delete('/facts/:factId', memoryController.deleteFact);

// ============================================
// Preferences
// ============================================

// Update topic preferences
router.patch(
  '/preferences',
  [
    body('preferredTopics').optional().isArray(),
    body('avoidTopics').optional().isArray(),
    body('responseStyle').optional().isIn(['formal', 'casual', 'mixed']),
    body('pacePreference').optional().isIn(['slow', 'moderate', 'fast']),
  ],
  memoryController.updateTopicPreferences
);

// ============================================
// Error Patterns
// ============================================

// Get error patterns
router.get('/errors', memoryController.getErrorPatterns);

// ============================================
// Vocabulary
// ============================================

// Get vocabulary list
router.get('/vocabulary', memoryController.getVocabulary);

// Get vocabulary for practice
router.get('/vocabulary/practice', memoryController.getVocabularyForPractice);

// ============================================
// Session Summaries
// ============================================

// Get session summaries
router.get('/sessions', memoryController.getSessionSummaries);

export default router;
