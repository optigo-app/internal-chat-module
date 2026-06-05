import { useState, useEffect, useCallback, useRef, useContext } from 'react';
import toast from 'react-hot-toast';
import { LoginContext } from '../context/LoginData';
import { fetchConversationLists } from '../API/ConverLists/ConversationLists';
import { notify } from '../utils/notificationTemplates';
import { updateChatCache } from '../components/Conversation/conversationUtils';
import { 
    addInternalMessageHandler, 
    addInternalStatusHandler, 
    addInternalTypingHandler, 
    addMessageReactionHandler,
    addInternalMessageDeletionHandler,
    addGroupEventHandler,
    addGroupMemberHandler,
    addGroupPermissionHandler
} from '../socket';
import { 
    processApiResponse, 
    conversationComparator, 
    mapSearchResults, 
    resolveConversationName, 
    normalizeMessageType, 
    mapMessageTypeToCode,
    getMessagePreview 
} from '../components/CustomerLists/CustomerListFunc';
import { formatChatTimestamp } from '../utils/DateFnc';
import { getCustomerAvatarSeed, getCustomerDisplayName, getWhatsAppAvatarConfig } from '../utils/globalFunc';

export const useConversationList = ({ 
    selectedCustomer, 
    isConversationRead, 
    viewConversationRead, 
    onCustomerSelect, 
    onConversationList,
    searchTerm,
    setSearchTerm
}) => {
    const { auth, isSyncing } = useContext(LoginContext);
    const [chatMembers, setChatMembers] = useState({ data: null, total: 0 });
    const [loading, setLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [typingStates, setTypingStates] = useState({});
    const typingTimeoutsRef = useRef({});
    const [showEmptyState, setShowEmptyState] = useState(false);
    const pageSize = 100;

    const fetchControllerRef = useRef(null);
    const searchTimeoutRef = useRef(null);
    const pendingAutoSelectRef = useRef(null);

    const selectedConversationIdRef = useRef(selectedCustomer?.ConversationId);
    const selectedCustomerRef = useRef(selectedCustomer);
    const isConversationReadingRef = useRef(false);

    // Drafts management
    const draftsRef = useRef((() => {
        try {
            const storageKey = auth?.id ? `chat_drafts_${auth.id}` : 'chat_drafts';
            const saved = localStorage.getItem(storageKey);
            return saved ? JSON.parse(saved) : {};
        } catch { return {}; }
    })());
    const [drafts, setDrafts] = useState(draftsRef.current);

    useEffect(() => {
        selectedConversationIdRef.current = selectedCustomer?.ConversationId;
        selectedCustomerRef.current = selectedCustomer;
        isConversationReadingRef.current = Boolean(isConversationRead || viewConversationRead);

        // Clear unread count when conversation is selected and being read
        if (selectedCustomer?.ConversationId && (isConversationRead || viewConversationRead)) {
            setChatMembers(prev => {
                if (!prev?.data) return prev;
                const updatedData = prev.data.map(member => {
                    if (Number(member.ConversationId) === Number(selectedCustomer.ConversationId)) {
                        return { ...member, unreadCount: 0, UnreadCount: 0 };
                    }
                    return member;
                });
                return { ...prev, data: updatedData };
            });
        }
    }, [selectedCustomer, isConversationRead, viewConversationRead]);

    useEffect(() => {
        const storageKey = auth?.id ? `chat_drafts_${auth.id}` : 'chat_drafts';
        const handleDraftsUpdate = (e) => {
            if (e.detail) {
                draftsRef.current = e.detail;
                setDrafts(e.detail);
            }
        };
        const handleStorage = (e) => {
            if (e.key === storageKey) {
                try {
                    const parsed = JSON.parse(e.newValue || '{}');
                    draftsRef.current = parsed;
                    setDrafts(parsed);
                } catch { }
            }
        };
        window.addEventListener('CHAT_DRAFTS_UPDATED', handleDraftsUpdate);
        window.addEventListener('storage', handleStorage);
        return () => {
            window.removeEventListener('CHAT_DRAFTS_UPDATED', handleDraftsUpdate);
            window.removeEventListener('storage', handleStorage);
        };
    }, [auth?.id]);

    const loadMembers = useCallback(async (page = 1, reset = false, search = null) => {
        if (loading || (!reset && !hasMore)) return;
        if (!auth?.token || !auth?.userId) return;

        if (fetchControllerRef.current) {
            fetchControllerRef.current.abort();
        }
        const controller = new AbortController();
        fetchControllerRef.current = controller;

        if (reset) {
            setShowEmptyState(false);
        }
        setLoading(true);

        try {
            const searchToUse = search !== null ? search : searchTerm;
            const response = await fetchConversationLists(page, pageSize, auth, searchToUse, controller.signal);
            const currentConversations = processApiResponse(response.data?.rd || []);
            const searchResults = mapSearchResults(response.data?.rd1);

            const mergedConversations = searchToUse
                ? [
                    ...searchResults.filter(sr =>
                        !currentConversations.some(cc =>
                            (sr.ReceiverId && cc.ReceiverId && Number(cc.ReceiverId) === Number(sr.ReceiverId)) ||
                            (sr.Id && cc.CustomerId && Number(cc.CustomerId) === Number(sr.Id))
                        )
                    ).sort((a, b) => a.name.localeCompare(b.name)),
                    ...currentConversations
                ]
                : currentConversations;

            const sortedConversations = mergedConversations.sort(conversationComparator);

            setChatMembers(prev => {
                let finalData = sortedConversations;
                // When resetting, preserve conversations from previous state that are not yet in API
                // (e.g., a newly created conversation from an outgoing socket message)
                if (reset && prev?.data) {
                    const missing = prev.data.filter(old =>
                        !sortedConversations.some(n => Number(n.ConversationId) === Number(old.ConversationId))
                    );
                    if (missing.length) {
                        finalData = [...sortedConversations, ...missing];
                        finalData.sort(conversationComparator);
                    }
                }
                return {
                    data: finalData,
                    total: Math.max(response.total, finalData.length)
                };
            });

            const moreAvailable = response?.hasMore ?? sortedConversations.length > 0;
            setHasMore(moreAvailable);
            if (moreAvailable) setCurrentPage(page);
        } catch (error) {
            if (error.name === 'AbortError') return;
            console.error('Error loading members:', error);
        } finally {
            setLoading(false);
        }
    }, [loading, hasMore, auth, pageSize, searchTerm]);

    const handleSocketUpdate = useCallback((incoming, isStatusChange = false) => {
        setChatMembers((prev) => {
            if (!prev?.data) return prev;

            const conversationId = incoming?.ConversationId ?? incoming?.conversationId;
            if (conversationId == null) return prev;

            let resolvedName = resolveConversationName(incoming, getCustomerDisplayName);

            const updatedData = [...prev.data];
            const index = updatedData.findIndex(
                (member) => Number(member.ConversationId) === Number(conversationId)
            );

            const existingChat = index !== -1 ? updatedData[index] : null;
            const normalizedType = normalizeMessageType(
                incoming?.MessageType ??
                incoming?.LastMessageType ??
                existingChat?.LastMessageType
            );
            const myId = Number(auth?.id ?? auth?.userId);
            const senderId = Number(incoming?.SenderId ?? incoming?.Sender);
            const isOutgoing = myId && senderId && myId === senderId;

            const previewMsg = {
                ...incoming,
                Message: (incoming?.IsDeletedForEveryone === 1 && isOutgoing) 
                    ? (incoming?.Message1 || incoming?.Message) 
                    : (incoming?.Message ?? existingChat?.LastMessage ?? ''),
                MessageType: normalizedType,
                SystemMsg: incoming?.SystemMsg ?? incoming?.LastMessageSystemMsg ?? existingChat?.SystemMsg,
                IsDeletedForEveryone: incoming?.IsDeletedForEveryone
            };
            const messagePreview = getMessagePreview(previewMsg);
            const messagePreviewText = messagePreview?.text ?? '';
            const messagePreviewNode = messagePreview?.node ?? '';
            const formattedTime = formatChatTimestamp(incoming?.DateTime || incoming?.LastMessageDate || incoming?.LastUpdatedDate);

            const normalizedDirection = isOutgoing ? 1 : 0;

            const isOpenConversation =
                Number(selectedConversationIdRef.current) === Number(conversationId) &&
                Boolean(isConversationReadingRef.current);

            const isWindowFocused = document.hasFocus();
            const shouldNotify = !isOutgoing && !isStatusChange && (!isOpenConversation || !isWindowFocused);

            if (shouldNotify) {
                notify({
                    senderName: resolvedName,
                    message: messagePreviewText,
                    conversationId: conversationId,
                    tag: `msg-${conversationId}`,
                    ...incoming
                }, "NEW_MESSAGE");
            }

            const nextUnreadCount = (currentCount) => {
                if (isStatusChange || isOutgoing) return currentCount;
                if (isOpenConversation) return 0;
                return (currentCount || 0) + 1;
            };

            const nextUnreadOnStatus = (currentCount) => {
                if (!isStatusChange) return currentCount;
                const raw = incoming?.MessageStatus ?? incoming?.Status;
                if (Number(raw) === 1) return 0;
                return currentCount;
            };

            if (index !== -1) {
                const currentChat = updatedData[index];
                const currentUnread = currentChat.unreadCount ?? currentChat.UnreadCount ?? 0;

                const incomingId = incoming?.MessageId ?? incoming?.Id;
                const isSameMessage = incomingId
                    ? (String(incomingId) === String(currentChat.LastMessageId))
                    : (currentChat.lastMessageText === messagePreviewText &&
                        currentChat.lastMessageTime === formattedTime);

                if (isStatusChange && !incomingId && !incoming?.Message) {
                    const unreadFinal = nextUnreadOnStatus(currentUnread);
                    updatedData[index] = { 
                        ...currentChat, 
                        unreadCount: unreadFinal, 
                        UnreadCount: unreadFinal,
                        LastMessageStatus: incoming?.MessageStatus ?? incoming?.Status ?? incoming?.status ?? currentChat.LastMessageStatus
                    };
                    updatedData.sort(conversationComparator);
                    return { ...prev, data: updatedData };
                }

                if (isSameMessage && !isStatusChange) return prev;

                const unreadAfterMsg = nextUnreadCount(currentUnread);
                const unreadFinal = nextUnreadOnStatus(unreadAfterMsg);

                updatedData[index] = {
                    ...currentChat,
                    name: (String(currentChat?.name ?? '').trim() && String(currentChat?.name).trim() !== 'Unknown')
                        ? currentChat.name
                        : resolvedName,
                    lastMessage: messagePreviewNode,
                    lastMessageText: messagePreviewText,
                    lastMessageTime: formattedTime,
                    lastMessageTimeValue: isStatusChange
                        ? currentChat.lastMessageTimeValue
                        : (() => {
                            const now = new Date();
                            const offset = now.getTimezoneOffset() * 60000;
                            return new Date(now.getTime() - offset).toISOString();
                        })(),
                    unreadCount: unreadFinal,
                    UnreadCount: unreadFinal,
                    LastMessage: incoming?.Message ?? currentChat.LastMessage,
                    LastMessageType: mapMessageTypeToCode(normalizedType),
                    LastMessageStatus: incoming?.MessageStatus ?? incoming?.Status ?? incoming?.status ?? currentChat.LastMessageStatus,
                    LastMessageDirection: normalizedDirection,
                    LastMessageId: incomingId || currentChat.LastMessageId,
                    SystemMsg: incoming?.SystemMsg ?? incoming?.LastMessageSystemMsg ?? currentChat.SystemMsg,
                    IsDeletedForEveryone: incoming?.IsDeletedForEveryone ?? currentChat.IsDeletedForEveryone,
                };
            } else {
                const unread = isStatusChange || isOutgoing ? 0 : (isOpenConversation ? 0 : 1);
                let avatarSeed = getCustomerAvatarSeed(incoming) || resolvedName;
                let finalName = resolvedName;
                const currentSelected = selectedCustomerRef.current;

                const receiverId = incoming?.ReceiverId || incoming?.Receiver || incoming?.CustomerId;
                const selectedId = currentSelected?.UserId || currentSelected?.CustomerId || currentSelected?.Id || currentSelected?.ReceiverId;
                const isMatch = isOutgoing && currentSelected && (
                    (Number(conversationId) === Number(currentSelected.ConversationId)) ||
                    (receiverId && selectedId && Number(receiverId) === Number(selectedId))
                );

                if (isMatch) {
                    finalName = currentSelected.name || getCustomerDisplayName(currentSelected) || resolvedName;
                    avatarSeed = getCustomerAvatarSeed(currentSelected) || finalName;
                }

                const newCustomer = {
                    ConversationId: conversationId,
                    name: finalName,
                    lastMessage: messagePreviewNode,
                    lastMessageText: messagePreviewText,
                    lastMessageTime: formattedTime,
                    lastMessageTimeValue: incoming?.DateTime,
                    unreadCount: unread,
                    UnreadCount: unread,
                    LastMessage: incoming?.Message ?? '',
                    LastMessageType: mapMessageTypeToCode(normalizedType),
                    LastMessageStatus: incoming?.MessageStatus ?? incoming?.Status ?? incoming?.status,
                    LastMessageDirection: normalizedDirection,
                    LastMessageId: incoming?.MessageId ?? incoming?.Id,
                    IsGroup: incoming?.IsGroup !== undefined ? incoming.IsGroup : (incoming?.isGroup ? 1 : 0),
                    GroupMembers: incoming?.GroupMembers || [],
                    IsStar: incoming?.IsStar ?? 0,
                    IsPin: incoming?.IsPin ?? 0,
                    IsDeletedForEveryone: incoming?.IsDeletedForEveryone ?? 0,
                    ProfileImageUrl: incoming?.ProfileImageUrl || incoming?.ProfileImage || '',
                    ReceiverId: isOutgoing
                        ? (incoming?.ReceiverId || incoming?.UserId || incoming?.CustomerId)
                        : (incoming?.SenderId || incoming?.Sender || incoming?.UserId),
                    avatar: null,
                    avatarConfig: getWhatsAppAvatarConfig(avatarSeed),
                };

                // Mark for auto-select after state updates and converListRef is synced
                if (isMatch) {
                    pendingAutoSelectRef.current = { conversationId, customer: newCustomer };
                }

                // If search is active, clear it and reload full list
                if (isOutgoing && searchTerm) {
                    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
                    searchTimeoutRef.current = setTimeout(() => {
                        setSearchTerm('');
                        loadMembers(1, true, '');
                    }, 0);
                }

                updatedData.push(newCustomer);
            }

            updatedData.sort(conversationComparator);
            updateChatCache(conversationId, incoming, auth, isStatusChange);
            return { ...prev, data: updatedData };
        });
    }, [auth, conversationComparator, searchTerm, setSearchTerm, loadMembers]);

    const handleRemoveItem = useCallback((conversationId) => {
        setChatMembers(prev => {
            if (!prev?.data) return prev;
            const updatedData = prev.data.filter(it => Number(it.ConversationId) !== Number(conversationId));
            return { ...prev, data: updatedData };
        });
    }, []);

    useEffect(() => {
        const handleUpdateItem = (event) => {
            if (!event.detail) return;
            const detail = event.detail;
            if (detail.ConversationId) {
                setChatMembers(prev => {
                    if (!prev?.data) return prev;
                    const idx = prev.data.findIndex(m => Number(m.ConversationId) === Number(detail.ConversationId));
                    if (idx === -1) return prev;
                    const updated = [...prev.data];
                    const existing = updated[idx];
                    const merged = { ...existing };
                    if (detail.ProfileImageUrl !== undefined) merged.ProfileImageUrl = detail.ProfileImageUrl;
                    if (detail.name !== undefined) merged.name = detail.name;
                    if (detail.ConversationName !== undefined) merged.ConversationName = detail.ConversationName;
                    if (detail.RemoveInGroup !== undefined) merged.RemoveInGroup = detail.RemoveInGroup;
                    if (detail.IsStar !== undefined) merged.IsStar = detail.IsStar;
                    if (detail.IsPin !== undefined) merged.IsPin = detail.IsPin;
                    updated[idx] = merged;
                    return { ...prev, data: updated };
                });
                if (!detail.Message && !detail.LastMessage) return;
            }
            handleSocketUpdate(detail, Boolean(detail.isStatusChange));
        };

        const handleRemoveEvent = (event) => {
            if (event.detail?.conversationId) handleRemoveItem(event.detail.conversationId);
        };

        window.addEventListener('UPDATE_CONVERSATION_ITEM', handleUpdateItem);
        window.addEventListener('DELETE_CONVERSATION_ITEM', handleRemoveEvent);
        window.addEventListener('DELETE_CONVERSATION', handleRemoveEvent);
        return () => {
            window.removeEventListener('UPDATE_CONVERSATION_ITEM', handleUpdateItem);
            window.removeEventListener('DELETE_CONVERSATION_ITEM', handleRemoveEvent);
            window.removeEventListener('DELETE_CONVERSATION', handleRemoveEvent);
        };
    }, [handleSocketUpdate, handleRemoveItem]);

    useEffect(() => {
        const list = Array.isArray(chatMembers?.data) ? chatMembers.data : [];
        onConversationList(list);
        const pending = pendingAutoSelectRef.current;
        if (pending) {
            pendingAutoSelectRef.current = null;
            const customer = list.find(c => Number(c.ConversationId) === Number(pending.conversationId)) || pending.customer;
            window.dispatchEvent(new CustomEvent('SELECT_CONVERSATION', {
                detail: { conversationId: pending.conversationId, customer }
            }));
        }
    }, [chatMembers, onConversationList]);

    useEffect(() => {
        if (!auth?.token || !auth?.userId) return;
        const cleanup = addInternalTypingHandler((data) => {
            const conversationId = Number(data.ConversationId);
            const senderId = Number(data.SenderId);
            const currentUserId = Number(auth?.id || auth?.userId);
            if (senderId === currentUserId) return;

            if (data.isTyping === false) {
                setTypingStates(prev => {
                    const newState = { ...prev };
                    delete newState[conversationId];
                    return newState;
                });
                if (typingTimeoutsRef.current[conversationId]) {
                    clearTimeout(typingTimeoutsRef.current[conversationId]);
                    delete typingTimeoutsRef.current[conversationId];
                }
            } else {
                setTypingStates(prev => ({
                    ...prev,
                    [conversationId]: { isTyping: true, userName: data.UserName }
                }));
                if (typingTimeoutsRef.current[conversationId]) clearTimeout(typingTimeoutsRef.current[conversationId]);
                typingTimeoutsRef.current[conversationId] = setTimeout(() => {
                    setTypingStates(prev => {
                        const newState = { ...prev };
                        delete newState[conversationId];
                        return newState;
                    });
                    delete typingTimeoutsRef.current[conversationId];
                }, 5000);
            }
        });
        return () => {
            cleanup();
            Object.values(typingTimeoutsRef.current).forEach(clearTimeout);
            typingTimeoutsRef.current = {};
        };
    }, [auth]);

    useEffect(() => {
        if (!auth?.token || !auth?.userId) return;
        const removeInternalMessageHandler = addInternalMessageHandler((data) => handleSocketUpdate(data, false));
        const removeStatusHandler = addInternalStatusHandler((data) => handleSocketUpdate(data, true));
        const removeReactionHandler = addMessageReactionHandler((data) => handleSocketUpdate(data, true));
        const removeDeletionHandler = addInternalMessageDeletionHandler((data) => handleSocketUpdate(data, true));
        return () => {
            if (typeof removeInternalMessageHandler === 'function') removeInternalMessageHandler();
            if (typeof removeStatusHandler === 'function') removeStatusHandler();
            if (typeof removeReactionHandler === 'function') removeReactionHandler();
            if (typeof removeDeletionHandler === 'function') removeDeletionHandler();
        };
    }, [auth, handleSocketUpdate]);

    useEffect(() => {
        if (!auth?.token || !auth?.userId) return;
        const currentUserId = auth?.id || auth?.userId;
        const handleGroupEvent = (data) => {
            if (!data || !data.conversationId) return;
            const eventNotificationMap = { 'group_created': 'GROUP_CREATED', 'group_updated': 'GROUP_UPDATED' };
            const notificationTemplate = eventNotificationMap[data.eventType];
            if (notificationTemplate && selectedCustomer?.ConversationId !== data.conversationId) {
                notify(data, notificationTemplate, auth);
            }
            if (data.conversationData) {
                const normalized = processApiResponse([data.conversationData])[0];
                if (normalized) {
                    setChatMembers(prev => {
                        const prevData = Array.isArray(prev?.data) ? prev.data : [];
                        const updatedData = [...prevData];
                        const index = updatedData.findIndex(c => Number(c.ConversationId) === Number(data.conversationId));
                        if (index !== -1) {
                            const existing = updatedData[index];
                            const merged = { ...existing, ...normalized };
                            if (!normalized.ConversationName || normalized.name === 'Unknown') {
                                merged.name = existing.name;
                                merged.ConversationName = existing.ConversationName;
                            }
                            if (!normalized.GroupDesc) merged.GroupDesc = existing.GroupDesc;
                            updatedData[index] = merged;
                        } else if (data.eventType === 'group_created') {
                            updatedData.push(normalized);
                            return { ...prev, data: updatedData.sort(conversationComparator), total: (prev?.total ?? 0) + 1 };
                        }
                        updatedData.sort(conversationComparator);
                        return { ...prev, data: updatedData };
                    });
                }
            } else {
                loadMembers(1, true, searchTerm);
            }
        };
        const handleMemberEvent = (data) => {
            if (!data || !data.conversationId) return;
            const isCurrentUserRemoved = data.eventType === 'member_removed' && Number(data.removedMemberId) === Number(currentUserId);
            const eventNotificationMap = {
                'member_added': 'MEMBER_ADDED',
                'member_removed': isCurrentUserRemoved ? 'YOU_WERE_REMOVED' : 'MEMBER_REMOVED',
                'member_promoted': 'MEMBER_PROMOTED',
                'member_demoted': 'MEMBER_DEMOTED'
            };
            const notificationTemplate = eventNotificationMap[data.eventType];
            if (notificationTemplate && selectedCustomer?.ConversationId !== data.conversationId) notify(data, notificationTemplate, auth);
            if (data.conversationData) {
                const normalized = processApiResponse([data.conversationData])[0];
                if (normalized) {
                    setChatMembers(prev => {
                        const prevData = Array.isArray(prev?.data) ? prev.data : [];
                        const updatedData = [...prevData];
                        const index = updatedData.findIndex(c => Number(c.ConversationId) === Number(data.conversationId));
                        if (index !== -1) {
                            const existing = updatedData[index];
                            const merged = { ...existing, ...normalized };
                            if (!normalized.ConversationName || normalized.name === 'Unknown') {
                                merged.name = existing.name;
                                merged.ConversationName = existing.ConversationName;
                            }
                            if (!normalized.GroupDesc) merged.GroupDesc = existing.GroupDesc;
                            updatedData[index] = merged;
                        } else if (data.eventType === 'member_added') updatedData.push(normalized);
                        updatedData.sort(conversationComparator);
                        return { ...prev, data: updatedData };
                    });
                }
            } else loadMembers(1, true, searchTerm);
        };
        const handlePermissionEvent = (data) => {
            if (!data || !data.conversationId) return;
            if (selectedCustomer?.ConversationId !== data.conversationId) notify(data, 'PERMISSION_CHANGED', auth);
        };
        const removeGroupEventHandler = addGroupEventHandler(handleGroupEvent);
        const removeGroupMemberHandler = addGroupMemberHandler(handleMemberEvent);
        const removeGroupPermissionHandler = addGroupPermissionHandler(handlePermissionEvent);
        return () => {
            if (typeof removeGroupEventHandler === 'function') removeGroupEventHandler();
            if (typeof removeGroupMemberHandler === 'function') removeGroupMemberHandler();
            if (typeof removeGroupPermissionHandler === 'function') removeGroupPermissionHandler();
        };
    }, [auth, selectedCustomer?.ConversationId, loadMembers, searchTerm]);

    const debouncedSearch = useCallback((value) => {
        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = setTimeout(() => loadMembers(1, true, value), 500);
    }, [loadMembers]);

    const handleSearchChange = (e) => {
        const value = e.target.value;
        setSearchTerm(value);
        if (value === '') {
            if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
            loadMembers(1, true, '');
        } else debouncedSearch(value);
    };

    useEffect(() => {
        if (auth?.token && auth?.userId) loadMembers(1, true);
    }, [auth?.token, auth?.userId]);

    useEffect(() => {
        if (isSyncing === false) loadMembers(1, true);
    }, [isSyncing]);

    useEffect(() => {
        return () => {
            if (pendingAutoSelectRef.current) pendingAutoSelectRef.current = null;
        };
    }, []);

    return {
        chatMembers,
        loading,
        hasMore,
        currentPage,
        typingStates,
        drafts,
        showEmptyState,
        loadMembers,
        handleSearchChange,
        setChatMembers,
        setShowEmptyState
    };
};
