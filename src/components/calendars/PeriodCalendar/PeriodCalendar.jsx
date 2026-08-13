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
    isMobile = false
}) {
    const [viewMode, setViewMode] = useState('month');
    const [currentDate, setCurrentDate] = useState(new Date());

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

    // Texto del rango de fechas
    const getDateRangeText = () => {
        if (viewMode === 'month') {
            return currentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
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
                        onCreateBooking={onCreateBooking}
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
    );
}
