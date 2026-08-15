import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import SEOHead from '../components/SEOHead';

const FAQS_CLIENTES = [
    {
        question: "¿Cómo reservo un turno en TurnitosLR?",
        answer: "Es muy fácil y no requiere registro previo. Desde la página de inicio, elegí el negocio, cancha o servicio deseado. Seleccioná la fecha y el horario disponible que prefieras, completá tus datos de contacto (nombre y WhatsApp) y confirmá tu reserva. ¡Recibirás una confirmación inmediata!"
    },
    {
        question: "¿Tengo que pagar por adelantado para reservar?",
        answer: "Depende de las condiciones de cada negocio. Algunos establecimientos solicitan una seña previa para congelar el turno, mientras que otros permiten abonar el total al momento de asistir. Las condiciones de pago y datos de transferencia se muestran claramente antes de confirmar."
    },
    {
        question: "¿Cómo cancelo o modifico mi turno reservado?",
        answer: "Para cancelar o reprogramar un turno, comunicate directamente con el negocio a través del botón de WhatsApp que encontrarás en la confirmación de tu turno o en el perfil del comercio."
    },
    {
        question: "¿Es gratis usar TurnitosLR para reservar?",
        answer: "¡Sí, totalmente! Para los clientes y deportistas, buscar, consultar disponibilidad y reservar turnos en TurnitosLR es 100% gratuito. Solo pagás el valor oficial del servicio al negocio."
    },
    {
        question: "¿Cómo puedo calificar un negocio o dejar una reseña?",
        answer: "Para garantizar que todas las opiniones sean 100% reales y verificadas, una vez concretada tu reserva recibirás un enlace seguro exclusivo con un token único para dejar tu puntuación en estrellas y comentario."
    }
];

const FAQS_NEGOCIOS = [
    {
        question: "¿Cómo puedo sumar mi cancha, salón o negocio a TurnitosLR?",
        answer: "Podés registrarte en minutos desde nuestra sección 'Para Negocios' o escribirnos a nuestro WhatsApp de soporte (+54 9 380 500-2706). Te configuramos el perfil, canchas, servicios y medios de cobro al instante."
    },
    {
        question: "¿Puedo cobrar señas o pagos por transferencia automáticamente?",
        answer: "Sí. Podés configurar el porcentaje de seña requerido (ej. 30%, 50% o 100%), tu Alias bancario o CBU, y los clientes te enviarán el comprobante de pago validado."
    },
    {
        question: "¿Cómo funciona el Link in Bio para el Instagram de mi negocio?",
        answer: "TurnitosLR te genera un enlace personalizado (ej: turnitoslr.com/tu-negocio o tu-negocio.turnitoslr.com) optimizado para poner en la biografía de Instagram o estados de WhatsApp, con acceso a turnos, tienda online, fotos y redes sociales."
    },
    {
        question: "¿Puedo bloquear horarios, días de lluvia o feriados?",
        answer: "Sí. Desde tu Panel de Control podés bloquear canchas por mantenimiento, lluvia o días no laborables con un solo clic, evitando reservas superpuestas."
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
