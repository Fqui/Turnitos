import React from 'react';
import DateRangePicker from '../../analytics/DateRangePicker';
import RevenueChart from '../../analytics/RevenueChart';
import PeakHoursHeatmap from '../../analytics/PeakHoursHeatmap';

export default function PortalAnalyticsView({
    metrics,
    trends,
    peakHours,
    customerInsights,
    setDateRange,
    analyticsLoading,
    isMobile
}) {
    return (
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
    );
}
