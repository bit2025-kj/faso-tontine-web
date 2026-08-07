// Service worker Firebase Cloud Messaging — reçoit les notifications push
// quand l'onglet est en arrière-plan ou fermé. Doit vivre à la racine du
// site (portée par défaut du SDK) — voir lib/push.ts pour l'enregistrement.
// La config Firebase web n'est pas un secret (comme la clé VAPID publique) :
// c'est le même modèle que l'app mobile, protégé par les règles serveur, pas
// par la confidentialité de ces valeurs.
importScripts('https://www.gstatic.com/firebasejs/12.17.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.17.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyBr9tsQc87jYNLgBLTns786YquNn12HXfw',
  authDomain: 'tontine-app-6b013.firebaseapp.com',
  projectId: 'tontine-app-6b013',
  storageBucket: 'tontine-app-6b013.firebasestorage.app',
  messagingSenderId: '255533452469',
  appId: '1:255533452469:web:98f812cfe3e76fcff3c2fc',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title ?? 'Faso Tontine';
  const body = payload.notification?.body ?? '';
  self.registration.showNotification(title, {
    body,
    icon: '/logo.png',
    data: payload.data,
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.link || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    }),
  );
});
