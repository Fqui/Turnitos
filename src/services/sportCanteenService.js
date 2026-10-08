import { supabase } from './supabaseClient';
import serviceAdapter from './serviceAdapter';

const DEFAULT_SPORT_PRODUCTS = [
    { id: 'prod-1', name: 'Gatorade 500ml', category: 'Bebidas', sale_price: 2500, cost_price: 1600, current_stock: 24, min_stock_alert: 6, is_active: true },
    { id: 'prod-2', name: 'Agua Mineral 500ml', category: 'Bebidas', sale_price: 1500, cost_price: 800, current_stock: 30, min_stock_alert: 10, is_active: true },
    { id: 'prod-3', name: 'Cerveza Lata 473ml', category: 'Bebidas', sale_price: 2800, cost_price: 1700, current_stock: 18, min_stock_alert: 6, is_active: true },
    { id: 'prod-4', name: 'Tubo Pelotas Pádel (x3)', category: 'Equipamiento', sale_price: 12000, cost_price: 8500, current_stock: 8, min_stock_alert: 2, is_active: true },
    { id: 'prod-5', name: 'Cubre Grip', category: 'Equipamiento', sale_price: 3000, cost_price: 1500, current_stock: 15, min_stock_alert: 4, is_active: true },
    { id: 'prod-6', name: 'Alquiler Paleta Pádel', category: 'Alquileres', sale_price: 4000, cost_price: 0, current_stock: 6, min_stock_alert: 1, is_active: true }
];

const getStorageKey = (businessId, key) => `turnitos_sport_${key}_${businessId}`;

export const sportCanteenService = {
    // ==========================================
    // 1. GESTIÓN DE PRODUCTOS / STOCK
    // ==========================================

    async getProducts(businessId, currentMetadata = null) {
        if (!businessId) return [];

        // 1. Buscar en localStorage primero para respuesta instantánea
        try {
            const cached = localStorage.getItem(getStorageKey(businessId, 'products'));
            if (cached) {
                const parsed = JSON.parse(cached);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    return parsed;
                }
            }
        } catch (e) {}

        // 2. Intentar desde Supabase
        try {
            const { data, error } = await supabase
                .from('sport_canteen_products')
                .select('*')
                .eq('business_id', businessId)
                .order('name', { ascending: true });

            if (!error && data && data.length > 0) {
                try {
                    localStorage.setItem(getStorageKey(businessId, 'products'), JSON.stringify(data));
                } catch (e) {}
                return data;
            }
        } catch (e) {}

        // 3. Fallback a metadata
        const metadataProducts = currentMetadata?.sport_canteen_products;
        if (Array.isArray(metadataProducts) && metadataProducts.length > 0) {
            try {
                localStorage.setItem(getStorageKey(businessId, 'products'), JSON.stringify(metadataProducts));
            } catch (e) {}
            return metadataProducts;
        }

        // 4. Plantilla por defecto inicial
        const initial = DEFAULT_SPORT_PRODUCTS.map(p => ({
            ...p,
            id: `prod-${p.id}-${businessId.toString().slice(-4)}`,
            business_id: businessId
        }));
        try {
            localStorage.setItem(getStorageKey(businessId, 'products'), JSON.stringify(initial));
        } catch (e) {}
        return initial;
    },

    async saveProduct(businessId, product, currentMetadata = null) {
        const prodData = {
            id: product.id || `prod-${Date.now()}`,
            business_id: businessId,
            name: product.name?.trim(),
            category: product.category || 'Bebidas',
            sale_price: Number(product.sale_price) || 0,
            cost_price: Number(product.cost_price) || 0,
            current_stock: Math.max(0, parseInt(product.current_stock, 10) || 0),
            min_stock_alert: Math.max(0, parseInt(product.min_stock_alert, 10) || 5),
            is_active: product.is_active !== false,
            image_url: product.image_url || null,
            updated_at: new Date().toISOString()
        };

        // Guardar en localStorage de inmediato
        const existingList = await this.getProducts(businessId, currentMetadata);
        const exists = existingList.some(p => String(p.id) === String(prodData.id));
        const updatedList = exists
            ? existingList.map(p => String(p.id) === String(prodData.id) ? prodData : p)
            : [...existingList, prodData];

        try {
            localStorage.setItem(getStorageKey(businessId, 'products'), JSON.stringify(updatedList));
        } catch (e) {}

        // Intentar guardar en Supabase si tabla existe
        try {
            if (product.id && !String(product.id).startsWith('prod-')) {
                await supabase.from('sport_canteen_products').update(prodData).eq('id', product.id);
            } else {
                await supabase.from('sport_canteen_products').insert([prodData]);
            }
        } catch (e) {}

        // Persistir en metadata como respaldo
        try {
            const newMeta = { ...(currentMetadata || {}), sport_canteen_products: updatedList };
            await serviceAdapter.patchBusiness(businessId, { metadata: newMeta });
        } catch (e) {}

        return prodData;
    },

    async adjustStock(businessId, productId, delta, currentMetadata = null) {
        const existingList = await this.getProducts(businessId, currentMetadata);
        let targetProduct = null;

        const updatedList = existingList.map(p => {
            if (String(p.id) === String(productId)) {
                targetProduct = { ...p, current_stock: Math.max(0, (p.current_stock || 0) + delta) };
                return targetProduct;
            }
            return p;
        });

        // Guardar en localStorage inmediatamente
        try {
            localStorage.setItem(getStorageKey(businessId, 'products'), JSON.stringify(updatedList));
        } catch (e) {}

        // Guardar en Supabase si tabla existe
        try {
            if (productId && !String(productId).startsWith('prod-')) {
                await supabase
                    .from('sport_canteen_products')
                    .update({ current_stock: targetProduct?.current_stock, updated_at: new Date().toISOString() })
                    .eq('id', productId);
            }
        } catch (e) {}

        // Persistir en metadata
        try {
            const newMeta = { ...(currentMetadata || {}), sport_canteen_products: updatedList };
            await serviceAdapter.patchBusiness(businessId, { metadata: newMeta });
        } catch (e) {}

        return targetProduct;
    },

    async deleteProduct(businessId, productId, currentMetadata = null) {
        const existingList = await this.getProducts(businessId, currentMetadata);
        const updatedList = existingList.filter(p => String(p.id) !== String(productId));

        try {
            localStorage.setItem(getStorageKey(businessId, 'products'), JSON.stringify(updatedList));
        } catch (e) {}

        try {
            if (productId && !String(productId).startsWith('prod-')) {
                await supabase.from('sport_canteen_products').delete().eq('id', productId);
            }
        } catch (e) {}

        try {
            const newMeta = { ...(currentMetadata || {}), sport_canteen_products: updatedList };
            await serviceAdapter.patchBusiness(businessId, { metadata: newMeta });
        } catch (e) {}

        return true;
    },

    // ==========================================
    // 2. GESTIÓN DE CAJA DIARIA & ARQUEO
    // ==========================================

    async getCurrentCashSession(businessId, currentMetadata = null) {
        if (!businessId) return null;

        // 1. Revisar localStorage primero (persistencia de sesión local segura)
        try {
            const cached = localStorage.getItem(getStorageKey(businessId, 'active_session'));
            if (cached) {
                const parsed = JSON.parse(cached);
                if (parsed && parsed.status === 'open') {
                    return parsed;
                }
            }
        } catch (e) {}

        // 2. Revisar Supabase
        try {
            const { data, error } = await supabase
                .from('sport_cash_registers')
                .select('*')
                .eq('business_id', businessId)
                .eq('status', 'open')
                .order('opened_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (!error && data) {
                const { data: movs } = await supabase
                    .from('sport_cash_movements')
                    .select('*')
                    .eq('cash_register_id', data.id)
                    .order('created_at', { ascending: false });

                const fullSession = { ...data, movements: movs || [] };
                try {
                    localStorage.setItem(getStorageKey(businessId, 'active_session'), JSON.stringify(fullSession));
                } catch (e) {}
                return fullSession;
            }
        } catch (e) {}

        // 3. Revisar metadata
        const sessionMeta = currentMetadata?.active_cash_register;
        if (sessionMeta && sessionMeta.status === 'open') {
            try {
                localStorage.setItem(getStorageKey(businessId, 'active_session'), JSON.stringify(sessionMeta));
            } catch (e) {}
            return sessionMeta;
        }

        return null;
    },

    async openCashSession(businessId, { initialCash = 0, openedBy = 'Encargado' }, currentMetadata = null) {
        const sessionPayload = {
            id: `session-${Date.now()}`,
            business_id: businessId,
            opened_at: new Date().toISOString(),
            opened_by: openedBy || 'Encargado',
            initial_cash: Number(initialCash) || 0,
            expected_cash: Number(initialCash) || 0,
            expected_transfers: 0,
            status: 'open',
            notes: '',
            difference: 0,
            movements: []
        };

        // Guardar en localStorage de inmediato
        try {
            localStorage.setItem(getStorageKey(businessId, 'active_session'), JSON.stringify(sessionPayload));
        } catch (e) {}

        // Intentar guardar en Supabase
        try {
            const { data, error } = await supabase
                .from('sport_cash_registers')
                .insert([{
                    business_id: businessId,
                    opened_at: sessionPayload.opened_at,
                    opened_by: sessionPayload.opened_by,
                    initial_cash: sessionPayload.initial_cash,
                    expected_cash: sessionPayload.expected_cash,
                    expected_transfers: 0,
                    status: 'open'
                }])
                .select()
                .single();

            if (!error && data) {
                sessionPayload.id = data.id;
                try {
                    localStorage.setItem(getStorageKey(businessId, 'active_session'), JSON.stringify(sessionPayload));
                } catch (e) {}
            }
        } catch (e) {}

        // Persistir en metadata
        try {
            const newMeta = { ...(currentMetadata || {}), active_cash_register: sessionPayload };
            await serviceAdapter.patchBusiness(businessId, { metadata: newMeta });
        } catch (e) {}

        return sessionPayload;
    },

    async registerMovement(businessId, {
        sessionId,
        type, // 'canteen_sale', 'booking_income', 'manual_income', 'manual_expense'
        paymentMethod = 'cash', // 'cash', 'transfer'
        amount = 0,
        description = '',
        itemsDetail = [],
        bookingId = null
    }, currentMetadata = null) {
        // Obtener sesión activa de forma segura
        let activeSession = await this.getCurrentCashSession(businessId, currentMetadata);
        if (!activeSession) {
            // Si por alguna razón no existía, abrir una sesión por defecto
            activeSession = await this.openCashSession(businessId, { initialCash: 0, openedBy: 'Turno' }, currentMetadata);
        }

        const movementData = {
            id: `mov-${Date.now()}`,
            cash_register_id: activeSession.id,
            business_id: businessId,
            type,
            payment_method: paymentMethod,
            amount: Number(amount) || 0,
            description,
            items_detail: itemsDetail || [],
            booking_id: bookingId,
            created_at: new Date().toISOString()
        };

        // Descontar stock de artículos vendidos
        if (itemsDetail && itemsDetail.length > 0) {
            for (const item of itemsDetail) {
                if (item.productId) {
                    await this.adjustStock(businessId, item.productId, -(item.quantity || 1), currentMetadata);
                }
            }
        }

        // Agregar movimiento a la sesión y recalcular totales
        const updatedMovements = [movementData, ...(activeSession.movements || [])];
        let expCash = Number(activeSession.initial_cash || 0);
        let expTransfers = 0;

        updatedMovements.forEach(m => {
            const val = Number(m.amount) || 0;
            if (m.payment_method === 'cash') {
                if (m.type === 'manual_expense') expCash -= val;
                else expCash += val;
            } else if (m.payment_method === 'transfer') {
                if (m.type === 'manual_expense') expTransfers -= val;
                else expTransfers += val;
            }
        });

        const updatedSession = {
            ...activeSession,
            expected_cash: Math.max(0, expCash),
            expected_transfers: Math.max(0, expTransfers),
            movements: updatedMovements
        };

        // 1. Guardar en localStorage inmediatamente (Garantía de no pérdida)
        try {
            localStorage.setItem(getStorageKey(businessId, 'active_session'), JSON.stringify(updatedSession));
        } catch (e) {}

        // 2. Intentar guardar en Supabase si tabla existe
        try {
            if (activeSession.id && !String(activeSession.id).startsWith('session-')) {
                await supabase.from('sport_cash_movements').insert([movementData]);
                await supabase.from('sport_cash_registers').update({
                    expected_cash: updatedSession.expected_cash,
                    expected_transfers: updatedSession.expected_transfers
                }).eq('id', activeSession.id);
            }
        } catch (e) {}

        // 3. Persistir en metadata
        try {
            const newMeta = { ...(currentMetadata || {}), active_cash_register: updatedSession };
            await serviceAdapter.patchBusiness(businessId, { metadata: newMeta });
        } catch (e) {}

        return movementData;
    },

    async closeCashSession(businessId, sessionId, {
        finalCashCounted = 0,
        notes = '',
        closedBy = 'Encargado',
        expectedCash = 0,
        expectedTransfers = 0
    }, currentMetadata = null) {
        const active = await this.getCurrentCashSession(businessId, currentMetadata);
        const diff = Number(finalCashCounted) - Number(expectedCash);

        const closedSession = {
            ...(active || {}),
            status: 'closed',
            closed_at: new Date().toISOString(),
            closed_by: closedBy,
            final_cash_counted: Number(finalCashCounted),
            expected_cash: Number(expectedCash),
            expected_transfers: Number(expectedTransfers),
            difference: diff,
            notes: notes || ''
        };

        // 1. Actualizar historial en localStorage y quitar sesión activa
        try {
            localStorage.removeItem(getStorageKey(businessId, 'active_session'));
            const historyKey = getStorageKey(businessId, 'history');
            const prevHistory = JSON.parse(localStorage.getItem(historyKey) || '[]');
            localStorage.setItem(historyKey, JSON.stringify([closedSession, ...prevHistory].slice(0, 50)));
        } catch (e) {}

        // 2. Supabase
        try {
            if (sessionId && !String(sessionId).startsWith('session-')) {
                await supabase
                    .from('sport_cash_registers')
                    .update({
                        status: 'closed',
                        closed_at: closedSession.closed_at,
                        closed_by: closedSession.closed_by,
                        final_cash_counted: closedSession.final_cash_counted,
                        difference: closedSession.difference,
                        notes: closedSession.notes
                    })
                    .eq('id', sessionId);
            }
        } catch (e) {}

        // 3. Metadata
        try {
            const newMeta = {
                ...(currentMetadata || {}),
                active_cash_register: null,
                cash_register_history: [closedSession, ...(currentMetadata?.cash_register_history || [])].slice(0, 30)
            };
            await serviceAdapter.patchBusiness(businessId, { metadata: newMeta });
        } catch (e) {}

        return closedSession;
    },

    // ==========================================
    // 3. GENERADOR DE REPORTE WHATSAPP
    // ==========================================

    generateWhatsAppReport(business, session, movements = []) {
        if (!session) return '';

        const openTime = session.opened_at ? new Date(session.opened_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) : '--:--';
        const closeTime = session.closed_at ? new Date(session.closed_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) : new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
        const dateStr = session.opened_at ? new Date(session.opened_at).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : new Date().toLocaleDateString('es-AR');

        let totalTurnosCash = 0;
        let totalTurnosTrans = 0;
        let totalItemsCash = 0;
        let totalItemsTrans = 0;
        let totalGastos = 0;
        const itemsVendidos = {};

        movements.forEach(m => {
            const amt = Number(m.amount) || 0;
            if (m.type === 'booking_income') {
                if (m.payment_method === 'cash') totalTurnosCash += amt;
                else totalTurnosTrans += amt;
            } else if (m.type === 'canteen_sale') {
                if (m.payment_method === 'cash') totalItemsCash += amt;
                else totalItemsTrans += amt;

                if (Array.isArray(m.items_detail)) {
                    m.items_detail.forEach(it => {
                        const q = Number(it.quantity) || 1;
                        itemsVendidos[it.name] = (itemsVendidos[it.name] || 0) + q;
                    });
                }
            } else if (m.type === 'manual_expense') {
                totalGastos += amt;
            }
        });

        const totalCashEsperado = Number(session.expected_cash || 0);
        const totalCashContado = Number(session.final_cash_counted || session.expected_cash || 0);
        const diff = totalCashContado - totalCashEsperado;
        const totalTransfers = Number(session.expected_transfers || (totalTurnosTrans + totalItemsTrans));

        const itemsDetailLines = Object.entries(itemsVendidos)
            .map(([item, qty]) => `  • ${item}: ${qty} un.`)
            .join('\n');

        return `📊 *CIERRE DE CAJA DIARIA - ${business?.name || 'CANCHAS'}*
📅 *Fecha:* ${dateStr} (${openTime} a ${closeTime})
👤 *Turno:* ${session.closed_by || session.opened_by || 'Encargado'}

💵 *EFECTIVO EN CAJA:*
• Fondo inicial (cambio): $${Number(session.initial_cash || 0).toLocaleString('es-AR')}
• Turnos en efectivo: $${totalTurnosCash.toLocaleString('es-AR')}
• Artículos en efectivo: $${totalItemsCash.toLocaleString('es-AR')}
• Gastos/Retiros del turno: -$${totalGastos.toLocaleString('es-AR')}
--------------------------------
👉 *Efectivo esperado:* $${totalCashEsperado.toLocaleString('es-AR')}
👉 *Efectivo contado:* $${totalCashContado.toLocaleString('es-AR')}
${diff === 0 ? '✅ *Caja cuadra perfecta ($0)*' : diff > 0 ? `⚠️ *Sobrante:* +$${diff.toLocaleString('es-AR')}` : `🚨 *Faltante:* -$${Math.abs(diff).toLocaleString('es-AR')}`}

📲 *TRANSFERENCIAS (Alias / MP):*
• Turnos por transferencia: $${totalTurnosTrans.toLocaleString('es-AR')}
• Artículos por transferencia: $${totalItemsTrans.toLocaleString('es-AR')}
👉 *Total Transferencias:* $${totalTransfers.toLocaleString('es-AR')}

🛍️ *VENTAS DE ARTÍCULOS / MOSTRADOR:*
Total artículos: $${(totalItemsCash + totalItemsTrans).toLocaleString('es-AR')}
${itemsDetailLines ? `${itemsDetailLines}\n` : 'Sin detalle de ítems\n'}
${session.notes ? `📝 *Notas del turno:* ${session.notes}\n` : ''}
_Generado automáticamente desde Turnitos_`;
    }
};

export default sportCanteenService;
