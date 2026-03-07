import { sendMessage } from '../ai/claudeClient';
import { logger } from '../../utils/logger';

/**
 * Detected emotional states
 */
export type EmotionalState =
  | 'confident'      // Speaking clearly, good pace
  | 'enthusiastic'   // High energy, fast speech
  | 'frustrated'     // Hesitations, sighs, restarts
  | 'anxious'        // Fast speech, tremor, short breaths
  | 'bored'          // Monotone, slow, minimal engagement
  | 'confused'       // Long pauses, rising intonation, incomplete sentences
  | 'tired'          // Slow speech, low energy, yawning
  | 'neutral';       // Baseline state

export interface EmotionSignals {
  // Voice characteristics
  pitch: {
    mean: number;        // Hz - average pitch
    variance: number;    // Pitch variability
    trend: 'rising' | 'falling' | 'stable';
  };

  // Speech patterns
  speechRate: {
    wordsPerMinute: number;
    trend: 'accelerating' | 'decelerating' | 'stable';
  };

  // Energy and volume
  energy: {
    mean: number;        // 0-1 normalized
    variance: number;
  };

  // Pause patterns
  pauses: {
    frequency: number;   // Pauses per minute
    averageDuration: number; // ms
    fillerWords: number; // "um", "uh", etc.
  };

  // Speech quality
  fluency: {
    hesitations: number;
    restarts: number;    // Self-corrections
    incompleteUtterances: number;
  };

  // Temporal context
  sessionDuration: number; // seconds
  messageCount: number;
}

export interface EmotionAnalysis {
  primaryEmotion: EmotionalState;
  confidence: number; // 0-1
  secondaryEmotion?: EmotionalState;
  signals: Partial<EmotionSignals>;
  timestamp: Date;

  // Coaching recommendations
  recommendations: {
    paceAdjustment: 'slower' | 'faster' | 'maintain';
    difficultyAdjustment: 'easier' | 'harder' | 'maintain';
    toneAdjustment: 'encouraging' | 'challenging' | 'calming' | 'neutral';
    suggestedActions: string[];
  };
}

export interface EmotionHistory {
  emotions: EmotionAnalysis[];
  dominantEmotion: EmotionalState;
  emotionTrend: 'improving' | 'declining' | 'stable';
  engagementLevel: 'high' | 'medium' | 'low';
}

// Emotion detection thresholds
const EMOTION_THRESHOLDS = {
  frustrated: {
    hesitationsMin: 3,
    restartsMin: 2,
    pauseFrequencyMin: 4,
  },
  anxious: {
    speechRateMin: 160, // WPM
    pitchVarianceMin: 50,
    energyVarianceMin: 0.3,
  },
  bored: {
    speechRateMax: 100,
    pitchVarianceMax: 20,
    energyMeanMax: 0.3,
  },
  enthusiastic: {
    speechRateMin: 140,
    energyMeanMin: 0.6,
    pitchMeanIncrease: 1.2, // 20% above baseline
  },
  tired: {
    speechRateMax: 90,
    energyMeanMax: 0.25,
    pauseDurationMin: 800,
  },
  confused: {
    incompleteMin: 2,
    pauseFrequencyMin: 5,
    risingIntonation: true,
  },
};

export class EmotionAnalyzer {
  private baselinePitch: number = 150; // Default baseline
  private baselineEnergy: number = 0.5;
  private baselineSpeechRate: number = 120;
  private emotionHistory: EmotionAnalysis[] = [];

  /**
   * Analyze emotional state from audio signals
   */
  analyzeFromSignals(signals: EmotionSignals): EmotionAnalysis {
    const scores = this.calculateEmotionScores(signals);
    const primaryEmotion = this.determinePrimaryEmotion(scores);
    const confidence = scores[primaryEmotion] || 0.5;

    // Find secondary emotion if significant
    const sortedEmotions = Object.entries(scores)
      .sort(([, a], [, b]) => b - a);
    const secondaryEmotion = sortedEmotions[1]?.[1] > 0.3
      ? sortedEmotions[1][0] as EmotionalState
      : undefined;

    const analysis: EmotionAnalysis = {
      primaryEmotion,
      confidence,
      secondaryEmotion,
      signals,
      timestamp: new Date(),
      recommendations: this.generateRecommendations(primaryEmotion, signals),
    };

    this.emotionHistory.push(analysis);

    // Keep last 20 analyses
    if (this.emotionHistory.length > 20) {
      this.emotionHistory.shift();
    }

    return analysis;
  }

  /**
   * Analyze emotional state from transcript text using AI
   */
  async analyzeFromText(
    transcript: string,
    context: {
      previousMessages: string[];
      sessionDuration: number;
      errorCount: number;
    }
  ): Promise<EmotionAnalysis> {
    try {
      const prompt = `Analyze the emotional state of a language learner based on their message.

Message: "${transcript}"

Context:
- Session duration: ${Math.floor(context.sessionDuration / 60)} minutes
- Errors made so far: ${context.errorCount}
- Previous messages: ${context.previousMessages.slice(-3).join(' | ')}

Analyze for these emotional states:
- confident: Clear expression, no hesitation
- enthusiastic: High engagement, eager to learn
- frustrated: Signs of struggle, repeated mistakes
- anxious: Nervous patterns, rushed responses
- bored: Minimal effort, short responses
- confused: Questions, incomplete thoughts
- tired: Low energy responses
- neutral: Baseline state

Respond with JSON:
{
  "primaryEmotion": "emotion_name",
  "confidence": 0.0-1.0,
  "secondaryEmotion": "emotion_name or null",
  "textSignals": {
    "messageLength": "short|medium|long",
    "sentenceCompleteness": "complete|incomplete",
    "questionMarks": number,
    "exclamationMarks": number,
    "hesitationMarkers": ["um", "uh", etc],
    "selfCorrections": number
  },
  "reasoning": "brief explanation"
}`;

      const response = await sendMessage(prompt, [], { temperature: 0.2 });
      const parsed = JSON.parse(response);

      return {
        primaryEmotion: parsed.primaryEmotion as EmotionalState,
        confidence: parsed.confidence,
        secondaryEmotion: parsed.secondaryEmotion as EmotionalState | undefined,
        signals: {},
        timestamp: new Date(),
        recommendations: this.generateRecommendations(
          parsed.primaryEmotion as EmotionalState,
          {} as EmotionSignals
        ),
      };
    } catch (error) {
      logger.error('Error analyzing emotion from text:', error);
      return this.getDefaultAnalysis();
    }
  }

  /**
   * Combine audio and text analysis for more accurate detection
   */
  async analyzeMultimodal(
    audioSignals: Partial<EmotionSignals>,
    transcript: string,
    context: {
      previousMessages: string[];
      sessionDuration: number;
      errorCount: number;
    }
  ): Promise<EmotionAnalysis> {
    // Get text-based analysis
    const textAnalysis = await this.analyzeFromText(transcript, context);

    // If we have audio signals, combine them
    if (audioSignals.pitch || audioSignals.energy || audioSignals.speechRate) {
      const fullSignals: EmotionSignals = {
        pitch: audioSignals.pitch || { mean: this.baselinePitch, variance: 30, trend: 'stable' },
        speechRate: audioSignals.speechRate || { wordsPerMinute: 120, trend: 'stable' },
        energy: audioSignals.energy || { mean: 0.5, variance: 0.1 },
        pauses: audioSignals.pauses || { frequency: 2, averageDuration: 500, fillerWords: 0 },
        fluency: audioSignals.fluency || { hesitations: 0, restarts: 0, incompleteUtterances: 0 },
        sessionDuration: context.sessionDuration,
        messageCount: context.previousMessages.length + 1,
      };

      const audioAnalysis = this.analyzeFromSignals(fullSignals);

      // Combine analyses with weighted average
      return this.combineAnalyses(audioAnalysis, textAnalysis);
    }

    return textAnalysis;
  }

  /**
   * Get emotion history summary
   */
  getEmotionHistory(): EmotionHistory {
    if (this.emotionHistory.length === 0) {
      return {
        emotions: [],
        dominantEmotion: 'neutral',
        emotionTrend: 'stable',
        engagementLevel: 'medium',
      };
    }

    // Calculate dominant emotion
    const emotionCounts = this.emotionHistory.reduce((acc, e) => {
      acc[e.primaryEmotion] = (acc[e.primaryEmotion] || 0) + 1;
      return acc;
    }, {} as Record<EmotionalState, number>);

    const dominantEmotion = Object.entries(emotionCounts)
      .sort(([, a], [, b]) => b - a)[0][0] as EmotionalState;

    // Calculate trend
    const recentEmotions = this.emotionHistory.slice(-5);
    const positiveEmotions = ['confident', 'enthusiastic'];
    const negativeEmotions = ['frustrated', 'anxious', 'bored', 'tired', 'confused'];

    const recentPositive = recentEmotions.filter(e =>
      positiveEmotions.includes(e.primaryEmotion)
    ).length;
    const olderEmotions = this.emotionHistory.slice(0, -5);
    const olderPositive = olderEmotions.filter(e =>
      positiveEmotions.includes(e.primaryEmotion)
    ).length / Math.max(1, olderEmotions.length);

    let emotionTrend: 'improving' | 'declining' | 'stable' = 'stable';
    const recentPositiveRatio = recentPositive / recentEmotions.length;
    if (recentPositiveRatio > olderPositive + 0.2) {
      emotionTrend = 'improving';
    } else if (recentPositiveRatio < olderPositive - 0.2) {
      emotionTrend = 'declining';
    }

    // Calculate engagement level
    const boredOrTired = this.emotionHistory.filter(e =>
      ['bored', 'tired'].includes(e.primaryEmotion)
    ).length;
    const engaged = this.emotionHistory.filter(e =>
      ['enthusiastic', 'confident'].includes(e.primaryEmotion)
    ).length;

    let engagementLevel: 'high' | 'medium' | 'low' = 'medium';
    if (engaged > this.emotionHistory.length * 0.5) {
      engagementLevel = 'high';
    } else if (boredOrTired > this.emotionHistory.length * 0.3) {
      engagementLevel = 'low';
    }

    return {
      emotions: this.emotionHistory,
      dominantEmotion,
      emotionTrend,
      engagementLevel,
    };
  }

  /**
   * Update baseline measurements
   */
  updateBaseline(signals: EmotionSignals): void {
    // Exponential moving average for baseline
    const alpha = 0.1;
    this.baselinePitch = this.baselinePitch * (1 - alpha) + signals.pitch.mean * alpha;
    this.baselineEnergy = this.baselineEnergy * (1 - alpha) + signals.energy.mean * alpha;
    this.baselineSpeechRate = this.baselineSpeechRate * (1 - alpha) + signals.speechRate.wordsPerMinute * alpha;
  }

  /**
   * Reset analyzer state
   */
  reset(): void {
    this.emotionHistory = [];
    this.baselinePitch = 150;
    this.baselineEnergy = 0.5;
    this.baselineSpeechRate = 120;
  }

  // Private methods

  private calculateEmotionScores(signals: EmotionSignals): Record<EmotionalState, number> {
    const scores: Record<EmotionalState, number> = {
      confident: 0,
      enthusiastic: 0,
      frustrated: 0,
      anxious: 0,
      bored: 0,
      confused: 0,
      tired: 0,
      neutral: 0.3, // Base neutral score
    };

    // Frustrated detection
    if (signals.fluency.hesitations >= EMOTION_THRESHOLDS.frustrated.hesitationsMin) {
      scores.frustrated += 0.3;
    }
    if (signals.fluency.restarts >= EMOTION_THRESHOLDS.frustrated.restartsMin) {
      scores.frustrated += 0.3;
    }
    if (signals.pauses.frequency >= EMOTION_THRESHOLDS.frustrated.pauseFrequencyMin) {
      scores.frustrated += 0.2;
    }

    // Anxious detection
    if (signals.speechRate.wordsPerMinute >= EMOTION_THRESHOLDS.anxious.speechRateMin) {
      scores.anxious += 0.3;
    }
    if (signals.pitch.variance >= EMOTION_THRESHOLDS.anxious.pitchVarianceMin) {
      scores.anxious += 0.3;
    }
    if (signals.energy.variance >= EMOTION_THRESHOLDS.anxious.energyVarianceMin) {
      scores.anxious += 0.2;
    }

    // Bored detection
    if (signals.speechRate.wordsPerMinute <= EMOTION_THRESHOLDS.bored.speechRateMax) {
      scores.bored += 0.3;
    }
    if (signals.pitch.variance <= EMOTION_THRESHOLDS.bored.pitchVarianceMax) {
      scores.bored += 0.3;
    }
    if (signals.energy.mean <= EMOTION_THRESHOLDS.bored.energyMeanMax) {
      scores.bored += 0.3;
    }

    // Enthusiastic detection
    if (signals.speechRate.wordsPerMinute >= EMOTION_THRESHOLDS.enthusiastic.speechRateMin) {
      scores.enthusiastic += 0.25;
    }
    if (signals.energy.mean >= EMOTION_THRESHOLDS.enthusiastic.energyMeanMin) {
      scores.enthusiastic += 0.35;
    }
    if (signals.pitch.mean > this.baselinePitch * EMOTION_THRESHOLDS.enthusiastic.pitchMeanIncrease) {
      scores.enthusiastic += 0.25;
    }

    // Tired detection
    if (signals.speechRate.wordsPerMinute <= EMOTION_THRESHOLDS.tired.speechRateMax) {
      scores.tired += 0.3;
    }
    if (signals.energy.mean <= EMOTION_THRESHOLDS.tired.energyMeanMax) {
      scores.tired += 0.4;
    }
    if (signals.pauses.averageDuration >= EMOTION_THRESHOLDS.tired.pauseDurationMin) {
      scores.tired += 0.2;
    }

    // Confused detection
    if (signals.fluency.incompleteUtterances >= EMOTION_THRESHOLDS.confused.incompleteMin) {
      scores.confused += 0.4;
    }
    if (signals.pauses.frequency >= EMOTION_THRESHOLDS.confused.pauseFrequencyMin) {
      scores.confused += 0.3;
    }
    if (signals.pitch.trend === 'rising') {
      scores.confused += 0.2;
    }

    // Confident detection (absence of negative signals)
    if (signals.fluency.hesitations < 2 &&
        signals.fluency.restarts < 1 &&
        signals.energy.mean > 0.4 &&
        signals.speechRate.wordsPerMinute > 100) {
      scores.confident += 0.6;
    }

    // Normalize scores
    const maxScore = Math.max(...Object.values(scores));
    if (maxScore > 0) {
      Object.keys(scores).forEach(key => {
        scores[key as EmotionalState] /= maxScore;
      });
    }

    return scores;
  }

  private determinePrimaryEmotion(scores: Record<EmotionalState, number>): EmotionalState {
    const [emotion] = Object.entries(scores)
      .sort(([, a], [, b]) => b - a)[0];
    return emotion as EmotionalState;
  }

  private generateRecommendations(
    emotion: EmotionalState,
    signals: Partial<EmotionSignals>
  ): EmotionAnalysis['recommendations'] {
    const recommendations: EmotionAnalysis['recommendations'] = {
      paceAdjustment: 'maintain',
      difficultyAdjustment: 'maintain',
      toneAdjustment: 'neutral',
      suggestedActions: [],
    };

    switch (emotion) {
      case 'frustrated':
        recommendations.paceAdjustment = 'slower';
        recommendations.difficultyAdjustment = 'easier';
        recommendations.toneAdjustment = 'encouraging';
        recommendations.suggestedActions = [
          'Offer simpler alternatives',
          'Break down complex sentences',
          'Provide positive reinforcement',
          'Suggest a short break if needed',
        ];
        break;

      case 'anxious':
        recommendations.paceAdjustment = 'slower';
        recommendations.toneAdjustment = 'calming';
        recommendations.suggestedActions = [
          'Use a calm, reassuring tone',
          'Give more time to respond',
          'Reduce correction frequency',
          'Focus on what they did well',
        ];
        break;

      case 'bored':
        recommendations.paceAdjustment = 'faster';
        recommendations.difficultyAdjustment = 'harder';
        recommendations.toneAdjustment = 'challenging';
        recommendations.suggestedActions = [
          'Introduce more engaging topics',
          'Add gamification elements',
          'Present a challenge or game',
          'Switch to a different activity type',
        ];
        break;

      case 'enthusiastic':
        recommendations.difficultyAdjustment = 'harder';
        recommendations.toneAdjustment = 'challenging';
        recommendations.suggestedActions = [
          'Introduce advanced vocabulary',
          'Present more complex scenarios',
          'Encourage longer responses',
          'Add bonus challenges',
        ];
        break;

      case 'tired':
        recommendations.paceAdjustment = 'slower';
        recommendations.difficultyAdjustment = 'easier';
        recommendations.suggestedActions = [
          'Suggest ending the session soon',
          'Switch to lighter topics',
          'Reduce cognitive load',
          'Offer encouragement for completing session',
        ];
        break;

      case 'confused':
        recommendations.paceAdjustment = 'slower';
        recommendations.difficultyAdjustment = 'easier';
        recommendations.toneAdjustment = 'encouraging';
        recommendations.suggestedActions = [
          'Rephrase with simpler words',
          'Provide examples',
          'Check understanding before proceeding',
          'Offer clarification proactively',
        ];
        break;

      case 'confident':
        recommendations.suggestedActions = [
          'Maintain current approach',
          'Gradually increase difficulty',
          'Introduce subtle challenges',
        ];
        break;

      default:
        recommendations.suggestedActions = [
          'Continue observing emotional state',
          'Maintain balanced approach',
        ];
    }

    return recommendations;
  }

  private combineAnalyses(
    audioAnalysis: EmotionAnalysis,
    textAnalysis: EmotionAnalysis
  ): EmotionAnalysis {
    // Weight audio analysis slightly higher as it's more reliable for emotion
    const audioWeight = 0.6;
    const textWeight = 0.4;

    // If both analyses agree, boost confidence
    if (audioAnalysis.primaryEmotion === textAnalysis.primaryEmotion) {
      return {
        ...audioAnalysis,
        confidence: Math.min(1, audioAnalysis.confidence * 1.2),
      };
    }

    // Otherwise, prefer audio but note the discrepancy
    return {
      ...audioAnalysis,
      confidence: audioAnalysis.confidence * audioWeight + textAnalysis.confidence * textWeight,
      secondaryEmotion: textAnalysis.primaryEmotion,
    };
  }

  private getDefaultAnalysis(): EmotionAnalysis {
    return {
      primaryEmotion: 'neutral',
      confidence: 0.5,
      signals: {},
      timestamp: new Date(),
      recommendations: {
        paceAdjustment: 'maintain',
        difficultyAdjustment: 'maintain',
        toneAdjustment: 'neutral',
        suggestedActions: ['Continue normal interaction'],
      },
    };
  }
}

export default EmotionAnalyzer;
