import React, { useEffect } from 'react';
import { Check, Clock, Pencil, X, ChevronRight, MapPin } from 'lucide-react';
import { getHomeVisit } from '../../../../utils/homeService';
import { StatusPill } from './PortalListMobile';
import { WhatsAppGlyph } from './icons';
import {
    addMinutesToTime,
    bookingDateKey,
    bookingDuration,
    bookingTime,
    mobileStatusKey,
    money,
    relativeDayLabel,
    shortDate,
    toTitleCase
} from './bookingMobileUtils';

// Detalle del turno en celular: hoja inferior con la acción principal fija abajo junto a WhatsApp
export default function BookingSheetPhone({
    booking,
    serviceName,
    resourceLabel,
    resourceName,
    price,
    deposit,
    depositPaid,
    notes,
    onClose,
    onWhatsapp,
    onPrimary,
    onReschedule,
    onEdit,
    onCancel,
    onShowFull
}) {
    const statusKey = mobileStatusKey(booking);
    const dateKey = bookingDateKey(booking);
    const time = bookingTime(booking);
    const end = time ? addMinutesToTime(time, bookingDuration(booking)) : '';
    const phone = booking.customer_phone || booking.customerPhone || '';
    const name = toTitleCase(booking.customer_name || booking.customerName) || 'Sin nombre';
    const homeVisit = getHomeVisit(booking);
    const isClosed = booking.status === 'cancelled' || booking.status === 'completed';

    const primary = {
        deposit_due: 'Marcar seña cobrada',
        unconfirmed: 'Confirmar turno',
        deposit_paid: 'Confirmar turno',
        confirmed: 'Finalizar turno',
        attended: 'Finalizar turno'
    }[statusKey];

    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    let payText = 'Paga todo en el local';
    if (deposit > 0) {
        payText = depositPaid
            ? `Seña de ${money(deposit)} cobrada · resta ${money(Math.max(0, price - deposit))}`
            : `Falta la seña de ${money(deposit)}`;
    }
    if (booking.status === 'completed') payText = 'Turno finalizado';

    const minorActions = [
        !isClosed && onReschedule && { id: 'move', label: 'Cambiar horario', icon: Clock, onClick: onReschedule },
        { id: 'edit', label: 'Editar', icon: Pencil, onClick: onEdit },
        !isClosed && { id: 'cancel', label: 'Cancelar', icon: X, onClick: onCancel, danger: true }
    ].filter(Boolean);

    return (
        <div className="pm-scrim" onClick={onClose}>
            <section
                className="pm-sheet"
                role="dialog"
                aria-modal="true"
                aria-label={`Turno de ${name}`}
                onClick={e => e.stopPropagation()}
            >
                <div className="pm-grab" aria-hidden="true" />
                <button type="button" className="pm-sheet-close" onClick={onClose} aria-label="Cerrar">
                    <X size={22} />
                </button>
                <div className="pm-sheet-body">
                    <div className="pm-d-head">
                        <div>
                            <h3>{name}</h3>
                            {phone && phone !== '-' && <p className="pm-tnum">{phone}</p>}
                        </div>
                        <StatusPill statusKey={statusKey} />
                    </div>

                    <div className="pm-d-grid">
                        <div><span>Día</span><b>{relativeDayLabel(dateKey)} {shortDate(dateKey).split(' ')[1]}</b></div>
                        <div><span>Horario</span><b className="pm-tnum">{time ? `${time} a ${end}` : 'Todo el día'}</b></div>
                        <div><span>Servicio</span><b>{serviceName || '—'}</b></div>
                        <div><span>{resourceLabel}</span><b>{resourceName || '—'}</b></div>
                    </div>

                    <div className="pm-pay">
                        <div className="pm-pay-l">
                            <b className="pm-tnum">{price > 0 ? money(price) : 'Sin precio'}</b>
                            <span>{payText}</span>
                        </div>
                        {deposit > 0 && booking.status !== 'cancelled' && (
                            <span className={`pm-st ${depositPaid ? 'pm-st--ok' : 'pm-st--warn'}`}>
                                {depositPaid ? 'Seña ok' : 'Sin seña'}
                            </span>
                        )}
                    </div>

                    {homeVisit?.address && (
                        <div className="pm-note pm-note--row">
                            <MapPin size={16} aria-hidden="true" />
                            <span>A domicilio: {homeVisit.address}</span>
                        </div>
                    )}

                    {notes && <div className="pm-note">{notes}</div>}

                    <div className="pm-minor" style={{ gridTemplateColumns: `repeat(${minorActions.length}, 1fr)` }}>
                        {minorActions.map(({ id, label, icon: Icon, onClick, danger }) => (
                            <button key={id} type="button" className={danger ? 'is-danger' : undefined} onClick={onClick}>
                                <Icon size={20} aria-hidden="true" />
                                {label}
                            </button>
                        ))}
                    </div>

                    <button type="button" className="pm-link-row" onClick={onShowFull}>
                        Ver historial, cobros y más datos
                        <ChevronRight size={18} aria-hidden="true" />
                    </button>
                </div>

                <div className={`pm-sheet-foot booking-action-bar--mobile${primary ? '' : ' is-single'}`}>
                    <button
                        type="button"
                        className="pm-btn pm-btn--wa"
                        onClick={onWhatsapp}
                        aria-label={`Escribir a ${name} por WhatsApp`}
                    >
                        <WhatsAppGlyph size={22} />
                        {!primary && <span>Escribir por WhatsApp</span>}
                    </button>
                    {primary && (
                        <button type="button" className="pm-btn pm-btn--primary" onClick={onPrimary}>
                            <Check size={20} strokeWidth={2.6} aria-hidden="true" />
                            {primary}
                        </button>
                    )}
                </div>
            </section>
        </div>
    );
}
