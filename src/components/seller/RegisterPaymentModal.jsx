import React, { useState } from 'react';
import { X } from 'lucide-react';
import supabaseService from '../../services/supabaseService';
import { formatMoney } from '../../utils/billingUtils';

// Colors read the SuperAdmin theme tokens and fall back to a dark palette
// so the modal also works inside the seller panel.
const c = {
    overlay: 'var(--sa-overlay, rgba(0,0,0,0.6))',
    surface: 'var(--sa-surface, #161a21)',
    surface2: 'var(--sa-surface-2, #1c2129)',
    border: 'var(--sa-border, rgba(255,255,255,0.08))',
    text: 'var(--sa-text, #f2f4f7)',
    muted: 'var(--sa-text-muted, #8a94a3)',
    primary: 'var(--sa-primary, #10a472)',
    onPrimary: 'var(--sa-on-primary, #fff)',
    danger: 'var(--sa-danger, #f87171)'
};

const fieldStyle = {
    width: '100%',
    boxSizing: 'border-box',
    padding: '10px 12px',
    borderRadius: '8px',
    border: `1px solid ${c.border}`,
    background: c.surface2,
    color: c.text,
    font: 'inherit',
    fontSize: '14px'
};

const labelStyle = { display: 'block', fontSize: '12.5px', fontWeight: 600, color: c.muted, marginBottom: '6px' };

export default function RegisterPaymentModal({ business, monthlyPrice, onClose, onRegistered }) {
    const [months, setMonths] = useState(1);
    const [amount, setAmount] = useState(String(monthlyPrice || ''));
    const [method, setMethod] = useState('transferencia');
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
    const [notes, setNotes] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const changeMonths = (value) => {
        const m = Number(value);
        setMonths(m);
        if (monthlyPrice) setAmount(String(monthlyPrice * m));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        const parsedAmount = Number(amount);
        if (!parsedAmount || parsedAmount <= 0) {
            setError('Ingresá un monto mayor a 0');
            return;
        }
        setSaving(true);
        try {
            const result = await supabaseService.registerSubscriptionPayment(business.id, {
                months,
                amount: parsedAmount,
                method,
                paymentDate,
                notes: notes || null
            });
            onRegistered?.(result);
        } catch (err) {
            setError(err.message || 'No se pudo registrar el pago');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div
            onClick={onClose}
            style={{ position: 'fixed', inset: 0, background: c.overlay, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
        >
            <form
                onClick={(e) => e.stopPropagation()}
                onSubmit={handleSubmit}
                style={{ width: '100%', maxWidth: '420px', background: c.surface, color: c.text, border: `1px solid ${c.border}`, borderRadius: '14px', padding: '22px', boxShadow: '0 20px 50px rgba(0,0,0,0.35)' }}
            >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '18px' }}>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800 }}>Registrar pago</h3>
                        <p style={{ margin: '4px 0 0', fontSize: '13px', color: c.muted }}>
                            {business.name}{monthlyPrice ? ` · ${formatMoney(monthlyPrice)}/mes` : ''}
                        </p>
                    </div>
                    <button type="button" onClick={onClose} aria-label="Cerrar" style={{ background: 'transparent', border: 'none', color: c.muted, cursor: 'pointer', padding: 4 }}>
                        <X size={18} />
                    </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                    <div>
                        <label style={labelStyle}>Meses que cubre</label>
                        <select value={months} onChange={(e) => changeMonths(e.target.value)} style={fieldStyle}>
                            {[1, 2, 3, 6, 12].map(m => (
                                <option key={m} value={m}>{m} {m === 1 ? 'mes' : 'meses'}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label style={labelStyle}>Monto cobrado</label>
                        <input type="number" min="1" step="1" value={amount} onChange={(e) => setAmount(e.target.value)} style={fieldStyle} required />
                    </div>
                    <div>
                        <label style={labelStyle}>Medio</label>
                        <select value={method} onChange={(e) => setMethod(e.target.value)} style={fieldStyle}>
                            <option value="transferencia">Transferencia</option>
                            <option value="efectivo">Efectivo</option>
                            <option value="mercadopago">Mercado Pago</option>
                            <option value="otro">Otro</option>
                        </select>
                    </div>
                    <div>
                        <label style={labelStyle}>Fecha de pago</label>
                        <input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} style={fieldStyle} required />
                    </div>
                </div>

                <div style={{ marginBottom: '16px' }}>
                    <label style={labelStyle}>Nota (opcional)</label>
                    <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ej: comprobante #1234" style={fieldStyle} />
                </div>

                {error && (
                    <p style={{ margin: '0 0 12px', color: c.danger, fontSize: '13px', fontWeight: 600 }}>{error}</p>
                )}

                <button
                    type="submit"
                    disabled={saving}
                    style={{ width: '100%', padding: '11px', borderRadius: '9px', border: 'none', background: c.primary, color: c.onPrimary, fontWeight: 700, fontSize: '14px', cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.7 : 1 }}
                >
                    {saving ? 'Registrando...' : `Registrar ${formatMoney(amount)}`}
                </button>
                <p style={{ margin: '10px 0 0', fontSize: '12px', color: c.muted, textAlign: 'center' }}>
                    El negocio queda activo y su próximo vencimiento se corre {months} {months === 1 ? 'mes' : 'meses'}.
                </p>
            </form>
        </div>
    );
}
