import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const FAQS = [
    {
        question: "¿Cómo reservo un turno?",
        answer: "Es muy fácil. En la página de inicio, busca el negocio o servicio que deseas. Selecciona el día y el horario disponible que prefieras. Ingresa tus datos, confirma la reserva y ¡listo! Recibirás una confirmación inmediata."
    },
    {
        question: "¿Tengo que pagar por adelantado?",
        answer: "Depende de cada negocio. Algunos requieren una seña parcial para confirmar el turno, mientras que otros permiten pagar la totalidad en el lugar. Verás las condiciones de pago antes de confirmar tu reserva."
    },
    {
        question: "¿Cómo cancelo o modifico mi turno?",
        answer: "Por el momento, para cancelar o modificar un turno ya confirmado, te recomendamos contactar directamente al negocio a través del botón de WhatsApp que encontrarás en su perfil o en el correo de confirmación."
    },
    {
        question: "¿Es gratis usar Turnitos?",
        answer: "¡Sí, totalmente! Para los usuarios, buscar y reservar turnos en Turnitos es 100% gratuito. Solo pagas por el servicio que contratas directamente al negocio."
    },
    {
        question: "¿Puedo registrar mi negocio?",
        answer: "¡Claro que sí! Si tienes canchas, una estética, consultorios o cualquier servicio con turnos, Turnitos es para vos. Visita nuestra sección 'Para Negocios' en el pie de página para más información."
    }
];

export default function HelpCenter() {
    const navigate = useNavigate();
    const [openIndex, setOpenIndex] = useState(null);

    const toggleExact = (index) => {
        setOpenIndex(openIndex === index ? null : index);
    };

    return (
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-main)', color: 'var(--text-primary)', paddingBottom: '60px' }}>
            {/* Hero Section */}
            <div style={{
                background: 'linear-gradient(135deg, #00E676 0%, #2979FF 100%)',
                padding: '80px 20px',
                textAlign: 'center',
                color: '#fff',
                marginBottom: '40px'
            }}>
                <motion.h1
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    style={{ fontSize: '42px', fontWeight: '800', marginBottom: '16px' }}
                >
                    Centro de Ayuda
                </motion.h1>
                <motion.p
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    style={{ fontSize: '18px', maxWidth: '600px', margin: '0 auto', opacity: 0.9 }}
                >
                    Resolvemos tus dudas para que tu única preocupación sea disfrutar.
                </motion.p>
            </div>

            {/* FAQ Container */}
            <div className="container" style={{ maxWidth: '800px', margin: '0 auto', padding: '0 20px' }}>
                <div style={{ display: 'grid', gap: '16px' }}>
                    {FAQS.map((faq, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            style={{
                                backgroundColor: 'var(--bg-card)',
                                borderRadius: '12px',
                                border: '1px solid var(--border)',
                                overflow: 'hidden'
                            }}
                        >
                            <button
                                onClick={() => toggleExact(index)}
                                style={{
                                    width: '100%',
                                    padding: '20px',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                    color: 'var(--text-primary)',
                                    fontSize: '18px',
                                    fontWeight: '600'
                                }}
                            >
                                {faq.question}
                                <span style={{
                                    transform: openIndex === index ? 'rotate(180deg)' : 'rotate(0deg)',
                                    transition: 'transform 0.3s ease'
                                }}>
                                    ▼
                                </span>
                            </button>

                            <AnimatePresence>
                                {openIndex === index && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        style={{ overflow: 'hidden' }}
                                    >
                                        <div style={{ padding: '0 20px 20px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                                            {faq.answer}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    ))}
                </div>

                {/* Contact CTA */}
                <div style={{
                    marginTop: '60px',
                    textAlign: 'center',
                    padding: '40px',
                    backgroundColor: 'var(--bg-card)',
                    borderRadius: '20px',
                    border: '1px solid var(--border)'
                }}>
                    <h3 style={{ fontSize: '24px', marginBottom: '12px' }}>¿No encontraste lo que buscabas?</h3>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>Estamos aquí para ayudarte. Escríbenos por WhatsApp.</p>
                    <a
                        href="https://wa.me/5493804123456"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                            display: 'inline-block',
                            backgroundColor: '#25D366',
                            color: '#fff',
                            padding: '12px 32px',
                            borderRadius: '50px',
                            textDecoration: 'none',
                            fontWeight: 'bold',
                            fontSize: '16px',
                            boxShadow: '0 4px 15px rgba(37, 211, 102, 0.3)'
                        }}
                    >
                        Contactar Soporte
                    </a>
                </div>
            </div>
        </div>
    );
}
