import React from 'react';
import { motion } from 'framer-motion';
import TrendIndicator from './TrendIndicator';

/**
 * MetricsCard Component
 * Reusable card for displaying KPIs with icon, value, and trend
 */
export default function MetricsCard({
    icon,
    title,
    value,
    trend = null,
    format = 'number',
    color = '#6366f1'
}) {
    const formatValue = (val) => {
        if (format === 'currency') {
            return `$${val.toLocaleString('es-AR')}`;
        } else if (format === 'percentage') {
            return `${val.toFixed(1)}%`;
        } else {
            return val.toLocaleString('es-AR');
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -4 }}
            style={{
                backgroundColor: 'var(--bg-card)',
                borderRadius: '16px',
                padding: '20px',
                border: '1px solid var(--border)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                transition: 'all 0.3s ease'
            }}
        >
            {/* Icon and Title */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '12px'
            }}>
                <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '12px',
                    background: `linear-gradient(135deg, ${color}20, ${color}10)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '20px'
                }}>
                    {icon}
                </div>
                <span style={{
                    fontSize: '14px',
                    color: 'var(--text-secondary)',
                    fontWeight: '500'
                }}>
                    {title}
                </span>
            </div>

            {/* Value */}
            <div style={{
                fontSize: '28px',
                fontWeight: '700',
                color: 'var(--text-primary)',
                marginBottom: '8px'
            }}>
                {formatValue(value)}
            </div>

            {/* Trend */}
            {trend !== null && (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                }}>
                    <TrendIndicator value={trend} />
                    <span style={{
                        fontSize: '12px',
                        color: 'var(--text-secondary)'
                    }}>
                        vs período anterior
                    </span>
                </div>
            )}
        </motion.div>
    );
}
