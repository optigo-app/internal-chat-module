import { toast } from 'react-hot-toast';

/**
 * Modern Centralized Toast Utility
 * @param {string} message - The message to display
 * @param {('success'|'error'|'warning'|'info'|'loading'|'notification')} type - Type of toast
 * @param {object} options - Optional react-hot-toast options (e.g. id, duration)
 */
export const showToast = (message, type = 'info', options = {}) => {
    switch (type) {
        case 'success':
            return toast.success(message, options);
        case 'error':
            return toast.error(message, options);
        case 'loading':
            return toast.loading(message, options);
        case 'warning':
            return toast(message, {
                icon: '⚠️',
                style: {
                    background: '#fffbeb',
                    color: '#92400e',
                    border: '1px solid #fde68a',
                    borderRadius: '16px',
                    padding: '12px 20px',
                    fontSize: '14px',
                    fontWeight: '500',
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
                },
                ...options,
            });
        case 'info':
        default:
            return toast(message, {
                icon: 'ℹ️',
                style: {
                    background: '#f0f9ff',
                    color: '#075985',
                    border: '1px solid #bae6fd',
                    borderRadius: '16px',
                    padding: '12px 20px',
                    fontSize: '14px',
                    fontWeight: '500',
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
                },
                ...options,
            });
    }
};

export const dismissToast = (toastId) => {
    toast.dismiss(toastId);
};
