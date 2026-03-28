import React, {
    useState, useRef, useEffect, useCallback, useContext, useLayoutEffect,
} from 'react';
import { Box, Typography, Avatar, useMediaQuery, IconButton, Tooltip } from '@mui/material';
import './Conversation.scss';
import CustomerDetails from '../CustomerDetails/CustomerDetails';
import { formatDateHeader } from '../../utils/DateFnc';
import toast from 'react-hot-toast';
import { LoginContext } from '../../context/LoginData';
import MessageContextMenu from '../MessageBubble/MessageContextMenu';
import ForwardMessage from '../ForwardMessage/ForwardMessage';
import MediaViewer from '../MediaViewer/MediaViewer';
import { getCustomerDisplayName } from '../../utils/globalFunc';
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
import { addInternalTypingHandler } from '../../socket';
import { useFavorite } from '../../contexts/FavoriteContext';
import { updateConversationApi } from '../../API/SendMessage/updateConversationApi';
import { Search } from 'lucide-react';
import { EllipsisVertical } from 'lucide-react';

// ── extracted hooks ──────────────────────────────────────────────────────────
import { useGroupActions } from '../../hooks/useGroupActions';
import { useHeaderMenu } from '../../hooks/useHeaderMenu';
import { useConfirmModal } from '../../hooks/useConfirmModal';
import { useReactions } from '../../hooks/useReactions';
import { getConfirmProps } from '../../hooks/confirmConfig';

// ── constants ─────────────────────────────────────────────────────────────────
const FILE_PARAMS = {
    docs: '.pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx,.csv',
    video: 'video/*',
    image: 'image/*',
};

const Conversation = ({ selectedCustomer, onConversationRead, onViewConversationRead, onCustomerSelect }) => {
    const isOnline = useOnlineStatus();
    const { auth } = useContext(LoginContext);

    // ── layout / drawer ──────────────────────────────────────────────────────
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [drawerViewState, setDrawerViewState] = useState('info');
    const [selectedMessageForInfo, setSelectedMessageForInfo] = useState(null);

    const isNarrowScreen = useMediaQuery('(max-width: 992px)');
    const isTopPanelScreen = useMediaQuery('(max-width: 1620px)');
    const isCompactDockedPanel = useMediaQuery('(max-width: 1200px)');
    const isDetailsPanelDocked = drawerOpen && !isNarrowScreen;
    const dockedPanelWidth = isCompactDockedPanel ? 400 : 450;
    const scrollToBottomRightOffset = isDetailsPanelDocked ? dockedPanelWidth + 30 : 30;
    const showFullDetails = drawerOpen && !isNarrowScreen && isTopPanelScreen;

    useEffect(() => {
        setDrawerOpen(false);
        setDrawerViewState('info');
    }, [selectedCustomer?.ConversationId]);

    const handleOpenSearch = useCallback(() => { setDrawerViewState('search'); setDrawerOpen(true); }, []);
    const handleOpenInfo = useCallback(() => { setDrawerViewState('info'); setDrawerOpen(true); }, []);

    // ── scroll / container ───────────────────────────────────────────────────
    const containerRef = useRef(null);
    const mediaPreviewScrollStateRef = useRef(null);
    const prevMediaFilesLenRef = useRef(0);
    const scrollTimeoutRef = useRef(null);
    const lastScrollTriggerRef = useRef(0);
    const isAutoScrollingRef = useRef(false);
    const scrollListenerAttachedRef = useRef(false);
    const lastMessageIdRef = useRef(null);
    const lastConversationIdRef = useRef(null);
    const [showScrollToBottom, setShowScrollToBottom] = useState(false);
    const [isSwitchingConversation, setIsSwitchingConversation] = useState(false);

    // ── misc ui state ────────────────────────────────────────────────────────
    const [showPicker, setShowPicker] = useState(false);
    const [isForwardFromViewer, setIsForwardFromViewer] = useState(false);
    const emojiPickerRef = useRef(null);
    const fileInputRef = useRef(null);
    const [contextMenu, setContextMenu] = useState(null);
    const [messageContextMenu, setMessageContextMenu] = useState(null);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [selectedMessageForEdit, setSelectedMessageForEdit] = useState(null);

    // ── typing indicator ─────────────────────────────────────────────────────
    const [typingStatus, setTypingStatus] = useState(null);
    const typingTimeoutRef = useRef(null);

    useEffect(() => {
        const cleanup = addInternalTypingHandler((data) => {
            if (Number(data.ConversationId) !== Number(selectedCustomer?.ConversationId)) return;
            const currentUserId = auth?.id || auth?.userId;
            if (Number(data.SenderId) === Number(currentUserId)) return;

            if (data.isTyping === false) {
                setTypingStatus(null);
                clearTimeout(typingTimeoutRef.current);
            } else {
                setTypingStatus({ ...data, UserName: data.UserName || data.senderName || 'Someone' });
                clearTimeout(typingTimeoutRef.current);
                typingTimeoutRef.current = setTimeout(() => setTypingStatus(null), 5000);
            }
        });
        return () => { cleanup(); clearTimeout(typingTimeoutRef.current); };
    }, [selectedCustomer?.ConversationId, auth]);

    // ── core conversation hook ───────────────────────────────────────────────
    const {
        inputValue, setInputValue, messages, setMessages, mediaFiles, setMediaFiles,
        showMedia, setLoadedMedia, setShowMedia, loading, hasMore, uploadProgress,
        loadedMedia, replyToMessage, forwardMessage, blinkMessageId, setBlinkMessageId,
        mediaViewerOpen, setMediaViewerOpen, mediaViewerItems, mediaViewerIndex,
        mediaViewerMessage, groupMessagesByDate, currentPage, forwardAnchorEl,
        handleCloseForward, loadOlderMessages, parseTemplateData, getMediaSrcForMessage,
        getMediaKey, markLoaded, handleAttachClick, handleFileChange, handleMediaClick,
        handleClosePreview, handleSendMessage, handleReply, handleCancelReply,
        handleForward, handleSendForward, scrollToMessage, searchMessages,
        getMessageStatusIcon, processFiles, refresh, addUniqueMessage,
        handleEditMessage, handleDeleteMessage, searchResults, isSearching,
    } = useConversation(selectedCustomer, onConversationRead, onViewConversationRead, drawerOpen);

    // keep stable ref for reactions
    const messagesRef = useRef(null);
    useEffect(() => { messagesRef.current = messages; }, [messages]);

    // ── reactions ────────────────────────────────────────────────────────────
    const { handleMessageEmojiClick, handleRemoveReactionAction } = useReactions({
        auth, selectedCustomer, messagesRef, setMessages,
    });

    // ── group actions + socket ───────────────────────────────────────────────
    const {
        isCurrentUserAdmin, isAddMemberDialogOpen, setIsAddMemberDialogOpen,
        handleAddMembersSubmit, isRemovedFromCurrentGroup, isOnlyAdminSend,
    } = useGroupActions({ selectedCustomer, auth, refresh, addUniqueMessage });

    // ── favorites ────────────────────────────────────────────────────────────
    const { favoriteState, updateFavoriteStatus } = useFavorite();
    const isFavorite = favoriteState[selectedCustomer?.ConversationId]?.isStar
        ?? (selectedCustomer?.IsStar === 1);

    const handleToggleFavorite = useCallback(async () => {
        const newIsStar = isFavorite ? 0 : 1;
        updateFavoriteStatus(selectedCustomer?.ConversationId, newIsStar);
        try {
            const response = await updateConversationApi(auth, {
                page: 1, pageSize: 50,
                conversationId: selectedCustomer?.ConversationId,
                isPin: selectedCustomer?.IsPin || 0,
                isStar: newIsStar,
                isArchived: selectedCustomer?.IsArchived || 0,
            });
            if (response?.Status === '200' || response?.success === true) {
                toast.success(newIsStar ? 'Added to favorites' : 'Removed from favorites');
                if (selectedCustomer) selectedCustomer.IsStar = newIsStar;
                if (refresh) refresh();
            } else {
                updateFavoriteStatus(selectedCustomer?.ConversationId, isFavorite ? 1 : 0);
                toast.error('Failed to update favorite status');
            }
        } catch {
            updateFavoriteStatus(selectedCustomer?.ConversationId, isFavorite ? 1 : 0);
            toast.error('Error updating favorite status');
        }
    }, [selectedCustomer, auth, isFavorite, updateFavoriteStatus, refresh]);

    // ── confirmation modals ──────────────────────────────────────────────────
    const {
        confirmationModal, open: openConfirmModal, close: closeConfirmModal,
        openDeleteMessage, checkAdminStatusAndShowConfirmation,
        onConfirm, getDeleteMessageActions,
    } = useConfirmModal({
        selectedCustomer, auth, onCustomerSelect, refresh, handleDeleteMessage,
    });

    // ── header menu ──────────────────────────────────────────────────────────
    const {
        headerMenuAnchorEl, setHeaderMenuAnchorEl, closeMenu: closeHeaderMenu,
        handleMenuAction, menuItems: headerMenuItems,
    } = useHeaderMenu({
        selectedCustomer, isFavorite, isRemovedFromCurrentGroup, onCustomerSelect,
        handleToggleFavorite, checkAdminStatusAndShowConfirmation,
        openConfirmModal,
    });

    // patch groupInfo action so it controls local drawer state
    const handleMenuActionWithDrawer = useCallback(async (action) => {
        if (action === 'groupInfo') {
            setDrawerViewState('info');
            setDrawerOpen(true);
            closeHeaderMenu();
        } else {
            await handleMenuAction(action);
        }
    }, [handleMenuAction, closeHeaderMenu]);

    // ── scroll helpers ───────────────────────────────────────────────────────
    const scrollToBottom = useCallback((behavior = 'auto') => {
        if (!containerRef.current) return;
        isAutoScrollingRef.current = true;
        const normalized = behavior === 'instant' ? 'auto' : behavior;
        containerRef.current.scrollTo({ top: containerRef.current.scrollHeight, behavior: normalized });
        setShowScrollToBottom(false);
        setTimeout(() => { isAutoScrollingRef.current = false; }, 100);
    }, []);

    const captureMessageScrollState = useCallback(() => {
        const el = containerRef.current;
        if (!el) return;
        mediaPreviewScrollStateRef.current = {
            scrollTop: el.scrollTop,
            bottomGap: el.scrollHeight - el.clientHeight - el.scrollTop,
        };
    }, []);

    // Restore scroll position when media preview closes
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
            requestAnimationFrame(() => requestAnimationFrame(() => {
                const el = containerRef.current;
                if (!el || !state) return;
                el.scrollTop = typeof state.bottomGap === 'number'
                    ? Math.max(0, el.scrollHeight - el.clientHeight - state.bottomGap)
                    : Math.max(0, Math.min(el.scrollHeight - el.clientHeight, state.scrollTop ?? 0));
            }));
        }
        prevMediaFilesLenRef.current = mediaFilesLength;
    }, [mediaFilesLength]);

    // Auto-scroll near bottom after media loads
    useEffect(() => {
        if (!containerRef.current || loading || isSwitchingConversation) return;
        const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
        if (scrollHeight - clientHeight - scrollTop < 300) {
            const t = setTimeout(() => scrollToBottom('auto'), 50);
            return () => clearTimeout(t);
        }
    }, [loadedMedia, loading, isSwitchingConversation, scrollToBottom]);

    // Scroll to bottom on conversation switch
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
                const scroll = () => { if (containerRef.current) containerRef.current.scrollTop = containerRef.current.scrollHeight; };
                scroll();
                const t1 = setTimeout(scroll, 0);
                const t2 = setTimeout(scroll, 50);
                if (messageList.length > 0) {
                    const last = messageList[messageList.length - 1];
                    lastMessageIdRef.current = last?.Id || last?.MessageId || last?.id;
                }
                const t3 = setTimeout(() => setIsSwitchingConversation(false), 150);
                return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
            }
        }
    }, [selectedCustomer?.ConversationId, loading, messages, isSwitchingConversation]);

    // Smooth scroll on new messages
    useEffect(() => {
        if (currentPage > 1) return;
        const messageList = Array.isArray(messages?.data) ? messages.data : [];
        if (!messageList.length) return;
        const last = messageList[messageList.length - 1];
        const lastId = last?.Id || last?.MessageId || last?.id;
        if (selectedCustomer?.ConversationId === lastConversationIdRef.current && lastId !== lastMessageIdRef.current) {
            scrollToBottom('smooth');
            lastMessageIdRef.current = lastId;
        }
    }, [messages, currentPage, scrollToBottom, selectedCustomer?.ConversationId]);

    const handleScroll = useCallback(() => {
        if (!containerRef.current) return;
        const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
        const scrollBottom = scrollHeight - clientHeight - scrollTop;
        if (!isAutoScrollingRef.current) setShowScrollToBottom(scrollBottom > 300);
        if (hasMore && !isAutoScrollingRef.current) {
            const threshold = Math.max(50, Math.floor(clientHeight * 0.2));
            if (scrollTop <= threshold) {
                const now = Date.now();
                if (now - lastScrollTriggerRef.current < 1000) return;
                clearTimeout(scrollTimeoutRef.current);
                scrollTimeoutRef.current = setTimeout(() => {
                    lastScrollTriggerRef.current = now;
                    loadOlderMessages(containerRef);
                }, 150);
            }
        }
    }, [hasMore, loadOlderMessages]);

    useEffect(() => {
        const container = containerRef.current;
        if (!container || !selectedCustomer?.ConversationId) { scrollListenerAttachedRef.current = false; return; }
        scrollListenerAttachedRef.current = false;
        const id = setTimeout(() => {
            const el = containerRef.current;
            if (el && el.scrollHeight > el.clientHeight && !scrollListenerAttachedRef.current) {
                el.addEventListener('scroll', handleScroll, { passive: true });
                scrollListenerAttachedRef.current = true;
            }
        }, 1200);
        return () => {
            clearTimeout(id);
            const el = containerRef.current;
            if (el && scrollListenerAttachedRef.current) el.removeEventListener('scroll', handleScroll);
            scrollListenerAttachedRef.current = false;
            clearTimeout(scrollTimeoutRef.current);
        };
    }, [handleScroll, selectedCustomer?.ConversationId]);

    // ── stable callbacks ─────────────────────────────────────────────────────
    const getMessageStatusIconCallback = useCallback(msg => getMessageStatusIcon(msg), [getMessageStatusIcon]);
    const getMediaKeyCallback = useCallback((msg, i) => getMediaKey(msg, i), [getMediaKey]);
    const markLoadedCallback = useCallback(key => markLoaded(key), [markLoaded]);
    const handleMenuClick = useCallback((e) => e.stopPropagation(), []);

    const handleContextMenu = useCallback((event, message) => {
        event.preventDefault();
        setMessageContextMenu(prev =>
            prev === null ? { mouseX: event.clientX - 2, mouseY: event.clientY - 4, message } : null
        );
    }, []);

    const handleEditAction = useCallback((message) => {
        setSelectedMessageForEdit(message);
        setEditDialogOpen(true);
        setMessageContextMenu(null);
    }, []);

    const handleDeleteAction = useCallback((message) => {
        openDeleteMessage(message);
        setMessageContextMenu(null);
    }, [openDeleteMessage]);

    const handleMessageInfo = useCallback((message) => {
        setSelectedMessageForInfo(message);
        setDrawerViewState('messageInfo');
        setDrawerOpen(true);
    }, []);

    const handleMemberRedirect = useCallback((member) => {
        if (!member) return;
        if (member.ConversationId) {
            window.dispatchEvent(new CustomEvent('SELECT_CONVERSATION', { detail: { conversationId: member.ConversationId } }));
        } else {
            window.dispatchEvent(new CustomEvent('SELECT_NEW_CONVERSATION', {
                detail: { customer: { ...member, UserId: member.UserId, name: member.Name || member.MemberName, ProfileImageUrl: member.ProfileImageUrl || member.ProfileImage, IsGroup: 0 } },
            }));
        }
    }, []);

    const toggleEmojiPicker = useCallback(() => setShowPicker(p => !p), []);
    useEffect(() => {
        if (!showPicker) return;
        const handler = (e) => {
            if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target) && !e.target.closest('.attach-button')) {
                setShowPicker(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [showPicker]);

    const openFilePicker = useCallback((e, acceptType) => {
        e.preventDefault(); e.stopPropagation();
        if (fileInputRef?.current) {
            fileInputRef.current.accept = acceptType;
            fileInputRef.current.value = '';
            fileInputRef.current.oninput = (ev) => {
                if (ev.target.files.length > 0) { captureMessageScrollState(); handleFileChange(ev, toast); }
            };
            fileInputRef.current.click();
        }
    }, [handleFileChange, captureMessageScrollState]);

    const handleKeyPress = useCallback((e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (inputValue.trim() || mediaFiles?.length > 0) {
                handleSendMessage(containerRef, scrollToBottom, inputValue);
                setInputValue('');
            }
        }
    }, [inputValue, mediaFiles, handleSendMessage, scrollToBottom, setInputValue]);

    const handleSendMessageCallback = useCallback(
        (override) => handleSendMessage(containerRef, scrollToBottom, override),
        [handleSendMessage, scrollToBottom]
    );

    // ── early returns ────────────────────────────────────────────────────────
    if (!isOnline) return <div className="conversation-container"><OfflineOverlay /></div>;

    if (!selectedCustomer) {
        return (
            <div className="conversation-container empty-state">
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#6b7280' }}>
                    <Typography variant="h6" sx={{ mb: 2 }}>Select a conversation</Typography>
                    <Typography variant="body2">Choose a customer from the list to start chatting</Typography>
                </Box>
            </div>
        );
    }

    const displayEmail = String(selectedCustomer?.DisplayEmail ?? '').trim();
    const confirmProps = getConfirmProps(confirmationModal.actionType);

    // ── render ────────────────────────────────────────────────────────────────
    return (
        <Box className="conversation-container">
            {mediaViewerOpen && (
                <MediaViewer
                    mediaItems={mediaViewerItems}
                    initialIndex={mediaViewerIndex}
                    selectedCustomer={selectedCustomer}
                    message={mediaViewerMessage}
                    onClose={() => setMediaViewerOpen(false)}
                    onReply={(attachmentId) => { handleReply(mediaViewerMessage, attachmentId); setMediaViewerOpen(false); }}
                    onForward={(event, attachmentId) => { setIsForwardFromViewer(true); handleForward(mediaViewerMessage, event, attachmentId); setMediaViewerOpen(false); }}
                />
            )}

            <div className="conversation-layout">
                <div className="conversation-main">
                    {!showFullDetails && (
                        <div className="conversation-header">
                            <div className="header-left">
                                <div style={{ width: 40, height: 40, marginRight: 10, cursor: 'pointer' }} onClick={handleOpenInfo}>
                                    <ConversationAvatar member={selectedCustomer} size={40} />
                                </div>
                                <div className="customer-info">
                                    <Typography variant="subtitle1" className="customer-name" onClick={handleOpenInfo} style={{ cursor: 'pointer' }}>
                                        {getCustomerDisplayName(selectedCustomer)}
                                    </Typography>
                                    {typingStatus ? (
                                        <Typography variant="body2" className="typing-indicator">
                                            {selectedCustomer?.IsGroup === 1 ? `${typingStatus.UserName} is typing...` : 'typing...'}
                                        </Typography>
                                    ) : (
                                        selectedCustomer?.IsGroup === 1
                                            ? selectedCustomer?.GroupDesc ? <Typography variant="body2" className="customer-email">{selectedCustomer.GroupDesc}</Typography> : null
                                            : displayEmail ? <Typography variant="body2" className="customer-email">{displayEmail}</Typography> : null
                                    )}
                                </div>
                            </div>
                            <div className="header-right">
                                <Tooltip title="Refresh">
                                    <IconButton onClick={refresh} size="small" disabled={loading} sx={{ color: '#6b7280', '&:hover': { color: '#374151', backgroundColor: 'rgba(0,0,0,0.04)' } }}>
                                        <RefreshIcon fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                                <Tooltip title="Search messages">
                                    <IconButton onClick={handleOpenSearch} size="small" sx={{ color: '#6b7280', '&:hover': { color: '#374151', backgroundColor: 'rgba(0,0,0,0.04)' } }}>
                                        <Search size={20} />
                                    </IconButton>
                                </Tooltip>
                                <Tooltip title="More options">
                                    <IconButton size="small" onClick={(e) => setHeaderMenuAnchorEl(e.currentTarget)} sx={{ color: '#6b7280', '&:hover': { color: '#374151', backgroundColor: 'rgba(0,0,0,0.04)' } }}>
                                        <EllipsisVertical size={20} />
                                    </IconButton>
                                </Tooltip>
                            </div>
                        </div>
                    )}

                    {showFullDetails ? (
                        <div className="conversation-details-full">
                            <CustomerDetails
                                customer={selectedCustomer} onClose={() => setDrawerOpen(false)}
                                open={drawerOpen} variant="panel" initialViewState={drawerViewState}
                                messageInfo={selectedMessageForInfo} messages={messages} scrollToMessage={scrollToMessage}
                            />
                        </div>
                    ) : (
                        <>
                            <MessageArea
                                auth={auth} showMedia={showMedia} setShowMedia={setShowMedia}
                                loading={loading} mediaFiles={mediaFiles} setMediaFiles={setMediaFiles}
                                handleClosePreview={handleClosePreview} containerRef={containerRef}
                                showScrollToBottom={showScrollToBottom} scrollToBottomRightOffset={scrollToBottomRightOffset}
                                setContextMenu={setContextMenu} selectedCustomer={selectedCustomer}
                                scrollToBottom={scrollToBottom} groupMessagesByDate={groupMessagesByDate}
                                formatDateHeader={formatDateHeader} getMessageStatusIcon={getMessageStatusIconCallback}
                                parseTemplateData={parseTemplateData} getMediaSrcForMessage={getMediaSrcForMessage}
                                handleMediaClick={handleMediaClick} handleMessageEmojiClick={handleMessageEmojiClick}
                                handleMenuClick={handleMenuClick} handleContextMenu={handleContextMenu}
                                scrollToMessage={scrollToMessage} handleReply={handleReply}
                                handleForward={handleForward} blinkMessageId={blinkMessageId}
                                setBlinkMessageId={setBlinkMessageId} loadedMedia={loadedMedia}
                                setLoadedMedia={setLoadedMedia} getMediaKey={getMediaKeyCallback}
                                markLoaded={markLoadedCallback} uploadProgress={uploadProgress}
                                handleRemoveReaction={handleRemoveReactionAction} replyToMessage={replyToMessage}
                                isSwitchingConversation={isSwitchingConversation} processFiles={processFiles}
                                captureMessageScrollState={captureMessageScrollState} typingStatus={typingStatus}
                            />
                            <ChatBox
                                replyToMessage={replyToMessage} handleCancelReply={handleCancelReply}
                                handleAttachClick={handleAttachClick} toggleEmojiPicker={toggleEmojiPicker}
                                showPicker={showPicker} emojiPickerRef={emojiPickerRef}
                                showMedia={showMedia} fileInputRef={fileInputRef}
                                openFilePicker={openFilePicker} imageParams={FILE_PARAMS.image}
                                videoParams={FILE_PARAMS.video} docsParams={FILE_PARAMS.docs}
                                handleFileChange={handleFileChange} inputValue={inputValue}
                                setInputValue={setInputValue} handleKeyPress={handleKeyPress}
                                handleSendMessage={handleSendMessageCallback} mediaFiles={mediaFiles}
                                isRemovedFromGroup={isRemovedFromCurrentGroup} isOnlyAdminSend={isOnlyAdminSend}
                                isCurrentUserAdmin={isCurrentUserAdmin} selectedCustomer={selectedCustomer}
                            />
                        </>
                    )}
                </div>

                {drawerOpen && (
                    isNarrowScreen ? (
                        <CustomerDetails
                            customer={selectedCustomer} onClose={() => setDrawerOpen(false)}
                            open={drawerOpen} variant="drawer" initialViewState={drawerViewState}
                            messageInfo={selectedMessageForInfo} messages={messages} scrollToMessage={scrollToMessage}
                            searchResults={searchResults} isSearching={isSearching}
                            onSearchMessages={searchMessages} containerRef={containerRef}
                        />
                    ) : !isTopPanelScreen ? (
                        <div className="conversation-right-panel">
                            <CustomerDetails
                                customer={selectedCustomer} onClose={() => setDrawerOpen(false)}
                                open={drawerOpen} variant="panel" initialViewState={drawerViewState}
                                messageInfo={selectedMessageForInfo} messages={messages} scrollToMessage={scrollToMessage}
                                searchResults={searchResults} isSearching={isSearching}
                                onSearchMessages={searchMessages} containerRef={containerRef}
                            />
                        </div>
                    ) : null
                )}
            </div>

            {/* ── overlays & menus ── */}
            <ViewContext
                contextMenu={contextMenu} handleCloseMenu={() => setContextMenu(null)}
                handleMenuAction={handleMenuActionWithDrawer} setContextMenu={setContextMenu}
                selectedCustomer={selectedCustomer}
            />

            <MessageContextMenu
                anchorEl={messageContextMenu?.anchorEl}
                open={!!messageContextMenu}
                onClose={() => setMessageContextMenu(null)}
                onReply={handleReply} onForward={handleForward}
                onMessageInfo={handleMessageInfo} onMemberRedirect={handleMemberRedirect}
                onEdit={handleEditAction} onDelete={handleDeleteAction}
                message={messageContextMenu?.message}
                mouseX={messageContextMenu?.mouseX} mouseY={messageContextMenu?.mouseY}
            />

            <ForwardMessage
                message={forwardMessage}
                open={!!forwardAnchorEl && !!forwardMessage}
                anchorEl={forwardAnchorEl}
                isCentered={isForwardFromViewer}
                onClose={() => { setIsForwardFromViewer(false); handleCloseForward(); }}
                onSend={handleSendForward}
            />

            <WhatsAppMenu
                anchorEl={headerMenuAnchorEl}
                open={Boolean(headerMenuAnchorEl)}
                onClose={() => setHeaderMenuAnchorEl(null)}
                onAction={handleMenuActionWithDrawer}
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
                onConfirm={onConfirm}
                actions={confirmationModal.actionType === 'deleteMessage' ? getDeleteMessageActions() : []}
                title={confirmProps.title}
                description={confirmProps.description}
                confirmText={confirmProps.confirmText}
                variant={confirmProps.variant}
                showCancel={confirmProps.showCancel}
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
