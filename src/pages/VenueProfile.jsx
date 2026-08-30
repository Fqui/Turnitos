import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';
import serviceAdapter from '../services/serviceAdapter';
import { useNotification } from '../contexts/NotificationContext';
import SEOHead from '../components/SEOHead';
import { parseAmenity } from '../components/common/AmenityIcon';
import { pushService } from '../services/pushService';
import { supabase } from '../services/supabaseClient';
import 'leaflet/dist/leaflet.css';

import VenueHeroBanner from '../components/venue/profile/VenueHeroBanner';
import VenueGallerySection from '../components/venue/profile/VenueGallerySection';
import VenueAmenitiesSection from '../components/venue/profile/VenueAmenitiesSection';
import VenueAdditionalServicesSection from '../components/venue/profile/VenueAdditionalServicesSection';
import VenueCalendarSection from '../components/venue/profile/VenueCalendarSection';
import VenueBookingPanel from '../components/venue/profile/VenueBookingPanel';
import VenueBookingWizardModal from '../components/venue/profile/VenueBookingWizardModal';
import VenueLightboxModal from '../components/venue/profile/VenueLightboxModal';

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
    const [appliedCoupon, setAppliedCoupon] = useState(null);
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
            const res = await serviceAdapter.getBookings(bId);
            const list = Array.isArray(res) ? res : (res && Array.isArray(res.bookings) ? res.bookings : []);
            setVenueBookings(list);

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

        refreshDataSilently(bId);

        const bookingsSub = serviceAdapter.subscribeToBookings(bId, () => {
            refreshDataSilently(bId);
        });

        const bizSub = serviceAdapter.subscribeToBusiness(bId, () => {
            refreshDataSilently(bId);
        });

        const notifChannel = supabase.channel(`business-notif-${bId}`)
            .on('broadcast', { event: 'new_booking' }, () => {
                refreshDataSilently(bId);
            })
            .subscribe();

        let localBroadcast = null;
        try {
            if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
                localBroadcast = new BroadcastChannel(`turnitos-live-${bId}`);
                localBroadcast.onmessage = () => {
                    refreshDataSilently(bId);
                };
            }
        } catch (bcErr) {
            console.warn('BroadcastChannel error in VenueProfile:', bcErr);
        }

        const interval = setInterval(() => {
            refreshDataSilently(bId);
        }, 5000);

        return () => {
            if (bookingsSub && bookingsSub.unsubscribe) bookingsSub.unsubscribe();
            if (bizSub && bizSub.unsubscribe) bizSub.unsubscribe();
            if (notifChannel) {
                try { supabase.removeChannel(notifChannel); } catch (e) { }
            }
            if (localBroadcast) {
                try { localBroadcast.close(); } catch (e) { }
            }
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

        const featuredIndex = images.findIndex(img => img.is_featured || img.featured);
        if (featuredIndex > 0) {
            const [featuredItem] = images.splice(featuredIndex, 1);
            images.unshift(featuredItem);
        }

        return images;
    };

    const maxCapacity = Number(business?.capacity_limit || business?.metadata?.capacity_limit || (business?.max_capacity && business.max_capacity > 1 ? business.max_capacity : null) || 100);
    const hasInitializedRef = useRef(false);

    useEffect(() => {
        if (business?.id && !hasInitializedRef.current) {
            hasInitializedRef.current = true;
            const maxCap = Number(business.capacity_limit || business.metadata?.capacity_limit || (business.max_capacity && business.max_capacity > 1 ? business.max_capacity : null) || 100);
            const halfCap = Math.max(5, Math.min(maxCap, Math.round((maxCap / 2) / 5) * 5));
            setGuestCount(halfCap);

            const options = business.rental_duration_options || [4, 6, 8, 12, 24];
            if (options && options.length > 0) {
                setDuration(options[0]);
            }
        }
    }, [business?.id]);

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
    const subtotalPrice = basePrice + servicesTotal;
    const couponDiscountAmount = Number(appliedCoupon?.discountAmount || 0);
    const totalPrice = Math.max(0, subtotalPrice - couponDiscountAmount);

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

    const getDaysInMonth = (date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();

        const days = [];
        for (let i = 0; i < startingDayOfWeek; i++) {
            days.push(null);
        }
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

        const blockedList = [
            ...(business?.blocked_dates || []),
            ...(business?.metadata?.blocked_dates || [])
        ];
        const isOwnerBlocked = blockedList.some(b => {
            const bStr = typeof b === 'string' ? b : (b?.date || '');
            return formatDateStr(bStr) === dateStr;
        });
        if (isOwnerBlocked) return true;

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
                duration: duration * 60,
                price: totalPrice,
                totalPrice: totalPrice,
                total_price: totalPrice,
                coupon_code: appliedCoupon?.coupon?.code || null,
                discount_amount: couponDiscountAmount,
                gift_benefit: appliedCoupon?.giftBenefit || null,
                guestCount: guestCount,
                guest_count: guestCount,
                selectedServices: selectedServices,
                selected_services: selectedServices,
                servicesTotal: servicesTotal,
                services_total: servicesTotal,
                basePrice: basePrice,
                base_price: basePrice,
                customerName: bookingDetails.customerName,
                customer_name: bookingDetails.customerName,
                customerPhone: bookingDetails.customerPhone,
                customer_phone: bookingDetails.customerPhone,
                customerEmail: bookingDetails.customerEmail,
                customer_email: bookingDetails.customerEmail,
                notes: bookingDetails.notes,
                metadata: {
                    coupon_code: appliedCoupon?.coupon?.code || null,
                    discount_amount: couponDiscountAmount,
                    gift_benefit: appliedCoupon?.giftBenefit || null,
                    original_price: subtotalPrice
                },
                status: 'pending'
            };

            await serviceAdapter.createBooking(bookingData);

            try {
                if (pushService?.notifyBusinessNewBooking) {
                    pushService.notifyBusinessNewBooking(business.id, {
                        customerName: bookingDetails.customerName,
                        date: bookingDetails.date,
                        businessName: business.name
                    });
                }
            } catch (pushErr) {
                console.warn('[VenueProfile] Push notification failed but booking created:', pushErr);
            }

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
    const additionalServices = (business?.additional_services || []).filter(s => s.enabled !== false);
    const daysInMonth = getDaysInMonth(currentMonth);
    const durationOptions = business?.rental_duration_options || [4, 6, 8, 12, 24];

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

    if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Cargando espacio...</div>;
    if (!business) return <div style={{ padding: 40, textAlign: 'center' }}>Espacio no encontrado</div>;

    const pageTitle = `${business.name} - Alquiler de Quincho y Eventos en ${business.location || 'La Rioja'}`;
    const pageDescription = `Alquilá ${business.name} en ${business.location || 'La Rioja'}. Consultá disponibilidad, precios por hora o por día y reservá online.`;
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

            {/* 1. Hero Section */}
            <VenueHeroBanner
                business={business}
                galleryImages={galleryImages}
                windowWidth={windowWidth}
            />

            {/* 2. Main Content Grid */}
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
                    <VenueGallerySection
                        galleryImages={galleryImages}
                        onOpenLightbox={(idx) => {
                            setLightboxIndex(idx);
                            setShowLightbox(true);
                        }}
                        windowWidth={windowWidth}
                        cardBg={cardBg}
                        textColor={textColor}
                        borderColor={borderColor}
                        primaryColor={primaryColor}
                    />

                    {/* Amenities Section */}
                    <VenueAmenitiesSection
                        amenities={amenities}
                        showAllAmenities={showAllAmenities}
                        setShowAllAmenities={setShowAllAmenities}
                        windowWidth={windowWidth}
                        cardBg={cardBg}
                        subCardBg={subCardBg}
                        textColor={textColor}
                        borderColor={borderColor}
                        primaryColor={primaryColor}
                        getAmenityIcon={getAmenityIcon}
                    />

                    {/* Additional Services Section */}
                    <VenueAdditionalServicesSection
                        additionalServices={additionalServices}
                        showServicesExpanded={showServicesExpanded}
                        setShowServicesExpanded={setShowServicesExpanded}
                        windowWidth={windowWidth}
                        cardBg={cardBg}
                        subCardBg={subCardBg}
                        btnBg={btnBg}
                        textColor={textColor}
                        secondaryTextColor={secondaryTextColor}
                        borderColor={borderColor}
                        primaryColor={primaryColor}
                        isDark={isDark}
                    />

                    {/* Calendar Section */}
                    <VenueCalendarSection
                        calendarRef={calendarRef}
                        currentMonth={currentMonth}
                        setCurrentMonth={setCurrentMonth}
                        daysInMonth={daysInMonth}
                        selectedDate={selectedDate}
                        handleDateSelect={handleDateSelect}
                        isDateBlocked={isDateBlocked}
                        isDatePast={isDatePast}
                        handleContinue={handleContinue}
                        windowWidth={windowWidth}
                        cardBg={cardBg}
                        subCardBg={subCardBg}
                        btnBg={btnBg}
                        textColor={textColor}
                        secondaryTextColor={secondaryTextColor}
                        borderColor={borderColor}
                        primaryColor={primaryColor}
                        isDark={isDark}
                    />

                    {/* Sobre el Espacio Section */}
                    {(() => {
                        const fullDesc = business.metadata?.full_description || business.full_description || business.description;
                        if (!fullDesc || !fullDesc.trim()) return null;
                        const isLong = fullDesc.length > 250 || fullDesc.split('\n').length > 3;

                        return (
                            <div style={{
                                background: cardBg,
                                borderRadius: '24px',
                                padding: windowWidth < 768 ? '20px 16px' : '28px 32px',
                                boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
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
                            boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
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
                                    <Marker position={[business.latitude, business.longitude]} />
                                </MapContainer>

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
                {windowWidth > 1200 && (
                    <div style={{
                        position: 'sticky',
                        top: '90px',
                        height: 'fit-content'
                    }}>
                        <VenueBookingPanel
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
                )}
            </div>

            {/* Booking Modal Wizard */}
            <VenueBookingWizardModal
                showBookingModal={showBookingModal}
                setShowBookingModal={setShowBookingModal}
                bookingStep={bookingStep}
                setBookingStep={setBookingStep}
                guestCount={guestCount}
                setGuestCount={setGuestCount}
                maxCapacity={maxCapacity}
                duration={duration}
                setDuration={setDuration}
                durationOptions={durationOptions}
                durationDiscountPct={durationDiscountPct}
                durationDiscountAmount={durationDiscountAmount}
                rawBasePrice={rawBasePrice}
                basePrice={basePrice}
                subtotalPrice={subtotalPrice}
                totalPrice={totalPrice}
                selectedDate={selectedDate}
                selectedServices={selectedServices}
                toggleService={toggleService}
                additionalServices={additionalServices}
                appliedCoupon={appliedCoupon}
                setAppliedCoupon={setAppliedCoupon}
                couponDiscountAmount={couponDiscountAmount}
                handleConfirmBooking={handleConfirmBooking}
                showAlert={showAlert}
                business={business}
                cardBg={cardBg}
                subCardBg={subCardBg}
                btnBg={btnBg}
                textColor={textColor}
                secondaryTextColor={secondaryTextColor}
                borderColor={borderColor}
                primaryColor={primaryColor}
            />

            {/* Lightbox */}
            <VenueLightboxModal
                showLightbox={showLightbox}
                setShowLightbox={setShowLightbox}
                lightboxIndex={lightboxIndex}
                setLightboxIndex={setLightboxIndex}
                galleryImages={galleryImages}
            />
        </div>
    );
}
