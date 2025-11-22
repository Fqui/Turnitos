export const categories = [
    { id: 'paddle', name: 'Padel', icon: '🎾', color: '#00E676' },
    { id: 'football', name: 'Fútbol', icon: '⚽', color: '#2979FF' },
    { id: 'beauty', name: 'Belleza', icon: '💇‍♀️', color: '#FF4081' },
    { id: 'health', name: 'Salud', icon: '🩺', color: '#00B0FF' },
    { id: 'other', name: 'Otros', icon: '📅', color: '#FFC107' }
];

export const businesses = [
    {
        id: 'club-padel-central',
        name: 'Club Padel Central',
        category: 'paddle', // Updated category
        type: 'sport',
        image: 'https://images.unsplash.com/photo-1626248596308-25297c2338c3?auto=format&fit=crop&q=80&w=1000',
        location: 'Av. Principal 123, La Rioja',
        rating: 4.8,
        theme: 'dark',
        amenities: ['Wifi', 'Estacionamiento', 'Vestuarios', 'Bar'],
        hours: 'Lunes a Domingo: 08:00 - 00:00',
        sportTypes: ['paddle', 'football'],
        courts: [
            { id: 1, name: 'Cancha 1 (Cristal)', sport: 'paddle', price: 22000 },
            { id: 2, name: 'Cancha 2 (Muro)', sport: 'paddle', price: 20000 },
            { id: 3, name: 'Fútbol 5', sport: 'football', price: 35000 }
        ]
    },
    {
        id: 'estetica-glow',
        name: 'Glow Estética Integral',
        category: 'beauty',
        type: 'service', // Triggers ServiceSelector flow
        banner: 'https://images.unsplash.com/photo-1600948836101-f9ffda59d250?auto=format&fit=crop&q=80&w=1000', // Spa interior
        logo: 'https://images.unsplash.com/photo-1522337660859-02fbefca4702?auto=format&fit=crop&q=80&w=200', // Abstract beauty logo
        image: 'https://images.unsplash.com/photo-1600948836101-f9ffda59d250?auto=format&fit=crop&q=80&w=1000', // Fallback/Main image
        location: 'San Martín 450, La Rioja',
        rating: 4.9,
        theme: 'light',
        amenities: ['Wifi', 'Aire Acondicionado', 'Café de Cortesía'],
        hours: 'Lunes a Sábado: 09:00 - 20:00',
        services: [
            {
                id: 's1',
                name: 'Limpieza Facial Profunda',
                duration: 60,
                price: 15000,
                image: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&q=80&w=400',
                description: 'Tratamiento completo para renovar tu piel, eliminando impurezas y células muertas.'
            },
            {
                id: 's2',
                name: 'Masaje Relajante',
                duration: 45,
                price: 12000,
                image: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&q=80&w=400',
                description: 'Técnica suave para liberar tensiones y reducir el estrés acumulado.'
            },
            {
                id: 's3',
                name: 'Manicuría Semipermanente',
                duration: 90,
                price: 8000,
                image: 'https://images.unsplash.com/photo-1632345031435-8727f6897d53?auto=format&fit=crop&q=80&w=400',
                description: 'Esmaltado de larga duración con acabado perfecto y cuidado de cutículas.'
            }
        ]
    },
    {
        id: 'barberia-vikingos',
        name: 'Vikingos Barber Shop',
        category: 'beauty',
        type: 'service',
        banner: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&q=80&w=1000', // Barber shop interior
        logo: 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&q=80&w=200', // Barber logo
        image: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&q=80&w=1000',
        location: 'Pelagio B. Luna 880, La Rioja',
        rating: 4.7,
        theme: 'dark', // Barber shops often look good in dark mode too
        amenities: ['Wifi', 'Bebidas', 'TV', 'PlayStation'],
        hours: 'Martes a Sábado: 10:00 - 22:00',
        services: [
            {
                id: 'b1',
                name: 'Corte Clásico',
                duration: 30,
                price: 6000,
                image: 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?auto=format&fit=crop&q=80&w=400',
                description: 'Corte de cabello tradicional con tijera y máquina, acabado con navaja.'
            },
            {
                id: 'b2',
                name: 'Barba y Toalla Caliente',
                duration: 30,
                price: 5000,
                image: 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&q=80&w=400',
                description: 'Perfilado de barba con ritual de toalla caliente y aceites esenciales.'
            },
            {
                id: 'b3',
                name: 'Servicio Completo',
                duration: 60,
                price: 10000,
                image: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&q=80&w=400',
                description: 'Experiencia total: Corte de cabello + Barba + Masaje capilar.'
            }
        ]
    },
    {
        id: 'clinica-san-lucas',
        name: 'Consultorios San Lucas',
        category: 'health',
        type: 'service',
        image: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&q=80&w=1000',
        location: 'Buenos Aires 200, La Rioja',
        rating: 4.5,
        theme: 'light',
        amenities: ['Wifi', 'Sala de Espera', 'Estacionamiento'],
        hours: 'Lunes a Viernes: 08:00 - 20:00',
        services: [
            { id: 'm1', name: 'Consulta Clínica Médica', duration: 20, price: 8000 },
            { id: 'm2', name: 'Pediatría', duration: 20, price: 8000 },
            { id: 'm3', name: 'Nutrición', duration: 30, price: 7000 }
        ]
    },
    {
        id: 'complejo-golazo',
        name: 'Complejo El Golazo',
        category: 'football',
        type: 'sport',
        image: 'https://images.unsplash.com/photo-1579952363873-27f3bde9be2d?auto=format&fit=crop&q=80&w=1000',
        location: 'Av. Facundo Quiroga 1500, La Rioja',
        rating: 4.6,
        theme: 'dark',
        amenities: ['Estacionamiento', 'Vestuarios', 'Parrillas', 'Bar'],
        hours: 'Lunes a Domingo: 10:00 - 02:00',
        sportTypes: ['football'],
        courts: [
            { id: 'f1', name: 'Cancha 5 (Sintético)', sport: 'football', price: 30000 },
            { id: 'f2', name: 'Cancha 7 (Sintético)', sport: 'football', price: 45000 },
            { id: 'f3', name: 'Cancha 5 (Techada)', sport: 'football', price: 35000 }
        ]
    },
    {
        id: 'club-tenis-larioja',
        name: 'Club de Tenis La Rioja',
        category: 'other',
        type: 'sport',
        image: 'https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?auto=format&fit=crop&q=80&w=1000',
        location: 'Av. San Francisco 3200, La Rioja',
        rating: 4.7,
        theme: 'light',
        amenities: ['Estacionamiento', 'Buffet', 'Vestuarios', 'Iluminación LED'],
        hours: 'Lunes a Domingo: 08:00 - 23:00',
        sportTypes: ['tennis'],
        courts: [
            { id: 't1', name: 'Cancha 1 (Polvo de Ladrillo)', sport: 'tennis', price: 15000 },
            { id: 't2', name: 'Cancha 2 (Polvo de Ladrillo)', sport: 'tennis', price: 15000 },
            { id: 't3', name: 'Cancha 3 (Cemento)', sport: 'tennis', price: 12000 }
        ]
    },
    {
        id: 'yoga-bienestar',
        name: 'Yoga & Bienestar',
        category: 'health',
        type: 'service',
        image: 'https://images.unsplash.com/photo-1599447421405-0c325d36d75e?auto=format&fit=crop&q=80&w=1000',
        location: 'Catamarca 150, La Rioja',
        rating: 4.9,
        theme: 'light',
        amenities: ['Mats Incluidos', 'Aire Acondicionado', 'Té de Hierbas'],
        hours: 'Lunes a Viernes: 08:00 - 21:00',
        services: [
            { id: 'y1', name: 'Clase de Hatha Yoga', duration: 60, price: 5000 },
            { id: 'y2', name: 'Clase de Ashtanga', duration: 90, price: 7000 },
            { id: 'y3', name: 'Meditación Guiada', duration: 45, price: 4000 }
        ]
    },
    {
        id: 'lavaauto-express',
        name: 'LavaAuto Express',
        category: 'other',
        type: 'service',
        image: 'https://images.unsplash.com/photo-1601362840469-51e4d8d58785?auto=format&fit=crop&q=80&w=1000',
        location: 'Av. Perón y Facundo Quiroga',
        rating: 4.4,
        theme: 'dark',
        amenities: ['Sala de Espera', 'Wifi', 'Cafetería'],
        hours: 'Lunes a Sábado: 09:00 - 19:00',
        services: [
            { id: 'l1', name: 'Lavado Completo Auto', duration: 45, price: 8000 },
            { id: 'l2', name: 'Lavado Completo Camioneta', duration: 60, price: 10000 },
            { id: 'l3', name: 'Limpieza de Tapizados', duration: 120, price: 25000 }
        ]
    }
];

export const promotions = [
    {
        id: 1,
        businessId: 'club-padel-central',
        title: '20% OFF en Canchas',
        description: 'Jugá de mañana con descuento',
        image: 'https://images.unsplash.com/photo-1626248596295-549689c34f09?auto=format&fit=crop&q=80&w=800' // Padel court
    },
    {
        id: 2,
        businessId: 'barberia-vikingos',
        title: 'Corte + Barba',
        description: 'Combo completo por $8000',
        image: 'https://images.unsplash.com/photo-1503951914875-452162b7f304?auto=format&fit=crop&q=80&w=800' // Barber tools
    },
    {
        id: 3,
        businessId: 'estetica-glow',
        title: '2x1 en Masajes',
        description: 'Relajate con quien quieras',
        image: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&q=80&w=800' // Spa/Massage
    }
];
