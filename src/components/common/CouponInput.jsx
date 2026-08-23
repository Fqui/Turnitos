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
    isMobile = false
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
                background: isGift ? 'rgba(59, 130, 246, 0.12)' : 'rgba(132, 204, 22, 0.12)',
                border: isGift ? '1px solid rgba(59, 130, 246, 0.35)' : '1px solid rgba(132, 204, 22, 0.35)',
                borderRadius: '12px',
                padding: '10px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '10px',
                marginTop: '12px',
                transition: 'all 0.2s ease'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                    <span style={{ fontSize: '18px' }}>{isGift ? '🎁' : '🏷️'}</span>
                    <div style={{ overflow: 'hidden' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            <span style={{
                                fontWeight: '900',
                                fontSize: '12.5px',
                                background: isGift ? '#3B82F6' : 'var(--primary-paddle, #84CC16)',
                                color: '#000',
                                padding: '2px 6px',
                                borderRadius: '4px'
                            }}>
                                {appliedCoupon.coupon?.code}
                            </span>
                            <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>
                                {isGift
                                    ? appliedCoupon.giftBenefit
                                    : `-$${Number(appliedCoupon.discountAmount || 0).toLocaleString('es-AR')}`}
                            </span>
                        </div>
                        {appliedCoupon.coupon?.description && (
                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                {appliedCoupon.coupon.description}
                            </div>
                        )}
                    </div>
                </div>

                <button
                    type="button"
                    onClick={handleRemove}
                    style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-secondary)',
                        fontSize: '16px',
                        cursor: 'pointer',
                        padding: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                    title="Quitar cupón"
                >
                    ✕
                </button>
            </div>
        );
    }

    return (
        <div style={{ marginTop: '12px' }}>
            {!isExpanded ? (
                <button
                    type="button"
                    onClick={() => setIsExpanded(true)}
                    style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--primary-paddle, #84CC16)',
                        fontSize: '12.5px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: 0
                    }}
                >
                    <span>🏷️</span> ¿Tenés un código de descuento o beneficio?
                </button>
            ) : (
                <div style={{
                    background: 'var(--bg-main)',
                    border: '1px solid var(--border)',
                    borderRadius: '12px',
                    padding: '10px 12px'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)' }}>
                            🏷️ Código de Descuento o Beneficio
                        </span>
                        <button
                            type="button"
                            onClick={() => { setIsExpanded(false); setErrorMsg(''); }}
                            style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontSize: '14px', cursor: 'pointer' }}
                        >
                            ✕
                        </button>
                    </div>

                    <form onSubmit={handleApply} style={{ display: 'flex', gap: '8px' }}>
                        <input
                            type="text"
                            value={inputCode}
                            onChange={(e) => {
                                setInputCode(e.target.value.toUpperCase());
                                if (errorMsg) setErrorMsg('');
                            }}
                            placeholder="Ej: JUEVES15"
                            style={{
                                flex: 1,
                                padding: '8px 12px',
                                borderRadius: '8px',
                                border: errorMsg ? '1px solid #EF4444' : '1px solid var(--border)',
                                background: 'var(--bg-card)',
                                color: 'var(--text-primary)',
                                fontSize: '13px',
                                fontWeight: '700',
                                textTransform: 'uppercase',
                                outline: 'none'
                            }}
                        />
                        <button
                            type="submit"
                            style={{
                                padding: '8px 14px',
                                borderRadius: '8px',
                                border: 'none',
                                background: 'var(--primary-paddle, #84CC16)',
                                color: '#000',
                                fontWeight: '800',
                                fontSize: '12.5px',
                                cursor: 'pointer',
                                whiteSpace: 'nowrap'
                            }}
                        >
                            Aplicar
                        </button>
                    </form>

                    {errorMsg && (
                        <div style={{ color: '#EF4444', fontSize: '11.5px', fontWeight: '600', marginTop: '6px' }}>
                            ⚠️ {errorMsg}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
