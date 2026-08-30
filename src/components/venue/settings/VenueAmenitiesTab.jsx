import React from 'react';
import AmenityIcon, { IconPickerModal, parseAmenity } from '../../common/AmenityIcon';

export default function VenueAmenitiesTab({
    formData,
    handleInputChange,
    newAmenityName,
    setNewAmenityName,
    newAmenityIcon,
    setNewAmenityIcon,
    isIconPickerOpen,
    setIsIconPickerOpen,
    showToast,
    cardStyle,
    sectionTitleStyle,
    inputStyle
}) {
    return (
        <div style={cardStyle}>
            <h2 style={sectionTitleStyle}>Comodidades (Amenities)</h2>
            <p style={{ marginBottom: '20px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                Selecciona las comodidades predeterminadas o añade comodidades personalizadas exclusivas de tu espacio:
            </p>

            {/* Presets Grid */}
            <div style={{ marginBottom: '28px' }}>
                <div style={{ fontSize: '14px', fontWeight: '700', marginBottom: '12px', color: 'var(--text-primary)' }}>
                    Comodidades Principales
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '10px' }}>
                    {[
                        { name: 'Piscina', icon: 'Waves' },
                        { name: 'Parrilla', icon: 'Flame' },
                        { name: 'Quincho Cubierto', icon: 'House' },
                        { name: 'WiFi', icon: 'Wifi' },
                        { name: 'Aire Acondicionado', icon: 'Snowflake' },
                        { name: 'Parking', icon: 'Car' },
                        { name: 'Sonido', icon: 'Speaker' },
                        { name: 'Cocina Equipada', icon: 'ChefHat' },
                        { name: 'Zona de Juegos', icon: 'Gamepad2' },
                        { name: 'Mesa de Pool', icon: 'Dices' },
                        { name: 'Metegol', icon: 'Trophy' },
                        { name: 'Ping Pong', icon: 'Activity' },
                        { name: 'Televisor', icon: 'Tv' },
                        { name: 'Iluminación LED', icon: 'Lightbulb' },
                        { name: 'Jardín', icon: 'Trees' },
                        { name: 'Baños Completos', icon: 'ShowerHead' },
                        { name: 'Freezer', icon: 'Refrigerator' },
                        { name: 'Juegos Infantiles', icon: 'Baby' }
                    ].map((preset, idx) => {
                        const currentAmenities = (formData.amenities || []).map(a => parseAmenity(a).name);
                        const isSelected = currentAmenities.includes(preset.name);

                        return (
                            <button
                                key={idx}
                                type="button"
                                onClick={() => {
                                    let updated;
                                    if (isSelected) {
                                        updated = (formData.amenities || []).filter(a => parseAmenity(a).name !== preset.name);
                                    } else {
                                        updated = [...(formData.amenities || []), { name: preset.name, icon: preset.icon }];
                                    }
                                    handleInputChange('amenities', updated);
                                }}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    padding: '12px 16px',
                                    borderRadius: '12px',
                                    border: isSelected ? '2px solid var(--primary-paddle)' : '1px solid var(--border)',
                                    background: isSelected ? 'rgba(132, 204, 22, 0.12)' : 'var(--bg-card)',
                                    color: isSelected ? 'var(--primary-paddle)' : 'var(--text-primary)',
                                    cursor: 'pointer',
                                    fontWeight: isSelected ? '700' : '500',
                                    fontSize: '13px',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                <AmenityIcon icon={preset.icon} size={20} />
                                <span>{preset.name}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Custom Amenities Section */}
            <div style={{
                padding: '20px',
                background: 'var(--bg-main)',
                borderRadius: '16px',
                border: '1px solid var(--border)'
            }}>
                <div style={{ fontSize: '15px', fontWeight: '800', marginBottom: '8px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>✨</span> Comodidades Personalizadas
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                    Agrega comodidades adicionales que ofrece tu lugar (ej: Cancha de Bochas, Cama Elástica, Grupo Electrógeno, Barra de Tragos):
                </p>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '14px' }}>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <button
                            type="button"
                            onClick={() => setIsIconPickerOpen(true)}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '8px 14px',
                                borderRadius: '10px',
                                border: '1.5px solid var(--primary-paddle, #84CC16)',
                                background: 'rgba(132, 204, 22, 0.15)',
                                color: 'var(--text-primary)',
                                fontSize: '13px',
                                fontWeight: '700',
                                cursor: 'pointer'
                            }}
                        >
                            <AmenityIcon icon={newAmenityIcon} size={18} />
                            <span>🎨 Cambiar Ícono (+60 disponibles)</span>
                        </button>
                    </div>

                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexWrap: 'wrap' }}>
                        {['Flame', 'Waves', 'Beer', 'Speaker', 'Gamepad2', 'Trees', 'Snowflake', 'Baby', 'Plug', 'ShieldCheck', 'Bath', 'Tv'].map(iconKey => (
                            <button
                                key={iconKey}
                                type="button"
                                onClick={() => setNewAmenityIcon(iconKey)}
                                style={{
                                    padding: '6px 8px',
                                    borderRadius: '8px',
                                    border: newAmenityIcon === iconKey ? '2px solid var(--primary-paddle)' : '1px solid var(--border)',
                                    background: newAmenityIcon === iconKey ? 'rgba(132, 204, 22, 0.2)' : 'var(--bg-card)',
                                    color: newAmenityIcon === iconKey ? 'var(--primary-paddle)' : 'var(--text-primary)',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                                title={iconKey}
                            >
                                <AmenityIcon icon={iconKey} size={16} />
                            </button>
                        ))}
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <input
                        type="text"
                        placeholder="Nombre de la comodidad personalizada (ej: Cama Elástica, Barra de Tragos)..."
                        value={newAmenityName}
                        onChange={(e) => setNewAmenityName(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                if (!newAmenityName.trim()) return;
                                const newObj = { name: newAmenityName.trim(), icon: newAmenityIcon || '✨' };
                                handleInputChange('amenities', [...(formData.amenities || []), newObj]);
                                setNewAmenityName('');
                                showToast('Comodidad personalizada agregada', 'success');
                            }
                        }}
                        style={{
                            ...inputStyle,
                            flex: 1,
                            margin: 0
                        }}
                    />
                    <button
                        type="button"
                        onClick={() => {
                            if (!newAmenityName.trim()) {
                                showToast('Escribe el nombre de la comodidad', 'warning');
                                return;
                            }
                            const newObj = { name: newAmenityName.trim(), icon: newAmenityIcon || '✨' };
                            handleInputChange('amenities', [...(formData.amenities || []), newObj]);
                            setNewAmenityName('');
                            showToast('Comodidad personalizada agregada', 'success');
                        }}
                        style={{
                            padding: '12px 18px',
                            borderRadius: '12px',
                            border: 'none',
                            background: 'var(--primary-paddle)',
                            color: 'white',
                            fontWeight: '700',
                            cursor: 'pointer',
                            fontSize: '13px',
                            whiteSpace: 'nowrap'
                        }}
                    >
                        + Agregar
                    </button>
                </div>

                {/* Active Custom Amenities list */}
                {(() => {
                    const presetNames = ['Piscina', 'Parrilla', 'Quincho Cubierto', 'WiFi', 'Aire Acondicionado', 'Parking', 'Sonido', 'Cocina Equipada', 'Zona de Juegos', 'Mesa de Pool', 'Metegol', 'Ping Pong', 'Televisor', 'Iluminación LED', 'Jardín', 'Baños Completos', 'Freezer', 'Juegos Infantiles'];
                    const customItems = (formData.amenities || [])
                        .map(a => parseAmenity(a))
                        .filter(item => item.name && !presetNames.includes(item.name));

                    if (customItems.length === 0) return null;

                    return (
                        <div style={{ marginTop: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {customItems.map((item, idx) => (
                                <div
                                    key={idx}
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        padding: '8px 12px',
                                        background: 'var(--bg-card)',
                                        borderRadius: '12px',
                                        border: '1px solid var(--border)',
                                        fontSize: '13px',
                                        fontWeight: '600',
                                        color: 'var(--text-primary)'
                                    }}
                                >
                                    <AmenityIcon icon={item.icon || '✨'} size={18} />
                                    <span>{item.name}</span>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const updated = (formData.amenities || []).filter(a => parseAmenity(a).name !== item.name);
                                            handleInputChange('amenities', updated);
                                        }}
                                        style={{
                                            background: 'transparent',
                                            border: 'none',
                                            cursor: 'pointer',
                                            color: '#EF4444',
                                            fontSize: '14px',
                                            padding: '0 2px',
                                            marginLeft: '4px',
                                            fontWeight: '700'
                                        }}
                                        title="Eliminar comodidad personalizada"
                                    >
                                        ✕
                                    </button>
                                </div>
                            ))}
                        </div>
                    );
                })()}
            </div>

            {/* Icon Picker Modal */}
            <IconPickerModal
                isOpen={isIconPickerOpen}
                onClose={() => setIsIconPickerOpen(false)}
                onSelect={(selectedIcon) => {
                    setNewAmenityIcon(selectedIcon);
                    showToast(`Ícono seleccionado`, 'info');
                }}
                currentIcon={newAmenityIcon}
            />
        </div>
    );
}
