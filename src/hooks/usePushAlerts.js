import { useCallback, useEffect, useState } from 'react';
import pushService from '../services/pushService';

// How to get out of the states where the button alone can't turn alerts on
export const PUSH_HELP = {
    'ios-install': {
        title: 'Avisos en iPhone',
        message: 'En iPhone los avisos llegan solo con TurnitosLR instalada (iOS 16.4 o más nuevo):\n\n1. Abrí el portal en Safari.\n2. Tocá Compartir (el cuadrado con la flechita).\n3. Elegí "Agregar a inicio".\n4. Abrí TurnitosLR desde el ícono y activá los avisos.'
    },
    denied: {
        title: 'Avisos bloqueados',
        message: 'Bloqueaste los avisos para este sitio.\n\n1. Tocá el candado 🔒 al lado de la dirección.\n2. En "Notificaciones" elegí "Permitir".\n3. Recargá la página y volvé a activarlos.'
    },
    unsupported: {
        title: 'Avisos no disponibles',
        message: 'Este navegador no permite avisos. Probá con Chrome, Edge, Firefox o Safari actualizados.'
    }
};

/**
 * Web Push state for the business portal, shared by the sidebar button and the
 * one-time banner (both re-read it whenever any of them changes it).
 */
export default function usePushAlerts(businessId) {
    const [status, setStatus] = useState('loading');
    const [busy, setBusy] = useState(false);

    const refresh = useCallback(() => {
        pushService.getStatus().then(setStatus);
    }, []);

    useEffect(() => {
        refresh();
        return pushService.onChange(refresh);
    }, [refresh]);

    // Re-link this device to the business that is open now
    useEffect(() => {
        if (businessId) pushService.syncIfEnabled(businessId);
    }, [businessId]);

    const enable = useCallback(async () => {
        setBusy(true);
        try {
            return await pushService.enable(businessId);
        } finally {
            setBusy(false);
        }
    }, [businessId]);

    const disable = useCallback(async () => {
        setBusy(true);
        try {
            await pushService.disable();
        } finally {
            setBusy(false);
        }
    }, []);

    return { status, busy, enable, disable };
}
