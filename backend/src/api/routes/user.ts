import { Router } from 'express';
import { body } from 'express-validator';
import * as userController from '../controllers/userController';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get current user profile
router.get('/me', userController.getProfile);

// Update profile
router.patch(
  '/me',
  [
    body('name').optional().trim().isLength({ min: 2 }),
    body('avatarUrl').optional().isURL(),
  ],
  userController.updateProfile
);

// Complete onboarding
router.post(
  '/onboarding/complete',
  [
    body('nativeLanguage').isString().matches(/^[a-z]{2,3}$/),
    body('targetLanguage.code').isString().matches(/^[a-z]{2,3}$/),
    body('targetLanguage.variant').notEmpty(),
    body('goal').isIn(['professional', 'travel', 'conversation', 'interviews', 'customer_support', 'social']),
    body('preferences').isObject(),
  ],
  userController.completeOnboarding
);

// Update preferences
router.patch(
  '/me/preferences',
  [
    body('voiceArchetype')
      .optional()
      .isIn(['neutral_mirror', 'gentle_friend', 'curious_companion', 'calm_mentor'])
      .withMessage('voiceArchetype must be one of: neutral_mirror, gentle_friend, curious_companion, calm_mentor'),
    body('voiceIdentity')
      .optional()
      .isIn(['warm_female', 'warm_male', 'energetic_friend', 'calm_mentor_voice'])
      .withMessage('voiceIdentity must be one of: warm_female, warm_male, energetic_friend, calm_mentor_voice'),
  ],
  userController.updatePreferences
);

// Update levels
router.patch('/me/levels', userController.updateLevels);

export default router;
