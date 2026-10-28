import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import FramedImage from './FramedImage';
import { DEFAULT_FRAME, MAX_ZOOM, MIN_ZOOM, imageSrc, parseFrame, withFrame } from '../../utils/imageFrame';

// Where each kind of photo shows up on the public page, so the owner sees every crop.
export const FRAME_ASPECTS = {
    service: [{ label: 'Tarjeta', ratio: '4 / 3' }, { label: 'Detalle', ratio: '16 / 10' }],
    cover: [{ label: 'Compu', ratio: '3 / 1' }, { label: 'Celular', ratio: '16 / 10' }],
    logo: [{ label: 'Logo', ratio: '1 / 1', round: true }],
    avatar: [{ label: 'Nosotros', ratio: '4 / 5' }, { label: 'Círculo', ratio: '1 / 1', round: true }],
    product: [{ label: 'Producto', ratio: '1 / 1' }],
    gallery: [{ label: 'Galería', ratio: '1 / 1' }, { label: 'Historia', ratio: '9 / 16' }],
    banner: [{ label: 'Banner', ratio: '3 / 1' }],
    square: [{ label: 'Foto', ratio: '1 / 1' }],
    promo: [{ label: 'Compu', ratio: '9 / 5' }, { label: 'Celular', ratio: '3 / 2' }]
};

// Opens the editor right after an upload replaces the photo (`uploading` goes true -> false with a new file).
// Data loading from the server does not count, so the editor never pops up on its own when the page opens.
export function useFrameAfterUpload(url, uploading) {
    const [open, setOpen] = useState(false);
    const before = useRef(null);
    useEffect(() => {
        if (uploading) {
            before.current = imageSrc(url) || '';
        } else if (before.current !== null) {
            if (imageSrc(url) && imageSrc(url) !== before.current) setOpen(true);
            before.current = null;
        }
    }, [uploading, url]);
    return [open, setOpen];
}

// For single photos that are added on upload (banners, extras, promos): start(url) opens the editor and
// onAdd receives the framed URL, or the original one if the owner closes it without saving.
export function useFrameBeforeAdd(onAdd) {
    const [pending, setPending] = useState(null);
    const saved = useRef(false);
    return {
        start: (url) => { saved.current = false; setPending(url || null); },
        editorProps: {
            open: !!pending,
            image: pending,
            onSave: (url) => { saved.current = true; onAdd(url); },
            onClose: () => { if (!saved.current && pending) onAdd(pending); setPending(null); }
        }
    };
}

const ratioNumber = (ratio) => {
    const [w, h] = String(ratio).split('/').map(Number);
    return w && h ? w / h : 1;
};

// Modal to set zoom and position of a photo, with a live preview of each place it is shown.
// Saves by returning the same URL with the framing attached (utils/imageFrame).
export default function ImageFrameEditor({ open, image, aspects = FRAME_ASPECTS.service, title = 'Acomodá la foto', onSave, onClose }) {
    useBodyScrollLock(open);
    const [frame, setFrame] = useState(DEFAULT_FRAME);
    const [active, setActive] = useState(0);
    const [natural, setNatural] = useState(null);
    const boxRef = useRef(null);
    const dragRef = useRef(null);

    useEffect(() => {
        if (!open) return;
        setFrame(parseFrame(image).frame || DEFAULT_FRAME);
        setActive(0);
        setNatural(null);
    }, [open, image]);

    useEffect(() => {
        if (!open) return;
        const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open, onClose]);

    if (!open || !image) return null;

    const src = parseFrame(image).src;
    const current = aspects[Math.min(active, aspects.length - 1)];
    const preview = withFrame(src, frame);

    // How many px the photo can travel inside the box on each axis, to map a drag to a % shift.
    const travel = () => {
        const rect = boxRef.current?.getBoundingClientRect();
        if (!rect || !natural) return null;
        const fit = frame.whole ? Math.min : Math.max;
        const s = fit(rect.width / natural.w, rect.height / natural.h);
        return { x: natural.w * s * frame.z - rect.width, y: natural.h * s * frame.z - rect.height };
    };

    const onPointerDown = (e) => {
        dragRef.current = { x: e.clientX, y: e.clientY };
        e.currentTarget.setPointerCapture?.(e.pointerId);
    };
    const onPointerMove = (e) => {
        const start = dragRef.current;
        if (!start) return;
        const room = travel();
        if (!room) return;
        const dx = e.clientX - start.x;
        const dy = e.clientY - start.y;
        dragRef.current = { x: e.clientX, y: e.clientY };
        setFrame(f => ({
            ...f,
            x: room.x > 1 ? Math.min(100, Math.max(0, f.x - (dx / room.x) * 100)) : f.x,
            y: room.y > 1 ? Math.min(100, Math.max(0, f.y - (dy / room.y) * 100)) : f.y
        }));
    };
    const endDrag = () => { dragRef.current = null; };

    const setZoom = (z) => setFrame(f => ({ ...f, z: Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z)) }));
    const save = () => {
        onSave?.(withFrame(src, { ...frame, x: Math.round(frame.x), y: Math.round(frame.y) }));
        onClose?.();
    };

    const chip = (on) => ({
        border: `1px solid ${on ? 'var(--text-primary)' : 'var(--border)'}`,
        background: on ? 'var(--text-primary)' : 'var(--bg-card)',
        color: on ? 'var(--bg-card)' : 'var(--text-primary)',
        borderRadius: '999px',
        padding: '7px 13px',
        fontSize: '13px',
        fontWeight: 600,
        cursor: 'pointer',
        fontFamily: 'inherit'
    });
    const button = (primary) => ({
        flex: primary ? 1 : '0 0 auto',
        borderRadius: '12px',
        padding: '13px 18px',
        fontSize: '15px',
        fontWeight: 700,
        cursor: 'pointer',
        fontFamily: 'inherit',
        border: `1px solid ${primary ? 'var(--primary)' : 'var(--border)'}`,
        background: primary ? 'var(--primary)' : 'var(--bg-card)',
        color: primary ? '#0E1411' : 'var(--text-primary)'
    });
    const caption = { fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '5px' };

    // The main box stays inside the visible height on phones and on wide aspects.
    const mainRatio = ratioNumber(current.ratio);
    const mainWidth = `min(100%, calc(40vh * ${mainRatio}))`;

    return createPortal(
        <div
            onClick={onClose}
            style={{ position: 'fixed', inset: 0, zIndex: 10050, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'max(12px, env(safe-area-inset-top)) 12px max(12px, env(safe-area-inset-bottom))' }}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-label={title}
                onClick={(e) => e.stopPropagation()}
                style={{ background: 'var(--bg-card)', color: 'var(--text-primary)', borderRadius: '20px', border: '1px solid var(--border)', boxShadow: '0 20px 50px rgba(0,0,0,0.3)', width: '100%', maxWidth: '560px', maxHeight: '100%', overflowY: 'auto', padding: '18px' }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, letterSpacing: '-0.02em' }}>{title}</h3>
                    <button type="button" onClick={onClose} aria-label="Cerrar" style={{ width: '34px', height: '34px', borderRadius: '50%', border: 'none', background: 'var(--bg-input)', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                        <X size={18} />
                    </button>
                </div>
                <p style={{ margin: '4px 0 14px', fontSize: '13px', color: 'var(--text-secondary)' }}>Arrastrá la foto para moverla y usá el zoom. Así se va a ver en tu página.</p>

                {aspects.length > 1 && (
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
                        {aspects.map((a, i) => (
                            <button key={a.label} type="button" onClick={() => setActive(i)} style={chip(i === active)}>{a.label}</button>
                        ))}
                    </div>
                )}

                <div
                    ref={boxRef}
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={endDrag}
                    onPointerCancel={endDrag}
                    style={{ position: 'relative', width: mainWidth, margin: '0 auto', aspectRatio: current.ratio, borderRadius: current.round ? '50%' : '14px', overflow: 'hidden', background: '#111', cursor: 'grab', touchAction: 'none', userSelect: 'none' }}
                >
                    <FramedImage
                        src={preview}
                        alt="Vista previa"
                        draggable={false}
                        onLoad={(e) => setNatural({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
                        imgStyle={{ pointerEvents: 'none' }}
                    />
                    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', backgroundImage: 'linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)', backgroundSize: '33.34% 33.34%' }} />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '14px 0 10px' }}>
                    <button type="button" aria-label="Alejar" onClick={() => setZoom(frame.z - 0.1)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 4, display: 'flex' }}><ZoomOut size={20} /></button>
                    <input
                        type="range"
                        min={MIN_ZOOM}
                        max={MAX_ZOOM}
                        step="0.05"
                        value={frame.z}
                        onChange={(e) => setZoom(Number(e.target.value))}
                        aria-label="Zoom"
                        style={{ flex: 1, accentColor: 'var(--primary)' }}
                    />
                    <button type="button" aria-label="Acercar" onClick={() => setZoom(frame.z + 0.1)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 4, display: 'flex' }}><ZoomIn size={20} /></button>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', minWidth: '40px', textAlign: 'right' }}>{Math.round(frame.z * 100)}%</span>
                </div>

                {!current.round && (
                    <div style={{ display: 'flex', gap: '6px', marginBottom: '14px', flexWrap: 'wrap' }}>
                        <button type="button" onClick={() => setFrame(f => ({ ...f, whole: false }))} style={chip(!frame.whole)}>Llenar el espacio</button>
                        <button type="button" onClick={() => setFrame(f => ({ ...f, whole: true, z: 1 }))} style={chip(frame.whole)}>Foto entera</button>
                    </div>
                )}

                {aspects.length > 1 && (
                    <div style={{ display: 'grid', gridTemplateColumns: aspects.map(a => `${Math.max(ratioNumber(a.ratio), 0.6)}fr`).join(' '), gap: '10px', alignItems: 'end' }}>
                        {aspects.map((a, i) => (
                            <button key={a.label} type="button" onClick={() => setActive(i)} style={{ background: 'none', border: 'none', padding: 0, textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit', minWidth: 0 }}>
                                <div style={caption}>{a.label}</div>
                                <div style={{ position: 'relative', aspectRatio: a.ratio, borderRadius: a.round ? '50%' : '10px', overflow: 'hidden', background: '#111', border: '1px solid var(--border)', outline: i === active ? '2px solid var(--primary)' : 'none', outlineOffset: '2px' }}>
                                    <FramedImage src={preview} alt="" />
                                </div>
                            </button>
                        ))}
                    </div>
                )}

                <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                    <button type="button" onClick={() => setFrame(DEFAULT_FRAME)} style={button(false)} aria-label="Restablecer">
                        <RotateCcw size={16} style={{ verticalAlign: '-3px' }} />
                    </button>
                    <button type="button" onClick={save} style={button(true)}>Guardar</button>
                </div>
            </div>
        </div>,
        document.body
    );
}
