import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import SEOHead from '../components/SEOHead';
import BusinessLeadForm from '../components/business/BusinessLeadForm';

const PLANS = [
    { icon: '💇', title: 'Servicios', detail: 'Peluquería, estética, salud, mascotas', price: 'Desde $17.000', unit: '/mes', note: 'Con 1 profesional' },
    { icon: '🎾', title: 'Canchas', detail: 'Pádel, fútbol, tenis y más', price: '$20.000', unit: '/mes por cancha', note: 'Precio más bajo desde 4 canchas' },
    { icon: '🏡', title: 'Alquileres', detail: 'Quinchos, salones y espacios', price: '$15.000', unit: '/mes', note: 'Precio fijo' }
];

export default function ForBusinesses() {
    const whatsappLink = "https://wa.me/5493805002706?text=Hola,%20quiero%20sumar%20mi%20negocio%20a%20Turnitos";

    return (
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-main)', color: 'var(--text-primary)' }}>
            <SEOHead
                title="TurnitosLR para Empresas | Digitalizá las Reservas de tu Negocio"
                description="Sumá tu cancha, peluquería, consultorio o quincho a TurnitosLR. Turnos online 24/7, cobro de señas y Link in Bio. Probalo 14 días gratis."
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
                            Turnos online 24/7, cobro de señas con tu Alias, tienda online y Link in Bio para canchas, peluquerías, consultorios, quinchos y más. Probalo 14 días gratis.
                        </p>

                        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
                            <a
                                href="#sumate"
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
                                <span>🚀 Quiero sumar mi negocio</span>
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
                            description="Mostrá pelotas, indumentaria, bebidas o productos en el perfil de tu local y recibí los pedidos por WhatsApp."
                        />
                        <FeatureCard
                            icon="⭐"
                            title="Reseñas Reales"
                            description="Solo pueden calificarte clientes que reservaron en tu local. Las estrellas se muestran en tu perfil y ayudan a que te elijan."
                        />
                        <FeatureCard
                            icon="📊"
                            title="Reportes y Control de Caja"
                            description="Visualizá tus ingresos diarios, turnos completados, horas pico y clientes recurrentes desde tu panel administrativo."
                        />
                        <FeatureCard
                            icon="🤖"
                            title="Recordatorios por WhatsApp"
                            badge="Próximamente"
                            description="Tus clientes van a recibir el recordatorio del turno y el pedido de reseña de forma automática, sin que tengas que configurar nada."
                        />
                    </div>
                </div>
            </section>

            {/* Precios */}
            <section style={{ padding: '80px 20px', backgroundColor: 'var(--bg-main)' }}>
                <div className="container" style={{ maxWidth: '1000px', margin: '0 auto' }}>
                    <div style={{ textAlign: 'center', marginBottom: '48px' }}>
                        <h2 style={{ fontSize: 'clamp(28px, 5vw, 40px)', fontWeight: '800', marginBottom: '14px' }}>
                            Precios simples, sin comisiones por turno
                        </h2>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '17px', maxWidth: '600px', margin: '0 auto' }}>
                            Un abono mensual según tu rubro. Los primeros 14 días son gratis y te armamos el perfil nosotros.
                        </p>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
                        {PLANS.map(plan => (
                            <div key={plan.title} style={{
                                padding: '28px',
                                backgroundColor: 'var(--bg-card)',
                                borderRadius: '20px',
                                border: '1px solid var(--border)',
                                textAlign: 'center'
                            }}>
                                <div style={{ fontSize: '36px', marginBottom: '10px' }}>{plan.icon}</div>
                                <h3 style={{ fontSize: '20px', fontWeight: '800', margin: '0 0 4px' }}>{plan.title}</h3>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: '0 0 18px' }}>{plan.detail}</p>
                                <div style={{ fontSize: '28px', fontWeight: '900' }}>{plan.price}</div>
                                <div style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '12px' }}>{plan.unit}</div>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: 0 }}>{plan.note}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Formulario de alta */}
            <section id="sumate" style={{ padding: '80px 20px', backgroundColor: 'var(--bg-card)', scrollMarginTop: '70px' }}>
                <div style={{ maxWidth: '640px', margin: '0 auto' }}>
                    <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                        <h2 style={{ fontSize: 'clamp(28px, 5vw, 38px)', fontWeight: '900', marginBottom: '12px' }}>
                            Sumá tu negocio
                        </h2>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '17px', margin: 0 }}>
                            Dejanos tus datos y te escribimos por WhatsApp. Verificamos tu negocio y te armamos el perfil.
                        </p>
                    </div>
                    <div style={{ padding: '28px', backgroundColor: 'var(--bg-main)', borderRadius: '20px', border: '1px solid var(--border)' }}>
                        <BusinessLeadForm />
                    </div>
                    <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '15px', marginTop: '20px' }}>
                        ¿Preferís hablar ahora?{' '}
                        <a href={whatsappLink} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary, #00E676)', fontWeight: '700' }}>
                            Escribinos por WhatsApp
                        </a>
                    </p>
                </div>
            </section>
        </div>
    );
}

function FeatureCard({ icon, title, description, badge }) {
    return (
        <div style={{
            padding: '32px',
            backgroundColor: 'var(--bg-main)',
            borderRadius: '20px',
            border: '1px solid var(--border)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.03)'
        }}>
            <div style={{ fontSize: '42px', marginBottom: '16px' }}>{icon}</div>
            <h3 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '10px' }}>
                {title}
                {badge && (
                    <span style={{ marginLeft: '8px', padding: '3px 10px', borderRadius: '50px', fontSize: '12px', fontWeight: '700', verticalAlign: 'middle', backgroundColor: 'rgba(41, 121, 255, 0.12)', color: '#2979FF' }}>
                        {badge}
                    </span>
                )}
            </h3>
            <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6', fontSize: '15px' }}>{description}</p>
        </div>
    );
}
