import React from 'react';
import { TileLayer } from 'react-leaflet';
import L from 'leaflet';

/**
 * TileLayer oficial de OpenStreetMap.
 * 100% libre, sin API key, sin límites ni marcas de agua.
 * En modo oscuro, se oscurece automáticamente mediante filtros CSS en index.css.
 */
export const OSM_TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
export const MAP_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

export function TurnitosTileLayer({ className = '' }) {
    return (
        <TileLayer
            url={OSM_TILE_URL}
            attribution={MAP_ATTRIBUTION}
            maxZoom={19}
            className={className}
        />
    );
}

/**
 * Crea un pin moderno interactivo con pulso y estilo premium.
 */
export const createTurnitosMarkerIcon = (color = 'var(--primary-paddle, #10B981)', emoji = '📍') => {
    return L.divIcon({
        className: 'turnitos-custom-marker',
        html: `
            <div style="position: relative; width: 38px; height: 38px; display: flex; align-items: center; justify-content: center; transform: translate(-3px, -3px);">
                <div style="position: absolute; width: 34px; height: 34px; border-radius: 50%; background: ${color}; opacity: 0.25; animation: turnitos-map-pulse 2s infinite ease-out;"></div>
                <div style="position: relative; width: 30px; height: 30px; border-radius: 50%; background: ${color}; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 14px rgba(0,0,0,0.35); border: 2.5px solid #FFFFFF;">
                    <span style="font-size: 15px; filter: drop-shadow(0 1px 1px rgba(0,0,0,0.3)); line-height: 1;">${emoji}</span>
                </div>
                <div style="position: absolute; bottom: 0; left: 50%; transform: translateX(-50%) translateY(2px); width: 6px; height: 6px; background: ${color}; border-radius: 50%; box-shadow: 0 2px 4px rgba(0,0,0,0.4);"></div>
            </div>
        `,
        iconSize: [38, 38],
        iconAnchor: [19, 36],
        popupAnchor: [0, -36]
    });
};

export const defaultTurnitosIcon = createTurnitosMarkerIcon('#10B981', '📍');

if (typeof L !== 'undefined' && L.Marker && L.Marker.prototype) {
    L.Marker.prototype.options.icon = defaultTurnitosIcon;
}

export default TurnitosTileLayer;
