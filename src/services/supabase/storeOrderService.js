import { supabase } from '../supabaseClient';

// Store orders: the customer only creates/confirms through RPCs (no personal data);
// the business reads its own orders (RLS) and changes status through RPCs.

const withTimeout = (promise, ms) => Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))
]);

/**
 * Registers the order before opening WhatsApp. Never throws: returns null when it
 * could not be saved so the sale always continues through WhatsApp.
 */
export async function createStoreOrder({ businessId, items, discount = 0, couponLabel = null }, timeoutMs = 2500) {
    try {
        const { data, error } = await withTimeout(supabase.rpc('create_store_order', {
            p_business_id: businessId,
            p_items: items.map(item => ({
                id: String(item.id),
                qty: Number(item.qty) || 1,
                size: item.selectedSize || null
            })),
            p_discount: Math.max(0, Number(discount) || 0),
            p_coupon_label: couponLabel || null
        }), timeoutMs);
        if (error) throw error;
        const row = Array.isArray(data) ? data[0] : data;
        if (!row?.order_id) return null;
        return { id: row.order_id, number: row.order_number, token: row.confirm_token };
    } catch (e) {
        console.warn('createStoreOrder failed:', e?.message || e);
        return null;
    }
}

export async function confirmStoreOrder(order) {
    if (!order?.id || !order?.token) return false;
    try {
        const { data, error } = await supabase.rpc('confirm_store_order', { p_order_id: order.id, p_token: order.token });
        if (error) throw error;
        return Boolean(data);
    } catch (e) {
        console.warn('confirmStoreOrder failed:', e?.message || e);
        return false;
    }
}

export async function getStoreOrders(businessId) {
    const { data, error } = await supabase
        .from('store_orders')
        .select('id, order_number, items, subtotal, discount, total, coupon_label, status, confirmed_at, seen_at, created_at')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false })
        .limit(300);
    if (error) {
        const missingTable = error.code === '42P01' || error.code === 'PGRST205';
        if (!missingTable) console.error('Error fetching store orders:', error);
        return [];
    }
    return data || [];
}

export async function updateStoreOrderStatus(orderId, status) {
    const { error } = await supabase.rpc('update_store_order_status', { p_order_id: orderId, p_status: status });
    if (error) throw error;
}

export async function markStoreOrdersSeen(businessId) {
    const { error } = await supabase.rpc('mark_store_orders_seen', { p_business_id: businessId });
    if (error) console.warn('markStoreOrdersSeen failed:', error.message);
}

// Unconfirmed orders older than 2 days are hidden: the customer most likely never sent them
export const UNCONFIRMED_VISIBLE_MS = 2 * 24 * 60 * 60 * 1000;

export function isOrderVisible(order, now = Date.now()) {
    if (order.status !== 'unconfirmed') return true;
    return now - new Date(order.created_at).getTime() < UNCONFIRMED_VISIBLE_MS;
}

export function countUnseenOrders(orders) {
    return (orders || []).filter(o => o.status === 'new' && !o.seen_at).length;
}
