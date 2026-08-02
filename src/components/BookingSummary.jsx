import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDisplayDate, calculateEndTime } from '../utils/dateUtils';

// 🔥 CACHÉ GLOBAL (Nivel Módulo): Sobrevive a desmontajes/remontajes del componente
let globalCachedPaymentData = {
    businessId: null,
    data: null
};

export default function BookingSummary({ bookingDetails, sportColor, onClose, onConfirm, isSubmitting, activePromotion, availableExtras }) {
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [currentStep, setCurrentStep] = useState(1);
    const [copiedField, setCopiedField] = useState(null);

    const incomingBusiness = bookingDetails.business || {};
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

    const [selectedExtras, setSelectedExtras] = useState(bookingDetails.extras || []);

    const { date, time, courtName, serviceName, price: basePrice, specialistName, duration } = bookingDetails;
    const price = basePrice + selectedExtras.reduce((sum, e) => sum + Number(e.price), 0);

    // 🎫 Calculate promo discount (based on slot base price only)
    let promoDiscount = 0;
    let promoLabel = '';
    if (activePromotion && activePromotion.discount_value > 0) {
        if (activePromotion.discount_type === 'fixed') {
            promoDiscount = Math.min(activePromotion.discount_value, basePrice);
            promoLabel = `Cupón -$${promoDiscount.toLocaleString('es-AR')}`;
        } else {
            promoDiscount = Math.round(basePrice * (activePromotion.discount_value / 100));
            promoLabel = `Cupón ${activePromotion.discount_value}% OFF`;
        }
    }
    const finalPrice = price - promoDiscount;

    // Calculate deposit (based on basePriceAfterPromo, NOT including extras!)
    const basePriceAfterPromo = basePrice - promoDiscount;
    let depositAmount = 0;
    let depositLabel = 'Seña';

    if (depositSettings.enabled === false) {
        depositAmount = 0;
    } else {
        const percentage = parseFloat(depositSettings.percentage);
        const fixed = parseInt(depositSettings.fixed_amount);

        if (depositSettings.percentage && !isNaN(percentage) && percentage > 0) {
            depositAmount = Math.round(basePriceAfterPromo * (percentage / 100));
            depositLabel = `Seña (${percentage}%)`;
        } else if (!isNaN(fixed) && fixed > 0) {
            depositAmount = fixed;
            depositLabel = 'Seña (Monto Fijo)';
        } else {
            depositAmount = 0;
            depositLabel = 'Seña';
        }
    }

    // Bank details
    const bankDetails = {
        banco: bankDetailsFromSettings.bank_name || business.bank_name || '',
        titular: bankDetailsFromSettings.account_holder || business.account_holder || '',
        alias: bankDetailsFromSettings.alias || business.bank_alias || '',
        cbu: bankDetailsFromSettings.cbu || business.cbu || ''
    };

    const hasBankDetails = bankDetails.banco || bankDetails.alias || bankDetails.cbu;

    const handleConfirmPayment = () => {
        const customerName = `${firstName} ${lastName}`;

        // Format the WhatsApp message
        const displayServiceName = courtName || serviceName;
        const formattedDate = formatDisplayDate(date);
        const specialistText = specialistName ? ` con ${specialistName}` : '';
        
        // Add selected extras to WhatsApp message
        const extrasText = selectedExtras.length > 0 
            ? `\n🛒 Adicionales sumados:\n` + selectedExtras.map(e => `- ${e.name} ($${e.price.toLocaleString('es-AR')})`).join('\n')
            : '';
            
        const message = `Hola, mi nombre es ${customerName}. Reservé ${displayServiceName}${specialistText}, el día ${formattedDate} a las ${time}.${extrasText}\n\nA continuación le envío una captura del comprobante.`;

        const businessPhone = bookingDetails.businessPhone || '5493804123456';

        // Open WhatsApp
        const whatsappUrl = `https://wa.me/${businessPhone}?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');

        // Call parent confirm
        onConfirm({ ...bookingDetails, customerName, customerPhone, extras: selectedExtras, price });
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
                            <div style={{
                                width: '32px',
                                height: '4px',
                                borderRadius: '2px',
                                backgroundColor: currentStep >= 1 ? sportColor : 'var(--border)',
                                transition: 'all 0.3s'
                            }} />
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
                            {currentStep === 1 ? '¿Querés agregar algún adicional?' : (currentStep === 2 ? 'Completa tus datos para continuar' : 'Transferí la seña para confirmar')}
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
                                        <span>{formatDisplayDate(date)}</span>
                                        <span>{time}</span>
                                    </div>
                                </div>

                                <div style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-primary)' }}>
                                    Sumá a tu reserva:
                                </div>

                                {/* Vertical List of Extras */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '42vh', overflowY: 'auto', paddingRight: '4px' }}>
                                    {availableExtras && availableExtras.length > 0 ? (
                                        availableExtras.map((extra, idx) => {
                                            const isSelected = selectedExtras.some(e => e.name === extra.name);
                                            const extraImage = extra.image || (
                                                extra.name.includes('Pala') ? 'https://images.unsplash.com/photo-1616788494707-ec28f08d05a1?w=200&q=80' :
                                                extra.name.includes('Pelotas') ? 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=200&q=80' :
                                                'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=200&q=80'
                                            );
                                            return (
                                                <div
                                                    key={idx}
                                                    onClick={() => {
                                                        if (isSelected) {
                                                            setSelectedExtras(prev => prev.filter(e => e.name !== extra.name));
                                                        } else {
                                                            setSelectedExtras(prev => [...prev, extra]);
                                                        }
                                                    }}
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '12px',
                                                        padding: '12px',
                                                        borderRadius: '16px',
                                                        border: isSelected ? `2px solid ${sportColor}` : '1px solid var(--border)',
                                                        backgroundColor: isSelected ? `${sportColor}08` : 'var(--bg-card)',
                                                        cursor: 'pointer',
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
                                                            {extra.name.includes('Alquiler') ? 'Alquiler para el partido' : 'Bebida fría al llegar'}
                                                        </div>
                                                    </div>
                                                    <div style={{ textAlign: 'right' }}>
                                                        <div style={{ fontSize: '13px', fontWeight: '800', color: isSelected ? sportColor : 'var(--text-primary)' }}>
                                                            +${extra.price.toLocaleString('es-AR')}
                                                        </div>
                                                        <div style={{ fontSize: '10px', color: isSelected ? sportColor : 'var(--text-secondary)', fontWeight: '700', marginTop: '2px' }}>
                                                            {isSelected ? 'Sumado ✓' : 'Agregar'}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)' }}>
                                            No hay adicionales recomendados disponibles.
                                        </div>
                                    )}
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
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--text-primary)', fontWeight: '700', borderBottom: `1px dashed ${sportColor}30`, paddingBottom: '8px', marginBottom: '4px' }}>
                                                <span>{formatDisplayDate(date)}</span>
                                                <span>{time}</span>
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
                                                        <span>{courtName || serviceName}</span>
                                                        <span>${basePrice.toLocaleString('es-AR')}</span>
                                                    </div>
                                                    {selectedExtras.map((extra, idx) => (
                                                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--text-secondary)' }}>
                                                            <span>+ {extra.name}</span>
                                                            <span>${extra.price.toLocaleString('es-AR')}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Subtotal */}
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                                                    {promoDiscount > 0 ? 'Subtotal' : 'Total a pagar'}
                                                </span>
                                                <span style={{
                                                    fontSize: promoDiscount > 0 ? '14px' : '18px',
                                                    fontWeight: promoDiscount > 0 ? '600' : '900',
                                                    color: promoDiscount > 0 ? 'var(--text-secondary)' : sportColor,
                                                    textDecoration: promoDiscount > 0 ? 'line-through' : 'none'
                                                }}>
                                                    ${price.toLocaleString('es-AR')}
                                                </span>
                                            </div>

                                            {/* Promo Row */}
                                            {promoDiscount > 0 && (
                                                <>
                                                    <div style={{
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        alignItems: 'center',
                                                        padding: '6px 10px',
                                                        borderRadius: '8px',
                                                        backgroundColor: '#10b98120',
                                                        border: '1px dashed #10b981'
                                                    }}>
                                                        <span style={{ fontSize: '13px', fontWeight: '600', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                            🎫 {promoLabel}
                                                        </span>
                                                        <span style={{ fontSize: '14px', fontWeight: '700', color: '#10b981' }}>
                                                            -${promoDiscount.toLocaleString('es-AR')}
                                                        </span>
                                                    </div>
                                                    <div style={{
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        alignItems: 'center',
                                                        paddingTop: '4px'
                                                    }}>
                                                        <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>Total con descuento</span>
                                                        <span style={{ fontSize: '20px', fontWeight: '900', color: sportColor }}>
                                                            ${finalPrice.toLocaleString('es-AR')}
                                                        </span>
                                                    </div>
                                                </>
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
                                        Teléfono
                                    </label>
                                    <input
                                        type="tel"
                                        value={customerPhone}
                                        onChange={(e) => setCustomerPhone(e.target.value)}
                                        placeholder="Ej: 3804123456"
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

                                {/* Action Buttons */}
                                <div style={{ display: 'flex', gap: '12px' }}>
                                    <button
                                        onClick={() => setCurrentStep(1)}
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
                                        Volver
                                    </button>
                                    <button
                                        onClick={() => setCurrentStep(3)}
                                        disabled={!firstName || !lastName || !customerPhone}
                                        style={{
                                            flex: 2,
                                            padding: '16px',
                                            borderRadius: '12px',
                                            border: 'none',
                                            backgroundColor: (!firstName || !lastName || !customerPhone) ? 'var(--border)' : (sportColor || 'var(--primary-paddle)'),
                                            color: (!firstName || !lastName || !customerPhone) ? 'var(--text-secondary)' : '#ffffff',
                                            fontSize: '16px',
                                            fontWeight: '700',
                                            cursor: (!firstName || !lastName || !customerPhone) ? 'not-allowed' : 'pointer',
                                            opacity: (!firstName || !lastName || !customerPhone) ? 0.8 : 1,
                                            boxShadow: (!firstName || !lastName || !customerPhone) ? 'none' : `0 8px 20px ${sportColor}40`,
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
                                {/* Payment Instructions */}
                                <div style={{ marginBottom: '12px', textAlign: 'center' }}>
                                    <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' }}>
                                        Transferí la seña
                                    </h3>
                                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
                                        Realizá la transferencia por <strong>${depositAmount.toLocaleString('es-AR')}</strong> a los siguientes datos
                                    </p>
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

                                    {/* Important Note */}
                                    <div style={{
                                        padding: '8px 12px',
                                        borderRadius: '10px',
                                        backgroundColor: `${sportColor}10`,
                                        border: `1px solid ${sportColor}30`,
                                        marginBottom: '12px'
                                    }}>
                                        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.4' }}>
                                            <strong style={{ color: sportColor }}>Importante:</strong> Copiá el Alias o CBU, realizá la transferencia y luego presioná "Confirmar Reserva" para enviar el comprobante por WhatsApp.
                                        </p>
                                    </div>
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
