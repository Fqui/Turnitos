import React, { useState } from 'react';
import serviceAdapter from '../../../services/serviceAdapter';

export default function VenueStoreTab({
    formData,
    handleInputChange,
    handleMetadataChange,
    isMobile,
    showToast,
    cardStyle,
    sectionTitleStyle,
    labelStyle,
    inputStyle,
    buttonStyle
}) {
    const [editingProduct, setEditingProduct] = useState(null);
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [uploadingProductImage, setUploadingProductImage] = useState(false);
    const [uploadingBannerImage, setUploadingBannerImage] = useState(false);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Store Switch & Banner Config Card */}
            <div style={cardStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                        <h2 style={sectionTitleStyle}>Configuración de la Tienda</h2>
                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
                            Activa tu e-commerce y personaliza el banner promocional.
                        </p>
                    </div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', background: 'var(--bg-main)', padding: '8px 16px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                        <span style={{ fontSize: '14px', fontWeight: '700', color: formData.store_enabled ? 'var(--primary-paddle)' : 'var(--text-secondary)' }}>
                            {formData.store_enabled ? '🟢 Tienda Habilitada' : '⚪ Tienda Deshabilitada'}
                        </span>
                        <input
                            type="checkbox"
                            checked={!!formData.store_enabled}
                            onChange={e => handleInputChange('store_enabled', e.target.checked)}
                            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                        />
                    </label>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '16px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                    {/* Multi-banner Advertising Manager */}
                    <div>
                        <label style={labelStyle}>
                            Banners Publicitarios de la Tienda
                        </label>
                        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0 0 12px 0' }}>
                            Podés cargar uno o varios banners publicitarios. Si cargás más de uno, la tienda mostrará un carrusel automático con transiciones suaves. Medida recomendada: <strong>1200 x 400 px</strong>.
                        </p>

                        {(() => {
                            const banners = Array.isArray(formData.metadata?.store_banners) && formData.metadata.store_banners.length > 0
                                ? formData.metadata.store_banners
                                : (formData.metadata?.store_banner_image ? [formData.metadata.store_banner_image] : []);

                            const handleRemoveBanner = (indexToRemove) => {
                                const updated = banners.filter((_, idx) => idx !== indexToRemove);
                                handleMetadataChange('store_banners', updated);
                                handleMetadataChange('store_banner_image', updated[0] || '');
                            };

                            const handleAddBanner = (newUrl) => {
                                const updated = [...banners, newUrl];
                                handleMetadataChange('store_banners', updated);
                                handleMetadataChange('store_banner_image', updated[0] || newUrl);
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
                                                        handleAddBanner(url);
                                                        if (showToast) showToast('Banner agregado correctamente', 'success');
                                                    } catch (err) {
                                                        console.error('Error uploading banner image:', err);
                                                        if (showToast) showToast('Error al subir banner', 'error');
                                                    } finally {
                                                        setUploadingBannerImage(false);
                                                    }
                                                }}
                                            />
                                        </label>

                                        {banners.length > 0 && (
                                            <span style={{ fontSize: '12px', color: '#10b981', fontWeight: '600' }}>
                                                ✓ {banners.length} {banners.length === 1 ? 'banner activo' : 'banners activos (carrusel)'}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                </div>
            </div>

            {/* Product Catalog Card */}
            <div style={cardStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                        <h2 style={sectionTitleStyle}>Catálogo de Productos</h2>
                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
                            Gestiona los artículos, alquileres y bebidas que vendes en tu local.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => {
                            setEditingProduct({ id: Date.now().toString(), name: '', price: '', category: 'General', desc: '', image: '', images: [], is_active: true });
                            setIsProductModalOpen(true);
                        }}
                        style={buttonStyle}
                    >
                        + Agregar Producto
                    </button>
                </div>

                {/* Products Grid / List */}
                {(!formData.metadata?.store_products || formData.metadata.store_products.length === 0) ? (
                    <div style={{ textAlign: 'center', padding: '32px', border: '1px dashed var(--border)', borderRadius: '16px', color: 'var(--text-secondary)' }}>
                        <div style={{ fontSize: '32px', marginBottom: '8px' }}>🛒</div>
                        <p style={{ margin: '0 0 12px 0', fontSize: '14px' }}>Aún no agregaste productos a tu catálogo.</p>
                        <button
                            type="button"
                            onClick={() => {
                                const defaultProducts = [
                                    { id: '1', name: 'Tubo Pelotas Padel Premium', price: 8500, category: 'Pelotas', image: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=400&q=80', desc: 'Presurizador de alta duración', is_active: true },
                                    { id: '2', name: 'Pack x3 Overgrips Wilson', price: 4000, category: 'Accesorios', image: 'https://images.unsplash.com/photo-1622279457486-62dcc4a4b1ca?w=400&q=80', desc: 'Máximo agarre y absorción', is_active: true },
                                    { id: '3', name: 'Alquiler Pala Bullpadel Vertex', price: 2000, category: 'Alquileres', image: 'https://images.unsplash.com/photo-1616788494707-ec28f08d05a1?w=400&q=80', desc: 'Pala de potencia profesional', is_active: true },
                                    { id: '4', name: 'Gatorade Manzana 500ml', price: 2500, category: 'Bebidas', image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400&q=80', desc: 'Hidratación rápida', is_active: true },
                                    { id: '5', name: 'Remera Oficial Cancha Apolo', price: 18000, category: 'Indumentaria', image: 'https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=400&q=80', desc: 'Tela dry-fit respirable', is_active: true }
                                ];
                                handleMetadataChange('store_products', defaultProducts);
                            }}
                            style={{ ...buttonStyle, background: 'transparent', border: '1px solid var(--primary-paddle)', color: 'var(--text-primary)' }}
                        >
                            ✨ Cargar Productos de Ejemplo
                        </button>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
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
                                        src={prod.image || 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=200&q=80'}
                                        alt={prod.name}
                                        style={{ width: '56px', height: '56px', borderRadius: '12px', objectFit: 'cover', border: '1px solid var(--border)' }}
                                    />
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--primary-paddle)', textTransform: 'uppercase' }}>
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
                                    <span style={{ fontSize: '12px', color: prod.is_active !== false ? '#10b981' : 'var(--text-secondary)', fontWeight: '600' }}>
                                        {prod.is_active !== false ? '● Activo' : '○ Inactivo'}
                                    </span>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setEditingProduct({ ...prod });
                                                setIsProductModalOpen(true);
                                            }}
                                            style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: '8px', padding: '4px 10px', fontSize: '12px', cursor: 'pointer', color: 'var(--text-primary)' }}
                                        >
                                            ✏️ Editar
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const updated = (formData.metadata.store_products || []).filter((_, i) => i !== idx);
                                                handleMetadataChange('store_products', updated);
                                            }}
                                            style={{ background: 'transparent', border: 'none', color: '#ef4444', fontSize: '14px', cursor: 'pointer' }}
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

            {/* Modal de Crear/Editar Producto */}
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
                        maxWidth: '480px',
                        width: '100%',
                        border: '1px solid var(--border)',
                        boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '16px'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)' }}>
                                {formData.metadata?.store_products?.some(p => p.id === editingProduct.id) ? 'Editar Producto' : 'Nuevo Producto'}
                            </h3>
                            <button
                                type="button"
                                onClick={() => setIsProductModalOpen(false)}
                                style={{ background: 'transparent', border: 'none', fontSize: '18px', cursor: 'pointer', color: 'var(--text-secondary)' }}
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
                                placeholder="Nombre del producto o artículo"
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
                                    placeholder="8500"
                                    onChange={e => setEditingProduct(prev => ({ ...prev, price: parseInt(e.target.value) || 0 }))}
                                />
                            </div>
                            <div style={{ flex: 1 }}>
                                <label style={labelStyle}>Categoría</label>
                                <input
                                    type="text"
                                    style={inputStyle}
                                    value={editingProduct.category || ''}
                                    placeholder="Escribí o elegí categoría..."
                                    list="venue-store-categories-list"
                                    onChange={e => setEditingProduct(prev => ({ ...prev, category: e.target.value }))}
                                />
                                <datalist id="venue-store-categories-list">
                                    {Array.from(new Set(['General', 'Bebidas', 'Snacks', 'Alquileres', 'Equipamiento', 'Indumentaria', 'Accesorios', 'Servicios', ...(formData.metadata?.store_products || []).map(p => p.category).filter(Boolean)])).map(cat => (
                                        <option key={cat} value={cat} />
                                    ))}
                                </datalist>
                            </div>
                        </div>

                        <div>
                            <label style={labelStyle}>Descripción corta</label>
                            <input
                                type="text"
                                style={inputStyle}
                                value={editingProduct.desc || ''}
                                placeholder="Descripción breve del producto..."
                                onChange={e => setEditingProduct(prev => ({ ...prev, desc: e.target.value }))}
                            />
                        </div>

                        <div>
                            <label style={labelStyle}>Imágenes del Producto (Podés subir varias fotos)</label>
                            
                            {/* Grid of uploaded images */}
                            {((Array.isArray(editingProduct.images) && editingProduct.images.length > 0) || editingProduct.image) && (
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
                                    {(Array.isArray(editingProduct.images) && editingProduct.images.length > 0
                                        ? editingProduct.images
                                        : [editingProduct.image]
                                    ).filter(Boolean).map((imgUrl, iIdx) => (
                                        <div key={iIdx} style={{ position: 'relative', width: '64px', height: '64px' }}>
                                            <img
                                                src={imgUrl}
                                                alt={`Foto ${iIdx + 1}`}
                                                style={{
                                                    width: '100%',
                                                    height: '100%',
                                                    borderRadius: '12px',
                                                    objectFit: 'cover',
                                                    border: (editingProduct.image === imgUrl || (!editingProduct.image && iIdx === 0)) ? '2px solid var(--primary-paddle)' : '1px solid var(--border)'
                                                }}
                                            />
                                            {/* Primary badge */}
                                            {(editingProduct.image === imgUrl || (!editingProduct.image && iIdx === 0)) && (
                                                <span style={{
                                                    position: 'absolute',
                                                    bottom: '2px',
                                                    left: '2px',
                                                    background: 'var(--primary-paddle)',
                                                    color: '#000',
                                                    fontSize: '9px',
                                                    fontWeight: '800',
                                                    padding: '1px 4px',
                                                    borderRadius: '4px'
                                                }}>
                                                    Principal
                                                </span>
                                            )}
                                            {/* Delete button */}
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
                                                    justifyContent: 'center',
                                                    boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
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
                                padding: '14px 16px',
                                borderRadius: '12px',
                                border: '1px dashed var(--border)',
                                background: 'var(--bg-main)',
                                color: 'var(--text-primary)',
                                fontSize: '13px',
                                fontWeight: '600',
                                cursor: uploadingProductImage ? 'wait' : 'pointer'
                            }}>
                                {uploadingProductImage ? '⏳ Subiendo fotos a la nube...' : '📷 Subir Fotos (Seleccionar 1 o varias desde tu dispositivo)'}
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
                                                const combined = [...existingImages, ...uploadedUrls];
                                                return {
                                                    ...prev,
                                                    images: combined,
                                                    image: combined[0] || null
                                                };
                                            });
                                            showToast(`${uploadedUrls.length} imagen(es) subida(s)`, 'success');
                                        } catch (err) {
                                            console.error('Error uploading product images:', err);
                                            showToast('Error al subir imágenes', 'error');
                                        } finally {
                                            setUploadingProductImage(false);
                                        }
                                    }}
                                />
                            </label>
                        </div>

                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginTop: '4px' }}>
                            <input
                                type="checkbox"
                                checked={editingProduct.is_active !== false}
                                onChange={e => setEditingProduct(prev => ({ ...prev, is_active: e.target.checked }))}
                            />
                            <span style={{ fontSize: '14px', color: 'var(--text-primary)' }}>Producto visible en la tienda</span>
                        </label>

                        <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                            <button
                                type="button"
                                onClick={() => setIsProductModalOpen(false)}
                                style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer' }}
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    if (!editingProduct.name) return;
                                    const currentProducts = formData.metadata?.store_products || [];
                                    const existingIdx = currentProducts.findIndex(p => p.id === editingProduct.id);
                                    let updated;
                                    if (existingIdx >= 0) {
                                        updated = [...currentProducts];
                                        updated[existingIdx] = editingProduct;
                                    } else {
                                        updated = [...currentProducts, { ...editingProduct, id: Date.now().toString() }];
                                    }
                                    handleMetadataChange('store_products', updated);
                                    setIsProductModalOpen(false);
                                }}
                                style={{ flex: 2, ...buttonStyle }}
                            >
                                Guardar Producto
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
