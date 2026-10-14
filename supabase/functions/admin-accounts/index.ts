// admin-accounts: crea cuentas de negocio y restablece contraseñas desde el servidor,
// sin cambiar la sesión de quien lo pide. Solo superadmins o el vendedor del negocio.
//
// POST { action: 'create_account', email, password }           -> { user_id }
// POST { action: 'create_business', business: {...} }          -> { business, credentials }
// POST { action: 'reset_password', business_id }              -> { email, tempPassword }
import { createClient } from 'npm:@supabase/supabase-js@2';

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

    let body: Record<string, unknown>;
    try {
        body = await req.json();
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

    return json({ error: 'Acción desconocida' }, 400);
});
