import React, { useState, useEffect } from 'react';
import serviceAdapter from '../services/serviceAdapter';
import { useNotification } from '../contexts/NotificationContext';
import { formatDisplayDate } from '../utils/dateUtils';

export default function ClientManagement({ businessId, isMobile }) {
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

    useEffect(() => {
        loadCustomers();
    }, [businessId]);

    const loadCustomers = async () => {
        try {
            setLoading(true);
            const data = await serviceAdapter.getCustomers(businessId);
            setCustomers(data);

            // Load booking history for all customers to calculate last visit
            const bookingsMap = {};
            for (const customer of data) {
                try {
                    const history = await serviceAdapter.getCustomerBookings(businessId, customer.phone);
                    if (history && history.length > 0) {
                        // Sort by date descending and get the most recent
                        const sortedHistory = history.sort((a, b) => new Date(b.date) - new Date(a.date));
                        bookingsMap[customer.phone] = sortedHistory[0].date;
                    }
                } catch (err) {
                    console.error(`Error loading history for ${customer.phone}:`, err);
                }
            }
            setAllCustomerBookings(bookingsMap);
        } catch (error) {
            console.error('Error loading customers:', error);
        } finally {
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

    const handleSaveNotes = async () => {
        try {
            setSaving(true);
            const updated = await serviceAdapter.updateCustomer(selectedCustomer.id, {
                notes: editingNotes
            });
            setCustomers(prev => prev.map(c => c.id === updated.id ? updated : c));
            setSelectedCustomer(updated);
            showToast('✓ Notas guardadas correctamente', 'success');
        } catch (error) {
            console.error('Error saving notes:', error);
            showToast('Error al guardar notas', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleSaveBirthday = async () => {
        try {
            setSaving(true);
            const updated = await serviceAdapter.updateCustomer(selectedCustomer.id, {
                birthday: editingBirthday
            });
            setCustomers(prev => prev.map(c => c.id === updated.id ? updated : c));
            setSelectedCustomer(updated);
            showToast('✓ Cumpleaños guardado correctamente', 'success');
        } catch (error) {
            console.error('Error saving birthday:', error);
            showToast('Error al guardar cumpleaños', 'error');
        } finally {
            setSaving(false);
        }
    };

    const openWhatsApp = (phone, name) => {
        const cleanPhone = phone.replace(/[^0-9]/g, '');
        const message = encodeURIComponent(`Hola ${name}!`);
        window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank');
    };

    const calculateStats = (history) => {
        const completed = history.filter(b => b.status === 'confirmed' || b.status === 'completed').length;
        const total = history.length;
        const totalSpent = history.reduce((sum, booking) => {
            const price = booking.price || booking.total_price || 0;
            return sum + parseFloat(price);
        }, 0);
        return { completed, total, totalSpent };
    };

    const filteredCustomers = customers.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phone.includes(searchTerm) ||
        (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const getStatusColor = (status) => {
        switch (status) {
            case 'confirmed': return '#10B981'; // Green
            case 'pending': return '#F59E0B'; // Amber
            case 'cancelled': return '#EF4444'; // Red
            case 'completed': return '#10B981'; // Green
            case 'deposit_paid': return '#3B82F6'; // Blue
            case 'blocked': return '#6B7280'; // Gray
            default: return '#6B7280';
        }
    };

    const getStatusLabel = (status) => {
        switch (status) {
            case 'confirmed': return 'Confirmada';
            case 'pending': return 'Pendiente';
            case 'cancelled': return 'Cancelada';
            case 'completed': return 'Completada';
            case 'deposit_paid': return 'Seña Pagada';
            case 'blocked': return 'Bloqueada';
            default: return status;
        }
    };

    if (loading) {
        return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>Cargando clientes...</div>;
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '20px' }}>
            {/* Header & Search */}
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
                    <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '800' }}>Gestión de Clientes</h2>
                    <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: 'var(--text-secondary)' }}>
                        {customers.length} clientes registrados
                    </p>
                </div>
                <div style={{ position: 'relative', flex: isMobile ? 'none' : '0 0 300px' }}>
                    <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}>🔍</span>
                    <input
                        type="text"
                        placeholder="Buscar por nombre o teléfono..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '10px 10px 10px 38px',
                            borderRadius: '10px',
                            border: '1px solid var(--border)',
                            background: 'var(--bg-main)',
                            color: 'var(--text-primary)',
                            fontSize: '14px'
                        }}
                    />
                </div>
            </div>

            {/* Clients List */}
            <div style={{
                flex: 1,
                background: 'var(--bg-card)',
                borderRadius: '16px',
                border: '1px solid var(--border)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column'
            }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border)', background: 'rgba(0,0,0,0.02)' }}>
                                <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Cliente</th>
                                <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Contacto</th>
                                <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Última Visita</th>
                                <th style={{ padding: '16px 20px', textAlign: 'right' }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredCustomers.map(customer => (
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
                                        <div style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '15px' }}>{customer.name}</div>
                                    </td>
                                    <td style={{ padding: '16px 20px' }}>
                                        <div style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{customer.phone}</div>
                                        {customer.email && (
                                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>{customer.email}</div>
                                        )}
                                    </td>
                                    <td style={{ padding: '16px 20px', color: 'var(--text-secondary)', fontSize: '14px' }}>
                                        {allCustomerBookings[customer.phone] ? formatDisplayDate(allCustomerBookings[customer.phone]) : 'Sin visitas'}
                                    </td>
                                    <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleCustomerClick(customer);
                                            }}
                                            style={{
                                                background: 'var(--primary)',
                                                border: 'none',
                                                padding: '8px 16px',
                                                borderRadius: '8px',
                                                fontSize: '13px',
                                                fontWeight: '700',
                                                cursor: 'pointer',
                                                color: '#fff',
                                                transition: 'all 0.2s'
                                            }}
                                            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
                                            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                                        >
                                            Ver Detalle
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

            {/* Client Detail Modal */}
            {showModal && selectedCustomer && (
                <div style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: isMobile ? 'flex-end' : 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                    backdropFilter: 'blur(4px)',
                    padding: isMobile ? '0' : '20px'
                }} onClick={() => setShowModal(false)}>
                    <div style={{
                        background: 'var(--bg-card)',
                        padding: isMobile ? '24px 20px 40px 20px' : '32px',
                        borderRadius: isMobile ? '24px 24px 0 0' : '24px',
                        width: '100%',
                        maxWidth: isMobile ? '100%' : '500px',
                        maxHeight: '90vh',
                        overflowY: 'auto',
                        boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
                        border: '1px solid var(--border)'
                    }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '700' }}>Detalle del Cliente</h3>
                            <button onClick={() => setShowModal(false)} style={{ background: 'transparent', border: 'none', fontSize: '24px', cursor: 'pointer', color: 'var(--text-secondary)' }}>&times;</button>
                        </div>

                        <div style={{ display: 'grid', gap: '20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                <div style={{
                                    width: '60px',
                                    height: '60px',
                                    borderRadius: '50%',
                                    background: 'var(--primary-paddle)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '24px',
                                    fontWeight: 'bold',
                                    color: '#000'
                                }}>
                                    {selectedCustomer.name.charAt(0)}
                                </div>
                                <div>
                                    <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)' }}>{selectedCustomer.name}</div>
                                    <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>📱 {selectedCustomer.phone}</div>
                                    {selectedCustomer.email && (
                                        <div style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '2px' }}>📧 {selectedCustomer.email}</div>
                                    )}
                                </div>
                            </div>

                            {/* WhatsApp Button */}
                            <button
                                onClick={() => openWhatsApp(selectedCustomer.phone, selectedCustomer.name)}
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    borderRadius: '12px',
                                    border: 'none',
                                    background: '#25D366',
                                    color: 'white',
                                    fontWeight: '700',
                                    fontSize: '14px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    transition: 'all 0.2s'
                                }}
                                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
                                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                            >
                                <span style={{ fontSize: '18px' }}>💬</span>
                                Abrir WhatsApp
                            </button>

                            {/* Activity Stats */}
                            {(() => {
                                const stats = calculateStats(bookingHistory);
                                return (
                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(3, 1fr)',
                                        gap: '12px',
                                        padding: '16px',
                                        background: 'var(--bg-main)',
                                        borderRadius: '12px',
                                        border: '1px solid var(--border)'
                                    }}>
                                        <div style={{ textAlign: 'center' }}>
                                            <div style={{ fontSize: '24px', fontWeight: '700', color: '#10B981' }}>
                                                {stats.total}
                                            </div>
                                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                                Total Reservas
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'center' }}>
                                            <div style={{ fontSize: '24px', fontWeight: '700', color: '#10B981' }}>
                                                {stats.completed}
                                            </div>
                                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                                Completadas
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'center' }}>
                                            <div style={{ fontSize: '24px', fontWeight: '700', color: '#10B981' }}>
                                                ${stats.totalSpent.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                            </div>
                                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                                Total Gastado
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* Birthday Field */}
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>
                                    🎂 Cumpleaños
                                </label>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <input
                                        type="text"
                                        value={editingBirthday}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            // Allow only numbers and slash, max 5 characters (DD/MM)
                                            if (value.length <= 5 && /^[0-9/]*$/.test(value)) {
                                                setEditingBirthday(value);
                                            }
                                        }}
                                        placeholder="DD/MM (ej: 15/03)"
                                        style={{
                                            flex: 1,
                                            padding: '12px',
                                            borderRadius: '12px',
                                            border: '1px solid var(--border)',
                                            background: 'var(--bg-main)',
                                            color: 'var(--text-primary)',
                                            fontSize: '14px'
                                        }}
                                    />
                                    <button
                                        onClick={handleSaveBirthday}
                                        disabled={saving}
                                        style={{
                                            padding: '12px 20px',
                                            borderRadius: '12px',
                                            border: 'none',
                                            background: 'var(--primary-paddle)',
                                            color: '#000',
                                            fontWeight: '700',
                                            cursor: 'pointer',
                                            fontSize: '13px'
                                        }}
                                    >
                                        {saving ? '...' : 'Guardar'}
                                    </button>
                                </div>
                                {editingBirthday && (
                                    <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--text-secondary)', padding: '8px', background: 'rgba(255, 193, 7, 0.1)', borderRadius: '8px' }}>
                                        💡 Tip: Puedes enviar un saludo y ofrecer un descuento especial en su cumpleaños
                                    </div>
                                )}
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>
                                    Notas Internas
                                </label>
                                <textarea
                                    value={editingNotes}
                                    onChange={(e) => setEditingNotes(e.target.value)}
                                    placeholder="Agrega notas sobre este cliente (preferencias, comportamiento, etc.)..."
                                    style={{
                                        width: '100%',
                                        height: '100px',
                                        padding: '12px',
                                        borderRadius: '12px',
                                        border: '1px solid var(--border)',
                                        background: 'var(--bg-main)',
                                        color: 'var(--text-primary)',
                                        fontSize: '14px',
                                        resize: 'none'
                                    }}
                                />
                            </div>

                            <button
                                onClick={handleSaveNotes}
                                disabled={saving}
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    borderRadius: '12px',
                                    border: 'none',
                                    background: 'var(--primary-paddle)',
                                    color: '#000',
                                    fontWeight: '700',
                                    cursor: 'pointer',
                                    opacity: saving ? 0.7 : 1
                                }}
                            >
                                {saving ? 'Guardando...' : 'Guardar Notas'}
                            </button>


                            <div style={{ marginTop: '10px' }}>
                                <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '12px' }}>
                                    Actividad reciente
                                </div>

                                {loadingHistory ? (
                                    <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '14px' }}>
                                        Cargando historial...
                                    </div>
                                ) : bookingHistory.length > 0 ? (
                                    <div style={{ display: 'grid', gap: '8px' }}>
                                        {bookingHistory.map(booking => (
                                            <div key={booking.id} style={{
                                                padding: '12px',
                                                background: 'var(--bg-main)',
                                                borderRadius: '12px',
                                                border: '1px solid var(--border)',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center'
                                            }}>
                                                <div>
                                                    <div style={{ fontWeight: '600', fontSize: '14px' }}>
                                                        {booking.services?.name || booking.courts?.name || 'Reserva'}
                                                    </div>
                                                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                                        {formatDisplayDate(booking.date)} a las {booking.time}
                                                    </div>
                                                </div>
                                                <div style={{
                                                    fontSize: '11px',
                                                    fontWeight: '700',
                                                    textTransform: 'uppercase',
                                                    padding: '4px 8px',
                                                    borderRadius: '6px',
                                                    background: `${getStatusColor(booking.status)}20`,
                                                    color: getStatusColor(booking.status)
                                                }}>
                                                    {getStatusLabel(booking.status)}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div style={{ color: 'var(--text-secondary)', fontSize: '14px', fontStyle: 'italic', textAlign: 'center', padding: '20px', background: 'var(--bg-main)', borderRadius: '12px' }}>
                                        No hay reservas registradas.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
