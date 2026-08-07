import { api } from '../../lib/api';
import type { ChatMessage, Conversation, Poll } from './types';

export interface MessageSearchResult {
  id: string;
  text?: string;
  sender_name: string;
  sent_at: string;
}

export interface Story {
  id: string;
  conversation_id: string;
  author_id: string;
  author_name: string;
  media_url?: string;
  text?: string;
  created_at: string;
  expires_at: string;
}

// Aligné sur ProposalOut (backend/app/schemas/proposal.py) — le type
// précédent inventait des champs (`votes`, `status: 'open'`) qui n'existent
// pas côté serveur et faisait planter ProposalsModal au premier rendu.
export interface GroupProposal {
  id: string;
  conversation_id: string;
  type: string;
  proposed_by: string;
  proposer_name: string;
  payload?: { description?: string };
  votes_yes: string[];
  votes_no: string[];
  eligible_voters: string[];
  status: 'pending' | 'approved' | 'rejected';
  quorum_pct: number;
  yes_count: number;
  no_count: number;
  total_eligible: number;
  expires_at: string;
  created_at: string;
  resolved_at?: string;
}

export const chatApi = {
  listConversations: () => api.get<Conversation[]>('/chat/conversations'),

  createDirect: (otherUserId: string) => api.post<Conversation>('/chat/conversations/direct', { other_user_id: otherUserId }),

  listMessages: (conversationId: string, before?: string) =>
    api.get<ChatMessage[]>(`/chat/${conversationId}/messages${before ? `?before=${encodeURIComponent(before)}` : ''}`),

  searchMessages: (conversationId: string, q: string) =>
    api.get<MessageSearchResult[]>(`/chat/${conversationId}/messages/search?q=${encodeURIComponent(q)}`),

  sendMessage: (
    conversationId: string,
    body: { type: string; text?: string; media_url?: string; poll?: Poll; mentions?: string[] },
  ) => api.post<ChatMessage>(`/chat/${conversationId}/messages`, body),

  uploadMedia: (file: File, mediaType: string) => {
    const form = new FormData();
    form.append('file', file);
    return api.upload<{ url: string }>(`/chat/upload?media_type=${encodeURIComponent(mediaType)}`, 'POST', form);
  },

  markRead: (conversationId: string) => api.put<void>(`/chat/${conversationId}/read`),

  deleteMessage: (conversationId: string, messageId: string) =>
    api.delete<void>(`/chat/${conversationId}/messages/${messageId}`),

  // Le backend renvoie le message mis à jour (mêmes réactions que la trame WS
  // reaction_updated) — utile pour patcher l'état local immédiatement au lieu
  // d'attendre le WS, qui ne concerne de toute façon que les AUTRES membres.
  react: (conversationId: string, messageId: string, emoji: string) =>
    api.post<ChatMessage>(`/chat/${conversationId}/messages/${messageId}/react`, { emoji }),

  voteMessage: (conversationId: string, messageId: string, optionIndex: number) =>
    api.post<ChatMessage>(`/chat/${conversationId}/messages/${messageId}/vote`, { option_index: optionIndex }),

  pin: (conversationId: string, messageId: string) =>
    api.post<Conversation>(`/chat/${conversationId}/pin`, { message_id: messageId }),

  unpin: (conversationId: string) => api.delete<Conversation>(`/chat/${conversationId}/pin`),

  closeDispute: (conversationId: string) => api.post<void>(`/chat/${conversationId}/dispute/close`),

  listStories: (conversationId: string) => api.get<Story[]>(`/chat/${conversationId}/stories`),

  createStory: (conversationId: string, body: { media_url?: string; text?: string }) =>
    api.post<Story>(`/chat/${conversationId}/stories`, body),

  listProposals: (conversationId: string, status?: string) =>
    api.get<GroupProposal[]>(`/chat/${conversationId}/proposals${status ? `?status=${status}` : ''}`),

  createProposal: (conversationId: string, type: string, payload: unknown) =>
    api.post<GroupProposal>(`/chat/${conversationId}/proposals`, { type, payload }),

  voteProposal: (conversationId: string, proposalId: string, yes: boolean) =>
    api.post<GroupProposal>(`/chat/${conversationId}/proposals/${proposalId}/vote`, { yes }),
};
