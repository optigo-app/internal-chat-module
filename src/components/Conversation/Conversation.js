import React, { useState, useRef, useEffect, useCallback, useContext, useLayoutEffect } from 'react';
import { Box, Typography, Avatar, useMediaQuery } from '@mui/material';
import './Conversation.scss';
import CustomerDetails from '../CustomerDetails/CustomerDetails';
import { formatDateHeader } from '../../utils/DateFnc';
import toast from 'react-hot-toast';
import { LoginContext } from '../../context/LoginData';
import MessageContextMenu from '../MessageBubble/MessageContextMenu';
import ForwardMessage from '../ForwardMessage/ForwardMessage';
import MediaViewer from '../MediaViewer/MediaViewer';
import { getCustomerAvatarSeed, getCustomerDisplayName, getWhatsAppAvatarConfig, hasCustomerName } from '../../utils/globalFunc';
import ChatBox from './ChatBox';
import MessageArea from './MessageArea';
import ViewContext from './ViewContext';
import { useConversation } from './useConversation';
import PersonIcon from '@mui/icons-material/Person';
import { addReactionApi } from '../../API/SendMessage/addReactionApi';
import { emitSendReaction } from '../../socket';

const Conversation = ({ selectedCustomer, onConversationRead, onViewConversationRead, onCustomerSelect }) => {
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [contextMenu, setContextMenu] = useState(null);
    const containerRef = useRef(null);
    const mediaPreviewScrollStateRef = useRef(null);
    const prevMediaFilesLenRef = useRef(0);
    const scrollTimeoutRef = useRef(null);
    const lastScrollTriggerRef = useRef(0);
    const isAutoScrollingRef = useRef(false);
    const scrollListenerAttachedRef = useRef(false);
    const fileInputRef = useRef(null);
    const lastMessageIdRef = useRef(null);
    const lastConversationIdRef = useRef(null);
    const [showPicker, setShowPicker] = useState(false);
    const emojiPickerRef = useRef(null);
    const [showScrollToBottom, setShowScrollToBottom] = useState(false);
    const { auth } = useContext(LoginContext);
    const [isSwitchingConversation, setIsSwitchingConversation] = useState(false);
    const isNarrowScreen = useMediaQuery('(max-width: 992px)');
    const isCompactDockedPanel = useMediaQuery('(max-width: 1200px)');
    const isDetailsPanelDocked = drawerOpen === true && !isNarrowScreen;
    const dockedPanelWidth = isCompactDockedPanel ? 380 : 420;
    const scrollToBottomRightOffset = isDetailsPanelDocked ? dockedPanelWidth + 30 : 30;

    // Use the conversation hook
    const {
        inputValue,
        setInputValue,
        messages,
        setMessages,
        mediaFiles,
        setMediaFiles,
        showMedia,
        setLoadedMedia,
        setShowMedia,
        loading,
        hasMore,
        uploadProgress,
        loadedMedia,
        replyToMessage,
        forwardMessage,
        blinkMessageId,
        setBlinkMessageId,
        mediaViewerOpen,
        setMediaViewerOpen,
        mediaViewerItems,
        mediaViewerIndex,
        groupMessagesByDate,
        currentPage,
        forwardAnchorEl,
        handleCloseForward,
        loadOlderMessages,
        parseTemplateData,
        getMediaSrcForMessage,
        getMediaKey,
        markLoaded,
        handleAttachClick,
        handleFileChange,
        handleMediaClick,
        handleClosePreview,
        handleSendMessage,
        handleReply,
        handleCancelReply,
        handleForward,
        handleSendForward,
        scrollToMessage,
        getMessageStatusIcon,
    } = useConversation(selectedCustomer, onConversationRead, onViewConversationRead);

    const docsParams = ".pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx,.csv";
    const videoParams = "video/*";
    const imageParams = "image/*";

    const markLoadedCallback = useCallback((key) => {
        markLoaded(key);
    }, [markLoaded]);

    const getMediaKeyCallback = useCallback((msg, index) => {
        return getMediaKey(msg, index);
    }, [getMediaKey]);

    const handleMenuClick = (event, message) => {
        event.stopPropagation();
        // message-specific menu is handled via messageContextMenu in handleContextMenu
    };

    const handleMessageEmojiClick = async (emojiObject, message) => {
        console.log("TCL: handleMessageEmojiClick -> message", message, selectedCustomer)
        try {
            // if (!selectedCustomer?.CustomerId && selectedCustomer?.CustomerId !== 0) return;

            const emoji = emojiObject?.emoji || emojiObject;
            const unified = emojiObject?.unified;
            let currentReactions = [];

            if (message.ReactionEmojis) {
                if (typeof message.ReactionEmojis === "string") {
                    try {
                        currentReactions = JSON.parse(message.ReactionEmojis);
                    } catch (e) {
                        currentReactions = message.ReactionEmojis.split(",").map(r => ({
                            Reaction: r,
                            Direction: 1
                        }));
                    }
                } else if (Array.isArray(message.ReactionEmojis)) {
                    currentReactions = message.ReactionEmojis;
                }
            }

            const existingIndex = currentReactions.findIndex(
                r => r.Direction === 1 && r.Reaction === emoji
            );

            let updatedReactions;
            let reactionPayload; // Value to send to API

            if (existingIndex >= 0) {
                currentReactions.splice(existingIndex, 1);
                updatedReactions = currentReactions;
                reactionPayload = ""; // send empty string to API
            } else {
                const filtered = currentReactions.filter(r => r.Direction !== 1);
                const newReaction = { Reaction: emoji, Unified: unified, Direction: 1 };
                updatedReactions = [...filtered, newReaction];
                reactionPayload = JSON.stringify(updatedReactions);
            }
            const messageIdToUse = message.MessageId;
            if (!messageIdToUse) {
                toast.error("Failed to send reaction: Message ID missing");
                return;
            }
            await addReactionApi(
                auth,
                {
                    messageId: messageIdToUse,
                    emoji: JSON.parse(reactionPayload || "[]")?.find(r => r.Direction === 1)?.Reaction || ""
                }
            );

            const receiverId = selectedCustomer?.ReceiverId;
            const senderId = auth?.id ?? auth?.userId;
            if (receiverId && senderId && auth?.ufcc) {
                const socketReactionEmojis = reactionPayload === ""
                    ? JSON.stringify([{ Reaction: "", Direction: 0 }])
                    : JSON.stringify([{ Reaction: emoji, Unified: unified, Direction: 0 }]);

                emitSendReaction({
                    ufcc: auth?.ufcc,
                    userId: senderId,
                    SenderId: senderId,
                    ReceiverId: receiverId,
                    ConversationId: selectedCustomer?.ConversationId,
                    MessageId: messageIdToUse,
                    ReactionEmojis: socketReactionEmojis,
                });
            }

            setMessages(prev => {
                const prevData = Array.isArray(prev) ? prev : prev?.data || [];
                const updatedData = prevData.map(msg => {
                    if ((msg.MessageId && msg.MessageId === message.MessageId) ||
                        (msg.Id && msg.Id === message.Id)) {
                        return {
                            ...msg,
                            ReactionEmojis: reactionPayload,
                            _isFromCurrentUser: true // Flag to identify current user's update
                        };
                    }
                    return msg;
                });
                return Array.isArray(prev)
                    ? updatedData
                    : { ...prev, data: updatedData };
            });
            if (reactionPayload === "") {
                toast("Reaction removed!");
            } else {
                toast.success("Reaction sent!");
            }
        } catch (error) {
            console.error("Error sending reaction:", error);
            toast.error("Failed to send reaction");
        }
    };

    const captureMessageScrollState = useCallback(() => {
        const el = containerRef.current;
        if (!el) return;
        mediaPreviewScrollStateRef.current = {
            scrollTop: el.scrollTop,
            bottomGap: el.scrollHeight - el.clientHeight - el.scrollTop,
        };
    }, []);

    const mediaFilesLength = mediaFiles?.length || 0;
    useEffect(() => {
        const prevLen = prevMediaFilesLenRef.current;

        if (prevLen === 0 && mediaFilesLength > 0) {
            const el = containerRef.current;
            if (el && !mediaPreviewScrollStateRef.current) {
                mediaPreviewScrollStateRef.current = {
                    scrollTop: el.scrollTop,
                    bottomGap: el.scrollHeight - el.clientHeight - el.scrollTop,
                };
            }
        }

        if (prevLen > 0 && mediaFilesLength === 0) {
            const state = mediaPreviewScrollStateRef.current;

            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    const el = containerRef.current;
                    if (!el || !state) return;
                    const nextTop = typeof state.bottomGap === 'number'
                        ? Math.max(0, el.scrollHeight - el.clientHeight - state.bottomGap)
                        : Math.max(0, Math.min(el.scrollHeight - el.clientHeight, state.scrollTop ?? 0));
                    el.scrollTop = nextTop;
                });
            });
        }

        prevMediaFilesLenRef.current = mediaFilesLength;
    }, [mediaFilesLength]);

    const openFilePicker = (e, acceptType) => {
        e.preventDefault();
        e.stopPropagation();
        if (fileInputRef?.current) {
            fileInputRef.current.accept = acceptType;
            fileInputRef.current.value = ''; // Reset the input to allow selecting the same file again
            fileInputRef.current.oninput = (changeEvent) => {
                if (changeEvent.target.files.length > 0) {
                    captureMessageScrollState();
                    // File was selected, handle it in the change handler
                    handleFileChange(changeEvent, toast);
                }
            };
            fileInputRef.current.click();
        }
    };

    const scrollToBottom = useCallback((behavior = 'auto') => {
        if (containerRef.current) {
            isAutoScrollingRef.current = true;

            const normalizedBehavior =
                behavior === 'instant'
                    ? 'auto'
                    : (behavior === 'smooth' || behavior === 'auto')
                        ? behavior
                        : 'auto';

            containerRef.current.scrollTo({
                top: containerRef.current.scrollHeight,
                behavior: normalizedBehavior
            });

            setShowScrollToBottom(false);
            setTimeout(() => {
                isAutoScrollingRef.current = false;
            }, 150);
        }
    }, []);

    useLayoutEffect(() => {
        const currentConvId = selectedCustomer?.ConversationId;
        if (!currentConvId) return;
        if (currentConvId !== lastConversationIdRef.current) {
            setIsSwitchingConversation(true);
            lastConversationIdRef.current = currentConvId;
        }
        if (!loading && isSwitchingConversation) {
            const messageList = Array.isArray(messages?.data) ? messages.data : [];

            if (containerRef.current) {
                containerRef.current.scrollTo({
                    top: containerRef.current.scrollHeight,
                    behavior: 'auto'
                });
                if (messageList.length > 0) {
                    const lastMessage = messageList[messageList.length - 1];
                    lastMessageIdRef.current = lastMessage?.Id || lastMessage?.MessageId || lastMessage?.id;
                }
                const timer = setTimeout(() => {
                    setIsSwitchingConversation(false);
                }, 100);
                return () => clearTimeout(timer);
            }
        }
    }, [selectedCustomer?.ConversationId, loading, messages, isSwitchingConversation]);

    useEffect(() => {
        if (currentPage > 1) return;
        const messageList = Array.isArray(messages?.data) ? messages.data : [];
        const currentConvId = selectedCustomer?.ConversationId;
        if (messageList.length === 0) return;
        const lastMessage = messageList[messageList.length - 1];
        const lastId = lastMessage?.Id || lastMessage?.MessageId || lastMessage?.id;
        if (currentConvId === lastConversationIdRef.current && lastId !== lastMessageIdRef.current) {
            scrollToBottom('smooth');
            lastMessageIdRef.current = lastId;
        }
    }, [messages, currentPage, scrollToBottom, selectedCustomer?.ConversationId]);

    const handleScroll = useCallback(() => {
        if (!containerRef.current) return;
        const container = containerRef.current;
        const { scrollTop, scrollHeight, clientHeight } = container;
        const scrollBottom = scrollHeight - clientHeight - scrollTop;
        if (!isAutoScrollingRef.current) {
            setShowScrollToBottom(scrollBottom > 300);
        }
        if (hasMore && !isAutoScrollingRef.current) {
            const dynamicThreshold = Math.max(50, Math.floor(clientHeight * 0.2));

            if (scrollTop <= dynamicThreshold) {
                const now = Date.now();
                if (now - lastScrollTriggerRef.current < 1000) return;
                if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);

                scrollTimeoutRef.current = setTimeout(() => {
                    lastScrollTriggerRef.current = now;
                    loadOlderMessages(containerRef);
                }, 150);
            }
        }
    }, [hasMore, loadOlderMessages]);

    useEffect(() => {
        const container = containerRef.current;
        if (!container || !selectedCustomer?.ConversationId) {
            scrollListenerAttachedRef.current = false;
            return;
        }
        scrollListenerAttachedRef.current = false;
        const timeoutId = setTimeout(() => {
            const checkContainer = containerRef.current;
            if (checkContainer &&
                checkContainer.scrollHeight > checkContainer.clientHeight &&
                !scrollListenerAttachedRef.current) {
                checkContainer.addEventListener('scroll', handleScroll, { passive: true });
                scrollListenerAttachedRef.current = true;
            }
        }, 1200);

        return () => {
            clearTimeout(timeoutId);
            const checkContainer = containerRef.current;
            if (checkContainer && scrollListenerAttachedRef.current) {
                checkContainer.removeEventListener('scroll', handleScroll);
                scrollListenerAttachedRef.current = false;
            }
            if (scrollTimeoutRef.current) {
                clearTimeout(scrollTimeoutRef.current);
            }
        };
    }, [handleScroll, selectedCustomer?.ConversationId]);

    const handleCloseContextMenu = () => {
        setContextMenu(null);
    };

    const handleMenuAction = (action) => {
        if (action === "Close") {
            onCustomerSelect(null);
        }
    };

    const toggleEmojiPicker = () => {
        setShowPicker(!showPicker);
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target) &&
                !event.target.closest('.attach-button')) {
                setShowPicker(false);
            }
        };

        if (showPicker) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showPicker]);

    const [messageContextMenu, setMessageContextMenu] = useState(null);

    const handleContextMenu = (event, message) => {
        event.preventDefault();
        setMessageContextMenu(
            messageContextMenu === null
                ? { mouseX: event.clientX - 2, mouseY: event.clientY - 4, message }
                : null
        );
    };

    const getMessageStatusIconCallback = useCallback((msg) => {
        return getMessageStatusIcon(msg);
    }, [getMessageStatusIcon]);

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (inputValue.trim() || (mediaFiles && mediaFiles.length > 0)) {
                handleSendMessage(containerRef, scrollToBottom, inputValue);
                setInputValue("");
            }
        }
    };

    if (!selectedCustomer) {
        return (
            <div className="conversation-container empty-state">
                <Box sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    color: '#6b7280'
                }}>
                    <Typography variant="h6" sx={{ mb: 2 }}>
                        Select a conversation
                    </Typography>
                    <Typography variant="body2">
                        Choose a customer from the list to start chatting
                    </Typography>
                </Box>
            </div>
        );
    }

    return (
        <Box className="conversation-container">
            {/* Media Viewer */}
            {mediaViewerOpen && (
                <MediaViewer
                    mediaItems={mediaViewerItems}
                    initialIndex={mediaViewerIndex}
                    onClose={() => setMediaViewerOpen(false)}
                />
            )}
            <div className="conversation-layout">
                <div className="conversation-main">
                    {/* Header */}
                    <div className="conversation-header">
                        <div className="header-left">
                            <div style={{ width: 40, height: 40, marginRight: 10, cursor: "pointer" }}>
                                {!hasCustomerName(selectedCustomer) ? (
                                    <Avatar
                                        {...getWhatsAppAvatarConfig(getCustomerAvatarSeed(selectedCustomer), 40)}
                                        onClick={() => setDrawerOpen(true)}
                                    >
                                        <PersonIcon fontSize="small" />
                                    </Avatar>
                                ) : (
                                    <Avatar
                                        {...(selectedCustomer?.avatarConfig || getWhatsAppAvatarConfig(getCustomerAvatarSeed(selectedCustomer), 40))}
                                        onClick={() => setDrawerOpen(true)}
                                    />
                                )}
                            </div>
                            <div className="customer-info">
                                <Typography variant="subtitle1" className="customer-name">
                                    {getCustomerDisplayName(selectedCustomer)}
                                </Typography>
                            </div>
                        </div>
                    </div>
                    {/* Messages Area - Using the MessageArea component */}
                    <MessageArea
                        showMedia={showMedia}
                        setShowMedia={setShowMedia}
                        loading={loading}
                        mediaFiles={mediaFiles}
                        setMediaFiles={setMediaFiles}
                        handleClosePreview={handleClosePreview}
                        containerRef={containerRef}
                        showScrollToBottom={showScrollToBottom}
                        scrollToBottomRightOffset={scrollToBottomRightOffset}
                        setContextMenu={setContextMenu}
                        selectedCustomer={selectedCustomer}
                        scrollToBottom={scrollToBottom}
                        groupMessagesByDate={groupMessagesByDate}
                        formatDateHeader={formatDateHeader}
                        getMessageStatusIcon={getMessageStatusIconCallback}
                        parseTemplateData={parseTemplateData}
                        getMediaSrcForMessage={getMediaSrcForMessage}
                        handleMediaClick={handleMediaClick}
                        handleMessageEmojiClick={handleMessageEmojiClick}
                        handleMenuClick={handleMenuClick}
                        handleContextMenu={handleContextMenu}
                        scrollToMessage={scrollToMessage}
                        handleReply={handleReply}
                        handleForward={handleForward}
                        blinkMessageId={blinkMessageId}
                        setBlinkMessageId={setBlinkMessageId}
                        loadedMedia={loadedMedia}
                        setLoadedMedia={setLoadedMedia}
                        getMediaKey={getMediaKeyCallback}
                        markLoaded={markLoadedCallback}
                        uploadProgress={uploadProgress}
                        replyToMessage={replyToMessage}
                        isSwitchingConversation={isSwitchingConversation}
                    />

                    <ChatBox
                        replyToMessage={replyToMessage}
                        handleCancelReply={handleCancelReply}
                        handleAttachClick={handleAttachClick}
                        toggleEmojiPicker={toggleEmojiPicker}
                        showPicker={showPicker}
                        emojiPickerRef={emojiPickerRef}
                        showMedia={showMedia}
                        fileInputRef={fileInputRef}
                        openFilePicker={openFilePicker}
                        imageParams={imageParams}
                        videoParams={videoParams}
                        docsParams={docsParams}
                        handleFileChange={(e) => handleFileChange(e, toast)}
                        inputValue={inputValue}
                        setInputValue={setInputValue}
                        handleKeyPress={handleKeyPress}
                        handleSendMessage={(messageOverride) => handleSendMessage(containerRef, scrollToBottom, messageOverride)}
                        mediaFiles={mediaFiles}
                    />
                </div>

                {drawerOpen === true && (
                    isNarrowScreen ? (
                        <CustomerDetails
                            customer={selectedCustomer}
                            onClose={() => setDrawerOpen(false)}
                            open={drawerOpen}
                            variant="drawer"
                        />
                    ) : (
                        <div className="conversation-right-panel">
                            <CustomerDetails
                                customer={selectedCustomer}
                                onClose={() => setDrawerOpen(false)}
                                open={drawerOpen}
                                variant="panel"
                            />
                        </div>
                    )
                )}
            </div>

            <ViewContext
                contextMenu={contextMenu}
                handleCloseMenu={handleCloseContextMenu}
                handleMenuAction={handleMenuAction}
                setContextMenu={setContextMenu}
                selectedCustomer={selectedCustomer}
            />

            {/* Message Context Menu */}
            <MessageContextMenu
                anchorEl={messageContextMenu?.anchorEl}
                open={!!messageContextMenu}
                onClose={() => setMessageContextMenu(null)}
                onReply={handleReply}
                onForward={handleForward}
                message={messageContextMenu?.message}
                mouseX={messageContextMenu?.mouseX}
                mouseY={messageContextMenu?.mouseY}
            />

            <ForwardMessage
                message={forwardMessage}
                open={!!forwardAnchorEl && !!forwardMessage}
                anchorEl={forwardAnchorEl}
                onClose={handleCloseForward}
                onSend={handleSendForward}
            />

        </Box>
    );
};

export default Conversation;