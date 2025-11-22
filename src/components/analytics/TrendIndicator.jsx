import React from 'react';
import { motion } from 'framer-motion';

/**
 * TrendIndicator Component
 * Shows trend direction with percentage and color coding
 */
export default function TrendIndicator({ value, isPositive = null }) {
    // Auto-detect if positive based on value if not specified
    const positive = isPositive !== null ? isPositive : value >= 0;
    const color = positive ? '#10b981' : '#ef4444';
    const arrow = positive ? '↑' : '↓';

    return (
        <motion.span
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{
                color,
                fontSize: '14px',
                fontWeight: '600',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '2px'
            }}
        >
            <span style={{ fontSize: '16px' }}>{arrow}</span>
            {Math.abs(value).toFixed(1)}%
        </motion.span>
    );
}
