import {api} from '../client';

export interface PlacementStartRequest {
  languageCode: string;
  languageVariant: string;
}

export interface PlacementStartResponse {
  success: boolean;
  data: {
    sessionId: string;
    message: string;
    turn: number;
    totalTurns: number;
  };
}

export interface PlacementRespondRequest {
  message: string;
}

export interface PlacementRespondResponse {
  success: boolean;
  data: {
    message: string;
    turn: number;
    totalTurns: number;
    isComplete: boolean;
  };
}

export interface PlacementStatusResponse {
  success: boolean;
  data: {
    hasActiveSession: boolean;
    hasCompletedPlacement: boolean;
    currentTurn?: number;
    result?: {
      grammarLevel: string;
      vocabularyLevel: string;
      fluencyLevel: string;
      overallLevel: string;
      confidence: number;
      turns: number;
      durationSeconds: number;
    };
  };
}

export const placementApi = {
  start: (data: PlacementStartRequest): Promise<PlacementStartResponse> =>
    api.post<PlacementStartResponse>('/placement/start', data),

  respond: (data: PlacementRespondRequest): Promise<PlacementRespondResponse> =>
    api.post<PlacementRespondResponse>('/placement/respond', data),

  getStatus: (): Promise<PlacementStatusResponse> =>
    api.get<PlacementStatusResponse>('/placement/status'),
};
