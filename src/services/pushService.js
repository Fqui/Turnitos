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
            if (typeof window === 'undefined' || !('Notification' in window)) {
                return { success: false, error: 'Tu navegador no soporta notificaciones' };
            }

            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
                return { success: false, error: `Permiso de notificación en estado: ${permission}` };
            }

            let token = null;
            let bravePushNotice = null;

            try {
                let swRegistration = null;
                if ('serviceWorker' in navigator) {
                    try {
                        swRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
                    } catch (swErr) {
                        console.warn('Error registrando firebase-messaging-sw.js:', swErr);
                    }
                }

                const messaging = await this.getMessagingInstance();
                if (messaging) {
                    const tokenOptions = {
                        vapidKey: 'BLqMh62YlzvkaC_E7wHWtxiVbtK3Ip5BC6fXp3FcA7MBOW3JpGR3LmCNRkMP4C8H17vl51j0R4NKSt3xg4ExAz4'
                    };
                    if (swRegistration) {
                        tokenOptions.serviceWorkerRegistration = swRegistration;
                    }

                    token = await getToken(messaging, tokenOptions);

                    if (token && businessId) {
                        await this.saveTokenToSupabase(businessId, token);
                    }
                }
            } catch (pushErr) {
                console.warn('Push registration warning (e.g. Brave/Shields):', pushErr);
                const isBrave = (navigator.brave && typeof navigator.brave.isBrave === 'function' && await navigator.brave.isBrave()) || false;
                if (isBrave || (pushErr.message && (pushErr.message.includes('push service error') || pushErr.message.includes('Registration failed')))) {
                    bravePushNotice = '🦁 Alertas activadas. Si usás Brave, para recibir avisos con la app cerrada podés activar en: Configuración de Brave ➔ Privacidad y seguridad ➔ "Usar los servicios de Google para la mensajería push".';
                }
            }

            return {
                success: true,
                token: token,
                warning: bravePushNotice
            };
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

        // Never notify for blocked slots or admin blockages
        const isBlocked = bookingInfo?.status === 'blocked' ||
            bookingInfo?.is_blocked ||
            bookingInfo?.isBlocked ||
            String(bookingInfo?.status || '').toLowerCase() === 'blocked' ||
            String(bookingInfo?.customerName || '').toUpperCase().includes('BLOQUEADO') ||
            String(bookingInfo?.customer_name || '').toUpperCase().includes('BLOQUEADO') ||
            String(bookingInfo?.notes || '').toUpperCase().includes('BLOQUEADO') ||
            String(bookingInfo?.title || '').toUpperCase().includes('BLOQUEADO') ||
            String(bookingInfo?.customerPhone || '') === '-' ||
            String(bookingInfo?.customer_phone || '') === '-';

        if (isBlocked) return;

        const customerName = bookingInfo.customerName || bookingInfo.customer_name || 'Un cliente';
        const title = '🔔 ¡Nueva Reserva Web Recibida!';
        const body = `${customerName} solicitó una reserva para el ${bookingInfo.date || 'día indicado'} en ${bookingInfo.businessName || 'tu negocio'}.`;

        // 1. Instant local HTML5 BroadcastChannel for multi-tab synchronization in same browser
        try {
            if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
                const bc = new BroadcastChannel(`turnitos-live-${businessId}`);
                bc.postMessage({
                    type: 'new_booking',
                    businessId,
                    bookingInfo: { ...bookingInfo, customerName },
                    title,
                    body,
                    timestamp: Date.now()
                });
                setTimeout(() => {
                    try { bc.close(); } catch (e) { }
                }, 1000);
            }
        } catch (bcErr) {
            console.warn('[pushService] Local BroadcastChannel warning:', bcErr);
        }

        // 2. Supabase Realtime Channel Broadcast for cross-device / open portal instances
        try {
            const channel = supabase.channel(`business-notif-${businessId}`);
            channel.subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    try {
                        await channel.send({
                            type: 'broadcast',
                            event: 'new_booking',
                            payload: { title, body, bookingInfo: { ...bookingInfo, customerName } }
                        });
                    } catch (sendErr) {
                        console.warn('[pushService] Realtime channel send error:', sendErr);
                    } finally {
                        setTimeout(() => {
                            try { supabase.removeChannel(channel); } catch (e) { }
                        }, 3000);
                    }
                }
            });
        } catch (e) {
            console.warn('[pushService] Supabase broadcast error:', e);
        }

        // 3. Trigger local desktop browser notification if active
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
            try {
                new Notification(title, {
                    body: body,
                    icon: '/logo-turnitos.png',
                    badge: '/logo-turnitos.png'
                });
            } catch (e) { }
        }

        // 4. FCM push notification tokens in database
        try {
            const { data: subs, error } = await supabase
                .from('push_subscriptions')
                .select('token')
                .eq('business_id', businessId);

            if (error || !subs || subs.length === 0) {
                return;
            }

            for (const sub of subs) {
                if (!sub.token) continue;
                try {
                    await fetch('https://fcm.googleapis.com/fcm/send', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            to: sub.token,
                            notification: {
                                title: title,
                                body: body,
                                icon: '/logo-turnitos.png'
                            },
                            data: {
                                url: '/portal',
                                businessId: businessId,
                                date: bookingInfo.date || ''
                            }
                        })
                    });
                } catch (sendErr) {
                    console.warn('[pushService] Error sending to token:', sub.token, sendErr);
                }
            }
        } catch (err) {
            console.warn('[pushService] FCM push notification warning:', err);
        }
    }
};

export default pushService;

