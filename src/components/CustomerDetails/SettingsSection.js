import { ChevronRight, Star, Settings } from 'lucide-react';

const SettingsSection = ({
    isFavorite,
    onToggleFavorite,
    isGroup,
    isCurrentUserAdmin,
    onNavigateToPermissions
}) => {
    return (
        <div className="settings-list">
            <div className="setting-item clickable-member" onClick={onToggleFavorite} style={{ cursor: 'pointer' }}>
                <div className="setting-left">
                    <Star
                        size={20}
                        fill={isFavorite ? '#FFD700' : 'none'}
                        color={isFavorite ? '#FFD700' : 'currentColor'}
                    />
                    <span>{isFavorite ? 'Remove from favorites' : 'Add to favorites'}</span>
                </div>
            </div>

            {isGroup && isCurrentUserAdmin && (
                <div className="setting-item no-border" onClick={onNavigateToPermissions}>
                    <div className="setting-left">
                        <Settings size={20} />
                        <span>Group permissions</span>
                    </div>
                    <ChevronRight size={20} className="chevron" />
                </div>
            )}
        </div>
    );
};

export default SettingsSection;
