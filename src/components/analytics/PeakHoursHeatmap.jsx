import React from 'react';
import { motion } from 'framer-motion';

/**
 * PeakHoursHeatmap Component
 * Visual heatmap showing booking density by day and hour
 */
export default function PeakHoursHeatmap({ data, labels }) {
    if (!data || !labels) {
        return (
            <div style={{
                backgroundColor: 'var(--bg-card)',
                borderRadius: '16px',
                padding: '24px',
                border: '1px solid var(--border)',
                textAlign: 'center',
                color: 'var(--text-secondary)',
                fontSize: '14px'
            }}>
                Cargando análisis de horas pico...
            </div>
        );
    }

    // Find max value for color scaling (minimum 1 to avoid NaN division by zero)
    const maxValue = Math.max(1, ...data.flat());
    const totalBookings = data.flat().reduce((sum, v) => sum + v, 0);

    const getColor = (value) => {
        if (value === 0) return 'var(--bg-main)';
        const intensity = value / maxValue;
        const hue = 150; // Emerald / Mint green hue matching platform primary
        const saturation = 75;
        const lightness = Math.max(25, 85 - (intensity * 45)); 
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{
                    fontSize: '18px',
                    fontWeight: '700',
                    color: 'var(--text-primary)',
                    margin: 0
                }}>
                    🔥 Horas Pico y Demanda
                </h3>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600' }}>
                    {totalBookings} reservas analizadas
                </span>
            </div>

            {totalBookings === 0 ? (
                <div style={{
                    padding: '32px 16px',
                    textAlign: 'center',
                    backgroundColor: 'var(--bg-main)',
                    borderRadius: '12px',
                    border: '1px dashed var(--border)',
                    color: 'var(--text-secondary)',
                    fontSize: '13px'
                }}>
                    📊 Aún no hay suficientes reservas registradas para calcular las horas pico de tu negocio.
                </div>
            ) : (
                <>
                    <div style={{ overflowX: 'auto', paddingBottom: '8px' }}>
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: '50px repeat(24, 28px)',
                            gap: '4px',
                            minWidth: '760px'
                        }}>
                            {/* Header row - Hours */}
                            <div></div>
                            {labels.hours.map((hour, i) => (
                                <div key={i} style={{
                                    fontSize: '10px',
                                    color: 'var(--text-secondary)',
                                    textAlign: 'center',
                                    height: '24px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: i % 3 === 0 ? '700' : '400'
                                }}>
                                    {i % 2 === 0 ? i : ''}
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
                                            whileHover={{ scale: 1.25, zIndex: 10 }}
                                            title={`${labels.days[dayIndex]} ${labels.hours[hourIndex]}: ${value} reservas`}
                                            style={{
                                                backgroundColor: getColor(value),
                                                borderRadius: '4px',
                                                height: '28px',
                                                cursor: 'pointer',
                                                border: '1px solid var(--border)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: '10px',
                                                fontWeight: '700',
                                                color: value > (maxValue / 2) ? '#fff' : 'var(--text-primary)',
                                                transition: 'all 0.15s ease'
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
                        marginTop: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        gap: '8px',
                        fontSize: '11px',
                        color: 'var(--text-secondary)'
                    }}>
                        <span>Baja demanda</span>
                        <div style={{ display: 'flex', gap: '3px' }}>
                            {[0, 0.25, 0.5, 0.75, 1].map((intensity, i) => (
                                <div
                                    key={i}
                                    style={{
                                        width: '16px',
                                        height: '16px',
                                        backgroundColor: getColor(Math.round(intensity * maxValue)),
                                        borderRadius: '3px',
                                        border: '1px solid var(--border)'
                                    }}
                                />
                            ))}
                        </div>
                        <span>Alta demanda (Horas Pico)</span>
                    </div>
                </>
            )}
        </motion.div>
    );
}
