import React, { useState, useEffect } from 'react';
import serviceAdapter from '../../services/serviceAdapter';
import { useNotification } from '../../contexts/NotificationContext';
import AmenityIcon from '../common/AmenityIcon';
import LinkBioButtonsSettings from './LinkBioButtonsSettings';
import CouponsSettings from './CouponsSettings';

import VenueGeneralTab from './settings/VenueGeneralTab';
import VenueAppearanceTab from './settings/VenueAppearanceTab';
import VenueGalleryTab from './settings/VenueGalleryTab';
import VenuePricingTab from './settings/VenuePricingTab';
import VenueServicesTab from './settings/VenueServicesTab';
import VenueAmenitiesTab from './settings/VenueAmenitiesTab';
import VenueStoreTab from './settings/VenueStoreTab';
import VenueWhatsappTab from './settings/VenueWhatsappTab';

export default function VenueSettings({ business, onUpdate, isMobile }) {
    const { showToast } = useNotification();
    const [activeTab, setActiveTab] = useState('general');
    const [saving, setSaving] = useState(false);

    const [formData, setFormData] = useState({
        ...business,
        whatsapp_templates: business?.whatsapp_templates || business?.metadata?.whatsapp_templates || {},
        custom_links: business?.custom_links || business?.metadata?.custom_links || []
    });

    const [newAmenityName, setNewAmenityName] = useState('');
    const [newAmenityIcon, setNewAmenityIcon] = useState('Sparkles');
    const [isIconPickerOpen, setIsIconPickerOpen] = useState(false);
    const [serviceIconPickerIndex, setServiceIconPickerIndex] = useState(null);

    // Gallery enhancement states
    const [isUploadingGallery, setIsUploadingGallery] = useState(false);
    const [previewGalleryImage, setPreviewGalleryImage] = useState(null);
    const [galleryDragOver, setGalleryDragOver] = useState(false);

    const handleImageUpload = async (e) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;
        await processGalleryFiles(files);
    };

    const processGalleryFiles = async (files) => {
        setIsUploadingGallery(true);
        showToast(`Subiendo ${files.length} foto(s)...`, 'info');

        const currentGallery = formData.metadata?.venue_gallery || [];
        const uploadedItems = [];

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            try {
                const url = await serviceAdapter.uploadImage(file);
                if (url) {
                    uploadedItems.push({
                        url,
                        caption: '',
                        category: 'General',
                        is_featured: currentGallery.length === 0 && uploadedItems.length === 0
                    });
                }
            } catch (err) {
                console.error('Error uploading gallery image:', err);
            }
        }

        if (uploadedItems.length > 0) {
            const updated = [...currentGallery, ...uploadedItems];
            handleMetadataChange('venue_gallery', updated);
            handleInputChange('gallery_images', updated.map(i => i.url));
            showToast(`¡${uploadedItems.length} foto(s) agregadas a la galería!`, 'success');
        } else {
            showToast('No se pudieron subir las imágenes', 'error');
        }
        setIsUploadingGallery(false);
    };

    const moveGalleryItem = (index, direction) => {
        const current = [...(formData.metadata?.venue_gallery || [])];
        const targetIndex = index + direction;
        if (targetIndex < 0 || targetIndex >= current.length) return;

        const temp = current[index];
        current[index] = current[targetIndex];
        current[targetIndex] = temp;

        handleMetadataChange('venue_gallery', current);
        handleInputChange('gallery_images', current.map(i => i.url));
    };

    // Ensure complex objects and defaults exist without resetting user data
    useEffect(() => {
        if (business) {
            setFormData(prev => ({
                ...business,
                ...prev,
                capacity_limit: prev.capacity_limit || business.capacity_limit || (business.max_capacity && business.max_capacity > 1 ? business.max_capacity : null) || business.metadata?.capacity_limit || 100,
                max_capacity: prev.max_capacity || business.max_capacity || business.capacity_limit || 100,
                price_per_hour: prev.price_per_hour || business.price_per_hour || business.price || 20000,
                metadata: {
                    ...(business.metadata || {}),
                    ...(prev.metadata || {})
                },
                pricing_tiers: (prev.pricing_tiers && prev.pricing_tiers.length > 0)
                    ? prev.pricing_tiers
                    : (business.pricing_tiers && business.pricing_tiers.length > 0)
                        ? business.pricing_tiers
                        : (business.metadata?.pricing_tiers && business.metadata.pricing_tiers.length > 0)
                            ? business.metadata.pricing_tiers
                            : [],
                additional_services: (prev.additional_services && prev.additional_services.length > 0)
                    ? prev.additional_services
                    : (business.additional_services || []),
                blocked_dates: (prev.blocked_dates && prev.blocked_dates.length > 0)
                    ? prev.blocked_dates
                    : (business.blocked_dates || business.metadata?.blocked_dates || []),
                rental_duration_options: prev.rental_duration_options || business.rental_duration_options || [4, 6, 8, 12, 24],
                duration_discounts: prev.duration_discounts || business.duration_discounts || business.metadata?.duration_discounts || {},
                amenities: prev.amenities || business.amenities || [],
                whatsapp_templates: prev.whatsapp_templates || business.whatsapp_templates || business.metadata?.whatsapp_templates || {},
                custom_links: (prev.custom_links && prev.custom_links.length > 0)
                    ? prev.custom_links
                    : (business.custom_links || business.metadata?.custom_links || [])
            }));
        }
    }, [business]);

    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleDurationDiscountChange = (hours, discountPct) => {
        const val = Math.max(0, Math.min(100, parseInt(discountPct) || 0));
        setFormData(prev => ({
            ...prev,
            duration_discounts: {
                ...(prev.duration_discounts || {}),
                [hours]: val
            }
        }));
    };

    const handleCapacityChange = (newCapacity) => {
        const cap = parseInt(newCapacity) || 0;
        setFormData(prev => {
            const currentTiers = prev.pricing_tiers || [];
            let updatedTiers = [...currentTiers];

            if (cap > 0) {
                if (updatedTiers.length === 0) {
                    updatedTiers = [{ min_guests: 5, max_guests: cap, price: prev.price_per_hour || 0 }];
                } else if (updatedTiers.length === 1) {
                    updatedTiers[0] = {
                        ...updatedTiers[0],
                        min_guests: 5,
                        max_guests: cap
                    };
                } else {
                    const lastIdx = updatedTiers.length - 1;
                    updatedTiers[lastIdx] = {
                        ...updatedTiers[lastIdx],
                        max_guests: cap
                    };
                }
            }

            return {
                ...prev,
                capacity_limit: cap,
                max_capacity: cap,
                pricing_tiers: updatedTiers
            };
        });
    };

    const handleMetadataChange = (key, value) => {
        setFormData(prev => ({
            ...prev,
            metadata: {
                ...prev.metadata,
                [key]: value
            }
        }));
    };

    const saveChanges = async () => {
        setSaving(true);
        try {
            const bId = business?.id || formData?.id || formData?.business_id;

            const safeCapacity = Number(formData.capacity_limit || formData.max_capacity || business?.capacity_limit || (business?.max_capacity && business.max_capacity > 1 ? business.max_capacity : null) || 0);

            // Validaciones obligatorias de Capacidad, Precios y Horas
            if (safeCapacity <= 0) {
                showToast('⚠️ La capacidad máxima debe ser mayor a 0 personas', 'warning');
                setSaving(false);
                return;
            }

            const tiers = formData.pricing_tiers || [];
            if (tiers.length === 0) {
                showToast('⚠️ Debes configurar al menos un rango de precios (Desde 5 hasta la capacidad)', 'warning');
                setSaving(false);
                return;
            }

            const hasInvalidPrice = tiers.some(t => !t.price || parseInt(t.price) <= 0);
            if (hasInvalidPrice) {
                showToast('⚠️ Todos los rangos de precio deben tener un valor mayor a $0', 'warning');
                setSaving(false);
                return;
            }

            const durationOpts = formData.rental_duration_options || [];
            if (durationOpts.length === 0) {
                showToast('⚠️ Debes seleccionar al menos una opción de duración permitida (Horas)', 'warning');
                setSaving(false);
                return;
            }

            const durationDiscounts = formData.duration_discounts || business?.duration_discounts || business?.metadata?.duration_discounts || {};
            const safePrice = Number(tiers[0]?.price || formData.price_per_hour || business?.price_per_hour || business?.price || 20000);
            const whatsappTemplates = formData.whatsapp_templates || formData.metadata?.whatsapp_templates || business?.whatsapp_templates || business?.metadata?.whatsapp_templates || {};

            const dataToSave = {
                ...business,
                ...formData,
                capacity_limit: safeCapacity,
                max_capacity: safeCapacity,
                price_per_hour: safePrice,
                theme: formData.theme || business?.theme || 'dark',
                primary_color: formData.primary_color || formData.button_color || business?.primary_color || '#84CC16',
                button_color: formData.button_color || formData.primary_color || business?.button_color || '#84CC16',
                pricing_tiers: tiers,
                duration_discounts: durationDiscounts,
                additional_services: formData.additional_services || business?.additional_services || [],
                blocked_dates: formData.blocked_dates || business?.blocked_dates || [],
                rental_duration_options: durationOpts,
                whatsapp_templates: whatsappTemplates,
                custom_links: formData.custom_links || business?.custom_links || [],
                metadata: {
                    ...(business?.metadata || {}),
                    ...(formData.metadata || {}),
                    capacity_limit: safeCapacity,
                    pricing_tiers: tiers,
                    duration_discounts: durationDiscounts,
                    blocked_dates: formData.blocked_dates || business?.blocked_dates || [],
                    venue_gallery: formData.metadata?.venue_gallery || [],
                    whatsapp_templates: whatsappTemplates,
                    custom_links: formData.custom_links || business?.custom_links || []
                },
                gallery_images: formData.metadata?.venue_gallery?.map(item => item.url) || formData.gallery_images || business?.gallery_images
            };

            if (bId) {
                await serviceAdapter.patchBusiness(bId, dataToSave);
            }

            try {
                const raw = localStorage.getItem('business');
                if (raw) {
                    const current = JSON.parse(raw);
                    localStorage.setItem('business', JSON.stringify({ ...current, ...dataToSave }));
                }
            } catch (e) { }

            if (onUpdate && typeof onUpdate === 'function') {
                onUpdate(dataToSave);
            }
            showToast('Cambios guardados correctamente', 'success');
        } catch (error) {
            console.error('Error saving venue settings:', error);
            if (onUpdate && typeof onUpdate === 'function') {
                onUpdate({ ...business, ...formData });
            }
            showToast('Error al guardar en el servidor', 'error');
        } finally {
            setSaving(false);
        }
    };

    // --- Stylings ---
    const containerStyle = {
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        gap: '24px',
        height: '100%',
        minHeight: '80vh'
    };

    const sidebarStyle = {
        width: isMobile ? '100%' : '250px',
        display: 'flex',
        flexDirection: isMobile ? 'row' : 'column',
        gap: '8px',
        overflowX: isMobile ? 'auto' : 'visible',
        paddingBottom: isMobile ? '16px' : '0',
        borderRight: isMobile ? 'none' : '1px solid var(--border)',
        borderBottom: isMobile ? '1px solid var(--border)' : 'none',
        flexShrink: 0
    };

    const contentStyle = {
        flex: 1,
        padding: isMobile ? '0' : '0 20px',
        maxWidth: '1000px'
    };

    const tabButtonStyle = (isActive) => ({
        padding: '12px 16px',
        borderRadius: '12px',
        border: 'none',
        background: isActive ? 'var(--primary-paddle)' : 'transparent',
        color: isActive ? '#000' : 'var(--text-secondary)',
        fontWeight: isActive ? '700' : '500',
        textAlign: 'left',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        fontSize: '14px',
        whiteSpace: 'nowrap',
        transition: 'all 0.2s'
    });

    const sectionTitleStyle = {
        fontSize: '20px',
        fontWeight: '800',
        marginBottom: '24px',
        color: 'var(--text-primary)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
    };

    const cardStyle = {
        background: 'var(--bg-main)',
        borderRadius: '16px',
        padding: '24px',
        border: '1px solid var(--border)',
        marginBottom: '24px'
    };

    const labelStyle = {
        display: 'block',
        fontSize: '13px',
        fontWeight: '600',
        marginBottom: '8px',
        color: 'var(--text-primary)'
    };

    const inputStyle = {
        width: '100%',
        padding: '12px',
        borderRadius: '10px',
        border: '1px solid var(--border)',
        background: 'var(--bg-card)',
        color: 'var(--text-primary)',
        fontSize: '14px'
    };

    const buttonStyle = {
        padding: '12px 24px',
        borderRadius: '10px',
        border: 'none',
        background: 'var(--primary-paddle)',
        color: '#000',
        fontWeight: '700',
        cursor: 'pointer',
        fontSize: '14px'
    };

    // Tiers Logic (Smart capacity-aware ranges)
    const addTier = () => {
        const maxCap = parseInt(formData.capacity_limit || formData.max_capacity) || 100;
        const currentTiers = [...(formData.pricing_tiers || [])];

        if (currentTiers.length === 0) {
            handleInputChange('pricing_tiers', [{ min_guests: 5, max_guests: maxCap, price: formData.price_per_hour || 20000 }]);
            return;
        }

        const lastTier = currentTiers[currentTiers.length - 1];
        const lastMin = parseInt(lastTier.min_guests) || 5;
        const lastMax = parseInt(lastTier.max_guests) || maxCap;
        const lastPrice = parseInt(lastTier.price) || 20000;

        if (lastMax >= maxCap) {
            if (lastMax - lastMin >= 6) {
                const midpoint = Math.floor((lastMin + lastMax) / 2);
                currentTiers[currentTiers.length - 1] = {
                    ...lastTier,
                    max_guests: midpoint
                };
                const newTier = {
                    min_guests: midpoint + 1,
                    max_guests: maxCap,
                    price: lastPrice + 5000
                };
                handleInputChange('pricing_tiers', [...currentTiers, newTier]);
                showToast(`Nuevo rango creado: ${midpoint + 1} a ${maxCap} personas`, 'success');
            } else {
                showToast(`El rango actual no tiene suficiente espacio para subdividir dentro de los ${maxCap} invitados`, 'warning');
            }
        } else {
            const nextMin = lastMax + 1;
            const newTier = {
                min_guests: nextMin,
                max_guests: maxCap,
                price: lastPrice + 5000
            };
            handleInputChange('pricing_tiers', [...currentTiers, newTier]);
            showToast(`Nuevo rango agregado de ${nextMin} a ${maxCap} personas`, 'success');
        }
    };

    const updateTier = (index, field, value) => {
        const maxCap = parseInt(formData.capacity_limit || formData.max_capacity) || 100;
        const newTiers = [...(formData.pricing_tiers || [])];
        let val = parseInt(value) || 0;

        if (field === 'max_guests' && val > maxCap) {
            val = maxCap;
        }

        newTiers[index] = { ...newTiers[index], [field]: val };
        handleInputChange('pricing_tiers', newTiers);
    };

    const removeTier = (index) => {
        const maxCap = parseInt(formData.capacity_limit || formData.max_capacity) || 100;
        const currentTiers = [...(formData.pricing_tiers || [])];
        if (currentTiers.length <= 1) {
            showToast('Debe existir al menos un rango de precios', 'warning');
            return;
        }
        currentTiers.splice(index, 1);
        if (currentTiers.length > 0) {
            currentTiers[currentTiers.length - 1] = {
                ...currentTiers[currentTiers.length - 1],
                max_guests: maxCap
            };
        }
        handleInputChange('pricing_tiers', currentTiers);
        showToast('Rango eliminado y capacidad recalculada', 'info');
    };

    return (
        <div style={containerStyle}>
            {/* Sidebar Navigation */}
            <div style={sidebarStyle}>
                {[
                    { id: 'general', label: 'General y Ubicación', icon: 'MapPin' },
                    { id: 'appearance', label: 'Apariencia y Colores', icon: 'Palette' },
                    { id: 'linkbio', label: 'Botones del LinkBio', icon: 'Link' },
                    { id: 'coupons', label: 'Cupones y Promos', icon: 'Tag' },
                    { id: 'gallery', label: 'Galería de Fotos', icon: 'Image' },
                    { id: 'pricing', label: 'Precios y Capacidad', icon: 'DollarSign' },
                    { id: 'services', label: 'Servicios Adicionales', icon: 'Sparkles' },
                    { id: 'whatsapp', label: 'Mensajes de WhatsApp', icon: 'MessageCircle' },
                    { id: 'amenities', label: 'Comodidades', icon: 'Armchair' }
                ].map(tab => (
                    <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveTab(tab.id)}
                        style={tabButtonStyle(activeTab === tab.id)}
                    >
                        <AmenityIcon icon={tab.icon} size={18} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content Area */}
            <div style={contentStyle}>
                {/* Save Header */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
                    <button
                        type="button"
                        onClick={saveChanges}
                        disabled={saving}
                        style={{ ...buttonStyle, opacity: saving ? 0.7 : 1 }}
                    >
                        {saving ? 'Guardando...' : '💾 Guardar Todo'}
                    </button>
                </div>

                {activeTab === 'general' && (
                    <VenueGeneralTab
                        formData={formData}
                        setFormData={setFormData}
                        handleInputChange={handleInputChange}
                        handleMetadataChange={handleMetadataChange}
                        cardStyle={cardStyle}
                        sectionTitleStyle={sectionTitleStyle}
                        labelStyle={labelStyle}
                        inputStyle={inputStyle}
                    />
                )}

                {activeTab === 'appearance' && (
                    <VenueAppearanceTab
                        formData={formData}
                        handleInputChange={handleInputChange}
                        saveChanges={saveChanges}
                        saving={saving}
                        isMobile={isMobile}
                        showToast={showToast}
                        cardStyle={cardStyle}
                        sectionTitleStyle={sectionTitleStyle}
                        labelStyle={labelStyle}
                        inputStyle={inputStyle}
                        buttonStyle={buttonStyle}
                    />
                )}

                {activeTab === 'gallery' && (
                    <VenueGalleryTab
                        formData={formData}
                        handleMetadataChange={handleMetadataChange}
                        handleInputChange={handleInputChange}
                        handleImageUpload={handleImageUpload}
                        processGalleryFiles={processGalleryFiles}
                        moveGalleryItem={moveGalleryItem}
                        isUploadingGallery={isUploadingGallery}
                        galleryDragOver={galleryDragOver}
                        setGalleryDragOver={setGalleryDragOver}
                        previewGalleryImage={previewGalleryImage}
                        setPreviewGalleryImage={setPreviewGalleryImage}
                        saveChanges={saveChanges}
                        saving={saving}
                        showToast={showToast}
                        cardStyle={cardStyle}
                        sectionTitleStyle={sectionTitleStyle}
                        inputStyle={inputStyle}
                        buttonStyle={buttonStyle}
                    />
                )}

                {activeTab === 'pricing' && (
                    <VenuePricingTab
                        formData={formData}
                        handleCapacityChange={handleCapacityChange}
                        handleInputChange={handleInputChange}
                        handleDurationDiscountChange={handleDurationDiscountChange}
                        addTier={addTier}
                        updateTier={updateTier}
                        removeTier={removeTier}
                        cardStyle={cardStyle}
                        sectionTitleStyle={sectionTitleStyle}
                        labelStyle={labelStyle}
                        inputStyle={inputStyle}
                        buttonStyle={buttonStyle}
                    />
                )}

                {activeTab === 'services' && (
                    <VenueServicesTab
                        formData={formData}
                        handleInputChange={handleInputChange}
                        serviceIconPickerIndex={serviceIconPickerIndex}
                        setServiceIconPickerIndex={setServiceIconPickerIndex}
                        saveChanges={saveChanges}
                        saving={saving}
                        isMobile={isMobile}
                        showToast={showToast}
                        cardStyle={cardStyle}
                        sectionTitleStyle={sectionTitleStyle}
                        inputStyle={inputStyle}
                        buttonStyle={buttonStyle}
                    />
                )}

                {activeTab === 'amenities' && (
                    <VenueAmenitiesTab
                        formData={formData}
                        handleInputChange={handleInputChange}
                        newAmenityName={newAmenityName}
                        setNewAmenityName={setNewAmenityName}
                        newAmenityIcon={newAmenityIcon}
                        setNewAmenityIcon={setNewAmenityIcon}
                        isIconPickerOpen={isIconPickerOpen}
                        setIsIconPickerOpen={setIsIconPickerOpen}
                        showToast={showToast}
                        cardStyle={cardStyle}
                        sectionTitleStyle={sectionTitleStyle}
                        inputStyle={inputStyle}
                    />
                )}

                {activeTab === 'store' && (
                    <VenueStoreTab
                        formData={formData}
                        handleInputChange={handleInputChange}
                        handleMetadataChange={handleMetadataChange}
                        isMobile={isMobile}
                        showToast={showToast}
                        cardStyle={cardStyle}
                        sectionTitleStyle={sectionTitleStyle}
                        labelStyle={labelStyle}
                        inputStyle={inputStyle}
                        buttonStyle={buttonStyle}
                    />
                )}

                {activeTab === 'whatsapp' && (
                    <VenueWhatsappTab
                        formData={formData}
                        handleInputChange={handleInputChange}
                        cardStyle={cardStyle}
                        sectionTitleStyle={sectionTitleStyle}
                        labelStyle={labelStyle}
                        inputStyle={inputStyle}
                    />
                )}

                {activeTab === 'linkbio' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        {/* Frase / Descripción del Link in Bio */}
                        <div style={cardStyle}>
                            <h3 style={{
                                fontSize: '17px',
                                fontWeight: '700',
                                marginBottom: '6px',
                                color: 'var(--text-primary)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}>
                                <span>📝</span> Frase / Descripción del Link in Bio
                            </h3>
                            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '14px', lineHeight: 1.4 }}>
                                Este texto se muestra justo debajo del logo y nombre de tu negocio en tu página de enlaces (Link in Bio). Reemplaza el texto por defecto.
                            </p>
                            <textarea
                                value={formData.bio_description ?? formData.description ?? ''}
                                onChange={(e) => {
                                    handleInputChange('description', e.target.value);
                                    handleInputChange('bio_description', e.target.value);
                                }}
                                placeholder="¡Reserva tu turno online de forma rápida y sencilla!"
                                rows={3}
                                style={{ ...inputStyle, width: '100%', resize: 'vertical' }}
                            />
                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
                                <button
                                    onClick={async () => {
                                        const descVal = formData.bio_description ?? formData.description ?? '';
                                        handleInputChange('description', descVal);
                                        handleInputChange('bio_description', descVal);
                                        handleMetadataChange('bio_description', descVal);
                                        await handleSave();
                                    }}
                                    disabled={saving}
                                    style={{
                                        background: 'var(--primary-paddle, #84CC16)',
                                        color: '#000',
                                        border: 'none',
                                        padding: '10px 20px',
                                        borderRadius: '10px',
                                        fontWeight: '700',
                                        cursor: 'pointer'
                                    }}
                                >
                                    {saving ? 'Guardando...' : 'Guardar Descripción'}
                                </button>
                            </div>
                        </div>

                        <LinkBioButtonsSettings
                            customLinks={formData.custom_links || []}
                            onChange={(newLinks) => {
                                handleInputChange('custom_links', newLinks);
                                handleMetadataChange('custom_links', newLinks);
                            }}
                            primaryColor={formData.primary_color || business?.primary_color}
                        />
                    </div>
                )}

                {activeTab === 'coupons' && (
                    <CouponsSettings
                        coupons={formData.coupons || formData.metadata?.coupons || business?.coupons || business?.metadata?.coupons || []}
                        onChange={(newCoupons) => {
                            handleInputChange('coupons', newCoupons);
                            handleMetadataChange('coupons', newCoupons);
                        }}
                    />
                )}
            </div>
        </div>
    );
}
