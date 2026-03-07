import prisma from '../../db/client';
import { sendMessage } from '../ai/claudeClient';
import { buildReportPrompt } from '../../prompts/systemPrompts';
import { IntelligenceService, getIntelligenceService } from '../intelligence/intelligenceService';
import { LevelAnalyzer } from '../ai/levelAnalyzer';
import { logger } from '../../utils/logger';
import { LanguageCode, LearningGoal, CEFRLevel } from '../../types';

interface SessionReport {
  id: string;
  conversationId: string;
  summary: string;
  duration: number;
  messageCount: number;
  performance: {
    overallScore: number;
    grammarScore: number;
    vocabularyScore: number;
    fluencyScore: number;
    confidenceLevel: number;
  };
  mistakes: Array<{
    type: string;
    original: string;
    correction: string;
    explanation: string;
    frequency: number;
  }>;
  vocabulary: {
    newWords: Array<{
      word: string;
      translation?: string;
      context: string;
      level: CEFRLevel;
    }>;
    practicedWords: Array<{
      word: string;
      masteryChange: number;
    }>;
    suggestedWords: string[];
  };
  strengths: string[];
  areasToImprove: string[];
  recommendations: Array<{
    category: string;
    suggestion: string;
    priority: 'high' | 'medium' | 'low';
  }>;
  nextSteps: string[];
  achievements?: Array<{
    type: string;
    description: string;
  }>;
  comparisonWithPrevious?: {
    improvementAreas: string[];
    consistentChallenges: string[];
    trend: 'improving' | 'stable' | 'declining';
  };
  createdAt: Date;
}

export class SessionReportGenerator {
  private intelligenceService: IntelligenceService;
  private levelAnalyzer: LevelAnalyzer;

  constructor() {
    this.intelligenceService = getIntelligenceService();
    this.levelAnalyzer = new LevelAnalyzer();
  }

  /**
   * Generate a comprehensive session report
   */
  async generateReport(conversationId: string): Promise<SessionReport> {
    try {
      // Get conversation with all related data
      const conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
        include: {
          user: {
            include: { levelEstimates: true },
          },
          messages: {
            orderBy: { createdAt: 'asc' },
          },
          metrics: true,
        },
      });

      if (!conversation) {
        throw new Error('Conversation not found');
      }

      const userId = conversation.userId;
      const languageCode = conversation.user.targetLanguageCode as LanguageCode;
      const goal = conversation.goal as LearningGoal;
      const userLevel = (conversation.user.levelEstimates?.overallLevel || 'A2') as CEFRLevel;

      // Get memory context for comparison
      const userMemory = await prisma.userMemory.findUnique({
        where: { userId },
        include: {
          facts: { orderBy: { confidence: 'desc' }, take: 30 },
          errorPatterns: { orderBy: { frequency: 'desc' }, take: 15 },
          sessionSummaries: { orderBy: { date: 'desc' }, take: 5 },
          vocabulary: { orderBy: { lastUsedAt: 'desc' }, take: 30 },
        },
      });
      const memoryContext = {
        recentTopics: userMemory?.recentTopics || [],
        knownFacts: (userMemory?.facts || []).map(f => ({ category: f.category, content: f.content })),
        errorPatterns: (userMemory?.errorPatterns || []).map(e => ({ pattern: e.pattern, frequency: e.frequency })),
        vocabularyLevel: 'A1',
        preferredTopics: userMemory?.preferredTopics || [],
        avoidTopics: userMemory?.avoidTopics || [],
        sessionCount: userMemory?.totalSessions || 0,
        lastSessionSummary: userMemory?.sessionSummaries[0]?.summary || undefined,
      };

      // Analyze the conversation
      const analysisData = await this.analyzeConversation(
        conversation.messages,
        languageCode,
        userLevel
      );

      // Generate AI-powered insights
      const aiInsights = await this.generateAIInsights(
        conversation.messages,
        languageCode,
        goal,
        userLevel
      );

      // Calculate performance scores
      const performance = await this.calculatePerformance(
        conversation.messages,
        analysisData,
        conversation.user.levelEstimates
      );

      // Extract mistakes from messages
      const mistakes = this.extractMistakes(conversation.messages);

      // Process vocabulary
      const vocabulary = await this.processVocabulary(
        userId,
        conversation.messages,
        memoryContext
      );

      // Get comparison with previous sessions
      const comparison = await this.compareWithPreviousSessions(
        userId,
        performance,
        mistakes
      );

      // Generate recommendations
      const recommendations = this.generateRecommendations(
        performance,
        mistakes,
        vocabulary,
        memoryContext,
        goal
      );

      // Calculate duration in seconds
      const duration = conversation.endedAt && conversation.startedAt
        ? Math.floor((conversation.endedAt.getTime() - conversation.startedAt.getTime()) / 1000)
        : 0;

      // Build the report
      const report: SessionReport = {
        id: `report_${conversationId}`,
        conversationId,
        summary: aiInsights.summary,
        duration,
        messageCount: conversation.messages.length,
        performance,
        mistakes: mistakes.slice(0, 10), // Top 10 mistakes
        vocabulary,
        strengths: aiInsights.strengths,
        areasToImprove: aiInsights.areasToImprove,
        recommendations,
        nextSteps: this.generateNextSteps(recommendations, goal, userLevel),
        achievements: this.detectAchievements(conversation, performance, memoryContext),
        comparisonWithPrevious: comparison,
        createdAt: new Date(),
      };

      // Store the report
      await this.storeReport(report);

      return report;
    } catch (error) {
      logger.error('Error generating session report:', error);
      throw error;
    }
  }

  /**
   * Analyze conversation messages
   */
  private async analyzeConversation(
    messages: Array<{ role: string; content: string; analysisData?: any; corrections?: any }>,
    languageCode: LanguageCode,
    userLevel: CEFRLevel
  ): Promise<{
    errorCount: number;
    wordCount: number;
    uniqueWords: Set<string>;
    avgSentenceLength: number;
    complexityScore: number;
  }> {
    const userMessages = messages.filter(m => m.role === 'user');
    const allText = userMessages.map(m => m.content).join(' ');
    const words = allText.toLowerCase().split(/\s+/).filter(w => w.length > 0);
    const sentences = allText.split(/[.!?]+/).filter(s => s.trim());

    let errorCount = 0;
    messages.forEach(m => {
      if (m.corrections && Array.isArray(m.corrections)) {
        errorCount += m.corrections.length;
      }
    });

    return {
      errorCount,
      wordCount: words.length,
      uniqueWords: new Set(words),
      avgSentenceLength: sentences.length > 0 ? words.length / sentences.length : 0,
      complexityScore: this.calculateComplexity(allText),
    };
  }

  /**
   * Generate AI-powered insights
   */
  private async generateAIInsights(
    messages: Array<{ role: string; content: string }>,
    languageCode: LanguageCode,
    goal: LearningGoal,
    userLevel: CEFRLevel
  ): Promise<{
    summary: string;
    strengths: string[];
    areasToImprove: string[];
  }> {
    try {
      const transcript = messages
        .map(m => `${m.role === 'user' ? 'Learner' : 'AI'}: ${m.content}`)
        .join('\n');

      const prompt = buildReportPrompt(languageCode, goal, transcript, userLevel);

      const response = await sendMessage(
        prompt,
        [{ role: 'user', content: 'Generate the session report analysis.' }],
        { temperature: 0.3 }
      );

      try {
        const parsed = JSON.parse(response);
        return {
          summary: parsed.summary || 'Practice session completed.',
          strengths: parsed.strengths || [],
          areasToImprove: parsed.areasToImprove || parsed.weaknesses || [],
        };
      } catch {
        return {
          summary: 'Practice session completed successfully.',
          strengths: ['Completed a full practice session'],
          areasToImprove: ['Continue regular practice'],
        };
      }
    } catch (error) {
      logger.error('Error generating AI insights:', error);
      return {
        summary: 'Practice session completed.',
        strengths: [],
        areasToImprove: [],
      };
    }
  }

  /**
   * Calculate performance scores
   */
  private async calculatePerformance(
    messages: Array<{ role: string; content: string; analysisData?: any }>,
    analysisData: any,
    levelEstimates: any
  ): Promise<SessionReport['performance']> {
    const userMessages = messages.filter(m => m.role === 'user');

    // Calculate grammar score based on error rate
    const errorRate = userMessages.length > 0
      ? analysisData.errorCount / userMessages.length
      : 0;
    const grammarScore = Math.max(0, Math.min(100, 100 - errorRate * 20));

    // Calculate vocabulary score based on unique words and complexity
    const vocabularyScore = Math.min(100, (analysisData.uniqueWords.size / 10) * 20 + analysisData.complexityScore);

    // Calculate fluency score based on message flow
    const avgMessageLength = userMessages.length > 0
      ? userMessages.reduce((sum, m) => sum + m.content.length, 0) / userMessages.length
      : 0;
    const fluencyScore = Math.min(100, (avgMessageLength / 50) * 50 + 50);

    // Overall score is weighted average
    const overallScore = grammarScore * 0.35 + vocabularyScore * 0.35 + fluencyScore * 0.3;

    return {
      overallScore: Math.round(overallScore),
      grammarScore: Math.round(grammarScore),
      vocabularyScore: Math.round(vocabularyScore),
      fluencyScore: Math.round(fluencyScore),
      confidenceLevel: levelEstimates?.confidence || 0.5,
    };
  }

  /**
   * Extract mistakes from messages
   */
  private extractMistakes(
    messages: Array<{ corrections?: any }>
  ): SessionReport['mistakes'] {
    const mistakeMap = new Map<string, any>();

    messages.forEach(m => {
      if (m.corrections && Array.isArray(m.corrections)) {
        m.corrections.forEach((c: any) => {
          const key = `${c.type}:${c.original}`;
          if (mistakeMap.has(key)) {
            mistakeMap.get(key).frequency++;
          } else {
            mistakeMap.set(key, {
              type: c.type || 'unknown',
              original: c.original || '',
              correction: c.correction || '',
              explanation: c.explanation || 'Correction suggested',
              frequency: 1,
            });
          }
        });
      }
    });

    return Array.from(mistakeMap.values())
      .sort((a, b) => b.frequency - a.frequency);
  }

  /**
   * Process vocabulary from the session
   */
  private async processVocabulary(
    userId: string,
    messages: Array<{ role: string; content: string }>,
    memoryContext: any
  ): Promise<SessionReport['vocabulary']> {
    const userMessages = messages.filter(m => m.role === 'user');
    const allText = userMessages.map(m => m.content).join(' ');
    const words = allText.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const uniqueWords = [...new Set(words)];

    // Get known vocabulary
    const knownWords = new Set(
      memoryContext.knownFacts
        .filter((f: any) => f.category === 'vocabulary')
        .map((f: any) => f.content.toLowerCase())
    );

    // Find new words (not in common words and not known)
    const commonWords = new Set([
      'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i',
      'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at',
      'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she',
      'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their', 'what',
      // Add more common words...
    ]);

    const newWords = uniqueWords
      .filter(w => !commonWords.has(w) && !knownWords.has(w))
      .slice(0, 10)
      .map(word => ({
        word,
        context: this.findWordContext(word, userMessages),
        level: this.estimateWordLevel(word),
      }));

    // Get practiced words
    const practicedWords = uniqueWords
      .filter(w => knownWords.has(w))
      .slice(0, 5)
      .map(word => ({
        word,
        masteryChange: 0.05, // Small increase for practice
      }));

    // Suggest words based on context
    const suggestedWords = this.suggestRelatedWords(uniqueWords).slice(0, 5);

    return {
      newWords,
      practicedWords,
      suggestedWords,
    };
  }

  /**
   * Compare with previous sessions
   */
  private async compareWithPreviousSessions(
    userId: string,
    currentPerformance: SessionReport['performance'],
    currentMistakes: SessionReport['mistakes']
  ): Promise<SessionReport['comparisonWithPrevious'] | undefined> {
    try {
      // Get recent reports via conversation relation
      const recentReports = await prisma.sessionReport.findMany({
        where: { conversation: { userId } },
        orderBy: { createdAt: 'desc' },
        take: 5,
      });

      if (recentReports.length < 2) {
        return undefined;
      }

      const prev = recentReports[0];

      // Calculate trend
      const scoreDiff = currentPerformance.overallScore - (prev.overallScore || 0);
      let trend: 'improving' | 'stable' | 'declining' = 'stable';
      if (scoreDiff > 5) trend = 'improving';
      else if (scoreDiff < -5) trend = 'declining';

      // Find improvement areas
      const improvementAreas: string[] = [];
      if (currentPerformance.grammarScore > (prev.accuracyScore || 0) + 5) {
        improvementAreas.push('Grammar accuracy improved');
      }
      if (currentPerformance.vocabularyScore > (prev.vocabularyScore || 0) + 5) {
        improvementAreas.push('Vocabulary usage expanded');
      }
      if (currentPerformance.fluencyScore > (prev.fluencyScore || 0) + 5) {
        improvementAreas.push('Speaking fluency increased');
      }

      // Find consistent challenges
      const previousMistakes = (prev.mistakes as any[]) || [];
      const previousMistakeTypes = new Set(previousMistakes.map((m: any) => m.type));
      const consistentChallenges = currentMistakes
        .filter(m => previousMistakeTypes.has(m.type))
        .map(m => m.type)
        .filter((v, i, a) => a.indexOf(v) === i)
        .slice(0, 3);

      return {
        improvementAreas,
        consistentChallenges,
        trend,
      };
    } catch (error) {
      logger.error('Error comparing sessions:', error);
      return undefined;
    }
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(
    performance: SessionReport['performance'],
    mistakes: SessionReport['mistakes'],
    vocabulary: SessionReport['vocabulary'],
    memoryContext: any,
    goal: LearningGoal
  ): SessionReport['recommendations'] {
    const recommendations: SessionReport['recommendations'] = [];

    // Grammar-based recommendations
    if (performance.grammarScore < 60) {
      recommendations.push({
        category: 'Grammar',
        suggestion: 'Focus on sentence structure exercises. Review basic grammar patterns.',
        priority: 'high',
      });
    }

    // Vocabulary-based recommendations
    if (performance.vocabularyScore < 60) {
      recommendations.push({
        category: 'Vocabulary',
        suggestion: 'Expand your word bank with contextual learning. Try using new words in sentences.',
        priority: 'high',
      });
    }

    // Fluency-based recommendations
    if (performance.fluencyScore < 60) {
      recommendations.push({
        category: 'Fluency',
        suggestion: 'Practice speaking longer sentences. Try voice mode more often.',
        priority: 'medium',
      });
    }

    // Mistake-based recommendations
    const topMistakeType = mistakes[0]?.type;
    if (topMistakeType) {
      recommendations.push({
        category: 'Error Patterns',
        suggestion: `You frequently make ${topMistakeType} errors. Focus practice on this area.`,
        priority: 'high',
      });
    }

    // Goal-specific recommendations
    const goalRecommendations: Record<LearningGoal, string> = {
      conversation: 'Practice natural dialogues with various topics.',
      professional: 'Focus on formal language and business vocabulary.',
      travel: 'Learn practical phrases for common travel situations.',
      interviews: 'Practice answering questions clearly and confidently.',
      customer_support: 'Work on polite expressions and problem-solving language.',
      social: 'Learn casual expressions and cultural conversation norms.',
    };

    if (goalRecommendations[goal]) {
      recommendations.push({
        category: 'Goal Focus',
        suggestion: goalRecommendations[goal],
        priority: 'medium',
      });
    }

    return recommendations.slice(0, 5);
  }

  /**
   * Generate next steps
   */
  private generateNextSteps(
    recommendations: SessionReport['recommendations'],
    goal: LearningGoal,
    userLevel: CEFRLevel
  ): string[] {
    const steps: string[] = [];

    // Add top priority recommendations as steps
    recommendations
      .filter(r => r.priority === 'high')
      .slice(0, 2)
      .forEach(r => steps.push(r.suggestion));

    // Add level-appropriate suggestions
    const levelSteps: Record<CEFRLevel, string> = {
      'A1': 'Practice basic greetings and introductions',
      'A2': 'Work on describing daily routines and activities',
      'B1': 'Try having longer conversations on familiar topics',
      'B2': 'Challenge yourself with debates and opinion discussions',
      'C1': 'Practice nuanced expressions and idiomatic language',
      'C2': 'Focus on style, register, and cultural subtleties',
    };

    if (levelSteps[userLevel]) {
      steps.push(levelSteps[userLevel]);
    }

    // Add consistency reminder
    steps.push('Practice daily, even if just for 5-10 minutes');

    return steps.slice(0, 4);
  }

  /**
   * Detect achievements
   */
  private detectAchievements(
    conversation: any,
    performance: SessionReport['performance'],
    memoryContext: any
  ): SessionReport['achievements'] {
    const achievements: SessionReport['achievements'] = [];

    // First conversation achievement
    if (memoryContext.sessionCount === 0) {
      achievements.push({
        type: 'first_conversation',
        description: 'Completed your first conversation!',
      });
    }

    // High score achievement
    if (performance.overallScore >= 90) {
      achievements.push({
        type: 'high_performer',
        description: 'Exceptional performance this session!',
      });
    }

    // Long conversation achievement
    if (conversation.messages?.length >= 20) {
      achievements.push({
        type: 'engaged_learner',
        description: 'Had an extended practice conversation!',
      });
    }

    // Milestone achievements
    const totalSessions = memoryContext.sessionCount + 1;
    if ([5, 10, 25, 50, 100].includes(totalSessions)) {
      achievements.push({
        type: 'milestone',
        description: `Reached ${totalSessions} practice sessions!`,
      });
    }

    return achievements;
  }

  /**
   * Store report in database
   */
  private async storeReport(report: SessionReport): Promise<void> {
    await prisma.sessionReport.create({
      data: {
        conversationId: report.conversationId,
        summary: report.summary,
        duration: Math.round(report.duration / 60), // store as minutes
        overallScore: report.performance.overallScore,
        fluencyScore: report.performance.fluencyScore,
        accuracyScore: report.performance.grammarScore,
        vocabularyScore: report.performance.vocabularyScore,
        strengths: report.strengths,
        areasToImprove: report.areasToImprove,
        mistakes: report.mistakes as any,
        newVocabulary: report.vocabulary.newWords as any,
        suggestions: report.recommendations.map(r => r.suggestion),
        nextSteps: report.nextSteps,
        recommendedScenarios: [],
      },
    });
  }

  // Helper methods

  private calculateComplexity(text: string): number {
    const words = text.split(/\s+/);
    const avgWordLength = words.reduce((sum, w) => sum + w.length, 0) / words.length;
    const sentenceCount = text.split(/[.!?]+/).filter(s => s.trim()).length;
    const avgSentenceLength = words.length / Math.max(1, sentenceCount);

    return Math.min(100, (avgWordLength - 3) * 10 + (avgSentenceLength - 5) * 2);
  }

  private findWordContext(word: string, messages: Array<{ content: string }>): string {
    for (const m of messages) {
      const lowerContent = m.content.toLowerCase();
      const index = lowerContent.indexOf(word.toLowerCase());
      if (index !== -1) {
        const start = Math.max(0, index - 30);
        const end = Math.min(m.content.length, index + word.length + 30);
        return '...' + m.content.substring(start, end) + '...';
      }
    }
    return '';
  }

  private estimateWordLevel(word: string): CEFRLevel {
    // Simple heuristic based on word length and complexity
    if (word.length <= 4) return 'A1';
    if (word.length <= 6) return 'A2';
    if (word.length <= 8) return 'B1';
    if (word.length <= 10) return 'B2';
    return 'C1';
  }

  private suggestRelatedWords(usedWords: string[]): string[] {
    // In production, this would use a thesaurus or word embedding model
    return [];
  }
}

export default SessionReportGenerator;
