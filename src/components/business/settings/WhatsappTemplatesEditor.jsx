import React, { useRef, useState } from 'react';
import {
    WHATSAPP_MESSAGE_TYPES,
    WHATSAPP_SAMPLE_VALUES,
    WHATSAPP_VARIABLES,
    defaultWhatsappText,
    fillWhatsappTemplate,
    getWhatsappTemplate
} from '../../../utils/whatsappTemplates';

const chipStyle = {
    padding: '6px 10px',
    borderRadius: '8px',
    border: '1px solid var(--border)',
    background: 'var(--bg-card)',
    color: 'var(--text-primary)',
    fontSize: '12px',
    fontWeight: '600',
    fontFamily: 'inherit',
    cursor: 'pointer'
};

export default function WhatsappTemplatesEditor({ formData, handleInputChange, inputStyle }) {
    const [typeId, setTypeId] = useState(WHATSAPP_MESSAGE_TYPES[0].id);
    const textareaRef = useRef(null);
    const templates = formData.whatsapp_templates || formData.metadata?.whatsapp_templates || {};
    const text = templates[typeId] ?? getWhatsappTemplate(formData, typeId);

    const updateText = (value) => handleInputChange('whatsapp_templates', { ...templates, [typeId]: value });

    const insertVariable = (name) => {
        const el = textareaRef.current;
        const tag = `{${name}}`;
        const start = el?.selectionStart ?? text.length;
        const end = el?.selectionEnd ?? text.length;
        updateText(text.slice(0, start) + tag + text.slice(end));
        requestAnimationFrame(() => {
            el?.focus();
            el?.setSelectionRange(start + tag.length, start + tag.length);
        });
    };

    return (
        <div style={{ marginBottom: '24px', padding: '20px', background: 'var(--bg-main)', borderRadius: '12px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '8px', color: 'var(--text-primary)' }}>
                💬 Plantillas de mensajes de WhatsApp
            </h4>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px', lineHeight: '1.4' }}>
                Elegí el tipo de mensaje y escribilo como quieras. Se usa en el botón de WhatsApp del detalle de cada turno, con los datos del cliente ya completos.
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
                {WHATSAPP_MESSAGE_TYPES.map(type => (
                    <button
                        key={type.id}
                        type="button"
                        aria-pressed={type.id === typeId}
                        onClick={() => setTypeId(type.id)}
                        style={{
                            ...chipStyle,
                            ...(type.id === typeId ? { background: 'var(--primary-paddle)', borderColor: 'var(--primary-paddle)', color: 'white' } : {})
                        }}
                    >
                        {type.icon} {type.label}
                    </button>
                ))}
            </div>

            <textarea
                ref={textareaRef}
                value={text}
                onChange={(e) => updateText(e.target.value)}
                aria-label="Texto del mensaje"
                style={{
                    ...inputStyle,
                    minHeight: '130px',
                    resize: 'vertical',
                    fontFamily: 'inherit',
                    fontSize: '14px',
                    lineHeight: '1.5'
                }}
            />

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', margin: '10px 0 14px' }}>
                {WHATSAPP_VARIABLES.map(name => (
                    <button key={name} type="button" onClick={() => insertVariable(name)} style={{ ...chipStyle, padding: '4px 8px', fontSize: '11px' }}>
                        {`{${name}}`}
                    </button>
                ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)' }}>Vista previa</span>
                <button
                    type="button"
                    onClick={() => updateText(defaultWhatsappText(typeId))}
                    style={{ fontSize: '12px', color: 'var(--primary-paddle)', background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: '600', fontFamily: 'inherit' }}
                >
                    Restaurar por defecto
                </button>
            </div>
            <div style={{
                padding: '10px 12px',
                borderRadius: '10px',
                background: 'rgba(37, 211, 102, 0.1)',
                border: '1px solid rgba(37, 211, 102, 0.3)',
                color: 'var(--text-primary)',
                fontSize: '13px',
                lineHeight: '1.45',
                whiteSpace: 'pre-wrap',
                overflowWrap: 'anywhere'
            }}>
                {fillWhatsappTemplate(text, WHATSAPP_SAMPLE_VALUES)}
            </div>
        </div>
    );
}
