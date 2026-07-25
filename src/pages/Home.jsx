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
    const [categoriesData, setCategoriesData] = useState([]); // ✅ New state for dynamic categories
    const [loading, setLoading] = useState(true);
    const [isNearMeActive, setIsNearMeActive] = useState(false); // ✅ New state for Near Me
    const resultsRef = useRef(null);
    const searchTimeoutRef = useRef(null);
    const navigate = useNavigate();
    const location = useLocation();

    // Reset Near Me when changing Category
    const resetNearMe = async () => {
        setIsNearMeActive(false);
        setLoading(true);
        try {
            const allBusinesses = await serviceAdapter.getBusinesses();
            setBusinesses(allBusinesses);
        } catch (error) {
            console.error('Error resetting businesses:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleNearMeClick = async () => {
        if (isNearMeActive) {
            // Toggle OFF
            await resetNearMe();
            return;
        }

        // Toggle ON
        if (!navigator.geolocation) {
            alert('Tu navegador no soporta geolocalización.');
            return;
        }

        setLoading(true);
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                try {
                    const { latitude, longitude } = position.coords;
                    // Radius: 50km to capture everything in a city, adjustable
                    const nearby = await serviceAdapter.getNearbyBusinesses(latitude, longitude, 50000);
                    setBusinesses(nearby);
                    setIsNearMeActive(true);
                    setSelectedSubCategory('all'); // Reset subcategory, but keep Main Category

                    // Scroll to results
                    if (resultsRef.current) {
                        resultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                } catch (error) {
                    console.error('Error obtaining location or businesses:', error);
                    alert('Error al obtener negocios cercanos.');
                    setIsNearMeActive(false);
                } finally {
                    setLoading(false);
                }
            },
            (error) => {
                console.error('Geolocation error:', error);
                alert('No pudimos obtener tu ubicación. Por favor permite el acceso para usar esta función.');
                setLoading(false);
                setIsNearMeActive(false);
            }
        );
    };

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
                const [businessesData, promotionsData, categoriesResult] = await Promise.all([
                    serviceAdapter.getBusinesses(),
                    serviceAdapter.getPromotions(),
                    serviceAdapter.getCategories() // ✅ Fetch categories
                ]);
                setBusinesses(businessesData || []);
                setPromotions(promotionsData || []);
                setCategoriesData(categoriesResult || []);

                setBusinesses(businessesData || []);
                setPromotions(promotionsData || []);
                setCategoriesData(categoriesResult || []);
            } catch (error) {
                console.error('Error loading data:', error);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    // Memoize filtered businesses to avoid re-filtering on every render
    // Memoize filtered businesses to avoid re-filtering on every render
    const filteredBusinesses = useMemo(() => {
        // Helper to normalize strings (remove accents, lowercase)
        const normalizeText = (text) => {
            return (text || '')
                .toLowerCase()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .trim();
        };

        return businesses.filter(b => {
            // 1. Search Filter
            let matchesSearch = true;
            if (searchTerm && searchTerm.length >= 1) {
                const term = searchTerm.toLowerCase();
                const matchesBusiness = b.name.toLowerCase().includes(term) ||
                    b.location.toLowerCase().includes(term);
                const matchesServices = b.services?.some(s => s.name.toLowerCase().includes(term));
                const matchesCourts = b.courts?.some(c => c.name.toLowerCase().includes(term));
                const matchesSpecialists = b.specialists?.some(s => s.name.toLowerCase().includes(term));

                matchesSearch = matchesBusiness || matchesServices || matchesCourts || matchesSpecialists;
            }

            if (!matchesSearch) return false;

            // 2. Category Filter
            if (selectedCategory === 'all') return true;

            const categorySlug = (b.categories?.slug || '').toLowerCase();
            const categoryName = (b.categories?.name || '').toLowerCase();
            const type = (b.type || '').toLowerCase();

            // Determine if business belongs to main category
            let isCategoryMatch = false;

            if (selectedCategory === 'deportes' || selectedCategory === 'sport') {
                isCategoryMatch = type === 'sport' || categorySlug === 'deportes' || categoryName === 'deportes';
            } else if (selectedCategory === 'belleza' || selectedCategory === 'beauty') {
                isCategoryMatch = categorySlug === 'belleza' || categoryName === 'belleza' || categorySlug === 'estetica';
            } else if (selectedCategory === 'salud' || selectedCategory === 'health') {
                isCategoryMatch = categorySlug === 'salud' || categoryName === 'salud' || categorySlug === 'medicina';
            } else if (selectedCategory === 'quinchos' || selectedCategory === 'venue' || selectedCategory === 'alquileres') {
                isCategoryMatch = type === 'venue' || categorySlug === 'quinchos' || categoryName === 'quinchos' || categorySlug === 'alquileres';
            } else if (selectedCategory === 'mascotas') {
                isCategoryMatch = categorySlug === 'mascotas' || categoryName === 'mascotas';
            } else {
                // Generic fallback
                isCategoryMatch = categorySlug === selectedCategory || categoryName === selectedCategory;
            }

            if (!isCategoryMatch) return false;

            // 3. Sub-category Filter
            if (selectedSubCategory === 'all') return true;

            const selectedSubNorm = normalizeText(selectedSubCategory);

            // Check explicit subcategories array
            let hasSubcategory = b.subcategories?.some(sub => {
                return normalizeText(sub.slug) === selectedSubNorm || normalizeText(sub.name) === selectedSubNorm;
            });

            // Fallback: Check legacy subcategory_id using categoriesData
            if (!hasSubcategory && b.subcategory_id && categoriesData.length > 0) {
                for (const cat of categoriesData) {
                    const foundSub = cat.subcategories?.find(s => s.id === b.subcategory_id);
                    if (foundSub) {
                        if (normalizeText(foundSub.slug) === selectedSubNorm || normalizeText(foundSub.name) === selectedSubNorm) {
                            hasSubcategory = true;
                            break;
                        }
                    }
                }
            }

            return hasSubcategory;
        });
    }, [searchTerm, selectedCategory, selectedSubCategory, businesses, categoriesData]);

    // Memoize category click handler
    // Category click handler
    const handleCategoryClick = async (category) => {
        if (isNearMeActive) {
            setIsNearMeActive(false);
            setLoading(true);
            try {
                const allBusinesses = await serviceAdapter.getBusinesses();
                setBusinesses(allBusinesses);
            } catch (error) {
                console.error('Error reloading businesses:', error);
            } finally {
                setLoading(false);
            }
        }

        setSelectedCategory(category);
        setSelectedSubCategory('all'); // Reset sub-category when main category changes
        setSearchTerm('');

        // Auto scroll to results on mobile
        if (window.innerWidth < 768 && resultsRef.current) {
            setTimeout(() => {
                resultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        }
    };



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
                            <span style={{ fontSize: '14px', fontWeight: '700', fontFamily: 'var(--font-title)' }}>Todos</span>
                        </motion.button>

                        {/* Use DB categories if available, otherwise fallback to static mock */}
                        {(categoriesData.length > 0 ? categoriesData : categories).map(cat => (
                            <motion.button
                                key={cat.id || cat.slug} // Handle both DB (id) and Mock (id/slug) structures
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => handleCategoryClick(cat.slug || cat.id)} // Prefer slug for filtering consistency
                                style={{
                                    padding: '20px 10px',
                                    borderRadius: '24px',
                                    backgroundColor: (selectedCategory === cat.slug || selectedCategory === cat.id) ? 'var(--text-primary)' : 'var(--bg-card)',
                                    color: (selectedCategory === cat.slug || selectedCategory === cat.id) ? 'var(--bg-card)' : 'var(--text-secondary)',
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
                                <span style={{ fontSize: '14px', fontWeight: '700', fontFamily: 'var(--font-title)' }}>{cat.name}</span>
                            </motion.button>
                        ))}
                    </div>
                </section>

                {/* Anchor for auto-scroll */}
                <div ref={resultsRef} style={{ scrollMarginTop: '20px' }} />

                {/* Sub-Category Filter - DYNAMIC */}
                {(() => {
                    const currentCategory = categoriesData.find(c =>
                        c.id === selectedCategory || c.slug === selectedCategory
                    );

                    if (currentCategory && currentCategory.subcategories && currentCategory.subcategories.length > 0) {
                        const sortedSubs = [...currentCategory.subcategories].sort((a, b) =>
                            (a.display_order || 0) - (b.display_order || 0)
                        );

                        return (
                            <div className="container" style={{ marginBottom: '20px', display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
                                <motion.button
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => setSelectedSubCategory('all')}
                                    style={{
                                        padding: '8px 20px',
                                        borderRadius: '50px',
                                        border: selectedSubCategory === 'all' ? '1px solid var(--text-primary)' : '1px solid var(--border)',
                                        backgroundColor: selectedSubCategory === 'all' ? 'var(--text-primary)' : 'var(--bg-card)',
                                        color: selectedSubCategory === 'all' ? 'var(--bg-card)' : 'var(--text-secondary)',
                                        cursor: 'pointer',
                                        fontWeight: '700',
                                        whiteSpace: 'nowrap',
                                        fontSize: '13px',
                                        fontFamily: 'var(--font-title)',
                                        boxShadow: selectedSubCategory === 'all' ? '0 4px 12px rgba(0, 0, 0, 0.08)' : 'none',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    Todos
                                </motion.button>

                                {sortedSubs.map(sub => (
                                    <motion.button
                                        key={sub.id}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => setSelectedSubCategory(sub.slug)}
                                        style={{
                                            padding: '8px 20px',
                                            borderRadius: '50px',
                                            border: selectedSubCategory === sub.slug ? '1px solid var(--text-primary)' : '1px solid var(--border)',
                                            backgroundColor: selectedSubCategory === sub.slug ? 'var(--text-primary)' : 'var(--bg-card)',
                                            color: selectedSubCategory === sub.slug ? 'var(--bg-card)' : 'var(--text-secondary)',
                                            cursor: 'pointer',
                                            fontWeight: '700',
                                            whiteSpace: 'nowrap',
                                            fontSize: '13px',
                                            fontFamily: 'var(--font-title)',
                                            boxShadow: selectedSubCategory === sub.slug ? '0 4px 12px rgba(0, 0, 0, 0.08)' : 'none',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        {sub.name}
                                    </motion.button>
                                ))}
                            </div>
                        );
                    }

                    // Fallback for Deportes
                    if (selectedCategory === 'deportes' || selectedCategory === 'sport') {
                        return (
                            <div className="container" style={{ marginBottom: '20px', display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
                                {['Todos', 'Padel', 'Futbol', 'Tenis', 'Basquet', 'Hockey'].map(sub => {
                                    const isSelected = (selectedSubCategory === 'all' && sub === 'Todos') || selectedSubCategory === sub.toLowerCase();
                                    return (
                                        <motion.button
                                            key={sub}
                                            whileTap={{ scale: 0.95 }}
                                            onClick={() => setSelectedSubCategory(sub === 'Todos' ? 'all' : sub.toLowerCase())}
                                            style={{
                                                padding: '8px 20px',
                                                borderRadius: '50px',
                                                border: isSelected ? '1px solid var(--text-primary)' : '1px solid var(--border)',
                                                backgroundColor: isSelected ? 'var(--text-primary)' : 'var(--bg-card)',
                                                color: isSelected ? 'var(--bg-card)' : 'var(--text-secondary)',
                                                cursor: 'pointer',
                                                fontWeight: '700',
                                                whiteSpace: 'nowrap',
                                                fontSize: '13px',
                                                fontFamily: 'var(--font-title)',
                                                boxShadow: isSelected ? '0 4px 12px rgba(0, 0, 0, 0.08)' : 'none',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            {sub}
                                        </motion.button>
                                    );
                                })}
                            </div>
                        );
                    }

                    // Fallback: If no subcategories
                    if (selectedCategory !== 'all' && currentCategory && (!currentCategory.subcategories || currentCategory.subcategories.length === 0)) {
                        return (
                            <div className="container" style={{ marginBottom: '20px', display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
                                <motion.button
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => setSelectedSubCategory('all')}
                                    style={{
                                        padding: '8px 20px',
                                        borderRadius: '50px',
                                        border: '1px solid var(--text-primary)',
                                        backgroundColor: 'var(--text-primary)',
                                        color: 'var(--bg-card)',
                                        cursor: 'pointer',
                                        fontWeight: '700',
                                        whiteSpace: 'nowrap',
                                        fontSize: '13px',
                                        fontFamily: 'var(--font-title)',
                                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)'
                                    }}
                                >
                                    Todos
                                </motion.button>
                            </div>
                        );
                    }

                    return null;
                })()}

                {/* 4. Featured Businesses */}
                <section>
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
                                                src={business.banner_image || business.image}
                                                alt={business.name}
                                                loading="lazy"
                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                            />
                                        </div>
                                        <div style={{ padding: '16px', display: 'flex', gap: '12px', alignItems: 'center' }}>
                                            {/* Logo on the left */}
                                            {business.logo && (
                                                <div style={{
                                                    width: '60px',
                                                    height: '60px',
                                                    borderRadius: '12px',
                                                    overflow: 'hidden',
                                                    flexShrink: 0,
                                                    border: '2px solid var(--border)',
                                                    backgroundColor: 'var(--bg-main)'
                                                }}>
                                                    <img
                                                        src={business.logo}
                                                        alt={`${business.name} logo`}
                                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                    />
                                                </div>
                                            )}

                                            {/* Info on the right */}
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <h3 style={{
                                                    fontSize: '18px',
                                                    fontWeight: '800',
                                                    marginBottom: '6px',
                                                    color: 'var(--text-primary)',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap'
                                                }}>
                                                    {business.name}
                                                </h3>
                                                <p style={{
                                                    fontSize: '13px',
                                                    color: 'var(--text-secondary)',
                                                    marginBottom: '8px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '4px',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap'
                                                }}>
                                                    <span>📍</span> {business.location}
                                                </p>

                                                {business.amenities && business.amenities.length > 0 && (
                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                                        {business.amenities.slice(0, 2).map((amenity, idx) => (
                                                            <span key={idx} style={{
                                                                fontSize: '10px',
                                                                padding: '3px 6px',
                                                                borderRadius: '8px',
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
                                        </div>
                                    </motion.div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </div>
        </motion.div >
    );
}
