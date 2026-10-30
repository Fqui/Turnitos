// Starting data for a seller demo: example services, courts and prices per subcategory,
// so a demo can be made from the Instagram .zip alone. The seller can change all of it.

const SERVICES_BY_SUBCATEGORY = {
    'salon de unas': [
        { nombre: 'Esmaltado semipermanente', duracion: 60, precio: 12000, categoria: 'Manos' },
        { nombre: 'Kapping', duracion: 90, precio: 15000, categoria: 'Manos' },
        { nombre: 'Uñas esculpidas', duracion: 120, precio: 20000, categoria: 'Manos' },
        { nombre: 'Retiro', duracion: 30, precio: 5000, categoria: 'Manos' }
    ],
    peluqueria: [
        { nombre: 'Corte', duracion: 45, precio: 10000, categoria: 'Cortes' },
        { nombre: 'Brushing', duracion: 45, precio: 9000, categoria: 'Peinados' },
        { nombre: 'Color', duracion: 120, precio: 30000, categoria: 'Color' }
    ],
    barberia: [
        { nombre: 'Corte', duracion: 30, precio: 8000, categoria: 'Cortes' },
        { nombre: 'Corte y barba', duracion: 45, precio: 11000, categoria: 'Cortes' },
        { nombre: 'Barba', duracion: 20, precio: 5000, categoria: 'Barba' }
    ],
    estetica: [
        { nombre: 'Limpieza facial', duracion: 60, precio: 18000, categoria: 'Facial' },
        { nombre: 'Lifting de pestañas', duracion: 60, precio: 15000, categoria: 'Pestañas' },
        { nombre: 'Perfilado de cejas', duracion: 30, precio: 7000, categoria: 'Cejas' }
    ],
    spa: [
        { nombre: 'Masaje relajante', duracion: 60, precio: 20000, categoria: 'Masajes' },
        { nombre: 'Masaje descontracturante', duracion: 60, precio: 22000, categoria: 'Masajes' }
    ],
    odontologia: [
        { nombre: 'Consulta', duracion: 30, precio: 15000, categoria: 'Consultas' },
        { nombre: 'Limpieza dental', duracion: 45, precio: 25000, categoria: 'Tratamientos' }
    ],
    psicologia: [{ nombre: 'Sesión', duracion: 50, precio: 20000, categoria: 'Sesiones' }],
    kinesiologia: [{ nombre: 'Sesión de kinesiología', duracion: 45, precio: 15000, categoria: 'Sesiones' }],
    nutricion: [{ nombre: 'Consulta nutricional', duracion: 45, precio: 18000, categoria: 'Consultas' }],
    veterinaria: [
        { nombre: 'Consulta', duracion: 30, precio: 12000, categoria: 'Consultas' },
        { nombre: 'Vacunación', duracion: 20, precio: 10000, categoria: 'Consultas' }
    ],
    'peluqueria canina': [
        { nombre: 'Baño', duracion: 60, precio: 10000, categoria: 'Estética' },
        { nombre: 'Baño y corte', duracion: 90, precio: 15000, categoria: 'Estética' }
    ]
};

const SERVICES_BY_CATEGORY = {
    belleza: SERVICES_BY_SUBCATEGORY.peluqueria,
    salud: SERVICES_BY_SUBCATEGORY.odontologia,
    mascotas: SERVICES_BY_SUBCATEGORY.veterinaria
};

const COURTS_BY_SUBCATEGORY = {
    padel: [
        { nombre: 'Cancha 1', precio: 24000, deporte: 'padel' },
        { nombre: 'Cancha 2', precio: 24000, deporte: 'padel' }
    ],
    futbol: [
        { nombre: 'Cancha de 5', precio: 30000, deporte: 'futbol' },
        { nombre: 'Cancha de 7', precio: 45000, deporte: 'futbol' }
    ]
};

export const plainName = (text) => String(text || '').toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

// 'service' | 'sport' | 'alquiler', from the category's business_type
export const kindOf = (category) => category?.business_type || null;

export function defaultServices(category, subcategoryNames = []) {
    for (const name of subcategoryNames) {
        const list = SERVICES_BY_SUBCATEGORY[plainName(name)];
        if (list) return list.map(s => ({ ...s }));
    }
    return (SERVICES_BY_CATEGORY[category?.slug] || SERVICES_BY_CATEGORY.belleza).map(s => ({ ...s }));
}

export function defaultCourts(subcategoryNames = []) {
    for (const name of subcategoryNames) {
        const list = COURTS_BY_SUBCATEGORY[plainName(name)];
        if (list) return list.map(c => ({ ...c }));
    }
    return COURTS_BY_SUBCATEGORY.padel.map(c => ({ ...c }));
}

export const DEFAULT_RENTAL = { precio_hora: 15000, capacidad: 40 };

// Business name: the profile name, or the line under the username when Instagram only gave the username
export function guessName(profile) {
    const name = String(profile?.nombre || '').trim();
    const user = String(profile?.usuario || '').trim();
    if (name && name !== user) return name;
    const lines = String(profile?.texto_encabezado || '').split('\n').map(l => l.trim()).filter(Boolean);
    const afterUser = lines[lines.indexOf(user) + 1];
    if (lines.includes(user) && afterUser && !/publicaciones|seguidores|seguidos/i.test(afterUser)) return afterUser;
    return name || user;
}

// Bio: the profile bio, or the lines between the counters and the buttons of the visible header
export function guessBio(profile) {
    if (String(profile?.bio || '').trim()) return profile.bio.trim();
    const lines = String(profile?.texto_encabezado || '').split('\n').map(l => l.trim()).filter(Boolean);
    const start = lines.findIndex(l => /seguidos$/i.test(l));
    if (start === -1) return '';
    const end = lines.findIndex((l, i) => i > start && /^(seguir|siguiendo|enviar mensaje)$/i.test(l));
    return lines.slice(start + 1, end === -1 ? undefined : end)
        .filter(l => !/^(wa\.me|https?:)/i.test(l))
        .join('\n');
}
