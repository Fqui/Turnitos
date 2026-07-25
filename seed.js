import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import { randomUUID } from 'crypto';

// Load env
const envText = fs.readFileSync('.env', 'utf8');
const env = {};
envText.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) env[parts[0].trim()] = parts.slice(1).join('=').trim();
});

// Use SERVICE ROLE KEY to bypass RLS
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqdGFrcWJlZ3R0c2F6aGtjc212Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNTI5MiwiZXhwIjoyMDc5MjAxMjkyfQ.t-NQ7DKxonVxbTs95gGSYF863lKGF4zWZJ2L1HAmTMQ';
const supabase = createClient(env.VITE_SUPABASE_URL, SUPABASE_SERVICE_KEY);

const uuid = () => randomUUID();

async function safe(label, fn) {
    try {
        const result = await fn();
        console.log(`  ✅ ${label}`);
        return result;
    } catch (e) {
        console.error(`  ❌ ${label}: ${e.message}`);
        return null;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// FETCH REFERENCES
// ─────────────────────────────────────────────────────────────────────────────
async function fetchReferences() {
    const { data: cats } = await supabase.from('categories').select('id,name,slug');
    const { data: subcats } = await supabase.from('subcategories').select('id,name,category_id');
    const { data: plans } = await supabase.from('subscription_plans').select('id').limit(1);

    // First, let's inspect what tables are available for subscriptions
    const { data: existingBizData } = await supabase
        .from('businesses')
        .select('id, subscription_plan_id, subscription_status')
        .limit(1);
    
    console.log('\n🔍 Sample business subscription fields:', JSON.stringify(existingBizData?.[0], null, 2));

    const catMap = {};
    cats?.forEach(c => { catMap[c.slug] = c.id; });

    const subcatMap = {};
    subcats?.forEach(s => { subcatMap[s.name.toLowerCase().trim()] = s.id; });

    const planId = plans?.[0]?.id || null;

    console.log('\n📦 References loaded:');
    console.log('  Categories:', catMap);
    console.log('  Plan ID:', planId);

    return { catMap, subcatMap, planId };
}

// ─────────────────────────────────────────────────────────────────────────────
// BUSINESS DEFINITIONS
// ─────────────────────────────────────────────────────────────────────────────
function buildBusinesses({ catMap, planId }) {
    const defaultHours = {
        monday: { open: '08:00', close: '22:00', isOpen: true },
        tuesday: { open: '08:00', close: '22:00', isOpen: true },
        wednesday: { open: '08:00', close: '22:00', isOpen: true },
        thursday: { open: '08:00', close: '22:00', isOpen: true },
        friday: { open: '08:00', close: '23:00', isOpen: true },
        saturday: { open: '09:00', close: '23:00', isOpen: true },
        sunday: { open: '10:00', close: '20:00', isOpen: true },
    };

    return [
        {
            name: 'Club Pádel La Rioja',
            slug: 'club-padel-la-rioja',
            type: 'sport',
            category_id: catMap['deportes'],
            location: 'Av. Ortiz de Ocampo 1200, La Rioja',
            email: 'padel.larioja@turnitoslr.com',
            password: 'Turnitos2025!',
            password_changed: true,
            whatsapp: '5493804123456',
            latitude: -29.4135, longitude: -66.8558,
            rating: 4.8,
            theme: 'dark',
            primary_color: '#00E676',
            button_color: '#00E676',
            amenities: ['Wifi', 'Estacionamiento', 'Vestuarios', 'Bar', 'Duchas'],
            hours: defaultHours,
            banner_url: 'https://images.unsplash.com/photo-1626248596308-25297c2338c3?auto=format&fit=crop&q=80&w=1200',
            logo_url: 'https://images.unsplash.com/photo-1626248596308-25297c2338c3?auto=format&fit=crop&q=80&w=200',
            subscription_plan_id: planId,
            subscription_status: 'active',
            subcategories: ['padel'],
            courts: [
                { name: 'Cancha 1 - Cristal', sport: 'padel', price: 22000 },
                { name: 'Cancha 2 - Muro', sport: 'padel', price: 18000 },
                { name: 'Cancha 3 - Cubierta', sport: 'padel', price: 20000 },
            ],
        },
        {
            name: 'Complejo Fútbol 5 Los Pinos',
            slug: 'futbol5-los-pinos',
            type: 'sport',
            category_id: catMap['deportes'],
            location: 'Calle Los Pinos 450, La Rioja',
            email: 'futbol5.pinos@turnitoslr.com',
            password: 'Turnitos2025!',
            password_changed: true,
            whatsapp: '5493804234567',
            latitude: -29.4220, longitude: -66.8600,
            rating: 4.5,
            theme: 'dark',
            primary_color: '#2979FF',
            button_color: '#2979FF',
            amenities: ['Estacionamiento', 'Vestuarios', 'Cancha Techada', 'Iluminación LED'],
            hours: { ...defaultHours, sunday: { open: '09:00', close: '22:00', isOpen: true } },
            banner_url: 'https://images.unsplash.com/photo-1529900748604-07564a03e7a6?auto=format&fit=crop&q=80&w=1200',
            logo_url: null,
            subscription_plan_id: planId,
            subscription_status: 'active',
            subcategories: ['futbol'],
            courts: [
                { name: 'Cancha de Fútbol 5 - A', sport: 'football', price: 35000 },
                { name: 'Cancha de Fútbol 5 - B', sport: 'football', price: 35000 },
                { name: 'Cancha de Fútbol 7', sport: 'football', price: 50000 },
            ],
        },
        {
            name: 'Glow Estética Integral',
            slug: 'glow-estetica',
            type: 'service',
            category_id: catMap['belleza'],
            location: 'San Martín 450, La Rioja',
            email: 'glow.estetica@turnitoslr.com',
            password: 'Turnitos2025!',
            password_changed: true,
            whatsapp: '5493804345678',
            latitude: -29.4100, longitude: -66.8520,
            rating: 4.9,
            theme: 'light',
            primary_color: '#FF4081',
            button_color: '#FF4081',
            amenities: ['Wifi', 'Aire Acondicionado', 'Café de Cortesía', 'Estacionamiento'],
            hours: {
                monday: { open: '09:00', close: '20:00', isOpen: true },
                tuesday: { open: '09:00', close: '20:00', isOpen: true },
                wednesday: { open: '09:00', close: '20:00', isOpen: true },
                thursday: { open: '09:00', close: '20:00', isOpen: true },
                friday: { open: '09:00', close: '20:00', isOpen: true },
                saturday: { open: '09:00', close: '14:00', isOpen: true },
                sunday: { open: '00:00', close: '00:00', isOpen: false },
            },
            banner_url: 'https://images.unsplash.com/photo-1600948836101-f9ffda59d250?auto=format&fit=crop&q=80&w=1200',
            logo_url: 'https://images.unsplash.com/photo-1522337660859-02fbefca4702?auto=format&fit=crop&q=80&w=200',
            subscription_plan_id: planId,
            subscription_status: 'active',
            subcategories: ['estetica'],
            services: [
                { name: 'Limpieza Facial Profunda', duration: 60, price: 15000, description: 'Tratamiento completo para renovar tu piel.' },
                { name: 'Masaje Relajante', duration: 45, price: 12000, description: 'Técnica suave para liberar tensiones.' },
                { name: 'Manicuría Semipermanente', duration: 90, price: 18000, description: 'Uñas perfectas con esmalte de larga duración.' },
                { name: 'Depilación Corporal', duration: 30, price: 8000, description: 'Depilación con cera fría o caliente.' },
            ],
        },
        {
            name: 'Barber King',
            slug: 'barber-king',
            type: 'service',
            category_id: catMap['belleza'],
            location: 'Pelagio B. Luna 780, La Rioja',
            email: 'barber.king@turnitoslr.com',
            password: 'Turnitos2025!',
            password_changed: true,
            whatsapp: '5493804456789',
            latitude: -29.4080, longitude: -66.8540,
            rating: 4.7,
            theme: 'dark',
            primary_color: '#1A1A1A',
            button_color: '#C9A84C',
            amenities: ['Wifi', 'Música en vivo los viernes'],
            hours: {
                monday: { open: '09:00', close: '20:00', isOpen: true },
                tuesday: { open: '09:00', close: '20:00', isOpen: true },
                wednesday: { open: '09:00', close: '20:00', isOpen: true },
                thursday: { open: '09:00', close: '20:00', isOpen: true },
                friday: { open: '09:00', close: '21:00', isOpen: true },
                saturday: { open: '09:00', close: '18:00', isOpen: true },
                sunday: { open: '00:00', close: '00:00', isOpen: false },
            },
            banner_url: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&q=80&w=1200',
            logo_url: null,
            subscription_plan_id: planId,
            subscription_status: 'active',
            subcategories: ['barberia'],
            services: [
                { name: 'Corte de Cabello', duration: 30, price: 6000, description: 'Corte clásico o moderno a elección.' },
                { name: 'Corte + Barba', duration: 50, price: 9000, description: 'Combo completo: corte y perfilado de barba.' },
                { name: 'Afeitado con Navaja', duration: 40, price: 7000, description: 'Experiencia clásica de barbería.' },
            ],
        },
        {
            name: 'Centro Kinésico Movite',
            slug: 'centro-kinesico-movite',
            type: 'service',
            category_id: catMap['salud'],
            location: 'Av. Presidente Illia 300, La Rioja',
            email: 'movite.kinesio@turnitoslr.com',
            password: 'Turnitos2025!',
            password_changed: true,
            whatsapp: '5493804567890',
            latitude: -29.4160, longitude: -66.8490,
            rating: 4.9,
            theme: 'light',
            primary_color: '#00B0FF',
            button_color: '#00B0FF',
            amenities: ['Wifi', 'Estacionamiento', 'Climatizado'],
            hours: {
                monday: { open: '08:00', close: '18:00', isOpen: true },
                tuesday: { open: '08:00', close: '18:00', isOpen: true },
                wednesday: { open: '08:00', close: '18:00', isOpen: true },
                thursday: { open: '08:00', close: '18:00', isOpen: true },
                friday: { open: '08:00', close: '16:00', isOpen: true },
                saturday: { open: '00:00', close: '00:00', isOpen: false },
                sunday: { open: '00:00', close: '00:00', isOpen: false },
            },
            banner_url: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&q=80&w=1200',
            logo_url: null,
            subscription_plan_id: planId,
            subscription_status: 'active',
            subcategories: [],
            services: [
                { name: 'Kinesiología Deportiva', duration: 60, price: 18000, description: 'Rehabilitación de lesiones musculares y articulares.' },
                { name: 'Masoterapia', duration: 50, price: 14000, description: 'Masajes terapéuticos para dolor muscular.' },
                { name: 'Electroterapia', duration: 40, price: 10000, description: 'Tratamiento con corrientes eléctricas para recuperación.' },
            ],
        },
        {
            name: 'Consultorio Psicológico Paz Interior',
            slug: 'consultorio-paz-interior',
            type: 'service',
            category_id: catMap['salud'],
            location: 'Joaquín V. González 550, La Rioja',
            email: 'paz.interior@turnitoslr.com',
            password: 'Turnitos2025!',
            password_changed: true,
            whatsapp: '5493804678901',
            latitude: -29.4090, longitude: -66.8510,
            rating: 5.0,
            theme: 'light',
            primary_color: '#6C63FF',
            button_color: '#6C63FF',
            amenities: ['Wifi', 'Sala de espera tranquila'],
            hours: {
                monday: { open: '09:00', close: '19:00', isOpen: true },
                tuesday: { open: '09:00', close: '19:00', isOpen: true },
                wednesday: { open: '09:00', close: '19:00', isOpen: true },
                thursday: { open: '09:00', close: '19:00', isOpen: true },
                friday: { open: '09:00', close: '17:00', isOpen: true },
                saturday: { open: '00:00', close: '00:00', isOpen: false },
                sunday: { open: '00:00', close: '00:00', isOpen: false },
            },
            banner_url: 'https://images.unsplash.com/photo-1509099836639-18ba1795216d?auto=format&fit=crop&q=80&w=1200',
            logo_url: null,
            subscription_plan_id: planId,
            subscription_status: 'active',
            subcategories: [],
            services: [
                { name: 'Consulta Individual', duration: 50, price: 20000, description: 'Sesión de psicoterapia individual.' },
                { name: 'Terapia de Pareja', duration: 60, price: 28000, description: 'Sesión orientada a mejorar la comunicación.' },
            ],
        },
        {
            name: 'Veterinaria Los Amigos',
            slug: 'veterinaria-los-amigos',
            type: 'service',
            category_id: catMap['mascotas'],
            location: 'San Nicolás de Bari 890, La Rioja',
            email: 'vet.amigos@turnitoslr.com',
            password: 'Turnitos2025!',
            password_changed: true,
            whatsapp: '5493804789012',
            latitude: -29.4200, longitude: -66.8570,
            rating: 4.6,
            theme: 'light',
            primary_color: '#43A047',
            button_color: '#43A047',
            amenities: ['Estacionamiento', 'Urgencias', 'Peluquería Canina', 'Farmacia'],
            hours: {
                monday: { open: '08:00', close: '20:00', isOpen: true },
                tuesday: { open: '08:00', close: '20:00', isOpen: true },
                wednesday: { open: '08:00', close: '20:00', isOpen: true },
                thursday: { open: '08:00', close: '20:00', isOpen: true },
                friday: { open: '08:00', close: '20:00', isOpen: true },
                saturday: { open: '09:00', close: '14:00', isOpen: true },
                sunday: { open: '10:00', close: '13:00', isOpen: true },
            },
            banner_url: 'https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?auto=format&fit=crop&q=80&w=1200',
            logo_url: null,
            subscription_plan_id: planId,
            subscription_status: 'active',
            subcategories: [],
            services: [
                { name: 'Consulta General', duration: 30, price: 8000, description: 'Revisación general de tu mascota.' },
                { name: 'Vacunación', duration: 15, price: 5000, description: 'Plan de vacunación completo.' },
                { name: 'Baño y Peluquería', duration: 90, price: 12000, description: 'Baño, secado, corte y perfume.' },
                { name: 'Castración', duration: 60, price: 35000, description: 'Intervención quirúrgica programada.' },
            ],
        },
        {
            name: 'Salón de Eventos El Dorado',
            slug: 'salon-el-dorado',
            type: 'alquiler',
            category_id: catMap['alquileres'],
            location: 'Av. del Maestro 1500, La Rioja',
            email: 'eldorado.salon@turnitoslr.com',
            password: 'Turnitos2025!',
            password_changed: true,
            whatsapp: '5493804890123',
            latitude: -29.4050, longitude: -66.8480,
            rating: 4.7,
            theme: 'light',
            primary_color: '#C9A84C',
            button_color: '#C9A84C',
            amenities: ['Salón Climatizado', 'Sonido Profesional', 'Proyector', 'Catering Opcional', 'Estacionamiento'],
            hours: defaultHours,
            banner_url: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&q=80&w=1200',
            logo_url: null,
            subscription_plan_id: planId,
            subscription_status: 'active',
            pricing_model: 'hourly',
            price_per_hour: 15000,
            max_capacity: 150,
            subcategories: [],
        },
    ];
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────
async function seed() {
    console.log('\n🌱 Starting seed (service role)...\n');

    const { catMap, subcatMap, planId } = await fetchReferences();
    if (!planId) { console.error('❌ No plan found.'); return; }

    const businesses = buildBusinesses({ catMap, planId });
    const inserted = [];

    console.log('\n📋 Inserting businesses...');
    for (const biz of businesses) {
        const { subcategories: subcatNames, courts, services, ...bizRecord } = biz;

        // Upsert business by email
        const bResult = await safe(`Business: ${biz.name}`, async () => {
            const { data, error } = await supabase
                .from('businesses')
                .upsert([bizRecord], { onConflict: 'email' })
                .select()
                .single();
            if (error) throw error;
            return data;
        });

        if (!bResult) continue;
        const bizId = bResult.id;

        // Subcategories
        if (subcatNames?.length > 0) {
            await safe(`  Subcats: ${biz.name}`, async () => {
                await supabase.from('business_subcategories').delete().eq('business_id', bizId);
                const rows = subcatNames.map(n => subcatMap[n.toLowerCase().trim()]).filter(Boolean)
                    .map(sid => ({ business_id: bizId, subcategory_id: sid }));
                if (rows.length > 0) {
                    const { error } = await supabase.from('business_subcategories').insert(rows);
                    if (error) throw error;
                }
            });
        }

        // Courts
        let firstCourtId = null;
        if (courts?.length > 0) {
            await safe(`  Courts: ${biz.name}`, async () => {
                await supabase.from('courts').delete().eq('business_id', bizId);
                const rows = courts.map(c => ({ id: uuid(), business_id: bizId, name: c.name, sport: c.sport, price: c.price }));
                const { data, error } = await supabase.from('courts').insert(rows).select();
                if (error) throw error;
                firstCourtId = data?.[0]?.id;
            });
        }

        // Services
        let firstServiceId = null;
        if (services?.length > 0) {
            await safe(`  Services: ${biz.name}`, async () => {
                await supabase.from('services').delete().eq('business_id', bizId);
                const rows = services.map(s => ({
                    business_id: bizId, name: s.name,
                    duration: s.duration, price: s.price, description: s.description
                }));
                const { data, error } = await supabase.from('services').insert(rows).select();
                if (error) throw error;
                firstServiceId = data?.[0]?.id;
            });
        }

        inserted.push({ ...biz, id: bizId, firstCourtId, firstServiceId });
    }

    // Bookings
    console.log('\n📅 Inserting bookings...');
    const customers = [
        { name: 'JUAN PEREZ', phone: '3804111222' },
        { name: 'MARIA GONZALEZ', phone: '3804222333' },
        { name: 'CARLOS LOPEZ', phone: '3804333444' },
        { name: 'ANA MARTINEZ', phone: '3804444555' },
        { name: 'ROBERTO SANCHEZ', phone: '3804555666' },
        { name: 'LAURA TORRES', phone: '3804666777' },
        { name: 'DIEGO FERNANDEZ', phone: '3804777888' },
        { name: 'SOFIA DIAZ', phone: '3804888999' },
    ];

    const statuses = ['confirmed', 'confirmed', 'confirmed', 'pending', 'cancelled', 'completed'];
    const bookingsToInsert = [];

    for (const biz of inserted) {
        const resourceId = biz.firstCourtId || biz.firstServiceId;
        const numBookings = Math.floor(Math.random() * 6) + 4;

        for (let i = 0; i < numBookings; i++) {
            const daysOffset = Math.floor(Math.random() * 40) - 10;
            const date = new Date();
            date.setDate(date.getDate() + daysOffset);
            const dateStr = date.toISOString().split('T')[0];
            const hour = [9, 10, 11, 14, 15, 16, 17, 18][Math.floor(Math.random() * 8)];
            const time = `${String(hour).padStart(2, '0')}:00`;
            const customer = customers[Math.floor(Math.random() * customers.length)];
            const status = statuses[Math.floor(Math.random() * statuses.length)];

            bookingsToInsert.push({
                business_id: biz.id,
                court_id: biz.firstCourtId || null,
                service_id: biz.firstServiceId || null,
                resource_id: resourceId || null,
                date: dateStr,
                time: time,
                customer_name: customer.name,
                customer_phone: customer.phone,
                status: status,
                price: biz.courts?.[0]?.price || biz.services?.[0]?.price || 10000,
            });
        }
    }

    await safe(`${bookingsToInsert.length} bookings`, async () => {
        const { error } = await supabase.from('bookings').insert(bookingsToInsert);
        if (error) throw error;
    });

    console.log(`\n✅ Seed complete!`);
    console.log(`   Businesses: ${inserted.length}`);
    console.log(`   Bookings: ${bookingsToInsert.length}`);
    console.log('\n🌐 URLs:');
    inserted.forEach(b => console.log(`   • ${b.name} → /${b.slug}/turnos`));
}

seed().catch(console.error);
