import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Avatar, Skeleton } from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import MessageContent from './MessageContent';
import { getWhatsAppAvatarConfig } from '../../utils/globalFunc';

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
    handleForward
}) => {
    const hoverHideTimeoutRef = useRef(null);
    const [imageLoadState, setImageLoadState] = useState('loading'); // 'loading', 'loaded', 'error'

    const messageDomId = msg.Id ?? msg.fileName;
    const isOutgoing = msg.Direction === 1;
    const isBlinking = blinkMessageId === messageDomId;
    const currentHoverId = msg?.messageId || msg?.id || index;
    const isHovered = hoveredMessageId === currentHoverId;
    const isReactionMenuOpenForCurrent = reactionMenuMessageId === currentHoverId && Boolean(reactionMenuAnchorEl);
    const shouldShowActions = isHovered || isReactionMenuOpenForCurrent;

    // Reset image load state when message changes
    useEffect(() => {
        if (msg.SenderProfilePicture) {
            setImageLoadState('loading');
        } else {
            setImageLoadState('error'); // No image URL, skip to fallback
        }
    }, [msg.SenderProfilePicture, msg.Id]);

    const handleImageLoad = useCallback(() => {
        setImageLoadState('loaded');
    }, []);

    const handleImageError = useCallback(() => {
        setImageLoadState('error');
    }, []);

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
        return (
            <div
                className="system-message-container"
                data-message-id={messageDomId}
                style={{
                    display: 'flex',
                    justifyContent: 'center',
                    margin: '16px auto',
                    width: '100%',
                    padding: '0 20px'
                }}
            >
                <div className="system-message-text" style={{
                    backgroundColor: '#f1f1f1',
                    padding: '4px 12px',
                    borderRadius: '16px',
                    fontSize: '10px',
                    color: '#667781',
                    boxShadow: '0 1px 0.5px rgba(0,0,0,0.06)',
                    maxWidth: '85%',
                    textAlign: 'center',
                    lineHeight: '1.4',
                    textTransform: 'capitalize',
                    letterSpacing: '0.1px',
                }}>
                    {msg.Message}
                </div>
            </div>
        );
    }

    return (
        <div
            className={`message-item ${msg.Direction === 1 ? 'user-message' : 'customer-message'} ${isBlinking ? 'blink-message' : ''}`}
            style={{ cursor: 'context-menu' }}
            data-message-id={messageDomId}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >

            {msg.Direction === 0 && (
                (() => {
                    const senderName = `${msg.FirstName || ''} ${msg.LastName || ''}`.trim() || 'User';
                    const avatarSeed = senderName;
                    const cfg = getWhatsAppAvatarConfig(avatarSeed, 38);
                    if (msg.SenderProfilePicture && imageLoadState === 'loading') {
                        return (
                            <div style={{ marginRight: 8 }}>
                                <Skeleton
                                    variant="circular"
                                    width={38}
                                    height={38}
                                    sx={{ bgcolor: 'grey.200' }}
                                />
                                <img
                                    src={msg.SenderProfilePicture}
                                    onLoad={handleImageLoad}
                                    onError={handleImageError}
                                    style={{ display: 'none' }}
                                    alt=""
                                />
                            </div>
                        );
                    }
                    if (msg.SenderProfilePicture && imageLoadState === 'loaded') {
                        return (
                            <Avatar
                                src={msg.SenderProfilePicture}
                                alt={senderName}
                            />
                        );
                    }
                    return (
                        <Avatar
                            {...cfg}
                            sx={{ ...cfg.sx, mr: 1 }}
                        >
                        </Avatar>
                    );
                })()
            )}

            <MessageContent
                auth={auth}
                msg={msg}
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
                handleForward={handleForward}
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
        prevProps.selectedCustomer === nextProps.selectedCustomer
    );
});
