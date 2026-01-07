import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function TimeSlotGrid({
    availableSlots,
    selectedTimeSlot,
    onTimeSlotSelect,
    sportColor = '#00e676'
}) {
    return (
        <div style={{ marginBottom: '24px' }}>
            <h3 style={{
                fontSize: '18px',
                fontWeight: '700',
                marginBottom: '16px',
                color: 'var(--text-primary)'
            }}>
                Horarios Disponibles
            </h3>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
                gap: '12px'
            }}>
                {availableSlots.map((slot) => {
                    const isSelected = selectedTimeSlot === slot.time;
                    const isAvailable = slot.availableCourts.length > 0;

                    return (
                        <motion.button
                            key={slot.time}
                            whileHover={isAvailable ? { scale: 1.05 } : {}}
                            whileTap={isAvailable ? { scale: 0.95 } : {}}
                            onClick={() => isAvailable && onTimeSlotSelect(slot.time)}
                            disabled={!isAvailable}
                            style={{
                                padding: '16px 12px',
                                borderRadius: '16px',
                                border: isSelected
                                    ? `2px solid ${sportColor}`
                                    : '1px solid var(--border)',
                                backgroundColor: isSelected
                                    ? `${sportColor}15`
                                    : isAvailable
                                        ? 'var(--bg-card)'
                                        : 'var(--bg-main)',
                                color: isAvailable
                                    ? 'var(--text-primary)'
                                    : 'var(--text-muted)',
                                cursor: isAvailable ? 'pointer' : 'not-allowed',
                                fontWeight: isSelected ? '700' : '600',
                                fontSize: '15px',
                                transition: 'all 0.2s',
                                opacity: isAvailable ? 1 : 0.4,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '4px',
                                boxShadow: isSelected
                                    ? `0 4px 12px ${sportColor}30`
                                    : '0 2px 8px rgba(0,0,0,0.05)'
                            }}
                        >
                            <span style={{ fontSize: '16px', fontWeight: '700' }}>
                                {slot.time}
                            </span>
                        </motion.button>
                    );
                })}
            </div>
        </div>
    );
}
