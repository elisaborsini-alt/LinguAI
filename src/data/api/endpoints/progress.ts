import type {
  GetProgressOverviewResponse,
  GetWeeklyProgressRequest,
  GetWeeklyProgressResponse,
  GetDailyStatsRequest,
  GetDailyStatsResponse,
} from '@appTypes/api';
import type {ErrorPattern} from '@appTypes/domain';

import {api} from '../client';

export const progressApi = {
  /**
   * Get overall progress overview
   */
  getOverview: (): Promise<GetProgressOverviewResponse> =>
    api.get<GetProgressOverviewResponse>('/progress/overview'),

  /**
   * Get weekly progress
   */
  getWeeklyProgress: (params?: GetWeeklyProgressRequest): Promise<GetWeeklyProgressResponse> =>
    api.get<GetWeeklyProgressResponse>('/progress/weekly', {params}),

  /**
   * Get daily stats for a date range
   */
  getDailyStats: (params: GetDailyStatsRequest): Promise<GetDailyStatsResponse> =>
    api.get<GetDailyStatsResponse>('/progress/daily', {params}),

  /**
   * Get error patterns
   */
  getErrorPatterns: (): Promise<{patterns: ErrorPattern[]}> =>
    api.get<{patterns: ErrorPattern[]}>('/progress/errors'),

  /**
   * Get vocabulary list
   */
  getVocabulary: (params?: {
    limit?: number;
    offset?: number;
  }): Promise<{vocabulary: string[]; total: number}> =>
    api.get('/progress/vocabulary', {params}),

  /**
   * Mark error pattern as corrected
   */
  markErrorCorrected: (patternId: string): Promise<void> =>
    api.post(`/progress/errors/${patternId}/corrected`),

  /**
   * Get retention-oriented progress summary
   */
  getSummary: (): Promise<ProgressSummaryResponse> =>
    api.get<ProgressSummaryResponse>('/progress/summary'),

  /**
   * Get momentum insight (reflective message about long-term improvement)
   */
  getMomentum: (): Promise<MomentumInsightResponse> =>
    api.get<MomentumInsightResponse>('/progress/momentum'),

  /**
   * Get time machine comparison (then vs now voice snapshots)
   */
  getTimeMachine: (): Promise<TimeMachineResponse> =>
    api.get<TimeMachineResponse>('/progress/time-machine'),
};

export interface ProgressSummary {
  hasEnoughData: boolean;
  trend?: 'improving' | 'stable' | 'declining';
  delta?: number;
  topStrength?: string;
  topWeakness?: string;
  suggestedFocus?: string;
  sessionsCompleted?: number;
  lastSessionDate?: string;
}

export interface ProgressSummaryResponse {
  success: boolean;
  data: ProgressSummary;
}

export interface MomentumInsight {
  type: 'resolved_weakness' | 'new_strength' | 'accuracy_gain' | 'consistency';
  message: string;
}

export interface MomentumInsightResponse {
  success: boolean;
  data: MomentumInsight | null;
}

export interface TimeMachineSnapshot {
  audioUrl: string;
  transcript: string | null;
  cefrLevel: string;
  capturedAt: string;
  label: string;
}

export interface TimeMachineResult {
  early: TimeMachineSnapshot;
  recent: TimeMachineSnapshot;
  message: string;
  weeksBetween: number;
}

export interface TimeMachineResponse {
  success: boolean;
  data: TimeMachineResult | null;
}

export default progressApi;
