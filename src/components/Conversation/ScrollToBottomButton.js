import React from 'react';
import { Box, Zoom } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { ArrowDown } from 'lucide-react';

const ScrollToBottomButton = ({
    open,
    onClick,
    bottom = 110,
    right = 30,
    size = 40,
    title = 'Scroll to bottom',
}) => {
    const theme = useTheme();

    const handleClick = () => {
        onClick?.();
    };

    return (
        <Zoom in={Boolean(open)}>
            <Box
                role="button"
                aria-label={title}
                tabIndex={0}
                onClick={handleClick}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleClick();
                    }
                }}
                title={title}
                sx={{
                    position: 'fixed',
                    bottom: `${bottom}px`,
                    right: `${right}px`,
                    width: `${size}px`,
                    height: `${size}px`,
                    borderRadius: '50%',
                    backgroundColor: theme.palette.background.hightlight,
                    boxShadow: `0 6px 18px ${alpha(theme.palette.common.black, 0.25)}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    zIndex: 1000,
                    userSelect: 'none',
                    transition: 'transform 160ms ease, box-shadow 200ms ease, background-color 200ms ease',

                    '@keyframes scrollToBottomPulse': {
                        '0%': {
                            boxShadow: `0 6px 18px ${alpha(theme.palette.common.black, 0.22)}`,
                            transform: 'translateY(0px) scale(1)',
                        },
                        '50%': {
                            boxShadow: `0 10px 26px ${alpha(theme.palette.common.black, 0.3)}`,
                            transform: 'translateY(-1px) scale(1.03)',
                        },
                        '100%': {
                            boxShadow: `0 6px 18px ${alpha(theme.palette.common.black, 0.22)}`,
                            transform: 'translateY(0px) scale(1)',
                        },
                    },

                    animation: 'scrollToBottomPulse 2.2s ease-in-out infinite',

                    '&:hover': {
                        transform: 'translateY(-2px) scale(1.05)',
                        boxShadow: `0 14px 34px ${alpha(theme.palette.common.black, 0.28)}`,
                    },

                    '&:active': {
                        transform: 'translateY(0px) scale(0.98)',
                    },

                    '&:focus-visible': {
                        outline: `2px solid ${alpha(theme.palette.primary.main, 0.6)}`,
                        outlineOffset: '3px',
                    },
                }}
            >
                <ArrowDown size={20} color={theme.palette.text.extraLight} />
            </Box>
        </Zoom>
    );
};

export default ScrollToBottomButton;
