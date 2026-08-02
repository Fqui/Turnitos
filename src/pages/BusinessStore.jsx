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

    // Mock products list with real Unsplash images
    const mockProducts = [
        { id: 1, name: 'Tubo Pelotas Padel Premium', price: 8500, category: 'Pelotas', image: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=400&q=80', desc: 'Presurizador de alta duración' },
        { id: 2, name: 'Pack x3 Overgrips Wilson', price: 4000, category: 'Accesorios', image: 'https://images.unsplash.com/photo-1622279457486-62dcc4a4b1ca?w=400&q=80', desc: 'Máximo agarre y absorción' },
        { id: 3, name: 'Alquiler Pala Bullpadel Vertex', price: 2000, category: 'Alquileres', image: 'https://images.unsplash.com/photo-1616788494707-ec28f08d05a1?w=400&q=80', desc: 'Pala de potencia profesional' },
        { id: 4, name: 'Gatorade Manzana 500ml', price: 2500, category: 'Bebidas', image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400&q=80', desc: 'Hidratación rápida' },
        { id: 5, name: 'Remera Oficial Cancha Apolo', price: 18000, category: 'Indumentaria', image: 'https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=400&q=80', desc: 'Tela dry-fit respirable' },
        { id: 6, name: 'Protector Pala Transparente', price: 3000, category: 'Accesorios', image: 'https://images.unsplash.com/photo-1560069000-74947555924a?w=400&q=80', desc: 'Evita rayaduras e impactos' }
    ];

    const categories = ['Todos', 'Pelotas', 'Alquileres', 'Bebidas', 'Accesorios', 'Indumentaria'];

    useEffect(() => {
        const fetchBusiness = async () => {
            try {
                const allBusinesses = await serviceAdapter.getBusinesses();
                const foundBusiness = findBusinessBySlug(allBusinesses, businessSlug);
                if (foundBusiness) {
                    setBusiness(foundBusiness);
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

            // Resolved exactly like BusinessProfile to ensure matching colors
            const primaryColor = business.primary_color || business.button_color || business.buttonColor ||
                (business.category === 'beauty' ? '#FF4081' :
                    business.category === 'health' ? '#2979FF' : '#00E676');

            root.style.setProperty('--primary-paddle', primaryColor);

            if (business.theme === 'light') {
                root.style.setProperty('--bg-main', '#F5F7FA');
                root.style.setProperty('--bg-card', '#FFFFFF');
                root.style.setProperty('--text-primary', '#1A1A1A');
                root.style.setProperty('--text-secondary', '#4A4A4A');
                root.style.setProperty('--border', '#E0E0E0');
                body.style.backgroundImage = 'radial-gradient(#E0E0E0 1.5px, transparent 1.5px)';
            } else {
                root.style.setProperty('--bg-main', '#121212');
                root.style.setProperty('--bg-card', '#1E1E1E');
                root.style.setProperty('--text-primary', '#FFFFFF');
                root.style.setProperty('--text-secondary', '#A0A0A0');
                root.style.setProperty('--border', '#333333');
                body.style.backgroundImage = 'radial-gradient(rgba(255, 255, 255, 0.05) 1.5px, transparent 1.5px)';
            }
        }
    }, [business]);

    const addToCart = (product) => {
        setCart(prev => {
            const existing = prev.find(item => item.id === product.id);
            if (existing) {
                return prev.map(item => item.id === product.id ? { ...item, qty: item.qty + 1 } : item);
            }
            return [...prev, { ...product, qty: 1 }];
        });

        // Trigger toast message
        setToastMessage(`¡${product.name} agregado! 🛒`);
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
        // Si hay historial de navegación, volver atrás (respeta si vino de LinkBio o de Turnos)
        if (window.history.length > 1) {
            navigate(-1);
        } else if (overrideSlug) {
            navigate('/');
        } else {
            navigate(`/${businessSlug}`);
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

    const filteredProducts = activeCategory === 'Todos'
        ? mockProducts
        : mockProducts.filter(p => p.category === activeCategory);

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
                    <button onClick={handleGoBack} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-primary)', transition: 'transform 0.2s' }} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                    </button>
                    <h2 style={{ fontSize: isMobile ? '18px' : '22px', fontWeight: '800' }}>Tienda {business.name}</h2>
                    <button onClick={() => setIsCartOpen(true)} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-primary)', position: 'relative', transition: 'transform 0.2s' }} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
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
                        Todo lo que necesitás para tu partido
                    </h3>
                    <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.85)', margin: '0 0 14px 0', position: 'relative', zIndex: 1 }}>
                        Elegí tus productos y retiralos cuando vengas a jugar
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
                    {categories.map(cat => (
                        <button
                            key={cat}
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

                {/* Products Grid - Improved Desktop Columns */}
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }}>
                    {filteredProducts.map(prod => (
                        <motion.div 
                            key={prod.id} 
                            style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '20px', padding: '14px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxShadow: '0 8px 24px rgba(0,0,0,0.02)' }}
                            whileHover={{ y: -4, boxShadow: '0 12px 30px rgba(0,0,0,0.06)' }}
                        >
                            <div>
                                <div style={{ height: '140px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', borderRadius: '14px', marginBottom: '12px', overflow: 'hidden', border: '1px solid var(--border)' }}>
                                    <img src={prod.image} alt={prod.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                </div>
                                <h4 style={{ fontSize: '14px', fontWeight: '800', marginBottom: '4px', lineHeight: '1.3', color: 'var(--text-primary)' }}>{prod.name}</h4>
                                <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '12px', height: '32px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{prod.desc}</p>
                            </div>
                            <div>
                                <div style={{ fontSize: '16px', fontWeight: '900', marginBottom: '10px', color: 'var(--primary-paddle)' }}>
                                    ${prod.price.toLocaleString('es-AR')}
                                </div>
                                <button
                                    onClick={() => addToCart(prod)}
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
