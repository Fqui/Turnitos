import React from 'react';

export default function AmenitiesSection({
    formData,
    newAmenity,
    setNewAmenity,
    addAmenity,
    removeAmenity
}) {
    return (
        <section>
            <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '16px', color: 'var(--text-primary)' }}>
                Amenidades
            </h3>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                <input
                    type="text"
                    value={newAmenity}
                    onChange={(e) => setNewAmenity(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addAmenity())}
                    style={{
                        flex: 1,
                        padding: '12px',
                        borderRadius: '10px',
                        border: '1px solid var(--border)',
                        backgroundColor: 'var(--bg-main)',
                        color: 'var(--text-primary)',
                        fontSize: '14px'
                    }}
                    placeholder="Ej: Wifi, Estacionamiento, Bar..."
                />
                <button
                    type="button"
                    onClick={addAmenity}
                    style={{
                        padding: '12px 24px',
                        borderRadius: '10px',
                        border: 'none',
                        backgroundColor: 'var(--primary-paddle)',
                        color: '#fff',
                        fontWeight: '600',
                        cursor: 'pointer'
                    }}
                >
                    + Agregar
                </button>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {(formData.amenities || []).map((amenity, index) => (
                    <span
                        key={index}
                        style={{
                            padding: '8px 12px',
                            borderRadius: '20px',
                            backgroundColor: 'var(--primary-paddle)20',
                            color: 'var(--primary-paddle)',
                            fontSize: '14px',
                            fontWeight: '600',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}
                    >
                        {amenity}
                        <button
                            type="button"
                            onClick={() => removeAmenity(index)}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--primary-paddle)',
                                cursor: 'pointer',
                                fontSize: '16px',
                                padding: '0',
                                lineHeight: '1'
                            }}
                        >
                            ×
                        </button>
                    </span>
                ))}
            </div>
        </section>
    );
}
