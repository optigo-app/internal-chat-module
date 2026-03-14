export const toastConfig = {
    position: "bottom-left",
    toastOptions: {
        duration: 3500,
        style: {
            background: 'rgba(255, 255, 255, 0.95)',
            color: '#111827',
            borderRadius: '16px',
            padding: '12px 20px',
            fontSize: '14px',
            fontWeight: '500',
            border: '1px solid rgba(229, 231, 235, 0.8)',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            backdropFilter: 'blur(8px)',
            maxWidth: '400px',
        },
        success: {
            style: {
                background: '#ecfdf5',
                color: '#065f46',
                border: '1px solid #a7f3d0',
            },
            iconTheme: {
                primary: '#10b981',
                secondary: '#ecfdf5',
            },
        },
        error: {
            style: {
                background: '#fef2f2',
                color: '#991b1b',
                border: '1px solid #fecaca',
            },
            iconTheme: {
                primary: '#ef4444',
                secondary: '#fef2f2',
            },
        },
        loading: {
            style: {
                background: '#f9fafb',
                color: '#374151',
                border: '1px solid #e5e7eb',
            },
        },
    },
};
