import { Typography, Avatar, IconButton, Box, TextField, InputAdornment } from '@mui/material';
import { User, Pencil, X, Check } from 'lucide-react';
import ProfileAvatarUpload from '../ReusableComponent/ProfileAvatarUpload';
import { getWhatsAppAvatarConfig, hasCustomerName } from '../../utils/globalFunc';

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
    handleProfileRemoveComplete
}) => {
    return (
        <div className={`profile-section ${customer?.IsGroup === 1 ? 'group-profile' : ''}`}>
            {customer?.IsGroup === 1 && isCurrentUserAdmin ? (
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
            ) : (
                <div className={`avatar-container ${customer?.IsGroup === 1 ? 'group-avatar-container' : ''}`}>
                    {!hasCustomerName(customer) ? (
                        <Avatar
                            {...getWhatsAppAvatarConfig(avatarSeed, 130)}
                            className="profile-avatar"
                            src={customer?.ProfileImageUrl}
                        >
                            <User size={80} />
                        </Avatar>
                    ) : (
                        <Avatar
                            {...(getWhatsAppAvatarConfig(avatarSeed, 130))}
                            className="profile-avatar"
                            src={customer?.ProfileImageUrl}
                        />
                    )}
                </div>
            )}

            <div className="name-row">
                {isEditingName ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', px: 2 }}>
                        <TextField
                            fullWidth
                            variant="standard"
                            value={editedName}
                            onChange={(e) => setEditedName(e.target.value.slice(0, 50))}
                            autoFocus
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveName();
                                if (e.key === 'Escape') {
                                    setEditedName(customer?.IsGroup === 1 ? localGroupData.name : displayName);
                                    setIsEditingName(false);
                                }
                            }}
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <Typography variant="caption" sx={{ color: '#667781', mr: 1 }}>
                                            {editedName.length}/50
                                        </Typography>
                                        <IconButton size="small" onClick={() => {
                                            setEditedName(customer?.IsGroup === 1 ? localGroupData.name : displayName);
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
                            {customer?.IsGroup === 1 ? localGroupData.name : displayName}
                        </Typography>
                        {customer?.IsGroup === 1 && isCurrentUserAdmin && (
                            <IconButton size="small" className="edit-icon-btn" onClick={startEditingName}>
                                <Pencil size={20} />
                            </IconButton>
                        )}
                    </>
                )}
            </div>

            {customer?.IsGroup === 1 ? (
                <Typography className="group-subtext">
                    Group · <span className="accent-text">{localGroupData.members.length} members</span>
                </Typography>
            ) : (
                <Typography className="customer-phone">
                    {customer?.DisplayEmail || ''}
                </Typography>
            )}
        </div>
    );
};

export default ProfileSection;
