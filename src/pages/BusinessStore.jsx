import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import serviceAdapter from '../services/serviceAdapter';
import { findBusinessBySlug, getSubdomain } from '../utils/utils';

export default function BusinessStore({ overrideSlug }) {
    const { businessSlug: routeSlug } = useParams();
    const businessSlug = overrideSlug || routeSlug;
    const navigate = useNavigate();
    const location = useLocation();

    const [business, setBusiness] = useState(null);
    const [loading, setLoading] = useState(true);
    const [cart, setCart] = useState([]);
    const [activeCategory, setActiveCategory] = useState('Todos');
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [toastMessage, setToastMessage] = useState(null);

    // Product Detail & Gallery Modal state
    const [selectedProductModal, setSelectedProductModal] = useState(null);
    const [activeImageIndex, setActiveImageIndex] = useState(0);
    const [modalQty, setModalQty] = useState(1);

    // Mock products list with rich images gallery fallback
    const mockProducts = [
        {
            id: 1,
            name: 'Tubo Pelotas Padel Premium',
            price: 8500,
            category: 'Pelotas',
            image: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=600&q=80',
            images: [
                'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=600&q=80',
                'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=600&q=80',
                'https://images.unsplash.com/photo-1622279457486-62dcc4a4b1ca?w=600&q=80'
            ],
            desc: 'Presurizador de alta duración. Pelotas oficiales homologadas para alta competición. Mantienen la presión por más tiempo gracias a su núcleo sintético reforzado.'
        },
        {
            id: 2,
            name: 'Pack x3 Overgrips Wilson',
            price: 4000,
            category: 'Accesorios',
            image: 'https://images.unsplash.com/photo-1622279457486-62dcc4a4b1ca?w=600&q=80',
            images: [
                'https://images.unsplash.com/photo-1622279457486-62dcc4a4b1ca?w=600&q=80',
                'https://images.unsplash.com/photo-1560069000-74947555924a?w=600&q=80'
            ],
            desc: 'Máximo agarre y absorción de sudor. Antideslizantes con textura micro-perforada para un agarre suave y firme en cada impacto.'
        },
        {
            id: 3,
            name: 'Alquiler Pala Bullpadel Vertex',
            price: 2000,
            category: 'Alquileres',
            image: 'https://images.unsplash.com/photo-1616788494707-ec28f08d05a1?w=600&q=80',
            images: [
                'https://images.unsplash.com/photo-1616788494707-ec28f08d05a1?w=600&q=80',
                'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=600&q=80'
            ],
            desc: 'Pala de potencia profesional de fibra de carbono. Ideal para jugadores de nivel intermedio a avanzado que buscan mayor potencia de remate.'
        },
        {
            id: 4,
            name: 'Gatorade Manzana 500ml',
            price: 2500,
            category: 'Bebidas',
            image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=600&q=80',
            images: [
                'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=600&q=80'
            ],
            desc: 'Hidratación rápida con sales minerales y electrolitos para mantener tu rendimiento al máximo durante todo el partido.'
        },
        {
            id: 5,
            name: 'Remera Oficial Cancha Apolo',
            price: 18000,
            category: 'Indumentaria',
            image: 'https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=600&q=80',
            images: [
                'https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=600&q=80',
                'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&q=80'
            ],
            desc: 'Tela dry-fit respirable ligera con tecnología de secado rápido. Diseño exclusivo oficial del club.'
        },
        {
            id: 6,
            name: 'Protector Pala Transparente',
            price: 3000,
            category: 'Accesorios',
            image: 'https://images.unsplash.com/photo-1560069000-74947555924a?w=600&q=80',
            images: [
                'https://images.unsplash.com/photo-1560069000-74947555924a?w=600&q=80'
            ],
            desc: 'Evita rayaduras e impactos en el marco de tu pala. Adhesivo 3M de alta resistencia ultra transparente.'
        }
    ];

    const [products, setProducts] = useState([]);

    useEffect(() => {
        const fetchBusiness = async () => {
            try {
                const allBusinesses = await serviceAdapter.getBusinesses();
                const foundBusiness = findBusinessBySlug(allBusinesses, businessSlug);
                if (foundBusiness) {
                    setBusiness(foundBusiness);
                    // 1. Check metadata store_products
                    const customProducts = foundBusiness.metadata?.store_products;
                    if (Array.isArray(customProducts) && customProducts.length > 0) {
                        setProducts(customProducts.filter(p => p.is_active !== false));
                    } else {
                        // 2. Check store_products table
                        const dbProducts = await serviceAdapter.getStoreProducts(foundBusiness.id, true);
                        if (dbProducts && dbProducts.length > 0) {
                            setProducts(dbProducts);
                        } else {
                            setProducts([]);
                        }
                    }
                }
            } catch (error) {
                console.error('Error fetching business for Store:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchBusiness();
    }, [businessSlug]);

    // Theme setup matching LinkBio / BusinessProfile exactly
    useEffect(() => {
        if (business) {
            const root = document.documentElement;
            const body = document.body;

            const primaryColor = business.primary_color || business.button_color || business.buttonColor ||
                (business.category === 'beauty' ? '#FF4081' :
                    business.category === 'health' ? '#2979FF' : '#00E676');

            root.style.setProperty('--primary-paddle', primaryColor);

            const isDarkTheme = (business.theme || business.metadata?.theme) === 'dark';
            root.setAttribute('data-theme', isDarkTheme ? 'dark' : 'light');

            if (!isDarkTheme) {
                root.style.setProperty('--bg-main', '#F5F7FA');
                root.style.setProperty('--bg-card', '#FFFFFF');
                root.style.setProperty('--text-primary', '#1A1A1A');
                root.style.setProperty('--text-secondary', '#4A4A4A');
                root.style.setProperty('--border', '#E0E0E0');
            } else {
                root.style.setProperty('--bg-main', '#121212');
                root.style.setProperty('--bg-card', '#1E1E1E');
                root.style.setProperty('--text-primary', '#FFFFFF');
                root.style.setProperty('--text-secondary', '#A0A0A0');
                root.style.setProperty('--border', '#333333');
            }
        }
        return () => {
            const root = document.documentElement;
            root.removeAttribute('data-theme');
            root.style.removeProperty('--primary-paddle');
            root.style.removeProperty('--bg-main');
            root.style.removeProperty('--bg-card');
            root.style.removeProperty('--text-primary');
            root.style.removeProperty('--text-secondary');
            root.style.removeProperty('--border');
        };
    }, [business]);

    const addToCart = (product, quantity = 1) => {
        setCart(prev => {
            const existing = prev.find(item => item.id === product.id);
            if (existing) {
                return prev.map(item => item.id === product.id ? { ...item, qty: item.qty + quantity } : item);
            }
            return [...prev, { ...product, qty: quantity }];
        });

        // Trigger toast message
        setToastMessage(`¡${product.name} (${quantity > 1 ? quantity + 'x' : '1x'}) agregado! 🛒`);
        setTimeout(() => {
            setToastMessage(null);
        }, 2000);
    };

    const updateQty = (productId, change) => {
        setCart(prev => prev.map(item => {
            if (item.id === productId) {
                const newQty = item.qty + change;
                return newQty > 0 ? { ...item, qty: newQty } : item;
            }
            return item;
        }));
    };

    const getCartTotal = () => cart.reduce((acc, item) => acc + (item.price * item.qty), 0);

    const handleGoBack = () => {
        // Robust navigation: check if React Router history stack has a previous entry
        if (window.history.state && window.history.state.idx > 0) {
            navigate(-1);
        } else if (overrideSlug) {
            navigate(`/${overrideSlug}`);
        } else if (businessSlug) {
            navigate(`/${businessSlug}`);
        } else {
            navigate('/');
        }
    };

    const handleConfirmOrder = () => {
        if (!business.whatsapp) return;

        // Build WhatsApp text list
        const productListText = cart.map(item => `• ${item.qty}x ${item.name} ($${(item.price * item.qty).toLocaleString('es-AR')})`).join('\n');
        const totalText = getCartTotal().toLocaleString('es-AR');

        const message = `¡Hola ${business.name}! 👋\n\nQuiero realizar el siguiente pedido para retirar por el local:\n\n${productListText}\n\n*Total a pagar:* $${totalText}`;

        window.open(`https://wa.me/${business.whatsapp}?text=${encodeURIComponent(message)}`, '_blank');

        setCart([]);
        setIsCartOpen(false);
    };

    // Helper to extract image list for gallery view
    const getProductImages = (prod) => {
        if (!prod) return [];
        if (Array.isArray(prod.images) && prod.images.length > 0) {
            return prod.images;
        }
        if (prod.image) {
            return [prod.image];
        }
        return ['https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=600&q=80'];
    };

    const handleOpenProductModal = (prod) => {
        setSelectedProductModal(prod);
        setActiveImageIndex(0);
        setModalQty(1);
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: 'var(--bg-main)' }}>
                <div style={{ width: '40px', height: '40px', border: '4px solid var(--border)', borderTopColor: 'var(--primary-paddle)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            </div>
        );
    }

    if (!business) {
        return <div style={{ padding: 40, textAlign: 'center' }}>Negocio no encontrado</div>;
    }

    if (!business.store_enabled) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: 'var(--bg-main)', color: 'var(--text-primary)', gap: '16px', padding: '20px', textAlign: 'center' }}>
                <div style={{ fontSize: '48px' }}>🏪</div>
                <h2 style={{ fontSize: '20px', fontWeight: '800', margin: 0 }}>Tienda no disponible</h2>
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: 0, maxWidth: '300px' }}>
                    Este negocio aún no tiene su tienda habilitada. ¡Próximamente!
                </p>
                <button
                    type="button"
                    onClick={handleGoBack}
                    style={{
                        marginTop: '8px',
                        padding: '12px 28px',
                        borderRadius: '12px',
                        border: 'none',
                        backgroundColor: 'var(--primary-paddle)',
                        color: '#fff',
                        fontSize: '15px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        transition: 'transform 0.2s'
                    }}
                >
                    Volver
                </button>
            </div>
        );
    }

    const activeProductsList = products && products.length > 0 ? products : mockProducts;
    const dynamicCategories = ['Todos', ...Array.from(new Set(activeProductsList.map(p => p.category || 'General')))];

    const filteredProducts = activeCategory === 'Todos'
        ? activeProductsList
        : activeProductsList.filter(p => p.category === activeCategory);

    const bannerTitle = business.metadata?.store_banner_title || 'Todo lo que necesitás para tu partido';
    const bannerSubtitle = business.metadata?.store_banner_subtitle || 'Elegí tus productos y retiralos cuando vengas a jugar';

    // Responsive setup check
    const isMobile = window.innerWidth <= 768;

    // Derive primaryColor for use in JSX (same logic as useEffect)
    const primaryColor = business.primary_color || business.button_color || business.buttonColor ||
        (business.category === 'beauty' ? '#FF4081' :
            business.category === 'health' ? '#2979FF' : '#00E676');

    return (
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-main)', color: 'var(--text-primary)', padding: isMobile ? '16px' : '32px 24px', paddingBottom: '100px', position: 'relative' }}>

            {/* Centered Desktop Wrapper */}
            <div style={{ maxWidth: '1000px', margin: '0 auto' }}>

                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                    <button
                        type="button"
                        onClick={handleGoBack}
                        style={{
                            background: 'var(--bg-card)',
                            border: '1px solid var(--border)',
                            borderRadius: '50%',
                            width: '40px',
                            height: '40px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            color: 'var(--text-primary)',
                            position: 'relative',
                            zIndex: 10,
                            transition: 'transform 0.2s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
                        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                    </button>

                    <h2 style={{ fontSize: isMobile ? '18px' : '22px', fontWeight: '800' }}>Tienda {business.name}</h2>

                    <button
                        type="button"
                        onClick={() => setIsCartOpen(true)}
                        style={{
                            background: 'var(--bg-card)',
                            border: '1px solid var(--border)',
                            borderRadius: '50%',
                            width: '40px',
                            height: '40px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            color: 'var(--text-primary)',
                            position: 'relative',
                            zIndex: 10,
                            transition: 'transform 0.2s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
                        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                    >
                        🛒
                        {cart.length > 0 && (
                            <span style={{ position: 'absolute', top: '-4px', right: '-4px', backgroundColor: 'var(--primary-paddle)', color: '#fff', fontSize: '11px', fontWeight: '700', borderRadius: '50%', minWidth: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2px' }}>
                                {cart.reduce((a, b) => a + b.qty, 0)}
                            </span>
                        )}
                    </button>
                </div>

                {/* Promotional Banner */}
                <div style={{
                    background: `linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}CC 50%, ${primaryColor}99 100%)`,
                    borderRadius: '20px',
                    padding: isMobile ? '20px' : '24px 32px',
                    marginBottom: '24px',
                    position: 'relative',
                    overflow: 'hidden'
                }}>
                    <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '120px', height: '120px', borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
                    <div style={{ position: 'absolute', bottom: '-30px', right: '60px', width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />

                    <h3 style={{ fontSize: isMobile ? '16px' : '18px', fontWeight: '800', color: '#fff', margin: '0 0 6px 0', position: 'relative', zIndex: 1 }}>
                        {bannerTitle}
                    </h3>
                    <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.85)', margin: '0 0 14px 0', position: 'relative', zIndex: 1 }}>
                        {bannerSubtitle}
                    </p>
                    <div style={{ display: 'flex', gap: isMobile ? '8px' : '12px', flexWrap: 'wrap', position: 'relative', zIndex: 1 }}>
                        {[
                            { icon: '🏪', text: 'Retirá en el local' },
                            { icon: '💬', text: 'Pedí por WhatsApp' },
                            { icon: '⚡', text: 'Sin esperas' }
                        ].map((item, i) => (
                            <span key={i} style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '4px 10px',
                                borderRadius: '20px',
                                background: 'rgba(255,255,255,0.18)',
                                color: '#fff',
                                fontSize: '11px',
                                fontWeight: '600',
                                backdropFilter: 'blur(4px)'
                            }}>
                                {item.icon} {item.text}
                            </span>
                        ))}
                    </div>
                </div>

                {/* Categories */}
                <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '12px', marginBottom: '20px', msOverflowStyle: 'none', scrollbarWidth: 'none', justifyContent: isMobile ? 'flex-start' : 'center' }}>
                    {dynamicCategories.map(cat => (
                        <button
                            key={cat}
                            type="button"
                            onClick={() => setActiveCategory(cat)}
                            style={{
                                padding: '8px 18px',
                                borderRadius: '20px',
                                border: activeCategory === cat ? '1px solid var(--primary-paddle)' : '1px solid var(--border)',
                                backgroundColor: activeCategory === cat ? 'var(--primary-paddle)' : 'var(--bg-card)',
                                color: activeCategory === cat ? 'white' : 'var(--text-primary)',
                                fontSize: '12px',
                                fontWeight: '700',
                                whiteSpace: 'nowrap',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                {/* Products Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }}>
                    {filteredProducts.map(prod => (
                        <motion.div
                            key={prod.id}
                            style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '20px', padding: '14px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxShadow: '0 8px 24px rgba(0,0,0,0.02)' }}
                            whileHover={{ y: -4, boxShadow: '0 12px 30px rgba(0,0,0,0.06)' }}
                        >
                            <div>
                                {/* Clickable Product Image Frame */}
                                <div
                                    onClick={() => handleOpenProductModal(prod)}
                                    style={{
                                        height: '140px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        backgroundColor: '#fff',
                                        borderRadius: '14px',
                                        marginBottom: '12px',
                                        overflow: 'hidden',
                                        border: '1px solid var(--border)',
                                        cursor: 'pointer',
                                        position: 'relative'
                                    }}
                                >
                                    <img src={prod.image} alt={prod.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    <span style={{
                                        position: 'absolute',
                                        bottom: '6px',
                                        right: '6px',
                                        backgroundColor: 'rgba(0,0,0,0.65)',
                                        color: '#fff',
                                        fontSize: '10px',
                                        fontWeight: '700',
                                        padding: '2px 8px',
                                        borderRadius: '10px',
                                        backdropFilter: 'blur(4px)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '3px'
                                    }}>
                                        🔍 Ver fotos
                                    </span>
                                </div>

                                <h4
                                    onClick={() => handleOpenProductModal(prod)}
                                    style={{
                                        fontSize: '14px',
                                        fontWeight: '800',
                                        marginBottom: '4px',
                                        lineHeight: '1.3',
                                        color: 'var(--text-primary)',
                                        cursor: 'pointer'
                                    }}
                                >
                                    {prod.name}
                                </h4>
                                <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '12px', height: '32px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                                    {prod.desc}
                                </p>
                            </div>

                            <div>
                                <div style={{ fontSize: '16px', fontWeight: '900', marginBottom: '10px', color: 'var(--primary-paddle)' }}>
                                    ${prod.price.toLocaleString('es-AR')}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => addToCart(prod, 1)}
                                    style={{
                                        width: '100%',
                                        padding: '10px',
                                        borderRadius: '12px',
                                        border: 'none',
                                        backgroundColor: 'var(--primary-paddle)',
                                        color: 'white',
                                        fontWeight: '700',
                                        fontSize: '12px',
                                        cursor: 'pointer',
                                        transition: 'opacity 0.2s'
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
                                    onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                                >
                                    Agregar +
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* Product Detail & Multi-Image Gallery Modal */}
            <AnimatePresence>
                {selectedProductModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                            position: 'fixed',
                            inset: 0,
                            backgroundColor: 'rgba(0,0,0,0.75)',
                            backdropFilter: 'blur(6px)',
                            zIndex: 1100,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '16px'
                        }}
                        onClick={() => setSelectedProductModal(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            style={{
                                width: '100%',
                                maxWidth: '550px',
                                maxHeight: '90vh',
                                backgroundColor: 'var(--bg-card)',
                                border: '1px solid var(--border)',
                                borderRadius: '24px',
                                overflowY: 'auto',
                                padding: isMobile ? '20px' : '28px',
                                boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
                                position: 'relative',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '18px'
                            }}
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Close Button */}
                            <button
                                type="button"
                                onClick={() => setSelectedProductModal(null)}
                                style={{
                                    position: 'absolute',
                                    top: '16px',
                                    right: '16px',
                                    border: 'none',
                                    background: 'var(--bg-main)',
                                    color: 'var(--text-primary)',
                                    borderRadius: '50%',
                                    width: '36px',
                                    height: '36px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '20px',
                                    cursor: 'pointer',
                                    zIndex: 10,
                                    boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
                                }}
                            >
                                ×
                            </button>

                            {/* Image Gallery Section */}
                            {(() => {
                                const images = getProductImages(selectedProductModal);
                                const currentImg = images[activeImageIndex] || images[0];

                                return (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        {/* Main Image Display */}
                                        <div style={{
                                            position: 'relative',
                                            width: '100%',
                                            height: isMobile ? '240px' : '300px',
                                            backgroundColor: '#fff',
                                            borderRadius: '16px',
                                            overflow: 'hidden',
                                            border: '1px solid var(--border)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}>
                                            <motion.img
                                                key={activeImageIndex}
                                                initial={{ opacity: 0.5, scale: 0.98 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                transition={{ duration: 0.2 }}
                                                src={currentImg}
                                                alt={selectedProductModal.name}
                                                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                            />

                                            {/* Navigation Arrows (if multiple images) */}
                                            {images.length > 1 && (
                                                <>
                                                    <button
                                                        type="button"
                                                        onClick={() => setActiveImageIndex(prev => prev > 0 ? prev - 1 : images.length - 1)}
                                                        style={{
                                                            position: 'absolute',
                                                            left: '10px',
                                                            top: '50%',
                                                            transform: 'translateY(-50%)',
                                                            backgroundColor: 'rgba(0,0,0,0.65)',
                                                            color: '#fff',
                                                            border: 'none',
                                                            borderRadius: '50%',
                                                            width: '36px',
                                                            height: '36px',
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            fontSize: '18px',
                                                            zIndex: 5
                                                        }}
                                                    >
                                                        ‹
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setActiveImageIndex(prev => prev < images.length - 1 ? prev + 1 : 0)}
                                                        style={{
                                                            position: 'absolute',
                                                            right: '10px',
                                                            top: '50%',
                                                            transform: 'translateY(-50%)',
                                                            backgroundColor: 'rgba(0,0,0,0.65)',
                                                            color: '#fff',
                                                            border: 'none',
                                                            borderRadius: '50%',
                                                            width: '36px',
                                                            height: '36px',
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            fontSize: '18px',
                                                            zIndex: 5
                                                        }}
                                                    >
                                                        ›
                                                    </button>
                                                    <span style={{
                                                        position: 'absolute',
                                                        bottom: '10px',
                                                        right: '10px',
                                                        backgroundColor: 'rgba(0,0,0,0.7)',
                                                        color: '#fff',
                                                        fontSize: '11px',
                                                        fontWeight: '700',
                                                        padding: '4px 12px',
                                                        borderRadius: '12px',
                                                        backdropFilter: 'blur(4px)'
                                                    }}>
                                                        {activeImageIndex + 1} / {images.length}
                                                    </span>
                                                </>
                                            )}
                                        </div>

                                        {/* Thumbnails Row (if multiple images) */}
                                        {images.length > 1 && (
                                            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
                                                {images.map((imgUrl, idx) => (
                                                    <div
                                                        key={idx}
                                                        onClick={() => setActiveImageIndex(idx)}
                                                        style={{
                                                            width: '56px',
                                                            height: '56px',
                                                            borderRadius: '10px',
                                                            overflow: 'hidden',
                                                            border: activeImageIndex === idx ? '2px solid var(--primary-paddle)' : '1px solid var(--border)',
                                                            cursor: 'pointer',
                                                            opacity: activeImageIndex === idx ? 1 : 0.5,
                                                            transition: 'all 0.2s',
                                                            flexShrink: 0,
                                                            backgroundColor: '#fff'
                                                        }}
                                                    >
                                                        <img src={imgUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}

                            {/* Product Details */}
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                    <span style={{
                                        fontSize: '11px',
                                        fontWeight: '700',
                                        padding: '4px 10px',
                                        borderRadius: '12px',
                                        backgroundColor: 'rgba(132, 204, 22, 0.15)',
                                        color: 'var(--primary-paddle)'
                                    }}>
                                        {selectedProductModal.category || 'General'}
                                    </span>
                                </div>

                                <h3 style={{ fontSize: '20px', fontWeight: '800', margin: '0 0 8px 0', color: 'var(--text-primary)' }}>
                                    {selectedProductModal.name}
                                </h3>

                                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 16px 0', lineHeight: '1.5' }}>
                                    {selectedProductModal.desc || 'Sin descripción disponible.'}
                                </p>

                                <div style={{ fontSize: '24px', fontWeight: '900', color: 'var(--primary-paddle)', marginBottom: '20px' }}>
                                    ${(selectedProductModal.price || 0).toLocaleString('es-AR')}
                                </div>

                                {/* Quantity Selector & Add Button */}
                                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                        backgroundColor: 'var(--bg-main)',
                                        border: '1px solid var(--border)',
                                        borderRadius: '14px',
                                        padding: '8px 16px'
                                    }}>
                                        <button
                                            type="button"
                                            onClick={() => setModalQty(prev => Math.max(1, prev - 1))}
                                            style={{ border: 'none', background: 'none', fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)', cursor: 'pointer' }}
                                        >
                                            -
                                        </button>
                                        <span style={{ fontSize: '15px', fontWeight: '800', minWidth: '20px', textAlign: 'center' }}>
                                            {modalQty}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => setModalQty(prev => prev + 1)}
                                            style={{ border: 'none', background: 'none', fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)', cursor: 'pointer' }}
                                        >
                                            +
                                        </button>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            addToCart(selectedProductModal, modalQty);
                                            setSelectedProductModal(null);
                                        }}
                                        style={{
                                            flex: 1,
                                            padding: '14px',
                                            borderRadius: '14px',
                                            border: 'none',
                                            backgroundColor: 'var(--primary-paddle)',
                                            color: '#fff',
                                            fontWeight: '800',
                                            fontSize: '14px',
                                            cursor: 'pointer',
                                            boxShadow: '0 6px 16px rgba(0,0,0,0.1)',
                                            transition: 'transform 0.2s'
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
                                        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                                    >
                                        Agregar al Carrito 🛒
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Floating Toast Notification */}
            <AnimatePresence>
                {toastMessage && (
                    <motion.div
                        initial={{ opacity: 0, y: 50, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.9 }}
                        style={{
                            position: 'fixed',
                            bottom: '30px',
                            left: '50%',
                            x: '-50%',
                            backgroundColor: 'var(--bg-card)',
                            border: '1px solid var(--primary-paddle)',
                            color: 'var(--text-primary)',
                            padding: '12px 24px',
                            borderRadius: '30px',
                            boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
                            fontSize: '14px',
                            fontWeight: '700',
                            zIndex: 2000,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}
                    >
                        {toastMessage}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Simulated Cart Drawer */}
            <AnimatePresence>
                {isCartOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', justifyContent: 'flex-end' }}
                        onClick={() => setIsCartOpen(false)}
                    >
                        <motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'tween', duration: 0.3 }}
                            style={{ width: '85%', maxWidth: '400px', height: '100%', backgroundColor: 'var(--bg-card)', borderLeft: '1px solid var(--border)', padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
                            onClick={e => e.stopPropagation()}
                        >
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                                    <h3 style={{ fontSize: '18px', fontWeight: '800' }}>Tu Carrito</h3>
                                    <button onClick={() => setIsCartOpen(false)} style={{ border: 'none', background: 'none', fontSize: '28px', cursor: 'pointer', color: 'var(--text-primary)', lineHeight: '1' }}>×</button>
                                </div>

                                {cart.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '60px 10px', color: 'var(--text-secondary)' }}>
                                        <div style={{ fontSize: '40px', marginBottom: '16px' }}>🛒</div>
                                        <p style={{ fontSize: '14px' }}>Tu carrito está vacío</p>
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '65vh', overflowY: 'auto' }}>
                                        {cart.map(item => (
                                            <div key={item.id} style={{ display: 'flex', gap: '12px', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '16px' }}>
                                                <div style={{ width: '50px', height: '50px', backgroundColor: 'white', borderRadius: '10px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid var(--border)' }}>
                                                    <img src={item.image} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                </div>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <h4 style={{ fontSize: '13px', fontWeight: '700', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</h4>
                                                    <div style={{ fontSize: '12px', color: 'var(--primary-paddle)', fontWeight: '800', marginTop: '4px' }}>
                                                        ${(item.price * item.qty).toLocaleString('es-AR')}
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--bg-main)', borderRadius: '12px', padding: '6px 10px' }}>
                                                    <button onClick={() => updateQty(item.id, -1)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontWeight: '700', color: 'var(--text-primary)', fontSize: '14px' }}>-</button>
                                                    <span style={{ fontSize: '12px', fontWeight: '700' }}>{item.qty}</span>
                                                    <button onClick={() => updateQty(item.id, 1)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontWeight: '700', color: 'var(--text-primary)', fontSize: '14px' }}>+</button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {cart.length > 0 && (
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
                                        <span style={{ fontWeight: '700', fontSize: '15px' }}>Total del pedido:</span>
                                        <span style={{ fontWeight: '900', fontSize: '18px', color: 'var(--primary-paddle)' }}>
                                            ${getCartTotal().toLocaleString('es-AR')}
                                        </span>
                                    </div>
                                    <button
                                        onClick={handleConfirmOrder}
                                        style={{
                                            width: '100%',
                                            padding: '14px',
                                            borderRadius: '12px',
                                            border: 'none',
                                            backgroundColor: 'var(--primary-paddle)',
                                            color: 'white',
                                            fontWeight: '800',
                                            fontSize: '14px',
                                            cursor: 'pointer',
                                            boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                                        }}
                                    >
                                        Enviar Pedido por WhatsApp 📲
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
