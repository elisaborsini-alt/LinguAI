import { Router } from 'express';
import { body, param, query } from 'express-validator';
import * as conversationController from '../controllers/conversationController';
import { authenticate } from '../middleware/auth';
import { conversationRateLimiter } from '../middleware/rateLimiter';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Create new conversation
router.post(
  '/',
  [
    body('mode').isIn(['chat', 'call']),
    body('goal').isIn(['professional', 'travel', 'conversation', 'interviews', 'customer_support', 'social']),
    body('scenarioId').optional().isString(),
  ],
  conversationController.startConversation
);

// List conversations
router.get(
  '/',
  [
    query('limit').optional().isInt({ min: 1, max: 50 }),
    query('offset').optional().isInt({ min: 0 }),
    query('goal').optional(),
    query('mode').optional().isIn(['chat', 'call']),
  ],
  conversationController.listConversations
);

// Get conversation by ID
router.get('/:id', param('id').isUUID(), conversationController.getConversation);

// Send message
router.post(
  '/:id/messages',
  conversationRateLimiter,
  [
    param('id').isUUID(),
    body('content').isString().isLength({ min: 1, max: 2000 }),
    body('audioUrl').optional().isURL(),
  ],
  conversationController.sendMessage
);

// Get conversation messages
router.get(
  '/:id/messages',
  [
    param('id').isUUID(),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('offset').optional().isInt({ min: 0 }),
  ],
  conversationController.getMessages
);

// End conversation
router.post('/:id/end', param('id').isUUID(), conversationController.endConversation);

// Get session report
router.get('/:id/report', param('id').isUUID(), conversationController.getSessionReport);

// Delete conversation
router.delete('/:id', param('id').isUUID(), conversationController.deleteConversation);

export default router;
