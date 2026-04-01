import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, IconButton, Box, Typography, Button, Tooltip } from '@mui/material';
import { X, RotateCw, ZoomIn, ZoomOut, Info } from 'lucide-react';
import './ImageAdjustmentModal.scss';

const ImageAdjustmentModal = ({
    open,
    onClose,
    imageFile,
    onConfirm,
    title = "Adjust Image"
}) => {
    const [scale, setScale] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [rotation, setRotation] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [imageUrl, setImageUrl] = useState(null);
    const [imageLoaded, setImageLoaded] = useState(false);

    const containerRef = useRef(null);
    const imageRef = useRef(null);

    // Create image URL when file changes
    useEffect(() => {
        if (imageFile) {
            const url = URL.createObjectURL(imageFile);
            setImageUrl(url);
            setImageLoaded(false);
            return () => URL.revokeObjectURL(url);
        }
    }, [imageFile]);

    // Reset values when modal opens
    useEffect(() => {
        if (open) {
            setScale(1);
            setPosition({ x: 0, y: 0 });
            setRotation(0);
            setIsDragging(false);
            setImageLoaded(false);
        }
    }, [open]);

    // Keyboard controls
    useEffect(() => {
        if (!open) return;

        const handleKeyDown = (e) => {
            switch (e.key) {
                case 'Escape':
                    onClose();
                    break;
                case 'Enter':
                    handleConfirm();
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    setPosition(prev => ({ ...prev, y: prev.y - 10 }));
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    setPosition(prev => ({ ...prev, y: prev.y + 10 }));
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    setPosition(prev => ({ ...prev, x: prev.x - 10 }));
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    setPosition(prev => ({ ...prev, x: prev.x + 10 }));
                    break;
                case '+':
                case '=':
                    e.preventDefault();
                    handleZoomIn();
                    break;
                case '-':
                    e.preventDefault();
                    handleZoomOut();
                    break;
                case 'r':
                case 'R':
                    e.preventDefault();
                    handleRotate();
                    break;
                case '0':
                    e.preventDefault();
                    handleReset();
                    break;
                default:
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [open]);

    const handleImageLoad = () => {
        setImageLoaded(true);
        // Auto-fit image to circle on load
        if (imageRef.current) {
            const img = imageRef.current;
            const containerSize = 300; // Circle size
            const imgAspect = img.naturalWidth / img.naturalHeight;

            // Calculate initial scale to fit image in circle
            let initialScale;
            if (imgAspect > 1) {
                // Landscape - fit height
                initialScale = containerSize / img.naturalHeight;
            } else {
                // Portrait or square - fit width
                initialScale = containerSize / img.naturalWidth;
            }

            // Ensure minimum coverage of the circle
            initialScale = Math.max(initialScale, 1);
            setScale(initialScale);
        }
    };

    const handleMouseDown = (e) => {
        e.preventDefault();
        setIsDragging(true);
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        setDragStart({
            x: clientX - position.x,
            y: clientY - position.y
        });
    };

    const handleMouseMove = (e) => {
        if (!isDragging) return;
        e.preventDefault();

        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        const newX = clientX - dragStart.x;
        const newY = clientY - dragStart.y;

        setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = (e) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleZoomIn = () => {
        setScale(prev => Math.min(prev + 0.1, 3));
    };

    const handleZoomOut = () => {
        setScale(prev => Math.max(prev - 0.1, 0.5));
    };

    const handleWheel = (e) => {
        e.preventDefault();
        const zoomIntensity = 0.1;
        if (e.deltaY < 0) {
            setScale(prev => Math.min(prev + zoomIntensity, 3));
        } else {
            setScale(prev => Math.max(prev - zoomIntensity, 0.5));
        }
    };

    const handleRotate = () => {
        setRotation(prev => (prev + 90) % 360);
    };

    const handleReset = () => {
        setScale(1);
        setPosition({ x: 0, y: 0 });
        setRotation(0);
    };

    const handleConfirm = async () => {
        if (!imageFile || !imageRef.current) return;
        
        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();

            img.onload = () => {

                const size = 320;
                canvas.width = size;
                canvas.height = size;

                ctx.save();

                // create circular clipping mask
                ctx.beginPath();
                ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
                ctx.closePath();
                ctx.clip();

                // optional background
                ctx.fillStyle = "#ffffff";
                ctx.fillRect(0, 0, size, size);

                ctx.save();

                // move to center
                ctx.translate(size / 2, size / 2);

                // rotate
                ctx.rotate((rotation * Math.PI) / 180);

                // zoom
                ctx.scale(scale, scale);

                const cropSize = 300;

                const scaleFactor = size / cropSize;

                const imgAspect = img.width / img.height;

                let drawWidth, drawHeight;

                // COVER LOGIC (like object-fit: cover)
                if (imgAspect > 1) {
                    drawHeight = size;
                    drawWidth = size * imgAspect;
                } else {
                    drawWidth = size;
                    drawHeight = size / imgAspect;
                }

                // scale drag position to canvas
                const offsetX = position.x * scaleFactor;
                const offsetY = position.y * scaleFactor;

                ctx.translate(offsetX, offsetY);

                ctx.drawImage(
                    img,
                    -drawWidth / 2,
                    -drawHeight / 2,
                    drawWidth,
                    drawHeight
                );

                ctx.restore();

                canvas.toBlob((blob) => {

                    const adjustedFile = new File(
                        [blob],
                        imageFile.name,
                        {
                            type: "image/jpeg",
                            lastModified: Date.now()
                        }
                    );

                    onConfirm(adjustedFile);

                }, "image/jpeg", 0.95);
            };

            img.src = imageUrl;

        } catch (error) {
            console.error("Error processing image:", error);
            onConfirm(imageFile);
        }
    };
    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="sm"
            fullWidth
            className="image-adjustment-modal"
            PaperProps={{
                sx: {
                    borderRadius: 3,
                    bgcolor: '#ffffff',
                    color: '#444050',
                    maxHeight: '90vh',
                    boxShadow: '0px 5px 5px -3px rgba(0, 0, 0, 0.2), 0px 8px 10px 1px rgba(0, 0, 0, 0.14), 0px 3px 14px 2px rgba(0, 0, 0, 0.12)'
                }
            }}
            BackdropProps={{
                sx: {
                    backgroundColor: 'rgba(0, 0, 0, 0.6)',
                    backdropFilter: 'blur(4px)',
                    animation: 'fadeIn 0.25s ease-out'
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

                {/* Right - Controls */}
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.8 }}>

                    <IconButton
                        onClick={handleZoomOut}
                        size="small"
                        disabled={scale <= 0.5}
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
                        disabled={scale >= 3}
                        sx={{
                            bgcolor: "#ebebed",
                            "&:hover": { bgcolor: "#7367f0", color: "#fff" }
                        }}
                    >
                        <ZoomIn size={18} />
                    </IconButton>

                    <IconButton
                        onClick={handleRotate}
                        size="small"
                        sx={{
                            bgcolor: "#ebebed",
                            "&:hover": { bgcolor: "#7367f0", color: "#fff" }
                        }}
                    >
                        <RotateCw size={18} />
                    </IconButton>

                    <Button
                        size="small"
                        onClick={handleReset}
                        sx={{
                            textTransform: "none",
                            fontSize: 13,
                            minWidth: "auto",
                            px: 1
                        }}
                    >
                        Reset
                    </Button>

                    <Tooltip title={<Box sx={{ p: 1 }}>
                        <Typography variant="subtitle2"
                            sx={{ fontWeight: 600, mb: 1.5, color: '#fff', textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,0.2)', pb: 1 }}
                        > Keyboard Shortcuts
                        </Typography>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.8 }}> <Box sx={{ display: 'flex', justifyContent: 'space-between', minWidth: 218 }}>
                            <Typography variant="caption" sx={{ color: '#e0e0e0' }}>Move Image:</Typography>
                            <Typography variant="caption" sx={{ color: '#fff', fontWeight: 600, bgcolor: 'rgba(255,255,255,0.1)', px: 0.5, py: 0.2, borderRadius: 0.5 }}> ↑ ↓ ← → </Typography>
                        </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}> <Typography variant="caption" sx={{ color: '#e0e0e0' }}>Zoom In:</Typography> <Typography variant="caption" sx={{ color: '#fff', fontWeight: 600, bgcolor: 'rgba(255,255,255,0.1)', px: 0.5, py: 0.2, borderRadius: 0.5 }}> + = </Typography> </Box> <Box sx={{ display: 'flex', justifyContent: 'space-between' }}> <Typography variant="caption" sx={{ color: '#e0e0e0' }}>Zoom Out:</Typography> <Typography variant="caption" sx={{ color: '#fff', fontWeight: 600, bgcolor: 'rgba(255,255,255,0.1)', px: 0.5, py: 0.2, borderRadius: 0.5 }}> - </Typography> </Box> <Box sx={{ display: 'flex', justifyContent: 'space-between' }}> <Typography variant="caption" sx={{ color: '#e0e0e0' }}>Rotate:</Typography> <Typography variant="caption" sx={{ color: '#fff', fontWeight: 600, bgcolor: 'rgba(255,255,255,0.1)', px: 0.5, py: 0.2, borderRadius: 0.5 }}> R </Typography> </Box> <Box sx={{ display: 'flex', justifyContent: 'space-between' }}> <Typography variant="caption" sx={{ color: '#e0e0e0' }}>Reset:</Typography> <Typography variant="caption" sx={{ color: '#fff', fontWeight: 600, bgcolor: 'rgba(255,255,255,0.1)', px: 0.5, py: 0.2, borderRadius: 0.5 }}> 0 </Typography> </Box> <Box sx={{ display: 'flex', justifyContent: 'space-between' }}> <Typography variant="caption" sx={{ color: '#e0e0e0' }}>Confirm:</Typography> <Typography variant="caption" sx={{ color: '#fff', fontWeight: 600, bgcolor: 'rgba(255,255,255,0.1)', px: 0.5, py: 0.2, borderRadius: 0.5 }}> Enter </Typography> </Box> <Box sx={{ display: 'flex', justifyContent: 'space-between' }}> <Typography variant="caption" sx={{ color: '#e0e0e0' }}>Cancel:</Typography> <Typography variant="caption" sx={{ color: '#fff', fontWeight: 600, bgcolor: 'rgba(255,255,255,0.1)', px: 0.5, py: 0.2, borderRadius: 0.5 }}> Escape </Typography> </Box> </Box> </Box>} arrow placement="bottom-end" componentsProps={{ tooltip: { sx: { bgcolor: '#444050', color: '#fff', fontSize: '12px', fontFamily: 'Poppins', maxWidth: 300, '& .MuiTooltip-arrow': { color: '#444050', }, }, }, }} >
                        <IconButton sx={{ color: '#7D7f85', '&:hover': { color: '#7367f0', bgcolor: 'rgba(115, 103, 240, 0.08)' } }}>
                            <Info size={18} />
                        </IconButton>
                    </Tooltip>
                </Box>
            </Box>

            <DialogContent sx={{ p: 0, bgcolor: '#f8f9fa' }}>
                {/* Image Container */}
                <Box
                    ref={containerRef}
                    onWheel={handleWheel}
                    className="image-adjustment-container"
                    sx={{
                        position: 'relative',
                        height: 320,
                        overflow: 'hidden',
                        cursor: isDragging ? 'grabbing' : 'grab',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: '#f8f9fa'
                    }}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    onTouchStart={handleMouseDown}
                    onTouchMove={handleMouseMove}
                    onTouchEnd={handleMouseUp}
                >
                    {/* Circular Crop Overlay - Visual Guide Only */}
                    <Box
                        sx={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            width: 300,
                            height: 300,
                            borderRadius: '50%',
                            border: '3px solid #7367f0',
                            boxShadow: '0 0 0 9999px rgba(0,0,0,0.3)',
                            pointerEvents: 'none',
                            zIndex: 2
                        }}
                    />

                    {/* Square crop indicator */}
                    <Box
                        sx={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            width: 300,
                            height: 300,
                            border: '2px dashed rgba(115, 103, 240, 0.5)',
                            pointerEvents: 'none',
                            zIndex: 1
                        }}
                    />
                    {/* Image */}
                    {imageUrl && (
                        <img
                            ref={imageRef}
                            src={imageUrl}
                            alt="Adjust"
                            onLoad={handleImageLoad}
                            style={{
                                maxWidth: 'none',
                                maxHeight: 'none',
                                width: 'auto',
                                height: 'auto',
                                minWidth: 300,
                                minHeight: 300,
                                transform: `translate(${position.x}px, ${position.y}px) scale(${scale}) rotate(${rotation}deg)`,
                                transition: isDragging ? 'none' : 'transform 0.1s ease',
                                userSelect: 'none',
                                pointerEvents: 'none',
                                opacity: imageLoaded ? 1 : 0
                            }}
                        />
                    )}

                    {/* Loading indicator */}
                    {!imageLoaded && imageUrl && (
                        <Box sx={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            color: '#444050'
                        }}>
                            <Typography sx={{ fontFamily: 'Poppins' }}>Loading...</Typography>
                        </Box>
                    )}
                </Box>

                {/* Action Buttons */}
                <Box sx={{
                    display: 'flex',
                    gap: 2,
                    p: 2,
                    bgcolor: '#ffffff'
                }}>
                    <Button
                        fullWidth
                        variant="outlined"
                        onClick={onClose}
                        className="secondaryBtnClassname"
                        sx={{
                            fontFamily: 'Poppins',
                            textTransform: 'capitalize',
                            borderRadius: '16px'
                        }}
                    >
                        Cancel
                    </Button>
                    <Button
                        fullWidth
                        variant="contained"
                        onClick={handleConfirm}
                        className="primaryBtnClassname"
                        sx={{
                            fontFamily: 'Poppins',
                            textTransform: 'capitalize',
                            borderRadius: '16px'
                        }}
                    >
                        Done
                    </Button>
                </Box>
            </DialogContent>
        </Dialog>
    );
};

export default ImageAdjustmentModal;