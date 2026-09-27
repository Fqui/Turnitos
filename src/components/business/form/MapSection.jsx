import React from 'react';
import { MapContainer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { TurnitosTileLayer, defaultTurnitosIcon } from '../../common/TurnitosMap';

function LocationMarker({ formData, setFormData }) {
    useMapEvents({
        click(e) {
            setFormData(prev => ({ ...prev, latitude: e.latlng.lat, longitude: e.latlng.lng }));
        },
    });

    return formData.latitude && formData.longitude ? (
        <Marker position={[formData.latitude, formData.longitude]} icon={defaultTurnitosIcon} />
    ) : null;
}

export default function MapSection({ formData, setFormData }) {
    return (
        <section>
            <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '16px', color: 'var(--text-primary)' }}>
                Ubicación en el Mapa
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                Haz clic en el mapa para marcar la ubicación exacta de tu negocio.
            </p>
            <div style={{ height: '300px', width: '100%', borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--border)', boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}>
                <MapContainer
                    center={[formData.latitude || -34.6037, formData.longitude || -58.3816]}
                    zoom={13}
                    style={{ height: '100%', width: '100%' }}
                >
                    <TurnitosTileLayer />
                    <LocationMarker formData={formData} setFormData={setFormData} />
                </MapContainer>
            </div>
        </section>
    );
}
