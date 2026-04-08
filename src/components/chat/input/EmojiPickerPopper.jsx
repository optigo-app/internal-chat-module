import React, { useState, useEffect } from 'react';
import { Box, Popper, Paper, ClickAwayListener } from '@mui/material';
import EmojiPicker from 'emoji-picker-react';

const EmojiPickerPopper = ({
    open,
    anchorEl,
    onEmojiClick,
    onClose,
}) => {
    const [placement, setPlacement] = useState('top-start');
    const [height, setHeight] = useState(400);

    const handleClickAway = (event) => {
        if (anchorEl && anchorEl.contains(event.target)) return;
        if (onClose) onClose();
    };

    useEffect(() => {
        if (!open || !anchorEl) return;
        
        const recompute = () => {
            if (!anchorEl) return;
            const rect = anchorEl.getBoundingClientRect();
            const vh = window.innerHeight || 0;
            const margin = 12;
            const chrome = 56;
            const maxH = 430;
            const minH = 250;
            
            const availableDown = Math.max(0, vh - rect.bottom - margin);
            const availableUp = Math.max(0, rect.top - margin);
            
            const fitDown = Math.max(0, Math.min(maxH, availableDown - chrome));
            const fitUp = Math.max(0, Math.min(maxH, availableUp - chrome));
            
            const openDown = fitDown >= fitUp;
            setPlacement(openDown ? 'bottom-start' : 'top-start');
            setHeight(Math.max(minH, openDown ? fitDown : fitUp));
        };

        recompute();
        window.addEventListener('resize', recompute);
        window.addEventListener('scroll', recompute, true);

        return () => {
            window.removeEventListener('resize', recompute);
            window.removeEventListener('scroll', recompute, true);
        };
    }, [open, anchorEl]);

    return (
        <Popper
            open={open}
            anchorEl={anchorEl}
            placement={placement}
            disablePortal={false}
            strategy="fixed"
            modifiers={[
                { name: 'offset', options: { offset: [0, 10] } },
                {
                    name: 'flip',
                    options: {
                        padding: 12,
                        fallbackPlacements: ['top-start', 'bottom-start', 'top-end', 'bottom-end'],
                    },
                },
                { name: 'preventOverflow', options: { padding: 12, altAxis: true, boundary: 'viewport' } },
            ]}
            sx={{ zIndex: (theme) => theme.zIndex.modal + 30 }}
        >
            <ClickAwayListener onClickAway={handleClickAway}>
                <Paper
                    elevation={0}
                    sx={{
                        borderRadius: 3,
                        overflow: 'hidden',
                        boxShadow: '0px 15px 45px rgba(0,0,0,0.15)',
                        maxWidth: 'min(380px, calc(100vw - 24px))',
                        maxHeight: 'calc(100vh - 24px)',
                        border: '1px solid rgba(0,0,0,0.06)',
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <Box sx={{ width: 380, maxWidth: '100%' }}>
                        <EmojiPicker
                            onEmojiClick={onEmojiClick}
                            width="100%"
                            height={height}
                            searchDisabled={false}
                            skinTonesDisabled={true}
                            previewConfig={{ showPreview: true }}
                            emojiStyle="apple"
                        />
                    </Box>
                </Paper>
            </ClickAwayListener>
        </Popper>
    );
};

export default React.memo(EmojiPickerPopper);
