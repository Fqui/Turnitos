import React, { useState } from 'react';
import serviceAdapter from '../../../services/serviceAdapter';

export default function ServicesTab({
    formData,
    business,
    handleInputChange,
    handleSave,
    saving,
    serviceSpecialists,
    setServiceSpecialists,
    showToast,
    showConfirm,
    isMobile,
    labelStyle,
    inputStyle,
    buttonSecondaryStyle,
    saveButtonStyle
}) {
    const [newCategory, setNewCategory] = useState('');
    const [newService, setNewService] = useState({
        name: '',
        price: '',
        duration: 60,
        description: '',
        category: '',
        image_url: null,
        specialist_ids: []
    });
    const [editingService, setEditingService] = useState(null);

    const services = formData.services || [];
    const serviceCategories = formData.service_categories || [];
    const specialistsList = formData.specialists || business?.specialists || [];
    const durationOptions = [15, 30, 45, 60, 90, 120];

    const handleAddService = () => {
        if (!newService.name || !newService.name.trim()) {
            showToast('El nombre del servicio es obligatorio', 'error');
            return;
        }
        if (newService.price === '' || isNaN(Number(newService.price))) {
            showToast('Ingresa un precio válido', 'error');
            return;
        }

        const generateUUID = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });

        const serviceId = generateUUID();
        const selectedSpecs = (newService.specialist_ids && newService.specialist_ids.length > 0)
            ? newService.specialist_ids
            : specialistsList.map(s => s.id);

        const serviceToAdd = {
            id: serviceId,
            name: newService.name.trim(),
            price: Number(newService.price),
            duration: Number(newService.duration) || 60,
            category: newService.category || '',
            description: (newService.description || '').trim(),
            image_url: newService.image_url || null,
            specialist_ids: selectedSpecs
        };

        const updatedServices = [...services, serviceToAdd];
        handleInputChange('services', updatedServices);

        setServiceSpecialists(prev => ({
            ...prev,
            [serviceId]: selectedSpecs
        }));

        setNewService({
            name: '',
            price: '',
            duration: 60,
            description: '',
            category: serviceCategories[0] || '',
            image_url: null,
            specialist_ids: []
        });

        showToast('Servicio agregado. Haz click en "Guardar y Publicar Servicios" para confirmar.', 'success');
    };

    return (
        <div style={{ display: 'grid', gap: '24px' }}>
            {/* Header */}
            <div>
                <h3 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '6px', color: 'var(--text-primary)' }}>
                    💼 Servicios del Negocio ({services.length})
                </h3>
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: 0 }}>
                    Configura los servicios que ofreces, sus categorías, precios, duración y qué profesionales los realizan.
                </p>
            </div>

            {/* 1. Category Management Card */}
            <div style={{
                background: 'var(--bg-main)',
                borderRadius: '16px',
                border: '1px solid var(--border)',
                padding: '20px'
            }}>
                <h4 style={{ fontSize: '15px', fontWeight: '700', margin: '0 0 12px 0', color: 'var(--text-primary)' }}>
                    🏷️ Categorías de Servicios ({serviceCategories.length})
                </h4>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '14px' }}>
                    Organiza tus servicios en grupos (ej: <i>Faciales, Corporales, Peluquería, Masajes</i>).
                </p>

                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                    <input
                        type="text"
                        style={{ ...inputStyle, flex: 1 }}
                        placeholder="Nombre de la nueva categoría (ej: Tratamientos Faciales)..."
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value)}
                        onKeyDown={async (e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                const trimmed = newCategory.trim();
                                if (!trimmed) return;
                                if (serviceCategories.includes(trimmed)) {
                                    showToast('Esta categoría ya existe', 'warning');
                                    return;
                                }
                                const updated = [...serviceCategories, trimmed];
                                handleInputChange('service_categories', updated);
                                setNewCategory('');
                                if (!newService.category) {
                                    setNewService(prev => ({ ...prev, category: trimmed }));
                                }
                                const targetId = business?.id || formData?.id || formData?.business_id;
                                if (targetId) {
                                    try {
                                        await serviceAdapter.patchBusiness(targetId, { service_categories: updated });
                                        showToast('Categoría guardada en la base de datos', 'success');
                                    } catch (err) {
                                        console.error('Error guardando categoría:', err);
                                        showToast('Categoría guardada localmente (error al sincronizar)', 'warning');
                                    }
                                } else {
                                    showToast('Categoría agregada', 'success');
                                }
                            }
                        }}
                    />
                    <button
                        type="button"
                        onClick={async () => {
                            const trimmed = newCategory.trim();
                            if (!trimmed) {
                                showToast('Escribe el nombre de la categoría', 'warning');
                                return;
                            }
                            if (serviceCategories.includes(trimmed)) {
                                showToast('Esta categoría ya existe', 'warning');
                                return;
                            }
                            const updated = [...serviceCategories, trimmed];
                            handleInputChange('service_categories', updated);
                            setNewCategory('');
                            if (!newService.category) {
                                setNewService(prev => ({ ...prev, category: trimmed }));
                            }
                            const targetId = business?.id || formData?.id || formData?.business_id;
                            if (targetId) {
                                try {
                                    await serviceAdapter.patchBusiness(targetId, { service_categories: updated });
                                    showToast('Categoría guardada en la base de datos', 'success');
                                } catch (err) {
                                    console.error('Error guardando categoría:', err);
                                    showToast('Categoría guardada localmente (error al sincronizar)', 'warning');
                                }
                            } else {
                                showToast('Categoría agregada', 'success');
                            }
                        }}
                        style={{ ...buttonSecondaryStyle, padding: '0 20px', whiteSpace: 'nowrap' }}
                    >
                        ➕ Agregar Categoría
                    </button>
                </div>

                {/* Categories Chips */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {serviceCategories.length === 0 ? (
                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', fontStyle: 'italic', margin: 0 }}>
                            No hay categorías creadas aún. Puedes crear una arriba para clasificar tus servicios.
                        </p>
                    ) : (
                        serviceCategories.map((cat, idx) => (
                            <span
                                key={idx}
                                style={{
                                    padding: '6px 14px',
                                    borderRadius: '20px',
                                    background: 'var(--bg-card)',
                                    border: '1px solid var(--border)',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    fontSize: '13px',
                                    fontWeight: '600',
                                    color: 'var(--text-primary)'
                                }}
                            >
                                {cat}
                                <button
                                    type="button"
                                    onClick={async () => {
                                        const confirmed = await showConfirm(
                                            '¿Eliminar categoría?',
                                            `¿Deseas eliminar "${cat}"? Los servicios asociados pasarán a quedar sin categoría.`,
                                            'Eliminar',
                                            'Cancelar'
                                        );
                                        if (confirmed) {
                                            const updated = serviceCategories.filter((_, i) => i !== idx);
                                            handleInputChange('service_categories', updated);
                                            const targetId = business?.id || formData?.id || formData?.business_id;
                                            if (targetId) {
                                                try {
                                                    await serviceAdapter.patchBusiness(targetId, { service_categories: updated });
                                                    showToast('Categoría eliminada y actualizada en la base de datos', 'success');
                                                } catch (err) {
                                                    console.error('Error eliminando categoría:', err);
                                                    showToast('Categoría eliminada localmente (error al sincronizar)', 'warning');
                                                }
                                            } else {
                                                showToast('Categoría eliminada', 'success');
                                            }
                                        }
                                    }}
                                    style={{
                                        border: 'none',
                                        background: 'transparent',
                                        cursor: 'pointer',
                                        padding: 0,
                                        color: 'var(--text-secondary)',
                                        fontSize: '15px',
                                        lineHeight: 1
                                    }}
                                >
                                    ×
                                </button>
                            </span>
                        ))
                    )}
                </div>
            </div>

            {/* 2. New Service Form Card */}
            <div style={{
                background: 'var(--bg-main)',
                borderRadius: '16px',
                border: '1px solid var(--border)',
                padding: '24px',
                boxShadow: '0 4px 16px rgba(0,0,0,0.04)'
            }}>
                <h4 style={{ fontSize: '16px', fontWeight: '800', margin: '0 0 16px 0', color: 'var(--text-primary)' }}>
                    ➕ Crear Nuevo Servicio
                </h4>

                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.5fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                    <div>
                        <label style={labelStyle}>Nombre del Servicio *</label>
                        <input
                            type="text"
                            style={inputStyle}
                            value={newService.name}
                            onChange={e => setNewService(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="Ej: Limpieza Facial Profunda"
                        />
                    </div>

                    <div>
                        <label style={labelStyle}>Precio ($) *</label>
                        <input
                            type="number"
                            style={inputStyle}
                            value={newService.price}
                            onChange={e => setNewService(prev => ({ ...prev, price: e.target.value }))}
                            placeholder="0.00"
                            min="0"
                        />
                    </div>

                    <div>
                        <label style={labelStyle}>Duración</label>
                        <select
                            style={inputStyle}
                            value={newService.duration}
                            onChange={e => setNewService(prev => ({ ...prev, duration: Number(e.target.value) }))}
                        >
                            {durationOptions.map(dur => (
                                <option key={dur} value={dur}>{dur} min ({dur >= 60 ? `${dur / 60}h` : `${dur}m`})</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                    <div>
                        <label style={labelStyle}>Categoría</label>
                        <select
                            style={inputStyle}
                            value={newService.category || ''}
                            onChange={e => setNewService(prev => ({ ...prev, category: e.target.value }))}
                        >
                            <option value="">Sin categoría asignada</option>
                            {serviceCategories.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label style={labelStyle}>Foto / Imagen del Servicio (Opcional)</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            {newService.image_url && (
                                <img
                                    src={newService.image_url}
                                    alt="Preview"
                                    style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--border)' }}
                                />
                            )}
                            <input
                                type="file"
                                id="new-service-file-input"
                                style={{ display: 'none' }}
                                accept="image/*"
                                onChange={async (e) => {
                                    const file = e.target.files[0];
                                    if (!file) return;
                                    try {
                                        showToast('Subiendo imagen...', 'info');
                                        const url = await serviceAdapter.uploadImage(file);
                                        setNewService(prev => ({ ...prev, image_url: url }));
                                        showToast('Imagen cargada', 'success');
                                    } catch (err) {
                                        console.error(err);
                                        showToast('Error al subir imagen', 'error');
                                    }
                                }}
                            />
                            <label
                                htmlFor="new-service-file-input"
                                style={{ ...buttonSecondaryStyle, padding: '8px 14px', fontSize: '13px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                            >
                                📷 {newService.image_url ? 'Cambiar Foto' : 'Subir Foto'}
                            </label>
                            {newService.image_url && (
                                <button
                                    type="button"
                                    onClick={() => setNewService(prev => ({ ...prev, image_url: null }))}
                                    style={{ border: 'none', background: 'transparent', color: '#ef4444', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
                                >
                                    Quitar
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                <div style={{ marginBottom: '20px' }}>
                    <label style={labelStyle}>Descripción del Servicio (Opcional)</label>
                    <textarea
                        style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }}
                        value={newService.description}
                        onChange={e => setNewService(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Detalles sobre qué incluye este servicio o procedimiento..."
                    />
                </div>

                {/* SPECIALIST ASSIGNMENT SECTION */}
                <div style={{
                    background: 'var(--bg-card)',
                    borderRadius: '12px',
                    border: '1px solid var(--border)',
                    padding: '16px',
                    marginBottom: '20px'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                        <div>
                            <h5 style={{ margin: 0, fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>
                                👥 Especialistas / Profesionales Asignados *
                            </h5>
                            <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                                Selecciona quiénes del equipo realizan este servicio:
                            </p>
                        </div>
                        {specialistsList.length > 0 && (
                            <div style={{ display: 'flex', gap: '6px' }}>
                                <button
                                    type="button"
                                    onClick={() => setNewService(prev => ({ ...prev, specialist_ids: specialistsList.map(s => s.id) }))}
                                    style={{ ...buttonSecondaryStyle, padding: '4px 10px', fontSize: '11px' }}
                                >
                                    ✅ Todos
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setNewService(prev => ({ ...prev, specialist_ids: [] }))}
                                    style={{ ...buttonSecondaryStyle, padding: '4px 10px', fontSize: '11px' }}
                                >
                                    ❌ Ninguno
                                </button>
                            </div>
                        )}
                    </div>

                    {specialistsList.length === 0 ? (
                        <div style={{ padding: '16px', background: 'rgba(255, 152, 0, 0.08)', border: '1px solid rgba(255, 152, 0, 0.2)', borderRadius: '8px', color: '#f59e0b', fontSize: '13px' }}>
                            ⚠️ Aún no has creado profesionales en la pestaña <b>"Plan y Especialistas"</b>. Podrás asignarlos más tarde.
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
                            {specialistsList.map(spec => {
                                const isSelected = (newService.specialist_ids || []).includes(spec.id);
                                return (
                                    <div
                                        key={spec.id}
                                        onClick={() => {
                                            setNewService(prev => {
                                                const current = prev.specialist_ids || [];
                                                const next = isSelected
                                                    ? current.filter(id => id !== spec.id)
                                                    : [...current, spec.id];
                                                return { ...prev, specialist_ids: next };
                                            });
                                        }}
                                        style={{
                                            padding: '10px 14px',
                                            borderRadius: '10px',
                                            border: isSelected ? '2px solid var(--primary-paddle)' : '1px solid var(--border)',
                                            background: isSelected ? 'rgba(0, 230, 118, 0.08)' : 'var(--bg-main)',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '10px',
                                            transition: 'all 0.15s ease'
                                        }}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={() => {}}
                                            style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                                        />
                                        <div style={{
                                            width: '32px',
                                            height: '32px',
                                            borderRadius: '50%',
                                            background: 'var(--bg-card)',
                                            border: '1px solid var(--border)',
                                            overflow: 'hidden',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            flexShrink: 0
                                        }}>
                                            {spec.avatar_url ? (
                                                <img src={spec.avatar_url} alt={spec.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            ) : (
                                                <span style={{ fontSize: '14px' }}>👤</span>
                                            )}
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontWeight: '700', fontSize: '13px', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {spec.name}
                                            </div>
                                            {spec.role && (
                                                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                                    {spec.role}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <button
                    type="button"
                    onClick={handleAddService}
                    style={{
                        width: '100%',
                        padding: '14px',
                        borderRadius: '12px',
                        background: 'var(--primary-paddle)',
                        color: '#000',
                        fontWeight: '800',
                        fontSize: '14px',
                        cursor: 'pointer',
                        border: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px'
                    }}
                >
                    ➕ Agregar Servicio a la Lista
                </button>
            </div>

            {/* 3. List of Created Services */}
            <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <h4 style={{ fontSize: '16px', fontWeight: '800', margin: 0, color: 'var(--text-primary)' }}>
                        📋 Lista de Servicios Activos ({services.length})
                    </h4>
                </div>

                {services.length === 0 ? (
                    <div style={{
                        textAlign: 'center',
                        padding: '40px 20px',
                        background: 'var(--bg-main)',
                        borderRadius: '16px',
                        border: '1px dashed var(--border)',
                        color: 'var(--text-secondary)'
                    }}>
                        <div style={{ fontSize: '40px', marginBottom: '10px' }}>💼</div>
                        <p style={{ margin: '0 0 6px 0', fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>
                            No hay servicios configurados
                        </p>
                        <p style={{ margin: 0, fontSize: '13px' }}>
                            Completa el formulario de arriba para agregar tu primer servicio.
                        </p>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gap: '14px' }}>
                        {services.map((service, index) => {
                            const assignedSpecIds = serviceSpecialists[service.id] || [];
                            const assignedSpecs = specialistsList.filter(s => assignedSpecIds.includes(s.id));

                            return (
                                <div
                                    key={service.id || index}
                                    style={{
                                        background: 'var(--bg-main)',
                                        border: '1px solid var(--border)',
                                        borderRadius: '16px',
                                        padding: '18px',
                                        display: 'flex',
                                        flexDirection: isMobile ? 'column' : 'row',
                                        alignItems: isMobile ? 'flex-start' : 'center',
                                        gap: '16px',
                                        boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                                    }}
                                >
                                    <div style={{
                                        width: '64px',
                                        height: '64px',
                                        borderRadius: '12px',
                                        background: 'var(--bg-card)',
                                        border: '1px solid var(--border)',
                                        overflow: 'hidden',
                                        flexShrink: 0,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}>
                                        {service.image_url ? (
                                            <img src={service.image_url} alt={service.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        ) : (
                                            <span style={{ fontSize: '28px' }}>💆‍♀️</span>
                                        )}
                                    </div>

                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                                            <span style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)' }}>
                                                {service.name}
                                            </span>
                                            {service.category && (
                                                <span style={{
                                                    fontSize: '11px',
                                                    fontWeight: '700',
                                                    padding: '2px 8px',
                                                    borderRadius: '12px',
                                                    background: 'rgba(0, 230, 118, 0.12)',
                                                    color: 'var(--primary-paddle)'
                                                }}>
                                                    {service.category}
                                                </span>
                                            )}
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                                            <span style={{ fontWeight: '800', color: 'var(--text-primary)', fontSize: '15px' }}>
                                                ${Number(service.price || 0).toLocaleString('es-AR')}
                                            </span>
                                            <span>⏱️ {service.duration || 60} min</span>
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Profesionales:</span>
                                            {assignedSpecs.length === 0 ? (
                                                <span style={{ fontSize: '11px', fontWeight: '700', color: '#ff9800', background: 'rgba(255,152,0,0.1)', padding: '2px 8px', borderRadius: '10px' }}>
                                                    ⚠️ Sin profesionales
                                                </span>
                                            ) : (
                                                assignedSpecs.map(spec => (
                                                    <span
                                                        key={spec.id}
                                                        style={{
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '4px',
                                                            fontSize: '11px',
                                                            fontWeight: '600',
                                                            background: 'var(--bg-card)',
                                                            padding: '2px 8px',
                                                            borderRadius: '12px',
                                                            border: '1px solid var(--border)'
                                                        }}
                                                    >
                                                        👤 {spec.name}
                                                    </span>
                                                ))
                                            )}
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', gap: '8px', width: isMobile ? '100%' : 'auto', justifyContent: isMobile ? 'flex-end' : 'flex-start' }}>
                                        <button
                                            type="button"
                                            onClick={() => setEditingService({
                                                ...service,
                                                specialist_ids: serviceSpecialists[service.id] || []
                                            })}
                                            style={{ ...buttonSecondaryStyle, padding: '8px 14px', fontSize: '13px' }}
                                        >
                                            ✏️ Editar
                                        </button>
                                        <button
                                            type="button"
                                            onClick={async () => {
                                                const confirmed = await showConfirm(
                                                    '¿Eliminar servicio?',
                                                    `¿Estás seguro de que deseas eliminar "${service.name}"?`,
                                                    'Eliminar',
                                                    'Cancelar'
                                                );
                                                if (confirmed) {
                                                    const updatedServices = services.filter((_, i) => i !== index);
                                                    handleInputChange('services', updatedServices);
                                                    showToast('Servicio eliminado de la lista', 'success');
                                                }
                                            }}
                                            style={{
                                                padding: '8px 14px',
                                                borderRadius: '10px',
                                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                                background: 'rgba(239, 68, 68, 0.08)',
                                                color: '#ef4444',
                                                cursor: 'pointer',
                                                fontWeight: '700',
                                                fontSize: '13px'
                                            }}
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* 4. Edit Service Modal */}
            {editingService && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0,0,0,0.6)',
                        backdropFilter: 'blur(4px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 9999,
                        padding: '20px'
                    }}
                    onClick={() => setEditingService(null)}
                >
                    <div
                        style={{
                            background: 'var(--bg-card)',
                            borderRadius: '20px',
                            padding: '24px',
                            maxWidth: '600px',
                            width: '100%',
                            maxHeight: '90vh',
                            overflow: 'auto',
                            border: '1px solid var(--border)',
                            boxShadow: '0 20px 50px rgba(0,0,0,0.3)'
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)' }}>
                                ✏️ Editar Servicio
                            </h3>
                            <button
                                type="button"
                                onClick={() => setEditingService(null)}
                                style={{ border: 'none', background: 'transparent', fontSize: '20px', cursor: 'pointer', color: 'var(--text-secondary)' }}
                            >
                                ×
                            </button>
                        </div>

                        <div style={{ display: 'grid', gap: '14px' }}>
                            <div>
                                <label style={labelStyle}>Nombre del Servicio</label>
                                <input
                                    type="text"
                                    style={inputStyle}
                                    value={editingService.name || ''}
                                    onChange={e => setEditingService(prev => ({ ...prev, name: e.target.value }))}
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div>
                                    <label style={labelStyle}>Precio ($)</label>
                                    <input
                                        type="number"
                                        style={inputStyle}
                                        value={editingService.price || ''}
                                        onChange={e => setEditingService(prev => ({ ...prev, price: e.target.value }))}
                                    />
                                </div>
                                <div>
                                    <label style={labelStyle}>Duración</label>
                                    <select
                                        style={inputStyle}
                                        value={editingService.duration || 60}
                                        onChange={e => setEditingService(prev => ({ ...prev, duration: Number(e.target.value) }))}
                                    >
                                        {durationOptions.map(dur => (
                                            <option key={dur} value={dur}>{dur} min ({dur >= 60 ? `${dur / 60}h` : `${dur}m`})</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label style={labelStyle}>Categoría</label>
                                <select
                                    style={inputStyle}
                                    value={editingService.category || ''}
                                    onChange={e => setEditingService(prev => ({ ...prev, category: e.target.value }))}
                                >
                                    <option value="">Sin categoría</option>
                                    {serviceCategories.map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label style={labelStyle}>Descripción</label>
                                <textarea
                                    style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }}
                                    value={editingService.description || ''}
                                    onChange={e => setEditingService(prev => ({ ...prev, description: e.target.value }))}
                                />
                            </div>

                            {/* Photo / Image in Edit Modal */}
                            <div>
                                <label style={labelStyle}>Foto / Imagen del Servicio (Opcional)</label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', background: 'var(--bg-main)', padding: '12px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                                    {editingService.image_url ? (
                                        <img
                                            src={editingService.image_url}
                                            alt="Preview"
                                            style={{ width: '56px', height: '56px', objectFit: 'cover', borderRadius: '10px', border: '1px solid var(--border)' }}
                                        />
                                    ) : (
                                        <div style={{
                                            width: '56px',
                                            height: '56px',
                                            borderRadius: '10px',
                                            background: 'var(--border)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '24px',
                                            color: 'var(--text-secondary)'
                                        }}>
                                            🖼️
                                        </div>
                                    )}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                            <input
                                                type="file"
                                                id="edit-service-file-input"
                                                style={{ display: 'none' }}
                                                accept="image/*"
                                                onChange={async (e) => {
                                                    const file = e.target.files[0];
                                                    if (!file) return;
                                                    try {
                                                        showToast('Subiendo imagen...', 'info');
                                                        const url = await serviceAdapter.uploadImage(file);
                                                        setEditingService(prev => ({ ...prev, image_url: url }));
                                                        showToast('Imagen cargada correctamente', 'success');
                                                    } catch (err) {
                                                        console.error(err);
                                                        showToast('Error al subir la imagen', 'error');
                                                    }
                                                }}
                                            />
                                            <label
                                                htmlFor="edit-service-file-input"
                                                style={{ ...buttonSecondaryStyle, padding: '6px 14px', fontSize: '13px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                                            >
                                                📷 {editingService.image_url ? 'Cambiar Foto' : 'Subir Foto'}
                                            </label>
                                            {editingService.image_url && (
                                                <button
                                                    type="button"
                                                    onClick={() => setEditingService(prev => ({ ...prev, image_url: null }))}
                                                    style={{ border: 'none', background: 'transparent', color: '#ef4444', fontSize: '12px', fontWeight: '600', cursor: 'pointer', padding: '6px' }}
                                                >
                                                    🗑️ Quitar Foto
                                                </button>
                                            )}
                                        </div>
                                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                            {editingService.image_url ? 'Esta imagen se mostrará en tu catálogo público' : 'Sube una foto representativa (PNG, JPG o WebP)'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Specialists in Modal */}
                            <div style={{ background: 'var(--bg-main)', borderRadius: '12px', border: '1px solid var(--border)', padding: '14px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                    <label style={{ ...labelStyle, margin: 0 }}>👥 Profesionales Asignados</label>
                                    <div style={{ display: 'flex', gap: '6px' }}>
                                        <button
                                            type="button"
                                            onClick={() => setEditingService(prev => ({ ...prev, specialist_ids: specialistsList.map(s => s.id) }))}
                                            style={{ ...buttonSecondaryStyle, padding: '2px 8px', fontSize: '11px' }}
                                        >
                                            Todos
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setEditingService(prev => ({ ...prev, specialist_ids: [] }))}
                                            style={{ ...buttonSecondaryStyle, padding: '2px 8px', fontSize: '11px' }}
                                        >
                                            Ninguno
                                        </button>
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '8px' }}>
                                    {specialistsList.map(spec => {
                                        const isChecked = (editingService.specialist_ids || []).includes(spec.id);
                                        return (
                                            <label
                                                key={spec.id}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '8px',
                                                    padding: '8px 10px',
                                                    borderRadius: '8px',
                                                    background: isChecked ? 'rgba(0,230,118,0.1)' : 'var(--bg-card)',
                                                    border: isChecked ? '1px solid var(--primary-paddle)' : '1px solid var(--border)',
                                                    cursor: 'pointer',
                                                    fontSize: '13px'
                                                }}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={isChecked}
                                                    onChange={(e) => {
                                                        const checked = e.target.checked;
                                                        setEditingService(prev => {
                                                            const current = prev.specialist_ids || [];
                                                            const next = checked
                                                                ? [...current, spec.id]
                                                                : current.filter(id => id !== spec.id);
                                                            return { ...prev, specialist_ids: next };
                                                        });
                                                    }}
                                                />
                                                <span>{spec.name}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
                                <button
                                    type="button"
                                    onClick={() => setEditingService(null)}
                                    style={buttonSecondaryStyle}
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="button"
                                    onClick={async () => {
                                        const updatedServices = services.map(s => {
                                            if (s.id === editingService.id) {
                                                return {
                                                    ...s,
                                                    name: editingService.name,
                                                    price: Number(editingService.price),
                                                    duration: Number(editingService.duration),
                                                    category: editingService.category,
                                                    description: editingService.description,
                                                    image_url: editingService.image_url,
                                                    specialist_ids: editingService.specialist_ids || []
                                                };
                                            }
                                            return s;
                                        });
                                        handleInputChange('services', updatedServices);
                                        setServiceSpecialists(prev => ({
                                            ...prev,
                                            [editingService.id]: editingService.specialist_ids || []
                                        }));

                                        const targetId = business?.id || formData?.id || formData?.business_id;
                                        if (targetId) {
                                            try {
                                                await serviceAdapter.patchBusiness(targetId, {
                                                    services: updatedServices,
                                                    service_categories: formData.service_categories
                                                });
                                                showToast('Servicio actualizado y guardado en la nube', 'success');
                                            } catch (err) {
                                                console.error('Error guardando servicio editado:', err);
                                                showToast('Servicio actualizado localmente', 'warning');
                                            }
                                        } else {
                                            showToast('Servicio actualizado', 'success');
                                        }
                                        setEditingService(null);
                                    }}
                                    style={saveButtonStyle}
                                >
                                    Guardar Cambios
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Save Button for Services tab */}
            <div style={{ marginTop: '10px' }}>
                <button
                    type="button"
                    onClick={() => {
                        const servicesToSave = (formData.services || []).map(s => ({
                            ...s,
                            specialist_ids: serviceSpecialists[s.id] !== undefined
                                ? serviceSpecialists[s.id]
                                : (s.specialist_ids || [])
                        }));
                        handleSave({
                            services: servicesToSave,
                            service_categories: formData.service_categories
                        });
                    }}
                    style={{ ...saveButtonStyle, width: '100%', padding: '16px', fontSize: '15px' }}
                    disabled={saving}
                >
                    {saving ? 'Guardando en la nube...' : '💾 Guardar y Publicar Servicios'}
                </button>
            </div>
        </div>
    );
}
