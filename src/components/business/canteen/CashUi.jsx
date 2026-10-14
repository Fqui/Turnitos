import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Banknote, Landmark, X } from 'lucide-react';
import { useBodyScrollLock } from '../../../hooks/useBodyScrollLock';
import './cashRegister.css';

export function Spinner({ large = false }) {
    return <span className={`cc-spinner${large ? ' cc-spinner--lg' : ''}`} aria-hidden="true" />;
}

/**
 * Button with variants and a loading state that also blocks double clicks.
 * variant: 'default' | 'primary' | 'danger' | 'solid-danger' | 'ghost'; size: 'sm' | 'md' | 'lg'
 */
export function Button({ variant = 'default', size = 'md', block = false, loading = false, icon: Icon, children, className = '', disabled, type = 'button', ...rest }) {
    const classes = [
        'cc-btn',
        variant !== 'default' ? `cc-btn--${variant}` : '',
        size !== 'md' ? `cc-btn--${size}` : '',
        block ? 'cc-btn--block' : '',
        className
    ].filter(Boolean).join(' ');

    return (
        <button type={type} className={classes} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
            {loading ? <Spinner /> : Icon ? <Icon size={size === 'sm' ? 14 : 18} strokeWidth={2.2} aria-hidden="true" /> : null}
            {children}
        </button>
    );
}

export function Modal({ title, subtitle, onClose, children, footer, wide = false, busy = false }) {
    useBodyScrollLock();

    useEffect(() => {
        const onKey = (e) => {
            if (e.key === 'Escape' && !busy) onClose?.();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose, busy]);

    return createPortal(
        <div className="cc-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) onClose?.(); }}>
            <div className={`cc-modal${wide ? ' cc-modal--wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
                <div className="cc-modal-head">
                    <div style={{ minWidth: 0 }}>
                        <h3>{title}</h3>
                        {subtitle && <p>{subtitle}</p>}
                    </div>
                    <Button variant="ghost" className="cc-btn--icon" onClick={onClose} disabled={busy} aria-label="Cerrar">
                        <X size={20} />
                    </Button>
                </div>
                <div className="cc-modal-body">{children}</div>
                {footer && <div className="cc-modal-foot">{footer}</div>}
            </div>
        </div>,
        document.body
    );
}

export function Field({ label, hint, children }) {
    return (
        <label className="cc-field">
            {label && <span className="cc-label">{label}</span>}
            {children}
            {hint && <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{hint}</span>}
        </label>
    );
}

export function MoneyInput({ value, onChange, large = false, autoFocus = false, placeholder = '0', ...rest }) {
    return (
        <div className={`cc-money${large ? ' cc-money--lg' : ''}`}>
            <span>$</span>
            <input
                className="cc-input"
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                value={value}
                placeholder={placeholder}
                autoFocus={autoFocus}
                onChange={(e) => onChange(e.target.value)}
                onWheel={(e) => e.currentTarget.blur()}
                {...rest}
            />
        </div>
    );
}

export function PaymentMethodPicker({ value, onChange, disabled = false }) {
    const options = [
        { id: 'cash', label: 'Efectivo', icon: Banknote },
        { id: 'transfer', label: 'Transferencia', icon: Landmark }
    ];
    return (
        <div className="cc-segmented" role="radiogroup" aria-label="Medio de pago">
            {options.map(opt => (
                <button
                    key={opt.id}
                    type="button"
                    role="radio"
                    aria-checked={value === opt.id}
                    className={`cc-segment${value === opt.id ? ' is-active' : ''}`}
                    onClick={() => onChange(opt.id)}
                    disabled={disabled}
                >
                    <opt.icon size={18} aria-hidden="true" />
                    {opt.label}
                </button>
            ))}
        </div>
    );
}

/** One figure of the totals strip; `main` is the big one (cash in the drawer, net of the month) */
export function Kpi({ label, value, hint, main = false, className = '' }) {
    return (
        <div className={`cc-kpi${main ? ' cc-kpi--main' : ''}`}>
            <div className="cc-kpi-label">{label}</div>
            <div className={`cc-kpi-value ${className}`}>{value}</div>
            {hint && <div className="cc-kpi-hint">{hint}</div>}
        </div>
    );
}

export function EmptyState({ title, text, children, center = false }) {
    return (
        <div className={`cc-empty${center ? ' cc-empty--center' : ''}`}>
            <h3>{title}</h3>
            {text && <p>{text}</p>}
            {children && <div className="cc-empty-actions">{children}</div>}
        </div>
    );
}

export function Badge({ tone, children, style }) {
    return <span className={`cc-badge${tone ? ` cc-badge--${tone}` : ''}`} style={style}>{children}</span>;
}
