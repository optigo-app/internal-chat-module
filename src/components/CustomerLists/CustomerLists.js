import React, { useState, useCallback, useRef, useEffect, useMemo, useContext } from 'react';
import { Box, Button, Typography, Skeleton, CircularProgress } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Archive } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import toast from 'react-hot-toast';

import './CustomerLists.scss';
import { LoginContext } from '../../context/LoginData';
import { useArchieveContext } from '../../contexts/ArchieveContext';
import { useFavorite } from '../../contexts/FavoriteContext';
import useOnlineStatus from '../../utils/internetCheck';
import useFaviconBadge from '../../hooks/useFaviconBadge';
import { getCustomerDisplayName, highlightText } from '../../utils/globalFunc';
import { updateConversationApi } from '../../API/SendMessage/updateConversationApi';

import WhatsAppMenu from '../ReusableComponent/WhatsAppMenu';
import NotificationPermissionBar from '../_ui/NotificationPermissionBar';
import AddConversation from '../AddConversation/AddConversation';
import CreateGroup from '../AddConversation/CreateGroup';
import ProfilePanel from '../ProfileAvatar/ProfilePanel';
import ConversationAvatar from '../ReusableComponent/ConversationAvatar';

import { useConversationList } from '../../hooks/useConversationList';
import { getCustomerListMenuItems, conversationComparator } from './CustomerListFunc';
import ConversationItem from './ConversationItem';
import CustomerListsHeader from './CustomerListsHeader';

const CustomerLists = ({
    onCustomerSelect = () => { },
    selectedCustomer = null,
    selectedStatus = 'All',
    selectedTag = 'All',
    isConversationRead = false,
    viewConversationRead = false,
    onConversationList = () => { }
}) => {
    const isOnline = useOnlineStatus();
    const location = useLocation();
    const navigate = useNavigate();
    const { addArchieve } = useArchieveContext();
    const { auth } = useContext(LoginContext);
    const { favoriteState } = useFavorite();

    const [searchTerm, setSearchTerm] = useState('');
    const [tabValue, setTabValue] = useState(0);
    const [anchorEl, setAnchorEl] = useState(null);
    const [selectMember, setSelectMember] = useState({});
    const [hoveredId, setHoveredId] = useState(null);
    const [showNewChat, setShowNewChat] = useState(false);
    const [showCreateGroup, setShowCreateGroup] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const containerRef = useRef(null);
    const clickTimeoutRef = useRef(null);

    const {
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
    } = useConversationList({
        selectedCustomer,
        isConversationRead,
        viewConversationRead,
        onCustomerSelect,
        onConversationList,
        searchTerm,
        setSearchTerm
    });

    const isArchiveOpen = location.pathname === '/archieve';
    const isProfileOpen = location.pathname === '/profile';

    const handleCloseMenu = () => setAnchorEl(null);

    const handleTabChange = (newValue) => {
        if (newValue === null || newValue === undefined) return;
        setTabValue(newValue);
    };

    const getFilteredMembers = useCallback((isForArchiveOverlay) => {
        if (!chatMembers?.data) return [];
        return chatMembers.data
            .filter((member) => {
                // Search results (contacts/rd1) should always show when searching, 
                // ignoring current tab/archive filters to ensure all API results are visible
                if (member.isSearchResult) return true;

                // Archive filter for existing conversations
                const archiveMatch = isForArchiveOverlay ? member.IsArchived === 1 : member.IsArchived !== 1;
                if (!archiveMatch) return false;

                // Tab filters for existing conversations
                const isFavoriteStatus = (favoriteState[member.ConversationId]?.isStar ?? member.IsStar) === 1;
                let tabMatch = true;
                switch (tabValue) {
                    case 2: tabMatch = isFavoriteStatus; break;
                    case 3: tabMatch = member.IsGroup === 1; break;
                    default: tabMatch = true;
                }
                if (!tabMatch) return false;

                // Local search filter for existing conversations
                const displayName = String(getCustomerDisplayName(member) || '').toLowerCase();
                const email = String(member.DisplayEmail || member.UserEmail || member.email || '').toLowerCase();
                const mobile = String(member.MobileNo || member.CustomerPhone || member.phone || '').toLowerCase();
                
                const haystack = `${displayName} ${email} ${mobile}`;
                return haystack.includes(searchTerm.toLowerCase());
            })
            ?.filter((member) => {
                if (member.isSearchResult) return true;
                if (!selectedStatus || selectedStatus === 'All') return true;
                const statusKey = selectedStatus.toLowerCase();
                const isFavoriteStatus = (favoriteState[member.ConversationId]?.isStar ?? member.IsStar) === 1;
                return member.ticketStatus === statusKey || (isFavoriteStatus && statusKey === 'favorite');
            })
            ?.filter((member) => {
                if (member.isSearchResult) return true;
                if (!selectedTag || selectedTag === 'All') return true;
                return member.tags && member.tags.some(tag => tag.TagId === selectedTag.Id);
            }) || [];
    }, [chatMembers, favoriteState, searchTerm, tabValue, selectedStatus, selectedTag]);

    const filteredMembers = useMemo(() => getFilteredMembers(isArchiveOpen), [getFilteredMembers, isArchiveOpen]);

    useEffect(() => {
        setSelectedIndex(-1);
    }, [searchTerm, tabValue, selectedStatus, selectedTag]);

    useEffect(() => {
        let timeout;
        if (!loading && chatMembers.data !== null && filteredMembers.length === 0) {
            timeout = setTimeout(() => setShowEmptyState(true), 1000);
        } else {
            setShowEmptyState(false);
        }
        return () => clearTimeout(timeout);
    }, [loading, chatMembers.data, filteredMembers.length, setShowEmptyState]);

    const archivedCount = useMemo(() => chatMembers?.data?.filter(m => m.IsArchived === 1)?.length || 0, [chatMembers?.data]);

    useEffect(() => {
        addArchieve(archivedCount);
    }, [archivedCount, addArchieve]);

    const scrollToSelectedIndex = useCallback((index) => {
        if (containerRef.current && index >= 0) {
            const container = containerRef.current;
            const items = container.querySelectorAll('.member-item');
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

    const handleCustomerClick = useCallback((member) => {
        if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);
        clickTimeoutRef.current = setTimeout(() => onCustomerSelect(member), 300);
    }, [onCustomerSelect]);

    const handleKeyDown = (e) => {
        if (!filteredMembers?.length) return;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => {
                const next = prev < filteredMembers.length - 1 ? prev + 1 : prev;
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
            if (selectedIndex >= 0 && selectedIndex < filteredMembers.length) {
                handleCustomerClick(filteredMembers[selectedIndex]);
            }
        }
    };

    const handleMenuAction = async (action, member) => {
        setSelectMember(member);
        onConversationList(Array.isArray(chatMembers?.data) ? chatMembers.data : []);
        if (!member?.ConversationId) {
            toast.error("Missing Conversation ID.");
            handleCloseMenu();
            return;
        }

        let isPin = member.IsPin || 0;
        let isStar = member.IsStar || 0;
        let isArchived = member.IsArchived || 0;

        if (action === "Pin") isPin = 1; else if (action === "UnPin") isPin = 0;
        if (action === "Star") isStar = 1; else if (action === "UnStar") isStar = 0;
        if (action === "Archive") isArchived = 1; else if (action === "UnArchive") isArchived = 0;

        const actionMessages = {
            Pin: "Conversation pinned 📌", UnPin: "Conversation unpinned",
            Star: "Conversation added to favorites ⭐", UnStar: "Conversation removed from favorites",
            Archive: "Conversation archived 🗂️", UnArchive: "Conversation unarchived"
        };

        try {
            const response = await updateConversationApi(auth, {
                page: 1, pageSize: 50, conversationId: member.ConversationId, isPin, isStar, isArchived,
            });
            if (response?.Status === "200" || response?.success === true) {
                toast.success(actionMessages[action] || "Conversation updated");
                setChatMembers(prev => {
                    if (!prev?.data) return prev;
                    const index = prev.data.findIndex(m => Number(m.ConversationId) === Number(member.ConversationId));
                    if (index === -1) return prev;
                    const updatedData = [...prev.data];
                    updatedData[index] = { ...updatedData[index], IsPin: isPin, IsStar: isStar, IsArchived: isArchived };
                    updatedData.sort(conversationComparator);
                    return { ...prev, data: updatedData };
                });
            } else {
                toast.error("Failed to update conversation");
            }
        } catch (error) {
            console.error("Error updating conversation:", error);
            toast.error("Something went wrong.");
        }
        handleCloseMenu();
    };

    const handleScroll = useCallback(() => {
        if (!containerRef.current || loading || !hasMore) return;
        const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
        if (scrollTop + clientHeight >= scrollHeight - 80) loadMembers(currentPage + 1);
    }, [loading, hasMore, currentPage, loadMembers]);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;
        container.addEventListener('scroll', handleScroll);
        return () => container.removeEventListener('scroll', handleScroll);
    }, [handleScroll]);

    const totalUnread = useMemo(() => {
        return chatMembers?.data?.reduce((acc, curr) => {
            const count = Number(curr.unreadCount ?? curr.UnreadCount ?? 0);
            return acc + (count > 0 ? 1 : 0);
        }, 0) || 0;
    }, [chatMembers?.data]);

    useFaviconBadge(totalUnread);

    return (
        <Box className="customer_lists_mainDiv" sx={{ position: 'relative' }}>
            {!isOnline && <Box className="offline-sidebar-overlay" />}
            <Helmet>
                <title>{totalUnread > 0 ? `(${totalUnread}) TeCoChat` : 'TeCoChat'}</title>
            </Helmet>

            <CustomerListsHeader
                isArchiveOpen={isArchiveOpen}
                searchTerm={searchTerm}
                handleSearchChange={handleSearchChange}
                handleKeyDown={handleKeyDown}
                loadMembers={loadMembers}
                setShowNewChat={setShowNewChat}
                setShowCreateGroup={setShowCreateGroup}
                navigate={navigate}
            />

            <NotificationPermissionBar />

            {showNewChat && (
                <Box className="new-chat-overlay">
                    <AddConversation
                        onBack={() => setShowNewChat(false)}
                        onClose={() => setShowNewChat(false)}
                        onCustomerSelect={(customer) => { onCustomerSelect(customer); setShowNewChat(false); }}
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
                                const now = new Date().toISOString();
                                window.dispatchEvent(new CustomEvent('UPDATE_CONVERSATION_ITEM', {
                                    detail: {
                                        ConversationId: newConvId, ConversationName: result.name || "New Group",
                                        name: result.name || "New Group", IsGroup: 1, LastMessage: "Group created",
                                        LastMessageType: 1, LastMessageDate: now, LastUpdatedDate: now,
                                        DateTime: now, UnreadCount: 0, unreadCount: 0, IsAdmin: 1,
                                        GroupMembers: result.members || [], isStatusChange: false
                                    }
                                }));
                            }
                        }}
                    />
                </Box>
            )}

            {isProfileOpen && <ProfilePanel onBack={() => navigate('/')} />}

            <Box className="customer_lists_filters" sx={{ borderBottom: '1px solid rgba(0, 0, 0, 0.08)', px: '10px', py: '8px' }}>
                <Box sx={{ width: '100%', display: 'flex', gap: '6px', padding: '6px' }}>
                    {[{ label: 'All', value: 0 }, { label: 'Groups', value: 3 }, { label: 'Favorite', value: 2 }].map((item) => {
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
                                    flex: 1, borderRadius: 2, textTransform: 'none', fontSize: '14px', fontWeight: 600, lineHeight: 1, border: '1px solid',
                                    borderColor: isActive ? alpha(theme.palette.borderColor.extraLight, 0.2) : theme.palette.borderColor.extraLight,
                                    color: isActive ? alpha(theme.palette.primary.main, 1) : theme.palette.text.secondary,
                                    backgroundColor: isActive ? alpha(theme.palette.primary.main, 0.14) : 'transparent',
                                    transition: 'background-color 200ms ease, color 200ms ease, transform 200ms ease',
                                    '&:hover': { backgroundColor: isActive ? alpha(theme.palette.primary.main, 0.18) : alpha(theme.palette.primary.main, 0.08) },
                                    '&:active': { transform: 'scale(0.98)' },
                                })}
                            >
                                {item.label}
                            </Button>
                        );
                    })}
                </Box>
            </Box>

            <Box className="customer_lists_main" ref={containerRef}>
                <ul>
                    {archivedCount > 0 && !searchTerm && !isArchiveOpen && tabValue !== 2 && (
                        <li className="member-item archived-row" onClick={() => navigate('/archieve')}>
                            <div className="member-item">
                                <div className="member-avatar">
                                    <div className="archived-icon-wrapper"><Archive size={20} /></div>
                                </div>
                                <div className="member-info">
                                    <div className="member-header">
                                        <Typography variant="subtitle1" className="member-name">Archived</Typography>
                                        <Typography variant="caption" className="archived-count">{archivedCount}</Typography>
                                    </div>
                                </div>
                            </div>
                        </li>
                    )}

                    {((loading || chatMembers.data === null) || (filteredMembers.length === 0 && !showEmptyState)) ? (
                        <>
                            {[...Array(12)].map((_, i) => (
                                <li key={i} className="member-item" style={{ pointerEvents: 'none' }}>
                                    <div className="member-item">
                                        <div className="member-avatar"><Skeleton variant="circular" width={48} height={48} /></div>
                                        <div className="member-info" style={{ flexGrow: 1 }}>
                                            <div className="member-header"><Skeleton variant="text" width="60%" height={24} /><Skeleton variant="text" width="40px" height={16} /></div>
                                            <div className="member-message"><Skeleton variant="text" width="80%" height={16} /></div>
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </>
                    ) : filteredMembers?.length > 0 ? (
                        <>
                            {filteredMembers
                                .filter(member => !member.isSearchResult)
                                .map((member, index) => (
                                    <ConversationItem
                                        key={member.ConversationId}
                                        member={member}
                                        isSelected={selectedCustomer?.ConversationId === member.ConversationId}
                                        isSelectedAndReading={selectedCustomer?.ConversationId === member.ConversationId && (isConversationRead || viewConversationRead)}
                                        isKeyboardSelected={index === selectedIndex}
                                        isMenuOpen={Boolean(anchorEl) && selectMember?.ConversationId === member.ConversationId}
                                        shouldShowUnreadBadge={member.unreadCount > 0 && !(selectedCustomer?.ConversationId === member.ConversationId && (isConversationRead || viewConversationRead))}
                                        typingStates={typingStates}
                                        drafts={drafts}
                                        hoveredId={hoveredId}
                                        searchTerm={searchTerm}
                                        handleCustomerClick={handleCustomerClick}
                                        setHoveredId={setHoveredId}
                                        setAnchorEl={setAnchorEl}
                                        setSelectMember={setSelectMember}
                                        onConversationList={onConversationList}
                                        chatMembersData={chatMembers?.data}
                                        favoriteState={favoriteState}
                                    />
                                ))}

                            {searchTerm && filteredMembers.some(m => m.isSearchResult) && (
                                <div className="search-results-group">
                                    {filteredMembers
                                        .filter(member => member.isSearchResult)
                                        .map((member) => (
                                            <li key={`search-${member.Id}`} className={`member-item search-result ${filteredMembers.indexOf(member) === selectedIndex ? 'keyboard-selected' : ''}`} onClick={() => onCustomerSelect(member)}>
                                                <div className="member-avatar"><ConversationAvatar member={member} /></div>
                                                <div className="member-info">
                                                    <div className="member-name" style={{ fontWeight: 500, fontSize: '15px', color: '#111827' }}>{highlightText(member.name, searchTerm)}</div>
                                                    {(member.email || member.UserEmail) && <div className="member-email" style={{ fontSize: '13px', color: '#6b7280', marginTop: '2px' }}>{highlightText(member.email || member.UserEmail, searchTerm)}</div>}
                                                </div>
                                            </li>
                                        ))}
                                </div>
                            )}
                        </>
                    ) : showEmptyState && (
                        <li style={{ textAlign: 'center', display: 'flex', justifyContent: 'center', padding: '20px' }}>
                            <Typography variant="body2" color="textSecondary">No conversations found.</Typography>
                        </li>
                    )}

                    {loading && chatMembers?.data?.length > 0 && hasMore && (
                        <li style={{ textAlign: 'center', display: 'flex', justifyContent: 'center', padding: '10px' }}>
                            <Typography variant="caption" color="textSecondary">Loading more...</Typography>
                        </li>
                    )}
                    {currentPage > 1 && (
                        <li style={{ textAlign: 'center', display: "flex", justifyContent: "center", padding: '20px' }}>
                            <Typography variant="body2" color="textSecondary">
                                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px', borderBottom: '1px solid #e0e0e0', gap: "15px" }}>
                                    <CircularProgress size={35} /> Loading more conversations...
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