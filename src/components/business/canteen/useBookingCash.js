import { useCallback, useEffect, useState } from 'react';
import sportCanteenService from '../../../services/sportCanteenService';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Cash register data a booking needs: active articles (to add as extras),
 * the open register and the charges already made for this booking.
 */
export function useBookingCash({ businessId, bookingId, enabled }) {
    const canCharge = Boolean(enabled && businessId && UUID_RE.test(String(bookingId || '')));
    const [products, setProducts] = useState([]);
    const [register, setRegister] = useState(null);
    const [movements, setMovements] = useState([]);
    const [loading, setLoading] = useState(canCharge);
    const [error, setError] = useState('');

    const reload = useCallback(async () => {
        if (!canCharge) return;
        setError('');
        try {
            const [prods, open, charges] = await Promise.all([
                sportCanteenService.listProducts(businessId, { includeInactive: false }),
                sportCanteenService.getOpenRegister(businessId),
                sportCanteenService.listBookingMovements(bookingId)
            ]);
            setProducts(prods);
            setRegister(open);
            setMovements(charges);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [canCharge, businessId, bookingId]);

    useEffect(() => {
        reload();
    }, [reload]);

    return { canCharge, products, register, setRegister, movements, loading, error, reload };
}

export default useBookingCash;
