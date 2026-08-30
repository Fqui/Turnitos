import { supabase } from '../supabaseClient';

export async function getCategories(businessType = null) {
    let query = supabase
        .from('categories')
        .select('*, subcategories(*)')
        .order('name', { ascending: true });

    if (businessType) {
        query = query.eq('business_type', businessType);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
}

export async function getCategoryById(id) {
    const { data, error } = await supabase
        .from('categories')
        .select('*, subcategories(*)')
        .eq('id', id)
        .single();

    if (error) throw error;
    return data;
}

export async function createCategory(categoryData) {
    const { data, error } = await supabase
        .from('categories')
        .insert([{
            name: categoryData.name,
            slug: categoryData.slug,
            icon: categoryData.icon,
            color: categoryData.color,
            business_type: categoryData.business_type,
            description: categoryData.description,
            display_order: categoryData.display_order || 0
        }])
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function updateCategory(id, categoryData) {
    const { data, error } = await supabase
        .from('categories')
        .update({
            name: categoryData.name,
            slug: categoryData.slug,
            icon: categoryData.icon,
            color: categoryData.color,
            business_type: categoryData.business_type,
            description: categoryData.description,
            display_order: categoryData.display_order
        })
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function deleteCategory(categoryId) {
    // Check if any businesses use this category
    const { data: businesses } = await supabase
        .from('businesses')
        .select('id')
        .eq('category_id', categoryId)
        .limit(1);

    if (businesses && businesses.length > 0) {
        throw new Error('No se puede eliminar la categoría porque hay negocios asociados');
    }

    const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', categoryId);

    if (error) throw error;
    return true;
}

export async function getSubcategories(categoryId = null) {
    let query = supabase
        .from('subcategories')
        .select('*')
        .order('display_order', { ascending: true });

    if (categoryId) {
        query = query.eq('category_id', categoryId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
}

export async function createSubcategory(subcategoryData) {
    const { data, error } = await supabase
        .from('subcategories')
        .insert([{
            category_id: subcategoryData.category_id,
            name: subcategoryData.name,
            slug: subcategoryData.slug,
            icon: subcategoryData.icon,
            description: subcategoryData.description,
            display_order: subcategoryData.display_order || 0
        }])
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function updateSubcategory(id, subcategoryData) {
    const { data, error } = await supabase
        .from('subcategories')
        .update({
            name: subcategoryData.name,
            slug: subcategoryData.slug,
            icon: subcategoryData.icon,
            description: subcategoryData.description,
            category_id: subcategoryData.category_id,
            display_order: subcategoryData.display_order
        })
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function deleteSubcategory(subcategoryId) {
    // Check if any businesses use this subcategory
    const { data: businesses } = await supabase
        .from('businesses')
        .select('id')
        .eq('subcategory_id', subcategoryId)
        .limit(1);

    if (businesses && businesses.length > 0) {
        throw new Error('No se puede eliminar la subcategoría porque hay negocios asociados');
    }

    const { error } = await supabase
        .from('subcategories')
        .delete()
        .eq('id', subcategoryId);

    if (error) throw error;
    return true;
}
