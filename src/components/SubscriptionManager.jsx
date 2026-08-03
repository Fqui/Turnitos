import React, { useState, useEffect, useRef } from 'react';
import supabaseService from '../services/supabaseService';
import './SubscriptionManager.css';

const SubscriptionManager = ({ businessId, businessType, business, formData, onResourcesChange, onSave, saving, serviceAdapter, showToast }) => {
    const [subscription, setSubscription] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [editingIndex, setEditingIndex] = useState(null);
    const [editValue, setEditValue] = useState('');
    const [editRoleValue, setEditRoleValue] = useState('');
    const [editPriceValue, setEditPriceValue] = useState('');
    const editInputRef = useRef(null);

    useEffect(() => {
        loadSubscriptionData();
    }, [businessId, businessType]);

    useEffect(() => {
        if (editingIndex !== null && editInputRef.current) {
            editInputRef.current.focus();
            editInputRef.current.select();
        }
    }, [editingIndex]);

    const loadSubscriptionData = async () => {
        try {
            setLoading(true);
            setError(null);
            const currentSub = await supabaseService.getSubscription(businessId);
            setSubscription(currentSub);
        } catch (err) {
            console.error('Error loading subscription data:', err);
            setError('Error al cargar la información de suscripción');
        } finally {
            setLoading(false);
        }
    };

    const formatPrice = (price) => {
        return new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: 'ARS',
            minimumFractionDigits: 0
        }).format(price);
    };

    // Determine business type
    const bType = (formData?.type || business?.type || '').toLowerCase();
    const categoryName = (formData?.categories?.name || formData?.category || business?.categories?.name || '').toLowerCase();
    const subcatName = (formData?.subcategories?.[0]?.name || formData?.subcategories?.[0]?.slug || '').toLowerCase();
    const isSport = bType === 'sport' || bType === 'venue' || categoryName.includes('deporte') || subcatName.includes('futbol') || subcatName.includes('padel') || ((formData?.courts?.length || 0) > 0);

    const resourceLabel = isSport ? 'Cancha' : 'Especialista';
    const resourceLabelPlural = isSport ? 'Canchas' : 'Especialistas';
    const resourceKey = isSport ? 'courts' : 'specialists';
    const resourceIcon = isSport ? '🏟️' : '👤';

    // Build resources list
    const planName = subscription?.plan_name || business?.subscription_plan_id || 'Plan Personalizado';
    const spacesIncluded = subscription?.spaces_included || business?.capacity_limit || 1;
    const monthlyPrice = subscription?.monthly_price || 0;

    const expectedCount = Math.max(
        spacesIncluded,
        formData?.capacity_limit || 0,
        formData?.capacity || 0,
        formData?.courts?.length || 0,
        formData?.specialists?.length || 0,
        1
    );

    let rawResources = isSport ? (formData?.courts || []) : (formData?.specialists || []);
    if (rawResources.length < expectedCount) {
        rawResources = Array.from({ length: expectedCount }, (_, i) => {
            return rawResources[i] || {
                id: `temp-${resourceKey}-${i + 1}`,
                name: `${resourceLabel} ${i + 1}`,
                active: true
            };
        });
    }
    const resources = rawResources;
    const actualSpacesUsed = resources.filter(r => r.active !== false).length;
    const isLimitReached = actualSpacesUsed >= spacesIncluded;

    // Edit handlers
    const startEdit = (index) => {
        setEditingIndex(index);
        setEditValue(resources[index].name || '');
        setEditRoleValue(resources[index].role || '');
        setEditPriceValue(resources[index].price !== undefined ? resources[index].price : (formData?.price_per_hour || business?.price_per_hour || ''));
    };

    const confirmEdit = () => {
        if (editingIndex === null) return;
        const newResources = [...resources];
        const parsedPrice = editPriceValue !== '' ? Number(editPriceValue) : undefined;
        newResources[editingIndex] = {
            ...resources[editingIndex],
            name: editValue.trim() || `${resourceLabel} ${editingIndex + 1}`,
            ...(isSport
                ? { price: parsedPrice !== undefined && !isNaN(parsedPrice) ? parsedPrice : (resources[editingIndex].price || formData?.price_per_hour || 0) }
                : { role: editRoleValue.trim() }
            )
        };
        if (onResourcesChange) onResourcesChange(resourceKey, newResources);
        setEditingIndex(null);
        setEditValue('');
        setEditRoleValue('');
        setEditPriceValue('');
    };

    const cancelEdit = () => {
        setEditingIndex(null);
        setEditValue('');
        setEditRoleValue('');
        setEditPriceValue('');
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') confirmEdit();
        if (e.key === 'Escape') cancelEdit();
    };

    const toggleActive = (index) => {
        const newResources = [...resources];
        const newActive = resources[index].active === false ? true : false;
        newResources[index] = { ...resources[index], active: newActive };
        if (onResourcesChange) onResourcesChange(resourceKey, newResources);
        if (showToast) showToast(`${resourceLabel} ${resources[index].name} ${newActive ? 'habilitado' : 'deshabilitado'}`, newActive ? 'success' : 'info');
    };

    const handlePhotoUpload = async (index, file) => {
        if (!file || !serviceAdapter) return;
        try {
            if (showToast) showToast('Subiendo foto...', 'info');
            const url = await serviceAdapter.uploadImage(file);
            const newResources = [...resources];
            newResources[index] = { ...resources[index], avatar_url: url };
            if (onResourcesChange) onResourcesChange(resourceKey, newResources);
            if (onSave) await onSave({ [resourceKey]: newResources });
            if (showToast) showToast('Foto guardada correctamente', 'success');
        } catch (error) {
            console.error(error);
            if (showToast) showToast('Error al subir imagen', 'error');
        }
    };

    if (loading) {
        return <div className="subscription-manager loading">Cargando suscripción...</div>;
    }

    if (error) {
        return <div className="subscription-manager error">{error}</div>;
    }

    return (
        <div className="subscription-manager">
            {/* Plan details row */}
            <div className="plan-details-row">
                <div className="plan-detail-chip">
                    <span className="chip-label">Precio</span>
                    <span className="chip-value price">{formatPrice(monthlyPrice)}<span className="chip-period">/mes</span></span>
                </div>
                <div className="plan-detail-chip">
                    <span className="chip-label">{resourceLabelPlural} Incluidas</span>
                    <span className="chip-value">{spacesIncluded}</span>
                </div>
                <div className="plan-detail-chip">
                    <span className="chip-label">
                        {subscription?.status === 'trial' || (subscription?.trial_end_date && new Date(subscription.trial_end_date) > new Date())
                            ? 'Fin de Prueba'
                            : 'Próxima Factura'}
                    </span>
                    <span className="chip-value">
                        {new Date(subscription?.trial_end_date || subscription?.next_billing_date || Date.now()).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                </div>
            </div>

            {/* ─── Resources List ─── */}
            <div className="resources-section">
                <div className="resources-header">
                    <div>
                        <h3 className="resources-title">
                            {isSport ? 'Mis Canchas' : 'Mis Especialistas'}
                        </h3>
                        <p className="resources-subtitle">
                            Tocá el <span className="pencil-hint">✏️</span> para cambiar el nombre {isSport ? 'y precio' : ''}.
                        </p>
                    </div>
                </div>

                {/* Resources list */}
                <div className="resources-list">
                    {resources.map((resource, index) => {
                        const isEditing = editingIndex === index;
                        const isInactive = resource.active === false;

                        return (
                            <div
                                key={resource.id || index}
                                className={`resource-row ${isInactive ? 'inactive' : ''} ${isEditing ? 'editing' : ''}`}
                            >
                                {/* Number badge */}
                                <div className="resource-number">
                                    {index + 1}
                                </div>

                                {/* Photo for specialists */}
                                {!isSport && (
                                    <div className="specialist-photo-wrap">
                                        <div className="specialist-photo">
                                            {resource.avatar_url ? (
                                                <img src={resource.avatar_url} alt={resource.name} />
                                            ) : (
                                                <span>{resourceIcon}</span>
                                            )}
                                        </div>
                                        <input
                                            type="file"
                                            id={`photo-upload-${index}`}
                                            className="photo-input-hidden"
                                            accept="image/*"
                                            onChange={(e) => handlePhotoUpload(index, e.target.files[0])}
                                        />
                                        <label htmlFor={`photo-upload-${index}`} className="photo-upload-btn" title="Cambiar foto">
                                            📷
                                        </label>
                                    </div>
                                )}

                                {/* Icon for sports */}
                                {isSport && (
                                    <div className="resource-icon-sport">
                                        🏟️
                                    </div>
                                )}

                                {/* Name display / edit */}
                                <div className="resource-info">
                                    {isEditing ? (
                                        <div className="edit-fields">
                                            <input
                                                ref={editInputRef}
                                                type="text"
                                                className="edit-name-input"
                                                value={editValue}
                                                onChange={(e) => setEditValue(e.target.value)}
                                                onKeyDown={handleKeyDown}
                                                placeholder={`Nombre de ${resourceLabel.toLowerCase()}`}
                                            />
                                            {isSport && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-secondary)' }}>$</span>
                                                    <input
                                                        type="number"
                                                        className="edit-price-input"
                                                        value={editPriceValue}
                                                        onChange={(e) => setEditPriceValue(e.target.value)}
                                                        onKeyDown={handleKeyDown}
                                                        placeholder="Precio"
                                                        style={{ width: '90px', padding: '6px 10px', border: '1px solid #3ECF8E', borderRadius: '8px', background: 'var(--bg-main)', color: 'var(--text-primary)', fontSize: '14px', fontWeight: '700', outline: 'none' }}
                                                    />
                                                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600' }}>/h</span>
                                                </div>
                                            )}
                                            {!isSport && (
                                                <input
                                                    type="text"
                                                    className="edit-role-input"
                                                    value={editRoleValue}
                                                    onChange={(e) => setEditRoleValue(e.target.value)}
                                                    onKeyDown={handleKeyDown}
                                                    placeholder="Rol (ej: Peluquero, Masajista)"
                                                />
                                            )}
                                            <div className="edit-actions">
                                                <button className="edit-confirm" onClick={confirmEdit} title="Confirmar">✓</button>
                                                <button className="edit-cancel" onClick={cancelEdit} title="Cancelar">✕</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                            <span className="resource-name">{resource.name}</span>
                                            {isSport && (
                                                <span style={{ fontSize: '12px', fontWeight: '700', color: '#3ECF8E' }}>
                                                    ${Number(resource.price !== undefined ? resource.price : (formData?.price_per_hour || business?.price_per_hour || 0)).toLocaleString('es-AR')}/hora
                                                </span>
                                            )}
                                            {!isSport && resource.role && (
                                                <span className="resource-role">{resource.role}</span>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Action buttons */}
                                <div className="resource-actions">
                                    {!isEditing && (
                                        <button
                                            className="btn-edit-pencil"
                                            onClick={() => startEdit(index)}
                                            title={`Editar nombre de ${resourceLabel.toLowerCase()}`}
                                        >
                                            ✏️
                                        </button>
                                    )}
                                    <button
                                        className={`btn-toggle-active ${isInactive ? 'is-inactive' : 'is-active'}`}
                                        onClick={() => toggleActive(index)}
                                        title={isInactive ? 'Habilitar' : 'Deshabilitar'}
                                    >
                                        {isInactive ? '🔴' : '🟢'}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>

            </div>

            {/* Save button */}
            <button
                className="btn-save-resources"
                onClick={() => onSave && onSave({ [resourceKey]: resources })}
                disabled={saving}
            >
                {saving ? 'Guardando...' : 'Guardar'}
            </button>
        </div>
    );
};

export default SubscriptionManager;
