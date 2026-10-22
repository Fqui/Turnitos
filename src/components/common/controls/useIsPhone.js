import { useEffect, useState } from 'react';

// Mismo corte que el resto del panel (bookingMobileUtils.PHONE_MAX_WIDTH)
const PHONE_QUERY = '(max-width: 768px)';

const matches = () => typeof window !== 'undefined' && window.matchMedia(PHONE_QUERY).matches;

export default function useIsPhone() {
    const [isPhone, setIsPhone] = useState(matches);

    useEffect(() => {
        const mq = window.matchMedia(PHONE_QUERY);
        const onChange = () => setIsPhone(mq.matches);
        mq.addEventListener('change', onChange);
        return () => mq.removeEventListener('change', onChange);
    }, []);

    return isPhone;
}
