import { Router } from 'express';
import { body, query, param } from 'express-validator';
import * as scenarioController from '../controllers/scenarioController';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get all scenarios with optional filtering
router.get(
  '/',
  [
    query('goal').optional().isIn(['professional', 'travel', 'conversation', 'interviews', 'customer_support', 'social']),
    query('difficulty').optional().isIn(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']),
    query('language').optional().isString().matches(/^[a-z]{2,3}$/),
    query('search').optional().isString(),
  ],
  scenarioController.getScenarios
);

// Get recommended scenarios for current user
router.get('/recommended', scenarioController.getRecommendedScenarios);

// Get scenarios grouped by goal
router.get('/by-goal', scenarioController.getScenariosByGoal);

// Get a single scenario by ID
router.get('/:id', param('id').isUUID(), scenarioController.getScenarioById);

// Start a conversation with a scenario
router.post(
  '/:id/start',
  [
    param('id').isUUID(),
    body('mode').optional().isIn(['chat', 'call']).default('call'),
  ],
  scenarioController.startScenarioConversation
);

// Seed default scenarios (admin only in production)
router.post('/seed', scenarioController.seedScenarios);

export default router;
