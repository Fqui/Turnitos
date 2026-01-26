import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import supabaseService from '../../services/supabaseService';
import { generateBusinessCredentials, validateSubscriptionLimit, slugify } from '../../utils/businessUtils';
import { resizeImage, validateImageFile } from '../../utils/imageUtils';
import CostBreakdown from '../CostBreakdown';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const SUGGESTED_COLORS = ['#2196F3', '#9C27B0', '#E91E63', '#FF9800', '#00BCD4', '#4CAF50'];

function LocationPicker({ position, onLocationChange }) {
    function LocationMarker() {
        useMapEvents({ click(e) { onLocationChange(e.latlng); } });
        return position ? <Marker position={position} /> : null;
    }
    return (
        <MapContainer center={position || [-29.4135, -66.8558]} zoom={13} style={{ height: '300px', width: '100%', borderRadius: '12px' }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <LocationMarker />
        </MapContainer>
    );
}

export default function ServiciosForm({ business, onSave, onCancel }) {
    const [categories, setCategories] = useState([]);
    const [subcategories, setSubcategories] = useState([]);
    const [subscriptionPlans, setSubscriptionPlans] = useState([]);
    const [loading, setLoading] = useState(true);

    const defaultHours = {
        monday: { open: '09:00', close: '19:00', isOpen: true, isSplit: false, open2: '16:00', close2: '20:00' },
        tuesday: { open: '09:00', close: '19:00', isOpen: true, isSplit: false, open2: '16:00', close2: '20:00' },
        wednesday: { open: '09:00', close: '19:00', isOpen: true, isSplit: false, open2: '16:00', close2: '20:00' },
        thursday: { open: '09:00', close: '19:00', isOpen: true, isSplit: false, open2: '16:00', close2: '20:00' },
        friday: { open: '09:00', close: '19:00', isOpen: true, isSplit: false, open2: '16:00', close2: '20:00' },
        saturday: { open: '09:00', close: '14:00', isOpen: true, isSplit: false, open2: '16:00', close2: '20:00' },
        sunday: { open: '', close: '', isOpen: false, isSplit: false, open2: '16:00', close2: '20:00' }
    };

    const [formData, setFormData] = useState(() => {
        if (!business) {
            return {
                name: '', category_id: '', subcategories: [], type: 'service', location: '',
                latitude: -29.4135, longitude: -66.8558, logo: '', banner_image: '',
                hours: defaultHours, theme: 'light', primaryColor: '#2196F3',
                subscription_plan_id: '', amenities: [], services: [], specialists: [],
                service_categories: [], instagram: '', facebook: '', whatsapp: '', tiktok: '', website: ''
            };
        }
        return {
            ...business, hours: business.hours || defaultHours, primaryColor: business.primary_color || '#2196F3',
            amenities: business.amenities || [], services: business.services || [],
            specialists: business.specialists || [], service_categories: business.service_categories || [],
            category_id: business.category_id || business.categories?.id || '',
            subcategories: business.subcategories?.map(s => s.id) || []
        };
    });

    const [newService, setNewService] = useState({ name: '', description: '', price: '', duration: '', image_url: '', category: '' });
    const [newSpecialist, setNewSpecialist] = useState({ name: '', role: '', image_url: '' });
    const [newServiceCategory, setNewServiceCategory] = useState('');
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const [uploadingBanner, setUploadingBanner] = useState(false);
    const [uploadingServiceImage, setUploadingServiceImage] = useState(false);
    const [uploadingSpecialistImage, setUploadingSpecialistImage] = useState(false);
    const [costBreakdown, setCostBreakdown] = useState(null);

    useEffect(() => { fetchData(); }, []);
    useEffect(() => { if (formData.category_id) fetchSubcategories(formData.category_id); }, [formData.category_id]);

    const fetchData = async () => {
        try {
            const [cats, plans] = await Promise.all([supabaseService.getCategories('service'), supabaseService.getSubscriptionPlans('service')]);
            setCategories(cats); setSubscriptionPlans(plans);
        } catch (error) {
            console.error('Error fetching data:', error);
            alert('Error al cargar datos');
        } finally {
            setLoading(false);
        }
    };

    // Filtrar planes base (is_per_unit = false) y obtener plan por unidad
    const basePlans = subscriptionPlans.filter(p => !p.is_per_unit);
    const perUnitPlan = subscriptionPlans.find(p => p.is_per_unit && p.business_type === 'service');

    // Calcular costos cuando cambia el plan o la cantidad de especialistas
    useEffect(() => {
        if (formData.subscription_plan_id && perUnitPlan) {
            const selectedPlan = basePlans.find(p => p.id === formData.subscription_plan_id);
            if (selectedPlan) {
                const includedSpaces = selectedPlan.spaces_included;
                const totalSpaces = formData.specialists.length;
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
    }, [formData.subscription_plan_id, formData.specialists.length, subscriptionPlans]);

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
        const setters = { logo: setUploadingLogo, banner: setUploadingBanner, service: setUploadingServiceImage, specialist: setUploadingSpecialistImage };
        setters[type](true);
        try {
            // Validate image file
            const validation = validateImageFile(file);
            if (!validation.valid) {
                alert(validation.error);
                setters[type](false);
                return;
            }

            let fileToUpload = file;

            // Resize logo and banner images
            if (type === 'logo' || type === 'banner') {
                const imageType = type === 'logo' ? 'logo' : 'banner';
                fileToUpload = await resizeImage(file, imageType);
            }

            const imageUrl = await supabaseService.uploadImage(fileToUpload, 'businesses');
            if (type === 'service') setNewService(prev => ({ ...prev, image_url: imageUrl }));
            else if (type === 'specialist') setNewSpecialist(prev => ({ ...prev, image_url: imageUrl }));
            else setFormData(prev => ({ ...prev, [type === 'logo' ? 'logo' : 'banner_image']: imageUrl }));
        } catch (error) {
            console.error('Error uploading image:', error);
            alert('Error al subir imagen: ' + error.message);
        } finally {
            setters[type](false);
        }
    };

    const handleAddServiceCategory = () => {
        if (!newServiceCategory.trim() || formData.service_categories.includes(newServiceCategory.trim())) return;
        setFormData(prev => ({ ...prev, service_categories: [...prev.service_categories, newServiceCategory.trim()] }));
        setNewServiceCategory('');
    };

    const handleAddService = () => {
        if (!newService.name || !newService.price || !newService.duration) {
            alert('Completa nombre, precio y duración del servicio');
            return;
        }
        setFormData(prev => ({ ...prev, services: [...prev.services, { ...newService, id: Date.now().toString() }] }));
        setNewService({ name: '', description: '', price: '', duration: '', image_url: '', category: '' });
    };

    const handleAddSpecialist = () => {
        if (!newSpecialist.name || !newSpecialist.role) {
            alert('Completa nombre y rol del especialista');
            return;
        }

        // Add specialist without subscription limit validation
        setFormData(prev => ({ ...prev, specialists: [...prev.specialists, { ...newSpecialist, id: Date.now().toString() }] }));
        setNewSpecialist({ name: '', role: '', image_url: '' });
    };

    const handleHourChange = (day, field, value) => {
        setFormData(prev => ({ ...prev, hours: { ...prev.hours, [day]: { ...prev.hours[day], [field]: value } } }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name || !formData.category_id || !formData.subscription_plan_id || formData.subcategories.length === 0) {
            alert('Completa todos los campos obligatorios (nombre, categoría, plan y al menos una subcategoría)');
            return;
        }
        try {
            const credentials = generateBusinessCredentials(formData.name);
            const businessData = { ...formData, email: credentials.email, password: credentials.password, slug: slugify(formData.name), primary_color: formData.primaryColor };
            await onSave(businessData);
        } catch (error) {
            console.error('Error saving business:', error);
            alert('Error al guardar negocio: ' + error.message);
        }
    };

    if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Cargando...</div>;

    const selectedPlan = subscriptionPlans.find(p => p.id === formData.subscription_plan_id);
    const specialistsValidation = selectedPlan ? validateSubscriptionLimit(formData.specialists.length, selectedPlan.spaces_included, 'especialistas') : null;
    const dayNames = { monday: 'Lunes', tuesday: 'Martes', wednesday: 'Miércoles', thursday: 'Jueves', friday: 'Viernes', saturday: 'Sábado', sunday: 'Domingo' };

    const sectionStyle = { backgroundColor: 'var(--bg-card)', borderRadius: '16px', padding: '24px', marginBottom: '20px', border: '1px solid var(--border)' };
    const inputStyle = { width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-main)', color: 'var(--text-primary)', fontSize: '14px' };

    return (
        <form onSubmit={handleSubmit} style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h2 style={{ fontSize: '28px', fontWeight: '900', marginBottom: '4px', color: 'var(--text-primary)' }}>
                        {business ? 'Editar' : 'Nuevo'} Negocio de Servicios
                    </h2>
                    <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Completa la información del negocio de servicios</p>
                </div>
                <button type="button" onClick={onCancel} style={{ padding: '10px 20px', borderRadius: '10px', border: '1px solid var(--border)', backgroundColor: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: '600' }}>← Volver</button>
            </div>

            {/* Información Básica */}
            <section style={sectionStyle}>
                <h3 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '20px', color: 'var(--text-primary)' }}>📋 Información Básica</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
                    <div><label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)' }}>Nombre del Negocio *</label>
                        <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Ej: Salón de Belleza Elegance" style={inputStyle} /></div>

                    <div><label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)' }}>Categoría * (Salud, Belleza, Mascotas)</label>
                        <select required value={formData.category_id} onChange={(e) => { setFormData({ ...formData, category_id: e.target.value, subcategories: [] }); fetchSubcategories(e.target.value); }} style={inputStyle}>
                            <option value="">Seleccionar categoría</option>
                            {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>)}
                        </select></div>

                    <div style={{ gridColumn: '1 / -1' }}><label style={{ display: 'block', marginBottom: '12px', fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)' }}>Subcategorías * (selecciona todas las que apliquen)</label>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px', padding: '12px', backgroundColor: 'var(--bg-main)', borderRadius: '10px', opacity: !formData.category_id ? 0.5 : 1 }}>
                            {subcategories.length > 0 ? subcategories.map(sub => (
                                <label key={sub.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: formData.category_id ? 'pointer' : 'not-allowed' }}>
                                    <input type="checkbox" disabled={!formData.category_id} checked={formData.subcategories.includes(sub.id)} onChange={(e) => { if (e.target.checked) { setFormData({ ...formData, subcategories: [...formData.subcategories, sub.id] }); } else { setFormData({ ...formData, subcategories: formData.subcategories.filter(id => id !== sub.id) }); } }} style={{ width: '18px', height: '18px', cursor: formData.category_id ? 'pointer' : 'not-allowed' }} />
                                    <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>{sub.icon} {sub.name}</span>
                                </label>
                            )) : <p style={{ fontSize: '13px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>Selecciona una categoría primero</p>}
                        </div>
                        {formData.subcategories.length > 0 && (<p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '8px' }}>{formData.subcategories.length} subcategoría{formData.subcategories.length > 1 ? 's' : ''} seleccionada{formData.subcategories.length > 1 ? 's' : ''}</p>)}
                    </div>

                    <div><label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)' }}>Plan de Suscripción *</label>
                        <select required value={formData.subscription_plan_id} onChange={(e) => setFormData({ ...formData, subscription_plan_id: e.target.value })} style={inputStyle}>
                            <option value="">Seleccionar plan</option>
                            {basePlans.map(plan => <option key={plan.id} value={plan.id}>{plan.name} - {plan.spaces_included} {plan.spaces_included === 1 ? 'especialista' : 'especialistas'}</option>)}
                        </select></div>
                </div>
                <div style={{ marginTop: '16px' }}><label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)' }}>Dirección *</label>
                    <input type="text" required value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} placeholder="Ej: Av. Principal 123, La Rioja" style={inputStyle} /></div>
                <div style={{ marginTop: '16px' }}><label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)' }}>Ubicación en Mapa *</label>
                    <LocationPicker position={formData.latitude && formData.longitude ? [formData.latitude, formData.longitude] : null} onLocationChange={(latlng) => setFormData({ ...formData, latitude: latlng.lat, longitude: latlng.lng })} />
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '8px' }}>Haz clic en el mapa para seleccionar la ubicación exacta</p></div>
                {formData.name && <div style={{ marginTop: '16px', padding: '12px', backgroundColor: 'var(--bg-main)', borderRadius: '10px' }}>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}><strong>Email (auto-generado):</strong> {generateBusinessCredentials(formData.name).email}</p>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}><strong>Contraseña:</strong> admin123</p>
                </div>}
            </section>

            {/* Multimedia */}
            <section style={sectionStyle}>
                <h3 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '20px', color: 'var(--text-primary)' }}>🖼️ Multimedia</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                    <div><label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)' }}>Logo *</label>
                        {formData.logo && <img src={formData.logo} alt="Logo" style={{ width: '100%', maxHeight: '200px', objectFit: 'contain', borderRadius: '12px', marginBottom: '12px', backgroundColor: 'var(--bg-main)' }} />}
                        <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e.target.files[0], 'logo')} disabled={uploadingLogo} style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-main)', color: 'var(--text-primary)' }} />
                        {uploadingLogo && <p style={{ fontSize: '12px', color: 'var(--primary-paddle)', marginTop: '8px' }}>Subiendo...</p>}</div>
                    <div><label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)' }}>Banner/Fachada *</label>
                        {formData.banner_image && <img src={formData.banner_image} alt="Banner" style={{ width: '100%', maxHeight: '200px', objectFit: 'cover', borderRadius: '12px', marginBottom: '12px' }} />}
                        <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e.target.files[0], 'banner')} disabled={uploadingBanner} style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-main)', color: 'var(--text-primary)' }} />
                        {uploadingBanner && <p style={{ fontSize: '12px', color: 'var(--primary-paddle)', marginTop: '8px' }}>Subiendo...</p>}</div>
                </div>
            </section>

            {/* Horarios */}
            <section style={sectionStyle}>
                <h3 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '20px', color: 'var(--text-primary)' }}>🕐 Horarios de Atención</h3>
                <div style={{ display: 'grid', gap: '12px' }}>
                    {Object.entries(formData.hours).map(([day, schedule]) => (
                        <div key={day} style={{ padding: '16px', backgroundColor: 'var(--bg-main)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: schedule.isOpen ? '12px' : '0' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '120px' }}>
                                    <input type="checkbox" checked={schedule.isOpen} onChange={(e) => handleHourChange(day, 'isOpen', e.target.checked)} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
                                    <span style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>{dayNames[day]}</span>
                                </label>
                                {schedule.isOpen && (
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
                                        <input type="checkbox" checked={schedule.isSplit || false} onChange={(e) => handleHourChange(day, 'isSplit', e.target.checked)} style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
                                        <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)' }}>Horario Cortado</span>
                                    </label>
                                )}
                                {!schedule.isOpen && <span style={{ fontSize: '14px', color: 'var(--text-secondary)', fontStyle: 'italic', marginLeft: 'auto' }}>Cerrado</span>}
                            </div>
                            {schedule.isOpen && !schedule.isSplit && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingLeft: '28px' }}>
                                    <input type="time" value={schedule.open} onChange={(e) => handleHourChange(day, 'open', e.target.value)} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '14px', fontWeight: '600' }} />
                                    <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>a</span>
                                    <input type="time" value={schedule.close} onChange={(e) => handleHourChange(day, 'close', e.target.value)} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '14px', fontWeight: '600' }} />
                                </div>
                            )}
                            {schedule.isOpen && schedule.isSplit && (
                                <div style={{ display: 'grid', gap: '12px', paddingLeft: '28px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', minWidth: '100px' }}>Turno mañana:</span>
                                        <input type="time" value={schedule.open} onChange={(e) => handleHourChange(day, 'open', e.target.value)} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '14px', fontWeight: '600' }} />
                                        <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>a</span>
                                        <input type="time" value={schedule.close} onChange={(e) => handleHourChange(day, 'close', e.target.value)} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '14px', fontWeight: '600' }} />
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', minWidth: '100px' }}>Turno tarde:</span>
                                        <input type="time" value={schedule.open2 || '16:00'} onChange={(e) => handleHourChange(day, 'open2', e.target.value)} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '14px', fontWeight: '600' }} />
                                        <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>a</span>
                                        <input type="time" value={schedule.close2 || '20:00'} onChange={(e) => handleHourChange(day, 'close2', e.target.value)} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '14px', fontWeight: '600' }} />
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </section>

            {/* Categorías de Servicios */}
            <section style={sectionStyle}>
                <h3 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '20px', color: 'var(--text-primary)' }}>📂 Categorías de Servicios (Opcional)</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>Crea categorías personalizadas para agrupar tus servicios (ej: "Cortes", "Coloración")</p>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                    <input type="text" placeholder="Nombre de la categoría" value={newServiceCategory} onChange={(e) => setNewServiceCategory(e.target.value)} onKeyPress={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddServiceCategory(); } }} style={{ flex: 1, ...inputStyle }} />
                    <button type="button" onClick={handleAddServiceCategory} style={{ padding: '12px 20px', borderRadius: '10px', backgroundColor: 'var(--primary-paddle)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: '700', fontSize: '14px' }}>+ Agregar</button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {formData.service_categories.map((category, index) => (
                        <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', backgroundColor: 'var(--primary-paddle)20', borderRadius: '20px', border: '1px solid var(--primary-paddle)' }}>
                            <span style={{ fontSize: '14px', color: 'var(--text-primary)', fontWeight: '600' }}>{category}</span>
                            <button type="button" onClick={() => setFormData(prev => ({ ...prev, service_categories: prev.service_categories.filter(c => c !== category), services: prev.services.map(s => s.category === category ? { ...s, category: '' } : s) }))} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '16px', padding: '0', lineHeight: '1' }}>×</button>
                        </div>
                    ))}
                </div>
            </section>

            {/* Servicios */}
            <section style={sectionStyle}>
                <h3 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '20px', color: 'var(--text-primary)' }}>💼 Servicios</h3>
                <div style={{ display: 'grid', gap: '12px', marginBottom: '16px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '12px' }}>
                        <input type="text" placeholder="Nombre del servicio *" value={newService.name} onChange={(e) => setNewService({ ...newService, name: e.target.value })} style={inputStyle} />
                        <input type="number" placeholder="Precio *" value={newService.price} onChange={(e) => setNewService({ ...newService, price: e.target.value })} style={inputStyle} />
                        <input type="number" placeholder="Duración (min) *" value={newService.duration} onChange={(e) => setNewService({ ...newService, duration: e.target.value })} style={inputStyle} />
                    </div>
                    <textarea placeholder="Descripción (opcional)" value={newService.description} onChange={(e) => setNewService({ ...newService, description: e.target.value })} rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <select value={newService.category} onChange={(e) => setNewService({ ...newService, category: e.target.value })} style={inputStyle}>
                            <option value="">Sin categoría</option>
                            {formData.service_categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                        <div><input type="file" accept="image/*" onChange={(e) => handleImageUpload(e.target.files[0], 'service')} disabled={uploadingServiceImage} style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-main)', color: 'var(--text-primary)', fontSize: '13px' }} />
                            {uploadingServiceImage && <p style={{ fontSize: '11px', color: 'var(--primary-paddle)', marginTop: '4px' }}>Subiendo imagen...</p>}</div>
                    </div>
                    {newService.image_url && <img src={newService.image_url} alt="Preview" style={{ width: '150px', height: '100px', objectFit: 'cover', borderRadius: '8px' }} />}
                    <button type="button" onClick={handleAddService} style={{ padding: '12px 20px', borderRadius: '10px', backgroundColor: 'var(--primary-paddle)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: '700', fontSize: '14px' }}>+ Agregar Servicio</button>
                </div>
                <div style={{ display: 'grid', gap: '12px' }}>
                    {formData.services.map((service, index) => (
                        <div key={index} style={{ display: 'flex', gap: '12px', alignItems: 'center', padding: '12px', backgroundColor: 'var(--bg-main)', borderRadius: '10px' }}>
                            {service.image_url && <img src={service.image_url} alt={service.name} style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '8px' }} />}
                            <div style={{ flex: 1 }}>
                                <p style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' }}>{service.name} {service.category && <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>({service.category})</span>}</p>
                                {service.description && <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>{service.description}</p>}
                                <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>${service.price} - {service.duration} min</p>
                            </div>
                            <button type="button" onClick={() => setFormData(prev => ({ ...prev, services: prev.services.filter((_, i) => i !== index) }))} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #FF4444', backgroundColor: '#FF444410', color: '#FF4444', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}>🗑️</button>
                        </div>
                    ))}
                </div>
                {formData.services.length === 0 && <p style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)', fontSize: '14px' }}>No hay servicios agregados aún</p>}
            </section>

            {/* Especialistas */}
            <section style={sectionStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h3 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>👥 Especialistas</h3>
                    {specialistsValidation && <span style={{ fontSize: '13px', color: specialistsValidation.isValid ? 'var(--text-secondary)' : '#FF4444', fontWeight: '600' }}>{specialistsValidation.message}</span>}
                </div>
                <div style={{ display: 'grid', gap: '12px', marginBottom: '16px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
                        <input type="text" placeholder="Nombre del especialista *" value={newSpecialist.name} onChange={(e) => setNewSpecialist({ ...newSpecialist, name: e.target.value })} style={inputStyle} />
                        <input type="text" placeholder="Rol *" value={newSpecialist.role} onChange={(e) => setNewSpecialist({ ...newSpecialist, role: e.target.value })} style={inputStyle} />
                    </div>
                    <div><input type="file" accept="image/*" onChange={(e) => handleImageUpload(e.target.files[0], 'specialist')} disabled={uploadingSpecialistImage} style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-main)', color: 'var(--text-primary)' }} />
                        {uploadingSpecialistImage && <p style={{ fontSize: '12px', color: 'var(--primary-paddle)', marginTop: '8px' }}>Subiendo...</p>}</div>
                    {newSpecialist.image_url && <img src={newSpecialist.image_url} alt="Preview" style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '50%' }} />}
                    <button type="button" onClick={handleAddSpecialist} style={{ padding: '12px 20px', borderRadius: '10px', backgroundColor: 'var(--primary-paddle)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: '700', fontSize: '14px' }}>+ Agregar Especialista</button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
                    {formData.specialists.map((specialist, index) => (
                        <div key={index} style={{ padding: '16px', backgroundColor: 'var(--bg-main)', borderRadius: '12px', textAlign: 'center' }}>
                            {specialist.image_url && <img src={specialist.image_url} alt={specialist.name} style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '50%', marginBottom: '12px' }} />}
                            <p style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' }}>{specialist.name}</p>
                            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px' }}>{specialist.role}</p>
                            <button type="button" onClick={() => setFormData(prev => ({ ...prev, specialists: prev.specialists.filter((_, i) => i !== index) }))} style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #FF4444', backgroundColor: '#FF444410', color: '#FF4444', cursor: 'pointer', fontWeight: '600', fontSize: '12px' }}>Eliminar</button>
                        </div>
                    ))}
                </div>
                {formData.specialists.length === 0 && <p style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)', fontSize: '14px' }}>No hay especialistas agregados aún</p>}
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
                    spaceType="especialistas"
                />
            )}

            {/* Comodidades */}
            <section style={sectionStyle}>
                <h3 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '20px', color: 'var(--text-primary)' }}>✨ Comodidades</h3>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                    <input type="text" placeholder="Ej: Wifi, Aire Acondicionado..." onKeyPress={(e) => { if (e.key === 'Enter') { e.preventDefault(); const value = e.target.value.trim(); if (value && !formData.amenities.includes(value)) { setFormData({ ...formData, amenities: [...formData.amenities, value] }); e.target.value = ''; } } }} style={{ flex: 1, ...inputStyle }} />
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {formData.amenities.map((amenity, index) => (
                        <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', backgroundColor: 'var(--primary-paddle)20', borderRadius: '20px', border: '1px solid var(--primary-paddle)' }}>
                            <span style={{ fontSize: '14px', color: 'var(--text-primary)', fontWeight: '600' }}>{amenity}</span>
                            <button type="button" onClick={() => setFormData({ ...formData, amenities: formData.amenities.filter((_, i) => i !== index) })} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '16px', padding: '0', lineHeight: '1' }}>×</button>
                        </div>
                    ))}
                </div>
                {formData.amenities.length === 0 && <p style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)', fontSize: '14px' }}>Presiona Enter para agregar comodidades</p>}
            </section>

            {/* Tema y Apariencia */}
            <section style={sectionStyle}>
                <h3 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '20px', color: 'var(--text-primary)' }}>🎨 Tema y Apariencia</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '20px' }}>
                    <div><label style={{ display: 'block', marginBottom: '12px', fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)' }}>Tema del Perfil</label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <button type="button" onClick={() => setFormData({ ...formData, theme: 'light' })} style={{ padding: '16px', borderRadius: '12px', border: `2px solid ${formData.theme === 'light' ? 'var(--primary-paddle)' : 'var(--border)'}`, backgroundColor: formData.theme === 'light' ? 'var(--primary-paddle)10' : 'var(--bg-main)', cursor: 'pointer', textAlign: 'center' }}>
                                <div style={{ fontSize: '32px', marginBottom: '8px' }}>☀️</div><div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>Claro</div></button>
                            <button type="button" onClick={() => setFormData({ ...formData, theme: 'dark' })} style={{ padding: '16px', borderRadius: '12px', border: `2px solid ${formData.theme === 'dark' ? 'var(--primary-paddle)' : 'var(--border)'}`, backgroundColor: formData.theme === 'dark' ? 'var(--primary-paddle)10' : 'var(--bg-main)', cursor: 'pointer', textAlign: 'center' }}>
                                <div style={{ fontSize: '32px', marginBottom: '8px' }}>🌙</div><div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>Oscuro</div></button>
                        </div></div>
                    <div><label style={{ display: 'block', marginBottom: '12px', fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)' }}>Color Primario</label>
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                            {SUGGESTED_COLORS.map(color => <button key={color} type="button" onClick={() => setFormData({ ...formData, primaryColor: color })} style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: color, border: formData.primaryColor === color ? '3px solid var(--text-primary)' : '2px solid var(--border)', cursor: 'pointer' }} />)}
                        </div>
                        <input type="color" value={formData.primaryColor} onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })} style={{ width: '100%', height: '44px', borderRadius: '10px', border: '1px solid var(--border)', cursor: 'pointer' }} /></div>
                </div>
                <div style={{ padding: '16px', backgroundColor: 'var(--bg-main)', borderRadius: '12px' }}>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px' }}>Vista Previa:</p>
                    <button type="button" style={{ padding: '12px 24px', borderRadius: '12px', backgroundColor: formData.primaryColor, color: '#fff', border: 'none', fontWeight: '700', fontSize: '14px' }}>Botón de Acción</button>
                </div>
            </section>

            {/* Redes Sociales */}
            <section style={sectionStyle}>
                <h3 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '20px', color: 'var(--text-primary)' }}>📱 Redes Sociales (Opcional)</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
                    <div><label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)' }}>Instagram</label>
                        <input type="text" value={formData.instagram || ''} onChange={(e) => setFormData({ ...formData, instagram: e.target.value })} placeholder="@usuario" style={inputStyle} /></div>
                    <div><label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)' }}>Facebook</label>
                        <input type="text" value={formData.facebook || ''} onChange={(e) => setFormData({ ...formData, facebook: e.target.value })} placeholder="URL de Facebook" style={inputStyle} /></div>
                    <div><label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)' }}>WhatsApp</label>
                        <input type="text" value={formData.whatsapp || ''} onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })} placeholder="Número con código de país" style={inputStyle} /></div>
                    <div><label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)' }}>TikTok</label>
                        <input type="text" value={formData.tiktok || ''} onChange={(e) => setFormData({ ...formData, tiktok: e.target.value })} placeholder="@usuario" style={inputStyle} /></div>
                    <div><label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)' }}>Sitio Web</label>
                        <input type="url" value={formData.website || ''} onChange={(e) => setFormData({ ...formData, website: e.target.value })} placeholder="https://ejemplo.com" style={inputStyle} /></div>
                </div>
            </section>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={onCancel} style={{ padding: '12px 24px', borderRadius: '12px', border: '1px solid var(--border)', backgroundColor: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: '600' }}>Cancelar</button>
                <button type="submit" style={{ padding: '12px 32px', borderRadius: '12px', backgroundColor: 'var(--primary-paddle)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: '700', fontSize: '15px' }}>{business ? 'Actualizar' : 'Crear'} Negocio</button>
            </div>
        </form>
    );
}
