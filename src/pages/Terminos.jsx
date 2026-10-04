import React from 'react';
import LegalPage from '../components/legal/LegalPage';

const LAST_UPDATED = '4 de Octubre de 2026';

const SECTIONS = [
    {
        id: 'aceptacion',
        title: 'Aceptación de los Términos',
        content: (
            <p>
                Al acceder, navegar o utilizar la plataforma web, aplicación móvil o servicios provistos por <strong>TurnitosLR</strong> (en adelante, "la Plataforma"), el usuario acepta quedar legalmente vinculado por los presentes Términos y Condiciones. Si no está de acuerdo con alguna de las disposiciones aquí establecidas, deberá abstenerse de utilizar el servicio.
            </p>
        )
    },
    {
        id: 'servicio',
        title: 'Naturaleza del Servicio y Rol de TurnitosLR',
        content: (
            <>
                <p>
                    TurnitosLR actúa exclusivamente como una <strong>plataforma tecnológica de intermediación y gestión de reservas online</strong> que conecta a usuarios finales ("Clientes") con comercios, clubes, profesionales y prestadores de servicios adheridos ("Negocios").
                </p>
                <p>
                    TurnitosLR no es propietario, operador ni prestador directo de los servicios ofrecidos por los Negocios (tales como alquiler de canchas, quinchos, turnos de peluquería, estética o salud), limitando su responsabilidad a la correcta disponibilidad técnica del sistema de agendamiento.
                </p>
            </>
        )
    },
    {
        id: 'uso',
        title: 'Registro y Uso de la Cuenta',
        content: (
            <ul>
                <li>El usuario se compromete a proporcionar información verídica, exacta y actualizada al momento de realizar una reserva (nombre completo y teléfono de WhatsApp).</li>
                <li>Los comercios y administradores son responsables exclusivos de la confidencialidad de sus credenciales de acceso y de toda actividad realizada desde su panel.</li>
                <li>Queda terminantemente prohibido el uso de la Plataforma para fines ilícitos, fraudulentos o que perjudiquen la normal operatividad del servicio.</li>
            </ul>
        )
    },
    {
        id: 'reservas',
        title: 'Reservas, Señas y Medios de Pago',
        content: (
            <>
                <p>
                    Cada Negocio fija libremente sus propios precios, horarios de atención, porcentajes de seña previa y métodos de pago aceptados (transferencias bancarias, efectivo, alias bancario o billeteras virtuales).
                </p>
                <p>
                    En caso de requerirse una seña para confirmar el turno, el Cliente deberá enviar el comprobante correspondiente por el medio indicado por el comercio para validar su agendamiento.
                </p>
            </>
        )
    },
    {
        id: 'cancelaciones',
        title: 'Cancelaciones y Reprogramaciones',
        content: (
            <>
                <p>
                    Las políticas de cancelación, devolución de señas o reprogramación de turnos dependen exclusivamente del reglamento interno de cada comercio o prestador de servicio.
                </p>
                <p>
                    Para solicitar una modificación o cancelación, el Cliente deberá contactar directamente al comercio a través del botón oficial de WhatsApp disponible en el perfil del negocio o en el comprobante de su reserva.
                </p>
            </>
        )
    },
    {
        id: 'resenas',
        title: 'Reseñas y Calificaciones',
        content: (
            <p>
                Para garantizar la transparencia del sistema de opiniones, solo pueden calificar a un establecimiento los Clientes que hayan realizado una reserva en él. Cada Cliente recibe un enlace personal, de un solo uso, para dejar su calificación y un comentario opcional. Queda prohibida la publicación de comentarios ofensivos, difamatorios o falsos, y TurnitosLR puede ocultar los que no cumplan estas reglas.
            </p>
        )
    },
    {
        id: 'abono',
        title: 'Abono de los Negocios',
        content: (
            <ul>
                <li>El alta de cada Negocio la realiza TurnitosLR o un vendedor autorizado, previa verificación de que el Negocio existe.</li>
                <li>Los Negocios abonan un cargo mensual según su rubro y la cantidad de canchas, profesionales o espacios. Los precios vigentes se publican en la sección Para Negocios. TurnitosLR no cobra comisión por turno.</li>
                <li>Los Negocios nuevos cuentan con 14 días de prueba gratuita.</li>
                <li>El abono se paga por transferencia bancaria, Mercado Pago o en efectivo.</li>
                <li>Si transcurren 10 días desde el vencimiento sin que se registre el pago, la página del Negocio se oculta hasta que regularice su situación.</li>
                <li>El Negocio puede solicitar la baja en cualquier momento, sin permanencia mínima, escribiendo por WhatsApp o correo. La página se da de baja al terminar el período ya abonado.</li>
                <li>TurnitosLR puede modificar los precios avisando a los Negocios con al menos 30 días de anticipación.</li>
            </ul>
        )
    },
    {
        id: 'propiedad',
        title: 'Propiedad Intelectual',
        content: (
            <p>
                El diseño de la plataforma, código fuente, marcas, isotipos, logotipos y contenidos pertenecientes a TurnitosLR se encuentran protegidos por las leyes de propiedad intelectual de la República Argentina. Queda prohibida su reproducción o explotación no autorizada.
            </p>
        )
    },
    {
        id: 'modificaciones',
        title: 'Modificaciones de estos Términos',
        content: (
            <p>
                TurnitosLR puede actualizar estos Términos. La fecha de la última actualización figura al comienzo de esta página, y los cambios importantes se comunican a los Negocios por WhatsApp o correo. Seguir usando la Plataforma después de un cambio implica aceptar la nueva versión.
            </p>
        )
    },
    {
        id: 'jurisdiccion',
        title: 'Jurisdicción y Ley Aplicable',
        content: (
            <p>
                Los presentes Términos se rigen por las leyes vigentes de la República Argentina. Cualquier controversia derivada del uso del servicio será sometida a la competencia de los Tribunales Ordinarios de la Ciudad de La Rioja, Provincia de La Rioja.
            </p>
        )
    }
];

export default function Terminos() {
    return (
        <LegalPage
            seo={{
                title: 'Términos y Condiciones de Uso | TurnitosLR',
                description: 'Conocé los términos y condiciones de uso de TurnitosLR, la plataforma de reserva de turnos en La Rioja.',
                url: 'https://www.turnitoslr.com/terminos'
            }}
            eyebrow="Legal"
            title="Términos y Condiciones de Uso"
            lastUpdated={LAST_UPDATED}
            sections={SECTIONS}
            contact={{
                title: '¿Tenés dudas sobre los términos?',
                text: 'Escribinos por correo o por WhatsApp y te respondemos.',
                mailto: 'mailto:consultas@turnitoslr.com',
                whatsapp: 'https://wa.me/5493805002706'
            }}
        />
    );
}
