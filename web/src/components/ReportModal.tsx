import { useState } from 'react';
import Modal from './Modal';

export interface ReportReasonOption {
  value: string;
  label: string;
}

export default function ReportModal({
  title,
  reasons,
  onSubmit,
  onClose,
}: {
  title: string;
  reasons: ReportReasonOption[];
  onSubmit: (reason: string, details: string) => Promise<void>;
  onClose: () => void;
}) {
  const [reason, setReason] = useState(reasons[0]?.value ?? '');
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(undefined);
    try {
      await onSubmit(reason, details);
      setDone(true);
    } catch {
      setError('Signalement impossible pour le moment. Réessayez.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title={title} onClose={onClose}>
      {done ? (
        <p className="join-flow-success">Signalement envoyé. Merci, notre équipe va l'examiner.</p>
      ) : (
        <form onSubmit={submit}>
          <label className="create-post-field">
            <span>Raison</span>
            <select value={reason} onChange={(e) => setReason(e.target.value)}>
              {reasons.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>
          <label className="create-post-field">
            <span>Détails (optionnel)</span>
            <textarea value={details} onChange={(e) => setDetails(e.target.value)} rows={3} maxLength={1000} />
          </label>
          {error && <p className="create-post-error">{error}</p>}
          <button className="create-post-submit" type="submit" disabled={busy}>
            {busy ? 'Envoi…' : 'Signaler'}
          </button>
        </form>
      )}
    </Modal>
  );
}
