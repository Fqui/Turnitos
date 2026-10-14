import React, { useMemo, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import sportCanteenService, { PRODUCT_CATEGORIES } from '../../../services/sportCanteenService';
import { Button, EmptyState } from './CashUi';
import { ProductModal, RestockModal } from './CashModals';
import { formatMoney, stockStatus } from './cashFormat';

export default function StockTab({ business, products, onProductsChange, showToast }) {
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('Todos');
    const [showInactive, setShowInactive] = useState(false);
    const [editing, setEditing] = useState(null); // product | {} for new
    const [restocking, setRestocking] = useState(null);
    const [busyId, setBusyId] = useState(null);
    const [seeding, setSeeding] = useState(false);

    const activeCount = products.filter(p => p.is_active).length;
    const inactiveCount = products.length - activeCount;
    const categories = useMemo(() => ['Todos', ...PRODUCT_CATEGORIES.filter(c => products.some(p => p.category === c))], [products]);

    const visible = useMemo(() => {
        const q = search.trim().toLowerCase();
        return products.filter(p =>
            (showInactive ? !p.is_active : p.is_active) &&
            (category === 'Todos' || p.category === category) &&
            (!q || p.name.toLowerCase().includes(q))
        );
    }, [products, search, category, showInactive]);

    const upsert = (saved) => {
        onProductsChange(prev => {
            const exists = prev.some(p => p.id === saved.id);
            return exists ? prev.map(p => (p.id === saved.id ? saved : p)) : [...prev, saved];
        });
    };

    const handleSeed = async () => {
        if (seeding) return;
        setSeeding(true);
        try {
            const rows = await sportCanteenService.seedSuggestedProducts(business.id);
            onProductsChange(prev => [...prev, ...rows]);
            showToast?.(`Cargamos ${rows.length} artículos con stock 0. Ajustá precios y reponé lo que tengas.`, 'success');
        } catch (err) {
            showToast?.(err.message, 'error');
        } finally {
            setSeeding(false);
        }
    };

    const handleQuickAdjust = async (product, delta) => {
        if (busyId) return;
        setBusyId(product.id);
        try {
            upsert(await sportCanteenService.adjustStock(product.id, delta));
        } catch (err) {
            showToast?.(err.message, 'error');
        } finally {
            setBusyId(null);
        }
    };

    const handleRemove = async (product) => {
        if (busyId) return;
        if (!window.confirm(`¿Dar de baja "${product.name}"? Deja de aparecer para vender.`)) return;
        setBusyId(product.id);
        try {
            const result = await sportCanteenService.removeProduct(product);
            if (result === 'deleted') {
                onProductsChange(prev => prev.filter(p => p.id !== product.id));
                showToast?.('Artículo eliminado', 'success');
            } else {
                upsert({ ...product, is_active: false });
                showToast?.('Artículo dado de baja (tiene ventas, queda en el historial)', 'success');
            }
        } catch (err) {
            showToast?.(err.message, 'error');
        } finally {
            setBusyId(null);
        }
    };

    const handleReactivate = async (product) => {
        if (busyId) return;
        setBusyId(product.id);
        try {
            upsert(await sportCanteenService.setProductActive(product.id, true));
            showToast?.('Artículo reactivado', 'success');
        } catch (err) {
            showToast?.(err.message, 'error');
        } finally {
            setBusyId(null);
        }
    };

    const modals = (
        <>
            {editing && (
                <ProductModal
                    businessId={business.id}
                    product={editing}
                    onClose={() => setEditing(null)}
                    onSaved={(saved) => { upsert(saved); setEditing(null); }}
                    showToast={showToast}
                />
            )}
            {restocking && (
                <RestockModal
                    product={restocking}
                    onClose={() => setRestocking(null)}
                    onSaved={(saved) => { upsert(saved); setRestocking(null); }}
                    showToast={showToast}
                />
            )}
        </>
    );

    if (products.length === 0) {
        return (
            <div className="cc-card" style={{ maxWidth: '560px', padding: 0 }}>
                <EmptyState
                    title="Todavía no cargaste artículos"
                    text="Bebidas, pelotas, grips o alquiler de paletas: lo que vendas en el mostrador o sumes a un turno. Podés empezar con una lista sugerida (con stock en 0) y editarla."
                >
                    <Button variant="primary" loading={seeding} onClick={handleSeed}>Cargar lista sugerida</Button>
                    <Button icon={Plus} onClick={() => setEditing({})} disabled={seeding}>Nuevo artículo</Button>
                </EmptyState>
                {modals}
            </div>
        );
    }

    return (
        <>
            <div className="cc-toolbar">
                <div className="cc-search">
                    <Search size={16} />
                    <input className="cc-input" type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar artículo" />
                </div>
                <Button variant="primary" icon={Plus} onClick={() => setEditing({})}>Nuevo artículo</Button>
            </div>

            <div className="cc-card cc-card--flush">
                <div className="cc-section-head">
                    <div className="cc-chips">
                        {categories.map(c => (
                            <button key={c} type="button" className={`cc-chip${category === c ? ' is-active' : ''}`} onClick={() => setCategory(c)}>
                                {c}
                            </button>
                        ))}
                    </div>
                    {inactiveCount > 0 && (
                        <Button variant="link" onClick={() => setShowInactive(v => !v)}>
                            {showInactive ? `Ver activos (${activeCount})` : `Dados de baja (${inactiveCount})`}
                        </Button>
                    )}
                </div>

                {visible.length === 0 ? (
                    <div className="cc-muted" style={{ padding: '28px 20px', fontSize: '14px' }}>No hay artículos que coincidan.</div>
                ) : (
                    <div className="cc-ledger cc-ledger--products">
                        <div className="cc-ledger-head" aria-hidden="true">
                            <span>Artículo</span>
                            <span className="cc-cell-right">Precio</span>
                            <span className="cc-cell-right">Stock</span>
                            <span />
                        </div>
                        {visible.map(p => {
                            const status = stockStatus(p);
                            const busy = busyId === p.id;
                            const stockClass = status.tone === 'red' ? 'cc-neg' : status.tone === 'amber' ? 'cc-warn' : 'cc-stock-ok';
                            return (
                                <div key={p.id} className="cc-ledger-row" style={p.is_active ? undefined : { opacity: 0.6 }}>
                                    <div className="cc-cell-main">
                                        <div className="cc-cell-title">{p.name}</div>
                                        <div className="cc-cell-sub">{p.category}</div>
                                    </div>
                                    <span className="cc-cell-amount cc-cell-price">{formatMoney(p.sale_price)}</span>
                                    <div className="cc-cell-right cc-cell-stock">
                                        {p.track_stock ? (
                                            <>
                                                <span className={`cc-amount ${stockClass}`} style={{ fontWeight: 700 }}>{p.current_stock} u.</span>
                                                {(status.tone === 'red' || status.tone === 'amber') && <span className={stockClass} style={{ fontSize: '12px', marginLeft: '6px' }}>{status.tone === 'red' ? 'sin stock' : 'bajo'}</span>}
                                            </>
                                        ) : (
                                            <span className="cc-muted" style={{ fontSize: '13px' }}>No lleva stock</span>
                                        )}
                                    </div>
                                    <div className="cc-cell-action" style={{ gap: '4px', alignItems: 'center' }}>
                                        {p.is_active && p.track_stock && (
                                            <>
                                                <Button size="sm" className="cc-btn--icon" onClick={() => handleQuickAdjust(p, -1)} disabled={busy || p.current_stock <= 0} aria-label={`Restar 1 a ${p.name}`}>−</Button>
                                                <Button size="sm" className="cc-btn--icon" onClick={() => handleQuickAdjust(p, 1)} disabled={busy} aria-label={`Sumar 1 a ${p.name}`}>+</Button>
                                                <Button size="sm" onClick={() => setRestocking(p)} disabled={busy}>Reponer</Button>
                                            </>
                                        )}
                                        <Button size="sm" variant="ghost" onClick={() => setEditing(p)}>Editar</Button>
                                        {p.is_active ? (
                                            <Button size="sm" variant="ghost" onClick={() => handleRemove(p)} disabled={busy} aria-label={`Dar de baja ${p.name}`} title="Dar de baja">Baja</Button>
                                        ) : (
                                            <Button size="sm" variant="ghost" onClick={() => handleReactivate(p)} disabled={busy}>Reactivar</Button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {modals}
        </>
    );
}
