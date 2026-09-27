import React, { useState } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { motion } from 'framer-motion';

/**
 * RentalMonthlyChart Component
 * Visualizes month-over-month seasonality, event volume, and revenue growth.
 * Eliminates daily 0/1 flatline charts for single-space venues.
 */
export default function RentalMonthlyChart({ monthlyData = [], isMobile = false }) {
    const [metricType, setMetricType] = useState('revenue'); // 'revenue' | 'events'

    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div style={{
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: '12px',
                    padding: '12px 16px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.12)'
                }}>
                    <p style={{
                        fontSize: '12px',
                        fontWeight: '700',
                        color: 'var(--text-secondary)',
                        marginBottom: '6px',
                        textTransform: 'uppercase'
                    }}>
                        {data.monthLabel}
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        <span style={{ fontSize: '15px', fontWeight: '800', color: '#10B981' }}>
                            ${(data.revenue || 0).toLocaleString('es-AR')} facturados
                        </span>
                        <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-primary)' }}>
                            {data.events || 0} {data.events === 1 ? 'evento realizado' : 'eventos realizados'}
                        </span>
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
                backgroundColor: 'var(--bg-card)',
                borderRadius: '20px',
                padding: isMobile ? '18px' : '24px',
                border: '1px solid var(--border)',
                boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
            }}
        >
            {/* Header & Toggle */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: isMobile ? 'flex-start' : 'center',
                flexDirection: isMobile ? 'column' : 'row',
                gap: '12px'
            }}>
                <div>
                    <h3 style={{
                        fontSize: '17px',
                        fontWeight: '800',
                        color: 'var(--text-primary)',
                        margin: 0,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}>
                        <span>📈</span> Evolución & Estacionalidad Mensual
                    </h3>
                    <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                        Facturación y cantidad de eventos a lo largo de los meses
                    </p>
                </div>

                <div style={{
                    display: 'flex',
                    background: 'var(--bg-main)',
                    padding: '3px',
                    borderRadius: '10px',
                    border: '1px solid var(--border)',
                    gap: '3px'
                }}>
                    <button
                        type="button"
                        onClick={() => setMetricType('revenue')}
                        style={{
                            padding: '5px 12px',
                            borderRadius: '7px',
                            border: 'none',
                            fontSize: '12px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            background: metricType === 'revenue' ? '#10B981' : 'transparent',
                            color: metricType === 'revenue' ? '#fff' : 'var(--text-secondary)',
                            transition: 'all 0.2s'
                        }}
                    >
                        💰 Facturación ($)
                    </button>
                    <button
                        type="button"
                        onClick={() => setMetricType('events')}
                        style={{
                            padding: '5px 12px',
                            borderRadius: '7px',
                            border: 'none',
                            fontSize: '12px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            background: metricType === 'events' ? '#6366F1' : 'transparent',
                            color: metricType === 'events' ? '#fff' : 'var(--text-secondary)',
                            transition: 'all 0.2s'
                        }}
                    >
                        📅 Eventos
                    </button>
                </div>
            </div>

            {/* Chart */}
            <div style={{ width: '100%', height: '260px' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.6} />
                        <XAxis
                            dataKey="monthLabel"
                            stroke="var(--text-secondary)"
                            fontSize={12}
                            tickLine={false}
                        />
                        <YAxis
                            stroke="var(--text-secondary)"
                            fontSize={11}
                            tickLine={false}
                            tickFormatter={(val) => {
                                if (metricType === 'revenue') {
                                    if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}M`;
                                    if (val >= 1000) return `$${Math.round(val / 1000)}k`;
                                    return `$${val}`;
                                }
                                return val;
                            }}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar
                            dataKey={metricType === 'revenue' ? 'revenue' : 'events'}
                            fill={metricType === 'revenue' ? '#10B981' : '#6366F1'}
                            radius={[6, 6, 0, 0]}
                            maxBarSize={48}
                        />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </motion.div>
    );
}
