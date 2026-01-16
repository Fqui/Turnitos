import React, { useState, useMemo } from 'react';
import CalendarHeader from '../shared/CalendarHeader';
import DayView from './DayView';
import WeekView from './WeekView';
import MonthView from './MonthView';
import { getSlotConfig, getResourcesByType } from '../shared/config';
import { formatDateKey, generateWeekDays, generateMonthDays } from '../shared/utils';
import { formatLongDate } from '../../../utils/dateUtils';

export default function SlotCalendar({
    type, // 'futbol', 'padel', 'service'
    business,
    bookings,
    onCreateBooking,
    onBookingClick,
    onBlockSlot,
    onUnblockSlot,
    onMoveBooking,
    isRescheduling = false,
    reschedulingBooking = null,
    onStartReschedule,
    isMobile = false
}) {
    const config = getSlotConfig(type);
    const resources = getResourcesByType(business, type);

    const [viewMode, setViewMode] = useState(config.defaultView);
    const [currentDate, setCurrentDate] = useState(new Date());

    // Parsear horarios del negocio
    const getBusinessHours = () => {
        if (!business?.hours) return { start: 8, end: 23 };

        if (typeof business.hours === 'object') {
            let minStart = 24;
            let maxEnd = 0;
            let hasValidHours = false;

            Object.values(business.hours).forEach(dayConfig => {
                if (dayConfig.isOpen !== false && dayConfig.open && dayConfig.close) {
                    const startHour = parseInt(dayConfig.open.split(':')[0]);
                    let endHour = parseInt(dayConfig.close.split(':')[0]);

                    if (endHour < startHour) {
                        endHour += 24;
                    }

                    if (!isNaN(startHour) && startHour < minStart) minStart = startHour;
                    if (!isNaN(endHour) && endHour > maxEnd) maxEnd = endHour;
                    hasValidHours = true;
                }
            });

            if (hasValidHours && minStart < 24 && maxEnd > 0) {
                return { start: minStart, end: maxEnd };
            }

            return { start: 8, end: 23 };
        }

        if (typeof business.hours === 'string' && business.hours.includes('-')) {
            const [start, end] = business.hours.split('-').map(h => parseInt(h.split(':')[0]));
            return { start: start || 8, end: end || 23 };
        }

        return { start: 8, end: 23 };
    };

    const businessHours = getBusinessHours();

    // Generar días según vista
    const displayDays = useMemo(() => {
        if (viewMode === 'day') {
            return [new Date(currentDate)];
        } else if (viewMode === 'week') {
            return generateWeekDays(currentDate);
        } else if (viewMode === 'month') {
            return generateMonthDays(currentDate);
        }
        return [];
    }, [currentDate, viewMode]);

    // Navegación
    const handlePrevious = () => {
        const newDate = new Date(currentDate);
        if (viewMode === 'day') {
            newDate.setDate(newDate.getDate() - 1);
        } else if (viewMode === 'week') {
            newDate.setDate(newDate.getDate() - 7);
        } else if (viewMode === 'month') {
            newDate.setMonth(newDate.getMonth() - 1);
        }
        setCurrentDate(newDate);
    };

    const handleNext = () => {
        const newDate = new Date(currentDate);
        if (viewMode === 'day') {
            newDate.setDate(newDate.getDate() + 1);
        } else if (viewMode === 'week') {
            newDate.setDate(newDate.getDate() + 7);
        } else if (viewMode === 'month') {
            newDate.setMonth(newDate.getMonth() + 1);
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
        if (viewMode === 'day') {
            return formatLongDate(currentDate);
        } else if (viewMode === 'week') {
            const startDate = displayDays[0];
            const endDate = displayDays[6];

            if (startDate.getMonth() === endDate.getMonth()) {
                return `${startDate.getDate()} - ${endDate.getDate()} ${endDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}`;
            }
            return `${startDate.getDate()} ${startDate.toLocaleDateString('es-ES', { month: 'short' })} - ${endDate.getDate()} ${endDate.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' })}`;
        } else {
            return currentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
        }
    };

    // Título del calendario
    const getCalendarTitle = () => {
        if (type === 'futbol') return 'Canchas de Fútbol';
        if (type === 'padel') return 'Canchas de Pádel';
        if (type === 'service') return 'Servicios';
        return 'Calendario';
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
                title={getCalendarTitle()}
                dateRangeText={getDateRangeText()}
                viewMode={viewMode}
                setViewMode={setViewMode}
                availableViews={['day', 'week', 'month']}
                onPrevious={handlePrevious}
                onToday={handleToday}
                onNext={handleNext}
                isMobile={isMobile}
            />

            {/* Vista del calendario */}
            <div style={{ flex: 1, overflow: 'auto', position: 'relative' }}>
                {viewMode === 'day' && (
                    <DayView
                        type={type}
                        config={config}
                        business={business}
                        businessHours={businessHours}
                        resources={resources}
                        bookings={bookings}
                        currentDate={currentDate}
                        onCreateBooking={onCreateBooking}
                        onBookingClick={onBookingClick}
                        onBlockSlot={onBlockSlot}
                        onUnblockSlot={onUnblockSlot}
                        onMoveBooking={onMoveBooking}
                        isRescheduling={isRescheduling}
                        reschedulingBooking={reschedulingBooking}
                        onStartReschedule={onStartReschedule}
                        isMobile={isMobile}
                    />
                )}

                {viewMode === 'week' && (
                    <WeekView
                        type={type}
                        config={config}
                        business={business}
                        businessHours={businessHours}
                        resources={resources}
                        bookings={bookings}
                        displayDays={displayDays}
                        onCreateBooking={onCreateBooking}
                        onBookingClick={onBookingClick}
                        onBlockSlot={onBlockSlot}
                        onUnblockSlot={onUnblockSlot}
                        onMoveBooking={onMoveBooking}
                        isRescheduling={isRescheduling}
                        reschedulingBooking={reschedulingBooking}
                        onStartReschedule={onStartReschedule}
                        isMobile={isMobile}
                    />
                )}

                {viewMode === 'month' && (
                    <MonthView
                        type={type}
                        config={config}
                        business={business}
                        bookings={bookings}
                        displayDays={displayDays}
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
