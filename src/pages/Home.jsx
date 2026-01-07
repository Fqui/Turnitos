import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { categories } from '../data/mockData';
import serviceAdapter from '../services/serviceAdapter';
import Hero from '../components/Hero';
import { generateSlug } from '../utils/utils';

export default function Home() {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [businesses, setBusinesses] = useState([]);
    const [promotions, setPromotions] = useState([]);
    const [loading, setLoading] = useState(true);
    const resultsRef = useRef(null);
    const searchTimeoutRef = useRef(null);
    const navigate = useNavigate();

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
        return businesses.filter(b => {
            const matchesSearch = b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                b.location.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesCategory = selectedCategory === 'all' || b.category === selectedCategory;
            return matchesSearch && matchesCategory;
        });
    }, [searchTerm, selectedCategory, businesses]);

    // Memoize category click handler
    const handleCategoryClick = useCallback((category) => {
        setSelectedCategory(category);
        setSearchTerm('');
    }, []);

    // Auto-scroll to results when category changes
    useEffect(() => {
        if (selectedCategory !== 'all' && resultsRef.current) {
            setTimeout(() => {
                resultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        }
    }, [selectedCategory]);

    // Handle search: switch to 'all' category and auto-scroll after user stops typing
    useEffect(() => {
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        if (searchTerm.trim() !== '') {
            if (selectedCategory !== 'all') {
                setSelectedCategory('all');
            }

            searchTimeoutRef.current = setTimeout(() => {
                if (resultsRef.current) {
                    resultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }, 500);
        }

        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
        };
    }, [searchTerm]);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
        >
            <Hero />

            <div className="container" style={{ padding: '0 20px', paddingBottom: '80px' }}>

                {/* 1. Search Bar */}
                <section style={{ marginBottom: '30px', marginTop: '-30px', position: 'relative', zIndex: 10, display: 'flex', justifyContent: 'center' }}>
                    <div style={{ position: 'relative', width: '100%', maxWidth: '600px' }}>
                        <input
                            type="text"
                            placeholder="Buscar club, cancha o servicio..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '16px 20px',
                                paddingLeft: '50px',
                                fontSize: '16px',
                                borderRadius: '50px',
                                border: '1px solid rgba(0,0,0,0.05)',
                                backgroundColor: 'var(--bg-card)',
                                color: 'var(--text-primary)',
                                outline: 'none',
                                boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
                                transition: 'box-shadow 0.3s',
                                appearance: 'none'
                            }}
                            onFocus={(e) => e.target.style.boxShadow = '0 15px 40px rgba(0,0,0,0.12)'}
                            onBlur={(e) => e.target.style.boxShadow = '0 10px 30px rgba(0,0,0,0.08)'}
                        />
                        <span style={{ position: 'absolute', left: '20px', top: '50%', transform: 'translateY(-50%)', fontSize: '20px', opacity: 0.5 }}>
                            🔍
                        </span>
                    </div>
                </section>


                {/* 2. Promotions */}
                <section style={{ marginBottom: '40px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h2 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>Promociones 🔥</h2>
                    </div>

                    <div style={{
                        display: 'flex',
                        gap: '16px',
                        overflowX: 'auto',
                        paddingBottom: '20px',
                        scrollSnapType: 'x mandatory',
                        WebkitOverflowScrolling: 'touch',
                        margin: '0 -20px',
                        padding: '0 20px 20px 20px'
                    }}>
                        {promotions.map(promo => {
                            const business = businesses.find(b => b.id === promo.business_id);
                            return (
                                <Link
                                    to={`/${generateSlug(business?.name || '')}/turnos`}
                                    state={{ business }}
                                    key={promo.id}
                                    style={{ textDecoration: 'none', flex: '0 0 85%', maxWidth: '300px', scrollSnapAlign: 'center' }}
                                >
                                    <div style={{
                                        position: 'relative',
                                        borderRadius: '20px',
                                        overflow: 'hidden',
                                        height: '160px',
                                        boxShadow: '0 10px 25px rgba(0,0,0,0.08)',
                                        transition: 'transform 0.3s'
                                    }}>
                                        <img src={promo.image} alt={promo.title} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        <div style={{
                                            position: 'absolute',
                                            inset: 0,
                                            background: `linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0.9) 100%)`,
                                            padding: '16px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            justifyContent: 'flex-end',
                                            color: '#fff'
                                        }}>
                                            <span style={{
                                                background: '#FF4081', color: 'white', fontSize: '10px', fontWeight: 'bold',
                                                padding: '4px 8px', borderRadius: '4px', alignSelf: 'flex-start', marginBottom: '6px'
                                            }}>
                                                {promo.discount}
                                            </span>
                                            <h3 style={{ fontSize: '16px', fontWeight: 'bold', lineHeight: 1.2, marginBottom: '2px' }}>{promo.title}</h3>
                                            <p style={{ fontSize: '12px', opacity: 0.9, margin: 0 }}>
                                                {promo.businesses?.name || 'Negocio'}
                                            </p>
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                </section>

                {/* 3. Categories */}
                <section style={{ marginBottom: '40px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h2 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>Categorías</h2>
                    </div>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                        gap: '12px'
                    }}>
                        <button
                            onClick={() => handleCategoryClick('all')}
                            style={{
                                padding: '12px 20px',
                                borderRadius: '50px',
                                backgroundColor: selectedCategory === 'all' ? 'var(--text-primary)' : 'var(--bg-card)',
                                color: selectedCategory === 'all' ? 'var(--bg-card)' : 'var(--text-secondary)',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '14px',
                                fontWeight: '600',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => {
                                if (selectedCategory !== 'all') {
                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                    e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.1)';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (selectedCategory !== 'all') {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)';
                                }
                            }}
                        >
                            Todos
                        </button>
                        {categories.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => handleCategoryClick(cat.id)}
                                style={{
                                    padding: '12px 16px',
                                    borderRadius: '50px',
                                    backgroundColor: selectedCategory === cat.id ? 'var(--text-primary)' : 'var(--bg-card)',
                                    color: selectedCategory === cat.id ? 'var(--bg-card)' : 'var(--text-secondary)',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontSize: '14px',
                                    fontWeight: '600',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                                    transition: 'all 0.2s'
                                }}
                                onMouseEnter={(e) => {
                                    if (selectedCategory !== cat.id) {
                                        e.currentTarget.style.transform = 'translateY(-2px)';
                                        e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.1)';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (selectedCategory !== cat.id) {
                                        e.currentTarget.style.transform = 'translateY(0)';
                                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)';
                                    }
                                }}
                            >
                                <span>{cat.icon}</span>
                                <span>{cat.name}</span>
                            </button>
                        ))}
                    </div>
                </section>

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
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                                <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>
                                                    ⭐ {business.rating}
                                                </span>
                                            </div>
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
