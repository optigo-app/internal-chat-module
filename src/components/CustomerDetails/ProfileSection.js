import { Typography, Avatar, IconButton, Box, TextField, InputAdornment, Badge, styled } from '@mui/material';
import { User, Pencil, X, Check } from 'lucide-react';
import { useState } from 'react';
import ProfileAvatarUpload from '../ReusableComponent/ProfileAvatarUpload';
import ViewPhotoDialog from '../ReusableComponent/ViewPhotoDialog';
import { getWhatsAppAvatarConfig, hasCustomerName, isImageDead } from '../../utils/globalFunc';
import { renderEmojiText } from '../../utils/EmojiRenderer';

const StyledBadge = styled(Badge)(({ theme }) => ({
    '& .MuiBadge-badge': {
        backgroundColor: '#44b700',
        color: '#44b700',
        boxShadow: `0 0 0 2px #fff`,
        width: 18,
        height: 18,
        borderRadius: '50%',
        '&::after': {
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            animation: 'ripple 1.2s infinite ease-in-out',
            border: '1px solid currentColor',
            content: '""',
        },
    },
    '@keyframes ripple': {
        '0%': {
            transform: 'scale(.8)',
            opacity: 1,
        },
        '100%': {
            transform: 'scale(2.4)',
            opacity: 0,
        },
    },
}));

const ProfileSection = ({
    customer,
    isCurrentUserAdmin,
    avatarSeed,
    localGroupData,
    displayName,
    isEditingName,
    setIsEditingName,
    editedName,
    setEditedName,
    handleSaveName,
    startEditingName,
    handleProfileUploadComplete,
    handleProfileRemoveComplete,
    groupPermissions
}) => {
    const [viewPhotoDialog, setViewPhotoDialog] = useState({ open: false, imageUrl: '' });
    const canEditGroup = isCurrentUserAdmin || groupPermissions?.editGroupSettings;

    const handleAvatarDoubleClick = () => {
        const imageUrl = customer?.ProfileImageUrl;
        if (imageUrl && !isImageDead(imageUrl)) {
            setViewPhotoDialog({ open: true, imageUrl });
        }
    };
    return (
        <div className={`profile-section ${customer?.IsGroup === 1 ? 'group-profile' : ''}`}>
            {customer?.IsGroup === 1 && canEditGroup ? (
                <StyledBadge
                    overlap="circular"
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                    variant="dot"
                    invisible={customer?.IsGroup === 1}
                >
                    <div onDoubleClick={handleAvatarDoubleClick} style={{ cursor: 'zoom-in' }}>
                        <ProfileAvatarUpload
                            size={130}
                            currentImageUrl={customer?.ProfileImageUrl}
                            avatarSeed={avatarSeed}
                            showOverlay={true}
                            overlayText={customer?.ProfileImageUrl ? "Change group\nicon" : "Add group\nicon"}
                            onUploadComplete={handleProfileUploadComplete}
                            onRemoveComplete={handleProfileRemoveComplete}
                            className="group-avatar-container"
                            folderName="tecochat/profileImage"
                        />
                    </div>
                </StyledBadge>
            ) : (
                <div className={`avatar-container ${customer?.IsGroup === 1 ? 'group-avatar-container' : ''}`}>
                    <StyledBadge
                        overlap="circular"
                        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                        variant="dot"
                        invisible={customer?.IsGroup === 1}
                    >
                        <Avatar
                            {...(getWhatsAppAvatarConfig(avatarSeed, 130))}
                            className="profile-avatar"
                            src={(customer?.ProfileImageUrl && !isImageDead(customer?.ProfileImageUrl)) ? customer?.ProfileImageUrl : undefined}
                            imgProps={{ draggable: false }}
                            onDoubleClick={handleAvatarDoubleClick}
                            sx={{ cursor: customer?.ProfileImageUrl && !isImageDead(customer?.ProfileImageUrl) ? 'zoom-in' : 'default' }}
                        />
                    </StyledBadge>
                </div>
            )}

            <div className="name-row">
                {isEditingName ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', px: 2 }}>
                        <TextField
                            fullWidth
                            variant="standard"
                            value={editedName || ""}
                            onChange={(e) => setEditedName(e.target.value.slice(0, 50))}
                            autoFocus
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveName();
                                if (e.key === 'Escape') {
                                    setEditedName(customer?.IsGroup === 1 ? (localGroupData?.name || "") : (displayName || ""));
                                    setIsEditingName(false);
                                }
                            }}
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <Typography variant="caption" sx={{ color: '#667781', mr: 1 }}>
                                            {(editedName || "").length}/50
                                        </Typography>
                                        <IconButton size="small" onClick={() => {
                                            setEditedName(customer?.IsGroup === 1 ? (localGroupData?.name || "") : (displayName || ""));
                                            setIsEditingName(false);
                                        }} sx={{ color: '#667781', mr: 0.5 }}>
                                            <X size={18} />
                                        </IconButton>
                                        <IconButton size="small" onClick={handleSaveName} sx={{ color: 'primary.main' }}>
                                            <Check size={20} />
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }}
                        />
                    </Box>
                ) : (
                    <>
                        <Typography className="customer-name">
                            {renderEmojiText(customer?.IsGroup === 1 ? localGroupData.name : displayName)}
                        </Typography>
                        {customer?.IsGroup === 1 && canEditGroup && (
                            <IconButton size="small" className="edit-icon-btn" onClick={startEditingName}>
                                <Pencil size={20} />
                            </IconButton>
                        )}
                    </>
                )}
            </div>

            {customer?.IsGroup == 1 ? (
                <Typography className="group-subtext">
                    Group · <span className="accent-text">{localGroupData.members.length} members</span>
                </Typography>
            ) : (
                <Typography className="customer-phone">
                    {(customer?.Designation || customer?.UserId) || ''}
                </Typography>
            )}

            <ViewPhotoDialog
                open={viewPhotoDialog.open}
                onClose={() => setViewPhotoDialog({ open: false, imageUrl: '' })}
                imageUrl={viewPhotoDialog.imageUrl}
                title="View Profile Photo"
            />
        </div>
    );
};

export default ProfileSection;
