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
                    ? `Tarifa especial $${Number(priceVal || 0).toLocaleString('es-AR')}`
                    : `${priceVal}% OFF (Baja demanda)`;
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
                <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '8px', color: 'var(--text-primary)' }}>
                    Días Especiales y Precios de Baja Demanda
                </h3>
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
                    Configura días cerrados, feriados o promociones con descuento en días de baja demanda para incentivar reservas.
                </p>
            </div>

            {/* Add New Special Day Card */}
            <div style={{ padding: '20px', background: 'var(--bg-main)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                <h4 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '16px', color: 'var(--text-primary)' }}>
                    Agregar Día Especial o Descuento
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
                                <option value="special_price">🏷️ Descuento / Precio Promocional (Baja Demanda)</option>
                                <option value="special_hours">🕐 Horario Especial (Apertura / Cierre distintos)</option>
                                <option value="closed">🚫 Cerrado (No se aceptan reservas)</option>
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
                            padding: '14px',
                            background: 'var(--bg-card)',
                            borderRadius: '10px',
                            border: '1px solid #10b98140'
                        }}>
                            <div>
                                <label style={{ ...labelStyle, marginBottom: '4px', color: '#10b981', fontWeight: '700' }}>
                                    Modalidad de Descuento
                                </label>
                                <select
                                    value={priceMode}
                                    onChange={(e) => setPriceMode(e.target.value)}
                                    style={inputStyle}
                                >
                                    <option value="discount_percent">Descuento Porcentual (% OFF sobre el precio)</option>
                                    <option value="fixed">Precio Fijo Promocional ($)</option>
                                    <option value="surcharge">Recargo Extra (%)</option>
                                </select>
                            </div>
                            <div>
                                <label style={{ ...labelStyle, marginBottom: '4px', color: '#10b981', fontWeight: '700' }}>
                                    {priceMode === 'fixed' ? 'Precio Promocional ($)' : 'Porcentaje (% de descuento)'}
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    value={priceVal}
                                    onChange={(e) => setPriceVal(e.target.value)}
                                    placeholder={priceMode === 'fixed' ? 'Ej: 8000' : 'Ej: 20 (para 20% OFF)'}
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
                        <label style={{ ...labelStyle, marginBottom: '4px' }}>Motivo o Título de la Promoción (Opcional)</label>
                        <input
                            type="text"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Ej: Martes 20% OFF baja demanda, Víspera de feriado, etc."
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
                            const typeLabels = {
                                closed: { label: 'Cerrado', color: '#ef4444', icon: '🚫' },
                                holiday: { label: 'Feriado', color: '#f59e0b', icon: '🎉' },
                                special_hours: { label: 'Horario Especial', color: '#3b82f6', icon: '🕐' },
                                special_price: { label: 'Precio Especial', color: '#10b981', icon: '🏷️' }
                            };
                            const typeInfo = typeLabels[day.type] || typeLabels.closed;

                            return (
                                <div key={day.id || index} style={{
                                    padding: '16px',
                                    background: 'var(--bg-main)',
                                    borderRadius: '12px',
                                    border: '1px solid var(--border)',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    gap: '16px'
                                }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                                            <span style={{ fontSize: '18px' }}>{typeInfo.icon}</span>
                                            <span style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>
                                                {new Date(day.date + 'T00:00:00').toLocaleDateString('es-AR', {
                                                    weekday: 'long',
                                                    year: 'numeric',
                                                    month: 'long',
                                                    day: 'numeric'
                                                })}
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                                            <span style={{
                                                padding: '3px 8px',
                                                borderRadius: '6px',
                                                background: `${typeInfo.color}20`,
                                                color: typeInfo.color,
                                                fontSize: '12px',
                                                fontWeight: '700'
                                            }}>
                                                {typeInfo.label}
                                            </span>
                                            {day.type === 'special_hours' && day.open && day.close && (
                                                <span style={{ fontSize: '13px', fontWeight: '700', color: '#3b82f6' }}>
                                                    {day.open} - {day.close} hs
                                                </span>
                                            )}
                                            {day.type === 'special_price' && day.priceVal !== undefined && (
                                                <span style={{ fontSize: '13px', fontWeight: '800', color: '#10b981' }}>
                                                    {day.priceMode === 'fixed'
                                                        ? `$${Number(day.priceVal).toLocaleString('es-AR')} Fijo`
                                                        : day.priceMode === 'surcharge'
                                                            ? `+${day.priceVal}% Recargo`
                                                            : `${day.priceVal}% OFF`}
                                                </span>
                                            )}
                                            {day.description && (
                                                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                                                    — {day.description}
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
                                            padding: '8px 12px',
                                            borderRadius: '8px',
                                            border: '1px solid #ef4444',
                                            background: 'rgba(239, 68, 68, 0.1)',
                                            color: '#ef4444',
                                            cursor: 'pointer',
                                            fontWeight: '600',
                                            fontSize: '13px'
                                        }}
                                        title="Eliminar día especial"
                                    >
                                        🗑️
                                    </button>
                                </div>
                            );
                        })}
                </div>
            ) : (
                <div style={{ textAlign: 'center', padding: '36px', background: 'var(--bg-main)', borderRadius: '12px' }}>
                    <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: 0 }}>
                        No hay días especiales o descuentos configurados.
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
