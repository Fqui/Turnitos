import React, { useState } from 'react';
import serviceAdapter from '../../../services/serviceAdapter';

export default function GalleryTab({
    formData,
    setFormData,
    handleInputChange,
    handleSave,
    setSaving,
    isRentalBusiness,
    showToast,
    showConfirm,
    showAlert,
    labelStyle,
    inputStyle,
    buttonSecondaryStyle,
    saveButtonStyle
}) {
    const [editingHighlight, setEditingHighlight] = useState(null);
    const [uploadingHighlightImages, setUploadingHighlightImages] = useState(false);

    const highlights = formData.gallery_highlights || [];
    const stories24h = highlights.filter(h => h.is_story);
    const permanentHighlightsList = highlights.filter(h => !h.is_story);

    const currentVenueGallery = formData.metadata?.venue_gallery ||
        (formData.gallery_images || []).map(item => (typeof item === 'string' ? { url: item, caption: '', category: 'General' } : item));

    const handleVenueGalleryUpload = async (e) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;
        try {
            setSaving(true);
            const uploadedItems = [];
            for (const file of files) {
                const url = await serviceAdapter.uploadImage(file);
                if (url) {
                    uploadedItems.push({ url, caption: '', category: 'General' });
                }
            }
            const updatedList = [...currentVenueGallery, ...uploadedItems];
            const newMetadata = { ...(formData.metadata || {}), venue_gallery: updatedList };
            const newGalleryImages = updatedList.map(i => i.url);
            setFormData(prev => ({
                ...prev,
                metadata: newMetadata,
                gallery_images: newGalleryImages
            }));
            showToast('Fotos subidas a la galería', 'success');
        } catch (err) {
            console.error("Upload error:", err);
            showToast('Error al subir fotos', 'error');
        } finally {
            setSaving(false);
        }
    };

    const createHighlight = () => {
        if (highlights.length >= 10) {
            showAlert('Límite alcanzado', 'Solo puedes tener hasta 10 destacadas');
            return;
        }

        const newHighlight = {
            id: `highlight_${Date.now()}`,
            title: `Destacada ${highlights.length + 1}`,
            cover_image: null,
            images: [],
            order: highlights.length
        };

        setEditingHighlight(newHighlight);
    };

    const createStory = () => {
        const now = new Date();
        const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        const newStory = {
            id: `story_${Date.now()}`,
            title: 'Historia',
            cover_image: null,
            images: [],
            is_story: true,
            created_at: now.toISOString(),
            expires_at: expiresAt.toISOString(),
            order: 0
        };

        setEditingHighlight(newStory);
    };

    const saveHighlight = async (highlight) => {
        const existingIndex = highlights.findIndex(h => h.id === highlight.id);

        let updatedHighlights;
        if (existingIndex >= 0) {
            updatedHighlights = [...highlights];
            updatedHighlights[existingIndex] = highlight;
        } else {
            updatedHighlights = [...highlights, highlight];
        }

        handleInputChange('gallery_highlights', updatedHighlights);
        await handleSave({ gallery_highlights: updatedHighlights });
        setEditingHighlight(null);
        showToast('Destacada guardada correctamente', 'success');
    };

    const deleteHighlight = async (highlightId) => {
        const confirmed = await showConfirm(
            '¿Eliminar destacada?',
            'Se eliminarán todas las imágenes de esta destacada'
        );

        if (!confirmed) return;

        const updatedHighlights = highlights.filter(h => h.id !== highlightId);
        handleInputChange('gallery_highlights', updatedHighlights);
        await handleSave({ gallery_highlights: updatedHighlights });
        showToast('Destacada eliminada', 'success');
    };

    const uploadHighlightImages = async (e, highlight) => {
        const files = Array.from(e.target.files);
        if (!files.length) return;

        const currentImages = highlight.images || [];
        if (currentImages.length + files.length > 20) {
            showAlert('Límite de archivos', 'Solo puedes tener hasta 20 fotos/videos por destacada');
            return;
        }

        try {
            setUploadingHighlightImages(true);
            const newUrls = [];

            for (const file of files) {
                const isVideo = file.type.startsWith('video/');
                const maxSize = isVideo ? 50 * 1024 * 1024 : 5 * 1024 * 1024;
                if (file.size > maxSize) {
                    showToast(`${file.name} es muy pesado (máx ${isVideo ? '50' : '5'}MB)`, 'error');
                    continue;
                }
                const url = await serviceAdapter.uploadImage(file);
                newUrls.push(url);
            }

            const updatedImages = [...currentImages, ...newUrls];
            const updatedHighlight = {
                ...highlight,
                images: updatedImages,
                cover_image: highlight.cover_image || updatedImages[0]
            };

            setEditingHighlight(updatedHighlight);
            showToast(`${newUrls.length} archivo(s) subido(s)`, 'success');
        } catch (error) {
            console.error('Error uploading highlight images:', error);
            showToast('Error al subir imágenes', 'error');
        } finally {
            setUploadingHighlightImages(false);
        }
    };

    const removeHighlightImage = (highlight, imageUrl) => {
        const updatedImages = highlight.images.filter(url => url !== imageUrl);
        const updatedHighlight = {
            ...highlight,
            images: updatedImages,
            cover_image: highlight.cover_image === imageUrl ? updatedImages[0] : highlight.cover_image
        };
        setEditingHighlight(updatedHighlight);
    };

    const setCoverImage = (highlight, imageUrl) => {
        setEditingHighlight({
            ...highlight,
            cover_image: imageUrl
        });
    };

    return (
        <div style={{ display: 'grid', gap: '24px' }}>
            {isRentalBusiness && (
                <div style={{
                    background: 'var(--bg-main)',
                    border: '1px solid var(--border)',
                    borderRadius: '16px',
                    padding: '20px'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                        <div>
                            <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)' }}>
                                📸 Galería de Fotos del Predio ({currentVenueGallery.length})
                            </h4>
                            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
                                Sube fotos de la piscina, quincho, parrilla, zona de juegos y salones.
                            </p>
                        </div>
                        <div>
                            <input
                                type="file"
                                id="venue-gallery-file-input"
                                multiple
                                accept="image/*"
                                onChange={handleVenueGalleryUpload}
                                style={{ display: 'none' }}
                            />
                            <label
                                htmlFor="venue-gallery-file-input"
                                style={{
                                    padding: '10px 18px',
                                    borderRadius: '12px',
                                    background: 'var(--primary)',
                                    color: '#000',
                                    fontWeight: '700',
                                    fontSize: '13px',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                }}
                            >
                                ➕ Subir Fotos
                            </label>
                        </div>
                    </div>

                    {currentVenueGallery.length === 0 ? (
                        <div style={{ padding: '30px', border: '1px dashed var(--border)', borderRadius: '12px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                            <p style={{ margin: 0, fontSize: '14px' }}>Aún no has subido fotos de la galería del predio.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
                            {currentVenueGallery.map((item, idx) => (
                                <div key={idx} style={{ border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden', background: 'var(--bg-card)' }}>
                                    <div style={{ aspectRatio: '4/3', overflow: 'hidden', position: 'relative' }}>
                                        <img src={item.url} alt={`Foto ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const updated = currentVenueGallery.filter((_, i) => i !== idx);
                                                const newMetadata = { ...(formData.metadata || {}), venue_gallery: updated };
                                                setFormData(prev => ({
                                                    ...prev,
                                                    metadata: newMetadata,
                                                    gallery_images: updated.map(i => i.url)
                                                }));
                                            }}
                                            style={{ position: 'absolute', top: 6, right: 6, background: '#ef4444', color: 'white', border: 'none', borderRadius: '50%', width: 26, height: 26, cursor: 'pointer', fontWeight: 'bold' }}
                                        >
                                            ×
                                        </button>
                                    </div>
                                    <div style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        <input
                                            type="text"
                                            placeholder="Descripción de la foto"
                                            value={item.caption || ''}
                                            onChange={(e) => {
                                                const updated = [...currentVenueGallery];
                                                updated[idx] = { ...updated[idx], caption: e.target.value };
                                                const newMetadata = { ...(formData.metadata || {}), venue_gallery: updated };
                                                setFormData(prev => ({ ...prev, metadata: newMetadata }));
                                            }}
                                            style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-primary)', fontSize: '12px' }}
                                        />
                                        <select
                                            value={item.category || 'General'}
                                            onChange={(e) => {
                                                const updated = [...currentVenueGallery];
                                                updated[idx] = { ...updated[idx], category: e.target.value };
                                                const newMetadata = { ...(formData.metadata || {}), venue_gallery: updated };
                                                setFormData(prev => ({ ...prev, metadata: newMetadata }));
                                            }}
                                            style={{ width: '100%', padding: '4px 6px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-primary)', fontSize: '12px' }}
                                        >
                                            <option value="General">General</option>
                                            <option value="Piscina">Piscina</option>
                                            <option value="Quincho">Quincho</option>
                                            <option value="Salón">Salón</option>
                                            <option value="Exterior">Exterior</option>
                                            <option value="Juegos">Juegos</option>
                                            <option value="Noche">Noche</option>
                                        </select>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                    <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '4px', color: 'var(--text-primary)' }}>
                        Historias y Destacadas ({highlights.length}/20)
                    </h3>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                        Publica historias de 24hs o álbumes destacados tipo Instagram.
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                        type="button"
                        onClick={createStory}
                        style={{
                            padding: '10px 16px',
                            borderRadius: '12px',
                            border: 'none',
                            background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)',
                            color: '#fff',
                            fontWeight: '700',
                            fontSize: '13px',
                            cursor: 'pointer',
                            boxShadow: '0 4px 12px rgba(220, 39, 67, 0.3)'
                        }}
                    >
                        ⚡ Publicar Historia (24hs)
                    </button>
                    <button
                        type="button"
                        onClick={createHighlight}
                        disabled={highlights.length >= 20}
                        style={{
                            padding: '10px 16px',
                            borderRadius: '12px',
                            border: '1px solid var(--border)',
                            background: 'var(--bg-main)',
                            color: 'var(--text-primary)',
                            fontWeight: '700',
                            fontSize: '13px',
                            opacity: highlights.length >= 20 ? 0.5 : 1,
                            cursor: highlights.length >= 20 ? 'not-allowed' : 'pointer'
                        }}
                    >
                        ⭐ Nueva Destacada
                    </button>
                </div>
            </div>

            {/* Section 1: Historias de 24 Horas */}
            <div style={{ background: 'var(--bg-main)', border: '1px solid var(--border)', borderRadius: '16px', padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <div>
                        <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: 'var(--text-primary)' }}>
                            ⚡ Historias de 24 Horas ({stories24h.length})
                        </h4>
                        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
                            Activan el anillo de color en la foto de perfil del negocio y expiran automáticamente.
                        </p>
                    </div>
                </div>

                {stories24h.length === 0 ? (
                    <div style={{ padding: '24px', border: '1px dashed var(--border)', borderRadius: '12px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                        <p style={{ margin: 0, fontSize: '13px' }}>No hay historias de 24hs activas actualmente.</p>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gap: '10px' }}>
                        {stories24h.map((story) => {
                            const now = new Date();
                            const expDate = story.expires_at ? new Date(story.expires_at) : null;
                            const diffHours = expDate ? Math.max(0, Math.round((expDate - now) / (1000 * 60 * 60))) : 24;

                            return (
                                <div
                                    key={story.id}
                                    style={{
                                        background: 'var(--bg-card)',
                                        border: '1px solid var(--border)',
                                        borderRadius: '12px',
                                        padding: '12px 16px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '14px'
                                    }}
                                >
                                    <div style={{
                                        width: '50px',
                                        height: '50px',
                                        borderRadius: '50%',
                                        background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)',
                                        padding: '2px',
                                        flexShrink: 0
                                    }}>
                                        <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: 'var(--bg-main)', padding: '2px' }}>
                                            {/\.(mp4|webm|mov|ogg|m4v)(\?|$)/i.test(story.cover_image || story.images?.[0]) ? (
                                                <video
                                                    src={story.cover_image || story.images?.[0]}
                                                    muted
                                                    playsInline
                                                    style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                                                />
                                            ) : (
                                                <img
                                                    src={story.cover_image || story.images?.[0] || 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=200&q=80'}
                                                    alt={story.title}
                                                    style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                                                />
                                            )}
                                        </div>
                                    </div>

                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: '700', fontSize: '14px', color: 'var(--text-primary)' }}>
                                            {story.title || 'Historia'}
                                        </div>
                                        <div style={{ fontSize: '12px', color: 'var(--primary-paddle)', fontWeight: '600', marginTop: '2px' }}>
                                            ⏱ Expira en ~{diffHours}hs ({story.images?.length || 0} foto{story.images?.length !== 1 ? 's' : ''})
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button
                                            type="button"
                                            onClick={() => setEditingHighlight(story)}
                                            style={{ ...buttonSecondaryStyle, padding: '6px 12px', fontSize: '12px' }}
                                        >
                                            Editar
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => deleteHighlight(story.id)}
                                            style={{ ...buttonSecondaryStyle, padding: '6px 12px', fontSize: '12px', background: 'rgba(255, 68, 68, 0.1)', color: '#ff4444' }}
                                        >
                                            Borrar
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Section 2: Destacadas Permanentes */}
            <div style={{ background: 'var(--bg-main)', border: '1px solid var(--border)', borderRadius: '16px', padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <div>
                        <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: 'var(--text-primary)' }}>
                            ⭐ Destacadas Permanentes ({permanentHighlightsList.length})
                        </h4>
                        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
                            Aparecen como álbumes fijados abajo del perfil (ej: "Torneos", "Ubicación", "Reglas").
                        </p>
                    </div>
                </div>

                {permanentHighlightsList.length === 0 ? (
                    <div style={{ padding: '24px', border: '1px dashed var(--border)', borderRadius: '12px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                        <p style={{ margin: 0, fontSize: '13px' }}>Aún no creaste destacadas permanentes.</p>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gap: '10px' }}>
                        {permanentHighlightsList.map((highlight) => (
                            <div
                                key={highlight.id}
                                style={{
                                    background: 'var(--bg-card)',
                                    border: '1px solid var(--border)',
                                    borderRadius: '12px',
                                    padding: '12px 16px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '14px'
                                }}
                            >
                                <div style={{
                                    width: '50px',
                                    height: '50px',
                                    borderRadius: '50%',
                                    border: '1px solid var(--border)',
                                    padding: '2px',
                                    flexShrink: 0
                                }}>
                                    {/\.(mp4|webm|mov|ogg|m4v)(\?|$)/i.test(highlight.cover_image || highlight.images?.[0]) ? (
                                        <video
                                            src={highlight.cover_image || highlight.images?.[0]}
                                            muted
                                            playsInline
                                            style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                                        />
                                    ) : (
                                        <img
                                            src={highlight.cover_image || highlight.images?.[0] || 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=200&q=80'}
                                            alt={highlight.title}
                                            style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                                        />
                                    )}
                                </div>

                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: '700', fontSize: '14px', color: 'var(--text-primary)' }}>
                                        {highlight.title}
                                    </div>
                                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                        {highlight.images?.length || 0} foto{highlight.images?.length !== 1 ? 's' : ''}
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button
                                        type="button"
                                        onClick={() => setEditingHighlight(highlight)}
                                        style={{ ...buttonSecondaryStyle, padding: '6px 12px', fontSize: '12px' }}
                                    >
                                        Editar
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => deleteHighlight(highlight.id)}
                                        style={{ ...buttonSecondaryStyle, padding: '6px 12px', fontSize: '12px', background: 'rgba(255, 68, 68, 0.1)', color: '#ff4444' }}
                                    >
                                        Borrar
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Edit Modal */}
            {editingHighlight && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(0,0,0,0.6)',
                    backdropFilter: 'blur(4px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 9999,
                    padding: '20px'
                }}
                    onClick={() => setEditingHighlight(null)}
                >
                    <div
                        style={{
                            background: 'var(--bg-card)',
                            borderRadius: '20px',
                            padding: '24px',
                            maxWidth: '600px',
                            width: '100%',
                            maxHeight: '90vh',
                            overflow: 'auto',
                            border: '1px solid var(--border)',
                            boxShadow: '0 20px 50px rgba(0,0,0,0.3)'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)' }}>
                                {editingHighlight.is_story ? '⚡ Publicar Historia (24hs)' : (editingHighlight.images?.length > 0 ? 'Editar Destacada' : 'Nueva Destacada')}
                            </h3>
                            <button
                                type="button"
                                onClick={() => setEditingHighlight(null)}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    fontSize: '24px',
                                    cursor: 'pointer',
                                    color: 'var(--text-secondary)'
                                }}
                            >
                                ×
                            </button>
                        </div>

                        {/* 24h Story Switch */}
                        <div style={{ marginBottom: '20px', background: 'var(--bg-main)', padding: '14px', borderRadius: '14px', border: '1px solid var(--border)' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={!!editingHighlight.is_story}
                                    onChange={(e) => {
                                        const isStory = e.target.checked;
                                        const now = new Date();
                                        const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
                                        setEditingHighlight({
                                            ...editingHighlight,
                                            is_story: isStory,
                                            expires_at: isStory ? expiresAt.toISOString() : null
                                        });
                                    }}
                                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                />
                                <div>
                                    <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>
                                        ⚡ Publicar como Historia de 24 Horas
                                    </span>
                                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
                                        Activa el anillo con gradiente de Instagram en el logo del negocio. Expira en 24hs.
                                    </p>
                                </div>
                            </label>
                        </div>

                        {/* Title Input */}
                        <div style={{ marginBottom: '20px' }}>
                            <label style={labelStyle}>Título</label>
                            <input
                                type="text"
                                value={editingHighlight.title}
                                onChange={(e) => setEditingHighlight({ ...editingHighlight, title: e.target.value })}
                                placeholder="Ej: Manicura, Pedicura, etc."
                                maxLength={20}
                                style={inputStyle}
                            />
                            <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                {editingHighlight.title.length}/20
                            </p>
                        </div>

                        {/* Images */}
                        <div style={{ marginBottom: '20px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                <label style={labelStyle}>Fotos y Videos ({editingHighlight.images.length}/20)</label>
                                <label style={{
                                    ...saveButtonStyle,
                                    width: 'auto',
                                    margin: 0,
                                    padding: '6px 12px',
                                    fontSize: '12px',
                                    cursor: uploadingHighlightImages ? 'not-allowed' : 'pointer',
                                    opacity: uploadingHighlightImages ? 0.7 : 1
                                }}>
                                    <input
                                        type="file"
                                        multiple
                                        accept="image/*,video/*"
                                        onChange={(e) => uploadHighlightImages(e, editingHighlight)}
                                        style={{ display: 'none' }}
                                        disabled={uploadingHighlightImages}
                                    />
                                    {uploadingHighlightImages ? 'Subiendo...' : '＋ Subir'}
                                </label>
                            </div>

                            {editingHighlight.images.length === 0 ? (
                                <div style={{
                                    padding: '30px',
                                    border: '2px dashed var(--border)',
                                    borderRadius: '12px',
                                    textAlign: 'center',
                                    background: 'var(--bg-main)'
                                }}>
                                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                        Sube fotos o videos para esta destacada
                                    </p>
                                </div>
                            ) : (
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
                                    gap: '8px'
                                }}>
                                    {editingHighlight.images.map((url, idx) => (
                                        <div
                                            key={idx}
                                            style={{
                                                position: 'relative',
                                                aspectRatio: '1',
                                                borderRadius: '8px',
                                                overflow: 'hidden',
                                                border: editingHighlight.cover_image === url ? '3px solid var(--primary-paddle)' : '1px solid var(--border)'
                                            }}
                                        >
                                            {/\.(mp4|webm|mov|ogg|m4v)(\?|$)/i.test(url) ? (
                                                <video
                                                    src={url}
                                                    style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }}
                                                    onClick={() => setCoverImage(editingHighlight, url)}
                                                    muted
                                                    playsInline
                                                    onMouseEnter={(e) => e.target.play()}
                                                    onMouseLeave={(e) => { e.target.pause(); e.target.currentTime = 0; }}
                                                />
                                            ) : (
                                                <img
                                                    src={url}
                                                    alt={`Foto ${idx + 1}`}
                                                    style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }}
                                                    onClick={() => setCoverImage(editingHighlight, url)}
                                                />
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => removeHighlightImage(editingHighlight, url)}
                                                style={{
                                                    position: 'absolute',
                                                    top: '4px',
                                                    right: '4px',
                                                    width: '20px',
                                                    height: '20px',
                                                    borderRadius: '50%',
                                                    background: 'rgba(255, 68, 68, 0.9)',
                                                    color: 'white',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    fontSize: '12px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center'
                                                }}
                                            >
                                                ×
                                            </button>
                                            {editingHighlight.cover_image === url && (
                                                <div style={{
                                                    position: 'absolute',
                                                    bottom: '4px',
                                                    left: '4px',
                                                    background: 'var(--primary-paddle)',
                                                    color: 'white',
                                                    fontSize: '9px',
                                                    padding: '2px 6px',
                                                    borderRadius: '4px',
                                                    fontWeight: '700'
                                                }}>
                                                    PORTADA
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                            {editingHighlight.images.length > 0 && (
                                <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '8px' }}>
                                    💡 Click en una foto/video para establecerla como portada. Los videos se previsualzan al pasar el mouse.
                                </p>
                            )}
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                            <button
                                type="button"
                                onClick={() => setEditingHighlight(null)}
                                style={buttonSecondaryStyle}
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={() => saveHighlight(editingHighlight)}
                                disabled={!editingHighlight.title || editingHighlight.images.length === 0}
                                style={{
                                    ...saveButtonStyle,
                                    opacity: (!editingHighlight.title || editingHighlight.images.length === 0) ? 0.5 : 1,
                                    cursor: (!editingHighlight.title || editingHighlight.images.length === 0) ? 'not-allowed' : 'pointer'
                                }}
                            >
                                Guardar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
