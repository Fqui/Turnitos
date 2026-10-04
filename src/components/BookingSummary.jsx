import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDisplayDate, formatFriendlyDate, calculateEndTime } from '../utils/dateUtils';
import { parsePromotionTarget, calculatePromoDiscount } from '../utils/promotionUtils';
import CouponInput from './common/CouponInput';
import { buildWhatsAppUrl } from '../utils/utils';

// 🔥 CACHÉ GLOBAL (Nivel Módulo): Sobrevive a desmontajes/remontajes del componente
let globalCachedPaymentData = {
    businessId: null,
    data: null
};

export default function BookingSummary({ bookingDetails, sportColor, onClose, onConfirm, isSubmitting, activePromotion, availableExtras }) {
    const incomingBusiness = bookingDetails?.business || {};
    const selectedServiceId = bookingDetails?.service?.id || bookingDetails?.item?.id;

    const filterExtra = (extra) => {
        if (extra.is_active === false) return false;
        // Si no tiene restricción de servicios o es 'all', aplica a cualquier reserva
        if (!extra.applicable_services || extra.applicable_services.length === 0 || extra.applicable_to === 'all') {
            return true;
        }
        // Si tiene restricción específica, solo mostrar si coincide con el servicio del turno
        return selectedServiceId && extra.applicable_services.includes(selectedServiceId);
    };

    const effectiveExtras = (availableExtras && availableExtras.length > 0)
        ? availableExtras.filter(filterExtra)
        : (incomingBusiness?.additional_services && incomingBusiness.additional_services.length > 0)
            ? incomingBusiness.additional_services.filter(filterExtra)
            : (incomingBusiness?.metadata?.additional_services && incomingBusiness.metadata.additional_services.length > 0)
                ? incomingBusiness.metadata.additional_services.filter(filterExtra)
                : [];
    const hasExtras = effectiveExtras.length > 0;

    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [currentStep, setCurrentStep] = useState(hasExtras ? 1 : 2);
    const [copiedField, setCopiedField] = useState(null);

    useEffect(() => {
        if (!hasExtras && currentStep === 1) {
            setCurrentStep(2);
        }
    }, [hasExtras]);

    const businessId = incomingBusiness.id;
    const incomingPaymentSettings = incomingBusiness.payment_settings || {};

    // 1. Intentar recuperar del caché global si coincide el ID
    let initialData = {
        business: {},
        paymentSettings: {},
        depositSettings: {},
        bankDetailsFromSettings: {}
    };

    if (globalCachedPaymentData.data && (globalCachedPaymentData.businessId === businessId || !businessId)) {
        initialData = globalCachedPaymentData.data;
    }

    const paymentDataRef = useRef(initialData);

    // 2. Validar datos entrantes
    const hasValidData = incomingPaymentSettings && Object.keys(incomingPaymentSettings).length > 0;

    if (hasValidData) {
        const currentSettings = paymentDataRef.current.paymentSettings;
        if (JSON.stringify(incomingPaymentSettings) !== JSON.stringify(currentSettings)) {
            const newData = {
                business: incomingBusiness,
                paymentSettings: incomingPaymentSettings,
                depositSettings: incomingPaymentSettings.deposit || {},
                bankDetailsFromSettings: incomingPaymentSettings.bank_details || {}
            };
            paymentDataRef.current = newData;

            if (businessId) {
                globalCachedPaymentData = {
                    businessId: businessId,
                    data: newData
                };
            }
        }
    }

    const { business, paymentSettings, depositSettings, bankDetailsFromSettings } = paymentDataRef.current;

    // Block body scroll when modal is open
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []);

    if (!bookingDetails) return null;

    const bookingRules = useMemo(() => {
        let r = business?.booking_rules || bookingDetails?.business?.booking_rules;
        if (typeof r === 'string') {
            try { return JSON.parse(r); } catch (e) { return {}; }
        }
        return r || {};
    }, [business?.booking_rules, bookingDetails?.business?.booking_rules]);

    const cancellationPolicy = bookingRules?.cancellation || null;

    const [selectedExtras, setSelectedExtras] = useState(bookingDetails.extras || []);

    const {
        date,
        time,
        courtName,
        serviceName,
        price: basePrice,
        originalPrice,
        specialDayDiscount,
        specialistName,
        duration
    } = bookingDetails;

    const extrasTotal = selectedExtras.reduce((sum, e) => sum + (Number(e.price) * (e.quantity || 1)), 0);

    // Special Day Discount details
    const hasSpecialDiscount = specialDayDiscount && specialDayDiscount.discountAmount > 0;
    const specialDiscount = hasSpecialDiscount ? specialDayDiscount.discountAmount : 0;
    const effectiveOriginalBasePrice = (originalPrice && originalPrice > basePrice)
        ? originalPrice
        : (hasSpecialDiscount ? basePrice + specialDiscount : basePrice);

    // Total before discounts
    const subtotalBeforeDiscounts = effectiveOriginalBasePrice + extrasTotal;

    const [appliedCoupon, setAppliedCoupon] = useState(null);

    // 🎫 Calculate promo discount (based on slot base price only)
    let promoDiscount = 0;
    let promoLabel = '';
    if (activePromotion) {
        const parsed = parsePromotionTarget(activePromotion);
        let applies = true;
        if (parsed.target_type === 'service' && parsed.target_id) {
            applies = String(parsed.target_id) === String(bookingDetails.serviceId) ||
                      bookingDetails.serviceName?.toLowerCase().trim() === parsed.target_name?.toLowerCase().trim();
        }
        if (applies) {
            const { discountAmount } = calculatePromoDiscount(basePrice, activePromotion);
            promoDiscount = discountAmount;
            promoLabel = parsed.discount_label ? `Cupón ${parsed.discount_label}` : 'Descuento';
        }
    }

    // 🏷️ Calculate user-entered coupon discount
    const couponDiscount = (appliedCoupon && appliedCoupon.coupon?.type !== 'gift')
        ? Number(appliedCoupon.discountAmount || 0)
        : 0;

    const totalDiscount = promoDiscount + couponDiscount;
    const price = basePrice + extrasTotal;
    const finalPrice = Math.max(0, price - totalDiscount);
    const hasAnyDiscount = hasSpecialDiscount || totalDiscount > 0;

    // Calculate deposit: (Base price percentage) + 100% of additional services
    const basePriceAfterDiscount = Math.max(0, basePrice - totalDiscount);
    let depositAmount = 0;
    let depositLabel = 'Seña';

    if (depositSettings.enabled === false) {
        depositAmount = 0;
    } else {
        const percentage = parseFloat(depositSettings.percentage);
        const fixed = parseInt(depositSettings.fixed_amount);

        if (depositSettings.percentage && !isNaN(percentage) && percentage > 0) {
            depositAmount = Math.round(basePriceAfterDiscount * (percentage / 100)) + extrasTotal;
            depositLabel = `Seña (${percentage}%)` + (extrasTotal > 0 ? ' + Adicionales' : '');
        } else if (!isNaN(fixed) && fixed > 0) {
            depositAmount = Math.min(fixed + extrasTotal, finalPrice);
            depositLabel = 'Seña (Monto Fijo)' + (extrasTotal > 0 ? ' + Adicionales' : '');
        } else {
            depositAmount = Math.round(basePriceAfterDiscount * 0.3) + extrasTotal;
            depositLabel = 'Seña (30%)' + (extrasTotal > 0 ? ' + Adicionales' : '');
        }
    }

    const hasDeposit = depositSettings.enabled !== false && depositAmount > 0;
    const amountToTransfer = hasDeposit ? depositAmount : finalPrice;
    const isPartial = hasDeposit && depositAmount < finalPrice;

    // Bank details
    const bankDetails = {
        banco: bankDetailsFromSettings.bank_name || business.bank_name || '',
        titular: bankDetailsFromSettings.account_holder || business.account_holder || '',
        alias: bankDetailsFromSettings.alias || business.bank_alias || '',
        cbu: bankDetailsFromSettings.cbu || business.cbu || ''
    };

    const hasBankDetails = bankDetails.banco || bankDetails.alias || bankDetails.cbu;

    // 🛡️ Validaciones del formulario de contacto
    const isFirstNameValid = firstName.trim().length >= 2;
    const isLastNameValid = lastName.trim().length >= 2;
    const cleanCustomerPhone = customerPhone.replace(/\D/g, '');
    const isPhoneValid = cleanCustomerPhone.length >= 10 && cleanCustomerPhone.length <= 15;
    const isFormValid = isFirstNameValid && isLastNameValid && isPhoneValid;

    const handleConfirmPayment = () => {
        const customerName = `${firstName} ${lastName}`;

        // Format the WhatsApp message
        const displayServiceName = courtName || serviceName;
        const formattedDate = formatFriendlyDate(date) || formatDisplayDate(date);
        const specialistText = specialistName ? ` con ${specialistName}` : '';
        
        // Add selected extras to WhatsApp message
        const extrasText = selectedExtras.length > 0 
            ? `\n🛒 Adicionales sumados:\n` + selectedExtras.map(e => {
                const qty = e.quantity || 1;
                const total = (Number(e.price) * qty).toLocaleString('es-AR');
                return `- ${qty > 1 ? `${qty}x ` : ''}${e.name} ($${total})`;
            }).join('\n')
            : '';
        // Add coupon details to WhatsApp message
        const couponText = appliedCoupon
            ? (appliedCoupon.coupon?.type === 'gift'
                ? `\n🎁 Beneficio cupón: ${appliedCoupon.coupon?.code} (${appliedCoupon.giftBenefit})`
                : `\n🎟️ Cupón aplicado: ${appliedCoupon.coupon?.code} (-$${couponDiscount.toLocaleString('es-AR')})`)
            : '';
            
        const message = `Hola, mi nombre es ${customerName}. Reservé ${displayServiceName}${specialistText}, el día ${formattedDate} a las ${time}.${extrasText}${couponText}\n\nA continuación le envío una captura del comprobante.`;

        // WhatsApp opens only after the booking is saved (from the success modal)
        const whatsappUrl = buildWhatsAppUrl(bookingDetails.businessPhone, message);

        onConfirm({
            ...bookingDetails,
            customerName,
            customerPhone,
            extras: selectedExtras,
            price: finalPrice,
            coupon: appliedCoupon?.coupon || null,
            coupon_code: appliedCoupon?.coupon?.code || null,
            discount: totalDiscount,
            whatsappUrl
        });
    };

    const copyToClipboard = async (text, field) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedField(field);
            setTimeout(() => setCopiedField(null), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.6)',
                backdropFilter: 'blur(8px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
                padding: '20px',
                animation: 'fadeIn 0.3s ease'
            }}
            onClick={onClose}
        >
            <motion.div
                onClick={(e) => e.stopPropagation()}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                style={{
                    backgroundColor: 'var(--bg-card)',
                    borderRadius: '24px',
                    maxWidth: '500px',
                    width: '100%',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                    margin: 'auto',
                    maxHeight: '90vh',
                    display: 'flex',
                    flexDirection: 'column'
                }}
                className="responsive-modal-container"
            >
                {/* Header */}
                <div style={{
                    background: `linear-gradient(135deg, ${sportColor}15 0%, ${sportColor}05 100%)`,
                    padding: '16px 20px',
                    borderBottom: '1px solid var(--border)',
                    position: 'relative'
                }}>
                    <button
                        onClick={onClose}
                        style={{
                            position: 'absolute',
                            top: '16px',
                            right: '16px',
                            background: 'rgba(0,0,0,0.05)',
                            border: 'none',
                            borderRadius: '50%',
                            width: '32px',
                            height: '32px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '18px',
                            color: 'var(--text-secondary)',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(0,0,0,0.1)';
                            e.currentTarget.style.transform = 'scale(1.1)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(0,0,0,0.05)';
                            e.currentTarget.style.transform = 'scale(1)';
                        }}
                    >
                        ✕
                    </button>

                    <div style={{ textAlign: 'center' }}>
                        {/* Step indicator */}
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '8px' }}>
                            {hasExtras && (
                                <div style={{
                                    width: '32px',
                                    height: '4px',
                                    borderRadius: '2px',
                                    backgroundColor: currentStep >= 1 ? sportColor : 'var(--border)',
                                    transition: 'all 0.3s'
                                }} />
                            )}
                            <div style={{
                                width: '32px',
                                height: '4px',
                                borderRadius: '2px',
                                backgroundColor: currentStep >= 2 ? sportColor : 'var(--border)',
                                transition: 'all 0.3s'
                            }} />
                            <div style={{
                                width: '32px',
                                height: '4px',
                                borderRadius: '2px',
                                backgroundColor: currentStep >= 3 ? sportColor : 'var(--border)',
                                transition: 'all 0.3s'
                            }} />
                        </div>

                        <h2 style={{
                            fontSize: '18px',
                            fontWeight: '800',
                            color: 'var(--text-primary)',
                            marginBottom: '2px'
                        }}>
                            {currentStep === 1 ? 'Sumá a tu reserva' : (currentStep === 2 ? 'Tus Datos' : 'Datos de Pago')}
                        </h2>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: 0 }}>
                            {currentStep === 1 ? '¿Querés agregar algún adicional?' : (currentStep === 2 ? 'Completa tus datos para continuar' : (isPartial ? 'Transferí la seña para confirmar' : 'Realizá la transferencia para confirmar'))}
                        </p>
                    </div>
                </div>

                {/* Content */}
                <div className="responsive-modal-content" style={{ overflowY: 'auto' }}>
                    <AnimatePresence mode="wait">
                        {currentStep === 1 ? (
                            <motion.div
                                key="step1"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                transition={{ duration: 0.3 }}
                                style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}
                            >
                                {/* Booking Summary Details */}
                                <div style={{
                                    padding: '12px 16px',
                                    borderRadius: '16px',
                                    backgroundColor: 'var(--bg-main)',
                                    border: '1px solid var(--border)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '8px'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600' }}>Detalle del Turno</span>
                                        <span style={{ fontSize: '13px', fontWeight: '800', color: sportColor }}>{courtName || serviceName}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--text-primary)', fontWeight: '700' }}>
                                        <span>{formatFriendlyDate(date)}</span>
                                        <span>{time} hs</span>
                                    </div>
                                </div>

                                <div style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-primary)' }}>
                                    Sumá a tu reserva:
                                </div>

                                {/* Vertical List of Extras */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '42vh', overflowY: 'auto', paddingRight: '4px' }}>
                                    {(() => {
                                        const effectiveExtras = (availableExtras && availableExtras.length > 0)
                                            ? availableExtras.filter(filterExtra)
                                            : (business?.additional_services && business.additional_services.length > 0)
                                                ? business.additional_services.filter(filterExtra)
                                                : (business?.metadata?.additional_services && business.metadata.additional_services.length > 0)
                                                    ? business.metadata.additional_services.filter(filterExtra)
                                                    : [];

                                        if (effectiveExtras.length === 0) {
                                            return (
                                                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)' }}>
                                                    No hay adicionales recomendados disponibles para este turno.
                                                </div>
                                            );
                                        }

                                        return effectiveExtras.map((extra, idx) => {
                                            const selectedItem = selectedExtras.find(e => e.name === extra.name);
                                            const isSelected = !!selectedItem;
                                            const qty = selectedItem?.quantity || 1;
                                            const allowsMultiple = !!extra.allow_quantity;
                                            const extraImage = extra.image || extra.image_url || (
                                                extra.name.includes('Pala') ? 'https://images.unsplash.com/photo-1616788494707-ec28f08d05a1?w=200&q=80' :
                                                extra.name.includes('Pelotas') ? 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=200&q=80' :
                                                'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=200&q=80'
                                            );

                                            const handleAdd = () => {
                                                setSelectedExtras(prev => [...prev, { ...extra, quantity: 1 }]);
                                            };

                                            const handleIncrement = () => {
                                                setSelectedExtras(prev => prev.map(e => e.name === extra.name ? { ...e, quantity: (e.quantity || 1) + 1 } : e));
                                            };

                                            const handleDecrement = () => {
                                                setSelectedExtras(prev => {
                                                    const existing = prev.find(e => e.name === extra.name);
                                                    if (!existing) return prev;
                                                    if ((existing.quantity || 1) <= 1) {
                                                        return prev.filter(e => e.name !== extra.name);
                                                    }
                                                    return prev.map(e => e.name === extra.name ? { ...e, quantity: e.quantity - 1 } : e);
                                                });
                                            };

                                            return (
                                                <div
                                                    key={idx}
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '12px',
                                                        padding: '12px',
                                                        borderRadius: '16px',
                                                        border: isSelected ? `2px solid ${sportColor}` : '1px solid var(--border)',
                                                        backgroundColor: isSelected ? `${sportColor}08` : 'var(--bg-card)',
                                                        transition: 'all 0.2s',
                                                        boxShadow: isSelected ? `0 4px 12px ${sportColor}15` : 'none'
                                                    }}
                                                >
                                                    <div style={{ width: '48px', height: '48px', borderRadius: '10px', overflow: 'hidden', flexShrink: 0, border: '1px solid var(--border)' }}>
                                                        <img src={extraImage} alt={extra.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                    </div>
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                            {extra.name}
                                                        </div>
                                                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                                            {extra.desc || extra.category || (allowsMultiple ? 'Producto adicional' : 'Servicio extra')}
                                                        </div>
                                                    </div>
                                                    <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                                                        <div style={{ fontSize: '13px', fontWeight: '800', color: isSelected ? sportColor : 'var(--text-primary)' }}>
                                                            +${(Number(extra.price) * qty).toLocaleString('es-AR')}
                                                        </div>

                                                        {isSelected ? (
                                                            allowsMultiple ? (
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--bg-main)', padding: '2px 6px', borderRadius: '12px', border: `1px solid ${sportColor}` }}>
                                                                    <button
                                                                        type="button"
                                                                        onClick={handleDecrement}
                                                                        style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', fontWeight: '800', fontSize: '14px', cursor: 'pointer', padding: '0 4px' }}
                                                                    >
                                                                        -
                                                                    </button>
                                                                    <span style={{ fontSize: '12px', fontWeight: '800', color: sportColor, minWidth: '16px', textAlign: 'center' }}>
                                                                        {qty}
                                                                    </span>
                                                                    <button
                                                                        type="button"
                                                                        onClick={handleIncrement}
                                                                        style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', fontWeight: '800', fontSize: '14px', cursor: 'pointer', padding: '0 4px' }}
                                                                    >
                                                                        +
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setSelectedExtras(prev => prev.filter(e => e.name !== extra.name))}
                                                                    style={{
                                                                        fontSize: '11px',
                                                                        color: sportColor,
                                                                        backgroundColor: `${sportColor}15`,
                                                                        border: `1.5px solid ${sportColor}`,
                                                                        fontWeight: '700',
                                                                        padding: '4px 10px',
                                                                        borderRadius: '10px',
                                                                        cursor: 'pointer',
                                                                        display: 'inline-flex',
                                                                        alignItems: 'center',
                                                                        gap: '4px'
                                                                    }}
                                                                    title="Quitar este adicional"
                                                                >
                                                                    ✓ Agregado
                                                                </button>
                                                            )
                                                        ) : (
                                                            <button
                                                                type="button"
                                                                onClick={handleAdd}
                                                                style={{
                                                                    fontSize: '11px',
                                                                    color: '#000',
                                                                    backgroundColor: sportColor,
                                                                    fontWeight: '700',
                                                                    padding: '5px 12px',
                                                                    borderRadius: '10px',
                                                                    border: 'none',
                                                                    cursor: 'pointer'
                                                                }}
                                                            >
                                                                ＋ Agregar
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        });
                                    })()}
                                </div>

                                {/* Action Buttons */}
                                <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                                    <button
                                        onClick={onClose}
                                        style={{
                                            flex: 1,
                                            padding: '16px',
                                            borderRadius: '12px',
                                            border: '1px solid var(--border)',
                                            backgroundColor: 'transparent',
                                            color: 'var(--text-secondary)',
                                            fontSize: '15px',
                                            fontWeight: '600',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={() => setCurrentStep(2)}
                                        style={{
                                            flex: 2,
                                            padding: '16px',
                                            borderRadius: '12px',
                                            border: 'none',
                                            backgroundColor: sportColor || 'var(--primary-paddle)',
                                            color: '#ffffff',
                                            fontSize: '15px',
                                            fontWeight: '700',
                                            cursor: 'pointer',
                                            boxShadow: `0 8px 20px ${sportColor}40`,
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        Siguiente
                                    </button>
                                </div>
                            </motion.div>
                        ) : currentStep === 2 ? (
                            <motion.div
                                key="step2"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.3 }}
                                style={{ padding: '16px 20px 20px 20px' }}
                            >
                                {/* Price Breakdown Card */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                                    {price > 0 && (
                                        <div style={{
                                            padding: '16px',
                                            borderRadius: '16px',
                                            backgroundColor: `${sportColor}10`,
                                            border: `1px solid ${sportColor}30`,
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '8px'
                                        }}>
                                            {/* Details slot header */}
                                            <div style={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '6px',
                                                borderBottom: `1px dashed ${sportColor}30`,
                                                paddingBottom: '10px',
                                                marginBottom: '6px'
                                            }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                                                    <span style={{
                                                        fontSize: '15px',
                                                        fontWeight: '800',
                                                        color: 'var(--text-primary)',
                                                        letterSpacing: '-0.2px',
                                                        lineHeight: 1.2
                                                    }}>
                                                        {serviceName || courtName || 'Servicio'}
                                                    </span>
                                                    {specialistName && (
                                                        <span style={{
                                                            fontSize: '11px',
                                                            fontWeight: '700',
                                                            padding: '2px 8px',
                                                            borderRadius: '6px',
                                                            backgroundColor: `${sportColor}18`,
                                                            color: sportColor,
                                                            whiteSpace: 'nowrap'
                                                        }}>
                                                            con {specialistName}
                                                        </span>
                                                    )}
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', fontWeight: '700' }}>
                                                    <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        📅 {formatFriendlyDate(date)}
                                                    </span>
                                                    <span style={{ color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        ⏰ {time} hs
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Base Price & Extras Breakdown */}
                                            {selectedExtras && selectedExtras.length > 0 && (
                                                <div style={{
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: '4px',
                                                    marginBottom: '4px',
                                                    paddingBottom: '8px',
                                                    borderBottom: `1px dashed ${sportColor}30`
                                                }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--text-secondary)' }}>
                                                        <span>{courtName || serviceName} (Base)</span>
                                                        <span>${effectiveOriginalBasePrice.toLocaleString('es-AR')}</span>
                                                    </div>
                                                    {selectedExtras.map((extra, idx) => {
                                                        const qty = extra.quantity || 1;
                                                        const itemTotal = Number(extra.price) * qty;
                                                        return (
                                                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--text-secondary)' }}>
                                                                <span>+ {qty > 1 ? `${qty}x ` : ''}{extra.name}</span>
                                                                <span>${itemTotal.toLocaleString('es-AR')}</span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}

                                            {/* If discounts exist, show Subtotal row */}
                                            {hasAnyDiscount ? (
                                                <>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                                                            Subtotal
                                                        </span>
                                                        <span style={{
                                                            fontSize: '14px',
                                                            fontWeight: '600',
                                                            color: 'var(--text-secondary)',
                                                            textDecoration: 'line-through'
                                                        }}>
                                                            ${subtotalBeforeDiscounts.toLocaleString('es-AR')}
                                                        </span>
                                                    </div>

                                                    {/* Special Day Discount Row */}
                                                    {hasSpecialDiscount && (
                                                        <div style={{
                                                            display: 'flex',
                                                            justifyContent: 'space-between',
                                                            alignItems: 'center',
                                                            padding: '8px 12px',
                                                            borderRadius: '10px',
                                                            background: 'linear-gradient(135deg, rgba(16,185,129,0.1), rgba(5,150,105,0.15))',
                                                            border: '1px solid rgba(16,185,129,0.3)'
                                                        }}>
                                                            <span style={{ fontSize: '12px', fontWeight: '700', color: '#059669', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                                🔥 {specialDayDiscount.description || 'Oferta del día'}{
                                                                    specialDayDiscount.priceMode === 'discount_percent' && specialDayDiscount.priceVal
                                                                        ? ` (${specialDayDiscount.priceVal}% OFF)`
                                                                        : ''
                                                                }
                                                            </span>
                                                            <span style={{ fontSize: '13px', fontWeight: '800', color: '#059669' }}>
                                                                -${specialDiscount.toLocaleString('es-AR')}
                                                            </span>
                                                        </div>
                                                    )}

                                                    {/* Promo Coupon Row */}
                                                    {promoDiscount > 0 && (
                                                        <div style={{
                                                            display: 'flex',
                                                            justifyContent: 'space-between',
                                                            alignItems: 'center',
                                                            padding: '8px 12px',
                                                            borderRadius: '10px',
                                                            backgroundColor: '#10b98120',
                                                            border: '1px dashed #10b981'
                                                        }}>
                                                            <span style={{ fontSize: '12px', fontWeight: '700', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                🎫 {promoLabel}
                                                            </span>
                                                            <span style={{ fontSize: '13px', fontWeight: '800', color: '#10b981' }}>
                                                                -${promoDiscount.toLocaleString('es-AR')}
                                                            </span>
                                                        </div>
                                                    )}

                                                    {/* Applied Coupon Row */}
                                                    {appliedCoupon && (
                                                        <div style={{
                                                            display: 'flex',
                                                            justifyContent: 'space-between',
                                                            alignItems: 'center',
                                                            padding: '8px 12px',
                                                            borderRadius: '10px',
                                                            backgroundColor: appliedCoupon.coupon?.type === 'gift' ? 'rgba(59, 130, 246, 0.12)' : `${sportColor}15`,
                                                            border: appliedCoupon.coupon?.type === 'gift' ? '1px dashed #3B82F6' : `1px dashed ${sportColor}60`
                                                        }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                <span style={{ fontSize: '12.5px', fontWeight: '700', color: appliedCoupon.coupon?.type === 'gift' ? '#2563EB' : sportColor, display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                                    {appliedCoupon.coupon?.type === 'gift' ? '🎁' : '🏷️'} Cupón {appliedCoupon.coupon?.code}
                                                                    {appliedCoupon.coupon?.type === 'gift' && ` (${appliedCoupon.giftBenefit})`}
                                                                </span>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setAppliedCoupon(null)}
                                                                    style={{
                                                                        background: 'rgba(239, 68, 68, 0.1)',
                                                                        border: '1px solid rgba(239, 68, 68, 0.25)',
                                                                        color: '#EF4444',
                                                                        fontSize: '11px',
                                                                        fontWeight: '700',
                                                                        cursor: 'pointer',
                                                                        padding: '2px 7px',
                                                                        borderRadius: '5px'
                                                                    }}
                                                                    title="Quitar cupón"
                                                                >
                                                                    ✕ Quitar
                                                                </button>
                                                            </div>
                                                            {appliedCoupon.coupon?.type !== 'gift' && (
                                                                <span style={{ fontSize: '13px', fontWeight: '800', color: sportColor }}>
                                                                    -${couponDiscount.toLocaleString('es-AR')}
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* Total a pagar con descuento */}
                                                    <div style={{
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        alignItems: 'center',
                                                        paddingTop: '4px'
                                                    }}>
                                                        <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>Total a pagar</span>
                                                        <span style={{ fontSize: '20px', fontWeight: '900', color: sportColor }}>
                                                            ${finalPrice.toLocaleString('es-AR')}
                                                        </span>
                                                    </div>
                                                </>
                                            ) : (
                                                /* No discounts: plain Total a pagar */
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Total a pagar</span>
                                                    <span style={{ fontSize: '18px', fontWeight: '900', color: sportColor }}>
                                                        ${finalPrice.toLocaleString('es-AR')}
                                                    </span>
                                                </div>
                                            )}

                                            {/* Deposit */}
                                            <div style={{
                                                paddingTop: '8px',
                                                borderTop: `1px dashed ${sportColor}30`,
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center'
                                            }}>
                                                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                                                    {depositLabel}
                                                </span>
                                                <span style={{ fontSize: '16px', fontWeight: '700', color: sportColor }}>
                                                    ${depositAmount.toLocaleString('es-AR')}
                                                </span>
                                            </div>
                                        </div>
                                    )}

                                    {/* Coupon Input Component (hidden when already applied to avoid duplicate box) */}
                                    {price > 0 && !appliedCoupon && (
                                        <div style={{ marginTop: '2px' }}>
                                            <CouponInput
                                                coupons={incomingBusiness?.coupons || incomingBusiness?.metadata?.coupons || []}
                                                totalAmount={basePrice}
                                                bookingDate={date}
                                                customerPhone={customerPhone}
                                                serviceId={selectedServiceId}
                                                appliedCoupon={appliedCoupon}
                                                onApplyCoupon={setAppliedCoupon}
                                                onRemoveCoupon={() => setAppliedCoupon(null)}
                                                primaryColor={sportColor}
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* User Inputs */}
                                <div style={{ marginBottom: '16px' }}>
                                    <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                                        <div style={{ flex: 1 }}>
                                            <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: 'var(--text-primary)' }}>
                                                Nombre
                                            </label>
                                            <input
                                                type="text"
                                                value={firstName}
                                                onChange={(e) => setFirstName(e.target.value)}
                                                placeholder="Tu nombre"
                                                style={{
                                                    width: '100%',
                                                    padding: '12px 16px',
                                                    borderRadius: '12px',
                                                    border: '1px solid var(--border)',
                                                    backgroundColor: 'var(--bg-main)',
                                                    color: 'var(--text-primary)',
                                                    fontSize: '16px',
                                                    outline: 'none'
                                                }}
                                            />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: 'var(--text-primary)' }}>
                                                Apellido
                                            </label>
                                            <input
                                                type="text"
                                                value={lastName}
                                                onChange={(e) => setLastName(e.target.value)}
                                                placeholder="Tu apellido"
                                                style={{
                                                    width: '100%',
                                                    padding: '12px 16px',
                                                    borderRadius: '12px',
                                                    border: '1px solid var(--border)',
                                                    backgroundColor: 'var(--bg-main)',
                                                    color: 'var(--text-primary)',
                                                    fontSize: '16px',
                                                    outline: 'none'
                                                }}
                                            />
                                        </div>
                                    </div>

                                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: 'var(--text-primary)' }}>
                                        Teléfono (WhatsApp)
                                    </label>
                                    <div style={{ position: 'relative' }}>
                                        <input
                                            type="tel"
                                            inputMode="numeric"
                                            pattern="[0-9]*"
                                            maxLength={15}
                                            value={customerPhone}
                                            onKeyDown={(e) => {
                                                if (
                                                    ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Enter'].includes(e.key) ||
                                                    e.ctrlKey || e.metaKey
                                                ) {
                                                    return;
                                                }
                                                if (!/^[0-9]$/.test(e.key)) {
                                                    e.preventDefault();
                                                }
                                            }}
                                            onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, ''))}
                                            placeholder="Ej: 3804123456"
                                            style={{
                                                width: '100%',
                                                padding: '12px 48px 12px 16px',
                                                borderRadius: '12px',
                                                border: `1.5px solid ${
                                                    customerPhone.length === 0
                                                        ? 'var(--border)'
                                                        : isPhoneValid
                                                            ? '#10b981'
                                                            : '#f59e0b'
                                                }`,
                                                backgroundColor: 'var(--bg-main)',
                                                color: 'var(--text-primary)',
                                                fontSize: '16px',
                                                outline: 'none',
                                                boxShadow: customerPhone.length > 0
                                                    ? (isPhoneValid ? '0 0 0 3px rgba(16,185,129,0.12)' : '0 0 0 3px rgba(245,158,11,0.12)')
                                                    : 'none',
                                                transition: 'all 0.2s'
                                            }}
                                        />
                                        {customerPhone.length > 0 && (
                                            <span style={{
                                                position: 'absolute',
                                                right: '14px',
                                                top: '50%',
                                                transform: 'translateY(-50%)',
                                                fontSize: '13px',
                                                color: isPhoneValid ? '#10b981' : '#f59e0b',
                                                fontWeight: '700',
                                                userSelect: 'none'
                                            }}>
                                                {isPhoneValid ? '✓' : `${cleanCustomerPhone.length}/10`}
                                            </span>
                                        )}
                                    </div>
                                    {/* Feedback de validación en tiempo real */}
                                    {customerPhone.length > 0 && !isPhoneValid && (
                                        <div style={{
                                            marginTop: '6px',
                                            fontSize: '12px',
                                            color: '#d97706',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            fontWeight: '500'
                                        }}>
                                            <span>⚠️</span>
                                            <span>Ingresá al menos 10 dígitos con código de área (ej: 3804123456). Faltan {10 - cleanCustomerPhone.length} {10 - cleanCustomerPhone.length === 1 ? 'dígito' : 'dígitos'}.</span>
                                        </div>
                                    )}
                                    {isPhoneValid && (
                                        <div style={{
                                            marginTop: '6px',
                                            fontSize: '12px',
                                            color: '#059669',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            fontWeight: '600'
                                        }}>
                                            <span>✓</span>
                                            <span>Número válido para notificaciones y WhatsApp</span>
                                        </div>
                                    )}
                                </div>

                                {/* Cancellation Policy Notice */}
                                {cancellationPolicy && (
                                    <div style={{
                                        marginBottom: '16px',
                                        padding: '12px 14px',
                                        borderRadius: '12px',
                                        backgroundColor: 'var(--bg-main)',
                                        border: '1px solid var(--border)',
                                        display: 'flex',
                                        alignItems: 'flex-start',
                                        gap: '10px'
                                    }}>
                                        <span style={{ fontSize: '16px' }}>ℹ️</span>
                                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                                            <strong style={{ color: 'var(--text-primary)' }}>Política de cancelación: </strong>
                                            {cancellationPolicy.deadline_hours > 0 ? (
                                                <>Cancela gratis hasta <strong>{cancellationPolicy.deadline_hours} hs antes</strong> del turno ({
                                                    cancellationPolicy.refund_policy === 'full' ? 'reembolso completo' :
                                                    cancellationPolicy.refund_policy === 'partial' ? 'reembolso parcial' :
                                                    'sin reembolso'
                                                }).</>
                                            ) : (
                                                cancellationPolicy.refund_policy === 'none'
                                                    ? 'Este negocio no admite cancelaciones ni reembolsos.'
                                                    : 'Cancelación disponible según políticas del comercio.'
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Action Buttons */}
                                <div style={{ display: 'flex', gap: '12px' }}>
                                    <button
                                        onClick={() => {
                                            if (hasExtras) {
                                                setCurrentStep(1);
                                            } else {
                                                onClose();
                                            }
                                        }}
                                        style={{
                                            flex: 1,
                                            padding: '16px',
                                            borderRadius: '12px',
                                            border: '1px solid var(--border)',
                                            backgroundColor: 'transparent',
                                            color: 'var(--text-secondary)',
                                            fontSize: '16px',
                                            fontWeight: '600',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        {hasExtras ? 'Volver' : 'Cancelar'}
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (!isFormValid) return;
                                            setCurrentStep(3);
                                        }}
                                        disabled={!isFormValid}
                                        style={{
                                            flex: 2,
                                            padding: '16px',
                                            borderRadius: '12px',
                                            border: 'none',
                                            backgroundColor: !isFormValid ? 'var(--border)' : (sportColor || 'var(--primary-paddle)'),
                                            color: !isFormValid ? 'var(--text-secondary)' : '#ffffff',
                                            fontSize: '16px',
                                            fontWeight: '700',
                                            cursor: !isFormValid ? 'not-allowed' : 'pointer',
                                            opacity: !isFormValid ? 0.7 : 1,
                                            boxShadow: !isFormValid ? 'none' : `0 8px 20px ${sportColor}40`,
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        Continuar
                                    </button>
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="step3"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.3 }}
                                style={{ padding: '16px 20px 20px 20px' }}
                            >
                                {/* Payment Amount Card */}
                                <div style={{
                                    backgroundColor: 'var(--bg-card)',
                                    borderRadius: '16px',
                                    border: `1.5px solid ${sportColor}40`,
                                    padding: '16px 20px',
                                    textAlign: 'center',
                                    marginBottom: '16px',
                                    boxShadow: `0 4px 20px ${sportColor}15`
                                }}>
                                    <div style={{
                                        fontSize: '12px',
                                        fontWeight: '700',
                                        color: sportColor,
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.8px',
                                        marginBottom: '4px'
                                    }}>
                                        {isPartial ? 'Monto de la Seña a Transferir' : 'Monto a Transferir'}
                                    </div>
                                    <div style={{
                                        fontSize: '32px',
                                        fontWeight: '900',
                                        color: 'var(--text-primary)',
                                        letterSpacing: '-0.5px',
                                        margin: '4px 0',
                                        lineHeight: 1.1
                                    }}>
                                        ${amountToTransfer.toLocaleString('es-AR')}
                                    </div>
                                    {isPartial ? (
                                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '6px' }}>
                                            Total del servicio: <strong>${finalPrice.toLocaleString('es-AR')}</strong>
                                            <span style={{ margin: '0 6px', opacity: 0.4 }}>•</span>
                                            Resta abonar en el local: <strong>${Math.max(0, finalPrice - amountToTransfer).toLocaleString('es-AR')}</strong>
                                        </div>
                                    ) : (
                                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                            Realizá la transferencia por este valor a los siguientes datos
                                        </div>
                                    )}
                                </div>

                                {/* Bank Details */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                                    {hasBankDetails ? (
                                        <div style={{
                                            backgroundColor: 'var(--bg-card)',
                                            borderRadius: '16px',
                                            padding: '16px',
                                            border: '1px solid var(--border)',
                                            marginBottom: '16px'
                                        }}>
                                            <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: 'var(--text-primary)' }}>
                                                Datos para la transferencia
                                            </h4>

                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                                                <div>
                                                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', marginBottom: '4px', color: 'var(--text-secondary)' }}>
                                                        Banco
                                                    </label>
                                                    <div style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-primary)' }}>
                                                        {bankDetails.banco || '-'}
                                                    </div>
                                                </div>
                                                <div>
                                                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', marginBottom: '4px', color: 'var(--text-secondary)' }}>
                                                        Titular
                                                    </label>
                                                    <div style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-primary)' }}>
                                                        {bankDetails.titular || '-'}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Alias */}
                                            {bankDetails.alias && (
                                                <div style={{ marginBottom: '12px' }}>
                                                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', marginBottom: '6px', color: 'var(--text-secondary)' }}>
                                                        Alias
                                                    </label>
                                                    <div style={{ display: 'flex', gap: '8px' }}>
                                                        <div style={{
                                                            flex: 1,
                                                            padding: '12px 16px',
                                                            borderRadius: '12px',
                                                            backgroundColor: 'var(--bg-main)',
                                                            border: '1px solid var(--border)',
                                                            fontSize: '16px',
                                                            fontWeight: '600',
                                                            color: 'var(--text-primary)',
                                                            fontFamily: 'monospace',
                                                            letterSpacing: '0.5px'
                                                        }}>
                                                            {bankDetails.alias}
                                                        </div>
                                                        <button
                                                            onClick={() => copyToClipboard(bankDetails.alias, 'alias')}
                                                            style={{
                                                                padding: '10px 12px',
                                                                borderRadius: '10px',
                                                                border: '1px solid var(--border)',
                                                                backgroundColor: copiedField === 'alias' ? `${sportColor}15` : 'var(--bg-card)',
                                                                color: copiedField === 'alias' ? sportColor : 'var(--text-primary)',
                                                                fontSize: '13px',
                                                                fontWeight: '600',
                                                                cursor: 'pointer',
                                                                transition: 'all 0.2s',
                                                                minWidth: '80px'
                                                            }}
                                                        >
                                                            {copiedField === 'alias' ? '✓ Copiado' : 'Copiar'}
                                                        </button>
                                                    </div>
                                                </div>
                                            )}

                                            {/* CBU */}
                                            {bankDetails.cbu && (
                                                <div>
                                                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', marginBottom: '6px', color: 'var(--text-secondary)' }}>
                                                        CBU
                                                    </label>
                                                    <div style={{ display: 'flex', gap: '8px' }}>
                                                        <div style={{
                                                            flex: 1,
                                                            padding: '12px 16px',
                                                            borderRadius: '12px',
                                                            backgroundColor: 'var(--bg-main)',
                                                            border: '1px solid var(--border)',
                                                            fontSize: '16px',
                                                            fontWeight: '600',
                                                            color: 'var(--text-primary)',
                                                            fontFamily: 'monospace'
                                                        }}>
                                                            {bankDetails.cbu}
                                                        </div>
                                                        <button
                                                            onClick={() => copyToClipboard(bankDetails.cbu, 'cbu')}
                                                            style={{
                                                                padding: '10px 12px',
                                                                borderRadius: '10px',
                                                                border: '1px solid var(--border)',
                                                                backgroundColor: copiedField === 'cbu' ? `${sportColor}15` : 'var(--bg-card)',
                                                                color: copiedField === 'cbu' ? sportColor : 'var(--text-primary)',
                                                                fontSize: '13px',
                                                                fontWeight: '600',
                                                                cursor: 'pointer',
                                                                transition: 'all 0.2s',
                                                                minWidth: '80px'
                                                            }}
                                                        >
                                                            {copiedField === 'cbu' ? '✓ Copiado' : 'Copiar'}
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '14px', border: '1px dashed var(--border)', borderRadius: '12px', marginBottom: '16px' }}>
                                            No se han configurado datos bancarios para este negocio.
                                        </div>
                                    )}

                                </div>

                                {/* Action Buttons */}
                                <div style={{ display: 'flex', gap: '12px' }}>
                                    <button
                                        onClick={() => setCurrentStep(2)}
                                        disabled={isSubmitting}
                                        style={{
                                            flex: 1,
                                            padding: '16px',
                                            borderRadius: '12px',
                                            border: '1px solid var(--border)',
                                            backgroundColor: 'transparent',
                                            color: 'var(--text-secondary)',
                                            fontSize: '16px',
                                            fontWeight: '600',
                                            cursor: isSubmitting ? 'not-allowed' : 'pointer',
                                            opacity: isSubmitting ? 0.5 : 1,
                                            transition: 'all 0.2s'
                                        }}
                                        onMouseEnter={(e) => {
                                            if (!isSubmitting) {
                                                e.currentTarget.style.backgroundColor = 'var(--bg-main)';
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            if (!isSubmitting) {
                                                e.currentTarget.style.backgroundColor = 'transparent';
                                            }
                                        }}
                                    >
                                        Volver
                                    </button>
                                    <button
                                        onClick={handleConfirmPayment}
                                        disabled={isSubmitting}
                                        style={{
                                            flex: 2,
                                            padding: '16px',
                                            borderRadius: '12px',
                                            border: 'none',
                                            backgroundColor: isSubmitting ? '#9E9E9E' : sportColor,
                                            color: '#fff',
                                            fontSize: '16px',
                                            fontWeight: '700',
                                            cursor: isSubmitting ? 'not-allowed' : 'pointer',
                                            opacity: 1,
                                            boxShadow: isSubmitting ? 'none' : `0 8px 20px ${sportColor}40`,
                                            transition: 'all 0.2s',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '8px'
                                        }}
                                        onMouseEnter={(e) => {
                                            if (!isSubmitting) {
                                                e.currentTarget.style.transform = 'translateY(-2px)';
                                                e.currentTarget.style.boxShadow = `0 12px 28px ${sportColor}50`;
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            if (!isSubmitting) {
                                                e.currentTarget.style.transform = 'translateY(0)';
                                                e.currentTarget.style.boxShadow = `0 8px 20px ${sportColor}40`;
                                            }
                                        }}
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <span style={{
                                                    width: '16px',
                                                    height: '16px',
                                                    border: '2px solid #fff',
                                                    borderTopColor: 'transparent',
                                                    borderRadius: '50%',
                                                    animation: 'spin 0.6s linear infinite'
                                                }}></span>
                                                Procesando...
                                            </>
                                        ) : (
                                            'Confirmar Reserva'
                                        )}
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>

            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }

                /* Mobile First Styles */
                .responsive-modal-container {
                    max-height: 90vh;
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                    border: 1px solid var(--border);
                }

                .responsive-modal-content {
                    overflow-y: auto;
                    flex: 1;
                    max-height: calc(90vh - 100px);
                    padding-bottom: 24px;
                    -webkit-overflow-scrolling: touch;
                }

                .responsive-bank-row {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }

                /* Desktop Styles */
                @media (min-width: 768px) {
                    .responsive-modal-container {
                        max-height: none;
                        display: block;
                        overflow: visible;
                    }
                    
                    .responsive-modal-content {
                        overflow-y: visible;
                        flex: none;
                    }
                    
                    .responsive-bank-row {
                        flex-direction: row;
                        align-items: center;
                    }
                }
            `}</style>
        </div>
    );
}
