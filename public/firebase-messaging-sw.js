/* eslint-disable no-undef */
// Service Worker oficial de Firebase Cloud Messaging para Pequeños Héroes
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyCK7GgC-YzFgcBfgcz_Bu2bDsHxstDCfm4",
  projectId: "kinder-pickup-e5a82",
  messagingSenderId: "176374513165",
  appId: "1:176374513165:web:4e28324abebcd727061f44"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Mensaje en segundo plano recibido:', payload);
  const notificationTitle = payload.notification?.title || payload.data?.title || "Pequeños Héroes";
  const notificationOptions = {
    body: payload.notification?.body || payload.data?.body || "Aviso de salida escolar: confirma quién retira.",
    icon: "/logo.png",
    badge: "/logo.png",
    vibrate: [200, 100, 200],
    tag: "kinder-pickup-alert",
    renotify: true,
    data: payload.data || { url: "/" }
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (let client of windowClients) {
        if (client.url.includes(urlToOpen) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
