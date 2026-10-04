import React, { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
    CalendarCheck, Wallet, Link2, ShoppingBag, Star, BarChart3, BellRing,
    Scissors, Trophy, Home as HomeIcon, Gift, MessageCircle, ArrowRight
} from 'lucide-react';
import SEOHead from '../components/SEOHead';
import BusinessLeadForm from '../components/business/BusinessLeadForm';
import '../styles/support.css';

const WHATSAPP_URL = 'https://wa.me/5493805002706?text=Hola,%20quiero%20sumar%20mi%20negocio%20a%20Turnitos';

const PLANS = [
    { icon: Scissors, title: 'Servicios', detail: 'Peluquería, estética, salud, mascotas', price: 'Desde $17.000', unit: 'por mes', note: 'Con 1 profesional. Sumás más a medida que crecés.' },
    { icon: Trophy, title: 'Canchas', detail: 'Pádel, fútbol, tenis y más', price: '$20.000', unit: 'por cancha, por mes', note: 'Precio más bajo desde 4 canchas.' },
    { icon: HomeIcon, title: 'Alquileres', detail: 'Quinchos, salones y espacios', price: '$15.000', unit: 'por mes', note: 'Sin comisión por reserva.' }
];

const FEATURES = [
    { icon: CalendarCheck, title: 'Agenda online 24/7', description: 'Tus clientes ven los horarios libres y reservan solos, sin llamadas ni mensajes a deshoras.' },
    { icon: Wallet, title: 'Cobro de señas', description: 'Configurá señas parciales o totales con tu Alias o CBU y reducí el ausentismo.' },
    { icon: Link2, title: 'Link in Bio', description: 'Tu enlace propio (turnitoslr.com/tu-negocio) para Instagram y los estados de WhatsApp.' },
    { icon: ShoppingBag, title: 'Tienda de productos', description: 'Mostrá pelotas, indumentaria, bebidas o productos y recibí los pedidos por WhatsApp.' },
    { icon: Star, title: 'Reseñas reales', description: 'Solo califican clientes que reservaron en tu local. Las estrellas se ven en tu perfil.' },
    { icon: BarChart3, title: 'Reportes y caja', description: 'Ingresos del día, turnos completados, horas pico y clientes recurrentes en tu panel.' },
    { icon: BellRing, title: 'Recordatorios por WhatsApp', badge: 'Próximamente', description: 'Recordatorios de turno y pedidos de reseña automáticos, sin que configures nada.' }
];

export default function ForBusinesses() {
    const { hash } = useLocation();

    // Al llegar con /negocios#sumate desde otra página, bajar hasta la sección
    useEffect(() => {
        if (hash) document.getElementById(hash.slice(1))?.scrollIntoView();
    }, [hash]);

    return (
        <div className="sp-page">
            <SEOHead
                title="TurnitosLR para Empresas | Digitalizá las Reservas de tu Negocio"
                description="Sumá tu cancha, peluquería, consultorio o quincho a TurnitosLR. Turnos online 24/7, cobro de señas y Link in Bio. Probalo 14 días gratis."
                url="https://www.turnitoslr.com/negocios"
            />

            <header className="sp-hero sp-hero--center">
                <div className="sp-wrap sp-wrap--narrow">
                    <span className="sp-eyebrow">TurnitosLR para negocios</span>
                    <h1 className="sp-title">Tus turnos online, sin atender el teléfono</h1>
                    <p className="sp-lead">
                        Agenda 24/7, cobro de señas con tu Alias, tienda online y Link in Bio para canchas, peluquerías, consultorios, quinchos y más.
                    </p>
                    <div className="sp-actions">
                        <a className="sp-btn sp-btn--primary" href="#sumate">
                            Quiero sumar mi negocio <ArrowRight size={18} aria-hidden="true" />
                        </a>
                        <a className="sp-btn" href="#precios">Ver precios</a>
                    </div>
                    <p className="sp-meta">14 días gratis · Sin comisión por turno · Te armamos el perfil</p>
                </div>
            </header>

            <main className="sp-wrap">
                <section id="precios" className="sp-section" style={{ scrollMarginTop: '96px' }}>
                    <div className="sp-section-head sp-section-head--center">
                        <h2 className="sp-h2">Precios simples</h2>
                        <p className="sp-lead">Un abono mensual según tu rubro. Sin comisiones por turno.</p>
                    </div>
                    <div className="sp-grid">
                        {PLANS.map(({ icon: Icon, title, detail, price, unit, note }) => (
                            <div key={title} className="sp-card sp-price-card">
                                <span className="sp-icon"><Icon size={20} aria-hidden="true" /></span>
                                <h3>{title}</h3>
                                <p>{detail}</p>
                                <div className="sp-price">{price}</div>
                                <div className="sp-price-unit">{unit}</div>
                                <p className="sp-price-note">{note}</p>
                            </div>
                        ))}
                    </div>
                    <div className="sp-callout">
                        <Gift size={18} aria-hidden="true" /> Los primeros 14 días son gratis.
                    </div>
                </section>

                <section className="sp-section">
                    <div className="sp-section-head sp-section-head--center">
                        <h2 className="sp-h2">Todo lo que necesitás en un solo lugar</h2>
                        <p className="sp-lead">Pensado para negocios de La Rioja, de cualquier rubro.</p>
                    </div>
                    <div className="sp-grid">
                        {FEATURES.map(({ icon: Icon, title, description, badge }) => (
                            <div key={title} className="sp-card">
                                <span className="sp-icon"><Icon size={20} aria-hidden="true" /></span>
                                <h3>
                                    {title}
                                    {badge && <span className="sp-badge">{badge}</span>}
                                </h3>
                                <p>{description}</p>
                            </div>
                        ))}
                    </div>
                </section>

                <section id="sumate" className="sp-section" style={{ scrollMarginTop: '96px' }}>
                    <div className="sp-wrap--narrow" style={{ margin: '0 auto' }}>
                        <div className="sp-section-head sp-section-head--center">
                            <h2 className="sp-h2">Sumá tu negocio</h2>
                            <p className="sp-lead">Dejanos tus datos y te escribimos por WhatsApp. Verificamos tu negocio y te armamos el perfil.</p>
                        </div>
                        <div className="sp-card">
                            <BusinessLeadForm />
                        </div>
                        <div className="sp-actions" style={{ justifyContent: 'center' }}>
                            <a className="sp-btn" href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
                                <MessageCircle size={18} aria-hidden="true" /> Prefiero hablar por WhatsApp
                            </a>
                            <Link className="sp-btn" to="/ayuda">Preguntas frecuentes</Link>
                        </div>
                    </div>
                </section>
            </main>
        </div>
    );
}
