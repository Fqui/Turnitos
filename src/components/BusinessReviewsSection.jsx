import React, { useState, useEffect } from 'react';
import serviceAdapter from '../services/serviceAdapter';

export default function BusinessReviewsSection({ businessId, businessName }) {
    const [reviewsData, setReviewsData] = useState({ reviews: [], rating_avg: 5.0, reviews_count: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchReviews = async () => {
            if (!businessId) return;
            try {
                const data = await serviceAdapter.getReviewsByBusinessId(businessId);
                setReviewsData(data || { reviews: [], rating_avg: 5.0, reviews_count: 0 });
            } catch (err) {
                console.error('Error loading business reviews:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchReviews();
    }, [businessId]);

    const { reviews, rating_avg, reviews_count } = reviewsData;

    // Distribution calculation
    const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach(r => {
        const star = Math.min(5, Math.max(1, parseInt(r.rating, 10) || 5));
        counts[star] = (counts[star] || 0) + 1;
    });

    return (
        <section style={{
            marginTop: '40px',
            marginBottom: '40px',
            paddingTop: '32px',
            borderTop: '1px solid var(--border)',
            fontFamily: 'var(--font-sans, system-ui, sans-serif)'
        }}>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '24px',
                flexWrap: 'wrap',
                gap: '12px'
            }}>
                <div>
                    <h2 style={{
                        fontSize: '22px',
                        fontWeight: '800',
                        color: 'var(--text-primary)',
                        margin: 0,
                        letterSpacing: '-0.02em',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}>
                        <span>⭐</span> Opiniones y Experiencias
                    </h2>
                    <p style={{
                        fontSize: '13px',
                        color: 'var(--text-secondary)',
                        margin: '4px 0 0 0'
                    }}>
                        Reseñas 100% reales de clientes verificados por Turnitos
                    </p>
                </div>

                {reviews_count > 0 && (
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: 'rgba(251, 191, 36, 0.12)',
                        padding: '6px 14px',
                        borderRadius: '50px',
                        border: '1px solid rgba(251, 191, 36, 0.3)'
                    }}>
                        <span style={{ fontSize: '18px', color: '#fbbf24', fontWeight: '800' }}>★</span>
                        <span style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)' }}>
                            {rating_avg.toFixed(1)}
                        </span>
                        <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                            ({reviews_count} {reviews_count === 1 ? 'opinión' : 'opiniones'})
                        </span>
                    </div>
                )}
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                    Cargando opiniones...
                </div>
            ) : reviews_count === 0 ? (
                /* Empty state when no reviews yet */
                <div style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: '20px',
                    padding: '36px 24px',
                    textAlign: 'center'
                }}>
                    <div style={{ fontSize: '32px', marginBottom: '8px' }}>✨</div>
                    <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)', margin: '0 0 4px 0' }}>
                        ¡Sé el primero en calificar a {businessName || 'este negocio'}!
                    </h3>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, maxWidth: '400px', marginLeft: 'auto', marginRight: 'auto' }}>
                        Al completar tu reserva recibirás una invitación para calificar tu visita y compartir tu experiencia.
                    </p>
                </div>
            ) : (
                /* Ratings Summary + Reviews Grid */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {/* Summary Bar */}
                    <div style={{
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border)',
                        borderRadius: '20px',
                        padding: '24px',
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                        gap: '24px',
                        alignItems: 'center'
                    }}>
                        {/* Score big */}
                        <div style={{ textAlign: 'center' }}>
                            <div style={{
                                fontSize: '48px',
                                fontWeight: '900',
                                color: 'var(--text-primary)',
                                lineHeight: 1,
                                marginBottom: '4px',
                                letterSpacing: '-0.03em'
                            }}>
                                {rating_avg.toFixed(1)}
                            </div>
                            <div style={{ fontSize: '20px', color: '#fbbf24', marginBottom: '4px' }}>
                                {'★'.repeat(Math.round(rating_avg))}
                                {'☆'.repeat(5 - Math.round(rating_avg))}
                            </div>
                            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '600' }}>
                                Basado en {reviews_count} {reviews_count === 1 ? 'visita verificada' : 'visitas verificadas'}
                            </div>
                        </div>

                        {/* Star breakdown bars */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {[5, 4, 3, 2, 1].map(stars => {
                                const count = counts[stars] || 0;
                                const pct = reviews_count > 0 ? (count / reviews_count) * 100 : 0;
                                return (
                                    <div key={stars} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                                        <span style={{ minWidth: '32px', color: 'var(--text-secondary)', fontWeight: '700' }}>
                                            {stars} ★
                                        </span>
                                        <div style={{
                                            flex: 1,
                                            height: '8px',
                                            borderRadius: '4px',
                                            background: 'var(--bg-main)',
                                            overflow: 'hidden',
                                            border: '1px solid var(--border)'
                                        }}>
                                            <div style={{
                                                width: `${pct}%`,
                                                height: '100%',
                                                background: '#fbbf24',
                                                borderRadius: '4px',
                                                transition: 'width 0.4s ease'
                                            }} />
                                        </div>
                                        <span style={{ minWidth: '24px', textAlign: 'right', color: 'var(--text-muted)', fontSize: '11px' }}>
                                            {count}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Reviews Cards */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                        gap: '16px'
                    }}>
                        {reviews.map((rev, idx) => {
                            const author = rev.customer_name || 'Cliente Verificado';
                            const initials = author.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase() || 'CV';
                            const dateStr = rev.created_at ? new Date(rev.created_at).toLocaleDateString('es-AR', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric'
                            }) : '';

                            return (
                                <div
                                    key={rev.id || idx}
                                    style={{
                                        background: 'var(--bg-card)',
                                        border: '1px solid var(--border)',
                                        borderRadius: '18px',
                                        padding: '20px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        justifyContent: 'space-between',
                                        gap: '12px',
                                        boxShadow: '0 2px 10px rgba(0,0,0,0.02)'
                                    }}
                                >
                                    {/* Author & Stars */}
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <div style={{
                                                    width: '36px',
                                                    height: '36px',
                                                    borderRadius: '50%',
                                                    background: 'var(--bg-main)',
                                                    border: '1.5px solid var(--border)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontSize: '12px',
                                                    fontWeight: '800',
                                                    color: 'var(--text-primary)'
                                                }}>
                                                    {initials}
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-primary)' }}>
                                                        {author}
                                                    </div>
                                                    <div style={{
                                                        fontSize: '11px',
                                                        color: 'var(--primary-paddle, #00E676)',
                                                        fontWeight: '700',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '3px'
                                                    }}>
                                                        <span>✓</span> Reserva verificada
                                                    </div>
                                                </div>
                                            </div>

                                            <div style={{ color: '#fbbf24', fontSize: '14px', letterSpacing: '1px' }}>
                                                {'★'.repeat(rev.rating || 5)}
                                            </div>
                                        </div>

                                        {/* Comment text */}
                                        {rev.comment && (
                                            <p style={{
                                                fontSize: '13.5px',
                                                color: 'var(--text-secondary)',
                                                lineHeight: '1.45',
                                                margin: 0,
                                                fontStyle: 'normal'
                                            }}>
                                                "{rev.comment}"
                                            </p>
                                        )}
                                    </div>

                                    {/* Date footer */}
                                    {dateStr && (
                                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'right' }}>
                                            {dateStr}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </section>
    );
}
