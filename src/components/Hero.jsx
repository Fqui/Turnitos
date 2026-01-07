import React from 'react';
import { motion } from 'framer-motion';

export default function Hero() {
    return (
        <section style={{
            textAlign: 'center',
            marginBottom: '40px',
            padding: '60px 20px 40px',
            position: 'relative',
            overflow: 'hidden'
        }}>
            {/* Background enhancement */}
            <div style={{
                position: 'absolute',
                top: '-50%',
                left: '50%',
                transform: 'translate(-50%, 0)',
                width: '100%',
                maxWidth: '600px',
                height: '400px',
                background: 'radial-gradient(circle, rgba(0, 230, 118, 0.15) 0%, transparent 70%)',
                filter: 'blur(60px)',
                zIndex: -1
            }} />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
            >
                <h2 style={{
                    fontSize: 'clamp(36px, 5vw, 56px)',
                    fontWeight: '900',
                    marginBottom: '16px',
                    lineHeight: '1.1',
                    letterSpacing: '-0.02em',
                    color: 'var(--text-primary)'
                }}>
                    Reserva tu próximo<br />
                    <span style={{
                        background: 'linear-gradient(135deg, var(--primary-paddle) 0%, var(--primary-football) 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        display: 'inline-block'
                    }}>
                        cancha, turno o servicio.
                    </span>
                </h2>

                <p style={{
                    color: 'var(--text-secondary)',
                    fontSize: 'clamp(16px, 3vw, 18px)',
                    lineHeight: '1.6',
                    maxWidth: '600px',
                    margin: '0 auto 10px',
                    fontWeight: '500'
                }}>
                    El marketplace de servicios de La Rioja. Deportes, belleza, salud y eventos en un solo lugar.
                </p>
            </motion.div>
        </section>
    );
}
