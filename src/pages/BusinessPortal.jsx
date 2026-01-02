import React, { useState, useEffect } from 'react';
import supabaseService from '../services/supabaseService';
import serviceAdapter from '../services/serviceAdapter';
import analyticsService from '../services/analyticsService';
import DashboardStats from '../components/DashboardStats';
import DashboardCalendar from '../components/DashboardCalendar';
import MetricsCard from '../components/analytics/MetricsCard';
import RevenueChart from '../components/analytics/RevenueChart';
import PeakHoursHeatmap from '../components/analytics/PeakHoursHeatmap';
import DateRangePicker from '../components/analytics/DateRangePicker';
import { motion, AnimatePresence } from 'framer-motion';
import { pushService } from '../services/pushService';
import ClientManagement from '../components/ClientManagement';
import BusinessSettings from '../components/BusinessSettings';
import { formatDisplayDate } from '../utils/dateUtils';
import BusinessLogin from '../components/business/BusinessLogin';
import BusinessPortalSidebar from '../components/business/BusinessPortalSidebar';
import BookingDetailsModal from '../components/business/BookingDetailsModal';
import NewBookingModal from '../components/business/NewBookingModal';

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

    useEffect(() => {
        const checkAutoLogin = async () => {
            const storedEmail = localStorage.getItem('turnitos_business_email');
            if (storedEmail) {
                setLoginEmail(storedEmail);
                setRememberMe(true);
                try {
                    const businessesData = await serviceAdapter.getBusinesses();
                    const biz = businessesData.find(b => b.email === storedEmail);
                    if (biz) {
                        setSelectedBusinessId(biz.id);
                        setBusinesses(businessesData);
                        setIsLoggedIn(true);
                    }
                } catch (err) {
                    console.log("Auto-login failed", err);
                }
            }
        };
        checkAutoLogin();
    }, []);

    const [viewMode, setViewMode] = useState('calendar'); // 'calendar', 'list', 'analytics', 'settings'

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
                const fullBusiness = await serviceAdapter.getBusinessById(business.id);
                setBusinesses(prev => prev.map(b => b.id === fullBusiness.id ? fullBusiness : b));
                setSelectedBusinessId(business.id);
                setIsLoggedIn(true);

                if (remember) {
                    localStorage.setItem('turnitos_business_email', email);
                } else {
                    localStorage.removeItem('turnitos_business_email');
                }

                // --- Solicitar permiso y token de notificaciones (Desactivado para desarrollo local sin HTTPS) ---
                /*
                try {
                    console.log('Solicitando permisos de notificación para:', business.id);
                    await pushService.requestPermissionAndGetToken(business.id);
                } catch (pushError) {
                    console.warn('No se pudieron activar las notificaciones push:', pushError);
                }
                */
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
                console.log('Real-time update:', payload);

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
            'blocked': 'Bloqueado',
            'deposit_paid': 'Señado',
            'attended': 'Presente',
            'completed': 'Finalizado'
        };
        return labels[status] || status;
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

    const handleCreateBooking = async (date, time) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;

        setNewBookingData({
            date: dateStr,
            time: time,
            customerName: '',
            customerPhone: '',
            serviceId: '',
            price: 0
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
                price: 0
            });
        } catch (error) {
            console.error('Error creating booking:', error);
            alert('Error al crear la reserva');
        }
    };

    const handleBlockSlot = async (date, time) => {
        let dateStr, timeStr;

        if (date && time) {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            dateStr = `${year}-${month}-${day}`;
            timeStr = time;
            if (!confirm(`¿Bloquear horario ${dateStr} ${timeStr}?`)) return;
        } else {
            timeStr = prompt('Ingrese la hora a bloquear (ej: 14:00)');
            if (!timeStr) return;
            const now = new Date();
            dateStr = now.toISOString().split('T')[0];
        }

        const bookingData = {
            businessId: selectedBusinessId,
            serviceId: null,
            courtId: null,
            date: dateStr,
            time: timeStr,
            customerName: 'BLOQUEADO POR ADMIN',
            customerEmail: '-',
            customerPhone: '-',
            status: 'blocked',
            price: 0,
            history: [
                {
                    action: 'blocked',
                    label: 'Horario Bloqueado',
                    timestamp: new Date().toISOString(),
                    status: 'blocked'
                }
            ]
        };

        try {
            await serviceAdapter.createBooking(bookingData);
            fetchBookings();
        } catch (error) {
            console.error('Error blocking slot:', error);
            alert('Error al bloquear horario');
        }
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
                    padding: '16px 20px',
                    background: 'var(--bg-card)',
                    borderBottom: '1px solid var(--border)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    position: 'sticky',
                    top: 0,
                    zIndex: 100
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {(currentBusiness?.logo || currentBusiness?.image) && (
                            <img
                                src={currentBusiness.logo || currentBusiness.image}
                                alt="Logo"
                                style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }}
                            />
                        )}
                        <h1 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>
                            {currentBusiness?.name || 'Portal Socios'}
                        </h1>
                    </div>
                    <button
                        onClick={() => setShowSidebar(!showSidebar)}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            fontSize: '24px',
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
                onLogout={() => setIsLoggedIn(false)}
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
                    <div style={{ textAlign: 'center', padding: '100px' }}>
                        <div style={{ fontSize: '40px', marginBottom: '20px', animation: 'spin 2s linear infinite' }}>⏳</div>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '18px' }}>Cargando información...</p>
                    </div>
                ) : (
                    <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
                        {viewMode === 'analytics' ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', overflowY: 'auto', flex: 1, paddingRight: '4px' }}>
                                {/* Date Range Picker */}
                                <div>
                                    <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: 'var(--text-primary)' }}>Período</h3>
                                    <DateRangePicker onRangeChange={setDateRange} />
                                </div>

                                {/* Metrics Cards */}
                                {metrics && (
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
                                        <MetricsCard
                                            icon="💰"
                                            title="Ingresos Totales"
                                            value={metrics.totalRevenue}
                                            trend={metrics.growth.revenue}
                                            format="currency"
                                            color="#10b981"
                                        />
                                        <MetricsCard
                                            icon="📅"
                                            title="Total Reservas"
                                            value={metrics.totalBookings}
                                            trend={metrics.growth.bookings}
                                            format="number"
                                            color="#6366f1"
                                        />
                                        <MetricsCard
                                            icon="💵"
                                            title="Valor Promedio"
                                            value={metrics.avgBookingValue}
                                            format="currency"
                                            color="#f59e0b"
                                        />
                                        <MetricsCard
                                            icon="✅"
                                            title="Tasa de Completitud"
                                            value={metrics.completionRate}
                                            format="percentage"
                                            color="#8b5cf6"
                                        />
                                    </div>
                                )}

                                {/* Charts */}
                                <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(${isMobile ? '300px' : '400px'}, 1fr))`, gap: '20px' }}>
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

                                {/* Customer Insights */}
                                {customerInsights && (
                                    <div style={{
                                        backgroundColor: 'var(--bg-card)',
                                        borderRadius: '16px',
                                        padding: '24px',
                                        border: '1px solid var(--border)',
                                        boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
                                    }}>
                                        <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '20px', color: 'var(--text-primary)' }}>Insights de Clientes</h3>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '20px' }}>
                                            <div>
                                                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Total Clientes</div>
                                                <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--text-primary)' }}>{customerInsights.totalCustomers}</div>
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Clientes Nuevos</div>
                                                <div style={{ fontSize: '24px', fontWeight: '700', color: '#10b981' }}>{customerInsights.newCustomers}</div>
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Clientes Recurrentes</div>
                                                <div style={{ fontSize: '24px', fontWeight: '700', color: '#6366f1' }}>{customerInsights.returningCustomers}</div>
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Tasa de Retención</div>
                                                <div style={{ fontSize: '24px', fontWeight: '700', color: '#f59e0b' }}>{customerInsights.retentionRate.toFixed(1)}%</div>
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
                                    gap: '16px',
                                    marginBottom: '20px',
                                    padding: '12px 16px',
                                    background: 'var(--bg-card)',
                                    borderRadius: '16px',
                                    border: '1px solid var(--border)',
                                    fontSize: '12px',
                                    fontWeight: '600',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#9CA3AF' }}></div>
                                        <span style={{ color: 'var(--text-secondary)' }}>Pendiente</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#F59E0B' }}></div>
                                        <span style={{ color: 'var(--text-secondary)' }}>Señado</span>
                                    </div>
                                    {(currentBusiness?.type === 'sport' || currentBusiness?.type === 'venue') ? (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#059669' }}></div>
                                            <span style={{ color: 'var(--text-secondary)' }}>Confirmado</span>
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#2563EB' }}></div>
                                            <span style={{ color: 'var(--text-secondary)' }}>Confirmado</span>
                                        </div>
                                    )}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#10B981' }}></div>
                                        <span style={{ color: 'var(--text-secondary)' }}>Finalizado</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#DC2626' }}></div>
                                        <span style={{ color: 'var(--text-secondary)' }}>Cancelado</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#374151' }}></div>
                                        <span style={{ color: 'var(--text-secondary)' }}>Bloqueado</span>
                                    </div>
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
                                    <DashboardCalendar
                                        bookings={bookings}
                                        business={currentBusiness}
                                        isMobile={isMobile}
                                        onBlockSlot={handleBlockSlot}
                                        onCreateBooking={handleCreateBooking}
                                        onBookingClick={handleBookingClick}
                                        onMoveBooking={handleMoveBooking}
                                        viewMode={calendarViewMode}
                                        setViewMode={setCalendarViewMode}
                                        currentDate={calendarDate}
                                        setCurrentDate={setCalendarDate}
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
                                    // Update in the list of businesses too
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
                                            <input
                                                type="date"
                                                value={listFilters.date}
                                                onChange={(e) => {
                                                    setListFilters(prev => ({ ...prev, date: e.target.value }));
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
                                            />
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
                                                                    padding: '4px 8px',
                                                                    borderRadius: '6px',
                                                                    fontSize: '11px',
                                                                    fontWeight: '700',
                                                                    background: booking.status === 'confirmed' ? 'rgba(0,230,118,0.1)' :
                                                                        (booking.status === 'cancelled' ? 'rgba(255,68,68,0.1)' :
                                                                            (booking.status === 'deposit_paid' ? 'rgba(245,158,11,0.1)' : 'rgba(0,0,0,0.05)')),
                                                                    color: booking.status === 'confirmed' ? '#00E676' :
                                                                        (booking.status === 'cancelled' ? '#ff4444' :
                                                                            (booking.status === 'deposit_paid' ? '#F59E0B' : 'var(--text-secondary)'))
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
                                                                        padding: '4px 8px',
                                                                        borderRadius: '4px',
                                                                        fontSize: '12px',
                                                                        background: booking.status === 'confirmed' ? 'rgba(0,230,118,0.1)' :
                                                                            (booking.status === 'cancelled' ? 'rgba(255,68,68,0.1)' :
                                                                                (booking.status === 'deposit_paid' ? 'rgba(245,158,11,0.1)' : 'rgba(0,0,0,0.05)')),
                                                                        color: booking.status === 'confirmed' ? '#00E676' :
                                                                            (booking.status === 'cancelled' ? '#ff4444' :
                                                                                (booking.status === 'deposit_paid' ? '#F59E0B' : 'var(--text-secondary)'))
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
                    </div>
                )}
            </div>
            {
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
            }

            {/* New Booking Modal */}
            <NewBookingModal
                showNewBookingModal={showNewBookingModal}
                setShowNewBookingModal={setShowNewBookingModal}
                newBookingData={newBookingData}
                setNewBookingData={setNewBookingData}
                handleSubmitNewBooking={handleSubmitNewBooking}
                currentBusiness={currentBusiness}
                isMobile={isMobile}
            />
        </div>
    );
}

