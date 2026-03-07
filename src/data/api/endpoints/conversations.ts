import {api} from '../client';
import type {
  CreateConversationRequest,
  CreateConversationResponse,
  SendMessageRequest,
  SendMessageResponse,
  EndConversationRequest,
  EndConversationResponse,
  GetConversationHistoryRequest,
  GetConversationHistoryResponse,
  ListConversationsRequest,
  ListConversationsResponse,
} from '@appTypes/api';
import type {Conversation} from '@appTypes/domain';

export const conversationsApi = {
  /**
   * Create a new conversation
   */
  create: (data: CreateConversationRequest): Promise<CreateConversationResponse> =>
    api.post<CreateConversationResponse>('/conversations', data),

  /**
   * Send a message in a conversation
   */
  sendMessage: (data: SendMessageRequest): Promise<SendMessageResponse> =>
    api.post<SendMessageResponse>(`/conversations/${data.conversationId}/messages`, {
      content: data.content,
      audioUrl: data.audioUrl,
    }),

  /**
   * End a conversation and get summary
   */
  end: (conversationId: string): Promise<EndConversationResponse> =>
    api.post<EndConversationResponse>(`/conversations/${conversationId}/end`),

  /**
   * Get conversation by ID
   */
  getById: (conversationId: string): Promise<Conversation> =>
    api.get<Conversation>(`/conversations/${conversationId}`),

  /**
   * Get message history for a conversation
   */
  getHistory: (params: GetConversationHistoryRequest): Promise<GetConversationHistoryResponse> =>
    api.get<GetConversationHistoryResponse>(
      `/conversations/${params.conversationId}/messages`,
      {
        params: {
          limit: params.limit,
          offset: params.offset,
        },
      },
    ),

  /**
   * List all conversations
   */
  list: (params?: ListConversationsRequest): Promise<ListConversationsResponse> =>
    api.get<ListConversationsResponse>('/conversations', {params}),

  /**
   * Delete a conversation
   */
  delete: (conversationId: string): Promise<void> =>
    api.delete(`/conversations/${conversationId}`),
};

export default conversationsApi;
