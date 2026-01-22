import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import MediaPreview from '../MediaPreview/MediaPreview';
import MessageItem from './MessageItem';
import ScrollToBottomButton from './ScrollToBottomButton';
import DragDropOverlay from '../DragDropOverlay/DragDropOverlay';

const MessageArea = ({
    auth,
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
    handleRemoveReaction,
    isSwitchingConversation,
    replyToMessage,
    handleForward,
    processFiles,
    captureMessageScrollState
}) => {
    const [hoveredMessageId, setHoveredMessageId] = useState(null);
    const [reactionMenuAnchorEl, setReactionMenuAnchorEl] = useState(null);
    const [reactionMenuMessageId, setReactionMenuMessageId] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const dragCounter = useRef(0);
    const messagesEndRef = useRef(null);

    const isMediaPreviewOpen = (mediaFiles?.length || 0) > 0;
    const scrollToBottomBottomOffset = replyToMessage ? 170 : 110;

    const closeReactionMenu = useCallback(() => {
        setReactionMenuAnchorEl(null);
        setReactionMenuMessageId(null);
    }, []);

    const messageById = useMemo(() => {
        const map = new Map();
        const groups = groupMessagesByDate || {};
        Object.values(groups).forEach((arr) => {
            if (!Array.isArray(arr)) return;
            arr.forEach((m) => {
                const key = m?.Id ?? m?.MessageId;
                if (key != null) map.set(key, m);
            });
        });
        return map;
    }, [groupMessagesByDate]);

    useEffect(() => {
        if (mediaFiles?.length > 0) {
            setShowMedia(false)
        }
    }, [mediaFiles, setShowMedia]);

    // Delegate status icon rendering to hook-provided function
    const getMessageStatusIcon = useCallback((msg) => {
        return getMessageStatusIconProp ? getMessageStatusIconProp(msg) : null;
    }, [getMessageStatusIconProp]);

    const handleDragEnter = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter.current++;
        if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
            setIsDragging(true);
        }
    }, []);

    const handleDragLeave = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter.current--;
        if (dragCounter.current === 0) {
            setIsDragging(false);
        }
    }, []);

    const handleDragOver = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        dragCounter.current = 0;

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const files = Array.from(e.dataTransfer.files);
            if (captureMessageScrollState) captureMessageScrollState();
            if (processFiles) processFiles(files);
            e.dataTransfer.clearData();
        }
    }, [processFiles, captureMessageScrollState]);

    const handlePaste = useCallback((e) => {
        if (e.clipboardData && e.clipboardData.files && e.clipboardData.files.length > 0) {
            const files = Array.from(e.clipboardData.files);
            if (captureMessageScrollState) captureMessageScrollState();
            if (processFiles) processFiles(files);
        }
    }, [processFiles, captureMessageScrollState]);

    return (
        <div
            className="messages-area"
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onPaste={handlePaste}
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
            <DragDropOverlay isDragging={isDragging} />
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
                            position: 'relative',
                            backgroundImage: 'linear-gradient(rgba(249, 250, 251, 0.78), rgba(249, 250, 251, 0.78)), url(/bg-3.jpg)',
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

                        {Object.entries(groupMessagesByDate || {}).map(([date, dateMessages]) => (
                            <React.Fragment key={`date-group-${date}`}>
                                {dateMessages && dateMessages.length > 0 && (
                                    <div className="date-group">
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
                                        {dateMessages.map((msg, index) => (
                                            <MessageItem
                                                key={msg.Id ?? msg.MessageId ?? index}
                                                msg={msg}
                                                index={index}
                                                auth={auth}
                                                selectedCustomer={selectedCustomer}
                                                blinkMessageId={blinkMessageId}
                                                hoveredMessageId={hoveredMessageId}
                                                setHoveredMessageId={setHoveredMessageId}
                                                reactionMenuMessageId={reactionMenuMessageId}
                                                reactionMenuAnchorEl={reactionMenuAnchorEl}
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
                                                messageById={messageById}
                                                handleForward={handleForward}
                                            />
                                        ))}
                                    </div>
                                )}
                            </React.Fragment>
                        ))}
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
    );
};

export default React.memo(MessageArea);