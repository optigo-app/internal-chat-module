import React from 'react';
import { Box, Typography, Button, Modal, Fade, Backdrop } from '@mui/material';
import { ArrowUpLeft } from 'lucide-react';
import { useNotificationManager } from '../../contexts/NotificationContext';

const NotificationPermissionModal = () => {
    const { showGuide, setShowGuide, executeNativeRequest } = useNotificationManager();

    const handleOk = () => {
        executeNativeRequest();
    };

    return (
        <Modal
            open={showGuide}
            onClose={() => setShowGuide(false)}
            closeAfterTransition
            BackdropComponent={Backdrop}
            BackdropProps={{
                timeout: 500,
                sx: { backgroundColor: 'rgba(11, 20, 26, 0.85)' } // Dark WhatsApp-style backdrop
            }}
        >
            <Fade in={showGuide}>
                <Box
                    sx={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: 'auto',
                        minWidth: 320,
                        maxWidth: 450,
                        bgcolor: 'transparent',
                        outline: 'none',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        textAlign: 'center',
                        color: 'white',
                    }}
                >
                    {/* Arrow Icon pointing up-left */}
                    <Box
                        sx={{
                            backgroundColor: 'rgba(115, 103, 240, 0.15)',
                            borderRadius: '50%',
                            p: 2,
                            mb: 3,
                            border: '1px solid rgba(115, 103, 240, 0.3)',
                        }}
                    >
                        <ArrowUpLeft
                            size={48}
                            color="#7367f0"
                            strokeWidth={3}
                        />
                    </Box>

                    <Typography
                        variant="h5"
                        sx={{
                            fontWeight: 700,
                            mb: 2,
                            letterSpacing: '-0.5px'
                        }}
                    >
                        Allow notifications
                    </Typography>

                    <Typography
                        variant="body1"
                        sx={{
                            color: 'rgba(255, 255, 255, 0.7)',
                            mb: 4,
                            px: 2,
                            lineHeight: 1.6
                        }}
                    >
                        To get notifications for new messages, click <strong>Allow</strong> above.
                    </Typography>

                    <Button
                        onClick={handleOk}
                        variant="contained"
                        sx={{
                            backgroundColor: '#7367f0', // Project Theme Color
                            color: 'white',
                            borderRadius: '50px',
                            px: 5,
                            py: 1,
                            fontWeight: 600,
                            textTransform: 'none',
                            fontSize: '1rem',
                            '&:hover': {
                                backgroundColor: '#685dd8',
                                boxShadow: '0 4px 12px rgba(115, 103, 240, 0.4)'
                            },
                        }}
                    >
                        OK
                    </Button>
                </Box>
            </Fade>
        </Modal>
    );
};

export default NotificationPermissionModal;
