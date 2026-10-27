// Vista previa SOLO para desarrollo (npm run dev): fotos y video de productos de la tienda,
// cómo se ven hoy (antes) y la propuesta (después), con datos de ejemplo. No se incluye en el build.
import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, Film, ImagePlus, Play, Plus, Star, Volume2, VolumeX, X } from 'lucide-react';
import { ProductCardImage, ProductDetailImage } from '../../components/store/ProductImage';

const BRAND = '#E11D74';
const MAX_PHOTOS = 5;
const MAX_VIDEO_MB = 50;
const canHover = typeof window !== 'undefined' && window.matchMedia?.('(hover: hover) and (pointer: fine)').matches;

const photo = (id) => `https://images.unsplash.com/${id}?w=900&q=80`;
const SAMPLE_VIDEO = {
    src: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
    name: 'video-producto.mp4',
    sizeMb: 1.1
};

const PRODUCTS = [
    {
        id: 'p1',
        name: 'Kit esmaltado semipermanente',
        category: 'Uñas',
        price: 18500,
        desc: 'Incluye base, top coat y 3 colores de temporada. Dura hasta 3 semanas.',
        images: [
            photo('photo-1604654894610-df63bc536371'),
            photo('photo-1610992015732-2449b76344bc'),
            photo('photo-1632345031435-8727f6897d53'),
            photo('photo-1607779097040-26e80aa78e66')
        ],
        video: SAMPLE_VIDEO
    },
    {
        id: 'p2',
        name: 'Sérum facial hidratante',
        category: 'Skincare',
        price: 12900,
        desc: 'Ácido hialurónico y vitamina C. 30 ml.',
        images: [photo('photo-1620916566398-39f1143ab7be')],
        video: null
    }
];

const EXTRA_PHOTOS = [
    photo('photo-1599948128020-9a44505b0d1b'),
    photo('photo-1596462502278-27bfdc403348'),
    photo('photo-1522335789203-aabd1fc54bc9')
];

const money = (n) => `$${Number(n || 0).toLocaleString('es-AR')}`;

const section = { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '20px', padding: '18px', display: 'grid', gap: '14px' };
const h2 = { fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)', margin: 0 };
const note = { fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 };
const pill = (active) => ({
    padding: '8px 14px',
    borderRadius: '20px',
    border: `1px solid ${active ? BRAND : 'var(--border)'}`,
    background: active ? BRAND : 'var(--bg-card)',
    color: active ? '#fff' : 'var(--text-primary)',
    fontWeight: '700',
    fontSize: '13px',
    cursor: 'pointer'
});
const overlayBadge = {
    position: 'absolute',
    background: 'rgba(0,0,0,0.55)',
    backdropFilter: 'blur(4px)',
    color: '#fff',
    borderRadius: '10px',
    fontSize: '10px',
    fontWeight: '800',
    display: 'flex',
    alignItems: 'center',
    gap: '3px',
    zIndex: 2
};
const iconBtn = {
    width: '30px',
    height: '30px',
    borderRadius: '50%',
    border: '1px solid var(--border)',
    background: 'var(--bg-card)',
    color: 'var(--text-primary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    padding: 0
};

function StockPill() {
    return (
        <div style={{
            position: 'absolute', top: '8px', left: '8px', background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(8px)',
            borderRadius: '12px', padding: '2px 8px', fontSize: '10px', fontWeight: '700', color: '#0f172a',
            display: 'flex', alignItems: 'center', gap: '4px', zIndex: 2
        }}>
            <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#10b981' }} />
            En stock
        </div>
    );
}

function Label({ children, tone }) {
    const after = tone === 'after';
    return (
        <span style={{
            alignSelf: 'start', justifySelf: 'start', fontSize: '11px', fontWeight: '800', letterSpacing: '0.5px', textTransform: 'uppercase',
            padding: '3px 10px', borderRadius: '10px',
            background: after ? `${BRAND}1F` : 'var(--bg-main)', color: after ? BRAND : 'var(--text-secondary)',
            border: `1px solid ${after ? `${BRAND}55` : 'var(--border)'}`
        }}>
            {children}
        </span>
    );
}

// ── Tarjeta de la grilla ─────────────────────────────────────────────
function ProductCard({ product, after }) {
    const extraMedia = product.images.length + (product.video ? 1 : 0);
    return (
        <div className="store-product-card" style={{
            background: 'var(--bg-card)', borderRadius: '22px', padding: '12px', border: '1px solid var(--border)',
            display: 'flex', flexDirection: 'column', minWidth: 0, boxShadow: '0 4px 16px rgba(0,0,0,0.03)'
        }}>
            <ProductCardImage src={product.images[0]} alt={product.name}>
                <StockPill />
                {after && product.video && (
                    <span style={{ ...overlayBadge, top: '8px', right: '8px', width: '24px', height: '24px', justifyContent: 'center', borderRadius: '50%' }} aria-label="Tiene video">
                        <Play size={11} fill="#fff" />
                    </span>
                )}
                {after && extraMedia > 1 && (
                    <span style={{ ...overlayBadge, bottom: '8px', right: '8px', padding: '3px 7px' }}>
                        1/{product.images.length}
                    </span>
                )}
            </ProductCardImage>
            <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <span style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{product.category}</span>
                <h4 style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{product.name}</h4>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px', paddingTop: '6px', borderTop: '1px solid var(--border)' }}>
                    <span style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-primary)' }}>{money(product.price)}</span>
                    <span style={{ borderRadius: '20px', background: BRAND, color: '#fff', padding: '7px', display: 'inline-flex' }}><Plus size={14} /></span>
                </div>
            </div>
        </div>
    );
}

// ── Detalle: hoy (recuadro fijo de 270 px + miniaturas) ──────────────
function DetailBefore({ product }) {
    const [active, setActive] = useState(0);
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{
                position: 'relative', width: '100%', height: '270px', borderRadius: '20px',
                background: 'radial-gradient(circle at 50% 50%, var(--bg-card) 0%, var(--bg-main) 100%)',
                border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden'
            }}>
                <StockPill />
                <ProductDetailImage src={product.images[active]} alt={product.name} animationKey={active} />
            </div>
            {product.images.length > 1 && (
                <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', padding: '2px 0' }}>
                    {product.images.map((url, i) => (
                        <button key={url} type="button" onClick={() => setActive(i)} style={{
                            width: '56px', height: '56px', borderRadius: '12px', flexShrink: 0, background: '#fff', padding: '4px', cursor: 'pointer',
                            border: active === i ? `2px solid ${BRAND}` : '1px solid var(--border)'
                        }}>
                            <img src={url} alt={`Vista ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                        </button>
                    ))}
                </div>
            )}
            <DetailInfo product={product} />
        </div>
    );
}

// ── Detalle propuesto: carrusel 1:1 con el video primero ─────────────
function VideoSlide({ video, poster, active }) {
    const ref = useRef(null);
    const [muted, setMuted] = useState(true);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        if (active) el.play().catch(() => {});
        else el.pause();
    }, [active]);

    if (failed) {
        // Sin video disponible: foto con ícono de play para simularlo
        return (
            <div style={{ position: 'relative', flex: '0 0 100%', height: '100%', scrollSnapAlign: 'center' }}>
                <img src={poster} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Play size={24} color="#fff" fill="#fff" />
                    </span>
                </span>
            </div>
        );
    }

    return (
        <div style={{ position: 'relative', flex: '0 0 100%', height: '100%', scrollSnapAlign: 'center', scrollSnapStop: 'always', background: '#000' }}>
            <video
                ref={ref}
                src={video.src}
                poster={poster}
                autoPlay
                muted={muted}
                loop
                playsInline
                preload="metadata"
                onError={() => setFailed(true)}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
            <button
                type="button"
                onClick={() => setMuted(m => !m)}
                aria-label={muted ? 'Activar sonido' : 'Silenciar'}
                style={{
                    position: 'absolute', top: '12px', right: '12px', height: '32px', padding: '0 10px', borderRadius: '16px', border: 'none',
                    background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', color: '#fff', display: 'flex', alignItems: 'center', gap: '6px',
                    fontSize: '12px', fontWeight: '700', cursor: 'pointer', zIndex: 3
                }}
            >
                {muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
                {muted ? 'Sin sonido' : 'Con sonido'}
            </button>
        </div>
    );
}

function MediaCarousel({ product }) {
    const trackRef = useRef(null);
    const [index, setIndex] = useState(0);
    const slides = [
        ...(product.video ? [{ type: 'video', key: 'video' }] : []),
        ...product.images.slice(0, MAX_PHOTOS).map(src => ({ type: 'image', key: src, src }))
    ];

    const goTo = (i) => {
        const track = trackRef.current;
        if (!track) return;
        const next = (i + slides.length) % slides.length;
        track.scrollTo({ left: next * track.clientWidth, behavior: 'smooth' });
    };

    const handleScroll = () => {
        const track = trackRef.current;
        if (!track || !track.clientWidth) return;
        const current = Math.round(track.scrollLeft / track.clientWidth);
        if (current !== index) setIndex(current);
    };

    const arrow = (side) => ({
        position: 'absolute', top: '50%', [side]: '12px', transform: 'translateY(-50%)', width: '36px', height: '36px', borderRadius: '50%',
        border: 'none', background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', color: '#fff', display: 'flex',
        alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 3
    });

    return (
        <div style={{ position: 'relative', width: '100%', aspectRatio: '1 / 1', borderRadius: '20px', overflow: 'hidden', border: '1px solid var(--border)', background: 'var(--bg-main)' }}>
            <div
                ref={trackRef}
                onScroll={handleScroll}
                className="product-media-track"
                style={{ display: 'flex', width: '100%', height: '100%', overflowX: 'auto', overflowY: 'hidden', scrollSnapType: 'x mandatory', scrollbarWidth: 'none', overscrollBehaviorX: 'contain' }}
            >
                {slides.map((slide, i) => (slide.type === 'video'
                    ? <VideoSlide key={slide.key} video={product.video} poster={product.images[0]} active={index === i} />
                    : (
                        <img
                            key={slide.key}
                            src={slide.src}
                            alt={`${product.name} · foto ${i + 1}`}
                            draggable={false}
                            loading={i < 2 ? 'eager' : 'lazy'}
                            style={{ flex: '0 0 100%', width: '100%', height: '100%', objectFit: 'cover', scrollSnapAlign: 'center', scrollSnapStop: 'always' }}
                        />
                    )))}
            </div>
            <style>{'.product-media-track::-webkit-scrollbar{display:none}'}</style>

            <StockPill />

            {canHover && slides.length > 1 && (
                <>
                    <button type="button" aria-label="Anterior" onClick={() => goTo(index - 1)} style={arrow('left')}><ChevronLeft size={20} /></button>
                    <button type="button" aria-label="Siguiente" onClick={() => goTo(index + 1)} style={arrow('right')}><ChevronRight size={20} /></button>
                </>
            )}

            {slides.length > 1 && (
                <div style={{
                    position: 'absolute', bottom: '12px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '6px', alignItems: 'center',
                    padding: '5px 8px', borderRadius: '12px', background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)', zIndex: 3
                }}>
                    {slides.map((slide, i) => (
                        <button
                            key={slide.key}
                            type="button"
                            aria-label={slide.type === 'video' ? 'Ver video' : `Ver foto ${i + 1}`}
                            onClick={() => goTo(i)}
                            style={{
                                width: i === index ? '18px' : '7px', height: '7px', borderRadius: '4px', border: 'none', padding: 0,
                                background: i === index ? BRAND : 'rgba(255,255,255,0.75)', cursor: 'pointer', transition: 'all 0.2s ease'
                            }}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

function DetailAfter({ product }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <MediaCarousel product={product} />
            <DetailInfo product={product} />
        </div>
    );
}

function DetailInfo({ product }) {
    return (
        <div style={{ display: 'grid', gap: '4px' }}>
            <span style={{ fontSize: '11px', fontWeight: '800', color: BRAND, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{product.category}</span>
            <strong style={{ fontSize: '18px', color: 'var(--text-primary)' }}>{product.name}</strong>
            <p style={note}>{product.desc}</p>
            <span style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-primary)' }}>{money(product.price)}</span>
        </div>
    );
}

// ── Panel (StoreTab): cómo se cargarían fotos y video ────────────────
function PanelBefore({ product }) {
    return (
        <div style={{ display: 'grid', gap: '10px' }}>
            <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>Imágenes del Producto</span>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {product.images.map((url, i) => (
                    <div key={url} style={{ position: 'relative', width: '60px', height: '60px' }}>
                        <img src={url} alt={`Foto ${i + 1}`} style={{ width: '100%', height: '100%', borderRadius: '12px', objectFit: 'cover', border: i === 0 ? '2px solid #10b981' : '1px solid var(--border)' }} />
                        <span style={{ position: 'absolute', top: '-6px', right: '-6px', width: '20px', height: '20px', borderRadius: '50%', background: '#ef4444', color: '#fff', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</span>
                    </div>
                ))}
            </div>
            <div style={{ padding: '12px 16px', borderRadius: '12px', border: '1px dashed var(--border)', background: 'var(--bg-main)', fontSize: '13px', fontWeight: '600', textAlign: 'center' }}>
                📷 Subir Imágenes (Seleccionar 1 o varias)
            </div>
            <p style={note}>Sin límite de fotos, sin forma de ordenarlas ni elegir la portada (es la primera que subiste) y sin video.</p>
        </div>
    );
}

function PanelAfter({ product }) {
    const [photos, setPhotos] = useState(product.images);
    const [video, setVideo] = useState(product.video);
    const [videoError, setVideoError] = useState('');
    const [dragIndex, setDragIndex] = useState(null);

    const move = (from, to) => {
        if (to < 0 || to >= photos.length) return;
        setPhotos(list => {
            const next = [...list];
            const [item] = next.splice(from, 1);
            next.splice(to, 0, item);
            return next;
        });
    };

    const addPhotos = (files) => {
        const urls = Array.from(files || []).map(f => URL.createObjectURL(f));
        const pool = urls.length ? urls : EXTRA_PHOTOS.filter(u => !photos.includes(u)).slice(0, 1);
        setPhotos(list => [...list, ...pool].slice(0, MAX_PHOTOS));
    };

    const pickVideo = (file) => {
        if (!file) return;
        const sizeMb = file.size / (1024 * 1024);
        if (!/video\/(mp4|webm)/.test(file.type)) {
            setVideoError('Solo MP4 o WebM.');
            return;
        }
        if (sizeMb > MAX_VIDEO_MB) {
            setVideoError(`Pesa ${sizeMb.toFixed(1)} MB y el máximo es ${MAX_VIDEO_MB} MB. Recortalo o exportalo en menor calidad.`);
            return;
        }
        setVideoError('');
        setVideo({ src: URL.createObjectURL(file), name: file.name, sizeMb });
    };

    const tooBig = () => setVideoError(`Pesa 87.4 MB y el máximo es ${MAX_VIDEO_MB} MB. Recortalo o exportalo en menor calidad.`);

    return (
        <div style={{ display: 'grid', gap: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>Fotos del producto</span>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600' }}>{photos.length}/{MAX_PHOTOS}</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))', gap: '10px' }}>
                {photos.map((url, i) => (
                    <div
                        key={url}
                        draggable
                        onDragStart={() => setDragIndex(i)}
                        onDragOver={e => e.preventDefault()}
                        onDrop={() => { if (dragIndex !== null) move(dragIndex, i); setDragIndex(null); }}
                        style={{
                            position: 'relative', borderRadius: '14px', overflow: 'hidden', aspectRatio: '1 / 1', cursor: 'grab',
                            border: i === 0 ? `2px solid ${BRAND}` : '1px solid var(--border)', opacity: dragIndex === i ? 0.5 : 1
                        }}
                    >
                        <img src={url} alt={`Foto ${i + 1}`} draggable={false} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                        {i === 0 ? (
                            <span style={{ ...overlayBadge, top: '6px', left: '6px', padding: '3px 7px', background: BRAND }}>
                                <Star size={10} fill="#fff" /> Portada
                            </span>
                        ) : (
                            <button type="button" onClick={() => move(i, 0)} aria-label="Usar como portada" title="Usar como portada" style={{ ...overlayBadge, top: '6px', left: '6px', padding: '4px', border: 'none', cursor: 'pointer' }}>
                                <Star size={12} />
                            </button>
                        )}
                        <button type="button" onClick={() => setPhotos(list => list.filter((_, idx) => idx !== i))} aria-label="Quitar foto" style={{ ...overlayBadge, top: '6px', right: '6px', padding: '4px', border: 'none', cursor: 'pointer', background: 'rgba(239,68,68,0.9)' }}>
                            <X size={12} />
                        </button>
                        <div style={{ position: 'absolute', bottom: '6px', left: '6px', right: '6px', display: 'flex', justifyContent: 'space-between' }}>
                            <button type="button" disabled={i === 0} onClick={() => move(i, i - 1)} aria-label="Mover a la izquierda" style={{ ...iconBtn, width: '26px', height: '26px', opacity: i === 0 ? 0.35 : 1 }}>
                                <ArrowLeft size={13} />
                            </button>
                            <button type="button" disabled={i === photos.length - 1} onClick={() => move(i, i + 1)} aria-label="Mover a la derecha" style={{ ...iconBtn, width: '26px', height: '26px', opacity: i === photos.length - 1 ? 0.35 : 1 }}>
                                <ArrowRight size={13} />
                            </button>
                        </div>
                    </div>
                ))}
                {photos.length < MAX_PHOTOS && (
                    <label style={{
                        aspectRatio: '1 / 1', borderRadius: '14px', border: '1px dashed var(--border)', background: 'var(--bg-main)', display: 'flex',
                        flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', fontSize: '12px', fontWeight: '700',
                        color: 'var(--text-secondary)', cursor: 'pointer', textAlign: 'center'
                    }}>
                        <ImagePlus size={20} />
                        Agregar foto
                        <input type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={e => { addPhotos(e.target.files); e.target.value = ''; }} />
                    </label>
                )}
            </div>
            <p style={note}>Hasta {MAX_PHOTOS} fotos. La primera es la portada de la tarjeta: tocá la estrella para cambiarla y usá las flechas (o arrastrá en compu) para ordenar. Se muestran cuadradas.</p>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>Video (opcional)</span>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600' }}>{video ? '1/1' : '0/1'}</span>
            </div>
            {video ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px', borderRadius: '14px', border: '1px solid var(--border)', background: 'var(--bg-main)' }}>
                    <video src={video.src} muted playsInline preload="metadata" style={{ width: '64px', height: '64px', borderRadius: '10px', objectFit: 'cover', background: '#000', flexShrink: 0 }} />
                    <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{video.name}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{video.sizeMb.toFixed(1)} MB de {MAX_VIDEO_MB} MB · va primero, sin sonido y en loop</div>
                    </div>
                    <button type="button" onClick={() => setVideo(null)} aria-label="Quitar video" style={{ ...iconBtn, flexShrink: 0 }}><X size={14} /></button>
                </div>
            ) : (
                <label style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px 16px', borderRadius: '12px',
                    border: '1px dashed var(--border)', background: 'var(--bg-main)', fontSize: '13px', fontWeight: '700', cursor: 'pointer'
                }}>
                    <Film size={16} /> Subir video (MP4 o WebM, hasta {MAX_VIDEO_MB} MB)
                    <input type="file" accept="video/mp4,video/webm" style={{ display: 'none' }} onChange={e => { pickVideo(e.target.files?.[0]); e.target.value = ''; }} />
                </label>
            )}
            {videoError && (
                <div role="alert" style={{ padding: '10px 12px', borderRadius: '12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.35)', color: '#ef4444', fontSize: '12px', fontWeight: '600' }}>
                    {videoError}
                </div>
            )}
            <button type="button" onClick={tooBig} style={{ justifySelf: 'start', background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '12px', textDecoration: 'underline', cursor: 'pointer', padding: 0 }}>
                Simular un video de más de {MAX_VIDEO_MB} MB
            </button>
        </div>
    );
}

// ── Página ───────────────────────────────────────────────────────────
const MODES = [
    { id: 'compare', label: 'Comparar' },
    { id: 'before', label: 'Antes' },
    { id: 'after', label: 'Después' }
];

export default function ProductosPreview() {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    const params = new URLSearchParams(window.location.search);
    const [theme, setTheme] = useState(params.get('tema') === 'claro' ? 'light' : 'dark');
    const [mode, setMode] = useState(params.get('modo') || (isMobile ? 'after' : 'compare'));
    const [productId, setProductId] = useState('p1');
    const product = PRODUCTS.find(p => p.id === productId);

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
    }, [theme]);

    const showBefore = mode !== 'after';
    const showAfter = mode !== 'before';
    const columns = { display: 'grid', gridTemplateColumns: showBefore && showAfter && !isMobile ? '1fr 1fr' : '1fr', gap: '18px', alignItems: 'start' };

    const pair = (before, after) => (
        <div style={columns}>
            {showBefore && <div style={{ display: 'grid', gap: '10px', minWidth: 0 }}><Label>Antes · hoy</Label>{before}</div>}
            {showAfter && <div style={{ display: 'grid', gap: '10px', minWidth: 0 }}><Label tone="after">Después · propuesta</Label>{after}</div>}
        </div>
    );

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-main)', color: 'var(--text-primary)', padding: '20px 16px 80px', fontFamily: 'var(--font-sans)' }}>
            <div style={{ maxWidth: '980px', margin: '0 auto', display: 'grid', gap: '16px' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center', justifyContent: 'space-between' }}>
                    <h1 style={{ fontSize: '20px', fontWeight: '800', margin: 0 }}>Fotos y video de productos</h1>
                    <button type="button" style={pill(false)} onClick={() => setTheme(t => (t === 'dark' ? 'light' : 'dark'))}>
                        Tema {theme === 'dark' ? 'claro' : 'oscuro'}
                    </button>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }} role="group" aria-label="Qué mostrar">
                    {MODES.map(m => (
                        <button key={m.id} type="button" style={pill(mode === m.id)} aria-pressed={mode === m.id} onClick={() => setMode(m.id)}>{m.label}</button>
                    ))}
                </div>

                <div style={section} data-preview="tarjeta">
                    <h2 style={h2}>1. Tarjeta en la tienda</h2>
                    <p style={note}>La tarjeta ya recorta la foto cuadrada. La propuesta suma un contador si hay varias fotos y un ícono de play si hay video.</p>
                    {pair(
                        <div className="store-products-grid" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
                            {PRODUCTS.map(p => <ProductCard key={p.id} product={p} />)}
                        </div>,
                        <div className="store-products-grid" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
                            {PRODUCTS.map(p => <ProductCard key={p.id} product={p} after />)}
                        </div>
                    )}
                </div>

                <div style={section} data-preview="detalle">
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', justifyContent: 'space-between' }}>
                        <h2 style={h2}>2. Detalle del producto</h2>
                        <div style={{ display: 'flex', gap: '6px' }}>
                            {PRODUCTS.map(p => (
                                <button key={p.id} type="button" style={{ ...pill(productId === p.id), padding: '6px 12px', fontSize: '12px' }} onClick={() => setProductId(p.id)}>
                                    {p.images.length} foto{p.images.length > 1 ? 's' : ''}{p.video ? ' + video' : ''}
                                </button>
                            ))}
                        </div>
                    </div>
                    <p style={note}>Hoy: recuadro fijo de 270 px y miniaturas para tocar. Propuesta: carrusel cuadrado que se desliza (flechas en compu), con puntitos y el video primero, sin sonido y en loop.</p>
                    {pair(<DetailBefore key={`b-${productId}`} product={product} />, <DetailAfter key={`a-${productId}`} product={product} />)}
                </div>

                <div style={section} data-preview="panel">
                    <h2 style={h2}>3. Panel · cargar fotos y video</h2>
                    {pair(<PanelBefore product={PRODUCTS[0]} />, <PanelAfter product={PRODUCTS[0]} />)}
                </div>

                <p style={note}>Vista previa: no sube ni guarda nada. Fotos de Unsplash y video de muestra CC0 (MDN).</p>
            </div>
        </div>
    );
}
