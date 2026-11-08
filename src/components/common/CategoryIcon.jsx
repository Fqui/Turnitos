import React from 'react';

// Las categorías guardan un emoji en la base y cada sistema lo dibuja distinto:
// se muestra siempre la misma imagen de public/icons/categorias o el mismo dibujo
const IMAGES = {
    '🩺': 'salud',
    '⚕': 'salud',
    '🏡': 'alquileres',
    '⚡': 'todos'
};

const SHAPES = {
    // Same football as deportes.png plus a padel racket and ball in its flat style
    sports: (
        <>
            <ellipse cx="34" cy="56.500" rx="29" ry="6.500" fill="#6CC17E" />
            <image href="/icons/categorias/deportes.png" x="0" y="15" width="44" height="44" />
            <g transform="translate(48 23) rotate(-16) scale(0.92)">
                <rect x="-2.800" y="9" width="5.600" height="17" rx="2.400" fill="#2E3E50" />
                <rect x="-2.800" y="16" width="5.600" height="2" fill="#F4725A" />
                <rect x="-2.800" y="20.500" width="5.600" height="2" fill="#F4725A" />
                <path fill="#2E3E50" d="M-6.500 2L-2.800 11h5.600L6.500 2z" />
                <ellipse cx="0" cy="-8" rx="13" ry="14.500" fill="#2E3E50" />
                <ellipse cx="0" cy="-8" rx="10.300" ry="11.800" fill="#FFFFFF" />
                <g fill="#2E3E50">
                    <circle cx="-4.500" cy="-14" r="1.400" /><circle cx="0" cy="-14" r="1.400" /><circle cx="4.500" cy="-14" r="1.400" />
                    <circle cx="-6.300" cy="-9" r="1.400" /><circle cx="-2.100" cy="-9" r="1.400" /><circle cx="2.100" cy="-9" r="1.400" /><circle cx="6.300" cy="-9" r="1.400" />
                    <circle cx="-4.500" cy="-4" r="1.400" /><circle cx="0" cy="-4" r="1.400" /><circle cx="4.500" cy="-4" r="1.400" />
                    <circle cx="0" cy="1" r="1.400" />
                </g>
            </g>
            <circle cx="38" cy="53" r="6.300" fill="#2E3E50" />
            <circle cx="38" cy="53" r="4.200" fill="#E3EE4E" />
            <path fill="none" stroke="#FFFFFF" strokeWidth="1.300" strokeLinecap="round" d="M34.300 51.200c2.300 0 4 1.700 4 4M41.700 54.800c-2.300 0-4-1.700-4-4" />
        </>
    ),
    beauty: (
        <>
            <circle cx="32" cy="32" r="30" fill="#FFD9E8" />
            <path fill="#6D3F34" d="M32 7C19 7 12 17 12 30c0 9-2 15-6 19 6 6 14 9 26 9s20-3 26-9c-4-4-6-10-6-19C52 17 45 7 32 7z" />
            <path fill="#F0619F" d="M10 56c3-8 11-12 22-12s19 4 22 12c-6 5-13 8-22 8s-16-3-22-8z" />
            <path fill="#F5A97F" d="M26 36h12v11c-3 4-9 4-12 0z" />
            <ellipse cx="32" cy="28" rx="13" ry="15" fill="#FFC9A8" />
            <path fill="#FFD9BF" d="M32 13c7 0 13 7 13 15s-6 15-13 15z" />
            <path fill="#8A5244" d="M18 28c-1-11 6-18 14-18s15 7 14 18c-5-1-10-4-13-9-3 5-9 8-15 9z" />
            <circle cx="50" cy="50" r="12" fill="#FFFFFF" />
            <path fill="none" stroke="#F0619F" strokeWidth="2.500" strokeLinecap="round" d="M45 43l8 10M55 43l-8 10" />
            <circle cx="45.500" cy="55" r="2.600" fill="none" stroke="#F0619F" strokeWidth="2.200" />
            <circle cx="54.500" cy="55" r="2.600" fill="none" stroke="#F0619F" strokeWidth="2.200" />
        </>
    ),
    dog: (
        <>
            <path fill="#EDB57C" d="M32 9c13 0 20 9 20 21v10c0 11-9 19-20 19s-20-8-20-19V30C12 18 19 9 32 9z" />
            <path fill="#F5C794" d="M32 9c13 0 20 9 20 21v10c0 11-9 19-20 19z" />
            <path fill="#8F5A2E" d="M18 12C8 8 2 17 2 29c0 9 4 15 9 15 3 0 5-3 5-7V24z" />
            <path fill="#A66C3A" d="M46 12c10-4 16 5 16 17 0 9-4 15-9 15-3 0-5-3-5-7V24z" />
            <ellipse cx="32" cy="44" rx="12" ry="10" fill="#FFF3E3" />
            <circle cx="24" cy="30" r="3.200" fill="#34495E" />
            <circle cx="40" cy="30" r="3.200" fill="#34495E" />
            <path fill="#34495E" d="M26 38c0-2 3-3 6-3s6 1 6 3-3 5-6 5-6-3-6-5z" />
        </>
    ),
    search: (
        <>
            <path fill="#F4725A" d="M40 46l6-6 13 13a4.200 4.200 0 0 1-6 6z" />
            <circle cx="27" cy="27" r="23" fill="#34495E" />
            <circle cx="27" cy="27" r="16" fill="#8AD7F8" />
        </>
    ),
    pin: (
        <>
            <path fill="#F4725A" d="M32 3a23 23 0 0 0-23 23c0 17 23 35 23 35s23-18 23-35A23 23 0 0 0 32 3z" />
            <path fill="#F15A40" d="M32 3a23 23 0 0 1 23 23c0 17-23 35-23 35z" />
            <circle cx="32" cy="26" r="9" fill="#FFFFFF" />
        </>
    ),
    tag: (
        <>
            <path fill="#FFC85C" d="M6 10a4 4 0 0 1 4-4h22l26 26-26 26L6 32z" />
            <circle cx="20" cy="20" r="5" fill="#FFFFFF" />
        </>
    )
};

const EMOJI_SHAPES = {
    '⚽': 'sports',
    '💇': 'beauty',
    '🐶': 'dog',
    '🔍': 'search',
    '📍': 'pin'
};

export default function CategoryIcon({ icon, size = 44, style }) {
    // '💇‍♀️' y '⚕️' llegan con variantes invisibles: se compara solo el primer carácter
    const [base] = Array.from(icon || '');
    if (IMAGES[base]) {
        return <img src={`/icons/categorias/${IMAGES[base]}.png`} width={size} height={size} alt="" aria-hidden="true" draggable="false" style={{ flexShrink: 0, ...style }} />;
    }
    return (
        <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" style={{ flexShrink: 0, ...style }}>
            {SHAPES[EMOJI_SHAPES[base] || 'tag']}
        </svg>
    );
}
