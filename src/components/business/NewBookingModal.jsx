import React, { useMemo, useEffect, useState } from 'react';
import CustomDropdown from '../common/CustomDropdown';

const NewBookingModal = ({
    isOpen,
    onClose,
    isMobile,
    newBookingData,
    setNewBookingData,
    currentBusiness,
    onSubmit,
    bookings
}) => {
    const [isManualDeposit, setIsManualDeposit] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [calendarMonth, setCalendarMonth] = useState(() => {
        if (newBookingData?.date) {
            const [y, m, d] = newBookingData.date.split('-');
            if (y && m) return new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1);
        }
        return new Date();
    });

    // Reset state when modal closes
    useEffect(() => {
        if (!isOpen) {
            setIsManualDeposit(false);
            setShowDatePicker(false);
        } else if (newBookingData?.date) {
            const [y, m, d] = newBookingData.date.split('-');
            if (y && m) setCalendarMonth(new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1));
        }
    }, [isOpen, newBookingData?.date]);

    // Detect Business Types
    const isRental = currentBusiness?.type === 'venue' ||
        currentBusiness?.type === 'rental' ||
        currentBusiness?.type === 'alquiler' ||
        currentBusiness?.is_rental ||
        (currentBusiness?.category || '').toLowerCase().includes('quincho') ||
        (currentBusiness?.category || '').toLowerCase().includes('alquiler') ||
        (currentBusiness?.categories?.name || '').toLowerCase().includes('alquiler') ||
        (currentBusiness?.category || '').toLowerCase().includes('salon') ||
        (currentBusiness?.category || '').toLowerCase().includes('salón') ||
        (currentBusiness?.name || '').toLowerCase().includes('quincho') ||
        (currentBusiness?.name || '').toLowerCase().includes('salon') ||
        (currentBusiness?.name || '').toLowerCase().includes('salón') ||
        currentBusiness?.subscription_plan_id === 'rental';

    const isPadel = !isRental && (
        (currentBusiness?.sport_type || '').toLowerCase().includes('padel') ||
        (currentBusiness?.category || '').toLowerCase().includes('padel') ||
        (currentBusiness?.categories?.name || '').toLowerCase().includes('padel') ||
        (currentBusiness?.name || '').toLowerCase().includes('padel') ||
        (newBookingData.resourceName || '').toLowerCase().includes('padel')
    );

    const isFutbol = !isRental && !isPadel && (
        (currentBusiness?.sport_type || '').toLowerCase().includes('futbol') ||
        (currentBusiness?.category || '').toLowerCase().includes('futbol') ||
        (currentBusiness?.categories?.name || '').toLowerCase().includes('futbol') ||
        (currentBusiness?.name || '').toLowerCase().includes('futbol') ||
        (currentBusiness?.type === 'sport' && !isPadel)
    );

    const isService = !isRental && !isPadel && !isFutbol && (
        currentBusiness?.type === 'service' ||
        currentBusiness?.type === 'beauty' ||
        currentBusiness?.type === 'barber' ||
        (currentBusiness?.category || '').toLowerCase().includes('peluqueria') ||
        (currentBusiness?.category || '').toLowerCase().includes('barber') ||
        (currentBusiness?.category || '').toLowerCase().includes('estetica')
    );

    // Capacity limit for rentals
    const maxCapacity = Number(currentBusiness?.capacity_limit || currentBusiness?.capacity || 100);

    // Duration options for rental
    const availableRentalDurations = useMemo(() => {
        const rawOptions = currentBusiness?.rental_duration_options || currentBusiness?.rentalDurationOptions || [];
        if (Array.isArray(rawOptions) && rawOptions.length > 0) {
            return rawOptions.map(opt => {
                if (typeof opt === 'object' && opt !== null) {
                    const h = Number(opt.hours || opt.duration || 4);
                    return {
                        hours: h,
                        label: opt.label || (h >= 24 ? '24 Hs (Completa)' : `${h} Horas`)
                    };
                }
                const h = Number(opt);
                return {
                    hours: h,
                    label: h >= 24 ? '24 Hs (Completa)' : `${h} Horas`
                };
            });
        }
        return [
            { hours: 4, label: '4 Horas' },
            { hours: 6, label: '6 Horas' },
            { hours: 8, label: '8 Horas' },
            { hours: 12, label: '12 Horas' },
            { hours: 24, label: '24 Hs (Completa)' }
        ];
    }, [currentBusiness]);

    // Selected Resource Name & Base Price (Auto-set and fixed)
    const selectedResourceInfo = useMemo(() => {
        const courtId = newBookingData.courtId || newBookingData.serviceId;
        const court = (currentBusiness?.courts || []).find(c => String(c.id) === String(courtId));
        const service = (currentBusiness?.services || []).find(s => String(s.id) === String(newBookingData.serviceId));

        let name = newBookingData.resourceName || court?.name || service?.name;
        if (!name) {
            if (isRental) name = 'Espacio / Salón';
            else if (isPadel) name = 'Cancha de Pádel';
            else if (isFutbol) name = 'Cancha de Fútbol';
            else if (currentBusiness?.type === 'sport') name = 'Cancha Asignada';
            else name = 'Servicio General';
        }

        const price = Number(court?.price || service?.price || newBookingData.basePrice || newBookingData.price || 0);

        return {
            name: name,
            price: price,
            displayText: `${name}${price > 0 ? ` • $${price.toLocaleString('es-AR')}` : ''}`
        };
    }, [newBookingData.courtId, newBookingData.serviceId, newBookingData.resourceName, newBookingData.basePrice, newBookingData.price, currentBusiness, isRental, isPadel, isFutbol]);

    // Business predefined catalog additionals (ONLY additional services / extras, exclude amenities)
    const catalogAdditionals = useMemo(() => {
        const list = [
            ...(currentBusiness?.additional_services || []),
            ...(currentBusiness?.additionalServices || []),
            ...(currentBusiness?.extras || [])
        ];

        const unique = [];
        const seen = new Set();

        list.forEach(item => {
            if (typeof item === 'object' && item !== null) {
                const name = item.name || item.label || item.title;
                if (name && !seen.has(name.toLowerCase().trim())) {
                    seen.add(name.toLowerCase().trim());
                    unique.push({
                        id: item.id || Math.random().toString(),
                        name: name.trim(),
                        price: Number(item.price || 0)
                    });
                }
            } else if (typeof item === 'string' && item.trim()) {
                if (!seen.has(item.toLowerCase().trim())) {
                    seen.add(item.toLowerCase().trim());
                    unique.push({
                        id: Math.random().toString(),
                        name: item.trim(),
                        price: 0
                    });
                }
            }
        });

        return unique;
    }, [currentBusiness]);

    // Normalized selected services list with quantity support
    const selectedAdditionals = useMemo(() => {
        const raw = newBookingData.selectedServices || [];
        return raw.map(item => {
            if (typeof item === 'object' && item !== null) {
                return {
                    name: item.name || item.label || 'Adicional',
                    price: Number(item.price || 0),
                    quantity: Math.max(1, parseInt(item.quantity, 10) || 1)
                };
            }
            const found = catalogAdditionals.find(cat => cat.name.toLowerCase() === String(item).toLowerCase());
            return {
                name: String(item),
                price: found ? found.price : 0,
                quantity: 1
            };
        });
    }, [newBookingData.selectedServices, catalogAdditionals]);

    // Helper function to calculate deposit: (Base Price * Business Percentage) + 100% of additionals
    const calculateAutoDeposit = (baseAmount, extrasAmount) => {
        const paymentSettings = currentBusiness?.payment_settings || currentBusiness?.paymentSettings || {};
        const depositSettings = paymentSettings.deposit || {};

        if (depositSettings.enabled === false) return 0;

        const percentage = depositSettings.percentage !== undefined && depositSettings.percentage !== '' && !isNaN(Number(depositSettings.percentage))
            ? Number(depositSettings.percentage)
            : 30;
        const fixed = Number(depositSettings.fixed_amount || depositSettings.fixedAmount || 0);

        let baseDeposit = 0;
        if (depositSettings.type === 'fixed' && fixed > 0) {
            baseDeposit = fixed;
        } else {
            baseDeposit = Math.round((Number(baseAmount || 0) * percentage) / 100);
        }

        return baseDeposit + Number(extrasAmount || 0);
    };

    // Auto-set duration, default base price, and calculate deposit when modal opens
    useEffect(() => {
        if (isOpen) {
            const base = selectedResourceInfo.price > 0
                ? selectedResourceInfo.price
                : Number(currentBusiness?.base_price || currentBusiness?.price || 0);

            let initialDurationMin = 60;
            if (isRental) initialDurationMin = 240;
            else if (isPadel) initialDurationMin = Number(currentBusiness?.slot_duration || 90);
            else if (isService) initialDurationMin = Number(currentBusiness?.slot_duration || 30);
            else if (isFutbol) initialDurationMin = 60;

            const durationToUse = Number(newBookingData.duration) || initialDurationMin;
            const durationHoursToUse = Number(newBookingData.durationHours) || (durationToUse / 60);

            setNewBookingData(prev => {
                const extrasTotal = (prev.selectedServices || []).reduce((sum, item) => {
                    const price = typeof item === 'object' ? Number(item.price || 0) : 0;
                    const qty = typeof item === 'object' ? Math.max(1, Number(item.quantity || 1)) : 1;
                    return sum + (price * qty);
                }, 0);

                const currentBase = prev.basePrice !== undefined && Number(prev.basePrice) > 0 ? Number(prev.basePrice) : base;
                const newTotal = currentBase + extrasTotal;
                const deposit = isManualDeposit && prev.depositAmount !== undefined && prev.depositAmount !== ''
                    ? prev.depositAmount
                    : calculateAutoDeposit(currentBase, extrasTotal);

                return {
                    ...prev,
                    basePrice: currentBase,
                    price: newTotal,
                    depositAmount: deposit,
                    servicesTotal: extrasTotal,
                    duration: durationToUse,
                    durationHours: durationHoursToUse
                };
            });
        }
    }, [isOpen, selectedResourceInfo.price, currentBusiness, isRental, isPadel, isFutbol, isService]);

    // Helpers to update additionals and recalculate totals
    const updateSelectedServices = (updatedList) => {
        const extrasTotal = updatedList.reduce((sum, item) => sum + (Number(item.price || 0) * (Number(item.quantity) || 1)), 0);
        const base = Number(newBookingData.basePrice || selectedResourceInfo.price || currentBusiness?.base_price || currentBusiness?.price || 0);
        const newTotal = base + extrasTotal;

        setNewBookingData(prev => {
            const newDeposit = isManualDeposit ? prev.depositAmount : calculateAutoDeposit(base, extrasTotal);
            return {
                ...prev,
                selectedServices: updatedList,
                servicesTotal: extrasTotal,
                price: newTotal,
                depositAmount: newDeposit
            };
        });
    };

    const allowsQuantity = (name, itemObj) => {
        if (itemObj?.allow_quantity !== undefined) return Boolean(itemObj.allow_quantity);
        if (itemObj?.allows_quantity !== undefined) return Boolean(itemObj.allows_quantity);
        if (itemObj?.is_quantity !== undefined) return Boolean(itemObj.is_quantity);
        
        const n = (name || '').toLowerCase();
        const quantityKeywords = ['silla', 'mesa', 'hielo', 'leña', 'lena', 'fardo', 'cubierto', 'plato', 'copa', 'vajilla por', 'persona', 'invitado', 'bolsa', 'pack', 'unidad'];
        return quantityKeywords.some(kw => n.includes(kw));
    };

    const handleToggleCatalogExtra = (catalogItem) => {
        const existsIndex = selectedAdditionals.findIndex(item => item.name.toLowerCase() === catalogItem.name.toLowerCase());
        let updated;
        if (existsIndex >= 0) {
            // Clicking again toggles off
            updated = selectedAdditionals.filter((_, idx) => idx !== existsIndex);
        } else {
            // First click adds 1 unit
            updated = [...selectedAdditionals, { 
                name: catalogItem.name, 
                price: Number(catalogItem.price || 0), 
                quantity: 1,
                allowQuantity: allowsQuantity(catalogItem.name, catalogItem)
            }];
        }
        updateSelectedServices(updated);
    };

    const handleQuantityChange = (index, delta) => {
        const currentQty = selectedAdditionals[index]?.quantity || 1;
        const newQty = currentQty + delta;
        if (newQty <= 0) {
            handleRemoveExtra(index);
        } else {
            const updated = selectedAdditionals.map((item, idx) => {
                if (idx === index) {
                    return { ...item, quantity: newQty };
                }
                return item;
            });
            updateSelectedServices(updated);
        }
    };

    const handleRemoveExtra = (index) => {
        const updated = selectedAdditionals.filter((_, idx) => idx !== index);
        updateSelectedServices(updated);
    };

    const formatDateKey = (y, m, d) => {
        return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    };

    const formatNiceDate = (dateStr) => {
        if (!dateStr) return 'Seleccionar fecha...';
        try {
            const [y, m, d] = dateStr.split('-');
            const dateObj = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
            const formatted = dateObj.toLocaleDateString('es-AR', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
                year: 'numeric'
            });
            return formatted.charAt(0).toUpperCase() + formatted.slice(1);
        } catch (e) {
            return dateStr;
        }
    };

    const getDateAvailability = (dateKey) => {
        if (!dateKey) return { status: 'invalid', label: 'Sin fecha', selectable: false };

        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

        // Check bookings
        const targetResourceId = newBookingData.courtId || newBookingData.serviceId;
        const dayBookings = (bookings || []).filter(b => {
            if (b.status === 'cancelled') return false;
            let bDate = b.date;
            if (bDate && bDate.includes('/')) {
                const [d, m, y] = bDate.split('/');
                bDate = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
            }
            if (bDate !== dateKey) return false;

            if (isRental) {
                if (targetResourceId && (b.court_id || b.service_id)) {
                    return String(b.court_id || b.service_id) === String(targetResourceId);
                }
                return true;
            }
            return true;
        });

        if (dayBookings.length > 0) {
            const isBlockedSlot = dayBookings.some(b => 
                b.status === 'blocked' || 
                b.is_blocked || 
                b.isBlocked ||
                String(b.customer_name || '').toUpperCase().includes('BLOQUEADO') ||
                String(b.customerName || '').toUpperCase().includes('BLOQUEADO')
            );
            if (isBlockedSlot) {
                return { status: 'blocked', label: 'Bloqueado', selectable: false };
            }
            return { status: 'occupied', label: 'Reservado', selectable: false, booking: dayBookings[0] };
        }

        // Check business blocked dates (array of strings or objects)
        const blockedDates = [
            ...(currentBusiness?.blocked_dates || []),
            ...(currentBusiness?.metadata?.blocked_dates || [])
        ];
        
        const isBusinessBlocked = blockedDates.some(b => {
            const bDateStr = typeof b === 'string' ? b : (b?.date || '');
            let normalized = bDateStr;
            if (typeof bDateStr === 'string' && bDateStr.includes('/')) {
                const [d, m, y] = bDateStr.split('/');
                normalized = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
            }
            return normalized === dateKey;
        });

        if (isBusinessBlocked) {
            return { status: 'blocked', label: 'Bloqueado', selectable: false };
        }

        const blockedRanges = currentBusiness?.blocked_ranges || currentBusiness?.metadata?.blocked_ranges || [];
        for (const range of blockedRanges) {
            if (range.start && range.end && dateKey >= range.start && dateKey <= range.end) {
                return { status: 'blocked', label: 'Bloqueado', selectable: false };
            }
        }

        if (dateKey < todayStr) {
            return { status: 'past', label: 'Fecha Pasada (Histórica)', selectable: true };
        }

        return { status: 'available', label: 'Disponible', selectable: true };
    };

    const selectedDateAvailability = getDateAvailability(newBookingData.date);

    // Days of Month Generator for Custom Calendar
    const calYear = calendarMonth.getFullYear();
    const calMonth = calendarMonth.getMonth();
    const monthYearLabel = calendarMonth.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
    const capitalizedMonth = monthYearLabel.charAt(0).toUpperCase() + monthYearLabel.slice(1);

    const firstDayIndex = new Date(calYear, calMonth, 1).getDay(); // 0 = Domingo
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(calYear, calMonth, 0).getDate();

    const prevDays = [];
    for (let i = firstDayIndex - 1; i >= 0; i--) {
        prevDays.push({
            day: daysInPrevMonth - i,
            isCurrentMonth: false,
            dateKey: formatDateKey(calMonth === 0 ? calYear - 1 : calYear, calMonth === 0 ? 11 : calMonth - 1, daysInPrevMonth - i)
        });
    }

    const currentDays = [];
    for (let i = 1; i <= daysInMonth; i++) {
        currentDays.push({
            day: i,
            isCurrentMonth: true,
            dateKey: formatDateKey(calYear, calMonth, i)
        });
    }

    const totalGridCells = (prevDays.length + currentDays.length) <= 35 ? 35 : 42;
    const nextDaysCount = totalGridCells - (prevDays.length + currentDays.length);
    const nextDays = [];
    for (let i = 1; i <= nextDaysCount; i++) {
        nextDays.push({
            day: i,
            isCurrentMonth: false,
            dateKey: formatDateKey(calMonth === 11 ? calYear + 1 : calYear, calMonth === 11 ? 0 : calMonth + 1, i)
        });
    }

    const allCalendarDays = [...prevDays, ...currentDays, ...nextDays];

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.65)',
            display: 'flex',
            alignItems: isMobile ? 'flex-end' : 'center',
            justifyContent: 'center',
            zIndex: 1000,
            backdropFilter: 'blur(6px)',
            padding: isMobile ? '0' : '20px'
        }} onClick={onClose}>
            <div style={{
                background: 'var(--bg-card)',
                padding: isMobile ? '20px 16px 36px 16px' : '24px 28px',
                borderRadius: isMobile ? '24px 24px 0 0' : '20px',
                width: '100%',
                maxWidth: isMobile ? '100%' : '650px',
                boxShadow: '0 24px 70px rgba(0,0,0,0.35)',
                border: '1px solid var(--border)',
                maxHeight: isMobile ? '92vh' : '90vh',
                overflowY: 'auto'
            }} onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '20px' }}>
                            {isRental ? '🏡' : isPadel ? '🎾' : isFutbol ? '⚽' : '✨'}
                        </span>
                        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)' }}>
                            {isRental ? 'Nueva Reserva de Espacio / Salón' : isPadel ? 'Nueva Reserva de Pádel' : isFutbol ? 'Nueva Reserva de Cancha de Fútbol' : 'Crear Nueva Reserva'}
                        </h3>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            fontSize: '24px',
                            cursor: 'pointer',
                            color: 'var(--text-secondary)'
                        }}
                    >
                        &times;
                    </button>
                </div>

                <form onSubmit={onSubmit} style={{ display: 'grid', gap: '14px' }}>
                    {/* Row 1: Fecha (Left) | Cancha/Espacio Seleccionado (Right) */}
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px' }}>
                        <div style={{ position: 'relative' }}>
                            <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                                {isRental ? '📅 Fecha del Evento / Alquiler *' : '📅 Fecha del Turno *'}
                            </label>
                            
                            <button
                                type="button"
                                onClick={() => setShowDatePicker(prev => !prev)}
                                style={{
                                    width: '100%',
                                    padding: '10px 12px',
                                    borderRadius: '10px',
                                    border: (newBookingData.date && selectedDateAvailability.status === 'blocked')
                                        ? '1px dashed #9CA3AF'
                                        : (newBookingData.date && selectedDateAvailability.status === 'occupied')
                                            ? '1px solid #EF4444'
                                            : (showDatePicker ? '1px solid var(--primary-paddle)' : '1px solid var(--border)'),
                                    background: 'var(--bg-main)',
                                    color: 'var(--text-primary)',
                                    fontSize: '13px',
                                    fontWeight: '700',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: '6px',
                                    textAlign: 'left'
                                }}
                            >
                                <span style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    <span>📅</span>
                                    <span>{newBookingData.date ? formatNiceDate(newBookingData.date) : 'Seleccionar fecha...'}</span>
                                </span>

                                {newBookingData.date && (
                                    <span style={{
                                        fontSize: '11px',
                                        fontWeight: '800',
                                        padding: '2px 7px',
                                        borderRadius: '6px',
                                        flexShrink: 0,
                                        background: selectedDateAvailability.status === 'available'
                                            ? 'rgba(0, 230, 118, 0.15)'
                                            : selectedDateAvailability.status === 'past'
                                                ? 'rgba(59, 130, 246, 0.15)'
                                                : selectedDateAvailability.status === 'blocked'
                                                    ? 'rgba(156, 163, 175, 0.2)'
                                                    : 'rgba(239, 68, 68, 0.15)',
                                        color: selectedDateAvailability.status === 'available'
                                            ? 'var(--primary-paddle)'
                                            : selectedDateAvailability.status === 'past'
                                                ? '#3B82F6'
                                                : selectedDateAvailability.status === 'blocked'
                                                    ? '#9CA3AF'
                                                    : '#EF4444'
                                    }}>
                                        {selectedDateAvailability.status === 'available' ? '✓ Disponible' : selectedDateAvailability.status === 'past' ? '📜 Histórica' : selectedDateAvailability.label}
                                    </span>
                                )}
                            </button>

                            {/* Custom Dark Calendar Dropdown */}
                            {showDatePicker && (
                                <div style={{
                                    position: 'absolute',
                                    top: 'calc(100% + 6px)',
                                    left: 0,
                                    zIndex: 9999,
                                    width: isMobile ? '100%' : '300px',
                                    background: 'var(--bg-card, #1A1E24)',
                                    border: '1px solid var(--border)',
                                    borderRadius: '16px',
                                    padding: '14px',
                                    boxShadow: '0 16px 40px rgba(0, 0, 0, 0.55)'
                                }}>
                                    {/* Header: Month & Year + Arrows */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                        <button
                                            type="button"
                                            onClick={() => setCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
                                            style={{
                                                background: 'var(--bg-main)',
                                                border: '1px solid var(--border)',
                                                borderRadius: '8px',
                                                color: 'var(--text-primary)',
                                                width: '28px',
                                                height: '28px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                cursor: 'pointer',
                                                fontWeight: '700'
                                            }}
                                        >
                                            ❮
                                        </button>
                                        <div style={{ fontWeight: '800', fontSize: '13px', color: 'var(--text-primary)' }}>
                                            {capitalizedMonth}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
                                            style={{
                                                background: 'var(--bg-main)',
                                                border: '1px solid var(--border)',
                                                borderRadius: '8px',
                                                color: 'var(--text-primary)',
                                                width: '28px',
                                                height: '28px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                cursor: 'pointer',
                                                fontWeight: '700'
                                            }}
                                        >
                                            ❯
                                        </button>
                                    </div>

                                    {/* Day of Week Labels */}
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center', marginBottom: '6px' }}>
                                        {['DO', 'LU', 'MA', 'MI', 'JU', 'VI', 'SA'].map(d => (
                                            <div key={d} style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)' }}>
                                                {d}
                                            </div>
                                        ))}
                                    </div>

                                    {/* Calendar Grid */}
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
                                        {allCalendarDays.map((cell, idx) => {
                                            const isSelected = newBookingData.date === cell.dateKey;
                                            const availability = getDateAvailability(cell.dateKey);
                                            const isSelectable = cell.isCurrentMonth && availability.selectable;

                                            let bg = 'transparent';
                                            let textColor = 'var(--text-muted)';
                                            let border = '1px solid transparent';
                                            let cursor = 'default';

                                            if (!cell.isCurrentMonth) {
                                                textColor = 'rgba(156, 163, 175, 0.25)';
                                            } else if (availability.status === 'occupied') {
                                                bg = isSelected ? 'rgba(239, 68, 68, 0.35)' : 'rgba(239, 68, 68, 0.15)';
                                                textColor = '#EF4444';
                                                border = isSelected ? '2px solid #EF4444' : '1px solid rgba(239, 68, 68, 0.35)';
                                                cursor = 'not-allowed';
                                            } else if (availability.status === 'blocked') {
                                                bg = isSelected ? 'rgba(156, 163, 175, 0.25)' : 'rgba(156, 163, 175, 0.12)';
                                                textColor = '#9CA3AF';
                                                border = isSelected ? '2px dashed #9CA3AF' : '1.5px dashed #9CA3AF';
                                                cursor = 'not-allowed';
                                            } else if (availability.status === 'past') {
                                                if (isSelected) {
                                                    bg = 'var(--primary-paddle, #84CC16)';
                                                    textColor = '#000000';
                                                    border = '1px solid var(--primary-paddle, #84CC16)';
                                                    cursor = 'pointer';
                                                } else {
                                                    bg = 'var(--bg-main)';
                                                    textColor = 'var(--text-secondary)';
                                                    border = '1px solid var(--border)';
                                                    cursor = 'pointer';
                                                }
                                            } else if (isSelected) {
                                                // Only available selected date gets primary green background
                                                bg = 'var(--primary-paddle, #84CC16)';
                                                textColor = '#000000';
                                                border = '1px solid var(--primary-paddle, #84CC16)';
                                                cursor = 'pointer';
                                            } else {
                                                // available
                                                bg = 'var(--bg-main)';
                                                textColor = 'var(--text-primary)';
                                                border = '1px solid var(--border)';
                                                cursor = 'pointer';
                                            }

                                            return (
                                                <button
                                                    key={idx}
                                                    type="button"
                                                    disabled={!isSelectable && !isSelected}
                                                    onClick={() => {
                                                        if (isSelectable) {
                                                            setNewBookingData(prev => ({ ...prev, date: cell.dateKey }));
                                                            setShowDatePicker(false);
                                                        }
                                                    }}
                                                    title={cell.isCurrentMonth ? `${cell.dateKey}: ${availability.label}` : ''}
                                                    style={{
                                                        height: '32px',
                                                        borderRadius: '8px',
                                                        background: bg,
                                                        color: textColor,
                                                        border: border,
                                                        cursor: cursor,
                                                        fontWeight: isSelected ? '900' : '600',
                                                        fontSize: '12px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        transition: 'all 0.15s'
                                                    }}
                                                >
                                                    {cell.day}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {/* Legend */}
                                    <div style={{
                                        marginTop: '10px',
                                        paddingTop: '8px',
                                        borderTop: '1px solid var(--border)',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        fontSize: '10px',
                                        color: 'var(--text-secondary)'
                                    }}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--primary-paddle)' }}></span>
                                            Disponible
                                        </span>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#EF4444' }}></span>
                                            Ocupado
                                        </span>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#9CA3AF' }}></span>
                                            Bloqueado
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* Historical Notice */}
                            {newBookingData.date && selectedDateAvailability.status === 'past' && (
                                <div style={{
                                    marginTop: '6px',
                                    padding: '8px 10px',
                                    borderRadius: '8px',
                                    background: 'rgba(59, 130, 246, 0.12)',
                                    border: '1px solid rgba(59, 130, 246, 0.3)',
                                    color: 'var(--text-primary)',
                                    fontSize: '11px',
                                    fontWeight: '600',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                }}>
                                    <span>📜</span>
                                    <span><strong>Fecha histórica:</strong> Se guardará como finalizada/pagada y sumará a tus reportes y balance.</span>
                                </div>
                            )}

                            {/* Warning if selected date is occupied/blocked */}
                            {newBookingData.date && selectedDateAvailability.status !== 'available' && selectedDateAvailability.status !== 'past' && (
                                <div style={{
                                    marginTop: '6px',
                                    padding: '6px 10px',
                                    borderRadius: '8px',
                                    background: selectedDateAvailability.status === 'blocked' ? 'rgba(156, 163, 175, 0.15)' : 'rgba(239, 68, 68, 0.12)',
                                    border: selectedDateAvailability.status === 'blocked' ? '1px dashed #9CA3AF' : '1px solid rgba(239, 68, 68, 0.3)',
                                    color: selectedDateAvailability.status === 'blocked' ? '#9CA3AF' : '#EF4444',
                                    fontSize: '11px',
                                    fontWeight: '600'
                                }}>
                                    ⚠️ Esta fecha está {selectedDateAvailability.label.toLowerCase()} (no disponible).
                                </div>
                            )}
                        </div>

                        <div>
                            <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                                {isRental ? '🏡 Espacio / Salón Asignado' : isPadel ? '🎾 Cancha de Pádel' : isFutbol ? '⚽ Cancha de Fútbol' : '🎯 Espacio / Cancha'}
                            </label>
                            {((currentBusiness?.courts?.length || 0) + (currentBusiness?.services?.length || 0)) > 1 ? (
                                <CustomDropdown
                                    value={newBookingData.courtId || newBookingData.serviceId || ''}
                                    options={[
                                        ...(currentBusiness?.courts || []).map(c => ({
                                            value: c.id,
                                            label: `${c.name} ${c.price ? `• $${Number(c.price).toLocaleString('es-AR')}` : ''}`
                                        })),
                                        ...(currentBusiness?.services || []).map(s => ({
                                            value: s.id,
                                            label: `${s.name} ${s.price ? `• $${Number(s.price).toLocaleString('es-AR')}` : ''}`
                                        }))
                                    ]}
                                    onChange={(id) => {
                                        const court = (currentBusiness?.courts || []).find(c => String(c.id) === String(id));
                                        const service = (currentBusiness?.services || []).find(s => String(s.id) === String(id));
                                        const res = court || service;
                                        setNewBookingData(prev => ({
                                            ...prev,
                                            courtId: id,
                                            serviceId: id,
                                            resourceName: res?.name || '',
                                            price: Number(res?.price || prev.price || 0),
                                            basePrice: Number(res?.price || prev.basePrice || 0)
                                        }));
                                    }}
                                />
                            ) : (
                                <input
                                    type="text"
                                    value={selectedResourceInfo.displayText}
                                    disabled
                                    style={{
                                        width: '100%',
                                        padding: '10px 12px',
                                        borderRadius: '10px',
                                        border: '1px solid var(--border)',
                                        background: 'var(--bg-main)',
                                        color: 'var(--primary-paddle)',
                                        fontSize: '13px',
                                        fontWeight: '800'
                                    }}
                                />
                            )}
                        </div>
                    </div>

                    {/* Duration Controls based on Business Type */}
                    {isPadel && (
                        <div style={{
                            padding: '10px 12px',
                            background: 'var(--bg-main)',
                            borderRadius: '12px',
                            border: '1px solid var(--border)',
                            display: 'flex',
                            flexDirection: isMobile ? 'column' : 'row',
                            justifyContent: 'space-between',
                            alignItems: isMobile ? 'flex-start' : 'center',
                            gap: '8px'
                        }}>
                            <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)' }}>
                                ⏱️ Duración del Turno de Pádel:
                            </span>
                            <div style={{ display: 'flex', gap: '6px', width: isMobile ? '100%' : 'auto' }}>
                                {[60, 90, 120].map((dur) => {
                                    const isSelected = Number(newBookingData.duration) === dur;
                                    return (
                                        <button
                                            key={dur}
                                            type="button"
                                            onClick={() => setNewBookingData(prev => ({
                                                ...prev,
                                                duration: dur,
                                                durationHours: dur / 60
                                            }))}
                                            style={{
                                                flex: isMobile ? 1 : 'none',
                                                padding: '6px 14px',
                                                borderRadius: '8px',
                                                border: isSelected ? '1px solid var(--primary-paddle)' : '1px solid var(--border)',
                                                background: isSelected ? 'rgba(0, 230, 118, 0.15)' : 'var(--bg-card)',
                                                color: isSelected ? 'var(--primary-paddle)' : 'var(--text-primary)',
                                                fontWeight: isSelected ? '800' : '600',
                                                fontSize: '12px',
                                                cursor: 'pointer',
                                                transition: 'all 0.15s'
                                            }}
                                        >
                                            {dur} min {dur === 90 ? '(Recomendado)' : dur === 60 ? '(1 h)' : '(2 hs)'}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {isService && (
                        <div style={{
                            padding: '10px 12px',
                            background: 'var(--bg-main)',
                            borderRadius: '12px',
                            border: '1px solid var(--border)',
                            display: 'flex',
                            flexDirection: isMobile ? 'column' : 'row',
                            justifyContent: 'space-between',
                            alignItems: isMobile ? 'flex-start' : 'center',
                            gap: '8px'
                        }}>
                            <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)' }}>
                                ⏱️ Duración del Servicio:
                            </span>
                            <div style={{ display: 'flex', gap: '6px', width: isMobile ? '100%' : 'auto' }}>
                                {[30, 45, 60, 90].map((dur) => {
                                    const isSelected = Number(newBookingData.duration) === dur;
                                    return (
                                        <button
                                            key={dur}
                                            type="button"
                                            onClick={() => setNewBookingData(prev => ({
                                                ...prev,
                                                duration: dur,
                                                durationHours: dur / 60
                                            }))}
                                            style={{
                                                flex: isMobile ? 1 : 'none',
                                                padding: '6px 12px',
                                                borderRadius: '8px',
                                                border: isSelected ? '1px solid var(--primary-paddle)' : '1px solid var(--border)',
                                                background: isSelected ? 'rgba(0, 230, 118, 0.15)' : 'var(--bg-card)',
                                                color: isSelected ? 'var(--primary-paddle)' : 'var(--text-primary)',
                                                fontWeight: isSelected ? '800' : '600',
                                                fontSize: '12px',
                                                cursor: 'pointer',
                                                transition: 'all 0.15s'
                                            }}
                                        >
                                            {dur} min
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {isRental && (
                        <div style={{
                            padding: '10px 12px',
                            background: 'var(--bg-main)',
                            borderRadius: '12px',
                            border: '1px solid var(--border)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '6px'
                        }}>
                            <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)' }}>
                                ⏱️ Duración del Alquiler:
                            </span>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                {availableRentalDurations.map((opt) => {
                                    const isSelected = Number(newBookingData.durationHours) === opt.hours;
                                    return (
                                        <button
                                            key={opt.hours}
                                            type="button"
                                            onClick={() => setNewBookingData(prev => ({
                                                ...prev,
                                                duration: opt.hours * 60,
                                                durationHours: opt.hours
                                            }))}
                                            style={{
                                                padding: '6px 12px',
                                                borderRadius: '8px',
                                                border: isSelected ? '1px solid var(--primary-paddle)' : '1px solid var(--border)',
                                                background: isSelected ? 'rgba(0, 230, 118, 0.15)' : 'var(--bg-card)',
                                                color: isSelected ? 'var(--primary-paddle)' : 'var(--text-primary)',
                                                fontWeight: isSelected ? '800' : '600',
                                                fontSize: '12px',
                                                cursor: 'pointer',
                                                transition: 'all 0.15s'
                                            }}
                                        >
                                            {opt.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Row 2: Nombre y Apellido (Left) | Teléfono / WhatsApp (Right) */}
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                                👤 Nombre y Apellido *
                            </label>
                            <input
                                type="text"
                                value={newBookingData.customerName || ''}
                                onChange={(e) => setNewBookingData({ ...newBookingData, customerName: e.target.value })}
                                required
                                placeholder="Nombre y apellido"
                                style={{
                                    width: '100%',
                                    padding: '10px 12px',
                                    borderRadius: '10px',
                                    border: '1px solid var(--border)',
                                    background: 'var(--bg-main)',
                                    color: 'var(--text-primary)',
                                    fontSize: '13px',
                                    outline: 'none'
                                }}
                            />
                        </div>

                        <div>
                            <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                                📱 Teléfono / WhatsApp *
                            </label>
                            <input
                                type="tel"
                                value={newBookingData.customerPhone || ''}
                                onChange={(e) => {
                                    const val = e.target.value.replace(/\D/g, '');
                                    setNewBookingData({ ...newBookingData, customerPhone: val });
                                }}
                                required
                                placeholder="3804123456"
                                style={{
                                    width: '100%',
                                    padding: '10px 12px',
                                    borderRadius: '10px',
                                    border: '1px solid var(--border)',
                                    background: 'var(--bg-main)',
                                    color: 'var(--text-primary)',
                                    fontSize: '13px',
                                    outline: 'none'
                                }}
                            />
                        </div>
                    </div>

                    {/* Row 3: Email (Left) | Personas / Invitados (Right if rental) */}
                    <div style={{ display: 'grid', gridTemplateColumns: isRental ? (isMobile ? '1fr' : '1fr 1fr') : '1fr', gap: '12px' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                                📧 Email del Cliente (Opcional)
                            </label>
                            <input
                                type="email"
                                value={newBookingData.customerEmail || ''}
                                onChange={(e) => setNewBookingData({ ...newBookingData, customerEmail: e.target.value })}
                                placeholder="cliente@email.com"
                                style={{
                                    width: '100%',
                                    padding: '10px 12px',
                                    borderRadius: '10px',
                                    border: '1px solid var(--border)',
                                    background: 'var(--bg-main)',
                                    color: 'var(--text-primary)',
                                    fontSize: '13px',
                                    outline: 'none'
                                }}
                            />
                        </div>

                        {isRental && (
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                    <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                                        👥 Cantidad de Invitados
                                    </label>
                                    <span style={{ fontSize: '11px', color: 'var(--primary-paddle)', fontWeight: '700' }}>
                                        Máx: {maxCapacity} pers.
                                    </span>
                                </div>
                                <input
                                    type="number"
                                    min="1"
                                    max={maxCapacity}
                                    value={newBookingData.guestCount || ''}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        if (val !== '' && Number(val) > maxCapacity) {
                                            setNewBookingData({ ...newBookingData, guestCount: maxCapacity });
                                        } else {
                                            setNewBookingData({ ...newBookingData, guestCount: val });
                                        }
                                    }}
                                    placeholder={`Ej. 30`}
                                    style={{
                                        width: '100%',
                                        padding: '10px 12px',
                                        borderRadius: '10px',
                                        border: '1px solid var(--border)',
                                        background: 'var(--bg-main)',
                                        color: 'var(--text-primary)',
                                        fontSize: '13px',
                                        outline: 'none'
                                    }}
                                />
                            </div>
                        )}
                    </div>

                    {/* Section: Adicionales / Extras */}
                    {catalogAdditionals.length > 0 && (
                        <div style={{
                            padding: '14px',
                            background: 'var(--bg-main)',
                            borderRadius: '14px',
                            border: '1px solid var(--border)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '10px'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <label style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span>✨</span> Adicionales / Extras ({selectedAdditionals.length})
                                </label>
                            </div>

                            {/* Quick-add chips from catalog */}
                            <div>
                                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                                    Catálogo de adicionales (tocá para activar o desactivar):
                                </span>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                    {catalogAdditionals.map((catItem, idx) => {
                                        const selected = selectedAdditionals.find(s => s.name.toLowerCase() === catItem.name.toLowerCase());
                                        const isSelected = !!selected;
                                        const isQty = allowsQuantity(catItem.name, catItem);
                                        return (
                                            <button
                                                key={idx}
                                                type="button"
                                                onClick={() => handleToggleCatalogExtra(catItem)}
                                                style={{
                                                    padding: '5px 10px',
                                                    borderRadius: '8px',
                                                    border: isSelected ? '1px solid var(--primary-paddle)' : '1px solid var(--border)',
                                                    background: isSelected ? 'rgba(0, 230, 118, 0.15)' : 'var(--bg-card)',
                                                    color: isSelected ? 'var(--primary-paddle)' : 'var(--text-primary)',
                                                    fontSize: '12px',
                                                    fontWeight: isSelected ? '700' : '500',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '5px',
                                                    transition: 'all 0.15s'
                                                }}
                                            >
                                                <span>{isSelected ? (isQty && selected.quantity > 1 ? `✓ (${selected.quantity})` : '✓') : '+'}</span>
                                                <span>{catItem.name}</span>
                                                {catItem.price > 0 && <span style={{ opacity: 0.85 }}>(${catItem.price.toLocaleString('es-AR')})</span>}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                        {/* List of currently selected extras with quantity controls */}
                        {selectedAdditionals.length > 0 && (
                            <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '6px',
                                marginTop: '4px',
                                borderTop: '1px solid var(--border)',
                                paddingTop: '8px'
                            }}>
                                {selectedAdditionals.map((item, idx) => {
                                    const isQty = allowsQuantity(item.name, item);
                                    const itemTotal = Number(item.price || 0) * (item.quantity || 1);
                                    return (
                                        <div key={idx} style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            padding: '8px 12px',
                                            borderRadius: '10px',
                                            background: 'var(--bg-card)',
                                            border: '1px solid var(--border)',
                                            fontSize: '12px',
                                            gap: '8px'
                                        }}>
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <span style={{ fontWeight: '700', color: 'var(--text-primary)' }}>
                                                    • {item.name}
                                                </span>
                                                {item.price > 0 && (
                                                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                                        ${item.price.toLocaleString('es-AR')}{isQty ? ' c/u' : ''}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Quantity selector or Unique Badge */}
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                {isQty && (
                                                    <div style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        background: 'var(--bg-main)',
                                                        borderRadius: '8px',
                                                        border: '1px solid var(--border)',
                                                        overflow: 'hidden'
                                                    }}>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleQuantityChange(idx, -1)}
                                                            style={{
                                                                padding: '2px 8px',
                                                                background: 'transparent',
                                                                border: 'none',
                                                                cursor: 'pointer',
                                                                color: 'var(--text-primary)',
                                                                fontWeight: '800',
                                                                fontSize: '14px'
                                                            }}
                                                        >
                                                            -
                                                        </button>
                                                        <span style={{
                                                            padding: '0 6px',
                                                            fontWeight: '800',
                                                            fontSize: '12px',
                                                            color: 'var(--text-primary)',
                                                            minWidth: '20px',
                                                            textAlign: 'center'
                                                        }}>
                                                            {item.quantity || 1}
                                                        </span>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleQuantityChange(idx, 1)}
                                                            style={{
                                                                padding: '2px 8px',
                                                                background: 'transparent',
                                                                border: 'none',
                                                                cursor: 'pointer',
                                                                color: 'var(--text-primary)',
                                                                fontWeight: '800',
                                                                fontSize: '14px'
                                                            }}
                                                        >
                                                            +
                                                        </button>
                                                    </div>
                                                )}

                                                <span style={{ fontWeight: '800', color: 'var(--primary-paddle)', minWidth: '60px', textAlign: 'right' }}>
                                                    ${itemTotal.toLocaleString('es-AR')}
                                                </span>

                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveExtra(idx)}
                                                    style={{
                                                        background: 'transparent',
                                                        border: 'none',
                                                        color: '#EF4444',
                                                        cursor: 'pointer',
                                                        fontSize: '16px',
                                                        padding: '0 4px',
                                                        fontWeight: '700'
                                                    }}
                                                    title="Quitar adicional"
                                                >
                                                    &times;
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                    {/* Observaciones */}
                    <div>
                        <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                            📝 Notas / Observaciones
                        </label>
                        <textarea
                            value={newBookingData.notes || ''}
                            onChange={(e) => setNewBookingData({ ...newBookingData, notes: e.target.value })}
                            placeholder={
                                isRental 
                                    ? "Ej. Dejan seña en mano, ingresan antes para decorar, etc." 
                                    : isPadel 
                                        ? "Ej. Dejan seña en mano, alquilan paletas, etc."
                                        : isFutbol
                                            ? "Ej. Dejan seña en mano, necesitan pecheras, etc."
                                            : "Ej. Dejan seña en mano, pedidos especiales, etc."
                            }
                            rows="2"
                            style={{
                                width: '100%',
                                padding: '10px 12px',
                                borderRadius: '10px',
                                border: '1px solid var(--border)',
                                background: 'var(--bg-main)',
                                color: 'var(--text-primary)',
                                fontSize: '13px',
                                resize: 'none',
                                outline: 'none'
                            }}
                        />
                    </div>

                    {/* Precios: Total & Seña */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                                💵 Precio Total ($)
                            </label>
                            <input
                                type="number"
                                value={newBookingData.price || ''}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    const numVal = parseFloat(val) || 0;
                                    setNewBookingData(prev => {
                                        const extras = Number(prev.servicesTotal || 0);
                                        const base = Math.max(0, numVal - extras);
                                        return {
                                            ...prev,
                                            price: val,
                                            basePrice: base,
                                            depositAmount: isManualDeposit ? prev.depositAmount : calculateAutoDeposit(base, extras)
                                        };
                                    });
                                }}
                                style={{
                                    width: '100%',
                                    padding: '10px 12px',
                                    borderRadius: '10px',
                                    border: '1px solid var(--border)',
                                    background: 'var(--bg-main)',
                                    color: 'var(--text-primary)',
                                    fontSize: '14px',
                                    fontWeight: '800',
                                    outline: 'none'
                                }}
                            />
                        </div>

                        <div>
                            <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                                🔒 Seña Requerida ($)
                            </label>
                            <input
                                type="number"
                                value={newBookingData.depositAmount !== undefined ? newBookingData.depositAmount : ''}
                                onChange={(e) => {
                                    setIsManualDeposit(true);
                                    setNewBookingData({ ...newBookingData, depositAmount: e.target.value });
                                }}
                                placeholder="Ej. 10000"
                                style={{
                                    width: '100%',
                                    padding: '10px 12px',
                                    borderRadius: '10px',
                                    border: '1px solid var(--border)',
                                    background: 'var(--bg-main)',
                                    color: 'var(--text-primary)',
                                    fontSize: '14px',
                                    fontWeight: '800',
                                    outline: 'none'
                                }}
                            />
                        </div>
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={!newBookingData.date || selectedDateAvailability.status !== 'available'}
                        style={{
                            width: '100%',
                            padding: '12px',
                            background: (!newBookingData.date || selectedDateAvailability.status !== 'available')
                                ? 'var(--border)'
                                : 'var(--primary-paddle)',
                            color: (!newBookingData.date || selectedDateAvailability.status !== 'available')
                                ? 'var(--text-muted)'
                                : '#000000',
                            border: 'none',
                            borderRadius: '10px',
                            fontWeight: '800',
                            fontSize: '14px',
                            cursor: (!newBookingData.date || selectedDateAvailability.status !== 'available')
                                ? 'not-allowed'
                                : 'pointer',
                            marginTop: '6px',
                            transition: 'all 0.2s',
                            boxShadow: (!newBookingData.date || selectedDateAvailability.status !== 'available')
                                ? 'none'
                                : '0 4px 14px rgba(0, 230, 118, 0.25)'
                        }}
                    >
                        {!newBookingData.date 
                            ? 'Selecciona una Fecha Disponible'
                            : selectedDateAvailability.status !== 'available'
                                ? `Fecha No Disponible (${selectedDateAvailability.label})`
                                : 'Crear Reserva'
                        }
                    </button>
                </form>
            </div>
        </div>
    );
};

export default NewBookingModal;
