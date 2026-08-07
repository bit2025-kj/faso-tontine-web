import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getMessaging, getToken, isSupported, onMessage, type Messaging } from 'firebase/messaging';
import { api } from './api';

// Même projet Firebase que les apps mobiles (tontine-app-6b013) — voir
// newapp1/android/app/google-services.json. Ces valeurs ne sont pas des
// secrets : la sécurité vient des règles serveur, pas de leur confidentialité.
const firebaseConfig = {
  apiKey: 'AIzaSyBr9tsQc87jYNLgBLTns786YquNn12HXfw',
  authDomain: 'tontine-app-6b013.firebaseapp.com',
  projectId: 'tontine-app-6b013',
  storageBucket: 'tontine-app-6b013.firebasestorage.app',
  messagingSenderId: '255533452469',
  appId: '1:255533452469:web:98f812cfe3e76fcff3c2fc',
};

// Clé publique VAPID (Web Push) — Console Firebase → Paramètres du projet →
// Cloud Messaging → Configuration Web Push.
const VAPID_KEY = 'BMtue6GxcsO5-RxjotIw1FaxYhPvh0kKBr9ny1qWakAn3Gruv8bcp6pvyyMG_DiFfCKHNQTfuR7tutRoMiqv3P4';

let app: FirebaseApp | undefined;
let messagingPromise: Promise<Messaging | null> | undefined;

function getMessagingInstance(): Promise<Messaging | null> {
  if (!messagingPromise) {
    messagingPromise = (async () => {
      if (!VAPID_KEY) return null;
      if (!('Notification' in window) || !('serviceWorker' in navigator)) return null;
      if (!(await isSupported())) return null;
      if (!app) app = initializeApp(firebaseConfig);
      return getMessaging(app);
    })();
  }
  return messagingPromise;
}

export function pushAvailable(): boolean {
  return Boolean(VAPID_KEY) && 'Notification' in window;
}

export type PushPermission = 'granted' | 'denied' | 'default' | 'unsupported';

export function pushPermissionState(): PushPermission {
  if (!pushAvailable()) return 'unsupported';
  return Notification.permission;
}

/** Demande la permission (déclenché par un geste utilisateur explicite) et enregistre le token côté backend. */
export async function registerPushToken(): Promise<boolean> {
  const messaging = await getMessagingInstance();
  if (!messaging) return false;

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return false;

  const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
  const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: registration });
  if (!token) return false;

  await api.put('/auth/fcm-token', { fcm_token: token });
  return true;
}

/** Ré-enregistre silencieusement le token si la permission a déjà été accordée (ex: token tourné par le navigateur). */
export async function refreshPushTokenIfGranted(): Promise<void> {
  if (pushPermissionState() !== 'granted') return;
  try {
    await registerPushToken();
  } catch {
    // Best-effort — un échec silencieux ici n'empêche pas l'app de fonctionner.
  }
}

/** Messages reçus alors que l'onglet est au premier plan (le SW ne les affiche pas dans ce cas). */
export function listenForegroundPush(onPush: (title: string, body: string, link?: string) => void): () => void {
  let unsub: (() => void) | undefined;
  let cancelled = false;
  getMessagingInstance().then((messaging) => {
    if (!messaging || cancelled) return;
    unsub = onMessage(messaging, (payload) => {
      onPush(
        payload.notification?.title ?? 'Faso Tontine',
        payload.notification?.body ?? '',
        (payload.data as Record<string, string> | undefined)?.link,
      );
    });
  });
  return () => {
    cancelled = true;
    unsub?.();
  };
}
