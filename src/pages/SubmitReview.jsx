import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import serviceAdapter from '../services/serviceAdapter';
import { generateSlug } from '../utils/utils';

export default function SubmitReview() {
    const { token } = useParams();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [reviewInfo, setReviewInfo] = useState(null);
    const [errorMessage, setErrorMessage] = useState('');
    
    // Form state
    const [rating, setRating] = useState(5);
    const [hoverRating, setHoverRating] = useState(0);
    const [comment, setComment] = useState('');
    const [customerName, setCustomerName] = useState('');
    const [isSubmitted, setIsSubmitted] = useState(false);

    useEffect(() => {
        const fetchInfo = async () => {
            if (!token) {
                setErrorMessage('No se ha proporcionado un enlace válido.');
                setLoading(false);
                return;
            }

            try {
                const info = await serviceAdapter.getReviewInfoByToken(token);
                if (!info.success) {
                    setErrorMessage(info.error || 'El enlace de calificación no es válido o ha expirado.');
                } else if (info.isAlreadySubmitted) {
                    setIsSubmitted(true);
                    setReviewInfo(info);
                } else {
                    setReviewInfo(info);
                    setCustomerName(info.customer_name || info.booking?.customer_name || '');
                }
            } catch (err) {
                console.error('Error fetching review info:', err);
                setErrorMessage('Ocurrió un error al cargar la información de la reserva.');
            } finally {
                setLoading(false);
            }
        };

        fetchInfo();
    }, [token]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (submitting) return;

        setSubmitting(true);
        try {
            await serviceAdapter.submitReviewByToken(token, {
                rating,
                comment,
                customer_name: customerName
            });
            setIsSubmitted(true);
        } catch (err) {
            console.error('Error submitting review:', err);
            alert(err.message || 'Error al guardar la reseña. Inténtalo nuevamente.');
        } finally {
            setSubmitting(false);
        }
    };

    const ratingLabels = {
        1: 'Mala experiencia 🙁',
        2: 'Regular 😐',
        3: 'Buena 🙂',
        4: 'Muy buena 😊',
        5: '¡Excelente experiencia! 🌟'
    };

    const business = reviewInfo?.business;
    const businessSlug = business?.name ? generateSlug(business.name) : '';

    if (loading) {
        return (
            <div style={{
                minHeight: '80vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '24px'
            }}>
                <div style={{
                    width: '36px',
                    height: '36px',
                    border: '3px solid var(--border)',
                    borderTopColor: 'var(--primary)',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite'
                }} />
            </div>
        );
    }

    if (errorMessage) {
        return (
            <div style={{
                minHeight: '80vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '24px'
            }}>
                <div style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: '24px',
                    padding: '40px 24px',
                    maxWidth: '480px',
                    width: '100%',
                    textAlign: 'center',
                    boxShadow: '0 12px 36px rgba(0,0,0,0.08)'
                }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
                    <h2 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '8px' }}>
                        Enlace no disponible
                    </h2>
                    <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: '1.5' }}>
                        {errorMessage}
                    </p>
                    <Link
                        to="/"
                        style={{
                            display: 'inline-block',
                            padding: '12px 28px',
                            borderRadius: '50px',
                            background: 'var(--text-primary)',
                            color: 'var(--bg-card)',
                            textDecoration: 'none',
                            fontWeight: '700',
                            fontSize: '14px'
                        }}
                    >
                        Volver al Inicio
                    </Link>
                </div>
            </div>
        );
    }

    if (isSubmitted) {
        return (
            <div style={{
                minHeight: '85vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '24px'
            }}>
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    style={{
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border)',
                        borderRadius: '28px',
                        padding: '44px 28px',
                        maxWidth: '480px',
                        width: '100%',
                        textAlign: 'center',
                        boxShadow: '0 20px 48px rgba(0,0,0,0.08)'
                    }}
                >
                    <div style={{
                        width: '72px',
                        height: '72px',
                        borderRadius: '50%',
                        background: 'rgba(0, 230, 118, 0.15)',
                        color: 'var(--primary-paddle, #00E676)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '36px',
                        margin: '0 auto 20px auto'
                    }}>
                        ✓
                    </div>

                    <h2 style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '8px' }}>
                        ¡Muchas gracias por tu opinión!
                    </h2>
                    <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '28px', lineHeight: '1.5' }}>
                        Tu reseña verificada para <strong>{business?.name || 'el negocio'}</strong> ha sido registrada con éxito y ayuda a toda la comunidad.
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {businessSlug && (
                            <button
                                onClick={() => navigate(`/${businessSlug}`)}
                                style={{
                                    width: '100%',
                                    padding: '14px',
                                    borderRadius: '16px',
                                    background: 'var(--primary, #00E676)',
                                    color: '#000000',
                                    border: 'none',
                                    fontWeight: '800',
                                    fontSize: '15px',
                                    cursor: 'pointer',
                                    boxShadow: '0 4px 14px rgba(0,230,118,0.3)'
                                }}
                            >
                                Ver perfil de {business?.name}
                            </button>
                        )}
                        <Link
                            to="/"
                            style={{
                                width: '100%',
                                padding: '14px',
                                borderRadius: '16px',
                                background: 'transparent',
                                color: 'var(--text-secondary)',
                                border: '1px solid var(--border)',
                                textDecoration: 'none',
                                fontWeight: '700',
                                fontSize: '14px',
                                display: 'block',
                                textAlign: 'center'
                            }}
                        >
                            Ir al Inicio de Turnitos
                        </Link>
                    </div>
                </motion.div>
            </div>
        );
    }

    return (
        <div style={{
            minHeight: '90vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px 16px'
        }}>
            <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: '28px',
                    padding: '36px 24px',
                    maxWidth: '520px',
                    width: '100%',
                    boxShadow: '0 20px 48px rgba(0,0,0,0.08)'
                }}
            >
                {/* Business Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
                    {business?.logo ? (
                        <img
                            src={business.logo}
                            alt={business.name}
                            style={{
                                width: '64px',
                                height: '64px',
                                borderRadius: '16px',
                                objectFit: 'cover',
                                border: '2px solid var(--border)'
                            }}
                        />
                    ) : (
                        <div style={{
                            width: '64px',
                            height: '64px',
                            borderRadius: '16px',
                            background: 'var(--bg-main)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '28px',
                            border: '2px solid var(--border)'
                        }}>
                            🏢
                        </div>
                    )}
                    <div>
                        <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '3px 8px',
                            borderRadius: '20px',
                            background: 'rgba(0, 230, 118, 0.12)',
                            color: 'var(--primary-paddle, #00E676)',
                            fontSize: '11px',
                            fontWeight: '800',
                            marginBottom: '4px'
                        }}>
                            <span>🛡️</span> Reserva Verificada
                        </div>
                        <h1 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>
                            {business?.name || 'Calificar Servicio'}
                        </h1>
                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
                            {business?.location || 'Turnitos'}
                        </p>
                    </div>
                </div>

                <form onSubmit={handleSubmit}>
                    {/* Stars Selector */}
                    <div style={{
                        textAlign: 'center',
                        padding: '24px 16px',
                        background: 'var(--bg-main)',
                        borderRadius: '20px',
                        marginBottom: '24px',
                        border: '1px solid var(--border)'
                    }}>
                        <label style={{
                            display: 'block',
                            fontSize: '15px',
                            fontWeight: '700',
                            color: 'var(--text-primary)',
                            marginBottom: '12px'
                        }}>
                            ¿Cómo calificarías tu experiencia?
                        </label>

                        {/* Interactive Stars */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'center',
                            gap: '8px',
                            fontSize: '38px',
                            cursor: 'pointer',
                            userSelect: 'none'
                        }}>
                            {[1, 2, 3, 4, 5].map((star) => {
                                const isFilled = (hoverRating || rating) >= star;
                                return (
                                    <motion.span
                                        key={star}
                                        whileHover={{ scale: 1.2 }}
                                        whileTap={{ scale: 0.9 }}
                                        onMouseEnter={() => setHoverRating(star)}
                                        onMouseLeave={() => setHoverRating(0)}
                                        onClick={() => setRating(star)}
                                        style={{
                                            color: isFilled ? '#fbbf24' : 'var(--border)',
                                            transition: 'color 0.15s ease',
                                            filter: isFilled ? 'drop-shadow(0 2px 4px rgba(251, 191, 36, 0.4))' : 'none'
                                        }}
                                    >
                                        ★
                                    </motion.span>
                                );
                            })}
                        </div>

                        <div style={{
                            marginTop: '10px',
                            fontSize: '14px',
                            fontWeight: '700',
                            color: 'var(--text-primary)'
                        }}>
                            {ratingLabels[hoverRating || rating]}
                        </div>
                    </div>

                    {/* Customer Name */}
                    <div style={{ marginBottom: '16px' }}>
                        <label style={{
                            display: 'block',
                            fontSize: '13px',
                            fontWeight: '700',
                            color: 'var(--text-secondary)',
                            marginBottom: '6px'
                        }}>
                            Tu Nombre
                        </label>
                        <input
                            type="text"
                            value={customerName}
                            onChange={(e) => setCustomerName(e.target.value)}
                            placeholder="Ej. Juan Pérez"
                            required
                            style={{
                                width: '100%',
                                padding: '12px 16px',
                                borderRadius: '14px',
                                border: '1px solid var(--border)',
                                background: 'var(--bg-main)',
                                color: 'var(--text-primary)',
                                fontSize: '14px',
                                outline: 'none'
                            }}
                        />
                    </div>

                    {/* Comment Area */}
                    <div style={{ marginBottom: '24px' }}>
                        <label style={{
                            display: 'block',
                            fontSize: '13px',
                            fontWeight: '700',
                            color: 'var(--text-secondary)',
                            marginBottom: '6px'
                        }}>
                            Comentario u opinión (opcional)
                        </label>
                        <textarea
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            placeholder="Contanos qué fue lo que más te gustó de las instalaciones, puntualidad, atención..."
                            rows={4}
                            style={{
                                width: '100%',
                                padding: '14px 16px',
                                borderRadius: '16px',
                                border: '1px solid var(--border)',
                                background: 'var(--bg-main)',
                                color: 'var(--text-primary)',
                                fontSize: '14px',
                                outline: 'none',
                                resize: 'vertical',
                                fontFamily: 'inherit',
                                lineHeight: '1.5'
                            }}
                        />
                    </div>

                    {/* Submit Button */}
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        type="submit"
                        disabled={submitting}
                        style={{
                            width: '100%',
                            padding: '16px',
                            borderRadius: '16px',
                            background: 'var(--primary, #00E676)',
                            color: '#000000',
                            border: 'none',
                            fontWeight: '800',
                            fontSize: '16px',
                            cursor: submitting ? 'not-allowed' : 'pointer',
                            opacity: submitting ? 0.7 : 1,
                            boxShadow: '0 6px 20px rgba(0, 230, 118, 0.35)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px'
                        }}
                    >
                        {submitting ? 'Enviando reseña...' : 'Publicar Calificación ⭐'}
                    </motion.button>
                </form>
            </motion.div>
        </div>
    );
}
