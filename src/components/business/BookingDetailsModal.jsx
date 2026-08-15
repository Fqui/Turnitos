import React, { useState, useEffect, useMemo } from 'react';

const BookingDetailsModal = ({
    isOpen,
    onClose,
    isMobile,
    booking,
    businesses,
    selectedBusinessId,
    onAction,
    formatDisplayDate,
    getStatusLabel
}) => {
    if (!isOpen || !booking) return null;

    const biz = businesses?.find(b => String(b.id) === String(selectedBusinessId || booking.business_id || booking.businessId));
    const isRental = biz?.type === 'venue' || biz?.type === 'alquiler' || (biz?.category || '').toLowerCase().includes('quincho') || (biz?.categories?.name || '').toLowerCase().includes('alquiler');

    // Durations
    const durationOptions = biz?.rental_duration_options || biz?.rentalDurationOptions || [];
    const hasMultipleDurations = Array.isArray(durationOptions) && durationOptions.length > 1;

    // Capacity limit
    const maxCapacity = Number(biz?.capacity_limit || biz?.capacity || 100);

    // Business Catalog Additionals
    const catalogAdditionals = useMemo(() => {
        const list = biz?.additional_services || biz?.additionalServices || [];
        return list.map(item => {
            if (typeof item === 'object' && item !== null) {
                return {
                    id: item.id || Math.random().toString(),
                    name: item.name || item.label || 'Adicional',
                    price: Number(item.price || 0)
                };
            }
            return {
                id: Math.random().toString(),
                name: String(item),
                price: 0
            };
        });
    }, [biz]);

    // Parse initial services from booking
    const parseBookingServices = (b) => {
        const raw = b?.selected_services || b?.selectedServices || b?.additional_services || b?.metadata?.selectedServices || [];
        if (!Array.isArray(raw)) {
            if (typeof raw === 'string' && raw.trim()) {
                const found = catalogAdditionals.find(cat => cat.name === raw.trim());
                return [{ name: raw.trim(), price: found ? found.price : 0 }];
            }
            return [];
        }
        return raw.map(s => {
            if (typeof s === 'object' && s !== null) {
                return {
                    name: s.name || s.label || s.title || 'Adicional',
                    price: Number(s.price || 0)
                };
            }
            const nameStr = String(s);
            const found = catalogAdditionals.find(cat => cat.name === nameStr);
            return {
                name: nameStr,
                price: found ? found.price : 0
            };
        });
    };

    const notes = booking.notes || booking.metadata?.notes || booking.comment || null;
    const email = booking.customer_email || booking.customerEmail || booking.email || null;
    const phone = booking.customer_phone || booking.customerPhone || '';
    const cleanPhone = phone.replace(/\D/g, '');

    // State for editing mode and values
    const [isEditing, setIsEditing] = useState(false);
    const [editablePrice, setEditablePrice] = useState(0);
    const [editableDeposit, setEditableDeposit] = useState(0);
    const [editableGuests, setEditableGuests] = useState('');
    const [editableServices, setEditableServices] = useState([]);
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

    // Custom additionals input state
    const [customExtraName, setCustomExtraName] = useState('');
    const [customExtraPrice, setCustomExtraPrice] = useState('');
    const [showAddExtraForm, setShowAddExtraForm] = useState(false);

    // WhatsApp Menu and Custom Message Modal State
    const [showWhatsappMenu, setShowWhatsappMenu] = useState(false);
    const [previewMessage, setPreviewMessage] = useState(null);

    // Calculate default deposit if missing
    const defaultTotalPrice = Number(booking.price || booking.total_price || booking.totalPrice || 0);
    const paymentSettings = biz?.payment_settings || biz?.paymentSettings || {};
    const depositSettings = paymentSettings.deposit || { enabled: false, type: 'percentage', percentage: 30, fixed_amount: 0 };

    let calculatedDefaultDeposit = Number(booking.deposit_amount || booking.depositAmount || booking.metadata?.deposit_amount || booking.metadata?.depositAmount || 0);
    if (!calculatedDefaultDeposit) {
        if (depositSettings.enabled) {
            if (depositSettings.type === 'percentage') {
                calculatedDefaultDeposit = Math.round((defaultTotalPrice * (depositSettings.percentage || 30)) / 100);
            } else {
                calculatedDefaultDeposit = depositSettings.fixed_amount || depositSettings.fixedAmount || 0;
            }
        } else {
            calculatedDefaultDeposit = Math.round(defaultTotalPrice * 0.3);
        }
    }

    const currentGuests = booking.guest_count || booking.guestCount || booking.metadata?.guestCount || booking.guests || '';

    // Initialize or sync state when booking changes
    useEffect(() => {
        setEditablePrice(defaultTotalPrice);
        setEditableDeposit(calculatedDefaultDeposit);
        setEditableGuests(currentGuests ? String(currentGuests) : '');
        setEditableServices(parseBookingServices(booking));
        setIsEditing(false);
        setIsSaving(false);
        setSaveSuccess(false);
        setShowAddExtraForm(false);
        setShowWhatsappMenu(false);
        setPreviewMessage(null);
    }, [booking?.id, defaultTotalPrice, calculatedDefaultDeposit, currentGuests]);

    const activePrice = Number(editablePrice) || 0;
    const activeDeposit = Number(editableDeposit) || 0;
    const pendingBalance = activePrice - activeDeposit > 0 ? activePrice - activeDeposit : 0;
    const extrasSum = editableServices.reduce((sum, item) => sum + Number(item.price || 0), 0);
    const baseRentalPrice = Math.max(0, activePrice - extrasSum);

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
            .replace(/{adicionales}/gi, extrasStr);
    };

    const handleSendWhatsapp = (templateType) => {
        if (!cleanPhone) {
            alert('El cliente no tiene un teléfono válido registrado');
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
        if (existsIndex >= 0) {
            const removedPrice = Number(editableServices[existsIndex].price || 0);
            updated = editableServices.filter((_, idx) => idx !== existsIndex);
            setEditableServices(updated);
            // Deduct from total price
            const newTotal = Math.max(0, activePrice - removedPrice);
            setEditablePrice(newTotal);
        } else {
            const addedPrice = Number(catalogItem.price || 0);
            updated = [...editableServices, { name: catalogItem.name, price: addedPrice }];
            setEditableServices(updated);
            // Add to total price
            setEditablePrice(activePrice + addedPrice);
        }
    };

    const handleAddCustomExtra = (e) => {
        e?.preventDefault?.();
        if (!customExtraName.trim()) return;

        const priceNum = parseFloat(customExtraPrice) || 0;
        const updated = [...editableServices, { name: customExtraName.trim(), price: priceNum }];
        setEditableServices(updated);
        setEditablePrice(activePrice + priceNum);

        setCustomExtraName('');
        setCustomExtraPrice('');
        setShowAddExtraForm(false);
    };

    const handleRemoveExtra = (index) => {
        const removedPrice = Number(editableServices[index]?.price || 0);
        const updated = editableServices.filter((_, idx) => idx !== index);
        setEditableServices(updated);
        setEditablePrice(Math.max(0, activePrice - removedPrice));
    };

    const handleEditExtraPrice = (index, newPrice) => {
        const priceNum = parseFloat(newPrice) || 0;
        const oldPrice = Number(editableServices[index]?.price || 0);
        const diff = priceNum - oldPrice;

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
        if (editableGuests) {
            const numGuests = parseInt(editableGuests, 10);
            if (isNaN(numGuests) || numGuests < 1) {
                alert('La cantidad de personas debe ser mayor a 0');
                return;
            }
            if (numGuests > maxCapacity) {
                alert(`La cantidad de personas (${numGuests}) supera el límite de capacidad de este establecimiento (${maxCapacity} personas)`);
                return;
            }
        }

        try {
            setIsSaving(true);
            const extrasSum = editableServices.reduce((sum, item) => sum + Number(item.price || 0), 0);

            const updatePayload = {
                price: activePrice,
                total_price: activePrice,
                deposit_amount: activeDeposit,
                guest_count: editableGuests ? parseInt(editableGuests, 10) : null,
                selected_services: editableServices,
                services_total: extrasSum
            };

            await onAction('update_booking', updatePayload);

            setIsSaving(false);
            setIsEditing(false);
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
        } catch (err) {
            console.error('Error saving booking changes:', err);
            setIsSaving(false);
            alert('Error al guardar los cambios en la reserva');
        }
    };

    const handleCancelEdit = () => {
        setEditablePrice(defaultTotalPrice);
        setEditableDeposit(calculatedDefaultDeposit);
        setEditableGuests(currentGuests ? String(currentGuests) : '');
        setEditableServices(parseBookingServices(booking));
        setIsEditing(false);
        setShowAddExtraForm(false);
    };

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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '20px' }}>📋</span>
                        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)' }}>
                            Detalle de Reserva
                        </h3>
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
                                    padding: '5px 10px',
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
                                        padding: '5px 10px',
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
                                        padding: '5px 12px',
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
                    {/* Top Grid: Date + Guests + Optional Duration */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: hasMultipleDurations ? 'repeat(3, 1fr)' : '1fr 1fr',
                        gap: '8px',
                        padding: '10px 14px',
                        background: 'var(--bg-main)',
                        borderRadius: '12px',
                        border: '1px solid var(--border)'
                    }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '2px', fontWeight: '600' }}>📅 Fecha</label>
                            <div style={{ fontWeight: '700', color: 'var(--text-primary)', fontSize: isMobile ? '13px' : '14px' }}>{formatDisplayDate(booking.date)}</div>
                        </div>

                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                                <label style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '600' }}>👥 {isRental ? 'Invitados' : 'Personas'}</label>
                                {isEditing && (
                                    <span style={{ fontSize: '10px', color: 'var(--primary-paddle)', fontWeight: '700' }}>
                                        Máx: {maxCapacity}
                                    </span>
                                )}
                            </div>
                            {isEditing ? (
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
                                        maxWidth: '120px',
                                        padding: '3px 8px',
                                        borderRadius: '6px',
                                        border: '1px solid var(--border)',
                                        fontSize: '13px',
                                        fontWeight: '700',
                                        background: 'var(--bg-card)',
                                        color: 'var(--text-primary)'
                                    }}
                                />
                            ) : (
                                <div style={{ fontWeight: '700', color: 'var(--text-primary)', fontSize: isMobile ? '13px' : '14px' }}>
                                    {editableGuests ? `${editableGuests} pers.` : 'No espec.'}
                                </div>
                            )}
                        </div>

                        {hasMultipleDurations && (
                            <div>
                                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '2px', fontWeight: '600' }}>🕒 Duración</label>
                                <div style={{ fontWeight: '700', color: 'var(--text-primary)', fontSize: isMobile ? '13px' : '14px' }}>
                                    {(!booking.time || booking.time === '00:00' || booking.time === '00:00:00')
                                        ? (booking.metadata?.duration || booking.duration ? `${booking.metadata?.duration || (booking.duration / 60)} hs` : 'Jornada')
                                        : `${booking.time} hs`}
                                </div>
                            </div>
                        )}
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
                                    title="Abrir WhatsApp directo con el cliente (sin texto)"
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

                                    <div style={{ display: 'flex', gap: '4px' }}>
                                        <button
                                            type="button"
                                            onClick={() => handleSendWhatsapp('recordatorio_saldo')}
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
                                            ⏰ <strong>Recordatorio Saldo</strong>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleOpenPreview('recordatorio_saldo', 'Recordatorio de Saldo')}
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
                                            onClick={() => handleSendWhatsapp('ubicacion')}
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
                                            📍 <strong>Enviar Ubicación</strong>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleOpenPreview('ubicacion', 'Ubicación')}
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

                    {/* Interactive Additional Services Section with Full CRUD */}
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
                            {isEditing && (
                                <button
                                    onClick={() => setShowAddExtraForm(!showAddExtraForm)}
                                    style={{
                                        padding: '2px 8px',
                                        borderRadius: '6px',
                                        border: '1px solid var(--primary-paddle)',
                                        background: 'rgba(0, 230, 118, 0.1)',
                                        color: 'var(--primary-paddle)',
                                        fontSize: '11px',
                                        fontWeight: '700',
                                        cursor: 'pointer'
                                    }}
                                >
                                    {showAddExtraForm ? '✕ Cerrar' : '+ Adicional Extra'}
                                </button>
                            )}
                        </div>

                        {/* Catalog selection in edit mode */}
                        {isEditing && catalogAdditionals.length > 0 && (
                            <div style={{ paddingBottom: '4px', borderBottom: '1px dashed var(--border)' }}>
                                <span style={{ fontSize: '10px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                    Adicionales del catálogo:
                                </span>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                    {catalogAdditionals.map((catItem, idx) => {
                                        const isSelected = editableServices.some(s => s.name.toLowerCase() === catItem.name.toLowerCase());
                                        return (
                                            <button
                                                key={idx}
                                                type="button"
                                                onClick={() => handleToggleCatalogExtra(catItem)}
                                                style={{
                                                    padding: '3px 8px',
                                                    borderRadius: '6px',
                                                    border: isSelected ? '1px solid var(--primary-paddle)' : '1px solid var(--border)',
                                                    background: isSelected ? 'rgba(0, 230, 118, 0.15)' : 'var(--bg-card)',
                                                    color: isSelected ? 'var(--primary-paddle)' : 'var(--text-primary)',
                                                    fontSize: '10px',
                                                    fontWeight: isSelected ? '700' : '500',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                {isSelected ? '✓ ' : '+ '}
                                                {catItem.name} {catItem.price > 0 && `($${catItem.price})`}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Custom Extra Form */}
                        {isEditing && showAddExtraForm && (
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: isMobile ? '1fr 1fr auto' : '2fr 1fr auto',
                                gap: '6px',
                                padding: '8px',
                                background: 'var(--bg-card)',
                                borderRadius: '8px',
                                border: '1px dashed var(--primary-paddle)'
                            }}>
                                <input
                                    type="text"
                                    value={customExtraName}
                                    onChange={(e) => setCustomExtraName(e.target.value)}
                                    placeholder="Nombre adicional"
                                    style={{
                                        padding: '4px 8px',
                                        borderRadius: '6px',
                                        border: '1px solid var(--border)',
                                        background: 'var(--bg-main)',
                                        color: 'var(--text-primary)',
                                        fontSize: '11px'
                                    }}
                                />
                                <input
                                    type="number"
                                    value={customExtraPrice}
                                    onChange={(e) => setCustomExtraPrice(e.target.value)}
                                    placeholder="Precio ($)"
                                    min="0"
                                    style={{
                                        padding: '4px 8px',
                                        borderRadius: '6px',
                                        border: '1px solid var(--border)',
                                        background: 'var(--bg-main)',
                                        color: 'var(--text-primary)',
                                        fontSize: '11px'
                                    }}
                                />
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
                                    Agregar
                                </button>
                            </div>
                        )}

                        {/* Services List Display / Editing */}
                        {editableServices.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {editableServices.map((serviceItem, idx) => (
                                    <div
                                        key={idx}
                                        style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            padding: '4px 8px',
                                            borderRadius: '6px',
                                            background: 'var(--bg-card)',
                                            border: '1px solid var(--border)',
                                            fontSize: '12px'
                                        }}
                                    >
                                        <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                                            ✓ {serviceItem.name}
                                        </span>

                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            {isEditing ? (
                                                <>
                                                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>$</span>
                                                    <input
                                                        type="number"
                                                        value={serviceItem.price}
                                                        onChange={(e) => handleEditExtraPrice(idx, e.target.value)}
                                                        min="0"
                                                        style={{
                                                            width: '70px',
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
                                                    color: Number(serviceItem.price) > 0 ? 'var(--primary-paddle)' : 'var(--text-secondary)',
                                                    fontSize: '12px'
                                                }}>
                                                    {Number(serviceItem.price) > 0 ? `+$${serviceItem.price}` : 'Incluido'}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                                Sin adicionales contratados.
                            </div>
                        )}
                    </div>

                    {/* Notes if available */}
                    {notes && (
                        <div style={{
                            padding: '8px 12px',
                            background: 'rgba(245, 158, 11, 0.08)',
                            borderRadius: '10px',
                            border: '1px solid rgba(245, 158, 11, 0.25)',
                            fontSize: '11px'
                        }}>
                            <span style={{ fontWeight: '700', color: '#D97706', display: 'block', marginBottom: '1px' }}>📝 Notas / Observaciones:</span>
                            <span style={{ color: 'var(--text-primary)' }}>{notes}</span>
                        </div>
                    )}

                    {/* Dynamic Payment Breakdown & Transparent Price Calculation Card */}
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
                                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '2px', fontWeight: '600' }}>Estado del Pago</label>
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

                            <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '2px', fontWeight: '600' }}>Precio Total</label>
                                    {isEditing ? (
                                        <input
                                            type="number"
                                            value={editablePrice}
                                            onChange={(e) => setEditablePrice(e.target.value)}
                                            style={{
                                                width: '95px',
                                                padding: '4px 8px',
                                                borderRadius: '6px',
                                                border: '1px solid var(--border)',
                                                fontSize: '14px',
                                                fontWeight: '700',
                                                background: 'var(--bg-card)',
                                                color: 'var(--text-primary)'
                                            }}
                                        />
                                    ) : (
                                        <div style={{ fontWeight: '800', color: 'var(--text-primary)', fontSize: '18px' }}>${activePrice.toLocaleString('es-AR')}</div>
                                    )}
                                </div>
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
                            gap: '4px',
                            fontSize: '12px'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                                <span>Alquiler base ({editableGuests ? `${editableGuests} personas` : (isRental ? 'Espacio' : 'Servicio')}):</span>
                                <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>${baseRentalPrice.toLocaleString('es-AR')}</span>
                            </div>
                            {editableServices.length > 0 && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                                    <span>+ Adicionales ({editableServices.length}):</span>
                                    <span style={{ fontWeight: '700', color: 'var(--primary-paddle, #84CC16)' }}>+${extrasSum.toLocaleString('es-AR')}</span>
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

                        {/* Detailed payment breakdown with editable deposit */}
                        <div style={{
                            paddingTop: '6px',
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: '8px',
                            fontSize: '12px'
                        }}>
                            <div>
                                <span style={{ color: 'var(--text-secondary)', fontSize: '11px', display: 'block', marginBottom: '2px' }}>Seña (Requerida / Depositada):</span>
                                {isEditing ? (
                                    <input
                                        type="number"
                                        value={editableDeposit}
                                        onChange={(e) => setEditableDeposit(e.target.value)}
                                        style={{
                                            width: '95px',
                                            padding: '4px 8px',
                                            borderRadius: '6px',
                                            border: '1px solid var(--border)',
                                            fontSize: '13px',
                                            fontWeight: '700',
                                            background: 'var(--bg-card)',
                                            color: 'var(--text-primary)'
                                        }}
                                    />
                                ) : (
                                    <span style={{ fontWeight: '700', color: booking.status === 'deposit_paid' || booking.status === 'confirmed' ? '#F59E0B' : 'var(--text-primary)' }}>
                                        ${activeDeposit.toLocaleString('es-AR')}
                                    </span>
                                )}
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <span style={{ color: 'var(--text-secondary)', fontSize: '11px', display: 'block', marginBottom: '2px' }}>Saldo a Cobrar al Ingresar:</span>
                                <span style={{ fontWeight: '700', color: booking.status === 'confirmed' ? '#00E676' : '#E11D48' }}>
                                    {booking.status === 'confirmed' || booking.status === 'completed' ? '$0 (Pagado Total)' : `$${pendingBalance.toLocaleString('es-AR')}`}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Compact Shift History */}
                    <div style={{
                        padding: '8px 12px',
                        background: 'rgba(0,0,0,0.01)',
                        borderRadius: '12px',
                        fontSize: '11px',
                        border: '1px dashed var(--border)'
                    }}>
                        <div style={{ fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase', fontSize: '9px', letterSpacing: '0.5px' }}>Historial de la Reserva</div>
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

                    {/* Action Buttons Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '4px' }}>
                        {booking.status === 'blocked' ? (
                            <button
                                onClick={() => onAction('unblock')}
                                style={{
                                    gridColumn: 'span 2',
                                    padding: '10px 14px',
                                    borderRadius: '12px',
                                    border: 'none',
                                    background: 'var(--primary-paddle)',
                                    color: 'white',
                                    fontWeight: '700',
                                    cursor: 'pointer',
                                    fontSize: '14px'
                                }}
                            >
                                Desbloquear Fecha
                            </button>
                        ) : (
                            <>
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
                                {booking.status === 'confirmed' && (
                                    <button
                                        onClick={() => onAction('confirm_attendance')}
                                        style={{
                                            padding: '10px 14px',
                                            borderRadius: '12px',
                                            border: 'none',
                                            background: 'var(--primary-paddle)',
                                            color: 'white',
                                            fontWeight: '700',
                                            cursor: 'pointer',
                                            fontSize: '14px'
                                        }}
                                    >
                                        Confirmar Asistencia
                                    </button>
                                )}
                                {booking.status === 'attended' && (
                                    <button
                                        onClick={() => onAction('complete_booking')}
                                        style={{
                                            padding: '10px 14px',
                                            borderRadius: '12px',
                                            border: 'none',
                                            background: '#00E676',
                                            color: 'white',
                                            fontWeight: '700',
                                            cursor: 'pointer',
                                            fontSize: '14px'
                                        }}
                                    >
                                        Finalizar Turno
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
                                            gridColumn: (booking.status === 'attended' || booking.status === 'confirmed') ? 'auto' : 'span 2',
                                            padding: '10px 14px',
                                            borderRadius: '12px',
                                            border: 'none',
                                            background: '#ff4444',
                                            color: 'white',
                                            fontWeight: '700',
                                            cursor: 'pointer',
                                            marginTop: (booking.status === 'attended' || booking.status === 'confirmed') ? '0' : '4px',
                                            fontSize: '14px'
                                        }}
                                    >
                                        Cancelar Reserva
                                    </button>
                                )}
                            </>
                        )}
                    </div>
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

export default BookingDetailsModal;
