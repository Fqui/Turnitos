import React, { useState, useMemo } from 'react';

export default function DashboardCalendar({ bookings, business, onBlockSlot }) {
    const [currentWeekStart, setCurrentWeekStart] = useState(new Date());

    // Generate days of the week
    const weekDays = useMemo(() => {
        const days = [];
        // Start from currentWeekStart (which defaults to today)
        const start = new Date(currentWeekStart);

        // Show next 7 days starting from currentWeekStart
        for (let i = 0; i < 7; i++) {
            const d = new Date(start);
            d.setDate(start.getDate() + i);
            days.push(d);
        }
        return days;
    }, [currentWeekStart]);

    // Generate time slots (e.g., 08:00 to 23:00)
    const timeSlots = useMemo(() => {
        const slots = [];
        for (let i = 8; i <= 23; i++) {
            slots.push(`${i.toString().padStart(2, '0')}:00`);
            slots.push(`${i.toString().padStart(2, '0')}:30`);
        }
        return slots;
    }, []);

    const getBookingForSlot = (date, time) => {
        const dateStr = date.toLocaleDateString();

        return bookings.find(b => {
            // Check if cancelled
            if (b.status === 'cancelled') return false;

            // Check time
            if (b.time !== time) return false;

            // Check date
            // Handle YYYY-MM-DD (Supabase format)
            if (typeof b.date === 'string' && b.date.includes('-')) {
                const parts = b.date.split('-');
                if (parts.length === 3) {
                    const bYear = parseInt(parts[0], 10);
                    const bMonth = parseInt(parts[1], 10);
                    const bDay = parseInt(parts[2], 10);

                    const dDay = date.getDate();
                    const dMonth = date.getMonth() + 1;
                    const dYear = date.getFullYear();

                    return bDay === dDay && bMonth === dMonth && bYear === dYear;
                }
            }

            // Robust comparison for DD/MM/YYYY format (Legacy/Mock)
            if (typeof b.date === 'string' && b.date.includes('/')) {
                const parts = b.date.split('/');
                if (parts.length === 3) {
                    const bDay = parseInt(parts[0], 10);
                    const bMonth = parseInt(parts[1], 10);
                    const bYear = parseInt(parts[2], 10);

                    const dDay = date.getDate();
                    const dMonth = date.getMonth() + 1;
                    const dYear = date.getFullYear();

                    return bDay === dDay && bMonth === dMonth && bYear === dYear;
                }
            }

            // Fallback for other formats
            return b.date === date.toLocaleDateString('es-ES');
        });
    };

    const handlePrevWeek = () => {
        const newDate = new Date(currentWeekStart);
        newDate.setDate(newDate.getDate() - 7);
        setCurrentWeekStart(newDate);
    };

    const handleNextWeek = () => {
        const newDate = new Date(currentWeekStart);
        newDate.setDate(newDate.getDate() + 7);
        setCurrentWeekStart(newDate);
    };

    const getBookingLabel = (booking) => {
        if (booking.service_id && booking.services?.name) return booking.services.name;
        if (booking.court_id && booking.courts?.name) return booking.courts.name;
        return booking.service || 'Reserva';
    };

    return (
        <div style={{
            background: 'var(--bg-card)',
            borderRadius: '16px',
            border: '1px solid var(--border)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            height: '600px'
        }}>
            {/* Header */}
            <div style={{
                padding: '16px',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <h3 style={{ margin: 0, fontSize: '18px' }}>Calendario Semanal</h3>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button onClick={handlePrevWeek} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '8px', padding: '4px 12px', cursor: 'pointer', color: 'var(--text-primary)' }}>←</button>
                    <span style={{ fontWeight: 'bold', minWidth: '100px', textAlign: 'center' }}>
                        {weekDays[0].getDate()} - {weekDays[6].getDate()} {weekDays[6].toLocaleString('default', { month: 'short' })}
                    </span>
                    <button onClick={handleNextWeek} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '8px', padding: '4px 12px', cursor: 'pointer', color: 'var(--text-primary)' }}>→</button>
                </div>
            </div>

            {/* Calendar Grid */}
            <div style={{ flex: 1, overflow: 'auto', position: 'relative' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '60px repeat(7, 1fr)', minWidth: '800px' }}>
                    {/* Header Row */}
                    <div style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--bg-card)', borderBottom: '1px solid var(--border)' }}></div>
                    {weekDays.map((day, i) => (
                        <div key={i} style={{
                            padding: '12px',
                            textAlign: 'center',
                            borderBottom: '1px solid var(--border)',
                            borderLeft: '1px solid var(--border)',
                            position: 'sticky',
                            top: 0,
                            zIndex: 10,
                            background: 'var(--bg-card)',
                            fontWeight: 'bold',
                            color: day.toDateString() === new Date().toDateString() ? 'var(--primary)' : 'var(--text-primary)'
                        }}>
                            <div style={{ fontSize: '14px' }}>{day.toLocaleDateString('es-ES', { weekday: 'short' }).toUpperCase()}</div>
                            <div style={{ fontSize: '20px' }}>{day.getDate()}</div>
                        </div>
                    ))}

                    {/* Time Slots */}
                    {timeSlots.map((time, i) => (
                        <React.Fragment key={time}>
                            {/* Time Column */}
                            <div style={{
                                padding: '8px',
                                textAlign: 'center',
                                fontSize: '12px',
                                color: 'var(--text-secondary)',
                                borderBottom: '1px solid var(--border)',
                                position: 'sticky',
                                left: 0,
                                background: 'var(--bg-card)',
                                zIndex: 5
                            }}>
                                {time}
                            </div>

                            {/* Day Columns */}
                            {weekDays.map((day, j) => {
                                const booking = getBookingForSlot(day, time);
                                return (
                                    <div
                                        key={`${day}-${time}`}
                                        style={{
                                            borderBottom: '1px solid var(--border)',
                                            borderLeft: '1px solid var(--border)',
                                            height: '50px',
                                            padding: '4px',
                                            position: 'relative'
                                        }}
                                        onClick={() => !booking && onBlockSlot(day, time)}
                                    >
                                        {booking ? (
                                            <div style={{
                                                background: booking.status === 'blocked' ? '#424242' : (getBookingLabel(booking).includes('Padel') ? '#00E676' : '#2979FF'),
                                                color: '#fff',
                                                height: '100%',
                                                borderRadius: '6px',
                                                padding: '4px',
                                                fontSize: '11px',
                                                overflow: 'hidden',
                                                cursor: 'pointer',
                                                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                            }}
                                                title={`${booking.customerName} - ${getBookingLabel(booking)}`}
                                            >
                                                <strong>{booking.status === 'blocked' ? 'BLOQUEADO' : booking.customerName}</strong>
                                                <div style={{ opacity: 0.9 }}>{getBookingLabel(booking)}</div>
                                            </div>
                                        ) : (
                                            <div style={{
                                                height: '100%',
                                                width: '100%',
                                                opacity: 0,
                                                cursor: 'cell',
                                                transition: 'opacity 0.2s'
                                            }}
                                                className="slot-hover"
                                            >
                                                +
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </React.Fragment>
                    ))}
                </div>
            </div>
            <style>{`
                .slot-hover:hover {
                    opacity: 1 !important;
                    background: rgba(0,0,0,0.05);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: bold;
                    color: var(--text-secondary);
                }
            `}</style>
        </div>
    );
}
