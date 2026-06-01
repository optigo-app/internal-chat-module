import { Box } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import "./MessageContent.scss";

const MessageBubble = ({ msg, isOutgoing, children, selectedCustomer, onContextMenu }) => {
    const theme = useTheme();

    const handleContextMenu = (e) => {
        if (onContextMenu) {
            e.stopPropagation();
            onContextMenu(e);
        }
    };

    return (
        <Box
            className={`message-bubble-wrapper ${isOutgoing ? 'outgoing' : 'incoming'}`}
            onContextMenu={handleContextMenu}
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