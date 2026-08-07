import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import Modal from '../../components/Modal';
import { ApiError } from '../../lib/api';
import { useAuth } from '../auth/auth-context';
import { chatApi, type GroupProposal } from './chat-api';
import { useChatSocket } from './chat-socket';

const PROPOSAL_TYPES = [
  { value: 'guaranty', label: 'Garantie' },
  { value: 'reserve_fund', label: 'Fonds de réserve' },
  { value: 'rule_change', label: 'Changement de règle' },
];

const STATUS_LABELS: Record<string, string> = {
  pending: 'En cours',
  approved: 'Approuvée',
  rejected: 'Rejetée',
};

export default function ProposalsModal({ conversationId, onClose }: { conversationId: string; onClose: () => void }) {
  const { user } = useAuth();
  const { subscribe } = useChatSocket();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [type, setType] = useState(PROPOSAL_TYPES[0].value);
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  const proposals = useQuery({
    queryKey: ['chat', conversationId, 'proposals'],
    queryFn: () => chatApi.listProposals(conversationId),
  });

  // Le vote d'un autre membre n'arrive pas via invalidation REST — le
  // backend diffuse le décompte à jour sur le même WS que le chat
  // (event "proposal_updated" / "new_proposal") pour que tout le monde
  // voie les votes en direct sans rouvrir la modale (voir audit web).
  useEffect(() => {
    return subscribe((frame) => {
      if (frame.event !== 'proposal_updated' && frame.event !== 'new_proposal') return;
      const incoming = frame.proposal as GroupProposal | undefined;
      if (!incoming || incoming.conversation_id !== conversationId) return;
      queryClient.setQueryData<GroupProposal[]>(['chat', conversationId, 'proposals'], (prev) => {
        if (!prev) return prev;
        const exists = prev.some((p) => p.id === incoming.id);
        return exists ? prev.map((p) => (p.id === incoming.id ? incoming : p)) : [incoming, ...prev];
      });
    });
  }, [subscribe, conversationId, queryClient]);

  const create = useMutation({
    mutationFn: () => chatApi.createProposal(conversationId, type, { description: description.trim() }),
    onMutate: () => setError(null),
    onSuccess: () => {
      setDescription('');
      setShowCreate(false);
      queryClient.invalidateQueries({ queryKey: ['chat', conversationId, 'proposals'] });
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Impossible de créer cette proposition.'),
  });

  const vote = useMutation({
    mutationFn: (vars: { proposalId: string; yes: boolean }) => chatApi.voteProposal(conversationId, vars.proposalId, vars.yes),
    onMutate: () => setError(null),
    onSuccess: (updated) => {
      queryClient.setQueryData<GroupProposal[]>(['chat', conversationId, 'proposals'], (prev) =>
        prev?.map((p) => (p.id === updated.id ? updated : p)),
      );
    },
    // Réutilise le message backend tel quel (ex: "Vous avez déjà voté sur
    // cette proposition") — sans ça le bouton "Pour"/"Contre" ne faisait
    // strictement rien en cas de 409 (voir audit).
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Vote impossible.'),
  });

  return (
    <Modal title="Propositions du groupe" onClose={onClose}>
      {!showCreate ? (
        <button className="proposals-new-btn" onClick={() => setShowCreate(true)}>
          + Nouvelle proposition
        </button>
      ) : (
        <form
          className="proposals-create"
          onSubmit={(e) => {
            e.preventDefault();
            if (description.trim()) create.mutate();
          }}
        >
          <label className="create-post-field">
            <span>Type</span>
            <select value={type} onChange={(e) => setType(e.target.value)}>
              {PROPOSAL_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          <label className="create-post-field">
            <span>Description</span>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} maxLength={500} required />
          </label>
          <button type="submit" disabled={create.isPending}>
            {create.isPending ? 'Envoi…' : 'Proposer au groupe'}
          </button>
        </form>
      )}

      {error && <p className="proposals-error">{error}</p>}

      <div className="proposals-list">
        {proposals.isLoading && <p className="feed-status">Chargement…</p>}
        {proposals.data?.length === 0 && <p className="feed-status">Aucune proposition pour l'instant.</p>}
        {proposals.data?.map((p) => {
          const myVote = user
            ? p.votes_yes.includes(user.id)
              ? true
              : p.votes_no.includes(user.id)
                ? false
                : undefined
            : undefined;
          const description = p.payload?.description;
          return (
            <div key={p.id} className="proposal-row">
              <span className="proposal-type">{PROPOSAL_TYPES.find((t) => t.value === p.type)?.label ?? p.type}</span>
              {description && <p>{description}</p>}
              <div className="proposal-votes">
                <span>👍 {p.yes_count}</span>
                <span>👎 {p.no_count}</span>
                <span className="proposal-status">{STATUS_LABELS[p.status] ?? p.status}</span>
              </div>
              {p.status === 'pending' && (
                <div className="proposal-vote-actions">
                  <button
                    className={myVote === true ? 'active' : ''}
                    disabled={vote.isPending || myVote !== undefined}
                    onClick={() => vote.mutate({ proposalId: p.id, yes: true })}
                  >
                    Pour
                  </button>
                  <button
                    className={myVote === false ? 'active' : ''}
                    disabled={vote.isPending || myVote !== undefined}
                    onClick={() => vote.mutate({ proposalId: p.id, yes: false })}
                  >
                    Contre
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Modal>
  );
}
