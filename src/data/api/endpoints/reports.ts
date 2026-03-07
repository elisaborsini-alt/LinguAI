import {api} from '../client';

export interface SessionReport {
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
      level: string;
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
  createdAt: string;
}

export interface ReportSummary {
  id: string;
  conversationId: string;
  summary: string;
  overallScore: number;
  grammarScore: number;
  vocabularyScore: number;
  fluencyScore: number;
  mistakeCount: number;
  newWordsCount: number;
  conversationGoal?: string;
  conversationMode?: string;
  conversationDate?: string;
  createdAt: string;
}

export interface ReportStats {
  totalReports: number;
  averageScore: number;
  averageGrammar: number;
  averageVocabulary: number;
  averageFluency: number;
  totalMistakes: number;
  totalNewWords: number;
  trend: Array<{
    date: string;
    overallScore: number;
    grammarScore: number;
    vocabularyScore: number;
    fluencyScore: number;
  }>;
}

export interface ListReportsResponse {
  reports: ReportSummary[];
  total: number;
  limit: number;
  offset: number;
}

export const reportsApi = {
  /**
   * Generate a report for a completed conversation
   */
  generate: (conversationId: string): Promise<SessionReport> =>
    api.post<SessionReport>(`/reports/generate/${conversationId}`),

  /**
   * Get a specific report
   */
  getById: (reportId: string): Promise<SessionReport> =>
    api.get<SessionReport>(`/reports/${reportId}`),

  /**
   * List all reports
   */
  list: (params?: {limit?: number; offset?: number}): Promise<ListReportsResponse> =>
    api.get<ListReportsResponse>('/reports', {params}),

  /**
   * Get aggregated report statistics
   */
  getStats: (period?: number): Promise<ReportStats> =>
    api.get<ReportStats>('/reports/stats/overview', {params: {period}}),
};

export default reportsApi;
