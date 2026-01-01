import React, { useState, useEffect } from 'react';
import serviceAdapter from '../services/serviceAdapter';

export default function BusinessSettings({ business, onUpdate, isMobile }) {
    const [activeTab, setActiveTab] = useState('general');
    const [formData, setFormData] = useState(() => ({ ...business }));
    const [saving, setSaving] = useState(false);
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const [uploadingBanner, setUploadingBanner] = useState(false);

    useEffect(() => {
        if (business) {
            setFormData(prev => ({ ...prev, ...business }));
        }
    }, [business]);

    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleLogoUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            setUploadingLogo(true);
            const publicUrl = await serviceAdapter.uploadImage(file);
            handleInputChange('logo', publicUrl);
            alert('Logo subido correctamente');
        } catch (error) {
            console.error('Error uploading logo:', error);
            alert('Error al subir el logo. Solo disponible en modo producción.');
        } finally {
            setUploadingLogo(false);
        }
    };

    const handleBannerUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            setUploadingBanner(true);
            const publicUrl = await serviceAdapter.uploadImage(file);
            handleInputChange('banner_image', publicUrl);
            alert('Banner subido correctamente');
        } catch (error) {
            console.error('Error uploading banner:', error);
            alert('Error al subir el banner. Solo disponible en modo producción.');
        } finally {
            setUploadingBanner(false);
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            const updated = await serviceAdapter.updateBusiness(business.id, formData);
            onUpdate(updated);
            alert('Configuración guardada correctamente');
        } catch (error) {
            console.error('Error saving settings:', error);
            alert('Error al guardar la configuración');
        } finally {
            setSaving(false);
        }
    };

    const tabs = [
        { id: 'general', label: 'General', icon: '🏢' },
        { id: 'images', label: 'Imágenes', icon: '🖼️' },
        { id: 'rules', label: 'Reglas de Reservas', icon: '📅' },
        { id: 'payments', label: 'Pagos y Señas', icon: '💰' },
        { id: 'contact', label: 'Contacto', icon: '📱' }
    ];

    const renderTabContent = () => {
        switch (activeTab) {
            case 'general':
                return (
                    <div style={{ display: 'grid', gap: '20px' }}>
                        <div>
                            <label style={labelStyle}>Nombre del Negocio</label>
                            <input
                                type="text"
                                style={inputStyle}
                                value={formData.name ?? ''}
                                onChange={(e) => handleInputChange('name', e.target.value)}
                            />
                        </div>
                        <div>
                            <label style={labelStyle}>Descripción / Bio</label>
                            <textarea
                                style={{ ...inputStyle, height: '100px', resize: 'none' }}
                                value={formData.description ?? ''}
                                onChange={(e) => handleInputChange('description', e.target.value)}
                                placeholder="Breve descripción que verán tus clientes..."
                            />
                        </div>
                        <div>
                            <label style={labelStyle}>Ubicación</label>
                            <input
                                type="text"
                                style={inputStyle}
                                value={formData.location ?? ''}
                                onChange={(e) => handleInputChange('location', e.target.value)}
                            />
                        </div>
                    </div>
                );
            case 'images':
                return (
                    <div style={{ display: 'grid', gap: '32px' }}>
                        <div>
                            <label style={labelStyle}>Logo del Negocio</label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginTop: '10px' }}>
                                <div style={{
                                    width: '80px',
                                    height: '80px',
                                    borderRadius: '16px',
                                    overflow: 'hidden',
                                    background: 'var(--bg-main)',
                                    border: '1px solid var(--border)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    {formData.logo ? (
                                        <img src={formData.logo} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                        <span style={{ fontSize: '24px' }}>🏢</span>
                                    )}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <input
                                        type="file"
                                        id="logo-upload"
                                        style={{ display: 'none' }}
                                        accept="image/*"
                                        onChange={handleLogoUpload}
                                    />
                                    <label htmlFor="logo-upload" style={buttonSecondaryStyle}>
                                        {uploadingLogo ? 'Subiendo...' : 'Cambiar Logo'}
                                    </label>
                                    <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '8px' }}>Recomendado: 512x512px. JPG o PNG.</p>
                                </div>
                            </div>
                        </div>
                        <div>
                            <label style={labelStyle}>Imagen de Banner</label>
                            <div style={{ marginTop: '10px' }}>
                                <div style={{
                                    width: '100%',
                                    height: '140px',
                                    borderRadius: '16px',
                                    overflow: 'hidden',
                                    background: 'var(--bg-main)',
                                    border: '1px solid var(--border)',
                                    marginBottom: '16px'
                                }}>
                                    {formData.banner_image ? (
                                        <img src={formData.banner_image} alt="Banner" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                        <div style={{ width: '100%', height: '100%', background: 'linear-gradient(45deg, #eee, #f5f5f5)' }} />
                                    )}
                                </div>
                                <input
                                    type="file"
                                    id="banner-upload"
                                    style={{ display: 'none' }}
                                    accept="image/*"
                                    onChange={handleBannerUpload}
                                />
                                <label htmlFor="banner-upload" style={buttonSecondaryStyle}>
                                    {uploadingBanner ? 'Subiendo...' : 'Cambiar Banner'}
                                </label>
                            </div>
                        </div>
                    </div>
                );
            case 'rules':
                return (
                    <div style={{ display: 'grid', gap: '20px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div>
                                <label style={labelStyle}>Mín. Anticipación (días)</label>
                                <input
                                    type="number"
                                    style={inputStyle}
                                    min="0"
                                    value={formData.min_advance_days ?? 0}
                                    onChange={(e) => {
                                        const val = e.target.value === '' ? 0 : parseInt(e.target.value);
                                        handleInputChange('min_advance_days', isNaN(val) ? 0 : val);
                                    }}
                                />
                                <p style={hintStyle}>Garantiza que no te reserven sobre la hora.</p>
                            </div>
                            <div>
                                <label style={labelStyle}>Máx. Anticipación (días)</label>
                                <input
                                    type="number"
                                    style={inputStyle}
                                    min="1"
                                    value={formData.max_advance_days ?? 30}
                                    onChange={(e) => {
                                        const val = e.target.value === '' ? 1 : parseInt(e.target.value);
                                        handleInputChange('max_advance_days', isNaN(val) ? 30 : val);
                                    }}
                                />
                                <p style={hintStyle}>Hasta qué fecha pueden reservar.</p>
                            </div>
                        </div>
                        <div>
                            <label style={labelStyle}>Política de Cancelación (horas)</label>
                            <input
                                type="number"
                                style={inputStyle}
                                min="0"
                                value={formData.cancellation_limit_hours ?? 24}
                                onChange={(e) => {
                                    const val = e.target.value === '' ? 0 : parseInt(e.target.value);
                                    handleInputChange('cancellation_limit_hours', isNaN(val) ? 24 : val);
                                }}
                            />
                            <p style={hintStyle}>Tiempo límite para que el cliente cancele por su cuenta.</p>
                        </div>
                    </div>
                );
            case 'payments':
                return (
                    <div style={{ display: 'grid', gap: '24px' }}>
                        <div>
                            <label style={labelStyle}>Requiere Seña (%)</label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    step="5"
                                    style={{ flex: 1 }}
                                    value={formData.deposit_percentage ?? 0}
                                    onChange={(e) => handleInputChange('deposit_percentage', parseInt(e.target.value) || 0)}
                                />
                                <span style={{ fontWeight: '700', fontSize: '18px', width: '50px' }}>{formData.deposit_percentage ?? 0}%</span>
                            </div>
                            <p style={hintStyle}>Dejá en 0% si no cobrás seña previa.</p>
                        </div>
                        <div>
                            <label style={labelStyle}>Información de Pago (WhatsApp)</label>
                            <textarea
                                style={{ ...inputStyle, height: '100px', resize: 'none' }}
                                value={formData.payment_instructions ?? ''}
                                onChange={(e) => handleInputChange('payment_instructions', e.target.value)}
                                placeholder="Ej: Podes transferir al Alias: PADDLE.BOX.OK. Enviame el comprobante por acá."
                            />
                            <p style={hintStyle}>Este texto se incluirá en el mensaje automático de WhatsApp al reservar.</p>
                        </div>
                    </div>
                );
            case 'contact':
                return (
                    <div style={{ display: 'grid', gap: '20px' }}>
                        <div>
                            <label style={labelStyle}>WhatsApp de Reservas</label>
                            <input
                                type="tel"
                                style={inputStyle}
                                value={formData.whatsapp ?? ''}
                                placeholder="Ej: 3804123456"
                                onChange={(e) => handleInputChange('whatsapp', e.target.value)}
                            />
                        </div>
                        <div>
                            <label style={labelStyle}>Instagram (Usuario)</label>
                            <div style={{ position: 'relative' }}>
                                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}>@</span>
                                <input
                                    type="text"
                                    style={{ ...inputStyle, paddingLeft: '32px' }}
                                    value={formData.instagram ?? ''}
                                    onChange={(e) => handleInputChange('instagram', e.target.value)}
                                />
                            </div>
                        </div>
                        <div>
                            <label style={labelStyle}>Facebook (URL)</label>
                            <input
                                type="text"
                                style={inputStyle}
                                value={formData.facebook ?? ''}
                                onChange={(e) => handleInputChange('facebook', e.target.value)}
                            />
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            background: 'var(--bg-card)',
            borderRadius: '24px',
            border: '1px solid var(--border)',
            overflow: 'hidden'
        }}>
            {/* Header */}
            <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: '22px', fontWeight: '800' }}>Configuración</h2>
                    <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: 'var(--text-secondary)' }}>Personaliza tu portal y reglas de negocio</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    style={{
                        padding: '12px 24px',
                        borderRadius: '12px',
                        border: 'none',
                        background: 'var(--primary-paddle)',
                        color: '#000',
                        fontWeight: '700',
                        fontSize: '15px',
                        cursor: 'pointer',
                        boxShadow: '0 4px 12px rgba(0,230,118,0.2)',
                        transition: 'transform 0.2s',
                        opacity: saving ? 0.7 : 1
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                    {saving ? 'Guardando...' : 'Guardar Cambios'}
                </button>
            </div>

            {/* Content Body */}
            <div style={{ display: 'flex', flex: 1, minHeight: 0, flexDirection: isMobile ? 'column' : 'row' }}>
                {/* Tabs Sidebar */}
                <div style={{
                    width: isMobile ? '100%' : '240px',
                    borderRight: isMobile ? 'none' : '1px solid var(--border)',
                    borderBottom: isMobile ? '1px solid var(--border)' : 'none',
                    padding: '12px',
                    display: 'flex',
                    flexDirection: isMobile ? 'row' : 'column',
                    overflowX: isMobile ? 'auto' : 'visible',
                    gap: '4px',
                    backgroundColor: 'rgba(0,0,0,0.01)'
                }}>
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                padding: '12px 16px',
                                borderRadius: '12px',
                                border: 'none',
                                background: activeTab === tab.id ? 'rgba(0,0,0,0.05)' : 'transparent',
                                color: activeTab === tab.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                                cursor: 'pointer',
                                fontWeight: activeTab === tab.id ? '700' : '600',
                                fontSize: '14px',
                                textAlign: 'left',
                                whiteSpace: 'nowrap',
                                transition: 'all 0.2s'
                            }}
                        >
                            <span style={{ fontSize: '18px' }}>{tab.icon}</span>
                            {!isMobile && tab.label}
                        </button>
                    ))}
                </div>

                {/* Tab Panel */}
                <div style={{ flex: 1, padding: isMobile ? '24px 20px' : '32px 48px', overflowY: 'auto', maxWidth: '800px' }}>
                    {renderTabContent()}
                </div>
            </div>
        </div>
    );
}

// Internal Styles
const labelStyle = {
    display: 'block',
    fontSize: '12px',
    fontWeight: '700',
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    marginBottom: '8px',
    letterSpacing: '0.5px'
};

const inputStyle = {
    width: '100%',
    padding: '12px 16px',
    borderRadius: '12px',
    border: '1px solid var(--border)',
    background: 'var(--bg-main)',
    color: 'var(--text-primary)',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.2s'
};

const hintStyle = {
    fontSize: '11px',
    color: 'var(--text-secondary)',
    margin: '6px 0 0 4px'
};

const buttonSecondaryStyle = {
    display: 'inline-block',
    padding: '8px 16px',
    borderRadius: '10px',
    border: '1px solid var(--border)',
    background: 'var(--bg-main)',
    color: 'var(--text-primary)',
    fontSize: '13px',
    fontWeight: '700',
    cursor: 'pointer'
};
