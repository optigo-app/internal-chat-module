import { FileText, Image, Video, ArrowLeft, Pin, ChevronDown, Star, Archive } from 'lucide-react';
import toast from 'react-hot-toast';
import { CheckCheck } from "lucide-react";
import { useLocation, useNavigate } from 'react-router-dom';
import { LoginContext } from '../../context/LoginData';
import { useArchieveContext } from '../../contexts/ArchieveContext';
import React, { useEffect, useState, useCallback, useRef, useContext } from 'react';
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
import PersonIcon from '@mui/icons-material/Person';
import './CustomerLists.scss';
import { fetchConversationLists } from '../../API/ConverLists/ConversationLists';
import { formatChatTimestamp } from '../../utils/DateFnc';
import { getCustomerAvatarSeed, getCustomerDisplayName, getWhatsAppAvatarConfig, hasCustomerName } from '../../utils/globalFunc';
import WhatsAppMenu from '../ReusableComponent/WhatsAppMenu';
import { getMessagePreview, processApiResponse, getCustomerListMenuItems } from './CustomerListFunc';
import { updateConversationApi } from '../../API/SendMessage/updateConversationApi';
import { updateChatCache } from '../Conversation/conversationUtils';
import { addInternalMessageHandler, addInternalStatusHandler } from '../../socket';
import { Helmet } from 'react-helmet-async';
import { notify } from '../../utils/notificationTemplates';
import NotificationPermissionBar from '../_ui/NotificationPermissionBar';
import AddConversation from '../AddConversation/AddConversation';
import CreateGroup from '../AddConversation/CreateGroup';
import useOnlineStatus from '../../utils/internetCheck';
import useFaviconBadge from '../../hooks/useFaviconBadge';

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
    const [tempConversationId, setTempConversationId] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [anchorEl, setAnchorEl] = useState(null);
    const [selectMember, setSelectMember] = useState({});
    const [hoveredId, setHoveredId] = useState(null);
    const [showNewChat, setShowNewChat] = useState(false);
    const [showCreateGroup, setShowCreateGroup] = useState(false);
    const containerRef = useRef(null);
    const pageSize = 100;
    const searchTimeoutRef = useRef(null);
    const fetchControllerRef = useRef(null);
    const clickTimeoutRef = useRef(null);
    const pendingSelectConversationIdRef = useRef(null);
    const { auth, isSyncing } = useContext(LoginContext);

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

            // Process both rd and rd1 data
            const currentConversations = processApiResponse(response.data?.rd || []);
            const searchResults = response.data?.rd1?.map(customer => ({
                ...customer,
                ConversationId: customer.CustomerId,
                Id: customer.CustomerId,
                ReceiverId: customer.ReceiverId,
                name: customer.CustomerName || customer.CustomerPhone,
                lastMessage: '',
                lastMessageText: '',
                lastMessageTimeValue: customer?.LastMessageDate || customer?.LastUpdatedDate || new Date().toISOString(),
                lastMessageTime: formatChatTimestamp(customer?.LastMessageDate || customer?.LastUpdatedDate || new Date().toISOString()),
                unreadCount: 0,
                isSearchResult: true
            })) || [];

            // Combine both, but keep them separate for rendering
            const mergedConversations = searchToUse
                ? [
                    ...searchResults,
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
                            // Server list uses "Local Time as LastUpdatedDate" (e.g., 10:40 Z) but socket sends UTC (05:10 Z).
                            // We need to generate a timestamp that matches the list's "Local" magnitude to ensure it sorts to top.
                            const now = new Date();
                            const offset = now.getTimezoneOffset() * 60000;
                            const localISO = new Date(now.getTime() - offset).toISOString();
                            return localISO;
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

    const getFilteredMembers = (isForArchiveOverlay) => {
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
                const isFavorite = member.IsStar === 1;
                switch (tabValue) {
                    case 2: return isFavorite && tabValue === 2;
                    default: return true;
                }
            })
            ?.filter((member) => {
                if (!selectedStatus || selectedStatus === 'All') return true;
                const statusKey = selectedStatus.toLowerCase();
                const isFavorite = member.IsStar === 1;
                return member.ticketStatus === statusKey || (isFavorite && statusKey === 'favorite');
            })
            ?.filter((member) => {
                if (!selectedTag || selectedTag === 'All') return true;
                return member.tags && member.tags.some(tag => tag.TagId === selectedTag.Id);
            });
    };

    const isArchiveOpen = location.pathname === '/archieve';
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
                loadMembers(currentPage, true);
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

        if ((isConversationRead || viewConversationRead) && conversationId !== tempConversationId) {
            setTempConversationId(conversationId);
            loadMembers(currentPage, true);
        }
    }, [isConversationRead, viewConversationRead, selectedCustomer?.ConversationId, tempConversationId]);

    const totalUnread = chatMembers?.data?.reduce((acc, curr) => {
        const count = Number(curr.unreadCount ?? curr.UnreadCount ?? 0);
        return acc + (count > 0 ? 1 : 0);
    }, 0) || 0;

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
                        {isArchiveOpen ? 'Archived Chats' : 'Chat Members'}
                    </Typography>
                </Box>

                {!isArchiveOpen && (
                    <Box className="add_conv_box">
                        <IconButton onClick={() => setShowNewChat(true)} size="small" className='add_conv'>
                            <MapsUgcIcon />
                        </IconButton>
                        <IconButton onClick={() => setShowCreateGroup(true)} size="small" className='add_conv group_add'>
                            <GroupAddIcon />
                        </IconButton>
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
                        onContinue={(selected) => {
                            console.log('Final selected members for group:', selected);
                            // logic for next step or API call
                            setShowCreateGroup(false);
                        }}
                    />
                </Box>
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
                                {filteredMembers
                                    .filter(member => !member.isSearchResult)
                                    .map((member) => {
                                        const isSelectedAndReading =
                                            selectedCustomer?.ConversationId === member.ConversationId &&
                                            ((isConversationRead || viewConversationRead) ||
                                                (isConversationRead && viewConversationRead));
                                        const isSelected = selectedCustomer?.ConversationId === member.ConversationId;
                                        const isMenuOpen = Boolean(anchorEl) && selectMember?.ConversationId === member.ConversationId;
                                        const shouldShowUnreadBadge =
                                            member.unreadCount > 0 && !isSelectedAndReading;

                                        let lastMessageData = [];
                                        if (member.LastMessage) {
                                            try {
                                                const parsed = JSON.parse(member.LastMessage);
                                                lastMessageData = Array.isArray(parsed) ? parsed : [parsed];
                                            } catch (e) {
                                                lastMessageData = [];
                                            }
                                        }
                                        return (
                                            <li
                                                key={member.ConversationId}
                                                className={`member-item ${isSelected ? 'active' : ''} ${isSelectedAndReading ? 'reading' : ''} ${isMenuOpen ? 'menu-open' : ''}`}
                                                onClick={() => handleCustomerClick(member)}
                                                onMouseEnter={() => setHoveredId(member.ConversationId)}
                                                onMouseLeave={() => setHoveredId(null)}
                                            >
                                                <div className={`member-item ${isSelected ? 'active' : ''} ${isSelectedAndReading ? 'reading' : ''}`}>
                                                    <div className="member-avatar">
                                                        {!hasCustomerName(member) ? (
                                                            <Avatar
                                                                {...getWhatsAppAvatarConfig(getCustomerAvatarSeed(member))}
                                                            >
                                                                <PersonIcon fontSize="small" />
                                                            </Avatar>
                                                        ) : (
                                                            <Avatar {...member.avatarConfig} />
                                                        )}
                                                    </div>

                                                    <div className="member-info">
                                                        <div className="member-header">
                                                            <Typography
                                                                variant="subtitle1"
                                                                className={shouldShowUnreadBadge ? 'member-name-unread' : 'member-name'}
                                                            >
                                                                {member.name}
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
                                                                    {member?.IsStar === 1 &&
                                                                        <Tooltip title={member?.IsStar === 1 ? "Unfavorite" : "favorite"} arrow>
                                                                            <IconButton
                                                                                size="small"
                                                                                className={`action-btn ${member?.IsStar === 1 ? 'is-on' : ''}`}
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
                                        <div className="group-header">Start New Conversation</div>
                                        {filteredMembers
                                            .filter(member => member.isSearchResult)
                                            .map((member) => (
                                                <li
                                                    key={`search-${member.Id}`}
                                                    className="member-item search-result"
                                                    onClick={() => onCustomerSelect(member)}
                                                >
                                                    <div className="member-avatar">
                                                        {!hasCustomerName(member) ? (
                                                            <Avatar
                                                                {...getWhatsAppAvatarConfig(getCustomerAvatarSeed(member))}
                                                            >
                                                                <PersonIcon fontSize="small" />
                                                            </Avatar>
                                                        ) : (
                                                            <Avatar {...getWhatsAppAvatarConfig(member.name)} />
                                                        )}
                                                    </div>
                                                    <div className="member-details">
                                                        <div className="member-name">
                                                            {member.name}
                                                        </div>
                                                    </div>
                                                </li>
                                            ))}
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