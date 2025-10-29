// firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Your Firebase config
firebase.initializeApp({
  apiKey: "AIzaSyDy2rHzcIppo617w2F4qMCsmiXelvyzvXA",
    authDomain: "continentchat.firebaseapp.com",
    projectId: "continentchat",
    storageBucket: "continentchat.firebasestorage.app",
    messagingSenderId: "324915461865",
    appId: "1:324915461865:web:dc885586cdc90c3fdeba78"
});


const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('Background notification:', payload);
  
  const title = `New message from ${payload.data?.senderName || 'Someone'}`;
  const body = `SafeChat • ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;

  return self.registration.showNotification(title, {
    body: body,
    icon: 'chaticon.png',
    badge: '/icons/icon-96x96.png',
    vibrate: [200, 100, 200],
    tag: 'safechat-message'
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      for (let client of clientList) {
        if ('focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow('/');
    })
  );
});
