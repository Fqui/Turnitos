import React, { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { createBusinessLead, LEAD_CATEGORIES } from '../../services/supabase/leadService';
import '../../styles/support.css';

const EMPTY_LEAD = { businessName: '', category: '', contactName: '', phone: '', city: 'La Rioja', message: '' };

export default function BusinessLeadForm() {
    const [lead, setLead] = useState(EMPTY_LEAD);
    const [status, setStatus] = useState('idle'); // idle | sending | sent | error

    const update = (field) => (e) => setLead(prev => ({ ...prev, [field]: e.target.value }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setStatus('sending');
        try {
            await createBusinessLead(lead);
            setStatus('sent');
            setLead(EMPTY_LEAD);
        } catch (error) {
            console.error('Error sending business lead:', error);
            setStatus('error');
        }
    };

    if (status === 'sent') {
        return (
            <div className="sp-form-done" role="status">
                <span className="sp-icon"><CheckCircle2 size={26} aria-hidden="true" /></span>
                <h3>¡Recibimos tus datos!</h3>
                <p>Te vamos a escribir por WhatsApp para conocer tu negocio y armarte el perfil.</p>
            </div>
        );
    }

    return (
        <form className="sp-form" onSubmit={handleSubmit}>
            <div>
                <label htmlFor="lead-business" className="sp-label">Nombre del negocio *</label>
                <input id="lead-business" className="sp-input" required minLength={2} maxLength={120} value={lead.businessName} onChange={update('businessName')} />
            </div>
            <div>
                <label htmlFor="lead-category" className="sp-label">Rubro *</label>
                <select id="lead-category" className="sp-input" required value={lead.category} onChange={update('category')}>
                    <option value="" disabled>Elegí una opción</option>
                    {LEAD_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
            </div>
            <div className="sp-form-row">
                <div>
                    <label htmlFor="lead-name" className="sp-label">Tu nombre *</label>
                    <input id="lead-name" className="sp-input" required minLength={2} maxLength={120} autoComplete="name" value={lead.contactName} onChange={update('contactName')} />
                </div>
                <div>
                    <label htmlFor="lead-phone" className="sp-label">WhatsApp *</label>
                    <input id="lead-phone" className="sp-input" required type="tel" inputMode="tel" minLength={6} maxLength={30} autoComplete="tel" placeholder="380 4123456" value={lead.phone} onChange={update('phone')} />
                </div>
            </div>
            <div>
                <label htmlFor="lead-city" className="sp-label">Ciudad</label>
                <input id="lead-city" className="sp-input" maxLength={80} value={lead.city} onChange={update('city')} />
            </div>
            <div>
                <label htmlFor="lead-message" className="sp-label">¿Algo que quieras contarnos?</label>
                <textarea id="lead-message" className="sp-input" rows={3} maxLength={1000} placeholder="Ej: tengo 3 canchas de pádel y hoy tomo los turnos por WhatsApp" value={lead.message} onChange={update('message')} />
            </div>

            {status === 'error' && (
                <p role="alert" className="sp-form-error">
                    No pudimos enviar tus datos. Probá de nuevo o escribinos por WhatsApp.
                </p>
            )}

            <button type="submit" className="sp-btn sp-btn--primary sp-btn--block" disabled={status === 'sending'}>
                {status === 'sending' ? 'Enviando...' : 'Quiero sumar mi negocio'}
            </button>
            <p className="sp-form-note">Usamos estos datos solo para contactarte. No los compartimos con nadie.</p>
        </form>
    );
}
