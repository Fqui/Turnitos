import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import supabaseService from '../../services/supabaseService';
import { useNotification } from '../../contexts/NotificationContext';

const BusinessFormModal = ({ business, categories = [], subcategories = [], sellers = [], onClose, onSave }) => {
    const { showToast } = useNotification();
    const formatSlug = (text) => {
        return (text || '')
            .toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove accents
            .replace(/[^a-z0-9\s-]/g, '') // keep only alphanumeric, spaces, hyphens
            .trim()
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-');
    };

    const extractSubcategoryIds = (b) => {
        if (!b) return [];
        if (Array.isArray(b.subcategories) && b.subcategories.length > 0) {
            return b.subcategories.map(s => (typeof s === 'object' ? s.id : s)).filter(Boolean);
        }
        if (Array.isArray(b.business_subcategories) && b.business_subcategories.length > 0) {
            return b.business_subcategories.map(bs => bs.subcategory_id || bs.subcategories?.id).filter(Boolean);
        }
        if (b.subcategory_id) {
            return [b.subcategory_id];
        }
        return [];
    };

    const resolveBusinessType = (catName = '', fallbackType = null) => {
        const lower = (catName || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        if (lower.includes('deport') || lower.includes('cancha') || lower.includes('padel') || lower.includes('futbol') || lower.includes('tenis') || lower.includes('gym')) {
            return 'sport';
        }
        if (lower.includes('alquiler') || lower.includes('quincho') || lower.includes('salon') || lower.includes('finca') || lower.includes('espacio') || lower.includes('inmueble')) {
            return 'alquiler';
        }
        if (lower.includes('belleza') || lower.includes('peluqueria') || lower.includes('estetica') || lower.includes('barber') || lower.includes('spa') || lower.includes('salud') || lower.includes('mascota')) {
            return 'service';
        }
        if (fallbackType && ['service', 'sport', 'alquiler', 'venue'].includes(fallbackType)) {
            return fallbackType === 'venue' ? 'alquiler' : fallbackType;
        }
        return 'sport';
    };

    const extractResourceCount = (b) => {
        if (!b) return 1;
        if (Array.isArray(b.courts) && b.courts.length > 0) return b.courts.length;
        if (Array.isArray(b.specialists) && b.specialists.length > 0) return b.specialists.length;
        if (b.resources_count !== undefined && b.resources_count !== null && Number(b.resources_count) > 0) return Number(b.resources_count);
        if (b.capacity_limit !== undefined && b.capacity_limit !== null && Number(b.capacity_limit) > 0) return Number(b.capacity_limit);
        if (b.capacity !== undefined && b.capacity !== null && Number(b.capacity) > 0) return Number(b.capacity);
        if (b.subscriptions?.spaces_included && Number(b.subscriptions.spaces_included) > 0) return Number(b.subscriptions.spaces_included);
        if (Array.isArray(b.subscriptions) && b.subscriptions[0]?.spaces_included) return Number(b.subscriptions[0].spaces_included);
        return 1;
    };

    const initialCat = (categories || []).find(c => String(c.id) === String(business?.category_id || business?.categories?.id));
    const initialType = business?.type || (initialCat ? resolveBusinessType(initialCat.name) : 'sport');

    const [formData, setFormData] = useState({
        name: business?.name || '',
        slug: business?.slug || '',
        category_id: business?.category_id || business?.categories?.id || (categories[0]?.id) || '',
        subcategory_ids: extractSubcategoryIds(business),
        subcategory_id: business?.subcategory_id || (business?.subcategories?.[0]?.id) || '',
        location: business?.location || '',
        whatsapp: business?.whatsapp || '',
        instagram: business?.instagram || '',
        facebook: business?.facebook || '',
        tiktok: business?.tiktok || '',
        type: business ? (business.type || resolveBusinessType(initialCat?.name, 'sport')) : resolveBusinessType(initialCat?.name || categories[0]?.name, 'sport'),
        subscription_status: business?.subscription_status || 'trial',
        seller_id: business?.seller_id || '',
        subscription_plan_id: business?.subscription_plan_id || '',
        resources_count: extractResourceCount(business)
    });

    const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(Boolean(business?.slug));

    useEffect(() => {
        if (business) {
            const bCat = (categories || []).find(c => String(c.id) === String(business.category_id || business.categories?.id));
            setFormData({
                name: business.name || '',
                slug: business.slug || '',
                category_id: business.category_id || business.categories?.id || '',
                subcategory_ids: extractSubcategoryIds(business),
                subcategory_id: business.subcategory_id || (business.subcategories?.[0]?.id) || '',
                location: business.location || '',
                whatsapp: business.whatsapp || '',
                instagram: business.instagram || '',
                facebook: business.facebook || '',
                tiktok: business.tiktok || '',
                type: business.type || resolveBusinessType(bCat?.name, 'sport'),
                subscription_status: business.subscription_status || 'trial',
                seller_id: business.seller_id || '',
                subscription_plan_id: business.subscription_plan_id || '',
                resources_count: extractResourceCount(business)
            });
            setIsSlugManuallyEdited(Boolean(business.slug));
        }
    }, [business, categories]);

    const handleToggleSubcategory = (subId) => {
        setFormData(prev => {
            const current = prev.subcategory_ids || [];
            const exists = current.map(String).includes(String(subId));
            const updated = exists
                ? current.filter(id => String(id) !== String(subId))
                : [...current, subId];
            return {
                ...prev,
                subcategory_ids: updated,
                subcategory_id: updated[0] || ''
            };
        });
    };

    const handleNameChange = (newName) => {
        if (!isSlugManuallyEdited) {
            setFormData(prev => ({
                ...prev,
                name: newName,
                slug: formatSlug(newName)
            }));
        } else {
            setFormData(prev => ({ ...prev, name: newName }));
        }
    };

    const handleSlugChange = (newSlug) => {
        setIsSlugManuallyEdited(true);
        setFormData(prev => ({
            ...prev,
            slug: formatSlug(newSlug)
        }));
    };

    const [loading, setLoading] = useState(false);
    const [createdCredentials, setCreatedCredentials] = useState(null);
    const [showCredentials, setShowCredentials] = useState(false);

    const [localSubcategories, setLocalSubcategories] = useState(subcategories || []);
    useEffect(() => {
        if (subcategories && subcategories.length > 0) {
            setLocalSubcategories(subcategories);
        }
    }, [subcategories]);

    const [subSearch, setSubSearch] = useState('');
    const [creatingSub, setCreatingSub] = useState(false);

    // Dropdowns state
    const [categoryOpen, setCategoryOpen] = useState(false);
    const [subcategoryOpen, setSubcategoryOpen] = useState(false);
    const [sellerOpen, setSellerOpen] = useState(false);
    const categoryRef = useRef(null);
    const subcategoryRef = useRef(null);
    const sellerRef = useRef(null);

    // Close on click outside
    useEffect(() => {
        const handle = (e) => {
            if (categoryRef.current && !categoryRef.current.contains(e.target)) setCategoryOpen(false);
            if (subcategoryRef.current && !subcategoryRef.current.contains(e.target)) setSubcategoryOpen(false);
            if (sellerRef.current && !sellerRef.current.contains(e.target)) setSellerOpen(false);
        };
        document.addEventListener('mousedown', handle);
        return () => document.removeEventListener('mousedown', handle);
    }, []);

    // Close on Escape
    useEffect(() => {
        const handle = (e) => {
            if (e.key === 'Escape') {
                if (categoryOpen || subcategoryOpen || sellerOpen) {
                    setCategoryOpen(false);
                    setSubcategoryOpen(false);
                    setSellerOpen(false);
                } else {
                    onClose();
                }
            }
        };
        document.addEventListener('keydown', handle);
        return () => document.removeEventListener('keydown', handle);
    }, [categoryOpen, subcategoryOpen, sellerOpen, onClose]);

    // Find current category object
    const currentCategory = (categories || []).find(
        c => String(c.id) === String(formData.category_id) || c.name === formData.category_id
    );
    const resolvedCategoryId = currentCategory ? currentCategory.id : formData.category_id;

    // All available subcategories
    const allAvailableSubcategories = Array.from(
        new Map(
            [
                ...(localSubcategories || []),
                ...(currentCategory?.subcategories || [])
            ].map(s => [s.id, s])
        ).values()
    );

    const categorySpecificSubcategories = allAvailableSubcategories.filter(sub =>
        resolvedCategoryId && (String(sub.category_id) === String(resolvedCategoryId) || String(sub.category_id) === String(formData.category_id))
    );

    const otherSubcategories = allAvailableSubcategories.filter(sub =>
        !categorySpecificSubcategories.some(cs => String(cs.id) === String(sub.id))
    );

    const searchLower = subSearch.toLowerCase().trim();
    const searchFilteredCategorySubs = categorySpecificSubcategories.filter(s =>
        !searchLower || s.name.toLowerCase().includes(searchLower)
    );
    const searchFilteredOtherSubs = otherSubcategories.filter(s =>
        !searchLower || s.name.toLowerCase().includes(searchLower)
    );

    const hasExactMatch = allAvailableSubcategories.some(
        s => s.name.toLowerCase() === searchLower
    );

    const handleQuickCreateSubcategory = async (nameToCreate) => {
        const trimmed = (nameToCreate || subSearch).trim();
        if (!trimmed) return;
        setCreatingSub(true);
        try {
            const newSubData = {
                category_id: formData.category_id || (categories[0]?.id) || null,
                name: trimmed,
                slug: formatSlug(trimmed),
                icon: '✨',
                display_order: localSubcategories.length
            };
            const created = await supabaseService.createSubcategory(newSubData);
            if (created) {
                setLocalSubcategories(prev => [...prev, created]);
                handleToggleSubcategory(created.id);
                setSubSearch('');
            }
        } catch (err) {
            console.warn('Could not persist subcategory to DB, using local entry:', err);
            const fakeId = 'sub_' + Math.random().toString(36).substring(2, 9);
            const fallbackSub = {
                id: fakeId,
                category_id: formData.category_id,
                name: trimmed,
                slug: formatSlug(trimmed)
            };
            setLocalSubcategories(prev => [...prev, fallbackSub]);
            handleToggleSubcategory(fakeId);
            setSubSearch('');
        } finally {
            setCreatingSub(false);
        }
    };

    const effectiveType = currentCategory
        ? resolveBusinessType(currentCategory.name, formData.type)
        : (formData.type || 'sport');

    const isSport = effectiveType === 'sport';
    const isService = effectiveType === 'service';
    const isRental = effectiveType === 'venue' || effectiveType === 'alquiler';

    const count = formData.resources_count || 1;
    let planLabel = '';
    let priceLabel = '';

    if (isService) {
        if (count === 1) {
            planLabel = 'Plan Individual (1 Agenda)';
            priceLabel = '$18.000/mes';
        } else if (count <= 3) {
            planLabel = 'Plan Equipos (Hasta 3 Agendas)';
            priceLabel = '$36.000/mes';
        } else {
            const extra = count - 3;
            planLabel = `Plan Equipos (${count} Agendas)`;
            priceLabel = `$${(36000 + extra * 10000).toLocaleString('es-AR')}/mes`;
        }
    } else if (isSport) {
        if (count <= 3) {
            planLabel = `Plan Canchas (${count} Canchas)`;
            priceLabel = `$${(count * 20000).toLocaleString('es-AR')}/mes ($20k/cancha)`;
        } else if (count <= 5) {
            planLabel = `Plan Canchas (${count} Canchas)`;
            priceLabel = `$${(count * 17000).toLocaleString('es-AR')}/mes ($17k/cancha)`;
        } else {
            planLabel = `Plan Canchas (${count} Canchas)`;
            priceLabel = `$${(count * 15000).toLocaleString('es-AR')}/mes ($15k/cancha)`;
        }
    } else {
        planLabel = 'Plan Alquileres / Quinchos';
        priceLabel = '$15.000/mes';
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const cat = categories.find(c => String(c.id) === String(formData.category_id) || c.name === formData.category_id);
            const derivedType = cat ? resolveBusinessType(cat.name, formData.type) : (formData.type || 'sport');

            let slug = formatSlug(formData.slug || formData.name);
            if (!slug && formData.name) {
                slug = formatSlug(formData.name);
                slug = `${slug}-${Math.random().toString(36).substring(2, 6)}`;
            }

            let ownerEmail = formData.email || '';
            let ownerPassword = formData.password || '';
            if (!business) {
                if (!ownerEmail) {
                    const slugBase = (formData.name || 'business')
                        .toLowerCase()
                        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                        .replace(/[^a-z0-9]/g, '')
                        .substring(0, 20);
                    ownerEmail = `${slugBase || 'business'}-${Math.random().toString(36).substring(2, 6)}@turnitoslr.com`;
                }
                if (!ownerPassword) {
                    const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
                    const lower = 'abcdefghijkmnpqrstuvwxyz';
                    const nums = '23456789';
                    const all = upper + lower + nums;
                    let pwd = '';
                    pwd += upper[Math.floor(Math.random() * upper.length)];
                    pwd += nums[Math.floor(Math.random() * nums.length)];
                    pwd += lower[Math.floor(Math.random() * lower.length)];
                    for (let i = 0; i < 5; i++) pwd += all[Math.floor(Math.random() * all.length)];
                    ownerPassword = pwd.split('').sort(() => Math.random() - 0.5).join('');
                }
            }

            const dataToSave = {
                ...formData,
                slug,
                email: ownerEmail,
                password: ownerPassword,
                type: derivedType,
                subscription_status: formData.subscription_status || 'trial',
                seller_id: formData.seller_id || null,
                subcategories: (formData.subcategory_ids && formData.subcategory_ids.length > 0)
                    ? formData.subcategory_ids
                    : (formData.subcategory_id ? [formData.subcategory_id] : []),
                subcategory_id: (formData.subcategory_ids && formData.subcategory_ids[0]) || formData.subcategory_id || null
            };

            if (business) {
                await supabaseService.updateBusinessAsSuperAdmin(business.id, dataToSave);
                showToast(`✓ Negocio "${dataToSave.name}" actualizado correctamente`, 'success');
                onSave();
                onClose();
            } else {
                const result = await supabaseService.createBusinessAsSuperAdmin(dataToSave);
                showToast(`🎉 ¡Negocio "${dataToSave.name}" creado con éxito!`, 'success');
                onSave();
                setCreatedCredentials({
                    name: dataToSave.name,
                    email: dataToSave.email,
                    password: dataToSave.password,
                    businessId: result?.id,
                    slug: result?.slug || dataToSave.slug,
                });
                setShowCredentials(true);
            }
        } catch (err) {
            console.error('Error in handleSave:', err);
            showToast(`⚠️ Error al guardar negocio: ${err.message}`, 'error', 6000);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(5, 7, 15, 0.82)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                padding: '20px'
            }}
            onClick={onClose}
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.94, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.94, y: 15 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                style={{
                    background: 'linear-gradient(170deg, #131722 0%, #0d1017 100%)',
                    borderRadius: '24px',
                    maxWidth: '740px',
                    width: '100%',
                    maxHeight: '90vh',
                    display: 'flex',
                    flexDirection: 'column',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    boxShadow: '0 25px 70px rgba(0, 0, 0, 0.7), 0 0 1px 1px rgba(255, 255, 255, 0.05) inset',
                    position: 'relative',
                    overflow: 'hidden'
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div style={{
                    padding: '24px 28px 20px',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'rgba(255, 255, 255, 0.02)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div style={{
                            width: '46px',
                            height: '46px',
                            borderRadius: '14px',
                            background: isSport
                                ? 'linear-gradient(135deg, rgba(0, 230, 118, 0.2), rgba(0, 230, 118, 0.05))'
                                : isService
                                ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(99, 102, 241, 0.05))'
                                : 'linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(245, 158, 11, 0.05))',
                            border: `1px solid ${isSport ? 'rgba(0, 230, 118, 0.35)' : isService ? 'rgba(99, 102, 241, 0.35)' : 'rgba(245, 158, 11, 0.35)'}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '22px'
                        }}>
                            {isSport ? '🏟️' : isService ? '👥' : '🏡'}
                        </div>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <h2 style={{ fontSize: '20px', fontWeight: '800', margin: 0, color: '#FFFFFF', letterSpacing: '-0.02em' }}>
                                    {business ? 'Editar Negocio' : 'Nuevo Negocio'}
                                </h2>
                                <span style={{
                                    fontSize: '11px',
                                    fontWeight: '700',
                                    padding: '2px 8px',
                                    borderRadius: '6px',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.04em',
                                    background: isSport ? 'rgba(0, 230, 118, 0.15)' : isService ? 'rgba(99, 102, 241, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                                    color: isSport ? '#00E676' : isService ? '#818CF8' : '#FBBF24',
                                    border: `1px solid ${isSport ? 'rgba(0, 230, 118, 0.3)' : isService ? 'rgba(99, 102, 241, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`
                                }}>
                                    {isSport ? 'Deportes' : isService ? 'Servicios' : 'Alquiler'}
                                </span>
                            </div>
                            <p style={{ margin: '3px 0 0', fontSize: '13px', color: 'rgba(255, 255, 255, 0.5)' }}>
                                {business ? 'Actualizá los datos de configuración y suscripción' : 'Completá la información del club o local comercial'}
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '10px',
                            background: 'rgba(255, 255, 255, 0.06)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            color: 'rgba(255, 255, 255, 0.7)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '18px',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                            e.currentTarget.style.color = '#fff';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                            e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)';
                        }}
                    >
                        ✕
                    </button>
                </div>

                {/* Form Body Scrollable */}
                <form
                    onSubmit={handleSubmit}
                    style={{
                        padding: '24px 28px',
                        overflowY: 'auto',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '22px',
                        scrollbarWidth: 'thin',
                        scrollbarColor: 'rgba(255, 255, 255, 0.2) transparent'
                    }}
                >
                    {/* SECTION 1: IDENTIDAD */}
                    <div style={{
                        background: 'rgba(255, 255, 255, 0.025)',
                        border: '1px solid rgba(255, 255, 255, 0.07)',
                        borderRadius: '16px',
                        padding: '18px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '16px'
                    }}>
                        <div style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(255, 255, 255, 0.45)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span>🏢</span> Identidad y Enlace Web
                        </div>

                        {/* Name */}
                        <div>
                            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: 'rgba(255, 255, 255, 0.9)' }}>
                                Nombre del Negocio <span style={{ color: '#00E676' }}>*</span>
                            </label>
                            <input
                                type="text"
                                required
                                value={formData.name}
                                onChange={(e) => handleNameChange(e.target.value)}
                                placeholder="Nombre del negocio"
                                style={{
                                    width: '100%',
                                    padding: '12px 14px',
                                    background: 'rgba(0, 0, 0, 0.35)',
                                    border: '1px solid rgba(255, 255, 255, 0.12)',
                                    borderRadius: '10px',
                                    color: 'white',
                                    fontSize: '14px',
                                    outline: 'none',
                                    transition: 'border-color 0.2s, box-shadow 0.2s'
                                }}
                                onFocus={(e) => {
                                    e.target.style.borderColor = '#00E676';
                                    e.target.style.boxShadow = '0 0 0 3px rgba(0, 230, 118, 0.15)';
                                }}
                                onBlur={(e) => {
                                    e.target.style.borderColor = 'rgba(255, 255, 255, 0.12)';
                                    e.target.style.boxShadow = 'none';
                                }}
                            />
                        </div>

                        {/* Slug */}
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                <label style={{ fontSize: '13px', fontWeight: '600', color: 'rgba(255, 255, 255, 0.9)' }}>
                                    URL Pública (Slug) <span style={{ color: '#00E676' }}>*</span>
                                </label>
                                {isSlugManuallyEdited && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsSlugManuallyEdited(false);
                                            setFormData(prev => ({ ...prev, slug: formatSlug(prev.name) }));
                                        }}
                                        style={{
                                            background: 'transparent',
                                            border: 'none',
                                            color: '#00E676',
                                            fontSize: '11px',
                                            fontWeight: '600',
                                            cursor: 'pointer',
                                            textDecoration: 'underline'
                                        }}
                                    >
                                        Sincronizar con nombre
                                    </button>
                                )}
                            </div>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                background: 'rgba(0, 0, 0, 0.35)',
                                border: '1px solid rgba(255, 255, 255, 0.12)',
                                borderRadius: '10px',
                                overflow: 'hidden'
                            }}>
                                <span style={{
                                    padding: '12px 14px',
                                    color: 'rgba(255, 255, 255, 0.45)',
                                    fontSize: '13px',
                                    fontWeight: '500',
                                    userSelect: 'none',
                                    borderRight: '1px solid rgba(255, 255, 255, 0.08)',
                                    background: 'rgba(255, 255, 255, 0.02)',
                                    whiteSpace: 'nowrap'
                                }}>
                                    turnitoslr.com/
                                </span>
                                <input
                                    type="text"
                                    required
                                    value={formData.slug}
                                    onChange={(e) => handleSlugChange(e.target.value)}
                                    placeholder="slug-del-negocio"
                                    style={{
                                        flex: 1,
                                        padding: '12px 14px',
                                        background: 'transparent',
                                        border: 'none',
                                        color: '#00E676',
                                        fontSize: '14px',
                                        fontWeight: '600',
                                        outline: 'none'
                                    }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* SECTION 2: CATEGORÍA & SUBCATEGORÍAS */}
                    <div style={{
                        background: 'rgba(255, 255, 255, 0.025)',
                        border: '1px solid rgba(255, 255, 255, 0.07)',
                        borderRadius: '16px',
                        padding: '18px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '16px'
                    }}>
                        <div style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(255, 255, 255, 0.45)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span>🏷️</span> Categorización del Negocio
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                            {/* Category Dropdown */}
                            <div ref={categoryRef} style={{ position: 'relative' }}>
                                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: 'rgba(255, 255, 255, 0.9)' }}>
                                    Categoría Principal <span style={{ color: '#00E676' }}>*</span>
                                </label>
                                <button
                                    type="button"
                                    onClick={() => { setCategoryOpen(o => !o); setSubcategoryOpen(false); setSellerOpen(false); }}
                                    style={{
                                        width: '100%',
                                        padding: '12px 14px',
                                        background: 'rgba(0, 0, 0, 0.35)',
                                        border: categoryOpen ? '1px solid #00E676' : '1px solid rgba(255, 255, 255, 0.12)',
                                        borderRadius: '10px',
                                        color: 'white',
                                        fontSize: '14px',
                                        outline: 'none',
                                        textAlign: 'left',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        gap: '8px'
                                    }}
                                >
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {currentCategory ? (
                                            <>
                                                <span>{currentCategory.icon || '🏷️'}</span>
                                                <strong style={{ fontWeight: '600' }}>{currentCategory.name}</strong>
                                            </>
                                        ) : (
                                            <span style={{ color: 'rgba(255,255,255,0.4)' }}>Elegir categoría...</span>
                                        )}
                                    </span>
                                    <motion.svg
                                        animate={{ rotate: categoryOpen ? 180 : 0 }}
                                        transition={{ duration: 0.2 }}
                                        width="14" height="14" viewBox="0 0 16 16" fill="rgba(255,255,255,0.6)"
                                    >
                                        <path d="M8 11L3 6h10z" />
                                    </motion.svg>
                                </button>

                                <AnimatePresence>
                                    {categoryOpen && (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.96, y: -6 }}
                                            animate={{ opacity: 1, scale: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.96, y: -6 }}
                                            transition={{ duration: 0.15 }}
                                            style={{
                                                position: 'absolute',
                                                top: 'calc(100% + 6px)',
                                                left: 0,
                                                right: 0,
                                                zIndex: 1000,
                                                backgroundColor: '#161a24',
                                                border: '1px solid rgba(255, 255, 255, 0.18)',
                                                borderRadius: '12px',
                                                boxShadow: '0 15px 45px rgba(0,0,0,0.7)',
                                                maxHeight: '280px',
                                                overflowY: 'auto'
                                            }}
                                        >
                                            {categories.map(cat => {
                                                const isSel = String(formData.category_id) === String(cat.id);
                                                return (
                                                    <div
                                                        key={cat.id}
                                                        onClick={() => {
                                                            const nextType = resolveBusinessType(cat.name, formData.type);
                                                            setFormData(prev => ({
                                                                ...prev,
                                                                category_id: cat.id,
                                                                subcategory_ids: [],
                                                                subcategory_id: '',
                                                                type: nextType
                                                            }));
                                                            setCategoryOpen(false);
                                                        }}
                                                        style={{
                                                            padding: '11px 14px',
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '10px',
                                                            backgroundColor: isSel ? 'rgba(0, 230, 118, 0.12)' : 'transparent',
                                                            borderBottom: '1px solid rgba(255,255,255,0.05)'
                                                        }}
                                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = isSel ? 'rgba(0, 230, 118, 0.18)' : 'rgba(255,255,255,0.06)'}
                                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = isSel ? 'rgba(0, 230, 118, 0.12)' : 'transparent'}
                                                    >
                                                        <span style={{ fontSize: '18px' }}>{cat.icon || '🏷️'}</span>
                                                        <span style={{ flex: 1, color: isSel ? '#00E676' : 'white', fontSize: '13px', fontWeight: isSel ? '700' : '500' }}>
                                                            {cat.name}
                                                        </span>
                                                        {isSel && (
                                                            <svg width="14" height="14" viewBox="0 0 18 18" fill="#00E676">
                                                                <path d="M6.5 12.5L3 9l1.5-1.5 2 2L13.5 3l1.5 1.5z" />
                                                            </svg>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            {/* Subcategories Selector */}
                            <div ref={subcategoryRef} style={{ position: 'relative' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                    <label style={{ fontSize: '13px', fontWeight: '600', color: 'rgba(255, 255, 255, 0.9)' }}>
                                        Subcategorías
                                    </label>
                                    {(formData.subcategory_ids?.length > 0) && (
                                        <span style={{ fontSize: '11px', color: '#00E676', fontWeight: '700' }}>
                                            {formData.subcategory_ids.length} elegida{formData.subcategory_ids.length !== 1 ? 's' : ''}
                                        </span>
                                    )}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => { setSubcategoryOpen(o => !o); setCategoryOpen(false); setSellerOpen(false); }}
                                    style={{
                                        width: '100%',
                                        padding: '12px 14px',
                                        background: 'rgba(0, 0, 0, 0.35)',
                                        border: subcategoryOpen ? '1px solid #00E676' : '1px solid rgba(255, 255, 255, 0.12)',
                                        borderRadius: '10px',
                                        color: 'white',
                                        fontSize: '13px',
                                        outline: 'none',
                                        textAlign: 'left',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        gap: '8px'
                                    }}
                                >
                                    <span style={{
                                        color: (formData.subcategory_ids?.length > 0) ? 'white' : 'rgba(255,255,255,0.45)',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap'
                                    }}>
                                        {(() => {
                                            const countSub = (formData.subcategory_ids || []).length;
                                            if (countSub === 0) return 'Elegir subcategorías...';
                                            const names = allAvailableSubcategories
                                                .filter(s => (formData.subcategory_ids || []).map(String).includes(String(s.id)))
                                                .map(s => s.name);
                                            if (countSub === 1) return names[0] || '1 seleccionada';
                                            return `${countSub} seleccionadas (${names.join(', ')})`;
                                        })()}
                                    </span>
                                    <motion.svg
                                        animate={{ rotate: subcategoryOpen ? 180 : 0 }}
                                        transition={{ duration: 0.2 }}
                                        width="14" height="14" viewBox="0 0 16 16" fill="rgba(255,255,255,0.6)"
                                    >
                                        <path d="M8 11L3 6h10z" />
                                    </motion.svg>
                                </button>

                                <AnimatePresence>
                                    {subcategoryOpen && (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.96, y: -6 }}
                                            animate={{ opacity: 1, scale: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.96, y: -6 }}
                                            transition={{ duration: 0.15 }}
                                            style={{
                                                position: 'absolute',
                                                top: 'calc(100% + 6px)',
                                                left: 0,
                                                right: 0,
                                                zIndex: 1000,
                                                backgroundColor: '#161a24',
                                                border: '1px solid rgba(255, 255, 255, 0.18)',
                                                borderRadius: '12px',
                                                boxShadow: '0 15px 45px rgba(0,0,0,0.7)',
                                                maxHeight: '300px',
                                                overflowY: 'auto'
                                            }}
                                        >
                                            {/* Search box */}
                                            <div style={{ padding: '8px 10px', borderBottom: '1px solid rgba(255,255,255,0.08)', position: 'sticky', top: 0, background: '#161a24', zIndex: 2 }}>
                                                <input
                                                    type="text"
                                                    value={subSearch}
                                                    onChange={(e) => setSubSearch(e.target.value)}
                                                    placeholder="🔍 Buscar o crear nueva..."
                                                    onClick={(e) => e.stopPropagation()}
                                                    style={{
                                                        width: '100%',
                                                        padding: '7px 10px',
                                                        background: 'rgba(255,255,255,0.08)',
                                                        border: '1px solid rgba(255,255,255,0.12)',
                                                        borderRadius: '8px',
                                                        color: 'white',
                                                        fontSize: '12px',
                                                        outline: 'none'
                                                    }}
                                                />
                                            </div>

                                            {/* Quick Create Button */}
                                            {subSearch.trim() && !hasExactMatch && (
                                                <div style={{ padding: '8px 10px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                                                    <button
                                                        type="button"
                                                        disabled={creatingSub}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleQuickCreateSubcategory(subSearch);
                                                        }}
                                                        style={{
                                                            width: '100%',
                                                            padding: '7px 10px',
                                                            background: 'rgba(0, 230, 118, 0.15)',
                                                            border: '1px dashed #00E676',
                                                            borderRadius: '8px',
                                                            color: '#00E676',
                                                            fontSize: '12px',
                                                            fontWeight: '700',
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        {creatingSub ? '⏳ Creando...' : `➕ Crear "${subSearch.trim()}"`}
                                                    </button>
                                                </div>
                                            )}

                                            {/* List of subcategories */}
                                            {searchFilteredCategorySubs.map(sub => {
                                                const isSelected = (formData.subcategory_ids || []).map(String).includes(String(sub.id));
                                                return (
                                                    <div
                                                        key={sub.id}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleToggleSubcategory(sub.id);
                                                        }}
                                                        style={{
                                                            padding: '9px 14px',
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '10px',
                                                            backgroundColor: isSelected ? 'rgba(0, 230, 118, 0.12)' : 'transparent',
                                                            borderBottom: '1px solid rgba(255,255,255,0.04)'
                                                        }}
                                                    >
                                                        <div style={{
                                                            width: '16px',
                                                            height: '16px',
                                                            borderRadius: '4px',
                                                            border: isSelected ? '2px solid #00E676' : '2px solid rgba(255,255,255,0.3)',
                                                            backgroundColor: isSelected ? '#00E676' : 'transparent',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            flexShrink: 0
                                                        }}>
                                                            {isSelected && (
                                                                <svg width="10" height="10" viewBox="0 0 16 16" fill="#000">
                                                                    <path d="M13.5 3.5l-8 8-4-4 1.5-1.5 2.5 2.5 6.5-6.5z" />
                                                                </svg>
                                                            )}
                                                        </div>
                                                        <span style={{ color: isSelected ? '#fff' : 'rgba(255,255,255,0.85)', fontSize: '13px' }}>
                                                            {sub.name}
                                                        </span>
                                                    </div>
                                                );
                                            })}

                                            <div style={{ padding: '6px 10px', display: 'flex', justifyContent: 'flex-end', position: 'sticky', bottom: 0, background: '#161a24' }}>
                                                <button
                                                    type="button"
                                                    onClick={() => setSubcategoryOpen(false)}
                                                    style={{
                                                        background: '#00E676',
                                                        border: 'none',
                                                        color: '#000',
                                                        padding: '4px 12px',
                                                        borderRadius: '6px',
                                                        fontSize: '12px',
                                                        fontWeight: '700',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    Listo
                                                </button>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* Chips */}
                                {formData.subcategory_ids?.length > 0 && (
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                                        {formData.subcategory_ids.map(subId => {
                                            const subObj = allAvailableSubcategories.find(s => String(s.id) === String(subId));
                                            return (
                                                <span
                                                    key={subId}
                                                    style={{
                                                        background: 'rgba(0, 230, 118, 0.15)',
                                                        border: '1px solid rgba(0, 230, 118, 0.35)',
                                                        color: '#00E676',
                                                        borderRadius: '12px',
                                                        padding: '2px 8px',
                                                        fontSize: '11px',
                                                        fontWeight: '600',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '4px'
                                                    }}
                                                >
                                                    {subObj ? subObj.name : subId}
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleToggleSubcategory(subId);
                                                        }}
                                                        style={{
                                                            background: 'transparent',
                                                            border: 'none',
                                                            color: '#00E676',
                                                            cursor: 'pointer',
                                                            padding: 0,
                                                            fontSize: '12px'
                                                        }}
                                                    >
                                                        ✕
                                                    </button>
                                                </span>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* SECTION 3: RECURSOS Y PLAN (Solo si no es alquiler puro) */}
                    {!isRental && (
                        <div style={{
                            background: isSport ? 'rgba(0, 230, 118, 0.04)' : 'rgba(99, 102, 241, 0.04)',
                            border: `1px solid ${isSport ? 'rgba(0, 230, 118, 0.25)' : 'rgba(99, 102, 241, 0.25)'}`,
                            borderRadius: '16px',
                            padding: '18px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '14px'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', color: isSport ? '#00E676' : '#818CF8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span>{isSport ? '🏟️' : '👥'}</span> {isSport ? 'Configuración de Canchas' : 'Configuración de Especialistas / Agendas'}
                                </div>
                                <span style={{
                                    fontSize: '11px',
                                    fontWeight: '700',
                                    color: isSport ? '#00E676' : '#818CF8',
                                    background: isSport ? 'rgba(0, 230, 118, 0.12)' : 'rgba(99, 102, 241, 0.12)',
                                    padding: '3px 8px',
                                    borderRadius: '6px',
                                    border: `1px solid ${isSport ? 'rgba(0, 230, 118, 0.3)' : 'rgba(99, 102, 241, 0.3)'}`
                                }}>
                                    {planLabel} • {priceLabel}
                                </span>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: 'rgba(255, 255, 255, 0.9)' }}>
                                        {isSport ? 'Cantidad de Canchas' : 'Cantidad de Especialistas / Agendas'}
                                    </label>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <button
                                            type="button"
                                            onClick={() => setFormData(p => ({ ...p, resources_count: Math.max(1, (p.resources_count || 1) - 1) }))}
                                            style={{
                                                width: '40px',
                                                height: '40px',
                                                borderRadius: '10px',
                                                background: 'rgba(255, 255, 255, 0.08)',
                                                border: '1px solid rgba(255, 255, 255, 0.15)',
                                                color: 'white',
                                                fontSize: '18px',
                                                fontWeight: '700',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}
                                        >
                                            -
                                        </button>
                                        <input
                                            type="number"
                                            min="1"
                                            max="30"
                                            value={formData.resources_count || 1}
                                            onChange={(e) => setFormData({ ...formData, resources_count: parseInt(e.target.value) || 1 })}
                                            style={{
                                                width: '80px',
                                                textAlign: 'center',
                                                padding: '10px',
                                                background: 'rgba(0, 0, 0, 0.4)',
                                                border: `1px solid ${isSport ? 'rgba(0, 230, 118, 0.4)' : 'rgba(99, 102, 241, 0.4)'}`,
                                                borderRadius: '10px',
                                                color: isSport ? '#00E676' : '#818CF8',
                                                fontWeight: '800',
                                                fontSize: '17px',
                                                outline: 'none'
                                            }}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setFormData(p => ({ ...p, resources_count: Math.min(30, (p.resources_count || 1) + 1) }))}
                                            style={{
                                                width: '40px',
                                                height: '40px',
                                                borderRadius: '10px',
                                                background: 'rgba(255, 255, 255, 0.08)',
                                                border: '1px solid rgba(255, 255, 255, 0.15)',
                                                color: 'white',
                                                fontSize: '18px',
                                                fontWeight: '700',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}
                                        >
                                            +
                                        </button>
                                    </div>
                                </div>
                                <div style={{ flex: 2, fontSize: '12px', color: 'rgba(255, 255, 255, 0.55)', lineHeight: 1.5, background: 'rgba(0, 0, 0, 0.25)', padding: '10px 14px', borderRadius: '10px' }}>
                                    ⚡ Se generarán automáticamente <strong>{count} {isSport ? 'canchas' : 'especialistas'}</strong> y el negocio se sincronizará con el calendario correspondiente.
                                </div>
                            </div>
                        </div>
                    )}

                    {/* SECTION 4: UBICACIÓN Y CONTACTO */}
                    <div style={{
                        background: 'rgba(255, 255, 255, 0.025)',
                        border: '1px solid rgba(255, 255, 255, 0.07)',
                        borderRadius: '16px',
                        padding: '18px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '14px'
                    }}>
                        <div style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(255, 255, 255, 0.45)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span>📍</span> Ubicación y Contacto
                        </div>

                        <div>
                            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: 'rgba(255, 255, 255, 0.9)' }}>
                                Dirección / Ubicación <span style={{ color: '#00E676' }}>*</span>
                            </label>
                            <input
                                type="text"
                                required
                                value={formData.location}
                                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                placeholder="Dirección completa o ciudad"
                                style={{
                                    width: '100%',
                                    padding: '12px 14px',
                                    background: 'rgba(0, 0, 0, 0.35)',
                                    border: '1px solid rgba(255, 255, 255, 0.12)',
                                    borderRadius: '10px',
                                    color: 'white',
                                    fontSize: '14px',
                                    outline: 'none'
                                }}
                            />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: 'rgba(255, 255, 255, 0.9)' }}>
                                    WhatsApp
                                </label>
                                <input
                                    type="tel"
                                    value={formData.whatsapp}
                                    onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                                    placeholder="Número con código"
                                    style={{
                                        width: '100%',
                                        padding: '11px 12px',
                                        background: 'rgba(0, 0, 0, 0.35)',
                                        border: '1px solid rgba(255, 255, 255, 0.12)',
                                        borderRadius: '10px',
                                        color: 'white',
                                        fontSize: '13px',
                                        outline: 'none'
                                    }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: 'rgba(255, 255, 255, 0.9)' }}>
                                    Instagram
                                </label>
                                <input
                                    type="text"
                                    value={formData.instagram}
                                    onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                                    placeholder="@usuario"
                                    style={{
                                        width: '100%',
                                        padding: '11px 12px',
                                        background: 'rgba(0, 0, 0, 0.35)',
                                        border: '1px solid rgba(255, 255, 255, 0.12)',
                                        borderRadius: '10px',
                                        color: 'white',
                                        fontSize: '13px',
                                        outline: 'none'
                                    }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: 'rgba(255, 255, 255, 0.9)' }}>
                                    TikTok
                                </label>
                                <input
                                    type="text"
                                    value={formData.tiktok}
                                    onChange={(e) => setFormData({ ...formData, tiktok: e.target.value })}
                                    placeholder="@usuario"
                                    style={{
                                        width: '100%',
                                        padding: '11px 12px',
                                        background: 'rgba(0, 0, 0, 0.35)',
                                        border: '1px solid rgba(255, 255, 255, 0.12)',
                                        borderRadius: '10px',
                                        color: 'white',
                                        fontSize: '13px',
                                        outline: 'none'
                                    }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: 'rgba(255, 255, 255, 0.9)' }}>
                                    Facebook
                                </label>
                                <input
                                    type="text"
                                    value={formData.facebook}
                                    onChange={(e) => setFormData({ ...formData, facebook: e.target.value })}
                                    placeholder="Nombre de página"
                                    style={{
                                        width: '100%',
                                        padding: '11px 12px',
                                        background: 'rgba(0, 0, 0, 0.35)',
                                        border: '1px solid rgba(255, 255, 255, 0.12)',
                                        borderRadius: '10px',
                                        color: 'white',
                                        fontSize: '13px',
                                        outline: 'none'
                                    }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* SECTION 5: VENDEDOR ASIGNADO */}
                    <div style={{
                        background: 'rgba(255, 255, 255, 0.025)',
                        border: '1px solid rgba(255, 255, 255, 0.07)',
                        borderRadius: '16px',
                        padding: '18px'
                    }}>
                        <div ref={sellerRef} style={{ position: 'relative' }}>
                            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: 'rgba(255, 255, 255, 0.9)' }}>
                                Vendedor / Comisionista Asignado
                            </label>
                            <button
                                type="button"
                                onClick={() => { setCategoryOpen(false); setSubcategoryOpen(false); setSellerOpen(o => !o); }}
                                style={{
                                    width: '100%',
                                    padding: '12px 14px',
                                    background: 'rgba(0, 0, 0, 0.35)',
                                    border: sellerOpen ? '1px solid #00E676' : '1px solid rgba(255, 255, 255, 0.12)',
                                    borderRadius: '10px',
                                    color: 'white',
                                    fontSize: '14px',
                                    outline: 'none',
                                    textAlign: 'left',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: '8px'
                                }}
                            >
                                <span style={{ color: formData.seller_id ? 'white' : 'rgba(255,255,255,0.45)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span>👤</span>
                                    {(() => {
                                        if (!formData.seller_id) return 'Sin vendedor asignado';
                                        const seller = sellers.find(s => s.id === formData.seller_id);
                                        if (!seller) return 'Sin vendedor asignado';
                                        const name = `${seller.first_name || ''} ${seller.last_name || ''}`.trim();
                                        return name || seller.email;
                                    })()}
                                </span>
                                <motion.svg
                                    animate={{ rotate: sellerOpen ? 180 : 0 }}
                                    transition={{ duration: 0.2 }}
                                    width="14" height="14" viewBox="0 0 16 16" fill="rgba(255,255,255,0.6)"
                                >
                                    <path d="M8 11L3 6h10z" />
                                </motion.svg>
                            </button>

                            <AnimatePresence>
                                {sellerOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.96, y: -6 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.96, y: -6 }}
                                        transition={{ duration: 0.15 }}
                                        style={{
                                            position: 'absolute',
                                            top: 'calc(100% + 6px)',
                                            left: 0,
                                            right: 0,
                                            zIndex: 1000,
                                            backgroundColor: '#161a24',
                                            border: '1px solid rgba(255, 255, 255, 0.18)',
                                            borderRadius: '12px',
                                            boxShadow: '0 15px 45px rgba(0,0,0,0.7)',
                                            maxHeight: '220px',
                                            overflowY: 'auto'
                                        }}
                                    >
                                        <div
                                            onClick={() => {
                                                setFormData({ ...formData, seller_id: '' });
                                                setSellerOpen(false);
                                            }}
                                            style={{
                                                padding: '10px 14px',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                backgroundColor: !formData.seller_id ? 'rgba(0, 230, 118, 0.12)' : 'transparent',
                                                borderBottom: '1px solid rgba(255,255,255,0.05)'
                                            }}
                                        >
                                            <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: '13px' }}>Sin vendedor</span>
                                            {!formData.seller_id && (
                                                <svg width="14" height="14" viewBox="0 0 18 18" fill="#00E676">
                                                    <path d="M6.5 12.5L3 9l1.5-1.5 2 2L13.5 3l1.5 1.5z" />
                                                </svg>
                                            )}
                                        </div>

                                        {sellers.map(seller => {
                                            const isSel = formData.seller_id === seller.id;
                                            return (
                                                <div
                                                    key={seller.id}
                                                    onClick={() => {
                                                        setFormData({ ...formData, seller_id: seller.id });
                                                        setSellerOpen(false);
                                                    }}
                                                    style={{
                                                        padding: '10px 14px',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between',
                                                        backgroundColor: isSel ? 'rgba(0, 230, 118, 0.12)' : 'transparent',
                                                        borderBottom: '1px solid rgba(255,255,255,0.05)'
                                                    }}
                                                >
                                                    <span style={{ color: isSel ? '#00E676' : 'white', fontSize: '13px', fontWeight: isSel ? '700' : '400' }}>
                                                        {`${seller.first_name || ''} ${seller.last_name || ''}`.trim() || seller.email}
                                                    </span>
                                                    {isSel && (
                                                        <svg width="14" height="14" viewBox="0 0 18 18" fill="#00E676">
                                                            <path d="M6.5 12.5L3 9l1.5-1.5 2 2L13.5 3l1.5 1.5z" />
                                                        </svg>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>

                    {/* SECTION 6: ESTADO DE SUSCRIPCIÓN */}
                    <div style={{
                        background: 'rgba(255, 255, 255, 0.025)',
                        border: '1px solid rgba(255, 255, 255, 0.07)',
                        borderRadius: '16px',
                        padding: '18px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px'
                    }}>
                        <div style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(255, 255, 255, 0.45)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span>💳</span> Estado de Suscripción Comercial
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                            {[
                                { id: 'trial', label: '⏱ En Prueba', color: '#fbbf24', bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.4)' },
                                { id: 'active', label: '✓ Activo / Al día', color: '#00E676', bg: 'rgba(0, 230, 118, 0.15)', border: 'rgba(0, 230, 118, 0.4)' },
                                { id: 'inactive', label: '✗ Inactivo', color: '#f87171', bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.4)' }
                            ].map(st => {
                                const isSel = (formData.subscription_status || 'trial') === st.id;
                                return (
                                    <button
                                        key={st.id}
                                        type="button"
                                        onClick={() => setFormData({ ...formData, subscription_status: st.id })}
                                        style={{
                                            padding: '10px 8px',
                                            borderRadius: '10px',
                                            border: `1px solid ${isSel ? st.color : 'rgba(255, 255, 255, 0.1)'}`,
                                            background: isSel ? st.bg : 'rgba(0, 0, 0, 0.3)',
                                            color: isSel ? st.color : 'rgba(255, 255, 255, 0.7)',
                                            fontWeight: isSel ? '700' : '500',
                                            fontSize: '12px',
                                            cursor: 'pointer',
                                            transition: 'all 0.15s',
                                            boxShadow: isSel ? `0 0 12px ${st.border}` : 'none'
                                        }}
                                    >
                                        {st.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div style={{
                        display: 'flex',
                        gap: '12px',
                        justifyContent: 'flex-end',
                        paddingTop: '8px',
                        borderTop: '1px solid rgba(255, 255, 255, 0.08)'
                    }}>
                        <button
                            type="button"
                            onClick={onClose}
                            style={{
                                padding: '12px 22px',
                                background: 'rgba(255, 255, 255, 0.06)',
                                border: '1px solid rgba(255, 255, 255, 0.12)',
                                borderRadius: '12px',
                                color: 'rgba(255, 255, 255, 0.85)',
                                cursor: 'pointer',
                                fontWeight: '600',
                                fontSize: '14px',
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.12)'}
                            onMouseLeave={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.06)'}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                padding: '12px 28px',
                                background: loading ? 'rgba(255, 255, 255, 0.1)' : 'linear-gradient(135deg, #00E676 0%, #059669 100%)',
                                border: 'none',
                                borderRadius: '12px',
                                color: loading ? 'rgba(255, 255, 255, 0.5)' : '#000000',
                                fontWeight: '800',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                fontSize: '14px',
                                boxShadow: loading ? 'none' : '0 4px 18px rgba(0, 230, 118, 0.4)',
                                transition: 'all 0.2s',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}
                        >
                            {loading && (
                                <div style={{ width: '16px', height: '16px', border: '2px solid #000', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
                            )}
                            <span>{loading ? 'Guardando...' : business ? 'Guardar Cambios' : 'Crear Negocio'}</span>
                        </button>
                    </div>
                </form>
            </motion.div>

            {/* Credentials Panel */}
            <AnimatePresence>
                {showCredentials && createdCredentials && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        style={{
                            position: 'fixed',
                            inset: 0,
                            background: 'rgba(0, 0, 0, 0.88)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 1100,
                            backdropFilter: 'blur(10px)',
                            padding: '20px'
                        }}
                        onClick={() => {
                            setShowCredentials(false);
                            setCreatedCredentials(null);
                            onClose();
                        }}
                    >
                        <motion.div
                            initial={{ scale: 0.92, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.92, opacity: 0 }}
                            transition={{ duration: 0.22 }}
                            onClick={(e) => e.stopPropagation()}
                            style={{
                                background: 'linear-gradient(170deg, #161b26 0%, #0f131a 100%)',
                                borderRadius: '24px',
                                padding: '36px',
                                maxWidth: '520px',
                                width: '100%',
                                border: '1px solid rgba(0, 230, 118, 0.35)',
                                boxShadow: '0 25px 65px rgba(0, 0, 0, 0.8), 0 0 30px rgba(0, 230, 118, 0.15)',
                                color: 'white'
                            }}
                        >
                            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                                <div style={{
                                    width: '64px',
                                    height: '64px',
                                    margin: '0 auto 14px',
                                    borderRadius: '50%',
                                    background: 'linear-gradient(135deg, #00E676, #059669)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '30px',
                                    boxShadow: '0 0 25px rgba(0, 230, 118, 0.4)'
                                }}>✓</div>
                                <h2 style={{ fontSize: '24px', fontWeight: '800', margin: 0, color: '#fff' }}>
                                    ¡Negocio Creado con Éxito!
                                </h2>
                                <p style={{ opacity: 0.7, marginTop: '6px', fontSize: '13px' }}>
                                    Compartí estas credenciales con el dueño de <strong>{createdCredentials.name}</strong>
                                </p>
                            </div>

                            <CredentialsRow label="Email de acceso" value={createdCredentials.email} />
                            <CredentialsRow label="Contraseña temporal" value={createdCredentials.password} />
                            <CredentialsRow label="Portal de ingreso" value="https://www.turnitoslr.com/login" />

                            <div style={{
                                marginTop: '16px',
                                padding: '12px 14px',
                                background: 'rgba(245, 158, 11, 0.1)',
                                borderRadius: '10px',
                                border: '1px solid rgba(245, 158, 11, 0.3)',
                                color: '#fbbf24',
                                fontSize: '12px',
                                textAlign: 'center'
                            }}>
                                ⚠️ Guardá estas credenciales ahora. Por seguridad, no se vuelven a mostrar.
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '22px' }}>
                                <button
                                    onClick={() => {
                                        setShowCredentials(false);
                                        setCreatedCredentials(null);
                                        onClose();
                                    }}
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        background: 'linear-gradient(135deg, #00E676, #059669)',
                                        border: 'none',
                                        borderRadius: '12px',
                                        color: '#000',
                                        cursor: 'pointer',
                                        fontWeight: '800',
                                        fontSize: '14px',
                                        boxShadow: '0 4px 15px rgba(0, 230, 118, 0.3)'
                                    }}
                                >
                                    Entendido y Cerrar
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const CredentialsRow = ({ label, value }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch (e) {
            const textarea = document.createElement('textarea');
            textarea.value = value;
            document.body.appendChild(textarea);
            textarea.select();
            try { document.execCommand('copy'); } catch (_) {}
            document.body.removeChild(textarea);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        }
    };

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '10px 12px',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '10px',
            marginBottom: '10px'
        }}>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '10px', opacity: 0.6, fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>
                    {label}
                </div>
                <div style={{ fontFamily: 'monospace', fontSize: '13px', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {value || '(vacío)'}
                </div>
            </div>
            <button
                onClick={handleCopy}
                style={{
                    padding: '6px 14px',
                    background: copied ? 'rgba(0, 230, 118, 0.25)' : 'rgba(255, 255, 255, 0.08)',
                    border: copied ? '1px solid #00E676' : '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '8px',
                    color: copied ? '#00E676' : 'white',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: '700',
                    minWidth: '85px',
                    transition: 'all 0.15s'
                }}
            >
                {copied ? '✓ Copiado' : 'Copiar'}
            </button>
        </div>
    );
};

export default BusinessFormModal;
