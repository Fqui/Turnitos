import pg from 'pg';

const projectRef = 'pjtakqbegttsazhkcsmv';
const dbPassword = 'Turnitos2025!'; // Try project password

async function runMigration() {
    console.log('🔧 Connecting to Supabase PostgreSQL...\n');
    
    const client = new pg.Client({
        host: `db.${projectRef}.supabase.co`,
        port: 5432,
        database: 'postgres',
        user: 'postgres',
        password: dbPassword,
        ssl: { rejectUnauthorized: false }
    });
    
    try {
        await client.connect();
        console.log('✅ Connected!\n');
        
        const statements = [
            `ALTER TABLE promotions ADD COLUMN IF NOT EXISTS sport_type text`,
            `ALTER TABLE promotions ADD COLUMN IF NOT EXISTS service_id uuid`,
            `ALTER TABLE promotions ADD COLUMN IF NOT EXISTS discount_type text DEFAULT 'percentage'`,
            `ALTER TABLE promotions ADD COLUMN IF NOT EXISTS discount_value numeric DEFAULT 0`,
            `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS promo_id uuid`,
            `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS discount_applied numeric DEFAULT 0`,
        ];
        
        for (const sql of statements) {
            console.log(`  ▶ ${sql.substring(0, 65)}...`);
            await client.query(sql);
            console.log('    ✅ OK');
        }
        
        // Seed promo data
        console.log('\n📦 Updating promotions with discount data...');
        const result = await client.query('SELECT id, title FROM promotions');
        
        for (const row of result.rows) {
            const title = (row.title || '').toLowerCase();
            let sport_type = null;
            let discount_value = 0;
            
            if (title.includes('pádel') || title.includes('padel')) {
                sport_type = 'paddle';
                discount_value = 20;
            } else if (title.includes('2x1') || title.includes('corte') || title.includes('cabello')) {
                discount_value = 50;
            } else if (title.includes('spa') || title.includes('facial') || title.includes('tratamiento')) {
                discount_value = 30;
            }
            
            if (discount_value > 0) {
                console.log(`  "${row.title}" → sport=${sport_type}, discount=${discount_value}%`);
                await client.query(
                    'UPDATE promotions SET sport_type = $1, discount_type = $2, discount_value = $3 WHERE id = $4',
                    [sport_type, 'percentage', discount_value, row.id]
                );
            }
        }
        
        // Verify
        const verify = await client.query('SELECT id, title, sport_type, discount_type, discount_value FROM promotions');
        console.log('\n✅ Final state:');
        verify.rows.forEach(r => console.log(`  ${r.title}: sport=${r.sport_type}, type=${r.discount_type}, value=${r.discount_value}`));
        
        console.log('\n🎉 Migration & seed complete!\n');
    } catch (err) {
        if (err.message.includes('password') || err.message.includes('authentication')) {
            console.log(`❌ Auth failed with password "${dbPassword}".`);
            console.log('Please provide your Supabase database password, or run this SQL manually:');
            console.log('URL: https://supabase.com/dashboard/project/pjtakqbegttsazhkcsmv/sql/new\n');
            console.log(`
ALTER TABLE promotions ADD COLUMN IF NOT EXISTS sport_type text;
ALTER TABLE promotions ADD COLUMN IF NOT EXISTS service_id uuid;
ALTER TABLE promotions ADD COLUMN IF NOT EXISTS discount_type text DEFAULT 'percentage';
ALTER TABLE promotions ADD COLUMN IF NOT EXISTS discount_value numeric DEFAULT 0;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS promo_id uuid;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS discount_applied numeric DEFAULT 0;

UPDATE promotions SET sport_type = 'paddle', discount_type = 'percentage', discount_value = 20 WHERE lower(title) LIKE '%padel%' OR lower(title) LIKE '%pádel%';
UPDATE promotions SET discount_type = 'percentage', discount_value = 50 WHERE lower(title) LIKE '%2x1%' OR lower(title) LIKE '%corte%';
UPDATE promotions SET discount_type = 'percentage', discount_value = 30 WHERE lower(title) LIKE '%spa%' OR lower(title) LIKE '%facial%';
`);
        } else {
            console.error('❌ Error:', err.message);
        }
    } finally {
        try { await client.end(); } catch {}
    }
}

runMigration();
