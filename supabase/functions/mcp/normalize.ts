// Validación y normalización de un negocio en el formato de scripts/negocios/*.json.
// Es la misma lógica que normalize() de scripts/negocios/cargar-negocios.mjs, portada a TS
// para la Edge Function. Si cambia una, cambiar la otra.

// deno-lint-ignore-file no-explicit-any
type Json = any;

export const RUBROS: Record<string, string> = {
    canchas: 'canchas', deportes: 'canchas', deporte: 'canchas',
    belleza: 'belleza',
    salud: 'salud',
    alquiler: 'alquileres', alquileres: 'alquileres',
    mascotas: 'mascotas'
};

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

function day(open: string, close: string, { isOpen = true, breakStart = null as string | null, breakEnd = null as string | null } = {}) {
    return { isOpen, isSplit: Boolean(breakStart), open, close, breakStart, breakEnd };
}

// Horarios por defecto si el negocio no trae los suyos
const DEFAULT_HOURS: Record<string, Json> = {
    canchas: Object.fromEntries(DAYS.map(d => [d, day(d === 'sunday' ? '10:00' : '08:00', '00:00')])),
    belleza: Object.fromEntries(DAYS.map(d => [d,
        d === 'sunday' ? day('09:00', '13:00', { isOpen: false })
            : d === 'saturday' ? day('09:00', '14:00')
                : day('09:00', '20:00')])),
    salud: Object.fromEntries(DAYS.map(d => [d,
        ['saturday', 'sunday'].includes(d) ? day('08:00', '13:00', { isOpen: false })
            : day('08:00', '20:00', { breakStart: '13:00', breakEnd: '16:00' })])),
    mascotas: Object.fromEntries(DAYS.map(d => [d,
        d === 'sunday' ? day('09:00', '13:00', { isOpen: false }) : day('09:00', '19:00')])),
    alquileres: null
};

// Igual que public.seed_slugify()
export function slugify(text: unknown): string {
    return String(text || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').substring(0, 50);
}

const WEEKDAY_KEYS: Record<string, string> = { dom: '0', lun: '1', mar: '2', mie: '3', jue: '4', vie: '5', sab: '6' };

function toMinutes(value: unknown): number | null {
    const m = /^(\d{1,2}):(\d{2})$/.exec(String(value || '').trim());
    return m && Number(m[1]) < 24 && Number(m[2]) < 60 ? Number(m[1]) * 60 + Number(m[2]) : null;
}

// { "vie": ["10:00", "18:00"], "sab": [...], "salida": "02:00" } -> metadata.rental_schedule
// (también acepta el formato de la app: { start_times, max_end })
export function parseStartTimes(value: Json): Json | string {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return '"horarios_ingreso" tiene que ser un objeto';
    if (value.start_times) return { start_times: value.start_times, max_end: value.max_end ?? null };
    const startTimes: Record<string, string[]> = {};
    for (const [d, times] of Object.entries(value)) {
        if (d === 'salida') continue;
        const key = WEEKDAY_KEYS[slugify(d).slice(0, 3)];
        if (!key) return `"horarios_ingreso": día "${d}" desconocido (lun, mar, mie, jue, vie, sab, dom)`;
        const list = Array.isArray(times) ? times : [times];
        if (list.some(t => toMinutes(t) === null)) return `"horarios_ingreso": horario inválido en "${d}" (usá "HH:MM")`;
        startTimes[key] = list.map(t => String(t).trim().padStart(5, '0'));
    }
    let maxEnd: number | null = null;
    if (value.salida) {
        maxEnd = toMinutes(value.salida);
        if (maxEnd === null) return '"horarios_ingreso.salida" tiene que ser "HH:MM"';
        // Una salida de madrugada es del día siguiente (02:00 -> 26:00)
        if (maxEnd < 12 * 60) maxEnd += 1440;
    }
    return { start_times: startTimes, max_end: maxEnd };
}

export function parseBannerFocus(value: Json): { x: number; y: number } | string {
    const x = Number(value?.x), y = Number(value?.y);
    if (![x, y].every(v => Number.isFinite(v) && v >= 0 && v <= 100)) return '"portada_foco" va como { "x": 0-100, "y": 0-100 }';
    return { x: Math.round(x), y: Math.round(y) };
}

export function normalize(raw: Json): { business: Json; errors: string[] } {
    const errors: string[] = [];
    const b = { ...raw };

    if (!String(b.nombre || '').trim()) errors.push('falta el nombre');
    const rubro = RUBROS[slugify(b.rubro)];
    if (!rubro) errors.push(`rubro "${b.rubro ?? ''}" desconocido (canchas, belleza, salud, alquileres, mascotas)`);
    b.rubro = rubro;

    for (const key of ['subcategorias', 'profesionales', 'servicios', 'canchas']) {
        if (b[key] == null || b[key] === '') b[key] = [];
        if (typeof b[key] === 'string' && key === 'subcategorias') b[key] = [b[key]];
        if (!Array.isArray(b[key])) errors.push(`"${key}" tiene que ser una lista`);
    }
    if (Array.isArray(b.profesionales)) b.profesionales = b.profesionales.map((p: Json) => (typeof p === 'string' ? { nombre: p } : p));

    if (b.whatsapp) b.whatsapp = String(b.whatsapp).replace(/[^\d+]/g, '');

    const list = (key: string) => (Array.isArray(b[key]) ? b[key] : []);
    if (rubro === 'canchas') {
        if (list('canchas').length === 0 && !b.cantidad) errors.push('cargá "canchas" o "cantidad"');
        if (list('canchas').some((c: Json) => !(Number(c.precio) > 0))) errors.push('todas las canchas necesitan precio');
    }
    if (['belleza', 'salud', 'mascotas'].includes(rubro)) {
        if (list('servicios').length === 0) errors.push('cargá al menos un servicio');
        if (list('servicios').some((s: Json) => !s.nombre || !(Number(s.precio) > 0))) errors.push('cada servicio necesita nombre y precio');
    }
    if (rubro === 'alquileres' && !(Number(b.precio_hora) > 0 || Number(b.precio_dia) > 0)) {
        errors.push('cargá "precio_hora" o "precio_dia"');
    }

    if (!b.horarios && rubro) b.horarios = DEFAULT_HOURS[rubro];
    if (!b.horarios) delete b.horarios;

    // Seña: un número es porcentaje (0 la desactiva); { "monto": 5000 } es fija. Los de prueba van con 30 %
    if ((b.sena == null || b.sena === '') && b.simulacion) b.sena = 30;
    if (b.sena == null || b.sena === '') delete b.sena;
    if (typeof b.sena === 'number' || /^\d+(\.\d+)?$/.test(String(b.sena))) b.sena = { porcentaje: Number(b.sena) };
    else if (b.sena === false) b.sena = { porcentaje: 0 };
    if (b.sena !== undefined && typeof b.sena !== 'object') errors.push('"sena" tiene que ser un porcentaje o { "monto": ... }');
    // Los de prueba muestran datos de transferencia de ejemplo para que se vea el paso de la seña
    if (!b.transferencia && b.simulacion && b.sena?.porcentaje !== 0) {
        b.transferencia = { alias: 'ALIAS.DE.EJEMPLO', banco: 'Datos de ejemplo', titular: b.nombre };
    }

    if (b.horarios_ingreso) {
        if (rubro !== 'alquileres') errors.push('"horarios_ingreso" es solo para alquileres');
        const schedule = parseStartTimes(b.horarios_ingreso);
        if (typeof schedule === 'string') errors.push(schedule);
        else b.horarios_ingreso = schedule;
    }

    if (b.portada_foco != null) {
        const focus = parseBannerFocus(b.portada_foco);
        if (typeof focus === 'string') errors.push(focus);
        else b.portada_foco = focus;
    }

    return { business: b, errors };
}
