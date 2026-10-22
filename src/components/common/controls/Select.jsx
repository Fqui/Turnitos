import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import PickerShell from './PickerShell';
import useIsPhone from './useIsPhone';
import './controls.css';

const normalize = (opt) => {
    if (opt !== null && typeof opt === 'object') {
        return {
            value: opt.value !== undefined ? opt.value : opt.id,
            label: opt.label !== undefined ? opt.label : (opt.name ?? String(opt.value)),
            icon: opt.icon || null,
            badge: opt.badge || null,
            hint: opt.hint || null,
            disabled: Boolean(opt.disabled)
        };
    }
    return { value: opt, label: String(opt), icon: null, badge: null, hint: null, disabled: false };
};

const same = (a, b) => String(a ?? '') === String(b ?? '');

// Desplegable con el estilo de la app (reemplaza al <select> nativo).
// options: [{ value, label, icon?, badge?, hint?, disabled? }] o valores sueltos.
export default function Select({
    value,
    onChange,
    options = [],
    placeholder = 'Elegir…',
    title,
    disabled = false,
    size = 'md',
    className = '',
    style,
    id,
    'aria-label': ariaLabel,
    renderValue
}) {
    const isPhone = useIsPhone();
    const [open, setOpen] = useState(false);
    const [active, setActive] = useState(-1);
    const triggerRef = useRef(null);
    const listRef = useRef(null);
    const listId = useId();

    const items = options.map(normalize);
    const selectedIndex = items.findIndex(o => same(o.value, value));
    const selected = selectedIndex >= 0 ? items[selectedIndex] : null;

    const close = useCallback(() => setOpen(false), []);

    const pick = (opt) => {
        if (opt.disabled) return;
        if (!same(opt.value, value)) onChange?.(opt.value);
        setOpen(false);
    };

    useEffect(() => {
        if (!open) return;
        setActive(selectedIndex >= 0 ? selectedIndex : items.findIndex(o => !o.disabled));
        // El elegido queda a la vista al abrir
        requestAnimationFrame(() => {
            listRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'center' });
            listRef.current?.focus({ preventScroll: true });
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const move = (dir) => {
        if (!items.length) return;
        let i = active;
        for (let n = 0; n < items.length; n++) {
            i = (i + dir + items.length) % items.length;
            if (!items[i].disabled) break;
        }
        setActive(i);
        listRef.current?.children[i]?.scrollIntoView({ block: 'nearest' });
    };

    const onListKey = (e) => {
        if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
        else if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (items[active]) pick(items[active]);
        } else if (e.key === 'Tab') setOpen(false);
    };

    const onTriggerKey = (e) => {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            setOpen(true);
        }
    };

    return (
        <>
            <button
                ref={triggerRef}
                id={id}
                type="button"
                className={`tl-field tl-field--${size}${selected ? '' : ' tl-field--placeholder'} ${className}`}
                style={style}
                disabled={disabled}
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-label={ariaLabel}
                onClick={() => setOpen(o => !o)}
                onKeyDown={onTriggerKey}
            >
                <span className="tl-field-value">
                    {renderValue ? renderValue(selected) : selected ? (
                        <>
                            {selected.icon && <span className="tl-field-icon">{selected.icon}</span>}
                            <span className="tl-truncate">{selected.label}</span>
                            {selected.badge && <span className="tl-badge">{selected.badge}</span>}
                        </>
                    ) : <span className="tl-truncate">{placeholder}</span>}
                </span>
                <svg className="tl-field-chevron" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </button>

            {open && (
                <PickerShell
                    anchorRef={triggerRef}
                    isPhone={isPhone}
                    title={title || ariaLabel || placeholder}
                    onClose={close}
                >
                    <div
                        ref={listRef}
                        id={listId}
                        role="listbox"
                        tabIndex={-1}
                        className="tl-options"
                        aria-label={title || ariaLabel}
                        aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
                        onKeyDown={onListKey}
                    >
                        {items.length === 0 && <div className="tl-empty">Sin opciones</div>}
                        {items.map((opt, i) => {
                            const isSel = same(opt.value, value);
                            return (
                                <div
                                    key={`${opt.value}-${i}`}
                                    id={`${listId}-${i}`}
                                    role="option"
                                    aria-selected={isSel}
                                    aria-disabled={opt.disabled || undefined}
                                    className={`tl-option${isSel ? ' is-selected' : ''}${i === active ? ' is-active' : ''}`}
                                    onMouseEnter={() => setActive(i)}
                                    onClick={() => pick(opt)}
                                >
                                    {opt.icon && <span className="tl-field-icon">{opt.icon}</span>}
                                    <span className="tl-option-label">
                                        {opt.label}
                                        {opt.hint && <span className="tl-option-hint">{opt.hint}</span>}
                                    </span>
                                    {opt.badge && <span className="tl-badge">{opt.badge}</span>}
                                    {isSel && (
                                        <svg className="tl-option-check" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                                            <path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </PickerShell>
            )}
        </>
    );
}
