import type {
  Conversation,
  Message,
  ConversationMode,
  LearningGoal,
  ScenarioContext,
  DetectedError,
  ConversationMetrics,
} from '@appTypes/domain';
import {create} from 'zustand';
import {immer} from 'zustand/middleware/immer';


interface ConversationState {
  // Current conversation
  currentConversation: Conversation | null;
  messages: Message[];
  isLoading: boolean;
  isStreaming: boolean;
  streamingContent: string;

  // Pending corrections (shown after AI response)
  pendingCorrections: DetectedError[];

  // Conversation list
  conversations: Conversation[];
  conversationsLoading: boolean;

  // Actions
  startConversation: (
    mode: ConversationMode,
    goal: LearningGoal,
    scenario?: ScenarioContext,
  ) => void;
  setCurrentConversation: (conversation: Conversation | null) => void;
  endConversation: () => void;

  addMessage: (message: Message) => void;
  updateMessage: (messageId: string, updates: Partial<Message>) => void;
  setMessages: (messages: Message[]) => void;
  clearMessages: () => void;

  setLoading: (loading: boolean) => void;
  setStreaming: (streaming: boolean) => void;
  appendStreamingContent: (content: string) => void;
  clearStreamingContent: () => void;

  setPendingCorrections: (corrections: DetectedError[]) => void;
  clearPendingCorrections: () => void;

  updateMetrics: (updates: Partial<ConversationMetrics>) => void;

  setConversations: (conversations: Conversation[]) => void;
  setConversationsLoading: (loading: boolean) => void;
}

export const useConversationStore = create<ConversationState>()(
  immer((set, _get) => ({
    // Initial state
    currentConversation: null,
    messages: [],
    isLoading: false,
    isStreaming: false,
    streamingContent: '',
    pendingCorrections: [],
    conversations: [],
    conversationsLoading: false,

    // Actions
    startConversation: (mode, goal, scenario) =>
      set((state) => {
        state.currentConversation = {
          id: `conv_${Date.now()}`, // Temporary ID, replaced by server
          userId: '', // Set by server
          mode,
          goal,
          language: {code: 'en', variant: 'US'}, // Will be set from user profile
          scenario,
          startedAt: new Date(),
          metrics: {
            totalMessages: 0,
            userSpeakingTimeSeconds: 0,
            wordsSpoken: 0,
            uniqueWords: 0,
            errorsDetected: 0,
            errorsCorrected: 0,
            averageResponseTimeMs: 0,
          },
        };
        state.messages = [];
        state.pendingCorrections = [];
      }),

    setCurrentConversation: (conversation) =>
      set((state) => {
        state.currentConversation = conversation;
      }),

    endConversation: () =>
      set((state) => {
        if (state.currentConversation) {
          state.currentConversation.endedAt = new Date();
        }
      }),

    addMessage: (message) =>
      set((state) => {
        state.messages.push(message);
        if (state.currentConversation) {
          state.currentConversation.metrics.totalMessages += 1;
        }
      }),

    updateMessage: (messageId, updates) =>
      set((state) => {
        const index = state.messages.findIndex((m) => m.id === messageId);
        if (index !== -1) {
          state.messages[index] = {...state.messages[index], ...updates};
        }
      }),

    setMessages: (messages) =>
      set((state) => {
        state.messages = messages;
      }),

    clearMessages: () =>
      set((state) => {
        state.messages = [];
      }),

    setLoading: (loading) =>
      set((state) => {
        state.isLoading = loading;
      }),

    setStreaming: (streaming) =>
      set((state) => {
        state.isStreaming = streaming;
      }),

    appendStreamingContent: (content) =>
      set((state) => {
        state.streamingContent += content;
      }),

    clearStreamingContent: () =>
      set((state) => {
        state.streamingContent = '';
      }),

    setPendingCorrections: (corrections) =>
      set((state) => {
        state.pendingCorrections = corrections;
      }),

    clearPendingCorrections: () =>
      set((state) => {
        state.pendingCorrections = [];
      }),

    updateMetrics: (updates) =>
      set((state) => {
        if (state.currentConversation) {
          state.currentConversation.metrics = {
            ...state.currentConversation.metrics,
            ...updates,
          };
        }
      }),

    setConversations: (conversations) =>
      set((state) => {
        state.conversations = conversations;
      }),

    setConversationsLoading: (loading) =>
      set((state) => {
        state.conversationsLoading = loading;
      }),
  })),
);

// Selectors
export const selectCurrentConversation = (state: ConversationState) =>
  state.currentConversation;
export const selectMessages = (state: ConversationState) => state.messages;
export const selectIsLoading = (state: ConversationState) => state.isLoading;
export const selectIsStreaming = (state: ConversationState) => state.isStreaming;
export const selectStreamingContent = (state: ConversationState) =>
  state.streamingContent;
export const selectPendingCorrections = (state: ConversationState) =>
  state.pendingCorrections;
export const selectConversations = (state: ConversationState) => state.conversations;
