import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import supabaseService from '../../services/supabaseService';

const SellerBusinessForm = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [categories, setCategories] = useState([]);
    const [subcategories, setSubcategories] = useState([]);
    const [error, setError] = useState('');

    const [formData, setFormData] = useState({
        name: '',
        category_id: '',
        subcategory_id: '',
        subscription_plan_id: '',
        type: 'service',
        location: '',
        latitude: null,
        longitude: null,
        phone: '',
        whatsapp: '',
        instagram: '',
        facebook: ''
    });

    useEffect(() => {
        loadInitialData();
        if (id) {
            loadBusinessData();
        }
    }, [id]);

    const loadInitialData = async () => {
        try {
            const categoriesData = await supabaseService.getCategories();
            setCategories(categoriesData);
        } catch (err) {
            console.error('Error loading initial data:', err);
        }
    };

    const loadBusinessData = async () => {
        try {
            const seller = JSON.parse(localStorage.getItem('seller'));
            const businesses = await supabaseService.getSellerBusinesses(seller.id);
            const business = businesses.find(b => b.id === id);

            if (business) {
                setFormData({
                    name: business.name || '',
                    category_id: business.category_id || '',
                    subcategory_id: business.subcategory_id || '',
                    subscription_plan_id: business.subscription_plan_id || '',
                    type: business.type || 'service',
                    location: business.location || '',
                    latitude: business.latitude,
                    longitude: business.longitude,
                    phone: business.phone || '',
                    whatsapp: business.whatsapp || '',
                    instagram: business.instagram || '',
                    facebook: business.facebook || ''
                });
            }
        } catch (err) {
            console.error('Error loading business:', err);
            setError('Error al cargar el negocio');
        }
    };

    useEffect(() => {
        if (formData.category_id) {
            loadSubcategories(formData.category_id);
        }
    }, [formData.category_id]);

    const loadSubcategories = async (categoryId) => {
        try {
            const data = await supabaseService.getSubcategories(categoryId);
            setSubcategories(data);
        } catch (err) {
            console.error('Error loading subcategories:', err);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const seller = JSON.parse(localStorage.getItem('seller'));

            // Auto-assign default subscription plan (trial)
            const dataToSubmit = {
                ...formData
                // subscription_plan_id logic moved to supabaseService to ensure valid UUID
            };

            if (id) {
                // Update existing business
                await supabaseService.updateBusinessBySeller(seller.id, id, dataToSubmit);
            } else {
                // Create new business
                await supabaseService.createBusinessBySeller(seller.id, dataToSubmit);
            }

            navigate('/admin/businesses');
        } catch (err) {
            setError(err.message || 'Error al guardar el negocio');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    return (
        <div style={{
            minHeight: '100vh',
            background: '#0f0f0f',
            color: 'white',
            padding: '24px'
        }}>
            {/* Header */}
            <div style={{ marginBottom: '32px' }}>
                <button
                    onClick={() => navigate('/admin/businesses')}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--primary-paddle)',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '600',
                        marginBottom: '8px'
                    }}
                >
                    ← Volver a Mis Negocios
                </button>
                <h1 style={{ fontSize: '32px', fontWeight: '700', margin: 0 }}>
                    {id ? 'Editar Negocio' : 'Crear Nuevo Negocio'}
                </h1>
                <p style={{ opacity: 0.6, marginTop: '4px' }}>
                    {id ? 'Actualiza la información del negocio' : 'Completa los datos para crear un nuevo negocio'}
                </p>
            </div>

            {error && (
                <div style={{
                    padding: '12px 16px',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '12px',
                    color: '#ef4444',
                    fontSize: '14px',
                    marginBottom: '24px'
                }}>
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} style={{
                maxWidth: '800px',
                background: 'rgba(255,255,255,0.03)',
                borderRadius: '16px',
                padding: '32px',
                border: '1px solid rgba(255,255,255,0.05)'
            }}>
                {/* Basic Information */}
                <div style={{ marginBottom: '32px' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px' }}>
                        Información Básica
                    </h3>

                    <div style={{ display: 'grid', gap: '20px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
                                Nombre del Negocio *
                            </label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                required
                                placeholder="Ej: Spa Zen"
                                style={{
                                    width: '100%',
                                    padding: '12px 16px',
                                    borderRadius: '12px',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    background: 'rgba(255,255,255,0.05)',
                                    color: 'white',
                                    fontSize: '14px',
                                    outline: 'none'
                                }}
                            />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
                                    Categoría *
                                </label>
                                <select
                                    name="category_id"
                                    value={formData.category_id}
                                    onChange={handleChange}
                                    required
                                    style={{
                                        width: '100%',
                                        padding: '12px 16px',
                                        borderRadius: '12px',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        background: 'rgba(255,255,255,0.05)',
                                        color: 'white',
                                        fontSize: '14px',
                                        outline: 'none'
                                    }}
                                >
                                    <option value="" style={{ background: '#1a1a1a', color: 'white' }}>Seleccionar...</option>
                                    {categories.map(cat => (
                                        <option key={cat.id} value={cat.id} style={{ background: '#1a1a1a', color: 'white', padding: '8px' }}>
                                            {cat.icon} {cat.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
                                    Subcategoría *
                                </label>
                                <select
                                    name="subcategory_id"
                                    value={formData.subcategory_id}
                                    onChange={handleChange}
                                    required
                                    disabled={!formData.category_id}
                                    style={{
                                        width: '100%',
                                        padding: '12px 16px',
                                        borderRadius: '12px',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        background: 'rgba(255,255,255,0.05)',
                                        color: 'white',
                                        fontSize: '14px',
                                        outline: 'none',
                                        opacity: !formData.category_id ? 0.5 : 1
                                    }}
                                >
                                    <option value="" style={{ background: '#1a1a1a', color: 'white' }}>Seleccionar...</option>
                                    {subcategories.map(sub => (
                                        <option key={sub.id} value={sub.id} style={{ background: '#1a1a1a', color: 'white', padding: '8px' }}>
                                            {sub.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
                                Tipo de Negocio *
                            </label>
                            <select
                                name="type"
                                value={formData.type}
                                onChange={handleChange}
                                required
                                style={{
                                    width: '100%',
                                    padding: '12px 16px',
                                    borderRadius: '12px',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    background: 'rgba(255,255,255,0.05)',
                                    color: 'white',
                                    fontSize: '14px',
                                    outline: 'none'
                                }}
                            >
                                <option value="service" style={{ background: '#1a1a1a', color: 'white' }}>Servicio</option>
                                <option value="sport" style={{ background: '#1a1a1a', color: 'white' }}>Deporte</option>
                                <option value="venue" style={{ background: '#1a1a1a', color: 'white' }}>Alquiler</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Location */}
                <div style={{ marginBottom: '32px' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px' }}>
                        Ubicación
                    </h3>

                    <div>
                        <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
                            Dirección *
                        </label>
                        <input
                            type="text"
                            name="location"
                            value={formData.location}
                            onChange={handleChange}
                            required
                            placeholder="Ej: Av. Corrientes 1234, CABA"
                            style={{
                                width: '100%',
                                padding: '12px 16px',
                                borderRadius: '12px',
                                border: '1px solid rgba(255,255,255,0.1)',
                                background: 'rgba(255,255,255,0.05)',
                                color: 'white',
                                fontSize: '14px',
                                outline: 'none'
                            }}
                        />
                    </div>
                </div>

                {/* Contact */}
                <div style={{ marginBottom: '32px' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px' }}>
                        Contacto
                    </h3>

                    <div style={{ display: 'grid', gap: '20px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
                                Teléfono / WhatsApp
                            </label>
                            <input
                                type="tel"
                                name="phone"
                                value={formData.phone}
                                onChange={(e) => {
                                    // Update both phone and whatsapp with the same value
                                    setFormData(prev => ({
                                        ...prev,
                                        phone: e.target.value,
                                        whatsapp: e.target.value
                                    }));
                                }}
                                placeholder="Ej: +54 9 380 123-4567"
                                style={{
                                    width: '100%',
                                    padding: '12px 16px',
                                    borderRadius: '12px',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    background: 'rgba(255,255,255,0.05)',
                                    color: 'white',
                                    fontSize: '14px',
                                    outline: 'none'
                                }}
                            />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
                                    Instagram
                                </label>
                                <input
                                    type="text"
                                    name="instagram"
                                    value={formData.instagram}
                                    onChange={handleChange}
                                    placeholder="@usuario"
                                    style={{
                                        width: '100%',
                                        padding: '12px 16px',
                                        borderRadius: '12px',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        background: 'rgba(255,255,255,0.05)',
                                        color: 'white',
                                        fontSize: '14px',
                                        outline: 'none'
                                    }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
                                    Facebook
                                </label>
                                <input
                                    type="text"
                                    name="facebook"
                                    value={formData.facebook}
                                    onChange={handleChange}
                                    placeholder="usuario o página"
                                    style={{
                                        width: '100%',
                                        padding: '12px 16px',
                                        borderRadius: '12px',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        background: 'rgba(255,255,255,0.05)',
                                        color: 'white',
                                        fontSize: '14px',
                                        outline: 'none'
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Info Box */}
                <div style={{
                    padding: '16px',
                    background: 'rgba(59, 130, 246, 0.1)',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                    borderRadius: '12px',
                    marginBottom: '24px'
                }}>
                    <p style={{ fontSize: '13px', color: '#60a5fa', margin: 0, lineHeight: '1.6' }}>
                        💡 <strong>Importante:</strong> El negocio recibirá credenciales de acceso automáticas:
                        <br />
                        <br />
                        📧 <strong>Email:</strong> {formData.name
                            ? `${formData.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}@turnitoslr.com`
                            : '[nombre-del-negocio]@turnitoslr.com'}
                        <br />
                        🔑 <strong>Contraseña temporal:</strong> admin123 (deberá cambiarla en el primer login)
                        <br />
                        ⏱️ <strong>Período de prueba:</strong> 15 días
                        <br />
                        <br />
                        🎨 El negocio se creará con <strong>logo y banner predeterminados</strong>. El dueño podrá completar toda la configuración (horarios, servicios, imágenes, etc.) desde su Portal de Negocio.
                    </p>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                    <button
                        type="button"
                        onClick={() => navigate('/admin/businesses')}
                        style={{
                            padding: '12px 24px',
                            background: 'rgba(255,255,255,0.05)',
                            color: 'white',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '12px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            fontSize: '14px'
                        }}
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            padding: '12px 24px',
                            background: 'var(--primary-paddle)',
                            color: '#000',
                            border: 'none',
                            borderRadius: '12px',
                            fontWeight: '700',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            fontSize: '14px',
                            boxShadow: '0 4px 12px rgba(0, 230, 118, 0.3)',
                            opacity: loading ? 0.7 : 1
                        }}
                    >
                        {loading ? 'Guardando...' : id ? 'Actualizar Negocio' : 'Crear Negocio'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default SellerBusinessForm;
