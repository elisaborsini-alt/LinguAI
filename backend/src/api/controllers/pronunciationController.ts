import {Request, Response} from 'express';
import {AuthenticatedRequest} from '../../types';
import {Prisma, PrismaClient} from '@prisma/client';
import * as path from 'path';
import * as fs from 'fs';

import {PronunciationAnalyzer} from '../../services/pronunciation/pronunciationAnalyzer';
import {ReferenceAudioService} from '../../services/pronunciation/referenceAudioService';

const prisma = new PrismaClient();
const analyzer = new PronunciationAnalyzer();
const referenceService = new ReferenceAudioService(prisma);

/**
 * Get all phrase categories
 */
export async function getCategories(req: Request, res: Response): Promise<void> {
  try {
    const categories = await prisma.phraseCategory.findMany({
      orderBy: {sortOrder: 'asc'},
    });

    res.json({categories});
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({error: 'Failed to fetch categories'});
  }
}

/**
 * Get phrases with optional filters
 */
export async function getPhrases(req: Request, res: Response): Promise<void> {
  try {
    const {categoryId, difficulty, languageCode, search, limit = '50', offset = '0'} =
      req.query;

    const where: Record<string, unknown> = {};

    if (categoryId) where.categoryId = categoryId;
    if (difficulty) where.difficulty = difficulty;
    if (languageCode) where.languageCode = languageCode;
    if (search) {
      where.OR = [
        {text: {contains: search as string, mode: 'insensitive'}},
        {phoneticIPA: {contains: search as string, mode: 'insensitive'}},
      ];
    }

    const [phrases, total] = await Promise.all([
      prisma.pronunciationPhrase.findMany({
        where,
        take: parseInt(limit as string, 10),
        skip: parseInt(offset as string, 10),
        include: {
          category: true,
        },
        orderBy: {createdAt: 'desc'},
      }),
      prisma.pronunciationPhrase.count({where}),
    ]);

    res.json({
      phrases,
      total,
      limit: parseInt(limit as string, 10),
      offset: parseInt(offset as string, 10),
    });
  } catch (error) {
    console.error('Error fetching phrases:', error);
    res.status(500).json({error: 'Failed to fetch phrases'});
  }
}

/**
 * Get single phrase with reference audio
 */
export async function getPhrase(req: Request, res: Response): Promise<void> {
  try {
    const {phraseId} = req.params;

    const phrase = await prisma.pronunciationPhrase.findUnique({
      where: {id: phraseId},
      include: {
        category: true,
      },
    });

    if (!phrase) {
      res.status(404).json({error: 'Phrase not found'});
      return;
    }

    // Get or generate reference audio
    const referenceAudio = await referenceService.getReferenceAudio(phraseId);

    res.json({
      phrase,
      referenceAudio,
    });
  } catch (error) {
    console.error('Error fetching phrase:', error);
    res.status(500).json({error: 'Failed to fetch phrase'});
  }
}

/**
 * Create custom phrase
 */
export async function createCustomPhrase(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({error: 'Authentication required'});
      return;
    }

    const {text, languageCode, languageVariant, categoryId} = req.body;

    if (!text || !languageCode) {
      res.status(400).json({error: 'Text and languageCode are required'});
      return;
    }

    const phrase = await prisma.pronunciationPhrase.create({
      data: {
        text,
        languageCode,
        languageVariant,
        categoryId,
        difficulty: 'intermediate', // Default
        isCustom: true,
        userId,
      },
    });

    res.status(201).json({phrase});
  } catch (error) {
    console.error('Error creating custom phrase:', error);
    res.status(500).json({error: 'Failed to create phrase'});
  }
}

/**
 * Analyze pronunciation recording
 */
export async function analyzeRecording(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({error: 'Authentication required'});
      return;
    }

    const {phraseId, referenceAudioId} = req.body;
    const audioFile = req.file;

    if (!phraseId || !audioFile) {
      res.status(400).json({error: 'PhraseId and audio file are required'});
      return;
    }

    // Get phrase details
    const phrase = await prisma.pronunciationPhrase.findUnique({
      where: {id: phraseId},
    });

    if (!phrase) {
      res.status(404).json({error: 'Phrase not found'});
      return;
    }

    // Get reference audio
    let referenceAudio = await prisma.referenceAudio.findFirst({
      where: referenceAudioId ? {id: referenceAudioId} : {phraseId},
    });

    if (!referenceAudio) {
      // Generate reference audio on the fly
      const generated = await referenceService.getReferenceAudio(phraseId);
      if (generated) {
        referenceAudio = await prisma.referenceAudio.findUnique({
          where: {id: generated.id},
        });
      }
    }

    if (!referenceAudio) {
      res.status(404).json({error: 'Reference audio not found'});
      return;
    }

    // Save uploaded audio
    const uploadDir = path.join(process.cwd(), 'uploads', 'recordings', userId);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, {recursive: true});
    }

    const userAudioPath = path.join(uploadDir, `${Date.now()}_${audioFile.originalname}`);
    fs.writeFileSync(userAudioPath, audioFile.buffer);

    // Get reference audio path
    const referenceAudioPath = referenceAudio.audioUrl.startsWith('/')
      ? path.join(process.cwd(), referenceAudio.audioUrl)
      : referenceAudio.audioUrl;

    // Analyze pronunciation
    const {analysis, feedback} = await analyzer.analyze({
      userAudioPath,
      referenceAudioPath,
      expectedText: phrase.text,
      languageCode: phrase.languageCode,
    });

    // Save attempt to database
    const attempt = await prisma.pronunciationAttempt.create({
      data: {
        userId,
        phraseId,
        audioUrl: `/uploads/recordings/${userId}/${path.basename(userAudioPath)}`,
        durationMs: 0,
        overallScore: analysis.overallScore,
        rhythmScore: analysis.rhythmScore,
        pitchScore: analysis.pitchScore,
        clarityScore: analysis.clarityScore,
        analysisResult: analysis as unknown as Prisma.InputJsonValue,
        feedback: feedback as unknown as Prisma.InputJsonValue,
      },
    });

    res.json({
      attemptId: attempt.id,
      analysis,
      feedback,
    });
  } catch (error) {
    console.error('Error analyzing recording:', error);
    res.status(500).json({error: 'Failed to analyze recording'});
  }
}

/**
 * Get practice history
 */
export async function getHistory(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({error: 'Authentication required'});
      return;
    }

    const {phraseId, limit = '20', offset = '0'} = req.query;

    const where: Record<string, unknown> = {userId};
    if (phraseId) where.phraseId = phraseId;

    const [attempts, total] = await Promise.all([
      prisma.pronunciationAttempt.findMany({
        where,
        take: parseInt(limit as string, 10),
        skip: parseInt(offset as string, 10),
        include: {
          phrase: true,
        },
        orderBy: {createdAt: 'desc'},
      }),
      prisma.pronunciationAttempt.count({where}),
    ]);

    res.json({
      attempts,
      total,
      limit: parseInt(limit as string, 10),
      offset: parseInt(offset as string, 10),
    });
  } catch (error) {
    console.error('Error fetching history:', error);
    res.status(500).json({error: 'Failed to fetch history'});
  }
}

/**
 * Get single attempt details
 */
export async function getAttempt(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({error: 'Authentication required'});
      return;
    }

    const {attemptId} = req.params;

    const attempt = await prisma.pronunciationAttempt.findFirst({
      where: {
        id: attemptId,
        userId,
      },
      include: {
        phrase: true,
      },
    });

    if (!attempt) {
      res.status(404).json({error: 'Attempt not found'});
      return;
    }

    res.json({attempt});
  } catch (error) {
    console.error('Error fetching attempt:', error);
    res.status(500).json({error: 'Failed to fetch attempt'});
  }
}

/**
 * Get best scores for multiple phrases
 */
export async function getBestScores(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({error: 'Authentication required'});
      return;
    }

    const {phraseIds} = req.body;

    if (!phraseIds || !Array.isArray(phraseIds)) {
      res.status(400).json({error: 'phraseIds array is required'});
      return;
    }

    // Get best score for each phrase
    const scores: Record<string, number> = {};

    for (const phraseId of phraseIds) {
      const bestAttempt = await prisma.pronunciationAttempt.findFirst({
        where: {
          userId,
          phraseId,
        },
        orderBy: {overallScore: 'desc'},
        select: {overallScore: true},
      });

      if (bestAttempt) {
        scores[phraseId] = bestAttempt.overallScore;
      }
    }

    res.json({scores});
  } catch (error) {
    console.error('Error fetching best scores:', error);
    res.status(500).json({error: 'Failed to fetch scores'});
  }
}

/**
 * Get reference audio for a phrase
 */
export async function getReferenceAudio(req: Request, res: Response): Promise<void> {
  try {
    const {phraseId} = req.params;
    const {variant, speed} = req.query;

    const referenceAudio = await referenceService.getReferenceAudio(phraseId, {
      variant: variant as string | undefined,
      speed: speed ? parseFloat(speed as string) : undefined,
    });

    if (!referenceAudio) {
      res.status(404).json({error: 'Reference audio not found'});
      return;
    }

    res.json({referenceAudio});
  } catch (error) {
    console.error('Error fetching reference audio:', error);
    res.status(500).json({error: 'Failed to fetch reference audio'});
  }
}

/**
 * Delete custom phrase
 */
export async function deleteCustomPhrase(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({error: 'Authentication required'});
      return;
    }

    const {phraseId} = req.params;

    // Verify ownership
    const phrase = await prisma.pronunciationPhrase.findFirst({
      where: {
        id: phraseId,
        isCustom: true,
        userId,
      },
    });

    if (!phrase) {
      res.status(404).json({error: 'Custom phrase not found'});
      return;
    }

    await prisma.pronunciationPhrase.delete({
      where: {id: phraseId},
    });

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting phrase:', error);
    res.status(500).json({error: 'Failed to delete phrase'});
  }
}

/**
 * Get pronunciation practice statistics
 */
export async function getStats(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({error: 'Authentication required'});
      return;
    }

    // Get total attempts
    const totalAttempts = await prisma.pronunciationAttempt.count({
      where: {userId},
    });

    // Get average score
    const avgScore = await prisma.pronunciationAttempt.aggregate({
      where: {userId},
      _avg: {overallScore: true},
    });

    // Get unique phrases attempted
    const phrasesAttempted = await prisma.pronunciationAttempt.groupBy({
      by: ['phraseId'],
      where: {userId},
    });

    // Get attempts by day for streak calculation
    const recentAttempts = await prisma.pronunciationAttempt.findMany({
      where: {userId},
      orderBy: {createdAt: 'desc'},
      take: 30,
      select: {createdAt: true},
    });

    // Calculate streak
    let streakDays = 0;
    if (recentAttempts.length > 0) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let currentDate = new Date(today);
      for (const attempt of recentAttempts) {
        const attemptDate = new Date(attempt.createdAt);
        attemptDate.setHours(0, 0, 0, 0);

        if (attemptDate.getTime() === currentDate.getTime()) {
          streakDays++;
          currentDate.setDate(currentDate.getDate() - 1);
        } else if (attemptDate.getTime() < currentDate.getTime()) {
          break;
        }
      }
    }

    // Get improvement rate (compare first 5 vs last 5 attempts)
    let improvementRate = 0;
    if (totalAttempts >= 10) {
      const [firstAttempts, lastAttempts] = await Promise.all([
        prisma.pronunciationAttempt.findMany({
          where: {userId},
          orderBy: {createdAt: 'asc'},
          take: 5,
          select: {overallScore: true},
        }),
        prisma.pronunciationAttempt.findMany({
          where: {userId},
          orderBy: {createdAt: 'desc'},
          take: 5,
          select: {overallScore: true},
        }),
      ]);

      const firstAvg =
        firstAttempts.reduce((a, b) => a + b.overallScore, 0) / firstAttempts.length;
      const lastAvg =
        lastAttempts.reduce((a, b) => a + b.overallScore, 0) / lastAttempts.length;

      improvementRate = ((lastAvg - firstAvg) / firstAvg) * 100;
    }

    // Identify weak and strong areas
    const scoresByType = await prisma.pronunciationAttempt.aggregate({
      where: {userId},
      _avg: {
        rhythmScore: true,
        pitchScore: true,
        clarityScore: true,
      },
    });

    const areas = [
      {name: 'Rhythm', score: scoresByType._avg.rhythmScore || 0},
      {name: 'Pitch', score: scoresByType._avg.pitchScore || 0},
      {name: 'Clarity', score: scoresByType._avg.clarityScore || 0},
    ];

    const weakAreas = areas.filter(a => a.score < 70).map(a => a.name);
    const strongAreas = areas.filter(a => a.score >= 80).map(a => a.name);

    res.json({
      totalAttempts,
      averageScore: Math.round(avgScore._avg.overallScore || 0),
      phrasesAttempted: phrasesAttempted.length,
      streakDays,
      improvementRate: Math.round(improvementRate),
      weakAreas,
      strongAreas,
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({error: 'Failed to fetch statistics'});
  }
}
