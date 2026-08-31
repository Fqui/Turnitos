import React, { useState, useEffect } from 'react';
import serviceAdapter from '../services/serviceAdapter';
import { useNotification } from '../contexts/NotificationContext';
import SubscriptionManager from './SubscriptionManager';
import LinkBioButtonsSettings from './venue/LinkBioButtonsSettings';
import CouponsSettings from './venue/CouponsSettings';

// Modular Settings Tabs
import GeneralTab from './business/settings/GeneralTab';
import AppearanceTab from './business/settings/AppearanceTab';
import AmenitiesTab from './business/settings/AmenitiesTab';
import RentalTab from './business/settings/RentalTab';
import ScheduleTab from './business/settings/ScheduleTab';
import ServicesTab from './business/settings/ServicesTab';
import PoliciesAndPaymentsTab from './business/settings/PoliciesAndPaymentsTab';
import SpecialDaysTab from './business/settings/SpecialDaysTab';
import GalleryTab from './business/settings/GalleryTab';
import StoreTab from './business/settings/StoreTab';

export default function BusinessSettings({ business, onUpdate, isMobile }) {
    const { showToast, showConfirm, showAlert } = useNotification();
    
    // Check business type for initial tab selection
    const initCategory = (business?.categories?.name || business?.category || '').toLowerCase();
    const initSubcat = (business?.subcategories?.[0]?.name || business?.subcategories?.[0]?.slug || '').toLowerCase();
    const initType = (business?.type || '').toLowerCase();
    const initIsSport = initType === 'sport' || initCategory.includes('deporte') || initSubcat.includes('futbol') || initSubcat.includes('padel') || ((business?.courts?.length || 0) > 0);

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
    const [subscription, setSubscription] = useState(null);

    // Service-Specialist Assignments
    const [serviceSpecialists, setServiceSpecialists] = useState({}); // { serviceId: [specialistId1, ...] }

    const handleMetadataChange = (key, value) => {
        setFormData(prev => ({
            ...prev,
            metadata: {
                ...(prev?.metadata || {}),
                [key]: value
            }
        }));
    };

    // Fetch specialist assignments when services tab is active
    useEffect(() => {
        if (activeTab === 'services' && formData.services?.length > 0) {
            const fetchAssignments = async () => {
                const assignments = {};
                for (const service of formData.services) {
                    if (service.id) {
                        try {
                            const targetBizId = business?.id || formData?.id;
                            const specialists = await serviceAdapter.getQualifiedSpecialists(service.id, targetBizId);
                            if (specialists && specialists.length > 0) {
                                assignments[service.id] = specialists.map(s => s.id);
                            } else if (formData.specialists?.length > 0) {
                                // Default all specialists if none specifically assigned
                                assignments[service.id] = formData.specialists.map(s => s.id);
                            }
                        } catch (err) {
                            console.error(`Error fetching specialists for service ${service.id}:`, err);
                        }
                    }
                }
                setServiceSpecialists(prev => ({ ...assignments, ...prev }));
            };
            fetchAssignments();
        }
    }, [activeTab, formData.services?.length]);

    useEffect(() => {
        if (business) {
            setFormData(prev => {
                const prevServicesCount = prev.services?.length || 0;
                const newServicesCount = business.services?.length || 0;
                const prevSpecsCount = prev.specialists?.length || 0;
                const newSpecsCount = business.specialists?.length || 0;

                // Check if any specialist avatar_url changed (photo upload)
                const prevSpecsJson = JSON.stringify((prev.specialists || []).map(s => ({ id: s.id, avatar_url: s.avatar_url, name: s.name })));
                const newSpecsJson = JSON.stringify((business.specialists || []).map(s => ({ id: s.id, avatar_url: s.avatar_url, name: s.name })));
                const specialistsChanged = prevSpecsJson !== newSpecsJson;

                // Avoid resetting active edits if data has not meaningfully updated
                if (
                    prev.id === business.id &&
                    newServicesCount <= prevServicesCount &&
                    newSpecsCount <= prevSpecsCount &&
                    prev.name === business.name &&
                    prev.services && prev.services.length > 0 &&
                    !specialistsChanged
                ) {
                    return prev;
                }

                const meta = business?.metadata || {};
                return {
                    ...business,
                    services: (business.services && business.services.length > 0) ? business.services : (prev.services || []),
                    specialists: (business.specialists && business.specialists.length > 0) ? business.specialists : (prev.specialists || []),
                    store_enabled: business.store_enabled !== undefined ? business.store_enabled : (business.slug === 'cancha-apolo'),
                    gallery_highlights: business?.gallery_highlights || [],
                    metadata: {
                        ...meta,
                        store_banner_title: meta.store_banner_title || '',
                        store_banner_subtitle: meta.store_banner_subtitle || '',
                        store_products: meta.store_products || []
                    }
                };
            });
        }
    }, [business]);

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
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
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

    const handleSave = async (specificUpdates = null) => {
        try {
            setSaving(true);
            const dataToSave = specificUpdates || formData;

            // Validate subscription limits for specialists or courts
            if (dataToSave.specialists || dataToSave.courts) {
                const businessType = formData?.type || business?.type;
                const resourceCount = dataToSave.specialists?.length || dataToSave.courts?.length || 0;

                const targetId = business?.id || formData?.id || formData?.business_id;
                if (resourceCount > 0 && targetId) {
                    try {
                        const currentSub = await serviceAdapter.getSubscription(targetId);

                        const allowedSpaces = Math.max(
                            currentSub?.spaces_included || 0,
                            business?.capacity || 0,
                            business?.resources_count || 0,
                            business?.courts?.length || 0,
                            business?.specialists?.length || 0,
                            formData?.courts?.length || 0,
                            formData?.specialists?.length || 0,
                            resourceCount,
                            2
                        );

                        if (currentSub && resourceCount > allowedSpaces) {
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
                    }
                }
            }

            const targetId = business?.id || formData?.id || formData?.business_id;
            if (targetId) {
                await serviceAdapter.patchBusiness(targetId, dataToSave);
            }

            // Save service-specialist assignments for services that have IDs
            const servicesToProcess = dataToSave.services || formData.services || [];
            if (servicesToProcess.length > 0) {
                const updatePromises = [];
                for (const service of servicesToProcess) {
                    if (service?.id) {
                        let specIds = serviceSpecialists[service.id];
                        if (!Array.isArray(specIds)) {
                            specIds = (formData.specialists || business?.specialists || []).map(s => s.id);
                        }
                        updatePromises.push(
                            serviceAdapter.updateServiceSpecialists(service.id, specIds)
                        );
                    }
                }

                if (updatePromises.length > 0) {
                    try {
                        await Promise.all(updatePromises);
                    } catch (err) {
                        console.warn('Service specialists update failed:', err);
                    }
                }
            }

            // Re-fetch fresh detailed business data from DB
            let freshBiz = null;
            if (targetId) {
                try {
                    freshBiz = await serviceAdapter.getBusinessById(targetId);
                } catch (e) {
                    console.warn('Error fetching fresh business after save:', e);
                }
            }

            // Merge avatar_url into freshBiz specialists in case DB response is slightly stale
            if (freshBiz && dataToSave.specialists && freshBiz.specialists) {
                freshBiz.specialists = freshBiz.specialists.map(sp => {
                    const saved = dataToSave.specialists.find(s => s.id === sp.id);
                    return saved && saved.avatar_url ? { ...sp, avatar_url: saved.avatar_url } : sp;
                });
            }

            const updated = freshBiz || { ...(business || {}), ...dataToSave };
            setFormData(prev => ({ ...prev, ...updated }));

            if (onUpdate && typeof onUpdate === 'function') {
                onUpdate(updated);
            }
            showToast('Configuración guardada correctamente', 'success');
        } catch (error) {
            console.error('Error saving settings:', error);
            const updated = { ...(business || {}), ...(specificUpdates || formData) };
            if (onUpdate && typeof onUpdate === 'function') {
                onUpdate(updated);
            }
            showToast('Configuración guardada localmente', 'success');
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

    const tabs = [
        { id: 'general', label: 'General y Ubicación', icon: '📍' },
        { id: 'appearance', label: 'Apariencia y Colores', icon: '🎨' },
        { id: 'subscription', label: isSport ? 'Canchas' : (isServiceBusiness ? 'Especialistas' : 'Suscripción'), icon: isSport ? '🎾' : (isServiceBusiness ? '👥' : '💳') },
        ...(isServiceBusiness ? [{ id: 'services', label: 'Servicios', icon: '💼' }] : []),
        ...(isRentalBusiness ? [{ id: 'rental', label: 'Alquiler', icon: '🔑' }] : []),
        { id: 'schedule', label: 'Horarios', icon: '⏰' },
        { id: 'policies_and_payments', label: 'Políticas y Pagos', icon: '📜' },
        { id: 'special_days', label: 'Días Especiales', icon: '📅' },
        { id: 'gallery', label: 'Historias y Galería', icon: '📸' },
        { id: 'store', label: 'Tienda', icon: '🛒' },
        { id: 'linkbio', label: 'Botones del LinkBio', icon: '🔗' },
        { id: 'coupons', label: 'Cupones y Promos', icon: '🏷️' },
        { id: 'amenities', label: 'Comodidades', icon: '🛋️' }
    ];

    const renderTabContent = () => {
        switch (activeTab) {
            case 'general':
                return (
                    <GeneralTab
                        formData={formData}
                        setFormData={setFormData}
                        handleInputChange={handleInputChange}
                        handleSave={handleSave}
                        saving={saving}
                        isMobile={isMobile}
                        labelStyle={labelStyle}
                        inputStyle={inputStyle}
                        hintStyle={hintStyle}
                        saveButtonStyle={saveButtonStyle}
                    />
                );

            case 'appearance':
                return (
                    <AppearanceTab
                        formData={formData}
                        setFormData={setFormData}
                        handleInputChange={handleInputChange}
                        handleSave={handleSave}
                        saving={saving}
                        uploadingLogo={uploadingLogo}
                        uploadingBanner={uploadingBanner}
                        handleLogoUpload={handleLogoUpload}
                        handleBannerUpload={handleBannerUpload}
                        labelStyle={labelStyle}
                        inputStyle={inputStyle}
                        buttonSecondaryStyle={buttonSecondaryStyle}
                        saveButtonStyle={saveButtonStyle}
                    />
                );

            case 'subscription':
                return (
                    <SubscriptionManager
                        businessId={formData?.id || business?.id}
                        businessType={formData?.type || business?.type}
                        business={business}
                        formData={formData}
                        onSave={handleSave}
                        saving={saving}
                        serviceAdapter={serviceAdapter}
                        showToast={showToast}
                        onResourcesChange={(key, list) => {
                            setFormData(prev => ({ ...prev, [key]: list }));
                            handleInputChange(key, list);
                        }}
                    />
                );

            case 'services':
                return (
                    <ServicesTab
                        formData={formData}
                        business={business}
                        handleInputChange={handleInputChange}
                        handleSave={handleSave}
                        saving={saving}
                        serviceSpecialists={serviceSpecialists}
                        setServiceSpecialists={setServiceSpecialists}
                        showToast={showToast}
                        showConfirm={showConfirm}
                        isMobile={isMobile}
                        labelStyle={labelStyle}
                        inputStyle={inputStyle}
                        buttonSecondaryStyle={buttonSecondaryStyle}
                        saveButtonStyle={saveButtonStyle}
                    />
                );

            case 'rental':
                return (
                    <RentalTab
                        formData={formData}
                        handleInputChange={handleInputChange}
                        handleMetadataChange={handleMetadataChange}
                        handleSave={handleSave}
                        saving={saving}
                        showToast={showToast}
                        labelStyle={labelStyle}
                        inputStyle={inputStyle}
                        buttonSecondaryStyle={buttonSecondaryStyle}
                        saveButtonStyle={saveButtonStyle}
                    />
                );

            case 'schedule':
                return (
                    <ScheduleTab
                        formData={formData}
                        handleInputChange={handleInputChange}
                        handleSave={handleSave}
                        saving={saving}
                        isMobile={isMobile}
                        showToast={showToast}
                        labelStyle={labelStyle}
                        inputStyle={inputStyle}
                        saveButtonStyle={saveButtonStyle}
                    />
                );

            case 'policies_and_payments':
                return (
                    <PoliciesAndPaymentsTab
                        formData={formData}
                        handleInputChange={handleInputChange}
                        handleSave={handleSave}
                        saving={saving}
                        isMobile={isMobile}
                        labelStyle={labelStyle}
                        inputStyle={inputStyle}
                        saveButtonStyle={saveButtonStyle}
                    />
                );

            case 'special_days':
                return (
                    <SpecialDaysTab
                        formData={formData}
                        handleInputChange={handleInputChange}
                        handleSave={handleSave}
                        saving={saving}
                        showToast={showToast}
                        showConfirm={showConfirm}
                        isMobile={isMobile}
                        labelStyle={labelStyle}
                        inputStyle={inputStyle}
                        saveButtonStyle={saveButtonStyle}
                    />
                );

            case 'gallery':
                return (
                    <GalleryTab
                        formData={formData}
                        setFormData={setFormData}
                        handleInputChange={handleInputChange}
                        handleSave={handleSave}
                        setSaving={setSaving}
                        isRentalBusiness={isRentalBusiness}
                        showToast={showToast}
                        showConfirm={showConfirm}
                        showAlert={showAlert}
                        labelStyle={labelStyle}
                        inputStyle={inputStyle}
                        buttonSecondaryStyle={buttonSecondaryStyle}
                        saveButtonStyle={saveButtonStyle}
                    />
                );

            case 'store':
                return (
                    <StoreTab
                        formData={formData}
                        handleInputChange={handleInputChange}
                        handleMetadataChange={handleMetadataChange}
                        handleSave={handleSave}
                        saving={saving}
                        isMobile={isMobile}
                        showToast={showToast}
                        labelStyle={labelStyle}
                        inputStyle={inputStyle}
                        saveButtonStyle={saveButtonStyle}
                    />
                );

            case 'linkbio':
                return (
                    <LinkBioButtonsSettings
                        business={formData}
                        onUpdate={(updatedData) => {
                            setFormData(prev => ({ ...prev, ...updatedData }));
                            if (onUpdate) onUpdate({ ...business, ...updatedData });
                        }}
                    />
                );

            case 'coupons':
                return (
                    <CouponsSettings
                        business={formData}
                        onUpdate={(updatedData) => {
                            setFormData(prev => ({ ...prev, ...updatedData }));
                            if (onUpdate) onUpdate({ ...business, ...updatedData });
                        }}
                    />
                );

            case 'amenities':
                return (
                    <AmenitiesTab
                        formData={formData}
                        handleInputChange={handleInputChange}
                        handleSave={handleSave}
                        saving={saving}
                        showToast={showToast}
                        labelStyle={labelStyle}
                        inputStyle={inputStyle}
                        buttonSecondaryStyle={buttonSecondaryStyle}
                        saveButtonStyle={saveButtonStyle}
                    />
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
                                    type="button"
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
                                    type="button"
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
