import React, { useState } from 'react';

export default function PromotionForm({ promotion, businesses = [], onSave, onCancel }) {
    const [formData, setFormData] = useState(promotion || {
        title: '',
        business_id: '', // Changed from businessId to match DB
        discount: '',
        image: ''
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    const handleBusinessChange = (businessId) => {
        setFormData({
            ...formData,
            business_id: businessId
        });
    };

    return (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <section>
                <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '16px', color: 'var(--text-primary)' }}>
                    Información de la Promoción
                </h3>

                <div style={{ display: 'grid', gap: '16px' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                            Título de la Promoción *
                        </label>
                        <input
                            type="text"
                            required
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            style={{
                                width: '100%',
                                padding: '12px',
                                borderRadius: '10px',
                                border: '1px solid var(--border)',
                                backgroundColor: 'var(--bg-main)',
                                color: 'var(--text-primary)',
                                fontSize: '14px'
                            }}
                            placeholder="Ej: Promo Verano 2024"
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                            Negocio *
                        </label>
                        <select
                            required
                            value={formData.business_id}
                            onChange={(e) => handleBusinessChange(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '12px',
                                borderRadius: '10px',
                                border: '1px solid var(--border)',
                                backgroundColor: 'var(--bg-main)',
                                color: 'var(--text-primary)',
                                fontSize: '14px'
                            }}
                        >
                            <option value="">Selecciona un negocio</option>
                            {businesses.map(business => (
                                <option key={business.id} value={business.id}>
                                    {business.name} ({business.category})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                            Descuento *
                        </label>
                        <input
                            type="text"
                            required
                            value={formData.discount}
                            onChange={(e) => setFormData({ ...formData, discount: e.target.value })}
                            style={{
                                width: '100%',
                                padding: '12px',
                                borderRadius: '10px',
                                border: '1px solid var(--border)',
                                backgroundColor: 'var(--bg-main)',
                                color: 'var(--text-primary)',
                                fontSize: '14px'
                            }}
                            placeholder="Ej: 20% OFF, 2x1, -$500"
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                            URL de Imagen *
                        </label>
                        <input
                            type="url"
                            required
                            value={formData.image}
                            onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                            style={{
                                width: '100%',
                                padding: '12px',
                                borderRadius: '10px',
                                border: '1px solid var(--border)',
                                backgroundColor: 'var(--bg-main)',
                                color: 'var(--text-primary)',
                                fontSize: '14px'
                            }}
                            placeholder="https://..."
                        />
                        {formData.image && (
                            <div style={{ marginTop: '12px', borderRadius: '12px', overflow: 'hidden', maxHeight: '200px' }}>
                                <img
                                    src={formData.image}
                                    alt="Preview"
                                    style={{ width: '100%', height: 'auto', objectFit: 'cover' }}
                                    onError={(e) => e.target.style.display = 'none'}
                                />
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '12px', paddingTop: '24px', borderTop: '1px solid var(--border)' }}>
                <button
                    type="button"
                    onClick={onCancel}
                    style={{
                        flex: 1,
                        padding: '16px',
                        borderRadius: '12px',
                        border: '1px solid var(--border)',
                        backgroundColor: 'transparent',
                        color: 'var(--text-secondary)',
                        fontWeight: '600',
                        fontSize: '16px',
                        cursor: 'pointer'
                    }}
                >
                    Cancelar
                </button>
                <button
                    type="submit"
                    style={{
                        flex: 2,
                        padding: '16px',
                        borderRadius: '12px',
                        border: 'none',
                        backgroundColor: 'var(--primary-paddle)',
                        color: '#fff',
                        fontWeight: '700',
                        fontSize: '16px',
                        cursor: 'pointer',
                        boxShadow: '0 4px 12px rgba(0,230,118,0.3)'
                    }}
                >
                    {promotion ? '💾 Guardar Cambios' : '✨ Crear Promoción'}
                </button>
            </div>
        </form>
    );
}
