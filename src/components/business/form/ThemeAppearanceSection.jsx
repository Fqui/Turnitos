import React from 'react';

export default function ThemeAppearanceSection({ formData, setFormData }) {
    return (
        <section>
            <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '16px', color: 'var(--text-primary)' }}>
                🎨 Tema y Apariencia
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                Personaliza cómo se verá la página de perfil de tu negocio.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
                {/* Theme Selector */}
                <div>
                    <label style={{ display: 'block', marginBottom: '12px', fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                        Tema del Perfil
                    </label>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        {/* Light Theme Option */}
                        <button
                            type="button"
                            onClick={() => setFormData({ ...formData, theme: 'light' })}
                            style={{
                                flex: 1,
                                padding: '16px',
                                borderRadius: '12px',
                                border: formData.theme === 'light' ? '2px solid var(--primary-paddle)' : '2px solid var(--border)',
                                backgroundColor: formData.theme === 'light' ? 'var(--primary-paddle)10' : 'var(--bg-main)',
                                cursor: 'pointer',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '8px',
                                transition: 'all 0.2s'
                            }}
                        >
                            <div style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '8px',
                                background: 'linear-gradient(135deg, #ffffff 0%, #f5f5f5 100%)',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyCenter: 'center',
                                fontSize: '20px'
                            }}>
                                ☀️
                            </div>
                            <span style={{
                                fontSize: '14px',
                                fontWeight: formData.theme === 'light' ? '700' : '500',
                                color: formData.theme === 'light' ? 'var(--primary-paddle)' : 'var(--text-primary)'
                            }}>
                                Claro
                            </span>
                        </button>

                        {/* Dark Theme Option */}
                        <button
                            type="button"
                            onClick={() => setFormData({ ...formData, theme: 'dark' })}
                            style={{
                                flex: 1,
                                padding: '16px',
                                borderRadius: '12px',
                                border: formData.theme === 'dark' ? '2px solid var(--primary-paddle)' : '2px solid var(--border)',
                                backgroundColor: formData.theme === 'dark' ? 'var(--primary-paddle)10' : 'var(--bg-main)',
                                cursor: 'pointer',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '8px',
                                transition: 'all 0.2s'
                            }}
                        >
                            <div style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '8px',
                                background: 'linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%)',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyCenter: 'center',
                                fontSize: '20px'
                            }}>
                                🌙
                            </div>
                            <span style={{
                                fontSize: '14px',
                                fontWeight: formData.theme === 'dark' ? '700' : '500',
                                color: formData.theme === 'dark' ? 'var(--primary-paddle)' : 'var(--text-primary)'
                            }}>
                                Oscuro
                            </span>
                        </button>
                    </div>
                </div>

                {/* Color Picker */}
                <div>
                    <label style={{ display: 'block', marginBottom: '12px', fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                        Color de Botones y Acentos
                    </label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {/* Color Input */}
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                            <input
                                type="color"
                                value={formData.primaryColor || '#00E676'}
                                onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                                style={{
                                    width: '60px',
                                    height: '60px',
                                    border: '2px solid var(--border)',
                                    borderRadius: '12px',
                                    cursor: 'pointer'
                                }}
                            />
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '4px' }}>
                                    {formData.primaryColor || '#00E676'}
                                </div>
                                <input
                                    type="text"
                                    value={formData.primaryColor || '#00E676'}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        if (/^#[0-9A-Fa-f]{0,6}$/.test(value) || value === '') {
                                            setFormData({ ...formData, primaryColor: value });
                                        }
                                    }}
                                    placeholder="#00E676"
                                    style={{
                                        width: '100%',
                                        padding: '8px 12px',
                                        borderRadius: '8px',
                                        border: '1px solid var(--border)',
                                        backgroundColor: 'var(--bg-main)',
                                        color: 'var(--text-primary)',
                                        fontSize: '13px',
                                        fontFamily: 'monospace'
                                    }}
                                />
                            </div>
                        </div>

                        {/* Preset Colors */}
                        <div>
                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                                Colores Sugeridos:
                            </div>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                {[
                                    { name: 'Verde', color: '#00E676' },
                                    { name: 'Azul', color: '#2196F3' },
                                    { name: 'Púrpura', color: '#9C27B0' },
                                    { name: 'Naranja', color: '#FF9800' },
                                    { name: 'Rosa', color: '#E91E63' },
                                    { name: 'Cian', color: '#00BCD4' },
                                ].map((preset) => (
                                    <button
                                        key={preset.color}
                                        type="button"
                                        onClick={() => setFormData({ ...formData, primaryColor: preset.color })}
                                        title={preset.name}
                                        style={{
                                            width: '36px',
                                            height: '36px',
                                            borderRadius: '8px',
                                            border: formData.primaryColor === preset.color ? '3px solid var(--text-primary)' : '2px solid var(--border)',
                                            backgroundColor: preset.color,
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                            boxShadow: formData.primaryColor === preset.color ? '0 4px 12px rgba(0,0,0,0.2)' : 'none'
                                        }}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Preview */}
            <div style={{
                marginTop: '20px',
                padding: '20px',
                borderRadius: '12px',
                border: '2px solid var(--border)',
                backgroundColor: formData.theme === 'dark' ? '#0a0a0a' : '#ffffff',
                color: formData.theme === 'dark' ? '#ffffff' : '#000000'
            }}>
                <div style={{ fontSize: '12px', color: formData.theme === 'dark' ? '#888' : '#666', marginBottom: '12px', textTransform: 'uppercase', fontWeight: '600' }}>
                    Vista Previa
                </div>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <button
                        type="button"
                        style={{
                            padding: '12px 24px',
                            borderRadius: '12px',
                            border: 'none',
                            backgroundColor: formData.primaryColor || '#00E676',
                            color: '#fff',
                            fontWeight: '700',
                            cursor: 'default',
                            boxShadow: `0 4px 12px ${formData.primaryColor}40`
                        }}
                    >
                        Botón de Acción
                    </button>
                    <div style={{
                        padding: '8px 16px',
                        borderRadius: '20px',
                        backgroundColor: `${formData.primaryColor}20`,
                        color: formData.primaryColor,
                        fontSize: '14px',
                        fontWeight: '600'
                    }}>
                        Etiqueta de Categoría
                    </div>
                </div>
            </div>
        </section>
    );
}
