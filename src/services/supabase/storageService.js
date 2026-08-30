import { supabase } from '../supabaseClient';

export function getPublicUrl(path) {
    const { data } = supabase.storage.from('business-images').getPublicUrl(path);
    return data.publicUrl;
}

export async function uploadImage(file) {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error } = await supabase.storage.from('business-images').upload(filePath, file);

    if (error) throw error;
    return getPublicUrl(filePath);
}
