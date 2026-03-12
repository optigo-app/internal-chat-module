import React, { useState, useRef, useEffect, useCallback, useContext, useLayoutEffect } from 'react';
import { Box, Typography, Avatar, useMediaQuery, IconButton, Tooltip } from '@mui/material';
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
import RefreshIcon from '@mui/icons-material/Refresh';
import { addReactionApi } from '../../API/SendMessage/addReactionApi';
import { removeReactionApi } from '../../API/SendMessage/removeReactionApi';
import { emitSendReaction } from '../../socket';
import useOnlineStatus from '../../utils/internetCheck';
import OfflineOverlay from './OfflineOverlay';
import AddMemberDialog from '../ReusableComponent/AddMemberDialog';
import ConfirmationDialog from '../ReusableComponent/ConfirmationDialog';
import WhatsAppMenu from '../ReusableComponent/WhatsAppMenu';
import { addGroupParticipantApi } from '../../API/Groups/AddGroupParticipantApi';
import { removeMemberApi } from '../../API/Groups/RemoveMemberApi';
import { fetchGroupDetails } from '../../API/Groups/FetchGroupDetails';
import { updateConversationApi } from '../../API/SendMessage/updateConversationApi';
import { useFavorite } from '../../contexts/FavoriteContext';
import { useRemoveInGroup } from '../../contexts/RemoveInGroupContext';
import {
    EllipsisVertical,
    Info,
    CheckSquare,
    BellOff,
    Heart,
    X,
    Trash2,
    LogOut
} from 'lucide-react';

const Conversation = ({ selectedCustomer, onConversationRead, onViewConversationRead, onCustomerSelect }) => {
    const isOnline = useOnlineStatus();

    const [drawerOpen, setDrawerOpen] = useState(false);
    const [contextMenu, setContextMenu] = useState(null);
    const [headerMenuAnchorEl, setHeaderMenuAnchorEl] = useState(null);
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
    const [isForwardFromViewer, setIsForwardFromViewer] = useState(false);
    const emojiPickerRef = useRef(null);
    const [showScrollToBottom, setShowScrollToBottom] = useState(false);
    const { auth } = useContext(LoginContext);
    const [isSwitchingConversation, setIsSwitchingConversation] = useState(false);
    const reactionRequestStateRef = useRef(new Map());
    const [isAddMemberDialogOpen, setIsAddMemberDialogOpen] = useState(false);
    const [confirmationModal, setConfirmationModal] = useState({
        isOpen: false,
        actionType: null // 'exitGroup' | 'adminCannotLeave'
    });
    const messagesRef = useRef(null);

    // Use Context for global favorite state management
    const { favoriteState, updateFavoriteStatus } = useFavorite();
    
    // Use Context for RemoveInGroup state management
    const { updateRemoveInGroupStatus, isRemovedFromGroup } = useRemoveInGroup();

    // Get favorite status from Context state or fallback to selectedCustomer prop
    const isFavorite = favoriteState[selectedCustomer?.ConversationId]?.isStar ?? (selectedCustomer?.IsStar === 1);
    
    // Get removed from group status from Context state or fallback to selectedCustomer prop
    const isRemovedFromCurrentGroup = isRemovedFromGroup(selectedCustomer?.ConversationId) || (selectedCustomer?.RemoveInGroup === 1);

    // Update RemoveInGroup context when selectedCustomer data changes
    useEffect(() => {
        if (selectedCustomer?.ConversationId && selectedCustomer?.RemoveInGroup !== undefined) {
            updateRemoveInGroupStatus(selectedCustomer.ConversationId, selectedCustomer.RemoveInGroup === 1);
        }
    }, [selectedCustomer?.ConversationId, selectedCustomer?.RemoveInGroup, updateRemoveInGroupStatus]);

    const isNarrowScreen = useMediaQuery('(max-width: 992px)');
    const isTopPanelScreen = useMediaQuery('(max-width: 1620px)');
    const isCompactDockedPanel = useMediaQuery('(max-width: 1200px)');
    const isDetailsPanelDocked = drawerOpen === true && !isNarrowScreen;
    const dockedPanelWidth = isCompactDockedPanel ? 400 : 450;
    const scrollToBottomRightOffset = isDetailsPanelDocked ? dockedPanelWidth + 30 : 30;
    const showFullDetails = drawerOpen === true && !isNarrowScreen && isTopPanelScreen;

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
        mediaViewerMessage,
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
        processFiles,
        refresh,
    } = useConversation(selectedCustomer, onConversationRead, onViewConversationRead);

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
                // Optionally refresh if there's a way to notify the child components or local state
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

    const docsParams = ".pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx,.csv";
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

    const handleMessageEmojiClick = useCallback(async (emojiObject, message) => {
        try {
            const emoji = emojiObject?.emoji || emojiObject;
            const unified = emojiObject?.unified;

            const messageIdToUse = message?.MessageId ?? message?.Id;
            if (!messageIdToUse) {
                toast.error("Failed to send reaction: Message ID missing");
                return;
            }

            const key = String(messageIdToUse);
            const now = Date.now();
            const prevState = reactionRequestStateRef.current.get(key) || { inFlight: false, lastSentAt: 0, lastEmoji: null };
            if (prevState.inFlight) return;
            if (now - (prevState.lastSentAt || 0) < 700) return;

            prevState.inFlight = true;
            prevState.lastSentAt = now;
            prevState.lastEmoji = emoji;
            reactionRequestStateRef.current.set(key, prevState);

            const processOnce = async ({ emoji: nextEmoji, unified: nextUnified }) => {
                const snapshot = messagesRef.current;
                const list = Array.isArray(snapshot) ? snapshot : (snapshot?.data || []);
                const latestMsg = list.find(
                    (m) => String(m?.MessageId ?? m?.Id) === String(messageIdToUse)
                ) || message;

                let currentReactions = [];
                if (latestMsg?.ReactionEmojis) {
                    if (typeof latestMsg.ReactionEmojis === "string") {
                        try {
                            currentReactions = JSON.parse(latestMsg.ReactionEmojis);
                        } catch (e) {
                            currentReactions = latestMsg.ReactionEmojis.split(",").map(r => ({
                                Reaction: r,
                                Direction: 1
                            }));
                        }
                    } else if (Array.isArray(latestMsg.ReactionEmojis)) {
                        currentReactions = latestMsg.ReactionEmojis;
                    }
                }

                const existingIndex = currentReactions.findIndex(
                    r => r.Direction === 1 && r.Reaction === nextEmoji
                );

                let updatedReactions;
                let reactionPayload;
                let apiEmoji;

                if (existingIndex >= 0) {
                    currentReactions.splice(existingIndex, 1);
                    updatedReactions = currentReactions;
                    reactionPayload = "";
                    apiEmoji = "";
                } else {
                    const filtered = currentReactions.filter(r => r.Direction !== 1);
                    const newReaction = {
                        Reaction: nextEmoji,
                        Unified: nextUnified,
                        Direction: 1,
                        UserName: auth?.username || auth?.UserName || auth?.name,
                        UserId: auth?.id || auth?.userId
                    };
                    updatedReactions = [...filtered, newReaction];
                    reactionPayload = JSON.stringify(updatedReactions);
                    apiEmoji = nextEmoji;
                }

                await addReactionApi(auth, { messageId: messageIdToUse, emoji: apiEmoji });

                const receiverId = selectedCustomer?.ReceiverId;
                const senderId = auth?.id ?? auth?.userId;
                if (receiverId && senderId && auth?.ufcc) {
                    const socketReactionEmojis = reactionPayload === ""
                        ? JSON.stringify([{ Reaction: "", Direction: 0 }])
                        : JSON.stringify([{ Reaction: nextEmoji, Unified: nextUnified, Direction: 0 }]);

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
                        if (String(msg?.MessageId ?? msg?.Id) === String(messageIdToUse)) {
                            return {
                                ...msg,
                                ReactionEmojis: reactionPayload,
                                _isFromCurrentUser: true
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
            };

            await processOnce({ emoji, unified });

            const finalState = reactionRequestStateRef.current.get(key);
            if (finalState) {
                finalState.inFlight = false;
                reactionRequestStateRef.current.set(key, finalState);
            }
        } catch (error) {
            console.error("Error sending reaction:", error);
            toast.error("Failed to send reaction");
            const messageIdToUse = message?.MessageId ?? message?.Id;
            if (messageIdToUse != null) {
                const key = String(messageIdToUse);
                const state = reactionRequestStateRef.current.get(key);
                if (state) {
                    state.inFlight = false;
                    reactionRequestStateRef.current.set(key, state);
                }
            }
        }
    }, [auth, selectedCustomer]);

    const handleRemoveReactionAction = useCallback(async (reaction, message) => {
        try {
            const messageIdToUse = message?.MessageId ?? message?.Id;
            if (!messageIdToUse || !auth) return;

            const response = await removeReactionApi(auth, { messageId: messageIdToUse });
            if (response) {
                setMessages(prev => {
                    const prevData = Array.isArray(prev) ? prev : prev?.data || [];
                    const updatedData = prevData.map(m => {
                        if (String(m?.MessageId ?? m?.Id) === String(messageIdToUse)) {
                            let currentReactions = [];
                            try {
                                currentReactions = JSON.parse(m.ReactionEmojis || "[]");
                            } catch (e) {
                                currentReactions = [];
                            }

                            const newReactions = currentReactions.filter(r =>
                                !(String(r.UserId) === String(auth?.id ?? auth?.userId) && (r.Emoji === (reaction.Emoji || reaction.Reaction) || r.Reaction === (reaction.Emoji || reaction.Reaction)))
                            );

                            return {
                                ...m,
                                ReactionEmojis: JSON.stringify(newReactions),
                                ReactionCount: Math.max(0, (m.ReactionCount || 0) - 1)
                            };
                        }
                        return m;
                    });
                    return Array.isArray(prev) ? updatedData : { ...prev, data: updatedData };
                });
                toast.success("Reaction removed!");
            }
        } catch (error) {
            console.error("Error removing reaction:", error);
            toast.error("Failed to remove reaction");
        }
    }, [auth]);

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
            // Need a slight delay to ensure DOM dimensions are updated after image/video render
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
                // A few micro-tasks later to ensure all components have rendered
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

    const handleToggleFavorite = useCallback(async () => {
        const newIsStar = isFavorite ? 0 : 1;

        // Optimistically update Context state
        updateFavoriteStatus(selectedCustomer?.ConversationId, newIsStar);

        try {
            const response = await updateConversationApi(auth, {
                page: 1,
                pageSize: 50,
                conversationId: selectedCustomer?.ConversationId,
                isPin: selectedCustomer?.IsPin || 0,
                isStar: newIsStar,
                isArchived: selectedCustomer?.IsArchived || 0,
            });
            if (response?.Status === "200" || response?.success === true) {
                toast.success(newIsStar ? "Added to favorites" : "Removed from favorites");
                if (selectedCustomer) {
                    selectedCustomer.IsStar = newIsStar;
                }
                if (refresh) refresh();
            } else {
                // Revert on failure
                updateFavoriteStatus(selectedCustomer?.ConversationId, isFavorite ? 1 : 0);
                toast.error("Failed to update favorite status");
            }
        } catch (error) {
            // Revert on error
            updateFavoriteStatus(selectedCustomer?.ConversationId, isFavorite ? 1 : 0);
            toast.error("Error updating favorite status");
        }
    }, [selectedCustomer, auth, isFavorite, updateFavoriteStatus, refresh]);

    const checkAdminStatusAndShowConfirmation = useCallback(async () => {
        try {
            const groupData = await fetchGroupDetails(selectedCustomer.ConversationId, auth);

            if (groupData && groupData.members) {
                const currentUserId = auth?.id || auth?.userId;
                const currentUser = groupData.members.find(m => m.UserId === currentUserId);
                const isCurrentUserAdmin = currentUser?.IsGroupAdmin === 1;
                const adminCount = groupData.members.filter(m => m.IsGroupAdmin === 1).length;

                if (isCurrentUserAdmin && adminCount === 1) {
                    setConfirmationModal({
                        isOpen: true,
                        actionType: 'adminCannotLeave'
                    });
                } else {
                    setConfirmationModal({
                        isOpen: true,
                        actionType: 'exitGroup'
                    });
                }
            } else {
                setConfirmationModal({
                    isOpen: true,
                    actionType: 'exitGroup'
                });
            }
        } catch (error) {
            console.error('Error checking admin status:', error);
            setConfirmationModal({
                isOpen: true,
                actionType: 'exitGroup'
            });
        }
    }, [selectedCustomer, auth]);

    const handleMenuAction = useCallback(async (action) => {
        setHeaderMenuAnchorEl(null);
        if (action === 'groupInfo') {
            setDrawerOpen(true);
        } else if (action === 'close') {
            onCustomerSelect(null);
        } else if (action === 'mute') {
            toast('Mute notifications — coming soon!');
        } else if (action === 'favourite') {
            await handleToggleFavorite();
        } else if (action === 'selectMessage') {
            toast('Select message — coming soon!');
        } else if (action === 'clearChat') {
            toast('Clear chat — coming soon!');
        } else if (action === 'exitGroup') {
            await checkAdminStatusAndShowConfirmation();
        } else if (action === 'deleteGroup') {
            // Show confirmation for deleting group conversation
            setConfirmationModal({ 
                isOpen: true, 
                actionType: 'deleteGroup' 
            });
        }
    }, [onCustomerSelect, handleToggleFavorite, checkAdminStatusAndShowConfirmation]);

    const handleConfirmExitGroup = useCallback(async () => {
        try {
            const currentUserId = auth?.id || auth?.userId;
            const response = await removeMemberApi(auth, {
                conversationId: selectedCustomer.ConversationId,
                memberId: currentUserId
            });

            if (response?.Status === "200") {
                toast.success('You have left the group');
                setConfirmationModal({ isOpen: false, actionType: null });
                onCustomerSelect(null);
                refresh();
            } else {
                setConfirmationModal({ isOpen: false, actionType: null });
                toast.error(response?.Message || 'Failed to exit group');
            }
        } catch (error) {
            console.error('Error exiting group:', error);
            setConfirmationModal({ isOpen: false, actionType: null });
            toast.error('Error exiting group');
        }
    }, [selectedCustomer, auth, onCustomerSelect, refresh]);

    const handleConfirmDeleteGroup = useCallback(async () => {
        try {
            // For now, just close the conversation and show success message
            // In the future, this could call a delete conversation API
            toast.success('Group conversation deleted');
            setConfirmationModal({ isOpen: false, actionType: null });
            onCustomerSelect(null);
            refresh();
        } catch (error) {
            console.error('Error deleting group conversation:', error);
            setConfirmationModal({ isOpen: false, actionType: null });
            toast.error('Error deleting group conversation');
        }
    }, [onCustomerSelect, refresh]);

    const headerMenuItems = [
        { label: 'Group Info', action: 'groupInfo', icon: <Info size={16} /> },
        { label: 'Select message', action: 'selectMessage', icon: <CheckSquare size={16} /> },
        { label: 'Mute notification', action: 'mute', icon: <BellOff size={16} /> },
        { label: isFavorite ? 'Remove from favourite' : 'Add to favourite', action: 'favourite', icon: <Heart size={16} fill={isFavorite ? 'currentColor' : 'none'} /> },
        { label: 'Close chat', action: 'close', icon: <X size={16} /> },
        { divider: true },
        { label: 'Clear chat', action: 'clearChat', icon: <Trash2 size={16} />, danger: true },
        ...(selectedCustomer?.IsGroup === 1
            ? [{ 
                label: isRemovedFromCurrentGroup ? 'Delete group' : 'Exit group', 
                action: isRemovedFromCurrentGroup ? 'deleteGroup' : 'exitGroup', 
                icon: <LogOut size={16} />, 
                danger: true 
            }]
            : []),
    ];

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

    const [messageContextMenu, setMessageContextMenu] = useState(null);

    const handleContextMenu = useCallback((event, message) => {
        event.preventDefault();
        setMessageContextMenu(
            messageContextMenu === null
                ? { mouseX: event.clientX - 2, mouseY: event.clientY - 4, message }
                : null
        );
    }, [messageContextMenu]);

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
    }, [handleSendMessage, scrollToBottom]);

    const handleFileChangeCallback = useCallback((e) => {
        handleFileChange(e, toast);
    }, [handleFileChange]);

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

    const displayEmail = String(selectedCustomer?.DisplayEmail ?? '').trim();

    return (
        <Box className="conversation-container">
            {/* Media Viewer */}
            {mediaViewerOpen && (
                <MediaViewer
                    mediaItems={mediaViewerItems}
                    initialIndex={mediaViewerIndex}
                    selectedCustomer={selectedCustomer}
                    message={mediaViewerMessage}
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
                                    <Typography variant="subtitle1" className="customer-name" onClick={() => setDrawerOpen(true)} style={{ cursor: 'pointer' }}>
                                        {getCustomerDisplayName(selectedCustomer)}
                                    </Typography>
                                    {selectedCustomer?.IsGroup === 1 ? (
                                        selectedCustomer?.GroupDesc ? (
                                            <Typography variant="body2" className="customer-email">
                                                {selectedCustomer.GroupDesc}
                                            </Typography>
                                        ) : null
                                    ) : (
                                        displayEmail ? (
                                            <Typography variant="body2" className="customer-email">
                                                {displayEmail}
                                            </Typography>
                                        ) : null
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
                                <Tooltip title="More options">
                                    <IconButton
                                        size="small"
                                        onClick={(e) => setHeaderMenuAnchorEl(e.currentTarget)}
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
                                customer={selectedCustomer}
                                onClose={() => setDrawerOpen(false)}
                                open={drawerOpen}
                                variant="panel"
                            />
                        </div>
                    ) : (
                        <>
                            <MessageArea
                                auth={auth}
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
                                handleRemoveReaction={handleRemoveReactionAction}
                                replyToMessage={replyToMessage}
                                isSwitchingConversation={isSwitchingConversation}
                                processFiles={processFiles}
                                captureMessageScrollState={captureMessageScrollState}
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
                                handleFileChange={handleFileChange}
                                inputValue={inputValue}
                                setInputValue={setInputValue}
                                handleKeyPress={handleKeyPress}
                                handleSendMessage={handleSendMessageCallback}
                                mediaFiles={mediaFiles}
                                isRemovedFromGroup={isRemovedFromCurrentGroup}
                                selectedCustomer={selectedCustomer}
                            />
                        </>
                    )}
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
                        !isTopPanelScreen ? (
                            <div className="conversation-right-panel">
                                <CustomerDetails
                                    customer={selectedCustomer}
                                    onClose={() => setDrawerOpen(false)}
                                    open={drawerOpen}
                                    variant="panel"
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
                message={messageContextMenu?.message}
                mouseX={messageContextMenu?.mouseX}
                mouseY={messageContextMenu?.mouseY}
            />

            <ForwardMessage
                message={forwardMessage}
                open={!!forwardAnchorEl && !!forwardMessage}
                anchorEl={forwardAnchorEl}
                isCentered={isForwardFromViewer}
                onClose={() => {
                    setIsForwardFromViewer(false);
                    handleCloseForward();
                }}
                onSend={handleSendForward}
            />

            <WhatsAppMenu
                anchorEl={headerMenuAnchorEl}
                open={Boolean(headerMenuAnchorEl)}
                onClose={() => setHeaderMenuAnchorEl(null)}
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
                onClose={() => setConfirmationModal({ isOpen: false, actionType: null })}
                onConfirm={confirmationModal.actionType === 'adminCannotLeave'
                    ? () => setConfirmationModal({ isOpen: false, actionType: null })
                    : confirmationModal.actionType === 'deleteGroup'
                        ? handleConfirmDeleteGroup
                        : handleConfirmExitGroup
                }
                title={
                    confirmationModal.actionType === 'adminCannotLeave'
                        ? 'Cannot Leave Group'
                        : confirmationModal.actionType === 'deleteGroup'
                            ? 'Delete Group?'
                            : 'Exit Group?'
                }
                description={
                    confirmationModal.actionType === 'adminCannotLeave'
                        ? 'You cannot leave the group because you are the only administrator. Please assign another admin before leaving.'
                        : confirmationModal.actionType === 'deleteGroup'
                            ? 'Are you sure you want to delete this group conversation? This will remove the conversation from your chat list.'
                            : 'Are you sure you want to exit this group?'
                }
                confirmText={
                    confirmationModal.actionType === 'adminCannotLeave'
                        ? 'OK'
                        : confirmationModal.actionType === 'deleteGroup'
                            ? 'Delete'
                            : 'Exit'
                }
                variant={['exitGroup', 'deleteGroup'].includes(confirmationModal.actionType) ? 'danger' : 'primary'}
                showCancel={confirmationModal.actionType !== 'adminCannotLeave'}
            />
        </Box>
    );
};

export default Conversation;