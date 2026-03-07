import { Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import prisma from '../../db/client';
import { AppError } from '../middleware/errorHandler';
import { AuthenticatedRequest, LanguageCode, LanguageVariant, LearningGoal } from '../../types';

/**
 * Get current user profile
 */
export const getProfile = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        levelEstimates: true,
        progressStats: true,
      },
    });

    if (!user) {
      throw new AppError(404, 'NOT_FOUND', 'User not found');
    }

    const { passwordHash, ...userWithoutPassword } = user;

    res.json({
      success: true,
      data: {
        ...userWithoutPassword,
        targetLanguage: {
          code: user.targetLanguageCode,
          variant: user.targetLanguageVariant,
        },
        levels: user.levelEstimates,
        stats: user.progressStats,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update user profile
 */
export const updateProfile = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Invalid input', { errors: errors.array() });
    }

    const userId = req.user!.id;
    const { name, nativeLanguage, timezone, avatarUrl } = req.body;

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (nativeLanguage !== undefined) updateData.nativeLanguage = nativeLanguage;
    // timezone is not a User model field; skipped
    if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl;

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        nativeLanguage: true,
        targetLanguageCode: true,
        targetLanguageVariant: true,
        avatarUrl: true,
      },
    });

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update target language settings
 */
export const updateLanguageSettings = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Invalid input', { errors: errors.array() });
    }

    const userId = req.user!.id;
    const { languageCode, languageVariant } = req.body;

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        targetLanguageCode: languageCode,
        targetLanguageVariant: languageVariant,
      },
      include: { levelEstimates: true },
    });

    res.json({
      success: true,
      data: {
        targetLanguage: {
          code: user.targetLanguageCode,
          variant: user.targetLanguageVariant,
        },
        levels: user.levelEstimates,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update learning preferences
 */
export const updatePreferences = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Invalid input', { errors: errors.array() });
    }

    const userId = req.user!.id;
    const { currentGoal, correctionIntensity, sessionLengthMinutes, notificationsEnabled, voiceArchetype, voiceIdentity } = req.body;

    const updateData: Record<string, unknown> = {};
    if (currentGoal !== undefined) updateData.currentGoal = currentGoal;
    if (correctionIntensity !== undefined) updateData.correctionIntensity = correctionIntensity;
    if (sessionLengthMinutes !== undefined) updateData.sessionLengthMinutes = sessionLengthMinutes;
    if (notificationsEnabled !== undefined) updateData.notificationsEnabled = notificationsEnabled;
    if (voiceArchetype !== undefined) updateData.voiceArchetype = voiceArchetype;
    if (voiceIdentity !== undefined) updateData.voiceIdentity = voiceIdentity;

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        currentGoal: true,
        correctionIntensity: true,
        sessionLengthMinutes: true,
        notificationsEnabled: true,
        voiceArchetype: true,
        voiceIdentity: true,
      },
    });

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Complete onboarding
 */
export const completeOnboarding = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Invalid input', { errors: errors.array() });
    }

    const userId = req.user!.id;
    const {
      nativeLanguage,
      targetLanguageCode,
      targetLanguageVariant,
      currentGoal,
      estimatedLevel,
      correctionIntensity,
      dailyGoalMinutes,
    } = req.body;

    // Update user with onboarding data
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        nativeLanguage,
        targetLanguageCode,
        targetLanguageVariant,
        currentGoal,
        correctionIntensity: correctionIntensity || 'moderate',
        sessionLengthMinutes: dailyGoalMinutes || 15,
        onboardingCompleted: true,
      },
      include: { levelEstimates: true },
    });

    // Update initial level estimate if provided
    if (estimatedLevel) {
      await prisma.levelEstimate.update({
        where: { userId },
        data: {
          grammarLevel: estimatedLevel,
          vocabularyLevel: estimatedLevel,
          fluencyLevel: estimatedLevel,
          overallLevel: estimatedLevel,
          confidence: 0.2, // Low confidence for self-reported
        },
      });
    }

    const { passwordHash, ...userWithoutPassword } = user;

    res.json({
      success: true,
      data: {
        ...userWithoutPassword,
        targetLanguage: {
          code: user.targetLanguageCode,
          variant: user.targetLanguageVariant,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get user's level estimates
 */
export const getLevels = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id;

    const levelEstimates = await prisma.levelEstimate.findUnique({
      where: { userId },
    });

    if (!levelEstimates) {
      throw new AppError(404, 'NOT_FOUND', 'Level estimates not found');
    }

    res.json({
      success: true,
      data: {
        grammar: {
          level: levelEstimates.grammarLevel,
          score: levelEstimates.grammarScore,
        },
        vocabulary: {
          level: levelEstimates.vocabularyLevel,
          score: levelEstimates.vocabularyScore,
        },
        fluency: {
          level: levelEstimates.fluencyLevel,
          score: levelEstimates.fluencyScore,
        },
        overall: {
          level: levelEstimates.overallLevel,
        },
        confidence: levelEstimates.confidence,
        lastAssessedAt: levelEstimates.updatedAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete user account
 */
export const deleteAccount = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id;

    // Delete user and all related data (cascade)
    await prisma.user.delete({
      where: { id: userId },
    });

    res.json({
      success: true,
      data: { message: 'Account deleted successfully' },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update streak (called daily by client or cron)
 */
export const updateStreak = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id;

    const stats = await prisma.progressStats.findUnique({
      where: { userId },
    });

    if (!stats) {
      throw new AppError(404, 'NOT_FOUND', 'Progress stats not found');
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const lastActive = stats.lastActivityDate ? new Date(stats.lastActivityDate) : null;
    lastActive?.setHours(0, 0, 0, 0);

    let newStreak = stats.currentStreak;

    if (!lastActive) {
      newStreak = 1;
    } else {
      const daysDiff = Math.floor((today.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24));

      if (daysDiff === 0) {
        // Same day, no change
      } else if (daysDiff === 1) {
        // Consecutive day
        newStreak = stats.currentStreak + 1;
      } else {
        // Streak broken
        newStreak = 1;
      }
    }

    const updated = await prisma.progressStats.update({
      where: { userId },
      data: {
        currentStreak: newStreak,
        longestStreak: Math.max(newStreak, stats.longestStreak),
        lastActivityDate: today,
      },
    });

    res.json({
      success: true,
      data: {
        currentStreak: updated.currentStreak,
        longestStreak: updated.longestStreak,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update user's level estimates
 */
export const updateLevels = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id;
    const { grammarLevel, vocabularyLevel, fluencyLevel, overallLevel, confidence } = req.body;

    const updateData: Record<string, unknown> = {};
    if (grammarLevel !== undefined) updateData.grammarLevel = grammarLevel;
    if (vocabularyLevel !== undefined) updateData.vocabularyLevel = vocabularyLevel;
    if (fluencyLevel !== undefined) updateData.fluencyLevel = fluencyLevel;
    if (overallLevel !== undefined) updateData.overallLevel = overallLevel;
    if (confidence !== undefined) updateData.confidence = confidence;

    const levelEstimate = await prisma.levelEstimate.upsert({
      where: { userId },
      update: updateData,
      create: { userId, ...updateData } as any,
    });

    res.json({
      success: true,
      data: levelEstimate,
    });
  } catch (error) {
    next(error);
  }
};
