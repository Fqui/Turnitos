import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import CouponInput from '../../common/CouponInput';
import AmenityIcon from '../../common/AmenityIcon';
import { useBodyScrollLock } from '../../../hooks/useBodyScrollLock';
import { TimePicker } from '../../common/controls';
import { readableTextOn } from '../../common/controls/color';

export default function VenueBookingWizardModal({
    showBookingModal,
    setShowBookingModal,
    bookingStep,
    setBookingStep,
    guestCount,
    setGuestCount,
    maxCapacity,
    duration,
    setDuration,
    startTime,
    setStartTime,
    usesRentalSchedule,
    startOptions = [],
    endTimeLabel,
    durationOptions,
    durationDiscountPct,
    durationDiscountAmount,
    rawBasePrice,
    basePrice,
    subtotalPrice,
    totalPrice,
    selectedDate,
    selectedServices,
    toggleService,
    additionalServices,
    appliedCoupon,
    setAppliedCoupon,
    couponDiscountAmount,
    handleConfirmBooking,
    showAlert,
    business,
    cardBg,
    subCardBg,
    btnBg,
    textColor,
    secondaryTextColor,
    borderColor,
    primaryColor
}) {
    useBodyScrollLock(!!showBookingModal);
    // Deposit calculation
    const depositSettings = business?.payment_settings?.deposit || business?.metadata?.payment_settings?.deposit;
    const depositPctValue = Number(depositSettings?.percentage) || 0;
    const depositFixedValue = Number(depositSettings?.fixed_amount) || 0;
    // El tipo manda; sin tipo (datos viejos) se usa fijo solo si no hay porcentaje
    const useFixedDeposit = depositSettings?.type === 'fixed'
        ? depositFixedValue > 0
        : (!depositSettings?.type && depositPctValue <= 0 && depositFixedValue > 0);
    const depositAmount = useFixedDeposit
        ? Math.min(depositFixedValue, totalPrice)
        : (depositPctValue > 0 ? Math.round(totalPrice * (depositPctValue / 100)) : 0);
    const hasDeposit = Boolean(depositSettings?.enabled && depositAmount > 0);
    const remainingBalance = Math.max(0, totalPrice - depositAmount);

    return (
        <AnimatePresence>
            {showBookingModal && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0,0,0,0.6)',
                        backdropFilter: 'blur(8px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000,
                        padding: '20px'
                    }}
                    onClick={() => setShowBookingModal(false)}
                >
                    <motion.div
                        initial={{ scale: 0.92, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.92, opacity: 0, y: 20 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            background: cardBg,
                            borderRadius: '24px',
                            maxWidth: '500px',
                            width: '100%',
                            maxHeight: '90vh',
                            overflow: 'auto',
                            padding: '28px 24px',
                            display: 'flex',
                            flexDirection: 'column',
                            boxShadow: '0 25px 60px rgba(0,0,0,0.3)'
                        }}
                    >
                        {/* Header & Steps Indicator */}
                        <div style={{ marginBottom: '22px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                <motion.h2
                                    key={bookingStep}
                                    initial={{ opacity: 0, y: -4 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.2 }}
                                    style={{ fontSize: '22px', fontWeight: '900', margin: 0, color: textColor }}
                                >
                                    {bookingStep === 1 && 'Detalles del Evento'}
                                    {bookingStep === 2 && 'Servicios Adicionales'}
                                    {bookingStep === 3 && 'Resumen de Reserva'}
                                    {bookingStep === 4 && 'Tus Datos de Contacto'}
                                </motion.h2>
                                <button
                                    onClick={() => setShowBookingModal(false)}
                                    style={{
                                        width: '36px',
                                        height: '36px',
                                        borderRadius: '50%',
                                        background: 'rgba(0, 0, 0, 0.05)',
                                        border: 'none',
                                        fontSize: '15px',
                                        cursor: 'pointer',
                                        color: secondaryTextColor,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        transition: 'background 0.2s ease',
                                        padding: 0
                                    }}
                                    aria-label="Cerrar modal"
                                >
                                    ✕
                                </button>
                            </div>

                            {/* Progress Bar */}
                            <div style={{ display: 'flex', gap: '8px' }}>
                                {[1, 2, 3, 4].map(step => (
                                    <div key={step} style={{
                                        flex: 1,
                                        height: '4px',
                                        borderRadius: '2px',
                                        background: step <= bookingStep ? primaryColor : (borderColor || 'rgba(0,0,0,0.1)'),
                                        transition: 'background 0.3s ease'
                                    }} />
                                ))}
                            </div>
                        </div>

                        {/* Animated Step Content */}
                        <AnimatePresence mode="wait">
                            {/* STEP 1: Configuration (Guests & Duration) */}
                            {bookingStep === 1 && (
                                <motion.div
                                    key="step-1"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.22, ease: 'easeOut' }}
                                    style={{ flex: 1 }}
                                >
                                    <p style={{ fontSize: '14px', color: secondaryTextColor, marginBottom: '24px' }}>
                                        Personalizá la cantidad de invitados y horas para tu reserva.
                                    </p>

                                    <div style={{ display: 'grid', gap: '24px' }}>
                                        {/* Guest Counter */}
                                        <div>
                                            <div style={{ fontSize: '14px', fontWeight: '700', color: textColor, marginBottom: '12px' }}>
                                                Cantidad de Invitados
                                            </div>
                                            <div style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                background: subCardBg,
                                                borderRadius: '16px',
                                                padding: '16px'
                                            }}>
                                                <motion.button
                                                    whileTap={{ scale: 0.9 }}
                                                    onClick={() => setGuestCount(prev => Math.max(5, (Number(prev) || 30) - 5))}
                                                    disabled={guestCount <= 5}
                                                    style={{
                                                        background: btnBg,
                                                        border: `1px solid ${borderColor}`,
                                                        width: '44px',
                                                        height: '44px',
                                                        borderRadius: '12px',
                                                        cursor: guestCount <= 5 ? 'not-allowed' : 'pointer',
                                                        opacity: guestCount <= 5 ? 0.4 : 1,
                                                        fontSize: '20px',
                                                        fontWeight: '700',
                                                        color: textColor,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center'
                                                    }}
                                                >
                                                    −
                                                </motion.button>
                                                <div style={{ textAlign: 'center' }}>
                                                    <motion.div
                                                        key={guestCount}
                                                        initial={{ scale: 0.8, opacity: 0 }}
                                                        animate={{ scale: 1, opacity: 1 }}
                                                        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                                                        style={{ fontSize: '24px', fontWeight: '900', color: textColor }}
                                                    >
                                                        {guestCount}
                                                    </motion.div>
                                                    <div style={{ fontSize: '13px', color: secondaryTextColor }}>personas</div>
                                                </div>
                                                <motion.button
                                                    whileTap={{ scale: 0.9 }}
                                                    onClick={() => setGuestCount(prev => Math.min(maxCapacity, (Number(prev) || 30) + 5))}
                                                    disabled={guestCount >= maxCapacity}
                                                    style={{
                                                        background: btnBg,
                                                        border: `1px solid ${borderColor}`,
                                                        width: '44px',
                                                        height: '44px',
                                                        borderRadius: '12px',
                                                        cursor: guestCount >= maxCapacity ? 'not-allowed' : 'pointer',
                                                        opacity: guestCount >= maxCapacity ? 0.4 : 1,
                                                        fontSize: '20px',
                                                        fontWeight: '700',
                                                        color: textColor,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center'
                                                    }}
                                                >
                                                    +
                                                </motion.button>
                                            </div>
                                        </div>

                                        {/* Duration Selector */}
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                                                <span style={{ fontSize: '14px', fontWeight: '700', color: textColor }}>Duración del Evento</span>
                                                {durationDiscountPct > 0 && (
                                                    <span style={{
                                                        fontSize: '11px',
                                                        background: 'rgba(16, 185, 129, 0.15)',
                                                        color: '#10B981',
                                                        border: '1px solid rgba(16, 185, 129, 0.3)',
                                                        padding: '2px 8px',
                                                        borderRadius: '12px',
                                                        fontWeight: '700'
                                                    }}>
                                                        🔥 {durationDiscountPct}% OFF
                                                    </span>
                                                )}
                                            </div>
                                            <div style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                background: subCardBg,
                                                borderRadius: '16px',
                                                padding: '16px'
                                            }}>
                                                <motion.button
                                                    whileTap={{ scale: 0.9 }}
                                                    onClick={() => {
                                                        const currentIdx = durationOptions.indexOf(duration);
                                                        if (currentIdx > 0) setDuration(durationOptions[currentIdx - 1]);
                                                    }}
                                                    disabled={durationOptions.indexOf(duration) === 0}
                                                    style={{
                                                        background: btnBg,
                                                        border: `1px solid ${borderColor}`,
                                                        width: '44px',
                                                        height: '44px',
                                                        borderRadius: '12px',
                                                        cursor: durationOptions.indexOf(duration) === 0 ? 'not-allowed' : 'pointer',
                                                        fontSize: '20px',
                                                        fontWeight: '700',
                                                        color: textColor,
                                                        opacity: durationOptions.indexOf(duration) === 0 ? 0.4 : 1,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center'
                                                    }}
                                                >
                                                    −
                                                </motion.button>
                                                <div style={{ textAlign: 'center' }}>
                                                    <motion.div
                                                        key={duration}
                                                        initial={{ scale: 0.8, opacity: 0 }}
                                                        animate={{ scale: 1, opacity: 1 }}
                                                        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                                                        style={{ fontSize: '24px', fontWeight: '900', color: textColor }}
                                                    >
                                                        {duration}
                                                    </motion.div>
                                                    <div style={{ fontSize: '13px', color: secondaryTextColor }}>horas</div>
                                                </div>
                                                <motion.button
                                                    whileTap={{ scale: 0.9 }}
                                                    onClick={() => {
                                                        const currentIdx = durationOptions.indexOf(duration);
                                                        if (currentIdx < durationOptions.length - 1) setDuration(durationOptions[currentIdx + 1]);
                                                    }}
                                                    disabled={durationOptions.indexOf(duration) === durationOptions.length - 1}
                                                    style={{
                                                        background: btnBg,
                                                        border: `1px solid ${borderColor}`,
                                                        width: '44px',
                                                        height: '44px',
                                                        borderRadius: '12px',
                                                        cursor: durationOptions.indexOf(duration) === durationOptions.length - 1 ? 'not-allowed' : 'pointer',
                                                        fontSize: '20px',
                                                        fontWeight: '700',
                                                        color: textColor,
                                                        opacity: durationOptions.indexOf(duration) === durationOptions.length - 1 ? 0.4 : 1,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center'
                                                    }}
                                                >
                                                    +
                                                </motion.button>
                                            </div>
                                        </div>

                                        {/* Start time */}
                                        <div>
                                            <label htmlFor="venueStartTime" style={{ display: 'block', fontSize: '14px', fontWeight: '700', color: textColor, marginBottom: '12px' }}>
                                                Hora de ingreso
                                            </label>
                                            {usesRentalSchedule ? (
                                                <>
                                                    {startOptions.length === 0 ? (
                                                        <p style={{ margin: 0, fontSize: '14px', color: secondaryTextColor }}>Ese día no se alquila. Elegí otra fecha.</p>
                                                    ) : (
                                                        <div id="venueStartTime" role="group" aria-label="Hora de ingreso" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                                            {startOptions.map(option => {
                                                                const selected = option.available && startTime === option.time;
                                                                return (
                                                                    <button
                                                                        key={option.time}
                                                                        type="button"
                                                                        disabled={!option.available}
                                                                        aria-pressed={selected}
                                                                        title={option.reason === 'taken' ? 'Ya está reservado' : option.reason === 'max_end' ? 'Con esas horas te pasás del horario de entrega' : option.reason === 'past' ? 'Ese horario ya pasó' : `Salida ${option.endTime}`}
                                                                        onClick={() => setStartTime(option.time)}
                                                                        style={{
                                                                            minWidth: '76px',
                                                                            minHeight: '44px',
                                                                            padding: '10px 14px',
                                                                            borderRadius: '14px',
                                                                            border: `1px solid ${selected ? primaryColor : borderColor}`,
                                                                            background: selected ? primaryColor : subCardBg,
                                                                            color: selected ? (readableTextOn(primaryColor) || '#000') : textColor,
                                                                            fontSize: '15px',
                                                                            fontWeight: '700',
                                                                            fontFamily: 'inherit',
                                                                            fontVariantNumeric: 'tabular-nums',
                                                                            cursor: option.available ? 'pointer' : 'not-allowed',
                                                                            opacity: option.available ? 1 : 0.4,
                                                                            textDecoration: option.available ? 'none' : 'line-through'
                                                                        }}
                                                                    >
                                                                        {option.time}
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                    {startOptions.length > 0 && !startOptions.some(o => o.available) && (
                                                        <p style={{ margin: '10px 0 0', fontSize: '13px', color: '#d97706' }}>
                                                            {startOptions.some(o => o.reason === 'max_end')
                                                                ? `Con ${duration} hs no entra ningún horario ese día. Probá con menos horas.`
                                                                : 'Ese día ya no tiene horarios libres. Elegí otra fecha.'}
                                                        </p>
                                                    )}
                                                </>
                                            ) : (
                                                <TimePicker
                                                    id="venueStartTime"
                                                    size="lg"
                                                    step={30}
                                                    title="Hora de ingreso"
                                                    placeholder="Elegí la hora"
                                                    value={startTime}
                                                    onChange={setStartTime}
                                                    style={{ background: subCardBg, borderColor, color: textColor, borderRadius: '16px' }}
                                                />
                                            )}
                                            {startTime && endTimeLabel && (
                                                <div style={{ marginTop: '12px', padding: '12px 14px', borderRadius: '14px', background: subCardBg, border: `1px solid ${borderColor}`, display: 'flex', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap', fontSize: '14px', color: secondaryTextColor }}>
                                                    <span>Ingreso <strong style={{ color: textColor }}>{startTime} hs</strong></span>
                                                    <span>Salida <strong style={{ color: textColor }}>{endTimeLabel} hs</strong></span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {/* STEP 2: Additional Services */}
                            {bookingStep === 2 && (
                                <motion.div
                                    key="step-2"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.22, ease: 'easeOut' }}
                                    style={{ flex: 1 }}
                                >
                                    <p style={{ fontSize: '14px', color: secondaryTextColor, marginBottom: '20px' }}>
                                        Agrega servicios extra para tu evento (opcional).
                                    </p>

                                    {additionalServices.length > 0 ? (
                                        <div style={{ display: 'grid', gap: '12px', maxHeight: '340px', overflowY: 'auto', paddingRight: '4px' }}>
                                            {additionalServices.map((service, idx) => {
                                                const isSelected = selectedServices.some(s => (s.id && service.id) ? s.id === service.id : s.name === service.name);
                                                return (
                                                    <motion.div
                                                        key={idx}
                                                        whileTap={{ scale: 0.98 }}
                                                        onClick={() => toggleService(service)}
                                                        style={{
                                                            display: 'flex',
                                                            justifyContent: 'space-between',
                                                            alignItems: 'center',
                                                            padding: '16px',
                                                            background: isSelected ? 'rgba(132, 204, 22, 0.08)' : subCardBg,
                                                            borderRadius: '16px',
                                                            cursor: 'pointer',
                                                            border: isSelected ? `2px solid ${primaryColor}` : `1px solid ${borderColor}`,
                                                            transition: 'background 0.2s ease, border-color 0.2s ease'
                                                        }}
                                                    >
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                                            <div style={{
                                                                width: '40px',
                                                                height: '40px',
                                                                borderRadius: '10px',
                                                                background: isSelected ? primaryColor : btnBg,
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                fontSize: '20px',
                                                                color: isSelected ? 'white' : secondaryTextColor,
                                                                transition: 'all 0.2s ease'
                                                            }}>
                                                                {isSelected ? '✓' : <AmenityIcon icon={service.icon || 'Sparkles'} preferEmoji size={22} />}
                                                            </div>
                                                            <div>
                                                                <div style={{ fontSize: '15px', fontWeight: '700', color: textColor }}>
                                                                    {service.name}
                                                                </div>
                                                                <div style={{ fontSize: '14px', fontWeight: '700', color: primaryColor, marginTop: '2px' }}>
                                                                    +${service.price?.toLocaleString('es-AR')}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div style={{ textAlign: 'center', padding: '40px 0', color: secondaryTextColor }}>
                                            No hay servicios adicionales disponibles para este espacio.
                                        </div>
                                    )}
                                </motion.div>
                            )}

                            {/* STEP 3: Summary */}
                            {bookingStep === 3 && (
                                <motion.div
                                    key="step-3"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.22, ease: 'easeOut' }}
                                    style={{ flex: 1 }}
                                >
                                    <div style={{
                                        background: subCardBg,
                                        borderRadius: '16px',
                                        padding: '24px'
                                    }}>
                                        {/* Date & Guests (2 Columns) */}
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                                            <div>
                                                <div style={{ fontSize: '12px', color: secondaryTextColor, marginBottom: '4px' }}>FECHA</div>
                                                <div style={{ fontSize: '15px', fontWeight: '700', color: textColor, textTransform: 'capitalize' }}>
                                                    {selectedDate?.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}
                                                </div>
                                                {startTime && (
                                                    <div style={{ fontSize: '13px', color: secondaryTextColor, marginTop: '2px' }}>de {startTime} a {endTimeLabel} hs</div>
                                                )}
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <div style={{ fontSize: '12px', color: secondaryTextColor, marginBottom: '4px' }}>INVITADOS</div>
                                                <div style={{ fontSize: '15px', fontWeight: '700', color: textColor }}>{guestCount} pers.</div>
                                            </div>
                                        </div>

                                        {/* Breakdown list */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ color: secondaryTextColor, fontSize: '14px' }}>
                                                    Alquiler base ({duration}h)
                                                </span>
                                                <span style={{ fontWeight: '600', fontSize: '14px', color: textColor }}>
                                                    ${rawBasePrice.toLocaleString('es-AR')}
                                                </span>
                                            </div>

                                            {durationDiscountPct > 0 && (
                                                <div style={{
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    color: '#10B981',
                                                    fontSize: '14px',
                                                    fontWeight: '600'
                                                }}>
                                                    <span>Descuento por {duration}hs ({durationDiscountPct}% OFF)</span>
                                                    <span>-${durationDiscountAmount.toLocaleString('es-AR')}</span>
                                                </div>
                                            )}

                                            {selectedServices.map((service, idx) => (
                                                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <span style={{ color: secondaryTextColor, fontSize: '14px' }}>{service.name}</span>
                                                    <span style={{ fontWeight: '600', fontSize: '14px', color: textColor }}>
                                                        +${service.price.toLocaleString('es-AR')}
                                                    </span>
                                                </div>
                                            ))}

                                            {appliedCoupon?.giftBenefit && (
                                                <div style={{
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    color: '#2563EB',
                                                    fontSize: '14px',
                                                    fontWeight: '700'
                                                }}>
                                                    <span>🎁 Beneficio incluido:</span>
                                                    <span>{appliedCoupon.giftBenefit}</span>
                                                </div>
                                            )}

                                            {/* Coupon Component */}
                                            <CouponInput
                                                businessId={business?.id || null}
                                                coupons={business?.coupons || business?.metadata?.coupons || []}
                                                totalAmount={subtotalPrice}
                                                bookingDate={selectedDate}
                                                appliedCoupon={appliedCoupon}
                                                onApplyCoupon={(res) => setAppliedCoupon(res)}
                                                onRemoveCoupon={() => setAppliedCoupon(null)}
                                                primaryColor={primaryColor}
                                                textColor={textColor}
                                                secondaryTextColor={secondaryTextColor}
                                                borderColor={borderColor}
                                            />

                                            <div style={{ height: '1px', background: borderColor || 'rgba(0,0,0,0.08)', margin: '6px 0' }} />

                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ fontWeight: '700', fontSize: '16px', color: textColor }}>Total Final</span>
                                                <span style={{ fontWeight: '900', fontSize: '24px', color: primaryColor }}>
                                                    ${totalPrice.toLocaleString('es-AR')}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {/* STEP 4: Customer Form */}
                            {bookingStep === 4 && (
                                <motion.div
                                    key="step-4"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.22, ease: 'easeOut' }}
                                    style={{ flex: 1 }}
                                >
                                    <p style={{ fontSize: '14px', color: secondaryTextColor, marginBottom: '20px' }}>
                                        Ingresa tus datos de contacto para enviarte la confirmación.
                                    </p>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: textColor }}>Nombre</label>
                                            <input type="text" id="customerFirstName" placeholder="Tu nombre" style={{ width: '100%', padding: '12px', borderRadius: '12px', border: `1px solid ${borderColor}`, background: subCardBg, color: textColor }} />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: textColor }}>Apellido</label>
                                            <input type="text" id="customerLastName" placeholder="Tu apellido" style={{ width: '100%', padding: '12px', borderRadius: '12px', border: `1px solid ${borderColor}`, background: subCardBg, color: textColor }} />
                                        </div>
                                    </div>
                                    <div style={{ marginBottom: '16px' }}>
                                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: textColor }}>Teléfono (WhatsApp)</label>
                                        <input type="tel" id="customerPhone" placeholder="3804..." style={{ width: '100%', padding: '12px', borderRadius: '12px', border: `1px solid ${borderColor}`, background: subCardBg, color: textColor }} />
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Footer Buttons */}
                        <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                            {bookingStep > 1 && (
                                <motion.button
                                    whileTap={{ scale: 0.96 }}
                                    onClick={() => {
                                        setBookingStep(prev => prev - 1)
                                    }}
                                    style={{
                                        padding: '16px 28px',
                                        borderRadius: '14px',
                                        border: `1px solid ${borderColor}`,
                                        background: btnBg || '#fff',
                                        fontSize: '15px',
                                        fontWeight: '600',
                                        cursor: 'pointer',
                                        color: secondaryTextColor
                                    }}
                                >
                                    Volver
                                </motion.button>
                            )}

                            <motion.button
                                whileTap={{ scale: 0.97 }}
                                whileHover={{ scale: 1.01 }}
                                onClick={() => {
                                    if (bookingStep === 1 && !startTime) {
                                        showAlert('Falta la hora', 'Elegí la hora de ingreso.', 'warning', 'Entendido');
                                        return;
                                    }
                                    if (bookingStep === 4) {
                                        const firstName = document.getElementById('customerFirstName')?.value;
                                        const lastName = document.getElementById('customerLastName')?.value;
                                        const phone = document.getElementById('customerPhone')?.value;

                                        const cleanDigits = (phone || '').replace(/\D/g, '');
                                        if (!firstName?.trim() || !lastName?.trim() || cleanDigits.length < 10) {
                                            showAlert('Datos requeridos', 'Por favor ingresa nombre, apellido y un teléfono válido con código de área (mínimo 10 dígitos, ej: 3804123456).', 'warning', 'Entendido');
                                            return;
                                        }

                                        handleConfirmBooking({
                                            customerName: `${firstName} ${lastName}`,
                                            customerPhone: phone
                                        });
                                    } else if (bookingStep === 2 && additionalServices.length === 0) {
                                        setBookingStep(prev => prev + 1);
                                    } else {
                                        setBookingStep(prev => prev + 1);
                                    }
                                }}
                                style={{
                                    flex: 1,
                                    padding: '16px 24px',
                                    borderRadius: '14px',
                                    border: 'none',
                                    background: primaryColor,
                                    color: 'white',
                                    fontSize: '15px',
                                    fontWeight: '700',
                                    cursor: 'pointer',
                                    boxShadow: '0 4px 14px rgba(0, 0, 0, 0.15)'
                                }}
                            >
                                {bookingStep === 4 ? 'Confirmar Reserva' : 'Siguiente'}
                            </motion.button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
