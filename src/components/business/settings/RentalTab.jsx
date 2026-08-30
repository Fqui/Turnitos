import React from 'react';

export default function RentalTab({
    formData,
    handleInputChange,
    handleSave,
    saving,
    handleAdditionalServiceChange,
    addAdditionalService,
    removeAdditionalService
}) {
    const isDaily = formData.pricing_model === 'daily';

    return (
        <div style={{ display: 'grid', gap: '32px' }}>
            {/* 1. Pricing Model */}
            <div style={{ padding: '24px', background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border)' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '16px', color: 'var(--text-primary)' }}>Modelo de Precios</h3>
                <div style={{ display: 'flex', gap: '16px' }}>
                    <label style={{
                        flex: 1,
                        padding: '16px',
                        border: isDaily ? '2px solid transparent' : '2px solid var(--primary-paddle)',
                        background: isDaily ? 'var(--bg-main)' : 'rgba(var(--primary-rgb), 0.1)',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px'
                    }}>
                        <input
                            type="radio"
                            name="pricing_model"
                            value="hourly"
                            checked={!isDaily}
                            onChange={() => handleInputChange('pricing_model', 'hourly')}
                            style={{ width: '20px', height: '20px', accentColor: 'var(--primary-paddle)' }}
                        />
                        <div>
                            <div style={{ fontWeight: '700', color: 'var(--text-primary)' }}>Por Hora</div>
                            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>El cliente elige cantidad de horas</div>
                        </div>
                    </label>
                    <label style={{
                        flex: 1,
                        padding: '16px',
                        border: isDaily ? '2px solid var(--primary-paddle)' : '2px solid transparent',
                        background: isDaily ? 'rgba(var(--primary-rgb), 0.1)' : 'var(--bg-main)',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px'
                    }}>
                        <input
                            type="radio"
                            name="pricing_model"
                            value="daily"
                            checked={isDaily}
                            onChange={() => handleInputChange('pricing_model', 'daily')}
                            style={{ width: '20px', height: '20px', accentColor: 'var(--primary-paddle)' }}
                        />
                        <div>
                            <div style={{ fontWeight: '700', color: 'var(--text-primary)' }}>Por Día (Fijo)</div>
                            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Precio fijo por fecha completa</div>
                        </div>
                    </label>
                </div>

                <div style={{ marginTop: '24px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                        {isDaily ? 'Precio por Día Completo ($)' : 'Precio Base por Hora ($)'}
                    </label>
                    <input
                        type="number"
                        value={isDaily ? (formData.price_per_day || '') : (formData.price_per_hour || '')}
                        onChange={(e) => handleInputChange(isDaily ? 'price_per_day' : 'price_per_hour', parseFloat(e.target.value))}
                        placeholder="0.00"
                        style={{
                            width: '100%',
                            padding: '12px',
                            borderRadius: '8px',
                            border: '1px solid var(--border)',
                            background: 'var(--bg-main)',
                            color: 'var(--text-primary)',
                            fontSize: '16px',
                            fontWeight: '600'
                        }}
                    />
                </div>

                {!isDaily && (
                    <div style={{ marginTop: '24px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                            Opciones de Duración Permitidas
                        </label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                            {[4, 5, 6, 8, 10, 12, 24].map(hours => {
                                const selected = (formData.rental_duration_options || []).includes(hours);
                                return (
                                    <button
                                        key={hours}
                                        type="button"
                                        onClick={() => {
                                            const current = formData.rental_duration_options || [];
                                            const updated = selected
                                                ? current.filter(h => h !== hours)
                                                : [...current, hours].sort((a, b) => a - b);
                                            handleInputChange('rental_duration_options', updated);
                                        }}
                                        style={{
                                            padding: '8px 16px',
                                            borderRadius: '20px',
                                            border: selected ? '2px solid var(--primary-paddle)' : '1px solid var(--border)',
                                            background: selected ? 'var(--primary-paddle)' : 'transparent',
                                            color: selected ? '#000' : 'var(--text-secondary)',
                                            fontWeight: '600',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        {hours} hs
                                    </button>
                                );
                            })}
                        </div>
                        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
                            Selecciona las duraciones que los clientes pueden elegir.
                        </p>
                    </div>
                )}
            </div>

            {/* 1.5 Capacity Settings */}
            <div style={{ padding: '24px', background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border)' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '16px', color: 'var(--text-primary)' }}>Capacidad</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                            Capacidad Máxima de Invitados
                        </label>
                        <input
                            type="number"
                            value={formData.max_capacity || 100}
                            onChange={(e) => handleInputChange('max_capacity', parseInt(e.target.value))}
                            placeholder="100"
                            style={{
                                width: '100%',
                                padding: '12px',
                                borderRadius: '8px',
                                border: '1px solid var(--border)',
                                background: 'var(--bg-main)',
                                color: 'var(--text-primary)',
                                fontSize: '16px',
                                fontWeight: '600'
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* 1.6 Pricing Tiers */}
            {!isDaily && (
                <div style={{ padding: '24px', background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: '800', margin: 0, color: 'var(--text-primary)' }}>Escalones de Precio por Invitados</h3>
                        <button
                            type="button"
                            onClick={() => {
                                const tiers = [...(formData.pricing_tiers || [])];
                                const lastTier = tiers[tiers.length - 1];
                                const newMin = lastTier ? lastTier.max + 1 : 1;
                                tiers.push({ min: newMin, max: newMin + 29, price: formData.price_per_hour || 0, label: `${newMin}-${newMin + 29} personas` });
                                handleInputChange('pricing_tiers', tiers);
                            }}
                            style={{
                                background: 'rgba(var(--primary-rgb), 0.1)',
                                color: 'var(--primary-paddle)',
                                border: 'none',
                                padding: '8px 16px',
                                borderRadius: '8px',
                                fontWeight: '700',
                                cursor: 'pointer'
                            }}
                        >
                            + Agregar Escalón
                        </button>
                    </div>

                    {(formData.pricing_tiers || []).length === 0 ? (
                        <div style={{ padding: '20px', background: 'var(--bg-main)', borderRadius: '12px', textAlign: 'center' }}>
                            <p style={{ color: 'var(--text-muted)', margin: 0 }}>Sin escalones configurados. Se usará el precio base para todos.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gap: '12px' }}>
                            {(formData.pricing_tiers || []).map((tier, index) => (
                                <div key={index} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '12px', alignItems: 'center', padding: '12px', background: 'var(--bg-main)', borderRadius: '12px' }}>
                                    <div>
                                        <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>Mínimo</label>
                                        <input
                                            type="number"
                                            value={tier.min || 1}
                                            onChange={(e) => {
                                                const tiers = [...formData.pricing_tiers];
                                                tiers[index] = { ...tier, min: parseInt(e.target.value), label: `${e.target.value}-${tier.max} personas` };
                                                handleInputChange('pricing_tiers', tiers);
                                            }}
                                            style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>Máximo</label>
                                        <input
                                            type="number"
                                            value={tier.max || 30}
                                            onChange={(e) => {
                                                const tiers = [...formData.pricing_tiers];
                                                tiers[index] = { ...tier, max: parseInt(e.target.value), label: `${tier.min}-${e.target.value} personas` };
                                                handleInputChange('pricing_tiers', tiers);
                                            }}
                                            style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>Precio/hora</label>
                                        <input
                                            type="number"
                                            value={tier.price || 0}
                                            onChange={(e) => {
                                                const tiers = [...formData.pricing_tiers];
                                                tiers[index] = { ...tier, price: parseFloat(e.target.value) };
                                                handleInputChange('pricing_tiers', tiers);
                                            }}
                                            style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)' }}
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const tiers = formData.pricing_tiers.filter((_, i) => i !== index);
                                            handleInputChange('pricing_tiers', tiers);
                                        }}
                                        style={{ color: '#ef4444', background: 'transparent', border: 'none', cursor: 'pointer', padding: '8px', marginTop: '16px' }}
                                        title="Eliminar"
                                    >
                                        🗑️
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '12px' }}>
                        💡 Configura precios diferentes según la cantidad de invitados. Ej: 1-30 personas = $3000/hora, 31-60 = $4500/hora
                    </p>
                </div>
            )}

            {/* 1.7 Blocked Dates */}
            <div style={{ padding: '24px', background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: '800', margin: 0, color: 'var(--text-primary)' }}>Fechas Bloqueadas</h3>
                    <button
                        type="button"
                        onClick={() => {
                            const dates = [...(formData.blocked_dates || [])];
                            const tomorrow = new Date();
                            tomorrow.setDate(tomorrow.getDate() + 1);
                            dates.push({ date: tomorrow.toISOString().split('T')[0], reason: '' });
                            handleInputChange('blocked_dates', dates);
                        }}
                        style={{
                            background: 'rgba(var(--primary-rgb), 0.1)',
                            color: 'var(--primary-paddle)',
                            border: 'none',
                            padding: '8px 16px',
                            borderRadius: '8px',
                            fontWeight: '700',
                            cursor: 'pointer'
                        }}
                    >
                        + Bloquear Fecha
                    </button>
                </div>

                {(formData.blocked_dates || []).length === 0 ? (
                    <div style={{ padding: '20px', background: 'var(--bg-main)', borderRadius: '12px', textAlign: 'center' }}>
                        <p style={{ color: 'var(--text-muted)', margin: 0 }}>No hay fechas bloqueadas. Todas las fechas están disponibles.</p>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gap: '12px' }}>
                        {(formData.blocked_dates || []).map((blocked, index) => (
                            <div key={index} style={{ display: 'grid', gridTemplateColumns: '1fr 2fr auto', gap: '12px', alignItems: 'center', padding: '12px', background: 'var(--bg-main)', borderRadius: '12px' }}>
                                <input
                                    type="date"
                                    value={blocked.date || ''}
                                    onChange={(e) => {
                                        const dates = [...formData.blocked_dates];
                                        dates[index] = { ...blocked, date: e.target.value };
                                        handleInputChange('blocked_dates', dates);
                                    }}
                                    style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)' }}
                                />
                                <input
                                    type="text"
                                    placeholder="Motivo (ej: Evento privado)"
                                    value={blocked.reason || ''}
                                    onChange={(e) => {
                                        const dates = [...formData.blocked_dates];
                                        dates[index] = { ...blocked, reason: e.target.value };
                                        handleInputChange('blocked_dates', dates);
                                    }}
                                    style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)' }}
                                />
                                <button
                                    type="button"
                                    onClick={() => {
                                        const dates = formData.blocked_dates.filter((_, i) => i !== index);
                                        handleInputChange('blocked_dates', dates);
                                    }}
                                    style={{ color: '#ef4444', background: 'transparent', border: 'none', cursor: 'pointer', padding: '8px' }}
                                    title="Eliminar"
                                >
                                    🗑️
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* 2. Additional Services */}
            <div style={{ padding: '24px', background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: '800', margin: 0, color: 'var(--text-primary)' }}>Servicios Adicionales</h3>
                    <button
                        type="button"
                        onClick={addAdditionalService}
                        style={{
                            background: 'rgba(var(--primary-rgb), 0.1)',
                            color: 'var(--primary-paddle)',
                            border: 'none',
                            padding: '8px 16px',
                            borderRadius: '8px',
                            fontWeight: '700',
                            cursor: 'pointer'
                        }}
                    >
                        + Agregar
                    </button>
                </div>

                {(formData.additional_services || []).length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No hay servicios adicionales configurados.</p>
                ) : (
                    <div style={{ display: 'grid', gap: '12px' }}>
                        {(formData.additional_services || []).map((service, index) => (
                            <div key={index} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                <input
                                    type="text"
                                    placeholder="Nombre (ej: Limpieza)"
                                    value={service.name || ''}
                                    onChange={(e) => handleAdditionalServiceChange(index, 'name', e.target.value)}
                                    style={{ flex: 2, padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-primary)' }}
                                />
                                <input
                                    type="number"
                                    placeholder="Precio"
                                    value={service.price || ''}
                                    onChange={(e) => handleAdditionalServiceChange(index, 'price', parseFloat(e.target.value))}
                                    style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-primary)' }}
                                />
                                <button
                                    type="button"
                                    onClick={() => removeAdditionalService(index)}
                                    style={{ color: '#ef4444', background: 'transparent', border: 'none', cursor: 'pointer', padding: '8px' }}
                                    title="Eliminar"
                                >
                                    🗑️
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* 3. Included Amenities */}
            <div style={{ padding: '24px', background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border)' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '16px', color: 'var(--text-primary)' }}>Comodidades Incluidas</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '12px' }}>
                    {['Wifi', 'Estacionamiento', 'Cocina', 'Parrilla', 'Piscina', 'Aire Acondicionado', 'Calefacción', 'Vajilla', 'Heladera', 'Freezer', 'Mesas y Sillas', 'Equipo de Audio', 'Proyector'].map(amenity => {
                        const included = (formData.included_amenities || []).includes(amenity);
                        return (
                            <label key={amenity} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                                <input
                                    type="checkbox"
                                    checked={included}
                                    onChange={() => {
                                        const current = formData.included_amenities || [];
                                        const updated = included
                                            ? current.filter(a => a !== amenity)
                                            : [...current, amenity];
                                        handleInputChange('included_amenities', updated);
                                    }}
                                    style={{ accentColor: 'var(--primary-paddle)' }}
                                />
                                <span style={{ fontSize: '14px' }}>{amenity}</span>
                            </label>
                        );
                    })}
                </div>
            </div>

            {/* Save Button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '24px', background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border)' }}>
                <button
                    type="button"
                    onClick={() => handleSave()}
                    disabled={saving}
                    style={{
                        padding: '14px 32px',
                        borderRadius: '12px',
                        background: saving ? 'var(--border)' : 'var(--primary-paddle)',
                        color: saving ? 'var(--text-secondary)' : '#000',
                        border: 'none',
                        fontWeight: '700',
                        fontSize: '15px',
                        cursor: saving ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s'
                    }}
                >
                    {saving ? 'Guardando...' : 'Guardar Cambios'}
                </button>
            </div>
        </div>
    );
}
