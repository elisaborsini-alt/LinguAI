import {api} from '../client';
import type {
  GetMemoryResponse,
  UpdateMemoryRequest,
  ClearMemoryRequest,
} from '@appTypes/api';

export const memoryApi = {
  /**
   * Get user's memory context
   */
  getMemory: (): Promise<GetMemoryResponse> =>
    api.get<GetMemoryResponse>('/memory'),

  /**
   * Update memory facts and preferences
   */
  updateMemory: (data: UpdateMemoryRequest): Promise<GetMemoryResponse> =>
    api.patch<GetMemoryResponse>('/memory', data),

  /**
   * Clear specific parts of memory
   */
  clearMemory: (data: ClearMemoryRequest): Promise<{message: string}> =>
    api.post<{message: string}>('/memory/clear', data),

  /**
   * Get memory summary for injection into prompts
   */
  getMemorySummary: (): Promise<{summary: string}> =>
    api.get<{summary: string}>('/memory/summary'),
};

export default memoryApi;
