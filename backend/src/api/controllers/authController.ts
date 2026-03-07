import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../../db/client';
import { config } from '../../config';
import { AppError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../../types';

// Generate tokens
const generateTokens = (userId: string, email: string) => {
  const accessToken = jwt.sign(
    { userId, email },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn as unknown as jwt.SignOptions['expiresIn'] }
  );

  const refreshToken = uuidv4();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30); // 30 days

  return { accessToken, refreshToken, expiresAt };
};

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Invalid input', { errors: errors.array() });
    }

    const { email, password, name } = req.body;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new AppError(409, 'USER_EXISTS', 'A user with this email already exists');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        // Create related records
        levelEstimates: { create: {} },
        memory: { create: {} },
        progressStats: { create: {} },
      },
      select: {
        id: true,
        email: true,
        name: true,
        nativeLanguage: true,
        targetLanguageCode: true,
        targetLanguageVariant: true,
        currentGoal: true,
        onboardingCompleted: true,
        createdAt: true,
      },
    });

    // Generate tokens
    const { accessToken, refreshToken, expiresAt } = generateTokens(user.id, user.email);

    // Store refresh token
    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt,
      },
    });

    res.status(201).json({
      success: true,
      data: {
        user,
        accessToken,
        refreshToken,
        expiresAt: expiresAt.getTime(),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Invalid input', { errors: errors.array() });
    }

    const { email, password } = req.body;

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        levelEstimates: true,
      },
    });

    if (!user) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
    }

    // Update last active
    await prisma.user.update({
      where: { id: user.id },
      data: { lastActiveAt: new Date() },
    });

    // Generate tokens
    const { accessToken, refreshToken, expiresAt } = generateTokens(user.id, user.email);

    // Store refresh token
    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt,
      },
    });

    // Format response
    const { passwordHash, ...userWithoutPassword } = user;

    res.json({
      success: true,
      data: {
        user: {
          ...userWithoutPassword,
          targetLanguage: {
            code: user.targetLanguageCode,
            variant: user.targetLanguageVariant,
          },
          estimatedLevels: user.levelEstimates,
        },
        accessToken,
        refreshToken,
        expiresAt: expiresAt.getTime(),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const refreshToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken: token } = req.body;

    if (!token) {
      throw new AppError(400, 'MISSING_TOKEN', 'Refresh token is required');
    }

    // Find token
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!storedToken || storedToken.expiresAt < new Date()) {
      throw new AppError(401, 'INVALID_TOKEN', 'Invalid or expired refresh token');
    }

    // Delete old token
    await prisma.refreshToken.delete({ where: { id: storedToken.id } });

    // Generate new tokens
    const { accessToken, refreshToken: newRefreshToken, expiresAt } = generateTokens(
      storedToken.user.id,
      storedToken.user.email
    );

    // Store new refresh token
    await prisma.refreshToken.create({
      data: {
        token: newRefreshToken,
        userId: storedToken.user.id,
        expiresAt,
      },
    });

    res.json({
      success: true,
      data: {
        accessToken,
        refreshToken: newRefreshToken,
        expiresAt: expiresAt.getTime(),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    // Delete all refresh tokens for the user
    await prisma.refreshToken.deleteMany({
      where: { userId: req.user!.id },
    });

    res.json({
      success: true,
      data: { message: 'Logged out successfully' },
    });
  } catch (error) {
    next(error);
  }
};
