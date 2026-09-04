import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

import serviceAdapter from '../services/serviceAdapter';
import { pushService } from '../services/pushService';
import { supabase } from '../services/supabaseClient';
import { formatDisplayDate } from '../utils/dateUtils';

import ServiceSelector from '../components/ServiceSelector';
import Calendar from '../components/Calendar';
import MonthCalendar from '../components/MonthCalendar';
import TimeSlotPicker from '../components/TimeSlotPicker';
import PadelBookingFlow from '../components/PadelBookingFlow';
import BookingSummary from '../components/BookingSummary';
import BookingSuccessModal from '../components/BookingSuccessModal';
import BusinessReviewsSection from '../components/BusinessReviewsSection';
import SEOHead from '../components/SEOHead';

import ProfileHeroBanner from '../components/profile/ProfileHeroBanner';
import ProfileHighlightsBar from '../components/profile/ProfileHighlightsBar';
import ProfileStoryViewerModal from '../components/profile/ProfileStoryViewerModal';
import ProfileVenuePricingSection from '../components/profile/ProfileVenuePricingSection';
import ProfileVenueBookingSection from '../components/profile/ProfileVenueBookingSection';
import ProfileStoreSection from '../components/profile/ProfileStoreSection';
import ProfileSpecialistSelector from '../components/profile/ProfileSpecialistSelector';
import ProfileInfoSection from '../components/profile/ProfileInfoSection';

// Fix for default marker icon in Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export default function BusinessProfile({ business: initialBusiness }) {
    const { businessSlug } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const [business, setBusiness] = useState(initialBusiness || location.state?.business || null);
    const [loading, setLoading] = useState(!business);
    const isMobile = window.innerWidth <= 768;

    const [selectedItem, setSelectedItem] = useState(null); // Sport (string) or Service (object)
    const [selectedDate, setSelectedDate] = useState(null);
    const [selectedTime, setSelectedTime] = useState(null);
    const [existingBookings, setExistingBookings] = useState([]);
    const [loadingBookings, setLoadingBookings] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Specialist selection state
    const [availableSpecialists, setAvailableSpecialists] = useState([]);
    const [selectedSpecialist, setSelectedSpecialist] = useState(null);
    const [loadingSpecialists, setLoadingSpecialists] = useState(false);

    // Venue specific state
    const [selectedDuration, setSelectedDuration] = useState(null);
    const [selectedAdditionalServices, setSelectedAdditionalServices] = useState([]);

    // Gallery / Stories state
    const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(null);
    const [selectedHighlight, setSelectedHighlight] = useState(null);
    const [storyViewerList, setStoryViewerList] = useState(null);

    // Promotion state
    const [activePromotion, setActivePromotion] = useState(null);

    // Refs for auto-scrolling
    const calendarRef = useRef(null);
    const timeRef = useRef(null);
    const specialistRef = useRef(null);
    const confirmRef = useRef(null);

    // Helper to parse business hours
    const getBusinessHours = (date) => {
        let hours = business?.hours;
        const defaultHours = { open: '08:00', close: '20:00' };

        if (!hours) return defaultHours;

        if (typeof hours === 'string') {
            try {
                if (hours.trim().startsWith('{') || hours.trim().startsWith('[')) {
                    hours = JSON.parse(hours);
                }
            } catch (e) {}
        }

        if (typeof hours === 'string') {
            const matches = hours.match(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/);
            if (matches) {
                return { open: matches[1], close: matches[2] };
            }
            return defaultHours;
        }

        // Check special_days override
        const specialDays = business?.special_days || [];
        if (specialDays.length > 0 && date) {
            const dateObj = date instanceof Date
                ? date
                : new Date(typeof date === 'string' && !date.includes('T') ? `${date}T00:00:00` : date);
            const year = dateObj.getFullYear();
            const month = String(dateObj.getMonth() + 1).padStart(2, '0');
            const day = String(dateObj.getDate()).padStart(2, '0');
            const dateStr = `${year}-${month}-${day}`;

            const matchedSpecialDay = specialDays.find(sd => sd.date === dateStr);
            if (matchedSpecialDay) {
                if (matchedSpecialDay.type === 'closed' || matchedSpecialDay.type === 'holiday') {
                    return { open: '00:00', close: '00:00', isClosed: true };
                }
                if (matchedSpecialDay.type === 'special_hours' && matchedSpecialDay.open && matchedSpecialDay.close) {
                    return { open: matchedSpecialDay.open, close: matchedSpecialDay.close };
                }
            }
        }

        if (!date) return defaultHours;

        const daysEn = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const daysEs = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
        const daysEsAccents = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

        const dateObj = date instanceof Date
            ? date
            : new Date(typeof date === 'string' && !date.includes('T') ? `${date}T00:00:00` : date);

        const dayIndex = dateObj.getDay();
        const dayNameEn = daysEn[dayIndex];
        const dayNameEs = daysEs[dayIndex];
        const dayNameEsAcc = daysEsAccents[dayIndex];

        let schedule = null;
        if (typeof hours === 'object' && hours !== null) {
            schedule = hours[dayNameEn] ||
                       hours[dayNameEs] ||
                       hours[dayNameEsAcc] ||
                       hours[dayNameEn.toUpperCase()] ||
                       hours[dayNameEs.toUpperCase()] ||
                       hours[dayIndex];
        }

        if (!schedule) {
            return defaultHours;
        }

        if (schedule.isOpen === false) {
            return { open: '00:00', close: '00:00', isClosed: true };
        }

        if (schedule.isSplit) {
            const o1 = schedule.open || '08:00';
            const c1 = schedule.breakStart || '13:00';
            const o2 = schedule.breakEnd || '16:00';
            const c2 = schedule.close || '20:00';
            return {
                open: o1,
                close: c2,
                ranges: [
                    { open: o1, close: c1 },
                    { open: o2, close: c2 }
                ]
            };
        }

        return {
            open: schedule.open || '08:00',
            close: schedule.close || '20:00',
            ranges: (Array.isArray(schedule.ranges) && schedule.ranges.length > 0) ? schedule.ranges : undefined
        };
    };

    // Scroll to top or anchor when component mounts
    useEffect(() => {
        if (location.hash) {
            const id = location.hash.replace('#', '');
            const element = document.getElementById(id);
            if (element) {
                setTimeout(() => {
                    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 500);
                return;
            }
        }
        window.scrollTo(0, 0);
    }, [location.hash, loading]);

    // Auto-scroll when slot/specialist is selected
    useEffect(() => {
        if (!loadingSpecialists && selectedTime && business?.type === 'service') {
            if (availableSpecialists.length > 1) {
                const timer = setTimeout(() => {
                    specialistRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 180);
                return () => clearTimeout(timer);
            } else if (availableSpecialists.length === 1 || availableSpecialists.length === 0) {
                const timer = setTimeout(() => {
                    confirmRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 180);
                return () => clearTimeout(timer);
            }
        }
    }, [loadingSpecialists, selectedTime, availableSpecialists.length, business?.type]);
    useEffect(() => {
        if (!business) {
            const fetchBusiness = async () => {
                try {
                    const foundBusiness = await serviceAdapter.getBusinessBySlug(businessSlug);
                    if (foundBusiness) {
                        setBusiness(foundBusiness);
                    } else {
                        console.error('Business not found for slug:', businessSlug);
                    }
                } catch (error) {
                    console.error('Error fetching business:', error);
                } finally {
                    setLoading(false);
                }
            };

            if (businessSlug) {
                fetchBusiness();
            }
        }
    }, [businessSlug, business]);

    // Fetch bookings for date
    const fetchBookingsForDate = async (isBackground = false) => {
        if (business?.id && selectedDate) {
            if (!isBackground) {
                setLoadingBookings(true);
            }
            try {
                const dateStr = selectedDate instanceof Date
                    ? `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`
                    : selectedDate;

                const { bookings } = await serviceAdapter.getBookings(business.id, dateStr);
                setExistingBookings(bookings || []);
            } catch (error) {
                console.error("Error fetching bookings:", error);
                if (!isBackground) {
                    setExistingBookings([]);
                }
            } finally {
                if (!isBackground) {
                    setLoadingBookings(false);
                }
            }
        } else {
            setExistingBookings([]);
            setLoadingBookings(false);
        }
    };

    useEffect(() => {
        fetchBookingsForDate(false);
    }, [business?.id, selectedDate]);

    const refreshBookings = () => {
        fetchBookingsForDate(true);
    };

    // Realtime synchronization
    useEffect(() => {
        if (!business?.id) return;
        const bId = business.id;

        const bookingsSub = serviceAdapter.subscribeToBookings(bId, () => {
            fetchBookingsForDate(true);
        });

        const notifChannel = supabase.channel(`business-notif-${bId}`)
            .on('broadcast', { event: 'new_booking' }, () => {
                fetchBookingsForDate(true);
            })
            .subscribe();

        let localBroadcast = null;
        try {
            if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
                localBroadcast = new BroadcastChannel(`turnitos-live-${bId}`);
                localBroadcast.onmessage = () => {
                    fetchBookingsForDate(true);
                };
            }
        } catch (bcErr) {
            console.warn('BroadcastChannel error in BusinessProfile:', bcErr);
        }

        const pollingInterval = setInterval(() => {
            fetchBookingsForDate(true);
        }, 20000);

        return () => {
            if (bookingsSub && bookingsSub.unsubscribe) bookingsSub.unsubscribe();
            if (notifChannel) {
                try { supabase.removeChannel(notifChannel); } catch (e) { }
            }
            if (localBroadcast) {
                try { localBroadcast.close(); } catch (e) { }
            }
            clearInterval(pollingInterval);
        };
    }, [business?.id, selectedDate]);

    // Auto-select sport logic
    useEffect(() => {
        if (business && business.type === 'sport') {
            const catStr = (business.categories?.slug || business.categories?.name || business.category || '').toLowerCase().trim();
            const courtSport = (business.courts?.[0]?.sport || '').toLowerCase().trim();

            if (catStr.includes('padel') || catStr.includes('paddle') || courtSport.includes('padel') || courtSport.includes('paddle')) {
                setSelectedItem('paddle');
            } else if (catStr.includes('futbol') || catStr.includes('football') || catStr.includes('fútbol') || courtSport.includes('futbol') || courtSport.includes('football') || courtSport.includes('fútbol')) {
                setSelectedItem('football');
            } else if (business.sport_types && business.sport_types.length > 0) {
                setSelectedItem(business.sport_types[0]);
            } else {
                setSelectedItem(courtSport || catStr || 'sport');
            }

            if (!selectedDate) {
                setSelectedDate(new Date());
            }
        }
    }, [business]);

    // Detect promoId in URL
    useEffect(() => {
        const promoId = searchParams.get('promoId');
        if (promoId && business) {
            const fetchPromotion = async () => {
                try {
                    const promo = await serviceAdapter.getPromotionById(promoId);
                    if (promo && promo.business_id === business.id) {
                        setActivePromotion(promo);
                        if (promo.sport_type && business.type === 'sport') {
                            setSelectedItem(promo.sport_type);
                        }
                        if (promo.service_id && business.type === 'service' && business.services) {
                            const matchingService = business.services.find(s => s.id === promo.service_id);
                            if (matchingService) {
                                setSelectedItem(matchingService);
                            }
                        }
                    }
                } catch (err) {
                    console.warn('⚠️ Could not fetch promotion:', err.message);
                }
            };
            fetchPromotion();
        }
    }, [searchParams, business]);

    // Theme Management
    useEffect(() => {
        if (business) {
            const root = document.documentElement;
            const body = document.body;

            const color = business.brand_color || business.primary_color || business.button_color || business.buttonColor ||
                (business.category === 'beauty' ? '#FF4081' :
                    business.category === 'health' ? '#2979FF' : '#00E676');

            root.style.setProperty('--primary-paddle', color);

            const isDarkTheme = (business.theme || business.metadata?.theme) === 'dark';
            root.setAttribute('data-theme', isDarkTheme ? 'dark' : 'light');

            if (!isDarkTheme) {
                root.style.setProperty('--bg-main', '#F8FAFC');
                root.style.setProperty('--bg-card', '#FFFFFF');
                root.style.setProperty('--text-primary', '#0F172A');
                root.style.setProperty('--text-secondary', '#475569');
                root.style.setProperty('--border', '#E2E8F0');
            } else {
                root.style.setProperty('--bg-main', '#121212');
                root.style.setProperty('--bg-card', '#1C1C1C');
                root.style.setProperty('--text-primary', '#EDEDED');
                root.style.setProperty('--text-secondary', '#A0A0A0');
                root.style.setProperty('--border', '#2E2E2E');
            }
        }
        return () => {
            const root = document.documentElement;
            const body = document.body;

            root.removeAttribute('data-theme');
            root.style.removeProperty('--primary-paddle');
            root.style.removeProperty('--bg-main');
            root.style.removeProperty('--bg-card');
            root.style.removeProperty('--text-primary');
            root.style.removeProperty('--text-secondary');
            root.style.removeProperty('--border');
            body.style.removeProperty('background-image');
            body.style.removeProperty('background-size');
        };
    }, [business]);

    const primaryColor = business?.brand_color || business?.primary_color || business?.button_color || business?.buttonColor ||
        (business?.category === 'beauty' ? '#FF4081' :
            business?.category === 'health' ? '#2979FF' : '#00E676');

    // Confirm booking handler
    const handleConfirmBooking = async (finalDetails) => {
        setIsSubmitting(true);

        try {
            let finalSpecialistId = selectedSpecialist?.id;
            if (business.type === 'service' && !finalSpecialistId && availableSpecialists.length > 0) {
                finalSpecialistId = availableSpecialists[0].id;
            }

            let finalPrice = finalDetails.price;
            let discountApplied = 0;
            if (activePromotion && activePromotion.discount_value > 0) {
                if (activePromotion.discount_type === 'fixed') {
                    discountApplied = Math.min(activePromotion.discount_value, finalPrice);
                } else {
                    discountApplied = Math.round(finalPrice * (activePromotion.discount_value / 100));
                }
                finalPrice = finalPrice - discountApplied;
            }

            const selectedExtrasList = finalDetails.extras || [];

            const bookingData = {
                businessId: business.id,
                serviceId: business.type === 'service' ? selectedItem.id : null,
                courtId: business.type === 'sport' ? (finalDetails.courtId || selectedTime?.courtId) : null,
                specialistId: business.type === 'service' ? finalSpecialistId : null,
                date: finalDetails.date,
                time: finalDetails.time,
                customerName: finalDetails.customerName,
                customerPhone: finalDetails.customerPhone,
                price: finalPrice,
                status: 'pending',
                duration: selectedTime?.duration || finalDetails.duration || (business.type === 'venue' ? (selectedDuration * 60) : (business.type === 'service' ? selectedItem.duration : 60)),
                selectedServices: selectedExtrasList,
                selected_services: selectedExtrasList,
                metadata: {
                    ...(finalDetails.metadata || {}),
                    selectedServices: selectedExtrasList,
                    selected_services: selectedExtrasList,
                    additionalServices: selectedExtrasList,
                    extras: selectedExtrasList,
                    deposit_amount: finalDetails.depositAmount || null
                },
                promo_id: activePromotion?.id || null,
                discount_applied: discountApplied,
                history: [
                    {
                        action: 'creation',
                        label: 'Turno Creado (Público)',
                        timestamp: new Date().toISOString(),
                        status: 'pending'
                    }
                ]
            };

            await serviceAdapter.createBooking(bookingData);

            try {
                if (pushService?.notifyBusinessNewBooking) {
                    pushService.notifyBusinessNewBooking(business.id, {
                        customerName: finalDetails.customerName,
                        date: formatDisplayDate(selectedDate),
                        time: selectedTime,
                        businessName: business.name
                    });
                }
            } catch (pushErr) {
                console.warn('[BusinessProfile] Push notification failed:', pushErr);
            }

            setShowModal(false);
            setShowSuccessModal(true);
            refreshBookings();
            setSelectedTime(null);

        } catch (error) {
            console.error("Booking error:", error);
            if (error.message && error.message.includes('cupo mensual')) {
                alert("Este negocio ha completado su cupo mensual de turnos online. Por favor contactalo por WhatsApp para coordinar tu turno.");
            } else {
                alert(error.message || "Hubo un error al guardar la reserva. Por favor intenta nuevamente.");
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    // Schema.org JSON-LD Structured Data
    const businessSchema = useMemo(() => {
        if (!business) return null;

        const catName = (business.categories?.name || business.category || '').toLowerCase();
        let schemaType = 'LocalBusiness';
        if (business.type === 'sport' || catName.includes('deporte') || catName.includes('padel') || catName.includes('futbol')) {
            schemaType = 'SportsActivityLocation';
        } else if (business.type === 'service' || catName.includes('belleza') || catName.includes('peluqueria') || catName.includes('barberia')) {
            schemaType = 'HealthAndBeautyBusiness';
        } else if (business.type === 'venue' || catName.includes('quincho')) {
            schemaType = 'EventVenue';
        }

        const ratingVal = Number(business.rating_avg || business.rating || business.metadata?.rating_avg || 5.0);
        const reviewsNum = Number(business.reviews_count || business.metadata?.reviews_count || 1);

        const schemaObj = {
            '@context': 'https://schema.org',
            '@type': schemaType,
            'name': business.name,
            'image': business.banner_image || business.logo || 'https://www.turnitoslr.com/logo-turnitos.png',
            'url': `https://www.turnitoslr.com/${business.slug || ''}`,
            'telephone': business.whatsapp ? `+54${business.whatsapp}` : undefined,
            'priceRange': '$$',
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

    if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Cargando negocio...</div>;
    if (!business) return <div style={{ padding: 40, textAlign: 'center' }}>Negocio no encontrado</div>;

    const hasPadelCourts = business.type === 'sport' && business.courts?.some(c => c.sport === 'padel');
    const containerWidth = hasPadelCourts ? '1320px' : '1200px';

    const now = new Date();
    const rawHighlights = business?.gallery_highlights && business.gallery_highlights.length > 0
        ? business.gallery_highlights
        : (business?.gallery_images && business.gallery_images.length > 0
            ? [{
                id: 'legacy_gallery',
                title: 'Galería',
                cover_image: business.gallery_images[0],
                images: business.gallery_images,
                order: 0
            }]
            : []);

    const validHighlights = rawHighlights.filter(item => {
        if (item.is_story && item.expires_at) {
            return new Date(item.expires_at) > now;
        }
        return true;
    });

    const activeStories = validHighlights.filter(h => h.is_story);
    const permanentHighlights = validHighlights.filter(h => !h.is_story);

    const pageTitle = `${business.name} - Turnos Online en ${business.location || 'La Rioja'}`;
    const pageDescription = `Reservá tu turno online en ${business.name} (${business.location || 'La Rioja'}). Turnos de canchas y servicios disponibles en tiempo real.`;
    const pageImage = business?.banner_image || business?.logo || 'https://www.turnitoslr.com/logo-turnitos.png';

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="business-profile-page"
            style={{ paddingBottom: '80px', width: '100%', overflowX: 'clip' }}
        >
            <SEOHead
                title={pageTitle}
                description={pageDescription}
                keywords={`${business?.name}, turnos ${business?.name}, ${business?.category || 'deportes'}, turnos online la rioja, turnitos`}
                image={pageImage}
                url={`https://www.turnitoslr.com/${business?.slug || ''}`}
                schema={businessSchema}
            />

            <div className="business-profile-card-shell" style={{ maxWidth: containerWidth }}>
                {/* 1. Hero Banner & Business Info Header */}
                <ProfileHeroBanner
                    business={business}
                    selectedItem={selectedItem}
                    activeStories={activeStories}
                    onStoryClick={() => {
                        if (activeStories && activeStories.length > 0) {
                            setStoryViewerList(activeStories);
                            setSelectedPhotoIndex(0);
                            setSelectedHighlight(0);
                        }
                    }}
                />

                <div className="container" style={{ maxWidth: containerWidth, margin: '0 auto', padding: '0 24px', position: 'relative', zIndex: 2 }}>
                    {/* Instagram-Style Highlights Bar */}
                    <ProfileHighlightsBar
                        permanentHighlights={permanentHighlights}
                        onSelectHighlight={(index) => {
                            setStoryViewerList(permanentHighlights);
                            setSelectedPhotoIndex(0);
                            setSelectedHighlight(index);
                        }}
                    />

                    {/* Venue: Pricing Overview */}
                    {business.type === 'venue' && (
                        <ProfileVenuePricingSection
                            business={business}
                            primaryColor={primaryColor}
                        />
                    )}

                    {/* Active Promotion Banner */}
                    {activePromotion && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            style={{
                                margin: '0 0 20px 0',
                                padding: '12px 16px',
                                borderRadius: '12px',
                                background: 'linear-gradient(135deg, #10b98115, #10b98108)',
                                border: '1px solid #10b98140',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px'
                            }}
                        >
                            <span style={{ fontSize: '22px' }}>🎫</span>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '14px', fontWeight: '700', color: '#10b981' }}>
                                    ¡Cupón activado!
                                </div>
                                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                    {activePromotion.discount_type === 'fixed'
                                        ? `$${activePromotion.discount_value} de descuento`
                                        : `${activePromotion.discount_value}% OFF`
                                    } — {activePromotion.title}
                                </div>
                            </div>
                            <button
                                onClick={() => setActivePromotion(null)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--text-secondary)',
                                    cursor: 'pointer',
                                    fontSize: '18px',
                                    padding: '4px'
                                }}
                                title="Quitar cupón"
                            >
                                ✕
                            </button>
                        </motion.div>
                    )}

                    {/* Service Selector (Only for Service businesses) */}
                    {business.type === 'service' && (
                        <section id="servicios" style={{ marginBottom: '30px' }}>
                            <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px', color: 'var(--text-primary)' }}>
                                Nuestros Servicios
                            </h3>
                            <ServiceSelector
                                services={business.services}
                                selected={selectedItem}
                                onSelect={(service) => {
                                    setSelectedItem(service);
                                    setSelectedDate(null);
                                    setSelectedTime(null);

                                    setTimeout(() => {
                                        if (calendarRef.current) {
                                            calendarRef.current.scrollIntoView({
                                                behavior: 'smooth',
                                                block: 'start'
                                            });
                                        }
                                    }, 100);
                                }}
                                color={primaryColor}
                            />
                        </section>
                    )}

                    {/* Store Showcase */}
                    <ProfileStoreSection
                        business={business}
                        primaryColor={primaryColor}
                    />

                    {/* Select Date Section */}
                    {(selectedItem || business.type === 'venue') && (
                        <section
                            id={business.type === 'service' ? 'calendario' : 'servicios'}
                            ref={calendarRef}
                            style={{ marginBottom: '30px', animation: 'slideUp 0.4s ease' }}
                        >
                            <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px', color: 'var(--text-primary)' }}>
                                {business.type === 'service' ? 'Selecciona una fecha' : '1. Selecciona una fecha'}
                            </h3>
                            <div style={{
                                backgroundColor: 'var(--bg-card)',
                                padding: '16px',
                                borderRadius: '20px',
                                boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
                                border: '1px solid var(--border)'
                            }}>
                                {business.type === 'venue' ? (
                                    <MonthCalendar
                                        selectedDate={selectedDate}
                                        onDateSelect={(date) => {
                                            setSelectedDate(date);
                                            setSelectedTime(null);
                                        }}
                                        sportColor={primaryColor}
                                    />
                                ) : (
                                    <Calendar
                                        selectedDate={selectedDate}
                                        onDateSelect={(date) => {
                                            setSelectedDate(date);
                                            setSelectedTime(null);
                                        }}
                                        sportColor={primaryColor}
                                    />
                                )}
                            </div>
                        </section>
                    )}

                    {/* Select Time (For Sport & Service) */}
                    {selectedDate && business.type !== 'venue' && (
                        <section ref={timeRef} style={{ marginBottom: '30px', animation: 'slideUp 0.4s ease' }}>
                            <div style={{
                                backgroundColor: 'var(--bg-card)',
                                padding: '16px',
                                borderRadius: '20px',
                                boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
                                border: '1px solid var(--border)'
                            }}>
                                {(() => {
                                    const businessHours = getBusinessHours(selectedDate);
                                    const { open, close, ranges } = businessHours;

                                    let hoursObj = business.hours;
                                    if (typeof hoursObj === 'string') {
                                        try {
                                            hoursObj = JSON.parse(hoursObj);
                                        } catch (e) {
                                            hoursObj = {};
                                        }
                                    }

                                    let defaultInterval = 60;
                                    if (business.type === 'service') {
                                        defaultInterval = 30;
                                    } else if (business.type === 'sport') {
                                        const sportName = typeof selectedItem === 'string'
                                            ? selectedItem.toLowerCase()
                                            : (business.category || '').toLowerCase();

                                        if (sportName.includes('padel') || sportName.includes('paddle')) {
                                            defaultInterval = 30;
                                        }
                                    }

                                    const interval = (hoursObj?.interval && hoursObj.interval > 0)
                                        ? hoursObj.interval
                                        : defaultInterval;

                                    const isClosed = open === '00:00' && close === '00:00';

                                    if (isClosed) {
                                        return (
                                            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-secondary)' }}>
                                                <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}>🔒</div>
                                                <h4 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px', color: 'var(--text-primary)' }}>
                                                    Cerrado
                                                </h4>
                                                <p style={{ fontSize: '14px' }}>Este negocio no abre el día {formatDisplayDate(selectedDate)}.</p>
                                                <p style={{ fontSize: '14px', marginTop: '8px' }}>Por favor, selecciona otro día.</p>
                                            </div>
                                        );
                                    }

                                    if (loadingBookings && existingBookings.length === 0) {
                                        return (
                                            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)' }}>
                                                <div style={{
                                                    width: '50px',
                                                    height: '50px',
                                                    border: '4px solid var(--border)',
                                                    borderTopColor: primaryColor,
                                                    borderRadius: '50%',
                                                    animation: 'spin 1s linear infinite',
                                                    margin: '0 auto 20px'
                                                }} />
                                                <p style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)' }}>
                                                    Cargando disponibilidad...
                                                </p>
                                            </div>
                                        );
                                    }

                                    const resources = business.type === 'sport'
                                        ? (business.courts || [])
                                        : (selectedItem?.specialist
                                            ? [{
                                                id: selectedItem.specialist.id,
                                                name: selectedItem.specialist.name,
                                                features: [selectedItem.specialist.role || 'Especialista'],
                                                price: selectedItem.price || 0,
                                                sport: null,
                                                capacity: selectedItem.specialist.capacity || 1
                                            }]
                                            : [{
                                                id: selectedItem?.id || 'no-specialist',
                                                name: 'Sin profesional asignado',
                                                features: ['Servicio'],
                                                price: selectedItem?.price || 0,
                                                sport: null,
                                                capacity: selectedItem?.capacity || 2
                                            }]);

                                    const businessCapacity = business.capacity ||
                                        (resources && resources.length > 0
                                            ? resources.reduce((sum, r) => sum + (r.capacity || 1), 0)
                                            : 1);

                                    const hasPadel = business.type === 'sport' && resources.some(r => r.sport === 'padel');

                                    if (hasPadel) {
                                        const padelCourts = resources.filter(r => r.sport === 'padel');
                                        return (
                                            <PadelBookingFlow
                                                courts={padelCourts}
                                                selectedDate={selectedDate}
                                                existingBookings={existingBookings}
                                                openingTime={open}
                                                closingTime={close}
                                                timeRanges={ranges}
                                                onSlotSelect={(slotData) => {
                                                    setSelectedTime({
                                                        time: slotData.time,
                                                        courtId: slotData.courtId,
                                                        courtName: slotData.courtName,
                                                        price: slotData.price,
                                                        duration: slotData.duration
                                                    });
                                                    setShowModal(true);
                                                }}
                                                sportColor={primaryColor}
                                            />
                                        );
                                    }

                                    return (
                                        <TimeSlotPicker
                                            selectedTime={selectedTime}
                                            onTimeSelect={async (time, courtId, duration, price) => {
                                                if (courtId) {
                                                    const court = resources.find(r => r.id === courtId);
                                                    const courtName = court ? court.name : 'Cancha';
                                                    setSelectedTime({
                                                        time,
                                                        courtId,
                                                        courtName,
                                                        price: price !== undefined ? price : (court ? court.price : 0),
                                                        duration: duration || (business.type === 'service' ? selectedItem.duration : 60)
                                                    });
                                                } else {
                                                    setSelectedTime({
                                                        time,
                                                        courtId: null,
                                                        courtName: null
                                                    });
                                                }

                                                if (business.type === 'service' && selectedItem?.id) {
                                                    setLoadingSpecialists(true);
                                                    try {
                                                        const serviceDuration = selectedItem.duration || 60;
                                                        const dateStr = selectedDate instanceof Date
                                                            ? `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`
                                                            : selectedDate;

                                                        const allBusinessSpecs = business.specialists || [];
                                                        const assignedToService = (selectedItem.specialists && selectedItem.specialists.length > 0)
                                                            ? selectedItem.specialists
                                                            : (selectedItem.specialist_ids && selectedItem.specialist_ids.length > 0)
                                                                ? allBusinessSpecs.filter(s => selectedItem.specialist_ids.includes(s.id))
                                                                : (selectedItem.specialist ? [selectedItem.specialist] : allBusinessSpecs);

                                                        const assignedIds = (selectedItem.specialist_ids && selectedItem.specialist_ids.length > 0)
                                                            ? selectedItem.specialist_ids
                                                            : assignedToService.map(s => s.id);

                                                        let specialists = await serviceAdapter.getAvailableSpecialists(
                                                            selectedItem.id,
                                                            dateStr,
                                                            time,
                                                            serviceDuration,
                                                            business.id
                                                        );

                                                        if (assignedIds.length > 0 && specialists.length > 0) {
                                                            const filtered = specialists.filter(s => assignedIds.includes(s.id));
                                                            specialists = filtered.length > 0 ? filtered : assignedToService;
                                                        }

                                                        if (!specialists || specialists.length === 0) {
                                                            specialists = assignedToService.length > 0
                                                                ? assignedToService
                                                                : (allBusinessSpecs.length > 0 ? allBusinessSpecs : [{ id: 'auto-assigned', name: 'Profesional Asignado', role: 'Especialista' }]);
                                                        }

                                                        setAvailableSpecialists(specialists);
                                                        setSelectedSpecialist(specialists.length === 1 ? specialists[0] : null);
                                                    } catch (error) {
                                                        console.error('Error fetching available specialists:', error);
                                                        const fallbackSpecs = (selectedItem.specialists && selectedItem.specialists.length > 0)
                                                            ? selectedItem.specialists
                                                            : (business.specialists || [{ id: 'auto-assigned', name: 'Profesional Asignado', role: 'Especialista' }]);
                                                        setAvailableSpecialists(fallbackSpecs);
                                                        setSelectedSpecialist(fallbackSpecs.length === 1 ? fallbackSpecs[0] : null);
                                                    } finally {
                                                        setLoadingSpecialists(false);
                                                    }
                                                }
                                            }}
                                            sportColor={primaryColor}
                                            type={business.type}
                                            resources={resources}
                                            openingTime={open}
                                            closingTime={close}
                                            interval={interval}
                                            existingBookings={existingBookings}
                                            timeRanges={ranges}
                                            selectedDate={selectedDate}
                                            maxCapacity={business.max_capacity || 1}
                                            businessCapacity={businessCapacity}
                                            serviceDuration={business.type === 'service' ? (selectedItem?.duration || 60) : null}
                                        />
                                    );
                                })()}

                                {/* Specialist Selector for services */}
                                {business.type === 'service' && selectedTime && !loadingSpecialists && (availableSpecialists.length === 0 || availableSpecialists.length > 1) && (
                                    <div ref={specialistRef} style={{ scrollMarginTop: '80px' }}>
                                        <ProfileSpecialistSelector
                                            availableSpecialists={availableSpecialists}
                                            selectedSpecialist={selectedSpecialist}
                                            setSelectedSpecialist={setSelectedSpecialist}
                                            loadingSpecialists={loadingSpecialists}
                                            isMobile={isMobile}
                                        />
                                    </div>
                                )}
                            </div>
                        </section>
                    )}

                    {/* Venue Booking Section */}
                    {selectedDate && business.type === 'venue' && (
                        <ProfileVenueBookingSection
                            business={business}
                            selectedDate={selectedDate}
                            selectedTime={selectedTime}
                            setSelectedTime={setSelectedTime}
                            selectedDuration={selectedDuration}
                            setSelectedDuration={setSelectedDuration}
                            selectedAdditionalServices={selectedAdditionalServices}
                            setSelectedAdditionalServices={setSelectedAdditionalServices}
                            existingBookings={existingBookings}
                            getBusinessHours={getBusinessHours}
                            primaryColor={primaryColor}
                        />
                    )}

                    {/* Sticky Mobile Confirmation Button */}
                    {selectedTime && !loadingSpecialists && (business.type !== 'sport' || selectedTime.courtId !== null) && !business.courts?.some(c => c.sport === 'padel') && (
                        <div ref={confirmRef} style={{
                            textAlign: 'center',
                            marginTop: '40px',
                            animation: 'slideUp 0.4s ease',
                            position: 'sticky',
                            bottom: '20px',
                            zIndex: 100,
                            padding: '0 10px'
                        }}>
                            <button
                                className="btn-primary"
                                style={{
                                    background: primaryColor,
                                    color: '#fff',
                                    fontSize: '16px',
                                    fontWeight: 'bold',
                                    padding: '16px 40px',
                                    borderRadius: '50px',
                                    border: 'none',
                                    cursor: 'pointer',
                                    boxShadow: `0 10px 30px ${primaryColor}60`,
                                    width: '100%',
                                    maxWidth: '400px'
                                }}
                                onClick={() => setShowModal(true)}
                                disabled={loadingSpecialists}
                            >
                                {loadingSpecialists ? 'Cargando...' : 'Continuar'}
                            </button>
                        </div>
                    )}

                    {/* General Info: Map & Grouped Hours */}
                    <ProfileInfoSection
                        business={business}
                        primaryColor={primaryColor}
                    />

                    {/* Business Reviews Section */}
                    {business && (
                        <BusinessReviewsSection
                            businessId={business.id}
                            businessName={business.name}
                            primaryColor={primaryColor}
                        />
                    )}

                    {/* BookingSummary Modal */}
                    {showModal && selectedTime && (
                        <BookingSummary
                            bookingDetails={{
                                businessName: business.name,
                                serviceName: business.type === 'venue' ? `Alquiler ${selectedDuration}hs` : (business.type === 'service' ? selectedItem?.name : selectedItem),
                                specialistName: selectedSpecialist?.name,
                                date: selectedDate instanceof Date
                                    ? `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`
                                    : selectedDate,
                                time: selectedTime.time || selectedTime,
                                duration: selectedTime.duration || (business.type === 'service' ? selectedItem?.duration : 60),
                                price: (selectedTime.price || (business.type === 'service' ? selectedItem?.price : 0)),
                                courtName: business.type === 'sport' ? selectedTime.courtName : null,
                                courtId: business.type === 'sport' ? selectedTime.courtId : null,
                                extras: selectedAdditionalServices,
                                business: business,
                                businessPhone: business.whatsapp || business.phone,
                                businessBank: business.bank_name,
                                businessAccountHolder: business.account_holder,
                                businessAlias: business.bank_alias,
                                businessCBU: business.cbu
                            }}
                            availableExtras={(business?.additional_services || []).filter(s => s.is_active !== false)}
                            activePromotion={activePromotion}
                            sportColor={primaryColor}
                            onClose={() => setShowModal(false)}
                            onConfirm={handleConfirmBooking}
                            isSubmitting={isSubmitting}
                        />
                    )}

                    {/* Booking Success Modal */}
                    {showSuccessModal && (
                        <BookingSuccessModal
                            onClose={() => {
                                setShowSuccessModal(false);
                                navigate('/');
                            }}
                        />
                    )}
                </div>
            </div>

            {/* Instagram-Style Story Viewer Modal */}
            <ProfileStoryViewerModal
                selectedHighlight={selectedHighlight}
                setSelectedHighlight={setSelectedHighlight}
                selectedPhotoIndex={selectedPhotoIndex}
                setSelectedPhotoIndex={setSelectedPhotoIndex}
                storyViewerList={storyViewerList}
                setStoryViewerList={setStoryViewerList}
                activeStories={activeStories}
            />
        </motion.div>
    );
}
