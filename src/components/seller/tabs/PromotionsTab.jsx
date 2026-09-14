import React, { useState, useEffect, useRef } from 'react';
import supabaseService from '../../../services/supabaseService';
import { useNotification } from '../../../contexts/NotificationContext';
import { supabase } from '../../../services/supabaseClient';

function PromoModal({ title, children, onClose }) {
    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(15, 23, 42, 0.8)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
                backdropFilter: 'blur(8px)',
                padding: '20px'
            }}
            onClick={onClose}
        >
            <div
                style={{
                    background: '#151c2c',
                    borderRadius: '16px',
                    padding: '26px',
                    maxWidth: '540px',
                    width: '100%',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    boxShadow: '0 25px 60px rgba(0, 0, 0, 0.5)',
                    maxHeight: '90vh',
                    overflowY: 'auto'
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h2 style={{ fontSize: '18px', fontWeight: '800', margin: 0, color: '#f1f5f9' }}>
                        {title}
                    </h2>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#94a3b8',
                            fontSize: '20px',
                            cursor: 'pointer',
                            padding: '4px 8px'
                        }}
                    >
                        ✕
                    </button>
                </div>
                {children}
            </div>
        </div>
    );
}

export default function PromotionsTab({ businesses = [] }) {
    const { showToast, showConfirm } = useNotification();
    const [promotions, setPromotions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingPromo, setEditingPromo] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef(null);

    const [form, setForm] = useState({
        title: '',
        discount: '',
        image: '',
        business_id: '',
        action_url: '',
        end_date: '',
        description: ''
    });

    const loadPromotions = async () => {
        setLoading(true);
        try {
            const data = await supabaseService.getPromotions();
            setPromotions(data || []);
        } catch (err) {
            console.error('Error al cargar promociones:', err);
            showToast('Error al cargar promociones', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadPromotions();
    }, []);

    const handleOpenCreate = () => {
        setEditingPromo(null);
        setForm({
            title: '',
            discount: '',
            image: '',
            business_id: '',
            action_url: '',
            end_date: '',
            description: ''
        });
        setShowModal(true);
    };

    const handleOpenEdit = (promo) => {
        setEditingPromo(promo);
        // Si no tiene negocio pero tiene URL en description, separarlo
        const isUrl = promo.description?.startsWith('http://') || promo.description?.startsWith('https://') || promo.description?.startsWith('/');
        setForm({
            title: promo.title || '',
            discount: promo.discount || '',
            image: promo.image || '',
            business_id: promo.business_id || '',
            action_url: isUrl ? promo.description : '',
            end_date: promo.end_date || (promo.expires_at ? promo.expires_at.split('T')[0] : ''),
            description: isUrl ? '' : (promo.description || '')
        });
        setShowModal(true);
    };

    // Subir imagen directo a Supabase Storage (bucket business-images)
    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            showToast('Seleccioná un archivo de imagen válido (JPG, PNG, WEBP)', 'error');
            return;
        }

        if (file.size > 8 * 1024 * 1024) {
            showToast('La imagen no debe superar los 8MB', 'error');
            return;
        }

        setIsUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `promociones/promo_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;

            const { error: uploadError } = await supabase.storage
                .from('business-images')
                .upload(fileName, file, {
                    cacheControl: '3600',
                    upsert: true
                });

            if (uploadError) throw uploadError;

            const { data } = supabase.storage
                .from('business-images')
                .getPublicUrl(fileName);

            if (data?.publicUrl) {
                setForm(prev => ({ ...prev, image: data.publicUrl }));
                showToast('✅ Imagen cargada a Supabase Store con éxito', 'success');
            }
        } catch (err) {
            console.error('Error subiendo imagen a Supabase:', err);
            showToast(`Error al subir imagen: ${err.message}`, 'error');
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!form.title.trim() || !form.image.trim()) {
            showToast('El título y la imagen son obligatorios', 'error');
            return;
        }

        setIsSaving(true);
        try {
            // Normalizar URL de acción: si el usuario escribe "www.youtube.com", anteponer "https://"
            let cleanActionUrl = form.action_url?.trim() || '';
            if (cleanActionUrl && !cleanActionUrl.startsWith('/') && !cleanActionUrl.startsWith('http://') && !cleanActionUrl.startsWith('https://')) {
                cleanActionUrl = `https://${cleanActionUrl}`;
            }

            // Si es publicidad general y tiene action_url, lo guardamos en description para que el Home lo use como link
            const finalDescription = (!form.business_id && cleanActionUrl)
                ? cleanActionUrl
                : (form.description?.trim() || null);

            // Sanitizamos el payload exacto de la tabla promotions de Supabase
            const promoPayload = {
                title: form.title.trim(),
                discount: form.discount.trim() || 'PROMO',
                image: form.image.trim(),
                business_id: form.business_id ? form.business_id : null,
                description: finalDescription,
                end_date: form.end_date ? form.end_date : null,
                active: true
            };

            if (editingPromo) {
                await supabaseService.updatePromotion(editingPromo.id, promoPayload);
                showToast('Publicidad actualizada correctamente', 'success');
            } else {
                await supabaseService.createPromotion(promoPayload);
                showToast('Publicidad publicada en el Home con éxito', 'success');
            }

            setShowModal(false);
            loadPromotions();
        } catch (err) {
            console.error('Error guardando publicidad:', err);
            showToast(`Error al guardar: ${err.message}`, 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (promoId, promoTitle) => {
        const confirmed = await showConfirm(
            '¿Eliminar Publicidad?',
            `¿Estás seguro de eliminar "${promoTitle}" del Home?`,
            'Eliminar',
            'Cancelar'
        );
        if (!confirmed) return;

        try {
            await supabaseService.deletePromotion(promoId);
            showToast('Publicidad eliminada', 'info');
            loadPromotions();
        } catch (err) {
            console.error('Error eliminando promoción:', err);
            showToast(`Error al eliminar: ${err.message}`, 'error');
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Header / Actions */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px'
            }}>
                <div>
                    <h3 style={{ fontSize: '18px', fontWeight: '800', margin: '0 0 4px 0', color: '#f8fafc' }}>
                        🔥 Publicidades & Banners del Home ({promotions.length})
                    </h3>
                    <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8' }}>
                        Gestioná las tarjetas destacadas que ven todos los usuarios arriba en el inicio de Turnitos.
                    </p>
                </div>
                <button
                    onClick={handleOpenCreate}
                    style={{
                        background: 'linear-gradient(135deg, #FF4081, #E91E63)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '10px',
                        padding: '10px 18px',
                        fontWeight: '700',
                        fontSize: '13px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        boxShadow: '0 4px 14px rgba(233, 30, 99, 0.35)'
                    }}
                >
                    <span>➕</span>
                    <span>Nueva Publicidad</span>
                </button>
            </div>

            {/* Grid of Promotions */}
            {loading ? (
                <div style={{ padding: '60px', textAlign: 'center', color: '#94a3b8' }}>
                    <div style={{ fontSize: '28px', marginBottom: '8px' }}>⏳</div>
                    Cargando publicidades del Home...
                </div>
            ) : promotions.length === 0 ? (
                <div style={{
                    padding: '60px 20px',
                    textAlign: 'center',
                    background: '#151c2c',
                    borderRadius: '16px',
                    border: '1px dashed rgba(255, 255, 255, 0.12)'
                }}>
                    <div style={{ fontSize: '40px', marginBottom: '12px' }}>📢</div>
                    <h4 style={{ margin: '0 0 8px 0', color: '#f8fafc', fontSize: '16px' }}>No hay publicidades activas</h4>
                    <p style={{ margin: '0 0 16px 0', color: '#94a3b8', fontSize: '13px' }}>
                        Agregá banners de eventos, promociones o convocatorias para que aparezcan en el carrusel del Home.
                    </p>
                    <button
                        onClick={handleOpenCreate}
                        style={{
                            background: '#2563eb',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '8px 16px',
                            fontWeight: '600',
                            fontSize: '13px',
                            cursor: 'pointer'
                        }}
                    >
                        Crear la primera publicidad
                    </button>
                </div>
            ) : (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                    gap: '20px'
                }}>
                    {promotions.map((promo) => {
                        const linkedBiz = businesses.find(b => b.id === promo.business_id) || promo.businesses;
                        const isExternal = promo.description?.startsWith('http://') || promo.description?.startsWith('https://') || promo.description?.startsWith('/');

                        return (
                            <div
                                key={promo.id}
                                style={{
                                    background: '#151c2c',
                                    borderRadius: '16px',
                                    overflow: 'hidden',
                                    border: '1px solid rgba(255, 255, 255, 0.08)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    boxShadow: '0 8px 20px rgba(0, 0, 0, 0.25)'
                                }}
                            >
                                {/* Image & Badge */}
                                <div style={{ position: 'relative', width: '100%', height: '170px', background: '#0a0f1d' }}>
                                    <img
                                        src={promo.image}
                                        alt={promo.title}
                                        style={{
                                            width: '100%',
                                            height: '100%',
                                            objectFit: 'cover'
                                        }}
                                        onError={(e) => {
                                            e.target.src = 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=600&q=80';
                                        }}
                                    />
                                    <div style={{
                                        position: 'absolute',
                                        top: '12px',
                                        right: '12px',
                                        background: 'linear-gradient(135deg, #FF4081, #E91E63)',
                                        color: '#fff',
                                        fontSize: '11px',
                                        fontWeight: '800',
                                        padding: '5px 10px',
                                        borderRadius: '8px',
                                        boxShadow: '0 4px 10px rgba(0,0,0,0.4)',
                                        letterSpacing: '0.5px',
                                        textTransform: 'uppercase'
                                    }}>
                                        {promo.discount || 'PROMO'}
                                    </div>
                                </div>

                                {/* Content */}
                                <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
                                    <div>
                                        <h4 style={{
                                            margin: '0 0 6px 0',
                                            fontSize: '16px',
                                            fontWeight: '700',
                                            color: '#f8fafc',
                                            lineHeight: 1.3
                                        }}>
                                            {promo.title}
                                        </h4>
                                        <p style={{
                                            margin: '0 0 8px 0',
                                            fontSize: '13px',
                                            color: linkedBiz ? '#60a5fa' : '#34d399',
                                            fontWeight: '600'
                                        }}>
                                            {linkedBiz ? `🏢 ${linkedBiz.name}` : '🌐 General / Campaña Turnitos'}
                                        </p>

                                        {isExternal && !linkedBiz && (
                                            <p style={{ margin: '0 0 8px 0', fontSize: '11.5px', color: '#94a3b8', wordBreak: 'break-all' }}>
                                                🔗 Botón dirige a: <span style={{ color: '#38bdf8' }}>{promo.description}</span>
                                            </p>
                                        )}

                                        {(promo.end_date || promo.expires_at) && (
                                            <p style={{ margin: '0 0 10px 0', fontSize: '11.5px', color: '#94a3b8' }}>
                                                ⏳ Vence: {new Date(promo.end_date || promo.expires_at).toLocaleDateString('es-AR')}
                                            </p>
                                        )}
                                    </div>

                                    {/* Action Buttons */}
                                    <div style={{ display: 'flex', gap: '8px', marginTop: '14px', borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: '12px' }}>
                                        <button
                                            onClick={() => handleOpenEdit(promo)}
                                            style={{
                                                flex: 1,
                                                background: '#1e293b',
                                                border: '1px solid #334155',
                                                borderRadius: '8px',
                                                padding: '8px',
                                                color: '#f8fafc',
                                                fontSize: '12px',
                                                fontWeight: '700',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            ✏️ Editar
                                        </button>
                                        <button
                                            onClick={() => handleDelete(promo.id, promo.title)}
                                            style={{
                                                flex: 1,
                                                background: 'rgba(239, 68, 68, 0.12)',
                                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                                borderRadius: '8px',
                                                padding: '8px',
                                                color: '#f87171',
                                                fontSize: '12px',
                                                fontWeight: '700',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            🗑️ Eliminar
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Modal Form Create/Edit */}
            {showModal && (
                <PromoModal
                    title={editingPromo ? 'Editar Publicidad del Home' : 'Nueva Publicidad para el Home'}
                    onClose={() => setShowModal(false)}
                >
                    <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#cbd5e1', marginBottom: '6px' }}>
                                Título de la Publicidad *
                            </label>
                            <input
                                type="text"
                                required
                                placeholder="Ej: Sumate a TurnitosLR / 2x1 en Turnos de Pádel"
                                value={form.title}
                                onChange={(e) => setForm({ ...form, title: e.target.value })}
                                style={{
                                    width: '100%',
                                    padding: '10px 14px',
                                    background: '#0a0f1d',
                                    border: '1px solid rgba(255, 255, 255, 0.12)',
                                    borderRadius: '8px',
                                    color: '#f8fafc',
                                    fontSize: '13px',
                                    boxSizing: 'border-box'
                                }}
                            />
                        </div>

                        {/* Image Uploader con Supabase Storage */}
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#cbd5e1', marginBottom: '6px' }}>
                                Imagen del Banner *
                            </label>

                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '8px' }}>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    accept="image/*"
                                    onChange={handleFileUpload}
                                    style={{ display: 'none' }}
                                />
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isUploading}
                                    style={{
                                        background: isUploading ? '#334155' : '#2563eb',
                                        color: '#fff',
                                        border: 'none',
                                        borderRadius: '8px',
                                        padding: '9px 15px',
                                        fontSize: '12.5px',
                                        fontWeight: '700',
                                        cursor: isUploading ? 'not-allowed' : 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px'
                                    }}
                                >
                                    <span>{isUploading ? '⏳ Subiendo...' : '📁 Subir Imagen a Supabase'}</span>
                                </button>
                                <span style={{ fontSize: '11.5px', color: '#94a3b8' }}>o ingresá la URL directa abajo:</span>
                            </div>

                            <input
                                type="url"
                                required
                                placeholder="https://... URL de la imagen"
                                value={form.image}
                                onChange={(e) => setForm({ ...form, image: e.target.value })}
                                style={{
                                    width: '100%',
                                    padding: '10px 14px',
                                    background: '#0a0f1d',
                                    border: '1px solid rgba(255, 255, 255, 0.12)',
                                    borderRadius: '8px',
                                    color: '#f8fafc',
                                    fontSize: '13px',
                                    boxSizing: 'border-box'
                                }}
                            />

                            {form.image && (
                                <div style={{ marginTop: '10px', height: '120px', borderRadius: '10px', overflow: 'hidden', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                                    <img
                                        src={form.image}
                                        alt="Vista previa"
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                        onError={(e) => { e.target.style.display = 'none'; }}
                                    />
                                </div>
                            )}
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#cbd5e1', marginBottom: '6px' }}>
                                    Etiqueta / Badge
                                </label>
                                <input
                                    type="text"
                                    placeholder="Ej: PLAN GRATIS / 2x1 / PROMO"
                                    value={form.discount}
                                    onChange={(e) => setForm({ ...form, discount: e.target.value })}
                                    style={{
                                        width: '100%',
                                        padding: '10px 14px',
                                        background: '#0a0f1d',
                                        border: '1px solid rgba(255, 255, 255, 0.12)',
                                        borderRadius: '8px',
                                        color: '#f8fafc',
                                        fontSize: '13px',
                                        boxSizing: 'border-box'
                                    }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#cbd5e1', marginBottom: '6px' }}>
                                    Válido Hasta (Opcional)
                                </label>
                                <input
                                    type="date"
                                    value={form.end_date}
                                    onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                                    style={{
                                        width: '100%',
                                        padding: '10px 14px',
                                        background: '#0a0f1d',
                                        border: '1px solid rgba(255, 255, 255, 0.12)',
                                        borderRadius: '8px',
                                        color: '#f8fafc',
                                        fontSize: '13px',
                                        boxSizing: 'border-box'
                                    }}
                                />
                            </div>
                        </div>

                        {/* Selector de Negocio Asociado */}
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#cbd5e1', marginBottom: '6px' }}>
                                Destino de la Publicidad
                            </label>
                            <select
                                value={form.business_id}
                                onChange={(e) => setForm({ ...form, business_id: e.target.value })}
                                style={{
                                    width: '100%',
                                    padding: '10px 14px',
                                    background: '#0a0f1d',
                                    border: '1px solid rgba(255, 255, 255, 0.12)',
                                    borderRadius: '8px',
                                    color: '#f8fafc',
                                    fontSize: '13px',
                                    boxSizing: 'border-box'
                                }}
                            >
                                <option value="">🌐 Campaña General (Sin negocio - Lleva a link externo/página)</option>
                                {businesses.map(b => (
                                    <option key={b.id} value={b.id}>🏢 {b.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Campo condicional: Si es General, botón de acción / URL de destino */}
                        {!form.business_id && (
                            <div style={{
                                background: 'rgba(37, 99, 235, 0.08)',
                                border: '1px solid rgba(37, 99, 235, 0.25)',
                                borderRadius: '10px',
                                padding: '12px 14px'
                            }}>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#60a5fa', marginBottom: '6px' }}>
                                    🔗 URL de Destino al hacer Clic en la Publicidad
                                </label>
                                <input
                                    type="text"
                                    placeholder="Ej: /negocios o https://wa.me/5493804123456 o https://forms.gle/..."
                                    value={form.action_url}
                                    onChange={(e) => setForm({ ...form, action_url: e.target.value })}
                                    style={{
                                        width: '100%',
                                        padding: '9px 12px',
                                        background: '#0a0f1d',
                                        border: '1px solid rgba(255, 255, 255, 0.15)',
                                        borderRadius: '8px',
                                        color: '#f8fafc',
                                        fontSize: '13px',
                                        boxSizing: 'border-box'
                                    }}
                                />
                                <span style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginTop: '6px' }}>
                                    Tip: Podés poner <code>/negocios</code>, un link de WhatsApp, o un formulario para registrar nuevos comercios.
                                </span>
                            </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                            <button
                                type="button"
                                onClick={() => setShowModal(false)}
                                style={{
                                    background: '#1e293b',
                                    border: '1px solid #334155',
                                    borderRadius: '8px',
                                    padding: '10px 18px',
                                    color: '#94a3b8',
                                    fontSize: '13px',
                                    fontWeight: '700',
                                    cursor: 'pointer'
                                }}
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={isSaving || isUploading}
                                style={{
                                    background: 'linear-gradient(135deg, #FF4081, #E91E63)',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: '8px',
                                    padding: '10px 20px',
                                    fontSize: '13px',
                                    fontWeight: '700',
                                    cursor: (isSaving || isUploading) ? 'not-allowed' : 'pointer',
                                    opacity: (isSaving || isUploading) ? 0.7 : 1
                                }}
                            >
                                {isSaving ? 'Guardando...' : (editingPromo ? 'Guardar Cambios' : 'Publicar en Home')}
                            </button>
                        </div>
                    </form>
                </PromoModal>
            )}
        </div>
    );
}
