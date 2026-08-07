import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MessageCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { chatApi } from '../chat/chat-api';
import { relationsApi } from './relations-api';
import './relations.css';

type Tab = 'search' | 'suggestions' | 'requests' | 'mine';

export default function RelationsPage() {
  const [tab, setTab] = useState<Tab>('requests');
  const navigate = useNavigate();

  return (
    <div>
      <h2>Connexions</h2>
      <div className="feed-tabs">
        <button className={`feed-tab${tab === 'search' ? ' feed-tab-active' : ''}`} onClick={() => setTab('search')}>
          Rechercher
        </button>
        <button className={`feed-tab${tab === 'suggestions' ? ' feed-tab-active' : ''}`} onClick={() => setTab('suggestions')}>
          Suggestions
        </button>
        <button className={`feed-tab${tab === 'requests' ? ' feed-tab-active' : ''}`} onClick={() => setTab('requests')}>
          Demandes
        </button>
        <button className={`feed-tab${tab === 'mine' ? ' feed-tab-active' : ''}`} onClick={() => setTab('mine')}>
          Mes relations
        </button>
      </div>

      {tab === 'search' && <SearchTab onOpenProfile={(id) => navigate(`/profile/${id}/score`)} />}
      {tab === 'suggestions' && <SuggestionsTab onOpenProfile={(id) => navigate(`/profile/${id}/score`)} />}
      {tab === 'requests' && <RequestsTab />}
      {tab === 'mine' && (
        <MineTab onOpenProfile={(id) => navigate(`/profile/${id}/score`)} onOpenChat={(id) => navigate(`/messages/${id}`)} />
      )}
    </div>
  );
}

const SUGGESTION_REASON_LABELS: Record<string, string> = {
  ami_de_ami: 'Ami en commun',
  contact: 'Dans vos contacts',
  contact_et_ami: 'Contact · ami en commun',
};

function SuggestionsTab({ onOpenProfile }: { onOpenProfile: (userId: string) => void }) {
  const queryClient = useQueryClient();
  const suggestions = useQuery({ queryKey: ['relations', 'suggestions'], queryFn: () => relationsApi.suggestions() });

  const send = useMutation({
    mutationFn: (userId: string) => relationsApi.send(userId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['relations'] }),
  });

  if (suggestions.isLoading) return <p className="feed-status">Chargement…</p>;
  if (suggestions.isError) return <p className="feed-status feed-status-error">Impossible de charger les suggestions.</p>;
  if (suggestions.data?.length === 0) return <p className="feed-status">Aucune suggestion pour l'instant.</p>;

  return (
    <ul className="relations-list">
      {suggestions.data?.map((s) => (
        <li key={s.id} className="relations-row">
          <button className="relations-user" onClick={() => onOpenProfile(s.id)}>
            <span className="relations-avatar">
              {s.avatar_url ? <img src={s.avatar_url} alt="" /> : s.name.charAt(0)}
            </span>
            <span className="relations-suggestion-identity">
              <span>{s.name}</span>
              <span className="relations-suggestion-reason">
                {SUGGESTION_REASON_LABELS[s.reason] ?? s.reason}
                {s.mutual_friends_count > 0 &&
                  ` · ${s.mutual_friends_count} relation${s.mutual_friends_count > 1 ? 's' : ''} en commun`}
              </span>
            </span>
          </button>
          <button className="relations-action" onClick={() => send.mutate(s.id)} disabled={send.isPending}>
            Ajouter
          </button>
        </li>
      ))}
    </ul>
  );
}

function SearchTab({ onOpenProfile }: { onOpenProfile: (userId: string) => void }) {
  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');
  const queryClient = useQueryClient();

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q), 350);
    return () => clearTimeout(t);
  }, [q]);

  const results = useQuery({
    queryKey: ['relations', 'search', debounced],
    queryFn: () => relationsApi.search(debounced),
    enabled: debounced.trim().length >= 2,
  });

  const send = useMutation({
    mutationFn: (userId: string) => relationsApi.send(userId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['relations'] }),
  });

  return (
    <div>
      <input
        className="relations-search-input"
        placeholder="Nom ou téléphone…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      {debounced.trim().length < 2 && <p className="feed-status">Tapez au moins 2 caractères.</p>}
      {results.isLoading && <p className="feed-status">Recherche…</p>}
      {results.isError && <p className="feed-status feed-status-error">Recherche impossible pour le moment.</p>}
      {results.data?.length === 0 && debounced.trim().length >= 2 && (
        <p className="feed-status">Aucun résultat pour « {debounced} ».</p>
      )}
      <ul className="relations-list">
        {results.data?.map((u) => (
          <li key={u.id} className="relations-row">
            <button className="relations-user" onClick={() => onOpenProfile(u.id)}>
              <span className="relations-avatar">
                {u.avatar_url ? <img src={u.avatar_url} alt="" /> : u.name.charAt(0)}
              </span>
              <span>{u.name}</span>
            </button>
            <button className="relations-action" onClick={() => send.mutate(u.id)} disabled={send.isPending}>
              Ajouter
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function RequestsTab() {
  const queryClient = useQueryClient();
  const received = useQuery({ queryKey: ['relations', 'received'], queryFn: () => relationsApi.received() });

  const review = useMutation({
    mutationFn: (vars: { id: string; action: 'accept' | 'reject' }) => relationsApi.review(vars.id, vars.action),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['relations'] });
    },
  });

  if (received.isLoading) return <p className="feed-status">Chargement…</p>;
  if (received.isError) return <p className="feed-status feed-status-error">Impossible de charger les demandes.</p>;
  if (received.data?.length === 0) return <p className="feed-status">Aucune demande en attente.</p>;

  return (
    <ul className="relations-list">
      {received.data?.map((r) => {
        const user = r.from_user;
        return (
          <li key={r.id} className="relations-row">
            <span className="relations-user">
              <span className="relations-avatar">
                {user?.avatar_url ? <img src={user.avatar_url} alt="" /> : (user?.name ?? '?').charAt(0)}
              </span>
              <span>{user?.name ?? 'Utilisateur'}</span>
            </span>
            <div className="relations-actions">
              <button className="relations-action" onClick={() => review.mutate({ id: r.id, action: 'accept' })}>
                Accepter
              </button>
              <button
                className="relations-action relations-action-secondary"
                onClick={() => review.mutate({ id: r.id, action: 'reject' })}
              >
                Refuser
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function MineTab({
  onOpenProfile,
  onOpenChat,
}: {
  onOpenProfile: (userId: string) => void;
  onOpenChat: (conversationId: string) => void;
}) {
  const queryClient = useQueryClient();
  const list = useQuery({ queryKey: ['relations', 'list'], queryFn: () => relationsApi.list() });

  const message = useMutation({
    mutationFn: (userId: string) => chatApi.createDirect(userId),
    onSuccess: (conversation) => {
      queryClient.invalidateQueries({ queryKey: ['chat', 'conversations'] });
      onOpenChat(conversation.id);
    },
  });

  if (list.isLoading) return <p className="feed-status">Chargement…</p>;
  if (list.isError) return <p className="feed-status feed-status-error">Impossible de charger vos relations.</p>;
  if (list.data?.length === 0) return <p className="feed-status">Aucune relation pour l'instant.</p>;

  return (
    <ul className="relations-list">
      {list.data?.map((r) => {
        const user = r.other_user ?? r.to_user ?? r.from_user;
        return (
          <li key={r.id} className="relations-row">
            <button className="relations-user" onClick={() => user && onOpenProfile(user.id)}>
              <span className="relations-avatar">
                {user?.avatar_url ? <img src={user.avatar_url} alt="" /> : (user?.name ?? '?').charAt(0)}
              </span>
              <span>{user?.name ?? 'Utilisateur'}</span>
            </button>
            {user && (
              <button
                className="relations-action"
                onClick={() => message.mutate(user.id)}
                disabled={message.isPending}
                aria-label={`Envoyer un message à ${user.name}`}
              >
                <MessageCircle size={16} />
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
