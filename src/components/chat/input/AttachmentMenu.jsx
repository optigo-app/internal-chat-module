import React from 'react';
import { Menu, MenuItem, ListItemIcon, ListItemText } from '@mui/material';
import ImageIcon from '@mui/icons-material/Image';
import VideoLibraryIcon from '@mui/icons-material/VideoLibrary';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';

const AttachmentMenu = ({
    anchorEl,
    open,
    onClose,
    onFilePick,
    imageParams,
    videoParams,
    docsParams,
}) => {
    return (
        <Menu
            anchorEl={anchorEl}
            open={open}
            onClose={onClose}
            onClick={(e) => e.stopPropagation()}
            sx={{ zIndex: (theme) => theme.zIndex.modal + 20 }}
            PaperProps={{
                elevation: 0,
                sx: {
                    minWidth: 200,
                    borderRadius: 2.5,
                    py: 1,
                    mb: 1.5,
                    boxShadow: "0px 10px 25px rgba(0,0,0,0.12), 0px 4px 10px rgba(0,0,0,0.08)",
                    border: '1px solid rgba(0,0,0,0.05)',
                },
            }}
            transformOrigin={{ horizontal: 'left', vertical: 'bottom' }}
            anchorOrigin={{ horizontal: 'left', vertical: 'top' }}
        >
            <MenuItem
                onClick={(e) => onFilePick(e, imageParams)}
                sx={{ py: 1.2, px: 2.5, mx: 0.8, borderRadius: 1.5 }}
            >
                <ListItemIcon sx={{ minWidth: '38px', color: '#0046FF' }}>
                    <ImageIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText primary="Photo" primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }} />
            </MenuItem>

            <MenuItem
                onClick={(e) => onFilePick(e, videoParams)}
                sx={{ py: 1.2, px: 2.5, mx: 0.8, borderRadius: 1.5 }}
            >
                <ListItemIcon sx={{ minWidth: '38px', color: '#FF8040' }}>
                    <VideoLibraryIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText primary="Video" primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }} />
            </MenuItem>

            <MenuItem
                onClick={(e) => onFilePick(e, docsParams)}
                sx={{ py: 1.2, px: 2.5, mx: 0.8, borderRadius: 1.5 }}
            >
                <ListItemIcon sx={{ minWidth: '38px', color: '#9929EA' }}>
                    <InsertDriveFileIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText primary="Document" primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }} />
            </MenuItem>
        </Menu>
    );
};

export default React.memo(AttachmentMenu);
