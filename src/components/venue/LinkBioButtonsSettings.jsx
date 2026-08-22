import React, { useState, useRef } from 'react';
import serviceAdapter from '../../services/serviceAdapter';
import { useNotification } from '../../contexts/NotificationContext';
import { EmojiPickerModal } from '../common/AmenityIcon';

const PRESET_EMOJIS = ['📄', '📋', '🍔', '🍕', '🍻', '👥', '🎵', '⭐', '🌐', '💳', '📍', '📞', '🎁', '💬', '⚽', '🎾', '🏖️', '🔥'];

export default function LinkBioButtonsSettings({
    customLinks = [],
    onChange,
    primaryColor = '#84CC16'
}) {
    const { showToast, showConfirm } = useNotification();
    const [isAdding, setIsAdding] = useState(false);
    const [editingIndex, setEditingIndex] = useState(null);
    const [uploadingFile, setUploadingFile] = useState(false);
    const [isEmojiModalOpen, setIsEmojiModalOpen] = useState(false);
    const fileInputRef = useRef(null);

    const businessBrandColor = primaryColor || '#84CC16';

    const PRESET_COLORS = [
        { label: 'Color del Negocio', value: 'primary', color: businessBrandColor },
        { label: 'Tarjeta Neutra', value: 'card', color: '#1E1E1E' },
        { label: 'Verde WhatsApp', value: '#25D366', color: '#25D366' },
        { label: 'Azul', value: '#3B82F6', color: '#3B82F6' },
        { label: 'Rojo / Coral', value: '#EF4444', color: '#EF4444' },
        { label: 'Naranja', value: '#F59E0B', color: '#F59E0B' },
        { label: 'Púrpura', value: '#8B5CF6', color: '#8B5CF6' },
        { label: 'Rosa', value: '#EC4899', color: '#EC4899' },
        { label: 'Dorado', value: '#D97706', color: '#D97706' },
        { label: 'Negro Intenso', value: '#0A0A0A', color: '#0A0A0A' }
    ];

    // Form state
    const [formState, setFormState] = useState({
        id: '',
        title: '',
        subtitle: '',
        icon: '📄',
        linkType: 'file', // 'file' | 'url'
        url: '',
        fileName: '',
        fileSize: '',
        colorType: 'primary', // 'primary' | 'card' | 'custom'
        buttonColor: businessBrandColor,
        enabled: true
    });

    const resetForm = () => {
        setFormState({
            id: '',
            title: '',
            subtitle: '',
            icon: '📄',
            linkType: 'file',
            url: '',
            fileName: '',
            fileSize: '',
            colorType: 'primary',
            buttonColor: businessBrandColor,
            enabled: true
        });
        setIsAdding(false);
        setEditingIndex(null);
        setIsEmojiModalOpen(false);
    };

    const handleStartAdd = () => {
        resetForm();
        setFormState(prev => ({
            ...prev,
            id: 'link_' + Date.now(),
            buttonColor: businessBrandColor
        }));
        setIsAdding(true);
    };

    const handleStartEdit = (index) => {
        const item = customLinks[index];
        setEditingIndex(index);

        let cType = 'card';
        let bColor = item.button_color || businessBrandColor;
        if (item.highlight || item.button_color === 'primary' || item.button_color === businessBrandColor) {
            cType = 'primary';
            bColor = businessBrandColor;
        } else if (!item.button_color || item.button_color === 'card') {
            cType = 'card';
            bColor = '#1E1E1E';
        } else {
            cType = 'custom';
            bColor = item.button_color;
        }

        setFormState({
            id: item.id || 'link_' + Date.now(),
            title: item.title || '',
            subtitle: item.subtitle || '',
            icon: item.icon || '📄',
            linkType: item.file_url ? 'file' : 'url',
            url: item.file_url || item.url || '',
            fileName: item.file_name || '',
            fileSize: item.file_size || '',
            colorType: cType,
            buttonColor: bColor,
            enabled: item.enabled !== false
        });
        setIsAdding(true);
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Size check (15MB limit)
        if (file.size > 15 * 1024 * 1024) {
            showToast('⚠️ El archivo no debe superar los 15 MB', 'warning');
            return;
        }

        try {
            setUploadingFile(true);
            showToast(`Subiendo ${file.name}...`, 'info');
            const publicUrl = await serviceAdapter.uploadImage(file);

            if (publicUrl) {
                const formattedSize = file.size > 1024 * 1024
                    ? (file.size / (1024 * 1024)).toFixed(1) + ' MB'
                    : Math.round(file.size / 1024) + ' KB';

                setFormState(prev => ({
                    ...prev,
                    url: publicUrl,
                    fileName: file.name,
                    fileSize: formattedSize,
                    title: prev.title || file.name.replace(/\.[^/.]+$/, '')
                }));
                showToast('✓ Archivo subido correctamente', 'success');
            }
        } catch (error) {
            console.error('Error uploading file for LinkBio button:', error);
            showToast('Error al subir archivo. Inténtalo nuevamente.', 'error');
        } finally {
            setUploadingFile(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleSaveLink = () => {
        if (!formState.title.trim()) {
            showToast('⚠️ Ingresa un título para el botón', 'warning');
            return;
        }

        if (!formState.url.trim()) {
            showToast('⚠️ Debes ingresar un enlace web o subir un archivo', 'warning');
            return;
        }

        const effectiveColor = formState.colorType === 'primary'
            ? 'primary'
            : formState.colorType === 'card'
                ? 'card'
                : formState.buttonColor;

        const newLinkObj = {
            id: formState.id || 'link_' + Date.now(),
            title: formState.title.trim(),
            subtitle: formState.subtitle.trim() || null,
            icon: formState.icon || '🔗',
            url: formState.url.trim(),
            file_url: formState.linkType === 'file' ? formState.url.trim() : null,
            file_name: formState.linkType === 'file' ? (formState.fileName || null) : null,
            file_size: formState.linkType === 'file' ? (formState.fileSize || null) : null,
            button_color: effectiveColor,
            highlight: formState.colorType === 'primary' || (formState.colorType === 'custom' && formState.buttonColor !== 'card'),
            enabled: formState.enabled
        };

        const updated = [...customLinks];
        if (editingIndex !== null) {
            updated[editingIndex] = newLinkObj;
            showToast('✓ Botón actualizado', 'success');
        } else {
            updated.push(newLinkObj);
            showToast('✓ Nuevo botón agregado al LinkBio', 'success');
        }

        onChange(updated);
        resetForm();
    };

    const handleDeleteLink = (index) => {
        const item = customLinks[index];
        showConfirm({
            title: '¿Eliminar botón?',
            message: `¿Estás seguro de eliminar el botón "${item.title}"?`,
            confirmText: 'Eliminar',
            onConfirm: () => {
                const updated = customLinks.filter((_, i) => i !== index);
                onChange(updated);
                showToast('Botón eliminado', 'info');
            }
        });
    };

    const handleToggleLink = (index) => {
        const updated = [...customLinks];
        updated[index] = {
            ...updated[index],
            enabled: updated[index].enabled === false ? true : false
        };
        onChange(updated);
    };

    const getPreviewStyles = () => {
        const isCard = formState.colorType === 'card';
        const bg = formState.colorType === 'primary'
            ? businessBrandColor
            : isCard
                ? 'var(--bg-card, #1E1E1E)'
                : formState.buttonColor;

        return {
            backgroundColor: bg,
            color: isCard ? 'var(--text-primary, #FFFFFF)' : '#FFFFFF',
            border: isCard ? '1px solid var(--border, #333333)' : '1px solid rgba(255, 255, 255, 0.15)'
        };
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
                    <h2 style={sectionTitleStyle}>🔗 Botones Personalizados del LinkBio</h2>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
                        Agrega enlaces a tu carta/menú en PDF, grupo de WhatsApp, reglamento, catálogo y personaliza sus íconos y colores.
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
                        <span>➕</span> Agregar Botón
                    </button>
                )}
            </div>

            {/* Add / Edit Form Modal / Box */}
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
                            {editingIndex !== null ? '✏️ Editar Botón' : '✨ Nuevo Botón de LinkBio'}
                        </h4>
                        <button
                            type="button"
                            onClick={resetForm}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--text-secondary)',
                                fontSize: '18px',
                                cursor: 'pointer'
                            }}
                        >
                            ✕
                        </button>
                    </div>

                    {/* LIVE PREVIEW OF THE BUTTON */}
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                            VISTA PREVIA EN VIVO
                        </label>
                        <div
                            style={{
                                ...getPreviewStyles(),
                                width: '100%',
                                maxWidth: '420px',
                                padding: '12px 16px',
                                borderRadius: '16px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                boxShadow: '0 6px 16px rgba(0, 0, 0, 0.2)',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            <span style={{
                                fontSize: '18px',
                                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                                width: '36px',
                                height: '36px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: '10px'
                            }}>
                                {formState.icon || '🔗'}
                            </span>
                            <div style={{ flex: 1, overflow: 'hidden' }}>
                                <div style={{ fontWeight: '800', fontSize: '14.5px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {formState.title || 'Título del Botón'}
                                </div>
                                <div style={{ fontSize: '12px', opacity: 0.85, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {formState.subtitle || (formState.fileName ? `Archivo: ${formState.fileName}` : 'Subtítulo opcional')}
                                </div>
                            </div>
                            <span style={{ fontSize: '14px', opacity: 0.7 }}>➔</span>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                        {/* Title */}
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                                Título del Botón *
                            </label>
                            <input
                                type="text"
                                value={formState.title}
                                onChange={(e) => setFormState(prev => ({ ...prev, title: e.target.value }))}
                                placeholder="Ej: 📄 Ver Carta / Menú en PDF"
                                style={{
                                    width: '100%',
                                    padding: '10px 12px',
                                    borderRadius: '8px',
                                    border: '1px solid var(--border)',
                                    background: 'var(--bg-card)',
                                    color: 'var(--text-primary)',
                                    fontSize: '13.5px',
                                    fontWeight: '600'
                                }}
                            />
                        </div>

                        {/* Subtitle */}
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                                Subtítulo (Opcional)
                            </label>
                            <input
                                type="text"
                                value={formState.subtitle}
                                onChange={(e) => setFormState(prev => ({ ...prev, subtitle: e.target.value }))}
                                placeholder="Ej: Precios actualizados y combos"
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

                        {/* Emoji / Icon Selector with Full Explorer Modal */}
                        <div style={{ gridColumn: 'span 2' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)' }}>
                                    Ícono del Botón
                                </label>
                                <button
                                    type="button"
                                    onClick={() => setIsEmojiModalOpen(true)}
                                    style={{
                                        background: 'transparent',
                                        border: 'none',
                                        color: 'var(--primary-paddle, #84CC16)',
                                        fontSize: '12px',
                                        fontWeight: '700',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px'
                                    }}
                                >
                                    <span>🔍</span> Explorar todos los íconos
                                </button>
                            </div>

                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                                {/* Big current icon button */}
                                <button
                                    type="button"
                                    onClick={() => setIsEmojiModalOpen(true)}
                                    style={{
                                        width: '46px',
                                        height: '46px',
                                        borderRadius: '10px',
                                        border: '1.5px solid var(--primary-paddle, #84CC16)',
                                        background: 'var(--bg-card)',
                                        color: 'var(--text-primary)',
                                        fontSize: '22px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                                    }}
                                    title="Toca para abrir selector de íconos"
                                >
                                    {formState.icon || '🔗'}
                                </button>

                                {/* Quick Presets */}
                                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', flex: 1 }}>
                                    {PRESET_EMOJIS.map((em, idx) => (
                                        <button
                                            key={idx}
                                            type="button"
                                            onClick={() => setFormState(prev => ({ ...prev, icon: em }))}
                                            style={{
                                                background: formState.icon === em ? 'rgba(132, 204, 22, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                                                border: formState.icon === em ? '1.5px solid var(--primary-paddle, #84CC16)' : '1px solid var(--border)',
                                                borderRadius: '6px',
                                                padding: '6px 8px',
                                                cursor: 'pointer',
                                                fontSize: '15px'
                                            }}
                                        >
                                            {em}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Link Type Toggle */}
                        <div style={{ gridColumn: 'span 2' }}>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                                Tipo de Enlace
                            </label>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                    type="button"
                                    onClick={() => setFormState(prev => ({ ...prev, linkType: 'file' }))}
                                    style={{
                                        flex: 1,
                                        padding: '8px',
                                        borderRadius: '8px',
                                        border: formState.linkType === 'file' ? '1.5px solid var(--primary-paddle, #84CC16)' : '1px solid var(--border)',
                                        background: formState.linkType === 'file' ? 'rgba(132, 204, 22, 0.15)' : 'var(--bg-card)',
                                        color: formState.linkType === 'file' ? 'var(--primary-paddle, #84CC16)' : 'var(--text-secondary)',
                                        fontWeight: '700',
                                        fontSize: '12.5px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    📄 Subir Archivo
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFormState(prev => ({ ...prev, linkType: 'url' }))}
                                    style={{
                                        flex: 1,
                                        padding: '8px',
                                        borderRadius: '8px',
                                        border: formState.linkType === 'url' ? '1.5px solid var(--primary-paddle, #84CC16)' : '1px solid var(--border)',
                                        background: formState.linkType === 'url' ? 'rgba(132, 204, 22, 0.15)' : 'var(--bg-card)',
                                        color: formState.linkType === 'url' ? 'var(--primary-paddle, #84CC16)' : 'var(--text-secondary)',
                                        fontWeight: '700',
                                        fontSize: '12.5px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    🌐 URL Web
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Color Selector Section */}
                    <div style={{ marginTop: '16px', background: 'var(--bg-card)', padding: '14px 16px', borderRadius: '10px', border: '1px solid var(--border)' }}>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '10px' }}>
                            🎨 Color del Botón en el LinkBio
                        </label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                            {PRESET_COLORS.map((col, cIdx) => {
                                const isSelected = (col.value === 'primary' && formState.colorType === 'primary') ||
                                    (col.value === 'card' && formState.colorType === 'card') ||
                                    (formState.colorType === 'custom' && formState.buttonColor === col.value);

                                return (
                                    <button
                                        key={cIdx}
                                        type="button"
                                        onClick={() => {
                                            if (col.value === 'primary') {
                                                setFormState(prev => ({ ...prev, colorType: 'primary', buttonColor: businessBrandColor }));
                                            } else if (col.value === 'card') {
                                                setFormState(prev => ({ ...prev, colorType: 'card', buttonColor: '#1E1E1E' }));
                                            } else {
                                                setFormState(prev => ({ ...prev, colorType: 'custom', buttonColor: col.value }));
                                            }
                                        }}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            padding: '6px 10px',
                                            borderRadius: '8px',
                                            border: isSelected ? '2px solid #FFFFFF' : '1px solid var(--border)',
                                            background: 'var(--bg-main)',
                                            color: 'var(--text-primary)',
                                            fontSize: '12px',
                                            fontWeight: isSelected ? '800' : '600',
                                            cursor: 'pointer',
                                            boxShadow: isSelected ? '0 0 0 2px var(--primary-paddle, #84CC16)' : 'none'
                                        }}
                                    >
                                        <span style={{ width: '14px', height: '14px', borderRadius: '50%', background: col.color, display: 'inline-block' }} />
                                        <span>{col.label}</span>
                                    </button>
                                );
                            })}

                            {/* Custom Color Input */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '4px' }}>
                                <input
                                    type="color"
                                    value={formState.buttonColor.startsWith('#') ? formState.buttonColor : '#84CC16'}
                                    onChange={(e) => setFormState(prev => ({ ...prev, colorType: 'custom', buttonColor: e.target.value }))}
                                    style={{
                                        width: '32px',
                                        height: '32px',
                                        borderRadius: '8px',
                                        border: '1px solid var(--border)',
                                        background: 'transparent',
                                        cursor: 'pointer',
                                        padding: '2px'
                                    }}
                                    title="Elegir color personalizado libre"
                                />
                                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Color Libre</span>
                            </div>
                        </div>
                    </div>

                    {/* File Upload Section or URL Input */}
                    <div style={{ marginTop: '16px' }}>
                        {formState.linkType === 'file' ? (
                            <div style={{
                                background: 'var(--bg-card)',
                                border: '1.5px dashed var(--border)',
                                borderRadius: '10px',
                                padding: '16px',
                                textAlign: 'center'
                            }}>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileUpload}
                                    accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx"
                                    style={{ display: 'none' }}
                                />

                                {formState.url ? (
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', background: 'var(--bg-main)', padding: '10px 14px', borderRadius: '8px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                                            <span style={{ fontSize: '24px' }}>📄</span>
                                            <div style={{ textAlign: 'left', overflow: 'hidden' }}>
                                                <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                                    {formState.fileName || 'Archivo adjunto'}
                                                </div>
                                                {formState.fileSize && (
                                                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{formState.fileSize}</span>
                                                )}
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <a
                                                href={formState.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                style={{
                                                    padding: '4px 10px',
                                                    borderRadius: '6px',
                                                    background: 'rgba(255, 255, 255, 0.08)',
                                                    color: 'var(--primary-paddle, #84CC16)',
                                                    fontSize: '11.5px',
                                                    fontWeight: '700',
                                                    textDecoration: 'none'
                                                }}
                                            >
                                                👁️ Ver Archivo
                                            </a>
                                            <button
                                                type="button"
                                                onClick={() => fileInputRef.current?.click()}
                                                disabled={uploadingFile}
                                                style={{
                                                    padding: '4px 10px',
                                                    borderRadius: '6px',
                                                    background: 'var(--primary-paddle, #84CC16)',
                                                    color: '#000',
                                                    border: 'none',
                                                    fontSize: '11.5px',
                                                    fontWeight: '700',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                Cambiar
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div>
                                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 10px 0' }}>
                                            Selecciona tu carta, menú o documento en formato <strong>PDF, PNG o JPG</strong> (máx. 15MB)
                                        </p>
                                        <button
                                            type="button"
                                            disabled={uploadingFile}
                                            onClick={() => fileInputRef.current?.click()}
                                            style={{
                                                padding: '8px 18px',
                                                borderRadius: '8px',
                                                background: 'rgba(132, 204, 22, 0.15)',
                                                border: '1px solid var(--primary-paddle, #84CC16)',
                                                color: 'var(--primary-paddle, #84CC16)',
                                                fontWeight: '800',
                                                fontSize: '13px',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            {uploadingFile ? '⏳ Subiendo archivo...' : '📎 Seleccionar Archivo'}
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                                    URL de Destino (https://...) *
                                </label>
                                <input
                                    type="url"
                                    value={formState.url}
                                    onChange={(e) => setFormState(prev => ({ ...prev, url: e.target.value }))}
                                    placeholder="https://chat.whatsapp.com/... o https://tu-sitio.com"
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
                            onClick={handleSaveLink}
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
                            {editingIndex !== null ? 'Guardar Cambios' : 'Agregar al LinkBio'}
                        </button>
                    </div>
                </div>
            )}

            {/* List of Custom Links */}
            {customLinks.length === 0 ? (
                <div style={{
                    textAlign: 'center',
                    padding: '36px 20px',
                    background: 'var(--bg-main)',
                    borderRadius: '12px',
                    border: '1px dashed var(--border)'
                }}>
                    <div style={{ fontSize: '32px', marginBottom: '8px' }}>🔗</div>
                    <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', color: 'var(--text-primary)', fontWeight: '700' }}>
                        No tienes botones personalizados creados
                    </h4>
                    <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
                        Agrega enlaces a tu carta en PDF, reglamento o grupo de WhatsApp con tus propios íconos y colores para tu LinkBio.
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
                            ➕ Crear Primer Botón
                        </button>
                    )}
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {customLinks.map((link, idx) => {
                        const isEnabled = link.enabled !== false;
                        const targetUrl = link.file_url || link.url;
                        const isCardColor = !link.button_color || link.button_color === 'card';
                        const resolvedBg = link.button_color === 'primary'
                            ? businessBrandColor
                            : isCardColor
                                ? 'var(--bg-main)'
                                : link.button_color;

                        return (
                            <div
                                key={link.id || idx}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '14px 18px',
                                    borderRadius: '12px',
                                    background: isEnabled ? 'var(--bg-main)' : 'rgba(255, 255, 255, 0.02)',
                                    border: isCardColor ? '1px solid var(--border)' : `1.5px solid ${resolvedBg}`,
                                    opacity: isEnabled ? 1 : 0.6,
                                    transition: 'all 0.2s ease',
                                    gap: '12px'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', overflow: 'hidden' }}>
                                    <div style={{
                                        width: '40px',
                                        height: '40px',
                                        borderRadius: '10px',
                                        background: isCardColor ? 'var(--bg-card)' : resolvedBg,
                                        color: isCardColor ? 'var(--text-primary)' : '#FFFFFF',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '18px',
                                        flexShrink: 0
                                    }}>
                                        {link.icon || '🔗'}
                                    </div>

                                    <div style={{ overflow: 'hidden' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                            <span style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-primary)' }}>
                                                {link.title}
                                            </span>
                                            {!isCardColor && (
                                                <span style={{
                                                    fontSize: '10px',
                                                    background: `${resolvedBg}30`,
                                                    color: resolvedBg,
                                                    border: `1px solid ${resolvedBg}60`,
                                                    padding: '1px 6px',
                                                    borderRadius: '4px',
                                                    fontWeight: '800'
                                                }}>
                                                    Color personalizado
                                                </span>
                                            )}
                                            {link.file_url && (
                                                <span style={{ fontSize: '10px', background: 'rgba(59, 130, 246, 0.2)', color: '#3B82F6', padding: '1px 6px', borderRadius: '4px', fontWeight: '700' }}>
                                                    Archivo {link.file_name?.toLowerCase().endsWith('.pdf') ? 'PDF' : ''}
                                                </span>
                                            )}
                                        </div>

                                        {link.subtitle && (
                                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                                {link.subtitle}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Actions */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    {targetUrl && (
                                        <a
                                            href={targetUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{
                                                padding: '6px 10px',
                                                borderRadius: '6px',
                                                background: 'rgba(255, 255, 255, 0.06)',
                                                color: 'var(--text-secondary)',
                                                fontSize: '12px',
                                                fontWeight: '600',
                                                textDecoration: 'none'
                                            }}
                                            title="Abrir enlace en nueva pestaña"
                                        >
                                            ↗ Probar
                                        </a>
                                    )}

                                    <button
                                        type="button"
                                        onClick={() => handleToggleLink(idx)}
                                        style={{
                                            padding: '6px 10px',
                                            borderRadius: '6px',
                                            border: '1px solid var(--border)',
                                            background: isEnabled ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                                            color: isEnabled ? '#10B981' : 'var(--text-secondary)',
                                            fontSize: '12px',
                                            fontWeight: '700',
                                            cursor: 'pointer'
                                        }}
                                        title={isEnabled ? 'Desactivar botón' : 'Activar botón'}
                                    >
                                        {isEnabled ? '🟢 Activo' : '⚪ Inactivo'}
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
                                        title="Editar botón"
                                    >
                                        ✏️
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => handleDeleteLink(idx)}
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
                                        title="Eliminar botón"
                                    >
                                        🗑️
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Emoji / Icon Selector Modal */}
            <EmojiPickerModal
                isOpen={isEmojiModalOpen}
                onClose={() => setIsEmojiModalOpen(false)}
                onSelect={(selected) => {
                    setFormState(prev => ({ ...prev, icon: selected }));
                    setIsEmojiModalOpen(false);
                }}
                title="🎨 Elegir Ícono para el Botón"
                selectedIcon={formState.icon}
            />
        </div>
    );
}
