import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, MessageSquareQuote } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ApiError } from '../../lib/api';
import { feedApi } from './feed-api';
import type { JoinRequest } from './types';
import './feed.css';

const TABS = [
  { key: 'pending', label: 'En attente' },
  { key: 'reviewed', label: 'Traitées' },
] as const;

const KYC_LABELS: Record<string, string> = {
  approved: 'KYC validé',
  rejected: 'KYC rejeté',
  pending: 'KYC en attente',
};

export default function PostRequestsPage() {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<(typeof TABS)[number]['key']>('pending');
  const [actingOn, setActingOn] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const requests = useQuery({
    queryKey: ['feed', 'post-requests', postId],
    queryFn: () => feedApi.listRequests(postId!),
    enabled: Boolean(postId),
  });

  const review = useMutation({
    mutationFn: ({ requestId, accepted }: { requestId: string; accepted: boolean }) =>
      feedApi.reviewRequest(postId!, requestId, accepted),
    onMutate: ({ requestId }) => {
      setActingOn(requestId);
      setActionError(null);
    },
    onError: (err) => {
      setActionError(err instanceof ApiError ? err.message : "Impossible de traiter cette demande — réessayez.");
    },
    onSettled: () => setActingOn(null),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed', 'post-requests', postId] });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
    },
  });

  const all = requests.data ?? [];
  const pending = all.filter((r) => r.status === 'pending');
  const reviewed = all.filter((r) => r.status !== 'pending');
  const shown = tab === 'pending' ? pending : reviewed;

  return (
    <div>
      <button className="tontine-back" onClick={() => navigate(-1)}>
        <ChevronLeft size={18} /> Retour
      </button>
      <h2>Demandes reçues</h2>

      <div className="feed-tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`feed-tab${tab === t.key ? ' feed-tab-active' : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
            {t.key === 'pending' && pending.length > 0 && ` (${pending.length})`}
          </button>
        ))}
      </div>

      {requests.isLoading && <p className="feed-status">Chargement…</p>}
      {requests.isError && <p className="feed-status feed-status-error">Impossible de charger les demandes. Réessayez.</p>}
      {actionError && <p className="feed-status feed-status-error">{actionError}</p>}
      {!requests.isLoading && shown.length === 0 && (
        <p className="feed-status">
          {tab === 'pending' ? 'Aucune demande en attente.' : 'Aucune demande traitée pour le moment.'}
        </p>
      )}

      <div className="feed-list">
        {shown.map((r) => (
          <RequestCard
            key={r.id}
            request={r}
            busy={actingOn === r.id}
            onAccept={() => review.mutate({ requestId: r.id, accepted: true })}
            onReject={() => review.mutate({ requestId: r.id, accepted: false })}
          />
        ))}
      </div>
    </div>
  );
}

function RequestCard({
  request,
  busy,
  onAccept,
  onReject,
}: {
  request: JoinRequest;
  busy: boolean;
  onAccept: () => void;
  onReject: () => void;
}) {
  return (
    <div className="post-card received-request-card">
      <div className="received-request-head">
        <div className="score-avatar received-request-avatar">
          {request.participant_avatar_url ? (
            <img src={request.participant_avatar_url} alt="" />
          ) : (
            (request.participant_name ?? '?').charAt(0).toUpperCase()
          )}
        </div>
        <div className="received-request-identity">
          <span className="received-request-name">{request.participant_name}</span>
          <span className="post-card-meta">{request.participant_phone}</span>
        </div>
        {request.status !== 'pending' && (
          <span className={`received-request-status received-request-status-${request.status}`}>
            {request.status === 'accepted' ? 'Acceptée' : 'Refusée'}
          </span>
        )}
        {request.participant_kyc_status && (
          <span className={`received-request-kyc received-request-kyc-${request.participant_kyc_status}`}>
            {KYC_LABELS[request.participant_kyc_status] ?? request.participant_kyc_status}
          </span>
        )}
      </div>

      {request.message && (
        <p className="received-request-message">
          <MessageSquareQuote size={14} /> {request.message}
        </p>
      )}

      {request.status === 'pending' && (
        <div className="received-request-actions">
          <button className="received-request-reject" disabled={busy} onClick={onReject}>
            Refuser
          </button>
          <button className="received-request-accept" disabled={busy} onClick={onAccept}>
            {busy ? 'Traitement…' : 'Accepter'}
          </button>
        </div>
      )}
    </div>
  );
}
