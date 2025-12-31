import React, { useState, useRef, useContext, useCallback, useEffect } from 'react';
import { Box, CircularProgress, Typography, Avatar } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { CheckCheck } from 'lucide-react';
import MediaPreview from '../MediaPreview/MediaPreview';
import { LoginContext } from '../../context/LoginData';
import { getCustomerAvatarSeed, getWhatsAppAvatarConfig, hasCustomerName } from '../../utils/globalFunc';
import MessageContent from './MessageContent';
import PersonIcon from '@mui/icons-material/Person';
import ScrollToBottomButton from './ScrollToBottomButton';

const MessageArea = ({
    showMedia,
    setShowMedia,
    loading,
    mediaFiles,
    setMediaFiles,
    handleClosePreview,
    containerRef,
    showScrollToBottom,
    scrollToBottomRightOffset,
    setContextMenu,
    selectedCustomer,
    scrollToBottom,
    groupMessagesByDate,
    formatDateHeader,
    getMessageStatusIcon: getMessageStatusIconProp,
    parseTemplateData,
    getMediaSrcForMessage,
    handleMediaClick,
    handleMessageEmojiClick,
    handleMenuClick,
    handleContextMenu,
    scrollToMessage,
    blinkMessageId,
    loadedMedia,
    getMediaKey,
    markLoaded,
    replyToMessage,
    isSwitchingConversation
}) => {
    const [hoveredMessageId, setHoveredMessageId] = useState(null);
    const [reactionMenuAnchorEl, setReactionMenuAnchorEl] = useState(null);
    const [reactionMenuMessageId, setReactionMenuMessageId] = useState(null);
    const messagesEndRef = useRef(null);
    const hoverHideTimeoutRef = useRef(null);
    const hoveredMessageIdRef = useRef(null);
    const reactionMenuMessageIdRef = useRef(null);
    const reactionMenuAnchorElRef = useRef(null);
    const theme = useTheme();

    const isMediaPreviewOpen = (mediaFiles?.length || 0) > 0;
    const scrollToBottomBottomOffset = replyToMessage ? 170 : 110;

    useEffect(() => {
        hoveredMessageIdRef.current = hoveredMessageId;
    }, [hoveredMessageId]);

    useEffect(() => {
        reactionMenuMessageIdRef.current = reactionMenuMessageId;
    }, [reactionMenuMessageId]);

    useEffect(() => {
        reactionMenuAnchorElRef.current = reactionMenuAnchorEl;
    }, [reactionMenuAnchorEl]);

    useEffect(() => {
        return () => {
            if (hoverHideTimeoutRef.current) {
                clearTimeout(hoverHideTimeoutRef.current);
            }
        };
    }, []);

    const closeReactionMenu = useCallback(() => {
        setReactionMenuAnchorEl(null);
        setReactionMenuMessageId(null);
    }, []);

    useEffect(() => {
        if (mediaFiles?.length > 0) {
            setShowMedia(false)
        }
    }, [mediaFiles])

    // Delegate status icon rendering to hook-provided function
    const getMessageStatusIcon = (msg) => {
        return getMessageStatusIconProp ? getMessageStatusIconProp(msg) : null;
    };

    return (
        <div
            className="messages-area"
            style={{
                position: "relative",
                ...(showMedia && {
                    "::before": {
                        content: '""',
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        pointerEvents: "none",
                        zIndex: 1,
                    },
                }),
            }}
            onContextMenu={(e) => {
                if (isMediaPreviewOpen) return;

                e.preventDefault();

                setContextMenu({
                    mouseX: e.clientX + 2,
                    mouseY: e.clientY + 2,
                });
            }}
        >
            {loading ? (
                <Box
                    sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        alignItems: 'center',
                        height: '100%',
                        minHeight: '300px',
                        gap: 2
                    }}
                >
                    <CircularProgress size={50} thickness={4} />
                    <Typography variant="body1" color="textSecondary">
                        Loading conversation...
                    </Typography>
                </Box>
            ) : (
                <>
                    <div
                        className="messages-list"
                        ref={containerRef}
                        style={{
                            maxHeight: '100vh',
                            overflowY: 'auto',
                            overflowX: 'hidden',
                            transition: 'filter 0.3s ease-in-out',
                            position: 'relative',
                            // backgroundImage: 'linear-gradient(rgba(247, 245, 243, 0.65), rgba(247, 245, 243, 0.65)), url(/bg-3.jpg)',
                            backgroundImage:
                                'linear-gradient(rgba(249, 250, 251, 0.78), rgba(249, 250, 251, 0.78)), url(/bg-3.jpg)',
                            backgroundSize: 'auto, contain',
                            backgroundPosition: 'center, center',
                            backgroundRepeat: 'repeat, repeat',
                            backgroundAttachment: 'scroll, fixed',
                            pointerEvents: isMediaPreviewOpen ? 'none' : 'auto',
                            filter: isMediaPreviewOpen ? 'blur(2px)' : 'none',
                            opacity: isSwitchingConversation ? 0 : 1,
                            transition: 'opacity 0.1s ease-in-out',
                        }}
                    >
                        {/* Scroll to Bottom Button - always smooth when user clicks */}
                        <ScrollToBottomButton
                            open={showScrollToBottom}
                            onClick={() => scrollToBottom('smooth')}
                            right={scrollToBottomRightOffset ?? 30}
                            bottom={scrollToBottomBottomOffset}
                        />

                        {Object.entries(groupMessagesByDate || {}).map(([date, dateMessages], dateIdx, allDates) => {
                            return (
                                <React.Fragment key={`date-group-${date}`}>
                                    {dateMessages && dateMessages.length > 0 && (
                                        <div key={dateIdx} className="date-group">
                                            {/* Date Header */}
                                            <div className="date-header" style={{
                                                display: 'flex',
                                                justifyContent: 'center',
                                                margin: '20px 0 10px 0'
                                            }}>
                                                <Typography
                                                    variant="caption"
                                                    className='typoDate'
                                                >
                                                    {formatDateHeader(date)}
                                                </Typography>
                                            </div>

                                            {/* Messages for this date */}
                                            {dateMessages
                                                ?.map((msg, index) => {
                                                    const isOutgoing = msg.Direction === 1;
                                                    const messageDomId = msg.Id ?? msg.fileName;
                                                    const isBlinking = blinkMessageId === messageDomId;
                                                    const currentHoverId = msg?.messageId || msg?.id || index;
                                                    const isHovered = hoveredMessageId === currentHoverId;
                                                    const isReactionMenuOpenForCurrent =
                                                        reactionMenuMessageId === currentHoverId && Boolean(reactionMenuAnchorEl);
                                                    const shouldShowActions = isHovered || isReactionMenuOpenForCurrent;

                                                    return (
                                                        <div
                                                            key={messageDomId}
                                                            className={`message-item ${msg.Direction === 1 ? 'user-message' : 'customer-message'} ${isBlinking ? 'blink-message' : ''}`}
                                                            style={{ cursor: 'context-menu' }}
                                                            data-message-id={messageDomId}
                                                            onMouseEnter={() => {
                                                                if (hoverHideTimeoutRef.current) {
                                                                    clearTimeout(hoverHideTimeoutRef.current);
                                                                    hoverHideTimeoutRef.current = null;
                                                                }
                                                                setHoveredMessageId(currentHoverId);
                                                            }}
                                                            onMouseLeave={() => {
                                                                if (hoverHideTimeoutRef.current) {
                                                                    clearTimeout(hoverHideTimeoutRef.current);
                                                                }

                                                                hoverHideTimeoutRef.current = setTimeout(() => {
                                                                    const menuOpenForThisMessage =
                                                                        reactionMenuMessageIdRef.current === currentHoverId &&
                                                                        Boolean(reactionMenuAnchorElRef.current);

                                                                    if (menuOpenForThisMessage) {
                                                                        setHoveredMessageId(currentHoverId);
                                                                        return;
                                                                    }

                                                                    if (hoveredMessageIdRef.current === currentHoverId) {
                                                                        setHoveredMessageId(null);
                                                                    }
                                                                    if (reactionMenuMessageIdRef.current !== currentHoverId) {
                                                                        closeReactionMenu();
                                                                    }
                                                                }, 220);
                                                            }}
                                                        >
                                                            {msg.Direction === 0 && (
                                                                !hasCustomerName(selectedCustomer) ? (
                                                                    (() => {
                                                                        const cfg = getWhatsAppAvatarConfig(getCustomerAvatarSeed(selectedCustomer), 32);
                                                                        return (
                                                                            <Avatar
                                                                                {...cfg}
                                                                                sx={{ ...cfg.sx, mr: 1 }}
                                                                            >
                                                                                <PersonIcon fontSize="small" />
                                                                            </Avatar>
                                                                        );
                                                                    })()
                                                                ) : (
                                                                    (() => {
                                                                        const cfg = selectedCustomer?.avatarConfig || getWhatsAppAvatarConfig(getCustomerAvatarSeed(selectedCustomer), 32);
                                                                        return (
                                                                            <Avatar
                                                                                {...cfg}
                                                                                sx={{ ...cfg.sx, mr: 1 }}
                                                                            />
                                                                        );
                                                                    })()
                                                                )
                                                            )}

                                                            <MessageContent
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
                                                            />
                                                        </div>
                                                    )
                                                })}

                                        </div>
                                    )}
                                </React.Fragment>
                            )
                        })}
                        <div ref={messagesEndRef} />
                    </div>

                    {isMediaPreviewOpen && (
                        <MediaPreview
                            mediaFiles={mediaFiles}
                            scrollToBottom={scrollToBottom}
                            setMediaFiles={setMediaFiles}
                            handleClosePreview={handleClosePreview}
                        />
                    )}
                </>
            )}
        </div>
    )
}

export default MessageArea;