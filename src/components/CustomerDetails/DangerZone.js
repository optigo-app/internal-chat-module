import { CircleMinus, LogOut, Trash2 } from 'lucide-react';

const DangerZone = ({
    onClearChat,
    isGroup,
    onExitGroup,
    isRemovedFromCurrentGroup,
    onDeleteChat
}) => {
    return (
        <div className="danger-zone">
            {isGroup ? (
                // Group Chat: Show "Clear Chat" and "Exit Group"
                <>
                    <div className="danger-item" onClick={onClearChat} style={{ cursor: 'pointer' }}>
                        <CircleMinus size={20} />
                        <span>Clear chat</span>
                    </div>
                    <div className="danger-item" onClick={onExitGroup} style={{ cursor: 'pointer' }}>
                        <LogOut size={20} />
                        <span>{isRemovedFromCurrentGroup ? 'Delete group' : 'Exit group'}</span>
                    </div>
                </>
            ) : (
                // Individual Chat: Show "Clear Chat" and "Delete Chat"
                <>
                    <div className="danger-item" onClick={onClearChat} style={{ cursor: 'pointer' }}>
                        <CircleMinus size={20} />
                        <span>Clear chat</span>
                    </div>
                    <div className="danger-item" onClick={onDeleteChat} style={{ cursor: 'pointer' }}>
                        <Trash2 size={20} />
                        <span>Delete chat</span>
                    </div>
                </>
            )}
        </div>
    );
};

export default DangerZone;
