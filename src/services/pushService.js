import { supabase } from './supabaseClient';

// Web Push (VAPID) for the business portal. The server side lives in the
// notify_new_booking_push trigger + the notify-new-booking edge function:
// the browser only subscribes and stores its subscription here.

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';
const SW_URL = '/sw-v2.js';

const listeners = new Set();

const urlBase64ToUint8Array = (base64String) => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const raw = window.atob(base64);
    return Uint8Array.from(raw, (c) => c.charCodeAt(0));
};

const isIOS = () => typeof navigator !== 'undefined'
    && (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

const isStandalone = () => typeof window !== 'undefined'
    && (window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true);

const isSupported = () => typeof window !== 'undefined'
    && 'serviceWorker' in navigator
    && 'PushManager' in window
    && 'Notification' in window;

const getRegistration = async () => {
    const existing = await navigator.serviceWorker.getRegistration('/');
    if (existing?.active?.scriptURL?.includes('sw-v')) return existing;
    await navigator.serviceWorker.register(SW_URL, { scope: '/' });
    return navigator.serviceWorker.ready;
};

const saveSubscription = async (businessId, subscription) => {
    const json = subscription.toJSON();
    const { error } = await supabase.rpc('save_push_subscription', {
        p_business_id: String(businessId),
        p_endpoint: json.endpoint,
        p_p256dh: json.keys?.p256dh,
        p_auth: json.keys?.auth,
        p_user_agent: navigator.userAgent
    });
    if (error) throw error;
};

const notify = () => listeners.forEach((fn) => fn());

export const pushService = {
    isConfigured: () => Boolean(VAPID_PUBLIC_KEY),

    /**
     * 'unsupported' | 'ios-install' (iPhone outside the home-screen app) |
     * 'denied' | 'off' | 'on'
     */
    async getStatus() {
        if (!isSupported()) return isIOS() && !isStandalone() ? 'ios-install' : 'unsupported';
        if (!VAPID_PUBLIC_KEY) return 'unsupported';
        if (Notification.permission === 'denied') return 'denied';
        try {
            const reg = await navigator.serviceWorker.getRegistration('/');
            const sub = await reg?.pushManager.getSubscription();
            return sub && Notification.permission === 'granted' ? 'on' : 'off';
        } catch {
            return 'off';
        }
    },

    onChange(fn) {
        listeners.add(fn);
        return () => listeners.delete(fn);
    },

    /** Asks for permission (needs a user gesture) and stores this device's subscription. */
    async enable(businessId) {
        if (!businessId) return { success: false, error: 'No hay negocio seleccionado' };
        if (!isSupported() || !VAPID_PUBLIC_KEY) {
            return { success: false, error: 'Este navegador no permite avisos' };
        }
        try {
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
                notify();
                return { success: false, error: permission === 'denied' ? 'denied' : 'Permiso no concedido' };
            }

            const reg = await getRegistration();
            let subscription = await reg.pushManager.getSubscription();
            const expectedKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
            const currentKey = subscription?.options?.applicationServerKey
                ? new Uint8Array(subscription.options.applicationServerKey)
                : null;
            // A subscription made with another key (e.g. the old Firebase one) can't receive our pushes
            if (subscription && currentKey && currentKey.join() !== expectedKey.join()) {
                await subscription.unsubscribe().catch(() => {});
                subscription = null;
            }
            if (!subscription) {
                subscription = await reg.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: expectedKey
                });
            }

            await saveSubscription(businessId, subscription);
            notify();
            return { success: true };
        } catch (error) {
            console.error('[pushService] enable error:', error);
            notify();
            const isBrave = Boolean(navigator.brave);
            return {
                success: false,
                error: isBrave
                    ? 'En Brave activá "Usar los servicios de Google para la mensajería push" en Configuración ➔ Privacidad y seguridad.'
                    : (error?.message || String(error))
            };
        }
    },

    /** Keeps an existing subscription linked to the current business (no prompt). */
    async syncIfEnabled(businessId) {
        if (!businessId || !isSupported() || !VAPID_PUBLIC_KEY || Notification.permission !== 'granted') return;
        try {
            const reg = await navigator.serviceWorker.getRegistration('/');
            const subscription = await reg?.pushManager.getSubscription();
            if (subscription) await saveSubscription(businessId, subscription);
        } catch (error) {
            console.warn('[pushService] sync warning:', error);
        }
    },

    /** Stops alerts on this device (used on logout too, while the session is still valid). */
    async disable() {
        if (!isSupported()) return;
        try {
            const reg = await navigator.serviceWorker.getRegistration('/');
            const subscription = await reg?.pushManager.getSubscription();
            if (!subscription) return;
            await supabase.from('push_subscriptions').delete().eq('endpoint', subscription.endpoint);
            await subscription.unsubscribe();
        } catch (error) {
            console.warn('[pushService] disable warning:', error);
        } finally {
            notify();
        }
    },

    isIOS,
    isStandalone
};

export default pushService;
