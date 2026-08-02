
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import serviceAdapter from '../services/serviceAdapter';
import { findBusinessBySlug } from '../utils/utils';

// Fix for default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export default function LinkBio({ overrideSlug }) {
    const { businessSlug: routeSlug } = useParams();
    const businessSlug = overrideSlug || routeSlug;
    const navigate = useNavigate();
    const [business, setBusiness] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(null);
    const [selectedHighlight, setSelectedHighlight] = useState(null);

    const getBookingPath = (hash = '') => {
        if (overrideSlug) {
            return `/turnos${hash}`;
        }
        return `/${businessSlug}/turnos${hash}`;
    };

    const getStorePath = () => {
        if (overrideSlug) {
            return '/tienda';
        }
        return `/${businessSlug}/tienda`;
    };

    useEffect(() => {
        const fetchBusiness = async () => {
            try {
                const allBusinesses = await serviceAdapter.getBusinesses();
                const foundBusiness = findBusinessBySlug(allBusinesses, businessSlug);
                if (foundBusiness) {
                    setBusiness(foundBusiness);
                }
            } catch (error) {
                console.error('Error fetching business for LinkBio:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchBusiness();
    }, [businessSlug]);

    // Theme Management
    useEffect(() => {
        if (business) {
            const root = document.documentElement;
            const body = document.body;

            // Calculate primary color
            const color = business.primary_color || business.button_color || business.buttonColor ||
                (business.category === 'beauty' ? '#FF4081' :
                    business.category === 'health' ? '#2979FF' : '#00E676');

            // Set primary color variable
            root.style.setProperty('--primary-paddle', color);

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

    if (loading) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh',
                backgroundColor: 'var(--bg-main)'
            }}>
                <div className="spinner" style={{
                    width: '40px',
                    height: '40px',
                    border: '4px solid var(--border)',
                    borderTopColor: 'var(--primary-paddle)',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                }} />
            </div>
        );
    }

    if (!business) {
        return <div style={{ padding: 40, textAlign: 'center' }}>Negocio no encontrado</div>;
    }

    const primaryColor = business.primary_color || business.button_color || business.buttonColor ||
        (business.category === 'beauty' ? '#FF4081' :
            business.category === 'health' ? '#2979FF' : '#00E676');

    const highlights = business.gallery_highlights && business.gallery_highlights.length > 0
        ? business.gallery_highlights
        : (business.gallery_images && business.gallery_images.length > 0
            ? [{
                id: 'legacy_gallery',
                title: 'Galería',
                cover_image: business.gallery_images[0],
                images: business.gallery_images,
                order: 0
            }]
            : []);

    // Filter out social/location links from the main list as they will have their own sections
    const mainLinks = [
        {
            title: business.type === 'sport' ? 'Alquilar Cancha' :
                business.type === 'venue' ? 'Ver Disponibilidad' : 'Reservar Turno',
            subtitle: 'Reserva tu lugar en segundos',
            icon: '📅',
            action: () => navigate(getBookingPath('#servicios')),
            highlight: true
        },
        ...(business.store_enabled ? [{
            title: 'Ver Tienda / Productos',
            subtitle: 'Paletas, grips, bebidas y más',
            icon: '🛒',
            action: () => navigate(getStorePath()),
            highlight: false
        }] : [])
    ];

    return (
        <div className="linkbio-container" style={{
            backgroundColor: 'var(--bg-main)',
            backgroundImage: 'radial-gradient(var(--border) 1.5px, transparent 1.5px)',
            backgroundSize: '24px 24px',
            overflowX: 'hidden'
        }}>
            {/* Banner Section */}
            <div className="linkbio-banner" style={{
                width: '100%',
                height: '240px',
                backgroundImage: `url(${business.banner_image || 'https://images.unsplash.com/photo-1557683316-973673baf926?w=800&q=80'})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                position: 'relative'
            }}>
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.4) 100%)'
                }} />
            </div>

            {/* Profile Section */}
            <motion.div
                className="linkbio-profile-card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                    textAlign: 'center',
                    marginBottom: '16px',
                    width: '100%',
                    maxWidth: '450px',
                    padding: '0 16px',
                    marginTop: '-50px',
                    position: 'relative',
                    zIndex: 10
                }}
            >
                <div className="linkbio-logo" style={{
                    width: '120px',
                    height: '120px',
                    borderRadius: '50%',
                    margin: '0 auto 16px',
                    border: '4px solid var(--bg-main)',
                    boxShadow: '0 8px 20px rgba(0,0,0,0.2)',
                    overflow: 'hidden',
                    backgroundColor: 'white'
                }}>
                    <img
                        src={business.logo || business.image}
                        alt={business.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                </div>
                <h1 className="linkbio-name" style={{ fontSize: '22px', fontWeight: '800', marginBottom: '8px', color: 'var(--text-primary)' }}>
                    {business.name}
                </h1>
                <p className="linkbio-desc" style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                    {business.description || '¡Reserva tu turno online de forma rápida y sencilla!'}
                </p>

                {/* Social Media Row */}
                <div className="linkbio-socials" style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginBottom: '16px' }}>
                    {/* Instagram */}
                    {business.instagram && (
                        <a
                            className="linkbio-social-btn"
                            href={business.instagram}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '50%',
                                background: 'linear-gradient(45deg, #f09433 0%,#e6683c 25%,#dc2743 50%,#cc2366 75%,#bc1888 100%)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                transition: 'transform 0.2s',
                                boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
                            }}
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                            </svg>
                        </a>
                    )}

                    {/* Facebook */}
                    {business.facebook && (
                        <a
                            className="linkbio-social-btn"
                            href={business.facebook}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '50%',
                                backgroundColor: '#1877F2',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                transition: 'transform 0.2s',
                                boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
                            }}
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                            </svg>
                        </a>
                    )}

                    {/* TikTok */}
                    {business.tiktok && (
                        <a
                            className="linkbio-social-btn"
                            href={business.tiktok}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '50%',
                                backgroundColor: '#000000',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                transition: 'transform 0.2s',
                                boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
                            }}
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                                <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
                            </svg>
                        </a>
                    )}
                </div>

            </motion.div>

            {/* Highlights Immersive Viewer (Instagram-style) */}
            <AnimatePresence>
                {selectedHighlight !== null && selectedPhotoIndex !== null && business && (
                    (() => {
                        const highlight = highlights[selectedHighlight];
                        if (!highlight) return null;

                        const images = highlight.images || [];
                        const totalImages = images.length;

                        return (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                style={{
                                    position: 'fixed',
                                    inset: 0,
                                    backgroundColor: 'rgba(0,0,0,0.95)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    zIndex: 2000
                                }}
                                onClick={() => {
                                    setSelectedPhotoIndex(null);
                                    setSelectedHighlight(null);
                                }}
                            >
                                {/* Instagram-style progress bars */}
                                <div style={{
                                    position: 'absolute',
                                    top: '20px',
                                    left: '20px',
                                    right: '20px',
                                    display: 'flex',
                                    gap: '4px',
                                    zIndex: 2002
                                }}>
                                    {images.map((_, index) => (
                                        <div
                                            key={index}
                                            style={{
                                                flex: 1,
                                                height: '3px',
                                                borderRadius: '2px',
                                                background: index <= selectedPhotoIndex
                                                    ? 'white'
                                                    : 'rgba(255,255,255,0.3)',
                                                transition: 'background 0.3s'
                                            }}
                                        />
                                    ))}
                                </div>

                                {/* Close Button */}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedPhotoIndex(null);
                                        setSelectedHighlight(null);
                                    }}
                                    style={{
                                        position: 'absolute',
                                        top: '50px',
                                        right: '20px',
                                        background: 'rgba(255,255,255,0.2)',
                                        border: 'none',
                                        borderRadius: '50%',
                                        width: '40px',
                                        height: '40px',
                                        cursor: 'pointer',
                                        fontSize: '24px',
                                        color: 'white',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        backdropFilter: 'blur(10px)',
                                        zIndex: 2002
                                    }}
                                >
                                    ×
                                </button>

                                {/* Highlight title */}
                                <div style={{
                                    position: 'absolute',
                                    top: '50px',
                                    left: '20px',
                                    color: 'white',
                                    fontSize: '16px',
                                    fontWeight: 'bold',
                                    zIndex: 2002
                                }}>
                                    {highlight.title}
                                </div>

                                {/* Navigation areas (left/right tap zones) */}
                                <div
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedPhotoIndex((prev) =>
                                            prev > 0 ? prev - 1 : totalImages - 1
                                        );
                                    }}
                                    style={{
                                        position: 'absolute',
                                        left: 0,
                                        top: 0,
                                        bottom: 0,
                                        width: '30%',
                                        cursor: 'pointer',
                                        zIndex: 2001
                                    }}
                                />
                                <div
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        const nextIndex = selectedPhotoIndex + 1;
                                        if (nextIndex >= totalImages) {
                                            // Move to next highlight or close
                                            if (selectedHighlight < highlights.length - 1) {
                                                setSelectedHighlight(selectedHighlight + 1);
                                                setSelectedPhotoIndex(0);
                                            } else {
                                                setSelectedPhotoIndex(null);
                                                setSelectedHighlight(null);
                                            }
                                        } else {
                                            setSelectedPhotoIndex(nextIndex);
                                        }
                                    }}
                                    style={{
                                        position: 'absolute',
                                        right: 0,
                                        top: 0,
                                        bottom: 0,
                                        width: '70%',
                                        cursor: 'pointer',
                                        zIndex: 2001
                                    }}
                                />

                                {/* Current image */}
                                <motion.img
                                    key={`${selectedHighlight}-${selectedPhotoIndex}`}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ duration: 0.2 }}
                                    src={images[selectedPhotoIndex]}
                                    alt={`${highlight.title} - ${selectedPhotoIndex + 1}`}
                                    style={{
                                        maxWidth: '90%',
                                        maxHeight: '80vh',
                                        borderRadius: '8px',
                                        objectFit: 'contain',
                                        pointerEvents: 'none'
                                    }}
                                />

                                {/* Image counter */}
                                <div style={{
                                    position: 'absolute',
                                    bottom: '30px',
                                    color: 'white',
                                    fontSize: '14px',
                                    background: 'rgba(0,0,0,0.5)',
                                    padding: '6px 16px',
                                    borderRadius: '20px',
                                    backdropFilter: 'blur(10px)',
                                    zIndex: 2002
                                }}>
                                    {selectedPhotoIndex + 1} / {totalImages}
                                </div>
                            </motion.div>
                        );
                    })()
                )}
            </AnimatePresence>

            {/* Main Links Section */}
            <div className="linkbio-links-section" style={{ width: '100%', maxWidth: '450px', display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px', padding: '0 16px' }}>
                {mainLinks.map((link, index) => (
                    <motion.button
                        key={index}
                        className="linkbio-link-btn"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        onClick={link.action}
                        style={{
                            width: '100%',
                            padding: '12px 16px',
                            borderRadius: '20px',
                            border: '1px solid var(--border)',
                            backgroundColor: link.highlight ? primaryColor : 'var(--bg-card)',
                            color: link.highlight ? 'white' : 'var(--text-primary)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '16px',
                            cursor: 'pointer',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                            textAlign: 'left',
                            transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.1)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)';
                        }}
                    >
                        <span className="linkbio-link-icon-wrapper" style={{
                            fontSize: '20px',
                            backgroundColor: link.highlight ? 'rgba(255,255,255,0.2)' : 'var(--bg-main)',
                            width: '40px',
                            height: '40px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: '12px'
                        }}>
                            {link.icon}
                        </span>
                        <div style={{ flex: 1 }}>
                            <div className="linkbio-link-title" style={{ fontWeight: '700', fontSize: '16px' }}>{link.title}</div>
                            <div className="linkbio-link-subtitle" style={{
                                fontSize: '13px',
                                opacity: 0.8,
                                color: link.highlight ? 'white' : 'var(--text-secondary)'
                            }}>
                                {link.subtitle}
                            </div>
                        </div>
                        {!link.highlight && (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M9 18l6-6-6-6" />
                            </svg>
                        )}
                    </motion.button>
                ))}

                {/* WhatsApp Button */}
                {business.whatsapp && (
                    <motion.button
                        className="linkbio-link-btn"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                        onClick={() => window.open(`https://wa.me/${business.whatsapp}`, '_blank')}
                        style={{
                            width: '100%',
                            padding: '12px 16px',
                            borderRadius: '20px',
                            border: '1px solid var(--border)',
                            backgroundColor: '#25D366',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '16px',
                            cursor: 'pointer',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                            textAlign: 'left',
                            transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.1)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)';
                        }}
                    >
                        <span className="linkbio-link-icon-wrapper" style={{
                            fontSize: '20px',
                            backgroundColor: 'rgba(255,255,255,0.2)',
                            width: '40px',
                            height: '40px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: '12px'
                        }}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                            </svg>
                        </span>
                        <div style={{ flex: 1 }}>
                            <div className="linkbio-link-title" style={{ fontWeight: '700', fontSize: '16px' }}>WhatsApp</div>
                            <div className="linkbio-link-subtitle" style={{
                                fontSize: '13px',
                                opacity: 0.8,
                                color: 'white'
                            }}>
                                Consultas y dudas
                            </div>
                        </div>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 18l6-6-6-6" />
                        </svg>
                    </motion.button>
                )}
                {/* Location Button */}
                {business.location && (
                    <motion.button
                        className="linkbio-link-btn"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 }}
                        onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(business.location)}`, '_blank')}
                        style={{
                            width: '100%',
                            padding: '12px 16px',
                            borderRadius: '20px',
                            border: '1px solid var(--border)',
                            backgroundColor: 'var(--bg-card)',
                            color: 'var(--text-primary)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '16px',
                            cursor: 'pointer',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                            textAlign: 'left',
                            transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.1)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)';
                        }}
                    >
                        <span className="linkbio-link-icon-wrapper" style={{
                            fontSize: '20px',
                            backgroundColor: 'var(--bg-main)',
                            width: '40px',
                            height: '40px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: '12px'
                        }}>
                            📍
                        </span>
                        <div style={{ flex: 1 }}>
                            <div className="linkbio-link-title" style={{ fontWeight: '700', fontSize: '16px' }}>Ubicación</div>
                            <div className="linkbio-link-subtitle" style={{
                                fontSize: '13px',
                                opacity: 0.8,
                                color: 'var(--text-secondary)',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                maxWidth: '200px'
                            }}>
                                {business.location}
                            </div>
                        </div>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 18l6-6-6-6" />
                        </svg>
                    </motion.button>
                )}
            </div>
        </div >
    );
}
