# LinguaAI — Technical Architecture
## Voice-First AI Language Learning Platform

---

# ARCHITECTURE OVERVIEW

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           LINGUAAI ARCHITECTURE                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         MOBILE CLIENT                                │   │
│  │                      (React Native CLI)                              │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │   │
│  │  │   UI     │ │  State   │ │  Voice   │ │   API    │ │  Local   │  │   │
│  │  │  Layer   │ │  (Zustand)│ │  Engine  │ │  Client  │ │  Store   │  │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘  │   │
│  └───────────────────────────────┬─────────────────────────────────────┘   │
│                                  │                                          │
│                          WebSocket + REST                                   │
│                                  │                                          │
│  ┌───────────────────────────────▼─────────────────────────────────────┐   │
│  │                         API GATEWAY                                  │   │
│  │                    (Node.js + Fastify)                               │   │
│  └───────────────────────────────┬─────────────────────────────────────┘   │
│                                  │                                          │
│         ┌────────────────────────┼────────────────────────┐                │
│         │                        │                        │                │
│         ▼                        ▼                        ▼                │
│  ┌─────────────┐         ┌─────────────┐         ┌─────────────┐          │
│  │   Voice     │         │   Session   │         │   User      │          │
│  │   Service   │         │   Service   │         │   Service   │          │
│  │             │         │             │         │             │          │
│  │  STT → TTS  │         │  AI Engine  │         │  Memory     │          │
│  └──────┬──────┘         └──────┬──────┘         └──────┬──────┘          │
│         │                       │                       │                  │
│         ▼                       ▼                       ▼                  │
│  ┌─────────────┐         ┌─────────────┐         ┌─────────────┐          │
│  │  Deepgram   │         │  Claude/    │         │  PostgreSQL │          │
│  │  ElevenLabs │         │  GPT-4      │         │  + Pinecone │          │
│  └─────────────┘         └─────────────┘         └─────────────┘          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

# PART 1: FRONTEND ARCHITECTURE

## 1.1 Project Structure

```
/src
├── /app                          # Application shell
│   ├── /navigation               # React Navigation setup
│   │   ├── RootNavigator.tsx
│   │   ├── AuthNavigator.tsx
│   │   ├── MainNavigator.tsx
│   │   └── types.ts
│   │
│   └── /screens                  # Screen components
│       ├── /auth
│       │   ├── WelcomeScreen.tsx
│       │   ├── LoginScreen.tsx
│       │   └── OnboardingFlow/
│       │       ├── NativeLanguageScreen.tsx
│       │       ├── TargetLanguageScreen.tsx
│       │       ├── GoalsScreen.tsx
│       │       ├── VoiceSelectionScreen.tsx
│       │       └── ConfidenceCheckScreen.tsx
│       │
│       ├── /home
│       │   ├── HomeScreen.tsx
│       │   └── components/
│       │
│       ├── /conversation
│       │   ├── CallScreen.tsx          # Main voice UI
│       │   ├── ScenarioSelectScreen.tsx
│       │   ├── SessionSummaryScreen.tsx
│       │   └── components/
│       │       ├── VoiceWaveform.tsx
│       │       ├── ChatTranscript.tsx
│       │       ├── CallControls.tsx
│       │       └── TypingIndicator.tsx
│       │
│       ├── /progress
│       │   ├── ProgressScreen.tsx
│       │   ├── ConfidenceMapScreen.tsx
│       │   └── VocabularyScreen.tsx
│       │
│       └── /settings
│           ├── SettingsScreen.tsx
│           ├── ProfileScreen.tsx
│           └── VoiceSettingsScreen.tsx
│
├── /core                         # Core business logic
│   ├── /voice                    # Voice processing
│   │   ├── VoiceEngine.ts        # Main voice orchestrator
│   │   ├── AudioRecorder.ts      # Microphone input
│   │   ├── AudioPlayer.ts        # TTS playback
│   │   ├── StreamingSTT.ts       # Real-time transcription
│   │   └── VoiceActivityDetection.ts
│   │
│   ├── /ai                       # AI conversation
│   │   ├── ConversationManager.ts
│   │   ├── ContextBuilder.ts
│   │   └── ResponseParser.ts
│   │
│   ├── /memory                   # Local memory cache
│   │   ├── SessionMemory.ts
│   │   └── UserMemoryCache.ts
│   │
│   └── /analytics                # Usage tracking
│       └── AnalyticsService.ts
│
├── /data                         # Data layer
│   ├── /api                      # API clients
│   │   ├── client.ts             # Axios/fetch setup
│   │   ├── websocket.ts          # WebSocket connection
│   │   └── /endpoints
│   │       ├── auth.ts
│   │       ├── sessions.ts
│   │       ├── memory.ts
│   │       └── progress.ts
│   │
│   ├── /storage                  # Local persistence
│   │   ├── secureStorage.ts      # Keychain/Keystore
│   │   ├── asyncStorage.ts       # General storage
│   │   └── database.ts           # WatermelonDB for offline
│   │
│   └── /repositories             # Data access patterns
│       ├── UserRepository.ts
│       ├── SessionRepository.ts
│       └── VocabularyRepository.ts
│
├── /state                        # State management
│   ├── /stores                   # Zustand stores
│   │   ├── authStore.ts
│   │   ├── userStore.ts
│   │   ├── conversationStore.ts
│   │   ├── voiceStore.ts
│   │   └── progressStore.ts
│   │
│   └── /hooks                    # Custom hooks
│       ├── useVoiceConversation.ts
│       ├── useAudioRecorder.ts
│       ├── useConversationMemory.ts
│       ├── useProgress.ts
│       └── useUserPreferences.ts
│
├── /ui                           # UI layer
│   ├── /components               # Reusable components
│   │   ├── /common
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Input.tsx
│   │   │   └── Modal.tsx
│   │   │
│   │   ├── /voice
│   │   │   ├── WaveformVisualizer.tsx
│   │   │   ├── RecordingButton.tsx
│   │   │   └── VoiceStateIndicator.tsx
│   │   │
│   │   └── /feedback
│   │       ├── ConfidenceBar.tsx
│   │       ├── InsightCard.tsx
│   │       └── VocabularyCard.tsx
│   │
│   ├── /theme                    # Design system
│   │   ├── colors.ts
│   │   ├── typography.ts
│   │   ├── spacing.ts
│   │   └── index.ts
│   │
│   └── /animations               # Reanimated animations
│       ├── waveformAnimation.ts
│       └── transitionPresets.ts
│
├── /utils                        # Utilities
│   ├── constants.ts
│   ├── helpers.ts
│   ├── formatters.ts
│   └── validators.ts
│
├── /types                        # TypeScript types
│   ├── api.ts
│   ├── navigation.ts
│   ├── voice.ts
│   ├── conversation.ts
│   └── user.ts
│
└── /assets                       # Static assets
    ├── /images
    ├── /sounds
    └── /fonts
```

## 1.2 State Management: Zustand

**Decision**: Zustand over Redux/MobX
- Minimal boilerplate
- Built-in persistence
- TypeScript-first
- React Native friendly
- Devtools support

### Core Stores

```typescript
// /state/stores/conversationStore.ts

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Message {
  id: string;
  role: 'user' | 'ai';
  content: string;
  timestamp: number;
  audioUrl?: string;
}

interface ConversationState {
  // State
  isActive: boolean;
  isRecording: boolean;
  isAISpeaking: boolean;
  isProcessing: boolean;
  currentSessionId: string | null;
  messages: Message[];
  scenario: Scenario | null;
  duration: number;

  // Actions
  startConversation: (scenario?: Scenario) => void;
  endConversation: () => void;
  addMessage: (message: Message) => void;
  setRecording: (isRecording: boolean) => void;
  setAISpeaking: (isSpeaking: boolean) => void;
  setProcessing: (isProcessing: boolean) => void;
  reset: () => void;
}

export const useConversationStore = create<ConversationState>()(
  persist(
    (set, get) => ({
      // Initial state
      isActive: false,
      isRecording: false,
      isAISpeaking: false,
      isProcessing: false,
      currentSessionId: null,
      messages: [],
      scenario: null,
      duration: 0,

      // Actions
      startConversation: (scenario) => {
        set({
          isActive: true,
          currentSessionId: generateId(),
          scenario: scenario || null,
          messages: [],
          duration: 0,
        });
      },

      endConversation: () => {
        set({
          isActive: false,
          isRecording: false,
          isAISpeaking: false,
        });
      },

      addMessage: (message) => {
        set((state) => ({
          messages: [...state.messages, message],
        }));
      },

      setRecording: (isRecording) => set({ isRecording }),
      setAISpeaking: (isSpeaking) => set({ isAISpeaking: isSpeaking }),
      setProcessing: (isProcessing) => set({ isProcessing }),

      reset: () => set({
        isActive: false,
        isRecording: false,
        isAISpeaking: false,
        isProcessing: false,
        currentSessionId: null,
        messages: [],
        scenario: null,
        duration: 0,
      }),
    }),
    {
      name: 'conversation-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        // Only persist messages for recovery
        messages: state.messages,
        currentSessionId: state.currentSessionId,
      }),
    }
  )
);
```

```typescript
// /state/stores/voiceStore.ts

interface VoiceState {
  // Audio levels for visualization
  inputLevel: number;
  outputLevel: number;

  // Voice settings
  selectedVoice: 'sofia' | 'marco';
  playbackSpeed: number;
  inputVolume: number;

  // Connection state
  isConnected: boolean;
  latency: number;

  // Actions
  setInputLevel: (level: number) => void;
  setOutputLevel: (level: number) => void;
  setVoice: (voice: 'sofia' | 'marco') => void;
  setPlaybackSpeed: (speed: number) => void;
}

export const useVoiceStore = create<VoiceState>()((set) => ({
  inputLevel: 0,
  outputLevel: 0,
  selectedVoice: 'sofia',
  playbackSpeed: 1.0,
  inputVolume: 1.0,
  isConnected: false,
  latency: 0,

  setInputLevel: (level) => set({ inputLevel: level }),
  setOutputLevel: (level) => set({ outputLevel: level }),
  setVoice: (voice) => set({ selectedVoice: voice }),
  setPlaybackSpeed: (speed) => set({ playbackSpeed: speed }),
}));
```

## 1.3 Key Custom Hooks

```typescript
// /state/hooks/useVoiceConversation.ts

import { useCallback, useEffect, useRef } from 'react';
import { useConversationStore } from '../stores/conversationStore';
import { useVoiceStore } from '../stores/voiceStore';
import { VoiceEngine } from '../../core/voice/VoiceEngine';
import { ConversationManager } from '../../core/ai/ConversationManager';

export function useVoiceConversation() {
  const voiceEngine = useRef<VoiceEngine | null>(null);
  const conversationManager = useRef<ConversationManager | null>(null);

  const {
    isActive,
    isRecording,
    isAISpeaking,
    messages,
    startConversation,
    endConversation,
    addMessage,
    setRecording,
    setAISpeaking,
    setProcessing,
  } = useConversationStore();

  const { selectedVoice, setInputLevel } = useVoiceStore();

  // Initialize engines
  useEffect(() => {
    voiceEngine.current = new VoiceEngine({
      onTranscript: handleTranscript,
      onAudioLevel: setInputLevel,
      onSpeechEnd: handleSpeechEnd,
    });

    conversationManager.current = new ConversationManager();

    return () => {
      voiceEngine.current?.cleanup();
    };
  }, []);

  const startCall = useCallback(async (scenario?: Scenario) => {
    if (!voiceEngine.current || !conversationManager.current) return;

    startConversation(scenario);

    // Connect to backend
    await voiceEngine.current.connect();

    // Get initial AI greeting
    const greeting = await conversationManager.current.getGreeting(scenario);

    // Play greeting
    await voiceEngine.current.speak(greeting.text, selectedVoice);

    addMessage({
      id: generateId(),
      role: 'ai',
      content: greeting.text,
      timestamp: Date.now(),
    });

    // Start listening
    voiceEngine.current.startListening();
    setRecording(true);
  }, [selectedVoice, startConversation, addMessage, setRecording]);

  const handleTranscript = useCallback(async (transcript: string, isFinal: boolean) => {
    if (!isFinal) return; // Only process final transcripts

    setRecording(false);
    setProcessing(true);

    // Add user message
    addMessage({
      id: generateId(),
      role: 'user',
      content: transcript,
      timestamp: Date.now(),
    });

    // Get AI response
    const response = await conversationManager.current?.getResponse(transcript);

    setProcessing(false);

    if (response) {
      setAISpeaking(true);

      // Add AI message
      addMessage({
        id: generateId(),
        role: 'ai',
        content: response.text,
        timestamp: Date.now(),
      });

      // Speak response
      await voiceEngine.current?.speak(response.text, selectedVoice);

      setAISpeaking(false);

      // Resume listening
      voiceEngine.current?.startListening();
      setRecording(true);
    }
  }, [addMessage, setRecording, setProcessing, setAISpeaking, selectedVoice]);

  const handleSpeechEnd = useCallback(() => {
    // User stopped speaking, process the final transcript
  }, []);

  const endCall = useCallback(async () => {
    voiceEngine.current?.stopListening();
    voiceEngine.current?.disconnect();
    endConversation();

    // Trigger session summary generation
    return conversationManager.current?.generateSummary(messages);
  }, [endConversation, messages]);

  return {
    isActive,
    isRecording,
    isAISpeaking,
    messages,
    startCall,
    endCall,
  };
}
```

---

# PART 2: BACKEND ARCHITECTURE

## 2.1 Service Architecture

```
/backend
├── /src
│   ├── /api                      # HTTP/WebSocket handlers
│   │   ├── /routes
│   │   │   ├── auth.routes.ts
│   │   │   ├── session.routes.ts
│   │   │   ├── memory.routes.ts
│   │   │   ├── progress.routes.ts
│   │   │   └── voice.routes.ts
│   │   │
│   │   ├── /controllers
│   │   │   ├── AuthController.ts
│   │   │   ├── SessionController.ts
│   │   │   ├── MemoryController.ts
│   │   │   ├── ProgressController.ts
│   │   │   └── VoiceController.ts
│   │   │
│   │   ├── /middleware
│   │   │   ├── auth.middleware.ts
│   │   │   ├── rateLimit.middleware.ts
│   │   │   └── validation.middleware.ts
│   │   │
│   │   └── /websocket
│   │       ├── VoiceSocketHandler.ts
│   │       └── ConnectionManager.ts
│   │
│   ├── /services                 # Business logic
│   │   ├── /ai
│   │   │   ├── ConversationEngine.ts
│   │   │   ├── PromptBuilder.ts
│   │   │   ├── ResponseParser.ts
│   │   │   └── FeedbackGenerator.ts
│   │   │
│   │   ├── /voice
│   │   │   ├── SpeechToText.ts
│   │   │   ├── TextToSpeech.ts
│   │   │   └── VoicePipeline.ts
│   │   │
│   │   ├── /memory
│   │   │   ├── ShortTermMemory.ts
│   │   │   ├── LongTermMemory.ts
│   │   │   ├── MemoryRetriever.ts
│   │   │   └── VectorStore.ts
│   │   │
│   │   ├── /progress
│   │   │   ├── ConfidenceTracker.ts
│   │   │   ├── ErrorPatternAnalyzer.ts
│   │   │   └── VocabularyExtractor.ts
│   │   │
│   │   └── /user
│   │       ├── UserService.ts
│   │       └── PreferencesService.ts
│   │
│   ├── /db                       # Database layer
│   │   ├── prisma/
│   │   │   └── schema.prisma
│   │   ├── repositories/
│   │   │   ├── UserRepository.ts
│   │   │   ├── SessionRepository.ts
│   │   │   ├── MemoryRepository.ts
│   │   │   └── ProgressRepository.ts
│   │   └── migrations/
│   │
│   ├── /lib                      # Shared utilities
│   │   ├── logger.ts
│   │   ├── errors.ts
│   │   ├── cache.ts              # Redis client
│   │   └── queue.ts              # BullMQ for async jobs
│   │
│   └── /config
│       ├── env.ts
│       ├── ai.config.ts
│       └── voice.config.ts
│
├── /workers                      # Background jobs
│   ├── SessionSummaryWorker.ts
│   ├── MemoryIndexerWorker.ts
│   └── AnalyticsWorker.ts
│
└── /tests
    ├── /unit
    ├── /integration
    └── /e2e
```

## 2.2 API Design

### REST Endpoints

```yaml
# Auth
POST   /api/v1/auth/register
POST   /api/v1/auth/login
POST   /api/v1/auth/refresh
POST   /api/v1/auth/logout

# User
GET    /api/v1/users/me
PATCH  /api/v1/users/me
GET    /api/v1/users/me/preferences
PATCH  /api/v1/users/me/preferences

# Sessions
POST   /api/v1/sessions                    # Start new session
GET    /api/v1/sessions                    # List past sessions
GET    /api/v1/sessions/:id                # Get session details
GET    /api/v1/sessions/:id/transcript     # Get full transcript
GET    /api/v1/sessions/:id/summary        # Get session summary
POST   /api/v1/sessions/:id/end            # End session, trigger analysis

# Memory
GET    /api/v1/memory/context              # Get relevant memories for new session
POST   /api/v1/memory/facts                # Store new facts about user
GET    /api/v1/memory/vocabulary           # Get learned vocabulary
POST   /api/v1/memory/vocabulary           # Save new vocabulary items

# Progress
GET    /api/v1/progress                    # Overall progress
GET    /api/v1/progress/confidence         # Confidence by scenario
GET    /api/v1/progress/patterns           # Error patterns
GET    /api/v1/progress/timeline           # Progress over time

# Scenarios
GET    /api/v1/scenarios                   # List available scenarios
GET    /api/v1/scenarios/:id               # Get scenario details
```

### WebSocket Protocol

```typescript
// Voice WebSocket: wss://api.linguaai.com/v1/voice

// Client → Server Messages
interface ClientMessage {
  type: 'audio_chunk' | 'end_speech' | 'interrupt' | 'config';
  payload: AudioChunk | EndSpeech | Interrupt | Config;
}

interface AudioChunk {
  data: string;          // Base64 encoded audio
  sampleRate: number;    // 16000
  format: 'pcm16';
}

interface EndSpeech {
  reason: 'silence_detected' | 'user_action';
}

interface Config {
  language: string;
  voice: 'sofia' | 'marco';
  speed: number;
}

// Server → Client Messages
interface ServerMessage {
  type: 'transcript' | 'response_start' | 'audio_chunk' | 'response_end' | 'error';
  payload: Transcript | ResponseStart | AudioChunk | ResponseEnd | Error;
}

interface Transcript {
  text: string;
  isFinal: boolean;
  confidence: number;
}

interface ResponseStart {
  text: string;          // Full response text
  sessionId: string;
}

interface AudioChunk {
  data: string;          // Base64 encoded audio
  index: number;
}

interface ResponseEnd {
  duration: number;
}
```

## 2.3 Database Schema (Prisma)

```prisma
// /backend/src/db/prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============ USER MODELS ============

model User {
  id                String   @id @default(cuid())
  email             String   @unique
  passwordHash      String
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  // Profile
  name              String?
  nativeLanguage    String
  avatarUrl         String?

  // Relations
  preferences       UserPreferences?
  languages         UserLanguage[]
  sessions          Session[]
  memories          Memory[]
  progress          Progress[]
  vocabulary        VocabularyItem[]
}

model UserPreferences {
  id                String   @id @default(cuid())
  userId            String   @unique
  user              User     @relation(fields: [userId], references: [id])

  // Voice settings
  preferredVoice    String   @default("sofia")
  playbackSpeed     Float    @default(1.0)

  // Learning preferences
  correctionStyle   String   @default("gentle")  // gentle | balanced | direct
  sessionLength     Int      @default(10)        // minutes
  dailyGoal         Int      @default(1)         // sessions

  // Notification settings
  reminderEnabled   Boolean  @default(true)
  reminderTime      String?                      // "09:00"

  // UI preferences
  interfaceLanguage String   @default("native")  // native | target | mixed
  showTranscript    Boolean  @default(true)
}

model UserLanguage {
  id                String   @id @default(cuid())
  userId            String
  user              User     @relation(fields: [userId], references: [id])

  languageCode      String                       // "es", "it", "pt"
  variant           String?                      // "latam", "brazil", "american"
  isActive          Boolean  @default(true)

  createdAt         DateTime @default(now())

  @@unique([userId, languageCode, variant])
}

// ============ SESSION MODELS ============

model Session {
  id                String   @id @default(cuid())
  userId            String
  user              User     @relation(fields: [userId], references: [id])

  // Session metadata
  startedAt         DateTime @default(now())
  endedAt           DateTime?
  duration          Int?                         // seconds

  // Context
  languageCode      String
  variant           String?
  scenarioId        String?
  scenario          Scenario? @relation(fields: [scenarioId], references: [id])

  // Content
  messages          Message[]

  // Analysis (populated after session ends)
  summary           SessionSummary?
  feedback          SessionFeedback[]
  extractedVocab    VocabularyItem[]

  // State
  status            String   @default("active")  // active | completed | abandoned
}

model Message {
  id                String   @id @default(cuid())
  sessionId         String
  session           Session  @relation(fields: [sessionId], references: [id])

  role              String                       // "user" | "ai"
  content           String
  audioUrl          String?                      // S3 URL if stored

  timestamp         DateTime @default(now())

  // Analysis
  grammarIssues     Json?                        // [{type, position, correction}]
  pronunciationScore Float?
}

model SessionSummary {
  id                String   @id @default(cuid())
  sessionId         String   @unique
  session           Session  @relation(fields: [sessionId], references: [id])

  // Overview
  overallAssessment String                       // Markdown summary
  topicsCovered     String[]                     // ["job interview", "past tense"]

  // Scores (0-100, optional display)
  fluencyScore      Int?
  accuracyScore     Int?
  complexityScore   Int?

  // Qualitative insights
  strengths         String[]                     // What went well
  growthAreas       String[]                     // Focus areas

  createdAt         DateTime @default(now())
}

model SessionFeedback {
  id                String   @id @default(cuid())
  sessionId         String
  session           Session  @relation(fields: [sessionId], references: [id])

  type              String                       // "grammar" | "pronunciation" | "vocabulary"
  category          String                       // "past_tense" | "th_sound" | etc

  original          String                       // What user said
  correction        String?                      // Correct form
  explanation       String                       // Why/how to improve

  priority          Int      @default(1)         // 1 = show first
  acknowledged      Boolean  @default(false)     // User saw this
}

// ============ MEMORY MODELS ============

model Memory {
  id                String   @id @default(cuid())
  userId            String
  user              User     @relation(fields: [userId], references: [id])

  type              String                       // "fact" | "preference" | "event" | "pattern"
  category          String                       // "personal" | "work" | "learning"

  content           String                       // The memory itself
  embedding         Bytes?                       // Vector embedding for similarity search

  // Temporal
  validFrom         DateTime @default(now())
  validUntil        DateTime?                    // Null = forever

  // Source
  sourceSessionId   String?
  sourceMessageId   String?

  // Retrieval
  accessCount       Int      @default(0)
  lastAccessedAt    DateTime?

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@index([userId, type])
  @@index([userId, category])
}

// ============ PROGRESS MODELS ============

model Progress {
  id                String   @id @default(cuid())
  userId            String
  user              User     @relation(fields: [userId], references: [id])

  languageCode      String
  variant           String?

  // Confidence by scenario (JSON: { "restaurant": 80, "interview": 45 })
  scenarioConfidence Json    @default("{}")

  // Error patterns (JSON: { "past_tense": 12, "articles": 8 })
  errorPatterns     Json     @default("{}")

  // Stats
  totalSessions     Int      @default(0)
  totalMinutes      Int      @default(0)
  longestSession    Int      @default(0)
  currentStreak     Int      @default(0)
  longestStreak     Int      @default(0)

  lastSessionAt     DateTime?

  @@unique([userId, languageCode, variant])
}

model VocabularyItem {
  id                String   @id @default(cuid())
  userId            String
  user              User     @relation(fields: [userId], references: [id])
  sessionId         String?
  session           Session? @relation(fields: [sessionId], references: [id])

  languageCode      String

  term              String
  translation       String?
  context           String?                      // Sentence where it appeared
  audioUrl          String?                      // Pronunciation audio

  // Spaced repetition
  nextReviewAt      DateTime @default(now())
  repetitionCount   Int      @default(0)
  easeFactor        Float    @default(2.5)
  interval          Int      @default(1)         // days

  createdAt         DateTime @default(now())

  @@unique([userId, languageCode, term])
}

// ============ SCENARIO MODELS ============

model Scenario {
  id                String   @id @default(cuid())

  category          String                       // "professional" | "travel" | "social" | "exam"
  name              String
  description       String

  // Localized content
  nameTranslations  Json                         // { "it": "Colloquio", "es": "Entrevista" }
  descTranslations  Json

  // AI configuration
  systemPrompt      String                       // Base prompt for this scenario
  exampleDialogue   String?                      // Few-shot examples
  vocabulary        String[]                     // Key terms to potentially use

  // Difficulty
  minConfidence     Int      @default(0)         // Recommended minimum confidence
  targetSkills      String[]                     // ["formal_register", "questions"]

  // Relations
  sessions          Session[]

  isActive          Boolean  @default(true)
  sortOrder         Int      @default(0)
}
```

---

# PART 3: AI INTEGRATION LAYER

## 3.1 Prompt Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        AI PROMPT COMPOSITION                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  SYSTEM PROMPT                                                       │   │
│  │  ───────────────                                                     │   │
│  │  • Base persona (Sofia/Marco personality)                           │   │
│  │  • Language teaching philosophy                                     │   │
│  │  • Response format instructions                                     │   │
│  │  • Safety guidelines                                                │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                              +                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  SCENARIO CONTEXT (if applicable)                                   │   │
│  │  ──────────────────────────────                                      │   │
│  │  • Scenario-specific prompt                                         │   │
│  │  • Example dialogue snippets                                        │   │
│  │  • Target vocabulary                                                │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                              +                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  USER MEMORY CONTEXT                                                 │   │
│  │  ────────────────────                                                │   │
│  │  • Relevant memories from vector search                             │   │
│  │  • Recent session summaries                                         │   │
│  │  • Known error patterns                                             │   │
│  │  • User preferences (correction style, etc.)                        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                              +                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  CONVERSATION HISTORY                                                │   │
│  │  ──────────────────────                                              │   │
│  │  • Last N messages from current session                             │   │
│  │  • Summarized earlier context if session is long                    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                              +                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  CURRENT USER INPUT                                                  │   │
│  │  ────────────────────                                                │   │
│  │  • Latest user message (transcription)                              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                              ↓                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  CLAUDE/GPT-4 API CALL                                              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                              ↓                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  STRUCTURED RESPONSE                                                 │   │
│  │  ────────────────────                                                │   │
│  │  {                                                                   │   │
│  │    "spoken_response": "Che bello! E com'è andato...",               │   │
│  │    "internal_notes": {                                              │   │
│  │      "detected_errors": [...],                                      │   │
│  │      "vocabulary_to_extract": [...],                                │   │
│  │      "memories_to_store": [...],                                    │   │
│  │      "confidence_signals": [...]                                    │   │
│  │    }                                                                │   │
│  │  }                                                                   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 3.2 Prompt Builder Service

```typescript
// /backend/src/services/ai/PromptBuilder.ts

interface PromptContext {
  user: User;
  preferences: UserPreferences;
  scenario?: Scenario;
  memories: Memory[];
  recentSessions: SessionSummary[];
  errorPatterns: ErrorPattern[];
  conversationHistory: Message[];
  currentInput: string;
}

export class PromptBuilder {
  private basePersonas = {
    sofia: `You are Sofia, a warm and patient Italian language tutor. You speak with natural warmth,
use encouraging phrases like "Bravissimo!" and "Che bello!", and always make the learner feel
comfortable. You have a gentle sense of humor and genuinely care about the learner's progress.
You never explicitly correct during conversation - instead, you model correct forms naturally.`,

    marco: `You are Marco, a friendly and clear Italian language tutor. You speak with clarity and
enthusiasm, offering helpful guidance without being overbearing. You use phrases like "Esatto!"
and "Perfetto!" to encourage. You have a straightforward teaching style while remaining warm.`,
  };

  private teachingPhilosophy = `
TEACHING APPROACH:
1. NEVER interrupt to correct. Let the conversation flow naturally.
2. Model correct forms by using them in your responses (recasting).
3. If the user makes an error, acknowledge their meaning first, then rephrase correctly.
4. Ask genuine follow-up questions based on what they said.
5. Gradually introduce new vocabulary in context, not as vocabulary drills.
6. Adjust your speaking complexity to slightly above the user's level.
7. Use recovery helpers naturally: if user hesitates, offer gentle prompts.
8. Remember: building confidence is as important as building accuracy.

RESPONSE FORMAT:
- Respond conversationally in the target language
- Keep responses concise (1-3 sentences typically)
- Ask questions to keep conversation flowing
- Use natural filler words and expressions
`;

  private responseFormat = `
You must respond with a JSON object containing:
{
  "spoken_response": "Your natural conversational response in the target language",
  "internal_notes": {
    "detected_errors": [
      {
        "type": "grammar|pronunciation|vocabulary",
        "original": "what user said",
        "correction": "correct form",
        "priority": 1-5
      }
    ],
    "vocabulary_used": ["new words the AI introduced"],
    "memories_to_store": [
      {
        "type": "fact|event|preference",
        "content": "User mentioned they have an interview Friday"
      }
    ],
    "confidence_signals": {
      "hesitation_level": "low|medium|high",
      "complexity_used": "low|medium|high",
      "recovery_phrases_used": true|false
    }
  }
}

ONLY return valid JSON. The spoken_response will be sent to TTS.
`;

  build(context: PromptContext): ChatMessage[] {
    const messages: ChatMessage[] = [];

    // System message
    const systemContent = this.buildSystemPrompt(context);
    messages.push({ role: 'system', content: systemContent });

    // Few-shot examples if scenario has them
    if (context.scenario?.exampleDialogue) {
      messages.push({
        role: 'user',
        content: '[Example dialogue for context]\n' + context.scenario.exampleDialogue
      });
    }

    // Conversation history
    for (const msg of context.conversationHistory.slice(-20)) { // Last 20 messages
      messages.push({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.role === 'ai'
          ? JSON.stringify({ spoken_response: msg.content, internal_notes: {} })
          : msg.content,
      });
    }

    // Current input
    messages.push({ role: 'user', content: context.currentInput });

    return messages;
  }

  private buildSystemPrompt(context: PromptContext): string {
    const parts: string[] = [];

    // Persona
    parts.push(this.basePersonas[context.preferences.preferredVoice as 'sofia' | 'marco']);
    parts.push(this.teachingPhilosophy);

    // Scenario context
    if (context.scenario) {
      parts.push(`\nCURRENT SCENARIO: ${context.scenario.name}`);
      parts.push(context.scenario.systemPrompt);
      if (context.scenario.vocabulary.length > 0) {
        parts.push(`Target vocabulary to naturally incorporate: ${context.scenario.vocabulary.join(', ')}`);
      }
    }

    // User context from memory
    parts.push(this.buildUserContext(context));

    // Correction style preference
    parts.push(this.buildCorrectionStyle(context.preferences.correctionStyle));

    // Response format
    parts.push(this.responseFormat);

    return parts.join('\n\n');
  }

  private buildUserContext(context: PromptContext): string {
    const lines: string[] = ['USER CONTEXT:'];

    // Basic info
    lines.push(`- Name: ${context.user.name || 'Unknown'}`);
    lines.push(`- Native language: ${context.user.nativeLanguage}`);

    // Relevant memories
    if (context.memories.length > 0) {
      lines.push('\nKnown facts about this user:');
      for (const memory of context.memories.slice(0, 10)) {
        lines.push(`- ${memory.content}`);
      }
    }

    // Recent session context
    if (context.recentSessions.length > 0) {
      const lastSession = context.recentSessions[0];
      lines.push(`\nLast session (${lastSession.createdAt}): ${lastSession.topicsCovered.join(', ')}`);
    }

    // Error patterns to be aware of
    if (context.errorPatterns.length > 0) {
      lines.push('\nThis user often struggles with:');
      for (const pattern of context.errorPatterns.slice(0, 5)) {
        lines.push(`- ${pattern.category} (${pattern.frequency} occurrences)`);
      }
      lines.push('Gently model correct usage when opportunities arise.');
    }

    return lines.join('\n');
  }

  private buildCorrectionStyle(style: string): string {
    switch (style) {
      case 'gentle':
        return `CORRECTION STYLE: Very gentle. Focus on encouragement. Only note errors internally,
never verbally correct. Model correct forms by natural recasting.`;

      case 'direct':
        return `CORRECTION STYLE: More direct. After acknowledging meaning, you can briefly note
important corrections: "Ah, hai ragione! A proposito, si dice 'sono andato' non 'ho andato'."`;

      case 'balanced':
      default:
        return `CORRECTION STYLE: Balanced. Model correct forms through recasting. For frequent
or important errors, occasionally offer a gentle note at natural pause points.`;
    }
  }
}
```

## 3.3 Memory Retrieval

```typescript
// /backend/src/services/memory/MemoryRetriever.ts

import { PineconeClient } from '@pinecone-database/pinecone';
import { OpenAIEmbeddings } from 'langchain/embeddings/openai';

export class MemoryRetriever {
  private pinecone: PineconeClient;
  private embeddings: OpenAIEmbeddings;
  private index: any;

  async initialize() {
    this.pinecone = new PineconeClient();
    await this.pinecone.init({
      apiKey: process.env.PINECONE_API_KEY!,
      environment: process.env.PINECONE_ENV!,
    });
    this.index = this.pinecone.Index('user-memories');
    this.embeddings = new OpenAIEmbeddings();
  }

  async getRelevantMemories(
    userId: string,
    currentContext: string,
    limit: number = 10
  ): Promise<Memory[]> {
    // Generate embedding for current context
    const queryEmbedding = await this.embeddings.embedQuery(currentContext);

    // Query Pinecone for similar memories
    const queryResponse = await this.index.query({
      queryRequest: {
        vector: queryEmbedding,
        topK: limit,
        filter: { userId },
        includeMetadata: true,
      },
    });

    // Filter by recency and relevance
    const memories = queryResponse.matches
      .filter((match: any) => match.score > 0.7) // Relevance threshold
      .map((match: any) => ({
        id: match.id,
        content: match.metadata.content,
        type: match.metadata.type,
        category: match.metadata.category,
        score: match.score,
      }));

    return memories;
  }

  async storeMemory(userId: string, memory: Partial<Memory>): Promise<void> {
    // Generate embedding
    const embedding = await this.embeddings.embedQuery(memory.content!);

    // Store in Pinecone
    await this.index.upsert({
      upsertRequest: {
        vectors: [{
          id: memory.id!,
          values: embedding,
          metadata: {
            userId,
            content: memory.content,
            type: memory.type,
            category: memory.category,
            createdAt: new Date().toISOString(),
          },
        }],
      },
    });

    // Also store in PostgreSQL for structured queries
    await prisma.memory.create({
      data: {
        id: memory.id,
        userId,
        content: memory.content!,
        type: memory.type!,
        category: memory.category!,
        embedding: Buffer.from(new Float32Array(embedding).buffer),
      },
    });
  }
}
```

---

# PART 4: VOICE PIPELINE

## 4.1 Pipeline Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           VOICE PIPELINE                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  USER DEVICE                        BACKEND                   EXTERNAL      │
│  ───────────                        ───────                   ────────      │
│                                                                             │
│  ┌──────────┐                                                               │
│  │   Mic    │                                                               │
│  └────┬─────┘                                                               │
│       │ PCM 16kHz                                                           │
│       ▼                                                                     │
│  ┌──────────┐                                                               │
│  │   VAD    │ ← Voice Activity Detection                                   │
│  │(on-device)│                                                              │
│  └────┬─────┘                                                               │
│       │ Audio chunks                                                        │
│       │ (when speaking)                                                     │
│       ▼                                                                     │
│  ┌──────────┐    WebSocket      ┌──────────┐                               │
│  │  Audio   │ ───────────────▶  │  Voice   │                               │
│  │ Streamer │                   │  Socket  │                               │
│  └──────────┘                   │  Handler │                               │
│                                 └────┬─────┘                               │
│                                      │                                      │
│                                      ▼                                      │
│                                 ┌──────────┐      ┌──────────┐             │
│                                 │   STT    │ ───▶ │ Deepgram │             │
│                                 │  Service │      │   API    │             │
│                                 └────┬─────┘      └──────────┘             │
│                                      │                                      │
│                                      │ Transcript                           │
│                                      ▼                                      │
│                                 ┌──────────┐                               │
│                                 │Conversat.│                               │
│                                 │  Engine  │ ← Prompt + Memory + AI        │
│                                 └────┬─────┘                               │
│                                      │                                      │
│                                      │ AI Response Text                     │
│                                      ▼                                      │
│                                 ┌──────────┐      ┌──────────┐             │
│                                 │   TTS    │ ───▶ │ElevenLabs│             │
│                                 │  Service │      │   API    │             │
│                                 └────┬─────┘      └──────────┘             │
│                                      │                                      │
│                                      │ Audio stream                         │
│                                      ▼                                      │
│  ┌──────────┐    WebSocket      ┌──────────┐                               │
│  │  Audio   │ ◀───────────────  │  Voice   │                               │
│  │  Player  │                   │  Socket  │                               │
│  └────┬─────┘                   └──────────┘                               │
│       │                                                                     │
│       ▼                                                                     │
│  ┌──────────┐                                                               │
│  │ Speaker  │                                                               │
│  └──────────┘                                                               │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 4.2 Frontend Voice Engine

```typescript
// /src/core/voice/VoiceEngine.ts

import LiveAudioStream from 'react-native-live-audio-stream';
import { AudioPlayer } from './AudioPlayer';
import { VoiceActivityDetector } from './VoiceActivityDetection';

interface VoiceEngineConfig {
  onTranscript: (text: string, isFinal: boolean) => void;
  onAudioLevel: (level: number) => void;
  onSpeechStart: () => void;
  onSpeechEnd: () => void;
  onAIAudioStart: () => void;
  onAIAudioEnd: () => void;
  onError: (error: Error) => void;
}

export class VoiceEngine {
  private ws: WebSocket | null = null;
  private audioPlayer: AudioPlayer;
  private vad: VoiceActivityDetector;
  private config: VoiceEngineConfig;

  private isListening = false;
  private isConnected = false;
  private audioQueue: ArrayBuffer[] = [];

  constructor(config: VoiceEngineConfig) {
    this.config = config;
    this.audioPlayer = new AudioPlayer();
    this.vad = new VoiceActivityDetector({
      onSpeechStart: this.handleSpeechStart.bind(this),
      onSpeechEnd: this.handleSpeechEnd.bind(this),
      silenceThreshold: 1500, // 1.5 seconds of silence = end of speech
    });
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const token = await getAuthToken();

      this.ws = new WebSocket(
        `wss://api.linguaai.com/v1/voice?token=${token}`
      );

      this.ws.binaryType = 'arraybuffer';

      this.ws.onopen = () => {
        this.isConnected = true;
        resolve();
      };

      this.ws.onmessage = (event) => {
        this.handleServerMessage(event.data);
      };

      this.ws.onerror = (error) => {
        this.config.onError(new Error('WebSocket error'));
        reject(error);
      };

      this.ws.onclose = () => {
        this.isConnected = false;
      };
    });
  }

  async startListening(): Promise<void> {
    if (this.isListening) return;

    // Initialize audio stream
    LiveAudioStream.init({
      sampleRate: 16000,
      channels: 1,
      bitsPerSample: 16,
      audioSource: 6, // VOICE_RECOGNITION
    });

    LiveAudioStream.start();
    this.isListening = true;

    // Process audio data
    LiveAudioStream.on('data', (base64: string) => {
      const audioData = this.base64ToArrayBuffer(base64);

      // Calculate audio level for visualization
      const level = this.calculateAudioLevel(audioData);
      this.config.onAudioLevel(level);

      // Feed to VAD
      this.vad.process(audioData, level);

      // Send to server if speaking
      if (this.vad.isSpeaking && this.isConnected) {
        this.sendAudioChunk(audioData);
      }
    });
  }

  stopListening(): void {
    if (!this.isListening) return;

    LiveAudioStream.stop();
    this.isListening = false;
  }

  async speak(text: string, voice: 'sofia' | 'marco'): Promise<void> {
    if (!this.isConnected) throw new Error('Not connected');

    // Request TTS from server
    this.ws!.send(JSON.stringify({
      type: 'tts_request',
      payload: { text, voice },
    }));

    // Audio chunks will arrive via WebSocket
    // They're queued and played by handleServerMessage

    return new Promise((resolve) => {
      this.audioPlayer.onComplete = resolve;
    });
  }

  private handleServerMessage(data: ArrayBuffer | string): void {
    if (typeof data === 'string') {
      // JSON message
      const message = JSON.parse(data);

      switch (message.type) {
        case 'transcript':
          this.config.onTranscript(
            message.payload.text,
            message.payload.isFinal
          );
          break;

        case 'response_start':
          this.config.onAIAudioStart();
          break;

        case 'response_end':
          this.config.onAIAudioEnd();
          break;

        case 'error':
          this.config.onError(new Error(message.payload.message));
          break;
      }
    } else {
      // Binary audio data
      this.audioQueue.push(data);
      this.playNextChunk();
    }
  }

  private async playNextChunk(): Promise<void> {
    if (this.audioQueue.length === 0) return;
    if (this.audioPlayer.isPlaying) return;

    const chunk = this.audioQueue.shift()!;
    await this.audioPlayer.playChunk(chunk);

    // Play next chunk if available
    this.playNextChunk();
  }

  private sendAudioChunk(data: ArrayBuffer): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    this.ws.send(data);
  }

  private handleSpeechStart(): void {
    this.config.onSpeechStart();
  }

  private handleSpeechEnd(): void {
    // Send end-of-speech signal
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'end_speech',
        payload: { reason: 'silence_detected' },
      }));
    }

    this.config.onSpeechEnd();
  }

  private calculateAudioLevel(buffer: ArrayBuffer): number {
    const samples = new Int16Array(buffer);
    let sum = 0;

    for (let i = 0; i < samples.length; i++) {
      sum += Math.abs(samples[i]);
    }

    const average = sum / samples.length;
    return Math.min(1, average / 32768); // Normalize to 0-1
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);

    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    return bytes.buffer;
  }

  disconnect(): void {
    this.stopListening();

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  cleanup(): void {
    this.disconnect();
    this.audioPlayer.cleanup();
  }
}
```

## 4.3 Backend Voice Pipeline

```typescript
// /backend/src/services/voice/VoicePipeline.ts

import { Deepgram } from '@deepgram/sdk';
import { ElevenLabsClient } from 'elevenlabs';

interface VoicePipelineConfig {
  userId: string;
  sessionId: string;
  language: string;
  voice: 'sofia' | 'marco';
  onTranscript: (text: string, isFinal: boolean) => void;
  onResponse: (text: string) => void;
  onAudioChunk: (chunk: Buffer) => void;
  onError: (error: Error) => void;
}

export class VoicePipeline {
  private deepgram: Deepgram;
  private elevenLabs: ElevenLabsClient;
  private conversationEngine: ConversationEngine;
  private sttConnection: any;
  private config: VoicePipelineConfig;

  private voiceIds = {
    sofia: 'EXAVITQu4vr4xnSDxMaL',  // ElevenLabs voice ID
    marco: 'VR6AewLTigWG4xSOukaG',
  };

  constructor(config: VoicePipelineConfig) {
    this.config = config;
    this.deepgram = new Deepgram(process.env.DEEPGRAM_API_KEY!);
    this.elevenLabs = new ElevenLabsClient({ apiKey: process.env.ELEVENLABS_API_KEY });
    this.conversationEngine = new ConversationEngine(config.userId, config.sessionId);
  }

  async initialize(): Promise<void> {
    // Initialize Deepgram live transcription
    this.sttConnection = this.deepgram.transcription.live({
      language: this.config.language,
      model: 'nova-2',
      smart_format: true,
      interim_results: true,
      utterance_end_ms: 1500,
      vad_events: true,
    });

    this.sttConnection.on('transcriptReceived', async (data: any) => {
      const transcript = data.channel.alternatives[0];

      if (transcript.transcript) {
        this.config.onTranscript(
          transcript.transcript,
          data.is_final
        );

        // Process final transcripts
        if (data.is_final && data.speech_final) {
          await this.processUserSpeech(transcript.transcript);
        }
      }
    });

    this.sttConnection.on('error', (error: Error) => {
      this.config.onError(error);
    });

    await this.conversationEngine.initialize();
  }

  async processAudioChunk(chunk: Buffer): Promise<void> {
    if (this.sttConnection) {
      this.sttConnection.send(chunk);
    }
  }

  async processUserSpeech(transcript: string): Promise<void> {
    try {
      // Get AI response
      const response = await this.conversationEngine.getResponse(transcript);

      this.config.onResponse(response.spokenResponse);

      // Generate TTS
      await this.generateSpeech(response.spokenResponse);

      // Store internal notes (errors, memories, etc.) for post-processing
      await this.storeInternalNotes(response.internalNotes);

    } catch (error) {
      this.config.onError(error as Error);
    }
  }

  async generateSpeech(text: string): Promise<void> {
    const voiceId = this.voiceIds[this.config.voice];

    const audioStream = await this.elevenLabs.textToSpeech.convertAsStream(
      voiceId,
      {
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.5,
        },
      }
    );

    // Stream audio chunks to client
    for await (const chunk of audioStream) {
      this.config.onAudioChunk(Buffer.from(chunk));
    }
  }

  private async storeInternalNotes(notes: InternalNotes): Promise<void> {
    // Store detected errors for feedback
    if (notes.detectedErrors.length > 0) {
      await this.conversationEngine.storeErrors(notes.detectedErrors);
    }

    // Store new memories
    if (notes.memoriesToStore.length > 0) {
      await this.conversationEngine.storeMemories(notes.memoriesToStore);
    }

    // Extract vocabulary
    if (notes.vocabularyUsed.length > 0) {
      await this.conversationEngine.storeVocabulary(notes.vocabularyUsed);
    }
  }

  async generateGreeting(): Promise<{ text: string; audio: Buffer }> {
    const greeting = await this.conversationEngine.getGreeting();

    const audioChunks: Buffer[] = [];
    const audioStream = await this.elevenLabs.textToSpeech.convertAsStream(
      this.voiceIds[this.config.voice],
      {
        text: greeting,
        model_id: 'eleven_multilingual_v2',
      }
    );

    for await (const chunk of audioStream) {
      audioChunks.push(Buffer.from(chunk));
    }

    return {
      text: greeting,
      audio: Buffer.concat(audioChunks),
    };
  }

  close(): void {
    if (this.sttConnection) {
      this.sttConnection.finish();
    }
  }
}
```

## 4.4 Latency Optimization

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        LATENCY OPTIMIZATION STRATEGIES                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  TARGET: < 1.5 seconds from user speech end → AI audio start               │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  1. STREAMING STT (Deepgram Nova-2)                                  │   │
│  │     • Real-time transcription as user speaks                        │   │
│  │     • Interim results for UI feedback                               │   │
│  │     • Final result ready immediately when speech ends               │   │
│  │     • Latency: ~100-200ms                                           │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  2. STREAMING LLM RESPONSE                                          │   │
│  │     • Use streaming API (Claude/GPT-4)                              │   │
│  │     • Start TTS generation as tokens arrive                         │   │
│  │     • Buffer first sentence before playing                          │   │
│  │     • Latency: ~300-500ms to first token                           │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  3. STREAMING TTS (ElevenLabs)                                      │   │
│  │     • Stream audio chunks as they're generated                      │   │
│  │     • Begin playback after first ~200ms of audio buffered          │   │
│  │     • Latency: ~200-400ms                                           │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  4. MEMORY RETRIEVAL OPTIMIZATION                                   │   │
│  │     • Pre-fetch relevant memories at session start                  │   │
│  │     • Cache user context in Redis                                   │   │
│  │     • Async memory updates (don't block response)                   │   │
│  │     • Latency: ~50-100ms (from cache)                              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  5. EDGE DEPLOYMENT                                                  │   │
│  │     • Deploy WebSocket handlers to edge (Cloudflare Workers)        │   │
│  │     • Reduce network round-trip                                     │   │
│  │     • Regional API endpoints                                        │   │
│  │     • Latency: -50-100ms improvement                                │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  TOTAL ESTIMATED LATENCY: 800ms - 1.2s                                     │
│  (Speech end → AI audio begins playing)                                    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

# PART 5: DATA MODELS SUMMARY

## 5.1 Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        ENTITY RELATIONSHIPS                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                           ┌─────────────┐                                   │
│                           │    User     │                                   │
│                           └──────┬──────┘                                   │
│                                  │                                          │
│         ┌───────────────┬────────┼────────┬───────────────┐                │
│         │               │        │        │               │                │
│         ▼               ▼        ▼        ▼               ▼                │
│  ┌─────────────┐ ┌──────────┐ ┌──────┐ ┌──────────┐ ┌──────────┐          │
│  │Preferences  │ │Languages │ │Memory│ │ Progress │ │Vocabulary│          │
│  │  (1:1)      │ │  (1:N)   │ │(1:N) │ │  (1:N)   │ │  (1:N)   │          │
│  └─────────────┘ └──────────┘ └──────┘ └────┬─────┘ └────┬─────┘          │
│                                             │            │                 │
│                                             │            │                 │
│                           ┌─────────────────┴────────────┘                 │
│                           │                                                │
│                           ▼                                                │
│                    ┌─────────────┐                                         │
│                    │   Session   │                                         │
│                    └──────┬──────┘                                         │
│                           │                                                │
│         ┌─────────────────┼─────────────────┐                              │
│         │                 │                 │                              │
│         ▼                 ▼                 ▼                              │
│  ┌─────────────┐   ┌──────────┐     ┌──────────┐                          │
│  │  Messages   │   │ Summary  │     │ Feedback │                          │
│  │    (1:N)    │   │  (1:1)   │     │  (1:N)   │                          │
│  └─────────────┘   └──────────┘     └──────────┘                          │
│                                                                            │
│                           ┌─────────────┐                                  │
│                           │  Scenario   │                                  │
│                           │ (Reference) │                                  │
│                           └─────────────┘                                  │
│                                                                            │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 5.2 Key Type Definitions

```typescript
// /src/types/models.ts

// ============ USER ============

interface User {
  id: string;
  email: string;
  name?: string;
  nativeLanguage: string;
  avatarUrl?: string;
  createdAt: Date;
}

interface UserPreferences {
  preferredVoice: 'sofia' | 'marco';
  playbackSpeed: number;          // 0.75 - 1.5
  correctionStyle: 'gentle' | 'balanced' | 'direct';
  sessionLength: number;          // minutes
  dailyGoal: number;              // sessions
  interfaceLanguage: 'native' | 'target' | 'mixed';
  showTranscript: boolean;
  reminderEnabled: boolean;
  reminderTime?: string;          // "09:00"
}

interface UserLanguage {
  id: string;
  languageCode: string;           // "es", "it", "pt"
  variant?: string;               // "latam", "brazil"
  isActive: boolean;
}

// ============ SESSION ============

interface Session {
  id: string;
  userId: string;
  languageCode: string;
  variant?: string;
  scenarioId?: string;
  startedAt: Date;
  endedAt?: Date;
  duration?: number;              // seconds
  status: 'active' | 'completed' | 'abandoned';
}

interface Message {
  id: string;
  sessionId: string;
  role: 'user' | 'ai';
  content: string;
  audioUrl?: string;
  timestamp: Date;
  grammarIssues?: GrammarIssue[];
  pronunciationScore?: number;
}

interface SessionSummary {
  id: string;
  sessionId: string;
  overallAssessment: string;      // Markdown
  topicsCovered: string[];
  fluencyScore?: number;
  accuracyScore?: number;
  complexityScore?: number;
  strengths: string[];
  growthAreas: string[];
}

interface SessionFeedback {
  id: string;
  sessionId: string;
  type: 'grammar' | 'pronunciation' | 'vocabulary';
  category: string;
  original: string;
  correction?: string;
  explanation: string;
  priority: number;
  acknowledged: boolean;
}

// ============ MEMORY ============

interface Memory {
  id: string;
  userId: string;
  type: 'fact' | 'preference' | 'event' | 'pattern';
  category: 'personal' | 'work' | 'learning' | 'interest';
  content: string;
  validFrom: Date;
  validUntil?: Date;
  sourceSessionId?: string;
  accessCount: number;
  lastAccessedAt?: Date;
}

// ============ PROGRESS ============

interface Progress {
  userId: string;
  languageCode: string;
  variant?: string;

  scenarioConfidence: Record<string, number>;  // { "restaurant": 80 }
  errorPatterns: Record<string, number>;       // { "past_tense": 12 }

  totalSessions: number;
  totalMinutes: number;
  longestSession: number;
  currentStreak: number;
  longestStreak: number;
  lastSessionAt?: Date;
}

interface VocabularyItem {
  id: string;
  userId: string;
  languageCode: string;
  term: string;
  translation?: string;
  context?: string;
  audioUrl?: string;

  // Spaced repetition
  nextReviewAt: Date;
  repetitionCount: number;
  easeFactor: number;
  interval: number;               // days
}

// ============ SCENARIO ============

interface Scenario {
  id: string;
  category: 'professional' | 'travel' | 'social' | 'exam';
  name: string;
  description: string;
  nameTranslations: Record<string, string>;
  descTranslations: Record<string, string>;
  systemPrompt: string;
  exampleDialogue?: string;
  vocabulary: string[];
  minConfidence: number;
  targetSkills: string[];
  isActive: boolean;
  sortOrder: number;
}

// ============ AI RESPONSE ============

interface AIResponse {
  spokenResponse: string;
  internalNotes: InternalNotes;
}

interface InternalNotes {
  detectedErrors: DetectedError[];
  vocabularyUsed: string[];
  memoriesToStore: MemoryToStore[];
  confidenceSignals: ConfidenceSignals;
}

interface DetectedError {
  type: 'grammar' | 'pronunciation' | 'vocabulary';
  original: string;
  correction: string;
  priority: number;
}

interface MemoryToStore {
  type: 'fact' | 'event' | 'preference';
  content: string;
}

interface ConfidenceSignals {
  hesitationLevel: 'low' | 'medium' | 'high';
  complexityUsed: 'low' | 'medium' | 'high';
  recoveryPhrasesUsed: boolean;
}
```

---

# DEPLOYMENT ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        PRODUCTION DEPLOYMENT                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         CDN (Cloudflare)                            │   │
│  │  • Static assets                                                    │   │
│  │  • API caching                                                      │   │
│  │  • DDoS protection                                                  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                   │                                         │
│                                   ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    API Gateway (Kong / AWS API GW)                  │   │
│  │  • Rate limiting                                                    │   │
│  │  • Authentication                                                   │   │
│  │  • Request routing                                                  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                   │                                         │
│              ┌────────────────────┼────────────────────┐                   │
│              │                    │                    │                   │
│              ▼                    ▼                    ▼                   │
│  ┌───────────────────┐ ┌───────────────────┐ ┌───────────────────┐        │
│  │   REST API        │ │  WebSocket        │ │   Workers         │        │
│  │   (Kubernetes)    │ │  (Kubernetes)     │ │   (BullMQ)        │        │
│  │                   │ │                   │ │                   │        │
│  │  • User service   │ │  • Voice pipe     │ │  • Summary gen    │        │
│  │  • Session svc    │ │  • Real-time STT  │ │  • Memory index   │        │
│  │  • Progress svc   │ │  • TTS streaming  │ │  • Analytics      │        │
│  └─────────┬─────────┘ └─────────┬─────────┘ └─────────┬─────────┘        │
│            │                     │                     │                   │
│            └──────────────┬──────┴──────────────┬──────┘                   │
│                           │                     │                          │
│              ┌────────────▼─────────┐  ┌───────▼────────┐                 │
│              │    PostgreSQL        │  │     Redis      │                 │
│              │    (Primary + Read)  │  │    (Cache)     │                 │
│              └──────────────────────┘  └────────────────┘                 │
│                           │                                                │
│              ┌────────────▼─────────┐                                     │
│              │      Pinecone        │                                     │
│              │   (Vector Store)     │                                     │
│              └──────────────────────┘                                     │
│                                                                            │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │                      EXTERNAL SERVICES                              │  │
│  │  • Deepgram (STT)                                                   │  │
│  │  • ElevenLabs (TTS)                                                 │  │
│  │  • Anthropic Claude / OpenAI (LLM)                                  │  │
│  │  • AWS S3 (Audio storage)                                           │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

# TECHNOLOGY DECISIONS SUMMARY

| Component | Choice | Rationale |
|-----------|--------|-----------|
| **Mobile Framework** | React Native CLI | Full native control, better audio handling than Expo |
| **State Management** | Zustand | Minimal boilerplate, persist middleware, TypeScript-first |
| **Audio Streaming** | react-native-live-audio-stream | Real-time access to microphone buffer |
| **Backend Framework** | Fastify (Node.js) | Fast, TypeScript-native, WebSocket support |
| **Database** | PostgreSQL + Prisma | Type-safe queries, migrations, reliable |
| **Vector DB** | Pinecone | Managed, scalable, good latency |
| **Cache** | Redis | Session state, user context caching |
| **Queue** | BullMQ | Reliable background jobs |
| **STT** | Deepgram Nova-2 | Best accuracy + latency, streaming support |
| **TTS** | ElevenLabs | Most natural voices, multilingual, streaming |
| **LLM** | Claude 3.5 Sonnet | Best instruction following, nuanced responses |
| **Hosting** | Kubernetes (GKE/EKS) | Scalable, WebSocket-friendly |

---

*Technical Architecture v1.0*
*LinguaAI*
