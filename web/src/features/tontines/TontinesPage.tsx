import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { tontinesApi } from './tontines-api';
import './tontines.css';

const STATUS_LABEL: Record<string, string> = {
  active: 'Actif',
  completed: 'Terminé',
  archived: 'Archivé',
  suspended: 'Suspendu',
};

export default function TontinesPage() {
  const navigate = useNavigate();
  const query = useQuery({
    queryKey: ['participant', 'tontines'],
    queryFn: () => tontinesApi.list(),
  });

  return (
    <div>
      <h2>Mes tontines</h2>

      {query.isLoading && <p className="feed-status">Chargement…</p>}
      {query.isError && <p className="feed-status feed-status-error">Impossible de charger vos tontines.</p>}
      {query.data?.length === 0 && (
        <p className="feed-status">
          Vous ne participez à aucune tontine pour l'instant. Rejoignez-en une depuis le fil « Découvrir ».
        </p>
      )}

      <div className="tontine-list">
        {query.data?.map((t) => (
          <button
            key={`${t.owner_id}-${t.local_id}`}
            className="tontine-card"
            onClick={() => navigate(`/tontines/${t.owner_id}/${t.local_id}`)}
          >
            <div className="tontine-card-main">
              <h3>{t.name}</h3>
              <p className="tontine-card-meta">
                {t.type === 'rotative' ? 'Rotative' : 'Épargne'} · Tontinier : {t.tontinier_name ?? '—'}
              </p>
            </div>
            <div className="tontine-card-side">
              {t.my_contribution_amount != null && (
                <span className="tontine-card-amount">{t.my_contribution_amount.toLocaleString('fr-FR')} FCFA</span>
              )}
              {t.my_status && <span className="tontine-card-status">{STATUS_LABEL[t.my_status] ?? t.my_status}</span>}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
