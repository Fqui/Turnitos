import React, { useState } from 'react';
import serviceAdapter from '../../../services/serviceAdapter';
import { MAX_SERVICE_IMAGES } from '../../../utils/serviceImages';
import { Crop } from 'lucide-react';
import FramedImage from '../../common/FramedImage';
import ImageFrameEditor, { FRAME_ASPECTS } from '../../common/ImageFrameEditor';

// Thumbnail row to manage a service's photos. The first one is the main photo (image_url).
export default function ServicePhotosEditor({ inputId, images, onChange, showToast, labelStyle, buttonSecondaryStyle }) {
    const [uploading, setUploading] = useState(false);
    // Photos waiting to be framed, by index; the first one is open in the editor.
    const [framing, setFraming] = useState([]);
    const list = images || [];
    const remaining = MAX_SERVICE_IMAGES - list.length;

    const handleFiles = async (e) => {
        const files = Array.from(e.target.files || []);
        e.target.value = '';
        if (files.length === 0) return;

        const onlyImages = files.filter(f => f.type?.startsWith('image/'));
        if (onlyImages.length < files.length) {
            showToast('Solo se pueden subir imágenes', 'warning');
        }
        if (onlyImages.length > remaining) {
            showToast(`Podés subir hasta ${MAX_SERVICE_IMAGES} fotos por servicio`, 'warning');
        }
        const toUpload = onlyImages.slice(0, Math.max(remaining, 0));
        if (toUpload.length === 0) return;

        setUploading(true);
        try {
            showToast(toUpload.length > 1 ? 'Subiendo fotos...' : 'Subiendo foto...', 'info');
            const uploaded = [];
            for (const file of toUpload) {
                const url = await serviceAdapter.uploadImage(file);
                if (url) uploaded.push(url);
            }
            const next = [...list, ...uploaded].slice(0, MAX_SERVICE_IMAGES);
            onChange(next);
            setFraming(next.map((_, i) => i).slice(list.length));
            showToast(uploaded.length > 1 ? 'Fotos cargadas' : 'Foto cargada', 'success');
        } catch (err) {
            console.error(err);
            showToast('Error al subir la imagen', 'error');
        } finally {
            setUploading(false);
        }
    };

    const removeAt = (idx) => { setFraming([]); onChange(list.filter((_, i) => i !== idx)); };
    const editingIdx = framing[0];
    const saveFrame = (url) => onChange(list.map((u, i) => (i === editingIdx ? url : u)));
    const makeMain = (idx) => { setFraming([]); onChange([list[idx], ...list.filter((_, i) => i !== idx)]); };

    const tile = {
        position: 'relative',
        width: '84px',
        height: '84px',
        borderRadius: '12px',
        overflow: 'hidden',
        border: '1px solid var(--border)',
        background: 'var(--bg-card)',
        flexShrink: 0
    };
    const iconButton = {
        position: 'absolute',
        top: '4px',
        right: '4px',
        width: '24px',
        height: '24px',
        borderRadius: '50%',
        border: 'none',
        background: 'rgba(0,0,0,0.65)',
        color: '#fff',
        fontSize: '13px',
        lineHeight: 1,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 0
    };

    return (
        <div>
            <label style={labelStyle}>Fotos del Servicio (Opcional, hasta {MAX_SERVICE_IMAGES})</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'flex-start' }}>
                {list.map((url, idx) => (
                    <div key={url} style={tile}>
                        <FramedImage src={url} alt={`Foto ${idx + 1}`} />
                        <button type="button" aria-label="Acomodar foto" title="Acomodar zoom y encuadre" onClick={() => setFraming([idx])} style={{ ...iconButton, right: 'auto', left: '4px' }}>
                            <Crop size={13} />
                        </button>
                        <button type="button" aria-label="Quitar foto" title="Quitar foto" onClick={() => removeAt(idx)} style={iconButton}>
                            ✕
                        </button>
                        {idx === 0 ? (
                            <span style={{
                                position: 'absolute', left: 0, right: 0, bottom: 0,
                                background: 'var(--primary-paddle)', color: '#000',
                                fontSize: '10px', fontWeight: 800, textAlign: 'center', padding: '3px 0'
                            }}>
                                PRINCIPAL
                            </span>
                        ) : (
                            <button
                                type="button"
                                onClick={() => makeMain(idx)}
                                style={{
                                    position: 'absolute', left: 0, right: 0, bottom: 0,
                                    border: 'none', background: 'rgba(0,0,0,0.65)', color: '#fff',
                                    fontSize: '10px', fontWeight: 700, padding: '4px 0', cursor: 'pointer'
                                }}
                            >
                                Hacer principal
                            </button>
                        )}
                    </div>
                ))}

                {remaining > 0 && (
                    <>
                        <input
                            type="file"
                            id={inputId}
                            style={{ display: 'none' }}
                            accept="image/*"
                            multiple
                            disabled={uploading}
                            onChange={handleFiles}
                        />
                        <label
                            htmlFor={inputId}
                            style={{
                                ...buttonSecondaryStyle,
                                ...tile,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '4px',
                                padding: '6px',
                                margin: 0,
                                border: '1px dashed var(--border)',
                                background: 'var(--bg-main)',
                                color: 'var(--text-secondary)',
                                fontSize: '11px',
                                fontWeight: 700,
                                textAlign: 'center',
                                cursor: uploading ? 'wait' : 'pointer',
                                opacity: uploading ? 0.6 : 1
                            }}
                        >
                            <span style={{ fontSize: '22px', lineHeight: 1 }}>{uploading ? '⏳' : '＋'}</span>
                            {uploading ? 'Subiendo...' : 'Agregar foto'}
                        </label>
                    </>
                )}
            </div>
            <span style={{ display: 'block', marginTop: '6px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                {list.length === 0
                    ? 'PNG, JPG o WebP. La primera es la principal y se ve en tu catálogo.'
                    : `${list.length}/${MAX_SERVICE_IMAGES} fotos · la principal es la que se ve en la tarjeta del servicio. Con el ícono de recorte acomodás zoom y encuadre.`}
            </span>
            <ImageFrameEditor
                open={editingIdx !== undefined && !!list[editingIdx]}
                image={list[editingIdx]}
                aspects={FRAME_ASPECTS.service}
                onSave={saveFrame}
                onClose={() => setFraming(q => q.slice(1))}
            />
        </div>
    );
}
