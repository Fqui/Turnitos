import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { generateSlug } from '../utils/utils';

const addToSet = (src) => (prev) => {
    if (prev.has(src)) return prev;
    const next = new Set(prev);
    next.add(src);
    return next;
};

export default function PromotionsHero({ promotions, businesses }) {
    // previous = slide that stays opaque underneath while the current one fades in
    const [slide, setSlide] = useState({ current: 0, previous: null });
    const [loadedImages, setLoadedImages] = useState(() => new Set());
    const [failedImages, setFailedImages] = useState(() => new Set());

    const markLoaded = (src) => setLoadedImages(addToSet(src));
    const markFailed = (src) => setFailedImages(addToSet(src));

    // Preload all promotion images so the next slide is ready before it shows
    useEffect(() => {
        if (!promotions || promotions.length === 0) return;
        promotions.forEach(p => {
            if (!p.image) return;
            const img = new Image();
            img.onload = () => setLoadedImages(addToSet(p.image));
            img.onerror = () => setFailedImages(addToSet(p.image));
            img.src = p.image;
            if (img.complete && img.naturalWidth > 0) setLoadedImages(addToSet(p.image));
        });
    }, [promotions]);

    const count = promotions?.length || 0;
    // Wrap so the index stays valid if the list shrinks
    const activeIndex = count > 0 ? slide.current % count : 0;
    const previousIndex = slide.previous;

    const goTo = (getIndex) => setSlide((s) => {
        const from = s.current % count;
        const to = getIndex(from);
        return to === from ? s : { current: to, previous: from };
    });

    const nextPromo = count > 1 ? promotions[(activeIndex + 1) % count] : null;
    const nextReady = Boolean(nextPromo) && (
        !nextPromo.image || loadedImages.has(nextPromo.image) || failedImages.has(nextPromo.image)
    );

    // Auto-rotate 5s after the current slide shows, once the next image is ready.
    // Depending on activeIndex restarts the countdown after manual navigation.
    useEffect(() => {
        if (!nextReady) return;
        const timer = setTimeout(() => {
            goTo((from) => (from + 1) % count);
        }, 5000);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeIndex, nextReady, count]);

    if (!promotions || promotions.length === 0) {
        return (
            <div className="promotions-hero-card" style={{
                marginBottom: '40px',
                borderRadius: '24px',
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                position: 'relative',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                padding: '24px'
            }}>
                <div style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: '16px',
                    background: 'linear-gradient(90deg, var(--bg-card) 25%, var(--border) 50%, var(--bg-card) 75%)',
                    backgroundSize: '200% 100%',
                    animation: 'pulse 1.5s infinite'
                }} />
            </div>
        );
    }

    const handleNext = () => {
        goTo((from) => (from + 1) % count);
    };

    const handlePrev = () => {
        goTo((from) => (from - 1 + count) % count);
    };

    const handleDragEnd = (event, info) => {
        const threshold = 50;
        if (info.offset.x > threshold) {
            handlePrev();
        } else if (info.offset.x < -threshold) {
            handleNext();
        }
    };

    const renderSlide = (promo, isActive, isVisible) => {
        const business = businesses.find(b => b.id === promo.business_id);
        const imgError = Boolean(promo.image) && failedImages.has(promo.image);

        // Si no hay negocio pero hay link (guardado en description o action_url), abrimos enlace externo o ruta
        const isGeneralCampaign = !promo.business_id;

        let meta = null;
        try {
            if (promo.description && typeof promo.description === 'string' && promo.description.trim().startsWith('{')) {
                meta = JSON.parse(promo.description);
            }
        } catch (e) {}

        const actionUrl = meta?.action_url || (typeof promo.description === 'string' && (promo.description.startsWith('http://') || promo.description.startsWith('https://') || promo.description.startsWith('/')) ? promo.description : '');

        const isExternal = actionUrl?.startsWith('http://') || actionUrl?.startsWith('https://');
        const targetUrl = actionUrl || (business?.slug ? `/${business.slug}?promoId=${promo.id}` : (business?.name ? `/${generateSlug(business.name)}?promoId=${promo.id}` : '/negocios'));

        const placeholder = (
            <div style={{
                width: '100%',
                height: '100%',
                background: 'linear-gradient(135deg, #00E67620 0%, #2979FF20 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '48px'
            }}>
                🏷️
            </div>
        );

        const content = isGeneralCampaign ? (
            /* 🌐 Campaña General: Banner total sin división */
            <div className="promo-card promo-card--general">
                <div className="promo-image-container promo-image-container--general" style={{ overflow: 'hidden' }}>
                    {promo.image && !imgError && (
                        <img
                            className="promo-general-backdrop"
                            src={promo.image}
                            alt=""
                            aria-hidden="true"
                        />
                    )}
                    {promo.image && !imgError ? (
                        <img
                            src={promo.image}
                            alt={promo.title || 'Publicidad Turnitos'}
                            onLoad={() => markLoaded(promo.image)}
                            onError={() => markFailed(promo.image)}
                            style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                                objectPosition: 'center',
                                display: 'block'
                            }}
                        />
                    ) : placeholder}
                </div>
            </div>
        ) : (
            /* 🏢 Promoción de Negocio Específico: Split imagen a la izquierda y textos/descuento a la derecha */
            <div className="promo-card">
                {/* Image Section */}
                <div className="promo-image-container" style={{ overflow: 'hidden', background: 'linear-gradient(135deg, #1f2937 0%, #111827 100%)' }}>
                    {promo.image && !imgError ? (
                        <img
                            src={promo.image}
                            alt={promo.title}
                            onLoad={() => markLoaded(promo.image)}
                            onError={() => markFailed(promo.image)}
                            style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                                objectPosition: 'center 40%'
                            }}
                        />
                    ) : placeholder}
                </div>

                {/* Content Section */}
                <div className="promo-content">
                    <motion.div
                        initial={false}
                        animate={isVisible ? { y: 0, opacity: 1 } : { y: 15, opacity: 0 }}
                        transition={{ delay: isActive ? 0.15 : 0, duration: isVisible ? 0.35 : 0 }}
                    >
                        <div className="promo-badge" style={{
                            display: 'inline-flex',
                            padding: '4px 10px',
                            backdropFilter: 'blur(4px)',
                            borderRadius: '50px',
                            fontSize: '12px',
                            fontWeight: '700',
                            marginBottom: '8px',
                        }}>
                            {promo.discount}
                            {promo.discount && promo.discount.toString().trim().endsWith('%') && ' OFF'}
                        </div>
                        <h2 className="promo-title-mobile" style={{
                            fontSize: 'clamp(18px, 4.5vw, 36px)',
                            fontWeight: '800',
                            lineHeight: 1.15,
                            marginBottom: '6px',
                        }}>
                            {promo.title}
                        </h2>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '16px' }}>{business?.name ? '📍' : '⚡'}</span>
                            <span className="promo-business-name" style={{ fontSize: '16px', fontWeight: '600', fontFamily: 'var(--font-title)' }}>
                                {business?.name || 'Ver Negocio'}
                            </span>
                        </div>
                    </motion.div>
                </div>
            </div>
        );

        const linkStyle = {
            textDecoration: 'none',
            display: 'block',
            height: '100%',
            pointerEvents: 'auto'
        };

        if (isExternal) {
            return (
                <a
                    href={targetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    tabIndex={isActive ? 0 : -1}
                    style={linkStyle}
                >
                    {content}
                </a>
            );
        }

        return (
            <Link
                to={targetUrl}
                state={{ business, activePromo: promo }}
                tabIndex={isActive ? 0 : -1}
                style={linkStyle}
            >
                {content}
            </Link>
        );
    };

    return (
        <section style={{ marginBottom: '40px', position: 'relative' }}>
            <style>{`
                @keyframes shimmerWave {
                    0% { background-position: -200% 0; }
                    100% { background-position: 200% 0; }
                }
            `}</style>
            <div className="promotions-hero-card">
                {/* All slides stay mounted and stacked. The outgoing banner stays fully
                    opaque underneath while the new one fades in on top, so the card never
                    shows its empty background between slides */}
                {promotions.map((promo, idx) => {
                    const isActive = idx === activeIndex;
                    const isPrevious = idx === previousIndex && !isActive;
                    const isVisible = isActive || isPrevious;
                    return (
                        <motion.div
                            key={promo.id}
                            aria-hidden={!isActive}
                            initial={false}
                            animate={{ opacity: isVisible ? 1 : 0 }}
                            transition={{ duration: isActive ? 0.5 : 0, ease: 'easeInOut' }}
                            drag={isActive && promotions.length > 1 ? 'x' : false}
                            dragConstraints={{ left: 0, right: 0 }}
                            dragElastic={0.2}
                            onDragEnd={handleDragEnd}
                            style={{
                                width: '100%',
                                height: '100%',
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                zIndex: isActive ? 2 : (isPrevious ? 1 : 0),
                                pointerEvents: isActive ? 'auto' : 'none',
                                cursor: 'grab'
                            }}
                            whileDrag={{ cursor: 'grabbing' }}
                        >
                            {renderSlide(promo, isActive, isVisible)}
                        </motion.div>
                    );
                })}

                {/* Navigation Arrows - Desktop Only via CSS */}
                {promotions.length > 1 && (
                    <>
                        <button
                            className="desktop-only-arrow promo-arrow-prev"
                            onClick={handlePrev}
                            aria-label="Anterior promoción"
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="15 18 9 12 15 6"></polyline>
                            </svg>
                        </button>
                        <button
                            className="desktop-only-arrow promo-arrow-next"
                            onClick={handleNext}
                            aria-label="Siguiente promoción"
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="9 18 15 12 9 6"></polyline>
                            </svg>
                        </button>
                    </>
                )}

                {/* Indicators */}
                {promotions.length > 1 && (
                    <div style={{
                        position: 'absolute',
                        bottom: '18px',
                        right: '18px',
                        display: 'flex',
                        gap: '6px',
                        zIndex: 10
                    }}>
                        {promotions.map((_, idx) => (
                            <div
                                key={idx}
                                onClick={() => goTo(() => idx)}
                                style={{
                                    width: idx === activeIndex ? '24px' : '8px',
                                    height: '8px',
                                    borderRadius: '4px',
                                    background: 'white',
                                    opacity: idx === activeIndex ? 1 : 0.4,
                                    transition: 'all 0.3s',
                                    cursor: 'pointer',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                                }}
                            />
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
}
