import { FileText, Image, Video, ArrowLeft, Pin, ChevronDown, Star, Archive } from 'lucide-react';
import toast from 'react-hot-toast';
import { CheckCheck } from "lucide-react";
import { useLocation, useNavigate } from 'react-router-dom';
import { LoginContext } from '../../context/LoginData';
import { useArchieveContext } from '../../contexts/ArchieveContext';
import React, { useEffect, useState, useCallback, useRef, useContext, useMemo } from 'react';
import {
    Avatar,
    Badge,
    Typography,
    Box,
    Button,
    Chip,
    TextField,
    InputAdornment,
    IconButton,
    Tooltip,
    CircularProgress
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Clear, Search } from '@mui/icons-material';
import MapsUgcIcon from '@mui/icons-material/MapsUgc';
import GroupAddIcon from '@mui/icons-material/GroupAdd';
import './CustomerLists.scss';
import { fetchConversationLists } from '../../API/ConverLists/ConversationLists';
import { formatChatTimestamp } from '../../utils/DateFnc';
import { getCustomerAvatarSeed, getCustomerDisplayName, getWhatsAppAvatarConfig, hasCustomerName, highlightText } from '../../utils/globalFunc';
import WhatsAppMenu from '../ReusableComponent/WhatsAppMenu';
import { getMessagePreview, processApiResponse, getCustomerListMenuItems } from './CustomerListFunc';
import { updateConversationApi } from '../../API/SendMessage/updateConversationApi';
import { updateChatCache } from '../Conversation/conversationUtils';
import { addInternalMessageHandler, addInternalStatusHandler, addInternalTypingHandler } from '../../socket';
import { Helmet } from 'react-helmet-async';
import { notify } from '../../utils/notificationTemplates';
import NotificationPermissionBar from '../_ui/NotificationPermissionBar';
import AddConversation from '../AddConversation/AddConversation';
import CreateGroup from '../AddConversation/CreateGroup';
import useOnlineStatus from '../../utils/internetCheck';
import useFaviconBadge from '../../hooks/useFaviconBadge';
import { useFavorite } from '../../contexts/FavoriteContext';
import ConversationAvatar from '../ReusableComponent/ConversationAvatar';
import ProfilePanel from '../ProfileAvatar/ProfilePanel';

const CustomerLists = ({ onCustomerSelect = () => { }, selectedCustomer = null, selectedStatus = 'All', selectedTag = 'All', isConversationRead = false, viewConversationRead = false, onConversationList = () => { } }) => {
    const isOnline = useOnlineStatus();
    const location = useLocation();
    const navigate = useNavigate();
    const { archieve, addArchieve } = useArchieveContext();
    const [searchTerm, setSearchTerm] = useState('');
    const [tabValue, setTabValue] = useState(0);
    const [chatMembers, setChatMembers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [anchorEl, setAnchorEl] = useState(null);
    const [selectMember, setSelectMember] = useState({});
    const [hoveredId, setHoveredId] = useState(null);
    const [typingStates, setTypingStates] = useState({});
    const typingTimeoutsRef = useRef({});
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const [showNewChat, setShowNewChat] = useState(false);
    const [showCreateGroup, setShowCreateGroup] = useState(false);
    const containerRef = useRef(null);
    const pageSize = 100;
    const searchTimeoutRef = useRef(null);
    const fetchControllerRef = useRef(null);
    const clickTimeoutRef = useRef(null);
    const pendingSelectConversationIdRef = useRef(null);
    const { auth, isSyncing } = useContext(LoginContext);

    // Get Context favorite state
    const { favoriteState } = useFavorite();

    const getMemberTimeValue = useCallback((member) => {
        const raw = member?.lastMessageTimeValue || member?.LastMessageDate || member?.LastUpdatedDate || member?.lastMessageTime || 0;
        const t = new Date(raw).getTime();
        return Number.isFinite(t) ? t : 0;
    }, []);

    const conversationComparator = useCallback((a, b) => {
        const aIsSearch = Boolean(a?.isSearchResult);
        const bIsSearch = Boolean(b?.isSearchResult);
        if (aIsSearch !== bIsSearch) return aIsSearch ? 1 : -1;

        const aPinned = Number(a?.IsPin || 0) === 1;
        const bPinned = Number(b?.IsPin || 0) === 1;
        if (aPinned !== bPinned) return aPinned ? -1 : 1;

        // Removed unread priority check to allow sorting strictly by time

        const aTime = getMemberTimeValue(a);
        const bTime = getMemberTimeValue(b);
        if (aTime !== bTime) return bTime - aTime;

        return Number(b?.ConversationId ?? 0) - Number(a?.ConversationId ?? 0);
    }, [getMemberTimeValue]);

    const handleCloseMenu = () => {
        setAnchorEl(null);
    };

    const loadMembers = useCallback(async (page = 1, reset = false, search = null) => {
        if (loading || (!reset && !hasMore)) return;
        if (!auth?.token || !auth?.userId) {
            console.log('⚠️ No auth token available, skipping conversation load');
            return;
        }
        if (fetchControllerRef.current) {
            fetchControllerRef.current.abort();
        }
        const controller = new AbortController();
        fetchControllerRef.current = controller;

        setLoading(true);

        try {
            const searchToUse = search !== null ? search : searchTerm;
            const response = await fetchConversationLists(page, pageSize, auth, searchToUse, controller.signal);
            const currentConversations = processApiResponse(response.data?.rd || []);
            const searchResults = response.data?.rd1?.map(user => ({
                ...user,
                ConversationId: null,
                Id: user.UserId || user.CustomerId || user.id,
                ReceiverId: user.UserId || user.CustomerId,
                name: user.UserName || user.CustomerName || user.CustomerPhone || user.name || 'Unknown',
                email: user.UserEmail || user.DisplayEmail || '',
                lastMessage: '',
                lastMessageText: '',
                lastMessageTimeValue: new Date().toISOString(),
                lastMessageTime: '',
                unreadCount: 0,
                isSearchResult: true
            })) || [];

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

            setChatMembers(prev => ({
                data: reset ? sortedConversations : [...(prev.data || []), ...sortedConversations],
                total: Math.max(response.total, sortedConversations.length)
            }));

            const moreAvailable = response?.hasMore ?? sortedConversations.length > 0;
            setHasMore(moreAvailable);

            if (moreAvailable) setCurrentPage(page);
        } catch (error) {
            if (error.name === 'AbortError' || error.message === 'AbortError') {
                return;
            }
            console.error('Error loading members:', error);
        } finally {
            setLoading(false);
        }
    }, [loading, hasMore, auth?.token, auth?.userId, pageSize, processApiResponse, searchTerm, conversationComparator]);

    useEffect(() => {
        if (isSyncing === false) {
            loadMembers(1, true);
        }
    }, [isSyncing]);

    const loadMembersRef = useRef(loadMembers);

    useEffect(() => {
        loadMembersRef.current = loadMembers;
    }, [loadMembers]);

    const selectedConversationIdRef = useRef(selectedCustomer?.ConversationId);
    const selectedCustomerRef = useRef(selectedCustomer);
    const isConversationReadingRef = useRef(false);

    useEffect(() => {
        selectedConversationIdRef.current = selectedCustomer?.ConversationId;
        selectedCustomerRef.current = selectedCustomer;
        isConversationReadingRef.current = Boolean(isConversationRead || viewConversationRead);
    }, [selectedCustomer, isConversationRead, viewConversationRead]);


    const handleSocketUpdate = useCallback((incoming, isStatusChange = false) => {
        setChatMembers((prev) => {
            if (!prev?.data) return prev;

            const conversationId = incoming?.ConversationId ?? incoming?.conversationId;
            if (conversationId == null) return prev;

            // RESOLVED NAME (default logic)
            // Prioritize explicit SENDER name over Conversation/Customer name for notifications
            let resolvedName = (() => {
                const senderInfo = (incoming?.FirstName || incoming?.LastName)
                    ? ((incoming?.FirstName || '') + ' ' + (incoming?.LastName || '')).trim()
                    : (incoming?.SenderInfo || incoming?.SenderName || incoming?.senderName || '');

                const candidate = String(
                    senderInfo ||
                    incoming?.CustomerName ||
                    incoming?.ConversationName ||
                    incoming?.UserName ||
                    incoming?.name ||
                    incoming?.DisplayEmail ||
                    incoming?.RecieverName ||
                    ''
                ).trim();
                return candidate || getCustomerDisplayName(incoming);
            })();

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
            const previewMsg = {
                ...incoming,
                Message: incoming?.Message ?? existingChat?.LastMessage ?? '',
                MessageType: normalizedType,
            };
            const messagePreview = getMessagePreview(previewMsg);
            const messagePreviewText = messagePreview?.text ?? '';
            const messagePreviewNode = messagePreview?.node ?? '';
            const formattedTime = formatChatTimestamp(incoming?.DateTime || incoming?.LastMessageDate || incoming?.LastUpdatedDate);

            const myId = Number(auth?.id ?? auth?.userId);
            const senderId = Number(incoming?.SenderId ?? incoming?.Sender);
            const isOutgoing = myId && senderId && myId === senderId;
            const normalizedDirection = isOutgoing ? 1 : 0;

            const isOpenConversation =
                Number(selectedConversationIdRef.current) === Number(conversationId) &&
                Boolean(isConversationReadingRef.current);

            // Trigger notification if it's a new incoming message and conversation is not active/focused
            const isWindowFocused = document.hasFocus();
            const shouldNotify = !isOutgoing && !isStatusChange && (!isOpenConversation || !isWindowFocused);

            if (shouldNotify) {
                notify(
                    {
                        senderName: resolvedName,
                        message: messagePreviewText,
                        conversationId: conversationId,
                        tag: `msg-${conversationId}`, // Deduplication tag
                        ...incoming
                    },
                    "NEW_MESSAGE"
                );
            }

            const nextUnreadCount = (currentCount) => {
                // Status changes don't affect unread count (handled by nextUnreadOnStatus)
                if (isStatusChange) return currentCount;

                // Outgoing messages: preserve existing unread count
                if (isOutgoing) return currentCount;

                // Incoming message in open conversation: reset to 0 (user is viewing it)
                if (isOpenConversation) return 0;

                // Incoming message in closed conversation: increment
                return (currentCount || 0) + 1;
            };

            const nextUnreadOnStatus = (currentCount) => {
                if (!isStatusChange) return currentCount;
                // Reset unread count when Status is 1 (based on old working logic)
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

                // Guard: If this is a status-only event (like internal:msg_read) without a MessageId,
                // only update unread count, don't modify message preview or other fields
                if (isStatusChange && !incomingId && !incoming?.Message) {
                    const unreadFinal = nextUnreadOnStatus(currentUnread);

                    updatedData[index] = {
                        ...currentChat,
                        unreadCount: unreadFinal,
                        UnreadCount: unreadFinal,
                    };

                    updatedData.sort(conversationComparator);
                    return { ...prev, data: updatedData };
                }

                if (isSameMessage && !isStatusChange) {
                    return prev;
                }

                const unreadAfterMsg = nextUnreadCount(currentUnread);
                const unreadFinal = nextUnreadOnStatus(unreadAfterMsg);

                const updatedChat = {
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
                };

                updatedData[index] = updatedChat;
            } else {
                const unread = isStatusChange || isOutgoing ? 0 : (isOpenConversation ? 0 : 1);

                // If this is a new conversation and WE sent the message, 
                // we want the list item to be the RECEIVER, not us.
                // We check if the current selected customer matches this new conversation.
                let avatarSeed = getCustomerAvatarSeed(incoming) || resolvedName;
                let finalName = resolvedName;

                const currentSelected = selectedCustomerRef.current;

                if (isOutgoing && currentSelected) {
                    // Check if matched by ConversationId or ReceiverId
                    const receiverId = incoming?.ReceiverId;
                    const selectedId = currentSelected.UserId || currentSelected.CustomerId || currentSelected.Id;

                    const isMatch = (Number(conversationId) === Number(currentSelected.ConversationId)) ||
                        (receiverId && selectedId && Number(receiverId) === Number(selectedId));

                    if (isMatch) {
                        finalName = currentSelected.name || getCustomerDisplayName(currentSelected) || resolvedName;
                        avatarSeed = getCustomerAvatarSeed(currentSelected) || finalName;
                        pendingSelectConversationIdRef.current = conversationId;
                    }
                }

                const newChat = {
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
                    // FIX: For incoming messages, the "Receiver" of the chat item (the person we talk to) 
                    // is the SENDER of the message.
                    ReceiverId: isOutgoing
                        ? (incoming?.ReceiverId || incoming?.UserId || incoming?.CustomerId)
                        : (incoming?.SenderId || incoming?.Sender || incoming?.UserId),
                    avatar: null,
                    avatarConfig: getWhatsAppAvatarConfig(avatarSeed),
                };
                updatedData.push(newChat);
            }

            updatedData.sort(conversationComparator);

            // SYNC TO CACHE
            // This ensures that when the user switches to this chat later, the cache is up-to-date.
            updateChatCache(conversationId, incoming, auth, isStatusChange);

            return { ...prev, data: updatedData };
        });
    }, [auth?.id, auth?.userId, auth, conversationComparator]);


    const handleRemoveItem = useCallback((conversationId) => {
        setChatMembers(prev => {
            if (!prev?.data) return prev;
            const updatedData = prev.data.filter(it => Number(it.ConversationId) !== Number(conversationId));
            return { ...prev, data: updatedData };
        });
    }, []);

    useEffect(() => {
        const handleUpdateItem = (event) => {
            if (event.detail) {
                handleSocketUpdate(event.detail, Boolean(event.detail.isStatusChange));
            }
        };
        const handleRemoveEvent = (event) => {
            if (event.detail?.conversationId) {
                handleRemoveItem(event.detail.conversationId);
            }
        };

        window.addEventListener('UPDATE_CONVERSATION_ITEM', handleUpdateItem);
        window.addEventListener('DELETE_CONVERSATION_ITEM', handleRemoveEvent);
        // Also support older DELETE_CONVERSATION event from CustomerDetails
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

        const pendingId = pendingSelectConversationIdRef.current;
        if (pendingId) {
            pendingSelectConversationIdRef.current = null;
            setTimeout(() => {
                window.dispatchEvent(
                    new CustomEvent('SELECT_CONVERSATION', {
                        detail: { conversationId: pendingId }
                    })
                );
            }, 0);
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
                    [conversationId]: {
                        isTyping: true,
                        userName: data.UserName
                    }
                }));

                if (typingTimeoutsRef.current[conversationId]) {
                    clearTimeout(typingTimeoutsRef.current[conversationId]);
                }

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
    }, [auth?.id, auth?.userId, auth?.token]);

    const normalizeMessageType = (type) => {
        if (typeof type === 'string') return type;
        switch (Number(type)) {
            case 1: return 'text';
            case 2: return 'image';
            case 3: return 'video';
            case 4: return 'document';
            case 5: return 'file';
            default: return 'text';
        }
    };

    const mapMessageTypeToCode = (type) => {
        const t = normalizeMessageType(type);
        switch (t) {
            case 'text': return 1;
            case 'image': return 2;
            case 'video': return 3;
            case 'document': return 4;
            case 'file': return 5;
            default: return 1;
        }
    };

    useEffect(() => {
        if (!auth?.token || !auth?.userId) return;

        const removeInternalMessageHandler = addInternalMessageHandler((data) => {
            if (!data || typeof data !== 'object') return;
            handleSocketUpdate(data, false);
        });
        const handleStatusChange = (data) => handleSocketUpdate(data, true);
        const removeStatusHandler = addInternalStatusHandler(handleStatusChange);

        return () => {
            if (typeof removeInternalMessageHandler === 'function') {
                removeInternalMessageHandler();
            }
            if (typeof removeStatusHandler === 'function') {
                removeStatusHandler();
            }
        };
    }, [auth?.token, auth?.userId]);

    // Group socket event handlers for notifications
    useEffect(() => {
        if (!auth?.token || !auth?.userId) return;

        const {
            addGroupEventHandler,
            addGroupMemberHandler,
            addGroupPermissionHandler
        } = require('../../socket');

        const currentUserId = auth?.id || auth?.userId;

        // Handle group events (created, updated, deleted)
        const handleGroupEvent = (data) => {
            if (!data || !data.conversationId) return;

            // Map event types to notification templates
            const eventNotificationMap = {
                'group_created': 'GROUP_CREATED',
                'group_updated': 'GROUP_UPDATED',
            };

            const notificationTemplate = eventNotificationMap[data.eventType];

            // Show browser notification if not in the conversation
            if (notificationTemplate && selectedCustomer?.ConversationId !== data.conversationId) {
                notify(data, notificationTemplate, auth);
            }

            // Optimistic Update: Use conversationData if present (group_created/updated)
            if (data.conversationData) {
                const normalized = processApiResponse([data.conversationData])[0];
                if (normalized) {
                    setChatMembers(prev => {
                        const prevData = Array.isArray(prev?.data) ? prev.data : [];
                        const updatedData = [...prevData];
                        const index = updatedData.findIndex(c => Number(c.ConversationId) === Number(data.conversationId));

                        if (index !== -1) {
                            // Safely merge: Don't overwrite valid name/desc with "Unknown" or null
                            const existing = updatedData[index];
                            const merged = { ...existing, ...normalized };

                            if (!normalized.ConversationName || normalized.name === 'Unknown') {
                                merged.name = existing.name;
                                merged.ConversationName = existing.ConversationName;
                            }
                            if (!normalized.GroupDesc) {
                                merged.GroupDesc = existing.GroupDesc;
                            }
                            if (!normalized.ProfileImageUrl) {
                                merged.ProfileImageUrl = existing.ProfileImageUrl;
                            }

                            updatedData[index] = merged;
                        } else if (data.eventType === 'group_created') {
                            // Add new conversation (for group_created)
                            updatedData.push(normalized);
                            return {
                                ...prev,
                                data: updatedData.sort(conversationComparator),
                                total: (prev?.total ?? 0) + 1
                            };
                        }

                        updatedData.sort(conversationComparator);
                        return { ...prev, data: updatedData };
                    });
                }
            } else {
                // Refresh conversation list to show updated group info
                loadMembers(1, true, searchTerm);
            }
        };

        // Handle member events (added, removed, promoted, demoted)
        const handleMemberEvent = (data) => {
            if (!data || !data.conversationId) return;

            const isCurrentUserRemoved = data.eventType === 'member_removed' &&
                Number(data.removedMemberId) === Number(currentUserId);

            // Map event types to notification templates
            const eventNotificationMap = {
                'member_added': 'MEMBER_ADDED',
                'member_removed': isCurrentUserRemoved ? 'YOU_WERE_REMOVED' : 'MEMBER_REMOVED',
                'member_promoted': 'MEMBER_PROMOTED',
                'member_demoted': 'MEMBER_DEMOTED'
            };

            const notificationTemplate = eventNotificationMap[data.eventType];

            // Show browser notification if not in the conversation
            if (notificationTemplate && selectedCustomer?.ConversationId !== data.conversationId) {
                notify(data, notificationTemplate, auth);
            }

            // Optimistic Update: If data has conversationData (member_added/removed), update list immediately
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

                            // Safely preserve identity fields if missing in update
                            if (!normalized.ConversationName || normalized.name === 'Unknown') {
                                merged.name = existing.name;
                                merged.ConversationName = existing.ConversationName;
                            }
                            if (!normalized.GroupDesc) {
                                merged.GroupDesc = existing.GroupDesc;
                            }

                            updatedData[index] = merged;
                        } else if (data.eventType === 'member_added') {
                            updatedData.push(normalized);
                        }

                        updatedData.sort(conversationComparator);
                        return { ...prev, data: updatedData };
                    });
                }
            } else {
                loadMembers(1, true, searchTerm);
            }
        };

        // Handle permission events
        const handlePermissionEvent = (data) => {
            if (!data || !data.conversationId) return;

            // Show browser notification if not in the conversation
            if (selectedCustomer?.ConversationId !== data.conversationId) {
                notify(data, 'PERMISSION_CHANGED', auth);
            }

            // Refresh conversation list
            loadMembers(1, true, searchTerm);
        };

        const removeGroupEventHandler = addGroupEventHandler(handleGroupEvent);
        const removeGroupMemberHandler = addGroupMemberHandler(handleMemberEvent);
        const removeGroupPermissionHandler = addGroupPermissionHandler(handlePermissionEvent);

        return () => {
            if (typeof removeGroupEventHandler === 'function') {
                removeGroupEventHandler();
            }
            if (typeof removeGroupMemberHandler === 'function') {
                removeGroupMemberHandler();
            }
            if (typeof removeGroupPermissionHandler === 'function') {
                removeGroupPermissionHandler();
            }
        };
    }, [auth?.token, auth?.userId, auth, selectedCustomer?.ConversationId, loadMembers, searchTerm]);

    const debouncedSearch = useCallback((value) => {
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }
        searchTimeoutRef.current = setTimeout(() => {
            loadMembers(1, true, value);
        }, 500);
    }, [loadMembers]);

    // Only load members after authentication is confirmed
    useEffect(() => {
        if (auth?.token && auth?.userId) {
            loadMembers(1, true);
        }
    }, [auth?.token, auth?.userId]); // Only reload when auth changes

    useEffect(() => {
        const handleRefresh = () => loadMembers(1, true);
        const handleDelete = (event) => {
            const conversationId = event.detail?.conversationId;
            if (conversationId) {
                setChatMembers(prev => ({
                    ...prev,
                    data: prev.data?.filter(member => Number(member.ConversationId) !== Number(conversationId)) || []
                }));
            }
        };

        window.addEventListener('REFRESH_CONVERSATION_LIST', handleRefresh);
        window.addEventListener('DELETE_CONVERSATION', handleDelete);

        return () => {
            window.removeEventListener('REFRESH_CONVERSATION_LIST', handleRefresh);
            window.removeEventListener('DELETE_CONVERSATION', handleDelete);
        };
    }, [loadMembers]);

    const handleSearchChange = (e) => {
        const value = e.target.value;
        setSearchTerm(value);

        if (value === '') {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
            loadMembers(1, true, '');
        } else {
            debouncedSearch(value); // Uses latest input
        }
    };

    const handleCustomerClick = useCallback((member) => {
        if (clickTimeoutRef.current) {
            clearTimeout(clickTimeoutRef.current);
        }
        clickTimeoutRef.current = setTimeout(() => {
            onCustomerSelect(member);
        }, 300);
    }, [onCustomerSelect]);

    const handleScroll = useCallback(() => {
        if (!containerRef.current || loading || !hasMore) return;

        const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
        if (scrollTop + clientHeight >= scrollHeight - 80) {
            loadMembers(currentPage + 1);
        }
    }, [loading, hasMore, currentPage, loadMembers]);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        container.addEventListener('scroll', handleScroll);
        return () => container.removeEventListener('scroll', handleScroll);
    }, [handleScroll]);

    const handleTabChange = (newValue) => {
        if (newValue === null || newValue === undefined) return;
        setTabValue(newValue);
    };

    const getFilteredMembers = useCallback((isForArchiveOverlay) => {
        return chatMembers?.data
            ?.filter((member) => {
                if (isForArchiveOverlay) {
                    return member.IsArchived === 1;
                } else {
                    return member.IsArchived !== 1;
                }
            })
            ?.filter((member) => {
                const haystack = String(getCustomerDisplayName(member) || '').toLowerCase();
                return haystack.includes(searchTerm.toLowerCase());
            })
            ?.filter((member) => {
                // Check Context state first, fallback to member.IsStar
                const isFavoriteStatus = (favoriteState[member.ConversationId]?.isStar ?? member.IsStar) === 1;
                switch (tabValue) {
                    case 2: return isFavoriteStatus && tabValue === 2;
                    default: return true;
                }
            })
            ?.filter((member) => {
                if (!selectedStatus || selectedStatus === 'All') return true;
                const statusKey = selectedStatus.toLowerCase();
                // Check Context state first, fallback to member.IsStar
                const isFavoriteStatus = (favoriteState[member.ConversationId]?.isStar ?? member.IsStar) === 1;
                return member.ticketStatus === statusKey || (isFavoriteStatus && statusKey === 'favorite');
            })
            ?.filter((member) => {
                if (!selectedTag || selectedTag === 'All') return true;
                return member.tags && member.tags.some(tag => tag.TagId === selectedTag.Id);
            }) || [];
    }, [chatMembers, favoriteState, searchTerm, tabValue, selectedStatus, selectedTag]);

    const mainFilteredMembers = React.useMemo(() => getFilteredMembers(false), [getFilteredMembers]);

    useEffect(() => {
        setSelectedIndex(-1);
    }, [searchTerm, tabValue, selectedStatus, selectedTag]);

    const scrollToSelectedIndex = useCallback((index) => {
        if (containerRef.current && index >= 0) {
            const container = containerRef.current;
            const items = container.querySelectorAll('.customer-item-wrapper');
            const targetItem = items[index];
            if (targetItem) {
                const containerRect = container.getBoundingClientRect();
                const itemRect = targetItem.getBoundingClientRect();

                if (itemRect.bottom > containerRect.bottom) {
                    container.scrollTop += (itemRect.bottom - containerRect.bottom);
                } else if (itemRect.top < containerRect.top) {
                    container.scrollTop -= (containerRect.top - itemRect.top);
                }
            }
        }
    }, []);

    const handleKeyDown = (e) => {
        if (!mainFilteredMembers?.length) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => {
                const next = prev < mainFilteredMembers.length - 1 ? prev + 1 : prev;
                scrollToSelectedIndex(next);
                return next;
            });
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => {
                const next = prev > 0 ? prev - 1 : 0;
                scrollToSelectedIndex(next);
                return next;
            });
        } else if (e.key === 'Enter') {
            if (selectedIndex >= 0 && selectedIndex < mainFilteredMembers.length) {
                handleCustomerClick(mainFilteredMembers[selectedIndex]);
            }
        }
    };

    const isArchiveOpen = location.pathname === '/archieve';
    const isProfileOpen = location.pathname === '/profile';
    const filteredMembers = getFilteredMembers(isArchiveOpen);

    const archivedCount = chatMembers?.data?.filter(m => m.IsArchived === 1)?.length || 0;

    const getMessageStatusIcon = (member) => {
        const direction = Number(member?.LastMessageDirection ?? member?.lastMessageDirection);
        if (direction !== 1) return null;
        const raw = member?.LastMessageStatus ?? member?.lastMessageStatus ?? member?.Status;
        let statusKey = null;
        if (typeof raw === 'string') {
            const lowered = raw.toLowerCase();
            if (lowered === 'read') statusKey = 'read';
            if (lowered === 'sent') statusKey = 'sent';
        } else {
            const parsed = typeof raw === 'number' ? raw : parseInt(raw, 10);
            if (parsed === 3) statusKey = 'read';
            if (parsed === 1 || parsed === 0) statusKey = 'sent';
        }
        if (!statusKey) return null;
        return (
            <CheckCheck
                size={16}
                style={{ marginRight: 5, color: statusKey === 'read' ? "#1F51FF" : "#9e9e9e" }}
            />
        );
    };

    useEffect(() => {
        addArchieve(archivedCount);
    }, [chatMembers]);

    const handleMenuAction = async (action, member) => {
        setSelectMember(member);
        onConversationList(Array.isArray(chatMembers?.data) ? chatMembers.data : []);
        if (!member?.ConversationId) {
            toast.error("Missing Conversation ID. Cannot update conversation.");
            handleCloseMenu();
            return;
        }

        // Base flags from current member
        let isPin = member.IsPin || 0;
        let isStar = member.IsStar || 0;
        let isArchived = member.IsArchived || 0;

        if (action === "Pin") {
            isPin = 1;
        } else if (action === "UnPin") {
            isPin = 0;
        }
        if (action === "Star") {
            isStar = 1;
        } else if (action === "UnStar") {
            isStar = 0;
        }
        if (action === "Archive") {
            isArchived = 1;
        } else if (action === "UnArchive") {
            isArchived = 0;
        }
        try {
            const response = await updateConversationApi(auth, {
                page: 1,
                pageSize: 50,
                conversationId: member.ConversationId,
                isPin,
                isStar,
                isArchived,
            });
            if (response?.Status === "200" || response?.success === true) {
                toast.success("Conversation updated");

                // Silent push: Update local state directly
                setChatMembers(prev => {
                    if (!prev?.data) return prev;
                    const index = prev.data.findIndex(m => Number(m.ConversationId) === Number(member.ConversationId));
                    if (index === -1) return prev;

                    const updatedData = [...prev.data];
                    // If archiving, we might want to remove it from the current view unless it's the archive view
                    if (action === "Archive" && !isArchiveOpen) {
                        updatedData.splice(index, 1);
                    } else if (action === "UnArchive" && isArchiveOpen) {
                        updatedData.splice(index, 1);
                    } else {
                        updatedData[index] = {
                            ...updatedData[index],
                            IsPin: isPin,
                            IsStar: isStar,
                            IsArchived: isArchived
                        };
                    }

                    // Re-sort based on new pin/status
                    updatedData.sort(conversationComparator);
                    return { ...prev, data: updatedData };
                });
            } else {
                toast.error("Failed to update conversation");
            }
        } catch (error) {
            console.error("Error updating conversation:", error);
            toast.error("Something went wrong while updating conversation.");
        }
        handleCloseMenu();
    };

    useEffect(() => {
        const conversationId = selectedCustomer?.ConversationId;
        if ((isConversationRead || viewConversationRead) && conversationId) {
            setChatMembers(prev => {
                if (!prev?.data) return prev;
                const index = prev.data.findIndex(m => Number(m.ConversationId) === Number(conversationId));
                if (index === -1) return prev;

                // If it's already 0, skip to avoid unnecessary render
                if (Number(prev.data[index].unreadCount) === 0) return prev;

                const updatedData = [...prev.data];
                updatedData[index] = { ...updatedData[index], unreadCount: 0 };
                return { ...prev, data: updatedData };
            });
        }
    }, [isConversationRead, viewConversationRead, selectedCustomer?.ConversationId]);

    const totalUnread = useMemo(() => {
        return chatMembers?.data?.reduce((acc, curr) => {
            const count = Number(curr.unreadCount ?? curr.UnreadCount ?? 0);
            return acc + (count > 0 ? 1 : 0);
        }, 0) || 0;
    }, [chatMembers?.data]);

    useFaviconBadge(totalUnread);

    return (
        <Box className="customer_lists_mainDiv" ref={containerRef} sx={{ position: 'relative' }}>
            {!isOnline && <Box className="offline-sidebar-overlay" />}
            <Helmet>
                <title>{totalUnread > 0 ? `(${totalUnread}) TeCoChat` : 'TeCoChat'}</title>
            </Helmet>
            <Box className="customer_lists_header">
                <Box className="add_conv_box">
                    {isArchiveOpen && (
                        <IconButton
                            onClick={() => navigate(-1)}
                            size="small"
                            className='add_conv'
                        >
                            <ArrowLeft size={24} />
                        </IconButton>
                    )}
                    <Typography variant="h6" className="header_title">
                        {isArchiveOpen ? 'Archived Chats' : 'Chats'}
                    </Typography>
                </Box>
                {!isArchiveOpen && (
                    <Box className="add_conv_box">
                        <Tooltip title="New Chat" arrow>
                            <IconButton
                                onClick={() => setShowNewChat(true)}
                                size="small"
                                className="add_conv"
                            >
                                <MapsUgcIcon />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Create Group" arrow>
                            <IconButton
                                onClick={() => setShowCreateGroup(true)}
                                size="small"
                                className="add_conv group_add"
                            >
                                <GroupAddIcon />
                            </IconButton>
                        </Tooltip>
                    </Box>
                )}
            </Box>

            <NotificationPermissionBar />

            {/* Search Input */}
            <Box className="customer_lists_search">
                <TextField
                    fullWidth
                    placeholder={isArchiveOpen ? "Search archived" : "Search conversations"}
                    variant="outlined"
                    size="small"
                    value={searchTerm}
                    onChange={handleSearchChange}
                    onKeyDown={handleKeyDown}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <Search fontSize="small" />
                            </InputAdornment>
                        ),
                        endAdornment: searchTerm && (
                            <InputAdornment
                                position="end"
                                style={{ cursor: 'pointer' }}
                                onClick={() => {
                                    setSearchTerm('');
                                    loadMembers(1, true, '');
                                }}
                            >
                                <Clear fontSize="small" />
                            </InputAdornment>
                        ),
                    }}
                />
            </Box>

            {showNewChat && (
                <Box className="new-chat-overlay">
                    <AddConversation
                        onBack={() => setShowNewChat(false)}
                        onClose={() => setShowNewChat(false)}
                        onCustomerSelect={(customer) => {
                            onCustomerSelect(customer);
                            setShowNewChat(false);
                        }}
                        selectedStatus={selectedStatus}
                        selectedTag={selectedTag}
                    />
                </Box>
            )}
            {showCreateGroup && (
                <Box className="new-chat-overlay">
                    <CreateGroup
                        onBack={() => setShowCreateGroup(false)}
                        onClose={() => setShowCreateGroup(false)}
                        onContinue={(result) => {
                            setShowCreateGroup(false);
                            const rd = result?.response?.Data?.rd?.[0] || result?.response?.rd?.[0];
                            const newConvId = rd?.ConversationId || result?.response?.Data?.rd?.ConversationId;

                            if (newConvId) {
                                pendingSelectConversationIdRef.current = newConvId;

                                // Silent push: Create a dummy "new group" item for the list
                                const now = new Date().toISOString();
                                const newGroupItem = {
                                    ConversationId: newConvId,
                                    ConversationName: result.name || "New Group",
                                    name: result.name || "New Group",
                                    IsGroup: 1,
                                    LastMessage: "Group created",
                                    LastMessageType: 1, // Text
                                    LastMessageDate: now,
                                    LastUpdatedDate: now,
                                    DateTime: now,
                                    UnreadCount: 0,
                                    unreadCount: 0,
                                    IsAdmin: 1, // Creator is admin
                                    GroupMembers: result.members || [],
                                    isStatusChange: false // We want it to show as a message
                                };

                                window.dispatchEvent(new CustomEvent('UPDATE_CONVERSATION_ITEM', {
                                    detail: newGroupItem
                                }));
                            }
                        }}
                    />
                </Box>
            )}

            {isProfileOpen && (
                <ProfilePanel onBack={() => navigate('/')} />
            )}


            {/* Filters */}
            <Box
                className="customer_lists_filters"
                sx={{
                    borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
                    px: '10px',
                    py: '8px',
                }}
            >
                <Box
                    sx={{
                        width: '100%',
                        display: 'flex',
                        gap: '6px',
                        padding: '6px',
                    }}
                >
                    {[{ label: 'All', value: 0 }, { label: 'Favorite', value: 2 }].map((item) => {
                        const isActive = tabValue === item.value;

                        return (
                            <Button
                                key={item.value}
                                type="button"
                                disableElevation
                                variant="text"
                                aria-pressed={isActive}
                                onClick={() => handleTabChange(item.value)}
                                sx={(theme) => ({
                                    flex: 1,
                                    borderRadius: 2,
                                    textTransform: 'none',
                                    fontSize: '14px',
                                    fontWeight: 600,
                                    lineHeight: 1,
                                    border: '1px solid',
                                    borderColor: isActive ? alpha(theme.palette.borderColor.extraLight, 0.2) : theme.palette.borderColor.extraLight,
                                    color: isActive ? alpha(theme.palette.primary.main, 1) : theme.palette.text.secondary,
                                    backgroundColor: isActive ? alpha(theme.palette.primary.main, 0.14) : 'transparent',
                                    transition: 'background-color 200ms ease, color 200ms ease, transform 200ms ease',
                                    '&:hover': {
                                        backgroundColor: isActive
                                            ? alpha(theme.palette.primary.main, 0.18)
                                            : alpha(theme.palette.primary.main, 0.08),
                                    },
                                    '&:active': {
                                        transform: 'scale(0.98)',
                                    },
                                })}
                            >
                                {item.label}
                            </Button>
                        );
                    })}
                </Box>
            </Box>

            <Box className="customer_lists_main" >
                <ul ref={containerRef}>
                    {archivedCount > 0 && !searchTerm && !isArchiveOpen && tabValue !== 2 && (
                        <li
                            className="member-item archived-row"
                            onClick={() => navigate('/archieve')}
                        >
                            <div className="member-item">
                                <div className="member-avatar">
                                    <div className="archived-icon-wrapper">
                                        <Archive size={20} />
                                    </div>
                                </div>
                                <div className="member-info">
                                    <div className="member-header">
                                        <Typography variant="subtitle1" className="member-name">
                                            Archived
                                        </Typography>
                                        <Typography variant="caption" className="archived-count">
                                            {archivedCount}
                                        </Typography>
                                    </div>
                                </div>
                            </div>
                        </li>
                    )}

                    {loading && (!chatMembers?.data || chatMembers?.data.length === 0) ? (
                        <li
                            style={{
                                textAlign: 'center',
                                display: 'flex',
                                justify_content: 'center',
                                padding: '20px'
                            }}
                        >
                            <CircularProgress />
                        </li>
                    ) : (
                        filteredMembers?.length > 0 ? (
                            <>
                                {mainFilteredMembers
                                    .filter(member => !member.isSearchResult)
                                    .map((member, index) => {
                                        const isSelectedAndReading =
                                            selectedCustomer?.ConversationId === member.ConversationId &&
                                            ((isConversationRead || viewConversationRead) ||
                                                (isConversationRead && viewConversationRead));
                                        const isSelected = selectedCustomer?.ConversationId === member.ConversationId;
                                        const isKeyboardSelected = index === selectedIndex;
                                        const isMenuOpen = Boolean(anchorEl) && selectMember?.ConversationId === member.ConversationId;
                                        const shouldShowUnreadBadge =
                                            member.unreadCount > 0 && !isSelectedAndReading;


                                        return (
                                            <li
                                                key={member.ConversationId}
                                                className={`member-item ${isSelected ? 'active' : ''} ${isSelectedAndReading ? 'reading' : ''} ${isMenuOpen ? 'menu-open' : ''} ${isKeyboardSelected ? 'keyboard-selected' : ''}`}
                                                onClick={() => handleCustomerClick(member)}
                                                onMouseEnter={() => setHoveredId(member.ConversationId)}
                                                onMouseLeave={() => setHoveredId(null)}
                                            >
                                                <div className={`member-item ${isSelected ? 'active' : ''} ${isSelectedAndReading ? 'reading' : ''}`}>
                                                    <div className="member-avatar">
                                                        <ConversationAvatar member={member} />
                                                    </div>

                                                    <div className="member-info">
                                                        <div className="member-header">
                                                            <Typography
                                                                variant="subtitle1"
                                                                className={shouldShowUnreadBadge ? 'member-name-unread' : 'member-name'}
                                                            >
                                                                {highlightText(member.name, searchTerm)}
                                                            </Typography>

                                                            <Typography variant="caption" className="member-time">
                                                                {member?.lastMessageTime}
                                                            </Typography>
                                                        </div>

                                                        <div className="member-message">
                                                            <Typography
                                                                variant="body2"
                                                                className={shouldShowUnreadBadge ? 'last-message-unread' : 'last-message'}
                                                                style={{ display: 'flex', alignItems: 'center' }}
                                                            >
                                                                {typingStates[member.ConversationId] ? (
                                                                    <span className='typing_indecator'>
                                                                        <div className="typing-dots-container sidebar-dots">
                                                                            <div className="typing-dot"></div>
                                                                            <div className="typing-dot"></div>
                                                                            <div className="typing-dot"></div>
                                                                        </div>
                                                                        {member.IsGroup === 1
                                                                            ? `${typingStates[member.ConversationId].userName} is typing...`
                                                                            : 'typing...'}
                                                                    </span>
                                                                ) : (
                                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                        {getMessageStatusIcon(member)}

                                                                        {/* TEXT MESSAGE */}
                                                                        {member.LastMessageType === 1 && (
                                                                            member.LastMessage || 'Text'
                                                                        )}

                                                                        {/* IMAGE */}
                                                                        {member.LastMessageType === 2 && (
                                                                            <>
                                                                                <Image size={12} />
                                                                                <span>Image</span>
                                                                            </>
                                                                        )}

                                                                        {/* VIDEO */}
                                                                        {member.LastMessageType === 3 && (
                                                                            <>
                                                                                <Video size={14} />
                                                                                <span>Video</span>
                                                                            </>
                                                                        )}

                                                                        {/* DOCUMENT */}
                                                                        {member.LastMessageType === 4 && (
                                                                            <>
                                                                                <FileText size={12} />
                                                                                <span>Document</span>
                                                                            </>
                                                                        )}

                                                                        {/* FALLBACK */}
                                                                        {!member.LastMessageType && <span>Text</span>}
                                                                    </span>
                                                                )}

                                                            </Typography>

                                                            <div className="member-trailing">
                                                                {shouldShowUnreadBadge && (
                                                                    <Badge
                                                                        badgeContent={member?.unreadCount ?? member?.UnreadCount}
                                                                        color="primary"
                                                                        className="unread-badge"
                                                                    />
                                                                )}

                                                                <div className="member-actions-bar">
                                                                    {member?.IsPin === 1 &&
                                                                        <Tooltip title={member?.IsPin === 1 ? "Unpin" : "Pin"} arrow>
                                                                            <IconButton
                                                                                size="small"
                                                                                className={`action-btn ${member?.IsPin === 1 ? 'is-on' : ''}`}
                                                                            >
                                                                                <Pin size={17} />
                                                                            </IconButton>
                                                                        </Tooltip>
                                                                    }
                                                                    {((favoriteState[member.ConversationId]?.isStar ?? member?.IsStar) === 1) &&
                                                                        <Tooltip title="Unfavorite" arrow>
                                                                            <IconButton
                                                                                size="small"
                                                                                className="action-btn is-on"
                                                                            >
                                                                                <Star size={17} />
                                                                            </IconButton>
                                                                        </Tooltip>
                                                                    }
                                                                    {(hoveredId === member.ConversationId || isSelected || isMenuOpen) &&
                                                                        <Tooltip
                                                                            title="More"
                                                                            arrow
                                                                        >
                                                                            <IconButton
                                                                                className={'action-btn'}
                                                                                size="small"
                                                                                tabIndex={(hoveredId === member.ConversationId || isSelected || isMenuOpen) ? 0 : -1}
                                                                                aria-hidden={!(hoveredId === member.ConversationId || isSelected || isMenuOpen)}
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();

                                                                                    if (!(hoveredId === member.ConversationId || isSelected || isMenuOpen)) return;

                                                                                    setAnchorEl(e.currentTarget);
                                                                                    setSelectMember(member);
                                                                                    onConversationList(Array.isArray(chatMembers?.data) ? chatMembers.data : []);
                                                                                }}
                                                                            >
                                                                                <ChevronDown size={17} />
                                                                            </IconButton>
                                                                        </Tooltip>
                                                                    }
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </li>
                                        );
                                    })}

                                {/* Search Results Group */}
                                {searchTerm && filteredMembers.some(m => m.isSearchResult) && (
                                    <div className="search-results-group">
                                        {mainFilteredMembers
                                            .filter(member => member.isSearchResult)
                                            .map((member) => {
                                                const memberIdx = mainFilteredMembers.indexOf(member);
                                                const isKeyboardSelectedResult = memberIdx === selectedIndex;
                                                return (
                                                    <li
                                                        key={`search-${member.Id}`}
                                                        className={`member-item search-result ${isKeyboardSelectedResult ? 'keyboard-selected' : ''}`}
                                                        onClick={() => onCustomerSelect(member)}
                                                    >
                                                        <div className="member-avatar">
                                                            <ConversationAvatar member={member} />
                                                        </div>
                                                        <div className="member-info">
                                                            <div className="member-name" style={{ fontWeight: 500, fontSize: '15px', color: '#111827' }}>
                                                                {highlightText(member.name, searchTerm)}
                                                            </div>
                                                            {(member.email || member.UserEmail) && (
                                                                <div className="member-email" style={{ fontSize: '13px', color: '#6b7280', marginTop: '2px' }}>
                                                                    {highlightText(member.email || member.UserEmail, searchTerm)}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </li>
                                                );
                                            })}
                                    </div>
                                )}
                            </>
                        ) : (
                            !loading && (
                                <li
                                    style={{
                                        textAlign: 'center',
                                        display: 'flex',
                                        justifyContent: 'center',
                                        padding: '20px'
                                    }}
                                >
                                    <Typography variant="body2" color="textSecondary">
                                        No conversations found.
                                    </Typography>
                                </li>
                            )
                        )
                    )}

                    {/* ✅ Show pagination loader only when fetching next pages */}
                    {loading && chatMembers?.data?.length > 0 && hasMore && (
                        <li
                            style={{
                                textAlign: 'center',
                                display: 'flex',
                                justifyContent: 'center',
                                padding: '10px'
                            }}
                        >
                            <Typography variant="caption" color="textSecondary">
                                Loading more...
                            </Typography>
                        </li>
                    )}

                    {/* {loading && chatMembers?.data?.length > 0 && currentPage > 0 && ( */}
                    {currentPage > 1 && (
                        <li style={{ textAlign: 'center', display: "flex", justifyContent: "center", padding: '20px' }}>
                            <Typography variant="body2" color="textSecondary">
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    padding: '20px',
                                    borderBottom: '1px solid #e0e0e0',
                                    gap: "15px",
                                }}>
                                    <CircularProgress size={35} />
                                    Loading more conversations...
                                </div>
                            </Typography>
                        </li>
                    )}
                </ul>
                <WhatsAppMenu
                    anchorEl={anchorEl}
                    open={Boolean(anchorEl)}
                    onClose={handleCloseMenu}
                    items={getCustomerListMenuItems(selectMember)}
                    onAction={handleMenuAction}
                    context={selectMember}
                />
            </Box>
        </Box >
    );
};

export default CustomerLists;