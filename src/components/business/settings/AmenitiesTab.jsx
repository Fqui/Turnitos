import React, { useState } from 'react';

export default function AmenitiesTab({
    formData,
    handleInputChange,
    handleSave,
    saving,
    inputStyle,
    buttonSecondaryStyle,
    saveButtonStyle
}) {
    const [newAmenity, setNewAmenity] = useState('');
    const currentAmenities = Array.isArray(formData.amenities) ? formData.amenities : [];

    const handleAdd = () => {
        if (newAmenity.trim()) {
            const updated = [...currentAmenities, newAmenity.trim()];
            handleInputChange('amenities', updated);
            setNewAmenity('');
        }
    };

    return (
        <div style={{ display: 'grid', gap: '20px' }}>
            <div style={{ background: 'var(--bg-main)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px' }}>
                <h4 style={{ fontSize: '16px', fontWeight: '800', margin: '0 0 8px 0', color: 'var(--text-primary)' }}>Comodidades e Instalaciones</h4>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 16px 0' }}>
                    Agrega las comodidades que ofrece tu negocio (ej: Wifi, Estacionamiento, Aire Acondicionado, Cafetería, etc.).
                </p>

                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                    <input
                        type="text"
                        style={inputStyle}
                        placeholder="Ej: Wifi gratis, Vestuarios, Aire Acondicionado..."
                        value={newAmenity}
                        onChange={(e) => setNewAmenity(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAdd();
                            }
                        }}
                    />
                    <button
                        type="button"
                        onClick={handleAdd}
                        style={{ ...buttonSecondaryStyle, padding: '0 24px', whiteSpace: 'nowrap' }}
                    >
                        + Agregar
                    </button>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {currentAmenities.length === 0 ? (
                        <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>No hay comodidades agregadas todavía.</p>
                    ) : (
                        currentAmenities.map((amenity, idx) => (
                            <span key={idx} style={{
                                padding: '8px 14px',
                                borderRadius: '20px',
                                background: 'var(--bg-card)',
                                border: '1px solid var(--border)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                fontSize: '13px',
                                fontWeight: '600',
                                color: 'var(--text-primary)'
                            }}>
                                <span>✨ {amenity}</span>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const updated = currentAmenities.filter((_, i) => i !== idx);
                                        handleInputChange('amenities', updated);
                                    }}
                                    style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '0 2px', color: '#EF4444', fontWeight: '800', fontSize: '14px' }}
                                    title="Eliminar comodidad"
                                >
                                    ✕
                                </button>
                            </span>
                        ))
                    )}
                </div>
            </div>

            <button
                type="button"
                onClick={() => handleSave({ amenities: formData.amenities })}
                style={saveButtonStyle}
                disabled={saving}
            >
                {saving ? 'Guardando...' : 'Guardar Comodidades'}
            </button>
        </div>
    );
}
