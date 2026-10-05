import React from 'react';

export const getPublicSpecialists = (business) =>
    (business?.specialists || []).filter(s => s && s.id !== 'auto-assigned' && s.name);

const getInitials = (name = '') =>
    name
        .replace(/^(lic|dr|dra|prof)\.?\s+/i, '')
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map(w => w[0].toUpperCase())
        .join('');

function SpecialistAvatar({ specialist, size, primaryColor, ring = false }) {
    const style = {
        width: size,
        height: size,
        borderRadius: '50%',
        flexShrink: 0,
        objectFit: 'cover',
        border: ring ? '2px solid var(--bg-card)' : '1px solid var(--border)',
        background: `${primaryColor}1f`,
        color: primaryColor,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 700,
        fontSize: Math.round(size * 0.36)
    };
    if (specialist.avatar_url) {
        return <img src={specialist.avatar_url} alt={specialist.name} loading="lazy" style={style} />;
    }
    return <div style={style} aria-hidden="true">{getInitials(specialist.name)}</div>;
}

const nameStyle = {
    fontSize: '15px',
    fontWeight: 700,
    color: 'var(--text-primary)',
    lineHeight: 1.25,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
};

const roleStyle = {
    fontSize: '13px',
    color: 'var(--text-secondary)',
    lineHeight: 1.3,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
};

export default function ProfileAboutCard({ business, primaryColor = '#10b981' }) {
    const specialists = getPublicSpecialists(business);
    if (specialists.length === 0) return null;

    let content;
    if (specialists.length <= 3) {
        // Few professionals: show each one with name and role
        const avatarSize = specialists.length === 1 ? 64 : 48;
        content = (
            <div className="profile-about-list">
                {specialists.map(s => (
                    <div key={s.id} className="profile-about-item">
                        <SpecialistAvatar specialist={s} size={avatarSize} primaryColor={primaryColor} />
                        <div style={{ minWidth: 0 }}>
                            <div style={nameStyle}>{s.name}</div>
                            {s.role && <div style={roleStyle}>{s.role}</div>}
                        </div>
                    </div>
                ))}
            </div>
        );
    } else {
        // Larger teams: overlapping avatars plus a summary line
        const visible = specialists.slice(0, 4);
        const extra = specialists.length - visible.length;
        content = (
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
                <div style={{ display: 'flex', flexShrink: 0 }}>
                    {visible.map((s, i) => (
                        <div key={s.id} style={{ marginLeft: i === 0 ? 0 : -14 }}>
                            <SpecialistAvatar specialist={s} size={48} primaryColor={primaryColor} ring />
                        </div>
                    ))}
                    {extra > 0 && (
                        <div style={{
                            marginLeft: -14,
                            width: 48,
                            height: 48,
                            borderRadius: '50%',
                            border: '2px solid var(--bg-card)',
                            background: 'var(--bg-input)',
                            color: 'var(--text-secondary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '13px',
                            fontWeight: 700
                        }}>
                            +{extra}
                        </div>
                    )}
                </div>
                <div style={{ minWidth: 0 }}>
                    <div style={nameStyle}>{specialists.length} profesionales</div>
                    <div style={{ ...roleStyle, whiteSpace: 'normal', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                        {specialists.map(s => s.name).join(', ')}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <section className="profile-about-card" id="nosotros" aria-label="Nosotros">
            <div className="profile-about-title">Nosotros</div>
            {content}
        </section>
    );
}
