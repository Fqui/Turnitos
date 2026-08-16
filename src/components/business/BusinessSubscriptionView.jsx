import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import supabaseService from '../../services/supabaseService';
import { getPlanDetails, isFreePlan } from '../../utils/subscriptionUtils';
import { formatPrice } from '../../utils/businessUtils';

export default function BusinessSubscriptionView({ business, isMobile }) {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    const planInfo = getPlanDetails(
        business?.subscription_plan_id || business?.subscription_plan_name,
        business?.type || business?.category,
        business?.capacity || 1
    );

    const isFree = isFreePlan(business?.subscription_plan_id || business?.subscription_plan_name);

    useEffect(() => {
        const loadStats = async () => {
            if (!business?.id) return;
            setLoading(true);
            try {
                const data = await supabaseService.getMonthlyBookingsStats(business.id);
                setStats(data);
            } catch (err) {
                console.error('Error loading subscription stats:', err);
            } finally {
                setLoading(false);
            }
        };

        loadStats();
    }, [business?.id]);

    const totalBookings = stats?.totalBookings || 0;
    const limit = 100;
    const usagePercent = Math.min(100, Math.round((totalBookings / limit) * 100));

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '24px',
                width: '100%',
                maxWidth: '960px',
                margin: '0 auto',
                paddingBottom: '40px'
            }}
        >
            {/* Header */}
            <div>
                <h2 style={{ fontSize: '24px', fontWeight: '800', margin: '0 0 6px 0', color: 'var(--text-primary)' }}>
                    💳 Suscripción y Estado de Cuenta
                </h2>
                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '14px' }}>
                    Control de tu plan actual y liquidación de reservas originadas desde el Marketplace.
                </p>
            </div>

            {/* Plan Info Card */}
            <div style={{
                background: 'var(--bg-card)',
                borderRadius: '20px',
                padding: '24px',
                border: '1px solid var(--border)',
                boxShadow: '0 4px 16px rgba(0,0,0,0.05)',
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                justifyContent: 'space-between',
                alignItems: isMobile ? 'flex-start' : 'center',
                gap: '20px'
            }}>
                <div>
                    <div style={{
                        display: 'inline-block',
                        padding: '4px 12px',
                        borderRadius: '20px',
                        background: isFree ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                        color: isFree ? '#EF4444' : '#10B981',
                        fontSize: '12px',
                        fontWeight: '700',
                        marginBottom: '10px'
                    }}>
                        {isFree ? 'PLAN GRATUITO' : 'PLAN PREMIUM'}
                    </div>
                    <h3 style={{ margin: '0 0 6px 0', fontSize: '20px', fontWeight: '800', color: 'var(--text-primary)' }}>
                        {planInfo?.name || 'Plan Estándar'}
                    </h3>
                    <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '500px' }}>
                        {planInfo?.description || 'Gestioná tus turnos y clientes sin límites.'}
                    </p>
                </div>

                <div style={{ textAlign: isMobile ? 'left' : 'right' }}>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: '600' }}>
                        Abono Mensual
                    </div>
                    <div style={{ fontSize: '26px', fontWeight: '900', color: 'var(--primary-paddle)' }}>
                        {isFree ? '$0' : (planInfo?.monthly_price ? `$${planInfo.monthly_price.toLocaleString('es-AR')}` : '$18.000')}
                        <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)' }}> / mes</span>
                    </div>
                </div>
            </div>

            {/* Free Plan Monthly Limit Progress (Only if Free Plan) */}
            {isFree && (
                <div style={{
                    background: 'var(--bg-card)',
                    borderRadius: '20px',
                    padding: '24px',
                    border: '1px solid var(--border)',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.05)'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <div>
                            <h4 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)' }}>
                                Consumo de Turnos del Mes
                            </h4>
                            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
                                Límite de 100 turnos mensuales incluidos en el Plan Gratis.
                            </p>
                        </div>
                        <div style={{ fontSize: '18px', fontWeight: '800', color: totalBookings >= 100 ? '#EF4444' : 'var(--text-primary)' }}>
                            {totalBookings} / {limit}
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div style={{
                        width: '100%',
                        height: '10px',
                        background: 'var(--bg-main)',
                        borderRadius: '5px',
                        overflow: 'hidden',
                        marginBottom: '10px'
                    }}>
                        <div style={{
                            width: `${usagePercent}%`,
                            height: '100%',
                            background: totalBookings >= 100 ? '#EF4444' : (totalBookings >= 80 ? '#F59E0B' : 'var(--primary-paddle)'),
                            borderRadius: '5px',
                            transition: 'width 0.4s ease'
                        }} />
                    </div>

                    {totalBookings >= 100 && (
                        <div style={{
                            padding: '10px 14px',
                            borderRadius: '10px',
                            background: 'rgba(239, 68, 68, 0.1)',
                            color: '#EF4444',
                            fontSize: '13px',
                            fontWeight: '600'
                        }}>
                            ⚠️ Cupo mensual alcanzado (100/100). Las reservas online para clientes están pausadas hasta el próximo mes.
                        </div>
                    )}
                </div>
            )}

            {/* Marketplace Reservations Breakdown */}
            <div style={{
                background: 'var(--bg-card)',
                borderRadius: '20px',
                padding: '24px',
                border: '1px solid var(--border)',
                boxShadow: '0 4px 16px rgba(0,0,0,0.05)'
            }}>
                <div style={{ marginBottom: '20px' }}>
                    <h3 style={{ margin: '0 0 6px 0', fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)' }}>
                        🏪 Reservas desde el Marketplace (Home TurnitosLR)
                    </h3>
                    <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
                        Clientes que descubrieron y reservaron tu negocio a través del directorio y buscador público de TurnitosLR.
                    </p>
                </div>

                {/* KPI Cards */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
                    gap: '16px',
                    marginBottom: '24px'
                }}>
                    <div style={{
                        padding: '16px',
                        borderRadius: '14px',
                        background: 'var(--bg-main)',
                        border: '1px solid var(--border)'
                    }}>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: '600' }}>
                            Turnos de Marketplace
                        </div>
                        <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-primary)' }}>
                            {stats?.marketplaceBookings || 0}
                        </div>
                    </div>

                    <div style={{
                        padding: '16px',
                        borderRadius: '14px',
                        background: 'var(--bg-main)',
                        border: '1px solid var(--border)'
                    }}>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: '600' }}>
                            Comisión por Turno
                        </div>
                        <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--primary-paddle)' }}>
                            {isFree ? '5%' : '$500'}
                        </div>
                    </div>

                    <div style={{
                        padding: '16px',
                        borderRadius: '14px',
                        background: 'var(--bg-main)',
                        border: '1px solid var(--border)'
                    }}>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: '600' }}>
                            Total Comisión Marketplace
                        </div>
                        <div style={{ fontSize: '24px', fontWeight: '800', color: '#10B981' }}>
                            ${(stats?.totalMarketplaceCommission || 0).toLocaleString('es-AR')}
                        </div>
                    </div>
                </div>

                {/* Marketplace Bookings List Table */}
                <div>
                    <h4 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '14px', color: 'var(--text-primary)' }}>
                        Detalle de Turnos Generados desde el Marketplace
                    </h4>

                    {loading ? (
                        <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                            Cargando desglose...
                        </div>
                    ) : (stats?.marketplaceList || []).length === 0 ? (
                        <div style={{
                            padding: '32px 20px',
                            textAlign: 'center',
                            background: 'var(--bg-main)',
                            borderRadius: '12px',
                            color: 'var(--text-secondary)',
                            fontSize: '14px'
                        }}>
                            No hay reservas originadas desde el Marketplace este mes. Todas tus reservas fueron directas ($0 comisión).
                        </div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--text-secondary)' }}>
                                        <th style={{ padding: '10px 12px', fontWeight: '600' }}>Fecha y Hora</th>
                                        <th style={{ padding: '10px 12px', fontWeight: '600' }}>Cliente</th>
                                        <th style={{ padding: '10px 12px', fontWeight: '600' }}>Teléfono</th>
                                        <th style={{ padding: '10px 12px', fontWeight: '600' }}>Valor Turno</th>
                                        <th style={{ padding: '10px 12px', fontWeight: '600', textAlign: 'right' }}>Comisión</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {stats.marketplaceList.map((item, idx) => (
                                        <tr key={item.id || idx} style={{ borderBottom: '1px solid var(--border)' }}>
                                            <td style={{ padding: '12px', fontWeight: '600', color: 'var(--text-primary)' }}>
                                                {item.date} {item.time ? `• ${item.time}` : ''}
                                            </td>
                                            <td style={{ padding: '12px', color: 'var(--text-primary)' }}>
                                                {item.customer_name || 'Cliente'}
                                            </td>
                                            <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>
                                                {item.customer_phone || '-'}
                                            </td>
                                            <td style={{ padding: '12px', color: 'var(--text-primary)' }}>
                                                ${Number(item.price || 0).toLocaleString('es-AR')}
                                            </td>
                                            <td style={{ padding: '12px', textAlign: 'right', fontWeight: '700', color: 'var(--primary-paddle)' }}>
                                                ${(item.metadata?.commission_amount !== undefined ? Number(item.metadata.commission_amount) : 500).toLocaleString('es-AR')}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
}
