import { api } from '../../lib/api';
import type { FeedComment, FeedFilters, FeedPost, JoinRequest } from './types';

const PAGE_SIZE = 20;

export interface FeedPage {
  posts: FeedPost[];
  page: number;
  hasMore: boolean;
}

export async function fetchFeedPage(page: number, filters: FeedFilters): Promise<FeedPage> {
  const params = new URLSearchParams();
  if (filters.type) params.set('type', filters.type);
  if (filters.tontine_type) params.set('tontine_type', filters.tontine_type);
  if (filters.min_amount !== undefined) params.set('min_amount', String(filters.min_amount));
  if (filters.max_amount !== undefined) params.set('max_amount', String(filters.max_amount));
  params.set('page', String(page));
  params.set('page_size', String(PAGE_SIZE));

  const posts = await api.get<FeedPost[]>(`/feed?${params.toString()}`);
  return { posts, page, hasMore: posts.length === PAGE_SIZE };
}

export interface FeedPostInput {
  type: 'seeking_members' | 'seeking_tontine';
  title: string;
  description: string;
  tontine_type?: string;
  amount?: number;
  frequency?: string;
  slots_total?: number;
  media_urls?: string[];
  media_type?: string;
}

export const feedApi = {
  get: (postId: string) => api.get<FeedPost>(`/feed/${postId}`),

  create: (body: FeedPostInput) => api.post<FeedPost>('/feed', body),

  update: (postId: string, body: Partial<FeedPostInput>) => api.patch<FeedPost>(`/feed/${postId}`, body),

  delete: (postId: string) => api.delete<void>(`/feed/${postId}`),

  uploadMedia: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.upload<{ url: string; media_type: string }>('/feed/upload-media', 'POST', form);
  },

  toggleLike: (postId: string) => api.post<FeedPost>(`/feed/${postId}/like`),

  requestToJoin: (postId: string, message?: string) =>
    api.post<JoinRequest>(`/feed/${postId}/request`, { message }),

  report: (postId: string, reason: string, details?: string) =>
    api.post<void>(`/feed/${postId}/report`, { reason, details }),

  listComments: (postId: string) => api.get<FeedComment[]>(`/feed/${postId}/comments?page=1&page_size=100`),

  addComment: (postId: string, text: string, parentCommentId?: string) =>
    api.post<FeedComment>(`/feed/${postId}/comments`, { text, parent_comment_id: parentCommentId }),

  deleteComment: (postId: string, commentId: string) => api.delete<void>(`/feed/${postId}/comments/${commentId}`),

  myRequests: (status?: string) =>
    api.get<JoinRequest[]>(`/feed/my-requests${status ? `?status=${status}` : ''}`),

  // Demandes reçues sur une annonce dont l'utilisateur courant est l'auteur.
  listRequests: (postId: string, status?: string) =>
    api.get<JoinRequest[]>(`/feed/${postId}/requests${status ? `?status=${status}` : ''}`),

  reviewRequest: (postId: string, requestId: string, accepted: boolean) =>
    api.patch<JoinRequest>(`/feed/${postId}/requests/${requestId}`, { accepted }),
};
