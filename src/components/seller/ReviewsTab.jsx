import React, { useState, useEffect } from 'react';
import supabaseService from '../../services/supabaseService';

export default function ReviewsTab({ bookingsData, businesses }) {
    const [activeSubTab, setActiveSubTab] = useState('requests'); // 'requests' | 'published'
    const [reviews, setReviews] = useState([]);
    const [loadingReviews, setLoadingReviews] = useState(false);
    const [generatingTokenId, setGeneratingTokenId] = useState(null);
    const [copiedTokenId, setCopiedTokenId] = useState(null);
    const [sentTokens, setSentTokens] = useState({});
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedBusinessFilter, setSelectedBusinessFilter] = useState('all');

    useEffect(() => {
        if (activeSubTab === 'published') {
            loadPublishedReviews();
        }
    }, [activeSubTab]);

    const loadPublishedReviews = async () => {
        setLoadingReviews(true);
        try {
            const data = await supabaseService.getAllReviewsForSuperAdmin();
            setReviews(data || []);
        } catch (err) {
            console.error('Error loading reviews:', err);
        } finally {
            setLoadingReviews(false);
        }
    };

    const handleModerateReview = async (reviewId, newStatus) => {
        try {
            await supabaseService.deleteOrModerateReview(reviewId, newStatus);
            setReviews(prev => prev.filter(r => newStatus === 'delete' ? r.id !== reviewId : true).map(r => r.id === reviewId ? { ...r, status: newStatus } : r));
            alert('Estado de la reseña actualizado con éxito.');
        } catch (err) {
            alert('Error al moderar reseña: ' + err.message);
        }
    };

    const handleSendWhatsAppReview = async (booking) => {
        setGeneratingTokenId(booking.id);
        try {
            const token = await supabaseService.generateReviewToken(booking);
            const reviewUrl = `${window.location.origin}/calificar/${token}`;
            
            // Clean phone number
            let phone = (booking.customer_phone || '').replace(/\D/g, '');
            if (phone.startsWith('0')) phone = phone.substring(1);
            if (phone.length === 10) phone = '549' + phone; // Argentine standard
            if (phone.length === 11 && phone.startsWith('15')) phone = '549' + phone.substring(2);
            if (!phone.startsWith('54') && phone.length <= 11) phone = '549' + phone;

            const clientName = booking.customer_name ? booking.customer_name.split(' ')[0] : 'Hola';
            const businessName = booking.business_name || booking.businesses?.name || 'nuestro espacio';

            const message = `¡Hola ${clientName}! 👋 Gracias por usar Turnitos para tu reserva en *${businessName}*.\n\n¿Cómo fue tu experiencia? Nos ayuda mucho si nos dejás tu calificación en este enlace seguro:\n⭐ ${reviewUrl}\n\n¡Muchas gracias!`;

            setSentTokens(prev => ({ ...prev, [booking.id]: true }));

            const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
            window.open(waUrl, '_blank');
        } catch (err) {
            console.error('Error sending WhatsApp review link:', err);
            alert('Error al generar enlace de WhatsApp: ' + err.message);
        } finally {
            setGeneratingTokenId(null);
        }
    };

    const handleCopyReviewLink = async (booking) => {
        setGeneratingTokenId(booking.id);
        try {
            const token = await supabaseService.generateReviewToken(booking);
            const reviewUrl = `${window.location.origin}/calificar/${token}`;
            await navigator.clipboard.writeText(reviewUrl);
            setCopiedTokenId(booking.id);
            setTimeout(() => setCopiedTokenId(null), 3000);
        } catch (err) {
            console.error('Error copying review link:', err);
        } finally {
            setGeneratingTokenId(null);
        }
    };

    // Filter bookings
    const allBookings = bookingsData?.recentBookings || [];
    const filteredBookings = allBookings.filter(b => {
        const matchesTerm = !searchTerm || 
            (b.customer_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (b.customer_phone || '').includes(searchTerm) ||
            (b.business_name || '').toLowerCase().includes(searchTerm.toLowerCase());

        const matchesBusiness = selectedBusinessFilter === 'all' || 
            b.business_id === selectedBusinessFilter ||
            (b.business_name || '').toLowerCase() === selectedBusinessFilter.toLowerCase();

        return matchesTerm && matchesBusiness;
    });

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Header with Sub-Tabs */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px',
                background: '#111827',
                padding: '12px 16px',
                borderRadius: '12px',
                border: '1px solid #1f2937'
            }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                        onClick={() => setActiveSubTab('requests')}
                        style={{
                            padding: '8px 16px',
                            borderRadius: '8px',
                            border: 'none',
                            background: activeSubTab === 'requests' ? '#2563eb' : 'transparent',
                            color: activeSubTab === 'requests' ? '#ffffff' : '#9ca3af',
                            fontWeight: '700',
                            fontSize: '13px',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                    >
                        📲 Solicitar Reseñas por WhatsApp
                    </button>
                    <button
                        onClick={() => setActiveSubTab('published')}
                        style={{
                            padding: '8px 16px',
                            borderRadius: '8px',
                            border: 'none',
                            background: activeSubTab === 'published' ? '#2563eb' : 'transparent',
                            color: activeSubTab === 'published' ? '#ffffff' : '#9ca3af',
                            fontWeight: '700',
                            fontSize: '13px',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                    >
                        ⭐ Reseñas Publicadas ({reviews.length})
                    </button>
                </div>

                <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                    🛡️ Enlaces únicos con token anti-fraude
                </div>
            </div>

            {/* SUB-TAB 1: SOLICITAR RESEÑAS */}
            {activeSubTab === 'requests' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {/* Filters */}
                    <div style={{
                        display: 'flex',
                        gap: '12px',
                        flexWrap: 'wrap',
                        background: '#1e293b',
                        padding: '12px 16px',
                        borderRadius: '10px',
                        alignItems: 'center'
                    }}>
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="🔍 Buscar por cliente, teléfono o negocio..."
                            style={{
                                flex: '1 1 240px',
                                padding: '8px 14px',
                                borderRadius: '8px',
                                border: '1px solid #334155',
                                background: '#0f172a',
                                color: '#f8fafc',
                                fontSize: '13px',
                                outline: 'none'
                            }}
                        />

                        {businesses && businesses.length > 0 && (
                            <select
                                value={selectedBusinessFilter}
                                onChange={(e) => setSelectedBusinessFilter(e.target.value)}
                                style={{
                                    padding: '8px 14px',
                                    borderRadius: '8px',
                                    border: '1px solid #334155',
                                    background: '#0f172a',
                                    color: '#f8fafc',
                                    fontSize: '13px',
                                    outline: 'none'
                                }}
                            >
                                <option value="all">🏢 Todos los Negocios</option>
                                {businesses.map(b => (
                                    <option key={b.id} value={b.id}>{b.name}</option>
                                ))}
                            </select>
                        )}
                    </div>

                    {/* Bookings List */}
                    <div style={{
                        background: '#111827',
                        border: '1px solid #1f2937',
                        borderRadius: '12px',
                        overflow: 'hidden'
                    }}>
                        <div style={{
                            padding: '14px 16px',
                            borderBottom: '1px solid #1f2937',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <h3 style={{ fontSize: '14px', fontWeight: '800', color: '#f8fafc', margin: 0 }}>
                                Reservas Disponibles para Calificar ({filteredBookings.length})
                            </h3>
                        </div>

                        {filteredBookings.length === 0 ? (
                            <div style={{ padding: '40px', textAlign: 'center', color: '#9ca3af', fontSize: '14px' }}>
                                No se encontraron reservas que coincidan con la búsqueda.
                            </div>
                        ) : (
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                                    <thead>
                                        <tr style={{ background: '#1e293b', color: '#94a3b8', borderBottom: '1px solid #334155' }}>
                                            <th style={{ padding: '10px 14px' }}>Cliente</th>
                                            <th style={{ padding: '10px 14px' }}>Teléfono</th>
                                            <th style={{ padding: '10px 14px' }}>Negocio</th>
                                            <th style={{ padding: '10px 14px' }}>Fecha</th>
                                            <th style={{ padding: '10px 14px' }}>Estado</th>
                                            <th style={{ padding: '10px 14px', textAlign: 'right' }}>Acción</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredBookings.slice(0, 50).map((b, idx) => {
                                            const isSent = sentTokens[b.id] || !!b.metadata?.review_token;
                                            const isAlreadyRated = !!b.metadata?.review_submitted;

                                            return (
                                                <tr key={b.id || idx} style={{ borderBottom: '1px solid #1f2937', color: '#f8fafc' }}>
                                                    <td style={{ padding: '12px 14px', fontWeight: '700' }}>
                                                        {b.customer_name || 'Cliente'}
                                                    </td>
                                                    <td style={{ padding: '12px 14px', color: '#94a3b8' }}>
                                                        {b.customer_phone || 'Sin tel'}
                                                    </td>
                                                    <td style={{ padding: '12px 14px', color: '#60a5fa', fontWeight: '600' }}>
                                                        {b.business_name || 'Negocio'}
                                                    </td>
                                                    <td style={{ padding: '12px 14px', color: '#94a3b8', fontSize: '12px' }}>
                                                        {b.created_at ? new Date(b.created_at).toLocaleDateString('es-AR') : '-'}
                                                    </td>
                                                    <td style={{ padding: '12px 14px' }}>
                                                        {isAlreadyRated ? (
                                                            <span style={{
                                                                padding: '3px 8px',
                                                                borderRadius: '12px',
                                                                background: 'rgba(0, 230, 118, 0.15)',
                                                                color: '#00E676',
                                                                fontSize: '11px',
                                                                fontWeight: '800'
                                                            }}>
                                                                ★ Ya Calificada
                                                            </span>
                                                        ) : isSent ? (
                                                            <span style={{
                                                                padding: '3px 8px',
                                                                borderRadius: '12px',
                                                                background: 'rgba(59, 130, 246, 0.15)',
                                                                color: '#60a5fa',
                                                                fontSize: '11px',
                                                                fontWeight: '800'
                                                            }}>
                                                                Enviado ✉️
                                                            </span>
                                                        ) : (
                                                            <span style={{
                                                                padding: '3px 8px',
                                                                borderRadius: '12px',
                                                                background: 'rgba(148, 163, 184, 0.1)',
                                                                color: '#94a3b8',
                                                                fontSize: '11px',
                                                                fontWeight: '600'
                                                            }}>
                                                                Pendiente
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                                                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                                                            <button
                                                                onClick={() => handleSendWhatsAppReview(b)}
                                                                disabled={generatingTokenId === b.id}
                                                                style={{
                                                                    padding: '6px 12px',
                                                                    background: '#25D366',
                                                                    color: '#000000',
                                                                    border: 'none',
                                                                    borderRadius: '6px',
                                                                    fontWeight: '800',
                                                                    fontSize: '11px',
                                                                    cursor: 'pointer',
                                                                    display: 'inline-flex',
                                                                    alignItems: 'center',
                                                                    gap: '4px'
                                                                }}
                                                            >
                                                                📲 Enviar WhatsApp
                                                            </button>
                                                            <button
                                                                onClick={() => handleCopyReviewLink(b)}
                                                                disabled={generatingTokenId === b.id}
                                                                style={{
                                                                    padding: '6px 10px',
                                                                    background: '#334155',
                                                                    color: '#f8fafc',
                                                                    border: 'none',
                                                                    borderRadius: '6px',
                                                                    fontWeight: '700',
                                                                    fontSize: '11px',
                                                                    cursor: 'pointer'
                                                                }}
                                                                title="Copiar Link"
                                                            >
                                                                {copiedTokenId === b.id ? '✓ Copiado' : '🔗 Copiar'}
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* SUB-TAB 2: RESEÑAS PUBLICADAS */}
            {activeSubTab === 'published' && (
                <div style={{
                    background: '#111827',
                    border: '1px solid #1f2937',
                    borderRadius: '12px',
                    padding: '20px'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#f8fafc', margin: 0 }}>
                            Historial de Reseñas y Calificaciones ({reviews.length})
                        </h3>
                        <button
                            onClick={loadPublishedReviews}
                            style={{
                                padding: '6px 12px',
                                background: '#1e293b',
                                color: '#60a5fa',
                                border: '1px solid #334155',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: '700',
                                cursor: 'pointer'
                            }}
                        >
                            🔄 Refrescar
                        </button>
                    </div>

                    {loadingReviews ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>
                            Cargando reseñas...
                        </div>
                    ) : reviews.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af', fontSize: '14px' }}>
                            Aún no hay reseñas registradas en la plataforma.
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '14px' }}>
                            {reviews.map(r => (
                                <div
                                    key={r.id}
                                    style={{
                                        background: '#1e293b',
                                        border: '1px solid #334155',
                                        borderRadius: '12px',
                                        padding: '16px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        justifyContent: 'space-between',
                                        gap: '10px'
                                    }}
                                >
                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                                            <div>
                                                <h4 style={{ fontSize: '14px', fontWeight: '800', color: '#f8fafc', margin: 0 }}>
                                                    {r.customer_name || 'Cliente'}
                                                </h4>
                                                <span style={{ fontSize: '11px', color: '#60a5fa' }}>
                                                    {r.businesses?.name || 'Negocio'}
                                                </span>
                                            </div>
                                            <div style={{
                                                background: 'rgba(251, 191, 36, 0.15)',
                                                color: '#fbbf24',
                                                padding: '2px 8px',
                                                borderRadius: '8px',
                                                fontWeight: '800',
                                                fontSize: '12px'
                                            }}>
                                                {'★'.repeat(r.rating || 5)} {r.rating || 5}.0
                                            </div>
                                        </div>

                                        {r.comment && (
                                            <p style={{
                                                fontSize: '13px',
                                                color: '#cbd5e1',
                                                margin: '8px 0',
                                                lineHeight: '1.4',
                                                background: '#0f172a',
                                                padding: '8px 12px',
                                                borderRadius: '8px'
                                            }}>
                                                "{r.comment}"
                                            </p>
                                        )}
                                    </div>

                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: '#94a3b8' }}>
                                        <span>{r.created_at ? new Date(r.created_at).toLocaleDateString('es-AR') : '-'}</span>
                                        <div style={{ display: 'flex', gap: '6px' }}>
                                            <button
                                                onClick={() => handleModerateReview(r.id, r.status === 'approved' ? 'rejected' : 'approved')}
                                                style={{
                                                    padding: '3px 8px',
                                                    borderRadius: '4px',
                                                    border: 'none',
                                                    background: r.status === 'approved' ? '#f59e0b' : '#10b981',
                                                    color: '#000',
                                                    fontWeight: '700',
                                                    cursor: 'pointer',
                                                    fontSize: '10px'
                                                }}
                                            >
                                                {r.status === 'approved' ? 'Ocultar' : 'Aprobar'}
                                            </button>
                                            <button
                                                onClick={() => {
                                                    if (window.confirm('¿Eliminar esta reseña definitivamente?')) {
                                                        handleModerateReview(r.id, 'delete');
                                                    }
                                                }}
                                                style={{
                                                    padding: '3px 8px',
                                                    borderRadius: '4px',
                                                    border: 'none',
                                                    background: 'rgba(239, 68, 68, 0.2)',
                                                    color: '#f87171',
                                                    fontWeight: '700',
                                                    cursor: 'pointer',
                                                    fontSize: '10px'
                                                }}
                                            >
                                                Eliminar
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
