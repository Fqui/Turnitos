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
    // Horizontal carousel showing multiple product mini-cards
    // ─────────────────────────────────────────────────────────────
    const scrollRef = useRef(null);

    const scrollCarousel = (direction) => {
        if (!scrollRef.current) return;
        const scrollAmount = 160;
        scrollRef.current.scrollBy({
            left: direction === 'next' ? scrollAmount : -scrollAmount,
            behavior: 'smooth'
        });
    };

    return (
        <div
            className="profile-store-promo-card"
            style={{
                position: 'relative',
                width: '100%',
                padding: '10px',
                borderRadius: '18px',
                background: 'linear-gradient(145deg, var(--bg-card) 0%, rgba(255,255,255,0.03) 100%)',
                border: '1px solid var(--border)',
                boxShadow: '0 6px 20px rgba(0,0,0,0.08)',
                backdropFilter: 'blur(12px)',
                overflow: 'hidden'
            }}
        >

            {/* Horizontal Product Carousel */}
            <div style={{ position: 'relative', zIndex: 1 }}>
                <div
                    ref={scrollRef}
                    style={{
                        display: 'flex',
                        gap: '8px',
                        overflowX: 'auto',
                        scrollSnapType: 'x mandatory',
                        scrollbarWidth: 'none',
                        msOverflowStyle: 'none'
                    }}
                    className="store-products-carousel"
                >
                    {products.length > 0 ? (
                        <>
                            {products.map((product, idx) => {
                                const img = product?.image || product?.images?.[0] || 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=300&q=80';
                                return (
                                    <div
                                        key={product?.id || idx}
                                        onClick={goToStore}
                                        style={{
                                            flex: '0 0 120px',
                                            scrollSnapAlign: 'start',
                                            background: 'var(--bg-main)',
                                            borderRadius: '12px',
                                            border: '1px solid var(--border)',
                                            padding: '8px',
                                            cursor: 'pointer',
                                            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '6px'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.transform = 'translateY(-2px)';
                                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.transform = 'translateY(0)';
                                            e.currentTarget.style.boxShadow = 'none';
                                        }}
                                    >
                                        <div style={{
                                            width: '100%',
                                            height: '80px',
                                            borderRadius: '8px',
                                            overflow: 'hidden',
                                            background: '#ffffff',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}>
                                            <img
                                                src={img}
                                                alt={product.name}
                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                            />
                                        </div>
                                        <div style={{ minWidth: 0 }}>
                                            <h4 style={{
                                                fontSize: '11px',
                                                fontWeight: '700',
                                                color: 'var(--text-primary)',
                                                margin: '0 0 2px 0',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap'
                                            }}>
                                                {product.name}
                                            </h4>
                                            <span style={{
                                                fontSize: '12px',
                                                fontWeight: '800',
                                                color: primaryColor
                                            }}>
                                                {formatPrice(product.price)}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}

                            {/* CTA Card - Ir a la Tienda */}
                            <div
                                onClick={goToStore}
                                style={{
                                    flex: '0 0 120px',
                                    scrollSnapAlign: 'start',
                                    background: primaryColor,
                                    borderRadius: '12px',
                                    padding: '12px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    transition: 'transform 0.2s ease, filter 0.2s ease'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                    e.currentTarget.style.filter = 'brightness(1.1)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.filter = 'brightness(1)';
                                }}
                            >
                                <ShoppingBag size={22} color="#ffffff" />
                                <span style={{
                                    fontSize: '12px',
                                    fontWeight: '800',
                                    color: '#ffffff',
                                    textAlign: 'center',
                                    lineHeight: 1.2
                                }}>
                                    Ir a la Tienda
                                </span>
                                <ArrowRight size={16} color="#ffffff" />
                            </div>
                        </>
                    ) : (
                        <div
                            onClick={goToStore}
                            style={{
                                flex: '0 0 100%',
                                background: primaryColor,
                                borderRadius: '12px',
                                padding: '16px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '10px'
                            }}
                        >
                            <ShoppingBag size={20} color="#ffffff" />
                            <span style={{
                                fontSize: '13px',
                                fontWeight: '700',
                                color: '#ffffff'
                            }}>
                                Ir a la Tienda
                            </span>
                            <ArrowRight size={14} color="#ffffff" />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
