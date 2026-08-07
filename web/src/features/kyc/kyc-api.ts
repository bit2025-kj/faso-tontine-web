import { api } from '../../lib/api';
import type { KycStatus } from '../feed/types';

export const kycApi = {
  myStatus: () => api.get<KycStatus>('/kyc/my-status'),

  submit: (fields: { full_name: string; id_type: string; id_number: string }, idDocument: File, selfie: File) => {
    const form = new FormData();
    form.append('full_name', fields.full_name);
    form.append('id_type', fields.id_type);
    form.append('id_number', fields.id_number);
    form.append('id_document', idDocument);
    form.append('selfie', selfie);
    return api.upload<{ kyc_id: string; status: string; message: string }>('/kyc/submit', 'POST', form);
  },
};
