import { useQuery } from '@tanstack/react-query';
import { ChevronDown, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { tontinesApi } from './tontines-api';
import type { MyTontineListItem } from './types';
import './tontines.css';

export default function ParticipantHistoryPage() {
  const navigate = useNavigate();
  const tontines = useQuery({ queryKey: ['participant', 'tontines'], queryFn: () => tontinesApi.list() });

  return (
    <div>
      <button className="tontine-back" onClick={() => navigate('/profile')}>
        <ChevronLeft size={18} /> Profil
      </button>
      <h2>Mon historique</h2>

      {tontines.isLoading && <p className="feed-status">Chargement…</p>}
      {tontines.isError && <p className="feed-status feed-status-error">Impossible de charger votre historique.</p>}
      {tontines.data?.length === 0 && <p className="feed-status">Aucune tontine pour l'instant.</p>}

      <div className="history-list">
        {tontines.data?.map((t) => (
          <TontineHistoryEntry key={`${t.owner_id}-${t.local_id}`} tontine={t} />
        ))}
      </div>
    </div>
  );
}

function TontineHistoryEntry({ tontine }: { tontine: MyTontineListItem }) {
  const detail = useQuery({
    queryKey: ['participant', 'tontines', tontine.owner_id, tontine.local_id],
    queryFn: () => tontinesApi.detail(tontine.owner_id, tontine.local_id),
    enabled: false, // lazy — only fetched once the <details> is opened
  });

  return (
    <details
      className="history-entry"
      onToggle={(e) => {
        if ((e.target as HTMLDetailsElement).open && !detail.data && !detail.isFetching) detail.refetch();
      }}
    >
      <summary>
        <span>{tontine.name}</span>
        <span className="history-entry-amount">
          {tontine.my_contribution_amount != null ? `${tontine.my_contribution_amount.toLocaleString('fr-FR')} FCFA` : '—'}
        </span>
        <ChevronDown size={16} className="history-entry-chevron" />
      </summary>

      <div className="history-entry-body">
        {detail.isLoading && <p className="feed-status">Chargement…</p>}
        {detail.isError && <p className="feed-status feed-status-error">Impossible de charger le détail.</p>}
        {detail.data &&
          (() => {
            const data = detail.data;
            const mine = data.contributions.filter(
              (c) => !data.my_member_local_id || c.member_local_id === data.my_member_local_id,
            );
            return mine.length === 0 ? (
              <p className="feed-status">Aucune cotisation enregistrée.</p>
            ) : (
              <ul className="tontine-plain-list">
                {mine.map((c) => (
                  <li key={c.local_id}>
                    <span>{formatDate(c.paid_at ?? c.date)}</span>
                    <span>{c.amount.toLocaleString('fr-FR')} FCFA</span>
                  </li>
                ))}
              </ul>
            );
          })()}
      </div>
    </details>
  );
}

function formatDate(value?: string): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('fr-FR');
}
