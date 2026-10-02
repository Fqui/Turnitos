import React, { useState, useEffect, useRef } from 'react';
import supabaseService from '../../../services/supabaseService';
import { useNotification } from '../../../contexts/NotificationContext';
import { supabase } from '../../../services/supabaseClient';
import { parsePromotionTarget } from '../../../utils/promotionUtils';

function PromoModal({ title, children, onClose }) {
    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                background: 'var(--sa-surface)',
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
                    background: 'var(--sa-surface)',
                    borderRadius: '16px',
                    padding: '26px',
                    maxWidth: '540px',
                    width: '100%',
                    border: '1px solid var(--sa-border-strong)',
                    boxShadow: '0 25px 60px rgba(0, 0, 0, 0.5)',
                    maxHeight: '90vh',
                    overflowY: 'auto'
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h2 style={{ fontSize: '18px', fontWeight: '800', margin: 0, color: 'var(--sa-text)' }}>
                        {title}
                    </h2>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--sa-text-muted)',
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
        description: '',
        target_type: 'general',
        target_id: '',
        target_name: '',
        discount_type: 'percentage',
        discount_value: '',
        code: '',
        cta_text: ''
    });

    const [bizServices, setBizServices] = useState([]);
    const [bizProducts, setBizProducts] = useState([]);
    const [bizCategories, setBizCategories] = useState([]);
    const [loadingBizDetails, setLoadingBizDetails] = useState(false);

    // Cargar servicios, productos de tienda y categorías directamente desde la BD al cambiar de negocio
    useEffect(() => {
        if (!form.business_id) {
            setBizServices([]);
            setBizProducts([]);
            setBizCategories([]);
            return;
        }

        let isMounted = true;
        const fetchBizData = async () => {
            setLoadingBizDetails(true);
            try {
                // 1. Traer servicios reales de la BD
                const { data: servData, error: sErr } = await supabase
                    .from('services')
                    .select('id, name, price, category, duration, is_active')
                    .eq('business_id', form.business_id)
                    .order('name');
                if (sErr) console.warn('Error cargando servicios de la BD para promo:', sErr);
                const loadedServices = servData || [];

                // 2. Traer datos del negocio (metadata de store_products y relaciones de categorías)
                const { data: bData, error: bErr } = await supabase
                    .from('businesses')
                    .select('id, name, type, category, categories(id, name), business_subcategories(subcategories(id, name)), metadata')
                    .eq('id', form.business_id)
                    .single();
                if (bErr) console.warn('Error cargando metadata del negocio para promo:', bErr);

                // Productos de la tienda
                let loadedProducts = [];
                if (Array.isArray(bData?.metadata?.store_products)) {
                    loadedProducts = bData.metadata.store_products.filter(p => p.is_active !== false);
                }

                try {
                    const { data: dbProds } = await supabase
                        .from('store_products')
                        .select('*')
                        .eq('business_id', form.business_id);
                    if (dbProds && dbProds.length > 0) {
                        const existingIds = new Set(loadedProducts.map(p => String(p.id)));
                        dbProds.forEach(dp => {
                            if (!existingIds.has(String(dp.id))) {
                                loadedProducts.push(dp);
                            }
                        });
                    }
                } catch (ignore) {}

                // 3. Unificar categorías disponibles
                const sCats = [...new Set(loadedServices.map(s => s.category?.trim()).filter(Boolean))];
                const pCats = [...new Set(loadedProducts.map(p => p.category?.trim()).filter(Boolean))];
                const subcats = bData?.business_subcategories?.map(bs => bs.subcategories?.name?.trim()).filter(Boolean) || [];
                const mainCat = bData?.categories?.name?.trim() || bData?.category?.trim();

                const cats = [
                    ...sCats.map(c => ({ value: c, label: `${c} (Categoría de Servicios)`, group: 'Servicios' })),
                    ...pCats.filter(c => !sCats.includes(c)).map(c => ({ value: c, label: `${c} (Categoría de Tienda)`, group: 'Tienda' })),
                    ...(mainCat ? [{ value: mainCat, label: `${mainCat} (Rubro Principal)`, group: 'Rubro' }] : []),
                    ...subcats.filter(c => c !== mainCat && !sCats.includes(c)).map(c => ({ value: c, label: `${c} (Subcategoría)`, group: 'Rubro' }))
                ];

                if (isMounted) {
                    setBizServices(loadedServices);
                    setBizProducts(loadedProducts);
                    setBizCategories(cats);
                }
            } catch (err) {
                console.error('Error al obtener datos del negocio para la promo:', err);
            } finally {
                if (isMounted) setLoadingBizDetails(false);
            }
        };

        fetchBizData();
        return () => { isMounted = false; };
    }, [form.business_id]);

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
            description: '',
            target_type: 'general',
            target_id: '',
            target_name: '',
            discount_type: 'percentage',
            discount_value: '',
            code: '',
            cta_text: ''
        });
        setShowModal(true);
    };

    const handleOpenEdit = (promo) => {
        setEditingPromo(promo);
        const parsed = parsePromotionTarget(promo);
        const isUrl = promo.description?.startsWith('http://') || promo.description?.startsWith('https://') || promo.description?.startsWith('/');
        setForm({
            title: promo.title || '',
            discount: promo.discount || '',
            image: promo.image || '',
            business_id: promo.business_id || '',
            action_url: parsed.action_url || (isUrl ? promo.description : ''),
            end_date: promo.end_date || (promo.expires_at ? promo.expires_at.split('T')[0] : ''),
            description: parsed.text || (isUrl ? '' : (promo.description || '')),
            target_type: parsed.target_type || 'general',
            target_id: parsed.target_id || '',
            target_name: parsed.target_name || '',
            discount_type: parsed.discount_type || 'percentage',
            discount_value: parsed.discount_value || '',
            code: parsed.code || '',
            cta_text: parsed.cta_text || ''
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
            let finalDescription = null;
            if (!form.business_id && cleanActionUrl && !form.description?.trim() && !form.cta_text?.trim()) {
                finalDescription = cleanActionUrl;
            } else {
                const meta = {
                    text: form.description?.trim() || '',
                    code: form.code?.trim().toUpperCase() || '',
                    target_type: form.target_type || 'general',
                    target_id: form.target_id || null,
                    target_name: form.target_name || '',
                    discount_type: form.discount_type || 'percentage',
                    discount_value: Number(form.discount_value || 0),
                    cta_text: form.cta_text?.trim() || '',
                    action_url: cleanActionUrl || ''
                };
                finalDescription = JSON.stringify(meta);
            }

            let computedDiscount = form.discount.trim();
            if (!computedDiscount && form.discount_value > 0) {
                computedDiscount = form.discount_type === 'fixed'
                    ? `$${Number(form.discount_value).toLocaleString('es-AR')} OFF`
                    : `${form.discount_value}% OFF`;
            }
            if (!computedDiscount) {
                computedDiscount = 'PROMO';
            }

            // Sanitizamos el payload exacto de la tabla promotions de Supabase
            const promoPayload = {
                title: form.title.trim(),
                discount: computedDiscount,
                image: form.image.trim(),
                business_id: form.business_id ? form.business_id : null,
                description: finalDescription,
                service_id: (form.target_type === 'service' && form.target_id) ? form.target_id : null,
                discount_type: form.discount_type || 'percentage',
                discount_value: Number(form.discount_value || 0),
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
                    <h3 style={{ fontSize: '18px', fontWeight: '800', margin: '0 0 4px 0', color: 'var(--sa-text)' }}>
                        🔥 Publicidades & Banners del Home ({promotions.length})
                    </h3>
                    <p style={{ margin: 0, fontSize: '13px', color: 'var(--sa-text-muted)' }}>
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
                <div style={{ padding: '60px', textAlign: 'center', color: 'var(--sa-text-muted)' }}>
                    <div style={{ fontSize: '28px', marginBottom: '8px' }}>⏳</div>
                    Cargando publicidades del Home...
                </div>
            ) : promotions.length === 0 ? (
                <div style={{
                    padding: '60px 20px',
                    textAlign: 'center',
                    background: 'var(--sa-surface)',
                    borderRadius: '16px',
                    border: '1px dashed var(--sa-border-strong)'
                }}>
                    <div style={{ fontSize: '40px', marginBottom: '12px' }}>📢</div>
                    <h4 style={{ margin: '0 0 8px 0', color: 'var(--sa-text)', fontSize: '16px' }}>No hay publicidades activas</h4>
                    <p style={{ margin: '0 0 16px 0', color: 'var(--sa-text-muted)', fontSize: '13px' }}>
                        Agregá banners de eventos, promociones o convocatorias para que aparezcan en el carrusel del Home.
                    </p>
                    <button
                        onClick={handleOpenCreate}
                        style={{
                            background: 'var(--sa-primary)',
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
                                    background: 'var(--sa-surface)',
                                    borderRadius: '16px',
                                    overflow: 'hidden',
                                    border: '1px solid var(--sa-border)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    boxShadow: '0 8px 20px rgba(0, 0, 0, 0.25)'
                                }}
                            >
                                {/* Image & Badge */}
                                <div style={{ position: 'relative', width: '100%', height: '170px', background: 'var(--sa-bg)' }}>
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
                                        {(() => {
                                            const parsedTarget = parsePromotionTarget(promo);
                                            return (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', flexWrap: 'wrap' }}>
                                                    <span style={{
                                                        fontSize: '10.5px',
                                                        fontWeight: '800',
                                                        padding: '3px 8px',
                                                        borderRadius: '6px',
                                                        background: 'rgba(56, 189, 248, 0.15)',
                                                        color: '#38bdf8'
                                                    }}>
                                                        {parsedTarget.target_type === 'service' ? '💆 SERVICIO' :
                                                         parsedTarget.target_type === 'category' ? '🏷️ CATEGORÍA' :
                                                         parsedTarget.target_type === 'store' ? '🛍️ TIENDA' : '🌐 GENERAL'}
                                                    </span>
                                                    {parsedTarget.code && (
                                                        <span style={{
                                                            fontSize: '10.5px',
                                                            fontWeight: '800',
                                                            padding: '3px 8px',
                                                            borderRadius: '6px',
                                                            background: 'rgba(16, 185, 129, 0.15)',
                                                            color: '#10b981'
                                                        }}>
                                                            🎟️ {parsedTarget.code}
                                                        </span>
                                                    )}
                                                </div>
                                            );
                                        })()}

                                        <h4 style={{
                                            margin: '0 0 6px 0',
                                            fontSize: '16px',
                                            fontWeight: '700',
                                            color: 'var(--sa-text)',
                                            lineHeight: 1.3
                                        }}>
                                            {promo.title}
                                        </h4>
                                        <p style={{
                                            margin: '0 0 6px 0',
                                            fontSize: '13px',
                                            color: linkedBiz ? 'var(--sa-primary-text)' : 'var(--sa-primary-text)',
                                            fontWeight: '600'
                                        }}>
                                            {linkedBiz ? `🏢 ${linkedBiz.name}` : '🌐 General / Campaña Turnitos'}
                                        </p>

                                        {(() => {
                                            const pt = parsePromotionTarget(promo);
                                            if (pt.target_type === 'service' && pt.target_name) {
                                                return (
                                                    <p style={{ margin: '0 0 6px 0', fontSize: '12px', color: 'var(--sa-text-2)' }}>
                                                        💆 Servicio: <strong style={{ color: '#10b981' }}>{pt.target_name}</strong>
                                                    </p>
                                                );
                                            }
                                            if (pt.target_type === 'product' && pt.target_name) {
                                                return (
                                                    <p style={{ margin: '0 0 6px 0', fontSize: '12px', color: 'var(--sa-text-2)' }}>
                                                        🛍️ Producto: <strong style={{ color: '#38bdf8' }}>{pt.target_name}</strong>
                                                    </p>
                                                );
                                            }
                                            if (pt.target_type === 'category' && pt.target_name) {
                                                return (
                                                    <p style={{ margin: '0 0 6px 0', fontSize: '12px', color: 'var(--sa-text-2)' }}>
                                                        🏷️ Categoría: <strong style={{ color: '#f59e0b' }}>{pt.target_name}</strong>
                                                    </p>
                                                );
                                            }
                                            if (pt.target_type === 'store') {
                                                return (
                                                    <p style={{ margin: '0 0 6px 0', fontSize: '12px', color: 'var(--sa-text-2)' }}>
                                                        🏬 Alcance: <strong style={{ color: '#a855f7' }}>Toda la Tienda</strong>
                                                    </p>
                                                );
                                            }
                                            return null;
                                        })()}

                                        {isExternal && !linkedBiz && (
                                            <p style={{ margin: '0 0 8px 0', fontSize: '11.5px', color: 'var(--sa-text-muted)', wordBreak: 'break-all' }}>
                                                🔗 Botón dirige a: <span style={{ color: '#38bdf8' }}>{promo.description}</span>
                                            </p>
                                        )}

                                        {(promo.end_date || promo.expires_at) && (
                                            <p style={{ margin: '0 0 10px 0', fontSize: '11.5px', color: 'var(--sa-text-muted)' }}>
                                                ⏳ Vence: {new Date(promo.end_date || promo.expires_at).toLocaleDateString('es-AR')}
                                            </p>
                                        )}
                                    </div>

                                    {/* Action Buttons */}
                                    <div style={{ display: 'flex', gap: '8px', marginTop: '14px', borderTop: '1px solid var(--sa-border)', paddingTop: '12px' }}>
                                        <button
                                            onClick={() => handleOpenEdit(promo)}
                                            style={{
                                                flex: 1,
                                                background: 'var(--sa-surface-2)',
                                                border: '1px solid var(--sa-border-strong)',
                                                borderRadius: '8px',
                                                padding: '8px',
                                                color: 'var(--sa-text)',
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
                                                color: 'var(--sa-danger)',
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
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--sa-text-2)', marginBottom: '6px' }}>
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
                                    background: 'var(--sa-bg)',
                                    border: '1px solid var(--sa-border-strong)',
                                    borderRadius: '8px',
                                    color: 'var(--sa-text)',
                                    fontSize: '13px',
                                    boxSizing: 'border-box'
                                }}
                            />
                        </div>

                        {/* Image Uploader con Supabase Storage */}
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--sa-text-2)', marginBottom: '6px' }}>
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
                                        background: isUploading ? 'var(--sa-border-strong)' : 'var(--sa-primary)',
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
                                <span style={{ fontSize: '11.5px', color: 'var(--sa-text-muted)' }}>o ingresá la URL directa abajo:</span>
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
                                    background: 'var(--sa-bg)',
                                    border: '1px solid var(--sa-border-strong)',
                                    borderRadius: '8px',
                                    color: 'var(--sa-text)',
                                    fontSize: '13px',
                                    boxSizing: 'border-box'
                                }}
                            />

                            {form.image && (
                                <div style={{ marginTop: '10px', height: '120px', borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--sa-border-strong)' }}>
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
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--sa-text-2)', marginBottom: '6px' }}>
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
                                        background: 'var(--sa-bg)',
                                        border: '1px solid var(--sa-border-strong)',
                                        borderRadius: '8px',
                                        color: 'var(--sa-text)',
                                        fontSize: '13px',
                                        boxSizing: 'border-box'
                                    }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--sa-text-2)', marginBottom: '6px' }}>
                                    Válido Hasta (Opcional)
                                </label>
                                <input
                                    type="date"
                                    value={form.end_date}
                                    onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                                    style={{
                                        width: '100%',
                                        padding: '10px 14px',
                                        background: 'var(--sa-bg)',
                                        border: '1px solid var(--sa-border-strong)',
                                        borderRadius: '8px',
                                        color: 'var(--sa-text)',
                                        fontSize: '13px',
                                        boxSizing: 'border-box'
                                    }}
                                />
                            </div>
                        </div>

                        {/* Selector de Negocio Asociado */}
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--sa-text-2)', marginBottom: '6px' }}>
                                Destino de la Publicidad
                            </label>
                            <select
                                value={form.business_id}
                                onChange={(e) => setForm({
                                    ...form,
                                    business_id: e.target.value,
                                    target_type: 'general',
                                    target_id: '',
                                    target_name: ''
                                })}
                                style={{
                                    width: '100%',
                                    padding: '10px 14px',
                                    background: 'var(--sa-bg)',
                                    border: '1px solid var(--sa-border-strong)',
                                    borderRadius: '8px',
                                    color: 'var(--sa-text)',
                                    fontSize: '13px',
                                    boxSizing: 'border-box'
                                }}
                            >
                                <option value="">🌐 Campaña General (Sin negocio - Banner completo 100% de ancho sin división)</option>
                                {businesses.map(b => (
                                    <option key={b.id} value={b.id}>🏢 {b.name}</option>
                                ))}
                            </select>

                            {!form.business_id && (
                                <div style={{
                                    marginTop: '8px',
                                    padding: '10px 14px',
                                    background: 'var(--sa-primary-soft)',
                                    border: '1px solid var(--sa-primary-soft)',
                                    borderRadius: '8px',
                                    fontSize: '12px',
                                    color: '#93c5fd',
                                    lineHeight: 1.45
                                }}>
                                    📢 <strong>Modo Campaña General:</strong> En el Home la imagen se mostrará como un <strong>banner gráfico completo al 100% de ancho</strong> (sin división en columnas ni textos del sistema superpuestos).
                                    <div style={{ marginTop: '5px', fontSize: '11.5px', color: 'var(--sa-text-2)' }}>
                                        📐 <strong>Tamaño ideal recomendado para el diseño:</strong> <strong>1200 × 300 px</strong> (o 2400 × 600 px en HD, proporción 4:1) para que el diseño ocupe todo el ancho sin recortar nada.
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Opciones Avanzadas cuando hay un negocio vinculado */}
                        {form.business_id && (() => {
                            const selectedBiz = businesses.find(b => b.id === form.business_id);

                            return (
                                <div style={{
                                    background: 'var(--sa-hover)',
                                    border: '1px solid var(--sa-border)',
                                    borderRadius: '12px',
                                    padding: '14px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '14px'
                                }}>
                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                            <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--sa-text-2)' }}>
                                                🎯 Alcance del Beneficio
                                            </label>
                                            {loadingBizDetails && (
                                                <span style={{ fontSize: '11px', color: '#38bdf8' }}>
                                                    ⏳ Cargando datos de la BD...
                                                </span>
                                            )}
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(105px, 1fr))', gap: '8px' }}>
                                            {[
                                                { id: 'general', label: '🌐 General', desc: 'Todo el negocio' },
                                                { id: 'service', label: '💆 Servicio', desc: `Servicio (${bizServices.length})` },
                                                { id: 'category', label: '🏷️ Categoría', desc: `Categoría (${bizCategories.length})` },
                                                { id: 'product', label: '🛍️ Producto', desc: `Producto (${bizProducts.length})` },
                                                { id: 'store', label: '🏬 Tienda', desc: 'Toda la tienda' }
                                            ].map(t => (
                                                <button
                                                    key={t.id}
                                                    type="button"
                                                    onClick={() => setForm({ ...form, target_type: t.id, target_id: '', target_name: '' })}
                                                    style={{
                                                        padding: '8px 10px',
                                                        borderRadius: '8px',
                                                        border: form.target_type === t.id ? '2px solid #10b981' : '1px solid var(--sa-border-strong)',
                                                        background: form.target_type === t.id ? 'rgba(16, 185, 129, 0.15)' : 'var(--sa-bg)',
                                                        color: form.target_type === t.id ? '#10b981' : 'var(--sa-text-2)',
                                                        cursor: 'pointer',
                                                        textAlign: 'center',
                                                        fontSize: '12px',
                                                        fontWeight: '700',
                                                        transition: 'all 0.15s ease'
                                                    }}
                                                >
                                                    <div>{t.label}</div>
                                                    <div style={{ fontSize: '10px', color: 'var(--sa-text-muted)', marginTop: '2px', fontWeight: '400' }}>{t.desc}</div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Si el objetivo es servicio específico */}
                                    {form.target_type === 'service' && (
                                        <div>
                                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--sa-text-2)', marginBottom: '6px' }}>
                                                Seleccionar Servicio en Promoción (de la BD) *
                                            </label>
                                            {loadingBizDetails ? (
                                                <div style={{ padding: '10px', fontSize: '12px', color: 'var(--sa-text-muted)' }}>
                                                    ⏳ Cargando servicios de la base de datos...
                                                </div>
                                            ) : bizServices.length > 0 ? (
                                                <select
                                                    required
                                                    value={form.target_id}
                                                    onChange={(e) => {
                                                        const sId = e.target.value;
                                                        const sObj = bizServices.find(s => String(s.id) === String(sId));
                                                        setForm({
                                                            ...form,
                                                            target_id: sId,
                                                            target_name: sObj?.name || ''
                                                        });
                                                    }}
                                                    style={{
                                                        width: '100%',
                                                        padding: '10px 14px',
                                                        background: 'var(--sa-bg)',
                                                        border: '1px solid var(--sa-border-strong)',
                                                        borderRadius: '8px',
                                                        color: 'var(--sa-text)',
                                                        fontSize: '13px'
                                                    }}
                                                >
                                                    <option value="">-- Elige un servicio ({bizServices.length} disponibles) --</option>
                                                    {bizServices.map(s => (
                                                        <option key={s.id} value={s.id}>
                                                            {s.name} (${Number(s.price || 0).toLocaleString('es-AR')}) {s.category ? `• [${s.category}]` : ''}
                                                        </option>
                                                    ))}
                                                </select>
                                            ) : (
                                                <div>
                                                    <div style={{ fontSize: '12px', color: 'var(--sa-danger)', marginBottom: '6px' }}>
                                                        ⚠️ Este negocio no tiene servicios registrados en la base de datos.
                                                    </div>
                                                    <input
                                                        type="text"
                                                        placeholder="Escribir nombre del servicio manualmente..."
                                                        value={form.target_name}
                                                        onChange={(e) => setForm({ ...form, target_name: e.target.value })}
                                                        style={{
                                                            width: '100%',
                                                            padding: '10px 14px',
                                                            background: 'var(--sa-bg)',
                                                            border: '1px solid var(--sa-border-strong)',
                                                            borderRadius: '8px',
                                                            color: 'var(--sa-text)',
                                                            fontSize: '13px'
                                                        }}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Si el objetivo es categoría */}
                                    {form.target_type === 'category' && (
                                        <div>
                                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--sa-text-2)', marginBottom: '6px' }}>
                                                Categoría a la que aplica el descuento (de la BD) *
                                            </label>
                                            {loadingBizDetails ? (
                                                <div style={{ padding: '10px', fontSize: '12px', color: 'var(--sa-text-muted)' }}>
                                                    ⏳ Cargando categorías de la base de datos...
                                                </div>
                                            ) : bizCategories.length > 0 ? (
                                                <select
                                                    required
                                                    value={form.target_name}
                                                    onChange={(e) => setForm({ ...form, target_name: e.target.value, target_id: '' })}
                                                    style={{
                                                        width: '100%',
                                                        padding: '10px 14px',
                                                        background: 'var(--sa-bg)',
                                                        border: '1px solid var(--sa-border-strong)',
                                                        borderRadius: '8px',
                                                        color: 'var(--sa-text)',
                                                        fontSize: '13px'
                                                    }}
                                                >
                                                    <option value="">-- Elige una categoría ({bizCategories.length} disponibles) --</option>
                                                    {bizCategories.map((cat, idx) => (
                                                        <option key={idx} value={cat.value}>
                                                            {cat.label}
                                                        </option>
                                                    ))}
                                                </select>
                                            ) : (
                                                <div>
                                                    <div style={{ fontSize: '12px', color: 'var(--sa-danger)', marginBottom: '6px' }}>
                                                        ⚠️ No se encontraron categorías cargadas para este negocio.
                                                    </div>
                                                    <input
                                                        type="text"
                                                        placeholder="Nombre de la categoría (Ej: Manicuría, Uñas, etc.)"
                                                        value={form.target_name}
                                                        onChange={(e) => setForm({ ...form, target_name: e.target.value })}
                                                        style={{
                                                            width: '100%',
                                                            padding: '10px 14px',
                                                            background: 'var(--sa-bg)',
                                                            border: '1px solid var(--sa-border-strong)',
                                                            borderRadius: '8px',
                                                            color: 'var(--sa-text)',
                                                            fontSize: '13px'
                                                        }}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Si el objetivo es producto específico de tienda */}
                                    {form.target_type === 'product' && (
                                        <div>
                                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--sa-text-2)', marginBottom: '6px' }}>
                                                Seleccionar Producto de la Tienda (de la BD) *
                                            </label>
                                            {loadingBizDetails ? (
                                                <div style={{ padding: '10px', fontSize: '12px', color: 'var(--sa-text-muted)' }}>
                                                    ⏳ Cargando productos de la tienda desde la BD...
                                                </div>
                                            ) : bizProducts.length > 0 ? (
                                                <select
                                                    required
                                                    value={form.target_id}
                                                    onChange={(e) => {
                                                        const pId = e.target.value;
                                                        const pObj = bizProducts.find(p => String(p.id) === String(pId));
                                                        setForm({
                                                            ...form,
                                                            target_id: pId,
                                                            target_name: pObj?.name || ''
                                                        });
                                                    }}
                                                    style={{
                                                        width: '100%',
                                                        padding: '10px 14px',
                                                        background: 'var(--sa-bg)',
                                                        border: '1px solid var(--sa-border-strong)',
                                                        borderRadius: '8px',
                                                        color: 'var(--sa-text)',
                                                        fontSize: '13px'
                                                    }}
                                                >
                                                    <option value="">-- Elige un producto ({bizProducts.length} disponibles) --</option>
                                                    {bizProducts.map(p => (
                                                        <option key={p.id} value={p.id}>
                                                            {p.name} (${Number(p.price || 0).toLocaleString('es-AR')}) {p.category ? `• [${p.category}]` : ''}
                                                        </option>
                                                    ))}
                                                </select>
                                            ) : (
                                                <div>
                                                    <div style={{ fontSize: '12px', color: 'var(--sa-danger)', marginBottom: '6px' }}>
                                                        ⚠️ Este negocio aún no tiene productos cargados en su tienda online.
                                                    </div>
                                                    <input
                                                        type="text"
                                                        placeholder="Escribir nombre del producto..."
                                                        value={form.target_name}
                                                        onChange={(e) => setForm({ ...form, target_name: e.target.value })}
                                                        style={{
                                                            width: '100%',
                                                            padding: '10px 14px',
                                                            background: 'var(--sa-bg)',
                                                            border: '1px solid var(--sa-border-strong)',
                                                            borderRadius: '8px',
                                                            color: 'var(--sa-text)',
                                                            fontSize: '13px'
                                                        }}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Si el objetivo es toda la tienda */}
                                    {form.target_type === 'store' && (
                                        <div style={{
                                            background: 'rgba(16, 185, 129, 0.08)',
                                            border: '1px solid rgba(16, 185, 129, 0.25)',
                                            borderRadius: '8px',
                                            padding: '10px 12px',
                                            fontSize: '12px',
                                            color: '#10b981'
                                        }}>
                                            🛍️ Esta promoción dirigirá a los usuarios a la Tienda Online del negocio y aplicará el beneficio en su carrito de compras.
                                        </div>
                                    )}

                                    {/* Descuentos y Código */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--sa-text-2)', marginBottom: '6px' }}>
                                                Tipo de Descuento
                                            </label>
                                            <select
                                                value={form.discount_type}
                                                onChange={(e) => setForm({ ...form, discount_type: e.target.value })}
                                                style={{
                                                    width: '100%',
                                                    padding: '10px 14px',
                                                    background: 'var(--sa-bg)',
                                                    border: '1px solid var(--sa-border-strong)',
                                                    borderRadius: '8px',
                                                    color: 'var(--sa-text)',
                                                    fontSize: '13px'
                                                }}
                                            >
                                                <option value="percentage">% Porcentaje OFF</option>
                                                <option value="fixed">$ Monto Fijo</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--sa-text-2)', marginBottom: '6px' }}>
                                                Valor {form.discount_type === 'percentage' ? '(%)' : '($)'}
                                            </label>
                                            <input
                                                type="number"
                                                min="0"
                                                placeholder={form.discount_type === 'percentage' ? 'Ej: 20' : 'Ej: 2500'}
                                                value={form.discount_value}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    const defaultBadge = val > 0
                                                        ? (form.discount_type === 'fixed' ? `$${Number(val).toLocaleString('es-AR')} OFF` : `${val}% OFF`)
                                                        : '';
                                                    setForm({
                                                        ...form,
                                                        discount_value: val,
                                                        discount: defaultBadge || form.discount
                                                    });
                                                }}
                                                style={{
                                                    width: '100%',
                                                    padding: '10px 14px',
                                                    background: 'var(--sa-bg)',
                                                    border: '1px solid var(--sa-border-strong)',
                                                    borderRadius: '8px',
                                                    color: 'var(--sa-text)',
                                                    fontSize: '13px'
                                                }}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--sa-text-2)', marginBottom: '6px' }}>
                                            Código de Cupón (Opcional)
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="Ej: LUMORE20 o PROMOVERANO"
                                            value={form.code}
                                            onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                                            style={{
                                                width: '100%',
                                                padding: '10px 14px',
                                                background: 'var(--sa-bg)',
                                                border: '1px solid var(--sa-border-strong)',
                                                borderRadius: '8px',
                                                color: '#10b981',
                                                fontWeight: '800',
                                                fontSize: '13px',
                                                letterSpacing: '0.6px'
                                            }}
                                        />
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--sa-text-2)', marginBottom: '6px' }}>
                                            Descripción / Condiciones (Para el Modal de la Promo)
                                        </label>
                                        <textarea
                                            rows={2}
                                            placeholder="Ej: Válido para tu primer turno abonando con transferencia o efectivo."
                                            value={form.description}
                                            onChange={(e) => setForm({ ...form, description: e.target.value })}
                                            style={{
                                                width: '100%',
                                                padding: '10px 14px',
                                                background: 'var(--sa-bg)',
                                                border: '1px solid var(--sa-border-strong)',
                                                borderRadius: '8px',
                                                color: 'var(--sa-text)',
                                                fontSize: '13px',
                                                resize: 'vertical'
                                            }}
                                        />
                                        <span style={{ display: 'block', fontSize: '11px', color: 'var(--sa-text-muted)', marginTop: '4px' }}>
                                            💡 Opcional. Si lo dejás vacío, el modal no mostrará ningún texto secundario.
                                        </span>
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--sa-text-2)', marginBottom: '6px' }}>
                                            Texto del Botón de Acción (Opcional)
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="Ej: Reservar con Descuento / Aprovechar Oferta"
                                            value={form.cta_text}
                                            onChange={(e) => setForm({ ...form, cta_text: e.target.value })}
                                            style={{
                                                width: '100%',
                                                padding: '10px 14px',
                                                background: 'var(--sa-bg)',
                                                border: '1px solid var(--sa-border-strong)',
                                                borderRadius: '8px',
                                                color: 'var(--sa-text)',
                                                fontSize: '13px',
                                                boxSizing: 'border-box'
                                            }}
                                        />
                                        <span style={{ display: 'block', fontSize: '11px', color: 'var(--sa-text-muted)', marginTop: '4px' }}>
                                            💡 Si lo dejás vacío, el botón se adaptará automáticamente según la acción.
                                        </span>
                                    </div>
                                </div>
                            );
                        })()}

                        {/* Campo condicional: Si es General, botón de acción / URL de destino */}
                        {!form.business_id && (
                            <div style={{
                                background: 'var(--sa-primary-soft)',
                                border: '1px solid var(--sa-primary-soft)',
                                borderRadius: '10px',
                                padding: '12px 14px'
                            }}>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--sa-primary-text)', marginBottom: '6px' }}>
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
                                        background: 'var(--sa-bg)',
                                        border: '1px solid var(--sa-border-strong)',
                                        borderRadius: '8px',
                                        color: 'var(--sa-text)',
                                        fontSize: '13px',
                                        boxSizing: 'border-box'
                                    }}
                                />
                                <span style={{ display: 'block', fontSize: '11px', color: 'var(--sa-text-muted)', marginTop: '6px' }}>
                                    Tip: Podés poner <code>/negocios</code>, un link de WhatsApp, o un formulario para registrar nuevos comercios.
                                </span>
                            </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                            <button
                                type="button"
                                onClick={() => setShowModal(false)}
                                style={{
                                    background: 'var(--sa-surface-2)',
                                    border: '1px solid var(--sa-border-strong)',
                                    borderRadius: '8px',
                                    padding: '10px 18px',
                                    color: 'var(--sa-text-muted)',
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
