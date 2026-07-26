import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { categories, promotions as initialPromotions, businesses as initialBusinesses } from '../data/mockData';
import serviceAdapter from '../services/serviceAdapter';
import PromotionsHero from '../components/PromotionsHero';
import { generateSlug } from '../utils/utils';

export default function Home() {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [selectedSubCategory, setSelectedSubCategory] = useState('all');
    const [businesses, setBusinesses] = useState(initialBusinesses || []);
    const [promotions, setPromotions] = useState(initialPromotions || []);
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
                if (businessesData && businessesData.length > 0) setBusinesses(businessesData);
                if (promotionsData && promotionsData.length > 0) setPromotions(promotionsData);
                if (categoriesResult && categoriesResult.length > 0) setCategoriesData(categoriesResult);
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
    // Helper to normalize strings (remove accents, lowercase)
    const normalizeText = (text) => {
        return (text || '')
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .trim();
    };

    // Memoize filtered businesses to avoid re-filtering on every render
    const filteredBusinesses = useMemo(() => {
        const termNorm = normalizeText(searchTerm);

        return businesses.filter(b => {
            // 1. Search Filter
            let matchesSearch = true;
            if (termNorm.length >= 1) {
                const matchesName = normalizeText(b.name).includes(termNorm);
                const matchesLocation = normalizeText(b.location).includes(termNorm);
                const matchesDescription = normalizeText(b.description).includes(termNorm);
                const matchesCategory = normalizeText(b.categories?.name).includes(termNorm) || 
                                        normalizeText(b.categories?.slug).includes(termNorm);
                const matchesSubcategory = b.subcategories?.some(sub => 
                    normalizeText(sub.name).includes(termNorm) || normalizeText(sub.slug).includes(termNorm)
                );
                const matchesServices = b.services?.some(s => normalizeText(s.name).includes(termNorm) || normalizeText(s.description).includes(termNorm));
                const matchesCourts = b.courts?.some(c => normalizeText(c.name).includes(termNorm) || normalizeText(c.sport).includes(termNorm) || normalizeText(c.type).includes(termNorm));
                const matchesSpecialists = b.specialists?.some(s => normalizeText(s.name).includes(termNorm) || normalizeText(s.specialty).includes(termNorm));

                // Specific sport / keyword synonyms matching
                let matchesSynonym = false;
                if (termNorm === 'futbol' || termNorm === 'soccer' || termNorm === 'cancha') {
                    matchesSynonym = (b.type === 'sport') || normalizeText(b.categories?.name).includes('deporte') || b.courts?.some(c => normalizeText(c.name).includes('futbol') || normalizeText(c.sport).includes('futbol'));
                } else if (termNorm === 'padel' || termNorm === 'tenis') {
                    matchesSynonym = b.courts?.some(c => normalizeText(c.name).includes(termNorm) || normalizeText(c.sport).includes(termNorm));
                }

                matchesSearch = matchesName || matchesLocation || matchesDescription || matchesCategory || matchesSubcategory || matchesServices || matchesCourts || matchesSpecialists || matchesSynonym;
            }

            if (!matchesSearch) return false;

            // When searching with a query, search globally across all categories
            if (termNorm.length >= 1) return true;

            // 2. Category Filter (active when search term is empty)
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
                isCategoryMatch = categorySlug === selectedCategory || categoryName === selectedCategory;
            }

            if (!isCategoryMatch) return false;

            // 3. Sub-category Filter
            if (selectedSubCategory === 'all') return true;

            const selectedSubNorm = normalizeText(selectedSubCategory);

            let hasSubcategory = b.subcategories?.some(sub => {
                return normalizeText(sub.slug) === selectedSubNorm || normalizeText(sub.name) === selectedSubNorm;
            });

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
        if (!searchTerm || normalizeText(searchTerm).length < 1) return [];

        const termNorm = normalizeText(searchTerm);
        const results = [];
        const seen = new Set(); // duplicate checker

        businesses.forEach(b => {
            const bNameNorm = normalizeText(b.name);

            // 1. Business Name Match
            if (bNameNorm.includes(termNorm)) {
                const key = `biz-${b.id}`;
                if (!seen.has(key)) {
                    results.push({
                        type: 'business',
                        id: b.id,
                        title: b.name,
                        subtitle: `${b.categories?.name || 'Negocio'} • ${b.location || 'La Rioja'}`,
                        business: b
                    });
                    seen.add(key);
                }
            }

            // 2. Category & Subcategory Match
            if (normalizeText(b.categories?.name).includes(termNorm)) {
                const key = `cat-${b.categories?.name}-${b.id}`;
                if (!seen.has(key)) {
                    results.push({
                        type: 'category',
                        id: key,
                        title: b.categories.name,
                        subtitle: `en ${b.name}`,
                        business: b
                    });
                    seen.add(key);
                }
            }

            b.subcategories?.forEach(sub => {
                if (normalizeText(sub.name).includes(termNorm)) {
                    const key = `sub-${sub.name}-${b.id}`;
                    if (!seen.has(key)) {
                        results.push({
                            type: 'subcategory',
                            id: key,
                            title: sub.name,
                            subtitle: `Subcategoría en ${b.name}`,
                            business: b
                        });
                        seen.add(key);
                    }
                }
            });

            // 3. Services Match
            b.services?.forEach(s => {
                if (normalizeText(s.name).includes(termNorm)) {
                    const key = `service-${s.name}-${b.id}`;
                    if (!seen.has(key)) {
                        results.push({
                            type: 'service',
                            id: key,
                            title: s.name,
                            subtitle: `Servicio en ${b.name}`,
                            business: b
                        });
                        seen.add(key);
                    }
                }
            });

            // 4. Courts/Resources Match
            b.courts?.forEach(c => {
                if (normalizeText(c.name).includes(termNorm) || normalizeText(c.sport).includes(termNorm)) {
                    const key = `court-${c.name}-${b.id}`;
                    if (!seen.has(key)) {
                        results.push({
                            type: 'court',
                            id: key,
                            title: c.name,
                            subtitle: `Cancha/Espacio en ${b.name}`,
                            business: b
                        });
                        seen.add(key);
                    }
                }
            });

            // 5. Specialists Match
            b.specialists?.forEach(s => {
                if (normalizeText(s.name).includes(termNorm) || normalizeText(s.specialty).includes(termNorm)) {
                    const key = `spec-${s.name}-${b.id}`;
                    if (!seen.has(key)) {
                        results.push({
                            type: 'specialist',
                            id: key,
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
                            placeholder="Buscar por negocio, fútbol, pádel, kinesiología, barbería..."
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setShowSuggestions(true);
                            }}
                            onFocus={() => setShowSuggestions(true)}
                            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    setShowSuggestions(false);
                                    e.target.blur();
                                    if (resultsRef.current) {
                                        resultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                    }
                                }
                            }}
                            style={{
                                width: '100%',
                                padding: '16px 20px',
                                paddingLeft: '50px',
                                paddingRight: searchTerm ? '45px' : '20px',
                                fontSize: '15px',
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

                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm('')}
                                style={{
                                    position: 'absolute',
                                    right: '16px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--text-secondary)',
                                    fontSize: '16px',
                                    cursor: 'pointer',
                                    padding: '4px',
                                    lineHeight: 1
                                }}
                            >
                                ✕
                            </button>
                        )}

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
                                padding: '8px 0',
                                zIndex: 100
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
                                            {item.type === 'business' ? '🏢' : item.type === 'court' ? '⚽' : item.type === 'category' ? '🏷️' : item.type === 'subcategory' ? '📌' : item.type === 'specialist' ? '👨‍⚕️' : '💆'}
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
                            <span style={{ fontSize: '14px', fontWeight: '600', fontFamily: 'var(--font-sans)', letterSpacing: '-0.01em' }}>Todos</span>
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
                                <span style={{ fontSize: '14px', fontWeight: '600', fontFamily: 'var(--font-sans)', letterSpacing: '-0.01em' }}>{cat.name}</span>
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
                                        fontWeight: '600',
                                        whiteSpace: 'nowrap',
                                        fontSize: '13px',
                                        fontFamily: 'var(--font-sans)',
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
                                            fontWeight: '600',
                                            whiteSpace: 'nowrap',
                                            fontSize: '13px',
                                            fontFamily: 'var(--font-sans)',
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
                                                fontWeight: '600',
                                                whiteSpace: 'nowrap',
                                                fontSize: '13px',
                                                fontFamily: 'var(--font-sans)',
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
                                        fontWeight: '600',
                                        whiteSpace: 'nowrap',
                                        fontSize: '13px',
                                        fontFamily: 'var(--font-sans)',
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
