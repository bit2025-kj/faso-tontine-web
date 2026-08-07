import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BadgeCheck, ChevronLeft, Flag, MessageCircle, Star } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ReportModal from '../../components/ReportModal';
import { ApiError } from '../../lib/api';
import { chatApi } from '../chat/chat-api';
import { useAuth } from '../auth/auth-context';
import { profileApi } from './profile-api';
import { BADGE_LABELS } from './score-types';
import './score.css';

const USER_REPORT_REASONS = [
  { value: 'non_payment', label: 'Défaut de paiement' },
  { value: 'fraud', label: 'Fraude' },
  { value: 'abuse', label: 'Comportement abusif' },
  { value: 'impersonation', label: "Usurpation d'identité" },
  { value: 'other', label: 'Autre' },
];

function scoreColor(score: number): string {
  if (score >= 80) return 'var(--success)';
  if (score >= 50) return 'var(--warning)';
  return 'var(--danger)';
}

export default function ScorePage() {
  const { userId } = useParams<{ userId: string }>();
  const { user: me } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [ratingInput, setRatingInput] = useState(0);
  const [showReport, setShowReport] = useState(false);
  const [rateError, setRateError] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ['users', userId, 'profile'],
    queryFn: () => profileApi.getPublicProfile(userId!),
    enabled: Boolean(userId),
  });

  const rate = useMutation({
    mutationFn: (score: number) => profileApi.rate(userId!, score),
    onMutate: () => setRateError(null),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users', userId, 'profile'] }),
    onError: (err) => {
      // Sans ce handler, un rejet (ex: pas de conversation partagée — voir
      // ratings.py) ne montrait rien : les étoiles cliquées restaient
      // visuellement remplies sans que la note n'ait réellement été enregistrée.
      setRatingInput(0);
      setRateError(
        err instanceof ApiError ? err.message : 'Impossible d\'enregistrer votre note — réessayez.',
      );
    },
  });

  const message = useMutation({
    mutationFn: () => chatApi.createDirect(userId!),
    onSuccess: (conversation) => {
      queryClient.invalidateQueries({ queryKey: ['chat', 'conversations'] });
      navigate(`/messages/${conversation.id}`);
    },
  });

  if (query.isLoading) return <p className="feed-status">Chargement…</p>;
  if (query.isError || !query.data) return <p className="feed-status feed-status-error">Profil introuvable.</p>;

  const profile = query.data;
  const isSelf = me?.id === userId;
  const myRating = ratingInput || profile.my_rating || 0;

  return (
    <div>
      <button className="tontine-back" onClick={() => navigate(-1)}>
        <ChevronLeft size={18} /> Retour
      </button>

      <div className="score-header">
        <div className="score-avatar">
          {profile.avatar_url ? <img src={profile.avatar_url} alt="" /> : profile.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <h2>
            {profile.name}
            {profile.verified && <BadgeCheck className="post-card-verified" size={17} aria-label="Vérifié" />}
          </h2>
          {profile.member_since && (
            <span className="profile-role">Membre depuis {new Date(profile.member_since).toLocaleDateString('fr-FR')}</span>
          )}
        </div>
        {!isSelf && (
          <div className="score-header-actions">
            <button className="score-message-btn" onClick={() => message.mutate()} disabled={message.isPending}>
              <MessageCircle size={16} /> Message
            </button>
            <button className="score-report-btn" onClick={() => setShowReport(true)} aria-label="Signaler cet utilisateur">
              <Flag size={16} />
            </button>
          </div>
        )}
      </div>

      <div className="score-card">
        <div className="score-value" style={{ color: scoreColor(profile.score) }}>
          {profile.score}
        </div>
        <div className="score-label">{profile.score_label}</div>
        <div className="score-meter-track">
          <div
            className="score-meter-fill"
            style={{ width: `${profile.score}%`, background: scoreColor(profile.score) }}
          />
        </div>
      </div>

      {profile.badges.length > 0 && (
        <div className="score-badges">
          {profile.badges.map((b) => {
            const meta = BADGE_LABELS[b];
            const Icon = meta?.Icon ?? Star;
            return (
              <div key={b} className="score-badge">
                <Icon className="score-badge-icon" size={20} />
                <span>{meta?.label ?? b}</span>
              </div>
            );
          })}
        </div>
      )}

      <div className="score-rating-card">
        <div className="score-rating-summary">
          <span className="score-rating-stars">
            {[1, 2, 3, 4, 5].map((n) => (
              <Star key={n} size={16} fill={n <= Math.round(profile.avg_rating) ? 'currentColor' : 'none'} />
            ))}
          </span>
          <span>{profile.avg_rating.toFixed(1)} / 5 · {profile.total_ratings} avis</span>
        </div>

        {!isSelf && (
          <div className="score-rating-input">
            <span>Votre note :</span>
            <div className="score-rating-stars-input">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => {
                    setRatingInput(n);
                    rate.mutate(n);
                  }}
                  aria-label={`${n} étoiles`}
                >
                  <Star size={20} fill={n <= myRating ? 'currentColor' : 'none'} />
                </button>
              ))}
            </div>
            {rateError && <p className="score-rating-error">{rateError}</p>}
          </div>
        )}
      </div>

      {showReport && (
        <ReportModal
          title="Signaler cet utilisateur"
          reasons={USER_REPORT_REASONS}
          onSubmit={(reason, details) => profileApi.report(userId!, reason, details || undefined)}
          onClose={() => setShowReport(false)}
        />
      )}
    </div>
  );
}
