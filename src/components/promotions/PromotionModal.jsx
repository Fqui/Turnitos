import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Tag, Check, Copy, ArrowRight, X, Calendar, ShoppingBag } from 'lucide-react';
import { parsePromotionTarget, calculatePromoDiscount } from '../../utils/promotionUtils';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';

export default function PromotionModal({
    isOpen,
    onClose,
    promotion,
    business,
    onSelectService,
    onFilterCategory,
    onGoToStore
}) {
    const [copied, setCopied] = useState(false);

    useBodyScrollLock(isOpen && !!promotion);
    if (!isOpen || !promotion) return null;

    const parsed = parsePromotionTarget(promotion);
    const primaryColor = business?.primary_color || business?.button_color || '#10B981';

    // Find target service if target_type is service
    const targetService = parsed.target_type === 'service' && business?.services
        ? business.services.find(s => String(s.id) === String(parsed.target_id) || s.name?.toLowerCase() === parsed.target_name?.toLowerCase())
        : null;

    // Calculate price comparison if target service exists
    let priceComparison = null;
    if (targetService && targetService.price) {
        const { finalPrice, discountAmount } = calculatePromoDiscount(targetService.price, promotion);
        priceComparison = {
            original: Number(targetService.price),
            discounted: finalPrice,
            saving: discountAmount
        };
    }

    // Find target product if target_type is product
    const storeProducts = business?.metadata?.store_products || [];
    const targetProduct = parsed.target_type === 'product' && storeProducts.length > 0
        ? storeProducts.find(p => String(p.id) === String(parsed.target_id) || p.name?.toLowerCase().trim() === parsed.target_name?.toLowerCase().trim())
        : null;

    let productPriceComparison = null;
    const prodPrice = targetProduct?.price || (parsed.target_type === 'product' && parsed.target_price ? parsed.target_price : null);
    if (prodPrice) {
        const { finalPrice, discountAmount } = calculatePromoDiscount(prodPrice, promotion);
        productPriceComparison = {
            original: Number(prodPrice),
            discounted: finalPrice,
            saving: discountAmount
        };
    }

    const handleCopyCode = () => {
        if (!parsed.code) return;
        navigator.clipboard.writeText(parsed.code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2200);
    };

    const handlePrimaryAction = () => {
        if (parsed.target_type === 'service' && targetService) {
            onClose();
            if (onSelectService) onSelectService(targetService);
        } else if (parsed.target_type === 'category' && parsed.target_name) {
            onClose();
            if (onFilterCategory) onFilterCategory(parsed.target_name);
        } else if (parsed.target_type === 'product' || parsed.target_type === 'store') {
            onClose();
            if (onGoToStore) onGoToStore(parsed.target_id);
        } else {
            onClose();
            // Scroll to services / booking section
            const el = document.getElementById('servicios') || document.getElementById('calendario');
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }
    };

    return (
        <AnimatePresence>
            <div
                style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 9999,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '16px',
                    backgroundColor: 'rgba(0, 0, 0, 0.72)',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)'
                }}
                onClick={onClose}
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.92, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.92, y: 20 }}
                    transition={{ type: 'spring', damping: 26, stiffness: 350 }}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                        position: 'relative',
                        width: '100%',
                        maxWidth: '460px',
                        backgroundColor: 'var(--bg-card, #ffffff)',
                        borderRadius: '24px',
                        overflow: 'hidden',
                        boxShadow: '0 25px 60px rgba(0, 0, 0, 0.35)',
                        border: '1px solid var(--border, rgba(255,255,255,0.1))',
                        color: 'var(--text-primary, #0f172a)'
                    }}
                >
                    {/* Close Button */}
                    <button
                        type="button"
                        onClick={onClose}
                        style={{
                            position: 'absolute',
                            top: '14px',
                            right: '14px',
                            zIndex: 10,
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            backgroundColor: 'rgba(0, 0, 0, 0.55)',
                            backdropFilter: 'blur(6px)',
                            border: '1px solid rgba(255, 255, 255, 0.25)',
                            color: '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            transition: 'transform 0.15s ease'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                        aria-label="Cerrar modal"
                    >
                        <X size={18} />
                    </button>

                    {/* Image / Header Banner */}
                    <div style={{
                        position: 'relative',
                        width: '100%',
                        height: promotion.image ? '180px' : '120px',
                        background: promotion.image
                            ? `url(${promotion.image}) center/cover no-repeat`
                            : `linear-gradient(135deg, ${primaryColor} 0%, #1e1b4b 100%)`
                    }}>
                        <div style={{
                            position: 'absolute',
                            inset: 0,
                            background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.2) 60%, transparent 100%)'
                        }} />

                        {/* Top Discount Badge */}
                        <div style={{
                            position: 'absolute',
                            bottom: '14px',
                            left: '18px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}>
                            <span style={{
                                backgroundColor: primaryColor,
                                color: '#ffffff',
                                fontSize: '12px',
                                fontWeight: '800',
                                padding: '5px 12px',
                                borderRadius: '30px',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                                boxShadow: `0 4px 14px ${primaryColor}60`,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px'
                            }}>
                                <Sparkles size={14} />
                                {parsed.discount_label}
                            </span>
                        </div>
                    </div>

                    {/* Content Body */}
                    <div style={{ padding: '22px 24px 24px 24px' }}>
                        {/* Title & Description */}
                        <h2 style={{
                            fontSize: '21px',
                            fontWeight: '800',
                            margin: '0 0 6px 0',
                            letterSpacing: '-0.3px',
                            lineHeight: 1.25,
                            color: 'var(--text-primary)'
                        }}>
                            {promotion.title}
                        </h2>

                        {parsed.text ? (
                            <p style={{
                                fontSize: '14px',
                                color: 'var(--text-secondary)',
                                margin: '0 0 16px 0',
                                lineHeight: 1.5
                            }}>
                                {parsed.text}
                            </p>
                        ) : null}

                        {/* Target Specific Card (Service, Category or Store) */}
                        {parsed.target_type === 'service' && targetService && (
                            <div style={{
                                backgroundColor: 'var(--bg-main, #f8fafc)',
                                border: '1px solid var(--border)',
                                borderRadius: '16px',
                                padding: '14px 16px',
                                marginBottom: '16px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '12px'
                            }}>
                                <div>
                                    <span style={{
                                        fontSize: '10.5px',
                                        fontWeight: '700',
                                        color: primaryColor,
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.4px',
                                        display: 'block',
                                        marginBottom: '2px'
                                    }}>
                                        Servicio en promoción
                                    </span>
                                    <strong style={{ fontSize: '15px', color: 'var(--text-primary)' }}>
                                        {targetService.name}
                                    </strong>
                                </div>

                                {priceComparison && (
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{
                                            fontSize: '12px',
                                            color: 'var(--text-muted)',
                                            textDecoration: 'line-through'
                                        }}>
                                            ${priceComparison.original.toLocaleString('es-AR')}
                                        </div>
                                        <div style={{
                                            fontSize: '17px',
                                            fontWeight: '800',
                                            color: primaryColor
                                        }}>
                                            ${priceComparison.discounted.toLocaleString('es-AR')}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {parsed.target_type === 'category' && parsed.target_name && (
                            <div style={{
                                backgroundColor: 'var(--bg-main, #f8fafc)',
                                border: '1px solid var(--border)',
                                borderRadius: '16px',
                                padding: '12px 16px',
                                marginBottom: '16px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px'
                            }}>
                                <span style={{ fontSize: '20px' }}>🏷️</span>
                                <div>
                                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block' }}>
                                        Válido para la categoría
                                    </span>
                                    <strong style={{ fontSize: '14px', color: 'var(--text-primary)' }}>
                                        {parsed.target_name}
                                    </strong>
                                </div>
                            </div>
                        )}

                        {parsed.target_type === 'product' && (
                            <div style={{
                                backgroundColor: 'var(--bg-main, #f8fafc)',
                                border: '1px solid var(--border)',
                                borderRadius: '16px',
                                padding: '14px 16px',
                                marginBottom: '16px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '12px'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    {targetProduct?.image ? (
                                        <img
                                            src={targetProduct.image}
                                            alt={targetProduct.name}
                                            style={{ width: '44px', height: '44px', borderRadius: '12px', objectFit: 'cover', border: '1px solid var(--border)' }}
                                        />
                                    ) : (
                                        <div style={{
                                            width: '40px',
                                            height: '40px',
                                            borderRadius: '10px',
                                            backgroundColor: `${primaryColor}15`,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '20px'
                                        }}>
                                            🛍️
                                        </div>
                                    )}
                                    <div>
                                        <span style={{
                                            fontSize: '10.5px',
                                            fontWeight: '700',
                                            color: primaryColor,
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.4px',
                                            display: 'block',
                                            marginBottom: '2px'
                                        }}>
                                            Producto en promoción
                                        </span>
                                        <strong style={{ fontSize: '14.5px', color: 'var(--text-primary)' }}>
                                            {targetProduct?.name || parsed.target_name}
                                        </strong>
                                    </div>
                                </div>

                                {productPriceComparison && (
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{
                                            fontSize: '12px',
                                            color: 'var(--text-muted)',
                                            textDecoration: 'line-through'
                                        }}>
                                            ${productPriceComparison.original.toLocaleString('es-AR')}
                                        </div>
                                        <div style={{
                                            fontSize: '17px',
                                            fontWeight: '800',
                                            color: primaryColor
                                        }}>
                                            ${productPriceComparison.discounted.toLocaleString('es-AR')}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {parsed.target_type === 'store' && (
                            <div style={{
                                backgroundColor: 'var(--bg-main, #f8fafc)',
                                border: '1px solid var(--border)',
                                borderRadius: '16px',
                                padding: '12px 16px',
                                marginBottom: '16px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px'
                            }}>
                                <span style={{ fontSize: '22px' }}>🏬</span>
                                <div>
                                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block' }}>
                                        Beneficio en Tienda Oficial
                                    </span>
                                    <strong style={{ fontSize: '14px', color: 'var(--text-primary)' }}>
                                        Toda la Tienda Online
                                    </strong>
                                </div>
                            </div>
                        )}

                        {/* Optional Promo Code Box */}
                        {parsed.code && (
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                background: 'rgba(16, 185, 129, 0.08)',
                                border: '1px dashed #10b981',
                                borderRadius: '12px',
                                padding: '10px 14px',
                                marginBottom: '20px'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Tag size={16} color="#10b981" />
                                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Código:</span>
                                    <code style={{
                                        fontSize: '13.5px',
                                        fontWeight: '800',
                                        color: '#10b981',
                                        letterSpacing: '0.8px'
                                    }}>
                                        {parsed.code}
                                    </code>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleCopyCode}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        color: '#10b981',
                                        fontSize: '12px',
                                        fontWeight: '700',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px'
                                    }}
                                >
                                    {copied ? (
                                        <>
                                            <Check size={14} />
                                            <span>¡Copiado!</span>
                                        </>
                                    ) : (
                                        <>
                                            <Copy size={14} />
                                            <span>Copiar</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        )}

                        {/* Action CTA Button */}
                        <div style={{ marginTop: '8px' }}>
                            <button
                                type="button"
                                onClick={handlePrimaryAction}
                                style={{
                                    width: '100%',
                                    padding: '13px 20px',
                                    borderRadius: '14px',
                                    border: 'none',
                                    backgroundColor: primaryColor,
                                    color: '#ffffff',
                                    fontSize: '14.5px',
                                    fontWeight: '800',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    boxShadow: `0 6px 20px ${primaryColor}40`,
                                    transition: 'transform 0.15s ease, filter 0.15s ease'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.filter = 'brightness(1.06)'}
                                onMouseLeave={(e) => e.currentTarget.style.filter = 'none'}
                            >
                                {parsed.cta_text ? (
                                    <>
                                        <span>{parsed.cta_text}</span>
                                        <ArrowRight size={17} />
                                    </>
                                ) : parsed.target_type === 'service' ? (
                                    <>
                                        <Calendar size={17} />
                                        <span>{parsed.discount_value > 0 ? 'Reservar con Descuento' : 'Reservar Servicio'}</span>
                                        <ArrowRight size={17} />
                                    </>
                                ) : parsed.target_type === 'category' ? (
                                    <>
                                        <span>Ver Servicios de {parsed.target_name}</span>
                                        <ArrowRight size={17} />
                                    </>
                                ) : parsed.target_type === 'product' ? (
                                    <>
                                        <ShoppingBag size={17} />
                                        <span>Ver Producto en Tienda</span>
                                        <ArrowRight size={17} />
                                    </>
                                ) : parsed.target_type === 'store' ? (
                                    <>
                                        <ShoppingBag size={17} />
                                        <span>Ir a la Tienda Online</span>
                                        <ArrowRight size={17} />
                                    </>
                                ) : (
                                    <>
                                        <span>{parsed.discount_value > 0 ? 'Aprovechar Descuento' : 'Aprovechar Promoción'}</span>
                                        <ArrowRight size={17} />
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
