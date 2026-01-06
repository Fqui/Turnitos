import React, { createContext, useContext, useState, useCallback } from 'react';

const NotificationContext = createContext();

export const useNotification = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotification must be used within NotificationProvider');
    }
    return context;
};

export const NotificationProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);
    const [confirmDialog, setConfirmDialog] = useState(null);
    const [alertDialog, setAlertDialog] = useState(null);

    // Toast notifications
    const showToast = useCallback((message, type = 'info', duration = 4000) => {
        const id = Date.now();
        const toast = { id, message, type, duration };

        setToasts(prev => [...prev, toast]);

        if (duration > 0) {
            setTimeout(() => {
                setToasts(prev => prev.filter(t => t.id !== id));
            }, duration);
        }

        return id;
    }, []);

    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    // Confirm dialog
    const showConfirm = useCallback((title, message, confirmText = 'Confirmar', cancelText = 'Cancelar') => {
        return new Promise((resolve) => {
            setConfirmDialog({
                title,
                message,
                confirmText,
                cancelText,
                onConfirm: () => {
                    setConfirmDialog(null);
                    resolve(true);
                },
                onCancel: () => {
                    setConfirmDialog(null);
                    resolve(false);
                }
            });
        });
    }, []);

    // Alert dialog
    const showAlert = useCallback((title, message, type = 'info', buttonText = 'Entendido') => {
        return new Promise((resolve) => {
            setAlertDialog({
                title,
                message,
                type,
                buttonText,
                onClose: () => {
                    setAlertDialog(null);
                    resolve();
                }
            });
        });
    }, []);

    const value = {
        toasts,
        showToast,
        removeToast,
        showConfirm,
        confirmDialog,
        showAlert,
        alertDialog
    };

    return (
        <NotificationContext.Provider value={value}>
            {children}
        </NotificationContext.Provider>
    );
};
