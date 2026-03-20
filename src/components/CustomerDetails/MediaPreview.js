import { Typography } from '@mui/material';
import { ChevronRight, Image } from 'lucide-react';

const MediaPreview = ({
    mediaItems,
    onClick
}) => {
    const totalCount = (mediaItems.images?.length || 0) +
        (mediaItems.videos?.length || 0) +
        (mediaItems.documents?.length || 0);

    return (
        <div className="settings-list">
            <div className="setting-item clickable-member" onClick={onClick} style={{ cursor: 'pointer' }}>
                <div className="setting-left">
                    <Image size={20} color="#667781" />
                    <span>Media, docs and links</span>
                </div>
                <div className="header-right" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {totalCount > 0 && (
                        <Typography className="count" sx={{ fontSize: '14px', color: '#667781' }}>
                            {totalCount}
                        </Typography>
                    )}
                    <ChevronRight size={20} className="chevron" style={{ color: '#667781' }} />
                </div>
            </div>

            {totalCount > 0 && mediaItems.images?.length > 0 && (
                <div className="media-preview-grid" style={{ padding: '0 16px 16px 16px', display: 'flex', gap: '8px' }}>
                    {mediaItems.images.slice(0, 3).map((img, i) => (
                        <div key={i} className="preview-item" style={{ width: '80px', height: '80px', borderRadius: '8px', overflow: 'hidden' }}>
                            <img src={img.src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default MediaPreview;
