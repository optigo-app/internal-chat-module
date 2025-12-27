import { addMessageHandler, addMessageHandlerFromAssigningUser, addStatusHandler, getSocket, isSocketConnected } from '../../socket';
import { FileText, Image, Video, Clock3, ArrowLeft, Pin, UserPlus, ChevronDown, Star } from 'lucide-react';
import { pinConversationApi } from '../../API/PinConversation/PinConversation';
import toast from 'react-hot-toast';
import { Check, CheckCheck, AlertCircle } from "lucide-react";
import { unPinConversationApi } from '../../API/unPinConversation/UnPinConversation';
import { favoriteApi } from '../../API/FavoriteApi/FavoriteApi';
import { unFavoriteApi } from '../../API/UnFavoriteApi/UnFavoriteApi';
import { useLocation, useNavigate } from 'react-router-dom';
import { archieveApi } from '../../API/ArchieveAPi/ArchieveApi';
import { unArchieveApi } from '../../API/UnArchieveApi/UnArchieveApi';
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
import { Clear, KeyboardArrowDown, Search } from '@mui/icons-material';
import PersonIcon from '@mui/icons-material/Person';
import './CustomerLists.scss';
import { fetchConversationLists } from '../../API/ConverLists/ConversationLists';
import { formatChatTimestamp } from '../../utils/DateFnc';
import { getCustomerAvatarSeed, getCustomerDisplayName, getWhatsAppAvatarConfig, hasCustomerName } from '../../utils/globalFunc';
import AddCustomerDialog from '../AddCustomerDialog/AddCustomerDialog';
import WhatsAppMenu from '../ReusableComponent/WhatsAppMenu';
import { getMessagePreview, processApiResponse, getCustomerListMenuItems } from './CustomerListFunc';

const CustomerLists = ({ onCustomerSelect = () => { }, selectedCustomer = null, selectedStatus = 'All', selectedTag = 'All', isConversationRead = false, viewConversationRead = false, onConversationList = () => { } }) => {
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
    const [addCustomerDialogOpen, setAddCustomerDialogOpen] = useState(false);
    const [selectedMemberForDialog, setSelectedMemberForDialog] = useState(null);
    const [hoveredId, setHoveredId] = useState(null);
    const containerRef = useRef(null);
    const pageSize = 100;
    const searchTimeoutRef = useRef(null);
    const { auth, PERMISSION_SET, isSyncing } = useContext(LoginContext);

    const handleCloseMenu = () => {
        setAnchorEl(null);
    };


    const loadMembers = useCallback(async (page = 1, reset = false, search = null) => {
        if (loading || (!reset && !hasMore)) return;

        if (!auth?.token || !auth?.userId) {
            console.log('⚠️ No auth token available, skipping conversation load');
            return;
        }
        setLoading(true);

        try {
            const searchToUse = search !== null ? search : searchTerm;
            const response = await fetchConversationLists(page, pageSize, auth, searchToUse);

            // Process both rd and rd1 data
            const currentConversations = processApiResponse(response.data?.rd || []);
            const searchResults = response.data?.rd1?.map(customer => ({
                ...customer,
                ConversationId: customer.CustomerId,
                Id: customer.CustomerId,
                name: customer.CustomerName || customer.CustomerPhone,
                lastMessage: '',
                lastMessageText: '',
                lastMessageTime: new Date().toISOString(),
                unreadCount: 0,
                isSearchResult: true // Flag to identify search results
            })) || [];

            // Combine both, but keep them separate for rendering
            const mergedConversations = searchToUse
                ? [
                    ...searchResults,
                    ...currentConversations
                ]
                : currentConversations;

            // Sort by last message time (newest first)
            const sortedConversations = mergedConversations.sort((a, b) => {
                return new Date(b.lastMessageTime) - new Date(a.lastMessageTime);
            });

            setChatMembers(prev => ({
                data: reset ? sortedConversations : [...(prev.data || []), ...sortedConversations],
                total: Math.max(response.total, sortedConversations.length)
            }));

            const moreAvailable = response?.hasMore ?? sortedConversations.length > 0;
            setHasMore(moreAvailable);

            if (moreAvailable) setCurrentPage(page);
        } catch (error) {
            console.error('Error loading members:', error);
        } finally {
            setLoading(false);
        }
    }, [loading, pageSize, processApiResponse, searchTerm]);

    // Effect to refresh customer list when sync completes
    useEffect(() => {
        if (isSyncing === false) {
            // Refresh the customer list when sync completes
            loadMembers(1, true);
        }
    }, [isSyncing]);

    // Create a stable reference for socket callbacks
    const loadMembersRef = useRef(loadMembers);
    useEffect(() => {
        loadMembersRef.current = loadMembers;
    }, [loadMembers]);

    const debouncedSearch = useCallback((value) => {
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        searchTimeoutRef.current = setTimeout(() => {
            loadMembers(1, true, value); // ✅ Pass the latest search value explicitly
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
            debouncedSearch(value); // ✅ Uses latest input
        }
    };

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

    const filteredMembers =
        chatMembers?.data
            ?.filter((member) => {
                if (location.pathname === '/archieve') {
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
                    case 1: return member.ticketStatus === 'escalated';
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

    const archivedCount = chatMembers?.data?.filter(m => m.IsArchived === 1)?.length || 0;

    const getMessageStatusIcon = (member) => {
        if (member?.lastMessageDirection !== 1) return null;

        const status = typeof member?.lastMessageStatus === 'number' ? member.lastMessageStatus : -1;

        switch (status) {
            case 0: // Queued/Sending
                return <Clock3 size={14} style={{ marginRight: 5, color: "#9e9e9e" }} />;

            case 1: // Sent (single grey tick)
                return <Check size={15} style={{ marginRight: 5, color: "#9e9e9e" }} />;

            case 2: // Delivered (double grey tick)
                return <CheckCheck size={15} style={{ marginRight: 5, color: "#9e9e9e" }} />;

            case 3: // Read (double blue tick)
                return <CheckCheck size={15} style={{ marginRight: 5, color: "#1F51FF" }} />;

            case 4: // Failed
                return <AlertCircle size={14} style={{ marginRight: 5, color: "#ff4444" }} />;

            default:
                return null;
        }
    };

    useEffect(() => {
        addArchieve(archivedCount);
    }, [chatMembers]);

    const handlePinChat = async (member, shouldPin) => {
        if (!member?.ConversationId || !member?.UserId) {
            toast.error("Missing Conversation ID or User ID. Cannot pin/unpin this chat.");
            return;
        }
        try {
            if (shouldPin === "Pin") {
                const pinnedCount = chatMembers.data?.filter(m => m.IsPin === 1).length || 0;
                if (pinnedCount >= 3) {
                    toast.error("You can only pin up to 3 chats. Please unpin a chat first.");
                    return;
                }
            }

            const response = shouldPin === "Pin"
                ? await pinConversationApi(member.ConversationId, member.UserId, auth?.userId)
                : await unPinConversationApi(member.ConversationId, member.UserId, auth?.userId);

            if (response?.Status === "200") {
                toast.success(`Chat ${shouldPin === "Pin" ? 'pinned' : 'unpinned'} successfully`);
                loadMembers(currentPage, true);
            } else {
                toast.error(`Failed to ${shouldPin === "Pin" ? 'pin' : 'unpin'} chat`);
            }
        } catch (error) {
            console.error("Error handling pin chat", error);
            toast.error("Something went wrong while pinning/unpinning the chat.");
        }
    };

    const handleFavoriteChat = async (member, shouldFavorite) => {
        if (!member?.ConversationId || !member?.UserId) {
            toast.error("Missing Conversation ID or User ID. Cannot pin/unpin this chat.");
            return;
        }

        try {
            const response = shouldFavorite === "Favorite"
                ? await favoriteApi(member.ConversationId, member.UserId, auth?.userId)
                : await unFavoriteApi(member.ConversationId, member.UserId, auth?.userId);

            if (response?.Status === "200") {
                toast.success(`Chat ${shouldFavorite === "Favorite" ? 'favorited' : 'unfavorited'} successfully`);
                loadMembers(currentPage, true);
            } else {
                toast.error(`Failed to ${shouldFavorite === "Favorite" ? 'favorite' : 'unfavorite'} chat`);
            }
        } catch (error) {
            console.error("Error handling favorite chat", error);
            toast.error("Something went wrong while favoriting/unfavoriting the chat.");
        }
    };

    const handleArchieveChat = async (member, shouldArchieve) => {
        if (!member?.ConversationId || !member?.UserId) {
            toast.error("Missing Conversation ID or User ID. Cannot archive/unarchive this chat.");
            return;
        }

        try {
            const response = shouldArchieve === "Archive"
                ? await archieveApi(member.ConversationId, member.UserId, auth?.userId)
                : await unArchieveApi(member.ConversationId, member.UserId, auth?.userId);

            if (response?.Status === "200") {
                toast.success(`Chat ${shouldArchieve === "Archive" ? 'archived' : 'unarchived'} successfully`);
                loadMembers(currentPage, true);
            } else {
                toast.error(`Failed to ${shouldArchieve === "Archive" ? 'archive' : 'unarchive'} chat`);
            }
        } catch (error) {
            console.error("Error handling favorite chat", error);
            toast.error("Something went wrong while archiving/unarchiving the chat.");
        }
    };

    const handleAddCustomer = (member) => {
        if (!member?.CustomerPhone) {
            toast.error("Missing customer phone number. Cannot add customer.");
            return;
        }

        setSelectedMemberForDialog(member);
        setAddCustomerDialogOpen(true);
    };

    const handleCloseAddCustomerDialog = () => {
        setAddCustomerDialogOpen(false);
        setSelectedMemberForDialog(null);
    };

    const handleAddCustomerSuccess = () => {
        loadMembers(currentPage, true);
    };

    const handleMenuAction = (action, member) => {
        setSelectMember(member);
        onConversationList(member);

        if (action === "Pin" || action === "UnPin") {
            handlePinChat(member, action === "Pin" ? "Pin" : "UnPin");
        }

        if (action === "Star" || action === "UnStar") {
            handleFavoriteChat(member, action === "Star" ? "Favorite" : "UnFavorite");
        }

        if (action === "Archive" || action === "UnArchive") {
            handleArchieveChat(member, action === "Archive" ? "Archive" : "UnArchive", loadMembers, currentPage);
        }

        if (action === "AddCustomer") {
            handleAddCustomer(member);
        }

        handleCloseMenu();
    };

    const handleSocketUpdate = (data, isStatusChange = false) => {
        setChatMembers((prev) => {
            if (!prev?.data) return prev;

            const updatedData = [...prev.data];
            const index = updatedData.findIndex(
                (member) => Number(member.ConversationId) === Number(data?.ConversationId)
            );

            const messagePreview = getMessagePreview(data);
            const messagePreviewText = messagePreview?.text ?? '';
            const messagePreviewNode = messagePreview?.node ?? '';
            const formattedTime = formatChatTimestamp(data?.DateTime);

            if (index !== -1) {
                const currentChat = updatedData[index];

                const isSameMessage =
                    currentChat.lastMessageText === messagePreviewText &&
                    currentChat.lastMessageTime === formattedTime;

                if (isSameMessage && !isStatusChange) {
                    return prev;
                }

                const updatedChat = {
                    ...currentChat,
                    lastMessage: messagePreviewNode,
                    lastMessageText: messagePreviewText,
                    lastMessageTime: formattedTime,
                    lastMessageStatus: data?.Status ?? data?.status ?? currentChat.lastMessageStatus,
                    lastMessageDirection: data?.Direction ?? currentChat.lastMessageDirection,
                };

                if (!isStatusChange) {
                    updatedChat.unreadCount = (currentChat.unreadCount || 0) + 1;
                }

                if (isStatusChange && data?.Status === 1) {
                    updatedChat.unreadCount = 0;
                }

                updatedData.splice(index, 1);
                if (!isStatusChange) {
                    updatedData.unshift(updatedChat);
                } else {
                    updatedData.splice(index, 0, updatedChat);
                }
            } else {
                const newChat = {
                    ConversationId: data?.ConversationId,
                    name: getCustomerDisplayName(data),
                    lastMessage: messagePreviewNode,
                    lastMessageText: messagePreviewText,
                    lastMessageTime: formattedTime,
                    lastMessageStatus: data?.Status ?? data?.status,
                    lastMessageDirection: data?.Direction,
                    unreadCount: isStatusChange ? 0 : 1,
                    avatar: null,
                    avatarConfig: getWhatsAppAvatarConfig(getCustomerAvatarSeed(data)),
                };
                updatedData.unshift(newChat);
            }

            return { ...prev, data: updatedData };
        });
    };

    // Optimized socket listener setup - only depend on auth token, not currentPage
    useEffect(() => {
        if (!auth?.token || !auth?.userId) return;

        const handleNewMessage = (data) => handleSocketUpdate(data, false);
        const handleStatusChange = (data) => handleSocketUpdate(data, true);
        const handleNewMessageFromAssigningUser = (data) => handleSocketUpdate(data, false);

        const removeMessageHandler = addMessageHandler(handleNewMessage);
        const removeStatusHandler = addStatusHandler(handleStatusChange);
        const removeMessageHandlerFromAssigningUser =
            addMessageHandlerFromAssigningUser(handleNewMessageFromAssigningUser);

        return () => {
            removeMessageHandler();
            removeStatusHandler();
            removeMessageHandlerFromAssigningUser();
        };
    }, [auth?.token, auth?.userId]);

    useEffect(() => {
        const conversationId = selectedCustomer?.ConversationId;

        if ((isConversationRead || viewConversationRead) && conversationId !== tempConversationId) {
            setTempConversationId(conversationId);
            loadMembers(currentPage, true);
        }
    }, [isConversationRead, viewConversationRead, selectedCustomer?.ConversationId, tempConversationId]);

    return (
        <div className="customer_lists_mainDiv">
            <div className="customer_lists_header">
                {location?.pathname === "/archieve" ? (
                    <div className="header-archive">
                        <IconButton
                            className="back-button"
                            onClick={() => navigate(-1)}
                            size="small"
                        >
                            <ArrowLeft />
                        </IconButton>
                        <Typography variant="h6" className="header_title_archieve">Archived Chats</Typography>
                    </div>
                ) : (
                    <Typography variant="h6" className="header_title">Chat Members</Typography>
                )}

                <Chip
                    label={`${archieve} archive`}
                    size="small"
                    color="primary"
                    variant="outlined"
                    onClick={() => navigate('/archieve')}
                />
            </div>

            {/* Search Input */}
            <div className="customer_lists_search">
                <TextField
                    fullWidth
                    placeholder="Search conversations"
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
            </div>

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
                    {[{ label: 'All', value: 0 }, { label: 'Escalated', value: 1 }, { label: 'Favorite', value: 2 }].map((item) => {
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

            <div className="customer_lists_main" >
                <ul ref={containerRef}>
                    {loading && (!chatMembers?.data || chatMembers?.data.length === 0) ? (
                        <li
                            style={{
                                textAlign: 'center',
                                display: 'flex',
                                justifyContent: 'center',
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
                                                // When LastMessage is now just plain text (new API),
                                                // fall back to an empty array so type-based preview
                                                // below will show "Text".
                                                lastMessageData = [];
                                            }
                                        }
                                        return (
                                            <li
                                                key={member.ConversationId}
                                                className={`member-item ${isSelected ? 'active' : ''} ${isSelectedAndReading ? 'reading' : ''} ${isMenuOpen ? 'menu-open' : ''}`}
                                                onClick={() => onCustomerSelect(member)}
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

                                                            {(member?.lastMessageText && member?.lastMessageText !== 'No message') && (
                                                                <Typography variant="caption" className="member-time">
                                                                    {member?.lastMessageTime}
                                                                </Typography>
                                                            )}
                                                        </div>

                                                        <div className="member-message">
                                                            <Typography
                                                                variant="body2"
                                                                className={shouldShowUnreadBadge ? 'last-message-unread' : 'last-message'}
                                                                style={{ display: 'flex', alignItems: 'center' }}
                                                            >
                                                                <span style={{ display: 'flex', alignItems: 'center' }}>
                                                                    {getMessageStatusIcon(member)}
                                                                    {member.lastMessageText !== 'No message' ? (
                                                                        member.lastMessage
                                                                    ) : (
                                                                        <span
                                                                            style={{
                                                                                display: 'inline-flex',
                                                                                alignItems: 'center',
                                                                                gap: '4px'
                                                                            }}
                                                                        >
                                                                            {lastMessageData?.[0]?.MessageType === 'image' && (
                                                                                <>
                                                                                    <Image size={12} /> Image
                                                                                </>
                                                                            )}
                                                                            {lastMessageData?.[0]?.MessageType === 'video' && (
                                                                                <>
                                                                                    <Video size={14} /> Video
                                                                                </>
                                                                            )}
                                                                            {lastMessageData?.[0]?.MessageType === 'document' && (
                                                                                <>
                                                                                    <FileText size={12} /> Document
                                                                                </>
                                                                            )}
                                                                            {!lastMessageData?.[0]?.MessageType && 'Text'}
                                                                        </span>
                                                                    )}
                                                                </span>
                                                            </Typography>

                                                            <div className="member-trailing">
                                                                {shouldShowUnreadBadge && (
                                                                    <Badge
                                                                        badgeContent={member?.UnreadCount}
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
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    handlePinChat(member, member?.IsPin === 1 ? "UnPin" : "Pin");
                                                                                }}
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
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    handlePinChat(member, member?.IsStar === 1 ? "UnStar" : "Star");
                                                                                }}
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
                                                                                    onConversationList(member);
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

                {/* Add Customer Dialog */}
                <AddCustomerDialog
                    open={addCustomerDialogOpen}
                    onClose={handleCloseAddCustomerDialog}
                    selectedMember={selectedMemberForDialog}
                    auth={auth}
                    onSuccess={handleAddCustomerSuccess}
                />
            </div>
        </div >
    );
};

export default CustomerLists;