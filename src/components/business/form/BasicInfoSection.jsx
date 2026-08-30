import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function BasicInfoSection({
    formData,
    setFormData,
    categoryDropdownRef,
    categoryOpen,
    setCategoryOpen,
    selectedCategory,
    categoryList,
    handleLogoUpload,
    uploadingLogo,
    handleBannerUpload,
    uploadingBanner
}) {
    return (
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

                <div ref={categoryDropdownRef} style={{ position: 'relative' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                        Categoría *
                    </label>
                    <button
                        type="button"
                        onClick={() => setCategoryOpen(o => !o)}
                        aria-haspopup="listbox"
                        aria-expanded={categoryOpen}
                        style={{
                            width: '100%',
                            padding: '12px',
                            borderRadius: '10px',
                            border: '1px solid var(--border)',
                            backgroundColor: 'var(--bg-main)',
                            color: selectedCategory ? 'var(--text-primary)' : 'var(--text-secondary)',
                            fontSize: '14px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '8px',
                            textAlign: 'left',
                            fontFamily: 'inherit'
                        }}
                    >
                        <span style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                            {selectedCategory ? (
                                <>
                                    <span style={{
                                        fontSize: '18px',
                                        width: '28px',
                                        height: '28px',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        borderRadius: '8px',
                                        backgroundColor: selectedCategory.color || 'var(--bg-card)',
                                        flexShrink: 0
                                    }}>
                                        {selectedCategory.icon || ''}
                                    </span>
                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {selectedCategory.name}
                                    </span>
                                </>
                            ) : (
                                <span>Seleccionar categoría...</span>
                            )}
                        </span>
                        <motion.svg
                            animate={{ rotate: categoryOpen ? 180 : 0 }}
                            transition={{ duration: 0.2, ease: 'easeOut' }}
                            width="14"
                            height="14"
                            viewBox="0 0 16 16"
                            fill="var(--text-secondary)"
                            style={{ flexShrink: 0 }}
                        >
                            <path d="M8 11L3 6h10z" />
                        </motion.svg>
                    </button>
                    <AnimatePresence>
                        {categoryOpen && (
                            <motion.div
                                role="listbox"
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
                                    backgroundColor: 'var(--bg-card)',
                                    border: '1px solid var(--border)',
                                    borderRadius: '10px',
                                    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                                    maxHeight: '300px',
                                    overflowY: 'auto',
                                    padding: '6px'
                                }}
                            >
                                <button
                                    type="button"
                                    onClick={() => {
                                        setFormData({ ...formData, category: '', subcategory: '' });
                                        setCategoryOpen(false);
                                    }}
                                    style={{
                                        width: '100%',
                                        padding: '12px 16px',
                                        borderRadius: '8px',
                                        border: 'none',
                                        background: formData.category === '' ? 'var(--bg-main)' : 'transparent',
                                        color: 'var(--text-secondary)',
                                        fontSize: '14px',
                                        textAlign: 'left',
                                        cursor: 'pointer',
                                        fontFamily: 'inherit',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '10px',
                                        transition: 'background 0.15s'
                                    }}
                                    onMouseEnter={(e) => { if (formData.category !== '') e.currentTarget.style.background = 'var(--bg-main)'; }}
                                    onMouseLeave={(e) => { if (formData.category !== '') e.currentTarget.style.background = 'transparent'; }}
                                >
                                    <span style={{
                                        fontSize: '14px',
                                        fontStyle: 'italic'
                                    }}>
                                        Sin categoría
                                    </span>
                                </button>
                                {categoryList.map(cat => {
                                    const isSelected = formData.category === cat.id;
                                    return (
                                        <button
                                            key={cat.id}
                                            type="button"
                                            role="option"
                                            aria-selected={isSelected}
                                            onClick={() => {
                                                setFormData({ ...formData, category: cat.id, subcategory: '' });
                                                setCategoryOpen(false);
                                            }}
                                            style={{
                                                width: '100%',
                                                padding: '12px 16px',
                                                borderRadius: '8px',
                                                border: 'none',
                                                background: isSelected ? 'var(--bg-main)' : 'transparent',
                                                color: 'var(--text-primary)',
                                                fontSize: '14px',
                                                textAlign: 'left',
                                                cursor: 'pointer',
                                                fontFamily: 'inherit',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '12px',
                                                transition: 'background 0.15s'
                                            }}
                                            onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = 'var(--bg-main)'; }}
                                            onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                                        >
                                            <span style={{
                                                fontSize: '18px',
                                                width: '32px',
                                                height: '32px',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                borderRadius: '8px',
                                                backgroundColor: cat.color || 'var(--bg-main)',
                                                flexShrink: 0
                                            }}>
                                                {cat.icon || ''}
                                            </span>
                                            <span style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0, flex: 1 }}>
                                                <span style={{ fontWeight: isSelected ? '700' : '600' }}>
                                                    {cat.name}
                                                </span>
                                                {cat.business_type && (
                                                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
                                                        {cat.business_type === 'sport' ? 'Deportes' : cat.business_type === 'service' ? 'Servicios' : 'Alquileres'}
                                                    </span>
                                                )}
                                            </span>
                                            {isSelected && (
                                                <svg width="16" height="16" viewBox="0 0 16 16" fill="var(--primary-paddle)" style={{ flexShrink: 0 }}>
                                                    <path d="M13.5 4.5L6 12L2.5 8.5L3.91 7.09L6 9.17L12.09 3.09L13.5 4.5Z" />
                                                </svg>
                                            )}
                                        </button>
                                    );
                                })}
                            </motion.div>
                        )}
                    </AnimatePresence>
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
                        <option value="venue">Alquiler de Espacios</option>
                    </select>
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                        Capacidad Máxima / Cupos por Turno *
                    </label>
                    <input
                        type="number"
                        min="1"
                        required
                        value={formData.max_capacity}
                        onChange={(e) => setFormData({ ...formData, max_capacity: parseInt(e.target.value) || 1 })}
                        style={{
                            width: '100%',
                            padding: '12px',
                            borderRadius: '10px',
                            border: '1px solid var(--border)',
                            backgroundColor: 'var(--bg-main)',
                            color: 'var(--text-primary)',
                            fontSize: '14px'
                        }}
                        placeholder="Ej: 1"
                    />
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
    );
}
