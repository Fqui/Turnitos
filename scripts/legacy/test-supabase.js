import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envText = fs.readFileSync('.env', 'utf8');
const env = {};
envText.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) { env[parts[0].trim()] = parts.slice(1).join('=').trim(); }
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function test() {
    const { data, error } = await supabase.from('categories').select('*');
    if (error) { console.error(error.message); return; }
    console.log('Categories:', JSON.stringify(data, null, 2));
}
test();
