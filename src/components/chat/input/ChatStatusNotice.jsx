import React from 'react';
import { Box, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';

const ChatStatusNotice = ({ isRemovedFromGroup, isOnlyAdminSend, isCurrentUserAdmin }) => {
    const theme = useTheme();

    if (!isRemovedFromGroup && !(isOnlyAdminSend && !isCurrentUserAdmin)) return null;

    let message = "";
    if (isRemovedFromGroup) {
        message = "You can't send messages. You're no longer a participant in this group.";
    } else if (isOnlyAdminSend && !isCurrentUserAdmin) {
        message = "Only admins can send messages.";
    }

    return (
        <Box
            sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '16px 24px',
                backgroundColor: alpha(theme.palette.action.disabledBackground, 0.05),
                borderRadius: '12px',
                margin: '8px 16px',
                animation: 'fadeIn 0.4s ease-out',
                '@keyframes fadeIn': {
                    from: { opacity: 0, transform: 'translateY(10px)' },
                    to: { opacity: 1, transform: 'translateY(0)' },
                },
            }}
        >
            <Typography
                variant="body2"
                sx={{
                    color: theme.palette.text.secondary,
                    textAlign: 'center',
                    fontStyle: 'italic',
                    fontWeight: 500,
                }}
            >
                {message}
            </Typography>
        </Box>
    );
};

export default React.memo(ChatStatusNotice);
