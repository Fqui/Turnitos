import React, { useState, useEffect } from 'react';
import serviceAdapter from '../services/serviceAdapter';
import { useNotification } from '../contexts/NotificationContext';
import { formatDisplayDate } from '../utils/dateUtils';

export default function ClientManagement({ businessId, isMobile, bookings = [] }) {
    const { showToast } = useNotification();
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [editingNotes, setEditingNotes] = useState('');
    const [editingBirthday, setEditingBirthday] = useState('');
    const [saving, setSaving] = useState(false);
    const [bookingHistory, setBookingHistory] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [allCustomerBookings, setAllCustomerBookings] = useState({});

    // Compute last visit dates map from in-memory bookings instantly
    useEffect(() => {
        if (bookings && bookings.length > 0) {
            const map = {};
            bookings.forEach(b => {
                const phone = (b.customer_phone || b.customerPhone || '').replace(/\D/g, '');
                const rawPhone = b.customer_phone || b.customerPhone;
                if (b.date) {
                    if (phone && (!map[phone] || new Date(b.date) > new Date(map[phone]))) {
                        map[phone] = b.date;
                    }
                    if (rawPhone && (!map[rawPhone] || new Date(b.date) > new Date(map[rawPhone]))) {
                        map[rawPhone] = b.date;
                    }
                }
            });
            setAllCustomerBookings(prev => ({ ...prev, ...map }));
        }
    }, [bookings]);

    useEffect(() => {
        loadCustomers();
    }, [businessId]);

    const loadCustomers = async () => {
        try {
            setLoading(true);
            const data = await serviceAdapter.getCustomers(businessId);
            setCustomers(data || []);
            setLoading(false); // Immediate display!

            // If we don't have bookings in-memory, fetch last booking dates efficiently in parallel or single query
            if (!bookings || bookings.length === 0) {
                try {
                    const bData = await serviceAdapter.getBookings(businessId);
                    if (bData && bData.length > 0) {
                        const map = {};
                        bData.forEach(b => {
                            const phone = (b.customer_phone || b.customerPhone || '').replace(/\D/g, '');
                            const rawPhone = b.customer_phone || b.customerPhone;
                            if (b.date) {
                                if (phone && (!map[phone] || new Date(b.date) > new Date(map[phone]))) {
                                    map[phone] = b.date;
                                }
                                if (rawPhone && (!map[rawPhone] || new Date(b.date) > new Date(map[rawPhone]))) {
                                    map[rawPhone] = b.date;
                                }
                            }
                        });
                        setAllCustomerBookings(map);
                    }
                } catch (e) {
                    // Ignore non-critical background calculation error
                }
            }
        } catch (error) {
            console.error('Error loading customers:', error);
            setLoading(false);
        }
    };

    const loadCustomerHistory = async (phone) => {
        try {
            setLoadingHistory(true);
            const history = await serviceAdapter.getCustomerBookings(businessId, phone);
            setBookingHistory(history);
        } catch (error) {
            console.error('Error loading customer history:', error);
        } finally {
            setLoadingHistory(false);
        }
    };

    const handleCustomerClick = (customer) => {
        setSelectedCustomer(customer);
        setEditingNotes(customer.notes || '');
        setEditingBirthday(customer.birthday || '');
        setBookingHistory([]);
        setShowModal(true);
        loadCustomerHistory(customer.phone);
    };

    const handleSaveCustomerData = async () => {
        try {
            setSaving(true);
            const updated = await serviceAdapter.updateCustomer(selectedCustomer.id, {
                notes: editingNotes,
                birthday: editingBirthday
            });
            setCustomers(prev => prev.map(c => c.id === updated.id ? updated : c));
            setSelectedCustomer(updated);
            showToast('✓ Datos del cliente guardados con éxito', 'success');
        } catch (error) {
            console.error('Error saving customer data:', error);
            showToast('Error al guardar los datos', 'error');
        } finally {
            setSaving(false);
        }
    };

    const openWhatsApp = (phone, name) => {
        const cleanPhone = (phone || '').replace(/[^0-9]/g, '');
        const message = encodeURIComponent(`Hola ${name}! Te escribimos para...`);
        window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank');
    };

    const calculateStats = (history = []) => {
        const completed = history.filter(b => b.status === 'confirmed' || b.status === 'completed').length;
        const cancelled = history.filter(b => b.status === 'cancelled' || b.status === 'rejected').length;
        const total = history.length;
        const totalSpent = history
            .filter(b => b.status === 'confirmed' || b.status === 'completed' || b.status === 'deposit_paid')
            .reduce((sum, booking) => {
                const price = booking.price || booking.total_price || 0;
                return sum + (parseFloat(price) || 0);
            }, 0);
        return { completed, cancelled, total, totalSpent };
    };

    const getCustomerBadge = (stats, birthday) => {
        if (birthday && birthday.includes('/')) {
            const parts = birthday.split('/');
            const month = parseInt(parts[1], 10);
            const currentMonth = new Date().getMonth() + 1;
            if (month === currentMonth) {
                return { text: '🎂 Cumple este mes', color: '#EC4899', bg: 'rgba(236, 72, 153, 0.15)', border: 'rgba(236, 72, 153, 0.3)' };
            }
        }

        if (stats.completed >= 3) {
            return { text: '⭐ Cliente VIP / Frecuente', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.3)' };
        }
        if (stats.completed >= 1) {
            return { text: '🤝 Cliente Habitual', color: '#10B981', bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.3)' };
        }
        if (stats.cancelled > 0 && stats.completed === 0) {
            return { text: '⚠️ Cancelaciones previas', color: '#EF4444', bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.3)' };
        }
        return { text: '🆕 Nuevo Cliente', color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.15)', border: 'rgba(59, 130, 246, 0.3)' };
    };

    const filteredCustomers = customers.filter(c => {
        const nameUpper = (c.name || '').toUpperCase();
        if (nameUpper.includes('BLOQUEADO') || nameUpper.includes('BLOQUEO') || !c.name?.trim()) {
            return false;
        }
        return (
            c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (c.phone && c.phone.includes(searchTerm)) ||
            (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    });

    const getStatusColor = (status) => {
        switch (status) {
            case 'confirmed': return '#10B981';
            case 'completed': return '#10B981';
            case 'deposit_paid': return '#3B82F6';
            case 'pending': return '#F59E0B';
            case 'cancelled': return '#EF4444';
            case 'rejected': return '#EF4444';
            case 'blocked': return '#6B7280';
            default: return '#6B7280';
        }
    };

    const getStatusLabel = (status) => {
        switch (status) {
            case 'confirmed': return 'Confirmada';
            case 'completed': return 'Completada';
            case 'deposit_paid': return 'Seña Pagada';
            case 'pending': return 'Pendiente';
            case 'cancelled': return 'Cancelada';
            case 'rejected': return 'Rechazada';
            case 'blocked': return 'Bloqueada';
            default: return status;
        }
    };

    if (loading) {
        return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>Cargando clientes...</div>;
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '20px' }}>
            <div style={{
                padding: '24px',
                background: 'var(--bg-card)',
                borderRadius: '16px',
                border: '1px solid var(--border)',
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                justifyContent: 'space-between',
                alignItems: isMobile ? 'stretch' : 'center',
                gap: '16px'
            }}>
                <div>
                    <h2 style={{ fontSize: '20px', fontWeight: '800', margin: '0 0 6px 0', color: 'var(--text-primary)' }}>
                        Base de Clientes
                    </h2>
                    <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '13px' }}>
                        Gestiona el historial, notas y datos de fidelización de tus clientes.
                    </p>
                </div>

                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <input
                        type="text"
                        placeholder="Buscar por nombre, teléfono o email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{
                            padding: '10px 16px',
                            borderRadius: '12px',
                            border: '1px solid var(--border)',
                            background: 'var(--bg-main)',
                            color: 'var(--text-primary)',
                            fontSize: '13px',
                            minWidth: isMobile ? '100%' : '280px',
                            outline: 'none'
                        }}
                    />
                </div>
            </div>

            <div style={{
                background: 'var(--bg-card)',
                borderRadius: '16px',
                border: '1px solid var(--border)',
                overflow: 'hidden'
            }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border)', background: 'rgba(0,0,0,0.02)' }}>
                                <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Cliente</th>
                                <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Contacto</th>
                                <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Última Reserva</th>
                                <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', textAlign: 'right' }}>Acción</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredCustomers.map((customer) => (
                                <tr
                                    key={customer.id}
                                    onClick={() => handleCustomerClick(customer)}
                                    style={{
                                        borderBottom: '1px solid var(--border)',
                                        cursor: 'pointer',
                                        transition: 'background 0.2s'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--sidebar-hover-bg)'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                >
                                    <td style={{ padding: '16px 20px' }}>
                                        <div style={{ fontWeight: '700', color: 'var(--text-primary)', fontSize: '15px' }}>{customer.name}</div>
                                        {customer.birthday && (
                                            <div style={{ fontSize: '11px', color: '#EC4899', fontWeight: '600', marginTop: '2px' }}>
                                                🎂 {customer.birthday}
                                            </div>
                                        )}
                                    </td>
                                    <td style={{ padding: '16px 20px' }}>
                                        <div style={{ fontSize: '14px', color: 'var(--text-primary)', fontWeight: '600' }}>📱 {customer.phone}</div>
                                        {customer.email && (
                                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>📧 {customer.email}</div>
                                        )}
                                    </td>
                                    <td style={{ padding: '16px 20px', color: 'var(--text-secondary)', fontSize: '13px' }}>
                                        {allCustomerBookings[customer.phone] ? formatDisplayDate(allCustomerBookings[customer.phone]) : 'Sin visitas'}
                                    </td>
                                    <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleCustomerClick(customer);
                                            }}
                                            style={{
                                                background: 'var(--primary-paddle, #84CC16)',
                                                border: 'none',
                                                padding: '8px 16px',
                                                borderRadius: '10px',
                                                fontSize: '12.5px',
                                                fontWeight: '800',
                                                cursor: 'pointer',
                                                color: '#000',
                                                transition: 'all 0.2s'
                                            }}
                                            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
                                            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                                        >
                                            Ver Ficha
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {filteredCustomers.length === 0 && (
                    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                        No se encontraron clientes.
                    </div>
                )}
            </div>

            {showModal && selectedCustomer && (
                <div style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.7)',
                    display: 'flex',
                    alignItems: isMobile ? 'flex-end' : 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                    backdropFilter: 'blur(6px)',
                    padding: isMobile ? '0' : '20px'
                }} onClick={() => setShowModal(false)}>
                    <div style={{
                        background: 'var(--bg-card, #1E293B)',
                        padding: isMobile ? '24px 20px 40px 20px' : '28px 30px',
                        borderRadius: isMobile ? '24px 24px 0 0' : '24px',
                        width: '100%',
                        maxWidth: isMobile ? '100%' : '540px',
                        maxHeight: '90vh',
                        overflowY: 'auto',
                        boxShadow: '0 25px 60px rgba(0,0,0,0.4)',
                        border: '1px solid var(--border, rgba(255,255,255,0.1))'
                    }} onClick={e => e.stopPropagation()}>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '19px', fontWeight: '800', color: 'var(--text-primary)' }}>
                                    Ficha del Cliente
                                </h3>
                                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                                    Historial, notas internas y fidelización
                                </p>
                            </div>
                            <button
                                onClick={() => setShowModal(false)}
                                style={{
                                    background: 'rgba(255,255,255,0.06)',
                                    border: 'none',
                                    borderRadius: '10px',
                                    width: '32px',
                                    height: '32px',
                                    cursor: 'pointer',
                                    color: 'var(--text-secondary)',
                                    fontSize: '18px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                ✕
                            </button>
                        </div>

                        {(() => {
                            const stats = calculateStats(bookingHistory);
                            const badge = getCustomerBadge(stats, editingBirthday);

                            return (
                                <div style={{ display: 'grid', gap: '18px' }}>
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '16px',
                                        background: 'var(--bg-main, #0F172A)',
                                        borderRadius: '16px',
                                        border: '1px solid var(--border, rgba(255,255,255,0.08))',
                                        flexWrap: 'wrap',
                                        gap: '12px'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                            <div style={{
                                                width: '54px',
                                                height: '54px',
                                                borderRadius: '16px',
                                                background: 'linear-gradient(135deg, var(--primary-paddle, #84CC16) 0%, #10B981 100%)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: '22px',
                                                fontWeight: '900',
                                                color: '#000',
                                                boxShadow: '0 4px 14px rgba(132, 204, 22, 0.3)'
                                            }}>
                                                {(selectedCustomer.name || 'C').charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)', lineHeight: '1.2' }}>
                                                    {selectedCustomer.name}
                                                </div>
                                                <div style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '2px', fontWeight: '500' }}>
                                                    📱 {selectedCustomer.phone}
                                                </div>
                                                {selectedCustomer.email && (
                                                    <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '2px' }}>
                                                        📧 {selectedCustomer.email}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div style={{
                                            padding: '6px 12px',
                                            borderRadius: '20px',
                                            background: badge.bg,
                                            border: `1px solid ${badge.border}`,
                                            color: badge.color,
                                            fontSize: '11.5px',
                                            fontWeight: '800',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '5px'
                                        }}>
                                            {badge.text}
                                        </div>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                        <button
                                            type="button"
                                            onClick={() => openWhatsApp(selectedCustomer.phone, selectedCustomer.name)}
                                            style={{
                                                padding: '11px',
                                                borderRadius: '12px',
                                                border: 'none',
                                                background: '#25D366',
                                                color: 'white',
                                                fontWeight: '800',
                                                fontSize: '13px',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '6px',
                                                boxShadow: '0 4px 12px rgba(37, 211, 102, 0.25)',
                                                transition: 'transform 0.15s ease'
                                            }}
                                            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
                                            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                                        >
                                            <span style={{ fontSize: '16px' }}>💬</span>
                                            <span>WhatsApp</span>
                                        </button>

                                        <a
                                            href={`tel:${selectedCustomer.phone}`}
                                            style={{
                                                padding: '11px',
                                                borderRadius: '12px',
                                                border: '1px solid var(--border, rgba(255,255,255,0.15))',
                                                background: 'var(--bg-main, #0F172A)',
                                                color: 'var(--text-primary)',
                                                fontWeight: '700',
                                                fontSize: '13px',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '6px',
                                                textDecoration: 'none',
                                                transition: 'transform 0.15s ease'
                                            }}
                                            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
                                            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                                        >
                                            <span style={{ fontSize: '15px' }}>📞</span>
                                            <span>Llamar</span>
                                        </a>
                                    </div>

                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(3, 1fr)',
                                        gap: '10px',
                                        padding: '14px',
                                        background: 'var(--bg-main, #0F172A)',
                                        borderRadius: '16px',
                                        border: '1px solid var(--border, rgba(255,255,255,0.08))'
                                    }}>
                                        <div style={{ textAlign: 'center' }}>
                                            <div style={{ fontSize: '22px', fontWeight: '900', color: 'var(--text-primary)' }}>
                                                {stats.total}
                                            </div>
                                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px', fontWeight: '600' }}>
                                                Total Reservas
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'center', borderLeft: '1px solid var(--border)', borderRight: '1px solid var(--border)' }}>
                                            <div style={{ fontSize: '22px', fontWeight: '900', color: '#10B981' }}>
                                                {stats.completed}
                                            </div>
                                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px', fontWeight: '600' }}>
                                                {stats.cancelled > 0 ? `${stats.cancelled} canceladas` : 'Completadas'}
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'center' }}>
                                            <div style={{ fontSize: '20px', fontWeight: '900', color: 'var(--primary-paddle, #84CC16)' }}>
                                                ${stats.totalSpent.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                            </div>
                                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px', fontWeight: '600' }}>
                                                Total Gastado
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{
                                        padding: '16px',
                                        background: 'var(--bg-main, #0F172A)',
                                        borderRadius: '16px',
                                        border: '1px solid var(--border, rgba(255,255,255,0.08))',
                                        display: 'grid',
                                        gap: '14px'
                                    }}>
                                        <div>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '6px' }}>
                                                <span>🎂 Cumpleaños del Cliente</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={editingBirthday}
                                                onChange={(e) => {
                                                    const value = e.target.value;
                                                    if (value.length <= 5 && /^[0-9/]*$/.test(value)) {
                                                        setEditingBirthday(value);
                                                    }
                                                }}
                                                placeholder="DD/MM (ej: 15/03)"
                                                style={{
                                                    width: '100%',
                                                    padding: '10px 14px',
                                                    borderRadius: '10px',
                                                    border: '1px solid var(--border, rgba(255,255,255,0.15))',
                                                    background: 'var(--bg-card, #1E293B)',
                                                    color: 'var(--text-primary)',
                                                    fontSize: '13.5px',
                                                    fontWeight: '600',
                                                    boxSizing: 'border-box'
                                                }}
                                            />
                                        </div>

                                        <div>
                                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '6px' }}>
                                                📝 Notas Internas
                                            </label>
                                            <textarea
                                                value={editingNotes}
                                                onChange={(e) => setEditingNotes(e.target.value)}
                                                placeholder="Preferencias del cliente, comportamiento, pedidos especiales, etc..."
                                                rows={3}
                                                style={{
                                                    width: '100%',
                                                    padding: '10px 14px',
                                                    borderRadius: '10px',
                                                    border: '1px solid var(--border, rgba(255,255,255,0.15))',
                                                    background: 'var(--bg-card, #1E293B)',
                                                    color: 'var(--text-primary)',
                                                    fontSize: '13px',
                                                    resize: 'none',
                                                    boxSizing: 'border-box',
                                                    lineHeight: '1.4'
                                                }}
                                            />
                                        </div>

                                        <button
                                            type="button"
                                            onClick={handleSaveCustomerData}
                                            disabled={saving}
                                            style={{
                                                width: '100%',
                                                padding: '11px',
                                                borderRadius: '10px',
                                                border: 'none',
                                                background: 'var(--primary-paddle, #84CC16)',
                                                color: '#000',
                                                fontWeight: '800',
                                                fontSize: '13.5px',
                                                cursor: 'pointer',
                                                opacity: saving ? 0.7 : 1,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '6px'
                                            }}
                                        >
                                            <span>{saving ? 'Guardando...' : '💾 Guardar Datos del Cliente'}</span>
                                        </button>
                                    </div>

                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                            <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                                                📋 Historial de Reservas ({bookingHistory.length})
                                            </span>
                                        </div>

                                        {loadingHistory ? (
                                            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
                                                Cargando historial de reservas...
                                            </div>
                                        ) : bookingHistory.length > 0 ? (
                                            <div style={{ display: 'grid', gap: '8px', maxHeight: '240px', overflowY: 'auto' }}>
                                                {bookingHistory.map(booking => {
                                                    const priceVal = booking.price || booking.total_price;
                                                    const formattedPrice = priceVal ? `$${Number(priceVal).toLocaleString('es-AR')}` : null;
                                                    const hasServices = Array.isArray(booking.additional_services) && booking.additional_services.length > 0;
                                                    const timeStr = (!booking.time || booking.time === '00:00') ? 'Turno Completo' : booking.time;

                                                    return (
                                                        <div key={booking.id} style={{
                                                            padding: '12px 14px',
                                                            background: 'var(--bg-main, #0F172A)',
                                                            borderRadius: '12px',
                                                            border: '1px solid var(--border, rgba(255,255,255,0.08))',
                                                            display: 'flex',
                                                            flexDirection: 'column',
                                                            gap: '6px'
                                                        }}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                <div style={{ fontWeight: '700', fontSize: '13.5px', color: 'var(--text-primary)' }}>
                                                                    {booking.services?.name || booking.courts?.name || 'Alquiler de Espacio'}
                                                                </div>
                                                                <div style={{
                                                                    fontSize: '11px',
                                                                    fontWeight: '800',
                                                                    textTransform: 'uppercase',
                                                                    padding: '3px 8px',
                                                                    borderRadius: '6px',
                                                                    background: `${getStatusColor(booking.status)}18`,
                                                                    color: getStatusColor(booking.status),
                                                                    border: `1px solid ${getStatusColor(booking.status)}35`
                                                                }}>
                                                                    {getStatusLabel(booking.status)}
                                                                </div>
                                                            </div>

                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: 'var(--text-secondary)' }}>
                                                                <span>📅 {formatDisplayDate(booking.date)} • ⏰ {timeStr}</span>
                                                                {formattedPrice && (
                                                                    <span style={{ fontWeight: '700', color: 'var(--text-primary)' }}>
                                                                        {formattedPrice}
                                                                    </span>
                                                                )}
                                                            </div>

                                                            {hasServices && (
                                                                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '2px' }}>
                                                                    {booking.additional_services.map((srv, sIdx) => (
                                                                        <span key={sIdx} style={{
                                                                            fontSize: '10.5px',
                                                                            background: 'rgba(255,255,255,0.05)',
                                                                            border: '1px solid rgba(255,255,255,0.08)',
                                                                            borderRadius: '6px',
                                                                            padding: '2px 6px',
                                                                            color: 'var(--text-secondary)'
                                                                        }}>
                                                                            {srv.icon || '✨'} {srv.name}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <div style={{ color: 'var(--text-secondary)', fontSize: '13px', fontStyle: 'italic', textAlign: 'center', padding: '24px', background: 'var(--bg-main, #0F172A)', borderRadius: '12px' }}>
                                                No hay reservas registradas para este cliente.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                </div>
            )}
        </div>
    );
}
