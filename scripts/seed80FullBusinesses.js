import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import { randomUUID } from 'crypto';

let supabaseUrl = process.env.VITE_SUPABASE_URL || '';
let supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

if ((!supabaseUrl || !supabaseKey) && fs.existsSync('.env')) {
    try {
        const envContent = fs.readFileSync('.env', 'utf8');
        const urlMatch = envContent.match(/VITE_SUPABASE_URL\s*=\s*(.*)/);
        const keyMatch = envContent.match(/VITE_SUPABASE_ANON_KEY\s*=\s*(.*)/);
        if (urlMatch) supabaseUrl = urlMatch[1].trim();
        if (keyMatch) supabaseKey = keyMatch[1].trim();
    } catch (e) {}
}

const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqdGFrcWJlZ3R0c2F6aGtjc212Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNTI5MiwiZXhwIjoyMDc5MjAxMjkyfQ.t-NQ7DKxonVxbTs95gGSYF863lKGF4zWZJ2L1HAmTMQ';
const supabase = createClient(supabaseUrl, SERVICE_KEY || supabaseKey);

function slugify(text) {
    return text.toString().toLowerCase().trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-');
}

export async function generate80Businesses() {
    const { data: cats } = await supabase.from('categories').select('id, name, slug');
    const { data: subcats } = await supabase.from('subcategories').select('id, name, category_id');
    const { data: plans } = await supabase.from('subscription_plans').select('id').limit(1);

    const catMap = {};
    cats?.forEach(c => { catMap[c.slug] = c.id; });

    const subcatMap = {};
    subcats?.forEach(s => { subcatMap[s.name.toLowerCase().trim()] = s.id; });

    const planId = plans?.[0]?.id || null;

    const defaultHoursSports = {
        monday: { open: '08:00', close: '02:00', isOpen: true },
        tuesday: { open: '08:00', close: '02:00', isOpen: true },
        wednesday: { open: '08:00', close: '02:00', isOpen: true },
        thursday: { open: '08:00', close: '02:00', isOpen: true },
        friday: { open: '08:00', close: '03:00', isOpen: true },
        saturday: { open: '08:00', close: '03:00', isOpen: true },
        sunday: { open: '09:00', close: '01:00', isOpen: true },
    };

    const defaultHoursNormal = {
        monday: { open: '08:30', close: '21:30', isOpen: true },
        tuesday: { open: '08:30', close: '21:30', isOpen: true },
        wednesday: { open: '08:30', close: '21:30', isOpen: true },
        thursday: { open: '08:30', close: '21:30', isOpen: true },
        friday: { open: '08:30', close: '22:00', isOpen: true },
        saturday: { open: '09:00', close: '21:00', isOpen: true },
        sunday: { open: '10:00', close: '14:00', isOpen: false },
    };

    const allBusinesses = [];

    const getCoords = (i) => {
        const baseLat = -29.4131;
        const baseLng = -66.8558;
        const latOffset = (Math.sin(i * 1.3) * 0.035);
        const lngOffset = (Math.cos(i * 1.7) * 0.035);
        return {
            latitude: Number((baseLat + latOffset).toFixed(6)),
            longitude: Number((baseLng + lngOffset).toFixed(6))
        };
    };

    // 1. DEPORTES (25)
    const sportsDefs = [
        { name: 'Pádel Arena La Rioja', sub: 'Padel', courts: ['Cancha 1 - Cristal WPT', 'Cancha 2 - Panorámica Pro', 'Cancha 3 - Césped Azul'], price: 24000, sport: 'padel' },
        { name: 'Complejo Cancha Apolo', sub: 'Futbol', courts: ['Cancha Fútbol 5 Sintético A', 'Cancha Fútbol 5 Sintético B', 'Cancha Fútbol 7 Techada'], price: 34000, sport: 'football' },
        { name: 'Pádel Central Park LR', sub: 'Padel', courts: ['Cancha Central Cristal', 'Cancha 2 Muro Pro', 'Cancha 3 Climatizada'], price: 22000, sport: 'padel' },
        { name: 'El Monumental Fútbol 5', sub: 'Futbol', courts: ['Cancha 1 Iluminación LED', 'Cancha 2 Césped Monofilamento'], price: 32000, sport: 'football' },
        { name: 'Smash Pádel & Lounge', sub: 'Padel', courts: ['Cancha 1 Outdoor Cristal', 'Cancha 2 Cubierta', 'Cancha 3 Fast Court'], price: 25000, sport: 'padel' },
        { name: 'La Cantera Fútbol Club', sub: 'Futbol', courts: ['Cancha 1 F5 Césped Premium', 'Cancha 2 F5 Pro', 'Cancha 3 F7'], price: 36000, sport: 'football' },
        { name: 'Pádel Master Club', sub: 'Padel', courts: ['Cancha 1 Oficial', 'Cancha 2 Entrenamiento', 'Cancha 3 Cristal Techada'], price: 23000, sport: 'padel' },
        { name: 'Maracaná Fútbol 5', sub: 'Futbol', courts: ['Cancha A Maracaná', 'Cancha B Wembley'], price: 30000, sport: 'football' },
        { name: 'Set & Match Tennis & Padel', sub: 'Padel', courts: ['Cancha Polvo de Ladrillo 1', 'Cancha Pádel Cristal 1', 'Cancha Pádel Cristal 2'], price: 26000, sport: 'padel' },
        { name: 'Top Padel Center', sub: 'Padel', courts: ['Cancha Black Pro', 'Cancha Gold Panorámica', 'Cancha Silver'], price: 24000, sport: 'padel' },
        { name: 'Gol de Oro Fútbol 5 y 7', sub: 'Futbol', courts: ['Cancha 1 Gol de Oro F5', 'Cancha 2 Estadio F7'], price: 38000, sport: 'football' },
        { name: 'Point Break Pádel', sub: 'Padel', courts: ['Cancha 1 Cristal', 'Cancha 2 Césped Rizado'], price: 21000, sport: 'padel' },
        { name: 'El Temple Fútbol Club', sub: 'Futbol', courts: ['Cancha Principal F5', 'Cancha Auxiliar F5'], price: 32000, sport: 'football' },
        { name: 'Velasco Pádel Club', sub: 'Padel', courts: ['Cancha 1 Velasco', 'Cancha 2 Faldeo', 'Cancha 3 Cristal'], price: 22000, sport: 'padel' },
        { name: 'El Campín Fútbol 5', sub: 'Futbol', courts: ['Cancha Sintético A', 'Cancha Sintético B'], price: 31000, sport: 'football' },
        { name: 'Drive Pádel Arena', sub: 'Padel', courts: ['Cancha 1 Drive Pro', 'Cancha 2 Reverse'], price: 23000, sport: 'padel' },
        { name: 'La Bombonerita F5', sub: 'Futbol', courts: ['Cancha 1 La 12', 'Cancha 2 Xeneize F5'], price: 33000, sport: 'football' },
        { name: 'Match Point Pádel La Rioja', sub: 'Padel', courts: ['Cancha 1 Match', 'Cancha 2 Tiebreak', 'Cancha 3 Golden'], price: 25000, sport: 'padel' },
        { name: 'Pichichi Fútbol 5', sub: 'Futbol', courts: ['Cancha 1 Pichichi F5', 'Cancha 2 Campeones'], price: 30000, sport: 'football' },
        { name: 'Zona Pádel Club', sub: 'Padel', courts: ['Cancha Cristal 1', 'Cancha Cristal 2'], price: 22000, sport: 'padel' },
        { name: 'Estadio Fútbol 7 San Vicente', sub: 'Futbol', courts: ['Cancha 1 F7 Césped Alto Impacto', 'Cancha 2 F5 Techada'], price: 42000, sport: 'football' },
        { name: 'Tie Break Padel Indoor', sub: 'Padel', courts: ['Cancha 1 Indoor Climatizada', 'Cancha 2 Indoor'], price: 27000, sport: 'padel' },
        { name: 'Fair Play Fútbol Sintético', sub: 'Futbol', courts: ['Cancha 1 Fair Play', 'Cancha 2 Respeto F5'], price: 31000, sport: 'football' },
        { name: 'Pádel Pro La Rioja', sub: 'Padel', courts: ['Cancha 1 Pro Tour', 'Cancha 2 Master'], price: 24000, sport: 'padel' },
        { name: 'El Diez Fútbol Club', sub: 'Futbol', courts: ['Cancha D10S Fútbol 5', 'Cancha La Mano de Dios F7'], price: 35000, sport: 'football' }
    ];

    sportsDefs.forEach((s, idx) => {
        const coords = getCoords(idx + 1);
        allBusinesses.push({
            name: s.name,
            slug: slugify(s.name),
            type: 'sport',
            category_id: catMap['deportes'],
            subcategories: [s.sub],
            location: `Av. Ortiz de Ocampo ${1000 + idx * 45}, La Rioja`,
            latitude: coords.latitude,
            longitude: coords.longitude,
            whatsapp: '5493805002706',
            email: `${slugify(s.name)}@turnitoslr.com`,
            theme: idx % 2 === 0 ? 'dark' : 'light',
            primary_color: idx % 2 === 0 ? '#00E676' : '#2979FF',
            button_color: idx % 2 === 0 ? '#00E676' : '#2979FF',
            hours: defaultHoursSports,
            rating: Number((4.6 + (idx % 4) * 0.1).toFixed(1)),
            store_enabled: true,
            amenities: ['Wifi', 'Estacionamiento', 'Vestuarios', 'Bar / Buffet', 'Iluminación LED', 'Duchas'],
            banner_url: s.sport === 'padel'
                ? 'https://images.unsplash.com/photo-1626248596308-25297c2338c3?auto=format&fit=crop&q=80&w=1200'
                : 'https://images.unsplash.com/photo-1529900748604-07564a03e7a6?auto=format&fit=crop&q=80&w=1200',
            logo_url: s.sport === 'padel'
                ? 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&q=80&w=200'
                : 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&q=80&w=200',
            subscription_plan_id: planId,
            subscription_status: 'active',
            courts: s.courts.map((cName, cIdx) => ({
                name: cName,
                sport: s.sport,
                price: s.price + cIdx * 2000
            })),
            metadata: {
                store_products: [
                    { id: randomUUID(), name: s.sport === 'padel' ? 'Tubo Pelotas Bullpadel Premium Pro' : 'Pelota de Fútbol Nº 5 AFA', price: s.sport === 'padel' ? 14500 : 38000, category: 'Pelotas', image: 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&q=80&w=300', stock: 24, is_active: true },
                    { id: randomUUID(), name: 'Bebida Isotónica Gatorade 500ml', price: 2800, category: 'Bebidas', image: 'https://images.unsplash.com/photo-1527661591475-527312dd65f5?auto=format&fit=crop&q=80&w=300', stock: 50, is_active: true },
                    { id: randomUUID(), name: 'Agua Mineral Glaciar 1.5L', price: 1800, category: 'Bebidas', image: 'https://images.unsplash.com/photo-1560023907-5f339617ea30?auto=format&fit=crop&q=80&w=300', stock: 60, is_active: true },
                    { id: randomUUID(), name: s.sport === 'padel' ? 'Overgrip Siux Confort Pro (Pack x3)' : 'Canilleras Reforzadas Pro', price: 9500, category: 'Accesorios', image: 'https://images.unsplash.com/photo-1587280501635-68a0e82cd5ff?auto=format&fit=crop&q=80&w=300', stock: 15, is_active: true }
                ],
                reviews: [
                    { id: randomUUID(), user_name: 'Martín Romero', rating: 5, comment: 'Excelentes canchas e iluminación. Los turnos siempre a horario y el bar de 10.', created_at: '2026-08-10' },
                    { id: randomUUID(), user_name: 'Gonzalo F.', rating: 5, comment: 'Muy buena atención y el césped sintético está impecable. Fácil para reservar.', created_at: '2026-08-08' },
                    { id: randomUUID(), user_name: 'Federico S.', rating: 4, comment: 'Muy buenas instalaciones y vestuarios cómodos.', created_at: '2026-08-02' }
                ]
            }
        });
    });

    // 2. QUINCHOS Y SALONES (15)
    const venueDefs = [
        { name: 'Quincho Roma Eventos', cap: 80, hour: 25000, day: 140000, sub: 'Quinchos' },
        { name: 'Quincho El Paraíso con Pileta', cap: 100, hour: 30000, day: 170000, sub: 'Quinchos' },
        { name: 'Salón Bellavista Eventos', cap: 180, hour: 45000, day: 250000, sub: 'Salones de eventos' },
        { name: 'Quincho Las Palmeras Faldeo', cap: 70, hour: 22000, day: 130000, sub: 'Quinchos' },
        { name: 'Salón Real La Rioja', cap: 220, hour: 55000, day: 320000, sub: 'Salones de eventos' },
        { name: 'Quincho La Herradura', cap: 60, hour: 20000, day: 110000, sub: 'Quinchos' },
        { name: 'Espacio Las Acacias Multieventos', cap: 150, hour: 40000, day: 220000, sub: 'Salones de eventos' },
        { name: 'Quincho San Nicolás con Parque', cap: 90, hour: 28000, day: 160000, sub: 'Quinchos' },
        { name: 'Salón Los Olivos Recepciones', cap: 200, hour: 50000, day: 290000, sub: 'Salones de eventos' },
        { name: 'Quincho Don Pedro Asador', cap: 50, hour: 18000, day: 95000, sub: 'Quinchos' },
        { name: 'Salón Infantil Magic Park', cap: 120, hour: 35000, day: 180000, sub: 'Salones de eventos' },
        { name: 'Quincho El Oasis del Velasco', cap: 85, hour: 26000, day: 150000, sub: 'Quinchos' },
        { name: 'Cabaña & Quincho La Cuesta', cap: 65, hour: 24000, day: 140000, sub: 'Quinchos' },
        { name: 'Salón Cumbre Recepciones', cap: 250, hour: 65000, day: 380000, sub: 'Salones de eventos' },
        { name: 'Quincho El Trébol Familiar', cap: 55, hour: 19000, day: 105000, sub: 'Quinchos' }
    ];

    venueDefs.forEach((v, idx) => {
        const coords = getCoords(25 + idx + 1);
        allBusinesses.push({
            name: v.name,
            slug: slugify(v.name),
            type: 'venue',
            category_id: catMap['alquileres'],
            subcategories: [v.sub],
            location: `Barrio Faldeo / Cochangasta ${idx * 60 + 200}, La Rioja`,
            latitude: coords.latitude,
            longitude: coords.longitude,
            whatsapp: '5493805002706',
            email: `${slugify(v.name)}@turnitoslr.com`,
            theme: 'dark',
            primary_color: '#84CC16',
            button_color: '#84CC16',
            hours: defaultHoursSports,
            rating: Number((4.7 + (idx % 3) * 0.1).toFixed(1)),
            store_enabled: false,
            price_per_hour: v.hour,
            price_per_day: v.day,
            pricing_model: 'hourly',
            max_capacity: v.cap,
            rental_duration_options: [4, 6, 8, 12, 24],
            included_amenities: ['Pileta con cerco de seguridad', 'Asador techado con parrilla', 'Freezer industrial', 'Mesas y sillas completas', 'Baños sexados con duchas', 'Wifi de alta velocidad', 'Vajilla básica'],
            additional_services: [
                { id: randomUUID(), name: 'Servicio de Limpieza Post-Evento', price: 18000, icon: '🧹' },
                { id: randomUUID(), name: 'Equipamiento de Sonido e Iluminación LED', price: 35000, icon: '🎧' },
                { id: randomUUID(), name: 'Castillo Inflable para Niños', price: 22000, icon: '🏰' },
                { id: randomUUID(), name: 'Parrillero Asador Dedicado (4 hs)', price: 25000, icon: '🥩' }
            ],
            gallery_images: [
                { url: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&q=80&w=1200', title: 'Salón Principal' },
                { url: 'https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?auto=format&fit=crop&q=80&w=1200', title: 'Pileta y Parque' },
                { url: 'https://images.unsplash.com/photo-1555244162-803834f70033?auto=format&fit=crop&q=80&w=1200', title: 'Asador y Galería' }
            ],
            banner_url: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&q=80&w=1200',
            logo_url: 'https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?auto=format&fit=crop&q=80&w=200',
            subscription_plan_id: planId,
            subscription_status: 'active',
            metadata: {
                reviews: [
                    { id: randomUUID(), user_name: 'Camila Bazán', rating: 5, comment: 'Excelente quincho, la pileta impecable y el asador muy cómodo para 60 personas.', created_at: '2026-08-11' },
                    { id: randomUUID(), user_name: 'Esteban R.', rating: 5, comment: 'Festejamos un cumple de 15, el sonido y la iluminación de diez.', created_at: '2026-08-05' }
                ]
            }
        });
    });

    // 3. BELLEZA Y CUIDADO PERSONAL (20)
    const beautyDefs = [
        { name: 'The Classic Barber Club', sub: 'Barberia', services: [{ name: 'Corte Fade & Degradé', dur: 45, pr: 9000 }, { name: 'Perfilado y Ritual de Barba', dur: 30, pr: 7000 }, { name: 'Combo Corte + Barba + Black Mask', dur: 60, pr: 14000 }] },
        { name: 'Serenity Spa & Estética Facial', sub: 'Spa', services: [{ name: 'Limpieza Facial Profunda', dur: 60, pr: 16000 }, { name: 'Masaje Descontracturante', dur: 50, pr: 18000 }, { name: 'Radiofrecuencia Facial', dur: 45, pr: 20000 }] },
        { name: 'Studio Nails La Rioja', sub: 'Salon de Uñas', services: [{ name: 'Esmaltado Semipermanente', dur: 60, pr: 13000 }, { name: 'Kapping Gel + Nail Art', dur: 90, pr: 18000 }, { name: 'Esculpidas en Soft Gel', dur: 90, pr: 22000 }] },
        { name: 'King Barber & Co', sub: 'Barberia', services: [{ name: 'Corte Clásico Masculino', dur: 30, pr: 8000 }, { name: 'Fade Urbano + Diseño', dur: 45, pr: 9500 }, { name: 'Barba Tradicional con Toalla Caliente', dur: 35, pr: 7500 }] },
        { name: 'Peluquería & Color Studio Glam', sub: 'Peluqueria', services: [{ name: 'Corte y Lavado Nutritivo', dur: 45, pr: 12000 }, { name: 'Nutrición Capilar Botox', dur: 60, pr: 22000 }, { name: 'Balayage / Iluminación', dur: 120, pr: 48000 }] },
        { name: 'Lashes & Brows La Rioja', sub: 'Estetica', services: [{ name: 'Lifting de Pestañas', dur: 45, pr: 12000 }, { name: 'Laminado y Perfilado de Cejas', dur: 40, pr: 10000 }, { name: 'Extensiones Pelo a Pelo', dur: 90, pr: 24000 }] },
        { name: 'Barbería Don Juan', sub: 'Barberia', services: [{ name: 'Corte de Pelo', dur: 30, pr: 8000 }, { name: 'Arreglo de Barba', dur: 25, pr: 6000 }] },
        { name: 'Aura Centro de Estética', sub: 'Estetica', services: [{ name: 'Drenaje Linfático Manual', dur: 50, pr: 17000 }, { name: 'Criolipólisis Plana', dur: 60, pr: 25000 }] },
        { name: 'Mundo Nails & Beauty', sub: 'Salon de Uñas', services: [{ name: 'Belleza de Pies Completa', dur: 50, pr: 14000 }, { name: 'Semipermanente Manos', dur: 60, pr: 12000 }] },
        { name: 'Urban Style Peluquería', sub: 'Peluqueria', services: [{ name: 'Corte Femenino Diseño', dur: 45, pr: 11000 }, { name: 'Alisado Definitivo Espejo', dur: 120, pr: 35000 }] },
        { name: 'Vip Barber Shop', sub: 'Barberia', services: [{ name: 'Corte VIP + Bebida de Cortesía', dur: 45, pr: 10000 }, { name: 'Barba VIP', dur: 30, pr: 8000 }] },
        { name: 'Harmonie Spa Urbano', sub: 'Spa', services: [{ name: 'Circuito Spa Relax', dur: 90, pr: 30000 }, { name: 'Masaje con Piedras Calientes', dur: 60, pr: 22000 }] },
        { name: 'Diamond Nails Studio', sub: 'Salon de Uñas', services: [{ name: 'Uñas Acrílicas Full Set', dur: 90, pr: 24000 }, { name: 'Service de Uñas', dur: 60, pr: 16000 }] },
        { name: 'Estudio de Tatuajes Ink Art', sub: 'Estetica', services: [{ name: 'Sesión Tattoo Minimalista (hasta 5cm)', dur: 45, pr: 20000 }, { name: 'Sesión Tattoo Mediano', dur: 120, pr: 50000 }] },
        { name: 'Peluquería Infantil Pequeños Cortes', sub: 'Peluqueria', services: [{ name: 'Corte Infantil Niños/Niñas', dur: 30, pr: 7500 }] },
        { name: 'Barber Club San Vicente', sub: 'Barberia', services: [{ name: 'Corte y Afeitado Navaja', dur: 45, pr: 9000 }] },
        { name: 'Estética Glow & Shine', sub: 'Estetica', services: [{ name: 'Depilación Láser Definitiva', dur: 45, pr: 19000 }, { name: 'Peeling Químico Suave', dur: 40, pr: 18000 }] },
        { name: 'Chic Peluquería Unisex', sub: 'Peluqueria', services: [{ name: 'Corte Unisex', dur: 35, pr: 9500 }, { name: 'Reflejos con Gorra', dur: 90, pr: 28000 }] },
        { name: 'Oasis Masajes Terapéuticos', sub: 'Spa', services: [{ name: 'Masaje Cervical y Espalda', dur: 40, pr: 14000 }, { name: 'Reflexología Podal', dur: 45, pr: 15000 }] },
        { name: 'Master Barber Shop La Rioja', sub: 'Barberia', services: [{ name: 'Corte Master Fade', dur: 45, pr: 9500 }, { name: 'Barba Esculpida', dur: 30, pr: 7500 }] }
    ];

    beautyDefs.forEach((b, idx) => {
        const coords = getCoords(40 + idx + 1);
        allBusinesses.push({
            name: b.name,
            slug: slugify(b.name),
            type: 'service',
            category_id: catMap['belleza'],
            subcategories: [b.sub],
            location: `Calle San Nicolás de Bari / Pelagio Luna ${idx * 40 + 300}, Centro, La Rioja`,
            latitude: coords.latitude,
            longitude: coords.longitude,
            whatsapp: '5493805002706',
            email: `${slugify(b.name)}@turnitoslr.com`,
            theme: idx % 2 === 0 ? 'dark' : 'light',
            primary_color: idx % 2 === 0 ? '#EC4899' : '#8B5CF6',
            button_color: idx % 2 === 0 ? '#EC4899' : '#8B5CF6',
            hours: defaultHoursNormal,
            rating: Number((4.8 + (idx % 3) * 0.1).toFixed(1)),
            store_enabled: true,
            amenities: ['Wifi', 'Café de Cortesía', 'Aire Acondicionado', 'Atención Personalizada', 'Música Ambiente'],
            banner_url: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&q=80&w=1200',
            logo_url: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&q=80&w=200',
            subscription_plan_id: planId,
            subscription_status: 'active',
            services: b.services.map(s => ({
                name: s.name,
                duration: s.dur,
                price: s.pr,
                description: `${s.name} con productos profesionales de primera línea.`
            })),
            specialists: [
                { name: 'Lucas Silva', role: 'Especialista Principal', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200' },
                { name: 'Valentina Díaz', role: 'Profesional Certificada', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=200' }
            ],
            metadata: {
                store_products: [
                    { id: randomUUID(), name: 'Cera Fijadora Capilar Mate 100g', price: 9200, category: 'Peinado', image: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&q=80&w=300', stock: 18, is_active: true },
                    { id: randomUUID(), name: 'Aceite Nutritivo para Barba con Argán', price: 8500, category: 'Barbería', image: 'https://images.unsplash.com/photo-1608248597359-052417726b2c?auto=format&fit=crop&q=80&w=300', stock: 12, is_active: true }
                ],
                reviews: [
                    { id: randomUUID(), user_name: 'Joaquín Vega', rating: 5, comment: 'Excelente atención, puntualidad y el corte impecable como siempre.', created_at: '2026-08-12' },
                    { id: randomUUID(), user_name: 'Lucía M.', rating: 5, comment: 'Súper recomendables, el lugar es hermoso y atienden con mucha calidez.', created_at: '2026-08-07' }
                ]
            }
        });
    });

    // 4. SALUD Y BIENESTAR (12)
    const healthDefs = [
        { name: 'Centro Kinésico Movité', sub: 'Kinesiología', services: [{ name: 'Sesión Kinesiología y Fisioterapia', dur: 45, pr: 14000 }, { name: 'Rehabilitación Deportiva Funcional', dur: 60, pr: 18000 }, { name: 'RPG Reeducación Postural Global', dur: 50, pr: 20000 }] },
        { name: 'Clínica Odontológica Sonrisas', sub: 'Odontología', services: [{ name: 'Consulta y Diagnóstico Digital', dur: 30, pr: 12000 }, { name: 'Limpieza Dental Ultrasonido', dur: 45, pr: 22000 }, { name: 'Blanqueamiento Dental Láser', dur: 60, pr: 45000 }] },
        { name: 'NutriSalud Lic. Mariana Gómez', sub: 'Nutrición', services: [{ name: 'Consulta Nutricional Inicial + InBody', dur: 45, pr: 16000 }, { name: 'Control y Plan Alimentario Personalizado', dur: 30, pr: 11000 }] },
        { name: 'Espacio Psicológico Bienestar', sub: 'Psicología', services: [{ name: 'Sesión Psicoterapia Individual', dur: 50, pr: 18000 }, { name: 'Terapia de Pareja', dur: 60, pr: 25000 }] },
        { name: 'KineSport Centro de Alto Rendimiento', sub: 'Kinesiología', services: [{ name: 'Evaluación Biomecánica y Kinesiología', dur: 60, pr: 19000 }, { name: 'Terapia con Ondas de Choque', dur: 40, pr: 24000 }] },
        { name: 'OdontoClinic Especialistas', sub: 'Odontología', services: [{ name: 'Consulta Odontológica General', dur: 30, pr: 13000 }, { name: 'Restauración Estética de Resina', dur: 45, pr: 25000 }] },
        { name: 'Nutrición Deportiva Pro', sub: 'Nutrición', services: [{ name: 'Plan Nutricional para Atletas', dur: 50, pr: 18000 }] },
        { name: 'Consultorio Kinesiología San Martín', sub: 'Kinesiología', services: [{ name: 'Fisioterapia y Magnetoterapia', dur: 45, pr: 13000 }] },
        { name: 'Centro Odontológico del Parque', sub: 'Odontología', services: [{ name: 'Control Bucal y Limpieza', dur: 40, pr: 20000 }] },
        { name: 'Psicología Clínica y Cognitiva', sub: 'Psicología', services: [{ name: 'Consulta TCC Terapia Cognitiva', dur: 50, pr: 19000 }] },
        { name: 'KineSalud Rehabilitación', sub: 'Kinesiología', services: [{ name: 'Tratamiento Columna y Cervicalgia', dur: 45, pr: 15000 }] },
        { name: 'Dental Care La Rioja', sub: 'Odontología', services: [{ name: 'Revisión y Limpieza Profiláctica', dur: 40, pr: 21000 }] }
    ];

    healthDefs.forEach((h, idx) => {
        const coords = getCoords(60 + idx + 1);
        allBusinesses.push({
            name: h.name,
            slug: slugify(h.name),
            type: 'service',
            category_id: catMap['salud'],
            subcategories: [h.sub],
            location: `Av. Rivadavia / Castro Barros ${idx * 50 + 400}, La Rioja`,
            latitude: coords.latitude,
            longitude: coords.longitude,
            whatsapp: '5493805002706',
            email: `${slugify(h.name)}@turnitoslr.com`,
            theme: 'light',
            primary_color: '#0284C7',
            button_color: '#0284C7',
            hours: defaultHoursNormal,
            rating: Number((4.8 + (idx % 3) * 0.1).toFixed(1)),
            store_enabled: false,
            amenities: ['Sala de Espera Climatizada', 'Wifi', 'Acceso para Movilidad Reducida', 'Profesionales Matriculados'],
            banner_url: 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&q=80&w=1200',
            logo_url: 'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&q=80&w=200',
            subscription_plan_id: planId,
            subscription_status: 'active',
            services: h.services.map(s => ({
                name: s.name,
                duration: s.dur,
                price: s.pr,
                description: `${s.name} con atención médica especializada.`
            })),
            specialists: [
                { name: 'Dr. Alejandro Moreno', role: 'Especialista Matriculado', avatar: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=200' }
            ],
            metadata: {
                reviews: [
                    { id: randomUUID(), user_name: 'Ignacio Peralta', rating: 5, comment: 'Excelente profesional, me recuperé de la lesión en tiempo récord.', created_at: '2026-08-09' }
                ]
            }
        });
    });

    // 5. MASCOTAS (8)
    const petDefs = [
        { name: 'Veterinaria & Pet Shop Los Amigos', sub: 'Veterinaria', services: [{ name: 'Consulta Veterinaria General', dur: 30, pr: 12000 }, { name: 'Vacunación y Desparasitación', dur: 20, pr: 10000 }] },
        { name: 'Spa Canino & Peluquería Mascotas', sub: 'Peluquería Canina ', services: [{ name: 'Baño y Corte Perro Pequeño (hasta 8kg)', dur: 60, pr: 11000 }, { name: 'Baño y Corte Perro Mediano (9 a 20kg)', dur: 75, pr: 14500 }, { name: 'Baño y Deslanado Perro Grande (+20kg)', dur: 90, pr: 18000 }] },
        { name: 'Clínica Veterinaria San Francisco', sub: 'Veterinaria', services: [{ name: 'Consulta Clínica Felinos y Caninos', dur: 30, pr: 13000 }] },
        { name: 'Peluquería Canina Móvil y Local Guau', sub: 'Peluquería Canina ', services: [{ name: 'Baño Hipoalergénico y Corte', dur: 60, pr: 12000 }, { name: 'Corte Higiénico y Uñas', dur: 40, pr: 8500 }] },
        { name: 'Mundo Animal Veterinaria', sub: 'Veterinaria', services: [{ name: 'Atención Clínica y Vacunación', dur: 30, pr: 12000 }] },
        { name: 'Pet Spa La Rioja', sub: 'Peluquería Canina ', services: [{ name: 'Baño Relajante y Belleza Canina', dur: 60, pr: 13000 }] },
        { name: 'Veterinaria del Parque', sub: 'Veterinaria', services: [{ name: 'Consulta Médica Veterinaria', dur: 30, pr: 12500 }] },
        { name: 'Puppy Love Peluquería Canina', sub: 'Peluquería Canina ', services: [{ name: 'Baño, Secado y Perfumado', dur: 50, pr: 11500 }] }
    ];

    petDefs.forEach((p, idx) => {
        const coords = getCoords(72 + idx + 1);
        allBusinesses.push({
            name: p.name,
            slug: slugify(p.name),
            type: 'service',
            category_id: catMap['mascotas'],
            subcategories: [p.sub],
            location: `Av. Ramírez de Velasco / Facundo Quiroga ${idx * 45 + 500}, La Rioja`,
            latitude: coords.latitude,
            longitude: coords.longitude,
            whatsapp: '5493805002706',
            email: `${slugify(p.name)}@turnitoslr.com`,
            theme: 'light',
            primary_color: '#F59E0B',
            button_color: '#F59E0B',
            hours: defaultHoursNormal,
            rating: Number((4.7 + (idx % 3) * 0.1).toFixed(1)),
            store_enabled: true,
            amenities: ['Atención Médica Veterinaria', 'Productos y Alimentos', 'Ambiente Climatizado'],
            banner_url: 'https://images.unsplash.com/photo-1548767797-d8c844163c4c?auto=format&fit=crop&q=80&w=1200',
            logo_url: 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&q=80&w=200',
            subscription_plan_id: planId,
            subscription_status: 'active',
            services: p.services.map(s => ({
                name: s.name,
                duration: s.dur,
                price: s.pr,
                description: `${s.name} con cariño y cuidado profesional.`
            })),
            metadata: {
                store_products: [
                    { id: randomUUID(), name: 'Alimento Balanceado Royal Canin Medium 3kg', price: 28000, category: 'Alimentos', image: 'https://images.unsplash.com/photo-1589924691995-400dc9ecc119?auto=format&fit=crop&q=80&w=300', stock: 15, is_active: true },
                    { id: randomUUID(), name: 'Pipeta Antipulgas y Garrapatas Frontline', price: 9500, category: 'Salud', image: 'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?auto=format&fit=crop&q=80&w=300', stock: 20, is_active: true }
                ],
                reviews: [
                    { id: randomUUID(), user_name: 'Florencia C.', rating: 5, comment: 'Llevé a mi caniche y lo dejaron hermoso, súper cariñosos con los animales.', created_at: '2026-08-10' }
                ]
            }
        });
    });

    return { allBusinesses, subcatMap };
}

export async function executeSeed() {
    const { allBusinesses, subcatMap } = await generate80Businesses();
    console.log(`\n📦 Iniciando inserción de ${allBusinesses.length} negocios en Supabase...`);

    const inserted = [];
    for (const biz of allBusinesses) {
        const { subcategories: subcatNames, courts, services, specialists, ...bizRecord } = biz;

        const { data: bResult, error: bErr } = await supabase
            .from('businesses')
            .upsert([bizRecord], { onConflict: 'slug' })
            .select()
            .single();

        if (bErr) {
            console.error(`❌ Error en negocio ${biz.name}:`, bErr.message);
            continue;
        }

        const bizId = bResult.id;

        // Subcategories
        if (subcatNames?.length > 0) {
            await supabase.from('business_subcategories').delete().eq('business_id', bizId);
            const rows = subcatNames.map(n => subcatMap[n.toLowerCase().trim()]).filter(Boolean)
                .map(sid => ({ business_id: bizId, subcategory_id: sid }));
            if (rows.length > 0) {
                await supabase.from('business_subcategories').insert(rows);
            }
        }

        // Courts
        let firstCourtId = null;
        if (courts?.length > 0) {
            await supabase.from('courts').delete().eq('business_id', bizId);
            const courtRows = courts.map(c => ({
                id: randomUUID(),
                business_id: bizId,
                name: c.name,
                sport: c.sport,
                price: c.price
            }));
            const { data: cData } = await supabase.from('courts').insert(courtRows).select();
            firstCourtId = cData?.[0]?.id;
        }

        // Services
        let firstServiceId = null;
        if (services?.length > 0) {
            await supabase.from('services').delete().eq('business_id', bizId);
            const serviceRows = services.map(s => ({
                id: randomUUID(),
                business_id: bizId,
                name: s.name,
                duration: s.duration,
                price: s.price,
                description: s.description
            }));
            const { data: sData } = await supabase.from('services').insert(serviceRows).select();
            firstServiceId = sData?.[0]?.id;
        }

        // Specialists
        if (specialists?.length > 0) {
            await supabase.from('specialists').delete().eq('business_id', bizId);
            const specRows = specialists.map(sp => ({
                id: randomUUID(),
                business_id: bizId,
                name: sp.name,
                role: sp.role,
                avatar: sp.avatar
            }));
            await supabase.from('specialists').insert(specRows);
        }

        inserted.push({ ...biz, id: bizId, firstCourtId, firstServiceId });
        console.log(`  ✅ [${inserted.length}/${allBusinesses.length}] ${biz.name} (${biz.type})`);
    }

    // Bookings
    console.log(`\n📅 Generando reservas de ejemplo en calendarios...`);
    const customers = [
        { name: 'Juan Manuel Pérez', phone: '3804556677' },
        { name: 'Sofía Romero', phone: '3804223344' },
        { name: 'Carlos Delgado', phone: '3804889900' },
        { name: 'Agustina Vega', phone: '3804112233' },
        { name: 'Matías Luna', phone: '3804667788' }
    ];

    const bookingsToInsert = [];
    for (const biz of inserted) {
        const resourceId = biz.firstCourtId || biz.firstServiceId;
        if (!resourceId) continue;

        for (let i = 0; i < 4; i++) {
            const daysOffset = i - 1;
            const d = new Date();
            d.setDate(d.getDate() + daysOffset);
            const dateStr = d.toISOString().split('T')[0];
            const hour = [10, 14, 18, 20, 21][i % 5];
            const customer = customers[i % customers.length];

            bookingsToInsert.push({
                id: randomUUID(),
                business_id: biz.id,
                court_id: biz.firstCourtId || null,
                service_id: biz.firstServiceId || null,
                resource_id: resourceId,
                date: dateStr,
                time: `${String(hour).padStart(2, '0')}:00`,
                customer_name: customer.name,
                customer_phone: customer.phone,
                status: i === 0 ? 'completed' : 'confirmed',
                price: biz.courts?.[0]?.price || biz.services?.[0]?.price || 15000
            });
        }
    }

    if (bookingsToInsert.length > 0) {
        await supabase.from('bookings').insert(bookingsToInsert);
        console.log(`  ✅ ${bookingsToInsert.length} reservas registradas con éxito.`);
    }

    console.log(`\n🎉 Sembrado completado exitosamente: ${inserted.length} negocios activos en La Rioja.`);
}

if (process.argv[2] === '--run') {
    executeSeed().catch(console.error);
} else {
    generate80Businesses().then(({ allBusinesses }) => {
        console.log(`Preview completado: ${allBusinesses.length} negocios listos para sembrar.`);
    }).catch(console.error);
}
