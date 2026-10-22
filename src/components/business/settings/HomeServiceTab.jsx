import React, { useEffect, useState } from 'react';
import HomeRingsMap from '../../common/HomeRingsMap';
import { Button } from '../../common/controls';
import { DEFAULT_RINGS, MAX_RINGS, RING_COLORS, getHomeRings, formatFee } from '../../../utils/homeService';

const stepButton = {
    width: '36px',
    height: '36px',
    borderRadius: '8px',
    border: '1px solid var(--border)',
    background: 'var(--bg-card)',
    color: 'var(--text-primary)',
    fontSize: '16px',
    fontWeight: 700,
    cursor: 'pointer',
    padding: 0,
    flexShrink: 0,
    fontFamily: 'inherit'
};

export default function HomeServiceTab({ formData, handleSave, saving, onGoToGeneral, labelStyle, inputStyle }) {
    const lat = Number(formData?.latitude);
    const lng = Number(formData?.longitude);
    const hasLocation = isFinite(lat) && isFinite(lng) && !(lat === 0 && lng === 0) && formData?.latitude != null;
    const savedRings = getHomeRings(formData);
    const [rings, setRings] = useState(savedRings.length ? savedRings : DEFAULT_RINGS);

    useEffect(() => {
        const fresh = getHomeRings(formData);
        if (fresh.length) setRings(fresh);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [formData?.id]);

    const homeServices = (formData?.services || []).filter(s => s.location_mode === 'home' || s.location_mode === 'both');

    const update = (index, patch) => {
        setRings(prev => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
    };

    const changeKm = (index, value) => {
        const prevKm = index === 0 ? 0 : rings[index - 1].km;
        const nextKm = index === rings.length - 1 ? 100 : rings[index + 1].km;
        const km = Math.round(Number(value) * 2) / 2;
        if (!isFinite(km) || km <= prevKm || km >= nextKm) return;
        update(index, { km });
    };

    const changeFee = (index, value) => {
        const fee = Math.max(0, Math.round(Number(value) || 0));
        update(index, { fee });
    };

    const addRing = () => {
        if (rings.length >= MAX_RINGS) return;
        const last = rings[rings.length - 1] || { km: 0, fee: 0 };
        setRings([...rings, { km: last.km + 3, fee: last.fee + 1000 }]);
    };

    const removeRing = (index) => {
        if (rings.length <= 1) return;
        setRings(rings.filter((_, i) => i !== index));
    };

    const save = () => {
        const clean = [...rings].sort((a, b) => a.km - b.km).map(r => ({ km: r.km, fee: r.fee }));
        handleSave({ home_service: { rings: clean } });
    };

    if (!hasLocation) {
        return (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <strong style={{ fontSize: '15px', color: 'var(--text-primary)' }}>Primero cargá la ubicación de tu negocio</strong>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Los anillos de distancia se dibujan alrededor de tu local. Marcalo en el mapa de "General y Ubicación" y volvé acá.</span>
                {onGoToGeneral && (
                    <Button variant="outline" style={{ alignSelf: 'flex-start' }} onClick={onGoToGeneral}>Ir a General y Ubicación</Button>
                )}
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
                <label style={labelStyle}>Zonas a las que vas</label>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 12px' }}>
                    Cada anillo marca hasta cuántos km llegás y cuánto cobrás de traslado. Lo que queda afuera del último anillo no se puede reservar a domicilio.
                </p>
                <HomeRingsMap lat={lat} lng={lng} rings={[...rings].sort((a, b) => a.km - b.km)} height={300} />
            </div>

            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '14px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)', paddingBottom: '8px' }}>
                    <span>Hasta</span>
                    <span>Recargo de traslado</span>
                </div>
                {rings.map((ring, index) => (
                    <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 0', borderTop: '1px solid var(--border-light)', flexWrap: 'wrap' }}>
                        <span style={{ width: '12px', height: '12px', borderRadius: '9999px', background: RING_COLORS[index % RING_COLORS.length], flexShrink: 0 }} />
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <button type="button" style={stepButton} aria-label="Menos km" onClick={() => changeKm(index, ring.km - 1)}>−</button>
                            <span style={{ minWidth: '56px', textAlign: 'center', fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)' }}>{String(ring.km).replace('.', ',')} km</span>
                            <button type="button" style={stepButton} aria-label="Más km" onClick={() => changeKm(index, ring.km + 1)}>+</button>
                        </div>
                        <div style={{ flex: 1 }} />
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>$</span>
                            <input
                                type="number"
                                min="0"
                                step="500"
                                inputMode="numeric"
                                aria-label={`Recargo hasta ${ring.km} km`}
                                value={ring.fee}
                                onChange={e => changeFee(index, e.target.value)}
                                style={{ ...inputStyle, width: '96px', padding: '8px 10px' }}
                            />
                            {rings.length > 1 && (
                                <button type="button" style={{ ...stepButton, color: 'var(--status-cancelled, #ef4444)' }} aria-label="Quitar anillo" onClick={() => removeRing(index)}>×</button>
                            )}
                        </div>
                        <span style={{ width: '100%', fontSize: '12px', color: 'var(--text-secondary)', paddingLeft: '20px' }}>
                            {index === 0 ? 'Desde tu local' : `Desde ${String(rings[index - 1].km).replace('.', ',')} km`} · {formatFee(ring.fee)}
                        </span>
                    </div>
                ))}
                {rings.length < MAX_RINGS && (
                    <button
                        type="button"
                        onClick={addRing}
                        style={{ width: '100%', marginTop: '8px', minHeight: '44px', borderRadius: '8px', border: '1px dashed var(--border)', background: 'transparent', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' }}
                    >
                        + Agregar anillo
                    </button>
                )}
            </div>

            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
                {homeServices.length > 0
                    ? `Servicios a domicilio: ${homeServices.map(s => s.name).join(', ')}.`
                    : 'Todavía no tenés servicios a domicilio. En "Servicios", elegí "Solo domicilio" o "Las dos" en cada servicio que hagas en la casa del cliente.'}
                {' '}La distancia se mide en línea recta desde tu local.
            </p>

            <Button size="lg" fullWidth loading={saving} onClick={save}>
                {saving ? 'Guardando...' : 'Guardar zonas'}
            </Button>
        </div>
    );
}
