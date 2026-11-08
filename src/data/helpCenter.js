import { CalendarCheck, Wallet, CalendarX, ShoppingBag, Star, AlertCircle, Rocket, Receipt, Link2, Users } from 'lucide-react';

// Help Center content. "k" adds extra keywords so the assistant finds a question with other words.
export const HELP_TOPICS = {
    clientes: [
        {
            id: 'reservar', title: 'Reservar', icon: CalendarCheck, blurb: 'Cómo sacar un turno paso a paso',
            faqs: [
                { q: '¿Cómo reservo un turno?', k: 'cancha sacar turno usar app pagina', a: 'Elegí el negocio, el día y un horario libre. Completá tu nombre y tu WhatsApp y confirmá. No hace falta crear una cuenta.' },
                { q: '¿Necesito crear una cuenta?', k: 'registrarme usuario', a: 'No. Para reservar solo te pedimos tu nombre y tu WhatsApp, así el negocio puede contactarte.' },
                { q: '¿Cómo sé que mi reserva quedó confirmada?', k: 'comprobante confirmacion seguro quedo', a: 'Al terminar ves la pantalla de confirmación con el día, la hora y el lugar. Si el negocio pide seña, la reserva queda firme cuando el negocio recibe el comprobante.' },
                { q: '¿Puedo reservar para otra persona?', k: 'amigo hijo familiar nombre de otro', a: 'Sí. Poné el nombre y el WhatsApp de quien va a asistir, así el negocio sabe a quién esperar.' },
                { q: '¿Puedo reservar el mismo horario todas las semanas?', k: 'fijo semanal todos los dias siempre', a: 'Pedíselo al negocio por WhatsApp: muchos complejos guardan turnos fijos para sus clientes habituales.' },
                { q: '¿Con cuánta anticipación puedo reservar?', k: 'mes semana proximo futuro dias', a: 'Ves los próximos días en la grilla y con "Más" elegís otras fechas. Cada negocio define hasta cuándo se puede reservar.' }
            ]
        },
        {
            id: 'pagos', title: 'Pagos y señas', icon: Wallet, blurb: 'Señas, transferencias y promos',
            faqs: [
                { q: '¿Tengo que pagar por adelantado?', k: 'antes pagar ahora', a: 'Depende del negocio. Algunos piden una seña y otros cobran todo cuando asistís. Antes de confirmar ves las condiciones.' },
                { q: '¿Cómo pago la seña?', k: 'transferir alias cbu mercado pago comprobante', a: 'Te mostramos el alias o CBU del negocio y el monto. Transferís desde tu banco o billetera y le mandás el comprobante por WhatsApp.' },
                { q: '¿Puedo pagar con tarjeta?', k: 'credito debito tarjeta cuotas', a: 'El pago se arregla con cada negocio. La seña suele ser por transferencia, y el resto lo pagás en el lugar con los medios que acepte el negocio.' },
                { q: '¿Qué son los horarios con descuento?', k: 'promo promocion oferta off barato', a: 'Son franjas con promo que elige cada negocio, por ejemplo -20% de lunes a viernes antes de las 18. Aparecen marcadas en la grilla y el precio ya incluye el descuento.' },
                { q: '¿TurnitosLR me cobra algo?', k: 'comision gratis costo cliente', a: 'No. Reservar es gratis para los clientes: solo le pagás al negocio.' }
            ]
        },
        {
            id: 'cancelar', title: 'Cancelar o cambiar', icon: CalendarX, blurb: 'Cambios, lluvia y devoluciones',
            faqs: [
                { q: '¿Cómo cancelo o cambio mi turno?', k: 'cancelar cambiar llegar tarde', a: 'Escribile al negocio con el botón de WhatsApp de tu confirmación o de su perfil. Cuanto antes avises, más fácil es reprogramar.' },
                { q: '¿Me devuelven la seña?', k: 'devolucion reembolso', a: 'Cada negocio tiene su política de cancelación, y la podés ver antes de reservar. TurnitosLR no maneja el dinero: lo resolvés directamente con el negocio.' },
                { q: 'Llueve y mi cancha es descubierta, ¿qué hago?', k: 'lluvia tormenta viento', a: 'Consultá con el complejo: suelen pasarte a una cancha techada o reprogramar sin costo.' }
            ]
        },
        {
            id: 'tienda', title: 'Tienda', icon: ShoppingBag, blurb: 'Pedidos a los negocios',
            faqs: [
                { q: '¿Cómo compro en la tienda de un negocio?', k: 'comprar producto carrito pedido', a: 'Sumá productos al carrito y enviá el pedido. Le llega al negocio por WhatsApp y con él coordinás el pago y la entrega o el retiro.' },
                { q: '¿Hacen envíos?', k: 'envio delivery domicilio retiro', a: 'Lo define cada negocio. Cuando mandás el pedido coordinás con ellos si lo retirás o te lo envían.' }
            ]
        },
        {
            id: 'resenas', title: 'Reseñas', icon: Star, blurb: 'Opiniones reales de clientes',
            faqs: [
                { q: '¿Cómo dejo una reseña?', k: 'opinar calificar', a: 'Después de tu turno te llega un enlace personal por WhatsApp para dejar tus estrellas y un comentario. Solo pueden opinar quienes reservaron.' }
            ]
        },
        {
            id: 'problemas', title: 'Tuve un problema', icon: AlertCircle, blurb: 'Algo no salió como esperabas',
            faqs: [
                { q: 'El horario que quiero aparece ocupado', k: 'no disponible gris lleno', a: 'Ese turno ya lo reservó otra persona o el negocio lo bloqueó. Probá otro horario, otra cancha u otro día.' },
                { q: 'No encuentro mi confirmación', k: 'perdi llego mensaje', a: 'Buscá el WhatsApp del negocio en su perfil y pasale tu nombre y el horario: lo ven en su agenda.' },
                { q: 'La página no carga o anda mal', k: 'falla anda lento', a: 'Probá recargar la página o abrirla desde otro navegador. Si sigue igual, escribinos por WhatsApp y lo revisamos.' },
                { q: 'Quiero reportar un problema con un negocio', k: 'queja denuncia reclamo', a: 'Escribinos por WhatsApp con el nombre del negocio y qué pasó. Lo revisamos con ellos.' }
            ]
        }
    ],
    negocios: [
        {
            id: 'empezar', title: 'Empezar', icon: Rocket, blurb: 'Sumá tu negocio en pocos días',
            faqs: [
                { q: '¿Cómo sumo mi negocio?', a: 'Dejanos tus datos en "Para negocios" o escribinos por WhatsApp. Te armamos la página con tus canchas, servicios, horarios y medios de cobro.' },
                { q: '¿Qué necesito tener listo?', k: 'requisitos fotos logo', a: 'Logo, algunas fotos, tus horarios, tus precios y el alias o CBU si vas a cobrar señas. Si no tenés fotos, te ayudamos.' },
                { q: '¿Hay prueba gratis?', a: 'Sí, los primeros 14 días son gratis para que la pruebes con tus clientes reales.' },
                { q: '¿Qué rubros pueden usar TurnitosLR?', k: 'rubro peluqueria barberia estetica padel futbol quincho salon', a: 'Canchas de pádel y fútbol, peluquerías, barberías, estética, salud, mascotas y alquileres como quinchos y salones.' }
            ]
        },
        {
            id: 'precios', title: 'Precios y abono', icon: Receipt, blurb: 'Cuánto cuesta y cómo se paga',
            faqs: [
                { q: '¿Cuánto cuesta?', k: 'precio abono mensual negocio', a: 'Servicios desde $17.000 por mes (1 profesional). Canchas $20.000 por cancha, $17.000 desde 4 y $15.000 desde 6. Alquileres $15.000.' },
                { q: '¿Cobran comisión por reserva?', k: 'comision porcentaje', a: 'Las reservas que llegan por tu propio link no pagan nada. Las que llegan desde el buscador de TurnitosLR pagan $500 por turno, y 3% en alquileres.' },
                { q: '¿Cómo pago el abono y qué pasa si me atraso?', k: 'vencimiento atraso deuda', a: 'Por transferencia, Mercado Pago o efectivo. Si pasan 10 días del vencimiento, tu página se oculta hasta que regularices.' },
                { q: '¿Puedo darme de baja?', k: 'baja dejar de usar contrato', a: 'Cuando quieras, sin permanencia mínima. Tu página se da de baja al terminar el mes pago.' }
            ]
        },
        {
            id: 'agenda', title: 'Agenda y reservas', icon: CalendarCheck, blurb: 'Tu día a día en el panel',
            faqs: [
                { q: '¿Puedo bloquear horarios por lluvia o feriados?', k: 'vacaciones mantenimiento', a: 'Sí. Desde tu panel bloqueás una cancha, un horario o el día entero y nadie puede reservar ahí.' },
                { q: '¿Puedo cargar reservas que me hacen por teléfono?', k: 'manual telefono nueva reserva', a: 'Sí. Con "Nueva reserva" en tu panel las cargás a mano y quedan ocupadas para el resto.' },
                { q: '¿Me avisan cuando entra una reserva?', k: 'notificacion aviso alerta app celular', a: 'Sí. Instalá TurnitosLR en tu celular desde el panel y activá las notificaciones: te llega un aviso con cada reserva nueva.' },
                { q: '¿Cómo entro a mi panel?', k: 'ingresar login acceso contraseña portal olvide', a: 'Entrá a turnitoslr.com/login con el usuario y la contraseña que te dimos. Si no la recordás, escribinos por WhatsApp.' }
            ]
        },
        {
            id: 'cobros', title: 'Cobros y señas', icon: Wallet, blurb: 'Señas por transferencia',
            faqs: [
                { q: '¿Puedo cobrar señas?', k: 'sena porcentaje alias cbu', a: 'Sí. Elegís el porcentaje (30%, 50% o 100%) y cargás tu alias o CBU. El cliente los ve al reservar y te manda el comprobante.' },
                { q: '¿Puedo crear promos por horario?', k: 'promocion descuento oferta', a: 'Sí. Armás descuentos por franja, por ejemplo -20% de lunes a viernes antes de las 18, y se ven marcados en tu grilla y en la home.' }
            ]
        },
        {
            id: 'pagina', title: 'Tu página y Link in Bio', icon: Link2, blurb: 'Tu vidriera en Instagram',
            faqs: [
                { q: '¿Cómo funciona el Link in Bio?', k: 'instagram link enlace subdominio', a: 'Tenés un enlace propio, como tu-negocio.turnitoslr.com, para la bio de Instagram o tus estados. Ahí ven tus turnos, tu tienda, tus fotos y tus redes.' },
                { q: '¿Puedo cambiar fotos, portada y colores?', k: 'foto portada logo color diseño apariencia', a: 'Sí, desde Configuración > Apariencia. Los cambios se ven al instante.' }
            ]
        },
        {
            id: 'clientes', title: 'Clientes y reseñas', icon: Users, blurb: 'Recordatorios y opiniones',
            faqs: [
                { q: '¿Se mandan recordatorios automáticos?', k: 'recordatorio aviso cliente', a: 'Estamos sumando recordatorios automáticos desde un número central. Mientras tanto, desde tu panel mandás el recordatorio con un clic.' },
                { q: '¿Cómo consigo reseñas?', k: 'opiniones estrellas', a: 'Después de cada turno el cliente recibe un enlace para opinar. Solo opinan quienes reservaron, así las reseñas son reales.' }
            ]
        }
    ]
};

export const ALL_HELP_FAQS = [...HELP_TOPICS.clientes, ...HELP_TOPICS.negocios].flatMap(t => t.faqs);

export const HELP_WHATSAPP_URL = 'https://wa.me/5493805002706?text=Hola,%20tengo%20una%20consulta%20sobre%20Turnitos';
