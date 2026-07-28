import React, { useState, useEffect } from 'react';
import serviceAdapter from '../services/serviceAdapter';
import { useNotification } from '../contexts/NotificationContext';
import SubscriptionManager from './SubscriptionManager';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

function LocationPicker({ position, onLocationSelect }) {
    const map = useMapEvents({
        click(e) {
            onLocationSelect(e.latlng);
        },
    });

    return position ? <Marker position={position} /> : null;
}

export default function BusinessSettings({ business, onUpdate, isMobile }) {
    const { showToast, showConfirm, showAlert } = useNotification();
    const [activeTab, setActiveTab] = useState('general');

    // Scroll to top of settings page whenever changing active settings tab
    useEffect(() => {
        window.scrollTo(0, 0);
    }, [activeTab]);
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

    // Amenities management
    const [newAmenity, setNewAmenity] = useState('');

    // Services management
    const [newService, setNewService] = useState({ name: '', price: '', duration: '60', description: '', category: '', image_url: null });
    const [newCategory, setNewCategory] = useState('');

    // Service-Specialist Assignments
    const [serviceSpecialists, setServiceSpecialists] = useState({}); // { serviceId: [specialistId1, ...] }

    // Fetch specialist assignments when services tab is active
    useEffect(() => {
        if (activeTab === 'services' && formData.services?.length > 0) {
            const fetchAssignments = async () => {
                const assignments = {};
                // Parallelize fetching
                await Promise.all(formData.services.map(async (service) => {
                    // Only for existing services (with ID)
                    if (service.id) {
                        try {
                            const specialists = await serviceAdapter.getQualifiedSpecialists(service.id);
                            assignments[service.id] = specialists.map(s => s.id);
                        } catch (err) {
                            console.error(`Error fetching specialists for service ${service.id}:`, err);
                        }
                    }
                }));
                // Only update if we have data to avoid wiping state on quick tab switches if fetch is slow
                if (Object.keys(assignments).length > 0) {
                    setServiceSpecialists(prev => ({ ...prev, ...assignments }));
                }
            };
            fetchAssignments();
        }
    }, [activeTab]); // Run when entering tab

    useEffect(() => {
        if (business) {
            // Only update form data if we switched to a different business
            // or if it's the first load. We compare IDs.
            setFormData(prev => {
                if (prev.id === business.id) return prev; // Don't overwrite local changes if same business
                return {
                    ...business,
                    // Initialize gallery_highlights if it doesn't exist
                    gallery_highlights: business?.gallery_highlights || []
                };
            });
        }
    }, [business?.id]); // Only re-run if business ID changes

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

            // Validate subscription limits for specialists or courts
            if (dataToSave.specialists || dataToSave.courts) {
                const businessType = formData?.type || business?.type;
                const resourceCount = dataToSave.specialists?.length || dataToSave.courts?.length || 0;

                if (resourceCount > 0 && business?.id) {
                    try {
                        const currentSub = await serviceAdapter.getSubscription(business.id);

                        const allowedSpaces = Math.max(
                            currentSub?.spaces_included || 0,
                            business?.capacity || 0,
                            business?.resources_count || 0,
                            business?.courts?.length || 0,
                            business?.specialists?.length || 0,
                            formData?.courts?.length || 0,
                            formData?.specialists?.length || 0,
                            2
                        );

                        if (currentSub && resourceCount > allowedSpaces) {
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

            // Save service-specialist assignments for services that have IDs
            if (activeTab === 'services' && Object.keys(serviceSpecialists).length > 0) {
                const updatePromises = [];
                for (const service of (dataToSave.services || [])) {
                    // Only update if service has ID and we have local changes/data for it
                    if (service.id && serviceSpecialists[service.id]) {
                        updatePromises.push(
                            serviceAdapter.updateServiceSpecialists(service.id, serviceSpecialists[service.id])
                        );
                    }
                }

                if (updatePromises.length > 0) {
                    await Promise.all(updatePromises);
                }
            }

            // Manually construct the updated object for local state sync
            const updated = { ...business, ...dataToSave };

            onUpdate(updated);
            showToast('Configuración guardada correctamente', 'success');
        } catch (error) {
            console.error('Error saving settings:', error);
            showToast(`Error al guardar: ${error.message || 'Desconocido'}`, 'error');
        } finally {
            setSaving(false);
        }
    };

    const categoryName = (formData?.categories?.name || formData?.category || business?.categories?.name || '').toLowerCase();
    const subcatName = (formData?.subcategories?.[0]?.name || formData?.subcategories?.[0]?.slug || '').toLowerCase();
    const bType = (formData?.type || business?.type || '').toLowerCase();

    const isSport = bType === 'sport' || categoryName.includes('deporte') || subcatName.includes('futbol') || subcatName.includes('padel') || ((formData?.courts?.length || 0) > 0);
    const isServiceBusiness = bType === 'service' || categoryName.includes('belleza') || categoryName.includes('salud') || ((formData?.specialists?.length || 0) > 0);
    const isRentalBusiness = (bType === 'venue' || bType === 'alquiler' || categoryName.includes('alquiler')) && !isSport && !isServiceBusiness;

    const getResourceLabel = () => {
        if (isSport) return 'Canchas / Espacios';
        return 'Profesionales / Staff';
    };

    const tabs = [
        { id: 'general', label: 'General', icon: '🏢' },
        { id: 'design', label: 'Diseño', icon: '🎨' },
        { id: 'subscription', label: isSport ? 'Plan y Canchas' : (isServiceBusiness ? 'Plan y Especialistas' : 'Suscripción'), icon: '💳' },
        ...(isServiceBusiness ? [{ id: 'services', label: 'Servicios', icon: '💼' }] : []),
        ...(isRentalBusiness ? [{ id: 'rental', label: 'Alquiler', icon: '🔑' }] : []),
        { id: 'schedule', label: 'Horarios', icon: '⏰' },
        { id: 'policies_and_payments', label: 'Políticas y Pagos', icon: '📜' },
        { id: 'special_days', label: 'Días Especiales', icon: '📅' },
        { id: 'gallery', label: 'Galería', icon: '📸' }
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
        const isSport = (formData?.type || business?.type) === 'sport' || (formData?.type || business?.type) === 'venue';
        const activeCount = isSport ? (formData?.courts?.length || 0) : (formData?.specialists?.length || 0);
        const subSpaces = subscription?.spaces_included || business?.capacity_limit || 2;
        return Math.max(subSpaces, activeCount, 2);
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


    // Helper for Additional Services
    const handleAdditionalServiceChange = (index, field, value) => {
        const services = [...(formData.additional_services || [])];
        services[index] = { ...services[index], [field]: value };
        handleInputChange('additional_services', services);
    };

    const addAdditionalService = () => {
        const services = [...(formData.additional_services || [])];
        services.push({ name: '', price: 0, description: '' });
        handleInputChange('additional_services', services);
    };

    const removeAdditionalService = (index) => {
        const services = formData.additional_services.filter((_, i) => i !== index);
        handleInputChange('additional_services', services);
    };

    const renderTabContent = () => {
        switch (activeTab) {
            case 'rental':
                const isDaily = formData.pricing_model === 'daily';
                return (
                    <div style={{ display: 'grid', gap: '32px' }}>
                        {/* 1. Pricing Model */}
                        <div style={{ padding: '24px', background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border)' }}>
                            <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '16px', color: 'var(--text-primary)' }}>Modelo de Precios</h3>
                            <div style={{ display: 'flex', gap: '16px' }}>
                                <label style={{
                                    flex: 1,
                                    padding: '16px',
                                    border: isDaily ? '2px solid transparent' : '2px solid var(--primary-paddle)',
                                    background: isDaily ? 'var(--bg-main)' : 'rgba(var(--primary-rgb), 0.1)',
                                    borderRadius: '12px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px'
                                }}>
                                    <input
                                        type="radio"
                                        name="pricing_model"
                                        value="hourly"
                                        checked={!isDaily}
                                        onChange={() => handleInputChange('pricing_model', 'hourly')}
                                        style={{ width: '20px', height: '20px', accentColor: 'var(--primary-paddle)' }}
                                    />
                                    <div>
                                        <div style={{ fontWeight: '700', color: 'var(--text-primary)' }}>Por Hora</div>
                                        <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>El cliente elige cantidad de horas</div>
                                    </div>
                                </label>
                                <label style={{
                                    flex: 1,
                                    padding: '16px',
                                    border: isDaily ? '2px solid var(--primary-paddle)' : '2px solid transparent',
                                    background: isDaily ? 'rgba(var(--primary-rgb), 0.1)' : 'var(--bg-main)',
                                    borderRadius: '12px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px'
                                }}>
                                    <input
                                        type="radio"
                                        name="pricing_model"
                                        value="daily"
                                        checked={isDaily}
                                        onChange={() => handleInputChange('pricing_model', 'daily')}
                                        style={{ width: '20px', height: '20px', accentColor: 'var(--primary-paddle)' }}
                                    />
                                    <div>
                                        <div style={{ fontWeight: '700', color: 'var(--text-primary)' }}>Por Día (Fijo)</div>
                                        <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Precio fijo por fecha completa</div>
                                    </div>
                                </label>
                            </div>

                            <div style={{ marginTop: '24px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                                    {isDaily ? 'Precio por Día Completo ($)' : 'Precio Base por Hora ($)'}
                                </label>
                                <input
                                    type="number"
                                    value={isDaily ? (formData.price_per_day || '') : (formData.price_per_hour || '')}
                                    onChange={(e) => handleInputChange(isDaily ? 'price_per_day' : 'price_per_hour', parseFloat(e.target.value))}
                                    placeholder="0.00"
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        borderRadius: '8px',
                                        border: '1px solid var(--border)',
                                        background: 'var(--bg-main)',
                                        color: 'var(--text-primary)',
                                        fontSize: '16px',
                                        fontWeight: '600'
                                    }}
                                />
                            </div>

                            {!isDaily && (
                                <div style={{ marginTop: '24px' }}>
                                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                                        Opciones de Duración Permitidas
                                    </label>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                        {[4, 5, 6, 8, 10, 12, 24].map(hours => {
                                            const selected = (formData.rental_duration_options || []).includes(hours);
                                            return (
                                                <button
                                                    key={hours}
                                                    onClick={() => {
                                                        const current = formData.rental_duration_options || [];
                                                        const updated = selected
                                                            ? current.filter(h => h !== hours)
                                                            : [...current, hours].sort((a, b) => a - b);
                                                        handleInputChange('rental_duration_options', updated);
                                                    }}
                                                    style={{
                                                        padding: '8px 16px',
                                                        borderRadius: '20px',
                                                        border: selected ? '2px solid var(--primary-paddle)' : '1px solid var(--border)',
                                                        background: selected ? 'var(--primary-paddle)' : 'transparent',
                                                        color: selected ? '#000' : 'var(--text-secondary)',
                                                        fontWeight: '600',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    {hours} hs
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
                                        Selecciona las duraciones que los clientes pueden elegir.
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* 1.5 Capacity Settings */}
                        <div style={{ padding: '24px', background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border)' }}>
                            <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '16px', color: 'var(--text-primary)' }}>Capacidad</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                                        Capacidad Máxima de Invitados
                                    </label>
                                    <input
                                        type="number"
                                        value={formData.max_capacity || 100}
                                        onChange={(e) => handleInputChange('max_capacity', parseInt(e.target.value))}
                                        placeholder="100"
                                        style={{
                                            width: '100%',
                                            padding: '12px',
                                            borderRadius: '8px',
                                            border: '1px solid var(--border)',
                                            background: 'var(--bg-main)',
                                            color: 'var(--text-primary)',
                                            fontSize: '16px',
                                            fontWeight: '600'
                                        }}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* 1.6 Pricing Tiers */}
                        {!isDaily && (
                            <div style={{ padding: '24px', background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                    <h3 style={{ fontSize: '18px', fontWeight: '800', margin: 0, color: 'var(--text-primary)' }}>Escalones de Precio por Invitados</h3>
                                    <button
                                        onClick={() => {
                                            const tiers = [...(formData.pricing_tiers || [])];
                                            const lastTier = tiers[tiers.length - 1];
                                            const newMin = lastTier ? lastTier.max + 1 : 1;
                                            tiers.push({ min: newMin, max: newMin + 29, price: formData.price_per_hour || 0, label: `${newMin}-${newMin + 29} personas` });
                                            handleInputChange('pricing_tiers', tiers);
                                        }}
                                        style={{
                                            background: 'rgba(var(--primary-rgb), 0.1)',
                                            color: 'var(--primary-paddle)',
                                            border: 'none',
                                            padding: '8px 16px',
                                            borderRadius: '8px',
                                            fontWeight: '700',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        + Agregar Escalón
                                    </button>
                                </div>

                                {(formData.pricing_tiers || []).length === 0 ? (
                                    <div style={{ padding: '20px', background: 'var(--bg-main)', borderRadius: '12px', textAlign: 'center' }}>
                                        <p style={{ color: 'var(--text-muted)', margin: 0 }}>Sin escalones configurados. Se usará el precio base para todos.</p>
                                    </div>
                                ) : (
                                    <div style={{ display: 'grid', gap: '12px' }}>
                                        {(formData.pricing_tiers || []).map((tier, index) => (
                                            <div key={index} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '12px', alignItems: 'center', padding: '12px', background: 'var(--bg-main)', borderRadius: '12px' }}>
                                                <div>
                                                    <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>Mínimo</label>
                                                    <input
                                                        type="number"
                                                        value={tier.min || 1}
                                                        onChange={(e) => {
                                                            const tiers = [...formData.pricing_tiers];
                                                            tiers[index] = { ...tier, min: parseInt(e.target.value), label: `${e.target.value}-${tier.max} personas` };
                                                            handleInputChange('pricing_tiers', tiers);
                                                        }}
                                                        style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)' }}
                                                    />
                                                </div>
                                                <div>
                                                    <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>Máximo</label>
                                                    <input
                                                        type="number"
                                                        value={tier.max || 30}
                                                        onChange={(e) => {
                                                            const tiers = [...formData.pricing_tiers];
                                                            tiers[index] = { ...tier, max: parseInt(e.target.value), label: `${tier.min}-${e.target.value} personas` };
                                                            handleInputChange('pricing_tiers', tiers);
                                                        }}
                                                        style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)' }}
                                                    />
                                                </div>
                                                <div>
                                                    <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>Precio/hora</label>
                                                    <input
                                                        type="number"
                                                        value={tier.price || 0}
                                                        onChange={(e) => {
                                                            const tiers = [...formData.pricing_tiers];
                                                            tiers[index] = { ...tier, price: parseFloat(e.target.value) };
                                                            handleInputChange('pricing_tiers', tiers);
                                                        }}
                                                        style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)' }}
                                                    />
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        const tiers = formData.pricing_tiers.filter((_, i) => i !== index);
                                                        handleInputChange('pricing_tiers', tiers);
                                                    }}
                                                    style={{ color: '#ef4444', background: 'transparent', border: 'none', cursor: 'pointer', padding: '8px', marginTop: '16px' }}
                                                    title="Eliminar"
                                                >
                                                    🗑️
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '12px' }}>
                                    💡 Configura precios diferentes según la cantidad de invitados. Ej: 1-30 personas = $3000/hora, 31-60 = $4500/hora
                                </p>
                            </div>
                        )}

                        {/* 1.7 Blocked Dates */}
                        <div style={{ padding: '24px', background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                <h3 style={{ fontSize: '18px', fontWeight: '800', margin: 0, color: 'var(--text-primary)' }}>Fechas Bloqueadas</h3>
                                <button
                                    onClick={() => {
                                        const dates = [...(formData.blocked_dates || [])];
                                        const tomorrow = new Date();
                                        tomorrow.setDate(tomorrow.getDate() + 1);
                                        dates.push({ date: tomorrow.toISOString().split('T')[0], reason: '' });
                                        handleInputChange('blocked_dates', dates);
                                    }}
                                    style={{
                                        background: 'rgba(var(--primary-rgb), 0.1)',
                                        color: 'var(--primary-paddle)',
                                        border: 'none',
                                        padding: '8px 16px',
                                        borderRadius: '8px',
                                        fontWeight: '700',
                                        cursor: 'pointer'
                                    }}
                                >
                                    + Bloquear Fecha
                                </button>
                            </div>

                            {(formData.blocked_dates || []).length === 0 ? (
                                <div style={{ padding: '20px', background: 'var(--bg-main)', borderRadius: '12px', textAlign: 'center' }}>
                                    <p style={{ color: 'var(--text-muted)', margin: 0 }}>No hay fechas bloqueadas. Todas las fechas están disponibles.</p>
                                </div>
                            ) : (
                                <div style={{ display: 'grid', gap: '12px' }}>
                                    {(formData.blocked_dates || []).map((blocked, index) => (
                                        <div key={index} style={{ display: 'grid', gridTemplateColumns: '1fr 2fr auto', gap: '12px', alignItems: 'center', padding: '12px', background: 'var(--bg-main)', borderRadius: '12px' }}>
                                            <input
                                                type="date"
                                                value={blocked.date || ''}
                                                onChange={(e) => {
                                                    const dates = [...formData.blocked_dates];
                                                    dates[index] = { ...blocked, date: e.target.value };
                                                    handleInputChange('blocked_dates', dates);
                                                }}
                                                style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)' }}
                                            />
                                            <input
                                                type="text"
                                                placeholder="Motivo (ej: Evento privado)"
                                                value={blocked.reason || ''}
                                                onChange={(e) => {
                                                    const dates = [...formData.blocked_dates];
                                                    dates[index] = { ...blocked, reason: e.target.value };
                                                    handleInputChange('blocked_dates', dates);
                                                }}
                                                style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)' }}
                                            />
                                            <button
                                                onClick={() => {
                                                    const dates = formData.blocked_dates.filter((_, i) => i !== index);
                                                    handleInputChange('blocked_dates', dates);
                                                }}
                                                style={{ color: '#ef4444', background: 'transparent', border: 'none', cursor: 'pointer', padding: '8px' }}
                                                title="Eliminar"
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* 2. Additional Services */}
                        <div style={{ padding: '24px', background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                <h3 style={{ fontSize: '18px', fontWeight: '800', margin: 0, color: 'var(--text-primary)' }}>Servicios Adicionales</h3>
                                <button
                                    onClick={addAdditionalService}
                                    style={{
                                        background: 'rgba(var(--primary-rgb), 0.1)',
                                        color: 'var(--primary-paddle)',
                                        border: 'none',
                                        padding: '8px 16px',
                                        borderRadius: '8px',
                                        fontWeight: '700',
                                        cursor: 'pointer'
                                    }}
                                >
                                    + Agregar
                                </button>
                            </div>

                            {(formData.additional_services || []).length === 0 ? (
                                <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No hay servicios adicionales configurados.</p>
                            ) : (
                                <div style={{ display: 'grid', gap: '12px' }}>
                                    {(formData.additional_services || []).map((service, index) => (
                                        <div key={index} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                            <input
                                                type="text"
                                                placeholder="Nombre (ej: Limpieza)"
                                                value={service.name || ''}
                                                onChange={(e) => handleAdditionalServiceChange(index, 'name', e.target.value)}
                                                style={{ flex: 2, padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-primary)' }}
                                            />
                                            <input
                                                type="number"
                                                placeholder="Precio"
                                                value={service.price || ''}
                                                onChange={(e) => handleAdditionalServiceChange(index, 'price', parseFloat(e.target.value))}
                                                style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-primary)' }}
                                            />
                                            <button
                                                onClick={() => removeAdditionalService(index)}
                                                style={{ color: '#ef4444', background: 'transparent', border: 'none', cursor: 'pointer', padding: '8px' }}
                                                title="Eliminar"
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* 3. Included Amenities */}
                        <div style={{ padding: '24px', background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border)' }}>
                            <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '16px', color: 'var(--text-primary)' }}>Comodidades Incluidas</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '12px' }}>
                                {['Wifi', 'Estacionamiento', 'Cocina', 'Parrilla', 'Piscina', 'Aire Acondicionado', 'Calefacción', 'Vajilla', 'Heladera', 'Freezer', 'Mesas y Sillas', 'Equipo de Audio', 'Proyector'].map(amenity => {
                                    const included = (formData.included_amenities || []).includes(amenity);
                                    return (
                                        <label key={amenity} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                                            <input
                                                type="checkbox"
                                                checked={included}
                                                onChange={() => {
                                                    const current = formData.included_amenities || [];
                                                    const updated = included
                                                        ? current.filter(a => a !== amenity)
                                                        : [...current, amenity];
                                                    handleInputChange('included_amenities', updated);
                                                }}
                                                style={{ accentColor: 'var(--primary-paddle)' }}
                                            />
                                            <span style={{ fontSize: '14px' }}>{amenity}</span>
                                        </label>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Save Button */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '24px', background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border)' }}>
                            <button
                                onClick={() => handleSave()}
                                disabled={saving}
                                style={{
                                    padding: '14px 32px',
                                    borderRadius: '12px',
                                    background: saving ? 'var(--border)' : 'var(--primary-paddle)',
                                    color: saving ? 'var(--text-secondary)' : '#000',
                                    border: 'none',
                                    fontWeight: '700',
                                    fontSize: '15px',
                                    cursor: saving ? 'not-allowed' : 'pointer',
                                    transition: 'all 0.2s'
                                }}
                            >
                                {saving ? 'Guardando...' : 'Guardar Cambios'}
                            </button>
                        </div>
                    </div>
                );

            /* resources tab removed — merged into subscription */
            case '__removed_resources__':
                const categoryNameRes = (formData?.categories?.name || formData?.category || business?.categories?.name || '').toLowerCase();
                const subcatNameRes = (formData?.subcategories?.[0]?.name || formData?.subcategories?.[0]?.slug || '').toLowerCase();
                const bTypeRes = (formData?.type || business?.type || '').toLowerCase();

                const isSportRes = bTypeRes === 'sport' || categoryNameRes.includes('deporte') || subcatNameRes.includes('futbol') || subcatNameRes.includes('padel') || ((formData?.courts?.length || 0) > 0);
                const resourceLabel = isSportRes ? 'Cancha' : 'Profesional';
                const resourceKey = isSportRes ? 'courts' : 'specialists';

                const expectedCount = Math.max(
                    subscription?.spaces_included || 0,
                    formData.capacity_limit || 0,
                    formData.capacity || 0,
                    formData.courts?.length || 0,
                    formData.specialists?.length || 0,
                    1
                );

                let rawResources = isSportRes ? (formData.courts || []) : (formData.specialists || []);
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

                return (
                    <div style={{ display: 'grid', gap: '24px' }}>
                        <div>
                            <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '8px', color: 'var(--text-primary)' }}>
                                {isSport ? 'Canchas Asignadas' : 'Profesionales Asignados'}
                            </h3>
                            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
                                Podés personalizar los nombres y habilitar o deshabilitar cada espacio. La cantidad total de espacios es administrada por la plataforma (SuperAdmin).
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
                                        border: '1px solid var(--border)',
                                        opacity: resource.active === false ? 0.7 : 1
                                    }}>
                                        {/* Specialist Photo Upload */}
                                        {!isSport && (
                                            <div style={{ position: 'relative', width: '40px', height: '40px' }}>
                                                <div style={{
                                                    width: '40px',
                                                    height: '40px',
                                                    borderRadius: '50%',
                                                    overflow: 'hidden',
                                                    background: 'var(--bg-card)',
                                                    border: '1px solid var(--border)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center'
                                                }}>
                                                    {resource.avatar_url ? (
                                                        <img src={resource.avatar_url} alt={resource.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                    ) : (
                                                        <span style={{ fontSize: '20px' }}>👤</span>
                                                    )}
                                                </div>
                                                <input
                                                    type="file"
                                                    id={`specialist-upload-${index}`}
                                                    style={{ display: 'none' }}
                                                    accept="image/*"
                                                    onChange={async (e) => {
                                                        const file = e.target.files[0];
                                                        if (!file) return;
                                                        try {
                                                            showToast('Subiendo foto...', 'info');
                                                            const url = await serviceAdapter.uploadImage(file);
                                                            const newResources = [...resources];
                                                            newResources[index] = { ...resource, avatar_url: url };
                                                            handleInputChange(resourceKey, newResources);

                                                            // Auto-save the updated resources
                                                            await handleSave({ [resourceKey]: newResources });
                                                            showToast('Foto guardada correctamente', 'success');
                                                        } catch (error) {
                                                            console.error(error);
                                                            showToast('Error al subir imagen', 'error');
                                                        }
                                                    }}
                                                />
                                                <label
                                                    htmlFor={`specialist-upload-${index}`}
                                                    style={{
                                                        position: 'absolute',
                                                        bottom: '-5px',
                                                        right: '-5px',
                                                        background: 'var(--primary-paddle)',
                                                        color: '#000',
                                                        width: '20px',
                                                        height: '20px',
                                                        borderRadius: '50%',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        fontSize: '10px',
                                                        cursor: 'pointer',
                                                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                                                    }}
                                                    title="Cambiar foto"
                                                >
                                                    📷
                                                </label>
                                            </div>
                                        )}
                                        {isSport && (
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
                                                🏟️
                                            </div>
                                        )}
                                        <div style={{ flex: 1, display: 'grid', gap: '8px' }}>
                                            <input
                                                type="text"
                                                value={resource.name}
                                                onChange={(e) => {
                                                    const newResources = [...resources];
                                                    newResources[index] = { ...resource, name: e.target.value };
                                                    handleInputChange(resourceKey, newResources);
                                                }}
                                                placeholder={`Nombre de ${resourceLabel.toLowerCase()}`}
                                                style={{
                                                    ...inputStyle,
                                                    border: 'none',
                                                    background: 'transparent',
                                                    padding: '0',
                                                    fontWeight: '600'
                                                }}
                                            />
                                            {!isSport && (
                                                <input
                                                    type="text"
                                                    value={resource.role || ''}
                                                    onChange={(e) => {
                                                        const newResources = [...resources];
                                                        newResources[index] = { ...resource, role: e.target.value };
                                                        handleInputChange(resourceKey, newResources);
                                                    }}
                                                    placeholder="Rol (ej: Peluquero, Masajista)"
                                                    style={{
                                                        ...inputStyle,
                                                        border: 'none',
                                                        background: 'transparent',
                                                        padding: '0',
                                                        fontSize: '13px',
                                                        color: 'var(--text-secondary)'
                                                    }}
                                                />
                                            )}
                                        </div>

                                        {/* State Toggle: Habilitar / Deshabilitar */}
                                        <button
                                            onClick={() => {
                                                const newResources = [...resources];
                                                const newActive = resource.active === false ? true : false;
                                                newResources[index] = { ...resource, active: newActive };
                                                handleInputChange(resourceKey, newResources);
                                                showToast(`${resourceLabel} ${resource.name} ${newActive ? 'habilitado' : 'deshabilitado'}`, newActive ? 'success' : 'info');
                                            }}
                                            style={{
                                                padding: '6px 12px',
                                                borderRadius: '8px',
                                                border: 'none',
                                                background: resource.active === false ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                                                color: resource.active === false ? '#ef4444' : '#10b981',
                                                fontWeight: '700',
                                                fontSize: '12px',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px',
                                                whiteSpace: 'nowrap'
                                            }}
                                            title={resource.active === false ? "Haz clic para habilitar espacio" : "Haz clic para deshabilitar espacio temporalmente"}
                                        >
                                            {resource.active === false ? '🔴 Inactivo' : '🟢 Activo'}
                                        </button>
                                    </div>
                                ))}
                            </div>

                            {/* Informational banner explaining SuperAdmin quantity control */}
                            <div style={{
                                marginTop: '16px',
                                padding: '14px 16px',
                                background: 'rgba(99, 102, 241, 0.08)',
                                border: '1px solid rgba(99, 102, 241, 0.2)',
                                borderRadius: '12px',
                                color: 'var(--text-secondary)',
                                fontSize: '13px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px'
                            }}>
                                <span style={{ fontSize: '18px' }}>ℹ️</span>
                                <span>
                                    La cantidad total de {isSport ? 'canchas' : 'especialistas'} (<strong>{resources.length} espacio{resources.length !== 1 ? 's' : ''}</strong>) es administrada desde la plataforma SuperAdmin. Para sumar o reducir espacios, solicitá la modificación a soporte.
                                </span>
                            </div>
                        </div>

                        <button
                            onClick={() => handleSave({ [resourceKey]: resources })}
                            style={saveButtonStyle}
                            disabled={saving}
                        >
                            {saving ? 'Guardando...' : `Guardar Nombres de ${isSport ? 'Canchas' : 'Profesionales'}`}
                        </button>
                    </div>
                );

            case 'general':
                const validAmenities = Array.isArray(formData.amenities) ? formData.amenities : [];
                // Default center: Buenos Aires Obelisco
                const mapCenter = [formData.latitude || -34.6037, formData.longitude || -58.3816];

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

                        {/* Logo and Banner Upload Section */}
                        <div style={{ display: 'grid', gap: '24px', padding: '20px', background: 'var(--bg-main)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                            <h4 style={{ fontSize: '15px', fontWeight: '700', margin: 0, color: 'var(--text-primary)' }}>Imágenes del Perfil</h4>

                            {/* Logo Upload */}
                            <div>
                                <label style={labelStyle}>Logo</label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginTop: '10px' }}>
                                    <div style={{
                                        width: '80px', height: '80px', borderRadius: '16px', overflow: 'hidden',
                                        background: 'var(--bg-card)', border: '1px solid var(--border)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative'
                                    }}>
                                        {formData.logo ? (
                                            <img src={formData.logo} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        ) : (
                                            <span style={{ fontSize: '24px' }}>🏢</span>
                                        )}
                                        {uploadingLogo && (
                                            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <div className="spinner" style={{ width: '20px', height: '20px', border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                                            </div>
                                        )}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <input type="file" id="logo-upload" style={{ display: 'none' }} accept="image/*" onChange={handleLogoUpload} disabled={uploadingLogo} />
                                        <label htmlFor="logo-upload" style={{ ...buttonSecondaryStyle, display: 'inline-block', cursor: uploadingLogo ? 'not-allowed' : 'pointer', opacity: uploadingLogo ? 0.7 : 1 }}>
                                            {uploadingLogo ? 'Subiendo...' : 'Cambiar Logo'}
                                        </label>
                                        <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '8px' }}>Recomendado: 512x512px. JPG o PNG.</p>
                                    </div>
                                </div>
                            </div>

                            {/* Banner Upload */}
                            <div>
                                <label style={labelStyle}>Banner</label>
                                <div style={{ marginTop: '10px' }}>
                                    <div style={{
                                        width: '100%', height: '140px', borderRadius: '16px', overflow: 'hidden',
                                        background: 'var(--bg-card)', border: '1px solid var(--border)', marginBottom: '12px', position: 'relative'
                                    }}>
                                        {formData.banner_image ? (
                                            <img src={formData.banner_image} alt="Banner" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        ) : (
                                            <div style={{ width: '100%', height: '100%', background: 'linear-gradient(45deg, #eee, #f5f5f5)' }} />
                                        )}
                                        {uploadingBanner && (
                                            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <div className="spinner" style={{ width: '30px', height: '30px', border: '3px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                                            </div>
                                        )}
                                    </div>
                                    <input type="file" id="banner-upload" style={{ display: 'none' }} accept="image/*" onChange={handleBannerUpload} disabled={uploadingBanner} />
                                    <label htmlFor="banner-upload" style={{ ...buttonSecondaryStyle, display: 'inline-block', cursor: uploadingBanner ? 'not-allowed' : 'pointer', opacity: uploadingBanner ? 0.7 : 1 }}>
                                        {uploadingBanner ? 'Subiendo...' : 'Cambiar Banner'}
                                    </label>
                                </div>
                            </div>
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

                        {/* Location Section */}
                        <div style={{ marginTop: '10px' }}>
                            <label style={labelStyle}>Ubicación</label>
                            <div style={{ display: 'flex', gap: '10px', marginTop: '5px' }}>
                                <input type="text" style={inputStyle} value={formData.location ?? ''} onChange={(e) => handleInputChange('location', e.target.value)} placeholder="Dirección text..." />
                            </div>

                            <div style={{ marginTop: '16px' }}>
                                <label style={{ ...labelStyle, fontSize: '13px', color: 'var(--text-secondary)' }}>Ubicación en el Mapa (Click para marcar)</label>
                                <div style={{ height: '300px', borderRadius: '12px', overflow: 'hidden', marginTop: '8px', border: '1px solid var(--border)', zIndex: 0 }}>
                                    <MapContainer key={`${mapCenter[0]}-${mapCenter[1]}`} center={mapCenter} zoom={13} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
                                        <TileLayer
                                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                        />
                                        <LocationPicker
                                            position={formData.latitude ? [formData.latitude, formData.longitude] : null}
                                            onLocationSelect={(latlng) => {
                                                setFormData(prev => ({
                                                    ...prev,
                                                    latitude: latlng.lat,
                                                    longitude: latlng.lng
                                                }));
                                            }}
                                        />
                                    </MapContainer>
                                </div>
                                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                    Haz click en el mapa para marcar la ubicación exacta.
                                </p>
                            </div>
                        </div>

                        {/* Amenities Section */}
                        <div style={{ marginTop: '10px' }}>
                            <label style={labelStyle}>Comodidades / Amenities</label>
                            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', marginTop: '8px' }}>
                                <input
                                    type="text"
                                    style={inputStyle}
                                    placeholder="Ej: Wifi, Estacionamiento, Vestuarios..."
                                    value={newAmenity}
                                    onChange={(e) => setNewAmenity(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            if (newAmenity.trim()) {
                                                const updatedAmenities = [...validAmenities, newAmenity.trim()];
                                                handleInputChange('amenities', updatedAmenities);
                                                setNewAmenity('');
                                            }
                                        }
                                    }}
                                />
                                <button
                                    onClick={() => {
                                        if (newAmenity.trim()) {
                                            const updatedAmenities = [...validAmenities, newAmenity.trim()];
                                            handleInputChange('amenities', updatedAmenities);
                                            setNewAmenity('');
                                        }
                                    }}
                                    style={{ ...buttonSecondaryStyle, padding: '0 20px' }}
                                >
                                    Agregar
                                </button>
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                {validAmenities.map((amenity, idx) => (
                                    <span key={idx} style={{
                                        padding: '6px 12px', borderRadius: '20px', background: 'var(--bg-card)',
                                        border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px'
                                    }}>
                                        {amenity}
                                        <button
                                            onClick={() => {
                                                const updatedAmenities = validAmenities.filter((_, i) => i !== idx);
                                                handleInputChange('amenities', updatedAmenities);
                                            }}
                                            style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0, color: 'var(--text-secondary)' }}
                                        >
                                            ×
                                        </button>
                                    </span>
                                ))}
                            </div>
                        </div>

                        {/* Consolidated Save Button */}
                        <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
                            <button
                                onClick={() => handleSave({
                                    name: formData.name,
                                    description: formData.description,
                                    location: formData.location,
                                    latitude: formData.latitude,
                                    longitude: formData.longitude,
                                    logo: formData.logo,
                                    banner_image: formData.banner_image,
                                    amenities: formData.amenities
                                })}
                                style={saveButtonStyle}
                                disabled={saving}
                            >
                                {saving ? 'Guardando...' : 'Guardar Información General'}
                            </button>
                        </div>

                        <div style={{ marginTop: '20px', borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
                            <h4 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '16px', color: 'var(--text-primary)' }}>Redes Sociales</h4>
                            <div style={{ display: 'grid', gap: '16px' }}>
                                <div> <label style={labelStyle}>Instagram</label> <input type="text" style={inputStyle} placeholder="@usuario" value={formData.instagram ?? ''} onChange={(e) => handleInputChange('instagram', e.target.value)} /> </div>
                                <div> <label style={labelStyle}>TikTok</label> <input type="text" style={inputStyle} placeholder="@usuario" value={formData.tiktok ?? ''} onChange={(e) => handleInputChange('tiktok', e.target.value)} /> </div>
                                <div> <label style={labelStyle}>Facebook</label> <input type="text" style={inputStyle} placeholder="@usuario o URL" value={formData.facebook ?? ''} onChange={(e) => handleInputChange('facebook', e.target.value)} /> </div>
                                <div> <label style={labelStyle}>WhatsApp</label> <input type="text" style={inputStyle} placeholder="+54911..." value={formData.whatsapp ?? ''} onChange={(e) => handleInputChange('whatsapp', e.target.value)} /> </div>
                                <div> <label style={labelStyle}>Sitio Web</label> <input type="text" style={inputStyle} placeholder="https://..." value={formData.website ?? ''} onChange={(e) => handleInputChange('website', e.target.value)} /> </div>
                            </div>
                            <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                                <button onClick={() => handleSave({ instagram: formData.instagram, tiktok: formData.tiktok, facebook: formData.facebook, whatsapp: formData.whatsapp, website: formData.website })} style={{ ...saveButtonStyle, background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-primary)' }} disabled={saving}>
                                    {saving ? 'Guardando...' : 'Guardar Redes Sociales'}
                                </button>
                            </div>
                        </div>
                    </div>
                );

            case 'subscription':
                return (
                    <SubscriptionManager
                        businessId={business?.id}
                        businessType={business?.type}
                        business={business}
                        formData={formData}
                        onResourcesChange={handleInputChange}
                        onSave={handleSave}
                        saving={saving}
                        serviceAdapter={serviceAdapter}
                        showToast={showToast}
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
                                logo_url: formData.logo || formData.logo_url,
                                banner_image: formData.banner_image,
                                banner_url: formData.banner_image || formData.banner_url
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
                                                        if (!newHours[day]) newHours[day] = {};
                                                        newHours[day] = {
                                                            open: newHours[day].open || '08:00',
                                                            close: newHours[day].close || '23:00',
                                                            ...newHours[day],
                                                            isOpen: e.target.checked
                                                        };
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
                            onClick={() => {
                                const normalizedHours = {};
                                orderedDays.forEach(day => {
                                    const current = formData.hours?.[day] || {};
                                    normalizedHours[day] = {
                                        isOpen: current.isOpen !== false,
                                        isSplit: !!current.isSplit,
                                        open: current.open || '18:00',
                                        close: current.close || '23:00',
                                        breakStart: current.breakStart || null,
                                        breakEnd: current.breakEnd || null
                                    };
                                });
                                handleInputChange('hours', normalizedHours);
                                handleSave({ hours: normalizedHours });
                            }}
                            style={saveButtonStyle}
                            disabled={saving}
                        >
                            {saving ? 'Guardando...' : 'Guardar Horarios'}
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
                    </div >
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

            case 'policies_and_payments':
                const rules = formData.booking_rules || {};
                const advanceBooking = rules.advance_booking || { min_hours: 2, max_days: 30 };
                const cancellation = rules.cancellation || { deadline_hours: 24, refund_policy: 'full' };
                const limits = rules.limits || { max_per_day: 5, max_per_week: 20 };
                const timeRules = rules.time || { min_duration: 60, max_duration: 240, buffer_minutes: 0 };
                const requirements = rules.requirements || { phone_required: true, email_verification: false, terms_text: '' };

                // Payment Settings
                const paymentSettings = formData.payment_settings || {};
                const deposit = paymentSettings.deposit || { enabled: false, type: 'percentage', percentage: 30, fixed_amount: 0 };
                const methods = paymentSettings.methods || [{ type: 'cash', enabled: true }];
                const instructions = paymentSettings.instructions || '';
                const bankDetails = paymentSettings.bank_details || { bank_name: '', account_holder: '', cbu: '', alias: '' };

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

                        {/* ================= PAYMENTS SECTION ================= */}
                        <div style={{ padding: '24px 0', borderTop: '1px solid var(--border)' }}>
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

                                    {/* Banking Details */}
                                    <div style={{ marginBottom: '24px', padding: '20px', background: 'var(--bg-main)', borderRadius: '12px' }}>
                                        <h4 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '16px', color: 'var(--text-primary)' }}>
                                            🏦 Datos Bancarios
                                        </h4>
                                        <div style={{ display: 'grid', gap: '12px', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr' }}>
                                            <div>
                                                <label style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
                                                    Banco
                                                </label>
                                                <input
                                                    type="text"
                                                    value={bankDetails.bank_name || ''}
                                                    onChange={(e) => handleInputChange('payment_settings', {
                                                        ...paymentSettings,
                                                        bank_details: { ...bankDetails, bank_name: e.target.value }
                                                    })}
                                                    placeholder="Ej: Banco Galicia"
                                                    style={inputStyle}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
                                                    Titular de la cuenta
                                                </label>
                                                <input
                                                    type="text"
                                                    value={bankDetails.account_holder || ''}
                                                    onChange={(e) => handleInputChange('payment_settings', {
                                                        ...paymentSettings,
                                                        bank_details: { ...bankDetails, account_holder: e.target.value }
                                                    })}
                                                    placeholder="Nombre del titular"
                                                    style={inputStyle}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
                                                    CBU / CVU
                                                </label>
                                                <input
                                                    type="text"
                                                    value={bankDetails.cbu || ''}
                                                    onChange={(e) => handleInputChange('payment_settings', {
                                                        ...paymentSettings,
                                                        bank_details: { ...bankDetails, cbu: e.target.value }
                                                    })}
                                                    placeholder="0000000000000000000000"
                                                    style={inputStyle}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
                                                    Alias
                                                </label>
                                                <input
                                                    type="text"
                                                    value={bankDetails.alias || ''}
                                                    onChange={(e) => handleInputChange('payment_settings', {
                                                        ...paymentSettings,
                                                        bank_details: { ...bankDetails, alias: e.target.value }
                                                    })}
                                                    placeholder="mi.alias.mp"
                                                    style={inputStyle}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Payment Instructions (Legacy/Extra) */}
                                    <div style={{ marginBottom: '24px' }}>
                                        <label style={labelStyle}>Instrucciones Adicionales</label>
                                        <textarea
                                            value={instructions}
                                            onChange={(e) => handleInputChange('payment_settings', {
                                                ...paymentSettings,
                                                instructions: e.target.value
                                            })}
                                            placeholder="Instrucciones extra para el cliente..."
                                            style={{
                                                ...inputStyle,
                                                minHeight: '100px',
                                                resize: 'vertical',
                                                fontFamily: 'inherit'
                                            }}
                                        />
                                        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                            Información extra que quieras mostrar al cliente.
                                        </p>
                                    </div>

                                    {/* Save Button */}
                                    <button
                                        onClick={() => handleSave({
                                            payment_settings: formData.payment_settings
                                        })}
                                        style={saveButtonStyle}
                                        disabled={saving}
                                    >
                                        {saving ? 'Guardando...' : 'Guardar Configuración de Pagos'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                );



            case 'services':
                const services = formData.services || [];
                const serviceCategories = formData.service_categories || [];

                return (
                    <div style={{ display: 'grid', gap: '24px' }}>
                        <div>
                            <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '8px', color: 'var(--text-primary)' }}>
                                Gestionar Servicios
                            </h3>
                            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
                                Edita los servicios que ofreces, sus precios y duraciones.
                            </p>

                            {/* Category Management Section */}
                            <div style={{ padding: '20px', background: 'var(--bg-main)', borderRadius: '12px', border: '1px solid var(--border)', marginBottom: '20px' }}>
                                <h4 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '12px', color: 'var(--text-primary)' }}>Categorías de Servicios</h4>
                                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                                    Gestiona las categorías para organizar tus servicios (ej: Corte, Coloración, Tratamientos).
                                </p>

                                {/* Add Category Input */}
                                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                                    <input
                                        type="text"
                                        style={inputStyle}
                                        placeholder="Ej: Corte de Pelo"
                                        value={newCategory}
                                        onChange={(e) => setNewCategory(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                if (newCategory.trim()) {
                                                    if (serviceCategories.includes(newCategory.trim())) {
                                                        showToast('Esta categoría ya existe', 'warning');
                                                        return;
                                                    }
                                                    const updatedCategories = [...serviceCategories, newCategory.trim()];
                                                    handleInputChange('service_categories', updatedCategories);
                                                    setNewCategory('');
                                                    showToast('Categoría agregada. No olvides guardar.', 'success');
                                                }
                                            }
                                        }}
                                    />
                                    <button
                                        onClick={() => {
                                            if (newCategory.trim()) {
                                                if (serviceCategories.includes(newCategory.trim())) {
                                                    showToast('Esta categoría ya existe', 'warning');
                                                    return;
                                                }
                                                const updatedCategories = [...serviceCategories, newCategory.trim()];
                                                handleInputChange('service_categories', updatedCategories);
                                                setNewCategory('');
                                                showToast('Categoría agregada. No olvides guardar.', 'success');
                                            }
                                        }}
                                        style={{ ...buttonSecondaryStyle, padding: '0 20px' }}
                                    >
                                        Agregar
                                    </button>
                                </div>

                                {/* Display Categories */}
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                    {serviceCategories.length === 0 ? (
                                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                                            No hay categorías configuradas aún.
                                        </p>
                                    ) : (
                                        serviceCategories.map((category, idx) => (
                                            <span key={idx} style={{
                                                padding: '6px 12px', borderRadius: '20px', background: 'var(--bg-card)',
                                                border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px'
                                            }}>
                                                {category}
                                                <button
                                                    onClick={async () => {
                                                        const confirmed = await showConfirm(
                                                            '¿Eliminar categoría?',
                                                            `¿Estás seguro de eliminar "${category}"? Los servicios con esta categoría no se eliminarán.`,
                                                            'Eliminar',
                                                            'Cancelar'
                                                        );
                                                        if (confirmed) {
                                                            const updatedCategories = serviceCategories.filter((_, i) => i !== idx);
                                                            handleInputChange('service_categories', updatedCategories);
                                                            showToast('Categoría eliminada. No olvides guardar.', 'success');
                                                        }
                                                    }}
                                                    style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0, color: 'var(--text-secondary)', fontSize: '14px' }}
                                                >
                                                    ×
                                                </button>
                                            </span>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* New Service Form */}
                            <div style={{ padding: '20px', background: 'var(--bg-main)', borderRadius: '12px', border: '1px solid var(--border)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                                <h4 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px', color: 'var(--text-primary)' }}>Agregar Nuevo Servicio</h4>
                                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px' }}>
                                    <div>
                                        <label style={labelStyle}>Nombre del Servicio</label>
                                        <input type="text" style={inputStyle} value={newService.name} onChange={e => setNewService({ ...newService, name: e.target.value })} placeholder="Ej: Corte de Pelo" />
                                    </div>
                                    <div>
                                        <label style={labelStyle}>Precio ($)</label>
                                        <input type="number" style={inputStyle} value={newService.price} onChange={e => setNewService({ ...newService, price: e.target.value })} placeholder="0.00" />
                                    </div>
                                    <div>
                                        <label style={labelStyle}>Duración (min)</label>
                                        <input type="number" style={inputStyle} value={newService.duration} onChange={e => setNewService({ ...newService, duration: e.target.value })} placeholder="60" />
                                    </div>
                                    <div>
                                        <label style={labelStyle}>Categoría</label>
                                        <select style={inputStyle} value={newService.category} onChange={e => setNewService({ ...newService, category: e.target.value })}>
                                            <option value="">Seleccionar Categoría</option>
                                            {serviceCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                            <option value="Otro">Otro</option>
                                        </select>
                                    </div>
                                    <div style={{ gridColumn: isMobile ? 'span 1' : 'span 2' }}>
                                        <label style={labelStyle}>Descripción</label>
                                        <textarea style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }} value={newService.description} onChange={e => setNewService({ ...newService, description: e.target.value })} placeholder="Descripción opcional..." />
                                    </div>
                                    <div style={{ gridColumn: isMobile ? 'span 1' : 'span 2' }}>
                                        <label style={labelStyle}>Imagen de Referencia (Opcional)</label>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px' }}>
                                            {newService.image_url && (
                                                <img
                                                    src={newService.image_url}
                                                    alt="Preview"
                                                    style={{
                                                        width: '80px',
                                                        height: '80px',
                                                        objectFit: 'cover',
                                                        borderRadius: '8px',
                                                        border: '1px solid var(--border)'
                                                    }}
                                                />
                                            )}
                                            <input
                                                type="file"
                                                id="new-service-image"
                                                style={{ display: 'none' }}
                                                accept="image/*"
                                                onChange={async (e) => {
                                                    const file = e.target.files[0];
                                                    if (!file) return;
                                                    try {
                                                        showToast('Subiendo imagen...', 'info');
                                                        const url = await serviceAdapter.uploadImage(file);
                                                        setNewService({ ...newService, image_url: url });
                                                        showToast('Imagen cargada', 'success');
                                                    } catch (error) {
                                                        console.error(error);
                                                        showToast('Error al subir imagen', 'error');
                                                    }
                                                }}
                                            />
                                            <label
                                                htmlFor="new-service-image"
                                                style={{
                                                    padding: '8px 16px',
                                                    borderRadius: '8px',
                                                    border: '1px solid var(--border)',
                                                    background: 'var(--bg-card)',
                                                    cursor: 'pointer',
                                                    fontSize: '13px',
                                                    fontWeight: '600',
                                                    color: 'var(--text-primary)'
                                                }}
                                            >
                                                📷 {newService.image_url ? 'Cambiar' : 'Subir'} Imagen
                                            </label>
                                            {newService.image_url && (
                                                <button
                                                    type="button"
                                                    onClick={() => setNewService({ ...newService, image_url: null })}
                                                    style={{
                                                        padding: '8px 16px',
                                                        borderRadius: '8px',
                                                        border: '1px solid #ef4444',
                                                        background: 'rgba(239, 68, 68, 0.1)',
                                                        color: '#ef4444',
                                                        cursor: 'pointer',
                                                        fontSize: '13px',
                                                        fontWeight: '600'
                                                    }}
                                                >
                                                    🗑️ Quitar
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => {
                                        if (!newService.name || !newService.price) {
                                            showToast('Nombre y precio son obligatorios', 'error');
                                            return;
                                        }
                                        const generateUUID = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
                                            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
                                            return v.toString(16);
                                        });
                                        const serviceToAdd = { ...newService, id: generateUUID() };
                                        const updatedServices = [...services, serviceToAdd];
                                        handleInputChange('services', updatedServices);
                                        setNewService({ name: '', price: '', duration: '60', description: '', category: '', image_url: null });
                                        showToast('Servicio agregado a la lista. No olvides guardar.', 'success');
                                    }}
                                    style={{
                                        width: '100%', padding: '12px', borderRadius: '12px', background: 'var(--primary-paddle)', color: '#fff',
                                        fontWeight: '700', cursor: 'pointer', marginTop: '16px', border: 'none'
                                    }}
                                >
                                    + Agregar a la Lista
                                </button>
                            </div>

                            {services.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '40px', background: 'var(--bg-main)', borderRadius: '12px' }}>
                                    <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                                        No hay servicios configurados aún.
                                    </p>
                                </div>
                            ) : (
                                <div style={{ display: 'grid', gap: '12px' }}>
                                    {services.map((service, index) => (
                                        <div key={service.id || index} style={{
                                            padding: '16px',
                                            background: 'var(--bg-main)',
                                            borderRadius: '12px',
                                            border: '1px solid var(--border)'
                                        }}>
                                            <div style={{ display: 'grid', gap: '12px' }}>
                                                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr 1fr', gap: '12px' }}>
                                                    <div>
                                                        <label style={{ ...labelStyle, marginBottom: '4px' }}>Nombre del Servicio</label>
                                                        <input
                                                            type="text"
                                                            value={service.name || ''}
                                                            onChange={(e) => {
                                                                const newServices = [...services];
                                                                newServices[index] = { ...service, name: e.target.value };
                                                                handleInputChange('services', newServices);
                                                            }}
                                                            style={inputStyle}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label style={{ ...labelStyle, marginBottom: '4px' }}>Precio ($)</label>
                                                        <input
                                                            type="number"
                                                            value={service.price || ''}
                                                            onChange={(e) => {
                                                                const newServices = [...services];
                                                                newServices[index] = { ...service, price: e.target.value };
                                                                handleInputChange('services', newServices);
                                                            }}
                                                            style={inputStyle}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label style={{ ...labelStyle, marginBottom: '4px' }}>Duración (min)</label>
                                                        <input
                                                            type="number"
                                                            value={service.duration || ''}
                                                            onChange={(e) => {
                                                                const newServices = [...services];
                                                                newServices[index] = { ...service, duration: e.target.value };
                                                                handleInputChange('services', newServices);
                                                            }}
                                                            style={inputStyle}
                                                        />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label style={{ ...labelStyle, marginBottom: '4px' }}>Descripción (opcional)</label>
                                                    <textarea
                                                        value={service.description || ''}
                                                        onChange={(e) => {
                                                            const newServices = [...services];
                                                            newServices[index] = { ...service, description: e.target.value };
                                                            handleInputChange('services', newServices);
                                                        }}
                                                        style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }}
                                                    />
                                                </div>
                                                {serviceCategories.length > 0 && (
                                                    <div>
                                                        <label style={{ ...labelStyle, marginBottom: '4px' }}>Categoría</label>
                                                        <select
                                                            value={service.category || ''}
                                                            onChange={(e) => {
                                                                const newServices = [...services];
                                                                newServices[index] = { ...service, category: e.target.value };
                                                                handleInputChange('services', newServices);
                                                            }}
                                                            style={inputStyle}
                                                        >
                                                            <option value="">Sin categoría</option>
                                                            {serviceCategories.map(cat => (
                                                                <option key={cat} value={cat}>{cat}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                )}\r
                                                <div>
                                                    <label style={{ ...labelStyle, marginBottom: '4px' }}>Imagen de Referencia</label>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px' }}>
                                                        {service.image_url && (
                                                            <img
                                                                src={service.image_url}
                                                                alt={service.name}
                                                                style={{
                                                                    width: '60px',
                                                                    height: '60px',
                                                                    objectFit: 'cover',
                                                                    borderRadius: '8px',
                                                                    border: '1px solid var(--border)'
                                                                }}
                                                            />
                                                        )}
                                                        <input
                                                            type="file"
                                                            id={`service-image-${index}`}
                                                            style={{ display: 'none' }}
                                                            accept="image/*"
                                                            onChange={async (e) => {
                                                                const file = e.target.files[0];
                                                                if (!file) return;
                                                                try {
                                                                    // Show loading state implicitly or use a toaster
                                                                    // In BusinessSettings, handleGalleryUpload uses serviceAdapter.uploadBusinessGalleryImage
                                                                    const imageUrl = await serviceAdapter.uploadBusinessGalleryImage(business.id, file);

                                                                    const newServices = [...services];
                                                                    newServices[index] = { ...service, image_url: imageUrl };
                                                                    handleInputChange('services', newServices);
                                                                    showToast('Imagen cargada', 'success');
                                                                } catch (error) {
                                                                    console.error('Error uploading image:', error);
                                                                    showToast('Error al subir imagen', 'error');
                                                                }
                                                            }}
                                                        />
                                                        <label
                                                            htmlFor={`service-image-${index}`}
                                                            style={{
                                                                padding: '6px 12px',
                                                                borderRadius: '8px',
                                                                border: '1px solid var(--border)',
                                                                background: 'var(--bg-card)',
                                                                cursor: 'pointer',
                                                                fontSize: '12px',
                                                                fontWeight: '600',
                                                                color: 'var(--text-primary)'
                                                            }}
                                                        >
                                                            📷 {service.image_url ? 'Cambiar' : 'Subir'}
                                                        </label>
                                                        {service.image_url && (
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    const newServices = [...services];
                                                                    newServices[index] = { ...service, image_url: null };
                                                                    handleInputChange('services', newServices);
                                                                }}
                                                                style={{
                                                                    padding: '6px 12px',
                                                                    borderRadius: '8px',
                                                                    border: '1px solid #ef4444',
                                                                    background: 'rgba(239, 68, 68, 0.1)',
                                                                    color: '#ef4444',
                                                                    cursor: 'pointer',
                                                                    fontSize: '12px',
                                                                    fontWeight: '600'
                                                                }}
                                                            >
                                                                🗑️
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Specialist Assignment Section */}
                                                <div style={{ marginTop: '16px', padding: '16px', background: 'rgba(0,0,0,0.02)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                                                    <h5 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '12px', color: 'var(--text-primary)' }}>
                                                        Profesionales Asignados
                                                    </h5>
                                                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                                                        Selecciona quiénes pueden realizar este servicio:
                                                    </p>

                                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '8px' }}>
                                                        {formData.specialists?.map(specialist => (
                                                            <label key={specialist.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', padding: '4px' }}>
                                                                <input
                                                                    type="checkbox"
                                                                    checked={serviceSpecialists[service.id]?.includes(specialist.id) || false}
                                                                    onChange={(e) => {
                                                                        const isChecked = e.target.checked;
                                                                        setServiceSpecialists(prev => {
                                                                            const current = prev[service.id] || [];
                                                                            const updated = isChecked
                                                                                ? [...current, specialist.id]
                                                                                : current.filter(id => id !== specialist.id);
                                                                            return { ...prev, [service.id]: updated };
                                                                        });
                                                                    }}
                                                                    style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                                                                />
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                    {specialist.avatar_url && (
                                                                        <img src={specialist.avatar_url} alt="" style={{ width: '20px', height: '20px', borderRadius: '50%', objectFit: 'cover' }} />
                                                                    )}
                                                                    <span>{specialist.name}</span>
                                                                </div>
                                                            </label>
                                                        ))}
                                                    </div>
                                                    {(!serviceSpecialists[service.id] || serviceSpecialists[service.id].length === 0) && (
                                                        <div style={{ marginTop: '8px', fontSize: '12px', color: '#ff9800', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                            ⚠️ No hay profesionales asignados. Este servicio no podrá ser reservado.
                                                        </div>
                                                    )}
                                                </div>

                                            </div>

                                            <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                                                <button
                                                    onClick={async () => {
                                                        const confirmed = await showConfirm(
                                                            '¿Eliminar servicio?',
                                                            `¿Estás seguro de que deseas eliminar "${service.name}"?`,
                                                            'Eliminar',
                                                            'Cancelar'
                                                        );
                                                        if (confirmed) {
                                                            const newServices = services.filter((_, i) => i !== index);
                                                            handleInputChange('services', newServices);
                                                        }
                                                    }}
                                                    style={{
                                                        padding: '8px 16px',
                                                        borderRadius: '8px',
                                                        border: '1px solid #ef4444',
                                                        background: 'rgba(239, 68, 68, 0.1)',
                                                        color: '#ef4444',
                                                        cursor: 'pointer',
                                                        fontWeight: '600',
                                                        fontSize: '13px'
                                                    }}
                                                >
                                                    🗑️ Eliminar Servicio
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Add Service Button */}

                        </div>

                        <button
                            onClick={() => handleSave({
                                services: formData.services,
                                service_categories: formData.service_categories
                            })}
                            style={saveButtonStyle}
                            disabled={saving}
                        >
                            {saving ? 'Guardando...' : 'Guardar Servicios'}
                        </button>
                    </div>
                );

            case 'special_days':
                const specialDays = formData.special_days || [];

                return (
                    <div style={{ display: 'grid', gap: '24px' }}>
                        <div>
                            <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '8px', color: 'var(--text-primary)' }}>
                                Días Especiales y Feriados
                            </h3>
                            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
                                Marca días cerrados, feriados o con horarios/precios especiales.
                            </p>
                        </div>

                        {/* Add New Special Day */}
                        <div style={{ padding: '20px', background: 'var(--bg-main)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                            <h4 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '16px', color: 'var(--text-primary)' }}>
                                Agregar Día Especial
                            </h4>
                            <div style={{ display: 'grid', gap: '12px' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px' }}>
                                    <div>
                                        <label style={{ ...labelStyle, marginBottom: '4px' }}>Fecha</label>
                                        <input
                                            type="date"
                                            id="new-special-day-date"
                                            style={inputStyle}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ ...labelStyle, marginBottom: '4px' }}>Tipo</label>
                                        <select id="new-special-day-type" style={inputStyle}>
                                            <option value="closed">Cerrado</option>
                                            <option value="holiday">Feriado</option>
                                            <option value="special_hours">Horario Especial</option>
                                            <option value="special_price">Precio Especial</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label style={{ ...labelStyle, marginBottom: '4px' }}>Descripción</label>
                                    <input
                                        type="text"
                                        id="new-special-day-description"
                                        placeholder="Ej: Navidad, Año Nuevo, Promoción Especial"
                                        style={inputStyle}
                                    />
                                </div>
                                <button
                                    onClick={() => {
                                        const dateInput = document.getElementById('new-special-day-date');
                                        const typeInput = document.getElementById('new-special-day-type');
                                        const descInput = document.getElementById('new-special-day-description');

                                        if (!dateInput.value) {
                                            showToast('Por favor selecciona una fecha', 'warning');
                                            return;
                                        }

                                        const newSpecialDay = {
                                            id: `special_${Date.now()}`,
                                            date: dateInput.value,
                                            type: typeInput.value,
                                            description: descInput.value || typeInput.options[typeInput.selectedIndex].text
                                        };

                                        const updatedDays = [...specialDays, newSpecialDay];
                                        handleInputChange('special_days', updatedDays);

                                        // Clear inputs
                                        dateInput.value = '';
                                        typeInput.value = 'closed';
                                        descInput.value = '';

                                        showToast('Día especial agregado', 'success');
                                    }}
                                    style={{
                                        padding: '10px 16px',
                                        borderRadius: '8px',
                                        border: 'none',
                                        background: 'var(--primary-paddle)',
                                        color: '#000',
                                        cursor: 'pointer',
                                        fontWeight: '700',
                                        fontSize: '14px'
                                    }}
                                >
                                    + Agregar
                                </button>
                            </div>
                        </div>

                        {/* List of Special Days */}
                        {specialDays.length > 0 ? (
                            <div style={{ display: 'grid', gap: '12px' }}>
                                {specialDays
                                    .sort((a, b) => new Date(a.date) - new Date(b.date))
                                    .map((day, index) => {
                                        const typeLabels = {
                                            closed: { label: 'Cerrado', color: '#ef4444', icon: '🚫' },
                                            holiday: { label: 'Feriado', color: '#f59e0b', icon: '🎉' },
                                            special_hours: { label: 'Horario Especial', color: '#3b82f6', icon: '🕐' },
                                            special_price: { label: 'Precio Especial', color: '#10b981', icon: '💰' }
                                        };
                                        const typeInfo = typeLabels[day.type] || typeLabels.closed;

                                        return (
                                            <div key={day.id || index} style={{
                                                padding: '16px',
                                                background: 'var(--bg-main)',
                                                borderRadius: '12px',
                                                border: '1px solid var(--border)',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                gap: '16px'
                                            }}>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                                        <span style={{ fontSize: '16px' }}>{typeInfo.icon}</span>
                                                        <span style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>
                                                            {new Date(day.date + 'T00:00:00').toLocaleDateString('es-AR', {
                                                                weekday: 'long',
                                                                year: 'numeric',
                                                                month: 'long',
                                                                day: 'numeric'
                                                            })}
                                                        </span>
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                                                        <span style={{
                                                            padding: '4px 8px',
                                                            borderRadius: '6px',
                                                            background: `${typeInfo.color}20`,
                                                            color: typeInfo.color,
                                                            fontSize: '12px',
                                                            fontWeight: '600'
                                                        }}>
                                                            {typeInfo.label}
                                                        </span>
                                                        {day.description && (
                                                            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                                                                {day.description}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={async () => {
                                                        const confirmed = await showConfirm(
                                                            '¿Eliminar día especial?',
                                                            `¿Estás seguro de eliminar este día especial?`,
                                                            'Eliminar',
                                                            'Cancelar'
                                                        );
                                                        if (confirmed) {
                                                            const updatedDays = specialDays.filter((_, i) => i !== index);
                                                            handleInputChange('special_days', updatedDays);
                                                        }
                                                    }}
                                                    style={{
                                                        padding: '8px 12px',
                                                        borderRadius: '8px',
                                                        border: '1px solid #ef4444',
                                                        background: 'rgba(239, 68, 68, 0.1)',
                                                        color: '#ef4444',
                                                        cursor: 'pointer',
                                                        fontWeight: '600',
                                                        fontSize: '13px'
                                                    }}
                                                >
                                                    🗑️
                                                </button>
                                            </div>
                                        );
                                    })}
                            </div>
                        ) : (
                            <div style={{ textAlign: 'center', padding: '40px', background: 'var(--bg-main)', borderRadius: '12px' }}>
                                <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                                    No hay días especiales configurados.
                                </p>
                            </div>
                        )}

                        <button
                            onClick={() => handleSave({ special_days: formData.special_days })}
                            style={saveButtonStyle}
                            disabled={saving}
                        >
                            {saving ? 'Guardando...' : 'Guardar Días Especiales'}
                        </button>
                    </div>
                );

            case 'design':
                return (
                    <div style={{ display: 'grid', gap: '24px' }}>
                        <div>
                            <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '8px', color: 'var(--text-primary)' }}>
                                Personalización de Diseño
                            </h3>
                            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
                                Personaliza la apariencia de tu perfil público para que se ajuste a tu marca.
                            </p>

                            <div style={{ display: 'grid', gap: '24px' }}>
                                {/* Theme Selection */}
                                <div>
                                    <label style={labelStyle}>Tema del Perfil</label>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '8px' }}>
                                        <div
                                            onClick={() => handleInputChange('theme', 'light')}
                                            style={{
                                                padding: '16px',
                                                borderRadius: '12px',
                                                border: formData.theme === 'light' ? '2px solid var(--primary-paddle)' : '1px solid var(--border)',
                                                background: '#ffffff',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s',
                                                position: 'relative'
                                            }}
                                        >
                                            <div style={{ fontSize: '16px', fontWeight: '700', color: '#000000', marginBottom: '4px' }}>Claro</div>
                                            <div style={{ fontSize: '12px', color: '#666666' }}>Fondo blanco, texto oscuro</div>
                                            {formData.theme === 'light' && (
                                                <div style={{ position: 'absolute', top: '8px', right: '8px', color: 'var(--primary-paddle)' }}>✓</div>
                                            )}
                                        </div>

                                        <div
                                            onClick={() => handleInputChange('theme', 'dark')}
                                            style={{
                                                padding: '16px',
                                                borderRadius: '12px',
                                                border: formData.theme === 'dark' ? '2px solid var(--primary-paddle)' : '1px solid var(--border)',
                                                background: '#1a1a1a',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s',
                                                position: 'relative'
                                            }}
                                        >
                                            <div style={{ fontSize: '16px', fontWeight: '700', color: '#ffffff', marginBottom: '4px' }}>Oscuro</div>
                                            <div style={{ fontSize: '12px', color: '#999999' }}>Fondo oscuro, texto claro</div>
                                            {formData.theme === 'dark' && (
                                                <div style={{ position: 'absolute', top: '8px', right: '8px', color: 'var(--primary-paddle)' }}>✓</div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Colors */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                    <div>
                                        <label style={labelStyle}>Color Principal</label>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px' }}>
                                            <input
                                                type="color"
                                                value={formData.primary_color || '#3b82f6'}
                                                onChange={(e) => handleInputChange('primary_color', e.target.value)}
                                                style={{
                                                    width: '50px',
                                                    height: '50px',
                                                    padding: '0',
                                                    border: 'none',
                                                    borderRadius: '8px',
                                                    cursor: 'pointer',
                                                    background: 'none'
                                                }}
                                            />
                                            <input
                                                type="text"
                                                value={formData.primary_color || '#3b82f6'}
                                                onChange={(e) => handleInputChange('primary_color', e.target.value)}
                                                style={{ ...inputStyle, width: '120px' }}
                                                placeholder="#3b82f6"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label style={labelStyle}>Color de Botones</label>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px' }}>
                                            <input
                                                type="color"
                                                value={formData.button_color || '#3b82f6'}
                                                onChange={(e) => handleInputChange('button_color', e.target.value)}
                                                style={{
                                                    width: '50px',
                                                    height: '50px',
                                                    padding: '0',
                                                    border: 'none',
                                                    borderRadius: '8px',
                                                    cursor: 'pointer',
                                                    background: 'none'
                                                }}
                                            />
                                            <input
                                                type="text"
                                                value={formData.button_color || '#3b82f6'}
                                                onChange={(e) => handleInputChange('button_color', e.target.value)}
                                                style={{ ...inputStyle, width: '120px' }}
                                                placeholder="#3b82f6"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Recommended Colors */}
                                <div>
                                    <label style={labelStyle}>Colores Recomendados</label>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '10px' }}>
                                        {[
                                            '#3b82f6', // Blue
                                            '#8b5cf6', // Purple
                                            '#ec4899', // Pink
                                            '#f97316', // Orange
                                            '#10b981', // Green
                                            '#ef4444', // Red
                                            '#14b8a6', // Teal
                                            '#111827'  // Dark
                                        ].map(color => (
                                            <div
                                                key={color}
                                                onClick={() => {
                                                    handleInputChange('primary_color', color);
                                                    handleInputChange('button_color', color);
                                                }}
                                                style={{
                                                    width: '40px',
                                                    height: '40px',
                                                    borderRadius: '50%',
                                                    background: color,
                                                    cursor: 'pointer',
                                                    border: formData.primary_color === color ? '3px solid var(--text-primary)' : '1px solid rgba(0,0,0,0.1)',
                                                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                                    transition: 'transform 0.2s',
                                                }}
                                                title={color}
                                                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
                                                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={() => handleSave({
                                theme: formData.theme,
                                primary_color: formData.primary_color,
                                button_color: formData.button_color
                            })}
                            style={saveButtonStyle}
                            disabled={saving}
                        >
                            {saving ? 'Guardando...' : 'Guardar Diseño'}
                        </button>
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
                <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
                    {/* Desktop Sidebar */}
                    <div style={{
                        width: '240px',
                        flexShrink: 0,
                        borderRight: '1px solid var(--border)',
                        padding: '16px 12px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                        backgroundColor: 'rgba(0,0,0,0.02)',
                        overflowY: 'auto'
                    }}>
                        {tabs.map(tab => {
                            const isActive = activeTab === tab.id;
                            return (
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
                                        background: isActive ? 'var(--primary-paddle)' : 'transparent',
                                        color: isActive ? '#000000' : 'var(--text-primary)',
                                        cursor: 'pointer',
                                        fontWeight: isActive ? '800' : '600',
                                        fontSize: '14px',
                                        textAlign: 'left',
                                        whiteSpace: 'nowrap',
                                        transition: 'all 0.15s ease',
                                        boxShadow: isActive ? '0 4px 12px rgba(0,230,118,0.25)' : 'none'
                                    }}
                                >
                                    <span style={{ fontSize: '18px' }}>{tab.icon}</span>
                                    {tab.label}
                                </button>
                            );
                        })}
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
    borderRadius: '6px',
    border: 'none',
    background: '#3ECF8E',
    color: '#121212',
    fontWeight: '600',
    fontSize: '14px',
    cursor: 'pointer',
    boxShadow: 'none',
    width: '100%',
    textAlign: 'center',
    transition: 'all 0.15s ease'
};

const buttonSecondaryStyle = {
    display: 'inline-block',
    padding: '8px 16px',
    borderRadius: '6px',
    border: '1px solid #2E2E2E',
    background: '#242424',
    color: '#EDEDED',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    boxShadow: 'none',
    transition: 'all 0.15s ease'
};
