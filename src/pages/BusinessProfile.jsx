
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import serviceAdapter from '../services/serviceAdapter';
import { findBusinessBySlug } from '../utils/utils';
import ServiceSelector from '../components/ServiceSelector';
import Calendar from '../components/Calendar';
import MonthCalendar from '../components/MonthCalendar';
import TimeSlotPicker from '../components/TimeSlotPicker';
import BookingSummary from '../components/BookingSummary';
import { formatDisplayDate } from '../utils/dateUtils';

// Fix for default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export default function BusinessProfile() {
    const { businessSlug } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const [business, setBusiness] = useState(location.state?.business || null);
    const [loading, setLoading] = useState(!location.state?.business);

    const [selectedItem, setSelectedItem] = useState(null); // Sport (string) or Service (object)
    const [selectedDate, setSelectedDate] = useState(null);
    const [selectedTime, setSelectedTime] = useState(null);
    const [existingBookings, setExistingBookings] = useState([]); // State for bookings on selected date
    const [loadingBookings, setLoadingBookings] = useState(false); // 🆕 Loading state for bookings
    const [showModal, setShowModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Venue specific state
    const [selectedDuration, setSelectedDuration] = useState(null);
    // Gallery state
    const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(null);

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

            console.log('📅 getBusinessHours for', dayName, ':', {
                schedule,
                hasRanges: schedule?.ranges,
                rangesLength: schedule?.ranges?.length
            });

            if (schedule && schedule.isOpen) {
                // Check if split schedule is enabled in the new format (from BusinessSettings)
                if (schedule.isSplit) {
                    // Check split shift (break) - Enforce split even if times are missing (default to 13-16)
                    // This prevents falling back to continuous day if user clears the inputs
                    const breakStart = schedule.breakStart || '13:00';
                    const breakEnd = schedule.breakEnd || '16:00';

                    // Create ranges from the split schedule
                    // Range 1: Open time to Break Start
                    // Range 2: Break End to Close time
                    const derivedRanges = [
                        { open: schedule.open, close: breakStart },
                        { open: breakEnd, close: schedule.close }
                    ];

                    console.log(`🕒 Generated split ranges for ${dayName}:`, derivedRanges);

                    return {
                        open: schedule.open,
                        close: schedule.close,
                        ranges: derivedRanges
                    };
                }

                // Fallback to explicit ranges if they exist (old logic)
                return {
                    open: schedule.open,
                    close: schedule.close,
                    ranges: (schedule.ranges && schedule.ranges.length > 0) ? schedule.ranges : undefined
                };
            }
            return { open: '00:00', close: '00:00' }; // Closed
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
                    // Fetch all businesses and find by slug
                    const allBusinesses = await serviceAdapter.getBusinesses();
                    const foundBusiness = findBusinessBySlug(allBusinesses, businessSlug);

                    console.log('📊 Business data loaded:', foundBusiness);
                    console.log('📋 Services:', foundBusiness?.services);
                    if (foundBusiness?.services) {
                        foundBusiness.services.forEach(service => {
                            console.log(`Service "${service.name}" specialists:`, service.service_specialists);
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
                    console.log('📅 Fetched bookings for date:', dateStr, bookings);
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
    }, [business?.id, selectedDate]);

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

    // Auto-scroll effects
    useEffect(() => {
        if (selectedItem && business?.type === 'service' && calendarRef.current) {
            setTimeout(() => {
                calendarRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 100);
        }
    }, [selectedItem, business]);

    // Auto-scroll to time slots only if business is open
    useEffect(() => {
        if (selectedDate && timeRef.current) {
            const { open, close } = getBusinessHours(selectedDate);
            // Only scroll if the business is open (not 00:00 - 00:00)
            if (open !== '00:00' || close !== '00:00') {
                setTimeout(() => {
                    timeRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 100);
            }
        }
    }, [selectedDate]);
    useEffect(() => {
        if (selectedTime && confirmRef.current) {
            setTimeout(() => {
                confirmRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 100);
        }
    }, [selectedTime]);

    // Theme Management
    useEffect(() => {
        if (business) {
            const root = document.documentElement;
            const body = document.body;
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
            root.style.setProperty('--bg-main', '#F5F7FA');
            root.style.setProperty('--bg-card', '#FFFFFF');
            root.style.setProperty('--text-primary', '#1A1A1A');
            root.style.setProperty('--text-secondary', '#4A4A4A');
            root.style.setProperty('--border', '#E0E0E0');
            // Reset to default light mode background
            body.style.backgroundImage = 'radial-gradient(#E0E0E0 1.5px, transparent 1.5px)';
        };
    }, [business]);

    if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Cargando negocio...</div>;
    if (!business) return <div style={{ padding: 40, textAlign: 'center' }}>Negocio no encontrado</div>;

    // Use custom button color from business or fallback to category-based color
    const primaryColor = business.primaryColor || business.button_color || business.buttonColor ||
        (business.category === 'beauty' ? '#FF4081' :
            business.category === 'health' ? '#2979FF' : '#00E676');

    const handleConfirmBooking = async (finalDetails) => {
        setIsSubmitting(true);

        try {
            const bookingData = {
                businessId: business.id,
                serviceId: business.type === 'service' ? selectedItem.id : null,
                courtId: business.type === 'sport' ? finalDetails.courtId : null,
                date: finalDetails.date,
                time: finalDetails.time,
                customerName: finalDetails.customerName,
                customerPhone: finalDetails.customerPhone,
                price: finalDetails.price,
                status: 'pending',
                // Venue specific fields
                duration: business.type === 'venue' ? (selectedDuration * 60) : (business.type === 'service' ? selectedItem.duration : 60),
                metadata: business.type === 'venue' ? { additionalServices: selectedAdditionalServices } : null,
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
            alert('¡Reserva confirmada con éxito!');
            navigate('/');
        } catch (error) {
            console.error("Booking error:", error);
            alert("Hubo un error al guardar la reserva. Por favor intenta nuevamente.");
        } finally {
            setIsSubmitting(false);
        }

        return { open: '08:00', close: '22:00' };
    };





    const { open, close, ranges } = getBusinessHours(selectedDate);
    const interval = selectedItem?.duration || 60; // Use service duration or default 60 min

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            style={{ paddingBottom: '80px' }}
        >
            {/* 1. Immersive Hero Section */}
            <div style={{
                position: 'relative',
                height: '240px', // Reduced height for mobile
                overflow: 'hidden',
                marginBottom: '-50px'
            }}>
                {/* Use motion.img for shared element transition - Using Banner */}
                <motion.img
                    layoutId={`business-image-${business.id}`}
                    src={business.banner_image || business.banner || business.image}
                    alt={business.name}
                    style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        filter: 'blur(0px)', // Removed blur for better visibility of banner
                    }}
                />

                {/* Gradient Overlay */}
                <div style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'linear-gradient(to bottom, rgba(0,0,0,0.3), rgba(0,0,0,0.6))'
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

            <div className="container" style={{ maxWidth: '800px', margin: '0 auto', padding: '0 16px', position: 'relative', zIndex: 2 }}>

                {/* 2. Business Info Card */}
                <div style={{
                    backgroundColor: 'var(--bg-card)',
                    borderRadius: '24px',
                    padding: '24px 20px',
                    boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
                    textAlign: 'center',
                    marginBottom: '30px',
                    border: '1px solid var(--border)'
                }}>
                    <motion.img
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        src={business.logo || business.image} // Use Logo here
                        alt={business.name}
                        style={{
                            width: '100px',
                            height: '100px',
                            borderRadius: '50%',
                            objectFit: 'cover',
                            border: `4px solid var(--bg-card)`,
                            marginTop: '-74px',
                            marginBottom: '12px',
                            boxShadow: '0 8px 20px rgba(0,0,0,0.2)',
                            backgroundColor: '#fff'
                        }}
                    />
                    <h1 style={{ fontSize: '24px', fontWeight: '900', marginBottom: '8px', color: 'var(--text-primary)' }}>
                        {business.name} <span style={{ color: '#FFD700', fontSize: '0.6em', verticalAlign: 'middle' }}>(PREVIEW)</span>
                    </h1>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '16px' }}>
                        <span>📍 {business.location}</span>
                    </div>

                    {/* Social Media Buttons */}
                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '16px' }}>
                        {/* Instagram */}
                        {business.instagram && (
                            <a
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
                    </div>


                </div>

                {/* Work Gallery */}
                {business.gallery_images && business.gallery_images.length > 0 && (
                    <div id="galeria" style={{ marginBottom: '30px', animation: 'slideUp 0.4s ease' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px', color: 'var(--text-primary)' }}>
                            📸 Nuestra Galería
                        </h3>
                        <div style={{ overflowX: 'auto', whiteSpace: 'nowrap', paddingBottom: '10px', display: 'flex', gap: '12px' }}>
                            {business.gallery_images.map((img, index) => (
                                <img
                                    key={index}
                                    src={img}
                                    alt={`Gallery ${index}`}
                                    onClick={() => setSelectedPhotoIndex(index)}
                                    style={{
                                        width: '280px',
                                        height: '180px',
                                        objectFit: 'cover',
                                        borderRadius: '12px',
                                        flexShrink: 0,
                                        boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
                                        border: '1px solid var(--border)',
                                        cursor: 'pointer'
                                    }}
                                />
                            ))}
                        </div>
                    </div>
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
                                console.log('🎯 Selected service:', service);
                                console.log('👥 Service specialists:', service?.service_specialists);
                                setSelectedItem(service);
                                setSelectedDate(null);
                                setSelectedTime(null);
                            }}
                            color={primaryColor}
                        />
                    </section>
                )}

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
                        <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px', color: 'var(--text-primary)' }}>
                            {business.type === 'service' ? '3. Horarios disponibles' : '2. Horarios disponibles'}
                        </h3>
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
                                        defaultInterval = 90; // Padel: 1.5 hours
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
                                const resources = business.type === 'sport'
                                    ? (business.courts || [])
                                    : (selectedItem?.specialist
                                        ? [{
                                            id: selectedItem.specialist.id,
                                            name: selectedItem.specialist.name,
                                            features: [selectedItem.specialist.role || 'Especialista'],
                                            price: selectedItem.price || 0,
                                            sport: null
                                        }]
                                        : [{
                                            id: selectedItem?.id || 'no-specialist',
                                            name: 'Sin profesional asignado',
                                            features: ['Servicio'],
                                            price: selectedItem?.price || 0,
                                            sport: null
                                        }]);

                                console.log('Business Hours Debug:', { open, close, ranges, date: selectedDate });

                                return (
                                    <TimeSlotPicker
                                        selectedTime={selectedTime}
                                        onTimeSelect={(slot) => {
                                            if (slot.status === 'blocked') {
                                                // If strictly blocked/break, we warn the user but allow proceeding (Administrator override)
                                                // Ideally detailed modal, but for now native confirm is effective to prove interactivity
                                                const confirmUnlock = window.confirm("Este horario está fuera del rango de atención habitual (Horario Cortado). ¿Deseas seleccionarlo de todas formas para crear una excepción?");
                                                if (!confirmUnlock) return;
                                            }
                                            setSelectedTime(slot);
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
                                    />
                                );
                            })()}
                        </div>
                    </section>
                )}

                {/* Venue Booking Section */}
                {selectedDate && business.type === 'venue' && (
                    <>
                        {/* Step 2: Time & Duration */}
                        <section style={{ marginBottom: '30px', animation: 'slideUp 0.4s ease' }}>
                            <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px', color: 'var(--text-primary)' }}>
                                2. Horario y Duración
                            </h3>
                            <div style={{ backgroundColor: 'var(--bg-card)', padding: '20px', borderRadius: '20px', border: '1px solid var(--border)' }}>
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
                                                    const timeStr = `${String(i).padStart(2, '0')}:00`;
                                                    // Check if slot is booked
                                                    const isBooked = existingBookings?.some(booking => {
                                                        const bookingStatus = booking.status?.toLowerCase() || '';
                                                        const blockedStatuses = ['confirmed', 'blocked', 'deposit', 'pending', 'completed'];
                                                        // Ensure DB time matches our formatting (handle HH:MM:SS vs HH:MM)
                                                        const bookingTime = booking.time.substring(0, 5);
                                                        return bookingTime === timeStr && (blockedStatuses.includes(bookingStatus) || bookingStatus !== 'cancelled');
                                                    });

                                                    if (!isBooked) {
                                                        slots.push(i);
                                                    }
                                                }
                                            };

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

                {/* Confirmation Button - Sticky on Mobile */}
                {selectedTime && (
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
                        >
                            Continuar
                        </button>
                    </div>
                )}

                {/* Map and Amenities Section */}
                <section style={{ marginBottom: '30px', marginTop: '40px', animation: 'slideUp 0.4s ease' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px', color: 'var(--text-primary)' }}>
                        Ubicación y Servicios
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

                        {/* Amenities */}
                        <div style={{
                            backgroundColor: 'var(--bg-card)',
                            padding: '20px',
                            borderRadius: '20px',
                            border: '1px solid var(--border)'
                        }}>
                            <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: 'var(--text-primary)' }}>
                                Comodidades
                            </h4>
                            {business.amenities && business.amenities.length > 0 ? (
                                <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: '12px' }}>
                                    {business.amenities.map((amenity, index) => (
                                        <li key={index} style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-secondary)' }}>
                                            <span style={{ color: primaryColor, fontWeight: 'bold' }}>✓</span>
                                            {amenity}
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>No hay comodidades especificadas.</p>
                            )}
                        </div>
                    </div>
                </section>

                {/* Booking Summary Modal */}
                {showModal && (
                    <BookingSummary
                        bookingDetails={{
                            businessName: business.name,
                            serviceName: business.type === 'venue' ? `Alquiler ${selectedDuration}hs` : (business.type === 'service' ? selectedItem.name : selectedItem),
                            date: selectedDate,
                            time: selectedTime.time || selectedTime,
                            price: (selectedTime.price || (business.type === 'service' ? selectedItem.price : 0)) +
                                (business.type === 'venue' ? selectedAdditionalServices.reduce((sum, s) => sum + Number(s.price), 0) : 0),
                            courtName: business.type === 'sport' ? selectedTime.courtName : null,
                            courtId: business.type === 'sport' ? selectedTime.courtId : null,
                            extras: business.type === 'venue' ? selectedAdditionalServices : []
                        }}
                        onClose={() => setShowModal(false)}
                        onConfirm={handleConfirmBooking}
                        isSubmitting={isSubmitting}
                        sportColor={primaryColor}
                    />
                )}
            </div>
            {/* Image Lightbox with Navigation */}
            <AnimatePresence>
                {selectedPhotoIndex !== null && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                            position: 'fixed',
                            inset: 0,
                            backgroundColor: 'rgba(0,0,0,0.92)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 2000,
                            padding: '20px'
                        }}
                        onClick={() => setSelectedPhotoIndex(null)}
                    >
                        {/* Close Button */}
                        <button
                            style={{
                                position: 'absolute',
                                top: '24px',
                                right: '24px',
                                background: 'white',
                                border: 'none',
                                borderRadius: '50%',
                                width: '44px',
                                height: '44px',
                                cursor: 'pointer',
                                fontSize: '24px',
                                color: 'black',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                                zIndex: 2001
                            }}
                        >
                            ×
                        </button>

                        {/* Navigation Buttons */}
                        {business.gallery_images.length > 1 && (
                            <>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedPhotoIndex((prev) => (prev > 0 ? prev - 1 : business.gallery_images.length - 1));
                                    }}
                                    style={{
                                        position: 'absolute',
                                        left: '20px',
                                        background: 'rgba(255,255,255,0.1)',
                                        border: '1px solid rgba(255,255,255,0.2)',
                                        borderRadius: '50%',
                                        width: '50px',
                                        height: '50px',
                                        color: 'white',
                                        fontSize: '24px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        backdropFilter: 'blur(5px)',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    ‹
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedPhotoIndex((prev) => (prev < business.gallery_images.length - 1 ? prev + 1 : 0));
                                    }}
                                    style={{
                                        position: 'absolute',
                                        right: '20px',
                                        background: 'rgba(255,255,255,0.1)',
                                        border: '1px solid rgba(255,255,255,0.2)',
                                        borderRadius: '50%',
                                        width: '50px',
                                        height: '50px',
                                        color: 'white',
                                        fontSize: '24px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        backdropFilter: 'blur(5px)',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    ›
                                </button>
                            </>
                        )}

                        <motion.img
                            key={selectedPhotoIndex}
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            src={business.gallery_images[selectedPhotoIndex]}
                            alt="Detailed view"
                            style={{
                                maxWidth: '100%',
                                maxHeight: '85vh',
                                borderRadius: '16px',
                                boxShadow: '0 0 50px rgba(0,0,0,0.5)',
                                objectFit: 'contain'
                            }}
                            onClick={(e) => e.stopPropagation()}
                        />

                        {/* Image Counter */}
                        <div style={{
                            position: 'absolute',
                            bottom: '30px',
                            color: 'white',
                            fontSize: '14px',
                            background: 'rgba(0,0,0,0.5)',
                            padding: '6px 16px',
                            borderRadius: '20px',
                            backdropFilter: 'blur(10px)'
                        }}>
                            {selectedPhotoIndex + 1} / {business.gallery_images.length}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
