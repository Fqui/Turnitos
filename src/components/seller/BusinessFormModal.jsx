import React, { useState } from 'react';
import supabaseService from '../../services/supabaseService';

const BusinessFormModal = ({ business, categories, subcategories, sellers, onClose, onSave }) => {
    const [formData, setFormData] = useState({
        name: business?.name || '',
        category_id: business?.category_id || '',
        subcategory_id: business?.subcategory_id || '',
        location: business?.location || '',
        phone: business?.phone || '',
        whatsapp: business?.whatsapp || '',
        instagram: business?.instagram || '',
        facebook: business?.facebook || '',
        type: business?.type || 'venue',
        seller_id: business?.seller_id || '',
        subscription_plan_id: business?.subscription_plan_id || '1'
    });
    const [loading, setLoading] = useState(false);

    const filteredSubcategories = subcategories.filter(
        sub => sub.category_id === formData.category_id
    );

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (business) {
                await supabaseService.updateBusinessAsSuperAdmin(business.id, formData);
            } else {
                await supabaseService.createBusinessAsSuperAdmin(formData);
            }
            onSave();
            onClose();
        } catch (err) {
            alert(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            backdropFilter: 'blur(8px)',
            padding: '24px'
        }}
            onClick={onClose}
        >
            <div
                style={{
                    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
                    borderRadius: '24px',
                    padding: '32px',
                    maxWidth: '700px',
                    width: '100%',
                    maxHeight: '90vh',
                    overflowY: 'auto',
                    border: '1px solid rgba(255,255,255,0.1)',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <h2 style={{ fontSize: '28px', fontWeight: '800', marginBottom: '24px', margin: 0 }}>
                    {business ? '✏️ Editar Negocio' : '➕ Crear Negocio'}
                </h2>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {/* Name */}
                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: 'rgba(255,255,255,0.9)' }}>
                            Nombre del Negocio *
                        </label>
                        <input
                            type="text"
                            required
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            style={{
                                width: '100%',
                                padding: '14px',
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '12px',
                                color: 'white',
                                fontSize: '15px',
                                outline: 'none'
                            }}
                            onFocus={(e) => e.target.style.borderColor = 'var(--primary-paddle)'}
                            onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                        />
                    </div>

                    {/* Category & Subcategory */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: 'rgba(255,255,255,0.9)' }}>
                                Categoría *
                            </label>
                            <select
                                required
                                value={formData.category_id}
                                onChange={(e) => setFormData({ ...formData, category_id: e.target.value, subcategory_id: '' })}
                                style={{
                                    width: '100%',
                                    padding: '14px',
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '12px',
                                    color: 'white',
                                    fontSize: '15px',
                                    outline: 'none'
                                }}
                            >
                                <option value="">Seleccionar...</option>
                                {categories.map(cat => (
                                    <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: 'rgba(255,255,255,0.9)' }}>
                                Subcategoría
                            </label>
                            <select
                                value={formData.subcategory_id}
                                onChange={(e) => setFormData({ ...formData, subcategory_id: e.target.value })}
                                disabled={!formData.category_id}
                                style={{
                                    width: '100%',
                                    padding: '14px',
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '12px',
                                    color: 'white',
                                    fontSize: '15px',
                                    outline: 'none',
                                    opacity: formData.category_id ? 1 : 0.5
                                }}
                            >
                                <option value="">Ninguna</option>
                                {filteredSubcategories.map(sub => (
                                    <option key={sub.id} value={sub.id}>{sub.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Location */}
                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: 'rgba(255,255,255,0.9)' }}>
                            Ubicación *
                        </label>
                        <input
                            type="text"
                            required
                            value={formData.location}
                            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                            placeholder="Ej: La Rioja, Argentina"
                            style={{
                                width: '100%',
                                padding: '14px',
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '12px',
                                color: 'white',
                                fontSize: '15px',
                                outline: 'none'
                            }}
                        />
                    </div>

                    {/* Contact Info */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: 'rgba(255,255,255,0.9)' }}>
                                Teléfono
                            </label>
                            <input
                                type="tel"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                style={{
                                    width: '100%',
                                    padding: '14px',
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '12px',
                                    color: 'white',
                                    fontSize: '15px',
                                    outline: 'none'
                                }}
                            />
                        </div>

                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: 'rgba(255,255,255,0.9)' }}>
                                WhatsApp
                            </label>
                            <input
                                type="tel"
                                value={formData.whatsapp}
                                onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                                style={{
                                    width: '100%',
                                    padding: '14px',
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '12px',
                                    color: 'white',
                                    fontSize: '15px',
                                    outline: 'none'
                                }}
                            />
                        </div>
                    </div>

                    {/* Social Media */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: 'rgba(255,255,255,0.9)' }}>
                                Instagram
                            </label>
                            <input
                                type="text"
                                value={formData.instagram}
                                onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                                placeholder="@usuario"
                                style={{
                                    width: '100%',
                                    padding: '14px',
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '12px',
                                    color: 'white',
                                    fontSize: '15px',
                                    outline: 'none'
                                }}
                            />
                        </div>

                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: 'rgba(255,255,255,0.9)' }}>
                                Facebook
                            </label>
                            <input
                                type="text"
                                value={formData.facebook}
                                onChange={(e) => setFormData({ ...formData, facebook: e.target.value })}
                                style={{
                                    width: '100%',
                                    padding: '14px',
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '12px',
                                    color: 'white',
                                    fontSize: '15px',
                                    outline: 'none'
                                }}
                            />
                        </div>
                    </div>

                    {/* Type & Seller */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: 'rgba(255,255,255,0.9)' }}>
                                Tipo *
                            </label>
                            <select
                                required
                                value={formData.type}
                                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                style={{
                                    width: '100%',
                                    padding: '14px',
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '12px',
                                    color: 'white',
                                    fontSize: '15px',
                                    outline: 'none'
                                }}
                            >
                                <option value="venue">Venue (Canchas/Espacios)</option>
                                <option value="service">Service (Servicios)</option>
                            </select>
                        </div>

                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: 'rgba(255,255,255,0.9)' }}>
                                Vendedor
                            </label>
                            <select
                                value={formData.seller_id}
                                onChange={(e) => setFormData({ ...formData, seller_id: e.target.value })}
                                style={{
                                    width: '100%',
                                    padding: '14px',
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '12px',
                                    color: 'white',
                                    fontSize: '15px',
                                    outline: 'none'
                                }}
                            >
                                <option value="">Sin vendedor</option>
                                {sellers.map(seller => (
                                    <option key={seller.id} value={seller.id}>
                                        {seller.first_name} {seller.last_name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Buttons */}
                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
                        <button
                            type="button"
                            onClick={onClose}
                            style={{
                                padding: '14px 28px',
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '12px',
                                color: 'white',
                                cursor: 'pointer',
                                fontWeight: '600',
                                fontSize: '15px',
                                transition: 'all 0.2s'
                            }}
                            onMouseOver={(e) => e.target.style.background = 'rgba(255,255,255,0.1)'}
                            onMouseOut={(e) => e.target.style.background = 'rgba(255,255,255,0.05)'}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                padding: '14px 28px',
                                background: loading ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg, var(--primary-paddle), #059669)',
                                border: 'none',
                                borderRadius: '12px',
                                color: loading ? 'rgba(255,255,255,0.5)' : '#000',
                                fontWeight: '700',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                fontSize: '15px',
                                boxShadow: loading ? 'none' : '0 4px 12px rgba(0, 230, 118, 0.3)',
                                transition: 'all 0.2s'
                            }}
                        >
                            {loading ? 'Guardando...' : business ? 'Actualizar' : 'Crear'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default BusinessFormModal;
