import { Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import prisma from '../../db/client';
import { ScenarioService } from '../../services/scenarios/scenarioService';
import { AppError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../../types';
import { logger } from '../../utils/logger';

const scenarioService = new ScenarioService();

/**
 * Get all scenarios with optional filtering
 */
export const getScenarios = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Invalid input', { errors: errors.array() });
    }

    const { goal, difficulty, language, search } = req.query;

    const scenarios = await scenarioService.getScenarios({
      goal: goal as any,
      difficulty: difficulty as any,
      language: language as any,
      search: search as string,
    });

    res.json({
      success: true,
      data: {
        scenarios,
        total: scenarios.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get a single scenario by ID
 */
export const getScenarioById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const scenario = await scenarioService.getScenarioById(id);

    if (!scenario) {
      throw new AppError(404, 'NOT_FOUND', 'Scenario not found');
    }

    res.json({
      success: true,
      data: scenario,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get recommended scenarios for the current user
 */
export const getRecommendedScenarios = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id;
    const limit = parseInt(req.query.limit as string) || 5;

    const recommendations = await scenarioService.getRecommendedScenarios(userId, limit);

    res.json({
      success: true,
      data: {
        recommendations,
        total: recommendations.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get scenarios grouped by goal
 */
export const getScenariosByGoal = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const allScenarios = await scenarioService.getScenarios();

    // Group by goal
    const byGoal: Record<string, any[]> = {};
    const goalLabels: Record<string, string> = {
      professional: 'Professional & Business',
      travel: 'Travel & Tourism',
      conversation: 'Daily Conversation',
      interviews: 'Job Interviews',
      customer_support: 'Customer Service',
      social: 'Social Situations',
    };

    for (const scenario of allScenarios) {
      if (!byGoal[scenario.goal]) {
        byGoal[scenario.goal] = [];
      }
      byGoal[scenario.goal].push(scenario);
    }

    // Format response
    const groups = Object.entries(byGoal).map(([goal, scenarios]) => ({
      goal,
      label: goalLabels[goal] || goal,
      scenarios,
      count: scenarios.length,
    }));

    res.json({
      success: true,
      data: {
        groups,
        totalScenarios: allScenarios.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Start a conversation with a specific scenario
 */
export const startScenarioConversation = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id;
    const { id: scenarioId } = req.params;
    const { mode = 'call' } = req.body;

    // Get the scenario
    const scenario = await scenarioService.getScenarioById(scenarioId);
    if (!scenario) {
      throw new AppError(404, 'NOT_FOUND', 'Scenario not found');
    }

    // Get user data
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { levelEstimates: true },
    });

    if (!user) {
      throw new AppError(404, 'NOT_FOUND', 'User not found');
    }

    // Create the conversation
    const conversation = await prisma.conversation.create({
      data: {
        userId,
        mode,
        goal: scenario.goal,
        languageCode: user.targetLanguageCode,
        languageVariant: user.targetLanguageVariant,
        scenarioId: scenario.id,
        scenarioType: scenario.goal,
        scenarioDesc: scenario.description,
        aiRole: scenario.aiRole,
        userRole: scenario.userRole,
        status: 'active',
      },
    });

    // Create metrics entry
    await prisma.conversationMetrics.create({
      data: { conversationId: conversation.id },
    });

    // If there's a starter message, add it
    if (scenario.starterMessage) {
      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          role: 'assistant',
          content: scenario.starterMessage,
        },
      });
    }

    // Generate the scenario system prompt
    const userLevel = (user.levelEstimates?.overallLevel || 'A2') as any;
    const systemPrompt = scenarioService.generateScenarioPrompt(scenario, userLevel);

    res.status(201).json({
      success: true,
      data: {
        conversationId: conversation.id,
        scenario: {
          id: scenario.id,
          name: scenario.name,
          description: scenario.description,
          aiRole: scenario.aiRole,
          userRole: scenario.userRole,
        },
        starterMessage: scenario.starterMessage,
        systemPrompt, // For the AI service
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Seed default scenarios
 */
export const seedScenarios = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const count = await scenarioService.seedDefaultScenarios();

    res.json({
      success: true,
      data: {
        message: `Seeded ${count} new scenarios`,
        scenariosCreated: count,
      },
    });
  } catch (error) {
    next(error);
  }
};
