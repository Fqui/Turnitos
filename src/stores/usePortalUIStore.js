import { create } from 'zustand';

export const usePortalUIStore = create((set) => ({
    viewMode: 'calendar', // 'calendar', 'list', 'analytics', 'settings', 'customers', 'subscription'
    
    // Modals state
    showNewModal: false,
    newBookingSlot: null,

    showDetailsModal: false,
    selectedBooking: null,

    showBlockModal: false,
    pendingBlockData: null,

    showPasswordModal: false,

    showConfirmModal: false,
    confirmConfig: {
        title: '',
        message: '',
        confirmText: 'Confirmar',
        cancelText: 'Cancelar',
        isDanger: false,
        onConfirm: () => {}
    },

    // View actions
    setViewMode: (mode) => {
        set({ viewMode: mode });
        if (typeof window !== 'undefined') {
            window.scrollTo(0, 0);
        }
    },

    // Modal actions
    openNewBookingModal: (slot = null) => set({ showNewModal: true, newBookingSlot: slot }),
    closeNewBookingModal: () => set({ showNewModal: false, newBookingSlot: null }),

    openBookingDetailsModal: (booking) => set({ showDetailsModal: true, selectedBooking: booking }),
    closeBookingDetailsModal: () => set({ showDetailsModal: false, selectedBooking: null }),

    openBlockModal: (blockData = null) => set({ showBlockModal: true, pendingBlockData: blockData }),
    closeBlockModal: () => set({ showBlockModal: false, pendingBlockData: null }),

    openPasswordModal: () => set({ showPasswordModal: true }),
    closePasswordModal: () => set({ showPasswordModal: false }),

    openConfirmModal: (config) => set({
        showConfirmModal: true,
        confirmConfig: {
            title: config.title || '¿Estás seguro?',
            message: config.message || '',
            confirmText: config.confirmText || 'Confirmar',
            cancelText: config.cancelText || 'Cancelar',
            isDanger: config.isDanger || false,
            onConfirm: config.onConfirm || (() => {})
        }
    }),
    closeConfirmModal: () => set({
        showConfirmModal: false,
        confirmConfig: {
            title: '',
            message: '',
            confirmText: 'Confirmar',
            cancelText: 'Cancelar',
            isDanger: false,
            onConfirm: () => {}
        }
    })
}));
