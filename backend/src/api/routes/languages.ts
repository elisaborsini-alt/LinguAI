import { Router } from 'express';
import { languageController } from '../controllers/languageController';

const router = Router();

// Public endpoint — no auth required (needed during onboarding)
router.get('/', languageController.getLanguages);

export default router;
