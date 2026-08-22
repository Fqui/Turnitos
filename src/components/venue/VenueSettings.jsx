import React, { useState, useEffect } from 'react';
import serviceAdapter from '../../services/serviceAdapter';
import { useNotification } from '../../contexts/NotificationContext';
import AmenityIcon, { IconPickerModal, EmojiPickerModal, parseAmenity } from '../common/AmenityIcon';
import LinkBioButtonsSettings from './LinkBioButtonsSettings';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet icons
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

export default function VenueSettings({ business, onUpdate, isMobile }) {
    const { showToast, showConfirm } = useNotification();
    const [activeTab, setActiveTab] = useState('general');
    const [saving, setSaving] = useState(false);
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [uploadingProductImage, setUploadingProductImage] = useState(false);

    const [formData, setFormData] = useState({
        ...business,
        whatsapp_templates: business?.whatsapp_templates || business?.metadata?.whatsapp_templates || {},
        custom_links: business?.custom_links || business?.metadata?.custom_links || []
    });

    // Calendar optimization state
    const [portalMonth, setPortalMonth] = useState(new Date());
    const [blockStartDate, setBlockStartDate] = useState('');
    const [blockEndDate, setBlockEndDate] = useState('');
    const [blockReason, setBlockReason] = useState('');
    const [quickBlockDay, setQuickBlockDay] = useState(null);
    const [quickBlockReason, setQuickBlockReason] = useState('');
    const [newAmenityName, setNewAmenityName] = useState('');
    const [newAmenityIcon, setNewAmenityIcon] = useState('Sparkles');
    const [isIconPickerOpen, setIsIconPickerOpen] = useState(false);
    const [serviceIconPickerIndex, setServiceIconPickerIndex] = useState(null);

    // Gallery enhancement states
    const [isUploadingGallery, setIsUploadingGallery] = useState(false);
    const [previewGalleryImage, setPreviewGalleryImage] = useState(null);
    const [galleryDragOver, setGalleryDragOver] = useState(false);
    const [galleryFilterCategory, setGalleryFilterCategory] = useState('Todos');

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

    const formatDateKey = (d) => {
        if (!d) return '';
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const getPortalMonthDays = (date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();

        let startDay = firstDay.getDay() - 1;
        if (startDay < 0) startDay = 6;

        const days = [];
        for (let i = 0; i < startDay; i++) {
            days.push(null);
        }
        for (let i = 1; i <= daysInMonth; i++) {
            days.push(new Date(year, month, i));
        }
        return days;
    };

    const handleToggleDayBlock = (dateObj, customReason = '') => {
        if (!dateObj) return;
        const dateStr = formatDateKey(dateObj);
        const current = formData.blocked_dates || [];
        const existsIndex = current.findIndex(b => (typeof b === 'string' ? b : b.date) === dateStr);

        let updated;
        if (existsIndex >= 0) {
            updated = current.filter((_, idx) => idx !== existsIndex);
            showToast(`Fecha ${dateStr} desbloqueada`, 'success');
        } else {
            const reason = customReason || 'Bloqueado por el negocio';
            updated = [...current, { date: dateStr, reason }];
            showToast(`Fecha ${dateStr} bloqueada (${reason})`, 'info');
        }
        handleInputChange('blocked_dates', updated);
        setQuickBlockDay(null);
        setQuickBlockReason('');
    };

    const handleBlockRange = () => {
        if (!blockStartDate) {
            showToast('Selecciona al menos una fecha de inicio', 'warning');
            return;
        }
        const start = new Date(blockStartDate + 'T00:00:00');
        const end = blockEndDate ? new Date(blockEndDate + 'T00:00:00') : start;

        if (end < start) {
            showToast('La fecha de fin debe ser posterior a la fecha de inicio', 'warning');
            return;
        }

        const current = [...(formData.blocked_dates || [])];
        let addedCount = 0;

        let curr = new Date(start);
        while (curr <= end) {
            const dateStr = formatDateKey(curr);
            if (!current.some(b => (typeof b === 'string' ? b : b.date) === dateStr)) {
                current.push({ date: dateStr, reason: blockReason || 'Bloqueado por el negocio' });
                addedCount++;
            }
            curr.setDate(curr.getDate() + 1);
        }

        handleInputChange('blocked_dates', current);
        setBlockStartDate('');
        setBlockEndDate('');
        setBlockReason('');
        showToast(`Se bloquearon ${addedCount} día(s) correctamente`, 'success');
    };

    const handleBlockWeekends = () => {
        const days = getPortalMonthDays(portalMonth).filter(Boolean);
        const current = [...(formData.blocked_dates || [])];
        let addedCount = 0;

        days.forEach(d => {
            const dayOfWeek = d.getDay(); // 0 is Sun, 6 is Sat
            if (dayOfWeek === 0 || dayOfWeek === 6) {
                const dateStr = formatDateKey(d);
                if (!current.some(b => (typeof b === 'string' ? b : b.date) === dateStr)) {
                    current.push({ date: dateStr, reason: 'Fin de Semana' });
                    addedCount++;
                }
            }
        });

        handleInputChange('blocked_dates', current);
        showToast(`Se bloquearon ${addedCount} días de fin de semana`, 'success');
    };

    const handleClearMonthBlocks = () => {
        const days = getPortalMonthDays(portalMonth).filter(Boolean);
        const monthKeys = days.map(formatDateKey);

        const updated = (formData.blocked_dates || []).filter(b => {
            const dateStr = typeof b === 'string' ? b : b.date;
            return !monthKeys.includes(dateStr);
        });

        handleInputChange('blocked_dates', updated);
        showToast('Se desbloquearon las fechas del mes seleccionado', 'success');
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

        // If the last tier already reaches or exceeds max capacity, split it gracefully
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
            // Last tier ends before maxCap: add new tier reaching maxCap
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

        // Automatically prevent max_guests from exceeding venue maxCap
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
        // Extend the remaining last tier to cover up to maxCap
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
                    { id: 'gallery', label: 'Galería de Fotos', icon: 'Image' },
                    { id: 'pricing', label: 'Precios y Capacidad', icon: 'DollarSign' },
                    { id: 'services', label: 'Servicios Adicionales', icon: 'Sparkles' },
                    { id: 'whatsapp', label: 'Mensajes de WhatsApp', icon: 'MessageCircle' },
                    { id: 'amenities', label: 'Comodidades', icon: 'Armchair' }
                ].map(tab => (
                    <button
                        key={tab.id}
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
                        onClick={saveChanges}
                        disabled={saving}
                        style={{ ...buttonStyle, opacity: saving ? 0.7 : 1 }}
                    >
                        {saving ? 'Guardando...' : '💾 Guardar Todo'}
                    </button>
                </div>

                {activeTab === 'general' && (
                    <div style={cardStyle}>
                        <h2 style={sectionTitleStyle}>Información General</h2>

                        <div style={{ marginBottom: '20px' }}>
                            <label style={labelStyle}>Nombre del Espacio</label>
                            <input
                                style={inputStyle}
                                value={formData.name || ''}
                                onChange={e => handleInputChange('name', e.target.value)}
                                placeholder="Ej: Quincho La Arbolada"
                            />
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <label style={labelStyle}>Descripción Corta (Bajada)</label>
                            <textarea
                                style={{ ...inputStyle, minHeight: '80px' }}
                                value={formData.description !== undefined ? formData.description : ''}
                                onChange={e => handleInputChange('description', e.target.value)}
                                placeholder="Ej: Un quincho exclusivo con pileta y asador para tus eventos familiares y cumpleaños..."
                            />
                            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', display: 'block' }}>
                                📌 Se muestra en tu Link in Bio y en las tarjetas de búsqueda.
                            </span>
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <label style={labelStyle}>Descripción Completa (Perfil)</label>
                            <textarea
                                style={{ ...inputStyle, minHeight: '140px' }}
                                value={formData.metadata?.full_description !== undefined ? formData.metadata.full_description : ''}
                                onChange={e => handleMetadataChange('full_description', e.target.value)}
                                placeholder="Descripción detallada de tu espacio: qué incluye el alquiler, vajilla, normas de convivencia, horarios de música, etc."
                            />
                            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', display: 'block' }}>
                                📖 Se muestra en la sección "Acerca del espacio" de tu perfil web público con opción de "Ver más".
                            </span>
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <label style={labelStyle}>Ubicación (Texto)</label>
                            <input
                                style={inputStyle}
                                value={formData.location || ''}
                                onChange={e => handleInputChange('location', e.target.value)}
                                placeholder="Ej: Av. Principal 1234, Ciudad"
                            />
                        </div>

                        <div style={{ height: '300px', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border)' }}>
                            <MapContainer
                                center={[formData.latitude || -34.6, formData.longitude || -58.4]}
                                zoom={13}
                                scrollWheelZoom={false}
                                style={{ height: '100%', width: '100%' }}
                            >
                                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                <LocationPicker
                                    position={formData.latitude ? [formData.latitude, formData.longitude] : null}
                                    onLocationSelect={latlng => {
                                        setFormData(prev => ({ ...prev, latitude: latlng.lat, longitude: latlng.lng }));
                                    }}
                                />
                            </MapContainer>
                        </div>
                        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '8px' }}>
                            Toca en el mapa para ajustar la ubicación exacta.
                        </p>
                    </div>
                )}

                {activeTab === 'appearance' && (
                    <div style={cardStyle}>
                        <h2 style={sectionTitleStyle}>🎨 Apariencia y Marca</h2>

                        {/* Theme Selector */}
                        <div style={{ marginBottom: '32px' }}>
                            <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '8px', color: 'var(--text-primary)' }}>Estilo de Tema General</h3>
                            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                                Seleccioná la estética general de tu página pública (Modo Claro limpio o Modo Oscuro elegante).
                            </p>
                            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                                {[
                                    { id: 'light', label: '☀️ Modo Claro', desc: 'Fondo luminoso, diseño de alta visibilidad' },
                                    { id: 'dark', label: '🌙 Modo Oscuro', desc: 'Fondo oscuro elegante, ideal para eventos nocturnos' }
                                ].map(t => (
                                    <div
                                        key={t.id}
                                        onClick={() => handleInputChange('theme', t.id)}
                                        style={{
                                            flex: '1 1 200px',
                                            padding: '16px',
                                            borderRadius: '14px',
                                            background: t.id === 'dark' ? '#1E293B' : 'white',
                                            color: t.id === 'dark' ? '#F8FAFC' : '#1E293B',
                                            border: (formData.theme || 'light') === t.id ? '2px solid var(--primary-paddle)' : '1px solid var(--border)',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                            boxShadow: (formData.theme || 'light') === t.id ? '0 4px 12px rgba(0,0,0,0.1)' : 'none'
                                        }}
                                    >
                                        <div style={{ fontWeight: '800', fontSize: '15px', marginBottom: '4px' }}>{t.label}</div>
                                        <div style={{ fontSize: '12px', opacity: 0.8 }}>{t.desc}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Color Palette Selector */}
                        <div style={{ marginBottom: '24px' }}>
                            <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '8px', color: 'var(--text-primary)' }}>Color Principal de Marca</h3>
                            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                                Este color teñirá los botones de reserva, precios destacados y acentos en la página de tu predio.
                            </p>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                                <input
                                    type="color"
                                    value={formData.primary_color || '#84CC16'}
                                    onChange={e => {
                                        handleInputChange('primary_color', e.target.value);
                                        handleInputChange('button_color', e.target.value);
                                    }}
                                    style={{
                                        width: '56px',
                                        height: '56px',
                                        padding: '0',
                                        border: 'none',
                                        borderRadius: '12px',
                                        cursor: 'pointer',
                                        background: 'none'
                                    }}
                                />
                                <input
                                    type="text"
                                    value={formData.primary_color || '#84CC16'}
                                    onChange={e => {
                                        handleInputChange('primary_color', e.target.value);
                                        handleInputChange('button_color', e.target.value);
                                    }}
                                    style={{ ...inputStyle, width: '130px', fontWeight: '600', fontFamily: 'monospace' }}
                                    placeholder="#84CC16"
                                />
                            </div>
                        </div>

                        {/* Preset Colors */}
                        <div style={{ marginBottom: '32px' }}>
                            <label style={labelStyle}>Colores Recomendados para Alquileres</label>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '10px' }}>
                                {[
                                    { color: '#84CC16', label: 'Verde Lima / Natura' },
                                    { color: '#FF5722', label: 'Naranja Warm' },
                                    { color: '#0284C7', label: 'Azul Piscina' },
                                    { color: '#059669', label: 'Verde Esmeralda' },
                                    { color: '#D97706', label: 'Ámbar Cálido' },
                                    { color: '#7C3AED', label: 'Violeta Premium' },
                                    { color: '#E11D48', label: 'Coral Vivo' },
                                    { color: '#1E293B', label: 'Oscuro Elegante' }
                                ].map(item => (
                                    <div
                                        key={item.color}
                                        onClick={() => {
                                            handleInputChange('primary_color', item.color);
                                            handleInputChange('button_color', item.color);
                                        }}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            padding: '8px 14px',
                                            borderRadius: '10px',
                                            background: 'var(--bg-card)',
                                            border: (formData.primary_color === item.color || (!formData.primary_color && item.color === '#84CC16'))
                                                ? '2px solid var(--text-primary)'
                                                : '1px solid var(--border)',
                                            cursor: 'pointer',
                                            fontSize: '13px',
                                            fontWeight: '600',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: item.color }} />
                                        <span>{item.label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Banner & Logo Customization */}
                        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
                            <div>
                                <label style={labelStyle}>Logo del Predio</label>
                                {(formData.logo || formData.logo_url) && (
                                    <img src={formData.logo || formData.logo_url} alt="Logo preview" style={{ width: '80px', height: '80px', borderRadius: '12px', objectFit: 'cover', marginBottom: '12px', border: '1px solid var(--border)' }} />
                                )}
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={async (e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                            showToast('Subiendo logo...', 'info');
                                            const url = await serviceAdapter.uploadImage(file);
                                            handleInputChange('logo', url);
                                            handleInputChange('logo_url', url);
                                            showToast('Logo actualizado', 'success');
                                        }
                                    }}
                                    style={inputStyle}
                                />
                            </div>
                            <div>
                                <label style={labelStyle}>Foto de Portada / Banner</label>
                                {(formData.banner_image || formData.banner_url) && (
                                    <img src={formData.banner_image || formData.banner_url} alt="Banner preview" style={{ width: '100%', height: '80px', borderRadius: '12px', objectFit: 'cover', marginBottom: '12px', border: '1px solid var(--border)' }} />
                                )}
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={async (e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                            showToast('Subiendo banner...', 'info');
                                            const url = await serviceAdapter.uploadImage(file);
                                            handleInputChange('banner_image', url);
                                            handleInputChange('banner_url', url);
                                            showToast('Banner actualizado', 'success');
                                        }
                                    }}
                                    style={inputStyle}
                                />
                            </div>
                        </div>

                        <button
                            onClick={saveChanges}
                            disabled={saving}
                            style={{ ...buttonStyle, width: '100%', padding: '14px', marginTop: '12px' }}
                        >
                            {saving ? 'Guardando...' : '💾 Guardar Apariencia y Colores'}
                        </button>
                    </div>
                )}

                {activeTab === 'gallery' && (
                    <div style={cardStyle}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
                            <div>
                                <h2 style={{ ...sectionTitleStyle, marginBottom: '4px' }}>📸 Galería de Fotos del Predio</h2>
                                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
                                    Sube fotos de alta calidad de tu quincho, parque, piscina e instalaciones. La primera foto será la portada de tu página.
                                </p>
                            </div>
                            <div style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '8px',
                                background: 'rgba(132, 204, 22, 0.12)',
                                color: 'var(--primary-paddle, #84CC16)',
                                padding: '6px 14px',
                                borderRadius: '20px',
                                fontSize: '13px',
                                fontWeight: '700'
                            }}>
                                <span>🖼️ {(formData.metadata?.venue_gallery || []).length} Fotos</span>
                            </div>
                        </div>

                        {/* Modern Drag & Drop Zone */}
                        <div
                            onDragOver={(e) => { e.preventDefault(); setGalleryDragOver(true); }}
                            onDragLeave={() => setGalleryDragOver(false)}
                            onDrop={async (e) => {
                                e.preventDefault();
                                setGalleryDragOver(false);
                                const files = Array.from(e.dataTransfer.files || []).filter(f => f.type.startsWith('image/'));
                                if (files.length > 0) await processGalleryFiles(files);
                            }}
                            style={{
                                border: galleryDragOver ? '2px dashed var(--primary-paddle)' : '2px dashed var(--border)',
                                background: galleryDragOver ? 'rgba(132, 204, 22, 0.08)' : 'var(--bg-card)',
                                borderRadius: '16px',
                                padding: '32px 20px',
                                textAlign: 'center',
                                marginBottom: '24px',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                position: 'relative'
                            }}
                        >
                            <input
                                type="file"
                                id="gallery-upload"
                                multiple
                                accept="image/*"
                                onChange={handleImageUpload}
                                style={{
                                    position: 'absolute',
                                    inset: 0,
                                    opacity: 0,
                                    cursor: 'pointer',
                                    width: '100%',
                                    height: '100%',
                                    zIndex: 2
                                }}
                            />
                            {isUploadingGallery ? (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                                    <div style={{
                                        width: '36px',
                                        height: '36px',
                                        border: '3px solid var(--border)',
                                        borderTopColor: 'var(--primary-paddle)',
                                        borderRadius: '50%',
                                        animation: 'spin 0.8s linear infinite'
                                    }} />
                                    <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>
                                        Subiendo y optimizando imágenes...
                                    </div>
                                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                        Por favor espera un momento
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <div style={{
                                        width: '56px',
                                        height: '56px',
                                        borderRadius: '16px',
                                        background: 'rgba(132, 204, 22, 0.15)',
                                        color: 'var(--primary-paddle, #84CC16)',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '28px',
                                        marginBottom: '12px'
                                    }}>
                                        ☁️
                                    </div>
                                    <div style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '4px' }}>
                                        Arrastra tus fotos aquí o haz clic para subir
                                    </div>
                                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                                        Puedes seleccionar múltiples fotos a la vez (JPG, PNG, WEBP)
                                    </div>
                                    <span style={{
                                        display: 'inline-block',
                                        padding: '10px 20px',
                                        borderRadius: '12px',
                                        background: 'var(--primary-paddle)',
                                        color: '#000',
                                        fontWeight: '700',
                                        fontSize: '13px',
                                        boxShadow: '0 4px 12px rgba(132, 204, 22, 0.25)'
                                    }}>
                                        + Seleccionar Fotos desde el Dispositivo
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Gallery Grid */}
                        {(formData.metadata?.venue_gallery || []).length === 0 ? (
                            <div style={{
                                padding: '40px 20px',
                                textAlign: 'center',
                                background: 'var(--bg-card)',
                                borderRadius: '16px',
                                border: '1px solid var(--border)'
                            }}>
                                <span style={{ fontSize: '36px', display: 'block', marginBottom: '8px' }}>📸</span>
                                <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' }}>
                                    Aún no has agregado fotos a la galería
                                </div>
                                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                                    Las fotos atractivas aumentan un 80% las reservas de tu quincho.
                                </div>
                            </div>
                        ) : (
                            <div>
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                                    gap: '16px',
                                    marginBottom: '24px'
                                }}>
                                    {(formData.metadata?.venue_gallery || []).map((item, index) => {
                                        const isFirst = index === 0;
                                        const isFeatured = item.is_featured || isFirst;

                                        return (
                                            <div
                                                key={index}
                                                style={{
                                                    border: isFeatured ? '2px solid var(--primary-paddle, #84CC16)' : '1px solid var(--border)',
                                                    borderRadius: '16px',
                                                    overflow: 'hidden',
                                                    background: 'var(--bg-card)',
                                                    boxShadow: isFeatured ? '0 6px 20px rgba(132, 204, 22, 0.18)' : '0 2px 8px rgba(0,0,0,0.04)',
                                                    transition: 'all 0.2s ease',
                                                    display: 'flex',
                                                    flexDirection: 'column'
                                                }}
                                            >
                                                {/* Image Thumbnail with Overlay Controls */}
                                                <div style={{ aspectRatio: '16/10', position: 'relative', overflow: 'hidden', background: '#000' }}>
                                                    <img
                                                        src={item.url}
                                                        alt={item.caption || 'Foto del predio'}
                                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                    />

                                                    {/* Top Badges */}
                                                    <div style={{ position: 'absolute', top: 8, left: 8, zIndex: 2, display: 'flex', gap: '6px' }}>
                                                        <span style={{
                                                            background: 'rgba(0,0,0,0.7)',
                                                            color: 'white',
                                                            padding: '2px 8px',
                                                            borderRadius: '6px',
                                                            fontSize: '11px',
                                                            fontWeight: '800',
                                                            backdropFilter: 'blur(4px)'
                                                        }}>
                                                            #{index + 1}
                                                        </span>
                                                        {isFeatured && (
                                                            <span style={{
                                                                background: 'var(--primary-paddle, #84CC16)',
                                                                color: '#000',
                                                                padding: '2px 8px',
                                                                borderRadius: '6px',
                                                                fontSize: '11px',
                                                                fontWeight: '800',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '3px'
                                                            }}>
                                                                ⭐ Portada
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Quick Actions (Delete & Preview) */}
                                                    <div style={{ position: 'absolute', top: 8, right: 8, zIndex: 2, display: 'flex', gap: '6px' }}>
                                                        <button
                                                            type="button"
                                                            onClick={() => setPreviewGalleryImage(item.url)}
                                                            title="Ver foto en tamaño completo"
                                                            style={{
                                                                background: 'rgba(0,0,0,0.65)',
                                                                color: 'white',
                                                                border: 'none',
                                                                borderRadius: '8px',
                                                                width: '30px',
                                                                height: '30px',
                                                                cursor: 'pointer',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                fontSize: '14px',
                                                                backdropFilter: 'blur(4px)'
                                                            }}
                                                        >
                                                            👁️
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const newGallery = [...(formData.metadata?.venue_gallery || [])];
                                                                newGallery.splice(index, 1);
                                                                handleMetadataChange('venue_gallery', newGallery);
                                                                handleInputChange('gallery_images', newGallery.map(i => i.url));
                                                                showToast('Foto eliminada de la galería', 'info');
                                                            }}
                                                            title="Eliminar foto"
                                                            style={{
                                                                background: 'rgba(239, 68, 68, 0.85)',
                                                                color: 'white',
                                                                border: 'none',
                                                                borderRadius: '8px',
                                                                width: '30px',
                                                                height: '30px',
                                                                cursor: 'pointer',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                fontSize: '14px',
                                                                backdropFilter: 'blur(4px)'
                                                            }}
                                                        >
                                                            🗑️
                                                        </button>
                                                    </div>

                                                    {/* Reorder Buttons (Move Left/Right) */}
                                                    <div style={{ position: 'absolute', bottom: 8, right: 8, zIndex: 2, display: 'flex', gap: '4px' }}>
                                                        <button
                                                            type="button"
                                                            disabled={index === 0}
                                                            onClick={() => moveGalleryItem(index, -1)}
                                                            title="Mover antes"
                                                            style={{
                                                                background: index === 0 ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.7)',
                                                                color: index === 0 ? '#888' : 'white',
                                                                border: 'none',
                                                                borderRadius: '6px',
                                                                padding: '4px 8px',
                                                                cursor: index === 0 ? 'not-allowed' : 'pointer',
                                                                fontSize: '11px',
                                                                fontWeight: '700'
                                                            }}
                                                        >
                                                            ◀
                                                        </button>
                                                        <button
                                                            type="button"
                                                            disabled={index === (formData.metadata?.venue_gallery || []).length - 1}
                                                            onClick={() => moveGalleryItem(index, 1)}
                                                            title="Mover después"
                                                            style={{
                                                                background: index === (formData.metadata?.venue_gallery || []).length - 1 ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.7)',
                                                                color: index === (formData.metadata?.venue_gallery || []).length - 1 ? '#888' : 'white',
                                                                border: 'none',
                                                                borderRadius: '6px',
                                                                padding: '4px 8px',
                                                                cursor: index === (formData.metadata?.venue_gallery || []).length - 1 ? 'not-allowed' : 'pointer',
                                                                fontSize: '11px',
                                                                fontWeight: '700'
                                                            }}
                                                        >
                                                            ▶
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Card Metadata Fields */}
                                                <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                                                    <div>
                                                        <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
                                                            Descripción / Epígrafe
                                                        </label>
                                                        <input
                                                            placeholder="Ej: Piscina iluminada de noche, Salón para 50 personas..."
                                                            value={item.caption || ''}
                                                            onChange={(e) => {
                                                                const newGallery = [...(formData.metadata?.venue_gallery || [])];
                                                                newGallery[index].caption = e.target.value;
                                                                handleMetadataChange('venue_gallery', newGallery);
                                                            }}
                                                            style={{ ...inputStyle, padding: '8px 10px', fontSize: '12px', margin: 0 }}
                                                        />
                                                    </div>

                                                    <div>
                                                        <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
                                                            Sector / Categoría
                                                        </label>
                                                        <select
                                                            value={item.category || 'General'}
                                                            onChange={(e) => {
                                                                const newGallery = [...(formData.metadata?.venue_gallery || [])];
                                                                newGallery[index].category = e.target.value;
                                                                handleMetadataChange('venue_gallery', newGallery);
                                                            }}
                                                            style={{ ...inputStyle, padding: '8px 10px', fontSize: '12px', margin: 0 }}
                                                        >
                                                            <option value="General">📸 General</option>
                                                            <option value="Piscina">🏊 Piscina / Solárium</option>
                                                            <option value="Salón">🏠 Salón / Quincho Cubierto</option>
                                                            <option value="Exterior">🌳 Parque / Jardín</option>
                                                            <option value="Parrilla">🔥 Asador / Parrilla</option>
                                                            <option value="Baños">🚿 Baños & Vestuarios</option>
                                                            <option value="Juegos">🎮 Juegos & Entretenimiento</option>
                                                        </select>
                                                    </div>

                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const newGallery = (formData.metadata?.venue_gallery || []).map((gItem, i) => ({
                                                                ...gItem,
                                                                is_featured: i === index
                                                            }));
                                                            // Also move featured to first index for maximum prominence
                                                            const [featuredItem] = newGallery.splice(index, 1);
                                                            newGallery.unshift(featuredItem);

                                                            handleMetadataChange('venue_gallery', newGallery);
                                                            handleInputChange('gallery_images', newGallery.map(i => i.url));
                                                            showToast('⭐ Foto marcada como portada principal', 'success');
                                                        }}
                                                        style={{
                                                            marginTop: '6px',
                                                            width: '100%',
                                                            padding: '8px 12px',
                                                            borderRadius: '10px',
                                                            border: isFeatured ? 'none' : '1px solid var(--border)',
                                                            background: isFeatured ? 'var(--primary-paddle, #84CC16)' : 'var(--bg-main)',
                                                            color: isFeatured ? '#000' : 'var(--text-primary)',
                                                            fontWeight: '800',
                                                            fontSize: '11.5px',
                                                            cursor: 'pointer',
                                                            transition: 'all 0.2s ease',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            gap: '6px'
                                                        }}
                                                    >
                                                        <span>{isFeatured ? '⭐ Portada Principal Seleccionada' : '☆ Marcar como Portada Principal'}</span>
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Save Button at bottom of gallery */}
                                <button
                                    onClick={saveChanges}
                                    disabled={saving}
                                    style={{
                                        ...buttonStyle,
                                        width: '100%',
                                        padding: '16px',
                                        fontSize: '15px',
                                        fontWeight: '800',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '10px',
                                        boxShadow: '0 8px 24px rgba(132, 204, 22, 0.25)'
                                    }}
                                >
                                    <span>{saving ? 'Guardando Galería...' : '💾 Guardar Galería de Fotos'}</span>
                                </button>
                            </div>
                        )}

                        {/* Lightbox Preview Modal */}
                        {previewGalleryImage && (
                            <div
                                onClick={() => setPreviewGalleryImage(null)}
                                style={{
                                    position: 'fixed',
                                    inset: 0,
                                    background: 'rgba(0,0,0,0.85)',
                                    backdropFilter: 'blur(8px)',
                                    zIndex: 9999,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: '24px'
                                }}
                            >
                                <div
                                    onClick={(e) => e.stopPropagation()}
                                    style={{
                                        position: 'relative',
                                        maxWidth: '90vw',
                                        maxHeight: '90vh',
                                        borderRadius: '16px',
                                        overflow: 'hidden',
                                        boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
                                    }}
                                >
                                    <button
                                        onClick={() => setPreviewGalleryImage(null)}
                                        style={{
                                            position: 'absolute',
                                            top: '16px',
                                            right: '16px',
                                            background: 'rgba(0,0,0,0.7)',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '50%',
                                            width: '36px',
                                            height: '36px',
                                            fontSize: '18px',
                                            cursor: 'pointer',
                                            zIndex: 2
                                        }}
                                    >
                                        ✕
                                    </button>
                                    <img
                                        src={previewGalleryImage}
                                        alt="Vista previa"
                                        style={{ width: '100%', height: 'auto', maxHeight: '85vh', objectFit: 'contain', display: 'block' }}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'pricing' && (
                    <div style={cardStyle}>
                        <h2 style={sectionTitleStyle}>Precios y Capacidad</h2>

                        <div style={{ marginBottom: '24px' }}>
                            <label style={labelStyle}>Capacidad Máxima (personas) *</label>
                            <input
                                type="number"
                                style={inputStyle}
                                value={formData.capacity_limit || ''}
                                onChange={e => handleCapacityChange(e.target.value)}
                                placeholder="Ej: 85"
                            />
                            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                Límite máximo de personas permitidas. Al ingresar la capacidad, se establece automáticamente el rango inicial desde 5 hasta la capacidad máxima.
                            </p>
                        </div>

                        <div style={{ marginBottom: '30px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                                <label style={{ ...labelStyle, margin: 0 }}>Esquema de Precios por Cantidad de Personas *</label>
                                <span style={{
                                    fontSize: '12px',
                                    fontWeight: '700',
                                    color: 'var(--primary-paddle, #84CC16)',
                                    background: 'rgba(132, 204, 22, 0.1)',
                                    padding: '4px 10px',
                                    borderRadius: '8px'
                                }}>
                                    Capacidad del local: hasta {formData.capacity_limit || formData.max_capacity || 100} personas
                                </span>
                            </div>
                            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '14px' }}>
                                Define cuánto cobras por hora según la cantidad de invitados. Cada rango se ajusta automáticamente dentro de tu capacidad máxima.
                            </p>

                            {(!formData.pricing_tiers || formData.pricing_tiers.length === 0) && (
                                <div style={{ padding: '16px', background: 'rgba(239, 68, 68, 0.1)', border: '1px dashed #ef4444', borderRadius: '10px', marginBottom: '16px', color: 'var(--text-primary)', fontSize: '13px' }}>
                                    ⚠️ Ingresa la capacidad máxima o haz clic en <strong>"+ Agregar Rango de Precios"</strong> para configurar los precios.
                                </div>
                            )}
                            {formData.pricing_tiers?.map((tier, index) => (
                                <div key={index} style={{ display: 'flex', gap: '10px', marginBottom: '10px', alignItems: 'center', background: 'var(--bg-card)', padding: '12px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)' }}>Desde (personas)</label>
                                        <input type="number" style={inputStyle} value={tier.min_guests} onChange={e => updateTier(index, 'min_guests', e.target.value)} />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)' }}>Hasta (personas)</label>
                                        <input
                                            type="number"
                                            max={formData.capacity_limit || formData.max_capacity || 100}
                                            style={inputStyle}
                                            value={tier.max_guests}
                                            onChange={e => updateTier(index, 'max_guests', e.target.value)}
                                        />
                                    </div>
                                    <div style={{ flex: 1.5 }}>
                                        <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)' }}>Precio por Hora ($) *</label>
                                        <input type="number" style={inputStyle} value={tier.price} placeholder="Ej: 50000" onChange={e => updateTier(index, 'price', e.target.value)} />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => removeTier(index)}
                                        style={{
                                            background: 'rgba(239, 68, 68, 0.1)',
                                            border: '1px solid rgba(239, 68, 68, 0.2)',
                                            borderRadius: '8px',
                                            color: '#ef4444',
                                            cursor: 'pointer',
                                            marginTop: '15px',
                                            width: '36px',
                                            height: '36px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '15px'
                                        }}
                                        title="Eliminar rango"
                                    >
                                        🗑️
                                    </button>
                                </div>
                            ))}
                            <button
                                type="button"
                                onClick={addTier}
                                style={{
                                    ...buttonStyle,
                                    background: 'transparent',
                                    border: '1.5px dashed var(--primary-paddle)',
                                    color: 'var(--text-primary)',
                                    width: '100%',
                                    padding: '12px',
                                    marginTop: '8px',
                                    fontWeight: '700'
                                }}
                            >
                                + Agregar Rango de Precios (Subdividir Capacidad)
                            </button>
                        </div>

                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                <label style={labelStyle}>Opciones de Duración y Descuentos por Horas *</label>
                            </div>
                            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                                Selecciona qué duraciones permites y asigna un % de descuento opcional para cobrar menos en reservas de mayor cantidad de horas (ej: 0% en 4 hs, 10% en 8 hs, 20% en 12 hs).
                            </p>

                            {(!formData.rental_duration_options || formData.rental_duration_options.length === 0) && (
                                <p style={{ fontSize: '12px', color: '#ef4444', marginBottom: '12px' }}>
                                    ⚠️ Debes seleccionar al menos una duración permitida.
                                </p>
                            )}

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
                                {[4, 6, 8, 12, 24].map(hours => {
                                    const isSelected = (formData.rental_duration_options || []).includes(hours);
                                    const discount = formData.duration_discounts?.[hours] || 0;

                                    return (
                                        <div
                                            key={hours}
                                            style={{
                                                background: isSelected ? 'rgba(132, 204, 22, 0.08)' : 'var(--bg-card)',
                                                border: isSelected ? '1.5px solid var(--primary-paddle)' : '1px solid var(--border)',
                                                borderRadius: '12px',
                                                padding: '14px',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '10px',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontWeight: '700', fontSize: '14px' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={(e) => {
                                                        const current = formData.rental_duration_options || [];
                                                        if (e.target.checked) {
                                                            handleInputChange('rental_duration_options', [...current, hours].sort((a, b) => a - b));
                                                        } else {
                                                            handleInputChange('rental_duration_options', current.filter(h => h !== hours));
                                                        }
                                                    }}
                                                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                                />
                                                <span>⏱️ {hours} Horas</span>
                                            </label>

                                            {isSelected && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px', background: 'var(--bg-main)', padding: '6px 10px', borderRadius: '8px' }}>
                                                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>Descuento:</span>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        max="100"
                                                        value={discount}
                                                        onChange={(e) => handleDurationDiscountChange(hours, e.target.value)}
                                                        style={{ ...inputStyle, width: '55px', padding: '4px 6px', textAlign: 'center', fontSize: '13px' }}
                                                    />
                                                    <span style={{ fontSize: '12px', fontWeight: '700' }}>%</span>
                                                    {discount > 0 && (
                                                        <span style={{ marginLeft: 'auto', fontSize: '11px', background: '#10B981', color: 'white', padding: '2px 6px', borderRadius: '6px', fontWeight: '700' }}>
                                                            {discount}% OFF
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'services' && (
                    <div style={cardStyle}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
                            <div>
                                <h2 style={{ ...sectionTitleStyle, marginBottom: '4px' }}>✨ Servicios Adicionales (Opcionales)</h2>
                                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
                                    Configura los extras que los clientes pueden sumar a su reserva (limpieza, DJ, vajilla, etc.). El valor se suma automáticamente al total.
                                </p>
                            </div>
                            <div style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '8px',
                                background: 'rgba(132, 204, 22, 0.12)',
                                color: 'var(--primary-paddle, #84CC16)',
                                padding: '6px 14px',
                                borderRadius: '20px',
                                fontSize: '13px',
                                fontWeight: '700'
                            }}>
                                <span>🟢 {(formData.additional_services || []).filter(s => s.enabled !== false).length} Activos</span>
                            </div>
                        </div>

                        {/* Preset Quick Add Badges */}
                        <div style={{ marginBottom: '24px', background: 'var(--bg-card)', padding: '16px', borderRadius: '14px', border: '1px solid var(--border)' }}>
                            <div style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span>💡 Plantillas de Servicios Frecuentes (1 Clic para Agregar):</span>
                            </div>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                {[
                                    { icon: '🧹', name: 'Limpieza Post-Evento', price: 15000, description: 'Limpieza profunda del quincho, parque y baños al finalizar el evento', allow_quantity: false, enabled: true },
                                    { icon: '🎧', name: 'Servicio de DJ y Luces', price: 40000, description: 'Sonido profesional de alta potencia e iluminación robótica de pista', allow_quantity: false, enabled: true },
                                    { icon: '🍽️', name: 'Vajilla y Mantelería', price: 18000, description: 'Juego completo de platos, cubiertos, copas de vidrio y manteles', allow_quantity: true, enabled: true },
                                    { icon: '🥩', name: 'Servicio de Asador', price: 30000, description: 'Parrillero profesional a cargo del fuego y servido de carnes', allow_quantity: false, enabled: true },
                                    { icon: '🏰', name: 'Castillo Inflable', price: 28000, description: 'Juego inflable infantil instalado durante todo el horario de la reserva', allow_quantity: false, enabled: true },
                                    { icon: '🧊', name: 'Barra, Hielera y Hielo', price: 20000, description: 'Conservadora gigante, espacio de barra y 4 bolsas de hielo de 10kg', allow_quantity: true, enabled: true },
                                    { icon: '🎈', name: 'Decoración y Globología', price: 25000, description: 'Arco de globos orgánico y fondo temático para fotos', allow_quantity: false, enabled: true },
                                    { icon: '🎂', name: 'Torta y Mesa Dulce', price: 22000, description: 'Torta artesanal personalizada y variedad de mini tartas dulces', allow_quantity: false, enabled: true },
                                    { icon: '🍸', name: 'Bartender & Tragos', price: 35000, description: 'Servicio de barra libre con coctelería clásica y de autor', allow_quantity: false, enabled: true },
                                    { icon: '🪩', name: 'Luces & Pista Boliche', price: 30000, description: 'Efectos láser, humo y esfera de espejos para baile nocturno', allow_quantity: false, enabled: true },
                                    { icon: '🏓', name: 'Mesa de Ping Pong', price: 15000, description: 'Mesa profesional con 4 paletas y pelotitas de repuesto', allow_quantity: false, enabled: true }
                                ].map((preset, idx) => {
                                    const alreadyAdded = (formData.additional_services || []).some(s => s.name.toLowerCase() === preset.name.toLowerCase());
                                    return (
                                        <button
                                            key={idx}
                                            type="button"
                                            onClick={() => {
                                                if (alreadyAdded) {
                                                    showToast('Este servicio ya está en tu lista', 'info');
                                                    return;
                                                }
                                                handleInputChange('additional_services', [
                                                    ...(formData.additional_services || []),
                                                    preset
                                                ]);
                                                showToast(`Servicio "${preset.name}" agregado`, 'success');
                                            }}
                                            style={{
                                                padding: '8px 14px',
                                                borderRadius: '10px',
                                                border: alreadyAdded ? '1px solid var(--border)' : '1.5px dashed var(--primary-paddle)',
                                                background: alreadyAdded ? 'rgba(0,0,0,0.03)' : 'rgba(132, 204, 22, 0.06)',
                                                color: alreadyAdded ? 'var(--text-secondary)' : 'var(--text-primary)',
                                                fontSize: '12.5px',
                                                fontWeight: '700',
                                                cursor: alreadyAdded ? 'default' : 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            <span style={{ fontSize: '18px', lineHeight: 1 }}>{preset.icon}</span>
                                            <span>{preset.name}</span>
                                            <span style={{ fontSize: '11px', color: 'var(--primary-paddle, #84CC16)', fontWeight: '800' }}>
                                                ${preset.price.toLocaleString()}
                                            </span>
                                            {alreadyAdded && <span style={{ fontSize: '11px', color: '#10B981' }}>✓</span>}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Configured Services List */}
                        <div style={{ display: 'grid', gap: '16px', marginBottom: '24px' }}>
                            {(formData.additional_services || []).length === 0 ? (
                                <div style={{
                                    padding: '36px 20px',
                                    textAlign: 'center',
                                    background: 'var(--bg-card)',
                                    borderRadius: '14px',
                                    border: '1px dashed var(--border)'
                                }}>
                                    <span style={{ fontSize: '32px', display: 'block', marginBottom: '8px' }}>✨</span>
                                    <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' }}>
                                        No has configurado servicios adicionales todavía
                                    </div>
                                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                                        Haz clic en las plantillas de arriba o en "+ Agregar Servicio Personalizado".
                                    </div>
                                </div>
                            ) : (
                                (formData.additional_services || []).map((service, index) => {
                                    const isEnabled = service.enabled !== false;
                                    return (
                                        <div
                                            key={index}
                                            style={{
                                                border: isEnabled ? '1px solid var(--border)' : '1px dashed rgba(255,255,255,0.1)',
                                                borderRadius: '16px',
                                                padding: '18px',
                                                background: isEnabled ? 'var(--bg-card)' : 'rgba(0,0,0,0.02)',
                                                opacity: isEnabled ? 1 : 0.7,
                                                boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                                                transition: 'all 0.2s ease'
                                            }}
                                        >
                                            {/* Card Top Row */}
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <span style={{
                                                        background: 'rgba(0,0,0,0.06)',
                                                        color: 'var(--text-secondary)',
                                                        fontSize: '11px',
                                                        fontWeight: '800',
                                                        padding: '3px 8px',
                                                        borderRadius: '6px'
                                                    }}>
                                                        #{index + 1}
                                                    </span>
                                                    <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>
                                                        {service.name || 'Nuevo Servicio'}
                                                    </span>
                                                </div>

                                                {/* Actions (Toggle status & Delete) */}
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const newServices = [...formData.additional_services];
                                                            newServices[index].enabled = !isEnabled;
                                                            handleInputChange('additional_services', newServices);
                                                        }}
                                                        style={{
                                                            background: isEnabled ? 'rgba(16, 185, 129, 0.12)' : 'rgba(100, 116, 139, 0.12)',
                                                            color: isEnabled ? '#10B981' : 'var(--text-secondary)',
                                                            border: 'none',
                                                            padding: '5px 12px',
                                                            borderRadius: '8px',
                                                            fontSize: '12px',
                                                            fontWeight: '700',
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '5px'
                                                        }}
                                                    >
                                                        <span>{isEnabled ? '🟢 Disponible' : '⚪ Pausado'}</span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const newServices = [...formData.additional_services];
                                                            newServices.splice(index, 1);
                                                            handleInputChange('additional_services', newServices);
                                                            showToast('Servicio eliminado', 'info');
                                                        }}
                                                        style={{
                                                            background: 'rgba(239, 68, 68, 0.1)',
                                                            border: '1px solid rgba(239, 68, 68, 0.2)',
                                                            color: '#ef4444',
                                                            borderRadius: '8px',
                                                            width: '32px',
                                                            height: '32px',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            cursor: 'pointer',
                                                            fontSize: '14px'
                                                        }}
                                                        title="Eliminar servicio"
                                                    >
                                                        🗑️
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Card Input Grid */}
                                            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '80px 1fr 180px', gap: '12px', marginBottom: '12px' }}>
                                                <div>
                                                    <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
                                                        Ícono
                                                    </label>
                                                    <button
                                                        type="button"
                                                        onClick={() => setServiceIconPickerIndex(index)}
                                                        style={{
                                                            ...inputStyle,
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            cursor: 'pointer',
                                                            height: '42px',
                                                            padding: '6px',
                                                            fontSize: '22px'
                                                        }}
                                                        title="Elegir ícono a color (+100 opciones)"
                                                    >
                                                        <span>{service.icon || '✨'}</span>
                                                    </button>
                                                </div>

                                                <div>
                                                    <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
                                                        Nombre del Servicio *
                                                    </label>
                                                    <input
                                                        placeholder="Ej: Limpieza Post-Evento, Sonido DJ, etc."
                                                        value={service.name}
                                                        onChange={e => {
                                                            const newServices = [...formData.additional_services];
                                                            newServices[index].name = e.target.value;
                                                            handleInputChange('additional_services', newServices);
                                                        }}
                                                        style={{ ...inputStyle, padding: '10px 12px', fontWeight: '600' }}
                                                    />
                                                </div>

                                                <div>
                                                    <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
                                                        Precio Total ($) *
                                                    </label>
                                                    <div style={{ position: 'relative' }}>
                                                        <input
                                                            type="number"
                                                            placeholder="Ej: 15000"
                                                            value={service.price}
                                                            onChange={e => {
                                                                const newServices = [...formData.additional_services];
                                                                newServices[index].price = parseInt(e.target.value) || 0;
                                                                handleInputChange('additional_services', newServices);
                                                            }}
                                                            style={{ ...inputStyle, padding: '10px 12px 10px 24px', fontWeight: '700' }}
                                                        />
                                                        <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontWeight: '700', color: 'var(--text-secondary)' }}>
                                                            $
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Quantity Modality Selector */}
                                            <div style={{ marginBottom: '12px' }}>
                                                <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>
                                                    Modalidad de Contratación:
                                                </label>
                                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const newServices = [...formData.additional_services];
                                                            newServices[index].allow_quantity = false;
                                                            handleInputChange('additional_services', newServices);
                                                        }}
                                                        style={{
                                                            padding: '6px 14px',
                                                            borderRadius: '8px',
                                                            border: service.allow_quantity === true ? '1px solid var(--border)' : '1.5px solid var(--primary-paddle)',
                                                            background: service.allow_quantity === true ? 'transparent' : 'rgba(132, 204, 22, 0.12)',
                                                            color: service.allow_quantity === true ? 'var(--text-secondary)' : 'var(--text-primary)',
                                                            fontWeight: service.allow_quantity === true ? '500' : '700',
                                                            fontSize: '12px',
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '6px',
                                                            transition: 'all 0.15s'
                                                        }}
                                                    >
                                                        <span>{service.allow_quantity !== true ? '🔘' : '⚪'}</span>
                                                        <span>Servicio Único (Precio fijo por evento)</span>
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const newServices = [...formData.additional_services];
                                                            newServices[index].allow_quantity = true;
                                                            handleInputChange('additional_services', newServices);
                                                        }}
                                                        style={{
                                                            padding: '6px 14px',
                                                            borderRadius: '8px',
                                                            border: service.allow_quantity === true ? '1.5px solid var(--primary-paddle)' : '1px solid var(--border)',
                                                            background: service.allow_quantity === true ? 'rgba(132, 204, 22, 0.12)' : 'transparent',
                                                            color: service.allow_quantity === true ? 'var(--text-primary)' : 'var(--text-secondary)',
                                                            fontWeight: service.allow_quantity === true ? '700' : '500',
                                                            fontSize: '12px',
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '6px',
                                                            transition: 'all 0.15s'
                                                        }}
                                                    >
                                                        <span>{service.allow_quantity === true ? '🔘' : '⚪'}</span>
                                                        <span>Por Cantidad (Permite sumar unidades)</span>
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Description Input */}
                                            <div>
                                                <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
                                                    ¿Qué incluye este servicio? (Descripción para el cliente)
                                                </label>
                                                <input
                                                    placeholder="Ej: Limpieza de todo el quincho y parque después del evento para que no tengas que preocuparte..."
                                                    value={service.description || ''}
                                                    onChange={e => {
                                                        const newServices = [...formData.additional_services];
                                                        newServices[index].description = e.target.value;
                                                        handleInputChange('additional_services', newServices);
                                                    }}
                                                    style={{ ...inputStyle, padding: '10px 12px', fontSize: '13px' }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* Action Buttons */}
                        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '12px' }}>
                            <button
                                type="button"
                                onClick={() => {
                                    handleInputChange('additional_services', [
                                        ...(formData.additional_services || []),
                                        { icon: '✨', name: '', price: 0, description: '', enabled: true }
                                    ]);
                                }}
                                style={{
                                    ...buttonStyle,
                                    background: 'transparent',
                                    border: '1.5px dashed var(--primary-paddle)',
                                    color: 'var(--text-primary)',
                                    flex: 1,
                                    padding: '14px',
                                    fontWeight: '700'
                                }}
                            >
                                + Agregar Servicio Personalizado
                            </button>

                            <button
                                onClick={saveChanges}
                                disabled={saving}
                                style={{
                                    ...buttonStyle,
                                    flex: 1.5,
                                    padding: '14px',
                                    fontSize: '14px',
                                    fontWeight: '800',
                                    boxShadow: '0 4px 16px rgba(132, 204, 22, 0.25)'
                                }}
                            >
                                <span>{saving ? 'Guardando...' : '💾 Guardar Servicios Adicionales'}</span>
                            </button>
                        </div>

                        {/* Service Emoji Picker Modal */}
                        {serviceIconPickerIndex !== null && (
                            <EmojiPickerModal
                                isOpen={serviceIconPickerIndex !== null}
                                onClose={() => setServiceIconPickerIndex(null)}
                                title="🎨 Elegir Ícono a Color para el Servicio"
                                selectedIcon={formData.additional_services?.[serviceIconPickerIndex]?.icon || '✨'}
                                onSelect={(emoji) => {
                                    const newServices = [...(formData.additional_services || [])];
                                    if (newServices[serviceIconPickerIndex]) {
                                        newServices[serviceIconPickerIndex] = {
                                            ...newServices[serviceIconPickerIndex],
                                            icon: emoji
                                        };
                                        handleInputChange('additional_services', newServices);
                                    }
                                    setServiceIconPickerIndex(null);
                                }}
                            />
                        )}
                    </div>
                )}

                {activeTab === 'amenities' && (
                    <div style={cardStyle}>
                        <h2 style={sectionTitleStyle}>Comodidades (Amenities)</h2>
                        <p style={{ marginBottom: '20px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                            Selecciona las comodidades predeterminadas o añade comodidades personalizadas exclusivas de tu espacio:
                        </p>

                        {/* Presets Grid */}
                        <div style={{ marginBottom: '28px' }}>
                            <div style={{ fontSize: '14px', fontWeight: '700', marginBottom: '12px', color: 'var(--text-primary)' }}>
                                Comodidades Principales
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '10px' }}>
                                {[
                                    { name: 'Piscina', icon: 'Waves' },
                                    { name: 'Parrilla', icon: 'Flame' },
                                    { name: 'Quincho Cubierto', icon: 'House' },
                                    { name: 'WiFi', icon: 'Wifi' },
                                    { name: 'Aire Acondicionado', icon: 'Snowflake' },
                                    { name: 'Parking', icon: 'Car' },
                                    { name: 'Sonido', icon: 'Speaker' },
                                    { name: 'Cocina Equipada', icon: 'ChefHat' },
                                    { name: 'Zona de Juegos', icon: 'Gamepad2' },
                                    { name: 'Mesa de Pool', icon: 'Dices' },
                                    { name: 'Metegol', icon: 'Trophy' },
                                    { name: 'Ping Pong', icon: 'Activity' },
                                    { name: 'Televisor', icon: 'Tv' },
                                    { name: 'Iluminación LED', icon: 'Lightbulb' },
                                    { name: 'Jardín', icon: 'Trees' },
                                    { name: 'Baños Completos', icon: 'ShowerHead' },
                                    { name: 'Freezer', icon: 'Refrigerator' },
                                    { name: 'Juegos Infantiles', icon: 'Baby' }
                                ].map((preset, idx) => {
                                    const currentAmenities = (formData.amenities || []).map(a => parseAmenity(a).name);
                                    const isSelected = currentAmenities.includes(preset.name);

                                    return (
                                        <button
                                            key={idx}
                                            type="button"
                                            onClick={() => {
                                                let updated;
                                                if (isSelected) {
                                                    updated = (formData.amenities || []).filter(a => parseAmenity(a).name !== preset.name);
                                                } else {
                                                    updated = [...(formData.amenities || []), { name: preset.name, icon: preset.icon }];
                                                }
                                                handleInputChange('amenities', updated);
                                            }}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '10px',
                                                padding: '12px 16px',
                                                borderRadius: '12px',
                                                border: isSelected ? '2px solid var(--primary-paddle)' : '1px solid var(--border)',
                                                background: isSelected ? 'rgba(132, 204, 22, 0.12)' : 'var(--bg-card)',
                                                color: isSelected ? 'var(--primary-paddle)' : 'var(--text-primary)',
                                                cursor: 'pointer',
                                                fontWeight: isSelected ? '700' : '500',
                                                fontSize: '13px',
                                                transition: 'all 0.2s ease'
                                            }}
                                        >
                                            <AmenityIcon icon={preset.icon} size={20} />
                                            <span>{preset.name}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Custom Amenities Section */}
                        <div style={{
                            padding: '20px',
                            background: 'var(--bg-main)',
                            borderRadius: '16px',
                            border: '1px solid var(--border)'
                        }}>
                            <div style={{ fontSize: '15px', fontWeight: '800', marginBottom: '8px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span>✨</span> Comodidades Personalizadas
                            </div>
                            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                                Agrega comodidades adicionales que ofrece tu lugar (ej: Cancha de Bochas, Cama Elástica, Grupo Electrógeno, Barra de Tragos):
                            </p>

                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '14px' }}>
                                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                    <button
                                        type="button"
                                        onClick={() => setIsIconPickerOpen(true)}
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            padding: '8px 14px',
                                            borderRadius: '10px',
                                            border: '1.5px solid var(--primary-paddle, #84CC16)',
                                            background: 'rgba(132, 204, 22, 0.15)',
                                            color: 'var(--text-primary)',
                                            fontSize: '13px',
                                            fontWeight: '700',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <AmenityIcon icon={newAmenityIcon} size={18} />
                                        <span>🎨 Cambiar Ícono (+60 disponibles)</span>
                                    </button>
                                </div>

                                <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexWrap: 'wrap' }}>
                                    {['Flame', 'Waves', 'Beer', 'Speaker', 'Gamepad2', 'Trees', 'Snowflake', 'Baby', 'Plug', 'ShieldCheck', 'Bath', 'Tv'].map(iconKey => (
                                        <button
                                            key={iconKey}
                                            type="button"
                                            onClick={() => setNewAmenityIcon(iconKey)}
                                            style={{
                                                padding: '6px 8px',
                                                borderRadius: '8px',
                                                border: newAmenityIcon === iconKey ? '2px solid var(--primary-paddle)' : '1px solid var(--border)',
                                                background: newAmenityIcon === iconKey ? 'rgba(132, 204, 22, 0.2)' : 'var(--bg-card)',
                                                color: newAmenityIcon === iconKey ? 'var(--primary-paddle)' : 'var(--text-primary)',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}
                                            title={iconKey}
                                        >
                                            <AmenityIcon icon={iconKey} size={16} />
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                <input
                                    type="text"
                                    placeholder="Nombre de la comodidad personalizada (ej: Cama Elástica, Barra de Tragos)..."
                                    value={newAmenityName}
                                    onChange={(e) => setNewAmenityName(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            if (!newAmenityName.trim()) return;
                                            const newObj = { name: newAmenityName.trim(), icon: newAmenityIcon || '✨' };
                                            handleInputChange('amenities', [...(formData.amenities || []), newObj]);
                                            setNewAmenityName('');
                                            showToast('Comodidad personalizada agregada', 'success');
                                        }
                                    }}
                                    style={{
                                        ...inputStyle,
                                        flex: 1,
                                        margin: 0
                                    }}
                                />
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (!newAmenityName.trim()) {
                                            showToast('Escribe el nombre de la comodidad', 'warning');
                                            return;
                                        }
                                        const newObj = { name: newAmenityName.trim(), icon: newAmenityIcon || '✨' };
                                        handleInputChange('amenities', [...(formData.amenities || []), newObj]);
                                        setNewAmenityName('');
                                        showToast('Comodidad personalizada agregada', 'success');
                                    }}
                                    style={{
                                        padding: '12px 18px',
                                        borderRadius: '12px',
                                        border: 'none',
                                        background: 'var(--primary-paddle)',
                                        color: 'white',
                                        fontWeight: '700',
                                        cursor: 'pointer',
                                        fontSize: '13px',
                                        whiteSpace: 'nowrap'
                                    }}
                                >
                                    + Agregar
                                </button>
                            </div>

                            {/* Active Custom Amenities list */}
                            {(() => {
                                const presetNames = ['Piscina', 'Parrilla', 'Quincho Cubierto', 'WiFi', 'Aire Acondicionado', 'Parking', 'Sonido', 'Cocina Equipada', 'Zona de Juegos', 'Mesa de Pool', 'Metegol', 'Ping Pong', 'Televisor', 'Iluminación LED', 'Jardín', 'Baños Completos', 'Freezer', 'Juegos Infantiles'];
                                const customItems = (formData.amenities || [])
                                    .map(a => parseAmenity(a))
                                    .filter(item => item.name && !presetNames.includes(item.name));

                                if (customItems.length === 0) return null;

                                return (
                                    <div style={{ marginTop: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                        {customItems.map((item, idx) => {
                                            return (
                                                <div
                                                    key={idx}
                                                    style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '8px',
                                                        padding: '8px 12px',
                                                        background: 'var(--bg-card)',
                                                        borderRadius: '12px',
                                                        border: '1px solid var(--border)',
                                                        fontSize: '13px',
                                                        fontWeight: '600',
                                                        color: 'var(--text-primary)'
                                                    }}
                                                >
                                                    <AmenityIcon icon={item.icon || '✨'} size={18} />
                                                    <span>{item.name}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const updated = (formData.amenities || []).filter(a => parseAmenity(a).name !== item.name);
                                                            handleInputChange('amenities', updated);
                                                        }}
                                                        style={{
                                                            background: 'transparent',
                                                            border: 'none',
                                                            cursor: 'pointer',
                                                            color: '#EF4444',
                                                            fontSize: '14px',
                                                            padding: '0 2px',
                                                            marginLeft: '4px',
                                                            fontWeight: '700'
                                                        }}
                                                        title="Eliminar comodidad personalizada"
                                                    >
                                                        ✕
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                );
                            })()}
                        </div>

                        {/* Icon Picker Modal */}
                        <IconPickerModal
                            isOpen={isIconPickerOpen}
                            onClose={() => setIsIconPickerOpen(false)}
                            onSelect={(selectedIcon) => {
                                setNewAmenityIcon(selectedIcon);
                                showToast(`Ícono seleccionado`, 'info');
                            }}
                            currentIcon={newAmenityIcon}
                        />
                    </div>
                )}

                {activeTab === 'store' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        {/* Store Switch & Banner Config Card */}
                        <div style={cardStyle}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                                <div>
                                    <h2 style={sectionTitleStyle}>Configuración de la Tienda</h2>
                                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
                                        Activa tu e-commerce y personaliza el banner promocional.
                                    </p>
                                </div>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', background: 'var(--bg-main)', padding: '8px 16px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                                    <span style={{ fontSize: '14px', fontWeight: '700', color: formData.store_enabled ? 'var(--primary-paddle)' : 'var(--text-secondary)' }}>
                                        {formData.store_enabled ? '🟢 Tienda Habilitada' : '⚪ Tienda Deshabilitada'}
                                    </span>
                                    <input
                                        type="checkbox"
                                        checked={!!formData.store_enabled}
                                        onChange={e => handleInputChange('store_enabled', e.target.checked)}
                                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                    />
                                </label>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                                <div>
                                    <label style={labelStyle}>Título del Banner Promocional</label>
                                    <input
                                        type="text"
                                        style={inputStyle}
                                        value={formData.metadata?.store_banner_title || ''}
                                        placeholder="Ej: Todo lo que necesitás para tu partido"
                                        onChange={e => handleMetadataChange('store_banner_title', e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label style={labelStyle}>Subtítulo del Banner Promocional</label>
                                    <input
                                        type="text"
                                        style={inputStyle}
                                        value={formData.metadata?.store_banner_subtitle || ''}
                                        placeholder="Ej: Elegí tus productos y retiralos cuando vengas a jugar"
                                        onChange={e => handleMetadataChange('store_banner_subtitle', e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Product Catalog Card */}
                        <div style={cardStyle}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                                <div>
                                    <h2 style={sectionTitleStyle}>Catálogo de Productos</h2>
                                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
                                        Gestiona los artículos, alquileres y bebidas que vendes en tu local.
                                    </p>
                                </div>
                                <button
                                    onClick={() => {
                                        setEditingProduct({ id: Date.now().toString(), name: '', price: '', category: 'General', desc: '', image: '', images: [], is_active: true });
                                        setIsProductModalOpen(true);
                                    }}
                                    style={buttonStyle}
                                >
                                    + Agregar Producto
                                </button>
                            </div>

                            {/* Products Grid / List */}
                            {(!formData.metadata?.store_products || formData.metadata.store_products.length === 0) ? (
                                <div style={{ textAlign: 'center', padding: '32px', border: '1px dashed var(--border)', borderRadius: '16px', color: 'var(--text-secondary)' }}>
                                    <div style={{ fontSize: '32px', marginBottom: '8px' }}>🛒</div>
                                    <p style={{ margin: '0 0 12px 0', fontSize: '14px' }}>Aún no agregaste productos a tu catálogo.</p>
                                    <button
                                        onClick={() => {
                                            const defaultProducts = [
                                                { id: '1', name: 'Tubo Pelotas Padel Premium', price: 8500, category: 'Pelotas', image: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=400&q=80', desc: 'Presurizador de alta duración', is_active: true },
                                                { id: '2', name: 'Pack x3 Overgrips Wilson', price: 4000, category: 'Accesorios', image: 'https://images.unsplash.com/photo-1622279457486-62dcc4a4b1ca?w=400&q=80', desc: 'Máximo agarre y absorción', is_active: true },
                                                { id: '3', name: 'Alquiler Pala Bullpadel Vertex', price: 2000, category: 'Alquileres', image: 'https://images.unsplash.com/photo-1616788494707-ec28f08d05a1?w=400&q=80', desc: 'Pala de potencia profesional', is_active: true },
                                                { id: '4', name: 'Gatorade Manzana 500ml', price: 2500, category: 'Bebidas', image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400&q=80', desc: 'Hidratación rápida', is_active: true },
                                                { id: '5', name: 'Remera Oficial Cancha Apolo', price: 18000, category: 'Indumentaria', image: 'https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=400&q=80', desc: 'Tela dry-fit respirable', is_active: true }
                                            ];
                                            handleMetadataChange('store_products', defaultProducts);
                                        }}
                                        style={{ ...buttonStyle, background: 'transparent', border: '1px solid var(--primary-paddle)', color: 'var(--text-primary)' }}
                                    >
                                        ✨ Cargar Productos de Ejemplo
                                    </button>
                                </div>
                            ) : (
                                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
                                    {(formData.metadata.store_products || []).map((prod, idx) => (
                                        <div
                                            key={prod.id || idx}
                                            style={{
                                                border: '1px solid var(--border)',
                                                borderRadius: '16px',
                                                padding: '14px',
                                                backgroundColor: 'var(--bg-main)',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                justifyContent: 'space-between',
                                                gap: '12px'
                                            }}
                                        >
                                            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                                <img
                                                    src={prod.image || 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=200&q=80'}
                                                    alt={prod.name}
                                                    style={{ width: '56px', height: '56px', borderRadius: '12px', objectFit: 'cover', border: '1px solid var(--border)' }}
                                                />
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--primary-paddle)', textTransform: 'uppercase' }}>
                                                        {prod.category || 'General'}
                                                    </div>
                                                    <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        {prod.name}
                                                    </div>
                                                    <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-primary)', marginTop: '2px' }}>
                                                        ${Number(prod.price).toLocaleString('es-AR')}
                                                    </div>
                                                </div>
                                            </div>

                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: '10px' }}>
                                                <span style={{ fontSize: '12px', color: prod.is_active !== false ? '#10b981' : 'var(--text-secondary)', fontWeight: '600' }}>
                                                    {prod.is_active !== false ? '● Activo' : '○ Inactivo'}
                                                </span>
                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    <button
                                                        onClick={() => {
                                                            setEditingProduct({ ...prod });
                                                            setIsProductModalOpen(true);
                                                        }}
                                                        style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: '8px', padding: '4px 10px', fontSize: '12px', cursor: 'pointer', color: 'var(--text-primary)' }}
                                                    >
                                                        ✏️ Editar
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            const updated = (formData.metadata.store_products || []).filter((_, i) => i !== idx);
                                                            handleMetadataChange('store_products', updated);
                                                        }}
                                                        style={{ background: 'transparent', border: 'none', color: '#ef4444', fontSize: '14px', cursor: 'pointer' }}
                                                    >
                                                        🗑️
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'whatsapp' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        <div style={cardStyle}>
                            <h2 style={sectionTitleStyle}>💬 Plantillas de Mensajes de WhatsApp</h2>
                            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 16px 0' }}>
                                Personaliza los textos automáticos que se envían a tus clientes desde el panel de reservas. Los campos entre llaves como <code>{'{cliente}'}</code>, <code>{'{fecha}'}</code>, <code>{'{total}'}</code>, <code>{'{seña}'}</code> se completarán automáticamente con los datos de cada reserva.
                            </p>

                            {/* Tags guide */}
                            <div style={{
                                padding: '12px 14px',
                                background: 'rgba(37, 211, 102, 0.08)',
                                borderRadius: '12px',
                                border: '1px solid rgba(37, 211, 102, 0.25)',
                                marginBottom: '20px',
                                fontSize: '12px'
                            }}>
                                <span style={{ fontWeight: '700', color: '#16a34a', display: 'block', marginBottom: '6px' }}>
                                    🏷️ Variables dinámicas disponibles:
                                </span>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                    {['{cliente}', '{negocio}', '{fecha}', '{invitados}', '{total}', '{seña}', '{saldo}', '{direccion}', '{adicionales}'].map(tag => (
                                        <code
                                            key={tag}
                                            style={{
                                                padding: '3px 7px',
                                                borderRadius: '6px',
                                                background: 'var(--bg-card)',
                                                border: '1px solid var(--border)',
                                                fontSize: '11px',
                                                fontWeight: '700',
                                                color: 'var(--text-primary)'
                                            }}
                                        >
                                            {tag}
                                        </code>
                                    ))}
                                </div>
                            </div>

                            {/* Template 1: Pedir Seña */}
                            <div style={{ marginBottom: '22px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                    <label style={{ ...labelStyle, marginBottom: 0 }}>
                                        💳 1. Mensaje para Pedir Seña
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const def = "¡Hola {cliente}! 👋 Te escribimos de *{negocio}* para coordinar tu reserva del *{fecha}* ({invitados}). Para asegurar y reservar la fecha, solicitamos una seña de *${seña}* (Total: ${total}). Quedamos a disposición para pasarte los datos de pago.";
                                            handleInputChange('whatsapp_templates', {
                                                ...(formData.whatsapp_templates || {}),
                                                pedir_sena: def
                                            });
                                        }}
                                        style={{ fontSize: '11px', color: 'var(--primary-paddle)', background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: '600' }}
                                    >
                                        Restaurar por defecto
                                    </button>
                                </div>
                                <textarea
                                    rows={4}
                                    style={{ ...inputStyle, resize: 'vertical' }}
                                    value={formData.whatsapp_templates?.pedir_sena !== undefined ? formData.whatsapp_templates.pedir_sena : "¡Hola {cliente}! 👋 Te escribimos de *{negocio}* para coordinar tu reserva del *{fecha}* ({invitados}). Para asegurar y reservar la fecha, solicitamos una seña de *${seña}* (Total: ${total}). Quedamos a disposición para pasarte los datos de pago."}
                                    onChange={e => handleInputChange('whatsapp_templates', {
                                        ...(formData.whatsapp_templates || {}),
                                        pedir_sena: e.target.value
                                    })}
                                    placeholder="Texto para solicitar la seña..."
                                />
                            </div>

                            {/* Template 2: Confirmar Reserva */}
                            <div style={{ marginBottom: '22px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                    <label style={{ ...labelStyle, marginBottom: 0 }}>
                                        🎉 2. Mensaje de Confirmación de Reserva
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const def = "¡Hola {cliente}! 🎉 Tu reserva en *{negocio}* para el día *{fecha}* ha sido confirmada con éxito. Recuerda que el saldo pendiente a abonar al ingresar es de *${saldo}*. ¡Te esperamos!";
                                            handleInputChange('whatsapp_templates', {
                                                ...(formData.whatsapp_templates || {}),
                                                confirmar_reserva: def
                                            });
                                        }}
                                        style={{ fontSize: '11px', color: 'var(--primary-paddle)', background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: '600' }}
                                    >
                                        Restaurar por defecto
                                    </button>
                                </div>
                                <textarea
                                    rows={4}
                                    style={{ ...inputStyle, resize: 'vertical' }}
                                    value={formData.whatsapp_templates?.confirmar_reserva !== undefined ? formData.whatsapp_templates.confirmar_reserva : "¡Hola {cliente}! 🎉 Tu reserva en *{negocio}* para el día *{fecha}* ha sido confirmada con éxito. Recuerda que el saldo pendiente a abonar al ingresar es de *${saldo}*. ¡Te esperamos!"}
                                    onChange={e => handleInputChange('whatsapp_templates', {
                                        ...(formData.whatsapp_templates || {}),
                                        confirmar_reserva: e.target.value
                                    })}
                                    placeholder="Texto para confirmar el turno..."
                                />
                            </div>

                            {/* Template 3: Recordatorio / Saldo */}
                            <div style={{ marginBottom: '22px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                    <label style={{ ...labelStyle, marginBottom: 0 }}>
                                        ⏰ 3. Mensaje de Recordatorio / Saldo Pendiente
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const def = "¡Hola {cliente}! 😊 Te recordamos tu reserva en *{negocio}* para el *{fecha}*. El saldo a abonar al ingresar es de *${saldo}*. Si necesitas consultar algún adicional o detalle, no dudes en escribirnos.";
                                            handleInputChange('whatsapp_templates', {
                                                ...(formData.whatsapp_templates || {}),
                                                recordatorio_saldo: def
                                            });
                                        }}
                                        style={{ fontSize: '11px', color: 'var(--primary-paddle)', background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: '600' }}
                                    >
                                        Restaurar por defecto
                                    </button>
                                </div>
                                <textarea
                                    rows={4}
                                    style={{ ...inputStyle, resize: 'vertical' }}
                                    value={formData.whatsapp_templates?.recordatorio_saldo !== undefined ? formData.whatsapp_templates.recordatorio_saldo : "¡Hola {cliente}! 😊 Te recordamos tu reserva en *{negocio}* para el *{fecha}*. El saldo a abonar al ingresar es de *${saldo}*. Si necesitas consultar algún adicional o detalle, no dudes en escribirnos."}
                                    onChange={e => handleInputChange('whatsapp_templates', {
                                        ...(formData.whatsapp_templates || {}),
                                        recordatorio_saldo: e.target.value
                                    })}
                                    placeholder="Texto para recordar la reserva..."
                                />
                            </div>

                            {/* Template 4: Ubicación e Instrucciones */}
                            <div style={{ marginBottom: '10px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                    <label style={{ ...labelStyle, marginBottom: 0 }}>
                                        📍 4. Mensaje de Ubicación e Instrucciones
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const def = "¡Hola {cliente}! 📍 Te enviamos la información de *{negocio}* para tu reserva del *{fecha}*:\nDirección: {direccion}\n¡Cualquier consulta estamos a disposición!";
                                            handleInputChange('whatsapp_templates', {
                                                ...(formData.whatsapp_templates || {}),
                                                ubicacion: def
                                            });
                                        }}
                                        style={{ fontSize: '11px', color: 'var(--primary-paddle)', background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: '600' }}
                                    >
                                        Restaurar por defecto
                                    </button>
                                </div>
                                <textarea
                                    rows={4}
                                    style={{ ...inputStyle, resize: 'vertical' }}
                                    value={formData.whatsapp_templates?.ubicacion !== undefined ? formData.whatsapp_templates.ubicacion : "¡Hola {cliente}! 📍 Te enviamos la información de *{negocio}* para tu reserva del *{fecha}*:\nDirección: {direccion}\n¡Cualquier consulta estamos a disposición!"}
                                    onChange={e => handleInputChange('whatsapp_templates', {
                                        ...(formData.whatsapp_templates || {}),
                                        ubicacion: e.target.value
                                    })}
                                    placeholder="Texto con la dirección y cómo llegar..."
                                />
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'linkbio' && (
                    <LinkBioButtonsSettings
                        customLinks={formData.custom_links || []}
                        onChange={(newLinks) => {
                            handleInputChange('custom_links', newLinks);
                            handleMetadataChange('custom_links', newLinks);
                        }}
                        primaryColor={formData.primary_color || business?.primary_color}
                    />
                )}

            </div>

            {/* Modal de Crear/Editar Producto */}
            {isProductModalOpen && editingProduct && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    backgroundColor: 'rgba(0,0,0,0.6)',
                    backdropFilter: 'blur(4px)',
                    zIndex: 1100,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '20px'
                }}>
                    <div style={{
                        backgroundColor: 'var(--bg-card)',
                        borderRadius: '20px',
                        padding: '24px',
                        maxWidth: '480px',
                        width: '100%',
                        border: '1px solid var(--border)',
                        boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '16px'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)' }}>
                                {formData.metadata?.store_products?.some(p => p.id === editingProduct.id) ? 'Editar Producto' : 'Nuevo Producto'}
                            </h3>
                            <button
                                onClick={() => setIsProductModalOpen(false)}
                                style={{ background: 'transparent', border: 'none', fontSize: '18px', cursor: 'pointer', color: 'var(--text-secondary)' }}
                            >
                                ✕
                            </button>
                        </div>

                        <div>
                            <label style={labelStyle}>Nombre del Producto</label>
                            <input
                                type="text"
                                style={inputStyle}
                                value={editingProduct.name || ''}
                                placeholder="Nombre del producto o artículo"
                                onChange={e => setEditingProduct(prev => ({ ...prev, name: e.target.value }))}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '12px' }}>
                            <div style={{ flex: 1 }}>
                                <label style={labelStyle}>Precio ($)</label>
                                <input
                                    type="number"
                                    style={inputStyle}
                                    value={editingProduct.price || ''}
                                    placeholder="8500"
                                    onChange={e => setEditingProduct(prev => ({ ...prev, price: parseInt(e.target.value) || 0 }))}
                                />
                            </div>
                            <div style={{ flex: 1 }}>
                                <label style={labelStyle}>Categoría</label>
                                <input
                                    type="text"
                                    style={inputStyle}
                                    value={editingProduct.category || ''}
                                    placeholder="Escribí o elegí categoría..."
                                    list="venue-store-categories-list"
                                    onChange={e => setEditingProduct(prev => ({ ...prev, category: e.target.value }))}
                                />
                                <datalist id="venue-store-categories-list">
                                    {Array.from(new Set(['General', 'Bebidas', 'Snacks', 'Alquileres', 'Equipamiento', 'Indumentaria', 'Accesorios', 'Servicios', ...(formData.metadata?.store_products || []).map(p => p.category).filter(Boolean)])).map(cat => (
                                        <option key={cat} value={cat} />
                                    ))}
                                </datalist>
                            </div>
                        </div>

                        <div>
                            <label style={labelStyle}>Descripción corta</label>
                            <input
                                type="text"
                                style={inputStyle}
                                value={editingProduct.desc || ''}
                                placeholder="Descripción breve del producto..."
                                onChange={e => setEditingProduct(prev => ({ ...prev, desc: e.target.value }))}
                            />
                        </div>

                        <div>
                            <label style={labelStyle}>Imágenes del Producto (Podés subir varias fotos)</label>
                            
                            {/* Grid of uploaded images */}
                            {((Array.isArray(editingProduct.images) && editingProduct.images.length > 0) || editingProduct.image) && (
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
                                    {(Array.isArray(editingProduct.images) && editingProduct.images.length > 0
                                        ? editingProduct.images
                                        : [editingProduct.image]
                                    ).filter(Boolean).map((imgUrl, iIdx) => (
                                        <div key={iIdx} style={{ position: 'relative', width: '64px', height: '64px' }}>
                                            <img
                                                src={imgUrl}
                                                alt={`Foto ${iIdx + 1}`}
                                                style={{
                                                    width: '100%',
                                                    height: '100%',
                                                    borderRadius: '12px',
                                                    objectFit: 'cover',
                                                    border: (editingProduct.image === imgUrl || (!editingProduct.image && iIdx === 0)) ? '2px solid var(--primary-paddle)' : '1px solid var(--border)'
                                                }}
                                            />
                                            {/* Primary badge */}
                                            {(editingProduct.image === imgUrl || (!editingProduct.image && iIdx === 0)) && (
                                                <span style={{
                                                    position: 'absolute',
                                                    bottom: '2px',
                                                    left: '2px',
                                                    background: 'var(--primary-paddle)',
                                                    color: '#000',
                                                    fontSize: '9px',
                                                    fontWeight: '800',
                                                    padding: '1px 4px',
                                                    borderRadius: '4px'
                                                }}>
                                                    Principal
                                                </span>
                                            )}
                                            {/* Delete button */}
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const currentList = Array.isArray(editingProduct.images) && editingProduct.images.length > 0
                                                        ? editingProduct.images
                                                        : [editingProduct.image];
                                                    const newImgs = currentList.filter((_, idx) => idx !== iIdx);
                                                    setEditingProduct(prev => ({
                                                        ...prev,
                                                        images: newImgs,
                                                        image: newImgs[0] || null
                                                    }));
                                                }}
                                                style={{
                                                    position: 'absolute',
                                                    top: '-6px',
                                                    right: '-6px',
                                                    width: '20px',
                                                    height: '20px',
                                                    borderRadius: '50%',
                                                    background: '#ef4444',
                                                    color: '#fff',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    fontSize: '11px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
                                                }}
                                                title="Eliminar foto"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <label style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                width: '100%',
                                padding: '14px 16px',
                                borderRadius: '12px',
                                border: '1px dashed var(--border)',
                                background: 'var(--bg-main)',
                                color: 'var(--text-primary)',
                                fontSize: '13px',
                                fontWeight: '600',
                                cursor: uploadingProductImage ? 'wait' : 'pointer'
                            }}>
                                {uploadingProductImage ? '⏳ Subiendo fotos a la nube...' : '📷 Subir Fotos (Seleccionar 1 o varias desde tu dispositivo)'}
                                <input
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    disabled={uploadingProductImage}
                                    style={{ display: 'none' }}
                                    onChange={async (e) => {
                                        const files = Array.from(e.target.files || []);
                                        if (files.length === 0) return;
                                        try {
                                            setUploadingProductImage(true);
                                            const uploadPromises = files.map(file => serviceAdapter.uploadImage(file));
                                            const uploadedUrls = await Promise.all(uploadPromises);

                                            setEditingProduct(prev => {
                                                const existingImages = Array.isArray(prev.images) && prev.images.length > 0
                                                    ? prev.images
                                                    : (prev.image ? [prev.image] : []);
                                                const combined = [...existingImages, ...uploadedUrls];
                                                return {
                                                    ...prev,
                                                    images: combined,
                                                    image: combined[0] || null
                                                };
                                            });
                                            showToast(`${uploadedUrls.length} imagen(es) subida(s)`, 'success');
                                        } catch (err) {
                                            console.error('Error uploading product images:', err);
                                            showToast('Error al subir imágenes', 'error');
                                        } finally {
                                            setUploadingProductImage(false);
                                        }
                                    }}
                                />
                            </label>
                        </div>

                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginTop: '4px' }}>
                            <input
                                type="checkbox"
                                checked={editingProduct.is_active !== false}
                                onChange={e => setEditingProduct(prev => ({ ...prev, is_active: e.target.checked }))}
                            />
                            <span style={{ fontSize: '14px', color: 'var(--text-primary)' }}>Producto visible en la tienda</span>
                        </label>

                        <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                            <button
                                onClick={() => setIsProductModalOpen(false)}
                                style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer' }}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => {
                                    if (!editingProduct.name) return;
                                    const currentProducts = formData.metadata?.store_products || [];
                                    const existingIdx = currentProducts.findIndex(p => p.id === editingProduct.id);
                                    let updated;
                                    if (existingIdx >= 0) {
                                        updated = [...currentProducts];
                                        updated[existingIdx] = editingProduct;
                                    } else {
                                        updated = [...currentProducts, { ...editingProduct, id: Date.now().toString() }];
                                    }
                                    handleMetadataChange('store_products', updated);
                                    setIsProductModalOpen(false);
                                }}
                                style={{ flex: 2, ...buttonStyle }}
                            >
                                Guardar Producto
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
