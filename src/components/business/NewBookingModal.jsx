import React, { useMemo, useEffect } from 'react';

const NewBookingModal = ({
    isOpen,
    onClose,
    isMobile,
    newBookingData,
    setNewBookingData,
    currentBusiness,
    onSubmit,
    bookings // Recibimos bookings para verificar disponibilidad
}) => {
    // Reset specialist when service changes or modal opens
    useEffect(() => {
        if (!isOpen) {
            // Optional: reset state on close if needed
        }
    }, [isOpen]);

    // Calcular recursos disponibles basado en fecha/hora seleccionada
    const availableResources = useMemo(() => {
        if (!newBookingData.date || !newBookingData.time || !currentBusiness) return { services: [], courts: [] };

        const selectedDate = newBookingData.date;
        const selectedTime = newBookingData.time;

        const timeToMinutes = (t) => {
            const [h, m] = t.split(':').map(Number);
            return h * 60 + m;
        };
        const startMinutes = timeToMinutes(selectedTime);

        // Función para verificar si un intervalo de tiempo está ocupado
        const isTimeBlocked = (resourceId, resourceType, duration) => {
            const endMinutes = startMinutes + duration;

            // Filtrar reservas del día para este recurso
            const resourceBookings = bookings.filter(b => {
                // Verificar fecha
                let bDate = b.date;
                if (b.date.includes('/')) {
                    const [d, m, y] = b.date.split('/');
                    bDate = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
                }
                if (bDate !== selectedDate) return false;
                if (b.status === 'cancelled') return false;

                // Check for global block (no specific resource assigned)
                if (b.status === 'blocked' && !b.court_id && !b.service_id) {
                    return true;
                }

                // Verificar recurso
                if (resourceType === 'court') {
                    return b.court_id === resourceId;
                } else {
                    // Para servicios, verificamos si el especialista está ocupado
                    // O si el servicio en sí está bloqueado (caso raro, usualmente es por especialista)
                    return b.service_id === resourceId;
                }
            });

            // Verificar solapamiento
            return resourceBookings.some(b => {
                const bStart = timeToMinutes(b.time);
                const bDuration = b.duration || 60;
                const bEnd = bStart + bDuration;

                // Solapamiento: (StartA < EndB) y (EndA > StartB)
                return (startMinutes < bEnd) && (endMinutes > bStart);
            });
        };

        const availableCourts = (currentBusiness.courts || []).filter(court => {
            const duration = court.duration || 60; // Default duration
            return !isTimeBlocked(court.id, 'court', duration);
        });

        const availableServices = (currentBusiness.services || []).filter(service => {
            const duration = service.duration || 30;

            // Obtener especialistas del servicio
            // Nota: serviceAdapter.js ya mapea los especialistas anidados a `service.service_specialists`
            // Pero aquí `currentBusiness.services` puede venir directo de Supabase o procesado.
            // Asumimos que podemos obtener los especialistas disponibles.

            // Si el servicio no tiene especialistas asignados (caso raro), asumimos disponibilidad basada en el servicio mismo
            // Pero idealmente servicios dependen de especialistas.

            // Vamos a verificar si AL MENOS UN especialista asignado a este servicio está libre.
            // Si el servicio no requiere especialista (o no tiene asignados), verificamos por el ID del servicio genericamente.

            // Obtener IDs de especialistas asignados a este servicio
            const specialistIds = service.service_specialists?.map(ss => ss.specialist_id) || [];

            if (specialistIds.length === 0) {
                // Si no hay especialistas, verificamos disponibilidad genérica del servicio (poco común pero posible)
                return !isTimeBlocked(service.id, 'service', duration);
            }

            // Verificar si hay algún especialista libre
            const freeSpecialistFound = specialistIds.some(specId => {
                // Verificar si este especialista tiene alguna reserva a esta hora (en CUALQUIER servicio)
                const specialistBookings = bookings.filter(b => {
                    let bDate = b.date;
                    if (b.date.includes('/')) {
                        const [d, m, y] = b.date.split('/');
                        bDate = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
                    }
                    if (bDate !== selectedDate) return false;
                    if (b.status === 'cancelled') return false;

                    // La reserva ocupa al especialista si tiene specialist_id coincidente
                    // O si la reserva es de un servicio donde este especialista fue asignado (si guardamos specialist_id en booking)
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

    // Derivar especialistas disponibles para el servicio seleccionado
    const availableSpecialistsForSelectedService = useMemo(() => {
        if (!newBookingData.serviceId || !currentBusiness) return [];

        const service = currentBusiness.services?.find(s => s.id === newBookingData.serviceId);
        if (!service) return [];

        // Si es una cancha, no hay especialistas
        if (currentBusiness.courts?.some(c => c.id === newBookingData.serviceId)) return [];

        const specialistIds = service.service_specialists?.map(ss => ss.specialist_id) || [];
        if (specialistIds.length === 0) return [];

        // Filtrar especialistas ocupados
        const selectedDate = newBookingData.date;
        const selectedTime = newBookingData.time;
        const timeToMinutes = (t) => {
            const [h, m] = t.split(':').map(Number);
            return h * 60 + m;
        };
        const startMinutes = timeToMinutes(selectedTime);
        const duration = service.duration || 30;

        return specialistIds.map(specId => {
            // Encontrar objeto especialista completo
            return currentBusiness.specialists?.find(s => s.id === specId);
        }).filter(specialist => {
            if (!specialist) return false;
            // Verificar disponibilidad
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

    // Auto-seleccionar especialista si solo hay uno
    useEffect(() => {
        if (availableSpecialistsForSelectedService.length === 1) {
            setNewBookingData(prev => {
                // Solo actualizar si no está ya seleccionado para evitar loops
                if (prev.specialistId !== availableSpecialistsForSelectedService[0].id) {
                    return { ...prev, specialistId: availableSpecialistsForSelectedService[0].id };
                }
                return prev;
            });
        } else if (availableSpecialistsForSelectedService.length === 0) {
            // Si no hay especialistas (cancha o servicio sin asignación), limpiar selection
            setNewBookingData(prev => {
                if (prev.specialistId) return { ...prev, specialistId: null };
                return prev;
            });
        }
    }, [availableSpecialistsForSelectedService]);


    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: isMobile ? 'flex-end' : 'center',
            justifyContent: 'center',
            zIndex: 1000,
            backdropFilter: 'blur(4px)',
            padding: isMobile ? '0' : '20px'
        }} onClick={onClose}>
            <div style={{
                background: 'var(--bg-card)',
                padding: isMobile ? '24px 20px 40px 20px' : '32px',
                borderRadius: isMobile ? '24px 24px 0 0' : '24px',
                width: '100%',
                maxWidth: isMobile ? '100%' : '500px',
                boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
                border: '1px solid var(--border)',
                maxHeight: isMobile ? '90vh' : '95vh',
                overflowY: 'auto',
                animation: isMobile ? 'slideUpMobile 0.3s ease-out' : 'slideUp 0.3s ease-out'
            }} onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)' }}>Crear Nueva Reserva</h3>
                    <button onClick={onClose} style={{ background: 'transparent', border: 'none', fontSize: '24px', cursor: 'pointer', color: 'var(--text-secondary)' }}>&times;</button>
                </div>

                <form onSubmit={onSubmit} style={{ display: 'grid', gap: '16px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)' }}>Fecha</label>
                            <input
                                type="text"
                                value={newBookingData.date}
                                disabled
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    borderRadius: '10px',
                                    border: '1px solid var(--border)',
                                    background: 'var(--bg-main)',
                                    color: 'var(--text-primary)',
                                    fontSize: '14px'
                                }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)' }}>Hora</label>
                            <input
                                type="text"
                                value={newBookingData.time}
                                disabled
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    borderRadius: '10px',
                                    border: '1px solid var(--border)',
                                    background: 'var(--bg-main)',
                                    color: 'var(--text-primary)',
                                    fontSize: '14px'
                                }}
                            />
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)' }}>Nombre del Cliente *</label>
                        <input
                            type="text"
                            value={newBookingData.customerName}
                            onChange={(e) => setNewBookingData({ ...newBookingData, customerName: e.target.value })}
                            required
                            placeholder="Nombre y apellido del cliente"
                            style={{
                                width: '100%',
                                padding: '12px',
                                borderRadius: '10px',
                                border: '1px solid var(--border)',
                                background: 'var(--bg-main)',
                                color: 'var(--text-primary)',
                                fontSize: '14px',
                                outline: 'none'
                            }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)' }}>Teléfono *</label>
                        <input
                            type="tel"
                            value={newBookingData.customerPhone}
                            onChange={(e) => {
                                const val = e.target.value.replace(/\D/g, '');
                                setNewBookingData({ ...newBookingData, customerPhone: val });
                            }}
                            required
                            placeholder="3804123456"
                            style={{
                                width: '100%',
                                padding: '12px',
                                borderRadius: '10px',
                                border: '1px solid var(--border)',
                                background: 'var(--bg-main)',
                                color: 'var(--text-primary)',
                                fontSize: '14px',
                                outline: 'none'
                            }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)' }}>Servicio / Recurso</label>
                        <select
                            value={newBookingData.serviceId}
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
                                    specialistId: null // Reset specialist
                                });
                            }}
                            style={{
                                width: '100%',
                                padding: '12px',
                                borderRadius: '10px',
                                border: '1px solid var(--border)',
                                background: 'var(--bg-main)',
                                color: 'var(--text-primary)',
                                fontSize: '14px',
                                outline: 'none',
                                cursor: 'pointer'
                            }}
                        >
                            <option value="">Seleccionar...</option>
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
                            {availableResources.services.length === 0 && availableResources.courts.length === 0 && (
                                <option disabled>No hay disponibilidad en este horario</option>
                            )}
                        </select>
                    </div>

                    {/* Selector de Especialista (visible solo si hay múltiples opciones) */}
                    {availableSpecialistsForSelectedService.length > 1 && (
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)' }}>Especialista *</label>
                            <select
                                value={newBookingData.specialistId || ''}
                                onChange={(e) => setNewBookingData({ ...newBookingData, specialistId: e.target.value })}
                                required
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    borderRadius: '10px',
                                    border: '1px solid var(--border)',
                                    background: 'var(--bg-main)',
                                    color: 'var(--text-primary)',
                                    fontSize: '14px',
                                    outline: 'none',
                                    cursor: 'pointer'
                                }}
                            >
                                <option value="">Seleccionar especialista...</option>
                                {availableSpecialistsForSelectedService.map(spec => (
                                    <option key={spec.id} value={spec.id}>
                                        {spec.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)' }}>Precio</label>
                        <input
                            type="number"
                            value={newBookingData.price}
                            onChange={(e) => setNewBookingData({ ...newBookingData, price: e.target.value })}
                            placeholder="0"
                            min="0"
                            step="0.01"
                            style={{
                                width: '100%',
                                padding: '12px',
                                borderRadius: '10px',
                                border: '1px solid var(--border)',
                                background: 'var(--bg-main)',
                                color: 'var(--text-primary)',
                                fontSize: '14px',
                                outline: 'none'
                            }}
                        />
                    </div>

                    <button
                        type="submit"
                        style={{
                            width: '100%',
                            padding: '14px',
                            borderRadius: '12px',
                            border: 'none',
                            background: 'var(--primary-paddle)',
                            color: 'white',
                            fontWeight: '700',
                            fontSize: '16px',
                            cursor: 'pointer',
                            marginTop: '12px',
                            boxShadow: '0 4px 12px rgba(0, 230, 118, 0.2)'
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
