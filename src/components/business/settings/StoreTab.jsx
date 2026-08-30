import React, { useState } from 'react';
import serviceAdapter from '../../../services/serviceAdapter';

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
    const [uploadingProductImage, setUploadingProductImage] = useState(false);

    // Turn Extras management modal state
    const [isExtraModalOpen, setIsExtraModalOpen] = useState(false);
    const [editingExtra, setEditingExtra] = useState(null);
    const [uploadingExtraImage, setUploadingExtraImage] = useState(false);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Store Switch & Banner Config */}
            <div style={{ background: 'var(--bg-card)', padding: '24px', borderRadius: '16px', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800' }}>Configuración de la Tienda</h3>
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

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>Título del Banner Promocional</label>
                        <input
                            type="text"
                            style={inputStyle}
                            value={formData.metadata?.store_banner_title || ''}
                            placeholder=""
                            onChange={e => handleMetadataChange('store_banner_title', e.target.value)}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>Subtítulo del Banner Promocional</label>
                        <input
                            type="text"
                            style={inputStyle}
                            value={formData.metadata?.store_banner_subtitle || ''}
                            placeholder=""
                            onChange={e => handleMetadataChange('store_banner_subtitle', e.target.value)}
                        />
                    </div>
                </div>

                <button
                    type="button"
                    onClick={() => handleSave({ store_enabled: formData.store_enabled, metadata: formData.metadata })}
                    style={{ ...saveButtonStyle, marginTop: '20px' }}
                    disabled={saving}
                >
                    {saving ? 'Guardando...' : 'Guardar Ajustes de Tienda'}
                </button>
            </div>

            {/* Product Catalog Management */}
            <div style={{ background: 'var(--bg-card)', padding: '24px', borderRadius: '16px', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800' }}>Catálogo de Productos</h3>
                    <button
                        type="button"
                        onClick={() => {
                            setEditingProduct({ id: Date.now().toString(), name: '', price: '', category: 'General', desc: '', image: '', is_active: true });
                            setIsProductModalOpen(true);
                        }}
                        style={{
                            padding: '10px 20px',
                            borderRadius: '12px',
                            border: 'none',
                            background: 'var(--primary-paddle)',
                            color: '#000',
                            fontWeight: '700',
                            fontSize: '14px',
                            cursor: 'pointer'
                        }}
                    >
                        + Agregar Producto
                    </button>
                </div>

                {/* Products Grid / List */}
                {(!formData.metadata?.store_products || formData.metadata.store_products.length === 0) ? (
                    <div style={{ textAlign: 'center', padding: '32px', border: '1px dashed var(--border)', borderRadius: '16px', color: 'var(--text-secondary)' }}>
                        <div style={{ fontSize: '32px', marginBottom: '8px' }}>🛒</div>
                        <p style={{ margin: '0 0 12px 0', fontSize: '14px' }}>Aún no tienes productos cargados en tu catálogo.</p>
                        <button
                            type="button"
                            onClick={() => {
                                setEditingProduct({ id: Date.now().toString(), name: '', price: '', category: 'General', desc: '', image: '', is_active: true });
                                setIsProductModalOpen(true);
                            }}
                            style={{
                                padding: '10px 20px',
                                borderRadius: '12px',
                                border: '1px solid var(--primary-paddle)',
                                background: 'transparent',
                                color: 'var(--text-primary)',
                                fontWeight: '700',
                                fontSize: '13px',
                                cursor: 'pointer'
                            }}
                        >
                            + Agregar Primer Producto
                        </button>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(240px, 1fr))', gap: '16px' }}>
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
                                        style={{ width: '52px', height: '52px', borderRadius: '12px', objectFit: 'cover', border: '1px solid var(--border)' }}
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
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                                        <input
                                            type="checkbox"
                                            checked={prod.is_active !== false}
                                            onChange={async (e) => {
                                                const updated = (formData.metadata?.store_products || []).map((p, i) =>
                                                    i === idx ? { ...p, is_active: e.target.checked } : p
                                                );
                                                handleMetadataChange('store_products', updated);
                                                await handleSave({ metadata: { ...formData.metadata, store_products: updated } });
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
                                                await handleSave({ metadata: { ...formData.metadata, store_products: updated } });
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

            {/* Section 2: Adicionales para Reservas de Turnos */}
            <div style={{ background: 'var(--bg-card)', padding: '24px', borderRadius: '16px', border: '1px solid var(--border)', marginTop: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800' }}>⚡ Adicionales para Reservas de Turnos</h3>
                    <button
                        type="button"
                        onClick={() => {
                            setEditingExtra({ id: Date.now().toString(), name: '', price: '', desc: '', image: '', is_active: true });
                            setIsExtraModalOpen(true);
                        }}
                        style={{
                            padding: '10px 20px',
                            borderRadius: '12px',
                            border: 'none',
                            background: 'var(--primary-paddle)',
                            color: '#000',
                            fontWeight: '700',
                            fontSize: '14px',
                            cursor: 'pointer'
                        }}
                    >
                        + Agregar Adicional de Turno
                    </button>
                </div>

                {(!formData.additional_services || formData.additional_services.length === 0) ? (
                    <div style={{ textAlign: 'center', padding: '32px', border: '1px dashed var(--border)', borderRadius: '16px', color: 'var(--text-secondary)', marginTop: '16px' }}>
                        <div style={{ fontSize: '32px', marginBottom: '8px' }}>⚡</div>
                        <p style={{ margin: '0 0 12px 0', fontSize: '14px' }}>No tienes adicionales de turno cargados.</p>
                        <button
                            type="button"
                            onClick={() => {
                                setEditingExtra({ id: Date.now().toString(), name: '', price: '', desc: '', image: '', is_active: true });
                                setIsExtraModalOpen(true);
                            }}
                            style={{
                                padding: '10px 20px',
                                borderRadius: '12px',
                                border: '1px solid var(--border)',
                                background: 'var(--bg-main)',
                                color: 'var(--text-primary)',
                                fontWeight: '700',
                                fontSize: '13px',
                                cursor: 'pointer'
                            }}
                        >
                            + Agregar Primer Adicional
                        </button>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(240px, 1fr))', gap: '16px', marginTop: '16px' }}>
                        {(formData.additional_services || []).map((extra, idx) => (
                            <div
                                key={extra.id || idx}
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
                                        src={extra.image || extra.image_url || 'https://images.unsplash.com/photo-1616788494707-ec28f08d05a1?w=200&q=80'}
                                        alt={extra.name}
                                        style={{ width: '52px', height: '52px', borderRadius: '12px', objectFit: 'cover', border: '1px solid var(--border)' }}
                                    />
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--primary-paddle)', textTransform: 'uppercase' }}>
                                            Adicional Turno
                                        </div>
                                        <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {extra.name}
                                        </div>
                                        <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-primary)', marginTop: '2px' }}>
                                            ${Number(extra.price).toLocaleString('es-AR')}
                                        </div>
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
                                                await handleSave({ additional_services: updated });
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
                                                setEditingExtra({ ...extra });
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
                                                await handleSave({ additional_services: updated });
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
                                placeholder=""
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
                                    placeholder=""
                                    onChange={e => setEditingProduct(prev => ({ ...prev, price: parseInt(e.target.value) || 0 }))}
                                />
                            </div>
                            <div style={{ flex: 1 }}>
                                <label style={labelStyle}>Categoría</label>
                                <input
                                    type="text"
                                    style={inputStyle}
                                    value={editingProduct.category || ''}
                                    placeholder=""
                                    list="store-categories-list"
                                    onChange={e => setEditingProduct(prev => ({ ...prev, category: e.target.value }))}
                                />
                                <datalist id="store-categories-list">
                                    {Array.from(new Set(['General', 'Equipamiento', 'Bebidas', 'Indumentaria', 'Alquileres', 'Accesorios', ...(formData.metadata?.store_products || []).map(p => p.category).filter(Boolean)])).map(cat => (
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
                                placeholder=""
                                onChange={e => setEditingProduct(prev => ({ ...prev, desc: e.target.value }))}
                            />
                        </div>

                        <div>
                            <label style={labelStyle}>Imágenes del Producto (Podés subir varias)</label>
                            
                            {/* Grid of uploaded images */}
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
                                                    border: (editingProduct.image === imgUrl || (!editingProduct.image && iIdx === 0)) ? '2px solid var(--primary-paddle)' : '1px solid var(--border)'
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
                                onClick={async () => {
                                    if (!editingProduct.name) {
                                        showToast('Ingresá el nombre del producto', 'error');
                                        return;
                                    }
                                    const finalImages = Array.isArray(editingProduct.images) && editingProduct.images.length > 0
                                        ? editingProduct.images
                                        : (editingProduct.image ? [editingProduct.image] : []);
                                    const prodToSave = {
                                        ...editingProduct,
                                        images: finalImages,
                                        image: finalImages[0] || editingProduct.image || null
                                    };

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
                                    await handleSave({ metadata: { ...formData.metadata, store_products: updated } });
                                }}
                                style={{ flex: 2, ...saveButtonStyle, marginTop: 0 }}
                            >
                                Guardar Producto
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Crear/Editar Adicional de Turno */}
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
                                {formData.additional_services?.some(e => e.id === editingExtra.id) ? 'Editar Adicional' : 'Nuevo Adicional de Turno'}
                            </h3>
                            <button
                                type="button"
                                onClick={() => setIsExtraModalOpen(false)}
                                style={{ background: 'transparent', border: 'none', fontSize: '18px', cursor: 'pointer', color: 'var(--text-secondary)' }}
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
                                placeholder=""
                                onChange={e => setEditingExtra(prev => ({ ...prev, name: e.target.value }))}
                            />
                        </div>

                        <div>
                            <label style={labelStyle}>Precio ($)</label>
                            <input
                                type="number"
                                style={inputStyle}
                                value={editingExtra.price || ''}
                                placeholder=""
                                onChange={e => setEditingExtra(prev => ({ ...prev, price: parseInt(e.target.value) || 0 }))}
                            />
                        </div>

                        <div>
                            <label style={labelStyle}>Descripción corta (opcional)</label>
                            <input
                                type="text"
                                style={inputStyle}
                                value={editingExtra.desc || ''}
                                placeholder=""
                                onChange={e => setEditingExtra(prev => ({ ...prev, desc: e.target.value }))}
                            />
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
                                            const file = e.target.files[0];
                                            if (!file) return;
                                            try {
                                                setUploadingExtraImage(true);
                                                const publicUrl = await serviceAdapter.uploadImage(file);
                                                setEditingExtra(prev => ({ ...prev, image: publicUrl }));
                                                showToast('Imagen subida correctamente', 'success');
                                            } catch (err) {
                                                console.error('Error uploading extra image:', err);
                                                showToast('Error al subir imagen', 'error');
                                            } finally {
                                                setUploadingExtraImage(false);
                                            }
                                        }}
                                    />
                                </label>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                            <button
                                type="button"
                                onClick={() => setIsExtraModalOpen(false)}
                                style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer' }}
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={async () => {
                                    if (!editingExtra.name) {
                                        showToast('Ingresá el nombre del adicional', 'error');
                                        return;
                                    }
                                    const currentExtras = formData.additional_services || [];
                                    const existingIdx = currentExtras.findIndex(e => e.id === editingExtra.id);
                                    let updated;
                                    if (existingIdx >= 0) {
                                        updated = [...currentExtras];
                                        updated[existingIdx] = editingExtra;
                                    } else {
                                        updated = [...currentExtras, { ...editingExtra, id: Date.now().toString() }];
                                    }
                                    handleInputChange('additional_services', updated);
                                    setIsExtraModalOpen(false);
                                    await handleSave({ additional_services: updated });
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
