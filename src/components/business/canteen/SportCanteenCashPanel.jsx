import React, { useCallback, useEffect, useState } from 'react';
import { History, Package, Wallet } from 'lucide-react';
import sportCanteenService from '../../../services/sportCanteenService';
import { Badge, Button, Spinner } from './CashUi';
import CashTab from './CashTab';
import StockTab from './StockTab';
import HistoryTab from './HistoryTab';

const TABS = [
    { id: 'caja', label: 'Caja', icon: Wallet },
    { id: 'stock', label: 'Artículos y stock', shortLabel: 'Artículos', icon: Package },
    { id: 'historial', label: 'Historial', icon: History }
];

/**
 * Registro de Caja Diaria para negocios de canchas: caja abierta, artículos y stock, historial de cierres.
 * Todos los datos salen de Supabase (ver sportCanteenService); nada se guarda en el navegador.
 */
export default function SportCanteenCashPanel({ business, showToast, isMobile = false }) {
    const [tab, setTab] = useState('caja');
    const [products, setProducts] = useState([]);
    const [register, setRegister] = useState(null);
    const [movements, setMovements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [historyKey, setHistoryKey] = useState(0);

    const businessId = business?.id;

    const loadRegister = useCallback(async () => {
        const open = await sportCanteenService.getOpenRegister(businessId);
        setRegister(open);
        setMovements(open ? await sportCanteenService.listMovements(open.id) : []);
    }, [businessId]);

    const loadAll = useCallback(async () => {
        if (!businessId) return;
        setLoading(true);
        setError('');
        try {
            const [prods] = await Promise.all([
                sportCanteenService.listProducts(businessId),
                loadRegister()
            ]);
            setProducts(prods);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [businessId, loadRegister]);

    useEffect(() => {
        loadAll();
    }, [loadAll]);

    // After a movement: refresh the register (another device may have changed it) and stock
    const refresh = useCallback(async () => {
        try {
            const [prods] = await Promise.all([sportCanteenService.listProducts(businessId), loadRegister()]);
            setProducts(prods);
        } catch (err) {
            showToast?.(err.message, 'error');
        }
    }, [businessId, loadRegister, showToast]);

    // Another device (or the booking modal) may have changed the register: refresh when coming back to the app
    useEffect(() => {
        const onVisible = () => {
            if (document.visibilityState === 'visible' && !loading && !error) refresh();
        };
        document.addEventListener('visibilitychange', onVisible);
        return () => document.removeEventListener('visibilitychange', onVisible);
    }, [refresh, loading, error]);

    const handleOpened = async (reg) => {
        setRegister(reg);
        try {
            setMovements(await sportCanteenService.listMovements(reg.id));
        } catch (err) {
            showToast?.(err.message, 'error');
        }
    };

    const handleClosed = () => {
        setRegister(null);
        setMovements([]);
        setHistoryKey(k => k + 1);
    };

    if (!business) return null;

    return (
        <div className="cc-root">
            <div className="cc-header">
                <div style={{ minWidth: 0 }}>
                    <div className="cc-row" style={{ gap: '10px', flexWrap: 'wrap' }}>
                        <h2>Registro de Caja</h2>
                        {!loading && !error && (
                            register
                                ? <Badge tone="green"><span className="cc-dot" /> Abierta</Badge>
                                : <Badge>Cerrada</Badge>
                        )}
                    </div>
                    <p>Cobros de turnos, venta de artículos, gastos y arqueo de cada turno.</p>
                </div>
                <div className="cc-tabs" role="tablist" aria-label="Secciones de caja">
                    {TABS.map(t => (
                        <button
                            key={t.id}
                            type="button"
                            role="tab"
                            aria-selected={tab === t.id}
                            className={`cc-tab${tab === t.id ? ' is-active' : ''}`}
                            onClick={() => setTab(t.id)}
                        >
                            <t.icon size={16} aria-hidden="true" />
                            {isMobile && t.shortLabel ? t.shortLabel : t.label}
                            {t.id === 'stock' && products.length > 0 && <span className="cc-tab-count">{products.filter(p => p.is_active).length}</span>}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="cc-card cc-loading"><Spinner large /><span>Cargando caja...</span></div>
            ) : error ? (
                <div className="cc-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'flex-start' }}>
                    <div className="cc-alert" style={{ width: '100%' }}>{error}</div>
                    <Button onClick={loadAll}>Reintentar</Button>
                </div>
            ) : tab === 'caja' ? (
                <CashTab
                    business={business}
                    register={register}
                    movements={movements}
                    products={products}
                    onRegisterOpened={handleOpened}
                    onRegisterClosed={handleClosed}
                    onRefresh={refresh}
                    showToast={showToast}
                />
            ) : tab === 'stock' ? (
                <StockTab business={business} products={products} onProductsChange={setProducts} showToast={showToast} />
            ) : (
                <HistoryTab business={business} refreshKey={historyKey} showToast={showToast} />
            )}
        </div>
    );
}
