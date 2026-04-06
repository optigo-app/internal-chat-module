import React from "react";
import { Box, IconButton } from "@mui/material";
import { Forward } from "lucide-react";
import { alpha, useTheme } from "@mui/material/styles";

import QuickReactionMenu from "../../Conversation/QuickReactionMenu";

const MessageActions = ({
    msg,
    isOutgoing,
    shouldShowActions,
    handleForward,
    isReactionMenuOpenForCurrent,
    reactionMenuAnchorEl,
    setHoveredMessageId,
    currentHoverId,
    setReactionMenuAnchorEl,
    setReactionMenuMessageId,
    closeReactionMenu,
    handleMessageEmojiClick,
}) => {
    const theme = useTheme();

    return (
        <Box
            className="message-actions"
            sx={{
                '&&': {
                    position: 'absolute !important',
                    top: '50% !important',
                    left: isOutgoing ? '0px !important' : 'auto !important',
                    right: isOutgoing ? 'auto !important' : '0px !important',
                    marginRight: '0px !important',
                    transform: `translate(${isOutgoing ? '-110%' : '110%'}, -50%) !important`,
                    display: 'flex',
                    flexDirection: isOutgoing ? 'row-reverse' : 'row',
                    alignItems: 'center',
                    gap: '6px',
                    zIndex: '6 !important',
                    pointerEvents: 'none !important',
                    opacity: '1 !important',
                    boxShadow: 'none'
                },
            }}
        >
            {/* Forward Action: only for media messages (handleForward is undefined for text) */}
            {!msg.IsDeletedForEveryone && !!handleForward && (
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '2px',
                        borderRadius: '999px',
                        backgroundColor: alpha(theme.palette.background.paper, 0.92),
                        border: `1px solid ${theme.palette.borderColor?.extraLight || theme.palette.divider}`,
                        boxShadow: `0 6px 14px ${alpha('#000', 0.12)}`,
                        pointerEvents: 'auto',
                    }}
                >
                    <IconButton
                        size="small"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleForward(msg, e);
                        }}
                        sx={{
                            width: 28,
                            height: 28,
                            color: theme.palette.text.secondary,
                            transition: 'all 0.2s ease',
                            '&:hover': {
                                backgroundColor: alpha(theme.palette.primary.main, 0.12),
                                color: theme.palette.primary.main,
                            },
                        }}
                    >
                        <Forward size={16} />
                    </IconButton>
                </Box>
            )}

            {/* Reaction Menu: Visible on Hover */}
            {!msg.IsDeletedForEveryone && (
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '2px',
                        borderRadius: '999px',
                        backgroundColor: alpha(theme.palette.background.paper, 0.92),
                        border: `1px solid ${theme.palette.borderColor?.extraLight || theme.palette.divider}`,
                        boxShadow: `0 6px 14px ${alpha('#000', 0.12)}`,
                        opacity: shouldShowActions ? 1 : 0,
                        pointerEvents: shouldShowActions ? 'auto' : 'none',
                        transition: 'opacity 160ms ease, transform 160ms ease',
                        transform: shouldShowActions ? 'scale(1)' : 'scale(0.8)',
                    }}
                >
                    <QuickReactionMenu
                        open={isReactionMenuOpenForCurrent}
                        anchorEl={reactionMenuAnchorEl}
                        onOpen={(e) => {
                            e.stopPropagation();
                            setHoveredMessageId(currentHoverId);
                            setReactionMenuAnchorEl(e.currentTarget);
                            setReactionMenuMessageId(currentHoverId);
                        }}
                        onClose={(e) => {
                            e?.stopPropagation?.();
                            closeReactionMenu();
                        }}
                        onSelectEmoji={(emoji) => {
                            if (typeof handleMessageEmojiClick === 'function') {
                                handleMessageEmojiClick(emoji, msg);
                            }
                            closeReactionMenu();
                        }}
                    />
                </Box>
            )}
        </Box>
    );
};


export default MessageActions;