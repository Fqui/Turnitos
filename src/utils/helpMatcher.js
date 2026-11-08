// Rule-based matcher for the Help Center assistant: no AI, it only picks among our own answers.

const STOPWORDS = new Set((
    'a al algo como con cual cuales cuando de del el en es esta este esto hay la las le les lo los me mi mis no o para pero por que se si sin su sus te tengo tu un una uno y ya yo ' +
    'puedo puede pueden quiero quisiera queria hago hace hacen hacer tiene tienen dan necesito saber estoy ser son hola buenas buen dia tarde noche gracias favor porfa ' +
    'turnitos turnitoslr ustedes vos usted che algun alguna mas muy bien tambien solo otra otro'
).split(' '));

// Different words people use for the same thing
const SYNONYMS = {
    sena: ['senas', 'anticipo', 'deposito', 'adelanto'],
    cancelar: ['cancelo', 'cancelacion', 'anular', 'anulo', 'suspender', 'no voy', 'no puedo ir', 'faltar'],
    cambiar: ['cambio', 'modificar', 'modifico', 'reprogramar', 'mover', 'otro dia', 'otro horario', 'pasar'],
    precio: ['precios', 'cuesta', 'costo', 'cuestan', 'sale', 'salen', 'cuanto', 'valor', 'tarifa', 'abono', 'cobran', 'mensualidad', 'plan'],
    pagar: ['pago', 'pagos', 'abonar', 'transferencia', 'transferir', 'mercado pago', 'efectivo'],
    reservar: ['reservo', 'reserva', 'reservas', 'turno', 'turnos', 'sacar', 'agendar', 'anotarme', 'agenda'],
    lluvia: ['llueve', 'llueva', 'clima', 'mojado'],
    resena: ['resenas', 'opinion', 'opiniones', 'opinar', 'calificar', 'calificacion', 'estrellas', 'comentario'],
    devolucion: ['devuelven', 'devolver', 'reintegro', 'reembolso', 'plata', 'dinero'],
    negocio: ['local', 'complejo', 'emprendimiento', 'sumar', 'sumo', 'registrar', 'poner', 'publicar', 'agregar', 'unirme', 'empezar', 'mi negocio'],
    bloquear: ['bloqueo', 'bloquea', 'cerrar', 'cierro', 'feriado', 'feriados'],
    gratis: ['prueba', 'gratuito', 'free', 'sin cargo', 'probar'],
    cuenta: ['registrarme', 'registro', 'usuario', 'loguearme'],
    contrasena: ['clave', 'password', 'contraseña'],
    tarjeta: ['credito', 'debito', 'cuotas', 'visa', 'mastercard'],
    envio: ['envios', 'delivery', 'domicilio', 'mandan', 'llevan'],
    confirmacion: ['confirmada', 'confirmado', 'confirmar', 'comprobante'],
    notificacion: ['notificaciones', 'aviso', 'avisan', 'alerta', 'alertas'],
    app: ['aplicacion', 'instalar', 'instalo', 'descargar', 'descargo'],
    falla: ['no me deja', 'no anda', 'no funciona', 'no carga', 'error', 'bug', 'roto'],
    olvide: ['olvido', 'perdi', 'recuperar'],
    tienda: ['comprar', 'compro', 'producto', 'productos', 'carrito', 'pedido']
};

export const normalize = (text) => (text || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9ñ\s]/g, ' ').replace(/ñ/g, 'n');

const CANONICAL = (() => {
    const map = new Map();
    Object.entries(SYNONYMS).forEach(([key, words]) => {
        map.set(key, key);
        words.forEach(w => map.set(normalize(w).trim(), key));
    });
    return map;
})();

export function tokens(text) {
    const clean = ` ${normalize(text)} `;
    const found = new Set();
    // Multi-word synonyms first ("no puedo ir", "mercado pago")
    CANONICAL.forEach((key, phrase) => {
        if (phrase.includes(' ') && clean.includes(` ${phrase} `)) found.add(key);
    });
    clean.trim().split(/\s+/).forEach(word => {
        if (word.length < 3 || STOPWORDS.has(word)) return;
        found.add(CANONICAL.get(word) || word.replace(/(es|s)$/, ''));
    });
    return found;
}

export function buildIndex(faqs) {
    const items = faqs.map(f => ({ ...f, qTokens: tokens(`${f.q} ${f.k || ''}`), aTokens: tokens(f.a) }));
    // Words that appear in few questions weigh more than common ones like "reservar"
    const df = new Map();
    items.forEach(f => new Set([...f.qTokens, ...f.aTokens]).forEach(t => df.set(t, (df.get(t) || 0) + 1)));
    items.weight = (t) => Math.log(1 + items.length / (df.get(t) || 1));
    return items;
}

// Best answers first; only those with a clear hit on the question itself
export function rankFaqs(index, question) {
    const asked = tokens(question);
    if (asked.size === 0) return [];
    const weight = index.weight || (() => 1);
    const total = [...asked].reduce((sum, t) => sum + 3 * weight(t), 0);
    return index
        .map(f => {
            let score = 0;
            let hits = 0;
            asked.forEach(t => {
                const w = weight(t);
                if (f.qTokens.has(t)) { score += 3 * w; hits += 1; }
                else if (f.aTokens.has(t)) score += w;
            });
            const relative = total ? score / total : 0;
            // Ties go to the question that is mostly about what was asked
            const rank = relative + 0.3 * (hits / Math.max(f.qTokens.size, 1));
            return { faq: f, hits, score, relative, rank };
        })
        .filter(r => r.hits > 0 && r.relative >= 0.34)
        .sort((a, b) => b.rank - a.rank);
}

// Small talk and questions only each business can answer
const INTENTS = [
    { id: 'human', words: ['persona', 'humano', 'asesor', 'operador', 'alguien', 'soporte', 'whatsapp', 'telefono', 'llamar', 'contacto', 'contactar', 'hablar'] },
    { id: 'thanks', words: ['gracias', 'genial', 'perfecto', 'listo', 'buenisimo', 'joya', 'barbaro', 'dale'] },
    { id: 'greeting', words: ['hola', 'buenas', 'buen dia', 'buenos dias', 'buenas tardes', 'buenas noches', 'que tal'] },
    {
        id: 'business_info',
        words: ['estacionamiento', 'estacionar', 'vestuario', 'vestuarios', 'ducha', 'duchas', 'buffet', 'bar', 'direccion', 'ubicacion', 'donde queda', 'donde esta', 'como llego',
            'horario de atencion', 'abren', 'cierran', 'abierto', 'wifi', 'parrilla', 'pileta', 'techada', 'techado', 'paleta', 'paletas', 'pelotas', 'alquilan', 'capacidad', 'cuantas personas', 'mascotas permitidas']
    }
];

export function detectIntent(question) {
    const clean = ` ${normalize(question)} `;
    const words = clean.trim().split(/\s+/).filter(Boolean);
    const has = (w) => clean.includes(` ${normalize(w)} `);
    const human = INTENTS[0].words.some(has);
    if (human) return 'human';
    const info = INTENTS[3].words.some(has);
    if (info) return 'business_info';
    // Greetings and thanks only when the message is basically just that
    if (words.length <= 4 && INTENTS[1].words.some(has)) return 'thanks';
    if (words.length <= 4 && INTENTS[2].words.some(has)) return 'greeting';
    return null;
}
