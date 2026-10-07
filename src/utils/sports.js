const SPORT_META = {
    futbol: { label: 'Fútbol', image: '/sports/futbol.webp' },
    padel: { label: 'Pádel', image: '/sports/padel.webp' },
    tenis: { label: 'Tenis', image: null }
};

// Courts store the sport as 'padel', 'paddle', 'futbol', 'football', 'tennis'...
export function normalizeSport(sport) {
    const value = String(sport || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
    if (value.includes('padel') || value.includes('paddle')) return 'padel';
    if (value.includes('futbol') || value.includes('football') || value.includes('soccer')) return 'futbol';
    if (value.includes('tenis') || value.includes('tennis')) return 'tenis';
    return value || 'otro';
}

// One group per sport, in the order the courts were loaded
export function groupCourtsBySport(courts) {
    const groups = [];
    (courts || []).forEach(court => {
        const key = normalizeSport(court.sport);
        let group = groups.find(g => g.key === key);
        if (!group) {
            const meta = SPORT_META[key] || {};
            group = {
                key,
                label: meta.label || key.charAt(0).toUpperCase() + key.slice(1),
                image: meta.image || null,
                courts: []
            };
            groups.push(group);
        }
        group.courts.push(court);
    });
    return groups.map(group => {
        const prices = group.courts.map(c => Number(c.price) || 0).filter(p => p > 0);
        return { ...group, minPrice: prices.length > 0 ? Math.min(...prices) : null };
    });
}
