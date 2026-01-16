import React from 'react';
import { formatDateKey } from '../shared/utils';

export default function YearView({
    business,
    bookings,
    currentDate,
    setCurrentDate,
    setViewMode,
    isMobile
}) {
    const year = currentDate.getFullYear();
    const months = Array.from({ length: 12 }, (_, i) => new Date(year, i, 1));

    const getMonthBookings = (month) => {
        return bookings.filter(b => {
            let bDateKey = b.date;
            if (b.date.includes('/')) {
                const [d, m, y] = b.date.split('/');
                bDateKey = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
            }

            const bookingDate = new Date(bDateKey);
            return bookingDate.getMonth() === month.getMonth() &&
                bookingDate.getFullYear() === month.getFullYear() &&
                b.status !== 'cancelled';
        });
    };

    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
            gap: '20px',
            maxWidth: '1400px',
            margin: '0 auto'
        }}>
            {months.map((month, i) => {
                const monthBookings = getMonthBookings(month);
                const daysInMonth = new Date(year, month.getMonth() + 1, 0).getDate();
                const bookedDays = monthBookings.length;
                const availableDays = daysInMonth - bookedDays;

                return (
                    <div
                        key={i}
                        onClick={() => {
                            setCurrentDate(month);
                            setViewMode('month');
                        }}
                        style={{
                            background: 'var(--bg-card)',
                            border: '2px solid var(--border)',
                            borderRadius: '16px',
                            padding: '20px',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-4px)';
                            e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.1)';
                            e.currentTarget.style.borderColor = 'var(--primary-paddle)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = 'none';
                            e.currentTarget.style.borderColor = 'var(--border)';
                        }}
                    >
                        {/* Nombre del mes */}
                        <div style={{
                            fontSize: '18px',
                            fontWeight: '700',
                            color: 'var(--text-primary)',
                            textAlign: 'center',
                            textTransform: 'capitalize'
                        }}>
                            {month.toLocaleDateString('es-ES', { month: 'long' })}
                        </div>

                        {/* Estadísticas */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-around',
                            gap: '8px'
                        }}>
                            {/* Disponibles */}
                            <div style={{
                                flex: 1,
                                background: '#D1FAE5',
                                borderRadius: '12px',
                                padding: '12px',
                                textAlign: 'center'
                            }}>
                                <div style={{
                                    fontSize: '24px',
                                    fontWeight: '800',
                                    color: '#059669'
                                }}>
                                    {availableDays}
                                </div>
                                <div style={{
                                    fontSize: '11px',
                                    fontWeight: '600',
                                    color: '#047857',
                                    marginTop: '4px'
                                }}>
                                    Disponibles
                                </div>
                            </div>

                            {/* Reservados */}
                            <div style={{
                                flex: 1,
                                background: '#FEE2E2',
                                borderRadius: '12px',
                                padding: '12px',
                                textAlign: 'center'
                            }}>
                                <div style={{
                                    fontSize: '24px',
                                    fontWeight: '800',
                                    color: '#DC2626'
                                }}>
                                    {bookedDays}
                                </div>
                                <div style={{
                                    fontSize: '11px',
                                    fontWeight: '600',
                                    color: '#991B1B',
                                    marginTop: '4px'
                                }}>
                                    Reservados
                                </div>
                            </div>
                        </div>

                        {/* Barra de progreso */}
                        <div style={{
                            width: '100%',
                            height: '8px',
                            background: '#E5E7EB',
                            borderRadius: '4px',
                            overflow: 'hidden'
                        }}>
                            <div style={{
                                width: `${(bookedDays / daysInMonth) * 100}%`,
                                height: '100%',
                                background: '#DC2626',
                                transition: 'width 0.3s'
                            }} />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
