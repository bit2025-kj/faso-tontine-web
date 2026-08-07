import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Modal from '../../components/Modal';
import { ApiError } from '../../lib/api';
import KycForm from '../kyc/KycForm';
import { kycApi } from '../kyc/kyc-api';
import { feedApi } from './feed-api';
import type { FeedPost } from './types';

export default function JoinFlowModal({ post, onClose }: { post: FeedPost; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);

  const kycStatus = useQuery({
    queryKey: ['kyc', 'my-status'],
    queryFn: () => kycApi.myStatus(),
    retry: false,
    staleTime: 30_000,
  });

  const join = useMutation({
    mutationFn: () => feedApi.requestToJoin(post.id, message || undefined),
    onSuccess: () => {
      setSent(true);
      queryClient.invalidateQueries({ queryKey: ['feed'] });
    },
  });

  const kycMissing = kycStatus.isError && kycStatus.error instanceof ApiError && kycStatus.error.status === 404;
  const kycRejected = kycStatus.data?.status === 'rejected';
  const kycOk = kycStatus.data?.status === 'pending' || kycStatus.data?.status === 'approved';

  return (
    <Modal title={`Rejoindre « ${post.title} »`} onClose={onClose}>
      {sent ? (
        <p className="join-flow-success">
          Votre demande a été envoyée à {post.author_name}. Vous recevrez une notification dès qu'elle sera examinée.
        </p>
      ) : kycStatus.isLoading ? (
        <p>Vérification de votre dossier KYC…</p>
      ) : kycMissing ? (
        <div>
          <p className="join-flow-note">
            Une vérification d'identité est requise avant de postuler. Complétez-la ci-dessous — votre demande
            partira automatiquement une fois votre dossier soumis.
          </p>
          <KycForm
            onSubmitted={() => {
              kycStatus.refetch();
              join.mutate();
            }}
          />
        </div>
      ) : kycRejected ? (
        <div>
          <p className="join-flow-note join-flow-note-danger">
            Votre dossier KYC a été refusé{kycStatus.data?.review_note ? ` : ${kycStatus.data.review_note}` : '.'} Vous
            devez soumettre un nouveau dossier avant de pouvoir postuler.
          </p>
          <KycForm onSubmitted={() => kycStatus.refetch()} />
        </div>
      ) : kycOk ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            join.mutate();
          }}
        >
          <label className="join-flow-field">
            <span>Message pour {post.author_name} (optionnel)</span>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              placeholder="Présentez-vous en quelques mots…"
            />
          </label>
          {join.isError && (
            <p className="join-flow-note join-flow-note-danger">
              {join.error instanceof ApiError ? join.error.message : 'Envoi impossible.'}
            </p>
          )}
          <button className="join-flow-submit" type="submit" disabled={join.isPending}>
            {join.isPending ? 'Envoi…' : 'Envoyer ma candidature'}
          </button>
        </form>
      ) : (
        <p>Impossible de vérifier votre dossier KYC pour le moment. Réessayez plus tard.</p>
      )}
    </Modal>
  );
}
