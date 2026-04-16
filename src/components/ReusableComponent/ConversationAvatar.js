import React, { useState, useEffect } from 'react';
import { Avatar, Skeleton } from '@mui/material';
import { getWhatsAppAvatarConfig, getCustomerAvatarSeed, hasCustomerName, isImageDead, markImageAsDead } from '../../utils/globalFunc';
import PersonIcon from '@mui/icons-material/Person';

const ConversationAvatar = ({ member, size = 45 }) => {
    const [imageState, setImageState] = useState('loading'); // 'loading', 'loaded', 'error'
    
    // Strict image URL validation
    const rawImageUrl = member?.ProfileImageUrl || member?.AvatarUrl || member?.Avatar;
    const isValidUrl = (url) => {
        if (!url || typeof url !== 'string') return false;
        const trimmed = url.trim().toLowerCase();
        return trimmed !== '' && trimmed !== 'null' && trimmed !== 'undefined';
    };
    const imageUrl = isValidUrl(rawImageUrl) && !isImageDead(rawImageUrl) ? rawImageUrl : null;

    useEffect(() => {
        if (imageUrl) {
            setImageState('loading');
            
            // Proactive check for cached images
            const img = new window.Image();
            img.src = imageUrl;
            if (img.complete) {
                setImageState('loaded');
            }
        } else {
            setImageState('error');
        }
    }, [imageUrl]);

    const handleLoad = () => setImageState('loaded');
    const handleError = () => {
        if (imageUrl) markImageAsDead(imageUrl);
        setImageState('error');
    };

    // Replicate original logic: if no name, show generic icon inside avatar
    if (!hasCustomerName(member)) {
        const cfg = getWhatsAppAvatarConfig(getCustomerAvatarSeed(member), size);
        return (
            <Avatar {...cfg} sx={{ ...cfg.sx, width: size, height: size }} imgProps={{ draggable: false }}>
                <PersonIcon fontSize="small" />
            </Avatar>
        );
    }

    const avatarConfig = member?.avatarConfig || getWhatsAppAvatarConfig(getCustomerAvatarSeed(member), size);

    // If we have an image URL and it hasn't failed yet
    if (imageUrl && imageState !== 'error') {
        return (
            <div className="avatar-container" style={{ position: 'relative', width: size, height: size }}>
                {imageState === 'loading' && (
                    <Skeleton
                        variant="circular"
                        width={size}
                        height={size}
                        animation="wave"
                        sx={{ position: 'absolute', top: 0, left: 0 }}
                    />
                )}
                <Avatar
                    src={imageUrl}
                    onLoad={handleLoad}
                    onError={handleError}
                    imgProps={{ draggable: false }}
                    sx={{
                        width: size,
                        height: size,
                        opacity: imageState === 'loaded' ? 1 : 0,
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        transition: 'opacity 0.2s ease-in-out'
                    }}
                />
                {/* Hidden img tag for loading state management if Avatar doesn't trigger onLoad as expected in all cases */}
                <img
                    src={imageUrl}
                    onLoad={handleLoad}
                    onError={handleError}
                    style={{ display: 'none' }}
                    alt=""
                    draggable="false"
                />
            </div>
        );
    }

    // Fallback to generated avatar with initials
    return (
        <Avatar
            {...avatarConfig}
            imgProps={{ draggable: false }}
            sx={{
                ...avatarConfig.sx,
                width: size,
                height: size,
                fontSize: size * 0.4
            }}
        />
    );
};

export default ConversationAvatar;
