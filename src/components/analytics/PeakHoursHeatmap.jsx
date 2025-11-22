import React from 'react';
import { motion } from 'framer-motion';

/**
 * PeakHoursHeatmap Component
 * Visual heatmap showing booking density by day and hour
 */
export default function PeakHoursHeatmap({ data, labels }) {
    if (!data || !labels) {
        return <div>Cargando...</div>;
    }

    // Find max value for color scaling
    const maxValue = Math.max(...data.flat());

    const getColor = (value) => {
        if (value === 0) return '#f3f4f6';
        const intensity = value / maxValue;
        const hue = 220; // Blue hue
        const saturation = 70;
        const lightness = 95 - (intensity * 50); // Darker = more bookings
        return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
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
                Horas Pico
            </h3>

            <div style={{ overflowX: 'auto' }}>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: '60px repeat(24, 30px)',
                    gap: '4px',
                    minWidth: '800px'
                }}>
                    {/* Header row - Hours */}
                    <div></div>
                    {labels.hours.map((hour, i) => (
                        <div key={i} style={{
                            fontSize: '10px',
                            color: 'var(--text-secondary)',
                            textAlign: 'center',
                            transform: 'rotate(-45deg)',
                            transformOrigin: 'center',
                            height: '40px',
                            display: 'flex',
                            alignItems: 'flex-end',
                            justifyContent: 'center'
                        }}>
                            {hour}
                        </div>
                    ))}

                    {/* Data rows */}
                    {data.map((row, dayIndex) => (
                        <React.Fragment key={dayIndex}>
                            {/* Day label */}
                            <div style={{
                                fontSize: '12px',
                                fontWeight: '600',
                                color: 'var(--text-secondary)',
                                display: 'flex',
                                alignItems: 'center'
                            }}>
                                {labels.days[dayIndex]}
                            </div>

                            {/* Hour cells */}
                            {row.map((value, hourIndex) => (
                                <motion.div
                                    key={hourIndex}
                                    whileHover={{ scale: 1.2, zIndex: 10 }}
                                    title={`${labels.days[dayIndex]} ${labels.hours[hourIndex]}: ${value} reservas`}
                                    style={{
                                        backgroundColor: getColor(value),
                                        borderRadius: '4px',
                                        height: '30px',
                                        cursor: 'pointer',
                                        border: '1px solid var(--border)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '10px',
                                        fontWeight: '600',
                                        color: value > maxValue / 2 ? '#fff' : 'var(--text-secondary)'
                                    }}
                                >
                                    {value > 0 ? value : ''}
                                </motion.div>
                            ))}
                        </React.Fragment>
                    ))}
                </div>
            </div>

            {/* Legend */}
            <div style={{
                marginTop: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                fontSize: '12px',
                color: 'var(--text-secondary)'
            }}>
                <span>Menos reservas</span>
                <div style={{ display: 'flex', gap: '2px' }}>
                    {[0, 0.25, 0.5, 0.75, 1].map((intensity, i) => (
                        <div
                            key={i}
                            style={{
                                width: '20px',
                                height: '20px',
                                backgroundColor: getColor(intensity * maxValue),
                                borderRadius: '4px',
                                border: '1px solid var(--border)'
                            }}
                        />
                    ))}
                </div>
                <span>Más reservas</span>
            </div>
        </motion.div>
    );
}
