import React, { useState, useEffect, useMemo } from 'react';
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
    const [fetchedSpecialists, setFetchedSpecialists] = useState(business?.specialists || []);

    useEffect(() => {
        if (business?.specialists && business.specialists.length > 0) {
            setFetchedSpecialists(business.specialists);
        } else if (business?.id && type === 'service') {
            import('../../../services/supabaseService').then(mod => {
                mod.default.getSpecialists(business.id).then(specs => {
                    if (specs && specs.length > 0) {
                        setFetchedSpecialists(specs);
                    }
                }).catch(() => {});
            });
        }
    }, [business?.id, business?.specialists, type]);

    const effectiveBusiness = useMemo(() => {
        if (type === 'service' && fetchedSpecialists.length > 0) {
            return { ...business, specialists: fetchedSpecialists };
        }
        return business;
    }, [business, fetchedSpecialists, type]);

    const resources = getResourcesByType(effectiveBusiness, type);

    const [viewMode, setViewMode] = useState(config.defaultView);
    const [currentDate, setCurrentDate] = useState(new Date());

    // Parsear horarios del negocio (dinámico por día o global para la semana)
    const getBusinessHours = (targetDate = null) => {
        if (!business?.hours) return { start: 8, end: 23 };

        let hoursObj = business.hours;
        if (typeof hoursObj === 'string') {
            try {
                if (hoursObj.trim().startsWith('{')) {
                    hoursObj = JSON.parse(hoursObj);
                }
            } catch (e) {}
        }

        if (typeof hoursObj === 'object' && hoursObj !== null) {
            // Si se pide para un día específico (Vista Día)
            if (targetDate) {
                const dateObj = targetDate instanceof Date ? targetDate : new Date(targetDate);
                const dayIndex = dateObj.getDay();
                const daysEn = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
                const daysEs = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
                const dayKeyEn = daysEn[dayIndex];
                const dayKeyEs = daysEs[dayIndex];

                const dayConfig = hoursObj[dayKeyEn] || hoursObj[dayKeyEs] || hoursObj[dayIndex];

                if (dayConfig && dayConfig.isOpen !== false) {
                    let dayStart = null;
                    let dayEnd = null;

                    if (dayConfig.open && dayConfig.close) {
                        const s = parseInt(dayConfig.open.split(':')[0]);
                        let e = parseInt(dayConfig.close.split(':')[0]);
                        if (e < s || e === 0) e += 24;
                        dayStart = s;
                        dayEnd = e;
                    }

                    if (dayConfig.open2 && dayConfig.close2) {
                        const s2 = parseInt(dayConfig.open2.split(':')[0]);
                        let e2 = parseInt(dayConfig.close2.split(':')[0]);
                        if (e2 < s2 || e2 === 0) e2 += 24;
                        if (dayStart === null || s2 < dayStart) dayStart = s2;
                        if (dayEnd === null || e2 > dayEnd) dayEnd = e2;
                    }

                    if (dayStart !== null && dayEnd !== null) {
                        // Expandir con reservas existentes si alguna está fuera del rango
                        const targetKey = formatDateKey(dateObj);
                        (bookings || []).forEach(b => {
                            if (!b.date || !b.time) return;
                            let bKey = '';
                            if (typeof b.date === 'string' && b.date.includes('/')) {
                                const parts = b.date.split('/');
                                if (parts.length === 3) bKey = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                            } else if (typeof b.date === 'string') {
                                bKey = b.date.slice(0, 10);
                            } else if (b.date instanceof Date) {
                                bKey = formatDateKey(b.date);
                            }

                            if (bKey === targetKey) {
                                const bStart = parseInt(b.time.split(':')[0]);
                                if (!isNaN(bStart)) {
                                    if (bStart < dayStart) dayStart = bStart;
                                    if (b.end_time || b.endTime) {
                                        let bEnd = parseInt((b.end_time || b.endTime).split(':')[0]);
                                        if (bEnd < bStart || bEnd === 0) bEnd += 24;
                                        if (bEnd > dayEnd) dayEnd = bEnd;
                                    } else if (bStart + 1 > dayEnd) {
                                        dayEnd = bStart + 1;
                                    }
                                }
                            }
                        });

                        return { start: dayStart, end: dayEnd };
                    }
                }
            }

            // Global para la semana / fallback
            let minStart = 24;
            let maxEnd = 0;
            let hasValidHours = false;

            Object.values(hoursObj).forEach(dayConfig => {
                if (dayConfig && typeof dayConfig === 'object' && dayConfig.isOpen !== false) {
                    if (dayConfig.open && dayConfig.close) {
                        const startHour = parseInt(dayConfig.open.split(':')[0]);
                        let endHour = parseInt(dayConfig.close.split(':')[0]);
                        if (endHour < startHour || endHour === 0) endHour += 24;

                        if (!isNaN(startHour) && startHour < minStart) minStart = startHour;
                        if (!isNaN(endHour) && endHour > maxEnd) maxEnd = endHour;
                        hasValidHours = true;
                    }

                    if (dayConfig.open2 && dayConfig.close2) {
                        const startHour2 = parseInt(dayConfig.open2.split(':')[0]);
                        let endHour2 = parseInt(dayConfig.close2.split(':')[0]);
                        if (endHour2 < startHour2 || endHour2 === 0) endHour2 += 24;

                        if (!isNaN(startHour2) && startHour2 < minStart) minStart = startHour2;
                        if (!isNaN(endHour2) && endHour2 > maxEnd) maxEnd = endHour2;
                        hasValidHours = true;
                    }
                }
            });

            if (hasValidHours && minStart < 24 && maxEnd > 0) {
                return { start: minStart, end: maxEnd };
            }
        }

        return { start: 8, end: 23 };
    };

    const dayBusinessHours = useMemo(() => getBusinessHours(currentDate), [business?.hours, currentDate, bookings]);
    const overallBusinessHours = useMemo(() => getBusinessHours(null), [business?.hours]);

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
                const month = endDate.toLocaleDateString('es-ES', { month: 'long' });
                const capMonth = month.charAt(0).toUpperCase() + month.slice(1);
                return `${startDate.getDate()} - ${endDate.getDate()} de ${capMonth}`;
            }
            const monthStart = startDate.toLocaleDateString('es-ES', { month: 'short' });
            const monthEnd = endDate.toLocaleDateString('es-ES', { month: 'short' });
            return `${startDate.getDate()} ${monthStart} - ${endDate.getDate()} ${monthEnd}`;
        } else {
            const month = currentDate.toLocaleDateString('es-ES', { month: 'long' });
            const capMonth = month.charAt(0).toUpperCase() + month.slice(1);
            return `${capMonth} ${currentDate.getFullYear()}`;
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
            {/* Header del calendario */}
            <CalendarHeader
                title={getCalendarTitle()}
                dateRangeText={getDateRangeText()}
                viewMode={viewMode}
                setViewMode={setViewMode}
                onViewModeChange={setViewMode}
                availableViews={['day', 'week', 'month']}
                onPrevious={handlePrevious}
                onToday={handleToday}
                onNext={handleNext}
                isMobile={isMobile}
                showTitle={type !== 'service'} // Hide title for services
            />

            {/* Vista del calendario */}
            <div style={{ flex: 1, overflow: 'auto', position: 'relative' }}>
                {viewMode === 'day' && (
                    <DayView
                        type={type}
                        config={config}
                        business={business}
                        businessHours={dayBusinessHours}
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
                        businessHours={overallBusinessHours}
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
