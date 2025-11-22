import React, { useState } from 'react';

export default function CategoryForm({ category, onSave, onCancel }) {
    const [formData, setFormData] = useState(category || {
        id: '',
        name: '',
        icon: '📂'
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    const commonIcons = ['🎾', '⚽', '💇', '🏥', '💅', '🏋️', '🧘', '🎨', '✂️', '💆'];

    return (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <section>
                <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '16px', color: 'var(--text-primary)' }}>
                    Información de la Categoría
                </h3>

                <div style={{ display: 'grid', gap: '16px' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                            ID de la Categoría *
                        </label>
                        <input
                            type="text"
                            required
                            value={formData.id}
                            onChange={(e) => setFormData({ ...formData, id: e.target.value.toLowerCase().replace(/\s/g, '-') })}
                            style={{
                                width: '100%',
                                padding: '12px',
                                borderRadius: '10px',
                                border: '1px solid var(--border)',
                                backgroundColor: 'var(--bg-main)',
                                color: 'var(--text-primary)',
                                fontSize: '14px'
                            }}
                            placeholder="Ej: padel, futbol, belleza"
                            disabled={!!category}
                        />
                        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                            {category ? 'El ID no se puede modificar' : 'Solo letras minúsculas y guiones'}
                        </p>
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                            Nombre de la Categoría *
                        </label>
                        <input
                            type="text"
                            required
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            style={{
                                width: '100%',
                                padding: '12px',
                                borderRadius: '10px',
                                border: '1px solid var(--border)',
                                backgroundColor: 'var(--bg-main)',
                                color: 'var(--text-primary)',
                                fontSize: '14px'
                            }}
                            placeholder="Ej: Padel, Fútbol, Belleza"
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                            Icono *
                        </label>
                        <input
                            type="text"
                            required
                            value={formData.icon}
                            onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                            style={{
                                width: '100%',
                                padding: '12px',
                                borderRadius: '10px',
                                border: '1px solid var(--border)',
                                backgroundColor: 'var(--bg-main)',
                                color: 'var(--text-primary)',
                                fontSize: '24px',
                                textAlign: 'center'
                            }}
                            placeholder="Emoji"
                        />
                        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '8px', marginBottom: '8px' }}>
                            Iconos sugeridos:
                        </p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                            {commonIcons.map(icon => (
                                <button
                                    key={icon}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, icon })}
                                    style={{
                                        padding: '8px 12px',
                                        borderRadius: '8px',
                                        border: formData.icon === icon ? '2px solid var(--primary-paddle)' : '1px solid var(--border)',
                                        backgroundColor: formData.icon === icon ? 'var(--primary-paddle)10' : 'var(--bg-card)',
                                        fontSize: '24px',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    {icon}
                                </button>
                            ))}
                        </div>
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
                    {category ? '💾 Guardar Cambios' : '✨ Crear Categoría'}
                </button>
            </div>
        </form>
    );
}
