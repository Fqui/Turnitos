import React from 'react';
import Select from './controls/Select';

const SIZES = { compact: 'sm', normal: 'md', large: 'lg' };

/**
 * CustomDropdown
 * Compatibilidad con el desplegable anterior: ahora usa el Select propio de la app.
 */
export default function CustomDropdown({
    options = [], // [{ value, label, icon, badge }] or [strings/numbers]
    value,
    onChange,
    placeholder = 'Seleccionar...',
    disabled = false,
    size = 'normal', // 'compact' | 'normal' | 'large'
    style = {},
    className = '',
    ...rest
}) {
    const normalized = options.map(opt => (
        typeof opt === 'number' ? { value: opt, label: `${opt} Horas` } : opt
    ));

    return (
        <Select
            options={normalized}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            disabled={disabled}
            size={SIZES[size] || 'md'}
            style={style}
            className={className}
            aria-label={rest['aria-label']}
            title={rest.title}
        />
    );
}
