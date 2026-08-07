import { api } from '../../lib/api';
import type { Relation, RelationUser, Suggestion } from './types';

export const relationsApi = {
  search: (q: string) => api.get<RelationUser[]>(`/relations/users/search?q=${encodeURIComponent(q)}`),

  // Le web n'a pas accès au carnet de contacts du téléphone comme l'app
  // mobile — on appelle sans numéros : le backend renvoie quand même les
  // "amis de mes amis", juste sans le volet "contacts en commun".
  suggestions: () => api.post<Suggestion[]>('/relations/suggestions', { phones: [] }),

  send: (toUserId: string, type: 'friend' | 'association' = 'friend') =>
    api.post<Relation>('/relations', { to_user_id: toUserId, type }),

  received: () => api.get<Relation[]>('/relations/received'),

  sent: () => api.get<Relation[]>('/relations/sent'),

  list: () => api.get<Relation[]>('/relations'),

  review: (relationId: string, action: 'accept' | 'reject') =>
    api.patch<Relation>(`/relations/${relationId}`, { action }),

  remove: (relationId: string) => api.delete(`/relations/${relationId}`),
};
