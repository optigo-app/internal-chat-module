import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import CloseIcon from '@mui/icons-material/Close';
import { useNotificationManager } from '../../contexts/NotificationContext';

const NotificationPermissionBar = () => {
    const { permissionStatus, requestPermission } = useNotificationManager();
    const [dismissed, setDismissed] = React.useState(false);

    if (permissionStatus !== 'default' || dismissed) {
        return null;
    }

    return (
        <Box
            sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                p: '12px 16px',
                backgroundColor: '#f0f2f5', // WhatsApp-like light grey background
                borderBottom: '1px solid #e9edef',
                animation: 'slideDown 0.3s ease-out',
                '@keyframes slideDown': {
                    from: { transform: 'translateY(-100%)', opacity: 0 },
                    to: { transform: 'translateY(0)', opacity: 1 },
                },
            }}
        >
            <Box
                sx={{
                    backgroundColor: '#7367f0', // Project Theme Color
                    borderRadius: '50%',
                    width: 40,
                    height: 40,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    flexShrink: 0,
                }}
            >
                <NotificationsActiveIcon fontSize="small" />
            </Box>

            <Box sx={{ flexGrow: 1 }}>
                <Typography variant="subtitle2" sx={{ color: '#111b21', fontWeight: 500 }}>
                    Get notified of new messages
                </Typography>
                <Typography variant="caption" sx={{ color: '#667781' }}>
                    Turn on desktop notifications
                </Typography>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Button
                    onClick={requestPermission}
                    size="small"
                    sx={{
                        color: '#7367f0',
                        fontWeight: 600,
                        textTransform: 'none',
                        '&:hover': {
                            backgroundColor: 'rgba(115, 103, 240, 0.08)',
                        },
                    }}
                >
                    Turn on
                </Button>
                <Box
                    onClick={() => setDismissed(true)}
                    sx={{
                        cursor: 'pointer',
                        color: '#667781',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        p: 0.5,
                        borderRadius: '50%',
                        '&:hover': {
                            backgroundColor: 'rgba(0,0,0,0.05)',
                        },
                    }}
                >
                    <CloseIcon sx={{ fontSize: 18 }} />
                </Box>
            </Box>
        </Box>
    );
};

export default NotificationPermissionBar;
