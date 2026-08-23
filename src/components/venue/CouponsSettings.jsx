import React, { useState } from 'react';
import { useNotification } from '../../contexts/NotificationContext';

const DAYS_MAP = [
    { label: 'Dom', full: 'Domingo', value: 0 },
    { label: 'Lun', full: 'Lunes', value: 1 },
    { label: 'Mar', full: 'Martes', value: 2 },
    { label: 'Mié', full: 'Miércoles', value: 3 },
    { label: 'Jue', full: 'Jueves', value: 4 },
    { label: 'Vie', full: 'Viernes', value: 5 },
    { label: 'Sáb', full: 'Sábado', value: 6 }
];

export default function CouponsSettings({
    coupons = [],
    onChange
}) {
    const { showToast, showConfirm } = useNotification();
    const [isAdding, setIsAdding] = useState(false);
    const [editingIndex, setEditingIndex] = useState(null);

    // Form state
    const [formState, setFormState] = useState({
        id: '',
        code: '',
        description: '',
        type: 'percentage', // 'percentage' | 'fixed' | 'gift'
        value: 15,
        gift_title: '',
        min_spend: 0,
        max_discount: '',
        max_uses: '',
        used_count: 0,
        valid_days: [1, 2, 3, 4], // Mon to Thu by default
        start_date: '',
        end_date: '',
        one_per_customer: true,
        active: true
    });

    const resetForm = () => {
        setFormState({
            id: '',
            code: '',
            description: '',
            type: 'percentage',
            value: 15,
            gift_title: '',
            min_spend: 0,
            max_discount: '',
            max_uses: '',
            used_count: 0,
            valid_days: [1, 2, 3, 4],
            start_date: '',
            end_date: '',
            one_per_customer: true,
            active: true
        });
        setIsAdding(false);
        setEditingIndex(null);
    };

    const handleStartAdd = () => {
        resetForm();
        setFormState(prev => ({
            ...prev,
            id: 'coup_' + Date.now()
        }));
        setIsAdding(true);
    };

    const handleStartEdit = (index) => {
        const item = coupons[index];
        setEditingIndex(index);
        setFormState({
            id: item.id || 'coup_' + Date.now(),
            code: item.code || '',
            description: item.description || '',
            type: item.type || 'percentage',
            value: item.value !== undefined ? item.value : 15,
            gift_title: item.gift_title || '',
            min_spend: item.min_spend || 0,
            max_discount: item.max_discount || '',
            max_uses: item.max_uses || '',
            used_count: item.used_count || 0,
            valid_days: Array.isArray(item.valid_days) ? item.valid_days : [],
            start_date: item.start_date || '',
            end_date: item.end_date || '',
            one_per_customer: item.one_per_customer !== false,
            active: item.active !== false
        });
        setIsAdding(true);
    };

    const handleToggleDay = (dayValue) => {
        setFormState(prev => {
            const current = prev.valid_days || [];
            if (current.includes(dayValue)) {
                return { ...prev, valid_days: current.filter(d => d !== dayValue) };
            } else {
                return { ...prev, valid_days: [...current, dayValue].sort() };
            }
        });
    };

    const handleSelectAllDays = () => {
        setFormState(prev => ({
            ...prev,
            valid_days: [0, 1, 2, 3, 4, 5, 6]
        }));
    };

    const handleSelectWeekdays = () => {
        setFormState(prev => ({
            ...prev,
            valid_days: [1, 2, 3, 4] // Mon to Thu
        }));
    };

    const handleSaveCoupon = () => {
        if (!formState.code.trim()) {
            showToast('⚠️ Ingresa un código para el cupón (ej: JUEVES15)', 'warning');
            return;
        }

        const cleanCode = formState.code.trim().toUpperCase().replace(/\s+/g, '');

        // Check duplicate code
        const isDuplicate = coupons.some((c, idx) => idx !== editingIndex && (c.code || '').trim().toUpperCase() === cleanCode);
        if (isDuplicate) {
            showToast('⚠️ Ya existe un cupón con este código', 'warning');
            return;
        }

        if (formState.type === 'gift' && !formState.gift_title.trim()) {
            showToast('⚠️ Describe el beneficio o regalo (ej: Bolsa de leña gratis)', 'warning');
            return;
        }

        if ((formState.type === 'percentage' || formState.type === 'fixed') && (!formState.value || Number(formState.value) <= 0)) {
            showToast('⚠️ Ingresa un valor de descuento válido', 'warning');
            return;
        }

        const newCouponObj = {
            id: formState.id || 'coup_' + Date.now(),
            code: cleanCode,
            description: formState.description.trim() || null,
            type: formState.type,
            value: formState.type === 'gift' ? 0 : Number(formState.value || 0),
            gift_title: formState.type === 'gift' ? formState.gift_title.trim() : null,
            min_spend: Number(formState.min_spend || 0),
            max_discount: formState.max_discount ? Number(formState.max_discount) : null,
            max_uses: formState.max_uses ? Number(formState.max_uses) : null,
            used_count: formState.used_count || 0,
            valid_days: formState.valid_days.length === 7 || formState.valid_days.length === 0 ? [] : formState.valid_days,
            start_date: formState.start_date || null,
            end_date: formState.end_date || null,
            one_per_customer: formState.one_per_customer,
            active: formState.active
        };

        const updated = [...coupons];
        if (editingIndex !== null) {
            updated[editingIndex] = newCouponObj;
            showToast(`✓ Cupón ${cleanCode} actualizado`, 'success');
        } else {
            updated.push(newCouponObj);
            showToast(`✓ Cupón ${cleanCode} creado con éxito`, 'success');
        }

        onChange(updated);
        resetForm();
    };

    const handleDeleteCoupon = (index) => {
        const item = coupons[index];
        showConfirm({
            title: '¿Eliminar cupón?',
            message: `¿Estás seguro de eliminar el cupón "${item.code}"?`,
            confirmText: 'Eliminar',
            onConfirm: () => {
                const updated = coupons.filter((_, i) => i !== index);
                onChange(updated);
                showToast('Cupón eliminado', 'info');
            }
        });
    };

    const handleToggleActive = (index) => {
        const updated = [...coupons];
        updated[index] = {
            ...updated[index],
            active: updated[index].active === false ? true : false
        };
        onChange(updated);
    };

    const cardStyle = {
        background: 'var(--bg-card)',
        borderRadius: '16px',
        padding: '24px',
        border: '1px solid var(--border)',
        marginBottom: '24px'
    };

    const sectionTitleStyle = {
        fontSize: '20px',
        fontWeight: '800',
        color: 'var(--text-primary)',
        marginBottom: '6px'
    };

    return (
        <div style={cardStyle}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', marginBottom: '22px' }}>
                <div>
                    <h2 style={sectionTitleStyle}>🎟️ Cupones y Promociones</h2>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
                        Crea códigos de descuento en porcentaje, monto fijo o beneficios de regalo (ej: leña gratis, horas extra) para llenar días libres.
                    </p>
                </div>

                {!isAdding && (
                    <button
                        type="button"
                        onClick={handleStartAdd}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '10px 20px',
                            borderRadius: '10px',
                            background: 'var(--primary-paddle, #84CC16)',
                            color: '#000',
                            border: 'none',
                            fontWeight: '800',
                            fontSize: '13.5px',
                            cursor: 'pointer',
                            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.2)',
                            transition: 'opacity 0.2s'
                        }}
                    >
                        <span>➕</span> Crear Cupón
                    </button>
                )}
            </div>

            {/* Form Box */}
            {isAdding && (
                <div style={{
                    background: 'var(--bg-main)',
                    border: '1.5px solid var(--primary-paddle, #84CC16)',
                    borderRadius: '14px',
                    padding: '20px',
                    marginBottom: '24px',
                    boxShadow: '0 8px 30px rgba(0, 0, 0, 0.35)'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)' }}>
                            {editingIndex !== null ? '✏️ Editar Cupón' : '✨ Nuevo Cupón de Descuento / Beneficio'}
                        </h4>
                        <button
                            type="button"
                            onClick={resetForm}
                            style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontSize: '18px', cursor: 'pointer' }}
                        >
                            ✕
                        </button>
                    </div>

                    {/* Promotion Type Selector */}
                    <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                            Tipo de Promoción
                        </label>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px' }}>
                            <button
                                type="button"
                                onClick={() => setFormState(prev => ({ ...prev, type: 'percentage' }))}
                                style={{
                                    padding: '10px 12px',
                                    borderRadius: '10px',
                                    border: formState.type === 'percentage' ? '1.5px solid var(--primary-paddle, #84CC16)' : '1px solid var(--border)',
                                    background: formState.type === 'percentage' ? 'rgba(132, 204, 22, 0.15)' : 'var(--bg-card)',
                                    color: formState.type === 'percentage' ? 'var(--primary-paddle, #84CC16)' : 'var(--text-secondary)',
                                    fontWeight: '700',
                                    fontSize: '13px',
                                    cursor: 'pointer',
                                    textAlign: 'center'
                                }}
                            >
                                <div style={{ fontSize: '16px', marginBottom: '2px' }}>%</div>
                                <div>Porcentaje OFF</div>
                            </button>

                            <button
                                type="button"
                                onClick={() => setFormState(prev => ({ ...prev, type: 'fixed' }))}
                                style={{
                                    padding: '10px 12px',
                                    borderRadius: '10px',
                                    border: formState.type === 'fixed' ? '1.5px solid var(--primary-paddle, #84CC16)' : '1px solid var(--border)',
                                    background: formState.type === 'fixed' ? 'rgba(132, 204, 22, 0.15)' : 'var(--bg-card)',
                                    color: formState.type === 'fixed' ? 'var(--primary-paddle, #84CC16)' : 'var(--text-secondary)',
                                    fontWeight: '700',
                                    fontSize: '13px',
                                    cursor: 'pointer',
                                    textAlign: 'center'
                                }}
                            >
                                <div style={{ fontSize: '16px', marginBottom: '2px' }}>$</div>
                                <div>Monto Fijo ($)</div>
                            </button>

                            <button
                                type="button"
                                onClick={() => setFormState(prev => ({ ...prev, type: 'gift' }))}
                                style={{
                                    padding: '10px 12px',
                                    borderRadius: '10px',
                                    border: formState.type === 'gift' ? '1.5px solid #3B82F6' : '1px solid var(--border)',
                                    background: formState.type === 'gift' ? 'rgba(59, 130, 246, 0.15)' : 'var(--bg-card)',
                                    color: formState.type === 'gift' ? '#3B82F6' : 'var(--text-secondary)',
                                    fontWeight: '700',
                                    fontSize: '13px',
                                    cursor: 'pointer',
                                    textAlign: 'center'
                                }}
                            >
                                <div style={{ fontSize: '16px', marginBottom: '2px' }}>🎁</div>
                                <div>Beneficio / Regalo</div>
                            </button>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                        {/* Code */}
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                                Código del Cupón *
                            </label>
                            <input
                                type="text"
                                value={formState.code}
                                onChange={(e) => setFormState(prev => ({ ...prev, code: e.target.value.toUpperCase().replace(/\s+/g, '') }))}
                                placeholder="Ej: JUEVES15 o BIENVENIDO"
                                style={{
                                    width: '100%',
                                    padding: '10px 12px',
                                    borderRadius: '8px',
                                    border: '1px solid var(--border)',
                                    background: 'var(--bg-card)',
                                    color: 'var(--text-primary)',
                                    fontSize: '13.5px',
                                    fontWeight: '800',
                                    textTransform: 'uppercase'
                                }}
                            />
                        </div>

                        {/* Value or Gift Title */}
                        {formState.type === 'percentage' && (
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                                    Porcentaje de Descuento (%) *
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    max="100"
                                    value={formState.value}
                                    onChange={(e) => setFormState(prev => ({ ...prev, value: e.target.value }))}
                                    placeholder="15"
                                    style={{
                                        width: '100%',
                                        padding: '10px 12px',
                                        borderRadius: '8px',
                                        border: '1px solid var(--border)',
                                        background: 'var(--bg-card)',
                                        color: 'var(--text-primary)',
                                        fontSize: '13.5px',
                                        fontWeight: '700'
                                    }}
                                />
                            </div>
                        )}

                        {formState.type === 'fixed' && (
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                                    Monto a Descontar ($) *
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    step="500"
                                    value={formState.value}
                                    onChange={(e) => setFormState(prev => ({ ...prev, value: e.target.value }))}
                                    placeholder="5000"
                                    style={{
                                        width: '100%',
                                        padding: '10px 12px',
                                        borderRadius: '8px',
                                        border: '1px solid var(--border)',
                                        background: 'var(--bg-card)',
                                        color: 'var(--text-primary)',
                                        fontSize: '13.5px',
                                        fontWeight: '700'
                                    }}
                                />
                            </div>
                        )}

                        {formState.type === 'gift' && (
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                                    Descripción del Beneficio *
                                </label>
                                <input
                                    type="text"
                                    value={formState.gift_title}
                                    onChange={(e) => setFormState(prev => ({ ...prev, gift_title: e.target.value }))}
                                    placeholder="Ej: Bolsa de leña gratis para el asado"
                                    style={{
                                        width: '100%',
                                        padding: '10px 12px',
                                        borderRadius: '8px',
                                        border: '1px solid var(--border)',
                                        background: 'var(--bg-card)',
                                        color: 'var(--text-primary)',
                                        fontSize: '13.5px'
                                    }}
                                />
                            </div>
                        )}

                        {/* Description */}
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                                Título / Explicación Visible (Opcional)
                            </label>
                            <input
                                type="text"
                                value={formState.description}
                                onChange={(e) => setFormState(prev => ({ ...prev, description: e.target.value }))}
                                placeholder="Ej: 15% OFF de Lunes a Jueves"
                                style={{
                                    width: '100%',
                                    padding: '10px 12px',
                                    borderRadius: '8px',
                                    border: '1px solid var(--border)',
                                    background: 'var(--bg-card)',
                                    color: 'var(--text-primary)',
                                    fontSize: '13.5px'
                                }}
                            />
                        </div>

                        {/* Min Spend */}
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                                Monto Mínimo de Compra ($)
                            </label>
                            <input
                                type="number"
                                min="0"
                                step="1000"
                                value={formState.min_spend || ''}
                                onChange={(e) => setFormState(prev => ({ ...prev, min_spend: e.target.value }))}
                                placeholder="0 = Sin mínimo"
                                style={{
                                    width: '100%',
                                    padding: '10px 12px',
                                    borderRadius: '8px',
                                    border: '1px solid var(--border)',
                                    background: 'var(--bg-card)',
                                    color: 'var(--text-primary)',
                                    fontSize: '13.5px'
                                }}
                            />
                        </div>

                        {/* Max Uses */}
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                                Cupo Total de Usos
                            </label>
                            <input
                                type="number"
                                min="1"
                                value={formState.max_uses}
                                onChange={(e) => setFormState(prev => ({ ...prev, max_uses: e.target.value }))}
                                placeholder="Dejar vacío para ilimitado"
                                style={{
                                    width: '100%',
                                    padding: '10px 12px',
                                    borderRadius: '8px',
                                    border: '1px solid var(--border)',
                                    background: 'var(--bg-card)',
                                    color: 'var(--text-primary)',
                                    fontSize: '13.5px'
                                }}
                            />
                        </div>

                        {/* Expiration Date */}
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                                Vencimiento (Opcional)
                            </label>
                            <input
                                type="date"
                                value={formState.end_date}
                                onChange={(e) => setFormState(prev => ({ ...prev, end_date: e.target.value }))}
                                style={{
                                    width: '100%',
                                    padding: '10px 12px',
                                    borderRadius: '8px',
                                    border: '1px solid var(--border)',
                                    background: 'var(--bg-card)',
                                    color: 'var(--text-primary)',
                                    fontSize: '13.5px'
                                }}
                            />
                        </div>
                    </div>

                    {/* Valid Days of Week Selector */}
                    <div style={{ marginTop: '16px', background: 'var(--bg-card)', padding: '14px 16px', borderRadius: '10px', border: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                            <label style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>
                                📅 Días Habilitados para el Cupón
                            </label>
                            <div style={{ display: 'flex', gap: '6px' }}>
                                <button
                                    type="button"
                                    onClick={handleSelectWeekdays}
                                    style={{ background: 'transparent', border: 'none', color: 'var(--primary-paddle, #84CC16)', fontSize: '11.5px', fontWeight: '700', cursor: 'pointer' }}
                                >
                                    Solo Lun-Jue
                                </button>
                                <span style={{ color: 'var(--border)' }}>|</span>
                                <button
                                    type="button"
                                    onClick={handleSelectAllDays}
                                    style={{ background: 'transparent', border: 'none', color: 'var(--primary-paddle, #84CC16)', fontSize: '11.5px', fontWeight: '700', cursor: 'pointer' }}
                                >
                                    Todos los días
                                </button>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            {DAYS_MAP.map(day => {
                                const isSelected = (formState.valid_days || []).includes(day.value);
                                return (
                                    <button
                                        key={day.value}
                                        type="button"
                                        onClick={() => handleToggleDay(day.value)}
                                        style={{
                                            padding: '6px 12px',
                                            borderRadius: '8px',
                                            border: isSelected ? '1.5px solid var(--primary-paddle, #84CC16)' : '1px solid var(--border)',
                                            background: isSelected ? 'rgba(132, 204, 22, 0.15)' : 'var(--bg-main)',
                                            color: isSelected ? 'var(--primary-paddle, #84CC16)' : 'var(--text-secondary)',
                                            fontWeight: isSelected ? '800' : '600',
                                            fontSize: '12px',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        {day.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                        <button
                            type="button"
                            onClick={resetForm}
                            style={{
                                padding: '8px 16px',
                                borderRadius: '8px',
                                border: '1px solid var(--border)',
                                background: 'transparent',
                                color: 'var(--text-secondary)',
                                fontWeight: '700',
                                fontSize: '13px',
                                cursor: 'pointer'
                            }}
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            onClick={handleSaveCoupon}
                            style={{
                                padding: '8px 20px',
                                borderRadius: '8px',
                                border: 'none',
                                background: 'var(--primary-paddle, #84CC16)',
                                color: '#000',
                                fontWeight: '800',
                                fontSize: '13.5px',
                                cursor: 'pointer'
                            }}
                        >
                            {editingIndex !== null ? 'Guardar Cambios' : 'Crear Cupón'}
                        </button>
                    </div>
                </div>
            )}

            {/* List of Existing Coupons */}
            {coupons.length === 0 ? (
                <div style={{
                    textAlign: 'center',
                    padding: '36px 20px',
                    background: 'var(--bg-main)',
                    borderRadius: '12px',
                    border: '1px dashed var(--border)'
                }}>
                    <div style={{ fontSize: '32px', marginBottom: '8px' }}>🎟️</div>
                    <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', color: 'var(--text-primary)', fontWeight: '700' }}>
                        No tienes cupones creados
                    </h4>
                    <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
                        Crea códigos de descuento exclusivos o beneficios de regalo para fidelizar clientes y llenar tus días de menor demanda.
                    </p>
                    {!isAdding && (
                        <button
                            type="button"
                            onClick={handleStartAdd}
                            style={{
                                padding: '8px 16px',
                                borderRadius: '8px',
                                background: 'rgba(132, 204, 22, 0.15)',
                                border: '1px solid var(--primary-paddle, #84CC16)',
                                color: 'var(--primary-paddle, #84CC16)',
                                fontWeight: '700',
                                fontSize: '13px',
                                cursor: 'pointer'
                            }}
                        >
                            ➕ Crear Primer Cupón
                        </button>
                    )}
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {coupons.map((coupon, idx) => {
                        const isActive = coupon.active !== false;
                        const isGift = coupon.type === 'gift';
                        const isFixed = coupon.type === 'fixed';
                        const isExpired = coupon.end_date && new Date().toISOString().split('T')[0] > coupon.end_date;
                        const isExhausted = coupon.max_uses && Number(coupon.used_count || 0) >= Number(coupon.max_uses);

                        return (
                            <div
                                key={coupon.id || idx}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '14px 18px',
                                    borderRadius: '12px',
                                    background: isActive && !isExpired && !isExhausted ? 'var(--bg-main)' : 'rgba(255, 255, 255, 0.02)',
                                    border: '1px solid var(--border)',
                                    opacity: isActive && !isExpired && !isExhausted ? 1 : 0.6,
                                    gap: '12px',
                                    flexWrap: 'wrap'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', overflow: 'hidden' }}>
                                    <div style={{
                                        width: '42px',
                                        height: '42px',
                                        borderRadius: '10px',
                                        background: isGift ? 'rgba(59, 130, 246, 0.15)' : 'rgba(132, 204, 22, 0.15)',
                                        color: isGift ? '#3B82F6' : 'var(--primary-paddle, #84CC16)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '18px',
                                        fontWeight: '900',
                                        flexShrink: 0
                                    }}>
                                        {isGift ? '🎁' : isFixed ? '$' : '%'}
                                    </div>

                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                            <span style={{
                                                fontSize: '13px',
                                                fontWeight: '900',
                                                background: 'var(--bg-card)',
                                                border: '1px solid var(--border)',
                                                padding: '2px 8px',
                                                borderRadius: '6px',
                                                color: 'var(--text-primary)'
                                            }}>
                                                {coupon.code}
                                            </span>

                                            <span style={{ fontSize: '13.5px', fontWeight: '800', color: isGift ? '#3B82F6' : 'var(--primary-paddle, #84CC16)' }}>
                                                {isGift
                                                    ? coupon.gift_title
                                                    : isFixed
                                                        ? `$${Number(coupon.value || 0).toLocaleString('es-AR')} OFF`
                                                        : `${coupon.value}% OFF`}
                                            </span>

                                            {isExpired && (
                                                <span style={{ fontSize: '10.5px', background: 'rgba(239, 68, 68, 0.15)', color: '#EF4444', padding: '1px 6px', borderRadius: '4px', fontWeight: '700' }}>
                                                    Vencido
                                                </span>
                                            )}
                                            {isExhausted && (
                                                <span style={{ fontSize: '10.5px', background: 'rgba(245, 158, 11, 0.15)', color: '#F59E0B', padding: '1px 6px', borderRadius: '4px', fontWeight: '700' }}>
                                                    Agotado
                                                </span>
                                            )}
                                        </div>

                                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '3px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                            {coupon.description && <span>{coupon.description} •</span>}
                                            {Array.isArray(coupon.valid_days) && coupon.valid_days.length > 0 && coupon.valid_days.length < 7 ? (
                                                <span>Días: {coupon.valid_days.map(d => DAYS_MAP[d]?.label).join(', ')} •</span>
                                            ) : (
                                                <span>Todos los días •</span>
                                            )}
                                            <span>Usos: <strong>{coupon.used_count || 0}</strong>{coupon.max_uses ? ` / ${coupon.max_uses}` : ''}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <button
                                        type="button"
                                        onClick={() => handleToggleActive(idx)}
                                        style={{
                                            padding: '6px 10px',
                                            borderRadius: '6px',
                                            border: '1px solid var(--border)',
                                            background: isActive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                                            color: isActive ? '#10B981' : 'var(--text-secondary)',
                                            fontSize: '12px',
                                            fontWeight: '700',
                                            cursor: 'pointer'
                                        }}
                                        title={isActive ? 'Desactivar cupón' : 'Activar cupón'}
                                    >
                                        {isActive ? '🟢 Activo' : '⚪ Inactivo'}
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => handleStartEdit(idx)}
                                        style={{
                                            padding: '6px 10px',
                                            borderRadius: '6px',
                                            border: '1px solid var(--border)',
                                            background: 'var(--bg-card)',
                                            color: 'var(--text-primary)',
                                            fontSize: '12px',
                                            fontWeight: '700',
                                            cursor: 'pointer'
                                        }}
                                        title="Editar cupón"
                                    >
                                        ✏️
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => handleDeleteCoupon(idx)}
                                        style={{
                                            padding: '6px 10px',
                                            borderRadius: '6px',
                                            border: '1px solid rgba(239, 68, 68, 0.3)',
                                            background: 'rgba(239, 68, 68, 0.1)',
                                            color: '#EF4444',
                                            fontSize: '12px',
                                            fontWeight: '700',
                                            cursor: 'pointer'
                                        }}
                                        title="Eliminar cupón"
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
    );
}
