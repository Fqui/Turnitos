import React, { useState, useEffect, useMemo } from 'react';
import { useNotification } from '../../contexts/NotificationContext';
import CustomDropdown from '../common/CustomDropdown';

const BookingDetailsModalContent = ({
    onClose,
    isMobile,
    booking,
    businesses,
    selectedBusinessId,
    onAction,
    formatDisplayDate,
    getStatusLabel
}) => {
    const { showToast } = useNotification();

    const biz = businesses?.find(b => String(b.id) === String(selectedBusinessId || booking.business_id || booking.businessId));
    const isRental = biz?.type === 'venue' ||
        biz?.type === 'alquiler' ||
        biz?.rubro === 'alquiler' ||
        biz?.rubro === 'venue' ||
        (biz?.category || '').toLowerCase().includes('quincho') ||
        (biz?.category || '').toLowerCase().includes('alquiler') ||
        (biz?.categories?.name || '').toLowerCase().includes('alquiler') ||
        (biz?.categories?.name || '').toLowerCase().includes('quincho') ||
        (biz?.name || '').toLowerCase().includes('quincho') ||
        (booking.business_type === 'venue') ||
        (booking.metadata?.business_type === 'venue') ||
        Boolean(booking.guest_count || booking.guestCount || booking.metadata?.guestCount || booking.metadata?.durationHours);

    const courtId = booking.court_id || booking.courtId || booking.service_id || booking.serviceId;
    const court = (biz?.courts || []).find(c => String(c.id) === String(courtId));
    const service = (biz?.services || []).find(s => String(s.id) === String(booking.service_id || booking.serviceId));
    const resourceName = court?.name || service?.name || booking.resource_name || booking.court_name || booking.service_name || booking.metadata?.resource_name || (isRental ? 'Espacio Completo' : 'Cancha Asignada');

    const isPadel = !isRental && (
        (biz?.sport_type || '').toLowerCase().includes('padel') ||
        (biz?.category || '').toLowerCase().includes('padel') ||
        (biz?.categories?.name || '').toLowerCase().includes('padel') ||
        (biz?.name || '').toLowerCase().includes('padel') ||
        (resourceName || '').toLowerCase().includes('padel')
    );

    const isFutbol = !isRental && !isPadel && (
        (biz?.sport_type || '').toLowerCase().includes('futbol') ||
        (biz?.category || '').toLowerCase().includes('futbol') ||
        (biz?.categories?.name || '').toLowerCase().includes('futbol') ||
        (biz?.name || '').toLowerCase().includes('futbol') ||
        (biz?.type === 'sport')
    );

    // Durations
    const rawDurations = biz?.rental_duration_options || biz?.rentalDurationOptions || [];
    const durationOptions = Array.isArray(rawDurations) && rawDurations.length > 0
        ? rawDurations
        : [4, 6, 8, 12, 24];
    const hasMultipleDurations = isRental;

    // Capacity limit
    const maxCapacity = Number(biz?.capacity_limit || biz?.capacity || 100);

    // Business Catalog Additionals (ONLY additional services / extras, exclude amenities)
    const catalogAdditionals = useMemo(() => {
        const canteenItems = (biz?.metadata?.sport_canteen_products || []).map(p => ({
            id: p.id,
            name: p.name,
            price: Number(p.sale_price || p.price || 0),
            icon: p.category === 'Bebidas' ? '🥤' : p.category === 'Equipamiento' ? '🎾' : p.category === 'Alquileres' ? '🏸' : '🍻'
        }));

        const list = [
            ...(biz?.additional_services || []),
            ...(biz?.additionalServices || []),
            ...(biz?.extras || []),
            ...canteenItems
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
                        price: Number(item.price || item.sale_price || 0),
                        icon: item.icon || '✨'
                    });
                }
            } else if (typeof item === 'string' && item.trim()) {
                if (!seen.has(item.toLowerCase().trim())) {
                    seen.add(item.toLowerCase().trim());
                    unique.push({
                        id: Math.random().toString(),
                        name: item.trim(),
                        price: 0,
                        icon: '✨'
                    });
                }
            }
        });

        return unique;
    }, [biz]);

    // Parse initial services from booking with full quantity and icon support
    const parseBookingServices = (b) => {
        const raw = b?.selected_services || 
                    b?.selectedServices || 
                    b?.additional_services || 
                    b?.additionalServices || 
                    b?.extras || 
                    b?.metadata?.selectedServices || 
                    b?.metadata?.selected_services || 
                    b?.metadata?.additionalServices || 
                    b?.metadata?.additional_services || 
                    b?.metadata?.extras || 
                    [];
        if (!Array.isArray(raw)) {
            if (typeof raw === 'string' && raw.trim()) {
                const found = catalogAdditionals.find(cat => cat.name.toLowerCase() === raw.trim().toLowerCase());
                return [{
                    id: found?.id || Math.random().toString(),
                    name: raw.trim(),
                    price: found ? found.price : 0,
                    quantity: 1,
                    icon: found?.icon || '✨'
                }];
            }
            return [];
        }
        return raw.map(s => {
            if (typeof s === 'object' && s !== null) {
                const name = s.name || s.label || s.title || 'Adicional';
                const found = catalogAdditionals.find(cat => cat.name.toLowerCase() === name.toLowerCase());
                return {
                    id: s.id || found?.id || Math.random().toString(),
                    name: name,
                    price: Number(s.price !== undefined ? s.price : (found?.price || 0)),
                    quantity: Math.max(1, parseInt(s.quantity, 10) || 1),
                    icon: s.icon || found?.icon || '✨'
                };
            }
            const nameStr = String(s);
            const found = catalogAdditionals.find(cat => cat.name.toLowerCase() === nameStr.toLowerCase());
            return {
                id: found?.id || Math.random().toString(),
                name: nameStr,
                price: found ? found.price : 0,
                quantity: 1,
                icon: found?.icon || '✨'
            };
        });
    };

    const notes = booking.notes || booking.metadata?.notes || booking.comment || null;
    const email = booking.customer_email || booking.customerEmail || booking.email || null;
    const phone = booking.customer_phone || booking.customerPhone || '';
    const cleanPhone = phone.replace(/\D/g, '');

    // Coupons and discounts detection
    const couponCode = booking.coupon_code || booking.metadata?.coupon_code || booking.metadata?.coupon?.code || null;
    const discountAmount = Number(booking.discount_amount || booking.metadata?.discount_amount || 0);
    const giftBenefit = booking.gift_benefit || booking.metadata?.gift_benefit || null;
    const durationDiscountPct = Number(booking.metadata?.durationDiscountPct || booking.metadata?.duration_discount_pct || 0);
    const durationDiscountAmount = Number(booking.metadata?.durationDiscountAmount || booking.metadata?.duration_discount_amount || 0);

    // Event type and schedule detection
    const initialEventType = booking.metadata?.event_type ||
        booking.metadata?.eventType ||
        booking.event_type ||
        '';
    const [editableEventType, setEditableEventType] = useState(initialEventType);

    const initialTime = (booking.time && booking.time !== '00:00' && booking.time !== '00:00:00') ? booking.time : '';
    const [editableTime, setEditableTime] = useState(initialTime);

    // State for editing mode and values
    const [isEditing, setIsEditing] = useState(false);
    const [editablePrice, setEditablePrice] = useState(0);
    const [editableDeposit, setEditableDeposit] = useState(0);
    const [editableGuests, setEditableGuests] = useState('');
    const [editableNotes, setEditableNotes] = useState('');
    const [editableServices, setEditableServices] = useState([]);
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

    // Initial duration detection
    const initialDurationHours = Number(booking.durationHours) ||
        Number(booking.metadata?.durationHours) ||
        Number(booking.metadata?.duration) ||
        (booking.duration ? Math.round(Number(booking.duration) / 60) : null) ||
        (durationOptions.length > 0 ? durationOptions[0] : 8);
    const [editableDuration, setEditableDuration] = useState(initialDurationHours);

    // WhatsApp Menu and Custom Message Modal State
    const [showWhatsappMenu, setShowWhatsappMenu] = useState(false);
    const [previewMessage, setPreviewMessage] = useState(null);

    // Custom extra add form state
    const [showAddCustomExtra, setShowAddCustomExtra] = useState(false);
    const [customExtraName, setCustomExtraName] = useState('');
    const [customExtraPrice, setCustomExtraPrice] = useState('');

    const handleAddCustomExtra = () => {
        if (!customExtraName.trim()) return;
        const priceNum = Math.max(0, Number(customExtraPrice) || 0);
        const newItem = {
            id: Math.random().toString(),
            name: customExtraName.trim(),
            price: priceNum,
            quantity: 1,
            icon: '✨'
        };
        setEditableServices(prev => [...prev, newItem]);
        setEditablePrice(prev => Number(prev) + priceNum);
        setCustomExtraName('');
        setCustomExtraPrice('');
        setShowAddCustomExtra(false);
    };

    // Calculate default deposit if missing: (base price * percentage) + 100% of extras
    const defaultTotalPrice = Number(booking.price || booking.total_price || booking.totalPrice || 0);
    const initialServices = parseBookingServices(booking);
    const initialExtrasSum = initialServices.reduce((sum, item) => sum + (Number(item.price || 0) * (Number(item.quantity) || 1)), 0);
    const initialBasePrice = Number(booking.base_price || booking.basePrice || Math.max(0, defaultTotalPrice + discountAmount + durationDiscountAmount - initialExtrasSum));

    const paymentSettings = biz?.payment_settings || biz?.paymentSettings || {};
    const depositSettings = paymentSettings.deposit || { enabled: false, type: 'percentage', percentage: 30, fixed_amount: 0 };

    let calculatedDefaultDeposit = Number(booking.deposit_amount || booking.depositAmount || booking.metadata?.deposit_amount || booking.metadata?.depositAmount || 0);
    if (!calculatedDefaultDeposit) {
        if (depositSettings.enabled !== false) {
            if (depositSettings.type === 'fixed') {
                calculatedDefaultDeposit = Number(depositSettings.fixed_amount || depositSettings.fixedAmount || 0) + initialExtrasSum;
            } else {
                const pct = depositSettings.percentage !== undefined && depositSettings.percentage !== '' && !isNaN(Number(depositSettings.percentage))
                    ? Number(depositSettings.percentage)
                    : 30;
                calculatedDefaultDeposit = Math.round((initialBasePrice * pct) / 100) + initialExtrasSum;
            }
        } else {
            calculatedDefaultDeposit = Math.round(initialBasePrice * 0.3) + initialExtrasSum;
        }
    }

    const currentGuests = booking.guest_count || booking.guestCount || booking.metadata?.guestCount || booking.guests || '';

    // Initialize or sync state when booking changes
    useEffect(() => {
        setEditablePrice(defaultTotalPrice);
        setEditableDeposit(calculatedDefaultDeposit);
        setEditableGuests(currentGuests ? String(currentGuests) : '');
        setEditableDuration(initialDurationHours);
        setEditableNotes(notes || '');
        setEditableServices(parseBookingServices(booking));
        setEditableEventType(initialEventType);
        setEditableTime(initialTime);
        setIsEditing(false);
        setIsSaving(false);
        setSaveSuccess(false);
        setShowWhatsappMenu(false);
        setPreviewMessage(null);
    }, [booking?.id, defaultTotalPrice, calculatedDefaultDeposit, currentGuests, initialDurationHours, notes, initialEventType, initialTime]);

    const activePrice = Number(editablePrice) || 0;
    const activeDeposit = Number(editableDeposit) || 0;
    const pendingBalance = activePrice - activeDeposit > 0 ? activePrice - activeDeposit : 0;
    const extrasSum = editableServices.reduce((sum, item) => sum + (Number(item.price || 0) * (Number(item.quantity) || 1)), 0);
    const baseRentalPrice = Math.max(0, activePrice + discountAmount + durationDiscountAmount - extrasSum);

    // Helpers for Rental Event Details Tile Grid
    const getDateDetails = (dateStr) => {
        if (!dateStr) return { dayName: '', isWeekend: false };
        try {
            const cleanStr = String(dateStr).split('T')[0];
            const parts = cleanStr.split('-');
            if (parts.length === 3) {
                const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
                const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
                const dayName = days[d.getDay()] || '';
                const isWeekend = d.getDay() === 0 || d.getDay() === 5 || d.getDay() === 6;
                return { dayName, isWeekend };
            }
        } catch {
            // fallback
        }
        return { dayName: '', isWeekend: false };
    };

    const getScheduleRange = (timeStr, durationHours) => {
        const dur = Number(durationHours) || 8;
        if (!timeStr || timeStr === '00:00' || timeStr === '00:00:00') {
            return {
                formatted: `Jornada (${dur} hs)`,
                subtext: `${dur} horas contratadas`,
                badge: `${dur} hs`
            };
        }
        const parts = String(timeStr).split(':');
        const h = parseInt(parts[0], 10);
        const m = parseInt(parts[1] || '0', 10);
        if (isNaN(h)) {
            return {
                formatted: `${timeStr} hs`,
                subtext: `${dur} hs contratadas`,
                badge: `${dur} hs`
            };
        }
        const totalMinutes = h * 60 + m + (dur * 60);
        const endTotalHours = Math.floor(totalMinutes / 60);
        const endH = endTotalHours % 24;
        const endM = totalMinutes % 60;
        const endHStr = String(endH).padStart(2, '0');
        const endMStr = String(endM).padStart(2, '0');
        const isNextDay = endTotalHours >= 24;
        const endFormatted = `${endHStr}:${endMStr} hs${isNextDay ? ' (+1 día)' : ''}`;
        const startFormatted = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')} hs`;

        return {
            formatted: `${startFormatted} a ${endFormatted}`,
            subtext: `Salida / Check-out: ${endFormatted}`,
            badge: `${dur} hs`
        };
    };

    const dateInfo = getDateDetails(booking.date);
    const scheduleInfo = getScheduleRange(editableTime, editableDuration);
    const isFullCapacity = Number(editableGuests) >= Number(maxCapacity);

    // WhatsApp Message Builder
    const generateWhatsappMessage = (templateType) => {
        if (templateType === 'direct') return '';
        const customTemplates = biz?.whatsapp_templates || biz?.metadata?.whatsapp_templates || {};
        const defaultTemplates = {
            pedir_sena: "¡Hola {cliente}! 👋 Te escribimos de *{negocio}* para coordinar tu reserva del *{fecha}* ({invitados}). Para asegurar y reservar la fecha, solicitamos una seña de *${seña}* (Total: ${total}). Quedamos a disposición para pasarte los datos de pago.",
            confirmar_reserva: "¡Hola {cliente}! 🎉 Tu reserva en *{negocio}* para el día *{fecha}* ha sido confirmada con éxito. Recuerda que el saldo pendiente a abonar al ingresar es de *${saldo}*. ¡Te esperamos!",
            recordatorio_saldo: "¡Hola {cliente}! 😊 Te recordamos tu reserva en *{negocio}* para el *{fecha}*. El saldo a abonar al ingresar es de *${saldo}*. Si necesitas consultar algún adicional o detalle, no dudes en escribirnos.",
            ubicacion: "¡Hola {cliente}! 📍 Te enviamos la información de *{negocio}* para tu reserva del *{fecha}*:\nDirección: {direccion}\n¡Cualquier consulta estamos a disposición!"
        };

        const rawTemplate = customTemplates[templateType] || defaultTemplates[templateType] || "";
        const clientName = booking.customer_name || booking.customerName || 'Estimado/a';
        const businessName = biz?.name || 'nuestro espacio';
        const dateFormatted = formatDisplayDate(booking.date);
        const guestsStr = editableGuests ? `${editableGuests} personas` : (isRental ? 'Alquiler del Espacio' : '');
        const totalStr = activePrice.toLocaleString('es-AR');
        const depositStr = activeDeposit.toLocaleString('es-AR');
        const balanceStr = pendingBalance.toLocaleString('es-AR');
        const addressStr = biz?.address || biz?.location || 'Consultar ubicación';
        const extrasStr = editableServices.length > 0 ? editableServices.map(s => s.name).join(', ') : 'Sin adicionales';
        const durationStr = editableDuration ? `${editableDuration} horas` : 'Jornada';
        const eventStr = editableEventType || 'Evento';
        const timeStr = editableTime ? `a las ${editableTime} hs` : '';

        return rawTemplate
            .replace(/{cliente}/gi, clientName)
            .replace(/{nombre}/gi, clientName)
            .replace(/{negocio}/gi, businessName)
            .replace(/{fecha}/gi, dateFormatted)
            .replace(/{invitados}/gi, guestsStr)
            .replace(/{total}/gi, totalStr)
            .replace(/{seña}/gi, depositStr)
            .replace(/{sena}/gi, depositStr)
            .replace(/{saldo}/gi, balanceStr)
            .replace(/{direccion}/gi, addressStr)
            .replace(/{adicionales}/gi, extrasStr)
            .replace(/{duracion}/gi, durationStr)
            .replace(/{evento}/gi, eventStr)
            .replace(/{horario}/gi, timeStr);
    };

    const handleSendWhatsapp = (templateType) => {
        if (!cleanPhone) {
            showToast('El cliente no tiene un teléfono válido registrado', 'warning');
            return;
        }
        if (templateType === 'direct') {
            window.open(`https://wa.me/${cleanPhone}`, '_blank');
            setShowWhatsappMenu(false);
            return;
        }
        const text = generateWhatsappMessage(templateType);
        window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`, '_blank');
        setShowWhatsappMenu(false);
    };

    const handleOpenPreview = (templateType, title) => {
        const text = generateWhatsappMessage(templateType);
        setPreviewMessage({ title, text, templateType });
        setShowWhatsappMenu(false);
    };

    // Additional services handlers
    const handleToggleCatalogExtra = (catalogItem) => {
        const existsIndex = editableServices.findIndex(item => item.name.toLowerCase() === catalogItem.name.toLowerCase());
        let updated;
        const itemPrice = Number(catalogItem.price || 0);

        if (existsIndex >= 0) {
            updated = editableServices.map((item, idx) => {
                if (idx === existsIndex) {
                    return { ...item, quantity: (item.quantity || 1) + 1 };
                }
                return item;
            });
            setEditableServices(updated);
            setEditablePrice(activePrice + itemPrice);
        } else {
            updated = [...editableServices, {
                id: catalogItem.id || Math.random().toString(),
                name: catalogItem.name,
                price: itemPrice,
                quantity: 1,
                icon: catalogItem.icon || '✨'
            }];
            setEditableServices(updated);
            setEditablePrice(activePrice + itemPrice);
        }
    };

    const handleQuantityChange = (index, delta) => {
        const currentQty = Number(editableServices[index]?.quantity || 1);
        const newQty = currentQty + delta;
        const itemPrice = Number(editableServices[index]?.price || 0);

        if (newQty <= 0) {
            handleRemoveExtra(index);
        } else {
            const updated = editableServices.map((item, idx) => {
                if (idx === index) {
                    return { ...item, quantity: newQty };
                }
                return item;
            });
            setEditableServices(updated);
            setEditablePrice(Math.max(0, activePrice + (delta * itemPrice)));
        }
    };

    const handleRemoveExtra = (index) => {
        const removedPrice = Number(editableServices[index]?.price || 0);
        const removedQty = Number(editableServices[index]?.quantity || 1);
        const totalDeduct = removedPrice * removedQty;

        const updated = editableServices.filter((_, idx) => idx !== index);
        setEditableServices(updated);
        setEditablePrice(Math.max(0, activePrice - totalDeduct));
    };

    const handleEditExtraPrice = (index, newPrice) => {
        const priceNum = parseFloat(newPrice) || 0;
        const oldPrice = Number(editableServices[index]?.price || 0);
        const qty = Number(editableServices[index]?.quantity || 1);
        const diff = (priceNum - oldPrice) * qty;

        const updated = editableServices.map((item, idx) => {
            if (idx === index) {
                return { ...item, price: priceNum };
            }
            return item;
        });

        setEditableServices(updated);
        setEditablePrice(Math.max(0, activePrice + diff));
    };

    // Save changes to database
    const handleSaveChanges = async () => {
        if (isRental && editableGuests) {
            const numGuests = parseInt(editableGuests, 10);
            if (isNaN(numGuests) || numGuests < 1) {
                showToast('La cantidad de personas debe ser mayor a 0', 'warning');
                return;
            }
            if (numGuests > maxCapacity) {
                showToast(`La cantidad de personas (${numGuests}) supera el límite permitido (${maxCapacity})`, 'warning');
                return;
            }
        }

        try {
            setIsSaving(true);
            const calculatedExtrasSum = editableServices.reduce((sum, item) => sum + (Number(item.price || 0) * (Number(item.quantity) || 1)), 0);

            const updatePayload = {
                price: activePrice,
                total_price: activePrice,
                deposit_amount: activeDeposit,
                guest_count: isRental && editableGuests ? parseInt(editableGuests, 10) : null,
                duration: isRental && editableDuration ? Number(editableDuration) * 60 : (booking.duration || 60),
                time: editableTime || booking.time || '00:00',
                selected_services: editableServices,
                services_total: calculatedExtrasSum,
                notes: editableNotes,
                metadata: {
                    ...(booking.metadata || {}),
                    notes: editableNotes,
                    deposit_amount: activeDeposit,
                    depositAmount: activeDeposit,
                    guestCount: isRental && editableGuests ? parseInt(editableGuests, 10) : null,
                    guest_count: isRental && editableGuests ? parseInt(editableGuests, 10) : null,
                    duration: isRental && editableDuration ? Number(editableDuration) : (booking.metadata?.duration || null),
                    durationHours: isRental && editableDuration ? Number(editableDuration) : (booking.metadata?.durationHours || null),
                    event_type: editableEventType || null,
                    eventType: editableEventType || null,
                    time: editableTime || booking.time || '00:00',
                    selectedServices: editableServices
                }
            };

            await onAction('update_booking', updatePayload);

            setIsSaving(false);
            setIsEditing(false);
            setSaveSuccess(true);
            showToast('✓ Cambios guardados correctamente', 'success');
            setTimeout(() => setSaveSuccess(false), 3000);
        } catch (err) {
            console.error('Error saving booking changes:', err);
            setIsSaving(false);
            showToast('Error al guardar los cambios en la reserva', 'error');
        }
    };

    const handleCancelEdit = () => {
        setEditablePrice(defaultTotalPrice);
        setEditableDeposit(calculatedDefaultDeposit);
        setEditableGuests(currentGuests ? String(currentGuests) : '');
        setEditableDuration(initialDurationHours);
        setEditableNotes(notes || '');
        setEditableServices(parseBookingServices(booking));
        setEditableEventType(initialEventType);
        setEditableTime(initialTime);
        setShowAddCustomExtra(false);
        setCustomExtraName('');
        setCustomExtraPrice('');
        setIsEditing(false);
    };

    if (booking.status === 'blocked' || booking.is_blocked) {
        return (
            <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0,0,0,0.6)',
                display: 'flex',
                alignItems: isMobile ? 'flex-end' : 'center',
                justifyContent: 'center',
                zIndex: 1000,
                backdropFilter: 'blur(6px)',
                padding: isMobile ? '0' : '16px'
            }} onClick={onClose}>
                <div style={{
                    background: 'var(--bg-card)',
                    padding: isMobile ? '24px 20px 32px' : '28px 32px',
                    borderRadius: isMobile ? '24px 24px 0 0' : '20px',
                    width: '100%',
                    maxWidth: isMobile ? '100%' : '420px',
                    boxShadow: '0 24px 70px rgba(0,0,0,0.35)',
                    border: '1px solid var(--border)',
                    textAlign: 'center',
                    fontFamily: 'var(--font-sans, "Plus Jakarta Sans", system-ui, sans-serif)'
                }} onClick={e => e.stopPropagation()}>
                    <div style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: '16px',
                        background: 'rgba(75, 85, 99, 0.25)',
                        border: '1px solid rgba(107, 114, 128, 0.4)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '28px',
                        margin: '0 auto 16px'
                    }}>
                        🔒
                    </div>

                    <h3 style={{
                        margin: '0 0 6px 0',
                        fontSize: '19px',
                        fontWeight: '800',
                        color: 'var(--text-primary)'
                    }}>
                        Fecha Bloqueada
                    </h3>

                    <div style={{
                        fontSize: '14px',
                        color: 'var(--text-secondary)',
                        margin: '0 0 16px 0',
                        lineHeight: '1.4'
                    }}>
                        <div style={{ fontWeight: '700', color: 'var(--text-primary)' }}>
                            📅 {formatDisplayDate(booking.date)}
                        </div>
                        {booking.customer_name && booking.customer_name !== 'BLOQUEADO' && (
                            <div style={{ fontSize: '13px', marginTop: '4px', opacity: 0.85 }}>
                                Motivo: {booking.customer_name}
                            </div>
                        )}
                    </div>

                    <p style={{
                        fontSize: '13px',
                        color: 'var(--text-muted, #9CA3AF)',
                        margin: '0 0 24px 0'
                    }}>
                        ¿Deseas desbloquear esta fecha para que vuelva a estar disponible para reservas?
                    </p>

                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '10px'
                    }}>
                        <button
                            type="button"
                            onClick={onClose}
                            style={{
                                padding: '12px 16px',
                                borderRadius: '12px',
                                border: '1px solid var(--border)',
                                background: 'var(--bg-main)',
                                color: 'var(--text-primary)',
                                fontSize: '14px',
                                fontWeight: '700',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                        >
                            Cancelar
                        </button>

                        <button
                            type="button"
                            onClick={() => onAction('unblock')}
                            style={{
                                padding: '12px 16px',
                                borderRadius: '12px',
                                border: 'none',
                                background: '#059669',
                                color: 'white',
                                fontSize: '14px',
                                fontWeight: '700',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                boxShadow: '0 4px 12px rgba(5, 150, 105, 0.3)'
                            }}
                        >
                            🔓 Desbloquear
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: isMobile ? 'flex-end' : 'center',
            justifyContent: 'center',
            zIndex: 1000,
            backdropFilter: 'blur(6px)',
            padding: isMobile ? '0' : '16px'
        }} onClick={onClose}>
            <div style={{
                background: 'var(--bg-card)',
                padding: isMobile ? '16px 16px 24px 16px' : '22px 28px',
                borderRadius: isMobile ? '24px 24px 0 0' : '20px',
                width: '100%',
                maxWidth: isMobile ? '100%' : '680px',
                boxShadow: '0 24px 70px rgba(0,0,0,0.35)',
                border: '1px solid var(--border)',
                maxHeight: isMobile ? '92vh' : '90vh',
                overflowY: 'auto'
            }} onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '24px' }}>{isRental ? '🏡' : '📋'}</span>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)' }}>
                                {isRental ? 'Detalle de Reserva' : 'Detalle del Turno'}
                            </h3>
                            {isRental && (
                                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600' }}>
                                    {resourceName || biz?.name || 'Alquiler de Espacio'}
                                </div>
                            )}
                        </div>
                        {saveSuccess && (
                            <span style={{
                                fontSize: '11px',
                                color: '#00E676',
                                background: 'rgba(0, 230, 118, 0.12)',
                                padding: '2px 8px',
                                borderRadius: '6px',
                                fontWeight: '700'
                            }}>
                                ✓ Guardado
                            </span>
                        )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {!isEditing ? (
                            <button
                                onClick={() => setIsEditing(true)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    padding: '6px 12px',
                                    borderRadius: '8px',
                                    border: '1px solid var(--border)',
                                    background: 'var(--bg-main)',
                                    color: 'var(--text-primary)',
                                    fontSize: '12px',
                                    fontWeight: '700',
                                    cursor: 'pointer'
                                }}
                                title="Editar datos y adicionales de la reserva"
                            >
                                <span>✏️</span> Editar Reserva
                            </button>
                        ) : (
                            <div style={{ display: 'flex', gap: '6px' }}>
                                <button
                                    onClick={handleCancelEdit}
                                    style={{
                                        padding: '6px 12px',
                                        borderRadius: '8px',
                                        border: '1px solid var(--border)',
                                        background: 'var(--bg-main)',
                                        color: 'var(--text-secondary)',
                                        fontSize: '12px',
                                        fontWeight: '600',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleSaveChanges}
                                    disabled={isSaving}
                                    style={{
                                        padding: '6px 14px',
                                        borderRadius: '8px',
                                        border: 'none',
                                        background: 'var(--primary-paddle)',
                                        color: 'white',
                                        fontSize: '12px',
                                        fontWeight: '700',
                                        cursor: 'pointer',
                                        boxShadow: '0 2px 8px rgba(0, 230, 118, 0.3)'
                                    }}
                                >
                                    {isSaving ? 'Guardando...' : '💾 Guardar'}
                                </button>
                            </div>
                        )}
                        <button onClick={onClose} style={{ background: 'transparent', border: 'none', fontSize: '22px', cursor: 'pointer', color: 'var(--text-secondary)', marginLeft: '4px' }}>&times;</button>
                    </div>
                </div>

                <div style={{ display: 'grid', gap: '10px' }}>
                    {/* Booking Source Banner */}
                    {(() => {
                        const isMarketplace = booking.metadata?.booking_source === 'marketplace' || 
                                              booking.booking_source === 'marketplace' || 
                                              booking.bookingSource === 'marketplace' || 
                                              booking.metadata?.source === 'marketplace';
                        return (
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '8px 12px',
                                background: isMarketplace ? 'rgba(0, 230, 118, 0.08)' : 'var(--bg-main)',
                                border: isMarketplace ? '1px solid rgba(0, 230, 118, 0.3)' : '1px solid var(--border)',
                                borderRadius: '10px',
                                fontSize: '12px'
                            }}>
                                <span style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>Canal de Origen:</span>
                                {isMarketplace ? (
                                    <span style={{ fontWeight: '800', color: 'var(--primary-paddle)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                        <span>🌐</span> TurnitosLR (Marketplace)
                                    </span>
                                ) : (
                                    <span style={{ fontWeight: '700', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                        <span>🔗</span> Link Directo / Bio
                                    </span>
                                )}
                            </div>
                        );
                    })()}

                    {/* BRANCH: RENTAL SPECIALIZED VIEW VS SPORTS COURT VIEW */}
                    {isRental ? (
                        <>
                            {/* EVENT DETAILS TILES GRID (4 Metric Cards) */}
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)',
                                gap: '8px'
                            }}>
                                {/* Tile 1: Fecha */}
                                <div style={{
                                    background: 'var(--bg-main)',
                                    borderRadius: '12px',
                                    border: '1px solid var(--border)',
                                    padding: '11px 13px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'space-between',
                                    minHeight: '84px',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                            <span style={{ fontSize: '13px' }}>📅</span>
                                            <span style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                                Fecha
                                            </span>
                                        </div>
                                        {dateInfo.dayName && (
                                            <span style={{
                                                fontSize: '10px',
                                                fontWeight: '700',
                                                padding: '1px 6px',
                                                borderRadius: '5px',
                                                background: dateInfo.isWeekend ? 'rgba(245, 158, 11, 0.12)' : 'rgba(0,0,0,0.04)',
                                                color: dateInfo.isWeekend ? '#D97706' : 'var(--text-secondary)'
                                            }}>
                                                {dateInfo.dayName}
                                            </span>
                                        )}
                                    </div>
                                    <div style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-primary)', lineHeight: '1.2', margin: '4px 0 2px' }}>
                                        {formatDisplayDate(booking.date)}
                                    </div>
                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                        {dateInfo.isWeekend ? '🎉 Fin de semana' : 'Día de semana'}
                                    </div>
                                </div>

                                {/* Tile 2: Horario & Duración */}
                                <div style={{
                                    background: 'var(--bg-main)',
                                    borderRadius: '12px',
                                    border: '1px solid var(--border)',
                                    padding: '11px 13px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'space-between',
                                    minHeight: '84px',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                            <span style={{ fontSize: '13px' }}>⏱️</span>
                                            <span style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                                Horario
                                            </span>
                                        </div>
                                        <span style={{
                                            fontSize: '10px',
                                            fontWeight: '800',
                                            padding: '1px 6px',
                                            borderRadius: '5px',
                                            background: 'rgba(59, 130, 246, 0.12)',
                                            color: '#2563EB'
                                        }}>
                                            {scheduleInfo.badge}
                                        </span>
                                    </div>

                                    {isEditing ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', margin: '3px 0' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <span style={{ fontSize: '10px', color: 'var(--text-secondary)', minWidth: '32px' }}>Inicio:</span>
                                                <input
                                                    type="time"
                                                    value={editableTime}
                                                    onChange={(e) => setEditableTime(e.target.value)}
                                                    style={{
                                                        width: '100%',
                                                        padding: '3px 6px',
                                                        borderRadius: '6px',
                                                        border: '1px solid var(--border)',
                                                        background: 'var(--bg-card)',
                                                        color: 'var(--text-primary)',
                                                        fontSize: '12px',
                                                        fontWeight: '700'
                                                    }}
                                                />
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <span style={{ fontSize: '10px', color: 'var(--text-secondary)', minWidth: '32px' }}>Horas:</span>
                                                <CustomDropdown
                                                    size="compact"
                                                    value={editableDuration || 8}
                                                    options={durationOptions.map(h => ({
                                                        value: h,
                                                        label: `${h} hs`
                                                    }))}
                                                    onChange={(val) => setEditableDuration(Number(val))}
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-primary)', lineHeight: '1.2', margin: '4px 0 2px' }}>
                                                {scheduleInfo.formatted}
                                            </div>
                                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                                {scheduleInfo.subtext}
                                            </div>
                                        </>
                                    )}
                                </div>

                                {/* Tile 3: Invitados */}
                                <div style={{
                                    background: 'var(--bg-main)',
                                    borderRadius: '12px',
                                    border: '1px solid var(--border)',
                                    padding: '11px 13px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'space-between',
                                    minHeight: '84px',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                            <span style={{ fontSize: '13px' }}>👥</span>
                                            <span style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                                Invitados
                                            </span>
                                        </div>
                                        <span style={{
                                            fontSize: '10px',
                                            fontWeight: '700',
                                            color: 'var(--text-muted)'
                                        }}>
                                            Máx: {maxCapacity}
                                        </span>
                                    </div>

                                    {isEditing ? (
                                        <div style={{ margin: '4px 0 2px' }}>
                                            <input
                                                type="number"
                                                min="1"
                                                max={maxCapacity}
                                                value={editableGuests}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    if (val !== '' && Number(val) > maxCapacity) {
                                                        setEditableGuests(String(maxCapacity));
                                                    } else {
                                                        setEditableGuests(val);
                                                    }
                                                }}
                                                placeholder={`Máx ${maxCapacity}`}
                                                style={{
                                                    width: '100%',
                                                    padding: '4px 6px',
                                                    borderRadius: '6px',
                                                    border: '1px solid var(--border)',
                                                    fontSize: '13px',
                                                    fontWeight: '700',
                                                    background: 'var(--bg-card)',
                                                    color: 'var(--text-primary)'
                                                }}
                                            />
                                        </div>
                                    ) : (
                                        <div style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-primary)', lineHeight: '1.2', margin: '4px 0 2px' }}>
                                            {editableGuests ? `${editableGuests} personas` : 'Sin especificar'}
                                        </div>
                                    )}

                                    <div style={{
                                        fontSize: '11px',
                                        fontWeight: isFullCapacity ? '700' : '500',
                                        color: isFullCapacity ? '#D97706' : 'var(--text-muted)'
                                    }}>
                                        {isFullCapacity ? '⚠️ Aforo al 100%' : `Capacidad permitida: ${maxCapacity}`}
                                    </div>
                                </div>

                                {/* Tile 4: Tipo de Evento */}
                                <div style={{
                                    background: 'var(--bg-main)',
                                    borderRadius: '12px',
                                    border: '1px solid var(--border)',
                                    padding: '11px 13px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'space-between',
                                    minHeight: '84px',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                            <span style={{ fontSize: '13px' }}>🎈</span>
                                            <span style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                                Evento
                                            </span>
                                        </div>
                                        <span style={{
                                            fontSize: '9px',
                                            fontWeight: '700',
                                            padding: '1px 5px',
                                            borderRadius: '4px',
                                            background: 'rgba(236, 72, 153, 0.12)',
                                            color: '#DB2777'
                                        }}>
                                            Festejo
                                        </span>
                                    </div>

                                    {isEditing ? (
                                        <div style={{ margin: '4px 0 2px' }}>
                                            <input
                                                type="text"
                                                list="eventTypesList"
                                                value={editableEventType}
                                                onChange={(e) => setEditableEventType(e.target.value)}
                                                placeholder="Ej. Cumpleaños, Asado..."
                                                style={{
                                                    width: '100%',
                                                    padding: '4px 6px',
                                                    borderRadius: '6px',
                                                    border: '1px solid var(--border)',
                                                    fontSize: '12px',
                                                    fontWeight: '700',
                                                    background: 'var(--bg-card)',
                                                    color: 'var(--text-primary)'
                                                }}
                                            />
                                            <datalist id="eventTypesList">
                                                <option value="Cumpleaños" />
                                                <option value="Familiar / Asado" />
                                                <option value="Fiesta Infantil" />
                                                <option value="Bautismo / Comunión" />
                                                <option value="Despedida de Año" />
                                                <option value="Reunión de Amigos" />
                                                <option value="Corporativo / Empresa" />
                                                <option value="Casamiento / Civil" />
                                            </datalist>
                                        </div>
                                    ) : (
                                        <div style={{
                                            fontSize: '15px',
                                            fontWeight: '800',
                                            color: 'var(--text-primary)',
                                            lineHeight: '1.2',
                                            margin: '4px 0 2px',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap'
                                        }}>
                                            {editableEventType || 'Alquiler General'}
                                        </div>
                                    )}

                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                        Celebración privada
                                    </div>
                                </div>
                            </div>

                            {/* CUSTOMER INFO & WHATSAPP HUB */}
                            <div style={{
                                padding: '12px 14px',
                                background: 'var(--bg-main)',
                                borderRadius: '14px',
                                border: '1px solid var(--border)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '10px'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '10px', color: 'var(--text-secondary)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '2px' }}>
                                            👤 Cliente Responsable
                                        </label>
                                        <div style={{ fontWeight: '800', color: 'var(--text-primary)', fontSize: '16px' }}>
                                            {booking.customer_name || booking.customerName || 'Cliente sin nombre'}
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <span>📱</span>
                                                <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{phone || 'Sin teléfono'}</span>
                                            </div>
                                            {email && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}>
                                                    <span>📧</span>
                                                    <span>{email}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {cleanPhone && (
                                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                            <button
                                                type="button"
                                                onClick={() => handleSendWhatsapp('direct')}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                    padding: '8px 12px',
                                                    borderRadius: '10px',
                                                    border: '1px solid #25D366',
                                                    background: 'rgba(37, 211, 102, 0.12)',
                                                    color: '#25D366',
                                                    fontSize: '12px',
                                                    fontWeight: '700',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s',
                                                    whiteSpace: 'nowrap'
                                                }}
                                                title="Abrir chat directo de WhatsApp con el cliente"
                                            >
                                                <span>📲</span> Chat WhatsApp
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => setShowWhatsappMenu(!showWhatsappMenu)}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '5px',
                                                    padding: '8px 12px',
                                                    borderRadius: '10px',
                                                    border: '1px solid var(--border)',
                                                    background: showWhatsappMenu ? 'var(--primary-paddle)' : 'var(--bg-card)',
                                                    color: showWhatsappMenu ? 'white' : 'var(--text-primary)',
                                                    fontSize: '12px',
                                                    fontWeight: '700',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s',
                                                    whiteSpace: 'nowrap'
                                                }}
                                                title="Ver opciones de mensajes automáticos"
                                            >
                                                <span>💬 Mensajes Rápidos</span>
                                                <span style={{ fontSize: '9px' }}>{showWhatsappMenu ? '▲' : '▼'}</span>
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Expandable WhatsApp templates */}
                                {cleanPhone && showWhatsappMenu && (
                                    <div style={{
                                        padding: '10px 12px',
                                        background: 'var(--bg-card)',
                                        borderRadius: '10px',
                                        border: '1px solid rgba(37, 211, 102, 0.3)',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '8px'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontSize: '11px', fontWeight: '700', color: '#25D366', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                                                ⚡ Plantillas Rápidas para Alquiler:
                                            </span>
                                            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                                                Usa ✏️ para editar antes de enviar
                                            </span>
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '6px' }}>
                                            <div style={{ display: 'flex', gap: '4px' }}>
                                                <button
                                                    type="button"
                                                    onClick={() => handleSendWhatsapp('pedir_sena')}
                                                    style={{
                                                        flex: 1,
                                                        padding: '7px 10px',
                                                        borderRadius: '6px',
                                                        border: '1px solid var(--border)',
                                                        background: 'var(--bg-main)',
                                                        color: 'var(--text-primary)',
                                                        fontSize: '11px',
                                                        fontWeight: '600',
                                                        cursor: 'pointer',
                                                        textAlign: 'left'
                                                    }}
                                                >
                                                    💳 <strong>Pedir Seña</strong>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleOpenPreview('pedir_sena', 'Pedir Seña')}
                                                    style={{
                                                        padding: '7px 8px',
                                                        borderRadius: '6px',
                                                        border: '1px solid var(--border)',
                                                        background: 'var(--bg-main)',
                                                        fontSize: '11px',
                                                        cursor: 'pointer'
                                                    }}
                                                    title="Editar texto antes de enviar"
                                                >
                                                    ✏️
                                                </button>
                                            </div>

                                            <div style={{ display: 'flex', gap: '4px' }}>
                                                <button
                                                    type="button"
                                                    onClick={() => handleSendWhatsapp('confirmar_reserva')}
                                                    style={{
                                                        flex: 1,
                                                        padding: '7px 10px',
                                                        borderRadius: '6px',
                                                        border: '1px solid var(--border)',
                                                        background: 'var(--bg-main)',
                                                        color: 'var(--text-primary)',
                                                        fontSize: '11px',
                                                        fontWeight: '600',
                                                        cursor: 'pointer',
                                                        textAlign: 'left'
                                                    }}
                                                >
                                                    🎉 <strong>Confirmar Reserva</strong>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleOpenPreview('confirmar_reserva', 'Confirmar Reserva')}
                                                    style={{
                                                        padding: '7px 8px',
                                                        borderRadius: '6px',
                                                        border: '1px solid var(--border)',
                                                        background: 'var(--bg-main)',
                                                        fontSize: '11px',
                                                        cursor: 'pointer'
                                                    }}
                                                    title="Editar texto antes de enviar"
                                                >
                                                    ✏️
                                                </button>
                                            </div>

                                            <div style={{ display: 'flex', gap: '4px' }}>
                                                <button
                                                    type="button"
                                                    onClick={() => handleSendWhatsapp('recordatorio_saldo')}
                                                    style={{
                                                        flex: 1,
                                                        padding: '7px 10px',
                                                        borderRadius: '6px',
                                                        border: '1px solid var(--border)',
                                                        background: 'var(--bg-main)',
                                                        color: 'var(--text-primary)',
                                                        fontSize: '11px',
                                                        fontWeight: '600',
                                                        cursor: 'pointer',
                                                        textAlign: 'left'
                                                    }}
                                                >
                                                    ⏰ <strong>Recordatorio Saldo al Ingreso</strong>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleOpenPreview('recordatorio_saldo', 'Recordatorio de Saldo')}
                                                    style={{
                                                        padding: '7px 8px',
                                                        borderRadius: '6px',
                                                        border: '1px solid var(--border)',
                                                        background: 'var(--bg-main)',
                                                        fontSize: '11px',
                                                        cursor: 'pointer'
                                                    }}
                                                    title="Editar texto antes de enviar"
                                                >
                                                    ✏️
                                                </button>
                                            </div>

                                            <div style={{ display: 'flex', gap: '4px' }}>
                                                <button
                                                    type="button"
                                                    onClick={() => handleSendWhatsapp('ubicacion')}
                                                    style={{
                                                        flex: 1,
                                                        padding: '7px 10px',
                                                        borderRadius: '6px',
                                                        border: '1px solid var(--border)',
                                                        background: 'var(--bg-main)',
                                                        color: 'var(--text-primary)',
                                                        fontSize: '11px',
                                                        fontWeight: '600',
                                                        cursor: 'pointer',
                                                        textAlign: 'left'
                                                    }}
                                                >
                                                    📍 <strong>Enviar Ubicación & Cómo Llegar</strong>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleOpenPreview('ubicacion', 'Ubicación')}
                                                    style={{
                                                        padding: '7px 8px',
                                                        borderRadius: '6px',
                                                        border: '1px solid var(--border)',
                                                        background: 'var(--bg-main)',
                                                        fontSize: '11px',
                                                        cursor: 'pointer'
                                                    }}
                                                    title="Editar texto antes de enviar"
                                                >
                                                    ✏️
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* ADDITIONAL SERVICES & EXTRAS SECTION */}
                            <div style={{
                                padding: '12px 14px',
                                background: 'var(--bg-main)',
                                borderRadius: '14px',
                                border: '1px solid var(--border)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span>✨</span> Servicios y Adicionales ({editableServices.length})
                                    </span>
                                    {extrasSum > 0 && (
                                        <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--primary-paddle)' }}>
                                            Total Extras: +${extrasSum.toLocaleString('es-AR')}
                                        </span>
                                    )}
                                </div>

                                {/* Catalog quick-add buttons in edit mode */}
                                {isEditing && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingBottom: '6px', borderBottom: '1px dashed var(--border)' }}>
                                        {catalogAdditionals.length > 0 && (
                                            <div>
                                                <span style={{ fontSize: '10px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                                    Catálogo del negocio (clic para sumar/quitar):
                                                </span>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                                                    {catalogAdditionals.map((catItem, idx) => {
                                                        const isSelected = editableServices.some(s => s.name.toLowerCase() === catItem.name.toLowerCase());
                                                        return (
                                                            <button
                                                                key={idx}
                                                                type="button"
                                                                onClick={() => handleToggleCatalogExtra(catItem)}
                                                                style={{
                                                                    padding: '4px 9px',
                                                                    borderRadius: '8px',
                                                                    border: isSelected ? '1px solid var(--primary-paddle)' : '1px solid var(--border)',
                                                                    background: isSelected ? 'rgba(0, 230, 118, 0.15)' : 'var(--bg-card)',
                                                                    color: isSelected ? 'var(--primary-paddle)' : 'var(--text-primary)',
                                                                    fontSize: '11px',
                                                                    fontWeight: isSelected ? '700' : '600',
                                                                    cursor: 'pointer',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: '4px'
                                                                }}
                                                            >
                                                                <span>{catItem.icon || '✨'}</span>
                                                                <span>{isSelected ? '✓ ' : '+ '} {catItem.name}</span>
                                                                {catItem.price > 0 && (
                                                                    <span style={{ opacity: 0.85 }}>(${catItem.price.toLocaleString('es-AR')})</span>
                                                                )}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                        {/* Add custom extra form toggle */}
                                        {!showAddCustomExtra ? (
                                            <div>
                                                <button
                                                    type="button"
                                                    onClick={() => setShowAddCustomExtra(true)}
                                                    style={{
                                                        padding: '4px 8px',
                                                        borderRadius: '6px',
                                                        border: '1px dashed var(--border)',
                                                        background: 'transparent',
                                                        color: 'var(--text-secondary)',
                                                        fontSize: '11px',
                                                        fontWeight: '600',
                                                        cursor: 'pointer',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '4px'
                                                    }}
                                                >
                                                    <span>➕</span> Agregar adicional personalizado...
                                                </button>
                                            </div>
                                        ) : (
                                            <div style={{
                                                display: 'flex',
                                                gap: '6px',
                                                alignItems: 'center',
                                                padding: '8px',
                                                borderRadius: '8px',
                                                background: 'var(--bg-card)',
                                                border: '1px solid var(--border)'
                                            }}>
                                                <input
                                                    type="text"
                                                    value={customExtraName}
                                                    onChange={(e) => setCustomExtraName(e.target.value)}
                                                    placeholder="Nombre (ej. Hielo, Limpieza extra)"
                                                    style={{
                                                        flex: 2,
                                                        padding: '4px 8px',
                                                        borderRadius: '6px',
                                                        border: '1px solid var(--border)',
                                                        background: 'var(--bg-main)',
                                                        color: 'var(--text-primary)',
                                                        fontSize: '12px'
                                                    }}
                                                />
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '2px', flex: 1 }}>
                                                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>$</span>
                                                    <input
                                                        type="number"
                                                        value={customExtraPrice}
                                                        onChange={(e) => setCustomExtraPrice(e.target.value)}
                                                        placeholder="Precio"
                                                        min="0"
                                                        style={{
                                                            width: '100%',
                                                            padding: '4px 6px',
                                                            borderRadius: '6px',
                                                            border: '1px solid var(--border)',
                                                            background: 'var(--bg-main)',
                                                            color: 'var(--text-primary)',
                                                            fontSize: '12px',
                                                            textAlign: 'right'
                                                        }}
                                                    />
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={handleAddCustomExtra}
                                                    style={{
                                                        padding: '4px 10px',
                                                        borderRadius: '6px',
                                                        border: 'none',
                                                        background: 'var(--primary-paddle)',
                                                        color: 'white',
                                                        fontSize: '11px',
                                                        fontWeight: '700',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    Añadir
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setShowAddCustomExtra(false);
                                                        setCustomExtraName('');
                                                        setCustomExtraPrice('');
                                                    }}
                                                    style={{
                                                        padding: '4px 8px',
                                                        borderRadius: '6px',
                                                        border: '1px solid var(--border)',
                                                        background: 'transparent',
                                                        color: 'var(--text-secondary)',
                                                        fontSize: '11px',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* List of current extras */}
                                {editableServices.length > 0 ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        {editableServices.map((serviceItem, idx) => {
                                            const qty = Number(serviceItem.quantity || 1);
                                            const price = Number(serviceItem.price || 0);
                                            const subtotal = price * qty;

                                            return (
                                                <div
                                                    key={idx}
                                                    style={{
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        alignItems: 'center',
                                                        padding: '7px 10px',
                                                        borderRadius: '8px',
                                                        background: 'var(--bg-card)',
                                                        border: '1px solid var(--border)',
                                                        fontSize: '12px',
                                                        gap: '6px'
                                                    }}
                                                >
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        <span style={{ fontSize: '15px' }}>{serviceItem.icon || '✨'}</span>
                                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                            <span style={{ fontWeight: '700', color: 'var(--text-primary)' }}>
                                                                {serviceItem.name} {qty > 1 && !isEditing ? `(x${qty})` : ''}
                                                            </span>
                                                            {price > 0 && isEditing && (
                                                                <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                                                                    ${price.toLocaleString('es-AR')} c/u
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        {isEditing ? (
                                                            <>
                                                                {/* Quantity stepper */}
                                                                <div style={{
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    background: 'var(--bg-main)',
                                                                    borderRadius: '6px',
                                                                    border: '1px solid var(--border)',
                                                                    overflow: 'hidden'
                                                                }}>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleQuantityChange(idx, -1)}
                                                                        style={{
                                                                            padding: '1px 6px',
                                                                            background: 'transparent',
                                                                            border: 'none',
                                                                            cursor: 'pointer',
                                                                            color: 'var(--text-primary)',
                                                                            fontWeight: '800',
                                                                            fontSize: '12px'
                                                                        }}
                                                                    >
                                                                        -
                                                                    </button>
                                                                    <span style={{
                                                                        padding: '0 4px',
                                                                        fontWeight: '800',
                                                                        fontSize: '11px',
                                                                        color: 'var(--text-primary)',
                                                                        minWidth: '18px',
                                                                        textAlign: 'center'
                                                                    }}>
                                                                        {qty}
                                                                    </span>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleQuantityChange(idx, 1)}
                                                                        style={{
                                                                            padding: '1px 6px',
                                                                            background: 'transparent',
                                                                            border: 'none',
                                                                            cursor: 'pointer',
                                                                            color: 'var(--text-primary)',
                                                                            fontWeight: '800',
                                                                            fontSize: '12px'
                                                                        }}
                                                                    >
                                                                        +
                                                                    </button>
                                                                </div>

                                                                {/* Editable unit price */}
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                                                                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>$</span>
                                                                    <input
                                                                        type="number"
                                                                        value={serviceItem.price}
                                                                        onChange={(e) => handleEditExtraPrice(idx, e.target.value)}
                                                                        min="0"
                                                                        style={{
                                                                            width: '65px',
                                                                            padding: '2px 4px',
                                                                            borderRadius: '4px',
                                                                            border: '1px solid var(--border)',
                                                                            fontSize: '12px',
                                                                            fontWeight: '700',
                                                                            textAlign: 'right',
                                                                            background: 'var(--bg-main)',
                                                                            color: 'var(--text-primary)'
                                                                        }}
                                                                    />
                                                                </div>

                                                                {/* Subtotal */}
                                                                <span style={{
                                                                    fontSize: '11px',
                                                                    fontWeight: '800',
                                                                    color: 'var(--primary-paddle)',
                                                                    minWidth: '55px',
                                                                    textAlign: 'right'
                                                                }}>
                                                                    =${subtotal.toLocaleString('es-AR')}
                                                                </span>

                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleRemoveExtra(idx)}
                                                                    style={{
                                                                        background: 'transparent',
                                                                        border: 'none',
                                                                        color: '#ff4444',
                                                                        fontSize: '13px',
                                                                        cursor: 'pointer',
                                                                        padding: '2px'
                                                                    }}
                                                                    title="Eliminar adicional"
                                                                >
                                                                    🗑️
                                                                </button>
                                                            </>
                                                        ) : (
                                                            <span style={{
                                                                fontWeight: '700',
                                                                color: subtotal > 0 ? 'var(--primary-paddle)' : 'var(--text-secondary)',
                                                                fontSize: '12px'
                                                            }}>
                                                                {subtotal > 0
                                                                    ? `+$${subtotal.toLocaleString('es-AR')}`
                                                                    : 'Incluido'}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div style={{
                                        fontSize: '12px',
                                        color: 'var(--text-secondary)',
                                        fontStyle: 'italic',
                                        padding: '6px 0',
                                        textAlign: 'center'
                                    }}>
                                        Sin servicios adicionales contratados.
                                    </div>
                                )}
                            </div>

                            {/* NOTES & OBSERVATIONS */}
                            {(notes || isEditing) && (
                                <div style={{
                                    padding: '10px 12px',
                                    background: 'rgba(245, 158, 11, 0.08)',
                                    borderRadius: '12px',
                                    border: '1px solid rgba(245, 158, 11, 0.25)',
                                    fontSize: '12px'
                                }}>
                                    <span style={{ fontWeight: '700', color: '#D97706', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                                        <span>📝</span> Observaciones & Requerimientos:
                                    </span>
                                    {isEditing ? (
                                        <textarea
                                            rows="2"
                                            value={editableNotes}
                                            onChange={(e) => setEditableNotes(e.target.value)}
                                            placeholder="Observaciones de la reserva (ej. Traen pelotero, decoraciones, etc.)..."
                                            style={{
                                                width: '100%',
                                                padding: '6px 10px',
                                                borderRadius: '8px',
                                                border: '1px solid var(--border)',
                                                background: 'var(--bg-card)',
                                                color: 'var(--text-primary)',
                                                fontSize: '12px',
                                                outline: 'none',
                                                resize: 'vertical'
                                            }}
                                        />
                                    ) : (
                                        <span style={{ color: 'var(--text-primary)', whiteSpace: 'pre-wrap', lineHeight: '1.4' }}>
                                            {editableNotes || notes}
                                        </span>
                                    )}
                                </div>
                            )}

                            {/* FINANCIAL SUMMARY & PAYMENT CONTROLS */}
                            <div style={{
                                padding: '14px 16px',
                                background: 'var(--bg-main)',
                                borderRadius: '14px',
                                border: '1px solid var(--border)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '12px'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '10px', color: 'var(--text-secondary)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '2px' }}>
                                            Estado de Reserva
                                        </label>
                                        <div style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '5px',
                                            padding: '3px 8px',
                                            borderRadius: '6px',
                                            fontWeight: '800',
                                            fontSize: '12px',
                                            background: booking.status === 'confirmed' ? 'rgba(0, 230, 118, 0.15)' :
                                                (booking.status === 'deposit_paid' ? 'rgba(245, 158, 11, 0.15)' :
                                                    (booking.status === 'cancelled' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255,255,255,0.06)')),
                                            color: booking.status === 'confirmed' ? '#00E676' :
                                                (booking.status === 'deposit_paid' ? '#F59E0B' :
                                                    (booking.status === 'cancelled' ? '#EF4444' : 'var(--text-primary)'))
                                        }}>
                                            <span>{booking.status === 'confirmed' ? '✓' : (booking.status === 'deposit_paid' ? '💳' : (booking.status === 'cancelled' ? '✕' : '⏳'))}</span>
                                            {getStatusLabel(booking.status)}
                                        </div>
                                    </div>

                                    <div style={{ textAlign: 'right' }}>
                                        <label style={{ display: 'block', fontSize: '10px', color: 'var(--text-secondary)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '2px' }}>
                                            Total Alquiler
                                        </label>
                                        {isEditing ? (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                                <span style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-primary)' }}>$</span>
                                                <input
                                                    type="number"
                                                    value={editablePrice}
                                                    onChange={(e) => setEditablePrice(e.target.value)}
                                                    style={{
                                                        width: '110px',
                                                        padding: '4px 8px',
                                                        borderRadius: '6px',
                                                        border: '1px solid var(--border)',
                                                        fontSize: '15px',
                                                        fontWeight: '800',
                                                        background: 'var(--bg-card)',
                                                        color: 'var(--text-primary)',
                                                        textAlign: 'right'
                                                    }}
                                                />
                                            </div>
                                        ) : (
                                            <div style={{ fontWeight: '900', color: 'var(--text-primary)', fontSize: '20px' }}>
                                                ${activePrice.toLocaleString('es-AR')}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Itemized Calculation Breakdown */}
                                <div style={{
                                    background: 'var(--bg-card)',
                                    padding: '10px 12px',
                                    borderRadius: '10px',
                                    border: '1px solid var(--border)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '5px',
                                    fontSize: '12px'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                                        <span>🏠 Alquiler Base ({editableGuests ? `${editableGuests} pers.` : 'Espacio'}{editableDuration ? ` • ${editableDuration} hs` : ''}):</span>
                                        <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>${baseRentalPrice.toLocaleString('es-AR')}</span>
                                    </div>

                                    {durationDiscountAmount > 0 && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#00E676' }}>
                                            <span>⏱️ Descuento por Duración ({durationDiscountPct}%):</span>
                                            <span style={{ fontWeight: '700' }}>-${durationDiscountAmount.toLocaleString('es-AR')}</span>
                                        </div>
                                    )}

                                    {discountAmount > 0 && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#00E676' }}>
                                            <span>🏷️ Descuento Cupón {couponCode ? `("${couponCode}")` : ''}:</span>
                                            <span style={{ fontWeight: '700' }}>-${discountAmount.toLocaleString('es-AR')}</span>
                                        </div>
                                    )}

                                    {giftBenefit && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#38BDF8', fontSize: '11px' }}>
                                            <span>🎁 Beneficio de Cupón:</span>
                                            <span style={{ fontWeight: '700' }}>{giftBenefit}</span>
                                        </div>
                                    )}

                                    {editableServices.length > 0 && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                                            <span>✨ Adicionales ({editableServices.length}):</span>
                                            <span style={{ fontWeight: '700', color: 'var(--primary-paddle)' }}>+${extrasSum.toLocaleString('es-AR')}</span>
                                        </div>
                                    )}

                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        borderTop: '1px dashed var(--border)',
                                        paddingTop: '6px',
                                        marginTop: '2px',
                                        fontWeight: '800',
                                        fontSize: '13px'
                                    }}>
                                        <span>Total Presupuestado:</span>
                                        <span style={{ color: 'var(--text-primary)' }}>${activePrice.toLocaleString('es-AR')}</span>
                                    </div>
                                </div>

                                {/* Split Payment Cards: Seña vs Saldo al Ingresar */}
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                                    gap: '10px'
                                }}>
                                    {/* CARD 1: SEÑA */}
                                    <div style={{
                                        padding: '12px',
                                        borderRadius: '12px',
                                        background: booking.status === 'deposit_paid' || booking.status === 'confirmed' || booking.status === 'completed'
                                            ? 'rgba(0, 230, 118, 0.06)'
                                            : 'rgba(245, 158, 11, 0.08)',
                                        border: booking.status === 'deposit_paid' || booking.status === 'confirmed' || booking.status === 'completed'
                                            ? '1px solid rgba(0, 230, 118, 0.3)'
                                            : '1px solid rgba(245, 158, 11, 0.3)',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        justifyContent: 'space-between',
                                        gap: '8px'
                                    }}>
                                        <div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                                <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                                                    💳 Seña (Garantía)
                                                </span>
                                                <span style={{
                                                    fontSize: '10px',
                                                    fontWeight: '800',
                                                    padding: '2px 6px',
                                                    borderRadius: '4px',
                                                    background: booking.status === 'deposit_paid' || booking.status === 'confirmed' || booking.status === 'completed'
                                                        ? 'rgba(0, 230, 118, 0.2)'
                                                        : 'rgba(245, 158, 11, 0.2)',
                                                    color: booking.status === 'deposit_paid' || booking.status === 'confirmed' || booking.status === 'completed'
                                                        ? '#00E676'
                                                        : '#F59E0B'
                                                }}>
                                                    {booking.status === 'deposit_paid' || booking.status === 'confirmed' || booking.status === 'completed'
                                                        ? '✓ Seña Cobrada'
                                                        : '⏳ Pendiente'}
                                                </span>
                                            </div>

                                            {isEditing ? (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '3px', marginTop: '4px' }}>
                                                    <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>$</span>
                                                    <input
                                                        type="number"
                                                        value={editableDeposit}
                                                        onChange={(e) => setEditableDeposit(e.target.value)}
                                                        style={{
                                                            width: '100%',
                                                            padding: '4px 6px',
                                                            borderRadius: '6px',
                                                            border: '1px solid var(--border)',
                                                            fontSize: '14px',
                                                            fontWeight: '800',
                                                            background: 'var(--bg-card)',
                                                            color: 'var(--text-primary)'
                                                        }}
                                                    />
                                                </div>
                                            ) : (
                                                <div style={{ fontSize: '18px', fontWeight: '900', color: 'var(--text-primary)' }}>
                                                    ${activeDeposit.toLocaleString('es-AR')}
                                                </div>
                                            )}
                                            <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', marginTop: '2px' }}>
                                                Monto para reservar la fecha en agenda
                                            </span>
                                        </div>

                                        {booking.status === 'pending' && !isEditing && (
                                            <button
                                                type="button"
                                                onClick={() => onAction('confirm_deposit')}
                                                style={{
                                                    width: '100%',
                                                    padding: '7px 8px',
                                                    borderRadius: '8px',
                                                    border: 'none',
                                                    background: '#F59E0B',
                                                    color: 'white',
                                                    fontSize: '11px',
                                                    fontWeight: '700',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '4px',
                                                    transition: 'all 0.2s',
                                                    boxShadow: '0 2px 6px rgba(245, 158, 11, 0.3)'
                                                }}
                                            >
                                                <span>💳</span> Marcar Seña Cobrada
                                            </button>
                                        )}
                                    </div>

                                    {/* CARD 2: SALDO AL INGRESAR */}
                                    <div style={{
                                        padding: '12px',
                                        borderRadius: '12px',
                                        background: (booking.status === 'confirmed' && pendingBalance === 0) || booking.status === 'completed'
                                            ? 'rgba(0, 230, 118, 0.06)'
                                            : 'rgba(239, 68, 68, 0.06)',
                                        border: (booking.status === 'confirmed' && pendingBalance === 0) || booking.status === 'completed'
                                            ? '1px solid rgba(0, 230, 118, 0.3)'
                                            : '1px solid rgba(239, 68, 68, 0.25)',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        justifyContent: 'space-between',
                                        gap: '8px'
                                    }}>
                                        <div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                                <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                                                    💵 Saldo al Ingresar
                                                </span>
                                                <span style={{
                                                    fontSize: '10px',
                                                    fontWeight: '800',
                                                    padding: '2px 6px',
                                                    borderRadius: '4px',
                                                    background: (booking.status === 'confirmed' && pendingBalance === 0) || booking.status === 'completed'
                                                        ? 'rgba(0, 230, 118, 0.2)'
                                                        : 'rgba(239, 68, 68, 0.15)',
                                                    color: (booking.status === 'confirmed' && pendingBalance === 0) || booking.status === 'completed'
                                                        ? '#00E676'
                                                        : '#E11D48'
                                                }}>
                                                    {(booking.status === 'confirmed' && pendingBalance === 0) || booking.status === 'completed'
                                                        ? '✓ Liquidado'
                                                        : 'A cobrar el día del evento'}
                                                </span>
                                            </div>

                                            <div style={{
                                                fontSize: '18px',
                                                fontWeight: '900',
                                                color: (booking.status === 'confirmed' && pendingBalance === 0) || booking.status === 'completed'
                                                    ? '#00E676'
                                                    : '#E11D48'
                                            }}>
                                                {(booking.status === 'confirmed' && pendingBalance === 0) || booking.status === 'completed'
                                                    ? '$0'
                                                    : `$${pendingBalance.toLocaleString('es-AR')}`}
                                            </div>
                                            <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', marginTop: '2px' }}>
                                                A cobrar al recibir al cliente al quincho/salón
                                            </span>
                                        </div>

                                        <div style={{ fontSize: '10px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                                            💡 Pago en mano o transferencia al momento del check-in.
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* TIMELINE / HISTORY */}
                            <div style={{
                                padding: '8px 12px',
                                background: 'rgba(0,0,0,0.01)',
                                borderRadius: '12px',
                                fontSize: '11px',
                                border: '1px dashed var(--border)'
                            }}>
                                <div style={{ fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase', fontSize: '9px', letterSpacing: '0.5px' }}>
                                    Historial de la Reserva
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <div style={{ borderLeft: '2px solid var(--primary-paddle)', paddingLeft: '8px', marginBottom: '2px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1px' }}>
                                            <span style={{ fontWeight: '700', color: 'var(--text-primary)' }}>Reserva Creada</span>
                                            <span style={{ color: 'var(--text-secondary)', fontSize: '9px' }}>
                                                {booking.created_at ? new Date(booking.created_at).toLocaleString('es-AR') :
                                                    (booking.history?.find(h => h.action === 'creation')?.timestamp ?
                                                        new Date(booking.history.find(h => h.action === 'creation').timestamp).toLocaleString('es-AR') : '-')}
                                            </span>
                                        </div>
                                    </div>

                                    {booking.history && booking.history.filter(h => h.action !== 'creation').map((log, idx) => (
                                        <div key={idx} style={{ borderLeft: '2px solid var(--border)', paddingLeft: '8px', marginBottom: '2px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1px' }}>
                                                <span style={{ fontWeight: '700', color: 'var(--text-primary)' }}>
                                                    {log.label === 'Turno Confirmado' ? 'Reserva Confirmada' : (log.label === 'Turno Cancelado' ? 'Reserva Cancelada' : log.label)}
                                                </span>
                                                <span style={{ color: 'var(--text-secondary)', fontSize: '9px' }}>
                                                    {new Date(log.timestamp).toLocaleString('es-AR')}
                                                </span>
                                            </div>
                                            {log.reason && (
                                                <div style={{ color: '#ff4444', fontStyle: 'italic', fontSize: '10px' }}>
                                                    Motivo: {log.reason}
                                                </div>
                                            )}
                                        </div>
                                    ))}

                                    {(!booking.history || booking.history.length === 0) && (
                                        <>
                                            {booking.confirmed_at && (
                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                    <span style={{ color: 'var(--text-secondary)' }}>Confirmado:</span>
                                                    <span style={{ color: '#00E676', fontWeight: '500' }}>
                                                        {new Date(booking.confirmed_at).toLocaleString('es-AR')}
                                                    </span>
                                                </div>
                                            )}
                                            {booking.cancelled_at && (
                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                    <span style={{ color: 'var(--text-secondary)' }}>Cancelado:</span>
                                                    <span style={{ color: '#ff4444', fontWeight: '500' }}>
                                                        {new Date(booking.cancelled_at).toLocaleString('es-AR')}
                                                    </span>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* BOTTOM ACTION BUTTONS FOR RENTALS */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '4px' }}>
                                {(booking.status === 'pending' || booking.status === 'deposit_paid') && (
                                    <button
                                        onClick={() => booking.status === 'pending' && onAction('confirm_deposit')}
                                        disabled={booking.status === 'deposit_paid'}
                                        style={{
                                            padding: '11px 14px',
                                            borderRadius: '12px',
                                            border: booking.status === 'deposit_paid' ? '1px solid var(--border)' : 'none',
                                            background: booking.status === 'deposit_paid' ? 'rgba(0,0,0,0.06)' : '#F59E0B',
                                            color: booking.status === 'deposit_paid' ? 'var(--text-muted)' : 'white',
                                            fontWeight: '700',
                                            cursor: booking.status === 'deposit_paid' ? 'not-allowed' : 'pointer',
                                            opacity: booking.status === 'deposit_paid' ? 0.6 : 1,
                                            fontSize: '13px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '6px'
                                        }}
                                    >
                                        {booking.status === 'deposit_paid' ? '✓ Seña Registrada' : '💳 Confirmar Seña'}
                                    </button>
                                )}

                                {(booking.status === 'pending' || booking.status === 'deposit_paid') && (
                                    <button
                                        onClick={() => onAction('confirm_booking')}
                                        style={{
                                            padding: '11px 14px',
                                            borderRadius: '12px',
                                            border: 'none',
                                            background: 'var(--primary-paddle, #10B981)',
                                            color: 'white',
                                            fontWeight: '700',
                                            cursor: 'pointer',
                                            fontSize: '13px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '6px'
                                        }}
                                    >
                                        ✓ Confirmar Reserva
                                    </button>
                                )}

                                {(booking.status === 'confirmed' || booking.status === 'attended') && (
                                    <button
                                        onClick={() => onAction('complete_booking')}
                                        style={{
                                            gridColumn: 'span 2',
                                            padding: '11px 14px',
                                            borderRadius: '12px',
                                            border: 'none',
                                            background: 'var(--primary-paddle, #10B981)',
                                            color: 'white',
                                            fontWeight: '700',
                                            cursor: 'pointer',
                                            fontSize: '14px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '6px'
                                        }}
                                    >
                                        <span>✓</span> Finalizar Alquiler / Check-out
                                    </button>
                                )}

                                {booking.status !== 'cancelled' && booking.status !== 'completed' && (
                                    <button
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            onAction('cancel');
                                        }}
                                        style={{
                                            gridColumn: 'span 2',
                                            padding: '10px 14px',
                                            borderRadius: '12px',
                                            border: 'none',
                                            background: '#ff4444',
                                            color: 'white',
                                            fontWeight: '700',
                                            cursor: 'pointer',
                                            marginTop: '2px',
                                            fontSize: '13px'
                                        }}
                                    >
                                        Cancelar Reserva
                                    </button>
                                )}

                                {booking.status === 'completed' && (
                                    <div style={{
                                        gridColumn: 'span 2',
                                        padding: '10px 14px',
                                        borderRadius: '12px',
                                        background: 'rgba(0, 230, 118, 0.1)',
                                        border: '1px solid rgba(0, 230, 118, 0.3)',
                                        color: '#00E676',
                                        fontWeight: '800',
                                        textAlign: 'center',
                                        fontSize: '13px'
                                    }}>
                                        ✓ Alquiler Finalizado con Éxito
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        /* SPORTS COURT UI (Padel, Fútbol, etc.) */
                        <>
                            {/* Top Grid: Date + Court + Duration */}
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: '1fr 1fr',
                                gap: '8px',
                                padding: '10px 14px',
                                background: 'var(--bg-main)',
                                borderRadius: '12px',
                                border: '1px solid var(--border)'
                            }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '2px', fontWeight: '600' }}>
                                        📅 Fecha y Horario
                                    </label>
                                    <div style={{ fontWeight: '700', color: 'var(--text-primary)', fontSize: isMobile ? '13px' : '14px' }}>
                                        {formatDisplayDate(booking.date)} {booking.time && booking.time !== '00:00' && booking.time !== '00:00:00' ? `• ${booking.time} hs` : ''}
                                    </div>
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '2px', fontWeight: '600' }}>
                                        {isPadel ? '🎾 Cancha de Pádel' : isFutbol ? '⚽ Cancha de Fútbol' : '🎯 Espacio / Cancha'}
                                    </label>
                                    <div style={{ fontWeight: '800', color: 'var(--primary-paddle)', fontSize: isMobile ? '13px' : '14px' }}>
                                        {resourceName}
                                    </div>
                                </div>
                            </div>

                            {/* Customer Info Card + Direct WhatsApp Hub */}
                            <div style={{
                                padding: '12px 14px',
                                background: 'var(--bg-main)',
                                borderRadius: '12px',
                                border: '1px solid var(--border)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '10px'
                            }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '2px', fontWeight: '600' }}>👤 Cliente</label>
                                    <div style={{ fontWeight: '800', color: 'var(--text-primary)', fontSize: '16px' }}>{booking.customer_name || booking.customerName || '-'}</div>
                                    
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <span>📱</span>
                                            <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{phone || '-'}</span>
                                        </div>
                                        {email && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                                                <span>📧</span>
                                                <span>{email}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {cleanPhone && (
                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: '1fr 1fr',
                                        gap: '8px',
                                        paddingTop: '8px',
                                        borderTop: '1px dashed var(--border)'
                                    }}>
                                        <button
                                            type="button"
                                            onClick={() => handleSendWhatsapp('direct')}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '6px',
                                                padding: '8px 12px',
                                                borderRadius: '10px',
                                                border: '1px solid #25D366',
                                                background: 'rgba(37, 211, 102, 0.12)',
                                                color: '#25D366',
                                                fontSize: '13px',
                                                fontWeight: '700',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s',
                                                whiteSpace: 'nowrap'
                                            }}
                                            title="Abrir WhatsApp directo con el cliente"
                                        >
                                            <span>📲</span> Abrir WhatsApp
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setShowWhatsappMenu(!showWhatsappMenu)}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '6px',
                                                padding: '8px 12px',
                                                borderRadius: '10px',
                                                border: '1px solid var(--border)',
                                                background: showWhatsappMenu ? 'var(--primary-paddle)' : 'var(--bg-card)',
                                                color: showWhatsappMenu ? 'white' : 'var(--text-primary)',
                                                fontSize: '13px',
                                                fontWeight: '700',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s',
                                                whiteSpace: 'nowrap'
                                            }}
                                            title="Ver opciones de mensajes automáticos"
                                        >
                                            <span>💬 Mensajes</span>
                                            <span style={{ fontSize: '10px' }}>{showWhatsappMenu ? '▲' : '▼'}</span>
                                        </button>
                                    </div>
                                )}

                                {/* WhatsApp Presets Expandable Panel */}
                                {cleanPhone && showWhatsappMenu && (
                                    <div style={{
                                        marginTop: '4px',
                                        padding: '10px 12px',
                                        background: 'var(--bg-card)',
                                        borderRadius: '10px',
                                        border: '1px solid rgba(37, 211, 102, 0.3)',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '8px'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontSize: '11px', fontWeight: '700', color: '#25D366', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                                                🚀 Enviar mensaje predeterminado:
                                            </span>
                                            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                                                Haz clic para enviar directo o previsualizar
                                            </span>
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '6px' }}>
                                            <div style={{ display: 'flex', gap: '4px' }}>
                                                <button
                                                    type="button"
                                                    onClick={() => handleSendWhatsapp('pedir_sena')}
                                                    style={{
                                                        flex: 1,
                                                        padding: '6px 10px',
                                                        borderRadius: '6px',
                                                        border: '1px solid var(--border)',
                                                        background: 'var(--bg-main)',
                                                        color: 'var(--text-primary)',
                                                        fontSize: '11px',
                                                        fontWeight: '600',
                                                        cursor: 'pointer',
                                                        textAlign: 'left'
                                                    }}
                                                >
                                                    💳 <strong>Pedir Seña</strong>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleOpenPreview('pedir_sena', 'Pedir Seña')}
                                                    style={{
                                                        padding: '6px 8px',
                                                        borderRadius: '6px',
                                                        border: '1px solid var(--border)',
                                                        background: 'var(--bg-main)',
                                                        fontSize: '11px',
                                                        cursor: 'pointer'
                                                    }}
                                                    title="Editar o ver antes de enviar"
                                                >
                                                    ✏️
                                                </button>
                                            </div>

                                            <div style={{ display: 'flex', gap: '4px' }}>
                                                <button
                                                    type="button"
                                                    onClick={() => handleSendWhatsapp('confirmar_reserva')}
                                                    style={{
                                                        flex: 1,
                                                        padding: '6px 10px',
                                                        borderRadius: '6px',
                                                        border: '1px solid var(--border)',
                                                        background: 'var(--bg-main)',
                                                        color: 'var(--text-primary)',
                                                        fontSize: '11px',
                                                        fontWeight: '600',
                                                        cursor: 'pointer',
                                                        textAlign: 'left'
                                                    }}
                                                >
                                                    🎉 <strong>Confirmar Reserva</strong>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleOpenPreview('confirmar_reserva', 'Confirmar Reserva')}
                                                    style={{
                                                        padding: '6px 8px',
                                                        borderRadius: '6px',
                                                        border: '1px solid var(--border)',
                                                        background: 'var(--bg-main)',
                                                        fontSize: '11px',
                                                        cursor: 'pointer'
                                                    }}
                                                    title="Editar o ver antes de enviar"
                                                >
                                                    ✏️
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Services / Adicionales */}
                            <div style={{
                                padding: '10px 14px',
                                background: 'var(--bg-main)',
                                borderRadius: '12px',
                                border: '1px solid var(--border)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <label style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                                        ✨ Adicionales ({editableServices.length}):
                                    </label>
                                </div>

                                {editableServices.length > 0 ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        {editableServices.map((serviceItem, idx) => (
                                            <div
                                                key={idx}
                                                style={{
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    padding: '6px 10px',
                                                    borderRadius: '8px',
                                                    background: 'var(--bg-card)',
                                                    border: '1px solid var(--border)',
                                                    fontSize: '12px'
                                                }}
                                            >
                                                <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                                                    ✓ {serviceItem.name}
                                                </span>
                                                <span style={{ fontWeight: '700', color: 'var(--primary-paddle)' }}>
                                                    {serviceItem.price > 0 ? `+$${Number(serviceItem.price).toLocaleString('es-AR')}` : 'Incluido'}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                                        Sin adicionales contratados.
                                    </div>
                                )}
                            </div>

                            {/* Notes */}
                            {(notes || isEditing) && (
                                <div style={{
                                    padding: '10px 12px',
                                    background: 'rgba(245, 158, 11, 0.08)',
                                    borderRadius: '10px',
                                    border: '1px solid rgba(245, 158, 11, 0.25)',
                                    fontSize: '12px'
                                }}>
                                    <span style={{ fontWeight: '700', color: '#D97706', display: 'block', marginBottom: '4px' }}>
                                        📝 Notas / Observaciones:
                                    </span>
                                    {isEditing ? (
                                        <textarea
                                            rows="2"
                                            value={editableNotes}
                                            onChange={(e) => setEditableNotes(e.target.value)}
                                            placeholder="Observaciones de la reserva..."
                                            style={{
                                                width: '100%',
                                                padding: '6px 10px',
                                                borderRadius: '8px',
                                                border: '1px solid var(--border)',
                                                background: 'var(--bg-card)',
                                                color: 'var(--text-primary)',
                                                fontSize: '12px',
                                                outline: 'none',
                                                resize: 'vertical'
                                            }}
                                        />
                                    ) : (
                                        <span style={{ color: 'var(--text-primary)', whiteSpace: 'pre-wrap', lineHeight: '1.4' }}>
                                            {editableNotes || notes}
                                        </span>
                                    )}
                                </div>
                            )}

                            {/* Dynamic Payment Breakdown Card */}
                            <div style={{
                                padding: '12px 14px',
                                background: 'var(--bg-main)',
                                borderRadius: '12px',
                                border: '1px solid var(--border)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '10px'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '2px', fontWeight: '600' }}>Estado del Turno</label>
                                        <div style={{
                                            fontWeight: '800',
                                            color: booking.status === 'confirmed' ? '#00E676' :
                                                (booking.status === 'cancelled' ? '#ff4444' :
                                                    (booking.status === 'deposit_paid' ? '#F59E0B' : 'var(--text-primary)')),
                                            textTransform: 'uppercase',
                                            fontSize: '12px',
                                            letterSpacing: '0.3px'
                                        }}>
                                            {getStatusLabel(booking.status)}
                                        </div>
                                    </div>

                                    <div style={{ textAlign: 'right' }}>
                                        <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '2px', fontWeight: '600' }}>Precio Total</label>
                                        <div style={{ fontWeight: '800', color: 'var(--text-primary)', fontSize: '18px' }}>
                                            ${activePrice.toLocaleString('es-AR')}
                                        </div>
                                    </div>
                                </div>

                                <div style={{
                                    background: 'var(--bg-card)',
                                    padding: '10px 12px',
                                    borderRadius: '10px',
                                    border: '1px solid var(--border)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '4px',
                                    fontSize: '12px'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                                        <span>Alquiler cancha:</span>
                                        <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>${baseRentalPrice.toLocaleString('es-AR')}</span>
                                    </div>
                                    {editableServices.length > 0 && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                                            <span>+ Adicionales ({editableServices.length}):</span>
                                            <span style={{ fontWeight: '700', color: 'var(--primary-paddle)' }}>+${extrasSum.toLocaleString('es-AR')}</span>
                                        </div>
                                    )}
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        borderTop: '1px dashed var(--border)',
                                        paddingTop: '5px',
                                        marginTop: '3px',
                                        fontWeight: '800',
                                        fontSize: '13px'
                                    }}>
                                        <span>Total:</span>
                                        <span style={{ color: 'var(--text-primary)' }}>${activePrice.toLocaleString('es-AR')}</span>
                                    </div>
                                </div>

                                <div style={{
                                    paddingTop: '6px',
                                    display: 'grid',
                                    gridTemplateColumns: '1fr 1fr',
                                    gap: '8px',
                                    fontSize: '12px'
                                }}>
                                    <div>
                                        <span style={{ color: 'var(--text-secondary)', fontSize: '11px', display: 'block', marginBottom: '2px' }}>Seña:</span>
                                        <span style={{ fontWeight: '700', color: booking.status === 'deposit_paid' || booking.status === 'confirmed' ? '#F59E0B' : 'var(--text-primary)' }}>
                                            ${activeDeposit.toLocaleString('es-AR')}
                                        </span>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <span style={{ color: 'var(--text-secondary)', fontSize: '11px', display: 'block', marginBottom: '2px' }}>Saldo a Cobrar:</span>
                                        <span style={{ fontWeight: '700', color: booking.status === 'confirmed' ? '#00E676' : '#E11D48' }}>
                                            {booking.status === 'confirmed' || booking.status === 'completed' ? '$0 (Pagado Total)' : `$${pendingBalance.toLocaleString('es-AR')}`}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Shift History */}
                            <div style={{
                                padding: '8px 12px',
                                background: 'rgba(0,0,0,0.01)',
                                borderRadius: '12px',
                                fontSize: '11px',
                                border: '1px dashed var(--border)'
                            }}>
                                <div style={{ fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase', fontSize: '9px', letterSpacing: '0.5px' }}>Historial del Turno</div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <div style={{ borderLeft: '2px solid var(--primary-paddle)', paddingLeft: '8px', marginBottom: '2px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1px' }}>
                                            <span style={{ fontWeight: '700', color: 'var(--text-primary)' }}>Turno Creado</span>
                                            <span style={{ color: 'var(--text-secondary)', fontSize: '9px' }}>
                                                {booking.created_at ? new Date(booking.created_at).toLocaleString('es-AR') :
                                                    (booking.history?.find(h => h.action === 'creation')?.timestamp ?
                                                        new Date(booking.history.find(h => h.action === 'creation').timestamp).toLocaleString('es-AR') : '-')}
                                            </span>
                                        </div>
                                    </div>

                                    {booking.history && booking.history.filter(h => h.action !== 'creation').map((log, idx) => (
                                        <div key={idx} style={{ borderLeft: '2px solid var(--border)', paddingLeft: '8px', marginBottom: '2px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1px' }}>
                                                <span style={{ fontWeight: '700', color: 'var(--text-primary)' }}>{log.label}</span>
                                                <span style={{ color: 'var(--text-secondary)', fontSize: '9px' }}>
                                                    {new Date(log.timestamp).toLocaleString('es-AR')}
                                                </span>
                                            </div>
                                            {log.reason && (
                                                <div style={{ color: '#ff4444', fontStyle: 'italic', fontSize: '10px' }}>
                                                    Motivo: {log.reason}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Action Buttons Grid for Sports */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '4px' }}>
                                {(booking.status === 'pending' || booking.status === 'deposit_paid') && (
                                    <button
                                        onClick={() => booking.status === 'pending' && onAction('confirm_deposit')}
                                        disabled={booking.status === 'deposit_paid'}
                                        style={{
                                            padding: '10px 14px',
                                            borderRadius: '12px',
                                            border: booking.status === 'deposit_paid' ? '1px solid var(--border)' : 'none',
                                            background: booking.status === 'deposit_paid' ? 'rgba(0,0,0,0.06)' : '#F59E0B',
                                            color: booking.status === 'deposit_paid' ? 'var(--text-muted)' : 'white',
                                            fontWeight: '700',
                                            cursor: booking.status === 'deposit_paid' ? 'not-allowed' : 'pointer',
                                            opacity: booking.status === 'deposit_paid' ? 0.6 : 1,
                                            fontSize: '14px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '4px'
                                        }}
                                    >
                                        {booking.status === 'deposit_paid' ? '✓ Seña Confirmada' : 'Confirmar Seña'}
                                    </button>
                                )}
                                {(booking.status === 'pending' || booking.status === 'deposit_paid') && (
                                    <button
                                        onClick={() => onAction('confirm_booking')}
                                        disabled={booking.status === 'pending'}
                                        style={{
                                            padding: '10px 14px',
                                            borderRadius: '12px',
                                            border: booking.status === 'pending' ? '1px solid var(--border)' : 'none',
                                            background: booking.status === 'pending' ? 'rgba(0,0,0,0.06)' : 'var(--primary-paddle, #10B981)',
                                            color: booking.status === 'pending' ? 'var(--text-muted)' : 'white',
                                            fontWeight: '700',
                                            cursor: booking.status === 'pending' ? 'not-allowed' : 'pointer',
                                            opacity: booking.status === 'pending' ? 0.6 : 1,
                                            fontSize: '14px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '4px'
                                        }}
                                    >
                                        Confirmar Turno
                                    </button>
                                )}
                                {(booking.status === 'confirmed' || booking.status === 'attended') && (
                                    <button
                                        onClick={() => onAction('complete_booking')}
                                        style={{
                                            gridColumn: 'span 2',
                                            padding: '10px 14px',
                                            borderRadius: '12px',
                                            border: 'none',
                                            background: 'var(--primary-paddle, #10B981)',
                                            color: 'white',
                                            fontWeight: '700',
                                            cursor: 'pointer',
                                            fontSize: '14px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '6px'
                                        }}
                                    >
                                        <span>✓</span> Finalizar Turno
                                    </button>
                                )}
                                {booking.status !== 'cancelled' && booking.status !== 'completed' && (
                                    <button
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            onAction('cancel');
                                        }}
                                        style={{
                                            gridColumn: 'span 2',
                                            padding: '10px 14px',
                                            borderRadius: '12px',
                                            border: 'none',
                                            background: '#ff4444',
                                            color: 'white',
                                            fontWeight: '700',
                                            cursor: 'pointer',
                                            marginTop: '2px',
                                            fontSize: '14px'
                                        }}
                                    >
                                        Cancelar Reserva
                                    </button>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Custom Message Preview / Editor Modal */}
            {previewMessage && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0,0,0,0.7)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1100,
                        padding: '16px'
                    }}
                    onClick={() => setPreviewMessage(null)}
                >
                    <div
                        style={{
                            background: 'var(--bg-card)',
                            padding: '20px',
                            borderRadius: '16px',
                            width: '100%',
                            maxWidth: '500px',
                            boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
                            border: '1px solid var(--border)'
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '20px' }}>💬</span>
                                <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)' }}>
                                    Mensaje: {previewMessage.title}
                                </h4>
                            </div>
                            <button
                                onClick={() => setPreviewMessage(null)}
                                style={{ background: 'transparent', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--text-secondary)' }}
                            >
                                &times;
                            </button>
                        </div>

                        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                            Puedes editar el texto antes de enviarlo a <strong>{booking.customer_name || 'Cliente'}</strong> ({cleanPhone}):
                        </p>

                        <textarea
                            value={previewMessage.text}
                            onChange={(e) => setPreviewMessage(prev => ({ ...prev, text: e.target.value }))}
                            rows={6}
                            style={{
                                width: '100%',
                                padding: '10px 12px',
                                borderRadius: '10px',
                                border: '1px solid var(--border)',
                                background: 'var(--bg-main)',
                                color: 'var(--text-primary)',
                                fontSize: '13px',
                                lineHeight: '1.5',
                                resize: 'vertical',
                                marginBottom: '16px',
                                fontFamily: 'inherit'
                            }}
                        />

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                            <button
                                type="button"
                                onClick={() => setPreviewMessage(null)}
                                style={{
                                    padding: '8px 14px',
                                    borderRadius: '8px',
                                    border: '1px solid var(--border)',
                                    background: 'var(--bg-main)',
                                    color: 'var(--text-secondary)',
                                    fontSize: '13px',
                                    fontWeight: '600',
                                    cursor: 'pointer'
                                }}
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(previewMessage.text)}`, '_blank');
                                    setPreviewMessage(null);
                                }}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '8px 16px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    background: '#25D366',
                                    color: 'white',
                                    fontSize: '13px',
                                    fontWeight: '700',
                                    cursor: 'pointer',
                                    boxShadow: '0 2px 8px rgba(37, 211, 102, 0.3)'
                                }}
                            >
                                <span>📲</span> Enviar por WhatsApp
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Mount the content only while open so its hooks always run in the same order
const BookingDetailsModal = ({ isOpen, ...props }) => {
    if (!isOpen || !props.booking) return null;
    return <BookingDetailsModalContent {...props} />;
};

export default BookingDetailsModal;
