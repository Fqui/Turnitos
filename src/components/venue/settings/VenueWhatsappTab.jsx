import React from 'react';

export default function VenueWhatsappTab({
    formData,
    handleInputChange,
    cardStyle,
    sectionTitleStyle,
    labelStyle,
    inputStyle
}) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={cardStyle}>
                <h2 style={sectionTitleStyle}>💬 Plantillas de Mensajes de WhatsApp</h2>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 16px 0' }}>
                    Personaliza los textos automáticos que se envían a tus clientes desde el panel de reservas. Los campos entre llaves como <code>{'{cliente}'}</code>, <code>{'{fecha}'}</code>, <code>{'{total}'}</code>, <code>{'{seña}'}</code> se completarán automáticamente con los datos de cada reserva.
                </p>

                {/* Tags guide */}
                <div style={{
                    padding: '12px 14px',
                    background: 'rgba(37, 211, 102, 0.08)',
                    borderRadius: '12px',
                    border: '1px solid rgba(37, 211, 102, 0.25)',
                    marginBottom: '20px',
                    fontSize: '12px'
                }}>
                    <span style={{ fontWeight: '700', color: '#16a34a', display: 'block', marginBottom: '6px' }}>
                        🏷️ Variables dinámicas disponibles:
                    </span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {['{cliente}', '{negocio}', '{fecha}', '{invitados}', '{total}', '{seña}', '{saldo}', '{direccion}', '{adicionales}'].map(tag => (
                            <code
                                key={tag}
                                style={{
                                    padding: '3px 7px',
                                    borderRadius: '6px',
                                    background: 'var(--bg-card)',
                                    border: '1px solid var(--border)',
                                    fontSize: '11px',
                                    fontWeight: '700',
                                    color: 'var(--text-primary)'
                                }}
                            >
                                {tag}
                            </code>
                        ))}
                    </div>
                </div>

                {/* Template 1: Pedir Seña */}
                <div style={{ marginBottom: '22px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <label style={{ ...labelStyle, marginBottom: 0 }}>
                            💳 1. Mensaje para Pedir Seña
                        </label>
                        <button
                            type="button"
                            onClick={() => {
                                const def = "¡Hola {cliente}! 👋 Te escribimos de *{negocio}* para coordinar tu reserva del *{fecha}* ({invitados}). Para asegurar y reservar la fecha, solicitamos una seña de *${seña}* (Total: ${total}). Quedamos a disposición para pasarte los datos de pago.";
                                handleInputChange('whatsapp_templates', {
                                    ...(formData.whatsapp_templates || {}),
                                    pedir_sena: def
                                });
                            }}
                            style={{ fontSize: '11px', color: 'var(--primary-paddle)', background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: '600' }}
                        >
                            Restaurar por defecto
                        </button>
                    </div>
                    <textarea
                        rows={4}
                        style={{ ...inputStyle, resize: 'vertical' }}
                        value={formData.whatsapp_templates?.pedir_sena !== undefined ? formData.whatsapp_templates.pedir_sena : "¡Hola {cliente}! 👋 Te escribimos de *{negocio}* para coordinar tu reserva del *{fecha}* ({invitados}). Para asegurar y reservar la fecha, solicitamos una seña de *${seña}* (Total: ${total}). Quedamos a disposición para pasarte los datos de pago."}
                        onChange={e => handleInputChange('whatsapp_templates', {
                            ...(formData.whatsapp_templates || {}),
                            pedir_sena: e.target.value
                        })}
                        placeholder="Texto para solicitar la seña..."
                    />
                </div>

                {/* Template 2: Confirmar Reserva */}
                <div style={{ marginBottom: '22px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <label style={{ ...labelStyle, marginBottom: 0 }}>
                            🎉 2. Mensaje de Confirmación de Reserva
                        </label>
                        <button
                            type="button"
                            onClick={() => {
                                const def = "¡Hola {cliente}! 🎉 Tu reserva en *{negocio}* para el día *{fecha}* ha sido confirmada con éxito. Recuerda que el saldo pendiente a abonar al ingresar es de *${saldo}*. ¡Te esperamos!";
                                handleInputChange('whatsapp_templates', {
                                    ...(formData.whatsapp_templates || {}),
                                    confirmar_reserva: def
                                });
                            }}
                            style={{ fontSize: '11px', color: 'var(--primary-paddle)', background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: '600' }}
                        >
                            Restaurar por defecto
                        </button>
                    </div>
                    <textarea
                        rows={4}
                        style={{ ...inputStyle, resize: 'vertical' }}
                        value={formData.whatsapp_templates?.confirmar_reserva !== undefined ? formData.whatsapp_templates.confirmar_reserva : "¡Hola {cliente}! 🎉 Tu reserva en *{negocio}* para el día *{fecha}* ha sido confirmada con éxito. Recuerda que el saldo pendiente a abonar al ingresar es de *${saldo}*. ¡Te esperamos!"}
                        onChange={e => handleInputChange('whatsapp_templates', {
                            ...(formData.whatsapp_templates || {}),
                            confirmar_reserva: e.target.value
                        })}
                        placeholder="Texto para confirmar el turno..."
                    />
                </div>

                {/* Template 3: Recordatorio / Saldo */}
                <div style={{ marginBottom: '22px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <label style={{ ...labelStyle, marginBottom: 0 }}>
                            ⏰ 3. Mensaje de Recordatorio / Saldo Pendiente
                        </label>
                        <button
                            type="button"
                            onClick={() => {
                                const def = "¡Hola {cliente}! 😊 Te recordamos tu reserva en *{negocio}* para el *{fecha}*. El saldo a abonar al ingresar es de *${saldo}*. Si necesitas consultar algún adicional o detalle, no dudes en escribirnos.";
                                handleInputChange('whatsapp_templates', {
                                    ...(formData.whatsapp_templates || {}),
                                    recordatorio_saldo: def
                                });
                            }}
                            style={{ fontSize: '11px', color: 'var(--primary-paddle)', background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: '600' }}
                        >
                            Restaurar por defecto
                        </button>
                    </div>
                    <textarea
                        rows={4}
                        style={{ ...inputStyle, resize: 'vertical' }}
                        value={formData.whatsapp_templates?.recordatorio_saldo !== undefined ? formData.whatsapp_templates.recordatorio_saldo : "¡Hola {cliente}! 😊 Te recordamos tu reserva en *{negocio}* para el *{fecha}*. El saldo a abonar al ingresar es de *${saldo}*. Si necesitas consultar algún adicional o detalle, no dudes en escribirnos."}
                        onChange={e => handleInputChange('whatsapp_templates', {
                            ...(formData.whatsapp_templates || {}),
                            recordatorio_saldo: e.target.value
                        })}
                        placeholder="Texto para recordar la reserva..."
                    />
                </div>

                {/* Template 4: Ubicación e Instrucciones */}
                <div style={{ marginBottom: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <label style={{ ...labelStyle, marginBottom: 0 }}>
                            📍 4. Mensaje de Ubicación e Instrucciones
                        </label>
                        <button
                            type="button"
                            onClick={() => {
                                const def = "¡Hola {cliente}! 📍 Te enviamos la información de *{negocio}* para tu reserva del *{fecha}*:\nDirección: {direccion}\n¡Cualquier consulta estamos a disposición!";
                                handleInputChange('whatsapp_templates', {
                                    ...(formData.whatsapp_templates || {}),
                                    ubicacion: def
                                });
                            }}
                            style={{ fontSize: '11px', color: 'var(--primary-paddle)', background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: '600' }}
                        >
                            Restaurar por defecto
                        </button>
                    </div>
                    <textarea
                        rows={4}
                        style={{ ...inputStyle, resize: 'vertical' }}
                        value={formData.whatsapp_templates?.ubicacion !== undefined ? formData.whatsapp_templates.ubicacion : "¡Hola {cliente}! 📍 Te enviamos la información de *{negocio}* para tu reserva del *{fecha}*:\nDirección: {direccion}\n¡Cualquier consulta estamos a disposición!"}
                        onChange={e => handleInputChange('whatsapp_templates', {
                            ...(formData.whatsapp_templates || {}),
                            ubicacion: e.target.value
                        })}
                        placeholder="Texto con la dirección y cómo llegar..."
                    />
                </div>
            </div>
        </div>
    );
}
