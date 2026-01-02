import React, { useState, useEffect } from 'react';
import serviceAdapter from '../services/serviceAdapter';
import { formatDisplayDate } from '../utils/dateUtils';

export default function ClientManagement({ businessId, isMobile }) {
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [editingNotes, setEditingNotes] = useState('');
    const [saving, setSaving] = useState(false);
    const [bookingHistory, setBookingHistory] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    useEffect(() => {
        loadCustomers();
    }, [businessId]);

    const loadCustomers = async () => {
        try {
            setLoading(true);
            const data = await serviceAdapter.getCustomers(businessId);
            setCustomers(data);
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
            alert('Notas guardadas correctamente');
        } catch (error) {
            console.error('Error saving notes:', error);
            alert('Error al guardar notas');
        } finally {
            setSaving(false);
        }
    };

    const filteredCustomers = customers.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phone.includes(searchTerm)
    );

    const getStatusColor = (status) => {
        switch (status) {
            case 'confirmed': return '#25D366';
            case 'pending': return '#FFB800';
            case 'cancelled': return '#FF4B4B';
            default: return 'var(--text-secondary)';
        }
    };

    const getStatusLabel = (status) => {
        switch (status) {
            case 'confirmed': return 'Confirmado';
            case 'pending': return 'Pendiente';
            case 'cancelled': return 'Cancelado';
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
                                <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Teléfono</th>
                                <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Notas</th>
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
                                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.01)'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                >
                                    <td style={{ padding: '16px 20px' }}>
                                        <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{customer.name}</div>
                                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Desde: {formatDisplayDate(customer.created_at)}</div>
                                    </td>
                                    <td style={{ padding: '16px 20px', color: 'var(--text-primary)' }}>{customer.phone}</td>
                                    <td style={{ padding: '16px 20px', color: 'var(--text-secondary)', fontSize: '13px', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {customer.notes || '-'}
                                    </td>
                                    <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                                        <button style={{
                                            background: 'var(--bg-main)',
                                            border: '1px solid var(--border)',
                                            padding: '8px 12px',
                                            borderRadius: '8px',
                                            fontSize: '13px',
                                            fontWeight: '600',
                                            cursor: 'pointer',
                                            color: 'var(--text-primary)'
                                        }}>Ver Detalle</button>
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
                                    <div style={{ color: 'var(--text-secondary)' }}>{selectedCustomer.phone}</div>
                                </div>
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

                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button
                                    onClick={handleSaveNotes}
                                    disabled={saving}
                                    style={{
                                        flex: 1,
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
                                <button
                                    onClick={() => window.open(`https://wa.me/${selectedCustomer.phone}`, '_blank')}
                                    style={{
                                        padding: '12px 20px',
                                        borderRadius: '12px',
                                        border: '1px solid #25D366',
                                        background: 'rgba(37, 211, 102, 0.1)',
                                        color: '#25D366',
                                        fontWeight: '700',
                                        cursor: 'pointer'
                                    }}
                                >
                                    WhatsApp
                                </button>
                            </div>

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
