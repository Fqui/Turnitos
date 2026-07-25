import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import supabaseService from '../../services/supabaseService';

const BusinessFormModal = ({ business, categories, subcategories, sellers = [], onClose, onSave }) => {
    const [formData, setFormData] = useState({
        name: business?.name || '',
        category_id: business?.category_id || '',
        subcategory_id: business?.subcategory_id || '',
        location: business?.location || '',
        whatsapp: business?.whatsapp || '',
        instagram: business?.instagram || '',
        facebook: business?.facebook || '',
        type: business?.type || 'venue',
        seller_id: business?.seller_id || '',
        subscription_plan_id: business?.subscription_plan_id || '54ff12b0-8b5e-48da-b411-92a4a31ea9fb'
    });
    const [loading, setLoading] = useState(false);
    const [createdCredentials, setCreatedCredentials] = useState(null);
    const [showCredentials, setShowCredentials] = useState(false);

    // Custom dropdown state
    const [categoryOpen, setCategoryOpen] = useState(false);
    const [subcategoryOpen, setSubcategoryOpen] = useState(false);
    const [sellerOpen, setSellerOpen] = useState(false);
    const categoryRef = useRef(null);
    const subcategoryRef = useRef(null);
    const sellerRef = useRef(null);

    // Close on click outside
    useEffect(() => {
        const handle = (e) => {
            if (categoryRef.current && !categoryRef.current.contains(e.target)) setCategoryOpen(false);
            if (subcategoryRef.current && !subcategoryRef.current.contains(e.target)) setSubcategoryOpen(false);
            if (sellerRef.current && !sellerRef.current.contains(e.target)) setSellerOpen(false);
        };
        document.addEventListener('mousedown', handle);
        return () => document.removeEventListener('mousedown', handle);
    }, []);

    // Close on Escape
    useEffect(() => {
        const handle = (e) => {
            if (e.key === 'Escape') {
                setCategoryOpen(false);
                setSubcategoryOpen(false);
                setSellerOpen(false);
            }
        };
        document.addEventListener('keydown', handle);
        return () => document.removeEventListener('keydown', handle);
    }, []);

    const filteredSubcategories = subcategories.filter(
        sub => sub.category_id === formData.category_id
    );
    const selectedSubcategory = filteredSubcategories.find(s => s.id === formData.subcategory_id);
    // Base input style
    const inputStyle = {
        width: '100%',
        padding: '14px',
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '12px',
        color: 'white',
        fontSize: '15px',
        outline: 'none'
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Derive type from category (canonical source is category_id).
            const TYPE_BY_CATEGORY_NAME = {
                'Deportes': 'sport',
                'Belleza': 'service',
                'Salud': 'service',
                'Mascotas': 'service',
                'Alquileres': 'alquiler', // Fixed: was 'venue', DB and portal use 'alquiler'
            };
            const cat = categories.find(c => c.id === formData.category_id);
            const derivedType = cat ? (TYPE_BY_CATEGORY_NAME[cat.name] || null) : null;

            // Auto-generate slug from name if missing
            let slug = formData.slug || '';
            if (!slug && formData.name) {
                slug = formData.name
                    .toLowerCase()
                    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // strip accents
                    .replace(/[^a-z0-9\s-]/g, '') // strip non-alphanumeric
                    .trim()
                    .replace(/\s+/g, '-')
                    .replace(/-+/g, '-');
                // Ensure uniqueness by appending random suffix
                slug = `${slug}-${Math.random().toString(36).substring(2, 6)}`;
            }

            // Auto-generate email + password if creating new business (no user input fields for these)
            let ownerEmail = formData.email || '';
            let ownerPassword = formData.password || '';
            if (!business) {
                if (!ownerEmail) {
                    const slugBase = (formData.name || 'business')
                        .toLowerCase()
                        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                        .replace(/[^a-z0-9]/g, '')
                        .substring(0, 20);
                    ownerEmail = `${slugBase || 'business'}-${Math.random().toString(36).substring(2, 6)}@turnitoslr.com`;
                }
                if (!ownerPassword) {
                    // 8 char password with upper, lower, number
                    ownerPassword = (() => {
                        const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
                        const lower = 'abcdefghijkmnpqrstuvwxyz';
                        const nums = '23456789';
                        const all = upper + lower + nums;
                        let pwd = '';
                        pwd += upper[Math.floor(Math.random() * upper.length)];
                        pwd += nums[Math.floor(Math.random() * nums.length)];
                        pwd += lower[Math.floor(Math.random() * lower.length)];
                        for (let i = 0; i < 5; i++) pwd += all[Math.floor(Math.random() * all.length)];
                        return pwd.split('').sort(() => Math.random() - 0.5).join('');
                    })();
                }
            }

            const dataToSave = {
                ...formData,
                slug,
                email: ownerEmail,
                password: ownerPassword,
                type: derivedType || formData.type,
                seller_id: formData.seller_id || null,
            };

            if (business) {
                await supabaseService.updateBusinessAsSuperAdmin(business.id, dataToSave);
                onSave();
                onClose();
            } else {
                const result = await supabaseService.createBusinessAsSuperAdmin(dataToSave);
                onSave();
                // Show credentials panel instead of closing immediately
                setCreatedCredentials({
                    name: dataToSave.name,
                    email: dataToSave.email,
                    password: dataToSave.password,
                    businessId: result?.id,
                    slug: result?.slug || dataToSave.slug,
                });
                setShowCredentials(true);
            }
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
                                            <div ref={categoryRef} style={{ position: 'relative' }}>
                                                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: 'rgba(255,255,255,0.9)' }}>
                                                    Categoría *
                                                </label>
                                                <button
                                                    type="button"
                                                    onClick={() => { setCategoryOpen(o => !o); setSubcategoryOpen(false); }}
                                                    style={{
                                                        ...inputStyle,
                                                        textAlign: 'left',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between',
                                                        gap: '8px'
                                                    }}
                                                >
                                                    <span style={{ color: formData.category_id && categories.find(c => c.id === formData.category_id) ? 'white' : 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        {(() => {
                                                            const cat = categories.find(c => c.id === formData.category_id);
                                                            return cat ? (
                                                                <>
                                                                    <span style={{ fontSize: '18px' }}>{cat.icon}</span>
                                                                    {cat.name}
                                                                </>
                                                            ) : (
                                                                'Seleccionar categoría...'
                                                            );
                                                        })()}
                                                    </span>
                                                    <motion.svg
                                                        animate={{ rotate: categoryOpen ? 180 : 0 }}
                                                        transition={{ duration: 0.2 }}
                                                        width="16" height="16" viewBox="0 0 16 16" fill="rgba(255,255,255,0.6)"
                                                    >
                                                        <path d="M8 11L3 6h10z" />
                                                    </motion.svg>
                                                </button>
                                                <AnimatePresence>
                                                    {categoryOpen && (
                                                        <motion.div
                                                            initial={{ opacity: 0, scale: 0.95, y: -8 }}
                                                            animate={{ opacity: 1, scale: 1, y: 0 }}
                                                            exit={{ opacity: 0, scale: 0.95, y: -8 }}
                                                            transition={{ duration: 0.18, ease: 'easeOut' }}
                                                            style={{
                                                                position: 'absolute',
                                                                top: 'calc(100% + 6px)',
                                                                left: 0,
                                                                right: 0,
                                                                zIndex: 1000,
                                                                backgroundColor: '#1a1a1a',
                                                                border: '1px solid rgba(255,255,255,0.15)',
                                                                borderRadius: '12px',
                                                                boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
                                                                maxHeight: '320px',
                                                                overflowY: 'auto'
                                                            }}
                                                        >
                                                            {categories.map(cat => (
                                                                <div
                                                                    key={cat.id}
                                                                    onClick={() => {
                                                                        setFormData({ ...formData, category_id: cat.id, subcategory_id: '' });
                                                                        setCategoryOpen(false);
                                                                    }}
                                                                    style={{
                                                                        padding: '12px 16px',
                                                                        cursor: 'pointer',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        gap: '12px',
                                                                        backgroundColor: formData.category_id === cat.id ? 'rgba(0, 230, 118, 0.1)' : 'transparent',
                                                                        borderBottom: '1px solid rgba(255,255,255,0.05)'
                                                                    }}
                                                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)'}
                                                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = formData.category_id === cat.id ? 'rgba(0, 230, 118, 0.1)' : 'transparent'}
                                                                >
                                                                    {cat.icon && (
                                                                        <span style={{
                                                                            fontSize: '20px',
                                                                            width: '36px',
                                                                            height: '36px',
                                                                            borderRadius: '50%',
                                                                            background: cat.color || 'rgba(255,255,255,0.1)',
                                                                            display: 'inline-flex',
                                                                            alignItems: 'center',
                                                                            justifyContent: 'center',
                                                                            flexShrink: 0
                                                                        }}>
                                                                            {cat.icon}
                                                                        </span>
                                                                    )}
                                                                    <span style={{ flex: 1, color: 'white', fontSize: '15px', fontWeight: '500' }}>
                                                                        {cat.name}
                                                                    </span>
                                                                    {formData.category_id === cat.id && (
                                                                        <svg width="18" height="18" viewBox="0 0 18 18" fill="#00E676">
                                                                            <path d="M6.5 12.5L3 9l1.5-1.5 2 2L13.5 3l1.5 1.5z" />
                                                                        </svg>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>

                                            <div ref={subcategoryRef} style={{ position: 'relative' }}>
                                                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: 'rgba(255,255,255,0.9)' }}>
                                                    Subcategoría
                                                </label>
                                                <button
                                                    type="button"
                                                    onClick={() => { if (formData.category_id) { setSubcategoryOpen(o => !o); setCategoryOpen(false); } }}
                                                    disabled={!formData.category_id}
                                                    style={{
                                                        ...inputStyle,
                                                        textAlign: 'left',
                                                        cursor: formData.category_id ? 'pointer' : 'not-allowed',
                                                        opacity: formData.category_id ? 1 : 0.5,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between',
                                                        gap: '8px'
                                                    }}
                                                >
                                                    <span style={{ color: selectedSubcategory ? 'white' : 'rgba(255,255,255,0.5)' }}>
                                                        {selectedSubcategory ? selectedSubcategory.name : 'Seleccionar subcategoría...'}
                                                    </span>
                                                    <motion.svg
                                                        animate={{ rotate: subcategoryOpen ? 180 : 0 }}
                                                        transition={{ duration: 0.2 }}
                                                        width="16" height="16" viewBox="0 0 16 16" fill="rgba(255,255,255,0.6)"
                                                    >
                                                        <path d="M8 11L3 6h10z" />
                                                    </motion.svg>
                                                </button>
                                                <AnimatePresence>
                                                    {subcategoryOpen && filteredSubcategories.length > 0 && (
                                                        <motion.div
                                                            initial={{ opacity: 0, scale: 0.95, y: -8 }}
                                                            animate={{ opacity: 1, scale: 1, y: 0 }}
                                                            exit={{ opacity: 0, scale: 0.95, y: -8 }}
                                                            transition={{ duration: 0.18, ease: 'easeOut' }}
                                                            style={{
                                                                position: 'absolute',
                                                                top: 'calc(100% + 6px)',
                                                                left: 0,
                                                                right: 0,
                                                                zIndex: 1000,
                                                                backgroundColor: '#1a1a1a',
                                                                border: '1px solid rgba(255,255,255,0.15)',
                                                                borderRadius: '12px',
                                                                boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
                                                                maxHeight: '320px',
                                                                overflowY: 'auto'
                                                            }}
                                                        >
                                                            {filteredSubcategories.map(sub => (
                                                                <div
                                                                    key={sub.id}
                                                                    onClick={() => {
                                                                        setFormData({ ...formData, subcategory_id: sub.id });
                                                                        setSubcategoryOpen(false);
                                                                    }}
                                                                    style={{
                                                                        padding: '12px 16px',
                                                                        cursor: 'pointer',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'space-between',
                                                                        gap: '12px',
                                                                        backgroundColor: formData.subcategory_id === sub.id ? 'rgba(0, 230, 118, 0.1)' : 'transparent',
                                                                        borderBottom: '1px solid rgba(255,255,255,0.05)'
                                                                    }}
                                                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)'}
                                                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = formData.subcategory_id === sub.id ? 'rgba(0, 230, 118, 0.1)' : 'transparent'}
                                                                >
                                                                    <span style={{ flex: 1, color: 'white', fontSize: '15px' }}>{sub.name}</span>
                                                                    {formData.subcategory_id === sub.id && (
                                                                        <svg width="18" height="18" viewBox="0 0 18 18" fill="#00E676">
                                                                            <path d="M6.5 12.5L3 9l1.5-1.5 2 2L13.5 3l1.5 1.5z" />
                                                                        </svg>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
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
                    <div>
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

                    {/* Vendedor */}
                    <div ref={sellerRef} style={{ position: 'relative' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: 'rgba(255,255,255,0.9)' }}>
                            Vendedor
                        </label>
                        <button
                            type="button"
                            onClick={() => { setCategoryOpen(false); setSubcategoryOpen(false); setSellerOpen(o => !o); }}
                            style={{
                                ...inputStyle,
                                textAlign: 'left',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '8px'
                            }}
                        >
                            <span style={{ color: formData.seller_id ? 'white' : 'rgba(255,255,255,0.5)' }}>
                                {(() => {
                                    if (!formData.seller_id) return 'Sin vendedor';
                                    const seller = sellers.find(s => s.id === formData.seller_id);
                                    if (!seller) return 'Sin vendedor';
                                    const name = `${seller.first_name || ''} ${seller.last_name || ''}`.trim();
                                    return name || seller.email;
                                })()}
                            </span>
                            <motion.svg
                                animate={{ rotate: sellerOpen ? 180 : 0 }}
                                transition={{ duration: 0.2 }}
                                width="16" height="16" viewBox="0 0 16 16" fill="rgba(255,255,255,0.6)"
                            >
                                <path d="M8 11L3 6h10z" />
                            </motion.svg>
                        </button>
                        <AnimatePresence>
                            {sellerOpen && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95, y: -8 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95, y: -8 }}
                                    transition={{ duration: 0.18, ease: 'easeOut' }}
                                    style={{
                                        position: 'absolute',
                                        top: 'calc(100% + 6px)',
                                        left: 0,
                                        right: 0,
                                        zIndex: 1000,
                                        backgroundColor: '#1a1a1a',
                                        border: '1px solid rgba(255,255,255,0.15)',
                                        borderRadius: '12px',
                                        boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
                                        maxHeight: '320px',
                                        overflowY: 'auto'
                                    }}
                                >
                                    <div
                                        onClick={() => {
                                            setFormData({ ...formData, seller_id: '' });
                                            setSellerOpen(false);
                                        }}
                                        style={{
                                            padding: '12px 16px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            gap: '12px',
                                            backgroundColor: !formData.seller_id ? 'rgba(0, 230, 118, 0.1)' : 'transparent',
                                            borderBottom: '1px solid rgba(255,255,255,0.05)'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)'}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = !formData.seller_id ? 'rgba(0, 230, 118, 0.1)' : 'transparent'}
                                    >
                                        <span style={{ flex: 1, color: 'rgba(255,255,255,0.7)', fontSize: '15px' }}>Sin vendedor</span>
                                        {!formData.seller_id && (
                                            <svg width="18" height="18" viewBox="0 0 18 18" fill="#00E676">
                                                <path d="M6.5 12.5L3 9l1.5-1.5 2 2L13.5 3l1.5 1.5z" />
                                            </svg>
                                        )}
                                    </div>
                                    {sellers.length === 0 ? (
                                        <div style={{ padding: '20px 16px', color: 'rgba(255,255,255,0.5)', fontSize: '14px', textAlign: 'center' }}>
                                            No hay vendedores cargados
                                        </div>
                                    ) : (
                                        sellers.map(seller => (
                                            <div
                                                key={seller.id}
                                                onClick={() => {
                                                    setFormData({ ...formData, seller_id: seller.id });
                                                    setSellerOpen(false);
                                                }}
                                                style={{
                                                    padding: '12px 16px',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    gap: '12px',
                                                    backgroundColor: formData.seller_id === seller.id ? 'rgba(0, 230, 118, 0.1)' : 'transparent',
                                                    borderBottom: '1px solid rgba(255,255,255,0.05)'
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)'}
                                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = formData.seller_id === seller.id ? 'rgba(0, 230, 118, 0.1)' : 'transparent'}
                                            >
                                                <span style={{ flex: 1, color: 'white', fontSize: '15px' }}>
                                                    {`${seller.first_name || ''} ${seller.last_name || ''}`.trim() || seller.email}
                                                </span>
                                                {formData.seller_id === seller.id && (
                                                    <svg width="18" height="18" viewBox="0 0 18 18" fill="#00E676">
                                                        <path d="M6.5 12.5L3 9l1.5-1.5 2 2L13.5 3l1.5 1.5z" />
                                                    </svg>
                                                )}
                                            </div>
                                        ))
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
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

            {/* Credentials panel — shown after creating a new business */}
            <AnimatePresence>
                {showCredentials && createdCredentials && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: 'rgba(0,0,0,0.85)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 1100,
                            backdropFilter: 'blur(8px)',
                            padding: '24px',
                        }}
                        onClick={() => {
                            setShowCredentials(false);
                            setCreatedCredentials(null);
                            onClose();
                        }}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            transition={{ duration: 0.25, ease: 'easeOut' }}
                            onClick={(e) => e.stopPropagation()}
                            style={{
                                background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
                                borderRadius: '24px',
                                padding: '40px',
                                maxWidth: '560px',
                                width: '100%',
                                border: '1px solid rgba(0, 230, 118, 0.3)',
                                boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
                                color: 'white',
                            }}
                        >
                            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                                <div style={{
                                    width: '72px',
                                    height: '72px',
                                    margin: '0 auto 16px',
                                    borderRadius: '50%',
                                    background: 'linear-gradient(135deg, var(--primary-paddle), #059669)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '36px',
                                }}>✓</div>
                                <h2 style={{ fontSize: '26px', fontWeight: '800', margin: 0 }}>
                                    Negocio creado
                                </h2>
                                <p style={{ opacity: 0.7, marginTop: '8px', fontSize: '14px' }}>
                                    Pasale estas credenciales al dueño de <strong>{createdCredentials.name}</strong>
                                </p>
                            </div>

                            <CredentialsRow
                                label="Email del dueño"
                                value={createdCredentials.email}
                                placeholder="email"
                            />
                            <CredentialsRow
                                label="Contraseña"
                                value={createdCredentials.password}
                                placeholder="password"
                            />
                            <CredentialsRow
                                label="Link de login"
                                value="https://www.turnitoslr.com/login"
                                placeholder="url"
                            />

                            <div style={{
                                display: 'flex',
                                gap: '12px',
                                justifyContent: 'flex-end',
                                marginTop: '24px',
                            }}>
                                <button
                                    onClick={() => {
                                        setShowCredentials(false);
                                        setCreatedCredentials(null);
                                        onClose();
                                    }}
                                    style={{
                                        padding: '14px 28px',
                                        background: 'rgba(255,255,255,0.05)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '12px',
                                        color: 'white',
                                        cursor: 'pointer',
                                        fontWeight: '600',
                                        fontSize: '15px',
                                    }}
                                >
                                    Cerrar
                                </button>
                            </div>

                            <p style={{
                                marginTop: '20px',
                                padding: '14px',
                                background: 'rgba(245, 158, 11, 0.1)',
                                borderRadius: '10px',
                                border: '1px solid rgba(245, 158, 11, 0.3)',
                                color: '#fbbf24',
                                fontSize: '13px',
                                textAlign: 'center',
                                margin: '20px 0 0 0',
                            }}>
                                ⚠️ Anotá estas credenciales. No se vuelven a mostrar.
                            </p>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// Helper component for displaying credential rows with copy buttons
const CredentialsRow = ({ label, value, placeholder }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch (e) {
            // Fallback for older browsers
            const textarea = document.createElement('textarea');
            textarea.value = value;
            document.body.appendChild(textarea);
            textarea.select();
            try { document.execCommand('copy'); } catch (_) {}
            document.body.removeChild(textarea);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        }
    };

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 14px',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '12px',
            marginBottom: '12px',
        }}>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                    fontSize: '11px',
                    opacity: 0.6,
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    marginBottom: '4px',
                }}>{label}</div>
                <div style={{
                    fontFamily: 'monospace',
                    fontSize: '14px',
                    color: 'white',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                }}>{value || '(vacío)'}</div>
            </div>
            <button
                onClick={handleCopy}
                style={{
                    padding: '8px 16px',
                    background: copied ? 'rgba(0, 230, 118, 0.2)' : 'rgba(255,255,255,0.08)',
                    border: copied ? '1px solid var(--primary-paddle)' : '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: copied ? 'var(--primary-paddle)' : 'white',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: '600',
                    minWidth: '90px',
                    transition: 'all 0.2s',
                }}
            >
                {copied ? '✓ Copiado' : 'Copiar'}
            </button>
        </div>
    );
};

export default BusinessFormModal;
