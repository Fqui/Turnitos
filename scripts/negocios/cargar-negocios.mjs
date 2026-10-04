#!/usr/bin/env node
/**
 * Carga masiva de negocios desde un JSON o CSV.
 *
 *   node scripts/negocios/cargar-negocios.mjs <archivo> [--probar] [--sql] [--actualizar]
 *   node scripts/negocios/cargar-negocios.mjs --borrar-simulacion [--sql]
 *
 * Cada negocio pasa por public.admin_seed_business() (supabase/migrations/20261004_seed_business.sql):
 * crea la cuenta del dueño, el negocio con su plan y suscripción, y completa el perfil.
 *
 * Con SUPABASE_SERVICE_ROLE_KEY en el entorno (o en .env.local) lo carga directo y guarda
 * los accesos en scripts/negocios/salida/. Sin la clave (o con --sql) genera un .sql para
 * correr en el editor SQL de Supabase: todo o nada, devuelve los accesos como resultado.
 *
 * Formato: ver scripts/negocios/README.md y ejemplo-simulacion.json.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(HERE, 'salida');

const RUBROS = {
    canchas: 'canchas', deportes: 'canchas', deporte: 'canchas',
    belleza: 'belleza',
    salud: 'salud',
    alquiler: 'alquileres', alquileres: 'alquileres',
    mascotas: 'mascotas'
};

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

function day(open, close, { isOpen = true, breakStart = null, breakEnd = null } = {}) {
    return { isOpen, isSplit: Boolean(breakStart), open, close, breakStart, breakEnd };
}

// Horarios por defecto si el negocio no trae los suyos
const DEFAULT_HOURS = {
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

function slugify(text) {
    return String(text || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').substring(0, 50);
}

// --- Lectura -------------------------------------------------------------------

function parseCsv(text) {
    const rows = [];
    let row = [], field = '', quoted = false;
    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (quoted) {
            if (ch === '"' && text[i + 1] === '"') { field += '"'; i++; }
            else if (ch === '"') quoted = false;
            else field += ch;
        } else if (ch === '"') quoted = true;
        else if (ch === ',' || ch === ';') { row.push(field); field = ''; }
        else if (ch === '\n' || ch === '\r') {
            if (ch === '\r' && text[i + 1] === '\n') i++;
            row.push(field); field = '';
            if (row.some(v => v.trim() !== '')) rows.push(row);
            row = [];
        } else field += ch;
    }
    row.push(field);
    if (row.some(v => v.trim() !== '')) rows.push(row);
    const [header, ...data] = rows;
    const keys = header.map(h => slugify(h).replace(/-/g, '_'));
    return data.map(values => Object.fromEntries(keys.map((k, i) => [k, (values[i] ?? '').trim()])));
}

// "Corte:30:10000 | Barba:20:6000"  ->  [{nombre, duracion, precio}]
function splitList(value) {
    return String(value || '').split('|').map(v => v.trim()).filter(Boolean);
}

function fromCsvRow(row) {
    return {
        ...row,
        subcategorias: splitList(row.subcategorias || row.subcategoria),
        profesionales: splitList(row.profesionales).map(p => {
            const [nombre, rol] = p.split(':').map(s => s.trim());
            return rol ? { nombre, rol } : { nombre };
        }),
        servicios: splitList(row.servicios).map(s => {
            const [nombre, duracion, precio, categoria] = s.split(':').map(v => v.trim());
            return { nombre, duracion: Number(duracion) || 30, precio: Number(precio) || 0, categoria };
        }),
        canchas: splitList(row.canchas).map(c => {
            const [nombre, precio, deporte] = c.split(':').map(v => v.trim());
            return { nombre, precio: Number(precio) || 0, deporte };
        }),
        simulacion: /^(si|sí|true|1)$/i.test(row.simulacion || '')
    };
}

function readBusinesses(file) {
    const text = fs.readFileSync(file, 'utf8').replace(/^﻿/, '');
    if (file.toLowerCase().endsWith('.csv')) return parseCsv(text).map(fromCsvRow);
    const data = JSON.parse(text);
    const list = Array.isArray(data) ? data : data.negocios;
    if (!Array.isArray(list)) throw new Error('El JSON tiene que ser una lista o { "negocios": [...] }');
    // "simulacion" a nivel archivo aplica a todos
    return list.map(b => ({ simulacion: Boolean(data.simulacion), ...b }));
}

// --- Validación ----------------------------------------------------------------

function normalize(raw, index) {
    const errors = [];
    const b = { ...raw };
    const label = b.nombre ? `"${b.nombre}"` : `fila ${index + 1}`;

    if (!String(b.nombre || '').trim()) errors.push('falta el nombre');
    const rubro = RUBROS[slugify(b.rubro)];
    if (!rubro) errors.push(`rubro "${b.rubro ?? ''}" desconocido (canchas, belleza, salud, alquileres, mascotas)`);
    b.rubro = rubro;

    for (const key of ['subcategorias', 'profesionales', 'servicios', 'canchas']) {
        if (b[key] == null || b[key] === '') b[key] = [];
        if (!Array.isArray(b[key])) errors.push(`"${key}" tiene que ser una lista`);
    }
    if (typeof b.subcategorias === 'string') b.subcategorias = [b.subcategorias];
    b.profesionales = (b.profesionales || []).map(p => (typeof p === 'string' ? { nombre: p } : p));

    if (b.whatsapp) b.whatsapp = String(b.whatsapp).replace(/[^\d+]/g, '');

    if (rubro === 'canchas') {
        if (b.canchas.length === 0 && !b.cantidad) errors.push('cargá "canchas" o "cantidad"');
        if (b.canchas.some(c => !(Number(c.precio) > 0))) errors.push('todas las canchas necesitan precio');
    }
    if (['belleza', 'salud', 'mascotas'].includes(rubro)) {
        if (b.servicios.length === 0) errors.push('cargá al menos un servicio');
        if (b.servicios.some(s => !s.nombre || !(Number(s.precio) > 0))) errors.push('cada servicio necesita nombre y precio');
    }
    if (rubro === 'alquileres' && !(Number(b.precio_hora) > 0 || Number(b.precio_dia) > 0)) {
        errors.push('cargá "precio_hora" o "precio_dia"');
    }

    if (!b.horarios && rubro) b.horarios = DEFAULT_HOURS[rubro];
    if (!b.horarios) delete b.horarios;

    return { business: b, errors: errors.map(e => `${label}: ${e}`) };
}

// --- Salidas -------------------------------------------------------------------

function sqlLiteral(value) {
    return `'${JSON.stringify(value).replace(/'/g, "''")}'::jsonb`;
}

function writeSql(file, sql) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
    fs.writeFileSync(file, sql, 'utf8');
    console.log(`SQL generado: ${path.relative(process.cwd(), file)}`);
    console.log('Correlo en el editor SQL de Supabase.');
}

function writeCredentials(rows) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const file = path.join(OUT_DIR, `accesos-${stamp}.csv`);
    const csv = ['nombre,tipo,link,email,password',
        ...rows.map(r => [r.nombre, r.tipo, r.link, r.email, r.password]
            .map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
    fs.writeFileSync(file, csv, 'utf8');
    console.log(`Accesos guardados en ${path.relative(process.cwd(), file)} (no se sube a git)`);
}

function loadEnv() {
    for (const name of ['.env.local', '.env']) {
        if (!fs.existsSync(name)) continue;
        for (const line of fs.readFileSync(name, 'utf8').split(/\r?\n/)) {
            const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
            if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
        }
    }
}

async function getClient() {
    loadEnv();
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return null;
    const { createClient } = await import('@supabase/supabase-js');
    return createClient(url, key, { auth: { persistSession: false } });
}

// --- Main ----------------------------------------------------------------------

async function main() {
    const args = process.argv.slice(2);
    const flags = new Set(args.filter(a => a.startsWith('--')));
    const file = args.find(a => !a.startsWith('--'));
    const forceSql = flags.has('--sql');

    if (flags.has('--borrar-simulacion')) {
        const client = forceSql ? null : await getClient();
        if (!client) {
            writeSql(path.join(OUT_DIR, 'borrar-simulacion.sql'), 'select public.admin_delete_simulated_businesses() as borrados;\n');
            return;
        }
        const { data, error } = await client.rpc('admin_delete_simulated_businesses');
        if (error) throw new Error(error.message);
        console.log(`Negocios de simulación borrados: ${data}`);
        return;
    }

    if (!file) {
        console.log('Uso: node scripts/negocios/cargar-negocios.mjs <archivo.json|csv> [--probar] [--sql]');
        console.log('     node scripts/negocios/cargar-negocios.mjs --borrar-simulacion [--sql]');
        process.exit(1);
    }

    const results = readBusinesses(file).map(normalize);
    const errors = results.flatMap(r => r.errors);
    const businesses = results.map(r => r.business);

    // Nombres repetidos dentro del mismo archivo
    const seen = new Map();
    for (const b of businesses) {
        const s = slugify(b.slug || b.nombre);
        if (seen.has(s)) errors.push(`"${b.nombre}": repite la dirección web de "${seen.get(s)}" (${s})`);
        seen.set(s, b.nombre);
    }

    if (errors.length) {
        console.error(`Hay ${errors.length} problema(s), no se cargó nada:`);
        errors.forEach(e => console.error(`  - ${e}`));
        process.exit(1);
    }

    console.log(`${businesses.length} negocio(s) válidos:`);
    for (const b of businesses) {
        const extra = b.rubro === 'canchas' ? `${b.canchas.length || b.cantidad} canchas`
            : b.rubro === 'alquileres' ? 'alquiler'
                : `${b.servicios.length} servicios, ${b.profesionales.length || 1} profesional(es)`;
        console.log(`  - ${b.nombre} [${b.rubro}] ${extra} -> ${slugify(b.slug || b.nombre)}.turnitoslr.com`);
    }
    if (flags.has('--probar')) return;

    const client = forceSql ? null : await getClient();

    // --actualizar: aplica el archivo sobre negocios que ya existen (los busca por slug)
    if (flags.has('--actualizar')) {
        const name = path.basename(file).replace(/\.[^.]+$/, '');
        if (!client) {
            writeSql(path.join(OUT_DIR, `${name}-actualizar.sql`),
                `-- Generado por cargar-negocios.mjs --actualizar desde ${path.basename(file)}\n` +
                `select b.slug, public.admin_apply_business_profile(b.id, x.data) is null as actualizado\n` +
                `from jsonb_array_elements(${sqlLiteral(businesses)}) as x(data)\n` +
                `join public.businesses b on b.slug = coalesce(nullif(public.seed_slugify(x.data->>'slug'), ''), public.seed_slugify(x.data->>'nombre'));\n`);
            return;
        }
        for (const b of businesses) {
            const slug = slugify(b.slug || b.nombre);
            const { data: found } = await client.from('businesses').select('id').eq('slug', slug).maybeSingle();
            if (!found) { console.error(`  x ${b.nombre}: no existe ${slug}`); continue; }
            const { error } = await client.rpc('admin_apply_business_profile', { p_business_id: found.id, p_data: b });
            console.log(error ? `  x ${b.nombre}: ${error.message}` : `  ok ${b.nombre}`);
        }
        return;
    }

    if (!client) {
        const name = path.basename(file).replace(/\.[^.]+$/, '');
        writeSql(path.join(OUT_DIR, `${name}.sql`),
            `-- Generado por cargar-negocios.mjs desde ${path.basename(file)}\n` +
            `select r->>'nombre' as nombre, r->>'tipo' as tipo, r->>'link' as link,\n` +
            `       r->>'email' as email, r->>'password' as password\n` +
            `from jsonb_array_elements(${sqlLiteral(businesses)}) with ordinality as x(data, n),\n` +
            `     lateral (select public.admin_seed_business(x.data) as r) s\n` +
            `order by x.n;\n`);
        return;
    }

    const created = [];
    for (const b of businesses) {
        const { data, error } = await client.rpc('admin_seed_business', { p_data: b });
        if (error) console.error(`  x ${b.nombre}: ${error.message}`);
        else { created.push(data); console.log(`  ok ${data.nombre} -> ${data.link}`); }
    }
    if (created.length) writeCredentials(created);
    console.log(`Listo: ${created.length} de ${businesses.length} creados.`);
}

main().catch(err => {
    console.error(err.message);
    process.exit(1);
});
