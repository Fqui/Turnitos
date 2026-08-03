import React, { useState, useEffect } from 'react';
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

export default function BusinessPortal() {
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
                        const fullBiz = businessesData.find(b => b.id === biz.id);
                        if (fullBiz) {
                            if (mustChangePassword || fullBiz.password_changed === false) {
                                setRequirePasswordChange(true);
                                setCurrentBusinessId(fullBiz.id);
                                setSelectedBusinessId(fullBiz.id);
                                setBusinesses(businessesData);
                                setLoginEmail(fullBiz.email);
                                return;
                            }
                            setSelectedBusinessId(fullBiz.id);
                            setBusinesses(businessesData);
                            setIsLoggedIn(true);
                            setLoginEmail(fullBiz.email);
                            return;
                        }
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

                const fullBusiness = await serviceAdapter.getBusinessById(business.id);
                setBusinesses(prev => prev.map(b => b.id === fullBusiness.id ? fullBusiness : b));
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
            setBusinesses(prev => prev.map(b => b.id === businessData.id ? businessData : b));
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

            // Sincronización en tiempo real
            const subscription = serviceAdapter.subscribeToBookings(selectedBusinessId, (payload) => {

                // Enriquecer el payload con datos de la empresa actual (nombres de servicios/canchas)
                // Esto es necesario porque el payload de Realtime solo trae IDs planos.
                const enrichBooking = (b) => {
                    if (!b) return null;
                    const businessData = businesses.find(bus => bus.id === selectedBusinessId);
                    if (businessData) {
                        const court = businessData.courts?.find(c => c.id === b.court_id);
                        const service = businessData.services?.find(s => s.id === b.service_id);
                        return {
                            ...b,
                            courts: court ? { name: court.name } : null,
                            services: service ? { name: service.name } : null
                        };
                    }
                    return b;
                };

                const enrichedNew = enrichBooking(payload.new);

                if (payload.eventType === 'INSERT') {
                    setBookings(prev => [...prev, enrichedNew]);
                } else if (payload.eventType === 'UPDATE') {
                    setBookings(prev => prev.map(b => b.id === enrichedNew.id ? enrichedNew : b));
                } else if (payload.eventType === 'DELETE') {
                    setBookings(prev => prev.filter(b => b.id !== payload.old.id));
                }
            });

            return () => {
                if (subscription && typeof subscription.unsubscribe === 'function') {
                    subscription.unsubscribe();
                }
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

    const handleCreateBooking = async (arg1, arg2, arg3) => {
        let date, time;

        // Determine if called with Event (Calendar: e, date, time) or Direct (date, time) or Button (e)
        if (arg1 && (arg1.stopPropagation || arg1.preventDefault)) {
            if (arg2 instanceof Date) {
                // Called from Calendar: (e, date, time)
                date = arg2;
                time = arg3;
            } else {
                // Called from Generic Button: (e) -> Use current filter date or today
                const dateStr = listFilters.date || new Date().toISOString().split('T')[0];
                const [y, m, d] = dateStr.split('-');
                date = new Date(y, m - 1, d);

                // Default time to next hour or 09:00
                const now = new Date();
                const nextHour = now.getHours() + 1;
                time = `${String(nextHour).padStart(2, '0')}:00`;
            }
        } else {
            // Direct call: (date, time)
            date = arg1;
            time = arg2;
        }

        if (!date || isNaN(date.getTime())) {
            date = new Date();
        }

        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;

        // Auto-select first available resource
        let suggestedResourceId = '';
        let suggestedPrice = 0;

        if (currentBusiness) {
            // Get all resources
            const allResources = [
                ...(currentBusiness.courts || []),
                ...(currentBusiness.services || [])
            ];

            if (allResources.length > 0) {
                // Find bookings for this slot
                const slotBookings = bookings.filter(b => {
                    if (b.time !== time) return false;
                    // Normalize booking date
                    let bDateKey = b.date;
                    if (b.date.includes('/')) {
                        const [bd, bm, by] = b.date.split('/');
                        bDateKey = `${by}-${bm.padStart(2, '0')}-${bd.padStart(2, '0')}`;
                    }
                    return bDateKey === dateStr && b.status !== 'cancelled';
                });

                // Find resources used in this slot
                const usedResourceIds = slotBookings.map(b => b.court_id || b.service_id).filter(Boolean);

                // Find first free resource
                const freeResource = allResources.find(r => !usedResourceIds.includes(r.id));

                if (freeResource) {
                    suggestedResourceId = freeResource.id;
                    suggestedPrice = freeResource.price || 0;
                }
            }
        }

        setNewBookingData({
            date: dateStr,
            time: time,
            customerName: '',
            customerPhone: '',
            serviceId: suggestedResourceId,
            price: suggestedPrice
        });
        setShowNewBookingModal(true);
    };

    const handleSubmitNewBooking = async (e) => {
        e.preventDefault();

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
        const isCourt = currentBusiness?.courts?.some(c => c.id === newBookingData.serviceId);

        const bookingData = {
            businessId: selectedBusinessId,
            serviceId: isCourt ? null : newBookingData.serviceId || null,
            courtId: isCourt ? newBookingData.serviceId : null,
            specialistId: newBookingData.specialistId || null, // Create booking with specialist
            date: newBookingData.date,
            time: newBookingData.time,
            customerName: newBookingData.customerName,
            customerPhone: newBookingData.customerPhone,
            status: 'pending',
            price: parseFloat(newBookingData.price) || 0,
            history: [
                {
                    action: 'creation',
                    label: 'Turno Creado (Manual)',
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

    const handleBookingAction = async (action) => {
        if (!selectedBooking) return;

        try {
            if (action === 'cancel') {
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
                    if (confirm('Este horario corresponde a un descanso programado. ¿Desea crear una reserva manual aquí?')) {
                        setShowBookingModal(false);
                        const [y, m, d] = selectedBooking.date.split('-');
                        const dateObj = new Date(y, m - 1, d);
                        handleCreateBooking(null, dateObj, selectedBooking.time);
                    }
                    return;
                }

                if (confirm('¿Estás seguro de desbloquear este horario?')) {
                    await serviceAdapter.deleteBooking(selectedBooking.id);
                    fetchBookings();
                    setShowBookingModal(false);
                }
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

    const currentBusiness = businesses.find(b => b.id === selectedBusinessId);

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
                                        <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '800', color: 'var(--text-primary)' }}>📊 Analytics</h2>
                                        <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: 'var(--text-secondary)' }}>
                                            Métricas y estadísticas de tu negocio
                                        </p>
                                    </div>
                                    <DateRangePicker onRangeChange={setDateRange} />
                                </div>

                                {/* Hero Metrics Cards */}
                                {metrics && (
                                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                                        <div style={{
                                            background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                                            borderRadius: '20px',
                                            padding: '24px',
                                            color: 'white',
                                            boxShadow: '0 8px 24px rgba(16, 185, 129, 0.25)',
                                            position: 'relative',
                                            overflow: 'hidden'
                                        }}>
                                            <div style={{ position: 'absolute', top: '-20px', right: '-20px', fontSize: '80px', opacity: 0.15 }}>💰</div>
                                            <div style={{ position: 'relative', zIndex: 1 }}>
                                                <div style={{ fontSize: '13px', fontWeight: '600', opacity: 0.9, marginBottom: '8px' }}>Ingresos Totales</div>
                                                <div style={{ fontSize: '32px', fontWeight: '800', marginBottom: '4px' }}>
                                                    ${metrics.totalRevenue?.toLocaleString('es-AR') || '0'}
                                                </div>
                                                {metrics.growth?.revenue !== undefined && (
                                                    <div style={{ fontSize: '12px', opacity: 0.9 }}>
                                                        {metrics.growth.revenue >= 0 ? '↗' : '↘'} {Math.abs(metrics.growth.revenue).toFixed(1)}% vs período anterior
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div style={{
                                            background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
                                            borderRadius: '20px',
                                            padding: '24px',
                                            color: 'white',
                                            boxShadow: '0 8px 24px rgba(99, 102, 241, 0.25)',
                                            position: 'relative',
                                            overflow: 'hidden'
                                        }}>
                                            <div style={{ position: 'absolute', top: '-20px', right: '-20px', fontSize: '80px', opacity: 0.15 }}>📅</div>
                                            <div style={{ position: 'relative', zIndex: 1 }}>
                                                <div style={{ fontSize: '13px', fontWeight: '600', opacity: 0.9, marginBottom: '8px' }}>Total Reservas</div>
                                                <div style={{ fontSize: '32px', fontWeight: '800', marginBottom: '4px' }}>
                                                    {metrics.totalBookings || 0}
                                                </div>
                                                {metrics.growth?.bookings !== undefined && (
                                                    <div style={{ fontSize: '12px', opacity: 0.9 }}>
                                                        {metrics.growth.bookings >= 0 ? '↗' : '↘'} {Math.abs(metrics.growth.bookings).toFixed(1)}% vs período anterior
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div style={{
                                            background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                                            borderRadius: '20px',
                                            padding: '24px',
                                            color: 'white',
                                            boxShadow: '0 8px 24px rgba(245, 158, 11, 0.25)',
                                            position: 'relative',
                                            overflow: 'hidden'
                                        }}>
                                            <div style={{ position: 'absolute', top: '-20px', right: '-20px', fontSize: '80px', opacity: 0.15 }}>💵</div>
                                            <div style={{ position: 'relative', zIndex: 1 }}>
                                                <div style={{ fontSize: '13px', fontWeight: '600', opacity: 0.9, marginBottom: '8px' }}>Valor Promedio</div>
                                                <div style={{ fontSize: '32px', fontWeight: '800', marginBottom: '4px' }}>
                                                    ${metrics.avgBookingValue?.toLocaleString('es-AR') || '0'}
                                                </div>
                                                <div style={{ fontSize: '12px', opacity: 0.9 }}>
                                                    Por reserva
                                                </div>
                                            </div>
                                        </div>

                                        <div style={{
                                            background: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
                                            borderRadius: '20px',
                                            padding: '24px',
                                            color: 'white',
                                            boxShadow: '0 8px 24px rgba(139, 92, 246, 0.25)',
                                            position: 'relative',
                                            overflow: 'hidden'
                                        }}>
                                            <div style={{ position: 'absolute', top: '-20px', right: '-20px', fontSize: '80px', opacity: 0.15 }}>✅</div>
                                            <div style={{ position: 'relative', zIndex: 1 }}>
                                                <div style={{ fontSize: '13px', fontWeight: '600', opacity: 0.9, marginBottom: '8px' }}>Tasa de Completitud</div>
                                                <div style={{ fontSize: '32px', fontWeight: '800', marginBottom: '4px' }}>
                                                    {metrics.completionRate?.toFixed(1) || '0'}%
                                                </div>
                                                <div style={{ fontSize: '12px', opacity: 0.9 }}>
                                                    Reservas completadas
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Booking Status Distribution & Top Performers */}
                                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: '20px' }}>
                                    {/* Booking Status Distribution */}
                                    {(() => {
                                        const statusCounts = bookings.reduce((acc, b) => {
                                            acc[b.status] = (acc[b.status] || 0) + 1;
                                            return acc;
                                        }, {});
                                        const total = bookings.length;

                                        const statusData = [
                                            { status: 'confirmed', label: 'Confirmadas', color: '#10B981', count: statusCounts.confirmed || 0 },
                                            { status: 'pending', label: 'Pendientes', color: '#F59E0B', count: statusCounts.pending || 0 },
                                            { status: 'completed', label: 'Completadas', color: '#10B981', count: statusCounts.completed || 0 },
                                            { status: 'cancelled', label: 'Canceladas', color: '#EF4444', count: statusCounts.cancelled || 0 },
                                            { status: 'deposit_paid', label: 'Seña Pagada', color: '#3B82F6', count: statusCounts.deposit_paid || 0 }
                                        ].filter(s => s.count > 0);

                                        return (
                                            <div style={{
                                                background: 'var(--bg-card)',
                                                borderRadius: '20px',
                                                padding: '24px',
                                                border: '1px solid var(--border)',
                                                boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                                            }}>
                                                <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '20px', color: 'var(--text-primary)' }}>
                                                    Estado de Reservas
                                                </h3>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                    {statusData.map(({ status, label, color, count }) => {
                                                        const percentage = total > 0 ? (count / total * 100) : 0;
                                                        return (
                                                            <div key={status}>
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                                                    <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>{label}</span>
                                                                    <span style={{ fontSize: '13px', fontWeight: '700', color }}>{count} ({percentage.toFixed(0)}%)</span>
                                                                </div>
                                                                <div style={{ width: '100%', height: '8px', background: 'var(--bg-main)', borderRadius: '4px', overflow: 'hidden' }}>
                                                                    <div style={{ width: `${percentage}%`, height: '100%', background: color, transition: 'width 0.3s ease' }}></div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })()}

                                    {/* Top Services/Courts */}
                                    {(() => {
                                        const itemCounts = bookings.reduce((acc, b) => {
                                            const name = b.services?.name || b.courts?.name || 'Sin especificar';
                                            acc[name] = (acc[name] || 0) + 1;
                                            return acc;
                                        }, {});

                                        const topItems = Object.entries(itemCounts)
                                            .sort((a, b) => b[1] - a[1])
                                            .slice(0, 5);

                                        const maxCount = topItems[0]?.[1] || 1;

                                        return (
                                            <div style={{
                                                background: 'var(--bg-card)',
                                                borderRadius: '20px',
                                                padding: '24px',
                                                border: '1px solid var(--border)',
                                                boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                                            }}>
                                                <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '20px', color: 'var(--text-primary)' }}>
                                                    Más Reservados
                                                </h3>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                    {topItems.length > 0 ? topItems.map(([name, count], index) => {
                                                        const percentage = (count / maxCount * 100);
                                                        const colors = ['#10B981', '#6366F1', '#F59E0B', '#8B5CF6', '#EC4899'];
                                                        return (
                                                            <div key={name}>
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                                                    <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>{name}</span>
                                                                    <span style={{ fontSize: '13px', fontWeight: '700', color: colors[index] }}>{count} reservas</span>
                                                                </div>
                                                                <div style={{ width: '100%', height: '8px', background: 'var(--bg-main)', borderRadius: '4px', overflow: 'hidden' }}>
                                                                    <div style={{ width: `${percentage}%`, height: '100%', background: colors[index], transition: 'width 0.3s ease' }}></div>
                                                                </div>
                                                            </div>
                                                        );
                                                    }) : (
                                                        <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)', fontSize: '14px' }}>
                                                            No hay datos disponibles
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </div>

                                {/* Charts */}
                                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: '20px' }}>
                                    {trends.length > 0 && (
                                        <>
                                            <RevenueChart data={trends} type="revenue" />
                                            <RevenueChart data={trends} type="bookings" />
                                        </>
                                    )}
                                </div>

                                {/* Peak Hours Heatmap */}
                                {peakHours && (
                                    <PeakHoursHeatmap data={peakHours.data} labels={peakHours.labels} />
                                )}

                                {/* Enhanced Customer Insights */}
                                {customerInsights && (
                                    <div style={{
                                        background: 'var(--bg-card)',
                                        borderRadius: '20px',
                                        padding: '24px',
                                        border: '1px solid var(--border)',
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                                    }}>
                                        <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '20px', color: 'var(--text-primary)' }}>
                                            📈 Insights de Clientes
                                        </h3>
                                        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, 1fr)', gap: '20px' }}>
                                            <div style={{
                                                padding: '20px',
                                                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.05) 100%)',
                                                borderRadius: '16px',
                                                border: '1px solid rgba(16, 185, 129, 0.2)'
                                            }}>
                                                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: '600' }}>Total Clientes</div>
                                                <div style={{ fontSize: '28px', fontWeight: '800', color: '#10B981' }}>{customerInsights.totalCustomers}</div>
                                            </div>
                                            <div style={{
                                                padding: '20px',
                                                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(79, 70, 229, 0.05) 100%)',
                                                borderRadius: '16px',
                                                border: '1px solid rgba(99, 102, 241, 0.2)'
                                            }}>
                                                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: '600' }}>Nuevos</div>
                                                <div style={{ fontSize: '28px', fontWeight: '800', color: '#6366F1' }}>{customerInsights.newCustomers}</div>
                                            </div>
                                            <div style={{
                                                padding: '20px',
                                                background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(217, 119, 6, 0.05) 100%)',
                                                borderRadius: '16px',
                                                border: '1px solid rgba(245, 158, 11, 0.2)'
                                            }}>
                                                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: '600' }}>Recurrentes</div>
                                                <div style={{ fontSize: '28px', fontWeight: '800', color: '#F59E0B' }}>{customerInsights.returningCustomers}</div>
                                            </div>
                                            <div style={{
                                                padding: '20px',
                                                background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(124, 58, 237, 0.05) 100%)',
                                                borderRadius: '16px',
                                                border: '1px solid rgba(139, 92, 246, 0.2)'
                                            }}>
                                                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: '600' }}>Tasa Retención</div>
                                                <div style={{ fontSize: '28px', fontWeight: '800', color: '#8B5CF6' }}>{customerInsights.retentionRate.toFixed(1)}%</div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : viewMode === 'customers' ? (
                            <ClientManagement
                                businessId={selectedBusinessId}
                                isMobile={isMobile}
                            />
                        ) : viewMode === 'calendar' ? (
                            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                                {/* Stats Row - Only in Calendar View */}
                                <div style={{ marginBottom: '20px', flexShrink: 0 }}>
                                    <DashboardStats
                                        bookings={bookings}
                                        viewMode={calendarViewMode}
                                        currentDate={calendarDate}
                                        isMobile={isMobile}
                                        theme={theme}
                                        toggleTheme={toggleTheme}
                                    />
                                </div>

                                {/* Booking Status Legend */}
                                <div style={{
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    gap: '12px',
                                    marginBottom: '16px',
                                    padding: '10px 16px',
                                    background: 'var(--bg-card)',
                                    borderRadius: 'var(--radius-md)',
                                    border: '1px solid var(--border)',
                                    fontSize: '12px',
                                    fontWeight: '600',
                                    boxShadow: 'var(--shadow-sm)'
                                }}>
                                    {[
                                        { label: 'Pendiente', color: 'var(--status-pending)' },
                                        { label: 'Señado', color: 'var(--status-deposit)' },
                                        { label: 'Confirmado', color: 'var(--status-confirmed)' },
                                        { label: 'Finalizado', color: 'var(--status-completed)' },
                                        { label: 'Cancelado', color: 'var(--status-cancelled)' },
                                        { label: 'Bloqueado', color: 'var(--status-blocked)' }
                                    ].map(s => (
                                        <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <div style={{ width: '10px', height: '10px', borderRadius: '3px', background: s.color }} />
                                            <span style={{ color: 'var(--text-secondary)' }}>{s.label}</span>
                                        </div>
                                    ))}
                                </div>
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
                            <BusinessSettings
                                business={currentBusiness}
                                isMobile={isMobile}
                                onUpdate={(updated) => {
                                    setBusinesses(prev => prev.map(b => b.id === updated.id ? updated : b));
                                }}
                            />
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
                                                placeholder="Buscar por cliente o servicio..."
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
                                                    const filtered = bookings.filter(booking => {
                                                        const matchesSearch = (booking.customer_name || booking.customerName || '').toLowerCase().includes(listFilters.search.toLowerCase()) ||
                                                            (booking.services?.name || booking.courts?.name || booking.service || '').toLowerCase().includes(listFilters.search.toLowerCase());
                                                        const matchesStatus = listFilters.status === 'all' || booking.status === listFilters.status;
                                                        const matchesDate = !listFilters.date || booking.date === listFilters.date;
                                                        return matchesSearch && matchesStatus && matchesDate;
                                                    });
                                                    const startIndex = (currentPage - 1) * itemsPerPage;
                                                    const paginated = filtered.slice(startIndex, startIndex + itemsPerPage);

                                                    return paginated.map((booking, index) => (
                                                        <div
                                                            key={index}
                                                            onClick={() => handleBookingClick(booking)}
                                                            style={{
                                                                background: 'var(--bg-card)',
                                                                padding: '16px',
                                                                borderRadius: '16px',
                                                                border: '1px solid var(--border)',
                                                                boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                                                            }}
                                                        >
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                                                                <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>{booking.time} hs</span>
                                                                <span style={{
                                                                    padding: '4px 10px',
                                                                    borderRadius: 'var(--radius-full)',
                                                                    fontSize: '10px',
                                                                    fontWeight: '700',
                                                                    letterSpacing: '0.03em',
                                                                    background: getStatusStyle(booking.status).bg,
                                                                    color: getStatusStyle(booking.status).color
                                                                }}>
                                                                    {getStatusLabel(booking.status).toUpperCase()}
                                                                </span>
                                                            </div>
                                                            <div style={{ fontWeight: '600', color: 'var(--text-primary)', marginBottom: '4px' }}>
                                                                {booking.customer_name || booking.customerName || '-'}
                                                            </div>
                                                            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                                                                {booking.services?.name || booking.courts?.name || booking.service || '-'}
                                                            </div>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: 'var(--text-muted)' }}>
                                                                <span>{formatDisplayDate(booking.date)}</span>
                                                                <span style={{ color: 'var(--primary-paddle)', fontWeight: '600' }}>Ver detalles →</span>
                                                            </div>
                                                        </div>
                                                    ))
                                                })()}
                                            </div>
                                        ) : (
                                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                                <thead style={{ background: 'rgba(0,0,0,0.02)' }}>
                                                    <tr>
                                                        <th style={{ padding: '16px', textAlign: 'left', color: 'var(--text-secondary)' }}>Fecha</th>
                                                        <th style={{ padding: '16px', textAlign: 'left', color: 'var(--text-secondary)' }}>Hora</th>
                                                        <th style={{ padding: '16px', textAlign: 'left', color: 'var(--text-secondary)' }}>Cliente</th>
                                                        <th style={{ padding: '16px', textAlign: 'left', color: 'var(--text-secondary)' }}>Servicio</th>
                                                        <th style={{ padding: '16px', textAlign: 'left', color: 'var(--text-secondary)' }}>Estado</th>
                                                        <th style={{ padding: '16px', textAlign: 'right', color: 'var(--text-secondary)' }}>Acciones</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {(() => {
                                                        const filtered = bookings.filter(booking => {
                                                            const matchesSearch = (booking.customer_name || booking.customerName || '').toLowerCase().includes(listFilters.search.toLowerCase()) ||
                                                                (booking.services?.name || booking.courts?.name || booking.service || '').toLowerCase().includes(listFilters.search.toLowerCase());
                                                            const matchesStatus = listFilters.status === 'all' || booking.status === listFilters.status;
                                                            const matchesDate = !listFilters.date || booking.date === listFilters.date;
                                                            return matchesSearch && matchesStatus && matchesDate;
                                                        });

                                                        const totalPages = Math.ceil(filtered.length / itemsPerPage);
                                                        const startIndex = (currentPage - 1) * itemsPerPage;
                                                        const paginated = filtered.slice(startIndex, startIndex + itemsPerPage);

                                                        return paginated.map((booking, index) => (
                                                            <tr key={index} style={{ borderTop: '1px solid var(--border)' }}>
                                                                <td style={{ padding: '16px' }}>{formatDisplayDate(booking.date)}</td>
                                                                <td style={{ padding: '16px', fontWeight: 'bold' }}>{booking.time}</td>
                                                                <td style={{ padding: '16px' }}>
                                                                    <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{booking.customer_name || booking.customerName || '-'}</div>
                                                                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{booking.customer_phone || booking.customerPhone || '-'}</div>
                                                                </td>
                                                                <td style={{ padding: '16px' }}>
                                                                    {booking.services?.name || booking.courts?.name || booking.service || '-'}
                                                                </td>
                                                                <td style={{ padding: '16px' }}>
                                                                    <span style={{
                                                                        padding: '4px 10px',
                                                                        borderRadius: 'var(--radius-full)',
                                                                        fontSize: '10px',
                                                                        fontWeight: '700',
                                                                        letterSpacing: '0.03em',
                                                                        background: getStatusStyle(booking.status).bg,
                                                                        color: getStatusStyle(booking.status).color
                                                                    }}>
                                                                        {getStatusLabel(booking.status).toUpperCase()}
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
                                                        ));
                                                    })()}
                                                </tbody>
                                            </table>
                                        )}

                                        {/* Pagination Controls */}
                                        {(() => {
                                            const filtered = bookings.filter(booking => {
                                                const matchesSearch = (booking.customer_name || booking.customerName || '').toLowerCase().includes(listFilters.search.toLowerCase()) ||
                                                    (booking.services?.name || booking.courts?.name || booking.service || '').toLowerCase().includes(listFilters.search.toLowerCase());
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
        </div >
    );
}

