import React, { useState } from 'react';

/**
 * Validates and calculates discount for a given coupon
 */
export const validateCoupon = ({
    code,
    coupons = [],
    bookingDate = '',
    totalAmount = 0,
    customerPhone = '',
    existingBookings = []
}) => {
    if (!code || !code.trim()) {
        return { valid: false, error: 'Ingresa un código de cupón' };
    }

    const cleanCode = code.trim().toUpperCase();
    const coupon = coupons.find(c => (c.code || '').trim().toUpperCase() === cleanCode);

    if (!coupon) {
        return { valid: false, error: 'Código de cupón no válido o inexistente' };
    }

    if (coupon.active === false) {
        return { valid: false, error: 'Este cupón se encuentra inactivo' };
    }

    const todayStr = new Date().toISOString().split('T')[0];

    // Check Start Date
    if (coupon.start_date && todayStr < coupon.start_date) {
        return { valid: false, error: `Este cupón estará disponible a partir del ${coupon.start_date}` };
    }

    // Check End Date / Expiration
    if (coupon.end_date && todayStr > coupon.end_date) {
        return { valid: false, error: `Este cupón expiró el ${coupon.end_date}` };
    }

    // Check Max Usage Limit
    if (coupon.max_uses && Number(coupon.max_uses) > 0) {
        const currentUses = Number(coupon.used_count || 0);
        if (currentUses >= Number(coupon.max_uses)) {
            return { valid: false, error: 'Este cupón ya alcanzó el límite máximo de usos' };
        }
    }

    // Check Minimum Spend
    const minSpend = Number(coupon.min_spend || 0);
    if (minSpend > 0 && totalAmount < minSpend) {
        return {
            valid: false,
            error: `Este cupón requiere un monto mínimo de $${minSpend.toLocaleString('es-AR')}`
        };
    }

    // Check Days of Week (0 = Sun, 1 = Mon, ..., 6 = Sat)
    if (bookingDate && Array.isArray(coupon.valid_days) && coupon.valid_days.length > 0 && coupon.valid_days.length < 7) {
        try {
            const [y, m, d] = bookingDate.split('-');
            const dateObj = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
            const dayOfWeek = dateObj.getDay();

            if (!coupon.valid_days.includes(dayOfWeek)) {
                const dayNames = ['Domingos', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábados'];
                const allowedStr = coupon.valid_days.map(dIdx => dayNames[dIdx]).join(', ');
                return {
                    valid: false,
                    error: `Este cupón solo es válido para reservas en: ${allowedStr}`
                };
            }
        } catch (e) {
            console.error('Error parsing booking date for coupon validation:', e);
        }
    }

    // Check 1 per Customer if phone provided
    if (coupon.one_per_customer && customerPhone && Array.isArray(existingBookings)) {
        const cleanPhone = customerPhone.replace(/\D/g, '');
        if (cleanPhone) {
            const alreadyUsed = existingBookings.some(b => {
                const bPhone = (b.customer_phone || b.customerPhone || '').replace(/\D/g, '');
                const bCoupon = b.coupon_code || b.metadata?.coupon_code;
                return bPhone && bPhone === cleanPhone && bCoupon && bCoupon.toUpperCase() === cleanCode && b.status !== 'cancelled';
            });

            if (alreadyUsed) {
                return { valid: false, error: 'Ya utilizaste este cupón con tu número de teléfono' };
            }
        }
    }

    // Calculate Discount Amount
    let discountAmount = 0;
    let giftBenefit = null;
    const type = coupon.type || 'percentage';
    const val = Number(coupon.value || 0);

    if (type === 'percentage') {
        discountAmount = Math.round((totalAmount * val) / 100);
        if (coupon.max_discount && Number(coupon.max_discount) > 0) {
            discountAmount = Math.min(discountAmount, Number(coupon.max_discount));
        }
    } else if (type === 'fixed') {
        discountAmount = Math.min(val, totalAmount);
    } else if (type === 'gift') {
        discountAmount = 0;
        giftBenefit = coupon.gift_title || coupon.description || 'Beneficio de regalo incluido';
    }

    return {
        valid: true,
        coupon,
        discountAmount,
        giftBenefit,
        message: type === 'gift'
            ? `🎁 ${giftBenefit}`
            : `✓ Descuento de $${discountAmount.toLocaleString('es-AR')} aplicado (${type === 'percentage' ? `${val}% OFF` : `$${val.toLocaleString('es-AR')} OFF`})`
    };
};

export default function CouponInput({
    coupons = [],
    totalAmount = 0,
    bookingDate = '',
    customerPhone = '',
    appliedCoupon = null,
    onApplyCoupon,
    onRemoveCoupon,
    isMobile = false,
    primaryColor,
    textColor = 'inherit',
    secondaryTextColor = '#64748B',
    borderColor = 'rgba(0, 0, 0, 0.12)'
}) {
    const [inputCode, setInputCode] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const [isExpanded, setIsExpanded] = useState(Boolean(appliedCoupon));

    const handleApply = (e) => {
        if (e) e.preventDefault();
        setErrorMsg('');

        const result = validateCoupon({
            code: inputCode,
            coupons,
            bookingDate,
            totalAmount,
            customerPhone
        });

        if (!result.valid) {
            setErrorMsg(result.error);
            return;
        }

        if (onApplyCoupon) {
            onApplyCoupon(result);
        }
        setInputCode('');
    };

    const handleRemove = () => {
        setErrorMsg('');
        setInputCode('');
        if (onRemoveCoupon) {
            onRemoveCoupon();
        }
    };

    if (appliedCoupon) {
        const isGift = appliedCoupon.coupon?.type === 'gift';
        return (
            <div style={{
                background: isGift ? 'rgba(59, 130, 246, 0.08)' : 'rgba(16, 185, 129, 0.08)',
                border: isGift ? '1px dashed rgba(59, 130, 246, 0.35)' : '1px dashed rgba(16, 185, 129, 0.35)',
                borderRadius: '10px',
                padding: '8px 12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
                marginTop: '4px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                    <span style={{ fontSize: '15px' }}>{isGift ? '🎁' : '🏷️'}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <span style={{
                            fontWeight: '800',
                            fontSize: '12px',
                            background: isGift ? '#3B82F6' : (primaryColor || '#10B981'),
                            color: '#fff',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            letterSpacing: '0.5px'
                        }}>
                            {appliedCoupon.coupon?.code}
                        </span>
                        <span style={{ fontSize: '12.5px', fontWeight: '700', color: isGift ? '#2563EB' : '#059669' }}>
                            {isGift
                                ? appliedCoupon.giftBenefit
                                : `-$${Number(appliedCoupon.discountAmount || 0).toLocaleString('es-AR')}`}
                        </span>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={handleRemove}
                    style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#EF4444',
                        fontSize: '12px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        padding: '4px 8px'
                    }}
                >
                    Quitar
                </button>
            </div>
        );
    }

    return (
        <div style={{ marginTop: '4px' }}>
            {!isExpanded ? (
                <button
                    type="button"
                    onClick={() => setIsExpanded(true)}
                    style={{
                        width: '100%',
                        background: 'rgba(0, 0, 0, 0.03)',
                        border: `1px dashed ${borderColor || 'rgba(0,0,0,0.18)'}`,
                        borderRadius: '10px',
                        padding: '9px 14px',
                        fontSize: '13px',
                        fontWeight: '600',
                        color: secondaryTextColor,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        transition: 'all 0.2s ease',
                        boxSizing: 'border-box'
                    }}
                >
                    <span style={{ fontSize: '14px' }}>🏷️</span>
                    <span>¿Tenés un código de descuento?</span>
                </button>
            ) : (
                <div style={{ width: '100%', boxSizing: 'border-box' }}>
                    <form onSubmit={handleApply} style={{ display: 'flex', gap: '8px', alignItems: 'center', width: '100%' }}>
                        <input
                            type="text"
                            value={inputCode}
                            onChange={(e) => {
                                setInputCode(e.target.value.toUpperCase());
                                if (errorMsg) setErrorMsg('');
                            }}
                            placeholder="Ingresá tu código"
                            autoFocus
                            style={{
                                flex: 1,
                                height: '40px',
                                padding: '0 12px',
                                borderRadius: '10px',
                                border: errorMsg ? '1.5px solid #EF4444' : `1px solid ${borderColor}`,
                                background: '#fff',
                                color: textColor,
                                fontSize: '13px',
                                fontWeight: '700',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                                outline: 'none',
                                boxSizing: 'border-box'
                            }}
                        />
                        <button
                            type="submit"
                            style={{
                                height: '40px',
                                padding: '0 16px',
                                borderRadius: '10px',
                                border: 'none',
                                background: primaryColor || '#1B4332',
                                color: '#fff',
                                fontWeight: '700',
                                fontSize: '13px',
                                cursor: 'pointer',
                                whiteSpace: 'nowrap',
                                boxSizing: 'border-box'
                            }}
                        >
                            Aplicar
                        </button>
                        <button
                            type="button"
                            onClick={() => { setIsExpanded(false); setErrorMsg(''); setInputCode(''); }}
                            style={{
                                height: '40px',
                                width: '40px',
                                borderRadius: '10px',
                                border: `1px solid ${borderColor}`,
                                background: 'transparent',
                                color: secondaryTextColor,
                                fontSize: '14px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxSizing: 'border-box',
                                padding: 0
                            }}
                            title="Cancelar"
                        >
                            ✕
                        </button>
                    </form>

                    {errorMsg && (
                        <div style={{ color: '#EF4444', fontSize: '11.5px', fontWeight: '600', marginTop: '6px', paddingLeft: '4px' }}>
                            ⚠️ {errorMsg}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
