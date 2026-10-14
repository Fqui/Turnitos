import React, { useMemo, useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { summarizeMovements } from '../../../services/sportCanteenService';
import { Button, EmptyState, Kpi } from './CashUi';
import { CloseRegisterModal, CounterSaleModal, ManualMovementModal, MovementList, OpenRegisterForm, VoidMovementModal } from './CashModals';
import { formatMoney } from './cashFormat';

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
    const restock = useMemo(() => {
        const tracked = products.filter(p => p.is_active && p.track_stock && Number(p.current_stock) <= Number(p.min_stock_alert));
        return {
            out: tracked.filter(p => Number(p.current_stock) <= 0),
            low: tracked.filter(p => Number(p.current_stock) > 0)
        };
    }, [products]);

    const closeModal = () => setModal(null);
    const afterMovement = async () => {
        setModal(null);
        await onRefresh();
    };

    if (!register) {
        return (
            <div className="cc-card" style={{ maxWidth: '520px' }}>
                <EmptyState
                    title="No hay una caja abierta"
                    text="Abrila al empezar el turno con el efectivo que hay para cambio. Al cerrar, comparás lo que hay en el cajón con lo que debería haber."
                />
                <div style={{ padding: '0 20px 20px' }}>
                    <OpenRegisterForm businessId={business.id} onOpened={onRegisterOpened} showToast={showToast} />
                </div>
            </div>
        );
    }

    const bookingsCount = new Set(movements.filter(m => !m.voided_at && m.type === 'booking_income').map(m => m.booking_id || m.id)).size;
    const listName = (list) => list.slice(0, 4).map(p => p.name).join(', ') + (list.length > 4 ? ` y ${list.length - 4} más` : '');

    return (
        <>
            <div className="cc-kpis">
                <Kpi main label="Efectivo en caja" value={formatMoney(totals.cash)} hint={`Fondo inicial ${formatMoney(register.initial_cash)}`} />
                <Kpi label="Transferencias" value={formatMoney(totals.transfers)} />
                <Kpi label="Turnos" value={formatMoney(totals.bookings)} hint={`${bookingsCount} ${bookingsCount === 1 ? 'turno' : 'turnos'}`} />
                <Kpi label="Artículos" value={formatMoney(totals.canteen)} hint={totals.manualIncome > 0 ? `Otros ingresos ${formatMoney(totals.manualIncome)}` : undefined} />
                <Kpi label="Gastos" value={totals.expenses > 0 ? `-${formatMoney(totals.expenses)}` : formatMoney(0)} className={totals.expenses > 0 ? 'cc-neg' : ''} />
            </div>

            <div className="cc-actions">
                <Button variant="primary" className="cc-btn--main" onClick={() => setModal('sale')}>
                    Venta de mostrador
                </Button>
                <Button icon={Plus} onClick={() => setModal('manual_income')}>Ingreso</Button>
                <Button icon={Minus} onClick={() => setModal('manual_expense')}>Gasto</Button>
                <span className="cc-actions-spacer" />
                <Button variant="danger" className="cc-btn--close" onClick={() => setModal('close')}>
                    Cerrar caja
                </Button>
            </div>

            {(restock.out.length > 0 || restock.low.length > 0) && (
                <div className="cc-alert cc-alert--amber">
                    <span>
                        {restock.out.length > 0 && <span style={{ display: 'block' }}><strong>Sin stock:</strong> {listName(restock.out)}</span>}
                        {restock.low.length > 0 && <span style={{ display: 'block' }}><strong>Quedan pocos:</strong> {listName(restock.low)}</span>}
                    </span>
                </div>
            )}

            <div className="cc-card cc-card--flush">
                <div className="cc-section-head">
                    <h3 className="cc-card-title">
                        Movimientos
                        <span className="cc-muted" style={{ fontWeight: 500, marginLeft: '8px' }}>{totals.count}</span>
                    </h3>
                    <div className="cc-chips">
                        {FILTERS.map(f => (
                            <button key={f.id} type="button" className={`cc-chip${filter === f.id ? ' is-active' : ''}`} onClick={() => setFilter(f.id)}>
                                {f.label}
                            </button>
                        ))}
                    </div>
                </div>
                {visible.length === 0 ? (
                    <div className="cc-muted" style={{ padding: '28px 20px', fontSize: '14px' }}>
                        {movements.length === 0
                            ? 'Todavía no hay movimientos. Los turnos se cobran desde cada reserva.'
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
