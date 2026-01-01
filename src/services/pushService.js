import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';
import { supabase } from './supabaseClient';

const firebaseConfig = {
    apiKey: "AIzaSyCMinuCMh4aqW7-ExjdtF9l9jGkyDrVAR4",
    authDomain: "turnitos-lr-notif-777.firebaseapp.com",
    projectId: "turnitos-lr-notif-777",
    storageBucket: "turnitos-lr-notif-777.firebasestorage.app",
    messagingSenderId: "867339529728",
    appId: "1:867339529728:web:fbf5b2760ec7f0877072e5"
};

const app = initializeApp(firebaseConfig);

export const pushService = {
    async getMessagingInstance() {
        const supported = await isSupported();
        if (!supported) {
            console.warn('Firebase Messaging no es soportado en este navegador/entorno.');
            return null;
        }
        return getMessaging(app);
    },

    async requestPermissionAndGetToken(businessId) {
        try {
            const messaging = await this.getMessagingInstance();
            if (!messaging) return null;

            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                const token = await getToken(messaging, {
                    vapidKey: 'BM-YOUR-VAPID-KEY-HERE' // Por ahora placeholder, debe generarse en consola Firebase
                });

                if (token) {
                    console.log('Token de notificación obtenido:', token);
                    await this.saveTokenToSupabase(businessId, token);
                    return token;
                }
            } else {
                console.warn('Permiso de notificación denegado');
            }
        } catch (error) {
            console.error('Error al solicitar permiso o token:', error);
        }
        return null;
    },

    async saveTokenToSupabase(businessId, token) {
        const { error } = await supabase
            .from('push_subscriptions')
            .upsert({
                business_id: businessId,
                token: token,
                device_type: 'web',
                last_updated: new Date().toISOString()
            }, { onConflict: 'business_id,token' });

        if (error) {
            console.error('Error al guardar token en Supabase:', error);
        } else {
            console.log('Token guardado exitosamente en Supabase');
        }
    },

    async initMessageListener() {
        const messaging = await this.getMessagingInstance();
        if (!messaging) return;

        onMessage(messaging, (payload) => {
            console.log('Mensaje recibido en primer plano:', payload);
            alert(`¡Nueva Notificación!\n${payload.notification.title}: ${payload.notification.body}`);
        });
    }
};

