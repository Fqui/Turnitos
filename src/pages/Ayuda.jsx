import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import SEOHead from '../components/SEOHead';

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
        answer: "Es un abono mensual según tu rubro: servicios desde $17.000, canchas $20.000 por cancha (más barato desde 4 canchas) y alquileres $15.000. No cobramos comisión por turno."
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
        answer: "Te damos un enlace propio (por ejemplo turnitoslr.com/tu-negocio) para poner en la biografía de Instagram o en tus estados de WhatsApp. Ahí tus clientes ven tus turnos, tu tienda, tus fotos y tus redes."
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

    const toggleExact = (index) => {
        setOpenIndex(openIndex === index ? null : index);
    };

    // Schema.org FAQPage for Google Rich Snippets
    const faqSchema = useMemo(() => {
        const allFaqs = [...FAQS_CLIENTES, ...FAQS_NEGOCIOS];
        return {
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            'mainEntity': allFaqs.map(faq => ({
                '@type': 'Question',
                'name': faq.question,
                'acceptedAnswer': {
                    '@type': 'Answer',
                    'text': faq.answer
                }
            }))
        };
    }, []);

    return (
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-main)', color: 'var(--text-primary)', paddingBottom: '80px' }}>
            <SEOHead
                title="Centro de Ayuda y Preguntas Frecuentes | TurnitosLR"
                description="¿Tenés dudas sobre cómo reservar canchas, quinchos o turnos en La Rioja? Encontrá todas las respuestas en el Centro de Ayuda de TurnitosLR."
                url="https://www.turnitoslr.com/ayuda"
                schema={faqSchema}
            />

            {/* Hero Section */}
            <div style={{
                background: 'linear-gradient(135deg, #00E676 0%, #2979FF 100%)',
                padding: '70px 20px 50px',
                textAlign: 'center',
                color: '#fff',
                marginBottom: '30px'
            }}>
                <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                    <motion.h1
                        initial={{ y: -20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        style={{ fontSize: 'clamp(30px, 6vw, 44px)', fontWeight: '900', marginBottom: '14px', letterSpacing: '-0.5px' }}
                    >
                        Centro de Ayuda
                    </motion.h1>
                    <motion.p
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.1 }}
                        style={{ fontSize: 'clamp(16px, 3.5vw, 18px)', opacity: 0.95, marginBottom: '28px' }}
                    >
                        Resolvemos tus dudas para que tu única preocupación sea disfrutar de tu turno.
                    </motion.p>

                    {/* Live Search Input */}
                    <div style={{ position: 'relative', maxWidth: '520px', margin: '0 auto' }}>
                        <input
                            type="text"
                            placeholder="Buscar preguntas (ej. seña, cancelar, negocio...)"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '16px 20px 16px 46px',
                                borderRadius: '50px',
                                border: 'none',
                                outline: 'none',
                                fontSize: '15px',
                                color: '#1A1A1A',
                                backgroundColor: '#FFFFFF',
                                boxShadow: '0 8px 24px rgba(0,0,0,0.15)'
                            }}
                        />
                        <span style={{
                            position: 'absolute',
                            left: '18px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            fontSize: '18px',
                            opacity: 0.6
                        }}>
                            🔍
                        </span>
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                style={{
                                    position: 'absolute',
                                    right: '16px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: '#666',
                                    fontWeight: 'bold'
                                }}
                            >
                                ✕
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Container */}
            <div className="container" style={{ maxWidth: '820px', margin: '0 auto', padding: '0 20px' }}>
                {/* Tabs Selector */}
                <div style={{
                    display: 'flex',
                    gap: '10px',
                    justifyContent: 'center',
                    marginBottom: '30px'
                }}>
                    <button
                        onClick={() => { setActiveTab('clientes'); setOpenIndex(null); }}
                        style={{
                            padding: '10px 22px',
                            borderRadius: '30px',
                            border: '1px solid var(--border)',
                            backgroundColor: activeTab === 'clientes' ? 'var(--primary, #00E676)' : 'var(--bg-card)',
                            color: activeTab === 'clientes' ? '#000' : 'var(--text-primary)',
                            fontWeight: '700',
                            fontSize: '14px',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                    >
                        👤 Para Clientes y Jugadores
                    </button>
                    <button
                        onClick={() => { setActiveTab('negocios'); setOpenIndex(null); }}
                        style={{
                            padding: '10px 22px',
                            borderRadius: '30px',
                            border: '1px solid var(--border)',
                            backgroundColor: activeTab === 'negocios' ? '#2979FF' : 'var(--bg-card)',
                            color: activeTab === 'negocios' ? '#fff' : 'var(--text-primary)',
                            fontWeight: '700',
                            fontSize: '14px',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                    >
                        🏢 Para Comercios y Clubes
                    </button>
                </div>

                {/* FAQ Accordion List */}
                <div style={{ display: 'grid', gap: '14px' }}>
                    {filteredFaqs.length === 0 ? (
                        <div style={{
                            textAlign: 'center',
                            padding: '40px 20px',
                            backgroundColor: 'var(--bg-card)',
                            borderRadius: '16px',
                            border: '1px solid var(--border)',
                            color: 'var(--text-secondary)'
                        }}>
                            <p style={{ fontSize: '16px', marginBottom: '10px' }}>No encontramos preguntas que coincidan con "<strong>{searchQuery}</strong>".</p>
                            <p style={{ fontSize: '14px' }}>¿Necesitás ayuda personalizada? Escribinos por WhatsApp.</p>
                        </div>
                    ) : (
                        filteredFaqs.map((faq, index) => {
                            const isOpen = openIndex === index;
                            return (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, y: 15 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    style={{
                                        backgroundColor: 'var(--bg-card)',
                                        borderRadius: '14px',
                                        border: `1px solid ${isOpen ? 'var(--primary, #00E676)' : 'var(--border)'}`,
                                        overflow: 'hidden',
                                        transition: 'border-color 0.2s'
                                    }}
                                >
                                    <button
                                        onClick={() => toggleExact(index)}
                                        style={{
                                            width: '100%',
                                            padding: '20px 22px',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            background: 'none',
                                            border: 'none',
                                            cursor: 'pointer',
                                            textAlign: 'left',
                                            color: 'var(--text-primary)',
                                            fontSize: '16px',
                                            fontWeight: '700',
                                            gap: '12px'
                                        }}
                                    >
                                        <span>{faq.question}</span>
                                        <span style={{
                                            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                                            transition: 'transform 0.25s ease',
                                            fontSize: '14px',
                                            opacity: 0.7,
                                            flexShrink: 0
                                        }}>
                                            ▼
                                        </span>
                                    </button>

                                    <AnimatePresence>
                                        {isOpen && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                transition={{ duration: 0.25 }}
                                                style={{ overflow: 'hidden' }}
                                            >
                                                <div style={{
                                                    padding: '0 22px 20px',
                                                    color: 'var(--text-secondary)',
                                                    lineHeight: '1.6',
                                                    fontSize: '15px',
                                                    borderTop: '1px solid var(--border)',
                                                    paddingTop: '14px'
                                                }}>
                                                    {faq.answer}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </motion.div>
                            );
                        })
                    )}
                </div>

                {/* Contact Support CTA Box */}
                <div style={{
                    marginTop: '50px',
                    textAlign: 'center',
                    padding: 'clamp(28px, 4vw, 40px)',
                    backgroundColor: 'var(--bg-card)',
                    borderRadius: '20px',
                    border: '1px solid var(--border)',
                    boxShadow: '0 8px 30px rgba(0,0,0,0.04)'
                }}>
                    <h3 style={{ fontSize: '22px', fontWeight: '800', marginBottom: '10px' }}>
                        ¿No encontraste lo que buscabas?
                    </h3>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '15px', maxWidth: '550px', margin: '0 auto 24px' }}>
                        Estamos en La Rioja listos para ayudarte. Comunicate con nuestro equipo por WhatsApp o por correo electrónico.
                    </p>
                    <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap' }}>
                        <a
                            href="https://wa.me/5493805002706?text=Hola,%20tengo%20una%20consulta%20sobre%20Turnitos"
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '8px',
                                backgroundColor: '#25D366',
                                color: '#fff',
                                padding: '14px 30px',
                                borderRadius: '50px',
                                textDecoration: 'none',
                                fontWeight: '700',
                                fontSize: '15px',
                                boxShadow: '0 6px 18px rgba(37, 211, 102, 0.35)',
                                transition: 'transform 0.2s'
                            }}
                        >
                            <span>💬 WhatsApp (+54 9 380 500-2706)</span>
                        </a>
                        <a
                            href="mailto:consultas@turnitoslr.com"
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '8px',
                                backgroundColor: 'var(--bg-main)',
                                color: 'var(--text-primary)',
                                border: '1px solid var(--border)',
                                padding: '14px 28px',
                                borderRadius: '50px',
                                textDecoration: 'none',
                                fontWeight: '700',
                                fontSize: '15px'
                            }}
                        >
                            <span>📧 consultas@turnitoslr.com</span>
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}
