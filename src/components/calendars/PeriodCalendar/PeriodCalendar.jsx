import React, { useState, useMemo } from 'react';
import CalendarHeader from '../shared/CalendarHeader';
import MonthView from './MonthView';
import YearView from './YearView';
import { formatDateKey } from '../shared/utils';

export default function PeriodCalendar({
    business,
    bookings,
    onCreateBooking,
    onBookingClick,
    onBlockDate,
    isMobile = false
}) {
    const [viewMode, setViewMode] = useState('month');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedFreeDay, setSelectedFreeDay] = useState(null);

    // Navegación
    const handlePrevious = () => {
        const newDate = new Date(currentDate);
        if (viewMode === 'month') {
            newDate.setMonth(newDate.getMonth() - 1);
        } else if (viewMode === 'year') {
            newDate.setFullYear(newDate.getFullYear() - 1);
        }
        setCurrentDate(newDate);
    };

    const handleNext = () => {
        const newDate = new Date(currentDate);
        if (viewMode === 'month') {
            newDate.setMonth(newDate.getMonth() + 1);
        } else if (viewMode === 'year') {
            newDate.setFullYear(newDate.getFullYear() + 1);
        }
        setCurrentDate(newDate);
    };

    const handleToday = () => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        setCurrentDate(d);
    };

    // Texto del rango de fechas (ej: Agosto 2026)
    const getDateRangeText = () => {
        if (viewMode === 'month') {
            const monthName = currentDate.toLocaleDateString('es-ES', { month: 'long' });
            const year = currentDate.getFullYear();
            return `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${year}`;
        } else {
            return currentDate.getFullYear().toString();
        }
    };

    // Reservas del mes actual para la lista rápida en móvil
    const currentMonthBookings = useMemo(() => {
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth() + 1;
        return bookings.filter(b => {
            if (!b.date || b.status === 'cancelled') return false;
            let [y, m, d] = [null, null, null];
            if (b.date.includes('-')) {
                [y, m, d] = b.date.split('-');
            } else if (b.date.includes('/')) {
                [d, m, y] = b.date.split('/');
            }
            return parseInt(y) === currentYear && parseInt(m) === currentMonth;
        }).sort((a, b) => {
            const dateA = a.date.includes('/') ? a.date.split('/').reverse().join('-') : a.date;
            const dateB = b.date.includes('/') ? b.date.split('/').reverse().join('-') : b.date;
            return dateA.localeCompare(dateB);
        });
    }, [bookings, currentDate]);

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: isMobile ? '16px' : '0px',
            flex: isMobile ? 'none' : 1,
            width: '100%'
        }}>
            <div style={{
                background: 'var(--bg-card)',
                borderRadius: '20px',
                border: '1px solid var(--border)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
            }}>
                {/* Header */}
                <CalendarHeader
                    title={business?.name || 'Alquiler'}
                    dateRangeText={getDateRangeText()}
                    viewMode={viewMode}
                    setViewMode={setViewMode}
                    availableViews={['month']}
                    onPrevious={handlePrevious}
                    onToday={handleToday}
                    onNext={handleNext}
                    isMobile={isMobile}
                    showTitle={false}
                    showLegend={true}
                />

                {/* Vista del calendario */}
                <div style={{ padding: isMobile ? '8px 10px 12px 10px' : '12px 16px' }}>
                    {viewMode === 'month' && (
                        <MonthView
                            business={business}
                            bookings={bookings}
                            currentDate={currentDate}
                            onCreateBooking={(day) => setSelectedFreeDay(day)}
                            onBookingClick={onBookingClick}
                            isMobile={isMobile}
                        />
                    )}

                    {viewMode === 'year' && (
                        <YearView
                            business={business}
                            bookings={bookings}
                            currentDate={currentDate}
                            setCurrentDate={setCurrentDate}
                            setViewMode={setViewMode}
                            isMobile={isMobile}
                        />
                    )}
                </div>
            </div>

            {/* Eventos del Mes en Mobile */}
            {isMobile && (
                <div style={{
                    background: 'var(--bg-card)',
                    borderRadius: '16px',
                    border: '1px solid var(--border)',
                    padding: '16px',
                    boxShadow: 'var(--shadow-sm)'
                }}>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '12px'
                    }}>
                        <h3 style={{
                            fontSize: '14px',
                            fontWeight: '800',
                            color: 'var(--text-primary)',
                            margin: 0,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}>
                            <span>📋</span> Eventos de {getDateRangeText()}
                        </h3>
                        <span style={{
                            fontSize: '11px',
                            fontWeight: '700',
                            background: 'var(--primary-bg)',
                            color: 'var(--primary)',
                            padding: '2px 8px',
                            borderRadius: '10px'
                        }}>
                            {currentMonthBookings.length} {currentMonthBookings.length === 1 ? 'evento' : 'eventos'}
                        </span>
                    </div>

                    {currentMonthBookings.length === 0 ? (
                        <div style={{
                            textAlign: 'center',
                            padding: '18px 12px',
                            color: 'var(--text-muted)',
                            fontSize: '13px'
                        }}>
                            ✨ No hay reservas agendadas para este mes.
                            <div style={{ fontSize: '11px', marginTop: '4px', opacity: 0.8 }}>
                                Tocá cualquier día libre arriba para reservar o bloquear.
                            </div>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {currentMonthBookings.map((b, idx) => {
                                const statusConfig = {
                                    pending: { bg: '#FEF3C7', color: '#D97706', label: 'Pendiente' },
                                    deposit_paid: { bg: '#FEF3C7', color: '#D97706', label: 'Señado' },
                                    confirmed: { bg: '#D1FAE5', color: '#059669', label: 'Confirmado' },
                                    completed: { bg: '#DBEAFE', color: '#2563EB', label: 'Finalizado' },
                                    attended: { bg: '#DBEAFE', color: '#2563EB', label: 'Asistido' },
                                    blocked: { bg: '#F3F4F6', color: '#374151', label: 'Bloqueado' }
                                }[b.status] || { bg: '#F3F4F6', color: '#6B7280', label: b.status };

                                return (
                                    <div
                                        key={b.id || idx}
                                        onClick={() => onBookingClick && onBookingClick(b)}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            padding: '10px 12px',
                                            borderRadius: '12px',
                                            background: 'var(--bg-main)',
                                            border: '1px solid var(--border)',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <div style={{
                                                fontSize: '12px',
                                                fontWeight: '800',
                                                color: 'var(--text-primary)',
                                                background: 'var(--bg-card)',
                                                padding: '4px 8px',
                                                borderRadius: '8px',
                                                border: '1px solid var(--border)',
                                                textAlign: 'center',
                                                minWidth: '55px'
                                            }}>
                                                {b.date}
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>
                                                    {b.customer_name || b.customerName || 'Cliente'}
                                                </div>
                                                {(b.start_time || b.startTime) && (
                                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                                        ⏰ {b.start_time || b.startTime} {b.end_time ? `- ${b.end_time}` : ''}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <span style={{
                                            fontSize: '10px',
                                            fontWeight: '800',
                                            padding: '3px 8px',
                                            borderRadius: '8px',
                                            background: statusConfig.bg,
                                            color: statusConfig.color
                                        }}>
                                            {statusConfig.label}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Modal de Acción para Fecha Libre: Reservar o Bloquear */}
            {selectedFreeDay && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0,0,0,0.6)',
                    display: 'flex',
                    alignItems: isMobile ? 'flex-end' : 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                    backdropFilter: 'blur(6px)',
                    padding: isMobile ? '0' : '16px'
                }} onClick={() => setSelectedFreeDay(null)}>
                    <div style={{
                        background: 'var(--bg-card)',
                        padding: isMobile ? '24px 20px 32px' : '28px 32px',
                        borderRadius: isMobile ? '24px 24px 0 0' : '20px',
                        width: '100%',
                        maxWidth: isMobile ? '100%' : '420px',
                        boxShadow: '0 24px 70px rgba(0,0,0,0.35)',
                        border: '1px solid var(--border)',
                        textAlign: 'center',
                        fontFamily: 'var(--font-sans, "Plus Jakarta Sans", system-ui, sans-serif)'
                    }} onClick={e => e.stopPropagation()}>
                        <div style={{
                            width: '52px',
                            height: '52px',
                            borderRadius: '14px',
                            background: 'rgba(0, 230, 118, 0.12)',
                            border: '1px solid rgba(0, 230, 118, 0.3)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '26px',
                            margin: '0 auto 14px'
                        }}>
                            📅
                        </div>

                        <h3 style={{
                            margin: '0 0 6px 0',
                            fontSize: '18px',
                            fontWeight: '800',
                            color: 'var(--text-primary)',
                            textTransform: 'capitalize'
                        }}>
                            {selectedFreeDay.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                        </h3>

                        <p style={{
                            fontSize: '13px',
                            color: 'var(--text-secondary)',
                            margin: '0 0 20px 0'
                        }}>
                            ¿Qué acción deseas realizar en esta fecha disponible?
                        </p>

                        <div style={{ display: 'grid', gap: '10px' }}>
                            <button
                                type="button"
                                onClick={() => {
                                    const dayObj = selectedFreeDay;
                                    setSelectedFreeDay(null);
                                    onCreateBooking && onCreateBooking(dayObj);
                                }}
                                style={{
                                    padding: '14px 18px',
                                    borderRadius: '12px',
                                    border: 'none',
                                    background: 'var(--primary-paddle)',
                                    color: 'white',
                                    fontSize: '14px',
                                    fontWeight: '700',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    boxShadow: '0 4px 14px rgba(0, 230, 118, 0.25)',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <span>➕</span> Crear Reserva
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    const dayObj = selectedFreeDay;
                                    setSelectedFreeDay(null);
                                    const dateKey = formatDateKey(dayObj);
                                    if (onBlockDate) {
                                        onBlockDate(dateKey);
                                    }
                                }}
                                style={{
                                    padding: '14px 18px',
                                    borderRadius: '12px',
                                    border: '1px solid var(--border)',
                                    background: 'var(--bg-main)',
                                    color: 'var(--text-primary)',
                                    fontSize: '14px',
                                    fontWeight: '700',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <span>🔒</span> Bloquear Fecha
                            </button>

                            <button
                                type="button"
                                onClick={() => setSelectedFreeDay(null)}
                                style={{
                                    padding: '10px',
                                    borderRadius: '10px',
                                    border: 'none',
                                    background: 'transparent',
                                    color: 'var(--text-muted, #9CA3AF)',
                                    fontSize: '13px',
                                    fontWeight: '600',
                                    cursor: 'pointer'
                                }}
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
