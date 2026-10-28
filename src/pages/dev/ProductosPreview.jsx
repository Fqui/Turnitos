// Vista previa SOLO para desarrollo (npm run dev): fotos y video de productos de la tienda,
// cómo se veían antes y cómo quedan ahora (componentes reales), con datos de ejemplo. No se incluye en el build.
import React, { useEffect, useState } from 'react';
import { Play, Plus } from 'lucide-react';
import { ProductCardImage, ProductDetailImage } from '../../components/store/ProductImage';
import ProductMediaCarousel from '../../components/store/ProductMediaCarousel';
import ProductMediaEditor from '../../components/business/settings/ProductMediaEditor';

const BRAND = '#E11D74';

const photo = (id) => `https://images.unsplash.com/${id}?w=900&q=80`;
// Fotos y video del negocio de simulación Espléndidas
const SIM = 'https://pjtakqbegttsazhkcsmv.supabase.co/storage/v1/object/public/business-images/simulacion';
const SAMPLE_VIDEO = {
    src: `${SIM}/nazajt-nails/ellas12.mp4`,
    name: 'video-producto.mp4',
    sizeMb: 0.5
};

const PRODUCTS = [
    {
        id: 'p1',
        name: 'Kit de cuidado de uñas',
        category: 'Cuidado',
        price: 12000,
        desc: 'Aceite, lima, buffer y crema de manos.',
        images: [
            `${SIM}/soft-nails/kit-v2.jpg`,
            `${SIM}/soft-nails/aceite-v2.jpg`,
            `${SIM}/soft-nails/lima-v2.jpg`,
            photo('photo-1604654894610-df63bc536371')
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

// ── Detalle propuesto: el carrusel real de la tienda ───────────────
function DetailAfter({ product }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <ProductMediaCarousel photos={product.images} video={product.video?.src} alt={product.name} color={BRAND}>
                <StockPill />
            </ProductMediaCarousel>
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
    const [media, setMedia] = useState({ images: product.images, video: product.video?.src || null });
    return (
        <ProductMediaEditor
            images={media.images}
            video={media.video}
            onChange={setMedia}
            showToast={(msg) => console.info('[toast]', msg)}
        />
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

                <p style={note}>Vista previa: no guarda nada (subir archivos sí usaría el almacenamiento real). Fotos y video del negocio de simulación Espléndidas y de Unsplash.</p>
            </div>
        </div>
    );
}
