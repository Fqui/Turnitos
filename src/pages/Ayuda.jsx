import React, { useState, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Search, X, ChevronDown, User, Store, MessageCircle, Mail } from 'lucide-react';
import SEOHead from '../components/SEOHead';
import '../styles/support.css';

const FAQS_CLIENTES = [
    {
        question: "¿Cómo reservo un turno en TurnitosLR?",
        answer: "No necesitás registrarte. Desde la página de inicio elegí el negocio, la cancha o el servicio, seleccioná la fecha y el horario libre, completá tu nombre y tu WhatsApp y confirmá. Vas a ver la confirmación de tu reserva en pantalla al instante."
    },
    {
        question: "¿Tengo que pagar por adelantado para reservar?",
        answer: "Depende de cada negocio. Algunos piden una seña para asegurar el turno y otros te cobran todo al momento de asistir. Antes de confirmar vas a ver las condiciones de pago y, si hay seña, los datos para transferir."
    },
    {
        question: "¿Cómo cancelo o modifico mi turno?",
        answer: "Escribile directamente al negocio con el botón de WhatsApp que aparece en tu confirmación o en su perfil. Cada negocio tiene su propia política de cancelación y devolución de señas, que podés ver antes de reservar."
    },
    {
        question: "¿Es gratis usar TurnitosLR para reservar?",
        answer: "Sí. Buscar, ver disponibilidad y reservar es 100% gratis para los clientes. Solo pagás el servicio al negocio."
    },
    {
        question: "¿Cómo compro en la tienda de un negocio?",
        answer: "Agregá los productos al carrito desde la tienda del negocio y enviá el pedido. El pedido le llega al negocio por WhatsApp y con él coordinás el pago y la entrega."
    },
    {
        question: "¿Cómo dejo una reseña?",
        answer: "Para que todas las opiniones sean reales, solo pueden calificar los clientes que reservaron. Después de tu turno te enviamos un enlace personal por WhatsApp para dejar tus estrellas y, si querés, un comentario."
    }
];

const FAQS_NEGOCIOS = [
    {
        question: "¿Cómo sumo mi negocio a TurnitosLR?",
        answer: "Completá el formulario en la sección 'Para Negocios' o escribinos por WhatsApp al +54 9 380 500-2706. Te contactamos, verificamos tu negocio y te armamos el perfil con tus canchas, servicios, horarios y medios de cobro."
    },
    {
        question: "¿Cuánto cuesta?",
        answer: "Es un abono mensual según tu rubro: servicios desde $17.000, canchas $20.000 por cancha (más barato desde 4 canchas) y alquileres $15.000. Las reservas que te llegan por tu link no pagan comisión. Las que llegan desde el buscador de TurnitosLR pagan $500 por turno en canchas y servicios, y 3% en alquileres."
    },
    {
        question: "¿Hay prueba gratis?",
        answer: "Sí. Los primeros 14 días son gratis para que pruebes la plataforma con tus clientes reales."
    },
    {
        question: "¿Cómo pago el abono y qué pasa si me atraso?",
        answer: "Podés pagar por transferencia, Mercado Pago o en efectivo. Si pasan 10 días del vencimiento sin pago, tu página se oculta hasta que regularices."
    },
    {
        question: "¿Puedo dar de baja mi negocio?",
        answer: "Sí, cuando quieras y sin permanencia mínima. Avisanos por WhatsApp o correo y damos de baja tu página al terminar el mes que ya pagaste."
    },
    {
        question: "¿Puedo cobrar señas por transferencia?",
        answer: "Sí. Configurás el porcentaje de seña (por ejemplo 30%, 50% o 100%) y tu Alias o CBU. El cliente ve esos datos al reservar y te envía el comprobante."
    },
    {
        question: "¿Cómo funciona el Link in Bio para mi Instagram?",
        answer: "Te damos un enlace propio (por ejemplo tu-negocio.turnitoslr.com) para poner en la biografía de Instagram o en tus estados de WhatsApp. Ahí tus clientes ven tus turnos, tu tienda, tus fotos y tus redes."
    },
    {
        question: "¿Puedo bloquear horarios por lluvia, feriados o mantenimiento?",
        answer: "Sí. Desde tu panel bloqueás una cancha, un horario o un día entero con un clic y nadie puede reservar ahí."
    },
    {
        question: "¿Se envían recordatorios automáticos a mis clientes?",
        answer: "Estamos trabajando en recordatorios y pedidos de reseña automáticos desde un número central de TurnitosLR, sin que tengas que configurar nada. Mientras tanto, desde tu panel le mandás el recordatorio a cada cliente con un clic."
    }
];

const WHATSAPP_URL = 'https://wa.me/5493805002706?text=Hola,%20tengo%20una%20consulta%20sobre%20Turnitos';

export default function HelpCenter() {
    const [activeTab, setActiveTab] = useState('clientes'); // 'clientes' | 'negocios'
    const [searchQuery, setSearchQuery] = useState('');
    const [openIndex, setOpenIndex] = useState(null);

    const currentFaqs = activeTab === 'clientes' ? FAQS_CLIENTES : FAQS_NEGOCIOS;

    const filteredFaqs = useMemo(() => {
        if (!searchQuery.trim()) return currentFaqs;
        const q = searchQuery.toLowerCase();
        return currentFaqs.filter(f =>
            f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q)
        );
    }, [currentFaqs, searchQuery]);

    const selectTab = (tab) => {
        setActiveTab(tab);
        setOpenIndex(null);
    };

    // Schema.org FAQPage for Google Rich Snippets
    const faqSchema = useMemo(() => ({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        'mainEntity': [...FAQS_CLIENTES, ...FAQS_NEGOCIOS].map(faq => ({
            '@type': 'Question',
            'name': faq.question,
            'acceptedAnswer': { '@type': 'Answer', 'text': faq.answer }
        }))
    }), []);

    return (
        <div className="sp-page">
            <SEOHead
                title="Centro de Ayuda y Preguntas Frecuentes | TurnitosLR"
                description="¿Tenés dudas sobre cómo reservar canchas, quinchos o turnos en La Rioja? Encontrá todas las respuestas en el Centro de Ayuda de TurnitosLR."
                url="https://www.turnitoslr.com/ayuda"
                schema={faqSchema}
            />

            <header className="sp-hero sp-hero--center">
                <div className="sp-wrap sp-wrap--narrow">
                    <span className="sp-eyebrow">Soporte</span>
                    <h1 className="sp-title">Centro de Ayuda</h1>
                    <p className="sp-lead">Respuestas rápidas sobre reservas, pagos y cómo sumar tu negocio.</p>

                    <div className="sp-search">
                        <Search size={18} aria-hidden="true" />
                        <input
                            type="search"
                            aria-label="Buscar preguntas"
                            placeholder="Buscar: seña, cancelar, precios..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        {searchQuery && (
                            <button type="button" className="sp-search-clear" onClick={() => setSearchQuery('')} aria-label="Borrar búsqueda">
                                <X size={18} />
                            </button>
                        )}
                    </div>
                </div>
            </header>

            <main className="sp-wrap sp-wrap--narrow">
                <div className="sp-tabs" role="tablist">
                    <button type="button" role="tab" aria-selected={activeTab === 'clientes'} className={`sp-tab${activeTab === 'clientes' ? ' is-active' : ''}`} onClick={() => selectTab('clientes')}>
                        <User size={16} aria-hidden="true" /> Para clientes
                    </button>
                    <button type="button" role="tab" aria-selected={activeTab === 'negocios'} className={`sp-tab${activeTab === 'negocios' ? ' is-active' : ''}`} onClick={() => selectTab('negocios')}>
                        <Store size={16} aria-hidden="true" /> Para negocios
                    </button>
                </div>

                {filteredFaqs.length === 0 ? (
                    <div className="sp-empty">
                        <p>No encontramos preguntas que coincidan con "<strong>{searchQuery}</strong>".</p>
                        <p>Escribinos y te ayudamos.</p>
                    </div>
                ) : (
                    <div className="sp-faq">
                        {filteredFaqs.map((faq, index) => {
                            const isOpen = openIndex === index;
                            return (
                                <div key={faq.question} className={`sp-faq-item${isOpen ? ' is-open' : ''}`}>
                                    <button
                                        type="button"
                                        className="sp-faq-q"
                                        aria-expanded={isOpen}
                                        onClick={() => setOpenIndex(isOpen ? null : index)}
                                    >
                                        <span>{faq.question}</span>
                                        <ChevronDown size={20} aria-hidden="true" />
                                    </button>
                                    <AnimatePresence initial={false}>
                                        {isOpen && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                transition={{ duration: 0.2 }}
                                                style={{ overflow: 'hidden' }}
                                            >
                                                <div className="sp-faq-a">{faq.answer}</div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            );
                        })}
                    </div>
                )}

                {activeTab === 'negocios' && (
                    <p className="sp-meta" style={{ marginTop: '20px' }}>
                        ¿Querés sumar tu negocio? <Link to="/negocios#sumate" style={{ color: 'var(--sp-accent-text)', fontWeight: 700 }}>Dejanos tus datos</Link>.
                    </p>
                )}

                <section className="sp-contact">
                    <h2>¿No encontraste lo que buscabas?</h2>
                    <p>Estamos en La Rioja y te respondemos por WhatsApp o por correo.</p>
                    <div className="sp-actions">
                        <a className="sp-btn sp-btn--primary" href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
                            <MessageCircle size={18} aria-hidden="true" /> Escribinos por WhatsApp
                        </a>
                        <a className="sp-btn" href="mailto:consultas@turnitoslr.com">
                            <Mail size={18} aria-hidden="true" /> consultas@turnitoslr.com
                        </a>
                    </div>
                </section>
            </main>
        </div>
    );
}
