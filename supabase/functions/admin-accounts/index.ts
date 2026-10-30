// admin-accounts: crea cuentas de negocio y demos, y restablece contraseñas desde el servidor,
// sin cambiar la sesión de quien lo pide. Solo superadmins o el vendedor del negocio.
//
// POST { action: 'create_account', email, password }           -> { user_id }
// POST { action: 'create_business', business: {...} }          -> { business, credentials }
// POST { action: 'reset_password', business_id }              -> { email, tempPassword }
// POST multipart { payload: '{"action":"create_demo","negocio":{...}}', 'archivo:<clave>': File }
//                                                               -> { business, credentials }
// POST { action: 'delete_demo', business_id }                  -> { deleted }
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { normalize } from '../mcp/normalize.ts';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

function json(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
}

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

function generateTempPassword(): string {
    const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lower = 'abcdefghijkmnpqrstuvwxyz';
    const nums = '23456789';
    const all = upper + lower + nums;
    const pick = (set: string) => set[crypto.getRandomValues(new Uint32Array(1))[0] % set.length];
    const chars = [pick(upper), pick(lower), pick(nums)];
    for (let i = 0; i < 9; i++) chars.push(pick(all));
    for (let i = chars.length - 1; i > 0; i--) {
        const j = crypto.getRandomValues(new Uint32Array(1))[0] % (i + 1);
        [chars[i], chars[j]] = [chars[j], chars[i]];
    }
    return chars.join('');
}

function slugify(text: string): string {
    return (text || '')
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .substring(0, 50);
}

// Top-level app routes: a business slug can't take them
const RESERVED_SLUGS = new Set([
    'admin', 'login', 'portal', 'business-portal', 'ayuda', 'negocios', 'colaboradores',
    'terminos', 'privacidad', 'calificar', 'review', 'api', 'assets'
]);

const BUCKET = 'business-images';
const MAX_DEMO_FILE_BYTES = 8 * 1024 * 1024;
const MAX_DEMO_FILES = 40;
const FILE_REF = /^archivo:([a-z0-9_-]{1,40})$/;

// Only the image formats the browser can produce after resizing
function imageType(bytes: Uint8Array): { type: string; ext: string } | null {
    if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return { type: 'image/jpeg', ext: 'jpg' };
    if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return { type: 'image/png', ext: 'png' };
    const ascii = String.fromCharCode(...bytes.slice(0, 12));
    if (ascii.startsWith('RIFF') && ascii.slice(8, 12) === 'WEBP') return { type: 'image/webp', ext: 'webp' };
    return null;
}

async function removeDemoFiles(admin: SupabaseClient, slug: string) {
    const storage = admin.storage.from(BUCKET);
    const prefix = `simulacion/${slug}`;
    for (let round = 0; round < 20; round++) {
        const { data: files, error } = await storage.list(prefix, { limit: 100 });
        if (error || !files?.length) break;
        const paths = files.filter(f => f.id).map(f => `${prefix}/${f.name}`);
        if (!paths.length) break;
        const { error: removeError } = await storage.remove(paths);
        if (removeError) break;
    }
}

function randomSuffix(): string {
    return crypto.getRandomValues(new Uint32Array(1))[0].toString(36).substring(0, 4);
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
    if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const admin = createClient(supabaseUrl, getSecretKey(), {
        auth: { persistSession: false, autoRefreshToken: false }
    });

    // Identify the caller from their session token
    const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
    if (!token) return json({ error: 'No autenticado' }, 401);
    const { data: userData, error: userError } = await admin.auth.getUser(token);
    if (userError || !userData?.user) return json({ error: 'Sesión inválida' }, 401);
    const callerId = userData.user.id;

    const { data: superAdmin } = await admin
        .from('super_admins')
        .select('id')
        .eq('auth_id', callerId)
        .eq('is_active', true)
        .maybeSingle();
    const { data: seller } = await admin
        .from('sellers')
        .select('id')
        .eq('auth_id', callerId)
        .eq('is_active', true)
        .maybeSingle();

    if (!superAdmin && !seller) return json({ error: 'No autorizado' }, 403);

    // create_demo comes as multipart (the photos travel with it); the rest as JSON
    let body: Record<string, unknown>;
    let form: FormData | null = null;
    try {
        if ((req.headers.get('Content-Type') ?? '').includes('multipart/form-data')) {
            form = await req.formData();
            body = JSON.parse(String(form.get('payload') ?? '{}'));
        } else {
            body = await req.json();
        }
    } catch {
        return json({ error: 'Cuerpo inválido' }, 400);
    }

    if (body.action === 'create_account') {
        const email = String(body.email ?? '').trim().toLowerCase();
        const password = String(body.password ?? '');
        if (!email || password.length < 6) {
            return json({ error: 'Email y contraseña (mínimo 6 caracteres) son obligatorios' }, 400);
        }

        const { data, error } = await admin.auth.admin.createUser({
            email,
            password,
            email_confirm: true
        });
        if (error) return json({ error: error.message }, 400);
        return json({ user_id: data.user.id });
    }

    if (body.action === 'create_business') {
        const input = (body.business ?? {}) as Record<string, unknown>;
        const name = String(input.name ?? '').trim();
        if (!name) return json({ error: 'El nombre del negocio es obligatorio' }, 400);
        if (!input.category_id) return json({ error: 'Elegí una categoría' }, 400);

        // A seller can only create businesses for themselves
        const sellerId = superAdmin ? (input.seller_id ? String(input.seller_id) : null) : seller!.id;

        // Unique slug (the public URL) and an access email derived from it
        const baseSlug = slugify(String(input.slug ?? '')) || slugify(name) || 'negocio';
        let slug = RESERVED_SLUGS.has(baseSlug) ? `${baseSlug}-${randomSuffix()}` : baseSlug;
        for (let attempt = 0; attempt < 5; attempt++) {
            const { data: taken } = await admin.from('businesses').select('id').eq('slug', slug).maybeSingle();
            if (!taken) break;
            slug = `${baseSlug}-${randomSuffix()}`;
        }

        let email = `${slug}@turnitoslr.com`;
        const { data: emailTaken } = await admin.from('businesses').select('id').eq('email', email).maybeSingle();
        if (emailTaken) email = `${slug}-${randomSuffix()}@turnitoslr.com`;

        const password = generateTempPassword();
        let { data: account, error: accountError } = await admin.auth.admin.createUser({
            email,
            password,
            email_confirm: true
        });
        // The email may belong to an old login account with no business left: use a variant
        if (accountError && /already|registered|exists/i.test(accountError.message)) {
            email = `${slug}-${randomSuffix()}@turnitoslr.com`;
            ({ data: account, error: accountError } = await admin.auth.admin.createUser({
                email,
                password,
                email_confirm: true
            }));
        }
        if (accountError || !account?.user) {
            return json({ error: `No se pudo crear la cuenta: ${accountError?.message ?? 'error desconocido'}` }, 400);
        }

        // Everything else is one transaction; if it fails, remove the account so nothing is left half-made
        const { data: created, error: createError } = await admin.rpc('admin_create_business', {
            p_auth_id: account.user.id,
            p_data: {
                name,
                slug,
                email,
                category_id: input.category_id,
                subcategory_ids: Array.isArray(input.subcategory_ids) ? input.subcategory_ids : [],
                seller_id: sellerId,
                location: input.location ?? null,
                whatsapp: input.whatsapp ?? null,
                instagram: input.instagram ?? null,
                facebook: input.facebook ?? null,
                tiktok: input.tiktok ?? null,
                resources_count: Number(input.resources_count) || 1,
                subscription_status: superAdmin ? (input.subscription_status ?? 'trial') : 'trial'
            }
        });
        if (createError) {
            await admin.auth.admin.deleteUser(account.user.id);
            const duplicate = createError.code === '23505';
            return json({ error: duplicate ? 'Ya existe un negocio con ese nombre o dirección web. Probá con otro.' : createError.message }, 400);
        }

        return json({ business: created, credentials: { email, password } });
    }

    if (body.action === 'reset_password') {
        const businessId = String(body.business_id ?? '');
        const { data: business } = await admin
            .from('businesses')
            .select('id, name, email, auth_id, seller_id')
            .eq('id', businessId)
            .maybeSingle();
        if (!business) return json({ error: 'Negocio no encontrado' }, 404);

        const allowed = Boolean(superAdmin) || (seller && business.seller_id === seller.id);
        if (!allowed) return json({ error: 'No autorizado para este negocio' }, 403);
        if (!business.email) return json({ error: 'El negocio no tiene email cargado' }, 400);

        const tempPassword = generateTempPassword();
        let authId = business.auth_id as string | null;

        if (authId) {
            const { error } = await admin.auth.admin.updateUserById(authId, { password: tempPassword });
            if (error) return json({ error: error.message }, 400);
        } else {
            const { data, error } = await admin.auth.admin.createUser({
                email: business.email,
                password: tempPassword,
                email_confirm: true
            });
            if (error) return json({ error: error.message }, 400);
            authId = data.user.id;
        }

        const { error: updateError } = await admin
            .from('businesses')
            .update({ auth_id: authId, password_changed: false })
            .eq('id', business.id);
        if (updateError) return json({ error: updateError.message }, 400);

        return json({ email: business.email, tempPassword, businessName: business.name });
    }

    if (body.action === 'create_demo') {
        const raw = body.negocio as Record<string, unknown> | undefined;
        if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return json({ error: 'Faltan los datos del negocio' }, 400);

        // Photos go up after the business exists (their folder is the slug), so set them aside.
        // The demo is always a simulation in trial with a 30 % deposit; a seller can only make their own
        const { logo, portada, galeria, destacados, email: _email, estado: _estado, vendedor_id: requestedSeller, ...rest } = raw;
        const sellerId = seller ? seller.id : (requestedSeller ? String(requestedSeller) : null);
        const { business: data, errors } = normalize({ ...rest, simulacion: true, estado: 'trial', sena: 30, vendedor_id: sellerId });
        if (errors.length) return json({ error: `Revisá estos datos: ${errors.join('; ')}` }, 400);

        const files = new Map<string, File>();
        for (const [key, value] of form?.entries() ?? []) {
            const m = FILE_REF.exec(key);
            if (m && value instanceof File) files.set(m[1], value);
        }
        if (files.size > MAX_DEMO_FILES) return json({ error: `Elegí hasta ${MAX_DEMO_FILES} fotos` }, 400);
        for (const file of files.values()) {
            if (file.size > MAX_DEMO_FILE_BYTES) return json({ error: 'Alguna foto pasa los 8 MB' }, 400);
        }

        const { data: created, error: seedError } = await admin.rpc('admin_seed_business', { p_data: data });
        if (seedError) return json({ error: seedError.message }, 400);
        const slug = String(created.slug);

        try {
            const storage = admin.storage.from(BUCKET);
            const urls = new Map<string, string>();
            for (const [key, file] of files) {
                const bytes = new Uint8Array(await file.arrayBuffer());
                const kind = imageType(bytes);
                if (!kind) throw new Error('Alguna foto no es jpg, png ni webp');
                const path = `simulacion/${slug}/${key}.${kind.ext}`;
                const { error } = await storage.upload(path, bytes, { contentType: kind.type, upsert: true, cacheControl: '3600' });
                if (error) throw new Error(`No se pudo subir una foto: ${error.message}`);
                urls.set(key, storage.getPublicUrl(path).data.publicUrl);
            }
            // "archivo:<clave>" -> its public URL, keeping the framing fragment (#tf=...) if it has one;
            // anything else has to be an https URL already
            const resolve = (value: unknown): string | null => {
                const text = String(value ?? '');
                const hashAt = text.indexOf('#');
                const [ref, fragment] = hashAt === -1 ? [text, ''] : [text.slice(0, hashAt), text.slice(hashAt)];
                const m = FILE_REF.exec(ref);
                if (m) return urls.has(m[1]) ? urls.get(m[1]) + fragment : null;
                return /^https:\/\//i.test(text) ? text : null;
            };

            const media: Record<string, unknown> = {};
            if (resolve(logo)) media.logo = resolve(logo);
            if (resolve(portada)) media.portada = resolve(portada);
            if (Array.isArray(galeria)) {
                media.galeria = galeria
                    .map((g: Record<string, unknown>) => ({ ...g, url: resolve(g?.url) }))
                    .filter(g => g.url);
            }
            if (Array.isArray(destacados)) {
                media.destacados = destacados
                    .map((h: Record<string, unknown>) => ({
                        titulo: String(h?.titulo ?? '').trim() || 'Fotos',
                        fotos: (Array.isArray(h?.fotos) ? h.fotos : []).map(resolve).filter(Boolean)
                    }))
                    .filter(h => h.fotos.length);
            }
            if (Object.keys(media).length) {
                const { error } = await admin.rpc('admin_apply_business_profile', { p_business_id: created.id, p_data: media });
                if (error) throw new Error(error.message);
            }
        } catch (err) {
            // Leave nothing half-made: the demo goes away with its files
            await admin.rpc('admin_delete_simulated_business', { p_slug: slug });
            await removeDemoFiles(admin, slug);
            return json({ error: err instanceof Error ? err.message : 'No se pudo cargar la demo' }, 400);
        }

        return json({
            business: { id: created.id, name: created.nombre, slug, link: created.link, type: created.tipo },
            credentials: { email: created.email, password: created.password }
        });
    }

    if (body.action === 'delete_demo') {
        const { data: business } = await admin
            .from('businesses')
            .select('id, slug, seller_id, metadata')
            .eq('id', String(body.business_id ?? ''))
            .maybeSingle();
        if (!business) return json({ error: 'Negocio no encontrado' }, 404);

        const allowed = Boolean(superAdmin) || (seller && business.seller_id === seller.id);
        if (!allowed) return json({ error: 'No autorizado para este negocio' }, 403);
        if (business.metadata?.simulacion !== true) return json({ error: 'Solo se pueden borrar las demos' }, 400);

        const { error } = await admin.rpc('admin_delete_simulated_business', { p_slug: business.slug });
        if (error) return json({ error: error.message }, 400);
        await removeDemoFiles(admin, business.slug);
        return json({ deleted: business.slug });
    }

    return json({ error: 'Acción desconocida' }, 400);
});
