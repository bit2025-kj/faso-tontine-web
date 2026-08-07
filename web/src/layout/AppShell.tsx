import { Bell, Compass, MessageCircle, User, Users } from 'lucide-react';
import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import OnboardingCarousel from '../components/OnboardingCarousel';
import { useNotifications } from '../features/notifications/notifications-context';
import './app-shell.css';

const TABS = [
  { to: '/', label: 'Découvrir', Icon: Compass, end: true },
  { to: '/tontines', label: 'Mes tontines', Icon: Users },
  { to: '/messages', label: 'Messages', Icon: MessageCircle },
  { to: '/profile', label: 'Profil', Icon: User },
];

const ONBOARDING_KEY = 'tontine.onboarding.seen';

export default function AppShell() {
  const [showOnboarding, setShowOnboarding] = useState(
    () => localStorage.getItem(ONBOARDING_KEY) !== 'true',
  );

  function finishOnboarding() {
    localStorage.setItem(ONBOARDING_KEY, 'true');
    setShowOnboarding(false);
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <img src="/logo.png" alt="" className="app-header-logo" />
        <span className="app-header-title">Faso Tontine</span>
        <NotificationsBell />
      </header>

      <main className="app-content">
        <Outlet />
      </main>

      <nav className="app-tabbar">
        {TABS.map(({ to, label, Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => `app-tab${isActive ? ' app-tab-active' : ''}`}>
            <Icon className="app-tab-icon" size={22} strokeWidth={2} aria-hidden="true" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {showOnboarding && <OnboardingCarousel onFinish={finishOnboarding} />}
    </div>
  );
}

function NotificationsBell() {
  const { items, unreadCount, markRead, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="app-notif-wrap">
      <button
        className="app-notif-btn"
        onClick={() => setOpen((v) => !v)}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} non lues)` : ''}`}
      >
        <Bell size={20} />
        {unreadCount > 0 && <span className="app-notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
      </button>
      {open && (
        <div className="app-notif-panel" onMouseLeave={() => setOpen(false)}>
          <div className="app-notif-panel-head">
            <span>Notifications</span>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="app-notif-mark-all">
                Tout marquer comme lu
              </button>
            )}
          </div>
          {items.length === 0 ? (
            <p className="app-notif-empty">Aucune notification pour l'instant.</p>
          ) : (
            <ul className="app-notif-list">
              {items.map((n) => (
                <li key={n.id}>
                  <button
                    className={`app-notif-item${n.read ? '' : ' app-notif-item-unread'}`}
                    onClick={() => {
                      markRead(n.id);
                      setOpen(false);
                      navigate(n.link);
                    }}
                  >
                    <span className="app-notif-item-title">{n.title}</span>
                    <span className="app-notif-item-body">{n.body}</span>
                    <span className="app-notif-item-time">
                      {new Date(n.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
