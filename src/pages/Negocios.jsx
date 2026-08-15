import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import SEOHead from '../components/SEOHead';

export default function ForBusinesses() {
    const whatsappLink = "https://wa.me/5493805002706?text=Hola,%20quiero%20sumar%20mi%20negocio%20a%20Turnitos";

    return (
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-main)', color: 'var(--text-primary)' }}>
            <SEOHead
                title="TurnitosLR para Empresas | Digitalizá las Reservas de tu Negocio"
                description="Sumá tu cancha de pádel, fútbol, salón de eventos, peluquería o consultorio a TurnitosLR. Gestión 24/7, cobro de señas y Link in Bio oficial."
                url="https://www.turnitoslr.com/negocios"
            />

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
                    background: 'radial-gradient(circle at 50% 50%, rgba(41, 121, 255, 0.12) 0%, transparent 70%)',
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
                            padding: '8px 18px',
                            borderRadius: '50px',
                            backgroundColor: 'rgba(41, 121, 255, 0.1)',
                            color: '#2979FF',
                            fontWeight: '700',
                            fontSize: '14px',
                            marginBottom: '24px',
                            border: '1px solid rgba(41, 121, 255, 0.2)'
                        }}>
                            Turnitos para Comercios y Clubes
                        </span>
                        <h1 style={{
                            fontSize: 'clamp(38px, 7vw, 68px)',
                            fontWeight: '900',
                            lineHeight: '1.1',
                            marginBottom: '24px',
                            background: 'linear-gradient(135deg, var(--text-primary) 0%, var(--text-secondary) 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            letterSpacing: '-1px'
                        }}>
                            Gestioná menos,<br />
                            <span style={{ color: '#00E676', WebkitTextFillColor: '#00E676' }}>llená todos tus turnos.</span>
                        </h1>
                        <p style={{
                            fontSize: 'clamp(17px, 3.5vw, 22px)',
                            color: 'var(--text-secondary)',
                            maxWidth: '720px',
                            margin: '0 auto 40px',
                            lineHeight: '1.6'
                        }}>
                            La plataforma líder en La Rioja para modernizar tu negocio. Turnos online 24/7, cobro de señas por Alias, recordatorios automáticos por WhatsApp y Link in Bio personalizado.
                        </p>

                        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
                            <a
                                href={whatsappLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                    padding: '16px 36px',
                                    backgroundColor: '#00E676',
                                    color: '#000',
                                    borderRadius: '50px',
                                    fontWeight: '800',
                                    fontSize: '17px',
                                    textDecoration: 'none',
                                    boxShadow: '0 8px 24px rgba(0, 230, 118, 0.35)',
                                    transition: 'transform 0.2s',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}
                            >
                                <span>💬 Sumar mi Negocio por WhatsApp</span>
                            </a>
                            <Link
                                to="/ayuda"
                                style={{
                                    padding: '16px 32px',
                                    backgroundColor: 'var(--bg-card)',
                                    color: 'var(--text-primary)',
                                    borderRadius: '50px',
                                    fontWeight: '700',
                                    fontSize: '16px',
                                    textDecoration: 'none',
                                    border: '1px solid var(--border)'
                                }}
                            >
                                Preguntas Frecuentes
                            </Link>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Features Grid */}
            <section style={{ padding: '80px 20px', backgroundColor: 'var(--bg-card)' }}>
                <div className="container" style={{ maxWidth: '1200px', margin: '0 auto' }}>
                    <div style={{ textAlign: 'center', marginBottom: '60px' }}>
                        <h2 style={{ fontSize: 'clamp(28px, 5vw, 40px)', fontWeight: '800', marginBottom: '14px' }}>
                            Todo lo que necesitás para hacer crecer tu local
                        </h2>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '17px', maxWidth: '600px', margin: '0 auto' }}>
                            Diseñado especialmente para la dinámica comercial de La Rioja.
                        </p>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '30px' }}>
                        <FeatureCard
                            icon="📅"
                            title="Agenda Online 24/7"
                            description="Tus clientes ven los horarios libres en tiempo real y reservan sin que tengas que atender llamadas ni responder mensajes a deshoras."
                        />
                        <FeatureCard
                            icon="💳"
                            title="Cobro de Señas Directo"
                            description="Configurá señas parciales o totales con tu propio Alias o CBU bancario. Reducí el ausentismo y congelá cada turno con seña."
                        />
                        <FeatureCard
                            icon="🔗"
                            title="Link in Bio Personalizado"
                            description="Tu enlace oficial exclusivo (ej. turnitoslr.com/tu-negocio) para poner en tu biografía de Instagram y estados de WhatsApp."
                        />
                        <FeatureCard
                            icon="🛍️"
                            title="Tienda de Productos"
                            description="Vendé pelotas de pádel, indumentaria, bebidas, suplementos o accesorios directamente desde el perfil de tu local."
                        />
                        <FeatureCard
                            icon="⭐"
                            title="Reseñas 100% Reales"
                            description="Recibí calificaciones verificadas con estrellas solo de clientes que completaron reservas, mejorando tu reputación en Google."
                        />
                        <FeatureCard
                            icon="📊"
                            title="Reportes y Control de Caja"
                            description="Visualizá tus ingresos diarios, turnos completados, horas pico y clientes recurrentes desde tu panel administrativo."
                        />
                    </div>
                </div>
            </section>

            {/* CTA Final */}
            <section style={{ padding: '90px 20px', textAlign: 'center', backgroundColor: 'var(--bg-main)' }}>
                <div style={{ maxWidth: '700px', margin: '0 auto' }}>
                    <h2 style={{ fontSize: 'clamp(28px, 5vw, 38px)', fontWeight: '900', marginBottom: '16px' }}>
                        ¿Listo para dar el salto digital?
                    </h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '17px', marginBottom: '36px' }}>
                        Te ayudamos a dar de alta tu negocio en menos de 24 horas. Escribinos directamente al WhatsApp de soporte.
                    </p>
                    <a
                        href={whatsappLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                            display: 'inline-block',
                            padding: '18px 48px',
                            backgroundColor: '#00E676',
                            color: '#000',
                            borderRadius: '50px',
                            fontWeight: '900',
                            fontSize: '18px',
                            textDecoration: 'none',
                            boxShadow: '0 8px 30px rgba(0, 230, 118, 0.4)',
                            transition: 'transform 0.2s'
                        }}
                    >
                        🚀 SUMAR MI NEGOCIO AHORA
                    </a>
                </div>
            </section>
        </div>
    );
}

function FeatureCard({ icon, title, description }) {
    return (
        <div style={{
            padding: '32px',
            backgroundColor: 'var(--bg-main)',
            borderRadius: '20px',
            border: '1px solid var(--border)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.03)'
        }}>
            <div style={{ fontSize: '42px', marginBottom: '16px' }}>{icon}</div>
            <h3 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '10px' }}>{title}</h3>
            <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6', fontSize: '15px' }}>{description}</p>
        </div>
    );
}
