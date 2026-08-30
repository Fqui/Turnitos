import React from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

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

export default function VenueGeneralTab({
    formData,
    setFormData,
    handleInputChange,
    handleMetadataChange,
    cardStyle,
    sectionTitleStyle,
    labelStyle,
    inputStyle
}) {
    return (
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
                    value={formData.description !== undefined ? formData.description : ''}
                    onChange={e => handleInputChange('description', e.target.value)}
                    placeholder="Ej: Un quincho exclusivo con pileta y asador para tus eventos familiares y cumpleaños..."
                />
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', display: 'block' }}>
                    📌 Se muestra en tu Link in Bio y en las tarjetas de búsqueda.
                </span>
            </div>

            <div style={{ marginBottom: '20px' }}>
                <label style={labelStyle}>Descripción Completa (Perfil)</label>
                <textarea
                    style={{ ...inputStyle, minHeight: '140px' }}
                    value={formData.metadata?.full_description !== undefined ? formData.metadata.full_description : ''}
                    onChange={e => handleMetadataChange('full_description', e.target.value)}
                    placeholder="Descripción detallada de tu espacio: qué incluye el alquiler, vajilla, normas de convivencia, horarios de música, etc."
                />
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', display: 'block' }}>
                    📖 Se muestra en la sección "Acerca del espacio" de tu perfil web público con opción de "Ver más".
                </span>
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
    );
}
