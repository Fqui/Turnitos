import React, { useMemo, useEffect, useState } from 'react';

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
    const [customExtraName, setCustomExtraName] = useState('');
    const [customExtraPrice, setCustomExtraPrice] = useState('');
    const [showAddCustomExtra, setShowAddCustomExtra] = useState(false);

    // Reset specialist & custom fields when modal closes
    useEffect(() => {
        if (!isOpen) {
            setCustomExtraName('');
            setCustomExtraPrice('');
            setShowAddCustomExtra(false);
        }
    }, [isOpen]);

    // Calculate available resources for sport/service businesses
    const availableResources = useMemo(() => {
        if (!newBookingData.date || !newBookingData.time || !currentBusiness) return { services: [], courts: [] };

        const selectedDate = newBookingData.date;
        const selectedTime = newBookingData.time;

        const timeToMinutes = (t) => {
            const [h, m] = t.split(':').map(Number);
            return h * 60 + m;
        };
        const startMinutes = timeToMinutes(selectedTime);

        const isTimeBlocked = (resourceId, resourceType, duration) => {
            const endMinutes = startMinutes + duration;

            const resourceBookings = bookings.filter(b => {
                let bDate = b.date;
                if (b.date.includes('/')) {
                    const [d, m, y] = b.date.split('/');
                    bDate = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
                }
                if (bDate !== selectedDate) return false;
                if (b.status === 'cancelled') return false;

                if (b.status === 'blocked' && !b.court_id && !b.service_id) {
                    return true;
                }

                if (resourceType === 'court') {
                    return b.court_id === resourceId;
                } else {
                    return b.service_id === resourceId;
                }
            });

            return resourceBookings.some(b => {
                const bStart = timeToMinutes(b.time);
                const bDuration = b.duration || 60;
                const bEnd = bStart + bDuration;
                return (startMinutes < bEnd) && (endMinutes > bStart);
            });
        };

        const availableCourts = (currentBusiness.courts || []).filter(court => {
            const duration = court.duration || 60;
            return !isTimeBlocked(court.id, 'court', duration);
        });

        const availableServices = (currentBusiness.services || []).filter(service => {
            const duration = service.duration || 30;
            const specialistIds = service.service_specialists?.map(ss => ss.specialist_id) || [];

            if (specialistIds.length === 0) {
                return !isTimeBlocked(service.id, 'service', duration);
            }

            const freeSpecialistFound = specialistIds.some(specId => {
                const specialistBookings = bookings.filter(b => {
                    let bDate = b.date;
                    if (b.date.includes('/')) {
                        const [d, m, y] = b.date.split('/');
                        bDate = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
                    }
                    if (bDate !== selectedDate) return false;
                    if (b.status === 'cancelled') return false;
                    return b.specialist_id === specId;
                });

                const isSpecialistBusy = specialistBookings.some(b => {
                    const bStart = timeToMinutes(b.time);
                    const bDuration = b.duration || 60;
                    const bEnd = bStart + bDuration;
                    return (startMinutes < bEnd) && ((startMinutes + duration) > bStart);
                });

                return !isSpecialistBusy;
            });

            return freeSpecialistFound;
        });

        return {
            courts: availableCourts,
            services: availableServices
        };
    }, [newBookingData.date, newBookingData.time, currentBusiness, bookings]);

    // Available specialists for selected service
    const availableSpecialistsForSelectedService = useMemo(() => {
        if (!newBookingData.serviceId || !currentBusiness) return [];

        const service = currentBusiness.services?.find(s => s.id === newBookingData.serviceId);
        if (!service) return [];

        if (currentBusiness.courts?.some(c => c.id === newBookingData.serviceId)) return [];

        const specialistIds = service.service_specialists?.map(ss => ss.specialist_id) || [];
        if (specialistIds.length === 0) return [];

        const selectedDate = newBookingData.date;
        const selectedTime = newBookingData.time;
        const timeToMinutes = (t) => {
            const [h, m] = t.split(':').map(Number);
            return h * 60 + m;
        };
        const startMinutes = timeToMinutes(selectedTime);
        const duration = service.duration || 30;

        return specialistIds.map(specId => {
            return currentBusiness.specialists?.find(s => s.id === specId);
        }).filter(specialist => {
            if (!specialist) return false;
            const specialistBookings = bookings.filter(b => {
                let bDate = b.date;
                if (b.date.includes('/')) {
                    const [d, m, y] = b.date.split('/');
                    bDate = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
                }
                if (bDate !== selectedDate) return false;
                if (b.status === 'cancelled') return false;
                return b.specialist_id === specialist.id;
            });

            const isBusy = specialistBookings.some(b => {
                const bStart = timeToMinutes(b.time);
                const bDuration = b.duration || 60;
                const bEnd = bStart + bDuration;
                return (startMinutes < bEnd) && ((startMinutes + duration) > bStart);
            });

            return !isBusy;
        });
    }, [newBookingData.serviceId, newBookingData.date, newBookingData.time, currentBusiness, bookings]);

    // Auto-select single specialist
    useEffect(() => {
        if (availableSpecialistsForSelectedService.length === 1) {
            setNewBookingData(prev => {
                if (prev.specialistId !== availableSpecialistsForSelectedService[0].id) {
                    return { ...prev, specialistId: availableSpecialistsForSelectedService[0].id };
                }
                return prev;
            });
        } else if (availableSpecialistsForSelectedService.length === 0) {
            setNewBookingData(prev => {
                if (prev.specialistId) return { ...prev, specialistId: null };
                return prev;
            });
        }
    }, [availableSpecialistsForSelectedService]);

    // Detect if venue rental
    const isRental = currentBusiness?.type === 'venue' ||
        currentBusiness?.type === 'alquiler' ||
        (currentBusiness?.category || '').toLowerCase().includes('quincho') ||
        (currentBusiness?.categories?.name || '').toLowerCase().includes('alquiler') ||
        (!currentBusiness?.courts?.length && !currentBusiness?.services?.length);

    const durationOptions = currentBusiness?.rental_duration_options || currentBusiness?.rentalDurationOptions || [];
    const hasMultipleDurations = Array.isArray(durationOptions) && durationOptions.length > 1;

    // Capacity limit
    const maxCapacity = Number(currentBusiness?.capacity_limit || currentBusiness?.capacity || 100);

    // Business predefined catalog additionals
    const catalogAdditionals = useMemo(() => {
        const list = currentBusiness?.additional_services || currentBusiness?.additionalServices || [];
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
    }, [currentBusiness]);

    // Normalized selected services list
    const selectedAdditionals = useMemo(() => {
        const raw = newBookingData.selectedServices || [];
        return raw.map(item => {
            if (typeof item === 'object' && item !== null) {
                return {
                    name: item.name || item.label || 'Adicional',
                    price: Number(item.price || 0)
                };
            }
            // If it's string, look up in catalog
            const found = catalogAdditionals.find(cat => cat.name === item);
            return {
                name: String(item),
                price: found ? found.price : 0
            };
        });
    }, [newBookingData.selectedServices, catalogAdditionals]);

    // Auto-set default base price for rental when modal opens
    useEffect(() => {
        if (isOpen && isRental) {
            const defaultBase = Number(currentBusiness?.base_price || currentBusiness?.price || currentBusiness?.pricing_tiers?.[0]?.price || 0);
            if ((!newBookingData.price || Number(newBookingData.price) === 0) && defaultBase > 0) {
                const extrasTotal = selectedAdditionals.reduce((sum, item) => sum + Number(item.price || 0), 0);
                const total = defaultBase + extrasTotal;
                setNewBookingData(prev => ({
                    ...prev,
                    basePrice: defaultBase,
                    price: total,
                    depositAmount: Math.round(total * 0.3)
                }));
            }
        }
    }, [isOpen, isRental, currentBusiness]);

    // Helpers to update additionals and recalculate totals
    const updateSelectedServices = (updatedList) => {
        const extrasTotal = updatedList.reduce((sum, item) => sum + Number(item.price || 0), 0);
        const base = Number(newBookingData.basePrice || currentBusiness?.base_price || currentBusiness?.price || currentBusiness?.pricing_tiers?.[0]?.price || 0);
        const newTotal = base + extrasTotal;
        const newDeposit = Math.round(newTotal * 0.3);

        setNewBookingData(prev => ({
            ...prev,
            selectedServices: updatedList,
            servicesTotal: extrasTotal,
            price: newTotal,
            depositAmount: newDeposit
        }));
    };

    const handleToggleCatalogExtra = (catalogItem) => {
        const existsIndex = selectedAdditionals.findIndex(item => item.name.toLowerCase() === catalogItem.name.toLowerCase());
        let updated;
        if (existsIndex >= 0) {
            updated = selectedAdditionals.filter((_, idx) => idx !== existsIndex);
        } else {
            updated = [...selectedAdditionals, { name: catalogItem.name, price: Number(catalogItem.price || 0) }];
        }
        updateSelectedServices(updated);
    };

    const handleAddCustomExtra = (e) => {
        e?.preventDefault?.();
        if (!customExtraName.trim()) return;

        const priceNum = parseFloat(customExtraPrice) || 0;
        const updated = [...selectedAdditionals, { name: customExtraName.trim(), price: priceNum }];
        updateSelectedServices(updated);

        setCustomExtraName('');
        setCustomExtraPrice('');
        setShowAddCustomExtra(false);
    };

    const handleRemoveExtra = (index) => {
        const updated = selectedAdditionals.filter((_, idx) => idx !== index);
        updateSelectedServices(updated);
    };

    const handleEditExtraPrice = (index, newPrice) => {
        const priceNum = parseFloat(newPrice) || 0;
        const updated = selectedAdditionals.map((item, idx) => {
            if (idx === index) {
                return { ...item, price: priceNum };
            }
            return item;
        });
        updateSelectedServices(updated);
    };

    if (!isOpen) return null;

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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '20px' }}>✨</span>
                        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)' }}>
                            Crear Nueva Reserva Manual
                        </h3>
                    </div>
                    <button onClick={onClose} style={{ background: 'transparent', border: 'none', fontSize: '24px', cursor: 'pointer', color: 'var(--text-secondary)' }}>&times;</button>
                </div>

                <form onSubmit={onSubmit} style={{ display: 'grid', gap: '14px' }}>
                    {/* Date & Time / Duration Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: hasMultipleDurations ? '1fr 1fr' : '1fr', gap: '10px' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)' }}>📅 Fecha</label>
                            <input
                                type="text"
                                value={newBookingData.date}
                                disabled
                                style={{
                                    width: '100%',
                                    padding: '10px 12px',
                                    borderRadius: '10px',
                                    border: '1px solid var(--border)',
                                    background: 'var(--bg-main)',
                                    color: 'var(--text-primary)',
                                    fontSize: '13px',
                                    fontWeight: '600'
                                }}
                            />
                        </div>

                        {hasMultipleDurations && (
                            <div>
                                <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                                    🕒 Duración
                                </label>
                                <input
                                    type="text"
                                    value={newBookingData.time && newBookingData.time !== '00:00' ? `${newBookingData.time} hs` : 'Jornada Completa'}
                                    disabled
                                    style={{
                                        width: '100%',
                                        padding: '10px 12px',
                                        borderRadius: '10px',
                                        border: '1px solid var(--border)',
                                        background: 'var(--bg-main)',
                                        color: 'var(--text-primary)',
                                        fontSize: '13px',
                                        fontWeight: '600'
                                    }}
                                />
                            </div>
                        )}
                    </div>

                    {/* Customer Info */}
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '10px' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)' }}>👤 Nombre y Apellido *</label>
                            <input
                                type="text"
                                value={newBookingData.customerName || ''}
                                onChange={(e) => setNewBookingData({ ...newBookingData, customerName: e.target.value })}
                                required
                                placeholder="Juan Pérez"
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
                            <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)' }}>📱 Teléfono / WhatsApp *</label>
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

                    {/* Venue / Rental Fields */}
                    {isRental ? (
                        <>
                            {/* Guests Count with Max Capacity Limit */}
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                    <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                                        👥 Personas / Invitados
                                    </label>
                                    <span style={{
                                        fontSize: '11px',
                                        fontWeight: '700',
                                        color: 'var(--primary-paddle)',
                                        background: 'rgba(0, 230, 118, 0.12)',
                                        padding: '2px 8px',
                                        borderRadius: '6px',
                                        border: '1px solid rgba(0, 230, 118, 0.25)'
                                    }}>
                                        Capacidad Máx: {maxCapacity} personas
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
                                    placeholder={`Ej. 35 (Límite: ${maxCapacity})`}
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

                            {/* Additional Services CRUD Component */}
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
                                    <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span>✨</span> Adicionales de la Reserva ({selectedAdditionals.length})
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => setShowAddCustomExtra(!showAddCustomExtra)}
                                        style={{
                                            padding: '4px 8px',
                                            borderRadius: '6px',
                                            border: '1px solid var(--primary-paddle)',
                                            background: 'rgba(0, 230, 118, 0.1)',
                                            color: 'var(--primary-paddle)',
                                            fontSize: '11px',
                                            fontWeight: '700',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        {showAddCustomExtra ? '✕ Cancelar' : '+ Agregar Extra'}
                                    </button>
                                </div>

                                {/* Catalog Quick-Add Chips */}
                                {catalogAdditionals.length > 0 && (
                                    <div>
                                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                                            Catálogo del establecimiento (click para sumar/quitar):
                                        </span>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                            {catalogAdditionals.map((catItem, idx) => {
                                                const isSelected = selectedAdditionals.some(s => s.name.toLowerCase() === catItem.name.toLowerCase());
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
                                                            fontWeight: isSelected ? '700' : '500',
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '4px',
                                                            transition: 'all 0.15s'
                                                        }}
                                                    >
                                                        <span>{isSelected ? '✓' : '+'}</span>
                                                        <span>{catItem.name}</span>
                                                        {catItem.price > 0 && <span style={{ opacity: 0.8 }}>(${catItem.price})</span>}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Form for adding custom extra */}
                                {showAddCustomExtra && (
                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: isMobile ? '1fr 1fr auto' : '2fr 1fr auto',
                                        gap: '6px',
                                        padding: '10px',
                                        background: 'var(--bg-card)',
                                        borderRadius: '10px',
                                        border: '1px dashed var(--primary-paddle)',
                                        alignItems: 'center'
                                    }}>
                                        <input
                                            type="text"
                                            value={customExtraName}
                                            onChange={(e) => setCustomExtraName(e.target.value)}
                                            placeholder="Nombre del adicional (ej. Hielo)"
                                            style={{
                                                padding: '6px 10px',
                                                borderRadius: '6px',
                                                border: '1px solid var(--border)',
                                                background: 'var(--bg-main)',
                                                color: 'var(--text-primary)',
                                                fontSize: '12px'
                                            }}
                                        />
                                        <input
                                            type="number"
                                            value={customExtraPrice}
                                            onChange={(e) => setCustomExtraPrice(e.target.value)}
                                            placeholder="Precio ($)"
                                            min="0"
                                            style={{
                                                padding: '6px 10px',
                                                borderRadius: '6px',
                                                border: '1px solid var(--border)',
                                                background: 'var(--bg-main)',
                                                color: 'var(--text-primary)',
                                                fontSize: '12px'
                                            }}
                                        />
                                        <button
                                            type="button"
                                            onClick={handleAddCustomExtra}
                                            style={{
                                                padding: '6px 12px',
                                                borderRadius: '6px',
                                                border: 'none',
                                                background: 'var(--primary-paddle)',
                                                color: 'white',
                                                fontSize: '12px',
                                                fontWeight: '700',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            Sumar
                                        </button>
                                    </div>
                                )}

                                {/* Selected Additionals List with Inline Price Edit & Remove */}
                                {selectedAdditionals.length > 0 ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '2px' }}>
                                        {selectedAdditionals.map((item, idx) => (
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
                                                <span style={{ fontWeight: '600', color: 'var(--text-primary)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    ✓ {item.name}
                                                </span>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <span style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>$</span>
                                                    <input
                                                        type="number"
                                                        value={item.price}
                                                        onChange={(e) => handleEditExtraPrice(idx, e.target.value)}
                                                        min="0"
                                                        style={{
                                                            width: '75px',
                                                            padding: '3px 6px',
                                                            borderRadius: '6px',
                                                            border: '1px solid var(--border)',
                                                            background: 'var(--bg-main)',
                                                            color: 'var(--text-primary)',
                                                            fontSize: '12px',
                                                            fontWeight: '700',
                                                            textAlign: 'right'
                                                        }}
                                                        title="Editar precio de este adicional"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveExtra(idx)}
                                                        style={{
                                                            background: 'transparent',
                                                            border: 'none',
                                                            color: '#ff4444',
                                                            fontSize: '14px',
                                                            cursor: 'pointer',
                                                            padding: '2px 4px'
                                                        }}
                                                        title="Quitar adicional"
                                                    >
                                                        🗑️
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                                        Sin adicionales seleccionados.
                                    </div>
                                )}
                            </div>

                            {/* Optional Customer Email */}
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

                            {/* Notes */}
                            <div>
                                <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                                    📝 Notas / Observaciones
                                </label>
                                <textarea
                                    rows="2"
                                    value={newBookingData.notes || ''}
                                    onChange={(e) => setNewBookingData({ ...newBookingData, notes: e.target.value })}
                                    placeholder="Ej. Cumpleaños infantil, solicita inflable..."
                                    style={{
                                        width: '100%',
                                        padding: '10px 12px',
                                        borderRadius: '10px',
                                        border: '1px solid var(--border)',
                                        background: 'var(--bg-main)',
                                        color: 'var(--text-primary)',
                                        fontSize: '13px',
                                        outline: 'none',
                                        resize: 'vertical'
                                    }}
                                />
                            </div>
                        </>
                    ) : (
                        /* Service / Court Selector for Sports & Beauty */
                        <div>
                            <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)' }}>Servicio / Recurso</label>
                            <select
                                value={newBookingData.serviceId || ''}
                                onChange={(e) => {
                                    const allResources = [
                                        ...(currentBusiness?.services || []),
                                        ...(currentBusiness?.courts || [])
                                    ];
                                    const selectedResource = allResources.find(r => r.id === e.target.value);
                                    setNewBookingData({
                                        ...newBookingData,
                                        serviceId: e.target.value,
                                        price: selectedResource?.price || 0,
                                        specialistId: null
                                    });
                                }}
                                style={{
                                    width: '100%',
                                    padding: '10px 12px',
                                    borderRadius: '10px',
                                    border: '1px solid var(--border)',
                                    background: 'var(--bg-main)',
                                    color: 'var(--text-primary)',
                                    fontSize: '13px',
                                    outline: 'none',
                                    cursor: 'pointer'
                                }}
                            >
                                <option value="">Seleccionar recurso...</option>
                                {availableResources.services.length > 0 && <optgroup label="Servicios">
                                    {availableResources.services.map(service => (
                                        <option key={service.id} value={service.id}>
                                            {service.name} - ${service.price}
                                        </option>
                                    ))}
                                </optgroup>}
                                {availableResources.courts.length > 0 && <optgroup label="Canchas">
                                    {availableResources.courts.map(court => (
                                        <option key={court.id} value={court.id}>
                                            {court.name} - ${court.price}
                                        </option>
                                    ))}
                                </optgroup>}
                            </select>
                        </div>
                    )}

                    {/* Specialist Selector for non-rentals */}
                    {!isRental && availableSpecialistsForSelectedService.length > 1 && (
                        <div>
                            <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)' }}>Especialista *</label>
                            <select
                                value={newBookingData.specialistId || ''}
                                onChange={(e) => setNewBookingData({ ...newBookingData, specialistId: e.target.value })}
                                required
                                style={{
                                    width: '100%',
                                    padding: '10px 12px',
                                    borderRadius: '10px',
                                    border: '1px solid var(--border)',
                                    background: 'var(--bg-main)',
                                    color: 'var(--text-primary)',
                                    fontSize: '13px',
                                    outline: 'none',
                                    cursor: 'pointer'
                                }}
                            >
                                <option value="">Seleccionar profesional...</option>
                                {availableSpecialistsForSelectedService.map(spec => (
                                    <option key={spec.id} value={spec.id}>
                                        {spec.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Price and Deposit Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)' }}>Precio Total ($)</label>
                            <input
                                type="number"
                                value={newBookingData.price || ''}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setNewBookingData({
                                        ...newBookingData,
                                        price: val,
                                        depositAmount: Math.round((parseFloat(val) || 0) * 0.3)
                                    });
                                }}
                                placeholder="0"
                                min="0"
                                step="0.01"
                                style={{
                                    width: '100%',
                                    padding: '10px 12px',
                                    borderRadius: '10px',
                                    border: '1px solid var(--border)',
                                    background: 'var(--bg-main)',
                                    color: 'var(--text-primary)',
                                    fontSize: '14px',
                                    fontWeight: '700',
                                    outline: 'none'
                                }}
                            />
                        </div>

                        <div>
                            <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)' }}>Seña Requerida ($)</label>
                            <input
                                type="number"
                                value={newBookingData.depositAmount !== undefined ? newBookingData.depositAmount : Math.round((parseFloat(newBookingData.price) || 0) * 0.3)}
                                onChange={(e) => setNewBookingData({ ...newBookingData, depositAmount: e.target.value })}
                                placeholder="Ej. 30000"
                                min="0"
                                step="0.01"
                                style={{
                                    width: '100%',
                                    padding: '10px 12px',
                                    borderRadius: '10px',
                                    border: '1px solid var(--border)',
                                    background: 'var(--bg-main)',
                                    color: 'var(--text-primary)',
                                    fontSize: '14px',
                                    fontWeight: '700',
                                    outline: 'none'
                                }}
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        style={{
                            width: '100%',
                            padding: '12px',
                            borderRadius: '12px',
                            border: 'none',
                            background: 'var(--primary-paddle)',
                            color: 'white',
                            fontWeight: '700',
                            fontSize: '15px',
                            cursor: 'pointer',
                            marginTop: '8px',
                            boxShadow: '0 4px 12px rgba(0, 230, 118, 0.25)'
                        }}
                    >
                        Crear Reserva
                    </button>
                </form>
            </div>
        </div>
    );
};

export default NewBookingModal;
