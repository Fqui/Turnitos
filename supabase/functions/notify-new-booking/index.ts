// Sends a Web Push notice to every device of a business when a customer books.
// Called only by the notify_new_booking_push trigger (pg_net) with the shared
// secret from Vault in the x-webhook-secret header; deploy with verify_jwt = false.
import webpush from 'npm:web-push@3.6.7';
import { createClient } from 'npm:@supabase/supabase-js@2';

const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } }
);

type PushConfig = {
    webhook_secret: string | null;
    vapid_public_key: string | null;
    vapid_private_key: string | null;
    vapid_subject: string | null;
};

let cachedConfig: PushConfig | null = null;

const getConfig = async (): Promise<PushConfig | null> => {
    if (cachedConfig) return cachedConfig;
    const { data, error } = await supabase.rpc('get_push_config');
    if (error) {
        console.error('get_push_config error:', error.message);
        return null;
    }
    const row = Array.isArray(data) ? data[0] : data;
    if (!row?.webhook_secret || !row?.vapid_private_key || !row?.vapid_public_key) return null;
    cachedConfig = row;
    webpush.setVapidDetails(row.vapid_subject || 'mailto:fernandoquintero1994@gmail.com', row.vapid_public_key, row.vapid_private_key);
    return cachedConfig;
};

const safeEqual = (a: string, b: string) => {
    if (a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    return diff === 0;
};

const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const titleCase = (value: string) =>
    value.toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase()).trim();

const getResourceName = async (booking: Record<string, string | null>) => {
    if (booking.resource_id && UUID_RE.test(booking.resource_id)) {
        const { data } = await supabase.from('resources').select('name').eq('id', booking.resource_id).maybeSingle();
        if (data?.name) return data.name;
    }
    if (booking.court_id) {
        const { data } = await supabase.from('courts').select('name').eq('id', booking.court_id).maybeSingle();
        if (data?.name) return data.name;
    }
    if (booking.service_id) {
        const { data } = await supabase.from('services').select('name').eq('id', booking.service_id).maybeSingle();
        if (data?.name) return data.name;
    }
    return null;
};

Deno.serve(async (req) => {
    if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

    const config = await getConfig();
    if (!config) return json({ error: 'Push not configured' }, 500);

    const secret = req.headers.get('x-webhook-secret') || '';
    if (!safeEqual(secret, config.webhook_secret!)) return json({ error: 'Unauthorized' }, 401);

    let bookingId: string | undefined;
    try {
        ({ booking_id: bookingId } = await req.json());
    } catch {
        return json({ error: 'Invalid body' }, 400);
    }
    if (!bookingId || !UUID_RE.test(bookingId)) return json({ error: 'Invalid booking_id' }, 400);

    const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .select('id, business_id, date, time, customer_name, status, resource_id, court_id, service_id')
        .eq('id', bookingId)
        .maybeSingle();
    if (bookingError || !booking) return json({ error: 'Booking not found' }, 404);
    if (booking.status === 'blocked') return json({ sent: 0, skipped: 'blocked' });

    const { data: subscriptions } = await supabase
        .from('push_subscriptions')
        .select('id, endpoint, p256dh, auth')
        .eq('business_id', booking.business_id);
    if (!subscriptions?.length) return json({ sent: 0 });

    const resourceName = await getResourceName(booking);
    const [, month, day] = String(booking.date || '').split('-');
    const dayLabel = day && month ? `${day}/${month}` : String(booking.date || '');
    const timeLabel = String(booking.time || '').slice(0, 5);
    const customer = titleCase(String(booking.customer_name || '')) || 'Un cliente';

    const payload = JSON.stringify({
        title: resourceName ? `Nueva reserva · ${resourceName}` : 'Nueva reserva',
        body: timeLabel ? `${customer} · ${dayLabel} a las ${timeLabel}` : `${customer} · ${dayLabel}`,
        tag: `booking-${booking.id}`,
        bookingId: booking.id,
        url: `/portal?booking=${booking.id}`
    });

    let sent = 0;
    const expired: string[] = [];
    await Promise.all(subscriptions.map(async (sub) => {
        try {
            await webpush.sendNotification(
                { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
                payload,
                { TTL: 60 * 60 * 6, urgency: 'high' }
            );
            sent++;
        } catch (err) {
            const statusCode = (err as { statusCode?: number })?.statusCode;
            if (statusCode === 404 || statusCode === 410) {
                expired.push(sub.id);
            } else {
                console.error('push error', statusCode, (err as Error)?.message);
            }
        }
    }));

    if (expired.length) {
        await supabase.from('push_subscriptions').delete().in('id', expired);
    }

    return json({ sent, removed: expired.length });
});
