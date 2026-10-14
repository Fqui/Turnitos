// Vista previa SOLO para desarrollo (npm run dev): muestra el panel de publicidades del
// superadmin y lo que ve el negocio, sin iniciar sesión. No se incluye en el build.
import React, { useEffect, useMemo, useState } from 'react';
import PromotionsTab from '../../components/seller/tabs/PromotionsTab';
import BusinessPromoStatsCard from '../../components/business/portal/BusinessPromoStatsCard';
import BookingDetailsModal from '../../components/business/BookingDetailsModal';
import supabaseService from '../../services/supabaseService';
import { formatDisplayDate } from '../../utils/dateUtils';
import { todayAR } from '../../utils/promotionUtils';
import { useNotification } from '../../contexts/NotificationContext';
import '../../components/seller/superadmin.css';

const STATUS_LABELS = { pending: 'Pendiente', confirmed: 'Confirmado', deposit_paid: 'Seña pagada', cancelled: 'Cancelado' };

export default function PromosPreview() {
    const { showToast } = useNotification();
    const [view, setView] = useState('superadmin');
    const [theme, setTheme] = useState('dark');
    const [businesses, setBusinesses] = useState([]);
    const [promotions, setPromotions] = useState([]);
    const [showBooking, setShowBooking] = useState(false);
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

    useEffect(() => {
        supabaseService.getBusinesses().then(b => setBusinesses(b || [])).catch(() => {});
        supabaseService.getPromotions().then(p => setPromotions(p || [])).catch(() => {});
    }, []);

    const promoWithBiz = promotions.find(p => p.business_id);
    const bizWithPromo = businesses.find(b => b.id === promoWithBiz?.business_id);
    const bizWithoutPromo = businesses.find(b => !promotions.some(p => p.business_id === b.id));

    const demoBooking = useMemo(() => (promoWithBiz ? {
        id: 'demo-promo-booking',
        business_id: promoWithBiz.business_id,
        customer_name: 'CLIENTE DE PRUEBA',
        customer_phone: '3804000000',
        date: todayAR(),
        time: '18:00',
        duration: 60,
        status: 'pending',
        price: 8500,
        promo_id: promoWithBiz.id,
        discount_applied: 1500,
        metadata: { booking_source: 'marketplace', promo_title: promoWithBiz.title, promo_discount: 1500 }
    } : null), [promoWithBiz]);

    const tabStyle = (active) => ({
        background: active ? 'var(--sa-primary)' : 'var(--sa-surface)',
        color: active ? '#fff' : 'var(--sa-text-2)',
        border: '1px solid var(--sa-border-strong)',
        borderRadius: '999px',
        padding: '7px 14px',
        fontSize: '13px',
        fontWeight: '700',
        cursor: 'pointer'
    });

    return (
        <div className="sa-root" data-theme={theme} style={{ minHeight: '100vh', padding: isMobile ? '16px' : '24px 32px', boxSizing: 'border-box' }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <div style={{ padding: '10px 14px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.4)', color: 'var(--sa-text)', fontSize: '12.5px', lineHeight: 1.5 }}>
                    🧪 <strong>Vista previa local</strong> (solo existe en <code>npm run dev</code>). Sin sesión de superadmin las métricas salen en 0 y los botones que guardan no tienen permiso: no toca la base.
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <button type="button" style={tabStyle(view === 'superadmin')} onClick={() => setView('superadmin')}>Superadmin · Promociones</button>
                    <button type="button" style={tabStyle(view === 'negocio')} onClick={() => setView('negocio')}>Lo que ve el negocio</button>
                    <button type="button" style={{ ...tabStyle(false), marginLeft: 'auto' }} onClick={() => setTheme(t => (t === 'dark' ? 'light' : 'dark'))}>
                        {theme === 'dark' ? '☀️ Claro' : '🌙 Oscuro'}
                    </button>
                </div>

                {view === 'superadmin' ? (
                    <PromotionsTab businesses={businesses} />
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                        <h3 style={{ margin: 0, color: 'var(--sa-text)' }}>Analytics de un negocio con publicidad ({bizWithPromo?.name || '…'})</h3>
                        {bizWithPromo && <BusinessPromoStatsCard businessId={bizWithPromo.id} businessName={bizWithPromo.name} isMobile={isMobile} />}
                        <h3 style={{ margin: 0, color: 'var(--sa-text)' }}>Analytics de un negocio sin publicidad ({bizWithoutPromo?.name || '…'})</h3>
                        {bizWithoutPromo && <BusinessPromoStatsCard businessId={bizWithoutPromo.id} businessName={bizWithoutPromo.name} isMobile={isMobile} />}
                        <div>
                            <button type="button" style={tabStyle(true)} disabled={!demoBooking} onClick={() => setShowBooking(true)}>
                                Ver detalle de una reserva que vino por la promo
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {demoBooking && (
                <BookingDetailsModal
                    isOpen={showBooking}
                    onClose={() => setShowBooking(false)}
                    isMobile={isMobile}
                    booking={demoBooking}
                    businesses={businesses}
                    selectedBusinessId={demoBooking.business_id}
                    onAction={() => showToast('Vista previa: no se guarda nada', 'info')}
                    formatDisplayDate={formatDisplayDate}
                    getStatusLabel={(s) => STATUS_LABELS[s] || s}
                />
            )}
        </div>
    );
}
