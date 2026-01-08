import React, { useState, useEffect } from 'react';
import serviceAdapter from '../services/serviceAdapter';
import { useNotification } from '../contexts/NotificationContext';
import SubscriptionManager from './SubscriptionManager';

export default function BusinessSettings({ business, onUpdate, isMobile }) {
    const { showToast, showConfirm, showAlert } = useNotification();
    const [activeTab, setActiveTab] = useState('general');
    const [formData, setFormData] = useState(() => ({ ...business }));
    const [saving, setSaving] = useState(false);
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const [uploadingBanner, setUploadingBanner] = useState(false);
    const [uploadingGallery, setUploadingGallery] = useState(false);
    const [showPlanModal, setShowPlanModal] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState(null);
    const [subscription, setSubscription] = useState(null);

    // Highlights management
    const [editingHighlight, setEditingHighlight] = useState(null); // null or highlight object
    const [uploadingHighlightImages, setUploadingHighlightImages] = useState(false);

    useEffect(() => {
        if (business) {
            // Only update form data if we switched to a different business
            // or if it's the first load. We compare IDs.
            setFormData(prev => {
                if (prev.id === business.id) return prev; // Don't overwrite local changes if same business
                return {
                    ...business,
                    // Initialize gallery_highlights if it doesn't exist
                    gallery_highlights: business.gallery_highlights || []
                };
            });
        }
    }, [business.id]); // Only re-run if business ID changes

    // Load subscription
    useEffect(() => {
        const loadSubscription = async () => {
            if (business?.id) {
                try {
                    const sub = await serviceAdapter.getSubscription(business.id);
                    setSubscription(sub);
                } catch (error) {
                    console.error('Error loading subscription:', error);
                }
            }
        };
        loadSubscription();
    }, [business?.id]);

    const handleInputChange = (field, value) => {
        setFormData(prev => {
            const newState = { ...prev, [field]: value };
            console.log(`Updated ${field}:`, value); // Debug log
            return newState;
        });
    };

    const handleLogoUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            setUploadingLogo(true);
            const publicUrl = await serviceAdapter.uploadImage(file);
            handleInputChange('logo', publicUrl);
            showToast('Logo subido correctamente', 'success');
        } catch (error) {
            console.error('Error uploading logo:', error);
            showToast('Error al subir el logo. Solo disponible en modo producción.', 'error');
        } finally {
            setUploadingLogo(false);
        }
    };

    const handleBannerUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            setUploadingBanner(true);
            const publicUrl = await serviceAdapter.uploadImage(file);
            handleInputChange('banner_image', publicUrl);
            showToast('Banner subido correctamente', 'success');
        } catch (error) {
            console.error('Error uploading banner:', error);
            showToast('Error al subir el banner. Solo disponible en modo producción.', 'error');
        } finally {
            setUploadingBanner(false);
        }
    };

    const handleGalleryUpload = async (e) => {
        const files = Array.from(e.target.files);
        if (!files.length) return;

        // Limit to 20 images total
        const currentImages = formData.gallery_images || [];
        if (currentImages.length + files.length > 20) {
            showAlert('Límite de Galería', 'Solo puedes subir hasta 20 imágenes en total.');
            return;
        }

        try {
            setUploadingGallery(true);
            const newUrls = [];

            for (const file of files) {
                if (file.size > 5 * 1024 * 1024) {
                    showToast(`La imagen ${file.name} es muy pesada (máx 5MB)`, 'error');
                    continue;
                }
                const url = await serviceAdapter.uploadImage(file);
                newUrls.push(url);
            }

            const updatedGallery = [...currentImages, ...newUrls];
            handleInputChange('gallery_images', updatedGallery);

            // Auto-save the gallery
            await handleSave({ gallery_images: updatedGallery });

        } catch (error) {
            console.error('Error uploading gallery images:', error);
            showToast('Error al subir imágenes a la galería', 'error');
        } finally {
            setUploadingGallery(false);
        }
    };

    const removeGalleryImage = async (urlToRemove) => {
        const currentImages = formData.gallery_images || [];
        const updatedGallery = currentImages.filter(url => url !== urlToRemove);

        handleInputChange('gallery_images', updatedGallery);
        await handleSave({ gallery_images: updatedGallery });
    };

    // ===== HIGHLIGHTS MANAGEMENT =====

    const createHighlight = () => {
        const highlights = formData.gallery_highlights || [];
        if (highlights.length >= 10) {
            showAlert('Límite alcanzado', 'Solo puedes tener hasta 10 destacadas');
            return;
        }

        const newHighlight = {
            id: `highlight_${Date.now()}`,
            title: `Destacada ${highlights.length + 1}`,
            cover_image: null,
            images: [],
            order: highlights.length
        };

        setEditingHighlight(newHighlight);
    };

    const saveHighlight = async (highlight) => {
        const highlights = formData.gallery_highlights || [];
        const existingIndex = highlights.findIndex(h => h.id === highlight.id);

        let updatedHighlights;
        if (existingIndex >= 0) {
            updatedHighlights = [...highlights];
            updatedHighlights[existingIndex] = highlight;
        } else {
            updatedHighlights = [...highlights, highlight];
        }

        handleInputChange('gallery_highlights', updatedHighlights);
        await handleSave({ gallery_highlights: updatedHighlights });
        setEditingHighlight(null);
        showToast('Destacada guardada correctamente', 'success');
    };

    const deleteHighlight = async (highlightId) => {
        const confirmed = await showConfirm(
            '¿Eliminar destacada?',
            'Se eliminarán todas las imágenes de esta destacada'
        );

        if (!confirmed) return;

        const highlights = formData.gallery_highlights || [];
        const updatedHighlights = highlights.filter(h => h.id !== highlightId);

        handleInputChange('gallery_highlights', updatedHighlights);
        await handleSave({ gallery_highlights: updatedHighlights });
        showToast('Destacada eliminada', 'success');
    };

    const uploadHighlightImages = async (e, highlight) => {
        const files = Array.from(e.target.files);
        if (!files.length) return;

        const currentImages = highlight.images || [];
        if (currentImages.length + files.length > 20) {
            showAlert('Límite de imágenes', 'Solo puedes tener hasta 20 imágenes por destacada');
            return;
        }

        try {
            setUploadingHighlightImages(true);
            const newUrls = [];

            for (const file of files) {
                if (file.size > 5 * 1024 * 1024) {
                    showToast(`La imagen ${file.name} es muy pesada (máx 5MB)`, 'error');
                    continue;
                }
                const url = await serviceAdapter.uploadImage(file);
                newUrls.push(url);
            }

            const updatedImages = [...currentImages, ...newUrls];
            const updatedHighlight = {
                ...highlight,
                images: updatedImages,
                cover_image: highlight.cover_image || updatedImages[0]
            };

            setEditingHighlight(updatedHighlight);
            showToast(`${newUrls.length} imagen(es) subida(s)`, 'success');

        } catch (error) {
            console.error('Error uploading highlight images:', error);
            showToast('Error al subir imágenes', 'error');
        } finally {
            setUploadingHighlightImages(false);
        }
    };

    const removeHighlightImage = (highlight, imageUrl) => {
        const updatedImages = highlight.images.filter(url => url !== imageUrl);
        const updatedHighlight = {
            ...highlight,
            images: updatedImages,
            cover_image: highlight.cover_image === imageUrl ? updatedImages[0] : highlight.cover_image
        };
        setEditingHighlight(updatedHighlight);
    };

    const setCoverImage = (highlight, imageUrl) => {
        const updatedHighlight = {
            ...highlight,
            cover_image: imageUrl
        };
        setEditingHighlight(updatedHighlight);
    };


    const handleSave = async (specificUpdates = null) => {
        try {
            setSaving(true);
            const dataToSave = specificUpdates || formData;
            console.log('Saving data:', dataToSave);

            // Validate subscription limits for specialists or courts
            if (dataToSave.specialists || dataToSave.courts) {
                const businessType = formData.type || business.type;
                const resourceCount = dataToSave.specialists?.length || dataToSave.courts?.length || 0;

                if (resourceCount > 0) {
                    try {
                        const currentSub = await serviceAdapter.getSubscription(business.id);

                        console.log('🔍 Validation check:', {
                            resourceCount,
                            spaces_included: currentSub?.spaces_included,
                            willBlock: resourceCount > currentSub?.spaces_included
                        });

                        if (currentSub && resourceCount > currentSub.spaces_included) {
                            // Calculate suggested plan
                            const plans = await serviceAdapter.getSubscriptionPlans(businessType);
                            const nextPlan = plans.find(p => p.spaces >= resourceCount);

                            const resourceType = businessType === 'service' ? 'especialistas' : 'canchas';
                            let message = `No puedes guardar ${resourceCount} ${resourceType}.\n\n`;
                            message += `Tu plan actual incluye ${currentSub.spaces_included} espacio${currentSub.spaces_included > 1 ? 's' : ''}.\n\n`;

                            if (nextPlan) {
                                message += `Te sugerimos el plan "${nextPlan.name}" que incluye ${nextPlan.spaces} espacios por $${nextPlan.monthly_price}/mes.\n\n`;
                                message += `¿Deseas ir a la sección de suscripciones para actualizar tu plan?`;
                            } else {
                                message += `Actualiza tu plan en la sección de suscripciones.`;
                            }

                            const confirmed = await showConfirm(
                                'Límite de plan alcanzado',
                                message,
                                'Ir a Suscripción',
                                'Cancelar'
                            );

                            if (confirmed) {
                                setActiveTab('subscription');
                            }

                            setSaving(false);
                            return;
                        }
                    } catch (error) {
                        console.error('Error checking subscription:', error);
                        // Continue saving if subscription check fails
                    }
                }
            }

            // patchBusiness now returns null to avoid read timeouts
            await serviceAdapter.patchBusiness(business.id, dataToSave);

            // Manually construct the updated object for local state sync
            const updated = { ...business, ...dataToSave };
            console.log('Update response (manual):', updated);

            onUpdate(updated);
            showToast('Configuración guardada correctamente', 'success');
        } catch (error) {
            console.error('Error saving settings:', error);
            showToast(`Error al guardar: ${error.message || 'Desconocido'}`, 'error');
        } finally {
            setSaving(false);
        }
    };

    const getResourceLabel = () => {
        const type = formData.type || business.type;
        if (type === 'sport' || type === 'venue') return 'Canchas / Espacios';
        return 'Profesionales / Staff';
    };

    const tabs = [
        { id: 'general', label: 'General', icon: '🏢' },
        { id: 'subscription', label: 'Suscripción', icon: '💳' },
        { id: 'resources', label: getResourceLabel(), icon: '👥' },
        { id: 'schedule', label: 'Horarios', icon: '⏰' },
        { id: 'linkbio', label: 'Link Bio', icon: '🔗' },
        { id: 'gallery', label: 'Galería', icon: '📸' },
        { id: 'rules', label: 'Reglas', icon: '📋' },
        { id: 'payments', label: 'Pagos', icon: '💰' }
    ];

    const daysTranslation = {
        monday: 'Lunes',
        tuesday: 'Martes',
        wednesday: 'Miércoles',
        thursday: 'Jueves',
        friday: 'Viernes',
        saturday: 'Sábado',
        sunday: 'Domingo'
    };

    const orderedDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

    // Pricing helper functions
    const getPriceForCapacity = (slots) => {
        const prices = {
            1: 9990,
            2: 12990,
            3: 15990,
            4: 18990,
            5: 21990
        };
        if (slots <= 5) return prices[slots];
        return 21990 + ((slots - 5) * 3000);
    };

    const formatPrice = (price) => {
        return `$${price.toLocaleString('es-AR')}`;
    };

    const getCurrentCapacity = () => {
        // Use subscription spaces if available, otherwise fallback to business capacity_limit or default to 2
        return subscription?.spaces_included || business.capacity_limit || 2;
    };

    const handlePlanChange = async (newCapacity) => {
        try {
            setSaving(true);
            const updates = { capacity_limit: newCapacity };
            await serviceAdapter.updateBusiness(business.id, updates);
            onUpdate({ ...business, ...updates });
            setShowPlanModal(false);
            showToast(`Plan actualizado a ${newCapacity} espacio${newCapacity > 1 ? 's' : ''}`, 'success');
        } catch (error) {
            console.error('Error updating plan:', error);
            showToast('Error al actualizar el plan', 'error');
        } finally {
            setSaving(false);
        }
    };

    // Plan Management Modal Component
    const PlanManagementModal = () => {
        const currentCapacity = getCurrentCapacity();
        const [tempSelected, setTempSelected] = useState(currentCapacity);

        return (
            <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0,0,0,0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
                padding: '20px'
            }}>
                <div style={{
                    background: 'var(--bg-card)',
                    borderRadius: '20px',
                    padding: isMobile ? '24px' : '32px',
                    maxWidth: '600px',
                    width: '100%',
                    maxHeight: '90vh',
                    overflow: 'auto',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                        <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '800', color: 'var(--text-primary)' }}>Gestionar Plan</h2>
                        <button
                            onClick={() => setShowPlanModal(false)}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                fontSize: '24px',
                                cursor: 'pointer',
                                color: 'var(--text-secondary)',
                                padding: '4px'
                            }}
                        >×</button>
                    </div>

                    <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '24px' }}>
                        Selecciona la cantidad de espacios que necesitas. Puedes cambiar tu plan en cualquier momento.
                    </p>

                    <div style={{ display: 'grid', gap: '12px', marginBottom: '24px' }}>
                        {[1, 2, 3, 4, 5, 6, 7, 8].map(capacity => {
                            const price = getPriceForCapacity(capacity);
                            const isCurrentPlan = capacity === currentCapacity;
                            const isSelected = capacity === tempSelected;
                            const pricePerSlot = Math.round(price / capacity);

                            return (
                                <div
                                    key={capacity}
                                    onClick={() => setTempSelected(capacity)}
                                    style={{
                                        padding: '16px 20px',
                                        borderRadius: '12px',
                                        border: isSelected ? '2px solid var(--primary-paddle)' : '2px solid var(--border)',
                                        background: isSelected ? 'rgba(255, 193, 7, 0.1)' : 'var(--bg-main)',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        position: 'relative'
                                    }}
                                >
                                    {isCurrentPlan && (
                                        <div style={{
                                            position: 'absolute',
                                            top: '8px',
                                            left: '8px',
                                            background: 'var(--primary-paddle)',
                                            color: '#000',
                                            padding: '4px 8px',
                                            borderRadius: '6px',
                                            fontSize: '10px',
                                            fontWeight: '700',
                                            zIndex: 1
                                        }}>
                                            PLAN ACTUAL
                                        </div>
                                    )}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)' }}>
                                                {capacity} Espacio{capacity > 1 ? 's' : ''}
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center' }}>
                                            <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--primary-paddle)' }}>
                                                {formatPrice(price)}
                                            </div>
                                            {capacity > 1 && (
                                                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                                    {formatPrice(pricePerSlot)} por espacio
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {tempSelected !== currentCapacity && (
                        <div style={{
                            padding: '16px',
                            background: 'rgba(255, 193, 7, 0.1)',
                            borderRadius: '12px',
                            marginBottom: '24px',
                            border: '1px solid var(--primary-paddle)'
                        }}>
                            <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '8px' }}>
                                Resumen del cambio:
                            </div>
                            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                                Plan actual: {currentCapacity} espacio{currentCapacity > 1 ? 's' : ''} ({formatPrice(getPriceForCapacity(currentCapacity))})
                            </div>
                            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                                Nuevo plan: {tempSelected} espacio{tempSelected > 1 ? 's' : ''} ({formatPrice(getPriceForCapacity(tempSelected))})
                            </div>
                            <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--primary-paddle)', marginTop: '8px' }}>
                                Diferencia: {formatPrice(Math.abs(getPriceForCapacity(tempSelected) - getPriceForCapacity(currentCapacity)))} {tempSelected > currentCapacity ? 'más' : 'menos'} por mes
                            </div>
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button
                            onClick={() => setShowPlanModal(false)}
                            style={{
                                flex: 1,
                                padding: '12px',
                                borderRadius: '12px',
                                border: '1px solid var(--border)',
                                background: 'transparent',
                                color: 'var(--text-primary)',
                                fontWeight: '600',
                                cursor: 'pointer'
                            }}
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={() => handlePlanChange(tempSelected)}
                            disabled={tempSelected === currentCapacity || saving}
                            style={{
                                flex: 1,
                                padding: '12px',
                                borderRadius: '12px',
                                border: 'none',
                                background: tempSelected === currentCapacity ? 'var(--border)' : 'var(--primary-paddle)',
                                color: '#000',
                                fontWeight: '700',
                                cursor: tempSelected === currentCapacity ? 'not-allowed' : 'pointer',
                                opacity: tempSelected === currentCapacity ? 0.5 : 1
                            }}
                        >
                            {saving ? 'Actualizando...' : 'Confirmar Cambio'}
                        </button>
                    </div>

                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '16px', textAlign: 'center' }}>
                        Los cambios en el plan se aplicarán inmediatamente. La facturación se ajustará en tu próximo ciclo de pago.
                    </p>
                </div>
            </div>
        );
    };

    const renderTabContent = () => {
        switch (activeTab) {
            case 'resources':
                const isSport = (formData.type || business.type) === 'sport' || (formData.type || business.type) === 'venue';
                const resources = isSport ? (formData.courts || []) : (formData.specialists || []);
                const resourceLabel = isSport ? 'Cancha' : 'Profesional';
                const resourceKey = isSport ? 'courts' : 'specialists';

                return (
                    <div style={{ display: 'grid', gap: '24px' }}>
                        <div>
                            <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '8px', color: 'var(--text-primary)' }}>
                                {isSport ? 'Gestionar Canchas' : 'Gestionar Profesionales'}
                            </h3>
                            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
                                Agrega o elimina {isSport ? 'canchas' : 'profesionales'} para definir tu capacidad máxima por horario.
                            </p>

                            <div style={{ display: 'grid', gap: '12px' }}>
                                {resources.map((resource, index) => (
                                    <div key={resource.id || index} style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                        padding: '12px 16px',
                                        background: 'var(--bg-main)',
                                        borderRadius: '12px',
                                        border: '1px solid var(--border)'
                                    }}>
                                        <div style={{
                                            width: '32px',
                                            height: '32px',
                                            borderRadius: '50%',
                                            background: 'rgba(0,0,0,0.05)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '16px'
                                        }}>
                                            {isSport ? '🏟️' : '👤'}
                                        </div>
                                        <input
                                            type="text"
                                            value={resource.name}
                                            onChange={(e) => {
                                                const newResources = [...resources];
                                                newResources[index] = { ...resource, name: e.target.value };
                                                handleInputChange(resourceKey, newResources);
                                            }}
                                            style={{
                                                ...inputStyle,
                                                border: 'none',
                                                background: 'transparent',
                                                padding: '0',
                                                fontWeight: '600'
                                            }}
                                        />
                                        <button
                                            onClick={async () => {
                                                if (resources.length <= 1) {
                                                    showToast(`Debe haber al menos un ${resourceLabel.toLowerCase()}`, 'warning');
                                                    return;
                                                }
                                                const confirmed = await showConfirm(
                                                    '¿Eliminar recurso?',
                                                    `¿Estás seguro de que deseas eliminar "${resource.name}"?`,
                                                    'Eliminar',
                                                    'Cancelar'
                                                );
                                                if (confirmed) {
                                                    const newResources = resources.filter((_, i) => i !== index);
                                                    handleInputChange(resourceKey, newResources);
                                                }
                                            }}
                                            disabled={resources.length <= 1}
                                            style={{
                                                background: 'transparent',
                                                border: 'none',
                                                color: resources.length <= 1 ? '#9ca3af' : '#ef4444',
                                                cursor: resources.length <= 1 ? 'not-allowed' : 'pointer',
                                                padding: '8px',
                                                borderRadius: '8px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                opacity: resources.length <= 1 ? 0.5 : 1
                                            }}
                                            title={resources.length <= 1 ? `Debe haber al menos un ${resourceLabel.toLowerCase()}` : "Eliminar"}
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                ))}
                            </div>

                            <button
                                onClick={async () => {
                                    // Check capacity limit
                                    const currentCapacity = getCurrentCapacity();
                                    if (resources.length >= currentCapacity) {
                                        const confirmed = await showConfirm(
                                            'Límite de plan alcanzado',
                                            `Has alcanzado el límite de tu plan (${currentCapacity} espacio${currentCapacity > 1 ? 's' : ''}).\n\nPara agregar más ${isSport ? 'canchas' : 'profesionales'}, actualiza tu plan en la pestaña "Suscripción".`,
                                            'Ir a Suscripción',
                                            'Cancelar'
                                        );
                                        if (confirmed) {
                                            setActiveTab('subscription');
                                        }
                                        return;
                                    }

                                    // Generate a proper UUID v4 to satisfy database constraints
                                    const generateUUID = () => {
                                        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
                                            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
                                            return v.toString(16);
                                        });
                                    };

                                    const newResource = {
                                        id: generateUUID(),
                                        name: `${resourceLabel} ${resources.length + 1}`,
                                        type: isSport ? 'court' : 'specialist'
                                    };
                                    const updatedResources = [...resources, newResource];
                                    handleInputChange(resourceKey, updatedResources);
                                }}
                                style={{
                                    marginTop: '16px',
                                    padding: '12px',
                                    width: '100%',
                                    borderRadius: '12px',
                                    border: '1px dashed var(--border)',
                                    background: 'transparent',
                                    color: 'var(--text-secondary)',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                                onMouseEnter={e => {
                                    e.currentTarget.style.background = 'rgba(0,0,0,0.02)';
                                    e.currentTarget.style.borderColor = 'var(--text-primary)';
                                    e.currentTarget.style.color = 'var(--text-primary)';
                                }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.background = 'transparent';
                                    e.currentTarget.style.borderColor = 'var(--border)';
                                    e.currentTarget.style.color = 'var(--text-secondary)';
                                }}
                            >
                                + Agregar {resourceLabel}
                            </button>
                        </div>

                        <button
                            onClick={() => handleSave({ [resourceKey]: resources })}
                            style={saveButtonStyle}
                            disabled={saving}
                        >
                            {saving ? 'Guardando...' : `Guardar ${isSport ? 'Canchas' : 'Profesionales'}`}
                        </button>
                    </div>
                );

            case 'general':
                return (
                    <div style={{ display: 'grid', gap: '20px' }}>
                        <div>
                            <label style={labelStyle}>Nombre del Negocio</label>
                            <input
                                type="text"
                                style={inputStyle}
                                value={formData.name ?? ''}
                                onChange={(e) => handleInputChange('name', e.target.value)}
                            />
                        </div>
                        <div>
                            <label style={labelStyle}>Descripción / Bio</label>
                            <textarea
                                style={{ ...inputStyle, height: '100px', resize: 'none' }}
                                value={formData.description ?? ''}
                                onChange={(e) => handleInputChange('description', e.target.value)}
                                placeholder="Breve descripción que verán tus clientes..."
                            />
                        </div>
                        <div>
                            <label style={labelStyle}>Ubicación</label>
                            <input
                                type="text"
                                style={inputStyle}
                                value={formData.location ?? ''}
                                onChange={(e) => handleInputChange('location', e.target.value)}
                            />
                        </div>
                        <button
                            onClick={() => handleSave({
                                name: formData.name,
                                description: formData.description,
                                location: formData.location
                            })}
                            style={saveButtonStyle}
                            disabled={saving}
                        >
                            {saving ? 'Guardando...' : 'Guardar Información General'}
                        </button>

                        <div style={{ marginTop: '20px', borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
                            <h4 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '16px', color: 'var(--text-primary)' }}>
                                Redes Sociales
                            </h4>
                            <div style={{ display: 'grid', gap: '16px' }}>
                                <div>
                                    <label style={labelStyle}>Instagram</label>
                                    <input
                                        type="text"
                                        style={inputStyle}
                                        placeholder="@usuario"
                                        value={formData.instagram ?? ''}
                                        onChange={(e) => handleInputChange('instagram', e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label style={labelStyle}>TikTok</label>
                                    <input
                                        type="text"
                                        style={inputStyle}
                                        placeholder="@usuario"
                                        value={formData.tiktok ?? ''}
                                        onChange={(e) => handleInputChange('tiktok', e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label style={labelStyle}>Facebook</label>
                                    <input
                                        type="text"
                                        style={inputStyle}
                                        placeholder="@usuario o URL"
                                        value={formData.facebook ?? ''}
                                        onChange={(e) => handleInputChange('facebook', e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label style={labelStyle}>WhatsApp</label>
                                    <input
                                        type="text"
                                        style={inputStyle}
                                        placeholder="+54911..."
                                        value={formData.whatsapp ?? ''}
                                        onChange={(e) => handleInputChange('whatsapp', e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label style={labelStyle}>Sitio Web</label>
                                    <input
                                        type="text"
                                        style={inputStyle}
                                        placeholder="https://..."
                                        value={formData.website ?? ''}
                                        onChange={(e) => handleInputChange('website', e.target.value)}
                                    />
                                </div>
                            </div>
                            <button
                                onClick={() => handleSave({
                                    instagram: formData.instagram,
                                    tiktok: formData.tiktok,
                                    facebook: formData.facebook,
                                    whatsapp: formData.whatsapp,
                                    website: formData.website
                                })}
                                style={{ ...saveButtonStyle, marginTop: '16px', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                                disabled={saving}
                            >
                                {saving ? 'Guardando...' : 'Guardar Redes Sociales'}
                            </button>
                        </div>
                    </div>
                );

            case 'subscription':
                return (
                    <SubscriptionManager
                        businessId={business.id}
                        businessType={business.type}
                        business={business}
                    />
                );

            case 'images':
                return (
                    <div style={{ display: 'grid', gap: '32px' }}>
                        <div>
                            <label style={labelStyle}>Logo del Negocio</label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginTop: '10px' }}>
                                <div style={{
                                    width: '80px',
                                    height: '80px',
                                    borderRadius: '16px',
                                    overflow: 'hidden',
                                    background: 'var(--bg-main)',
                                    border: '1px solid var(--border)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    {formData.logo ? (
                                        <img src={formData.logo} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                        <span style={{ fontSize: '24px' }}>🏢</span>
                                    )}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <input
                                        type="file"
                                        id="logo-upload"
                                        style={{ display: 'none' }}
                                        accept="image/*"
                                        onChange={handleLogoUpload}
                                    />
                                    <label htmlFor="logo-upload" style={buttonSecondaryStyle}>
                                        {uploadingLogo ? 'Subiendo...' : 'Cambiar Logo'}
                                    </label>
                                    <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '8px' }}>Recomendado: 512x512px. JPG o PNG.</p>
                                </div>
                            </div>
                        </div>
                        <div>
                            <label style={labelStyle}>Imagen de Banner</label>
                            <div style={{ marginTop: '10px' }}>
                                <div style={{
                                    width: '100%',
                                    height: '140px',
                                    borderRadius: '16px',
                                    overflow: 'hidden',
                                    background: 'var(--bg-main)',
                                    border: '1px solid var(--border)',
                                    marginBottom: '16px'
                                }}>
                                    {formData.banner_image ? (
                                        <img src={formData.banner_image} alt="Banner" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                        <div style={{ width: '100%', height: '100%', background: 'linear-gradient(45deg, #eee, #f5f5f5)' }} />
                                    )}
                                </div>
                                <input
                                    type="file"
                                    id="banner-upload"
                                    style={{ display: 'none' }}
                                    accept="image/*"
                                    onChange={handleBannerUpload}
                                />
                                <label htmlFor="banner-upload" style={buttonSecondaryStyle}>
                                    {uploadingBanner ? 'Subiendo...' : 'Cambiar Banner'}
                                </label>
                            </div>
                        </div>
                        <button
                            onClick={() => handleSave({
                                logo: formData.logo,
                                banner_image: formData.banner_image
                            })}
                            style={saveButtonStyle}
                            disabled={saving}
                        >
                            {saving ? 'Guardando...' : 'Guardar Imágenes'}
                        </button>
                    </div>
                );
            case 'schedule':
                return (
                    <div style={{ display: 'grid', gap: '20px' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '10px' }}>Días y Horarios de Atención</h3>
                        <div style={{ background: 'var(--bg-main)', borderRadius: '16px', border: '1px solid var(--border)', overflow: 'hidden' }}>
                            {orderedDays.map((day, index) => {
                                const dayConfig = formData.hours?.[day] || {};
                                const isOpen = dayConfig.isOpen !== false; // Default to open if undefined
                                const isSplit = !!dayConfig.isSplit;

                                return (
                                    <div key={day} style={{
                                        borderBottom: index < orderedDays.length - 1 ? '1px solid var(--border)' : 'none',
                                        background: isOpen ? 'transparent' : 'rgba(0,0,0,0.02)',
                                        padding: '16px 20px'
                                    }}>
                                        {/* Day Toggle Header */}
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            marginBottom: isOpen ? '16px' : '0'
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <input
                                                    type="checkbox"
                                                    id={`toggle-${day}`}
                                                    checked={isOpen}
                                                    onChange={(e) => {
                                                        const newHours = { ...formData.hours };
                                                        if (!newHours[day]) newHours[day] = { open: '08:00', close: '23:00' };
                                                        newHours[day] = { ...newHours[day], isOpen: e.target.checked };
                                                        handleInputChange('hours', newHours);
                                                    }}
                                                    style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--primary-paddle)' }}
                                                />
                                                <label htmlFor={`toggle-${day}`} style={{ fontWeight: '600', color: isOpen ? 'var(--text-primary)' : 'var(--text-secondary)', cursor: 'pointer' }}>
                                                    {daysTranslation[day]}
                                                </label>
                                            </div>

                                            {/* Split Shift Toggle */}
                                            {isOpen && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <input
                                                        type="checkbox"
                                                        id={`split-${day}`}
                                                        checked={isSplit}
                                                        onChange={(e) => {
                                                            const newHours = { ...formData.hours };
                                                            const newIsSplit = e.target.checked;
                                                            newHours[day] = {
                                                                ...newHours[day],
                                                                isSplit: newIsSplit,
                                                                // Default split times if enabling: 09:00-13:00 / 16:00-20:00
                                                                // If disabling, keep open/close but clear break
                                                                open: newIsSplit ? (dayConfig.open || '09:00') : (dayConfig.open || '09:00'),
                                                                close: newIsSplit ? (dayConfig.close || '20:00') : (dayConfig.close || '20:00'),
                                                                breakStart: newIsSplit ? '13:00' : null,
                                                                breakEnd: newIsSplit ? '16:00' : null
                                                            };
                                                            handleInputChange('hours', newHours);
                                                        }}
                                                        style={{ width: '14px', height: '14px', cursor: 'pointer', accentColor: 'var(--primary-paddle)' }}
                                                    />
                                                    <label htmlFor={`split-${day}`} style={{ fontSize: '13px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                                                        Doble Turno
                                                    </label>
                                                </div>
                                            )}
                                        </div>

                                        {/* Time Inputs */}
                                        {isOpen && (
                                            <div style={{ paddingLeft: isMobile ? '0' : '30px', animation: 'fadeIn 0.2s' }}>
                                                {!isSplit ? (
                                                    // Continuous Shift Mode
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                        <span style={{ fontSize: '13px', color: 'var(--text-secondary)', minWidth: '60px' }}>Corrido:</span>
                                                        <input
                                                            type="time"
                                                            value={dayConfig.open || '08:00'}
                                                            onChange={(e) => {
                                                                const newHours = { ...formData.hours };
                                                                newHours[day] = { ...newHours[day], open: e.target.value };
                                                                handleInputChange('hours', newHours);
                                                            }}
                                                            style={{ ...inputStyle, width: 'auto', padding: '6px 10px', fontSize: '13px' }}
                                                        />
                                                        <span style={{ color: 'var(--text-secondary)' }}>a</span>
                                                        <input
                                                            type="time"
                                                            value={dayConfig.close || '23:00'}
                                                            onChange={(e) => {
                                                                const newHours = { ...formData.hours };
                                                                newHours[day] = { ...newHours[day], close: e.target.value };
                                                                handleInputChange('hours', newHours);
                                                            }}
                                                            style={{ ...inputStyle, width: 'auto', padding: '6px 10px', fontSize: '13px' }}
                                                        />
                                                    </div>
                                                ) : (
                                                    // Split Shift Mode
                                                    <div style={{ display: 'grid', gap: '12px' }}>
                                                        {/* Shift 1 */}
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                            <span style={{ fontSize: '13px', color: 'var(--text-secondary)', minWidth: '60px' }}>Turno 1:</span>
                                                            <input
                                                                type="time"
                                                                value={dayConfig.open || '09:00'}
                                                                onChange={(e) => {
                                                                    const newHours = { ...formData.hours };
                                                                    newHours[day] = { ...newHours[day], open: e.target.value };
                                                                    handleInputChange('hours', newHours);
                                                                }}
                                                                style={{ ...inputStyle, width: 'auto', padding: '6px 10px', fontSize: '13px' }}
                                                            />
                                                            <span style={{ color: 'var(--text-secondary)' }}>a</span>
                                                            <input
                                                                type="time"
                                                                value={dayConfig.breakStart || '13:00'}
                                                                onChange={(e) => {
                                                                    const newHours = { ...formData.hours };
                                                                    newHours[day] = { ...newHours[day], breakStart: e.target.value };
                                                                    handleInputChange('hours', newHours);
                                                                }}
                                                                style={{ ...inputStyle, width: 'auto', padding: '6px 10px', fontSize: '13px' }}
                                                            />
                                                        </div>

                                                        {/* Shift 2 */}
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                            <span style={{ fontSize: '13px', color: 'var(--text-secondary)', minWidth: '60px' }}>Turno 2:</span>
                                                            <input
                                                                type="time"
                                                                value={dayConfig.breakEnd || '16:00'}
                                                                onChange={(e) => {
                                                                    const newHours = { ...formData.hours };
                                                                    newHours[day] = { ...newHours[day], breakEnd: e.target.value };
                                                                    handleInputChange('hours', newHours);
                                                                }}
                                                                style={{ ...inputStyle, width: 'auto', padding: '6px 10px', fontSize: '13px' }}
                                                            />
                                                            <span style={{ color: 'var(--text-secondary)' }}>a</span>
                                                            <input
                                                                type="time"
                                                                value={dayConfig.close || '20:00'}
                                                                onChange={(e) => {
                                                                    const newHours = { ...formData.hours };
                                                                    newHours[day] = { ...newHours[day], close: e.target.value };
                                                                    handleInputChange('hours', newHours);
                                                                }}
                                                                style={{ ...inputStyle, width: 'auto', padding: '6px 10px', fontSize: '13px' }}
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                        <button
                            onClick={() => handleSave({ hours: formData.hours })}
                            style={saveButtonStyle}
                            disabled={saving}
                        >
                            {saving ? 'Guardando...' : 'Guardar Horarios'}
                        </button>
                    </div>
                );
            case 'rules':
                return (
                    <div style={{ display: 'grid', gap: '20px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div>
                                <label style={labelStyle}>Mín. Anticipación (días)</label>
                                <input
                                    type="number"
                                    style={inputStyle}
                                    min="0"
                                    value={formData.min_advance_days ?? 0}
                                    onChange={(e) => {
                                        const val = e.target.value === '' ? 0 : parseInt(e.target.value);
                                        handleInputChange('min_advance_days', isNaN(val) ? 0 : val);
                                    }}
                                />
                                <p style={hintStyle}>Garantiza que no te reserven sobre la hora.</p>
                            </div>
                            <div>
                                <label style={labelStyle}>Máx. Anticipación (días)</label>
                                <input
                                    type="number"
                                    style={inputStyle}
                                    min="1"
                                    value={formData.max_advance_days ?? 30}
                                    onChange={(e) => {
                                        const val = e.target.value === '' ? 1 : parseInt(e.target.value);
                                        handleInputChange('max_advance_days', isNaN(val) ? 30 : val);
                                    }}
                                />
                                <p style={hintStyle}>Hasta qué fecha pueden reservar.</p>
                            </div>
                        </div>
                        <div>
                            <label style={labelStyle}>Política de Cancelación (horas)</label>
                            <input
                                type="number"
                                style={inputStyle}
                                min="0"
                                value={formData.cancellation_limit_hours ?? 24}
                                onChange={(e) => {
                                    const val = e.target.value === '' ? 0 : parseInt(e.target.value);
                                    handleInputChange('cancellation_limit_hours', isNaN(val) ? 24 : val);
                                }}
                            />
                            <p style={hintStyle}>Tiempo límite para que el cliente cancele por su cuenta.</p>
                        </div>
                        <button
                            onClick={() => handleSave({
                                min_advance_days: formData.min_advance_days,
                                max_advance_days: formData.max_advance_days,
                                cancellation_limit_hours: formData.cancellation_limit_hours
                            })}
                            style={saveButtonStyle}
                            disabled={saving}
                        >
                            {saving ? 'Guardando...' : 'Guardar Reglas'}
                        </button>
                    </div>
                );
            case 'payments':
                return (
                    <div style={{ display: 'grid', gap: '24px' }}>
                        <div>
                            <label style={labelStyle}>Requiere Seña (%)</label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    step="5"
                                    style={{ flex: 1 }}
                                    value={formData.deposit_percentage ?? 0}
                                    onChange={(e) => handleInputChange('deposit_percentage', parseInt(e.target.value) || 0)}
                                />
                                <span style={{ fontWeight: '700', fontSize: '18px', width: '50px' }}>{formData.deposit_percentage ?? 0}%</span>
                            </div>
                            <p style={hintStyle}>Dejá en 0% si no cobrás seña previa.</p>
                        </div>
                        <div>
                            <label style={labelStyle}>Información de Pago (WhatsApp)</label>
                            <textarea
                                style={{ ...inputStyle, height: '100px', resize: 'none' }}
                                value={formData.payment_instructions ?? ''}
                                onChange={(e) => handleInputChange('payment_instructions', e.target.value)}
                                placeholder="Ej: Podes transferir al Alias: PADDLE.BOX.OK. Enviame el comprobante por acá."
                            />
                            <p style={hintStyle}>Este texto se incluirá en el mensaje automático de WhatsApp al reservar.</p>
                        </div>
                        <button
                            onClick={() => handleSave({
                                deposit_percentage: formData.deposit_percentage,
                                payment_instructions: formData.payment_instructions
                            })}
                            style={saveButtonStyle}
                            disabled={saving}
                        >
                            {saving ? 'Guardando...' : 'Guardar Pagos'}
                        </button>
                    </div>
                );
            case 'contact':
                return (
                    <div style={{ display: 'grid', gap: '20px' }}>
                        <div>
                            <label style={labelStyle}>WhatsApp de Reservas</label>
                            <input
                                type="tel"
                                style={inputStyle}
                                value={formData.whatsapp ?? ''}
                                placeholder="Ej: 3804123456"
                                onChange={(e) => handleInputChange('whatsapp', e.target.value)}
                            />
                        </div>
                        <div>
                            <label style={labelStyle}>Instagram (Usuario)</label>
                            <div style={{ position: 'relative' }}>
                                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}>@</span>
                                <input
                                    type="text"
                                    style={{ ...inputStyle, paddingLeft: '32px' }}
                                    value={formData.instagram ?? ''}
                                    onChange={(e) => handleInputChange('instagram', e.target.value)}
                                />
                            </div>
                        </div>
                        <div>
                            <label style={labelStyle}>Facebook (URL)</label>
                            <input
                                type="text"
                                style={inputStyle}
                                value={formData.facebook ?? ''}
                                onChange={(e) => handleInputChange('facebook', e.target.value)}
                            />
                        </div>
                        <button
                            onClick={() => handleSave({
                                whatsapp: formData.whatsapp,
                                instagram: formData.instagram,
                                facebook: formData.facebook
                            })}
                            style={saveButtonStyle}
                            disabled={saving}
                        >
                            {saving ? 'Guardando...' : 'Guardar Contacto'}
                        </button>
                    </div>
                );

            case 'linkbio':
                return (
                    <div style={{ display: 'grid', gap: '24px' }}>
                        <div>
                            <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '8px', color: 'var(--text-primary)' }}>
                                Link Bio
                            </h3>
                            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
                                Personaliza tu página de perfil público con enlaces y redes sociales.
                            </p>

                            {/* Description */}
                            <div style={{ marginBottom: '24px' }}>
                                <label style={labelStyle}>Descripción del Perfil</label>
                                <textarea
                                    value={formData.description || ''}
                                    onChange={(e) => handleInputChange('description', e.target.value)}
                                    placeholder="Describe tu negocio..."
                                    maxLength={500}
                                    style={{
                                        ...inputStyle,
                                        minHeight: '100px',
                                        resize: 'vertical',
                                        fontFamily: 'inherit'
                                    }}
                                />
                                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', textAlign: 'right' }}>
                                    {(formData.description || '').length}/500
                                </div>
                            </div>

                            {/* Social Media */}
                            <div style={{ marginBottom: '24px' }}>
                                <label style={labelStyle}>Redes Sociales</label>
                                <div style={{ display: 'grid', gap: '12px' }}>
                                    <div>
                                        <label style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style={{ color: '#E1306C' }}>
                                                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                                            </svg>
                                            Instagram
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.instagram || ''}
                                            onChange={(e) => handleInputChange('instagram', e.target.value)}
                                            placeholder="@usuario o URL completa"
                                            style={inputStyle}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style={{ color: '#1877F2' }}>
                                                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                                            </svg>
                                            Facebook
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.facebook || ''}
                                            onChange={(e) => handleInputChange('facebook', e.target.value)}
                                            placeholder="URL de tu página"
                                            style={inputStyle}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style={{ color: '#000000' }}>
                                                <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
                                            </svg>
                                            TikTok
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.tiktok || ''}
                                            onChange={(e) => handleInputChange('tiktok', e.target.value)}
                                            placeholder="@usuario o URL completa"
                                            style={inputStyle}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style={{ color: '#25D366' }}>
                                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                                            </svg>
                                            WhatsApp
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.whatsapp || ''}
                                            onChange={(e) => handleInputChange('whatsapp', e.target.value)}
                                            placeholder="Número con código de país (ej: 5491123456789)"
                                            style={inputStyle}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <circle cx="12" cy="12" r="10" />
                                                <line x1="2" y1="12" x2="22" y2="12" />
                                                <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
                                            </svg>
                                            Sitio Web
                                        </label>
                                        <input
                                            type="url"
                                            value={formData.website || ''}
                                            onChange={(e) => handleInputChange('website', e.target.value)}
                                            placeholder="https://tusitio.com"
                                            style={inputStyle}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Save Button */}
                            <button
                                onClick={() => handleSave()}
                                style={saveButtonStyle}
                                disabled={saving}
                            >
                                {saving ? 'Guardando...' : 'Guardar Link Bio'}
                            </button>
                        </div>
                    </div>
                );

            case 'gallery':
                const highlights = formData.gallery_highlights || [];
                return (
                    <div style={{ display: 'grid', gap: '24px' }}>
                        {/* Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '4px', color: 'var(--text-primary)' }}>
                                    Destacadas ({highlights.length}/10)
                                </h3>
                                <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                                    Crea categorías de fotos estilo Instagram
                                </p>
                            </div>
                            <button
                                onClick={createHighlight}
                                disabled={highlights.length >= 10}
                                style={{
                                    ...saveButtonStyle,
                                    width: 'auto',
                                    margin: 0,
                                    padding: '8px 16px',
                                    fontSize: '13px',
                                    opacity: highlights.length >= 10 ? 0.5 : 1,
                                    cursor: highlights.length >= 10 ? 'not-allowed' : 'pointer'
                                }}
                            >
                                ＋ Nueva Destacada
                            </button>
                        </div>

                        {/* Highlights List */}
                        {highlights.length === 0 ? (
                            <div style={{
                                padding: '40px',
                                border: '2px dashed var(--border)',
                                borderRadius: '16px',
                                textAlign: 'center',
                                background: 'var(--bg-main)'
                            }}>
                                <div style={{ fontSize: '48px', marginBottom: '16px' }}>📸</div>
                                <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                                    Aún no has creado destacadas
                                </p>
                                <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                    Crea categorías como "Manicura", "Pedicura", etc.
                                </p>
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gap: '12px' }}>
                                {highlights.map((highlight, index) => (
                                    <div
                                        key={highlight.id}
                                        style={{
                                            background: 'var(--bg-main)',
                                            border: '1px solid var(--border)',
                                            borderRadius: '12px',
                                            padding: '16px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '16px'
                                        }}
                                    >
                                        {/* Thumbnail */}
                                        <div style={{
                                            width: '60px',
                                            height: '60px',
                                            borderRadius: '50%',
                                            overflow: 'hidden',
                                            background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)',
                                            padding: '3px',
                                            flexShrink: 0
                                        }}>
                                            <div style={{
                                                width: '100%',
                                                height: '100%',
                                                borderRadius: '50%',
                                                background: 'var(--bg-card)',
                                                padding: '2px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}>
                                                {highlight.cover_image ? (
                                                    <img
                                                        src={highlight.cover_image}
                                                        alt={highlight.title}
                                                        style={{
                                                            width: '100%',
                                                            height: '100%',
                                                            objectFit: 'cover',
                                                            borderRadius: '50%'
                                                        }}
                                                    />
                                                ) : (
                                                    <span style={{ fontSize: '24px' }}>📷</span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Info */}
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: '700', fontSize: '14px', color: 'var(--text-primary)' }}>
                                                {highlight.title}
                                            </div>
                                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                                {highlight.images.length} foto{highlight.images.length !== 1 ? 's' : ''}
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button
                                                onClick={() => setEditingHighlight(highlight)}
                                                style={{
                                                    ...buttonSecondaryStyle,
                                                    padding: '6px 12px',
                                                    fontSize: '12px'
                                                }}
                                            >
                                                Editar
                                            </button>
                                            <button
                                                onClick={() => deleteHighlight(highlight.id)}
                                                style={{
                                                    ...buttonSecondaryStyle,
                                                    padding: '6px 12px',
                                                    fontSize: '12px',
                                                    background: 'rgba(255, 68, 68, 0.1)',
                                                    color: '#ff4444'
                                                }}
                                            >
                                                Borrar
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Edit Modal */}
                        {editingHighlight && (
                            <div style={{
                                position: 'fixed',
                                inset: 0,
                                background: 'rgba(0,0,0,0.5)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                zIndex: 9999,
                                padding: '20px'
                            }}
                                onClick={() => setEditingHighlight(null)}
                            >
                                <div
                                    style={{
                                        background: 'var(--bg-card)',
                                        borderRadius: '16px',
                                        padding: '24px',
                                        maxWidth: '600px',
                                        width: '100%',
                                        maxHeight: '90vh',
                                        overflow: 'auto'
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                        <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)' }}>
                                            {editingHighlight.images.length > 0 ? 'Editar' : 'Nueva'} Destacada
                                        </h3>
                                        <button
                                            onClick={() => setEditingHighlight(null)}
                                            style={{
                                                background: 'transparent',
                                                border: 'none',
                                                fontSize: '24px',
                                                cursor: 'pointer',
                                                color: 'var(--text-secondary)'
                                            }}
                                        >
                                            ×
                                        </button>
                                    </div>

                                    {/* Title Input */}
                                    <div style={{ marginBottom: '20px' }}>
                                        <label style={labelStyle}>Título</label>
                                        <input
                                            type="text"
                                            value={editingHighlight.title}
                                            onChange={(e) => setEditingHighlight({ ...editingHighlight, title: e.target.value })}
                                            placeholder="Ej: Manicura, Pedicura, etc."
                                            maxLength={20}
                                            style={inputStyle}
                                        />
                                        <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                            {editingHighlight.title.length}/20
                                        </p>
                                    </div>

                                    {/* Images */}
                                    <div style={{ marginBottom: '20px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                            <label style={labelStyle}>Fotos ({editingHighlight.images.length}/20)</label>
                                            <label style={{
                                                ...saveButtonStyle,
                                                width: 'auto',
                                                margin: 0,
                                                padding: '6px 12px',
                                                fontSize: '12px',
                                                cursor: uploadingHighlightImages ? 'not-allowed' : 'pointer',
                                                opacity: uploadingHighlightImages ? 0.7 : 1
                                            }}>
                                                <input
                                                    type="file"
                                                    multiple
                                                    accept="image/*"
                                                    onChange={(e) => uploadHighlightImages(e, editingHighlight)}
                                                    style={{ display: 'none' }}
                                                    disabled={uploadingHighlightImages}
                                                />
                                                {uploadingHighlightImages ? 'Subiendo...' : '＋ Subir'}
                                            </label>
                                        </div>

                                        {editingHighlight.images.length === 0 ? (
                                            <div style={{
                                                padding: '30px',
                                                border: '2px dashed var(--border)',
                                                borderRadius: '12px',
                                                textAlign: 'center',
                                                background: 'var(--bg-main)'
                                            }}>
                                                <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                                    Sube fotos para esta destacada
                                                </p>
                                            </div>
                                        ) : (
                                            <div style={{
                                                display: 'grid',
                                                gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
                                                gap: '8px'
                                            }}>
                                                {editingHighlight.images.map((url, idx) => (
                                                    <div
                                                        key={idx}
                                                        style={{
                                                            position: 'relative',
                                                            aspectRatio: '1',
                                                            borderRadius: '8px',
                                                            overflow: 'hidden',
                                                            border: editingHighlight.cover_image === url ? '3px solid var(--primary-paddle)' : '1px solid var(--border)'
                                                        }}
                                                    >
                                                        <img
                                                            src={url}
                                                            alt={`Foto ${idx + 1}`}
                                                            style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }}
                                                            onClick={() => setCoverImage(editingHighlight, url)}
                                                        />
                                                        <button
                                                            onClick={() => removeHighlightImage(editingHighlight, url)}
                                                            style={{
                                                                position: 'absolute',
                                                                top: '4px',
                                                                right: '4px',
                                                                width: '20px',
                                                                height: '20px',
                                                                borderRadius: '50%',
                                                                background: 'rgba(255, 68, 68, 0.9)',
                                                                color: 'white',
                                                                border: 'none',
                                                                cursor: 'pointer',
                                                                fontSize: '12px',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center'
                                                            }}
                                                        >
                                                            ×
                                                        </button>
                                                        {editingHighlight.cover_image === url && (
                                                            <div style={{
                                                                position: 'absolute',
                                                                bottom: '4px',
                                                                left: '4px',
                                                                background: 'var(--primary-paddle)',
                                                                color: 'white',
                                                                fontSize: '9px',
                                                                padding: '2px 6px',
                                                                borderRadius: '4px',
                                                                fontWeight: '700'
                                                            }}>
                                                                PORTADA
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        {editingHighlight.images.length > 0 && (
                                            <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '8px' }}>
                                                💡 Click en una foto para establecerla como portada
                                            </p>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                                        <button
                                            onClick={() => setEditingHighlight(null)}
                                            style={buttonSecondaryStyle}
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            onClick={() => saveHighlight(editingHighlight)}
                                            disabled={!editingHighlight.title || editingHighlight.images.length === 0}
                                            style={{
                                                ...saveButtonStyle,
                                                opacity: (!editingHighlight.title || editingHighlight.images.length === 0) ? 0.5 : 1,
                                                cursor: (!editingHighlight.title || editingHighlight.images.length === 0) ? 'not-allowed' : 'pointer'
                                            }}
                                        >
                                            Guardar
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                );

            case 'rules':
                const rules = formData.booking_rules || {};
                const advanceBooking = rules.advance_booking || { min_hours: 2, max_days: 30 };
                const cancellation = rules.cancellation || { deadline_hours: 24, refund_policy: 'full' };
                const limits = rules.limits || { max_per_day: 5, max_per_week: 20 };
                const timeRules = rules.time || { min_duration: 60, max_duration: 240, buffer_minutes: 0 };
                const requirements = rules.requirements || { phone_required: true, email_verification: false, terms_text: '' };

                return (
                    <div style={{ display: 'grid', gap: '24px' }}>
                        <div>
                            <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '8px', color: 'var(--text-primary)' }}>
                                Reglas de Reserva
                            </h3>
                            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
                                Configura las políticas y restricciones para las reservas de tu negocio.
                            </p>

                            {/* Advance Booking */}
                            <div style={{ marginBottom: '24px', padding: '20px', background: 'var(--bg-main)', borderRadius: '12px' }}>
                                <h4 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '16px', color: 'var(--text-primary)' }}>
                                    ⏰ Reserva Anticipada
                                </h4>
                                <div style={{ display: 'grid', gap: '12px', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr' }}>
                                    <div>
                                        <label style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
                                            Mínimo de horas de anticipación
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={advanceBooking.min_hours}
                                            onChange={(e) => handleInputChange('booking_rules', {
                                                ...rules,
                                                advance_booking: { ...advanceBooking, min_hours: parseInt(e.target.value) || 0 }
                                            })}
                                            style={inputStyle}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
                                            Máximo de días de anticipación
                                        </label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="365"
                                            value={advanceBooking.max_days}
                                            onChange={(e) => handleInputChange('booking_rules', {
                                                ...rules,
                                                advance_booking: { ...advanceBooking, max_days: parseInt(e.target.value) || 30 }
                                            })}
                                            style={inputStyle}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Cancellation Policy */}
                            <div style={{ marginBottom: '24px', padding: '20px', background: 'var(--bg-main)', borderRadius: '12px' }}>
                                <h4 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '16px', color: 'var(--text-primary)' }}>
                                    ❌ Política de Cancelación
                                </h4>
                                <div style={{ display: 'grid', gap: '12px', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr' }}>
                                    <div>
                                        <label style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
                                            Plazo de cancelación (horas antes)
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={cancellation.deadline_hours}
                                            onChange={(e) => handleInputChange('booking_rules', {
                                                ...rules,
                                                cancellation: { ...cancellation, deadline_hours: parseInt(e.target.value) || 0 }
                                            })}
                                            style={inputStyle}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
                                            Política de reembolso
                                        </label>
                                        <select
                                            value={cancellation.refund_policy}
                                            onChange={(e) => handleInputChange('booking_rules', {
                                                ...rules,
                                                cancellation: { ...cancellation, refund_policy: e.target.value }
                                            })}
                                            style={inputStyle}
                                        >
                                            <option value="full">Reembolso completo</option>
                                            <option value="partial">Reembolso parcial</option>
                                            <option value="none">Sin reembolso</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Booking Limits */}
                            <div style={{ marginBottom: '24px', padding: '20px', background: 'var(--bg-main)', borderRadius: '12px' }}>
                                <h4 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '16px', color: 'var(--text-primary)' }}>
                                    📊 Límites de Reserva
                                </h4>
                                <div style={{ display: 'grid', gap: '12px', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr' }}>
                                    <div>
                                        <label style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
                                            Máximo por cliente por día
                                        </label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={limits.max_per_day}
                                            onChange={(e) => handleInputChange('booking_rules', {
                                                ...rules,
                                                limits: { ...limits, max_per_day: parseInt(e.target.value) || 1 }
                                            })}
                                            style={inputStyle}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
                                            Máximo por cliente por semana
                                        </label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={limits.max_per_week}
                                            onChange={(e) => handleInputChange('booking_rules', {
                                                ...rules,
                                                limits: { ...limits, max_per_week: parseInt(e.target.value) || 1 }
                                            })}
                                            style={inputStyle}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Time Restrictions */}
                            <div style={{ marginBottom: '24px', padding: '20px', background: 'var(--bg-main)', borderRadius: '12px' }}>
                                <h4 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '16px', color: 'var(--text-primary)' }}>
                                    ⏱️ Restricciones de Tiempo
                                </h4>
                                <div style={{ display: 'grid', gap: '12px' }}>
                                    <div>
                                        <label style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
                                            Tiempo de espera entre turnos (minutos)
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={timeRules.buffer_minutes}
                                            onChange={(e) => handleInputChange('booking_rules', {
                                                ...rules,
                                                time: { ...timeRules, buffer_minutes: parseInt(e.target.value) || 0 }
                                            })}
                                            style={inputStyle}
                                        />
                                        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                            Tiempo de limpieza/preparación entre turnos
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Save Button */}
                            <button
                                onClick={() => handleSave()}
                                style={saveButtonStyle}
                                disabled={saving}
                            >
                                {saving ? 'Guardando...' : 'Guardar Reglas'}
                            </button>
                        </div>
                    </div>
                );

            case 'payments':
                const paymentSettings = formData.payment_settings || {};
                const deposit = paymentSettings.deposit || { enabled: false, type: 'percentage', percentage: 30, fixed_amount: 0 };
                const methods = paymentSettings.methods || [{ type: 'cash', enabled: true }];
                const instructions = paymentSettings.instructions || '';

                return (
                    <div style={{ display: 'grid', gap: '24px' }}>
                        <div>
                            <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '8px', color: 'var(--text-primary)' }}>
                                Pagos y Señas
                            </h3>
                            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
                                Configura los métodos de pago y requisitos de seña para las reservas.
                            </p>

                            {/* Deposit Configuration */}
                            <div style={{ marginBottom: '24px', padding: '20px', background: 'var(--bg-main)', borderRadius: '12px' }}>
                                <h4 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '16px', color: 'var(--text-primary)' }}>
                                    💵 Configuración de Seña
                                </h4>

                                <div style={{ marginBottom: '16px' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                        <input
                                            type="checkbox"
                                            checked={deposit.enabled}
                                            onChange={(e) => handleInputChange('payment_settings', {
                                                ...paymentSettings,
                                                deposit: { ...deposit, enabled: e.target.checked }
                                            })}
                                            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                        />
                                        <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>
                                            Requerir seña para reservas
                                        </span>
                                    </label>
                                </div>

                                {deposit.enabled && (
                                    <div style={{ display: 'grid', gap: '12px' }}>
                                        <div>
                                            <label style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
                                                Tipo de seña
                                            </label>
                                            <select
                                                value={deposit.type}
                                                onChange={(e) => handleInputChange('payment_settings', {
                                                    ...paymentSettings,
                                                    deposit: { ...deposit, type: e.target.value }
                                                })}
                                                style={inputStyle}
                                            >
                                                <option value="percentage">Porcentaje del total</option>
                                                <option value="fixed">Monto fijo</option>
                                            </select>
                                        </div>

                                        {deposit.type === 'percentage' ? (
                                            <div>
                                                <label style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
                                                    Porcentaje de seña (%)
                                                </label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max="100"
                                                    value={deposit.percentage}
                                                    onChange={(e) => handleInputChange('payment_settings', {
                                                        ...paymentSettings,
                                                        deposit: { ...deposit, percentage: parseInt(e.target.value) || 30 }
                                                    })}
                                                    style={inputStyle}
                                                />
                                            </div>
                                        ) : (
                                            <div>
                                                <label style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
                                                    Monto fijo de seña ($)
                                                </label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={deposit.fixed_amount}
                                                    onChange={(e) => handleInputChange('payment_settings', {
                                                        ...paymentSettings,
                                                        deposit: { ...deposit, fixed_amount: parseInt(e.target.value) || 0 }
                                                    })}
                                                    style={inputStyle}
                                                />
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Payment Methods */}
                            <div style={{ marginBottom: '24px', padding: '20px', background: 'var(--bg-main)', borderRadius: '12px' }}>
                                <h4 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '16px', color: 'var(--text-primary)' }}>
                                    💳 Métodos de Pago Aceptados
                                </h4>

                                <div style={{ display: 'grid', gap: '12px' }}>
                                    {['cash', 'transfer', 'mercadopago', 'card'].map(methodType => {
                                        const method = methods.find(m => m.type === methodType) || { type: methodType, enabled: false };
                                        const methodLabels = {
                                            cash: '💵 Efectivo',
                                            transfer: '🏦 Transferencia Bancaria',
                                            mercadopago: '💰 MercadoPago',
                                            card: '💳 Tarjeta de Crédito/Débito'
                                        };

                                        return (
                                            <label key={methodType} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={method.enabled}
                                                    onChange={(e) => {
                                                        const newMethods = methods.filter(m => m.type !== methodType);
                                                        if (e.target.checked) {
                                                            newMethods.push({ type: methodType, enabled: true });
                                                        }
                                                        handleInputChange('payment_settings', {
                                                            ...paymentSettings,
                                                            methods: newMethods
                                                        });
                                                    }}
                                                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                                />
                                                <span style={{ fontSize: '14px', color: 'var(--text-primary)' }}>
                                                    {methodLabels[methodType]}
                                                </span>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Payment Instructions */}
                            <div style={{ marginBottom: '24px' }}>
                                <label style={labelStyle}>Instrucciones de Pago</label>
                                <textarea
                                    value={instructions}
                                    onChange={(e) => handleInputChange('payment_settings', {
                                        ...paymentSettings,
                                        instructions: e.target.value
                                    })}
                                    placeholder="Ej: CBU: 1234567890123456789012, Alias: mi.alias.mp, etc."
                                    style={{
                                        ...inputStyle,
                                        minHeight: '100px',
                                        resize: 'vertical',
                                        fontFamily: 'inherit'
                                    }}
                                />
                                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                    Incluye datos bancarios, alias, links de MercadoPago, etc.
                                </p>
                            </div>

                            {/* Save Button */}
                            <button
                                onClick={() => handleSave()}
                                style={saveButtonStyle}
                                disabled={saving}
                            >
                                {saving ? 'Guardando...' : 'Guardar Configuración de Pagos'}
                            </button>
                        </div>
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            background: 'var(--bg-card)',
            borderRadius: '24px',
            border: '1px solid var(--border)',
            overflow: 'hidden'
        }}>
            {/* Header */}
            <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: '22px', fontWeight: '800' }}>Configuración</h2>
                    <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: 'var(--text-secondary)' }}>Personaliza tu portal y reglas de negocio</p>
                </div>
            </div>

            {/* Content Body */}
            {isMobile ? (
                // Mobile/Tablet: Accordion Style
                <div style={{ flex: 1, overflowY: 'auto' }}>
                    {tabs.map(tab => {
                        const isOpen = activeTab === tab.id;
                        return (
                            <div key={tab.id} style={{
                                borderBottom: '1px solid var(--border)',
                                background: 'var(--bg-card)'
                            }}>
                                {/* Accordion Header */}
                                <button
                                    onClick={() => setActiveTab(isOpen ? '' : tab.id)}
                                    style={{
                                        width: '100%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '16px 20px',
                                        border: 'none',
                                        background: isOpen ? 'rgba(0,0,0,0.03)' : 'transparent',
                                        color: 'var(--text-primary)',
                                        cursor: 'pointer',
                                        fontSize: '15px',
                                        fontWeight: '600',
                                        textAlign: 'left',
                                        transition: 'background 0.2s'
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <span style={{ fontSize: '20px' }}>{tab.icon}</span>
                                        <span>{tab.label}</span>
                                    </div>
                                    <span style={{
                                        fontSize: '18px',
                                        transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                                        transition: 'transform 0.2s'
                                    }}>
                                        ▼
                                    </span>
                                </button>

                                {/* Accordion Content */}
                                {isOpen && (
                                    <div style={{
                                        padding: '24px 20px',
                                        background: 'var(--bg-main)',
                                        borderTop: '1px solid var(--border)'
                                    }}>
                                        {renderTabContent()}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            ) : (
                // Desktop: Sidebar + Content
                <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
                    {/* Desktop Sidebar */}
                    <div style={{
                        width: '240px',
                        borderRight: '1px solid var(--border)',
                        padding: '12px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                        backgroundColor: 'rgba(0,0,0,0.01)'
                    }}>
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    padding: '12px 16px',
                                    borderRadius: '12px',
                                    border: 'none',
                                    background: activeTab === tab.id ? 'rgba(0,0,0,0.05)' : 'transparent',
                                    color: activeTab === tab.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                                    cursor: 'pointer',
                                    fontWeight: activeTab === tab.id ? '700' : '600',
                                    fontSize: '14px',
                                    textAlign: 'left',
                                    whiteSpace: 'nowrap',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <span style={{ fontSize: '18px' }}>{tab.icon}</span>
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Desktop Content Panel */}
                    <div style={{ flex: 1, padding: '32px 48px', overflowY: 'auto', maxWidth: '800px' }}>
                        {renderTabContent()}
                    </div>
                </div>
            )}

            {/* Render Plan Management Modal */}
            {showPlanModal && <PlanManagementModal />}
        </div>
    );
}

// Internal Styles
const labelStyle = {
    display: 'block',
    fontSize: '12px',
    fontWeight: '700',
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    marginBottom: '8px',
    letterSpacing: '0.5px'
};

const inputStyle = {
    width: '100%',
    padding: '12px 16px',
    borderRadius: '12px',
    border: '1px solid var(--border)',
    background: 'var(--bg-main)',
    color: 'var(--text-primary)',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.2s'
};

const hintStyle = {
    fontSize: '11px',
    color: 'var(--text-secondary)',
    margin: '6px 0 0 4px'
};

const saveButtonStyle = {
    marginTop: '20px',
    padding: '12px 24px',
    borderRadius: '12px',
    border: 'none',
    background: 'var(--primary-paddle)',
    color: '#000',
    fontWeight: '700',
    fontSize: '15px',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(0,230,118,0.2)',
    width: '100%',
    textAlign: 'center'
};

const buttonSecondaryStyle = {
    display: 'inline-block',
    padding: '8px 16px',
    borderRadius: '10px',
    border: '1px solid var(--border)',
    background: 'var(--bg-main)',
    color: 'var(--text-primary)',
    fontSize: '13px',
    fontWeight: '700',
    cursor: 'pointer'
};
