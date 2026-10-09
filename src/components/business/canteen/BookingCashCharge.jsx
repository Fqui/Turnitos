import React, { useMemo, useState } from 'react';
import { CircleCheck, Package, Wallet } from 'lucide-react';
import sportCanteenService, { PAYMENT_METHOD_LABELS } from '../../../services/sportCanteenService';
import { Badge, Button, Field, MoneyInput, PaymentMethodPicker, Spinner } from './CashUi';
import { OpenRegisterForm } from './CashModals';
import { formatDate, formatMoney, formatTime } from './cashFormat';

// Deposit ("seña") charged into the register; mounted only while it is being charged
function DepositForm({ businessId, bookingId, deposit, hasRegister, onGoToCashRegister, cash, showToast }) {
    const [amount, setAmount] = useState(deposit.amount > 0 ? String(deposit.amount) : '');
    const [method, setMethod] = useState('transfer');
    const [saving, setSaving] = useState(false);

    const handleCharge = async () => {
        if (saving) return;
        const value = Number(amount);
        if (!value || value <= 0) {
            showToast?.('Ingresá el monto de la seña', 'warning');
            return;
        }
        setSaving(true);
        try {
            const movement = await sportCanteenService.registerMovement(businessId, {
                type: 'booking_income',
                paymentMethod: method,
                amount: value,
                description: deposit.description,
                bookingId
            });
            showToast?.(`Seña cobrada en caja: ${formatMoney(value)} (${PAYMENT_METHOD_LABELS[method]})`, 'success');
            await cash.reload();
            await deposit.onCharged(movement);
        } catch (err) {
            showToast?.(err.message, 'error');
            if (/caja abierta/i.test(err.message)) await cash.reload();
            setSaving(false);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '12px', borderRadius: '10px', background: 'var(--bg-card)', border: '1px solid var(--cc-amber)' }}>
            <div style={{ fontSize: '13px', fontWeight: 800 }}>{deposit.needsConfirm ? 'Cobrar la seña' : 'Registrar la seña en caja'}</div>
            {!hasRegister ? (
                <>
                    <div className="cc-alert cc-alert--amber" style={{ fontSize: '12px' }}>
                        No hay una caja abierta. Abrila para que la seña quede registrada.
                    </div>
                    <OpenRegisterForm compact businessId={businessId} showToast={showToast} submitLabel="Abrir caja" onOpened={(reg) => cash.setRegister(reg)} />
                    {onGoToCashRegister && <Button size="sm" variant="ghost" onClick={onGoToCashRegister}>Ir a Registro de Caja</Button>}
                </>
            ) : (
                <>
                    <Field label="Monto de la seña">
                        <MoneyInput value={amount} onChange={setAmount} autoFocus />
                    </Field>
                    <PaymentMethodPicker value={method} onChange={setMethod} disabled={saving} />
                    <div className="cc-row">
                        <Button block onClick={deposit.onCancel} disabled={saving}>Cancelar</Button>
                        <Button block variant="primary" loading={saving} disabled={!(Number(amount) > 0)} onClick={handleCharge}>
                            {Number(amount) > 0 ? `Cobrar seña ${formatMoney(amount)}` : 'Cobrar seña'}
                        </Button>
                    </div>
                </>
            )}
            {deposit.needsConfirm && (
                <Button size="sm" variant="ghost" onClick={deposit.onConfirmWithoutCash} disabled={saving}>
                    Confirmar seña sin registrar en caja
                </Button>
            )}
            {!deposit.needsConfirm && !hasRegister && (
                <Button size="sm" variant="ghost" onClick={deposit.onCancel}>Cancelar</Button>
            )}
        </div>
    );
}

/**
 * Charges a court booking into the open cash register ("Cobrar en caja").
 * The pending balance discounts the deposit / payments already recorded and previous charges of this booking.
 * Cash articles added as extras go as items so the database discounts their stock.
 */
export default function BookingCashCharge({
    businessId,
    bookingId,
    description,
    total,
    priorPaid = 0,
    priorPaidLabel = 'Seña / pagos',
    services = [],
    cash,
    disabled = false,
    onGoToCashRegister,
    onCharged,
    showToast,
    deposit = null
}) {
    const [showForm, setShowForm] = useState(false);
    const [amount, setAmount] = useState('');
    const [method, setMethod] = useState('cash');
    const [saving, setSaving] = useState(false);

    const validCharges = cash.movements.filter(m => !m.voided_at);
    const charged = validCharges.reduce((sum, m) => sum + (Number(m.amount) || 0), 0);
    const pending = Math.max(0, Math.round((Number(total) || 0) - priorPaid - charged));

    // Articles of the booking not yet discounted from stock by a previous charge
    const pendingItems = useMemo(() => {
        const chargedQty = {};
        validCharges.forEach(m => (Array.isArray(m.items_detail) ? m.items_detail : []).forEach(it => {
            if (it.product_id) chargedQty[it.product_id] = (chargedQty[it.product_id] || 0) + (Number(it.quantity) || 1);
        }));
        return services
            .filter(s => s.product_id)
            .map(s => ({
                product_id: s.product_id,
                name: s.name,
                unit_price: Number(s.price) || 0,
                quantity: Math.max(0, (Number(s.quantity) || 1) - (chargedQty[s.product_id] || 0))
            }))
            .filter(it => it.quantity > 0);
    }, [services, validCharges]);

    const startCharge = () => {
        setAmount(pending > 0 ? String(pending) : '');
        setMethod('cash');
        setShowForm(true);
    };

    const handleCharge = async () => {
        if (saving) return;
        const value = Number(amount);
        if (!value || value <= 0) {
            showToast?.('Ingresá un monto mayor a $0', 'warning');
            return;
        }
        setSaving(true);
        try {
            const movement = await sportCanteenService.registerMovement(businessId, {
                type: 'booking_income',
                paymentMethod: method,
                amount: value,
                description,
                items: pendingItems,
                bookingId
            });
            showToast?.(`Cobrado en caja: ${formatMoney(value)} (${PAYMENT_METHOD_LABELS[method]})`, 'success');
            setShowForm(false);
            await cash.reload();
            onCharged?.(movement);
        } catch (err) {
            showToast?.(err.message, 'error');
            if (/caja abierta/i.test(err.message)) await cash.reload();
        } finally {
            setSaving(false);
        }
    };

    return (
        <div id="booking-cash-charge" className="cc-scope" style={{
            padding: '12px 14px',
            borderRadius: '12px',
            background: 'var(--bg-main)',
            border: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
        }}>
            <div className="cc-between" style={{ flexWrap: 'nowrap' }}>
                <span className="cc-row" style={{ gap: '6px', fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                    <Wallet size={14} aria-hidden="true" /> Cobro en caja
                </span>
                {!cash.loading && charged > 0 && pending === 0 && (
                    <Badge tone="green"><CircleCheck size={12} /> Turno cobrado</Badge>
                )}
            </div>

            {cash.loading ? (
                <div className="cc-row" style={{ fontSize: '12px', color: 'var(--text-muted)' }}><Spinner /> Cargando caja...</div>
            ) : cash.error ? (
                <div className="cc-alert" style={{ fontSize: '12px' }}>
                    <span style={{ flex: 1 }}>{cash.error}</span>
                    <Button size="sm" onClick={cash.reload}>Reintentar</Button>
                </div>
            ) : (
                <>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '8px' }}>
                        <div>
                            <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600 }}>Cobrado en caja</div>
                            <div className="cc-amount" style={{ fontSize: '16px', fontWeight: 900, color: charged > 0 ? 'var(--cc-green)' : 'var(--text-primary)' }}>{formatMoney(charged)}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600 }}>Falta cobrar</div>
                            <div className="cc-amount" style={{ fontSize: '16px', fontWeight: 900, color: pending > 0 ? 'var(--cc-red)' : 'var(--cc-green)' }}>{formatMoney(pending)}</div>
                        </div>
                    </div>
                    {(priorPaid > 0 || (deposit?.canRegister && !deposit.active)) && (
                        <div className="cc-between" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            {priorPaid > 0 ? <span>Ya descontado: {priorPaidLabel} {formatMoney(priorPaid)}</span> : <span />}
                            {deposit?.canRegister && !deposit.active && !disabled && (
                                <button
                                    type="button"
                                    onClick={deposit.onStart}
                                    style={{ background: 'none', border: 'none', padding: 0, color: 'var(--cc-green)', fontWeight: 700, fontSize: '11px', cursor: 'pointer', textDecoration: 'underline' }}
                                >
                                    Registrar seña en caja
                                </button>
                            )}
                        </div>
                    )}

                    {cash.movements.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {cash.movements.map(m => (
                                <div key={m.id} className="cc-between" style={{
                                    flexWrap: 'nowrap',
                                    padding: '6px 10px',
                                    borderRadius: '8px',
                                    background: 'var(--bg-card)',
                                    border: '1px solid var(--border)',
                                    fontSize: '12px',
                                    opacity: m.voided_at ? 0.55 : 1
                                }}>
                                    <span style={{ color: 'var(--text-secondary)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {formatDate(m.created_at, { day: '2-digit', month: '2-digit' })} {formatTime(m.created_at)} · {PAYMENT_METHOD_LABELS[m.payment_method]}
                                        {m.voided_at ? ' · Anulado' : ''}
                                    </span>
                                    <strong className="cc-amount" style={{ textDecoration: m.voided_at ? 'line-through' : 'none' }}>{formatMoney(m.amount)}</strong>
                                </div>
                            ))}
                        </div>
                    )}

                    {disabled ? (
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>Guardá los cambios de la reserva antes de cobrar.</div>
                    ) : deposit?.active ? (
                        <DepositForm
                            businessId={businessId}
                            bookingId={bookingId}
                            deposit={deposit}
                            hasRegister={Boolean(cash.register)}
                            onGoToCashRegister={onGoToCashRegister}
                            cash={cash}
                            showToast={showToast}
                        />
                    ) : !cash.register ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <div className="cc-alert cc-alert--amber" style={{ fontSize: '12px' }}>
                                No hay una caja abierta. Abrila acá para cobrar el turno.
                            </div>
                            <OpenRegisterForm
                                compact
                                businessId={businessId}
                                showToast={showToast}
                                submitLabel="Abrir caja"
                                onOpened={(reg) => cash.setRegister(reg)}
                            />
                            {onGoToCashRegister && (
                                <Button size="sm" variant="ghost" onClick={onGoToCashRegister}>Ir a Registro de Caja</Button>
                            )}
                        </div>
                    ) : showForm ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <Field label="Monto a cobrar">
                                <MoneyInput value={amount} onChange={setAmount} autoFocus />
                            </Field>
                            <PaymentMethodPicker value={method} onChange={setMethod} disabled={saving} />
                            {pendingItems.length > 0 && (
                                <div className="cc-row" style={{ gap: '6px', fontSize: '12px', color: 'var(--text-secondary)', alignItems: 'flex-start' }}>
                                    <Package size={14} style={{ flexShrink: 0, marginTop: '2px' }} aria-hidden="true" />
                                    <span>Se descuentan del stock: {pendingItems.map(it => `${it.quantity}x ${it.name}`).join(', ')}</span>
                                </div>
                            )}
                            <div className="cc-row">
                                <Button block onClick={() => setShowForm(false)} disabled={saving}>Cancelar</Button>
                                <Button block variant="primary" loading={saving} disabled={!(Number(amount) > 0)} onClick={handleCharge}>
                                    {Number(amount) > 0 ? `Cobrar ${formatMoney(amount)}` : 'Cobrar'}
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <Button variant={pending > 0 ? 'primary' : 'default'} icon={Wallet} block onClick={startCharge}>
                            {pending > 0 ? `Cobrar en caja ${formatMoney(pending)}` : 'Registrar otro cobro'}
                        </Button>
                    )}
                </>
            )}
        </div>
    );
}
