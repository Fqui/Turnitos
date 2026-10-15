import React, { useState, useEffect, useRef } from 'react';
import supabaseService from '../../../services/supabaseService';
import { useNotification } from '../../../contexts/NotificationContext';
import { supabase } from '../../../services/supabaseClient';
import { parsePromotionTarget, getPromotionStatus, todayAR, PROMO_KINDS, getPromoKindMeta, getPromoConditionChips, DAY_SHORT, WEEK_ORDER } from '../../../utils/promotionUtils';
import { getPromotionStats } from '../../../services/supabase/promotionService';
import { useBodyScrollLock } from '../../../hooks/useBodyScrollLock';

const STATUS_META = {
    live: { label: 'Vigente', color: '#10b981' },
    paused: { label: 'Pausada', color: '#f59e0b' },
    expired: { label: 'Vencida', color: '#ef4444' },
    scheduled: { label: 'Programada', color: '#38bdf8' }
};

const formatNumber = (n) => Number(n || 0).toLocaleString('es-AR');
const formatMoney = (n) => `$${Math.round(Number(n || 0)).toLocaleString('es-AR')}`;
// Suma días a una fecha 'YYYY-MM-DD' (sin zona horaria)
const addDays = (ymd, days) => {
    const [y, m, d] = String(ymd).slice(0, 10).split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d + days));
    return dt.toISOString().slice(0, 10);
};
// Días entre dos fechas 'YYYY-MM-DD' (b - a)
const daysBetween = (a, b) => {
    const [y1, m1, d1] = String(a).slice(0, 10).split('-').map(Number);
    const [y2, m2, d2] = String(b).slice(0, 10).split('-').map(Number);
    return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000);
};

const PERIOD_PRESETS = [7, 15, 30];

// Columnas de reglas según el tipo de promo
function buildRulesPayload(form) {
    const kind = form.promo_kind || 'general';
    const usesDays = kind === 'schedule' || kind === 'weekday';
    const days = usesDays && Array.isArray(form.valid_days) && form.valid_days.length > 0 && form.valid_days.length < 7
        ? [...form.valid_days].sort((a, b) => a - b)
        : null;
    return {
        promo_kind: kind,
        valid_days: days,
        time_from: kind === 'schedule' && form.time_from ? form.time_from : null,
        time_to: kind === 'schedule' && form.time_to ? form.time_to : null,
        min_advance_days: kind === 'advance' && Number(form.min_advance_days) > 0 ? Number(form.min_advance_days) : null,
        first_visit_only: kind === 'first_visit',
        max_uses_per_customer: kind !== 'visibility' && Number(form.max_uses_per_customer) > 0 ? Number(form.max_uses_per_customer) : null
    };
}

// Texto que explica la regla, para la vista previa del formulario
function describeRule(form, chipsText) {
    switch (form.promo_kind) {
        case 'schedule': return `El descuento se aplica solo a turnos que empiecen ${chipsText || 'en los días y horario elegidos'}. Fuera de eso, el cliente ve el precio normal.`;
        case 'weekday': return `El descuento se aplica solo ${chipsText || 'los días elegidos'}, todo el día.`;
        case 'service': return 'El descuento se aplica solo al servicio, cancha o categoría que elijas en "Alcance".';
        case 'first_visit': return 'Se aplica si el teléfono del cliente nunca reservó en este negocio (lo controla la base al guardar).';
        case 'advance': return `Se aplica si la reserva se hace con ${form.min_advance_days || '—'} días o más de anticipación.`;
        case 'visibility': return 'No cambia ningún precio: el banner lleva al perfil del negocio.';
        default: return 'Descuento en cualquier turno, sin condiciones.';
    }
}

const FILTERS = [
    { id: 'all', label: 'Todas' },
    { id: 'live', label: 'Vigentes' },
    { id: 'scheduled', label: 'Programadas' },
    { id: 'expired', label: 'Vencidas' },
    { id: 'paused', label: 'Pausadas' }
];

// Texto listo para mandarle al negocio por WhatsApp con los números de su publicidad
function buildPromoReport(promo, bizName, stats) {
    const s = stats || { views: 0, clicks: 0, bookings: 0, revenue: 0 };
    const ctr = s.views > 0 ? (s.clicks / s.views) * 100 : 0;
    const start = promo.start_date ? formatDay(promo.start_date) : null;
    const end = promo.end_date ? formatDay(promo.end_date) : null;
    const period = start && end ? ` (del ${start} al ${end})` : (start ? ` (desde el ${start})` : '');
    return [
        `📢 *Tu publicidad en TurnitosLR*`,
        `${bizName ? `*${bizName}* — ` : ''}"${promo.title}"${period}`,
        '',
        `👀 ${formatNumber(s.views)} vistas en el inicio`,
        `👆 ${formatNumber(s.clicks)} clics (${ctr.toLocaleString('es-AR', { maximumFractionDigits: 1 })}%)`,
        `📅 ${formatNumber(s.bookings)} reservas con la promo`,
        `💰 ${formatMoney(s.revenue)} en reservas generadas`,
        '',
        'Gracias por confiar en TurnitosLR 🙌'
    ].join('\n');
}

// 'YYYY-MM-DD' -> 'dd/mm/aaaa' sin correr el día por la zona horaria
const formatDay = (value) => {
    const [y, m, d] = String(value).slice(0, 10).split('-');
    return d && m && y ? `${d}/${m}/${y}` : String(value);
};

function PromoStats({ stats }) {
    const s = stats || { views: 0, clicks: 0, bookings: 0, revenue: 0 };
    const ctr = s.views > 0 ? (s.clicks / s.views) * 100 : 0;
    const items = [
        { label: 'Vistas', value: formatNumber(s.views) },
        { label: 'Clics', value: formatNumber(s.clicks) },
        { label: 'CTR', value: `${ctr.toLocaleString('es-AR', { maximumFractionDigits: 1 })}%` },
        { label: 'Reservas', value: formatNumber(s.bookings) },
        { label: 'Facturación', value: formatMoney(s.revenue) }
    ];
    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(76px, 1fr))',
            gap: '6px',
            marginTop: '10px'
        }}>
            {items.map(item => (
                <div key={item.label} style={{
                    background: 'var(--sa-bg)',
                    border: '1px solid var(--sa-border)',
                    borderRadius: '8px',
                    padding: '6px 8px',
                    minWidth: 0
                }}>
                    <div style={{ fontSize: '10px', fontWeight: '700', color: 'var(--sa-text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                        {item.label}
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: '800', color: 'var(--sa-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.value}
                    </div>
                </div>
            ))}
        </div>
    );
}

function PromoModal({ title, children, onClose }) {
    useBodyScrollLock();
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
    const [promoStats, setPromoStats] = useState({});
    const [statsError, setStatsError] = useState(false);
    const [togglingId, setTogglingId] = useState(null);
    const [statusFilter, setStatusFilter] = useState('all');
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
        start_date: '',
        end_date: '',
        description: '',
        target_type: 'general',
        target_id: '',
        target_name: '',
        discount_type: 'percentage',
        discount_value: '',
        code: '',
        cta_text: '',
        promo_kind: 'general',
        valid_days: [],
        time_from: '',
        time_to: '',
        min_advance_days: '',
        max_uses_per_customer: ''
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
            const [data, stats] = await Promise.all([
                supabaseService.getPromotions(),
                getPromotionStats().catch(err => {
                    console.warn('No se pudieron cargar las métricas de publicidades:', err);
                    return null;
                })
            ]);
            setPromotions(data || []);
            setPromoStats(stats || {});
            setStatsError(!stats);
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
            start_date: todayAR(),
            end_date: addDays(todayAR(), 30),
            description: '',
            target_type: 'general',
            target_id: '',
            target_name: '',
            discount_type: 'percentage',
            discount_value: '',
            code: '',
            cta_text: '',
            promo_kind: 'general',
            valid_days: [],
            time_from: '',
            time_to: '',
            min_advance_days: '',
            max_uses_per_customer: ''
        });
        setShowModal(true);
    };

    const handleOpenEdit = (promo, overrides = {}) => {
        setEditingPromo(promo);
        const parsed = parsePromotionTarget(promo);
        const isUrl = promo.description?.startsWith('http://') || promo.description?.startsWith('https://') || promo.description?.startsWith('/');
        setForm({
            title: promo.title || '',
            discount: promo.discount || '',
            image: promo.image || '',
            business_id: promo.business_id || '',
            action_url: parsed.action_url || (isUrl ? promo.description : ''),
            start_date: promo.start_date ? String(promo.start_date).slice(0, 10) : '',
            end_date: promo.end_date || (promo.expires_at ? promo.expires_at.split('T')[0] : ''),
            description: (typeof promo.description === 'string' && promo.description.trim().startsWith('{'))
                ? (typeof parsed.text === 'string' && !parsed.text.trim().startsWith('{') ? parsed.text : '')
                : (isUrl ? '' : (promo.description || '')),
            target_type: parsed.target_type || 'general',
            target_id: parsed.target_id || '',
            target_name: parsed.target_name || '',
            discount_type: parsed.discount_type || 'percentage',
            discount_value: parsed.discount_value || '',
            code: parsed.code || '',
            cta_text: parsed.cta_text || '',
            promo_kind: promo.promo_kind || 'general',
            valid_days: Array.isArray(promo.valid_days) ? promo.valid_days.map(Number) : [],
            time_from: promo.time_from && String(promo.time_from).slice(0, 5) !== '00:00' ? String(promo.time_from).slice(0, 5) : '',
            time_to: promo.time_to ? String(promo.time_to).slice(0, 5) : '',
            min_advance_days: promo.min_advance_days || '',
            max_uses_per_customer: promo.max_uses_per_customer || '',
            ...overrides
        });
        setShowModal(true);
    };

    // Renovar: abre la edición con un nuevo período de 30 días (sigue a continuación si todavía está vigente)
    const handleRenew = (promo) => {
        const today = todayAR();
        const end = promo.end_date ? String(promo.end_date).slice(0, 10) : null;
        const start = end && end >= today ? addDays(end, 1) : today;
        handleOpenEdit(promo, { start_date: start, end_date: addDays(start, 29), renewing: true });
    };

    const handleCopyReport = async (promo, bizName) => {
        const text = buildPromoReport(promo, bizName, promoStats[promo.id]);
        try {
            await navigator.clipboard.writeText(text);
            showToast('Reporte copiado: pegalo en el WhatsApp del negocio', 'success');
        } catch {
            window.prompt('Copiá el reporte:', text);
        }
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
        if (form.start_date && form.end_date && form.end_date < form.start_date) {
            showToast('La fecha "Hasta" no puede ser anterior a "Desde"', 'error');
            return;
        }

        setIsSaving(true);
        try {
            // Normalizar URL de acción: si el usuario escribe "www.youtube.com", anteponer "https://"
            let cleanActionUrl = form.action_url?.trim() || '';
            if (cleanActionUrl && !cleanActionUrl.startsWith('/') && !cleanActionUrl.startsWith('http://') && !cleanActionUrl.startsWith('https://')) {
                cleanActionUrl = `https://${cleanActionUrl}`;
            }
            // Un link a localhost o al propio TurnitosLR se guarda como ruta, para que funcione en producción
            try {
                if (/^https?:\/\//.test(cleanActionUrl)) {
                    const u = new URL(cleanActionUrl);
                    if (u.hostname === 'localhost' || u.hostname === '127.0.0.1' || u.hostname === 'turnitoslr.com' || u.hostname === 'www.turnitoslr.com') {
                        cleanActionUrl = `${u.pathname}${u.search}` || '/';
                    }
                }
            } catch {
                // URL inválida: se guarda como la escribió
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
                discount_value: form.promo_kind === 'visibility' ? 0 : Number(form.discount_value || 0),
                ...buildRulesPayload(form),
                start_date: form.start_date || todayAR(),
                end_date: form.end_date ? form.end_date : null,
                // Al editar se respeta si estaba pausada; las nuevas y las renovadas salen activas
                active: editingPromo && !form.renewing ? editingPromo.active !== false : true
            };

            if (editingPromo) {
                await supabaseService.updatePromotion(editingPromo.id, promoPayload);
                showToast(form.renewing ? 'Publicidad renovada' : 'Publicidad actualizada correctamente', 'success');
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

    const handleToggleActive = async (promo) => {
        const nextActive = promo.active === false;
        setTogglingId(promo.id);
        try {
            await supabaseService.updatePromotion(promo.id, { active: nextActive });
            setPromotions(prev => prev.map(p => (p.id === promo.id ? { ...p, active: nextActive } : p)));
            showToast(nextActive ? 'Publicidad activada' : 'Publicidad pausada: ya no se muestra en el Home', 'success');
        } catch (err) {
            console.error('Error cambiando estado de la publicidad:', err);
            showToast(`Error al cambiar el estado: ${err.message}`, 'error');
        } finally {
            setTogglingId(null);
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

    const today = todayAR();
    const statusCounts = promotions.reduce((acc, p) => {
        const st = getPromotionStatus(p, today);
        acc[st] = (acc[st] || 0) + 1;
        return acc;
    }, { all: promotions.length });
    const liveCount = statusCounts.live || 0;
    const visiblePromotions = statusFilter === 'all'
        ? promotions
        : promotions.filter(p => getPromotionStatus(p, today) === statusFilter);

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
                        🔥 Publicidades & Banners del Home ({liveCount} vigentes de {promotions.length})
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

            {statsError && !loading && promotions.length > 0 && (
                <div style={{ fontSize: '12px', color: 'var(--sa-text-muted)' }}>
                    ⚠️ No se pudieron cargar las métricas (vistas, clics, reservas). Probá recargar.
                </div>
            )}

            {/* Filtros por estado */}
            {!loading && promotions.length > 0 && (
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {FILTERS.map(f => {
                        const selected = statusFilter === f.id;
                        const count = statusCounts[f.id] || 0;
                        return (
                            <button
                                key={f.id}
                                type="button"
                                onClick={() => setStatusFilter(f.id)}
                                style={{
                                    background: selected ? 'var(--sa-primary)' : 'var(--sa-surface)',
                                    color: selected ? '#fff' : 'var(--sa-text-2)',
                                    border: `1px solid ${selected ? 'var(--sa-primary)' : 'var(--sa-border-strong)'}`,
                                    borderRadius: '999px',
                                    padding: '6px 12px',
                                    fontSize: '12px',
                                    fontWeight: '700',
                                    cursor: 'pointer'
                                }}
                            >
                                {f.label} ({count})
                            </button>
                        );
                    })}
                </div>
            )}

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
                    {visiblePromotions.length === 0 && (
                        <div style={{ gridColumn: '1 / -1', padding: '30px', textAlign: 'center', color: 'var(--sa-text-muted)', fontSize: '13px' }}>
                            No hay publicidades en este estado.
                        </div>
                    )}
                    {visiblePromotions.map((promo) => {
                        const status = getPromotionStatus(promo, today);
                        const statusMeta = STATUS_META[status];
                        const isOn = promo.active !== false;
                        const promoEnd = promo.end_date || promo.expires_at;
                        const daysLeft = promoEnd ? daysBetween(today, promoEnd) : null;
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
                                            objectFit: 'cover',
                                            filter: status === 'live' ? 'none' : 'grayscale(0.7)',
                                            opacity: status === 'live' ? 1 : 0.65
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
                                    <div style={{
                                        position: 'absolute',
                                        top: '12px',
                                        left: '12px',
                                        background: 'rgba(0, 0, 0, 0.65)',
                                        color: statusMeta.color,
                                        border: `1px solid ${statusMeta.color}`,
                                        fontSize: '11px',
                                        fontWeight: '800',
                                        padding: '4px 9px',
                                        borderRadius: '8px',
                                        backdropFilter: 'blur(4px)'
                                    }}>
                                        ● {statusMeta.label}
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
                                                        {getPromoKindMeta(promo.promo_kind).icon} {getPromoKindMeta(promo.promo_kind).label.toUpperCase()}
                                                    </span>
                                                    {getPromoConditionChips(promo).filter(c => !c.startsWith('⏳')).map(chip => (
                                                        <span key={chip} style={{
                                                            fontSize: '10.5px',
                                                            fontWeight: '700',
                                                            padding: '3px 8px',
                                                            borderRadius: '6px',
                                                            background: 'var(--sa-hover)',
                                                            color: 'var(--sa-text-2)'
                                                        }}>
                                                            {chip}
                                                        </span>
                                                    ))}
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

                                        {!(promo.end_date || promo.expires_at) && (
                                            <p style={{ margin: '0 0 10px 0', fontSize: '11.5px', color: 'var(--sa-text-muted)' }}>
                                                ♾️ Sin vencimiento
                                            </p>
                                        )}
                                        {(promo.end_date || promo.expires_at) && (
                                            <p style={{ margin: '0 0 10px 0', fontSize: '11.5px', color: 'var(--sa-text-muted)' }}>
                                                ⏳ {status === 'expired' ? 'Venció' : 'Vence'}: {formatDay(promo.end_date || promo.expires_at)}
                                                {status === 'live' && daysLeft !== null && (
                                                    <strong style={{ marginLeft: '6px', color: daysLeft <= 3 ? '#f59e0b' : 'var(--sa-text-2)' }}>
                                                        {daysLeft === 0 ? '· último día' : `· quedan ${daysLeft} día${daysLeft === 1 ? '' : 's'}`}
                                                    </strong>
                                                )}
                                            </p>
                                        )}
                                        {status === 'scheduled' && promo.start_date && (
                                            <p style={{ margin: '0 0 10px 0', fontSize: '11.5px', color: 'var(--sa-text-muted)' }}>
                                                🗓️ Empieza: {formatDay(promo.start_date)}
                                            </p>
                                        )}

                                        <PromoStats stats={promoStats[promo.id]} />

                                        {/* Pausar / activar */}
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            gap: '10px',
                                            marginTop: '12px',
                                            fontSize: '12.5px',
                                            fontWeight: '700',
                                            color: 'var(--sa-text-2)'
                                        }}>
                                            <span>{isOn ? 'Activa (se muestra si está vigente)' : 'Pausada (no se muestra en el Home)'}</span>
                                            <button
                                                type="button"
                                                role="switch"
                                                aria-checked={isOn}
                                                aria-label={isOn ? 'Pausar publicidad' : 'Activar publicidad'}
                                                disabled={togglingId === promo.id}
                                                onClick={() => handleToggleActive(promo)}
                                                style={{
                                                    position: 'relative',
                                                    width: '42px',
                                                    height: '24px',
                                                    flexShrink: 0,
                                                    borderRadius: '999px',
                                                    border: 'none',
                                                    padding: 0,
                                                    background: isOn ? '#10b981' : 'var(--sa-border-strong)',
                                                    cursor: togglingId === promo.id ? 'wait' : 'pointer',
                                                    transition: 'background 0.2s',
                                                    opacity: togglingId === promo.id ? 0.6 : 1
                                                }}
                                            >
                                                <span style={{
                                                    position: 'absolute',
                                                    top: '3px',
                                                    left: isOn ? '21px' : '3px',
                                                    width: '18px',
                                                    height: '18px',
                                                    borderRadius: '50%',
                                                    background: '#fff',
                                                    boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                                                    transition: 'left 0.2s'
                                                }} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Venta: renovar y reporte para el negocio */}
                                    <div style={{ display: 'flex', gap: '8px', marginTop: '14px', flexWrap: 'wrap' }}>
                                        <button
                                            type="button"
                                            onClick={() => handleRenew(promo)}
                                            style={{
                                                flex: 1,
                                                minWidth: '120px',
                                                background: status === 'expired' || (daysLeft !== null && daysLeft <= 3) ? 'rgba(16, 185, 129, 0.15)' : 'var(--sa-surface-2)',
                                                border: `1px solid ${status === 'expired' || (daysLeft !== null && daysLeft <= 3) ? 'rgba(16, 185, 129, 0.45)' : 'var(--sa-border-strong)'}`,
                                                borderRadius: '8px',
                                                padding: '8px',
                                                color: status === 'expired' || (daysLeft !== null && daysLeft <= 3) ? '#10b981' : 'var(--sa-text)',
                                                fontSize: '12px',
                                                fontWeight: '700',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            🔁 Renovar 30 días
                                        </button>
                                        {linkedBiz && (
                                            <button
                                                type="button"
                                                onClick={() => handleCopyReport(promo, linkedBiz.name)}
                                                style={{
                                                    flex: 1,
                                                    minWidth: '120px',
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
                                                📋 Copiar reporte
                                            </button>
                                        )}
                                    </div>

                                    {/* Action Buttons */}
                                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px', borderTop: '1px solid var(--sa-border)', paddingTop: '12px' }}>
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

                            <div style={{ marginTop: '6px', fontSize: '11.5px', color: 'var(--sa-text-muted)', lineHeight: 1.45 }}>
                                📐 {form.business_id
                                    ? <>Medida recomendada: <strong>1200 × 800 px</strong> (3:2), sin texto y con lo importante al centro.</>
                                    : <>Medida recomendada: <strong>1500 × 500 px</strong> (3:1). En celular se muestra completa con bordes difuminados, así que el texto tiene que leerse bien en chico.</>}
                            </div>

                            {form.image && (
                                <div style={{ marginTop: '10px', display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px', alignItems: 'start' }}>
                                    {[
                                        // Same proportions the Home banner uses (see index.css .promotions-hero-card)
                                        { label: 'Compu', ratio: form.business_id ? '9 / 5' : '3 / 1' },
                                        { label: 'Celular', ratio: '3 / 2' }
                                    ].map(preview => (
                                        <div key={preview.label}>
                                            <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--sa-text-2)', marginBottom: '4px' }}>
                                                {preview.label}
                                            </div>
                                            <div style={{ position: 'relative', aspectRatio: preview.ratio, borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--sa-border-strong)', background: 'var(--sa-bg)' }}>
                                                {!form.business_id && (
                                                    <img
                                                        src={form.image}
                                                        alt=""
                                                        aria-hidden="true"
                                                        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(12px)', transform: 'scale(1.15)', opacity: 0.85 }}
                                                    />
                                                )}
                                                <img
                                                    src={form.image}
                                                    alt={`Vista previa en ${preview.label.toLowerCase()}`}
                                                    style={{ position: 'relative', width: '100%', height: '100%', objectFit: form.business_id ? 'cover' : 'contain', display: 'block' }}
                                                    onError={(e) => { e.target.style.display = 'none'; }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div>
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--sa-text-2)', marginBottom: '6px' }}>
                                    Etiqueta / Badge
                                </label>
                                <input
                                    type="text"
                                    placeholder="Ej: 2x1 / PROMO VERANO"
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

                        </div>

                        {/* Tipo de promo y sus reglas */}
                        {(() => {
                            const kind = form.promo_kind || 'general';
                            const previewPromo = {
                                ...buildRulesPayload(form),
                                discount_value: Number(form.discount_value || 0),
                                end_date: form.end_date || null,
                                description: JSON.stringify({ target_type: form.target_type, target_name: form.target_name })
                            };
                            const chips = getPromoConditionChips(previewPromo);
                            const ruleChips = chips.filter(c => c.startsWith('📅') || c.startsWith('🕐')).map(c => c.slice(2).trim()).join(', ').toLowerCase();
                            const discountText = kind === 'visibility'
                                ? 'Publicidad'
                                : (form.discount_type === 'fixed'
                                    ? `$${Number(form.discount_value || 0).toLocaleString('es-AR')} OFF`
                                    : `${form.discount_value || 0}% OFF`);
                            const toggleDay = (d) => {
                                const current = Array.isArray(form.valid_days) ? form.valid_days : [];
                                setForm({ ...form, valid_days: current.includes(d) ? current.filter(x => x !== d) : [...current, d] });
                            };
                            return (
                                <div style={{
                                    background: 'var(--sa-hover)',
                                    border: '1px solid var(--sa-border)',
                                    borderRadius: '12px',
                                    padding: '12px 14px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '12px'
                                }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--sa-text-2)', marginBottom: '6px' }}>Tipo de promo</label>
                                        <select
                                            value={kind}
                                            onChange={(e) => {
                                                const next = e.target.value;
                                                const presetDays = next === 'schedule' ? [1, 2, 3, 4, 5] : (next === 'weekday' ? [2] : []);
                                                setForm({
                                                    ...form,
                                                    promo_kind: next,
                                                    valid_days: (next === 'schedule' || next === 'weekday') && (!form.valid_days || form.valid_days.length === 0) ? presetDays : form.valid_days,
                                                    time_to: next === 'schedule' && !form.time_to ? '18:00' : form.time_to,
                                                    min_advance_days: next === 'advance' && !form.min_advance_days ? 30 : form.min_advance_days
                                                });
                                            }}
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
                                        >
                                            {PROMO_KINDS.map(k => (
                                                <option key={k.id} value={k.id}>{k.icon} {k.label}</option>
                                            ))}
                                        </select>
                                        <span style={{ display: 'block', fontSize: '11.5px', color: 'var(--sa-text-muted)', marginTop: '5px' }}>
                                            {getPromoKindMeta(kind).help}
                                        </span>
                                    </div>

                                    {(kind === 'schedule' || kind === 'weekday') && (
                                        <div>
                                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--sa-text-2)', marginBottom: '6px' }}>Días</label>
                                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                                {WEEK_ORDER.map(d => {
                                                    const on = (form.valid_days || []).includes(d);
                                                    return (
                                                        <button
                                                            key={d}
                                                            type="button"
                                                            onClick={() => toggleDay(d)}
                                                            aria-pressed={on}
                                                            style={{
                                                                width: '44px',
                                                                height: '34px',
                                                                borderRadius: '8px',
                                                                border: `1px solid ${on ? 'var(--sa-primary)' : 'var(--sa-border-strong)'}`,
                                                                background: on ? 'var(--sa-primary)' : 'var(--sa-bg)',
                                                                color: on ? '#fff' : 'var(--sa-text-2)',
                                                                fontSize: '12px',
                                                                fontWeight: '700',
                                                                cursor: 'pointer'
                                                            }}
                                                        >
                                                            {DAY_SHORT[d]}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {kind === 'schedule' && (
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--sa-text-2)', marginBottom: '6px' }}>Desde (inicio del turno)</label>
                                                <input type="time" value={form.time_from} onChange={(e) => setForm({ ...form, time_from: e.target.value })} style={{
                                            width: '100%',
                                            padding: '9px 12px',
                                            background: 'var(--sa-bg)',
                                            border: '1px solid var(--sa-border-strong)',
                                            borderRadius: '8px',
                                            color: 'var(--sa-text)',
                                            fontSize: '13px',
                                            boxSizing: 'border-box'
                                        }} />
                                            </div>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--sa-text-2)', marginBottom: '6px' }}>Hasta (no incluido)</label>
                                                <input type="time" value={form.time_to} onChange={(e) => setForm({ ...form, time_to: e.target.value })} style={{
                                            width: '100%',
                                            padding: '9px 12px',
                                            background: 'var(--sa-bg)',
                                            border: '1px solid var(--sa-border-strong)',
                                            borderRadius: '8px',
                                            color: 'var(--sa-text)',
                                            fontSize: '13px',
                                            boxSizing: 'border-box'
                                        }} />
                                            </div>
                                        </div>
                                    )}

                                    {kind === 'advance' && (
                                        <div>
                                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--sa-text-2)', marginBottom: '6px' }}>Días de anticipación mínimos</label>
                                            <input type="number" min="1" value={form.min_advance_days} onChange={(e) => setForm({ ...form, min_advance_days: e.target.value })} style={{
                                            width: '100%',
                                            padding: '9px 12px',
                                            background: 'var(--sa-bg)',
                                            border: '1px solid var(--sa-border-strong)',
                                            borderRadius: '8px',
                                            color: 'var(--sa-text)',
                                            fontSize: '13px',
                                            boxSizing: 'border-box'
                                        }} />
                                        </div>
                                    )}

                                    {kind !== 'visibility' && (
                                        <div>
                                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--sa-text-2)', marginBottom: '6px' }}>Usos por cliente</label>
                                            <select
                                                value={form.max_uses_per_customer || ''}
                                                onChange={(e) => setForm({ ...form, max_uses_per_customer: e.target.value })}
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
                                            >
                                                <option value="">Sin tope</option>
                                                <option value="1">Una vez</option>
                                                <option value="2">Dos veces</option>
                                            </select>
                                        </div>
                                    )}

                                    {/* Vista previa de las condiciones */}
                                    <div style={{
                                        background: 'var(--sa-surface)',
                                        border: '1px solid var(--sa-border)',
                                        borderRadius: '10px',
                                        padding: '12px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '8px'
                                    }}>
                                        <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--sa-text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                                            Así lo va a ver el cliente
                                        </span>
                                        <div style={{ fontSize: '26px', fontWeight: '800', color: 'var(--sa-text)', lineHeight: 1 }}>{discountText}</div>
                                        {chips.length > 0 && (
                                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                                {chips.map(chip => (
                                                    <span key={chip} style={{ fontSize: '11.5px', fontWeight: '700', borderRadius: '999px', padding: '3px 9px', background: 'var(--sa-hover)', color: 'var(--sa-text)' }}>
                                                        {chip}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                        <span style={{ fontSize: '12px', color: 'var(--sa-text-2)', lineHeight: 1.45 }}>
                                            {describeRule(form, ruleChips)}
                                        </span>
                                    </div>
                                </div>
                            );
                        })()}

                        {/* Período contratado (lo que se le vende al negocio) */}
                        <div style={{
                            background: 'var(--sa-hover)',
                            border: '1px solid var(--sa-border)',
                            borderRadius: '12px',
                            padding: '12px 14px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '10px'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--sa-text)' }}>
                                    🗓️ Período contratado {form.renewing && <span style={{ color: '#10b981' }}>· renovación</span>}
                                </span>
                                <span style={{ fontSize: '11.5px', color: 'var(--sa-text-muted)' }}>
                                    {form.start_date && form.end_date && form.end_date >= form.start_date
                                        ? `${daysBetween(form.start_date, form.end_date) + 1} días · del ${formatDay(form.start_date)} al ${formatDay(form.end_date)}`
                                        : (!form.end_date ? 'Sin vencimiento' : '')}
                                </span>
                            </div>
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                {PERIOD_PRESETS.map(days => {
                                    const start = form.start_date || todayAR();
                                    const selected = form.end_date === addDays(start, days - 1);
                                    return (
                                        <button
                                            key={days}
                                            type="button"
                                            onClick={() => setForm({ ...form, start_date: start, end_date: addDays(start, days - 1) })}
                                            style={{
                                                background: selected ? 'var(--sa-primary)' : 'var(--sa-bg)',
                                                color: selected ? '#fff' : 'var(--sa-text-2)',
                                                border: `1px solid ${selected ? 'var(--sa-primary)' : 'var(--sa-border-strong)'}`,
                                                borderRadius: '999px',
                                                padding: '5px 12px',
                                                fontSize: '12px',
                                                fontWeight: '700',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            {days} días
                                        </button>
                                    );
                                })}
                                <button
                                    type="button"
                                    onClick={() => setForm({ ...form, end_date: '' })}
                                    style={{
                                        background: !form.end_date ? 'var(--sa-primary)' : 'var(--sa-bg)',
                                        color: !form.end_date ? '#fff' : 'var(--sa-text-2)',
                                        border: `1px solid ${!form.end_date ? 'var(--sa-primary)' : 'var(--sa-border-strong)'}`,
                                        borderRadius: '999px',
                                        padding: '5px 12px',
                                        fontSize: '12px',
                                        fontWeight: '700',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Sin vencimiento
                                </button>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--sa-text-2)', marginBottom: '6px' }}>
                                        Desde
                                    </label>
                                    <input
                                        type="date"
                                        value={form.start_date}
                                        onChange={(e) => setForm({ ...form, start_date: e.target.value })}
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
                                        Hasta (inclusive)
                                    </label>
                                    <input
                                        type="date"
                                        value={form.end_date}
                                        min={form.start_date || undefined}
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
                            <span style={{ fontSize: '11px', color: 'var(--sa-text-muted)' }}>
                                Se muestra en el Home solo dentro de este período. Al vencer queda guardada como "Vencida" con sus números, lista para renovar.
                            </span>
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
                                        📐 <strong>Tamaño ideal recomendado para el diseño:</strong> <strong>1500 × 500 px</strong> (proporción 3:1) para que ocupe todo el ancho en compu sin recortar nada.
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

                        {/* Campaña general: texto y botón (se muestran en la tarjeta del Home) */}
                        {!form.business_id && (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--sa-text-2)', marginBottom: '6px' }}>
                                        Texto del botón
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Ej: Sumate hoy"
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
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--sa-text-2)', marginBottom: '6px' }}>
                                        Texto corto (opcional)
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Ej: Recibí reservas online"
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
                                            boxSizing: 'border-box'
                                        }}
                                    />
                                </div>
                                <span style={{ gridColumn: '1 / -1', fontSize: '11px', color: 'var(--sa-text-muted)' }}>
                                    Con texto, se ve como tarjeta igual que las promos de negocio ("Sumate hoy →"). Sin texto, se muestra la imagen como banner completo.
                                </span>
                            </div>
                        )}

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
