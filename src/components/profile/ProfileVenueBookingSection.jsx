import React from 'react';
import AmenityIcon from '../common/AmenityIcon';

export default function ProfileVenueBookingSection({
    business,
    selectedDate,
    selectedTime,
    setSelectedTime,
    selectedDuration,
    setSelectedDuration,
    selectedAdditionalServices,
    setSelectedAdditionalServices,
    existingBookings,
    getBusinessHours,
    primaryColor
}) {
    return (
        <>
            {/* Step 2: Time & Duration */}
            <section style={{ marginBottom: '30px', animation: 'slideUp 0.4s ease' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px', color: 'var(--text-primary)' }}>
                    2. {business.pricing_model === 'daily' ? 'Disponibilidad y Tarifa' : 'Horario y Duración'}
                </h3>
                <div style={{ backgroundColor: 'var(--bg-card)', padding: '20px', borderRadius: '20px', border: '1px solid var(--border)' }}>
                    {business.pricing_model === 'daily' ? (
                        // === DAILY PRICING LOGIC ===
                        <div>
                            {(() => {
                                const dateStr = selectedDate instanceof Date
                                    ? `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`
                                    : selectedDate;

                                const isDayBlocked = existingBookings?.some(booking => {
                                    const bookingStatus = booking.status?.toLowerCase() || '';
                                    const blockedStatuses = ['confirmed', 'blocked', 'deposit', 'pending', 'completed'];
                                    return booking.date === dateStr && (blockedStatuses.includes(bookingStatus) || bookingStatus !== 'cancelled');
                                });

                                if (isDayBlocked) {
                                    return (
                                        <div style={{ textAlign: 'center', padding: '20px', color: '#ef4444' }}>
                                            <div style={{ fontSize: '24px', marginBottom: '8px' }}>📅❌</div>
                                            <div style={{ fontWeight: '700' }}>Fecha No Disponible</div>
                                            <div style={{ fontSize: '14px' }}>Ya existe una reserva confirmada para este día.</div>
                                        </div>
                                    );
                                }

                                const isSelected = selectedTime?.time === '12:00' && selectedTime?.price === parseFloat(business.price_per_day);

                                return (
                                    <div
                                        onClick={() => {
                                            setSelectedTime({
                                                time: '12:00', // Dummy time for daily bookings
                                                price: parseFloat(business.price_per_day) || 0,
                                                duration: 24,
                                                rentalType: 'daily'
                                            });
                                            setSelectedDuration(24);
                                        }}
                                        style={{
                                            padding: '20px',
                                            borderRadius: '16px',
                                            border: isSelected ? `2px solid ${primaryColor}` : '2px solid var(--border)',
                                            background: isSelected ? `${primaryColor}10` : 'var(--bg-main)',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        <div>
                                            <div style={{ fontWeight: '800', fontSize: '18px', color: 'var(--text-primary)', marginBottom: '4px' }}>
                                                Alquiler Diario Completo
                                            </div>
                                            <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                                                Incluye acceso exclusivo por todo el día
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontSize: '20px', fontWeight: '800', color: primaryColor }}>
                                                ${parseFloat(business.price_per_day || 0).toLocaleString()}
                                            </div>
                                            {isSelected && (
                                                <div style={{ fontSize: '12px', fontWeight: '700', color: primaryColor, marginTop: '4px' }}>
                                                    ✓ Seleccionado
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                    ) : (
                        // === HOURLY PRICING LOGIC ===
                        <>
                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: 'var(--text-secondary)' }}>Hora de Inicio</label>
                                <select
                                    value={selectedTime?.time || ''}
                                    onChange={(e) => {
                                        const time = e.target.value;
                                        const price = (business.price_per_hour || 0) * (selectedDuration || 0);
                                        setSelectedTime({ time, price });
                                    }}
                                    style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-main)', color: 'var(--text-primary)' }}
                                >
                                    <option value="">Seleccionar hora...</option>
                                    {(() => {
                                        const { open, close, ranges } = getBusinessHours(selectedDate);
                                        const slots = [];

                                        const addSlots = (startStr, endStr) => {
                                            const start = parseInt(startStr.split(':')[0]);
                                            const end = endStr === '00:00' ? 24 : parseInt(endStr.split(':')[0]);

                                            for (let i = start; i < end; i++) {
                                                const isBooked = existingBookings?.some(booking => {
                                                    const bookingStatus = booking.status?.toLowerCase() || '';
                                                    const blockedStatuses = ['confirmed', 'blocked', 'deposit', 'pending', 'completed'];

                                                    if (!blockedStatuses.includes(bookingStatus) && bookingStatus === 'cancelled') return false;

                                                    const bookingStartHour = parseInt(booking.time.split(':')[0]);
                                                    const bookingDuration = booking.duration || 1;
                                                    const bookingEndHour = bookingStartHour + bookingDuration;

                                                    return i >= bookingStartHour && i < bookingEndHour && booking.date === dateStr;
                                                });

                                                if (!isBooked) {
                                                    slots.push(i);
                                                }
                                            }
                                        };

                                        const dateStr = selectedDate instanceof Date
                                            ? `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`
                                            : selectedDate;

                                        if (ranges && ranges.length > 0) {
                                            ranges.forEach(range => {
                                                addSlots(range.open, range.close);
                                            });
                                        } else {
                                            addSlots(open, close);
                                        }

                                        if (slots.length === 0) {
                                            return <option value="" disabled>No hay horarios disponibles</option>;
                                        }

                                        const uniqueSlots = [...new Set(slots)].sort((a, b) => a - b);

                                        return uniqueSlots.map(hour => (
                                            <option key={hour} value={`${hour}:00`}>{`${hour}:00`}</option>
                                        ));
                                    })()}
                                </select>
                            </div>

                            {business.rental_duration_options && (
                                <div>
                                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: 'var(--text-secondary)' }}>Duración</label>
                                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                        {business.rental_duration_options.map(hours => (
                                            <button
                                                key={hours}
                                                onClick={() => {
                                                    setSelectedDuration(hours);
                                                    if (selectedTime?.time) {
                                                        const price = (business.price_per_hour || 0) * hours;
                                                        setSelectedTime({ ...selectedTime, price });
                                                    }
                                                }}
                                                style={{
                                                    padding: '10px 20px',
                                                    borderRadius: '12px',
                                                    border: selectedDuration === hours ? `2px solid ${primaryColor}` : '1px solid var(--border)',
                                                    backgroundColor: selectedDuration === hours ? `${primaryColor}20` : 'transparent',
                                                    color: selectedDuration === hours ? primaryColor : 'var(--text-primary)',
                                                    cursor: 'pointer',
                                                    fontWeight: '600'
                                                }}
                                            >
                                                {hours} hs
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </section>

            {/* Step 3: Additional Services */}
            {business.additional_services && business.additional_services.length > 0 && (
                <section style={{ marginBottom: '30px', animation: 'slideUp 0.4s ease' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px', color: 'var(--text-primary)' }}>
                        3. Servicios Adicionales (Opcional)
                    </h3>
                    <div style={{ display: 'grid', gap: '12px' }}>
                        {business.additional_services.map((service, index) => (
                            <div
                                key={index}
                                onClick={() => {
                                    const isSelected = selectedAdditionalServices.some(s => s.name === service.name);
                                    if (isSelected) {
                                        setSelectedAdditionalServices(selectedAdditionalServices.filter(s => s.name !== service.name));
                                    } else {
                                        setSelectedAdditionalServices([...selectedAdditionalServices, service]);
                                    }
                                }}
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '16px',
                                    borderRadius: '12px',
                                    border: selectedAdditionalServices.some(s => s.name === service.name) ? `2px solid ${primaryColor}` : '1px solid var(--border)',
                                    backgroundColor: selectedAdditionalServices.some(s => s.name === service.name) ? `${primaryColor}10` : 'var(--bg-card)',
                                    cursor: 'pointer'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{
                                        width: '36px',
                                        height: '36px',
                                        borderRadius: '8px',
                                        background: 'rgba(132, 204, 22, 0.1)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: primaryColor,
                                        flexShrink: 0
                                    }}>
                                        <AmenityIcon icon={service.icon || 'Sparkles'} preferEmoji size={22} />
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{service.name}</div>
                                        <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>+ ${service.price}</div>
                                    </div>
                                </div>
                                <div style={{
                                    width: '24px',
                                    height: '24px',
                                    borderRadius: '50%',
                                    border: `2px solid ${selectedAdditionalServices.some(s => s.name === service.name) ? primaryColor : 'var(--border)'}`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    {selectedAdditionalServices.some(s => s.name === service.name) && <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: primaryColor }} />}
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}
        </>
    );
}
