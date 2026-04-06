import { Box } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import "./MessageContent.scss";

const MessageBubble = ({ msg, isOutgoing, children, selectedCustomer }) => {
    const theme = useTheme();

    return (
        <Box
            className={`message-bubble-wrapper ${isOutgoing ? 'outgoing' : 'incoming'}`}
        >
            <Box
                className={`message-bubble ${isOutgoing ? 'outgoing' : 'incoming'} ${msg?.MessageType === 'text' ? 'text-message' : 'media-message'}`}
                sx={{
                    '&&': {
                        backgroundColor: (isOutgoing
                            ? alpha(theme.palette.primary.main, 0.15)
                            : theme.palette.background.paper) + ' !important',
                        color: theme.palette.text.primary + ' !important',
                    },
                }}
            >
                {children}
            </Box>
        </Box>
    );
};


export default MessageBubble;