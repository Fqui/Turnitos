import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';
import serviceAdapter from '../services/serviceAdapter';
import { useNotification } from '../contexts/NotificationContext';
import SEOHead from '../components/SEOHead';
import AmenityIcon, { parseAmenity } from '../components/common/AmenityIcon';
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
    const [venueBookings, setVenueBookings] = useState([]);
    const [showBookingModal, setShowBookingModal] = useState(false);
    const [bookingStep, setBookingStep] = useState(1);
    const [showLightbox, setShowLightbox] = useState(false);
    const [lightboxIndex, setLightboxIndex] = useState(0);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [showServicesExpanded, setShowServicesExpanded] = useState(false);
    const [showAllAmenities, setShowAllAmenities] = useState(false);
    const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
    const [windowWidth, setWindowWidth] = useState(window.innerWidth);
    const calendarRef = useRef(null);

    const scrollToCalendar = () => {
        calendarRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };

    useEffect(() => {
        const handleResize = () => setWindowWidth(window.innerWidth);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const refreshDataSilently = async (bId) => {
        if (!bId) return;
        try {
            // 1. Refresh bookings list
            const res = await serviceAdapter.getBookings(bId);
            const list = Array.isArray(res) ? res : (res && Array.isArray(res.bookings) ? res.bookings : []);
            setVenueBookings(list);

            // 2. Refresh business details (including blocked_dates) silently without setting loading state
            const freshBiz = await serviceAdapter.getBusinessById(bId);
            if (freshBiz) {
                setBusiness(prev => ({
                    ...(prev || {}),
                    ...freshBiz,
                    blocked_dates: freshBiz.blocked_dates || freshBiz.metadata?.blocked_dates || [],
                    metadata: {
                        ...(prev?.metadata || {}),
                        ...(freshBiz.metadata || {}),
                        blocked_dates: freshBiz.blocked_dates || freshBiz.metadata?.blocked_dates || []
                    }
                }));
            }
        } catch (err) {
            console.error('Silent refresh error in VenueProfile:', err);
        }
    };

    useEffect(() => {
        if (initialBusiness) {
            setBusiness(initialBusiness);
            setLoading(false);
        } else if (!business && slug) {
            fetchBusiness();
        }
    }, [initialBusiness, slug]);

    useEffect(() => {
        if (!business?.id) return;
        const bId = business.id;
        
        // Initial silent fetch
        refreshDataSilently(bId);

        // 🔴 LIVE REALTIME SYNCHRONIZATION: Bookings
        const bookingsSub = serviceAdapter.subscribeToBookings(bId, () => {
            refreshDataSilently(bId);
        });

        // 🔴 LIVE REALTIME SYNCHRONIZATION: Business Settings / Blocked Dates
        const bizSub = serviceAdapter.subscribeToBusiness(bId, () => {
            refreshDataSilently(bId);
        });

        // 🔄 Polling fallback every 5 seconds in background
        const interval = setInterval(() => {
            refreshDataSilently(bId);
        }, 5000);

        return () => {
            if (bookingsSub && bookingsSub.unsubscribe) bookingsSub.unsubscribe();
            if (bizSub && bizSub.unsubscribe) bizSub.unsubscribe();
            clearInterval(interval);
        };
    }, [business?.id]);

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

    // Get gallery images with captions and featured photo from database
    const getGalleryImages = () => {
        if (!business) return [];

        let metadataObj = business.metadata;
        if (typeof metadataObj === 'string') {
            try { metadataObj = JSON.parse(metadataObj); } catch (e) { }
        }

        let galleryArr = business.gallery_images;
        if (typeof galleryArr === 'string') {
            try { galleryArr = JSON.parse(galleryArr); } catch (e) { }
        }

        let images = [];
        if (metadataObj?.venue_gallery && Array.isArray(metadataObj.venue_gallery) && metadataObj.venue_gallery.length > 0) {
            images = metadataObj.venue_gallery.map(img => typeof img === 'string' ? { url: img, caption: '', category: 'General' } : { ...img });
        } else if (galleryArr && Array.isArray(galleryArr) && galleryArr.length > 0) {
            images = galleryArr.map(url => (typeof url === 'string' ? { url, caption: '', category: 'General' } : (typeof url === 'object' && url !== null ? { ...url } : { url: String(url), caption: '', category: 'General' })));
        }

        // Sort so featured photo is at index 0
        const featuredIndex = images.findIndex(img => img.is_featured || img.featured);
        if (featuredIndex > 0) {
            const [featuredItem] = images.splice(featuredIndex, 1);
            images.unshift(featuredItem);
        }

        return images;
    };

    const maxCapacity = Number(business?.capacity_limit || business?.metadata?.capacity_limit || (business?.max_capacity && business.max_capacity > 1 ? business.max_capacity : null) || 100);

    useEffect(() => {
        if (business) {
            const maxCap = Number(business.capacity_limit || business.metadata?.capacity_limit || (business.max_capacity && business.max_capacity > 1 ? business.max_capacity : null) || 100);
            const halfCap = Math.max(5, Math.min(maxCap, Math.round((maxCap / 2) / 5) * 5));
            setGuestCount(halfCap);

            const options = business.rental_duration_options || [4, 6, 8, 12, 24];
            if (options && options.length > 0) {
                setDuration(options[0]);
            }
        }
    }, [business]);

    // Sync root CSS variables with business theme
    useEffect(() => {
        if (business) {
            const root = document.documentElement;
            const color = business.primary_color || business.button_color || business.buttonColor || '#84CC16';
            root.style.setProperty('--primary-paddle', color);

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

    // Calculate price based on guest count and pricing tiers
    const calculatePrice = () => {
        const tiers = (business?.pricing_tiers && business.pricing_tiers.length > 0)
            ? business.pricing_tiers
            : (business?.metadata?.pricing_tiers && business.metadata.pricing_tiers.length > 0)
                ? business.metadata.pricing_tiers
                : [];

        if (tiers.length === 0) {
            return Number(business?.price_per_hour || business?.price || 20000);
        }

        const tier = tiers.find(t => {
            const minG = Number(t.min_guests !== undefined ? t.min_guests : t.min !== undefined ? t.min : 0);
            const maxG = Number(t.max_guests !== undefined ? t.max_guests : t.max !== undefined ? t.max : 999);
            return guestCount >= minG && guestCount <= maxG;
        });

        if (tier && tier.price !== undefined) {
            return Number(tier.price);
        }
        return Number(tiers[0]?.price || business?.price_per_hour || 20000);
    };

    const pricePerHour = calculatePrice();
    const durationDiscounts = business?.duration_discounts || business?.metadata?.duration_discounts || {};
    const durationDiscountPct = Number(durationDiscounts[duration] || 0);

    const rawBasePrice = pricePerHour * duration;
    const durationDiscountAmount = durationDiscountPct > 0 ? Math.round(rawBasePrice * (durationDiscountPct / 100)) : 0;
    const basePrice = rawBasePrice - durationDiscountAmount;
    const servicesTotal = selectedServices.reduce((sum, service) => sum + service.price, 0);
    const totalPrice = basePrice + servicesTotal;

    // Toggle service selection
    const toggleService = (service) => {
        setSelectedServices(prev => {
            const isSame = (s) => (s.id && service.id) ? s.id === service.id : s.name === service.name;
            const exists = prev.some(isSame);
            if (exists) {
                return prev.filter(s => !isSame(s));
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

    const formatDateStr = (d) => {
        if (!d) return '';
        if (d instanceof Date) {
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        }
        if (typeof d === 'string') {
            const clean = d.trim();
            if (clean.includes('/')) {
                const parts = clean.split('/');
                if (parts.length === 3) {
                    const day = parts[0].padStart(2, '0');
                    const month = parts[1].padStart(2, '0');
                    const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
                    return `${year}-${month}-${day}`;
                }
            }
            if (clean.includes('-')) {
                const datePart = clean.split('T')[0];
                const parts = datePart.split('-');
                if (parts.length === 3) {
                    const year = parts[0];
                    const month = parts[1].padStart(2, '0');
                    const day = parts[2].padStart(2, '0');
                    return `${year}-${month}-${day}`;
                }
            }
        }
        return '';
    };

    const isDateBlocked = (date) => {
        if (!date) return false;
        const dateStr = formatDateStr(date);

        // 1. Check owner blocked dates
        const blockedList = [
            ...(business?.blocked_dates || []),
            ...(business?.metadata?.blocked_dates || [])
        ];
        const isOwnerBlocked = blockedList.some(b => {
            const bStr = typeof b === 'string' ? b : (b?.date || '');
            return formatDateStr(bStr) === dateStr;
        });
        if (isOwnerBlocked) return true;

        // 2. Check confirmed client bookings or blocks in bookings list
        const bookingsList = venueBookings.length > 0 ? venueBookings : (business?.bookings || []);
        const isBooked = bookingsList.some(b => {
            if (b.status === 'cancelled' || b.status === 'rejected') return false;
            const bStr = formatDateStr(b.date || b.start_time || b.created_at);
            return bStr === dateStr;
        });

        return isBooked;
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
                businessId: business.id,
                business_id: business.id,
                date: selectedDate,
                time: '00:00',
                duration: duration * 60, // Venue duration in minutes
                price: totalPrice,
                guestCount: guestCount,
                guest_count: guestCount,
                selectedServices: selectedServices,
                selected_services: selectedServices,
                servicesTotal: servicesTotal,
                services_total: servicesTotal,
                basePrice: basePrice,
                base_price: basePrice,
                totalPrice: totalPrice,
                total_price: totalPrice,
                customerName: bookingDetails.customerName,
                customer_name: bookingDetails.customerName,
                customerPhone: bookingDetails.customerPhone,
                customer_phone: bookingDetails.customerPhone,
                customerEmail: bookingDetails.customerEmail,
                customer_email: bookingDetails.customerEmail,
                notes: bookingDetails.notes,
                status: 'pending'
            };

            await serviceAdapter.createBooking(bookingData);

            // Notify business owner devices
            pushService.notifyBusinessNewBooking(business.id, {
                customerName: bookingDetails.customerName,
                date: bookingDetails.date,
                businessName: business.name
            });

            setShowBookingModal(false);
            await showAlert('¡Reserva Confirmada!', 'Tu reserva ha sido creada exitosamente. Te contactaremos pronto para confirmar los detalles.', 'success', 'Aceptar');
            navigate('/');
        } catch (error) {
            console.error('Error creating booking:', error);
            if (error.message && error.message.includes('cupo mensual')) {
                showAlert(
                    'Cupo Mensual Completado',
                    'Este negocio ha completado su cupo mensual de turnos online. Por favor, contactalo directamente por WhatsApp para coordinar tu lugar.',
                    'warning',
                    'Entendido'
                );
            } else {
                showAlert('Error', error.message || 'No pudimos procesar tu reserva. Por favor intenta nuevamente.', 'error', 'Reintentar');
            }
        }
    };

    // Get icon for amenity
    const getAmenityIcon = (amenity) => {
        const parsed = parseAmenity(amenity);
        if (parsed.icon) return parsed.icon;
        const name = parsed.name;
        const icons = {
            'Piscina': 'Waves',
            'Parrilla': 'Flame',
            'Parrilla / Asador': 'Flame',
            'WiFi': 'Wifi',
            'WiFi Libre': 'Wifi',
            'Aire Acondicionado': 'Snowflake',
            'Parking': 'Car',
            'Estacionamiento Privado': 'Car',
            'Sonido': 'Speaker',
            'Equipo de Sonido': 'Speaker',
            'Cocina Equipada': 'ChefHat',
            'Baños Completos': 'ShowerHead',
            'Baños Privados': 'ShowerHead',
            'Jardín': 'Trees',
            'Amplio Jardín / Parque': 'Trees',
            'Quincho Cubierto': 'House',
            'Zona de Juegos': 'Gamepad2',
            'Iluminación LED': 'Lightbulb',
            'Televisor': 'Tv',
            'Televisor / Pantalla': 'Tv',
            'Mesa de Pool': '🎱',
            'Metegol': '⚽',
            'Ping Pong': '🏓',
            'Freezer': 'Refrigerator',
            'Freezer / Heladeras': 'Refrigerator',
            'Juegos Infantiles': 'Baby',
            'Living / Sillones': 'Armchair',
            'Predio Cerrado': 'Lock',
            'Seguridad Privada': 'ShieldCheck'
        };
        return icons[name] || 'Sparkles';
    };

    const primaryColor = business?.primary_color || business?.button_color || business?.buttonColor || '#84CC16';
    const isDark = (business?.theme || business?.metadata?.theme) === 'dark';
    const pageBg = isDark ? '#121212' : '#F5F7FA';
    const cardBg = isDark ? '#1E1E1E' : '#FFFFFF';
    const textColor = isDark ? '#FFFFFF' : '#1A1A1A';
    const secondaryTextColor = isDark ? '#A0A0A0' : '#4A4A4A';
    const borderColor = isDark ? '#333333' : '#E0E0E0';
    const subCardBg = isDark ? '#2A2A2A' : '#F8F9FA';
    const btnBg = isDark ? '#333333' : '#FFFFFF';
    const galleryImages = getGalleryImages();
    const amenities = business?.amenities || [];
    const additionalServices = business?.additional_services || [];
    const daysInMonth = getDaysInMonth(currentMonth);
    const durationOptions = business?.rental_duration_options || [4, 6, 8, 12, 24];

    // SEO: Schema.org EventVenue Structured Data
    const venueSchema = useMemo(() => {
        if (!business) return null;
        const ratingVal = Number(business.rating_avg || business.rating || business.metadata?.rating_avg || 5.0);
        const reviewsNum = Number(business.reviews_count || business.metadata?.reviews_count || 1);

        const schemaObj = {
            '@context': 'https://schema.org',
            '@type': 'EventVenue',
            'name': business.name,
            'image': business.banner_image || business.banner_url || business.logo || 'https://www.turnitoslr.com/logo-turnitos.png',
            'url': `https://www.turnitoslr.com/${business.slug || ''}`,
            'telephone': business.whatsapp ? `+54${business.whatsapp}` : undefined,
            'priceRange': '$$',
            'maximumAttendeeCapacity': business.max_capacity || business.capacity || 100,
            'address': {
                '@type': 'PostalAddress',
                'addressLocality': business.location || 'La Rioja',
                'addressRegion': 'La Rioja',
                'addressCountry': 'AR'
            }
        };

        if (business.latitude && business.longitude) {
            schemaObj.geo = {
                '@type': 'GeoCoordinates',
                'latitude': Number(business.latitude),
                'longitude': Number(business.longitude)
            };
        }

        if (ratingVal && reviewsNum > 0) {
            schemaObj.aggregateRating = {
                '@type': 'AggregateRating',
                'ratingValue': ratingVal.toFixed(1),
                'reviewCount': reviewsNum,
                'bestRating': '5',
                'worstRating': '1'
            };
        }

        return schemaObj;
    }, [business]);

    const pageTitle = business
        ? `${business.name} - Alquiler de Quincho y Eventos en ${business.location || 'La Rioja'}`
        : 'TurnitosLR';
    const pageDescription = business
        ? `Alquilá ${business.name} en ${business.location || 'La Rioja'}. Consultá disponibilidad, precios por hora o por día y reservá online.`
        : 'Alquiler de quinchos y salones en La Rioja con TurnitosLR.';
    const pageImage = business?.banner_image || business?.banner_url || business?.logo || 'https://www.turnitoslr.com/logo-turnitos.png';

    return (
        <div style={{ background: pageBg, color: textColor, minHeight: '100vh', width: '100%', overflowX: 'clip', transition: 'background 0.3s' }}>
            <SEOHead
                title={pageTitle}
                description={pageDescription}
                keywords={`${business?.name}, alquiler quincho ${business?.name}, eventos la rioja, quinchos la rioja, turnitos`}
                image={pageImage}
                url={`https://www.turnitoslr.com/${business?.slug || ''}`}
                schema={venueSchema}
            />
            {/* Hero Section */}
            <div style={{
                position: 'relative',
                height: '50vh',
                minHeight: '400px',
                background: 'linear-gradient(135deg, #2D3748 0%, #1A202C 100%)',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'flex-end'
            }}>
                <img
                    src={business.banner_image || business.banner_url || business.image || galleryImages[0]?.url || 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&q=80&w=1200'}
                    alt={business.name}
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        opacity: 0.8
                    }}
                />
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.85) 100%)'
                }} />
                {/* Content Container */}
                <div style={{
                    position: 'relative',
                    zIndex: 2,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'flex-end',
                    padding: windowWidth < 768 ? '24px 16px' : '36px 32px',
                    color: 'white',
                    maxWidth: '1400px',
                    width: '100%',
                    margin: '0 auto'
                }}>
                    <h1 style={{
                        fontSize: windowWidth < 768 ? '36px' : '56px',
                        fontWeight: '900',
                        marginBottom: '8px',
                        lineHeight: '1.1',
                        textShadow: '0 4px 12px rgba(0,0,0,0.3)'
                    }}>
                        {business.name}
                    </h1>

                    {/* Address / Location */}
                    {(() => {
                        const fullAddress = [business.address, business.city || business.location].filter(Boolean).join(', ');
                        if (!fullAddress) return null;
                        return (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px', fontWeight: '500', opacity: 0.9 }}>
                                <span>📍</span>
                                <span>{fullAddress}</span>
                            </div>
                        );
                    })()}

                    {/* Social Media Links */}
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '14px', flexWrap: 'wrap' }}>
                        {(business.whatsapp || business.phone) && (
                            <a
                                href={`https://wa.me/${(business.whatsapp || business.phone).replace(/\D/g, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                    width: '38px',
                                    height: '38px',
                                    borderRadius: '50%',
                                    background: '#25D366',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'white',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                                    transition: 'transform 0.2s'
                                }}
                                title="WhatsApp"
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                                </svg>
                            </a>
                        )}

                        {business.instagram && (
                            <a
                                href={business.instagram.startsWith('http') ? business.instagram : `https://instagram.com/${business.instagram.replace('@', '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                    width: '38px',
                                    height: '38px',
                                    borderRadius: '50%',
                                    background: 'linear-gradient(45deg, #f09433 0%,#e6683c 25%,#dc2743 50%,#cc2366 75%,#bc1888 100%)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'white',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                                    transition: 'transform 0.2s'
                                }}
                                title="Instagram"
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                                </svg>
                            </a>
                        )}

                        {business.facebook && (
                            <a
                                href={business.facebook.startsWith('http') ? business.facebook : `https://facebook.com/${business.facebook}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                    width: '38px',
                                    height: '38px',
                                    borderRadius: '50%',
                                    background: '#1877F2',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'white',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                                    transition: 'transform 0.2s'
                                }}
                                title="Facebook"
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                                </svg>
                            </a>
                        )}
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
                alignItems: 'start',
                position: 'relative',
                zIndex: 10,
                marginTop: windowWidth < 768 ? '20px' : '32px'
            }}>
                {/* Left Column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {/* Gallery Section */}
                    {galleryImages.length > 0 && (
                        <div style={{
                            background: cardBg,
                            borderRadius: '24px',
                            padding: windowWidth < 768 ? '16px' : '32px',
                            boxShadow: isDark ? '0 4px 24px rgba(0,0,0,0.3)' : '0 4px 24px rgba(0,0,0,0.06)',
                            border: `1px solid ${borderColor}`
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <h2 style={{ fontSize: '20px', fontWeight: '700', color: textColor }}>Galería</h2>
                                <button
                                    onClick={() => { setLightboxIndex(0); setShowLightbox(true); }}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: primaryColor,
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
                                gridTemplateColumns: windowWidth < 768 ? '1fr' : (galleryImages.length > 1 ? '1fr 1fr' : '1fr'),
                                gap: '12px'
                            }}>
                                {/* Main Cover Photo */}
                                <div
                                    onClick={() => { setLightboxIndex(0); setShowLightbox(true); }}
                                    style={{
                                        position: 'relative',
                                        borderRadius: '20px',
                                        overflow: 'hidden',
                                        cursor: 'pointer',
                                        height: windowWidth < 768 ? '240px' : '380px',
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

                                {/* Secondary Grid Thumbnails */}
                                {galleryImages.length > 1 && (() => {
                                    const maxThumbnails = 4;
                                    const visibleThumbnails = galleryImages.slice(1, 1 + maxThumbnails);
                                    const remainingCount = galleryImages.length - (1 + visibleThumbnails.length);

                                    return (
                                        <div style={{
                                            display: 'grid',
                                            gridTemplateColumns: visibleThumbnails.length === 1 ? '1fr' : '1fr 1fr',
                                            gridTemplateRows: visibleThumbnails.length <= 2 ? `repeat(${visibleThumbnails.length}, 1fr)` : '1fr 1fr',
                                            gap: '12px',
                                            height: windowWidth < 768 ? '240px' : '380px'
                                        }}>
                                            {visibleThumbnails.map((img, idx) => {
                                                const actualIndex = idx + 1;
                                                const isLastSlot = idx === visibleThumbnails.length - 1;
                                                const showRemaining = isLastSlot && remainingCount > 0;

                                                return (
                                                    <div
                                                        key={idx}
                                                        onClick={() => { setLightboxIndex(actualIndex); setShowLightbox(true); }}
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
                                                            alt={img.caption || `Imagen ${actualIndex + 1}`}
                                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                        />
                                                        {img.caption && !showRemaining && (
                                                            <div style={{
                                                                position: 'absolute',
                                                                bottom: '8px',
                                                                left: '8px',
                                                                background: 'rgba(0,0,0,0.6)',
                                                                backdropFilter: 'blur(4px)',
                                                                color: 'white',
                                                                padding: '4px 10px',
                                                                borderRadius: '8px',
                                                                fontSize: '11px',
                                                                fontWeight: '600',
                                                                maxWidth: '90%',
                                                                whiteSpace: 'nowrap',
                                                                overflow: 'hidden',
                                                                textOverflow: 'ellipsis'
                                                            }}>
                                                                {img.caption}
                                                            </div>
                                                        )}
                                                        {showRemaining && (
                                                            <div style={{
                                                                position: 'absolute',
                                                                inset: 0,
                                                                background: 'rgba(0,0,0,0.65)',
                                                                backdropFilter: 'blur(4px)',
                                                                display: 'flex',
                                                                flexDirection: 'column',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                color: 'white',
                                                                gap: '4px'
                                                            }}>
                                                                <span style={{ fontSize: '22px', fontWeight: '800' }}>
                                                                    +{remainingCount}
                                                                </span>
                                                                <span style={{ fontSize: '11px', fontWeight: '600', opacity: 0.9 }}>
                                                                    más fotos
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>
                    )}

                    {/* Amenities Section */}
                    {amenities.length > 0 && (
                        <div style={{
                            background: cardBg,
                            borderRadius: '24px',
                            padding: windowWidth < 768 ? '16px' : '28px',
                            boxShadow: isDark ? '0 4px 24px rgba(0,0,0,0.3)' : '0 4px 24px rgba(0,0,0,0.06)',
                            border: `1px solid ${borderColor}`
                        }}>
                            <h2 style={{ fontSize: windowWidth < 768 ? '17px' : '20px', fontWeight: '700', color: textColor, marginBottom: windowWidth < 768 ? '14px' : '20px', textAlign: windowWidth < 768 ? 'center' : 'left' }}>
                                Comodidades
                            </h2>
                            {/* Airbnb-style clean 2-column grid on mobile / multi-column on desktop */}
                            {(() => {
                                const limit = windowWidth < 768 ? 6 : 8;
                                const displayed = showAllAmenities ? amenities : amenities.slice(0, limit);
                                const hasMore = amenities.length > limit;

                                return (
                                    <div>
                                        <div style={{
                                            display: 'grid',
                                            gridTemplateColumns: windowWidth < 768 ? 'repeat(2, minmax(0, 1fr))' : 'repeat(auto-fill, minmax(180px, 1fr))',
                                            gap: windowWidth < 768 ? '8px' : '12px'
                                        }}>
                                            {displayed.map((amenity, idx) => {
                                                const parsed = parseAmenity(amenity);
                                                const name = parsed.name;
                                                const icon = parsed.icon || getAmenityIcon(amenity);
                                                return (
                                                    <div
                                                        key={idx}
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '10px',
                                                            padding: windowWidth < 768 ? '10px 12px' : '12px 16px',
                                                            background: subCardBg,
                                                            borderRadius: '14px',
                                                            border: `1px solid ${borderColor}`,
                                                            fontSize: windowWidth < 768 ? '12px' : '13px',
                                                            fontWeight: '600',
                                                            color: textColor,
                                                            minHeight: '44px',
                                                            boxSizing: 'border-box'
                                                        }}
                                                    >
                                                        <div style={{
                                                            width: '28px',
                                                            height: '28px',
                                                            borderRadius: '8px',
                                                            background: 'rgba(132, 204, 22, 0.12)',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            color: primaryColor,
                                                            flexShrink: 0
                                                        }}>
                                                            <AmenityIcon icon={icon} size={16} />
                                                        </div>
                                                        <span style={{
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                            whiteSpace: 'nowrap',
                                                            flex: 1
                                                        }}>
                                                            {name}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {hasMore && (
                                            <button
                                                type="button"
                                                onClick={() => setShowAllAmenities(!showAllAmenities)}
                                                style={{
                                                    width: '100%',
                                                    marginTop: '12px',
                                                    padding: '11px 16px',
                                                    borderRadius: '14px',
                                                    border: `1px solid ${borderColor}`,
                                                    background: subCardBg,
                                                    color: textColor,
                                                    fontSize: '13px',
                                                    fontWeight: '700',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '8px',
                                                    transition: 'all 0.2s ease'
                                                }}
                                            >
                                                <span>
                                                    {showAllAmenities
                                                        ? '▲ Mostrar menos'
                                                        : `▼ Ver todas las comodidades (${amenities.length})`}
                                                </span>
                                            </button>
                                        )}
                                    </div>
                                );
                            })()}
                        </div>
                    )}

                    {/* Additional Services Section */}
                    {additionalServices.length > 0 && (
                        <div style={{
                            background: cardBg,
                            borderRadius: '24px',
                            overflow: 'hidden',
                            boxShadow: isDark ? '0 4px 24px rgba(0,0,0,0.3)' : '0 4px 24px rgba(0,0,0,0.06)',
                            border: `1px solid ${borderColor}`
                        }}>
                            <div
                                onClick={() => setShowServicesExpanded(!showServicesExpanded)}
                                style={{
                                    padding: windowWidth < 768 ? '16px' : '32px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    transition: 'background 0.2s'
                                }}
                            >
                                <div>
                                    <h2 style={{ fontSize: '20px', fontWeight: '700', color: textColor }}>
                                        Servicios Adicionales
                                    </h2>
                                    <p style={{ fontSize: '13px', color: secondaryTextColor, fontWeight: '500', marginTop: '4px' }}>
                                        Personaliza tu experiencia
                                    </p>
                                </div>
                                <div style={{
                                    fontSize: '24px',
                                    color: primaryColor,
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
                                <div style={{ padding: windowWidth < 768 ? '0 16px 16px 16px' : '0 32px 32px 32px', display: 'grid', gap: '12px' }}>
                                    {additionalServices.map((service, idx) => (
                                        <div
                                            key={idx}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'flex-start',
                                                gap: '14px',
                                                padding: '16px',
                                                background: subCardBg,
                                                borderRadius: '16px',
                                                border: `1px solid ${borderColor}`,
                                                cursor: 'default',
                                                userSelect: 'none'
                                            }}
                                        >
                                            <div style={{
                                                width: '46px',
                                                height: '46px',
                                                background: btnBg,
                                                borderRadius: '12px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: '22px',
                                                flexShrink: 0,
                                                boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
                                            }}>
                                                {service.icon || '✨'}
                                            </div>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontSize: '15px', fontWeight: '700', color: textColor, lineHeight: '1.3' }}>
                                                    {service.name}
                                                </div>
                                                {service.description && (
                                                    <div style={{ fontSize: '13px', color: secondaryTextColor, marginTop: '4px', lineHeight: '1.4' }}>
                                                        {service.description}
                                                    </div>
                                                )}
                                                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                                                    <div style={{
                                                        fontSize: '14px',
                                                        fontWeight: '800',
                                                        color: primaryColor,
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                                                        padding: '4px 10px',
                                                        borderRadius: '8px'
                                                    }}>
                                                        +${Number(service.price).toLocaleString()}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Calendar Section */}
                    <div ref={calendarRef} style={{
                        background: cardBg,
                        borderRadius: '24px',
                        padding: windowWidth < 768 ? '16px' : '32px',
                        boxShadow: isDark ? '0 4px 24px rgba(0,0,0,0.3)' : '0 4px 24px rgba(0,0,0,0.06)',
                        border: `1px solid ${borderColor}`
                    }}>
                        <h2 style={{ fontSize: '20px', fontWeight: '700', color: textColor, marginBottom: '20px' }}>
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
                                    background: subCardBg,
                                    border: 'none',
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '12px',
                                    cursor: 'pointer',
                                    fontSize: '20px',
                                    fontWeight: '700',
                                    color: textColor
                                }}
                            >
                                ‹
                            </button>
                            <div style={{ fontSize: '16px', fontWeight: '700', color: textColor }}>
                                {currentMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
                            </div>
                            <button
                                onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                                style={{
                                    background: subCardBg,
                                    border: 'none',
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '12px',
                                    cursor: 'pointer',
                                    fontSize: '20px',
                                    fontWeight: '700',
                                    color: textColor
                                }}
                            >
                                ›
                            </button>
                        </div>
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(7, 1fr)',
                            gap: windowWidth < 768 ? '4px' : '8px'
                        }}>
                            {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(day => (
                                <div key={day} style={{
                                    textAlign: 'center',
                                    fontSize: windowWidth < 768 ? '11px' : '12px',
                                    fontWeight: '700',
                                    color: secondaryTextColor,
                                    padding: windowWidth < 768 ? '4px 2px' : '8px'
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
                                            padding: windowWidth < 768 ? '8px 2px' : '12px',
                                            borderRadius: '12px',
                                            background: isSelected ? primaryColor : isBlocked ? (isDark ? 'rgba(239, 68, 68, 0.2)' : '#FEE2E2') : isPast ? subCardBg : btnBg,

                                            color: isSelected ? 'white' : isBlocked ? (isDark ? '#EF4444' : '#DC2626') : isDisabled ? '#CBD5E1' : textColor,
                                            fontSize: windowWidth < 768 ? '13px' : '14px',
                                            fontWeight: isSelected ? '700' : '500',
                                            cursor: isDisabled ? 'not-allowed' : 'pointer',
                                            transition: 'all 0.2s',
                                            border: isSelected ? 'none' : `1px solid ${borderColor}`
                                        }}
                                    >
                                        {date.getDate()}
                                    </button>
                                );
                            })}
                        </div>

                        {selectedDate && windowWidth <= 1200 && (
                            <div style={{ marginTop: '24px', animation: 'fadeIn 0.3s ease' }}>
                                <button
                                    onClick={handleContinue}
                                    style={{
                                        width: '100%',
                                        padding: '16px',
                                        background: primaryColor,
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '16px',
                                        fontSize: '16px',
                                        fontWeight: '700',
                                        cursor: 'pointer',
                                        boxShadow: '0 4px 14px rgba(0, 0, 0, 0.15)',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center'
                                    }}
                                >
                                    <span>Continuar</span>
                                    <span>→</span>
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Sobre el Espacio Section (Right above Map) */}
                    {(() => {
                        const fullDesc = business.metadata?.full_description || business.full_description || business.description;
                        if (!fullDesc || !fullDesc.trim()) return null;

                        const isLong = fullDesc.length > 250 || fullDesc.split('\n').length > 3;

                        return (
                            <div style={{
                                background: cardBg,
                                borderRadius: '24px',
                                padding: windowWidth < 768 ? '20px 16px' : '28px 32px',
                                boxShadow: isDark ? '0 4px 24px rgba(0,0,0,0.3)' : '0 4px 24px rgba(0,0,0,0.06)',
                                border: `1px solid ${borderColor}`
                            }}>
                                <h2 style={{ fontSize: '20px', fontWeight: '700', color: textColor, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span>📖</span>
                                    <span>Sobre el Espacio</span>
                                </h2>
                                <div style={{ position: 'relative' }}>
                                    <div style={{
                                        fontSize: '15px',
                                        lineHeight: '1.7',
                                        color: secondaryTextColor,
                                        whiteSpace: 'pre-line',
                                        maxHeight: (!isDescriptionExpanded && isLong) ? '110px' : 'none',
                                        overflow: 'hidden',
                                        transition: 'max-height 0.3s ease'
                                    }}>
                                        {fullDesc}
                                    </div>

                                    {!isDescriptionExpanded && isLong && (
                                        <div style={{
                                            position: 'absolute',
                                            bottom: 0,
                                            left: 0,
                                            right: 0,
                                            height: '60px',
                                            background: isDark
                                                ? 'linear-gradient(to bottom, transparent, #1E293B)'
                                                : 'linear-gradient(to bottom, transparent, white)',
                                            pointerEvents: 'none'
                                        }} />
                                    )}
                                </div>

                                {isLong && (
                                    <button
                                        onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            color: primaryColor,
                                            fontSize: '14px',
                                            fontWeight: '700',
                                            marginTop: '12px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            padding: '4px 0'
                                        }}
                                    >
                                        {isDescriptionExpanded ? 'Ver menos ↑' : 'Ver más ↓'}
                                    </button>
                                )}
                            </div>
                        );
                    })()}

                    {/* Map Section */}
                    {business.latitude && business.longitude && (
                        <div style={{
                            background: cardBg,
                            borderRadius: '24px',
                            padding: '32px',
                            boxShadow: isDark ? '0 4px 24px rgba(0,0,0,0.3)' : '0 4px 24px rgba(0,0,0,0.06)',
                            border: `1px solid ${borderColor}`
                        }}>
                            <h2 style={{ fontSize: '20px', fontWeight: '700', color: textColor, marginBottom: '16px' }}>
                                Ubicación
                            </h2>

                            {business.address && (
                                <div style={{ fontSize: '15px', color: secondaryTextColor, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                                        color: 'white',
                                        textDecoration: 'none',
                                        fontWeight: '700',
                                        fontSize: '14px',
                                        padding: '10px 20px',
                                        background: primaryColor,
                                        borderRadius: '50px',
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                                        border: '2px solid white',
                                        whiteSpace: 'nowrap'
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
                            top: '90px',
                            height: 'fit-content'
                        }}>
                            <BookingPanel
                                pricePerHour={pricePerHour}
                                guestCount={guestCount}
                                setGuestCount={setGuestCount}
                                duration={duration}
                                setDuration={setDuration}
                                rawBasePrice={rawBasePrice}
                                durationDiscountPct={durationDiscountPct}
                                durationDiscountAmount={durationDiscountAmount}
                                basePrice={basePrice}
                                totalPrice={totalPrice}
                                onContinue={handleContinue}
                                business={business}
                                selectedDate={selectedDate}
                                onSelectDateClick={scrollToCalendar}
                            />
                        </div>
                    )
                }
            </div>

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
                            initial={{ scale: 0.92, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.92, opacity: 0, y: 20 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            onClick={(e) => e.stopPropagation()}
                            style={{
                                background: cardBg,
                                borderRadius: '24px',
                                maxWidth: '500px',
                                width: '100%',
                                maxHeight: '90vh',
                                overflow: 'auto',
                                padding: '32px',
                                display: 'flex',
                                flexDirection: 'column',
                                boxShadow: '0 25px 60px rgba(0,0,0,0.3)'
                            }}
                        >
                            {/* Header & Steps Indicator */}
                            <div style={{ marginBottom: '24px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                    <motion.h2
                                        key={bookingStep}
                                        initial={{ opacity: 0, y: -6 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.2 }}
                                        style={{ fontSize: '24px', fontWeight: '900', margin: 0, color: textColor }}
                                    >
                                        {bookingStep === 1 && 'Detalles del Evento'}
                                        {bookingStep === 2 && 'Servicios Adicionales'}
                                        {bookingStep === 3 && 'Resumen de Reserva'}
                                        {bookingStep === 4 && 'Tus Datos de Contacto'}
                                    </motion.h2>
                                    <button
                                        onClick={() => setShowBookingModal(false)}
                                        style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: secondaryTextColor }}
                                    >
                                        ×
                                    </button>
                                </div>

                                {/* Progress Bar */}
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    {[1, 2, 3, 4].map(step => (
                                        <div key={step} style={{
                                            flex: 1,
                                            height: '5px',
                                            borderRadius: '3px',
                                            background: step <= bookingStep ? primaryColor : borderColor,
                                            transition: 'background 0.35s ease, transform 0.2s ease',
                                            transform: step === bookingStep ? 'scaleY(1.2)' : 'scaleY(1)'
                                        }} />
                                    ))}
                                </div>
                            </div>

                            {/* Animated Step Content */}
                            <AnimatePresence mode="wait">
                                {/* STEP 1: Configuration (Guests & Duration) */}
                                {bookingStep === 1 && (
                                    <motion.div
                                        key="step-1"
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        transition={{ duration: 0.22, ease: 'easeOut' }}
                                        style={{ flex: 1 }}
                                    >
                                        <p style={{ fontSize: '14px', color: secondaryTextColor, marginBottom: '24px' }}>
                                            Personalizá la cantidad de invitados y horas para tu reserva.
                                        </p>

                                        <div style={{ display: 'grid', gap: '24px' }}>
                                            {/* Guest Counter */}
                                            <div>
                                                <div style={{ fontSize: '14px', fontWeight: '700', color: textColor, marginBottom: '12px' }}>
                                                    Cantidad de Invitados
                                                </div>
                                                <div style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    background: subCardBg,
                                                    borderRadius: '16px',
                                                    padding: '16px'
                                                }}>
                                                    <motion.button
                                                        whileTap={{ scale: 0.9 }}
                                                        onClick={() => setGuestCount(Math.max(5, guestCount - 5))}
                                                        disabled={guestCount <= 5}
                                                        style={{
                                                            background: btnBg,
                                                            border: `1px solid ${borderColor}`,
                                                            width: '44px',
                                                            height: '44px',
                                                            borderRadius: '12px',
                                                            cursor: guestCount <= 5 ? 'not-allowed' : 'pointer',
                                                            opacity: guestCount <= 5 ? 0.4 : 1,
                                                            fontSize: '20px',
                                                            fontWeight: '700',
                                                            color: textColor,
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center'
                                                        }}
                                                    >
                                                        −
                                                    </motion.button>
                                                    <div style={{ textAlign: 'center' }}>
                                                        <motion.div
                                                            key={guestCount}
                                                            initial={{ scale: 0.8, opacity: 0 }}
                                                            animate={{ scale: 1, opacity: 1 }}
                                                            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                                                            style={{ fontSize: '24px', fontWeight: '900', color: textColor }}
                                                        >
                                                            {guestCount}
                                                        </motion.div>
                                                        <div style={{ fontSize: '13px', color: secondaryTextColor }}>personas</div>
                                                    </div>
                                                    <motion.button
                                                        whileTap={{ scale: 0.9 }}
                                                        onClick={() => setGuestCount(Math.min(maxCapacity, guestCount + 5))}
                                                        disabled={guestCount >= maxCapacity}
                                                        style={{
                                                            background: btnBg,
                                                            border: `1px solid ${borderColor}`,
                                                            width: '44px',
                                                            height: '44px',
                                                            borderRadius: '12px',
                                                            cursor: guestCount >= maxCapacity ? 'not-allowed' : 'pointer',
                                                            opacity: guestCount >= maxCapacity ? 0.4 : 1,
                                                            fontSize: '20px',
                                                            fontWeight: '700',
                                                            color: textColor,
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center'
                                                        }}
                                                    >
                                                        +
                                                    </motion.button>
                                                </div>
                                            </div>

                                            {/* Duration Selector */}
                                            <div>
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                                                    <span style={{ fontSize: '14px', fontWeight: '700', color: textColor }}>Duración del Evento</span>
                                                    {durationDiscountPct > 0 && (
                                                        <span style={{
                                                            fontSize: '11px',
                                                            background: 'rgba(16, 185, 129, 0.15)',
                                                            color: '#10B981',
                                                            border: '1px solid rgba(16, 185, 129, 0.3)',
                                                            padding: '2px 8px',
                                                            borderRadius: '12px',
                                                            fontWeight: '700'
                                                        }}>
                                                            🔥 {durationDiscountPct}% OFF
                                                        </span>
                                                    )}
                                                </div>
                                                <div style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    background: subCardBg,
                                                    borderRadius: '16px',
                                                    padding: '16px'
                                                }}>
                                                    <motion.button
                                                        whileTap={{ scale: 0.9 }}
                                                        onClick={() => {
                                                            const currentIdx = durationOptions.indexOf(duration);
                                                            if (currentIdx > 0) setDuration(durationOptions[currentIdx - 1]);
                                                        }}
                                                        disabled={durationOptions.indexOf(duration) === 0}
                                                        style={{
                                                            background: btnBg,
                                                            border: `1px solid ${borderColor}`,
                                                            width: '44px',
                                                            height: '44px',
                                                            borderRadius: '12px',
                                                            cursor: durationOptions.indexOf(duration) === 0 ? 'not-allowed' : 'pointer',
                                                            fontSize: '20px',
                                                            fontWeight: '700',
                                                            color: textColor,
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            opacity: durationOptions.indexOf(duration) === 0 ? 0.3 : 1
                                                        }}
                                                    >
                                                        −
                                                    </motion.button>
                                                    <div style={{ textAlign: 'center' }}>
                                                        <motion.div
                                                            key={duration}
                                                            initial={{ scale: 0.8, opacity: 0 }}
                                                            animate={{ scale: 1, opacity: 1 }}
                                                            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                                                            style={{ fontSize: '24px', fontWeight: '900', color: textColor }}
                                                        >
                                                            {duration}
                                                        </motion.div>
                                                        <div style={{ fontSize: '13px', color: secondaryTextColor }}>horas</div>
                                                    </div>
                                                    <motion.button
                                                        whileTap={{ scale: 0.9 }}
                                                        onClick={() => {
                                                            const currentIdx = durationOptions.indexOf(duration);
                                                            if (currentIdx < durationOptions.length - 1) setDuration(durationOptions[currentIdx + 1]);
                                                        }}
                                                        disabled={durationOptions.indexOf(duration) === durationOptions.length - 1}
                                                        style={{
                                                            background: btnBg,
                                                            border: `1px solid ${borderColor}`,
                                                            width: '44px',
                                                            height: '44px',
                                                            borderRadius: '12px',
                                                            cursor: durationOptions.indexOf(duration) === durationOptions.length - 1 ? 'not-allowed' : 'pointer',
                                                            fontSize: '20px',
                                                            fontWeight: '700',
                                                            color: textColor,
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            opacity: durationOptions.indexOf(duration) === durationOptions.length - 1 ? 0.3 : 1
                                                        }}
                                                    >
                                                        +
                                                    </motion.button>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}

                                {/* STEP 2: Additional Services */}
                                {bookingStep === 2 && (
                                    <motion.div
                                        key="step-2"
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        transition={{ duration: 0.22, ease: 'easeOut' }}
                                        style={{ flex: 1 }}
                                    >
                                        <p style={{ fontSize: '14px', color: secondaryTextColor, marginBottom: '20px' }}>
                                            Personaliza tu experiencia agregando servicios adicionales (opcional).
                                        </p>

                                        {additionalServices.length > 0 ? (
                                            <div style={{ display: 'grid', gap: '12px' }}>
                                                {additionalServices.map((service, idx) => {
                                                    const isSelected = selectedServices.some(s => (s.id && service.id) ? s.id === service.id : s.name === service.name);
                                                    return (
                                                        <motion.div
                                                            key={idx}
                                                            whileTap={{ scale: 0.98 }}
                                                            onClick={() => toggleService(service)}
                                                            style={{
                                                                display: 'flex',
                                                                justifyContent: 'space-between',
                                                                alignItems: 'center',
                                                                padding: '16px',
                                                                background: isSelected ? 'rgba(132, 204, 22, 0.08)' : subCardBg,
                                                                borderRadius: '16px',
                                                                cursor: 'pointer',
                                                                border: isSelected ? `2px solid ${primaryColor}` : `1px solid ${borderColor}`,
                                                                transition: 'background 0.2s ease, border-color 0.2s ease'
                                                            }}
                                                        >
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                                                <div style={{
                                                                    width: '40px',
                                                                    height: '40px',
                                                                    borderRadius: '10px',
                                                                    background: isSelected ? primaryColor : btnBg,
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    fontSize: '20px',
                                                                    color: isSelected ? 'white' : secondaryTextColor,
                                                                    transition: 'all 0.2s ease'
                                                                }}>
                                                                    {isSelected ? '✓' : service.icon || '✨'}
                                                                </div>
                                                                <div>
                                                                    <div style={{ fontSize: '15px', fontWeight: '700', color: textColor }}>
                                                                        {service.name}
                                                                    </div>
                                                                    <div style={{ fontSize: '14px', fontWeight: '700', color: primaryColor, marginTop: '2px' }}>
                                                                        +${service.price?.toLocaleString()}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </motion.div>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <div style={{ textAlign: 'center', padding: '40px 0', color: secondaryTextColor }}>
                                                No hay servicios adicionales disponibles para este espacio.
                                            </div>
                                        )}
                                    </motion.div>
                                )}

                                {/* STEP 3: Summary */}
                                {bookingStep === 3 && (
                                    <motion.div
                                        key="step-3"
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        transition={{ duration: 0.22, ease: 'easeOut' }}
                                        style={{ flex: 1 }}
                                    >
                                        <div style={{ background: subCardBg, borderRadius: '16px', padding: '24px' }}>
                                            {/* Date & Guests */}
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                                                <div>
                                                    <div style={{ fontSize: '12px', color: secondaryTextColor, marginBottom: '4px' }}>FECHA</div>
                                                    <div style={{ fontSize: '15px', fontWeight: '700', color: textColor }}>
                                                        {selectedDate?.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}
                                                    </div>
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: '12px', color: secondaryTextColor, marginBottom: '4px' }}>INVITADOS</div>
                                                    <div style={{ fontSize: '15px', fontWeight: '700', color: textColor }}>{guestCount} pers.</div>
                                                </div>
                                            </div>

                                            {/* Breakdown */}
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                    <span style={{ color: secondaryTextColor, fontSize: '14px' }}>Alquiler base ({duration}h)</span>
                                                    <span style={{ fontWeight: '600', fontSize: '14px', color: textColor }}>${rawBasePrice.toLocaleString()}</span>
                                                </div>

                                                {durationDiscountPct > 0 && (
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#10B981', fontSize: '14px', fontWeight: '600' }}>
                                                        <span>Descuento por {duration}hs ({durationDiscountPct}% OFF)</span>
                                                        <span>-${durationDiscountAmount.toLocaleString()}</span>
                                                    </div>
                                                )}

                                                {selectedServices.map((service, idx) => (
                                                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                        <span style={{ color: secondaryTextColor, fontSize: '14px' }}>{service.name}</span>
                                                        <span style={{ fontWeight: '600', fontSize: '14px', color: textColor }}>+${service.price.toLocaleString()}</span>
                                                    </div>
                                                ))}

                                                <div style={{ height: '1px', background: borderColor, margin: '8px 0' }} />

                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <span style={{ fontWeight: '700', fontSize: '16px', color: textColor }}>Total Final</span>
                                                    <span style={{ fontWeight: '900', fontSize: '24px', color: primaryColor }}>${totalPrice.toLocaleString()}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}

                                {/* STEP 4: Customer Form */}
                                {bookingStep === 4 && (
                                    <motion.div
                                        key="step-4"
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        transition={{ duration: 0.22, ease: 'easeOut' }}
                                        style={{ flex: 1 }}
                                    >
                                        <p style={{ fontSize: '14px', color: secondaryTextColor, marginBottom: '20px' }}>
                                            Ingresa tus datos de contacto para enviarte la confirmación.
                                        </p>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: textColor }}>Nombre</label>
                                                <input type="text" id="customerFirstName" placeholder="Tu nombre" style={{ width: '100%', padding: '12px', borderRadius: '12px', border: `1px solid ${borderColor}`, background: subCardBg, color: textColor }} />
                                            </div>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: textColor }}>Apellido</label>
                                                <input type="text" id="customerLastName" placeholder="Tu apellido" style={{ width: '100%', padding: '12px', borderRadius: '12px', border: `1px solid ${borderColor}`, background: subCardBg, color: textColor }} />
                                            </div>
                                        </div>
                                        <div style={{ marginBottom: '16px' }}>
                                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: textColor }}>Teléfono (WhatsApp)</label>
                                            <input type="tel" id="customerPhone" placeholder="3804..." style={{ width: '100%', padding: '12px', borderRadius: '12px', border: `1px solid ${borderColor}`, background: subCardBg, color: textColor }} />
                                        </div>
                                        <div style={{ marginBottom: '16px' }}>
                                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: textColor }}>Email (Opcional)</label>
                                            <input type="email" id="customerEmail" placeholder="tucorreo@ejemplo.com" style={{ width: '100%', padding: '12px', borderRadius: '12px', border: `1px solid ${borderColor}`, background: subCardBg, color: textColor }} />
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Footer Buttons */}
                            <div style={{ display: 'flex', gap: '12px', marginTop: '32px' }}>
                                {bookingStep > 1 && (
                                    <motion.button
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => {
                                            setBookingStep(prev => prev - 1)
                                        }}
                                        style={{
                                            padding: '16px 24px',
                                            borderRadius: '14px',
                                            border: `1px solid ${borderColor}`,
                                            background: btnBg,
                                            fontSize: '16px',
                                            fontWeight: '600',
                                            cursor: 'pointer',
                                            color: secondaryTextColor
                                        }}
                                    >
                                        Volver
                                    </motion.button>
                                )}

                                <motion.button
                                    whileTap={{ scale: 0.97 }}
                                    whileHover={{ scale: 1.01 }}
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
                                        background: primaryColor,
                                        color: 'white',
                                        fontSize: '16px',
                                        fontWeight: '700',
                                        cursor: 'pointer',
                                        boxShadow: '0 4px 14px rgba(0, 0, 0, 0.15)'
                                    }}
                                >
                                    {bookingStep === 4 ? 'Confirmar Reserva' : 'Siguiente'}
                                </motion.button>
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
function BookingPanel({
    pricePerHour,
    guestCount,
    setGuestCount,
    duration,
    setDuration,
    rawBasePrice,
    durationDiscountPct,
    durationDiscountAmount,
    basePrice,
    totalPrice,
    onContinue,
    business,
    selectedDate,
    onSelectDateClick
}) {
    const primaryColor = business?.primary_color || business?.button_color || '#84CC16';
    const isDark = business?.theme === 'dark';
    const cardBg = isDark ? '#1E293B' : 'white';
    const textColor = isDark ? '#F8FAFC' : '#1a1a1a';
    const secondaryTextColor = isDark ? '#94A3B8' : '#64748B';
    const subCardBg = isDark ? '#0F172A' : '#F8F9FA';
    const btnBg = isDark ? '#334155' : 'white';
    const borderColor = isDark ? 'rgba(255,255,255,0.1)' : '#E2E8F0';
    const durationOptions = business?.rental_duration_options || [4, 6, 8, 12, 24];
    const maxCapacity = Number(business?.capacity_limit || business?.capacity || 100);

    return (
        <div style={{
            background: cardBg,
            borderRadius: '24px',
            padding: '32px',
            boxShadow: isDark ? '0 4px 24px rgba(0,0,0,0.3)' : '0 4px 24px rgba(0,0,0,0.06)',
            border: `1px solid ${borderColor}`,
            color: textColor
        }}>
            <div style={{ marginBottom: '24px' }}>
                <div style={{ fontSize: '13px', color: secondaryTextColor, marginBottom: '4px' }}>Desde</div>
                <div>
                    <span style={{ fontSize: '32px', fontWeight: '900', color: textColor }}>
                        ${pricePerHour.toLocaleString()}
                    </span>
                    <span style={{ fontSize: '16px', color: secondaryTextColor, marginLeft: '4px' }}>/hora</span>
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
                            onClick={() => setGuestCount(Math.max(5, guestCount - 5))}
                            disabled={guestCount <= 5}
                            style={{
                                background: 'white',
                                border: 'none',
                                width: '36px',
                                height: '36px',
                                borderRadius: '8px',
                                cursor: guestCount <= 5 ? 'not-allowed' : 'pointer',
                                opacity: guestCount <= 5 ? 0.3 : 1,
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
                            onClick={() => setGuestCount(Math.min(maxCapacity, guestCount + 5))}
                            disabled={guestCount >= maxCapacity}
                            style={{
                                background: 'white',
                                border: 'none',
                                width: '36px',
                                height: '36px',
                                borderRadius: '8px',
                                cursor: guestCount >= maxCapacity ? 'not-allowed' : 'pointer',
                                opacity: guestCount >= maxCapacity ? 0.3 : 1,
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
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748B' }}>Duración</span>
                        {durationDiscountPct > 0 && (
                            <span style={{
                                fontSize: '10px',
                                background: 'rgba(16, 185, 129, 0.15)',
                                color: '#10B981',
                                border: '1px solid rgba(16, 185, 129, 0.3)',
                                padding: '1px 6px',
                                borderRadius: '6px',
                                fontWeight: '700'
                            }}>
                                🔥 {durationDiscountPct}% OFF
                            </span>
                        )}
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
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <span style={{ fontSize: '14px', color: '#64748B' }}>Precio por hora</span>
                    <span style={{ fontSize: '14px', fontWeight: '600', color: '#1a1a1a' }}>
                        ${pricePerHour.toLocaleString()}
                    </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <span style={{ fontSize: '14px', color: '#64748B' }}>Duración ({duration} horas)</span>
                    <span style={{ fontSize: '14px', fontWeight: '600', color: '#1a1a1a' }}>
                        ${(rawBasePrice || (pricePerHour * duration)).toLocaleString()}
                    </span>
                </div>
                {durationDiscountPct > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', color: '#10B981', fontWeight: '600', fontSize: '14px' }}>
                        <span>Descuento por {duration}hs ({durationDiscountPct}% OFF)</span>
                        <span>-${durationDiscountAmount?.toLocaleString()}</span>
                    </div>
                )}
                <div style={{
                    borderTop: '2px solid #E5E7EB',
                    paddingTop: '12px',
                    display: 'flex',
                    justifyContent: 'space-between'
                }}>
                    <span style={{ fontSize: '15px', fontWeight: '700', color: '#1a1a1a' }}>Total</span>
                    <span style={{ fontSize: '18px', fontWeight: '900', color: business?.primary_color || business?.button_color || '#84CC16' }}>
                        ${totalPrice.toLocaleString()}
                    </span>
                </div>
            </div>

            <button
                onClick={() => {
                    if (!selectedDate) {
                        if (onSelectDateClick) onSelectDateClick();
                    } else {
                        if (onContinue) onContinue();
                    }
                }}
                style={{
                    width: '100%',
                    padding: '16px',
                    background: primaryColor,
                    color: 'white',
                    border: 'none',
                    borderRadius: '14px',
                    fontSize: '16px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    marginBottom: '12px',
                    boxShadow: '0 4px 14px rgba(0, 0, 0, 0.15)'
                }}
            >
                {!selectedDate ? 'Seleccionar Fecha' : 'Continuar'}
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
