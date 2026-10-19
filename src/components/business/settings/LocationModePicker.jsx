import React from 'react';
import { LOCATION_MODES, getLocationMode } from '../../../utils/homeService';

export default function LocationModePicker({ value, onChange, labelStyle }) {
    const current = getLocationMode({ location_mode: value });
    const help = {
        local: 'El cliente reserva y viene al local.',
        home: 'Siempre vas a la casa del cliente.',
        both: 'El cliente elige al reservar: en el local o a domicilio.'
    };

    return (
        <div style={{ marginBottom: '20px' }}>
            <label style={labelStyle}>¿Dónde lo hacés?</label>
            <div style={{ display: 'flex', gap: '6px' }}>
                {LOCATION_MODES.map(mode => {
                    const active = current === mode.id;
                    return (
                        <button
                            key={mode.id}
                            type="button"
                            onClick={() => onChange(mode.id)}
                            style={{
                                flex: 1,
                                minHeight: '44px',
                                borderRadius: '10px',
                                border: `1px solid ${active ? 'var(--text-primary)' : 'var(--border)'}`,
                                background: active ? 'var(--text-primary)' : 'var(--bg-card)',
                                color: active ? 'var(--bg-card)' : 'var(--text-secondary)',
                                fontWeight: 600,
                                fontSize: '13px',
                                cursor: 'pointer',
                                fontFamily: 'inherit'
                            }}
                        >
                            {mode.label}
                        </button>
                    );
                })}
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '6px 0 0' }}>
                {help[current]}
                {current !== 'local' && ' Las zonas y el recargo se configuran en "Atención a domicilio".'}
            </p>
        </div>
    );
}
