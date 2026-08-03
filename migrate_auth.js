import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Load env
const envText = fs.readFileSync('.env', 'utf8');
const env = {};
envText.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) env[parts[0].trim()] = parts.slice(1).join('=').trim();
});

// SERVICE ROLE KEY is required for auth.admin.createUser
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqdGFrcWJlZ3R0c2F6aGtjc212Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNTI5MiwiZXhwIjoyMDc5MjAxMjkyfQ.t-NQ7DKxonVxbTs95gGSYF863lKGF4zWZJ2L1HAmTMQ';
const supabase = createClient(env.VITE_SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function migrate() {
    console.log('🚀 Starting Auth Migration...');
    let sqlOutput = `
-- 1. ADD COLUMNS
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS auth_id uuid REFERENCES auth.users(id);
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS auth_id uuid REFERENCES auth.users(id);
ALTER TABLE super_admins ADD COLUMN IF NOT EXISTS auth_id uuid REFERENCES auth.users(id);

-- 2. LINK USERS
`;

    // 1. Migrate Businesses
    console.log('\nMigrating Businesses...');
    const { data: businesses } = await supabase.from('businesses').select('id, email, password');
    for (const b of (businesses || [])) {
        if (!b.email || !b.password) continue;
        console.log(`  Creating auth user for business: ${b.email}`);
        
        const { data: authData, error } = await supabase.auth.admin.createUser({
            email: b.email,
            password: b.password,
            email_confirm: true
        });

        if (error) {
            console.error(`  ❌ Failed for ${b.email}: ${error.message}`);
            // Check if user already exists
            if (error.message.includes('already registered')) {
                const { data: existingUser } = await supabase.auth.admin.listUsers();
                const user = existingUser?.users?.find(u => u.email === b.email);
                if (user) {
                    sqlOutput += `UPDATE businesses SET auth_id = '${user.id}' WHERE id = '${b.id}';\n`;
                    console.log(`  ✅ Recovered existing auth_id: ${user.id}`);
                }
            }
        } else if (authData?.user) {
            sqlOutput += `UPDATE businesses SET auth_id = '${authData.user.id}' WHERE id = '${b.id}';\n`;
            console.log(`  ✅ Created auth user: ${authData.user.id}`);
        }
    }

    // 2. Migrate Sellers
    console.log('\nMigrating Sellers...');
    const { data: sellers } = await supabase.from('sellers').select('id, email, password');
    for (const s of (sellers || [])) {
        if (!s.email || !s.password) continue;
        console.log(`  Creating auth user for seller: ${s.email}`);
        
        const { data: authData, error } = await supabase.auth.admin.createUser({
            email: s.email,
            password: s.password,
            email_confirm: true
        });

        if (error) {
            console.error(`  ❌ Failed for ${s.email}: ${error.message}`);
            if (error.message.includes('already registered')) {
                const { data: existingUser } = await supabase.auth.admin.listUsers();
                const user = existingUser?.users?.find(u => u.email === s.email);
                if (user) {
                    sqlOutput += `UPDATE sellers SET auth_id = '${user.id}' WHERE id = '${s.id}';\n`;
                    console.log(`  ✅ Recovered existing auth_id: ${user.id}`);
                }
            }
        } else if (authData?.user) {
            sqlOutput += `UPDATE sellers SET auth_id = '${authData.user.id}' WHERE id = '${s.id}';\n`;
            console.log(`  ✅ Created auth user: ${authData.user.id}`);
        }
    }

    // 3. Migrate Super Admins
    console.log('\nMigrating Super Admins...');
    const { data: admins } = await supabase.from('super_admins').select('id, email, password');
    for (const a of (admins || [])) {
        if (!a.email || !a.password) continue;
        console.log(`  Creating auth user for admin: ${a.email}`);
        
        const { data: authData, error } = await supabase.auth.admin.createUser({
            email: a.email,
            password: a.password,
            email_confirm: true
        });

        if (error) {
            console.error(`  ❌ Failed for ${a.email}: ${error.message}`);
            if (error.message.includes('already registered')) {
                const { data: existingUser } = await supabase.auth.admin.listUsers();
                const user = existingUser?.users?.find(u => u.email === a.email);
                if (user) {
                    sqlOutput += `UPDATE super_admins SET auth_id = '${user.id}' WHERE id = '${a.id}';\n`;
                    console.log(`  ✅ Recovered existing auth_id: ${user.id}`);
                }
            }
        } else if (authData?.user) {
            sqlOutput += `UPDATE super_admins SET auth_id = '${authData.user.id}' WHERE id = '${a.id}';\n`;
            console.log(`  ✅ Created auth user: ${authData.user.id}`);
        }
    }

    console.log('\n\n======================================================');
    console.log('✅ Auth users created in Supabase. RUN THIS SQL NOW:');
    console.log('======================================================\n');
    console.log(sqlOutput);
    console.log('\n======================================================');
}

migrate().catch(console.error);
