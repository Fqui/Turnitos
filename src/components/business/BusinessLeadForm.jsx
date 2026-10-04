import React, { useState } from 'react';
import { createBusinessLead, LEAD_CATEGORIES } from '../../services/supabase/leadService';

const EMPTY_LEAD = { businessName: '', category: '', contactName: '', phone: '', city: 'La Rioja', message: '' };

const inputStyle = {
    width: '100%',
    padding: '14px 16px',
    borderRadius: '12px',
    border: '1px solid var(--border)',
    backgroundColor: 'var(--bg-main)',
    color: 'var(--text-primary)',
    fontSize: '16px',
    fontFamily: 'inherit',
    boxSizing: 'border-box'
};

const labelStyle = { display: 'block', fontSize: '14px', fontWeight: '700', marginBottom: '6px' };

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
            <div style={{ textAlign: 'center', padding: '32px 16px' }}>
                <div style={{ fontSize: '44px', marginBottom: '12px' }}>✅</div>
                <h3 style={{ fontSize: '22px', fontWeight: '800', marginBottom: '8px' }}>¡Recibimos tus datos!</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '16px', lineHeight: '1.6', margin: 0 }}>
                    Te vamos a escribir por WhatsApp para conocer tu negocio y armarte el perfil.
                </p>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '16px' }}>
            <div>
                <label htmlFor="lead-business" style={labelStyle}>Nombre del negocio *</label>
                <input id="lead-business" required minLength={2} maxLength={120} value={lead.businessName} onChange={update('businessName')} style={inputStyle} />
            </div>
            <div>
                <label htmlFor="lead-category" style={labelStyle}>Rubro *</label>
                <select id="lead-category" required value={lead.category} onChange={update('category')} style={inputStyle}>
                    <option value="" disabled>Elegí una opción</option>
                    {LEAD_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                <div>
                    <label htmlFor="lead-name" style={labelStyle}>Tu nombre *</label>
                    <input id="lead-name" required minLength={2} maxLength={120} autoComplete="name" value={lead.contactName} onChange={update('contactName')} style={inputStyle} />
                </div>
                <div>
                    <label htmlFor="lead-phone" style={labelStyle}>WhatsApp *</label>
                    <input id="lead-phone" required type="tel" inputMode="tel" minLength={6} maxLength={30} autoComplete="tel" placeholder="380 4123456" value={lead.phone} onChange={update('phone')} style={inputStyle} />
                </div>
            </div>
            <div>
                <label htmlFor="lead-city" style={labelStyle}>Ciudad</label>
                <input id="lead-city" maxLength={80} value={lead.city} onChange={update('city')} style={inputStyle} />
            </div>
            <div>
                <label htmlFor="lead-message" style={labelStyle}>¿Algo que quieras contarnos?</label>
                <textarea id="lead-message" rows={3} maxLength={1000} placeholder="Ej: tengo 3 canchas de pádel y hoy tomo los turnos por WhatsApp" value={lead.message} onChange={update('message')} style={{ ...inputStyle, resize: 'vertical' }} />
            </div>

            {status === 'error' && (
                <p role="alert" style={{ color: '#EF4444', fontSize: '14px', margin: 0 }}>
                    No pudimos enviar tus datos. Probá de nuevo o escribinos por WhatsApp.
                </p>
            )}

            <button
                type="submit"
                disabled={status === 'sending'}
                style={{
                    padding: '16px',
                    backgroundColor: '#00E676',
                    color: '#000',
                    border: 'none',
                    borderRadius: '50px',
                    fontWeight: '800',
                    fontSize: '17px',
                    cursor: status === 'sending' ? 'wait' : 'pointer',
                    opacity: status === 'sending' ? 0.7 : 1
                }}
            >
                {status === 'sending' ? 'Enviando...' : 'Quiero sumar mi negocio'}
            </button>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', textAlign: 'center', margin: 0 }}>
                Usamos estos datos solo para contactarte. No los compartimos con nadie.
            </p>
        </form>
    );
}
