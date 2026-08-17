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

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            maxWidth: '1200px',
            margin: '0 auto',
            flex: isMobile ? 'none' : 1
        }}>
            <div style={{
                background: 'var(--bg-card)',
                borderRadius: isMobile ? '16px' : '20px',
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
                <div style={{
                    padding: isMobile ? '10px 8px 16px 8px' : '14px 18px',
                    display: 'flex',
                    flexDirection: 'column',
                    width: '100%',
                    boxSizing: 'border-box'
                }}>
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
                    padding: isMobile ? 0 : '20px',
                    animation: 'fadeIn 0.2s ease-out'
                }}>
                    <div style={{
                        background: 'var(--bg-card)',
                        borderRadius: isMobile ? '24px 24px 0 0' : '20px',
                        padding: isMobile ? '24px 20px 32px 20px' : '24px',
                        width: '100%',
                        maxWidth: '420px',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
                        border: '1px solid var(--border)',
                        animation: isMobile ? 'slideUp 0.3s ease-out' : 'scaleUp 0.2s ease-out'
                    }}>
                        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                            <div style={{
                                width: '48px',
                                height: '48px',
                                borderRadius: '50%',
                                background: 'rgba(0, 230, 118, 0.1)',
                                color: 'var(--primary-paddle)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '24px',
                                margin: '0 auto 12px auto'
                            }}>
                                📅
                            </div>
                            <h3 style={{
                                margin: '0 0 6px 0',
                                fontSize: '18px',
                                fontWeight: '800',
                                color: 'var(--text-primary)'
                            }}>
                                {selectedFreeDay.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                            </h3>
                            <p style={{
                                margin: 0,
                                fontSize: '13px',
                                color: 'var(--text-secondary)'
                            }}>
                                Esta fecha está libre. ¿Qué deseas hacer?
                            </p>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <button
                                onClick={() => {
                                    const day = selectedFreeDay;
                                    setSelectedFreeDay(null);
                                    onCreateBooking && onCreateBooking(day);
                                }}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '10px',
                                    padding: '14px',
                                    borderRadius: '12px',
                                    border: 'none',
                                    background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))',
                                    color: '#FFFFFF',
                                    fontSize: '15px',
                                    fontWeight: '700',
                                    cursor: 'pointer',
                                    boxShadow: 'var(--shadow-primary)',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <span>➕</span> Crear Reserva Manual
                            </button>

                            <button
                                onClick={() => {
                                    const day = selectedFreeDay;
                                    setSelectedFreeDay(null);
                                    const dateKey = formatDateKey(day);
                                    onBlockDate && onBlockDate(dateKey);
                                }}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '10px',
                                    padding: '14px',
                                    borderRadius: '12px',
                                    border: '1px solid rgba(239, 68, 68, 0.3)',
                                    background: 'rgba(239, 68, 68, 0.08)',
                                    color: '#EF4444',
                                    fontSize: '15px',
                                    fontWeight: '700',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <span>🔒</span> Bloquear Fecha
                            </button>

                            <button
                                onClick={() => setSelectedFreeDay(null)}
                                style={{
                                    padding: '12px',
                                    borderRadius: '12px',
                                    border: '1px solid var(--border)',
                                    background: 'var(--bg-main)',
                                    color: 'var(--text-secondary)',
                                    fontSize: '14px',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    marginTop: '4px'
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
