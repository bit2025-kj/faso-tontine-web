import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../auth/auth-context';

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  link: string;
  createdAt: string;
  read: boolean;
}

interface NotificationsValue {
  items: NotificationItem[];
  unreadCount: number;
  push: (item: Omit<NotificationItem, 'id' | 'createdAt' | 'read'>) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
}

const NotificationsContext = createContext<NotificationsValue | undefined>(undefined);

const MAX_ITEMS = 50;

/**
 * Boîte de notifications in-app — le backend n'a pas d'endpoint de liste de
 * notifications persistées (seulement des push FCM, invisibles sur le web).
 * Les événements SSE déjà reçus par EventsBridge sont donc capturés ici et
 * gardés côté client (localStorage, par utilisateur) pour qu'un événement
 * manqué (utilisateur pas sur le bon écran au bon moment) reste consultable
 * plus tard au lieu de disparaître silencieusement — voir audit web.
 */
export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const storageKey = user ? `tontine.notifications.${user.id}` : null;
  const [items, setItems] = useState<NotificationItem[]>([]);

  useEffect(() => {
    if (!storageKey) {
      setItems([]);
      return;
    }
    try {
      const raw = localStorage.getItem(storageKey);
      setItems(raw ? JSON.parse(raw) : []);
    } catch {
      setItems([]);
    }
  }, [storageKey]);

  useEffect(() => {
    if (!storageKey) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(items));
    } catch {
      // Quota localStorage dépassé — la liste reste en mémoire pour la session en cours.
    }
  }, [storageKey, items]);

  const push = useCallback((item: Omit<NotificationItem, 'id' | 'createdAt' | 'read'>) => {
    setItems((prev) => [
      { ...item, id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, createdAt: new Date().toISOString(), read: false },
      ...prev,
    ].slice(0, MAX_ITEMS));
  }, []);

  const markRead = useCallback((id: string) => {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }, []);

  const markAllRead = useCallback(() => {
    setItems((prev) => prev.map((n) => (n.read ? n : { ...n, read: true })));
  }, []);

  const unreadCount = useMemo(() => items.filter((n) => !n.read).length, [items]);

  return (
    <NotificationsContext.Provider value={{ items, unreadCount, push, markRead, markAllRead }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications(): NotificationsValue {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationsProvider');
  return ctx;
}
