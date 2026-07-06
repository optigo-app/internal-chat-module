import React, { useState, useRef, useEffect, useCallback, useContext, useLayoutEffect } from 'react';
import { Box, Typography, useMediaQuery, IconButton, Tooltip } from '@mui/material';
import './Conversation.scss';
import CustomerDetails from '../CustomerDetails/CustomerDetails';
import { formatDateHeader } from '../../utils/DateFnc';
import toast from 'react-hot-toast';
import { LoginContext } from '../../context/LoginData';
import MessageContextMenu from '../MessageBubble/MessageContextMenu';
import ForwardMessage from '../ForwardMessage/ForwardMessage';
import MediaViewer from '../MediaViewer/MediaViewer';
import { getCustomerDisplayName } from '../../utils/globalFunc';
import { renderEmojiText } from '../../utils/EmojiRenderer';
import ChatBox from './ChatBox';
import MessageArea from './MessageArea';
import ViewContext from './ViewContext';
import { useConversation } from './useConversation';
import EditMessageDialog from './EditMessageDialog';
import ConversationAvatar from '../ReusableComponent/ConversationAvatar';
import RefreshIcon from '@mui/icons-material/Refresh';
import useOnlineStatus from '../../utils/internetCheck';
import OfflineOverlay from './OfflineOverlay';
import AddMemberDialog from '../ReusableComponent/AddMemberDialog';
import ConfirmationDialog from '../ReusableComponent/ConfirmationDialog';
import WhatsAppMenu from '../ReusableComponent/WhatsAppMenu';
import { addGroupParticipantApi } from '../../API/Groups/AddGroupParticipantApi';
import { useFavorite } from '../../contexts/FavoriteContext';
import { useRemoveInGroup } from '../../contexts/RemoveInGroupContext';
import { useGroupAdminMode } from '../../contexts/GroupAdminModeContext';
import { useGroupSocket } from '../../contexts/GroupSocketContext';
import { Search, EllipsisVertical } from 'lucide-react';
import { useConfirmModal } from '../../hooks/useConfirmModal';
import { getConfirmProps } from '../../hooks/confirmConfig';
import {
    useTypingIndicator,
    useHeaderMenu,
    useDrawerState,
    useReactions,
    useGroupSocketListeners,
    useMessageActions
} from '../../hooks/Conversaction';

const Conversation = ({ selectedCustomer, onConversationRead, onViewConversationRead, onCustomerSelect }) => {
    const isOnline = useOnlineStatus();
    const { auth } = useContext(LoginContext);

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
    const [isSwitchingConversation, setIsSwitchingConversation] = useState(false);
    const [isAddMemberDialogOpen, setIsAddMemberDialogOpen] = useState(false);
    const messagesRef = useRef(null);
    const [isCurrentUserAdmin, setIsCurrentUserAdmin] = useState(false);
    const messageAreaRef = useRef(null);

    // Initialize drawer state first (needed by useConversation)
    const {
        drawerOpen,
        setDrawerOpen,
        drawerViewState,
        setDrawerViewState,
        selectedMessageForInfo,
        infoMember,
        openInfo: handleOpenInfo,
        openSearch: handleOpenSearch,
        openMessageInfo: handleMessageInfo,
        closeDrawer
    } = useDrawerState(selectedCustomer?.ConversationId);

    // Use the conversation hook (depends on drawerOpen)
    const {
        inputValue, setInputValue, updateLatestInput,
        messages, setMessages,
        mediaFiles, setMediaFiles,
        showMedia, setLoadedMedia, setShowMedia,
        loading, hasMore, loadingOlder,
        uploadProgress, loadedMedia,
        replyToMessage, forwardMessage,
        blinkMessageId, setBlinkMessageId,
        mediaViewerOpen, setMediaViewerOpen,
        mediaViewerItems, mediaViewerIndex,
        mediaViewerMessage, groupMessagesByDate,
        currentPage, forwardAnchorEl,
        handleCloseForward, loadOlderMessages,
        parseTemplateData, getMediaSrcForMessage,
        getMediaKey, markLoaded,
        handleAttachClick, handleFileChange,
        handleMediaClick, handleClosePreview,
        handleSendMessage, handleReply,
        handleCancelReply, handleForward,
        handleSendForward, scrollToMessage,
        searchMessages, getMessageStatusIcon,
        processFiles, refresh,
        addUniqueMessage, handleEditMessage,
        handleDeleteMessage,
        searchResults, isSearching,
        groupMembers, fetchAndCacheGroupMembers,
    } = useConversation(selectedCustomer, onConversationRead, onViewConversationRead, drawerOpen, onCustomerSelect);

    // Custom hooks for better organization
    const typingStatus = useTypingIndicator(
        selectedCustomer?.ConversationId,
        auth?.id || auth?.userId
    );

    const { favoriteState, updateFavoriteStatus } = useFavorite();
    const { updateRemoveInGroupStatus, isRemovedFromGroup } = useRemoveInGroup();
    const { updateGroupAdminMode, isGroupOnlyAdminSend, getGroupPermission } = useGroupAdminMode();
    const { registerListener, unregisterListener } = useGroupSocket();

    const isFavorite = favoriteState[selectedCustomer?.ConversationId]?.isStar ?? (selectedCustomer?.IsStar === 1);

    const contextRemovedStatus = isRemovedFromGroup(selectedCustomer?.ConversationId);
    const isRemovedFromCurrentGroup = contextRemovedStatus !== null && contextRemovedStatus !== undefined
        ? contextRemovedStatus
        : (selectedCustomer?.RemoveInGroup === 1);

    const contextAdminMode = isGroupOnlyAdminSend(selectedCustomer?.ConversationId);
    const isOnlyAdminSend = contextAdminMode !== null && contextAdminMode !== undefined
        ? contextAdminMode
        : (selectedCustomer?.IsGroupAdmin === 1);

    const {
        headerMenuAnchorEl,
        headerMenuItems,
        openMenu: openHeaderMenu,
        closeMenu: closeHeaderMenu
    } = useHeaderMenu({
        selectedCustomer,
        isFavorite,
        isRemovedFromGroup: isRemovedFromCurrentGroup
    });

    const {
        messageContextMenu,
        setMessageContextMenu,
        editDialogOpen,
        setEditDialogOpen,
        selectedMessageForEdit,
        setSelectedMessageForEdit,
        isForwardFromViewer,
        setIsForwardFromViewer,
        handleContextMenu,
        handleEditAction,
        handleToggleFavorite,
        handleMemberRedirect
    } = useMessageActions({
        selectedCustomer,
        auth,
        refresh,
        updateFavoriteStatus,
        isFavorite
    });

    const {
        handleMessageEmojiClick,
        handleRemoveReaction
    } = useReactions({
        auth,
        selectedCustomer,
        setMessages,
        messagesRef,
        fetchAndCacheGroupMembers
    });

    const {
        confirmationModal,
        open: openConfirmModal,
        close: closeConfirmModal,
        openDeleteMessage,
        checkAdminStatusAndShowConfirmation,
        onConfirm: handleConfirm,
        getDeleteMessageActions
    } = useConfirmModal({
        selectedCustomer,
        auth,
        onCustomerSelect,
        refresh,
        handleDeleteMessage,
        fetchAndCacheGroupMembers,
        isCurrentUserAdmin,
        getGroupPermission
    });

    useEffect(() => {
        if (selectedCustomer?.ConversationId && selectedCustomer?.RemoveInGroup !== undefined) {
            updateRemoveInGroupStatus(selectedCustomer.ConversationId, selectedCustomer.RemoveInGroup === 1);
        }
    }, [selectedCustomer?.ConversationId, selectedCustomer?.RemoveInGroup, updateRemoveInGroupStatus]);

    useEffect(() => {
        const fetchInitialGroupStatus = async () => {
            if (selectedCustomer?.IsGroup === 1 && selectedCustomer?.ConversationId && auth) {
                try {
                    const groupData = await fetchAndCacheGroupMembers(selectedCustomer.ConversationId);
                    if (groupData && groupData.groupDetails) {
                        updateGroupAdminMode(selectedCustomer.ConversationId, groupData.groupDetails.SendNewMessage === 0);

                        const currentUserId = auth?.id || auth?.userId;
                        const currentUser = groupData.members?.find(m => Number(m.UserId) === Number(currentUserId));
                        setIsCurrentUserAdmin(currentUser?.IsGroupAdmin === 1);
                    }
                } catch (error) {
                    console.error('Error fetching initial group status:', error);
                }
            } else {
                setIsCurrentUserAdmin(false);
            }
        };
        fetchInitialGroupStatus();
    }, [selectedCustomer?.ConversationId, selectedCustomer?.IsGroup, auth, fetchAndCacheGroupMembers, updateGroupAdminMode]);

    // Group socket listeners
    useGroupSocketListeners({
        selectedCustomer,
        auth,
        refresh,
        updateRemoveInGroupStatus,
        updateGroupAdminMode,
        setIsCurrentUserAdmin,
        registerListener,
        unregisterListener,
        addUniqueMessage,
        onCustomerSelect,
    });

    const isNarrowScreen = useMediaQuery('(max-width: 992px)');
    const isTopPanelScreen = useMediaQuery('(max-width: 1620px)');
    const isCompactDockedPanel = useMediaQuery('(max-width: 1200px)');
    const isDetailsPanelDocked = drawerOpen === true && !isNarrowScreen;
    const dockedPanelWidth = isCompactDockedPanel ? 400 : 450;
    const scrollToBottomRightOffset = isDetailsPanelDocked ? dockedPanelWidth + 30 : 30;
    const showFullDetails = drawerOpen === true && !isNarrowScreen && isTopPanelScreen;

    const handleAddMembersSubmit = async (selectedIds) => {
        if (!selectedIds || selectedIds.length === 0) return;
        try {
            const response = await addGroupParticipantApi(auth, {
                conversationId: selectedCustomer.ConversationId,
                selectedMembers: selectedIds
            });
            if (response?.Status === "200") {
                toast.success('Members added successfully');
                setIsAddMemberDialogOpen(false);
                if (refresh) refresh();
            } else {
                toast.error(response?.Message || 'Failed to add members');
            }
        } catch (error) {
            toast.error('Error adding members');
        }
    };

    useEffect(() => {
        messagesRef.current = messages;
    }, [messages]);

    const docsParams = ".pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx,.csv,.apk,.html,.htm,.py,.js,.jsx,.ts,.tsx,.css,.json,.xml,.zip,.rar,.7z,.sql,.log,.md,.rtf,.psd,.ai,.svg,.eps,.mp3,.wav,.ogg,.m4a,.flac,.aac,.wma,.mp4,.mov,.avi,.mkv,.flv,.wmv,.m4v,.webm";
    const videoParams = "video/*";
    const imageParams = "image/*";

    const markLoadedCallback = useCallback((key) => {
        markLoaded(key);
    }, [markLoaded]);

    const getMediaKeyCallback = useCallback((msg, index) => {
        return getMediaKey(msg, index);
    }, [getMediaKey]);

    const handleMenuClick = useCallback((event, message) => {
        event.stopPropagation();
    }, []);

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

    const openFilePicker = useCallback((e, acceptType) => {
        e.preventDefault();
        e.stopPropagation();
        if (fileInputRef?.current) {
            fileInputRef.current.accept = acceptType;
            fileInputRef.current.value = '';
            fileInputRef.current.oninput = (changeEvent) => {
                if (changeEvent.target.files.length > 0) {
                    captureMessageScrollState();
                    handleFileChange(changeEvent, toast);
                }
            };
            fileInputRef.current.click();
        }
    }, [handleFileChange, captureMessageScrollState]);

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
            }, 100);
        }
    }, []);

    useEffect(() => {
        if (!containerRef.current || loading || isSwitchingConversation) return;
        const container = containerRef.current;
        const { scrollTop, scrollHeight, clientHeight } = container;
        const isNearBottom = scrollHeight - clientHeight - scrollTop < 300;
        if (isNearBottom) {
            const timer = setTimeout(() => {
                scrollToBottom('auto');
            }, 50);
            return () => clearTimeout(timer);
        }
    }, [loadedMedia, loading, isSwitchingConversation, scrollToBottom]);

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
                const scroll = () => {
                    if (containerRef.current) {
                        containerRef.current.scrollTop = containerRef.current.scrollHeight;
                    }
                };
                scroll();
                const t1 = setTimeout(scroll, 0);
                const t2 = setTimeout(scroll, 50);
                if (messageList.length > 0) {
                    const lastMessage = messageList[messageList.length - 1];
                    lastMessageIdRef.current = lastMessage?.Id || lastMessage?.MessageId || lastMessage?.id;
                }
                const timer = setTimeout(() => {
                    setIsSwitchingConversation(false);
                }, 150);
                return () => {
                    clearTimeout(t1);
                    clearTimeout(t2);
                    clearTimeout(timer);
                };
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

    const handleCloseContextMenu = useCallback(() => {
        setContextMenu(null);
    }, []);

    const handleDeleteAction = useCallback((message) => {
        openDeleteMessage(message);
        setMessageContextMenu(null);
    }, [openDeleteMessage]);

    const handleMenuAction = useCallback(async (action) => {
        closeHeaderMenu();
        if (action === 'groupInfo') {
            handleOpenInfo();
        } else if (action === 'close') {
            onCustomerSelect(null);
        } else if (action === 'mute') {
            toast('Mute notifications — coming soon!');
        } else if (action === 'favourite') {
            await handleToggleFavorite();
        } else if (action === 'selectMessages') {
            toast('Select message — coming soon!');
        } else if (action === 'clearChat') {
            openConfirmModal('clearChat');
        } else if (action === 'exitGroup') {
            await checkAdminStatusAndShowConfirmation();
        } else if (action === 'deleteGroup' || action === 'deleteChat') {
            openConfirmModal(action);
        }
    }, [onCustomerSelect, handleToggleFavorite, checkAdminStatusAndShowConfirmation, closeHeaderMenu, handleOpenInfo, openConfirmModal]);

    const toggleEmojiPicker = useCallback(() => {
        setShowPicker(!showPicker);
    }, [showPicker]);

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

    const getMessageStatusIconCallback = useCallback((msg) => {
        return getMessageStatusIcon(msg);
    }, [getMessageStatusIcon]);

    const handleKeyPress = useCallback((e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (inputValue.trim() || (mediaFiles && mediaFiles.length > 0)) {
                handleSendMessage(containerRef, scrollToBottom, inputValue);
                setInputValue("");
            }
        }
    }, [inputValue, mediaFiles, handleSendMessage, scrollToBottom, setInputValue]);

    const handleSendMessageCallback = useCallback((messageOverride) => {
        handleSendMessage(containerRef, scrollToBottom, messageOverride);
        setShowPicker(false);
    }, [handleSendMessage, scrollToBottom]);

    const handleScrollToMessage = useCallback(async (messageId, attachmentId = null) => {
        if (messageAreaRef.current?.scrollToMessage) {
            return messageAreaRef.current.scrollToMessage(messageId, attachmentId);
        }
        return scrollToMessage(messageId, containerRef, attachmentId);
    }, [scrollToMessage]);

    if (!isOnline) {
        return (
            <div className="conversation-container">
                <OfflineOverlay />
            </div>
        );
    }

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

    const displayEmail = String((selectedCustomer?.DisplayEmail || selectedCustomer?.UserEmail) ?? '').trim();

    return (
        <Box className="conversation-container">
            {/* Media Viewer */}
            {mediaViewerOpen && (
                <MediaViewer
                    mediaItems={mediaViewerItems}
                    initialIndex={mediaViewerIndex}
                    selectedCustomer={selectedCustomer}
                    message={mediaViewerMessage}
                    messages={messages}
                    auth={auth}
                    handleMessageEmojiClick={handleMessageEmojiClick}
                    handleRemoveReaction={handleRemoveReaction}
                    onClose={() => setMediaViewerOpen(false)}
                    onReply={(attachmentId) => {
                        handleReply(mediaViewerMessage, attachmentId);
                        setMediaViewerOpen(false);
                    }}
                    onForward={(event, attachmentId) => {
                        setIsForwardFromViewer(true);
                        handleForward(mediaViewerMessage, event, attachmentId);
                        setMediaViewerOpen(false);
                    }}
                />
            )}
            <div className="conversation-layout">
                <div className="conversation-main">
                    {/* Header */}
                    {!showFullDetails && (
                        <div className="conversation-header">
                            <div className="header-left">
                                <div
                                    style={{ width: 40, height: 40, marginRight: 10, cursor: "pointer" }}
                                    onClick={handleOpenInfo}
                                >
                                    <ConversationAvatar member={selectedCustomer} size={40} />
                                </div>
                                <div className="customer-info">
                                    <Typography variant="subtitle1" className="customer-name" onClick={handleOpenInfo} style={{ cursor: 'pointer' }}>
                                        {renderEmojiText(getCustomerDisplayName(selectedCustomer))}
                                    </Typography>
                                    {typingStatus ? (
                                        <Typography variant="body2" className="typing-indicator">
                                            {selectedCustomer?.IsGroup === 1 ? `${typingStatus.UserName} is typing...` : 'typing...'}
                                        </Typography>
                                    ) : (
                                        selectedCustomer?.IsGroup === 1 ? (
                                            selectedCustomer?.GroupDesc ? (
                                                <Typography variant="body2" className="customer-email">
                                                    {renderEmojiText(selectedCustomer.GroupDesc)}
                                                </Typography>
                                            ) : null
                                        ) : (
                                            displayEmail ? (
                                                <Typography variant="body2" className="customer-email">
                                                    {displayEmail}
                                                </Typography>
                                            ) : null
                                        )
                                    )}
                                </div>
                            </div>
                            <div className="header-right">
                                <Tooltip title="Refresh">
                                    <IconButton
                                        onClick={refresh}
                                        size="small"
                                        disabled={loading}
                                        sx={{ color: '#6b7280', '&:hover': { color: '#374151', backgroundColor: 'rgba(0,0,0,0.04)' } }}
                                    >
                                        <RefreshIcon fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                                <Tooltip title="Search messages">
                                    <IconButton
                                        onClick={handleOpenSearch}
                                        size="small"
                                        sx={{ color: '#6b7280', '&:hover': { color: '#374151', backgroundColor: 'rgba(0,0,0,0.04)' } }}
                                    >
                                        <Search size={20} />
                                    </IconButton>
                                </Tooltip>
                                <Tooltip title="More options">
                                    <IconButton
                                        size="small"
                                        onClick={openHeaderMenu}
                                        sx={{ color: '#6b7280', '&:hover': { color: '#374151', backgroundColor: 'rgba(0,0,0,0.04)' } }}
                                    >
                                        <EllipsisVertical size={20} />
                                    </IconButton>
                                </Tooltip>
                            </div>
                        </div>
                    )}
                    {/* Messages Area - Using the MessageArea component */}
                    {showFullDetails ? (
                        <div className="conversation-details-full">
                            <CustomerDetails
                                customer={infoMember || selectedCustomer}
                                onClose={closeDrawer}
                                open={drawerOpen}
                                variant="panel"
                                initialViewState={drawerViewState}
                                messageInfo={selectedMessageForInfo}
                                messages={messages}
                                scrollToMessage={handleScrollToMessage}
                            />
                        </div>
                    ) : (
                        <>
                            <MessageArea
                                ref={messageAreaRef}
                                auth={auth}
                                showMedia={showMedia}
                                setShowMedia={setShowMedia}
                                loading={loading}
                                loadingOlder={loadingOlder}
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
                                handleRemoveReaction={handleRemoveReaction}
                                replyToMessage={replyToMessage}
                                processFiles={processFiles}
                                captureMessageScrollState={captureMessageScrollState}
                                typingStatus={typingStatus}
                                setDrawerViewState={setDrawerViewState}
                                setDrawerOpen={setDrawerOpen}
                                handleSendMessage={handleSendMessageCallback}
                                inputValue={inputValue}
                                setInputValue={setInputValue}
                            />

                            {(mediaFiles?.length === 0) && (
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
                                    handleFileChange={handleFileChange}
                                    inputValue={inputValue}
                                    setInputValue={setInputValue}
                                    updateLatestInput={updateLatestInput}
                                    handleKeyPress={handleKeyPress}
                                    handleSendMessage={handleSendMessageCallback}
                                    mediaFiles={mediaFiles}
                                    isRemovedFromGroup={isRemovedFromCurrentGroup}
                                    isOnlyAdminSend={isOnlyAdminSend}
                                    isCurrentUserAdmin={isCurrentUserAdmin}
                                    selectedCustomer={selectedCustomer}
                                    processFiles={processFiles}
                                    captureMessageScrollState={captureMessageScrollState}
                                    groupMembers={groupMembers}
                                    fetchAndCacheGroupMembers={fetchAndCacheGroupMembers}
                                />
                            )}
                        </>
                    )}
                </div>

                {drawerOpen === true && (
                    isNarrowScreen ? (
                        <CustomerDetails
                            customer={infoMember || selectedCustomer}
                            onClose={closeDrawer}
                            open={drawerOpen}
                            variant="drawer"
                            initialViewState={drawerViewState}
                            messageInfo={selectedMessageForInfo}
                            messages={messages}
                            scrollToMessage={handleScrollToMessage}
                            searchResults={searchResults}
                            isSearching={isSearching}
                            onSearchMessages={searchMessages}
                            containerRef={containerRef}
                        />
                    ) : (
                        !isTopPanelScreen ? (
                            <div className="conversation-right-panel">
                                <CustomerDetails
                                    customer={infoMember || selectedCustomer}
                                    onClose={closeDrawer}
                                    open={drawerOpen}
                                    variant="panel"
                                    initialViewState={drawerViewState}
                                    messageInfo={selectedMessageForInfo}
                                    messages={messages}
                                    scrollToMessage={handleScrollToMessage}
                                    searchResults={searchResults}
                                    isSearching={isSearching}
                                    onSearchMessages={searchMessages}
                                    containerRef={containerRef}
                                />
                            </div>
                        ) : null
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
                onMessageInfo={handleMessageInfo}
                onMemberRedirect={(handleMemberRedirect)}
                onEdit={handleEditAction}
                onDelete={handleDeleteAction}
                canDelete={
                    selectedCustomer?.IsGroup !== 1 ||
                    isCurrentUserAdmin ||
                    getGroupPermission(selectedCustomer?.ConversationId, 'AllowDeleteForAll') === 1 ||
                    selectedCustomer?.AllowDeleteForAll === 1 ||
                    selectedCustomer?.AllowDeleteForAll === true
                }
                message={messageContextMenu?.message}
                mouseX={messageContextMenu?.mouseX}
                mouseY={messageContextMenu?.mouseY}
                selectedCustomer={selectedCustomer}
                isRemovedFromGroup={isRemovedFromCurrentGroup}
            />

            <ForwardMessage
                message={forwardMessage}
                open={!!forwardMessage}
                anchorEl={forwardAnchorEl}
                isCentered={isForwardFromViewer || !forwardAnchorEl}
                onClose={() => {
                    if (typeof setIsForwardFromViewer === 'function') setIsForwardFromViewer(false);
                    handleCloseForward();
                }}
                onSend={handleSendForward}
            />

            <WhatsAppMenu
                anchorEl={headerMenuAnchorEl}
                open={Boolean(headerMenuAnchorEl)}
                onClose={closeHeaderMenu}
                onAction={handleMenuAction}
                items={headerMenuItems}
                sx={{ minWidth: '220px', px: 1 }}
            />

            <AddMemberDialog
                open={isAddMemberDialogOpen}
                onClose={() => setIsAddMemberDialogOpen(false)}
                onSubmit={handleAddMembersSubmit}
            />

            <ConfirmationDialog
                isOpen={confirmationModal.isOpen}
                onClose={closeConfirmModal}
                onConfirm={handleConfirm}
                actions={confirmationModal.actionType === 'deleteMessage' ? getDeleteMessageActions() : []}
                {...getConfirmProps(confirmationModal.actionType)}
            />

            <EditMessageDialog
                open={editDialogOpen}
                onClose={() => setEditDialogOpen(false)}
                onSave={handleEditMessage}
                originalMessage={selectedMessageForEdit}
            />
        </Box>
    );
};

export default Conversation;