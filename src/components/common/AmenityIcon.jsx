import React, { useState } from 'react';
import {
    Flame, Utensils, ChefHat, Wine, Beer, GlassWater, Coffee, Refrigerator, Microwave, Pizza, Cake, Apple,
    Waves, Sun, Bath, ShowerHead, Sparkles, Umbrella, LifeBuoy,
    Speaker, Volume2, Music, PartyPopper, Mic2, Radio, Disc, Tv, Projector,
    Gamepad2, Trophy, Dices, Activity, Bike, Dumbbell,
    Trees, TreePine, Flower2, Tent, House, Warehouse, Building2,
    Snowflake, Wind, Wifi, Lightbulb, Lamp, Armchair, Bed, Car, ShieldCheck, Lock, Key, Plug, Zap, Accessibility,
    Baby, Smile, Dog, Heart, Users, Target, Search
} from 'lucide-react';

const LucideIcons = {
    Flame, Utensils, ChefHat, Wine, Beer, GlassWater, Coffee, Refrigerator, Microwave, Pizza, Cake, Apple,
    Waves, Sun, Bath, ShowerHead, Sparkles, Umbrella, LifeBuoy,
    Speaker, Volume2, Music, PartyPopper, Mic2, Radio, Disc, Tv, Projector,
    Gamepad2, Trophy, Dices, Activity, Bike, Dumbbell,
    Trees, TreePine, Flower2, Tent, House, Warehouse, Building2,
    Snowflake, Wind, Wifi, Lightbulb, Lamp, Armchair, Bed, Car, ShieldCheck, Lock, Key, Plug, Zap, Accessibility,
    Baby, Smile, Dog, Heart, Users, Target, Search
};

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
// Comprehensive Colorful Emoji Categories for Additional Services
export const SERVICE_EMOJI_CATEGORIES = [
    {
        id: 'cleaning_staff',
        name: '🧹 Limpieza & Personal',
        emojis: [
            { emoji: '🧹', label: 'Limpieza / Escoba' },
            { emoji: '🧼', label: 'Jabón / Desinfección' },
            { emoji: '🧽', label: 'Esponja / Lavado' },
            { emoji: '🧺', label: 'Lavandería / Blancos' },
            { emoji: '🪣', label: 'Balde / Limpieza Profunda' },
            { emoji: '🧤', label: 'Guantes' },
            { emoji: '🧑‍🍳', label: 'Chef / Cocinero' },
            { emoji: '👨‍🍳', label: 'Parrillero / Asador' },
            { emoji: '🧑‍💼', label: 'Mozo / Atención' },
            { emoji: '👮', label: 'Seguridad / Guardia' },
            { emoji: '🛡️', label: 'Control de Ingreso' },
            { emoji: '🚗', label: 'Valet Parking' }
        ]
    },
    {
        id: 'music_lights',
        name: '🎧 Sonido, DJ & Luces',
        emojis: [
            { emoji: '🎧', label: 'DJ / Auriculares' },
            { emoji: '🔊', label: 'Parlante / Sonido' },
            { emoji: '🔈', label: 'Audio Ambiental' },
            { emoji: '🎙️', label: 'Micrófono / Karaoke' },
            { emoji: '🎤', label: 'Animación / Conducción' },
            { emoji: '🪩', label: 'Bola de Boliche / Espejos' },
            { emoji: '💡', label: 'Iluminación LED' },
            { emoji: '🏮', label: 'Guirnalda de Luces' },
            { emoji: '🔦', label: 'Luces Robóticas / Láser' },
            { emoji: '🎸', label: 'Banda en Vivo / Guitarra' },
            { emoji: '🎹', label: 'Teclado / Música' },
            { emoji: '🥁', label: 'Batería / Show' },
            { emoji: '🎷', label: 'Saxofón / Jazz' },
            { emoji: '📻', label: 'Radio / Streaming' },
            { emoji: '📽️', label: 'Proyector / Pantalla Gigante' },
            { emoji: '📺', label: 'Pantalla Smart TV' },
            { emoji: '📸', label: 'Cabina de Fotos / Fotocabina' },
            { emoji: '📷', label: 'Fotógrafo Profesional' },
            { emoji: '🎥', label: 'Video / Drone' }
        ]
    },
    {
        id: 'food_grill',
        name: '🥩 Asado & Gastronomía',
        emojis: [
            { emoji: '🥩', label: 'Asado / Carne' },
            { emoji: '🍖', label: 'Costillar / Estaca' },
            { emoji: '🍗', label: 'Pollo al Disco' },
            { emoji: '🥓', label: 'Choripán / Achuras' },
            { emoji: '🍔', label: 'Hamburguesas' },
            { emoji: '🌭', label: 'Panchos' },
            { emoji: '🍕', label: 'Pizza Party' },
            { emoji: '🥪', label: 'Sandwiches de Miga' },
            { emoji: '🌮', label: 'Tacos / Pernil' },
            { emoji: '🥘', label: 'Paella / Cazuela' },
            { emoji: '🍲', label: 'Guiso / Locro' },
            { emoji: '🥗', label: 'Ensaladas / Buffet' },
            { emoji: '🍿', label: 'Pochoclos / Popcorn' },
            { emoji: '🍽️', label: 'Vajilla & Cubiertos' },
            { emoji: '🔪', label: 'Tabla de Asado' },
            { emoji: '🪵', label: 'Leña / Carbón Incluido' }
        ]
    },
    {
        id: 'drinks_bar',
        name: '🍷 Barra & Bebidas',
        emojis: [
            { emoji: '🧊', label: 'Hielo / Hielera' },
            { emoji: '🍷', label: 'Vino / Copa' },
            { emoji: '🍸', label: 'Barra de Tragos' },
            { emoji: '🍹', label: 'Cocktails / Bartender' },
            { emoji: '🍺', label: 'Chopera de Cerveza' },
            { emoji: '🍻', label: 'Cerveza Artesanal' },
            { emoji: '🥂', label: 'Brindis / Champagne' },
            { emoji: '🍾', label: 'Champagne / Espumante' },
            { emoji: '🥤', label: 'Gaseosas / Bebidas Libres' },
            { emoji: '🧃', label: 'Jugos Naturales' },
            { emoji: '🧉', label: 'Kit de Mate' },
            { emoji: '☕', label: 'Café & Té' },
            { emoji: '🫖', label: 'Mesa de Té' },
            { emoji: '🥛', label: 'Leche Chocolatada' }
        ]
    },
    {
        id: 'party_decor',
        name: '🎈 Decoración & Fiesta',
        emojis: [
            { emoji: '🎈', label: 'Globos / Arco Orgánico' },
            { emoji: '🎉', label: 'Cotillón / Serpentina' },
            { emoji: '🎊', label: 'Lluvia de Papelitos' },
            { emoji: '🪅', label: 'Piñata' },
            { emoji: '🎁', label: 'Mesa de Regalos' },
            { emoji: '🎆', label: 'Fuegos Artificiales Fríos' },
            { emoji: '🎇', label: 'Bengalas de Humo' },
            { emoji: '🎪', label: 'Gazebo / Carpa' },
            { emoji: '🪄', label: 'Show de Magia' },
            { emoji: '👑', label: 'Corona / Quinceañera' },
            { emoji: '🥳', label: 'Animación Infantil' },
            { emoji: '🎨', label: 'Glitter Bar / Maquillaje' },
            { emoji: '✨', label: 'Efectos Especiales / Humo' }
        ]
    },
    {
        id: 'games_fun',
        name: '🏰 Juegos, Inflables & Relax',
        emojis: [
            { emoji: '🏰', label: 'Castillo Inflable' },
            { emoji: '🛝', label: 'Plaza Blanda / Tobogán' },
            { emoji: '🧸', label: 'Juegos para Bebés' },
            { emoji: '⚽', label: 'Cancha de Fútbol' },
            { emoji: '🏓', label: 'Mesa de Ping Pong' },
            { emoji: '🎱', label: 'Mesa de Pool' },
            { emoji: '🎯', label: 'Diana / Dardos' },
            { emoji: '🎮', label: 'Consola Play / Arcade' },
            { emoji: '🕹️', label: 'Fichines / Metegol' },
            { emoji: '🎲', label: 'Juegos de Mesa' },
            { emoji: '🏊', label: 'Inflables de Pileta' },
            { emoji: '⛱️', label: 'Reposeras & Sombrillas' },
            { emoji: '🛏️', label: 'Habitación / Descanso' }
        ]
    },
    {
        id: 'sweet_bakery',
        name: '🍰 Mesa Dulce & Postres',
        emojis: [
            { emoji: '🎂', label: 'Torta de Cumpleaños' },
            { emoji: '🍰', label: 'Mesa Dulce / Tartas' },
            { emoji: '🧁', label: 'Cupcakes / Muffins' },
            { emoji: '🍨', label: 'Helados / Paletas' },
            { emoji: '🍦', label: 'Cascada de Chocolate' },
            { emoji: '🍩', label: 'Donas' },
            { emoji: '🍪', label: 'Cookies Personalizadas' },
            { emoji: '🍫', label: 'Chocolatería' },
            { emoji: '🍬', label: 'Candy Bar' },
            { emoji: '🍭', label: 'Chupetines' },
            { emoji: '🥞', label: 'Panqueques / Waffles' },
            { emoji: '🍓', label: 'Frutas de Estación' }
        ]
    }
];

export const LUCIDE_TO_COLORFUL_EMOJI = {
    'Heart': '❤️',
    'PartyPopper': '🎉',
    'Sparkles': '✨',
    'Flame': '🔥',
    'Music': '🎧',
    'Utensils': '🍽️',
    'ChefHat': '👨‍🍳',
    'Wine': '🍷',
    'Beer': '🍺',
    'GlassWater': '🧊',
    'Coffee': '☕',
    'Refrigerator': '🧊',
    'Microwave': '🍕',
    'Pizza': '🍕',
    'Cake': '🎂',
    'Apple': '🍎',
    'Waves': '🏊',
    'Sun': '☀️',
    'Bath': '🛁',
    'ShowerHead': '🚿',
    'Umbrella': '⛱️',
    'LifeBuoy': '🛟',
    'Speaker': '🔊',
    'Volume2': '🔊',
    'Mic2': '🎤',
    'Radio': '📻',
    'Disc': '🪩',
    'Tv': '📺',
    'Projector': '📽️',
    'Gamepad2': '🏰',
    'Trophy': '🏆',
    'Dices': '🎲',
    'Activity': '🏓',
    'Bike': '🚴',
    'Dumbbell': '🏋️',
    'Trees': '🌳',
    'TreePine': '🌲',
    'Flower2': '🌺',
    'Wifi': '📶',
    'Snowflake': '❄️',
    'Car': '🚗',
    'Baby': '🧸',
    'Lightbulb': '💡',
    'House': '🏠',
    'ShieldCheck': '🛡️',
    'Lock': '🔒'
};

// Helper to render an amenity or service icon
// - Comodidades (Amenities): STRICTLY modern vector Lucide icons
// - Servicios Adicionales (Additional Services): STRICTLY native colorful emojis
export default function AmenityIcon({ icon, preferEmoji = false, size = 18, style = {}, className = '' }) {
    if (!icon) {
        return preferEmoji ? (
            <span style={{ fontSize: `${size}px`, lineHeight: 1, ...style }}>✨</span>
        ) : (
            <LucideIcons.Sparkles size={size} style={{ display: 'inline-block', verticalAlign: 'middle', strokeWidth: 2, ...style }} className={className} />
        );
    }

    // MODE 1: ADDITIONAL SERVICES (preferEmoji = true) -> 100% Native Colorful Emoji
    if (preferEmoji) {
        const emoji = LUCIDE_TO_COLORFUL_EMOJI[icon] || icon;
        return (
            <span
                className={className}
                style={{
                    fontSize: `${size}px`,
                    lineHeight: 1,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    verticalAlign: 'middle',
                    userSelect: 'none',
                    ...style
                }}
            >
                {emoji}
            </span>
        );
    }

    // MODE 2: COMODIDADES / AMENITIES (preferEmoji = false) -> 100% Modern Lucide Vector Icon
    let lucideName = icon;
    if (typeof icon === 'string' && EMOJI_TO_LUCIDE[icon]) {
        lucideName = EMOJI_TO_LUCIDE[icon];
    }

    if (typeof lucideName === 'string' && LucideIcons[lucideName]) {
        const IconComponent = LucideIcons[lucideName];
        return <IconComponent size={size} style={{ display: 'inline-block', verticalAlign: 'middle', strokeWidth: 2, ...style }} className={className} />;
    }

    // Default fallback vector icon for amenities
    return <LucideIcons.Sparkles size={size} style={{ display: 'inline-block', verticalAlign: 'middle', strokeWidth: 2, ...style }} className={className} />;
}

// Interactive Colorful Emoji Picker Modal for Additional Services
export function EmojiPickerModal({ isOpen, onClose, onSelect, onSelectIcon, currentIcon, selectedIcon, title = '🎨 Elegir Ícono para el Servicio' }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [customInput, setCustomInput] = useState('');

    if (!isOpen) return null;

    const handleSelect = onSelect || onSelectIcon || (() => {});
    const activeIcon = currentIcon || selectedIcon;

    const allEmojis = SERVICE_EMOJI_CATEGORIES.flatMap(cat => cat.emojis.map(e => ({ ...e, category: cat.id })));

    const filteredEmojis = allEmojis.filter(item => {
        const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
        const matchesSearch = item.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.emoji.includes(searchTerm);
        return matchesCategory && matchesSearch;
    });

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            backgroundColor: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
        }}>
            <div style={{
                background: 'var(--bg-card, #1E293B)',
                borderRadius: '20px',
                width: '100%',
                maxWidth: '580px',
                maxHeight: '88vh',
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
                            {title}
                        </h3>
                        <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--text-secondary, #94A3B8)' }}>
                            Selecciona un ícono a color o escribe cualquier emoji personalizado
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

                {/* Custom Emoji Input + Search Bar */}
                <div style={{ padding: '14px 20px 8px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
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
                            placeholder="Buscar ícono (ej: asado, dj, inflable, limpieza, barra, torta)..."
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

                    {/* Or type custom emoji directly */}
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <input
                            type="text"
                            placeholder="O pega / escribe cualquier emoji aquí (ej: 🎆, 🎷, 🎪)..."
                            value={customInput}
                            onChange={(e) => setCustomInput(e.target.value)}
                            style={{
                                flex: 1,
                                padding: '8px 12px',
                                borderRadius: '10px',
                                border: '1px dashed var(--border, rgba(255,255,255,0.2))',
                                background: 'var(--bg-main, #0F172A)',
                                color: 'var(--text-primary, #F8FAFC)',
                                fontSize: '13px'
                            }}
                        />
                        <button
                            type="button"
                            onClick={() => {
                                if (customInput.trim()) {
                                    handleSelect(customInput.trim());
                                    onClose();
                                }
                            }}
                            disabled={!customInput.trim()}
                            style={{
                                padding: '8px 14px',
                                borderRadius: '10px',
                                border: 'none',
                                background: customInput.trim() ? 'var(--primary-paddle, #84CC16)' : 'rgba(255,255,255,0.1)',
                                color: customInput.trim() ? '#000' : 'var(--text-secondary, #94A3B8)',
                                fontSize: '12px',
                                fontWeight: '700',
                                cursor: customInput.trim() ? 'pointer' : 'default'
                            }}
                        >
                            Usar Este
                        </button>
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
                        Todos ({allEmojis.length})
                    </button>
                    {SERVICE_EMOJI_CATEGORIES.map(cat => (
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

                {/* Emojis Grid */}
                <div style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '12px 20px 20px',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(76px, 1fr))',
                    gap: '10px',
                    maxHeight: '380px'
                }}>
                    {filteredEmojis.map((item, idx) => {
                        const isSelected = activeIcon === item.emoji;
                        return (
                            <button
                                key={idx}
                                onClick={() => {
                                    handleSelect(item.emoji);
                                    onClose();
                                }}
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '6px',
                                    padding: '10px 4px',
                                    borderRadius: '14px',
                                    border: isSelected ? '2px solid var(--primary-paddle, #84CC16)' : '1px solid var(--border, rgba(255,255,255,0.1))',
                                    background: isSelected ? 'rgba(132, 204, 22, 0.15)' : 'var(--bg-main, #0F172A)',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease'
                                }}
                                title={item.label}
                            >
                                <span style={{ fontSize: '26px', lineHeight: 1 }}>{item.emoji}</span>
                                <span style={{
                                    fontSize: '10px',
                                    fontWeight: '600',
                                    color: isSelected ? 'var(--primary-paddle, #84CC16)' : 'var(--text-secondary, #94A3B8)',
                                    textAlign: 'center',
                                    lineHeight: '1.2',
                                    maxWidth: '100%',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                }}>
                                    {item.label.split('/')[0].trim()}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

// Interactive Lucide Icon Picker Modal for Main Amenities
export function IconPickerModal({ isOpen, onClose, onSelect, onSelectIcon, currentIcon, selectedIcon, title = '🎨 Seleccionar Ícono para Comodidad' }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');

    if (!isOpen) return null;

    const handleSelect = onSelect || onSelectIcon || (() => {});
    const activeIcon = currentIcon || selectedIcon;

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
                            {title}
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
                        const isSelected = activeIcon === item.icon;
                        return (
                            <button
                                key={idx}
                                onClick={() => {
                                    handleSelect(item.icon);
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
