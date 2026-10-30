// mcp: servidor MCP de TurnitosLR (transporte Streamable HTTP, sin sesión, respuestas JSON).
// Herramientas para armar demos: crear_negocio_demo, subir_media, actualizar_negocio,
// borrar_demo y buscar_negocio. Ver README.md.
//
// Autenticación: el secreto MCP_SECRET (secret de la función) en el header x-mcp-secret
// o como último tramo de la URL (.../functions/v1/mcp/<secreto>) para clientes que no
// permiten headers, como los conectores de claude.ai. Se despliega con verify_jwt = false.
//
// Todo lo que modifica o borra solo actúa sobre negocios con metadata.simulacion = true.
// deno-lint-ignore-file no-explicit-any
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { normalize, parseBannerFocus, parseStartTimes, slugify } from './normalize.ts';

type Json = any;

const SERVER_INFO = { name: 'turnitoslr', version: '1.0.0' };
const PROTOCOL_VERSIONS = ['2025-11-25', '2025-06-18', '2025-03-26', '2024-11-05'];
const BUCKET = 'business-images';
const MAX_FILE_BYTES = 20 * 1024 * 1024;
const RESERVED_SLUGS = new Set(['admin', 'login', 'portal', 'business-portal', 'ayuda', 'negocios', 'colaboradores',
    'terminos', 'privacidad', 'calificar', 'review', 'api', 'assets', 'www', '']);

class ToolError extends Error {}

function getSecretKey(): string {
    const keys = Deno.env.get('SUPABASE_SECRET_KEYS');
    if (keys) {
        try {
            const parsed = JSON.parse(keys);
            if (parsed?.default) return parsed.default;
        } catch { /* fall back to legacy key */ }
    }
    return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
}

// --- Auth ----------------------------------------------------------------------

async function sha256(text: string): Promise<Uint8Array> {
    return new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)));
}

// Comparación en tiempo constante (sobre los hashes, así el largo no importa)
async function secretMatches(given: string, expected: string): Promise<boolean> {
    const [a, b] = await Promise.all([sha256(given), sha256(expected)]);
    let diff = 0;
    for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
    return diff === 0;
}

function secretFromRequest(req: Request): string {
    const header = req.headers.get('x-mcp-secret');
    if (header) return header.trim();
    const parts = new URL(req.url).pathname.split('/').filter(Boolean);
    const at = parts.lastIndexOf('mcp');
    return at >= 0 && parts.length > at + 1 ? decodeURIComponent(parts[at + 1]) : '';
}

// --- Helpers de negocio ----------------------------------------------------------

const PUBLIC_FIELDS = 'id, name, slug, type, subscription_status, metadata, created_at';

function summary(b: Json) {
    return {
        id: b.id,
        nombre: b.name,
        slug: b.slug,
        link: `https://${b.slug}.turnitoslr.com`,
        tipo: b.type,
        estado: b.subscription_status,
        simulacion: b.metadata?.simulacion === true
    };
}

async function getBusiness(db: SupabaseClient, slug: string, fields = PUBLIC_FIELDS): Promise<Json> {
    const clean = slugify(slug);
    if (!clean) throw new ToolError('Falta el slug del negocio');
    const { data, error } = await db.from('businesses').select(fields).eq('slug', clean).maybeSingle();
    if (error) throw new ToolError(error.message);
    if (!data) throw new ToolError(`No existe un negocio con el slug "${clean}". Probá con buscar_negocio.`);
    return data;
}

async function getSimulatedBusiness(db: SupabaseClient, slug: string, fields = PUBLIC_FIELDS): Promise<Json> {
    const b = await getBusiness(db, slug, fields);
    if (b.metadata?.simulacion !== true) {
        throw new ToolError(`"${b.slug}" es un negocio real (no es de simulación): esta herramienta no lo toca.`);
    }
    return b;
}

async function applyProfile(db: SupabaseClient, businessId: string, data: Json) {
    const { error } = await db.rpc('admin_apply_business_profile', { p_business_id: businessId, p_data: data });
    if (error) throw new ToolError(error.message);
}

// --- Media -----------------------------------------------------------------------

const EXTENSIONS: Record<string, string> = {
    'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/avif': 'avif', 'image/gif': 'gif',
    'image/heic': 'heic', 'image/heif': 'heif', 'video/mp4': 'mp4', 'video/webm': 'webm', 'video/quicktime': 'mov'
};

function sniffType(bytes: Uint8Array): string | null {
    const hex = (n: number) => Array.from(bytes.slice(0, n)).map(v => v.toString(16).padStart(2, '0')).join('');
    const ascii = (from: number, to: number) => String.fromCharCode(...bytes.slice(from, to));
    if (hex(3) === 'ffd8ff') return 'image/jpeg';
    if (hex(8) === '89504e470d0a1a0a') return 'image/png';
    if (ascii(0, 4) === 'GIF8') return 'image/gif';
    if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return 'image/webp';
    if (ascii(4, 8) === 'ftyp') {
        const brand = ascii(8, 12);
        if (brand.startsWith('avif')) return 'image/avif';
        if (/^hei|^mif1/.test(brand)) return 'image/heic';
        if (brand === 'qt  ') return 'video/quicktime';
        return 'video/mp4';
    }
    if (hex(4) === '1a45dfa3') return 'video/webm';
    return null;
}

async function loadFile(file: Json): Promise<{ bytes: Uint8Array<ArrayBuffer>; type: string }> {
    let bytes: Uint8Array<ArrayBuffer>;
    let declared = '';
    if (file.url) {
        const url = String(file.url);
        if (!/^https:\/\//i.test(url)) throw new ToolError('La url tiene que empezar con https://');
        const res = await fetch(url, { signal: AbortSignal.timeout(20000), redirect: 'follow' });
        if (!res.ok) throw new ToolError(`No se pudo descargar ${url} (HTTP ${res.status})`);
        if (Number(res.headers.get('content-length')) > MAX_FILE_BYTES) throw new ToolError('El archivo pasa los 20 MB');
        bytes = new Uint8Array(await res.arrayBuffer());
        declared = (res.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase();
    } else if (file.base64) {
        let data = String(file.base64).trim();
        const m = /^data:([^;,]+)(;base64)?,/.exec(data);
        if (m) {
            declared = m[1].toLowerCase();
            data = data.slice(m[0].length);
        }
        try {
            const bin = atob(data.replace(/\s+/g, ''));
            bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
        } catch {
            throw new ToolError('El base64 no es válido');
        }
    } else {
        throw new ToolError('Cada archivo necesita "url" o "base64"');
    }
    if (bytes.length === 0) throw new ToolError('El archivo está vacío');
    if (bytes.length > MAX_FILE_BYTES) throw new ToolError('El archivo pasa los 20 MB');
    const type = sniffType(bytes) ?? (EXTENSIONS[declared] ? declared : null);
    if (!type) throw new ToolError('Formato no soportado (jpg, png, webp, avif, gif, heic, mp4, webm o mov)');
    return { bytes, type };
}

async function shortHash(bytes: Uint8Array<ArrayBuffer>): Promise<string> {
    const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
    return Array.from(digest.slice(0, 6)).map(v => v.toString(16).padStart(2, '0')).join('');
}

const DESTINOS = ['portada', 'logo', 'galeria', 'destacada', 'servicio'];

// Nombre estable para que un reintento pise el mismo archivo en vez de crear otro
async function fileName(file: Json, bytes: Uint8Array<ArrayBuffer>, type: string): Promise<string> {
    const ext = EXTENSIONS[type];
    if (file.nombre) return `${slugify(String(file.nombre).replace(/\.[a-z0-9]+$/i, ''))}.${ext}`;
    if (file.destino === 'portada' || file.destino === 'logo') return `${file.destino}.${ext}`;
    if (file.destino === 'servicio') return `servicio-${slugify(file.ref)}.${ext}`;
    return `${file.destino}-${await shortHash(bytes)}.${ext}`;
}

function galleryItems(b: Json): Json[] {
    const venue = b.metadata?.venue_gallery;
    if (Array.isArray(venue) && venue.length) {
        return venue.map((g: Json) => ({ url: g.url, titulo: g.caption ?? '', categoria: g.category ?? 'General', destacada: Boolean(g.is_featured) }));
    }
    return (Array.isArray(b.gallery_images) ? b.gallery_images : []).map((g: Json) =>
        typeof g === 'string' ? { url: g, titulo: '', categoria: 'General', destacada: false }
            : { url: g.url, titulo: g.caption ?? '', categoria: g.category ?? 'General', destacada: Boolean(g.is_featured) });
}

function highlightItems(b: Json): Json[] {
    return (Array.isArray(b.gallery_highlights) ? b.gallery_highlights : [])
        .sort((x: Json, y: Json) => (x.order ?? 0) - (y.order ?? 0))
        .map((h: Json) => ({ titulo: h.title, fotos: Array.isArray(h.images) ? h.images : [], portada: h.cover_image ?? undefined }));
}

async function findService(db: SupabaseClient, b: Json, ref: unknown): Promise<Json> {
    const { data: services, error } = await db.from('services').select('id, name, images').eq('business_id', b.id);
    if (error) throw new ToolError(error.message);
    const service = (services ?? []).find(s => slugify(s.name) === slugify(ref));
    if (!service) {
        throw new ToolError(`No hay un servicio "${ref}". Servicios: ${(services ?? []).map(s => s.name).join(', ') || 'ninguno'}`);
    }
    return service;
}

async function assignMedia(db: SupabaseClient, b: Json, file: Json, url: string): Promise<string> {
    switch (file.destino) {
        case 'portada':
            await applyProfile(db, b.id, { portada: url });
            return 'portada';
        case 'logo':
            await applyProfile(db, b.id, { logo: url });
            return 'logo';
        case 'galeria': {
            const items = galleryItems(b);
            const existing = items.find(g => g.url === url);
            if (existing) {
                if (file.ref) existing.titulo = String(file.ref);
                if (file.categoria) existing.categoria = String(file.categoria);
            } else {
                items.push({ url, titulo: file.ref ? String(file.ref) : '', categoria: file.categoria ? String(file.categoria) : 'General', destacada: false });
            }
            await applyProfile(db, b.id, { galeria: items });
            b.metadata = { ...b.metadata, venue_gallery: items.map(g => ({ url: g.url, caption: g.titulo, category: g.categoria, is_featured: g.destacada })) };
            return `galería (${items.length} fotos)`;
        }
        case 'destacada': {
            const title = String(file.ref ?? '').trim();
            const items = highlightItems(b);
            let item = items.find(h => slugify(h.titulo) === slugify(title));
            if (!item) {
                item = { titulo: title, fotos: [] };
                items.push(item);
            }
            if (!item.fotos.includes(url)) item.fotos.push(url);
            await applyProfile(db, b.id, { destacados: items });
            b.gallery_highlights = items.map((h, n) => ({ title: h.titulo, images: h.fotos, cover_image: h.portada ?? h.fotos[0], order: n }));
            return `destacada "${item.titulo}" (${item.fotos.length} fotos)`;
        }
        case 'servicio': {
            const service = await findService(db, b, file.ref);
            // image_url es la principal (= images[1]); hasta 5 fotos
            const images = [url, ...(service.images ?? []).filter((u: string) => u !== url)].slice(0, 5);
            const { error: updateError } = await db.from('services').update({ image_url: url, images }).eq('id', service.id);
            if (updateError) throw new ToolError(updateError.message);
            return `servicio "${service.name}"`;
        }
    }
    throw new ToolError(`Destino "${file.destino}" desconocido`);
}

// --- Herramientas ----------------------------------------------------------------

const TOOLS = [
    {
        name: 'crear_negocio_demo',
        description: 'Crea un negocio de demo (simulación, estado trial, seña 30 %) con el mismo formato que los JSON de scripts/negocios '
            + '(nombre, rubro, subcategorias, whatsapp, direccion, descripcion, logo, portada, tema, color, horarios, profesionales, servicios, canchas, '
            + 'precio_hora, galeria, comodidades, destacados, extras, tienda, links, horarios_ingreso, portada_foco, slug...). '
            + 'Si el slug ya existe devuelve error y no crea nada. Devuelve slug, link y accesos del dueño.',
        inputSchema: {
            type: 'object',
            properties: {
                negocio: { type: 'object', description: 'Un negocio en el formato de scripts/negocios/README.md', additionalProperties: true }
            },
            required: ['negocio']
        }
    },
    {
        name: 'subir_media',
        description: 'Sube imágenes o videos a business-images/simulacion/<slug>/ (pisa el archivo si ya existe) y los asigna en el negocio de simulación. '
            + 'destino: portada | logo | galeria (ref = título, categoria opcional) | destacada (ref = título del círculo; se crea si no existe) | servicio (ref = nombre del servicio).',
        inputSchema: {
            type: 'object',
            properties: {
                slug: { type: 'string' },
                archivos: {
                    type: 'array',
                    minItems: 1,
                    items: {
                        type: 'object',
                        properties: {
                            url: { type: 'string', description: 'URL https para descargar' },
                            base64: { type: 'string', description: 'Contenido en base64 (o data URL)' },
                            destino: { type: 'string', enum: DESTINOS },
                            ref: { type: 'string' },
                            categoria: { type: 'string', description: 'Solo galería' },
                            nombre: { type: 'string', description: 'Nombre de archivo opcional' }
                        },
                        required: ['destino']
                    }
                }
            },
            required: ['slug', 'archivos']
        }
    },
    {
        name: 'actualizar_negocio',
        description: 'Actualiza un negocio de simulación. cambios admite: portada (url), portada_foco {x,y} en %, color (#hex), tema (light|dark), '
            + 'colores {color, tema}, bio (descripción corta), links [{titulo, url, subtitulo, icono, destacado, color}], '
            + 'horarios (formato businesses.hours), horarios_ingreso (alquileres: {"vie": ["10:00"], "salida": "02:00"}).',
        inputSchema: {
            type: 'object',
            properties: {
                slug: { type: 'string' },
                cambios: { type: 'object', additionalProperties: true }
            },
            required: ['slug', 'cambios']
        }
    },
    {
        name: 'borrar_demo',
        description: 'Borra un negocio de simulación (cuenta, datos y archivos de simulacion/<slug>/). Se niega si el negocio es real.',
        inputSchema: { type: 'object', properties: { slug: { type: 'string' } }, required: ['slug'] }
    },
    {
        name: 'buscar_negocio',
        description: 'Busca negocios por slug exacto o por parte del nombre. Devuelve id, nombre, slug, link, tipo, estado y si es simulación.',
        inputSchema: { type: 'object', properties: { texto: { type: 'string', description: 'Slug o nombre' } }, required: ['texto'] }
    }
];

async function crearNegocioDemo(db: SupabaseClient, args: Json) {
    const raw = args?.negocio;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new ToolError('Pasá el negocio como objeto en "negocio"');
    const { business, errors } = normalize({ ...raw, simulacion: true, estado: 'trial', sena: 30 });
    if (errors.length) throw new ToolError(`El negocio tiene problemas, no se creó nada:\n- ${errors.join('\n- ')}`);

    // Mismo slug que calcularía admin_seed_business, pero sin agregarle -2: si existe, error
    let slug = slugify(business.slug) || slugify(business.nombre);
    if (RESERVED_SLUGS.has(slug)) slug = `${slug}-negocio`;
    const { data: taken } = await db.from('businesses').select(PUBLIC_FIELDS).eq('slug', slug).maybeSingle();
    if (taken) {
        const tipo = taken.metadata?.simulacion === true ? 'de simulación' : 'real';
        throw new ToolError(`Ya existe un negocio ${tipo} con el slug "${slug}" (${taken.name}). No se creó otro. `
            + 'Usá actualizar_negocio / subir_media sobre ese, borralo con borrar_demo o pasá otro "slug".');
    }
    business.slug = slug;

    const { data, error } = await db.rpc('admin_seed_business', { p_data: business });
    if (error) throw new ToolError(error.message);
    return {
        slug: data.slug,
        link: data.link,
        tipo: data.tipo,
        accesos: { portal: 'https://turnitoslr.com/portal', email: data.email, password: data.password },
        nota: 'Simulación, estado trial y seña del 30 %. El dueño cambia la contraseña en el primer ingreso.'
    };
}

async function subirMedia(db: SupabaseClient, args: Json) {
    const files = Array.isArray(args?.archivos) ? args.archivos : [];
    if (!files.length) throw new ToolError('Pasá al menos un archivo en "archivos"');
    for (const f of files) {
        if (!DESTINOS.includes(f?.destino)) throw new ToolError(`destino tiene que ser ${DESTINOS.join(', ')}`);
        if (['destacada', 'servicio'].includes(f.destino) && !String(f.ref ?? '').trim()) {
            throw new ToolError(`Para destino "${f.destino}" falta "ref"`);
        }
    }
    const b = await getSimulatedBusiness(db, args.slug, `${PUBLIC_FIELDS}, gallery_images, gallery_highlights`);
    const storage = db.storage.from(BUCKET);

    const results = [];
    for (const [i, file] of files.entries()) {
        try {
            // Que el servicio exista antes de subir, así no queda un archivo suelto
            if (file.destino === 'servicio') await findService(db, b, file.ref);
            const { bytes, type } = await loadFile(file);
            const path = `simulacion/${b.slug}/${await fileName(file, bytes, type)}`;
            const { error } = await storage.upload(path, bytes, { contentType: type, upsert: true, cacheControl: '3600' });
            if (error) throw new ToolError(`No se pudo subir: ${error.message}`);
            const url = storage.getPublicUrl(path).data.publicUrl;
            const asignado = await assignMedia(db, b, file, url);
            results.push({ archivo: i + 1, ok: true, url, asignado });
        } catch (err) {
            results.push({ archivo: i + 1, ok: false, error: err instanceof Error ? err.message : String(err) });
        }
    }
    return { slug: b.slug, link: `https://${b.slug}.turnitoslr.com`, resultados: results };
}

async function actualizarNegocio(db: SupabaseClient, args: Json) {
    const c = args?.cambios;
    if (!c || typeof c !== 'object' || Array.isArray(c)) throw new ToolError('Pasá los cambios como objeto en "cambios"');
    const b = await getSimulatedBusiness(db, args.slug);

    const data: Json = {};
    const errors: string[] = [];
    const known = new Set(['portada', 'portada_foco', 'color', 'tema', 'colores', 'bio', 'descripcion', 'links', 'horarios', 'horarios_ingreso']);
    const unknown = Object.keys(c).filter(k => !known.has(k));
    if (unknown.length) errors.push(`campos no soportados: ${unknown.join(', ')}`);

    if (c.portada != null) {
        if (!/^https:\/\//i.test(String(c.portada))) errors.push('"portada" tiene que ser una URL https (para subir un archivo usá subir_media)');
        else data.portada = String(c.portada);
    }
    if (c.portada_foco != null) {
        const focus = parseBannerFocus(c.portada_foco);
        if (typeof focus === 'string') errors.push(focus);
        else data.portada_foco = focus;
    }
    const color = c.colores?.color ?? c.color;
    const tema = c.colores?.tema ?? c.tema;
    if (color != null) {
        if (!/^#[0-9a-f]{6}$/i.test(String(color))) errors.push('"color" va como #RRGGBB');
        else data.color = String(color).toUpperCase();
    }
    if (tema != null) {
        if (!['light', 'dark'].includes(String(tema))) errors.push('"tema" es light o dark');
        else data.tema = String(tema);
    }
    const bio = c.bio ?? c.descripcion;
    if (bio != null) data.descripcion = String(bio);
    if (c.links != null) {
        if (!Array.isArray(c.links) || c.links.some((l: Json) => !l?.titulo || !/^https?:\/\//i.test(String(l?.url ?? '')))) {
            errors.push('"links" va como [{ "titulo", "url" (http/https), "subtitulo", "icono", "destacado", "color" }]');
        } else data.links = c.links;
    }
    if (c.horarios != null) {
        if (typeof c.horarios !== 'object' || Array.isArray(c.horarios)) errors.push('"horarios" tiene que ser un objeto (formato de businesses.hours)');
        else data.horarios = c.horarios;
    }
    if (c.horarios_ingreso != null) {
        if (b.type !== 'alquiler') errors.push('"horarios_ingreso" es solo para alquileres');
        const schedule = parseStartTimes(c.horarios_ingreso);
        if (typeof schedule === 'string') errors.push(schedule);
        else data.horarios_ingreso = schedule;
    }

    if (errors.length) throw new ToolError(`No se cambió nada:\n- ${errors.join('\n- ')}`);
    if (!Object.keys(data).length) throw new ToolError('No hay cambios para aplicar');
    await applyProfile(db, b.id, data);
    return { slug: b.slug, link: `https://${b.slug}.turnitoslr.com`, actualizado: Object.keys(data) };
}

async function borrarDemo(db: SupabaseClient, args: Json) {
    const b = await getSimulatedBusiness(db, args?.slug);
    const { error } = await db.rpc('admin_delete_simulated_business', { p_slug: b.slug });
    if (error) throw new ToolError(error.message);

    // Archivos de simulacion/<slug>/
    const storage = db.storage.from(BUCKET);
    const prefix = `simulacion/${b.slug}`;
    let removed = 0;
    for (let round = 0; round < 20; round++) {
        const { data: files, error: listError } = await storage.list(prefix, { limit: 100 });
        if (listError || !files?.length) break;
        const paths = files.filter(f => f.id).map(f => `${prefix}/${f.name}`);
        if (!paths.length) break;
        const { error: removeError } = await storage.remove(paths);
        if (removeError) break;
        removed += paths.length;
    }
    return { borrado: b.slug, nombre: b.name, archivos_borrados: removed };
}

async function buscarNegocio(db: SupabaseClient, args: Json) {
    const text = String(args?.texto ?? '').trim();
    if (!text) throw new ToolError('Pasá un slug o parte del nombre en "texto"');
    const slug = slugify(text.replace(/^https?:\/\//i, '').replace(/\.turnitoslr\.com.*$/i, ''));
    const pattern = `%${text.replace(/[\\%_]/g, m => `\\${m}`)}%`;
    const [bySlug, byName] = await Promise.all([
        db.from('businesses').select(PUBLIC_FIELDS).eq('slug', slug).maybeSingle(),
        db.from('businesses').select(PUBLIC_FIELDS).ilike('name', pattern).order('created_at', { ascending: false }).limit(20)
    ]);
    if (bySlug.error || byName.error) throw new ToolError((bySlug.error ?? byName.error)!.message);
    const found: Json[] = [bySlug.data, ...(byName.data ?? [])].filter(Boolean);
    const unique = found.filter((b, i) => found.findIndex(x => x.id === b.id) === i);
    return { resultados: unique.map(summary) };
}

const HANDLERS: Record<string, (db: SupabaseClient, args: Json) => Promise<unknown>> = {
    crear_negocio_demo: crearNegocioDemo,
    subir_media: subirMedia,
    actualizar_negocio: actualizarNegocio,
    borrar_demo: borrarDemo,
    buscar_negocio: buscarNegocio
};

// --- JSON-RPC / MCP --------------------------------------------------------------

function rpcResult(id: Json, result: Json) {
    return { jsonrpc: '2.0', id, result };
}

function rpcError(id: Json, code: number, message: string) {
    return { jsonrpc: '2.0', id: id ?? null, error: { code, message } };
}

async function handleMessage(db: SupabaseClient, msg: Json): Promise<Json | null> {
    if (!msg || msg.jsonrpc !== '2.0' || typeof msg.method !== 'string') {
        return msg && 'id' in msg && !('method' in msg) ? null : rpcError(msg?.id, -32600, 'Invalid Request');
    }
    const isNotification = !('id' in msg);
    if (isNotification) return null;

    switch (msg.method) {
        case 'initialize': {
            const requested = msg.params?.protocolVersion;
            return rpcResult(msg.id, {
                protocolVersion: PROTOCOL_VERSIONS.includes(requested) ? requested : PROTOCOL_VERSIONS[0],
                capabilities: { tools: { listChanged: false } },
                serverInfo: SERVER_INFO,
                instructions: 'Herramientas para armar demos de TurnitosLR. Los negocios creados acá son de simulación (trial, seña 30 %). '
                    + 'Solo se pueden modificar o borrar negocios de simulación.'
            });
        }
        case 'ping':
            return rpcResult(msg.id, {});
        case 'tools/list':
            return rpcResult(msg.id, { tools: TOOLS });
        case 'tools/call': {
            const handler = HANDLERS[msg.params?.name];
            if (!handler) return rpcError(msg.id, -32602, `Herramienta desconocida: ${msg.params?.name}`);
            try {
                const out = await handler(db, msg.params?.arguments ?? {});
                return rpcResult(msg.id, { content: [{ type: 'text', text: JSON.stringify(out, null, 2) }], structuredContent: out });
            } catch (err) {
                const text = err instanceof ToolError ? err.message : 'Error interno';
                if (!(err instanceof ToolError)) console.error('mcp tool error', msg.params?.name, err);
                return rpcResult(msg.id, { content: [{ type: 'text', text }], isError: true });
            }
        }
        default:
            return rpcError(msg.id, -32601, `Método no soportado: ${msg.method}`);
    }
}

function jsonResponse(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

Deno.serve(async (req) => {
    const expected = Deno.env.get('MCP_SECRET') ?? '';
    if (expected.length < 24) return jsonResponse({ error: 'Servidor sin configurar' }, 503);
    if (!(await secretMatches(secretFromRequest(req), expected))) return jsonResponse({ error: 'No autorizado' }, 401);

    // Sin sesión ni stream del servidor: solo POST
    if (req.method !== 'POST') {
        return new Response(null, { status: 405, headers: { Allow: 'POST' } });
    }

    let body: Json;
    try {
        body = await req.json();
    } catch {
        return jsonResponse(rpcError(null, -32700, 'Parse error'), 400);
    }

    const db = createClient(Deno.env.get('SUPABASE_URL')!, getSecretKey(), {
        auth: { persistSession: false, autoRefreshToken: false }
    });

    const batch = Array.isArray(body);
    const messages: Json[] = batch ? body : [body];
    const responses = (await Promise.all(messages.map(m => handleMessage(db, m)))).filter(Boolean);
    if (!responses.length) return new Response(null, { status: 202 });
    return jsonResponse(batch ? responses : responses[0]);
});
