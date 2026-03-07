import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  // Server
  PORT: z.string().default('3000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Database
  DATABASE_URL: z.string(),

  // Redis
  REDIS_URL: z.string().default('redis://localhost:6379'),

  // JWT
  JWT_SECRET: z.string(),
  JWT_EXPIRES_IN: z.string().default('7d'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),

  // AI Services
  ANTHROPIC_API_KEY: z.string(),
  OPENAI_API_KEY: z.string().optional(),

  // Voice Services
  ELEVENLABS_API_KEY: z.string().optional(),
  DEEPGRAM_API_KEY: z.string().optional(),

  // Vector Store (Pinecone)
  PINECONE_API_KEY: z.string().optional(),
  PINECONE_INDEX_NAME: z.string().default('linguaai-memories'),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.string().default('900000'),
  RATE_LIMIT_MAX_REQUESTS: z.string().default('100'),

  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.format());
  process.exit(1);
}

const env = parsed.data;

export const config = {
  server: {
    port: parseInt(env.PORT, 10),
    nodeEnv: env.NODE_ENV,
    isDev: env.NODE_ENV === 'development',
    isProd: env.NODE_ENV === 'production',
  },

  database: {
    url: env.DATABASE_URL,
  },

  redis: {
    url: env.REDIS_URL,
  },

  jwt: {
    secret: env.JWT_SECRET,
    expiresIn: env.JWT_EXPIRES_IN,
    refreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN,
  },

  ai: {
    anthropicApiKey: env.ANTHROPIC_API_KEY,
    openaiApiKey: env.OPENAI_API_KEY,
    // Claude model settings
    model: 'claude-sonnet-4-20250514',
    maxTokens: 1024,
    temperature: 0.7,
  },

  voice: {
    elevenlabsApiKey: env.ELEVENLABS_API_KEY,
    deepgramApiKey: env.DEEPGRAM_API_KEY,

    elevenLabs: {
      model: 'eleven_multilingual_v2',
      outputFormat: 'mp3_44100_128',
      // Default voices per language (ElevenLabs multilingual voice IDs)
      voices: {
        en: { male: 'pNInz6obpgDQGcFmaJgB', female: 'EXAVITQu4vr4xnSDxMaL' },
        es: { male: 'pNInz6obpgDQGcFmaJgB', female: 'EXAVITQu4vr4xnSDxMaL' },
        pt: { male: 'pNInz6obpgDQGcFmaJgB', female: 'EXAVITQu4vr4xnSDxMaL' },
        fr: { male: 'pNInz6obpgDQGcFmaJgB', female: 'EXAVITQu4vr4xnSDxMaL' },
        de: { male: 'pNInz6obpgDQGcFmaJgB', female: 'EXAVITQu4vr4xnSDxMaL' },
        it: { male: 'pNInz6obpgDQGcFmaJgB', female: 'EXAVITQu4vr4xnSDxMaL' },
        ar: { male: 'pNInz6obpgDQGcFmaJgB', female: 'EXAVITQu4vr4xnSDxMaL' },
      } as Record<string, { male: string; female: string }>,
    },

    deepgram: {
      model: 'nova-2',
      sampleRate: 16000,
      channels: 1,
      encoding: 'linear16' as const,
    },
  },

  vectorStore: {
    pineconeApiKey: env.PINECONE_API_KEY,
    pineconeIndexName: env.PINECONE_INDEX_NAME,
  },

  rateLimit: {
    windowMs: parseInt(env.RATE_LIMIT_WINDOW_MS, 10),
    maxRequests: parseInt(env.RATE_LIMIT_MAX_REQUESTS, 10),
  },

  logging: {
    level: env.LOG_LEVEL,
  },
} as const;

export type Config = typeof config;
export default config;
