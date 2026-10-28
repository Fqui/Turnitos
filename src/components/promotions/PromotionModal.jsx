import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Copy, ArrowRight, X } from 'lucide-react';
import {
    parsePromotionTarget,
    calculatePromoDiscount,
    getPromoConditionChips,
    getPromoKindMeta,
    hasPromoSchedule,
    promoGivesDiscount
} from '../../utils/promotionUtils';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import FramedImage from '../common/FramedImage';

const PROMO_GREEN = '#10B981';

/**
 * Popup de la promo: el descuento grande sobre la foto, condiciones en chips,
 * precio antes/después y un botón para ir a los turnos.
 * En el celu es una hoja que sube desde abajo; en la compu, una tarjeta centrada.
 */
export default function PromotionModal({
    isOpen,
    onClose,
    promotion,
    business,
    onSelectService,
    onFilterCategory,
    onGoToStore,
    referencePrice = null, // precio de referencia (ej. cancha 60 min) cuando no hay servicio puntual
    referenceLabel = ''
}) {
    const [copied, setCopied] = useState(false);
    const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);

    useEffect(() => {
        const onResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

    useBodyScrollLock(Boolean(isOpen && promotion));

    if (!isOpen || !promotion) return null;

    const parsed = parsePromotionTarget(promotion);
    const kind = getPromoKindMeta(promotion.promo_kind);
    const givesDiscount = promoGivesDiscount(promotion);
    const accent = business?.primary_color || business?.button_color || '#0EA5C6';
    const chips = getPromoConditionChips(promotion);

    // Servicio o producto puntual de la promo
    const targetService = parsed.target_type === 'service' && business?.services
        ? business.services.find(s => String(s.id) === String(parsed.target_id) || s.name?.toLowerCase() === parsed.target_name?.toLowerCase())
        : null;
    const storeProducts = business?.metadata?.store_products || [];
    const targetProduct = parsed.target_type === 'product' && storeProducts.length > 0
        ? storeProducts.find(p => String(p.id) === String(parsed.target_id) || p.name?.toLowerCase().trim() === parsed.target_name?.toLowerCase().trim())
        : null;

    let basePrice = null;
    let priceNote = '';
    if (targetService?.price) {
        basePrice = Number(targetService.price);
        priceNote = targetService.name;
    } else if (targetProduct?.price) {
        basePrice = Number(targetProduct.price);
        priceNote = targetProduct.name;
    } else if (referencePrice) {
        basePrice = Number(referencePrice);
        priceNote = referenceLabel;
    }
    const price = givesDiscount && basePrice ? calculatePromoDiscount(basePrice, promotion) : null;

    const goesToStore = parsed.target_type === 'product' || parsed.target_type === 'store';
    const ctaText = parsed.cta_text || (goesToStore
        ? 'Ver en la tienda'
        : (givesDiscount ? `Ver turnos con ${parsed.discount_label}` : 'Ver turnos'));

    const handleCopyCode = () => {
        if (!parsed.code) return;
        try { navigator.clipboard.writeText(parsed.code); } catch { /* sin portapapeles */ }
        setCopied(true);
        setTimeout(() => setCopied(false), 2200);
    };

    const handlePrimaryAction = () => {
        onClose();
        if (parsed.target_type === 'service' && targetService) {
            if (onSelectService) onSelectService(targetService);
        } else if (parsed.target_type === 'category' && parsed.target_name) {
            if (onFilterCategory) onFilterCategory(parsed.target_name);
        } else if (goesToStore) {
            if (onGoToStore) onGoToStore(parsed.target_id);
        } else {
            // Esperamos a que se libere el bloqueo de scroll del popup antes de bajar a los turnos
            setTimeout(() => {
                const el = document.getElementById('calendario') || document.getElementById('servicios');
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 350);
        }
    };

    const initials = (business?.name || 'T').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();

    return (
        <AnimatePresence>
            <motion.div
                key="promo-scrim"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 9999,
                    display: 'flex',
                    alignItems: isMobile ? 'flex-end' : 'center',
                    justifyContent: 'center',
                    padding: isMobile ? 0 : '16px',
                    backgroundColor: 'rgba(0, 0, 0, 0.6)',
                    backdropFilter: 'blur(4px)',
                    WebkitBackdropFilter: 'blur(4px)'
                }}
            >
                <motion.div
                    role="dialog"
                    aria-label={promotion.title}
                    initial={isMobile ? { y: '100%' } : { opacity: 0, scale: 0.95, y: 16 }}
                    animate={isMobile ? { y: 0 } : { opacity: 1, scale: 1, y: 0 }}
                    exit={isMobile ? { y: '100%' } : { opacity: 0, scale: 0.95, y: 16 }}
                    transition={{ type: 'spring', damping: 30, stiffness: 320 }}
                    drag={isMobile ? 'y' : false}
                    dragConstraints={{ top: 0, bottom: 0 }}
                    dragElastic={{ top: 0, bottom: 0.6 }}
                    onDragEnd={(e, info) => { if (info.offset.y > 90) onClose(); }}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                        position: 'relative',
                        width: '100%',
                        maxWidth: isMobile ? '100%' : '420px',
                        maxHeight: isMobile ? '88vh' : '90vh',
                        overflowY: 'auto',
                        backgroundColor: 'var(--bg-card, #ffffff)',
                        borderRadius: isMobile ? '22px 22px 0 0' : '22px',
                        boxShadow: '0 25px 60px rgba(0, 0, 0, 0.35)',
                        border: '1px solid var(--border, rgba(255,255,255,0.1))',
                        color: 'var(--text-primary, #0f172a)',
                        paddingBottom: isMobile ? 'env(safe-area-inset-bottom, 0px)' : 0
                    }}
                >
                    {/* Hero: foto con el descuento grande */}
                    <div style={{
                        position: 'relative',
                        height: promotion.image ? '170px' : '130px',
                        background: promotion.image
                            ? `url(${promotion.image}) center/cover no-repeat`
                            : `linear-gradient(135deg, ${accent} 0%, #0B1513 100%)`
                    }}>
                        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.05) 25%, rgba(0,0,0,0.78))' }} />
                        {isMobile && (
                            <div style={{ position: 'absolute', top: '8px', left: '50%', transform: 'translateX(-50%)', width: '40px', height: '4px', borderRadius: '4px', background: 'rgba(255,255,255,0.7)' }} />
                        )}
                        <button
                            type="button"
                            onClick={onClose}
                            aria-label="Cerrar"
                            style={{
                                position: 'absolute', top: '12px', right: '12px', zIndex: 2,
                                width: '34px', height: '34px', borderRadius: '50%',
                                background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(255,255,255,0.25)',
                                color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                            }}
                        >
                            <X size={17} />
                        </button>
                        <div style={{ position: 'absolute', left: '18px', bottom: '12px', right: '120px', color: '#fff', zIndex: 1 }}>
                            <div style={{ fontSize: '13px', fontWeight: '700', opacity: 0.92 }}>
                                {kind.icon} {kind.label}
                            </div>
                            <div style={{ fontSize: givesDiscount ? '40px' : '26px', fontWeight: '800', lineHeight: 1.05, letterSpacing: '-0.02em' }}>
                                {givesDiscount ? parsed.discount_label : 'Novedad'}
                            </div>
                        </div>
                        {business?.name && (
                            <div style={{ position: 'absolute', right: '12px', bottom: '12px', zIndex: 1, display: 'flex', alignItems: 'center', gap: '6px', color: '#fff', fontSize: '12px', fontWeight: '700', maxWidth: '45%' }}>
                                {business.logo ? (
                                    <FramedImage src={business.logo} alt="" style={{ width: '28px', height: '28px', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.4)', flexShrink: 0 }} />
                                ) : (
                                    <span style={{ width: '28px', height: '28px', borderRadius: '50%', background: accent, display: 'grid', placeItems: 'center', fontSize: '11px', flexShrink: 0 }}>{initials}</span>
                                )}
                                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{business.name}</span>
                            </div>
                        )}
                    </div>

                    {/* Cuerpo */}
                    <div style={{ padding: '16px 18px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '19px', fontWeight: '800', lineHeight: 1.25 }}>{promotion.title}</h2>
                            {parsed.text ? (
                                <p style={{ margin: '4px 0 0', fontSize: '13.5px', color: 'var(--text-secondary)', lineHeight: 1.45 }}>{parsed.text}</p>
                            ) : null}
                        </div>

                        {chips.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                {chips.map(chip => (
                                    <span key={chip} style={{
                                        fontSize: '12px', fontWeight: '700', borderRadius: '999px', padding: '4px 10px',
                                        background: 'var(--bg-main, rgba(0,0,0,0.05))', border: '1px solid var(--border)',
                                        color: 'var(--text-primary)'
                                    }}>
                                        {chip}
                                    </span>
                                ))}
                            </div>
                        )}

                        {price && price.discountAmount > 0 && (
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap' }}>
                                <s style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>${basePrice.toLocaleString('es-AR')}</s>
                                <b style={{ fontSize: '24px', color: PROMO_GREEN }}>${price.finalPrice.toLocaleString('es-AR')}</b>
                                {priceNote && <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{priceNote}</span>}
                            </div>
                        )}

                        {parsed.code && (
                            <button
                                type="button"
                                onClick={handleCopyCode}
                                style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px',
                                    padding: '10px 12px', borderRadius: '12px', border: `1px dashed ${accent}`,
                                    background: 'transparent', color: 'var(--text-primary)', cursor: 'pointer', fontFamily: 'inherit'
                                }}
                            >
                                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Código</span>
                                <strong style={{ fontSize: '15px', letterSpacing: '1px' }}>{parsed.code}</strong>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: '700', color: copied ? PROMO_GREEN : accent }}>
                                    {copied ? <Check size={14} /> : <Copy size={14} />}{copied ? 'Copiado' : 'Copiar'}
                                </span>
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={handlePrimaryAction}
                            style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                padding: '14px', borderRadius: '14px', border: 'none',
                                background: accent, color: '#fff', fontSize: '15px', fontWeight: '800',
                                cursor: 'pointer', fontFamily: 'inherit', boxShadow: `0 6px 18px ${accent}50`
                            }}
                        >
                            {ctaText}
                            <ArrowRight size={18} />
                        </button>

                        {givesDiscount && hasPromoSchedule(promotion) && !goesToStore && (
                            <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)', textAlign: 'center' }}>
                                Los horarios que entran en la promo aparecen marcados en verde.
                            </p>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
