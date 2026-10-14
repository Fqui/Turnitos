// wa.me only works with the full international number (no +, spaces or dashes).
// Businesses usually save Argentine numbers locally (e.g. 3804123456), so we add the 549 prefix.
export function normalizeWhatsAppNumber(phone) {
    let digits = String(phone || '').replace(/\D/g, '');
    if (!digits) return '';
    digits = digits.replace(/^00/, '');
    if (digits.startsWith('549')) return digits;
    if (digits.startsWith('54')) return `549${digits.slice(2)}`;
    // Local format: drop the trunk 0 and the mobile 15 after a 3-digit area code (0380 15 4123456)
    digits = digits.replace(/^0/, '');
    if (digits.length === 12 && digits.slice(3, 5) === '15') digits = digits.slice(0, 3) + digits.slice(5);
    if (digits.length === 10) return `549${digits}`;
    return digits;
}

export function buildWhatsAppUrl(phone, text) {
    const number = normalizeWhatsAppNumber(phone);
    if (!number) return '';
    return text ? `https://wa.me/${number}?text=${encodeURIComponent(text)}` : `https://wa.me/${number}`;
}
