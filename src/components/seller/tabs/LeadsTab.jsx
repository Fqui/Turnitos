import React, { useCallback, useEffect, useState } from 'react';
import { getBusinessLeads, updateBusinessLeadStatus, LEAD_CATEGORIES, LEAD_STATUSES } from '../../../services/supabase/leadService';

const categoryLabel = (value) => LEAD_CATEGORIES.find(c => c.value === value)?.label || value;

function whatsappUrl(lead) {
    let digits = (lead.phone || '').replace(/\D/g, '');
    if (!digits.startsWith('54')) digits = `549${digits}`;
    const text = `Hola ${lead.contact_name}, te escribimos de TurnitosLR por el alta de ${lead.business_name}.`;
    return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

export default function LeadsTab() {
    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            setLeads(await getBusinessLeads());
        } catch (err) {
            console.error('Error loading business leads:', err);
            setError('No se pudieron cargar los pedidos de alta.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const handleStatusChange = async (lead, status) => {
        const previous = lead.status;
        setLeads(prev => prev.map(l => (l.id === lead.id ? { ...l, status } : l)));
        try {
            await updateBusinessLeadStatus(lead.id, status);
        } catch (err) {
            console.error('Error updating lead status:', err);
            setLeads(prev => prev.map(l => (l.id === lead.id ? { ...l, status: previous } : l)));
        }
    };

    const pending = leads.filter(l => l.status === 'nuevo').length;

    return (
        <div className="sa-card">
            <div className="sa-card-header">
                <div>
                    <h2 className="sa-card-title">Pedidos de alta</h2>
                    <p className="sa-card-sub">Negocios que dejaron sus datos en la página Para Negocios</p>
                </div>
                {pending > 0 && <span className="sa-badge tone-info">{pending} sin contactar</span>}
            </div>

            {loading ? (
                <div className="sa-empty">Cargando...</div>
            ) : error ? (
                <div className="sa-empty">{error}</div>
            ) : leads.length === 0 ? (
                <div className="sa-empty">Todavía no hay pedidos de alta.</div>
            ) : (
                <div className="sa-table-wrap">
                    <table className="sa-table">
                        <thead>
                            <tr>
                                <th>Negocio</th>
                                <th>Contacto</th>
                                <th>Mensaje</th>
                                <th>Fecha</th>
                                <th>Estado</th>
                            </tr>
                        </thead>
                        <tbody>
                            {leads.map(lead => (
                                <tr key={lead.id}>
                                    <td>
                                        <div className="is-strong">{lead.business_name}</div>
                                        <div>{categoryLabel(lead.category)}{lead.city ? ` · ${lead.city}` : ''}</div>
                                    </td>
                                    <td>
                                        <div>{lead.contact_name}</div>
                                        <a href={whatsappUrl(lead)} target="_blank" rel="noopener noreferrer">{lead.phone}</a>
                                    </td>
                                    <td style={{ maxWidth: '280px', whiteSpace: 'normal' }}>{lead.message || '—'}</td>
                                    <td>{new Date(lead.created_at).toLocaleDateString('es-AR')}</td>
                                    <td>
                                        <select
                                            value={lead.status}
                                            onChange={(e) => handleStatusChange(lead, e.target.value)}
                                            className={`sa-badge tone-${LEAD_STATUSES[lead.status]?.tone || 'neutral'}`}
                                            style={{ border: 'none', cursor: 'pointer' }}
                                        >
                                            {Object.entries(LEAD_STATUSES).map(([value, { label }]) => (
                                                <option key={value} value={value}>{label}</option>
                                            ))}
                                        </select>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
