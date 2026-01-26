import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDisplayDate, calculateEndTime } from '../utils/dateUtils';

// 🔥 CACHÉ GLOBAL (Nivel Módulo): Sobrevive a desmontajes/remontajes del componente
// Esto soluciona el problema si el componente se desmonta y vuelve a montar con datos vacíos
let globalCachedPaymentData = {
    businessId: null,
    data: null
};

export default function BookingSummary({ bookingDetails, sportColor, onClose, onConfirm, isSubmitting }) {
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
        // Si hay datos nuevos y válidos (y diferentes), actualizamos todo
        if (JSON.stringify(incomingPaymentSettings) !== JSON.stringify(currentSettings)) {


            const newData = {
                business: incomingBusiness,
                paymentSettings: incomingPaymentSettings,
                depositSettings: incomingPaymentSettings.deposit || {},
                bankDetailsFromSettings: incomingPaymentSettings.bank_details || {}
            };

            // Actualizar ref local
            paymentDataRef.current = newData;

            // Actualizar caché global
            if (businessId) {
                globalCachedPaymentData = {
                    businessId: businessId,
                    data: newData
                };
            }
        }
    } else {
        // Debug: saber por qué estamos esperando

    }

    // Usamos SIEMPRE los datos del ref (que tendrá los últimos datos válidos conocidos)
    const { business, paymentSettings, depositSettings, bankDetailsFromSettings } = paymentDataRef.current;

    // Block body scroll when modal is open
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []);

    if (!bookingDetails) return null;

    const { date, time, courtName, serviceName, price, specialistName, duration } = bookingDetails;

    // Calculate deposit
    let depositAmount = 0;
    let depositLabel = 'Seña';

    // 🔍 DEBUG: Ver valores específicos del depósito
    /*    console.log('🔍 Deposit calculation:', {
            enabled: depositSettings.enabled,
            type: depositSettings.type,
            percentage: depositSettings.percentage,
            percentage_type: typeof depositSettings.percentage,
            fixed_amount: depositSettings.fixed_amount
        });*/

    if (depositSettings.enabled === false) {
        depositAmount = 0;
    } else {
        const percentage = parseFloat(depositSettings.percentage);
        const fixed = parseInt(depositSettings.fixed_amount);

        // Prioritize percentage if set/valid
        if (depositSettings.percentage && !isNaN(percentage) && percentage > 0) {
            depositAmount = Math.round(price * (percentage / 100));
            depositLabel = `Seña (${percentage}%)`;
        } else if (!isNaN(fixed) && fixed > 0) {
            depositAmount = fixed;
            depositLabel = 'Seña (Monto Fijo)';
        } else {
            // Fallback if enabled but no valid values
            depositAmount = 0;
            depositLabel = 'Seña (No configurada)';
        }
    }

    // Bank details - prioritize payment_settings.bank_details
    const bankDetails = {
        banco: bankDetailsFromSettings.bank_name || business.bank_name || '',
        titular: bankDetailsFromSettings.account_holder || business.account_holder || '',
        alias: bankDetailsFromSettings.alias || business.bank_alias || '',
        cbu: bankDetailsFromSettings.cbu || business.cbu || ''
    };

    const hasBankDetails = bankDetails.banco || bankDetails.alias || bankDetails.cbu;




    const handleContinue = () => {
        if (!firstName || !lastName || !customerPhone) {
            alert('Por favor completa todos los campos');
            return;
        }
        setCurrentStep(2);
    };

    const handleConfirmPayment = () => {
        const customerName = `${firstName} ${lastName}`;

        // Format the WhatsApp message
        const displayServiceName = courtName || serviceName;
        const formattedDate = formatDisplayDate(date);
        const specialistText = specialistName ? ` con ${specialistName}` : '';
        const message = `Hola, mi nombre es ${customerName}. Reservé ${displayServiceName}${specialistText}, el día ${formattedDate} a las ${time}. A continuación le envío una captura del comprobante.`;

        // Get business phone (should come from bookingDetails in production)
        const businessPhone = bookingDetails.businessPhone || '5493804123456'; // Default fallback

        // Open WhatsApp with pre-filled message
        const whatsappUrl = `https://wa.me/${businessPhone}?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');

        // Also call the original onConfirm to save the booking
        onConfirm({ ...bookingDetails, customerName, customerPhone });
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
                    margin: 'auto'
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
                        </div>

                        <h2 style={{
                            fontSize: '18px',
                            fontWeight: '800',
                            color: 'var(--text-primary)',
                            marginBottom: '2px'
                        }}>
                            {currentStep === 1 ? 'Confirmar Reserva' : 'Datos de Pago'}
                        </h2>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: 0 }}>
                            {currentStep === 1 ? 'Completa tus datos para continuar' : 'Transferí la seña para confirmar'}
                        </p>
                    </div>
                </div>

                {/* Content with AnimatePresence for smooth transitions */}
                <div className="responsive-modal-content">
                    <AnimatePresence mode="wait">
                        {currentStep === 1 ? (
                            <motion.div
                                key="step1"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                transition={{ duration: 0.3 }}
                                style={{ padding: '16px 20px 20px 20px' }}
                            >
                                {/* Details Cards */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                                    {/* Service/Court */}
                                    <div style={{
                                        padding: '12px 16px',
                                        borderRadius: '12px',
                                        backgroundColor: 'var(--bg-main)',
                                        border: '1px solid var(--border)',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center'
                                    }}>
                                        <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                                            {courtName ? 'Cancha' : 'Servicio'}
                                        </span>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)' }}>
                                                {courtName || serviceName}
                                            </div>
                                            {specialistName && (
                                                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                                    {specialistName}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Date & Time */}
                                    <div style={{ display: 'flex', gap: '12px' }}>
                                        <div style={{
                                            flex: 1,
                                            padding: '12px 16px',
                                            borderRadius: '12px',
                                            backgroundColor: 'var(--bg-main)',
                                            border: '1px solid var(--border)'
                                        }}>
                                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Fecha</div>
                                            <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>
                                                {formatDisplayDate(date)}
                                            </div>
                                        </div>
                                        <div style={{
                                            flex: 1,
                                            padding: '12px 16px',
                                            borderRadius: '12px',
                                            backgroundColor: 'var(--bg-main)',
                                            border: '1px solid var(--border)'
                                        }}>
                                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Hora</div>
                                            <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>
                                                {time} {duration ? `- ${calculateEndTime(time, duration)}` : ''}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Price with Deposit */}
                                    {price > 0 && (
                                        <div style={{
                                            padding: '12px 16px',
                                            borderRadius: '12px',
                                            backgroundColor: `${sportColor}10`,
                                            border: `1px solid ${sportColor}30`,
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '8px'
                                        }}>
                                            {/* Base Price & Extras Breakdown */}
                                            {bookingDetails.extras && bookingDetails.extras.length > 0 && (
                                                <div style={{
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: '4px',
                                                    marginBottom: '8px',
                                                    paddingBottom: '8px',
                                                    borderBottom: `1px dashed ${sportColor}30`
                                                }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--text-secondary)' }}>
                                                        <span>Alquiler base</span>
                                                        <span>${(price - bookingDetails.extras.reduce((sum, e) => sum + e.price, 0)).toLocaleString()}</span>
                                                    </div>
                                                    {bookingDetails.extras.map((extra, idx) => (
                                                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--text-secondary)' }}>
                                                            <span>+ {extra.name}</span>
                                                            <span>${extra.price.toLocaleString()}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Total a pagar</span>
                                                <span style={{ fontSize: '18px', fontWeight: '900', color: sportColor }}>
                                                    ${price.toLocaleString()}
                                                </span>
                                            </div>

                                            {/* Deposit Amount */}
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
                                                    ${depositAmount.toLocaleString()}
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* User Inputs */}
                                <div style={{ marginBottom: '16px' }}>
                                    {/* Name Fields - Side by Side */}
                                    <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                                        <div style={{ flex: 1 }}>
                                            <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: 'var(--text-primary)' }}>
                                                Nombre
                                            </label>
                                            <input
                                                type="text"
                                                value={firstName}
                                                onChange={(e) => setFirstName(e.target.value)}
                                                placeholder="Ej: Juan"
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
                                                placeholder="Ej: Pérez"
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
                                        onClick={onClose}
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
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.backgroundColor = 'var(--bg-main)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.backgroundColor = 'transparent';
                                        }}
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleContinue}
                                        disabled={!firstName || !lastName || !customerPhone}
                                        style={{
                                            flex: 2,
                                            padding: '16px',
                                            borderRadius: '12px',
                                            border: 'none',
                                            backgroundColor: (!firstName || !lastName || !customerPhone) ? '#9E9E9E' : sportColor,
                                            color: '#fff',
                                            fontSize: '16px',
                                            fontWeight: '700',
                                            cursor: (!firstName || !lastName || !customerPhone) ? 'not-allowed' : 'pointer',
                                            opacity: 1,
                                            boxShadow: (!firstName || !lastName || !customerPhone) ? 'none' : `0 8px 20px ${sportColor}40`,
                                            transition: 'all 0.2s'
                                        }}
                                        onMouseEnter={(e) => {
                                            if (firstName && lastName && customerPhone) {
                                                e.currentTarget.style.transform = 'translateY(-2px)';
                                                e.currentTarget.style.boxShadow = `0 12px 28px ${sportColor}50`;
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            if (firstName && lastName && customerPhone) {
                                                e.currentTarget.style.transform = 'translateY(0)';
                                                e.currentTarget.style.boxShadow = `0 8px 20px ${sportColor}40`;
                                            }
                                        }}
                                    >
                                        Continuar
                                    </button>
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="step2"
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
                                        Realizá la transferencia por <strong>${depositAmount.toLocaleString()}</strong> a los siguientes datos
                                    </p>
                                </div>

                                {/* Bank Details */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>


                                    {/* Bank Details Section */}
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
                                            <strong style={{ color: sportColor }}>Importante:</strong> Copiá el Alias o CBU, realizá la transferencia por <strong>${depositAmount.toLocaleString()}</strong> y luego presioná "Confirmar Reserva" para enviar el comprobante por WhatsApp.
                                        </p>
                                    </div>

                                </div>
                                {/* Action Buttons */}
                                <div style={{ display: 'flex', gap: '12px' }}>
                                    <button
                                        onClick={() => setCurrentStep(1)}
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
                }

                .responsive-modal-content {
                    overflow-y: auto;
                    flex: 1;
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
