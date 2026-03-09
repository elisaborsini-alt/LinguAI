import type {EndConversationResponse, SessionReportData} from '@appTypes/api';
import type {
  Conversation,
  ConversationMode,
  LearningGoal,
  ScenarioContext,
  Message,
} from '@appTypes/domain';
import type {EmotionSignals, EmotionalState} from '@core/emotion';
import {api} from '@data/api/client';
import {useConversationStore} from '@state/stores/conversationStore';
import {useProgressStore} from '@state/stores/progressStore';
import {useCallback} from 'react';


export interface EmotionContext {
  emotionSignals?: Partial<EmotionSignals>;
  currentEmotion?: EmotionalState;
  emotionConfidence?: number;
}

interface UseConversationReturn {
  // State
  currentConversation: Conversation | null;
  messages: Message[];
  isLoading: boolean;
  isStreaming: boolean;
  streamingContent: string;

  // Actions
  startConversation: (
    mode: ConversationMode,
    goal: LearningGoal,
    scenario?: ScenarioContext,
  ) => Promise<void>;
  sendMessage: (content: string, emotionContext?: EmotionContext) => Promise<void>;
  endConversation: () => Promise<SessionReportData | null>;
}

export const useConversation = (): UseConversationReturn => {
  const {
    currentConversation,
    messages,
    isLoading,
    isStreaming,
    streamingContent,
    startConversation: storeStartConversation,
    addMessage,
    setLoading,
    setStreaming,
    clearStreamingContent,
    endConversation: storeEndConversation,
    setPendingCorrections,
  } = useConversationStore();

  const {updateStreak, updateTodayStats} = useProgressStore();

  // --------------------------------------------------------------------------
  // Start conversation — calls the real API
  // --------------------------------------------------------------------------
  const startConversation = useCallback(
    async (mode: ConversationMode, goal: LearningGoal, scenario?: ScenarioContext) => {
      setLoading(true);
      try {
        // Initialize local store (creates a temporary id)
        storeStartConversation(mode, goal, scenario);

        // Create conversation on the server
        const response = await api.post<{
          data: {conversationId: string; greeting: string; mode: string; goal: string};
        }>(
          '/conversations',
          {mode, goal, scenarioId: scenario?.id},
        );

        // Add server greeting to the local message list
        const greeting: Message = {
          id: `msg_${Date.now()}`,
          conversationId: response.data.conversationId,
          role: 'assistant',
          content: response.data.greeting || 'Hello! Ready to practice?',
          timestamp: new Date(),
        };
        addMessage(greeting);

        updateStreak();
      } catch (error) {
        console.error('Failed to start conversation:', error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [storeStartConversation, addMessage, setLoading, updateStreak],
  );

  // --------------------------------------------------------------------------
  // Send message — calls the real API
  // --------------------------------------------------------------------------
  const sendMessage = useCallback(
    async (content: string, emotionContext?: EmotionContext) => {
      if (!currentConversation) {
        throw new Error('No active conversation');
      }

      setLoading(true);

      // Add user message immediately
      const userMessage: Message = {
        id: `msg_${Date.now()}`,
        conversationId: currentConversation.id,
        role: 'user',
        content,
        timestamp: new Date(),
        emotionDetected: emotionContext?.currentEmotion,
        emotionConfidence: emotionContext?.emotionConfidence,
      };
      addMessage(userMessage);

      try {
        setStreaming(true);
        clearStreamingContent();

        const response = await api.post<{
          data: {response: string; analysis?: any; corrections?: any[]; levelAssessment?: any};
        }>(
          `/conversations/${currentConversation.id}/messages`,
          {content, message: content},
        );

        const aiData = response.data;

        // Add AI response
        const assistantMessage: Message = {
          id: `msg_${Date.now() + 1}`,
          conversationId: currentConversation.id,
          role: 'assistant',
          content: aiData.response,
          analysis: aiData.analysis,
          corrections: aiData.corrections,
          timestamp: new Date(),
        };
        addMessage(assistantMessage);

        // Set corrections for display
        if (aiData.corrections && aiData.corrections.length > 0) {
          setPendingCorrections(aiData.corrections);
        }

        // Update daily stats
        const wordCount = content.split(/\s+/).length;
        updateTodayStats({
          messagesCount: messages.length + 2,
          wordsSpoken: wordCount,
        });
      } catch (error) {
        console.error('Failed to send message:', error);
        throw error;
      } finally {
        setLoading(false);
        setStreaming(false);
      }
    },
    [
      currentConversation,
      addMessage,
      setLoading,
      setStreaming,
      clearStreamingContent,
      setPendingCorrections,
      updateTodayStats,
      messages.length,
    ],
  );

  // --------------------------------------------------------------------------
  // End conversation — calls the real API
  // --------------------------------------------------------------------------
  const endConversation = useCallback(async (): Promise<SessionReportData | null> => {
    if (!currentConversation) {return null;}

    try {
      const response = await api.post<{data: EndConversationResponse}>(
        `/conversations/${currentConversation.id}/end`,
        {},
      );

      storeEndConversation();

      // Map backend report shape to frontend SessionReportData
      const report = response.data?.report;
      if (!report) {return null;}

      return {
        summary: report.summary,
        duration: report.duration,
        scores: {
          overall: report.performance.overallScore,
          fluency: report.performance.fluencyScore,
          accuracy: report.performance.grammarScore,
          vocabulary: report.performance.vocabularyScore,
        },
        strengths: report.strengths,
        areasToImprove: report.areasToImprove,
        mistakes: report.mistakes,
        newVocabulary: (report.vocabulary?.newWords || []).map(w => ({
          word: w.word,
          translation: w.translation,
          context: w.context,
          difficulty: w.level,
        })),
        suggestions: report.recommendations?.map(r => r.suggestion) || [],
        nextSteps: report.nextSteps,
        achievements: report.achievements,
      };
    } catch (error) {
      console.error('Failed to end conversation:', error);
      storeEndConversation();
      return null;
    }
  }, [currentConversation, storeEndConversation]);

  return {
    currentConversation,
    messages,
    isLoading,
    isStreaming,
    streamingContent,
    startConversation,
    sendMessage,
    endConversation,
  };
};

export default useConversation;
