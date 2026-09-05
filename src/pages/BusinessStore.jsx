import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search,
    ShoppingBag,
    SlidersHorizontal,
    Heart,
    ChevronLeft,
    ChevronRight,
    Plus,
    Minus,
    ArrowLeft,
    CheckCircle2,
    Sparkles,
    X,
    ArrowUpRight,
    Check
} from 'lucide-react';
import serviceAdapter from '../services/serviceAdapter';
import { findBusinessBySlug, getSubdomain } from '../utils/utils';
import { isFreePlan } from '../utils/subscriptionUtils';

export default function BusinessStore({ overrideSlug }) {
    const { businessSlug: routeSlug } = useParams();
    const businessSlug = overrideSlug || routeSlug;
    const navigate = useNavigate();
    const location = useLocation();

    const [business, setBusiness] = useState(null);
    const [loading, setLoading] = useState(true);
    const [cart, setCart] = useState([]);
    const [activeCategory, setActiveCategory] = useState('Todos');
    const [searchQuery, setSearchQuery] = useState('');
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [toastMessage, setToastMessage] = useState(null);
    const [favorites, setFavorites] = useState({});

    // Product Detail View state (matching Screen 2 from reference)
    const [selectedProductModal, setSelectedProductModal] = useState(null);
    const [activeImageIndex, setActiveImageIndex] = useState(0);
    const [modalQty, setModalQty] = useState(1);
    const [selectedSize, setSelectedSize] = useState(null);

    const [products, setProducts] = useState([]);

    useEffect(() => {
        const fetchBusiness = async () => {
            try {
                const allBusinesses = await serviceAdapter.getBusinesses();
                const foundBusiness = findBusinessBySlug(allBusinesses, businessSlug);
                if (foundBusiness) {
                    if (isFreePlan(foundBusiness.subscription_plan_id || foundBusiness.subscription_plan_name)) {
                        navigate(`/${foundBusiness.slug || businessSlug}`, { replace: true });
                        return;
                    }
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
            const primaryColor = business.primary_color || business.button_color || business.buttonColor ||
                (business.category === 'beauty' ? '#FF4081' :
                    business.category === 'health' ? '#2979FF' : '#00E676');

            root.style.setProperty('--primary-paddle', primaryColor);

            const isDarkTheme = (business.theme || business.metadata?.theme) === 'dark';
            root.setAttribute('data-theme', isDarkTheme ? 'dark' : 'light');

            if (!isDarkTheme) {
                root.style.setProperty('--bg-main', '#F8FAFC');
                root.style.setProperty('--bg-card', '#FFFFFF');
                root.style.setProperty('--text-primary', '#0F172A');
                root.style.setProperty('--text-secondary', '#64748B');
                root.style.setProperty('--border', '#E2E8F0');
            } else {
                root.style.setProperty('--bg-main', '#0B0F17');
                root.style.setProperty('--bg-card', '#151C28');
                root.style.setProperty('--text-primary', '#F8FAFC');
                root.style.setProperty('--text-secondary', '#94A3B8');
                root.style.setProperty('--border', '#222F3E');
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

    const addToCart = (product, quantity = 1, size = null) => {
        setCart(prev => {
            const cartItemId = size ? `${product.id}-${size}` : product.id;
            const existing = prev.find(item => item.cartId === cartItemId);
            if (existing) {
                return prev.map(item => item.cartId === cartItemId ? { ...item, qty: item.qty + quantity } : item);
            }
            return [...prev, { ...product, cartId: cartItemId, selectedSize: size, qty: quantity }];
        });

        // Trigger toast message
        setToastMessage(`¡${product.name} agregado al carrito! 🛍️`);
        setTimeout(() => {
            setToastMessage(null);
        }, 2200);
    };

    const updateQty = (cartId, change) => {
        setCart(prev => prev.map(item => {
            if (item.cartId === cartId || item.id === cartId) {
                const newQty = item.qty + change;
                return newQty > 0 ? { ...item, qty: newQty } : item;
            }
            return item;
        }).filter(item => item.qty > 0));
    };

    const removeFromCart = (cartId) => {
        setCart(prev => prev.filter(item => (item.cartId || item.id) !== cartId));
    };

    const toggleFavorite = (productId, e) => {
        if (e) e.stopPropagation();
        setFavorites(prev => ({
            ...prev,
            [productId]: !prev[productId]
        }));
    };

    const getCartTotal = () => cart.reduce((acc, item) => acc + (Number(item.price || 0) * item.qty), 0);
    const getCartCount = () => cart.reduce((acc, item) => acc + item.qty, 0);

    const handleGoBack = () => {
        if (selectedProductModal) {
            setSelectedProductModal(null);
            return;
        }
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
        if (!business?.whatsapp) {
            alert('El negocio no tiene configurado un número de WhatsApp para pedidos.');
            return;
        }

        const productListText = cart.map(item =>
            `• ${item.qty}x ${item.name}${item.selectedSize ? ` (${item.selectedSize})` : ''} — $${(Number(item.price) * item.qty).toLocaleString('es-AR')}`
        ).join('\n');
        const totalText = getCartTotal().toLocaleString('es-AR');

        const message = `¡Hola ${business.name}! 👋\n\nQuiero realizar el siguiente pedido desde su tienda online:\n\n${productListText}\n\n*Total a pagar:* $${totalText}\n\n¿Tienen disponibilidad para coordinar el retiro/entrega? ¡Gracias!`;

        window.open(`https://wa.me/${business.whatsapp}?text=${encodeURIComponent(message)}`, '_blank');
        setCart([]);
        setIsCartOpen(false);
    };

    const getProductImages = (prod) => {
        if (!prod) return [];
        if (Array.isArray(prod.images) && prod.images.length > 0) {
            return prod.images;
        }
        if (prod.image) {
            return [prod.image];
        }
        return ['https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=600&q=80'];
    };

    const handleOpenProductModal = (prod) => {
        setSelectedProductModal(prod);
        setActiveImageIndex(0);
        setModalQty(1);
        setSelectedSize(prod.sizes?.[0] || null);
    };

    // Category with representative thumbnail mapping
    const dynamicCategories = useMemo(() => {
        const catMap = new Map();
        (products || []).forEach(p => {
            const cat = p.category || 'General';
            if (!catMap.has(cat)) {
                catMap.set(cat, p.image || p.images?.[0] || null);
            }
        });

        const list = [{ name: 'Todos', image: null }];
        catMap.forEach((img, name) => {
            list.push({ name, image: img });
        });
        return list;
    }, [products]);

    // Filtering logic (Category + Search Query)
    const filteredProducts = useMemo(() => {
        let list = products || [];
        if (activeCategory !== 'Todos') {
            list = list.filter(p => (p.category || 'General') === activeCategory);
        }
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            list = list.filter(p =>
                (p.name && p.name.toLowerCase().includes(q)) ||
                (p.desc && p.desc.toLowerCase().includes(q)) ||
                (p.category && p.category.toLowerCase().includes(q))
            );
        }
        return list;
    }, [products, activeCategory, searchQuery]);

    const featuredProduct = products?.[0] || null;

    const primaryColor = business?.primary_color || business?.button_color || business?.buttonColor || '#10B981';

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: 'var(--bg-main)' }}>
                <div style={{ width: '40px', height: '40px', border: '3px solid var(--border)', borderTopColor: primaryColor, borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            </div>
        );
    }

    if (!business) {
        return <div style={{ padding: 40, textAlign: 'center' }}>Negocio no encontrado</div>;
    }

    if (!business.store_enabled) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: 'var(--bg-main)', color: 'var(--text-primary)', gap: '16px', padding: '20px', textAlign: 'center' }}>
                <div style={{ fontSize: '54px' }}>🏪</div>
                <h2 style={{ fontSize: '22px', fontWeight: '800', margin: 0 }}>Tienda no disponible</h2>
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: 0, maxWidth: '320px', lineHeight: 1.4 }}>
                    Este negocio aún no tiene habilitada su tienda de productos online.
                </p>
                <button
                    type="button"
                    onClick={handleGoBack}
                    style={{
                        marginTop: '10px',
                        padding: '12px 28px',
                        borderRadius: '14px',
                        border: 'none',
                        backgroundColor: primaryColor,
                        color: '#fff',
                        fontSize: '15px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        boxShadow: `0 4px 14px ${primaryColor}40`
                    }}
                >
                    Volver al perfil
                </button>
            </div>
        );
    }

    return (
        <div style={{
            minHeight: '100vh',
            backgroundColor: 'var(--bg-main)',
            color: 'var(--text-primary)',
            paddingBottom: '100px',
            position: 'relative'
        }}>
            {/* Centered Mobile/Desktop Shell */}
            <div style={{ maxWidth: '640px', margin: '0 auto', padding: '16px 20px' }}>

                {/* ═══ 1. TOP HEADER (Screen 1 Reference) ═══ */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '18px'
                }}>
                    {/* Back / Menu button */}
                    <button
                        type="button"
                        onClick={handleGoBack}
                        style={{
                            background: 'var(--bg-card)',
                            border: '1px solid var(--border)',
                            borderRadius: '50%',
                            width: '42px',
                            height: '42px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            color: 'var(--text-primary)',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                            transition: 'transform 0.15s ease'
                        }}
                        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
                        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                        title="Volver"
                    >
                        <ArrowLeft size={18} />
                    </button>

                    {/* Store Title */}
                    <div style={{ textAlign: 'center', minWidth: 0, padding: '0 10px' }}>
                        <div style={{
                            fontSize: '17px',
                            fontWeight: '800',
                            color: 'var(--text-primary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '5px'
                        }}>
                            <span>{business.name}</span>
                            <CheckCircle2 size={16} color={primaryColor} />
                        </div>
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '600' }}>
                            Tienda Oficial
                        </span>
                    </div>

                    {/* Cart Button with floating counter */}
                    <button
                        type="button"
                        onClick={() => setIsCartOpen(true)}
                        style={{
                            position: 'relative',
                            background: 'var(--bg-card)',
                            border: '1px solid var(--border)',
                            borderRadius: '50%',
                            width: '42px',
                            height: '42px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            color: 'var(--text-primary)',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                            transition: 'transform 0.15s ease'
                        }}
                        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
                        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                        title="Ver Carrito"
                    >
                        <ShoppingBag size={18} />
                        {getCartCount() > 0 && (
                            <motion.span
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                style={{
                                    position: 'absolute',
                                    top: '-3px',
                                    right: '-3px',
                                    backgroundColor: primaryColor,
                                    color: '#ffffff',
                                    fontSize: '10px',
                                    fontWeight: '800',
                                    borderRadius: '10px',
                                    minWidth: '18px',
                                    height: '18px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: '0 4px',
                                    boxShadow: `0 2px 6px ${primaryColor}60`
                                }}
                            >
                                {getCartCount()}
                            </motion.span>
                        )}
                    </button>
                </div>

                {/* ═══ 2. SEARCH & FILTER BAR ═══ */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    marginBottom: '20px'
                }}>
                    <div style={{
                        flex: 1,
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        background: 'var(--bg-card)',
                        borderRadius: '24px',
                        border: '1px solid var(--border)',
                        padding: '0 16px',
                        height: '46px',
                        boxShadow: '0 2px 10px rgba(0,0,0,0.02)'
                    }}>
                        <Search size={18} color="var(--text-secondary)" style={{ flexShrink: 0, marginRight: '10px' }} />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="¿Qué estás buscando?"
                            style={{
                                width: '100%',
                                border: 'none',
                                background: 'transparent',
                                color: 'var(--text-primary)',
                                fontSize: '13px',
                                outline: 'none',
                                fontWeight: '500'
                            }}
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => setSearchQuery('')}
                                style={{
                                    border: 'none',
                                    background: 'none',
                                    color: 'var(--text-secondary)',
                                    cursor: 'pointer',
                                    padding: '4px'
                                }}
                            >
                                <X size={16} />
                            </button>
                        )}
                    </div>

                    <button
                        type="button"
                        onClick={() => {
                            // Cycle through categories or open filter
                            setActiveCategory('Todos');
                            setSearchQuery('');
                        }}
                        style={{
                            width: '46px',
                            height: '46px',
                            borderRadius: '24px',
                            background: 'var(--bg-card)',
                            border: '1px solid var(--border)',
                            color: 'var(--text-primary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            flexShrink: 0,
                            boxShadow: '0 2px 10px rgba(0,0,0,0.02)'
                        }}
                        title="Limpiar filtros"
                    >
                        <SlidersHorizontal size={18} />
                    </button>
                </div>

                {/* ═══ 3. HERO PROMO BANNER (Screen 1 Reference: Bento 3D Card) ═══ */}
                {featuredProduct && (
                    <div
                        onClick={() => handleOpenProductModal(featuredProduct)}
                        style={{
                            position: 'relative',
                            background: `linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}d9 55%, ${primaryColor}b3 100%)`,
                            borderRadius: '24px',
                            padding: '20px 22px',
                            marginBottom: '26px',
                            overflow: 'hidden',
                            minHeight: '144px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            cursor: 'pointer',
                            boxShadow: `0 10px 28px ${primaryColor}38`,
                            transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                        }}
                        onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                        onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                        {/* Ambient decorative blob */}
                        <div style={{
                            position: 'absolute',
                            top: '-40px',
                            right: '-40px',
                            width: '140px',
                            height: '140px',
                            borderRadius: '50%',
                            background: 'rgba(255,255,255,0.2)',
                            filter: 'blur(30px)',
                            pointerEvents: 'none'
                        }} />

                        {/* Left Banner Text */}
                        <div style={{
                            zIndex: 2,
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            maxWidth: '60%'
                        }}>
                            <div>
                                <span style={{
                                    display: 'inline-block',
                                    fontSize: '10px',
                                    fontWeight: '800',
                                    color: '#ffffff',
                                    background: 'rgba(0,0,0,0.22)',
                                    padding: '3px 9px',
                                    borderRadius: '12px',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.6px',
                                    marginBottom: '8px'
                                }}>
                                    Oferta Especial
                                </span>
                                <h3 style={{
                                    fontSize: '16px',
                                    fontWeight: '800',
                                    color: '#ffffff',
                                    margin: 0,
                                    lineHeight: 1.25,
                                    letterSpacing: '-0.2px'
                                }}>
                                    {business.metadata?.store_banner_title || 'Comprá online y retirá en tu turno'}
                                </h3>
                            </div>

                            {/* Pill CTA button with up-right arrow */}
                            <div style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '8px',
                                marginTop: '14px'
                            }}>
                                <div style={{
                                    padding: '7px 14px',
                                    borderRadius: '20px',
                                    background: '#111827',
                                    color: '#ffffff',
                                    fontSize: '11px',
                                    fontWeight: '800',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    letterSpacing: '0.4px',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                                }}>
                                    Comprar Ahora
                                    <div style={{
                                        width: '16px',
                                        height: '16px',
                                        borderRadius: '50%',
                                        background: '#ffffff',
                                        color: '#111827',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '10px',
                                        fontWeight: '900'
                                    }}>
                                        ↗
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right: 3D Product showcase cutout */}
                        <div style={{
                            position: 'absolute',
                            right: '-10px',
                            bottom: '-8px',
                            top: '-8px',
                            width: '45%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            pointerEvents: 'none',
                            zIndex: 1
                        }}>
                            <img
                                src={featuredProduct.image || featuredProduct.images?.[0] || 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=300&q=80'}
                                alt={featuredProduct.name}
                                style={{
                                    maxWidth: '135px',
                                    maxHeight: '135px',
                                    width: 'auto',
                                    height: 'auto',
                                    objectFit: 'contain',
                                    filter: 'drop-shadow(0 12px 20px rgba(0,0,0,0.25))'
                                }}
                            />
                        </div>
                    </div>
                )}

                {/* ═══ 4. CATEGORIES SECTION (With Micro-thumbnails) ═══ */}
                <div style={{ marginBottom: '26px' }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '12px'
                    }}>
                        <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>
                            Categorías
                        </h3>
                        {activeCategory !== 'Todos' && (
                            <button
                                type="button"
                                onClick={() => setActiveCategory('Todos')}
                                style={{
                                    border: 'none',
                                    background: 'none',
                                    color: primaryColor,
                                    fontSize: '12px',
                                    fontWeight: '700',
                                    cursor: 'pointer',
                                    padding: 0
                                }}
                            >
                                Ver todas
                            </button>
                        )}
                    </div>

                    {/* Horizontal Category Pills with thumbnails */}
                    <div style={{
                        display: 'flex',
                        gap: '10px',
                        overflowX: 'auto',
                        paddingBottom: '4px',
                        scrollbarWidth: 'none',
                        msOverflowStyle: 'none'
                    }}>
                        {dynamicCategories.map(cat => {
                            const isActive = activeCategory === cat.name;
                            return (
                                <button
                                    key={cat.name}
                                    type="button"
                                    onClick={() => setActiveCategory(cat.name)}
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        padding: '7px 14px',
                                        borderRadius: '24px',
                                        border: isActive ? `1.5px solid ${primaryColor}` : '1px solid var(--border)',
                                        background: isActive ? `${primaryColor}15` : 'var(--bg-card)',
                                        color: isActive ? primaryColor : 'var(--text-primary)',
                                        fontSize: '12px',
                                        fontWeight: '700',
                                        cursor: 'pointer',
                                        whiteSpace: 'nowrap',
                                        flexShrink: 0,
                                        transition: 'all 0.18s ease',
                                        boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
                                    }}
                                >
                                    {cat.image && (
                                        <img
                                            src={cat.image}
                                            alt=""
                                            style={{
                                                width: '22px',
                                                height: '22px',
                                                borderRadius: '50%',
                                                objectFit: 'cover',
                                                background: '#ffffff'
                                            }}
                                        />
                                    )}
                                    <span>{cat.name}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* ═══ 5. PRODUCTS GRID ("Novedades" / Catálogo) ═══ */}
                <div style={{ marginBottom: '20px' }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '14px'
                    }}>
                        <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>
                            {activeCategory === 'Todos' ? 'Nuestros Productos' : activeCategory}
                        </h3>
                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600' }}>
                            {filteredProducts.length} {filteredProducts.length === 1 ? 'artículo' : 'artículos'}
                        </span>
                    </div>

                    {filteredProducts.length === 0 ? (
                        <div style={{
                            textAlign: 'center',
                            padding: '50px 20px',
                            color: 'var(--text-secondary)',
                            background: 'var(--bg-card)',
                            borderRadius: '24px',
                            border: '1px solid var(--border)'
                        }}>
                            <div style={{ fontSize: '42px', marginBottom: '12px' }}>🔍</div>
                            <h4 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)', margin: '0 0 6px 0' }}>
                                No encontramos resultados
                            </h4>
                            <p style={{ fontSize: '13px', margin: 0 }}>
                                Probá buscando con otro término o seleccionando otra categoría.
                            </p>
                        </div>
                    ) : (
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(2, 1fr)',
                            gap: '14px'
                        }}>
                            {filteredProducts.map(prod => {
                                const isFav = Boolean(favorites[prod.id]);
                                const img = prod.image || prod.images?.[0] || 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=300&q=80';

                                return (
                                    <motion.div
                                        key={prod.id}
                                        onClick={() => handleOpenProductModal(prod)}
                                        style={{
                                            background: 'var(--bg-card)',
                                            borderRadius: '20px',
                                            padding: '12px',
                                            border: '1px solid var(--border)',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            justifyContent: 'space-between',
                                            boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
                                            position: 'relative',
                                            transition: 'transform 0.18s ease, box-shadow 0.18s ease'
                                        }}
                                        whileHover={{ y: -3, boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}
                                    >
                                        {/* Top Image Container */}
                                        <div style={{
                                            position: 'relative',
                                            width: '100%',
                                            height: '140px',
                                            borderRadius: '16px',
                                            background: '#ffffff',
                                            overflow: 'hidden',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            padding: '8px',
                                            marginBottom: '10px'
                                        }}>
                                            <img
                                                src={img}
                                                alt={prod.name}
                                                style={{
                                                    width: '100%',
                                                    height: '100%',
                                                    objectFit: 'contain'
                                                }}
                                            />

                                            {/* Heart / Favorite Button */}
                                            <button
                                                type="button"
                                                onClick={(e) => toggleFavorite(prod.id, e)}
                                                style={{
                                                    position: 'absolute',
                                                    top: '8px',
                                                    right: '8px',
                                                    width: '30px',
                                                    height: '30px',
                                                    borderRadius: '50%',
                                                    border: 'none',
                                                    background: 'rgba(255,255,255,0.85)',
                                                    backdropFilter: 'blur(4px)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    cursor: 'pointer',
                                                    boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
                                                    transition: 'transform 0.15s ease'
                                                }}
                                            >
                                                <Heart
                                                    size={15}
                                                    color={isFav ? '#ef4444' : '#64748b'}
                                                    fill={isFav ? '#ef4444' : 'transparent'}
                                                />
                                            </button>
                                        </div>

                                        {/* Product Details */}
                                        <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                            {prod.category && (
                                                <span style={{
                                                    fontSize: '10px',
                                                    fontWeight: '700',
                                                    color: 'var(--text-secondary)',
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '0.5px'
                                                }}>
                                                    {prod.category}
                                                </span>
                                            )}

                                            <h4 style={{
                                                fontSize: '13px',
                                                fontWeight: '700',
                                                color: 'var(--text-primary)',
                                                margin: 0,
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap',
                                                lineHeight: 1.25
                                            }} title={prod.name}>
                                                {prod.name}
                                            </h4>

                                            <div style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                marginTop: '6px'
                                            }}>
                                                <span style={{
                                                    fontSize: '15px',
                                                    fontWeight: '800',
                                                    color: 'var(--text-primary)',
                                                    letterSpacing: '-0.3px'
                                                }}>
                                                    ${Number(prod.price || 0).toLocaleString('es-AR')}
                                                </span>

                                                {/* Quick add plus button */}
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        addToCart(prod, 1);
                                                    }}
                                                    style={{
                                                        width: '28px',
                                                        height: '28px',
                                                        borderRadius: '50%',
                                                        border: 'none',
                                                        backgroundColor: primaryColor,
                                                        color: '#ffffff',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        cursor: 'pointer',
                                                        boxShadow: `0 2px 8px ${primaryColor}40`,
                                                        transition: 'transform 0.15s ease'
                                                    }}
                                                    onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
                                                    onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                                                    title="Agregar al carrito"
                                                >
                                                    <Plus size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* ═══ 6. PRODUCT DETAIL MODAL (Screen 2 Reference) ═══ */}
            <AnimatePresence>
                {selectedProductModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                            position: 'fixed',
                            inset: 0,
                            backgroundColor: 'rgba(0,0,0,0.7)',
                            backdropFilter: 'blur(8px)',
                            zIndex: 1100,
                            display: 'flex',
                            alignItems: 'flex-end',
                            justifyContent: 'center'
                        }}
                        onClick={() => setSelectedProductModal(null)}
                    >
                        <motion.div
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
                            style={{
                                width: '100%',
                                maxWidth: '520px',
                                maxHeight: '92vh',
                                backgroundColor: 'var(--bg-card)',
                                borderTopLeftRadius: '28px',
                                borderTopRightRadius: '28px',
                                overflowY: 'auto',
                                position: 'relative',
                                display: 'flex',
                                flexDirection: 'column',
                                boxShadow: '0 -10px 40px rgba(0,0,0,0.3)'
                            }}
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Modal Header */}
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '16px 20px',
                                borderBottom: '1px solid var(--border)',
                                position: 'sticky',
                                top: 0,
                                background: 'var(--bg-card)',
                                zIndex: 10
                            }}>
                                <button
                                    type="button"
                                    onClick={() => setSelectedProductModal(null)}
                                    style={{
                                        width: '36px',
                                        height: '36px',
                                        borderRadius: '50%',
                                        border: '1px solid var(--border)',
                                        background: 'var(--bg-main)',
                                        color: 'var(--text-primary)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <ChevronLeft size={20} />
                                </button>
                                <span style={{ fontSize: '15px', fontWeight: '800' }}>Detalles</span>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSelectedProductModal(null);
                                        setIsCartOpen(true);
                                    }}
                                    style={{
                                        width: '36px',
                                        height: '36px',
                                        borderRadius: '50%',
                                        border: '1px solid var(--border)',
                                        background: 'var(--bg-main)',
                                        color: 'var(--text-primary)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        position: 'relative'
                                    }}
                                >
                                    <ShoppingBag size={17} />
                                    {getCartCount() > 0 && (
                                        <span style={{
                                            position: 'absolute',
                                            top: '-3px',
                                            right: '-3px',
                                            backgroundColor: primaryColor,
                                            color: '#fff',
                                            fontSize: '9px',
                                            fontWeight: '800',
                                            borderRadius: '50%',
                                            minWidth: '16px',
                                            height: '16px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}>
                                            {getCartCount()}
                                        </span>
                                    )}
                                </button>
                            </div>

                            {/* Modal Body */}
                            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
                                {/* Large Product Gallery */}
                                {(() => {
                                    const images = getProductImages(selectedProductModal);
                                    const currentImg = images[activeImageIndex] || images[0];

                                    return (
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                                            <div style={{
                                                position: 'relative',
                                                width: '100%',
                                                height: '240px',
                                                borderRadius: '20px',
                                                background: '#ffffff',
                                                border: '1px solid var(--border)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                overflow: 'hidden',
                                                padding: '12px'
                                            }}>
                                                <motion.img
                                                    key={activeImageIndex}
                                                    initial={{ opacity: 0.4, scale: 0.96 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    transition={{ duration: 0.2 }}
                                                    src={currentImg}
                                                    alt={selectedProductModal.name}
                                                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                                />
                                            </div>

                                            {/* Gallery Dots */}
                                            {images.length > 1 && (
                                                <div style={{ display: 'flex', gap: '6px' }}>
                                                    {images.map((_, idx) => (
                                                        <div
                                                            key={idx}
                                                            onClick={() => setActiveImageIndex(idx)}
                                                            style={{
                                                                width: activeImageIndex === idx ? '16px' : '6px',
                                                                height: '6px',
                                                                borderRadius: '3px',
                                                                backgroundColor: activeImageIndex === idx ? primaryColor : 'var(--border)',
                                                                cursor: 'pointer',
                                                                transition: 'all 0.2s ease'
                                                            }}
                                                        />
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })()}

                                {/* Category & Title & Heart */}
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div>
                                            <span style={{
                                                fontSize: '11px',
                                                fontWeight: '700',
                                                color: 'var(--text-secondary)',
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.5px'
                                            }}>
                                                {selectedProductModal.category || 'General'}
                                            </span>
                                            <h2 style={{
                                                fontSize: '19px',
                                                fontWeight: '800',
                                                color: 'var(--text-primary)',
                                                margin: '4px 0 0 0',
                                                lineHeight: 1.25
                                            }}>
                                                {selectedProductModal.name}
                                            </h2>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={(e) => toggleFavorite(selectedProductModal.id, e)}
                                            style={{
                                                width: '36px',
                                                height: '36px',
                                                borderRadius: '50%',
                                                border: '1px solid var(--border)',
                                                background: 'var(--bg-main)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                cursor: 'pointer',
                                                flexShrink: 0
                                            }}
                                        >
                                            <Heart
                                                size={18}
                                                color={favorites[selectedProductModal.id] ? '#ef4444' : '#64748b'}
                                                fill={favorites[selectedProductModal.id] ? '#ef4444' : 'transparent'}
                                            />
                                        </button>
                                    </div>
                                </div>

                                {/* Store / Brand Card (Screen 2 reference: Glow Nature Store) */}
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '12px 14px',
                                    background: 'var(--bg-main)',
                                    borderRadius: '16px',
                                    border: '1px solid var(--border)'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        {(business.logo || business.image) ? (
                                            <img
                                                src={business.logo || business.image}
                                                alt={business.name}
                                                style={{
                                                    width: '36px',
                                                    height: '36px',
                                                    borderRadius: '50%',
                                                    objectFit: 'cover'
                                                }}
                                            />
                                        ) : (
                                            <div style={{
                                                width: '36px',
                                                height: '36px',
                                                borderRadius: '50%',
                                                background: primaryColor,
                                                color: '#fff',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontWeight: '800'
                                            }}>
                                                {business.name?.[0] || 'T'}
                                            </div>
                                        )}
                                        <div>
                                            <div style={{
                                                fontSize: '13px',
                                                fontWeight: '800',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px'
                                            }}>
                                                {business.name}
                                                <CheckCircle2 size={13} color={primaryColor} />
                                            </div>
                                            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                                Tienda Oficial
                                            </span>
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        style={{
                                            padding: '6px 12px',
                                            borderRadius: '20px',
                                            background: '#111827',
                                            color: '#ffffff',
                                            fontSize: '11px',
                                            fontWeight: '700',
                                            border: 'none',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px'
                                        }}
                                    >
                                        <Check size={11} /> Siguiendo
                                    </button>
                                </div>

                                {/* Select Size / Variants (if provided) & Quantity */}
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: '12px'
                                }}>
                                    {selectedProductModal.sizes && selectedProductModal.sizes.length > 0 ? (
                                        <div style={{ flex: 1 }}>
                                            <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)' }}>
                                                Tamaño / Variedad
                                            </span>
                                            <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                                                {selectedProductModal.sizes.map(size => (
                                                    <button
                                                        key={size}
                                                        type="button"
                                                        onClick={() => setSelectedSize(size)}
                                                        style={{
                                                            padding: '6px 12px',
                                                            borderRadius: '10px',
                                                            border: selectedSize === size ? `1.5px solid ${primaryColor}` : '1px solid var(--border)',
                                                            background: selectedSize === size ? primaryColor : 'var(--bg-main)',
                                                            color: selectedSize === size ? '#ffffff' : 'var(--text-primary)',
                                                            fontSize: '12px',
                                                            fontWeight: '700',
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        {size}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        <div>
                                            <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)' }}>
                                                Cantidad
                                            </span>
                                        </div>
                                    )}

                                    {/* Quantity Counter */}
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '10px',
                                        background: 'var(--bg-main)',
                                        border: '1px solid var(--border)',
                                        borderRadius: '12px',
                                        padding: '4px 10px'
                                    }}>
                                        <button
                                            type="button"
                                            onClick={() => setModalQty(q => Math.max(1, q - 1))}
                                            style={{
                                                border: 'none',
                                                background: 'none',
                                                cursor: 'pointer',
                                                color: 'var(--text-primary)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                padding: '4px'
                                            }}
                                        >
                                            <Minus size={14} />
                                        </button>
                                        <span style={{ fontSize: '14px', fontWeight: '800', minWidth: '18px', textAlign: 'center' }}>
                                            {modalQty}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => setModalQty(q => q + 1)}
                                            style={{
                                                border: 'none',
                                                background: 'none',
                                                cursor: 'pointer',
                                                color: 'var(--text-primary)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                padding: '4px'
                                            }}
                                        >
                                            <Plus size={14} />
                                        </button>
                                    </div>
                                </div>

                                {/* Description */}
                                <div>
                                    <h4 style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-primary)', margin: '0 0 6px 0' }}>
                                        Descripción
                                    </h4>
                                    <p style={{
                                        fontSize: '13px',
                                        color: 'var(--text-secondary)',
                                        margin: 0,
                                        lineHeight: 1.5
                                    }}>
                                        {selectedProductModal.desc || 'Producto exclusivo disponible para retirar en el local o coordinar entrega.'}
                                    </p>
                                </div>
                            </div>

                            {/* Sticky Bottom Checkout Bar (Screen 2 reference) */}
                            <div style={{
                                position: 'sticky',
                                bottom: 0,
                                background: 'var(--bg-card)',
                                borderTop: '1px solid var(--border)',
                                padding: '16px 20px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '16px',
                                boxShadow: '0 -4px 16px rgba(0,0,0,0.05)',
                                zIndex: 10
                            }}>
                                <div>
                                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '600' }}>
                                        Precio Total
                                    </span>
                                    <div style={{
                                        fontSize: '20px',
                                        fontWeight: '900',
                                        color: 'var(--text-primary)',
                                        letterSpacing: '-0.3px'
                                    }}>
                                        ${(Number(selectedProductModal.price || 0) * modalQty).toLocaleString('es-AR')}
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => {
                                        addToCart(selectedProductModal, modalQty, selectedSize);
                                        setSelectedProductModal(null);
                                    }}
                                    style={{
                                        flex: 1,
                                        padding: '14px 20px',
                                        borderRadius: '28px',
                                        border: 'none',
                                        backgroundColor: primaryColor,
                                        color: '#ffffff',
                                        fontSize: '14px',
                                        fontWeight: '800',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px',
                                        boxShadow: `0 6px 20px ${primaryColor}40`,
                                        transition: 'transform 0.15s ease'
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
                                    onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                                >
                                    <ShoppingBag size={18} />
                                    Agregar al Carrito
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ═══ 7. CART DRAWER (Modern Sliding Panel) ═══ */}
            <AnimatePresence>
                {isCartOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                            position: 'fixed',
                            inset: 0,
                            backgroundColor: 'rgba(0,0,0,0.65)',
                            backdropFilter: 'blur(6px)',
                            zIndex: 1200,
                            display: 'flex',
                            justifyContent: 'flex-end'
                        }}
                        onClick={() => setIsCartOpen(false)}
                    >
                        <motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                            style={{
                                width: '100%',
                                maxWidth: '420px',
                                height: '100%',
                                backgroundColor: 'var(--bg-card)',
                                borderLeft: '1px solid var(--border)',
                                padding: '24px',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between'
                            }}
                            onClick={e => e.stopPropagation()}
                        >
                            <div>
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    marginBottom: '20px',
                                    borderBottom: '1px solid var(--border)',
                                    paddingBottom: '14px'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <ShoppingBag size={20} color={primaryColor} />
                                        <h3 style={{ fontSize: '18px', fontWeight: '800', margin: 0 }}>
                                            Tu Carrito
                                        </h3>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setIsCartOpen(false)}
                                        style={{
                                            border: 'none',
                                            background: 'var(--bg-main)',
                                            width: '32px',
                                            height: '32px',
                                            borderRadius: '50%',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            cursor: 'pointer',
                                            color: 'var(--text-primary)'
                                        }}
                                    >
                                        <X size={18} />
                                    </button>
                                </div>

                                {cart.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '60px 10px', color: 'var(--text-secondary)' }}>
                                        <div style={{ fontSize: '48px', marginBottom: '14px' }}>🛒</div>
                                        <h4 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)', margin: '0 0 6px 0' }}>
                                            Tu carrito está vacío
                                        </h4>
                                        <p style={{ fontSize: '13px', margin: 0 }}>
                                            Agregá productos de la tienda para hacer tu pedido.
                                        </p>
                                    </div>
                                ) : (
                                    <div style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '14px',
                                        maxHeight: '62vh',
                                        overflowY: 'auto',
                                        paddingRight: '4px'
                                    }}>
                                        {cart.map(item => (
                                            <div
                                                key={item.cartId || item.id}
                                                style={{
                                                    display: 'flex',
                                                    gap: '12px',
                                                    alignItems: 'center',
                                                    padding: '12px',
                                                    borderRadius: '16px',
                                                    background: 'var(--bg-main)',
                                                    border: '1px solid var(--border)'
                                                }}
                                            >
                                                <div style={{
                                                    width: '54px',
                                                    height: '54px',
                                                    backgroundColor: '#ffffff',
                                                    borderRadius: '12px',
                                                    overflow: 'hidden',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    flexShrink: 0,
                                                    padding: '4px',
                                                    border: '1px solid rgba(0,0,0,0.06)'
                                                }}>
                                                    <img
                                                        src={item.image || item.images?.[0] || 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=300&q=80'}
                                                        alt={item.name}
                                                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                                    />
                                                </div>

                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <h4 style={{
                                                        fontSize: '13px',
                                                        fontWeight: '700',
                                                        margin: 0,
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap'
                                                    }}>
                                                        {item.name}
                                                    </h4>
                                                    {item.selectedSize && (
                                                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                                            {item.selectedSize}
                                                        </span>
                                                    )}
                                                    <div style={{
                                                        fontSize: '13px',
                                                        color: primaryColor,
                                                        fontWeight: '800',
                                                        marginTop: '3px'
                                                    }}>
                                                        ${(Number(item.price) * item.qty).toLocaleString('es-AR')}
                                                    </div>
                                                </div>

                                                {/* Quantity Controls */}
                                                <div style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '8px',
                                                    background: 'var(--bg-card)',
                                                    borderRadius: '10px',
                                                    padding: '4px 8px',
                                                    border: '1px solid var(--border)'
                                                }}>
                                                    <button
                                                        type="button"
                                                        onClick={() => updateQty(item.cartId || item.id, -1)}
                                                        style={{ border: 'none', background: 'none', cursor: 'pointer', fontWeight: '800', color: 'var(--text-primary)', fontSize: '13px' }}
                                                    >
                                                        -
                                                    </button>
                                                    <span style={{ fontSize: '12px', fontWeight: '800', minWidth: '14px', textAlign: 'center' }}>
                                                        {item.qty}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => updateQty(item.cartId || item.id, 1)}
                                                        style={{ border: 'none', background: 'none', cursor: 'pointer', fontWeight: '800', color: 'var(--text-primary)', fontSize: '13px' }}
                                                    >
                                                        +
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Cart Total & WhatsApp Checkout Button */}
                            {cart.length > 0 && (
                                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '18px' }}>
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'baseline',
                                        marginBottom: '16px'
                                    }}>
                                        <span style={{ fontWeight: '700', fontSize: '14px', color: 'var(--text-secondary)' }}>
                                            Total del pedido:
                                        </span>
                                        <span style={{ fontWeight: '900', fontSize: '20px', color: 'var(--text-primary)' }}>
                                            ${getCartTotal().toLocaleString('es-AR')}
                                        </span>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={handleConfirmOrder}
                                        style={{
                                            width: '100%',
                                            padding: '14px',
                                            borderRadius: '24px',
                                            border: 'none',
                                            backgroundColor: '#25D366',
                                            color: '#ffffff',
                                            fontWeight: '800',
                                            fontSize: '14px',
                                            cursor: 'pointer',
                                            boxShadow: '0 4px 16px rgba(37, 211, 102, 0.35)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '8px',
                                            transition: 'transform 0.15s ease'
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
                                        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                                    >
                                        <span>Confirmar Pedido vía WhatsApp</span>
                                        <span>💬</span>
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ═══ 8. FLOATING TOAST NOTIFICATION ═══ */}
            <AnimatePresence>
                {toastMessage && (
                    <motion.div
                        initial={{ opacity: 0, y: 30, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.9 }}
                        style={{
                            position: 'fixed',
                            bottom: '24px',
                            left: '50%',
                            x: '-50%',
                            backgroundColor: '#111827',
                            color: '#ffffff',
                            padding: '10px 20px',
                            borderRadius: '30px',
                            boxShadow: '0 10px 28px rgba(0,0,0,0.25)',
                            fontSize: '13px',
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
        </div>
    );
}
