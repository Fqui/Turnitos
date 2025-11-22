import React from 'react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';

/**
 * RevenueChart Component
 * Displays revenue and bookings trends over time
 */
export default function RevenueChart({ data, type = 'revenue' }) {
    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            return (
                <div style={{
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    padding: '12px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }}>
                    <p style={{
                        fontSize: '12px',
                        color: 'var(--text-secondary)',
                        marginBottom: '4px'
                    }}>
                        {payload[0].payload.date}
                    </p>
                    {type === 'revenue' && (
                        <p style={{
                            fontSize: '16px',
                            fontWeight: '700',
                            color: '#10b981'
                        }}>
                            ${payload[0].value.toLocaleString('es-AR')}
                        </p>
                    )}
                    {type === 'bookings' && (
                        <p style={{
                            fontSize: '16px',
                            fontWeight: '700',
                            color: '#6366f1'
                        }}>
                            {payload[0].value} reservas
                        </p>
                    )}
                </div>
            );
        }
        return null;
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
                backgroundColor: 'var(--bg-card)',
                borderRadius: '16px',
                padding: '24px',
                border: '1px solid var(--border)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
            }}
        >
            <h3 style={{
                fontSize: '18px',
                fontWeight: '700',
                color: 'var(--text-primary)',
                marginBottom: '20px'
            }}>
                {type === 'revenue' ? 'Tendencia de Ingresos' : 'Tendencia de Reservas'}
            </h3>

            <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={data}>
                    <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorBookings" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis
                        dataKey="date"
                        stroke="var(--text-secondary)"
                        style={{ fontSize: '12px' }}
                    />
                    <YAxis
                        stroke="var(--text-secondary)"
                        style={{ fontSize: '12px' }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    {type === 'revenue' && (
                        <Area
                            type="monotone"
                            dataKey="revenue"
                            stroke="#10b981"
                            strokeWidth={2}
                            fillOpacity={1}
                            fill="url(#colorRevenue)"
                        />
                    )}
                    {type === 'bookings' && (
                        <Area
                            type="monotone"
                            dataKey="bookings"
                            stroke="#6366f1"
                            strokeWidth={2}
                            fillOpacity={1}
                            fill="url(#colorBookings)"
                        />
                    )}
                </AreaChart>
            </ResponsiveContainer>
        </motion.div>
    );
}
