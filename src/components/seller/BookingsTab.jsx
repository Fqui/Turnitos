import React from 'react';

const BookingsTab = ({ bookingsData }) => {
    if (!bookingsData) {
        return (
            <div style={{ textAlign: 'center', padding: '64px', opacity: 0.5 }}>
                Cargando analíticas de reservas...
            </div>
        );
    }

    const formatCurrency = (amount) => {
        return `$${parseFloat(amount || 0).toLocaleString('es-AR')}`;
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('es-AR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'confirmed':
                return { bg: 'rgba(0, 230, 118, 0.1)', color: 'var(--primary-paddle)', label: 'Confirmada' };
            case 'pending':
                return { bg: 'rgba(245, 158, 11, 0.1)', color: '#fbbf24', label: 'Pendiente' };
            case 'cancelled':
                return { bg: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', label: 'Cancelada' };
            default:
                return { bg: 'rgba(148, 163, 184, 0.1)', color: '#94a3b8', label: status };
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Metrics Grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '16px'
            }}>
                <BookingMetricCard
                    icon="📊"
                    label="Total Reservas"
                    value={bookingsData.totalBookings}
                    gradient="linear-gradient(135deg, #6366f1, #4f46e5)"
                />
                <BookingMetricCard
                    icon="📈"
                    label="Este Mes"
                    value={bookingsData.thisMonthCount}
                    subtitle={`${bookingsData.growthRate > 0 ? '+' : ''}${bookingsData.growthRate}% vs mes anterior`}
                    gradient="linear-gradient(135deg, #10b981, #059669)"
                />
                <BookingMetricCard
                    icon="💰"
                    label="Ingresos Totales"
                    value={formatCurrency(bookingsData.totalRevenue)}
                    gradient="linear-gradient(135deg, #f59e0b, #d97706)"
                />
                <BookingMetricCard
                    icon="💵"
                    label="Ingresos Este Mes"
                    value={formatCurrency(bookingsData.thisMonthRevenue)}
                    subtitle={`${bookingsData.revenueGrowth > 0 ? '+' : ''}${bookingsData.revenueGrowth}% vs mes anterior`}
                    gradient="linear-gradient(135deg, #8b5cf6, #7c3aed)"
                />
                <BookingMetricCard
                    icon="💳"
                    label="Ticket Promedio"
                    value={formatCurrency(bookingsData.avgBookingValue)}
                    gradient="linear-gradient(135deg, #ec4899, #db2777)"
                />
            </div>

            {/* Status Breakdown & Top Businesses */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
                gap: '24px'
            }}>
                {/* Status Breakdown */}
                <div style={{
                    background: 'rgba(255,255,255,0.03)',
                    borderRadius: '20px',
                    padding: '24px',
                    border: '1px solid rgba(255,255,255,0.08)'
                }}>
                    <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>📋</span> Estados de Reservas
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {Object.entries(bookingsData.statusBreakdown || {}).map(([status, count]) => {
                            const statusInfo = getStatusColor(status);
                            const percentage = ((count / bookingsData.totalBookings) * 100).toFixed(1);

                            return (
                                <div key={status} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{ minWidth: '100px', fontSize: '14px', fontWeight: '600' }}>
                                        {statusInfo.label}
                                    </div>
                                    <div style={{ flex: 1, height: '32px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', overflow: 'hidden', position: 'relative' }}>
                                        <div style={{
                                            height: '100%',
                                            width: `${percentage}%`,
                                            background: statusInfo.bg,
                                            borderLeft: `3px solid ${statusInfo.color}`,
                                            display: 'flex',
                                            alignItems: 'center',
                                            paddingLeft: '12px',
                                            fontSize: '13px',
                                            fontWeight: '700',
                                            color: statusInfo.color,
                                            transition: 'width 0.5s ease'
                                        }}>
                                            {count} ({percentage}%)
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Top Businesses */}
                <div style={{
                    background: 'rgba(255,255,255,0.03)',
                    borderRadius: '20px',
                    padding: '24px',
                    border: '1px solid rgba(255,255,255,0.08)'
                }}>
                    <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>🏆</span> Top Negocios por Reservas
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {bookingsData.topBusinesses && bookingsData.topBusinesses.slice(0, 5).map((business, idx) => (
                            <div key={idx} style={{
                                padding: '12px',
                                background: 'rgba(255,255,255,0.03)',
                                borderRadius: '12px',
                                border: '1px solid rgba(255,255,255,0.05)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px'
                            }}>
                                <div style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '8px',
                                    background: idx === 0 ? 'linear-gradient(135deg, #f59e0b, #d97706)' :
                                        idx === 1 ? 'linear-gradient(135deg, #94a3b8, #64748b)' :
                                            idx === 2 ? 'linear-gradient(135deg, #cd7f32, #a0522d)' :
                                                'linear-gradient(135deg, #6366f1, #4f46e5)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: '900',
                                    fontSize: '14px'
                                }}>
                                    {idx + 1}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: '700', fontSize: '14px' }}>{business.name}</div>
                                    <div style={{ fontSize: '12px', opacity: 0.7 }}>{business.category}</div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontWeight: '700', fontSize: '16px', color: 'var(--primary-paddle)' }}>
                                        {business.count}
                                    </div>
                                    <div style={{ fontSize: '11px', opacity: 0.7 }}>
                                        {formatCurrency(business.revenue)}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Recent Bookings */}
            <div style={{
                background: 'rgba(255,255,255,0.03)',
                borderRadius: '20px',
                padding: '24px',
                border: '1px solid rgba(255,255,255,0.08)'
            }}>
                <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>🎫</span> Reservas Recientes
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {bookingsData.recentBookings && bookingsData.recentBookings.length > 0 ? (
                        bookingsData.recentBookings.map((booking, idx) => {
                            const statusInfo = getStatusColor(booking.status);

                            return (
                                <div key={idx} style={{
                                    padding: '16px',
                                    background: 'rgba(255,255,255,0.03)',
                                    borderRadius: '12px',
                                    border: '1px solid rgba(255,255,255,0.05)',
                                    display: 'grid',
                                    gridTemplateColumns: '2fr 1fr 1fr 1fr 100px',
                                    gap: '16px',
                                    alignItems: 'center'
                                }}>
                                    <div>
                                        <div style={{ fontWeight: '700', marginBottom: '4px' }}>
                                            {booking.businesses?.name || 'Negocio'}
                                        </div>
                                        <div style={{ fontSize: '13px', opacity: 0.7 }}>
                                            {booking.customer_name || 'Cliente'}
                                        </div>
                                    </div>
                                    <div style={{ fontSize: '13px', opacity: 0.8 }}>
                                        📅 {formatDate(booking.date)}
                                    </div>
                                    <div style={{ fontSize: '13px', opacity: 0.8 }}>
                                        ⏰ {booking.time_slot}
                                    </div>
                                    <div style={{ fontWeight: '700', fontSize: '15px', color: 'var(--primary-paddle)' }}>
                                        {formatCurrency(booking.price)}
                                    </div>
                                    <div style={{
                                        padding: '6px 12px',
                                        background: statusInfo.bg,
                                        borderRadius: '8px',
                                        fontSize: '12px',
                                        fontWeight: '700',
                                        color: statusInfo.color,
                                        textAlign: 'center'
                                    }}>
                                        {statusInfo.label}
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div style={{ textAlign: 'center', padding: '48px', opacity: 0.5 }}>
                            No hay reservas registradas
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const BookingMetricCard = ({ icon, label, value, subtitle, gradient }) => (
    <div style={{
        padding: '24px',
        background: 'rgba(255,255,255,0.03)',
        borderRadius: '20px',
        border: '1px solid rgba(255,255,255,0.08)',
        position: 'relative',
        overflow: 'hidden',
        transition: 'all 0.3s'
    }}
        onMouseOver={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 230, 118, 0.15)';
        }}
        onMouseOut={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
        }}
    >
        <div style={{
            position: 'absolute',
            top: '-40px',
            right: '-40px',
            width: '120px',
            height: '120px',
            background: gradient,
            borderRadius: '50%',
            opacity: 0.1,
            filter: 'blur(40px)'
        }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>{icon}</div>
            <div style={{ fontSize: '13px', opacity: 0.7, marginBottom: '8px', fontWeight: '600' }}>
                {label}
            </div>
            <div style={{
                fontSize: '28px',
                fontWeight: '900',
                marginBottom: '4px',
                background: gradient,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
            }}>
                {value}
            </div>
            {subtitle && (
                <div style={{ fontSize: '12px', opacity: 0.6 }}>
                    {subtitle}
                </div>
            )}
        </div>
    </div>
);

export default BookingsTab;
