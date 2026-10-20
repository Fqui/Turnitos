import React, { useState } from 'react';
import HomeRingsMap from '../common/HomeRingsMap';
import { formatFee, formatKm } from '../../utils/homeService';

const inputStyle = {
    width: '100%',
    padding: '14px 16px',
    borderRadius: '12px',
    border: '1px solid var(--border)',
    backgroundColor: 'var(--bg-input, var(--bg-main))',
    color: 'var(--text-primary)',
    fontSize: '16px',
    boxSizing: 'border-box',
    fontFamily: 'inherit'
};

const labelStyle = { display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: 'var(--text-primary)' };

export default function HomeVisitSection({
    business,
    mode,
    allowLocal,
    onModeChange,
    rings,
    pin,
    onPinChange,
    coverage,
    address,
    onAddressChange,
    reference,
    onReferenceChange,
    accentColor
}) {
    const [locating, setLocating] = useState(false);
    const [locError, setLocError] = useState('');
    const lat = Number(business?.latitude);
    const lng = Number(business?.longitude);
    const isHome = mode === 'home';

    const useMyLocation = () => {
        if (!navigator.geolocation) {
            setLocError('Tu navegador no permite compartir la ubicación. Tocá tu casa en el mapa.');
            return;
        }
        setLocating(true);
        setLocError('');
        navigator.geolocation.getCurrentPosition(
            pos => {
                setLocating(false);
                onPinChange({ lat: pos.coords.latitude, lng: pos.coords.longitude });
            },
            () => {
                setLocating(false);
                setLocError('No pudimos obtener tu ubicación. Tocá tu casa en el mapa.');
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    };

    const segButton = (active) => ({
        flex: 1,
        minHeight: '44px',
        border: 0,
        borderRadius: '10px',
        background: active ? 'var(--bg-card)' : 'transparent',
        color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
        boxShadow: active ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
        fontWeight: 600,
        fontSize: '14px',
        cursor: 'pointer',
        fontFamily: 'inherit'
    });

    const inZone = coverage && coverage.ring;

    return (
        <div style={{ marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {allowLocal && (
                <div>
                    <label style={labelStyle}>¿Dónde querés el turno?</label>
                    <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-input, var(--bg-main))', borderRadius: '12px', padding: '4px' }}>
                        <button type="button" style={segButton(!isHome)} onClick={() => onModeChange('local')}>En el local</button>
                        <button type="button" style={segButton(isHome)} onClick={() => onModeChange('home')}>A domicilio</button>
                    </div>
                </div>
            )}

            {isHome && (
                <>
                    <div>
                        <label style={{ ...labelStyle, marginBottom: '4px' }}>Marcá tu casa en el mapa</label>
                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Tocá el mapa o usá tu ubicación</span>
                    </div>
                    <HomeRingsMap lat={lat} lng={lng} rings={rings} pin={pin} onPick={onPinChange} height={240} />
                    <button
                        type="button"
                        onClick={useMyLocation}
                        disabled={locating}
                        style={{ minHeight: '44px', borderRadius: '12px', border: 0, background: accentColor || 'var(--primary)', color: '#0e1411', fontWeight: 700, fontSize: '14px', cursor: locating ? 'default' : 'pointer', opacity: locating ? 0.7 : 1, fontFamily: 'inherit' }}
                    >
                        {locating ? 'Buscando tu ubicación...' : '📍 Usar mi ubicación'}
                    </button>
                    {locError && <span style={{ fontSize: '12px', color: '#d97706' }}>{locError}</span>}

                    {coverage && (
                        <div style={{
                            borderRadius: '12px',
                            padding: '12px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '2px',
                            background: inZone ? 'rgba(62, 207, 142, 0.10)' : 'rgba(245, 158, 11, 0.10)',
                            border: `1px solid ${inZone ? 'rgba(62, 207, 142, 0.35)' : 'rgba(245, 158, 11, 0.35)'}`
                        }}>
                            <strong style={{ fontSize: '14px', color: 'var(--text-primary)' }}>
                                Estás a {formatKm(coverage.distanceKm)} · {inZone ? `traslado ${formatFee(coverage.ring.fee).toLowerCase()}` : 'fuera de zona'}
                            </strong>
                            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                {inZone
                                    ? `${business?.name || 'El negocio'} llega hasta tu casa.`
                                    : `${business?.name || 'El negocio'} no llega hasta ahí.${allowLocal ? ' Podés reservar en el local' : ''}${business?.whatsapp ? `${allowLocal ? ' o' : ' Podés'} escribirle por WhatsApp.` : '.'}`}
                            </span>
                            {!inZone && (
                                <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
                                    {allowLocal && (
                                        <button type="button" onClick={() => onModeChange('local')} style={{ minHeight: '40px', padding: '0 14px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontWeight: 600, fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' }}>
                                            Reservar en el local
                                        </button>
                                    )}
                                    {business?.whatsapp && (
                                        <a
                                            href={`https://wa.me/${String(business.whatsapp).replace(/\D/g, '')}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{ minHeight: '40px', padding: '0 14px', borderRadius: '10px', background: accentColor || 'var(--primary)', color: '#0e1411', fontWeight: 700, fontSize: '13px', display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}
                                        >
                                            Escribir por WhatsApp
                                        </a>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {inZone && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label htmlFor="home-visit-address" style={labelStyle}>Dirección</label>
                            <input
                                id="home-visit-address"
                                type="text"
                                autoComplete="street-address"
                                placeholder="Calle, número, piso o depto"
                                value={address}
                                onChange={e => onAddressChange(e.target.value)}
                                style={inputStyle}
                            />
                            <label htmlFor="home-visit-reference" style={{ ...labelStyle, fontSize: '13px', color: 'var(--text-secondary)', marginBottom: 0 }}>Referencia (opcional)</label>
                            <input
                                id="home-visit-reference"
                                type="text"
                                placeholder="Ej: portón negro, timbre 2"
                                value={reference}
                                onChange={e => onReferenceChange(e.target.value)}
                                style={inputStyle}
                            />
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
