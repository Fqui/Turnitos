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
            return `${monthName} ${year}`;
        } else {
            return currentDate.getFullYear().toString();
        }
    };

    return (
        <div style={{
            background: 'var(--bg-card)',
            borderRadius: '20px',
            border: '1px solid var(--border)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
        }}>
            {/* Header */}
            <CalendarHeader
                title={business?.name || 'Alquiler'}
                dateRangeText={getDateRangeText()}
                viewMode={viewMode}
                setViewMode={setViewMode}
                availableViews={['month']} // Solo vista mensual para alquileres
                onPrevious={handlePrevious}
                onToday={handleToday}
                onNext={handleNext}
                isMobile={isMobile}
                showTitle={false}
                showLegend={true}
            />

            {/* Vista del calendario */}
            <div style={{ flex: 1, overflow: 'auto', position: 'relative', padding: '12px 16px' }}>
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
