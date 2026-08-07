import { useQuery } from '@tanstack/react-query';
import { FileDown } from 'lucide-react';
import { useState } from 'react';
import { feedApi } from './feed-api';
import './feed.css';

const TABS = [
  { key: 'pending', label: 'En attente' },
  { key: 'accepted', label: 'Acceptées' },
  { key: 'rejected', label: 'Refusées' },
];

export default function MyRequestsPage() {
  const [status, setStatus] = useState('pending');
  const requests = useQuery({
    queryKey: ['feed', 'my-requests', status],
    queryFn: () => feedApi.myRequests(status),
  });

  return (
    <div>
      <h2>Mes demandes</h2>
      <div className="feed-tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`feed-tab${status === t.key ? ' feed-tab-active' : ''}`}
            onClick={() => setStatus(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {requests.isLoading && <p className="feed-status">Chargement…</p>}
      {requests.data?.length === 0 && <p className="feed-status">Aucune demande dans cette catégorie.</p>}

      <div className="feed-list">
        {requests.data?.map((r) => (
          <div key={r.id} className="post-card">
            <h3 className="post-card-title">{r.post_title ?? 'Annonce'}</h3>
            <p className="post-card-meta">Tontinier : {r.tontinier_name ?? '—'}</p>
            {r.message && <p className="post-card-desc">{r.message}</p>}
            {status === 'accepted' && (
              r.contract_pdf_url ? (
                <a className="request-contract-link" href={r.contract_pdf_url} target="_blank" rel="noreferrer">
                  <FileDown size={16} /> Télécharger le contrat
                </a>
              ) : (
                <p className="request-contract-pending">Contrat en cours de génération…</p>
              )
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
