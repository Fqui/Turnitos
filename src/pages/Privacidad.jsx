import React from 'react';
import { motion } from 'framer-motion';
import SEOHead from '../components/SEOHead';

export default function Privacidad() {
    const lastUpdated = "15 de Agosto de 2026";

    return (
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-main)', color: 'var(--text-primary)', paddingBottom: '80px' }}>
            <SEOHead
                title="Política de Privacidad | TurnitosLR"
                description="Conocé cómo protegemos tus datos personales, reservas y privacidad en TurnitosLR según la normativa argentina."
                url="https://www.turnitoslr.com/privacidad"
            />

            {/* Header / Hero */}
            <div style={{
                background: 'linear-gradient(135deg, rgba(41, 121, 255, 0.15) 0%, rgba(0, 230, 118, 0.15) 100%)',
                borderBottom: '1px solid var(--border)',
                padding: '60px 20px',
                textAlign: 'center'
            }}>
                <div style={{ maxWidth: '850px', margin: '0 auto' }}>
                    <span style={{
                        display: 'inline-block',
                        padding: '6px 14px',
                        borderRadius: '20px',
                        backgroundColor: 'rgba(41, 121, 255, 0.12)',
                        color: '#2979FF',
                        fontSize: '13px',
                        fontWeight: '700',
                        marginBottom: '16px'
                    }}>
                        Seguridad y Privacidad
                    </span>
                    <h1 style={{ fontSize: 'clamp(28px, 5vw, 42px)', fontWeight: '800', marginBottom: '14px' }}>
                        Política de Privacidad y Protección de Datos
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '15px' }}>
                        Última actualización: {lastUpdated}
                    </p>
                </div>
            </div>

            {/* Content Container */}
            <div className="container" style={{ maxWidth: '850px', margin: '40px auto 0', padding: '0 20px' }}>
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                        backgroundColor: 'var(--bg-card)',
                        borderRadius: '16px',
                        border: '1px solid var(--border)',
                        padding: 'clamp(24px, 4vw, 44px)',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
                        lineHeight: '1.7',
                        fontSize: '15px'
                    }}
                >
                    {/* Section 1 */}
                    <section style={{ marginBottom: '32px' }}>
                        <h2 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '12px' }}>
                            1. Compromiso de Privacidad
                        </h2>
                        <p style={{ color: 'var(--text-secondary)' }}>
                            En <strong>TurnitosLR</strong> nos tomamos con absoluta seriedad la seguridad y confidencialidad de la información de nuestros usuarios y comercios. Esta Política de Privacidad describe cómo recopilamos, utilizamos, almacenamos y resguardamos sus datos de conformidad con la <strong>Ley de Protección de Datos Personales N° 25.326 de la República Argentina</strong>.
                        </p>
                    </section>

                    {/* Section 2 */}
                    <section style={{ marginBottom: '32px' }}>
                        <h2 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '12px' }}>
                            2. Información que Recopilamos
                        </h2>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '10px' }}>
                            Para garantizar la gestión eficiente de turnos y la comunicación con los negocios, recopilamos:
                        </p>
                        <ul style={{ color: 'var(--text-secondary)', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <li><strong>Datos de contacto para reservas</strong>: Nombre y apellido, número de teléfono (WhatsApp) y correo electrónico.</li>
                            <li><strong>Detalles de la reserva</strong>: Fecha, horario, servicio o cancha solicitada, estado del pago de seña y notas adicionales.</li>
                            <li><strong>Datos de comercios</strong>: Nombre del establecimiento, CUIT/identificación comercial, ubicación geográfica, horarios y canales de atención.</li>
                            <li><strong>Información técnica de navegación</strong>: Dirección IP, tipo de navegador y dispositivo con fines estadísticos y de seguridad.</li>
                        </ul>
                    </section>

                    {/* Section 3 */}
                    <section style={{ marginBottom: '32px' }}>
                        <h2 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '12px' }}>
                            3. Finalidad del Tratamiento de los Datos
                        </h2>
                        <ul style={{ color: 'var(--text-secondary)', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <li>Confirmar y notificar el estado de las reservas solicitadas a través de WhatsApp o correo electrónico.</li>
                            <li>Permitir a los comercios gestionar su agenda diaria de turnos y coordinar la atención del cliente.</li>
                            <li>Enviar invitaciones seguras con token de un solo uso para calificar la experiencia del servicio contratado.</li>
                            <li>Prevenir fraudes, optimizar el rendimiento técnico de la plataforma y brindar soporte al usuario.</li>
                        </ul>
                    </section>

                    {/* Section 4 */}
                    <section style={{ marginBottom: '32px' }}>
                        <h2 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '12px' }}>
                            4. No Comercialización de Datos Personales
                        </h2>
                        <p style={{ color: 'var(--text-secondary)' }}>
                            <strong>TurnitosLR no vende, alquila ni comercializa bajo ninguna circunstancia los datos personales de sus usuarios a terceros.</strong> La información compartida se limita estrictamente a la necesaria para que el negocio seleccionado pueda procesar la reserva del cliente.
                        </p>
                    </section>

                    {/* Section 5 */}
                    <section style={{ marginBottom: '32px' }}>
                        <h2 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '12px' }}>
                            5. Seguridad y Almacenamiento en la Nube
                        </h2>
                        <p style={{ color: 'var(--text-secondary)' }}>
                            Toda la información se transmite mediante protocolos cifrados HTTPS / SSL y se almacena en infraestructuras de bases de datos seguras con control de acceso restringido y políticas de seguridad avanzadas (RLS).
                        </p>
                    </section>

                    {/* Section 6 */}
                    <section style={{ marginBottom: '32px' }}>
                        <h2 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '12px' }}>
                            6. Derechos del Titular de los Datos (Acceso, Rectificación y Supresión)
                        </h2>
                        <p style={{ color: 'var(--text-secondary)' }}>
                            De acuerdo con la Ley N° 25.326, usted tiene derecho a acceder a sus datos personales almacenados, solicitar su actualización, rectificación o la eliminación total de sus registros de nuestras bases de datos en cualquier momento.
                        </p>
                    </section>

                    {/* Section 7 */}
                    <section style={{ padding: '20px', borderRadius: '12px', backgroundColor: 'var(--bg-main)', border: '1px solid var(--border)' }}>
                        <h3 style={{ fontSize: '17px', fontWeight: '700', marginBottom: '8px' }}>
                            Canal de Privacidad y Ejercicio de Derechos
                        </h3>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '14px' }}>
                            Para ejercer cualquiera de sus derechos o realizar consultas sobre el manejo de su información personal, comuníquese con nosotros:
                        </p>
                        <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                            <a
                                href="mailto:consultas@turnitoslr.com?subject=Consulta sobre Privacidad de Datos"
                                style={{ color: 'var(--primary, #00E676)', textDecoration: 'none', fontWeight: '600' }}
                            >
                                📧 consultas@turnitoslr.com
                            </a>
                            <a
                                href="https://wa.me/5493805002706?text=Hola,%20tengo%20una%20consulta%20sobre%20la%20privacidad%20de%20mis%20datos"
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ color: '#25D366', textDecoration: 'none', fontWeight: '600' }}
                            >
                                📱 WhatsApp: +54 9 380 500-2706
                            </a>
                        </div>
                    </section>
                </motion.div>
            </div>
        </div>
    );
}
