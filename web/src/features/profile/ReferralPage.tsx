import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, Copy, Share2 } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { profileApi } from './profile-api';
import './referral.css';

export default function ReferralPage() {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const query = useQuery({ queryKey: ['users', 'me', 'referral'], queryFn: () => profileApi.myReferral() });

  async function copyCode() {
    if (!query.data) return;
    await navigator.clipboard.writeText(query.data.referral_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function shareCode() {
    if (!query.data) return;
    const text = `Rejoins-moi sur Faso Tontine avec mon code de parrainage : ${query.data.referral_code}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Faso Tontine', text });
      } catch {
        // user cancelled the native share sheet
      }
    } else {
      await copyCode();
    }
  }

  return (
    <div>
      <button className="tontine-back" onClick={() => navigate('/profile')}>
        <ChevronLeft size={18} /> Profil
      </button>
      <h2>Parrainage</h2>

      {query.isLoading && <p className="feed-status">Chargement…</p>}
      {query.isError && <p className="feed-status feed-status-error">Impossible de charger votre parrainage.</p>}

      {query.data && (
        <>
          <div className="referral-card">
            <p className="referral-lede">
              Partagez votre code — 30 jours de plan Pro offerts quand une tontine parrainée atteint 3 membres actifs.
            </p>
            <div className="referral-code" onClick={copyCode}>
              <span>{query.data.referral_code}</span>
              <button type="button">
                <Copy size={14} /> {copied ? 'Copié !' : 'Copier'}
              </button>
            </div>
            <button type="button" className="referral-share-btn" onClick={shareCode}>
              <Share2 size={16} /> Partager mon code
            </button>
          </div>

          <div className="referral-stats">
            <div>
              <strong>{query.data.referral_count}</strong>
              <span>Filleuls</span>
            </div>
            <div>
              <strong>{query.data.referral_rewards}</strong>
              <span>Récompenses</span>
            </div>
          </div>

          {query.data.filleuls.length > 0 && (
            <ul className="tontine-plain-list">
              {query.data.filleuls.map((f, i) => (
                <li key={i}>
                  <span>{f.name}</span>
                  <span>{new Date(f.joined_at).toLocaleDateString('fr-FR')}</span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
