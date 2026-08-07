import { api } from '../../lib/api';
import type { MyTontineListItem, PenaltyResult, TontineDetail } from './types';

export const tontinesApi = {
  list: () => api.get<MyTontineListItem[]>('/participant/tontines'),

  detail: (ownerId: string, localId: string) =>
    api.get<TontineDetail>(`/participant/tontines/${ownerId}/${localId}`),

  penalty: (ownerId: string, localId: string, memberLocalId: string, dueDate: string, amount: number) =>
    api.get<PenaltyResult>(
      `/participant/tontines/${ownerId}/${localId}/penalty?member_local_id=${encodeURIComponent(memberLocalId)}&due_date=${encodeURIComponent(dueDate)}&amount=${amount}`,
    ),
};
