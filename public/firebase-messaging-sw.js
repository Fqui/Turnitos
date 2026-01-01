importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: "AIzaSyCMinuCMh4aqW7-ExjdtF9l9jGkyDrVAR4",
    authDomain: "turnitos-lr-notif-777.firebaseapp.com",
    projectId: "turnitos-lr-notif-777",
    storageBucket: "turnitos-lr-notif-777.firebasestorage.app",
    messagingSenderId: "867339529728",
    appId: "1:867339529728:web:fbf5b2760ec7f0877072e5"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);
    const notificationTitle = payload.notification.title;
    const notificationOptions = {
        body: payload.notification.body,
        icon: '/logo.png'
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});
