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

    const handleExportCSV = () => {
        const bookings = bookingsData.recentBookings || [];
        if (!bookings.length) return alert('No hay reservas para exportar.');
        
        const headers = ['Cliente', 'Teléfono', 'Negocio', 'Fecha', 'Estado', 'Monto'];
        const rows = bookings.map(b => [
            `"${(b.customer_name || 'Cliente').replace(/"/g, '""')}"`,
            `"${(b.customer_phone || '').replace(/"/g, '""')}"`,
            `"${(b.business_name || '').replace(/"/g, '""')}"`,
            `"${formatDate(b.created_at)}"`,
            `"${b.status || ''}"`,
            b.price || 0
        ]);

        const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `reporte_reservas_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Metrics Grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '12px'
            }}>
                <BookingMetricCard
                    icon="📊"
                    label="Total Reservas"
                    value={bookingsData.totalBookings}
                />
                <BookingMetricCard
                    icon="📈"
                    label="Este Mes"
                    value={bookingsData.thisMonthCount}
                    subtitle={`${bookingsData.growthRate > 0 ? '+' : ''}${bookingsData.growthRate}% vs mes anterior`}
                />
                <BookingMetricCard
                    icon="💰"
                    label="Ingresos Totales"
                    value={formatCurrency(bookingsData.totalRevenue)}
                />
                <BookingMetricCard
                    icon="💵"
                    label="Ingresos Este Mes"
                    value={formatCurrency(bookingsData.thisMonthRevenue)}
                    subtitle={`${bookingsData.revenueGrowth > 0 ? '+' : ''}${bookingsData.revenueGrowth}% vs mes anterior`}
                />
                <BookingMetricCard
                    icon="💳"
                    label="Ticket Promedio"
                    value={formatCurrency(bookingsData.avgBookingValue)}
                />
            </div>

            {/* Status Breakdown & Top Businesses */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
                gap: '16px'
            }}>
                {/* Status Breakdown */}
                <div style={{
                    background: '#111827',
                    borderRadius: '12px',
                    padding: '16px 20px',
                    border: '1px solid #1f2937',
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                }}>
                    <h3 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px', color: '#f9fafb' }}>
                        <span>📋</span> Estados de Reservas
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {Object.entries(bookingsData.statusBreakdown || {}).map(([status, count]) => {
                            const statusInfo = getStatusColor(status);
                            const percentage = ((count / (bookingsData.totalBookings || 1)) * 100).toFixed(1);

                            return (
                                <div key={status} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{ minWidth: '90px', fontSize: '12px', color: '#9ca3af', fontWeight: '600', textTransform: 'capitalize' }}>
                                        {statusInfo.label}
                                    </div>
                                    <div style={{ flex: 1, height: '24px', background: '#0f172a', borderRadius: '6px', overflow: 'hidden', position: 'relative', border: '1px solid #1e293b' }}>
                                        <div style={{
                                            height: '100%',
                                            width: `${percentage}%`,
                                            background: statusInfo.color,
                                            opacity: 0.85,
                                            borderRadius: '6px',
                                            transition: 'width 0.8s cubic-bezier(0.16, 1, 0.3, 1)'
                                        }} />
                                    </div>
                                    <div style={{ minWidth: '70px', fontSize: '12px', fontWeight: '700', textAlign: 'right', color: '#f9fafb' }}>
                                        {count} <span style={{ fontSize: '11px', color: '#6b7280' }}>({percentage}%)</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Top Businesses */}
                <div style={{
                    background: '#111827',
                    borderRadius: '12px',
                    padding: '16px 20px',
                    border: '1px solid #1f2937',
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                }}>
                    <h3 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px', color: '#f9fafb' }}>
                        <span>🏆</span> Top Negocios por Reservas
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {(bookingsData.topBusinesses || []).slice(0, 5).map((b, idx) => (
                            <div key={idx} style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                padding: '8px 12px',
                                background: '#1e293b',
                                borderRadius: '8px',
                                border: '1px solid #334155'
                            }}>
                                <div style={{
                                    width: '24px',
                                    height: '24px',
                                    borderRadius: '6px',
                                    background: idx === 0 ? '#f59e0b' : '#3b82f6',
                                    color: 'white',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: '800',
                                    fontSize: '11px'
                                }}>
                                    {idx + 1}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontWeight: '700', fontSize: '12px', color: '#f9fafb', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {b.business_name}
                                    </div>
                                    <div style={{ fontSize: '10px', color: '#9ca3af' }}>
                                        {b.category_name}
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontWeight: '700', fontSize: '12px', color: '#10b981' }}>
                                        {b.booking_count}
                                    </div>
                                    <div style={{ fontSize: '10px', color: '#6b7280' }}>
                                        {formatCurrency(b.revenue)}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Recent Bookings Table */}
            <div style={{
                background: '#111827',
                borderRadius: '12px',
                padding: '16px 20px',
                border: '1px solid #1f2937',
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: '700', margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: '#f9fafb' }}>
                        <span>📝</span> Últimas Reservas Registradas
                    </h3>
                    <button
                        onClick={handleExportCSV}
                        style={{
                            padding: '6px 12px',
                            background: 'rgba(59, 130, 246, 0.1)',
                            border: '1px solid rgba(59, 130, 246, 0.3)',
                            borderRadius: '6px',
                            color: '#60a5fa',
                            fontSize: '11px',
                            fontWeight: '700',
                            cursor: 'pointer'
                        }}
                    >
                        📥 Exportar CSV
                    </button>
                </div>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid #1f2937', textAlign: 'left' }}>
                                <th style={{ padding: '8px 12px', color: '#9ca3af', fontWeight: '700' }}>Cliente</th>
                                <th style={{ padding: '8px 12px', color: '#9ca3af', fontWeight: '700' }}>Negocio</th>
                                <th style={{ padding: '8px 12px', color: '#9ca3af', fontWeight: '700' }}>Fecha y Hora</th>
                                <th style={{ padding: '8px 12px', color: '#9ca3af', fontWeight: '700' }}>Estado</th>
                                <th style={{ padding: '8px 12px', color: '#9ca3af', fontWeight: '700', textAlign: 'right' }}>Monto</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(bookingsData.recentBookings || []).map(b => {
                                const statusInfo = getStatusColor(b.status);
                                return (
                                    <tr key={b.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                        <td style={{ padding: '10px 12px', fontWeight: '600', color: '#f9fafb' }}>
                                            {b.customer_name || 'Cliente'}
                                            {b.customer_phone && <div style={{ fontSize: '10px', color: '#6b7280' }}>{b.customer_phone}</div>}
                                        </td>
                                        <td style={{ padding: '10px 12px', color: '#9ca3af' }}>{b.business_name}</td>
                                        <td style={{ padding: '10px 12px', color: '#9ca3af' }}>{formatDate(b.created_at)}</td>
                                        <td style={{ padding: '10px 12px' }}>
                                            <span style={{
                                                padding: '3px 8px',
                                                borderRadius: '6px',
                                                fontSize: '10px',
                                                fontWeight: '700',
                                                background: statusInfo.bg,
                                                color: statusInfo.color
                                            }}>
                                                {statusInfo.label}
                                            </span>
                                        </td>
                                        <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '700', color: '#10b981' }}>
                                            {formatCurrency(b.price)}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

const BookingMetricCard = ({ icon, label, value, subtitle }) => (
    <div style={{
        padding: '14px 16px',
        background: '#111827',
        borderRadius: '12px',
        border: '1px solid #1f2937',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
    }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div style={{ fontSize: '11px', color: '#9ca3af', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {label}
            </div>
            <div style={{ 
                fontSize: '16px', 
                width: '32px',
                height: '32px',
                background: '#1e293b',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}>{icon}</div>
        </div>
        <div style={{ fontSize: '22px', fontWeight: '800', color: '#ffffff', letterSpacing: '-0.3px', marginBottom: '2px' }}>
            {value}
        </div>
        {subtitle && (
            <div style={{ fontSize: '11px', color: '#6b7280' }}>
                {subtitle}
            </div>
        )}
    </div>
);

export default BookingsTab;
