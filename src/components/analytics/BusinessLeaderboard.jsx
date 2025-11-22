import React from 'react';
import { motion } from 'framer-motion';

/**
 * BusinessLeaderboard Component
 * Shows top performing businesses by revenue
 */
export default function BusinessLeaderboard({ businesses }) {
    if (!businesses || businesses.length === 0) {
        return <div>No hay datos disponibles</div>;
    }

    const getMedalEmoji = (index) => {
        if (index === 0) return '🥇';
        if (index === 1) return '🥈';
        if (index === 2) return '🥉';
        return `${index + 1}.`;
    };

    const getTypeIcon = (type) => {
        return type === 'sport' ? '⚽' : '💆';
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
                🏆 Ranking de Negocios
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {businesses.map((business, index) => (
                    <motion.div
                        key={business.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        whileHover={{ x: 4 }}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '16px',
                            padding: '16px',
                            borderRadius: '12px',
                            background: index < 3
                                ? 'linear-gradient(135deg, rgba(99,102,241,0.05), rgba(99,102,241,0.02))'
                                : 'var(--bg-main)',
                            border: '1px solid var(--border)',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        {/* Rank */}
                        <div style={{
                            fontSize: '24px',
                            fontWeight: '700',
                            minWidth: '40px',
                            textAlign: 'center'
                        }}>
                            {getMedalEmoji(index)}
                        </div>

                        {/* Business Info */}
                        <div style={{ flex: 1 }}>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                marginBottom: '4px'
                            }}>
                                <span style={{ fontSize: '18px' }}>
                                    {getTypeIcon(business.type)}
                                </span>
                                <span style={{
                                    fontSize: '16px',
                                    fontWeight: '600',
                                    color: 'var(--text-primary)'
                                }}>
                                    {business.name}
                                </span>
                            </div>
                            <div style={{
                                fontSize: '12px',
                                color: 'var(--text-secondary)'
                            }}>
                                {business.totalBookings} reservas
                            </div>
                        </div>

                        {/* Revenue */}
                        <div style={{
                            textAlign: 'right'
                        }}>
                            <div style={{
                                fontSize: '20px',
                                fontWeight: '700',
                                color: '#10b981'
                            }}>
                                ${business.revenue.toLocaleString('es-AR')}
                            </div>
                            <div style={{
                                fontSize: '12px',
                                color: 'var(--text-secondary)'
                            }}>
                                ingresos
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>
        </motion.div>
    );
}
