// admin-accounts: crea cuentas de negocio y restablece contraseñas desde el servidor,
// sin cambiar la sesión de quien lo pide. Solo superadmins o el vendedor del negocio.
//
// POST { action: 'create_account', email, password }           -> { user_id }
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
