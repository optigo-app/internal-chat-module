import React from 'react';
import { Menu, MenuItem, ListItemIcon, ListItemText } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

const ViewContext = ({ contextMenu, handleCloseMenu, handleMenuAction, setContextMenu, selectedCustomer }) => {
    const handleMenuItemClick = (action) => {
        handleMenuAction(action);
        handleCloseMenu(); // Close after action
    };

    return (
        <Menu
            open={Boolean(contextMenu)}
            onClose={handleCloseMenu}
            anchorReference="anchorPosition"
            anchorPosition={
                contextMenu
                    ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
                    : undefined
            }
            PaperProps={{
                elevation: 0,
                sx: {
                    width: 220,
                    borderRadius: 2.5,

                    bgcolor: 'rgba(255, 255, 255, 0.92)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(0,0,0,0.08)',
                    boxShadow: '0 16px 40px rgba(0,0,0,0.12)',
                    position: 'fixed',
                    overflow: 'hidden',
                    '& .MuiList-root': {
                        py: 0.75,
                    },
                }
            }}
            onContextMenu={(e) => {
                e.preventDefault();
                setContextMenu({
                    mouseX: e.clientX + 2,
                    mouseY: e.clientY + 2,
                });
            }}
        >
            <MenuItem
                onClick={() => handleMenuItemClick("Close")}
                sx={{
                    mx: 0.75,
                    my: 0.25,
                    borderRadius: 2,
                    py: 1,
                    transition: 'background-color 160ms ease, transform 160ms ease',
                    '&:hover': {
                        backgroundColor: 'rgba(211, 47, 47, 0.08)',
                        transform: 'translateX(2px)',
                    },
                }}
            >
                <ListItemIcon sx={{ minWidth: 34, color: 'error.main' }}>
                    <CloseIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText
                    primary="Close Chat"
                    sx={{
                        '& .MuiTypography-root': {
                            fontSize: 14,
                            fontWeight: 600,
                            color: 'error.main',
                        },
                    }}
                />
            </MenuItem>
        </Menu>
    );
};

export default ViewContext;
