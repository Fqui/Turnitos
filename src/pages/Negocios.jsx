import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Check, MessageCircle } from 'lucide-react';
import SEOHead from '../components/SEOHead';
import { STATIC_PAGES, staticPageUrl } from '../utils/seo';
import BusinessLeadForm from '../components/business/BusinessLeadForm';
import '../styles/support.css';
import '../styles/negocios.css';

const WHATSAPP_URL = 'https://wa.me/5493805002706?text=Hola,%20quiero%20sumar%20mi%20negocio%20a%20Turnitos';
const LOGO_URL = '/apple-touch-icon.png';

const photo = (id, w = 800) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&q=70&w=${w}`;

const PHOTOS = {
    padel: { src: photo('1612534847738-b3af9bc31f0c', 900), alt: 'Jugador de pádel con la paleta en la cancha' },
    football: { src: photo('1529900748604-07564a03e7a6', 600), alt: 'Botines de fútbol sobre el césped de la cancha' },
    barber: { src: photo('1503951914875-452162b0f3f1', 600), alt: 'Barbero afeitando a un cliente' },
    nails: { src: photo('1604654894610-df63bc536371', 600), alt: 'Manos con uñas esculpidas' },
    health: { src: photo('1576091160550-2173dba999ef', 600), alt: 'Consultorio con estetoscopio y computadora' },
    venue: { src: photo('1464366400600-7168b8af9bc3', 600), alt: 'Salón de eventos con mesas armadas' },
    dog: { src: photo('1516734212186-a967f81ad0d7', 600), alt: 'Perro en la peluquería canina' }
};

const PAINS = [
    { tag: 'Agenda', text: '“¿Tenés turno mañana?” a las 12 de la noche.' },
    { tag: 'Control', text: 'Cerrás el día y no sabés cuánto entró.' },
    { tag: 'Visibilidad', text: 'Te conocen tus clientes. El resto de La Rioja, no.' },
    { tag: 'Promoción', text: 'El martes a la tarde la agenda queda vacía.' }
];

const STEPS = [
    { title: 'Nos escribís', text: 'Verificamos tu negocio y te armamos el perfil con tus servicios, horarios y fotos.' },
    { title: 'Compartís tu link', text: 'En tu Instagram, tus estados y tus grupos de WhatsApp.' },
    { title: 'Te reservan', text: 'Ves cada turno y cada seña en tu panel, y te llega el aviso al celu.' }
];

const CATEGORIES = [
    { title: 'Canchas', detail: 'Pádel, fútbol, tenis', photo: PHOTOS.padel },
    { title: 'Belleza', detail: 'Pelo, uñas, estética', photo: PHOTOS.nails },
    { title: 'Salud', detail: 'Consultorios, kinesio', photo: PHOTOS.health },
    { title: 'Alquileres', detail: 'Quinchos y salones', photo: PHOTOS.venue },
    { title: 'Mascotas', detail: 'Peluquería canina', photo: PHOTOS.dog }
];

const PLANS = [
    { title: 'Servicios', detail: 'Peluquería, estética, salud, mascotas', price: 'Desde $17.000', unit: 'por mes', note: 'Arrancás con 1 profesional y sumás a tu equipo cuando crezcas.' },
    { title: 'Canchas', detail: 'Pádel, fútbol, tenis y más', price: '$20.000', unit: 'por cancha, por mes', note: 'Desde 4 canchas, cada una te sale menos. Incluye caja y stock del buffet.' },
    { title: 'Alquileres', detail: 'Quinchos, salones y espacios', price: '$15.000', unit: 'por mes', note: 'Calendario de fechas libres y registro de pagos de cada reserva.' }
];

const FAQ = [
    { q: '¿Mis clientes tienen que bajarse una app?', a: 'No. Tocan tu link desde Instagram o WhatsApp y reservan en el navegador. Tampoco les pedimos email.' },
    { q: 'No tengo tiempo de configurar nada', a: 'Te armamos el perfil nosotros con tus servicios, horarios y fotos. Vos lo revisás y lo compartís.' },
    { q: '¿Me cobran comisión?', a: 'Por las reservas de tu link, no. Solo las que te trae el buscador de TurnitosLR pagan $500 por turno (3% en alquileres).' },
    { q: '¿Y si no me sirve?', a: 'Lo probás 14 días gratis. Si no te sirve, no seguís.' }
];

function Row({ label, badge, warn }) {
    return (
        <div className="np-ui-row">
            <span>{label}</span>
            <span className={`np-pill${warn ? ' np-pill--warn' : ''}`}>{badge}</span>
        </div>
    );
}

function Kpis({ items }) {
    return (
        <div className="np-kpis">
            {items.map(([value, label]) => (
                <div key={label}><b>{value}</b><span>{label}</span></div>
            ))}
        </div>
    );
}

const PILLARS = [
    {
        tag: 'Agenda',
        title: 'Que reserven solos, a cualquier hora',
        items: [
            'Ven tus horarios libres y eligen día y hora, sin escribirte.',
            'Cobrás seña con tu Alias o CBU. El que reserva, viene.',
            'Una agenda por cancha o por profesional.',
            'Te llega un aviso al celu con cada reserva nueva.'
        ],
        preview: (
            <>
                <div className="np-ui-label">Hoy · Pádel</div>
                <Row label={<><b>19:30</b> Cancha 1 · Martín G.</>} badge="Confirmada" />
                <Row label={<><b>21:00</b> Cancha 2 · Lucía P.</>} badge="Seña pagada" />
                <Row label={<><b>22:30</b> Cancha 1 · Libre</>} badge="Disponible" warn />
            </>
        )
    },
    {
        tag: 'Control',
        title: 'Sabé cuánto entró hoy sin abrir el Excel',
        items: [
            'Los turnos del día, quién pagó la seña y quién no.',
            'Caja diaria y stock del buffet para complejos.',
            'Ingresos, horas pico y clientes que vuelven.',
            'Registro de pagos para quinchos y salones.'
        ],
        preview: (
            <>
                <div className="np-ui-label">Caja de hoy (ejemplo)</div>
                <div className="np-ui-big">$186.500</div>
                <Kpis items={[['14', 'turnos'], ['11', 'señas'], ['32', 'bebidas']]} />
            </>
        )
    },
    {
        tag: 'Visibilidad',
        title: 'Que te encuentren en La Rioja',
        items: [
            'Tu link propio para el Instagram y los estados de WhatsApp.',
            'Perfil con fotos, historias y reseñas de quienes reservaron.',
            'Aparecés en el buscador de turnitoslr.com, donde la gente busca dónde reservar.'
        ],
        preview: (
            <>
                <div className="np-ui-label">Tu link</div>
                <Row label={<span className="np-link">tunegocio.turnitoslr.com</span>} badge="Copiar" />
                <div className="np-ui-profile">
                    <img src={PHOTOS.dog.src} alt={PHOTOS.dog.alt} loading="lazy" />
                    <div><b>Patitas Spa</b><span>Mascotas · ★ 4,9 · 38 reseñas</span></div>
                </div>
            </>
        )
    },
    {
        tag: 'Promoción',
        title: 'Llená los horarios flojos',
        items: [
            'Cupones de descuento para tus clientes.',
            'Promoción destacada en el inicio de TurnitosLR, con sus vistas, clics y reservas.',
            'Tienda de productos con pedidos por WhatsApp.'
        ],
        soon: 'Recordatorios automáticos por WhatsApp',
        preview: (
            <>
                <div className="np-ui-label">Tu promo en el inicio (ejemplo)</div>
                <Row label={<b>Martes 2x1 en pádel</b>} badge="Activa" />
                <Kpis items={[['1.240', 'vistas'], ['96', 'clics'], ['18', 'reservas']]} />
            </>
        )
    }
];

export default function ForBusinesses() {
    const { hash } = useLocation();

    // Al llegar con /negocios#sumate desde otra página, bajar hasta la sección
    useEffect(() => {
        if (hash) document.getElementById(hash.slice(1))?.scrollIntoView();
    }, [hash]);

    return (
        <div className="sp-page np-page">
            <SEOHead
                {...STATIC_PAGES.negocios}
                url={staticPageUrl('negocios')}
            />

            <header className="sp-wrap np-hero">
                <div className="np-hero-copy">
                    <span className="sp-eyebrow">Para negocios con turnos de La Rioja</span>
                    <h1 className="sp-title">Tus clientes reservan solos. <em>Vos manejás el negocio.</em></h1>
                    <p className="sp-lead">
                        Agenda online, cobro de señas, caja y un lugar en el buscador de La Rioja. Para canchas, peluquerías, consultorios, quinchos y peluquerías caninas.
                    </p>
                    <div className="sp-actions">
                        <a className="sp-btn sp-btn--primary" href="#sumate">Probalo 14 días gratis</a>
                        <a className="sp-btn" href="#precios">Ver precios</a>
                    </div>
                    <p className="np-checks">
                        <span><Check size={16} aria-hidden="true" /> Te armamos el perfil</span>
                        <span><Check size={16} aria-hidden="true" /> Sin comisión por las reservas de tu link</span>
                    </p>
                </div>
                <div className="np-mosaic">
                    {[PHOTOS.padel, PHOTOS.football, PHOTOS.barber, PHOTOS.nails].map(p => (
                        <img key={p.src} src={p.src} alt={p.alt} />
                    ))}
                    <div className="np-toast" aria-hidden="true">
                        <img src={LOGO_URL} alt="" />
                        <div><b>Nueva reserva · Cancha 2</b><span>Jueves 21:00 · Seña $8.000 pagada</span></div>
                    </div>
                </div>
            </header>

            <main className="sp-wrap">
                <section className="sp-section">
                    <div className="sp-section-head sp-section-head--center">
                        <h2 className="sp-h2">¿Te suena?</h2>
                    </div>
                    <div className="np-pains">
                        {PAINS.map(({ tag, text }) => (
                            <div key={tag} className="np-pain">
                                <small>{tag}</small>
                                <p>{text}</p>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="sp-section">
                    <div className="sp-section-head sp-section-head--center">
                        <h2 className="sp-h2">Cuatro cosas que dejás de hacer a mano</h2>
                        <p className="sp-lead">Desde el celu o la compu, en un solo panel.</p>
                    </div>
                    <div className="np-pillars">
                        {PILLARS.map(({ tag, title, items, soon, preview }) => (
                            <article key={tag} className="np-pillar">
                                <div>
                                    <div className="np-pillar-tag">{tag}</div>
                                    <h3>{title}</h3>
                                    <ul>
                                        {items.map(item => <li key={item}>{item}</li>)}
                                        {soon && (
                                            <li className="np-soon">
                                                {soon} <span className="np-pill np-pill--muted">Próximamente</span>
                                            </li>
                                        )}
                                    </ul>
                                </div>
                                <div className="np-ui">{preview}</div>
                            </article>
                        ))}
                    </div>
                </section>

                <section className="sp-section">
                    <div className="sp-section-head sp-section-head--center">
                        <h2 className="sp-h2">Empezás en tres pasos</h2>
                    </div>
                    <ol className="np-steps">
                        {STEPS.map(({ title, text }) => (
                            <li key={title}><b>{title}</b><span>{text}</span></li>
                        ))}
                    </ol>
                </section>

                <section className="sp-section">
                    <div className="sp-section-head sp-section-head--center">
                        <h2 className="sp-h2">Para cualquier negocio que trabaje con turnos</h2>
                    </div>
                    <div className="np-categories">
                        {CATEGORIES.map(({ title, detail, photo: p }) => (
                            <div key={title} className="np-category">
                                <img src={p.src} alt={p.alt} loading="lazy" />
                                <div><b>{title}</b><span>{detail}</span></div>
                            </div>
                        ))}
                    </div>
                </section>

                <section id="precios" className="sp-section" style={{ scrollMarginTop: '96px' }}>
                    <div className="sp-section-head sp-section-head--center">
                        <h2 className="sp-h2">Un precio fijo por mes, según tu rubro</h2>
                        <p className="sp-lead">Las reservas que llegan por tu link no pagan comisión. Las que te trae el buscador de TurnitosLR pagan $500 por turno (3% en alquileres).</p>
                    </div>
                    <div className="sp-grid">
                        {PLANS.map(({ title, detail, price, unit, note }) => (
                            <div key={title} className="sp-card sp-price-card">
                                <h3>{title}</h3>
                                <p>{detail}</p>
                                <div className="sp-price">{price}</div>
                                <div className="sp-price-unit">{unit}</div>
                                <p className="sp-price-note">{note}</p>
                            </div>
                        ))}
                    </div>
                    <div className="sp-callout">Los primeros 14 días son gratis.</div>
                </section>

                <section className="sp-section">
                    <div className="sp-wrap--narrow" style={{ margin: '0 auto' }}>
                        <div className="sp-section-head sp-section-head--center">
                            <h2 className="sp-h2">Lo que nos preguntan</h2>
                        </div>
                        <div className="np-faq">
                            {FAQ.map(({ q, a }, i) => (
                                <details key={q} open={i === 0}>
                                    <summary>{q}</summary>
                                    <p>{a}</p>
                                </details>
                            ))}
                        </div>
                    </div>
                </section>

                <section id="sumate" className="np-final" style={{ scrollMarginTop: '96px' }}>
                    <div className="np-final-copy">
                        <h2 className="sp-h2">Probalo 14 días gratis</h2>
                        <p>Dejanos tus datos y te escribimos por WhatsApp. Verificamos tu negocio y te armamos el perfil.</p>
                        <p>¿Preferís hablar? WhatsApp <b>380 500-2706</b></p>
                        <a className="sp-btn" href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
                            <MessageCircle size={18} aria-hidden="true" /> Prefiero hablar por WhatsApp
                        </a>
                    </div>
                    <div className="sp-card">
                        <BusinessLeadForm />
                    </div>
                </section>
            </main>
        </div>
    );
}
