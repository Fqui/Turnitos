import React from 'react';

export default function PoliciesAndPaymentsTab({
    formData,
    handleInputChange,
    handleSave,
    saving,
    isMobile,
    labelStyle,
    inputStyle,
    saveButtonStyle
}) {
    const rules = formData.booking_rules || {};
    const advanceBooking = rules.advance_booking || { min_hours: 2, max_days: 30 };
    const cancellation = rules.cancellation || { deadline_hours: 24, refund_policy: 'full' };
    const limits = rules.limits || { max_per_day: 5, max_per_week: 20 };
    const timeRules = rules.time || { min_duration: 60, max_duration: 240, buffer_minutes: 0 };

    // Payment Settings
    const paymentSettings = formData.payment_settings || {};
    const deposit = paymentSettings.deposit || { enabled: false, type: 'percentage', percentage: 30, fixed_amount: 0 };
    const methods = paymentSettings.methods || [{ type: 'cash', enabled: true }];
    const instructions = paymentSettings.instructions || '';
    const bankDetails = paymentSettings.bank_details || { bank_name: '', account_holder: '', cbu: '', alias: '' };
    const whatsappTemplate = paymentSettings.whatsapp_template || '';

    return (
        <div style={{ display: 'grid', gap: '24px' }}>
            <div>
                <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '8px', color: 'var(--text-primary)' }}>
                    Reglas de Reserva
                </h3>
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
                    Configura las políticas y restricciones para las reservas de tu negocio.
                </p>

                {/* Advance Booking */}
                <div style={{ marginBottom: '24px', padding: '20px', background: 'var(--bg-main)', borderRadius: '12px' }}>
                    <h4 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '16px', color: 'var(--text-primary)' }}>
                        ⏰ Reserva Anticipada
                    </h4>
                    <div style={{ display: 'grid', gap: '12px', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr' }}>
                        <div>
                            <label style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
                                Mínimo de horas de anticipación
                            </label>
                            <input
                                type="number"
                                min="0"
                                value={advanceBooking.min_hours}
                                onChange={(e) => handleInputChange('booking_rules', {
                                    ...rules,
                                    advance_booking: { ...advanceBooking, min_hours: parseInt(e.target.value) || 0 }
                                })}
                                style={inputStyle}
                            />
                        </div>
                        <div>
                            <label style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
                                Máximo de días de anticipación
                            </label>
                            <input
                                type="number"
                                min="1"
                                max="365"
                                value={advanceBooking.max_days}
                                onChange={(e) => handleInputChange('booking_rules', {
                                    ...rules,
                                    advance_booking: { ...advanceBooking, max_days: parseInt(e.target.value) || 30 }
                                })}
                                style={inputStyle}
                            />
                        </div>
                    </div>
                </div>

                {/* Cancellation Policy */}
                <div style={{ marginBottom: '24px', padding: '20px', background: 'var(--bg-main)', borderRadius: '12px' }}>
                    <h4 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '16px', color: 'var(--text-primary)' }}>
                        ❌ Política de Cancelación
                    </h4>
                    <div style={{ display: 'grid', gap: '12px', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr' }}>
                        <div>
                            <label style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
                                Plazo de cancelación (horas antes)
                            </label>
                            <input
                                type="number"
                                min="0"
                                value={cancellation.deadline_hours}
                                onChange={(e) => handleInputChange('booking_rules', {
                                    ...rules,
                                    cancellation: { ...cancellation, deadline_hours: parseInt(e.target.value) || 0 }
                                })}
                                style={inputStyle}
                            />
                        </div>
                        <div>
                            <label style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
                                Política de reembolso
                            </label>
                            <select
                                value={cancellation.refund_policy}
                                onChange={(e) => handleInputChange('booking_rules', {
                                    ...rules,
                                    cancellation: { ...cancellation, refund_policy: e.target.value }
                                })}
                                style={inputStyle}
                            >
                                <option value="full">Reembolso completo</option>
                                <option value="partial">Reembolso parcial</option>
                                <option value="none">Sin reembolso</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Booking Limits */}
                <div style={{ marginBottom: '24px', padding: '20px', background: 'var(--bg-main)', borderRadius: '12px' }}>
                    <h4 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '16px', color: 'var(--text-primary)' }}>
                        📊 Límites de Reserva
                    </h4>
                    <div style={{ display: 'grid', gap: '12px', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr' }}>
                        <div>
                            <label style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
                                Máximo por cliente por día
                            </label>
                            <input
                                type="number"
                                min="1"
                                value={limits.max_per_day}
                                onChange={(e) => handleInputChange('booking_rules', {
                                    ...rules,
                                    limits: { ...limits, max_per_day: parseInt(e.target.value) || 1 }
                                })}
                                style={inputStyle}
                            />
                        </div>
                        <div>
                            <label style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
                                Máximo por cliente por semana
                            </label>
                            <input
                                type="number"
                                min="1"
                                value={limits.max_per_week}
                                onChange={(e) => handleInputChange('booking_rules', {
                                    ...rules,
                                    limits: { ...limits, max_per_week: parseInt(e.target.value) || 1 }
                                })}
                                style={inputStyle}
                            />
                        </div>
                    </div>
                </div>

                {/* Time Restrictions */}
                <div style={{ marginBottom: '24px', padding: '20px', background: 'var(--bg-main)', borderRadius: '12px' }}>
                    <h4 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '16px', color: 'var(--text-primary)' }}>
                        ⏱️ Restricciones de Tiempo
                    </h4>
                    <div style={{ display: 'grid', gap: '12px' }}>
                        <div>
                            <label style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
                                Tiempo de espera entre turnos (minutos)
                            </label>
                            <input
                                type="number"
                                min="0"
                                value={timeRules.buffer_minutes}
                                onChange={(e) => handleInputChange('booking_rules', {
                                    ...rules,
                                    time: { ...timeRules, buffer_minutes: parseInt(e.target.value) || 0 }
                                })}
                                style={inputStyle}
                            />
                            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                Tiempo de limpieza/preparación entre turnos
                            </p>
                        </div>
                    </div>
                </div>

                {/* Save Button */}
                <button
                    type="button"
                    onClick={() => handleSave()}
                    style={saveButtonStyle}
                    disabled={saving}
                >
                    {saving ? 'Guardando...' : 'Guardar Reglas'}
                </button>
            </div>

            {/* ================= PAYMENTS SECTION ================= */}
            <div style={{ padding: '24px 0', borderTop: '1px solid var(--border)' }}>
                <div style={{ display: 'grid', gap: '24px' }}>
                    <div>
                        <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '8px', color: 'var(--text-primary)' }}>
                            Pagos y Señas
                        </h3>
                        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
                            Configura los métodos de pago y requisitos de seña para las reservas.
                        </p>

                        {/* Deposit Configuration */}
                        <div style={{ marginBottom: '24px', padding: '20px', background: 'var(--bg-main)', borderRadius: '12px' }}>
                            <h4 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '16px', color: 'var(--text-primary)' }}>
                                💵 Configuración de Seña
                            </h4>

                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={deposit.enabled}
                                        onChange={(e) => handleInputChange('payment_settings', {
                                            ...paymentSettings,
                                            deposit: { ...deposit, enabled: e.target.checked }
                                        })}
                                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                    />
                                    <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>
                                        Requerir seña para reservas
                                    </span>
                                </label>
                            </div>

                            {deposit.enabled && (
                                <div style={{ display: 'grid', gap: '12px' }}>
                                    <div>
                                        <label style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
                                            Tipo de seña
                                        </label>
                                        <select
                                            value={deposit.type}
                                            onChange={(e) => handleInputChange('payment_settings', {
                                                ...paymentSettings,
                                                deposit: { ...deposit, type: e.target.value }
                                            })}
                                            style={inputStyle}
                                        >
                                            <option value="percentage">Porcentaje del total</option>
                                            <option value="fixed">Monto fijo</option>
                                        </select>
                                    </div>

                                    {deposit.type === 'percentage' ? (
                                        <div>
                                            <label style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
                                                Porcentaje de seña (%)
                                            </label>
                                            <input
                                                type="number"
                                                min="1"
                                                max="100"
                                                value={deposit.percentage}
                                                onChange={(e) => handleInputChange('payment_settings', {
                                                    ...paymentSettings,
                                                    deposit: { ...deposit, percentage: parseInt(e.target.value) || 30 }
                                                })}
                                                style={inputStyle}
                                            />
                                        </div>
                                    ) : (
                                        <div>
                                            <label style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
                                                Monto fijo de seña ($)
                                            </label>
                                            <input
                                                type="number"
                                                min="0"
                                                value={deposit.fixed_amount}
                                                onChange={(e) => handleInputChange('payment_settings', {
                                                    ...paymentSettings,
                                                    deposit: { ...deposit, fixed_amount: parseInt(e.target.value) || 0 }
                                                })}
                                                style={inputStyle}
                                            />
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Payment Methods */}
                        <div style={{ marginBottom: '24px', padding: '20px', background: 'var(--bg-main)', borderRadius: '12px' }}>
                            <h4 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '16px', color: 'var(--text-primary)' }}>
                                💳 Métodos de Pago Aceptados
                            </h4>

                            <div style={{ display: 'grid', gap: '12px' }}>
                                {['cash', 'transfer', 'mercadopago', 'card'].map(methodType => {
                                    const method = methods.find(m => m.type === methodType) || { type: methodType, enabled: false };
                                    const methodLabels = {
                                        cash: '💵 Efectivo',
                                        transfer: '🏦 Transferencia Bancaria',
                                        mercadopago: '💰 MercadoPago',
                                        card: '💳 Tarjeta de Crédito/Débito'
                                    };

                                    return (
                                        <label key={methodType} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                            <input
                                                type="checkbox"
                                                checked={method.enabled}
                                                onChange={(e) => {
                                                    const newMethods = methods.filter(m => m.type !== methodType);
                                                    if (e.target.checked) {
                                                        newMethods.push({ type: methodType, enabled: true });
                                                    }
                                                    handleInputChange('payment_settings', {
                                                        ...paymentSettings,
                                                        methods: newMethods
                                                    });
                                                }}
                                                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                            />
                                            <span style={{ fontSize: '14px', color: 'var(--text-primary)' }}>
                                                {methodLabels[methodType]}
                                            </span>
                                        </label>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Banking Details */}
                        <div style={{ marginBottom: '24px', padding: '20px', background: 'var(--bg-main)', borderRadius: '12px' }}>
                            <h4 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '16px', color: 'var(--text-primary)' }}>
                                🏦 Datos Bancarios
                            </h4>
                            <div style={{ display: 'grid', gap: '12px', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr' }}>
                                <div>
                                    <label style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
                                        Banco
                                    </label>
                                    <input
                                        type="text"
                                        value={bankDetails.bank_name || ''}
                                        onChange={(e) => handleInputChange('payment_settings', {
                                            ...paymentSettings,
                                            bank_details: { ...bankDetails, bank_name: e.target.value }
                                        })}
                                        placeholder="Ej: Banco Galicia"
                                        style={inputStyle}
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
                                        Titular de la cuenta
                                    </label>
                                    <input
                                        type="text"
                                        value={bankDetails.account_holder || ''}
                                        onChange={(e) => handleInputChange('payment_settings', {
                                            ...paymentSettings,
                                            bank_details: { ...bankDetails, account_holder: e.target.value }
                                        })}
                                        placeholder="Nombre del titular"
                                        style={inputStyle}
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
                                        CBU / CVU
                                    </label>
                                    <input
                                        type="text"
                                        value={bankDetails.cbu || ''}
                                        onChange={(e) => handleInputChange('payment_settings', {
                                            ...paymentSettings,
                                            bank_details: { ...bankDetails, cbu: e.target.value }
                                        })}
                                        placeholder="0000000000000000000000"
                                        style={inputStyle}
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
                                        Alias
                                    </label>
                                    <input
                                        type="text"
                                        value={bankDetails.alias || ''}
                                        onChange={(e) => handleInputChange('payment_settings', {
                                            ...paymentSettings,
                                            bank_details: { ...bankDetails, alias: e.target.value }
                                        })}
                                        placeholder="mi.alias.mp"
                                        style={inputStyle}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Payment Instructions */}
                        <div style={{ marginBottom: '24px' }}>
                            <label style={labelStyle}>Instrucciones Adicionales</label>
                            <textarea
                                value={instructions}
                                onChange={(e) => handleInputChange('payment_settings', {
                                    ...paymentSettings,
                                    instructions: e.target.value
                                })}
                                placeholder="Instrucciones extra para el cliente..."
                                style={{
                                    ...inputStyle,
                                    minHeight: '100px',
                                    resize: 'vertical',
                                    fontFamily: 'inherit'
                                }}
                            />
                            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                Información extra que quieras mostrar al cliente.
                            </p>
                        </div>

                        {/* WhatsApp Message Template */}
                        <div style={{ marginBottom: '24px', padding: '20px', background: 'var(--bg-main)', borderRadius: '12px' }}>
                            <h4 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '8px', color: 'var(--text-primary)' }}>
                                💬 Plantilla de Mensaje de WhatsApp (Pedir Seña)
                            </h4>
                            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px', lineHeight: '1.4' }}>
                                Personaliza el mensaje que se abrirá en WhatsApp para pedir la seña. Puedes usar las siguientes variables dentro del texto:
                                <br />
                                <code style={{ background: 'var(--bg-card)', padding: '2px 6px', border: '1px solid var(--border)', borderRadius: '4px', fontSize: '11px', marginRight: '6px', display: 'inline-block', marginTop: '6px' }}>{`{cliente}`}</code>
                                <code style={{ background: 'var(--bg-card)', padding: '2px 6px', border: '1px solid var(--border)', borderRadius: '4px', fontSize: '11px', marginRight: '6px', display: 'inline-block', marginTop: '6px' }}>{`{fecha}`}</code>
                                <code style={{ background: 'var(--bg-card)', padding: '2px 6px', border: '1px solid var(--border)', borderRadius: '4px', fontSize: '11px', marginRight: '6px', display: 'inline-block', marginTop: '6px' }}>{`{hora}`}</code>
                                <code style={{ background: 'var(--bg-card)', padding: '2px 6px', border: '1px solid var(--border)', borderRadius: '4px', fontSize: '11px', marginRight: '6px', display: 'inline-block', marginTop: '6px' }}>{`{negocio}`}</code>
                                <code style={{ background: 'var(--bg-card)', padding: '2px 6px', border: '1px solid var(--border)', borderRadius: '4px', fontSize: '11px', marginRight: '6px', display: 'inline-block', marginTop: '6px' }}>{`{seña}`}</code>
                                <code style={{ background: 'var(--bg-card)', padding: '2px 6px', border: '1px solid var(--border)', borderRadius: '4px', fontSize: '11px', display: 'inline-block', marginTop: '6px' }}>{`{datos_bancarios}`}</code>
                            </p>
                            <textarea
                                value={whatsappTemplate}
                                onChange={(e) => handleInputChange('payment_settings', {
                                    ...paymentSettings,
                                    whatsapp_template: e.target.value
                                })}
                                placeholder="Ej: Hola {cliente}, te recordamos realizar {seña} para confirmar tu turno del {fecha} en {negocio}.{datos_bancarios}"
                                style={{
                                    ...inputStyle,
                                    minHeight: '120px',
                                    resize: 'vertical',
                                    fontFamily: 'inherit',
                                    fontSize: '14px',
                                    lineHeight: '1.5'
                                }}
                            />
                        </div>

                        {/* Save Button */}
                        <button
                            type="button"
                            onClick={() => handleSave({
                                payment_settings: formData.payment_settings
                            })}
                            style={saveButtonStyle}
                            disabled={saving}
                        >
                            {saving ? 'Guardando...' : 'Guardar Configuración de Pagos'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
