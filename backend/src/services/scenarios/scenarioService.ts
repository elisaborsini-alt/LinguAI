import prisma from '../../db/client';
import { logger } from '../../utils/logger';
import { LearningGoal, CEFRLevel, LanguageCode } from '../../types';

// ============================================
// Types
// ============================================

export interface ScenarioDetails {
  id: string;
  goal: LearningGoal;
  difficulty: CEFRLevel;
  name: string;
  description: string;
  aiRole: string;
  userRole: string;
  context: string;
  systemPrompt?: string;
  starterMessage?: string;
  keyVocabulary: string[];
  languages: string[];
  estimatedDuration?: number;
  tags?: string[];
}

export interface ScenarioFilter {
  goal?: LearningGoal;
  difficulty?: CEFRLevel;
  language?: LanguageCode;
  search?: string;
}

export interface ScenarioRecommendation {
  scenario: ScenarioDetails;
  reason: string;
  confidence: number;
}

// ============================================
// ScenarioService Class
// ============================================

export class ScenarioService {
  /**
   * Get all scenarios with optional filtering
   */
  async getScenarios(filter: ScenarioFilter = {}): Promise<ScenarioDetails[]> {
    try {
      const where: any = { isActive: true };

      if (filter.goal) {
        where.goal = filter.goal;
      }

      if (filter.difficulty) {
        where.difficulty = filter.difficulty;
      }

      if (filter.language) {
        where.languages = { has: filter.language };
      }

      if (filter.search) {
        where.OR = [
          { name: { contains: filter.search, mode: 'insensitive' } },
          { description: { contains: filter.search, mode: 'insensitive' } },
        ];
      }

      const scenarios = await prisma.scenario.findMany({
        where,
        orderBy: [
          { goal: 'asc' },
          { difficulty: 'asc' },
          { name: 'asc' },
        ],
      });

      return scenarios.map(this.mapScenario);
    } catch (error) {
      logger.error('Error fetching scenarios:', error);
      throw error;
    }
  }

  /**
   * Get a single scenario by ID
   */
  async getScenarioById(id: string): Promise<ScenarioDetails | null> {
    try {
      const scenario = await prisma.scenario.findUnique({
        where: { id },
      });

      return scenario ? this.mapScenario(scenario) : null;
    } catch (error) {
      logger.error('Error fetching scenario:', error);
      throw error;
    }
  }

  /**
   * Get scenarios by goal
   */
  async getScenariosByGoal(goal: LearningGoal): Promise<ScenarioDetails[]> {
    return this.getScenarios({ goal });
  }

  /**
   * Get scenarios by difficulty level
   */
  async getScenariosByDifficulty(difficulty: CEFRLevel): Promise<ScenarioDetails[]> {
    return this.getScenarios({ difficulty });
  }

  /**
   * Get recommended scenarios for a user
   */
  async getRecommendedScenarios(
    userId: string,
    limit: number = 5
  ): Promise<ScenarioRecommendation[]> {
    try {
      // Get user data
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          levelEstimates: true,
          memory: {
            include: {
              sessionSummaries: {
                orderBy: { date: 'desc' },
                take: 10,
              },
            },
          },
        },
      });

      if (!user) {
        return [];
      }

      const userLevel = (user.levelEstimates?.overallLevel || 'A2') as CEFRLevel;
      const userGoal = user.currentGoal as LearningGoal;

      // Get recently used scenario IDs
      const recentConversations = await prisma.conversation.findMany({
        where: { userId },
        orderBy: { startedAt: 'desc' },
        take: 20,
        select: { scenarioId: true },
      });

      const recentScenarioIds = new Set(
        recentConversations
          .filter(c => c.scenarioId)
          .map(c => c.scenarioId!)
      );

      // Get all matching scenarios
      const scenarios = await prisma.scenario.findMany({
        where: {
          isActive: true,
          languages: { has: user.targetLanguageCode },
          difficulty: {
            in: this.getAppropriatelevels(userLevel),
          },
        },
      });

      // Score and rank scenarios
      const recommendations: ScenarioRecommendation[] = scenarios
        .map(scenario => {
          let confidence = 0.5;
          const reasons: string[] = [];

          // Boost if matches user goal
          if (scenario.goal === userGoal) {
            confidence += 0.2;
            reasons.push('Matches your learning goal');
          }

          // Boost if at appropriate difficulty
          if (scenario.difficulty === userLevel) {
            confidence += 0.15;
            reasons.push('Perfect for your level');
          } else if (this.isSlightlyHarder(userLevel, scenario.difficulty as CEFRLevel)) {
            confidence += 0.1;
            reasons.push('Slight challenge for growth');
          }

          // Reduce if recently practiced
          if (recentScenarioIds.has(scenario.id)) {
            confidence -= 0.3;
          } else {
            reasons.push('New scenario to explore');
          }

          // Boost variety
          const goalVariety = scenarios.filter(s => s.goal === scenario.goal).length;
          if (goalVariety < 3) {
            confidence += 0.05;
          }

          return {
            scenario: this.mapScenario(scenario),
            reason: reasons[0] || 'Recommended for practice',
            confidence: Math.max(0, Math.min(1, confidence)),
          };
        })
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, limit);

      return recommendations;
    } catch (error) {
      logger.error('Error getting recommended scenarios:', error);
      throw error;
    }
  }

  /**
   * Create a new scenario
   */
  async createScenario(data: Omit<ScenarioDetails, 'id'>): Promise<ScenarioDetails> {
    try {
      const scenario = await prisma.scenario.create({
        data: {
          goal: data.goal,
          difficulty: data.difficulty,
          name: data.name,
          description: data.description,
          aiRole: data.aiRole,
          userRole: data.userRole,
          context: data.context,
          systemPrompt: data.systemPrompt,
          starterMessage: data.starterMessage,
          keyVocabulary: data.keyVocabulary,
          languages: data.languages,
          isActive: true,
        },
      });

      return this.mapScenario(scenario);
    } catch (error) {
      logger.error('Error creating scenario:', error);
      throw error;
    }
  }

  /**
   * Generate system prompt for a scenario
   */
  generateScenarioPrompt(scenario: ScenarioDetails, userLevel: CEFRLevel): string {
    return `You are playing the role of: ${scenario.aiRole}

SCENARIO: ${scenario.name}
CONTEXT: ${scenario.context}

The user is playing: ${scenario.userRole}
User's language level: ${userLevel}

INSTRUCTIONS:
1. Stay in character as ${scenario.aiRole}
2. Make the conversation feel natural and realistic
3. Adapt your language complexity to ${userLevel} level
4. Use vocabulary related to: ${scenario.keyVocabulary.join(', ')}
5. Gently correct mistakes when appropriate
6. Encourage the user to speak more

${scenario.systemPrompt || ''}

Keep responses conversational and engaging. Help the user practice real-world communication skills.`;
  }

  /**
   * Seed default scenarios
   */
  async seedDefaultScenarios(): Promise<number> {
    const defaultScenarios: Omit<ScenarioDetails, 'id'>[] = [
      // Professional scenarios
      {
        goal: 'professional',
        difficulty: 'B1',
        name: 'Job Interview',
        description: 'Practice answering common interview questions with a hiring manager',
        aiRole: 'Hiring manager at a technology company',
        userRole: 'Job candidate applying for a position',
        context: 'A formal job interview setting in an office',
        starterMessage: "Hello! Thank you for coming in today. Please, have a seat. I've reviewed your resume and I'm excited to learn more about you. Shall we begin?",
        keyVocabulary: ['experience', 'qualifications', 'responsibilities', 'achievements', 'teamwork'],
        languages: ['en', 'es', 'de', 'fr'],
      },
      {
        goal: 'professional',
        difficulty: 'B2',
        name: 'Business Meeting',
        description: 'Lead or participate in a business meeting discussion',
        aiRole: 'Senior manager presenting quarterly results',
        userRole: 'Team member participating in the meeting',
        context: 'Conference room during a quarterly review meeting',
        starterMessage: "Good morning everyone. Let's get started with our Q3 review. I'd like to hear your thoughts on our team's performance.",
        keyVocabulary: ['metrics', 'performance', 'objectives', 'strategy', 'deadline'],
        languages: ['en', 'es', 'de', 'fr'],
      },
      {
        goal: 'professional',
        difficulty: 'C1',
        name: 'Negotiation',
        description: 'Practice negotiating terms in a business context',
        aiRole: 'Client negotiating a contract',
        userRole: 'Sales representative',
        context: 'Business negotiation for a service contract',
        starterMessage: "I appreciate your proposal, but I think we need to discuss the pricing structure. Our budget is quite limited.",
        keyVocabulary: ['terms', 'proposal', 'compromise', 'agreement', 'value'],
        languages: ['en'],
      },

      // Travel scenarios
      {
        goal: 'travel',
        difficulty: 'A2',
        name: 'Hotel Check-in',
        description: 'Check into a hotel and ask about amenities',
        aiRole: 'Friendly hotel receptionist',
        userRole: 'Tourist checking into the hotel',
        context: 'Hotel lobby reception desk',
        starterMessage: 'Good evening! Welcome to the Grand Hotel. Do you have a reservation with us?',
        keyVocabulary: ['reservation', 'room', 'check-in', 'breakfast', 'wifi'],
        languages: ['en', 'es', 'fr', 'it', 'de'],
      },
      {
        goal: 'travel',
        difficulty: 'A2',
        name: 'Restaurant Ordering',
        description: 'Order food at a restaurant and handle dietary requests',
        aiRole: 'Waiter at a local restaurant',
        userRole: 'Customer dining at the restaurant',
        context: 'Casual restaurant during dinner service',
        starterMessage: "Good evening! Welcome to Bella Italia. Here's our menu. Can I start you off with something to drink?",
        keyVocabulary: ['menu', 'recommend', 'vegetarian', 'allergies', 'bill'],
        languages: ['en', 'es', 'fr', 'it', 'de'],
      },
      {
        goal: 'travel',
        difficulty: 'B1',
        name: 'Airport Navigation',
        description: 'Navigate an airport, check-in, and handle issues',
        aiRole: 'Airline customer service agent',
        userRole: 'Passenger with a question about their flight',
        context: 'Airport check-in counter',
        starterMessage: 'Good morning! How can I help you today?',
        keyVocabulary: ['boarding pass', 'gate', 'delay', 'luggage', 'connection'],
        languages: ['en', 'es', 'fr', 'de'],
      },

      // Conversation scenarios
      {
        goal: 'conversation',
        difficulty: 'A1',
        name: 'Meeting New People',
        description: 'Practice introducing yourself and making small talk',
        aiRole: 'Friendly person at a social gathering',
        userRole: 'Guest at the same event',
        context: 'Casual social event or party',
        starterMessage: "Hi there! I don't think we've met before. I'm Alex. Are you enjoying the party?",
        keyVocabulary: ['name', 'from', 'work', 'hobbies', 'nice to meet you'],
        languages: ['en', 'es', 'fr', 'de', 'it', 'pt'],
      },
      {
        goal: 'conversation',
        difficulty: 'B1',
        name: 'Weekend Plans',
        description: 'Discuss plans and make suggestions with a friend',
        aiRole: 'Your friend planning the weekend',
        userRole: 'Friend making weekend plans',
        context: 'Casual conversation between friends',
        starterMessage: "Hey! So, any plans for this weekend? I was thinking we could do something fun together.",
        keyVocabulary: ['plans', 'weekend', 'suggest', 'prefer', 'sounds good'],
        languages: ['en', 'es', 'fr', 'de', 'it', 'pt'],
      },

      // Customer support scenarios
      {
        goal: 'customer_support',
        difficulty: 'B1',
        name: 'Product Return',
        description: 'Handle a product return request professionally',
        aiRole: 'Customer wanting to return a product',
        userRole: 'Customer service representative',
        context: 'Customer service call center',
        starterMessage: "Hi, I bought this laptop last week but it's not working properly. I'd like to return it and get a refund.",
        keyVocabulary: ['refund', 'exchange', 'receipt', 'policy', 'apologize'],
        languages: ['en', 'es', 'de'],
      },
      {
        goal: 'customer_support',
        difficulty: 'B2',
        name: 'Technical Support',
        description: 'Help a customer troubleshoot a technical issue',
        aiRole: 'Customer with a technical problem',
        userRole: 'Technical support agent',
        context: 'Technical support phone call',
        starterMessage: "Hello? I'm having trouble with my internet connection. It keeps dropping every few minutes and I work from home!",
        keyVocabulary: ['troubleshoot', 'restart', 'settings', 'connection', 'resolve'],
        languages: ['en'],
      },

      // Social scenarios
      {
        goal: 'social',
        difficulty: 'A2',
        name: 'Coffee Shop Chat',
        description: 'Have a casual conversation at a coffee shop',
        aiRole: 'Regular at the same coffee shop',
        userRole: 'Customer who frequents the same cafe',
        context: 'Cozy neighborhood coffee shop',
        starterMessage: "Oh, you're here again! I see you all the time. What's your go-to order? I always get the same thing.",
        keyVocabulary: ['coffee', 'favorite', 'usually', 'recommend', 'weather'],
        languages: ['en', 'es', 'fr', 'de', 'it', 'pt'],
      },
      {
        goal: 'social',
        difficulty: 'B1',
        name: 'Book Club Discussion',
        description: 'Discuss a book with fellow readers',
        aiRole: 'Fellow book club member',
        userRole: 'Book club participant',
        context: 'Monthly book club meeting at a library',
        starterMessage: "So, what did everyone think of this month's book? I found the ending quite surprising!",
        keyVocabulary: ['plot', 'character', 'theme', 'recommend', 'author'],
        languages: ['en', 'es', 'fr'],
      },

      // Interview scenarios
      {
        goal: 'interviews',
        difficulty: 'B1',
        name: 'Behavioral Interview',
        description: 'Practice answering "Tell me about a time when..." questions',
        aiRole: 'HR interviewer',
        userRole: 'Job candidate',
        context: 'Behavioral interview round',
        starterMessage: "Welcome! Today we'll focus on understanding how you handle different situations. Let's start: Tell me about a time when you had to work under pressure.",
        keyVocabulary: ['situation', 'action', 'result', 'challenge', 'teamwork'],
        languages: ['en', 'es', 'de'],
      },
      {
        goal: 'interviews',
        difficulty: 'B2',
        name: 'Technical Interview',
        description: 'Explain your technical decisions and problem-solving approach',
        aiRole: 'Technical interviewer',
        userRole: 'Technical candidate',
        context: 'Technical interview for a developer position',
        starterMessage: "Thanks for coming in. I'd like to understand your approach to problem-solving. Can you walk me through a challenging technical project you've worked on?",
        keyVocabulary: ['architecture', 'decision', 'tradeoff', 'scalability', 'approach'],
        languages: ['en'],
      },
    ];

    let created = 0;
    for (const scenario of defaultScenarios) {
      // Check if scenario already exists
      const existing = await prisma.scenario.findFirst({
        where: {
          name: scenario.name,
          goal: scenario.goal,
        },
      });

      if (!existing) {
        await this.createScenario(scenario);
        created++;
      }
    }

    logger.info(`Seeded ${created} new scenarios`);
    return created;
  }

  // ============================================
  // Helper Methods
  // ============================================

  private mapScenario(scenario: any): ScenarioDetails {
    return {
      id: scenario.id,
      goal: scenario.goal as LearningGoal,
      difficulty: scenario.difficulty as CEFRLevel,
      name: scenario.name,
      description: scenario.description,
      aiRole: scenario.aiRole,
      userRole: scenario.userRole,
      context: scenario.context,
      systemPrompt: scenario.systemPrompt || undefined,
      starterMessage: scenario.starterMessage || undefined,
      keyVocabulary: scenario.keyVocabulary || [],
      languages: scenario.languages || ['en'],
    };
  }

  private getAppropriatelevels(level: CEFRLevel): CEFRLevel[] {
    const levels: CEFRLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
    const index = levels.indexOf(level);

    // Return current level and one below/above
    const appropriate: CEFRLevel[] = [level];
    if (index > 0) appropriate.push(levels[index - 1]);
    if (index < levels.length - 1) appropriate.push(levels[index + 1]);

    return appropriate;
  }

  private isSlightlyHarder(userLevel: CEFRLevel, scenarioLevel: CEFRLevel): boolean {
    const levels: CEFRLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
    const userIndex = levels.indexOf(userLevel);
    const scenarioIndex = levels.indexOf(scenarioLevel);

    return scenarioIndex === userIndex + 1;
  }
}

export default ScenarioService;
