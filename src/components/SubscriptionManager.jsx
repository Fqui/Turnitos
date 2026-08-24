import React, { useState, useEffect, useRef } from "react";
import supabaseService from "../services/supabaseService";
import "./SubscriptionManager.css";

const SubscriptionManager = ({ businessId, businessType, business, formData, onResourcesChange, onSave, saving, serviceAdapter, showToast }) => {
    const [subscription, setSubscription] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [editingIndex, setEditingIndex] = useState(null);
    const [editValue, setEditValue] = useState("");
    const [editRoleValue, setEditRoleValue] = useState("");
    const [editPriceValue, setEditPriceValue] = useState("");
    // localOverrides: { [id]: { avatar_url, name, role, active, ... } }
    // Only stores locally-modified fields; merged into rawResources at render.
    // Preserves photo/name changes through prop re-renders without breaking count/padding logic.
    const [localOverrides, setLocalOverrides] = useState({});
    const editInputRef = useRef(null);

    useEffect(() => { loadSubscriptionData(); }, [businessId, businessType]);

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
            console.error("Error loading subscription data:", err);
            setError("Error al cargar la informacion de suscripcion");
        } finally {
            setLoading(false);
        }
    };

    const formatPrice = (price) =>
        new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 0 }).format(price);

    const bType = (formData?.type || business?.type || "").toLowerCase();
    const categoryName = (formData?.categories?.name || formData?.category || business?.categories?.name || "").toLowerCase();
    const subcatName = (formData?.subcategories?.[0]?.name || formData?.subcategories?.[0]?.slug || "").toLowerCase();
    const isSport = bType === "sport" || bType === "venue" || categoryName.includes("deporte") || subcatName.includes("futbol") || subcatName.includes("padel") || ((formData?.courts?.length || 0) > 0);

    const resourceLabel = isSport ? "Cancha" : "Especialista";
    const resourceLabelPlural = isSport ? "Canchas" : "Especialistas";
    const resourceKey = isSport ? "courts" : "specialists";
    const resourceIcon = isSport ? "🏟️" : "👤";

    const rawList = isSport ? (formData?.courts || business?.courts || []) : (formData?.specialists || business?.specialists || []);
    const countFromData = rawList.length;
    const spacesIncluded = Math.max(subscription?.spaces_included || business?.capacity_limit || countFromData || 1, 1);

    let calculatedMonthlyPrice = subscription?.monthly_price || 0;
    let computedPlanName = subscription?.plan_name || "Plan Personalizado";
    if (!isSport) {
        const specCount = Math.max(spacesIncluded, countFromData, 1);
        if (specCount === 1) { calculatedMonthlyPrice = 18000; computedPlanName = "Servicios - Individual"; }
        else { calculatedMonthlyPrice = 36000 + (Math.max(0, specCount - 3) * 10000); computedPlanName = "Servicios - Equipo"; }
    } else {
        const courtCount = Math.max(spacesIncluded, countFromData, 1);
        let unit = 20000;
        if (courtCount >= 4 && courtCount <= 5) unit = 17000;
        else if (courtCount >= 6) unit = 15000;
        calculatedMonthlyPrice = courtCount * unit;
        computedPlanName = `Canchas (${courtCount} ${courtCount === 1 ? "Cancha" : "Canchas"})`;
    }

    const expectedCount = Math.max(spacesIncluded, countFromData, formData?.capacity_limit || 0, formData?.capacity || 0, 1);

    let rawResources = isSport ? (formData?.courts || business?.courts || []) : (formData?.specialists || business?.specialists || []);
    if (rawResources.length < expectedCount) {
        rawResources = Array.from({ length: expectedCount }, (_, i) =>
            rawResources[i] || { id: `temp-${resourceKey}-${i + 1}`, name: `${resourceLabel} ${i + 1}`, active: true }
        );
    }

    // Merge localOverrides on top of rawResources — avatar_url / name survive prop re-renders
    const resources = rawResources.map((r, i) => {
        const override = localOverrides[r.id] || localOverrides[`pos-${i}`] || {};
        return { ...r, ...override };
    });

    const actualSpacesUsed = resources.filter(r => r.active !== false).length;
    const isLimitReached = actualSpacesUsed >= spacesIncluded;

    const applyOverride = (index, fields) => {
        const r = rawResources[index];
        const key = r?.id || `pos-${index}`;
        setLocalOverrides(prev => ({ ...prev, [key]: { ...(prev[key] || {}), ...fields } }));
    };

    const startEdit = (index) => {
        setEditingIndex(index);
        setEditValue(resources[index].name || "");
        setEditRoleValue(resources[index].role || "");
        setEditPriceValue(resources[index].price !== undefined ? resources[index].price : (formData?.price_per_hour || business?.price_per_hour || ""));
    };

    const confirmEdit = async () => {
        if (editingIndex === null) return;
        const parsedPrice = editPriceValue !== "" ? Number(editPriceValue) : undefined;
        const newName = editValue.trim() || `${resourceLabel} ${editingIndex + 1}`;
        const newRole = editRoleValue.trim();
        if (isSport) {
            applyOverride(editingIndex, { name: newName, price: parsedPrice !== undefined && !isNaN(parsedPrice) ? parsedPrice : (resources[editingIndex].price || formData?.price_per_hour || 0) });
        } else {
            applyOverride(editingIndex, { name: newName, role: newRole });
        }
        const newResources = resources.map((r, i) => {
            if (i !== editingIndex) return r;
            return { ...r, name: newName, ...(isSport ? { price: parsedPrice !== undefined && !isNaN(parsedPrice) ? parsedPrice : (r.price || formData?.price_per_hour || 0) } : { role: newRole }) };
        });
        if (onResourcesChange) onResourcesChange(resourceKey, newResources);
        if (onSave) await onSave({ [resourceKey]: newResources });
        setEditingIndex(null); setEditValue(""); setEditRoleValue(""); setEditPriceValue("");
    };

    const cancelEdit = () => { setEditingIndex(null); setEditValue(""); setEditRoleValue(""); setEditPriceValue(""); };
    const handleKeyDown = (e) => { if (e.key === "Enter") confirmEdit(); if (e.key === "Escape") cancelEdit(); };

    const toggleActive = async (index) => {
        const newActive = resources[index].active === false ? true : false;
        applyOverride(index, { active: newActive });
        const newResources = resources.map((r, i) => i === index ? { ...r, active: newActive } : r);
        if (onResourcesChange) onResourcesChange(resourceKey, newResources);
        if (onSave) await onSave({ [resourceKey]: newResources });
        if (showToast) showToast(`${resourceLabel} ${resources[index].name} ${newActive ? "habilitado" : "deshabilitado"}`, newActive ? "success" : "info");
    };

    const handlePhotoUpload = async (index, file) => {
        if (!file || !serviceAdapter) return;
        try {
            if (showToast) showToast("Subiendo foto...", "info");
            const url = await serviceAdapter.uploadImage(file);
            applyOverride(index, { avatar_url: url });
            const newResources = resources.map((r, i) => i === index ? { ...r, avatar_url: url } : r);
            if (onResourcesChange) onResourcesChange(resourceKey, newResources);
            if (onSave) await onSave({ [resourceKey]: newResources });
            if (showToast) showToast("Foto guardada correctamente", "success");
        } catch (err) {
            console.error(err);
            if (showToast) showToast("Error al subir imagen", "error");
        }
    };

    if (loading) return <div className="subscription-manager loading">Cargando suscripcion...</div>;
    if (error) return <div className="subscription-manager error">{error}</div>;

    return (
        <div className="subscription-manager">
            <div className="plan-details-row">
                <div className="plan-detail-chip">
                    <span className="chip-label">Plan Activo</span>
                    <span className="chip-value" style={{ fontSize: "15px", fontWeight: "800", color: "var(--primary-paddle)" }}>{computedPlanName}</span>
                </div>
                <div className="plan-detail-chip">
                    <span className="chip-label">Precio</span>
                    <span className="chip-value price">{formatPrice(calculatedMonthlyPrice)}<span className="chip-period">/mes</span></span>
                </div>
                <div className="plan-detail-chip">
                    <span className="chip-label">{resourceLabelPlural} Incluidas</span>
                    <span className="chip-value">{spacesIncluded}</span>
                </div>
                <div className="plan-detail-chip">
                    <span className="chip-label">
                        {subscription?.status === "trial" || (subscription?.trial_end_date && new Date(subscription.trial_end_date) > new Date()) ? "Fin de Prueba" : "Proxima Factura"}
                    </span>
                    <span className="chip-value">
                        {new Date(subscription?.trial_end_date || subscription?.next_billing_date || Date.now()).toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                </div>
            </div>

            <div className="resources-section">
                <div className="resources-header">
                    <div>
                        <h3 className="resources-title">{isSport ? "Mis Canchas" : "Mis Especialistas"}</h3>
                        <p className="resources-subtitle">Toca el <span className="pencil-hint">✏️</span> para cambiar el nombre{isSport ? " y precio" : ""}.</p>
                    </div>
                </div>
                <div className="resources-list">
                    {resources.map((resource, index) => {
                        const isEditing = editingIndex === index;
                        const isInactive = resource.active === false;
                        return (
                            <div key={resource.id || index} className={`resource-row ${isInactive ? "inactive" : ""} ${isEditing ? "editing" : ""}`}>
                                <div className="resource-number">{index + 1}</div>
                                {!isSport && (
                                    <div className="specialist-photo-wrap">
                                        <div className="specialist-photo">
                                            {resource.avatar_url ? <img src={resource.avatar_url} alt={resource.name} /> : <span>{resourceIcon}</span>}
                                        </div>
                                        <input type="file" id={`photo-upload-${index}`} className="photo-input-hidden" accept="image/*" onChange={(e) => handlePhotoUpload(index, e.target.files[0])} />
                                        <label htmlFor={`photo-upload-${index}`} className="photo-upload-btn" title="Cambiar foto">📷</label>
                                    </div>
                                )}
                                {isSport && <div className="resource-icon-sport">🏟️</div>}
                                <div className="resource-info">
                                    {isEditing ? (
                                        <div className="edit-fields">
                                            <input ref={editInputRef} type="text" className="edit-name-input" value={editValue} onChange={(e) => setEditValue(e.target.value)} onKeyDown={handleKeyDown} placeholder={`Nombre de ${resourceLabel.toLowerCase()}`} />
                                            {isSport && (
                                                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                                    <span style={{ fontSize: "13px", fontWeight: "700", color: "var(--text-secondary)" }}>$</span>
                                                    <input type="number" className="edit-price-input" value={editPriceValue} onChange={(e) => setEditPriceValue(e.target.value)} onKeyDown={handleKeyDown} placeholder="Precio" style={{ width: "90px", padding: "6px 10px", border: "1px solid #3ECF8E", borderRadius: "8px", background: "var(--bg-main)", color: "var(--text-primary)", fontSize: "14px", fontWeight: "700", outline: "none" }} />
                                                    <span style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: "600" }}>/h</span>
                                                </div>
                                            )}
                                            {!isSport && <input type="text" className="edit-role-input" value={editRoleValue} onChange={(e) => setEditRoleValue(e.target.value)} onKeyDown={handleKeyDown} placeholder="Rol (ej: Peluquero, Masajista)" />}
                                            <div className="edit-actions">
                                                <button className="edit-confirm" onClick={confirmEdit} title="Confirmar">✓</button>
                                                <button className="edit-cancel" onClick={cancelEdit} title="Cancelar">✕</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                                            <span className="resource-name">{resource.name}</span>
                                            {isSport && <span style={{ fontSize: "12px", fontWeight: "700", color: "#3ECF8E" }}>${Number(resource.price !== undefined ? resource.price : (formData?.price_per_hour || business?.price_per_hour || 0)).toLocaleString("es-AR")}/hora</span>}
                                            {!isSport && resource.role && <span className="resource-role">{resource.role}</span>}
                                        </div>
                                    )}
                                </div>
                                <div className="resource-actions">
                                    {!isEditing && <button className="btn-edit-pencil" onClick={() => startEdit(index)} title={`Editar nombre de ${resourceLabel.toLowerCase()}`}>✏️</button>}
                                    <button className={`btn-toggle-active ${isInactive ? "is-inactive" : "is-active"}`} onClick={() => toggleActive(index)} title={isInactive ? "Habilitar" : "Deshabilitar"}>{isInactive ? "🔴" : "🟢"}</button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <button className="btn-save-resources" onClick={() => onSave && onSave({ [resourceKey]: resources })} disabled={saving}>
                {saving ? "Guardando..." : "Guardar"}
            </button>
        </div>
    );
};

export default SubscriptionManager;
