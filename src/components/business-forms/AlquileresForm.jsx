import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import supabaseService from '../../services/supabaseService';
import { generateBusinessCredentials, slugify } from '../../utils/businessUtils';
import { resizeImage, validateImageFile } from '../../utils/imageUtils';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const SUGGESTED_COLORS = ['#FF5722', '#FF9800', '#FFC107', '#4CAF50', '#00BCD4', '#9C27B0'];

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

export default function AlquileresForm({ business, onSave, onCancel }) {
    const [categories, setCategories] = useState([]);
    const [subcategories, setSubcategories] = useState([]);
    const [subscriptionPlans, setSubscriptionPlans] = useState([]);
    const [loading, setLoading] = useState(true);

    const defaultHours = {
        monday: { open: '08:00', close: '23:00', isOpen: true, isSplit: false, open2: '18:00', close2: '23:00' },
        tuesday: { open: '08:00', close: '23:00', isOpen: true, isSplit: false, open2: '18:00', close2: '23:00' },
        wednesday: { open: '08:00', close: '23:00', isOpen: true, isSplit: false, open2: '18:00', close2: '23:00' },
        thursday: { open: '08:00', close: '23:00', isOpen: true, isSplit: false, open2: '18:00', close2: '23:00' },
        friday: { open: '08:00', close: '23:00', isOpen: true, isSplit: false, open2: '18:00', close2: '23:00' },
        saturday: { open: '08:00', close: '23:00', isOpen: true, isSplit: false, open2: '18:00', close2: '23:00' },
        sunday: { open: '08:00', close: '23:00', isOpen: true, isSplit: false, open2: '18:00', close2: '23:00' }
    };

    const [formData, setFormData] = useState(() => {
        if (!business) {
            return {
                name: '', category_id: '', subcategory_id: '', type: 'alquiler', location: '',
                latitude: -29.4135, longitude: -66.8558, logo: '', banner_image: '',
                hours: defaultHours, theme: 'light', primaryColor: '#FF5722',
                subscription_plan_id: '', amenities: [], gallery_images: [],
                price_per_hour: '', rental_duration_options: ['4', '6', '8', '12', '24'],
                additional_services: [], included_amenities: [],
                instagram: '', facebook: '', whatsapp: '', tiktok: '', website: ''
            };
        }
        return {
            ...business, hours: business.hours || defaultHours, primaryColor: business.primary_color || '#FF5722',
            amenities: business.amenities || [], gallery_images: business.gallery_images || [],
            rental_duration_options: business.rental_duration_options || ['4', '6', '8', '12', '24'],
            additional_services: business.additional_services || [], included_amenities: business.included_amenities || []
        };
    });

    const [newAdditionalService, setNewAdditionalService] = useState({ name: '', price: '' });
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const [uploadingBanner, setUploadingBanner] = useState(false);
    const [uploadingGallery, setUploadingGallery] = useState(false);

    useEffect(() => { fetchData(); }, []);
    useEffect(() => { if (formData.category_id) fetchSubcategories(formData.category_id); }, [formData.category_id]);

    const fetchData = async () => {
        try {
            const [cats, plans] = await Promise.all([supabaseService.getCategories('alquiler'), supabaseService.getSubscriptionPlans('alquiler')]);
            setCategories(cats); setSubscriptionPlans(plans);
        } catch (error) {
            console.error('Error fetching data:', error);
            alert('Error al cargar datos');
        } finally {
            setLoading(false);
        }
    };

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
        const setters = { logo: setUploadingLogo, banner: setUploadingBanner, gallery: setUploadingGallery };
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
            if (type === 'gallery') {
                setFormData(prev => ({ ...prev, gallery_images: [...prev.gallery_images, imageUrl] }));
            } else {
                setFormData(prev => ({ ...prev, [type === 'logo' ? 'logo' : 'banner_image']: imageUrl }));
            }
        } catch (error) {
            console.error('Error uploading image:', error);
            alert('Error al subir imagen: ' + error.message);
        } finally {
            setters[type](false);
        }
    };

    const handleAddAdditionalService = () => {
        if (!newAdditionalService.name || !newAdditionalService.price) {
            alert('Completa nombre y precio del servicio adicional');
            return;
        }
        setFormData(prev => ({ ...prev, additional_services: [...prev.additional_services, { ...newAdditionalService, id: Date.now().toString() }] }));
        setNewAdditionalService({ name: '', price: '' });
    };

    const handleDurationToggle = (duration) => {
        setFormData(prev => ({
            ...prev,
            rental_duration_options: prev.rental_duration_options.includes(duration)
                ? prev.rental_duration_options.filter(d => d !== duration)
                : [...prev.rental_duration_options, duration].sort((a, b) => parseInt(a) - parseInt(b))
        }));
    };

    const handleHourChange = (day, field, value) => {
        setFormData(prev => ({ ...prev, hours: { ...prev.hours, [day]: { ...prev.hours[day], [field]: value } } }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name || !formData.category_id || !formData.subcategory_id || !formData.subscription_plan_id || !formData.price_per_hour) {
            alert('Completa todos los campos obligatorios');
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

    const dayNames = { monday: 'Lunes', tuesday: 'Martes', wednesday: 'Miércoles', thursday: 'Jueves', friday: 'Viernes', saturday: 'Sábado', sunday: 'Domingo' };
    const sectionStyle = { backgroundColor: 'var(--bg-card)', borderRadius: '16px', padding: '24px', marginBottom: '20px', border: '1px solid var(--border)' };
    const inputStyle = { width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-main)', color: 'var(--text-primary)', fontSize: '14px' };

    return (
        <form onSubmit={handleSubmit} style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h2 style={{ fontSize: '28px', fontWeight: '900', marginBottom: '4px', color: 'var(--text-primary)' }}>
                        {business ? 'Editar' : 'Nuevo'} Espacio de Alquiler
                    </h2>
                    <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Completa la información del espacio de alquiler</p>
                </div>
                <button type="button" onClick={onCancel} style={{ padding: '10px 20px', borderRadius: '10px', border: '1px solid var(--border)', backgroundColor: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: '600' }}>← Volver</button>
            </div>

            {/* Información Básica */}
            <section style={sectionStyle}>
                <h3 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '20px', color: 'var(--text-primary)' }}>📋 Información Básica</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
                    <div><label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)' }}>Nombre del Espacio *</label>
                        <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Ej: Quincho Los Aromos" style={inputStyle} /></div>
                    <div><label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)' }}>Categoría *</label>
                        <select required value={formData.category_id} onChange={(e) => setFormData({ ...formData, category_id: e.target.value, subcategory_id: '' })} style={inputStyle}>
                            <option value="">Seleccionar categoría</option>
                            {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>)}
                        </select></div>
                    <div><label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)' }}>Subcategoría *</label>
                        <select required value={formData.subcategory_id} onChange={(e) => setFormData({ ...formData, subcategory_id: e.target.value })} disabled={!formData.category_id} style={{ ...inputStyle, opacity: !formData.category_id ? 0.5 : 1 }}>
                            <option value="">Seleccionar subcategoría</option>
                            {subcategories.map(sub => <option key={sub.id} value={sub.id}>{sub.icon} {sub.name}</option>)}
                        </select></div>
                    <div><label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)' }}>Plan de Suscripción *</label>
                        <select required value={formData.subscription_plan_id} onChange={(e) => setFormData({ ...formData, subscription_plan_id: e.target.value })} style={inputStyle}>
                            <option value="">Seleccionar plan</option>
                            {subscriptionPlans.map(plan => <option key={plan.id} value={plan.id}>{plan.name} - {plan.spaces_included} {plan.spaces_included === 1 ? 'espacio' : 'espacios'}</option>)}
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
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '20px' }}>
                    <div><label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)' }}>Logo *</label>
                        {formData.logo && <img src={formData.logo} alt="Logo" style={{ width: '100%', maxHeight: '200px', objectFit: 'contain', borderRadius: '12px', marginBottom: '12px', backgroundColor: 'var(--bg-main)' }} />}
                        <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e.target.files[0], 'logo')} disabled={uploadingLogo} style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-main)', color: 'var(--text-primary)' }} />
                        {uploadingLogo && <p style={{ fontSize: '12px', color: 'var(--primary-paddle)', marginTop: '8px' }}>Subiendo...</p>}</div>
                    <div><label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)' }}>Banner Principal *</label>
                        {formData.banner_image && <img src={formData.banner_image} alt="Banner" style={{ width: '100%', maxHeight: '200px', objectFit: 'cover', borderRadius: '12px', marginBottom: '12px' }} />}
                        <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e.target.files[0], 'banner')} disabled={uploadingBanner} style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-main)', color: 'var(--text-primary)' }} />
                        {uploadingBanner && <p style={{ fontSize: '12px', color: 'var(--primary-paddle)', marginTop: '8px' }}>Subiendo...</p>}</div>
                </div>
                <div><label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)' }}>Galería de Imágenes</label>
                    <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e.target.files[0], 'gallery')} disabled={uploadingGallery} style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-main)', color: 'var(--text-primary)', marginBottom: '12px' }} />
                    {uploadingGallery && <p style={{ fontSize: '12px', color: 'var(--primary-paddle)', marginBottom: '12px' }}>Subiendo...</p>}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '12px' }}>
                        {formData.gallery_images.map((img, index) => (
                            <div key={index} style={{ position: 'relative' }}>
                                <img src={img} alt={`Gallery ${index + 1}`} style={{ width: '100%', height: '120px', objectFit: 'cover', borderRadius: '8px' }} />
                                <button type="button" onClick={() => setFormData(prev => ({ ...prev, gallery_images: prev.gallery_images.filter((_, i) => i !== index) }))} style={{ position: 'absolute', top: '4px', right: '4px', width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#FF4444', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: '700' }}>×</button>
                            </div>
                        ))}
                    </div>
                    {formData.gallery_images.length === 0 && <p style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)', fontSize: '14px' }}>No hay imágenes en la galería</p>}
                </div>
            </section>

            {/* Horarios */}
            <section style={sectionStyle}>
                <h3 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '20px', color: 'var(--text-primary)' }}>🕐 Horarios de Disponibilidad</h3>
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
                                {!schedule.isOpen && <span style={{ fontSize: '14px', color: 'var(--text-secondary)', fontStyle: 'italic', marginLeft: 'auto' }}>No disponible</span>}
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
                                        <input type="time" value={schedule.open2 || '18:00'} onChange={(e) => handleHourChange(day, 'open2', e.target.value)} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '14px', fontWeight: '600' }} />
                                        <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>a</span>
                                        <input type="time" value={schedule.close2 || '23:00'} onChange={(e) => handleHourChange(day, 'close2', e.target.value)} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '14px', fontWeight: '600' }} />
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </section>

            {/* Configuración de Alquiler */}
            <section style={sectionStyle}>
                <h3 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '20px', color: 'var(--text-primary)' }}>💰 Configuración de Alquiler</h3>
                <div style={{ marginBottom: '20px' }}><label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)' }}>Precio por Hora *</label>
                    <input type="number" required value={formData.price_per_hour} onChange={(e) => setFormData({ ...formData, price_per_hour: e.target.value })} placeholder="Ej: 15000" style={inputStyle} /></div>
                <div><label style={{ display: 'block', marginBottom: '12px', fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)' }}>Opciones de Duración de Alquiler</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                        {['4', '6', '8', '12', '24'].map(duration => (
                            <button key={duration} type="button" onClick={() => handleDurationToggle(duration)} style={{ padding: '12px 24px', borderRadius: '12px', border: `2px solid ${formData.rental_duration_options.includes(duration) ? 'var(--primary-paddle)' : 'var(--border)'}`, backgroundColor: formData.rental_duration_options.includes(duration) ? 'var(--primary-paddle)20' : 'var(--bg-main)', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: '700', fontSize: '14px' }}>
                                {duration}h
                            </button>
                        ))}
                    </div>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '12px' }}>Selecciona las duraciones de alquiler disponibles</p>
                </div>
            </section>

            {/* Servicios Adicionales */}
            <section style={sectionStyle}>
                <h3 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '20px', color: 'var(--text-primary)' }}>➕ Servicios Adicionales (Opcional)</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>Servicios opcionales que el cliente puede agregar al alquiler</p>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr auto', gap: '12px', marginBottom: '16px' }}>
                    <input type="text" placeholder="Nombre del servicio (ej: Parrillero)" value={newAdditionalService.name} onChange={(e) => setNewAdditionalService({ ...newAdditionalService, name: e.target.value })} style={inputStyle} />
                    <input type="number" placeholder="Precio" value={newAdditionalService.price} onChange={(e) => setNewAdditionalService({ ...newAdditionalService, price: e.target.value })} style={inputStyle} />
                    <button type="button" onClick={handleAddAdditionalService} style={{ padding: '12px 20px', borderRadius: '10px', backgroundColor: 'var(--primary-paddle)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: '700', fontSize: '14px' }}>+ Agregar</button>
                </div>
                <div style={{ display: 'grid', gap: '12px' }}>
                    {formData.additional_services.map((service, index) => (
                        <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', backgroundColor: 'var(--bg-main)', borderRadius: '10px' }}>
                            <div><p style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' }}>{service.name}</p>
                                <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>+${service.price}</p></div>
                            <button type="button" onClick={() => setFormData(prev => ({ ...prev, additional_services: prev.additional_services.filter((_, i) => i !== index) }))} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #FF4444', backgroundColor: '#FF444410', color: '#FF4444', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}>🗑️</button>
                        </div>
                    ))}
                </div>
                {formData.additional_services.length === 0 && <p style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)', fontSize: '14px' }}>No hay servicios adicionales agregados</p>}
            </section>

            {/* Comodidades Incluidas */}
            <section style={sectionStyle}>
                <h3 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '20px', color: 'var(--text-primary)' }}>✨ Comodidades Incluidas</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>Comodidades incluidas en el precio base del alquiler</p>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                    <input type="text" placeholder="Ej: Parrilla, Pileta, Wifi, Estacionamiento..." onKeyPress={(e) => { if (e.key === 'Enter') { e.preventDefault(); const value = e.target.value.trim(); if (value && !formData.included_amenities.includes(value)) { setFormData({ ...formData, included_amenities: [...formData.included_amenities, value] }); e.target.value = ''; } } }} style={{ flex: 1, ...inputStyle }} />
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {formData.included_amenities.map((amenity, index) => (
                        <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', backgroundColor: 'var(--primary-paddle)20', borderRadius: '20px', border: '1px solid var(--primary-paddle)' }}>
                            <span style={{ fontSize: '14px', color: 'var(--text-primary)', fontWeight: '600' }}>{amenity}</span>
                            <button type="button" onClick={() => setFormData({ ...formData, included_amenities: formData.included_amenities.filter((_, i) => i !== index) })} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '16px', padding: '0', lineHeight: '1' }}>×</button>
                        </div>
                    ))}
                </div>
                {formData.included_amenities.length === 0 && <p style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)', fontSize: '14px' }}>Presiona Enter para agregar comodidades</p>}
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
                <button type="submit" style={{ padding: '12px 32px', borderRadius: '12px', backgroundColor: 'var(--primary-paddle)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: '700', fontSize: '15px' }}>{business ? 'Actualizar' : 'Crear'} Espacio</button>
            </div>
        </form>
    );
}
