import React, { useEffect } from 'react';
import { motion } from 'framer-motion';

export default function BookingSuccessModal({ onClose }) {
    useEffect(() => {
        // Auto-close and redirect after 3 seconds
        const timer = setTimeout(() => {
            onClose();
        }, 3000);

        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                backdropFilter: 'blur(8px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10000,
                padding: '20px'
            }}
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                onClick={(e) => e.stopPropagation()}
                style={{
                    backgroundColor: 'var(--bg-card)',
                    borderRadius: '24px',
                    padding: '40px 32px',
                    maxWidth: '400px',
                    width: '100%',
                    textAlign: 'center',
                    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
                    border: '1px solid var(--border)'
                }}
            >
                {/* Success Icon */}
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                    style={{
                        width: '80px',
                        height: '80px',
                        margin: '0 auto 24px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #00E676 0%, #00C853 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 10px 30px rgba(0, 230, 118, 0.3)'
                    }}
                >
                    <svg
                        width="40"
                        height="40"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="white"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <motion.path
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: 1 }}
                            transition={{ delay: 0.3, duration: 0.5 }}
                            d="M20 6L9 17l-5-5"
                        />
                    </svg>
                </motion.div>

                {/* Title */}
                <h2
                    style={{
                        fontSize: '24px',
                        fontWeight: '800',
                        color: 'var(--text-primary)',
                        marginBottom: '12px'
                    }}
                >
                    ¡Reserva Confirmada!
                </h2>

                {/* Message */}
                <p
                    style={{
                        fontSize: '15px',
                        color: 'var(--text-secondary)',
                        marginBottom: '28px',
                        lineHeight: '1.5'
                    }}
                >
                    Tu reserva ha sido registrada con éxito. Recibirás la confirmación por WhatsApp.
                </p>

                {/* Button */}
                <button
                    onClick={onClose}
                    style={{
                        width: '100%',
                        padding: '14px 24px',
                        borderRadius: '12px',
                        border: 'none',
                        background: 'var(--primary-paddle)',
                        color: 'white',
                        fontSize: '15px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.2)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
                    }}
                >
                    Aceptar
                </button>

                {/* Auto-close indicator */}
                <p
                    style={{
                        fontSize: '12px',
                        color: 'var(--text-secondary)',
                        marginTop: '16px',
                        opacity: 0.7
                    }}
                >
                    Redirigiendo al inicio en 3 segundos...
                </p>
            </motion.div>
        </div>
    );
}
