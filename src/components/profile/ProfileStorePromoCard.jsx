import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, ChevronLeft, ChevronRight, ArrowRight, Sparkles, Tag } from 'lucide-react';
import { getSubdomain } from '../../utils/utils';
import { getStoreProducts } from '../../services/supabase/storeService';

export const getSafeStoreProducts = (biz) => {
    if (!biz) return [];
    let meta = biz.metadata;
    if (typeof meta === 'string') {
        try {
            meta = JSON.parse(meta);
        } catch (e) {
            meta = {};
        }
    } else if (meta && typeof meta === 'object' && meta['0'] !== undefined) {
        try {
            const reconstructed = Object.keys(meta).sort((a, b) => Number(a) - Number(b)).map(k => meta[k]).join('');
            meta = JSON.parse(reconstructed);
        } catch (e) {
            meta = {};
        }
    }
    const list = meta?.store_products || biz.store_products;
    if (Array.isArray(list) && list.length > 0) {
        const active = list.filter(p => p && p.is_active !== false);
        if (active.length > 0) return active;
        return list;
    }
    return [];
};

export default function ProfileStorePromoCard({
    business,
    products: propProducts,
    primaryColor = '#10b981',
    isFullWidth = false
}) {
    const navigate = useNavigate();

    // 1. Synchronously resolve metadata products
    const directProducts = getSafeStoreProducts(business);
    const [fetchedProducts, setFetchedProducts] = useState(null);

    // Fallback: If no products found directly in biz, fetch directly from storeService
    useEffect(() => {
        if (
            (!propProducts || propProducts.length === 0) &&
            directProducts.length === 0 &&
            (business?.id || business?.slug)
        ) {
            getStoreProducts(business.id || business.slug)
                .then(res => {
                    if (Array.isArray(res) && res.length > 0) {
                        setFetchedProducts(res);
                    }
                })
                .catch(() => {});
        }
    }, [business?.id, business?.slug, propProducts, directProducts.length]);

    const products = (propProducts && Array.isArray(propProducts) && propProducts.length > 0)
        ? propProducts
        : (directProducts.length > 0 ? directProducts : (fetchedProducts || []));

    const [currentIndex, setCurrentIndex] = useState(0);
    const [isHovered, setIsHovered] = useState(false);
    const timerRef = useRef(null);

    // 2. Auto slide rotation (3.5s per slide, paused on hover)
    useEffect(() => {
        if (!products || products.length <= 1 || isHovered) {
            if (timerRef.current) clearInterval(timerRef.current);
            return;
        }

        timerRef.current = setInterval(() => {
            setCurrentIndex(prev => (prev + 1) % products.length);
        }, 3500);

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [products?.length, isHovered]);



    const currentProduct = (products && products.length > 0) ? (products[currentIndex] || products[0]) : null;

    const goToStore = (e) => {
        if (e) e.stopPropagation();
        const subdomain = getSubdomain();
        navigate(subdomain ? '/tienda' : `/${business?.slug || ''}/tienda`);
    };

    const handlePrev = (e) => {
        e.stopPropagation();
        setCurrentIndex(prev => (prev === 0 ? products.length - 1 : prev - 1));
    };

    const handleNext = (e) => {
        e.stopPropagation();
        setCurrentIndex(prev => (prev + 1) % products.length);
    };

    const formatPrice = (price) => {
        if (!price && price !== 0) return '';
        return `$${Number(price).toLocaleString('es-AR')}`;
    };

    const productImage = currentProduct?.image || currentProduct?.images?.[0] || 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=300&q=80';

    // ─────────────────────────────────────────────────────────────
    // FULL WIDTH BANNER MODE (When business has NO highlights)
    // ─────────────────────────────────────────────────────────────
    if (isFullWidth) {
        return (
            <div
                className="profile-store-banner-full"
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                onClick={goToStore}
                style={{
                    position: 'relative',
                    width: '100%',
                    marginTop: '16px',
                    marginBottom: '24px',
                    padding: '24px 28px',
                    borderRadius: '24px',
                    background: `linear-gradient(135deg, var(--bg-card) 0%, rgba(255,255,255,0.03) 100%)`,
                    border: '1px solid var(--border)',
                    boxShadow: '0 12px 36px rgba(0,0,0,0.14)',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '24px',
                    backdropFilter: 'blur(16px)',
                    transition: 'border-color 0.25s ease, box-shadow 0.25s ease, transform 0.25s ease'
                }}
            >
                {/* Ambient glow accent in corner */}
                <div
                    style={{
                        position: 'absolute',
                        top: '-40px',
                        right: '-40px',
                        width: '180px',
                        height: '180px',
                        borderRadius: '50%',
                        background: primaryColor,
                        opacity: 0.12,
                        filter: 'blur(50px)',
                        pointerEvents: 'none'
                    }}
                />

                {/* Left info column */}
                <div style={{ flex: 1, minWidth: '220px', zIndex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                        <span
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '4px 10px',
                                borderRadius: '20px',
                                background: `${primaryColor}20`,
                                color: primaryColor,
                                fontSize: '11px',
                                fontWeight: '800',
                                letterSpacing: '0.5px',
                                textTransform: 'uppercase'
                            }}
                        >
                            <ShoppingBag size={12} />
                            Tienda Oficial
                        </span>
                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Sparkles size={12} />
                            {products.length > 0 ? `${products.length} ${products.length === 1 ? 'producto' : 'productos'}` : 'Catálogo disponible'}
                        </span>
                    </div>

                    <h3 style={{
                        fontSize: '20px',
                        fontWeight: '800',
                        color: 'var(--text-primary)',
                        margin: '0 0 8px 0',
                        lineHeight: 1.2
                    }}>
                        Explorá la Tienda de {business?.name || 'este negocio'}
                    </h3>
                    <p style={{
                        fontSize: '13px',
                        color: 'var(--text-secondary)',
                        margin: '0 0 16px 0',
                        maxWidth: '480px',
                        lineHeight: 1.4
                    }}>
                        Adquirí productos exclusivos para retirar en tu turno o recibir en tu domicilio.
                    </p>

                    <button
                        onClick={goToStore}
                        style={{
                            padding: '9px 18px',
                            borderRadius: '12px',
                            border: 'none',
                            background: primaryColor,
                            color: '#ffffff',
                            fontWeight: '700',
                            fontSize: '13px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            cursor: 'pointer',
                            boxShadow: `0 4px 14px ${primaryColor}40`,
                            transition: 'transform 0.15s ease, filter 0.15s ease'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.filter = 'brightness(1.1)'}
                        onMouseLeave={(e) => e.currentTarget.style.filter = 'brightness(1)'}
                    >
                        Ver Catálogo Completo
                        <ArrowRight size={14} />
                    </button>
                </div>

                {/* Right slider preview showcase */}
                <div
                    style={{
                        position: 'relative',
                        width: '280px',
                        flexShrink: 0,
                        zIndex: 1,
                        background: 'var(--bg-main)',
                        borderRadius: '16px',
                        padding: '12px',
                        border: '1px solid var(--border)',
                        boxShadow: '0 6px 20px rgba(0,0,0,0.08)'
                    }}
                >
                    {products.length > 0 && currentProduct ? (
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={currentProduct?.id || currentIndex}
                                initial={{ opacity: 0, x: 12 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -12 }}
                                transition={{ duration: 0.25 }}
                                style={{ display: 'flex', alignItems: 'center', gap: '12px' }}
                            >
                                <div style={{
                                    width: '70px',
                                    height: '70px',
                                    borderRadius: '12px',
                                    overflow: 'hidden',
                                    flexShrink: 0,
                                    background: '#ffffff',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <img
                                        src={productImage}
                                        alt={currentProduct.name}
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    />
                                </div>

                                <div style={{ flex: 1, minWidth: 0 }}>
                                    {currentProduct.category && (
                                        <span style={{
                                            fontSize: '10px',
                                            fontWeight: '700',
                                            color: 'var(--text-secondary)',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.4px'
                                        }}>
                                            {currentProduct.category}
                                        </span>
                                    )}
                                    <h4 style={{
                                        fontSize: '13px',
                                        fontWeight: '700',
                                        color: 'var(--text-primary)',
                                        margin: '2px 0 4px 0',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap'
                                    }}>
                                        {currentProduct.name}
                                    </h4>
                                    <div style={{
                                        fontSize: '14px',
                                        fontWeight: '800',
                                        color: primaryColor
                                    }}>
                                        {formatPrice(currentProduct.price)}
                                    </div>
                                </div>
                            </motion.div>
                        </AnimatePresence>
                    ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '6px 4px' }}>
                            <div style={{
                                width: '56px',
                                height: '56px',
                                borderRadius: '12px',
                                background: `${primaryColor}18`,
                                color: primaryColor,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                            }}>
                                <ShoppingBag size={24} />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <h4 style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', margin: '0 0 3px 0' }}>
                                    Catálogo Oficial
                                </h4>
                                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                    Artículos disponibles
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Navigation buttons & dots if > 1 product */}
                    {products.length > 1 && (
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginTop: '10px',
                            paddingTop: '8px',
                            borderTop: '1px solid var(--border)'
                        }}>
                            <div style={{ display: 'flex', gap: '4px' }}>
                                {products.slice(0, 6).map((_, idx) => (
                                    <button
                                        key={idx}
                                        onClick={(e) => { e.stopPropagation(); setCurrentIndex(idx); }}
                                        style={{
                                            border: 'none',
                                            padding: 0,
                                            width: idx === currentIndex ? '14px' : '5px',
                                            height: '5px',
                                            borderRadius: '3px',
                                            background: idx === currentIndex ? primaryColor : 'var(--text-secondary)',
                                            opacity: idx === currentIndex ? 1 : 0.35,
                                            cursor: 'pointer',
                                            transition: 'all 0.2s ease'
                                        }}
                                        title={`Producto ${idx + 1}`}
                                    />
                                ))}
                            </div>

                            <div style={{ display: 'flex', gap: '4px' }}>
                                <button
                                    onClick={handlePrev}
                                    style={{
                                        border: '1px solid var(--border)',
                                        background: 'transparent',
                                        color: 'var(--text-secondary)',
                                        borderRadius: '6px',
                                        width: '22px',
                                        height: '22px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <ChevronLeft size={12} />
                                </button>
                                <button
                                    onClick={handleNext}
                                    style={{
                                        border: '1px solid var(--border)',
                                        background: 'transparent',
                                        color: 'var(--text-secondary)',
                                        borderRadius: '6px',
                                        width: '22px',
                                        height: '22px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <ChevronRight size={12} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // ─────────────────────────────────────────────────────────────
    // SIDE-BY-SIDE / STACKED CARD MODE (When business has highlights)
    // 2/3 Bento 3D Showcase Product Card + 1/3 Bento CTA Card (Apple Tech Style)
    // ─────────────────────────────────────────────────────────────
    const hasMultiple = products.length > 1;

    return (
        <div
            className="profile-store-promo-card"
            style={{
                position: 'relative',
                width: '100%',
                padding: 0,
                borderRadius: '24px',
                background: 'transparent',
                border: 'none',
                boxShadow: 'none',
                overflow: 'visible'
            }}
        >
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: products.length > 0 ? 'minmax(0, 2.35fr) minmax(86px, 1fr)' : '1fr',
                    gap: '10px',
                    alignItems: 'stretch',
                    width: '100%',
                    height: '124px'
                }}
            >
                {/* ═══ 2/3 COLUMN: APPLE TECH BENTO PRODUCT CARD ═══ */}
                {products.length > 0 && (
                    <div
                        onMouseEnter={() => setIsHovered(true)}
                        onMouseLeave={() => setIsHovered(false)}
                        onClick={goToStore}
                        style={{
                            position: 'relative',
                            background: `linear-gradient(135deg, #ffffff 45%, #ffffff 75%, ${primaryColor}12 100%)`,
                            borderRadius: '20px',
                            border: '1px solid rgba(0,0,0,0.06)',
                            padding: '13px 14px',
                            cursor: 'pointer',
                            overflow: 'hidden',
                            height: '124px',
                            minHeight: '124px',
                            maxHeight: '124px',
                            boxSizing: 'border-box',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            boxShadow: `0 8px 24px rgba(0,0,0,0.04)`,
                            transition: 'transform 0.22s ease, box-shadow 0.22s ease'
                        }}
                        onMouseEnter={(e) => {
                            setIsHovered(true);
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = `0 12px 32px ${primaryColor}22`;
                        }}
                        onMouseLeave={(e) => {
                            setIsHovered(false);
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.04)';
                        }}
                    >
                        {/* Ambient subtle corner glow matching business color */}
                        <div
                            style={{
                                position: 'absolute',
                                bottom: '-30px',
                                right: '-30px',
                                width: '120px',
                                height: '120px',
                                borderRadius: '50%',
                                background: `radial-gradient(circle, ${primaryColor}22 0%, rgba(255,255,255,0) 70%)`,
                                filter: 'blur(16px)',
                                pointerEvents: 'none',
                                zIndex: 0
                            }}
                        />

                        <AnimatePresence mode="wait">
                            <motion.div
                                key={currentProduct?.id || currentIndex}
                                initial={{ opacity: 0, scale: 0.98 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.98 }}
                                transition={{ duration: 0.22 }}
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    height: '100%',
                                    width: '100%',
                                    position: 'relative'
                                }}
                            >
                                {/* Left: Clean Typography & Micro-Badge */}
                                <div style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'center',
                                    zIndex: 2,
                                    maxWidth: '65%',
                                    minWidth: 0,
                                    gap: '2px'
                                }}>
                                    {/* Category / Highlight Badge with Brand Dot */}
                                    <div>
                                        <span style={{
                                            fontSize: '9.5px',
                                            fontWeight: '800',
                                            letterSpacing: '0.6px',
                                            color: '#64748b',
                                            textTransform: 'uppercase',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '4px'
                                        }}>
                                            <span style={{
                                                width: '5px',
                                                height: '5px',
                                                borderRadius: '50%',
                                                background: primaryColor,
                                                boxShadow: `0 0 6px ${primaryColor}80`
                                            }} />
                                            {currentProduct?.category || 'Destacado'}
                                        </span>
                                    </div>

                                    {/* Product Title (Fixed 2.5em height: reserves exactly 2 lines so card never expands or shrinks) */}
                                    <h3
                                        style={{
                                            fontSize: '15px',
                                            fontWeight: '800',
                                            color: '#0f172a',
                                            margin: '1px 0 0 0',
                                            lineHeight: '1.25',
                                            height: '2.5em',
                                            letterSpacing: '-0.3px',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            display: '-webkit-box',
                                            WebkitLineClamp: 2,
                                            WebkitBoxOrient: 'vertical'
                                        }}
                                        title={currentProduct?.name}
                                    >
                                        {currentProduct?.name || 'Producto'}
                                    </h3>

                                    {/* Product Price Treatment */}
                                    <div style={{ marginTop: '2px' }}>
                                        <span style={{
                                            fontSize: '15px',
                                            fontWeight: '800',
                                            color: '#0f172a',
                                            letterSpacing: '-0.3px'
                                        }}>
                                            {formatPrice(currentProduct?.price)}
                                        </span>
                                    </div>
                                </div>

                                {/* Right: Product Showcase with 3D Pedestal Lighting */}
                                <div style={{
                                    position: 'absolute',
                                    right: '-4px',
                                    bottom: '-2px',
                                    top: '-2px',
                                    width: '45%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    pointerEvents: 'none',
                                    zIndex: 1
                                }}>
                                    {/* 3D Illuminated Pedestal Pod behind PNG */}
                                    <div
                                        style={{
                                            position: 'absolute',
                                            width: '84px',
                                            height: '84px',
                                            borderRadius: '50%',
                                            background: `radial-gradient(circle, ${primaryColor}28 0%, ${primaryColor}10 45%, rgba(255,255,255,0) 72%)`,
                                            filter: 'blur(8px)',
                                            transform: 'translateY(6px)',
                                            zIndex: 0
                                        }}
                                    />

                                    {/* Floating PNG image with 3D ground drop-shadow */}
                                    <img
                                        src={productImage}
                                        alt={currentProduct?.name || 'Producto'}
                                        style={{
                                            maxHeight: '94px',
                                            maxWidth: '94px',
                                            width: 'auto',
                                            height: 'auto',
                                            objectFit: 'contain',
                                            zIndex: 1,
                                            filter: 'drop-shadow(0 12px 16px rgba(0,0,0,0.15))',
                                            transition: 'transform 0.25s ease'
                                        }}
                                    />
                                </div>
                            </motion.div>
                        </AnimatePresence>

                        {/* Modern Minimal Carousel Dots (Top Right) */}
                        {hasMultiple && (
                            <div
                                style={{
                                    position: 'absolute',
                                    top: '10px',
                                    right: '12px',
                                    display: 'flex',
                                    gap: '4px',
                                    alignItems: 'center',
                                    zIndex: 3
                                }}
                            >
                                {products.map((_, idx) => (
                                    <div
                                        key={idx}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setCurrentIndex(idx);
                                        }}
                                        style={{
                                            width: idx === currentIndex ? '11px' : '4px',
                                            height: '4px',
                                            borderRadius: '2px',
                                            background: idx === currentIndex
                                                ? primaryColor
                                                : 'rgba(0,0,0,0.15)',
                                            transition: 'all 0.25s ease',
                                            cursor: 'pointer'
                                        }}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* ═══ 1/3 COLUMN: SOLID CARD "TIENDA" (CENTERED WITH ARROW RIGHT) ═══ */}
                <div
                    onClick={goToStore}
                    style={{
                        position: 'relative',
                        background: `linear-gradient(145deg, ${primaryColor} 0%, ${primaryColor}ea 100%)`,
                        borderRadius: '20px',
                        padding: '14px 10px',
                        cursor: 'pointer',
                        overflow: 'hidden',
                        height: '124px',
                        minHeight: '124px',
                        maxHeight: '124px',
                        boxSizing: 'border-box',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        textAlign: 'center',
                        gap: '6px',
                        boxShadow: `0 6px 22px ${primaryColor}35`,
                        transition: 'transform 0.2s ease, box-shadow 0.2s ease, filter 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.filter = 'brightness(1.06)';
                        e.currentTarget.style.boxShadow = `0 10px 28px ${primaryColor}45`;
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.filter = 'brightness(1)';
                        e.currentTarget.style.boxShadow = `0 6px 22px ${primaryColor}35`;
                    }}
                >
                    {/* Background Ambient Glow */}
                    <div
                        style={{
                            position: 'absolute',
                            top: '-25px',
                            right: '-25px',
                            width: '80px',
                            height: '80px',
                            borderRadius: '50%',
                            background: 'rgba(255,255,255,0.22)',
                            filter: 'blur(16px)',
                            pointerEvents: 'none'
                        }}
                    />

                    {/* Centered: "Tienda" + Arrow Right below */}
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        zIndex: 2
                    }}>
                        <h3 style={{
                            fontSize: '17px',
                            fontWeight: '800',
                            color: '#ffffff',
                            margin: 0,
                            lineHeight: 1.15,
                            letterSpacing: '-0.3px'
                        }}>
                            Tienda
                        </h3>
                        <div style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '50%',
                            background: 'rgba(255,255,255,0.22)',
                            backdropFilter: 'blur(4px)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#ffffff',
                            transition: 'transform 0.2s ease'
                        }}>
                            <ArrowRight size={16} strokeWidth={2.4} />
                        </div>
                    </div>

                    {/* Subtle watermark icon in corner */}
                    <div style={{
                        position: 'absolute',
                        right: '-8px',
                        bottom: '-10px',
                        opacity: 0.14,
                        pointerEvents: 'none',
                        zIndex: 1
                    }}>
                        <ShoppingBag size={64} color="#ffffff" />
                    </div>
                </div>
            </div>
        </div>
    );
}
