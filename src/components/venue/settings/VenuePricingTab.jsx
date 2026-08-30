import React from 'react';

export default function VenuePricingTab({
    formData,
    handleCapacityChange,
    handleInputChange,
    handleDurationDiscountChange,
    addTier,
    updateTier,
    removeTier,
    cardStyle,
    sectionTitleStyle,
    labelStyle,
    inputStyle,
    buttonStyle
}) {
    return (
        <div style={cardStyle}>
            <h2 style={sectionTitleStyle}>Precios y Capacidad</h2>

            <div style={{ marginBottom: '24px' }}>
                <label style={labelStyle}>Capacidad Máxima (personas) *</label>
                <input
                    type="number"
                    style={inputStyle}
                    value={formData.capacity_limit || ''}
                    onChange={e => handleCapacityChange(e.target.value)}
                    placeholder="Ej: 85"
                />
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    Límite máximo de personas permitidas. Al ingresar la capacidad, se establece automáticamente el rango inicial desde 5 hasta la capacidad máxima.
                </p>
            </div>

            <div style={{ marginBottom: '30px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                    <label style={{ ...labelStyle, margin: 0 }}>Esquema de Precios por Cantidad de Personas *</label>
                    <span style={{
                        fontSize: '12px',
                        fontWeight: '700',
                        color: 'var(--primary-paddle, #84CC16)',
                        background: 'rgba(132, 204, 22, 0.1)',
                        padding: '4px 10px',
                        borderRadius: '8px'
                    }}>
                        Capacidad del local: hasta {formData.capacity_limit || formData.max_capacity || 100} personas
                    </span>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '14px' }}>
                    Define cuánto cobras por hora según la cantidad de invitados. Cada rango se ajusta automáticamente dentro de tu capacidad máxima.
                </p>

                {(!formData.pricing_tiers || formData.pricing_tiers.length === 0) && (
                    <div style={{ padding: '16px', background: 'rgba(239, 68, 68, 0.1)', border: '1px dashed #ef4444', borderRadius: '10px', marginBottom: '16px', color: 'var(--text-primary)', fontSize: '13px' }}>
                        ⚠️ Ingresa la capacidad máxima o haz clic en <strong>"+ Agregar Rango de Precios"</strong> para configurar los precios.
                    </div>
                )}
                {formData.pricing_tiers?.map((tier, index) => (
                    <div key={index} style={{ display: 'flex', gap: '10px', marginBottom: '10px', alignItems: 'center', background: 'var(--bg-card)', padding: '12px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                        <div style={{ flex: 1 }}>
                            <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)' }}>Desde (personas)</label>
                            <input type="number" style={inputStyle} value={tier.min_guests} onChange={e => updateTier(index, 'min_guests', e.target.value)} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)' }}>Hasta (personas)</label>
                            <input
                                type="number"
                                max={formData.capacity_limit || formData.max_capacity || 100}
                                style={inputStyle}
                                value={tier.max_guests}
                                onChange={e => updateTier(index, 'max_guests', e.target.value)}
                            />
                        </div>
                        <div style={{ flex: 1.5 }}>
                            <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)' }}>Precio por Hora ($) *</label>
                            <input type="number" style={inputStyle} value={tier.price} placeholder="Ej: 50000" onChange={e => updateTier(index, 'price', e.target.value)} />
                        </div>
                        <button
                            type="button"
                            onClick={() => removeTier(index)}
                            style={{
                                background: 'rgba(239, 68, 68, 0.1)',
                                border: '1px solid rgba(239, 68, 68, 0.2)',
                                borderRadius: '8px',
                                color: '#ef4444',
                                cursor: 'pointer',
                                marginTop: '15px',
                                width: '36px',
                                height: '36px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '15px'
                            }}
                            title="Eliminar rango"
                        >
                            🗑️
                        </button>
                    </div>
                ))}
                <button
                    type="button"
                    onClick={addTier}
                    style={{
                        ...buttonStyle,
                        background: 'transparent',
                        border: '1.5px dashed var(--primary-paddle)',
                        color: 'var(--text-primary)',
                        width: '100%',
                        padding: '12px',
                        marginTop: '8px',
                        fontWeight: '700'
                    }}
                >
                    + Agregar Rango de Precios (Subdividir Capacidad)
                </button>
            </div>

            <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label style={labelStyle}>Opciones de Duración y Descuentos por Horas *</label>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                    Selecciona qué duraciones permites y asigna un % de descuento opcional para cobrar menos en reservas de mayor cantidad de horas (ej: 0% en 4 hs, 10% en 8 hs, 20% en 12 hs).
                </p>

                {(!formData.rental_duration_options || formData.rental_duration_options.length === 0) && (
                    <p style={{ fontSize: '12px', color: '#ef4444', marginBottom: '12px' }}>
                        ⚠️ Debes seleccionar al menos una duración permitida.
                    </p>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
                    {[4, 6, 8, 12, 24].map(hours => {
                        const isSelected = (formData.rental_duration_options || []).includes(hours);
                        const discount = formData.duration_discounts?.[hours] || 0;

                        return (
                            <div
                                key={hours}
                                style={{
                                    background: isSelected ? 'rgba(132, 204, 22, 0.08)' : 'var(--bg-card)',
                                    border: isSelected ? '1.5px solid var(--primary-paddle)' : '1px solid var(--border)',
                                    borderRadius: '12px',
                                    padding: '14px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '10px',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontWeight: '700', fontSize: '14px' }}>
                                    <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={(e) => {
                                            const current = formData.rental_duration_options || [];
                                            if (e.target.checked) {
                                                handleInputChange('rental_duration_options', [...current, hours].sort((a, b) => a - b));
                                            } else {
                                                handleInputChange('rental_duration_options', current.filter(h => h !== hours));
                                            }
                                        }}
                                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                    />
                                    <span>⏱️ {hours} Horas</span>
                                </label>

                                {isSelected && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px', background: 'var(--bg-main)', padding: '6px 10px', borderRadius: '8px' }}>
                                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>Descuento:</span>
                                        <input
                                            type="number"
                                            min="0"
                                            max="100"
                                            value={discount}
                                            onChange={(e) => handleDurationDiscountChange(hours, e.target.value)}
                                            style={{ ...inputStyle, width: '55px', padding: '4px 6px', textAlign: 'center', fontSize: '13px' }}
                                        />
                                        <span style={{ fontSize: '12px', fontWeight: '700' }}>%</span>
                                        {discount > 0 && (
                                            <span style={{ marginLeft: 'auto', fontSize: '11px', background: '#10B981', color: 'white', padding: '2px 6px', borderRadius: '6px', fontWeight: '700' }}>
                                                {discount}% OFF
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
