import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ShoppingBag, Check, X, RotateCcw } from 'lucide-react';
import { isOrderVisible } from '../../../services/supabase/storeOrderService';

const FILTERS = [
    { value: 'all', label: 'Todos' },
    { value: 'new', label: 'Nuevos' },
    { value: 'delivered', label: 'Entregados' },
    { value: 'cancelled', label: 'Cancelados' },
    { value: 'unconfirmed', label: 'Sin confirmar' }
];

const STATUS_META = {
    new: { label: 'Nuevo', color: '#10B981', bg: 'rgba(16, 185, 129, 0.12)' },
    delivered: { label: 'Entregado', color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.12)' },
    cancelled: { label: 'Cancelado', color: '#EF4444', bg: 'rgba(239, 68, 68, 0.12)' },
    unconfirmed: { label: 'Sin confirmar', color: '#94A3B8', bg: 'rgba(148, 163, 184, 0.14)' }
};

const money = (value) => `$${Math.round(Number(value) || 0).toLocaleString('es-AR')}`;

const formatWhen = (iso) => {
    const date = new Date(iso);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    const time = date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
    if (date.toDateString() === today.toDateString()) return `Hoy, ${time}`;
    if (date.toDateString() === yesterday.toDateString()) return `Ayer, ${time}`;
    return `${date.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}, ${time}`;
};

function StatusPill({ status }) {
    const meta = STATUS_META[status] || STATUS_META.unconfirmed;
    return (
        <span style={{
            fontSize: '11.5px', fontWeight: 700, padding: '4px 10px', borderRadius: '999px',
            color: meta.color, background: meta.bg, whiteSpace: 'nowrap'
        }}>
            {meta.label}
        </span>
    );
}

function ActionButton({ onClick, disabled, icon: Icon, children, tone = 'neutral' }) {
    const tones = {
        primary: { background: 'var(--primary)', color: '#fff', border: '1px solid var(--primary)' },
        danger: { background: 'transparent', color: '#EF4444', border: '1px solid rgba(239, 68, 68, 0.4)' },
        neutral: { background: 'transparent', color: 'var(--text-primary)', border: '1px solid var(--border)' }
    };
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            style={{
                ...tones[tone],
                flex: 1, minHeight: '40px', padding: '8px 12px', borderRadius: '12px',
                fontWeight: 700, fontSize: '13px', cursor: disabled ? 'default' : 'pointer',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                opacity: disabled ? 0.6 : 1, fontFamily: 'inherit'
            }}
        >
            {Icon && <Icon size={16} aria-hidden="true" />}
            {children}
        </button>
    );
}

function OrderCard({ order, highlighted, busy, onChangeStatus, cardRef }) {
    const items = Array.isArray(order.items) ? order.items : [];
    const isUnconfirmed = order.status === 'unconfirmed';
    const isUnseen = order.status === 'new' && !order.seen_at;

    return (
        <article
            ref={cardRef}
            style={{
                background: 'var(--bg-card)',
                border: `1px solid ${highlighted ? 'var(--primary)' : 'var(--border)'}`,
                boxShadow: highlighted ? '0 0 0 3px var(--primary-bg)' : 'none',
                borderRadius: '18px',
                padding: '16px',
                display: 'flex', flexDirection: 'column', gap: '12px',
                opacity: isUnconfirmed ? 0.7 : 1,
                transition: 'box-shadow 0.3s ease, border-color 0.3s ease'
            }}
        >
            <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                    {isUnseen && <span aria-label="Sin ver" style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--primary)', flexShrink: 0 }} />}
                    <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 800, fontSize: '15px', color: 'var(--text-primary)' }}>Pedido #{order.order_number}</div>
                        <div style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>{formatWhen(order.created_at)}</div>
                    </div>
                </div>
                <StatusPill status={order.status} />
            </header>

            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {items.map((item, index) => (
                    <li key={`${item.id}-${index}`} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', fontSize: '13.5px' }}>
                        <span style={{ color: 'var(--text-primary)', minWidth: 0 }}>
                            <b>{item.qty}x</b> {item.name}{item.size ? <span style={{ color: 'var(--text-muted)' }}> · {item.size}</span> : null}
                        </span>
                        <span style={{ color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{money(item.price * item.qty)}</span>
                    </li>
                ))}
            </ul>

            <div style={{ borderTop: '1px dashed var(--border)', paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {Number(order.discount) > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                        <span>Cupón{order.coupon_label ? ` (${order.coupon_label})` : ''}</span>
                        <span>-{money(order.discount)}</span>
                    </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '15px', color: 'var(--text-primary)' }}>
                    <span>Total</span>
                    <span>{money(order.total)}</span>
                </div>
            </div>

            {isUnconfirmed && (
                <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                    Se abrió WhatsApp pero no se confirmó el envío. Si te llegó el mensaje con este número, marcalo como nuevo.
                </p>
            )}

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {(order.status === 'new') && (
                    <>
                        <ActionButton tone="primary" icon={Check} disabled={busy} onClick={() => onChangeStatus(order, 'delivered')}>Entregado</ActionButton>
                        <ActionButton tone="danger" icon={X} disabled={busy} onClick={() => onChangeStatus(order, 'cancelled')}>Cancelar</ActionButton>
                    </>
                )}
                {isUnconfirmed && (
                    <>
                        <ActionButton tone="primary" icon={Check} disabled={busy} onClick={() => onChangeStatus(order, 'new')}>Me llegó</ActionButton>
                        <ActionButton tone="danger" icon={X} disabled={busy} onClick={() => onChangeStatus(order, 'cancelled')}>Descartar</ActionButton>
                    </>
                )}
                {(order.status === 'delivered' || order.status === 'cancelled') && (
                    <ActionButton icon={RotateCcw} disabled={busy} onClick={() => onChangeStatus(order, 'new')}>Volver a nuevo</ActionButton>
                )}
            </div>
        </article>
    );
}

export default function StoreOrdersView({ orders, loading, highlightId, onChangeStatus, isMobile }) {
    const [filter, setFilter] = useState('all');
    const [busyId, setBusyId] = useState(null);
    const highlightRef = useRef(null);

    const visibleOrders = useMemo(() => {
        const now = Date.now();
        return (orders || []).filter(order => {
            if (filter === 'all') return isOrderVisible(order, now);
            if (filter === 'unconfirmed') return order.status === 'unconfirmed' && isOrderVisible(order, now);
            return order.status === filter;
        });
    }, [orders, filter]);

    const monthSummary = useMemo(() => {
        const start = new Date();
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        const sold = (orders || []).filter(o => (o.status === 'new' || o.status === 'delivered') && new Date(o.created_at) >= start);
        return { count: sold.length, total: sold.reduce((sum, o) => sum + Number(o.total || 0), 0) };
    }, [orders]);

    useEffect(() => {
        if (highlightId) setFilter('all');
    }, [highlightId]);

    useEffect(() => {
        if (highlightId && highlightRef.current) {
            highlightRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [highlightId, visibleOrders]);

    const handleChange = async (order, status) => {
        setBusyId(order.id);
        try {
            await onChangeStatus(order, status);
        } finally {
            setBusyId(null);
        }
    };

    return (
        <section style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
            {!isMobile && (
                <div>
                    <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)' }}>Pedidos de la tienda</h1>
                    <p style={{ margin: '4px 0 0', fontSize: '14px', color: 'var(--text-secondary)' }}>
                        Los pedidos que te hacen desde tu tienda online. El número de pedido también va en el mensaje de WhatsApp que te llega.
                    </p>
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px', maxWidth: '520px' }}>
                {[
                    { label: 'Pedidos este mes', value: monthSummary.count },
                    { label: 'Vendido este mes', value: money(monthSummary.total) }
                ].map(stat => (
                    <div key={stat.label} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '12px 14px' }}>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>{stat.label}</div>
                        <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>{stat.value}</div>
                    </div>
                ))}
            </div>

            <div className="no-scrollbar" role="tablist" aria-label="Filtrar pedidos" style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '2px' }}>
                {FILTERS.map(f => {
                    const active = filter === f.value;
                    return (
                        <button
                            key={f.value}
                            type="button"
                            role="tab"
                            aria-selected={active}
                            onClick={() => setFilter(f.value)}
                            style={{
                                flexShrink: 0, padding: '8px 14px', borderRadius: '999px', fontSize: '13px', fontWeight: 700,
                                border: `1px solid ${active ? 'var(--primary)' : 'var(--border)'}`,
                                background: active ? 'var(--primary-bg)' : 'transparent',
                                color: active ? 'var(--primary-dark)' : 'var(--text-secondary)',
                                cursor: 'pointer', fontFamily: 'inherit'
                            }}
                        >
                            {f.label}
                        </button>
                    );
                })}
            </div>

            {loading && !orders?.length ? (
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Cargando pedidos…</p>
            ) : visibleOrders.length === 0 ? (
                <div style={{
                    background: 'var(--bg-card)', border: '1px dashed var(--border)', borderRadius: '18px',
                    padding: '32px 20px', textAlign: 'center', color: 'var(--text-secondary)'
                }}>
                    <ShoppingBag size={28} aria-hidden="true" style={{ color: 'var(--text-muted)' }} />
                    <p style={{ margin: '10px 0 0', fontSize: '14px' }}>
                        {filter === 'all' ? 'Todavía no hay pedidos. Cuando alguien compre en tu tienda, lo vas a ver acá y te llega un aviso.' : 'No hay pedidos con este estado.'}
                    </p>
                </div>
            ) : (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(320px, 1fr))',
                    gap: '12px',
                    alignItems: 'start'
                }}>
                    {visibleOrders.map(order => (
                        <OrderCard
                            key={order.id}
                            order={order}
                            highlighted={String(order.id) === String(highlightId)}
                            cardRef={String(order.id) === String(highlightId) ? highlightRef : undefined}
                            busy={busyId === order.id}
                            onChangeStatus={handleChange}
                        />
                    ))}
                </div>
            )}
        </section>
    );
}
