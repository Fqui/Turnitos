import React from 'react';
import serviceAdapter from '../../../services/serviceAdapter';

export default function VenueAppearanceTab({
    formData,
    handleInputChange,
    saveChanges,
    saving,
    isMobile,
    showToast,
    cardStyle,
    sectionTitleStyle,
    labelStyle,
    inputStyle,
    buttonStyle
}) {
    return (
        <div style={cardStyle}>
            <h2 style={sectionTitleStyle}>🎨 Apariencia y Marca</h2>

            {/* Theme Selector */}
            <div style={{ marginBottom: '32px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '8px', color: 'var(--text-primary)' }}>Estilo de Tema General</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                    Seleccioná la estética general de tu página pública (Modo Claro limpio o Modo Oscuro elegante).
                </p>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                    {[
                        { id: 'light', label: '☀️ Modo Claro', desc: 'Fondo luminoso, diseño de alta visibilidad' },
                        { id: 'dark', label: '🌙 Modo Oscuro', desc: 'Fondo oscuro elegante, ideal para eventos nocturnos' }
                    ].map(t => (
                        <div
                            key={t.id}
                            onClick={() => handleInputChange('theme', t.id)}
                            style={{
                                flex: '1 1 200px',
                                padding: '16px',
                                borderRadius: '14px',
                                background: t.id === 'dark' ? '#1E293B' : 'white',
                                color: t.id === 'dark' ? '#F8FAFC' : '#1E293B',
                                border: (formData.theme || 'light') === t.id ? '2px solid var(--primary-paddle)' : '1px solid var(--border)',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                boxShadow: (formData.theme || 'light') === t.id ? '0 4px 12px rgba(0,0,0,0.1)' : 'none'
                            }}
                        >
                            <div style={{ fontWeight: '800', fontSize: '15px', marginBottom: '4px' }}>{t.label}</div>
                            <div style={{ fontSize: '12px', opacity: 0.8 }}>{t.desc}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Color Palette Selector */}
            <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '8px', color: 'var(--text-primary)' }}>Color Principal de Marca</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                    Este color teñirá los botones de reserva, precios destacados y acentos en la página de tu predio.
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                    <input
                        type="color"
                        value={formData.primary_color || '#84CC16'}
                        onChange={e => {
                            handleInputChange('primary_color', e.target.value);
                            handleInputChange('button_color', e.target.value);
                        }}
                        style={{
                            width: '56px',
                            height: '56px',
                            padding: '0',
                            border: 'none',
                            borderRadius: '12px',
                            cursor: 'pointer',
                            background: 'none'
                        }}
                    />
                    <input
                        type="text"
                        value={formData.primary_color || '#84CC16'}
                        onChange={e => {
                            handleInputChange('primary_color', e.target.value);
                            handleInputChange('button_color', e.target.value);
                        }}
                        style={{ ...inputStyle, width: '130px', fontWeight: '600', fontFamily: 'monospace' }}
                        placeholder="#84CC16"
                    />
                </div>
            </div>

            {/* Preset Colors */}
            <div style={{ marginBottom: '32px' }}>
                <label style={labelStyle}>Colores Recomendados para Alquileres</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '10px' }}>
                    {[
                        { color: '#84CC16', label: 'Verde Lima / Natura' },
                        { color: '#FF5722', label: 'Naranja Warm' },
                        { color: '#0284C7', label: 'Azul Piscina' },
                        { color: '#059669', label: 'Verde Esmeralda' },
                        { color: '#D97706', label: 'Ámbar Cálido' },
                        { color: '#7C3AED', label: 'Violeta Premium' },
                        { color: '#E11D48', label: 'Coral Vivo' },
                        { color: '#1E293B', label: 'Oscuro Elegante' }
                    ].map(item => (
                        <div
                            key={item.color}
                            onClick={() => {
                                handleInputChange('primary_color', item.color);
                                handleInputChange('button_color', item.color);
                            }}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '8px 14px',
                                borderRadius: '10px',
                                background: 'var(--bg-card)',
                                border: (formData.primary_color === item.color || (!formData.primary_color && item.color === '#84CC16'))
                                    ? '2px solid var(--text-primary)'
                                    : '1px solid var(--border)',
                                cursor: 'pointer',
                                fontSize: '13px',
                                fontWeight: '600',
                                transition: 'all 0.2s'
                            }}
                        >
                            <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: item.color }} />
                            <span>{item.label}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Banner & Logo Customization */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
                <div>
                    <label style={labelStyle}>Logo del Predio</label>
                    {(formData.logo || formData.logo_url) && (
                        <img src={formData.logo || formData.logo_url} alt="Logo preview" style={{ width: '80px', height: '80px', borderRadius: '12px', objectFit: 'cover', marginBottom: '12px', border: '1px solid var(--border)' }} />
                    )}
                    <input
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                                showToast('Subiendo logo...', 'info');
                                const url = await serviceAdapter.uploadImage(file);
                                handleInputChange('logo', url);
                                handleInputChange('logo_url', url);
                                showToast('Logo actualizado', 'success');
                            }
                        }}
                        style={inputStyle}
                    />
                </div>
                <div>
                    <label style={labelStyle}>Foto de Portada / Banner</label>
                    {(formData.banner_image || formData.banner_url) && (
                        <img src={formData.banner_image || formData.banner_url} alt="Banner preview" style={{ width: '100%', height: '80px', borderRadius: '12px', objectFit: 'cover', marginBottom: '12px', border: '1px solid var(--border)' }} />
                    )}
                    <input
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                                showToast('Subiendo banner...', 'info');
                                const url = await serviceAdapter.uploadImage(file);
                                handleInputChange('banner_image', url);
                                handleInputChange('banner_url', url);
                                showToast('Banner actualizado', 'success');
                            }
                        }}
                        style={inputStyle}
                    />
                </div>
            </div>

            <button
                type="button"
                onClick={saveChanges}
                disabled={saving}
                style={{ ...buttonStyle, width: '100%', padding: '14px', marginTop: '12px' }}
            >
                {saving ? 'Guardando...' : '💾 Guardar Apariencia y Colores'}
            </button>
        </div>
    );
}
