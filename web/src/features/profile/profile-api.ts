import { api } from '../../lib/api';
import type { UserOut } from '../auth/types';
import type { UserPublicProfile } from './score-types';

export const profileApi = {
  getPublicProfile: (userId: string) => api.get<UserPublicProfile>(`/users/${userId}/profile`),

  rate: (userId: string, score: number, comment?: string) =>
    api.post(`/users/${userId}/rate`, { score, comment }),

  report: (userId: string, reason: string, detail?: string) =>
    api.post<void>(`/users/${userId}/report`, { reason, detail }),

  reactivate: (userId: string) => api.post<void>(`/users/${userId}/reactivate`),

  myReferral: () =>
    api.get<{ referral_code: string; referral_rewards: number; referral_count: number; filleuls: { name: string; joined_at: string }[] }>(
      '/users/me/referral',
    ),

  updateProfile: (body: { prenom: string; nom: string; ville: string; sexe: string; email?: string }) =>
    api.post<UserOut>('/auth/complete-profile', body),

  uploadAvatar: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.upload<{ avatar_url: string }>('/auth/avatar', 'PUT', form);
  },
};
