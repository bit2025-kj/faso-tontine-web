import { ChevronLeft } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiError } from '../../lib/api';
import { useAuth } from '../auth/auth-context';
import { profileApi } from './profile-api';

export default function EditProfilePage() {
  const { user, refresh } = useAuth();
  const navigate = useNavigate();

  const [prenom, setPrenom] = useState(user?.prenom ?? '');
  const [nom, setNom] = useState(user?.nom ?? '');
  const [ville, setVille] = useState(user?.ville ?? '');
  const [sexe, setSexe] = useState(user?.sexe ?? 'homme');
  const [email, setEmail] = useState(user?.email ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(undefined);
    try {
      await profileApi.updateProfile({ prenom, nom, ville, sexe, email: email || undefined });
      refresh();
      navigate('/profile', { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Mise à jour impossible.');
    } finally {
      setBusy(false);
    }
  }

  if (!user) return null;

  return (
    <div>
      <button className="tontine-back" onClick={() => navigate('/profile')}>
        <ChevronLeft size={18} /> Profil
      </button>
      <h2>Modifier mon profil</h2>

      <form className="kyc-form" onSubmit={submit}>
        <label className="kyc-field">
          <span>Prénom</span>
          <input value={prenom} onChange={(e) => setPrenom(e.target.value)} required />
        </label>
        <label className="kyc-field">
          <span>Nom</span>
          <input value={nom} onChange={(e) => setNom(e.target.value)} required />
        </label>
        <label className="kyc-field">
          <span>Ville</span>
          <input value={ville} onChange={(e) => setVille(e.target.value)} required />
        </label>
        <label className="kyc-field">
          <span>Sexe</span>
          <select value={sexe} onChange={(e) => setSexe(e.target.value)}>
            <option value="homme">Homme</option>
            <option value="femme">Femme</option>
            <option value="autre">Autre</option>
          </select>
        </label>
        <label className="kyc-field">
          <span>Email (optionnel)</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>

        {error && <p className="kyc-error">{error}</p>}

        <button className="kyc-submit" type="submit" disabled={busy}>
          {busy ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </form>
    </div>
  );
}
