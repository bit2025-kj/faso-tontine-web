import { useState } from 'react';
import { ApiError } from '../../lib/api';
import { kycApi } from './kyc-api';
import './kyc.css';

const ID_TYPES = [
  { value: 'national_id', label: "Carte d'identité (CNI)" },
  { value: 'passport', label: 'Passeport' },
  { value: 'driver_license', label: 'Permis de conduire' },
];

export default function KycForm({ onSubmitted }: { onSubmitted?: () => void }) {
  const [fullName, setFullName] = useState('');
  const [idType, setIdType] = useState('national_id');
  const [idNumber, setIdNumber] = useState('');
  const [idDocument, setIdDocument] = useState<File | null>(null);
  const [selfie, setSelfie] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!idDocument || !selfie) {
      setError("La pièce d'identité et le selfie sont obligatoires.");
      return;
    }
    setBusy(true);
    setError(undefined);
    try {
      await kycApi.submit({ full_name: fullName, id_type: idType, id_number: idNumber }, idDocument, selfie);
      onSubmitted?.();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Envoi impossible. Réessayez.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="kyc-form" onSubmit={submit}>
      <p className="kyc-lede">
        Votre dossier est examiné sous 24–48h et joint automatiquement à vos candidatures. Vos documents ne sont
        jamais partagés publiquement.
      </p>

      <label className="kyc-field">
        <span>Nom complet (comme sur la pièce)</span>
        <input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
      </label>

      <label className="kyc-field">
        <span>Type de pièce</span>
        <select value={idType} onChange={(e) => setIdType(e.target.value)}>
          {ID_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </label>

      <label className="kyc-field">
        <span>Numéro de la pièce</span>
        <input value={idNumber} onChange={(e) => setIdNumber(e.target.value)} required />
      </label>

      <label className="kyc-field">
        <span>Photo de la pièce d'identité</span>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setIdDocument(e.target.files?.[0] ?? null)}
          required
        />
      </label>

      <label className="kyc-field">
        <span>Selfie</span>
        <input type="file" accept="image/*" onChange={(e) => setSelfie(e.target.files?.[0] ?? null)} required />
      </label>

      {error && <p className="kyc-error">{error}</p>}

      <button className="kyc-submit" type="submit" disabled={busy}>
        {busy ? 'Envoi…' : 'Soumettre mon dossier'}
      </button>
    </form>
  );
}
