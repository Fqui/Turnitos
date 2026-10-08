import React, { useState, useEffect, useMemo } from 'react';
import sportCanteenService from '../../../services/sportCanteenService';

export default function SportCanteenCashPanel({
    business,
    bookings = [],
    showToast,
    isMobile = false,
    onUpdateBusiness
}) {
    const [activeSubTab, setActiveSubTab] = useState('caja'); // 'caja' | 'inventario'
    const [loading, setLoading] = useState(true);

    // Products / Inventory State
    const [products, setProducts] = useState([]);
    const [productSearch, setProductSearch] = useState('');
    const [productCategoryFilter, setProductCategoryFilter] = useState('Todos');
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);

    // Cash Register Session State
    const [currentSession, setCurrentSession] = useState(null);
    const [isOpenSessionModalOpen, setIsOpenSessionModalOpen] = useState(false);
    const [isCloseSessionModalOpen, setIsCloseSessionModalOpen] = useState(false);
    const [isFastSaleModalOpen, setIsFastSaleModalOpen] = useState(false);
    const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);

    // Form states
    const [openSessionForm, setOpenSessionForm] = useState({ initialCash: 10000, openedBy: 'Encargado' });
    const [closeSessionForm, setCloseSessionForm] = useState({ countedCash: '', notes: '', closedBy: '' });
    const [expenseForm, setExpenseForm] = useState({ amount: '', description: '', paymentMethod: 'cash' });
    const [fastSaleCart, setFastSaleCart] = useState({});
    const [fastSalePaymentMethod, setFastSalePaymentMethod] = useState('cash');
    const [movementFilter, setMovementFilter] = useState('all'); // 'all' | 'booking' | 'canteen' | 'expense'

    // Load Initial Data
    const loadData = async () => {
        if (!business?.id) return;
        setLoading(true);
        try {
            const [prods, sess] = await Promise.all([
                sportCanteenService.getProducts(business.id, business.metadata),
                sportCanteenService.getCurrentCashSession(business.id, business.metadata)
            ]);
            setProducts(prods || []);
            setCurrentSession(sess || null);
        } catch (e) {
            console.error('Error cargando datos de caja:', e);
            if (showToast) showToast('Error cargando datos de caja', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [business?.id]);

    // Categories derived from products
    const categories = useMemo(() => {
        const set = new Set(['Todos', 'Bebidas', 'Equipamiento', 'Snacks', 'Alquileres']);
        products.forEach(p => { if (p.category) set.add(p.category); });
        return Array.from(set);
    }, [products]);

    // Filtered products
    const filteredProducts = useMemo(() => {
        return products.filter(p => {
            const matchesCat = productCategoryFilter === 'Todos' || p.category === productCategoryFilter;
            const matchesSearch = !productSearch || p.name?.toLowerCase().includes(productSearch.toLowerCase());
            return matchesCat && matchesSearch;
        });
    }, [products, productCategoryFilter, productSearch]);

    // Quick Stock Adjustments
    const handleAdjustStock = async (prodId, delta) => {
        try {
            const updated = await sportCanteenService.adjustStock(business.id, prodId, delta, business.metadata);
            if (updated) {
                setProducts(prev => prev.map(p => String(p.id) === String(prodId) ? { ...p, current_stock: updated.current_stock } : p));
                if (showToast) showToast(`Stock actualizado (${delta > 0 ? `+${delta}` : delta})`, 'success');
            }
        } catch (e) {
            if (showToast) showToast('Error al actualizar stock', 'error');
        }
    };

    // Save Product
    const handleSaveProduct = async (e) => {
        e.preventDefault();
        if (!editingProduct?.name?.trim()) {
            if (showToast) showToast('Ingresá el nombre del producto', 'warning');
            return;
        }

        try {
            const saved = await sportCanteenService.saveProduct(business.id, editingProduct, business.metadata);
            if (saved) {
                setProducts(prev => {
                    const exists = prev.some(p => String(p.id) === String(saved.id));
                    return exists ? prev.map(p => String(p.id) === String(saved.id) ? saved : p) : [...prev, saved];
                });
                setIsProductModalOpen(false);
                setEditingProduct(null);
                if (showToast) showToast('Producto guardado correctamente', 'success');
            }
        } catch (e) {
            if (showToast) showToast('Error al guardar producto', 'error');
        }
    };

    // Delete Product
    const handleDeleteProduct = async (prodId) => {
        if (!window.confirm('¿Eliminar este producto?')) return;
        try {
            await sportCanteenService.deleteProduct(business.id, prodId, business.metadata);
            setProducts(prev => prev.filter(p => String(p.id) !== String(prodId)));
            if (showToast) showToast('Producto eliminado', 'info');
        } catch (e) {
            if (showToast) showToast('Error al eliminar producto', 'error');
        }
    };

    // Open Cash Session
    const handleOpenSession = async (e) => {
        e.preventDefault();
        try {
            const sess = await sportCanteenService.openCashSession(business.id, {
                initialCash: openSessionForm.initialCash,
                openedBy: openSessionForm.openedBy
            }, business.metadata);
            setCurrentSession(sess);
            if (onUpdateBusiness && business) {
                onUpdateBusiness({
                    ...business,
                    metadata: { ...(business.metadata || {}), active_cash_register: sess }
                });
            }
            setIsOpenSessionModalOpen(false);
            if (showToast) showToast('🟢 Caja abierta con éxito', 'success');
        } catch (e) {
            if (showToast) showToast('Error al abrir la caja', 'error');
        }
    };

    // Fast Canteen Sale (Mostrador)
    const handleConfirmFastSale = async () => {
        const items = Object.entries(fastSaleCart)
            .filter(([_, qty]) => qty > 0)
            .map(([id, qty]) => {
                const prod = products.find(p => String(p.id) === String(id));
                return {
                    productId: id,
                    name: prod?.name || 'Producto',
                    quantity: qty,
                    price: Number(prod?.sale_price) || 0
                };
            });

        if (items.length === 0) {
            if (showToast) showToast('Seleccioná al menos un producto', 'warning');
            return;
        }

        const total = items.reduce((acc, it) => acc + (it.price * it.quantity), 0);
        const description = `Venta mostrador: ${items.map(i => `${i.quantity}x ${i.name}`).join(', ')}`;

        try {
            await sportCanteenService.registerMovement(business.id, {
                sessionId: currentSession?.id,
                type: 'canteen_sale',
                paymentMethod: fastSalePaymentMethod,
                amount: total,
                description,
                itemsDetail: items
            }, business.metadata);

            // Reload data to reflect stock and movements
            await loadData();
            setFastSaleCart({});
            setIsFastSaleModalOpen(false);
            if (showToast) showToast(`¡Venta cobrada! ($${total.toLocaleString('es-AR')})`, 'success');
        } catch (e) {
            if (showToast) showToast('Error al procesar la venta', 'error');
        }
    };

    // Register Expense
    const handleRegisterExpense = async (e) => {
        e.preventDefault();
        const amt = Number(expenseForm.amount);
        if (!amt || amt <= 0 || !expenseForm.description?.trim()) {
            if (showToast) showToast('Completá el monto y el concepto del gasto', 'warning');
            return;
        }

        try {
            await sportCanteenService.registerMovement(business.id, {
                sessionId: currentSession?.id,
                type: 'manual_expense',
                paymentMethod: expenseForm.paymentMethod,
                amount: amt,
                description: `Gasto: ${expenseForm.description.trim()}`
            }, business.metadata);

            await loadData();
            setExpenseForm({ amount: '', description: '', paymentMethod: 'cash' });
            setIsExpenseModalOpen(false);
            if (showToast) showToast('Gasto registrado en caja', 'info');
        } catch (e) {
            if (showToast) showToast('Error al registrar gasto', 'error');
        }
    };

    // Close Cash Session
    const handleCloseSession = async (e) => {
        e.preventDefault();
        if (closeSessionForm.countedCash === '') {
            if (showToast) showToast('Ingresá el efectivo contado en mano', 'warning');
            return;
        }

        try {
            const closed = await sportCanteenService.closeCashSession(business.id, currentSession?.id, {
                finalCashCounted: Number(closeSessionForm.countedCash) || 0,
                notes: closeSessionForm.notes,
                closedBy: closeSessionForm.closedBy || currentSession?.opened_by || 'Encargado',
                expectedCash: currentSession?.expected_cash || 0,
                expectedTransfers: currentSession?.expected_transfers || 0
            }, business.metadata);

            // Generar reporte WhatsApp
            const reportMsg = sportCanteenService.generateWhatsAppReport(business, closed, currentSession?.movements || []);
            
            setIsCloseSessionModalOpen(false);
            setCurrentSession(null);
            if (onUpdateBusiness && business) {
                onUpdateBusiness({
                    ...business,
                    metadata: { ...(business.metadata || {}), active_cash_register: null }
                });
            }
            await loadData();

            if (showToast) showToast('🔒 Caja cerrada correctamente', 'success');

            // Abrir WhatsApp con el reporte si el usuario lo desea
            const encoded = encodeURIComponent(reportMsg);
            const waUrl = business?.phone ? `https://wa.me/${business.phone.replace(/\D/g, '')}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
            window.open(waUrl, '_blank');
        } catch (e) {
            if (showToast) showToast('Error al cerrar caja', 'error');
        }
    };

    // Calculate active session metrics
    const sessionMetrics = useMemo(() => {
        if (!currentSession) {
            return { expectedCash: 0, expectedTransfers: 0, canteenTotal: 0, expensesTotal: 0, totalTurnos: 0 };
        }

        let cash = Number(currentSession.initial_cash || 0);
        let trans = 0;
        let canteen = 0;
        let expenses = 0;
        let turnos = 0;

        (currentSession.movements || []).forEach(m => {
            const amt = Number(m.amount) || 0;
            if (m.type === 'manual_expense') {
                expenses += amt;
                if (m.payment_method === 'cash') cash -= amt;
                else trans -= amt;
            } else {
                if (m.type === 'canteen_sale') canteen += amt;
                if (m.type === 'booking_income') turnos += amt;

                if (m.payment_method === 'cash') cash += amt;
                else trans += amt;
            }
        });

        return {
            expectedCash: Math.max(0, cash),
            expectedTransfers: Math.max(0, trans),
            canteenTotal: canteen,
            expensesTotal: expenses,
            totalTurnos: turnos,
            totalFacturado: canteen + turnos
        };
    }, [currentSession]);

    // Movements filtered
    const filteredMovements = useMemo(() => {
        if (!currentSession?.movements) return [];
        return currentSession.movements.filter(m => {
            if (movementFilter === 'booking') return m.type === 'booking_income';
            if (movementFilter === 'canteen') return m.type === 'canteen_sale';
            if (movementFilter === 'expense') return m.type === 'manual_expense';
            return true;
        });
    }, [currentSession?.movements, movementFilter]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '1200px', margin: '0 auto', width: '100%', paddingBottom: '40px' }}>
            {/* Header & Subtab Bar */}
            <div style={{
                background: 'var(--bg-card)',
                borderRadius: '18px',
                border: '1px solid var(--border)',
                padding: '20px 24px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '16px'
            }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '26px' }}>💰</span>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: 'var(--text-primary)' }}>
                                Registro de Caja Diaria
                            </h2>
                            <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
                                Control de ingresos, egresos, arqueo de turno y stock de artículos para canchas y predios deportivos.
                            </p>
                        </div>
                    </div>
                </div>

                {/* SubTab Toggle */}
                <div style={{
                    display: 'flex',
                    background: 'var(--bg-main)',
                    borderRadius: '12px',
                    padding: '4px',
                    border: '1px solid var(--border)',
                    gap: '4px'
                }}>
                    <button
                        type="button"
                        onClick={() => setActiveSubTab('caja')}
                        style={{
                            padding: '8px 18px',
                            borderRadius: '10px',
                            border: 'none',
                            background: activeSubTab === 'caja' ? 'var(--primary-paddle, #10b981)' : 'transparent',
                            color: activeSubTab === 'caja' ? '#000' : 'var(--text-secondary)',
                            fontWeight: '700',
                            fontSize: '13px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            transition: 'all 0.2s'
                        }}
                    >
                        💰 Caja & Arqueo
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveSubTab('inventario')}
                        style={{
                            padding: '8px 18px',
                            borderRadius: '10px',
                            border: 'none',
                            background: activeSubTab === 'inventario' ? 'var(--primary-paddle, #10b981)' : 'transparent',
                            color: activeSubTab === 'inventario' ? '#000' : 'var(--text-secondary)',
                            fontWeight: '700',
                            fontSize: '13px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            transition: 'all 0.2s'
                        }}
                    >
                        📦 Artículos y Stock ({products.length})
                    </button>
                </div>
            </div>

            {/* ============================================================ */}
            {/* SUBTAB 1: CAJA DEL DÍA Y ARQUEO                             */}
            {/* ============================================================ */}
            {activeSubTab === 'caja' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {!currentSession ? (
                        /* Caja Cerrada: Banner de Apertura */
                        <div style={{
                            background: 'var(--bg-card)',
                            borderRadius: '18px',
                            border: '1.5px dashed var(--border)',
                            padding: '48px 24px',
                            textAlign: 'center',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '14px'
                        }}>
                            <div style={{
                                width: '64px',
                                height: '64px',
                                borderRadius: '50%',
                                background: 'rgba(239, 68, 68, 0.1)',
                                color: '#ef4444',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '28px'
                            }}>
                                🔒
                            </div>
                            <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: 'var(--text-primary)' }}>
                                La Caja Diaria está Cerrada
                            </h3>
                            <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary)', maxWidth: '480px' }}>
                                Abrí el turno para comenzar a registrar los cobros de canchas, ventas de artículos en mostrador y egresos del día.
                            </p>
                            <button
                                type="button"
                                onClick={() => setIsOpenSessionModalOpen(true)}
                                style={{
                                    marginTop: '8px',
                                    padding: '12px 28px',
                                    borderRadius: '12px',
                                    border: 'none',
                                    background: 'var(--primary-paddle, #10b981)',
                                    color: '#000',
                                    fontWeight: '800',
                                    fontSize: '15px',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)'
                                }}
                            >
                                🟢 Iniciar Turno / Abrir Caja
                            </button>
                        </div>
                    ) : (
                        /* Caja Abierta: Dashboard Operativo */
                        <>
                            {/* Barra de Estado y Acciones Rápidas */}
                            <div style={{
                                background: 'var(--bg-card)',
                                borderRadius: '18px',
                                border: '1px solid var(--border)',
                                padding: '16px 20px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                flexWrap: 'wrap',
                                gap: '14px'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{
                                        width: '12px',
                                        height: '12px',
                                        borderRadius: '50%',
                                        background: '#10b981',
                                        boxShadow: '0 0 10px #10b981'
                                    }} />
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <strong style={{ fontSize: '15px', color: 'var(--text-primary)' }}>Caja Abierta</strong>
                                            <span style={{ fontSize: '12px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', padding: '2px 8px', borderRadius: '6px', fontWeight: '700' }}>
                                                En curso
                                            </span>
                                        </div>
                                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                            Turno de: <strong>{currentSession.opened_by}</strong> • Desde las {new Date(currentSession.opened_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} hs
                                        </div>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                    <button
                                        type="button"
                                        onClick={() => setIsFastSaleModalOpen(true)}
                                        style={{
                                            padding: '10px 18px',
                                            borderRadius: '12px',
                                            border: 'none',
                                            background: 'var(--primary-paddle, #10b981)',
                                            color: '#000',
                                            fontWeight: '700',
                                            fontSize: '13px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px'
                                        }}
                                    >
                                        ⚡ Venta de Artículos
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setIsExpenseModalOpen(true)}
                                        style={{
                                            padding: '10px 16px',
                                            borderRadius: '12px',
                                            border: '1px solid var(--border)',
                                            background: 'var(--bg-main)',
                                            color: 'var(--text-primary)',
                                            fontWeight: '700',
                                            fontSize: '13px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px'
                                        }}
                                    >
                                        ➖ Registrar Gasto
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setCloseSessionForm({
                                                countedCash: '',
                                                notes: '',
                                                closedBy: currentSession.opened_by || 'Encargado'
                                            });
                                            setIsCloseSessionModalOpen(true);
                                        }}
                                        style={{
                                            padding: '10px 16px',
                                            borderRadius: '12px',
                                            border: '1px solid #ef4444',
                                            background: 'rgba(239, 68, 68, 0.08)',
                                            color: '#ef4444',
                                            fontWeight: '700',
                                            fontSize: '13px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px'
                                        }}
                                    >
                                        🔒 Cerrar Caja / Arqueo
                                    </button>
                                </div>
                            </div>

                            {/* 4 Métricas Clave */}
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)',
                                gap: '16px'
                            }}>
                                <div style={{ background: 'var(--bg-card)', padding: '18px', borderRadius: '16px', border: '1px solid var(--border)' }}>
                                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600' }}>💵 Efectivo en Cajón</span>
                                    <div style={{ fontSize: '24px', fontWeight: '800', color: '#10b981', marginTop: '4px' }}>
                                        ${sessionMetrics.expectedCash.toLocaleString('es-AR')}
                                    </div>
                                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                        Fondo inicial: ${Number(currentSession.initial_cash || 0).toLocaleString('es-AR')}
                                    </span>
                                </div>

                                <div style={{ background: 'var(--bg-card)', padding: '18px', borderRadius: '16px', border: '1px solid var(--border)' }}>
                                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600' }}>📲 Transferencias / Alias</span>
                                    <div style={{ fontSize: '24px', fontWeight: '800', color: '#3b82f6', marginTop: '4px' }}>
                                        ${sessionMetrics.expectedTransfers.toLocaleString('es-AR')}
                                    </div>
                                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                        Cobrado por Mercado Pago/bancos
                                    </span>
                                </div>

                                <div style={{ background: 'var(--bg-card)', padding: '18px', borderRadius: '16px', border: '1px solid var(--border)' }}>
                                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600' }}>🛍️ Venta de Artículos</span>
                                    <div style={{ fontSize: '24px', fontWeight: '800', color: '#f59e0b', marginTop: '4px' }}>
                                        ${sessionMetrics.canteenTotal.toLocaleString('es-AR')}
                                    </div>
                                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                        Artículos y consumos cobrados
                                    </span>
                                </div>

                                <div style={{ background: 'var(--bg-card)', padding: '18px', borderRadius: '16px', border: '1px solid var(--border)' }}>
                                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600' }}>💸 Egresos / Gastos</span>
                                    <div style={{ fontSize: '24px', fontWeight: '800', color: '#ef4444', marginTop: '4px' }}>
                                        ${sessionMetrics.expensesTotal.toLocaleString('es-AR')}
                                    </div>
                                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                        Pagos de hielo, insumos, etc.
                                    </span>
                                </div>
                            </div>

                            {/* Historial de Movimientos de la Sesión */}
                            <div style={{ background: 'var(--bg-card)', borderRadius: '18px', border: '1px solid var(--border)', padding: '20px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                                    <div>
                                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)' }}>
                                            Movimientos del Turno ({filteredMovements.length})
                                        </h3>
                                        <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                                            Registro en tiempo real de cobros, salidas y ventas.
                                        </p>
                                    </div>

                                    {/* Filtro de movimientos */}
                                    <div style={{ display: 'flex', gap: '6px', background: 'var(--bg-main)', padding: '4px', borderRadius: '10px', border: '1px solid var(--border)' }}>
                                        {[
                                            { id: 'all', label: 'Todos' },
                                            { id: 'canteen', label: 'Artículos' },
                                            { id: 'booking', label: 'Turnos' },
                                            { id: 'expense', label: 'Gastos' }
                                        ].map(f => (
                                            <button
                                                key={f.id}
                                                type="button"
                                                onClick={() => setMovementFilter(f.id)}
                                                style={{
                                                    padding: '4px 10px',
                                                    borderRadius: '6px',
                                                    border: 'none',
                                                    background: movementFilter === f.id ? 'var(--bg-card)' : 'transparent',
                                                    color: movementFilter === f.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                                                    fontWeight: '700',
                                                    fontSize: '12px',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                {f.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {filteredMovements.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '36px', color: 'var(--text-secondary)', fontSize: '13px' }}>
                                        Aún no hay movimientos registrados en este turno.
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        {filteredMovements.map(m => {
                                            const isExpense = m.type === 'manual_expense';
                                            const isCanteen = m.type === 'canteen_sale';
                                            const isBooking = m.type === 'booking_income';
                                            const time = m.created_at ? new Date(m.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) : '';

                                            return (
                                                <div
                                                    key={m.id || Math.random()}
                                                    style={{
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        alignItems: 'center',
                                                        padding: '12px 16px',
                                                        borderRadius: '12px',
                                                        background: 'var(--bg-main)',
                                                        border: '1px solid var(--border)',
                                                        gap: '12px'
                                                    }}
                                                >
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                        <span style={{ fontSize: '20px' }}>
                                                            {isExpense ? '💸' : isCanteen ? '🍻' : isBooking ? '🎾' : '➕'}
                                                        </span>
                                                        <div>
                                                            <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>
                                                                {m.description}
                                                            </div>
                                                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                                <span>{time} hs</span>
                                                                <span>•</span>
                                                                <span style={{
                                                                    fontSize: '11px',
                                                                    padding: '1px 6px',
                                                                    borderRadius: '4px',
                                                                    background: m.payment_method === 'cash' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                                                                    color: m.payment_method === 'cash' ? '#10b981' : '#3b82f6',
                                                                    fontWeight: '700'
                                                                }}>
                                                                    {m.payment_method === 'cash' ? '💵 Efectivo' : '📲 Transferencia'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div style={{
                                                        fontSize: '16px',
                                                        fontWeight: '800',
                                                        color: isExpense ? '#ef4444' : '#10b981'
                                                    }}>
                                                        {isExpense ? '-' : '+'}${Number(m.amount).toLocaleString('es-AR')}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* ============================================================ */}
            {/* SUBTAB 2: INVENTARIO DE CANTINA                              */}
            {/* ============================================================ */}
            {activeSubTab === 'inventario' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {/* Barra de Filtros y Acción */}
                    <div style={{
                        background: 'var(--bg-card)',
                        borderRadius: '18px',
                        border: '1px solid var(--border)',
                        padding: '16px 20px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '12px'
                    }}>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flex: 1, minWidth: '240px' }}>
                            <input
                                type="text"
                                placeholder="🔍 Buscar bebida, snack, pelota..."
                                value={productSearch}
                                onChange={(e) => setProductSearch(e.target.value)}
                                style={{
                                    width: '100%',
                                    maxWidth: '300px',
                                    padding: '10px 14px',
                                    borderRadius: '10px',
                                    border: '1px solid var(--border)',
                                    background: 'var(--bg-main)',
                                    color: 'var(--text-primary)',
                                    fontSize: '13px'
                                }}
                            />

                            <select
                                value={productCategoryFilter}
                                onChange={(e) => setProductCategoryFilter(e.target.value)}
                                style={{
                                    padding: '10px 14px',
                                    borderRadius: '10px',
                                    border: '1px solid var(--border)',
                                    background: 'var(--bg-main)',
                                    color: 'var(--text-primary)',
                                    fontSize: '13px',
                                    cursor: 'pointer'
                                }}
                            >
                                {categories.map(c => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                        </div>

                        <button
                            type="button"
                            onClick={() => {
                                setEditingProduct({
                                    name: '',
                                    category: 'Bebidas',
                                    sale_price: '',
                                    cost_price: '',
                                    current_stock: 12,
                                    min_stock_alert: 4,
                                    is_active: true
                                });
                                setIsProductModalOpen(true);
                            }}
                            style={{
                                padding: '10px 18px',
                                borderRadius: '12px',
                                border: 'none',
                                background: 'var(--primary-paddle, #10b981)',
                                color: '#000',
                                fontWeight: '700',
                                fontSize: '13px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                            }}
                        >
                            ＋ Nuevo Artículo
                        </button>
                    </div>

                    {/* Grilla de Productos */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(280px, 1fr))',
                        gap: '16px'
                    }}>
                        {filteredProducts.map(p => {
                            const isLowStock = p.current_stock <= (p.min_stock_alert || 5) && p.current_stock > 0;
                            const isOutOfStock = p.current_stock === 0;

                            return (
                                <div
                                    key={p.id}
                                    style={{
                                        background: 'var(--bg-card)',
                                        borderRadius: '16px',
                                        border: isOutOfStock ? '1px solid #ef4444' : isLowStock ? '1px solid #f59e0b' : '1px solid var(--border)',
                                        padding: '18px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '12px',
                                        position: 'relative'
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                                        <div>
                                            <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: '700', letterSpacing: '0.5px' }}>
                                                {p.category || 'General'}
                                            </span>
                                            <h4 style={{ margin: '2px 0 0 0', fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)' }}>
                                                {p.name}
                                            </h4>
                                        </div>
                                        <div style={{ display: 'flex', gap: '6px' }}>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setEditingProduct({ ...p });
                                                    setIsProductModalOpen(true);
                                                }}
                                                style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '14px' }}
                                                title="Editar"
                                            >
                                                ✏️
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteProduct(p.id)}
                                                style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '14px' }}
                                                title="Eliminar"
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    </div>

                                    {/* Precio y Stock */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', background: 'var(--bg-main)', padding: '10px 14px', borderRadius: '12px' }}>
                                        <div>
                                            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Precio Venta</span>
                                            <div style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)' }}>
                                                ${Number(p.sale_price).toLocaleString('es-AR')}
                                            </div>
                                        </div>

                                        <div style={{ textAlign: 'right' }}>
                                            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Stock Actual</span>
                                            <div style={{
                                                fontSize: '18px',
                                                fontWeight: '800',
                                                color: isOutOfStock ? '#ef4444' : isLowStock ? '#f59e0b' : '#10b981'
                                            }}>
                                                {p.current_stock} un.
                                            </div>
                                        </div>
                                    </div>

                                    {/* Controles Rápidos de Stock */}
                                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                        <button
                                            type="button"
                                            disabled={p.current_stock <= 0}
                                            onClick={() => handleAdjustStock(p.id, -1)}
                                            style={{
                                                flex: 1,
                                                padding: '6px',
                                                borderRadius: '8px',
                                                border: '1px solid var(--border)',
                                                background: 'var(--bg-main)',
                                                color: 'var(--text-primary)',
                                                fontWeight: '800',
                                                cursor: p.current_stock <= 0 ? 'not-allowed' : 'pointer',
                                                opacity: p.current_stock <= 0 ? 0.4 : 1
                                            }}
                                            title="Restar 1 unidad"
                                        >
                                            -1
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleAdjustStock(p.id, 1)}
                                            style={{
                                                flex: 1,
                                                padding: '6px',
                                                borderRadius: '8px',
                                                border: '1px solid var(--border)',
                                                background: 'var(--bg-main)',
                                                color: 'var(--text-primary)',
                                                fontWeight: '800',
                                                cursor: 'pointer'
                                            }}
                                            title="Sumar 1 unidad"
                                        >
                                            +1
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleAdjustStock(p.id, 12)}
                                            style={{
                                                flex: 1,
                                                padding: '6px',
                                                borderRadius: '8px',
                                                border: '1px solid var(--border)',
                                                background: 'rgba(16, 185, 129, 0.1)',
                                                color: '#10b981',
                                                fontWeight: '800',
                                                cursor: 'pointer',
                                                fontSize: '12px'
                                            }}
                                            title="Sumar pack de 12 unidades (caja/reingreso)"
                                        >
                                            +12 Pack
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ============================================================ */}
            {/* MODAL 1: ABRIR CAJA DIARIA                                   */}
            {/* ============================================================ */}
            {isOpenSessionModalOpen && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(0,0,0,0.7)',
                    backdropFilter: 'blur(5px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 9999,
                    padding: '16px'
                }}>
                    <form
                        onSubmit={handleOpenSession}
                        style={{
                            background: 'var(--bg-card)',
                            borderRadius: '20px',
                            border: '1px solid var(--border)',
                            padding: '28px',
                            maxWidth: '440px',
                            width: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '18px'
                        }}
                    >
                        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)' }}>
                            🟢 Apertura de Caja Diaria
                        </h3>
                        <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
                            Ingresá el fondo inicial de cambio en efectivo y quién está a cargo del turno.
                        </p>

                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '6px', color: 'var(--text-secondary)' }}>
                                Fondo inicial de cambio (Efectivo)
                            </label>
                            <input
                                type="number"
                                min="0"
                                required
                                value={openSessionForm.initialCash}
                                onChange={(e) => setOpenSessionForm({ ...openSessionForm, initialCash: e.target.value })}
                                placeholder="Ej. 10000"
                                style={{
                                    width: '100%',
                                    padding: '12px 14px',
                                    borderRadius: '10px',
                                    border: '1px solid var(--border)',
                                    background: 'var(--bg-main)',
                                    color: 'var(--text-primary)',
                                    fontSize: '16px',
                                    fontWeight: '700'
                                }}
                            />
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '6px', color: 'var(--text-secondary)' }}>
                                Encargado / Operador del turno
                            </label>
                            <input
                                type="text"
                                required
                                value={openSessionForm.openedBy}
                                onChange={(e) => setOpenSessionForm({ ...openSessionForm, openedBy: e.target.value })}
                                placeholder="Ej. Juan (Recepción)"
                                style={{
                                    width: '100%',
                                    padding: '12px 14px',
                                    borderRadius: '10px',
                                    border: '1px solid var(--border)',
                                    background: 'var(--bg-main)',
                                    color: 'var(--text-primary)',
                                    fontSize: '14px'
                                }}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                            <button
                                type="button"
                                onClick={() => setIsOpenSessionModalOpen(false)}
                                style={{
                                    flex: 1,
                                    padding: '12px',
                                    borderRadius: '12px',
                                    border: '1px solid var(--border)',
                                    background: 'var(--bg-main)',
                                    color: 'var(--text-primary)',
                                    fontWeight: '700',
                                    cursor: 'pointer'
                                }}
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                style={{
                                    flex: 1,
                                    padding: '12px',
                                    borderRadius: '12px',
                                    border: 'none',
                                    background: 'var(--primary-paddle, #10b981)',
                                    color: '#000',
                                    fontWeight: '800',
                                    cursor: 'pointer'
                                }}
                            >
                                Abrir Caja
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* ============================================================ */}
            {/* MODAL 2: VENTA RÁPIDA DE MOSTRADOR                           */}
            {/* ============================================================ */}
            {isFastSaleModalOpen && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(0,0,0,0.7)',
                    backdropFilter: 'blur(5px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 9999,
                    padding: '16px'
                }}>
                    <div style={{
                        background: 'var(--bg-card)',
                        borderRadius: '20px',
                        border: '1px solid var(--border)',
                        padding: '24px',
                        maxWidth: '560px',
                        width: '100%',
                        maxHeight: '90vh',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '16px'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)' }}>
                                    ⚡ Venta de Artículos (Mostrador)
                                </h3>
                                <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                                    Seleccioná los artículos para cobrar y descontar stock automáticamente.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsFastSaleModalOpen(false)}
                                style={{ background: 'transparent', border: 'none', fontSize: '18px', cursor: 'pointer', color: 'var(--text-secondary)' }}
                            >
                                ✕
                            </button>
                        </div>

                        {/* Lista de productos para seleccionar */}
                        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '320px', paddingRight: '4px' }}>
                            {products.filter(p => p.is_active !== false).map(p => {
                                const qty = fastSaleCart[p.id] || 0;
                                return (
                                    <div
                                        key={p.id}
                                        style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            padding: '10px 14px',
                                            borderRadius: '12px',
                                            background: qty > 0 ? 'rgba(16, 185, 129, 0.08)' : 'var(--bg-main)',
                                            border: qty > 0 ? '1px solid #10b981' : '1px solid var(--border)'
                                        }}
                                    >
                                        <div>
                                            <strong style={{ fontSize: '14px', color: 'var(--text-primary)', display: 'block' }}>
                                                {p.name}
                                            </strong>
                                            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                                ${Number(p.sale_price).toLocaleString('es-AR')} • Stock: {p.current_stock}
                                            </span>
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            {qty > 0 && (
                                                <button
                                                    type="button"
                                                    onClick={() => setFastSaleCart(prev => ({ ...prev, [p.id]: Math.max(0, qty - 1) }))}
                                                    style={{ width: '28px', height: '28px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-card)', cursor: 'pointer', fontWeight: '800' }}
                                                >
                                                    -
                                                </button>
                                            )}
                                            {qty > 0 && <span style={{ fontWeight: '800', fontSize: '14px', minWidth: '20px', textAlign: 'center' }}>{qty}</span>}
                                            <button
                                                type="button"
                                                onClick={() => setFastSaleCart(prev => ({ ...prev, [p.id]: qty + 1 }))}
                                                style={{ width: '28px', height: '28px', borderRadius: '6px', border: 'none', background: 'var(--primary-paddle, #10b981)', color: '#000', cursor: 'pointer', fontWeight: '800' }}
                                            >
                                                +
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Método de Pago y Total */}
                        <div style={{ background: 'var(--bg-main)', padding: '14px', borderRadius: '14px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-secondary)' }}>Medio de Cobro:</span>
                                <div style={{ display: 'flex', gap: '6px' }}>
                                    <button
                                        type="button"
                                        onClick={() => setFastSalePaymentMethod('cash')}
                                        style={{
                                            padding: '6px 12px',
                                            borderRadius: '8px',
                                            border: 'none',
                                            background: fastSalePaymentMethod === 'cash' ? '#10b981' : 'var(--bg-card)',
                                            color: fastSalePaymentMethod === 'cash' ? '#000' : 'var(--text-secondary)',
                                            fontWeight: '700',
                                            fontSize: '12px',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        💵 Efectivo
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFastSalePaymentMethod('transfer')}
                                        style={{
                                            padding: '6px 12px',
                                            borderRadius: '8px',
                                            border: 'none',
                                            background: fastSalePaymentMethod === 'transfer' ? '#3b82f6' : 'var(--bg-card)',
                                            color: fastSalePaymentMethod === 'transfer' ? '#fff' : 'var(--text-secondary)',
                                            fontWeight: '700',
                                            fontSize: '12px',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        📲 Transferencia
                                    </button>
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: '10px' }}>
                                <span style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-primary)' }}>Total a Cobrar:</span>
                                <span style={{ fontSize: '20px', fontWeight: '900', color: '#10b981' }}>
                                    ${Object.entries(fastSaleCart).reduce((sum, [id, qty]) => {
                                        const pr = products.find(p => String(p.id) === String(id));
                                        return sum + ((Number(pr?.sale_price) || 0) * qty);
                                    }, 0).toLocaleString('es-AR')}
                                </span>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button
                                type="button"
                                onClick={() => { setFastSaleCart({}); setIsFastSaleModalOpen(false); }}
                                style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-primary)', fontWeight: '700', cursor: 'pointer' }}
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmFastSale}
                                style={{ flex: 1, padding: '12px', borderRadius: '12px', border: 'none', background: 'var(--primary-paddle, #10b981)', color: '#000', fontWeight: '800', cursor: 'pointer' }}
                            >
                                Cobrar y Registrar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ============================================================ */}
            {/* MODAL 3: REGISTRAR GASTO / EGRESO                            */}
            {/* ============================================================ */}
            {isExpenseModalOpen && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(0,0,0,0.7)',
                    backdropFilter: 'blur(5px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 9999,
                    padding: '16px'
                }}>
                    <form
                        onSubmit={handleRegisterExpense}
                        style={{
                            background: 'var(--bg-card)',
                            borderRadius: '20px',
                            border: '1px solid var(--border)',
                            padding: '24px',
                            maxWidth: '440px',
                            width: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '16px'
                        }}
                    >
                        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#ef4444' }}>
                            💸 Registrar Gasto / Retiro
                        </h3>
                        <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
                            Descuenta dinero de la caja (ej. compra de hielo, limpieza, retiro del dueño).
                        </p>

                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '6px', color: 'var(--text-secondary)' }}>
                                Monto ($)
                            </label>
                            <input
                                type="number"
                                min="1"
                                required
                                value={expenseForm.amount}
                                onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                                placeholder="Ej. 3000"
                                style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-primary)', fontSize: '16px', fontWeight: '700' }}
                            />
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '6px', color: 'var(--text-secondary)' }}>
                                Concepto / Motivo
                            </label>
                            <input
                                type="text"
                                required
                                value={expenseForm.description}
                                onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                                placeholder="Ej. 2 bolsas de hielo"
                                style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-primary)', fontSize: '14px' }}
                            />
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '6px', color: 'var(--text-secondary)' }}>
                                Pagado desde
                            </label>
                            <select
                                value={expenseForm.paymentMethod}
                                onChange={(e) => setExpenseForm({ ...expenseForm, paymentMethod: e.target.value })}
                                style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-primary)', fontSize: '14px' }}
                            >
                                <option value="cash">💵 Efectivo del cajón</option>
                                <option value="transfer">📲 Transferencia / MP</option>
                            </select>
                        </div>

                        <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                            <button
                                type="button"
                                onClick={() => setIsExpenseModalOpen(false)}
                                style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-primary)', fontWeight: '700', cursor: 'pointer' }}
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                style={{ flex: 1, padding: '12px', borderRadius: '12px', border: 'none', background: '#ef4444', color: '#fff', fontWeight: '800', cursor: 'pointer' }}
                            >
                                Guardar Gasto
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* ============================================================ */}
            {/* MODAL 4: CIERRE DE CAJA Y ARQUEO                             */}
            {/* ============================================================ */}
            {isCloseSessionModalOpen && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(0,0,0,0.7)',
                    backdropFilter: 'blur(5px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 9999,
                    padding: '16px'
                }}>
                    <form
                        onSubmit={handleCloseSession}
                        style={{
                            background: 'var(--bg-card)',
                            borderRadius: '20px',
                            border: '1px solid var(--border)',
                            padding: '28px',
                            maxWidth: '480px',
                            width: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '16px'
                        }}
                    >
                        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)' }}>
                            🔒 Cierre de Turno y Arqueo
                        </h3>

                        {/* Balance Comparativo */}
                        <div style={{ background: 'var(--bg-main)', padding: '14px', borderRadius: '14px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                                <span style={{ color: 'var(--text-secondary)' }}>Efectivo esperado en caja:</span>
                                <strong style={{ color: '#10b981' }}>${sessionMetrics.expectedCash.toLocaleString('es-AR')}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                                <span style={{ color: 'var(--text-secondary)' }}>Transferencias registradas:</span>
                                <strong style={{ color: '#3b82f6' }}>${sessionMetrics.expectedTransfers.toLocaleString('es-AR')}</strong>
                            </div>
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '6px', color: 'var(--text-secondary)' }}>
                                Efectivo real contado en la mano ($)
                            </label>
                            <input
                                type="number"
                                min="0"
                                required
                                value={closeSessionForm.countedCash}
                                onChange={(e) => setCloseSessionForm({ ...closeSessionForm, countedCash: e.target.value })}
                                placeholder="Contá el dinero físico del cajón..."
                                style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-primary)', fontSize: '16px', fontWeight: '800' }}
                            />
                            {closeSessionForm.countedCash !== '' && (() => {
                                const diff = Number(closeSessionForm.countedCash) - sessionMetrics.expectedCash;
                                return (
                                    <div style={{ marginTop: '6px', fontSize: '12px', fontWeight: '700', color: diff === 0 ? '#10b981' : diff > 0 ? '#3b82f6' : '#ef4444' }}>
                                        {diff === 0 ? '✓ La caja cuadra exacta ($0 de diferencia)' : diff > 0 ? `Sobrante: +$${diff.toLocaleString('es-AR')}` : `Faltante: -$${Math.abs(diff).toLocaleString('es-AR')}`}
                                    </div>
                                );
                            })()}
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '6px', color: 'var(--text-secondary)' }}>
                                Notas u observaciones del turno
                            </label>
                            <textarea
                                value={closeSessionForm.notes}
                                onChange={(e) => setCloseSessionForm({ ...closeSessionForm, notes: e.target.value })}
                                placeholder="Ej. El turno de las 21hs dejó seña de más para la próxima semana..."
                                rows={2}
                                style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-primary)', fontSize: '13px', resize: 'none' }}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                            <button
                                type="button"
                                onClick={() => setIsCloseSessionModalOpen(false)}
                                style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-primary)', fontWeight: '700', cursor: 'pointer' }}
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                style={{ flex: 1, padding: '12px', borderRadius: '12px', border: 'none', background: 'var(--primary-paddle, #10b981)', color: '#000', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                            >
                                📲 Cerrar y Enviar a WhatsApp
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* ============================================================ */}
            {/* MODAL 5: ALTA / EDICIÓN DE PRODUCTO                          */}
            {/* ============================================================ */}
            {isProductModalOpen && editingProduct && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(0,0,0,0.7)',
                    backdropFilter: 'blur(5px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 9999,
                    padding: '16px'
                }}>
                    <form
                        onSubmit={handleSaveProduct}
                        style={{
                            background: 'var(--bg-card)',
                            borderRadius: '20px',
                            border: '1px solid var(--border)',
                            padding: '24px',
                            maxWidth: '460px',
                            width: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '16px'
                        }}
                    >
                        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)' }}>
                            {editingProduct.id ? '✏️ Editar Artículo' : '＋ Nuevo Artículo'}
                        </h3>

                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '6px', color: 'var(--text-secondary)' }}>
                                Nombre del Producto
                            </label>
                            <input
                                type="text"
                                required
                                value={editingProduct.name}
                                onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                                placeholder="Ej. Gatorade 500ml Manzana"
                                style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-primary)', fontSize: '14px' }}
                            />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '6px', color: 'var(--text-secondary)' }}>
                                    Categoría
                                </label>
                                <select
                                    value={editingProduct.category}
                                    onChange={(e) => setEditingProduct({ ...editingProduct, category: e.target.value })}
                                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-primary)', fontSize: '13px' }}
                                >
                                    <option value="Bebidas">Bebidas</option>
                                    <option value="Equipamiento">Equipamiento</option>
                                    <option value="Snacks">Snacks</option>
                                    <option value="Alquileres">Alquileres</option>
                                    <option value="Otro">Otro</option>
                                </select>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '6px', color: 'var(--text-secondary)' }}>
                                    Precio Venta ($)
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    required
                                    value={editingProduct.sale_price}
                                    onChange={(e) => setEditingProduct({ ...editingProduct, sale_price: e.target.value })}
                                    placeholder="2500"
                                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-primary)', fontSize: '14px', fontWeight: '700' }}
                                />
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '6px', color: 'var(--text-secondary)' }}>
                                    Stock Inicial
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    value={editingProduct.current_stock}
                                    onChange={(e) => setEditingProduct({ ...editingProduct, current_stock: e.target.value })}
                                    placeholder="24"
                                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-primary)', fontSize: '14px' }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '6px', color: 'var(--text-secondary)' }}>
                                    Alerta Stock Mínimo
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    value={editingProduct.min_stock_alert}
                                    onChange={(e) => setEditingProduct({ ...editingProduct, min_stock_alert: e.target.value })}
                                    placeholder="5"
                                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-primary)', fontSize: '14px' }}
                                />
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                            <button
                                type="button"
                                onClick={() => { setIsProductModalOpen(false); setEditingProduct(null); }}
                                style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-primary)', fontWeight: '700', cursor: 'pointer' }}
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                style={{ flex: 1, padding: '12px', borderRadius: '12px', border: 'none', background: 'var(--primary-paddle, #10b981)', color: '#000', fontWeight: '800', cursor: 'pointer' }}
                            >
                                Guardar
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}
