import { supabase } from '../supabaseClient';

export const LEAD_CATEGORIES = [
    { value: 'deportes', label: 'Canchas y deportes' },
    { value: 'servicios', label: 'Peluquería, estética y servicios' },
    { value: 'salud', label: 'Salud y consultorios' },
    { value: 'alquileres', label: 'Quinchos, salones y alquileres' },
    { value: 'otro', label: 'Otro' }
];

export const LEAD_STATUSES = {
    nuevo: { label: 'Nuevo', tone: 'info' },
    contactado: { label: 'Contactado', tone: 'warning' },
    alta: { label: 'Dado de alta', tone: 'success' },
    descartado: { label: 'Descartado', tone: 'neutral' }
};

/**
 * Guarda un pedido de alta enviado desde /negocios.
 * Sin .select(): los visitantes pueden insertar pero no leer la tabla (RLS).
 */
export async function createBusinessLead(lead) {
    const clean = (value) => (value || '').trim() || null;
    const { error } = await supabase.from('business_leads').insert({
        business_name: clean(lead.businessName),
        category: lead.category,
        contact_name: clean(lead.contactName),
        phone: clean(lead.phone),
        city: clean(lead.city),
        message: clean(lead.message)
    });
    if (error) throw error;
}

export async function getBusinessLeads() {
    const { data, error } = await supabase
        .from('business_leads')
        .select('*')
        .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
}

export async function updateBusinessLeadStatus(id, status) {
    const { error } = await supabase
        .from('business_leads')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id);
    if (error) throw error;
}
