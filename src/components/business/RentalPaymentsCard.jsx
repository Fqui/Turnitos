import React, { useState } from 'react';

const METHODS = ['Efectivo', 'Transferencia', 'Otro'];

const todayKey = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

const formatMoney = (value) => `$${Number(value || 0).toLocaleString('es-AR')}`;

const formatDay = (dateKey) => {
    const [y, m, d] = String(dateKey || '').split('-');
    return y && m && d ? `${d}/${m}/${y}` : dateKey;
};

const inputStyle = {
    width: '100%',
    padding: '8px 10px',
    borderRadius: '8px',
    border: '1px solid var(--border)',
    background: 'var(--bg-card)',
    color: 'var(--text-primary)',
    fontSize: '13px',
    fontWeight: '600',
    boxSizing: 'border-box'
};

/**
 * Payments the business agreed with the client for a rental (seña, cuotas, saldo).
 * They live in booking.metadata.payments; the app only keeps the record.
 */
export default function RentalPaymentsCard({ payments, total, onSave }) {
    const [showForm, setShowForm] = useState(false);
    const [amount, setAmount] = useState('');
    const [method, setMethod] = useState(METHODS[0]);
    const [date, setDate] = useState(todayKey());
    const [note, setNote] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const paid = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const balance = Math.max(0, Number(total || 0) - paid);

    const resetForm = () => {
        setAmount('');
        setMethod(METHODS[0]);
        setDate(todayKey());
        setNote('');
        setError('');
        setShowForm(false);
    };

    const save = async (nextPayments, label) => {
        setSaving(true);
        setError('');
        try {
            await onSave(nextPayments, label);
            return true;
        } catch (e) {
            setError(e?.message || 'No se pudo guardar el pago');
            return false;
        } finally {
            setSaving(false);
        }
    };

    const handleAdd = async () => {
        const value = Number(amount);
        if (!value || value <= 0) {
            setError('Ingresá un monto mayor a 0');
            return;
        }
        const payment = {
            id: `${Date.now()}`,
            amount: value,
            method,
            date: date || todayKey(),
            note: note.trim(),
            created_at: new Date().toISOString()
        };
        if (await save([...payments, payment], `Pago registrado: ${formatMoney(value)} (${method})`)) {
            resetForm();
        }
    };

    const handleRemove = async (payment) => {
        await save(payments.filter(p => p.id !== payment.id), `Pago borrado: ${formatMoney(payment.amount)}`);
    };

    return (
        <div style={{
            padding: '12px',
            borderRadius: '12px',
            background: 'var(--bg-main)',
            border: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                    🧾 Pagos del cliente
                </span>
                {!showForm && (
                    <button
                        type="button"
                        onClick={() => setShowForm(true)}
                        style={{
                            padding: '6px 10px',
                            borderRadius: '8px',
                            border: '1px solid var(--primary-paddle)',
                            background: 'rgba(0, 230, 118, 0.1)',
                            color: 'var(--primary-paddle)',
                            fontSize: '12px',
                            fontWeight: '700',
                            cursor: 'pointer'
                        }}
                    >
                        + Registrar pago
                    </button>
                )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '600' }}>Cobrado</div>
                    <div style={{ fontSize: '16px', fontWeight: '900', color: 'var(--primary-paddle)' }}>{formatMoney(paid)}</div>
                </div>
                <div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '600' }}>Falta cobrar</div>
                    <div style={{ fontSize: '16px', fontWeight: '900', color: balance > 0 ? '#E11D48' : 'var(--primary-paddle)' }}>{formatMoney(balance)}</div>
                </div>
            </div>

            {payments.length === 0 && !showForm && (
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    Todavía no registraste pagos. Anotá cada pago que te haga el cliente (seña, cuotas o saldo).
                </div>
            )}

            {payments.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {payments.map(p => (
                        <div key={p.id} style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '8px 10px',
                            borderRadius: '8px',
                            background: 'var(--bg-card)',
                            border: '1px solid var(--border)'
                        }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-primary)' }}>
                                    {formatMoney(p.amount)} <span style={{ fontWeight: '600', color: 'var(--text-secondary)' }}>· {p.method}</span>
                                </div>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {formatDay(p.date)}{p.note ? ` · ${p.note}` : ''}
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => handleRemove(p)}
                                disabled={saving}
                                title="Borrar pago"
                                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '15px', padding: '4px' }}
                            >
                                🗑️
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {showForm && (
                <div style={{ display: 'grid', gap: '8px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <input
                            type="number"
                            min="0"
                            inputMode="numeric"
                            placeholder="Monto"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            style={inputStyle}
                        />
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            style={inputStyle}
                        />
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                        {METHODS.map(m => (
                            <button
                                key={m}
                                type="button"
                                onClick={() => setMethod(m)}
                                style={{
                                    flex: 1,
                                    padding: '6px 8px',
                                    borderRadius: '8px',
                                    border: method === m ? '1px solid var(--primary-paddle)' : '1px solid var(--border)',
                                    background: method === m ? 'rgba(0, 230, 118, 0.15)' : 'var(--bg-card)',
                                    color: method === m ? 'var(--primary-paddle)' : 'var(--text-primary)',
                                    fontSize: '12px',
                                    fontWeight: method === m ? '800' : '600',
                                    cursor: 'pointer'
                                }}
                            >
                                {m}
                            </button>
                        ))}
                    </div>
                    <input
                        type="text"
                        placeholder="Nota (opcional): seña, primera cuota..."
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        style={inputStyle}
                    />
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            type="button"
                            onClick={resetForm}
                            disabled={saving}
                            style={{ flex: 1, padding: '8px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-secondary)', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            onClick={handleAdd}
                            disabled={saving}
                            style={{ flex: 1, padding: '8px', borderRadius: '8px', border: 'none', background: 'var(--primary-paddle)', color: '#0B0F14', fontWeight: '800', fontSize: '12px', cursor: 'pointer', opacity: saving ? 0.6 : 1 }}
                        >
                            {saving ? 'Guardando...' : 'Guardar pago'}
                        </button>
                    </div>
                </div>
            )}

            {error && (
                <div style={{ fontSize: '12px', color: '#E11D48', fontWeight: '600' }}>{error}</div>
            )}
        </div>
    );
}
