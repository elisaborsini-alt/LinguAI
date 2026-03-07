import { Router } from 'express';
import { query } from 'express-validator';
import * as progressController from '../controllers/progressController';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get overall progress overview
router.get('/overview', progressController.getOverview);

// Get weekly progress
router.get(
  '/weekly',
  [query('weekStart').optional().isISO8601()],
  progressController.getWeeklyProgress
);

// Get daily stats for date range
router.get(
  '/daily',
  [
    query('startDate').isISO8601(),
    query('endDate').isISO8601(),
  ],
  progressController.getDailyStats
);

// Get level history
router.get('/levels/history', progressController.getLevelHistory);

// Get strengths and weaknesses analysis
router.get('/analysis', progressController.getAnalysis);

// Get retention-oriented progress summary
router.get('/summary', authenticate, progressController.getProgressSummary);

// Get momentum insight (long-term reflective message)
router.get('/momentum', authenticate, progressController.getMomentumInsight);

// Get time machine comparison (then vs now voice snapshots)
router.get('/time-machine', progressController.getTimeMachine);

export default router;
