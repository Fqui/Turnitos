import React, { useState } from 'react';
import SlotCalendar from './SlotCalendar/SlotCalendar';
import PeriodCalendar from './PeriodCalendar/PeriodCalendar';
import { getCalendarType, getResourcesByType } from './shared/config';

export default function CalendarWrapper({
    business,
    bookings,
    onCreateBooking,
    onBookingClick,
    onBlockSlot,
    onUnblockSlot,
    onBlockDate,
    onMoveBooking,
    isRescheduling,
    reschedulingBooking,
    onStartReschedule,
    isMobile
}) {
    const calendarType = getCalendarType(business);
    const [activeTab, setActiveTab] = useState(calendarType === 'mixed' ? 'padel' : calendarType);

    // Si es alquiler, usar PeriodCalendar
    if (calendarType === 'alquiler') {
        return (
            <PeriodCalendar
                business={business}
                bookings={bookings}
                onCreateBooking={onCreateBooking}
                onBookingClick={onBookingClick}
                onBlockDate={onBlockDate}
                isMobile={isMobile}
            />
        );
    }

    // Si es mixto (fútbol + pádel), mostrar pestañas
    if (calendarType === 'mixed') {
        const futbolResources = getResourcesByType(business, 'futbol');
        const padelResources = getResourcesByType(business, 'padel');

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
                {/* Pestañas */}
                <div style={{
                    display: 'flex',
                    gap: '4px',
                    padding: '16px 24px',
                    borderBottom: '1px solid var(--border)',
                    background: 'var(--bg-main)'
                }}>
                    <button
                        onClick={() => setActiveTab('futbol')}
                        style={{
                            flex: 1,
                            padding: '12px 24px',
                            border: 'none',
                            background: activeTab === 'futbol' ? 'var(--bg-card)' : 'transparent',
                            borderRadius: '12px',
                            cursor: 'pointer',
                            fontSize: '15px',
                            fontWeight: activeTab === 'futbol' ? '700' : '500',
                            color: activeTab === 'futbol' ? 'var(--text-primary)' : 'var(--text-secondary)',
                            boxShadow: activeTab === 'futbol' ? '0 2px 8px rgba(0,0,0,0.1)' : 'none',
                            transition: 'all 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px'
                        }}
                    >
                        <span style={{ fontSize: '20px' }}>⚽</span>
                        Fútbol ({futbolResources.length})
                    </button>

                    <button
                        onClick={() => setActiveTab('padel')}
                        style={{
                            flex: 1,
                            padding: '12px 24px',
                            border: 'none',
                            background: activeTab === 'padel' ? 'var(--bg-card)' : 'transparent',
                            borderRadius: '12px',
                            cursor: 'pointer',
                            fontSize: '15px',
                            fontWeight: activeTab === 'padel' ? '700' : '500',
                            color: activeTab === 'padel' ? 'var(--text-primary)' : 'var(--text-secondary)',
                            boxShadow: activeTab === 'padel' ? '0 2px 8px rgba(0,0,0,0.1)' : 'none',
                            transition: 'all 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px'
                        }}
                    >
                        <span style={{ fontSize: '20px' }}>🎾</span>
                        Pádel ({padelResources.length})
                    </button>
                </div>

                {/* Calendario activo */}
                <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    <SlotCalendar
                        type={activeTab}
                        business={business}
                        bookings={bookings.filter(b => {
                            if (activeTab === 'futbol') {
                                return futbolResources.some(r => r.id === b.court_id);
                            } else {
                                return padelResources.some(r => r.id === b.court_id);
                            }
                        })}
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
                </div>
            </div>
        );
    }

    // Calendario simple (fútbol, pádel o servicio)
    return (
        <SlotCalendar
            type={calendarType}
            business={business}
            bookings={bookings}
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
    );
}
