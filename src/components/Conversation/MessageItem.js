import React, { useEffect, useRef, useCallback } from 'react';
import MessageContent from './MessageContent';
import ConversationAvatar from '../ReusableComponent/ConversationAvatar';
import SystemMessage from '../chat/messages/SystemMessage';

const MessageItem = ({
    msg,
    index,
    auth,
    selectedCustomer,
    blinkMessageId,
    hoveredMessageId,
    setHoveredMessageId,
    reactionMenuMessageId,
    reactionMenuAnchorEl,
    setReactionMenuAnchorEl,
    setReactionMenuMessageId,
    closeReactionMenu,
    handleMessageEmojiClick,
    handleMenuClick,
    handleContextMenu,
    scrollToMessage,
    containerRef,
    parseTemplateData,
    getMediaKey,
    getMediaSrcForMessage,
    loadedMedia,
    markLoaded,
    handleMediaClick,
    getMessageStatusIcon,
    handleRemoveReaction,
    messageById,
    handleForward,
    setDrawerViewState,
    setDrawerOpen,
    isExpanded,
    onToggleExpand,
}) => {
    const hoverHideTimeoutRef = useRef(null);
    const messageDomId = msg.Id ?? msg.fileName;
    const isOutgoing = msg.Direction === 1;
    const isMediaMessage = ['image', 'video', 'document', 'audio'].includes(msg?.MessageType);
    const isBlinking = blinkMessageId === messageDomId;
    const currentHoverId = msg?.messageId || msg?.id || index;
    const isHovered = hoveredMessageId === currentHoverId;
    const isReactionMenuOpenForCurrent = reactionMenuMessageId === currentHoverId && Boolean(reactionMenuAnchorEl);
    const shouldShowActions = isHovered || isReactionMenuOpenForCurrent;

    const handleMouseEnter = useCallback(() => {
        if (hoverHideTimeoutRef.current) {
            clearTimeout(hoverHideTimeoutRef.current);
            hoverHideTimeoutRef.current = null;
        }
        setHoveredMessageId(currentHoverId);
    }, [currentHoverId, setHoveredMessageId]);

    const handleMouseLeave = useCallback(() => {
        if (hoverHideTimeoutRef.current) {
            clearTimeout(hoverHideTimeoutRef.current);
        }

        hoverHideTimeoutRef.current = setTimeout(() => {
            // We use the functional update to check latest values without creating a dependency loop
            setHoveredMessageId(prevHoveredId => {
                if (prevHoveredId === currentHoverId) {
                    return null;
                }
                return prevHoveredId;
            });

            // We can't easily check reactionMenuMessageId here without deps, 
            // but we can just call close if it's for this message
            closeReactionMenu();
        }, 220);
    }, [currentHoverId, setHoveredMessageId, closeReactionMenu]);

    useEffect(() => {
        return () => {
            if (hoverHideTimeoutRef.current) {
                clearTimeout(hoverHideTimeoutRef.current);
            }
        };
    }, []);

    if (msg.SystemMsg === 1) {
        return <SystemMessage message={msg.Message} />;
    }

    return (
        <div
            className={`message-item ${msg.Direction === 1 ? 'user-message' : 'customer-message'} ${isBlinking ? 'blink-message' : ''}`}
            style={{ cursor: 'context-menu' }}
            data-message-id={messageDomId}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >

            {(msg.Direction === 0 && selectedCustomer?.IsGroup === 1) && (
                <div style={{ marginRight: 8, alignSelf: 'flex-end', marginBottom: '4px' }}>
                    <ConversationAvatar
                        member={{
                            ProfileImageUrl: msg.SenderProfilePicture,
                            ...msg
                        }}
                        size={38}
                    />
                </div>
            )}

            <MessageContent
                auth={auth}
                msg={msg}
                selectedCustomer={selectedCustomer}
                isOutgoing={isOutgoing}
                shouldShowActions={shouldShowActions}
                isReactionMenuOpenForCurrent={isReactionMenuOpenForCurrent}
                reactionMenuAnchorEl={reactionMenuAnchorEl}
                setHoveredMessageId={setHoveredMessageId}
                currentHoverId={currentHoverId}
                setReactionMenuAnchorEl={setReactionMenuAnchorEl}
                setReactionMenuMessageId={setReactionMenuMessageId}
                closeReactionMenu={closeReactionMenu}
                handleMessageEmojiClick={handleMessageEmojiClick}
                handleMenuClick={handleMenuClick}
                handleContextMenu={handleContextMenu}
                scrollToMessage={scrollToMessage}
                containerRef={containerRef}
                parseTemplateData={parseTemplateData}
                getMediaKey={getMediaKey}
                getMediaSrcForMessage={getMediaSrcForMessage}
                loadedMedia={loadedMedia}
                markLoaded={markLoaded}
                handleMediaClick={handleMediaClick}
                getMessageStatusIcon={getMessageStatusIcon}
                handleRemoveReaction={handleRemoveReaction}
                getMessageById={(id) => messageById.get(id)}
                handleForward={isMediaMessage ? handleForward : undefined}
                setDrawerViewState={setDrawerViewState}
                setDrawerOpen={setDrawerOpen}
                isExpanded={isExpanded}
                onToggleExpand={onToggleExpand}
            />
        </div>
    );
};

export default React.memo(MessageItem, (prevProps, nextProps) => {
    // Custom comparison to optimize re-renders
    return (
        prevProps.msg === nextProps.msg &&
        prevProps.index === nextProps.index &&
        prevProps.blinkMessageId === nextProps.blinkMessageId &&
        prevProps.hoveredMessageId === nextProps.hoveredMessageId &&
        prevProps.reactionMenuMessageId === nextProps.reactionMenuMessageId &&
        prevProps.reactionMenuAnchorEl === nextProps.reactionMenuAnchorEl &&
        prevProps.loadedMedia === nextProps.loadedMedia &&
        prevProps.selectedCustomer === nextProps.selectedCustomer &&
        prevProps.isExpanded === nextProps.isExpanded
    );
});
