import { useState, useEffect } from 'react';
import { Avatar, CircularProgress } from '@mui/material';
import { Camera, Upload, Eye, Trash2 } from 'lucide-react';
import { checkCameraAvailability, capturePhotoFromCamera, openImageFilePicker } from '../../utils/cameraUtils';
import { uploadMediaAPi } from '../../API/FileUpload/uploadHelpers';
import { removeFileApi } from '../../API/FileUpload/filesRemoveApi';
import { getWhatsAppAvatarConfig } from '../../utils/globalFunc';
import toast from 'react-hot-toast';
import ConfirmationDialog from './ConfirmationDialog';
import WhatsAppMenu from './WhatsAppMenu';
import ImageAdjustmentModal from './ImageAdjustmentModal';

const ProfileAvatarUpload = ({
    size = 130,
    currentImageUrl = null,
    avatarSeed = '',
    showOverlay = true,
    overlayText = 'Add group\nicon',
    onImageSelected,
    onUploadComplete,
    onUploadError,
    onRemoveComplete,
    disabled = false,
    className = '',
    folderName = 'tecochat/profileImage'
}) => {
    const [menuAnchorEl, setMenuAnchorEl] = useState(null);
    const [previewImage, setPreviewImage] = useState(currentImageUrl);
    const [isUploading, setIsUploading] = useState(false);
    const [cameraDialog, setCameraDialog] = useState({ open: false, message: '' });
    const [removeDialog, setRemoveDialog] = useState({ open: false });
    const [adjustmentModal, setAdjustmentModal] = useState({ open: false, file: null });

    // Update preview when currentImageUrl changes
    useEffect(() => {
        setPreviewImage(currentImageUrl);
    }, [currentImageUrl]);

    // Determine if there's an existing image
    const hasExistingImage = !!(currentImageUrl || previewImage);

    // Dynamic menu items based on whether image exists
    const photoMenuItems = hasExistingImage ? [
        {
            label: "View Photo",
            action: "viewPhoto",
            icon: <Eye size={20} />,
        },
        {
            label: "Take Photo",
            action: "takePhoto",
            icon: <Camera size={20} />,
        },
        {
            label: "Upload Photo",
            action: "uploadPhoto",
            icon: <Upload size={20} />,
        },
        {
            label: "Remove Photo",
            action: "removePhoto",
            icon: <Trash2 size={20} />,
            danger: true
        }
    ] : [
        {
            label: "Take Photo",
            action: "takePhoto",
            icon: <Camera size={20} />,
        },
        {
            label: "Upload Photo",
            action: "uploadPhoto",
            icon: <Upload size={20} />,
        },
    ];

    const handleAvatarClick = (event) => {
        if (!disabled) {
            setMenuAnchorEl(event.currentTarget);
        }
    };

    const handleMenuClose = () => {
        setMenuAnchorEl(null);
    };

    const handleTakePhoto = async () => {
        handleMenuClose();

        const hasCamera = await checkCameraAvailability();
        if (!hasCamera) {
            setCameraDialog({
                open: true,
                message: 'No camera detected on this device. Please use "Upload Photo" to select an image from your files.'
            });
            return;
        }
        capturePhotoFromCamera((files) => {
            handlePhotoSelected(files);
        });
    };

    const handleUploadPhoto = async () => {
        handleMenuClose();

        openImageFilePicker((files) => {
            handlePhotoSelected(files);
        }, false);
    };

    const handleViewPhoto = () => {
        handleMenuClose();
        const imageUrl = previewImage || currentImageUrl;
        if (imageUrl) {
            window.open(imageUrl, '_blank');
        }
    };

    const handleRemovePhoto = () => {
        handleMenuClose();
        setRemoveDialog({ open: true });
    };

    const handleConfirmRemove = async () => {
        setRemoveDialog({ open: false });
        setIsUploading(true);

        try {
            // Remove from storage
            await removeExistingImage();

            // Clear preview and notify parent
            setPreviewImage(null);

            if (onRemoveComplete) {
                onRemoveComplete();
            } else {
                toast.success('Photo removed successfully');
            }
        } catch (error) {
            console.error('Error removing photo:', error);
            if (onUploadError) {
                onUploadError(error);
            } else {
                toast.error('Error removing photo');
            }
        } finally {
            setIsUploading(false);
        }
    };

    const removeExistingImage = async () => {
        const imageUrl = currentImageUrl || previewImage;
        if (!imageUrl) return;

        try {
            const response = await removeFileApi({ attachments: imageUrl });
            console.log('Existing image removed from storage:', response?.status);
            return response;
        } catch (error) {
            console.error('Error removing existing image:', error);
            throw error; // Re-throw to handle in calling function
        }
    };

    const handlePhotoSelected = (files) => {
        if (files && files.length > 0) {
            const file = files[0];
            if (!file.type.startsWith('image/')) {
                toast.error('Please select a valid image file');
                return;
            }
            const maxSize = 5 * 1024 * 1024;
            if (file.size > maxSize) {
                toast.error('Image size should be less than 5MB');
                return;
            }

            // Open adjustment modal instead of immediate processing
            setAdjustmentModal({ open: true, file });
        }
    };

    const handleAdjustmentComplete = async (adjustedFile) => {
        setAdjustmentModal({ open: false, file: null });

        // Create preview URL
        const reader = new FileReader();
        reader.onload = (e) => {
            setPreviewImage(e.target.result);
            if (onImageSelected) {
                onImageSelected(adjustedFile, e.target.result);
            }
        };
        reader.readAsDataURL(adjustedFile);

        // Upload if no onImageSelected callback (immediate upload mode)
        if (!onImageSelected) {
            await uploadPhotoWithRemoval(adjustedFile);
        }
    };

    const handleAdjustmentCancel = () => {
        setAdjustmentModal({ open: false, file: null });
    };

    const uploadPhotoWithRemoval = async (file) => {
        setIsUploading(true);
        try {
            // Step 1: Remove existing image if it exists
            if (hasExistingImage) {
                await removeExistingImage();
            }

            // Step 2: Upload new image
            const uploadedFiles = await uploadMediaAPi({
                folderName,
                files: [file],
                onProgress: (progress) => {
                    console.log('Upload progress:', progress);
                }
            });

            if (uploadedFiles && Array.isArray(uploadedFiles) && uploadedFiles.length > 0) {
                const uploadedFile = uploadedFiles[0];
                const imageUrl = uploadedFile?.FileUrl || uploadedFile?.fileUrl || uploadedFile?.Url || uploadedFile?.url || uploadedFile?.path;

                if (!imageUrl) {
                    throw new Error('Failed to get image URL from upload');
                }

                if (onUploadComplete) {
                    onUploadComplete(imageUrl, file);
                } else {
                    toast.success('Photo uploaded successfully');
                }
            } else {
                throw new Error('Upload failed - no files returned');
            }
        } catch (error) {
            console.error('Error in upload process:', error);
            setPreviewImage(currentImageUrl);
            if (onUploadError) {
                onUploadError(error);
            } else {
                toast.error('Error uploading photo');
            }
        } finally {
            setIsUploading(false);
        }
    };

    const handleCloseCameraDialog = () => {
        setCameraDialog({ open: false, message: '' });
    };

    const displayImage = previewImage || currentImageUrl;

    return (
        <>
            <div
                className={`avatar-container ${className}`}
                onClick={handleAvatarClick}
                style={{
                    cursor: disabled ? 'default' : 'pointer',
                    position: 'relative',
                    display: 'inline-block'
                }}
            >
                <Avatar
                    {...(displayImage ? {} : getWhatsAppAvatarConfig(avatarSeed, size))}
                    className="profile-avatar"
                    src={displayImage}
                    sx={{
                        width: size,
                        height: size,
                        ...(displayImage ? {} : getWhatsAppAvatarConfig(avatarSeed, size).sx)
                    }}
                >
                    {!displayImage && getWhatsAppAvatarConfig(avatarSeed, size).children}
                </Avatar>

                {showOverlay && !disabled && (
                    <div className="avatar-overlay" style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.5)',
                        borderRadius: '50%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: '12px',
                        textAlign: 'center',
                        opacity: 0,
                        transition: 'opacity 0.2s',
                        '&:hover': {
                            opacity: 1
                        }
                    }}>
                        {isUploading ? (
                            <CircularProgress size={24} sx={{ color: 'white' }} />
                        ) : (
                            <>
                                <Camera size={24} />
                                <span style={{ fontSize: '10px', marginTop: '4px' }}>
                                    {overlayText.split('\n').map((line, i) => (
                                        <div key={i}>{line}</div>
                                    ))}
                                </span>
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* Photo Selection Menu */}
            <WhatsAppMenu
                anchorEl={menuAnchorEl}
                open={Boolean(menuAnchorEl)}
                onClose={handleMenuClose}
                items={photoMenuItems}
                onAction={(action) => {
                    if (action === "takePhoto") handleTakePhoto();
                    if (action === "uploadPhoto") handleUploadPhoto();
                    if (action === "viewPhoto") handleViewPhoto();
                    if (action === "removePhoto") handleRemovePhoto();
                }}
                sx={{
                    minWidth: 200,
                    boxShadow: "0px 6px 18px rgba(0,0,0,0.12), 0px 3px 6px rgba(0,0,0,0.08)",
                    px: 1
                }}
                transformOrigin={{ horizontal: "center", vertical: "top" }}
                anchorOrigin={{ horizontal: "center", vertical: "bottom" }}
            />

            {/* Camera Not Found Dialog */}
            <ConfirmationDialog
                isOpen={cameraDialog.open}
                onClose={handleCloseCameraDialog}
                onConfirm={handleCloseCameraDialog}
                title="Camera Not Available"
                description={cameraDialog.message}
                confirmText="OK"
                variant="primary"
                showCancel={false}
            />

            {/* Remove Photo Confirmation Dialog */}
            <ConfirmationDialog
                isOpen={removeDialog.open}
                onClose={() => setRemoveDialog({ open: false })}
                onConfirm={handleConfirmRemove}
                title="Remove Profile Photo"
                description="Are you sure you want to remove this profile photo?"
                confirmText="Remove"
                cancelText="Cancel"
                variant="danger"
                showCancel={true}
            />

            {/* Image Adjustment Modal */}
            <ImageAdjustmentModal
                open={adjustmentModal.open}
                onClose={handleAdjustmentCancel}
                imageFile={adjustmentModal.file}
                onConfirm={handleAdjustmentComplete}
                title="Adjust Profile Image"
            />
        </>
    );
};

export default ProfileAvatarUpload;