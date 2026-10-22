import React, { useCallback, useEffect, useRef, useState } from 'react';
import PickerShell from './PickerShell';
import useIsPhone from './useIsPhone';
import './controls.css';

const pad2 = (n) => String(n).padStart(2, '0');

const parseTime = (value) => {
    const m = /^(\d{1,2}):(\d{2})/.exec(String(value || ''));
    return m ? { h: Number(m[1]), m: Number(m[2]) } : null;
};

const ClockIcon = () => (
    <svg className="tl-field-chevron" width="17" height="17" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" strokeWidth="1.9" />
        <path d="M12 7.5V12l3 2" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

// Campo de horario con el estilo de la app (reemplaza al <input type="time">).
// value y onChange usan 'HH:MM'. Se elige la hora y después los minutos.
export default function TimePicker({
    value,
    onChange,
    step = 5,
    placeholder = '--:--',
    title = 'Elegir horario',
    disabled = false,
    size = 'md',
    className = '',
    style,
    id,
    'aria-label': ariaLabel
}) {
    const isPhone = useIsPhone();
    const [open, setOpen] = useState(false);
    const triggerRef = useRef(null);
    const hoursRef = useRef(null);
    const minutesRef = useRef(null);
    const close = useCallback(() => setOpen(false), []);

    const current = parseTime(value);
    const text = current ? `${pad2(current.h)}:${pad2(current.m)}` : '';

    const minutes = [];
    for (let m = 0; m < 60; m += step) minutes.push(m);
    if (current && !minutes.includes(current.m)) minutes.push(current.m);
    minutes.sort((a, b) => a - b);

    useEffect(() => {
        if (!open) return;
        requestAnimationFrame(() => {
            [hoursRef, minutesRef].forEach(ref => {
                const el = ref.current?.querySelector('[aria-selected="true"]');
                if (el) ref.current.scrollTop = el.offsetTop - ref.current.clientHeight / 2 + el.offsetHeight / 2;
            });
            (hoursRef.current?.querySelector('[aria-selected="true"]') || hoursRef.current?.firstChild)?.focus({ preventScroll: true });
        });
    }, [open]);

    const set = (h, m) => {
        const next = `${pad2(h)}:${pad2(m)}`;
        if (next !== text) onChange?.(next);
    };

    const onColumnKey = (e, list, selectedValue, apply) => {
        if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
        e.preventDefault();
        const i = Math.max(list.indexOf(selectedValue), 0);
        const next = list[(i + (e.key === 'ArrowDown' ? 1 : -1) + list.length) % list.length];
        apply(next);
        requestAnimationFrame(() => e.currentTarget?.querySelector('[aria-selected="true"]')?.focus());
    };

    const hours = Array.from({ length: 24 }, (_, h) => h);

    return (
        <>
            <button
                ref={triggerRef}
                id={id}
                type="button"
                className={`tl-field tl-field--${size} tl-field--time${text ? '' : ' tl-field--placeholder'} ${className}`}
                style={style}
                disabled={disabled}
                aria-haspopup="dialog"
                aria-expanded={open}
                aria-label={ariaLabel ? `${ariaLabel}${text ? `: ${text}` : ''}` : undefined}
                onClick={() => setOpen(o => !o)}
            >
                <span className="tl-field-value"><span className="tl-truncate tl-tabular">{text || placeholder}</span></span>
                <ClockIcon />
            </button>

            {open && (
                <PickerShell
                    anchorRef={triggerRef}
                    isPhone={isPhone}
                    title={title}
                    width={220}
                    onClose={close}
                    footer={(
                        <>
                            <span className="tl-time-preview tl-tabular">{text || '--:--'}</span>
                            <button type="button" className="tl-link-btn" onClick={close}>Listo</button>
                        </>
                    )}
                >
                    <div className="tl-time">
                        <div className="tl-time-col-wrap">
                            <span className="tl-time-col-label">Hora</span>
                            <div
                                ref={hoursRef}
                                className="tl-time-col"
                                role="listbox"
                                aria-label="Hora"
                                onKeyDown={(e) => onColumnKey(e, hours, current?.h, (h) => set(h, current?.m ?? 0))}
                            >
                                {hours.map(h => (
                                    <button
                                        key={h}
                                        type="button"
                                        role="option"
                                        aria-selected={current?.h === h}
                                        tabIndex={current?.h === h || (!current && h === 0) ? 0 : -1}
                                        className={`tl-time-cell tl-tabular${current?.h === h ? ' is-selected' : ''}`}
                                        onClick={() => set(h, current?.m ?? 0)}
                                    >
                                        {pad2(h)}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <span className="tl-time-sep" aria-hidden="true">:</span>
                        <div className="tl-time-col-wrap">
                            <span className="tl-time-col-label">Min</span>
                            <div
                                ref={minutesRef}
                                className="tl-time-col"
                                role="listbox"
                                aria-label="Minutos"
                                onKeyDown={(e) => onColumnKey(e, minutes, current?.m, (m) => set(current?.h ?? 0, m))}
                            >
                                {minutes.map(m => (
                                    <button
                                        key={m}
                                        type="button"
                                        role="option"
                                        aria-selected={current?.m === m}
                                        tabIndex={current?.m === m || (!current && m === 0) ? 0 : -1}
                                        className={`tl-time-cell tl-tabular${current?.m === m ? ' is-selected' : ''}`}
                                        onClick={() => { set(current?.h ?? 0, m); setOpen(false); }}
                                    >
                                        {pad2(m)}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </PickerShell>
            )}
        </>
    );
}
