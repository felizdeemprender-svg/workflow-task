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
  const notificationTitle = payload.notification.title || "Nueva Notificación";
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/logo.png', // Fallback if logo exists
    data: payload.data
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
