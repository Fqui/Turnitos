import React, { forwardRef, useLayoutEffect, useRef } from 'react';
import { readableTextOn } from './color';
import './controls.css';

const FILLED = new Set(['primary', 'danger']);

// Botón único de la app.
// variant: primary | secondary | outline | ghost | danger | danger-soft
// size: sm | md | lg (en celular todos miden al menos 44px de alto)
// color: fondo propio (hex o var(--…)); la letra se elige sola para que se lea.
const Button = forwardRef(function Button({
    variant = 'primary',
    size = 'md',
    color,
    icon,
    iconRight,
    loading = false,
    fullWidth = false,
    type = 'button',
    className = '',
    style,
    disabled,
    children,
    ...rest
}, forwardedRef) {
    const innerRef = useRef(null);
    const setRef = (el) => {
        innerRef.current = el;
        if (typeof forwardedRef === 'function') forwardedRef(el);
        else if (forwardedRef) forwardedRef.current = el;
    };

    // Letra blanca u oscura según el color real del fondo (sirve con el color de marca del negocio)
    useLayoutEffect(() => {
        const el = innerRef.current;
        if (!el || !FILLED.has(variant)) return;
        el.style.removeProperty('--tl-btn-fg');
        const fg = readableTextOn(getComputedStyle(el).backgroundColor);
        if (fg) el.style.setProperty('--tl-btn-fg', fg);
    });

    const vars = color ? { '--tl-btn-bg': color } : null;

    return (
        <button
            ref={setRef}
            type={type}
            className={`tl-btn tl-btn--${variant} tl-btn--${size}${fullWidth ? ' tl-btn--block' : ''}${loading ? ' is-loading' : ''} ${className}`}
            style={vars ? { ...vars, ...style } : style}
            disabled={disabled || loading}
            aria-busy={loading || undefined}
            {...rest}
        >
            {loading ? <span className="tl-btn-spinner" aria-hidden="true" /> : icon && <span className="tl-btn-icon" aria-hidden="true">{icon}</span>}
            {children != null && children !== false && <span className="tl-btn-label">{children}</span>}
            {iconRight && !loading && <span className="tl-btn-icon" aria-hidden="true">{iconRight}</span>}
        </button>
    );
});

export default Button;
