import { Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { getPlacementService, PlacementError } from '../../services/placement/placementService';
import { AppError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../../types';
import { logger } from '../../utils/logger';

const placementService = getPlacementService();

/**
 * Start a new placement session (or resume an existing one)
 */
export const startPlacement = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Invalid input', { errors: errors.array() });
    }

    const userId = req.user!.id;
    const { languageCode, languageVariant } = req.body;

    const result = await placementService.startPlacement(userId, languageCode, languageVariant);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    if (error instanceof PlacementError) {
      return next(new AppError(400, error.code, error.message));
    }
    next(error);
  }
};

/**
 * Process a user response in the placement test
 */
export const respondPlacement = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Invalid input', { errors: errors.array() });
    }

    const userId = req.user!.id;
    const { message } = req.body;

    const result = await placementService.processResponse(userId, message);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    if (error instanceof PlacementError) {
      return next(new AppError(400, error.code, error.message));
    }
    next(error);
  }
};

/**
 * Get placement status for current user
 */
export const getPlacementStatus = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user!.id;
    const status = await placementService.getStatus(userId);

    res.status(200).json({
      success: true,
      data: status,
    });
  } catch (error) {
    next(error);
  }
};
