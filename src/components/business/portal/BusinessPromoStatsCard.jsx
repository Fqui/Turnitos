import React, { useEffect, useState } from 'react';
import { supabase } from '../../../services/supabaseClient';
import { getPromotionStats } from '../../../services/supabase/promotionService';
import { getPromotionStatus } from '../../../utils/promotionUtils';

// WhatsApp de TurnitosLR para contratar el espacio en el inicio
const SALES_WHATSAPP = '5493805002706';

const STATUS_LABEL = {
    live: { text: 'Al aire', color: '#10B981' },
    paused: { text: 'Pausada', color: '#F59E0B' },
    expired: { text: 'Finalizada', color: 'var(--text-secondary)' },
    scheduled: { text: 'Programada', color: '#38BDF8' }
};

/**
 * "Tu publicidad en TurnitosLR": números de las publicidades del Home de este negocio.
 * No se muestra nada si el negocio no tiene publicidades o si falla la carga.
 */
export default function BusinessPromoStatsCard({ businessId, businessName, isMobile }) {
    const [rows, setRows] = useState([]);
    const [hasNoPromos, setHasNoPromos] = useState(false);

    useEffect(() => {
        if (!businessId) return;
        let cancelled = false;
        (async () => {
            try {
                const { data: promos, error } = await supabase
                    .from('promotions')
                    .select('id, title, active, start_date, end_date')
                    .eq('business_id', businessId)
                    .order('created_at', { ascending: false });
                if (error || !promos || promos.length === 0) {
                    if (!cancelled) {
                        setRows([]);
                        setHasNoPromos(!error);
                    }
                    return;
                }
                if (!cancelled) setHasNoPromos(false);
                // Si las métricas fallan igual mostramos la tarjeta, con "—" en los números
                const stats = await getPromotionStats().catch(err => {
                    console.warn('No se pudieron cargar las métricas de la publicidad:', err);
                    return null;
                });
                if (cancelled) return;
                setRows(promos.map(p => ({
                    ...p,
                    status: getPromotionStatus(p),
                    stats: stats ? (stats[p.id] || { views: 0, clicks: 0, bookings: 0, revenue: 0 }) : null
                })));
            } catch (err) {
                console.warn('No se pudieron cargar las métricas de la publicidad:', err);
                if (!cancelled) setRows([]);
            }
        })();
        return () => { cancelled = true; };
    }, [businessId]);

    if (rows.length === 0) {
        if (!hasNoPromos) return null;
        // El espacio del inicio se vende: el negocio no la crea, la pide
        const msg = `Hola! Soy de ${businessName || 'mi negocio'} y quiero aparecer en el inicio de TurnitosLR. ¿Cómo funciona?`;
        return (
            <div style={{
                background: 'var(--bg-card)',
                border: '1px dashed var(--border)',
                borderRadius: '20px',
                padding: isMobile ? '14px 16px' : '16px 22px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                flexWrap: 'wrap'
            }}>
                <div style={{ minWidth: 0, flex: '1 1 240px' }}>
                    <div style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-primary)' }}>
                        📢 Destacá tu negocio en el inicio de TurnitosLR
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        Un banner arriba de todo, con tu promo y el seguimiento de vistas, clics y reservas.
                    </div>
                </div>
                <a
                    href={`https://wa.me/${SALES_WHATSAPP}?text=${encodeURIComponent(msg)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                        background: 'var(--primary-paddle)',
                        color: '#fff',
                        textDecoration: 'none',
                        borderRadius: '12px',
                        padding: '10px 16px',
                        fontSize: '13px',
                        fontWeight: '800',
                        whiteSpace: 'nowrap'
                    }}
                >
                    Quiero aparecer
                </a>
            </div>
        );
    }

    const fmt = (n) => (n === null || n === undefined ? '—' : Number(n).toLocaleString('es-AR'));

    return (
        <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: '20px',
            padding: isMobile ? '16px' : '20px 22px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px'
        }}>
            <div>
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '800', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>📢</span> Tu publicidad en TurnitosLR
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
                    Cuánta gente vio tu banner en el inicio, cuántos lo tocaron y cuántas reservas trajo.
                </p>
            </div>

            {rows.map(row => {
                const status = STATUS_LABEL[row.status] || STATUS_LABEL.live;
                const st = row.stats || {};
                const items = [
                    { label: 'Vistas', value: fmt(st.views) },
                    { label: 'Clics', value: fmt(st.clicks) },
                    { label: 'Reservas', value: fmt(st.bookings) },
                    { label: 'Facturación generada', value: row.stats ? `$${fmt(Math.round(st.revenue))}` : '—' }
                ];
                return (
                    <div key={row.id} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>{row.title}</span>
                            <span style={{ fontSize: '11px', fontWeight: '800', color: status.color, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                                ● {status.text}
                            </span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: '10px' }}>
                            {items.map(item => (
                                <div key={item.label} style={{
                                    background: 'var(--bg-main)',
                                    border: '1px solid var(--border)',
                                    borderRadius: '12px',
                                    padding: '10px 12px',
                                    minWidth: 0
                                }}>
                                    <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)' }}>{item.label}</div>
                                    <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {item.value}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
