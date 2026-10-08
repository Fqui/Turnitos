import { supabase } from './supabaseClient';

/**
 * Registro de Caja Diaria y Artículos y Stock (negocios de canchas).
 * Todo vive en sport_canteen_products / sport_cash_registers / sport_cash_movements,
 * protegidas por RLS (can_manage_business). Lo que toca caja + stock va por RPC.
 * Cada función lanza un Error con un mensaje en español listo para mostrar en un toast.
 */

export const PRODUCT_CATEGORIES = ['Bebidas', 'Snacks', 'Equipamiento', 'Alquileres', 'Otro'];

export const MOVEMENT_TYPE_LABELS = {
    booking_income: 'Turno',
    canteen_sale: 'Artículos',
    manual_income: 'Ingreso',
    manual_expense: 'Gasto'
};

export const PAYMENT_METHOD_LABELS = {
    cash: 'Efectivo',
    transfer: 'Transferencia'
};

// Editable template for "Cargar artículos sugeridos": stock starts at 0 so nothing looks real until the owner loads it
const SUGGESTED_PRODUCTS = [
    { name: 'Agua mineral 500 ml', category: 'Bebidas', sale_price: 1500, cost_price: 800, track_stock: true, min_stock_alert: 6 },
    { name: 'Bebida isotónica 500 ml', category: 'Bebidas', sale_price: 2500, cost_price: 1600, track_stock: true, min_stock_alert: 6 },
    { name: 'Gaseosa lata 354 ml', category: 'Bebidas', sale_price: 2000, cost_price: 1100, track_stock: true, min_stock_alert: 6 },
    { name: 'Cerveza lata 473 ml', category: 'Bebidas', sale_price: 2800, cost_price: 1700, track_stock: true, min_stock_alert: 6 },
    { name: 'Barra de cereal', category: 'Snacks', sale_price: 1200, cost_price: 600, track_stock: true, min_stock_alert: 4 },
    { name: 'Tubo de pelotas de pádel (x3)', category: 'Equipamiento', sale_price: 12000, cost_price: 8500, track_stock: true, min_stock_alert: 2 },
    { name: 'Cubre grip', category: 'Equipamiento', sale_price: 3000, cost_price: 1500, track_stock: true, min_stock_alert: 4 },
    { name: 'Alquiler de paleta', category: 'Alquileres', sale_price: 4000, cost_price: 0, track_stock: false, min_stock_alert: 0 },
    { name: 'Alquiler de pechera', category: 'Alquileres', sale_price: 1000, cost_price: 0, track_stock: false, min_stock_alert: 0 }
];

const toError = (error, fallback) => {
    if (!error) return new Error(fallback);
    if (error.code === '23505') return new Error('Ya hay una caja abierta en este negocio');
    if (error.code === '42501' || /permission|row-level/i.test(error.message || '')) {
        return new Error('No tenés permiso para administrar la caja de este negocio');
    }
    if (error.code === 'P0001' && error.message) return new Error(error.message); // RAISE EXCEPTION de las funciones
    if (/fetch|network/i.test(error.message || '')) return new Error('Sin conexión. Revisá internet y probá de nuevo');
    return new Error(fallback);
};

const money = (value) => `$${Math.round(Number(value) || 0).toLocaleString('es-AR')}`;

const monthRange = (year, month) => ({
    from: new Date(year, month, 1).toISOString(),
    to: new Date(year, month + 1, 1).toISOString()
});

/**
 * Totals of a set of movements (voided ones are ignored).
 * cash/transfers are the balance by payment method; expenses subtract.
 */
export function summarizeMovements(movements = [], initialCash = 0) {
    const totals = {
        cash: Number(initialCash) || 0,
        transfers: 0,
        bookings: 0,
        canteen: 0,
        manualIncome: 0,
        expenses: 0,
        income: 0,
        net: 0,
        count: 0,
        voidedCount: 0
    };

    movements.forEach(m => {
        if (m.voided_at) {
            totals.voidedCount += 1;
            return;
        }
        const amount = Number(m.amount) || 0;
        const sign = m.type === 'manual_expense' ? -1 : 1;
        if (m.payment_method === 'transfer') totals.transfers += sign * amount;
        else totals.cash += sign * amount;

        if (m.type === 'booking_income') totals.bookings += amount;
        else if (m.type === 'canteen_sale') totals.canteen += amount;
        else if (m.type === 'manual_income') totals.manualIncome += amount;
        else if (m.type === 'manual_expense') totals.expenses += amount;
        totals.count += 1;
    });

    totals.income = totals.bookings + totals.canteen + totals.manualIncome;
    totals.net = totals.income - totals.expenses;
    return totals;
}

const csvCell = (value) => {
    const text = value === null || value === undefined ? '' : String(value);
    return /[;"\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

// Excel en español espera coma decimal y sin separador de miles
const csvNumber = (value) => (value === null || value === undefined || value === '')
    ? ''
    : (Number(value) || 0).toFixed(2).replace('.', ',');

const csvDate = (iso) => iso ? new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';
const csvTime = (iso) => iso ? new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) : '';

export const sportCanteenService = {
    // ==========================================
    // 1. ARTÍCULOS Y STOCK
    // ==========================================

    async listProducts(businessId, { includeInactive = true } = {}) {
        if (!businessId) return [];
        let query = supabase
            .from('sport_canteen_products')
            .select('*')
            .eq('business_id', String(businessId))
            .order('category', { ascending: true })
            .order('name', { ascending: true });
        if (!includeInactive) query = query.eq('is_active', true);

        const { data, error } = await query;
        if (error) throw toError(error, 'No se pudieron cargar los artículos');
        return data || [];
    },

    async saveProduct(businessId, product) {
        const name = String(product.name || '').trim();
        if (!name) throw new Error('Ingresá el nombre del artículo');
        const trackStock = product.track_stock !== false;

        const payload = {
            name,
            category: PRODUCT_CATEGORIES.includes(product.category) ? product.category : 'Otro',
            sale_price: Math.max(0, Number(product.sale_price) || 0),
            cost_price: Math.max(0, Number(product.cost_price) || 0),
            track_stock: trackStock,
            min_stock_alert: trackStock ? Math.max(0, parseInt(product.min_stock_alert, 10) || 0) : 0,
            is_active: product.is_active !== false,
            updated_at: new Date().toISOString()
        };

        if (product.id) {
            // Stock changes on existing products go through adjust_sport_product_stock to stay atomic
            const { data, error } = await supabase
                .from('sport_canteen_products')
                .update(payload)
                .eq('id', product.id)
                .select()
                .single();
            if (error) throw toError(error, 'No se pudo guardar el artículo');
            return data;
        }

        const { data, error } = await supabase
            .from('sport_canteen_products')
            .insert([{
                ...payload,
                business_id: String(businessId),
                current_stock: trackStock ? Math.max(0, parseInt(product.current_stock, 10) || 0) : 0
            }])
            .select()
            .single();
        if (error) throw toError(error, 'No se pudo crear el artículo');
        return data;
    },

    async seedSuggestedProducts(businessId) {
        const rows = SUGGESTED_PRODUCTS.map(p => ({
            ...p,
            business_id: String(businessId),
            current_stock: 0,
            is_active: true
        }));
        const { data, error } = await supabase
            .from('sport_canteen_products')
            .insert(rows)
            .select();
        if (error) throw toError(error, 'No se pudieron cargar los artículos sugeridos');
        return data || [];
    },

    async adjustStock(productId, delta) {
        const { data, error } = await supabase.rpc('adjust_sport_product_stock', {
            p_product_id: productId,
            p_delta: Math.trunc(Number(delta) || 0)
        });
        if (error) throw toError(error, 'No se pudo actualizar el stock');
        return data;
    },

    async setProductActive(productId, isActive) {
        const { data, error } = await supabase
            .from('sport_canteen_products')
            .update({ is_active: Boolean(isActive), updated_at: new Date().toISOString() })
            .eq('id', productId)
            .select()
            .single();
        if (error) throw toError(error, 'No se pudo actualizar el artículo');
        return data;
    },

    /**
     * Removes a product. If it was ever sold it is only deactivated, so past movements keep their detail.
     * @returns {'deleted'|'archived'}
     */
    async removeProduct(product) {
        const { data: sold, error: soldError } = await supabase
            .from('sport_cash_movements')
            .select('id')
            .eq('business_id', String(product.business_id))
            // jsonb containment: .contains() with an array would be sent as a Postgres array literal
            .filter('items_detail', 'cs', JSON.stringify([{ product_id: product.id }]))
            .limit(1);
        if (soldError) throw toError(soldError, 'No se pudo dar de baja el artículo');

        if (sold && sold.length > 0) {
            await this.setProductActive(product.id, false);
            return 'archived';
        }

        const { error } = await supabase.from('sport_canteen_products').delete().eq('id', product.id);
        if (error) throw toError(error, 'No se pudo eliminar el artículo');
        return 'deleted';
    },

    // ==========================================
    // 2. CAJA
    // ==========================================

    async getOpenRegister(businessId) {
        if (!businessId) return null;
        const { data, error } = await supabase
            .from('sport_cash_registers')
            .select('*')
            .eq('business_id', String(businessId))
            .eq('status', 'open')
            .maybeSingle();
        if (error) throw toError(error, 'No se pudo cargar la caja');
        return data || null;
    },

    /**
     * Opens a register. If another device opened one first, returns that one with alreadyOpen = true.
     */
    async openRegister(businessId, { initialCash = 0, openedBy = '' } = {}) {
        const { data, error } = await supabase
            .from('sport_cash_registers')
            .insert([{
                business_id: String(businessId),
                opened_by: String(openedBy || '').trim() || 'Encargado',
                initial_cash: Math.max(0, Number(initialCash) || 0)
            }])
            .select()
            .single();

        if (error?.code === '23505') {
            const existing = await this.getOpenRegister(businessId);
            if (existing) return { register: existing, alreadyOpen: true };
        }
        if (error) throw toError(error, 'No se pudo abrir la caja');
        return { register: data, alreadyOpen: false };
    },

    async closeRegister(registerId, { cashCounted, closedBy = '', notes = '' }) {
        const { data, error } = await supabase.rpc('close_sport_cash_register', {
            p_register_id: registerId,
            p_cash_counted: Math.max(0, Number(cashCounted) || 0),
            p_closed_by: closedBy || null,
            p_notes: notes || null
        });
        if (error) throw toError(error, 'No se pudo cerrar la caja');
        return data;
    },

    async listMovements(registerId) {
        if (!registerId) return [];
        const { data, error } = await supabase
            .from('sport_cash_movements')
            .select('*')
            .eq('cash_register_id', registerId)
            .order('created_at', { ascending: false });
        if (error) throw toError(error, 'No se pudieron cargar los movimientos');
        return data || [];
    },

    /**
     * @param {Object} movement
     * @param {'booking_income'|'canteen_sale'|'manual_income'|'manual_expense'} movement.type
     * @param {'cash'|'transfer'} movement.paymentMethod
     * @param {Array<{product_id, name, quantity, unit_price}>} movement.items - stock is discounted in the database
     */
    async registerMovement(businessId, { type, paymentMethod = 'cash', amount, description = '', items = [], bookingId = null }) {
        const value = Math.round((Number(amount) || 0) * 100) / 100;
        if (value <= 0) throw new Error('El monto tiene que ser mayor a $0');

        const { data, error } = await supabase.rpc('register_sport_cash_movement', {
            p_business_id: String(businessId),
            p_type: type,
            p_payment_method: paymentMethod === 'transfer' ? 'transfer' : 'cash',
            p_amount: value,
            p_description: String(description || '').trim(),
            p_items: (items || []).map(it => ({
                product_id: it.product_id || null,
                name: it.name,
                quantity: Math.max(1, parseInt(it.quantity, 10) || 1),
                unit_price: Number(it.unit_price) || 0
            })),
            p_booking_id: bookingId || null
        });
        if (error) throw toError(error, 'No se pudo registrar el movimiento');
        return data;
    },

    async voidMovement(movementId, reason = '') {
        const { data, error } = await supabase.rpc('void_sport_cash_movement', {
            p_movement_id: movementId,
            p_reason: String(reason || '').trim()
        });
        if (error) throw toError(error, 'No se pudo anular el movimiento');
        return data;
    },

    // ==========================================
    // 3. HISTORIAL Y EXPORTACIÓN
    // ==========================================

    async listClosedRegisters(businessId, { from, to } = {}) {
        let query = supabase
            .from('sport_cash_registers')
            .select('*')
            .eq('business_id', String(businessId))
            .eq('status', 'closed')
            .order('opened_at', { ascending: false });
        if (from) query = query.gte('opened_at', from);
        if (to) query = query.lt('opened_at', to);

        const { data, error } = await query;
        if (error) throw toError(error, 'No se pudo cargar el historial de cajas');
        return data || [];
    },

    async listMovementsForRegisters(registerIds = []) {
        if (registerIds.length === 0) return [];
        const { data, error } = await supabase
            .from('sport_cash_movements')
            .select('*')
            .in('cash_register_id', registerIds)
            .order('created_at', { ascending: true });
        if (error) throw toError(error, 'No se pudieron cargar los movimientos');
        return data || [];
    },

    /** Closed registers opened in the given month (month is 0-based) with their movements */
    async getMonthHistory(businessId, year, month) {
        const registers = await this.listClosedRegisters(businessId, monthRange(year, month));
        const movements = await this.listMovementsForRegisters(registers.map(r => r.id));
        return { registers, movements };
    },

    async listBookingMovements(bookingId) {
        if (!bookingId) return [];
        const { data, error } = await supabase
            .from('sport_cash_movements')
            .select('*')
            .eq('booking_id', bookingId)
            .order('created_at', { ascending: true });
        if (error) throw toError(error, 'No se pudieron cargar los cobros del turno');
        return data || [];
    },

    /** CSV (separador ;, BOM UTF-8) with the registers and every movement of the month */
    buildMonthCsv(registers = [], movements = []) {
        const lines = [];
        const row = (cells) => lines.push(cells.map(csvCell).join(';'));
        const registerById = new Map(registers.map(r => [r.id, r]));

        row(['CAJAS']);
        row(['Apertura', 'Hora apertura', 'Cierre', 'Hora cierre', 'Encargado', 'Fondo inicial', 'Turnos', 'Artículos', 'Ingresos manuales', 'Gastos', 'Efectivo esperado', 'Efectivo contado', 'Diferencia', 'Transferencias', 'Notas']);
        registers.slice().reverse().forEach(r => {
            const totals = summarizeMovements(movements.filter(m => m.cash_register_id === r.id), r.initial_cash);
            row([
                csvDate(r.opened_at), csvTime(r.opened_at), csvDate(r.closed_at), csvTime(r.closed_at),
                r.closed_by || r.opened_by,
                csvNumber(r.initial_cash), csvNumber(totals.bookings), csvNumber(totals.canteen),
                csvNumber(totals.manualIncome), csvNumber(totals.expenses),
                csvNumber(r.expected_cash), csvNumber(r.final_cash_counted), csvNumber(r.difference),
                csvNumber(r.expected_transfers), r.notes || ''
            ]);
        });

        lines.push('');
        row(['MOVIMIENTOS']);
        row(['Fecha', 'Hora', 'Caja (apertura)', 'Tipo', 'Medio', 'Descripción', 'Artículos', 'Monto', 'Estado', 'Motivo de anulación']);
        movements.forEach(m => {
            const reg = registerById.get(m.cash_register_id);
            const items = Array.isArray(m.items_detail)
                ? m.items_detail.map(it => `${it.quantity || 1}x ${it.name}`).join(', ')
                : '';
            const signed = m.type === 'manual_expense' ? -Number(m.amount) : Number(m.amount);
            row([
                csvDate(m.created_at), csvTime(m.created_at),
                reg ? `${csvDate(reg.opened_at)} ${csvTime(reg.opened_at)}` : '',
                MOVEMENT_TYPE_LABELS[m.type] || m.type,
                PAYMENT_METHOD_LABELS[m.payment_method] || m.payment_method,
                m.description || '', items, csvNumber(signed),
                m.voided_at ? 'Anulado' : 'Válido', m.voided_reason || ''
            ]);
        });

        const BOM = String.fromCharCode(0xFEFF); // para que Excel lea los acentos como UTF-8
        return `${BOM}${lines.join('\r\n')}\r\n`;
    },

    downloadCsv(filename, content) {
        const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    },

    // ==========================================
    // 4. REPORTE WHATSAPP
    // ==========================================

    generateWhatsAppReport(business, register, movements = []) {
        if (!register) return '';

        const fmtTime = (iso) => new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
        const openTime = register.opened_at ? fmtTime(register.opened_at) : '--:--';
        const closeTime = register.closed_at ? fmtTime(register.closed_at) : fmtTime(new Date().toISOString());
        const dateStr = new Date(register.opened_at || Date.now()).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });

        const valid = movements.filter(m => !m.voided_at);
        const sumBy = (type, method) => valid
            .filter(m => m.type === type && m.payment_method === method)
            .reduce((acc, m) => acc + (Number(m.amount) || 0), 0);

        const bookingsCash = sumBy('booking_income', 'cash');
        const bookingsTransfer = sumBy('booking_income', 'transfer');
        const canteenCash = sumBy('canteen_sale', 'cash');
        const canteenTransfer = sumBy('canteen_sale', 'transfer');
        const incomeCash = sumBy('manual_income', 'cash');
        const incomeTransfer = sumBy('manual_income', 'transfer');
        const expensesCash = sumBy('manual_expense', 'cash');
        const expensesTransfer = sumBy('manual_expense', 'transfer');
        const bookingsCount = valid.filter(m => m.type === 'booking_income').length;

        // Articles sold, whether at the counter or charged together with a court
        const itemsSold = {};
        valid.forEach(m => {
            if (m.type !== 'canteen_sale' && m.type !== 'booking_income') return;
            (Array.isArray(m.items_detail) ? m.items_detail : []).forEach(it => {
                itemsSold[it.name] = (itemsSold[it.name] || 0) + (Number(it.quantity) || 1);
            });
        });
        const itemsLines = Object.entries(itemsSold).map(([name, qty]) => `  • ${name}: ${qty} u.`).join('\n');

        const totals = summarizeMovements(movements, register.initial_cash);
        const hasValue = (v) => v !== null && v !== undefined;
        const expectedCash = hasValue(register.expected_cash) ? Number(register.expected_cash) : totals.cash;
        const expectedTransfers = hasValue(register.expected_transfers) ? Number(register.expected_transfers) : totals.transfers;
        const counted = hasValue(register.final_cash_counted) ? Number(register.final_cash_counted) : null;
        const diff = counted === null ? null : counted - expectedCash;
        const voidedCount = movements.length - valid.length;

        const lines = [
            `*CIERRE DE CAJA · ${business?.name || 'Complejo'}*`,
            `Fecha: ${dateStr} (${openTime} a ${closeTime})`,
            `Encargado: ${register.closed_by || register.opened_by || 'Encargado'}`,
            '',
            '*EFECTIVO*',
            `• Fondo inicial: ${money(register.initial_cash)}`,
            `• Turnos: ${money(bookingsCash)}`,
            `• Artículos: ${money(canteenCash)}`,
            ...(incomeCash > 0 ? [`• Otros ingresos: ${money(incomeCash)}`] : []),
            `• Gastos: -${money(expensesCash)}`,
            `Esperado: ${money(expectedCash)}`,
            ...(counted !== null ? [`Contado: ${money(counted)}`] : []),
            ...(diff === null ? [] : [diff === 0 ? 'Caja OK (sin diferencia)' : diff > 0 ? `Sobrante: +${money(diff)}` : `Faltante: -${money(Math.abs(diff))}`]),
            '',
            '*TRANSFERENCIAS*',
            `• Turnos: ${money(bookingsTransfer)}`,
            `• Artículos: ${money(canteenTransfer)}`,
            ...(incomeTransfer > 0 ? [`• Otros ingresos: ${money(incomeTransfer)}`] : []),
            ...(expensesTransfer > 0 ? [`• Gastos: -${money(expensesTransfer)}`] : []),
            `Total: ${money(expectedTransfers)}`,
            '',
            `*TURNOS COBRADOS:* ${bookingsCount} (${money(bookingsCash + bookingsTransfer)})`,
            `*ARTÍCULOS:* ${money(canteenCash + canteenTransfer)}`,
            itemsLines || '  Sin artículos vendidos',
            ...(voidedCount > 0 ? ['', `Movimientos anulados: ${voidedCount}`] : []),
            ...(register.notes ? ['', `Notas: ${register.notes}`] : []),
            '',
            '_Generado desde TurnitosLR_'
        ];
        return lines.join('\n');
    }
};

export default sportCanteenService;
