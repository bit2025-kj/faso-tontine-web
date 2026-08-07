import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './auth-context';

export default function RequireAuth() {
  const { user, isReady } = useAuth();

  if (!isReady) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        Chargement…
      </div>
    );
  }

  if (!user || !user.profile_complete) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
