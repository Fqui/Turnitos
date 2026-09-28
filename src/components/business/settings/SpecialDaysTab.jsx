import React, { useState } from 'react';

export default function SpecialDaysTab({
    formData,
    handleInputChange,
    handleSave,
    saving,
    showToast,
    showConfirm,
    isMobile,
    labelStyle,
    inputStyle,
    saveButtonStyle
}) {
    const specialDays = formData.special_days || [];

    // Form state (modern controlled React components)
    const [date, setDate] = useState('');
    const [type, setType] = useState('special_price');
    const [openTime, setOpenTime] = useState('09:00');
    const [closeTime, setCloseTime] = useState('18:00');
    const [priceMode, setPriceMode] = useState('discount_percent');
    const [priceVal, setPriceVal] = useState('');
    const [description, setDescription] = useState('');

    const handleAddSpecialDay = () => {
        if (!date) {
            showToast?.('Por favor selecciona una fecha', 'warning');
            return;
        }

        let desc = description.trim();
        if (!desc) {
            if (type === 'closed') desc = 'Cerrado';
            else if (type === 'holiday') desc = 'Feriado';
            else if (type === 'special_hours') desc = `Horario especial (${openTime} - ${closeTime} hs)`;
            else if (type === 'special_price') {
                desc = priceMode === 'fixed' 
                    ? `Precio especial $${Number(priceVal || 0).toLocaleString('es-AR')}`
                    : priceMode === 'surcharge'
                        ? `Recargo +${priceVal}%`
                        : `¡${priceVal}% OFF!`;
            }
        }

        const newSpecialDay = {
            id: `special_${Date.now()}`,
            date,
            type,
            description: desc,
            open: type === 'special_hours' ? openTime : null,
            close: type === 'special_hours' ? closeTime : null,
            priceMode: type === 'special_price' ? priceMode : null,
            priceVal: type === 'special_price' ? (parseFloat(priceVal) || 0) : null
        };

        const updatedDays = [...specialDays, newSpecialDay];
        handleInputChange('special_days', updatedDays);

        // Reset inputs
        setDate('');
        setPriceVal('');
        setDescription('');
        showToast?.('Día especial agregado', 'success');
    };

    return (
        <div style={{ display: 'grid', gap: '24px' }}>
            <div>
                <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '8px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '22px' }}>📅</span> Días Especiales y Ofertas
                </h3>
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
                    Configura feriados, cierres especiales o activa ofertas y descuentos en días puntuales para atraer más reservas.
                </p>
            </div>

            {/* Add New Special Day Card */}
            <div style={{ padding: '20px', background: 'var(--bg-main)', borderRadius: '16px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
                <h4 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '16px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    ➕ Nuevo Día Especial
                </h4>
                <div style={{ display: 'grid', gap: '14px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px' }}>
                        <div>
                            <label style={{ ...labelStyle, marginBottom: '4px' }}>Fecha</label>
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                style={inputStyle}
                            />
                        </div>
                        <div>
                            <label style={{ ...labelStyle, marginBottom: '4px' }}>Tipo de Día Especial</label>
                            <select
                                value={type}
                                onChange={(e) => setType(e.target.value)}
                                style={inputStyle}
                            >
                                <option value="special_price">🏷️ Oferta / Descuento Promocional</option>
                                <option value="special_hours">🕐 Horario Especial</option>
                                <option value="closed">🚫 Cerrado</option>
                                <option value="holiday">🎉 Feriado</option>
                            </select>
                        </div>
                    </div>

                    {/* Special Price / Discount Fields */}
                    {type === 'special_price' && (
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                            gap: '12px',
                            padding: '16px',
                            background: 'linear-gradient(135deg, rgba(16,185,129,0.06), rgba(16,185,129,0.02))',
                            borderRadius: '14px',
                            border: '1px solid rgba(16,185,129,0.25)'
                        }}>
                            <div>
                                <label style={{ ...labelStyle, marginBottom: '4px', color: '#059669', fontWeight: '700', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    Tipo de Oferta
                                </label>
                                <select
                                    value={priceMode}
                                    onChange={(e) => setPriceMode(e.target.value)}
                                    style={inputStyle}
                                >
                                    <option value="discount_percent">% Descuento (Ej: 20% OFF)</option>
                                    <option value="fixed">Precio Fijo ($)</option>
                                    <option value="surcharge">Recargo (%)</option>
                                </select>
                            </div>
                            <div>
                                <label style={{ ...labelStyle, marginBottom: '4px', color: '#059669', fontWeight: '700', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    {priceMode === 'fixed' ? 'Precio Promocional ($)' : priceMode === 'surcharge' ? 'Porcentaje de Recargo' : 'Porcentaje de Descuento'}
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    value={priceVal}
                                    onChange={(e) => setPriceVal(e.target.value)}
                                    placeholder={priceMode === 'fixed' ? 'Ej: 8000' : 'Ej: 20'}
                                    style={inputStyle}
                                />
                            </div>
                        </div>
                    )}

                    {/* Special Hours Fields */}
                    {type === 'special_hours' && (
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: '12px',
                            padding: '14px',
                            background: 'var(--bg-card)',
                            borderRadius: '10px',
                            border: '1px solid #3b82f640'
                        }}>
                            <div>
                                <label style={{ ...labelStyle, marginBottom: '4px' }}>Apertura Especial</label>
                                <input
                                    type="time"
                                    value={openTime}
                                    onChange={(e) => setOpenTime(e.target.value)}
                                    style={inputStyle}
                                />
                            </div>
                            <div>
                                <label style={{ ...labelStyle, marginBottom: '4px' }}>Cierre Especial</label>
                                <input
                                    type="time"
                                    value={closeTime}
                                    onChange={(e) => setCloseTime(e.target.value)}
                                    style={inputStyle}
                                />
                            </div>
                        </div>
                    )}

                    <div>
                        <label style={{ ...labelStyle, marginBottom: '4px' }}>Nombre de la oferta (Opcional — visible para el cliente)</label>
                        <input
                            type="text"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Ej: Martes Promo, Happy Hour, Oferta Flash..."
                            style={inputStyle}
                        />
                    </div>

                    <button
                        type="button"
                        onClick={handleAddSpecialDay}
                        style={{
                            padding: '12px 18px',
                            borderRadius: '10px',
                            border: 'none',
                            background: 'var(--primary-paddle, #00E676)',
                            color: '#000',
                            cursor: 'pointer',
                            fontWeight: '700',
                            fontSize: '14px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px'
                        }}
                    >
                        + Agregar Día Especial
                    </button>
                </div>
            </div>

            {/* List of Special Days */}
            {specialDays.length > 0 ? (
                <div style={{ display: 'grid', gap: '12px' }}>
                    <h4 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>
                        Días Especiales Configurados ({specialDays.length})
                    </h4>
                    {specialDays
                        .sort((a, b) => new Date(a.date) - new Date(b.date))
                        .map((day, index) => {
                            const typeConfig = {
                                closed: { label: 'Cerrado', gradient: 'linear-gradient(135deg, #fef2f2, #fee2e2)', borderColor: '#fca5a5', textColor: '#dc2626', icon: '🚫' },
                                holiday: { label: 'Feriado', gradient: 'linear-gradient(135deg, #fffbeb, #fef3c7)', borderColor: '#fcd34d', textColor: '#d97706', icon: '🎉' },
                                special_hours: { label: 'Horario Especial', gradient: 'linear-gradient(135deg, #eff6ff, #dbeafe)', borderColor: '#93c5fd', textColor: '#2563eb', icon: '🕐' },
                                special_price: { label: 'Oferta', gradient: 'linear-gradient(135deg, #ecfdf5, #d1fae5)', borderColor: '#6ee7b7', textColor: '#059669', icon: '🔥' }
                            };
                            const cfg = typeConfig[day.type] || typeConfig.closed;
                            const isPast = new Date(day.date + 'T23:59:59') < new Date();

                            return (
                                <div key={day.id || index} style={{
                                    padding: '16px 18px',
                                    background: isPast ? 'var(--bg-main)' : cfg.gradient,
                                    borderRadius: '14px',
                                    border: `1.5px solid ${isPast ? 'var(--border)' : cfg.borderColor}`,
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    gap: '14px',
                                    opacity: isPast ? 0.5 : 1,
                                    transition: 'all 0.2s ease'
                                }}>
                                    {/* Date circle */}
                                    <div style={{
                                        width: '52px',
                                        minWidth: '52px',
                                        height: '52px',
                                        borderRadius: '14px',
                                        background: isPast ? 'var(--border)' : cfg.textColor,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#fff',
                                        lineHeight: 1
                                    }}>
                                        <span style={{ fontSize: '10px', fontWeight: '600', textTransform: 'uppercase', opacity: 0.9 }}>
                                            {new Date(day.date + 'T00:00:00').toLocaleDateString('es-AR', { month: 'short' })}
                                        </span>
                                        <span style={{ fontSize: '20px', fontWeight: '800' }}>
                                            {new Date(day.date + 'T00:00:00').getDate()}
                                        </span>
                                    </div>

                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                                            <span style={{
                                                padding: '2px 8px',
                                                borderRadius: '6px',
                                                background: `${cfg.textColor}18`,
                                                color: cfg.textColor,
                                                fontSize: '11px',
                                                fontWeight: '800',
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.3px'
                                            }}>
                                                {cfg.icon} {cfg.label}
                                            </span>
                                            {day.type === 'special_price' && day.priceVal !== undefined && (
                                                <span style={{
                                                    padding: '2px 8px',
                                                    borderRadius: '6px',
                                                    background: '#059669',
                                                    color: '#fff',
                                                    fontSize: '11px',
                                                    fontWeight: '800'
                                                }}>
                                                    {day.priceMode === 'fixed'
                                                        ? `$${Number(day.priceVal).toLocaleString('es-AR')}`
                                                        : day.priceMode === 'surcharge'
                                                            ? `+${day.priceVal}%`
                                                            : `${day.priceVal}% OFF`}
                                                </span>
                                            )}
                                            {day.type === 'special_hours' && day.open && day.close && (
                                                <span style={{ fontSize: '12px', fontWeight: '700', color: '#2563eb' }}>
                                                    {day.open} – {day.close}
                                                </span>
                                            )}
                                        </div>
                                        <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>
                                            {new Date(day.date + 'T00:00:00').toLocaleDateString('es-AR', {
                                                weekday: 'long',
                                                day: 'numeric',
                                                month: 'long'
                                            })}
                                            {day.description && (
                                                <span style={{ fontWeight: '400', color: 'var(--text-secondary)', marginLeft: '6px' }}>
                                                    · {day.description}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={async () => {
                                            const confirmed = showConfirm 
                                                ? await showConfirm('¿Eliminar día especial?', '¿Deseas quitar este día especial?', 'Eliminar', 'Cancelar')
                                                : window.confirm('¿Deseas quitar este día especial?');
                                            if (confirmed) {
                                                const updatedDays = specialDays.filter((_, i) => i !== index);
                                                handleInputChange('special_days', updatedDays);
                                            }
                                        }}
                                        style={{
                                            padding: '8px',
                                            borderRadius: '10px',
                                            border: 'none',
                                            background: 'rgba(239, 68, 68, 0.08)',
                                            color: '#ef4444',
                                            cursor: 'pointer',
                                            fontWeight: '600',
                                            fontSize: '14px',
                                            transition: 'background 0.2s'
                                        }}
                                        title="Eliminar"
                                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.18)'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)'}
                                    >
                                        ✕
                                    </button>
                                </div>
                            );
                        })}
                </div>
            ) : (
                <div style={{ textAlign: 'center', padding: '40px 24px', background: 'var(--bg-main)', borderRadius: '16px', border: '2px dashed var(--border)' }}>
                    <div style={{ fontSize: '36px', marginBottom: '12px', opacity: 0.4 }}>📅</div>
                    <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: 0, fontWeight: '500' }}>
                        No hay días especiales configurados.
                    </p>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                        Agrega ofertas, feriados o días cerrados arriba.
                    </p>
                </div>
            )}

            <button
                type="button"
                onClick={() => handleSave({ special_days: formData.special_days })}
                style={saveButtonStyle}
                disabled={saving}
            >
                {saving ? 'Guardando...' : 'Guardar Días Especiales'}
            </button>
        </div>
    );
}
