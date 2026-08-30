import React, { useState, useEffect, useRef } from 'react';
import serviceAdapter from '../services/serviceAdapter';

import BasicInfoSection from './business/form/BasicInfoSection';
import ThemeAppearanceSection from './business/form/ThemeAppearanceSection';
import MapSection from './business/form/MapSection';
import BusinessHoursSection from './business/form/BusinessHoursSection';
import AmenitiesSection from './business/form/AmenitiesSection';
import CourtsSection from './business/form/CourtsSection';
import ServicesSection from './business/form/ServicesSection';
import SpecialistsSection from './business/form/SpecialistsSection';
import VenueConfigSection from './business/form/VenueConfigSection';
import SocialMediaSection from './business/form/SocialMediaSection';

export default function BusinessForm({ business, onSave, onCancel }) {
    const [formData, setFormData] = useState(() => {
        const defaultHours = {
            monday: { open: '08:00', close: '22:00', isOpen: true },
            tuesday: { open: '08:00', close: '22:00', isOpen: true },
            wednesday: { open: '08:00', close: '22:00', isOpen: true },
            thursday: { open: '08:00', close: '22:00', isOpen: true },
            friday: { open: '08:00', close: '22:00', isOpen: true },
            saturday: { open: '09:00', close: '21:00', isOpen: true },
            sunday: { open: '09:00', close: '21:00', isOpen: true }
        };

        if (!business) {
            return {
                id: Date.now().toString(),
                name: '',
                category: 'padel',
                type: 'sport',
                location: '',
                latitude: -34.6037, // Default Buenos Aires
                longitude: -58.3816,
                rating: 4.5,
                logo: '',
                banner_image: '',
                image: '', // Keep for backward compatibility
                amenities: [],
                courts: [],
                services: [],
                hours: defaultHours,
                theme: 'dark', // Dark theme for sport businesses
                primaryColor: '#00E676',
                max_capacity: 1 // Default capacity
            };
        }

        // Parse hours from database (might be JSON string or object)
        let hours = business.hours;

        if (typeof hours === 'string') {
            try {
                const parsed = JSON.parse(hours);
                if (typeof parsed === 'object' && !parsed.weekday) {
                    hours = parsed;
                } else {
                    hours = defaultHours;
                }
            } catch (e) {
                hours = defaultHours;
            }
        } else if (!hours || hours.weekday) {
            hours = defaultHours;
        }

        return {
            ...business,
            hours,
            primaryColor: business.primary_color || business.button_color || business.primaryColor || '#00E676',
            theme: business.theme || 'dark',
            max_capacity: business.max_capacity || 1
        };
    });

    const [newCourt, setNewCourt] = useState({ name: '', price: '' });
    const [newService, setNewService] = useState({ name: '', description: '', price: '', duration: '', image_url: '', category: '' });
    const [newSpecialist, setNewSpecialist] = useState({ name: '', role: '' });
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const [uploadingBanner, setUploadingBanner] = useState(false);
    const [uploadingSpecialistImage, setUploadingSpecialistImage] = useState(false);
    const [uploadingServiceImage, setUploadingServiceImage] = useState(false);
    const [serviceCategories, setServiceCategories] = useState(business?.service_categories || []);

    // Categories loaded from DB
    const [dbCategories, setDbCategories] = useState([]);
    const [dbSubcategories, setDbSubcategories] = useState([]);

    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const cats = await serviceAdapter.getCategories();
                if (mounted) setDbCategories(cats || []);
            } catch (e) {
                console.warn('No se pudieron cargar categorías:', e);
            }
        })();
        return () => { mounted = false; };
    }, []);

    useEffect(() => {
        if (!formData.category) {
            setDbSubcategories([]);
            return;
        }
        let mounted = true;
        (async () => {
            try {
                const subs = await serviceAdapter.getSubcategories(formData.category);
                if (mounted) setDbSubcategories(subs || []);
            } catch (e) {
                console.warn('No se pudieron cargar subcategorías:', e);
            }
        })();
        return () => { mounted = false; };
    }, [formData.category]);

    // Custom category dropdown state
    const [categoryOpen, setCategoryOpen] = useState(false);
    const categoryDropdownRef = useRef(null);

    useEffect(() => {
        if (!categoryOpen) return;
        const handleClickOutside = (e) => {
            if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(e.target)) {
                setCategoryOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [categoryOpen]);

    useEffect(() => {
        if (!categoryOpen) return;
        const handleEscape = (e) => {
            if (e.key === 'Escape') setCategoryOpen(false);
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [categoryOpen]);

    const fallbackCategories = [
        { id: 'padel', name: 'Padel', icon: '🎾', color: '#00E676' },
        { id: 'futbol', name: 'Fútbol', icon: '⚽', color: '#00E676' },
        { id: 'belleza', name: 'Belleza', icon: '💄', color: '#FF4081' },
        { id: 'salud', name: 'Salud', icon: '🏥', color: '#00B0FF' },
        { id: 'alquiler', name: 'Alquiler', icon: '🏠', color: '#FF5722' },
    ];

    const categoryList = dbCategories.length > 0 ? dbCategories : fallbackCategories;
    const selectedCategory = categoryList.find(c => c.id === formData.category) || null;
    const [newCategory, setNewCategory] = useState('');
    const [showHours, setShowHours] = useState(false);
    const [editingServiceIndex, setEditingServiceIndex] = useState(null);

    const [timeRanges] = useState(business?.time_ranges || []);

    // Venue-specific states
    const [venueGalleryImages, setVenueGalleryImages] = useState(business?.gallery_images || []);
    const [uploadingGalleryImage, setUploadingGalleryImage] = useState(false);
    const [additionalServices, setAdditionalServices] = useState(business?.additional_services || []);
    const [newAdditionalService, setNewAdditionalService] = useState({ name: '', price: '', icon: '🎯' });
    const [includedAmenities, setIncludedAmenities] = useState(business?.included_amenities || []);
    const [newAmenity, setNewAmenity] = useState('');
    const [rentalDurationOptions, setRentalDurationOptions] = useState(business?.rental_duration_options || [4, 6, 8, 12]);

    // Specialist image upload
    const handleSpecialistImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            alert('Por favor selecciona una imagen válida');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            alert('La imagen debe ser menor a 5MB');
            return;
        }

        setUploadingSpecialistImage(true);
        try {
            const { supabase } = await import('../services/supabaseClient');
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}-specialist.${fileExt}`;
            const filePath = `specialists/${fileName}`;

            const { error } = await supabase.storage
                .from('business-images')
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (error) throw error;

            const { data: { publicUrl } } = supabase.storage
                .from('business-images')
                .getPublicUrl(filePath);

            setNewSpecialist(prev => ({ ...prev, image_url: publicUrl }));
        } catch (error) {
            console.error('Error uploading specialist image:', error);
            alert('Error al subir la imagen: ' + error.message);
        } finally {
            setUploadingSpecialistImage(false);
        }
    };

    // Service image upload
    const handleServiceImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            alert('Por favor selecciona una imagen válida');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            alert('La imagen debe ser menor a 5MB');
            return;
        }

        setUploadingServiceImage(true);
        try {
            const { supabase } = await import('../services/supabaseClient');
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}-service.${fileExt}`;
            const filePath = `services/${fileName}`;

            const { error } = await supabase.storage
                .from('business-images')
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (error) throw error;

            const { data: { publicUrl } } = supabase.storage
                .from('business-images')
                .getPublicUrl(filePath);

            setNewService(prev => ({ ...prev, image_url: publicUrl }));
        } catch (error) {
            console.error('Error uploading service image:', error);
            alert('Error al subir la imagen: ' + error.message);
        } finally {
            setUploadingServiceImage(false);
        }
    };

    // Logo file upload
    const handleLogoUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            alert('Por favor selecciona una imagen válida');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            alert('La imagen debe ser menor a 5MB');
            return;
        }

        setUploadingLogo(true);
        try {
            const { supabase } = await import('../services/supabaseClient');
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}-logo.${fileExt}`;
            const filePath = `logos/${fileName}`;

            const { error } = await supabase.storage
                .from('business-images')
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (error) throw error;

            const { data: { publicUrl } } = supabase.storage
                .from('business-images')
                .getPublicUrl(filePath);

            setFormData(prev => ({ ...prev, logo: publicUrl, image: publicUrl }));
        } catch (error) {
            console.error('Error uploading logo:', error);
            alert('Error al subir el logo: ' + error.message);
        } finally {
            setUploadingLogo(false);
        }
    };

    // Banner file upload
    const handleBannerUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            alert('Por favor selecciona una imagen válida');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            alert('La imagen debe ser menor a 5MB');
            return;
        }

        setUploadingBanner(true);
        try {
            const { supabase } = await import('../services/supabaseClient');
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}-banner.${fileExt}`;
            const filePath = `banners/${fileName}`;

            const { error } = await supabase.storage
                .from('business-images')
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (error) throw error;

            const { data: { publicUrl } } = supabase.storage
                .from('business-images')
                .getPublicUrl(filePath);

            setFormData(prev => ({ ...prev, banner_image: publicUrl }));
        } catch (error) {
            console.error('Error uploading banner:', error);
            alert('Error al subir el banner: ' + error.message);
        } finally {
            setUploadingBanner(false);
            setNewAmenity('');
        }
    };

    const removeAmenity = (index) => {
        setFormData(prev => ({ ...prev, amenities: prev.amenities.filter((_, i) => i !== index) }));
    };

    const addAmenity = () => {
        if (newAmenity && !formData.amenities.includes(newAmenity)) {
            setFormData(prev => ({ ...prev, amenities: [...prev.amenities, newAmenity] }));
            setNewAmenity('');
        }
    };

    const addCourt = async () => {
        if (newCourt.name && newCourt.price) {
            if (business?.id && (formData.type === 'sport' || formData.type === 'venue')) {
                try {
                    const supabaseService = (await import('../services/supabaseService')).default;
                    const subscription = await supabaseService.getSubscription(business.id);

                    if (subscription) {
                        const currentCourts = formData.courts.length;
                        if (currentCourts >= subscription.spaces_included) {
                            alert(`Límite de plan alcanzado.\n\nTu plan incluye ${subscription.spaces_included} espacio${subscription.spaces_included > 1 ? 's' : ''}.\nActualmente tienes ${currentCourts} cancha${currentCourts > 1 ? 's' : ''}.\n\nActualiza tu plan en la sección "Suscripción" para agregar más canchas.`);
                            return;
                        }
                    }
                } catch (error) {
                    console.error('Error checking subscription:', error);
                }
            }

            setFormData(prev => ({
                ...prev,
                courts: [...prev.courts, { id: Date.now().toString(), ...newCourt, price: parseInt(newCourt.price) }]
            }));
            setNewCourt({ name: '', price: '' });
        }
    };

    const removeCourt = (index) => {
        setFormData(prev => ({ ...prev, courts: prev.courts.filter((_, i) => i !== index) }));
    };

    const addService = () => {
        if (newService.name && newService.price && newService.category) {
            if (editingServiceIndex !== null) {
                const updatedServices = [...formData.services];
                updatedServices[editingServiceIndex] = {
                    ...updatedServices[editingServiceIndex],
                    ...newService,
                    price: parseInt(newService.price)
                };
                setFormData(prev => ({ ...prev, services: updatedServices }));
                setEditingServiceIndex(null);
            } else {
                setFormData(prev => ({
                    ...prev,
                    services: [...prev.services, { id: Date.now().toString(), ...newService, price: parseInt(newService.price) }]
                }));
            }
            setNewService({ name: '', description: '', price: '', duration: '', image_url: '', category: '' });
        } else if (!newService.category) {
            alert('Debes seleccionar una categoría para el servicio');
        }
    };

    const removeService = (index) => {
        if (editingServiceIndex === index) {
            setEditingServiceIndex(null);
            setNewService({ name: '', description: '', price: '', duration: '', image_url: '', category: '' });
        } else if (editingServiceIndex !== null && index < editingServiceIndex) {
            setEditingServiceIndex(editingServiceIndex - 1);
        }

        setFormData(prev => {
            const newServices = [...prev.services];
            newServices.splice(index, 1);
            return {
                ...prev,
                services: newServices
            };
        });
    };

    const editService = (index) => {
        const service = formData.services[index];
        setNewService({
            name: service.name,
            description: service.description || '',
            price: service.price,
            duration: service.duration,
            image_url: service.image_url || '',
            category: service.category || ''
        });
        setEditingServiceIndex(index);
    };

    const cancelEditService = () => {
        setNewService({ name: '', description: '', price: '', duration: '', image_url: '', category: '' });
        setEditingServiceIndex(null);
    };

    const addSpecialist = async () => {
        if (newSpecialist.name && newSpecialist.role) {
            if (business?.id && formData.type === 'service') {
                try {
                    const supabaseService = (await import('../services/supabaseService')).default;
                    const subscription = await supabaseService.getSubscription(business.id);

                    if (subscription) {
                        const currentSpecialists = (formData.specialists || []).length;
                        if (currentSpecialists >= subscription.spaces_included) {
                            alert(`Límite de plan alcanzado.\n\nTu plan incluye ${subscription.spaces_included} espacio${subscription.spaces_included > 1 ? 's' : ''} (especialistas).\nActualmente tienes ${currentSpecialists} especialista${currentSpecialists > 1 ? 's' : ''}.\n\nActualiza tu plan en la sección "Suscripción" para agregar más especialistas.`);
                            return;
                        }
                    }
                } catch (error) {
                    console.error('Error checking subscription:', error);
                }
            }

            setFormData(prev => ({
                ...prev,
                specialists: [...(prev.specialists || []), { id: Date.now().toString(), ...newSpecialist }]
            }));
            setNewSpecialist({ name: '', role: '' });
        }
    };

    const removeSpecialist = (index) => {
        setFormData(prev => ({ ...prev, specialists: (prev.specialists || []).filter((_, i) => i !== index) }));
    };

    // Venue helper handlers
    const handleGalleryUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            alert('Por favor selecciona una imagen válida');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            alert('La imagen debe ser menor a 5MB');
            return;
        }

        setUploadingGalleryImage(true);
        try {
            const { supabase } = await import('../services/supabaseClient');
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}-gallery-${Math.random().toString(36).substring(7)}.${fileExt}`;
            const filePath = `gallery/${fileName}`;

            const { error } = await supabase.storage
                .from('business-images')
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (error) throw error;

            const { data: { publicUrl } } = supabase.storage
                .from('business-images')
                .getPublicUrl(filePath);

            setVenueGalleryImages(prev => [...prev, publicUrl]);
        } catch (error) {
            console.error('Error uploading gallery image:', error);
            alert('Error al subir la imagen: ' + error.message);
        } finally {
            setUploadingGalleryImage(false);
        }
    };

    const addAdditionalService = () => {
        if (newAdditionalService.name && newAdditionalService.price) {
            setAdditionalServices(prev => [...prev, { ...newAdditionalService, price: parseInt(newAdditionalService.price) }]);
            setNewAdditionalService({ name: '', price: '', icon: '🎯' });
        }
    };

    const removeAdditionalService = (index) => {
        setAdditionalServices(prev => prev.filter((_, i) => i !== index));
    };

    const addIncludedAmenity = () => {
        if (newAmenity.trim()) {
            setIncludedAmenities(prev => [...prev, newAmenity.trim()]);
            setNewAmenity('');
        }
    };

    const removeIncludedAmenity = (index) => {
        setIncludedAmenities(prev => prev.filter((_, i) => i !== index));
    };

    const toggleDurationOption = (hours) => {
        if (rentalDurationOptions.includes(hours)) {
            setRentalDurationOptions(prev => prev.filter(h => h !== hours));
        } else {
            setRentalDurationOptions(prev => [...prev, hours].sort((a, b) => a - b));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const dataToSave = {
            ...formData,
            sportTypes: formData.sport_types || formData.sportTypes,
            buttonColor: formData.primaryColor || formData.button_color || formData.buttonColor,
            primaryColor: formData.primaryColor || '#00E676',
            theme: formData.theme || 'dark',
            service_categories: serviceCategories,
            time_ranges: timeRanges,
            gallery_images: venueGalleryImages,
            additional_services: additionalServices,
            included_amenities: includedAmenities,
            rental_duration_options: rentalDurationOptions
        };

        await onSave(dataToSave);
    };

    return (
        <form
            onSubmit={handleSubmit}
            style={{
                padding: '32px',
                maxWidth: '1200px',
                margin: '0 auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '24px'
            }}
        >
            <BasicInfoSection
                formData={formData}
                setFormData={setFormData}
                categoryDropdownRef={categoryDropdownRef}
                categoryOpen={categoryOpen}
                setCategoryOpen={setCategoryOpen}
                selectedCategory={selectedCategory}
                categoryList={categoryList}
                handleLogoUpload={handleLogoUpload}
                uploadingLogo={uploadingLogo}
                handleBannerUpload={handleBannerUpload}
                uploadingBanner={uploadingBanner}
            />

            <ThemeAppearanceSection
                formData={formData}
                setFormData={setFormData}
            />

            <MapSection
                formData={formData}
                setFormData={setFormData}
            />

            <BusinessHoursSection
                formData={formData}
                setFormData={setFormData}
                showHours={showHours}
                setShowHours={setShowHours}
            />

            <AmenitiesSection
                formData={formData}
                newAmenity={newAmenity}
                setNewAmenity={setNewAmenity}
                addAmenity={addAmenity}
                removeAmenity={removeAmenity}
            />

            {formData.type === 'sport' && (
                <CourtsSection
                    formData={formData}
                    newCourt={newCourt}
                    setNewCourt={setNewCourt}
                    addCourt={addCourt}
                    removeCourt={removeCourt}
                />
            )}

            {formData.type === 'service' && (
                <>
                    <ServicesSection
                        formData={formData}
                        serviceCategories={serviceCategories}
                        setServiceCategories={setServiceCategories}
                        newCategory={newCategory}
                        setNewCategory={setNewCategory}
                        newService={newService}
                        setNewService={setNewService}
                        editingServiceIndex={editingServiceIndex}
                        addService={addService}
                        editService={editService}
                        removeService={removeService}
                        cancelEditService={cancelEditService}
                        handleServiceImageUpload={handleServiceImageUpload}
                        uploadingServiceImage={uploadingServiceImage}
                    />

                    <SpecialistsSection
                        formData={formData}
                        newSpecialist={newSpecialist}
                        setNewSpecialist={setNewSpecialist}
                        addSpecialist={addSpecialist}
                        removeSpecialist={removeSpecialist}
                        handleSpecialistImageUpload={handleSpecialistImageUpload}
                        uploadingSpecialistImage={uploadingSpecialistImage}
                    />
                </>
            )}

            {formData.type === 'venue' && (
                <VenueConfigSection
                    formData={formData}
                    setFormData={setFormData}
                    rentalDurationOptions={rentalDurationOptions}
                    toggleDurationOption={toggleDurationOption}
                    venueGalleryImages={venueGalleryImages}
                    setVenueGalleryImages={setVenueGalleryImages}
                    handleGalleryUpload={handleGalleryUpload}
                    uploadingGalleryImage={uploadingGalleryImage}
                    additionalServices={additionalServices}
                    setAdditionalServices={setAdditionalServices}
                    newAdditionalService={newAdditionalService}
                    setNewAdditionalService={setNewAdditionalService}
                    addAdditionalService={addAdditionalService}
                    removeAdditionalService={removeAdditionalService}
                    includedAmenities={includedAmenities}
                    newAmenity={newAmenity}
                    setNewAmenity={setNewAmenity}
                    addIncludedAmenity={addIncludedAmenity}
                    removeIncludedAmenity={removeIncludedAmenity}
                />
            )}

            <SocialMediaSection
                formData={formData}
                setFormData={setFormData}
            />

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '12px', paddingTop: '24px', borderTop: '1px solid var(--border)' }}>
                <button
                    type="button"
                    onClick={onCancel}
                    style={{
                        flex: 1,
                        padding: '16px',
                        borderRadius: '12px',
                        border: '1px solid var(--border)',
                        backgroundColor: 'transparent',
                        color: 'var(--text-secondary)',
                        fontWeight: '600',
                        fontSize: '16px',
                        cursor: 'pointer'
                    }}
                >
                    Cancelar
                </button>
                <button
                    type="submit"
                    style={{
                        flex: 2,
                        padding: '16px',
                        borderRadius: '12px',
                        border: 'none',
                        backgroundColor: 'var(--primary-paddle)',
                        color: '#fff',
                        fontWeight: '700',
                        fontSize: '16px',
                        cursor: 'pointer',
                        boxShadow: '0 4px 12px rgba(0,230,118,0.3)'
                    }}
                >
                    {business ? '💾 Guardar Cambios' : '✨ Crear Negocio'}
                </button>
            </div>
        </form>
    );
}
