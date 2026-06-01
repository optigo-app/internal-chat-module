import React, { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { disconnectSocket } from '../../socket';
import {
    Menu,
    MenuItem,
    Divider,
    IconButton,
    ListItemText,
    ListItemIcon,
    Typography,
    Box,
    Avatar
} from '@mui/material';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import SyncIcon from '@mui/icons-material/Sync';
import LogoutIcon from '@mui/icons-material/Logout';
import './ProfileAvatar.scss';
import { LoginContext } from '../../context/LoginData';
import { LogoutApi } from '../../API/Logout/Logout';
import { getWhatsAppAvatarConfig } from '../../utils/globalFunc';
import ConfirmationDialog from '../ReusableComponent/ConfirmationDialog';
import { useConfirmModal } from '../../hooks/useConfirmModal';
import { getConfirmProps } from '../../hooks/confirmConfig';
import { eraseCookie } from '../../utils/cookieUtils';

const ProfileAvatar = () => {
    const [anchorEl, setAnchorEl] = useState(null);
    const open = Boolean(anchorEl);
    const navigate = useNavigate();
    const { auth, setAuth, token, setToken, startSync } = useContext(LoginContext);
    const getId = JSON.parse(sessionStorage.getItem("hasSocketId"));

    const { confirmationModal, open: openConfirm, close: closeConfirm } = useConfirmModal({ auth });

    const username = auth?.username;
    const avatarConfig = getWhatsAppAvatarConfig(username || 'User', 36);

    const handleClick = (event) => {
        setAnchorEl(event.currentTarget);
    };
    const handleClose = () => {
        setAnchorEl(null);
    };

    const handleDataSync = async () => {
        if (!startSync) return;
    };

    const handleLogoutClick = () => {
        handleClose();
        openConfirm('logout');
    };

    const handleLogoutConfirm = async () => {
        try {
            await LogoutApi(auth?.id || getId?.id);
            disconnectSocket();
            sessionStorage.clear();
            
            // Clear cookies that cause auto-login
            eraseCookie("userData");
            eraseCookie("token");

            setAuth({ userId: '', username: '', ukey: '', token: '' });
            setToken({ sv: '', yc: '' });
            navigate('/login');
            closeConfirm();
        } catch (error) {
            console.error('Error during logout:', error);
            
            eraseCookie("userData");
            eraseCookie("token");

            navigate('/login');
            closeConfirm();
            disconnectSocket();
            sessionStorage.clear();
        }
    };

    return (
        <div className="profile-menu">
            {username && (
                <Typography
                    variant="body1"
                    className="username-text"
                    title={`Welcome ${username}`}
                >
                    Welcome {username}
                </Typography>
            )}
            <IconButton onClick={handleClick} className="profile-avatar" size="large">
                <Avatar
                    alt={username || "User"}
                    src={auth?.ProfileImageUrl || undefined}
                    sx={avatarConfig.sx}
                    imgProps={{ draggable: false }}
                >
                    {avatarConfig.children}
                </Avatar>
            </IconButton>


            <Menu
                anchorEl={anchorEl}
                open={open}
                onClose={handleClose}
                PaperProps={{
                    sx: {
                        borderRadius: '16px',
                        minWidth: '220px',
                        boxShadow: '0 12px 40px rgba(0, 0, 0, 0.15)',
                        backdropFilter: 'blur(12px)',
                        bgcolor: 'rgba(255, 255, 255, 0.95)',
                        border: '1px solid rgba(0, 0, 0, 0.08)',
                        mt: 1.5,
                        '& .MuiMenuItem-root': {
                            px: 2,
                            py: 1.5,
                            mx: 1,
                            my: 0.5,
                            borderRadius: '10px',
                            transition: 'all 0.2s ease',
                            gap: '12px',
                            '&:hover': {
                                bgcolor: 'rgba(115, 103, 240, 0.08)',
                                color: '#7367f0',
                                '& .MuiListItemIcon-root': {
                                    color: '#7367f0',
                                    transform: 'scale(1.1)'
                                }
                            }
                        },
                        '& .MuiListItemIcon-root': {
                            color: '#64748b',
                            transition: 'all 0.2s ease',
                            minWidth: 'auto !important'
                        },
                        '& .MuiTypography-root': {
                            fontWeight: 500,
                            fontSize: '0.95rem'
                        }
                    }
                }}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
                <Box sx={{ px: 3, pt: 2, pb: 1 }}>
                    <Typography sx={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        My Account
                    </Typography>
                </Box>

                <MenuItem onClick={() => {
                    handleClose();
                    navigate('/profile');
                }}>
                    <ListItemIcon>
                        <AccountCircleIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primary="Profile" />
                </MenuItem>

                <MenuItem
                    onClick={handleDataSync}
                    disabled={!startSync}
                >
                    <ListItemIcon>
                        <SyncIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primary="Data Sync" />
                </MenuItem>

                <Divider sx={{ my: 1, borderColor: 'rgba(0,0,0,0.06)' }} />

                <MenuItem onClick={handleLogoutClick} sx={{
                    '&:hover': {
                        bgcolor: 'rgba(239, 68, 68, 0.08) !important',
                        color: '#ef4444 !important',
                        '& .MuiListItemIcon-root': {
                            color: '#ef4444 !important',
                        }
                    }
                }}>
                    <ListItemIcon>
                        <LogoutIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primary="Log out" />
                </MenuItem>
            </Menu>

            <ConfirmationDialog
                isOpen={confirmationModal.isOpen}
                onClose={closeConfirm}
                onConfirm={handleLogoutConfirm}
                {...getConfirmProps('logout')}
            />
        </div>
    );
};

export default ProfileAvatar;
