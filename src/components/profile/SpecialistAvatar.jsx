import React, { useState } from 'react';

const getInitials = (name = '') => name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(part => part.charAt(0).toUpperCase())
    .join('') || '?';

/**
 * Specialist photo, or their initials on the business brand color when there is no photo.
 */
export default function SpecialistAvatar({ specialist, size = 40, ring = false }) {
    const [failed, setFailed] = useState(false);
    const photo = specialist?.avatar_url || specialist?.image_url;
    const base = {
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '50%',
        flexShrink: 0,
        boxShadow: ring ? '0 0 0 2px var(--bg-card), 0 0 0 4px var(--primary-paddle)' : 'none'
    };

    if (photo && !failed) {
        return (
            <img
                src={photo}
                alt={specialist?.name || ''}
                onError={() => setFailed(true)}
                style={{ ...base, objectFit: 'cover' }}
            />
        );
    }

    return (
        <div
            aria-hidden="true"
            style={{
                ...base,
                background: 'color-mix(in srgb, var(--primary-paddle, #7c3aed) 18%, var(--bg-card))',
                color: 'var(--primary-paddle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: `${Math.round(size * 0.36)}px`,
                letterSpacing: '0.5px'
            }}
        >
            {getInitials(specialist?.name)}
        </div>
    );
}
