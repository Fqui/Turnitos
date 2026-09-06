import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search,
    ShoppingBag,
    SlidersHorizontal,
    ChevronLeft,
    ChevronRight,
    Plus,
    Minus,
    ArrowLeft,
    CheckCircle2,
    Sparkles,
    X,
    ArrowUpRight,
    Check,
    MessageCircle,
    Truck,
    ShieldCheck,
    Trash2
} from 'lucide-react';
import serviceAdapter from '../services/serviceAdapter';
import { findBusinessBySlug, getSubdomain } from '../utils/utils';
import { isFreePlan } from '../utils/subscriptionUtils';

const STORE_DIFFERENTIALS = [
    {
        id: 'whatsapp',
        icon: MessageCircle,
        title: 'Pedido Directo',
        desc: 'Coordiná por WhatsApp'
    },
    {
        id: 'shipping',
        icon: Truck,
        title: 'Retiro o Envío',
        desc: 'En local o a domicilio'
    },
    {
        id: 'payment',
        icon: ShieldCheck,
        title: 'Pago Flexible',
        desc: 'Efectivo o transferencia'
    }
];

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
    const [showLeaveConfirmation, setShowLeaveConfirmation] = useState(false);
    const [itemToDelete, setItemToDelete] = useState(null);

    // Differential cards cycling transition
    const [activeDiffIndex, setActiveDiffIndex] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => {
            setActiveDiffIndex((prev) => (prev + 1) % STORE_DIFFERENTIALS.length);
        }, 3200);
        return () => clearInterval(timer);
    }, []);

    // Promotional advertising banner carousel state
    const storeBanners = useMemo(() => {
        if (Array.isArray(business?.metadata?.store_banners) && business.metadata.store_banners.length > 0) {
            return business.metadata.store_banners.filter(Boolean);
        }
        if (business?.metadata?.store_banner_image) {
            return [
                business.metadata.store_banner_image,
                '/spa_banner_1.jpg',
                '/spa_banner_2.jpg'
            ];
        }
        return [
            '/spa_banner_1.jpg',
            '/spa_banner_2.jpg'
        ];
    }, [business?.metadata?.store_banners, business?.metadata?.store_banner_image]);

    const [activeBannerIndex, setActiveBannerIndex] = useState(0);

    useEffect(() => {
        if (storeBanners.length <= 1) return;
        const timer = setInterval(() => {
            setActiveBannerIndex(prev => (prev + 1) % storeBanners.length);
        }, 4500);
        return () => clearInterval(timer);
    }, [storeBanners.length]);

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
        const item = cart.find(i => (i.cartId || i.id) === cartId);
        if (item && item.qty === 1 && change === -1) {
            setItemToDelete(item);
            return;
        }
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

    const handleConfirmDeleteItem = () => {
        if (!itemToDelete) return;
        const name = itemToDelete.name;
        removeFromCart(itemToDelete.cartId || itemToDelete.id);
        setItemToDelete(null);
        setToastMessage(`"${name}" eliminado del carrito 🗑️`);
        setTimeout(() => setToastMessage(null), 2000);
    };

    const getCartTotal = () => cart.reduce((acc, item) => acc + (Number(item.price || 0) * item.qty), 0);
    const getCartCount = () => cart.reduce((acc, item) => acc + item.qty, 0);

    const handleGoBack = () => {
        if (selectedProductModal) {
            setSelectedProductModal(null);
            return;
        }
        if (isCartOpen) {
            setIsCartOpen(false);
            return;
        }
        if (cart.length > 0) {
            setShowLeaveConfirmation(true);
            return;
        }
        executeExit();
    };

    const executeExit = () => {
        setShowLeaveConfirmation(false);
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

    // Alerta al intentar recargar o cerrar pestaña con carrito activo
    useEffect(() => {
        if (cart.length === 0) return;
        const handleBeforeUnload = (e) => {
            e.preventDefault();
            e.returnValue = '';
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [cart.length]);

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

    // Category with representative thumbnail mapping + product counts
    const dynamicCategories = useMemo(() => {
        const catMap = new Map();
        (products || []).forEach(p => {
            const cat = p.category || 'General';
            if (!catMap.has(cat)) {
                catMap.set(cat, { image: p.image || p.images?.[0] || null, count: 0 });
            }
            catMap.get(cat).count += 1;
        });

        const list = [{ name: 'Todos', image: null, count: (products || []).length }];
        catMap.forEach((data, name) => {
            list.push({ name, image: data.image, count: data.count });
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
            width: '100%',
            maxWidth: '100vw',
            backgroundColor: 'var(--bg-main)',
            color: 'var(--text-primary)',
            paddingBottom: '100px',
            position: 'relative',
            boxSizing: 'border-box',
            overflowX: 'hidden'
        }}>
            {/* Centered Mobile/Desktop Shell */}
            <div className="business-store-shell">

                {/* ═══ 1A. DESKTOP INTEGRATED HEADER (Visible > 768px) ═══ */}
                <header className="store-header-desktop">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <button
                            type="button"
                            onClick={handleGoBack}
                            style={{
                                background: 'var(--bg-main)',
                                border: '1px solid var(--border)',
                                borderRadius: '50%',
                                width: '40px',
                                height: '40px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                color: 'var(--text-primary)',
                                transition: 'transform 0.15s ease'
                            }}
                            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
                            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                            title="Volver al perfil"
                        >
                            <ArrowLeft size={18} />
                        </button>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            {business.logo || business.image ? (
                                <img
                                    src={business.logo || business.image}
                                    alt={business.name}
                                    style={{
                                        width: '40px',
                                        height: '40px',
                                        borderRadius: '12px',
                                        objectFit: 'cover',
                                        border: '1px solid var(--border)'
                                    }}
                                />
                            ) : (
                                <div style={{
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '12px',
                                    backgroundColor: primaryColor,
                                    color: '#fff',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: '800',
                                    fontSize: '16px'
                                }}>
                                    {business.name?.[0] || 'T'}
                                </div>
                            )}
                            <div>
                                <div style={{
                                    fontSize: '20px',
                                    fontWeight: '800',
                                    color: 'var(--text-primary)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '7px',
                                    letterSpacing: '-0.3px'
                                }}>
                                    <span>{business.name}</span>
                                    <CheckCircle2 size={18} color={primaryColor} />
                                </div>
                                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '700' }}>
                                    Tienda Oficial
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Desktop Cart Button */}
                    <button
                        type="button"
                        onClick={() => setIsCartOpen(true)}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '10px',
                            background: getCartCount() > 0 ? primaryColor : 'var(--bg-main)',
                            color: getCartCount() > 0 ? '#ffffff' : 'var(--text-primary)',
                            border: getCartCount() > 0 ? 'none' : '1px solid var(--border)',
                            borderRadius: '24px',
                            padding: '10px 20px',
                            fontSize: '13px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            transition: 'all 0.18s ease',
                            boxShadow: getCartCount() > 0 ? `0 4px 14px ${primaryColor}40` : 'none'
                        }}
                    >
                        <ShoppingBag size={17} />
                        <span>Carrito ({getCartCount()})</span>
                    </button>
                </header>

                {/* ═══ 1B. MOBILE HEADER (< 768px) ═══ */}
                <div className="store-header-mobile">
                    {/* Top Row: Back, Title, Cart */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        width: '100%'
                    }}>
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
                                flexShrink: 0
                            }}
                            title="Volver"
                        >
                            <ArrowLeft size={18} />
                        </button>

                        <div style={{ textAlign: 'center', minWidth: 0, padding: '0 8px', flex: 1 }}>
                            <div style={{
                                fontSize: '18px',
                                fontWeight: '800',
                                color: 'var(--text-primary)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                letterSpacing: '-0.3px',
                                lineHeight: 1.2
                            }}>
                                <span>{business.name}</span>
                                <CheckCircle2 size={17} color={primaryColor} style={{ flexShrink: 0 }} />
                            </div>
                            <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)', fontWeight: '700' }}>
                                Tienda Oficial
                            </span>
                        </div>

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
                                flexShrink: 0
                            }}
                            title="Ver Carrito"
                        >
                            <ShoppingBag size={18} />
                            {getCartCount() > 0 && (
                                <span style={{
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
                                }}>
                                    {getCartCount()}
                                </span>
                            )}
                        </button>
                    </div>
                </div>

                {/* ═══ 2. PROMOTIONAL ADVERTISING BANNER CAROUSEL ═══ */}
                {business.metadata?.has_store_banner !== false && (
                    <div className="store-unified-banner" style={{
                        boxShadow: `0 12px 36px ${primaryColor}30`,
                        border: '1px solid rgba(255,255,255,0.16)'
                    }}>
                        {/* Animated Advertising Banners with Smooth Crossfade Transition */}
                        <AnimatePresence initial={false} mode="sync">
                            <motion.div
                                key={activeBannerIndex}
                                initial={{ opacity: 0, scale: 1.02 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.75, ease: 'easeInOut' }}
                                style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    bottom: 0,
                                    background: storeBanners.length > 0
                                        ? `url(${storeBanners[activeBannerIndex]}) center/cover no-repeat`
                                        : `linear-gradient(135deg, ${primaryColor} 0%, #1e1b4b 100%)`,
                                    zIndex: 1
                                }}
                            />
                        </AnimatePresence>

                        {/* Soft Vignette Overlay for Depth */}
                        <div style={{
                            position: 'absolute',
                            inset: 0,
                            background: 'linear-gradient(to right, rgba(0,0,0,0.15) 0%, transparent 40%, transparent 60%, rgba(0,0,0,0.3) 100%)',
                            pointerEvents: 'none',
                            zIndex: 2
                        }} />

                        {/* Floating Right Differentials Card */}
                        <div className="store-banner-differentials">
                            <div className="store-diff-carousel-wrapper">
                                <AnimatePresence mode="wait">
                                    {(() => {
                                        const currentDiff = STORE_DIFFERENTIALS[activeDiffIndex];
                                        const DiffIcon = currentDiff.icon;
                                        return (
                                            <motion.div
                                                key={currentDiff.id}
                                                initial={{ opacity: 0, y: 10, scale: 0.96 }}
                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                                exit={{ opacity: 0, y: -10, scale: 0.96 }}
                                                transition={{ duration: 0.32, ease: 'easeOut' }}
                                                className="store-diff-active-card"
                                                onClick={() => setActiveDiffIndex((prev) => (prev + 1) % STORE_DIFFERENTIALS.length)}
                                                title="Hacé clic para ver el siguiente beneficio"
                                            >
                                                <div className="store-diff-icon">
                                                    <DiffIcon size={16} />
                                                </div>
                                                <div className="store-diff-info">
                                                    <span className="store-diff-title">{currentDiff.title}</span>
                                                    <span className="store-diff-desc">{currentDiff.desc}</span>
                                                </div>
                                            </motion.div>
                                        );
                                    })()}
                                </AnimatePresence>
                            </div>

                            {/* Micro Dots Indicator for Differentials */}
                            <div className="store-diff-dots">
                                {STORE_DIFFERENTIALS.map((diff, idx) => (
                                    <button
                                        key={diff.id}
                                        type="button"
                                        className={`store-diff-dot ${idx === activeDiffIndex ? 'active' : ''}`}
                                        onClick={() => setActiveDiffIndex(idx)}
                                        aria-label={`Ver ${diff.title}`}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Carousel Pagination Dots (Center Bottom) */}
                        {storeBanners.length > 1 && (
                            <div className="store-banner-carousel-dots">
                                {storeBanners.map((_, idx) => (
                                    <button
                                        key={idx}
                                        type="button"
                                        className={`store-banner-carousel-dot ${idx === activeBannerIndex ? 'active' : ''}`}
                                        onClick={() => setActiveBannerIndex(idx)}
                                        aria-label={`Ver banner publicitario ${idx + 1}`}
                                    />
                                ))}
                            </div>
                        )}

                        {/* Navigation Arrows on Hover */}
                        {storeBanners.length > 1 && (
                            <>
                                <button
                                    type="button"
                                    className="store-banner-arrow store-banner-arrow-left"
                                    onClick={() => setActiveBannerIndex(prev => (prev - 1 + storeBanners.length) % storeBanners.length)}
                                    aria-label="Banner anterior"
                                >
                                    <ChevronLeft size={20} />
                                </button>
                                <button
                                    type="button"
                                    className="store-banner-arrow store-banner-arrow-right"
                                    onClick={() => setActiveBannerIndex(prev => (prev + 1) % storeBanners.length)}
                                    aria-label="Banner siguiente"
                                >
                                    <ChevronRight size={20} />
                                </button>
                            </>
                        )}
                    </div>
                )}

                {/* ═══ 3. CATEGORIES SECTION (Shown only when more than 2 categories) ═══ */}
                {dynamicCategories.length > 2 && (
                    <div style={{ marginBottom: '22px', width: '100%', maxWidth: '100%', minWidth: 0 }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: '10px'
                        }}>
                            <h3 style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>
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
                            gap: '8px',
                            overflowX: 'auto',
                            paddingBottom: '4px',
                            scrollbarWidth: 'none',
                            msOverflowStyle: 'none',
                            width: '100%',
                            maxWidth: '100%',
                            minWidth: 0,
                            WebkitOverflowScrolling: 'touch'
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
                                            padding: '8px 16px',
                                            borderRadius: '24px',
                                            border: isActive ? `1.5px solid ${primaryColor}` : '1px solid var(--border)',
                                            background: isActive ? `${primaryColor}18` : 'var(--bg-card)',
                                            color: isActive ? primaryColor : 'var(--text-primary)',
                                            fontSize: '12px',
                                            fontWeight: isActive ? '800' : '600',
                                            cursor: 'pointer',
                                            whiteSpace: 'nowrap',
                                            flexShrink: 0,
                                            transition: 'all 0.18s ease',
                                            boxShadow: isActive ? `0 4px 14px ${primaryColor}20` : '0 2px 6px rgba(0,0,0,0.02)'
                                        }}
                                    >
                                        {cat.image && (
                                            <img
                                                src={cat.image}
                                                alt=""
                                                style={{
                                                    width: '20px',
                                                    height: '20px',
                                                    borderRadius: '50%',
                                                    objectFit: 'cover',
                                                    background: '#ffffff'
                                                }}
                                            />
                                        )}
                                        <span>{cat.name}</span>
                                        <span style={{
                                            fontSize: '10px',
                                            padding: '2px 7px',
                                            borderRadius: '10px',
                                            background: isActive ? primaryColor : 'var(--border)',
                                            color: isActive ? '#ffffff' : 'var(--text-secondary)',
                                            fontWeight: '800'
                                        }}>
                                            {cat.count}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* ═══ 4. PRODUCTS GRID ("Novedades" / Catálogo) ═══ */}
                <div style={{ marginBottom: '20px', width: '100%', maxWidth: '100%' }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '14px'
                    }}>
                        <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>
                            {activeCategory === 'Todos' ? 'Nuestros Productos' : activeCategory}
                        </h3>
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
                        <div className="store-products-grid">
                            {filteredProducts.map(prod => {
                                const img = prod.image || prod.images?.[0] || 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=300&q=80';

                                return (
                                    <motion.div
                                        key={prod.id}
                                        onClick={() => handleOpenProductModal(prod)}
                                        className="store-product-card"
                                        style={{
                                            background: 'var(--bg-card)',
                                            borderRadius: '22px',
                                            padding: '12px',
                                            border: '1px solid var(--border)',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            justifyContent: 'space-between',
                                            boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
                                            position: 'relative',
                                            transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
                                            minWidth: 0,
                                            width: '100%',
                                            boxSizing: 'border-box'
                                        }}
                                        whileHover={{ y: -4, boxShadow: '0 12px 28px rgba(0,0,0,0.08)' }}
                                    >
                                        {/* Top Image Container with Studio Background */}
                                        <div className="store-card-img-box">
                                            <img
                                                src={img}
                                                alt={prod.name}
                                                className="store-card-img"
                                                style={{
                                                    width: '100%',
                                                    height: '100%',
                                                    objectFit: 'contain',
                                                    transition: 'transform 0.3s ease'
                                                }}
                                            />

                                            {/* Stock / Quality Tag */}
                                            <div style={{
                                                position: 'absolute',
                                                top: '8px',
                                                left: '8px',
                                                background: 'rgba(255,255,255,0.92)',
                                                backdropFilter: 'blur(8px)',
                                                borderRadius: '12px',
                                                padding: '2px 8px',
                                                fontSize: '10px',
                                                fontWeight: '700',
                                                color: '#0f172a',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px',
                                                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                                                border: '1px solid rgba(0,0,0,0.04)'
                                            }}>
                                                <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#10b981' }} />
                                                En stock
                                            </div>
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
                                                marginTop: '8px',
                                                paddingTop: '6px',
                                                borderTop: '1px solid var(--border)'
                                            }}>
                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                    <span style={{ fontSize: '9px', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase' }}>
                                                        Precio
                                                    </span>
                                                    <span style={{
                                                        fontSize: '15px',
                                                        fontWeight: '800',
                                                        color: 'var(--text-primary)',
                                                        letterSpacing: '-0.3px',
                                                        lineHeight: 1.1
                                                    }}>
                                                        ${Number(prod.price || 0).toLocaleString('es-AR')}
                                                    </span>
                                                </div>

                                                {/* Quick add button */}
                                                <button
                                                    type="button"
                                                    className="store-quick-add-btn"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        addToCart(prod, 1);
                                                    }}
                                                    style={{
                                                        borderRadius: '20px',
                                                        border: 'none',
                                                        backgroundColor: primaryColor,
                                                        color: '#ffffff',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '5px',
                                                        padding: '7px 12px',
                                                        cursor: 'pointer',
                                                        boxShadow: `0 3px 10px ${primaryColor}35`,
                                                        transition: 'transform 0.15s ease',
                                                        fontWeight: '700',
                                                        fontSize: '12px'
                                                    }}
                                                    onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
                                                    onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                                                    title="Agregar al carrito"
                                                >
                                                    <Plus size={14} />
                                                    <span className="store-add-label">Agregar</span>
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

            {/* ═══ 6. PRODUCT DETAIL MODAL (Luxury Boutique Redesign) ═══ */}
            <AnimatePresence>
                {selectedProductModal && (
                    <motion.div
                        className="store-detail-modal-backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setSelectedProductModal(null)}
                    >
                        <motion.div
                            className="store-detail-modal-container"
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Modal Header */}
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '16px 22px',
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
                                        width: '38px',
                                        height: '38px',
                                        borderRadius: '50%',
                                        border: '1px solid var(--border)',
                                        background: 'var(--bg-main)',
                                        color: 'var(--text-primary)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        transition: 'all 0.15s ease'
                                    }}
                                    title="Cerrar"
                                >
                                    <ArrowLeft size={18} />
                                </button>
                                <div style={{ textAlign: 'center' }}>
                                    <span style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-primary)' }}>
                                        Detalles del Producto
                                    </span>
                                    <div style={{
                                        fontSize: '11px',
                                        color: 'var(--text-secondary)',
                                        fontWeight: '600',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '4px',
                                        marginTop: '1px'
                                    }}>
                                        <span>{business.name}</span>
                                        <CheckCircle2 size={12} color={primaryColor} />
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSelectedProductModal(null);
                                        setIsCartOpen(true);
                                    }}
                                    style={{
                                        width: '38px',
                                        height: '38px',
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
                                    title="Ver carrito"
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
                                            minWidth: '17px',
                                            height: '17px',
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
                            <div style={{ padding: '22px' }}>
                                <div className="store-detail-modal-columns">
                                    {/* Left Column: Studio Gallery */}
                                    <div>
                                        {(() => {
                                            const images = getProductImages(selectedProductModal);
                                            const currentImg = images[activeImageIndex] || images[0];

                                            return (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                    {/* Main Hero Photo Viewport */}
                                                    <div style={{
                                                        position: 'relative',
                                                        width: '100%',
                                                        height: '270px',
                                                        borderRadius: '20px',
                                                        background: 'radial-gradient(circle at 50% 50%, #ffffff 0%, #f8fafc 100%)',
                                                        border: '1px solid var(--border)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        overflow: 'hidden',
                                                        padding: '16px',
                                                        boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.02)'
                                                    }}>
                                                        {/* Stock pill */}
                                                        <div style={{
                                                            position: 'absolute',
                                                            top: '12px',
                                                            left: '12px',
                                                            background: 'rgba(255,255,255,0.95)',
                                                            backdropFilter: 'blur(8px)',
                                                            borderRadius: '12px',
                                                            padding: '4px 10px',
                                                            fontSize: '11px',
                                                            fontWeight: '700',
                                                            color: '#0f172a',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '6px',
                                                            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                                                            border: '1px solid rgba(0,0,0,0.04)',
                                                            zIndex: 2
                                                        }}>
                                                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
                                                            En stock
                                                        </div>

                                                        <motion.img
                                                            key={activeImageIndex}
                                                            initial={{ opacity: 0.5, scale: 0.96 }}
                                                            animate={{ opacity: 1, scale: 1 }}
                                                            transition={{ duration: 0.22 }}
                                                            src={currentImg}
                                                            alt={selectedProductModal.name}
                                                            style={{
                                                                width: '100%',
                                                                height: '100%',
                                                                objectFit: 'contain',
                                                                filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.06))'
                                                            }}
                                                        />
                                                    </div>

                                                    {/* Interactive Thumbnails (if multiple images) */}
                                                    {images.length > 1 && (
                                                        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', padding: '2px 0' }}>
                                                            {images.map((thumbUrl, idx) => (
                                                                <button
                                                                    key={idx}
                                                                    type="button"
                                                                    onClick={() => setActiveImageIndex(idx)}
                                                                    style={{
                                                                        width: '56px',
                                                                        height: '56px',
                                                                        borderRadius: '12px',
                                                                        border: activeImageIndex === idx ? `2px solid ${primaryColor}` : '1px solid var(--border)',
                                                                        background: '#ffffff',
                                                                        padding: '4px',
                                                                        cursor: 'pointer',
                                                                        boxShadow: activeImageIndex === idx ? `0 2px 8px ${primaryColor}40` : 'none',
                                                                        transition: 'all 0.15s ease',
                                                                        flexShrink: 0
                                                                    }}
                                                                >
                                                                    <img
                                                                        src={thumbUrl}
                                                                        alt={`Vista ${idx + 1}`}
                                                                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                                                    />
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })()}
                                    </div>

                                    {/* Right Column: Information & Selection */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                        {/* Category & Title */}
                                        <div>
                                            <span style={{
                                                display: 'inline-block',
                                                fontSize: '11px',
                                                fontWeight: '800',
                                                color: primaryColor,
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.6px',
                                                background: `${primaryColor}15`,
                                                padding: '3px 10px',
                                                borderRadius: '8px',
                                                marginBottom: '6px'
                                            }}>
                                                {selectedProductModal.category || 'General'}
                                            </span>
                                            <h2 style={{
                                                fontSize: '21px',
                                                fontWeight: '800',
                                                color: 'var(--text-primary)',
                                                margin: 0,
                                                lineHeight: 1.25,
                                                letterSpacing: '-0.3px'
                                            }}>
                                                {selectedProductModal.name}
                                            </h2>
                                        </div>

                                        {/* Price Hero Section */}
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'baseline',
                                            gap: '10px',
                                            paddingBottom: '14px',
                                            borderBottom: '1px solid var(--border)'
                                        }}>
                                            <span style={{
                                                fontSize: '26px',
                                                fontWeight: '900',
                                                color: 'var(--text-primary)',
                                                letterSpacing: '-0.5px'
                                            }}>
                                                ${Number(selectedProductModal.price || 0).toLocaleString('es-AR')}
                                            </span>
                                            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600' }}>
                                                precio unitario
                                            </span>
                                        </div>

                                        {/* Size / Variant Selector (if applicable) */}
                                        {selectedProductModal.sizes && selectedProductModal.sizes.length > 0 && (
                                            <div>
                                                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                                                    Seleccionar Variedad / Tamaño:
                                                </label>
                                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                                    {selectedProductModal.sizes.map(size => (
                                                        <button
                                                            key={size}
                                                            type="button"
                                                            onClick={() => setSelectedSize(size)}
                                                            style={{
                                                                padding: '8px 16px',
                                                                borderRadius: '12px',
                                                                border: selectedSize === size ? `2px solid ${primaryColor}` : '1px solid var(--border)',
                                                                background: selectedSize === size ? `${primaryColor}15` : 'var(--bg-main)',
                                                                color: selectedSize === size ? primaryColor : 'var(--text-primary)',
                                                                fontSize: '13px',
                                                                fontWeight: '700',
                                                                cursor: 'pointer',
                                                                transition: 'all 0.15s ease'
                                                            }}
                                                        >
                                                            {size}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Quantity Stepper */}
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            padding: '10px 14px',
                                            background: 'var(--bg-main)',
                                            borderRadius: '14px',
                                            border: '1px solid var(--border)'
                                        }}>
                                            <div>
                                                <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', display: 'block' }}>
                                                    Cantidad
                                                </span>
                                                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                                    Disponibilidad en stock
                                                </span>
                                            </div>

                                            <div style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '12px',
                                                background: 'var(--bg-card)',
                                                border: '1px solid var(--border)',
                                                borderRadius: '10px',
                                                padding: '4px 8px'
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
                                                        width: '24px',
                                                        height: '24px',
                                                        borderRadius: '6px'
                                                    }}
                                                    aria-label="Restar una unidad"
                                                >
                                                    <Minus size={14} />
                                                </button>
                                                <span style={{ fontSize: '14px', fontWeight: '800', minWidth: '20px', textAlign: 'center' }}>
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
                                                        width: '24px',
                                                        height: '24px',
                                                        borderRadius: '6px'
                                                    }}
                                                    aria-label="Sumar una unidad"
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
                                                lineHeight: 1.55,
                                                whiteSpace: 'pre-line'
                                            }}>
                                                {selectedProductModal.desc || 'Producto disponible en nuestra tienda oficial para retirar en el local o coordinar envío a domicilio.'}
                                            </p>
                                        </div>

                                        {/* Trust Perks Micro-list */}
                                        <div style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '8px',
                                            paddingTop: '6px'
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                                                <Truck size={14} color={primaryColor} />
                                                <span>Retiro en el local o entrega a domicilio</span>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                                                <MessageCircle size={14} color={primaryColor} />
                                                <span>Pedido coordinado al instante por WhatsApp</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Sticky Bottom Checkout Bar */}
                            <div className="store-detail-modal-footer">
                                {/* Precio Total Centrado exactamente bajo la foto del producto */}
                                <div className="store-modal-footer-price">
                                    <span style={{
                                        fontSize: '11px',
                                        color: 'var(--text-secondary)',
                                        fontWeight: '700',
                                        display: 'block',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.4px',
                                        marginBottom: '2px'
                                    }}>
                                        Precio Total {modalQty > 1 ? `(${modalQty} un.)` : ''}
                                    </span>
                                    <div style={{
                                        fontSize: '30px',
                                        fontWeight: '900',
                                        color: 'var(--text-primary)',
                                        letterSpacing: '-0.6px',
                                        lineHeight: 1.1
                                    }}>
                                        ${(Number(selectedProductModal.price || 0) * modalQty).toLocaleString('es-AR')}
                                    </div>
                                </div>

                                {/* Botón del carrito a la derecha */}
                                <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            addToCart(selectedProductModal, modalQty, selectedSize);
                                            setSelectedProductModal(null);
                                        }}
                                        style={{
                                            width: '100%',
                                            maxWidth: '280px',
                                            padding: '14px 22px',
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
                                            boxShadow: `0 6px 20px ${primaryColor}45`,
                                            transition: 'all 0.15s ease'
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
                                        onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                                    >
                                        <ShoppingBag size={18} />
                                        <span>Agregar al Carrito</span>
                                    </button>
                                </div>
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

                                                {/* Quantity Controls & Direct Delete */}
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
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
                                                            style={{
                                                                border: 'none',
                                                                background: 'none',
                                                                cursor: 'pointer',
                                                                fontWeight: '800',
                                                                color: item.qty === 1 ? '#ef4444' : 'var(--text-primary)',
                                                                fontSize: '13px',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                width: '18px',
                                                                height: '18px'
                                                            }}
                                                            title={item.qty === 1 ? 'Eliminar del carrito' : 'Restar una unidad'}
                                                        >
                                                            {item.qty === 1 ? <Trash2 size={13} color="#ef4444" /> : '-'}
                                                        </button>
                                                        <span style={{ fontSize: '12px', fontWeight: '800', minWidth: '14px', textAlign: 'center' }}>
                                                            {item.qty}
                                                        </span>
                                                        <button
                                                            type="button"
                                                            onClick={() => updateQty(item.cartId || item.id, 1)}
                                                            style={{
                                                                border: 'none',
                                                                background: 'none',
                                                                cursor: 'pointer',
                                                                fontWeight: '800',
                                                                color: 'var(--text-primary)',
                                                                fontSize: '13px',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                width: '18px',
                                                                height: '18px'
                                                            }}
                                                            title="Sumar una unidad"
                                                        >
                                                            +
                                                        </button>
                                                    </div>

                                                    <button
                                                        type="button"
                                                        onClick={() => setItemToDelete(item)}
                                                        style={{
                                                            border: 'none',
                                                            background: 'rgba(239, 68, 68, 0.08)',
                                                            color: '#ef4444',
                                                            borderRadius: '10px',
                                                            width: '30px',
                                                            height: '30px',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            cursor: 'pointer',
                                                            transition: 'all 0.15s ease'
                                                        }}
                                                        onMouseEnter={e => {
                                                            e.currentTarget.style.background = '#ef4444';
                                                            e.currentTarget.style.color = '#ffffff';
                                                        }}
                                                        onMouseLeave={e => {
                                                            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)';
                                                            e.currentTarget.style.color = '#ef4444';
                                                        }}
                                                        title="Eliminar producto"
                                                    >
                                                        <Trash2 size={14} />
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

            {/* ═══ 8. FLOATING CART ACTION BAR (Animated Floating Pill) ═══ */}
            <AnimatePresence>
                {getCartCount() > 0 && !isCartOpen && !selectedProductModal && !showLeaveConfirmation && (
                    <motion.div
                        initial={{ y: 90, opacity: 0, scale: 0.94 }}
                        animate={{ y: 0, opacity: 1, scale: 1 }}
                        exit={{ y: 90, opacity: 0, scale: 0.94 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 320 }}
                        style={{
                            position: 'fixed',
                            bottom: '22px',
                            left: 0,
                            right: 0,
                            display: 'flex',
                            justifyContent: 'center',
                            zIndex: 990,
                            pointerEvents: 'none',
                            padding: '0 16px'
                        }}
                    >
                        <button
                            type="button"
                            onClick={() => setIsCartOpen(true)}
                            style={{
                                pointerEvents: 'auto',
                                width: '100%',
                                maxWidth: '440px',
                                backgroundColor: primaryColor,
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '32px',
                                padding: '12px 18px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                boxShadow: `0 12px 32px ${primaryColor}55`,
                                cursor: 'pointer',
                                transition: 'transform 0.15s ease'
                            }}
                            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                            onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{
                                    position: 'relative',
                                    background: 'rgba(255,255,255,0.22)',
                                    borderRadius: '50%',
                                    width: '38px',
                                    height: '38px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <ShoppingBag size={20} color="#fff" />
                                    <span style={{
                                        position: 'absolute',
                                        top: '-4px',
                                        right: '-4px',
                                        background: '#ffffff',
                                        color: primaryColor,
                                        fontSize: '11px',
                                        fontWeight: '900',
                                        borderRadius: '10px',
                                        minWidth: '18px',
                                        height: '18px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        padding: '0 4px',
                                        boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
                                    }}>
                                        {getCartCount()}
                                    </span>
                                </div>
                                <div style={{ textAlign: 'left' }}>
                                    <span style={{ fontSize: '14px', fontWeight: '800', display: 'block', lineHeight: 1.2, color: '#fff' }}>
                                        Ver mi Carrito
                                    </span>
                                    <span style={{ fontSize: '11.5px', opacity: 0.9, fontWeight: '600', color: '#fff' }}>
                                        {getCartCount()} {getCartCount() === 1 ? 'ítem agregado' : 'ítems agregados'}
                                    </span>
                                </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{
                                    fontSize: '17px',
                                    fontWeight: '900',
                                    color: '#fff',
                                    letterSpacing: '-0.3px'
                                }}>
                                    ${getCartTotal().toLocaleString('es-AR')}
                                </span>
                                <div style={{
                                    background: 'rgba(255,255,255,0.24)',
                                    borderRadius: '50%',
                                    width: '28px',
                                    height: '28px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <ArrowUpRight size={16} color="#fff" />
                                </div>
                            </div>
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ═══ 9. EXIT CONFIRMATION MODAL (Cart Abandonment Protection) ═══ */}
            <AnimatePresence>
                {showLeaveConfirmation && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                            position: 'fixed',
                            inset: 0,
                            backgroundColor: 'rgba(0, 0, 0, 0.72)',
                            backdropFilter: 'blur(8px)',
                            zIndex: 1300,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '20px'
                        }}
                        onClick={() => setShowLeaveConfirmation(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                            style={{
                                width: '100%',
                                maxWidth: '420px',
                                backgroundColor: 'var(--bg-card)',
                                border: '1px solid var(--border)',
                                borderRadius: '26px',
                                padding: '28px 24px',
                                textAlign: 'center',
                                boxShadow: '0 24px 60px rgba(0,0,0,0.35)',
                                position: 'relative',
                                overflow: 'hidden'
                            }}
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Close button */}
                            <button
                                type="button"
                                onClick={() => setShowLeaveConfirmation(false)}
                                style={{
                                    position: 'absolute',
                                    top: '16px',
                                    right: '16px',
                                    border: 'none',
                                    background: 'var(--bg-main)',
                                    color: 'var(--text-secondary)',
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer'
                                }}
                            >
                                <X size={16} />
                            </button>

                            {/* Badge Icon */}
                            <div style={{
                                width: '64px',
                                height: '64px',
                                borderRadius: '22px',
                                background: `${primaryColor}18`,
                                border: `2px solid ${primaryColor}40`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                margin: '0 auto 16px auto',
                                color: primaryColor
                            }}>
                                <ShoppingBag size={32} />
                            </div>

                            <h3 style={{
                                fontSize: '20px',
                                fontWeight: '800',
                                color: 'var(--text-primary)',
                                margin: '0 0 8px 0',
                                letterSpacing: '-0.3px'
                            }}>
                                ¿Querés salir de la tienda?
                            </h3>

                            <p style={{
                                fontSize: '13.5px',
                                color: 'var(--text-secondary)',
                                margin: '0 0 20px 0',
                                lineHeight: '1.5'
                            }}>
                                Tenés <strong style={{ color: 'var(--text-primary)' }}>{getCartCount()} {getCartCount() === 1 ? 'producto' : 'productos'}</strong> guardados en tu carrito. Si salís ahora, tu pedido quedará pendiente.
                            </p>

                            {/* Mini Cart Summary */}
                            <div style={{
                                background: 'var(--bg-main)',
                                border: '1px solid var(--border)',
                                borderRadius: '16px',
                                padding: '12px 16px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                marginBottom: '20px'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div style={{ display: 'flex' }}>
                                        {cart.slice(0, 3).map((item, idx) => (
                                            <div
                                                key={idx}
                                                style={{
                                                    width: '32px',
                                                    height: '32px',
                                                    borderRadius: '8px',
                                                    background: '#ffffff',
                                                    border: '2px solid var(--bg-card)',
                                                    overflow: 'hidden',
                                                    marginLeft: idx > 0 ? '-10px' : '0',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    boxShadow: '0 2px 6px rgba(0,0,0,0.08)'
                                                }}
                                            >
                                                <img
                                                    src={item.image || item.images?.[0] || '/spa_banner_1.jpg'}
                                                    alt=""
                                                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                    <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>
                                        {getCartCount() === 1 ? '1 producto' : `${getCartCount()} productos`}
                                    </span>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <span style={{ fontSize: '10px', color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase', fontWeight: '700' }}>Total</span>
                                    <span style={{ fontSize: '16px', fontWeight: '900', color: primaryColor }}>
                                        ${getCartTotal().toLocaleString('es-AR')}
                                    </span>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowLeaveConfirmation(false);
                                        setIsCartOpen(true);
                                    }}
                                    style={{
                                        width: '100%',
                                        padding: '14px',
                                        borderRadius: '16px',
                                        border: 'none',
                                        backgroundColor: primaryColor,
                                        color: '#ffffff',
                                        fontSize: '14px',
                                        fontWeight: '800',
                                        cursor: 'pointer',
                                        boxShadow: `0 6px 20px ${primaryColor}40`,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px'
                                    }}
                                >
                                    <ShoppingBag size={18} />
                                    <span>Ver mi Carrito ({getCartCount()})</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setShowLeaveConfirmation(false)}
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        borderRadius: '16px',
                                        border: '1px solid var(--border)',
                                        backgroundColor: 'var(--bg-main)',
                                        color: 'var(--text-primary)',
                                        fontSize: '13px',
                                        fontWeight: '700',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Continuar en la Tienda
                                </button>

                                <button
                                    type="button"
                                    onClick={executeExit}
                                    style={{
                                        border: 'none',
                                        background: 'transparent',
                                        color: '#ef4444',
                                        fontSize: '12px',
                                        fontWeight: '700',
                                        cursor: 'pointer',
                                        padding: '8px',
                                        marginTop: '4px',
                                        opacity: 0.85
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                                    onMouseLeave={e => e.currentTarget.style.opacity = '0.85'}
                                >
                                    Salir de todas formas
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ═══ 10. FLOATING TOAST NOTIFICATION ═══ */}
            <AnimatePresence>
                {toastMessage && (
                    <motion.div
                        initial={{ opacity: 0, y: 30, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.9 }}
                        style={{
                            position: 'fixed',
                            bottom: getCartCount() > 0 ? '84px' : '24px',
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

            {/* ═══ 11. ITEM DELETION CONFIRMATION MODAL ═══ */}
            <AnimatePresence>
                {itemToDelete && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                            position: 'fixed',
                            inset: 0,
                            backgroundColor: 'rgba(0, 0, 0, 0.72)',
                            backdropFilter: 'blur(8px)',
                            zIndex: 1400,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '20px'
                        }}
                        onClick={() => setItemToDelete(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 15 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 15 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                            style={{
                                width: '100%',
                                maxWidth: '380px',
                                backgroundColor: 'var(--bg-card)',
                                border: '1px solid var(--border)',
                                borderRadius: '24px',
                                padding: '24px',
                                textAlign: 'center',
                                boxShadow: '0 24px 60px rgba(0,0,0,0.35)',
                                position: 'relative'
                            }}
                            onClick={e => e.stopPropagation()}
                        >
                            <div style={{
                                width: '56px',
                                height: '56px',
                                borderRadius: '18px',
                                background: 'rgba(239, 68, 68, 0.12)',
                                border: '2px solid rgba(239, 68, 68, 0.25)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                margin: '0 auto 16px auto',
                                color: '#ef4444'
                            }}>
                                <Trash2 size={26} />
                            </div>

                            <h3 style={{
                                fontSize: '18px',
                                fontWeight: '800',
                                color: 'var(--text-primary)',
                                margin: '0 0 8px 0',
                                letterSpacing: '-0.3px'
                            }}>
                                ¿Eliminar producto?
                            </h3>

                            <p style={{
                                fontSize: '13.5px',
                                color: 'var(--text-secondary)',
                                margin: '0 0 20px 0',
                                lineHeight: '1.45'
                            }}>
                                ¿Estás seguro de que querés quitar <strong style={{ color: 'var(--text-primary)' }}>"{itemToDelete.name}"</strong> de tu carrito?
                            </p>

                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button
                                    type="button"
                                    onClick={() => setItemToDelete(null)}
                                    style={{
                                        flex: 1,
                                        padding: '12px',
                                        borderRadius: '14px',
                                        border: '1px solid var(--border)',
                                        backgroundColor: 'var(--bg-main)',
                                        color: 'var(--text-primary)',
                                        fontSize: '13px',
                                        fontWeight: '700',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="button"
                                    onClick={handleConfirmDeleteItem}
                                    style={{
                                        flex: 1,
                                        padding: '12px',
                                        borderRadius: '14px',
                                        border: 'none',
                                        backgroundColor: '#ef4444',
                                        color: '#ffffff',
                                        fontSize: '13px',
                                        fontWeight: '800',
                                        cursor: 'pointer',
                                        boxShadow: '0 4px 14px rgba(239, 68, 68, 0.35)'
                                    }}
                                >
                                    Sí, eliminar
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
