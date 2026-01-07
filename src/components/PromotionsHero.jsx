import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { generateSlug } from '../utils/utils';

export default function PromotionsHero({ promotions, businesses }) {
    const [currentIndex, setCurrentIndex] = useState(0);

    // Auto-rotate every 5 seconds
    useEffect(() => {
        if (!promotions || promotions.length === 0) return;
        const timer = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % promotions.length);
        }, 5000);
        return () => clearInterval(timer);
    }, [promotions]);

    if (!promotions || promotions.length === 0) {
        // Fallback if no promotions: A generic "Welcome" banner styled similarly
        return (
            <div style={{
                height: '220px',
                marginBottom: '40px',
                borderRadius: '24px',
                background: 'linear-gradient(135deg, var(--bg-card) 0%, var(--bg-main) 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid var(--border)',
                position: 'relative',
                overflow: 'hidden'
            }}>
                <div style={{ textAlign: 'center', zIndex: 2 }}>
                    <h2 style={{ fontSize: '28px', fontWeight: '800', marginBottom: '8px' }}>
                        Bienvenido a Turnitos
                    </h2>
                    <p style={{ color: 'var(--text-secondary)' }}>
                        Explora los mejores servicios de la ciudad
                    </p>
                </div>
            </div>
        );
    }

    const currentPromo = promotions[currentIndex];
    const business = businesses.find(b => b.id === currentPromo.business_id);

    return (
        <section style={{ marginBottom: '40px', position: 'relative' }}>
            <div style={{
                height: '280px',
                position: 'relative',
                borderRadius: '32px',
                overflow: 'hidden',
                boxShadow: '0 20px 40px -10px rgba(0,0,0,0.15)'
            }}>
                <AnimatePresence mode='wait'>
                    <motion.div
                        key={currentPromo.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.4 }}
                        style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}
                    >
                        <Link
                            to={`/${generateSlug(business?.name || '')}/turnos`}
                            state={{ business }}
                            style={{ textDecoration: 'none', display: 'block', height: '100%' }}
                        >
                            <div className="promo-card">
                                {/* Image Section (Background on Mobile, Right Side on Desktop) */}
                                <div className="promo-image-container">
                                    <img
                                        src={currentPromo.image}
                                        alt={currentPromo.title}
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    />
                                </div>

                                {/* Content Section (Overlay on Mobile, Left Side on Desktop) */}
                                <div className="promo-content">
                                    <motion.div
                                        initial={{ y: 20, opacity: 0 }}
                                        animate={{ y: 0, opacity: 1 }}
                                        transition={{ delay: 0.1 }}
                                    >
                                        <div className="promo-badge" style={{
                                            display: 'inline-flex',
                                            padding: '6px 12px',
                                            backdropFilter: 'blur(4px)',
                                            borderRadius: '50px',
                                            fontSize: '13px',
                                            fontWeight: '700',
                                            marginBottom: '16px',
                                        }}>
                                            {currentPromo.discount} OFF
                                        </div>
                                        <h2 className="promo-title-mobile" style={{
                                            fontSize: 'clamp(24px, 4vw, 42px)',
                                            fontWeight: '800',
                                            lineHeight: 1.1,
                                            marginBottom: '12px',
                                        }}>
                                            {currentPromo.title}
                                        </h2>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div style={{
                                                width: '28px',
                                                height: '28px',
                                                borderRadius: '50%',
                                                background: 'var(--primary-paddle)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: '14px',
                                                color: '#000'
                                            }}>
                                                📍
                                            </div>
                                            <span className="promo-business-name" style={{ fontSize: '16px', fontWeight: '600' }}>
                                                {business?.name || 'Ver Negocio'}
                                            </span>
                                        </div>
                                    </motion.div>
                                </div>
                            </div>
                        </Link>
                    </motion.div>
                </AnimatePresence>

                {/* Indicators */}
                <div style={{
                    position: 'absolute',
                    bottom: '20px',
                    right: '20px',
                    display: 'flex',
                    gap: '8px',
                    zIndex: 10
                }}>
                    {promotions.map((_, idx) => (
                        <div
                            key={idx}
                            onClick={() => setCurrentIndex(idx)}
                            style={{
                                width: idx === currentIndex ? '24px' : '8px',
                                height: '8px',
                                borderRadius: '4px',
                                background: 'white',
                                opacity: idx === currentIndex ? 1 : 0.4,
                                transition: 'all 0.3s',
                                cursor: 'pointer',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                            }}
                        />
                    ))}
                </div>
            </div>
        </section>
    );
}
