import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';
import serviceAdapter from '../services/serviceAdapter';
import { useNotification } from '../contexts/NotificationContext';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export default function VenueProfile({ business: initialBusiness }) {
    const { businessSlug: slug } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { showAlert } = useNotification();

    const [business, setBusiness] = useState(initialBusiness || location.state?.business || null);
    const [loading, setLoading] = useState(!business);
    const [selectedDate, setSelectedDate] = useState(null);
    const [guestCount, setGuestCount] = useState(30);
    const [duration, setDuration] = useState(4);
    const [selectedServices, setSelectedServices] = useState([]);
    const [showBookingModal, setShowBookingModal] = useState(false);
    const [bookingStep, setBookingStep] = useState(1);
    const [showLightbox, setShowLightbox] = useState(false);
    const [lightboxIndex, setLightboxIndex] = useState(0);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [showServicesExpanded, setShowServicesExpanded] = useState(false);
    const [windowWidth, setWindowWidth] = useState(window.innerWidth);

    useEffect(() => {
        const handleResize = () => setWindowWidth(window.innerWidth);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        if (!business) {
            fetchBusiness();
        }
    }, [slug, business]);

    const fetchBusiness = async () => {
        try {
            setLoading(true);
            const data = await serviceAdapter.getBusinessBySlug(slug);
            if (!data) {
                navigate('/');
                return;
            }
            setBusiness(data);
        } catch (error) {
            console.error('Error fetching business:', error);
            navigate('/');
        } finally {
            setLoading(false);
        }
    };

    // Get gallery images with captions
    const getGalleryImages = () => {
        if (!business) return [];

        // Try to get from metadata.venue_gallery first (with captions)
        if (business.metadata?.venue_gallery && Array.isArray(business.metadata.venue_gallery)) {
            return business.metadata.venue_gallery;
        }

        // Fallback to gallery_images (simple URLs)
        if (business.gallery_images && Array.isArray(business.gallery_images)) {
            return business.gallery_images.map(url => ({ url, caption: '', category: 'General' }));
        }

        return [];
    };

    // Calculate price based on guest count and pricing tiers
    const calculatePrice = () => {
        if (!business?.pricing_tiers || business.pricing_tiers.length === 0) {
            return business?.price_per_hour || 0;
        }

        const tier = business.pricing_tiers.find(t =>
            guestCount >= (t.min || 0) && guestCount <= (t.max || 999)
        );

        return tier ? tier.price : business.pricing_tiers[0].price;
    };

    const pricePerHour = calculatePrice();
    const basePrice = pricePerHour * duration;
    const servicesTotal = selectedServices.reduce((sum, service) => sum + service.price, 0);
    const totalPrice = basePrice + servicesTotal;

    // Toggle service selection
    const toggleService = (service) => {
        setSelectedServices(prev => {
            const exists = prev.find(s => s.id === service.id);
            if (exists) {
                return prev.filter(s => s.id !== service.id);
            } else {
                return [...prev, service];
            }
        });
    };

    // Calendar logic
    const getDaysInMonth = (date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();

        const days = [];

        // Add empty cells for days before the month starts
        for (let i = 0; i < startingDayOfWeek; i++) {
            days.push(null);
        }

        // Add actual days
        for (let i = 1; i <= daysInMonth; i++) {
            days.push(new Date(year, month, i));
        }

        return days;
    };

    const isDateBlocked = (date) => {
        if (!date || !business?.blocked_dates) return false;

        const dateStr = date.toISOString().split('T')[0];
        return business.blocked_dates.some(blocked => blocked.date === dateStr);
    };

    const isDatePast = (date) => {
        if (!date) return false;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return date < today;
    };

    const handleDateSelect = (date) => {
        if (isDateBlocked(date) || isDatePast(date)) return;
        setSelectedDate(date);
    };

    const handleContinue = () => {
        if (!selectedDate) {
            showAlert('Fecha requerida', 'Por favor selecciona una fecha para continuar con tu reserva.', 'warning', 'Entendido');
            return;
        }
        setBookingStep(1);
        setShowBookingModal(true);
    };

    const handleConfirmBooking = async (bookingDetails) => {
        try {
            const bookingData = {
                business_id: business.id,
                date: selectedDate.toISOString().split('T')[0],
                time: '00:00', // Venue bookings are all-day or custom
                duration: duration,
                guest_count: guestCount,
                selected_services: selectedServices,
                services_total: servicesTotal,
                base_price: basePrice,
                total_price: totalPrice,
                customer_name: bookingDetails.customerName,
                customer_phone: bookingDetails.customerPhone,
                customer_email: bookingDetails.customerEmail,
                notes: bookingDetails.notes,
                status: 'pending'
            };

            await serviceAdapter.createBooking(bookingData);
            setShowBookingModal(false);
            await showAlert('¡Reserva Confirmada!', 'Tu reserva ha sido creada exitosamente. Te contactaremos pronto para confirmar los detalles.', 'success', 'Perfecto');
            navigate('/');
        } catch (error) {
            console.error('Error creating booking:', error);
            showAlert('Error', 'No pudimos procesar tu reserva. Por favor intenta nuevamente.', 'error', 'Reintentar');
        }
    };

    // Get icon for amenity
    const getAmenityIcon = (amenity) => {
        const icons = {
            'Piscina': '🏊',
            'Parrilla': '🔥',
            'WiFi': '📶',
            'Aire Acondicionado': '❄️',
            'Parking': '🚗',
            'Sonido': '🔊',
            'Cocina Equipada': '🍳',
            'Baños Completos': '🚿',
            'Jardín': '🌳',
            'Quincho Cubierto': '🏠',
            'Zona de Juegos': '🎮',
            'Iluminación LED': '💡',
            'Televisor': '📺',
            'Mesa de Pool': '🎱',
            'Metegol': '⚽',
            'Ping Pong': '🏓'
        };
        return icons[amenity] || '✨';
    };

    if (loading) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '100vh',
                background: '#F8F9FA'
            }}>
                <div style={{ fontSize: '18px', color: '#64748B' }}>Cargando...</div>
            </div>
        );
    }

    if (!business) return null;

    const galleryImages = getGalleryImages();
    const amenities = business.amenities || [];
    const additionalServices = business.additional_services || [];
    const daysInMonth = getDaysInMonth(currentMonth);
    const durationOptions = business?.rental_duration_options || [4, 6, 8, 12, 24];

    return (
        <div style={{ background: '#F8F9FA', minHeight: '100vh' }}>
            {/* Hero Section */}
            <div style={{
                position: 'relative',
                height: '50vh',
                minHeight: '400px',
                background: 'linear-gradient(135deg, #2D3748 0%, #1A202C 100%)',
                overflow: 'hidden'
            }}>
                {galleryImages[0] && (
                    <img
                        src={galleryImages[0].url}
                        alt={business.name}
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            opacity: 0.7
                        }}
                    />
                )}
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.6) 100%)'
                }} />
                {/* Content Container */}
                <div style={{
                    position: 'relative',
                    zIndex: 2,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'flex-end',
                    padding: windowWidth < 768 ? '16px' : '32px',
                    color: 'white',
                    maxWidth: '1400px',
                    width: '100%',
                    margin: '0 auto'
                }}>
                    <div style={{ marginBottom: '16px' }}>
                        <span style={{
                            background: 'rgba(255,255,255,0.2)',
                            backdropFilter: 'blur(4px)',
                            padding: '6px 12px',
                            borderRadius: '20px',
                            fontSize: '13px',
                            fontWeight: '600',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                        }}>
                            {business.category || 'Venue'}
                        </span>
                    </div>
                    <h1 style={{
                        fontSize: windowWidth < 768 ? '36px' : '56px',
                        fontWeight: '900',
                        marginBottom: '16px',
                        lineHeight: '1.1',
                        textShadow: '0 4px 12px rgba(0,0,0,0.3)'
                    }}>
                        {business.name}
                    </h1>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px', fontWeight: '500', opacity: 0.9 }}>
                        <span>📍</span>
                        <span>{business.address}, {business.city}</span>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div style={{
                maxWidth: '1400px',
                width: '100%',
                margin: '0 auto',
                padding: windowWidth < 768 ? '16px' : '32px',
                paddingBottom: '100px',
                display: 'grid',
                gridTemplateColumns: windowWidth > 1200 ? '1fr 450px' : '1fr',
                gap: windowWidth < 768 ? '16px' : '32px',
                position: 'relative',
                zIndex: 10,
                marginTop: '-60px'
            }}>
                {/* Left Column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {/* Gallery Section */}
                    {galleryImages.length > 0 && (
                        <div style={{
                            background: 'white',
                            borderRadius: '24px',
                            padding: '32px',
                            boxShadow: '0 4px 24px rgba(0,0,0,0.06)'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#1a1a1a' }}>Galería</h2>
                                <button
                                    onClick={() => { setLightboxIndex(0); setShowLightbox(true); }}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: '#84CC16',
                                        fontSize: '14px',
                                        fontWeight: '600',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Ver todas →
                                </button>
                            </div>
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: '2fr 1fr',
                                gap: '12px',
                                height: '400px'
                            }}>
                                <div
                                    onClick={() => { setLightboxIndex(0); setShowLightbox(true); }}
                                    style={{
                                        position: 'relative',
                                        borderRadius: '20px',
                                        overflow: 'hidden',
                                        cursor: 'pointer',
                                        transition: 'transform 0.3s ease'
                                    }}
                                >
                                    <img
                                        src={galleryImages[0].url}
                                        alt={galleryImages[0].caption || 'Imagen principal'}
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    />
                                    {galleryImages[0].caption && (
                                        <div style={{
                                            position: 'absolute',
                                            top: '16px',
                                            left: '16px',
                                            background: 'rgba(0,0,0,0.6)',
                                            backdropFilter: 'blur(10px)',
                                            color: 'white',
                                            padding: '8px 16px',
                                            borderRadius: '12px',
                                            fontSize: '13px',
                                            fontWeight: '600'
                                        }}>
                                            {galleryImages[0].caption}
                                        </div>
                                    )}
                                </div>
                                <div style={{ display: 'grid', gridTemplateRows: '1fr 1fr', gap: '12px' }}>
                                    {galleryImages.slice(1, 3).map((img, idx) => (
                                        <div
                                            key={idx}
                                            onClick={() => { setLightboxIndex(idx + 1); setShowLightbox(true); }}
                                            style={{
                                                position: 'relative',
                                                borderRadius: '16px',
                                                overflow: 'hidden',
                                                cursor: 'pointer',
                                                transition: 'transform 0.3s ease'
                                            }}
                                        >
                                            <img
                                                src={img.url}
                                                alt={img.caption || `Imagen ${idx + 2}`}
                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                            />
                                            {idx === 1 && galleryImages.length > 3 && (
                                                <div style={{
                                                    position: 'absolute',
                                                    inset: 0,
                                                    background: 'rgba(0,0,0,0.5)',
                                                    backdropFilter: 'blur(4px)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    color: 'white',
                                                    fontSize: '18px',
                                                    fontWeight: '700'
                                                }}>
                                                    +{galleryImages.length - 3} fotos
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Amenities Section */}
                    {amenities.length > 0 && (
                        <div style={{
                            background: 'white',
                            borderRadius: '24px',
                            padding: '32px',
                            boxShadow: '0 4px 24px rgba(0,0,0,0.06)'
                        }}>
                            <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#1a1a1a', marginBottom: '20px' }}>
                                Comodidades Destacadas
                            </h2>
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                                gap: '16px'
                            }}>
                                {amenities.map((amenity, idx) => (
                                    <div
                                        key={idx}
                                        style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            gap: '12px',
                                            padding: '20px',
                                            background: '#F8F9FA',
                                            borderRadius: '16px',
                                            transition: 'all 0.3s ease',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <div style={{
                                            width: '48px',
                                            height: '48px',
                                            background: 'white',
                                            borderRadius: '12px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '24px'
                                        }}>
                                            {getAmenityIcon(amenity)}
                                        </div>
                                        <div style={{
                                            fontSize: '13px',
                                            fontWeight: '600',
                                            color: '#4A5568',
                                            textAlign: 'center'
                                        }}>
                                            {amenity}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Additional Services Section */}
                    {additionalServices.length > 0 && (
                        <div style={{
                            background: 'white',
                            borderRadius: '24px',
                            overflow: 'hidden',
                            boxShadow: '0 4px 24px rgba(0,0,0,0.06)'
                        }}>
                            <div
                                onClick={() => setShowServicesExpanded(!showServicesExpanded)}
                                style={{
                                    padding: '32px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    transition: 'background 0.2s'
                                }}
                            >
                                <div>
                                    <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#1a1a1a' }}>
                                        Servicios Adicionales
                                    </h2>
                                    <p style={{ fontSize: '13px', color: '#64748B', fontWeight: '500', marginTop: '4px' }}>
                                        Personaliza tu experiencia
                                    </p>
                                </div>
                                <div style={{
                                    fontSize: '24px',
                                    color: '#84CC16',
                                    transition: 'transform 0.3s',
                                    transform: showServicesExpanded ? 'rotate(180deg)' : 'rotate(0deg)'
                                }}>
                                    ▼
                                </div>
                            </div>
                            <div style={{
                                maxHeight: showServicesExpanded ? '1000px' : '0',
                                overflow: 'hidden',
                                transition: 'max-height 0.4s ease'
                            }}>
                                <div style={{ padding: '0 32px 32px 32px', display: 'grid', gap: '12px' }}>
                                    {additionalServices.map((service, idx) => (
                                        <div
                                            key={idx}
                                            style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                padding: '20px',
                                                background: '#F8F9FA',
                                                borderRadius: '16px',
                                                transition: 'all 0.3s ease',
                                                cursor: 'pointer',
                                                border: '2px solid transparent'
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                                <div style={{
                                                    width: '56px',
                                                    height: '56px',
                                                    background: 'white',
                                                    borderRadius: '14px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontSize: '28px',
                                                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
                                                }}>
                                                    {service.icon || '✨'}
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: '15px', fontWeight: '700', color: '#1a1a1a' }}>
                                                        {service.name}
                                                    </div>
                                                    {service.description && (
                                                        <div style={{ fontSize: '13px', color: '#64748B', marginTop: '2px' }}>
                                                            {service.description}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div style={{ fontSize: '16px', fontWeight: '800', color: '#84CC16' }}>
                                                +${service.price}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Calendar Section */}
                    <div style={{
                        background: 'white',
                        borderRadius: '24px',
                        padding: '32px',
                        boxShadow: '0 4px 24px rgba(0,0,0,0.06)'
                    }}>
                        <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#1a1a1a', marginBottom: '20px' }}>
                            Disponibilidad
                        </h2>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '16px'
                        }}>
                            <button
                                onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                                style={{
                                    background: '#F8F9FA',
                                    border: 'none',
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '12px',
                                    cursor: 'pointer',
                                    fontSize: '20px',
                                    fontWeight: '700',
                                    color: '#1a1a1a'
                                }}
                            >
                                ‹
                            </button>
                            <div style={{ fontSize: '16px', fontWeight: '700', color: '#1a1a1a' }}>
                                {currentMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
                            </div>
                            <button
                                onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                                style={{
                                    background: '#F8F9FA',
                                    border: 'none',
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '12px',
                                    cursor: 'pointer',
                                    fontSize: '20px',
                                    fontWeight: '700',
                                    color: '#1a1a1a'
                                }}
                            >
                                ›
                            </button>
                        </div>
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(7, 1fr)',
                            gap: '8px'
                        }}>
                            {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(day => (
                                <div key={day} style={{
                                    textAlign: 'center',
                                    fontSize: '12px',
                                    fontWeight: '700',
                                    color: '#64748B',
                                    padding: '8px'
                                }}>
                                    {day}
                                </div>
                            ))}
                            {daysInMonth.map((date, idx) => {
                                if (!date) {
                                    return <div key={`empty-${idx}`} />;
                                }

                                const isBlocked = isDateBlocked(date);
                                const isPast = isDatePast(date);
                                const isSelected = selectedDate && date.toDateString() === selectedDate.toDateString();
                                const isDisabled = isBlocked || isPast;

                                return (
                                    <button
                                        key={idx}
                                        onClick={() => handleDateSelect(date)}
                                        disabled={isDisabled}
                                        style={{
                                            padding: '12px',
                                            borderRadius: '12px',
                                            background: isSelected ? '#84CC16' : isBlocked ? '#FEE2E2' : isPast ? '#F8F9FA' : 'white',

                                            color: isSelected ? 'white' : isDisabled ? '#CBD5E1' : '#1a1a1a',
                                            fontSize: '14px',
                                            fontWeight: isSelected ? '700' : '500',
                                            cursor: isDisabled ? 'not-allowed' : 'pointer',
                                            transition: 'all 0.2s',
                                            border: isSelected ? 'none' : '1px solid #E5E7EB'
                                        }}
                                    >
                                        {date.getDate()}
                                    </button>
                                );
                            })}
                        </div>

                        {selectedDate && (
                            <div style={{ marginTop: '24px', animation: 'fadeIn 0.3s ease' }}>
                                <button
                                    onClick={handleContinue}
                                    style={{
                                        width: '100%',
                                        padding: '16px',
                                        background: '#84CC16',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '16px',
                                        fontSize: '16px',
                                        fontWeight: '700',
                                        cursor: 'pointer',
                                        boxShadow: '0 4px 12px rgba(132, 204, 22, 0.3)',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center'
                                    }}
                                >
                                    <span>Continuar reserva</span>
                                    <span>→</span>
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Description Section */}
                    {business.description && (
                        <div style={{
                            background: 'white',
                            borderRadius: '24px',
                            padding: '32px',
                            boxShadow: '0 4px 24px rgba(0,0,0,0.06)'
                        }}>
                            <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#1a1a1a', marginBottom: '16px' }}>
                                Sobre el Espacio
                            </h2>
                            <p style={{ fontSize: '15px', color: '#4A5568', lineHeight: '1.7' }}>
                                {business.description}
                            </p>
                        </div>
                    )}

                    {/* Map Section */}
                    {business.latitude && business.longitude && (
                        <div style={{
                            background: 'white',
                            borderRadius: '24px',
                            padding: '32px',
                            boxShadow: '0 4px 24px rgba(0,0,0,0.06)'
                        }}>
                            <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#1a1a1a', marginBottom: '16px' }}>
                                Ubicación
                            </h2>

                            {business.address && (
                                <div style={{ fontSize: '15px', color: '#4A5568', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontSize: '18px' }}>🏠</span> {business.address}
                                </div>
                            )}

                            <div style={{ height: '300px', borderRadius: '16px', overflow: 'hidden', position: 'relative' }}>
                                <MapContainer
                                    center={[business.latitude, business.longitude]}
                                    zoom={15}
                                    style={{ height: '100%', width: '100%' }}
                                >
                                    <TileLayer
                                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                    />
                                    <Marker position={[business.latitude, business.longitude]}>
                                    </Marker>
                                </MapContainer>

                                {/* Floating Directions Button */}
                                <a
                                    href={`https://www.google.com/maps/dir/?api=1&destination=${business.latitude},${business.longitude}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                        position: 'absolute',
                                        bottom: '20px',
                                        left: '50%',
                                        transform: 'translateX(-50%)',
                                        zIndex: 1000,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        color: 'white', // Texto blanco para mejor contraste
                                        textDecoration: 'none',
                                        fontWeight: '700',
                                        fontSize: '14px',
                                        padding: '10px 20px',
                                        background: '#84CC16', // Fondo verde primario
                                        borderRadius: '50px', // Bordes redondeados estilo "pill"
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.2)', // Sombra para profundidad
                                        border: '2px solid white' // Borde blanco para resaltar sobre el mapa
                                    }}
                                >
                                    <span>📍</span> <span>Cómo llegar</span>
                                </a>
                            </div>
                        </div>
                    )}


                </div>

                {/* Right Column - Booking Panel (Desktop only) */}
                {
                    windowWidth > 1200 && (
                        <div style={{
                            position: 'sticky',
                            top: '32px',
                            height: 'fit-content'
                        }}>
                            <BookingPanel
                                pricePerHour={pricePerHour}
                                guestCount={guestCount}
                                setGuestCount={setGuestCount}
                                duration={duration}
                                setDuration={setDuration}
                                basePrice={basePrice}
                                totalPrice={totalPrice}
                                onContinue={handleContinue}
                                business={business}
                            />
                        </div>
                    )
                }
            </div >




            {/* Booking Modal */}
            {/* Booking Modal Wizard */}
            <AnimatePresence>
                {showBookingModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                            position: 'fixed',
                            inset: 0,
                            background: 'rgba(0,0,0,0.6)',
                            backdropFilter: 'blur(8px)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 1000,
                            padding: '20px'
                        }}
                        onClick={() => setShowBookingModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            style={{
                                background: 'white',
                                borderRadius: '24px',
                                maxWidth: '500px',
                                width: '100%',
                                maxHeight: '90vh',
                                overflow: 'auto',
                                padding: '32px',
                                display: 'flex',
                                flexDirection: 'column'
                            }}
                        >
                            {/* Header & Steps Indicator */}
                            <div style={{ marginBottom: '24px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                    <h2 style={{ fontSize: '24px', fontWeight: '900', margin: 0 }}>
                                        {bookingStep === 1 && 'Configuración'}
                                        {bookingStep === 2 && 'Servicios Extra'}
                                        {bookingStep === 3 && 'Resumen'}
                                        {bookingStep === 4 && 'Tus Datos'}
                                    </h2>
                                    <button
                                        onClick={() => setShowBookingModal(false)}
                                        style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#CBD5E1' }}
                                    >
                                        ×
                                    </button>
                                </div>

                                {/* Progress Bar */}
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    {[1, 2, 3, 4].map(step => (
                                        <div key={step} style={{
                                            flex: 1,
                                            height: '4px',
                                            borderRadius: '2px',
                                            background: step <= bookingStep ? '#84CC16' : '#E2E8F0',
                                            transition: 'background 0.3s ease'
                                        }} />
                                    ))}
                                </div>
                            </div>

                            {/* STEP 1: Configuration (Guests & Duration) */}
                            {bookingStep === 1 && (
                                <div style={{ flex: 1 }}>
                                    <p style={{ fontSize: '14px', color: '#64748B', marginBottom: '24px' }}>
                                        Configura los detalles básicos de tu evento.
                                    </p>

                                    <div style={{ display: 'grid', gap: '24px' }}>
                                        {/* Guest Counter */}
                                        <div>
                                            <div style={{ fontSize: '14px', fontWeight: '700', color: '#1E293B', marginBottom: '12px' }}>
                                                Cantidad de Invitados
                                            </div>
                                            <div style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                background: '#F8F9FA',
                                                borderRadius: '16px',
                                                padding: '16px'
                                            }}>
                                                <button
                                                    onClick={() => setGuestCount(Math.max(1, guestCount - 5))}
                                                    style={{
                                                        background: 'white',
                                                        border: '1px solid #E2E8F0',
                                                        width: '44px',
                                                        height: '44px',
                                                        borderRadius: '12px',
                                                        cursor: 'pointer',
                                                        fontSize: '20px',
                                                        fontWeight: '700',
                                                        color: '#1a1a1a',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center'
                                                    }}
                                                >
                                                    −
                                                </button>
                                                <div style={{ textAlign: 'center' }}>
                                                    <div style={{ fontSize: '24px', fontWeight: '900', color: '#1a1a1a' }}>
                                                        {guestCount}
                                                    </div>
                                                    <div style={{ fontSize: '13px', color: '#64748B' }}>personas</div>
                                                </div>
                                                <button
                                                    onClick={() => setGuestCount(guestCount + 5)}
                                                    style={{
                                                        background: 'white',
                                                        border: '1px solid #E2E8F0',
                                                        width: '44px',
                                                        height: '44px',
                                                        borderRadius: '12px',
                                                        cursor: 'pointer',
                                                        fontSize: '20px',
                                                        fontWeight: '700',
                                                        color: '#1a1a1a',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center'
                                                    }}
                                                >
                                                    +
                                                </button>
                                            </div>
                                        </div>

                                        {/* Duration Selector */}
                                        <div>
                                            <div style={{ fontSize: '14px', fontWeight: '700', color: '#1E293B', marginBottom: '12px' }}>
                                                Duración del Evento
                                            </div>
                                            <div style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                background: '#F8F9FA',
                                                borderRadius: '16px',
                                                padding: '16px'
                                            }}>
                                                <button
                                                    onClick={() => {
                                                        const currentIdx = durationOptions.indexOf(duration);
                                                        if (currentIdx > 0) setDuration(durationOptions[currentIdx - 1]);
                                                    }}
                                                    disabled={durationOptions.indexOf(duration) === 0}
                                                    style={{
                                                        background: 'white',
                                                        border: '1px solid #E2E8F0',
                                                        width: '44px',
                                                        height: '44px',
                                                        borderRadius: '12px',
                                                        cursor: durationOptions.indexOf(duration) === 0 ? 'not-allowed' : 'pointer',
                                                        fontSize: '20px',
                                                        fontWeight: '700',
                                                        color: '#1a1a1a',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        opacity: durationOptions.indexOf(duration) === 0 ? 0.3 : 1
                                                    }}
                                                >
                                                    −
                                                </button>
                                                <div style={{ textAlign: 'center' }}>
                                                    <div style={{ fontSize: '24px', fontWeight: '900', color: '#1a1a1a' }}>
                                                        {duration}
                                                    </div>
                                                    <div style={{ fontSize: '13px', color: '#64748B' }}>horas</div>
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        const currentIdx = durationOptions.indexOf(duration);
                                                        if (currentIdx < durationOptions.length - 1) setDuration(durationOptions[currentIdx + 1]);
                                                    }}
                                                    disabled={durationOptions.indexOf(duration) === durationOptions.length - 1}
                                                    style={{
                                                        background: 'white',
                                                        border: '1px solid #E2E8F0',
                                                        width: '44px',
                                                        height: '44px',
                                                        borderRadius: '12px',
                                                        cursor: durationOptions.indexOf(duration) === durationOptions.length - 1 ? 'not-allowed' : 'pointer',
                                                        fontSize: '20px',
                                                        fontWeight: '700',
                                                        color: '#1a1a1a',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        opacity: durationOptions.indexOf(duration) === durationOptions.length - 1 ? 0.3 : 1
                                                    }}
                                                >
                                                    +
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* STEP 2: Additional Services */}
                            {bookingStep === 2 && (
                                <div style={{ flex: 1 }}>
                                    <p style={{ fontSize: '14px', color: '#64748B', marginBottom: '20px' }}>
                                        Personaliza tu experiencia agregando servicios adicionales (opcional).
                                    </p>

                                    {additionalServices.length > 0 ? (
                                        <div style={{ display: 'grid', gap: '12px' }}>
                                            {additionalServices.map((service, idx) => {
                                                const isSelected = selectedServices.some(s => s.id === service.id);
                                                return (
                                                    <div
                                                        key={idx}
                                                        onClick={() => toggleService(service)}
                                                        style={{
                                                            display: 'flex',
                                                            justifyContent: 'space-between',
                                                            alignItems: 'center',
                                                            padding: '16px',
                                                            background: isSelected ? 'rgba(132, 204, 22, 0.05)' : 'white',
                                                            borderRadius: '16px',
                                                            cursor: 'pointer',
                                                            border: isSelected ? '2px solid #84CC16' : '1px solid #E5E7EB',
                                                            transition: 'all 0.2s ease'
                                                        }}
                                                    >
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                                            <div style={{
                                                                width: '40px',
                                                                height: '40px',
                                                                borderRadius: '10px',
                                                                background: isSelected ? '#84CC16' : '#F1F5F9',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                fontSize: '20px',
                                                                color: isSelected ? 'white' : '#64748B',
                                                                transition: 'all 0.2s ease'
                                                            }}>
                                                                {isSelected ? '✓' : service.icon || '✨'}
                                                            </div>
                                                            <div>
                                                                <div style={{ fontSize: '15px', fontWeight: '700', color: '#1a1a1a' }}>
                                                                    {service.name}
                                                                </div>
                                                                <div style={{ fontSize: '14px', fontWeight: '700', color: '#84CC16', marginTop: '2px' }}>
                                                                    +${service.price?.toLocaleString()}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748B' }}>
                                            No hay servicios adicionales disponibles para este espacio.
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* STEP 3: Summary */}
                            {bookingStep === 3 && (
                                <div style={{ flex: 1 }}>
                                    <div style={{ background: '#F8F9FA', borderRadius: '16px', padding: '24px' }}>
                                        {/* Date & Guests */}
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                                            <div>
                                                <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '4px' }}>FECHA</div>
                                                <div style={{ fontSize: '15px', fontWeight: '700' }}>
                                                    {selectedDate?.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}
                                                </div>
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '4px' }}>INVITADOS</div>
                                                <div style={{ fontSize: '15px', fontWeight: '700' }}>{guestCount} pers.</div>
                                            </div>
                                        </div>

                                        {/* Breakdown */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <span style={{ color: '#4A5568', fontSize: '14px' }}>Alquiler base ({duration}h)</span>
                                                <span style={{ fontWeight: '600', fontSize: '14px' }}>${basePrice.toLocaleString()}</span>
                                            </div>

                                            {selectedServices.map((service, idx) => (
                                                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                    <span style={{ color: '#4A5568', fontSize: '14px' }}>{service.name}</span>
                                                    <span style={{ fontWeight: '600', fontSize: '14px' }}>+${service.price.toLocaleString()}</span>
                                                </div>
                                            ))}

                                            <div style={{ height: '1px', background: '#E2E8F0', margin: '8px 0' }} />

                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ fontWeight: '700', fontSize: '16px' }}>Total Final</span>
                                                <span style={{ fontWeight: '900', fontSize: '24px', color: '#84CC16' }}>${totalPrice.toLocaleString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* STEP 4: Customer Form */}
                            {bookingStep === 4 && (
                                <div style={{ flex: 1 }}>
                                    <p style={{ fontSize: '14px', color: '#64748B', marginBottom: '20px' }}>
                                        Ingresa tus datos de contacto para enviarte la confirmación.
                                    </p>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>Nombre</label>
                                            <input type="text" id="customerFirstName" placeholder="Tu nombre" style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #E2E8F0' }} />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>Apellido</label>
                                            <input type="text" id="customerLastName" placeholder="Tu apellido" style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #E2E8F0' }} />
                                        </div>
                                    </div>
                                    <div style={{ marginBottom: '16px' }}>
                                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>Teléfono (WhatsApp)</label>
                                        <input type="tel" id="customerPhone" placeholder="3804..." style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #E2E8F0' }} />
                                    </div>
                                    <div style={{ marginBottom: '16px' }}>
                                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>Email (Opcional)</label>
                                        <input type="email" id="customerEmail" placeholder="tucorreo@ejemplo.com" style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #E2E8F0' }} />
                                    </div>
                                </div>
                            )}

                            {/* Footer Buttons */}
                            <div style={{ display: 'flex', gap: '12px', marginTop: '32px' }}>
                                {bookingStep > 1 && (
                                    <button
                                        onClick={() => {
                                            setBookingStep(prev => prev - 1)
                                        }}
                                        style={{
                                            padding: '16px 24px',
                                            borderRadius: '14px',
                                            border: '1px solid #E2E8F0',
                                            background: 'white',
                                            fontSize: '16px',
                                            fontWeight: '600',
                                            cursor: 'pointer',
                                            color: '#64748B'
                                        }}
                                    >
                                        Volver
                                    </button>
                                )}

                                <button
                                    onClick={() => {
                                        if (bookingStep === 4) {
                                            // Handle Submit
                                            const firstName = document.getElementById('customerFirstName')?.value;
                                            const lastName = document.getElementById('customerLastName')?.value;
                                            const phone = document.getElementById('customerPhone')?.value;
                                            const email = document.getElementById('customerEmail')?.value;

                                            if (!firstName || !lastName || !phone) {
                                                showAlert('Campos requeridos', 'Por favor completa nombre, apellido y teléfono.', 'warning', 'Entendido');
                                                return;
                                            }

                                            handleConfirmBooking({
                                                customerName: `${firstName} ${lastName}`,
                                                customerPhone: phone,
                                                customerEmail: email
                                            });
                                        } else if (bookingStep === 2 && additionalServices.length === 0) {
                                            // Check logic for skipping services if needed, but linear flow is better for wizard
                                            setBookingStep(prev => prev + 1);
                                        } else {
                                            setBookingStep(prev => prev + 1);
                                        }
                                    }}
                                    style={{
                                        flex: 1,
                                        padding: '16px',
                                        borderRadius: '14px',
                                        border: 'none',
                                        background: '#84CC16',
                                        color: 'white',
                                        fontSize: '16px',
                                        fontWeight: '700',
                                        cursor: 'pointer',
                                        boxShadow: '0 4px 12px rgba(132, 204, 22, 0.3)'
                                    }}
                                >
                                    {bookingStep === 4 ? 'Confirmar Reserva' : 'Siguiente'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Lightbox */}
            <AnimatePresence>
                {showLightbox && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                            position: 'fixed',
                            inset: 0,
                            background: 'rgba(0,0,0,0.95)',
                            zIndex: 2000,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '20px'
                        }}
                        onClick={() => setShowLightbox(false)}
                    >
                        <button
                            onClick={() => setShowLightbox(false)}
                            style={{
                                position: 'absolute',
                                top: '20px',
                                right: '20px',
                                background: 'rgba(255,255,255,0.2)',
                                border: 'none',
                                width: '50px',
                                height: '50px',
                                borderRadius: '50%',
                                color: 'white',
                                fontSize: '24px',
                                cursor: 'pointer',
                                zIndex: 10
                            }}
                        >
                            ×
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); setLightboxIndex(Math.max(0, lightboxIndex - 1)); }}
                            disabled={lightboxIndex === 0}
                            style={{
                                position: 'absolute',
                                left: '20px',
                                background: 'rgba(255,255,255,0.2)',
                                border: 'none',
                                width: '50px',
                                height: '50px',
                                borderRadius: '50%',
                                color: 'white',
                                fontSize: '24px',
                                cursor: lightboxIndex === 0 ? 'not-allowed' : 'pointer',
                                opacity: lightboxIndex === 0 ? 0.3 : 1
                            }}
                        >
                            ‹
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); setLightboxIndex(Math.min(galleryImages.length - 1, lightboxIndex + 1)); }}
                            disabled={lightboxIndex === galleryImages.length - 1}
                            style={{
                                position: 'absolute',
                                right: '20px',
                                background: 'rgba(255,255,255,0.2)',
                                border: 'none',
                                width: '50px',
                                height: '50px',
                                borderRadius: '50%',
                                color: 'white',
                                fontSize: '24px',
                                cursor: lightboxIndex === galleryImages.length - 1 ? 'not-allowed' : 'pointer',
                                opacity: lightboxIndex === galleryImages.length - 1 ? 0.3 : 1
                            }}
                        >
                            ›
                        </button>
                        <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: '90vw', maxHeight: '90vh' }}>
                            <img
                                src={galleryImages[lightboxIndex]?.url}
                                alt={galleryImages[lightboxIndex]?.caption}
                                style={{
                                    maxWidth: '100%',
                                    maxHeight: '90vh',
                                    objectFit: 'contain',
                                    borderRadius: '12px'
                                }}
                            />
                            {galleryImages[lightboxIndex]?.caption && (
                                <div style={{
                                    position: 'absolute',
                                    bottom: '40px',
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    background: 'rgba(0,0,0,0.7)',
                                    backdropFilter: 'blur(10px)',
                                    color: 'white',
                                    padding: '12px 24px',
                                    borderRadius: '12px',
                                    fontSize: '15px',
                                    fontWeight: '500'
                                }}>
                                    {galleryImages[lightboxIndex].caption}
                                </div>
                            )}
                            <div style={{
                                position: 'absolute',
                                bottom: '80px',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                background: 'rgba(0,0,0,0.5)',
                                color: 'white',
                                padding: '8px 16px',
                                borderRadius: '20px',
                                fontSize: '13px',
                                fontWeight: '600'
                            }}>
                                {lightboxIndex + 1} / {galleryImages.length}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div >
    );
}

// Booking Panel Component
function BookingPanel({ pricePerHour, guestCount, setGuestCount, duration, setDuration, basePrice, totalPrice, onContinue, business }) {
    const durationOptions = business?.rental_duration_options || [4, 6, 8, 12, 24];

    return (
        <div style={{
            background: 'white',
            borderRadius: '24px',
            padding: '32px',
            boxShadow: '0 4px 24px rgba(0,0,0,0.06)'
        }}>
            <div style={{ marginBottom: '24px' }}>
                <div style={{ fontSize: '13px', color: '#64748B', marginBottom: '4px' }}>Desde</div>
                <div>
                    <span style={{ fontSize: '32px', fontWeight: '900', color: '#1a1a1a' }}>
                        ${pricePerHour.toLocaleString()}
                    </span>
                    <span style={{ fontSize: '16px', color: '#64748B', marginLeft: '4px' }}>/hora</span>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                {/* Guest Counter */}
                <div>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#64748B', marginBottom: '8px' }}>
                        Invitados
                    </div>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: '#F8F9FA',
                        borderRadius: '12px',
                        padding: '12px'
                    }}>
                        <button
                            onClick={() => setGuestCount(Math.max(1, guestCount - 5))}
                            style={{
                                background: 'white',
                                border: 'none',
                                width: '36px',
                                height: '36px',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontSize: '18px',
                                fontWeight: '700',
                                color: '#1a1a1a'
                            }}
                        >
                            −
                        </button>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '24px', fontWeight: '900', color: '#1a1a1a' }}>
                                {guestCount}
                            </div>
                            <div style={{ fontSize: '11px', color: '#64748B' }}>personas</div>
                        </div>
                        <button
                            onClick={() => setGuestCount(guestCount + 5)}
                            style={{
                                background: 'white',
                                border: 'none',
                                width: '36px',
                                height: '36px',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontSize: '18px',
                                fontWeight: '700',
                                color: '#1a1a1a'
                            }}
                        >
                            +
                        </button>
                    </div>
                </div>

                {/* Duration Selector */}
                <div>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#64748B', marginBottom: '8px' }}>
                        Duración
                    </div>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: '#F8F9FA',
                        borderRadius: '12px',
                        padding: '12px'
                    }}>
                        <button
                            onClick={() => {
                                const currentIdx = durationOptions.indexOf(duration);
                                if (currentIdx > 0) setDuration(durationOptions[currentIdx - 1]);
                            }}
                            disabled={durationOptions.indexOf(duration) === 0}
                            style={{
                                background: 'white',
                                border: 'none',
                                width: '36px',
                                height: '36px',
                                borderRadius: '8px',
                                cursor: durationOptions.indexOf(duration) === 0 ? 'not-allowed' : 'pointer',
                                fontSize: '18px',
                                fontWeight: '700',
                                color: '#1a1a1a',
                                opacity: durationOptions.indexOf(duration) === 0 ? 0.3 : 1
                            }}
                        >
                            −
                        </button>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '24px', fontWeight: '900', color: '#1a1a1a' }}>
                                {duration}
                            </div>
                            <div style={{ fontSize: '11px', color: '#64748B' }}>horas</div>
                        </div>
                        <button
                            onClick={() => {
                                const currentIdx = durationOptions.indexOf(duration);
                                if (currentIdx < durationOptions.length - 1) setDuration(durationOptions[currentIdx + 1]);
                            }}
                            disabled={durationOptions.indexOf(duration) === durationOptions.length - 1}
                            style={{
                                background: 'white',
                                border: 'none',
                                width: '36px',
                                height: '36px',
                                borderRadius: '8px',
                                cursor: durationOptions.indexOf(duration) === durationOptions.length - 1 ? 'not-allowed' : 'pointer',
                                fontSize: '18px',
                                fontWeight: '700',
                                color: '#1a1a1a',
                                opacity: durationOptions.indexOf(duration) === durationOptions.length - 1 ? 0.3 : 1
                            }}
                        >
                            +
                        </button>
                    </div>
                </div>
            </div>

            {/* Price Breakdown */}
            <div style={{
                background: '#F8F9FA',
                borderRadius: '16px',
                padding: '20px',
                marginBottom: '24px'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <span style={{ fontSize: '14px', color: '#64748B' }}>Precio por hora</span>
                    <span style={{ fontSize: '14px', fontWeight: '600', color: '#1a1a1a' }}>
                        ${pricePerHour.toLocaleString()}
                    </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <span style={{ fontSize: '14px', color: '#64748B' }}>Duración ({duration} horas)</span>
                    <span style={{ fontSize: '14px', fontWeight: '600', color: '#1a1a1a' }}>
                        ×{duration}
                    </span>
                </div>
                <div style={{
                    borderTop: '2px solid #E5E7EB',
                    paddingTop: '12px',
                    display: 'flex',
                    justifyContent: 'space-between'
                }}>
                    <span style={{ fontSize: '15px', fontWeight: '700', color: '#1a1a1a' }}>Total</span>
                    <span style={{ fontSize: '18px', fontWeight: '900', color: '#84CC16' }}>
                        ${totalPrice.toLocaleString()}
                    </span>
                </div>
            </div>

            <button
                onClick={onContinue}
                style={{
                    width: '100%',
                    padding: '16px',
                    background: '#84CC16',
                    color: 'white',
                    border: 'none',
                    borderRadius: '14px',
                    fontSize: '16px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    marginBottom: '12px'
                }}
            >
                Continuar
            </button>
            <div style={{ textAlign: 'center', fontSize: '13px', color: '#64748B' }}>
                No se realizará ningún cargo todavía
            </div>
        </div>
    );
}

// Helper function to get amenity icons
function getAmenityIcon(amenity) {
    const icons = {
        'wifi': '📶',
        'piscina': '🏊',
        'parking': '🚗',
        'aire acondicionado': '❄️',
        'a/c': '❄️',
        'parrilla': '🔥',
        'sonido': '🔊',
        'cocina': '🍳',
        'baño': '🚿',
        'jardin': '🌳',
        'quincho': '🏡'
    };

    const key = amenity.toLowerCase();
    for (const [keyword, icon] of Object.entries(icons)) {
        if (key.includes(keyword)) return icon;
    }
    return '✨';
}
