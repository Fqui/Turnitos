import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import supabaseService from '../../services/supabaseService';
import { generateBusinessCredentials, validateSubscriptionLimit, slugify } from '../../utils/businessUtils';
import { resizeImage, validateImageFile } from '../../utils/imageUtils';
import CostBreakdown from '../CostBreakdown';

// Fix for default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const SUGGESTED_COLORS = ['#00E676', '#2196F3', '#9C27B0', '#FF9800', '#E91E63', '#00BCD4'];

function LocationPicker({ position, onLocationChange }) {
    function LocationMarker() {
        useMapEvents({
            click(e) {
                onLocationChange(e.latlng);
            },
        });
        return position ? <Marker position={position} /> : null;
    }

    return (
        <MapContainer
            center={position || [-29.4135, -66.8558]} // La Rioja, Argentina
            zoom={13}
            style={{ height: '300px', width: '100%', borderRadius: '12px' }}
        >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <LocationMarker />
        </MapContainer>
    );
}

export default function DeportesForm({ business, onSave, onCancel }) {
    const [categories, setCategories] = useState([]);
    const [subcategories, setSubcategories] = useState([]);
    const [subscriptionPlans, setSubscriptionPlans] = useState([]);
    const [loading, setLoading] = useState(true);

    const defaultHours = {
        monday: { open: '08:00', close: '22:00', isOpen: true, isSplit: false, open2: '17:00', close2: '21:00' },
        tuesday: { open: '08:00', close: '22:00', isOpen: true, isSplit: false, open2: '17:00', close2: '21:00' },
        wednesday: { open: '08:00', close: '22:00', isOpen: true, isSplit: false, open2: '17:00', close2: '21:00' },
        thursday: { open: '08:00', close: '22:00', isOpen: true, isSplit: false, open2: '17:00', close2: '21:00' },
        friday: { open: '08:00', close: '22:00', isOpen: true, isSplit: false, open2: '17:00', close2: '21:00' },
        saturday: { open: '09:00', close: '21:00', isOpen: true, isSplit: false, open2: '17:00', close2: '21:00' },
        sunday: { open: '09:00', close: '21:00', isOpen: true, isSplit: false, open2: '17:00', close2: '21:00' }
    };

    const [formData, setFormData] = useState(() => {
        if (!business) {
            return {
                name: '',
                subcategories: [],
                type: 'sport',
                location: '',
                latitude: -29.4135,
                longitude: -66.8558,
                logo: '',
                banner_image: '',
                hours: defaultHours,
                theme: 'dark',
                primaryColor: '#00E676',
                subscription_plan_id: '',
                amenities: [],
                courts: [],
                instagram: '',
                facebook: '',
                whatsapp: '',
                tiktok: '',
                website: ''
            };
        }

        return {
            ...business,
            hours: business.hours || defaultHours,
            primaryColor: business.primary_color || '#00E676',
            amenities: business.amenities || [],
            courts: business.courts || [],
            subcategories: business.subcategories?.map(s => s.id) || []
        };
    });

    const [newCourt, setNewCourt] = useState({ name: '', price: '', sport: 'padel' });
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const [uploadingBanner, setUploadingBanner] = useState(false);
    const [costBreakdown, setCostBreakdown] = useState(null);

    useEffect(() => {
        fetchData();
    }, []);

    // Load all sport subcategories on mount
    useEffect(() => {
        const sportCategory = categories.find(c => c.slug === 'deportes' || c.type === 'sport');
        if (sportCategory) {
            fetchSubcategories(sportCategory.id);
        }
    }, [categories]);

    const fetchData = async () => {
        try {
            const [cats, plans] = await Promise.all([
                supabaseService.getCategories('sport'),
                supabaseService.getSubscriptionPlans('sport')
            ]);
            setCategories(cats);
            setSubscriptionPlans(plans);
        } catch (error) {
            console.error('Error fetching data:', error);
            alert('Error al cargar datos');
        } finally {
            setLoading(false);
        }
    };

    // Filtrar planes base (is_per_unit = false) y obtener plan por unidad
    const basePlans = subscriptionPlans.filter(p => !p.is_per_unit);
    const perUnitPlan = subscriptionPlans.find(p => p.is_per_unit && p.business_type === 'sport');

    // Calcular costos cuando cambia el plan o la cantidad de canchas
    useEffect(() => {
        if (formData.subscription_plan_id && perUnitPlan) {
            const selectedPlan = basePlans.find(p => p.id === formData.subscription_plan_id);
            if (selectedPlan) {
                const includedSpaces = selectedPlan.spaces_included;
                const totalSpaces = formData.courts.length;
                const additionalSpaces = Math.max(0, totalSpaces - includedSpaces);

                const baseCost = selectedPlan.price_monthly || selectedPlan.price || 0;
                const additionalCost = additionalSpaces * (perUnitPlan.price_monthly || perUnitPlan.price || 0);
                const totalCost = baseCost + additionalCost;

                setCostBreakdown({
                    planName: selectedPlan.name,
                    baseCost,
                    includedSpaces,
                    totalSpaces,
                    additionalSpaces,
                    perUnitPrice: perUnitPlan.price_monthly || perUnitPlan.price || 0,
                    additionalCost,
                    totalCost
                });
            }
        } else {
            setCostBreakdown(null);
        }
    }, [formData.subscription_plan_id, formData.courts.length, subscriptionPlans]);

    const fetchSubcategories = async (categoryId) => {
        try {
            const subs = await supabaseService.getSubcategories(categoryId);
            setSubcategories(subs);
        } catch (error) {
            console.error('Error fetching subcategories:', error);
        }
    };

    const handleImageUpload = async (file, type) => {
        if (!file) return;

        const uploadSetter = type === 'logo' ? setUploadingLogo : setUploadingBanner;
        uploadSetter(true);

        try {
            // Validate image file
            const validation = validateImageFile(file);
            if (!validation.valid) {
                alert(validation.error);
                uploadSetter(false);
                return;
            }

            // Resize image based on type
            const imageType = type === 'logo' ? 'logo' : 'banner';
            const resizedFile = await resizeImage(file, imageType);

            // Upload resized image
            const imageUrl = await supabaseService.uploadImage(resizedFile, 'businesses');
            setFormData(prev => ({
                ...prev,
                [type === 'logo' ? 'logo' : 'banner_image']: imageUrl
            }));
        } catch (error) {
            console.error('Error uploading image:', error);
            alert('Error al subir imagen: ' + error.message);
        } finally {
            uploadSetter(false);
        }
    };

    const handleAddCourt = () => {
        if (!newCourt.name || !newCourt.price) {
            alert('Completa todos los campos de la cancha');
            return;
        }

        // Add court without subscription limit validation
        setFormData(prev => ({
            ...prev,
            courts: [...prev.courts, { ...newCourt, id: Date.now().toString(), sport: newCourt.sport || 'padel' }]
        }));
        setNewCourt({ name: '', price: '', sport: 'padel' });
    };

    const handleRemoveCourt = (index) => {
        setFormData(prev => ({
            ...prev,
            courts: prev.courts.filter((_, i) => i !== index)
        }));
    };

    const handleHourChange = (day, field, value) => {
        setFormData(prev => ({
            ...prev,
            hours: {
                ...prev.hours,
                [day]: {
                    ...prev.hours[day],
                    [field]: value
                }
            }
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.name || !formData.subscription_plan_id || formData.subcategories.length === 0) {
            alert('Completa todos los campos obligatorios (nombre, plan y al menos una subcategoría)');
            return;
        }

        try {
            const credentials = generateBusinessCredentials(formData.name);

            // Find sport category automatically
            const sportCategory = categories.find(c => c.slug === 'deportes' || c.type === 'sport');

            const businessData = {
                ...formData,
                category_id: sportCategory?.id,
                email: credentials.email,
                password: credentials.password,
                slug: slugify(formData.name),
                primary_color: formData.primaryColor
            };

            await onSave(businessData);
        } catch (error) {
            console.error('Error saving business:', error);
            alert('Error al guardar negocio: ' + error.message);
        }
    };

    if (loading) {
        return <div style={{ padding: '40px', textAlign: 'center' }}>Cargando...</div>;
    }

    const selectedPlan = subscriptionPlans.find(p => p.id === formData.subscription_plan_id);
    const courtsValidation = selectedPlan ? validateSubscriptionLimit(formData.courts.length, selectedPlan.spaces_included, 'canchas') : null;

    return (
        <form onSubmit={handleSubmit} style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h2 style={{ fontSize: '28px', fontWeight: '900', marginBottom: '4px', color: 'var(--text-primary)' }}>
                        {business ? 'Editar' : 'Nuevo'} Negocio Deportivo
                    </h2>
                    <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                        Completa la información del complejo deportivo
                    </p>
                </div>
                <button
                    type="button"
                    onClick={onCancel}
                    style={{
                        padding: '10px 20px',
                        borderRadius: '10px',
                        border: '1px solid var(--border)',
                        backgroundColor: 'transparent',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                        fontWeight: '600'
                    }}
                >
                    ← Volver
                </button>
            </div>

            {/* Sección 1: Información Básica */}
            <section style={{
                backgroundColor: 'var(--bg-card)',
                borderRadius: '16px',
                padding: '24px',
                marginBottom: '20px',
                border: '1px solid var(--border)'
            }}>
                <h3 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '20px', color: 'var(--text-primary)' }}>
                    📋 Información Básica
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
                            placeholder="Ej: Club Padel Central"
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

                    <div>
                        <label style={{ display: 'block', marginBottom: '12px', fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                            Subcategorías * (selecciona todas las que apliquen)
                        </label>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px', padding: '12px', backgroundColor: 'var(--bg-main)', borderRadius: '10px' }}>
                            {subcategories.map(sub => (
                                <label key={sub.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={formData.subcategories.includes(sub.id)}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setFormData({ ...formData, subcategories: [...formData.subcategories, sub.id] });
                                            } else {
                                                setFormData({ ...formData, subcategories: formData.subcategories.filter(id => id !== sub.id) });
                                            }
                                        }}
                                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                    />
                                    <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>
                                        {sub.icon} {sub.name}
                                    </span>
                                </label>
                            ))}
                        </div>
                        {formData.subcategories.length > 0 && (
                            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '8px' }}>
                                {formData.subcategories.length} subcategoría{formData.subcategories.length > 1 ? 's' : ''} seleccionada{formData.subcategories.length > 1 ? 's' : ''}
                            </p>
                        )}
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                            Plan de Suscripción *
                        </label>
                        <select
                            required
                            value={formData.subscription_plan_id}
                            onChange={(e) => setFormData({ ...formData, subscription_plan_id: e.target.value })}
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
                            <option value="">Seleccionar plan</option>
                            {basePlans.map(plan => (
                                <option key={plan.id} value={plan.id}>
                                    {plan.name} - {plan.spaces_included} {plan.spaces_included === 1 ? 'cancha' : 'canchas'}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div style={{ marginTop: '16px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                        Dirección *
                    </label>
                    <input
                        type="text"
                        required
                        value={formData.location}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        placeholder="Ej: Av. Principal 123, La Rioja"
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

                <div style={{ marginTop: '16px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                        Ubicación en Mapa *
                    </label>
                    <LocationPicker
                        position={formData.latitude && formData.longitude ? [formData.latitude, formData.longitude] : null}
                        onLocationChange={(latlng) => setFormData({ ...formData, latitude: latlng.lat, longitude: latlng.lng })}
                    />
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '8px' }}>
                        Haz clic en el mapa para seleccionar la ubicación exacta
                    </p>
                </div>

                {formData.name && (
                    <div style={{ marginTop: '16px', padding: '12px', backgroundColor: 'var(--bg-main)', borderRadius: '10px' }}>
                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                            <strong>Email (auto-generado):</strong> {generateBusinessCredentials(formData.name).email}
                        </p>
                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                            <strong>Contraseña:</strong> admin123
                        </p>
                    </div>
                )}
            </section>

            {/* Sección 2: Multimedia */}
            <section style={{
                backgroundColor: 'var(--bg-card)',
                borderRadius: '16px',
                padding: '24px',
                marginBottom: '20px',
                border: '1px solid var(--border)'
            }}>
                <h3 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '20px', color: 'var(--text-primary)' }}>
                    🖼️ Multimedia
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                            Logo *
                        </label>
                        {formData.logo && (
                            <img src={formData.logo} alt="Logo" style={{ width: '100%', maxHeight: '200px', objectFit: 'contain', borderRadius: '12px', marginBottom: '12px', backgroundColor: 'var(--bg-main)' }} />
                        )}
                        <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleImageUpload(e.target.files[0], 'logo')}
                            disabled={uploadingLogo}
                            style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-main)', color: 'var(--text-primary)' }}
                        />
                        {uploadingLogo && <p style={{ fontSize: '12px', color: 'var(--primary-paddle)', marginTop: '8px' }}>Subiendo...</p>}
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                            Banner/Fachada *
                        </label>
                        {formData.banner_image && (
                            <img src={formData.banner_image} alt="Banner" style={{ width: '100%', maxHeight: '200px', objectFit: 'cover', borderRadius: '12px', marginBottom: '12px' }} />
                        )}
                        <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleImageUpload(e.target.files[0], 'banner')}
                            disabled={uploadingBanner}
                            style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-main)', color: 'var(--text-primary)' }}
                        />
                        {uploadingBanner && <p style={{ fontSize: '12px', color: 'var(--primary-paddle)', marginTop: '8px' }}>Subiendo...</p>}
                    </div>
                </div>
            </section>

            {/* Sección 3: Horarios */}
            <section style={{
                backgroundColor: 'var(--bg-card)',
                borderRadius: '16px',
                padding: '24px',
                marginBottom: '20px',
                border: '1px solid var(--border)'
            }}>
                <h3 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '20px', color: 'var(--text-primary)' }}>
                    🕐 Horarios de Atención
                </h3>

                <div style={{ display: 'grid', gap: '12px' }}>
                    {Object.entries(formData.hours).map(([day, schedule]) => {
                        const dayNames = {
                            monday: 'Lunes',
                            tuesday: 'Martes',
                            wednesday: 'Miércoles',
                            thursday: 'Jueves',
                            friday: 'Viernes',
                            saturday: 'Sábado',
                            sunday: 'Domingo'
                        };

                        return (
                            <div key={day} style={{ padding: '16px', backgroundColor: 'var(--bg-main)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: schedule.isOpen ? '12px' : '0' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '120px' }}>
                                        <input
                                            type="checkbox"
                                            checked={schedule.isOpen}
                                            onChange={(e) => handleHourChange(day, 'isOpen', e.target.checked)}
                                            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                        />
                                        <span style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>
                                            {dayNames[day]}
                                        </span>
                                    </label>

                                    {schedule.isOpen && (
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
                                            <input
                                                type="checkbox"
                                                checked={schedule.isSplit || false}
                                                onChange={(e) => handleHourChange(day, 'isSplit', e.target.checked)}
                                                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                                            />
                                            <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                                                Horario Cortado
                                            </span>
                                        </label>
                                    )}

                                    {!schedule.isOpen && (
                                        <span style={{ fontSize: '14px', color: 'var(--text-secondary)', fontStyle: 'italic', marginLeft: 'auto' }}>Cerrado</span>
                                    )}
                                </div>

                                {schedule.isOpen && !schedule.isSplit && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingLeft: '28px' }}>
                                        <input
                                            type="time"
                                            value={schedule.open}
                                            onChange={(e) => handleHourChange(day, 'open', e.target.value)}
                                            style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '14px', fontWeight: '600' }}
                                        />
                                        <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>a</span>
                                        <input
                                            type="time"
                                            value={schedule.close}
                                            onChange={(e) => handleHourChange(day, 'close', e.target.value)}
                                            style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '14px', fontWeight: '600' }}
                                        />
                                    </div>
                                )}

                                {schedule.isOpen && schedule.isSplit && (
                                    <div style={{ display: 'grid', gap: '12px', paddingLeft: '28px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', minWidth: '100px' }}>Turno mañana:</span>
                                            <input
                                                type="time"
                                                value={schedule.open}
                                                onChange={(e) => handleHourChange(day, 'open', e.target.value)}
                                                style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '14px', fontWeight: '600' }}
                                            />
                                            <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>a</span>
                                            <input
                                                type="time"
                                                value={schedule.close}
                                                onChange={(e) => handleHourChange(day, 'close', e.target.value)}
                                                style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '14px', fontWeight: '600' }}
                                            />
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', minWidth: '100px' }}>Turno tarde:</span>
                                            <input
                                                type="time"
                                                value={schedule.open2 || '17:00'}
                                                onChange={(e) => handleHourChange(day, 'open2', e.target.value)}
                                                style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '14px', fontWeight: '600' }}
                                            />
                                            <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>a</span>
                                            <input
                                                type="time"
                                                value={schedule.close2 || '21:00'}
                                                onChange={(e) => handleHourChange(day, 'close2', e.target.value)}
                                                style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '14px', fontWeight: '600' }}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* Sección 4: Canchas */}
            <section style={{
                backgroundColor: 'var(--bg-card)',
                borderRadius: '16px',
                padding: '24px',
                marginBottom: '20px',
                border: '1px solid var(--border)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h3 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>
                        🎾 Canchas
                    </h3>
                    {courtsValidation && (
                        <span style={{ fontSize: '13px', color: courtsValidation.isValid ? 'var(--text-secondary)' : '#FF4444', fontWeight: '600' }}>
                            {courtsValidation.message}
                        </span>
                    )}
                </div>

                {/* Lógica para determinar deportes disponibles según subcategorías seleccionadas */}
                {(() => {
                    const selectedSubs = subcategories.filter(s => formData.subcategories.includes(s.id));
                    const derivedSports = new Set();

                    selectedSubs.forEach(sub => {
                        const slug = sub.slug.toLowerCase();
                        if (slug.includes('futbol')) derivedSports.add('futbol');
                        else if (slug.includes('padel')) derivedSports.add('padel');
                        else if (slug.includes('tenis') || slug.includes('tennis')) derivedSports.add('tennis');
                    });

                    // Convertir a array. Si no hay nada detectado (ej: primer carga), default a padel para evitar errores,
                    // pero idealmente el usuario ya seleccionó algo.
                    const availableSports = derivedSports.size > 0 ? Array.from(derivedSports) : ['padel'];
                    const isSingleSport = availableSports.length === 1;

                    // Actualizar el estado de newCourt si el deporte actual no coincide con los disponibles
                    // (Esto es un efecto render-time, React 18 lo maneja bien, pero idealmente sería un useEffect. 
                    // Para simplificar aquí, aseguramos que el valor enviado en onClick sea válido).

                    return (
                        <div style={{ display: 'grid', gridTemplateColumns: isSingleSport ? '2fr 1fr auto' : '2fr 1fr 1fr auto', gap: '12px', marginBottom: '16px' }}>
                            <input
                                type="text"
                                placeholder={isSingleSport ? `Nombre (ej: Cancha 1)` : "Nombre"}
                                value={newCourt.name}
                                onChange={(e) => setNewCourt({ ...newCourt, name: e.target.value })}
                                style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-main)', color: 'var(--text-primary)', fontSize: '14px' }}
                            />

                            {!isSingleSport && (
                                <select
                                    value={newCourt.sport || availableSports[0]}
                                    onChange={(e) => setNewCourt({ ...newCourt, sport: e.target.value })}
                                    style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-main)', color: 'var(--text-primary)', fontSize: '14px' }}
                                >
                                    {availableSports.map(sport => (
                                        <option key={sport} value={sport}>
                                            {sport === 'futbol' ? 'Fútbol' : sport === 'tennis' ? 'Tenis' : 'Pádel'}
                                        </option>
                                    ))}
                                </select>
                            )}

                            <input
                                type="number"
                                placeholder="Precio/h"
                                value={newCourt.price}
                                onChange={(e) => setNewCourt({ ...newCourt, price: e.target.value })}
                                style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-main)', color: 'var(--text-primary)', fontSize: '14px' }}
                            />
                            <button
                                type="button"
                                onClick={() => {
                                    // Asegurar que usamos el deporte correcto al agregar
                                    const sportToAdd = isSingleSport ? availableSports[0] : (newCourt.sport || availableSports[0]);

                                    if (!newCourt.name || !newCourt.price) {
                                        alert('Completa todos los campos');
                                        return;
                                    }

                                    setFormData(prev => ({
                                        ...prev,
                                        courts: [...prev.courts, { ...newCourt, id: Date.now().toString(), sport: sportToAdd }]
                                    }));
                                    setNewCourt({ name: '', price: '', sport: sportToAdd });
                                }}
                                style={{ padding: '12px 20px', borderRadius: '10px', backgroundColor: 'var(--primary-paddle)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: '700', fontSize: '14px' }}
                            >
                                + Agregar
                            </button>
                        </div>
                    );
                })()}

                <div style={{ display: 'grid', gap: '12px' }}>
                    {formData.courts.map((court, index) => (
                        <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', backgroundColor: 'var(--bg-main)', borderRadius: '10px' }}>
                            <div>
                                <p style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' }}>{court.name}</p>
                                <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>${court.price}/hora</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => handleRemoveCourt(index)}
                                style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #FF4444', backgroundColor: '#FF444410', color: '#FF4444', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}
                            >
                                🗑️ Eliminar
                            </button>
                        </div>
                    ))}
                </div>

                {formData.courts.length === 0 && (
                    <p style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)', fontSize: '14px' }}>
                        No hay canchas agregadas aún
                    </p>
                )}
            </section>

            {/* Desglose de Costos */}
            {costBreakdown && (
                <CostBreakdown
                    planName={costBreakdown.planName}
                    baseCost={costBreakdown.baseCost}
                    includedSpaces={costBreakdown.includedSpaces}
                    totalSpaces={costBreakdown.totalSpaces}
                    additionalSpaces={costBreakdown.additionalSpaces}
                    perUnitPrice={costBreakdown.perUnitPrice}
                    additionalCost={costBreakdown.additionalCost}
                    totalCost={costBreakdown.totalCost}
                    spaceType="canchas"
                />
            )}

            {/* Sección 5: Comodidades */}
            <section style={{
                backgroundColor: 'var(--bg-card)',
                borderRadius: '16px',
                padding: '24px',
                marginBottom: '20px',
                border: '1px solid var(--border)'
            }}>
                <h3 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '20px', color: 'var(--text-primary)' }}>
                    ✨ Comodidades
                </h3>

                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                    <input
                        type="text"
                        placeholder="Ej: Wifi, Estacionamiento, Vestuarios..."
                        onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                const value = e.target.value.trim();
                                if (value && !formData.amenities.includes(value)) {
                                    setFormData({ ...formData, amenities: [...formData.amenities, value] });
                                    e.target.value = '';
                                }
                            }
                        }}
                        style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-main)', color: 'var(--text-primary)', fontSize: '14px' }}
                    />
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {formData.amenities.map((amenity, index) => (
                        <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', backgroundColor: 'var(--primary-paddle)20', borderRadius: '20px', border: '1px solid var(--primary-paddle)' }}>
                            <span style={{ fontSize: '14px', color: 'var(--text-primary)', fontWeight: '600' }}>{amenity}</span>
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, amenities: formData.amenities.filter((_, i) => i !== index) })}
                                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '16px', padding: '0', lineHeight: '1' }}
                            >
                                ×
                            </button>
                        </div>
                    ))}
                </div>

                {formData.amenities.length === 0 && (
                    <p style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)', fontSize: '14px' }}>
                        Presiona Enter para agregar comodidades
                    </p>
                )}
            </section>

            {/* Sección 6: Tema y Apariencia */}
            <section style={{
                backgroundColor: 'var(--bg-card)',
                borderRadius: '16px',
                padding: '24px',
                marginBottom: '20px',
                border: '1px solid var(--border)'
            }}>
                <h3 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '20px', color: 'var(--text-primary)' }}>
                    🎨 Tema y Apariencia
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '20px' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '12px', fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                            Tema del Perfil
                        </label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, theme: 'light' })}
                                style={{
                                    padding: '16px',
                                    borderRadius: '12px',
                                    border: `2px solid ${formData.theme === 'light' ? 'var(--primary-paddle)' : 'var(--border)'}`,
                                    backgroundColor: formData.theme === 'light' ? 'var(--primary-paddle)10' : 'var(--bg-main)',
                                    cursor: 'pointer',
                                    textAlign: 'center'
                                }}
                            >
                                <div style={{ fontSize: '32px', marginBottom: '8px' }}>☀️</div>
                                <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>Claro</div>
                            </button>
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, theme: 'dark' })}
                                style={{
                                    padding: '16px',
                                    borderRadius: '12px',
                                    border: `2px solid ${formData.theme === 'dark' ? 'var(--primary-paddle)' : 'var(--border)'}`,
                                    backgroundColor: formData.theme === 'dark' ? 'var(--primary-paddle)10' : 'var(--bg-main)',
                                    cursor: 'pointer',
                                    textAlign: 'center'
                                }}
                            >
                                <div style={{ fontSize: '32px', marginBottom: '8px' }}>🌙</div>
                                <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>Oscuro</div>
                            </button>
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '12px', fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                            Color Primario
                        </label>
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                            {SUGGESTED_COLORS.map(color => (
                                <button
                                    key={color}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, primaryColor: color })}
                                    style={{
                                        width: '40px',
                                        height: '40px',
                                        borderRadius: '50%',
                                        backgroundColor: color,
                                        border: formData.primaryColor === color ? '3px solid var(--text-primary)' : '2px solid var(--border)',
                                        cursor: 'pointer'
                                    }}
                                />
                            ))}
                        </div>
                        <input
                            type="color"
                            value={formData.primaryColor}
                            onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                            style={{ width: '100%', height: '44px', borderRadius: '10px', border: '1px solid var(--border)', cursor: 'pointer' }}
                        />
                    </div>
                </div>

                <div style={{ padding: '16px', backgroundColor: 'var(--bg-main)', borderRadius: '12px' }}>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px' }}>Vista Previa:</p>
                    <button
                        type="button"
                        style={{
                            padding: '12px 24px',
                            borderRadius: '12px',
                            backgroundColor: formData.primaryColor,
                            color: '#fff',
                            border: 'none',
                            fontWeight: '700',
                            fontSize: '14px'
                        }}
                    >
                        Botón de Acción
                    </button>
                </div>
            </section>

            {/* Sección 7: Redes Sociales */}
            <section style={{
                backgroundColor: 'var(--bg-card)',
                borderRadius: '16px',
                padding: '24px',
                marginBottom: '20px',
                border: '1px solid var(--border)'
            }}>
                <h3 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '20px', color: 'var(--text-primary)' }}>
                    📱 Redes Sociales (Opcional)
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                            Instagram
                        </label>
                        <input
                            type="text"
                            value={formData.instagram || ''}
                            onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                            placeholder="@usuario"
                            style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-main)', color: 'var(--text-primary)', fontSize: '14px' }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                            Facebook
                        </label>
                        <input
                            type="text"
                            value={formData.facebook || ''}
                            onChange={(e) => setFormData({ ...formData, facebook: e.target.value })}
                            placeholder="URL de Facebook"
                            style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-main)', color: 'var(--text-primary)', fontSize: '14px' }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                            WhatsApp
                        </label>
                        <input
                            type="text"
                            value={formData.whatsapp || ''}
                            onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                            placeholder="Número con código de país"
                            style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-main)', color: 'var(--text-primary)', fontSize: '14px' }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                            TikTok
                        </label>
                        <input
                            type="text"
                            value={formData.tiktok || ''}
                            onChange={(e) => setFormData({ ...formData, tiktok: e.target.value })}
                            placeholder="@usuario"
                            style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-main)', color: 'var(--text-primary)', fontSize: '14px' }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                            Sitio Web
                        </label>
                        <input
                            type="url"
                            value={formData.website || ''}
                            onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                            placeholder="https://ejemplo.com"
                            style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-main)', color: 'var(--text-primary)', fontSize: '14px' }}
                        />
                    </div>
                </div>
            </section>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                    type="button"
                    onClick={onCancel}
                    style={{
                        padding: '12px 24px',
                        borderRadius: '12px',
                        border: '1px solid var(--border)',
                        backgroundColor: 'transparent',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                        fontWeight: '600'
                    }}
                >
                    Cancelar
                </button>
                <button
                    type="submit"
                    style={{
                        padding: '12px 32px',
                        borderRadius: '12px',
                        backgroundColor: 'var(--primary-paddle)',
                        color: '#fff',
                        border: 'none',
                        cursor: 'pointer',
                        fontWeight: '700',
                        fontSize: '15px'
                    }}
                >
                    {business ? 'Actualizar' : 'Crear'} Negocio
                </button>
            </div>
        </form>
    );
}
