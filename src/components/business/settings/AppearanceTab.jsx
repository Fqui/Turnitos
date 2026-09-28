import React from 'react';

export default function AppearanceTab({
    formData,
    setFormData,
    handleInputChange,
    handleLogoUpload,
    handleBannerUpload,
    uploadingLogo,
    uploadingBanner,
    handleSave,
    saving,
    hintStyle,
    buttonSecondaryStyle,
    saveButtonStyle
}) {
    const currentBrandColor = formData.brand_color || formData.primary_color || '#10B981';
    const suggestedColors = ['#10B981', '#00E676', '#3B82F6', '#6366F1', '#EC4899', '#8B5CF6', '#F59E0B', '#EF4444'];

    return (
        <div style={{ display: 'grid', gap: '24px' }}>
            {/* Profile Preview — Banner + Logo */}
            <div style={{ background: 'var(--bg-main)', border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden' }}>
                {/* Banner */}
                <div style={{
                    width: '100%',
                    height: '150px',
                    background: formData.banner_image ? 'none' : 'linear-gradient(135deg, var(--bg-card) 0%, var(--border) 100%)',
                    position: 'relative',
                    cursor: 'pointer'
                }}
                    onClick={() => document.getElementById('banner-upload-appearance')?.click()}
                >
                    {formData.banner_image ? (
                        <img src={formData.banner_image} alt="Banner" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: '13px', gap: '6px' }}>
                            🖼️ Click para subir portada
                        </div>
                    )}
                    {uploadingBanner && (
                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <div className="spinner" style={{ width: '28px', height: '28px', border: '3px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                        </div>
                    )}
                    {/* Edit badge on banner */}
                    <div style={{
                        position: 'absolute', bottom: '8px', right: '8px',
                        background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
                        borderRadius: '8px', padding: '4px 10px',
                        fontSize: '12px', color: '#fff', fontWeight: '600',
                        cursor: 'pointer'
                    }}>
                        📷 Portada
                    </div>
                </div>

                {/* Logo + Info row */}
                <div style={{ padding: '0 20px 20px', marginTop: '-36px', display: 'flex', alignItems: 'flex-end', gap: '16px' }}>
                    {/* Logo */}
                    <div
                        onClick={() => document.getElementById('logo-upload-appearance')?.click()}
                        style={{
                            width: '80px', height: '80px', minWidth: '80px',
                            borderRadius: '50%', overflow: 'hidden',
                            background: 'var(--bg-card)',
                            border: '3px solid var(--bg-main)',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            position: 'relative', cursor: 'pointer',
                            zIndex: 1
                        }}
                    >
                        {formData.logo ? (
                            <img src={formData.logo} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                            <span style={{ fontSize: '28px' }}>🏢</span>
                        )}
                        {uploadingLogo && (
                            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%' }}>
                                <div className="spinner" style={{ width: '20px', height: '20px', border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                            </div>
                        )}
                        {/* Small edit indicator */}
                        <div style={{
                            position: 'absolute', bottom: '0', right: '0',
                            background: 'var(--primary-paddle)', borderRadius: '50%',
                            width: '22px', height: '22px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '11px', border: '2px solid var(--bg-main)'
                        }}>📷</div>
                    </div>

                    {/* Business name preview */}
                    <div style={{ paddingBottom: '4px' }}>
                        <p style={{ fontWeight: '700', fontSize: '15px', color: 'var(--text-primary)', margin: 0 }}>
                            {formData.name || 'Tu Negocio'}
                        </p>
                        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
                            Así se verá tu perfil
                        </p>
                    </div>
                </div>

                {/* Hidden file inputs */}
                <input type="file" id="logo-upload-appearance" style={{ display: 'none' }} accept="image/*" onChange={handleLogoUpload} disabled={uploadingLogo} />
                <input type="file" id="banner-upload-appearance" style={{ display: 'none' }} accept="image/*" onChange={handleBannerUpload} disabled={uploadingBanner} />

                {/* Hints */}
                <div style={{ padding: '0 20px 20px', display: 'grid', gap: '4px' }}>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>📐 Logo: cuadrado (512×512px) · Portada: panorámico (1200×400px o 16:9)</p>
                </div>
            </div>

            {/* Theme Selector */}
            <div style={{ background: 'var(--bg-main)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px' }}>
                <h4 style={{ fontSize: '16px', fontWeight: '800', margin: '0 0 8px 0', color: 'var(--text-primary)' }}>Estilo de Tema General</h4>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 16px 0' }}>
                    Selecciona la estética general de tu página pública (Modo Claro limpio o Modo Oscuro elegante).
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    {[
                        { id: 'light', label: '☀️ Modo Claro', desc: 'Fondo blanco luminoso y texto oscuro' },
                        { id: 'dark', label: '🌙 Modo Oscuro', desc: 'Fondo oscuro elegante y moderno' }
                    ].map(t => {
                        const isThemeSelected = (formData.theme || 'light') === t.id;
                        return (
                            <div
                                key={t.id}
                                onClick={() => handleInputChange('theme', t.id)}
                                style={{
                                    padding: '16px',
                                    borderRadius: '14px',
                                    background: t.id === 'dark' ? '#1E293B' : '#FFFFFF',
                                    color: t.id === 'dark' ? '#F8FAFC' : '#1E293B',
                                    border: isThemeSelected ? '2px solid var(--primary-paddle)' : '1px solid var(--border)',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    boxShadow: isThemeSelected ? '0 4px 12px rgba(0,0,0,0.1)' : 'none',
                                    position: 'relative'
                                }}
                            >
                                <div style={{ fontWeight: '800', fontSize: '15px', marginBottom: '4px' }}>{t.label}</div>
                                <div style={{ fontSize: '12px', opacity: 0.8 }}>{t.desc}</div>
                                {isThemeSelected && (
                                    <div style={{ position: 'absolute', top: '12px', right: '12px', color: 'var(--primary-paddle)', fontWeight: '800' }}>✓</div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Brand Color Theme */}
            <div style={{ background: 'var(--bg-main)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px' }}>
                <h4 style={{ fontSize: '16px', fontWeight: '800', margin: '0 0 8px 0', color: 'var(--text-primary)' }}>Color de Marca</h4>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 16px 0' }}>
                    Este color se aplicará a los botones, detalles y encabezados de tu turnero público.
                </p>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
                    {suggestedColors.map(color => (
                        <button
                            key={color}
                            type="button"
                            onClick={() => {
                                setFormData(prev => ({
                                    ...prev,
                                    brand_color: color,
                                    primary_color: color,
                                    button_color: color
                                }));
                            }}
                            style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '50%',
                                background: color,
                                border: currentBrandColor.toLowerCase() === color.toLowerCase() ? '3px solid #fff' : '2px solid transparent',
                                boxShadow: currentBrandColor.toLowerCase() === color.toLowerCase() ? '0 0 0 2px ' + color : 'none',
                                cursor: 'pointer',
                                transition: 'transform 0.15s'
                            }}
                            title={color}
                        />
                    ))}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '8px' }}>
                        <input
                            type="color"
                            value={currentBrandColor}
                            onChange={(e) => {
                                const newColor = e.target.value;
                                setFormData(prev => ({
                                    ...prev,
                                    brand_color: newColor,
                                    primary_color: newColor,
                                    button_color: newColor
                                }));
                            }}
                            style={{ width: '40px', height: '36px', border: 'none', borderRadius: '8px', cursor: 'pointer', background: 'transparent' }}
                        />
                        <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>{currentBrandColor}</span>
                    </div>
                </div>
            </div>

            <button
                onClick={() => handleSave({
                    logo: formData.logo,
                    logo_url: formData.logo || formData.logo_url,
                    banner_image: formData.banner_image,
                    banner_url: formData.banner_image || formData.banner_url,
                    brand_color: formData.brand_color || formData.primary_color || '#10B981',
                    primary_color: formData.brand_color || formData.primary_color || '#10B981',
                    button_color: formData.brand_color || formData.primary_color || '#10B981',
                    theme: formData.theme || 'light'
                })}
                style={saveButtonStyle}
                disabled={saving}
            >
                {saving ? 'Guardando...' : 'Guardar Apariencia y Colores'}
            </button>
        </div>
    );
}
