import { create } from 'zustand';
import serviceAdapter from '../services/serviceAdapter';
import { supabase } from '../services/supabaseClient';

const playNotificationChime = () => {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        const now = ctx.currentTime;

        // Tone 1 (E5)
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(659.25, now);
        gain1.gain.setValueAtTime(0.3, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start(now);
        osc1.stop(now + 0.3);

        // Tone 2 (A5)
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(880, now + 0.12);
        gain2.gain.setValueAtTime(0.35, now + 0.12);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(now + 0.12);
        osc2.stop(now + 0.5);
    } catch {
        // Audio might be muted or awaiting interaction
    }
};

export const useBookingsStore = create((set, get) => {
    let realtimeSubscription = null;
    let notifChannel = null;
    let localBroadcast = null;
    let pollingInterval = null;

    return {
        bookings: [],
        loading: false,
        setLoading: (loading) => set({ loading }),
        reschedulingBooking: null,
        newBookingAlert: null,

        fetchBookings: async (businessId, isSilent = false) => {
            if (!businessId) return;
            if (!isSilent) set({ loading: true });

            try {
                const response = await serviceAdapter.getBookings(businessId);
                if (response && response.bookings) {
                    set({ bookings: response.bookings });
                }
            } catch (error) {
                console.error('Error fetching bookings:', error);
            } finally {
                if (!isSilent) set({ loading: false });
            }
        },

        setBookings: (bookingsOrUpdater) => {
            set((state) => ({
                bookings: typeof bookingsOrUpdater === 'function'
                    ? bookingsOrUpdater(state.bookings)
                    : bookingsOrUpdater
            }));
        },

        updateBookingInList: (bookingId, updates) => {
            set((state) => ({
                bookings: state.bookings.map((b) =>
                    String(b.id) === String(bookingId) ? { ...b, ...updates } : b
                )
            }));
        },

        removeBookingFromList: (bookingId) => {
            set((state) => ({
                bookings: state.bookings.filter((b) => String(b.id) !== String(bookingId))
            }));
        },

        setReschedulingBooking: (booking) => set({ reschedulingBooking: booking }),
        setNewBookingAlert: (alert) => set({ newBookingAlert: alert }),

        subscribeToRealtime: (businessId, onAlertToast) => {
            if (!businessId) return;

            // Clear previous subscriptions
            get().unsubscribeRealtime();

            const handleNewBookingAlert = (bookingData, customTitle) => {
                if (!bookingData) return;
                const isBlocked = bookingData?.status === 'blocked' ||
                    bookingData?.is_blocked ||
                    bookingData?.isBlocked ||
                    String(bookingData?.status || '').toLowerCase() === 'blocked' ||
                    String(bookingData?.customer_name || '').toUpperCase().includes('BLOQUEADO') ||
                    String(bookingData?.customerName || '').toUpperCase().includes('BLOQUEADO') ||
                    String(bookingData?.notes || '').toUpperCase().includes('BLOQUEADO') ||
                    String(bookingData?.customer_email || '') === '-' ||
                    String(bookingData?.customer_phone || '') === '-';

                if (!isBlocked) {
                    const customerName = bookingData.customer_name || bookingData.customerName || 'Un cliente';
                    set({ newBookingAlert: bookingData });
                    playNotificationChime();

                    if (typeof onAlertToast === 'function') {
                        onAlertToast(customTitle || `🔔 ¡Nueva reserva web de ${customerName}!`, 'success', 8000);
                    }

                    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
                        try {
                            new Notification('🔔 ¡Nueva Reserva Web Recibida!', {
                                body: `${customerName} solicitó una reserva para el ${bookingData.date || 'día indicado'}`,
                                icon: '/logo-turnitos.png'
                            });
                        } catch {
                            // Ignored if notifications blocked
                        }
                    }
                }
            };

            // 1. Adapter subscription (Supabase Realtime on bookings table)
            realtimeSubscription = serviceAdapter.subscribeToBookings(businessId, (payload) => {
                get().fetchBookings(businessId, true);
                if (payload?.eventType === 'INSERT' && payload?.new) {
                    handleNewBookingAlert(payload.new);
                }
            });

            // 2. Broadcast Channel on Supabase
            try {
                notifChannel = supabase.channel(`business-notif-${businessId}`)
                    .on('broadcast', { event: 'new_booking' }, (payload) => {
                        const info = payload?.payload?.bookingInfo;
                        handleNewBookingAlert(info, payload?.payload?.title);
                        get().fetchBookings(businessId, true);
                    })
                    .subscribe();
            } catch (e) {
                console.warn('Supabase notif channel error:', e);
            }

            // 3. Window BroadcastChannel for cross-tab sync
            try {
                if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
                    localBroadcast = new BroadcastChannel(`turnitos-live-${businessId}`);
                    localBroadcast.onmessage = (event) => {
                        if (event?.data?.type === 'new_booking') {
                            handleNewBookingAlert(event.data.bookingInfo, event.data.title);
                            get().fetchBookings(businessId, true);
                        }
                    };
                }
            } catch (bcErr) {
                console.warn('BroadcastChannel error:', bcErr);
            }

            // 4. Polling fallback every 30 seconds
            pollingInterval = setInterval(() => {
                get().fetchBookings(businessId, true);
            }, 30000);
        },

        unsubscribeRealtime: () => {
            if (realtimeSubscription && typeof realtimeSubscription.unsubscribe === 'function') {
                try {
                    realtimeSubscription.unsubscribe();
                } catch {
                    // Safe cleanup
                }
                realtimeSubscription = null;
            }
            if (notifChannel) {
                try {
                    supabase.removeChannel(notifChannel);
                } catch {
                    // Safe cleanup
                }
                notifChannel = null;
            }
            if (localBroadcast) {
                try {
                    localBroadcast.close();
                } catch {
                    // Safe cleanup
                }
                localBroadcast = null;
            }
            if (pollingInterval) {
                clearInterval(pollingInterval);
                pollingInterval = null;
            }
        }
    };
});
