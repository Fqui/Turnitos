import React, { useRef, useState } from 'react';

const IDEAL_WIDTH = 1600;
const MIN_RATIO = 1.6; // wider than this crops well into the desktop cover

// Owner taps the part of the cover photo that must always stay visible.
// The point is saved as { x, y } in % and used as object-position on the public page.
export default function CoverFocusPicker({ image, value, onChange, desktopAspect = '3 / 1', mobileAspect = '16 / 10' }) {
    const boxRef = useRef(null);
    const draggingRef = useRef(false);
    const [size, setSize] = useState(null);

    if (!image) return null;

    const x = Number.isFinite(Number(value?.x)) ? Number(value.x) : 50;
    const y = Number.isFinite(Number(value?.y)) ? Number(value.y) : 50;
    const position = `${x}% ${y}%`;

    const pick = (e) => {
        const rect = boxRef.current?.getBoundingClientRect();
        if (!rect || !rect.width || !rect.height) return;
        const clamp = (v) => Math.min(100, Math.max(0, Math.round(v)));
        onChange({
            x: clamp(((e.clientX - rect.left) / rect.width) * 100),
            y: clamp(((e.clientY - rect.top) / rect.height) * 100)
        });
    };

    let sizeHint = null;
    if (size) {
        const ratio = size.w / size.h;
        if (ratio < MIN_RATIO) {
            sizeHint = `Tu foto mide ${size.w}×${size.h} y no es apaisada: en compu se va a recortar arriba y abajo. Lo ideal es una foto horizontal de ${IDEAL_WIDTH}×600 o más.`;
        } else if (size.w < 1200) {
            sizeHint = `Tu foto mide ${size.w}×${size.h}: en pantallas grandes puede verse poco nítida. Lo ideal es ${IDEAL_WIDTH}×600 o más.`;
        }
    }

    const previewBox = (aspectRatio) => ({
        position: 'relative',
        aspectRatio,
        borderRadius: '8px',
        overflow: 'hidden',
        background: '#1f2937',
        border: '1px solid var(--border)'
    });
    const previewImg = { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: position, display: 'block' };
    const captionStyle = { fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '4px' };

    return (
        <div style={{ display: 'grid', gap: '12px' }}>
            <div>
                <p style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', margin: '0 0 2px' }}>Tocá lo más importante de la portada</p>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>Esa parte queda siempre a la vista, en compu y en celular.</p>
            </div>

            <div
                ref={boxRef}
                onPointerDown={(e) => {
                    draggingRef.current = true;
                    e.currentTarget.setPointerCapture?.(e.pointerId);
                    pick(e);
                }}
                onPointerMove={(e) => { if (draggingRef.current) pick(e); }}
                onPointerUp={() => { draggingRef.current = false; }}
                onPointerCancel={() => { draggingRef.current = false; }}
                style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', cursor: 'crosshair', touchAction: 'none', userSelect: 'none', lineHeight: 0, maxWidth: '420px' }}
            >
                <img
                    src={image}
                    alt="Portada completa"
                    draggable={false}
                    onLoad={(e) => setSize({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
                    style={{ width: '100%', maxHeight: '320px', objectFit: 'contain', background: '#111', display: 'block' }}
                />
                <span style={{
                    position: 'absolute', left: `${x}%`, top: `${y}%`,
                    width: '26px', height: '26px', margin: '-13px 0 0 -13px',
                    borderRadius: '50%', border: '3px solid #fff',
                    boxShadow: '0 0 0 2px rgba(0,0,0,0.45), 0 2px 8px rgba(0,0,0,0.4)',
                    pointerEvents: 'none'
                }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px', maxWidth: '420px' }}>
                <div>
                    <div style={captionStyle}>Compu</div>
                    <div style={previewBox(desktopAspect)}><img src={image} alt="" style={previewImg} /></div>
                </div>
                <div>
                    <div style={captionStyle}>Celular</div>
                    <div style={previewBox(mobileAspect)}><img src={image} alt="" style={previewImg} /></div>
                </div>
            </div>

            {sizeHint && (
                <p style={{ fontSize: '12px', margin: 0, padding: '10px 12px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.12)', color: 'var(--text-primary)', maxWidth: '420px' }}>
                    ⚠️ {sizeHint}
                </p>
            )}
        </div>
    );
}
