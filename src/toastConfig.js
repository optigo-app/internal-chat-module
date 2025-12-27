export const toastConfig = {
    position: "top-right",
    toastOptions: {
        duration: 2500,
        style: {
            background: '#ffffff',
            color: '#374151',
            borderRadius: '12px',
            padding: '16px',
            fontSize: '16px',
            fontWeight: '500',
            border: '1px solid #e5e7eb',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
        },
        success: {
            style: {
                background: '#f0fdf4',
                color: '#166534',
                border: '1px solid #bbf7d0',
            },
            iconTheme: {
                primary: '#16a34a',
                secondary: '#f0fdf4',
            },
        },
        error: {
            style: {
                background: '#fef2f2',
                color: '#991b1b',
                border: '1px solid #fecaca',
            },
            iconTheme: {
                primary: '#dc2626',
                secondary: '#fef2f2',
            },
        },
        loading: {
            style: {
                background: '#f0f4ff',
                color: '#3730a3',
                border: '1px solid #c7d2fe',
            },
        },
    },
}; 