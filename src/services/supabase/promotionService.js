import { supabase } from '../supabaseClient';

export async function getPromotions() {
    const { data, error } = await supabase
        .from('promotions')
        .select(`
            *,
            businesses (name)
        `)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
}

export async function getPromotionById(promoId) {
    const { data, error } = await supabase
        .from('promotions')
        .select(`
            *,
            businesses (id, name, slug)
        `)
        .eq('id', promoId)
        .single();

    if (error) throw error;
    return data;
}

export async function createPromotion(promotionData) {
    const { data, error } = await supabase
        .from('promotions')
        .insert([promotionData])
        .select();

    if (error) throw error;
    return data[0];
}

export async function updatePromotion(promotionId, promotionData) {
    const { data, error } = await supabase
        .from('promotions')
        .update(promotionData)
        .eq('id', promotionId)
        .select();

    if (error) throw error;
    return data[0];
}

export async function deletePromotion(promotionId) {
    const { error } = await supabase
        .from('promotions')
        .delete()
        .eq('id', promotionId);

    if (error) throw error;
    return true;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Registra una vista o clic de una publicidad del Home.
 * Fire-and-forget: nunca tira error ni bloquea la UI.
 * En desarrollo (npm run dev) no registra para no ensuciar las métricas reales.
 */
export function trackPromotionEvent(promotionId, eventType) {
    try {
        if (!promotionId || !UUID_RE.test(String(promotionId))) return;
        if (eventType !== 'view' && eventType !== 'click') return;
        if (import.meta.env.DEV && import.meta.env.VITE_TRACK_PROMOS_IN_DEV !== 'true') {
            console.debug(`[promo] ${eventType} ${promotionId} (no se registra en desarrollo)`);
            return;
        }
        supabase
            .rpc('track_promotion_event', { p_promotion_id: promotionId, p_event_type: eventType })
            .then(({ error }) => {
                if (error) console.debug('[promo] no se pudo registrar el evento:', error.message);
            }, () => {});
    } catch {
        // nunca romper la UI por una métrica
    }
}

/**
 * Métricas por publicidad: { [promotion_id]: { views, clicks, bookings, revenue } }.
 * El superadmin ve todas; un negocio solo las suyas (lo resuelve la RPC).
 */
export async function getPromotionStats() {
    const { data, error } = await supabase.rpc('get_promotion_stats');
    if (error) throw error;
    const stats = {};
    (data || []).forEach(row => {
        stats[row.promotion_id] = {
            views: Number(row.views) || 0,
            clicks: Number(row.clicks) || 0,
            bookings: Number(row.bookings) || 0,
            revenue: Number(row.revenue) || 0
        };
    });
    return stats;
}
