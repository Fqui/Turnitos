import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://pjtakqbegttsazhkcsmv.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqdGFrcWJlZ3R0c2F6aGtjc212Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNTI5MiwiZXhwIjoyMDc5MjAxMjkyfQ.t-NQ7DKxonVxbTs95gGSYF863lKGF4zWZJ2L1HAmTMQ';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function run() {
    try {
        console.log("Fetching active businesses...");
        const { data: businesses, error: busError } = await supabase
            .from('businesses')
            .select('id, name');

        if (busError) throw busError;
        console.log("Businesses in database:", businesses.map(b => `${b.name} (${b.id})`));

        // Find relevant businesses
        const padelBiz = businesses.find(b => b.name.toLowerCase().includes('pádel') || b.name.toLowerCase().includes('padel'));
        const barberBiz = businesses.find(b => b.name.toLowerCase().includes('barber') || b.name.toLowerCase().includes('king'));
        const glowBiz = businesses.find(b => b.name.toLowerCase().includes('glow') || b.name.toLowerCase().includes('estética') || b.name.toLowerCase().includes('estetica'));
        
        // Fallback to first businesses if not found
        const b1 = padelBiz || businesses[0];
        const b2 = barberBiz || businesses[1] || businesses[0];
        const b3 = glowBiz || businesses[2] || businesses[0];

        console.log("Selected businesses for promotions:", {
            padel: b1?.name,
            barber: b2?.name,
            glow: b3?.name
        });

        // Clean existing promotions first to have a fresh set
        console.log("Cleaning old promotions...");
        const { error: deleteError } = await supabase
            .from('promotions')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

        if (deleteError) console.log("Note on delete:", deleteError.message);

        const newPromotions = [];

        if (b1) {
            newPromotions.push({
                title: '20% OFF en Turnos Nocturnos de Pádel',
                discount: '20% OFF',
                image: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?q=80&w=1200&auto=format&fit=crop',
                business_id: b1.id,
                description: 'Aplica para reservas de Lunes a Jueves después de las 20:00 hs.'
            });
        }

        if (b2) {
            newPromotions.push({
                title: '2x1 los Martes en Cortes de Cabello y Barba',
                discount: '2x1',
                image: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?q=80&w=1200&auto=format&fit=crop',
                business_id: b2.id,
                description: 'Reserva tu turno para los días Martes y paga la mitad con un amigo.'
            });
        }

        if (b3) {
            newPromotions.push({
                title: 'Día de Spa: 30% OFF en Tratamientos Faciales',
                discount: '30% OFF',
                image: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?q=80&w=1200&auto=format&fit=crop',
                business_id: b3.id,
                description: 'Regálate un momento de relax con profesionales de primer nivel.'
            });
        }

        console.log("Inserting new promotions:", newPromotions);
        const { data: inserted, error: insertError } = await supabase
            .from('promotions')
            .insert(newPromotions)
            .select();

        if (insertError) throw insertError;
        console.log("SUCCESS! Seeded promotions:", inserted);

    } catch (err) {
        console.error("Exception seeding promotions:", err);
    }
}

run();
