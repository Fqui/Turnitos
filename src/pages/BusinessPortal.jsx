import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import supabaseService from '../services/supabaseService';
import serviceAdapter from '../services/serviceAdapter';
import analyticsService from '../services/analyticsService';
import DashboardStats from '../components/DashboardStats';
import { CalendarWrapper } from '../components/calendars';
import { getCalendarType, getSlotConfig } from '../components/calendars/shared/config';
import MetricsCard from '../components/analytics/MetricsCard';
import RevenueChart from '../components/analytics/RevenueChart';
import PeakHoursHeatmap from '../components/analytics/PeakHoursHeatmap';
import DateRangePicker from '../components/analytics/DateRangePicker';
import { motion, AnimatePresence } from 'framer-motion';
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
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
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
                        const businessesData = await serviceAdapter.getBusinesses();
                        const fullBiz = businessesData.find(b => String(b.id) === String(biz.id)) || biz;
                        const finalBusinesses = businessesData.some(b => String(b.id) === String(fullBiz.id))
                            ? businessesData
                            : [...businessesData, fullBiz];

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
                        if (mustChangePassword || biz.password_changed === false) {
                            setRequirePasswordChange(true);
                            setCurrentBusinessId(biz.id);
                            setSelectedBusinessId(biz.id);
                            setBusinesses(businessesData);
                            return;
                        }
                        setSelectedBusinessId(biz.id);
                        setBusinesses(businessesData);
                        setIsLoggedIn(true);
                    }
                } catch (err) {
                    // Auto-login failed silently
                }
            }
        };
        checkAutoLogin();
    }, []);

    const [viewMode, setViewMode] = useState('calendar'); // 'calendar', 'list', 'analytics', 'settings'

    // Scroll to top of page whenever switching view modes (e.g. entering settings)
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

    // Calendar state (lifted for stats synchronization)
    const [calendarViewMode, setCalendarViewMode] = useState('day');
    const [calendarDate, setCalendarDate] = useState(() => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return d;
    });

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
                setBusinesses(data);
            } catch (error) {
                console.error('Error loading businesses:', error);
            }
        };
        loadBusinesses();
    }, []);

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
                // Check if password change is required
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

    const fetchBookings = async () => {
        setLoading(true);
        try {
            const response = await serviceAdapter.getBookings(selectedBusinessId);
            if (response.bookings) {
                setBookings(response.bookings);
            }

            const businessData = await serviceAdapter.getBusinessById(selectedBusinessId);
            if (businessData) {
                setBusinesses(prev => {
                    const exists = prev.some(b => String(b.id) === String(businessData.id));
                    return exists
                        ? prev.map(b => String(b.id) === String(businessData.id) ? businessData : b)
                        : [...prev, businessData];
                });
            }
        } catch (error) {
            console.error('Error fetching bookings:', error);
            alert('Error al cargar reservas. Revisa la consola.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isLoggedIn && selectedBusinessId) {
            fetchBookings();

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

            // 1. Sincronización en tiempo real vía Postgres Changes
            const subscription = serviceAdapter.subscribeToBookings(selectedBusinessId, (payload) => {
                fetchBookings();

                if (payload.eventType === 'INSERT' && payload.new) {
                    handleNewBookingAlert(payload.new);
                }
            });

            // 2. Realtime notification broadcast channel vía Supabase
            const notifChannel = supabase.channel(`business-notif-${selectedBusinessId}`)
                .on('broadcast', { event: 'new_booking' }, (payload) => {
                    const info = payload?.payload?.bookingInfo;
                    handleNewBookingAlert(info, payload?.payload?.title);
                    fetchBookings();
                })
                .subscribe();

            // 3. Multi-tab instant sync via native HTML5 BroadcastChannel
            let localBroadcast = null;
            try {
                if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
                    localBroadcast = new BroadcastChannel(`turnitos-live-${selectedBusinessId}`);
                    localBroadcast.onmessage = (event) => {
                        if (event?.data?.type === 'new_booking') {
                            handleNewBookingAlert(event.data.bookingInfo, event.data.title);
                            fetchBookings();
                        }
                    };
                }
            } catch (bcErr) {
                console.warn('BroadcastChannel error:', bcErr);
            }

            // 4. Polling fallback every 10 seconds to ensure 100% data sync
            const pollingInterval = setInterval(() => {
                fetchBookings();
            }, 10000);

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

    const handleStatusChange = async (booking, newStatus) => {
        if (!confirm(`¿Estás seguro de cambiar el estado a ${getStatusLabel(newStatus)}?`)) return;

        try {
            await serviceAdapter.updateBookingStatus(booking.id, newStatus);
            fetchBookings();
        } catch (error) {
            console.error('Error updating status:', error);
            alert('Error al actualizar estado');
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

        // Check if date is already booked for rental
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

        // Validate Name (at least 2 words)
        const nameWords = newBookingData.customerName.trim().split(/\s+/);
        if (nameWords.length < 2) {
            alert('Por favor ingrese nombre y apellido (al menos dos palabras)');
            return;
        }

        // Validate Phone (only numbers)
        const phoneDigits = newBookingData.customerPhone.trim();
        if (!/^\d+$/.test(phoneDigits)) {
            alert('El teléfono debe contener solo números, sin espacios ni guiones');
            return;
        }

        const currentBusiness = businesses.find(b => b.id === selectedBusinessId);
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
            depositAmount: parsedDeposit,
            deposit_amount: parsedDeposit,
            metadata: {
                notes: newBookingData.notes || null,
                deposit_amount: parsedDeposit,
                depositAmount: parsedDeposit,
                duration_hours: finalDurationHours,
                duration: finalDurationMinutes
            },
            status: 'pending',
            price: parseFloat(newBookingData.price) || 0,
            history: [
                {
                    action: 'creation',
                    label: 'Reserva Creada (Manual)',
                    timestamp: new Date().toISOString(),
                    status: 'pending'
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
                specialistId: null, // Reset specialist
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

        // resource can be a court object or specialist object
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
            const currentBusiness = businesses.find(b => b.id === selectedBusinessId);
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

                // Also persist in bookings table so Realtime immediately notifies all public visitors
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
                const currentBiz = businesses.find(b => String(b.id) === String(selectedBusinessId));

                // 1. Remove from business blocked_dates array
                const currentBlocked = (currentBiz?.blocked_dates || currentBiz?.metadata?.blocked_dates || []).filter(b => {
                    const d = typeof b === 'string' ? b : b?.date;
                    return d !== targetDate;
                });

                await serviceAdapter.patchBusiness(selectedBusinessId, {
                    blocked_dates: currentBlocked,
                    metadata: {
                        ...(currentBiz?.metadata || {}),
                        blocked_dates: currentBlocked
                    }
                });

                setBusinesses(prev => prev.map(b => String(b.id) === String(selectedBusinessId) ? {
                    ...b,
                    blocked_dates: currentBlocked,
                    metadata: { ...(b.metadata || {}), blocked_dates: currentBlocked }
                } : b));

                // 2. Delete the booking row itself if it exists
                if (!String(selectedBooking.id).startsWith('blocked-')) {
                    try {
                        await serviceAdapter.deleteBooking(selectedBooking.id);
                    } catch (e) {
                        console.error('Error deleting booking during unblock:', e);
                    }
                }

                // 3. Also clean up any other blocked bookings on that date
                const otherBlocked = (bookings || []).filter(b => b.date === targetDate && (b.status === 'blocked' || b.is_blocked || String(b.customer_name).toUpperCase().includes('BLOQUEADO')));
                for (const ob of otherBlocked) {
                    if (ob.id && !String(ob.id).startsWith('blocked-')) {
                        try {
                            await serviceAdapter.deleteBooking(ob.id);
                        } catch (e) {
                            // ignore
                        }
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

    // Check for forced password change FIRST
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
        || (storedBizObj && String(storedBizObj.id) === String(selectedBusinessId) ? storedBizObj : storedBizObj)
        || businesses[0]
        || null;

    const isRentalBusiness = currentBusiness?.type === 'venue' ||
        currentBusiness?.type === 'alquiler' ||
        (currentBusiness?.category || '').toLowerCase().includes('alquiler') ||
        (currentBusiness?.category || '').toLowerCase().includes('quincho') ||
        (currentBusiness?.categories?.name || '').toLowerCase().includes('alquiler') ||
        (currentBusiness?.categories?.name || '').toLowerCase().includes('quincho') ||
        (currentBusiness?.slug || '').toLowerCase().includes('quincho') ||
        (currentBusiness?.slug || '').toLowerCase().includes('roma');

    const getBookingTimeDisplay = (booking) => {
        if (!isRentalBusiness) {
            return <span style={{ fontWeight: '700' }}>{booking.time ? `${booking.time} hs` : '-'}</span>;
        }
        const hasValidTime = booking.time && booking.time !== '00:00' && booking.time !== '00:00:00';
        const duration = booking.duration || booking.metadata?.duration;

        if (hasValidTime) {
            return (
                <div>
                    <div style={{ fontWeight: '700', color: 'var(--text-primary)' }}>{booking.time} hs</div>
                    {duration && <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>⏳ {duration} hs</div>}
                </div>
            );
        }
        if (duration) {
            return (
                <div style={{ fontWeight: '700', color: 'var(--text-primary)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <span>⏳</span> <span>{duration} hs</span>
                </div>
            );
        }
        return <div style={{ fontWeight: '600', color: 'var(--text-secondary)', fontSize: '13px' }}>🗓️ Jornada completa</div>;
    };

    const isBookingBlocked = (booking) => {
        return booking?.status === 'blocked' ||
            booking?.is_blocked ||
            String(booking?.customer_name || booking?.customerName || '').toUpperCase().includes('BLOQUEADO');
    };

    const getBookingRentalDetails = (booking) => {
        if (isBookingBlocked(booking)) {
            const reason = booking.notes || booking.metadata?.notes || 'Bloqueo administrativo';
            const resource = booking.services?.name || booking.courts?.name || 'Espacio completo';
            return (
                <div style={{ whiteSpace: 'nowrap' }}>
                    <div style={{ fontWeight: '700', color: '#94A3B8', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <span>🔒</span> <span>{resource}</span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' }}>
                        {reason}
                    </div>
                </div>
            );
        }

        const guests = booking.guest_count || booking.guestCount || booking.metadata?.guest_count || booking.metadata?.guestCount;
        
        let services = [];
        const rawServices = booking.selected_services || booking.selectedServices || booking.metadata?.selected_services || booking.metadata?.selectedServices || [];
        if (Array.isArray(rawServices)) {
            services = rawServices.map(s => typeof s === 'object' && s !== null ? (s.name || s.label || s.title) : String(s)).filter(Boolean);
        } else if (typeof rawServices === 'string' && rawServices.trim()) {
            try {
                const parsed = JSON.parse(rawServices);
                if (Array.isArray(parsed)) {
                    services = parsed.map(s => typeof s === 'object' && s !== null ? (s.name || s.label || s.title) : String(s)).filter(Boolean);
                } else {
                    services = [rawServices.trim()];
                }
            } catch (e) {
                services = [rawServices.trim()];
            }
        }

        return (
            <div>
                {guests ? (
                    <div style={{ fontWeight: '700', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <span>👥</span> <span>{guests} personas</span>
                    </div>
                ) : (
                    <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                        {booking.services?.name || booking.courts?.name || booking.service || 'Alquiler del Espacio'}
                    </div>
                )}
                {services.length > 0 ? (
                    <div style={{ fontSize: '12px', color: 'var(--primary-paddle, #84CC16)', marginTop: '3px', fontWeight: '600' }}>
                        + {services.join(', ')}
                    </div>
                ) : (
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        Sin adicionales
                    </div>
                )}
            </div>
        );
    };

    const getBookingFinancials = (booking) => {
        if (isBookingBlocked(booking)) {
            return (
                <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '600' }}>
                    —
                </div>
            );
        }

        const total = Number(booking.price || booking.total_price || booking.totalPrice || 0);
        const deposit = Number(booking.deposit_amount || booking.depositAmount || booking.metadata?.deposit_amount || booking.metadata?.depositAmount || 0);

        return (
            <div>
                <div style={{ fontWeight: '800', color: 'var(--text-primary)', fontSize: '14px' }}>
                    ${total > 0 ? total.toLocaleString('es-AR') : '-'}
                </div>
                {deposit > 0 ? (
                    <div style={{ fontSize: '11px', color: '#10B981', fontWeight: '700', marginTop: '2px' }}>
                        Seña: ${deposit.toLocaleString('es-AR')}
                    </div>
                ) : (
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        Sin seña
                    </div>
                )}
            </div>
        );
    };

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
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', overflowY: 'auto', flex: 1, paddingRight: '4px' }}>
                                {/* Header */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                                    <div>
                                        <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '800', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span>📊</span> Analytics & Métricas
                                        </h2>
                                        <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: 'var(--text-secondary)' }}>
                                            Rendimiento, ocupación de canchas, facturación y clientes
                                        </p>
                                    </div>
                                    <DateRangePicker onRangeChange={setDateRange} />
                                </div>

                                {analyticsLoading ? (
                                    <div style={{ textAlign: 'center', padding: '60px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                                        <div style={{
                                            width: '36px', height: '36px',
                                            border: '3px solid var(--border)',
                                            borderTopColor: 'var(--primary-paddle)',
                                            borderRadius: '50%',
                                            animation: 'spin 0.8s linear infinite'
                                        }} />
                                        <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Actualizando métricas...</span>
                                    </div>
                                ) : (
                                    <>
                                        {/* Hero Metrics Cards */}
                                        {metrics && (
                                            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(auto-fit, minmax(210px, 1fr))', gap: '16px' }}>
                                                {/* Card 1: Ingresos Totales */}
                                                <div style={{
                                                    background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                                                    borderRadius: '20px',
                                                    padding: isMobile ? '16px' : '22px',
                                                    color: 'white',
                                                    boxShadow: '0 8px 24px rgba(16, 185, 129, 0.25)',
                                                    position: 'relative',
                                                    overflow: 'hidden'
                                                }}>
                                                    <div style={{ position: 'absolute', top: '-15px', right: '-15px', fontSize: '70px', opacity: 0.15 }}>💰</div>
                                                    <div style={{ position: 'relative', zIndex: 1 }}>
                                                        <div style={{ fontSize: '12px', fontWeight: '700', opacity: 0.9, marginBottom: '6px' }}>Facturación Activa</div>
                                                        <div style={{ fontSize: isMobile ? '24px' : '30px', fontWeight: '900', marginBottom: '4px' }}>
                                                            ${metrics.totalRevenue?.toLocaleString('es-AR') || '0'}
                                                        </div>
                                                        <div style={{ fontSize: '11px', opacity: 0.9 }}>
                                                            ${metrics.collectedRevenue?.toLocaleString('es-AR') || '0'} cobrado en mano/finalizado
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Card 2: Señas Recaudadas */}
                                                <div style={{
                                                    background: 'linear-gradient(135deg, #0EA5E9 0%, #0284C7 100%)',
                                                    borderRadius: '20px',
                                                    padding: isMobile ? '16px' : '22px',
                                                    color: 'white',
                                                    boxShadow: '0 8px 24px rgba(14, 165, 233, 0.25)',
                                                    position: 'relative',
                                                    overflow: 'hidden'
                                                }}>
                                                    <div style={{ position: 'absolute', top: '-15px', right: '-15px', fontSize: '70px', opacity: 0.15 }}>🔒</div>
                                                    <div style={{ position: 'relative', zIndex: 1 }}>
                                                        <div style={{ fontSize: '12px', fontWeight: '700', opacity: 0.9, marginBottom: '6px' }}>Señas Cobradas</div>
                                                        <div style={{ fontSize: isMobile ? '24px' : '30px', fontWeight: '900', marginBottom: '4px' }}>
                                                            ${metrics.totalDeposits?.toLocaleString('es-AR') || '0'}
                                                        </div>
                                                        <div style={{ fontSize: '11px', opacity: 0.9 }}>
                                                            Garantía y anticipos ingresados
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Card 3: Total Reservas */}
                                                <div style={{
                                                    background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
                                                    borderRadius: '20px',
                                                    padding: isMobile ? '16px' : '22px',
                                                    color: 'white',
                                                    boxShadow: '0 8px 24px rgba(99, 102, 241, 0.25)',
                                                    position: 'relative',
                                                    overflow: 'hidden'
                                                }}>
                                                    <div style={{ position: 'absolute', top: '-15px', right: '-15px', fontSize: '70px', opacity: 0.15 }}>📅</div>
                                                    <div style={{ position: 'relative', zIndex: 1 }}>
                                                        <div style={{ fontSize: '12px', fontWeight: '700', opacity: 0.9, marginBottom: '6px' }}>Total Turnos</div>
                                                        <div style={{ fontSize: isMobile ? '24px' : '30px', fontWeight: '900', marginBottom: '4px' }}>
                                                            {metrics.totalBookings || 0}
                                                        </div>
                                                        <div style={{ fontSize: '11px', opacity: 0.9 }}>
                                                            {metrics.completedBookings || 0} completadas • {metrics.pendingBookings || 0} pendientes
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Card 4: Ticket Promedio */}
                                                <div style={{
                                                    background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                                                    borderRadius: '20px',
                                                    padding: isMobile ? '16px' : '22px',
                                                    color: 'white',
                                                    boxShadow: '0 8px 24px rgba(245, 158, 11, 0.25)',
                                                    position: 'relative',
                                                    overflow: 'hidden'
                                                }}>
                                                    <div style={{ position: 'absolute', top: '-15px', right: '-15px', fontSize: '70px', opacity: 0.15 }}>💵</div>
                                                    <div style={{ position: 'relative', zIndex: 1 }}>
                                                        <div style={{ fontSize: '12px', fontWeight: '700', opacity: 0.9, marginBottom: '6px' }}>Ticket Promedio</div>
                                                        <div style={{ fontSize: isMobile ? '24px' : '30px', fontWeight: '900', marginBottom: '4px' }}>
                                                            ${metrics.avgBookingValue?.toLocaleString('es-AR') || '0'}
                                                        </div>
                                                        <div style={{ fontSize: '11px', opacity: 0.9 }}>
                                                            Promedio por turno alquilado
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Card 5: Tasa de Efectividad */}
                                                <div style={{
                                                    background: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
                                                    borderRadius: '20px',
                                                    padding: isMobile ? '16px' : '22px',
                                                    color: 'white',
                                                    boxShadow: '0 8px 24px rgba(139, 92, 246, 0.25)',
                                                    position: 'relative',
                                                    overflow: 'hidden',
                                                    gridColumn: isMobile ? 'span 2' : 'auto'
                                                }}>
                                                    <div style={{ position: 'absolute', top: '-15px', right: '-15px', fontSize: '70px', opacity: 0.15 }}>🎯</div>
                                                    <div style={{ position: 'relative', zIndex: 1 }}>
                                                        <div style={{ fontSize: '12px', fontWeight: '700', opacity: 0.9, marginBottom: '6px' }}>Tasa de Efectividad</div>
                                                        <div style={{ fontSize: isMobile ? '24px' : '30px', fontWeight: '900', marginBottom: '4px' }}>
                                                            {metrics.completionRate?.toFixed(1) || '0'}%
                                                        </div>
                                                        <div style={{ fontSize: '11px', opacity: 0.9 }}>
                                                            {metrics.cancelledBookings || 0} cancelaciones registradas
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Row 2: Performance de Canchas & Desglose de Adicionales */}
                                        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: '20px' }}>
                                            {/* Desglose de Canchas / Espacios */}
                                            <div style={{
                                                background: 'var(--bg-card)',
                                                borderRadius: '20px',
                                                padding: '24px',
                                                border: '1px solid var(--border)',
                                                boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                                            }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                                    <h3 style={{ fontSize: '16px', fontWeight: '800', margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <span>🏟️</span> Rendimiento por Cancha
                                                    </h3>
                                                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '600' }}>
                                                        Turnos & Recaudación
                                                    </span>
                                                </div>

                                                {metrics?.courtsBreakdown && metrics.courtsBreakdown.length > 0 ? (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                                        {metrics.courtsBreakdown.map((court, idx) => {
                                                            const colors = ['#00E676', '#3B82F6', '#F59E0B', '#8B5CF6', '#EC4899'];
                                                            const color = colors[idx % colors.length];
                                                            return (
                                                                <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                                                                        <span style={{ fontWeight: '700', color: 'var(--text-primary)' }}>
                                                                            {court.name}
                                                                        </span>
                                                                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                                                            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600' }}>
                                                                                {court.count} turnos ({court.percentage}%)
                                                                            </span>
                                                                            <span style={{ fontSize: '13px', fontWeight: '800', color: 'var(--primary-paddle)' }}>
                                                                                ${court.revenue.toLocaleString('es-AR')}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                    <div style={{ width: '100%', height: '8px', background: 'var(--bg-main)', borderRadius: '4px', overflow: 'hidden' }}>
                                                                        <div style={{ width: `${court.percentage}%`, height: '100%', background: color, borderRadius: '4px', transition: 'width 0.3s' }}></div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                ) : (
                                                    <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)', fontSize: '13px' }}>
                                                        No hay reservas registradas en el período seleccionado.
                                                    </div>
                                                )}
                                            </div>

                                            {/* Desglose de Adicionales / Extras Vendidos */}
                                            <div style={{
                                                background: 'var(--bg-card)',
                                                borderRadius: '20px',
                                                padding: '24px',
                                                border: '1px solid var(--border)',
                                                boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                                            }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                                    <h3 style={{ fontSize: '16px', fontWeight: '800', margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <span>✨</span> Adicionales & Extras Vendidos
                                                    </h3>
                                                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '600' }}>
                                                        Consumos adicionales
                                                    </span>
                                                </div>

                                                {metrics?.additionalsBreakdown && metrics.additionalsBreakdown.length > 0 ? (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                        {metrics.additionalsBreakdown.map((item, idx) => (
                                                            <div key={idx} style={{
                                                                display: 'flex',
                                                                justifyContent: 'space-between',
                                                                alignItems: 'center',
                                                                padding: '10px 14px',
                                                                borderRadius: '12px',
                                                                background: 'var(--bg-main)',
                                                                border: '1px solid var(--border)'
                                                            }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                    <span style={{ fontWeight: '700', fontSize: '13px', color: 'var(--text-primary)' }}>
                                                                        • {item.name}
                                                                    </span>
                                                                    <span style={{
                                                                        padding: '2px 8px',
                                                                        borderRadius: '6px',
                                                                        background: 'rgba(0, 230, 118, 0.1)',
                                                                        color: 'var(--primary-paddle)',
                                                                        fontSize: '11px',
                                                                        fontWeight: '800'
                                                                    }}>
                                                                        {item.quantity} unidades
                                                                    </span>
                                                                </div>
                                                                <span style={{ fontWeight: '800', fontSize: '13px', color: 'var(--text-primary)' }}>
                                                                    ${item.revenue.toLocaleString('es-AR')}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)', fontSize: '13px' }}>
                                                        No se registraron adicionales en las reservas del período.
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Row 3: Charts */}
                                        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: '20px' }}>
                                            {trends.length > 0 ? (
                                                <>
                                                    <RevenueChart data={trends} type="revenue" />
                                                    <RevenueChart data={trends} type="bookings" />
                                                </>
                                            ) : (
                                                <div style={{ gridColumn: isMobile ? 'span 1' : 'span 2', padding: '30px', background: 'var(--bg-card)', borderRadius: '20px', textAlign: 'center', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                                                    📈 Los gráficos de tendencias se mostrarán al acumular reservas en el período.
                                                </div>
                                            )}
                                        </div>

                                        {/* Row 4: Peak Hours Heatmap */}
                                        {peakHours && (
                                            <PeakHoursHeatmap data={peakHours.data} labels={peakHours.labels} />
                                        )}

                                        {/* Row 5: Top Clientes & Insights */}
                                        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: '20px' }}>
                                            {/* Top Clientes Más Fieles */}
                                            <div style={{
                                                background: 'var(--bg-card)',
                                                borderRadius: '20px',
                                                padding: '24px',
                                                border: '1px solid var(--border)',
                                                boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                                            }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                                    <h3 style={{ fontSize: '16px', fontWeight: '800', margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <span>👑</span> Top Clientes Frecuentes
                                                    </h3>
                                                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '600' }}>
                                                        Mayor concurrencia
                                                    </span>
                                                </div>

                                                {metrics?.topCustomers && metrics.topCustomers.length > 0 ? (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                        {metrics.topCustomers.map((cust, idx) => {
                                                            const cleanPh = (cust.phone || '').replace(/\D/g, '');
                                                            return (
                                                                <div key={idx} style={{
                                                                    display: 'flex',
                                                                    justifyContent: 'space-between',
                                                                    alignItems: 'center',
                                                                    padding: '10px 12px',
                                                                    borderRadius: '12px',
                                                                    background: 'var(--bg-main)',
                                                                    border: '1px solid var(--border)',
                                                                    fontSize: '13px'
                                                                }}>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                                        <div style={{
                                                                            width: '28px',
                                                                            height: '28px',
                                                                            borderRadius: '8px',
                                                                            background: idx === 0 ? '#F59E0B' : 'var(--border)',
                                                                            color: idx === 0 ? '#000' : 'var(--text-primary)',
                                                                            display: 'flex',
                                                                            alignItems: 'center',
                                                                            justifyContent: 'center',
                                                                            fontWeight: '800',
                                                                            fontSize: '12px'
                                                                        }}>
                                                                            {idx + 1}
                                                                        </div>
                                                                        <div>
                                                                            <div style={{ fontWeight: '700', color: 'var(--text-primary)' }}>{cust.name}</div>
                                                                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                                                                {cust.bookingsCount} turnos • Total: ${cust.totalSpent.toLocaleString('es-AR')}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                    {cleanPh && (
                                                                        <a
                                                                            href={`https://wa.me/${cleanPh}`}
                                                                            target="_blank"
                                                                            rel="noreferrer"
                                                                            style={{
                                                                                padding: '4px 10px',
                                                                                borderRadius: '8px',
                                                                                background: 'rgba(37, 211, 102, 0.15)',
                                                                                color: '#25D366',
                                                                                fontWeight: '700',
                                                                                fontSize: '11px',
                                                                                textDecoration: 'none',
                                                                                display: 'flex',
                                                                                alignItems: 'center',
                                                                                gap: '4px'
                                                                            }}
                                                                        >
                                                                            <span>💬</span> WhatsApp
                                                                        </a>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                ) : (
                                                    <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)', fontSize: '13px' }}>
                                                        No hay clientes registrados en el período.
                                                    </div>
                                                )}
                                            </div>

                                            {/* Insights de Retención */}
                                            {customerInsights && (
                                                <div style={{
                                                    background: 'var(--bg-card)',
                                                    borderRadius: '20px',
                                                    padding: '24px',
                                                    border: '1px solid var(--border)',
                                                    boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                                                }}>
                                                    <h3 style={{ fontSize: '16px', fontWeight: '800', marginBottom: '16px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <span>👥</span> Métricas de Comunidad
                                                    </h3>
                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                                        <div style={{
                                                            padding: '16px',
                                                            background: 'rgba(16, 185, 129, 0.08)',
                                                            borderRadius: '14px',
                                                            border: '1px solid rgba(16, 185, 129, 0.2)'
                                                        }}>
                                                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: '600' }}>Total Clientes</div>
                                                            <div style={{ fontSize: '24px', fontWeight: '800', color: '#10B981' }}>{customerInsights.totalCustomers}</div>
                                                        </div>
                                                        <div style={{
                                                            padding: '16px',
                                                            background: 'rgba(99, 102, 241, 0.08)',
                                                            borderRadius: '14px',
                                                            border: '1px solid rgba(99, 102, 241, 0.2)'
                                                        }}>
                                                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: '600' }}>Nuevos</div>
                                                            <div style={{ fontSize: '24px', fontWeight: '800', color: '#6366F1' }}>{customerInsights.newCustomers}</div>
                                                        </div>
                                                        <div style={{
                                                            padding: '16px',
                                                            background: 'rgba(245, 158, 11, 0.08)',
                                                            borderRadius: '14px',
                                                            border: '1px solid rgba(245, 158, 11, 0.2)'
                                                        }}>
                                                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: '600' }}>Recurrentes</div>
                                                            <div style={{ fontSize: '24px', fontWeight: '800', color: '#F59E0B' }}>{customerInsights.returningCustomers}</div>
                                                        </div>
                                                        <div style={{
                                                            padding: '16px',
                                                            background: 'rgba(139, 92, 246, 0.08)',
                                                            borderRadius: '14px',
                                                            border: '1px solid rgba(139, 92, 246, 0.2)'
                                                        }}>
                                                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: '600' }}>Tasa Retención</div>
                                                            <div style={{ fontSize: '24px', fontWeight: '800', color: '#8B5CF6' }}>{customerInsights.retentionRate?.toFixed(1) || '0'}%</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
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

                                {/* Smart Upcoming Reminders Notification Card */}
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
                            (currentBusiness && (
                                currentBusiness.type === 'venue' ||
                                currentBusiness.type === 'alquiler' ||
                                (currentBusiness.categories?.name || '').toLowerCase().includes('alquiler') ||
                                (currentBusiness.categories?.name || '').toLowerCase().includes('quincho') ||
                                (currentBusiness.category || '').toLowerCase().includes('quincho')
                            )) ? (
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
                            <div style={{
                                background: 'var(--bg-card)',
                                borderRadius: '16px',
                                border: isMobile ? 'none' : '1px solid var(--border)',
                                flex: 1,
                                display: 'flex',
                                flexDirection: 'column',
                                minHeight: 0
                            }}>
                                <div style={{ flex: 1, overflowY: 'auto', paddingRight: isMobile ? 0 : '10px' }}>
                                    {/* Filters Section */}
                                    <div style={{
                                        padding: '20px',
                                        borderBottom: '1px solid var(--border)',
                                        display: 'flex',
                                        flexWrap: 'wrap',
                                        gap: '16px',
                                        alignItems: 'center',
                                        backgroundColor: 'rgba(0,0,0,0.01)'
                                    }}>
                                        <div style={{ flex: '1', minWidth: '200px', position: 'relative' }}>
                                            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}>🔍</span>
                                            <input
                                                type="text"
                                                placeholder={isRentalBusiness ? "Buscar por cliente, invitados o servicios..." : "Buscar por cliente o servicio..."}
                                                value={listFilters.search}
                                                onChange={(e) => {
                                                    setListFilters(prev => ({ ...prev, search: e.target.value }));
                                                    setCurrentPage(1);
                                                }}
                                                style={{
                                                    width: '100%',
                                                    padding: '10px 10px 10px 38px',
                                                    borderRadius: '8px',
                                                    border: '1px solid var(--border)',
                                                    background: 'var(--bg-main)',
                                                    fontSize: '14px',
                                                    color: 'var(--text-primary)'
                                                }}
                                            />
                                        </div>
                                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                            <select
                                                value={listFilters.status}
                                                onChange={(e) => {
                                                    setListFilters(prev => ({ ...prev, status: e.target.value }));
                                                    setCurrentPage(1);
                                                }}
                                                style={{
                                                    padding: '10px 12px',
                                                    borderRadius: '8px',
                                                    border: '1px solid var(--border)',
                                                    background: 'var(--bg-main)',
                                                    fontSize: '14px',
                                                    color: 'var(--text-primary)',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                <option value="all">Todos los estados</option>
                                                <option value="pending">Pendientes</option>
                                                <option value="confirmed">Confirmados</option>
                                                <option value="deposit_paid">Señados</option>
                                                <option value="completed">Finalizados</option>
                                                <option value="cancelled">Cancelados</option>
                                                <option value="blocked">Bloqueados</option>
                                            </select>
                                            <div style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                                padding: '0 12px',
                                                borderRadius: '8px',
                                                border: '1px solid var(--border)',
                                                background: 'var(--bg-main)'
                                            }}>
                                                <span style={{ fontSize: '14px', color: 'var(--text-primary)', fontWeight: '500' }}>Fecha:</span>
                                                <input
                                                    type="date"
                                                    value={listFilters.date}
                                                    onChange={(e) => {
                                                        setListFilters(prev => ({ ...prev, date: e.target.value }));
                                                        setCurrentPage(1);
                                                    }}
                                                    style={{
                                                        padding: '10px 0',
                                                        borderRadius: '0',
                                                        border: 'none',
                                                        background: 'transparent',
                                                        fontSize: '14px',
                                                        color: 'var(--text-primary)',
                                                        cursor: 'pointer',
                                                        outline: 'none'
                                                    }}
                                                />
                                            </div>
                                            {(listFilters.search || listFilters.status !== 'all' || listFilters.date) && (
                                                <button
                                                    onClick={() => {
                                                        setListFilters({ search: '', status: 'all', date: '' });
                                                        setCurrentPage(1);
                                                    }}
                                                    style={{
                                                        padding: '10px 12px',
                                                        borderRadius: '8px',
                                                        border: 'none',
                                                        background: 'rgba(255, 68, 68, 0.1)',
                                                        color: '#ff4444',
                                                        fontSize: '13px',
                                                        fontWeight: '600',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    Limpiar
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <div style={{ width: '100%' }}>

                                        {isMobile ? (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '0' }}>
                                                {(() => {
                                                    const term = listFilters.search.toLowerCase().trim();
                                                    const filtered = bookings.filter(booking => {
                                                        let matchesSearch = true;
                                                        if (term) {
                                                            const clientName = (booking.customer_name || booking.customerName || '').toLowerCase();
                                                            const clientPhone = (booking.customer_phone || booking.customerPhone || '').toLowerCase();
                                                            const serviceName = (booking.services?.name || booking.courts?.name || booking.service || '').toLowerCase();
                                                            const notes = (booking.notes || booking.metadata?.notes || '').toLowerCase();
                                                            const guestStr = String(booking.guest_count || booking.guestCount || booking.metadata?.guest_count || booking.metadata?.guestCount || '');
                                                            const servicesStr = JSON.stringify(booking.selected_services || booking.selectedServices || booking.metadata?.selected_services || '').toLowerCase();

                                                            matchesSearch = clientName.includes(term) ||
                                                                clientPhone.includes(term) ||
                                                                serviceName.includes(term) ||
                                                                notes.includes(term) ||
                                                                guestStr.includes(term) ||
                                                                servicesStr.includes(term);
                                                        }
                                                        const matchesStatus = listFilters.status === 'all' || booking.status === listFilters.status;
                                                        const matchesDate = !listFilters.date || booking.date === listFilters.date;
                                                        return matchesSearch && matchesStatus && matchesDate;
                                                    });
                                                    const startIndex = (currentPage - 1) * itemsPerPage;
                                                    const paginated = filtered.slice(startIndex, startIndex + itemsPerPage);

                                                    return paginated.map((booking, index) => {
                                                        const isBlocked = isBookingBlocked(booking);
                                                        return (
                                                            <div
                                                                key={index}
                                                                onClick={() => handleBookingClick(booking)}
                                                                style={{
                                                                    background: isBlocked ? 'rgba(100, 116, 139, 0.05)' : 'var(--bg-card)',
                                                                    padding: '16px',
                                                                    borderRadius: '16px',
                                                                    border: isBlocked ? '1px dashed rgba(100, 116, 139, 0.3)' : '1px solid var(--border)',
                                                                    boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                                                                    cursor: 'pointer'
                                                                }}
                                                            >
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                                                    <div>
                                                                        {isRentalBusiness ? (
                                                                            <span style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>
                                                                                {formatDisplayDate(booking.date)}
                                                                            </span>
                                                                        ) : (
                                                                            <div>
                                                                                <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>{booking.time} hs</div>
                                                                                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                                                                    {formatDisplayDate(booking.date)}
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    <span style={{
                                                                        padding: '4px 10px',
                                                                        borderRadius: 'var(--radius-full)',
                                                                        fontSize: '10px',
                                                                        fontWeight: '800',
                                                                        letterSpacing: '0.03em',
                                                                        background: isBlocked ? 'rgba(100, 116, 139, 0.15)' : getStatusStyle(booking.status).bg,
                                                                        color: isBlocked ? '#94A3B8' : getStatusStyle(booking.status).color,
                                                                        border: isBlocked ? '1px solid rgba(100, 116, 139, 0.25)' : 'none'
                                                                    }}>
                                                                        {isBlocked ? '🚫 BLOQUEADO' : getStatusLabel(booking.status).toUpperCase()}
                                                                    </span>
                                                                </div>

                                                                {isBlocked ? (
                                                                    <div style={{ marginBottom: '10px' }}>
                                                                        <div style={{ fontWeight: '700', color: '#94A3B8', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                            <span>🚫</span> Bloqueo de Disponibilidad
                                                                        </div>
                                                                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                                                            {booking.notes || booking.metadata?.notes || 'Bloqueado por el negocio'}
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <>
                                                                        <div style={{ fontWeight: '700', color: 'var(--text-primary)', marginBottom: '3px', fontSize: '15px' }}>
                                                                            {booking.customer_name || booking.customerName || '-'}
                                                                        </div>
                                                                        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                                                                            {booking.customer_phone || booking.customerPhone || ''}
                                                                        </div>
                                                                    </>
                                                                )}

                                                                <div style={{ background: 'var(--bg-main)', padding: '10px 12px', borderRadius: '12px', marginBottom: '10px', border: '1px solid var(--border)' }}>
                                                                    {isRentalBusiness ? (
                                                                        getBookingRentalDetails(booking)
                                                                    ) : (
                                                                        <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                                                                            {booking.services?.name || booking.courts?.name || booking.service || '-'}
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', paddingTop: '4px' }}>
                                                                    {isRentalBusiness ? (
                                                                        getBookingFinancials(booking)
                                                                    ) : (
                                                                        <span style={{ fontWeight: '700', color: 'var(--text-primary)' }}>
                                                                            {booking.price ? `$${Number(booking.price).toLocaleString('es-AR')}` : ''}
                                                                        </span>
                                                                    )}
                                                                    <span style={{ color: 'var(--primary-paddle, #84CC16)', fontWeight: '700', fontSize: '12px' }}>Ver detalles →</span>
                                                                </div>
                                                            </div>
                                                        );
                                                    })
                                                })()}
                                            </div>
                                        ) : (
                                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                                <thead style={{ background: 'rgba(0,0,0,0.02)' }}>
                                                    <tr>
                                                        <th style={{ padding: '16px', textAlign: 'left', color: 'var(--text-secondary)' }}>Fecha</th>
                                                        {!isRentalBusiness && (
                                                             <th style={{ padding: '16px', textAlign: 'left', color: 'var(--text-secondary)' }}>Hora</th>
                                                        )}
                                                        <th style={{ padding: '16px', textAlign: 'left', color: 'var(--text-secondary)' }}>Cliente / Estado</th>
                                                        <th style={{ padding: '16px', textAlign: 'left', color: 'var(--text-secondary)' }}>
                                                            {isRentalBusiness ? 'Detalle del Alquiler' : 'Servicio'}
                                                        </th>
                                                        {isRentalBusiness && (
                                                            <th style={{ padding: '16px', textAlign: 'left', color: 'var(--text-secondary)' }}>Total / Seña</th>
                                                        )}
                                                        <th style={{ padding: '16px', textAlign: 'left', color: 'var(--text-secondary)' }}>Estado</th>
                                                        <th style={{ padding: '16px', textAlign: 'right', color: 'var(--text-secondary)' }}>Acciones</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {(() => {
                                                        const term = listFilters.search.toLowerCase().trim();
                                                        const filtered = bookings.filter(booking => {
                                                            let matchesSearch = true;
                                                            if (term) {
                                                                const clientName = (booking.customer_name || booking.customerName || '').toLowerCase();
                                                                const clientPhone = (booking.customer_phone || booking.customerPhone || '').toLowerCase();
                                                                const serviceName = (booking.services?.name || booking.courts?.name || booking.service || '').toLowerCase();
                                                                const notes = (booking.notes || booking.metadata?.notes || '').toLowerCase();
                                                                const guestStr = String(booking.guest_count || booking.guestCount || booking.metadata?.guest_count || booking.metadata?.guestCount || '');
                                                                const servicesStr = JSON.stringify(booking.selected_services || booking.selectedServices || booking.metadata?.selected_services || '').toLowerCase();

                                                                matchesSearch = clientName.includes(term) ||
                                                                    clientPhone.includes(term) ||
                                                                    serviceName.includes(term) ||
                                                                    notes.includes(term) ||
                                                                    guestStr.includes(term) ||
                                                                    servicesStr.includes(term);
                                                            }
                                                            const matchesStatus = listFilters.status === 'all' || booking.status === listFilters.status;
                                                            const matchesDate = !listFilters.date || booking.date === listFilters.date;
                                                            return matchesSearch && matchesStatus && matchesDate;
                                                        });

                                                        const totalPages = Math.ceil(filtered.length / itemsPerPage);
                                                        const startIndex = (currentPage - 1) * itemsPerPage;
                                                        const paginated = filtered.slice(startIndex, startIndex + itemsPerPage);

                                                        return paginated.map((booking, index) => {
                                                            const isBlocked = isBookingBlocked(booking);
                                                            return (
                                                                <tr key={index} style={{
                                                                    borderTop: '1px solid var(--border)',
                                                                    background: isBlocked ? 'rgba(100, 116, 139, 0.04)' : 'transparent'
                                                                }}>
                                                                    <td style={{ padding: '16px', fontWeight: '600', color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                                                                        {formatDisplayDate(booking.date)}
                                                                    </td>
                                                                    {!isRentalBusiness && (
                                                                        <td style={{ padding: '16px', fontWeight: 'bold' }}>{booking.time}</td>
                                                                    )}
                                                                    <td style={{ padding: '16px' }}>
                                                                        {isBlocked ? (
                                                                            <div style={{ whiteSpace: 'nowrap' }}>
                                                                                <div style={{ fontWeight: '700', color: '#94A3B8', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                                    <span>🚫</span> <span>Horario Bloqueado</span>
                                                                                </div>
                                                                                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                                                                    Admin / No disponible
                                                                                </div>
                                                                            </div>
                                                                        ) : (
                                                                            <div style={{ whiteSpace: 'nowrap' }}>
                                                                                <div style={{ fontWeight: '700', color: 'var(--text-primary)', fontSize: '15px' }}>
                                                                                    {booking.customer_name || booking.customerName || '-'}
                                                                                </div>
                                                                                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                                                                    {booking.customer_phone || booking.customerPhone || '-'}
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </td>
                                                                    <td style={{ padding: '16px' }}>
                                                                        {isRentalBusiness ? (
                                                                            getBookingRentalDetails(booking)
                                                                        ) : (
                                                                            booking.services?.name || booking.courts?.name || booking.service || '-'
                                                                        )}
                                                                    </td>
                                                                    {isRentalBusiness && (
                                                                        <td style={{ padding: '16px' }}>
                                                                            {getBookingFinancials(booking)}
                                                                        </td>
                                                                    )}
                                                                    <td style={{ padding: '16px', whiteSpace: 'nowrap' }}>
                                                                        <span style={{
                                                                            padding: '4px 10px',
                                                                            borderRadius: 'var(--radius-full)',
                                                                            fontSize: '10px',
                                                                            fontWeight: '800',
                                                                            letterSpacing: '0.03em',
                                                                            background: isBlocked ? 'rgba(100, 116, 139, 0.15)' : getStatusStyle(booking.status).bg,
                                                                            color: isBlocked ? '#94A3B8' : getStatusStyle(booking.status).color,
                                                                            border: isBlocked ? '1px solid rgba(100, 116, 139, 0.25)' : 'none',
                                                                            display: 'inline-flex',
                                                                            alignItems: 'center',
                                                                            gap: '4px',
                                                                            whiteSpace: 'nowrap'
                                                                        }}>
                                                                            {isBlocked ? '🚫 BLOQUEADO' : getStatusLabel(booking.status).toUpperCase()}
                                                                        </span>
                                                                    </td>
                                                                    <td style={{ padding: '16px', textAlign: 'right', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                                        <button
                                                                            onClick={() => handleBookingClick(booking)}
                                                                            style={{
                                                                                padding: '6px 10px',
                                                                                borderRadius: '8px',
                                                                                border: '1px solid var(--border)',
                                                                                background: 'var(--bg-main)',
                                                                                color: 'var(--text-primary)',
                                                                                cursor: 'pointer',
                                                                                fontSize: '16px',
                                                                                display: 'flex',
                                                                                alignItems: 'center',
                                                                                justifyContent: 'center',
                                                                                transition: 'all 0.2s'
                                                                            }}
                                                                            title="Ver detalles"
                                                                        >
                                                                            👁️
                                                                        </button>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        });
                                                    })()}
                                                </tbody>
                                            </table>
                                        )}

                                        {/* Pagination Controls */}
                                        {(() => {
                                            const term = listFilters.search.toLowerCase().trim();
                                            const filtered = bookings.filter(booking => {
                                                let matchesSearch = true;
                                                if (term) {
                                                    const clientName = (booking.customer_name || booking.customerName || '').toLowerCase();
                                                    const clientPhone = (booking.customer_phone || booking.customerPhone || '').toLowerCase();
                                                    const serviceName = (booking.services?.name || booking.courts?.name || booking.service || '').toLowerCase();
                                                    const notes = (booking.notes || booking.metadata?.notes || '').toLowerCase();
                                                    const guestStr = String(booking.guest_count || booking.guestCount || booking.metadata?.guest_count || booking.metadata?.guestCount || '');
                                                    const servicesStr = JSON.stringify(booking.selected_services || booking.selectedServices || booking.metadata?.selected_services || '').toLowerCase();

                                                    matchesSearch = clientName.includes(term) ||
                                                        clientPhone.includes(term) ||
                                                        serviceName.includes(term) ||
                                                        notes.includes(term) ||
                                                        guestStr.includes(term) ||
                                                        servicesStr.includes(term);
                                                }
                                                const matchesStatus = listFilters.status === 'all' || booking.status === listFilters.status;
                                                const matchesDate = !listFilters.date || booking.date === listFilters.date;
                                                return matchesSearch && matchesStatus && matchesDate;
                                            });
                                            const totalPages = Math.ceil(filtered.length / itemsPerPage);
                                            if (totalPages <= 1) return null;

                                            return (
                                                <div style={{
                                                    padding: '16px 20px',
                                                    borderTop: '1px solid var(--border)',
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    background: 'var(--bg-main)',
                                                    borderBottomLeftRadius: '16px',
                                                    borderBottomRightRadius: '16px'
                                                }}>
                                                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                                                        Página <strong>{currentPage}</strong> de <strong>{totalPages}</strong> ({filtered.length} reservas)
                                                    </div>
                                                    <div style={{ display: 'flex', gap: '8px' }}>
                                                        <button
                                                            disabled={currentPage === 1}
                                                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                                            style={{
                                                                padding: '6px 12px',
                                                                borderRadius: '6px',
                                                                border: '1px solid var(--border)',
                                                                background: currentPage === 1 ? 'var(--bg-main)' : 'var(--bg-card)',
                                                                color: currentPage === 1 ? 'var(--text-muted)' : 'var(--text-primary)',
                                                                cursor: currentPage === 1 ? 'default' : 'pointer',
                                                                fontSize: '13px',
                                                                fontWeight: '600',
                                                                opacity: currentPage === 1 ? 0.5 : 1
                                                            }}
                                                        >
                                                            Anterior
                                                        </button>
                                                        <button
                                                            disabled={currentPage === totalPages}
                                                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                                            style={{
                                                                padding: '6px 12px',
                                                                borderRadius: '6px',
                                                                border: '1px solid var(--border)',
                                                                background: currentPage === totalPages ? 'var(--bg-main)' : 'var(--bg-card)',
                                                                color: currentPage === totalPages ? 'var(--text-muted)' : 'var(--text-primary)',
                                                                cursor: currentPage === totalPages ? 'default' : 'pointer',
                                                                fontSize: '13px',
                                                                fontWeight: '600',
                                                                opacity: currentPage === totalPages ? 0.5 : 1
                                                            }}
                                                        >
                                                            Siguiente
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                </div>
                            </div>
                        )
                        }
                    </div >
                )}
            </div >
            {
                < BookingDetailsModal
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
            }

            {/* New Booking Modal */}
            <NewBookingModal
                isOpen={showNewBookingModal}
                onClose={() => setShowNewBookingModal(false)}
                newBookingData={newBookingData}
                setNewBookingData={setNewBookingData}
                onSubmit={handleSubmitNewBooking}
                currentBusiness={currentBusiness}
                isMobile={isMobile}
                bookings={bookings} // Pass bookings for availability check
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

            {/* Change Password Modal (First Login) */}
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
            {newBookingAlert && (
                <div style={{
                    position: 'fixed',
                    top: isMobile ? '70px' : '24px',
                    right: isMobile ? '12px' : '24px',
                    left: isMobile ? '12px' : 'auto',
                    maxWidth: isMobile ? 'none' : '400px',
                    zIndex: 99999,
                    background: 'var(--bg-card)',
                    border: '2px solid var(--primary-paddle, #00E676)',
                    borderRadius: '16px',
                    padding: '16px 18px',
                    boxShadow: '0 16px 40px rgba(0,0,0,0.3)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    animation: 'slideDown 0.35s cubic-bezier(0.16, 1, 0.3, 1)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '24px', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }}>🔔</span>
                            <div>
                                <strong style={{ fontSize: '15px', color: 'var(--text-primary)', display: 'block', fontWeight: '800' }}>
                                    ¡Nueva Reserva Web!
                                </strong>
                                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                    Ingresó una nueva reserva por la web
                                </span>
                            </div>
                        </div>
                        <button
                            onClick={() => setNewBookingAlert(null)}
                            style={{
                                background: 'var(--bg-main)',
                                border: '1px solid var(--border)',
                                borderRadius: '8px',
                                width: '26px',
                                height: '26px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '13px',
                                cursor: 'pointer',
                                color: 'var(--text-muted)'
                            }}
                            title="Cerrar"
                        >
                            ✕
                        </button>
                    </div>

                    <div style={{
                        background: 'var(--bg-main)',
                        padding: '10px 14px',
                        borderRadius: '12px',
                        border: '1px solid var(--border)',
                        fontSize: '13px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px'
                    }}>
                        <div style={{ color: 'var(--text-primary)' }}>
                            <strong>Cliente:</strong> {newBookingAlert.customer_name || newBookingAlert.customerName || 'Cliente'}
                        </div>
                        <div style={{ color: 'var(--text-secondary)' }}>
                            <strong>Fecha:</strong> {newBookingAlert.date}
                        </div>
                        {(newBookingAlert.start_time || newBookingAlert.startTime) && (
                            <div style={{ color: 'var(--text-secondary)' }}>
                                <strong>Horario:</strong> {newBookingAlert.start_time || newBookingAlert.startTime}
                            </div>
                        )}
                    </div>

                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button
                            onClick={() => setNewBookingAlert(null)}
                            style={{
                                padding: '8px 14px',
                                borderRadius: '8px',
                                border: '1px solid var(--border)',
                                background: 'var(--bg-main)',
                                color: 'var(--text-secondary)',
                                fontWeight: '600',
                                fontSize: '12px',
                                cursor: 'pointer'
                            }}
                        >
                            Ignorar
                        </button>
                        <button
                            onClick={() => {
                                setSelectedBooking(newBookingAlert);
                                setShowBookingModal(true);
                                setNewBookingAlert(null);
                            }}
                            style={{
                                padding: '8px 16px',
                                borderRadius: '8px',
                                border: 'none',
                                background: 'linear-gradient(135deg, var(--primary-paddle, #00E676), #00B0FF)',
                                color: '#000000',
                                fontWeight: '800',
                                fontSize: '12px',
                                cursor: 'pointer',
                                boxShadow: '0 4px 12px rgba(0, 230, 118, 0.3)'
                            }}
                        >
                            Ver Reserva ➔
                        </button>
                    </div>
                </div>
            )}
        </div >
    );
}

