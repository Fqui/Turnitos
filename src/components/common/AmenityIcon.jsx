import React, { useState } from 'react';
import * as LucideIcons from 'lucide-react';

// Comprehensive Icon Categories for Venues / Quinchos / Events / Rentals
export const AMENITY_ICON_CATEGORIES = [
    {
        id: 'fire_food',
        name: '🔥 Fuego & Gastronomía',
        icons: [
            { id: 'Flame', label: 'Parrilla / Fuego', type: 'lucide', icon: 'Flame' },
            { id: 'Utensils', label: 'Cubiertos / Vajilla', type: 'lucide', icon: 'Utensils' },
            { id: 'ChefHat', label: 'Cocina / Asador', type: 'lucide', icon: 'ChefHat' },
            { id: 'Wine', label: 'Barra / Vinos', type: 'lucide', icon: 'Wine' },
            { id: 'Beer', label: 'Cerveza / Chopera', type: 'lucide', icon: 'Beer' },
            { id: 'GlassWater', label: 'Bebidas / Hielo', type: 'lucide', icon: 'GlassWater' },
            { id: 'Coffee', label: 'Cafetería', type: 'lucide', icon: 'Coffee' },
            { id: 'Refrigerator', label: 'Freezer / Heladera', type: 'lucide', icon: 'Refrigerator' },
            { id: 'Microwave', label: 'Microondas', type: 'lucide', icon: 'Microwave' },
            { id: 'Pizza', label: 'Horno / Pizza', type: 'lucide', icon: 'Pizza' },
            { id: 'Cake', label: 'Mesa Dulce / Torta', type: 'lucide', icon: 'Cake' },
            { id: 'Apple', label: 'Comida / Snack', type: 'lucide', icon: 'Apple' }
        ]
    },
    {
        id: 'water_relax',
        name: '🏊 Piscina & Relax',
        icons: [
            { id: 'Waves', label: 'Piscina / Pileta', type: 'lucide', icon: 'Waves' },
            { id: 'Sun', label: 'Solárium / Sol', type: 'lucide', icon: 'Sun' },
            { id: 'Bath', label: 'Jacuzzi / Bañera', type: 'lucide', icon: 'Bath' },
            { id: 'ShowerHead', label: 'Duchas / Vestuarios', type: 'lucide', icon: 'ShowerHead' },
            { id: 'Sparkles', label: 'Lujo / Premium', type: 'lucide', icon: 'Sparkles' },
            { id: 'Umbrella', label: 'Sombrillas / Reposeras', type: 'lucide', icon: 'Umbrella' },
            { id: 'LifeBuoy', label: 'Salvavidas / Seguro', type: 'lucide', icon: 'LifeBuoy' }
        ]
    },
    {
        id: 'party_music',
        name: '🎉 Fiesta & Música',
        icons: [
            { id: 'Speaker', label: 'Equipo de Sonido', type: 'lucide', icon: 'Speaker' },
            { id: 'Volume2', label: 'Audio / Parlante', type: 'lucide', icon: 'Volume2' },
            { id: 'Music', label: 'Música / DJ', type: 'lucide', icon: 'Music' },
            { id: 'PartyPopper', label: 'Fiesta / Cotillón', type: 'lucide', icon: 'PartyPopper' },
            { id: 'Mic2', label: 'Karaoke / Micrófono', type: 'lucide', icon: 'Mic2' },
            { id: 'Radio', label: 'Radio / FM', type: 'lucide', icon: 'Radio' },
            { id: 'Disc', label: 'Luces / DJ Deck', type: 'lucide', icon: 'Disc' },
            { id: 'Tv', label: 'Pantalla / Televisor', type: 'lucide', icon: 'Tv' },
            { id: 'Projector', label: 'Proyector / Cine', type: 'lucide', icon: 'Projector' }
        ]
    },
    {
        id: 'games_sports',
        name: '⚽ Juegos & Deportes',
        icons: [
            { id: 'Gamepad2', label: 'Zona Gamer / Play', type: 'lucide', icon: 'Gamepad2' },
            { id: 'Trophy', label: 'Cancha / Torneos', type: 'lucide', icon: 'Trophy' },
            { id: 'Dices', label: 'Juegos de Mesa', type: 'lucide', icon: 'Dices' },
            { id: 'Activity', label: 'Ping Pong / Deporte', type: 'lucide', icon: 'Activity' },
            { id: 'Bike', label: 'Bicicletas', type: 'lucide', icon: 'Bike' },
            { id: 'Dumbbell', label: 'Gimnasio', type: 'lucide', icon: 'Dumbbell' }
        ]
    },
    {
        id: 'outdoor_nature',
        name: '🌳 Parque & Aire Libre',
        icons: [
            { id: 'Trees', label: 'Parque / Arboleda', type: 'lucide', icon: 'Trees' },
            { id: 'TreePine', label: 'Bosque / Naturaleza', type: 'lucide', icon: 'TreePine' },
            { id: 'Flower2', label: 'Jardín Parquizado', type: 'lucide', icon: 'Flower2' },
            { id: 'Tent', label: 'Camping / Gazebo', type: 'lucide', icon: 'Tent' },
            { id: 'House', label: 'Quincho Techado', type: 'lucide', icon: 'House' },
            { id: 'Warehouse', label: 'Salón Grande', type: 'lucide', icon: 'Warehouse' },
            { id: 'Building2', label: 'Instalaciones', type: 'lucide', icon: 'Building2' }
        ]
    },
    {
        id: 'comfort_services',
        name: '❄️ Clima, Confort & Seguridad',
        icons: [
            { id: 'Snowflake', label: 'Aire Acondicionado', type: 'lucide', icon: 'Snowflake' },
            { id: 'Wind', label: 'Ventiladores', type: 'lucide', icon: 'Wind' },
            { id: 'Wifi', label: 'WiFi Alta Velocidad', type: 'lucide', icon: 'Wifi' },
            { id: 'Lightbulb', label: 'Iluminación LED', type: 'lucide', icon: 'Lightbulb' },
            { id: 'Lamp', label: 'Luces Cálidas', type: 'lucide', icon: 'Lamp' },
            { id: 'Armchair', label: 'Living / Sillones', type: 'lucide', icon: 'Armchair' },
            { id: 'Bed', label: 'Habitación / Camas', type: 'lucide', icon: 'Bed' },
            { id: 'Car', label: 'Estacionamiento', type: 'lucide', icon: 'Car' },
            { id: 'ShieldCheck', label: 'Seguridad Privada', type: 'lucide', icon: 'ShieldCheck' },
            { id: 'Lock', label: 'Predio Cerrado', type: 'lucide', icon: 'Lock' },
            { id: 'Key', label: 'Acceso Privado', type: 'lucide', icon: 'Key' },
            { id: 'Plug', label: 'Grupo Electrógeno', type: 'lucide', icon: 'Plug' },
            { id: 'Zap', label: 'Tomas 220v / Corriente', type: 'lucide', icon: 'Zap' },
            { id: 'Accessibility', label: 'Rampa Accesible', type: 'lucide', icon: 'Accessibility' }
        ]
    },
    {
        id: 'kids_family',
        name: '🧸 Niños & Familia',
        icons: [
            { id: 'Baby', label: 'Juegos Infantiles', type: 'lucide', icon: 'Baby' },
            { id: 'Smile', label: 'Animación / Inflable', type: 'lucide', icon: 'Smile' },
            { id: 'Dog', label: 'Pet Friendly', type: 'lucide', icon: 'Dog' },
            { id: 'Heart', label: 'Apto Todo Público', type: 'lucide', icon: 'Heart' },
            { id: 'Users', label: 'Gran Capacidad', type: 'lucide', icon: 'Users' }
        ]
    }
];

// Helper to safely parse any amenity format (object, JSON string, or simple text)
export function parseAmenity(amenity) {
    if (!amenity) return { name: '', icon: '' };
    if (typeof amenity === 'object' && amenity !== null) {
        return {
            name: amenity.name || amenity.label || '',
            icon: amenity.icon || '✨'
        };
    }
    if (typeof amenity === 'string') {
        const trimmed = amenity.trim();
        if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
            try {
                const parsed = JSON.parse(trimmed);
                if (parsed && typeof parsed === 'object') {
                    return {
                        name: parsed.name || parsed.label || trimmed,
                        icon: parsed.icon || '✨'
                    };
                }
            } catch (e) {
                // Not valid json, continue as text
            }
        }
        return { name: trimmed, icon: '' };
    }
    return { name: String(amenity), icon: '' };
}

const EMOJI_TO_LUCIDE = {
    '🏊': 'Waves',
    '🔥': 'Flame',
    '🏠': 'House',
    '📶': 'Wifi',
    '❄️': 'Snowflake',
    '🚗': 'Car',
    '🔊': 'Speaker',
    '🍳': 'ChefHat',
    '🎮': 'Gamepad2',
    '🎱': 'Dices',
    '⚽': 'Trophy',
    '🏓': 'Activity',
    '📺': 'Tv',
    '💡': 'Lightbulb',
    '🌳': 'Trees',
    '🚿': 'ShowerHead',
    '🧊': 'Refrigerator',
    '🧸': 'Baby',
    '✨': 'Sparkles',
    '🥩': 'Flame',
    '🍸': 'Wine',
    '🍺': 'Beer',
    '🍻': 'Beer',
    '🎯': 'Target',
    '🎪': 'Tent',
    '🪑': 'Armchair',
    '⛱️': 'Umbrella',
    '🎵': 'Music',
    '🛁': 'Bath',
    '🔌': 'Plug',
    '👶': 'Baby',
    '🐕': 'Dog',
    '🐶': 'Dog',
    '🐎': 'Trophy',
    '☕': 'Coffee',
    '🔒': 'Lock',
    '🛡️': 'ShieldCheck'
};

// Helper to render an amenity icon strictly using modern Lucide vector icons
export default function AmenityIcon({ icon, size = 18, style = {}, className = '' }) {
    let iconName = icon;

    if (icon && typeof icon === 'string' && EMOJI_TO_LUCIDE[icon]) {
        iconName = EMOJI_TO_LUCIDE[icon];
    }

    if (iconName && typeof iconName === 'string' && LucideIcons[iconName]) {
        const IconComponent = LucideIcons[iconName];
        return <IconComponent size={size} style={{ display: 'inline-block', verticalAlign: 'middle', strokeWidth: 2, ...style }} className={className} />;
    }

    return <LucideIcons.Sparkles size={size} style={{ display: 'inline-block', verticalAlign: 'middle', strokeWidth: 2, ...style }} className={className} />;
}

// Interactive Icon Picker Modal
export function IconPickerModal({ isOpen, onClose, onSelect, currentIcon }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');

    if (!isOpen) return null;

    const allIcons = AMENITY_ICON_CATEGORIES.flatMap(cat => cat.icons.map(i => ({ ...i, category: cat.id })));

    const filteredIcons = allIcons.filter(item => {
        const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
        const matchesSearch = item.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.icon.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            backgroundColor: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
        }}>
            <div style={{
                background: 'var(--bg-card, #1E293B)',
                borderRadius: '20px',
                width: '100%',
                maxWidth: '560px',
                maxHeight: '85vh',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
                border: '1px solid var(--border, rgba(255,255,255,0.1))',
                overflow: 'hidden'
            }}>
                {/* Header */}
                <div style={{
                    padding: '18px 20px',
                    borderBottom: '1px solid var(--border, rgba(255,255,255,0.1))',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '800', color: 'var(--text-primary, #F8FAFC)' }}>
                            🎨 Seleccionar Ícono para Comodidad
                        </h3>
                        <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--text-secondary, #94A3B8)' }}>
                            Elige entre más de 60 íconos vectoriales modernos
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'rgba(255,255,255,0.06)',
                            border: 'none',
                            borderRadius: '10px',
                            width: '32px',
                            height: '32px',
                            cursor: 'pointer',
                            color: 'var(--text-secondary, #94A3B8)',
                            fontSize: '16px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        ✕
                    </button>
                </div>

                {/* Search Bar */}
                <div style={{ padding: '14px 20px 8px' }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        background: 'var(--bg-main, #0F172A)',
                        border: '1px solid var(--border, rgba(255,255,255,0.15))',
                        borderRadius: '12px',
                        padding: '10px 14px'
                    }}>
                        <LucideIcons.Search size={16} color="var(--text-secondary, #94A3B8)" />
                        <input
                            type="text"
                            placeholder="Buscar ícono (ej: pileta, fuego, música, aire, quincho)..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                outline: 'none',
                                color: 'var(--text-primary, #F8FAFC)',
                                fontSize: '13px',
                                width: '100%'
                            }}
                            autoFocus
                        />
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm('')}
                                style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', fontSize: '12px' }}
                            >
                                ✕
                            </button>
                        )}
                    </div>
                </div>

                {/* Category Pills */}
                <div style={{
                    display: 'flex',
                    gap: '6px',
                    overflowX: 'auto',
                    padding: '8px 20px',
                    scrollbarWidth: 'none'
                }}>
                    <button
                        onClick={() => setSelectedCategory('all')}
                        style={{
                            padding: '6px 12px',
                            borderRadius: '20px',
                            border: selectedCategory === 'all' ? '1px solid var(--primary-paddle, #84CC16)' : '1px solid var(--border, rgba(255,255,255,0.1))',
                            background: selectedCategory === 'all' ? 'rgba(132, 204, 22, 0.2)' : 'var(--bg-main, #0F172A)',
                            color: selectedCategory === 'all' ? 'var(--primary-paddle, #84CC16)' : 'var(--text-secondary, #94A3B8)',
                            fontSize: '12px',
                            fontWeight: '600',
                            whiteSpace: 'nowrap',
                            cursor: 'pointer'
                        }}
                    >
                        Todos ({allIcons.length})
                    </button>
                    {AMENITY_ICON_CATEGORIES.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => setSelectedCategory(cat.id)}
                            style={{
                                padding: '6px 12px',
                                borderRadius: '20px',
                                border: selectedCategory === cat.id ? '1px solid var(--primary-paddle, #84CC16)' : '1px solid var(--border, rgba(255,255,255,0.1))',
                                background: selectedCategory === cat.id ? 'rgba(132, 204, 22, 0.2)' : 'var(--bg-main, #0F172A)',
                                color: selectedCategory === cat.id ? 'var(--primary-paddle, #84CC16)' : 'var(--text-secondary, #94A3B8)',
                                fontSize: '12px',
                                fontWeight: '600',
                                whiteSpace: 'nowrap',
                                cursor: 'pointer'
                            }}
                        >
                            {cat.name}
                        </button>
                    ))}
                </div>

                {/* Icons Grid */}
                <div style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '12px 20px 20px',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
                    gap: '10px',
                    maxHeight: '380px'
                }}>
                    {filteredIcons.map((item, idx) => {
                        const isSelected = currentIcon === item.icon;
                        return (
                            <button
                                key={idx}
                                onClick={() => {
                                    onSelect(item.icon);
                                    onClose();
                                }}
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    padding: '12px 6px',
                                    borderRadius: '14px',
                                    border: isSelected ? '2px solid var(--primary-paddle, #84CC16)' : '1px solid var(--border, rgba(255,255,255,0.08))',
                                    background: isSelected ? 'rgba(132, 204, 22, 0.15)' : 'var(--bg-main, #0F172A)',
                                    color: isSelected ? 'var(--primary-paddle, #84CC16)' : 'var(--text-primary, #F8FAFC)',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease'
                                }}
                                title={item.label}
                            >
                                <AmenityIcon icon={item.icon} size={22} />
                                <span style={{
                                    fontSize: '10px',
                                    fontWeight: '600',
                                    textAlign: 'center',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    maxWidth: '100%',
                                    color: 'var(--text-secondary, #94A3B8)'
                                }}>
                                    {item.label}
                                </span>
                            </button>
                        );
                    })}

                    {filteredIcons.length === 0 && (
                        <div style={{
                            gridColumn: '1 / -1',
                            textAlign: 'center',
                            padding: '40px 20px',
                            color: 'var(--text-secondary, #94A3B8)',
                            fontSize: '13px'
                        }}>
                            No se encontraron íconos para "{searchTerm}".
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
