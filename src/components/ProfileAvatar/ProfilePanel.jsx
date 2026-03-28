import React, { useContext } from 'react';
import { Box, Typography, IconButton, Avatar } from '@mui/material';
import { ArrowLeft } from 'lucide-react';
import { LoginContext } from '../../context/LoginData';
import { getWhatsAppAvatarConfig } from '../../utils/globalFunc';
import './ProfilePanel.scss';

const ProfilePanel = ({ onBack }) => {
    const { auth } = useContext(LoginContext);
    const avatarConfig = getWhatsAppAvatarConfig(auth?.username, 160);

    return (
        <Box className="profile-panel-overlay">
            <Box className="profile-panel-header">
                <IconButton onClick={onBack} className="back-btn" size="small">
                    <ArrowLeft size={24} />
                </IconButton>
                <Typography variant="h6" className='header_title'>Profile</Typography>
            </Box>

            <Box className="profile-panel-body">
                <Box className="avatar-section">
                    <Box className="avatar-wrapper">
                        <Avatar
                            sx={{
                                ...avatarConfig.sx,
                                width: 160,
                                height: 160,
                                fontSize: '4rem',
                                border: '4px solid #fff',
                                boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
                            }}
                            className="large-avatar"
                        >
                            {avatarConfig.children}
                        </Avatar>
                    </Box>
                </Box>

                <Box className="info-section">
                    <Typography className="info-label">Name</Typography>
                    <Typography className="info-value">{auth?.username}</Typography>
                    <Typography className="info-desc">
                        {auth?.designation}
                    </Typography>
                </Box>
            </Box>
        </Box>
    );
};

export default ProfilePanel;
