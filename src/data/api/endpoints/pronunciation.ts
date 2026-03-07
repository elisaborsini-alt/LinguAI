import {apiClient} from '../client';
import type {
  PronunciationPhrase,
  ReferenceAudio,
  PronunciationAnalysis,
  PronunciationFeedback,
  PronunciationAttempt,
  PhraseCategory,
  PhrasesListResponse,
  PhraseDetailResponse,
  AnalyzeRecordingRequest,
  AnalyzeRecordingResponse,
  PracticeHistoryResponse,
} from '@appTypes/pronunciation';

const PRONUNCIATION_BASE = '/api/pronunciation';

export const pronunciationApi = {
  /**
   * Get all phrase categories
   */
  getCategories: async (): Promise<PhraseCategory[]> => {
    const response = await apiClient.get<{categories: PhraseCategory[]}>(
      `${PRONUNCIATION_BASE}/categories`,
    );
    return response.data.categories;
  },

  /**
   * Get phrases with optional filters
   */
  getPhrases: async (params?: {
    categoryId?: string;
    difficulty?: string;
    languageCode?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<PhrasesListResponse> => {
    const queryParams = new URLSearchParams();
    if (params?.categoryId) queryParams.set('categoryId', params.categoryId);
    if (params?.difficulty) queryParams.set('difficulty', params.difficulty);
    if (params?.languageCode) queryParams.set('languageCode', params.languageCode);
    if (params?.search) queryParams.set('search', params.search);
    if (params?.limit) queryParams.set('limit', params.limit.toString());
    if (params?.offset) queryParams.set('offset', params.offset.toString());

    const query = queryParams.toString();
    const url = `${PRONUNCIATION_BASE}/phrases${query ? `?${query}` : ''}`;

    const response = await apiClient.get<PhrasesListResponse>(url);
    return response.data;
  },

  /**
   * Get single phrase with reference audio
   */
  getPhrase: async (phraseId: string): Promise<PhraseDetailResponse> => {
    const response = await apiClient.get<PhraseDetailResponse>(
      `${PRONUNCIATION_BASE}/phrases/${phraseId}`,
    );
    return response.data;
  },

  /**
   * Create custom phrase
   */
  createCustomPhrase: async (data: {
    text: string;
    languageCode: string;
    languageVariant?: string;
    categoryId?: string;
  }): Promise<PronunciationPhrase> => {
    const response = await apiClient.post<{phrase: PronunciationPhrase}>(
      `${PRONUNCIATION_BASE}/phrases/custom`,
      data,
    );
    return response.data.phrase;
  },

  /**
   * Submit recording for analysis
   */
  analyzeRecording: async (
    request: AnalyzeRecordingRequest,
  ): Promise<AnalyzeRecordingResponse> => {
    // Create form data for file upload
    const formData = new FormData();
    formData.append('phraseId', request.phraseId);
    if (request.referenceAudioId) {
      formData.append('referenceAudioId', request.referenceAudioId);
    }

    // Append audio file
    const audioFile = {
      uri: request.audioUri,
      type: 'audio/wav',
      name: 'recording.wav',
    };
    formData.append('audio', audioFile as unknown as Blob);

    const response = await apiClient.post<AnalyzeRecordingResponse>(
      `${PRONUNCIATION_BASE}/analyze`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      },
    );
    return response.data;
  },

  /**
   * Get practice history
   */
  getHistory: async (params?: {
    phraseId?: string;
    limit?: number;
    offset?: number;
  }): Promise<PracticeHistoryResponse> => {
    const queryParams = new URLSearchParams();
    if (params?.phraseId) queryParams.set('phraseId', params.phraseId);
    if (params?.limit) queryParams.set('limit', params.limit.toString());
    if (params?.offset) queryParams.set('offset', params.offset.toString());

    const query = queryParams.toString();
    const url = `${PRONUNCIATION_BASE}/history${query ? `?${query}` : ''}`;

    const response = await apiClient.get<PracticeHistoryResponse>(url);
    return response.data;
  },

  /**
   * Get single attempt details
   */
  getAttempt: async (attemptId: string): Promise<PronunciationAttempt> => {
    const response = await apiClient.get<{attempt: PronunciationAttempt}>(
      `${PRONUNCIATION_BASE}/attempts/${attemptId}`,
    );
    return response.data.attempt;
  },

  /**
   * Get best scores for multiple phrases
   */
  getBestScores: async (phraseIds: string[]): Promise<Record<string, number>> => {
    const response = await apiClient.post<{scores: Record<string, number>}>(
      `${PRONUNCIATION_BASE}/scores/best`,
      {phraseIds},
    );
    return response.data.scores;
  },

  /**
   * Get reference audio for a phrase
   * Falls back to TTS-generated audio if no pre-recorded reference exists
   */
  getReferenceAudio: async (
    phraseId: string,
    options?: {
      variant?: string;
      speed?: number;
    },
  ): Promise<ReferenceAudio> => {
    const queryParams = new URLSearchParams();
    if (options?.variant) queryParams.set('variant', options.variant);
    if (options?.speed) queryParams.set('speed', options.speed.toString());

    const query = queryParams.toString();
    const url = `${PRONUNCIATION_BASE}/phrases/${phraseId}/reference${query ? `?${query}` : ''}`;

    const response = await apiClient.get<{referenceAudio: ReferenceAudio}>(url);
    return response.data.referenceAudio;
  },

  /**
   * Delete a custom phrase
   */
  deleteCustomPhrase: async (phraseId: string): Promise<void> => {
    await apiClient.delete(`${PRONUNCIATION_BASE}/phrases/custom/${phraseId}`);
  },

  /**
   * Get statistics for pronunciation practice
   */
  getStats: async (): Promise<{
    totalAttempts: number;
    averageScore: number;
    phrasesAttempted: number;
    streakDays: number;
    improvementRate: number;
    weakAreas: string[];
    strongAreas: string[];
  }> => {
    const response = await apiClient.get<{
      totalAttempts: number;
      averageScore: number;
      phrasesAttempted: number;
      streakDays: number;
      improvementRate: number;
      weakAreas: string[];
      strongAreas: string[];
    }>(`${PRONUNCIATION_BASE}/stats`);
    return response.data;
  },
};

export default pronunciationApi;
