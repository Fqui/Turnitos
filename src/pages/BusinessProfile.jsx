
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
import TimeSlotPicker from '../components/TimeSlotPicker';
import BookingSummary from '../components/BookingSummary';

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
            // Ensure date is a Date object
            const dateObj = date instanceof Date ? date : new Date(date);
            // Use getUTCDay() to avoid timezone shifts when parsing YYYY-MM-DD strings
            const dayIndex = date instanceof Date ? date.getDay() : new Date(date + 'T00:00:00').getDay();
            const dayName = days[dayIndex];
            const schedule = hours[dayName];

            if (schedule && schedule.isOpen) {
                return { open: schedule.open, close: schedule.close, ranges: schedule.ranges };
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
        window.scrollTo(0, 0);
    }, []);

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
                status: 'confirmed'
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
                    <h1 style={{ fontSize: '24px', fontWeight: '900', marginBottom: '8px', color: 'var(--text-primary)' }}>{business.name}</h1>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '16px' }}>
                        <span>📍 {business.location}</span>
                        <span>⭐ {business.rating} (120 reseñas)</span>
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
                    </div>


                </div>

                {/* 3. Booking Flow Steps */}

                {/* Step 1: Select Service (Only for Service businesses) */}
                {business.type === 'service' && (
                    <section style={{ marginBottom: '30px' }}>
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
                {selectedItem && (
                    <section ref={calendarRef} style={{ marginBottom: '30px', animation: 'slideUp 0.4s ease' }}>
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
                            <Calendar
                                selectedDate={selectedDate}
                                onDateSelect={(date) => {
                                    setSelectedDate(date);
                                    setSelectedTime(null);
                                }}
                                sportColor={primaryColor}
                            />
                        </div>
                    </section>
                )}



                {/* Step 3: Select Time */}
                {selectedDate && (
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
                                const interval = (business.type === 'service' && selectedItem?.duration)
                                    ? selectedItem.duration
                                    : (hoursObj?.interval || hoursObj?.duration || 60);

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
                                                Este negocio no abre los días {selectedDate.toLocaleDateString('es-ES', { weekday: 'long' })}.
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
                                            id: 'no-specialist',
                                            name: 'Sin profesional asignado',
                                            features: ['Servicio'],
                                            price: selectedItem?.price || 0,
                                            sport: null
                                        }]);

                                return (
                                    <TimeSlotPicker
                                        selectedTime={selectedTime}
                                        onTimeSelect={setSelectedTime}
                                        sportColor={primaryColor}
                                        type={business.type}
                                        resources={resources}
                                        openingTime={open}
                                        closingTime={close}
                                        interval={interval}
                                        existingBookings={existingBookings}
                                        timeRanges={ranges}
                                        selectedDate={selectedDate}
                                    />
                                );
                            })()}
                        </div>
                    </section>
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
                            serviceName: business.type === 'service' ? selectedItem.name : selectedItem,
                            date: selectedDate,
                            time: selectedTime.time || selectedTime,
                            price: selectedTime.price || (business.type === 'service' ? selectedItem.price : 0),
                            courtName: business.type === 'sport' ? selectedTime.courtName : null,
                            courtId: business.type === 'sport' ? selectedTime.courtId : null
                        }}
                        onClose={() => setShowModal(false)}
                        onConfirm={handleConfirmBooking}
                        isSubmitting={isSubmitting}
                        sportColor={primaryColor}
                    />
                )}
            </div>
        </motion.div >
    );
}
