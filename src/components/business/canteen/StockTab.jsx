import React, { useMemo, useState } from 'react';
import { Archive, Package, PackagePlus, Pencil, Plus, RotateCcw, Search, Sparkles } from 'lucide-react';
import sportCanteenService, { PRODUCT_CATEGORIES } from '../../../services/sportCanteenService';
import { Badge, Button, EmptyState } from './CashUi';
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

    if (products.length === 0) {
        return (
            <div className="cc-card">
                <EmptyState
                    icon={Package}
                    title="Todavía no cargaste artículos"
                    text="Bebidas, pelotas, grips o alquiler de paletas: lo que vendas en el mostrador o sumes a un turno. Podés empezar con una lista sugerida y editarla."
                >
                    <Button variant="primary" icon={Sparkles} loading={seeding} onClick={handleSeed}>Cargar artículos sugeridos</Button>
                    <Button icon={Plus} onClick={() => setEditing({})} disabled={seeding}>Nuevo artículo</Button>
                </EmptyState>
                {editing && (
                    <ProductModal businessId={business.id} product={editing} onClose={() => setEditing(null)} onSaved={(saved) => { upsert(saved); setEditing(null); }} showToast={showToast} />
                )}
            </div>
        );
    }

    return (
        <>
            <div className="cc-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div className="cc-toolbar">
                    <div className="cc-search">
                        <Search size={18} />
                        <input className="cc-input" type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar artículo" />
                    </div>
                    <Button variant="primary" icon={Plus} onClick={() => setEditing({})}>Nuevo artículo</Button>
                </div>
                <div className="cc-between">
                    <div className="cc-chips">
                        {categories.map(c => (
                            <button key={c} type="button" className={`cc-chip${category === c ? ' is-active' : ''}`} onClick={() => setCategory(c)}>
                                {c}
                            </button>
                        ))}
                    </div>
                    {inactiveCount > 0 && (
                        <Button size="sm" variant="ghost" icon={showInactive ? Package : Archive} onClick={() => setShowInactive(v => !v)}>
                            {showInactive ? `Ver activos (${activeCount})` : `Dados de baja (${inactiveCount})`}
                        </Button>
                    )}
                </div>
            </div>

            {visible.length === 0 ? (
                <div className="cc-card cc-muted" style={{ textAlign: 'center', fontSize: '14px' }}>No hay artículos que coincidan.</div>
            ) : (
                <div className="cc-products">
                    {visible.map(p => {
                        const status = stockStatus(p);
                        const busy = busyId === p.id;
                        return (
                            <div key={p.id} className={`cc-product${p.is_active ? '' : ' is-inactive'}`}>
                                <div className="cc-between" style={{ alignItems: 'flex-start', flexWrap: 'nowrap' }}>
                                    <div style={{ minWidth: 0 }}>
                                        <span className="cc-overline">{p.category}</span>
                                        <h4 className="cc-product-name">{p.name}</h4>
                                    </div>
                                    <div className="cc-row" style={{ gap: '2px', flexShrink: 0 }}>
                                        <Button size="sm" variant="ghost" className="cc-btn--icon" onClick={() => setEditing(p)} aria-label={`Editar ${p.name}`} title="Editar">
                                            <Pencil size={16} />
                                        </Button>
                                        {p.is_active ? (
                                            <Button size="sm" variant="ghost" className="cc-btn--icon" onClick={() => handleRemove(p)} disabled={busy} aria-label={`Dar de baja ${p.name}`} title="Dar de baja">
                                                <Archive size={16} />
                                            </Button>
                                        ) : (
                                            <Button size="sm" variant="ghost" className="cc-btn--icon" onClick={() => handleReactivate(p)} disabled={busy} aria-label={`Reactivar ${p.name}`} title="Reactivar">
                                                <RotateCcw size={16} />
                                            </Button>
                                        )}
                                    </div>
                                </div>

                                <div className="cc-product-figures">
                                    <div>
                                        <span className="cc-label">Precio</span>
                                        <strong>{formatMoney(p.sale_price)}</strong>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <span className="cc-label">Stock</span>
                                        <strong className={status.tone === 'red' ? 'cc-neg' : status.tone === 'amber' ? 'cc-warn' : ''}>
                                            {p.track_stock ? `${p.current_stock} u.` : '—'}
                                        </strong>
                                    </div>
                                </div>

                                <div className="cc-between" style={{ flexWrap: 'nowrap' }}>
                                    <Badge tone={status.tone}>{status.label}</Badge>
                                    {p.track_stock && p.is_active && (
                                        <div className="cc-row" style={{ gap: '6px' }}>
                                            <Button size="sm" className="cc-btn--icon" onClick={() => handleQuickAdjust(p, -1)} disabled={busy || p.current_stock <= 0} aria-label="Restar 1">
                                                -1
                                            </Button>
                                            <Button size="sm" className="cc-btn--icon" onClick={() => handleQuickAdjust(p, 1)} disabled={busy} aria-label="Sumar 1">
                                                +1
                                            </Button>
                                            <Button size="sm" icon={PackagePlus} onClick={() => setRestocking(p)} disabled={busy}>Reponer</Button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

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
}
