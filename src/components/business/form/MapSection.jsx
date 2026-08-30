import React from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function LocationMarker({ formData, setFormData }) {
    useMapEvents({
        click(e) {
            setFormData(prev => ({ ...prev, latitude: e.latlng.lat, longitude: e.latlng.lng }));
        },
    });

    return formData.latitude && formData.longitude ? (
        <Marker position={[formData.latitude, formData.longitude]} />
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
            <div style={{ height: '300px', width: '100%', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border)' }}>
                <MapContainer
                    center={[formData.latitude || -34.6037, formData.longitude || -58.3816]}
                    zoom={13}
                    style={{ height: '100%', width: '100%' }}
                >
                    <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    />
                    <LocationMarker formData={formData} setFormData={setFormData} />
                </MapContainer>
            </div>
        </section>
    );
}
