
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import supabaseService from '../services/supabaseService';
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
    const [showModal, setShowModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Refs for auto-scrolling
    const calendarRef = useRef(null);
    const timeRef = useRef(null);
    const confirmRef = useRef(null);

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
                    const allBusinesses = await supabaseService.getBusinesses();
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
                try {
                    // Format date to YYYY-MM-DD for query
                    const dateStr = selectedDate instanceof Date
                        ? selectedDate.toISOString().split('T')[0]
                        : selectedDate;

                    const { bookings } = await supabaseService.getBookings(business.id, dateStr);
                    console.log('📅 Fetched bookings for date:', dateStr, bookings);
                    setExistingBookings(bookings || []);
                } catch (error) {
                    console.error("Error fetching bookings:", error);
                }
            } else {
                setExistingBookings([]);
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

    useEffect(() => {
        if (selectedDate && timeRef.current) {
            setTimeout(() => {
                timeRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
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

    const primaryColor = business.category === 'beauty' ? '#FF4081' : business.category === 'health' ? '#2979FF' : '#00E676';

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

            await supabaseService.createBooking(bookingData);
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
                        <a
                            href={`https://instagram.com/${business.name.toLowerCase().replace(/\s/g, '')}`}
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
                                color: '#fff',
                                fontSize: '18px',
                                textDecoration: 'none',
                                transition: 'transform 0.2s',
                                cursor: 'pointer'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                        >
                            📷
                        </a>
                        <a
                            href={`https://facebook.com/${business.name.toLowerCase().replace(/\s/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '50%',
                                background: '#1877F2',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#fff',
                                fontSize: '18px',
                                textDecoration: 'none',
                                transition: 'transform 0.2s',
                                cursor: 'pointer'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                        >
                            f
                        </a>
                        <a
                            href={`https://wa.me/5493804123456`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '50%',
                                background: '#25D366',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#fff',
                                fontSize: '18px',
                                textDecoration: 'none',
                                transition: 'transform 0.2s',
                                cursor: 'pointer'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                        >
                            💬
                        </a>
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
                                const interval = 60; // 60 minutes by default

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

                                // Otherwise, show time slots
                                const resources = business.type === 'sport'
                                    ? (business.courts || [])
                                    : (selectedItem?.service_specialists?.length > 0
                                        ? selectedItem.service_specialists.map(ss => ({
                                            id: ss.specialists.id,
                                            name: ss.specialists.name,
                                            features: [ss.specialists.role || 'Especialista'],
                                            price: ss.price || 0,
                                            sport: business.type === 'sport' ? ss.sport : null
                                        }))
                                        : [{
                                            id: 'specialist',
                                            name: selectedItem?.specialist || 'Profesional Disponible',
                                            features: ['Especialista'],
                                            price: 0,
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
                                background: 'var(--primary-paddle)',
                                color: '#fff',
                                fontSize: '16px',
                                fontWeight: 'bold',
                                padding: '16px 40px',
                                borderRadius: '50px',
                                border: 'none',
                                cursor: 'pointer',
                                boxShadow: '0 10px 30px #00E67660',
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
                                        left: '10px',
                                        right: '10px',
                                        padding: '10px',
                                        backgroundColor: 'var(--bg-card)',
                                        color: primaryColor,
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
                            courtName: business.type === 'sport' ? selectedTime.courtName : null
                        }}
                        onClose={() => setShowModal(false)}
                        onConfirm={handleConfirmBooking}
                        isSubmitting={isSubmitting}
                    />
                )}
            </div>
        </motion.div >
    );
}
