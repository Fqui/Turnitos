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
            {/* Logo Upload */}
            <div style={{ background: 'var(--bg-main)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px' }}>
                <h4 style={{ fontSize: '16px', fontWeight: '800', margin: '0 0 16px 0', color: 'var(--text-primary)' }}>Logo del Negocio</h4>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div style={{
                        width: '90px',
                        height: '90px',
                        borderRadius: '20px',
                        overflow: 'hidden',
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative'
                    }}>
                        {formData.logo ? (
                            <img src={formData.logo} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                            <span style={{ fontSize: '32px' }}>🏢</span>
                        )}
                        {uploadingLogo && (
                            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <div className="spinner" style={{ width: '24px', height: '24px', border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                            </div>
                        )}
                    </div>
                    <div style={{ flex: 1 }}>
                        <input
                            type="file"
                            id="logo-upload-appearance"
                            style={{ display: 'none' }}
                            accept="image/*"
                            onChange={handleLogoUpload}
                            disabled={uploadingLogo}
                        />
                        <label htmlFor="logo-upload-appearance" style={{ ...buttonSecondaryStyle, display: 'inline-block', cursor: uploadingLogo ? 'not-allowed' : 'pointer' }}>
                            {uploadingLogo ? 'Subiendo...' : '📷 Cambiar Logo'}
                        </label>
                        <p style={hintStyle}>Recomendado: Imagen cuadrada (512x512px). Formatos JPG, PNG o WEBP.</p>
                    </div>
                </div>
            </div>

            {/* Banner Upload */}
            <div style={{ background: 'var(--bg-main)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px' }}>
                <h4 style={{ fontSize: '16px', fontWeight: '800', margin: '0 0 16px 0', color: 'var(--text-primary)' }}>Banner de Portada</h4>
                <div style={{
                    width: '100%',
                    height: '160px',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    marginBottom: '16px',
                    position: 'relative'
                }}>
                    {formData.banner_image ? (
                        <img src={formData.banner_image} alt="Banner" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                        <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.08) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: '14px' }}>
                            Sin banner configurado
                        </div>
                    )}
                    {uploadingBanner && (
                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <div className="spinner" style={{ width: '32px', height: '32px', border: '3px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                        </div>
                    )}
                </div>
                <input
                    type="file"
                    id="banner-upload-appearance"
                    style={{ display: 'none' }}
                    accept="image/*"
                    onChange={handleBannerUpload}
                    disabled={uploadingBanner}
                />
                <label htmlFor="banner-upload-appearance" style={{ ...buttonSecondaryStyle, display: 'inline-block', cursor: uploadingBanner ? 'not-allowed' : 'pointer' }}>
                    {uploadingBanner ? 'Subiendo...' : '🖼️ Cambiar Imagen de Portada'}
                </label>
                <p style={hintStyle}>Recomendado: Formato panorámico (1200x400px o 16:9). Peso máx. 5MB.</p>
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
