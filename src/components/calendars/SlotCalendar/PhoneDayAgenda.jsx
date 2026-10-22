import React, { useCallback, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, CalendarDays } from 'lucide-react';
import SlotActionMenu from '../shared/SlotActionMenu';
import PickerShell from '../../common/controls/PickerShell';
import { MonthGrid } from '../../common/controls/DatePicker';
import {
    generateTimeSlots,
    formatDateKey,
    getDayHoursConfig,
    normalizeDayMinutes,
    bookingOccupiesSlot,
    bookingStartsInSlot,
    normalizeBookingDate,
    generateWeekDays
} from '../shared/utils';
import { PADEL_DURATIONS, getDayShiftRanges, fitsInShift } from '../../../utils/courtHours';
import { getCourtSport } from '../../../utils/sports';
import { useBodyScrollLock } from '../../../hooks/useBodyScrollLock';
import { StatusPill, BlockRow } from '../../business/portal/mobile/PortalListMobile';
import {
    STATUS_META,
    addMinutesToTime,
    bookingDuration,
    bookingPrice,
    bookingServiceName,
    bookingTime,
    isBookingBlocked,
    mobileStatusKey,
    money,
    needsAction,
    relativeDayLabel,
    shortDate,
    toTitleCase
} from '../../business/portal/mobile/bookingMobileUtils';

const TONE_COLOR = {
    ok: 'var(--pm-ok)',
    warn: 'var(--pm-warn)',
    pend: 'var(--pm-pend)',
    done: 'var(--pm-done)',
    bad: 'var(--pm-bad)'
};

const sameId = (a, b) => a !== null && a !== undefined && b !== null && b !== undefined && String(a) === String(b);

// Global blocks (no resource) apply to every column, like in the desktop day view
const belongsToResource = (b, r) => (b.status === 'blocked' && !b.court_id && !b.service_id && !b.resource_id) ||
    sameId(b.court_id, r.id) || sameId(b.specialist_id, r.id) || sameId(b.resource_id, r.id);

const isReal = (b) => !isBookingBlocked(b) && b.status !== 'cancelled';

// Agenda del día en celular: navegación por día, resumen y la lista de turnos y horarios libres
export default function PhoneDayAgenda({
    type,
    config,
    business,
    businessHours,
    resources,
    bookings,
    currentDate,
    setCurrentDate,
    onCreateBooking,
    onBookingClick,
    onBlockSlot,
    onMoveBooking,
    isRescheduling,
    reschedulingBooking
}) {
    const [resourceId, setResourceId] = useState(null);
    const [slotMenu, setSlotMenu] = useState(null);
    const dateButtonRef = useRef(null);
    const [showCalendar, setShowCalendar] = useState(false);
    const closeCalendar = useCallback(() => setShowCalendar(false), []);
    useBodyScrollLock(!!slotMenu);

    const dayKey = formatDateKey(currentDate);
    const useTabs = config.showResourceColumns && resources.length > 1;
    const resource = resources.find(r => sameId(r.id, resourceId)) || resources[0] || null;

    const dayBookings = useMemo(
        () => bookings.filter(b => normalizeBookingDate(b.date) === dayKey && b.status !== 'cancelled'),
        [bookings, dayKey]
    );

    const weekDays = generateWeekDays(currentDate);
    const daysWithBookings = useMemo(() => {
        const set = new Set();
        bookings.forEach(b => { if (isReal(b)) set.add(normalizeBookingDate(b.date)); });
        return set;
    }, [bookings]);

    const real = dayBookings.filter(isReal);
    const total = real.reduce((sum, b) => sum + bookingPrice(b), 0);
    const toConfirm = real.filter(needsAction).length;

    const columnBookings = (config.showResourceColumns && resource)
        ? dayBookings.filter(b => belongsToResource(b, resource))
        : dayBookings;

    // Opening hours of this day, same rules as the desktop day view
    const dayConfig = getDayHoursConfig(business?.hours, currentDate);
    const isOpen = (time) => {
        if (dayConfig?.isOpen === false) return false;
        if (!dayConfig?.open || !dayConfig?.close) return true;
        const slotMin = normalizeDayMinutes(time, dayConfig);
        const inShift = (open, close) => {
            const start = normalizeDayMinutes(open, dayConfig);
            let end = normalizeDayMinutes(close, dayConfig);
            if (end <= start) end += 1440;
            return slotMin >= start && slotMin < end;
        };
        if (dayConfig.isSplit && dayConfig.open2 && dayConfig.close2) {
            return inShift(dayConfig.open, dayConfig.close) || inShift(dayConfig.open2, dayConfig.close2);
        }
        return inShift(dayConfig.open, dayConfig.close);
    };
    const dayShifts = getDayShiftRanges(dayConfig);
    const canStart = (time) => {
        if (type === 'service' || dayShifts.length === 0 || !resource) return true;
        if (type !== 'padel' && getCourtSport(resource, business) !== 'padel') return true;
        return fitsInShift(time, dayShifts, PADEL_DURATIONS[0]);
    };

    // One row per booking where it starts; free time collapses to one "+ Libre" row per hour
    const rows = [];
    const slots = generateTimeSlots(businessHours.start, businessHours.end, config.slotSize);
    let lastFreeHour = null;
    slots.forEach(time => {
        const starting = columnBookings
            .filter(b => bookingStartsInSlot(b, time, config.slotSize, dayConfig))
            .sort((a, b) => normalizeDayMinutes(a.time, dayConfig) - normalizeDayMinutes(b.time, dayConfig));
        starting.forEach(b => rows.push({ kind: 'booking', time: bookingTime(b) || time, booking: b }));
        if (starting.length > 0) { lastFreeHour = null; return; }

        const busy = columnBookings.some(b => bookingOccupiesSlot(b, time, config.slotSize, dayConfig));
        if (busy) { lastFreeHour = null; return; }
        if (!isOpen(time) || !canStart(time)) return;

        const hour = time.slice(0, 2);
        if (lastFreeHour === hour) return;
        lastFreeHour = hour;
        rows.push({ kind: 'free', time });
    });

    const goToDay = (offset) => {
        const d = new Date(currentDate);
        d.setDate(d.getDate() + offset);
        setCurrentDate(d);
    };

    const handleFree = (e, time) => {
        if (isRescheduling && reschedulingBooking) {
            onMoveBooking && onMoveBooking(reschedulingBooking.id, dayKey, time, resource ? resource.id : null);
            return;
        }
        const rect = e.currentTarget.getBoundingClientRect();
        setSlotMenu({ date: currentDate, time, resource, x: rect.left + rect.width / 2, y: rect.top, bottom: rect.bottom });
    };

    const resourceCount = (r) => dayBookings.filter(b => isReal(b) && belongsToResource(b, r)).length;
    const dateLabel = relativeDayLabel(dayKey);
    const isNearDay = ['Hoy', 'Mañana', 'Ayer'].includes(dateLabel);
    const fullDate = currentDate.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });

    return (
        <div className="pm-stack pm-agenda">
            <div className="pm-daynav">
                <button type="button" className="pm-nav-btn" onClick={() => goToDay(-1)} aria-label="Día anterior">
                    <ChevronLeft size={20} strokeWidth={2.4} />
                </button>
                <button
                    ref={dateButtonRef}
                    type="button"
                    className="pm-daynav-lbl"
                    onClick={() => setShowCalendar(true)}
                    aria-haspopup="dialog"
                    aria-expanded={showCalendar}
                    aria-label={`Elegir otra fecha, ahora ${fullDate}`}
                >
                    <span>{isNearDay ? dateLabel : shortDate(dayKey).split(' ')[0].replace(/^./, c => c.toUpperCase())}</span>
                    <small>{isNearDay ? shortDate(dayKey) : fullDate} <CalendarDays size={13} aria-hidden="true" /></small>
                </button>
                {showCalendar && (
                    <PickerShell
                        anchorRef={dateButtonRef}
                        isPhone
                        title="Elegir día"
                        onClose={closeCalendar}
                        footer={(
                            <>
                                <span />
                                <button
                                    type="button"
                                    className="tl-link-btn"
                                    onClick={() => { setCurrentDate(new Date()); closeCalendar(); }}
                                >
                                    Hoy
                                </button>
                            </>
                        )}
                    >
                        <MonthGrid
                            value={dayKey}
                            autoFocus
                            onSelect={(key) => {
                                const [y, m, d] = key.split('-').map(Number);
                                setCurrentDate(new Date(y, m - 1, d));
                                closeCalendar();
                            }}
                        />
                    </PickerShell>
                )}
                <button type="button" className="pm-nav-btn" onClick={() => goToDay(1)} aria-label="Día siguiente">
                    <ChevronRight size={20} strokeWidth={2.4} />
                </button>
            </div>

            <div className="pm-week" role="group" aria-label="Días de la semana">
                {weekDays.map(d => {
                    const key = formatDateKey(d);
                    return (
                        <button
                            key={key}
                            type="button"
                            className={`pm-wd${daysWithBookings.has(key) ? ' has' : ''}${key === formatDateKey(new Date()) ? ' is-today' : ''}`}
                            aria-pressed={key === dayKey}
                            aria-label={d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric' })}
                            onClick={() => setCurrentDate(new Date(d))}
                        >
                            <span>{shortDate(key).split(' ')[0]}</span>
                            <b className="pm-tnum">{d.getDate()}</b>
                            <i />
                        </button>
                    );
                })}
            </div>

            <div className="pm-summary">
                <div><b className="pm-tnum">{real.length}</b><span>{real.length === 1 ? 'turno' : 'turnos'}</span></div>
                <div><b className="pm-tnum">{money(total)}</b><span>a cobrar</span></div>
                <div>
                    <b className={`pm-tnum${toConfirm ? ' is-warn' : ''}`}>{toConfirm}</b>
                    <span>por confirmar</span>
                </div>
            </div>

            {useTabs && (
                <div className="pm-seg pm-seg--scroll" role="group" aria-label={type === 'service' ? 'Profesional' : 'Cancha'}>
                    {resources.map(r => (
                        <button
                            key={r.id}
                            type="button"
                            aria-pressed={sameId(r.id, resource?.id)}
                            onClick={() => setResourceId(r.id)}
                        >
                            {r.name} · {resourceCount(r)}
                        </button>
                    ))}
                </div>
            )}

            {isRescheduling && (
                <p className="pm-hint">Tocá un horario libre para mover el turno.</p>
            )}

            <div className="pm-timeline">
                {rows.length === 0 && (
                    <p className="pm-empty">{dayConfig?.isOpen === false ? 'Este día está cerrado.' : 'No hay horarios para este día.'}</p>
                )}
                {rows.map(row => {
                    if (row.kind === 'free') {
                        return (
                            <div key={`free-${row.time}`} className="pm-slot">
                                <span className="pm-slot-h pm-tnum">{row.time}</span>
                                <button type="button" className="pm-free" onClick={(e) => handleFree(e, row.time)}>
                                    <Plus size={18} strokeWidth={2.4} aria-hidden="true" />
                                    {isRescheduling ? 'Mover acá' : 'Libre'}
                                </button>
                            </div>
                        );
                    }
                    const b = row.booking;
                    if (isBookingBlocked(b)) {
                        return (
                            <div key={b.id} className="pm-slot">
                                <span className="pm-slot-h pm-tnum">{row.time}</span>
                                <BlockRow booking={b} hideTime showResource={false} business={business} onClick={onBookingClick} />
                            </div>
                        );
                    }
                    const statusKey = mobileStatusKey(b);
                    const time = bookingTime(b);
                    const price = bookingPrice(b);
                    return (
                        <div key={b.id} className="pm-slot">
                            <span className="pm-slot-h pm-tnum">{row.time}</span>
                            <button
                                type="button"
                                className={`pm-ev${reschedulingBooking?.id === b.id ? ' is-moving' : ''}`}
                                style={{ '--pm-c': TONE_COLOR[STATUS_META[statusKey]?.tone] || 'var(--pm-pend)' }}
                                onClick={() => { if (!isRescheduling) onBookingClick && onBookingClick(b); }}
                            >
                                <span className="pm-bk-row">
                                    <span className="pm-bk-name">{toTitleCase(b.customer_name || b.customerName) || 'Sin nombre'}</span>
                                    <StatusPill statusKey={statusKey} />
                                </span>
                                {bookingServiceName(b, business) && <span className="pm-ev-svc">{bookingServiceName(b, business)}</span>}
                                <span className="pm-ev-when pm-tnum">
                                    {time ? `${time} a ${addMinutesToTime(time, bookingDuration(b))}` : ''}
                                    {price > 0 ? ` · ${money(price)}` : ''}
                                </span>
                            </button>
                        </div>
                    );
                })}
            </div>

            {slotMenu && (
                <SlotActionMenu
                    className="slot-menu"
                    anchor={slotMenu}
                    title={`${slotMenu.time} hs${slotMenu.resource?.name ? ` · ${slotMenu.resource.name}` : ''}`}
                    isMobile
                    onClose={() => setSlotMenu(null)}
                    items={[
                        {
                            icon: '📝',
                            label: 'Crear Reserva',
                            onClick: () => { onCreateBooking(slotMenu.date, slotMenu.time, slotMenu.resource); setSlotMenu(null); }
                        },
                        ...(onBlockSlot ? [{
                            icon: '🚫',
                            label: 'Bloquear Horario',
                            onClick: () => { onBlockSlot(slotMenu.date, slotMenu.time, slotMenu.resource); setSlotMenu(null); }
                        }] : [])
                    ]}
                />
            )}
        </div>
    );
}
