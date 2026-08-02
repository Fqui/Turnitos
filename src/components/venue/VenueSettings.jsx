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

    // Main form state
    const [formData, setFormData] = useState({ ...business });

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
            // Prepare data for saving
            // Ensure gallery details in metadata are synced
            const dataToSave = {
                ...formData,
                // Make sure gallery_images (URLs) matches the detailed gallery in metadata if we edit it there
                gallery_images: formData.metadata?.venue_gallery?.map(item => item.url) || formData.gallery_images
            };

            await serviceAdapter.patchBusiness(business.id, dataToSave);
            onUpdate(dataToSave);
            showToast('Cambios guardados correctamente', 'success');
        } catch (error) {
            console.error('Error saving venue settings:', error);
            showToast('Error al guardar los cambios', 'error');
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
                    { id: 'gallery', label: 'Galería de Fotos', icon: '📸' },
                    { id: 'pricing', label: 'Precios y Capacidad', icon: '💰' },
                    { id: 'services', label: 'Servicios Adicionales', icon: '✨' },
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

                        <div style={{ marginBottom: '20px' }}>
                            <label style={labelStyle}>Capacidad Máxima (personas)</label>
                            <input
                                type="number"
                                style={inputStyle}
                                value={formData.capacity_limit || ''}
                                onChange={e => handleInputChange('capacity_limit', parseInt(e.target.value) || 0)}
                                placeholder="Ej: 50"
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
                                            style={{ ...inputStyle, padding: '4px' }}
                                        >
                                            <option value="General">General</option>
                                            <option value="Piscina">Piscina</option>
                                            <option value="Salón">Salón</option>
                                            <option value="Exterior">Exterior</option>
                                            <option value="Baños">Baños</option>
                                        </select>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'pricing' && (
                    <div style={cardStyle}>
                        <h2 style={sectionTitleStyle}>Precios y Capacidad</h2>

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
                        {(formData.additional_services || []).map((service, index) => (
                            <div key={index} style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
                                <input
                                    placeholder="Nombre (ej: Limpieza)"
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
                                    placeholder="Precio"
                                    value={service.price}
                                    onChange={e => {
                                        const newServices = [...formData.additional_services];
                                        newServices[index].price = parseInt(e.target.value) || 0;
                                        handleInputChange('additional_services', newServices);
                                    }}
                                    style={{ ...inputStyle, flex: 1 }}
                                />
                                <button
                                    onClick={() => {
                                        const newServices = [...formData.additional_services];
                                        newServices.splice(index, 1);
                                        if (newServices.length === 0) setFormData(prev => ({ ...prev, additional_services: [] })); // Fix empty array
                                        else handleInputChange('additional_services', newServices);
                                    }}
                                    style={{ background: 'transparent', border: 'none', color: 'red', cursor: 'pointer' }}
                                >
                                    🗑️
                                </button>
                            </div>
                        ))}
                        <button
                            onClick={() => {
                                handleInputChange('additional_services', [...(formData.additional_services || []), { name: '', price: 0 }])
                            }}
                            style={{ ...buttonStyle, background: 'transparent', border: '1px dashed var(--primary-paddle)', color: 'var(--text-primary)' }}
                        >
                            + Agregar Servicio
                        </button>
                    </div>
                )}

                {activeTab === 'amenities' && (
                    <div style={cardStyle}>
                        <h2 style={sectionTitleStyle}>Comodidades (Amenities)</h2>
                        <p style={{ marginBottom: '10px', fontSize: '13px', color: 'var(--text-secondary)' }}>Separa por comas o enter</p>
                        <textarea
                            style={{ ...inputStyle, minHeight: '100px' }}
                            value={(formData.amenities || []).join(', ')}
                            onChange={e => {
                                const val = e.target.value;
                                handleInputChange('amenities', val.split(',').map(s => s.trim()).filter(Boolean));
                            }}
                            placeholder="Wifi, Piscina, Parrilla, Aire Acondicionado..."
                        />
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '16px' }}>
                            {(formData.amenities || []).map((a, i) => (
                                <span key={i} style={{ background: 'var(--primary-paddle)', color: '#000', padding: '4px 12px', borderRadius: '16px', fontSize: '12px', fontWeight: '600' }}>
                                    {a}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'calendar' && (
                    <div style={cardStyle}>
                        <h2 style={sectionTitleStyle}>Bloqueo de Fechas</h2>
                        <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Gestiona aquí los días que no quieres recibir reservas.</p>

                        {/* Simple list of blocked dates */}
                        <div style={{ marginTop: '20px' }}>
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', marginBottom: '20px' }}>
                                <div>
                                    <label style={labelStyle}>Fecha a bloquear</label>
                                    <input type="date" id="block-date-input" style={inputStyle} />
                                </div>
                                <div>
                                    <label style={labelStyle}>Motivo (Opcional)</label>
                                    <input type="text" id="block-reason-input" placeholder="Mantenimiento, Cerrado..." style={inputStyle} />
                                </div>
                                <button
                                    onClick={() => {
                                        const dateVal = document.getElementById('block-date-input').value;
                                        const reasonVal = document.getElementById('block-reason-input').value;
                                        if (!dateVal) return;

                                        const newBlocked = [...(formData.blocked_dates || []), { date: dateVal, reason: reasonVal }];
                                        handleInputChange('blocked_dates', newBlocked);

                                        document.getElementById('block-date-input').value = '';
                                        document.getElementById('block-reason-input').value = '';
                                    }}
                                    style={buttonStyle}
                                >
                                    Bloquear Día
                                </button>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '10px' }}>
                                {(formData.blocked_dates || []).map((block, i) => (
                                    <div key={i} style={{ background: 'rgba(255,0,0,0.1)', border: '1px solid red', borderRadius: '8px', padding: '10px' }}>
                                        <div style={{ fontWeight: '700', color: 'red' }}>{block.date}</div>
                                        <div style={{ fontSize: '12px' }}>{block.reason || 'Cerrado'}</div>
                                        <button
                                            onClick={() => {
                                                const newBlocked = [...formData.blocked_dates];
                                                newBlocked.splice(i, 1);
                                                handleInputChange('blocked_dates', newBlocked);
                                            }}
                                            style={{ marginTop: '5px', background: 'transparent', border: 'none', textDecoration: 'underline', cursor: 'pointer', fontSize: '11px' }}
                                        >
                                            Desbloquear
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}
