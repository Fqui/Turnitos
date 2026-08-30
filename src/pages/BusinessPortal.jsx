import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import supabaseService from '../services/supabaseService';
import serviceAdapter from '../services/serviceAdapter';
import analyticsService from '../services/analyticsService';
import { CalendarWrapper } from '../components/calendars';
import { getCalendarType, getSlotConfig } from '../components/calendars/shared/config';
import { pushService } from '../services/pushService';
import ClientManagement from '../components/ClientManagement';
import BusinessSettings from '../components/BusinessSettings';
import VenueSettings from '../components/venue/VenueSettings';
import { formatDisplayDate } from '../utils/dateUtils';
import BusinessLogin from '../components/business/BusinessLogin';
import BusinessPortalSidebar from '../components/business/BusinessPortalSidebar';
import BookingDetailsModal from '../components/business/BookingDetailsModal';
import NewBookingModal from '../components/business/NewBookingModal';
import BlockSlotModal from '../components/business/BlockSlotModal';
import ChangePasswordModal from '../components/seller/ChangePasswordModal';
import ConfirmModal from '../components/common/ConfirmModal';
import BusinessSubscriptionView from '../components/business/BusinessSubscriptionView';
import UpcomingRemindersCard from '../components/business/UpcomingRemindersCard';
import PortalAnalyticsView from '../components/business/portal/PortalAnalyticsView';
import PortalListView from '../components/business/portal/PortalListView';
import PortalNewBookingAlert from '../components/business/portal/PortalNewBookingAlert';
import { useNotification } from '../contexts/NotificationContext';

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
    } catch (e) {
        // Audio might be muted or awaiting interaction
    }
};

export default function BusinessPortal() {
    const { showToast } = useNotification();
    const [businesses, setBusinesses] = useState([]);
    const [selectedBusinessId, setSelectedBusinessId] = useState('');
    const [loginEmail, setLoginEmail] = useState('');
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [requirePasswordChange, setRequirePasswordChange] = useState(false);
    const [currentBusinessId, setCurrentBusinessId] = useState(null);
    const [showBlockModal, setShowBlockModal] = useState(false);
    const [pendingBlockData, setPendingBlockData] = useState(null);
    const [newBookingAlert, setNewBookingAlert] = useState(null);

    useEffect(() => {
        const checkAutoLogin = async () => {
            const mustChangePassword = localStorage.getItem('turnitos_must_change_password') === 'true';

            // New format (from the unified /admin/login)
            const storedBusiness = localStorage.getItem('business');
            if (storedBusiness) {
                try {
                    const biz = JSON.parse(storedBusiness);
                    if (biz && biz.id) {
                        const [businessesData, detailedBiz] = await Promise.all([
                            serviceAdapter.getBusinesses(),
                            serviceAdapter.getBusinessById(biz.id).catch(() => null)
                        ]);
                        const fullBiz = detailedBiz || businessesData.find(b => String(b.id) === String(biz.id)) || biz;
                        const finalBusinesses = businessesData.map(b => String(b.id) === String(fullBiz.id) ? fullBiz : b);
                        if (!finalBusinesses.some(b => String(b.id) === String(fullBiz.id))) {
                            finalBusinesses.push(fullBiz);
                        }

                        if (mustChangePassword || fullBiz.password_changed === false) {
                            setRequirePasswordChange(true);
                            setCurrentBusinessId(fullBiz.id);
                            setSelectedBusinessId(fullBiz.id);
                            setBusinesses(finalBusinesses);
                            setLoginEmail(fullBiz.email);
                            return;
                        }
                        setSelectedBusinessId(fullBiz.id);
                        setBusinesses(finalBusinesses);
                        setIsLoggedIn(true);
                        setLoginEmail(fullBiz.email);
                        return;
                    }
                } catch (err) {
                    // Auto-login failed silently
                }
            }

            // Legacy format (old business login at /portal)
            const storedEmail = localStorage.getItem('turnitos_business_email');
            if (storedEmail) {
                setLoginEmail(storedEmail);
                setRememberMe(true);
                try {
                    const businessesData = await serviceAdapter.getBusinesses();
                    const biz = businessesData.find(b => b.email === storedEmail);
                    if (biz) {
                        const detailedBiz = await serviceAdapter.getBusinessById(biz.id).catch(() => null);
                        const fullBiz = detailedBiz || biz;
                        const finalBusinesses = businessesData.map(b => String(b.id) === String(fullBiz.id) ? fullBiz : b);

                        if (mustChangePassword || fullBiz.password_changed === false) {
                            setRequirePasswordChange(true);
                            setCurrentBusinessId(fullBiz.id);
                            setSelectedBusinessId(fullBiz.id);
                            setBusinesses(finalBusinesses);
                            return;
                        }
                        setSelectedBusinessId(fullBiz.id);
                        setBusinesses(finalBusinesses);
                        setIsLoggedIn(true);
                    }
                } catch (err) {
                    // Auto-login failed silently
                }
            }
        };
        checkAutoLogin();
    }, []);

    const [viewMode, setViewMode] = useState('calendar'); // 'calendar', 'list', 'analytics', 'settings', 'customers', 'subscription'

    // Scroll to top of page whenever switching view modes
    useEffect(() => {
        window.scrollTo(0, 0);
    }, [viewMode]);

    // Analytics state
    const [metrics, setMetrics] = useState(null);
    const [trends, setTrends] = useState([]);
    const [peakHours, setPeakHours] = useState(null);
    const [customerInsights, setCustomerInsights] = useState(null);
    const [dateRange, setDateRange] = useState(null);
    const [analyticsLoading, setAnalyticsLoading] = useState(false);

    // Compute analytics data when entering analytics view or changing date range/business/bookings
    useEffect(() => {
        if (!selectedBusinessId || viewMode !== 'analytics') return;

        try {
            const result = analyticsService.computeAnalyticsFromBookings(bookings, dateRange);
            if (result) {
                setMetrics(result.metrics);
                setTrends(result.trends || []);
                setPeakHours(result.peakHours);
                setCustomerInsights(result.customerInsights);
            }
        } catch (err) {
            console.error("Error computing analytics data:", err);
        }
    }, [selectedBusinessId, viewMode, dateRange, bookings]);

    // Booking Modal State
    const [selectedBooking, setSelectedBooking] = useState(null);
    const [showBookingModal, setShowBookingModal] = useState(false);
    const [showNewBookingModal, setShowNewBookingModal] = useState(false);
    const [newBookingData, setNewBookingData] = useState({
        date: '',
        time: '',
        customerName: '',
        customerPhone: '',
        serviceId: '',
        price: 0
    });

    const [reschedulingBooking, setReschedulingBooking] = useState(null);
    const [confirmModal, setConfirmModal] = useState({ isOpen: false });

    const [listFilters, setListFilters] = useState({
        search: '',
        status: 'all',
        date: ''
    });

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(15);

    // Reset page when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [listFilters, selectedBusinessId]);

    // Responsive state
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 1024);
    const [showSidebar, setShowSidebar] = useState(window.innerWidth > 1024);

    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth <= 1024;
            setIsMobile(mobile);
            if (!mobile) setShowSidebar(true);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        const loadBusinesses = async () => {
            try {
                const data = await serviceAdapter.getBusinesses();
                if (selectedBusinessId) {
                    const detailedBiz = await serviceAdapter.getBusinessById(selectedBusinessId).catch(() => null);
                    if (detailedBiz) {
                        const merged = data.map(b => String(b.id) === String(selectedBusinessId) ? detailedBiz : b);
                        if (!merged.some(b => String(b.id) === String(selectedBusinessId))) {
                            merged.push(detailedBiz);
                        }
                        setBusinesses(merged);
                        return;
                    }
                }
                setBusinesses(data);
            } catch (error) {
                console.error('Error loading businesses:', error);
            }
        };
        loadBusinesses();
    }, [selectedBusinessId]);

    // Theme Management
    const [theme, setTheme] = useState(() => {
        return localStorage.getItem('theme') || 'light';
    });

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prev => prev === 'light' ? 'dark' : 'light');
    };

    const handleLogin = async (email, inputPassword, remember) => {
        if (!email || !inputPassword) {
            alert('Por favor complete todos los campos');
            return;
        }

        setLoginEmail(email);
        setRememberMe(remember);
        setLoading(true);
        try {
            const business = await serviceAdapter.login(email, inputPassword);
            if (business) {
                if (business.requirePasswordChange) {
                    setRequirePasswordChange(true);
                    setCurrentBusinessId(business.id);
                    setLoading(false);
                    return;
                }

                const fullBusiness = await serviceAdapter.getBusinessById(business.id) || business;
                setBusinesses(prev => {
                    const exists = prev.some(b => String(b.id) === String(fullBusiness.id));
                    return exists
                        ? prev.map(b => String(b.id) === String(fullBusiness.id) ? fullBusiness : b)
                        : [...prev, fullBusiness];
                });
                setSelectedBusinessId(business.id);
                setIsLoggedIn(true);

                if (remember) {
                    localStorage.setItem('turnitos_business_email', email);
                } else {
                    localStorage.removeItem('turnitos_business_email');
                }

                try {
                    await pushService.requestPermissionAndGetToken(business.id);
                } catch (pushError) {
                    console.warn('No se pudieron activar las notificaciones push:', pushError);
                }
            }
        } catch (error) {
            console.error('Login error:', error);
            alert('Error de inicio de sesión: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchBookings = async (isSilent = false) => {
        if (!isSilent) {
            setLoading(true);
        }
        try {
            const response = await serviceAdapter.getBookings(selectedBusinessId);
            if (response.bookings) {
                setBookings(response.bookings);
            }

            if (!isSilent) {
                const businessData = await serviceAdapter.getBusinessById(selectedBusinessId);
                if (businessData) {
                    setBusinesses(prev => {
                        const exists = prev.some(b => String(b.id) === String(businessData.id));
                        return exists
                            ? prev.map(b => String(b.id) === String(businessData.id) ? businessData : b)
                            : [...prev, businessData];
                    });
                }
            }
        } catch (error) {
            console.error('Error fetching bookings:', error);
            if (!isSilent) {
                showToast('Error al actualizar reservas', 'error');
            }
        } finally {
            if (!isSilent) {
                setLoading(false);
            }
        }
    };

    useEffect(() => {
        if (isLoggedIn && selectedBusinessId) {
            fetchBookings(bookings.length > 0);

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
                    setNewBookingAlert(bookingData);
                    playNotificationChime();
                    showToast(customTitle || `🔔 ¡Nueva reserva web de ${customerName}!`, 'success', 8000);

                    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
                        try {
                            new Notification('🔔 ¡Nueva Reserva Web Recibida!', {
                                body: `${customerName} solicitó una reserva para el ${bookingData.date || 'día indicado'}`,
                                icon: '/logo-turnitos.png'
                            });
                        } catch (e) { }
                    }
                }
            };

            const subscription = serviceAdapter.subscribeToBookings(selectedBusinessId, (payload) => {
                fetchBookings(true);
                if (payload.eventType === 'INSERT' && payload.new) {
                    handleNewBookingAlert(payload.new);
                }
            });

            const notifChannel = supabase.channel(`business-notif-${selectedBusinessId}`)
                .on('broadcast', { event: 'new_booking' }, (payload) => {
                    const info = payload?.payload?.bookingInfo;
                    handleNewBookingAlert(info, payload?.payload?.title);
                    fetchBookings(true);
                })
                .subscribe();

            let localBroadcast = null;
            try {
                if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
                    localBroadcast = new BroadcastChannel(`turnitos-live-${selectedBusinessId}`);
                    localBroadcast.onmessage = (event) => {
                        if (event?.data?.type === 'new_booking') {
                            handleNewBookingAlert(event.data.bookingInfo, event.data.title);
                            fetchBookings(true);
                        }
                    };
                }
            } catch (bcErr) {
                console.warn('BroadcastChannel error:', bcErr);
            }

            const pollingInterval = setInterval(() => {
                fetchBookings(true);
            }, 30000);

            return () => {
                if (subscription && typeof subscription.unsubscribe === 'function') {
                    subscription.unsubscribe();
                }
                if (notifChannel) {
                    try { supabase.removeChannel(notifChannel); } catch (e) { }
                }
                if (localBroadcast) {
                    try { localBroadcast.close(); } catch (e) { }
                }
                clearInterval(pollingInterval);
            };
        }
    }, [isLoggedIn, selectedBusinessId]);

    const fetchAnalytics = async () => {
        try {
            const [metricsData, trendsData, peakHoursData, insightsData] = await Promise.all([
                analyticsService.getBusinessMetrics(selectedBusinessId, dateRange),
                analyticsService.getBookingTrends(selectedBusinessId, 'daily', 30),
                analyticsService.getPeakHours(selectedBusinessId),
                analyticsService.getCustomerInsights(selectedBusinessId)
            ]);

            setMetrics(metricsData);
            setTrends(trendsData);
            setPeakHours(peakHoursData);
            setCustomerInsights(insightsData);
        } catch (error) {
            console.error('Error fetching analytics:', error);
        }
    };

    useEffect(() => {
        if (isLoggedIn && viewMode === 'analytics') {
            fetchAnalytics();
        }
    }, [viewMode, dateRange, isLoggedIn]);

    useEffect(() => {
        pushService.initMessageListener();
    }, []);

    const getStatusLabel = (status) => {
        const labels = {
            'confirmed': 'Confirmado',
            'cancelled': 'Cancelado',
            'pending': 'Pendiente',
            'blocked': 'BLOQUEADO',
            'deposit_paid': 'Señado',
            'attended': 'Presente',
            'completed': 'Finalizado'
        };
        return labels[status] || status;
    };

    const getStatusStyle = (status) => {
        const styles = {
            pending:      { bg: 'var(--status-pending-bg)',   color: 'var(--status-pending)' },
            confirmed:    { bg: 'var(--status-confirmed-bg)', color: 'var(--status-confirmed)' },
            cancelled:    { bg: 'var(--status-cancelled-bg)', color: 'var(--status-cancelled)' },
            deposit_paid: { bg: 'var(--status-deposit-bg)',   color: 'var(--status-deposit)' },
            completed:    { bg: 'var(--status-completed-bg)', color: 'var(--status-completed)' },
            attended:     { bg: 'var(--status-attended-bg)',   color: 'var(--status-attended)' },
            blocked:      { bg: 'var(--status-blocked-bg)',    color: 'var(--status-blocked)' }
        };
        return styles[status] || { bg: 'var(--status-pending-bg)', color: 'var(--status-pending)' };
    };

    const handleMoveBooking = async (bookingId, newDate, newTime, newItemId) => {
        try {
            setLoading(true);
            await serviceAdapter.moveBooking(bookingId, newDate, newTime, newItemId);
            await fetchBookings();
            setReschedulingBooking(null);
        } catch (error) {
            console.error('Error moving booking:', error);
            alert('No se pudo mover la reserva. Revisa la disponibilidad.');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateBooking = (arg1, arg2, arg3, arg4) => {
        let date = null;
        let time = '';
        let passedResource = null;

        const isRental = currentBusiness?.type === 'venue' ||
            currentBusiness?.type === 'rental' ||
            currentBusiness?.type === 'alquiler' ||
            currentBusiness?.is_rental ||
            (currentBusiness?.category || '').toLowerCase().includes('quincho') ||
            (currentBusiness?.category || '').toLowerCase().includes('alquiler') ||
            (currentBusiness?.categories?.name || '').toLowerCase().includes('alquiler') ||
            (currentBusiness?.category || '').toLowerCase().includes('salon') ||
            (currentBusiness?.category || '').toLowerCase().includes('salón') ||
            (currentBusiness?.name || '').toLowerCase().includes('quincho') ||
            (currentBusiness?.name || '').toLowerCase().includes('salon') ||
            (currentBusiness?.name || '').toLowerCase().includes('salón');

        if (arg1 && (arg1.stopPropagation || arg1.preventDefault)) {
            if (arg2 instanceof Date) {
                date = arg2;
                time = arg3 || (isRental ? '00:00' : '');
                passedResource = arg4;
            } else {
                const dateStr = listFilters.date || new Date().toISOString().split('T')[0];
                const [y, m, d] = dateStr.split('-');
                date = new Date(y, m - 1, d);
                if (isRental) {
                    time = '00:00';
                } else {
                    const now = new Date();
                    const nextHour = now.getHours() + 1;
                    time = `${String(nextHour).padStart(2, '0')}:00`;
                }
            }
        } else {
            date = arg1;
            time = arg2 || (isRental ? '00:00' : '');
            passedResource = arg3;
        }

        if (!date || isNaN(date.getTime())) {
            date = new Date();
        }

        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;

        let selectedResId = '';
        let selectedResName = '';
        let selectedPrice = 0;

        if (passedResource) {
            if (typeof passedResource === 'object' && passedResource !== null) {
                selectedResId = passedResource.id;
                selectedResName = passedResource.name;
                selectedPrice = passedResource.price || 0;
            } else {
                selectedResId = passedResource;
                const allRes = [...(currentBusiness?.courts || []), ...(currentBusiness?.services || [])];
                const found = allRes.find(r => String(r.id) === String(passedResource));
                selectedResName = found?.name || '';
                selectedPrice = found?.price || 0;
            }
        }

        if (!selectedResId && currentBusiness) {
            const allResources = [
                ...(currentBusiness.courts || []),
                ...(currentBusiness.services || [])
            ];

            if (allResources.length > 0) {
                const slotBookings = bookings.filter(b => {
                    if (b.time !== time) return false;
                    let bDateKey = b.date;
                    if (b.date.includes('/')) {
                        const [bd, bm, by] = b.date.split('/');
                        bDateKey = `${by}-${bm.padStart(2, '0')}-${bd.padStart(2, '0')}`;
                    }
                    return bDateKey === dateStr && b.status !== 'cancelled';
                });

                const usedResourceIds = slotBookings.map(b => b.court_id || b.service_id).filter(Boolean);
                const freeResource = allResources.find(r => !usedResourceIds.includes(r.id)) || allResources[0];

                if (freeResource) {
                    selectedResId = freeResource.id;
                    selectedResName = freeResource.name;
                    selectedPrice = freeResource.price || 0;
                }
            }
        }

        const defaultDurationMinutes = isRental
            ? 240
            : Number(currentBusiness?.slot_duration || currentBusiness?.court_duration || 60);

        setNewBookingData({
            date: dateStr,
            time: time || (isRental ? '00:00' : '08:00'),
            customerName: '',
            customerPhone: '',
            customerEmail: '',
            serviceId: selectedResId,
            courtId: selectedResId,
            resourceName: selectedResName,
            price: selectedPrice,
            basePrice: selectedPrice,
            duration: defaultDurationMinutes,
            durationHours: defaultDurationMinutes / 60,
            selectedServices: [],
            servicesTotal: 0
        });
        setShowNewBookingModal(true);
    };

    const handleSubmitNewBooking = async (e) => {
        e.preventDefault();

        if (!newBookingData.date) {
            alert('Por favor seleccione una fecha válida para la reserva');
            return;
        }

        const isRentalBiz = currentBusiness?.type === 'venue' ||
            currentBusiness?.type === 'rental' ||
            currentBusiness?.type === 'alquiler' ||
            currentBusiness?.is_rental ||
            (currentBusiness?.category || '').toLowerCase().includes('quincho') ||
            (currentBusiness?.category || '').toLowerCase().includes('alquiler') ||
            (currentBusiness?.categories?.name || '').toLowerCase().includes('alquiler') ||
            (currentBusiness?.category || '').toLowerCase().includes('salon') ||
            (currentBusiness?.category || '').toLowerCase().includes('salón') ||
            (currentBusiness?.name || '').toLowerCase().includes('quincho') ||
            (currentBusiness?.name || '').toLowerCase().includes('salon') ||
            (currentBusiness?.name || '').toLowerCase().includes('salón');

        if (isRentalBiz) {
            const hasConflict = bookings.some(b => {
                if (b.status === 'cancelled') return false;
                let bDate = b.date;
                if (bDate && bDate.includes('/')) {
                    const [d, m, y] = bDate.split('/');
                    bDate = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
                }
                if (bDate !== newBookingData.date) return false;
                const targetRes = newBookingData.courtId || newBookingData.serviceId;
                if (targetRes && (b.court_id || b.service_id)) {
                    return String(b.court_id || b.service_id) === String(targetRes);
                }
                return true;
            });

            if (hasConflict) {
                alert(`La fecha seleccionada (${newBookingData.date}) ya se encuentra reservada u ocupada.`);
                return;
            }
        }

        if (!newBookingData.customerName || !newBookingData.customerPhone) {
            alert('Por favor complete nombre y teléfono del cliente');
            return;
        }

        const nameWords = newBookingData.customerName.trim().split(/\s+/);
        if (nameWords.length < 2) {
            alert('Por favor ingrese nombre y apellido (al menos dos palabras)');
            return;
        }

        const phoneDigits = newBookingData.customerPhone.trim();
        if (!/^\d+$/.test(phoneDigits)) {
            alert('El teléfono debe contener solo números, sin espacios ni guiones');
            return;
        }

        const maxCapacity = Number(currentBusiness?.capacity_limit || currentBusiness?.capacity || 100);
        if (newBookingData.guestCount) {
            const numGuests = parseInt(newBookingData.guestCount, 10);
            if (isNaN(numGuests) || numGuests < 1) {
                alert('La cantidad de personas debe ser mayor a 0');
                return;
            }
            if (numGuests > maxCapacity) {
                alert(`La cantidad de personas (${numGuests}) supera el límite de capacidad permitido para este establecimiento (${maxCapacity} personas)`);
                return;
            }
        }

        const isCourt = currentBusiness?.courts?.some(c => c.id === newBookingData.serviceId);

        const isRentalBusiness = currentBusiness?.type === 'venue' ||
            currentBusiness?.type === 'alquiler' ||
            (currentBusiness?.category || '').toLowerCase().includes('quincho') ||
            (currentBusiness?.categories?.name || '').toLowerCase().includes('alquiler');

        const defaultDurationMin = isRentalBusiness
            ? 240
            : Number(currentBusiness?.slot_duration || currentBusiness?.court_duration || 60);

        const finalDurationMinutes = Number(newBookingData.duration) ||
            (newBookingData.durationHours ? Number(newBookingData.durationHours) * 60 : defaultDurationMin);

        const finalDurationHours = Number(newBookingData.durationHours) || (finalDurationMinutes / 60);

        const parsedDeposit = (newBookingData.depositAmount !== '' && newBookingData.depositAmount !== null && newBookingData.depositAmount !== undefined && !isNaN(Number(newBookingData.depositAmount)))
            ? Number(newBookingData.depositAmount)
            : Math.round((parseFloat(newBookingData.price) || 0) * 0.3);

        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        const isHistorical = Boolean(newBookingData.date && newBookingData.date < todayStr);

        const bookingData = {
            businessId: selectedBusinessId,
            business_id: selectedBusinessId,
            serviceId: isCourt ? null : newBookingData.serviceId || null,
            courtId: isCourt ? newBookingData.serviceId : null,
            specialistId: newBookingData.specialistId || null,
            date: newBookingData.date,
            time: newBookingData.time || '00:00',
            duration: finalDurationMinutes,
            durationHours: finalDurationHours,
            guestCount: newBookingData.guestCount ? parseInt(newBookingData.guestCount, 10) : null,
            guest_count: newBookingData.guestCount ? parseInt(newBookingData.guestCount, 10) : null,
            selectedServices: newBookingData.selectedServices || [],
            selected_services: newBookingData.selectedServices || [],
            servicesTotal: parseFloat(newBookingData.servicesTotal) || 0,
            services_total: parseFloat(newBookingData.servicesTotal) || 0,
            basePrice: parseFloat(newBookingData.basePrice) || null,
            base_price: parseFloat(newBookingData.basePrice) || null,
            customerName: newBookingData.customerName,
            customer_name: newBookingData.customerName,
            customerPhone: newBookingData.customerPhone,
            customerEmail: newBookingData.customerEmail || null,
            customer_email: newBookingData.customerEmail || null,
            notes: newBookingData.notes || null,
            depositAmount: isHistorical ? (parseFloat(newBookingData.price) || 0) : parsedDeposit,
            deposit_amount: isHistorical ? (parseFloat(newBookingData.price) || 0) : parsedDeposit,
            payment_status: isHistorical ? 'paid' : 'pending',
            is_historical: isHistorical,
            metadata: {
                notes: newBookingData.notes || null,
                deposit_amount: isHistorical ? (parseFloat(newBookingData.price) || 0) : parsedDeposit,
                depositAmount: isHistorical ? (parseFloat(newBookingData.price) || 0) : parsedDeposit,
                duration_hours: finalDurationHours,
                duration: finalDurationMinutes,
                is_historical: isHistorical,
                reminderSent: isHistorical,
                reminder_sent_at: isHistorical ? new Date().toISOString() : null
            },
            status: isHistorical ? 'completed' : 'pending',
            price: parseFloat(newBookingData.price) || 0,
            history: [
                {
                    action: 'creation',
                    label: isHistorical ? 'Carga Histórica (Finalizada)' : 'Reserva Creada (Manual)',
                    timestamp: new Date().toISOString(),
                    status: isHistorical ? 'completed' : 'pending'
                }
            ]
        };

        try {
            await serviceAdapter.createBooking(bookingData);
            fetchBookings();
            setShowNewBookingModal(false);
            setNewBookingData({
                date: '',
                time: '',
                customerName: '',
                customerPhone: '',
                serviceId: '',
                specialistId: null,
                price: 0
            });
        } catch (error) {
            console.error('Error creating booking:', error);
            alert('Error al crear la reserva');
        }
    };

    const handleBlockSlot = async (date, time, resource = null) => {
        let dateStr, timeStr;

        if (date && time) {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            dateStr = `${year}-${month}-${day}`;
            timeStr = time;
        } else {
            timeStr = prompt('Ingrese la hora a bloquear (ej: 14:00)');
            if (!timeStr) return;
            const now = new Date();
            dateStr = now.toISOString().split('T')[0];
        }

        const resourceId = resource ? (resource.id || resource) : null;
        const resourceName = resource ? (resource.name || null) : null;

        setPendingBlockData({ date: dateStr, time: timeStr, resourceId, resourceName });
        setShowBlockModal(true);
    };

    const confirmBlockSlot = async (reason) => {
        if (!pendingBlockData) return;

        const { date, time, resourceId, resourceName } = pendingBlockData;

        const calendarType = getCalendarType(currentBusiness);
        const slotConfig = getSlotConfig(calendarType);
        const blockDuration = slotConfig.slotSize || 60;

        const isSport = calendarType === 'futbol' || calendarType === 'padel' || calendarType === 'tenis';

        const bookingData = {
            businessId: selectedBusinessId,
            serviceId: null,
            courtId: isSport ? resourceId : null,
            specialistId: !isSport ? resourceId : null,
            date: date,
            time: time,
            duration: blockDuration,
            customerName: reason ? `BLOQUEADO: ${reason}` : (resourceName ? `BLOQUEADO (${resourceName})` : 'BLOQUEADO POR ADMIN'),
            customerEmail: '-',
            customerPhone: '-',
            status: 'blocked',
            price: 0,
            history: [
                {
                    action: 'blocked',
                    label: reason || 'Horario Bloqueado',
                    timestamp: new Date().toISOString(),
                    status: 'blocked'
                }
            ]
        };

        try {
            await serviceAdapter.createBooking(bookingData);
            fetchBookings();
            setShowBlockModal(false);
            setPendingBlockData(null);
        } catch (error) {
            console.error('Error blocking slot:', error);
            alert('Error al bloquear horario');
        }
    };

    const handleBlockDate = async (dateStr, reason = 'Bloqueado por el negocio') => {
        try {
            const currentBlocked = [
                ...(currentBusiness?.blocked_dates || []),
                ...(currentBusiness?.metadata?.blocked_dates || [])
            ];
            const exists = currentBlocked.some(b => {
                const bStr = typeof b === 'string' ? b : b?.date;
                return bStr === dateStr;
            });

            if (!exists) {
                const newBlocked = [...currentBlocked, { date: dateStr, reason: reason || 'Bloqueado por el negocio' }];
                await serviceAdapter.patchBusiness(selectedBusinessId, {
                    blocked_dates: newBlocked,
                    metadata: {
                        ...(currentBusiness?.metadata || {}),
                        blocked_dates: newBlocked
                    }
                });
                setBusinesses(prev => prev.map(b => String(b.id) === String(selectedBusinessId) ? {
                    ...b,
                    blocked_dates: newBlocked,
                    metadata: { ...(b.metadata || {}), blocked_dates: newBlocked }
                } : b));

                try {
                    await serviceAdapter.createBooking({
                        business_id: selectedBusinessId,
                        businessId: selectedBusinessId,
                        date: dateStr,
                        time: '00:00',
                        customer_name: 'BLOQUEADO POR ADMIN',
                        customerName: 'BLOQUEADO POR ADMIN',
                        status: 'blocked',
                        is_blocked: true,
                        notes: reason || 'Bloqueado por el negocio'
                    });
                    await fetchBookings();
                } catch (e) {
                    console.warn('Booking record already exists or could not be created:', e);
                }
            }
        } catch (error) {
            console.error('Error blocking date:', error);
            alert('Error al bloquear la fecha');
        }
    };

    const handleUnblockSlot = async (booking) => {
        setConfirmModal({
            isOpen: true,
            title: 'Desbloquear Horario',
            message: '¿Estás seguro de que deseas desbloquear este horario?',
            confirmText: 'Desbloquear',
            isDanger: true,
            onConfirm: async () => {
                try {
                    await serviceAdapter.deleteBooking(booking.id);
                    fetchBookings();
                } catch (error) {
                    console.error('Error unblocking slot:', error);
                    alert('Error al desbloquear horario. Por favor intenta nuevamente.');
                }
            }
        });
    };

    const handleBookingClick = (booking) => {
        setSelectedBooking(booking);
        setShowBookingModal(true);
    };

    const handleBookingAction = async (action, payload = {}) => {
        if (!selectedBooking) return;

        try {
            if (action === 'update_booking') {
                const currentHistory = Array.isArray(selectedBooking.history) ? selectedBooking.history : [];
                const newHistory = [...currentHistory];
                newHistory.push({
                    action: 'updated',
                    label: 'Reserva Editada',
                    timestamp: new Date().toISOString(),
                    status: selectedBooking.status
                });

                const updated = await serviceAdapter.updateBooking(selectedBooking.id, {
                    ...payload,
                    history: newHistory
                });
                await fetchBookings();
                if (updated) {
                    setSelectedBooking(prev => ({ ...prev, ...updated, history: newHistory }));
                }
                return updated;
            } else if (action === 'cancel') {
                const reason = prompt('Por favor, ingresa el motivo de la cancelación:');
                if (reason !== null) {
                    const currentHistory = Array.isArray(selectedBooking.history) ? selectedBooking.history : [];
                    const newHistory = [...currentHistory];
                    newHistory.push({
                        action: 'cancelled',
                        label: 'Turno Cancelado',
                        timestamp: new Date().toISOString(),
                        status: 'cancelled',
                        reason: reason || 'Cancelado por el administrador'
                    });

                    await serviceAdapter.updateBookingStatus(selectedBooking.id, 'cancelled', {
                        reason: reason || 'Cancelado por el administrador',
                        history: newHistory
                    });
                    await fetchBookings();
                    setShowBookingModal(false);
                }
            } else if (action === 'confirm_booking') {
                const currentHistory = Array.isArray(selectedBooking.history) ? selectedBooking.history : [];
                const newHistory = [...currentHistory];
                newHistory.push({
                    action: 'confirmed',
                    label: 'Turno Confirmado',
                    timestamp: new Date().toISOString(),
                    status: 'confirmed'
                });

                await serviceAdapter.updateBookingStatus(selectedBooking.id, 'confirmed', {
                    history: newHistory
                });
                await fetchBookings();
                setShowBookingModal(false);
            } else if (action === 'confirm_deposit') {
                const currentHistory = Array.isArray(selectedBooking.history) ? selectedBooking.history : [];
                const newHistory = [...currentHistory];
                newHistory.push({
                    action: 'deposit_paid',
                    label: 'Seña Confirmada',
                    timestamp: new Date().toISOString(),
                    status: 'deposit_paid'
                });

                await serviceAdapter.updateBookingStatus(selectedBooking.id, 'deposit_paid', {
                    history: newHistory
                });
                await fetchBookings();
                setShowBookingModal(false);
            } else if (action === 'confirm_attendance') {
                const currentHistory = Array.isArray(selectedBooking.history) ? selectedBooking.history : [];
                const newHistory = [...currentHistory];
                newHistory.push({
                    action: 'attendance_confirmed',
                    label: 'Asistencia Confirmada',
                    timestamp: new Date().toISOString(),
                    status: 'attended'
                });

                await serviceAdapter.updateBookingStatus(selectedBooking.id, 'attended', {
                    history: newHistory
                });
                await fetchBookings();
                setShowBookingModal(false);
            } else if (action === 'complete_booking') {
                const currentHistory = Array.isArray(selectedBooking.history) ? selectedBooking.history : [];
                const newHistory = [...currentHistory];
                newHistory.push({
                    action: 'completed',
                    label: 'Servicio Finalizado',
                    timestamp: new Date().toISOString(),
                    status: 'completed'
                });

                await serviceAdapter.updateBookingStatus(selectedBooking.id, 'completed', {
                    history: newHistory
                });
                await fetchBookings();
                setShowBookingModal(false);
            } else if (action === 'unblock') {
                if (selectedBooking.isVirtual) {
                    setShowBookingModal(false);
                    const [y, m, d] = selectedBooking.date.split('-');
                    const dateObj = new Date(y, m - 1, d);
                    handleCreateBooking(null, dateObj, selectedBooking.time);
                    return;
                }

                const targetDate = selectedBooking.date;

                const currentBlocked = (currentBusiness?.blocked_dates || currentBusiness?.metadata?.blocked_dates || []).filter(b => {
                    const d = typeof b === 'string' ? b : b?.date;
                    return d !== targetDate;
                });

                await serviceAdapter.patchBusiness(selectedBusinessId, {
                    blocked_dates: currentBlocked,
                    metadata: {
                        ...(currentBusiness?.metadata || {}),
                        blocked_dates: currentBlocked
                    }
                });

                setBusinesses(prev => prev.map(b => String(b.id) === String(selectedBusinessId) ? {
                    ...b,
                    blocked_dates: currentBlocked,
                    metadata: { ...(b.metadata || {}), blocked_dates: currentBlocked }
                } : b));

                if (!String(selectedBooking.id).startsWith('blocked-')) {
                    try {
                        await serviceAdapter.deleteBooking(selectedBooking.id);
                    } catch (e) {
                        console.error('Error deleting booking during unblock:', e);
                    }
                }

                const otherBlocked = (bookings || []).filter(b => b.date === targetDate && (b.status === 'blocked' || b.is_blocked || String(b.customer_name).toUpperCase().includes('BLOQUEADO')));
                for (const ob of otherBlocked) {
                    if (ob.id && !String(ob.id).startsWith('blocked-')) {
                        try {
                            await serviceAdapter.deleteBooking(ob.id);
                        } catch (e) { }
                    }
                }

                await fetchBookings();
                setShowBookingModal(false);
            }
        } catch (error) {
            console.error('Error in booking action:', error);
            alert('Error al procesar la acción');
        }
    };

    if (requirePasswordChange) {
        const targetBusinessId = currentBusinessId || selectedBusinessId;
        const targetEmail = loginEmail || (businesses.find(b => b.id === targetBusinessId)?.email) || '';

        const handlePasswordSuccess = async () => {
            localStorage.removeItem('turnitos_must_change_password');
            setRequirePasswordChange(false);
            setLoading(true);
            try {
                if (targetBusinessId) {
                    const fullBusiness = await serviceAdapter.getBusinessById(targetBusinessId);
                    setBusinesses(prev => prev.map(b => b.id === fullBusiness.id ? fullBusiness : b));
                    setSelectedBusinessId(targetBusinessId);
                }
                setIsLoggedIn(true);

                if (rememberMe && targetEmail) {
                    localStorage.setItem('turnitos_business_email', targetEmail);
                }
            } catch (err) {
                console.error("Error finalizing login:", err);
                setIsLoggedIn(true);
            } finally {
                setLoading(false);
            }
        };

        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '100vh',
                background: 'var(--bg-main)',
                padding: '20px'
            }}>
                <ChangePasswordModal
                    businessId={targetBusinessId}
                    userEmail={targetEmail}
                    onSuccess={handlePasswordSuccess}
                    onPasswordChanged={handlePasswordSuccess}
                />
            </div>
        );
    }

    if (!isLoggedIn) {
        return (
            <BusinessLogin
                onLogin={handleLogin}
                loading={loading}
            />
        );
    }

    const storedBizObj = (() => {
        try {
            const raw = localStorage.getItem('business');
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            return null;
        }
    })();

    const currentBusiness = businesses.find(b => String(b.id) === String(selectedBusinessId))
        || (storedBizObj && String(storedBizObj.id) === String(selectedBusinessId) ? storedBizObj : null)
        || (businesses.length > 0 ? businesses[0] : null)
        || storedBizObj
        || null;

    const isRentalBusiness = currentBusiness?.type === 'venue' ||
        currentBusiness?.type === 'alquiler' ||
        (currentBusiness?.category || '').toLowerCase().includes('alquiler') ||
        (currentBusiness?.category || '').toLowerCase().includes('quincho') ||
        (currentBusiness?.categories?.name || '').toLowerCase().includes('alquiler') ||
        (currentBusiness?.categories?.name || '').toLowerCase().includes('quincho') ||
        (currentBusiness?.slug || '').toLowerCase().includes('quincho') ||
        (currentBusiness?.slug || '').toLowerCase().includes('roma');

    return (
        <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            minHeight: '100vh',
            background: 'var(--bg-main)',
            position: 'relative'
        }}>
            {/* Mobile Header */}
            {isMobile && (
                <div style={{
                    padding: '12px 20px',
                    background: 'var(--bg-card)',
                    borderBottom: '1px solid var(--border)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    position: 'sticky',
                    top: 0,
                    zIndex: 100,
                    boxShadow: 'var(--shadow-sm)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {(currentBusiness?.logo || currentBusiness?.image) && (
                            <img
                                src={currentBusiness.logo || currentBusiness.image}
                                alt="Logo"
                                style={{ width: '32px', height: '32px', borderRadius: '8px', objectFit: 'cover', border: '1px solid var(--border)' }}
                            />
                        )}
                        <h1 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>
                            {currentBusiness?.name || 'Portal Socios'}
                        </h1>
                    </div>
                    <button
                        onClick={() => setShowSidebar(!showSidebar)}
                        style={{
                            background: 'var(--bg-main)',
                            border: '1px solid var(--border)',
                            borderRadius: '8px',
                            width: '36px',
                            height: '36px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '18px',
                            cursor: 'pointer',
                            color: 'var(--text-primary)'
                        }}
                    >
                        {showSidebar ? '✕' : '☰'}
                    </button>
                </div>
            )}

            <BusinessPortalSidebar
                viewMode={viewMode}
                setViewMode={setViewMode}
                isMobile={isMobile}
                isVisible={showSidebar}
                onToggleSidebar={setShowSidebar}
                toggleTheme={toggleTheme}
                theme={theme}
                currentBusiness={currentBusiness}
                pendingCount={bookings.filter(b => b.status === 'pending').length}
                onCreateBooking={(e) => handleCreateBooking(e)}
                onLogout={async () => {
                    await supabaseService.logout();
                    setIsLoggedIn(false);
                }}
            />

            {/* Main Content Area */}
            <div style={{
                flex: 1,
                padding: isMobile ? '16px' : '24px 40px',
                maxWidth: '1600px',
                width: '100%',
                height: isMobile ? 'auto' : '100vh',
                maxHeight: isMobile ? 'none' : '100vh',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                minHeight: 0
            }}>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '100px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                        <div style={{
                            width: '40px', height: '40px',
                            border: '3px solid var(--border)',
                            borderTopColor: 'var(--primary)',
                            borderRadius: '50%',
                            animation: 'spin 0.8s linear infinite'
                        }} />
                        <p style={{ color: 'var(--text-secondary)', fontSize: '15px', fontWeight: '500' }}>Cargando información...</p>
                    </div>
                ) : (
                    <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
                        {viewMode === 'analytics' ? (
                            <PortalAnalyticsView
                                metrics={metrics}
                                trends={trends}
                                peakHours={peakHours}
                                customerInsights={customerInsights}
                                setDateRange={setDateRange}
                                analyticsLoading={analyticsLoading}
                                isMobile={isMobile}
                            />
                        ) : viewMode === 'subscription' ? (
                            <BusinessSubscriptionView
                                business={currentBusiness}
                                isMobile={isMobile}
                            />
                        ) : viewMode === 'customers' ? (
                            <ClientManagement
                                businessId={selectedBusinessId}
                                isMobile={isMobile}
                                bookings={bookings}
                            />
                        ) : viewMode === 'calendar' ? (
                            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                                <UpcomingRemindersCard
                                    bookings={bookings}
                                    currentBusiness={currentBusiness}
                                    isMobile={isMobile}
                                    onBookingUpdated={(updated) => {
                                        setBookings(prev => prev.map(b => b.id === updated.id ? { ...b, ...updated } : b));
                                    }}
                                />

                                {reschedulingBooking && (
                                    <div style={{
                                        background: 'var(--primary-paddle)',
                                        padding: '12px 20px',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        borderRadius: '12px',
                                        marginBottom: '16px',
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                        animation: 'slideDown 0.3s ease-out'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <span style={{ fontSize: '20px' }}>🔄</span>
                                            <div>
                                                <strong style={{ display: 'block', color: '#000' }}>Reprogramando turno</strong>
                                                <span style={{ fontSize: '13px', color: '#000', opacity: 0.8 }}>
                                                    {reschedulingBooking.customer_name || reschedulingBooking.customerName} - Elige el nuevo horario en el calendario
                                                </span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setReschedulingBooking(null)}
                                            style={{
                                                background: 'rgba(0,0,0,0.1)',
                                                border: 'none',
                                                padding: '6px 12px',
                                                borderRadius: '8px',
                                                cursor: 'pointer',
                                                fontWeight: '700',
                                                fontSize: '12px',
                                                color: '#000'
                                            }}
                                        >
                                            Cancelar
                                        </button>
                                    </div>
                                )}
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                                    <CalendarWrapper
                                        bookings={bookings}
                                        business={currentBusiness}
                                        isMobile={isMobile}
                                        onBlockSlot={handleBlockSlot}
                                        onUnblockSlot={handleUnblockSlot}
                                        onBlockDate={handleBlockDate}
                                        onCreateBooking={handleCreateBooking}
                                        onBookingClick={handleBookingClick}
                                        onMoveBooking={handleMoveBooking}
                                        isRescheduling={!!reschedulingBooking}
                                        reschedulingBooking={reschedulingBooking}
                                        onStartReschedule={(booking) => setReschedulingBooking(booking)}
                                    />
                                </div>
                            </div>
                        ) : viewMode === 'settings' ? (
                            (currentBusiness && (() => {
                                const catName = (currentBusiness.categories?.name || currentBusiness.category || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                                const isService = currentBusiness.type === 'service' || catName.includes('belleza') || catName.includes('estetica') || catName.includes('spa') || catName.includes('salud') || catName.includes('mascota') || ((currentBusiness.specialists?.length || 0) > 0);
                                const isSport = currentBusiness.type === 'sport' || catName.includes('deport') || catName.includes('cancha') || ((currentBusiness.courts?.length || 0) > 0);
                                if (isService || isSport) return false;
                                return currentBusiness.type === 'venue' || currentBusiness.type === 'alquiler' || catName.includes('alquiler') || catName.includes('quincho');
                            })()) ? (
                                <VenueSettings
                                    business={currentBusiness}
                                    isMobile={isMobile}
                                    onUpdate={(updated) => {
                                        setBusinesses(prev => {
                                            const exists = prev.some(b => String(b.id) === String(updated.id));
                                            return exists
                                                ? prev.map(b => String(b.id) === String(updated.id) ? { ...b, ...updated } : b)
                                                : [...prev, updated];
                                        });
                                        try {
                                            const currentStored = localStorage.getItem('business');
                                            const storedObj = currentStored ? JSON.parse(currentStored) : {};
                                            localStorage.setItem('business', JSON.stringify({ ...storedObj, ...updated }));
                                        } catch (e) { }
                                    }}
                                />
                            ) : (
                                <BusinessSettings
                                    business={currentBusiness}
                                    isMobile={isMobile}
                                    onUpdate={(updated) => {
                                        setBusinesses(prev => {
                                            const exists = prev.some(b => String(b.id) === String(updated.id));
                                            return exists
                                                ? prev.map(b => String(b.id) === String(updated.id) ? { ...b, ...updated } : b)
                                                : [...prev, updated];
                                        });
                                        try {
                                            const currentStored = localStorage.getItem('business');
                                            const storedObj = currentStored ? JSON.parse(currentStored) : {};
                                            localStorage.setItem('business', JSON.stringify({ ...storedObj, ...updated }));
                                        } catch (e) { }
                                    }}
                                />
                            )
                        ) : (
                            <PortalListView
                                bookings={bookings}
                                listFilters={listFilters}
                                setListFilters={setListFilters}
                                currentPage={currentPage}
                                setCurrentPage={setCurrentPage}
                                itemsPerPage={itemsPerPage}
                                isRentalBusiness={isRentalBusiness}
                                handleBookingClick={handleBookingClick}
                                getStatusLabel={getStatusLabel}
                                getStatusStyle={getStatusStyle}
                                formatDisplayDate={formatDisplayDate}
                                isMobile={isMobile}
                            />
                        )}
                    </div>
                )}
            </div>

            {/* Booking Details Modal */}
            <BookingDetailsModal
                isOpen={showBookingModal}
                onClose={() => setShowBookingModal(false)}
                booking={selectedBooking}
                businesses={businesses}
                selectedBusinessId={selectedBusinessId}
                onAction={handleBookingAction}
                isMobile={isMobile}
                formatDisplayDate={formatDisplayDate}
                getStatusLabel={getStatusLabel}
            />

            {/* New Booking Modal */}
            <NewBookingModal
                isOpen={showNewBookingModal}
                onClose={() => setShowNewBookingModal(false)}
                newBookingData={newBookingData}
                setNewBookingData={setNewBookingData}
                onSubmit={handleSubmitNewBooking}
                currentBusiness={currentBusiness}
                isMobile={isMobile}
                bookings={bookings}
            />

            {/* Block Slot Modal */}
            <BlockSlotModal
                isOpen={showBlockModal}
                onClose={() => {
                    setShowBlockModal(false);
                    setPendingBlockData(null);
                }}
                onConfirm={confirmBlockSlot}
                date={pendingBlockData?.date}
                time={pendingBlockData?.time}
            />

            {/* Change Password Modal */}
            {requirePasswordChange && (
                <ChangePasswordModal
                    userEmail={loginEmail || currentBusiness?.email || (businesses.find(b => b.id === (selectedBusinessId || currentBusinessId))?.email) || ''}
                    businessId={selectedBusinessId || currentBusinessId || currentBusiness?.id || ''}
                    onSuccess={() => {
                        setRequirePasswordChange(false);
                        localStorage.removeItem('turnitos_must_change_password');
                    }}
                    onPasswordChanged={() => {
                        setRequirePasswordChange(false);
                        localStorage.removeItem('turnitos_must_change_password');
                    }}
                />
            )}

            {/* Confirm Modal */}
            <ConfirmModal
                isOpen={confirmModal.isOpen}
                title={confirmModal.title}
                message={confirmModal.message}
                confirmText={confirmModal.confirmText}
                cancelText={confirmModal.cancelText}
                isDanger={confirmModal.isDanger}
                onConfirm={() => confirmModal.onConfirm && confirmModal.onConfirm()}
                onClose={() => setConfirmModal({ isOpen: false })}
            />

            {/* In-App Floating New Booking Alert */}
            <PortalNewBookingAlert
                newBookingAlert={newBookingAlert}
                onClose={() => setNewBookingAlert(null)}
                onViewBooking={(alertData) => {
                    setSelectedBooking(alertData);
                    setShowBookingModal(true);
                }}
                isMobile={isMobile}
            />
        </div>
    );
}
