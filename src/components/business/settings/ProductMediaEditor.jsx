import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, Film, ImagePlus, Star, X } from 'lucide-react';
import serviceAdapter from '../../../services/serviceAdapter';
import { MAX_PRODUCT_PHOTOS, MAX_PRODUCT_VIDEO_MB, PRODUCT_VIDEO_TYPES } from '../../../utils/productMedia';

const ACCENT = 'var(--primary-paddle, #10b981)';

const badge = {
    position: 'absolute',
    background: 'rgba(0,0,0,0.55)',
    backdropFilter: 'blur(4px)',
    color: '#fff',
    borderRadius: '10px',
    fontSize: '10px',
    fontWeight: '800',
    display: 'flex',
    alignItems: 'center',
    gap: '3px',
    border: 'none',
    zIndex: 2
};

const roundBtn = {
    width: '26px',
    height: '26px',
    borderRadius: '50%',
    border: '1px solid var(--border)',
    background: 'var(--bg-card)',
    color: 'var(--text-primary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    padding: 0
};

const sectionTitle = { fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' };
const counter = { fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600' };
const hint = { fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 };

/**
 * Product photos (up to 5, sortable, the first is the cover) and one optional video.
 * `images` / `video` are URLs; changes go out through onChange({ images, video }).
 */
export default function ProductMediaEditor({ images, video, onChange, showToast }) {
    const [uploadingPhotos, setUploadingPhotos] = useState(false);
    const [uploadingVideo, setUploadingVideo] = useState(false);
    const [videoError, setVideoError] = useState('');
    const [dragIndex, setDragIndex] = useState(null);

    const photos = images.slice(0, MAX_PRODUCT_PHOTOS);
    const droppedCount = images.length - photos.length;

    const setPhotos = (next) => onChange({ images: next, video });

    const move = (from, to) => {
        if (from === to || to < 0 || to >= photos.length) return;
        const next = [...photos];
        const [item] = next.splice(from, 1);
        next.splice(to, 0, item);
        setPhotos(next);
    };

    const handlePhotos = async (e) => {
        const files = Array.from(e.target.files || []);
        e.target.value = '';
        if (!files.length) return;

        const room = MAX_PRODUCT_PHOTOS - photos.length;
        const accepted = files.slice(0, room);
        if (files.length > room) {
            showToast?.(`Se cargan ${room} de ${files.length}: el máximo es ${MAX_PRODUCT_PHOTOS} fotos por producto`, 'info');
        }
        if (!accepted.length) return;

        try {
            setUploadingPhotos(true);
            const urls = await Promise.all(accepted.map(file => serviceAdapter.uploadImage(file)));
            setPhotos([...photos, ...urls.filter(Boolean)]);
            showToast?.(`${urls.length} foto(s) subida(s)`, 'success');
        } catch (err) {
            console.error('Error uploading product images:', err);
            showToast?.('Error al subir las fotos', 'error');
        } finally {
            setUploadingPhotos(false);
        }
    };

    const handleVideo = async (e) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;

        if (!PRODUCT_VIDEO_TYPES.includes(file.type)) {
            setVideoError('El video tiene que ser MP4 o WebM.');
            return;
        }
        const sizeMb = file.size / (1024 * 1024);
        if (sizeMb > MAX_PRODUCT_VIDEO_MB) {
            setVideoError(`El video pesa ${sizeMb.toFixed(1)} MB y el máximo es ${MAX_PRODUCT_VIDEO_MB} MB. Recortalo o exportalo en menor calidad.`);
            return;
        }

        try {
            setVideoError('');
            setUploadingVideo(true);
            const url = await serviceAdapter.uploadImage(file);
            onChange({ images: photos, video: url });
            showToast?.('Video subido', 'success');
        } catch (err) {
            console.error('Error uploading product video:', err);
            showToast?.('Error al subir el video', 'error');
        } finally {
            setUploadingVideo(false);
        }
    };

    return (
        <div style={{ display: 'grid', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px' }}>
                <span style={sectionTitle}>Fotos del producto</span>
                <span style={counter}>{photos.length}/{MAX_PRODUCT_PHOTOS}</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(92px, 1fr))', gap: '10px' }}>
                {photos.map((url, i) => (
                    <div
                        key={url}
                        draggable
                        onDragStart={() => setDragIndex(i)}
                        onDragOver={e => e.preventDefault()}
                        onDrop={() => { if (dragIndex !== null) move(dragIndex, i); setDragIndex(null); }}
                        onDragEnd={() => setDragIndex(null)}
                        style={{
                            position: 'relative', borderRadius: '14px', overflow: 'hidden', aspectRatio: '1 / 1', cursor: 'grab',
                            border: i === 0 ? `2px solid ${ACCENT}` : '1px solid var(--border)', opacity: dragIndex === i ? 0.5 : 1
                        }}
                    >
                        <img src={url} alt={`Foto ${i + 1}`} draggable={false} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                        {i === 0 ? (
                            <span style={{ ...badge, top: '6px', left: '6px', padding: '3px 7px', background: ACCENT }}>
                                <Star size={10} fill="#fff" /> Portada
                            </span>
                        ) : (
                            <button type="button" onClick={() => move(i, 0)} aria-label="Usar como portada" title="Usar como portada" style={{ ...badge, top: '6px', left: '6px', padding: '4px', cursor: 'pointer' }}>
                                <Star size={12} />
                            </button>
                        )}
                        <button type="button" onClick={() => setPhotos(photos.filter((_, idx) => idx !== i))} aria-label="Quitar foto" title="Quitar foto" style={{ ...badge, top: '6px', right: '6px', padding: '4px', cursor: 'pointer', background: 'rgba(239,68,68,0.9)' }}>
                            <X size={12} />
                        </button>
                        {photos.length > 1 && (
                            <div style={{ position: 'absolute', bottom: '6px', left: '6px', right: '6px', display: 'flex', justifyContent: 'space-between' }}>
                                <button type="button" disabled={i === 0} onClick={() => move(i, i - 1)} aria-label="Mover antes" style={{ ...roundBtn, opacity: i === 0 ? 0.35 : 1 }}>
                                    <ArrowLeft size={13} />
                                </button>
                                <button type="button" disabled={i === photos.length - 1} onClick={() => move(i, i + 1)} aria-label="Mover después" style={{ ...roundBtn, opacity: i === photos.length - 1 ? 0.35 : 1 }}>
                                    <ArrowRight size={13} />
                                </button>
                            </div>
                        )}
                    </div>
                ))}
                {photos.length < MAX_PRODUCT_PHOTOS && (
                    <label style={{
                        aspectRatio: '1 / 1', borderRadius: '14px', border: '1px dashed var(--border)', background: 'var(--bg-main)', display: 'flex',
                        flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', fontSize: '12px', fontWeight: '700',
                        color: 'var(--text-secondary)', cursor: uploadingPhotos ? 'wait' : 'pointer', textAlign: 'center', padding: '6px'
                    }}>
                        <ImagePlus size={20} />
                        {uploadingPhotos ? 'Subiendo...' : 'Agregar fotos'}
                        <input type="file" accept="image/*" multiple disabled={uploadingPhotos} style={{ display: 'none' }} onChange={handlePhotos} />
                    </label>
                )}
            </div>
            {droppedCount > 0 && (
                <p style={{ ...hint, color: '#f59e0b', fontWeight: '600' }}>
                    Este producto tenía {images.length} fotos: al guardar quedan las primeras {MAX_PRODUCT_PHOTOS}.
                </p>
            )}
            <p style={hint}>
                Hasta {MAX_PRODUCT_PHOTOS} fotos, se muestran cuadradas. La primera es la portada: tocá la estrella para cambiarla y usá las flechas (o arrastrá en la compu) para ordenar.
            </p>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px', marginTop: '4px' }}>
                <span style={sectionTitle}>Video (opcional)</span>
                <span style={counter}>{video ? '1/1' : '0/1'}</span>
            </div>
            {video ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px', borderRadius: '14px', border: '1px solid var(--border)', background: 'var(--bg-main)' }}>
                    <video src={video} muted playsInline preload="metadata" style={{ width: '64px', height: '64px', borderRadius: '10px', objectFit: 'cover', background: '#000', flexShrink: 0 }} />
                    <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>Video cargado</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Se muestra primero, sin sonido y en loop</div>
                    </div>
                    <button type="button" onClick={() => onChange({ images: photos, video: null })} aria-label="Quitar video" title="Quitar video" style={{ ...roundBtn, width: '30px', height: '30px', flexShrink: 0 }}>
                        <X size={14} />
                    </button>
                </div>
            ) : (
                <label style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px 16px', borderRadius: '12px',
                    border: '1px dashed var(--border)', background: 'var(--bg-main)', color: 'var(--text-primary)', fontSize: '13px', fontWeight: '600',
                    cursor: uploadingVideo ? 'wait' : 'pointer', textAlign: 'center'
                }}>
                    <Film size={16} />
                    {uploadingVideo ? 'Subiendo video...' : `Subir video (MP4 o WebM, hasta ${MAX_PRODUCT_VIDEO_MB} MB)`}
                    <input type="file" accept={PRODUCT_VIDEO_TYPES.join(',')} disabled={uploadingVideo} style={{ display: 'none' }} onChange={handleVideo} />
                </label>
            )}
            {videoError && (
                <div role="alert" style={{ padding: '10px 12px', borderRadius: '12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.35)', color: '#ef4444', fontSize: '12px', fontWeight: '600' }}>
                    {videoError}
                </div>
            )}
        </div>
    );
}
