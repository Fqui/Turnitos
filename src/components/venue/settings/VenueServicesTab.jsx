import React from 'react';
import { EmojiPickerModal } from '../../common/AmenityIcon';

export default function VenueServicesTab({
    formData,
    handleInputChange,
    serviceIconPickerIndex,
    setServiceIconPickerIndex,
    saveChanges,
    saving,
    isMobile,
    showToast,
    cardStyle,
    sectionTitleStyle,
    inputStyle,
    buttonStyle
}) {
    return (
        <div style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
                <div>
                    <h2 style={{ ...sectionTitleStyle, marginBottom: '4px' }}>✨ Servicios Adicionales (Opcionales)</h2>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
                        Configura los extras que los clientes pueden sumar a su reserva (limpieza, DJ, vajilla, etc.). El valor se suma automáticamente al total.
                    </p>
                </div>
                <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: 'rgba(132, 204, 22, 0.12)',
                    color: 'var(--primary-paddle, #84CC16)',
                    padding: '6px 14px',
                    borderRadius: '20px',
                    fontSize: '13px',
                    fontWeight: '700'
                }}>
                    <span>🟢 {(formData.additional_services || []).filter(s => s.enabled !== false).length} Activos</span>
                </div>
            </div>

            {/* Preset Quick Add Badges */}
            <div style={{ marginBottom: '24px', background: 'var(--bg-card)', padding: '16px', borderRadius: '14px', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>💡 Plantillas de Servicios Frecuentes (1 Clic para Agregar):</span>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {[
                        { icon: '🧹', name: 'Limpieza Post-Evento', price: 15000, description: 'Limpieza profunda del quincho, parque y baños al finalizar el evento', allow_quantity: false, enabled: true },
                        { icon: '🎧', name: 'Servicio de DJ y Luces', price: 40000, description: 'Sonido profesional de alta potencia e iluminación robótica de pista', allow_quantity: false, enabled: true },
                        { icon: '🍽️', name: 'Vajilla y Mantelería', price: 18000, description: 'Juego completo de platos, cubiertos, copas de vidrio y manteles', allow_quantity: true, enabled: true },
                        { icon: '🥩', name: 'Servicio de Asador', price: 30000, description: 'Parrillero profesional a cargo del fuego y servido de carnes', allow_quantity: false, enabled: true },
                        { icon: '🏰', name: 'Castillo Inflable', price: 28000, description: 'Juego inflable infantil instalado durante todo el horario de la reserva', allow_quantity: false, enabled: true },
                        { icon: '🧊', name: 'Barra, Hielera y Hielo', price: 20000, description: 'Conservadora gigante, espacio de barra y 4 bolsas de hielo de 10kg', allow_quantity: true, enabled: true },
                        { icon: '🎈', name: 'Decoración y Globología', price: 25000, description: 'Arco de globos orgánico y fondo temático para fotos', allow_quantity: false, enabled: true },
                        { icon: '🎂', name: 'Torta y Mesa Dulce', price: 22000, description: 'Torta artesanal personalizada y variedad de mini tartas dulces', allow_quantity: false, enabled: true },
                        { icon: '🍸', name: 'Bartender & Tragos', price: 35000, description: 'Servicio de barra libre con coctelería clásica y de autor', allow_quantity: false, enabled: true },
                        { icon: '🪩', name: 'Luces & Pista Boliche', price: 30000, description: 'Efectos láser, humo y esfera de espejos para baile nocturno', allow_quantity: false, enabled: true },
                        { icon: '🏓', name: 'Mesa de Ping Pong', price: 15000, description: 'Mesa profesional con 4 paletas y pelotitas de repuesto', allow_quantity: false, enabled: true }
                    ].map((preset, idx) => {
                        const alreadyAdded = (formData.additional_services || []).some(s => s.name.toLowerCase() === preset.name.toLowerCase());
                        return (
                            <button
                                key={idx}
                                type="button"
                                onClick={() => {
                                    if (alreadyAdded) {
                                        showToast('Este servicio ya está en tu lista', 'info');
                                        return;
                                    }
                                    handleInputChange('additional_services', [
                                        ...(formData.additional_services || []),
                                        preset
                                    ]);
                                    showToast(`Servicio "${preset.name}" agregado`, 'success');
                                }}
                                style={{
                                    padding: '8px 14px',
                                    borderRadius: '10px',
                                    border: alreadyAdded ? '1px solid var(--border)' : '1.5px dashed var(--primary-paddle)',
                                    background: alreadyAdded ? 'rgba(0,0,0,0.03)' : 'rgba(132, 204, 22, 0.06)',
                                    color: alreadyAdded ? 'var(--text-secondary)' : 'var(--text-primary)',
                                    fontSize: '12.5px',
                                    fontWeight: '700',
                                    cursor: alreadyAdded ? 'default' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <span style={{ fontSize: '18px', lineHeight: 1 }}>{preset.icon}</span>
                                <span>{preset.name}</span>
                                <span style={{ fontSize: '11px', color: 'var(--primary-paddle, #84CC16)', fontWeight: '800' }}>
                                    ${preset.price.toLocaleString()}
                                </span>
                                {alreadyAdded && <span style={{ fontSize: '11px', color: '#10B981' }}>✓</span>}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Configured Services List */}
            <div style={{ display: 'grid', gap: '16px', marginBottom: '24px' }}>
                {(formData.additional_services || []).length === 0 ? (
                    <div style={{
                        padding: '36px 20px',
                        textAlign: 'center',
                        background: 'var(--bg-card)',
                        borderRadius: '14px',
                        border: '1px dashed var(--border)'
                    }}>
                        <span style={{ fontSize: '32px', display: 'block', marginBottom: '8px' }}>✨</span>
                        <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' }}>
                            No has configurado servicios adicionales todavía
                        </div>
                        <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                            Haz clic en las plantillas de arriba o en "+ Agregar Servicio Personalizado".
                        </div>
                    </div>
                ) : (
                    (formData.additional_services || []).map((service, index) => {
                        const isEnabled = service.enabled !== false;
                        return (
                            <div
                                key={index}
                                style={{
                                    border: isEnabled ? '1px solid var(--border)' : '1px dashed rgba(255,255,255,0.1)',
                                    borderRadius: '16px',
                                    padding: '18px',
                                    background: isEnabled ? 'var(--bg-card)' : 'rgba(0,0,0,0.02)',
                                    opacity: isEnabled ? 1 : 0.7,
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{
                                            background: 'rgba(0,0,0,0.06)',
                                            color: 'var(--text-secondary)',
                                            fontSize: '11px',
                                            fontWeight: '800',
                                            padding: '3px 8px',
                                            borderRadius: '6px'
                                        }}>
                                            #{index + 1}
                                        </span>
                                        <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>
                                            {service.name || 'Nuevo Servicio'}
                                        </span>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const newServices = [...formData.additional_services];
                                                newServices[index].enabled = !isEnabled;
                                                handleInputChange('additional_services', newServices);
                                            }}
                                            style={{
                                                background: isEnabled ? 'rgba(16, 185, 129, 0.12)' : 'rgba(100, 116, 139, 0.12)',
                                                color: isEnabled ? '#10B981' : 'var(--text-secondary)',
                                                border: 'none',
                                                padding: '5px 12px',
                                                borderRadius: '8px',
                                                fontSize: '12px',
                                                fontWeight: '700',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '5px'
                                            }}
                                        >
                                            <span>{isEnabled ? '🟢 Disponible' : '⚪ Pausado'}</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const newServices = [...formData.additional_services];
                                                newServices.splice(index, 1);
                                                handleInputChange('additional_services', newServices);
                                                showToast('Servicio eliminado', 'info');
                                            }}
                                            style={{
                                                background: 'rgba(239, 68, 68, 0.1)',
                                                border: '1px solid rgba(239, 68, 68, 0.2)',
                                                color: '#ef4444',
                                                borderRadius: '8px',
                                                width: '32px',
                                                height: '32px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                cursor: 'pointer',
                                                fontSize: '14px'
                                            }}
                                            title="Eliminar servicio"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '80px 1fr 180px', gap: '12px', marginBottom: '12px' }}>
                                    <div>
                                        <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
                                            Ícono
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => setServiceIconPickerIndex(index)}
                                            style={{
                                                ...inputStyle,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                cursor: 'pointer',
                                                height: '42px',
                                                padding: '6px',
                                                fontSize: '22px'
                                            }}
                                            title="Elegir ícono a color (+100 opciones)"
                                        >
                                            <span>{service.icon || '✨'}</span>
                                        </button>
                                    </div>

                                    <div>
                                        <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
                                            Nombre del Servicio *
                                        </label>
                                        <input
                                            placeholder="Ej: Limpieza Post-Evento, Sonido DJ, etc."
                                            value={service.name}
                                            onChange={e => {
                                                const newServices = [...formData.additional_services];
                                                newServices[index].name = e.target.value;
                                                handleInputChange('additional_services', newServices);
                                            }}
                                            style={{ ...inputStyle, padding: '10px 12px', fontWeight: '600' }}
                                        />
                                    </div>

                                    <div>
                                        <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
                                            Precio Total ($) *
                                        </label>
                                        <div style={{ position: 'relative' }}>
                                            <input
                                                type="number"
                                                placeholder="Ej: 15000"
                                                value={service.price}
                                                onChange={e => {
                                                    const newServices = [...formData.additional_services];
                                                    newServices[index].price = parseInt(e.target.value) || 0;
                                                    handleInputChange('additional_services', newServices);
                                                }}
                                                style={{ ...inputStyle, padding: '10px 12px 10px 24px', fontWeight: '700' }}
                                            />
                                            <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontWeight: '700', color: 'var(--text-secondary)' }}>
                                                $
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div style={{ marginBottom: '12px' }}>
                                    <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>
                                        Modalidad de Contratación:
                                    </label>
                                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const newServices = [...formData.additional_services];
                                                newServices[index].allow_quantity = false;
                                                handleInputChange('additional_services', newServices);
                                            }}
                                            style={{
                                                padding: '6px 14px',
                                                borderRadius: '8px',
                                                border: service.allow_quantity === true ? '1px solid var(--border)' : '1.5px solid var(--primary-paddle)',
                                                background: service.allow_quantity === true ? 'transparent' : 'rgba(132, 204, 22, 0.12)',
                                                color: service.allow_quantity === true ? 'var(--text-secondary)' : 'var(--text-primary)',
                                                fontWeight: service.allow_quantity === true ? '500' : '700',
                                                fontSize: '12px',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                transition: 'all 0.15s'
                                            }}
                                        >
                                            <span>{service.allow_quantity !== true ? '🔘' : '⚪'}</span>
                                            <span>Servicio Único (Precio fijo por evento)</span>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => {
                                                const newServices = [...formData.additional_services];
                                                newServices[index].allow_quantity = true;
                                                handleInputChange('additional_services', newServices);
                                            }}
                                            style={{
                                                padding: '6px 14px',
                                                borderRadius: '8px',
                                                border: service.allow_quantity === true ? '1.5px solid var(--primary-paddle)' : '1px solid var(--border)',
                                                background: service.allow_quantity === true ? 'rgba(132, 204, 22, 0.12)' : 'transparent',
                                                color: service.allow_quantity === true ? 'var(--text-primary)' : 'var(--text-secondary)',
                                                fontWeight: service.allow_quantity === true ? '700' : '500',
                                                fontSize: '12px',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                transition: 'all 0.15s'
                                            }}
                                        >
                                            <span>{service.allow_quantity === true ? '🔘' : '⚪'}</span>
                                            <span>Por Cantidad (Permite sumar unidades)</span>
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
                                        ¿Qué incluye este servicio? (Descripción para el cliente)
                                    </label>
                                    <input
                                        placeholder="Ej: Limpieza de todo el quincho y parque después del evento para que no tengas que preocuparte..."
                                        value={service.description || ''}
                                        onChange={e => {
                                            const newServices = [...formData.additional_services];
                                            newServices[index].description = e.target.value;
                                            handleInputChange('additional_services', newServices);
                                        }}
                                        style={{ ...inputStyle, padding: '10px 12px', fontSize: '13px' }}
                                    />
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '12px' }}>
                <button
                    type="button"
                    onClick={() => {
                        handleInputChange('additional_services', [
                            ...(formData.additional_services || []),
                            { icon: '✨', name: '', price: 0, description: '', enabled: true }
                        ]);
                    }}
                    style={{
                        ...buttonStyle,
                        background: 'transparent',
                        border: '1.5px dashed var(--primary-paddle)',
                        color: 'var(--text-primary)',
                        flex: 1,
                        padding: '14px',
                        fontWeight: '700'
                    }}
                >
                    + Agregar Servicio Personalizado
                </button>

                <button
                    type="button"
                    onClick={saveChanges}
                    disabled={saving}
                    style={{
                        ...buttonStyle,
                        flex: 1.5,
                        padding: '14px',
                        fontSize: '14px',
                        fontWeight: '800',
                        boxShadow: '0 4px 16px rgba(132, 204, 22, 0.25)'
                    }}
                >
                    <span>{saving ? 'Guardando...' : '💾 Guardar Servicios Adicionales'}</span>
                </button>
            </div>

            {serviceIconPickerIndex !== null && (
                <EmojiPickerModal
                    isOpen={serviceIconPickerIndex !== null}
                    onClose={() => setServiceIconPickerIndex(null)}
                    title="🎨 Elegir Ícono a Color para el Servicio"
                    selectedIcon={formData.additional_services?.[serviceIconPickerIndex]?.icon || '✨'}
                    onSelect={(emoji) => {
                        const newServices = [...(formData.additional_services || [])];
                        if (newServices[serviceIconPickerIndex]) {
                            newServices[serviceIconPickerIndex] = {
                                ...newServices[serviceIconPickerIndex],
                                icon: emoji
                            };
                            handleInputChange('additional_services', newServices);
                        }
                        setServiceIconPickerIndex(null);
                    }}
                />
            )}
        </div>
    );
}
