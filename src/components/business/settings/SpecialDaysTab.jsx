import React from 'react';

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

    return (
        <div style={{ display: 'grid', gap: '24px' }}>
            <div>
                <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '8px', color: 'var(--text-primary)' }}>
                    Días Especiales y Feriados
                </h3>
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
                    Marca días cerrados, feriados o con horarios/precios especiales.
                </p>
            </div>

            {/* Add New Special Day */}
            <div style={{ padding: '20px', background: 'var(--bg-main)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                <h4 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '16px', color: 'var(--text-primary)' }}>
                    Agregar Día Especial
                </h4>
                <div style={{ display: 'grid', gap: '12px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px' }}>
                        <div>
                            <label style={{ ...labelStyle, marginBottom: '4px' }}>Fecha</label>
                            <input
                                type="date"
                                id="new-special-day-date"
                                style={inputStyle}
                            />
                        </div>
                        <div>
                            <label style={{ ...labelStyle, marginBottom: '4px' }}>Tipo</label>
                            <select
                                id="new-special-day-type"
                                style={inputStyle}
                                onChange={(e) => {
                                    const type = e.target.value;
                                    const hoursContainer = document.getElementById('special-hours-fields');
                                    const priceContainer = document.getElementById('special-price-fields');
                                    if (hoursContainer) hoursContainer.style.display = (type === 'special_hours') ? 'grid' : 'none';
                                    if (priceContainer) priceContainer.style.display = (type === 'special_price') ? 'grid' : 'none';
                                }}
                            >
                                <option value="closed">🚫 Cerrado (No se aceptan reservas)</option>
                                <option value="holiday">🎉 Feriado</option>
                                <option value="special_hours">🕐 Horario Especial</option>
                                <option value="special_price">💰 Precio Especial / Recargo</option>
                            </select>
                        </div>
                    </div>

                    {/* Dynamic Fields: Horario Especial */}
                    <div
                        id="special-hours-fields"
                        style={{ display: 'none', gridTemplateColumns: '1fr 1fr', gap: '12px', padding: '12px', background: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--border)' }}
                    >
                        <div>
                            <label style={{ ...labelStyle, marginBottom: '4px' }}>Apertura Especial</label>
                            <input type="time" id="new-special-day-open" defaultValue="09:00" style={inputStyle} />
                        </div>
                        <div>
                            <label style={{ ...labelStyle, marginBottom: '4px' }}>Cierre Especial</label>
                            <input type="time" id="new-special-day-close" defaultValue="18:00" style={inputStyle} />
                        </div>
                    </div>

                    {/* Dynamic Fields: Precio Especial */}
                    <div
                        id="special-price-fields"
                        style={{ display: 'none', gridTemplateColumns: '1fr 1fr', gap: '12px', padding: '12px', background: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--border)' }}
                    >
                        <div>
                            <label style={{ ...labelStyle, marginBottom: '4px' }}>Variación de Precio</label>
                            <select id="new-special-day-price-mode" style={inputStyle}>
                                <option value="fixed">Precio Fijo ($)</option>
                                <option value="multiplier">Porcentaje Extra (%)</option>
                            </select>
                        </div>
                        <div>
                            <label style={{ ...labelStyle, marginBottom: '4px' }}>Valor</label>
                            <input type="number" id="new-special-day-price-val" placeholder="Ej: 15000 o 20" style={inputStyle} />
                        </div>
                    </div>

                    <div>
                        <label style={{ ...labelStyle, marginBottom: '4px' }}>Descripción / Motivo</label>
                        <input
                            type="text"
                            id="new-special-day-description"
                            placeholder="Ej: Navidad, Año Nuevo, Promoción Feriado"
                            style={inputStyle}
                        />
                    </div>
                    <button
                        type="button"
                        onClick={() => {
                            const dateInput = document.getElementById('new-special-day-date');
                            const typeInput = document.getElementById('new-special-day-type');
                            const descInput = document.getElementById('new-special-day-description');

                            if (!dateInput?.value) {
                                showToast('Por favor selecciona una fecha', 'warning');
                                return;
                            }

                            const type = typeInput.value;
                            const openInput = document.getElementById('new-special-day-open');
                            const closeInput = document.getElementById('new-special-day-close');
                            const priceModeInput = document.getElementById('new-special-day-price-mode');
                            const priceValInput = document.getElementById('new-special-day-price-val');

                            const newSpecialDay = {
                                id: `special_${Date.now()}`,
                                date: dateInput.value,
                                type: type,
                                description: descInput?.value || typeInput.options[typeInput.selectedIndex].text,
                                open: type === 'special_hours' ? openInput?.value : null,
                                close: type === 'special_hours' ? closeInput?.value : null,
                                priceMode: type === 'special_price' ? priceModeInput?.value : null,
                                priceVal: type === 'special_price' ? parseFloat(priceValInput?.value) || 0 : null
                            };

                            const updatedDays = [...specialDays, newSpecialDay];
                            handleInputChange('special_days', updatedDays);

                            dateInput.value = '';
                            typeInput.value = 'closed';
                            if (descInput) descInput.value = '';
                            const hoursContainer = document.getElementById('special-hours-fields');
                            const priceContainer = document.getElementById('special-price-fields');
                            if (hoursContainer) hoursContainer.style.display = 'none';
                            if (priceContainer) priceContainer.style.display = 'none';

                            showToast('Día especial agregado', 'success');
                        }}
                        style={{
                            padding: '10px 16px',
                            borderRadius: '8px',
                            border: 'none',
                            background: 'var(--primary-paddle)',
                            color: '#000',
                            cursor: 'pointer',
                            fontWeight: '700',
                            fontSize: '14px'
                        }}
                    >
                        + Agregar Día Especial
                    </button>
                </div>
            </div>

            {/* List of Special Days */}
            {specialDays.length > 0 ? (
                <div style={{ display: 'grid', gap: '12px' }}>
                    {specialDays
                        .sort((a, b) => new Date(a.date) - new Date(b.date))
                        .map((day, index) => {
                            const typeLabels = {
                                closed: { label: 'Cerrado', color: '#ef4444', icon: '🚫' },
                                holiday: { label: 'Feriado', color: '#f59e0b', icon: '🎉' },
                                special_hours: { label: 'Horario Especial', color: '#3b82f6', icon: '🕐' },
                                special_price: { label: 'Precio Especial', color: '#10b981', icon: '💰' }
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
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                            <span style={{ fontSize: '16px' }}>{typeInfo.icon}</span>
                                            <span style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>
                                                {new Date(day.date + 'T00:00:00').toLocaleDateString('es-AR', {
                                                    weekday: 'long',
                                                    year: 'numeric',
                                                    month: 'long',
                                                    day: 'numeric'
                                                })}
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                                            <span style={{
                                                padding: '4px 8px',
                                                borderRadius: '6px',
                                                background: `${typeInfo.color}20`,
                                                color: typeInfo.color,
                                                fontSize: '12px',
                                                fontWeight: '600'
                                            }}>
                                                {typeInfo.label}
                                            </span>
                                            {day.type === 'special_hours' && day.open && day.close && (
                                                <span style={{ fontSize: '13px', fontWeight: '700', color: '#3b82f6' }}>
                                                    {day.open} - {day.close} hs
                                                </span>
                                            )}
                                            {day.type === 'special_price' && day.priceVal !== undefined && (
                                                <span style={{ fontSize: '13px', fontWeight: '700', color: '#10b981' }}>
                                                    {day.priceMode === 'multiplier' ? `+${day.priceVal}%` : `$${day.priceVal.toLocaleString('es-AR')}`}
                                                </span>
                                            )}
                                            {day.description && (
                                                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                                                    ({day.description})
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={async () => {
                                            const confirmed = await showConfirm(
                                                '¿Eliminar día especial?',
                                                `¿Estás seguro de eliminar este día especial?`,
                                                'Eliminar',
                                                'Cancelar'
                                            );
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
                                    >
                                        🗑️
                                    </button>
                                </div>
                            );
                        })}
                </div>
            ) : (
                <div style={{ textAlign: 'center', padding: '40px', background: 'var(--bg-main)', borderRadius: '12px' }}>
                    <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                        No hay días especiales configurados.
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
