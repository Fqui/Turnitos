import React, { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { WhatsAppGlyph } from './icons';
import {
    bookingDateKey,
    isBookingBlocked,
    keyToDate,
    shortDate,
    toTitleCase,
    todayKey,
    waLink
} from './bookingMobileUtils';

const FREQUENT_MIN = 4;
const INACTIVE_DAYS = 45;
const NEW_DAYS = 30;

const digits = (phone) => String(phone || '').replace(/\D/g, '').slice(-10);

const daysBetween = (fromKey, toKey) => Math.round((keyToDate(toKey) - keyToDate(fromKey)) / 86400000);

const lastLabel = (key, today) => {
    const diff = daysBetween(key, today);
    if (diff === 0) return 'hoy';
    if (diff === 1) return 'ayer';
    if (diff === -1) return 'mañana';
    if (diff > 1 && diff < 60) return `hace ${diff} días`;
    return shortDate(key);
};

const initials = (name) => toTitleCase(name).split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';

const hueOf = (name) => {
    let h = 0;
    for (const ch of String(name)) h = (h * 31 + ch.charCodeAt(0)) % 360;
    return h;
};

const CHIPS = [
    { id: 'all', label: 'Todos' },
    { id: 'frequent', label: 'Frecuentes' },
    { id: 'new', label: 'Nuevos' },
    { id: 'inactive', label: 'Hace mucho no vienen' }
];

const TAG_LABEL = { frequent: 'Frecuente', new: 'Nuevo', inactive: 'Inactivo' };

// Clientes en celular: tarjetas con WhatsApp a un toque en vez de la tabla
export default function ClientCardsPhone({ customers, bookings, searchTerm, setSearchTerm, onOpen }) {
    const [chip, setChip] = useState('all');
    const today = todayKey();

    // Visits per phone from the bookings already loaded in the portal
    const visits = useMemo(() => {
        const map = {};
        bookings.forEach(b => {
            if (isBookingBlocked(b) || b.status === 'cancelled' || b.status === 'rejected') return;
            const key = digits(b.customer_phone || b.customerPhone);
            if (!key) return;
            const date = bookingDateKey(b);
            const entry = map[key] || (map[key] = { count: 0, first: date, last: null, next: null });
            entry.count += 1;
            if (date < entry.first) entry.first = date;
            if (date <= today && (!entry.last || date > entry.last)) entry.last = date;
            if (date > today && (!entry.next || date < entry.next)) entry.next = date;
        });
        return map;
    }, [bookings, today]);

    const rows = useMemo(() => customers.map(c => {
        const v = visits[digits(c.phone)] || { count: 0 };
        let tag = null;
        if (v.count > 0) {
            if (v.last && !v.next && daysBetween(v.last, today) > INACTIVE_DAYS) tag = 'inactive';
            else if (v.count >= FREQUENT_MIN) tag = 'frequent';
            else if (v.count === 1 && daysBetween(v.first, today) <= NEW_DAYS) tag = 'new';
        }
        return { customer: c, visits: v, tag };
    }), [customers, visits, today]);

    const shown = rows.filter(r => chip === 'all' || r.tag === chip);

    return (
        <div className="pm-stack">
            <div>
                <h2 className="pm-h2">Clientes</h2>
                <p className="pm-sub">
                    {customers.length} {customers.length === 1 ? 'persona reservó' : 'personas reservaron'} en tu negocio
                </p>
            </div>

            <label className="pm-search">
                <Search size={18} aria-hidden="true" />
                <input
                    type="search"
                    placeholder="Buscar cliente"
                    aria-label="Buscar cliente"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </label>

            <div className="pm-chips" role="group" aria-label="Filtrar clientes">
                {CHIPS.map(c => (
                    <button
                        key={c.id}
                        type="button"
                        className="pm-chip"
                        aria-pressed={chip === c.id}
                        onClick={() => setChip(c.id)}
                    >
                        {c.label}
                        {c.id !== 'all' && <span className="pm-chip-n pm-tnum">{rows.filter(r => r.tag === c.id).length}</span>}
                    </button>
                ))}
            </div>

            {chip === 'inactive' && shown.length > 0 && (
                <p className="pm-note">
                    No reservan hace más de {INACTIVE_DAYS} días. Mandales un WhatsApp con una promo para que vuelvan.
                </p>
            )}

            {shown.length === 0 ? (
                <p className="pm-empty">No se encontraron clientes.</p>
            ) : (
                <div className="pm-list">
                    {shown.map(({ customer, visits: v, tag }) => {
                        const name = toTitleCase(customer.name);
                        const link = waLink(customer.phone, `Hola ${name.split(' ')[0]}! `);
                        return (
                            <div key={customer.id} className="pm-cl">
                                <button type="button" className="pm-cl-main" onClick={() => onOpen(customer)}>
                                    <span className="pm-av" style={{ '--h': hueOf(name) }} aria-hidden="true">{initials(name)}</span>
                                    <span className="pm-cl-info">
                                        <b>
                                            <span className="pm-cl-name">{name}</span>
                                            {tag && <span className={`pm-tag pm-tag--${tag}`}>{TAG_LABEL[tag]}</span>}
                                        </b>
                                        {v.count > 0 && (
                                            <span className="pm-tnum">
                                                {v.count} {v.count === 1 ? 'turno' : 'turnos'}
                                                {v.last ? ` · último: ${lastLabel(v.last, today)}` : v.next ? ` · próximo: ${lastLabel(v.next, today)}` : ''}
                                            </span>
                                        )}
                                        {customer.phone && <span className="pm-tnum">{customer.phone}</span>}
                                    </span>
                                </button>
                                {link && (
                                    <a
                                        className="pm-wa-btn"
                                        href={link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        aria-label={`Escribir a ${name} por WhatsApp`}
                                    >
                                        <WhatsAppGlyph size={20} />
                                    </a>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
