// Vista previa SOLO para desarrollo (npm run dev): la hoja "Compartir agenda" del panel con un
// negocio real (?slug=...), sin iniciar sesión. Las reservas salen de la vista pública. No se incluye en el build.
import React, { useEffect, useState } from 'react';
import serviceAdapter from '../../services/serviceAdapter';
import ShareAgendaSheet from '../../components/business/portal/ShareAgendaSheet';

export default function AgendaPreview() {
    const slug = new URLSearchParams(window.location.search).get('slug') || 'braids-lr-saloon';
    const [business, setBusiness] = useState(null);
    const [error, setError] = useState('');
    const [open, setOpen] = useState(true);

    useEffect(() => {
        serviceAdapter.getBusinessBySlug(slug)
            .then(found => (found ? setBusiness(found) : setError(`No existe el negocio "${slug}"`)))
            .catch(e => setError(e.message));
    }, [slug]);

    return (
        <div style={{ maxWidth: '640px', margin: '0 auto', padding: '24px 16px', display: 'grid', gap: '12px' }}>
            <h2 style={{ margin: 0, fontSize: '18px' }}>Agenda abierta · {business?.name || slug}</h2>
            {error && <p style={{ color: 'var(--error, #dc2626)' }}>{error}</p>}
            <button type="button" className="btn btn-primary" onClick={() => setOpen(true)} disabled={!business}>
                Compartir agenda
            </button>
            {open && business && <ShareAgendaSheet business={business} onClose={() => setOpen(false)} />}
        </div>
    );
}
