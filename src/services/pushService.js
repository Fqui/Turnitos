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
                let swRegistration = null;
                if ('serviceWorker' in navigator) {
                    try {
                        swRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
                    } catch (swErr) {
                        console.warn('Error registrando firebase-messaging-sw.js:', swErr);
                    }
                }

                const tokenOptions = {
                    vapidKey: 'BLqMh62YlzvkaC_E7wHWtxiVbtK3Ip5BC6fXp3FcA7MBOW3JpGR3LmCNRkMP4C8H17vl51j0R4NKSt3xg4ExAz4'
                };
                if (swRegistration) {
                    tokenOptions.serviceWorkerRegistration = swRegistration;
                }

                const token = await getToken(messaging, tokenOptions);

                if (token) {
                    if (businessId) {
                        await this.saveTokenToSupabase(businessId, token);
                    }
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
    async requestPermissionAndGetTokenDetailed(businessId) {
        try {
            const messaging = await this.getMessagingInstance();
            if (!messaging) return { success: false, error: 'Firebase Messaging no está soportado en este dispositivo/navegador' };

            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
                return { success: false, error: `Permiso de notificación en estado: ${permission}` };
            }

            let swRegistration = null;
            if ('serviceWorker' in navigator) {
                try {
                    swRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
                } catch (swErr) {
                    console.warn('Error registrando firebase-messaging-sw.js:', swErr);
                }
            }

            const tokenOptions = {
                vapidKey: 'BLqMh62YlzvkaC_E7wHWtxiVbtK3Ip5BC6fXp3FcA7MBOW3JpGR3LmCNRkMP4C8H17vl51j0R4NKSt3xg4ExAz4'
            };
            if (swRegistration) {
                tokenOptions.serviceWorkerRegistration = swRegistration;
            }

            const token = await getToken(messaging, tokenOptions);

            if (token) {
                if (businessId) {
                    await this.saveTokenToSupabase(businessId, token);
                }
                return { success: true, token };
            } else {
                return { success: false, error: 'No se pudo generar el token de Firebase' };
            }
        } catch (error) {
            console.error('Error al solicitar permiso o token:', error);
            return { success: false, error: error.message || String(error) };
        }
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
        }
    },

    async initMessageListener() {
        const messaging = await this.getMessagingInstance();
        if (!messaging) return;

        onMessage(messaging, (payload) => {
            alert(`¡Nueva Notificación!\n${payload.notification.title}: ${payload.notification.body}`);
        });
    },

    async notifyBusinessNewBooking(businessId, bookingInfo = {}) {
        if (!businessId) return;
        try {
            const { data: subs, error } = await supabase
                .from('push_subscriptions')
                .select('token')
                .eq('business_id', businessId);

            if (error || !subs || subs.length === 0) {
                console.log('[pushService] Sin suscripciones push activas para el negocio:', businessId);
                return;
            }

            const title = '🔔 ¡Nueva Reserva Web Recibida!';
            const body = `${bookingInfo.customerName ? bookingInfo.customerName : 'Un cliente'} solicitó una reserva para el ${bookingInfo.date || 'día indicado'} en ${bookingInfo.businessName || 'tu negocio'}.`;

            // Broadcast via Supabase Realtime for open portal instances
            try {
                const channel = supabase.channel(`business-notif-${businessId}`);
                channel.send({
                    type: 'broadcast',
                    event: 'new_booking',
                    payload: { title, body, bookingInfo }
                });
            } catch (e) {
                console.warn('[pushService] Realtime broadcast error:', e);
            }

            // Trigger local browser notification if allowed on the active device
            if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
                try {
                    new Notification(title, {
                        body: body,
                        icon: '/logo-turnitos.png',
                        badge: '/logo-turnitos.png'
                    });
                } catch (e) { }
            }
        } catch (err) {
            console.error('[pushService] Error notifying business of new booking:', err);
        }
    }
};

export default pushService;

