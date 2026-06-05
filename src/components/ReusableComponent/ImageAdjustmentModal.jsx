import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, IconButton, Box, Typography, Button, Tooltip } from '@mui/material';
import { X, RotateCw, ZoomIn, ZoomOut, Info } from 'lucide-react';
import './ImageAdjustmentModal.scss';

const CROP_SIZE = 300;

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

    // Calculate base dimensions so image covers the crop circle at scale=1
    const getBaseDimensions = () => {
        if (!imageRef.current) return { w: CROP_SIZE, h: CROP_SIZE };
        const img = imageRef.current;
        const aspect = img.naturalWidth / img.naturalHeight;
        if (aspect > 1) {
            return { w: CROP_SIZE * aspect, h: CROP_SIZE };
        }
        return { w: CROP_SIZE, h: CROP_SIZE / aspect };
    };

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



    const handleImageLoad = () => {
        setImageLoaded(true);
        // Reset to cover-fit defaults (scale=1 means image covers the circle)
        setScale(1);
        setPosition({ x: 0, y: 0 });
    };

    const getMaxOffset = (currentScale) => {
        const base = getBaseDimensions();
        const scaledWidth = base.w * currentScale;
        const scaledHeight = base.h * currentScale;

        const maxX = Math.max(0, (scaledWidth - CROP_SIZE) / 2);
        const maxY = Math.max(0, (scaledHeight - CROP_SIZE) / 2);

        return { maxX, maxY };
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

        const { maxX, maxY } = getMaxOffset(scale);

        setPosition({
            x: Math.max(-maxX, Math.min(maxX, newX)),
            y: Math.max(-maxY, Math.min(maxY, newY))
        });
    };;

    const handleMouseUp = (e) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const clampPosition = (pos, newScale) => {
        const { maxX, maxY } = getMaxOffset(newScale);
        return {
            x: Math.max(-maxX, Math.min(maxX, pos.x)),
            y: Math.max(-maxY, Math.min(maxY, pos.y))
        };
    };

    const handleZoomIn = () => {
        setScale(prev => {
            const next = Math.min(prev + 0.1, 3);
            setPosition(p => clampPosition(p, next));
            return next;
        });
    };

    const handleZoomOut = () => {
        setScale(prev => {
            const next = Math.max(prev - 0.1, 0.5);
            setPosition(p => clampPosition(p, next));
            return next;
        });
    };

    const handleWheel = (e) => {
        e.preventDefault();
        const zoomIntensity = 0.1;
        setScale(prev => {
            const next = e.deltaY < 0
                ? Math.min(prev + zoomIntensity, 3)
                : Math.max(prev - zoomIntensity, 0.5);
            setPosition(p => clampPosition(p, next));
            return next;
        });
    };

    const handleRotate = () => {
        setRotation(prev => (prev + 90) % 360);
    };

    const handleReset = () => {
        setScale(1);
        setPosition({ x: 0, y: 0 });
        setRotation(0);
    };

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
                    setPosition(prev => clampPosition({ ...prev, y: prev.y - 10 }, scale));
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    setPosition(prev => clampPosition({ ...prev, y: prev.y + 10 }, scale));
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    setPosition(prev => clampPosition({ ...prev, x: prev.x - 10 }, scale));
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    setPosition(prev => clampPosition({ ...prev, x: prev.x + 10 }, scale));
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

    const handleConfirm = async () => {
        if (!imageFile || !imageRef.current) return;

        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();

            img.onload = () => {

                const size = 640; // Higher resolution output for crisp profile photos
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
                            border: '2px solid rgba(255,255,255,0.9)',
                            boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)',
                            pointerEvents: 'none',
                            zIndex: 2
                        }}
                    />
                    {/* Image */}
                    {imageUrl && (() => {
                        const base = getBaseDimensions();
                        return (
                            <img
                                ref={imageRef}
                                src={imageUrl}
                                alt="Adjust"
                                onLoad={handleImageLoad}
                                style={{
                                    position: 'absolute',
                                    top: '50%',
                                    left: '50%',
                                    width: base.w,
                                    height: base.h,
                                    transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px)) scale(${scale}) rotate(${rotation}deg)`,
                                    transformOrigin: 'center center',
                                    transition: isDragging ? 'none' : 'transform 0.1s ease',
                                    userSelect: 'none',
                                    pointerEvents: 'none',
                                    opacity: imageLoaded ? 1 : 0
                                }}
                            />
                        );
                    })()}

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