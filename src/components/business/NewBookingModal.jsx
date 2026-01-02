import React from 'react';

const NewBookingModal = ({
    isOpen,
    onClose,
    isMobile,
    newBookingData,
    setNewBookingData,
    currentBusiness,
    onSubmit
}) => {
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
                            placeholder="Ej: Juan Pérez"
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
                                    price: selectedResource?.price || 0
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
                            {currentBusiness?.services?.map(service => (
                                <option key={service.id} value={service.id}>
                                    {service.name} - ${service.price}
                                </option>
                            ))}
                            {currentBusiness?.courts?.map(court => (
                                <option key={court.id} value={court.id}>
                                    {court.name} - ${court.price}
                                </option>
                            ))}
                        </select>
                    </div>

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
