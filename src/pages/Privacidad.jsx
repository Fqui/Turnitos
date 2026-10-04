import React from 'react';
import LegalPage from '../components/legal/LegalPage';
import { STATIC_PAGES, staticPageUrl } from '../utils/seo';

const LAST_UPDATED = '4 de Octubre de 2026';

const SECTIONS = [
    {
        id: 'compromiso',
        title: 'Compromiso de Privacidad',
        content: (
            <p>
                En <strong>TurnitosLR</strong> nos tomamos con absoluta seriedad la seguridad y confidencialidad de la información de nuestros usuarios y comercios. Esta Política de Privacidad describe cómo recopilamos, utilizamos, almacenamos y resguardamos sus datos de conformidad con la <strong>Ley de Protección de Datos Personales N° 25.326 de la República Argentina</strong>.
            </p>
        )
    },
    {
        id: 'datos',
        title: 'Información que Recopilamos',
        content: (
            <>
                <p>Para gestionar los turnos y la comunicación con los negocios, recopilamos:</p>
                <ul>
                    <li><strong>Datos de contacto para reservas</strong>: nombre y apellido y número de teléfono (WhatsApp).</li>
                    <li><strong>Detalles de la reserva</strong>: fecha, horario, servicio o cancha solicitada, estado del pago de seña y notas adicionales.</li>
                    <li><strong>Datos de comercios</strong>: nombre del establecimiento, identificación comercial, ubicación, horarios y canales de atención.</li>
                    <li><strong>Pedidos de alta de negocios</strong>: nombre del negocio, rubro, nombre de contacto, WhatsApp y ciudad, cuando completás el formulario de la sección Para Negocios.</li>
                    <li><strong>Ubicación</strong>: solo si usás el botón "Cerca mío" y lo permitís en tu navegador. Se usa en el momento para ordenar los negocios por cercanía y no se guarda.</li>
                    <li><strong>Notificaciones</strong>: si un negocio activa las notificaciones de su panel, guardamos el identificador de su dispositivo para avisarle de nuevas reservas.</li>
                    <li><strong>Información técnica de navegación</strong>: dirección IP, tipo de navegador y dispositivo, con fines estadísticos y de seguridad.</li>
                </ul>
            </>
        )
    },
    {
        id: 'finalidad',
        title: 'Para Qué Usamos los Datos',
        content: (
            <ul>
                <li>Confirmar y notificar el estado de las reservas a través de WhatsApp.</li>
                <li>Permitir a los comercios gestionar su agenda de turnos y coordinar la atención del cliente.</li>
                <li>Enviar, después del turno, un enlace personal de un solo uso para calificar el servicio.</li>
                <li>Contactar a quienes completan el formulario de alta para sumar su negocio.</li>
                <li>Prevenir fraudes, mejorar el funcionamiento de la plataforma y brindar soporte.</li>
            </ul>
        )
    },
    {
        id: 'no-venta',
        title: 'No Vendemos tus Datos',
        content: (
            <p>
                <strong>TurnitosLR no vende, alquila ni comercializa bajo ninguna circunstancia los datos personales de sus usuarios a terceros.</strong> La información compartida se limita estrictamente a la necesaria para que el negocio seleccionado pueda procesar la reserva del cliente.
            </p>
        )
    },
    {
        id: 'seguridad',
        title: 'Seguridad, Proveedores y Conservación',
        content: (
            <>
                <p>
                    Toda la información se transmite cifrada (HTTPS) y se guarda en bases de datos con acceso restringido: cada negocio solo puede ver los datos de sus propias reservas.
                </p>
                <p>
                    Para funcionar usamos estos proveedores, que procesan datos solo por cuenta de TurnitosLR: Supabase (base de datos), Vercel (alojamiento del sitio) y Google Firebase (notificaciones).
                </p>
                <p>
                    Conservamos los datos de las reservas mientras el negocio use la plataforma, para su historial y estadísticas. Podés pedir que eliminemos tus datos en cualquier momento.
                </p>
            </>
        )
    },
    {
        id: 'derechos',
        title: 'Tus Derechos (Acceso, Rectificación y Supresión)',
        content: (
            <>
                <p>
                    De acuerdo con la Ley N° 25.326, tenés derecho a acceder a tus datos personales, pedir que se actualicen o corrijan, o que se eliminen de nuestras bases de datos en cualquier momento.
                </p>
                <p>
                    El titular de los datos personales tiene la facultad de ejercer el derecho de acceso a los mismos en forma gratuita a intervalos no inferiores a seis meses, salvo que se acredite un interés legítimo al efecto conforme lo establecido en el artículo 14, inciso 3 de la Ley N° 25.326. La AGENCIA DE ACCESO A LA INFORMACIÓN PÚBLICA, en su carácter de Órgano de Control de la Ley N° 25.326, tiene la atribución de atender las denuncias y reclamos que interpongan quienes resulten afectados en sus derechos por incumplimiento de las normas vigentes en materia de protección de datos personales.
                </p>
            </>
        )
    }
];

export default function Privacidad() {
    return (
        <LegalPage
            seo={{ ...STATIC_PAGES.privacidad, url: staticPageUrl('privacidad') }}
            eyebrow="Legal"
            title="Política de Privacidad"
            lastUpdated={LAST_UPDATED}
            sections={SECTIONS}
            contact={{
                title: 'Ejercé tus derechos o consultanos',
                text: 'Para pedir acceso, corrección o eliminación de tus datos, escribinos por correo o WhatsApp.',
                mailto: 'mailto:consultas@turnitoslr.com?subject=Consulta%20sobre%20Privacidad%20de%20Datos',
                whatsapp: 'https://wa.me/5493805002706?text=Hola,%20tengo%20una%20consulta%20sobre%20la%20privacidad%20de%20mis%20datos'
            }}
        />
    );
}
