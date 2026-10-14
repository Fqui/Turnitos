import React, { useEffect, useState } from 'react';
import { supabase } from '../../../services/supabaseClient';
import { getPromotionStats } from '../../../services/supabase/promotionService';
import { getPromotionStatus } from '../../../utils/promotionUtils';

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
export default function BusinessPromoStatsCard({ businessId, isMobile }) {
    const [rows, setRows] = useState([]);

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
                    if (!cancelled) setRows([]);
                    return;
                }
                const stats = await getPromotionStats();
                if (cancelled) return;
                setRows(promos.map(p => ({
                    ...p,
                    status: getPromotionStatus(p),
                    stats: stats[p.id] || { views: 0, clicks: 0, bookings: 0, revenue: 0 }
                })));
            } catch (err) {
                console.warn('No se pudieron cargar las métricas de la publicidad:', err);
                if (!cancelled) setRows([]);
            }
        })();
        return () => { cancelled = true; };
    }, [businessId]);

    if (rows.length === 0) return null;

    const fmt = (n) => Number(n || 0).toLocaleString('es-AR');

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
                const items = [
                    { label: 'Vistas', value: fmt(row.stats.views) },
                    { label: 'Clics', value: fmt(row.stats.clicks) },
                    { label: 'Reservas', value: fmt(row.stats.bookings) },
                    { label: 'Facturación generada', value: `$${fmt(Math.round(row.stats.revenue))}` }
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
