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
    // Separate states for permanent highlights and 24h stories
    const [editingHighlight, setEditingHighlight] = useState(null);
    const [editingStory, setEditingStory] = useState(null);
    const [uploadingMedia, setUploadingMedia] = useState(false);

    const highlights = formData.gallery_highlights || [];

    // Helper to determine if a story is currently active
    const now = new Date();
    const isStoryActive = (story) => {
        if (!story.is_story) return false;
        if (story.expires_at) {
            return new Date(story.expires_at) > now;
        }
        if (story.created_at) {
            const createdAt = new Date(story.created_at).getTime();
            return (now.getTime() - createdAt) < (24 * 60 * 60 * 1000);
        }
        return false;
    };

    // Split items into 3 clear groups
    const permanentHighlightsList = highlights.filter(h => !h.is_story);
    const activeStories = highlights.filter(h => h.is_story && isStoryActive(h));
    const archivedStories = highlights.filter(h => h.is_story && !isStoryActive(h));

    // Venue gallery (only for rental businesses)
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

    // ==========================================
    // PERMANENT HIGHLIGHTS METHODS
    // ==========================================
    const createHighlight = () => {
        if (permanentHighlightsList.length >= 20) {
            showAlert('Límite alcanzado', 'Solo puedes tener hasta 20 destacadas fijadas en tu perfil');
            return;
        }

        const newHighlight = {
            id: `highlight_${Date.now()}`,
            title: '',
            cover_image: null,
            images: [],
            is_story: false,
            order: permanentHighlightsList.length
        };

        setEditingHighlight(newHighlight);
    };

    const saveHighlight = async (highlight) => {
        if (!highlight.title || !highlight.title.trim()) {
            showToast('Ingresa un título para la destacada', 'error');
            return;
        }
        if (!highlight.images || highlight.images.length === 0) {
            showToast('Agrega al menos una foto o video a la destacada', 'error');
            return;
        }

        const cleanHighlight = {
            ...highlight,
            title: highlight.title.trim(),
            cover_image: highlight.cover_image || highlight.images[0],
            is_story: false
        };

        const existingIndex = highlights.findIndex(h => h.id === cleanHighlight.id);
        let updatedHighlights;
        if (existingIndex >= 0) {
            updatedHighlights = [...highlights];
            updatedHighlights[existingIndex] = cleanHighlight;
        } else {
            updatedHighlights = [...highlights, cleanHighlight];
        }

        handleInputChange('gallery_highlights', updatedHighlights);
        await handleSave({ gallery_highlights: updatedHighlights });
        setEditingHighlight(null);
        showToast('Destacada guardada con éxito', 'success');
    };

    const deleteHighlight = async (highlightId) => {
        const confirmed = await showConfirm(
            '¿Eliminar destacada?',
            'Se eliminará este álbum destacado de tu perfil público.'
        );
        if (!confirmed) return;

        const updatedHighlights = highlights.filter(h => h.id !== highlightId);
        handleInputChange('gallery_highlights', updatedHighlights);
        await handleSave({ gallery_highlights: updatedHighlights });
        showToast('Destacada eliminada', 'success');
    };

    // ==========================================
    // 24H STORIES METHODS & ARCHIVE
    // ==========================================
    const createStory = () => {
        const nowDate = new Date();
        const expiresAt = new Date(nowDate.getTime() + 24 * 60 * 60 * 1000);
        const newStory = {
            id: `story_${Date.now()}`,
            title: '',
            cover_image: null,
            images: [],
            is_story: true,
            created_at: nowDate.toISOString(),
            expires_at: expiresAt.toISOString(),
            order: 0
        };

        setEditingStory(newStory);
    };

    const saveStory = async (story) => {
        if (!story.images || story.images.length === 0) {
            showToast('Agrega al menos una foto o video a la historia', 'error');
            return;
        }

        const nowDate = new Date();
        const expiresAt = new Date(nowDate.getTime() + 24 * 60 * 60 * 1000);

        const cleanStory = {
            ...story,
            title: story.title?.trim() || 'Historia',
            cover_image: story.cover_image || story.images[0],
            is_story: true,
            created_at: nowDate.toISOString(),
            expires_at: expiresAt.toISOString()
        };

        const existingIndex = highlights.findIndex(h => h.id === cleanStory.id);
        let updatedHighlights;
        if (existingIndex >= 0) {
            updatedHighlights = [...highlights];
            updatedHighlights[existingIndex] = cleanStory;
        } else {
            updatedHighlights = [...highlights, cleanStory];
        }

        handleInputChange('gallery_highlights', updatedHighlights);
        await handleSave({ gallery_highlights: updatedHighlights });
        setEditingStory(null);
        showToast('¡Historia publicada! Estará activa 24 horas', 'success');
    };

    const renewStory = async (story) => {
        const nowDate = new Date();
        const expiresAt = new Date(nowDate.getTime() + 24 * 60 * 60 * 1000);

        const renewedStory = {
            ...story,
            created_at: nowDate.toISOString(),
            expires_at: expiresAt.toISOString()
        };

        const updatedHighlights = highlights.map(h => h.id === story.id ? renewedStory : h);
        handleInputChange('gallery_highlights', updatedHighlights);
        await handleSave({ gallery_highlights: updatedHighlights });
        showToast('¡Historia renovada y activa en el perfil por 24 horas!', 'success');
    };

    const endStoryEarly = async (story) => {
        const confirmed = await showConfirm(
            '¿Finalizar historia?',
            'La historia dejará de verse en el perfil y pasará al Historial de Historias, donde podrás renovarla cuando quieras.'
        );
        if (!confirmed) return;

        const endedStory = {
            ...story,
            expires_at: new Date(Date.now() - 1000).toISOString()
        };

        const updatedHighlights = highlights.map(h => h.id === story.id ? endedStory : h);
        handleInputChange('gallery_highlights', updatedHighlights);
        await handleSave({ gallery_highlights: updatedHighlights });
        showToast('Historia guardada en el historial', 'info');
    };

    const deleteStory = async (storyId) => {
        const confirmed = await showConfirm(
            '¿Eliminar historia del archivo?',
            'Esta historia se borrará permanentemente de tu historial.'
        );
        if (!confirmed) return;

        const updatedHighlights = highlights.filter(h => h.id !== storyId);
        handleInputChange('gallery_highlights', updatedHighlights);
        await handleSave({ gallery_highlights: updatedHighlights });
        showToast('Historia eliminada', 'success');
    };

    const convertStoryToHighlight = (story) => {
        setEditingHighlight({
            id: `highlight_${Date.now()}`,
            title: story.title && story.title !== 'Historia' ? story.title : '',
            cover_image: story.cover_image || story.images?.[0] || null,
            images: [...(story.images || [])],
            is_story: false,
            order: permanentHighlightsList.length
        });
        showToast('Fotos cargadas en la nueva destacada. Asigna un título y guárdala.', 'info');
    };

    // ==========================================
    // GENERIC MEDIA UPLOADER (Photos & Videos)
    // ==========================================
    const uploadMedia = async (e, currentItem, setItemCallback) => {
        const files = Array.from(e.target.files || []);
        if (!files.length) return;

        const currentImages = currentItem.images || [];
        if (currentImages.length + files.length > 20) {
            showAlert('Límite de archivos', 'Solo puedes tener hasta 20 fotos o videos por publicación');
            return;
        }

        try {
            setUploadingMedia(true);
            const newUrls = [];

            for (const file of files) {
                const isVideo = file.type.startsWith('video/');
                const maxSize = isVideo ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
                if (file.size > maxSize) {
                    showToast(`${file.name} es muy pesado (máx ${isVideo ? '50' : '10'}MB)`, 'error');
                    continue;
                }
                const url = await serviceAdapter.uploadImage(file);
                if (url) newUrls.push(url);
            }

            const updatedImages = [...currentImages, ...newUrls];
            const updatedItem = {
                ...currentItem,
                images: updatedImages,
                cover_image: currentItem.cover_image || updatedImages[0]
            };

            setItemCallback(updatedItem);
            showToast(`${newUrls.length} archivo(s) subido(s)`, 'success');
        } catch (error) {
            console.error('Error uploading media:', error);
            showToast('Error al subir archivos', 'error');
        } finally {
            setUploadingMedia(false);
            e.target.value = '';
        }
    };

    const isVideo = (url) => typeof url === 'string' && /\.(mp4|webm|mov|ogg|m4v)(\?|$)/i.test(url);

    return (
        <div style={{ display: 'grid', gap: '28px' }}>
            {/* Header info */}
            <div>
                <h3 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '6px', color: 'var(--text-primary)' }}>
                    📸 Historias y Destacadas
                </h3>
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: 0 }}>
                    Gestiona las historias de 24 horas con el anillo en tu logo y los álbumes destacados permanentes fijados en tu perfil.
                </p>
            </div>

            {/* ======================================================== */}
            {/* SECCIÓN 1: HISTORIAS DE 24 HORAS CON HISTORIAL/ARCHIVO    */}
            {/* ======================================================== */}
            <div style={{
                background: 'var(--bg-main)',
                border: '1px solid var(--border)',
                borderRadius: '18px',
                padding: '24px'
            }}>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '20px',
                    flexWrap: 'wrap',
                    gap: '12px'
                }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '20px' }}>⚡</span>
                            <h4 style={{ margin: 0, fontSize: '17px', fontWeight: '800', color: 'var(--text-primary)' }}>
                                Historias de 24 Horas
                            </h4>
                        </div>
                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
                            Activan el anillo con gradiente de Instagram en tu logo en la página pública y en Link in Bio.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={createStory}
                        style={{
                            padding: '10px 18px',
                            borderRadius: '12px',
                            border: 'none',
                            background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)',
                            color: '#fff',
                            fontWeight: '700',
                            fontSize: '13px',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            boxShadow: '0 4px 14px rgba(220, 39, 67, 0.35)',
                            transition: 'transform 0.15s ease'
                        }}
                        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
                        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                    >
                        ⚡ Publicar Nueva Historia
                    </button>
                </div>

                {/* Sub-bloque A: Historias Activas En Vivo */}
                <div style={{ marginBottom: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                        <span style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: '#10b981',
                            boxShadow: '0 0 8px #10b981'
                        }} />
                        <h5 style={{ margin: 0, fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>
                            Historias Activas ({activeStories.length})
                        </h5>
                    </div>

                    {activeStories.length === 0 ? (
                        <div style={{
                            padding: '24px',
                            border: '1.5px dashed var(--border)',
                            borderRadius: '14px',
                            textAlign: 'center',
                            background: 'var(--bg-card)'
                        }}>
                            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
                                No tienes historias activas en este momento. Publica una para que tus clientes vean tus novedades durante 24 horas.
                            </p>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gap: '10px' }}>
                            {activeStories.map((story) => {
                                const expDate = story.expires_at ? new Date(story.expires_at) : null;
                                const diffHours = expDate ? Math.max(1, Math.round((expDate - now) / (1000 * 60 * 60))) : 24;
                                const mediaUrl = story.cover_image || story.images?.[0];

                                return (
                                    <div
                                        key={story.id}
                                        style={{
                                            background: 'var(--bg-card)',
                                            border: '1px solid var(--border)',
                                            borderRadius: '14px',
                                            padding: '12px 16px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '14px'
                                        }}
                                    >
                                        {/* Avatar preview with Instagram gradient ring */}
                                        <div style={{
                                            width: '52px',
                                            height: '52px',
                                            borderRadius: '50%',
                                            background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)',
                                            padding: '2.5px',
                                            flexShrink: 0
                                        }}>
                                            <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: 'var(--bg-main)', overflow: 'hidden' }}>
                                                {isVideo(mediaUrl) ? (
                                                    <video
                                                        src={mediaUrl}
                                                        muted
                                                        playsInline
                                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                    />
                                                ) : (
                                                    <img
                                                        src={mediaUrl || 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=200&q=80'}
                                                        alt={story.title}
                                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                    />
                                                )}
                                            </div>
                                        </div>

                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                <span style={{ fontWeight: '700', fontSize: '14px', color: 'var(--text-primary)' }}>
                                                    {story.title || 'Historia'}
                                                </span>
                                                <span style={{
                                                    fontSize: '11px',
                                                    fontWeight: '700',
                                                    color: '#059669',
                                                    background: 'rgba(16, 185, 129, 0.12)',
                                                    padding: '2px 8px',
                                                    borderRadius: '6px'
                                                }}>
                                                    🟢 En Vivo
                                                </span>
                                            </div>
                                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                                ⏱ Expira en ~{diffHours}hs · {story.images?.length || 0} archivo{story.images?.length !== 1 ? 's' : ''}
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                            <button
                                                type="button"
                                                onClick={() => setEditingStory(story)}
                                                style={{ ...buttonSecondaryStyle, padding: '6px 12px', fontSize: '12px' }}
                                            >
                                                ✏️ Editar
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => endStoryEarly(story)}
                                                style={{ ...buttonSecondaryStyle, padding: '6px 12px', fontSize: '12px' }}
                                                title="Pasa la historia al historial de inmediato"
                                            >
                                                ⏹️ Finalizar
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => deleteStory(story.id)}
                                                style={{ ...buttonSecondaryStyle, padding: '6px 12px', fontSize: '12px', background: 'rgba(255, 68, 68, 0.1)', color: '#ff4444', border: 'none' }}
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Sub-bloque B: Historial / Archivo de Historias */}
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '15px' }}>📂</span>
                            <h5 style={{ margin: 0, fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>
                                Historial / Archivo de Historias ({archivedStories.length})
                            </h5>
                        </div>
                    </div>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0 0 14px 0' }}>
                        Tus historias anteriores quedan guardadas aquí. Podes renovarlas con un click para reactivarlas por 24hs más sin tener que volver a subir las fotos o videos.
                    </p>

                    {archivedStories.length === 0 ? (
                        <div style={{
                            padding: '20px',
                            border: '1px dashed var(--border)',
                            borderRadius: '12px',
                            textAlign: 'center',
                            background: 'var(--bg-card)'
                        }}>
                            <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)' }}>
                                Cuando tus historias cumplan las 24 horas, aparecerán automáticamente en este archivo para que puedas renovarlas cuando quieras.
                            </p>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gap: '10px' }}>
                            {archivedStories.map((story) => {
                                const mediaUrl = story.cover_image || story.images?.[0];
                                const createdDate = story.created_at ? new Date(story.created_at).toLocaleDateString('es-AR', {
                                    day: 'numeric',
                                    month: 'short'
                                }) : null;

                                return (
                                    <div
                                        key={story.id}
                                        style={{
                                            background: 'var(--bg-card)',
                                            border: '1px solid var(--border)',
                                            borderRadius: '14px',
                                            padding: '12px 16px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '14px',
                                            opacity: 0.95
                                        }}
                                    >
                                        {/* Avatar preview with neutral border */}
                                        <div style={{
                                            width: '48px',
                                            height: '48px',
                                            borderRadius: '50%',
                                            border: '2px solid var(--border)',
                                            padding: '2px',
                                            flexShrink: 0
                                        }}>
                                            <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: 'var(--bg-main)', overflow: 'hidden' }}>
                                                {isVideo(mediaUrl) ? (
                                                    <video
                                                        src={mediaUrl}
                                                        muted
                                                        playsInline
                                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                    />
                                                ) : (
                                                    <img
                                                        src={mediaUrl || 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=200&q=80'}
                                                        alt={story.title}
                                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                    />
                                                )}
                                            </div>
                                        </div>

                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                <span style={{ fontWeight: '700', fontSize: '13px', color: 'var(--text-primary)' }}>
                                                    {story.title || 'Historia'}
                                                </span>
                                                <span style={{
                                                    fontSize: '11px',
                                                    fontWeight: '600',
                                                    color: 'var(--text-secondary)',
                                                    background: 'rgba(0,0,0,0.05)',
                                                    padding: '2px 6px',
                                                    borderRadius: '4px'
                                                }}>
                                                    Archivada {createdDate ? `(${createdDate})` : ''}
                                                </span>
                                            </div>
                                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                                {story.images?.length || 0} archivo{story.images?.length !== 1 ? 's' : ''}
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                            {/* RENEW BUTTON */}
                                            <button
                                                type="button"
                                                onClick={() => renewStory(story)}
                                                style={{
                                                    padding: '6px 14px',
                                                    borderRadius: '10px',
                                                    border: 'none',
                                                    background: 'var(--primary-paddle, #10b981)',
                                                    color: '#fff',
                                                    fontWeight: '700',
                                                    fontSize: '12px',
                                                    cursor: 'pointer',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '6px'
                                                }}
                                                title="Reactivar esta historia por 24 horas ahora"
                                            >
                                                🔄 Renovar (24hs)
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => convertStoryToHighlight(story)}
                                                style={{ ...buttonSecondaryStyle, padding: '6px 10px', fontSize: '12px' }}
                                                title="Convertir esta historia en una destacada permanente"
                                            >
                                                ⭐ A Destacada
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => setEditingStory(story)}
                                                style={{ ...buttonSecondaryStyle, padding: '6px 10px', fontSize: '12px' }}
                                                title="Editar fotos o título antes de publicar"
                                            >
                                                ✏️
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => deleteStory(story.id)}
                                                style={{ ...buttonSecondaryStyle, padding: '6px 10px', fontSize: '12px', background: 'rgba(255, 68, 68, 0.1)', color: '#ff4444', border: 'none' }}
                                                title="Eliminar del historial"
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* ======================================================== */}
            {/* SECCIÓN 2: DESTACADAS PERMANENTES                        */}
            {/* ======================================================== */}
            <div style={{
                background: 'var(--bg-main)',
                border: '1px solid var(--border)',
                borderRadius: '18px',
                padding: '24px'
            }}>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '16px',
                    flexWrap: 'wrap',
                    gap: '12px'
                }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '20px' }}>⭐</span>
                            <h4 style={{ margin: 0, fontSize: '17px', fontWeight: '800', color: 'var(--text-primary)' }}>
                                Destacadas Permanentes ({permanentHighlightsList.length}/20)
                            </h4>
                        </div>
                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
                            Aparecen como álbumes fijados en tu perfil de negocio (ej: <i>Cortes, Uñas, Tratamientos, Ubicación</i>).
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={createHighlight}
                        disabled={permanentHighlightsList.length >= 20}
                        style={{
                            padding: '10px 18px',
                            borderRadius: '12px',
                            border: '1px solid var(--border)',
                            background: 'var(--bg-card)',
                            color: 'var(--text-primary)',
                            fontWeight: '700',
                            fontSize: '13px',
                            opacity: permanentHighlightsList.length >= 20 ? 0.5 : 1,
                            cursor: permanentHighlightsList.length >= 20 ? 'not-allowed' : 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}
                    >
                        ⭐ Nueva Destacada
                    </button>
                </div>

                {permanentHighlightsList.length === 0 ? (
                    <div style={{ padding: '28px', border: '1.5px dashed var(--border)', borderRadius: '14px', textAlign: 'center', background: 'var(--bg-card)' }}>
                        <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
                            Aún no creaste destacadas permanentes. Usa el botón "⭐ Nueva Destacada" para armar tu primer álbum fijado.
                        </p>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gap: '10px' }}>
                        {permanentHighlightsList.map((highlight) => {
                            const mediaUrl = highlight.cover_image || highlight.images?.[0];

                            return (
                                <div
                                    key={highlight.id}
                                    style={{
                                        background: 'var(--bg-card)',
                                        border: '1px solid var(--border)',
                                        borderRadius: '14px',
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
                                        border: '2px solid var(--border)',
                                        padding: '2px',
                                        flexShrink: 0
                                    }}>
                                        <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: 'var(--bg-main)', overflow: 'hidden' }}>
                                            {isVideo(mediaUrl) ? (
                                                <video
                                                    src={mediaUrl}
                                                    muted
                                                    playsInline
                                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                />
                                            ) : (
                                                <img
                                                    src={mediaUrl || 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=200&q=80'}
                                                    alt={highlight.title}
                                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                />
                                            )}
                                        </div>
                                    </div>

                                    <div style={{ flex: 1, minWidth: 0 }}>
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
                                            style={{ ...buttonSecondaryStyle, padding: '6px 14px', fontSize: '12px' }}
                                        >
                                            ✏️ Editar
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => deleteHighlight(highlight.id)}
                                            style={{ ...buttonSecondaryStyle, padding: '6px 14px', fontSize: '12px', background: 'rgba(255, 68, 68, 0.1)', color: '#ff4444', border: 'none' }}
                                        >
                                            🗑️ Borrar
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ======================================================== */}
            {/* SECCIÓN 3: GALERÍA DE FOTOS (PREDIOS/ALQUILERES)          */}
            {/* ======================================================== */}
            {isRentalBusiness && (
                <div style={{
                    background: 'var(--bg-main)',
                    border: '1px solid var(--border)',
                    borderRadius: '18px',
                    padding: '24px'
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

            {/* ======================================================== */}
            {/* MODAL 1: EDITAR / CREAR DESTACADA PERMANENTE             */}
            {/* ======================================================== */}
            {editingHighlight && (
                <div
                    style={{
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
                            maxWidth: '580px',
                            width: '100%',
                            maxHeight: '90vh',
                            overflow: 'auto',
                            border: '1px solid var(--border)',
                            boxShadow: '0 20px 50px rgba(0,0,0,0.3)'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <div>
                                <h3 style={{ fontSize: '18px', fontWeight: '800', margin: 0, color: 'var(--text-primary)' }}>
                                    {editingHighlight.images?.length > 0 && editingHighlight.title ? 'Editar Destacada' : '⭐ Nueva Destacada'}
                                </h3>
                                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
                                    Álbum permanente que tus clientes verán fijado en tu perfil.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setEditingHighlight(null)}
                                style={{ background: 'transparent', border: 'none', fontSize: '24px', cursor: 'pointer', color: 'var(--text-secondary)' }}
                            >
                                ×
                            </button>
                        </div>

                        {/* Title Input */}
                        <div style={{ marginBottom: '20px' }}>
                            <label style={labelStyle}>Título del Álbum</label>
                            <input
                                type="text"
                                value={editingHighlight.title}
                                onChange={(e) => setEditingHighlight({ ...editingHighlight, title: e.target.value })}
                                placeholder="Ej: Uñas, Barbería, Precios, Cuidados..."
                                maxLength={20}
                                style={inputStyle}
                            />
                            <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                {(editingHighlight.title || '').length}/20 caracteres
                            </p>
                        </div>

                        {/* Images & Videos */}
                        <div style={{ marginBottom: '20px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                <label style={labelStyle}>Fotos y Videos ({editingHighlight.images?.length || 0}/20)</label>
                                <label style={{
                                    ...saveButtonStyle,
                                    width: 'auto',
                                    margin: 0,
                                    padding: '6px 14px',
                                    fontSize: '12px',
                                    cursor: uploadingMedia ? 'not-allowed' : 'pointer',
                                    opacity: uploadingMedia ? 0.7 : 1
                                }}>
                                    <input
                                        type="file"
                                        multiple
                                        accept="image/*,video/*"
                                        onChange={(e) => uploadMedia(e, editingHighlight, setEditingHighlight)}
                                        style={{ display: 'none' }}
                                        disabled={uploadingMedia}
                                    />
                                    {uploadingMedia ? 'Subiendo...' : '＋ Subir Fotos/Videos'}
                                </label>
                            </div>

                            {(!editingHighlight.images || editingHighlight.images.length === 0) ? (
                                <div style={{
                                    padding: '30px',
                                    border: '2px dashed var(--border)',
                                    borderRadius: '12px',
                                    textAlign: 'center',
                                    background: 'var(--bg-main)'
                                }}>
                                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
                                        Sube fotos o videos para este álbum destacado
                                    </p>
                                </div>
                            ) : (
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fill, minmax(95px, 1fr))',
                                    gap: '8px'
                                }}>
                                    {editingHighlight.images.map((url, idx) => (
                                        <div
                                            key={idx}
                                            style={{
                                                position: 'relative',
                                                aspectRatio: '1',
                                                borderRadius: '10px',
                                                overflow: 'hidden',
                                                border: editingHighlight.cover_image === url ? '3px solid var(--primary-paddle, #10b981)' : '1px solid var(--border)'
                                            }}
                                        >
                                            {isVideo(url) ? (
                                                <video
                                                    src={url}
                                                    style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }}
                                                    onClick={() => setEditingHighlight({ ...editingHighlight, cover_image: url })}
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
                                                    onClick={() => setEditingHighlight({ ...editingHighlight, cover_image: url })}
                                                />
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const updatedImages = editingHighlight.images.filter(u => u !== url);
                                                    setEditingHighlight({
                                                        ...editingHighlight,
                                                        images: updatedImages,
                                                        cover_image: editingHighlight.cover_image === url ? updatedImages[0] : editingHighlight.cover_image
                                                    });
                                                }}
                                                style={{
                                                    position: 'absolute',
                                                    top: '4px',
                                                    right: '4px',
                                                    width: '22px',
                                                    height: '22px',
                                                    borderRadius: '50%',
                                                    background: 'rgba(239, 68, 68, 0.9)',
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
                                                    background: 'var(--primary-paddle, #10b981)',
                                                    color: 'white',
                                                    fontSize: '9px',
                                                    padding: '2px 6px',
                                                    borderRadius: '4px',
                                                    fontWeight: '800'
                                                }}>
                                                    PORTADA
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                            {editingHighlight.images?.length > 0 && (
                                <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '8px' }}>
                                    💡 Haz click en una foto o video para definirla como portada del álbum.
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
                                disabled={!editingHighlight.title?.trim() || !editingHighlight.images?.length}
                                style={{
                                    ...saveButtonStyle,
                                    opacity: (!editingHighlight.title?.trim() || !editingHighlight.images?.length) ? 0.5 : 1,
                                    cursor: (!editingHighlight.title?.trim() || !editingHighlight.images?.length) ? 'not-allowed' : 'pointer'
                                }}
                            >
                                Guardar Destacada
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ======================================================== */}
            {/* MODAL 2: PUBLICAR / EDITAR HISTORIA DE 24 HORAS          */}
            {/* ======================================================== */}
            {editingStory && (
                <div
                    style={{
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
                    onClick={() => setEditingStory(null)}
                >
                    <div
                        style={{
                            background: 'var(--bg-card)',
                            borderRadius: '20px',
                            padding: '24px',
                            maxWidth: '580px',
                            width: '100%',
                            maxHeight: '90vh',
                            overflow: 'auto',
                            border: '1px solid var(--border)',
                            boxShadow: '0 20px 50px rgba(0,0,0,0.3)'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header with gradient badge */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontSize: '20px' }}>⚡</span>
                                    <h3 style={{ fontSize: '18px', fontWeight: '800', margin: 0, color: 'var(--text-primary)' }}>
                                        Publicar Historia (24 Horas)
                                    </h3>
                                </div>
                                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
                                    Estará visible 24 horas y activará el anillo con gradiente en tu foto de perfil.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setEditingStory(null)}
                                style={{ background: 'transparent', border: 'none', fontSize: '24px', cursor: 'pointer', color: 'var(--text-secondary)' }}
                            >
                                ×
                            </button>
                        </div>

                        {/* Story title / tag */}
                        <div style={{ marginBottom: '20px' }}>
                            <label style={labelStyle}>Referencia / Título (Opcional)</label>
                            <input
                                type="text"
                                value={editingStory.title || ''}
                                onChange={(e) => setEditingStory({ ...editingStory, title: e.target.value })}
                                placeholder="Ej: Promo de hoy, Turnos disponibles, Novedad..."
                                maxLength={25}
                                style={inputStyle}
                            />
                            <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                Texto para identificar esta historia en tu archivo (máx 25 caracteres).
                            </p>
                        </div>

                        {/* Media Upload */}
                        <div style={{ marginBottom: '20px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                <label style={labelStyle}>Fotos y Videos ({editingStory.images?.length || 0}/20)</label>
                                <label style={{
                                    ...saveButtonStyle,
                                    width: 'auto',
                                    margin: 0,
                                    padding: '6px 14px',
                                    fontSize: '12px',
                                    cursor: uploadingMedia ? 'not-allowed' : 'pointer',
                                    opacity: uploadingMedia ? 0.7 : 1,
                                    background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)',
                                    border: 'none',
                                    color: '#fff'
                                }}>
                                    <input
                                        type="file"
                                        multiple
                                        accept="image/*,video/*"
                                        onChange={(e) => uploadMedia(e, editingStory, setEditingStory)}
                                        style={{ display: 'none' }}
                                        disabled={uploadingMedia}
                                    />
                                    {uploadingMedia ? 'Subiendo...' : '＋ Subir Fotos/Videos'}
                                </label>
                            </div>

                            {(!editingStory.images || editingStory.images.length === 0) ? (
                                <div style={{
                                    padding: '30px',
                                    border: '2px dashed var(--border)',
                                    borderRadius: '12px',
                                    textAlign: 'center',
                                    background: 'var(--bg-main)'
                                }}>
                                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
                                        Sube fotos o videos para mostrar a tus clientes durante 24 horas
                                    </p>
                                </div>
                            ) : (
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fill, minmax(95px, 1fr))',
                                    gap: '8px'
                                }}>
                                    {editingStory.images.map((url, idx) => (
                                        <div
                                            key={idx}
                                            style={{
                                                position: 'relative',
                                                aspectRatio: '1',
                                                borderRadius: '10px',
                                                overflow: 'hidden',
                                                border: editingStory.cover_image === url ? '3px solid #dc2743' : '1px solid var(--border)'
                                            }}
                                        >
                                            {isVideo(url) ? (
                                                <video
                                                    src={url}
                                                    style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }}
                                                    onClick={() => setEditingStory({ ...editingStory, cover_image: url })}
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
                                                    onClick={() => setEditingStory({ ...editingStory, cover_image: url })}
                                                />
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const updatedImages = editingStory.images.filter(u => u !== url);
                                                    setEditingStory({
                                                        ...editingStory,
                                                        images: updatedImages,
                                                        cover_image: editingStory.cover_image === url ? updatedImages[0] : editingStory.cover_image
                                                    });
                                                }}
                                                style={{
                                                    position: 'absolute',
                                                    top: '4px',
                                                    right: '4px',
                                                    width: '22px',
                                                    height: '22px',
                                                    borderRadius: '50%',
                                                    background: 'rgba(239, 68, 68, 0.9)',
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
                                            {editingStory.cover_image === url && (
                                                <div style={{
                                                    position: 'absolute',
                                                    bottom: '4px',
                                                    left: '4px',
                                                    background: '#dc2743',
                                                    color: 'white',
                                                    fontSize: '9px',
                                                    padding: '2px 6px',
                                                    borderRadius: '4px',
                                                    fontWeight: '800'
                                                }}>
                                                    PORTADA
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                            {editingStory.images?.length > 0 && (
                                <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '8px' }}>
                                    💡 Haz click en una foto o video para definirla como portada en el visor.
                                </p>
                            )}
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                            <button
                                type="button"
                                onClick={() => setEditingStory(null)}
                                style={buttonSecondaryStyle}
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={() => saveStory(editingStory)}
                                disabled={!editingStory.images?.length}
                                style={{
                                    ...saveButtonStyle,
                                    background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)',
                                    border: 'none',
                                    color: '#fff',
                                    boxShadow: '0 4px 14px rgba(220, 39, 67, 0.3)',
                                    opacity: (!editingStory.images?.length) ? 0.5 : 1,
                                    cursor: (!editingStory.images?.length) ? 'not-allowed' : 'pointer'
                                }}
                            >
                                ⚡ Publicar Historia (24hs)
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
