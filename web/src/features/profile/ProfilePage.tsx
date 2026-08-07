import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Bell,
  ChevronRight,
  ClipboardList,
  Gift,
  History,
  LogOut,
  Pencil,
  ShieldAlert,
  ShieldCheck,
  Star,
  UserCog,
  Users,
} from 'lucide-react';
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { pushAvailable, pushPermissionState, registerPushToken } from '../../lib/push';
import { feedApi } from '../feed/feed-api';
import { tontinesApi } from '../tontines/tontines-api';
import { useAuth } from '../auth/auth-context';
import { profileApi } from './profile-api';
import './profile.css';

const LINKS = [
  { to: '/profile/edit', label: 'Modifier mon profil', Icon: UserCog },
  { to: (userId: string) => `/profile/${userId}/score`, label: 'Mon score de fiabilité', Icon: Star },
  { to: '/requests', label: 'Mes demandes', Icon: ClipboardList },
  { to: '/history', label: 'Mon historique', Icon: History },
  { to: '/kyc', label: "Vérification d'identité", Icon: ShieldCheck },
  { to: '/referral', label: 'Parrainage', Icon: Gift },
  { to: '/relations', label: 'Connexions', Icon: Users },
];

export default function ProfilePage() {
  const { user, refresh } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);
  const [pushState, setPushState] = useState(() => pushPermissionState());
  const [pushBusy, setPushBusy] = useState(false);

  async function enablePush() {
    setPushBusy(true);
    try {
      await registerPushToken();
    } finally {
      setPushState(pushPermissionState());
      setPushBusy(false);
    }
  }

  const uploadAvatar = useMutation({
    mutationFn: (file: File) => profileApi.uploadAvatar(file),
    onSuccess: () => {
      refresh();
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const ownProfile = useQuery({
    queryKey: ['users', user?.id, 'profile'],
    queryFn: () => profileApi.getPublicProfile(user!.id),
    enabled: Boolean(user),
  });

  const pendingRequests = useQuery({
    queryKey: ['feed', 'my-requests', 'pending'],
    queryFn: () => feedApi.myRequests('pending'),
    enabled: Boolean(user),
  });

  const tontines = useQuery({
    queryKey: ['participant', 'tontines'],
    queryFn: () => tontinesApi.list(),
    enabled: Boolean(user),
  });

  const reactivate = useMutation({
    mutationFn: () => profileApi.reactivate(user!.id),
    onSuccess: () => ownProfile.refetch(),
  });

  if (!user) return null;

  async function logout() {
    await api.post('/auth/logout');
    refresh();
    navigate('/login', { replace: true });
  }

  const reportStatus = ownProfile.data?.report_status;

  return (
    <div className="profile-page">
      <div className="profile-header">
        <button
          type="button"
          className="profile-avatar profile-avatar-editable"
          onClick={() => fileInput.current?.click()}
          aria-label="Changer la photo de profil"
        >
          {user.avatar_url ? <img src={user.avatar_url} alt="" /> : user.name.charAt(0).toUpperCase()}
          <span className="profile-avatar-edit">
            <Pencil size={12} />
          </span>
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) uploadAvatar.mutate(file);
            e.target.value = '';
          }}
        />
        <div>
          <h2>{user.name}</h2>
          <span className="profile-role">
            Participant{user.verified ? ' · Vérifié' : ''} · Plan {planLabel(user.plan)}
          </span>
        </div>
      </div>

      {reportStatus === 'suspended' && (
        <div className="profile-alert profile-alert-danger">
          <ShieldAlert size={18} />
          <div>
            <p>Votre compte est suspendu suite à des signalements.</p>
            <button onClick={() => reactivate.mutate()} disabled={reactivate.isPending}>
              {reactivate.isPending ? 'Réactivation…' : 'Réactiver mon compte'}
            </button>
          </div>
        </div>
      )}
      {reportStatus === 'warning' && (
        <div className="profile-alert profile-alert-warning">
          <ShieldAlert size={18} />
          <p>Votre compte a reçu des signalements. Un compte suspendu ne peut plus être réactivé qu'une fois — faites attention.</p>
        </div>
      )}

      {pushAvailable() && pushState === 'default' && (
        <div className="profile-alert profile-alert-info">
          <Bell size={18} />
          <div>
            <p>Activez les notifications pour être prévenu même quand l'onglet est fermé.</p>
            <button onClick={enablePush} disabled={pushBusy}>
              {pushBusy ? 'Activation…' : 'Activer les notifications'}
            </button>
          </div>
        </div>
      )}
      {pushState === 'denied' && (
        <div className="profile-alert profile-alert-info">
          <Bell size={18} />
          <p>Notifications bloquées par le navigateur — autorisez-les dans les réglages du site pour les recevoir.</p>
        </div>
      )}

      <div className="profile-stats">
        <button onClick={() => navigate('/requests')}>
          <strong>{pendingRequests.data?.length ?? '—'}</strong>
          <span>Demandes en attente</span>
        </button>
        <button onClick={() => navigate('/tontines')}>
          <strong>{tontines.data?.length ?? '—'}</strong>
          <span>Tontines</span>
        </button>
      </div>

      <dl className="profile-info">
        <div>
          <dt>Téléphone</dt>
          <dd>{user.phone}</dd>
        </div>
        <div>
          <dt>Ville</dt>
          <dd>{user.ville}</dd>
        </div>
        {user.email && (
          <div>
            <dt>Email</dt>
            <dd>{user.email}</dd>
          </div>
        )}
      </dl>

      <div className="profile-links">
        {LINKS.map(({ to, label, Icon }) => (
          <button key={label} className="profile-link" onClick={() => navigate(typeof to === 'function' ? to(user.id) : to)}>
            <Icon size={18} className="profile-link-icon" />
            <span>{label}</span>
            <ChevronRight size={16} className="profile-link-arrow" />
          </button>
        ))}
      </div>

      <button className="profile-logout" onClick={logout}>
        <LogOut size={17} /> Se déconnecter
      </button>
    </div>
  );
}

function planLabel(plan: string): string {
  if (plan === 'pro') return 'Pro';
  if (plan === 'business') return 'Business';
  return 'Gratuit';
}
