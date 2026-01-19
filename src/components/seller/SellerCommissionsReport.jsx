import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import supabaseService from '../../services/supabaseService';

const SellerCommissionsReport = () => {
    const [commissions, setCommissions] = useState([]);
    const [projection, setProjection] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const navigate = useNavigate();

    useEffect(() => {
        loadCommissions();
    }, [selectedMonth, selectedYear]);

    const loadCommissions = async () => {
        setLoading(true);
        try {
            const sellerData = JSON.parse(localStorage.getItem('seller'));
            const [commissionsData, projectionData] = await Promise.all([
                supabaseService.getSellerCommissions(sellerData.id, selectedMonth, selectedYear),
                supabaseService.getSellerMonthlyProjection(sellerData.id)
            ]);

            setCommissions(commissionsData);
            setProjection(projectionData);
        } catch (error) {
            console.error('Error loading commissions:', error);
        } finally {
            setLoading(false);
        }
    };

    const months = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    const currentDate = new Date();
    const isCurrentMonth = selectedMonth === currentDate.getMonth() + 1 && selectedYear === currentDate.getFullYear();

    return (
        <div style={{
            minHeight: '100vh',
            background: '#0f0f0f',
            color: 'white',
            padding: '24px'
        }}>
            {/* Header */}
            <div style={{ marginBottom: '32px' }}>
                <button
                    onClick={() => navigate('/admin/dashboard')}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--primary-paddle)',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '600',
                        marginBottom: '8px'
                    }}
                >
                    ← Volver al Dashboard
                </button>
                <h1 style={{ fontSize: '32px', fontWeight: '700', margin: 0 }}>
                    Reporte de Comisiones
                </h1>
                <p style={{ opacity: 0.6, marginTop: '4px' }}>
                    Visualiza tus comisiones y proyecciones mensuales
                </p>
            </div>

            {/* Month/Year Selector */}
            <div style={{
                display: 'flex',
                gap: '16px',
                marginBottom: '24px',
                flexWrap: 'wrap'
            }}>
                <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                    style={{
                        padding: '12px 16px',
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '12px',
                        color: 'white',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        outline: 'none'
                    }}
                >
                    {months.map((month, index) => (
                        <option key={index} value={index + 1}>{month}</option>
                    ))}
                </select>
                <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                    style={{
                        padding: '12px 16px',
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '12px',
                        color: 'white',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        outline: 'none'
                    }}
                >
                    {[2025, 2026, 2027].map(year => (
                        <option key={year} value={year}>{year}</option>
                    ))}
                </select>
            </div>

            {/* Summary Cards */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: '20px',
                marginBottom: '32px'
            }}>
                <SummaryCard
                    icon="💰"
                    title="Total del Período"
                    value={`$${commissions.total?.toLocaleString() || 0}`}
                    subtitle={`${commissions.commissions?.length || 0} comisiones`}
                    highlight
                />

                {isCurrentMonth && projection && (
                    <>
                        <SummaryCard
                            icon="📊"
                            title="Proyección Mensual"
                            value={`$${parseFloat(projection.projectedTotal).toLocaleString()}`}
                            subtitle={`Basado en ${projection.daysPassed} días`}
                        />
                        <SummaryCard
                            icon="📈"
                            title="Promedio Diario"
                            value={`$${parseFloat(projection.dailyAverage).toLocaleString()}`}
                            subtitle={`${projection.daysRemaining} días restantes`}
                        />
                    </>
                )}
            </div>

            {/* Commissions Table */}
            <div style={{
                background: 'rgba(255,255,255,0.03)',
                borderRadius: '16px',
                padding: '24px',
                border: '1px solid rgba(255,255,255,0.05)'
            }}>
                <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '20px' }}>
                    Detalle de Comisiones
                </h2>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '40px', opacity: 0.5 }}>
                        Cargando...
                    </div>
                ) : commissions.commissions?.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', opacity: 0.5 }}>
                        <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
                        <p>No hay comisiones registradas para este período</p>
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', opacity: 0.6, fontWeight: '600' }}>Negocio</th>
                                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', opacity: 0.6, fontWeight: '600' }}>Mes Suscripción</th>
                                    <th style={{ padding: '12px', textAlign: 'right', fontSize: '13px', opacity: 0.6, fontWeight: '600' }}>Pago</th>
                                    <th style={{ padding: '12px', textAlign: 'right', fontSize: '13px', opacity: 0.6, fontWeight: '600' }}>Tasa</th>
                                    <th style={{ padding: '12px', textAlign: 'right', fontSize: '13px', opacity: 0.6, fontWeight: '600' }}>Comisión</th>
                                    <th style={{ padding: '12px', textAlign: 'center', fontSize: '13px', opacity: 0.6, fontWeight: '600' }}>Bonus</th>
                                </tr>
                            </thead>
                            <tbody>
                                {commissions.commissions.map((commission) => (
                                    <tr
                                        key={commission.id}
                                        style={{
                                            borderBottom: '1px solid rgba(255,255,255,0.05)',
                                            transition: 'background 0.2s'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                    >
                                        <td style={{ padding: '16px', fontWeight: '600' }}>
                                            {commission.businesses?.name}
                                        </td>
                                        <td style={{ padding: '16px' }}>
                                            Mes {commission.subscription_month}
                                        </td>
                                        <td style={{ padding: '16px', textAlign: 'right' }}>
                                            ${parseFloat(commission.payment_amount).toLocaleString()}
                                        </td>
                                        <td style={{ padding: '16px', textAlign: 'right' }}>
                                            {commission.base_commission_rate}%
                                            {commission.volume_bonus > 0 && (
                                                <span style={{ color: 'var(--primary-paddle)', marginLeft: '4px' }}>
                                                    +{commission.volume_bonus}%
                                                </span>
                                            )}
                                        </td>
                                        <td style={{
                                            padding: '16px',
                                            textAlign: 'right',
                                            fontWeight: '700',
                                            color: 'var(--primary-paddle)',
                                            fontSize: '16px'
                                        }}>
                                            ${parseFloat(commission.commission_amount).toLocaleString()}
                                        </td>
                                        <td style={{ padding: '16px', textAlign: 'center' }}>
                                            {commission.volume_bonus > 0 ? '🎉' : '-'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr style={{ borderTop: '2px solid rgba(255,255,255,0.1)' }}>
                                    <td colSpan="4" style={{ padding: '16px', fontWeight: '700', fontSize: '16px' }}>
                                        TOTAL
                                    </td>
                                    <td style={{
                                        padding: '16px',
                                        textAlign: 'right',
                                        fontWeight: '700',
                                        color: 'var(--primary-paddle)',
                                        fontSize: '18px'
                                    }}>
                                        ${commissions.total?.toLocaleString() || 0}
                                    </td>
                                    <td></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                )}
            </div>

            {/* Commission Structure Info */}
            <div style={{
                marginTop: '32px',
                background: 'rgba(0, 230, 118, 0.05)',
                border: '1px solid rgba(0, 230, 118, 0.2)',
                borderRadius: '16px',
                padding: '24px'
            }}>
                <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px', color: 'var(--primary-paddle)' }}>
                    📋 Estructura de Comisiones
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                    <div>
                        <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--primary-paddle)' }}>40%</div>
                        <div style={{ fontSize: '13px', opacity: 0.8 }}>Mes 1</div>
                    </div>
                    <div>
                        <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--primary-paddle)' }}>30%</div>
                        <div style={{ fontSize: '13px', opacity: 0.8 }}>Mes 2</div>
                    </div>
                    <div>
                        <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--primary-paddle)' }}>20%</div>
                        <div style={{ fontSize: '13px', opacity: 0.8 }}>Mes 3</div>
                    </div>
                    <div>
                        <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--primary-paddle)' }}>10%</div>
                        <div style={{ fontSize: '13px', opacity: 0.8 }}>Meses 4-6</div>
                    </div>
                    <div>
                        <div style={{ fontSize: '24px', fontWeight: '700', color: '#ef4444' }}>0%</div>
                        <div style={{ fontSize: '13px', opacity: 0.8 }}>Mes 7+</div>
                    </div>
                </div>
                <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(0, 230, 118, 0.1)', borderRadius: '8px' }}>
                    <strong>🎉 Bonus:</strong> +5% adicional si tienes 50+ clientes activos en el mes
                </div>
            </div>
        </div>
    );
};

const SummaryCard = ({ icon, title, value, subtitle, highlight }) => (
    <motion.div
        whileHover={{ y: -4 }}
        style={{
            background: highlight ? 'rgba(0, 230, 118, 0.1)' : 'rgba(255,255,255,0.03)',
            border: `1px solid ${highlight ? 'rgba(0, 230, 118, 0.3)' : 'rgba(255,255,255,0.05)'}`,
            borderRadius: '16px',
            padding: '24px'
        }}
    >
        <div style={{ fontSize: '32px', marginBottom: '12px' }}>{icon}</div>
        <div style={{ fontSize: '14px', opacity: 0.6, marginBottom: '8px' }}>{title}</div>
        <div style={{
            fontSize: '28px',
            fontWeight: '700',
            marginBottom: '4px',
            color: highlight ? 'var(--primary-paddle)' : 'white'
        }}>
            {value}
        </div>
        <div style={{ fontSize: '12px', opacity: 0.5 }}>{subtitle}</div>
    </motion.div>
);

export default SellerCommissionsReport;
