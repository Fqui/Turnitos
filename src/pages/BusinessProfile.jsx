
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import serviceAdapter from '../services/serviceAdapter';
import { findBusinessBySlug, getSubdomain } from '../utils/utils';
import ServiceSelector from '../components/ServiceSelector';
import Calendar from '../components/Calendar';
import MonthCalendar from '../components/MonthCalendar';
import TimeSlotPicker from '../components/TimeSlotPicker';
import PadelBookingFlow from '../components/PadelBookingFlow'; // 🆕 Padel-specific booking flow
import BookingSummary from '../components/BookingSummary';
import SpecialistsShowcase from '../components/SpecialistsShowcase';
import BookingSuccessModal from '../components/BookingSuccessModal';
import { formatDisplayDate } from '../utils/dateUtils';

// Fix for default marker icon
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
    const [existingBookings, setExistingBookings] = useState([]); // State for bookings on selected date
    const [loadingBookings, setLoadingBookings] = useState(false); // 🆕 Loading state for bookings
    const [bookingRefreshTrigger, setBookingRefreshTrigger] = useState(0); // 🆕 Trigger to force refresh
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
    // Gallery state
    const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(null);
    const [selectedHighlight, setSelectedHighlight] = useState(null); // Which highlight category is open
    const [storyViewerList, setStoryViewerList] = useState(null); // Active stories vs permanent highlights being viewed

    // 🎫 Promotion linking state
    const [activePromotion, setActivePromotion] = useState(null);

    // Refs for auto-scrolling
    const calendarRef = useRef(null);
    const timeRef = useRef(null);
    const confirmRef = useRef(null);

    // Helper to parse business hours
    const getBusinessHours = (date) => {
        let hours = business?.hours;

        if (!hours) return { open: '08:00', close: '22:00' };

        // Try to parse if string and looks like JSON
        if (typeof hours === 'string') {
            try {
                if (hours.trim().startsWith('{')) {
                    const parsed = JSON.parse(hours);
                    if (typeof parsed === 'object') {
                        hours = parsed;
                    }
                }
            } catch (e) {
                // Not JSON, continue as string
            }
        }

        // Check special_days override first
        const specialDays = business?.special_days || [];
        if (specialDays.length > 0 && date) {
            const dateObj = date instanceof Date
                ? date
                : new Date(date.includes('T') ? date : date + 'T00:00:00');
            const year = dateObj.getFullYear();
            const month = String(dateObj.getMonth() + 1).padStart(2, '0');
            const day = String(dateObj.getDate()).padStart(2, '0');
            const dateStr = `${year}-${month}-${day}`;

            const matchedSpecialDay = specialDays.find(sd => sd.date === dateStr);
            if (matchedSpecialDay) {
                if (matchedSpecialDay.type === 'closed' || matchedSpecialDay.type === 'holiday') {
                    return { open: '00:00', close: '00:00' }; // Closed all day
                }
                if (matchedSpecialDay.type === 'special_hours' && matchedSpecialDay.open && matchedSpecialDay.close) {
                    return { open: matchedSpecialDay.open, close: matchedSpecialDay.close };
                }
            }
        }

        // Handle new object format (Detailed Schedule)
        if (typeof hours === 'object' && !hours.weekday) {
            if (!date) return { open: '08:00', close: '22:00' };

            const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
            // Ensure date is a Date object, handling timezone issues for string inputs
            // Adding 'T00:00:00' forces browser to parse as local time instead of UTC for ISO dates
            const dateObj = date instanceof Date
                ? date
                : new Date(date.includes('T') ? date : date + 'T00:00:00');

            const dayIndex = dateObj.getDay();
            const dayName = days[dayIndex];
            const schedule = hours[dayName];


            // console.log('📅 getBusinessHours for', dayName, ':', {
            //     schedule,
            //     isOpen: schedule?.isOpen,
            //     isSplit: schedule?.isSplit,
            //     hasRanges: schedule?.ranges,
            //     rangesLength: schedule?.ranges?.length,
            //     breakStart: schedule?.breakStart,
            //     breakEnd: schedule?.breakEnd
            // });

            if (!schedule) {
                return { open: '08:00', close: '23:00' };
            }

            // If day explicitly marked as closed
            if (schedule.isOpen === false) {
                return { open: '00:00', close: '00:00' };
            }
                // console.log('✅ Schedule is OPEN for', dayName);

                // Check if split schedule is enabled in the new format (from BusinessSettings)
                if (schedule.isSplit) {
                    // console.log('🔄 SPLIT SHIFT detected for', dayName);

                    // ✅ NEW LOGIC: Handle open/close + open2/close2 format
                    // This format implies: Shift 1 = open-close, Shift 2 = open2-close2
                    if (schedule.open2 && schedule.close2) {
                        const derivedRanges = [
                            { open: schedule.open, close: schedule.close },
                            { open: schedule.open2, close: schedule.close2 }
                        ];
                        // console.log(`🕒 Generated split ranges (Type 2) for ${dayName}:`, derivedRanges);
                        return {
                            open: schedule.open,
                            close: schedule.close2, // Global close is the end of second shift
                            ranges: derivedRanges
                        };
                    }

                    // Use breakStart/breakEnd (the actual fields saved by BusinessSettings)
                    const breakStart = schedule.breakStart || '13:00';
                    const breakEnd = schedule.breakEnd || '16:00';

                    // Create ranges from the split schedule
                    // Range 1: Open time to Break Start
                    // Range 2: Break End to Close time
                    const derivedRanges = [
                        { open: schedule.open, close: breakStart },
                        { open: breakEnd, close: schedule.close }
                    ];

                    // console.log(`🕒 Generated split ranges for ${dayName}:`, derivedRanges);

                    return {
                        open: schedule.open,
                        close: schedule.close,
                        ranges: derivedRanges
                    };
                }

                // console.log('➡️ Continuous shift for', dayName);

                return {
                    open: schedule.open || '08:00',
                    close: schedule.close || '23:00',
                    ranges: (schedule.ranges && schedule.ranges.length > 0) ? schedule.ranges : undefined
                };
        }

        // Handle legacy object format (weekday/weekend)
        if (typeof hours === 'object' && hours.weekday) {
            // Simple logic: Weekend is Sat/Sun
            const dateObj = date instanceof Date ? date : new Date(date);
            const isWeekend = date && (dateObj.getDay() === 0 || dateObj.getDay() === 6);
            const timeString = isWeekend ? hours.weekend : hours.weekday;

            const matches = timeString.match(/(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})/);
            if (matches && matches.length >= 3) {
                let closeTime = matches[2];
                if (closeTime === '00:00') closeTime = '24:00';
                return { open: matches[1], close: closeTime };
            }
        }

        // Handle legacy string format
        if (typeof hours === 'string') {
            const matches = hours.match(/(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})/);
            if (matches && matches.length >= 3) {
                let closeTime = matches[2];
                if (closeTime === '00:00') closeTime = '24:00';
                return { open: matches[1], close: closeTime };
            }
        }

        return { open: '08:00', close: '22:00' };
    };

    // Scroll to top when component mounts
    useEffect(() => {
        if (location.hash) {
            const id = location.hash.replace('#', '');
            const element = document.getElementById(id);
            if (element) {
                setTimeout(() => {
                    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 500); // Wait for potential content loading
                return;
            }
        }
        window.scrollTo(0, 0);
    }, [location.hash, loading]);

    // Fetch business data if not provided in state
    useEffect(() => {
        if (!business) {
            const fetchBusiness = async () => {
                try {
                    // Fetch specific business by slug
                    const foundBusiness = await serviceAdapter.getBusinessBySlug(businessSlug);

                    // console.log('📊 Business data loaded:', foundBusiness);
                    // console.log('📋 Services:', foundBusiness?.services);
                    if (foundBusiness?.services) {
                        foundBusiness.services.forEach(service => {
                            // console.log(`Service "${service.name}" specialists:`, service.service_specialists);
                        });
                    }

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

    // Fetch bookings when date is selected
    useEffect(() => {
        const fetchBookingsForDate = async () => {
            if (business?.id && selectedDate) {
                setLoadingBookings(true); // 🆕 Start loading
                try {
                    // Format date to YYYY-MM-DD using LOCAL timezone (not UTC)
                    const dateStr = selectedDate instanceof Date
                        ? `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`
                        : selectedDate;

                    const { bookings } = await serviceAdapter.getBookings(business.id, dateStr);
                    // console.log('📅 Fetched bookings for date:', dateStr, bookings);
                    setExistingBookings(bookings || []);
                } catch (error) {
                    console.error("Error fetching bookings:", error);
                    setExistingBookings([]);
                } finally {
                    setLoadingBookings(false); // 🆕 End loading
                }
            } else {
                setExistingBookings([]);
                setLoadingBookings(false);
            }
        };

        fetchBookingsForDate();
    }, [business?.id, selectedDate, bookingRefreshTrigger]); // 🆕 Added bookingRefreshTrigger

    // 🆕 Function to refresh bookings after creating a new one
    const refreshBookings = () => {
        setBookingRefreshTrigger(prev => prev + 1);
    };

    // Auto-select sport logic
    useEffect(() => {
        if (business && business.type === 'sport') {
            const category = business.category?.toLowerCase().trim();

            // Automatically select the sport based on category or available types
            if (category === 'paddle' || category === 'padel') {
                setSelectedItem('paddle');
            } else if (category === 'football' || category === 'futbol' || category === 'fútbol') {
                setSelectedItem('football');
            } else if (business.sport_types && business.sport_types.length > 0) {
                setSelectedItem(business.sport_types[0]);
            } else {
                // Fallback: use category name or 'sport'
                console.warn('⚠️ No specific sport matched, using fallback');
                setSelectedItem(category || 'sport');
            }
        }
    }, [business]);

    // 🎫 Detect promoId in URL and fetch promotion details
    useEffect(() => {
        const promoId = searchParams.get('promoId');
        if (promoId && business) {
            const fetchPromotion = async () => {
                try {
                    const promo = await serviceAdapter.getPromotionById(promoId);
                    if (promo && promo.business_id === business.id) {
                        setActivePromotion(promo);
                        // Auto-select sport if promo has sport_type
                        if (promo.sport_type && business.type === 'sport') {
                            setSelectedItem(promo.sport_type);
                        }
                        // Auto-select service if promo has service_id
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
                // Keep original dot grid for light mode
                body.style.backgroundImage = 'radial-gradient(#E0E0E0 1.5px, transparent 1.5px)';
            } else {
                root.style.setProperty('--bg-main', '#121212');
                root.style.setProperty('--bg-card', '#1E1E1E');
                root.style.setProperty('--text-primary', '#FFFFFF');
                root.style.setProperty('--text-secondary', '#A0A0A0');
                root.style.setProperty('--border', '#333333');
                // More subtle dot grid for dark mode
                body.style.backgroundImage = 'radial-gradient(rgba(255, 255, 255, 0.05) 1.5px, transparent 1.5px)';
            }
        }
        return () => {
            const root = document.documentElement;
            const body = document.body;

            // Remove overrides
            root.style.removeProperty('--primary-paddle');
            root.style.removeProperty('--bg-main');
            root.style.removeProperty('--bg-card');
            root.style.removeProperty('--text-primary');
            root.style.removeProperty('--text-secondary');
            root.style.removeProperty('--border');
            body.style.removeProperty('background-image');
        };
    }, [business]);

    if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Cargando negocio...</div>;
    if (!business) return <div style={{ padding: 40, textAlign: 'center' }}>Negocio no encontrado</div>;

    // Use custom button color from business or fallback to category-based color
    const primaryColor = business.primary_color || business.button_color || business.buttonColor ||
        (business.category === 'beauty' ? '#FF4081' :
            business.category === 'health' ? '#2979FF' : '#00E676');

    const handleConfirmBooking = async (finalDetails) => {
        setIsSubmitting(true);

        try {
            // Auto-assign specialist if not selected (for services)
            let finalSpecialistId = selectedSpecialist?.id;
            if (business.type === 'service' && !finalSpecialistId && availableSpecialists.length > 0) {
                // Auto-assign specialist with lowest booking count (first in sorted array)
                finalSpecialistId = availableSpecialists[0].id;
            }

            // 🎫 Calculate discount from active promotion
            let finalPrice = finalDetails.price;
            let discountApplied = 0;
            if (activePromotion && activePromotion.discount_value > 0) {
                if (activePromotion.discount_type === 'fixed') {
                    discountApplied = Math.min(activePromotion.discount_value, finalPrice);
                } else {
                    // percentage (default)
                    discountApplied = Math.round(finalPrice * (activePromotion.discount_value / 100));
                }
                finalPrice = finalPrice - discountApplied;
            }

            const bookingData = {
                businessId: business.id,
                serviceId: business.type === 'service' ? selectedItem.id : null,
                courtId: business.type === 'sport' ? finalDetails.courtId : null,
                specialistId: business.type === 'service' ? finalSpecialistId : null, // ✅ Include specialist
                date: finalDetails.date,
                time: finalDetails.time,
                customerName: finalDetails.customerName,
                customerPhone: finalDetails.customerPhone,
                price: finalPrice,
                status: 'pending',
                // Venue specific fields - Prioritize selectedTime.duration for Padel
                duration: selectedTime?.duration || finalDetails.duration || (business.type === 'venue' ? (selectedDuration * 60) : (business.type === 'service' ? selectedItem.duration : 60)),
                metadata: business.type === 'venue' ? { additionalServices: selectedAdditionalServices } : null,
                // 🎫 Promo tracking
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

            // Close booking modal and show success modal
            setShowModal(false);
            setShowSuccessModal(true);

            // 🆕 Refresh bookings to show updated timeline
            refreshBookings();

            // Reset selection states
            setSelectedTime(null);

        } catch (error) {
            console.error("Booking error:", error);
            alert("Hubo un error al guardar la reserva. Por favor intenta nuevamente.");
        } finally {
            setIsSubmitting(false);
        }
    };





    const { open, close, ranges } = getBusinessHours(selectedDate);
    const interval = selectedItem?.duration || 60; // Use service duration or default 60 min

    // 🆕 Check if business has padel courts to adjust layout width
    const hasPadelCourts = business.type === 'sport' && business.courts?.some(c => c.sport === 'padel');
    const containerWidth = hasPadelCourts ? '90%' : '800px';

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

    // Filter out expired 24-hour stories
    const validHighlights = rawHighlights.filter(item => {
        if (item.is_story && item.expires_at) {
            return new Date(item.expires_at) > now;
        }
        return true;
    });

    const activeStories = validHighlights.filter(h => h.is_story);
    const permanentHighlights = validHighlights.filter(h => !h.is_story);
    const highlights = activeStories.length > 0 ? [...activeStories, ...permanentHighlights] : permanentHighlights;



    // Helper to format social links
    const getSocialLink = (url, platform) => {
        if (!url) return '';
        if (url.startsWith('http://') || url.startsWith('https://')) return url;

        switch (platform) {
            case 'instagram': return `https://instagram.com/${url.replace('@', '')}`;
            case 'facebook': return `https://facebook.com/${url}`;
            case 'tiktok': return `https://tiktok.com/@${url.replace('@', '')}`;
            case 'website': return `https://${url}`;
            default: return url;
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="business-profile-page"
            style={{ paddingBottom: '80px', width: '100%', overflowX: 'clip' }}
        >
            {/* 1. Immersive Hero Section */}
            {/* Header / Banner */}
            <div style={{
                position: 'relative',
                height: window.innerWidth <= 768 ? '25vh' : '40vh',
                minHeight: window.innerWidth <= 768 ? '180px' : '250px',
                overflow: 'hidden'
            }}>
                <motion.img
                    layoutId={`business-image-${business.id}`}
                    src={selectedItem?.image_url || business.banner_image || business.image}
                    alt={business.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    transition={{ duration: 0.5, ease: "circOut" }}
                />
                <div style={{
                    position: 'absolute',
                    top: 0, left: 0, right: 0, bottom: 0,
                    background: 'linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.6) 100%)'
                }}></div>

                <button
                    onClick={() => navigate('/')}
                    style={{
                        position: 'absolute',
                        top: '16px',
                        left: '16px',
                        background: 'rgba(0,0,0,0.3)',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: '50%',
                        width: '40px',
                        height: '40px',
                        color: '#fff',
                        cursor: 'pointer',
                        zIndex: 10,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s ease'
                    }}
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M19 12H5" />
                        <path d="M12 19l-7-7 7-7" />
                    </svg>
                </button>
            </div>

            <div className="container" style={{ maxWidth: containerWidth, margin: '0 auto', padding: '0 16px', position: 'relative', zIndex: 2 }}>

                {/* 2. Business Info Card */}
                <div style={{
                    backgroundColor: 'var(--bg-card)',
                    borderRadius: '24px',
                    padding: '24px 20px',
                    boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
                    textAlign: 'center',
                    marginTop: '-40px',
                    marginBottom: '30px',
                    border: '1px solid var(--border)'
                }}>
                    {/* Business Profile Avatar with Instagram Story Gradient Ring (Only active for 24h stories) */}
                    <div
                        onClick={() => {
                            if (activeStories && activeStories.length > 0) {
                                setStoryViewerList(activeStories);
                                setSelectedPhotoIndex(0);
                                setSelectedHighlight(0);
                            }
                        }}
                        style={{
                            width: '106px',
                            height: '106px',
                            borderRadius: '50%',
                            padding: '3px',
                            background: activeStories.length > 0
                                ? 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)'
                                : 'var(--border)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '-74px auto 12px',
                            cursor: activeStories.length > 0 ? 'pointer' : 'default',
                            boxShadow: '0 8px 20px rgba(0,0,0,0.2)',
                            position: 'relative'
                        }}
                        title={activeStories.length > 0 ? "Ver Historias (24hs)" : business.name}
                    >
                        <div style={{
                            width: '100%',
                            height: '100%',
                            borderRadius: '50%',
                            padding: '3px',
                            background: 'var(--bg-card)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <img
                                src={business.logo || business.image}
                                alt={business.name}
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    borderRadius: '50%',
                                    objectFit: 'cover'
                                }}
                            />
                        </div>
                    </div>
                    <h1 style={{ fontSize: '24px', fontWeight: '900', marginBottom: '8px', color: 'var(--text-primary)' }}>{business.name}</h1>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '16px' }}>
                        <span>📍 {business.location}</span>
                    </div>

                    {/* Social Media Buttons */}
                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '16px' }}>
                        {/* Instagram */}
                        {business.instagram && (
                            <a
                                href={getSocialLink(business.instagram, 'instagram')}
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
                                    transition: 'transform 0.2s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                                </svg>
                            </a>
                        )}

                        {/* Facebook */}
                        {business.facebook && (
                            <a
                                href={getSocialLink(business.facebook, 'facebook')}
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
                                    transition: 'transform 0.2s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                                </svg>
                            </a>
                        )}

                        {/* WhatsApp */}
                        {business.whatsapp && (
                            <a
                                href={`https://wa.me/${business.whatsapp}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '50%',
                                    backgroundColor: '#25D366',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    transition: 'transform 0.2s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                                </svg>
                            </a>
                        )}

                        {/* TikTok */}
                        {business.tiktok && (
                            <a
                                href={getSocialLink(business.tiktok, 'tiktok')}
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
                                    transition: 'transform 0.2s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                                    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
                                </svg>
                            </a>
                        )}

                        {/* Website */}
                        {business.website && (
                            <a
                                href={getSocialLink(business.website, 'website')}
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
                                    transition: 'transform 0.2s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                                    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
                                </svg>
                            </a>
                        )}

                        {/* Website */}
                        {business.website && (
                            <a
                                href={business.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '50%',
                                    backgroundColor: '#333333',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    transition: 'transform 0.2s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
                                </svg>
                            </a>
                        )}
                    </div>


                </div>

                {/* Specialists Showcase - High Priority for Services (Only show if more than 1) */}
                {business.type === 'service' && business.specialists && business.specialists.length > 1 && (
                    <SpecialistsShowcase
                        specialists={business.specialists}
                        businessType={business.type}
                    />
                )}

                {/* Instagram-Style Highlights */}
                {business && (
                    (() => {
                        // Use gallery_highlights if available, otherwise convert gallery_images
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

                        if (permanentHighlights.length === 0) return null;

                        return (
                            <div id="galeria" style={{ marginBottom: '20px', animation: 'slideUp 0.4s ease' }}>
                                <div className="highlights-container">
                                    {permanentHighlights.map((highlight, index) => (
                                        <div
                                            key={highlight.id || index}
                                            onClick={() => {
                                                setStoryViewerList(permanentHighlights);
                                                setSelectedPhotoIndex(0);
                                                setSelectedHighlight(index);
                                            }}
                                            style={{
                                                flexShrink: 0,
                                                scrollSnapAlign: 'start',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                gap: '8px'
                                            }}
                                        >
                                            {/* Circular thumbnail with clean subtle border */}
                                            <div style={{
                                                width: '90px',
                                                height: '90px',
                                                borderRadius: '50%',
                                                padding: '2px',
                                                background: 'var(--border)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}>
                                                <div style={{
                                                    width: '100%',
                                                    height: '100%',
                                                    borderRadius: '50%',
                                                    padding: '2px',
                                                    background: 'var(--bg-card)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center'
                                                }}>
                                                    <img
                                                        src={highlight.cover_image || highlight.images[0]}
                                                        alt={highlight.title}
                                                        style={{
                                                            width: '100%',
                                                            height: '100%',
                                                            objectFit: 'cover',
                                                            borderRadius: '50%'
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                            {/* Highlight title */}
                                            <span style={{
                                                fontSize: '12px',
                                                color: 'var(--text-secondary)',
                                                maxWidth: '90px',
                                                textAlign: 'center',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap'
                                            }}>
                                                 {highlight.title}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })()
                )}

                {/* 3. Booking Flow Steps */}

                {/* Venue: Pricing & Services Info (Step 0) */}
                {business.type === 'venue' && (
                    <>
                        {/* Pricing Card */}
                        <section style={{ marginBottom: '30px' }}>
                            <div style={{
                                backgroundColor: 'var(--bg-card)',
                                padding: '24px',
                                borderRadius: '20px',
                                boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
                                border: '1px solid var(--border)',
                                textAlign: 'center'
                            }}>
                                <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: '600' }}>
                                    💰 Precio por Hora
                                </div>
                                <div style={{
                                    fontSize: '48px',
                                    fontWeight: '900',
                                    color: primaryColor,
                                    marginBottom: '8px',
                                    lineHeight: '1'
                                }}>
                                    ${business.price_per_hour || 0}
                                </div>
                                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                                    El precio final dependerá de la duración del alquiler
                                </div>
                            </div>
                        </section>

                        {/* Included Amenities */}
                        {business.included_amenities && business.included_amenities.length > 0 && (
                            <section style={{ marginBottom: '30px' }}>
                                <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px', color: 'var(--text-primary)' }}>
                                    ✨ Incluido en el Alquiler
                                </h3>
                                <div style={{
                                    backgroundColor: 'var(--bg-card)',
                                    padding: '20px',
                                    borderRadius: '20px',
                                    border: '1px solid var(--border)'
                                }}>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                        {business.included_amenities.map((amenity, index) => (
                                            <span key={index} style={{
                                                padding: '8px 16px',
                                                borderRadius: '12px',
                                                backgroundColor: `${primaryColor}15`,
                                                color: 'var(--text-primary)',
                                                fontSize: '14px',
                                                fontWeight: '500',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px'
                                            }}>
                                                <span style={{ color: primaryColor }}>✓</span>
                                                {amenity}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </section>
                        )}

                        {/* Additional Services */}
                        {business.additional_services && business.additional_services.length > 0 && (
                            <section style={{ marginBottom: '30px' }}>
                                <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px', color: 'var(--text-primary)' }}>
                                    🎯 Servicios Adicionales Disponibles
                                </h3>
                                <div style={{ display: 'grid', gap: '12px' }}>
                                    {business.additional_services.map((service, index) => (
                                        <div
                                            key={index}
                                            style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                padding: '16px 20px',
                                                borderRadius: '16px',
                                                backgroundColor: 'var(--bg-card)',
                                                border: '1px solid var(--border)',
                                                transition: 'all 0.2s ease'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.borderColor = primaryColor;
                                                e.currentTarget.style.backgroundColor = `${primaryColor}05`;
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.borderColor = 'var(--border)';
                                                e.currentTarget.style.backgroundColor = 'var(--bg-card)';
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <span style={{ fontSize: '28px' }}>{service.icon || '🎯'}</span>
                                                <div>
                                                    <div style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '15px' }}>
                                                        {service.name}
                                                    </div>
                                                </div>
                                            </div>
                                            <div style={{
                                                fontSize: '18px',
                                                fontWeight: '700',
                                                color: primaryColor
                                            }}>
                                                +${service.price}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div style={{
                                    marginTop: '12px',
                                    padding: '12px',
                                    backgroundColor: `${primaryColor}10`,
                                    borderRadius: '12px',
                                    fontSize: '13px',
                                    color: 'var(--text-secondary)',
                                    textAlign: 'center'
                                }}>
                                    💡 Podrás seleccionar estos servicios al momento de reservar
                                </div>
                            </section>
                        )}
                    </>
                )}

                {/* 🎫 Active Promotion Banner */}
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

                {/* Step 1: Select Service (Only for Service businesses) */}
                {business.type === 'service' && (
                    <section id="servicios" style={{ marginBottom: '30px' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px', color: 'var(--text-primary)' }}>
                            1. Elige un servicio
                        </h3>
                        <ServiceSelector
                            services={business.services}
                            selected={selectedItem}
                            onSelect={(service) => {
                                // console.log('🎯 Selected service:', service);
                                // console.log('👥 Service specialists:', service?.service_specialists);
                                setSelectedItem(service);
                                setSelectedDate(null);
                                setSelectedTime(null);

                                // 🆕 Auto-scroll to calendar for all devices
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

                {/* 5. Store Promotion Section (Tienda del Negocio) - Solo si el negocio tiene tienda habilitada */}
                {business.store_enabled && (() => {
                    const storeProducts = (business.metadata?.store_products && business.metadata.store_products.length > 0)
                        ? business.metadata.store_products.filter(p => p.is_active !== false)
                        : [];

                    if (storeProducts.length === 0) return null;

                    const storeSubtitle = business.metadata?.store_banner_title || business.metadata?.store_banner_subtitle || 'Elegí tus productos y retiralos cuando vengas a jugar';

                    return (
                        <section style={{ 
                            marginBottom: '30px',
                            padding: '20px',
                            background: 'linear-gradient(135deg, var(--bg-card) 0%, rgba(255,255,255,0.01) 100%)',
                            borderRadius: '24px',
                            border: '1px solid var(--border)',
                            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                            backdropFilter: 'blur(10px)'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                <div>
                                    <h3 style={{ fontSize: '16px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                                        🛍️ Tienda {business.name}
                                    </h3>
                                    <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>{storeSubtitle}</p>
                                </div>
                                <button 
                                    onClick={() => {
                                        const subdomain = getSubdomain();
                                        navigate(subdomain ? '/tienda' : `/${business.slug}/tienda`);
                                    }}
                                    style={{
                                        padding: '6px 14px',
                                        borderRadius: '20px',
                                        border: 'none',
                                        background: 'rgba(255,255,255,0.08)',
                                        color: 'var(--text-primary)',
                                        fontWeight: '700',
                                        fontSize: '11px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        cursor: 'pointer',
                                        transition: 'background 0.2s',
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                                >
                                    Ver Tienda ➔
                                </button>
                            </div>

                            <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '8px', msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
                                {storeProducts.map((prod, idx) => (
                                    <div 
                                        key={prod.id || idx}
                                        onClick={() => {
                                            const subdomain = getSubdomain();
                                            navigate(subdomain ? '/tienda' : `/${business.slug}/tienda`);
                                        }}
                                        style={{
                                            flexShrink: 0,
                                            width: '130px',
                                            background: 'var(--bg-main)',
                                            border: '1px solid var(--border)',
                                            borderRadius: '16px',
                                            padding: '10px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            justifyContent: 'space-between',
                                            transition: 'transform 0.2s',
                                            boxShadow: '0 4px 12px rgba(0,0,0,0.02)'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                                        onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                                    >
                                        <div style={{ height: '70px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'white', borderRadius: '12px', marginBottom: '8px', overflow: 'hidden' }}>
                                            <img src={prod.image || prod.images?.[0] || 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=200&q=80'} alt={prod.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        </div>
                                        <h4 style={{ fontSize: '11px', fontWeight: '700', margin: '0 0 4px 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-primary)' }}>{prod.name}</h4>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px' }}>
                                            <span style={{ fontSize: '11px', fontWeight: '800', color: primaryColor }}>${Number(prod.price).toLocaleString('es-AR')}</span>
                                            <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>➔</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    );
                })()}

                {/* Step 2: Select Date */}
                {(selectedItem || business.type === 'venue') && (
                    <section
                        id={business.type === 'service' ? 'calendario' : 'servicios'}
                        ref={calendarRef}
                        style={{ marginBottom: '30px', animation: 'slideUp 0.4s ease' }}
                    >
                        <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px', color: 'var(--text-primary)' }}>
                            {business.type === 'service' ? '2. Selecciona una fecha' : '1. Selecciona una fecha'}
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



                {/* Step 3: Select Time (For Sport/Service) */}
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
                                // Get business hours for selected date
                                const businessHours = getBusinessHours(selectedDate);
                                const { open, close, ranges } = businessHours;

                                // Parse hours if string to get duration
                                let hoursObj = business.hours;
                                if (typeof hoursObj === 'string') {
                                    try {
                                        hoursObj = JSON.parse(hoursObj);
                                    } catch (e) {
                                        console.error('Error parsing hours for duration:', e);
                                        hoursObj = {};
                                    }
                                }

                                // Determine default interval based on rules
                                let defaultInterval = 60; // Default (Football, Venue, etc.)

                                if (business.type === 'service') {
                                    defaultInterval = 30; // Services: every 30 mins
                                } else if (business.type === 'sport') {
                                    // Check selected sport or category
                                    const sportName = typeof selectedItem === 'string'
                                        ? selectedItem.toLowerCase()
                                        : (business.category || '').toLowerCase();

                                    if (sportName.includes('padel') || sportName.includes('paddle')) {
                                        defaultInterval = 30; // Padel: every 30 mins for flexible duration
                                    }
                                }

                                // Use configured interval from DB if valid, otherwise use type-based default
                                const interval = (hoursObj?.interval && hoursObj.interval > 0)
                                    ? hoursObj.interval
                                    : defaultInterval;

                                // Check if business is closed (open and close are both 00:00)
                                const isClosed = open === '00:00' && close === '00:00';

                                // If closed, show a message
                                if (isClosed) {
                                    return (
                                        <div style={{
                                            textAlign: 'center',
                                            padding: '40px 20px',
                                            color: 'var(--text-secondary)'
                                        }}>
                                            <div style={{
                                                fontSize: '48px',
                                                marginBottom: '16px',
                                                opacity: 0.5
                                            }}>
                                                🔒
                                            </div>
                                            <h4 style={{
                                                fontSize: '18px',
                                                fontWeight: 'bold',
                                                marginBottom: '8px',
                                                color: 'var(--text-primary)'
                                            }}>
                                                Cerrado
                                            </h4>
                                            <p style={{ fontSize: '14px' }}>
                                                Este negocio no abre el día {formatDisplayDate(selectedDate)}.
                                            </p>
                                            <p style={{ fontSize: '14px', marginTop: '8px' }}>
                                                Por favor, selecciona otro día.
                                            </p>
                                        </div>
                                    );
                                }

                                // 🆕 Show loading state while fetching bookings
                                if (loadingBookings) {
                                    return (
                                        <div style={{
                                            textAlign: 'center',
                                            padding: '60px 20px',
                                            color: 'var(--text-secondary)'
                                        }}>
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
                                            <style>{`
                                                @keyframes spin {
                                                    0% { transform: rotate(0deg); }
                                                    100% { transform: rotate(360deg); }
                                                }
                                            `}</style>
                                        </div>
                                    );
                                }

                                // Otherwise, show time slots
                                // For services, we need to get the actual resource from the resources table
                                // which has the capacity field
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
                                            capacity: selectedItem?.capacity || 2 // ✅ Use capacity from service/resource
                                        }]);

                                // console.log('🔍 Resources Debug:', resources);
                                // console.log('🔍 Selected Item:', selectedItem);

                                // console.log('Business Hours Debug:', { open, close, ranges, date: selectedDate });

                                // Get business capacity directly from business.capacity field, falling back to resources sum
                                const businessCapacity = business.capacity || 
                                    (resources && resources.length > 0 
                                        ? resources.reduce((sum, r) => sum + (r.capacity || 1), 0) 
                                        : 1);

                                // 🆕 Detect if this is a padel business
                                const hasPadelCourts = business.type === 'sport' && resources.some(r => r.sport === 'padel');

                                // 🆕 Render PadelBookingFlow for padel courts
                                if (hasPadelCourts) {
                                    const padelCourts = resources.filter(r => r.sport === 'padel');

                                    return (
                                        <PadelBookingFlow
                                            courts={padelCourts}
                                            selectedDate={selectedDate}
                                            existingBookings={existingBookings}
                                            openingTime={open}
                                            closingTime={close}
                                            timeRanges={ranges} // 🆕 Pass timeRanges for split shifts
                                            onSlotSelect={(slotData) => {
                                                // slotData: { courtId, courtName, time, duration, price }
                                                setSelectedTime({
                                                    time: slotData.time,
                                                    courtId: slotData.courtId,
                                                    courtName: slotData.courtName,
                                                    price: slotData.price,
                                                    duration: slotData.duration
                                                });

                                                // Auto-open booking modal for Padel
                                                setShowModal(true);
                                            }}
                                            sportColor={primaryColor}
                                        />
                                    );
                                }

                                // Regular TimeSlotPicker for non-padel sports and services
                                return (
                                    <TimeSlotPicker
                                        selectedTime={selectedTime}
                                        onTimeSelect={async (time, courtId, duration, price) => {
                                            // New signature: (time, courtId, duration, price)
                                            // time: selected time slot string (e.g., "14:00")
                                            // courtId: selected court's ID (or null if just time selected)
                                            // duration: duration in minutes for padel (60, 90, 120) - optional
                                            // price: final price for padel - optional

                                            if (courtId) {
                                                // Full selection: time + court
                                                const court = resources.find(r => r.id === courtId);
                                                const courtName = court ? court.name : 'Cancha';

                                                setSelectedTime({
                                                    time,
                                                    courtId,
                                                    courtName,
                                                    price: price !== undefined ? price : (court ? court.price : 0), // Use padel price or court price
                                                    duration: duration || (business.type === 'service' ? selectedItem.duration : 60) // Use padel duration or default
                                                });
                                            } else {
                                                // Just time selected (no court yet)
                                                setSelectedTime({
                                                    time,
                                                    courtId: null,
                                                    courtName: null
                                                });
                                            }

                                            // For service businesses: fetch available specialists
                                            if (business.type === 'service' && selectedItem?.id) {
                                                setLoadingSpecialists(true);
                                                try {
                                                    const serviceDuration = selectedItem.duration || 60;
                                                    const dateStr = selectedDate instanceof Date
                                                        ? `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`
                                                        : selectedDate;

                                                    const specialists = await serviceAdapter.getAvailableSpecialists(
                                                        selectedItem.id,
                                                        dateStr,
                                                        time,
                                                        serviceDuration,
                                                        business.id // Pass business ID for fallback logic
                                                    );

                                                    setAvailableSpecialists(specialists);

                                                    // Auto-assign if only one specialist available
                                                    if (specialists.length === 1) {
                                                        setSelectedSpecialist(specialists[0].id);
                                                    } else {
                                                        setSelectedSpecialist(null);
                                                    }
                                                } catch (error) {
                                                    console.error('Error fetching available specialists:', error);
                                                    setAvailableSpecialists([]);
                                                    setSelectedSpecialist(null);
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
                                        businessCapacity={businessCapacity} // ✅ Pass business capacity
                                        serviceDuration={business.type === 'service' ? (selectedItem?.duration || 60) : null} // 🆕 Pass service duration for validation
                                    />
                                );
                            })()}

                            {/* Specialist Selector - Only for service businesses */}
                            {business.type === 'service' && selectedTime && !loadingSpecialists && (availableSpecialists.length === 0 || availableSpecialists.length > 1) && (
                                <div style={{
                                    marginTop: '24px',
                                    padding: '20px',
                                    background: 'var(--bg-card)',
                                    borderRadius: '12px',
                                    border: '1px solid var(--border)'
                                }}>
                                    <h4 style={{
                                        fontSize: '16px',
                                        fontWeight: '600',
                                        marginBottom: '12px',
                                        color: 'var(--text-primary)'
                                    }}>
                                        Especialista
                                    </h4>

                                    {loadingSpecialists ? (
                                        <div style={{ padding: '12px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                            Cargando especialistas disponibles...
                                        </div>
                                    ) : availableSpecialists.length === 0 ? (
                                        <div style={{
                                            padding: '12px',
                                            background: 'rgba(255, 0, 0, 0.05)',
                                            borderRadius: '8px',
                                            color: 'var(--error)',
                                            fontSize: '14px'
                                        }}>
                                            ⚠️ No hay especialistas disponibles para este horario
                                        </div>
                                     ) : (
                                         <div style={{ display: 'grid', gap: '10px', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr' }}>
                                             {/* "Cualquier especialista" Option */}
                                             <div
                                                 onClick={() => setSelectedSpecialist(null)}
                                                 style={{
                                                     display: 'flex',
                                                     alignItems: 'center',
                                                     gap: '12px',
                                                     padding: '12px',
                                                     borderRadius: '12px',
                                                     border: !selectedSpecialist ? '2px solid var(--primary-paddle)' : '1px solid var(--border)',
                                                     background: !selectedSpecialist ? 'rgba(132, 204, 22, 0.05)' : 'var(--bg-main)',
                                                     cursor: 'pointer',
                                                     transition: 'all 0.2s ease',
                                                     boxShadow: !selectedSpecialist ? '0 4px 12px rgba(132, 204, 22, 0.15)' : 'none',
                                                     gridColumn: isMobile ? 'span 1' : 'span 2'
                                                 }}
                                             >
                                                 <div style={{
                                                     width: '40px',
                                                     height: '40px',
                                                     borderRadius: '50%',
                                                     background: 'var(--border)',
                                                     display: 'flex',
                                                     alignItems: 'center',
                                                     justifyContent: 'center',
                                                     fontSize: '18px'
                                                 }}>
                                                     👥
                                                 </div>
                                                 <div style={{ flex: 1, minWidth: 0 }}>
                                                     <div style={{
                                                         fontWeight: '700',
                                                         fontSize: '14px',
                                                         color: !selectedSpecialist ? 'var(--primary-paddle)' : 'var(--text-primary)'
                                                     }}>
                                                         Cualquier especialista
                                                     </div>
                                                     <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                                         Asignación automática
                                                     </div>
                                                 </div>
                                                 <div style={{
                                                     width: '20px',
                                                     height: '20px',
                                                     borderRadius: '50%',
                                                     border: !selectedSpecialist ? 'none' : '2px solid var(--border)',
                                                     background: !selectedSpecialist ? 'var(--primary-paddle)' : 'transparent',
                                                     display: 'flex',
                                                     alignItems: 'center',
                                                     justifyContent: 'center',
                                                     transition: 'all 0.2s'
                                                 }}>
                                                     {!selectedSpecialist && (
                                                         <svg width="10" height="8" viewBox="0 0 10 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                             <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                                         </svg>
                                                     )}
                                                 </div>
                                             </div>

                                             {/* Available Specialists list */}
                                             {availableSpecialists.map(specialist => {
                                                 const isSelected = selectedSpecialist?.id === specialist.id;
                                                 const avatarUrl = specialist.avatar_url || specialist.image_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(specialist.name)}&background=random&size=100`;
                                                 return (
                                                     <div
                                                         key={specialist.id}
                                                         onClick={() => setSelectedSpecialist(specialist)}
                                                         style={{
                                                             display: 'flex',
                                                             alignItems: 'center',
                                                             gap: '12px',
                                                             padding: '12px',
                                                             borderRadius: '12px',
                                                             border: isSelected ? '2px solid var(--primary-paddle)' : '1px solid var(--border)',
                                                             background: isSelected ? 'rgba(132, 204, 22, 0.05)' : 'var(--bg-main)',
                                                             cursor: 'pointer',
                                                             transition: 'all 0.2s ease',
                                                             boxShadow: isSelected ? '0 4px 12px rgba(132, 204, 22, 0.15)' : 'none'
                                                         }}
                                                     >
                                                         <img
                                                             src={avatarUrl}
                                                             alt={specialist.name}
                                                             style={{
                                                                 width: '40px',
                                                                 height: '40px',
                                                                 borderRadius: '50%',
                                                                 objectFit: 'cover',
                                                                 border: '2px solid var(--bg-card)'
                                                             }}
                                                         />
                                                         <div style={{ flex: 1, minWidth: 0 }}>
                                                             <div style={{
                                                                 fontWeight: '700',
                                                                 fontSize: '14px',
                                                                 color: isSelected ? 'var(--primary-paddle)' : 'var(--text-primary)',
                                                                 whiteSpace: 'nowrap',
                                                                 overflow: 'hidden',
                                                                 textOverflow: 'ellipsis'
                                                             }}>
                                                                 {specialist.name}
                                                             </div>
                                                             <div style={{
                                                                 fontSize: '11px',
                                                                 color: 'var(--text-secondary)',
                                                                 whiteSpace: 'nowrap',
                                                                 overflow: 'hidden',
                                                                 textOverflow: 'ellipsis'
                                                             }}>
                                                                 {specialist.role || 'Especialista'}
                                                             </div>
                                                         </div>
                                                         <div style={{
                                                             width: '20px',
                                                             height: '20px',
                                                             borderRadius: '50%',
                                                             border: isSelected ? 'none' : '2px solid var(--border)',
                                                             background: isSelected ? 'var(--primary-paddle)' : 'transparent',
                                                             display: 'flex',
                                                             alignItems: 'center',
                                                             justifyContent: 'center',
                                                             transition: 'all 0.2s'
                                                         }}>
                                                             {isSelected && (
                                                                 <svg width="10" height="8" viewBox="0 0 10 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                                     <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                                                 </svg>
                                                             )}
                                                         </div>
                                                     </div>
                                                 );
                                             })}
                                         </div>
                                     )}
                                </div>
                            )}
                        </div>
                    </section>
                )}

                {/* Venue Booking Section */}
                {selectedDate && business.type === 'venue' && (
                    <>
                        {/* Step 2: Time & Duration */}
                        <section style={{ marginBottom: '30px', animation: 'slideUp 0.4s ease' }}>
                            <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px', color: 'var(--text-primary)' }}>
                                2. {business.pricing_model === 'daily' ? 'Disponibilidad y Tarifa' : 'Horario y Duración'}
                            </h3>
                            <div style={{ backgroundColor: 'var(--bg-card)', padding: '20px', borderRadius: '20px', border: '1px solid var(--border)' }}>
                                {business.pricing_model === 'daily' ? (
                                    // === DAILY PRICING LOGIC ===
                                    <div>
                                        {(() => {
                                            // Check availability for the whole day
                                            const dateStr = selectedDate instanceof Date
                                                ? `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`
                                                : selectedDate;

                                            const isDayBlocked = existingBookings?.some(booking => {
                                                const bookingStatus = booking.status?.toLowerCase() || '';
                                                const blockedStatuses = ['confirmed', 'blocked', 'deposit', 'pending', 'completed'];
                                                return booking.date === dateStr && (blockedStatuses.includes(bookingStatus) || bookingStatus !== 'cancelled');
                                            });

                                            if (isDayBlocked) {
                                                return (
                                                    <div style={{ textAlign: 'center', padding: '20px', color: '#ef4444' }}>
                                                        <div style={{ fontSize: '24px', marginBottom: '8px' }}>📅❌</div>
                                                        <div style={{ fontWeight: '700' }}>Fecha No Disponible</div>
                                                        <div style={{ fontSize: '14px' }}>Ya existe una reserva confirmada para este día.</div>
                                                    </div>
                                                );
                                            }

                                            const isSelected = selectedTime?.time === '12:00' && selectedTime?.price === parseFloat(business.price_per_day);

                                            return (
                                                <div
                                                    onClick={() => {
                                                        setSelectedTime({
                                                            time: '12:00', // Dummy time for daily bookings
                                                            price: parseFloat(business.price_per_day) || 0,
                                                            duration: 24,
                                                            rentalType: 'daily'
                                                        });
                                                        // Clear specific duration logic if any was set
                                                        setSelectedDuration(24);
                                                    }}
                                                    style={{
                                                        padding: '20px',
                                                        borderRadius: '16px',
                                                        border: isSelected ? `2px solid ${primaryColor}` : '2px solid var(--border)',
                                                        background: isSelected ? `${primaryColor}10` : 'var(--bg-main)',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        alignItems: 'center',
                                                        transition: 'all 0.2s'
                                                    }}
                                                >
                                                    <div>
                                                        <div style={{ fontWeight: '800', fontSize: '18px', color: 'var(--text-primary)', marginBottom: '4px' }}>
                                                            Alquiler Diario Completo
                                                        </div>
                                                        <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                                                            Incluye acceso exclusivo por todo el día
                                                        </div>
                                                    </div>
                                                    <div style={{ textAlign: 'right' }}>
                                                        <div style={{ fontSize: '20px', fontWeight: '800', color: primaryColor }}>
                                                            ${parseFloat(business.price_per_day || 0).toLocaleString()}
                                                        </div>
                                                        {isSelected && (
                                                            <div style={{ fontSize: '12px', fontWeight: '700', color: primaryColor, marginTop: '4px' }}>
                                                                ✓ Seleccionado
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                ) : (
                                    // === HOURLY PRICING LOGIC (Existing) ===
                                    <>
                                        <div style={{ marginBottom: '20px' }}>
                                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: 'var(--text-secondary)' }}>Hora de Inicio</label>
                                            <select
                                                value={selectedTime?.time || ''}
                                                onChange={(e) => {
                                                    const time = e.target.value;
                                                    const price = (business.price_per_hour || 0) * (selectedDuration || 0);
                                                    setSelectedTime({ time, price });
                                                }}
                                                style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-main)', color: 'var(--text-primary)' }}
                                            >
                                                <option value="">Seleccionar hora...</option>
                                                {(() => {
                                                    const { open, close, ranges } = getBusinessHours(selectedDate);
                                                    const slots = [];

                                                    // Helper to add slots for a given range
                                                    const addSlots = (startStr, endStr) => {
                                                        const start = parseInt(startStr.split(':')[0]);
                                                        const end = endStr === '00:00' ? 24 : parseInt(endStr.split(':')[0]);

                                                        for (let i = start; i < end; i++) {
                                                            // Check if slot is booked considering duration
                                                            const isBooked = existingBookings?.some(booking => {
                                                                const bookingStatus = booking.status?.toLowerCase() || '';
                                                                const blockedStatuses = ['confirmed', 'blocked', 'deposit', 'pending', 'completed'];

                                                                if (!blockedStatuses.includes(bookingStatus) && bookingStatus === 'cancelled') return false;

                                                                const bookingStartHour = parseInt(booking.time.split(':')[0]);
                                                                // Default duration to 1 if not present, though venues usually have it set
                                                                const bookingDuration = booking.duration || 1;
                                                                const bookingEndHour = bookingStartHour + bookingDuration;

                                                                // Check if current slot 'i' is within the booking range [start, end)
                                                                return i >= bookingStartHour && i < bookingEndHour && booking.date === dateStr;
                                                            });

                                                            if (!isBooked) {
                                                                slots.push(i);
                                                            }
                                                        }
                                                    };

                                                    // Need dateStr for the check above
                                                    const dateStr = selectedDate instanceof Date
                                                        ? `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`
                                                        : selectedDate;
                                                    ;

                                                    if (ranges && ranges.length > 0) {
                                                        // Handle split shifts / multiple ranges
                                                        ranges.forEach(range => {
                                                            addSlots(range.open, range.close);
                                                        });
                                                    } else {
                                                        // Use standard open/close
                                                        addSlots(open, close);
                                                    }

                                                    if (slots.length === 0) {
                                                        return <option value="" disabled>No hay horarios disponibles</option>;
                                                    }

                                                    // Remove duplicates and sort just in case
                                                    const uniqueSlots = [...new Set(slots)].sort((a, b) => a - b);

                                                    return uniqueSlots.map(hour => (
                                                        <option key={hour} value={`${hour}:00`}>{`${hour}:00`}</option>
                                                    ));
                                                })()}
                                            </select>
                                        </div>

                                        {business.rental_duration_options && (
                                            <div>
                                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: 'var(--text-secondary)' }}>Duración</label>
                                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                                    {business.rental_duration_options.map(hours => (
                                                        <button
                                                            key={hours}
                                                            onClick={() => {
                                                                setSelectedDuration(hours);
                                                                if (selectedTime?.time) {
                                                                    const price = (business.price_per_hour || 0) * hours;
                                                                    setSelectedTime({ ...selectedTime, price });
                                                                }
                                                            }}
                                                            style={{
                                                                padding: '10px 20px',
                                                                borderRadius: '12px',
                                                                border: selectedDuration === hours ? `2px solid ${primaryColor}` : '1px solid var(--border)',
                                                                backgroundColor: selectedDuration === hours ? `${primaryColor}20` : 'transparent',
                                                                color: selectedDuration === hours ? primaryColor : 'var(--text-primary)',
                                                                cursor: 'pointer',
                                                                fontWeight: '600'
                                                            }}
                                                        >
                                                            {hours} hs
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </section>

                        {/* Step 3: Additional Services */}
                        {business.additional_services && business.additional_services.length > 0 && (
                            <section style={{ marginBottom: '30px', animation: 'slideUp 0.4s ease' }}>
                                <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px', color: 'var(--text-primary)' }}>
                                    3. Servicios Adicionales (Opcional)
                                </h3>
                                <div style={{ display: 'grid', gap: '12px' }}>
                                    {business.additional_services.map((service, index) => (
                                        <div
                                            key={index}
                                            onClick={() => {
                                                const isSelected = selectedAdditionalServices.some(s => s.name === service.name);
                                                if (isSelected) {
                                                    setSelectedAdditionalServices(selectedAdditionalServices.filter(s => s.name !== service.name));
                                                } else {
                                                    setSelectedAdditionalServices([...selectedAdditionalServices, service]);
                                                }
                                            }}
                                            style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                padding: '16px',
                                                borderRadius: '12px',
                                                border: selectedAdditionalServices.some(s => s.name === service.name) ? `2px solid ${primaryColor}` : '1px solid var(--border)',
                                                backgroundColor: selectedAdditionalServices.some(s => s.name === service.name) ? `${primaryColor}10` : 'var(--bg-card)',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <span style={{ fontSize: '24px' }}>{service.icon || '✨'}</span>
                                                <div>
                                                    <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{service.name}</div>
                                                    <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>+ ${service.price}</div>
                                                </div>
                                            </div>
                                            <div style={{
                                                width: '24px',
                                                height: '24px',
                                                borderRadius: '50%',
                                                border: `2px solid ${selectedAdditionalServices.some(s => s.name === service.name) ? primaryColor : 'var(--border)'}`,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}>
                                                {selectedAdditionalServices.some(s => s.name === service.name) && <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: primaryColor }} />}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}
                    </>
                )}

                {/* Confirmation Button - Sticky on Mobile (Hidden for Padel since modal opens automatically) */}
                {selectedTime && (business.type !== 'sport' || selectedTime.courtId !== null) && !business.courts?.some(c => c.sport === 'padel') && (
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
                            disabled={loadingSpecialists} // Disable while loading specialists
                        >
                            {loadingSpecialists ? 'Cargando...' : 'Continuar'}
                        </button>
                    </div>
                )}

                {/* BookingSummary Modal */}
                {showModal && selectedTime && (
                    <BookingSummary
                        bookingDetails={{
                            date: selectedDate instanceof Date
                                ? `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`
                                : selectedDate,
                            time: selectedTime.time,
                            courtId: selectedTime.courtId,
                            courtName: selectedTime.courtName,
                            serviceName: selectedItem?.name,
                            specialistName: selectedSpecialist?.name, // Pass specialist name
                            price: selectedTime.price,
                            duration: selectedTime.duration, // 🔥 Pass duration to modal
                            businessPhone: business.phone,
                            business: business, // Pass full business object for settings
                            businessBank: business.bank_name,
                            businessAccountHolder: business.account_holder,
                            businessAlias: business.bank_alias,
                            businessCBU: business.cbu
                        }}
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

                {/* Map and Amenities Section */}
                <section style={{ marginBottom: '30px', marginTop: '40px', animation: 'slideUp 0.4s ease' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px', color: 'var(--text-primary)' }}>
                        Información General
                    </h3>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                        gap: '20px'
                    }}>
                        {/* Map */}
                        {business.latitude && business.longitude && (
                            <div style={{ borderRadius: '20px', overflow: 'hidden', border: '1px solid var(--border)', height: '300px', position: 'relative' }}>
                                <MapContainer
                                    center={[business.latitude, business.longitude]}
                                    zoom={15}
                                    style={{ height: '100%', width: '100%' }}
                                    dragging={false}
                                    scrollWheelZoom={false}
                                >
                                    <TileLayer
                                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                    />
                                    <Marker position={[business.latitude, business.longitude]} />
                                </MapContainer>
                                <a
                                    href={`https://www.google.com/maps/dir/?api=1&destination=${business.latitude},${business.longitude}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                        position: 'absolute',
                                        bottom: '10px',
                                        left: '50%',
                                        transform: 'translateX(-50%)',
                                        padding: '10px 24px',
                                        width: 'auto',
                                        backgroundColor: primaryColor,
                                        color: '#fff',
                                        textDecoration: 'none',
                                        fontWeight: '600',
                                        fontSize: '14px',
                                        textAlign: 'center',
                                        borderRadius: '10px',
                                        boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
                                        zIndex: 1000
                                    }}
                                >
                                    🗺️ Cómo llegar
                                </a>
                            </div>
                        )}

                        {/* Amenities & Hours Combined */}
                        <div style={{
                            backgroundColor: 'var(--bg-card)',
                            padding: '20px',
                            borderRadius: '20px',
                            border: '1px solid var(--border)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '20px'
                        }}>
                            {/* Amenities - Top Half */}
                            <div>
                                <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: 'var(--text-primary)' }}>
                                    Comodidades
                                </h4>
                                {business.amenities && business.amenities.length > 0 ? (
                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(2, 1fr)',
                                        gap: '12px',
                                        fontSize: '14px'
                                    }}>
                                        {business.amenities.map((amenity, index) => (
                                            <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
                                                <span style={{ fontSize: '16px' }}>✓</span>
                                                <span>{amenity}</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>No hay comodidades especificadas.</p>
                                )}
                            </div>

                            {/* Divider */}
                            <div style={{ height: '1px', backgroundColor: 'var(--border)' }}></div>

                            {/* Business Hours - Bottom Half */}
                            <div>
                                <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: 'var(--text-primary)' }}>
                                    🕐 Horarios de Atención
                                </h4>
                                {business.hours ? (
                                    <div style={{ display: 'grid', gap: '10px' }}>
                                        {(() => {
                                            const dayNames = {
                                                monday: 'Lunes',
                                                tuesday: 'Martes',
                                                wednesday: 'Miércoles',
                                                thursday: 'Jueves',
                                                friday: 'Viernes',
                                                saturday: 'Sábado',
                                                sunday: 'Domingo'
                                            };

                                            // Parse hours if string
                                            let hours = business.hours;
                                            if (typeof hours === 'string') {
                                                try {
                                                    hours = JSON.parse(hours);
                                                } catch (e) {
                                                    return <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>No hay horarios especificados.</p>;
                                                }
                                            }

                                            // Handle new object format (per-day schedule) - GROUP BY SAME SCHEDULE
                                            if (typeof hours === 'object' && !hours.weekday) {
                                                // Group days with same schedule
                                                const scheduleGroups = {};

                                                Object.entries(dayNames).forEach(([day, label]) => {
                                                    const schedule = hours[day];

                                                    // Create schedule key
                                                    let scheduleKey;

                                                    // Determine effective Open state
                                                    // Open if: explicitly true, OR (not explicitly false AND has valid times)
                                                    const isValidTime = (t) => t && t !== '00:00';
                                                    const isEffectiveOpen = schedule && (
                                                        schedule.isOpen === true ||
                                                        (schedule.isSplit && schedule.isOpen !== false) ||
                                                        (schedule.isOpen !== false && isValidTime(schedule.open) && isValidTime(schedule.close))
                                                    );

                                                    if (!isEffectiveOpen) {
                                                        scheduleKey = 'CLOSED';
                                                    } else if (schedule.isSplit) {
                                                        // Use breakStart/breakEnd (the actual fields saved by BusinessSettings)
                                                        const breakStart = schedule.breakStart || '13:00';
                                                        const breakEnd = schedule.breakEnd || '16:00';
                                                        scheduleKey = `${schedule.open}-${breakStart}|${breakEnd}-${schedule.close}`;
                                                    } else {
                                                        scheduleKey = `${schedule.open}-${schedule.close}`;
                                                    }

                                                    if (!scheduleGroups[scheduleKey]) {
                                                        scheduleGroups[scheduleKey] = {
                                                            days: [],
                                                            schedule: schedule
                                                        };
                                                    }
                                                    scheduleGroups[scheduleKey].days.push(label);
                                                });

                                                // Render grouped schedules
                                                return Object.entries(scheduleGroups).map(([key, group], index) => {
                                                    if (key === 'CLOSED') {
                                                        return (
                                                            <div key={index} style={{ fontSize: '13px' }}>
                                                                <div style={{ fontWeight: '600', color: 'var(--text-primary)', marginBottom: '4px' }}>
                                                                    {group.days.join(', ')}
                                                                </div>
                                                                <div style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                                                                    Cerrado
                                                                </div>
                                                            </div>
                                                        );
                                                    }

                                                    const schedule = group.schedule;
                                                    let timeDisplay;

                                                    if (schedule.isSplit) {
                                                        const breakStart = schedule.breakStart || '13:00';
                                                        const breakEnd = schedule.breakEnd || '16:00';
                                                        timeDisplay = `${schedule.open} a ${breakStart} | ${breakEnd} a ${schedule.close}`;
                                                    } else {
                                                        timeDisplay = `${schedule.open} a ${schedule.close}`;
                                                    }

                                                    return (
                                                        <div key={index} style={{ fontSize: '13px' }}>
                                                            <div style={{ fontWeight: '600', color: 'var(--text-primary)', marginBottom: '4px' }}>
                                                                {group.days.join(', ')}
                                                            </div>
                                                            <div style={{ color: 'var(--text-secondary)' }}>
                                                                {timeDisplay}
                                                            </div>
                                                        </div>
                                                    );
                                                });
                                            }

                                            // Handle legacy format (weekday/weekend)
                                            if (typeof hours === 'object' && hours.weekday) {
                                                return (
                                                    <>
                                                        <div style={{ fontSize: '13px' }}>
                                                            <div style={{ fontWeight: '600', color: 'var(--text-primary)', marginBottom: '4px' }}>
                                                                Lunes a Viernes
                                                            </div>
                                                            <div style={{ color: 'var(--text-secondary)' }}>
                                                                {hours.weekday}
                                                            </div>
                                                        </div>
                                                        <div style={{ fontSize: '13px' }}>
                                                            <div style={{ fontWeight: '600', color: 'var(--text-primary)', marginBottom: '4px' }}>
                                                                Sábado y Domingo
                                                            </div>
                                                            <div style={{ color: 'var(--text-secondary)' }}>
                                                                {hours.weekend}
                                                            </div>
                                                        </div>
                                                    </>
                                                );
                                            }

                                            // Handle string format
                                            if (typeof hours === 'string') {
                                                return (
                                                    <div style={{ fontSize: '13px' }}>
                                                        <div style={{ fontWeight: '600', color: 'var(--text-primary)', marginBottom: '4px' }}>
                                                            Horario
                                                        </div>
                                                        <div style={{ color: 'var(--text-secondary)' }}>
                                                            {hours}
                                                        </div>
                                                    </div>
                                                );
                                            }

                                            return <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>No hay horarios especificados.</p>;
                                        })()}
                                    </div>
                                ) : (
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>No hay horarios especificados.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </section>





                {/* Booking Summary Modal */}
                {showModal && (
                    <BookingSummary
                        bookingDetails={{
                            businessName: business.name,
                            serviceName: business.type === 'venue' ? `Alquiler ${selectedDuration}hs` : (business.type === 'service' ? selectedItem.name : selectedItem),
                            specialistName: selectedSpecialist?.name, // Pass specialist name
                            date: selectedDate,
                            time: selectedTime.time || selectedTime,
                            duration: selectedTime.duration || (business.type === 'service' ? selectedItem.duration : 60), // Ensure duration is passed
                            price: (selectedTime.price || (business.type === 'service' ? selectedItem.price : 0)), // Base price only
                            courtName: business.type === 'sport' ? selectedTime.courtName : null,
                            courtId: business.type === 'sport' ? selectedTime.courtId : null,
                            extras: [],
                            business: business,
                            businessPhone: business.whatsapp
                        }}
                        availableExtras={(business?.additional_services || []).filter(s => s.is_active !== false)}
                        activePromotion={activePromotion}
                        onClose={() => setShowModal(false)}
                        onConfirm={handleConfirmBooking}
                        isSubmitting={isSubmitting}
                        sportColor={primaryColor}
                    />
                )}
            </div>

            {/* Instagram-Style Highlight Viewer */}
            <AnimatePresence>
                {selectedHighlight !== null && selectedPhotoIndex !== null && business && (
                    (() => {
                        const viewerHighlights = storyViewerList || activeStories;
                        const highlight = viewerHighlights[selectedHighlight];
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
                                            if (selectedHighlight < viewerHighlights.length - 1) {
                                                setSelectedHighlight(selectedHighlight + 1);
                                                setSelectedPhotoIndex(0);
                                            } else {
                                                setSelectedPhotoIndex(null);
                                                setSelectedHighlight(null);
                                                setStoryViewerList(null);
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
        </motion.div >
    );
}

