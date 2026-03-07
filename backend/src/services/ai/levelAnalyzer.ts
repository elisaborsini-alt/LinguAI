import { sendMessage } from './claudeClient';
import { logger } from '../../utils/logger';
import { MessageAnalysis, CEFRLevel, LevelEstimates } from '../../types';

interface LevelAssessment {
  grammarScore: number;
  vocabularyScore: number;
  fluencyScore: number;
  levels: {
    grammar: CEFRLevel;
    vocabulary: CEFRLevel;
    fluency: CEFRLevel;
    overall: CEFRLevel;
  };
  confidence: number;
  details?: {
    grammarObservations: string[];
    vocabularyObservations: string[];
    fluencyObservations: string[];
  };
}

// CEFR level score ranges
const LEVEL_THRESHOLDS: Record<CEFRLevel, { min: number; max: number }> = {
  'A1': { min: 0, max: 20 },
  'A2': { min: 20, max: 40 },
  'B1': { min: 40, max: 60 },
  'B2': { min: 60, max: 75 },
  'C1': { min: 75, max: 90 },
  'C2': { min: 90, max: 100 },
};

// Grammar complexity indicators by level
const GRAMMAR_INDICATORS: Record<CEFRLevel, string[]> = {
  'A1': [
    'simple present tense', 'basic subject-verb agreement', 'simple articles',
    'basic pronouns', 'simple negation', 'basic word order',
  ],
  'A2': [
    'past tense', 'future with going to', 'comparatives', 'basic conjunctions',
    'possessive forms', 'simple prepositions',
  ],
  'B1': [
    'present perfect', 'conditionals type 1', 'passive voice basic',
    'relative clauses basic', 'modal verbs', 'reported speech basic',
  ],
  'B2': [
    'conditionals type 2-3', 'passive voice complex', 'subjunctive',
    'relative clauses complex', 'mixed tenses', 'inversion',
  ],
  'C1': [
    'cleft sentences', 'advanced modals', 'complex conditionals',
    'participle clauses', 'ellipsis', 'fronting',
  ],
  'C2': [
    'native-like fluency', 'idiomatic grammar', 'stylistic variation',
    'subtle distinctions', 'pragmatic competence', 'register awareness',
  ],
};

// Vocabulary complexity indicators
const VOCABULARY_INDICATORS: Record<CEFRLevel, { wordTypes: string[]; avgWordLength: number }> = {
  'A1': { wordTypes: ['basic nouns', 'common verbs', 'numbers', 'colors'], avgWordLength: 4 },
  'A2': { wordTypes: ['descriptive adjectives', 'phrasal verbs basic', 'time expressions'], avgWordLength: 5 },
  'B1': { wordTypes: ['abstract nouns', 'complex adjectives', 'collocations'], avgWordLength: 5.5 },
  'B2': { wordTypes: ['idiomatic expressions', 'formal vocabulary', 'technical terms'], avgWordLength: 6 },
  'C1': { wordTypes: ['sophisticated vocabulary', 'nuanced expressions', 'academic language'], avgWordLength: 6.5 },
  'C2': { wordTypes: ['rare vocabulary', 'literary expressions', 'cultural references'], avgWordLength: 7 },
};

export class LevelAnalyzer {
  /**
   * Assess user level from a single message
   */
  async assessFromMessage(
    message: string,
    analysis: MessageAnalysis,
    currentLevels: LevelEstimates
  ): Promise<LevelAssessment | null> {
    try {
      // Skip very short messages
      if (message.split(/\s+/).length < 5) {
        return null;
      }

      // Calculate scores from multiple factors
      const grammarScore = this.assessGrammar(message, analysis);
      const vocabularyScore = this.assessVocabulary(message, analysis);
      const fluencyScore = analysis.fluencyScore || 70;

      // Smooth scores with current levels (gradual adjustment)
      const smoothedGrammar = this.smoothScore(
        grammarScore,
        this.levelToScore(currentLevels.grammar),
        currentLevels.confidence
      );
      const smoothedVocabulary = this.smoothScore(
        vocabularyScore,
        this.levelToScore(currentLevels.vocabulary),
        currentLevels.confidence
      );
      const smoothedFluency = this.smoothScore(
        fluencyScore,
        this.levelToScore(currentLevels.fluency),
        currentLevels.confidence
      );

      return {
        grammarScore: smoothedGrammar,
        vocabularyScore: smoothedVocabulary,
        fluencyScore: smoothedFluency,
        levels: {
          grammar: this.scoreToLevel(smoothedGrammar),
          vocabulary: this.scoreToLevel(smoothedVocabulary),
          fluency: this.scoreToLevel(smoothedFluency),
          overall: this.calculateOverallLevel(smoothedGrammar, smoothedVocabulary, smoothedFluency),
        },
        confidence: Math.min(1, currentLevels.confidence + 0.02),
      };
    } catch (error) {
      logger.error('Error assessing level from message:', error);
      return null;
    }
  }

  /**
   * Perform comprehensive level assessment using AI
   */
  async comprehensiveAssessment(
    messages: Array<{ role: string; content: string }>,
    languageCode: string
  ): Promise<LevelAssessment> {
    const userMessages = messages
      .filter(m => m.role === 'user')
      .map(m => m.content)
      .join('\n---\n');

    const prompt = `Analyze these language learner messages and assess their CEFR level.

Messages:
${userMessages}

Provide a detailed assessment in JSON format:
{
  "grammarScore": 0-100,
  "vocabularyScore": 0-100,
  "fluencyScore": 0-100,
  "levels": {
    "grammar": "A1" | "A2" | "B1" | "B2" | "C1" | "C2",
    "vocabulary": "A1" | "A2" | "B1" | "B2" | "C1" | "C2",
    "fluency": "A1" | "A2" | "B1" | "B2" | "C1" | "C2",
    "overall": "A1" | "A2" | "B1" | "B2" | "C1" | "C2"
  },
  "confidence": 0-1,
  "details": {
    "grammarObservations": ["observation1", "observation2"],
    "vocabularyObservations": ["observation1", "observation2"],
    "fluencyObservations": ["observation1", "observation2"]
  }
}

Consider:
- Grammar complexity and accuracy
- Vocabulary range and appropriateness
- Sentence structure variety
- Fluency and naturalness
- Errors and their severity

Output only valid JSON.`;

    try {
      const response = await sendMessage(prompt, [], { temperature: 0.2 });
      const assessment = JSON.parse(response);
      return assessment;
    } catch (error) {
      logger.error('Error in comprehensive assessment:', error);
      // Return default assessment
      return {
        grammarScore: 50,
        vocabularyScore: 50,
        fluencyScore: 50,
        levels: {
          grammar: 'B1',
          vocabulary: 'B1',
          fluency: 'B1',
          overall: 'B1',
        },
        confidence: 0.3,
      };
    }
  }

  /**
   * Analyze specific skill areas
   */
  analyzeSkillGaps(assessment: LevelAssessment): {
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
  } {
    const scores = {
      grammar: assessment.grammarScore,
      vocabulary: assessment.vocabularyScore,
      fluency: assessment.fluencyScore,
    };

    const sortedSkills = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    const strengths: string[] = [];
    const weaknesses: string[] = [];
    const recommendations: string[] = [];

    // Identify strengths and weaknesses
    const [strongest] = sortedSkills[0];
    const [weakest] = sortedSkills[sortedSkills.length - 1];

    if (scores[strongest as keyof typeof scores] > 60) {
      strengths.push(`Strong ${strongest} skills`);
    }
    if (scores[weakest as keyof typeof scores] < 50) {
      weaknesses.push(`${weakest.charAt(0).toUpperCase() + weakest.slice(1)} needs improvement`);
    }

    // Generate recommendations based on gaps
    const gap = scores[strongest as keyof typeof scores] - scores[weakest as keyof typeof scores];
    if (gap > 20) {
      recommendations.push(`Focus on ${weakest} exercises to balance your skills`);
    }

    if (assessment.grammarScore < 50) {
      recommendations.push('Practice sentence structure with guided exercises');
    }
    if (assessment.vocabularyScore < 50) {
      recommendations.push('Build vocabulary through contextual learning');
    }
    if (assessment.fluencyScore < 50) {
      recommendations.push('Increase speaking practice for better flow');
    }

    return { strengths, weaknesses, recommendations };
  }

  // Private helper methods

  private assessGrammar(message: string, analysis: MessageAnalysis): number {
    let score = 70; // Base score

    // Adjust based on detected errors
    const grammarErrors = analysis.errors?.filter(e => e.type === 'grammar') || [];
    score -= grammarErrors.length * 8;

    // Bonus for complex structures
    const complexPatterns = [
      /\b(although|whereas|nevertheless|furthermore|consequently)\b/i,
      /\b(would have|could have|might have)\b/i,
      /\b(had\s+\w+ed|had\s+been)\b/i,
      /\b(if\s+\w+\s+were|if\s+\w+\s+had)\b/i,
    ];

    complexPatterns.forEach(pattern => {
      if (pattern.test(message)) {
        score += 5;
      }
    });

    // Consider sentence variety
    const sentences = message.split(/[.!?]+/).filter(s => s.trim());
    if (sentences.length > 1) {
      const avgLength = message.length / sentences.length;
      if (avgLength > 50) score += 5; // Longer, complex sentences
    }

    // Use analysis grammar level if available
    if (analysis.grammarLevel) {
      const analysisScore = this.levelToScore(analysis.grammarLevel as CEFRLevel);
      score = (score + analysisScore) / 2;
    }

    return Math.max(0, Math.min(100, score));
  }

  private assessVocabulary(message: string, analysis: MessageAnalysis): number {
    let score = 70; // Base score

    const words = message.toLowerCase().split(/\s+/);
    const uniqueWords = new Set(words);

    // Lexical diversity (type-token ratio)
    const ttr = uniqueWords.size / words.length;
    if (ttr > 0.8) score += 10;
    else if (ttr > 0.6) score += 5;
    else if (ttr < 0.4) score -= 10;

    // Average word length (indicator of vocabulary sophistication)
    const avgWordLength = words.reduce((sum, w) => sum + w.length, 0) / words.length;
    if (avgWordLength > 6) score += 10;
    else if (avgWordLength > 5) score += 5;
    else if (avgWordLength < 4) score -= 5;

    // Check for sophisticated vocabulary patterns
    const sophisticatedPatterns = [
      /\b(subsequently|consequently|furthermore|nevertheless)\b/i,
      /\b(comprehensive|substantial|significant|fundamental)\b/i,
      /\b(facilitate|implement|demonstrate|establish)\b/i,
    ];

    sophisticatedPatterns.forEach(pattern => {
      if (pattern.test(message)) {
        score += 5;
      }
    });

    // Use analysis vocabulary level if available
    if (analysis.vocabularyLevel) {
      const analysisScore = this.levelToScore(analysis.vocabularyLevel as CEFRLevel);
      score = (score + analysisScore) / 2;
    }

    return Math.max(0, Math.min(100, score));
  }

  private smoothScore(newScore: number, currentScore: number, confidence: number): number {
    // More weight to current score when confidence is high
    const weight = Math.min(0.8, confidence);
    return currentScore * weight + newScore * (1 - weight);
  }

  private levelToScore(level: CEFRLevel): number {
    const midpoints: Record<CEFRLevel, number> = {
      'A1': 10,
      'A2': 30,
      'B1': 50,
      'B2': 67,
      'C1': 82,
      'C2': 95,
    };
    return midpoints[level] || 50;
  }

  private scoreToLevel(score: number): CEFRLevel {
    for (const [level, range] of Object.entries(LEVEL_THRESHOLDS)) {
      if (score >= range.min && score < range.max) {
        return level as CEFRLevel;
      }
    }
    return score >= 90 ? 'C2' : 'A1';
  }

  private calculateOverallLevel(
    grammarScore: number,
    vocabularyScore: number,
    fluencyScore: number
  ): CEFRLevel {
    // Weighted average - grammar and vocabulary slightly more important
    const overall = grammarScore * 0.35 + vocabularyScore * 0.35 + fluencyScore * 0.3;
    return this.scoreToLevel(overall);
  }
}

export default LevelAnalyzer;
