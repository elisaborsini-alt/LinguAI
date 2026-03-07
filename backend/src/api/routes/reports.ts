import { Router } from 'express';
import { query } from 'express-validator';
import * as reportController from '../controllers/reportController';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Generate report for a conversation
router.post('/generate/:conversationId', reportController.generateReport);

// Get a specific report
router.get('/:reportId', reportController.getReport);

// List all reports
router.get(
  '/',
  [
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('offset').optional().isInt({ min: 0 }),
  ],
  reportController.listReports
);

// Get aggregated statistics
router.get(
  '/stats/overview',
  [query('period').optional().isInt({ min: 7, max: 365 })],
  reportController.getReportStats
);

export default router;
