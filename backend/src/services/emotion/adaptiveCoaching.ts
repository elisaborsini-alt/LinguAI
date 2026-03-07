import { EmotionalState, EmotionAnalysis, EmotionHistory } from './emotionAnalyzer';
import { CEFRLevel, LearningGoal } from '../../types';

/**
 * Coaching style adaptations based on emotional state
 */
export interface CoachingAdaptation {
  // Response style
  responseStyle: {
    length: 'shorter' | 'normal' | 'longer';
    complexity: 'simpler' | 'normal' | 'more_complex';
    formality: 'casual' | 'normal' | 'formal';
    enthusiasm: 'low' | 'moderate' | 'high';
  };

  // Correction behavior
  correctionBehavior: {
    frequency: 'minimal' | 'moderate' | 'detailed';
    timing: 'immediate' | 'delayed' | 'end_of_turn';
    style: 'gentle' | 'neutral' | 'direct';
  };

  // Engagement strategies
  engagement: {
    useEmoji: boolean;
    askFollowUp: boolean;
    offerEncouragement: boolean;
    suggestBreak: boolean;
    changeActivity: boolean;
  };

  // Content adjustments
  content: {
    topicSuggestions: string[];
    activityType: 'conversation' | 'game' | 'story' | 'challenge' | 'review';
    difficultyModifier: number; // -1 to +1
  };

  // Special instructions for AI
  aiInstructions: string[];
}

/**
 * Emotional state specific prompt modifications
 */
const EMOTION_PROMPT_MODIFIERS: Record<EmotionalState, string> = {
  confident: `
The learner is feeling confident. You can:
- Introduce slightly more challenging vocabulary
- Use more natural, faster-paced conversation
- Include subtle corrections without being overly gentle
- Challenge them with follow-up questions
- Continue the conversation naturally without evaluating`,

  enthusiastic: `
The learner is enthusiastic and engaged! Take advantage of this:
- Match their energy. Stay on their topic — do not shift away.
- Introduce advanced expressions and idioms
- Present interesting challenges or games
- Explore deeper topics they mention
- Keep going deeper on what they are talking about
- Add bonus learning opportunities`,

  frustrated: `
IMPORTANT: The learner is showing signs of frustration.
- Slow down and simplify your language
- Break complex ideas into smaller pieces
- Acknowledge that learning is challenging
- Offer multiple ways to express the same idea
- Give space. Let them find their way back.
- Reduce corrections temporarily - focus on communication
- Do not evaluate. Simply continue the conversation gently.
- If they struggle, offer the answer gently then move on`,

  anxious: `
The learner seems anxious. Adjust your approach:
- Use a warm, calm, reassuring tone
- Give them extra time to respond (don't fill silences immediately)
- Keep sentences shorter and clearer
- Minimize corrections for now
- Focus on what they're doing RIGHT
- Reassure them that mistakes are normal and helpful
- Avoid questions entirely for a turn — make a warm observation or share something instead`,

  bored: `
The learner seems disengaged. Re-energize the conversation:
- Change the topic to something more interesting
- Propose a game or challenge
- Ask about their personal interests
- Increase the pace and difficulty
- Share a brief anecdote or surprising detail to re-engage
- Make the conversation more interactive
- Try a light topic shift rather than more questions`,

  confused: `
The learner is confused. Help them:
- Pause and check what specifically is unclear
- Rephrase using simpler vocabulary
- Provide concrete examples
- Use analogies to their native language if relevant
- Break down the concept step by step
- Confirm understanding before moving on
- Say "Let me explain that differently..."`,

  tired: `
The learner seems tired. Be supportive:
- Shorten your responses
- Keep topics light and easy
- Reduce cognitive load
- Suggest wrapping up soon if appropriate
- If appropriate, suggest wrapping up. Do not evaluate.
- Make the remaining time enjoyable, not demanding
- Consider suggesting a break or ending the session`,

  neutral: `
The learner is in a neutral state. Maintain balanced approach:
- Continue with standard teaching methodology
- Watch for changes in emotional state
- Adjust as needed based on their responses`,
};

/**
 * Generate adaptive prompt modifier based on emotional state
 */
export function generateEmotionPromptModifier(
  currentEmotion: EmotionAnalysis,
  emotionHistory: EmotionHistory,
  baseLevel: CEFRLevel,
  goal: LearningGoal
): string {
  const emotionModifier = EMOTION_PROMPT_MODIFIERS[currentEmotion.primaryEmotion];

  // Add trend-based adjustments
  let trendModifier = '';
  if (emotionHistory.emotionTrend === 'declining') {
    trendModifier = `
Note: The learner's emotional state has been declining during this session.
Consider if a break or activity change might help.`;
  } else if (emotionHistory.emotionTrend === 'improving') {
    trendModifier = `
The learner's emotional state has been improving. Current approach is working well.`;
  }

  // Add engagement level context
  let engagementContext = '';
  if (emotionHistory.engagementLevel === 'low') {
    engagementContext = `
ALERT: Low engagement detected. Try to re-engage with:
- More personalized content
- Interactive elements
- Shorter exchanges`;
  } else if (emotionHistory.engagementLevel === 'high') {
    engagementContext = `
High engagement - maximize learning during this receptive state.`;
  }

  return `
## Emotional Context
${emotionModifier}

Confidence in emotion detection: ${Math.round(currentEmotion.confidence * 100)}%
${currentEmotion.secondaryEmotion ? `Secondary emotion hint: ${currentEmotion.secondaryEmotion}` : ''}
${trendModifier}
${engagementContext}

## Recommended Adjustments
- Pace: ${currentEmotion.recommendations.paceAdjustment}
- Difficulty: ${currentEmotion.recommendations.difficultyAdjustment}
- Tone: ${currentEmotion.recommendations.toneAdjustment}

${currentEmotion.recommendations.suggestedActions.map(a => `• ${a}`).join('\n')}
`;
}

/**
 * Calculate full coaching adaptation based on emotional state
 */
export function calculateCoachingAdaptation(
  currentEmotion: EmotionAnalysis,
  emotionHistory: EmotionHistory,
  userLevel: CEFRLevel,
  goal: LearningGoal
): CoachingAdaptation {
  const emotion = currentEmotion.primaryEmotion;

  // Base adaptation
  const adaptation: CoachingAdaptation = {
    responseStyle: {
      length: 'normal',
      complexity: 'normal',
      formality: 'normal',
      enthusiasm: 'moderate',
    },
    correctionBehavior: {
      frequency: 'moderate',
      timing: 'delayed',
      style: 'neutral',
    },
    engagement: {
      useEmoji: false,
      askFollowUp: true,
      offerEncouragement: false,
      suggestBreak: false,
      changeActivity: false,
    },
    content: {
      topicSuggestions: [],
      activityType: 'conversation',
      difficultyModifier: 0,
    },
    aiInstructions: [],
  };

  // Emotion-specific modifications
  switch (emotion) {
    case 'frustrated':
      adaptation.responseStyle.length = 'shorter';
      adaptation.responseStyle.complexity = 'simpler';
      adaptation.responseStyle.enthusiasm = 'moderate';
      adaptation.correctionBehavior.frequency = 'minimal';
      adaptation.correctionBehavior.timing = 'end_of_turn';
      adaptation.correctionBehavior.style = 'gentle';
      adaptation.engagement.offerEncouragement = true;
      adaptation.engagement.suggestBreak = emotionHistory.emotionTrend === 'declining';
      adaptation.content.difficultyModifier = -0.5;
      adaptation.aiInstructions.push(
        'Focus on building confidence',
        'Mirror correct usage naturally in your reply',
        'Offer the correct phrase if they struggle, then move on'
      );
      break;

    case 'anxious':
      adaptation.responseStyle.length = 'shorter';
      adaptation.responseStyle.complexity = 'simpler';
      adaptation.responseStyle.enthusiasm = 'low';
      adaptation.correctionBehavior.frequency = 'minimal';
      adaptation.correctionBehavior.style = 'gentle';
      adaptation.engagement.offerEncouragement = true;
      adaptation.content.difficultyModifier = -0.3;
      adaptation.aiInstructions.push(
        'Create a safe, supportive environment',
        'Validate their efforts frequently',
        'Avoid putting pressure on performance'
      );
      break;

    case 'bored':
      adaptation.responseStyle.length = 'shorter';
      adaptation.responseStyle.enthusiasm = 'high';
      adaptation.correctionBehavior.frequency = 'moderate';
      adaptation.engagement.askFollowUp = true;
      adaptation.engagement.changeActivity = true;
      adaptation.content.activityType = 'game';
      adaptation.content.difficultyModifier = 0.3;
      adaptation.content.topicSuggestions = [
        'Current events',
        'Personal interests',
        'Hypothetical scenarios',
        'Cultural topics',
      ];
      adaptation.aiInstructions.push(
        'Inject energy and variety',
        'Ask unexpected or thought-provoking questions',
        'Propose a mini-challenge or game'
      );
      break;

    case 'enthusiastic':
      adaptation.responseStyle.complexity = 'more_complex';
      adaptation.responseStyle.enthusiasm = 'high';
      adaptation.correctionBehavior.frequency = 'detailed';
      adaptation.correctionBehavior.timing = 'immediate';
      adaptation.content.activityType = 'challenge';
      adaptation.content.difficultyModifier = 0.5;
      adaptation.aiInstructions.push(
        'Match their energy',
        'Introduce advanced vocabulary',
        'Present interesting challenges',
        'Explore topics in depth'
      );
      break;

    case 'tired':
      adaptation.responseStyle.length = 'shorter';
      adaptation.responseStyle.complexity = 'simpler';
      adaptation.responseStyle.enthusiasm = 'low';
      adaptation.correctionBehavior.frequency = 'minimal';
      adaptation.engagement.suggestBreak = true;
      adaptation.content.activityType = 'review';
      adaptation.content.difficultyModifier = -0.5;
      adaptation.aiInstructions.push(
        'Keep it light and easy',
        'Acknowledge their effort',
        'Suggest ending soon if appropriate',
        'Focus on review rather than new material'
      );
      break;

    case 'confused':
      adaptation.responseStyle.length = 'shorter';
      adaptation.responseStyle.complexity = 'simpler';
      adaptation.correctionBehavior.timing = 'immediate';
      adaptation.correctionBehavior.style = 'gentle';
      adaptation.engagement.askFollowUp = true;
      adaptation.content.difficultyModifier = -0.4;
      adaptation.aiInstructions.push(
        'Check understanding frequently',
        'Provide clear examples',
        'Rephrase in multiple ways',
        'Break concepts into smaller pieces'
      );
      break;

    case 'confident':
      adaptation.responseStyle.complexity = 'more_complex';
      adaptation.correctionBehavior.frequency = 'moderate';
      adaptation.correctionBehavior.style = 'direct';
      adaptation.content.difficultyModifier = 0.2;
      adaptation.aiInstructions.push(
        'Gradually increase complexity',
        'Introduce nuanced expressions',
        'Challenge with follow-up questions'
      );
      break;

    default: // neutral
      // Keep defaults
      break;
  }

  // Goal-specific adjustments
  if (goal === 'professional' && emotion !== 'frustrated' && emotion !== 'tired') {
    adaptation.responseStyle.formality = 'formal';
  }
  if (goal === 'social') {
    adaptation.responseStyle.formality = 'casual';
    adaptation.engagement.useEmoji = emotion === 'enthusiastic';
  }

  // Level-based adjustments
  if (userLevel === 'A1' || userLevel === 'A2') {
    adaptation.responseStyle.complexity = 'simpler';
    adaptation.correctionBehavior.frequency = 'moderate';
  }
  if (userLevel === 'C1' || userLevel === 'C2') {
    if (emotion === 'confident' || emotion === 'enthusiastic') {
      adaptation.responseStyle.complexity = 'more_complex';
    }
  }

  return adaptation;
}

/**
 * Generate session summary including emotional journey
 */
export function generateEmotionalSessionSummary(
  emotionHistory: EmotionHistory
): {
  overallMood: string;
  emotionalJourney: string;
  recommendations: string[];
} {
  const emotions = emotionHistory.emotions;

  if (emotions.length === 0) {
    return {
      overallMood: 'Unable to assess - no emotional data collected',
      emotionalJourney: 'N/A',
      recommendations: ['Continue practicing for more insights'],
    };
  }

  // Describe the emotional journey
  const journeyPoints: string[] = [];

  if (emotions.length >= 3) {
    const start = emotions[0].primaryEmotion;
    const middle = emotions[Math.floor(emotions.length / 2)].primaryEmotion;
    const end = emotions[emotions.length - 1].primaryEmotion;

    journeyPoints.push(`Started: ${start}`);
    if (middle !== start && middle !== end) {
      journeyPoints.push(`Mid-session: ${middle}`);
    }
    journeyPoints.push(`Ended: ${end}`);
  }

  // Mood descriptions
  const moodDescriptions: Record<EmotionalState, string> = {
    confident: 'feeling confident and engaged',
    enthusiastic: 'highly enthusiastic and motivated',
    frustrated: 'experiencing some frustration',
    anxious: 'feeling somewhat anxious',
    bored: 'showing signs of disengagement',
    confused: 'working through some confusion',
    tired: 'showing signs of tiredness',
    neutral: 'in a balanced state',
  };

  const overallMood = moodDescriptions[emotionHistory.dominantEmotion];

  // Generate recommendations based on journey
  const recommendations: string[] = [];

  if (emotionHistory.emotionTrend === 'declining') {
    recommendations.push('Consider shorter sessions or more breaks');
    recommendations.push('Try different activity types to maintain engagement');
  }

  if (emotionHistory.dominantEmotion === 'frustrated') {
    recommendations.push('Focus on building confidence with easier content first');
    recommendations.push('Continue gently from wherever the learner is');
  }

  if (emotionHistory.dominantEmotion === 'bored') {
    recommendations.push('Explore more challenging or interesting topics');
    recommendations.push('Try game-based learning or scenarios');
  }

  if (emotionHistory.engagementLevel === 'high') {
    recommendations.push('Engagement is high. The current approach seems to be working.');
    recommendations.push('Ready for more advanced challenges');
  }

  return {
    overallMood,
    emotionalJourney: journeyPoints.join(' → '),
    recommendations: recommendations.length > 0
      ? recommendations
      : ['Keep up the great work!'],
  };
}

export default {
  generateEmotionPromptModifier,
  calculateCoachingAdaptation,
  generateEmotionalSessionSummary,
};
