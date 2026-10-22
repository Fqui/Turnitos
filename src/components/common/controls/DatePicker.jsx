import React, { useCallback, useEffect, useRef, useState } from 'react';
import PickerShell from './PickerShell';
import useIsPhone from './useIsPhone';
import './controls.css';

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const MONTHS_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const WEEKDAYS = ['lu', 'ma', 'mi', 'ju', 'vi', 'sá', 'do'];
const WEEKDAYS_SHORT = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

const pad2 = (n) => String(n).padStart(2, '0');
const toDateKey = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

const parseDateKey = (key) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(key || ''));
    return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
};

// "jue 22 oct 2026" (sin año si es el actual)
const formatDateKey = (key, { withYear } = {}) => {
    const d = parseDateKey(key);
    if (!d) return '';
    const showYear = withYear ?? d.getFullYear() !== new Date().getFullYear();
    return `${WEEKDAYS_SHORT[d.getDay()]} ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}${showYear ? ` ${d.getFullYear()}` : ''}`;
};

const CalendarIcon = () => (
    <svg className="tl-field-chevron" width="17" height="17" viewBox="0 0 24 24" aria-hidden="true">
        <rect x="3.5" y="5" width="17" height="15.5" rx="3" fill="none" stroke="currentColor" strokeWidth="1.9" />
        <path d="M3.5 10h17M8 3v4M16 3v4" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
);

// Calendario de un mes, lunes primero. Sirve suelto o dentro del DatePicker.
export function MonthGrid({ value, onSelect, min, max, isDateDisabled, autoFocus }) {
    const selected = parseDateKey(value);
    const [view, setView] = useState(() => {
        const base = selected || new Date();
        return new Date(base.getFullYear(), base.getMonth(), 1);
    });
    const [focusKey, setFocusKey] = useState(() => value || toDateKey(new Date()));
    const gridRef = useRef(null);
    const todayKey = toDateKey(new Date());

    const year = view.getFullYear();
    const month = view.getMonth();
    const lead = (new Date(year, month, 1).getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < lead; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));

    const isDisabled = (key) => (min && key < min) || (max && key > max) || (isDateDisabled ? isDateDisabled(key) : false);

    useEffect(() => {
        if (!autoFocus) return;
        gridRef.current?.querySelector(`[data-key="${focusKey}"]`)?.focus({ preventScroll: true });
    }, [focusKey, autoFocus, view]);

    const shiftFocus = (days) => {
        const d = parseDateKey(focusKey) || new Date();
        d.setDate(d.getDate() + days);
        if (d.getMonth() !== month || d.getFullYear() !== year) setView(new Date(d.getFullYear(), d.getMonth(), 1));
        setFocusKey(toDateKey(d));
    };

    const onKeyDown = (e) => {
        const moves = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
        if (moves[e.key]) {
            e.preventDefault();
            shiftFocus(moves[e.key]);
        }
    };

    return (
        <div className="tl-cal">
            <div className="tl-cal-head">
                <button type="button" className="tl-icon-btn" aria-label="Mes anterior" onClick={() => setView(new Date(year, month - 1, 1))}>
                    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </button>
                <span className="tl-cal-title" aria-live="polite">{MONTHS[month]} {year}</span>
                <button type="button" className="tl-icon-btn" aria-label="Mes siguiente" onClick={() => setView(new Date(year, month + 1, 1))}>
                    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </button>
            </div>
            <div className="tl-cal-grid" role="grid" ref={gridRef} onKeyDown={onKeyDown}>
                {WEEKDAYS.map(w => <span key={w} className="tl-cal-weekday" aria-hidden="true">{w}</span>)}
                {cells.map((d, i) => {
                    if (!d) return <span key={`e${i}`} />;
                    const key = toDateKey(d);
                    const disabled = isDisabled(key);
                    const isSel = key === value;
                    return (
                        <button
                            key={key}
                            type="button"
                            data-key={key}
                            tabIndex={key === focusKey ? 0 : -1}
                            disabled={disabled}
                            aria-pressed={isSel}
                            aria-label={`${WEEKDAYS_SHORT[d.getDay()]} ${d.getDate()} de ${MONTHS[d.getMonth()]}`}
                            className={`tl-cal-day${isSel ? ' is-selected' : ''}${key === todayKey ? ' is-today' : ''}`}
                            onClick={() => onSelect(key)}
                        >
                            {d.getDate()}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

// Campo de fecha con el estilo de la app (reemplaza al <input type="date">).
// value y onChange usan 'YYYY-MM-DD', igual que el input nativo.
export default function DatePicker({
    value,
    onChange,
    min,
    max,
    isDateDisabled,
    placeholder = 'Elegir día',
    title = 'Elegir día',
    allowClear = false,
    disabled = false,
    size = 'md',
    className = '',
    style,
    id,
    'aria-label': ariaLabel,
    withYear
}) {
    const isPhone = useIsPhone();
    const [open, setOpen] = useState(false);
    const triggerRef = useRef(null);
    const close = useCallback(() => setOpen(false), []);

    const pick = (key) => {
        if (key !== value) onChange?.(key);
        setOpen(false);
    };

    const todayKey = toDateKey(new Date());
    const todayBlocked = (min && todayKey < min) || (max && todayKey > max) || (isDateDisabled && isDateDisabled(todayKey));

    return (
        <>
            <button
                ref={triggerRef}
                id={id}
                type="button"
                className={`tl-field tl-field--${size}${value ? '' : ' tl-field--placeholder'} ${className}`}
                style={style}
                disabled={disabled}
                aria-haspopup="dialog"
                aria-expanded={open}
                aria-label={ariaLabel ? `${ariaLabel}${value ? `: ${formatDateKey(value, { withYear: true })}` : ''}` : undefined}
                onClick={() => setOpen(o => !o)}
            >
                <span className="tl-field-value">
                    <span className="tl-truncate">{value ? formatDateKey(value, { withYear }) : placeholder}</span>
                </span>
                <CalendarIcon />
            </button>

            {open && (
                <PickerShell
                    anchorRef={triggerRef}
                    isPhone={isPhone}
                    title={title}
                    width={308}
                    onClose={close}
                    footer={(
                        <>
                            {allowClear && value ? (
                                <button type="button" className="tl-link-btn" onClick={() => { onChange?.(''); setOpen(false); }}>Borrar</button>
                            ) : <span />}
                            {!todayBlocked && (
                                <button type="button" className="tl-link-btn" onClick={() => pick(todayKey)}>Hoy</button>
                            )}
                        </>
                    )}
                >
                    <MonthGrid value={value} onSelect={pick} min={min} max={max} isDateDisabled={isDateDisabled} autoFocus />
                </PickerShell>
            )}
        </>
    );
}
