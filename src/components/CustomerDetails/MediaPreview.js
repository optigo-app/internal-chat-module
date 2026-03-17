import { Typography } from '@mui/material';
import { ChevronRight } from 'lucide-react';

const MediaPreview = ({
    mediaItems,
    onClick
}) => {
    const totalCount = (mediaItems.images?.length || 0) +
        (mediaItems.videos?.length || 0) +
        (mediaItems.documents?.length || 0);

    if (totalCount === 0) return null;

    return (
        <div className="info-block clickable" onClick={onClick}>
            <div className="block-header">
                <Typography className="block-label">Media, docs and video</Typography>
                <div className="header-right">
                    <Typography className="count">{totalCount}</Typography>
                    <ChevronRight size={20} className="chevron" />
                </div>
            </div>

            {mediaItems.images?.length > 0 && (
                <div className="media-preview-grid">
                    {mediaItems.images.slice(0, 3).map((img, i) => (
                        <div key={i} className="preview-item">
                            <img src={img.src} alt="" />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default MediaPreview;
