import React, { useState } from 'react';
import serviceAdapter from '../../../services/serviceAdapter';
import { useBodyScrollLock } from '../../../hooks/useBodyScrollLock';

export default function StoreTab({
    formData,
    handleInputChange,
    handleMetadataChange,
    handleSave,
    saving,
    isMobile,
    showToast,
    labelStyle,
    inputStyle,
    saveButtonStyle
}) {
    // Store management modal state
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [isCustomCategoryMode, setIsCustomCategoryMode] = useState(false);
    const [uploadingProductImage, setUploadingProductImage] = useState(false);

    // Turn Extras management modal state
    const [isExtraModalOpen, setIsExtraModalOpen] = useState(false);
    const [editingExtra, setEditingExtra] = useState(null);
    useBodyScrollLock((isProductModalOpen && !!editingProduct) || (isExtraModalOpen && !!editingExtra));
    const [uploadingExtraImage, setUploadingExtraImage] = useState(false);
    const [uploadingBannerImage, setUploadingBannerImage] = useState(false);

    // Category input state for the dedicated categories manager
    const [newCategoryInput, setNewCategoryInput] = useState('');

    // Business services available for assigning to extras
    const businessServices = formData.services || [];

    // Store Categories (created by business + derived from existing products)
    const existingProductCats = (formData.metadata?.store_products || []).map(p => p.category).filter(Boolean);
    const storeCategories = Array.from(new Set([
        ...(formData.metadata?.store_categories || []),
        ...existingProductCats
    ]));

    // Handle adding a store category
    const handleAddStoreCategory = async () => {
        if (!newCategoryInput || !newCategoryInput.trim()) return;
        const trimmed = newCategoryInput.trim();
        if (storeCategories.some(c => c.toLowerCase() === trimmed.toLowerCase())) {
            if (showToast) showToast('Esa categoría ya existe', 'info');
            return;
        }

        const updated = [...storeCategories, trimmed];
        handleMetadataChange('store_categories', updated);
        setNewCategoryInput('');
        if (!(await handleSave({ metadata: { ...formData.metadata, store_categories: updated } }))) return;
        if (showToast) showToast(`Categoría "${trimmed}" creada`, 'success');
    };

    // Handle removing a store category
    const handleRemoveStoreCategory = async (catToRemove) => {
        const updated = storeCategories.filter(c => c !== catToRemove);
        handleMetadataChange('store_categories', updated);
        if (!(await handleSave({ metadata: { ...formData.metadata, store_categories: updated } }))) return;
        if (showToast) showToast(`Categoría "${catToRemove}" eliminada`, 'info');
    };

    // Auto-save toggle for store enabled
    const handleToggleStoreEnabled = async (enabled) => {
        handleInputChange('store_enabled', enabled);
        if (!(await handleSave({ store_enabled: enabled, metadata: formData.metadata }))) return;
        if (showToast) {
            showToast(enabled ? 'Tienda online habilitada' : 'Tienda online deshabilitada', 'success');
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
            {/* ======================================================== */}
            {/* SECCIÓN 1: HABILITAR TIENDA & BANNERS PUBLICITARIOS     */}
            {/* ======================================================== */}
            <div style={{ background: 'var(--bg-card)', padding: '24px', borderRadius: '18px', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)' }}>
                            Configuración de la Tienda
                        </h3>
                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
                            Activa tu e-commerce y personaliza los banners promocionales de cabecera.
                        </p>
                    </div>
                    <label style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        cursor: 'pointer',
                        background: 'var(--bg-main)',
                        padding: '8px 16px',
                        borderRadius: '12px',
                        border: '1px solid var(--border)'
                    }}>
                        <span style={{ fontSize: '14px', fontWeight: '700', color: formData.store_enabled ? 'var(--primary-paddle, #10b981)' : 'var(--text-secondary)' }}>
                            {formData.store_enabled ? '🟢 Tienda Habilitada' : '⚪ Tienda Deshabilitada'}
                        </span>
                        <input
                            type="checkbox"
                            checked={!!formData.store_enabled}
                            onChange={e => handleToggleStoreEnabled(e.target.checked)}
                            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                        />
                    </label>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '16px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                    {/* Multi-banner Advertising Manager */}
                    <div>
                        <label style={{ display: 'block', fontSize: '14px', fontWeight: '700', marginBottom: '4px', color: 'var(--text-primary)' }}>
                            Banners Publicitarios de la Tienda
                        </label>
                        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0 0 12px 0' }}>
                            Podés cargar uno o varios banners publicitarios. Si cargás más de uno, la tienda mostrará un carrusel automático con transiciones suaves. Medida recomendada: <strong>1200 x 400 px</strong>.
                        </p>

                        {(() => {
                            const banners = Array.isArray(formData.metadata?.store_banners) && formData.metadata.store_banners.length > 0
                                ? formData.metadata.store_banners
                                : (formData.metadata?.store_banner_image ? [formData.metadata.store_banner_image] : []);

                            const handleRemoveBanner = async (indexToRemove) => {
                                const updated = banners.filter((_, idx) => idx !== indexToRemove);
                                handleMetadataChange('store_banners', updated);
                                handleMetadataChange('store_banner_image', updated[0] || '');
                                await handleSave({
                                    metadata: {
                                        ...formData.metadata,
                                        store_banners: updated,
                                        store_banner_image: updated[0] || ''
                                    }
                                });
                                if (showToast) showToast('Banner eliminado', 'info');
                            };

                            const handleAddBanner = async (newUrl) => {
                                const updated = [...banners, newUrl];
                                handleMetadataChange('store_banners', updated);
                                handleMetadataChange('store_banner_image', updated[0] || newUrl);
                                await handleSave({
                                    metadata: {
                                        ...formData.metadata,
                                        store_banners: updated,
                                        store_banner_image: updated[0] || newUrl
                                    }
                                });
                                if (showToast) showToast('Banner agregado y guardado', 'success');
                            };

                            return (
                                <div>
                                    {banners.length > 0 && (
                                        <div style={{
                                            display: 'grid',
                                            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                                            gap: '12px',
                                            marginBottom: '14px'
                                        }}>
                                            {banners.map((url, idx) => (
                                                <div key={idx} style={{
                                                    position: 'relative',
                                                    borderRadius: '12px',
                                                    overflow: 'hidden',
                                                    border: '1px solid var(--border)',
                                                    aspectRatio: '1200 / 400',
                                                    background: '#1e293b'
                                                }}>
                                                    <img
                                                        src={url}
                                                        alt={`Banner ${idx + 1}`}
                                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                    />
                                                    <div style={{
                                                        position: 'absolute',
                                                        bottom: '6px',
                                                        left: '8px',
                                                        background: 'rgba(0,0,0,0.65)',
                                                        color: '#fff',
                                                        padding: '2px 8px',
                                                        borderRadius: '6px',
                                                        fontSize: '11px',
                                                        fontWeight: '700'
                                                    }}>
                                                        Banner #{idx + 1}
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveBanner(idx)}
                                                        style={{
                                                            position: 'absolute',
                                                            top: '6px',
                                                            right: '6px',
                                                            background: 'rgba(239, 68, 68, 0.85)',
                                                            color: '#fff',
                                                            border: 'none',
                                                            borderRadius: '6px',
                                                            padding: '4px 8px',
                                                            fontSize: '11px',
                                                            fontWeight: '700',
                                                            cursor: 'pointer',
                                                            backdropFilter: 'blur(4px)'
                                                        }}
                                                        title="Eliminar este banner"
                                                    >
                                                        🗑️ Quitar
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                                        <label style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            padding: '10px 18px',
                                            borderRadius: '10px',
                                            background: 'var(--bg-main)',
                                            border: '1px dashed var(--border)',
                                            color: 'var(--text-primary)',
                                            fontSize: '13px',
                                            fontWeight: '600',
                                            cursor: uploadingBannerImage ? 'wait' : 'pointer',
                                            transition: 'border-color 0.2s ease'
                                        }}>
                                            {uploadingBannerImage ? '⏳ Subiendo banner...' : '📷 + Agregar Banner Publicitario (1200x400)'}
                                            <input
                                                type="file"
                                                accept="image/*"
                                                disabled={uploadingBannerImage}
                                                style={{ display: 'none' }}
                                                onChange={async (e) => {
                                                    const file = e.target.files?.[0];
                                                    if (!file) return;
                                                    try {
                                                        setUploadingBannerImage(true);
                                                        const url = await serviceAdapter.uploadImage(file);
                                                        if (url) await handleAddBanner(url);
                                                    } catch (err) {
                                                        console.error('Error uploading banner image:', err);
                                                        if (showToast) showToast('Error al subir banner', 'error');
                                                    } finally {
                                                        setUploadingBannerImage(false);
                                                        e.target.value = '';
                                                    }
                                                }}
                                            />
                                        </label>

                                        {banners.length > 0 && (
                                            <span style={{ fontSize: '12px', color: '#10b981', fontWeight: '600' }}>
                                                ✓ {banners.length} {banners.length === 1 ? 'banner activo' : 'banners activos (carrusel rotativo)'}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                </div>
            </div>

            {/* ======================================================== */}
            {/* SECCIÓN 2: CATEGORÍAS CREADAS POR EL NEGOCIO             */}
            {/* ======================================================== */}
            <div style={{ background: 'var(--bg-card)', padding: '24px', borderRadius: '18px', border: '1px solid var(--border)' }}>
                <div style={{ marginBottom: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '20px' }}>🏷️</span>
                        <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '800', color: 'var(--text-primary)' }}>
                            Categorías de la Tienda ({storeCategories.length})
                        </h3>
                    </div>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
                        Crea las categorías que definen tu catálogo (ej: <i>Cuidado Facial, Esmaltes, Tratamientos, Accesorios</i>). Son las que usarás para clasificar tus productos.
                    </p>
                </div>

                {/* Category Creation Input */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', maxWidth: '500px' }}>
                    <input
                        type="text"
                        style={{ ...inputStyle, flex: 1 }}
                        placeholder="Nombre de la nueva categoría (ej: Cuidado Capilar)..."
                        value={newCategoryInput}
                        onChange={(e) => setNewCategoryInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddStoreCategory();
                            }
                        }}
                    />
                    <button
                        type="button"
                        onClick={handleAddStoreCategory}
                        disabled={!newCategoryInput.trim()}
                        style={{
                            padding: '10px 18px',
                            borderRadius: '12px',
                            border: 'none',
                            background: 'var(--primary-paddle, #10b981)',
                            color: '#000',
                            fontWeight: '700',
                            fontSize: '13px',
                            cursor: !newCategoryInput.trim() ? 'not-allowed' : 'pointer',
                            opacity: !newCategoryInput.trim() ? 0.6 : 1,
                            whiteSpace: 'nowrap'
                        }}
                    >
                        ＋ Crear Categoría
                    </button>
                </div>

                {/* Categories Tag Chips */}
                {storeCategories.length === 0 ? (
                    <div style={{ padding: '16px', border: '1px dashed var(--border)', borderRadius: '12px', background: 'var(--bg-main)' }}>
                        <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)' }}>
                            Aún no creaste categorías. Agrega arriba las categorías de tu negocio para organizar tus productos.
                        </p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {storeCategories.map((cat, idx) => (
                            <span
                                key={idx}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '6px 12px',
                                    borderRadius: '10px',
                                    background: 'var(--bg-main)',
                                    border: '1px solid var(--border)',
                                    color: 'var(--text-primary)',
                                    fontSize: '13px',
                                    fontWeight: '600'
                                }}
                            >
                                <span>🏷️ {cat}</span>
                                <button
                                    type="button"
                                    onClick={() => handleRemoveStoreCategory(cat)}
                                    style={{
                                        background: 'transparent',
                                        border: 'none',
                                        color: '#ef4444',
                                        cursor: 'pointer',
                                        fontSize: '14px',
                                        padding: 0,
                                        display: 'flex',
                                        alignItems: 'center',
                                        lineHeight: 1
                                    }}
                                    title={`Eliminar categoría ${cat}`}
                                >
                                    ×
                                </button>
                            </span>
                        ))}
                    </div>
                )}
            </div>

            {/* ======================================================== */}
            {/* SECCIÓN 3: CATÁLOGO DE PRODUCTOS                         */}
            {/* ======================================================== */}
            <div style={{ background: 'var(--bg-card)', padding: '24px', borderRadius: '18px', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)' }}>
                            Catálogo de Productos ({formData.metadata?.store_products?.length || 0})
                        </h3>
                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
                            Productos que tus clientes pueden ver y encargar desde la tienda online.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => {
                            setEditingProduct({
                                id: Date.now().toString(),
                                name: '',
                                price: '',
                                category: storeCategories[0] || '',
                                desc: '',
                                image: '',
                                images: [],
                                is_active: true
                            });
                            setIsCustomCategoryMode(false);
                            setIsProductModalOpen(true);
                        }}
                        style={{
                            padding: '10px 20px',
                            borderRadius: '12px',
                            border: 'none',
                            background: 'var(--primary-paddle, #10b981)',
                            color: '#000',
                            fontWeight: '700',
                            fontSize: '13px',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}
                    >
                        ＋ Agregar Producto
                    </button>
                </div>

                {/* Products Grid / List */}
                {(!formData.metadata?.store_products || formData.metadata.store_products.length === 0) ? (
                    <div style={{ textAlign: 'center', padding: '36px', border: '1.5px dashed var(--border)', borderRadius: '16px', color: 'var(--text-secondary)', background: 'var(--bg-main)' }}>
                        <div style={{ fontSize: '36px', marginBottom: '8px' }}>🛒</div>
                        <p style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600' }}>Aún no tienes productos cargados en tu catálogo.</p>
                        <button
                            type="button"
                            onClick={() => {
                                setEditingProduct({
                                    id: Date.now().toString(),
                                    name: '',
                                    price: '',
                                    category: storeCategories[0] || '',
                                    desc: '',
                                    image: '',
                                    images: [],
                                    is_active: true
                                });
                                setIsCustomCategoryMode(false);
                                setIsProductModalOpen(true);
                            }}
                            style={{
                                padding: '10px 20px',
                                borderRadius: '12px',
                                border: '1px solid var(--primary-paddle, #10b981)',
                                background: 'transparent',
                                color: 'var(--text-primary)',
                                fontWeight: '700',
                                fontSize: '13px',
                                cursor: 'pointer'
                            }}
                        >
                            ＋ Agregar Primer Producto
                        </button>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(250px, 1fr))', gap: '16px' }}>
                        {(formData.metadata.store_products || []).map((prod, idx) => (
                            <div
                                key={prod.id || idx}
                                style={{
                                    border: '1px solid var(--border)',
                                    borderRadius: '16px',
                                    padding: '14px',
                                    backgroundColor: 'var(--bg-main)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'space-between',
                                    gap: '12px'
                                }}
                            >
                                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                    <img
                                        src={prod.image || prod.images?.[0] || 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=200&q=80'}
                                        alt={prod.name}
                                        style={{ width: '54px', height: '54px', borderRadius: '12px', objectFit: 'cover', border: '1px solid var(--border)', flexShrink: 0 }}
                                    />
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--primary-paddle, #10b981)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                                            {prod.category || 'General'}
                                        </div>
                                        <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {prod.name}
                                        </div>
                                        <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-primary)', marginTop: '2px' }}>
                                            ${Number(prod.price).toLocaleString('es-AR')}
                                        </div>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: '10px' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                                        <input
                                            type="checkbox"
                                            checked={prod.is_active !== false}
                                            onChange={async (e) => {
                                                const updated = (formData.metadata?.store_products || []).map((p, i) =>
                                                    i === idx ? { ...p, is_active: e.target.checked } : p
                                                );
                                                handleMetadataChange('store_products', updated);
                                                if (!(await handleSave({ metadata: { ...formData.metadata, store_products: updated } }))) return;
                                                if (showToast) showToast(e.target.checked ? 'Producto visible' : 'Producto oculto', 'info');
                                            }}
                                            style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                                        />
                                        <span style={{ fontSize: '12px', fontWeight: '600', color: prod.is_active !== false ? '#10b981' : 'var(--text-secondary)' }}>
                                            {prod.is_active !== false ? 'Visible' : 'Oculto'}
                                        </span>
                                    </label>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setEditingProduct({ ...prod });
                                                setIsCustomCategoryMode(!storeCategories.includes(prod.category) && !!prod.category);
                                                setIsProductModalOpen(true);
                                            }}
                                            style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: '8px', padding: '4px 10px', fontSize: '12px', cursor: 'pointer', color: 'var(--text-primary)' }}
                                        >
                                            ✏️ Editar
                                        </button>
                                        <button
                                            type="button"
                                            onClick={async () => {
                                                const updated = (formData.metadata.store_products || []).filter((_, i) => i !== idx);
                                                handleMetadataChange('store_products', updated);
                                                if (!(await handleSave({ metadata: { ...formData.metadata, store_products: updated } }))) return;
                                                if (showToast) showToast('Producto eliminado', 'info');
                                            }}
                                            style={{ background: 'transparent', border: 'none', color: '#ef4444', fontSize: '14px', cursor: 'pointer' }}
                                            title="Eliminar producto"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ======================================================== */}
            {/* SECCIÓN 4: ADICIONALES PARA RESERVAS DE TURNOS           */}
            {/* ======================================================== */}
            <div style={{ background: 'var(--bg-card)', padding: '24px', borderRadius: '18px', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '20px' }}>⚡</span>
                            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)' }}>
                                Adicionales para Reservas de Turnos ({formData.additional_services?.length || 0})
                            </h3>
                        </div>
                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
                            Servicios extras o productos que el cliente puede sumar cuando reserva su turno. Podes definir si son servicios únicos o con cantidades, y a qué servicios aplican.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={() => {
                            setEditingExtra({
                                id: Date.now().toString(),
                                name: '',
                                price: '',
                                desc: '',
                                image: '',
                                is_active: true,
                                allow_quantity: false, // Por defecto servicio único
                                applicable_to: 'all',  // Por defecto general
                                applicable_services: []
                            });
                            setIsExtraModalOpen(true);
                        }}
                        style={{
                            padding: '10px 20px',
                            borderRadius: '12px',
                            border: 'none',
                            background: 'var(--primary-paddle, #10b981)',
                            color: '#000',
                            fontWeight: '700',
                            fontSize: '13px',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}
                    >
                        ＋ Agregar Adicional de Turno
                    </button>
                </div>

                {(!formData.additional_services || formData.additional_services.length === 0) ? (
                    <div style={{ textAlign: 'center', padding: '36px', border: '1.5px dashed var(--border)', borderRadius: '16px', color: 'var(--text-secondary)', background: 'var(--bg-main)' }}>
                        <div style={{ fontSize: '36px', marginBottom: '8px' }}>⚡</div>
                        <p style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600' }}>No tienes adicionales de turno cargados.</p>
                        <button
                            type="button"
                            onClick={() => {
                                setEditingExtra({
                                    id: Date.now().toString(),
                                    name: '',
                                    price: '',
                                    desc: '',
                                    image: '',
                                    is_active: true,
                                    allow_quantity: false,
                                    applicable_to: 'all',
                                    applicable_services: []
                                });
                                setIsExtraModalOpen(true);
                            }}
                            style={{
                                padding: '10px 20px',
                                borderRadius: '12px',
                                border: '1px solid var(--border)',
                                background: 'var(--bg-card)',
                                color: 'var(--text-primary)',
                                fontWeight: '700',
                                fontSize: '13px',
                                cursor: 'pointer'
                            }}
                        >
                            ＋ Agregar Primer Adicional
                        </button>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                        {(formData.additional_services || []).map((extra, idx) => {
                            const isSingleService = !extra.allow_quantity;
                            const isGeneral = !extra.applicable_services || extra.applicable_services.length === 0 || extra.applicable_to === 'all';
                            const linkedServicesCount = extra.applicable_services?.length || 0;

                            return (
                                <div
                                    key={extra.id || idx}
                                    style={{
                                        border: '1px solid var(--border)',
                                        borderRadius: '16px',
                                        padding: '16px',
                                        backgroundColor: 'var(--bg-main)',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        justifyContent: 'space-between',
                                        gap: '14px'
                                    }}
                                >
                                    <div>
                                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '10px' }}>
                                            <img
                                                src={extra.image || extra.image_url || 'https://images.unsplash.com/photo-1616788494707-ec28f08d05a1?w=200&q=80'}
                                                alt={extra.name}
                                                style={{ width: '54px', height: '54px', borderRadius: '12px', objectFit: 'cover', border: '1px solid var(--border)', flexShrink: 0 }}
                                            />
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {extra.name}
                                                </div>
                                                <div style={{ fontSize: '14px', fontWeight: '800', color: 'var(--primary-paddle, #10b981)', marginTop: '2px' }}>
                                                    +${Number(extra.price).toLocaleString('es-AR')}
                                                </div>
                                                {extra.desc && (
                                                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        {extra.desc}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Status & Scope Badges */}
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                            <span style={{
                                                fontSize: '11px',
                                                fontWeight: '700',
                                                padding: '3px 8px',
                                                borderRadius: '6px',
                                                background: isSingleService ? 'rgba(59, 130, 246, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                                                color: isSingleService ? '#2563eb' : '#d97706'
                                            }}>
                                                {isSingleService ? '👤 Servicio Único (1 uso)' : '📦 Con Cantidades (1, 2, 3...)'}
                                            </span>

                                            <span style={{
                                                fontSize: '11px',
                                                fontWeight: '700',
                                                padding: '3px 8px',
                                                borderRadius: '6px',
                                                background: isGeneral ? 'rgba(16, 185, 129, 0.12)' : 'rgba(139, 92, 246, 0.12)',
                                                color: isGeneral ? '#059669' : '#7c3aed'
                                            }}>
                                                {isGeneral ? '🌐 Todos los servicios' : `🎯 Solo ${linkedServicesCount} servicio(s)`}
                                            </span>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: '10px' }}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                                            <input
                                                type="checkbox"
                                                checked={extra.is_active !== false}
                                                onChange={async (e) => {
                                                    const updated = (formData.additional_services || []).map((ex, i) =>
                                                        i === idx ? { ...ex, is_active: e.target.checked } : ex
                                                    );
                                                    handleInputChange('additional_services', updated);
                                                    if (!(await handleSave({ additional_services: updated }))) return;
                                                    if (showToast) showToast(e.target.checked ? 'Adicional activado' : 'Adicional pausado', 'info');
                                                }}
                                                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                                            />
                                            <span style={{ fontSize: '12px', fontWeight: '600', color: extra.is_active !== false ? '#10b981' : 'var(--text-secondary)' }}>
                                                {extra.is_active !== false ? 'Activo' : 'Inactivo'}
                                            </span>
                                        </label>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setEditingExtra({
                                                        ...extra,
                                                        allow_quantity: !!extra.allow_quantity,
                                                        applicable_to: extra.applicable_to || (extra.applicable_services?.length > 0 ? 'specific' : 'all'),
                                                        applicable_services: extra.applicable_services || []
                                                    });
                                                    setIsExtraModalOpen(true);
                                                }}
                                                style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: '8px', padding: '4px 10px', fontSize: '12px', cursor: 'pointer', color: 'var(--text-primary)' }}
                                            >
                                                ✏️ Editar
                                            </button>
                                            <button
                                                type="button"
                                                onClick={async () => {
                                                    const updated = (formData.additional_services || []).filter((_, i) => i !== idx);
                                                    handleInputChange('additional_services', updated);
                                                    if (!(await handleSave({ additional_services: updated }))) return;
                                                    if (showToast) showToast('Adicional eliminado', 'info');
                                                }}
                                                style={{ background: 'transparent', border: 'none', color: '#ef4444', fontSize: '14px', cursor: 'pointer' }}
                                                title="Eliminar adicional"
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ======================================================== */}
            {/* MODAL: CREAR / EDITAR PRODUCTO                           */}
            {/* ======================================================== */}
            {isProductModalOpen && editingProduct && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    backgroundColor: 'rgba(0,0,0,0.6)',
                    backdropFilter: 'blur(4px)',
                    zIndex: 1100,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '20px'
                }}>
                    <div style={{
                        backgroundColor: 'var(--bg-card)',
                        borderRadius: '20px',
                        padding: '24px',
                        maxWidth: '500px',
                        width: '100%',
                        border: '1px solid var(--border)',
                        boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '16px',
                        maxHeight: '90vh',
                        overflowY: 'auto'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)' }}>
                                {formData.metadata?.store_products?.some(p => p.id === editingProduct.id) ? 'Editar Producto' : '＋ Nuevo Producto'}
                            </h3>
                            <button
                                type="button"
                                onClick={() => setIsProductModalOpen(false)}
                                style={{ background: 'transparent', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--text-secondary)' }}
                            >
                                ✕
                            </button>
                        </div>

                        <div>
                            <label style={labelStyle}>Nombre del Producto</label>
                            <input
                                type="text"
                                style={inputStyle}
                                value={editingProduct.name || ''}
                                placeholder="Ej: Crema Hidratante, Esmalte OPI, Aceite para Barba..."
                                onChange={e => setEditingProduct(prev => ({ ...prev, name: e.target.value }))}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '12px' }}>
                            <div style={{ flex: 1 }}>
                                <label style={labelStyle}>Precio ($)</label>
                                <input
                                    type="number"
                                    style={inputStyle}
                                    value={editingProduct.price || ''}
                                    placeholder="Ej: 4500"
                                    onChange={e => setEditingProduct(prev => ({ ...prev, price: e.target.value === '' ? '' : parseInt(e.target.value) || 0 }))}
                                />
                            </div>

                            <div style={{ flex: 1.2 }}>
                                <label style={labelStyle}>Categoría</label>
                                {!isCustomCategoryMode && storeCategories.length > 0 ? (
                                    <div style={{ display: 'flex', gap: '6px' }}>
                                        <select
                                            style={{ ...inputStyle, flex: 1 }}
                                            value={editingProduct.category || ''}
                                            onChange={e => {
                                                if (e.target.value === '__NEW__') {
                                                    setIsCustomCategoryMode(true);
                                                    setEditingProduct(prev => ({ ...prev, category: '' }));
                                                } else {
                                                    setEditingProduct(prev => ({ ...prev, category: e.target.value }));
                                                }
                                            }}
                                        >
                                            <option value="">Seleccionar categoría...</option>
                                            {storeCategories.map(cat => (
                                                <option key={cat} value={cat}>{cat}</option>
                                            ))}
                                            <option value="__NEW__">➕ Crear nueva categoría...</option>
                                        </select>
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', gap: '6px' }}>
                                        <input
                                            type="text"
                                            style={{ ...inputStyle, flex: 1 }}
                                            placeholder="Nueva categoría..."
                                            value={editingProduct.category || ''}
                                            onChange={e => setEditingProduct(prev => ({ ...prev, category: e.target.value }))}
                                        />
                                        {storeCategories.length > 0 && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setIsCustomCategoryMode(false);
                                                    setEditingProduct(prev => ({ ...prev, category: storeCategories[0] || '' }));
                                                }}
                                                style={{ padding: '0 8px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-main)', cursor: 'pointer', fontSize: '11px', color: 'var(--text-secondary)' }}
                                                title="Elegir categoría existente"
                                            >
                                                Lista
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div>
                            <label style={labelStyle}>Descripción corta (opcional)</label>
                            <input
                                type="text"
                                style={inputStyle}
                                value={editingProduct.desc || ''}
                                placeholder="Ej: Contenido neto 250ml, fórmula hipoalergénica..."
                                onChange={e => setEditingProduct(prev => ({ ...prev, desc: e.target.value }))}
                            />
                        </div>

                        <div>
                            <label style={labelStyle}>Imágenes del Producto</label>
                            {((Array.isArray(editingProduct.images) && editingProduct.images.length > 0) || editingProduct.image) && (
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
                                    {(Array.isArray(editingProduct.images) && editingProduct.images.length > 0
                                        ? editingProduct.images
                                        : [editingProduct.image]
                                    ).filter(Boolean).map((imgUrl, iIdx) => (
                                        <div key={iIdx} style={{ position: 'relative', width: '60px', height: '60px' }}>
                                            <img
                                                src={imgUrl}
                                                alt={`Foto ${iIdx + 1}`}
                                                style={{
                                                    width: '100%',
                                                    height: '100%',
                                                    borderRadius: '12px',
                                                    objectFit: 'cover',
                                                    border: (editingProduct.image === imgUrl || (!editingProduct.image && iIdx === 0)) ? '2px solid var(--primary-paddle, #10b981)' : '1px solid var(--border)'
                                                }}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const currentList = Array.isArray(editingProduct.images) && editingProduct.images.length > 0
                                                        ? editingProduct.images
                                                        : [editingProduct.image];
                                                    const newImgs = currentList.filter((_, idx) => idx !== iIdx);
                                                    setEditingProduct(prev => ({
                                                        ...prev,
                                                        images: newImgs,
                                                        image: newImgs[0] || null
                                                    }));
                                                }}
                                                style={{
                                                    position: 'absolute',
                                                    top: '-6px',
                                                    right: '-6px',
                                                    width: '20px',
                                                    height: '20px',
                                                    borderRadius: '50%',
                                                    background: '#ef4444',
                                                    color: '#fff',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    fontSize: '11px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center'
                                                }}
                                                title="Eliminar foto"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <label style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                width: '100%',
                                padding: '12px 16px',
                                borderRadius: '12px',
                                border: '1px dashed var(--border)',
                                background: 'var(--bg-main)',
                                color: 'var(--text-primary)',
                                fontSize: '13px',
                                fontWeight: '600',
                                cursor: uploadingProductImage ? 'wait' : 'pointer'
                            }}>
                                {uploadingProductImage ? '⏳ Subiendo imágenes...' : '📷 Subir Imágenes (Seleccionar 1 o varias)'}
                                <input
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    disabled={uploadingProductImage}
                                    style={{ display: 'none' }}
                                    onChange={async (e) => {
                                        const files = Array.from(e.target.files || []);
                                        if (files.length === 0) return;
                                        try {
                                            setUploadingProductImage(true);
                                            const uploadPromises = files.map(file => serviceAdapter.uploadImage(file));
                                            const uploadedUrls = await Promise.all(uploadPromises);

                                            setEditingProduct(prev => {
                                                const existingImages = Array.isArray(prev.images) && prev.images.length > 0
                                                    ? prev.images
                                                    : (prev.image ? [prev.image] : []);
                                                const combined = [...existingImages, ...uploadedUrls.filter(Boolean)];
                                                return {
                                                    ...prev,
                                                    images: combined,
                                                    image: combined[0] || null
                                                };
                                            });
                                            if (showToast) showToast(`${uploadedUrls.length} imagen(es) subida(s)`, 'success');
                                        } catch (err) {
                                            console.error('Error uploading product images:', err);
                                            if (showToast) showToast('Error al subir imágenes', 'error');
                                        } finally {
                                            setUploadingProductImage(false);
                                            e.target.value = '';
                                        }
                                    }}
                                />
                            </label>
                        </div>

                        <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                            <button
                                type="button"
                                onClick={() => setIsProductModalOpen(false)}
                                style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: '600' }}
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={async () => {
                                    if (!editingProduct.name || !editingProduct.name.trim()) {
                                        if (showToast) showToast('Ingresá el nombre del producto', 'error');
                                        return;
                                    }
                                    const finalImages = Array.isArray(editingProduct.images) && editingProduct.images.length > 0
                                        ? editingProduct.images
                                        : (editingProduct.image ? [editingProduct.image] : []);
                                    const prodCategory = (editingProduct.category || '').trim() || 'General';

                                    const prodToSave = {
                                        ...editingProduct,
                                        name: editingProduct.name.trim(),
                                        price: Number(editingProduct.price) || 0,
                                        category: prodCategory,
                                        images: finalImages,
                                        image: finalImages[0] || null
                                    };

                                    // Add to store_categories if newly created
                                    let newCategories = storeCategories;
                                    if (prodCategory && !storeCategories.includes(prodCategory)) {
                                        newCategories = [...storeCategories, prodCategory];
                                        handleMetadataChange('store_categories', newCategories);
                                    }

                                    const currentProducts = formData.metadata?.store_products || [];
                                    const existingIdx = currentProducts.findIndex(p => p.id === prodToSave.id);
                                    let updated;
                                    if (existingIdx >= 0) {
                                        updated = [...currentProducts];
                                        updated[existingIdx] = prodToSave;
                                    } else {
                                        updated = [...currentProducts, { ...prodToSave, id: Date.now().toString() }];
                                    }

                                    handleMetadataChange('store_products', updated);
                                    setIsProductModalOpen(false);
                                    await handleSave({
                                        metadata: {
                                            ...formData.metadata,
                                            store_products: updated,
                                            store_categories: newCategories
                                        }
                                    });
                                    if (showToast) showToast('Producto guardado', 'success');
                                }}
                                style={{ flex: 2, ...saveButtonStyle, marginTop: 0 }}
                            >
                                Guardar Producto
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ======================================================== */}
            {/* MODAL: CREAR / EDITAR ADICIONAL DE TURNO                 */}
            {/* ======================================================== */}
            {isExtraModalOpen && editingExtra && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    backgroundColor: 'rgba(0,0,0,0.6)',
                    backdropFilter: 'blur(4px)',
                    zIndex: 1100,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '20px'
                }}>
                    <div style={{
                        backgroundColor: 'var(--bg-card)',
                        borderRadius: '20px',
                        padding: '24px',
                        maxWidth: '520px',
                        width: '100%',
                        border: '1px solid var(--border)',
                        boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '16px',
                        maxHeight: '90vh',
                        overflowY: 'auto'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)' }}>
                                    {formData.additional_services?.some(e => e.id === editingExtra.id) ? 'Editar Adicional de Turno' : '⚡ Nuevo Adicional de Turno'}
                                </h3>
                                <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                                    Se ofrecerá al cliente en el paso de reserva en el calendario.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsExtraModalOpen(false)}
                                style={{ background: 'transparent', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--text-secondary)' }}
                            >
                                ✕
                            </button>
                        </div>

                        <div>
                            <label style={labelStyle}>Nombre del Adicional</label>
                            <input
                                type="text"
                                style={inputStyle}
                                value={editingExtra.name || ''}
                                placeholder="Ej: Lavado y Masaje, Esmaltado Especial, Agua Mineral..."
                                onChange={e => setEditingExtra(prev => ({ ...prev, name: e.target.value }))}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '12px' }}>
                            <div style={{ flex: 1 }}>
                                <label style={labelStyle}>Precio Adicional ($)</label>
                                <input
                                    type="number"
                                    style={inputStyle}
                                    value={editingExtra.price || ''}
                                    placeholder="Ej: 1500"
                                    onChange={e => setEditingExtra(prev => ({ ...prev, price: e.target.value === '' ? '' : parseInt(e.target.value) || 0 }))}
                                />
                            </div>
                            <div style={{ flex: 1 }}>
                                <label style={labelStyle}>Descripción corta</label>
                                <input
                                    type="text"
                                    style={inputStyle}
                                    value={editingExtra.desc || ''}
                                    placeholder="Ej: Opcional, 15 min extra..."
                                    onChange={e => setEditingExtra(prev => ({ ...prev, desc: e.target.value }))}
                                />
                            </div>
                        </div>

                        {/* NUEVO: Modalidad de Cantidad (Servicio Único vs Producto con Cantidades) */}
                        <div style={{ background: 'var(--bg-main)', padding: '14px', borderRadius: '14px', border: '1px solid var(--border)' }}>
                            <label style={{ ...labelStyle, marginBottom: '8px', display: 'block' }}>
                                Tipo de Adicional y Cantidades
                            </label>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                <label style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '4px',
                                    padding: '10px 12px',
                                    borderRadius: '10px',
                                    border: !editingExtra.allow_quantity ? '2px solid var(--primary-paddle, #10b981)' : '1px solid var(--border)',
                                    background: !editingExtra.allow_quantity ? 'rgba(16, 185, 129, 0.08)' : 'var(--bg-card)',
                                    cursor: 'pointer'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <input
                                            type="radio"
                                            name="allow_quantity_radio"
                                            checked={!editingExtra.allow_quantity}
                                            onChange={() => setEditingExtra(prev => ({ ...prev, allow_quantity: false }))}
                                            style={{ accentColor: 'var(--primary-paddle, #10b981)' }}
                                        />
                                        <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>
                                            👤 Servicio Único
                                        </span>
                                    </div>
                                    <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.3 }}>
                                        Se suma 1 sola vez por reserva (ej: lavado, diseño, toalla).
                                    </p>
                                </label>

                                <label style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '4px',
                                    padding: '10px 12px',
                                    borderRadius: '10px',
                                    border: editingExtra.allow_quantity ? '2px solid var(--primary-paddle, #10b981)' : '1px solid var(--border)',
                                    background: editingExtra.allow_quantity ? 'rgba(16, 185, 129, 0.08)' : 'var(--bg-card)',
                                    cursor: 'pointer'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <input
                                            type="radio"
                                            name="allow_quantity_radio"
                                            checked={!!editingExtra.allow_quantity}
                                            onChange={() => setEditingExtra(prev => ({ ...prev, allow_quantity: true }))}
                                            style={{ accentColor: 'var(--primary-paddle, #10b981)' }}
                                        />
                                        <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>
                                            📦 Con Cantidades
                                        </span>
                                    </div>
                                    <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.3 }}>
                                        El cliente puede elegir 1, 2, 3 o más unidades con +/- (ej: bebidas, ampollas).
                                    </p>
                                </label>
                            </div>
                        </div>

                        {/* NUEVO: Segmentación por Servicio (General vs Específico) */}
                        <div style={{ background: 'var(--bg-main)', padding: '14px', borderRadius: '14px', border: '1px solid var(--border)' }}>
                            <label style={{ ...labelStyle, marginBottom: '8px', display: 'block' }}>
                                ¿A qué servicios aplica este adicional?
                            </label>
                            <div style={{ display: 'flex', gap: '16px', marginBottom: '10px' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
                                    <input
                                        type="radio"
                                        name="applicable_to_radio"
                                        checked={editingExtra.applicable_to !== 'specific'}
                                        onChange={() => setEditingExtra(prev => ({ ...prev, applicable_to: 'all', applicable_services: [] }))}
                                        style={{ accentColor: 'var(--primary-paddle, #10b981)' }}
                                    />
                                    <span>🌐 Para todos los servicios (General)</span>
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
                                    <input
                                        type="radio"
                                        name="applicable_to_radio"
                                        checked={editingExtra.applicable_to === 'specific'}
                                        onChange={() => setEditingExtra(prev => ({ ...prev, applicable_to: 'specific' }))}
                                        style={{ accentColor: 'var(--primary-paddle, #10b981)' }}
                                    />
                                    <span>🎯 Servicios específicos</span>
                                </label>
                            </div>

                            {/* Checklist of Services */}
                            {editingExtra.applicable_to === 'specific' && (
                                <div style={{
                                    marginTop: '10px',
                                    paddingTop: '10px',
                                    borderTop: '1px dashed var(--border)',
                                    maxHeight: '160px',
                                    overflowY: 'auto'
                                }}>
                                    {businessServices.length === 0 ? (
                                        <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)' }}>
                                            No tienes servicios cargados en el negocio para vincular.
                                        </p>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                                    Tilda los servicios que ofrecerán este adicional:
                                                </span>
                                                <div style={{ display: 'flex', gap: '6px' }}>
                                                    <button
                                                        type="button"
                                                        onClick={() => setEditingExtra(prev => ({
                                                            ...prev,
                                                            applicable_services: businessServices.map(s => s.id)
                                                        }))}
                                                        style={{ background: 'transparent', border: 'none', color: 'var(--primary-paddle, #10b981)', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}
                                                    >
                                                        Todos
                                                    </button>
                                                    <span style={{ color: 'var(--border)' }}>|</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => setEditingExtra(prev => ({
                                                            ...prev,
                                                            applicable_services: []
                                                        }))}
                                                        style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontSize: '11px', fontWeight: '600', cursor: 'pointer' }}
                                                    >
                                                        Ninguno
                                                    </button>
                                                </div>
                                            </div>

                                            {businessServices.map(srv => {
                                                const isChecked = (editingExtra.applicable_services || []).includes(srv.id);
                                                return (
                                                    <label
                                                        key={srv.id}
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '8px',
                                                            padding: '6px 10px',
                                                            borderRadius: '8px',
                                                            background: isChecked ? 'rgba(16, 185, 129, 0.08)' : 'var(--bg-card)',
                                                            border: isChecked ? '1px solid var(--primary-paddle, #10b981)' : '1px solid var(--border)',
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={isChecked}
                                                            onChange={e => {
                                                                const currentList = editingExtra.applicable_services || [];
                                                                const updated = e.target.checked
                                                                    ? [...currentList, srv.id]
                                                                    : currentList.filter(id => id !== srv.id);
                                                                setEditingExtra(prev => ({ ...prev, applicable_services: updated }));
                                                            }}
                                                            style={{ accentColor: 'var(--primary-paddle, #10b981)', width: '15px', height: '15px' }}
                                                        />
                                                        <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', flex: 1 }}>
                                                            {srv.name}
                                                        </span>
                                                        {srv.category && (
                                                            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                                                ({srv.category})
                                                            </span>
                                                        )}
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div>
                            <label style={labelStyle}>Imagen del Adicional</label>
                            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                {editingExtra.image && (
                                    <img
                                        src={editingExtra.image}
                                        alt="Preview"
                                        style={{ width: '56px', height: '56px', borderRadius: '12px', objectFit: 'cover', border: '1px solid var(--border)' }}
                                    />
                                )}
                                <label style={{
                                    flex: 1,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    padding: '10px 16px',
                                    borderRadius: '12px',
                                    border: '1px dashed var(--border)',
                                    background: 'var(--bg-main)',
                                    color: 'var(--text-primary)',
                                    fontSize: '13px',
                                    fontWeight: '600',
                                    cursor: uploadingExtraImage ? 'wait' : 'pointer'
                                }}>
                                    {uploadingExtraImage ? '⏳ Subiendo...' : (editingExtra.image ? '📷 Cambiar Imagen' : '📷 Subir Imagen')}
                                    <input
                                        type="file"
                                        accept="image/*"
                                        disabled={uploadingExtraImage}
                                        style={{ display: 'none' }}
                                        onChange={async (e) => {
                                            const file = e.target.files?.[0];
                                            if (!file) return;
                                            try {
                                                setUploadingExtraImage(true);
                                                const publicUrl = await serviceAdapter.uploadImage(file);
                                                setEditingExtra(prev => ({ ...prev, image: publicUrl }));
                                                if (showToast) showToast('Imagen subida correctamente', 'success');
                                            } catch (err) {
                                                console.error('Error uploading extra image:', err);
                                                if (showToast) showToast('Error al subir imagen', 'error');
                                            } finally {
                                                setUploadingExtraImage(false);
                                                e.target.value = '';
                                            }
                                        }}
                                    />
                                </label>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                            <button
                                type="button"
                                onClick={() => setIsExtraModalOpen(false)}
                                style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: '600' }}
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={async () => {
                                    if (!editingExtra.name || !editingExtra.name.trim()) {
                                        if (showToast) showToast('Ingresá el nombre del adicional', 'error');
                                        return;
                                    }

                                    const extraToSave = {
                                        ...editingExtra,
                                        name: editingExtra.name.trim(),
                                        price: Number(editingExtra.price) || 0,
                                        allow_quantity: !!editingExtra.allow_quantity,
                                        applicable_to: editingExtra.applicable_to || 'all',
                                        applicable_services: editingExtra.applicable_to === 'specific' ? (editingExtra.applicable_services || []) : []
                                    };

                                    const currentExtras = formData.additional_services || [];
                                    const existingIdx = currentExtras.findIndex(e => e.id === extraToSave.id);
                                    let updated;
                                    if (existingIdx >= 0) {
                                        updated = [...currentExtras];
                                        updated[existingIdx] = extraToSave;
                                    } else {
                                        updated = [...currentExtras, { ...extraToSave, id: Date.now().toString() }];
                                    }

                                    handleInputChange('additional_services', updated);
                                    setIsExtraModalOpen(false);
                                    if (!(await handleSave({ additional_services: updated }))) return;
                                    if (showToast) showToast('Adicional guardado correctamente', 'success');
                                }}
                                style={{ flex: 2, ...saveButtonStyle, marginTop: 0 }}
                            >
                                Guardar Adicional
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
