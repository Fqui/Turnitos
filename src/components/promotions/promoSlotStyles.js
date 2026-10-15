// Estilo compartido para marcar los horarios que entran en la promo activa.
// slotPromo (lo arma la página del negocio): { label, isValid(time), apply(price) }
export const PROMO_GREEN = '#10B981';

export const promoSlotStyle = {
    border: `1px solid ${PROMO_GREEN}80`,
    backgroundColor: 'rgba(16, 185, 129, 0.12)'
};

export const promoTagStyle = {
    fontSize: '10px',
    fontWeight: '800',
    color: PROMO_GREEN,
    lineHeight: 1.1,
    letterSpacing: '0.2px'
};

// '20% OFF' -> '-20%' ; '$5.000 OFF' -> '-$5.000'
export function shortPromoLabel(label) {
    const clean = String(label || '').replace(/\s*OFF\s*$/i, '').trim();
    return clean ? `-${clean}` : 'Promo';
}
