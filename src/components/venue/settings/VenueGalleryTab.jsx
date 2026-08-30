import React from 'react';

export default function VenueGalleryTab({
    formData,
    handleMetadataChange,
    handleInputChange,
    handleImageUpload,
    processGalleryFiles,
    moveGalleryItem,
    isUploadingGallery,
    galleryDragOver,
    setGalleryDragOver,
    previewGalleryImage,
    setPreviewGalleryImage,
    saveChanges,
    saving,
    showToast,
    cardStyle,
    sectionTitleStyle,
    inputStyle,
    buttonStyle
}) {
    return (
        <div style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
                <div>
                    <h2 style={{ ...sectionTitleStyle, marginBottom: '4px' }}>📸 Galería de Fotos del Predio</h2>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
                        Sube fotos de alta calidad de tu quincho, parque, piscina e instalaciones. La primera foto será la portada de tu página.
                    </p>
                </div>
                <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: 'rgba(132, 204, 22, 0.12)',
                    color: 'var(--primary-paddle, #84CC16)',
                    padding: '6px 14px',
                    borderRadius: '20px',
                    fontSize: '13px',
                    fontWeight: '700'
                }}>
                    <span>🖼️ {(formData.metadata?.venue_gallery || []).length} Fotos</span>
                </div>
            </div>

            {/* Modern Drag & Drop Zone */}
            <div
                onDragOver={(e) => { e.preventDefault(); setGalleryDragOver(true); }}
                onDragLeave={() => setGalleryDragOver(false)}
                onDrop={async (e) => {
                    e.preventDefault();
                    setGalleryDragOver(false);
                    const files = Array.from(e.dataTransfer.files || []).filter(f => f.type.startsWith('image/'));
                    if (files.length > 0) await processGalleryFiles(files);
                }}
                style={{
                    border: galleryDragOver ? '2px dashed var(--primary-paddle)' : '2px dashed var(--border)',
                    background: galleryDragOver ? 'rgba(132, 204, 22, 0.08)' : 'var(--bg-card)',
                    borderRadius: '16px',
                    padding: '32px 20px',
                    textAlign: 'center',
                    marginBottom: '24px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    position: 'relative'
                }}
            >
                <input
                    type="file"
                    id="gallery-upload"
                    multiple
                    accept="image/*"
                    onChange={handleImageUpload}
                    style={{
                        position: 'absolute',
                        inset: 0,
                        opacity: 0,
                        cursor: 'pointer',
                        width: '100%',
                        height: '100%',
                        zIndex: 2
                    }}
                />
                {isUploadingGallery ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                            width: '36px',
                            height: '36px',
                            border: '3px solid var(--border)',
                            borderTopColor: 'var(--primary-paddle)',
                            borderRadius: '50%',
                            animation: 'spin 0.8s linear infinite'
                        }} />
                        <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>
                            Subiendo y optimizando imágenes...
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                            Por favor espera un momento
                        </div>
                    </div>
                ) : (
                    <div>
                        <div style={{
                            width: '56px',
                            height: '56px',
                            borderRadius: '16px',
                            background: 'rgba(132, 204, 22, 0.15)',
                            color: 'var(--primary-paddle, #84CC16)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '28px',
                            marginBottom: '12px'
                        }}>
                            ☁️
                        </div>
                        <div style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '4px' }}>
                            Arrastra tus fotos aquí o haz clic para subir
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                            Puedes seleccionar múltiples fotos a la vez (JPG, PNG, WEBP)
                        </div>
                        <span style={{
                            display: 'inline-block',
                            padding: '10px 20px',
                            borderRadius: '12px',
                            background: 'var(--primary-paddle)',
                            color: '#000',
                            fontWeight: '700',
                            fontSize: '13px',
                            boxShadow: '0 4px 12px rgba(132, 204, 22, 0.25)'
                        }}>
                            + Seleccionar Fotos desde el Dispositivo
                        </span>
                    </div>
                )}
            </div>

            {/* Gallery Grid */}
            {(formData.metadata?.venue_gallery || []).length === 0 ? (
                <div style={{
                    padding: '40px 20px',
                    textAlign: 'center',
                    background: 'var(--bg-card)',
                    borderRadius: '16px',
                    border: '1px solid var(--border)'
                }}>
                    <span style={{ fontSize: '36px', display: 'block', marginBottom: '8px' }}>📸</span>
                    <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' }}>
                        Aún no has agregado fotos a la galería
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                        Las fotos atractivas aumentan un 80% las reservas de tu quincho.
                    </div>
                </div>
            ) : (
                <div>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                        gap: '16px',
                        marginBottom: '24px'
                    }}>
                        {(formData.metadata?.venue_gallery || []).map((item, index) => {
                            const isFirst = index === 0;
                            const isFeatured = item.is_featured || isFirst;

                            return (
                                <div
                                    key={index}
                                    style={{
                                        border: isFeatured ? '2px solid var(--primary-paddle, #84CC16)' : '1px solid var(--border)',
                                        borderRadius: '16px',
                                        overflow: 'hidden',
                                        background: 'var(--bg-card)',
                                        boxShadow: isFeatured ? '0 6px 20px rgba(132, 204, 22, 0.18)' : '0 2px 8px rgba(0,0,0,0.04)',
                                        transition: 'all 0.2s ease',
                                        display: 'flex',
                                        flexDirection: 'column'
                                    }}
                                >
                                    {/* Image Thumbnail with Overlay Controls */}
                                    <div style={{ aspectRatio: '16/10', position: 'relative', overflow: 'hidden', background: '#000' }}>
                                        <img
                                            src={item.url}
                                            alt={item.caption || 'Foto del predio'}
                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                        />

                                        {/* Top Badges */}
                                        <div style={{ position: 'absolute', top: 8, left: 8, zIndex: 2, display: 'flex', gap: '6px' }}>
                                            <span style={{
                                                background: 'rgba(0,0,0,0.7)',
                                                color: 'white',
                                                padding: '2px 8px',
                                                borderRadius: '6px',
                                                fontSize: '11px',
                                                fontWeight: '800',
                                                backdropFilter: 'blur(4px)'
                                            }}>
                                                #{index + 1}
                                            </span>
                                            {isFeatured && (
                                                <span style={{
                                                    background: 'var(--primary-paddle, #84CC16)',
                                                    color: '#000',
                                                    padding: '2px 8px',
                                                    borderRadius: '6px',
                                                    fontSize: '11px',
                                                    fontWeight: '800',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '3px'
                                                }}>
                                                    ⭐ Portada
                                                </span>
                                            )}
                                        </div>

                                        {/* Quick Actions (Delete & Preview) */}
                                        <div style={{ position: 'absolute', top: 8, right: 8, zIndex: 2, display: 'flex', gap: '6px' }}>
                                            <button
                                                type="button"
                                                onClick={() => setPreviewGalleryImage(item.url)}
                                                title="Ver foto en tamaño completo"
                                                style={{
                                                    background: 'rgba(0,0,0,0.65)',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '8px',
                                                    width: '30px',
                                                    height: '30px',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontSize: '14px',
                                                    backdropFilter: 'blur(4px)'
                                                }}
                                            >
                                                👁️
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const newGallery = [...(formData.metadata?.venue_gallery || [])];
                                                    newGallery.splice(index, 1);
                                                    handleMetadataChange('venue_gallery', newGallery);
                                                    handleInputChange('gallery_images', newGallery.map(i => i.url));
                                                    showToast('Foto eliminada de la galería', 'info');
                                                }}
                                                title="Eliminar foto"
                                                style={{
                                                    background: 'rgba(239, 68, 68, 0.85)',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '8px',
                                                    width: '30px',
                                                    height: '30px',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontSize: '14px',
                                                    backdropFilter: 'blur(4px)'
                                                }}
                                            >
                                                🗑️
                                            </button>
                                        </div>

                                        {/* Reorder Buttons (Move Left/Right) */}
                                        <div style={{ position: 'absolute', bottom: 8, right: 8, zIndex: 2, display: 'flex', gap: '4px' }}>
                                            <button
                                                type="button"
                                                disabled={index === 0}
                                                onClick={() => moveGalleryItem(index, -1)}
                                                title="Mover antes"
                                                style={{
                                                    background: index === 0 ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.7)',
                                                    color: index === 0 ? '#888' : 'white',
                                                    border: 'none',
                                                    borderRadius: '6px',
                                                    padding: '4px 8px',
                                                    cursor: index === 0 ? 'not-allowed' : 'pointer',
                                                    fontSize: '11px',
                                                    fontWeight: '700'
                                                }}
                                            >
                                                ◀
                                            </button>
                                            <button
                                                type="button"
                                                disabled={index === (formData.metadata?.venue_gallery || []).length - 1}
                                                onClick={() => moveGalleryItem(index, 1)}
                                                title="Mover después"
                                                style={{
                                                    background: index === (formData.metadata?.venue_gallery || []).length - 1 ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.7)',
                                                    color: index === (formData.metadata?.venue_gallery || []).length - 1 ? '#888' : 'white',
                                                    border: 'none',
                                                    borderRadius: '6px',
                                                    padding: '4px 8px',
                                                    cursor: index === (formData.metadata?.venue_gallery || []).length - 1 ? 'not-allowed' : 'pointer',
                                                    fontSize: '11px',
                                                    fontWeight: '700'
                                                }}
                                            >
                                                ▶
                                            </button>
                                        </div>
                                    </div>

                                    {/* Card Metadata Fields */}
                                    <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                                        <div>
                                            <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
                                                Descripción / Epígrafe
                                            </label>
                                            <input
                                                placeholder="Ej: Piscina iluminada de noche, Salón para 50 personas..."
                                                value={item.caption || ''}
                                                onChange={(e) => {
                                                    const newGallery = [...(formData.metadata?.venue_gallery || [])];
                                                    newGallery[index].caption = e.target.value;
                                                    handleMetadataChange('venue_gallery', newGallery);
                                                }}
                                                style={{ ...inputStyle, padding: '8px 10px', fontSize: '12px', margin: 0 }}
                                            />
                                        </div>

                                        <div>
                                            <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
                                                Sector / Categoría
                                            </label>
                                            <select
                                                value={item.category || 'General'}
                                                onChange={(e) => {
                                                    const newGallery = [...(formData.metadata?.venue_gallery || [])];
                                                    newGallery[index].category = e.target.value;
                                                    handleMetadataChange('venue_gallery', newGallery);
                                                }}
                                                style={{ ...inputStyle, padding: '8px 10px', fontSize: '12px', margin: 0 }}
                                            >
                                                <option value="General">📸 General</option>
                                                <option value="Piscina">🏊 Piscina / Solárium</option>
                                                <option value="Salón">🏠 Salón / Quincho Cubierto</option>
                                                <option value="Exterior">🌳 Parque / Jardín</option>
                                                <option value="Parrilla">🔥 Asador / Parrilla</option>
                                                <option value="Baños">🚿 Baños & Vestuarios</option>
                                                <option value="Juegos">🎮 Juegos & Entretenimiento</option>
                                            </select>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => {
                                                const newGallery = (formData.metadata?.venue_gallery || []).map((gItem, i) => ({
                                                    ...gItem,
                                                    is_featured: i === index
                                                }));
                                                const [featuredItem] = newGallery.splice(index, 1);
                                                newGallery.unshift(featuredItem);

                                                handleMetadataChange('venue_gallery', newGallery);
                                                handleInputChange('gallery_images', newGallery.map(i => i.url));
                                                showToast('⭐ Foto marcada como portada principal', 'success');
                                            }}
                                            style={{
                                                marginTop: '6px',
                                                width: '100%',
                                                padding: '8px 12px',
                                                borderRadius: '10px',
                                                border: isFeatured ? 'none' : '1px solid var(--border)',
                                                background: isFeatured ? 'var(--primary-paddle, #84CC16)' : 'var(--bg-main)',
                                                color: isFeatured ? '#000' : 'var(--text-primary)',
                                                fontWeight: '800',
                                                fontSize: '11.5px',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s ease',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '6px'
                                            }}
                                        >
                                            <span>{isFeatured ? '⭐ Portada Principal Seleccionada' : '☆ Marcar como Portada Principal'}</span>
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Save Button at bottom of gallery */}
                    <button
                        type="button"
                        onClick={saveChanges}
                        disabled={saving}
                        style={{
                            ...buttonStyle,
                            width: '100%',
                            padding: '16px',
                            fontSize: '15px',
                            fontWeight: '800',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '10px',
                            boxShadow: '0 8px 24px rgba(132, 204, 22, 0.25)'
                        }}
                    >
                        <span>{saving ? 'Guardando Galería...' : '💾 Guardar Galería de Fotos'}</span>
                    </button>
                </div>
            )}

            {/* Lightbox Preview Modal */}
            {previewGalleryImage && (
                <div
                    onClick={() => setPreviewGalleryImage(null)}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0,0,0,0.85)',
                        backdropFilter: 'blur(8px)',
                        zIndex: 9999,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '24px'
                    }}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            position: 'relative',
                            maxWidth: '90vw',
                            maxHeight: '90vh',
                            borderRadius: '16px',
                            overflow: 'hidden',
                            boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
                        }}
                    >
                        <button
                            type="button"
                            onClick={() => setPreviewGalleryImage(null)}
                            style={{
                                position: 'absolute',
                                top: '16px',
                                right: '16px',
                                background: 'rgba(0,0,0,0.7)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '50%',
                                width: '36px',
                                height: '36px',
                                fontSize: '18px',
                                cursor: 'pointer',
                                zIndex: 2
                            }}
                        >
                            ✕
                        </button>
                        <img
                            src={previewGalleryImage}
                            alt="Vista previa"
                            style={{ width: '100%', height: 'auto', maxHeight: '85vh', objectFit: 'contain', display: 'block' }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
