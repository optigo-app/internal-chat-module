import React, { useEffect, useState, memo } from 'react';
import { Box, IconButton, Menu } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { SmilePlus } from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';

const QuickReactionMenu = ({
    open,
    anchorEl,
    onOpen,
    onClose,
    onSelectEmoji,
}) => {
    const theme = useTheme();
    const [menuOrigins, setMenuOrigins] = useState({
        anchorOrigin: { vertical: 'top', horizontal: 'center' },
        transformOrigin: { vertical: 'bottom', horizontal: 'center' },
    });



    const handlePick = (emojiData, event) => {
        event?.stopPropagation?.();
        onSelectEmoji?.(emojiData);
        onClose?.();
    };

    return (
        <>
            {/* Trigger Button */}
            <IconButton
                size="small"
                onClick={onOpen}
                aria-controls={open ? 'account-menu' : undefined}
                aria-haspopup="true"
                aria-expanded={open ? 'true' : undefined}
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
                <SmilePlus size={16} />
            </IconButton>

            {/* Reaction Menu */}
            <Menu
                anchorEl={anchorEl}
                open={open}
                onClose={onClose}
                anchorOrigin={menuOrigins.anchorOrigin}
                transformOrigin={menuOrigins.transformOrigin}
                PaperProps={{
                    elevation: 0,
                    marginThreshold: 12,
                    sx: {
                        borderRadius: 3,
                        p: 0,
                        m: 0,
                        overflow: 'hidden',
                        border: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
                    },
                }}
                MenuListProps={{ sx: { p: 0 } }}
            >
                <Box onClick={(e) => e.stopPropagation()}>
                    <EmojiPicker onEmojiClick={handlePick} width={300} height={380} skinTonesDisabled={true} />
                </Box>
            </Menu>
        </>
    );
};

export default memo(QuickReactionMenu);
