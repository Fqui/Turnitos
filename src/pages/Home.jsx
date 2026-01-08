import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { categories } from '../data/mockData';
import serviceAdapter from '../services/serviceAdapter';
import PromotionsHero from '../components/PromotionsHero';
import { generateSlug } from '../utils/utils';

export default function Home() {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [selectedSubCategory, setSelectedSubCategory] = useState('all');
    const [businesses, setBusinesses] = useState([]);
    const [promotions, setPromotions] = useState([]);
    const [loading, setLoading] = useState(true);
    const resultsRef = useRef(null);
    const searchTimeoutRef = useRef(null);
    const navigate = useNavigate();
    const location = useLocation();

    // Handle URL query params for initial category selection
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const categoryParam = params.get('category');

        // Always reset search triggering when navigating via footer/URL to avoid filtering conflict
        setSearchTerm('');
        setSelectedSubCategory('all');

        if (categoryParam) {
            setSelectedCategory(categoryParam);
            // Scroll to results to show the filtered category
            if (resultsRef.current) {
                setTimeout(() => {
                    resultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 100);
            }
        } else {
            // "Inicio" (No param) - Reset to All and Scroll Top
            setSelectedCategory('all');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }, [location.search]);

    useEffect(() => {
        const loadData = async () => {
            try {
                const [businessesData, promotionsData] = await Promise.all([
                    serviceAdapter.getBusinesses(),
                    serviceAdapter.getPromotions()
                ]);
                setBusinesses(businessesData || []);
                setPromotions(promotionsData || []);
            } catch (error) {
                console.error('Error loading data:', error);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    // Memoize filtered businesses to avoid re-filtering on every render
    const filteredBusinesses = useMemo(() => {
        if (!searchTerm) {
            return businesses.filter(b => {
                // Robust Category Filtering for non-search terms
                const matchesCategory = (() => {
                    if (selectedCategory === 'all') return true;

                    const cat = b.category?.toLowerCase();
                    const type = b.type?.toLowerCase();

                    // 1. Deportes: Match type 'sport' OR specific sport categories
                    if (selectedCategory === 'deportes' || selectedCategory === 'sport') {
                        const isSport = type === 'sport' || ['padel', 'futbol', 'fútbol', 'tennis', 'tenis', 'deporte'].includes(cat);
                        if (!isSport) return false;

                        // Sub-category logic for Deportes
                        if (selectedSubCategory === 'all') return true;

                        const sub = selectedSubCategory.toLowerCase();

                        // Check direct category match
                        if (cat.includes(sub)) return true;

                        // Check sportTypes array
                        if (b.sportTypes && b.sportTypes.some(s => s.toLowerCase().includes(sub))) return true;

                        // Manual mappings for synonyms
                        if (sub === 'futbol' && (cat.includes('football') || b.sportTypes?.includes('football'))) return true;
                        if (sub === 'tenis' && (cat.includes('tennis') || b.sportTypes?.includes('tennis'))) return true;

                        return false;
                    }

                    // 2. Belleza: Match 'belleza', 'beauty', 'estetica'
                    if (selectedCategory === 'belleza' || selectedCategory === 'beauty') {
                        return cat === 'belleza' || cat === 'beauty' || cat === 'estetica';
                    }

                    // 3. Salud: Match 'salud', 'health', 'medicina'
                    if (selectedCategory === 'salud' || selectedCategory === 'health') {
                        return cat === 'salud' || cat === 'health' || cat === 'medicina';
                    }

                    // 4. Quinchos (Venues): Match type 'venue' OR 'eventos', 'quincho'
                    if (selectedCategory === 'quinchos' || selectedCategory === 'venue') {
                        return type === 'venue' || cat === 'eventos' || cat === 'quincho' || cat === 'alquiler';
                    }

                    // 5. Mascotas
                    if (selectedCategory === 'mascotas') {
                        return cat === 'mascotas' || type === 'mascotas';
                    }

                    // Fallback: exact match
                    return cat === selectedCategory;
                })();
                return matchesCategory;
            });
        }

        const term = searchTerm.toLowerCase();

        return businesses.filter(b => {
            // Check matches in Business Name or Location
            const matchesBusiness = b.name.toLowerCase().includes(term) ||
                b.location.toLowerCase().includes(term);

            // Check matches in Services
            const matchesServices = b.services?.some(s => s.name.toLowerCase().includes(term));

            // Check matches in Courts
            const matchesCourts = b.courts?.some(c => c.name.toLowerCase().includes(term));

            // Check matches in Specialists (optional, but good for "Busco a Juan")
            const matchesSpecialists = b.specialists?.some(s => s.name.toLowerCase().includes(term));

            const matchesSearch = matchesBusiness || matchesServices || matchesCourts || matchesSpecialists;

            // Robust Category Filtering
            const matchesCategory = (() => {
                if (selectedCategory === 'all') return true;

                const cat = b.category?.toLowerCase();
                const type = b.type?.toLowerCase();

                // 1. Deportes: Match type 'sport' OR specific sport categories
                if (selectedCategory === 'deportes' || selectedCategory === 'sport') {
                    const isSport = type === 'sport' || ['padel', 'futbol', 'fútbol', 'tennis', 'tenis', 'deporte'].includes(cat);

                    if (!isSport) return false;

                    // Sub-category logic for Deportes
                    if (selectedSubCategory === 'all') return true;

                    const sub = selectedSubCategory.toLowerCase();

                    // Check direct category match
                    if (cat.includes(sub)) return true;

                    // Check sportTypes array
                    if (b.sportTypes && b.sportTypes.some(s => s.toLowerCase().includes(sub))) return true;

                    // Manual mappings for synonyms
                    if (sub === 'futbol' && (cat.includes('football') || b.sportTypes?.includes('football'))) return true;
                    if (sub === 'tenis' && (cat.includes('tennis') || b.sportTypes?.includes('tennis'))) return true;

                    return false;
                }

                // 2. Belleza: Match 'belleza', 'beauty', 'estetica'
                if (selectedCategory === 'belleza' || selectedCategory === 'beauty') {
                    return cat === 'belleza' || cat === 'beauty' || cat === 'estetica';
                }

                // 3. Salud: Match 'salud', 'health', 'medicina'
                if (selectedCategory === 'salud' || selectedCategory === 'health') {
                    return cat === 'salud' || cat === 'health' || cat === 'medicina';
                }

                // 4. Quinchos (Venues): Match type 'venue' OR 'eventos', 'quincho'
                if (selectedCategory === 'quinchos' || selectedCategory === 'venue') {
                    return type === 'venue' || cat === 'eventos' || cat === 'quincho' || cat === 'alquiler';
                }

                // 5. Mascotas
                if (selectedCategory === 'mascotas') {
                    return cat === 'mascotas' || type === 'mascotas';
                }

                // Fallback: exact match
                return cat === selectedCategory;
            })();

            return matchesSearch && matchesCategory;
        });
    }, [searchTerm, selectedCategory, selectedSubCategory, businesses]);

    // Memoize category click handler
    const handleCategoryClick = useCallback((category) => {
        setSelectedCategory(category);
        setSelectedSubCategory('all'); // Reset sub-category when main category changes
        setSearchTerm('');
    }, []);



    // State for suggestions
    const [showSuggestions, setShowSuggestions] = useState(false);

    // Memoize suggestions based on search term
    const suggestions = useMemo(() => {
        if (!searchTerm || searchTerm.length < 2) return [];

        const term = searchTerm.toLowerCase();
        const results = [];
        const seen = new Set(); // duplicate checker

        businesses.forEach(b => {
            // 1. Business Name Match
            if (b.name.toLowerCase().includes(term)) {
                results.push({
                    type: 'business',
                    id: b.id,
                    title: b.name,
                    subtitle: 'Negocio',
                    business: b
                });
            }

            // 2. Services Match
            b.services?.forEach(s => {
                if (s.name.toLowerCase().includes(term)) {
                    const key = `service-${s.name}-${b.id}`;
                    if (!seen.has(key)) {
                        results.push({
                            type: 'service',
                            id: s.id,
                            title: s.name,
                            subtitle: `en ${b.name}`,
                            business: b
                        });
                        seen.add(key);
                    }
                }
            });

            // 3. Courts/Resources Match
            b.courts?.forEach(c => {
                if (c.name.toLowerCase().includes(term)) {
                    const key = `court-${c.name}-${b.id}`;
                    if (!seen.has(key)) {
                        results.push({
                            type: 'court',
                            id: c.id,
                            title: c.name,
                            subtitle: `en ${b.name}`,
                            business: b
                        });
                        seen.add(key);
                    }
                }
            });

            // 4. Specialists Match
            b.specialists?.forEach(s => {
                if (s.name.toLowerCase().includes(term)) {
                    const key = `spec-${s.name}-${b.id}`;
                    if (!seen.has(key)) {
                        results.push({
                            type: 'specialist',
                            id: s.id,
                            title: s.name,
                            subtitle: `Especialista en ${b.name}`,
                            business: b
                        });
                        seen.add(key);
                    }
                }
            });
        });

        return results.slice(0, 8); // Limit to 8 suggestions
    }, [searchTerm, businesses]);

    // Handle Nav to Business from Suggestion
    const handleSelectSuggestion = (business) => {
        navigate(`/${generateSlug(business.name)}/turnos`, { state: { business } });
        setShowSuggestions(false);
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
        >
            <div className="container" style={{ padding: '20px 20px 80px' }}>

                {/* 1. Hero / Promotions */}
                <PromotionsHero promotions={promotions} businesses={businesses} />

                {/* 2. Search Bar with Autocomplete */}
                <section style={{ marginBottom: '30px', display: 'flex', justifyContent: 'center', position: 'relative', zIndex: 50 }}>
                    <div style={{ position: 'relative', width: '100%', maxWidth: '600px' }}>
                        <input
                            type="text"
                            placeholder="Buscar..."
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setShowSuggestions(true);
                            }}
                            onFocus={() => setShowSuggestions(true)}
                            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)} // Delay to allow click
                            style={{
                                width: '100%',
                                padding: '16px 20px',
                                paddingLeft: '50px',
                                fontSize: '16px',
                                borderRadius: '24px',
                                border: '1px solid var(--border)',
                                backgroundColor: 'var(--bg-card)',
                                color: 'var(--text-primary)',
                                outline: 'none',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                                transition: 'box-shadow 0.3s',
                                appearance: 'none'
                            }}
                        />
                        <span style={{ position: 'absolute', left: '20px', top: '50%', transform: 'translateY(-50%)', fontSize: '20px', opacity: 0.5, color: 'var(--text-secondary)' }}>
                            🔍
                        </span>

                        {/* Autocomplete Dropdown */}
                        {showSuggestions && suggestions.length > 0 && (
                            <div style={{
                                position: 'absolute',
                                top: '110%',
                                left: 0,
                                right: 0,
                                background: 'var(--bg-card)',
                                borderRadius: '16px',
                                boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
                                border: '1px solid var(--border)',
                                overflow: 'hidden',
                                padding: '8px 0'
                            }}>
                                {suggestions.map((item, index) => (
                                    <div
                                        key={index}
                                        onClick={() => handleSelectSuggestion(item.business)}
                                        style={{
                                            padding: '12px 20px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '12px',
                                            borderBottom: index < suggestions.length - 1 ? '1px solid var(--border)' : 'none',
                                            transition: 'background 0.2s'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-main)'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                    >
                                        <div style={{ fontSize: '18px' }}>
                                            {item.type === 'business' ? '🏢' : item.type === 'court' ? '🎾' : item.type === 'specialist' ? '👨‍⚕️' : '💆'}
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{item.title}</div>
                                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{item.subtitle}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </section>

                {/* 3. Categories */}
                <section style={{ marginBottom: '40px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h2 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>Categorías</h2>
                    </div>
                    <div style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '16px',
                        justifyContent: 'center'
                    }}>
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleCategoryClick('all')}
                            style={{
                                padding: '20px 10px',
                                borderRadius: '24px',
                                backgroundColor: selectedCategory === 'all' ? 'var(--text-primary)' : 'var(--bg-card)',
                                color: selectedCategory === 'all' ? 'var(--bg-card)' : 'var(--text-secondary)',
                                border: '1px solid var(--border)',
                                cursor: 'pointer',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '12px',
                                boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
                                transition: 'all 0.3s',
                                height: '120px',
                                flex: '1 1 130px',
                                maxWidth: '160px'
                            }}
                        >
                            <span style={{ fontSize: '32px' }}>⚡</span>
                            <span style={{ fontSize: '14px', fontWeight: '700' }}>Todos</span>
                        </motion.button>

                        {categories.map(cat => (
                            <motion.button
                                key={cat.id}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => handleCategoryClick(cat.id)}
                                style={{
                                    padding: '20px 10px',
                                    borderRadius: '24px',
                                    backgroundColor: selectedCategory === cat.id ? 'var(--text-primary)' : 'var(--bg-card)',
                                    color: selectedCategory === cat.id ? 'var(--bg-card)' : 'var(--text-secondary)',
                                    border: '1px solid var(--border)',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '12px',
                                    boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
                                    transition: 'all 0.3s',
                                    height: '120px',
                                    flex: '1 1 130px',
                                    maxWidth: '160px'
                                }}
                            >
                                <span style={{ fontSize: '32px' }}>{cat.icon}</span>
                                <span style={{ fontSize: '14px', fontWeight: '700' }}>{cat.name}</span>
                            </motion.button>
                        ))}
                    </div>
                </section>

                {/* Sub-Category Filter for Sports */}
                {(selectedCategory === 'deportes' || selectedCategory === 'sport') && (
                    <div className="container" style={{ marginBottom: '20px', display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '10px' }}>
                        {['Todos', 'Padel', 'Futbol', 'Tenis'].map(sub => (
                            <motion.button
                                key={sub}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setSelectedSubCategory(sub === 'Todos' ? 'all' : sub.toLowerCase())}
                                style={{
                                    padding: '8px 20px',
                                    borderRadius: '50px',
                                    border: '1px solid var(--border)',
                                    backgroundColor: (selectedSubCategory === 'all' && sub === 'Todos') || selectedSubCategory === sub.toLowerCase()
                                        ? 'var(--primary-paddle)'
                                        : 'var(--bg-card)',
                                    color: (selectedSubCategory === 'all' && sub === 'Todos') || selectedSubCategory === sub.toLowerCase()
                                        ? '#000'
                                        : 'var(--text-primary)',
                                    cursor: 'pointer',
                                    fontWeight: '600',
                                    whiteSpace: 'nowrap',
                                    fontSize: '14px',
                                    boxShadow: (selectedSubCategory === 'all' && sub === 'Todos') || selectedSubCategory === sub.toLowerCase()
                                        ? '0 4px 10px rgba(0, 230, 118, 0.2)'
                                        : 'none'
                                }}
                            >
                                {sub}
                            </motion.button>
                        ))}
                    </div>
                )}

                {/* 4. Featured Businesses */}
                <section ref={resultsRef}>
                    <h2 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '20px', color: 'var(--text-primary)' }}>
                        {selectedCategory === 'all' ? 'Recomendados para ti' : 'Resultados'}
                    </h2>
                    {loading ? (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
                            <div className="loading-spinner" style={{
                                width: '40px',
                                height: '40px',
                                border: '4px solid rgba(0,0,0,0.1)',
                                borderLeftColor: 'var(--primary-color)',
                                borderRadius: '50%',
                                animation: 'spin 1s linear infinite'
                            }}></div>
                            <style>{`
                                @keyframes spin {
                                    0% { transform: rotate(0deg); }
                                    100% { transform: rotate(360deg); }
                                }
                            `}</style>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                            {filteredBusinesses.map(business => (
                                <div
                                    key={business.id}
                                    onClick={() => navigate(`/${generateSlug(business.name)}/turnos`, { state: { business } })}
                                    style={{ textDecoration: 'none', color: 'inherit', cursor: 'pointer' }}
                                >
                                    <motion.div
                                        className="business-card"
                                        style={{
                                            backgroundColor: 'var(--bg-card)',
                                            borderRadius: '20px',
                                            overflow: 'hidden',
                                            boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                                            transition: 'all 0.3s',
                                        }}
                                        whileHover={{ y: -4, boxShadow: '0 12px 24px rgba(0,0,0,0.1)' }}
                                    >
                                        <div style={{ position: 'relative', height: '180px', overflow: 'hidden' }}>
                                            <motion.img
                                                layoutId={`business-image-${business.id}`}
                                                src={business.image}
                                                alt={business.name}
                                                loading="lazy"
                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                            />
                                        </div>
                                        <div style={{ padding: '16px' }}>
                                            <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '8px', color: 'var(--text-primary)' }}>
                                                {business.name}
                                            </h3>
                                            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <span>📍</span> {business.location}
                                            </p>

                                            {business.amenities && business.amenities.length > 0 && (
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                                    {business.amenities.slice(0, 3).map((amenity, idx) => (
                                                        <span key={idx} style={{
                                                            fontSize: '11px',
                                                            padding: '4px 8px',
                                                            borderRadius: '12px',
                                                            backgroundColor: 'var(--bg-main)',
                                                            color: 'var(--text-secondary)',
                                                            fontWeight: '600'
                                                        }}>
                                                            {amenity}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </div>
        </motion.div>
    );
}
