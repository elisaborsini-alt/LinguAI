/**
 * MEMORY IN ACTION: How Past Mistakes Change Future Conversations
 * ================================================================
 *
 * This file demonstrates LinguaAI's memory-driven conversation intelligence.
 * It shows a concrete example of how the system remembers and adapts.
 */

import { MemoryOrchestrator, getMemoryOrchestrator } from '../memoryOrchestrator';
import { MemoryAwarePromptGenerator } from '../../ai/memoryAwarePrompts';
import type { DetectedError, MemoryContextForAI } from '../types';

// ============================================
// SCENARIO: Maria is learning English for a job interview at Google
// She has a recurring issue with past tense and confuses "make" vs "do"
// ============================================

async function demonstrateMemoryInAction() {
  const orchestrator = getMemoryOrchestrator();
  const userId = 'maria-123';
  const conversationId = 'conv-session-1';

  console.log('='.repeat(70));
  console.log('LINGUAAI MEMORY DEMONSTRATION');
  console.log('='.repeat(70));

  // ============================================
  // SESSION 1: First conversation (Day 1)
  // ============================================

  console.log('\n📅 SESSION 1 (Day 1) - Initial Conversation\n');

  await orchestrator.startSession({
    conversationId: 'session-1',
    userId,
    level: 'B1',
    languageCode: 'en',
    languageVariant: 'US',
    mode: 'voice',
  });

  // Maria introduces herself
  console.log('👤 Maria: "Hi! My name is Maria. I work at a startup in São Paulo."');
  await orchestrator.processUserMessage(userId, 'session-1',
    "Hi! My name is Maria. I work at a startup in São Paulo.",
    { content: '', errors: [], topicDetected: 'introductions' }
  );

  // Maria makes her first "make/do" error
  console.log('👤 Maria: "Yesterday I make a big mistake at work."');
  const error1: DetectedError = {
    id: 'err-1',
    category: 'grammar_tense',
    original: 'make',
    correction: 'made',
    explanation: 'Use past tense "made" for yesterday',
    severity: 'significant',
    isRecurring: false,
  };
  await orchestrator.processUserMessage(userId, 'session-1',
    "Yesterday I make a big mistake at work.",
    { content: '', errors: [error1], topicDetected: 'work' }
  );

  // Maria makes another tense error
  console.log('👤 Maria: "I go to my boss and explain the problem."');
  const error2: DetectedError = {
    id: 'err-2',
    category: 'grammar_tense',
    original: 'go',
    correction: 'went',
    explanation: 'Use past tense "went" for past actions',
    severity: 'significant',
    isRecurring: true,
  };
  await orchestrator.processUserMessage(userId, 'session-1',
    "I go to my boss and explain the problem.",
    { content: '', errors: [error2] }
  );

  // Maria mentions her goal
  console.log('👤 Maria: "I am learning English for an interview at Google next month."');
  await orchestrator.processUserMessage(userId, 'session-1',
    "I am learning English for an interview at Google next month.",
    { content: '', errors: [], topicDetected: 'job_interview' }
  );

  // End session 1
  await orchestrator.endSession('session-1', userId);

  console.log('\n✅ Session 1 ended. Memory consolidated.');
  console.log('   → Stored: Maria\'s name, workplace, Google interview goal');
  console.log('   → Error pattern detected: Past tense issues');

  // ============================================
  // SESSION 2: Three days later
  // ============================================

  console.log('\n' + '='.repeat(70));
  console.log('\n📅 SESSION 2 (Day 4) - Maria returns\n');

  await orchestrator.startSession({
    conversationId: 'session-2',
    userId,
    level: 'B1',
    languageCode: 'en',
    languageVariant: 'US',
    mode: 'voice',
  });

  // Generate system prompt - THIS IS WHERE MEMORY SHINES
  const systemPrompt = await orchestrator.generateSystemPrompt({
    conversationId: 'session-2',
    userId,
    level: 'B1',
    languageCode: 'en',
    languageVariant: 'US',
    mode: 'voice',
  }, "Hi again!");

  console.log('🤖 SYSTEM PROMPT GENERATED WITH MEMORY:\n');
  console.log('-'.repeat(50));

  // Extract key sections from the prompt
  const sections = extractPromptHighlights(systemPrompt);
  console.log(sections);

  console.log('-'.repeat(50));
  console.log('\n🤖 AI (with memory): "Welcome back, Maria! How is your preparation');
  console.log('   for the Google interview going? Last time we talked about that');
  console.log('   mistake at work - did everything work out with your boss?"');

  // Maria responds
  console.log('\n👤 Maria: "Yes, everything is fine now. Yesterday I practice');
  console.log('   interview questions."');

  const error3: DetectedError = {
    id: 'err-3',
    category: 'grammar_tense',
    original: 'practice',
    correction: 'practiced',
    explanation: 'Use past tense "practiced" for yesterday',
    severity: 'significant',
    isRecurring: true,
    relatedPatternId: 'pattern-past-tense',
  };

  await orchestrator.processUserMessage(userId, 'session-2',
    "Yes, everything is fine now. Yesterday I practice interview questions.",
    { content: '', errors: [error3] }
  );

  console.log('\n🤖 AI (recognizing recurring pattern):');
  console.log('   "That\'s great that you practiced! Just a small note - we say');
  console.log('   \'yesterday I practiced\' with -ed for past actions. You\'re doing');
  console.log('   well though! What kind of questions did you practice?"');
  console.log('\n   [AI naturally corrected using recast + explicit note because');
  console.log('    this is a recurring pattern from Session 1]');

  // Maria tries to use "do" correctly
  console.log('\n👤 Maria: "I did a lot of research about the company!"');

  await orchestrator.processUserMessage(userId, 'session-2',
    "I did a lot of research about the company!",
    { content: '', errors: [] }
  );

  console.log('\n🤖 AI (mirroring correct form):');
  console.log('   "Nice, so you did some research about Google. What did you');
  console.log('   find out?"');
  console.log('\n   [AI mirrored the correct past tense naturally because memory shows');
  console.log('    this was previously an error pattern - reinforces through use, not praise]');

  await orchestrator.endSession('session-2', userId);

  // ============================================
  // MEMORY STATE AFTER TWO SESSIONS
  // ============================================

  console.log('\n' + '='.repeat(70));
  console.log('\n📊 MEMORY STATE AFTER TWO SESSIONS:\n');

  console.log('PERSONAL FACTS STORED:');
  console.log('  ├─ Name: Maria');
  console.log('  ├─ Workplace: startup in São Paulo');
  console.log('  ├─ Goal: Google interview next month');
  console.log('  └─ Life event: Preparing for career change');

  console.log('\nERROR PATTERNS TRACKED:');
  console.log('  └─ Grammar (Past Tense):');
  console.log('       ├─ "make" → "made" (occurred 1x)');
  console.log('       ├─ "go" → "went" (occurred 1x)');
  console.log('       ├─ "practice" → "practiced" (occurred 1x)');
  console.log('       └─ Status: ACTIVE (3 occurrences, needs focus)');

  console.log('\nVOCABULARY PROGRESS:');
  console.log('  ├─ "research" - used correctly (mastery: 40%)');
  console.log('  ├─ "interview" - used correctly (mastery: 30%)');
  console.log('  └─ "mistake" - used correctly (mastery: 30%)');

  console.log('\nADAPTATION STATE:');
  console.log('  ├─ Complexity: Normal (no adjustment needed)');
  console.log('  ├─ Correction style: Explicit with encouragement');
  console.log('  ├─ Focus areas: Past tense, especially irregular verbs');
  console.log('  └─ Emotional state: Engaged and motivated');

  // ============================================
  // HOW THIS DIFFERS FROM PRAKTIKA.AI
  // ============================================

  console.log('\n' + '='.repeat(70));
  console.log('\n🏆 COMPETITIVE ADVANTAGE vs PRAKTIKA.AI:\n');

  console.log('1. PERSONAL CONTEXT');
  console.log('   Praktika: Treats each session as new');
  console.log('   LinguaAI: "How\'s the Google interview prep going, Maria?"');

  console.log('\n2. ERROR PATTERN RECOGNITION');
  console.log('   Praktika: Corrects each error in isolation');
  console.log('   LinguaAI: Recognizes past tense is a recurring issue,');
  console.log('             prioritizes it, celebrates when corrected');

  console.log('\n3. DYNAMIC ADAPTATION');
  console.log('   Praktika: Static difficulty levels');
  console.log('   LinguaAI: Adjusts complexity, pace, encouragement');
  console.log('             in real-time based on signals');

  console.log('\n4. CONTINUITY');
  console.log('   Praktika: "Hello! What shall we practice today?"');
  console.log('   LinguaAI: "Last time you mentioned the issue at work.');
  console.log('             Did it work out with your boss?"');

  console.log('\n5. GOAL-DRIVEN LEARNING');
  console.log('   Praktika: Generic scenarios');
  console.log('   LinguaAI: Scenarios tailored to Google interview prep,');
  console.log('             vocabulary focused on tech/business English');
}

// Helper to extract key prompt sections
function extractPromptHighlights(prompt: string): string {
  const highlights: string[] = [];

  if (prompt.includes('LEARNER MEMORY')) {
    highlights.push('📝 MEMORY SECTION INCLUDED:');
    highlights.push('   - Knows Maria\'s name and workplace');
    highlights.push('   - Knows about Google interview goal');
    highlights.push('   - References last session\'s topics');
  }

  if (prompt.includes('ERROR PATTERNS')) {
    highlights.push('⚠️  ERROR AWARENESS:');
    highlights.push('   - Past tense flagged as recurring issue');
    highlights.push('   - Will watch for and gently correct');
  }

  if (prompt.includes('ADAPTATION')) {
    highlights.push('🎯 ADAPTATION ACTIVE:');
    highlights.push('   - Level B1 constraints applied');
    highlights.push('   - Correction frequency: every error');
    highlights.push('   - Encouragement: balanced');
  }

  if (prompt.includes('CONTINUITY')) {
    highlights.push('🔗 CONTINUITY ENABLED:');
    highlights.push('   - Follow up on work situation');
    highlights.push('   - Continue interview prep theme');
  }

  return highlights.join('\n');
}

// ============================================
// EXAMPLE: Generated System Prompt
// ============================================

export const EXAMPLE_GENERATED_PROMPT = `
# IDENTITY
You are a skilled American English conversation partner and language coach.

# LEARNER PROFILE
- Name: Maria
- Native language: Portuguese
- Current level: B1 (confidence: 65%)
- Primary goal: Job interview preparation

## Current Session State
- Mood: engaged
- Errors this session: 0
- Recent signals: ✓ Showing confidence

# LEARNER MEMORY
Use this information to make conversation natural and personalized:

## What I Know About Them
- [name] Maria
- [workplace] startup in São Paulo
- [goal_specific] interview at Google next month
- [life_event] preparing for career change

## Last Session
15-minute session discussing work and interviews. Used 120 words with 2 corrections.
Started neutral, ended engaged.

## Things to Follow Up On
- Last discussed: work, job interview
- Suggested focus: Practice past tense

## How to Use This Memory
- Reference their personal details naturally ("How's the Google prep going?")
- Connect new topics to their known interests
- Follow up on previous conversations
- Never reveal you are "reading from a memory" - make it feel natural

# ERROR PATTERNS TO WATCH
This learner has recurring issues with:

## Verb Tense
- Pattern: Uses present tense instead of past tense
- Frequency: Occurred 3 times
- Recent example: "Yesterday I practice interview questions"

## How to Address These
1. When you notice this error, provide a gentle correction
2. Create opportunities to practice the correct form
3. If they get it right, acknowledge it ("Nice use of 'practiced'!")
4. Do not lecture - weave corrections into natural conversation

# VOCABULARY FOCUS
## Words That Need Practice
Try to naturally incorporate these words or related contexts:
- "research" (mastery: 40%)
- "interview" (mastery: 30%)

# DYNAMIC ADAPTATION
## Level B1 Guidelines
- Maximum sentence length: 18 words
- Clauses per sentence: 2
- Vocabulary range: Most common 3000 words
- Idioms: sometimes
- Grammar structures: svo, relative_clauses, conditionals_1

## Current Emotional Adaptation
User is engaged. Maintain the positive momentum.

# CORRECTION STRATEGY
## Correction Frequency: every_error
## Correction Style: explicit

### Explicit Correction Example
User: "Yesterday I practice interview questions"
You: "Just a small note - for yesterday, we say 'practiced' not 'practice'.
So: 'Yesterday I practiced interview questions.' What kind of questions
did you work on?"

## Priority Corrections
For this learner, prioritize correcting:
- Verb Tense: Uses present tense instead of past tense

# ACKNOWLEDGMENT
Engage with the content of what the learner says, not its quality.
Mirror correct usage naturally in your reply.

## How to Acknowledge Naturally
- Respond to the CONTENT of what they said, not the quality
- If they used a new word correctly, use it back in your reply
- Continue as if talking to a friend
- NEVER: "Nice!", "Good!", "Great!", "Well said!", "That's right!"

# CONTINUITY
Create conversation continuity by:
- Referencing last session: "15-minute session discussing work and interviews..."
- Following up on:
  - Last discussed: work, job interview
  - Suggested focus: Practice past tense

Make it natural: "Last time we talked about your work, how did that go?"

# CONSTRAINTS
## Must Do
- Respond in target language (with corrections in context)
- Keep the conversation flowing naturally
- Reference memory when relevant
- Adapt to emotional state in real-time

## Must Not Do
- Break character to explain you are an AI
- Reveal you are "reading from memory"
- Lecture or give long grammar explanations
- Ignore signs of frustration or confusion
- Use vocabulary far above their level
- Use markdown, lists, or formatting
- Give responses longer than 4 sentences
`;

// Run demonstration
// demonstrateMemoryInAction().catch(console.error);

export { demonstrateMemoryInAction };
