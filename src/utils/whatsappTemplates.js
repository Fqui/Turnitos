// Messages the business sends to the customer from the booking details.
// Custom texts live in metadata.whatsapp_templates, hidden from the public view.
export const WHATSAPP_MESSAGE_TYPES = [
    {
        id: 'pedir_sena',
        label: 'Pedir seña',
        icon: '💳',
        text: '¡Hola {cliente}! 👋 Te escribimos de *{negocio}*. Para confirmar tu turno de {servicio} del *{fecha}* a las *{hora}* necesitamos una seña de *{monto_seña}*.\n\n{datos_bancarios}\n\nCuando la hagas, mandanos el comprobante por acá. ¡Gracias!'
    },
    {
        id: 'sena_recibida',
        label: 'Seña recibida',
        icon: '🙌',
        text: '¡Hola {cliente}! Recibimos tu seña de *{monto_seña}* para el turno del *{fecha}* a las *{hora}* en *{negocio}*. ¡Muchas gracias!'
    },
    {
        id: 'confirmar_turno',
        label: 'Confirmar turno',
        icon: '✅',
        text: '¡Hola {cliente}! Tu turno de {servicio} en *{negocio}* quedó confirmado para el *{fecha}* a las *{hora}*. ¡Te esperamos!'
    },
    {
        id: 'recordatorio',
        label: 'Recordatorio',
        icon: '⏰',
        text: '¡Hola {cliente}! Te recordamos tu turno en *{negocio}* el *{fecha}* a las *{hora}*. Te esperamos en {direccion}. Si no podés venir, avisanos por acá.'
    },
    {
        id: 'cancelacion',
        label: 'Cancelación',
        icon: '❌',
        text: '¡Hola {cliente}! Te avisamos que tu turno del *{fecha}* a las *{hora}* en *{negocio}* quedó cancelado. Si querés sacar otro, escribinos por acá.'
    }
];

export const WHATSAPP_VARIABLES = [
    'cliente', 'servicio', 'profesional', 'fecha', 'hora', 'monto_seña', 'total', 'saldo', 'cbu', 'alias', 'datos_bancarios', 'negocio', 'direccion'
];

export const WHATSAPP_SAMPLE_VALUES = {
    cliente: 'Ana',
    servicio: 'Corte y color',
    profesional: 'Sofi',
    fecha: 'viernes 14 de noviembre',
    hora: '17:30',
    monto_seña: '$5.000',
    total: '$20.000',
    saldo: '$15.000',
    cbu: '0000003100000000000000',
    alias: 'mi.negocio.mp',
    datos_bancarios: 'CBU: 0000003100000000000000\nAlias: mi.negocio.mp',
    negocio: 'Tu negocio',
    direccion: 'Av. Perón 123'
};

export const defaultWhatsappText = (typeId) => WHATSAPP_MESSAGE_TYPES.find(t => t.id === typeId)?.text || '';

// The old single template in payment_settings was the deposit request, so it still counts as one
export function getWhatsappTemplate(business, typeId) {
    const custom = (business?.whatsapp_templates || business?.metadata?.whatsapp_templates || {})[typeId];
    if (custom?.trim()) return custom;
    const legacy = (business?.payment_settings || business?.paymentSettings)?.whatsapp_template;
    if (typeId === 'pedir_sena' && legacy?.trim()) return legacy;
    return defaultWhatsappText(typeId);
}

export function formatBankDetails(bank) {
    return [
        bank?.cbu && `CBU: ${bank.cbu}`,
        bank?.alias && `Alias: ${bank.alias}`,
        bank?.account_holder && `Titular: ${bank.account_holder}`
    ].filter(Boolean).join('\n');
}

// Amounts already carry their $, so a template written as ${total} doesn't end up with two
export function fillWhatsappTemplate(template, values) {
    const aliases = { sena: 'monto_seña', 'seña': 'monto_seña', monto_sena: 'monto_seña', nombre: 'cliente' };
    return String(template || '')
        .replace(/(\$?)\{([^{}]+)\}/g, (match, dollar, rawKey) => {
            const key = rawKey.trim().toLowerCase();
            const value = values[aliases[key] || key];
            if (value === undefined) return match;
            return String(value).startsWith('$') ? value : `${dollar}${value}`;
        })
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}
