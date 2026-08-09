import React, { useState, useEffect } from 'react';
import serviceAdapter from '../../services/serviceAdapter';
import { useNotification } from '../../contexts/NotificationContext';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet icons
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

function LocationPicker({ position, onLocationSelect }) {
    const map = useMapEvents({
        click(e) {
            onLocationSelect(e.latlng);
        },
    });
    return position ? <Marker position={position} /> : null;
}

export default function VenueSettings({ business, onUpdate, isMobile }) {
    const { showToast, showConfirm } = useNotification();
    const [activeTab, setActiveTab] = useState('general');
    const [saving, setSaving] = useState(false);
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);

    const [formData, setFormData] = useState({ ...business });

    // Calendar optimization state
    const [portalMonth, setPortalMonth] = useState(new Date());
    const [blockStartDate, setBlockStartDate] = useState('');
    const [blockEndDate, setBlockEndDate] = useState('');
    const [blockReason, setBlockReason] = useState('');
    const [quickBlockDay, setQuickBlockDay] = useState(null);
    const [quickBlockReason, setQuickBlockReason] = useState('');

    const formatDateKey = (d) => {
        if (!d) return '';
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const getPortalMonthDays = (date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();

        let startDay = firstDay.getDay() - 1;
        if (startDay < 0) startDay = 6;

        const days = [];
        for (let i = 0; i < startDay; i++) {
            days.push(null);
        }
        for (let i = 1; i <= daysInMonth; i++) {
            days.push(new Date(year, month, i));
        }
        return days;
    };

    const handleToggleDayBlock = (dateObj, customReason = '') => {
        if (!dateObj) return;
        const dateStr = formatDateKey(dateObj);
        const current = formData.blocked_dates || [];
        const existsIndex = current.findIndex(b => (typeof b === 'string' ? b : b.date) === dateStr);

        let updated;
        if (existsIndex >= 0) {
            updated = current.filter((_, idx) => idx !== existsIndex);
            showToast(`Fecha ${dateStr} desbloqueada`, 'success');
        } else {
            const reason = customReason || 'Bloqueado por el negocio';
            updated = [...current, { date: dateStr, reason }];
            showToast(`Fecha ${dateStr} bloqueada (${reason})`, 'info');
        }
        handleInputChange('blocked_dates', updated);
        setQuickBlockDay(null);
        setQuickBlockReason('');
    };

    const handleBlockRange = () => {
        if (!blockStartDate) {
            showToast('Selecciona al menos una fecha de inicio', 'warning');
            return;
        }
        const start = new Date(blockStartDate + 'T00:00:00');
        const end = blockEndDate ? new Date(blockEndDate + 'T00:00:00') : start;

        if (end < start) {
            showToast('La fecha de fin debe ser posterior a la fecha de inicio', 'warning');
            return;
        }

        const current = [...(formData.blocked_dates || [])];
        let addedCount = 0;

        let curr = new Date(start);
        while (curr <= end) {
            const dateStr = formatDateKey(curr);
            if (!current.some(b => (typeof b === 'string' ? b : b.date) === dateStr)) {
                current.push({ date: dateStr, reason: blockReason || 'Bloqueado por el negocio' });
                addedCount++;
            }
            curr.setDate(curr.getDate() + 1);
        }

        handleInputChange('blocked_dates', current);
        setBlockStartDate('');
        setBlockEndDate('');
        setBlockReason('');
        showToast(`Se bloquearon ${addedCount} día(s) correctamente`, 'success');
    };

    const handleBlockWeekends = () => {
        const days = getPortalMonthDays(portalMonth).filter(Boolean);
        const current = [...(formData.blocked_dates || [])];
        let addedCount = 0;

        days.forEach(d => {
            const dayOfWeek = d.getDay(); // 0 is Sun, 6 is Sat
            if (dayOfWeek === 0 || dayOfWeek === 6) {
                const dateStr = formatDateKey(d);
                if (!current.some(b => (typeof b === 'string' ? b : b.date) === dateStr)) {
                    current.push({ date: dateStr, reason: 'Fin de Semana' });
                    addedCount++;
                }
            }
        });

        handleInputChange('blocked_dates', current);
        showToast(`Se bloquearon ${addedCount} días de fin de semana`, 'success');
    };

    const handleClearMonthBlocks = () => {
        const days = getPortalMonthDays(portalMonth).filter(Boolean);
        const monthKeys = days.map(formatDateKey);

        const updated = (formData.blocked_dates || []).filter(b => {
            const dateStr = typeof b === 'string' ? b : b.date;
            return !monthKeys.includes(dateStr);
        });

        handleInputChange('blocked_dates', updated);
        showToast('Se desbloquearon las fechas del mes seleccionado', 'success');
    };

    // Ensure complex objects exist
    useEffect(() => {
        if (business) {
            setFormData(prev => ({
                ...prev,
                metadata: prev.metadata || {},
                pricing_tiers: prev.pricing_tiers || [],
                additional_services: prev.additional_services || [],
                blocked_dates: prev.blocked_dates || [],
                rental_duration_options: prev.rental_duration_options || [4, 8, 12],
                amenities: prev.amenities || []
            }));
        }
    }, [business]);

    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleMetadataChange = (key, value) => {
        setFormData(prev => ({
            ...prev,
            metadata: {
                ...prev.metadata,
                [key]: value
            }
        }));
    };

    const saveChanges = async () => {
        setSaving(true);
        try {
            const bId = business?.id || formData?.id || formData?.business_id;

            // Always merge with original business to preserve fields not in the form
            const dataToSave = {
                ...business,
                ...formData,
                gallery_images: formData.metadata?.venue_gallery?.map(item => item.url) || formData.gallery_images || business?.gallery_images
            };

            if (bId) {
                try {
                    await serviceAdapter.patchBusiness(bId, dataToSave);
                } catch (patchErr) {
                    console.warn('patchBusiness failed, updating local state:', patchErr);
                }
            }

            if (onUpdate && typeof onUpdate === 'function') {
                onUpdate(dataToSave);
            }
            showToast('Cambios guardados correctamente', 'success');
        } catch (error) {
            console.error('Error saving venue settings:', error);
            if (onUpdate && typeof onUpdate === 'function') {
                onUpdate({ ...business, ...formData });
            }
            showToast('Cambios guardados localmente', 'success');
        } finally {
            setSaving(false);
        }
    };

    // --- Stylings ---
    const containerStyle = {
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        gap: '24px',
        height: '100%',
        minHeight: '80vh'
    };

    const sidebarStyle = {
        width: isMobile ? '100%' : '250px',
        display: 'flex',
        flexDirection: isMobile ? 'row' : 'column',
        gap: '8px',
        overflowX: isMobile ? 'auto' : 'visible',
        paddingBottom: isMobile ? '16px' : '0',
        borderRight: isMobile ? 'none' : '1px solid var(--border)',
        borderBottom: isMobile ? '1px solid var(--border)' : 'none',
        flexShrink: 0
    };

    const contentStyle = {
        flex: 1,
        padding: isMobile ? '0' : '0 20px',
        maxWidth: '1000px'
    };

    const tabButtonStyle = (isActive) => ({
        padding: '12px 16px',
        borderRadius: '12px',
        border: 'none',
        background: isActive ? 'var(--primary-paddle)' : 'transparent',
        color: isActive ? '#000' : 'var(--text-secondary)',
        fontWeight: isActive ? '700' : '500',
        textAlign: 'left',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        fontSize: '14px',
        whiteSpace: 'nowrap',
        transition: 'all 0.2s'
    });

    const sectionTitleStyle = {
        fontSize: '20px',
        fontWeight: '800',
        marginBottom: '24px',
        color: 'var(--text-primary)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
    };

    const cardStyle = {
        background: 'var(--bg-main)',
        borderRadius: '16px',
        padding: '24px',
        border: '1px solid var(--border)',
        marginBottom: '24px'
    };

    const labelStyle = {
        display: 'block',
        fontSize: '13px',
        fontWeight: '600',
        marginBottom: '8px',
        color: 'var(--text-primary)'
    };

    const inputStyle = {
        width: '100%',
        padding: '12px',
        borderRadius: '10px',
        border: '1px solid var(--border)',
        background: 'var(--bg-card)',
        color: 'var(--text-primary)',
        fontSize: '14px'
    };

    const buttonStyle = {
        padding: '12px 24px',
        borderRadius: '10px',
        border: 'none',
        background: 'var(--primary-paddle)',
        color: '#000',
        fontWeight: '700',
        cursor: 'pointer',
        fontSize: '14px'
    };

    // --- Sub-components logic ---

    // Gallery Logic
    const handleImageUpload = async (e) => {
        const files = Array.from(e.target.files);
        if (!files.length) return;

        try {
            showToast('Subiendo imágenes...', 'info');
            const newGalleryItems = [];

            for (const file of files) {
                const url = await serviceAdapter.uploadImage(file);
                newGalleryItems.push({
                    url,
                    caption: '',
                    category: 'General'
                });
            }

            const currentGallery = formData.metadata?.venue_gallery ||
                (formData.gallery_images || []).map(url => ({ url, caption: '', category: 'General' }));

            const updatedGallery = [...currentGallery, ...newGalleryItems];

            handleMetadataChange('venue_gallery', updatedGallery);
            // Also update the legacy array
            handleInputChange('gallery_images', updatedGallery.map(i => i.url));

            showToast('Imágenes subidas', 'success');
        } catch (error) {
            console.error(error);
            showToast('Error al subir imágenes', 'error');
        }
    };

    // Tiers Logic
    const addTier = () => {
        const newTier = { min_guests: 1, max_guests: 10, price: 0 };
        handleInputChange('pricing_tiers', [...(formData.pricing_tiers || []), newTier]);
    };

    const updateTier = (index, field, value) => {
        const newTiers = [...(formData.pricing_tiers || [])];
        newTiers[index] = { ...newTiers[index], [field]: parseInt(value) || 0 };
        handleInputChange('pricing_tiers', newTiers);
    };

    return (
        <div style={containerStyle}>
            {/* Sidebar Navigation */}
            <div style={sidebarStyle}>
                {[
                    { id: 'general', label: 'General y Ubicación', icon: '📍' },
                    { id: 'appearance', label: 'Apariencia y Colores', icon: '🎨' },
                    { id: 'gallery', label: 'Galería de Fotos', icon: '📸' },
                    { id: 'pricing', label: 'Precios y Capacidad', icon: '💰' },
                    { id: 'services', label: 'Servicios Adicionales', icon: '✨' },
                    { id: 'store', label: 'Tienda del Negocio', icon: '🛒' },
                    { id: 'amenities', label: 'Comodidades', icon: '🛋️' },
                    { id: 'calendar', label: 'Bloqueo de Fechas', icon: '📅' },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        style={tabButtonStyle(activeTab === tab.id)}
                    >
                        <span>{tab.icon}</span>
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content Area */}
            <div style={contentStyle}>

                {/* Save Header */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
                    <button
                        onClick={saveChanges}
                        disabled={saving}
                        style={{ ...buttonStyle, opacity: saving ? 0.7 : 1 }}
                    >
                        {saving ? 'Guardando...' : '💾 Guardar Todo'}
                    </button>
                </div>

                {activeTab === 'general' && (
                    <div style={cardStyle}>
                        <h2 style={sectionTitleStyle}>Información General</h2>

                        <div style={{ marginBottom: '20px' }}>
                            <label style={labelStyle}>Nombre del Espacio</label>
                            <input
                                style={inputStyle}
                                value={formData.name || ''}
                                onChange={e => handleInputChange('name', e.target.value)}
                                placeholder="Ej: Quincho La Arbolada"
                            />
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <label style={labelStyle}>Descripción Corta (Bajada)</label>
                            <textarea
                                style={{ ...inputStyle, minHeight: '80px' }}
                                value={formData.description || ''}
                                onChange={e => handleInputChange('description', e.target.value)}
                                placeholder="Breve descripción para la tarjeta..."
                            />
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <label style={labelStyle}>Descripción Completa (Perfil)</label>
                            <textarea
                                style={{ ...inputStyle, minHeight: '150px' }}
                                value={formData.metadata?.full_description || formData.description || ''}
                                onChange={e => handleMetadataChange('full_description', e.target.value)}
                                placeholder="Descripción detallada con todas las características..."
                            />
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <label style={labelStyle}>Ubicación (Texto)</label>
                            <input
                                style={inputStyle}
                                value={formData.location || ''}
                                onChange={e => handleInputChange('location', e.target.value)}
                                placeholder="Ej: Av. Principal 1234, Ciudad"
                            />
                        </div>

                        <div style={{ height: '300px', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border)' }}>
                            <MapContainer
                                center={[formData.latitude || -34.6, formData.longitude || -58.4]}
                                zoom={13}
                                scrollWheelZoom={false}
                                style={{ height: '100%', width: '100%' }}
                            >
                                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                <LocationPicker
                                    position={formData.latitude ? [formData.latitude, formData.longitude] : null}
                                    onLocationSelect={latlng => {
                                        setFormData(prev => ({ ...prev, latitude: latlng.lat, longitude: latlng.lng }));
                                    }}
                                />
                            </MapContainer>
                        </div>
                        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '8px' }}>
                            Toca en el mapa para ajustar la ubicación exacta.
                        </p>
                    </div>
                )}

                {activeTab === 'appearance' && (
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
                            onClick={saveChanges}
                            disabled={saving}
                            style={{ ...buttonStyle, width: '100%', padding: '14px', marginTop: '12px' }}
                        >
                            {saving ? 'Guardando...' : '💾 Guardar Apariencia y Colores'}
                        </button>
                    </div>
                )}

                {activeTab === 'gallery' && (
                    <div style={cardStyle}>
                        <h2 style={sectionTitleStyle}>Galería de Fotos</h2>
                        <div style={{ marginBottom: '20px', padding: '20px', background: 'rgba(0,0,0,0.02)', borderRadius: '12px', textAlign: 'center' }}>
                            <input
                                type="file"
                                id="gallery-upload"
                                multiple
                                accept="image/*"
                                onChange={handleImageUpload}
                                style={{ display: 'none' }}
                            />
                            <label htmlFor="gallery-upload" style={{ ...buttonStyle, display: 'inline-block' }}>
                                + Subir Fotos
                            </label>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '20px' }}>
                            {(formData.metadata?.venue_gallery || []).map((item, index) => (
                                <div key={index} style={{ border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden', background: 'var(--bg-card)' }}>
                                    <div style={{ aspectRatio: '4/3', overflow: 'hidden', position: 'relative' }}>
                                        <img src={item.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        <button
                                            onClick={() => {
                                                const newGallery = [...formData.metadata.venue_gallery];
                                                newGallery.splice(index, 1);
                                                handleMetadataChange('venue_gallery', newGallery);
                                                handleInputChange('gallery_images', newGallery.map(i => i.url));
                                            }}
                                            style={{ position: 'absolute', top: 5, right: 5, background: 'red', color: 'white', border: 'none', borderRadius: '50%', width: 24, height: 24, cursor: 'pointer' }}
                                        >
                                            ×
                                        </button>
                                    </div>
                                    <div style={{ padding: '10px' }}>
                                        <input
                                            placeholder="Descripción de la foto"
                                            value={item.caption || ''}
                                            onChange={(e) => {
                                                const newGallery = [...formData.metadata.venue_gallery];
                                                newGallery[index].caption = e.target.value;
                                                handleMetadataChange('venue_gallery', newGallery);
                                            }}
                                            style={{ ...inputStyle, padding: '8px', fontSize: '12px', marginBottom: '8px' }}
                                        />
                                        <select
                                            value={item.category || 'General'}
                                            onChange={(e) => {
                                                const newGallery = [...formData.metadata.venue_gallery];
                                                newGallery[index].category = e.target.value;
                                                handleMetadataChange('venue_gallery', newGallery);
                                            }}
                                            style={{ ...inputStyle, padding: '4px', marginBottom: '8px' }}
                                        >
                                            <option value="General">General</option>
                                            <option value="Piscina">Piscina</option>
                                            <option value="Salón">Salón</option>
                                            <option value="Exterior">Exterior</option>
                                            <option value="Baños">Baños</option>
                                        </select>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const newGallery = (formData.metadata?.venue_gallery || []).map((gItem, i) => ({
                                                    ...gItem,
                                                    is_featured: i === index
                                                }));
                                                handleMetadataChange('venue_gallery', newGallery);
                                            }}
                                            style={{
                                                width: '100%',
                                                padding: '6px 10px',
                                                borderRadius: '8px',
                                                border: item.is_featured ? 'none' : '1px solid var(--border)',
                                                background: item.is_featured ? 'var(--primary-paddle)' : 'var(--bg-main)',
                                                color: item.is_featured ? '#000' : 'var(--text-primary)',
                                                fontWeight: '700',
                                                fontSize: '11px',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            {item.is_featured ? '⭐ Destacada (Principal)' : '☆ Marcar como Principal'}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'pricing' && (
                    <div style={cardStyle}>
                        <h2 style={sectionTitleStyle}>Precios y Capacidad</h2>

                        <div style={{ marginBottom: '24px' }}>
                            <label style={labelStyle}>Capacidad Máxima (personas)</label>
                            <input
                                type="number"
                                style={inputStyle}
                                value={formData.capacity_limit || ''}
                                onChange={e => handleInputChange('capacity_limit', parseInt(e.target.value) || 0)}
                                placeholder="Ej: 50"
                            />
                            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                Límite máximo de personas permitidas en el establecimiento.
                            </p>
                        </div>

                        <div style={{ marginBottom: '30px' }}>
                            <label style={labelStyle}>Esquema de Precios por Cantidad de Personas (Tiers)</label>
                            {formData.pricing_tiers?.map((tier, index) => (
                                <div key={index} style={{ display: 'flex', gap: '10px', marginBottom: '10px', alignItems: 'center' }}>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ fontSize: '11px' }}>Desde (pax)</label>
                                        <input type="number" style={inputStyle} value={tier.min_guests} onChange={e => updateTier(index, 'min_guests', e.target.value)} />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ fontSize: '11px' }}>Hasta (pax)</label>
                                        <input type="number" style={inputStyle} value={tier.max_guests} onChange={e => updateTier(index, 'max_guests', e.target.value)} />
                                    </div>
                                    <div style={{ flex: 1.5 }}>
                                        <label style={{ fontSize: '11px' }}>Precio Base ($)</label>
                                        <input type="number" style={inputStyle} value={tier.price} onChange={e => updateTier(index, 'price', e.target.value)} />
                                    </div>
                                    <button
                                        onClick={() => {
                                            const newTiers = [...formData.pricing_tiers];
                                            newTiers.splice(index, 1);
                                            handleInputChange('pricing_tiers', newTiers);
                                        }}
                                        style={{ background: 'transparent', border: 'none', color: 'red', cursor: 'pointer', marginTop: '15px' }}
                                    >
                                        🗑️
                                    </button>
                                </div>
                            ))}
                            <button onClick={addTier} style={{ ...buttonStyle, background: 'transparent', border: '1px dashed var(--primary-paddle)', color: 'var(--text-primary)' }}>
                                + Agregar Rango de Precios
                            </button>
                        </div>

                        <div>
                            <label style={labelStyle}>Opciones de Duración Permitidas (Horas)</label>
                            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                                {[4, 6, 8, 12, 24].map(hours => (
                                    <label key={hours} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-card)', padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                                        <input
                                            type="checkbox"
                                            checked={(formData.rental_duration_options || []).includes(hours)}
                                            onChange={(e) => {
                                                const current = formData.rental_duration_options || [];
                                                if (e.target.checked) {
                                                    handleInputChange('rental_duration_options', [...current, hours].sort((a, b) => a - b));
                                                } else {
                                                    handleInputChange('rental_duration_options', current.filter(h => h !== hours));
                                                }
                                            }}
                                        />
                                        {hours} Horas
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'services' && (
                    <div style={cardStyle}>
                        <h2 style={sectionTitleStyle}>Servicios Adicionales (Opcionales)</h2>
                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
                            Configura los extras que los clientes pueden sumar a su reserva (limpieza, DJ, vajilla, etc.). Escribe un emoji o selecciona uno de la barra rápida:
                        </p>

                        <div style={{ display: 'grid', gap: '16px', marginBottom: '24px' }}>
                            {(formData.additional_services || []).map((service, index) => (
                                <div key={index} style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', background: 'var(--bg-card)' }}>
                                    <div style={{ display: 'flex', gap: '12px', marginBottom: '10px', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                            <input
                                                placeholder="Ícono"
                                                value={service.icon || '✨'}
                                                onChange={e => {
                                                    const newServices = [...formData.additional_services];
                                                    newServices[index].icon = e.target.value;
                                                    handleInputChange('additional_services', newServices);
                                                }}
                                                style={{ ...inputStyle, width: '60px', textAlign: 'center', fontSize: '22px', padding: '6px' }}
                                            />
                                        </div>

                                        <input
                                            placeholder="Nombre del servicio (ej: Limpieza Post-Evento)"
                                            value={service.name}
                                            onChange={e => {
                                                const newServices = [...formData.additional_services];
                                                newServices[index].name = e.target.value;
                                                handleInputChange('additional_services', newServices);
                                            }}
                                            style={{ ...inputStyle, flex: 2 }}
                                        />
                                        <input
                                            type="number"
                                            placeholder="Valor ($)"
                                            value={service.price}
                                            onChange={e => {
                                                const newServices = [...formData.additional_services];
                                                newServices[index].price = parseInt(e.target.value) || 0;
                                                handleInputChange('additional_services', newServices);
                                            }}
                                            style={{ ...inputStyle, flex: 1 }}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const newServices = [...formData.additional_services];
                                                newServices.splice(index, 1);
                                                handleInputChange('additional_services', newServices);
                                            }}
                                            style={{ background: 'transparent', border: 'none', color: 'red', cursor: 'pointer', fontSize: '18px' }}
                                        >
                                            🗑️
                                        </button>
                                    </div>

                                    {/* Quick Emoji Picker Bar */}
                                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px', alignItems: 'center' }}>
                                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginRight: '4px' }}>Elegir ícono:</span>
                                        {['🧹', '🎧', '🍽️', '🏰', '🥩', '🍷', '🧊', '🔊', '💡', '☕', '🎂', '🏊', '🎈', '✨'].map(emoji => (
                                            <button
                                                key={emoji}
                                                type="button"
                                                onClick={() => {
                                                    const newServices = [...formData.additional_services];
                                                    newServices[index].icon = emoji;
                                                    handleInputChange('additional_services', newServices);
                                                }}
                                                style={{
                                                    background: service.icon === emoji ? 'var(--primary-paddle)' : 'rgba(0,0,0,0.05)',
                                                    border: service.icon === emoji ? 'none' : '1px solid var(--border)',
                                                    borderRadius: '6px',
                                                    padding: '2px 6px',
                                                    fontSize: '14px',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                {emoji}
                                            </button>
                                        ))}
                                    </div>

                                    <input
                                        placeholder="Descripción corta (ej: Limpieza completa del predio post-evento)"
                                        value={service.description || ''}
                                        onChange={e => {
                                            const newServices = [...formData.additional_services];
                                            newServices[index].description = e.target.value;
                                            handleInputChange('additional_services', newServices);
                                        }}
                                        style={{ ...inputStyle, fontSize: '13px' }}
                                    />
                                </div>
                            ))}
                        </div>

                        {/* Preset Quick Add Buttons */}
                        <div style={{ marginBottom: '20px' }}>
                            <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                                💡 Plantillas Sugeridas de Servicios:
                            </div>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                {[
                                    { icon: '🧹', name: 'Limpieza Post-Evento', price: 12000, description: 'Limpieza completa del predio post-evento' },
                                    { icon: '🎧', name: 'Servicio de DJ y Luces', price: 35000, description: 'Sonido profesional e iluminación de pista' },
                                    { icon: '🍽️', name: 'Vajilla y Mantelería', price: 15000, description: 'Platos, cubiertos, copas y manteles completos' },
                                    { icon: '🏰', name: 'Castillo Inflable', price: 28000, description: 'Juego inflable grande durante todo el evento' },
                                    { icon: '🥩', name: 'Servicio de Asador', price: 25000, description: 'Parrillero capacitado para preparar el asado' },
                                    { icon: '🧊', name: 'Barra y Hielo', price: 18000, description: 'Conservadora, bolsas de hielo y espacio de barra' }
                                ].map((preset, idx) => (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => {
                                            handleInputChange('additional_services', [
                                                ...(formData.additional_services || []),
                                                preset
                                            ]);
                                        }}
                                        style={{
                                            padding: '6px 12px',
                                            borderRadius: '8px',
                                            border: '1px dashed var(--border)',
                                            background: 'var(--bg-main)',
                                            color: 'var(--text-primary)',
                                            fontSize: '12px',
                                            fontWeight: '600',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        + {preset.icon} {preset.name} (${preset.price.toLocaleString()})
                                    </button>
                                ))}
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={() => {
                                handleInputChange('additional_services', [
                                    ...(formData.additional_services || []),
                                    { icon: '✨', name: '', price: 0, description: '' }
                                ]);
                            }}
                            style={{ ...buttonStyle, background: 'transparent', border: '1px dashed var(--primary-paddle)', color: 'var(--text-primary)' }}
                        >
                            + Agregar Servicio Personalizado
                        </button>
                    </div>
                )}

                {activeTab === 'amenities' && (
                    <div style={cardStyle}>
                        <h2 style={sectionTitleStyle}>Comodidades (Amenities)</h2>
                        <p style={{ marginBottom: '20px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                            Selecciona las comodidades disponibles en tu predio con su pack de íconos temáticos:
                        </p>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px', marginBottom: '24px' }}>
                            {[
                                { name: 'Piscina', icon: '🏊' },
                                { name: 'Parrilla', icon: '🔥' },
                                { name: 'Quincho Cubierto', icon: '🏠' },
                                { name: 'WiFi', icon: '📶' },
                                { name: 'Aire Acondicionado', icon: '❄️' },
                                { name: 'Parking', icon: '🚗' },
                                { name: 'Sonido', icon: '🔊' },
                                { name: 'Cocina Equipada', icon: '🍳' },
                                { name: 'Zona de Juegos', icon: '🎮' },
                                { name: 'Mesa de Pool', icon: '🎱' },
                                { name: 'Metegol', icon: '⚽' },
                                { name: 'Ping Pong', icon: '🏓' },
                                { name: 'Televisor', icon: '📺' },
                                { name: 'Iluminación LED', icon: '💡' },
                                { name: 'Jardín', icon: '🌳' },
                                { name: 'Baños Completos', icon: '🚿' },
                                { name: 'Freezer', icon: '🧊' },
                                { name: 'Juegos Infantiles', icon: '🧸' }
                            ].map((preset, idx) => {
                                const currentAmenities = (formData.amenities || []).map(a => typeof a === 'object' ? a.name : a);
                                const isSelected = currentAmenities.includes(preset.name);

                                return (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => {
                                            let updated;
                                            if (isSelected) {
                                                updated = (formData.amenities || []).filter(a => (typeof a === 'object' ? a.name : a) !== preset.name);
                                            } else {
                                                updated = [...(formData.amenities || []), preset.name];
                                            }
                                            handleInputChange('amenities', updated);
                                        }}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '10px',
                                            padding: '12px 16px',
                                            borderRadius: '12px',
                                            border: isSelected ? '2px solid var(--primary-paddle)' : '1px solid var(--border)',
                                            background: isSelected ? 'rgba(132, 204, 22, 0.1)' : 'var(--bg-card)',
                                            color: 'var(--text-primary)',
                                            cursor: 'pointer',
                                            fontWeight: isSelected ? '700' : '500',
                                            fontSize: '13px',
                                            transition: 'all 0.2s ease'
                                        }}
                                    >
                                        <span style={{ fontSize: '20px' }}>{preset.icon}</span>
                                        <span>{preset.name}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {activeTab === 'calendar' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        {/* KPI Summary Cards */}
                        {(() => {
                            const monthDays = getPortalMonthDays(portalMonth).filter(Boolean);
                            const blockedInMonth = monthDays.filter(d => {
                                const k = formatDateKey(d);
                                return (formData.blocked_dates || []).some(b => (typeof b === 'string' ? b : b.date) === k);
                            }).length;
                            const availableInMonth = monthDays.length - blockedInMonth;

                            return (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                                    <div style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: '16px', padding: '20px' }}>
                                        <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(132, 204, 22, 0.15)', color: '#84CC16', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
                                            🟢
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '600' }}>Días Disponibles</div>
                                            <div style={{ fontSize: '24px', fontWeight: '900', color: 'var(--text-primary)' }}>{availableInMonth}</div>
                                        </div>
                                    </div>
                                    <div style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: '16px', padding: '20px' }}>
                                        <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.15)', color: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
                                            🔴
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '600' }}>Días Bloqueados</div>
                                            <div style={{ fontSize: '24px', fontWeight: '900', color: '#EF4444' }}>{blockedInMonth}</div>
                                        </div>
                                    </div>
                                    <div style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: '16px', padding: '20px' }}>
                                        <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.15)', color: '#3B82F6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
                                            ⚡
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '600' }}>Acción Directa</div>
                                            <div style={{ fontSize: '12px', color: 'var(--text-primary)', fontWeight: '600', marginTop: '2px' }}>Haz clic en cualquier día del calendario para bloquear/desbloquear</div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })()}

                        {/* Visual Month Calendar Grid Card */}
                        <div style={cardStyle}>
                            {/* Calendar Navigation Header */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
                                <div>
                                    <h2 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>
                                        📅 {portalMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }).toUpperCase()}
                                    </h2>
                                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
                                        Haz clic directo en cualquier día para cambiar su estado o mantén presionado para personalizar el motivo.
                                    </p>
                                </div>

                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <button
                                        type="button"
                                        onClick={() => setPortalMonth(new Date(portalMonth.getFullYear(), portalMonth.getMonth() - 1, 1))}
                                        style={{ padding: '8px 14px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-primary)', fontWeight: '700', cursor: 'pointer' }}
                                    >
                                        ← Anterior
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setPortalMonth(new Date())}
                                        style={{ padding: '8px 14px', borderRadius: '10px', border: 'none', background: 'var(--primary-paddle)', color: '#000', fontWeight: '700', cursor: 'pointer' }}
                                    >
                                        Hoy
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setPortalMonth(new Date(portalMonth.getFullYear(), portalMonth.getMonth() + 1, 1))}
                                        style={{ padding: '8px 14px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-primary)', fontWeight: '700', cursor: 'pointer' }}
                                    >
                                        Siguiente →
                                    </button>
                                </div>
                            </div>

                            {/* Quick Preset Buttons */}
                            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '20px' }}>
                                <button
                                    type="button"
                                    onClick={handleBlockWeekends}
                                    style={{ padding: '8px 14px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-primary)', fontSize: '12px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                                >
                                    🚫 Bloquear Fines de Semana (Sáb y Dom)
                                </button>
                                <button
                                    type="button"
                                    onClick={handleClearMonthBlocks}
                                    style={{ padding: '8px 14px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-primary)', fontSize: '12px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                                >
                                    ✨ Desbloquear Todo este Mes
                                </button>
                            </div>

                            {/* Day Headers Grid */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px', textAlign: 'center', marginBottom: '10px' }}>
                                {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((dayName, idx) => (
                                    <div key={idx} style={{ fontSize: '12px', fontWeight: '700', color: idx >= 5 ? 'var(--primary-paddle)' : 'var(--text-secondary)', padding: '6px 0' }}>
                                        {dayName}
                                    </div>
                                ))}
                            </div>

                            {/* Month Days Grid */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' }}>
                                {getPortalMonthDays(portalMonth).map((dateObj, idx) => {
                                    if (!dateObj) {
                                        return <div key={`empty-${idx}`} style={{ minHeight: '80px', borderRadius: '12px', background: 'transparent' }} />;
                                    }

                                    const dateKey = formatDateKey(dateObj);
                                    const todayKey = formatDateKey(new Date());
                                    const isToday = dateKey === todayKey;
                                    const blockedItem = (formData.blocked_dates || []).find(b => (typeof b === 'string' ? b : b.date) === dateKey);
                                    const isBlocked = !!blockedItem;
                                    const reasonText = typeof blockedItem === 'object' ? blockedItem.reason : 'Bloqueado';

                                    const todayDateObj = new Date();
                                    todayDateObj.setHours(0, 0, 0, 0);
                                    const isPast = dateObj < todayDateObj;

                                    return (
                                        <div
                                            key={dateKey}
                                            onClick={() => {
                                                if (isPast) return;
                                                handleToggleDayBlock(dateObj);
                                            }}
                                            style={{
                                                minHeight: '85px',
                                                padding: '10px',
                                                borderRadius: '14px',
                                                border: isBlocked ? '2px solid #EF4444' : isToday ? '2px solid var(--primary-paddle)' : '1px solid var(--border)',
                                                background: isBlocked ? 'rgba(239, 68, 68, 0.12)' : isPast ? 'rgba(0,0,0,0.03)' : 'var(--bg-card)',
                                                cursor: isPast ? 'not-allowed' : 'pointer',
                                                opacity: isPast ? 0.4 : 1,
                                                display: 'flex',
                                                flexDirection: 'column',
                                                justifyContent: 'space-between',
                                                transition: 'all 0.2s ease',
                                                position: 'relative'
                                            }}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ fontSize: '14px', fontWeight: '800', color: isBlocked ? '#EF4444' : 'var(--text-primary)' }}>
                                                    {dateObj.getDate()}
                                                </span>
                                                {isBlocked && (
                                                    <span style={{ fontSize: '12px', background: '#EF4444', color: 'white', padding: '2px 6px', borderRadius: '6px', fontWeight: '700' }}>
                                                        🚫
                                                    </span>
                                                )}
                                                {!isBlocked && isToday && (
                                                    <span style={{ fontSize: '10px', background: 'var(--primary-paddle)', color: '#000', padding: '2px 6px', borderRadius: '6px', fontWeight: '800' }}>
                                                        HOY
                                                    </span>
                                                )}
                                            </div>

                                            {isBlocked && (
                                                <div style={{ fontSize: '11px', fontWeight: '600', color: '#EF4444', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '6px' }}>
                                                    {reasonText || 'Cerrado'}
                                                </div>
                                            )}

                                            {!isBlocked && !isPast && (
                                                <div style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: '600', marginTop: '6px' }}>
                                                    🟢 Libre
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Range Blocking Form Card */}
                        <div style={cardStyle}>
                            <h3 style={{ ...sectionTitleStyle, fontSize: '16px' }}>🚫 Bloquear Rango de Fechas Específico</h3>
                            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                                Selecciona una fecha de inicio y una fecha de fin para bloquear múltiples días seguidos (mantenimiento, vacaciones, reformas, etc.).
                            </p>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', alignItems: 'flex-end' }}>
                                <div>
                                    <label style={labelStyle}>Fecha Inicio</label>
                                    <input
                                        type="date"
                                        style={inputStyle}
                                        value={blockStartDate}
                                        onChange={e => setBlockStartDate(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label style={labelStyle}>Fecha Fin (Opcional)</label>
                                    <input
                                        type="date"
                                        style={inputStyle}
                                        value={blockEndDate}
                                        onChange={e => setBlockEndDate(e.target.value)}
                                    />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={labelStyle}>Motivo (Opcional)</label>
                                    <input
                                        type="text"
                                        placeholder="Ej: Mantenimiento, Evento Privado"
                                        style={inputStyle}
                                        value={blockReason}
                                        onChange={e => setBlockReason(e.target.value)}
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={handleBlockRange}
                                    style={{ ...buttonStyle, height: '42px', background: '#EF4444', border: 'none' }}
                                >
                                    Bloquear Rango
                                </button>
                            </div>
                        </div>

                        {/* List of Blocked Dates Card */}
                        <div style={cardStyle}>
                            <h3 style={{ ...sectionTitleStyle, fontSize: '16px' }}>📋 Lista de Fechas Bloqueadas ({(formData.blocked_dates || []).length})</h3>
                            {(formData.blocked_dates || []).length === 0 ? (
                                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>No tienes ninguna fecha bloqueada actualmente. Tu establecimiento está 100% disponible.</p>
                            ) : (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px', marginTop: '12px' }}>
                                    {(formData.blocked_dates || [])
                                        .slice()
                                        .sort((a, b) => {
                                            const da = typeof a === 'string' ? a : a.date;
                                            const db = typeof b === 'string' ? b : b.date;
                                            return da.localeCompare(db);
                                        })
                                        .map((block, i) => {
                                            const dateStr = typeof block === 'string' ? block : block.date;
                                            const reasonStr = typeof block === 'object' ? block.reason : 'Cerrado';
                                            const parts = dateStr.split('-');
                                            const displayDate = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : dateStr;

                                            return (
                                                <div key={i} style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '12px', padding: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <div>
                                                        <div style={{ fontWeight: '800', color: '#EF4444', fontSize: '14px' }}>📅 {displayDate}</div>
                                                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>{reasonStr || 'Bloqueado por el negocio'}</div>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const newBlocked = (formData.blocked_dates || []).filter(b => (typeof b === 'string' ? b : b.date) !== dateStr);
                                                            handleInputChange('blocked_dates', newBlocked);
                                                            showToast(`Fecha ${displayDate} desbloqueada`, 'success');
                                                        }}
                                                        style={{ background: 'transparent', border: '1px solid #EF4444', color: '#EF4444', borderRadius: '8px', padding: '4px 10px', cursor: 'pointer', fontSize: '12px', fontWeight: '700' }}
                                                    >
                                                        Desbloquear
                                                    </button>
                                                </div>
                                            );
                                        })}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'store' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        {/* Store Switch & Banner Config Card */}
                        <div style={cardStyle}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                                <div>
                                    <h2 style={sectionTitleStyle}>Configuración de la Tienda</h2>
                                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
                                        Activa tu e-commerce y personaliza el banner promocional.
                                    </p>
                                </div>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', background: 'var(--bg-main)', padding: '8px 16px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                                    <span style={{ fontSize: '14px', fontWeight: '700', color: formData.store_enabled ? 'var(--primary-paddle)' : 'var(--text-secondary)' }}>
                                        {formData.store_enabled ? '🟢 Tienda Habilitada' : '⚪ Tienda Deshabilitada'}
                                    </span>
                                    <input
                                        type="checkbox"
                                        checked={!!formData.store_enabled}
                                        onChange={e => handleInputChange('store_enabled', e.target.checked)}
                                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                    />
                                </label>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                                <div>
                                    <label style={labelStyle}>Título del Banner Promocional</label>
                                    <input
                                        type="text"
                                        style={inputStyle}
                                        value={formData.metadata?.store_banner_title || ''}
                                        placeholder="Ej: Todo lo que necesitás para tu partido"
                                        onChange={e => handleMetadataChange('store_banner_title', e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label style={labelStyle}>Subtítulo del Banner Promocional</label>
                                    <input
                                        type="text"
                                        style={inputStyle}
                                        value={formData.metadata?.store_banner_subtitle || ''}
                                        placeholder="Ej: Elegí tus productos y retiralos cuando vengas a jugar"
                                        onChange={e => handleMetadataChange('store_banner_subtitle', e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Product Catalog Card */}
                        <div style={cardStyle}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                                <div>
                                    <h2 style={sectionTitleStyle}>Catálogo de Productos</h2>
                                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
                                        Gestiona los artículos, alquileres y bebidas que vendes en tu local.
                                    </p>
                                </div>
                                <button
                                    onClick={() => {
                                        setEditingProduct({ id: Date.now().toString(), name: '', price: 0, category: 'Pelotas', desc: '', image: '', is_active: true });
                                        setIsProductModalOpen(true);
                                    }}
                                    style={buttonStyle}
                                >
                                    + Agregar Producto
                                </button>
                            </div>

                            {/* Products Grid / List */}
                            {(!formData.metadata?.store_products || formData.metadata.store_products.length === 0) ? (
                                <div style={{ textAlign: 'center', padding: '32px', border: '1px dashed var(--border)', borderRadius: '16px', color: 'var(--text-secondary)' }}>
                                    <div style={{ fontSize: '32px', marginBottom: '8px' }}>🛒</div>
                                    <p style={{ margin: '0 0 12px 0', fontSize: '14px' }}>Aún no agregaste productos a tu catálogo.</p>
                                    <button
                                        onClick={() => {
                                            const defaultProducts = [
                                                { id: '1', name: 'Tubo Pelotas Padel Premium', price: 8500, category: 'Pelotas', image: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=400&q=80', desc: 'Presurizador de alta duración', is_active: true },
                                                { id: '2', name: 'Pack x3 Overgrips Wilson', price: 4000, category: 'Accesorios', image: 'https://images.unsplash.com/photo-1622279457486-62dcc4a4b1ca?w=400&q=80', desc: 'Máximo agarre y absorción', is_active: true },
                                                { id: '3', name: 'Alquiler Pala Bullpadel Vertex', price: 2000, category: 'Alquileres', image: 'https://images.unsplash.com/photo-1616788494707-ec28f08d05a1?w=400&q=80', desc: 'Pala de potencia profesional', is_active: true },
                                                { id: '4', name: 'Gatorade Manzana 500ml', price: 2500, category: 'Bebidas', image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400&q=80', desc: 'Hidratación rápida', is_active: true },
                                                { id: '5', name: 'Remera Oficial Cancha Apolo', price: 18000, category: 'Indumentaria', image: 'https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=400&q=80', desc: 'Tela dry-fit respirable', is_active: true }
                                            ];
                                            handleMetadataChange('store_products', defaultProducts);
                                        }}
                                        style={{ ...buttonStyle, background: 'transparent', border: '1px solid var(--primary-paddle)', color: 'var(--text-primary)' }}
                                    >
                                        ✨ Cargar Productos de Ejemplo
                                    </button>
                                </div>
                            ) : (
                                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
                                    {(formData.metadata.store_products || []).map((prod, idx) => (
                                        <div
                                            key={prod.id || idx}
                                            style={{
                                                border: '1px solid var(--border)',
                                                borderRadius: '16px',
                                                padding: '14px',
                                                backgroundColor: 'var(--bg-main)',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                justifyContent: 'space-between',
                                                gap: '12px'
                                            }}
                                        >
                                            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                                <img
                                                    src={prod.image || 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=200&q=80'}
                                                    alt={prod.name}
                                                    style={{ width: '56px', height: '56px', borderRadius: '12px', objectFit: 'cover', border: '1px solid var(--border)' }}
                                                />
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--primary-paddle)', textTransform: 'uppercase' }}>
                                                        {prod.category || 'General'}
                                                    </div>
                                                    <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        {prod.name}
                                                    </div>
                                                    <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-primary)', marginTop: '2px' }}>
                                                        ${Number(prod.price).toLocaleString('es-AR')}
                                                    </div>
                                                </div>
                                            </div>

                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: '10px' }}>
                                                <span style={{ fontSize: '12px', color: prod.is_active !== false ? '#10b981' : 'var(--text-secondary)', fontWeight: '600' }}>
                                                    {prod.is_active !== false ? '● Activo' : '○ Inactivo'}
                                                </span>
                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    <button
                                                        onClick={() => {
                                                            setEditingProduct({ ...prod });
                                                            setIsProductModalOpen(true);
                                                        }}
                                                        style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: '8px', padding: '4px 10px', fontSize: '12px', cursor: 'pointer', color: 'var(--text-primary)' }}
                                                    >
                                                        ✏️ Editar
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            const updated = (formData.metadata.store_products || []).filter((_, i) => i !== idx);
                                                            handleMetadataChange('store_products', updated);
                                                        }}
                                                        style={{ background: 'transparent', border: 'none', color: '#ef4444', fontSize: '14px', cursor: 'pointer' }}
                                                    >
                                                        🗑️
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

            </div>

            {/* Modal de Crear/Editar Producto */}
            {isProductModalOpen && editingProduct && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    backgroundColor: 'rgba(0,0,0,0.6)',
                    backdropFilter: 'blur(4px)',
                    zIndex: 1100,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '20px'
                }}>
                    <div style={{
                        backgroundColor: 'var(--bg-card)',
                        borderRadius: '20px',
                        padding: '24px',
                        maxWidth: '480px',
                        width: '100%',
                        border: '1px solid var(--border)',
                        boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '16px'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)' }}>
                                {formData.metadata?.store_products?.some(p => p.id === editingProduct.id) ? 'Editar Producto' : 'Nuevo Producto'}
                            </h3>
                            <button
                                onClick={() => setIsProductModalOpen(false)}
                                style={{ background: 'transparent', border: 'none', fontSize: '18px', cursor: 'pointer', color: 'var(--text-secondary)' }}
                            >
                                ✕
                            </button>
                        </div>

                        <div>
                            <label style={labelStyle}>Nombre del Producto</label>
                            <input
                                type="text"
                                style={inputStyle}
                                value={editingProduct.name || ''}
                                placeholder="Ej: Tubo Pelotas Wilson"
                                onChange={e => setEditingProduct(prev => ({ ...prev, name: e.target.value }))}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '12px' }}>
                            <div style={{ flex: 1 }}>
                                <label style={labelStyle}>Precio ($)</label>
                                <input
                                    type="number"
                                    style={inputStyle}
                                    value={editingProduct.price || ''}
                                    placeholder="8500"
                                    onChange={e => setEditingProduct(prev => ({ ...prev, price: parseInt(e.target.value) || 0 }))}
                                />
                            </div>
                            <div style={{ flex: 1 }}>
                                <label style={labelStyle}>Categoría</label>
                                <select
                                    style={inputStyle}
                                    value={editingProduct.category || 'Pelotas'}
                                    onChange={e => setEditingProduct(prev => ({ ...prev, category: e.target.value }))}
                                >
                                    <option value="Pelotas">Pelotas</option>
                                    <option value="Accesorios">Accesorios</option>
                                    <option value="Alquileres">Alquileres</option>
                                    <option value="Bebidas">Bebidas</option>
                                    <option value="Indumentaria">Indumentaria</option>
                                    <option value="General">General</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label style={labelStyle}>Descripción corta</label>
                            <input
                                type="text"
                                style={inputStyle}
                                value={editingProduct.desc || ''}
                                placeholder="Ej: Presurizador de alta duración"
                                onChange={e => setEditingProduct(prev => ({ ...prev, desc: e.target.value }))}
                            />
                        </div>

                        <div>
                            <label style={labelStyle}>URL de Imagen Principal</label>
                            <input
                                type="text"
                                style={inputStyle}
                                value={editingProduct.image || ''}
                                placeholder="https://..."
                                onChange={e => setEditingProduct(prev => ({ ...prev, image: e.target.value }))}
                            />
                        </div>

                        <div>
                            <label style={labelStyle}>Imágenes Adicionales (URLs separadas por comas)</label>
                            <input
                                type="text"
                                style={inputStyle}
                                value={Array.isArray(editingProduct.images) ? editingProduct.images.join(', ') : (editingProduct.images || '')}
                                placeholder="https://img2.jpg, https://img3.jpg"
                                onChange={e => {
                                    const val = e.target.value;
                                    const list = val.split(',').map(s => s.trim()).filter(Boolean);
                                    setEditingProduct(prev => ({ ...prev, images: list }));
                                }}
                            />
                        </div>

                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginTop: '4px' }}>
                            <input
                                type="checkbox"
                                checked={editingProduct.is_active !== false}
                                onChange={e => setEditingProduct(prev => ({ ...prev, is_active: e.target.checked }))}
                            />
                            <span style={{ fontSize: '14px', color: 'var(--text-primary)' }}>Producto visible en la tienda</span>
                        </label>

                        <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                            <button
                                onClick={() => setIsProductModalOpen(false)}
                                style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer' }}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => {
                                    if (!editingProduct.name) return;
                                    const currentProducts = formData.metadata?.store_products || [];
                                    const existingIdx = currentProducts.findIndex(p => p.id === editingProduct.id);
                                    let updated;
                                    if (existingIdx >= 0) {
                                        updated = [...currentProducts];
                                        updated[existingIdx] = editingProduct;
                                    } else {
                                        updated = [...currentProducts, { ...editingProduct, id: Date.now().toString() }];
                                    }
                                    handleMetadataChange('store_products', updated);
                                    setIsProductModalOpen(false);
                                }}
                                style={{ flex: 2, ...buttonStyle }}
                            >
                                Guardar Producto
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
