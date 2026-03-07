import {Router} from 'express';
import multer from 'multer';

import {authenticate, optionalAuth} from '../middleware/auth';
import * as pronunciationController from '../controllers/pronunciationController';

const router = Router();

// Configure multer for audio file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['audio/wav', 'audio/mpeg', 'audio/mp3', 'audio/m4a', 'audio/webm'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid audio file type'));
    }
  },
});

// Public routes (no auth required)

/**
 * GET /api/pronunciation/categories
 * Get all phrase categories
 */
router.get('/categories', pronunciationController.getCategories);

/**
 * GET /api/pronunciation/phrases
 * Get phrases with optional filters
 * Query params: categoryId, difficulty, languageCode, search, limit, offset
 */
router.get('/phrases', optionalAuth, pronunciationController.getPhrases);

/**
 * GET /api/pronunciation/phrases/:phraseId
 * Get single phrase with reference audio
 */
router.get('/phrases/:phraseId', optionalAuth, pronunciationController.getPhrase);

/**
 * GET /api/pronunciation/phrases/:phraseId/reference
 * Get reference audio for a phrase
 * Query params: variant, speed
 */
router.get(
  '/phrases/:phraseId/reference',
  pronunciationController.getReferenceAudio,
);

// Protected routes (auth required)

/**
 * POST /api/pronunciation/phrases/custom
 * Create a custom phrase
 * Body: { text, languageCode, languageVariant?, categoryId? }
 */
router.post(
  '/phrases/custom',
  authenticate,
  pronunciationController.createCustomPhrase,
);

/**
 * DELETE /api/pronunciation/phrases/custom/:phraseId
 * Delete a custom phrase (only owner can delete)
 */
router.delete(
  '/phrases/custom/:phraseId',
  authenticate,
  pronunciationController.deleteCustomPhrase,
);

/**
 * POST /api/pronunciation/analyze
 * Submit recording for pronunciation analysis
 * Body: multipart/form-data with 'audio' file and 'phraseId'
 */
router.post(
  '/analyze',
  authenticate,
  upload.single('audio'),
  pronunciationController.analyzeRecording,
);

/**
 * GET /api/pronunciation/history
 * Get practice history for current user
 * Query params: phraseId, limit, offset
 */
router.get('/history', authenticate, pronunciationController.getHistory);

/**
 * GET /api/pronunciation/attempts/:attemptId
 * Get single attempt details
 */
router.get('/attempts/:attemptId', authenticate, pronunciationController.getAttempt);

/**
 * POST /api/pronunciation/scores/best
 * Get best scores for multiple phrases
 * Body: { phraseIds: string[] }
 */
router.post('/scores/best', authenticate, pronunciationController.getBestScores);

/**
 * GET /api/pronunciation/stats
 * Get pronunciation practice statistics
 */
router.get('/stats', authenticate, pronunciationController.getStats);

export default router;
