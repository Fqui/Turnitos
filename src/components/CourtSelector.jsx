import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import DurationSelector from './DurationSelector';

export default function CourtSelector({
    availableCourts,
    selectedCourt,
    onCourtSelect,
    timeSlot,
    sportColor = '#00e676',
    existingBookings, // 🆕 Para calcular duraciones disponibles
    selectedDate, // 🆕 Para calcular duraciones disponibles
    closingTime, // 🆕 Para validar horarios de cierre
    getAvailableDurations // 🆕 Función helper del padre
}) {
    const [showDurationModal, setShowDurationModal] = useState(false);
    const [selectedCourtForDuration, setSelectedCourtForDuration] = useState(null);

    if (!availableCourts || availableCourts.length === 0) {
        return null;
    }

    const handleCourtClick = (court) => {
        // Check if it's a padel court
        if (court.sport === 'padel') {
            // Show duration selector modal
            setSelectedCourtForDuration(court);
            setShowDurationModal(true);
        } else {
            // For non-padel courts, use normal flow
            onCourtSelect(court);
        }
    };

    const handleDurationSelect = (duration, price) => {
        // Pass court selection with duration info
        onCourtSelect({
            ...selectedCourtForDuration,
            selectedDuration: duration,
            finalPrice: price
        });
        setShowDurationModal(false);
        setSelectedCourtForDuration(null);
    };

    return (
        <>
            <AnimatePresence>
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    style={{ marginBottom: '24px', overflow: 'hidden' }}
                >
                    <h4 style={{
                        fontSize: '16px',
                        fontWeight: '600',
                        marginBottom: '12px',
                        color: 'var(--text-primary)'
                    }}>
                        Canchas disponibles a las {timeSlot}
                    </h4>

                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px'
                    }}>
                        {availableCourts.map((court) => {
                            const isSelected = selectedCourt === court.id;
                            const isPadel = court.sport === 'padel';

                            return (
                                <motion.div
                                    key={court.id}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => handleCourtClick(court)}
                                    style={{
                                        padding: '16px',
                                        borderRadius: '16px',
                                        border: isSelected
                                            ? `2px solid ${sportColor}`
                                            : '1px solid var(--border)',
                                        backgroundColor: isSelected
                                            ? `${sportColor}10`
                                            : 'var(--bg-card)',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        boxShadow: isSelected
                                            ? `0 4px 12px ${sportColor}30`
                                            : '0 2px 8px rgba(0,0,0,0.05)'
                                    }}
                                >
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center'
                                    }}>
                                        <div>
                                            <div style={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                marginBottom: '4px'
                                            }}>
                                                <h5 style={{
                                                    fontSize: '16px',
                                                    fontWeight: '700',
                                                    color: 'var(--text-primary)',
                                                    margin: 0
                                                }}>
                                                    {court.name}
                                                </h5>
                                                {isPadel && (
                                                    <span style={{
                                                        fontSize: '12px',
                                                        color: sportColor,
                                                        fontWeight: '600',
                                                        marginTop: '4px'
                                                    }}>
                                                        🎾 Pádel • Duración flexible
                                                    </span>
                                                )}
                                                {!isPadel && court.price > 0 && (
                                                    <span style={{
                                                        fontSize: '14px',
                                                        color: sportColor,
                                                        fontWeight: '600',
                                                        marginTop: '2px'
                                                    }}>
                                                        ${court.price.toLocaleString()}
                                                    </span>
                                                )}
                                            </div>

                                            {court.features && court.features.length > 0 && (
                                                <div style={{
                                                    display: 'flex',
                                                    gap: '6px',
                                                    flexWrap: 'wrap',
                                                    marginTop: '8px'
                                                }}>
                                                    {court.features.map((feature, idx) => (
                                                        <span
                                                            key={idx}
                                                            style={{
                                                                fontSize: '11px',
                                                                padding: '4px 8px',
                                                                borderRadius: '8px',
                                                                backgroundColor: 'var(--bg-main)',
                                                                color: 'var(--text-secondary)',
                                                                fontWeight: '600'
                                                            }}
                                                        >
                                                            {feature}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        <div style={{
                                            width: '24px',
                                            height: '24px',
                                            borderRadius: '50%',
                                            border: `2px solid ${isSelected ? sportColor : 'var(--border)'}`,
                                            backgroundColor: isSelected ? sportColor : 'transparent',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            transition: 'all 0.2s'
                                        }}>
                                            {isSelected && (
                                                <svg
                                                    width="14"
                                                    height="14"
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    stroke="black"
                                                    strokeWidth="3"
                                                >
                                                    <polyline points="20 6 9 17 4 12" />
                                                </svg>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                </motion.div>
            </AnimatePresence>

            {/* Duration Selector Modal for Padel */}
            {showDurationModal && selectedCourtForDuration && getAvailableDurations && (
                <DurationSelector
                    court={selectedCourtForDuration}
                    timeSlot={timeSlot}
                    availableDurations={getAvailableDurations(selectedCourtForDuration.id, timeSlot)}
                    onSelectDuration={handleDurationSelect}
                    onClose={() => {
                        setShowDurationModal(false);
                        setSelectedCourtForDuration(null);
                    }}
                    sportColor={sportColor}
                />
            )}
        </>
    );
}
