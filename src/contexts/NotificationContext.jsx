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
        const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        const toast = { id, message, type, duration };

        setToasts(prev => [...prev, toast]);

        if (duration > 0) {
            setTimeout(() => {
                setToasts(prev => prev.filter(t => String(t.id) !== String(id)));
            }, duration);
        }

        return id;
    }, []);

    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(t => String(t.id) !== String(id)));
    }, []);

    // Confirm dialog (supports both positional args and options object)
    const showConfirm = useCallback((title, message, confirmText = 'Confirmar', cancelText = 'Cancelar') => {
        const opts = (typeof title === 'object' && title !== null)
            ? title
            : { title, message, confirmText, cancelText };

        const dlgTitle = opts.title || 'Confirmar';
        const dlgMessage = opts.message || '';
        const dlgConfirmText = opts.confirmText || 'Confirmar';
        const dlgCancelText = opts.cancelText || 'Cancelar';

        return new Promise((resolve) => {
            setConfirmDialog({
                title: dlgTitle,
                message: dlgMessage,
                confirmText: dlgConfirmText,
                cancelText: dlgCancelText,
                onConfirm: () => {
                    setConfirmDialog(null);
                    if (typeof opts.onConfirm === 'function') {
                        try { opts.onConfirm(); } catch (e) { console.error(e); }
                    }
                    resolve(true);
                },
                onCancel: () => {
                    setConfirmDialog(null);
                    if (typeof opts.onCancel === 'function') {
                        try { opts.onCancel(); } catch (e) { console.error(e); }
                    }
                    resolve(false);
                }
            });
        });
    }, []);

    // Alert dialog (supports both positional args and options object)
    const showAlert = useCallback((title, message, type = 'info', buttonText = 'Entendido') => {
        const opts = (typeof title === 'object' && title !== null)
            ? title
            : { title, message, type, buttonText };

        const dlgTitle = opts.title || 'Aviso';
        const dlgMessage = opts.message || '';
        const dlgType = opts.type || 'info';
        const dlgButtonText = opts.buttonText || 'Entendido';

        return new Promise((resolve) => {
            setAlertDialog({
                title: dlgTitle,
                message: dlgMessage,
                type: dlgType,
                buttonText: dlgButtonText,
                onClose: () => {
                    setAlertDialog(null);
                    if (typeof opts.onClose === 'function') {
                        try { opts.onClose(); } catch (e) { console.error(e); }
                    }
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
