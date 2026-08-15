import React from 'react';
import DayCell from './DayCell';
import { generateMonthDays, formatDateKey } from '../shared/utils';

export default function MonthView({
    business,
    bookings,
    currentDate,
    onCreateBooking,
    onBookingClick,
    isMobile
}) {
    const displayDays = generateMonthDays(currentDate);
    const blockedDatesList = [
        ...(business?.blocked_dates || []),
        ...(business?.metadata?.blocked_dates || [])
    ];

    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: '6px',
            maxWidth: '1200px',
            margin: '0 auto'
        }}>
            {/* Day Names Header */}
            {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(day => (
                <div key={day} style={{
                    padding: '6px',
                    textAlign: 'center',
                    fontSize: '11px',
                    fontWeight: '700',
                    color: 'var(--text-secondary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                }}>
                    {day}
                </div>
            ))}

            {/* Month Days */}
            {displayDays.map((day, i) => {
                const dateKey = formatDateKey(day);

                // Encontrar reservas para este día
                const dayBookings = bookings.filter(b => {
                    let bDateKey = b.date;
                    if (b.date.includes('/')) {
                        const [d, m, y] = b.date.split('/');
                        bDateKey = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
                    }
                    return bDateKey === dateKey && b.status !== 'cancelled';
                });

                // Verificar si esta fecha está bloqueada en la configuración del negocio
                const blockedItem = blockedDatesList.find(b => {
                    const bDateStr = typeof b === 'string' ? b : (b?.date || '');
                    let normalized = bDateStr;
                    if (typeof bDateStr === 'string' && bDateStr.includes('/')) {
                        const [d, m, y] = bDateStr.split('/');
                        normalized = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
                    }
                    return normalized === dateKey;
                });

                let finalDayBookings = [...dayBookings];
                if (blockedItem && finalDayBookings.length === 0) {
                    const reason = typeof blockedItem === 'object' && blockedItem.reason
                        ? blockedItem.reason
                        : 'Bloqueado';
                    finalDayBookings.push({
                        id: `blocked-${dateKey}`,
                        date: dateKey,
                        customer_name: reason,
                        customerName: reason,
                        status: 'blocked',
                        is_blocked: true
                    });
                }

                // Verificar si hay reservas que cruzan días (empiezan antes o terminan después)
                const crossDayBookings = bookings.filter(b => {
                    if (!b.metadata?.crossDay) return false;

                    let bDateKey = b.date;
                    if (b.date.includes('/')) {
                        const [d, m, y] = b.date.split('/');
                        bDateKey = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
                    }

                    // Si la reserva empieza este día pero termina después
                    if (bDateKey === dateKey && b.metadata.endDate && b.metadata.endDate !== dateKey) {
                        return true;
                    }

                    // Si la reserva termina este día pero empezó antes
                    if (b.metadata.endDate === dateKey && bDateKey !== dateKey) {
                        return true;
                    }

                    return false;
                });

                const isCurrentMonth = day.getMonth() === currentDate.getMonth();

                return (
                    <DayCell
                        key={i}
                        day={day}
                        bookings={finalDayBookings}
                        crossDayBookings={crossDayBookings}
                        isCurrentMonth={isCurrentMonth}
                        onCreateBooking={() => onCreateBooking(day)}
                        onBookingClick={onBookingClick}
                        isMobile={isMobile}
                    />
                );
            })}
        </div>
    );
}
