import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import supabaseService from '../../services/supabaseService';
import { getPlanDetails, calculateSubscriptionPrice } from '../../utils/subscriptionUtils';
import { getBillingInfo, formatDueText } from '../../utils/billingUtils';
import { isRentalBusiness } from '../../utils/businessUtils';

export default function BusinessSubscriptionView({ business, isMobile }) {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [subscription, setSubscription] = useState(
        business?.subscription || (Array.isArray(business?.subscriptions) ? business.subscriptions[0] : null) || null
    );

    // Detección robusta de tipo de negocio
    const bType = String(business?.type || '').toLowerCase();
    const bCat = String(business?.category || '').toLowerCase();
    const bCatId = String(business?.category_id || '').toLowerCase();

    const isRental = isRentalBusiness(business) || bCat === 'rental' || bCatId.includes('venue') || bCatId.includes('alquiler');

    // Detección de canchas y cálculo dinámico de abono
    const isSport = !isRental && (bType === 'sport' || bType === 'courts' || (business?.courts && business.courts.length > 0));
    const courtsCount = Math.max(1, subscription?.spaces_included || business?.courts?.length || business?.capacity || 1);

    // Escala de precios por cancha
    const unitPrice = calculateSubscriptionPrice('sport', courtsCount) / courtsCount;
    const totalCourtsPrice = calculateSubscriptionPrice('sport', courtsCount);

    // Servicios / Profesionales
    const specialistsCount = Math.max(1, subscription?.spaces_included || business?.specialists?.length || 1);
    const totalServicesPrice = calculateSubscriptionPrice('service', specialistsCount);

    // Quinchos / Salones
    const totalRentalPrice = 15000;

    const monthlyPrice = subscription?.monthly_price ? Number(subscription.monthly_price) : (isRental ? totalRentalPrice : (isSport ? totalCourtsPrice : totalServicesPrice));

    // Fechas de ciclo y vencimiento
    const now = new Date();
    const currentMonthIndex = now.getMonth();
    const currentYear = now.getFullYear();

    const monthNames = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    // Same due date as the portal banner and the SuperAdmin (trial end or next billing date)
    const billingInfo = getBillingInfo(business, subscription);
    const nd = billingInfo.dueDate;
    const nextDueDate = nd
        ? `${String(nd.getDate()).padStart(2, '0')} de ${monthNames[nd.getMonth()]} de ${nd.getFullYear()}`
        : 'Sin vencimiento';

    // Fecha de inicio de facturación
    let startDateFormatted = `01 de ${monthNames[currentMonthIndex]} de ${currentYear}`;
    const rawStartDate = subscription?.billing_start || business?.created_at;
    if (rawStartDate) {
        try {
            const cd = new Date(rawStartDate);
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
                const [statsData, subData] = await Promise.all([
                    supabaseService.getMonthlyBookingsStats(business.id),
                    supabaseService.getSubscription(business.id)
                ]);
                setStats(statsData);
                if (subData) setSubscription(subData);
            } catch (err) {
                console.error('Error loading subscription stats:', err);
            } finally {
                setLoading(false);
            }
        };

        loadStats();
    }, [business?.id]);

    // Filtrar cualquier bloqueo residual de la lista
    const filteredMarketplaceList = (stats?.marketplaceList || []).filter(item => 
        item.status !== 'blocked' &&
        !item.customer_name?.toUpperCase().includes('BLOQUEADO') &&
        !item.notes?.toUpperCase().includes('BLOQUEO')
    );

    const getItemCommission = (item) => {
        if (isRental) return Math.round(Number(item.price || 0) * 0.03);
        if (item.metadata?.commission_amount !== undefined && item.metadata?.commission_amount !== null) {
            return Number(item.metadata.commission_amount);
        }
        return 500;
    };

    const marketplaceCount = filteredMarketplaceList.length;
    const totalMarketplaceCommission = filteredMarketplaceList.reduce((acc, item) => {
        return acc + getItemCommission(item);
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
                        background: 'rgba(16, 185, 129, 0.15)',
                        color: 'var(--primary-paddle)',
                        fontSize: '12px',
                        fontWeight: '800',
                        marginBottom: '10px'
                    }}>
                        PLAN PREMIUM
                    </div>

                    <h3 style={{ margin: '0 0 6px 0', fontSize: '20px', fontWeight: '800', color: 'var(--text-primary)' }}>
                        {isRental
                                ? 'Alquileres (Quinchos y Salones)'
                                : isSport 
                                    ? (subscription?.plan_name || `Canchas (${courtsCount} ${courtsCount === 1 ? 'Cancha' : 'Canchas'})`)
                                    : (subscription?.plan_name
                                        ? `${subscription.plan_name} (${specialistsCount} ${specialistsCount === 1 ? 'Agenda' : 'Agendas'})`
                                        : (specialistsCount === 1
                                            ? 'Servicios - Individual (1 Agenda)'
                                            : `Servicios - Equipos (${specialistsCount} Agendas)`))
                        }
                    </h3>

                    <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '520px', lineHeight: '1.5' }}>
                        {isRental ? (
                            <span>
                                <strong style={{ color: 'var(--text-primary)' }}>
                                    Abono fijo $15.000 / mes.
                                </strong>
                                <br />
                                Reservas ilimitadas, $0 comisión directa por tu link, 3% por reserva desde TurnitosLR.
                            </span>
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
                                    ${monthlyPrice.toLocaleString('es-AR')} / mes.
                                </strong>
                                <br />
                                {specialistsCount} {specialistsCount === 1 ? 'agenda profesional' : 'agendas profesionales'}. Turnos ilimitados, $0 comisión directa, $500 por reserva desde TurnitosLR.
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
                        Ciclo de Facturación
                    </div>
                    <div style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-primary)' }}>
                        Mensual
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        Se renueva cada mes en la fecha de vencimiento
                    </div>
                </div>

                <div style={{
                    padding: '14px 16px',
                    borderRadius: '14px',
                    background: 'rgba(0, 230, 118, 0.08)',
                    border: '1px solid rgba(0, 230, 118, 0.25)'
                }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '700', textTransform: 'uppercase', marginBottom: '4px' }}>
                        Próximo Vencimiento
                    </div>
                    <div style={{ fontSize: '15px', fontWeight: '800', color: 'var(--primary-paddle)' }}>
                        {nextDueDate}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        {formatDueText(billingInfo)}
                    </div>
                </div>
            </div>

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
                            {isRental ? 'Reservas desde TurnitosLR' : 'Turnos desde TurnitosLR'}
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
                            {isRental ? 'Comisión por Reserva' : 'Comisión por Turno'}
                        </div>
                        <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--primary-paddle)' }}>
                            {isRental ? '3%' : '$500'}
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
                        {isRental ? 'Detalle de Reservas Generadas desde el Marketplace' : 'Detalle de Turnos Generados desde el Marketplace'}
                    </h4>

                    {loading ? (
                        <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                            Cargando desglose...
                        </div>
                    ) : stats?.error ? (
                        <div style={{ padding: '24px', textAlign: 'center', color: '#EF4444', fontSize: '14px' }}>
                            No pudimos cargar tus reservas del mes. Recargá la página para ver la comisión.
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
                                        <th style={{ padding: '10px 12px', fontWeight: '600' }}>{isRental ? 'Valor Alquiler' : 'Valor Turno'}</th>
                                        <th style={{ padding: '10px 12px', fontWeight: '600', textAlign: 'right' }}>Comisión</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredMarketplaceList.map((item, idx) => {
                                        const comm = getItemCommission(item);
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

            {/* Total Settlement Summary Card */}
            <div style={{
                background: 'var(--bg-card)',
                backgroundImage: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(16, 185, 129, 0.02) 100%)',
                borderRadius: '20px',
                padding: '24px',
                border: '1px solid rgba(16, 185, 129, 0.35)',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)',
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                justifyContent: 'space-between',
                alignItems: isMobile ? 'flex-start' : 'center',
                gap: '20px'
            }}>
                <div>
                    <div style={{ fontSize: '12px', fontWeight: '800', color: 'var(--primary-paddle)', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.04em' }}>
                        💳 Resumen de Liquidación del Período
                    </div>
                    <div style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                        <span>Abono Mensual ({isRental ? 'Quinchos' : isSport ? 'Canchas' : 'Servicios'}): <strong style={{ color: 'var(--text-primary)' }}>${monthlyPrice.toLocaleString('es-AR')}</strong></span>
                        <br />
                        <span>+ Comisiones Marketplace ({marketplaceCount} {marketplaceCount === 1 ? 'reserva' : 'reservas'}): <strong style={{ color: 'var(--text-primary)' }}>${totalMarketplaceCommission.toLocaleString('es-AR')}</strong></span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
                        Próximo vencimiento de pago: <strong style={{ color: 'var(--text-primary)' }}>{nextDueDate}</strong>
                    </div>
                </div>
                <div style={{ textAlign: isMobile ? 'left' : 'right' }}>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: '600' }}>
                        Total a Transferir
                    </div>
                    <div style={{ fontSize: '32px', fontWeight: '900', color: 'var(--primary-paddle)' }}>
                        ${(monthlyPrice + totalMarketplaceCommission).toLocaleString('es-AR')}
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
