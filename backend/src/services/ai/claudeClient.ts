import Anthropic from '@anthropic-ai/sdk';
import { config } from '../../config';
import { logger } from '../../utils/logger';

// Initialize Anthropic client
export const anthropic = new Anthropic({
  apiKey: config.ai.anthropicApiKey,
  timeout: 30_000, // 30s timeout for all requests
});

export interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ClaudeStreamCallbacks {
  onText: (text: string) => void;
  onComplete: (fullText: string) => void;
  onError: (error: Error) => void;
}

/**
 * Send a message to Claude and get a response
 */
export async function sendMessage(
  systemPrompt: string,
  messages: ClaudeMessage[],
  options?: {
    maxTokens?: number;
    temperature?: number;
  }
): Promise<string> {
  try {
    const response = await anthropic.messages.create({
      model: config.ai.model,
      max_tokens: options?.maxTokens || config.ai.maxTokens,
      temperature: options?.temperature || config.ai.temperature,
      system: systemPrompt,
      messages: messages.map(m => ({
        role: m.role,
        content: m.content,
      })),
    });

    // Extract text from response
    const textContent = response.content.find(c => c.type === 'text');
    return textContent?.text || '';
  } catch (error) {
    logger.error('Claude API error:', error);
    throw error;
  }
}

/**
 * Stream a response from Claude (for real-time voice)
 */
export async function streamMessage(
  systemPrompt: string,
  messages: ClaudeMessage[],
  callbacks: ClaudeStreamCallbacks,
  options?: {
    maxTokens?: number;
    temperature?: number;
  }
): Promise<void> {
  let fullText = '';

  try {
    const stream = await anthropic.messages.create({
      model: config.ai.model,
      max_tokens: options?.maxTokens || config.ai.maxTokens,
      temperature: options?.temperature || config.ai.temperature,
      system: systemPrompt,
      messages: messages.map(m => ({
        role: m.role,
        content: m.content,
      })),
      stream: true,
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta') {
        const delta = event.delta;
        if ('text' in delta) {
          fullText += delta.text;
          callbacks.onText(delta.text);
        }
      }
    }

    callbacks.onComplete(fullText);
  } catch (error) {
    logger.error('Claude streaming error:', error);
    callbacks.onError(error as Error);
    throw error;
  }
}

/**
 * Send a structured analysis request to Claude
 */
export async function analyzeMessage(
  userMessage: string,
  context: {
    targetLanguage: string;
    userLevel: string;
    previousMessages: ClaudeMessage[];
  }
): Promise<{
  response: string;
  analysis: string; // JSON string of analysis
}> {
  const systemPrompt = `You are analyzing a language learner's message.
Target language: ${context.targetLanguage}
User's estimated level: ${context.userLevel}

Respond with a JSON object containing:
1. "response": Your conversational response in ${context.targetLanguage}
2. "analysis": An analysis object with:
   - "errors": Array of {type, original, correction, explanation, severity}
   - "vocabularyLevel": CEFR level of vocabulary used (A1-C2)
   - "grammarLevel": CEFR level of grammar used (A1-C2)
   - "fluencyScore": 0-100
   - "sentiment": "positive", "neutral", or "frustrated"
   - "wordCount": number
   - "uniqueWords": array of unique words used
   - "complexity": "simple", "moderate", or "complex"

Only output valid JSON, no markdown or explanation.`;

  const messages: ClaudeMessage[] = [
    ...context.previousMessages,
    { role: 'user', content: userMessage },
  ];

  const response = await sendMessage(systemPrompt, messages, { temperature: 0.3 });

  try {
    const parsed = JSON.parse(response);
    return {
      response: parsed.response,
      analysis: JSON.stringify(parsed.analysis),
    };
  } catch {
    // If parsing fails, return the response as-is
    return {
      response,
      analysis: JSON.stringify({ errors: [], vocabularyLevel: 'A2', grammarLevel: 'A2', fluencyScore: 70 }),
    };
  }
}

/**
 * Stream a response from Claude as async generator (for real-time voice)
 */
export async function* streamMessageGenerator(
  systemPrompt: string,
  messages: ClaudeMessage[],
  options?: {
    maxTokens?: number;
    temperature?: number;
  }
): AsyncGenerator<string, void, unknown> {
  try {
    const stream = await anthropic.messages.create({
      model: config.ai.model,
      max_tokens: options?.maxTokens || config.ai.maxTokens,
      temperature: options?.temperature || config.ai.temperature,
      system: systemPrompt,
      messages: messages.map(m => ({
        role: m.role,
        content: m.content,
      })),
      stream: true,
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta') {
        const delta = event.delta;
        if ('text' in delta) {
          yield delta.text;
        }
      }
    }
  } catch (error) {
    logger.error('Claude streaming error:', error);
    throw error;
  }
}

export default {
  sendMessage,
  streamMessage,
  streamMessageGenerator,
  analyzeMessage,
};
