import React from 'react';
import { WEEK_DAYS, getRentalSchedule, minutesToTime, timeToMinutes } from '../../../utils/rentalSchedule';

// Horas que se pueden agregar como ingreso (06:00 a 23:30, cada 30 min)
const START_CHOICES = Array.from({ length: 36 }, (_, i) => minutesToTime(360 + i * 30));
// Tope de entrega: 12:00 del día hasta 08:00 del día siguiente
const MAX_END_CHOICES = Array.from({ length: 41 }, (_, i) => 720 + i * 30);

export default function VenueStartTimesTab({ formData, handleMetadataChange, cardStyle, sectionTitleStyle, labelStyle, inputStyle }) {
    const schedule = getRentalSchedule(formData);

    const save = (startTimes, maxEnd) => {
        handleMetadataChange('rental_schedule', { start_times: startTimes, max_end: maxEnd });
    };

    const addTime = (dayKey, time) => {
        if (!time) return;
        const list = [...schedule.startTimes[dayKey], time].sort((a, b) => timeToMinutes(a) - timeToMinutes(b));
        save({ ...schedule.startTimes, [dayKey]: [...new Set(list)] }, schedule.maxEnd);
    };

    const removeTime = (dayKey, time) => {
        save({ ...schedule.startTimes, [dayKey]: schedule.startTimes[dayKey].filter(t => t !== time) }, schedule.maxEnd);
    };

    const copyToAll = (dayKey) => {
        const source = schedule.startTimes[dayKey];
        save(Object.fromEntries(WEEK_DAYS.map(({ key }) => [key, [...source]])), schedule.maxEnd);
    };

    const firstFilledDay = WEEK_DAYS.find(({ key }) => schedule.startTimes[key].length > 0);

    return (
        <div style={cardStyle}>
            <h2 style={{ ...sectionTitleStyle, marginBottom: '8px' }}>Horarios de ingreso</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 20px' }}>
                Cargá a qué hora puede entrar el cliente cada día. Con las horas que elija calculamos a qué hora termina.
                Si no cargás ningún horario, el cliente elige la hora libremente y se reserva el día entero.
            </p>

            <div style={{ display: 'grid', gap: '4px', marginBottom: '16px' }}>
                {WEEK_DAYS.map(({ key, label, short }) => {
                    const list = schedule.startTimes[key];
                    return (
                        <div
                            key={key}
                            style={{
                                display: 'grid',
                                gridTemplateColumns: '52px 1fr',
                                gap: '12px',
                                alignItems: 'center',
                                padding: '10px 0',
                                borderTop: key === '1' ? 'none' : '1px solid var(--border)'
                            }}
                        >
                            <span title={label} style={{ fontWeight: '800', fontSize: '14px', color: 'var(--text-primary)' }}>{short}</span>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center', minWidth: 0 }}>
                                {list.length === 0 && (
                                    <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>No alquila</span>
                                )}
                                {list.map(time => (
                                    <span
                                        key={time}
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '2px',
                                            padding: '6px 4px 6px 10px',
                                            borderRadius: '10px',
                                            background: 'rgba(var(--primary-rgb, 132, 204, 22), 0.15)',
                                            color: 'var(--text-primary)',
                                            fontWeight: '700',
                                            fontSize: '14px',
                                            fontVariantNumeric: 'tabular-nums'
                                        }}
                                    >
                                        {time}
                                        <button
                                            type="button"
                                            aria-label={`Quitar ${time} del ${label.toLowerCase()}`}
                                            onClick={() => removeTime(key, time)}
                                            style={{ border: 'none', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '16px', width: '28px', height: '28px', borderRadius: '8px' }}
                                        >
                                            ×
                                        </button>
                                    </span>
                                ))}
                                <select
                                    aria-label={`Agregar horario el ${label.toLowerCase()}`}
                                    value=""
                                    onChange={e => addTime(key, e.target.value)}
                                    style={{
                                        padding: '7px 10px',
                                        borderRadius: '10px',
                                        border: '1px dashed var(--border)',
                                        background: 'transparent',
                                        color: 'var(--primary-paddle)',
                                        fontWeight: '700',
                                        fontSize: '16px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <option value="">+ Agregar</option>
                                    {START_CHOICES.filter(t => !list.includes(t)).map(t => (
                                        <option key={t} value={t}>{t}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    );
                })}
            </div>

            {firstFilledDay && (
                <button
                    type="button"
                    onClick={() => copyToAll(firstFilledDay.key)}
                    style={{
                        padding: '10px 14px',
                        borderRadius: '10px',
                        border: '1px solid var(--border)',
                        background: 'var(--bg-card)',
                        color: 'var(--text-primary)',
                        fontWeight: '700',
                        fontSize: '13px',
                        cursor: 'pointer',
                        marginBottom: '24px'
                    }}
                >
                    Copiar los horarios del {firstFilledDay.label.toLowerCase()} a todos los días
                </button>
            )}

            <div>
                <label htmlFor="rentalMaxEnd" style={labelStyle}>El espacio se entrega hasta</label>
                <select
                    id="rentalMaxEnd"
                    value={schedule.maxEnd === null ? '' : String(schedule.maxEnd)}
                    onChange={e => save(schedule.startTimes, e.target.value === '' ? null : Number(e.target.value))}
                    style={{ ...inputStyle, fontSize: '16px', maxWidth: '320px' }}
                >
                    <option value="">Sin tope</option>
                    {MAX_END_CHOICES.map(m => (
                        <option key={m} value={m}>{minutesToTime(m)}{m >= 1440 ? ' (día siguiente)' : ''}</option>
                    ))}
                </select>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '6px' }}>
                    La salida nunca pasa de esta hora. Si alquilás de noche, elegí una hora de la madrugada.
                </p>
            </div>
        </div>
    );
}
