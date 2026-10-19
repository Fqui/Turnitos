import React, { useEffect, useMemo } from 'react';
import { MapContainer, Circle, Marker, Polygon, useMap, useMapEvents } from 'react-leaflet';
import { TurnitosTileLayer, createTurnitosMarkerIcon } from './TurnitosMap';
import { RING_COLORS } from '../../utils/homeService';

const businessIcon = createTurnitosMarkerIcon('#0f172a', '🏠');
const clientIcon = createTurnitosMarkerIcon('#ef4444', '📍');

// Circle around a point as [lat, lng] pairs, used as the hole of the "no llego" shade
function circlePoints(lat, lng, km, steps = 72) {
    const points = [];
    const dLat = km / 111.32;
    const dLng = km / (111.32 * Math.cos((lat * Math.PI) / 180));
    for (let i = 0; i < steps; i++) {
        const a = (i / steps) * 2 * Math.PI;
        points.push([lat + dLat * Math.sin(a), lng + dLng * Math.cos(a)]);
    }
    return points;
}

function FitToRings({ lat, lng, maxKm }) {
    const map = useMap();
    useEffect(() => {
        const km = Math.max(maxKm || 0, 1.5);
        const fit = () => {
            map.invalidateSize();
            map.fitBounds(circlePoints(lat, lng, km, 8), { padding: [12, 12] });
        };
        fit();
        // The map can mount inside an animating modal with no size yet: fit again once it has one
        const container = map.getContainer();
        let lastWidth = container.clientWidth;
        const observer = typeof ResizeObserver !== 'undefined'
            ? new ResizeObserver(() => {
                if (container.clientWidth !== lastWidth) {
                    lastWidth = container.clientWidth;
                    fit();
                }
            })
            : null;
        observer?.observe(container);
        const timer = setTimeout(fit, 400);
        return () => {
            observer?.disconnect();
            clearTimeout(timer);
        };
    }, [map, lat, lng, maxKm]);
    return null;
}

function ClickHandler({ onPick }) {
    useMapEvents({
        click(e) {
            if (onPick) onPick({ lat: e.latlng.lat, lng: e.latlng.lng });
        }
    });
    return null;
}

export default function HomeRingsMap({ lat, lng, rings = [], pin = null, onPick = null, height = 280 }) {
    const center = useMemo(() => [lat, lng], [lat, lng]);
    const maxKm = rings.length ? rings[rings.length - 1].km : 0;
    const shade = maxKm
        ? [[[-89, -179], [-89, 179], [89, 179], [89, -179]], circlePoints(lat, lng, maxKm)]
        : null;

    return (
        <div style={{ height: `${height}px`, borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border)', position: 'relative', zIndex: 0 }}>
            <MapContainer center={center} zoom={13} zoomSnap={0.25} scrollWheelZoom={false} style={{ height: '100%', width: '100%', cursor: onPick ? 'crosshair' : undefined }}>
                <TurnitosTileLayer />
                <FitToRings lat={lat} lng={lng} maxKm={maxKm} />
                {shade && (
                    <Polygon positions={shade} pathOptions={{ stroke: false, fillColor: '#0f172a', fillOpacity: 0.28 }} interactive={false} />
                )}
                {[...rings].map((r, i) => ({ ...r, i })).reverse().map(r => (
                    <Circle
                        key={`${r.i}-${r.km}`}
                        center={center}
                        radius={r.km * 1000}
                        interactive={false}
                        pathOptions={{ color: RING_COLORS[r.i % RING_COLORS.length], weight: 2, fillOpacity: 0.12 }}
                    />
                ))}
                <Marker position={center} icon={businessIcon} interactive={false} />
                {pin && <Marker position={[pin.lat, pin.lng]} icon={clientIcon} interactive={false} />}
                {onPick && <ClickHandler onPick={onPick} />}
            </MapContainer>
        </div>
    );
}
