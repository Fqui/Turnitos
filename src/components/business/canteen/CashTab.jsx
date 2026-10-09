import React, { useMemo, useState } from 'react';
import { Banknote, CalendarCheck, Landmark, Lock, LockOpen, Minus, Plus, ShoppingCart, TrendingDown } from 'lucide-react';
import { summarizeMovements } from '../../../services/sportCanteenService';
import { Button, EmptyState, StatCard } from './CashUi';
import { CloseRegisterModal, CounterSaleModal, ManualMovementModal, MovementList, OpenRegisterForm, VoidMovementModal } from './CashModals';
import { formatLongDate, formatMoney, formatTime } from './cashFormat';

const FILTERS = [
    { id: 'all', label: 'Todos' },
    { id: 'booking_income', label: 'Turnos' },
    { id: 'canteen_sale', label: 'Artículos' },
    { id: 'manual_income', label: 'Ingresos' },
    { id: 'manual_expense', label: 'Gastos' }
];

export default function CashTab({ business, register, movements, products, onRegisterOpened, onRegisterClosed, onRefresh, showToast }) {
    const [modal, setModal] = useState(null); // 'sale' | 'manual_income' | 'manual_expense' | 'close' | { void: movement }
    const [filter, setFilter] = useState('all');

    const totals = useMemo(() => summarizeMovements(movements, register?.initial_cash), [movements, register?.initial_cash]);
    const visible = useMemo(() => filter === 'all' ? movements : movements.filter(m => m.type === filter), [movements, filter]);
    const lowStock = useMemo(() => products.filter(p => p.is_active && p.track_stock && Number(p.current_stock) <= Number(p.min_stock_alert)), [products]);

    const closeModal = () => setModal(null);
    const afterMovement = async () => {
        setModal(null);
        await onRefresh();
    };

    if (!register) {
        return (
            <div className="cc-card">
                <EmptyState
                    icon={LockOpen}
                    title="La caja está cerrada"
                    text="Abrila al empezar el turno para cobrar turnos, vender artículos y anotar gastos. Al cerrar, comparás lo que hay en el cajón con lo que debería haber."
                />
                <div style={{ maxWidth: '400px', margin: '0 auto', paddingBottom: '12px' }}>
                    <OpenRegisterForm businessId={business.id} onOpened={onRegisterOpened} showToast={showToast} />
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="cc-card cc-status">
                <div className="cc-row">
                    <span className="cc-dot cc-dot--live" style={{ color: 'var(--cc-green)' }} />
                    <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '15px', fontWeight: 800 }}>Caja abierta</div>
                        <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                            {register.opened_by} · desde las {formatTime(register.opened_at)} · {formatLongDate(register.opened_at)}
                        </div>
                    </div>
                </div>
                <div className="cc-actions">
                    <Button variant="primary" icon={ShoppingCart} className="cc-btn--main" onClick={() => setModal('sale')}>
                        Venta de mostrador
                    </Button>
                    <Button icon={Plus} onClick={() => setModal('manual_income')}>Ingreso</Button>
                    <Button icon={Minus} onClick={() => setModal('manual_expense')}>Gasto</Button>
                    <Button variant="danger" icon={Lock} onClick={() => setModal('close')} style={{ gridColumn: '1 / -1' }}>
                        Cerrar caja
                    </Button>
                </div>
            </div>

            <div className="cc-stats">
                <StatCard
                    hero
                    icon={Banknote}
                    tone="green"
                    label="Efectivo en caja"
                    value={formatMoney(totals.cash)}
                    hint={`Fondo inicial ${formatMoney(register.initial_cash)}`}
                />
                <StatCard icon={Landmark} tone="blue" label="Transferencias" value={formatMoney(totals.transfers)} hint="Alias, CVU o Mercado Pago" />
                <StatCard
                    icon={CalendarCheck}
                    tone="blue"
                    label="Turnos cobrados"
                    value={formatMoney(totals.bookings)}
                    hint={`${movements.filter(m => !m.voided_at && m.type === 'booking_income').length} cobros`}
                />
                <StatCard
                    icon={ShoppingCart}
                    tone="green"
                    label="Artículos"
                    value={formatMoney(totals.canteen)}
                    hint={totals.expenses > 0 || totals.manualIncome > 0
                        ? `Gastos ${formatMoney(totals.expenses)} · Ingresos ${formatMoney(totals.manualIncome)}`
                        : 'Ventas de mostrador'}
                />
            </div>

            {lowStock.length > 0 && (
                <div className="cc-alert cc-alert--amber">
                    <TrendingDown size={18} style={{ flexShrink: 0 }} />
                    <span>
                        Stock bajo: {lowStock.slice(0, 4).map(p => `${p.name} (${p.current_stock})`).join(', ')}
                        {lowStock.length > 4 ? ` y ${lowStock.length - 4} más` : ''}
                    </span>
                </div>
            )}

            <div className="cc-card">
                <div className="cc-between" style={{ marginBottom: '8px' }}>
                    <div>
                        <h3 className="cc-card-title">Movimientos</h3>
                        <p className="cc-card-subtitle">
                            {totals.count} {totals.count === 1 ? 'movimiento' : 'movimientos'}
                            {totals.voidedCount > 0 ? ` · ${totals.voidedCount} anulado${totals.voidedCount === 1 ? '' : 's'}` : ''}
                        </p>
                    </div>
                    <div className="cc-chips">
                        {FILTERS.map(f => (
                            <button key={f.id} type="button" className={`cc-chip${filter === f.id ? ' is-active' : ''}`} onClick={() => setFilter(f.id)}>
                                {f.label}
                            </button>
                        ))}
                    </div>
                </div>
                {visible.length === 0 ? (
                    <div className="cc-muted" style={{ textAlign: 'center', padding: '32px 12px', fontSize: '14px' }}>
                        {movements.length === 0
                            ? 'Todavía no hay movimientos. Cobrá un turno desde la reserva o registrá una venta.'
                            : 'No hay movimientos de este tipo.'}
                    </div>
                ) : (
                    <MovementList movements={visible} onVoid={(m) => setModal({ void: m })} />
                )}
            </div>

            {modal === 'sale' && (
                <CounterSaleModal businessId={business.id} products={products} onClose={closeModal} onDone={afterMovement} showToast={showToast} />
            )}
            {(modal === 'manual_income' || modal === 'manual_expense') && (
                <ManualMovementModal businessId={business.id} type={modal} onClose={closeModal} onDone={afterMovement} showToast={showToast} />
            )}
            {modal?.void && (
                <VoidMovementModal movement={modal.void} onClose={closeModal} onDone={afterMovement} showToast={showToast} />
            )}
            {modal === 'close' && (
                <CloseRegisterModal
                    business={business}
                    register={register}
                    movements={movements}
                    onClose={closeModal}
                    onClosed={(closed) => { setModal(null); onRegisterClosed(closed); }}
                    showToast={showToast}
                />
            )}
        </>
    );
}
