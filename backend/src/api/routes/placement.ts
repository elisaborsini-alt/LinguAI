import { Router } from 'express';
import { body } from 'express-validator';
import * as placementController from '../controllers/placementController';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Start or resume a placement session
router.post(
  '/start',
  [
    body('languageCode').isString().isLength({ min: 2, max: 5 }),
    body('languageVariant').isString().isLength({ min: 2, max: 10 }),
  ],
  placementController.startPlacement,
);

// Send a response during placement
router.post(
  '/respond',
  [
    body('message').isString().isLength({ min: 1, max: 2000 }),
  ],
  placementController.respondPlacement,
);

// Get placement status
router.get('/status', placementController.getPlacementStatus);

export default router;
