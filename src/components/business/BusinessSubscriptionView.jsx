import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import supabaseService from '../../services/supabaseService';
import { getPlanDetails, isFreePlan } from '../../utils/subscriptionUtils';

export default function BusinessSubscriptionView({ business, isMobile }) {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    const isFree = isFreePlan(business?.subscription_plan_id || business?.subscription_plan_name);

    // Detección de canchas y cálculo dinámico de abono
    const isSport = business?.type === 'sport' || business?.type === 'courts' || (business?.courts && business.courts.length > 0) || !business?.type;
    const courtsCount = Math.max(1, business?.courts?.length || business?.capacity || 1);

    // Escala de precios por cancha
    let unitPrice = 20000;
    if (courtsCount >= 4 && courtsCount <= 5) {
        unitPrice = 17000;
    } else if (courtsCount >= 6) {
        unitPrice = 15000;
    }

    const totalCourtsPrice = courtsCount * unitPrice;

    // Servicios / Profesionales
    const specialistsCount = Math.max(1, business?.specialists?.length || 1);
    let totalServicesPrice = 18000;
    if (specialistsCount > 1) {
        const extra = Math.max(0, specialistsCount - 3);
        totalServicesPrice = 36000 + (extra * 10000);
    }

    const monthlyPrice = isFree ? 0 : (isSport ? totalCourtsPrice : totalServicesPrice);

    // Fechas de ciclo y vencimiento
    const now = new Date();
    const currentMonthIndex = now.getMonth();
    const currentYear = now.getFullYear();

    const monthNames = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    // Próximo mes de vencimiento
    const nextMonthIndex = (currentMonthIndex + 1) % 12;
    const nextMonthYear = currentMonthIndex === 11 ? currentYear + 1 : currentYear;
    const nextDueDate = `10 de ${monthNames[nextMonthIndex]} de ${nextMonthYear}`;

    // Fecha de inicio de facturación
    let startDateFormatted = `01 de ${monthNames[currentMonthIndex]} de ${currentYear}`;
    if (business?.created_at) {
        try {
            const cd = new Date(business.created_at);
            if (!isNaN(cd.getTime())) {
                startDateFormatted = `${String(cd.getDate()).padStart(2, '0')}/${String(cd.getMonth() + 1).padStart(2, '0')}/${cd.getFullYear()}`;
            }
        } catch (e) {
            // fallback default
        }
    }

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

    // Filtrar cualquier bloqueo residual de la lista
    const filteredMarketplaceList = (stats?.marketplaceList || []).filter(item => 
        item.status !== 'blocked' &&
        !item.customer_name?.toUpperCase().includes('BLOQUEADO') &&
        !item.notes?.toUpperCase().includes('BLOQUEO')
    );

    const marketplaceCount = filteredMarketplaceList.length;
    const totalMarketplaceCommission = filteredMarketplaceList.reduce((acc, item) => {
        const comm = item.metadata?.commission_amount !== undefined 
            ? Number(item.metadata.commission_amount) 
            : (isFree ? Math.round(Number(item.price || 0) * 0.05) : 500);
        return acc + comm;
    }, 0);

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
                    Suscripción y Estado de Cuenta
                </h2>
                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '14px' }}>
                    Control de tu plan actual, detalle de facturación y liquidación de reservas.
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
                        background: isFree ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.15)',
                        color: isFree ? '#EF4444' : 'var(--primary-paddle)',
                        fontSize: '12px',
                        fontWeight: '800',
                        marginBottom: '10px'
                    }}>
                        {isFree ? 'PLAN GRATUITO' : 'PLAN PREMIUM'}
                    </div>

                    <h3 style={{ margin: '0 0 6px 0', fontSize: '20px', fontWeight: '800', color: 'var(--text-primary)' }}>
                        {isFree 
                            ? 'Plan Básico (Hasta 100 turnos/mes)'
                            : isSport 
                                ? `Canchas (${courtsCount} ${courtsCount === 1 ? 'Cancha' : 'Canchas'})`
                                : `Servicios (${specialistsCount} ${specialistsCount === 1 ? 'Agenda' : 'Agendas'})`
                        }
                    </h3>

                    <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '520px', lineHeight: '1.5' }}>
                        {isFree ? (
                            'Hasta 100 reservas al mes. 5% de comisión por turno.'
                        ) : isSport ? (
                            <span>
                                <strong style={{ color: 'var(--text-primary)' }}>
                                    {courtsCount} {courtsCount === 1 ? 'cancha' : 'canchas'} × ${unitPrice.toLocaleString('es-AR')} = ${totalCourtsPrice.toLocaleString('es-AR')} / mes.
                                </strong>
                                <br />
                                Turnos ilimitados, $0 comisión directa por tu link, $500 por reserva desde TurnitosLR.
                            </span>
                        ) : (
                            <span>
                                <strong style={{ color: 'var(--text-primary)' }}>
                                    ${totalServicesPrice.toLocaleString('es-AR')} / mes.
                                </strong>
                                <br />
                                Turnos ilimitados, $0 comisión directa, $500 por reserva desde TurnitosLR.
                            </span>
                        )}
                    </p>
                </div>

                <div style={{ textAlign: isMobile ? 'left' : 'right', minWidth: '200px' }}>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: '600' }}>
                        Abono Mensual Total
                    </div>
                    <div style={{ fontSize: '28px', fontWeight: '900', color: 'var(--primary-paddle)' }}>
                        ${monthlyPrice.toLocaleString('es-AR')}
                        <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)' }}> / mes</span>
                    </div>
                </div>
            </div>

            {/* Billing Dates & Due Dates Card */}
            <div style={{
                background: 'var(--bg-card)',
                borderRadius: '20px',
                padding: '20px 24px',
                border: '1px solid var(--border)',
                boxShadow: '0 4px 16px rgba(0,0,0,0.05)',
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
                gap: '16px'
            }}>
                <div style={{
                    padding: '14px 16px',
                    borderRadius: '14px',
                    background: 'var(--bg-main)',
                    border: '1px solid var(--border)'
                }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '700', textTransform: 'uppercase', marginBottom: '4px' }}>
                        Inicio de Facturación
                    </div>
                    <div style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-primary)' }}>
                        {startDateFormatted}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        Ciclo mensual activo
                    </div>
                </div>

                <div style={{
                    padding: '14px 16px',
                    borderRadius: '14px',
                    background: 'var(--bg-main)',
                    border: '1px solid var(--border)'
                }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '700', textTransform: 'uppercase', marginBottom: '4px' }}>
                        Período de Facturación
                    </div>
                    <div style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-primary)' }}>
                        Mes corriente ({monthNames[currentMonthIndex]})
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        1 al último día de cada mes
                    </div>
                </div>

                <div style={{
                    padding: '14px 16px',
                    borderRadius: '14px',
                    background: 'rgba(0, 230, 118, 0.08)',
                    border: '1px solid rgba(0, 230, 118, 0.25)'
                }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '700', textTransform: 'uppercase', marginBottom: '4px' }}>
                        Fecha de Pago
                    </div>
                    <div style={{ fontSize: '15px', fontWeight: '800', color: 'var(--primary-paddle)' }}>
                        1 al 10 de cada mes
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        Próx. vencimiento: {nextDueDate}
                    </div>
                </div>
            </div>

            {/* Free Plan Monthly Limit Progress */}
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
                        Reservas desde TurnitosLR
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
                            Turnos desde TurnitosLR
                        </div>
                        <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-primary)' }}>
                            {marketplaceCount}
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
                            Total Comisión TurnitosLR
                        </div>
                        <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--primary-paddle)' }}>
                            ${totalMarketplaceCommission.toLocaleString('es-AR')}
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
                    ) : filteredMarketplaceList.length === 0 ? (
                        <div style={{
                            padding: '32px 20px',
                            textAlign: 'center',
                            background: 'var(--bg-main)',
                            borderRadius: '12px',
                            color: 'var(--text-secondary)',
                            fontSize: '14px'
                        }}>
                            No hay reservas originadas desde el buscador público de TurnitosLR este mes. Todas tus reservas fueron directas ($0 comisión).
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
                                    {filteredMarketplaceList.map((item, idx) => {
                                        const comm = item.metadata?.commission_amount !== undefined 
                                            ? Number(item.metadata.commission_amount) 
                                            : (isFree ? Math.round(Number(item.price || 0) * 0.05) : 500);
                                        return (
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
                                                    ${comm.toLocaleString('es-AR')}
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
        </motion.div>
    );
}
