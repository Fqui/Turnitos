import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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

    // Custom dropdown state
    const [categoryOpen, setCategoryOpen] = useState(false);
    const [subcategoryOpen, setSubcategoryOpen] = useState(false);
    const [typeOpen, setTypeOpen] = useState(false);
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
                setTypeOpen(false);
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
                                                    <span style={{ color: selectedCategory ? 'white' : 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        {selectedCategory ? (
                                                            <>
                                                                <span style={{ fontSize: '18px' }}>{selectedCategory.icon}</span>
                                                                {selectedCategory.name}
                                                            </>
                                                        ) : (
                                                            'Seleccionar categoría...'
                                                        )}
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
                            <button
                                type="button"
                                onClick={() => { setCategoryOpen(false); setSubcategoryOpen(false); setTypeOpen(o => !o); }}
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
                                <span style={{ color: formData.type ? 'white' : 'rgba(255,255,255,0.5)' }}>
                                    {formData.type === 'sport' ? '⚽ Deporte' : formData.type === 'service' ? '💼 Servicio' : formData.type === 'venue' ? '🏠 Alquiler' : 'Seleccionar tipo...'}
                                </span>
                                <motion.svg
                                    animate={{ rotate: typeOpen ? 180 : 0 }}
                                    transition={{ duration: 0.2 }}
                                    width="16" height="16" viewBox="0 0 16 16" fill="rgba(255,255,255,0.6)"
                                >
                                    <path d="M8 11L3 6h10z" />
                                </motion.svg>
                            </button>
                            <AnimatePresence>
                                {typeOpen && (
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
                                            overflow: 'hidden'
                                        }}
                                    >
                                        {[
                                            { value: 'sport', label: '⚽ Deporte', color: '#00E676' },
                                            { value: 'service', label: '💼 Servicio', color: '#2196F3' },
                                            { value: 'venue', label: '🏠 Alquiler', color: '#FF5722' },
                                        ].map(opt => (
                                            <div
                                                key={opt.value}
                                                onClick={() => {
                                                    setFormData({ ...formData, type: opt.value });
                                                    setTypeOpen(false);
                                                }}
                                                style={{
                                                    padding: '12px 16px',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    gap: '12px',
                                                    backgroundColor: formData.type === opt.value ? `${opt.color}20` : 'transparent',
                                                    borderBottom: '1px solid rgba(255,255,255,0.05)'
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)'}
                                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = formData.type === opt.value ? `${opt.color}20` : 'transparent'}
                                            >
                                                <span style={{ flex: 1, color: 'white', fontSize: '15px', fontWeight: '500' }}>
                                                    {opt.label}
                                                </span>
                                                {formData.type === opt.value && (
                                                    <svg width="18" height="18" viewBox="0 0 18 18" fill={opt.color}>
                                                        <path d="M6.5 12.5L3 9l1.5-1.5 2 2L13.5 3l1.5 1.5z" />
                                                    </svg>
                                                )}
                                            </div>
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        <div ref={sellerRef} style={{ position: 'relative' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: 'rgba(255,255,255,0.9)' }}>
                                Vendedor
                            </label>
                            <button
                                type="button"
                                onClick={() => { setCategoryOpen(false); setSubcategoryOpen(false); setTypeOpen(false); setSellerOpen(o => !o); }}
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
                                        return seller ? `${seller.first_name || ''} ${seller.last_name || ''}`.trim() || seller.email : 'Sin vendedor';
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
                                        {sellers.map(seller => (
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
                                                    {seller.first_name} {seller.last_name}
                                                </span>
                                                {formData.seller_id === seller.id && (
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
