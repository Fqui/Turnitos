import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
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
import PromotionModal from '../components/promotions/PromotionModal';
import { parsePromotionTarget } from '../utils/promotionUtils';

import ProfileHeroBanner from '../components/profile/ProfileHeroBanner';
import ProfileHighlightsAndStore from '../components/profile/ProfileHighlightsAndStore';
import ProfileStoryViewerModal from '../components/profile/ProfileStoryViewerModal';
import ProfileVenuePricingSection from '../components/profile/ProfileVenuePricingSection';
import ProfileVenueBookingSection from '../components/profile/ProfileVenueBookingSection';
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
    const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768);

    useEffect(() => {
        const onResize = () => setIsMobile(window.innerWidth <= 768);
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

    useEffect(() => {
        if (initialBusiness) {
            setBusiness(initialBusiness);
            setLoading(false);
        }
    }, [initialBusiness]);

    const [selectedItem, setSelectedItem] = useState(null); // Sport (string) or Service (object)
    const [selectedDate, setSelectedDate] = useState(null);
    const [selectedTime, setSelectedTime] = useState(null);
    const [existingBookings, setExistingBookings] = useState([]);
    const [loadingBookings, setLoadingBookings] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [successWhatsappUrl, setSuccessWhatsappUrl] = useState('');
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
    const [showPromoModal, setShowPromoModal] = useState(false);

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

    // Is the business open right now? null when it has no schedule loaded
    const getOpenNowStatus = () => {
        if (!business?.hours) return null;
        const now = new Date();
        const hours = getBusinessHours(now);
        if (hours.isClosed || (hours.open === '00:00' && hours.close === '00:00')) return false;
        const toMin = (t) => {
            const [h, m] = String(t || '').split(':').map(Number);
            return (Number.isNaN(h) ? 0 : h) * 60 + (Number.isNaN(m) ? 0 : m);
        };
        const nowMin = now.getHours() * 60 + now.getMinutes();
        const ranges = hours.ranges && hours.ranges.length > 0 ? hours.ranges : [{ open: hours.open, close: hours.close }];
        return ranges.some(range => {
            const start = toMin(range.open);
            let end = toMin(range.close);
            if (end <= start) end += 1440;
            return nowMin >= start && nowMin < end;
        });
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
        if (selectedTime && business?.type === 'service') {
            if (availableSpecialists.length > 1) {
                const timer = setTimeout(() => {
                    specialistRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 100);
                return () => clearTimeout(timer);
            } else if (availableSpecialists.length === 1 || availableSpecialists.length === 0) {
                const timer = setTimeout(() => {
                    confirmRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 100);
                return () => clearTimeout(timer);
            }
        }
    }, [selectedTime, availableSpecialists.length, business?.type]);
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

                const { bookings } = await serviceAdapter.getPublicBookings(business.id, dateStr);
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
                        setShowPromoModal(true);

                        const parsed = parsePromotionTarget(promo);

                        if (parsed.target_type === 'sport' && promo.sport_type && business.type === 'sport') {
                            setSelectedItem(promo.sport_type);
                        }
                        if (parsed.target_type === 'service' && business.type === 'service' && business.services) {
                            const matchingService = business.services.find(s =>
                                String(s.id) === String(parsed.target_id) ||
                                s.name?.toLowerCase().trim() === parsed.target_name?.toLowerCase().trim()
                            );
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

    const handlePromoSelectService = (service) => {
        setSelectedItem(service);
        setSelectedDate(null);
        setSelectedTime(null);
        setSelectedSpecialist(null);
        setAvailableSpecialists([]);
        setTimeout(() => {
            if (calendarRef.current) {
                calendarRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }, 150);
    };

    const handlePromoFilterCategory = (categoryName) => {
        const el = document.getElementById('servicios');
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    const handlePromoGoToStore = (targetId) => {
        navigate(`/${business.slug}/tienda?promoId=${activePromotion?.id}${targetId ? `&productId=${targetId}` : ''}`);
    };

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

            try {
                sessionStorage.setItem('turnitos_current_theme', isDarkTheme ? 'dark' : 'light');
                if (business.slug) {
                    sessionStorage.setItem(`turnitos_biz_${business.slug}`, JSON.stringify(business));
                    sessionStorage.setItem(`turnitos_theme_${business.slug}`, isDarkTheme ? 'dark' : 'light');
                }
            } catch (e) {}

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

            // Preserve theme if navigating to subpages of this business (e.g. /tienda) to eliminate white flashes
            const nextPath = window.location.pathname;
            const isStayingInBusiness = nextPath.includes('/tienda') || nextPath.includes('/turnos') || nextPath.includes('/bio');

            if (!isStayingInBusiness) {
                root.removeAttribute('data-theme');
                root.style.removeProperty('--primary-paddle');
                root.style.removeProperty('--bg-main');
                root.style.removeProperty('--bg-card');
                root.style.removeProperty('--text-primary');
                root.style.removeProperty('--text-secondary');
                root.style.removeProperty('--border');
            }
            body.style.removeProperty('background-image');
            body.style.removeProperty('background-size');
        };
    }, [business]);

    const primaryColor = business?.brand_color || business?.primary_color || business?.button_color || business?.buttonColor ||
        (business?.category === 'beauty' ? '#FF4081' :
            business?.category === 'health' ? '#2979FF' : '#00E676');

    // 📜 Booking rules & policies
    const bookingRules = useMemo(() => {
        let rules = business?.booking_rules;
        if (typeof rules === 'string') {
            try {
                rules = JSON.parse(rules);
            } catch (e) {
                rules = {};
            }
        }
        return rules || {};
    }, [business?.booking_rules]);

    // 🏷️ Día Especial con Precio Promocional
    const specialPriceDay = useMemo(() => {
        if (!selectedDate || !business?.special_days) return null;
        const dateStr = selectedDate instanceof Date
            ? `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`
            : (typeof selectedDate === 'string' ? selectedDate.split('T')[0] : '');

        return (business.special_days || []).find(sd => sd.date === dateStr && sd.type === 'special_price') || null;
    }, [selectedDate, business?.special_days]);

    const calculateSpecialDayPrice = useCallback((basePrice) => {
        if (!specialPriceDay || basePrice === undefined || basePrice === null) return basePrice;
        const mode = specialPriceDay.priceMode;
        const val = Number(specialPriceDay.priceVal) || 0;

        if (mode === 'fixed') {
            return val;
        } else if (mode === 'discount_percent' || mode === 'multiplier') {
            return Math.max(0, Math.round(basePrice * (1 - (val / 100))));
        } else if (mode === 'surcharge') {
            return Math.round(basePrice * (1 + (val / 100)));
        }
        return basePrice;
    }, [specialPriceDay]);

    // Confirm booking handler
    const handleConfirmBooking = async (finalDetails) => {
        setIsSubmitting(true);

        try {
            // 🛡️ VALIDACIONES DE REGLAS DE RESERVA (booking_rules)
            const advanceRules = bookingRules?.advance_booking || {};
            const minHours = Number(advanceRules.min_hours) || 0;
            const maxDays = Number(advanceRules.max_days) || 0;
            const limitsRules = bookingRules?.limits || {};
            const maxPerDay = Number(limitsRules.max_per_day) || 0;
            const maxPerWeek = Number(limitsRules.max_per_week) || 0;

            const now = new Date();

            // 1. Validar mínimo de horas de anticipación
            if (minHours > 0 && finalDetails.date && finalDetails.time) {
                const targetBookingDateTime = new Date(`${finalDetails.date}T${finalDetails.time}:00`);
                const hoursDifference = (targetBookingDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
                if (hoursDifference < minHours) {
                    throw new Error(`Este negocio requiere reservar con al menos ${minHours} hora(s) de anticipación.`);
                }
            }

            // 2. Validar máximo de días de anticipación
            if (maxDays > 0 && finalDetails.date) {
                const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                const [targetYear, targetMonth, targetDay] = finalDetails.date.split('-').map(Number);
                const targetMidnight = new Date(targetYear, targetMonth - 1, targetDay);
                const daysDifference = Math.round((targetMidnight.getTime() - todayMidnight.getTime()) / (1000 * 60 * 60 * 24));
                if (daysDifference > maxDays) {
                    throw new Error(`Solo se pueden realizar reservas con hasta ${maxDays} días de anticipación.`);
                }
            }

            // 3. Validar límite de reservas por cliente por día y por semana
            const rawPhone = finalDetails.customerPhone || '';
            const cleanPhone = rawPhone.replace(/\D/g, '');

            if (cleanPhone && finalDetails.date) {
                if (maxPerDay > 0) {
                    const dayBookingsCount = await serviceAdapter.countCustomerBookings(
                        business.id, cleanPhone, finalDetails.date, finalDetails.date
                    );

                    if (dayBookingsCount >= maxPerDay) {
                        throw new Error(`Has alcanzado el límite máximo de ${maxPerDay} reserva(s) por día para tu número de teléfono.`);
                    }
                }

                if (maxPerWeek > 0) {
                    const [targetYear, targetMonth, targetDay] = finalDetails.date.split('-').map(Number);
                    const targetDateObj = new Date(targetYear, targetMonth - 1, targetDay);
                    const distanceToMonday = (targetDateObj.getDay() + 6) % 7;
                    const weekStart = new Date(targetDateObj);
                    weekStart.setDate(weekStart.getDate() - distanceToMonday);
                    const weekEnd = new Date(weekStart);
                    weekEnd.setDate(weekEnd.getDate() + 6);
                    const toKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

                    const weekBookingsCount = await serviceAdapter.countCustomerBookings(
                        business.id, cleanPhone, toKey(weekStart), toKey(weekEnd)
                    );

                    if (weekBookingsCount >= maxPerWeek) {
                        throw new Error(`Has alcanzado el límite máximo de ${maxPerWeek} reserva(s) por semana para tu número de teléfono.`);
                    }
                }
            }

            let finalSpecialistId = null;
            if (business.type === 'service') {
                const realSpecialists = availableSpecialists.filter(s => s.id && s.id !== 'auto-assigned');
                if (selectedSpecialist?.id && selectedSpecialist.id !== 'auto-assigned') {
                    finalSpecialistId = selectedSpecialist.id;
                } else if (realSpecialists.length > 0) {
                    // "Sin preferencia": the free specialist with the fewest bookings that day
                    const loadOf = (specId) => existingBookings.filter(b =>
                        String(b.specialist_id || b.metadata?.specialist_id || b.metadata?.specialist_id_raw || '') === String(specId)
                    ).length;
                    finalSpecialistId = realSpecialists
                        .map(s => ({ id: s.id, load: loadOf(s.id) }))
                        .sort((a, b) => a.load - b.load)[0].id;
                } else if ((business.specialists || []).length > 0) {
                    throw new Error('Ese horario ya no tiene profesionales libres. Elegí otro horario.');
                }
            }

            // BookingSummary already applied the promo (only when it matches the service)
            const finalPrice = finalDetails.price;
            const discountApplied = finalDetails.discount || 0;

            const selectedExtrasList = finalDetails.extras || [];

            const bookingData = {
                businessId: business.id,
                serviceId: business.type === 'service' ? selectedItem?.id : null,
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
                    deposit_amount: finalDetails.depositAmount || null,
                    coupon_code: finalDetails.coupon_code || finalDetails.coupon?.code || null,
                    coupon_title: finalDetails.coupon?.gift_title || finalDetails.coupon?.description || null
                },
                coupon_code: finalDetails.coupon_code || finalDetails.coupon?.code || null,
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

            // If a business coupon was applied, increment used_count
            if (finalDetails.coupon?.code && business.id) {
                serviceAdapter.incrementCouponUsage(business.id, finalDetails.coupon.code)
                    .catch(e => console.warn('Could not increment coupon used_count:', e));
            }

            try {
                if (pushService?.notifyBusinessNewBooking) {
                    pushService.notifyBusinessNewBooking(business.id, {
                        customerName: finalDetails.customerName,
                        date: formatDisplayDate(selectedDate),
                        time: finalDetails.time,
                        businessName: business.name
                    });
                }
            } catch (pushErr) {
                console.warn('[BusinessProfile] Push notification failed:', pushErr);
            }

            setShowModal(false);
            setSuccessWhatsappUrl(finalDetails.whatsappUrl || '');
            setShowSuccessModal(true);
            refreshBookings();
            setSelectedTime(null);

        } catch (error) {
            console.error("Booking error:", error);
            alert(error.message || "Hubo un error al guardar la reserva. Por favor intenta nuevamente.");
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

        const ratingVal = Number(business.rating_avg || business.rating || business.metadata?.rating_avg || 0);
        const reviewsNum = Number(business.reviews_count || business.metadata?.reviews_count || 0);

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

    const noFreeSpecialist = business.type === 'service' &&
        Boolean(selectedTime) &&
        !loadingSpecialists &&
        (business.specialists || []).length > 0 &&
        availableSpecialists.filter(s => s.id !== 'auto-assigned').length === 0;

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
                    openNow={getOpenNowStatus()}
                    onStoryClick={() => {
                        if (activeStories && activeStories.length > 0) {
                            setStoryViewerList(activeStories);
                            setSelectedPhotoIndex(0);
                            setSelectedHighlight(0);
                        }
                    }}
                />

                <div className="container profile-main-container" style={{ maxWidth: containerWidth, margin: '0 auto', position: 'relative', zIndex: 2 }}>
                    {/* Instagram-Style Highlights Bar & Store Promo Card */}
                    <ProfileHighlightsAndStore
                        business={business}
                        primaryColor={primaryColor}
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

                    {/* Promotion Modal */}
                    <PromotionModal
                        isOpen={showPromoModal}
                        onClose={() => setShowPromoModal(false)}
                        promotion={activePromotion}
                        business={business}
                        onSelectService={handlePromoSelectService}
                        onFilterCategory={handlePromoFilterCategory}
                        onGoToStore={handlePromoGoToStore}
                    />

                    {/* Service Selector (Only for Service businesses) */}
                    {business.type === 'service' && (
                        <section id="servicios" style={{ marginBottom: '30px' }}>
                            <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px', color: 'var(--text-primary)' }}>
                                Nuestros Servicios
                            </h3>
                            <ServiceSelector
                                services={business.services}
                                selected={selectedItem}
                                activePromotion={activePromotion}
                                onSelect={(service) => {
                                    setSelectedItem(service);
                                    setSelectedDate(null);
                                    setSelectedTime(null);
                                    setSelectedSpecialist(null);
                                    setAvailableSpecialists([]);

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


                    {/* Select Date Section */}
                    {(selectedItem || business.type === 'venue') && (
                        <section
                            id={business.type === 'service' ? 'calendario' : 'servicios'}
                            ref={calendarRef}
                            style={{ marginBottom: '30px', animation: 'slideUp 0.4s ease' }}
                        >
                            <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px', color: 'var(--text-primary)' }}>
                                {business.type === 'service' ? 'Elegí una fecha' : '1. Elegí una fecha'}
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
                                            setSelectedSpecialist(null);
                                            setAvailableSpecialists([]);
                                        }}
                                        sportColor={primaryColor}
                                        maxDays={bookingRules?.advance_booking?.max_days || 30}
                                    />
                                ) : (
                                    <Calendar
                                        selectedDate={selectedDate}
                                        onDateSelect={(date) => {
                                            setSelectedDate(date);
                                            setSelectedTime(null);
                                            setSelectedSpecialist(null);
                                            setAvailableSpecialists([]);
                                        }}
                                        sportColor={primaryColor}
                                        maxDays={bookingRules?.advance_booking?.max_days || 30}
                                        specialDays={business?.special_days || []}
                                        isDateClosed={(date) => Boolean(getBusinessHours(date).isClosed)}
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
                                {/* Special price / discount banner */}
                                {specialPriceDay && (
                                    <div style={{
                                        padding: '14px 18px',
                                        marginBottom: '16px',
                                        borderRadius: '16px',
                                        background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 50%, #a7f3d0 100%)',
                                        border: '1.5px solid rgba(16, 185, 129, 0.3)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '14px',
                                        boxShadow: '0 4px 12px rgba(16, 185, 129, 0.15)',
                                        position: 'relative',
                                        overflow: 'hidden'
                                    }}>
                                        {/* Decorative circle */}
                                        <div style={{
                                            position: 'absolute',
                                            right: '-20px',
                                            top: '-20px',
                                            width: '80px',
                                            height: '80px',
                                            borderRadius: '50%',
                                            background: 'rgba(16, 185, 129, 0.1)',
                                            pointerEvents: 'none'
                                        }} />
                                        <div style={{
                                            width: '44px',
                                            height: '44px',
                                            minWidth: '44px',
                                            borderRadius: '12px',
                                            background: 'linear-gradient(135deg, #10b981, #059669)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '20px',
                                            boxShadow: '0 4px 10px rgba(16, 185, 129, 0.3)'
                                        }}>
                                            🔥
                                        </div>
                                        <div style={{ position: 'relative', zIndex: 1, flex: 1 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                <span style={{ fontSize: '14px', fontWeight: '800', color: '#065f46' }}>
                                                    {specialPriceDay.description || '¡Oferta del Día!'}
                                                </span>
                                                <span style={{
                                                    padding: '2px 8px',
                                                    borderRadius: '20px',
                                                    background: '#059669',
                                                    color: '#fff',
                                                    fontSize: '11px',
                                                    fontWeight: '800',
                                                    letterSpacing: '0.3px'
                                                }}>
                                                    {specialPriceDay.priceMode === 'discount_percent' && specialPriceDay.priceVal 
                                                        ? `${specialPriceDay.priceVal}% OFF`
                                                        : specialPriceDay.priceMode === 'fixed'
                                                            ? `$${Number(specialPriceDay.priceVal).toLocaleString('es-AR')}`
                                                            : 'PROMO'}
                                                </span>
                                            </div>
                                            <div style={{ fontSize: '12px', color: '#047857', marginTop: '3px', fontWeight: '500' }}>
                                                Precio especial en todos los turnos de este día
                                            </div>
                                        </div>
                                    </div>
                                )}

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
                                                <p style={{ fontSize: '14px', marginTop: '8px' }}>Elegí otro día.</p>
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

                                    const allBusinessSpecs = business.specialists || [];
                                    const qualifiedSpecialists = (() => {
                                        if (Array.isArray(selectedItem?.specialists) && selectedItem.specialists.length > 0) {
                                            return selectedItem.specialists;
                                        }
                                        if (Array.isArray(selectedItem?.specialist_ids) && selectedItem.specialist_ids.length > 0) {
                                            const filtered = allBusinessSpecs.filter(s => selectedItem.specialist_ids.includes(s.id));
                                            if (filtered.length > 0) return filtered;
                                        }
                                        if (selectedItem?.specialist_id) {
                                            const filtered = allBusinessSpecs.filter(s => s.id === selectedItem.specialist_id);
                                            if (filtered.length > 0) return filtered;
                                        }
                                        if (Array.isArray(business.services) && selectedItem?.id) {
                                            const match = business.services.find(s => s.id === selectedItem.id);
                                            if (match) {
                                                if (Array.isArray(match.specialists) && match.specialists.length > 0) {
                                                    return match.specialists;
                                                }
                                                if (Array.isArray(match.specialist_ids) && match.specialist_ids.length > 0) {
                                                    const filtered = allBusinessSpecs.filter(s => match.specialist_ids.includes(s.id));
                                                    if (filtered.length > 0) return filtered;
                                                }
                                                if (match.specialist_id) {
                                                    const filtered = allBusinessSpecs.filter(s => s.id === match.specialist_id);
                                                    if (filtered.length > 0) return filtered;
                                                }
                                            }
                                        }
                                        return allBusinessSpecs;
                                    })();

                                    const resources = business.type === 'sport'
                                        ? (business.courts || []).map(c => ({
                                            ...c,
                                            originalPrice: c.price || 0,
                                            price: calculateSpecialDayPrice(c.price || 0)
                                        }))
                                        : (qualifiedSpecialists.length > 0
                                            ? qualifiedSpecialists.map(s => ({
                                                id: s.id,
                                                name: s.name,
                                                features: [s.role || 'Especialista'],
                                                originalPrice: selectedItem?.price || 0,
                                                price: calculateSpecialDayPrice(selectedItem?.price || 0),
                                                sport: null,
                                                capacity: s.capacity || 1
                                            }))
                                            : [{
                                                id: selectedItem?.id || 'no-specialist',
                                                name: 'Sin profesional asignado',
                                                features: ['Servicio'],
                                                originalPrice: selectedItem?.price || 0,
                                                price: calculateSpecialDayPrice(selectedItem?.price || 0),
                                                sport: null,
                                                capacity: 1
                                            }]);

                                    const businessCapacity = business.capacity ||
                                        (qualifiedSpecialists.length > 0
                                            ? qualifiedSpecialists.length
                                            : (resources && resources.length > 0
                                                ? resources.reduce((sum, r) => sum + (r.capacity || 1), 0)
                                                : 1));

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
                                                    const courtItem = (business.courts || []).find(c => c.id === slotData.courtId);
                                                    const rawPrice = courtItem?.price !== undefined ? courtItem.price : (slotData.price || 0);
                                                    setSelectedTime({
                                                        time: slotData.time,
                                                        courtId: slotData.courtId,
                                                        courtName: slotData.courtName,
                                                        originalPrice: rawPrice,
                                                        price: calculateSpecialDayPrice(rawPrice),
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
                                                    const courtItem = (business.courts || []).find(c => c.id === courtId);
                                                    const rawCourtPrice = courtItem?.price !== undefined ? courtItem.price : (court?.originalPrice || price || 0);
                                                    setSelectedTime({
                                                        time,
                                                        courtId,
                                                        courtName,
                                                        originalPrice: rawCourtPrice,
                                                        price: calculateSpecialDayPrice(rawCourtPrice),
                                                        duration: duration || (business.type === 'service' ? selectedItem?.duration : 60)
                                                    });
                                                } else {
                                                    const rawPrice = selectedItem?.price || 0;
                                                    setSelectedTime({
                                                        time,
                                                        courtId: null,
                                                        courtName: null,
                                                        originalPrice: rawPrice,
                                                        price: calculateSpecialDayPrice(rawPrice)
                                                    });
                                                }

                                                if (business.type === 'service' && selectedItem?.id) {
                                                    try {
                                                        const serviceDuration = selectedItem.duration || 60;
                                                        const dateStr = selectedDate instanceof Date
                                                            ? `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`
                                                            : selectedDate;

                                                        const serviceSpecs = qualifiedSpecialists;

                                                        // Compute available specialists from current existingBookings in memory (INSTANTÁNEO)
                                                        const timeToMin = (t) => {
                                                            if (!t || typeof t !== 'string' || !t.includes(':')) return 0;
                                                            const [h, m] = t.split(':').map(Number);
                                                            return (isNaN(h) ? 0 : h) * 60 + (isNaN(m) ? 0 : m);
                                                        };
                                                        const reqStart = timeToMin(time);
                                                        const reqEnd = reqStart + serviceDuration;

                                                        const bufferMins = Number(bookingRules?.time?.buffer_minutes) || 0;
                                                        const overlappingBookings = (existingBookings || []).filter(b => {
                                                            if (b.status === 'cancelled') return false;
                                                            const bDate = typeof b.date === 'string' ? b.date.split('T')[0] : '';
                                                            if (bDate && dateStr && bDate !== dateStr) return false;
                                                            const bStart = timeToMin(b.time);
                                                            const bEnd = bStart + (b.duration || 60) + bufferMins;
                                                            return reqStart < bEnd && (reqEnd + bufferMins) > bStart;
                                                        });

                                                        const busySpecIds = new Set(
                                                            overlappingBookings
                                                                .map(b => b.specialist_id || b.metadata?.specialist_id || b.metadata?.specialist_id_raw)
                                                                .filter(Boolean)
                                                                .map(String)
                                                        );

                                                        let freeSpecs = serviceSpecs.filter(spec => !busySpecIds.has(String(spec.id)));

                                                        if (freeSpecs.length === 0 && serviceSpecs.length === 0) {
                                                            freeSpecs = [{ id: 'auto-assigned', name: 'Profesional Asignado', role: 'Especialista' }];
                                                        }

                                                        // ⚡ SIN DELAY: Mostrar especialistas inmediatamente en 0ms
                                                        setAvailableSpecialists(freeSpecs);
                                                        setSelectedSpecialist(freeSpecs.length === 1 ? freeSpecs[0] : null);
                                                        setLoadingSpecialists(false);

                                                        // Verificación complementaria en segundo plano (asíncrona, no bloqueante)
                                                        serviceAdapter.getAvailableSpecialists(
                                                            selectedItem.id,
                                                            dateStr,
                                                            time,
                                                            serviceDuration,
                                                            business.id
                                                        ).then(remoteAvailable => {
                                                            if (Array.isArray(remoteAvailable) && remoteAvailable.length > 0) {
                                                                const remoteIds = new Set(remoteAvailable.map(s => String(s.id)));
                                                                const matched = freeSpecs.filter(s => remoteIds.has(String(s.id)));
                                                                if (matched.length > 0 && matched.length !== freeSpecs.length) {
                                                                    setAvailableSpecialists(matched);
                                                                    setSelectedSpecialist(prev => (prev && matched.some(s => s.id === prev.id)) ? prev : (matched.length === 1 ? matched[0] : null));
                                                                }
                                                            }
                                                        }).catch(() => {});
                                                    } catch (error) {
                                                        console.error('Error calculating available specialists:', error);
                                                        const fallbackSpecs = qualifiedSpecialists.length > 0
                                                            ? qualifiedSpecialists
                                                            : (business.specialists || [{ id: 'auto-assigned', name: 'Profesional Asignado', role: 'Especialista' }]);
                                                        setAvailableSpecialists(fallbackSpecs);
                                                        setSelectedSpecialist(fallbackSpecs.length === 1 ? fallbackSpecs[0] : null);
                                                    }
                                                }
                                            }}
                                            sportColor={primaryColor}
                                            type={business.type}
                                            resources={resources}
                                            specialists={qualifiedSpecialists}
                                            openingTime={open}
                                            closingTime={close}
                                            interval={interval}
                                            existingBookings={existingBookings}
                                            timeRanges={ranges}
                                            selectedDate={selectedDate}
                                            maxCapacity={business.max_capacity || 1}
                                            businessCapacity={businessCapacity}
                                            serviceDuration={business.type === 'service' ? (selectedItem?.duration || 60) : null}
                                            minAdvanceHours={Number(bookingRules?.advance_booking?.min_hours) || 0}
                                            bufferMinutes={Number(bookingRules?.time?.buffer_minutes) || 0}
                                        />
                                    );
                                })()}

                                {/* Specialist Selector for services */}
                                {business.type === 'service' && selectedTime && (availableSpecialists.length === 0 || availableSpecialists.length > 1) && (
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
                                    background: noFreeSpecialist ? '#9E9E9E' : primaryColor,
                                    color: '#fff',
                                    fontSize: '16px',
                                    fontWeight: 'bold',
                                    padding: '16px 40px',
                                    borderRadius: '50px',
                                    border: 'none',
                                    cursor: noFreeSpecialist ? 'not-allowed' : 'pointer',
                                    boxShadow: `0 10px 30px ${primaryColor}60`,
                                    width: '100%',
                                    maxWidth: '400px'
                                }}
                                onClick={() => setShowModal(true)}
                                disabled={loadingSpecialists || noFreeSpecialist}
                            >
                                {loadingSpecialists ? 'Cargando...' : (noFreeSpecialist ? 'Elegí otro horario' : 'Continuar')}
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
                        <div id="opiniones" style={{ scrollMarginTop: '80px' }}>
                            <BusinessReviewsSection
                                businessId={business.id}
                                businessName={business.name}
                                primaryColor={primaryColor}
                            />
                        </div>
                    )}

                    {/* BookingSummary Modal */}
                    {showModal && selectedTime && (() => {
                        const rawOriginalPrice = business.type === 'venue'
                            ? Number(business.price_per_hour || business.price_per_day || 0) * (selectedDuration || 1)
                            : (business.type === 'service'
                                ? Number(selectedItem?.price || 0)
                                : Number(selectedTime.originalPrice ?? selectedTime.price ?? 0));

                        const discountedPrice = (selectedTime.price !== undefined && selectedTime.price !== null)
                            ? Number(selectedTime.price)
                            : calculateSpecialDayPrice(rawOriginalPrice);

                        const discountAmount = Math.max(0, rawOriginalPrice - discountedPrice);

                        return (
                            <BookingSummary
                                bookingDetails={{
                                    businessName: business.name,
                                    serviceId: business.type === 'service' ? selectedItem?.id : null,
                                    serviceName: business.type === 'venue' ? `Alquiler ${selectedDuration}hs` : (business.type === 'service' ? selectedItem?.name : selectedItem),
                                    specialistName: selectedSpecialist?.name,
                                    date: selectedDate instanceof Date
                                        ? `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`
                                        : selectedDate,
                                    time: selectedTime.time || selectedTime,
                                    duration: selectedTime.duration || (business.type === 'service' ? selectedItem?.duration : 60),
                                    price: discountedPrice,
                                    originalPrice: rawOriginalPrice,
                                    specialDayDiscount: (specialPriceDay && discountAmount > 0) ? {
                                        description: specialPriceDay.description || 'Oferta del día',
                                        priceMode: specialPriceDay.priceMode,
                                        priceVal: specialPriceDay.priceVal,
                                        discountAmount: discountAmount
                                    } : null,
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
                                availableExtras={(business?.additional_services || []).filter(s => {
                                    if (s.is_active === false) return false;
                                    const selectedServiceId = selectedItem?.id;
                                    if (!s.applicable_services || s.applicable_services.length === 0 || s.applicable_to === 'all') {
                                        return true;
                                    }
                                    return selectedServiceId && s.applicable_services.includes(selectedServiceId);
                                })}
                                activePromotion={activePromotion}
                                sportColor={primaryColor}
                                onClose={() => setShowModal(false)}
                                onConfirm={handleConfirmBooking}
                                isSubmitting={isSubmitting}
                            />
                        );
                    })()}

                    {/* Booking Success Modal */}
                    {showSuccessModal && (
                        <BookingSuccessModal
                            whatsappUrl={successWhatsappUrl}
                            onClose={() => {
                                setShowSuccessModal(false);
                                setSuccessWhatsappUrl('');
                                setSelectedTime(null);
                                setSelectedSpecialist(null);
                                setAvailableSpecialists([]);
                            }}
                        />
                    )}
                </div>
            </div>

            {/* Instagram-Style Story Viewer Modal */}
            <ProfileStoryViewerModal
                business={business}
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
