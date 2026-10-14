import React, { useState } from 'react';
import { BellRing } from 'lucide-react';
import { useNotification } from '../../../contexts/NotificationContext';
import usePushAlerts, { PUSH_HELP } from '../../../hooks/usePushAlerts';

const DISMISS_KEY = 'turnitos_push_prompt_dismissed';

const readDismissed = () => {
    try {
        return localStorage.getItem(DISMISS_KEY) === '1';
    } catch {
        return false;
    }
};

/**
 * One-time invitation to turn on new-booking alerts on this device.
 * Hidden once alerts are on, blocked, unsupported, or after "Ahora no".
 */
export default function PortalPushPrompt({ business }) {
    const { showToast, showAlert } = useNotification();
    const { status, busy, enable } = usePushAlerts(business?.id);
    const [dismissed, setDismissed] = useState(readDismissed);

    if (!business || dismissed || (status !== 'off' && status !== 'ios-install')) return null;

    const isIosInstall = status === 'ios-install';

    const dismiss = () => {
        try { localStorage.setItem(DISMISS_KEY, '1'); } catch { /* private mode */ }
        setDismissed(true);
    };

    const handleEnable = async () => {
        if (isIosInstall) {
            showAlert(PUSH_HELP['ios-install'].title, PUSH_HELP['ios-install'].message, 'info', 'Entendido');
            return;
        }
        const result = await enable();
        if (result.success) {
            showToast('🔔 Listo: te avisamos de cada reserva nueva', 'success');
        } else if (result.error === 'denied') {
            showAlert(PUSH_HELP.denied.title, PUSH_HELP.denied.message, 'info', 'Entendido');
            dismiss();
        } else {
            showToast(`No se pudieron activar los avisos: ${result.error}`, 'error');
        }
    };

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
            padding: '12px 14px',
            marginBottom: '12px',
            borderRadius: '12px',
            background: 'rgba(16, 185, 129, 0.08)',
            border: '1px solid rgba(16, 185, 129, 0.3)'
        }}>
            <div style={{
                width: '36px',
                height: '36px',
                flexShrink: 0,
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(16, 185, 129, 0.15)',
                color: 'var(--primary-paddle)'
            }}>
                <BellRing size={18} />
            </div>
            <div style={{ flex: '1 1 220px', minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: '14px', color: 'var(--text-primary)' }}>
                    Enterate al instante de cada reserva
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    {isIosInstall
                        ? 'En iPhone, agregá TurnitosLR a tu pantalla de inicio para recibir avisos.'
                        : 'Te llega un aviso a este dispositivo aunque tengas el portal cerrado.'}
                </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexShrink: 0, marginLeft: 'auto' }}>
                <button
                    type="button"
                    onClick={dismiss}
                    style={{ padding: '8px 12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-secondary)', fontWeight: 700, fontSize: '13px', fontFamily: 'inherit', cursor: 'pointer' }}
                >
                    Ahora no
                </button>
                <button
                    type="button"
                    onClick={handleEnable}
                    disabled={busy}
                    style={{ padding: '8px 14px', borderRadius: '10px', border: 'none', background: 'var(--primary-paddle)', color: '#fff', fontWeight: 700, fontSize: '13px', fontFamily: 'inherit', cursor: busy ? 'wait' : 'pointer', opacity: busy ? 0.7 : 1 }}
                >
                    {isIosInstall ? 'Cómo hacerlo' : 'Activar avisos'}
                </button>
            </div>
        </div>
    );
}
