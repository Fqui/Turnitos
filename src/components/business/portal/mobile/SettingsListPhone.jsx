import React from 'react';
import {
    MapPin, Palette, Clock, CalendarDays, Users, Sparkles, Car, KeyRound,
    ShoppingBag, Tag, ShieldCheck, Images, Link2, Armchair, ChevronRight, ChevronLeft
} from 'lucide-react';

const ICONS = {
    general: MapPin,
    appearance: Palette,
    schedule: Clock,
    special_days: CalendarDays,
    subscription: Users,
    services: Sparkles,
    home_service: Car,
    rental: KeyRound,
    store: ShoppingBag,
    coupons: Tag,
    policies_and_payments: ShieldCheck,
    gallery: Images,
    linkbio: Link2,
    amenities: Armchair
};

const GROUPS = [
    { title: 'Tu negocio', ids: ['general', 'appearance', 'schedule', 'special_days'] },
    { title: 'Lo que ofrecés', ids: ['subscription', 'services', 'home_service', 'rental', 'store', 'coupons'] },
    { title: 'Cobros', ids: ['policies_and_payments'] },
    { title: 'Tu vidriera', ids: ['gallery', 'linkbio', 'amenities'] }
];

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

const parseObj = (v) => {
    if (typeof v !== 'string') return v;
    try { return JSON.parse(v); } catch { return null; }
};

// Short summaries only where the data is at hand; the rest stay without one
export function settingsSummary(id, data) {
    const meta = data?.metadata || {};
    switch (id) {
        case 'general':
            return data?.address || '';
        case 'appearance':
            return 'Logo, portada y colores';
        case 'schedule': {
            const hours = parseObj(data?.hours);
            if (!hours || typeof hours !== 'object') return '';
            const open = Object.values(hours).filter(d => d && typeof d === 'object' && d.isOpen !== false && d.open).length;
            return open ? `Abierto ${plural(open, 'día', 'días')} por semana` : '';
        }
        case 'subscription': {
            const specs = data?.specialists?.length || 0;
            const courts = data?.courts?.length || 0;
            if (specs) return plural(specs, 'profesional', 'profesionales');
            if (courts) return plural(courts, 'cancha', 'canchas');
            return '';
        }
        case 'services':
            return data?.services?.length ? plural(data.services.length, 'servicio', 'servicios') : 'Todavía no cargaste servicios';
        case 'store': {
            const products = meta.store_products?.length || 0;
            if (data?.store_enabled === false) return 'Desactivada';
            return products ? plural(products, 'producto', 'productos') : '';
        }
        case 'coupons': {
            const coupons = data?.coupons || meta.coupons || [];
            return coupons.length ? plural(coupons.length, 'cupón', 'cupones') : 'Sin cupones';
        }
        case 'policies_and_payments':
            return 'Seña, cancelaciones y medios de pago';
        case 'amenities': {
            const list = data?.amenities || meta.amenities || [];
            return Array.isArray(list) && list.length ? plural(list.length, 'comodidad', 'comodidades') : '';
        }
        case 'linkbio':
            return 'Botones de tu link para redes';
        default:
            return '';
    }
}

// Ajustes en celular: lista agrupada por tema; cada fila abre su sección
export default function SettingsListPhone({ tabs, formData, onOpen }) {
    const byId = Object.fromEntries(tabs.map(t => [t.id, t]));
    return (
        <div className="pm-stack">
            <div>
                <h2 className="pm-h2">Ajustes</h2>
                <p className="pm-sub">Personalizá tu página y las reglas de tu negocio</p>
            </div>
            {GROUPS.map(group => {
                const items = group.ids.map(id => byId[id]).filter(Boolean);
                if (items.length === 0) return null;
                return (
                    <section key={group.title} className="pm-set-group">
                        <h3 className="pm-sec-label">{group.title}</h3>
                        <div className="pm-group">
                            {items.map(tab => {
                                const Icon = ICONS[tab.id] || Sparkles;
                                const summary = settingsSummary(tab.id, formData);
                                return (
                                    <button key={tab.id} type="button" className="pm-item" onClick={() => onOpen(tab.id)}>
                                        <span className="pm-item-ic"><Icon size={20} aria-hidden="true" /></span>
                                        <span className="pm-item-tx">
                                            <b>{tab.label}</b>
                                            {summary && <span>{summary}</span>}
                                        </span>
                                        <ChevronRight size={18} className="pm-item-chev" aria-hidden="true" />
                                    </button>
                                );
                            })}
                        </div>
                    </section>
                );
            })}
        </div>
    );
}

export function SettingsBackButton({ onClick }) {
    return (
        <button type="button" className="pm-back" onClick={onClick}>
            <ChevronLeft size={20} aria-hidden="true" /> Ajustes
        </button>
    );
}
