import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '../../lib/api';
import KycForm from './KycForm';
import { kycApi } from './kyc-api';
import './kyc.css';

const STATUS_LABEL: Record<string, string> = {
  pending: 'Votre dossier est en cours d’examen (24–48h).',
  approved: 'Votre dossier est vérifié.',
  rejected: 'Votre dossier a été refusé — vous pouvez le soumettre à nouveau.',
};

export default function KycPage() {
  const queryClient = useQueryClient();
  const status = useQuery({
    queryKey: ['kyc', 'my-status'],
    queryFn: () => kycApi.myStatus(),
    retry: false,
  });

  const notSubmitted = status.isError && status.error instanceof ApiError && status.error.status === 404;

  return (
    <div>
      <h2>Vérification d'identité</h2>

      {status.isLoading && <p>Chargement…</p>}

      {status.data && (
        <div className={`kyc-status-banner kyc-status-${status.data.status}`}>
          {STATUS_LABEL[status.data.status]}
        </div>
      )}

      {(notSubmitted || status.data?.status === 'rejected') && (
        <KycForm onSubmitted={() => queryClient.invalidateQueries({ queryKey: ['kyc', 'my-status'] })} />
      )}
    </div>
  );
}
