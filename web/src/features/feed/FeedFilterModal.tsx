import { useState } from 'react';
import Modal from '../../components/Modal';
import type { FeedFilters } from './types';

type AdvancedFilters = Pick<FeedFilters, 'tontine_type' | 'min_amount' | 'max_amount'>;

export default function FeedFilterModal({
  value,
  onApply,
  onClose,
}: {
  value: AdvancedFilters;
  onApply: (next: AdvancedFilters) => void;
  onClose: () => void;
}) {
  const [tontineType, setTontineType] = useState(value.tontine_type ?? '');
  const [minAmount, setMinAmount] = useState(value.min_amount?.toString() ?? '');
  const [maxAmount, setMaxAmount] = useState(value.max_amount?.toString() ?? '');

  function apply() {
    onApply({
      tontine_type: tontineType ? (tontineType as FeedFilters['tontine_type']) : undefined,
      min_amount: minAmount ? Number(minAmount) : undefined,
      max_amount: maxAmount ? Number(maxAmount) : undefined,
    });
  }

  function reset() {
    setTontineType('');
    setMinAmount('');
    setMaxAmount('');
    onApply({});
  }

  return (
    <Modal title="Filtres" onClose={onClose}>
      <label className="create-post-field">
        <span>Type de tontine</span>
        <select value={tontineType} onChange={(e) => setTontineType(e.target.value)}>
          <option value="">Tous types</option>
          <option value="rotative">Rotative</option>
          <option value="epargne">Épargne</option>
        </select>
      </label>

      <div className="create-post-row">
        <label className="create-post-field">
          <span>Montant min (FCFA)</span>
          <input type="number" min={0} value={minAmount} onChange={(e) => setMinAmount(e.target.value)} placeholder="0" />
        </label>
        <label className="create-post-field">
          <span>Montant max (FCFA)</span>
          <input type="number" min={0} value={maxAmount} onChange={(e) => setMaxAmount(e.target.value)} placeholder="Sans limite" />
        </label>
      </div>

      <div className="feed-filter-actions">
        <button type="button" className="feed-filter-reset" onClick={reset}>
          Réinitialiser
        </button>
        <button type="button" className="feed-filter-apply" onClick={apply}>
          Appliquer
        </button>
      </div>
    </Modal>
  );
}
