import React, { useEffect, useMemo, useState } from 'react';
import { CircleCheck, Copy, Lock, MessageCircle, Search, ShoppingCart, Trash2, TriangleAlert, Undo2, Plus, Minus } from 'lucide-react';
import sportCanteenService, { PRODUCT_CATEGORIES, PAYMENT_METHOD_LABELS, summarizeMovements } from '../../../services/sportCanteenService';
import { Badge, Button, Field, Modal, MoneyInput, PaymentMethodPicker, Spinner } from './CashUi';
import { differenceLabel, differenceTone, formatDate, formatMoney, formatTime, MOVEMENT_VISUALS, toneStyle } from './cashFormat';

const OPENED_BY_KEY = (businessId) => `turnitos_cash_opened_by_${businessId}`;

const readLastOpenedBy = (businessId) => {
    try {
        return localStorage.getItem(OPENED_BY_KEY(businessId)) || '';
    } catch {
        return '';
    }
};

const rememberOpenedBy = (businessId, name) => {
    try {
        localStorage.setItem(OPENED_BY_KEY(businessId), name);
    } catch {
        // per-device convenience only
    }
};

const openWhatsApp = (business, text) => {
    const phone = String(business?.phone || '').replace(/\D/g, '');
    const url = phone ? `https://wa.me/${phone}?text=${encodeURIComponent(text)}` : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'noopener');
};

const copyText = async (text, showToast) => {
    try {
        await navigator.clipboard.writeText(text);
        showToast?.('Resumen copiado', 'success');
    } catch {
        showToast?.('No se pudo copiar el resumen', 'error');
    }
};

// ==========================================================
// Abrir caja (formulario reutilizable: panel y modal de turno)
// ==========================================================
export function OpenRegisterForm({ businessId, onOpened, showToast, submitLabel = 'Abrir caja', compact = false }) {
    const [initialCash, setInitialCash] = useState('');
    const [openedBy, setOpenedBy] = useState(() => readLastOpenedBy(businessId));
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (saving) return;
        setSaving(true);
        try {
            const name = openedBy.trim() || 'Encargado';
            const { register, alreadyOpen } = await sportCanteenService.openRegister(businessId, { initialCash, openedBy: name });
            rememberOpenedBy(businessId, name);
            showToast?.(alreadyOpen ? 'Ya había una caja abierta en otro dispositivo: seguís con esa' : 'Caja abierta', alreadyOpen ? 'info' : 'success');
            onOpened?.(register);
        } catch (err) {
            showToast?.(err.message, 'error');
        } finally {
            setSaving(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: compact ? '10px' : '14px', width: '100%' }}>
            <div className={compact ? 'cc-grid-2' : ''} style={compact ? undefined : { display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <Field label="Fondo inicial (efectivo para cambio)">
                    <MoneyInput value={initialCash} onChange={setInitialCash} large={!compact} placeholder="0" />
                </Field>
                <Field label="Encargado del turno">
                    <input
                        className="cc-input"
                        type="text"
                        value={openedBy}
                        maxLength={60}
                        onChange={(e) => setOpenedBy(e.target.value)}
                        placeholder="Ej. Juan (recepción)"
                    />
                </Field>
            </div>
            <Button type="submit" variant="primary" size={compact ? 'md' : 'lg'} block loading={saving}>
                {saving ? 'Abriendo...' : submitLabel}
            </Button>
        </form>
    );
}

// ==========================================================
// Venta de mostrador (POS)
// ==========================================================
export function CounterSaleModal({ businessId, products, onClose, onDone, showToast }) {
    const [cart, setCart] = useState({});
    const [category, setCategory] = useState('Todos');
    const [search, setSearch] = useState('');
    const [method, setMethod] = useState('cash');
    const [saving, setSaving] = useState(false);

    const active = useMemo(() => products.filter(p => p.is_active), [products]);
    const categories = useMemo(() => ['Todos', ...PRODUCT_CATEGORIES.filter(c => active.some(p => p.category === c))], [active]);
    const visible = useMemo(() => {
        const q = search.trim().toLowerCase();
        const soldOut = (p) => (p.track_stock && (Number(p.current_stock) || 0) <= 0 ? 1 : 0);
        return active
            .filter(p => (category === 'Todos' || p.category === category) && (!q || p.name.toLowerCase().includes(q)))
            .sort((a, b) => soldOut(a) - soldOut(b)); // what can be sold first
    }, [active, category, search]);

    const lines = useMemo(() => Object.entries(cart)
        .filter(([, qty]) => qty > 0)
        .map(([id, qty]) => {
            const product = active.find(p => p.id === id);
            return product ? { product, qty, subtotal: qty * Number(product.sale_price || 0) } : null;
        })
        .filter(Boolean), [cart, active]);

    const total = lines.reduce((sum, l) => sum + l.subtotal, 0);
    const units = lines.reduce((sum, l) => sum + l.qty, 0);

    const maxFor = (p) => (p.track_stock ? Number(p.current_stock) || 0 : Infinity);

    const change = (p, delta) => {
        const current = cart[p.id] || 0;
        const next = Math.max(0, Math.min(maxFor(p), current + delta));
        if (delta > 0 && next === current) {
            showToast?.(`No hay más stock de ${p.name}`, 'warning');
            return;
        }
        setCart(prev => ({ ...prev, [p.id]: next }));
    };

    const handleConfirm = async () => {
        if (saving || lines.length === 0) return;
        setSaving(true);
        try {
            await sportCanteenService.registerMovement(businessId, {
                type: 'canteen_sale',
                paymentMethod: method,
                amount: total,
                description: lines.map(l => `${l.qty}x ${l.product.name}`).join(', '),
                items: lines.map(l => ({
                    product_id: l.product.id,
                    name: l.product.name,
                    quantity: l.qty,
                    unit_price: Number(l.product.sale_price) || 0
                }))
            });
            showToast?.(`Venta registrada: ${formatMoney(total)} (${PAYMENT_METHOD_LABELS[method]})`, 'success');
            onDone?.();
        } catch (err) {
            showToast?.(err.message, 'error');
            setSaving(false);
        }
    };

    return (
        <Modal
            wide
            busy={saving}
            title="Venta de mostrador"
            subtitle="Tocá los artículos para sumarlos. El stock se descuenta al cobrar."
            onClose={onClose}
            footer={
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
                    {lines.length > 0 && (
                        <div style={{ maxHeight: '132px', overflowY: 'auto' }}>
                            {lines.map(l => (
                                <div key={l.product.id} className="cc-cart-line">
                                    <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 }}>
                                        {l.product.name}
                                    </span>
                                    <div className="cc-stepper">
                                        <Button size="sm" className="cc-btn--icon" onClick={() => change(l.product, -1)} aria-label={`Quitar ${l.product.name}`} disabled={saving}>
                                            <Minus size={14} />
                                        </Button>
                                        <span>{l.qty}</span>
                                        <Button size="sm" className="cc-btn--icon" onClick={() => change(l.product, 1)} aria-label={`Sumar ${l.product.name}`} disabled={saving}>
                                            <Plus size={14} />
                                        </Button>
                                    </div>
                                    <strong className="cc-amount" style={{ minWidth: '78px', textAlign: 'right' }}>{formatMoney(l.subtotal)}</strong>
                                </div>
                            ))}
                        </div>
                    )}
                    <PaymentMethodPicker value={method} onChange={setMethod} disabled={saving} />
                    <div className="cc-row">
                        {lines.length > 0 && (
                            <Button variant="ghost" className="cc-btn--icon" onClick={() => setCart({})} disabled={saving} aria-label="Vaciar">
                                <Trash2 size={18} />
                            </Button>
                        )}
                        <Button variant="primary" size="lg" block loading={saving} disabled={lines.length === 0} onClick={handleConfirm}>
                            {lines.length === 0 ? 'Elegí artículos' : `Cobrar ${formatMoney(total)}`}
                            {lines.length > 0 && !saving && <span style={{ fontWeight: 600, opacity: 0.75 }}>· {units} u.</span>}
                        </Button>
                    </div>
                </div>
            }
        >
            {active.length === 0 ? (
                <div className="cc-alert cc-alert--info">
                    <ShoppingCart size={18} style={{ flexShrink: 0 }} />
                    <span>Todavía no hay artículos activos. Cargalos en la pestaña “Artículos y stock”.</span>
                </div>
            ) : (
                <>
                    <div className="cc-search">
                        <Search size={18} />
                        <input className="cc-input" type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar artículo" />
                    </div>
                    {categories.length > 2 && (
                        <div className="cc-chips">
                            {categories.map(c => (
                                <button key={c} type="button" className={`cc-chip${category === c ? ' is-active' : ''}`} onClick={() => setCategory(c)}>
                                    {c}
                                </button>
                            ))}
                        </div>
                    )}
                    <div className="cc-pos-grid">
                        {visible.map(p => {
                            const qty = cart[p.id] || 0;
                            const outOfStock = p.track_stock && (Number(p.current_stock) || 0) <= 0;
                            return (
                                <button
                                    key={p.id}
                                    type="button"
                                    className={`cc-pos-tile${qty > 0 ? ' is-selected' : ''}`}
                                    onClick={() => change(p, 1)}
                                    disabled={outOfStock || saving}
                                >
                                    {qty > 0 && <span className="cc-pos-qty">{qty}</span>}
                                    <span className="cc-pos-name">{p.name}</span>
                                    <span>
                                        <span className="cc-pos-price" style={{ display: 'block' }}>{formatMoney(p.sale_price)}</span>
                                        <span className="cc-pos-stock">
                                            {p.track_stock ? (outOfStock ? 'Sin stock' : `Stock: ${p.current_stock}`) : p.category}
                                        </span>
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                    {visible.length === 0 && <div className="cc-muted" style={{ textAlign: 'center', padding: '20px', fontSize: '13px' }}>No hay artículos que coincidan.</div>}
                </>
            )}
        </Modal>
    );
}

// ==========================================================
// Ingreso o gasto manual
// ==========================================================
const QUICK_CONCEPTS = {
    manual_expense: ['Hielo', 'Limpieza', 'Proveedor', 'Retiro del dueño', 'Mantenimiento'],
    manual_income: ['Clase', 'Torneo', 'Cuota', 'Aporte de cambio']
};

export function ManualMovementModal({ businessId, type, onClose, onDone, showToast }) {
    const isExpense = type === 'manual_expense';
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [method, setMethod] = useState('cash');
    const [saving, setSaving] = useState(false);

    const valid = Number(amount) > 0 && description.trim().length > 0;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (saving) return;
        if (!valid) {
            showToast?.('Completá el monto y el concepto', 'warning');
            return;
        }
        setSaving(true);
        try {
            await sportCanteenService.registerMovement(businessId, { type, paymentMethod: method, amount, description: description.trim() });
            showToast?.(isExpense ? `Gasto registrado: ${formatMoney(amount)}` : `Ingreso registrado: ${formatMoney(amount)}`, 'success');
            onDone?.();
        } catch (err) {
            showToast?.(err.message, 'error');
            setSaving(false);
        }
    };

    return (
        <Modal
            busy={saving}
            title={isExpense ? 'Registrar gasto' : 'Registrar ingreso'}
            subtitle={isExpense ? 'Sale plata de la caja: compras, pagos o retiros.' : 'Entra plata que no es un turno ni una venta de artículos.'}
            onClose={onClose}
            footer={
                <>
                    <Button onClick={onClose} disabled={saving}>Cancelar</Button>
                    <Button type="submit" form="cc-manual-form" variant={isExpense ? 'solid-danger' : 'primary'} loading={saving} disabled={!valid}>
                        {isExpense ? 'Guardar gasto' : 'Guardar ingreso'}
                    </Button>
                </>
            }
        >
            <form id="cc-manual-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <Field label="Monto">
                    <MoneyInput value={amount} onChange={setAmount} large autoFocus />
                </Field>
                <Field label="Concepto">
                    <input
                        className="cc-input"
                        type="text"
                        maxLength={120}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder={isExpense ? 'Ej. 2 bolsas de hielo' : 'Ej. Clase particular'}
                    />
                </Field>
                <div className="cc-chips" style={{ flexWrap: 'wrap' }}>
                    {QUICK_CONCEPTS[type].map(c => (
                        <button key={c} type="button" className={`cc-chip${description === c ? ' is-active' : ''}`} onClick={() => setDescription(c)}>
                            {c}
                        </button>
                    ))}
                </div>
                <div className="cc-field">
                    <span className="cc-label">{isExpense ? 'Pagado con' : 'Cobrado en'}</span>
                    <PaymentMethodPicker value={method} onChange={setMethod} disabled={saving} />
                </div>
            </form>
        </Modal>
    );
}

// ==========================================================
// Anular movimiento
// ==========================================================
export function VoidMovementModal({ movement, onClose, onDone, showToast }) {
    const [reason, setReason] = useState('');
    const [saving, setSaving] = useState(false);
    const visual = MOVEMENT_VISUALS[movement.type] || MOVEMENT_VISUALS.manual_income;
    const hasItems = Array.isArray(movement.items_detail) && movement.items_detail.length > 0;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (saving) return;
        if (!reason.trim()) {
            showToast?.('Contá brevemente por qué lo anulás', 'warning');
            return;
        }
        setSaving(true);
        try {
            await sportCanteenService.voidMovement(movement.id, reason);
            showToast?.('Movimiento anulado', 'success');
            onDone?.();
        } catch (err) {
            showToast?.(err.message, 'error');
            setSaving(false);
        }
    };

    return (
        <Modal
            busy={saving}
            title="Anular movimiento"
            subtitle="No se borra: queda tachado en la caja y deja de sumar."
            onClose={onClose}
            footer={
                <>
                    <Button onClick={onClose} disabled={saving}>Volver</Button>
                    <Button type="submit" form="cc-void-form" variant="solid-danger" loading={saving} disabled={!reason.trim()}>
                        Anular
                    </Button>
                </>
            }
        >
            <div className="cc-summary">
                <div className="cc-summary-row">
                    <span>{visual.label} · {formatTime(movement.created_at)} · {PAYMENT_METHOD_LABELS[movement.payment_method]}</span>
                    <strong>{formatMoney(movement.amount)}</strong>
                </div>
                <div style={{ fontWeight: 600, overflowWrap: 'anywhere' }}>{movement.description || visual.label}</div>
            </div>
            {hasItems && (
                <div className="cc-alert cc-alert--info">
                    <Undo2 size={18} style={{ flexShrink: 0 }} />
                    <span>Los artículos de este movimiento vuelven al stock.</span>
                </div>
            )}
            <form id="cc-void-form" onSubmit={handleSubmit}>
                <Field label="Motivo">
                    <input
                        className="cc-input"
                        type="text"
                        maxLength={160}
                        autoFocus
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="Ej. Se cargó dos veces"
                    />
                </Field>
            </form>
        </Modal>
    );
}

// ==========================================================
// Cierre de caja con arqueo
// ==========================================================
export function CloseRegisterModal({ business, register, movements, onClose, onClosed, showToast }) {
    const [counted, setCounted] = useState('');
    const [closedBy, setClosedBy] = useState(register.opened_by || '');
    const [notes, setNotes] = useState('');
    const [saving, setSaving] = useState(false);
    const [closed, setClosed] = useState(null);

    const totals = useMemo(() => summarizeMovements(movements, register.initial_cash), [movements, register.initial_cash]);
    const cashOut = movements
        .filter(m => !m.voided_at && m.type === 'manual_expense' && m.payment_method === 'cash')
        .reduce((sum, m) => sum + (Number(m.amount) || 0), 0);
    const cashIn = totals.cash - (Number(register.initial_cash) || 0) + cashOut;
    const hasCount = counted !== '' && !Number.isNaN(Number(counted));
    const previewDiff = hasCount ? Number(counted) - totals.cash : null;

    const [finalMovements, setFinalMovements] = useState(null);
    const report = closed ? sportCanteenService.generateWhatsAppReport(business, closed, finalMovements || movements) : '';

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (saving) return;
        if (!hasCount) {
            showToast?.('Ingresá el efectivo que contaste', 'warning');
            return;
        }
        setSaving(true);
        try {
            const result = await sportCanteenService.closeRegister(register.id, { cashCounted: counted, closedBy: closedBy.trim(), notes: notes.trim() });
            // The register may have movements from another device: the summary uses what the database closed with
            try {
                setFinalMovements(await sportCanteenService.listMovements(register.id));
            } catch {
                // keep the movements on screen
            }
            setClosed(result);
            showToast?.('Caja cerrada', 'success');
        } catch (err) {
            showToast?.(err.message, 'error');
        } finally {
            setSaving(false);
        }
    };

    if (closed) {
        const tone = differenceTone(closed.difference);
        return (
            <Modal title="Caja cerrada" subtitle={`${formatDate(closed.opened_at)} · ${formatTime(closed.opened_at)} a ${formatTime(closed.closed_at)}`} onClose={() => onClosed?.(closed)}
                footer={
                    <>
                        <Button icon={Copy} onClick={() => copyText(report, showToast)}>Copiar</Button>
                        <Button variant="primary" icon={MessageCircle} onClick={() => openWhatsApp(business, report)}>WhatsApp</Button>
                    </>
                }
            >
                <div className="cc-empty" style={{ padding: '8px 0 0' }}>
                    <span className="cc-empty-icon" style={toneStyle(tone)}>
                        {tone === 'green' ? <CircleCheck size={26} /> : <TriangleAlert size={26} />}
                    </span>
                    <h3>{differenceLabel(closed.difference)}</h3>
                    <p>Mandá el resumen por WhatsApp o copialo. Lo vas a encontrar siempre en Historial.</p>
                </div>
                <div className="cc-summary">
                    <div className="cc-summary-row"><span>Efectivo esperado</span><strong>{formatMoney(closed.expected_cash)}</strong></div>
                    <div className="cc-summary-row"><span>Efectivo contado</span><strong>{formatMoney(closed.final_cash_counted)}</strong></div>
                    <div className="cc-summary-row"><span>Transferencias</span><strong>{formatMoney(closed.expected_transfers)}</strong></div>
                    <div className={`cc-summary-row cc-summary-total`}>
                        <span>Diferencia</span>
                        <strong style={toneStyle(tone).color ? { color: toneStyle(tone).color } : undefined}>{formatMoney(closed.difference)}</strong>
                    </div>
                </div>
                <Button block onClick={() => onClosed?.(closed)}>Listo</Button>
            </Modal>
        );
    }

    return (
        <Modal
            busy={saving}
            title="Cerrar caja"
            subtitle="Contá el efectivo del cajón. Los totales se recalculan al cerrar."
            onClose={onClose}
            footer={
                <>
                    <Button onClick={onClose} disabled={saving}>Cancelar</Button>
                    <Button type="submit" form="cc-close-form" variant="primary" icon={Lock} loading={saving} disabled={!hasCount}>
                        Cerrar caja
                    </Button>
                </>
            }
        >
            <div className="cc-summary">
                <div className="cc-summary-row"><span>Fondo inicial</span><span>{formatMoney(register.initial_cash)}</span></div>
                <div className="cc-summary-row"><span>Cobros en efectivo</span><span>{formatMoney(cashIn)}</span></div>
                <div className="cc-summary-row"><span>Gastos en efectivo</span><span className="cc-neg">-{formatMoney(cashOut)}</span></div>
                <div className="cc-summary-row cc-summary-total"><span>Efectivo esperado</span><strong>{formatMoney(totals.cash)}</strong></div>
                <div className="cc-summary-row"><span>Transferencias (no se cuentan)</span><span>{formatMoney(totals.transfers)}</span></div>
            </div>

            <form id="cc-close-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <Field label="Efectivo contado">
                    <MoneyInput value={counted} onChange={setCounted} large autoFocus />
                </Field>
                {previewDiff !== null && (
                    <Badge tone={differenceTone(previewDiff)} style={{ alignSelf: 'flex-start', fontSize: '13px', padding: '4px 12px' }}>
                        {differenceLabel(previewDiff)}
                    </Badge>
                )}
                <Field label="Cierra">
                    <input className="cc-input" type="text" maxLength={60} value={closedBy} onChange={(e) => setClosedBy(e.target.value)} placeholder="Nombre del encargado" />
                </Field>
                <Field label="Notas (opcional)">
                    <textarea className="cc-input" rows={2} maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ej. Quedó una seña de más para el sábado" />
                </Field>
            </form>
        </Modal>
    );
}

// ==========================================================
// Detalle de una caja cerrada (historial)
// ==========================================================
export function RegisterDetailModal({ business, register, movements: providedMovements, onClose, showToast }) {
    const [movements, setMovements] = useState(providedMovements || null);
    const [error, setError] = useState('');

    useEffect(() => {
        if (providedMovements) return;
        let cancelled = false;
        sportCanteenService.listMovements(register.id)
            .then(rows => { if (!cancelled) setMovements(rows); })
            .catch(err => { if (!cancelled) setError(err.message); });
        return () => { cancelled = true; };
    }, [register.id, providedMovements]);

    const totals = useMemo(() => summarizeMovements(movements || [], register.initial_cash), [movements, register.initial_cash]);
    const tone = differenceTone(register.difference);
    const report = movements ? sportCanteenService.generateWhatsAppReport(business, register, movements) : '';

    return (
        <Modal
            wide
            title={`Caja del ${formatDate(register.opened_at, { weekday: 'long', day: 'numeric', month: 'long' })}`}
            subtitle={`${formatTime(register.opened_at)} a ${formatTime(register.closed_at)} · ${register.closed_by || register.opened_by}`}
            onClose={onClose}
            footer={
                <>
                    <Button icon={Copy} disabled={!movements} onClick={() => copyText(report, showToast)}>Copiar</Button>
                    <Button variant="primary" icon={MessageCircle} disabled={!movements} onClick={() => openWhatsApp(business, report)}>WhatsApp</Button>
                </>
            }
        >
            <div className="cc-summary">
                <div className="cc-summary-row"><span>Fondo inicial</span><span>{formatMoney(register.initial_cash)}</span></div>
                <div className="cc-summary-row"><span>Turnos</span><span>{formatMoney(totals.bookings)}</span></div>
                <div className="cc-summary-row"><span>Artículos</span><span>{formatMoney(totals.canteen)}</span></div>
                {totals.manualIncome > 0 && <div className="cc-summary-row"><span>Otros ingresos</span><span>{formatMoney(totals.manualIncome)}</span></div>}
                <div className="cc-summary-row"><span>Gastos</span><span className="cc-neg">-{formatMoney(totals.expenses)}</span></div>
                <div className="cc-summary-row cc-summary-total"><span>Efectivo esperado</span><strong>{formatMoney(register.expected_cash)}</strong></div>
                <div className="cc-summary-row"><span>Efectivo contado</span><strong>{formatMoney(register.final_cash_counted)}</strong></div>
                <div className="cc-summary-row">
                    <span>Diferencia</span>
                    <Badge tone={tone}>{differenceLabel(register.difference)}</Badge>
                </div>
                <div className="cc-summary-row"><span>Transferencias</span><strong>{formatMoney(register.expected_transfers)}</strong></div>
            </div>
            {register.notes && (
                <div className="cc-alert cc-alert--info"><span style={{ overflowWrap: 'anywhere' }}>Notas: {register.notes}</span></div>
            )}

            <div>
                <div className="cc-overline" style={{ marginBottom: '4px' }}>Movimientos</div>
                {error && <div className="cc-alert">{error}</div>}
                {!movements && !error && <div className="cc-loading" style={{ padding: '24px' }}><Spinner large /></div>}
                {movements && movements.length === 0 && <div className="cc-muted" style={{ fontSize: '13px', padding: '12px 0' }}>Sin movimientos.</div>}
                {movements && movements.length > 0 && <MovementList movements={movements} />}
            </div>
        </Modal>
    );
}

// ==========================================================
// Lista de movimientos (caja abierta e historial)
// ==========================================================
export function MovementList({ movements, onVoid }) {
    return (
        <div className="cc-list">
            {movements.map(m => {
                const visual = MOVEMENT_VISUALS[m.type] || MOVEMENT_VISUALS.manual_income;
                const Icon = visual.icon;
                const isExpense = m.type === 'manual_expense';
                const voided = Boolean(m.voided_at);
                return (
                    <div key={m.id} className={`cc-list-item${voided ? ' is-voided' : ''}`}>
                        <span className="cc-list-icon" style={toneStyle(visual.tone)}>
                            <Icon size={18} aria-hidden="true" />
                        </span>
                        <div className="cc-list-main">
                            <div className="cc-list-title" title={m.description}>{m.description || visual.label}</div>
                            <div className="cc-list-meta">
                                <span>{formatTime(m.created_at)}</span>
                                <span aria-hidden="true">·</span>
                                <span>{visual.label}</span>
                                <span aria-hidden="true">·</span>
                                <span>{PAYMENT_METHOD_LABELS[m.payment_method]}</span>
                                {voided && <Badge tone="red">Anulado{m.voided_reason ? `: ${m.voided_reason}` : ''}</Badge>}
                            </div>
                        </div>
                        <div className={`cc-list-amount ${isExpense ? 'cc-neg' : ''}`}>
                            {isExpense ? '-' : '+'}{formatMoney(m.amount)}
                        </div>
                        {onVoid && !voided && (
                            <Button size="sm" variant="ghost" onClick={() => onVoid(m)} aria-label="Anular movimiento" title="Anular">
                                Anular
                            </Button>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

// ==========================================================
// Alta / edición de artículo
// ==========================================================
export function ProductModal({ businessId, product, onClose, onSaved, showToast }) {
    const isNew = !product?.id;
    const [form, setForm] = useState(() => ({
        name: product?.name || '',
        category: product?.category || 'Bebidas',
        sale_price: product?.sale_price ?? '',
        cost_price: product?.cost_price ?? '',
        track_stock: product?.track_stock ?? true,
        current_stock: product?.current_stock ?? '',
        min_stock_alert: product?.min_stock_alert ?? 5,
        is_active: product?.is_active ?? true
    }));
    const [saving, setSaving] = useState(false);
    const set = (key) => (value) => setForm(prev => ({ ...prev, [key]: value }));

    const sale = Number(form.sale_price) || 0;
    const cost = Number(form.cost_price) || 0;
    const margin = sale > 0 && cost > 0 ? Math.round(((sale - cost) / sale) * 100) : null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (saving) return;
        if (!form.name.trim()) {
            showToast?.('Ingresá el nombre del artículo', 'warning');
            return;
        }
        setSaving(true);
        try {
            const saved = await sportCanteenService.saveProduct(businessId, { ...form, id: product?.id });
            showToast?.(isNew ? 'Artículo creado' : 'Artículo guardado', 'success');
            onSaved?.(saved);
        } catch (err) {
            showToast?.(err.message, 'error');
            setSaving(false);
        }
    };

    return (
        <Modal
            busy={saving}
            title={isNew ? 'Nuevo artículo' : 'Editar artículo'}
            onClose={onClose}
            footer={
                <>
                    <Button onClick={onClose} disabled={saving}>Cancelar</Button>
                    <Button type="submit" form="cc-product-form" variant="primary" loading={saving}>Guardar</Button>
                </>
            }
        >
            <form id="cc-product-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <Field label="Nombre">
                    <input className="cc-input" type="text" maxLength={80} autoFocus={isNew} value={form.name} onChange={(e) => set('name')(e.target.value)} placeholder="Ej. Agua mineral 500 ml" />
                </Field>
                <div className="cc-field">
                    <span className="cc-label">Categoría</span>
                    <div className="cc-chips" style={{ flexWrap: 'wrap' }}>
                        {PRODUCT_CATEGORIES.map(c => (
                            <button key={c} type="button" className={`cc-chip${form.category === c ? ' is-active' : ''}`} onClick={() => set('category')(c)}>
                                {c}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="cc-grid-2">
                    <Field label="Precio de venta">
                        <MoneyInput value={form.sale_price} onChange={set('sale_price')} />
                    </Field>
                    <Field label="Costo (opcional)" hint={margin !== null ? `Margen ${margin}%` : undefined}>
                        <MoneyInput value={form.cost_price} onChange={set('cost_price')} />
                    </Field>
                </div>
                <label className="cc-switch">
                    <span>
                        <span style={{ display: 'block', fontWeight: 700, fontSize: '14px' }}>Controlar stock</span>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Apagalo para alquileres (paletas, pecheras) que no se agotan.</span>
                    </span>
                    <input type="checkbox" checked={form.track_stock} onChange={(e) => set('track_stock')(e.target.checked)} />
                </label>
                {form.track_stock && (
                    <div className="cc-grid-2">
                        {isNew ? (
                            <Field label="Stock inicial">
                                <input className="cc-input" type="number" inputMode="numeric" min="0" value={form.current_stock} onChange={(e) => set('current_stock')(e.target.value)} placeholder="0" />
                            </Field>
                        ) : (
                            <Field label="Stock actual" hint="Se cambia con “Reponer”">
                                <input className="cc-input" type="text" value={`${product.current_stock} u.`} disabled />
                            </Field>
                        )}
                        <Field label="Avisar con menos de">
                            <input className="cc-input" type="number" inputMode="numeric" min="0" value={form.min_stock_alert} onChange={(e) => set('min_stock_alert')(e.target.value)} />
                        </Field>
                    </div>
                )}
            </form>
        </Modal>
    );
}

// ==========================================================
// Reponer / corregir stock
// ==========================================================
export function RestockModal({ product, onClose, onSaved, showToast }) {
    const [mode, setMode] = useState('add'); // 'add' | 'set'
    const [quantity, setQuantity] = useState('');
    const [saving, setSaving] = useState(false);
    const current = Number(product.current_stock) || 0;
    const qty = parseInt(quantity, 10);
    const delta = Number.isNaN(qty) ? 0 : mode === 'add' ? qty : qty - current;
    const resulting = Math.max(0, current + delta);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (saving || delta === 0) return;
        setSaving(true);
        try {
            const saved = await sportCanteenService.adjustStock(product.id, delta);
            showToast?.(`Stock de ${product.name}: ${saved.current_stock} u.`, 'success');
            onSaved?.(saved);
        } catch (err) {
            showToast?.(err.message, 'error');
            setSaving(false);
        }
    };

    return (
        <Modal
            busy={saving}
            title={`Stock · ${product.name}`}
            subtitle={`Hoy hay ${current} u.`}
            onClose={onClose}
            footer={
                <>
                    <Button onClick={onClose} disabled={saving}>Cancelar</Button>
                    <Button type="submit" form="cc-restock-form" variant="primary" loading={saving} disabled={delta === 0}>
                        {delta === 0 ? 'Guardar' : `Quedan ${resulting} u.`}
                    </Button>
                </>
            }
        >
            <div className="cc-segmented">
                <button type="button" className={`cc-segment${mode === 'add' ? ' is-active' : ''}`} onClick={() => { setMode('add'); setQuantity(''); }}>
                    Entró mercadería
                </button>
                <button type="button" className={`cc-segment${mode === 'set' ? ' is-active' : ''}`} onClick={() => { setMode('set'); setQuantity(String(current)); }}>
                    Corregir conteo
                </button>
            </div>
            <form id="cc-restock-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <Field label={mode === 'add' ? 'Unidades que entraron' : 'Unidades que hay ahora'}>
                    <input className="cc-input" type="number" inputMode="numeric" min="0" autoFocus value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="0" style={{ fontSize: '22px', fontWeight: 800, minHeight: '56px' }} />
                </Field>
                {mode === 'add' && (
                    <div className="cc-chips">
                        {[6, 12, 24, 48].map(n => (
                            <button key={n} type="button" className="cc-chip" onClick={() => setQuantity(String((parseInt(quantity, 10) || 0) + n))}>
                                +{n}
                            </button>
                        ))}
                    </div>
                )}
            </form>
        </Modal>
    );
}
