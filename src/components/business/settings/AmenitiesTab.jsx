import React, { useState } from 'react';
import AmenityIcon, { IconPickerModal, parseAmenity } from '../../common/AmenityIcon';

const PRESET_AMENITIES = [
    { name: 'WiFi Gratis', icon: 'Wifi' },
    { name: 'Aire Acondicionado', icon: 'Snowflake' },
    { name: 'Calefacción', icon: 'Flame' },
    { name: 'Café de Cortesía', icon: 'Coffee' },
    { name: 'Bebidas / Agua', icon: 'GlassWater' },
    { name: 'Estacionamiento', icon: 'Car' },
    { name: 'Música Ambiental', icon: 'Music' },
    { name: 'Sala de Espera', icon: 'Armchair' },
    { name: 'Baño para Clientes', icon: 'ShowerHead' },
    { name: 'Pet Friendly', icon: 'Dog' },
    { name: 'Cargadores de Celular', icon: 'Plug' },
    { name: 'Televisor / Pantalla', icon: 'Tv' },
    { name: 'Accesibilidad / Rampa', icon: 'Accessibility' },
    { name: 'Espejo de Cuerpo Entero', icon: 'Sparkles' },
    { name: 'Sector Infantil', icon: 'Baby' },
    { name: 'Sanitización / Higiene', icon: 'ShieldCheck' },
    { name: 'Cobro con QR / Tarjetas', icon: 'Zap' },
    { name: 'Iluminación Profesional', icon: 'Lightbulb' },
    { name: 'Lockers / Guardarropa', icon: 'Lock' },
    { name: 'Vestuarios / Duchas', icon: 'Bath' }
];

const QUICK_ICONS = [
    'Sparkles', 'Wifi', 'Snowflake', 'Flame', 'Coffee', 'GlassWater',
    'Music', 'Car', 'Armchair', 'Plug', 'ShieldCheck', 'Dog',
    'Accessibility', 'Tv', 'ShowerHead', 'Bath', 'Baby', 'Lock', 'Zap', 'Lightbulb'
];

export default function AmenitiesTab({
    formData,
    handleInputChange,
    handleSave,
    saving,
    showToast,
    primaryColor,
    inputStyle,
    buttonSecondaryStyle,
    saveButtonStyle
}) {
    const [newAmenityName, setNewAmenityName] = useState('');
    const [newAmenityIcon, setNewAmenityIcon] = useState('Sparkles');
    const [isIconPickerOpen, setIsIconPickerOpen] = useState(false);
    const [filterQuery, setFilterQuery] = useState('');

    const brandColor = primaryColor || '#3ECF8E';
    const currentAmenities = Array.isArray(formData.amenities) ? formData.amenities : [];

    const normalizeName = (s) => (s || '').toLowerCase().trim();

    const isPresetSelected = (preset) => {
        return currentAmenities.some(item => {
            const parsedName = normalizeName(parseAmenity(item).name);
            const presetNorm = normalizeName(preset.name);
            if (parsedName === presetNorm) return true;
            if (presetNorm.startsWith('wifi') && parsedName.startsWith('wifi')) return true;
            if (presetNorm.startsWith('aire') && parsedName.startsWith('aire')) return true;
            if (presetNorm.startsWith('estacionamiento') && (parsedName === 'parking' || parsedName === 'cochera' || parsedName === 'estacionamiento')) return true;
            if (presetNorm.startsWith('café') && (parsedName.includes('café') || parsedName.includes('cafe') || parsedName.includes('cafetería'))) return true;
            if (presetNorm.startsWith('sala de espera') && parsedName.includes('espera')) return true;
            if (presetNorm.startsWith('baño') && parsedName.includes('baño')) return true;
            return false;
        });
    };

    const togglePreset = (preset) => {
        const selected = isPresetSelected(preset);
        let updated;
        if (selected) {
            const presetNorm = normalizeName(preset.name);
            updated = currentAmenities.filter(item => {
                const parsedName = normalizeName(parseAmenity(item).name);
                if (parsedName === presetNorm) return false;
                if (presetNorm.startsWith('wifi') && parsedName.startsWith('wifi')) return false;
                if (presetNorm.startsWith('aire') && parsedName.startsWith('aire')) return false;
                if (presetNorm.startsWith('estacionamiento') && (parsedName === 'parking' || parsedName === 'cochera' || parsedName === 'estacionamiento')) return false;
                if (presetNorm.startsWith('café') && (parsedName.includes('café') || parsedName.includes('cafe') || parsedName.includes('cafetería'))) return false;
                if (presetNorm.startsWith('sala de espera') && parsedName.includes('espera')) return false;
                if (presetNorm.startsWith('baño') && parsedName.includes('baño')) return false;
                return true;
            });
        } else {
            updated = [...currentAmenities, { name: preset.name, icon: preset.icon }];
        }
        handleInputChange('amenities', updated);
    };

    const handleAddCustom = () => {
        if (!newAmenityName.trim()) {
            if (showToast) showToast('Escribe el nombre de la comodidad', 'warning');
            return;
        }
        const name = newAmenityName.trim();
        if (currentAmenities.some(item => normalizeName(parseAmenity(item).name) === normalizeName(name))) {
            if (showToast) showToast('Esta comodidad ya está agregada', 'warning');
            return;
        }
        const newObj = { name, icon: newAmenityIcon || 'Sparkles' };
        const updated = [...currentAmenities, newObj];
        handleInputChange('amenities', updated);
        setNewAmenityName('');
        if (showToast) showToast('Comodidad personalizada agregada', 'success');
    };

    const removeCustomAmenity = (nameToRemove) => {
        const updated = currentAmenities.filter(item => parseAmenity(item).name !== nameToRemove);
        handleInputChange('amenities', updated);
    };

    // Filtered presets
    const filteredPresets = PRESET_AMENITIES.filter(p =>
        normalizeName(p.name).includes(normalizeName(filterQuery))
    );

    // Identify active custom amenities (items not in PRESET_AMENITIES)
    const customAmenities = currentAmenities.filter(item => {
        const parsedName = normalizeName(parseAmenity(item).name);
        return !PRESET_AMENITIES.some(preset => {
            const presetNorm = normalizeName(preset.name);
            if (parsedName === presetNorm) return true;
            if (presetNorm.startsWith('wifi') && parsedName.startsWith('wifi')) return true;
            if (presetNorm.startsWith('aire') && parsedName.startsWith('aire')) return true;
            if (presetNorm.startsWith('estacionamiento') && (parsedName === 'parking' || parsedName === 'cochera' || parsedName === 'estacionamiento')) return true;
            if (presetNorm.startsWith('café') && (parsedName.includes('café') || parsedName.includes('cafe') || parsedName.includes('cafetería'))) return true;
            if (presetNorm.startsWith('sala de espera') && parsedName.includes('espera')) return true;
            if (presetNorm.startsWith('baño') && parsedName.includes('baño')) return true;
            return false;
        });
    });

    const totalSelected = currentAmenities.length;

    return (
        <div style={{ display: 'grid', gap: '24px' }}>
            {/* Header Card */}
            <div style={{
                background: 'var(--bg-main)',
                border: '1px solid var(--border)',
                borderRadius: '16px',
                padding: '24px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '10px' }}>
                    <h2 style={{ fontSize: '18px', fontWeight: '800', margin: 0, color: 'var(--text-primary)' }}>
                        Comodidades (Amenities)
                    </h2>
                    <span style={{
                        padding: '4px 12px',
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontWeight: '700',
                        background: `${brandColor}20`,
                        color: brandColor,
                        border: `1px solid ${brandColor}40`
                    }}>
                        {totalSelected} {totalSelected === 1 ? 'seleccionada' : 'seleccionadas'}
                    </span>
                </div>
                <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
                    Selecciona las comodidades predeterminadas o añade comodidades personalizadas exclusivas de tu espacio:
                </p>

                {/* Presets Header & Search Filter */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>
                        Comodidades Principales
                    </div>
                    {PRESET_AMENITIES.length > 8 && (
                        <div style={{ width: '220px', maxWidth: '100%' }}>
                            <input
                                type="text"
                                placeholder="Filtrar comodidades..."
                                value={filterQuery}
                                onChange={(e) => setFilterQuery(e.target.value)}
                                style={{
                                    ...inputStyle,
                                    padding: '6px 12px',
                                    fontSize: '12px',
                                    borderRadius: '8px',
                                    margin: 0
                                }}
                            />
                        </div>
                    )}
                </div>

                {/* Presets Grid */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                    gap: '10px',
                    marginBottom: '28px'
                }}>
                    {filteredPresets.map((preset, idx) => {
                        const isSelected = isPresetSelected(preset);

                        return (
                            <button
                                key={idx}
                                type="button"
                                onClick={() => togglePreset(preset)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: '10px',
                                    padding: '12px 14px',
                                    borderRadius: '12px',
                                    border: isSelected ? `2px solid ${brandColor}` : '1px solid var(--border)',
                                    background: isSelected ? `${brandColor}18` : 'var(--bg-card)',
                                    color: isSelected ? brandColor : 'var(--text-primary)',
                                    cursor: 'pointer',
                                    fontWeight: isSelected ? '700' : '500',
                                    fontSize: '13px',
                                    textAlign: 'left',
                                    transition: 'all 0.15s ease',
                                    boxShadow: isSelected ? `0 2px 8px ${brandColor}22` : 'none'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                                    <span style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: isSelected ? brandColor : 'var(--text-secondary)',
                                        flexShrink: 0
                                    }}>
                                        <AmenityIcon icon={preset.icon} size={20} />
                                    </span>
                                    <span style={{
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)'
                                    }}>
                                        {preset.name}
                                    </span>
                                </div>
                                <span style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: '18px',
                                    height: '18px',
                                    borderRadius: '50%',
                                    border: isSelected ? `1.5px solid ${brandColor}` : '1.5px solid var(--border)',
                                    background: isSelected ? brandColor : 'transparent',
                                    color: '#000',
                                    fontSize: '11px',
                                    fontWeight: '900',
                                    flexShrink: 0,
                                    lineHeight: 1
                                }}>
                                    {isSelected ? '✓' : ''}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* Custom Amenities Section (Rental / Venue Style) */}
                <div style={{
                    padding: '20px',
                    background: 'var(--bg-card)',
                    borderRadius: '16px',
                    border: '1px solid var(--border)'
                }}>
                    <div style={{
                        fontSize: '15px',
                        fontWeight: '800',
                        marginBottom: '6px',
                        color: 'var(--text-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}>
                        <span>✨</span> Comodidades Personalizadas
                    </div>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0 0 16px 0' }}>
                        Agrega comodidades adicionales que ofrece tu lugar (ej: Toallitas húmedas, Barra de Tragos, Iluminación LED, Lockers privados):
                    </p>

                    {/* Icon Selection Toolbar */}
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '14px' }}>
                        <button
                            type="button"
                            onClick={() => setIsIconPickerOpen(true)}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '8px 14px',
                                borderRadius: '10px',
                                border: `1.5px solid ${brandColor}`,
                                background: `${brandColor}20`,
                                color: 'var(--text-primary)',
                                fontSize: '13px',
                                fontWeight: '700',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                            }}
                        >
                            <AmenityIcon icon={newAmenityIcon} size={18} />
                            <span>🎨 Cambiar Ícono (+60 disponibles)</span>
                        </button>

                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexWrap: 'wrap' }}>
                            {QUICK_ICONS.map(iconKey => (
                                <button
                                    key={iconKey}
                                    type="button"
                                    onClick={() => setNewAmenityIcon(iconKey)}
                                    style={{
                                        padding: '6px 8px',
                                        borderRadius: '8px',
                                        border: newAmenityIcon === iconKey ? `2px solid ${brandColor}` : '1px solid var(--border)',
                                        background: newAmenityIcon === iconKey ? `${brandColor}25` : 'var(--bg-main)',
                                        color: newAmenityIcon === iconKey ? brandColor : 'var(--text-secondary)',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        transition: 'all 0.1s ease'
                                    }}
                                    title={iconKey}
                                >
                                    <AmenityIcon icon={iconKey} size={16} />
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Custom Amenity Name Input + Add Button */}
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <div style={{ position: 'relative', flex: 1 }}>
                            <div style={{
                                position: 'absolute',
                                left: '14px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                color: brandColor,
                                display: 'flex',
                                alignItems: 'center'
                            }}>
                                <AmenityIcon icon={newAmenityIcon} size={18} />
                            </div>
                            <input
                                type="text"
                                placeholder="Nombre de la comodidad personalizada (ej: Café Nespresso, Barra de Tragos)..."
                                value={newAmenityName}
                                onChange={(e) => setNewAmenityName(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleAddCustom();
                                    }
                                }}
                                style={{
                                    ...inputStyle,
                                    paddingLeft: '42px',
                                    margin: 0
                                }}
                            />
                        </div>
                        <button
                            type="button"
                            onClick={handleAddCustom}
                            style={{
                                padding: '12px 20px',
                                borderRadius: '12px',
                                border: 'none',
                                background: brandColor,
                                color: '#000000',
                                fontWeight: '800',
                                cursor: 'pointer',
                                fontSize: '13px',
                                whiteSpace: 'nowrap',
                                transition: 'opacity 0.15s ease'
                            }}
                        >
                            + Agregar
                        </button>
                    </div>

                    {/* Active Custom Amenities Chips */}
                    {customAmenities.length > 0 && (
                        <div style={{ marginTop: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {customAmenities.map((rawItem, idx) => {
                                const item = parseAmenity(rawItem);
                                return (
                                    <div
                                        key={idx}
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            padding: '8px 12px',
                                            background: 'var(--bg-main)',
                                            borderRadius: '12px',
                                            border: '1px solid var(--border)',
                                            fontSize: '13px',
                                            fontWeight: '600',
                                            color: 'var(--text-primary)'
                                        }}
                                    >
                                        <span style={{ color: brandColor, display: 'inline-flex', alignItems: 'center' }}>
                                            <AmenityIcon icon={item.icon || 'Sparkles'} size={18} />
                                        </span>
                                        <span>{item.name}</span>
                                        <button
                                            type="button"
                                            onClick={() => removeCustomAmenity(item.name)}
                                            style={{
                                                background: 'transparent',
                                                border: 'none',
                                                cursor: 'pointer',
                                                color: '#EF4444',
                                                fontSize: '15px',
                                                padding: '0 2px',
                                                marginLeft: '4px',
                                                fontWeight: '800',
                                                lineHeight: 1
                                            }}
                                            title="Eliminar comodidad personalizada"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Save Button */}
            <button
                type="button"
                onClick={() => handleSave({ amenities: formData.amenities })}
                style={{
                    ...saveButtonStyle,
                    background: brandColor,
                    color: '#000000',
                    fontWeight: '800',
                    padding: '14px 24px',
                    borderRadius: '12px'
                }}
                disabled={saving}
            >
                {saving ? 'Guardando en la nube...' : 'Guardar Comodidades'}
            </button>

            {/* Icon Picker Modal */}
            <IconPickerModal
                isOpen={isIconPickerOpen}
                onClose={() => setIsIconPickerOpen(false)}
                onSelect={(selectedIcon) => {
                    setNewAmenityIcon(selectedIcon);
                    if (showToast) showToast('Ícono seleccionado', 'info');
                }}
                currentIcon={newAmenityIcon}
            />
        </div>
    );
}
