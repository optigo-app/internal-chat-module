import React, { useState, useRef, useEffect, useCallback, useContext, useLayoutEffect } from 'react';
import { Box, Typography, Avatar, Divider, Menu, MenuItem, IconButton, useMediaQuery } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { Plus, Tag } from 'lucide-react';
import './Conversation.scss';
import { useTagsContext } from '../../contexts/TagsContexts';
import CustomerDetails from '../CustomerDetails/CustomerDetails';
import { formatDateHeader } from '../../utils/DateFnc';
import toast from 'react-hot-toast';
import AssigneeDropdown from '../AssigneeDropdown/AssigneeDropdown';
import EscalatedDropdown from '../EscalatedDropdown/EscalatedDropdown';
import { LoginContext } from '../../context/LoginData';
import MessageContextMenu from '../MessageBubble/MessageContextMenu';
import ForwardMessage from '../ForwardMessage/ForwardMessage';
import MediaViewer from '../MediaViewer/MediaViewer';
import { getCustomerAvatarSeed, getCustomerDisplayName, getWhatsAppAvatarConfig, hasCustomerName } from '../../utils/globalFunc';
import ChatBox from './ChatBox';
import MessageArea from './MessageArea';
import ViewContext from './ViewContext';
import { useConversation } from './useConversation';
import { messageReaction } from '../../API/Reaction/Reaction';
import PersonIcon from '@mui/icons-material/Person';

const Conversation = ({ selectedCustomer, onConversationRead, onViewConversationRead, onCustomerSelect }) => {
    const { tags, addTags, removeTags, triggerRefetch } = useTagsContext();
    const [openTagModal, setOpenTagModal] = useState(false);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [tagInput, setTagInput] = useState('');
    const [color, setColor] = useState('');
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
    const [tagsMenuAnchorEl, setTagsMenuAnchorEl] = useState(null);
    const isDetailsPanelDocked = drawerOpen === true && !isNarrowScreen;
    const dockedPanelWidth = isCompactDockedPanel ? 380 : 420;
    const scrollToBottomRightOffset = isDetailsPanelDocked ? dockedPanelWidth + 30 : 30;

    // Use the conversation hook
    const {
        inputValue,
        setInputValue,
        tagsList,
        messages,
        setMessages,
        mediaFiles,
        setMediaFiles,
        showMedia,
        setLoadedMedia,
        setShowMedia,
        assigneeList,
        escalatedLists,
        selectedAssignees,
        setSelectedAssignees,
        selectedEscalated,
        setSelectedEscalate,
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
        messId,

        // Functions
        handleFetchtags,
        handleCloseForward,
        fetchAssigneeList,
        fetchEscalatedList,
        handleDeletetags,
        loadConversation,
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
        formatDateHeader: formatDateHeaderHook,
    } = useConversation(selectedCustomer, onConversationRead, onViewConversationRead);

    const tagsScrollRef = useRef(null);
    const [tagsOverflow, setTagsOverflow] = useState(false);
    const [canScrollTagsLeft, setCanScrollTagsLeft] = useState(false);
    const [canScrollTagsRight, setCanScrollTagsRight] = useState(false);

    const updateTagsScrollState = useCallback(() => {
        const el = tagsScrollRef.current;
        if (!el) return;

        const hasOverflow = el.scrollWidth > el.clientWidth + 1;
        setTagsOverflow(hasOverflow);
        setCanScrollTagsLeft(el.scrollLeft > 0);
        setCanScrollTagsRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
    }, []);

    const scrollTagsBy = useCallback((delta) => {
        const el = tagsScrollRef.current;
        if (!el) return;
        el.scrollBy({ left: delta, behavior: 'smooth' });
    }, []);

    useEffect(() => {
        updateTagsScrollState();
        const el = tagsScrollRef.current;
        if (!el) return;

        const onScroll = () => updateTagsScrollState();
        el.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', updateTagsScrollState);

        return () => {
            el.removeEventListener('scroll', onScroll);
            window.removeEventListener('resize', updateTagsScrollState);
        };
    }, [tagsList, selectedCustomer?.CustomerId, updateTagsScrollState]);


    const docsParams = ".pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx,.csv";
    const videoParams = "video/*";
    const imageParams = "image/*";

    const markLoadedCallback = useCallback((key) => {
        markLoaded(key);
    }, [markLoaded]);

    const getMediaKeyCallback = useCallback((msg, index) => {
        return getMediaKey(msg, index);
    }, [getMediaKey]);

    const tagsMenuOpen = Boolean(tagsMenuAnchorEl);

    const handleOpenTagsMenu = (event) => {
        event.stopPropagation();
        setTagsMenuAnchorEl(event.currentTarget);
    };

    const handleCloseTagsMenu = () => {
        setTagsMenuAnchorEl(null);
    };

    useEffect(() => {
        if (!isDetailsPanelDocked) {
            setTagsMenuAnchorEl(null);
        }
    }, [isDetailsPanelDocked]);

    const handleMenuClick = (event, message) => {
        event.stopPropagation();
        // message-specific menu is handled via messageContextMenu in handleContextMenu
    };

    const handleMessageEmojiClick = async (emojiObject, message) => {
        console.log("TCL: handleMessageEmojiClick -> message", message)

        try {
            if (!selectedCustomer?.CustomerId && selectedCustomer?.CustomerId !== 0) return;

            const emoji = emojiObject?.emoji || emojiObject; // Extract emoji character
            const unified = emojiObject?.unified;

            // Determine current reaction state (toggle logic)
            let isSameReaction = false;
            let currentReactions = [];

            if (message.ReactionEmojis) {
                if (typeof message.ReactionEmojis === "string") {
                    try {
                        currentReactions = JSON.parse(message.ReactionEmojis);
                    } catch (e) {
                        // Handle legacy comma-separated format
                        currentReactions = message.ReactionEmojis.split(",").map(r => ({
                            Reaction: r,
                            Direction: 1
                        }));
                    }
                } else if (Array.isArray(message.ReactionEmojis)) {
                    currentReactions = message.ReactionEmojis;
                }
            }

            // Check if the same emoji already exists for the agent (Direction: 1)
            const existingIndex = currentReactions.findIndex(
                r => r.Direction === 1 && r.Reaction === emoji
            );

            let updatedReactions;
            let reactionPayload; // Value to send to API

            if (existingIndex >= 0) {
                // 🧩 Toggle off — remove the same emoji
                currentReactions.splice(existingIndex, 1);
                updatedReactions = currentReactions;
                reactionPayload = ""; // send empty string to API
            } else {
                // ✅ Add new agent reaction
                // Remove any previous agent reaction
                const filtered = currentReactions.filter(r => r.Direction !== 1);
                const newReaction = { Reaction: emoji, Unified: unified, Direction: 1 };
                updatedReactions = [...filtered, newReaction];
                reactionPayload = JSON.stringify(updatedReactions);
            }

            // Use Id if messageId is not available (for optimistic updates)
            const messageIdToUse = message.MessageId || messId;

            if (!messageIdToUse) {
                console.error("No valid message ID found for reaction");
                toast.error("Failed to send reaction: Message ID missing");
                return;
            }

            // 🔥 Send updated reaction to API
            await messageReaction(
                auth?.userId,
                selectedCustomer.CustomerId,
                selectedCustomer.CustomerPhone,
                messageIdToUse,
                JSON.parse(reactionPayload || "[]")?.find(r => r.Direction === 1)?.Reaction || ""
            );

            // 🧠 Update UI state
            // Add a flag to indicate this update is from the current user
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

            // Show correct feedback
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

    const scrollToBottom = useCallback((behavior = 'smooth') => {
        if (containerRef.current) {
            isAutoScrollingRef.current = true;

            const normalizedBehavior =
                behavior === 'instant'
                    ? 'auto'
                    : (behavior === 'smooth' || behavior === 'auto')
                        ? behavior
                        : 'smooth';

            containerRef.current.scrollTo({
                top: containerRef.current.scrollHeight,
                behavior: normalizedBehavior
            });

            // Hide the scroll-to-bottom button and reset the auto-scrolling flag
            setShowScrollToBottom(false);
            setTimeout(() => {
                isAutoScrollingRef.current = false;
            }, 150);
        }
    }, []);

    // 🚀 Handle initial scroll on conversation switch (Synchronous)
    useLayoutEffect(() => {
        const currentConvId = selectedCustomer?.ConversationId;
        if (!currentConvId) return;

        // 1. Detect conversation switch
        if (currentConvId !== lastConversationIdRef.current) {
            setIsSwitchingConversation(true);
            lastConversationIdRef.current = currentConvId;
        }

        // 2. Perform scroll once loading is finished and messages are available
        if (!loading && isSwitchingConversation) {
            const messageList = Array.isArray(messages?.data) ? messages.data : [];

            if (containerRef.current) {
                // Instant jump
                containerRef.current.scrollTo({
                    top: containerRef.current.scrollHeight,
                    behavior: 'auto'
                });

                // Update last message ID to keep auto-scroll in sync
                if (messageList.length > 0) {
                    const lastMessage = messageList[messageList.length - 1];
                    lastMessageIdRef.current = lastMessage?.Id || lastMessage?.MessageId || lastMessage?.id;
                }

                // Tiny delay to mask any DOM settling
                const timer = setTimeout(() => {
                    setIsSwitchingConversation(false);
                }, 100);
                return () => clearTimeout(timer);
            }
        }
    }, [selectedCustomer?.ConversationId, loading, messages, isSwitchingConversation]);

    // 🌊 Handle auto-scrolling for NEW messages in the same conversation
    useEffect(() => {
        if (currentPage > 1) return;

        const messageList = Array.isArray(messages?.data) ? messages.data : [];
        const currentConvId = selectedCustomer?.ConversationId;

        if (messageList.length === 0) return;

        const lastMessage = messageList[messageList.length - 1];
        const lastId = lastMessage?.Id || lastMessage?.MessageId || lastMessage?.id;

        // If it's the same conversation but a NEW message was added
        if (currentConvId === lastConversationIdRef.current && lastId !== lastMessageIdRef.current) {
            scrollToBottom('smooth');
            lastMessageIdRef.current = lastId;
        }
    }, [messages, currentPage, scrollToBottom, selectedCustomer?.ConversationId]);

    const handleScroll = useCallback(() => {
        if (!containerRef.current) return;

        const container = containerRef.current;
        const { scrollTop, scrollHeight, clientHeight } = container;

        // Show scroll-to-bottom button when scrolled up more than 300px from bottom
        const scrollBottom = scrollHeight - clientHeight - scrollTop;
        if (!isAutoScrollingRef.current) {
            setShowScrollToBottom(scrollBottom > 300);
        }

        // Load older messages when scrolled to top
        if (hasMore && !isAutoScrollingRef.current) {
            const dynamicThreshold = Math.max(50, Math.floor(clientHeight * 0.2));

            if (scrollTop <= dynamicThreshold) {
                const now = Date.now();
                if (now - lastScrollTriggerRef.current < 1000) return;
                if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);

                scrollTimeoutRef.current = setTimeout(() => {
                    lastScrollTriggerRef.current = now;
                    // Pass containerRef to maintain scroll position
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

        // Reset flag when conversation changes
        scrollListenerAttachedRef.current = false;

        // Wait for messages to load and scroll to bottom to complete
        // before attaching scroll listener
        const timeoutId = setTimeout(() => {
            const checkContainer = containerRef.current;
            if (checkContainer &&
                checkContainer.scrollHeight > checkContainer.clientHeight &&
                !scrollListenerAttachedRef.current) {
                // Only attach if there's scrollable content and not already attached
                checkContainer.addEventListener('scroll', handleScroll, { passive: true });
                scrollListenerAttachedRef.current = true;
            }
        }, 1200); // Wait for scrollToBottom animation (1000ms) + buffer

        return () => {
            clearTimeout(timeoutId);
            const checkContainer = containerRef.current;
            if (checkContainer && scrollListenerAttachedRef.current) {
                checkContainer.removeEventListener('scroll', handleScroll);
                scrollListenerAttachedRef.current = false;
            }
            // Cleanup scroll timeout on unmount
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

    const handleAssigneeChange = (selectedValues) => {
        setSelectedAssignees(selectedValues)
    };

    const handleEscalateChange = (selectedValues) => {
        setSelectedEscalate(selectedValues)
    };

    const toggleEmojiPicker = () => {
        setShowPicker(!showPicker);
    };

    // Close emoji picker when clicking outside
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

    // Message context menu handlers
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
                handleSendMessage(containerRef, scrollToBottom, toast);
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
                        handleSendMessage={() => handleSendMessage(containerRef, scrollToBottom, toast)}
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