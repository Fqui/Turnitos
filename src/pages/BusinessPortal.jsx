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

export default function BusinessPortal() {
    const [businesses, setBusinesses] = useState([]);
    const [selectedBusinessId, setSelectedBusinessId] = useState('');
    const [password, setPassword] = useState('');
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(false);
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

    // Calendar state (lifted for stats synchronization)
    const [calendarViewMode, setCalendarViewMode] = useState('week');
    const [calendarDate, setCalendarDate] = useState(() => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return d;
    });

    // List view filters
    const [listFilters, setListFilters] = useState({
        search: '',
        status: 'all',
        date: ''
    });

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

    const handleLogin = async (e) => {
        e.preventDefault();
        if (!selectedBusinessId || !password) {
            alert('Por favor complete todos los campos');
            return;
        }

        setLoading(true);
        try {
            const business = await serviceAdapter.login(selectedBusinessId, password);
            if (business) {
                const fullBusiness = await serviceAdapter.getBusinessById(business.id);
                setBusinesses(prev => prev.map(b => b.id === fullBusiness.id ? fullBusiness : b));
                setIsLoggedIn(true);
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
        if (isLoggedIn) {
            fetchBookings();
        }
    }, [isLoggedIn]);

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
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--bg-main)'
            }}>
                <div style={{
                    background: 'var(--bg-card)',
                    padding: '40px',
                    borderRadius: '24px',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.1)',
                    width: '100%',
                    maxWidth: '400px',
                    border: '1px solid var(--border)'
                }}>
                    <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                        <div style={{ fontSize: '40px', marginBottom: '16px' }}>🏢</div>
                        <h2 style={{ color: 'var(--text-primary)', margin: 0 }}>Portal Socios</h2>
                        <p style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>Gestiona tu negocio en tiempo real</p>
                    </div>

                    <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <select
                            value={selectedBusinessId}
                            onChange={(e) => setSelectedBusinessId(e.target.value)}
                            required
                            style={{ padding: '14px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-primary)' }}
                        >
                            <option value="">Selecciona tu negocio</option>
                            {businesses.map(b => (
                                <option key={b.id} value={b.id}>{b.name}</option>
                            ))}
                        </select>
                        <input
                            type="password"
                            placeholder="Contraseña"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            style={{ padding: '14px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-primary)' }}
                        />
                        <button
                            type="submit"
                            style={{
                                padding: '14px',
                                background: 'var(--primary-paddle)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '12px',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                fontSize: '16px',
                                marginTop: '8px'
                            }}
                        >
                            Ingresar al Panel
                        </button>
                    </form>
                </div>
            </div>
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
                    <h1 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>
                        {currentBusiness?.name || 'Portal Socios'}
                    </h1>
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

            {/* Sidebar */}
            <div style={{
                width: isMobile ? '100%' : '280px',
                background: 'var(--bg-card)',
                borderRight: isMobile ? 'none' : '1px solid var(--border)',
                display: showSidebar ? 'flex' : 'none',
                flexDirection: 'column',
                padding: '30px 20px',
                position: isMobile ? 'fixed' : 'sticky',
                top: isMobile ? '60px' : 0,
                left: 0,
                right: 0,
                bottom: 0,
                height: isMobile ? 'calc(100vh - 60px)' : '100vh',
                zIndex: 99,
                overflowY: 'auto'
            }}>
                <div style={{ marginBottom: '40px', display: isMobile ? 'none' : 'block' }}>
                    <h1 style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.5px' }}>
                        {currentBusiness?.name || 'Portal Socios'}
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0 0', fontSize: '13px', fontWeight: '500' }}>Panel de Control</p>
                </div>

                <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                    <button
                        onClick={() => { setViewMode('calendar'); isMobile && setShowSidebar(false); }}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            padding: '12px 16px',
                            borderRadius: '12px',
                            border: 'none',
                            background: viewMode === 'calendar' ? 'var(--primary-paddle)' : 'transparent',
                            color: viewMode === 'calendar' ? '#000' : 'var(--text-secondary)',
                            cursor: 'pointer',
                            fontWeight: '700',
                            transition: 'all 0.2s',
                            textAlign: 'left'
                        }}
                    >
                        <span style={{ fontSize: '18px' }}>📅</span> <span style={{ color: viewMode === 'calendar' ? '#000' : 'inherit' }}>Calendario</span>
                    </button>
                    <button
                        onClick={() => { setViewMode('list'); isMobile && setShowSidebar(false); }}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            padding: '12px 16px',
                            borderRadius: '12px',
                            border: 'none',
                            background: viewMode === 'list' ? 'var(--primary-paddle)' : 'transparent',
                            color: viewMode === 'list' ? '#000' : 'var(--text-secondary)',
                            cursor: 'pointer',
                            fontWeight: '700',
                            transition: 'all 0.2s',
                            textAlign: 'left'
                        }}
                    >
                        <span style={{ fontSize: '18px' }}>📋</span> <span style={{ color: viewMode === 'list' ? '#000' : 'inherit' }}>Lista de Reservas</span>
                    </button>
                    <button
                        onClick={() => { setViewMode('analytics'); isMobile && setShowSidebar(false); }}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            padding: '12px 16px',
                            borderRadius: '12px',
                            border: 'none',
                            background: viewMode === 'analytics' ? 'var(--primary-paddle)' : 'transparent',
                            color: viewMode === 'analytics' ? '#000' : 'var(--text-secondary)',
                            cursor: 'pointer',
                            fontWeight: '700',
                            transition: 'all 0.2s',
                            textAlign: 'left'
                        }}
                    >
                        <span style={{ fontSize: '18px' }}>📊</span> <span style={{ color: viewMode === 'analytics' ? '#000' : 'inherit' }}>Analytics</span>
                    </button>
                    <button
                        onClick={() => { setViewMode('settings'); isMobile && setShowSidebar(false); }}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            padding: '12px 16px',
                            borderRadius: '12px',
                            border: 'none',
                            background: viewMode === 'settings' ? 'var(--primary-paddle)' : 'transparent',
                            color: viewMode === 'settings' ? '#000' : 'var(--text-secondary)',
                            cursor: 'pointer',
                            fontWeight: '700',
                            transition: 'all 0.2s',
                            textAlign: 'left'
                        }}
                    >
                        <span style={{ fontSize: '18px' }}>⚙️</span> <span style={{ color: viewMode === 'settings' ? '#000' : 'inherit' }}>Configuración</span>
                    </button>
                </nav>

                <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', paddingBottom: isMobile ? '40px' : 0 }}>
                    <button
                        onClick={() => { fetchBookings(); isMobile && setShowSidebar(false); }}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            padding: '10px 16px',
                            borderRadius: '10px',
                            border: '1px solid var(--border)',
                            background: 'var(--bg-main)',
                            color: 'var(--text-primary)',
                            cursor: 'pointer',
                            fontSize: '13px',
                            fontWeight: '600'
                        }}
                    >
                        <span>↻</span> Actualizar Datos
                    </button>
                    <button
                        onClick={() => setIsLoggedIn(false)}
                        style={{
                            padding: '10px 16px',
                            borderRadius: '10px',
                            border: '1px solid rgba(255,68,68,0.2)',
                            background: 'rgba(255,68,68,0.05)',
                            color: '#ff4444',
                            cursor: 'pointer',
                            fontSize: '13px',
                            fontWeight: '600'
                        }}
                    >
                        Cerrar Sesión
                    </button>
                </div>
            </div>

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
                        ) : viewMode === 'calendar' ? (
                            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                                {/* Stats Row - Only in Calendar View */}
                                <div style={{ marginBottom: '20px', flexShrink: 0 }}>
                                    <DashboardStats
                                        bookings={bookings}
                                        viewMode={calendarViewMode}
                                        currentDate={calendarDate}
                                        isMobile={isMobile}
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
                                        <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#F59E0B' }}></div>
                                        <span style={{ color: 'var(--text-secondary)' }}>Señado</span>
                                    </div>
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
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                                    <DashboardCalendar
                                        bookings={bookings}
                                        business={currentBusiness}
                                        isMobile={isMobile}
                                        onBlockSlot={handleBlockSlot}
                                        onCreateBooking={handleCreateBooking}
                                        onBookingClick={handleBookingClick}
                                        viewMode={calendarViewMode}
                                        setViewMode={setCalendarViewMode}
                                        currentDate={calendarDate}
                                        setCurrentDate={setCalendarDate}
                                    />
                                </div>
                            </div>
                        ) : (
                            <div style={{
                                background: 'var(--bg-card)',
                                borderRadius: '16px',
                                border: isMobile ? 'none' : '1px solid var(--border)',
                                flex: 1,
                                overflowY: 'auto',
                                paddingRight: isMobile ? 0 : '10px'
                            }}>
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
                                            onChange={(e) => setListFilters(prev => ({ ...prev, search: e.target.value }))}
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
                                            onChange={(e) => setListFilters(prev => ({ ...prev, status: e.target.value }))}
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
                                            onChange={(e) => setListFilters(prev => ({ ...prev, date: e.target.value }))}
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
                                                onClick={() => setListFilters({ search: '', status: 'all', date: '' })}
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

                                {isMobile ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px' }}>
                                        {bookings.filter(booking => {
                                            const matchesSearch = (booking.customer_name || booking.customerName || '').toLowerCase().includes(listFilters.search.toLowerCase()) ||
                                                (booking.services?.name || booking.courts?.name || booking.service || '').toLowerCase().includes(listFilters.search.toLowerCase());
                                            const matchesStatus = listFilters.status === 'all' || booking.status === listFilters.status;
                                            const matchesDate = !listFilters.date || booking.date === listFilters.date;
                                            return matchesSearch && matchesStatus && matchesDate;
                                        }).map((booking, index) => (
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
                                                    <span>{booking.date}</span>
                                                    <span style={{ color: 'var(--primary-paddle)', fontWeight: '600' }}>Ver detalles →</span>
                                                </div>
                                            </div>
                                        ))}
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
                                            {bookings.filter(booking => {
                                                const matchesSearch = (booking.customer_name || booking.customerName || '').toLowerCase().includes(listFilters.search.toLowerCase()) ||
                                                    (booking.services?.name || booking.courts?.name || booking.service || '').toLowerCase().includes(listFilters.search.toLowerCase());
                                                const matchesStatus = listFilters.status === 'all' || booking.status === listFilters.status;
                                                const matchesDate = !listFilters.date || booking.date === listFilters.date;
                                                return matchesSearch && matchesStatus && matchesDate;
                                            }).map((booking, index) => (
                                                <tr key={index} style={{ borderTop: '1px solid var(--border)' }}>
                                                    <td style={{ padding: '16px' }}>{booking.date}</td>
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
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Booking Details Modal */}
            {
                showBookingModal && selectedBooking && (
                    <div style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0,0,0,0.5)',
                        display: 'flex',
                        alignItems: isMobile ? 'flex-end' : 'center',
                        justifyContent: 'center',
                        zIndex: 1000,
                        backdropFilter: 'blur(4px)',
                        padding: isMobile ? '0' : '20px'
                    }} onClick={() => setShowBookingModal(false)}>
                        <div style={{
                            background: 'var(--bg-card)',
                            padding: isMobile ? '24px 20px 40px 20px' : '32px',
                            borderRadius: isMobile ? '24px 24px 0 0' : '24px',
                            width: '100%',
                            maxWidth: isMobile ? '100%' : '500px',
                            boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
                            border: '1px solid var(--border)',
                            maxHeight: isMobile ? '90vh' : '95vh',
                            overflowY: 'auto'
                        }} onClick={e => e.stopPropagation()}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                                <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)' }}>Detalles de la Reserva</h3>
                                <button onClick={() => setShowBookingModal(false)} style={{ background: 'transparent', border: 'none', fontSize: '24px', cursor: 'pointer', color: 'var(--text-secondary)' }}>&times;</button>
                            </div>

                            <div style={{ display: 'grid', gap: '20px' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Fecha</label>
                                        <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{selectedBooking.date}</div>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Hora</label>
                                        <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{selectedBooking.time} hs</div>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Cliente</label>
                                        <div style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '18px' }}>{selectedBooking.customer_name || selectedBooking.customerName || '-'}</div>
                                        <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>{selectedBooking.customer_phone || selectedBooking.customerPhone || '-'}</div>
                                    </div>
                                    {selectedBooking.status !== 'blocked' && selectedBooking.status !== 'completed' && selectedBooking.status !== 'cancelled' && (
                                        <button
                                            onClick={() => {
                                                if (selectedBooking.status === 'confirmed' || selectedBooking.status === 'pending') return;
                                                const name = selectedBooking.customer_name || selectedBooking.customerName;
                                                const phone = selectedBooking.customer_phone || selectedBooking.customerPhone;
                                                const date = selectedBooking.date;
                                                const time = selectedBooking.time;
                                                const businessName = currentBusiness?.name || 'nuestro local';
                                                const message = `Hola ${name}, te recordamos tu turno para el día ${date} a las ${time} hs en ${businessName}. ¿Confirmas tu asistencia?`;
                                                window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
                                            }}
                                            disabled={selectedBooking.status === 'confirmed' || selectedBooking.status === 'pending'}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                                padding: '8px 12px',
                                                borderRadius: '10px',
                                                border: (selectedBooking.status === 'confirmed' || selectedBooking.status === 'pending') ? '1px solid var(--border)' : '1px solid #25D366',
                                                background: (selectedBooking.status === 'confirmed' || selectedBooking.status === 'pending') ? 'transparent' : 'rgba(37, 211, 102, 0.1)',
                                                color: (selectedBooking.status === 'confirmed' || selectedBooking.status === 'pending') ? 'var(--text-secondary)' : '#25D366',
                                                fontSize: '13px',
                                                fontWeight: '700',
                                                cursor: (selectedBooking.status === 'confirmed' || selectedBooking.status === 'pending') ? 'default' : 'pointer',
                                                transition: 'all 0.2s',
                                                opacity: (selectedBooking.status === 'confirmed' || selectedBooking.status === 'pending') ? 0.5 : 1
                                            }}
                                            onMouseEnter={(e) => {
                                                if (selectedBooking.status !== 'confirmed' && selectedBooking.status !== 'pending') {
                                                    e.currentTarget.style.background = 'rgba(37, 211, 102, 0.2)';
                                                }
                                            }}
                                            onMouseLeave={(e) => {
                                                if (selectedBooking.status !== 'confirmed' && selectedBooking.status !== 'pending') {
                                                    e.currentTarget.style.background = 'rgba(37, 211, 102, 0.1)';
                                                }
                                            }}
                                        >
                                            <span>📲</span> {selectedBooking.status === 'confirmed' ? 'Asistencia Confirmada' : (selectedBooking.status === 'pending' ? 'Recordar (Pendiente)' : 'Recordar')}
                                        </button>
                                    )}
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Servicio / Recurso</label>
                                    <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                                        {selectedBooking.services?.name || selectedBooking.courts?.name || selectedBooking.service || '-'}
                                    </div>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: 'var(--bg-main)', borderRadius: '12px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Estado</label>
                                        <div style={{
                                            fontWeight: '700',
                                            color: selectedBooking.status === 'confirmed' ? '#00E676' :
                                                (selectedBooking.status === 'cancelled' ? '#ff4444' :
                                                    (selectedBooking.status === 'deposit_paid' ? '#F59E0B' : 'var(--text-primary)')),
                                            textTransform: 'uppercase',
                                            fontSize: '14px'
                                        }}>
                                            {getStatusLabel(selectedBooking.status)}
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Precio</label>
                                        <div style={{ fontWeight: '700', color: 'var(--text-primary)', fontSize: '18px' }}>${selectedBooking.price}</div>
                                    </div>
                                </div>

                                <div style={{ padding: '16px', background: 'rgba(0,0,0,0.02)', borderRadius: '12px', fontSize: '12px' }}>
                                    <div style={{ fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', fontSize: '10px', letterSpacing: '0.5px' }}>Historial del Turno</div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <div style={{ borderLeft: '2px solid var(--primary-paddle)', paddingLeft: '12px', marginBottom: '8px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                                                <span style={{ fontWeight: '700', color: 'var(--text-primary)' }}>Turno Creado</span>
                                                <span style={{ color: 'var(--text-secondary)', fontSize: '10px' }}>
                                                    {selectedBooking.created_at ? new Date(selectedBooking.created_at).toLocaleString('es-AR') :
                                                        (selectedBooking.history?.find(h => h.action === 'creation')?.timestamp ?
                                                            new Date(selectedBooking.history.find(h => h.action === 'creation').timestamp).toLocaleString('es-AR') : '-')}
                                                </span>
                                            </div>
                                        </div>

                                        {selectedBooking.history && selectedBooking.history.filter(h => h.action !== 'creation').map((log, idx) => (
                                            <div key={idx} style={{ borderLeft: '2px solid var(--border)', paddingLeft: '12px', marginBottom: '4px' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                                                    <span style={{ fontWeight: '700', color: 'var(--text-primary)' }}>{log.label}</span>
                                                    <span style={{ color: 'var(--text-secondary)', fontSize: '10px' }}>
                                                        {new Date(log.timestamp).toLocaleString('es-AR')}
                                                    </span>
                                                </div>
                                                {log.reason && (
                                                    <div style={{ color: '#ff4444', fontStyle: 'italic', fontSize: '11px' }}>
                                                        Motivo: {log.reason}
                                                    </div>
                                                )}
                                            </div>
                                        ))}

                                        {(!selectedBooking.history || selectedBooking.history.length === 0) && (
                                            <>
                                                {selectedBooking.confirmed_at && (
                                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                        <span style={{ color: 'var(--text-secondary)' }}>Confirmado:</span>
                                                        <span style={{ color: '#00E676', fontWeight: '500' }}>
                                                            {new Date(selectedBooking.confirmed_at).toLocaleString('es-AR')}
                                                        </span>
                                                    </div>
                                                )}
                                                {selectedBooking.cancelled_at && (
                                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                        <span style={{ color: 'var(--text-secondary)' }}>Cancelado:</span>
                                                        <span style={{ color: '#ff4444', fontWeight: '500' }}>
                                                            {new Date(selectedBooking.cancelled_at).toLocaleString('es-AR')}
                                                        </span>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '12px' }}>
                                    {selectedBooking.status === 'blocked' ? (
                                        <button
                                            onClick={() => handleBookingAction('unblock')}
                                            style={{
                                                gridColumn: 'span 2',
                                                padding: '12px',
                                                borderRadius: '12px',
                                                border: 'none',
                                                background: 'var(--primary-paddle)',
                                                color: 'white',
                                                fontWeight: '700',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            Desbloquear Horario
                                        </button>
                                    ) : (
                                        <>
                                            {(selectedBooking.status === 'pending' || selectedBooking.status === 'deposit_paid') && (
                                                <button
                                                    onClick={() => selectedBooking.status === 'pending' && handleBookingAction('confirm_deposit')}
                                                    disabled={selectedBooking.status === 'deposit_paid'}
                                                    style={{
                                                        padding: '12px',
                                                        borderRadius: '12px',
                                                        border: 'none',
                                                        background: '#F59E0B',
                                                        color: 'white',
                                                        fontWeight: '700',
                                                        cursor: selectedBooking.status === 'deposit_paid' ? 'default' : 'pointer',
                                                        opacity: selectedBooking.status === 'deposit_paid' ? 0.5 : 1
                                                    }}
                                                >
                                                    {selectedBooking.status === 'deposit_paid' ? 'Seña Confirmada' : 'Confirmar Seña'}
                                                </button>
                                            )}
                                            {(selectedBooking.status === 'pending' || selectedBooking.status === 'deposit_paid') && (
                                                <button
                                                    onClick={() => handleBookingAction('confirm_booking')}
                                                    style={{
                                                        padding: '12px',
                                                        borderRadius: '12px',
                                                        border: 'none',
                                                        background: 'var(--primary-paddle)',
                                                        color: 'white',
                                                        fontWeight: '700',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    Confirmar Turno
                                                </button>
                                            )}
                                            {(selectedBooking.status === 'confirmed' || selectedBooking.status === 'attended') && (
                                                <button
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        handleBookingAction('complete_booking');
                                                    }}
                                                    style={{
                                                        gridColumn: 'span 2',
                                                        padding: '12px',
                                                        borderRadius: '12px',
                                                        border: 'none',
                                                        background: '#000',
                                                        color: 'white',
                                                        fontWeight: '700',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    Finalizar
                                                </button>
                                            )}
                                            {selectedBooking.status !== 'cancelled' && selectedBooking.status !== 'completed' && (
                                                <button
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        handleBookingAction('cancel');
                                                    }}
                                                    style={{
                                                        gridColumn: 'span 2',
                                                        padding: '12px',
                                                        borderRadius: '12px',
                                                        border: 'none',
                                                        background: '#ff4444',
                                                        color: 'white',
                                                        fontWeight: '700',
                                                        cursor: 'pointer',
                                                        marginTop: '8px'
                                                    }}
                                                >
                                                    Cancelar Reserva
                                                </button>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* New Booking Modal */}
            {
                showNewBookingModal && (
                    <div style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0,0,0,0.5)',
                        display: 'flex',
                        alignItems: isMobile ? 'flex-end' : 'center',
                        justifyContent: 'center',
                        zIndex: 1000,
                        backdropFilter: 'blur(4px)',
                        padding: isMobile ? '0' : '20px'
                    }} onClick={() => setShowNewBookingModal(false)}>
                        <div style={{
                            background: 'var(--bg-card)',
                            padding: isMobile ? '24px 20px 40px 20px' : '32px',
                            borderRadius: isMobile ? '24px 24px 0 0' : '24px',
                            width: '100%',
                            maxWidth: isMobile ? '100%' : '500px',
                            boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
                            border: '1px solid var(--border)',
                            maxHeight: isMobile ? '90vh' : '95vh',
                            overflowY: 'auto',
                            animation: isMobile ? 'slideUpMobile 0.3s ease-out' : 'slideUp 0.3s ease-out'
                        }} onClick={e => e.stopPropagation()}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                                <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)' }}>Crear Nueva Reserva</h3>
                                <button onClick={() => setShowNewBookingModal(false)} style={{ background: 'transparent', border: 'none', fontSize: '24px', cursor: 'pointer', color: 'var(--text-secondary)' }}>&times;</button>
                            </div>

                            <form onSubmit={handleSubmitNewBooking} style={{ display: 'grid', gap: '16px' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)' }}>Fecha</label>
                                        <input
                                            type="text"
                                            value={newBookingData.date}
                                            disabled
                                            style={{
                                                width: '100%',
                                                padding: '12px',
                                                borderRadius: '10px',
                                                border: '1px solid var(--border)',
                                                background: 'var(--bg-main)',
                                                color: 'var(--text-primary)',
                                                fontSize: '14px'
                                            }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)' }}>Hora</label>
                                        <input
                                            type="text"
                                            value={newBookingData.time}
                                            disabled
                                            style={{
                                                width: '100%',
                                                padding: '12px',
                                                borderRadius: '10px',
                                                border: '1px solid var(--border)',
                                                background: 'var(--bg-main)',
                                                color: 'var(--text-primary)',
                                                fontSize: '14px'
                                            }}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)' }}>Nombre del Cliente *</label>
                                    <input
                                        type="text"
                                        value={newBookingData.customerName}
                                        onChange={(e) => setNewBookingData({ ...newBookingData, customerName: e.target.value })}
                                        required
                                        placeholder="Ej: Juan Pérez"
                                        style={{
                                            width: '100%',
                                            padding: '12px',
                                            borderRadius: '10px',
                                            border: '1px solid var(--border)',
                                            background: 'var(--bg-main)',
                                            color: 'var(--text-primary)',
                                            fontSize: '14px',
                                            outline: 'none'
                                        }}
                                    />
                                </div>

                                <div>
                                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)' }}>Teléfono *</label>
                                    <input
                                        type="tel"
                                        value={newBookingData.customerPhone}
                                        onChange={(e) => {
                                            const val = e.target.value.replace(/\D/g, '');
                                            setNewBookingData({ ...newBookingData, customerPhone: val });
                                        }}
                                        required
                                        placeholder="3804123456"
                                        style={{
                                            width: '100%',
                                            padding: '12px',
                                            borderRadius: '10px',
                                            border: '1px solid var(--border)',
                                            background: 'var(--bg-main)',
                                            color: 'var(--text-primary)',
                                            fontSize: '14px',
                                            outline: 'none'
                                        }}
                                    />
                                </div>

                                <div>
                                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)' }}>Servicio / Recurso</label>
                                    <select
                                        value={newBookingData.serviceId}
                                        onChange={(e) => {
                                            const allResources = [
                                                ...(currentBusiness?.services || []),
                                                ...(currentBusiness?.courts || [])
                                            ];
                                            const selectedResource = allResources.find(r => r.id === e.target.value);
                                            setNewBookingData({
                                                ...newBookingData,
                                                serviceId: e.target.value,
                                                price: selectedResource?.price || 0
                                            });
                                        }}
                                        style={{
                                            width: '100%',
                                            padding: '12px',
                                            borderRadius: '10px',
                                            border: '1px solid var(--border)',
                                            background: 'var(--bg-main)',
                                            color: 'var(--text-primary)',
                                            fontSize: '14px',
                                            outline: 'none',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <option value="">Seleccionar...</option>
                                        {currentBusiness?.services?.map(service => (
                                            <option key={service.id} value={service.id}>
                                                {service.name} - ${service.price}
                                            </option>
                                        ))}
                                        {currentBusiness?.courts?.map(court => (
                                            <option key={court.id} value={court.id}>
                                                {court.name} - ${court.price}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)' }}>Precio</label>
                                    <input
                                        type="number"
                                        value={newBookingData.price}
                                        onChange={(e) => setNewBookingData({ ...newBookingData, price: e.target.value })}
                                        placeholder="0"
                                        min="0"
                                        step="0.01"
                                        style={{
                                            width: '100%',
                                            padding: '12px',
                                            borderRadius: '10px',
                                            border: '1px solid var(--border)',
                                            background: 'var(--bg-main)',
                                            color: 'var(--text-primary)',
                                            fontSize: '14px',
                                            outline: 'none'
                                        }}
                                    />
                                </div>

                                <button
                                    type="submit"
                                    style={{
                                        width: '100%',
                                        padding: '14px',
                                        borderRadius: '12px',
                                        border: 'none',
                                        background: 'var(--primary-paddle)',
                                        color: 'white',
                                        fontWeight: '700',
                                        fontSize: '16px',
                                        cursor: 'pointer',
                                        marginTop: '12px',
                                        boxShadow: '0 4px 12px rgba(0, 230, 118, 0.2)'
                                    }}
                                >
                                    Crear Reserva
                                </button>
                            </form>
                        </div>
                    </div>
                )
            }
        </div >
    );
}

