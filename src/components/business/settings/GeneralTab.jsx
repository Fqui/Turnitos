import React from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
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
    useMapEvents({
        click(e) {
            onLocationSelect(e.latlng);
        },
    });
    return position ? <Marker position={position} /> : null;
}

export default function GeneralTab({
    formData,
    setFormData,
    handleInputChange,
    handleSave,
    saving,
    labelStyle,
    inputStyle,
    hintStyle,
    saveButtonStyle
}) {
    const mapCenter = [formData.latitude || -34.6037, formData.longitude || -58.3816];

    return (
        <div style={{ display: 'grid', gap: '20px' }}>
            <div>
                <label style={labelStyle}>Descripción / Bio</label>
                <textarea
                    style={{ ...inputStyle, height: '100px', resize: 'none' }}
                    value={formData.description ?? ''}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Breve descripción de tu negocio que verán tus clientes..."
                />
                <p style={hintStyle}>Esta descripción se mostrará en tu perfil de turnos, en tu página de LinkBio (debajo de tu logo) y al compartir tu enlace por WhatsApp.</p>
            </div>

            {/* Location Section */}
            <div>
                <label style={labelStyle}>Dirección y Ciudad</label>
                <input
                    type="text"
                    style={inputStyle}
                    value={formData.location ?? ''}
                    onChange={(e) => handleInputChange('location', e.target.value)}
                    placeholder="Ej: Av. San Martín 1234, La Rioja"
                />

                <div style={{ marginTop: '16px' }}>
                    <label style={{ ...labelStyle, fontSize: '13px', color: 'var(--text-secondary)' }}>Ubicación en el Mapa (Click para marcar)</label>
                    <div style={{ height: '300px', borderRadius: '12px', overflow: 'hidden', marginTop: '8px', border: '1px solid var(--border)', zIndex: 0 }}>
                        <MapContainer key={`${mapCenter[0]}-${mapCenter[1]}`} center={mapCenter} zoom={13} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
                            <TileLayer
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            />
                            <LocationPicker
                                position={formData.latitude ? [formData.latitude, formData.longitude] : null}
                                onLocationSelect={(latlng) => {
                                    setFormData(prev => ({
                                        ...prev,
                                        latitude: latlng.lat,
                                        longitude: latlng.lng
                                    }));
                                }}
                            />
                        </MapContainer>
                    </div>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                        Haz click en el mapa para marcar la ubicación exacta de tu negocio.
                    </p>
                </div>
            </div>

            <div style={{ marginTop: '10px', borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
                <h4 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '16px', color: 'var(--text-primary)' }}>Contacto y Redes Sociales</h4>
                <div style={{ display: 'grid', gap: '16px' }}>
                    <div> <label style={labelStyle}>WhatsApp de Contacto</label> <input type="text" style={inputStyle} placeholder="+54911..." value={formData.whatsapp ?? ''} onChange={(e) => handleInputChange('whatsapp', e.target.value)} /> </div>
                    <div> <label style={labelStyle}>Teléfono Alternativo</label> <input type="text" style={inputStyle} placeholder="3804..." value={formData.phone ?? ''} onChange={(e) => handleInputChange('phone', e.target.value)} /> </div>
                    <div> <label style={labelStyle}>Instagram</label> <input type="text" style={inputStyle} placeholder="@usuario" value={formData.instagram ?? ''} onChange={(e) => handleInputChange('instagram', e.target.value)} /> </div>
                    <div> <label style={labelStyle}>TikTok</label> <input type="text" style={inputStyle} placeholder="@usuario" value={formData.tiktok ?? ''} onChange={(e) => handleInputChange('tiktok', e.target.value)} /> </div>
                    <div> <label style={labelStyle}>Facebook</label> <input type="text" style={inputStyle} placeholder="@usuario o URL" value={formData.facebook ?? ''} onChange={(e) => handleInputChange('facebook', e.target.value)} /> </div>
                    <div> <label style={labelStyle}>Sitio Web</label> <input type="text" style={inputStyle} placeholder="https://..." value={formData.website ?? ''} onChange={(e) => handleInputChange('website', e.target.value)} /> </div>
                </div>
            </div>

            {/* Consolidated Save Button */}
            <div style={{ marginTop: '10px' }}>
                <button
                    onClick={() => handleSave({
                        name: formData.name,
                        description: formData.description,
                        location: formData.location,
                        latitude: formData.latitude,
                        longitude: formData.longitude,
                        whatsapp: formData.whatsapp,
                        phone: formData.phone,
                        instagram: formData.instagram,
                        tiktok: formData.tiktok,
                        facebook: formData.facebook,
                        website: formData.website
                    })}
                    style={saveButtonStyle}
                    disabled={saving}
                >
                    {saving ? 'Guardando...' : 'Guardar Información General'}
                </button>
            </div>
        </div>
    );
}
