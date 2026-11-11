import { useEffect, useRef } from 'react';
import { supabase } from '../services/supabaseClient';

/**
 * Keeps Supabase realtime channels open only while the tab is visible.
 *
 * - openChannels(): opens the channels and returns them (RealtimeChannel[]).
 * - onResume(): runs once each time the tab becomes visible again, after the
 *   channels are reopened, to catch up on what changed while it was hidden.
 *
 * Channels close when the tab is hidden and on unmount (or when `key` changes),
 * so there is never more than one set open.
 */
export function useLiveChannels(key, openChannels, onResume) {
    const openRef = useRef(openChannels);
    const resumeRef = useRef(onResume);

    useEffect(() => {
        openRef.current = openChannels;
        resumeRef.current = onResume;
    });

    useEffect(() => {
        if (!key || typeof document === 'undefined') return undefined;

        let channels = [];

        const open = () => {
            if (channels.length > 0) return;
            try {
                channels = (openRef.current?.() || []).filter(Boolean);
            } catch (error) {
                console.warn('Could not open live channels:', error);
                channels = [];
            }
        };

        const close = () => {
            channels.forEach(channel => {
                try { supabase.removeChannel(channel); } catch { /* already closed */ }
            });
            channels = [];
        };

        const handleVisibility = () => {
            if (document.visibilityState === 'hidden') {
                close();
            } else if (channels.length === 0) {
                open();
                resumeRef.current?.();
            }
        };

        if (document.visibilityState !== 'hidden') open();
        document.addEventListener('visibilitychange', handleVisibility);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibility);
            close();
        };
    }, [key]);
}
