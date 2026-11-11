import React from 'react';
import { MapContainer, Marker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { TurnitosTileLayer, createTurnitosMarkerIcon } from '../common/TurnitosMap';

// Loaded on demand by ProfileInfoSection so the profile does not download Leaflet up front
export default function ProfileLocationMap({ latitude, longitude, primaryColor }) {
    return (
        <MapContainer
            center={[latitude, longitude]}
            zoom={15}
            style={{ position: 'absolute', inset: 0 }}
            dragging={false}
            scrollWheelZoom={false}
        >
            <TurnitosTileLayer />
            <Marker position={[latitude, longitude]} icon={createTurnitosMarkerIcon(primaryColor, '📍')} />
        </MapContainer>
    );
}
