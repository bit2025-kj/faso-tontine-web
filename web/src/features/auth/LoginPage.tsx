import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiError, api } from '../../lib/api';
import PhoneInput from '../../components/PhoneInput';
import { useAuth } from './auth-context';
import './auth.css';

type Step = 'password' | 'register' | 'contact-admin';

const ADMIN_PHONE_E164 = '+22667261698';
const ADMIN_PHONE_WA = '22667261698';
const ADMIN_EMAIL = 'kondombojosue17@gmail.com';

interface AuthResponse {
  role: string;
  profile_complete: boolean;
}

export default function LoginPage() {
  const navigate = useNavigate();
  const { refresh } = useAuth();

  const [step, setStep] = useState<Step>('password');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);

  const [prenom, setPrenom] = useState('');
  const [nom, setNom] = useState('');
  const [ville, setVille] = useState('');
  const [sexe, setSexe] = useState('');
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // ── Connexion par mot de passe (voie normale) ────────────────────────────

  async function submitLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);
    setBusy(true);
    try {
      await api.post<AuthResponse>('/auth/login', { phone, password });
      refresh();
      navigate('/', { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setStep('contact-admin');
      } else {
        setError(errorMessage(err));
      }
    } finally {
      setBusy(false);
    }
  }

  // ── Création de compte directe — pas d'OTP ────────────────────────────────

  async function submitRegister(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);
    if (newPassword !== confirmPassword) {
      setError('Les deux mots de passe ne correspondent pas.');
      return;
    }
    setBusy(true);
    try {
      await api.post('/auth/register', {
        phone,
        prenom,
        nom,
        ville,
        sexe,
        email: email || undefined,
        password: newPassword,
      });
      refresh();
      navigate('/', { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <img src="/logo.png" alt="" className="auth-logo" />
        <h1>Faso Tontine</h1>

        {step === 'password' && (
          <form onSubmit={submitLogin}>
            <p className="auth-lede">Connectez-vous avec votre numéro de téléphone.</p>
            <label className="auth-field">
              <span>Numéro de téléphone</span>
              <PhoneInput value={phone} onChange={setPhone} required autoFocus />
            </label>
            <label className="auth-field">
              <span>Mot de passe</span>
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </label>
            {error && <p className="auth-error">{error}</p>}
            <button className="auth-submit" type="submit" disabled={busy}>
              {busy ? 'Connexion…' : 'Se connecter'}
            </button>
            <button
              type="button"
              className="auth-link"
              onClick={() => {
                setError(undefined);
                setStep('contact-admin');
              }}
            >
              Mot de passe oublié ?
            </button>
            <button
              type="button"
              className="auth-link"
              onClick={() => {
                setPhone('');
                setError(undefined);
                setStep('register');
              }}
            >
              Créer un compte
            </button>
          </form>
        )}

        {step === 'register' && (
          <form onSubmit={submitRegister}>
            <p className="auth-lede">Renseignez vos informations pour créer votre compte.</p>
            <label className="auth-field">
              <span>Numéro de téléphone</span>
              <PhoneInput value={phone} onChange={setPhone} required autoFocus />
            </label>
            <label className="auth-field">
              <span>Prénom</span>
              <input value={prenom} onChange={(e) => setPrenom(e.target.value)} required autoComplete="off" />
            </label>
            <label className="auth-field">
              <span>Nom</span>
              <input value={nom} onChange={(e) => setNom(e.target.value)} required autoComplete="off" />
            </label>
            <label className="auth-field">
              <span>Ville</span>
              <input value={ville} onChange={(e) => setVille(e.target.value)} required autoComplete="off" />
            </label>
            <label className="auth-field">
              <span>Sexe</span>
              <select value={sexe} onChange={(e) => setSexe(e.target.value)} required>
                <option value="" disabled>
                  Choisir…
                </option>
                <option value="homme">Homme</option>
                <option value="femme">Femme</option>
                <option value="autre">Autre</option>
              </select>
            </label>
            <label className="auth-field">
              <span>E-mail (optionnel)</span>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            <label className="auth-field">
              <span>Mot de passe</span>
              <input
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                minLength={8}
                required
              />
              <span className="auth-hint">8 caractères minimum, pas uniquement des chiffres.</span>
            </label>
            <label className="auth-field">
              <span>Confirmer le mot de passe</span>
              <input
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                minLength={8}
                required
              />
            </label>
            {error && <p className="auth-error">{error}</p>}
            <button className="auth-submit" type="submit" disabled={busy}>
              {busy ? 'Création…' : 'Créer mon compte'}
            </button>
            <button type="button" className="auth-link" onClick={() => setStep('password')}>
              Retour
            </button>
          </form>
        )}

        {step === 'contact-admin' && (
          <div>
            <p className="auth-lede">
              Contactez l'administrateur : il réinitialise votre compte et vous communique un
              nouveau mot de passe.
            </p>
            <a className="auth-submit" style={{ display: 'block', textAlign: 'center', textDecoration: 'none', marginBottom: '0.75rem' }} href={`tel:${ADMIN_PHONE_E164}`}>
              Appeler l'administrateur
            </a>
            <a
              className="auth-link"
              style={{ display: 'block', textAlign: 'center', marginBottom: '0.5rem' }}
              href={`https://wa.me/${ADMIN_PHONE_WA}`}
              target="_blank"
              rel="noreferrer"
            >
              Contacter par WhatsApp
            </a>
            <a className="auth-link" style={{ display: 'block', textAlign: 'center' }} href={`mailto:${ADMIN_EMAIL}`}>
              Envoyer un e-mail
            </a>
            <button type="button" className="auth-link" onClick={() => setStep('password')}>
              Retour
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function errorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (typeof err.body === 'object' && err.body && 'detail' in (err.body as any)) {
      const detail = (err.body as any).detail;
      return typeof detail === 'string' ? detail : JSON.stringify(detail);
    }
    return err.message;
  }
  return 'Une erreur est survenue. Réessayez.';
}
