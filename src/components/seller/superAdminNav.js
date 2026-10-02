import { LayoutDashboard, Store, Users, CalendarCheck, Star, Megaphone, FolderTree } from 'lucide-react';

export const SUPERADMIN_NAV = [
    {
        label: 'General',
        items: [
            { id: 'overview', label: 'Dashboard', icon: LayoutDashboard, description: 'Resumen de la plataforma' }
        ]
    },
    {
        label: 'Clientes',
        items: [
            { id: 'businesses', label: 'Negocios', icon: Store, description: 'Negocios, suscripciones y accesos' },
            { id: 'sellers', label: 'Vendedores', icon: Users, description: 'Red comercial y comisiones' }
        ]
    },
    {
        label: 'Actividad',
        items: [
            { id: 'bookings', label: 'Reservas', icon: CalendarCheck, description: 'Reservas de todos los negocios' },
            { id: 'reviews', label: 'Reseñas', icon: Star, description: 'Pedidos de reseña y opiniones' }
        ]
    },
    {
        label: 'Contenido',
        items: [
            { id: 'promotions', label: 'Publicidades', icon: Megaphone, description: 'Banners de la portada' },
            { id: 'categories', label: 'Categorías', icon: FolderTree, description: 'Rubros y subcategorías' }
        ]
    }
];
