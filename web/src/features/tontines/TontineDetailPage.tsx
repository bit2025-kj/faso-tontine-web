import { useMutation, useQuery } from '@tanstack/react-query';
import { AlertTriangle, ChevronLeft } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { tontinesApi } from './tontines-api';
import type { PenaltyResult } from './types';
import './tontines.css';

type Tab = 'summary' | 'members' | 'cycles' | 'contributions';

export default function TontineDetailPage() {
  const { ownerId, localId } = useParams<{ ownerId: string; localId: string }>();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('summary');
  const [penaltyDueDate, setPenaltyDueDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [penaltyResult, setPenaltyResult] = useState<PenaltyResult | null>(null);

  const query = useQuery({
    queryKey: ['participant', 'tontines', ownerId, localId],
    queryFn: () => tontinesApi.detail(ownerId!, localId!),
    enabled: Boolean(ownerId && localId),
  });

  const computePenalty = useMutation({
    mutationFn: (vars: { memberLocalId: string; dueDate: string; amount: number }) =>
      tontinesApi.penalty(ownerId!, localId!, vars.memberLocalId, vars.dueDate, vars.amount),
    onSuccess: (result) => setPenaltyResult(result),
  });

  if (query.isLoading) return <p className="feed-status">Chargement…</p>;
  if (query.isError || !query.data) {
    return <p className="feed-status feed-status-error">Impossible de charger cette tontine.</p>;
  }

  const { tontine, members, cycles, contributions, withdrawals, my_member_local_id } = query.data;
  const isRotative = tontine.type === 'rotative';
  const tabs: { key: Tab; label: string }[] = [
    { key: 'summary', label: 'Résumé' },
    { key: 'members', label: 'Membres' },
    ...(isRotative ? [{ key: 'cycles' as Tab, label: 'Prises' }] : []),
    { key: 'contributions', label: isRotative ? 'Cotisations' : 'Historique' },
  ];

  return (
    <div>
      <button className="tontine-back" onClick={() => navigate('/tontines')}>
        <ChevronLeft size={18} /> Mes tontines
      </button>
      <h2>{tontine.name}</h2>

      <div className="feed-tabs">
        {tabs.map((t) => (
          <button key={t.key} className={`feed-tab${tab === t.key ? ' feed-tab-active' : ''}`} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'summary' && (
        <dl className="tontine-summary">
          <div>
            <dt>Type</dt>
            <dd>{isRotative ? 'Rotative' : 'Épargne'}</dd>
          </div>
          {tontine.amount != null && (
            <div>
              <dt>Montant de cotisation</dt>
              <dd>{tontine.amount.toLocaleString('fr-FR')} FCFA</dd>
            </div>
          )}
          {tontine.frequency && (
            <div>
              <dt>Fréquence</dt>
              <dd>{tontine.frequency}</dd>
            </div>
          )}
          {tontine.status && (
            <div>
              <dt>Statut</dt>
              <dd>{tontine.status}</dd>
            </div>
          )}
          <div>
            <dt>Membres</dt>
            <dd>{members.length}</dd>
          </div>
        </dl>
      )}

      {tab === 'summary' && my_member_local_id && tontine.amount != null && (
        <div className="tontine-penalty">
          <h3>
            <AlertTriangle size={16} /> Calculer une pénalité de retard
          </h3>
          <p className="tontine-penalty-hint">
            Estimez la pénalité applicable si votre cotisation de {tontine.amount.toLocaleString('fr-FR')} FCFA était
            due à la date ci-dessous.
          </p>
          <form
            className="tontine-penalty-form"
            onSubmit={(e) => {
              e.preventDefault();
              computePenalty.mutate({
                memberLocalId: my_member_local_id,
                dueDate: penaltyDueDate,
                amount: tontine.amount!,
              });
            }}
          >
            <input type="date" value={penaltyDueDate} onChange={(e) => setPenaltyDueDate(e.target.value)} required />
            <button type="submit" disabled={computePenalty.isPending}>
              {computePenalty.isPending ? 'Calcul…' : 'Calculer'}
            </button>
          </form>
          {computePenalty.isError && (
            <p className="feed-status feed-status-error">Impossible de calculer la pénalité.</p>
          )}
          {penaltyResult && (
            <dl className="tontine-penalty-result">
              <div>
                <dt>Jours de retard</dt>
                <dd>{penaltyResult.days_late}</dd>
              </div>
              <div>
                <dt>Pénalité</dt>
                <dd>{penaltyResult.penalty.toLocaleString('fr-FR')} FCFA</dd>
              </div>
              <div>
                <dt>Total dû</dt>
                <dd>{penaltyResult.total_due.toLocaleString('fr-FR')} FCFA</dd>
              </div>
            </dl>
          )}
        </div>
      )}

      {tab === 'members' && (
        <ul className="tontine-plain-list">
          {members.map((m) => (
            <li key={m.local_id} className={m.local_id === my_member_local_id ? 'tontine-me' : ''}>
              <span>
                {m.name}
                {m.local_id === my_member_local_id && ' (vous)'}
              </span>
              {m.amount != null && <span>{m.amount.toLocaleString('fr-FR')} FCFA</span>}
            </li>
          ))}
        </ul>
      )}

      {tab === 'cycles' && (
        <ul className="tontine-plain-list">
          {cycles.map((c) => (
            <li key={c.local_id}>
              <span>Tour {c.number}</span>
              <span>{c.status ?? '—'}</span>
            </li>
          ))}
          {cycles.length === 0 && <p className="feed-status">Aucun cycle pour l'instant.</p>}
        </ul>
      )}

      {tab === 'contributions' && (
        <ul className="tontine-plain-list">
          {contributions
            .filter((c) => !my_member_local_id || c.member_local_id === my_member_local_id)
            .map((c) => (
              <li key={c.local_id}>
                <span>{formatDate(c.paid_at ?? c.date)}</span>
                <span>{c.amount.toLocaleString('fr-FR')} FCFA</span>
              </li>
            ))}
          {!isRotative &&
            withdrawals
              .filter((w) => !my_member_local_id || w.member_local_id === my_member_local_id)
              .map((w) => (
                <li key={w.local_id} className="tontine-withdrawal">
                  <span>Retrait · {formatDate(w.date)}</span>
                  <span>-{w.amount.toLocaleString('fr-FR')} FCFA</span>
                </li>
              ))}
        </ul>
      )}
    </div>
  );
}

function formatDate(value?: string): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('fr-FR');
}
