import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

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
                primaryColor: '#00E676'
            };
        }

        // Parse hours from database (might be JSON string or object)
        let hours = business.hours;

        // Try to parse if it's a JSON string
        if (typeof hours === 'string') {
            try {
                const parsed = JSON.parse(hours);
                if (typeof parsed === 'object' && !parsed.weekday) {
                    hours = parsed;
                } else {
                    // Legacy format, use defaults
                    hours = defaultHours;
                }
            } catch (e) {
                // Not valid JSON, use defaults
                hours = defaultHours;
            }
        } else if (!hours || hours.weekday) {
            // Legacy weekday/weekend format or missing hours
            hours = defaultHours;
        }

        return { ...business, hours };
    });

    const [newAmenity, setNewAmenity] = useState('');
    const [newCourt, setNewCourt] = useState({ name: '', price: '' });
    const [newService, setNewService] = useState({ name: '', description: '', price: '', duration: '' });
    const [newSpecialist, setNewSpecialist] = useState({ name: '', role: '' });
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const [uploadingBanner, setUploadingBanner] = useState(false);

    // Time ranges state for dynamic pricing
    const [timeRanges, setTimeRanges] = useState(business?.time_ranges || []);
    const [newTimeRange, setNewTimeRange] = useState({
        name: '',
        start: '16:00',
        end: '18:00',
        price: ''
    });


    // Handle specialist image upload
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

            const { data, error } = await supabase.storage
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

    // Handle service image upload
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

            const { data, error } = await supabase.storage
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

    // Handle logo file upload
    const handleLogoUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            alert('Por favor selecciona una imagen válida');
            return;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert('La imagen debe ser menor a 5MB');
            return;
        }

        setUploadingLogo(true);
        try {
            const { supabase } = await import('../services/supabaseClient');

            // Create unique filename
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}-logo.${fileExt}`;
            const filePath = `logos/${fileName}`;

            // Upload to Supabase Storage
            const { data, error } = await supabase.storage
                .from('business-images')
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (error) throw error;

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('business-images')
                .getPublicUrl(filePath);

            setFormData({ ...formData, logo: publicUrl, image: publicUrl });
        } catch (error) {
            console.error('Error uploading logo:', error);
            alert('Error al subir el logo: ' + error.message);
        } finally {
            setUploadingLogo(false);
        }
    };



    function LocationMarker() {
        const map = useMapEvents({
            click(e) {
                setFormData({ ...formData, latitude: e.latlng.lat, longitude: e.latlng.lng });
            },
        });

        return formData.latitude && formData.longitude ? (
            <Marker position={[formData.latitude, formData.longitude]} />
        ) : null;
    }

    // Handle banner file upload
    const handleBannerUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            alert('Por favor selecciona una imagen válida');
            return;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert('La imagen debe ser menor a 5MB');
            return;
        }

        setUploadingBanner(true);
        try {
            const { supabase } = await import('../services/supabaseClient');

            // Create unique filename
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}-banner.${fileExt}`;
            const filePath = `banners/${fileName}`;

            // Upload to Supabase Storage
            const { data, error } = await supabase.storage
                .from('business-images')
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (error) throw error;

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('business-images')
                .getPublicUrl(filePath);

            setFormData({ ...formData, banner_image: publicUrl });
        } catch (error) {
            console.error('Error uploading banner:', error);
            alert('Error al subir el banner: ' + error.message);
        } finally {
            setUploadingBanner(false);
            setNewAmenity('');
        }
    };

    const removeAmenity = (index) => {
        setFormData({ ...formData, amenities: formData.amenities.filter((_, i) => i !== index) });
    };

    const addAmenity = () => {
        if (newAmenity && !formData.amenities.includes(newAmenity)) {
            setFormData({ ...formData, amenities: [...formData.amenities, newAmenity] });
            setNewAmenity('');
        }
    };

    const addCourt = () => {
        if (newCourt.name && newCourt.price) {
            setFormData({
                ...formData,
                courts: [...formData.courts, { id: Date.now().toString(), ...newCourt, price: parseInt(newCourt.price) }]
            });
            setNewCourt({ name: '', price: '' });
        }
    };

    const removeCourt = (index) => {
        setFormData({ ...formData, courts: formData.courts.filter((_, i) => i !== index) });
    };

    const addService = () => {
        if (newService.name && newService.price && newService.category) {
            if (editingServiceIndex !== null) {
                // Update existing service
                const updatedServices = [...formData.services];
                updatedServices[editingServiceIndex] = {
                    ...updatedServices[editingServiceIndex],
                    ...newService,
                    price: parseInt(newService.price)
                };
                setFormData({ ...formData, services: updatedServices });
                setEditingServiceIndex(null);
            } else {
                // Add new service
                setFormData({
                    ...formData,
                    services: [...formData.services, { id: Date.now().toString(), ...newService, price: parseInt(newService.price) }]
                });
            }
            setNewService({ name: '', description: '', price: '', duration: '', image_url: '', category: '' });
        } else if (!newService.category) {
            alert('Debes seleccionar una categoría para el servicio');
        }
    };

    const removeService = (index) => {
        // If we are editing the service we are deleting, cancel edit
        if (editingServiceIndex === index) {
            setEditingServiceIndex(null);
            setNewService({ name: '', description: '', price: '', duration: '', image_url: '', category: '' });
        } else if (editingServiceIndex !== null && index < editingServiceIndex) {
            // If we delete a service before the one being edited, adjust the index
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

    const addSpecialist = () => {
        if (newSpecialist.name && newSpecialist.role) {
            setFormData({
                ...formData,
                specialists: [...(formData.specialists || []), { id: Date.now().toString(), ...newSpecialist }]
            });
            setNewSpecialist({ name: '', role: '' });
        }
    };

    const removeSpecialist = (index) => {
        setFormData({ ...formData, specialists: formData.specialists.filter((_, i) => i !== index) });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const dataToSave = {
            ...formData,
            sportTypes: formData.sport_types || formData.sportTypes,
            buttonColor: formData.primaryColor || formData.button_color || formData.buttonColor, // Backward compat
            primaryColor: formData.primaryColor || '#00E676', // Ensure primaryColor is always set
            theme: formData.theme || 'dark' // Ensure theme is always set
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
            <section>
                <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '16px', color: 'var(--text-primary)' }}>
                    Información Básica
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                            Nombre del Negocio *
                        </label>
                        <input
                            type="text"
                            required
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            style={{
                                width: '100%',
                                padding: '12px',
                                borderRadius: '10px',
                                border: '1px solid var(--border)',
                                backgroundColor: 'var(--bg-main)',
                                color: 'var(--text-primary)',
                                fontSize: '14px'
                            }}
                            placeholder="Ej: Club Padel La Rioja"
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                            Ubicación *
                        </label>
                        <input
                            type="text"
                            required
                            value={formData.location}
                            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                            style={{
                                width: '100%',
                                padding: '12px',
                                borderRadius: '10px',
                                border: '1px solid var(--border)',
                                backgroundColor: 'var(--bg-main)',
                                color: 'var(--text-primary)',
                                fontSize: '14px'
                            }}
                            placeholder="Ej: Centro, La Rioja"
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                            Categoría *
                        </label>
                        <select
                            required
                            value={formData.category}
                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                            style={{
                                width: '100%',
                                padding: '12px',
                                borderRadius: '10px',
                                border: '1px solid var(--border)',
                                backgroundColor: 'var(--bg-main)',
                                color: 'var(--text-primary)',
                                fontSize: '14px'
                            }}
                        >
                            <option value="padel">Padel</option>
                            <option value="futbol">Fútbol</option>
                            <option value="belleza">Belleza</option>
                            <option value="salud">Salud</option>
                        </select>
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                            Tipo *
                        </label>
                        <select
                            required
                            value={formData.type}
                            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                            style={{
                                width: '100%',
                                padding: '12px',
                                borderRadius: '10px',
                                border: '1px solid var(--border)',
                                backgroundColor: 'var(--bg-main)',
                                color: 'var(--text-primary)',
                                fontSize: '14px'
                            }}
                        >
                            <option value="sport">Deporte</option>
                            <option value="service">Servicio</option>
                        </select>
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                            Rating
                        </label>
                        <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="5"
                            value={formData.rating}
                            onChange={(e) => setFormData({ ...formData, rating: parseFloat(e.target.value) })}
                            style={{
                                width: '100%',
                                padding: '12px',
                                borderRadius: '10px',
                                border: '1px solid var(--border)',
                                backgroundColor: 'var(--bg-main)',
                                color: 'var(--text-primary)',
                                fontSize: '14px'
                            }}
                        />
                    </div>

                </div>

                {/* Images Section */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px', marginTop: '16px' }}>
                    {/* Logo */}
                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                            Logo del Negocio *
                        </label>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleLogoUpload}
                                disabled={uploadingLogo}
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    borderRadius: '10px',
                                    border: '1px solid var(--border)',
                                    backgroundColor: 'var(--bg-main)',
                                    color: 'var(--text-primary)',
                                    fontSize: '14px'
                                }}
                            />
                            {uploadingLogo && <span style={{ fontSize: '12px', color: 'var(--primary-paddle)' }}>⏳ Subiendo imagen...</span>}
                        </div>

                        {formData.logo && (
                            <div style={{
                                marginTop: '8px',
                                width: '100%',
                                height: '120px',
                                borderRadius: '12px',
                                border: '2px dashed var(--border)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                overflow: 'hidden',
                                backgroundColor: 'var(--bg-main)',
                                position: 'relative'
                            }}>
                                <img
                                    src={formData.logo}
                                    alt="Logo preview"
                                    style={{
                                        maxWidth: '100%',
                                        maxHeight: '100%',
                                        objectFit: 'contain'
                                    }}
                                />
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, logo: '', image: '' })}
                                    style={{
                                        position: 'absolute',
                                        top: '4px',
                                        right: '4px',
                                        background: 'rgba(0,0,0,0.5)',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '50%',
                                        width: '24px',
                                        height: '24px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}
                                >
                                    ×
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Banner/Facade */}
                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                            Imagen de Fachada/Banner *
                        </label>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleBannerUpload}
                                disabled={uploadingBanner}
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    borderRadius: '10px',
                                    border: '1px solid var(--border)',
                                    backgroundColor: 'var(--bg-main)',
                                    color: 'var(--text-primary)',
                                    fontSize: '14px'
                                }}
                            />
                            {uploadingBanner && <span style={{ fontSize: '12px', color: 'var(--primary-paddle)' }}>⏳ Subiendo imagen...</span>}
                        </div>

                        {formData.banner_image && (
                            <div style={{
                                marginTop: '8px',
                                width: '100%',
                                height: '120px',
                                borderRadius: '12px',
                                border: '2px dashed var(--border)',
                                overflow: 'hidden',
                                backgroundColor: 'var(--bg-main)',
                                position: 'relative'
                            }}>
                                <img
                                    src={formData.banner_image}
                                    alt="Banner preview"
                                    style={{
                                        width: '100%',
                                        height: '100%',
                                        objectFit: 'cover'
                                    }}
                                />
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, banner_image: '' })}
                                    style={{
                                        position: 'absolute',
                                        top: '4px',
                                        right: '4px',
                                        background: 'rgba(0,0,0,0.5)',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '50%',
                                        width: '24px',
                                        height: '24px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}
                                >
                                    ×
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {/* Theme and Appearance Section */}
            <section>
                <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '16px', color: 'var(--text-primary)' }}>
                    🎨 Tema y Apariencia
                </h3>
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                    Personaliza cómo se verá la página de perfil de tu negocio.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
                    {/* Theme Selector */}
                    <div>
                        <label style={{ display: 'block', marginBottom: '12px', fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                            Tema del Perfil
                        </label>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            {/* Light Theme Option */}
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, theme: 'light' })}
                                style={{
                                    flex: 1,
                                    padding: '16px',
                                    borderRadius: '12px',
                                    border: formData.theme === 'light' ? '2px solid var(--primary-paddle)' : '2px solid var(--border)',
                                    backgroundColor: formData.theme === 'light' ? 'var(--primary-paddle)10' : 'var(--bg-main)',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: '8px',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <div style={{
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '8px',
                                    background: 'linear-gradient(135deg, #ffffff 0%, #f5f5f5 100%)',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '20px'
                                }}>
                                    ☀️
                                </div>
                                <span style={{
                                    fontSize: '14px',
                                    fontWeight: formData.theme === 'light' ? '700' : '500',
                                    color: formData.theme === 'light' ? 'var(--primary-paddle)' : 'var(--text-primary)'
                                }}>
                                    Claro
                                </span>
                            </button>

                            {/* Dark Theme Option */}
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, theme: 'dark' })}
                                style={{
                                    flex: 1,
                                    padding: '16px',
                                    borderRadius: '12px',
                                    border: formData.theme === 'dark' ? '2px solid var(--primary-paddle)' : '2px solid var(--border)',
                                    backgroundColor: formData.theme === 'dark' ? 'var(--primary-paddle)10' : 'var(--bg-main)',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: '8px',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <div style={{
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '8px',
                                    background: 'linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%)',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '20px'
                                }}>
                                    🌙
                                </div>
                                <span style={{
                                    fontSize: '14px',
                                    fontWeight: formData.theme === 'dark' ? '700' : '500',
                                    color: formData.theme === 'dark' ? 'var(--primary-paddle)' : 'var(--text-primary)'
                                }}>
                                    Oscuro
                                </span>
                            </button>
                        </div>
                    </div>

                    {/* Color Picker */}
                    <div>
                        <label style={{ display: 'block', marginBottom: '12px', fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                            Color de Botones y Acentos
                        </label>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {/* Color Input */}
                            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                <input
                                    type="color"
                                    value={formData.primaryColor || '#00E676'}
                                    onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                                    style={{
                                        width: '60px',
                                        height: '60px',
                                        border: '2px solid var(--border)',
                                        borderRadius: '12px',
                                        cursor: 'pointer'
                                    }}
                                />
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '4px' }}>
                                        {formData.primaryColor || '#00E676'}
                                    </div>
                                    <input
                                        type="text"
                                        value={formData.primaryColor || '#00E676'}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            // Only update if it's a valid hex color format
                                            if (/^#[0-9A-Fa-f]{0,6}$/.test(value) || value === '') {
                                                setFormData({ ...formData, primaryColor: value });
                                            }
                                        }}
                                        placeholder="#00E676"
                                        style={{
                                            width: '100%',
                                            padding: '8px 12px',
                                            borderRadius: '8px',
                                            border: '1px solid var(--border)',
                                            backgroundColor: 'var(--bg-main)',
                                            color: 'var(--text-primary)',
                                            fontSize: '13px',
                                            fontFamily: 'monospace'
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Preset Colors */}
                            <div>
                                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                                    Colores Sugeridos:
                                </div>
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                    {[
                                        { name: 'Verde', color: '#00E676' },
                                        { name: 'Azul', color: '#2196F3' },
                                        { name: 'Púrpura', color: '#9C27B0' },
                                        { name: 'Naranja', color: '#FF9800' },
                                        { name: 'Rosa', color: '#E91E63' },
                                        { name: 'Cian', color: '#00BCD4' },
                                    ].map((preset) => (
                                        <button
                                            key={preset.color}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, primaryColor: preset.color })}
                                            title={preset.name}
                                            style={{
                                                width: '36px',
                                                height: '36px',
                                                borderRadius: '8px',
                                                border: formData.primaryColor === preset.color ? '3px solid var(--text-primary)' : '2px solid var(--border)',
                                                backgroundColor: preset.color,
                                                cursor: 'pointer',
                                                transition: 'all 0.2s',
                                                boxShadow: formData.primaryColor === preset.color ? '0 4px 12px rgba(0,0,0,0.2)' : 'none'
                                            }}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Preview */}
                <div style={{
                    marginTop: '20px',
                    padding: '20px',
                    borderRadius: '12px',
                    border: '2px solid var(--border)',
                    backgroundColor: formData.theme === 'dark' ? '#0a0a0a' : '#ffffff',
                    color: formData.theme === 'dark' ? '#ffffff' : '#000000'
                }}>
                    <div style={{ fontSize: '12px', color: formData.theme === 'dark' ? '#888' : '#666', marginBottom: '12px', textTransform: 'uppercase', fontWeight: '600' }}>
                        Vista Previa
                    </div>
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        <button
                            type="button"
                            style={{
                                padding: '12px 24px',
                                borderRadius: '12px',
                                border: 'none',
                                backgroundColor: formData.primaryColor || '#00E676',
                                color: '#fff',
                                fontWeight: '700',
                                cursor: 'default',
                                boxShadow: `0 4px 12px ${formData.primaryColor}40`
                            }}
                        >
                            Botón de Acción
                        </button>
                        <div style={{
                            padding: '8px 16px',
                            borderRadius: '20px',
                            backgroundColor: `${formData.primaryColor}20`,
                            color: formData.primaryColor,
                            fontSize: '14px',
                            fontWeight: '600'
                        }}>
                            Etiqueta de Categoría
                        </div>
                    </div>
                </div>
            </section>

            {/* Map Section */}
            <section>
                <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '16px', color: 'var(--text-primary)' }}>
                    Ubicación en el Mapa
                </h3>
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                    Haz clic en el mapa para marcar la ubicación exacta de tu negocio.
                </p>
                <div style={{ height: '300px', width: '100%', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border)' }}>
                    <MapContainer
                        center={[formData.latitude || -34.6037, formData.longitude || -58.3816]}
                        zoom={13}
                        style={{ height: '100%', width: '100%' }}
                    >
                        <TileLayer
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        />
                        <LocationMarker />
                    </MapContainer>
                </div>
            </section>

            {/* Business Hours */}
            <section>
                <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '8px', color: 'var(--text-primary)' }}>
                    Horarios de Atención
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px', backgroundColor: 'var(--bg-main)', padding: '12px', borderRadius: '8px', borderLeft: '3px solid var(--primary-paddle)' }}>
                    💡 <strong>Horarios nocturnos:</strong> Para negocios que operan después de medianoche, usa el formato 24+. Ejemplo: de 22:00 a 26:00 (2 AM del día siguiente). Los turnos se agruparán bajo el día de apertura.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => {
                        const dayLabels = {
                            monday: 'Lunes', tuesday: 'Martes', wednesday: 'Miércoles',
                            thursday: 'Jueves', friday: 'Viernes', saturday: 'Sábado', sunday: 'Domingo'
                        };
                        const schedule = formData.hours[day] || { open: '08:00', close: '22:00', isOpen: true };

                        return (
                            <div key={day} style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '16px',
                                padding: '12px',
                                backgroundColor: 'var(--bg-main)',
                                borderRadius: '10px',
                                border: '1px solid var(--border)',
                                flexWrap: 'wrap'
                            }}>
                                <div style={{ width: '100px', fontWeight: '600', color: 'var(--text-primary)' }}>
                                    {dayLabels[day]}
                                </div>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', minWidth: '100px' }}>
                                    <input
                                        type="checkbox"
                                        checked={schedule.isOpen}
                                        onChange={(e) => {
                                            const newHours = { ...formData.hours };
                                            if (!newHours[day]) newHours[day] = { open: '08:00', close: '22:00', isOpen: true };
                                            newHours[day] = { ...newHours[day], isOpen: e.target.checked };
                                            setFormData({ ...formData, hours: newHours });
                                        }}
                                        style={{ width: '18px', height: '18px', accentColor: 'var(--primary-paddle)' }}
                                    />
                                    <span style={{ fontSize: '14px', color: schedule.isOpen ? 'var(--primary-paddle)' : 'var(--text-secondary)', fontWeight: schedule.isOpen ? '600' : '400' }}>
                                        {schedule.isOpen ? 'Abierto' : 'Cerrado'}
                                    </span>
                                </label>

                                {schedule.isOpen && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                                        {(schedule.ranges || [{ open: schedule.open, close: schedule.close }]).map((range, index) => (
                                            <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                                <select
                                                    value={range.open}
                                                    onChange={(e) => {
                                                        const newHours = { ...formData.hours };
                                                        const currentRanges = [...(schedule.ranges || [{ open: schedule.open, close: schedule.close }])];
                                                        currentRanges[index] = { ...currentRanges[index], open: e.target.value };

                                                        newHours[day] = {
                                                            ...newHours[day],
                                                            ranges: currentRanges,
                                                            open: index === 0 ? e.target.value : newHours[day].open
                                                        };
                                                        setFormData({ ...formData, hours: newHours });
                                                    }}
                                                    style={{
                                                        padding: '8px',
                                                        borderRadius: '6px',
                                                        border: '1px solid var(--border)',
                                                        backgroundColor: 'var(--bg-card)',
                                                        color: 'var(--text-primary)',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    {Array.from({ length: 30 }, (_, i) => {
                                                        const hour = i.toString().padStart(2, '0');
                                                        return (
                                                            <>
                                                                <option key={`${i}-00`} value={`${hour}:00`}>{`${hour}:00`}</option>
                                                                <option key={`${i}-30`} value={`${hour}:30`}>{`${hour}:30`}</option>
                                                            </>
                                                        );
                                                    })}
                                                </select>
                                                <span style={{ color: 'var(--text-secondary)' }}>a</span>
                                                <select
                                                    value={range.close}
                                                    onChange={(e) => {
                                                        const newHours = { ...formData.hours };
                                                        const currentRanges = [...(schedule.ranges || [{ open: schedule.open, close: schedule.close }])];
                                                        currentRanges[index] = { ...currentRanges[index], close: e.target.value };

                                                        newHours[day] = {
                                                            ...newHours[day],
                                                            ranges: currentRanges,
                                                            close: index === 0 ? e.target.value : newHours[day].close
                                                        };
                                                        setFormData({ ...formData, hours: newHours });
                                                    }}
                                                    style={{
                                                        padding: '8px',
                                                        borderRadius: '6px',
                                                        border: '1px solid var(--border)',
                                                        backgroundColor: 'var(--bg-card)',
                                                        color: 'var(--text-primary)',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    {Array.from({ length: 30 }, (_, i) => {
                                                        const hour = i.toString().padStart(2, '0');
                                                        return (
                                                            <>
                                                                <option key={`${i}-00`} value={`${hour}:00`}>{`${hour}:00`}</option>
                                                                <option key={`${i}-30`} value={`${hour}:30`}>{`${hour}:30`}</option>
                                                            </>
                                                        );
                                                    })}
                                                </select>
                                                {(schedule.ranges || []).length > 1 && (
                                                    <button
                                                        onClick={() => {
                                                            const newHours = { ...formData.hours };
                                                            const currentRanges = [...(schedule.ranges || [{ open: schedule.open, close: schedule.close }])];
                                                            currentRanges.splice(index, 1);
                                                            newHours[day] = { ...newHours[day], ranges: currentRanges };
                                                            setFormData({ ...formData, hours: newHours });
                                                        }}
                                                        style={{
                                                            background: 'none',
                                                            border: 'none',
                                                            color: 'var(--error)',
                                                            cursor: 'pointer',
                                                            fontSize: '18px',
                                                            padding: '0 4px'
                                                        }}
                                                        title="Eliminar horario"
                                                    >
                                                        ×
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                        <button
                                            onClick={() => {
                                                const newHours = { ...formData.hours };
                                                const currentRanges = [...(schedule.ranges || [{ open: schedule.open, close: schedule.close }])];
                                                currentRanges.push({ open: '17:00', close: '21:00' });
                                                newHours[day] = { ...newHours[day], ranges: currentRanges };
                                                setFormData({ ...formData, hours: newHours });
                                            }}
                                            style={{
                                                alignSelf: 'flex-start',
                                                background: 'none',
                                                border: 'none',
                                                color: 'var(--primary-paddle)',
                                                cursor: 'pointer',
                                                fontSize: '12px',
                                                fontWeight: '600',
                                                marginTop: '4px'
                                            }}
                                        >
                                            + Agregar Horario (Corte)
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* Amenities */}
            <section>
                <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '16px', color: 'var(--text-primary)' }}>
                    Amenidades
                </h3>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                    <input
                        type="text"
                        value={newAmenity}
                        onChange={(e) => setNewAmenity(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addAmenity())}
                        style={{
                            flex: 1,
                            padding: '12px',
                            borderRadius: '10px',
                            border: '1px solid var(--border)',
                            backgroundColor: 'var(--bg-main)',
                            color: 'var(--text-primary)',
                            fontSize: '14px'
                        }}
                        placeholder="Ej: Wifi, Estacionamiento, Bar..."
                    />
                    <button
                        type="button"
                        onClick={addAmenity}
                        style={{
                            padding: '12px 24px',
                            borderRadius: '10px',
                            border: 'none',
                            backgroundColor: 'var(--primary-paddle)',
                            color: '#fff',
                            fontWeight: '600',
                            cursor: 'pointer'
                        }}
                    >
                        + Agregar
                    </button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {formData.amenities.map((amenity, index) => (
                        <span
                            key={index}
                            style={{
                                padding: '8px 12px',
                                borderRadius: '20px',
                                backgroundColor: 'var(--primary-paddle)20',
                                color: 'var(--primary-paddle)',
                                fontSize: '14px',
                                fontWeight: '600',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}
                        >
                            {amenity}
                            <button
                                type="button"
                                onClick={() => removeAmenity(index)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--primary-paddle)',
                                    cursor: 'pointer',
                                    fontSize: '16px',
                                    padding: '0',
                                    lineHeight: '1'
                                }}
                            >
                                ×
                            </button>
                        </span>
                    ))}
                </div>
            </section>

            {/* Courts (for sport type) */}
            {
                formData.type === 'sport' && (
                    <section>
                        <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '16px', color: 'var(--text-primary)' }}>
                            Canchas
                        </h3>
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                            <input
                                type="text"
                                value={newCourt.name}
                                onChange={(e) => setNewCourt({ ...newCourt, name: e.target.value })}
                                style={{
                                    flex: 2,
                                    padding: '12px',
                                    borderRadius: '10px',
                                    border: '1px solid var(--border)',
                                    backgroundColor: 'var(--bg-main)',
                                    color: 'var(--text-primary)',
                                    fontSize: '14px'
                                }}
                                placeholder="Nombre de la cancha"
                            />
                            <input
                                type="number"
                                value={newCourt.price}
                                onChange={(e) => setNewCourt({ ...newCourt, price: e.target.value })}
                                style={{
                                    flex: 1,
                                    padding: '12px',
                                    borderRadius: '10px',
                                    border: '1px solid var(--border)',
                                    backgroundColor: 'var(--bg-main)',
                                    color: 'var(--text-primary)',
                                    fontSize: '14px'
                                }}
                                placeholder="Precio"
                            />
                            <button
                                type="button"
                                onClick={addCourt}
                                style={{
                                    padding: '12px 24px',
                                    borderRadius: '10px',
                                    border: 'none',
                                    backgroundColor: 'var(--primary-paddle)',
                                    color: '#fff',
                                    fontWeight: '600',
                                    cursor: 'pointer'
                                }}
                            >
                                + Agregar
                            </button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {formData.courts.map((court, index) => (
                                <div
                                    key={index}
                                    style={{
                                        padding: '12px 16px',
                                        borderRadius: '10px',
                                        backgroundColor: 'var(--bg-main)',
                                        border: '1px solid var(--border)',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center'
                                    }}
                                >
                                    <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{court.name}</span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <span style={{ color: 'var(--primary-paddle)', fontWeight: '700' }}>${court.price}</span>
                                        <button
                                            type="button"
                                            onClick={() => removeCourt(index)}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                color: '#FF4444',
                                                cursor: 'pointer',
                                                fontSize: '18px'
                                            }}
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )
            }

            {/* Services (for service type) */}
            {
                formData.type === 'service' && (
                    <section>
                        <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '16px', color: 'var(--text-primary)' }}>
                            Servicios
                        </h3>

                        {/* Category Management Section */}
                        <div style={{
                            marginBottom: '24px',
                            padding: '16px',
                            backgroundColor: 'var(--bg-main)',
                            borderRadius: '12px',
                            border: '1px solid var(--border)'
                        }}>
                            <h4 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '12px', color: 'var(--text-primary)' }}>
                                📁 Categorías de Servicios
                            </h4>
                            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                                Crea categorías para organizar tus servicios (ej: "Cortes", "Coloración", "Tratamientos")
                            </p>

                            {/* Add Category */}
                            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                                <input
                                    type="text"
                                    value={newCategory}
                                    onChange={(e) => setNewCategory(e.target.value)}
                                    onKeyPress={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            if (newCategory.trim() && !serviceCategories.includes(newCategory.trim())) {
                                                setServiceCategories([...serviceCategories, newCategory.trim()]);
                                                setNewCategory('');
                                            }
                                        }
                                    }}
                                    style={{
                                        flex: 1,
                                        padding: '10px',
                                        borderRadius: '8px',
                                        border: '1px solid var(--border)',
                                        backgroundColor: 'var(--bg-card)',
                                        color: 'var(--text-primary)',
                                        fontSize: '14px'
                                    }}
                                    placeholder="Nueva categoría..."
                                />
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (newCategory.trim() && !serviceCategories.includes(newCategory.trim())) {
                                            setServiceCategories([...serviceCategories, newCategory.trim()]);
                                            setNewCategory('');
                                        }
                                    }}
                                    style={{
                                        padding: '10px 20px',
                                        borderRadius: '8px',
                                        border: 'none',
                                        backgroundColor: 'var(--primary-paddle)',
                                        color: '#fff',
                                        fontWeight: '600',
                                        cursor: 'pointer',
                                        fontSize: '14px',
                                        whiteSpace: 'nowrap'
                                    }}
                                >
                                    + Agregar
                                </button>
                            </div>

                            {/* Category List */}
                            {serviceCategories.length > 0 && (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                    {serviceCategories.map((cat, index) => (
                                        <span
                                            key={index}
                                            style={{
                                                padding: '6px 12px',
                                                borderRadius: '16px',
                                                backgroundColor: 'var(--primary-paddle)20',
                                                color: 'var(--primary-paddle)',
                                                fontSize: '13px',
                                                fontWeight: '600',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px'
                                            }}
                                        >
                                            {cat}
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const isInUse = formData.services.some(s => s.category === cat);
                                                    if (isInUse) {
                                                        alert(`No puedes eliminar "${cat}" porque hay servicios asignados a esta categoría`);
                                                    } else if (window.confirm(`¿Eliminar categoría "${cat}"?`)) {
                                                        setServiceCategories(serviceCategories.filter((_, i) => i !== index));
                                                    }
                                                }}
                                                style={{
                                                    background: 'none',
                                                    border: 'none',
                                                    color: 'var(--primary-paddle)',
                                                    cursor: 'pointer',
                                                    fontSize: '14px',
                                                    padding: '0',
                                                    lineHeight: '1',
                                                    fontWeight: '700'
                                                }}
                                            >
                                                ×
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '8px', marginBottom: '12px' }}>
                            <input
                                type="text"
                                value={newService.name}
                                onChange={(e) => setNewService({ ...newService, name: e.target.value })}
                                style={{
                                    padding: '12px',
                                    borderRadius: '10px',
                                    border: '1px solid var(--border)',
                                    backgroundColor: 'var(--bg-main)',
                                    color: 'var(--text-primary)',
                                    fontSize: '14px'
                                }}
                                placeholder="Nombre del servicio"
                            />
                            <input
                                type="number"
                                value={newService.price}
                                onChange={(e) => setNewService({ ...newService, price: e.target.value })}
                                style={{
                                    padding: '12px',
                                    borderRadius: '10px',
                                    border: '1px solid var(--border)',
                                    backgroundColor: 'var(--bg-main)',
                                    color: 'var(--text-primary)',
                                    fontSize: '14px'
                                }}
                                placeholder="Precio"
                            />
                            <input
                                type="text"
                                value={newService.duration}
                                onChange={(e) => setNewService({ ...newService, duration: e.target.value })}
                                style={{
                                    padding: '12px',
                                    borderRadius: '10px',
                                    border: '1px solid var(--border)',
                                    backgroundColor: 'var(--bg-main)',
                                    color: 'var(--text-primary)',
                                    fontSize: '14px'
                                }}
                                placeholder="Duración"
                            />
                            <div style={{ display: 'flex', gap: '8px' }}>
                                {editingServiceIndex !== null && (
                                    <button
                                        type="button"
                                        onClick={cancelEditService}
                                        style={{
                                            padding: '12px',
                                            borderRadius: '10px',
                                            border: '1px solid var(--border)',
                                            backgroundColor: 'transparent',
                                            color: 'var(--text-secondary)',
                                            fontWeight: '600',
                                            cursor: 'pointer',
                                            whiteSpace: 'nowrap'
                                        }}
                                    >
                                        Cancelar
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={addService}
                                    style={{
                                        padding: '12px 24px',
                                        borderRadius: '10px',
                                        border: 'none',
                                        backgroundColor: 'var(--primary-paddle)',
                                        color: '#fff',
                                        fontWeight: '600',
                                        cursor: 'pointer',
                                        whiteSpace: 'nowrap'
                                    }}
                                >
                                    {editingServiceIndex !== null ? 'Actualizar' : '+ Agregar'}
                                </button>
                            </div>
                        </div>
                        <input
                            type="text"
                            value={newService.description}
                            onChange={(e) => setNewService({ ...newService, description: e.target.value })}
                            style={{
                                width: '100%',
                                padding: '12px',
                                borderRadius: '10px',
                                border: '1px solid var(--border)',
                                backgroundColor: 'var(--bg-main)',
                                color: 'var(--text-primary)',
                                fontSize: '14px',
                                marginBottom: '12px'
                            }}
                            placeholder="Descripción del servicio"
                        />

                        {/* Category Dropdown */}
                        <div style={{ marginBottom: '12px' }}>
                            <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: 'var(--text-secondary)' }}>
                                Categoría *
                            </label>
                            {serviceCategories.length === 0 ? (
                                <div style={{
                                    padding: '10px',
                                    borderRadius: '8px',
                                    border: '1px solid #ffc107',
                                    backgroundColor: '#fff3cd',
                                    color: '#856404',
                                    fontSize: '13px'
                                }}>
                                    Primero crea una categoría arriba
                                </div>
                            ) : (
                                <select
                                    value={newService.category}
                                    onChange={(e) => setNewService({ ...newService, category: e.target.value })}
                                    style={{
                                        width: '100%',
                                        padding: '10px',
                                        borderRadius: '8px',
                                        border: '1px solid var(--border)',
                                        backgroundColor: 'var(--bg-card)',
                                        color: 'var(--text-primary)'
                                    }}
                                >
                                    <option value="">Seleccionar categoría...</option>
                                    {serviceCategories.map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            )}
                        </div>

                        {/* Service Image Upload */}
                        <div style={{ marginBottom: '12px' }}>
                            <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: 'var(--text-secondary)' }}>
                                Imagen del Servicio (Opcional)
                            </label>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleServiceImageUpload}
                                disabled={uploadingServiceImage}
                                style={{
                                    width: '100%',
                                    padding: '10px',
                                    borderRadius: '8px',
                                    border: '1px solid var(--border)',
                                    backgroundColor: 'var(--bg-card)',
                                    color: 'var(--text-primary)',
                                    fontSize: '13px'
                                }}
                            />
                            {uploadingServiceImage && (
                                <span style={{ fontSize: '12px', color: 'var(--primary-paddle)', marginTop: '4px', display: 'block' }}>
                                    ⏳ Subiendo imagen...
                                </span>
                            )}
                            {newService.image_url && (
                                <div style={{
                                    marginTop: '8px',
                                    width: '100%',
                                    height: '100px',
                                    borderRadius: '8px',
                                    border: '2px dashed var(--border)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    overflow: 'hidden',
                                    backgroundColor: 'var(--bg-main)',
                                    position: 'relative'
                                }}>
                                    <img
                                        src={newService.image_url}
                                        alt="Preview"
                                        style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setNewService({ ...newService, image_url: '' })}
                                        style={{
                                            position: 'absolute',
                                            top: '4px',
                                            right: '4px',
                                            background: 'rgba(0,0,0,0.5)',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '50%',
                                            width: '24px',
                                            height: '24px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}
                                    >
                                        ×
                                    </button>
                                </div>
                            )}
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {formData.services.map((service, index) => (
                                <div
                                    key={service.id || index}
                                    style={{
                                        padding: '16px',
                                        borderRadius: '10px',
                                        backgroundColor: 'var(--bg-main)',
                                        border: '1px solid var(--border)'
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                                <h4 style={{ fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>{service.name}</h4>
                                                {service.category && (
                                                    <span style={{
                                                        fontSize: '11px',
                                                        padding: '2px 8px',
                                                        borderRadius: '6px',
                                                        backgroundColor: 'var(--primary-paddle)20',
                                                        color: 'var(--primary-paddle)',
                                                        fontWeight: '600'
                                                    }}>
                                                        {service.category}
                                                    </span>
                                                )}
                                            </div>
                                            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>{service.description}</p>
                                        </div>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button
                                                type="button"
                                                onClick={() => editService(index)}
                                                style={{
                                                    background: 'none',
                                                    border: 'none',
                                                    color: 'var(--text-secondary)',
                                                    cursor: 'pointer',
                                                    fontSize: '18px'
                                                }}
                                                title="Editar"
                                            >
                                                ✏️
                                            </button>
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    if (window.confirm('¿Estás seguro de que quieres eliminar este servicio?')) {
                                                        removeService(index);
                                                    }
                                                }}
                                                style={{
                                                    background: 'none',
                                                    border: 'none',
                                                    color: '#FF4444',
                                                    cursor: 'pointer',
                                                    fontSize: '18px'
                                                }}
                                                title="Eliminar"
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '16px', fontSize: '14px' }}>
                                        <span style={{ color: 'var(--primary-paddle)', fontWeight: '700' }}>${service.price}</span>
                                        <span style={{ color: 'var(--text-secondary)' }}>⏱ {service.duration}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )
            }

            {/* Specialists Section - Only for service-type businesses */}
            {
                formData.type === 'service' && (
                    <section>
                        <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '16px', color: 'var(--text-primary)' }}>
                            Profesionales
                        </h3>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
                            <input
                                type="text"
                                value={newSpecialist.name || ''}
                                onChange={(e) => setNewSpecialist({ ...newSpecialist, name: e.target.value })}
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    borderRadius: '10px',
                                    border: '1px solid var(--border)',
                                    backgroundColor: 'var(--bg-main)',
                                    color: 'var(--text-primary)',
                                    fontSize: '14px'
                                }}
                                placeholder="Nombre del profesional"
                            />
                            <input
                                type="text"
                                value={newSpecialist.role || ''}
                                onChange={(e) => setNewSpecialist({ ...newSpecialist, role: e.target.value })}
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    borderRadius: '10px',
                                    border: '1px solid var(--border)',
                                    backgroundColor: 'var(--bg-main)',
                                    color: 'var(--text-primary)',
                                    fontSize: '14px'
                                }}
                                placeholder="Especialidad/Rol (ej: Peluquero, Masajista)"
                            />

                            <button
                                type="button"
                                onClick={addSpecialist}
                                style={{
                                    padding: '12px 24px',
                                    borderRadius: '10px',
                                    border: 'none',
                                    backgroundColor: 'var(--primary-paddle)',
                                    color: '#fff',
                                    fontWeight: '600',
                                    cursor: 'pointer'
                                }}
                            >
                                + Agregar Profesional
                            </button>
                        </div>

                        {/* List of Specialists */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {formData.specialists && formData.specialists.map((specialist, index) => (
                                <div
                                    key={index}
                                    style={{
                                        padding: '16px',
                                        borderRadius: '10px',
                                        backgroundColor: 'var(--bg-main)',
                                        border: '1px solid var(--border)',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center'
                                    }}
                                >
                                    <div>
                                        <h4 style={{ fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' }}>{specialist.name}</h4>
                                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>{specialist.role}</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => removeSpecialist(index)}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            color: '#FF4444',
                                            cursor: 'pointer',
                                            fontSize: '18px'
                                        }}
                                    >
                                        🗑️
                                    </button>
                                </div>
                            ))}
                        </div>
                    </section>
                )
            }

            {/* Redes Sociales */}
            <section>
                <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '16px', color: 'var(--text-primary)' }}>
                    Redes Sociales
                </h3>
                <div style={{ display: 'grid', gap: '16px' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                            Instagram (URL completa)
                        </label>
                        <input
                            type="url"
                            value={formData.instagram || ''}
                            onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                            style={{
                                width: '100%',
                                padding: '12px',
                                borderRadius: '10px',
                                border: '1px solid var(--border)',
                                backgroundColor: 'var(--bg-main)',
                                color: 'var(--text-primary)',
                                fontSize: '14px'
                            }}
                            placeholder="https://instagram.com/tu_negocio"
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                            Facebook (URL completa)
                        </label>
                        <input
                            type="url"
                            value={formData.facebook || ''}
                            onChange={(e) => setFormData({ ...formData, facebook: e.target.value })}
                            style={{
                                width: '100%',
                                padding: '12px',
                                borderRadius: '10px',
                                border: '1px solid var(--border)',
                                backgroundColor: 'var(--bg-main)',
                                color: 'var(--text-primary)',
                                fontSize: '14px'
                            }}
                            placeholder="https://facebook.com/tu_negocio"
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                            WhatsApp (número con código de país, sin +)
                        </label>
                        <input
                            type="tel"
                            value={formData.whatsapp || ''}
                            onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                            style={{
                                width: '100%',
                                padding: '12px',
                                borderRadius: '10px',
                                border: '1px solid var(--border)',
                                backgroundColor: 'var(--bg-main)',
                                color: 'var(--text-primary)',
                                fontSize: '14px'
                            }}
                            placeholder="5493804123456"
                        />
                        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                            Ejemplo: 5493804123456 (54 = Argentina, 9 = celular, 3804 = código de área, 123456 = número)
                        </p>
                    </div>
                </div>
            </section>

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
        </form >
    );
}
