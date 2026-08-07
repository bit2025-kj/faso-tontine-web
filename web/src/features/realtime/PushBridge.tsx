import { useEffect } from 'react';
import { useAuth } from '../auth/auth-context';
import { listenForegroundPush, refreshPushTokenIfGranted } from '../../lib/push';
import { useNotifications } from '../notifications/notifications-context';

/**
 * No UI of its own — mirrors EventsBridge's pattern. Re-registers the FCM
 * token silently when the browser already granted permission (e.g. a token
 * the browser rotated), and feeds foreground push messages into the in-app
 * notification inbox since the service worker only shows a native
 * notification while the tab is backgrounded.
 */
export default function PushBridge() {
  const { user } = useAuth();
  const { push } = useNotifications();

  useEffect(() => {
    if (!user) return;
    refreshPushTokenIfGranted();
  }, [user]);

  useEffect(() => {
    return listenForegroundPush((title, body, link) => {
      push({ title, body, link: link ?? '/' });
    });
  }, [push]);

  return null;
}
