import React from 'react';
import { buildWhatsAppUrl } from '../../utils/whatsapp';
import { formatFee, formatKm, getHomeVisit } from '../../utils/homeService';

export default function HomeVisitCard({ booking, businessName }) {
    const visit = getHomeVisit(booking);
    if (!visit) return null;

    const hasPoint = isFinite(Number(visit.lat)) && isFinite(Number(visit.lng)) && visit.lat != null;
    const mapsUrl = hasPoint
        ? `https://www.google.com/maps/dir/?api=1&destination=${visit.lat},${visit.lng}`
        : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(visit.address)}`;
    const phone = booking.customer_phone || booking.customerPhone || '';
    const firstName = String(booking.customer_name || booking.customerName || '').split(' ')[0];
    const niceName = firstName ? firstName.charAt(0) + firstName.slice(1).toLowerCase() : '';
    const message = `Hola${niceName ? ` ${niceName}` : ''}, soy de ${businessName || 'tu turno'}. Ya voy en camino a ${visit.address}.`;
    const whatsappUrl = phone ? buildWhatsAppUrl(phone, message) : null;

    const button = {
        flex: 1,
        minHeight: '44px',
        borderRadius: '10px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        fontWeight: 700,
        fontSize: '13px',
        textDecoration: 'none'
    };

    return (
        <div style={{ padding: '12px', borderRadius: '12px', border: '1px solid rgba(37, 99, 235, 0.3)', background: 'rgba(37, 99, 235, 0.06)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--status-completed, #2563eb)' }}>A DOMICILIO</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <strong style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{visit.address}</strong>
                {visit.reference && <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{visit.reference}</span>}
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    {visit.distance_km != null ? `A ${formatKm(visit.distance_km)} · ` : ''}Traslado {formatFee(Number(visit.fee) || 0).toLowerCase()}
                </span>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
                <a href={mapsUrl} target="_blank" rel="noopener noreferrer" style={{ ...button, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)' }}>
                    Cómo llegar
                </a>
                {whatsappUrl && (
                    <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" style={{ ...button, background: 'var(--primary, #3ecf8e)', color: '#0e1411' }}>
                        Voy en camino
                    </a>
                )}
            </div>
        </div>
    );
}
