import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, IconButton, Box, Typography } from '@mui/material';
import { X, ZoomIn, ZoomOut } from 'lucide-react';

const ViewPhotoDialog = ({ open, onClose, imageUrl, title = "View Photo" }) => {
    const [zoom, setZoom] = useState(1);
    const [displayImageUrl, setDisplayImageUrl] = useState(imageUrl);

    // Keep last valid imageUrl so the photo stays visible during close transition
    useEffect(() => {
        if (imageUrl) setDisplayImageUrl(imageUrl);
    }, [imageUrl]);

    // Reset zoom when dialog closes
    useEffect(() => {
        if (!open) setZoom(1);
    }, [open]);

    const handleDoubleClick = () => {
        setZoom(prev => prev === 1 ? 2 : 1);
    };

    const handleZoomIn = () => {
        setZoom(prev => Math.min(prev + 0.5, 3));
    };

    const handleZoomOut = () => {
        setZoom(prev => Math.max(prev - 0.5, 1));
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="lg"
            fullWidth
            PaperProps={{
                sx: {
                    borderRadius: 3,
                    bgcolor: '#ffffff',
                    color: '#444050',
                    height: 'calc(100vh - 100px)',
                    maxHeight: '95vh',
                    boxShadow: '0px 5px 5px -3px rgba(0, 0, 0, 0.2), 0px 8px 10px 1px rgba(0, 0, 0, 0.14), 0px 3px 14px 2px rgba(0, 0, 0, 0.12)'
                }
            }}
            BackdropProps={{
                sx: {
                    backgroundColor: 'rgba(0, 0, 0, 0.6)',
                    backdropFilter: 'blur(4px)'
                }
            }}
        >
            {/* Header */}
            <Box
                sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    px: 2,
                    py: 1.2,
                    borderBottom: "1px solid #5a5a5a0e",
                    bgcolor: "#ffffff"
                }}
            >
                {/* Left - Close */}
                <IconButton onClick={onClose} size="small">
                    <X size={20} />
                </IconButton>

                {/* Center - Title */}
                <Typography
                    sx={{
                        fontFamily: "Poppins",
                        fontWeight: 500,
                        fontSize: "16px",
                        color: "#444050"
                    }}
                >
                    {title}
                </Typography>

                {/* Right - Zoom Controls */}
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <IconButton
                        onClick={handleZoomOut}
                        size="small"
                        disabled={zoom <= 1}
                        sx={{
                            bgcolor: "#ebebed",
                            "&:hover": { bgcolor: "#7367f0", color: "#fff" }
                        }}
                    >
                        <ZoomOut size={18} />
                    </IconButton>
                    <IconButton
                        onClick={handleZoomIn}
                        size="small"
                        disabled={zoom >= 3}
                        sx={{
                            bgcolor: "#ebebed",
                            "&:hover": { bgcolor: "#7367f0", color: "#fff" }
                        }}
                    >
                        <ZoomIn size={18} />
                    </IconButton>
                </Box>
            </Box>

            <DialogContent sx={{ p: 0, bgcolor: '#0b0b0b', height: '100%', overflow: 'hidden' }}>
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'auto',
                        width: '100%',
                        height: '100%',
                        cursor: 'zoom-in'
                    }}
                    onDoubleClick={handleDoubleClick}
                >
                    <img
                        src={displayImageUrl}
                        alt="Profile Photo"
                        style={{
                            maxWidth: '80%',
                            maxHeight: '80%',
                            display: 'block',
                            borderRadius: '50%',
                            aspectRatio: '1 / 1',
                            objectFit: 'cover',
                            transform: `scale(${zoom})`,
                            transition: 'transform 0.3s ease',
                            cursor: zoom > 1 ? 'zoom-out' : 'zoom-in'
                        }}
                    />
                </Box>
            </DialogContent>
        </Dialog>
    );
};

export default ViewPhotoDialog;
