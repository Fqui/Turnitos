import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

export default function ForBusinesses() {
    return (
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-main)', color: 'var(--text-primary)' }}>

            {/* Hero Section */}
            <section style={{
                position: 'relative',
                minHeight: '80vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                padding: '40px 20px'
            }}>
                <div style={{
                    position: 'absolute',
                    top: 0, left: 0, right: 0, bottom: 0,
                    background: 'radial-gradient(circle at 50% 50%, rgba(41, 121, 255, 0.1) 0%, transparent 70%)',
                    zIndex: 0
                }}></div>

                <div className="container" style={{ maxWidth: '1000px', zIndex: 1, textAlign: 'center' }}>
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                    >
                        <span style={{
                            display: 'inline-block',
                            padding: '8px 16px',
                            borderRadius: '50px',
                            backgroundColor: 'rgba(41, 121, 255, 0.1)',
                            color: '#2979FF',
                            fontWeight: '600',
                            fontSize: '14px',
                            marginBottom: '24px'
                        }}>
                            Turnitos para Empresas
                        </span>
                        <h1 style={{
                            fontSize: 'clamp(40px, 8vw, 72px)',
                            fontWeight: '900',
                            lineHeight: '1.1',
                            marginBottom: '24px',
                            background: 'linear-gradient(135deg, var(--text-primary) 0%, var(--text-secondary) 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent'
                        }}>
                            Gestiona menos,<br />
                            <span style={{ color: '#2979FF', WebkitTextFillColor: '#2979FF' }}>vende más.</span>
                        </h1>
                        <p style={{
                            fontSize: 'clamp(18px, 4vw, 24px)',
                            color: 'var(--text-secondary)',
                            maxWidth: '700px',
                            margin: '0 auto 40px',
                            lineHeight: '1.6'
                        }}>
                            La plataforma todo-en-uno para modernizar tu negocio. Reservas online, pagos automáticos y gestión simplificada.
                        </p>

                        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
                            <a href="https://wa.me/5493804123456?text=Hola,%20quiero%20sumar%20mi%20negocio%20a%20Turnitos"
                                style={{
                                    padding: '16px 40px',
                                    backgroundColor: '#2979FF',
                                    color: '#fff',
                                    borderRadius: '12px',
                                    fontWeight: 'bold',
                                    fontSize: '18px',
                                    textDecoration: 'none',
                                    boxShadow: '0 8px 20px rgba(41, 121, 255, 0.3)',
                                    transition: 'transform 0.2s'
                                }}
                            >
                                Empezar ahora
                            </a>
                            <Link to="/help"
                                style={{
                                    padding: '16px 40px',
                                    backgroundColor: 'var(--bg-card)',
                                    color: 'var(--text-primary)',
                                    borderRadius: '12px',
                                    fontWeight: 'bold',
                                    fontSize: '18px',
                                    textDecoration: 'none',
                                    border: '1px solid var(--border)'
                                }}
                            >
                                Más información
                            </Link>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Features Grid */}
            <section style={{ padding: '80px 20px', backgroundColor: 'var(--bg-card)' }}>
                <div className="container" style={{ maxWidth: '1200px', margin: '0 auto' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '40px' }}>

                        <FeatureCard
                            icon="📅"
                            title="Agenda Inteligente"
                            description="Tus clientes reservan 24/7 sin que tengas que atender el teléfono. Sincronización automática para evitar sobreturnos."
                        />
                        <FeatureCard
                            icon="💳"
                            title="Pagos Integrados"
                            description="Cobra señas automáticas para reducir el ausentismo ('no-show'). El dinero va directo a tu cuenta."
                        />
                        <FeatureCard
                            icon="📊"
                            title="Estadísticas Reales"
                            description="Conoce tus horarios pico, ingresos mensuales y servicios más vendidos con nuestro dashboard."
                        />
                        <FeatureCard
                            icon="📱"
                            title="Perfil Web Propio"
                            description="Tu propia página web dentro de Turnitos con tus fotos, logo, horarios y servicios. Profesional y atractivo."
                        />
                        <FeatureCard
                            icon="🔔"
                            title="Recordatorios"
                            description="Enviamos recordatorios automáticos por WhatsApp y Email a tus clientes para que no olviden su turno."
                        />
                        <FeatureCard
                            icon="🚀"
                            title="Visibilidad"
                            description="Aparece en el marketplace líder de La Rioja y llega a miles de nuevos clientes activos."
                        />

                    </div>
                </div>
            </section>

            {/* CTA Final */}
            <section style={{ padding: '100px 20px', textAlign: 'center' }}>
                <h2 style={{ fontSize: '36px', fontWeight: 'bold', marginBottom: '24px' }}>¿Listo para el siguiente nivel?</h2>
                <a href="https://wa.me/5493804123456?text=Hola,%20quiero%20sumar%20mi%20negocio%20a%20Turnitos"
                    style={{
                        display: 'inline-block',
                        padding: '20px 60px',
                        backgroundColor: '#00E676',
                        color: '#000',
                        borderRadius: '50px',
                        fontWeight: '900',
                        fontSize: '20px',
                        textDecoration: 'none',
                        boxShadow: '0 10px 30px rgba(0, 230, 118, 0.3)',
                        transform: 'scale(1.05)'
                    }}
                >
                    SUMAR MI NEGOCIO 🚀
                </a>
            </section>

        </div>
    );
}

function FeatureCard({ icon, title, description }) {
    return (
        <div style={{
            padding: '32px',
            backgroundColor: 'var(--bg-main)',
            borderRadius: '24px',
            border: '1px solid var(--border)'
        }}>
            <div style={{ fontSize: '48px', marginBottom: '20px' }}>{icon}</div>
            <h3 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '12px' }}>{title}</h3>
            <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>{description}</p>
        </div>
    );
}
