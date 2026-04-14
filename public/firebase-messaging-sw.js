importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyAXmwaUGwqTqkeeKqFMMSAjcBIHTMv39GU",
  authDomain: "workflow-project-studio.firebaseapp.com",
  projectId: "workflow-project-studio",
  storageBucket: "workflow-project-studio.firebasestorage.app",
  messagingSenderId: "1001279364789",
  appId: "1:1001279364789:web:8e241897ba278ba80a28fc"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  // Support both notification object (automatic) and data object (manual)
  const notificationTitle = payload.notification?.title || payload.data?.title || "Nueva Notificación";
  const notificationOptions = {
    body: payload.notification?.body || payload.data?.body || '',
    icon: '/logo.png',
    data: payload.data || payload.notification
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  
  const targetUrl = event.notification.data?.url || 'https://workflow-project-studio.web.app/dashboard';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Si el navegador ya tiene la app abierta, hacemos focus
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if ('focus' in client && client.url.includes(self.location.origin)) {
           client.navigate(targetUrl); // Opcional: Navegar a la tarea si ya está abierta
           return client.focus();
        }
      }
      // Si no hay ninguna ventana abierta de la app, abrimos una nueva
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
