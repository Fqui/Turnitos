import React, { useMemo, useState } from 'react';
import { Search, Lock } from 'lucide-react';
import { getHomeVisit } from '../../../../utils/homeService';
import { formatDuration } from '../../../../utils/dateUtils';
import {
    STATUS_META,
    blockReason,
    bookingDateKey,
    bookingDeposit,
    bookingDuration,
    bookingPrice,
    bookingResourceName,
    bookingServiceName,
    bookingTime,
    addMinutesToTime,
    isBookingBlocked,
    mobileStatusKey,
    money,
    needsAction,
    toTitleCase,
    dayHeader,
    todayKey
} from './bookingMobileUtils';

const RANGES = [
    { id: 'today', label: 'Hoy' },
    { id: 'next', label: 'Próximas' },
    { id: 'past', label: 'Pasadas' }
];

const CHIPS = [
    { id: 'all', label: 'Todas', match: () => true },
    { id: 'unconfirmed', label: 'Sin confirmar', match: k => k === 'unconfirmed' || k === 'deposit_paid' },
    { id: 'deposit_due', label: 'Seña pendiente', match: k => k === 'deposit_due' },
    { id: 'confirmed', label: 'Confirmadas', match: k => k === 'confirmed' || k === 'attended' },
    { id: 'completed', label: 'Finalizadas', match: k => k === 'completed' },
    { id: 'cancelled', label: 'Canceladas', match: k => k === 'cancelled' }
];

const PAGE_SIZE = 40;

export function StatusPill({ statusKey }) {
    const meta = STATUS_META[statusKey] || STATUS_META.unconfirmed;
    return <span className={`pm-st pm-st--${meta.tone}`}>{meta.label}</span>;
}

export function BlockRow({ booking, onClick, showResource = true, hideTime = false, business }) {
    const time = bookingTime(booking);
    const end = time ? addMinutesToTime(time, bookingDuration(booking)) : '';
    const resource = showResource ? bookingResourceName(booking, business) : '';
    return (
        <button type="button" className="pm-blk" onClick={() => onClick(booking)}>
            <Lock size={16} aria-hidden="true" />
            {time && !hideTime && <b className="pm-tnum">{time}</b>}
            <span>
                {blockReason(booking)}{end ? ` · hasta ${end}` : ''}{resource ? ` · ${resource}` : ''}
            </span>
        </button>
    );
}

export function BookingCard({ booking, business, isRental, onClick }) {
    const statusKey = mobileStatusKey(booking);
    const time = bookingTime(booking);
    const duration = bookingDuration(booking);
    const price = bookingPrice(booking);
    const deposit = bookingDeposit(booking);
    const service = bookingServiceName(booking, business) || (isRental ? 'Alquiler del espacio' : '');
    const resource = bookingResourceName(booking, business);
    const note = booking.notes || booking.metadata?.notes || '';
    const guests = booking.guest_count || booking.guestCount || booking.metadata?.guest_count;
    const name = toTitleCase(booking.customer_name || booking.customerName) || 'Sin nombre';
    const homeVisit = getHomeVisit(booking);

    const svcLine = [guests ? `${guests} personas` : '', service, note && note !== service ? note : '']
        .filter(Boolean).join(' · ');

    return (
        <button
            type="button"
            className={`pm-bk${statusKey === 'cancelled' ? ' is-cancelled' : ''}`}
            onClick={() => onClick(booking)}
        >
            <div className="pm-bk-time">
                <b className="pm-tnum">{time || 'Día'}</b>
                <span>{formatDuration(duration)}</span>
            </div>
            <div className="pm-bk-body">
                <div className="pm-bk-row">
                    <span className="pm-bk-name">{name}</span>
                    <StatusPill statusKey={statusKey} />
                </div>
                {(svcLine || booking.promo_id || homeVisit) && (
                    <span className="pm-bk-svc">
                        {svcLine}
                        {booking.promo_id && <span className="pm-tag pm-tag--promo">Promo</span>}
                        {homeVisit && <span className="pm-tag pm-tag--home">A domicilio</span>}
                    </span>
                )}
                <span className="pm-bk-meta">
                    {price > 0 && <b className="pm-tnum">{money(price)}</b>}
                    {resource && <>{price > 0 ? ' · ' : ''}{resource}</>}
                    {statusKey === 'deposit_due' && deposit > 0 && (
                        <span className="pm-warn"> · falta seña {money(deposit)}</span>
                    )}
                </span>
            </div>
        </button>
    );
}

export default function PortalListMobile({
    bookings,
    business,
    isRentalBusiness,
    listFilters,
    setListFilters,
    onBookingClick
}) {
    const [range, setRange] = useState('today');
    const [chip, setChip] = useState('all');
    const [limit, setLimit] = useState(PAGE_SIZE);
    const today = todayKey();

    const waitingCount = useMemo(
        () => bookings.filter(b => needsAction(b) && bookingDateKey(b) >= today).length,
        [bookings, today]
    );

    const term = (listFilters.search || '').toLowerCase().trim();

    const inRange = useMemo(() => bookings.filter(b => {
        const key = bookingDateKey(b);
        if (range === 'today' && key !== today) return false;
        if (range === 'next' && key <= today) return false;
        if (range === 'past' && key >= today) return false;
        if (!term) return true;
        const haystack = [
            b.customer_name || b.customerName,
            b.customer_phone || b.customerPhone,
            bookingServiceName(b, business),
            b.notes || b.metadata?.notes
        ].join(' ').toLowerCase();
        return haystack.includes(term);
    }), [bookings, range, today, term, business]);

    const counts = useMemo(() => {
        const result = {};
        CHIPS.forEach(c => {
            result[c.id] = inRange.filter(b => !isBookingBlocked(b) && c.match(mobileStatusKey(b))).length;
        });
        return result;
    }, [inRange]);

    const activeChip = CHIPS.find(c => c.id === chip) || CHIPS[0];
    const visible = inRange
        .filter(b => (chip === 'all' ? true : !isBookingBlocked(b) && activeChip.match(mobileStatusKey(b))))
        .sort((a, b) => {
            const ka = `${bookingDateKey(a)} ${bookingTime(a) || '00:00'}`;
            const kb = `${bookingDateKey(b)} ${bookingTime(b) || '00:00'}`;
            return range === 'past' ? kb.localeCompare(ka) : ka.localeCompare(kb);
        });

    const shown = visible.slice(0, limit);
    const groups = [];
    shown.forEach(b => {
        const key = bookingDateKey(b);
        const last = groups[groups.length - 1];
        if (last && last.key === key) last.items.push(b);
        else groups.push({ key, items: [b] });
    });

    // Day totals count every real booking of that day, not only the ones on this page
    const dayTotals = (key) => {
        const real = visible.filter(b => bookingDateKey(b) === key && !isBookingBlocked(b) && b.status !== 'cancelled');
        return { count: real.length, total: real.reduce((sum, b) => sum + bookingPrice(b), 0) };
    };

    const resetPaging = () => setLimit(PAGE_SIZE);

    return (
        <div className="pm-stack">
            <div>
                <h2 className="pm-h2">Reservas</h2>
                <p className="pm-sub">
                    {waitingCount === 0
                        ? 'No hay turnos esperando tu confirmación'
                        : `${waitingCount} ${waitingCount === 1 ? 'espera' : 'esperan'} tu confirmación`}
                </p>
            </div>

            <div className="pm-seg" role="group" aria-label="Período">
                {RANGES.map(r => (
                    <button
                        key={r.id}
                        type="button"
                        aria-pressed={range === r.id}
                        onClick={() => { setRange(r.id); setChip('all'); resetPaging(); }}
                    >
                        {r.label}
                    </button>
                ))}
            </div>

            <label className="pm-search">
                <Search size={18} aria-hidden="true" />
                <input
                    type="search"
                    placeholder="Buscar por nombre o teléfono"
                    aria-label="Buscar reserva"
                    value={listFilters.search}
                    onChange={(e) => {
                        const value = e.target.value;
                        setListFilters(prev => ({ ...prev, search: value }));
                        resetPaging();
                    }}
                />
            </label>

            <div className="pm-chips" role="group" aria-label="Estado">
                {CHIPS.map(c => (
                    <button
                        key={c.id}
                        type="button"
                        className="pm-chip"
                        aria-pressed={chip === c.id}
                        onClick={() => { setChip(c.id); resetPaging(); }}
                    >
                        {c.label} <span className="pm-chip-n pm-tnum">{counts[c.id]}</span>
                    </button>
                ))}
            </div>

            {groups.length === 0 ? (
                <p className="pm-empty">
                    {range === 'today' && chip === 'all' && !term ? 'No hay reservas para hoy.' : 'No hay reservas con este filtro.'}
                </p>
            ) : groups.map(group => {
                const totals = dayTotals(group.key);
                return (
                    <React.Fragment key={group.key}>
                        <div className="pm-group-h">
                            <span>{dayHeader(group.key)}</span>
                            <span className="pm-tnum">
                                {totals.count} {totals.count === 1 ? 'turno' : 'turnos'}{totals.total > 0 ? ` · ${money(totals.total)}` : ''}
                            </span>
                        </div>
                        <div className="pm-list">
                            {group.items.map(b => (isBookingBlocked(b)
                                ? <BlockRow key={b.id} booking={b} business={business} onClick={onBookingClick} />
                                : <BookingCard key={b.id} booking={b} business={business} isRental={isRentalBusiness} onClick={onBookingClick} />
                            ))}
                        </div>
                    </React.Fragment>
                );
            })}

            {visible.length > limit && (
                <button type="button" className="pm-more" onClick={() => setLimit(l => l + PAGE_SIZE)}>
                    Ver más ({visible.length - limit})
                </button>
            )}
        </div>
    );
}
