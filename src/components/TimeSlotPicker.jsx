import React, { useEffect, useRef } from 'react';
import TimeSlotGrid from './TimeSlotGrid';
import { promoSlotStyle, promoTagStyle, shortPromoLabel } from './promotions/promoSlotStyles';
import CourtSelector from './CourtSelector';
import { getServiceSlots, getSportSlots, getCourtDurations } from '../utils/availableSlots';

const TimeSlotPicker = ({
    selectedTime,
    onTimeSelect,
    sportColor,
    type,
    resources: providedResources,
    specialists, // 🆕 Specialists qualified for the service
    openingTime,
    closingTime,
    interval = 30,
    existingBookings,
    timeRanges,
    selectedDate,
    maxCapacity,
    businessCapacity, // ✅ Total capacity of the business (fallback)
    serviceDuration, // 🆕 Duration of the service for validation
    slotPromo = null, // Promo activa: marca los horarios que entran
    minAdvanceHours = 0, // 🆕 Minimum hours of advance booking required
    bufferMinutes = 0 // 🆕 Buffer/cleaning time between bookings
}) => {
    // Use selectedTime.time directly from props
    const selectedTimeSlot = selectedTime?.time || null;
    const courtListRef = useRef(null);

    // Sports: after picking a time, bring the court list into view
    useEffect(() => {
        if (type === 'service' || !selectedTimeSlot) return;
        const timer = setTimeout(() => {
            courtListRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
        return () => clearTimeout(timer);
    }, [selectedTimeSlot, type]);

    // Same free-slot rules as the "Agenda abierta" story (utils/availableSlots)
    const slotOptions = {
        resources: providedResources,
        specialists,
        openingTime,
        closingTime,
        timeRanges,
        interval,
        existingBookings,
        selectedDate,
        businessCapacity,
        serviceDuration,
        minAdvanceHours,
        bufferMinutes
    };

    const generateUnifiedTimeSlots = () => getSportSlots(slotOptions);

    const getAvailableDurations = (courtId, startTime) => getCourtDurations(slotOptions, courtId, startTime);

    // Handle time slot selection (for sports)
    const handleTimeSlotSelect = (time) => {
        // Emit time selection to parent
        onTimeSelect(time, null);
    };

    // Handle court selection (for sports)
    const handleCourtSelect = (court) => {
        // Check if court has duration info (padel court)
        if (court.selectedDuration && court.finalPrice !== undefined) {
            // Padel court with duration selected
            onTimeSelect(selectedTimeSlot, court.id, court.selectedDuration, court.finalPrice);
        } else {
            // Regular court (football, tennis, etc.)
            onTimeSelect(selectedTimeSlot, court.id);
        }
    };

    // Get courts available for selected time slot
    const getCourtsForSelectedTime = () => {
        if (!selectedTimeSlot) return [];
        const availableSlots = generateUnifiedTimeSlots();
        const slot = availableSlots.find(s => s.time === selectedTimeSlot);
        return slot ? slot.availableCourts : [];
    };

    if (type === 'service') {
        const allSlots = getServiceSlots(slotOptions);

        // For services, show a unified view with all available slots
        return (
            <div style={{ animation: 'slideUp 0.5s ease' }}>
                <div style={{ textAlign: 'left' }}>
                    <h4 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '12px' }}>
                        Horarios disponibles
                    </h4>
                    {slotPromo && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)', margin: '-4px 0 12px' }}>
                            <span style={{ width: '10px', height: '10px', borderRadius: '3px', ...promoSlotStyle }} />
                            En verde: horarios con {slotPromo.label}
                        </div>
                    )}

                    {/* Time slots grid: 4 columns on phones, as many as fit on desktop */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(72px, 1fr))',
                        gap: '8px'
                    }}>
                        {allSlots.filter(slot => slot.status === 'available').map((slot) => {
                            const isSelected = selectedTime?.time === slot.time;
                            const inPromo = Boolean(slotPromo) && slotPromo.isValid(slot.time);
                            const restBorder = inPromo ? promoSlotStyle.border.replace('1px', '2px') : '2px solid var(--border)';
                            const restBg = inPromo ? promoSlotStyle.backgroundColor : 'var(--card-bg)';

                            return (
                                <button
                                    key={slot.time}
                                    onClick={() => onTimeSelect(slot.time, null)} // No courtId for services
                                    style={{
                                        padding: '10px 4px',
                                        borderRadius: '10px',
                                        border: isSelected ? `2px solid ${sportColor}` : restBorder,
                                        background: isSelected ? `${sportColor}15` : restBg,
                                        color: isSelected ? sportColor : 'var(--text-primary)',
                                        cursor: 'pointer',
                                        fontSize: '14px',
                                        fontWeight: isSelected ? 'bold' : '500',
                                        transition: 'all 0.2s',
                                        textAlign: 'center'
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!isSelected) {
                                            e.target.style.borderColor = sportColor;
                                            e.target.style.background = `${sportColor}08`;
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (!isSelected) {
                                            e.currentTarget.style.border = restBorder;
                                            e.currentTarget.style.background = restBg;
                                        }
                                    }}
                                >
                                    {slot.time}
                                    {inPromo && <span style={{ ...promoTagStyle, display: 'block', marginTop: '2px' }}>{shortPromoLabel(slotPromo.label)}</span>}
                                </button>
                            );
                        })}
                    </div>

                    {allSlots.filter(slot => slot.status === 'available').length === 0 && (
                        <div style={{
                            textAlign: 'center',
                            padding: '40px 20px',
                            color: 'var(--text-secondary)'
                        }}>
                            <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}>📅</div>
                            <p style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)' }}>
                                No hay horarios disponibles
                            </p>
                            <p style={{ fontSize: '14px', marginTop: '8px' }}>
                                Todos los espacios están ocupados para esta fecha.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // FOR SPORTS: Render new time-first flow
    const availableSlots = generateUnifiedTimeSlots();

    return (
        <div style={{ maxWidth: '800px', margin: '20px auto 0', animation: 'slideUp 0.5s ease' }}>
            {availableSlots.length > 0 ? (
                <>
                    {/* Time Slot Grid */}
                    <TimeSlotGrid
                        availableSlots={availableSlots}
                        selectedTimeSlot={selectedTimeSlot}
                        onTimeSlotSelect={handleTimeSlotSelect}
                        sportColor={sportColor}
                        slotPromo={slotPromo}
                    />

                    {/* Court Selector (shows when time is selected) */}
                    {selectedTimeSlot && (
                        <div ref={courtListRef} style={{ scrollMarginTop: '80px' }}>
                            <CourtSelector
                                availableCourts={getCourtsForSelectedTime()}
                                selectedCourt={selectedTime?.courtId}
                                onCourtSelect={handleCourtSelect}
                                timeSlot={selectedTimeSlot}
                                sportColor={sportColor}
                                existingBookings={existingBookings}
                                selectedDate={selectedDate}
                                closingTime={closingTime}
                                getAvailableDurations={getAvailableDurations}
                            />
                        </div>
                    )}
                </>
            ) : (
                <div className="card" style={{ padding: '40px 20px', textAlign: 'center', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px' }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.6 }}>📅</div>
                    <h4 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '8px', fontFamily: 'var(--font-title)' }}>
                        No hay horarios disponibles
                    </h4>
                    <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: 0 }}>
                        Todos los turnos de las canchas están reservados para esta fecha.
                    </p>
                </div>
            )}
        </div>
    );
}
export default TimeSlotPicker;

