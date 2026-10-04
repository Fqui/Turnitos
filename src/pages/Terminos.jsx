import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import SEOHead from '../components/SEOHead';

export default function Terminos() {
    const lastUpdated = "4 de Octubre de 2026";

    return (
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-main)', color: 'var(--text-primary)', paddingBottom: '80px' }}>
            <SEOHead
                title="Términos y Condiciones de Uso | TurnitosLR"
                description="Conocé los términos y condiciones de uso de TurnitosLR, la plataforma de reserva de turnos en La Rioja."
                url="https://www.turnitoslr.com/terminos"
            />

            {/* Header / Hero */}
            <div style={{
                background: 'linear-gradient(135deg, rgba(0, 230, 118, 0.15) 0%, rgba(41, 121, 255, 0.15) 100%)',
                borderBottom: '1px solid var(--border)',
                padding: '60px 20px',
                textAlign: 'center'
            }}>
                <div style={{ maxWidth: '850px', margin: '0 auto' }}>
                    <span style={{
                        display: 'inline-block',
                        padding: '6px 14px',
                        borderRadius: '20px',
                        backgroundColor: 'rgba(0, 230, 118, 0.12)',
                        color: 'var(--primary, #00E676)',
                        fontSize: '13px',
                        fontWeight: '700',
                        marginBottom: '16px'
                    }}>
                        Marco Legal
                    </span>
                    <h1 style={{ fontSize: 'clamp(28px, 5vw, 42px)', fontWeight: '800', marginBottom: '14px' }}>
                        Términos y Condiciones de Uso
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
                            1. Aceptación de los Términos
                        </h2>
                        <p style={{ color: 'var(--text-secondary)' }}>
                            Al acceder, navegar o utilizar la plataforma web, aplicación móvil o servicios provistos por <strong>TurnitosLR</strong> (en adelante, "la Plataforma"), el usuario acepta quedar legalmente vinculado por los presentes Términos y Condiciones. Si no está de acuerdo con alguna de las disposiciones aquí establecidas, deberá abstenerse de utilizar el servicio.
                        </p>
                    </section>

                    {/* Section 2 */}
                    <section style={{ marginBottom: '32px' }}>
                        <h2 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '12px' }}>
                            2. Naturaleza del Servicio y Rol de TurnitosLR
                        </h2>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '10px' }}>
                            TurnitosLR actúa exclusivamente como una <strong>plataforma tecnológica de intermediación y gestión de reservas online</strong> que conecta a usuarios finales ("Clientes") con comercios, clubes, profesionales y prestadores de servicios adheridos ("Negocios").
                        </p>
                        <p style={{ color: 'var(--text-secondary)' }}>
                            TurnitosLR no es propietario, operador ni prestador directo de los servicios ofrecidos por los Negocios (tales como alquiler de canchas, quinchos, turnos de peluquería, estética o salud), limitando su responsabilidad a la correcta disponibilidad técnica del sistema de agendamiento.
                        </p>
                    </section>

                    {/* Section 3 */}
                    <section style={{ marginBottom: '32px' }}>
                        <h2 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '12px' }}>
                            3. Registro y Uso de la Cuenta
                        </h2>
                        <ul style={{ color: 'var(--text-secondary)', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <li>El usuario se compromete a proporcionar información verídica, exacta y actualizada al momento de realizar una reserva (nombre completo y teléfono de WhatsApp).</li>
                            <li>Los comercios y administradores son responsables exclusivos de la confidencialidad de sus credenciales de acceso y de toda actividad realizada desde su panel.</li>
                            <li>Queda terminantemente prohibido el uso de la Plataforma para fines ilícitos, fraudulentos o que perjudiquen la normal operatividad del servicio.</li>
                        </ul>
                    </section>

                    {/* Section 4 */}
                    <section style={{ marginBottom: '32px' }}>
                        <h2 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '12px' }}>
                            4. Reservas, Señas y Medios de Pago
                        </h2>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '10px' }}>
                            Cada Negocio fija libremente sus propios precios, horarios de atención, porcentajes de seña previa y métodos de pago aceptados (transferencias bancarias, efectivo, alias bancario o billeteras virtuales).
                        </p>
                        <p style={{ color: 'var(--text-secondary)' }}>
                            En caso de requerirse una seña para confirmar el turno, el Cliente deberá enviar el comprobante correspondiente por el medio indicado por el comercio para validar su agendamiento.
                        </p>
                    </section>

                    {/* Section 5 */}
                    <section style={{ marginBottom: '32px' }}>
                        <h2 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '12px' }}>
                            5. Política de Cancelaciones y Reprogramaciones
                        </h2>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '10px' }}>
                            Las políticas de cancelación, devolución de señas o reprogramación de turnos dependen exclusivamente del reglamento interno de cada comercio o prestador de servicio.
                        </p>
                        <p style={{ color: 'var(--text-secondary)' }}>
                            Para solicitar una modificación o cancelación, el Cliente deberá contactar directamente al comercio a través del botón oficial de WhatsApp disponible en el perfil del negocio o en el comprobante de su reserva.
                        </p>
                    </section>

                    {/* Section 6 */}
                    <section style={{ marginBottom: '32px' }}>
                        <h2 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '12px' }}>
                            6. Reseñas y Calificaciones de Usuarios
                        </h2>
                        <p style={{ color: 'var(--text-secondary)' }}>
                            Para garantizar la transparencia del sistema de opiniones, solo pueden calificar a un establecimiento los Clientes que hayan realizado una reserva en él. Cada Cliente recibe un enlace personal, de un solo uso, para dejar su calificación y un comentario opcional. Queda prohibida la publicación de comentarios ofensivos, difamatorios o falsos, y TurnitosLR puede ocultar los que no cumplan estas reglas.
                        </p>
                    </section>

                    {/* Section 7 */}
                    <section style={{ marginBottom: '32px' }}>
                        <h2 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '12px' }}>
                            7. Abono de los Negocios
                        </h2>
                        <ul style={{ color: 'var(--text-secondary)', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <li>El alta de cada Negocio la realiza TurnitosLR o un vendedor autorizado, previa verificación de que el Negocio existe.</li>
                            <li>Los Negocios abonan un cargo mensual según su rubro y la cantidad de canchas, profesionales o espacios. Los precios vigentes se publican en la sección Para Negocios. TurnitosLR no cobra comisión por turno.</li>
                            <li>Los Negocios nuevos cuentan con 14 días de prueba gratuita.</li>
                            <li>El abono se paga por transferencia bancaria, Mercado Pago o en efectivo.</li>
                            <li>Si transcurren 10 días desde el vencimiento sin que se registre el pago, la página del Negocio se oculta hasta que regularice su situación.</li>
                            <li>El Negocio puede solicitar la baja en cualquier momento, sin permanencia mínima, escribiendo por WhatsApp o correo.</li>
                            <li>TurnitosLR puede modificar los precios avisando a los Negocios con al menos 30 días de anticipación.</li>
                        </ul>
                    </section>

                    {/* Section 8 */}
                    <section style={{ marginBottom: '32px' }}>
                        <h2 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '12px' }}>
                            8. Propiedad Intelectual
                        </h2>
                        <p style={{ color: 'var(--text-secondary)' }}>
                            El diseño de la plataforma, código fuente, marcas, isotipos, logotipos y contenidos pertenecientes a TurnitosLR se encuentran protegidos por las leyes de propiedad intelectual de la República Argentina. Queda prohibida su reproducción o explotación no autorizada.
                        </p>
                    </section>

                    {/* Section 9 */}
                    <section style={{ marginBottom: '32px' }}>
                        <h2 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '12px' }}>
                            9. Modificaciones de estos Términos
                        </h2>
                        <p style={{ color: 'var(--text-secondary)' }}>
                            TurnitosLR puede actualizar estos Términos. La fecha de la última actualización figura al comienzo de esta página, y los cambios importantes se comunican a los Negocios por WhatsApp o correo. Seguir usando la Plataforma después de un cambio implica aceptar la nueva versión.
                        </p>
                    </section>

                    {/* Section 10 */}
                    <section style={{ marginBottom: '32px' }}>
                        <h2 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '12px' }}>
                            10. Jurisdicción y Ley Aplicable
                        </h2>
                        <p style={{ color: 'var(--text-secondary)' }}>
                            Los presentes Términos se rigen por las leyes vigentes de la República Argentina. Cualquier controversia derivada del uso del servicio será sometida a la competencia de los Tribunales Ordinarios de la Ciudad de La Rioja, Provincia de La Rioja.
                        </p>
                    </section>

                    {/* Contacto */}
                    <section style={{ padding: '20px', borderRadius: '12px', backgroundColor: 'var(--bg-main)', border: '1px solid var(--border)' }}>
                        <h3 style={{ fontSize: '17px', fontWeight: '700', marginBottom: '8px' }}>
                            ¿Tenés dudas sobre los términos?
                        </h3>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '14px' }}>
                            Podés escribirnos a nuestro correo oficial o enviarnos un mensaje de WhatsApp a nuestro equipo de atención.
                        </p>
                        <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                            <a
                                href="mailto:consultas@turnitoslr.com"
                                style={{ color: 'var(--primary, #00E676)', textDecoration: 'none', fontWeight: '600' }}
                            >
                                📧 consultas@turnitoslr.com
                            </a>
                            <a
                                href="https://wa.me/5493805002706"
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
