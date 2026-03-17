import { CircleMinus, LogOut } from 'lucide-react';

const DangerZone = ({
    onClearChat,
    isGroup,
    onExitGroup,
    isRemovedFromCurrentGroup
}) => {
    return (
        <div className="danger-zone">
            <div className="danger-item" onClick={onClearChat} style={{ cursor: 'pointer' }}>
                <CircleMinus size={20} />
                <span>Clear chat</span>
            </div>
            
            {isGroup && (
                <div className="danger-item" onClick={onExitGroup} style={{ cursor: 'pointer' }}>
                    <LogOut size={20} />
                    <span>{isRemovedFromCurrentGroup ? 'Delete group' : 'Exit group'}</span>
                </div>
            )}
        </div>
    );
};

export default DangerZone;
