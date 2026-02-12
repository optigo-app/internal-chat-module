import { useEffect, useState, useCallback, useRef, useContext } from 'react';
import {
    Avatar,
    Typography,
    TextField,
    InputAdornment,
    Box,
    Button,
    IconButton
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Search, Clear, Person as PersonIcon, ChatBubbleOutline, ArrowBack, } from '@mui/icons-material';
import { X } from 'lucide-react';
import './AddConversation.scss';
import { getCustomerAvatarSeed, getCustomerDisplayName, getWhatsAppAvatarConfig, hasCustomerName } from '../../utils/globalFunc';
import { fetchCustomerLists } from '../../API/CustomerLists/CustomerLists';
import { useLocation } from 'react-router-dom';
import { LoginContext } from '../../context/LoginData';

const AddConversation = ({ onCustomerSelect = () => { }, selectedCustomer = null, selectedTag, selectedStatus = 'All', onClose, onBack }) => {

    const [searchTerm, setSearchTerm] = useState('');
    const [tabValue, setTabValue] = useState(0);
    const [chatMembers, setChatMembers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const location = useLocation();
    const [currentPage, setCurrentPage] = useState(1);
    const containerRef = useRef(null);
    const pageSize = 100;
    const searchTimeoutRef = useRef(null);
    const { auth } = useContext(LoginContext);

    const transformMemberData = useCallback((items) => {
        return items?.map((item) => {
            const name = item.UserName || getCustomerDisplayName(item);
            return {
                ...item,
                UserId: item.UserId,
                ConversationName: item.ConversationName || item.UserName || item.CustomerName || item.name || '',
                CustomerPhone: item.CustomerPhone || item.UserPhone || item.MobileNo || item.Phone || '',
                name,
                email: item.UserEmail || '',
                avatar: null,
                avatarConfig: getWhatsAppAvatarConfig(getCustomerAvatarSeed(item)),
            };
        }) || [];
    }, []);

    const loadMembers = useCallback(async (page = 1, reset = false, search = null) => {
        if (loading || (!reset && !hasMore)) return;

        if (!auth?.token || !auth?.userId) {
            console.log('⚠️ No auth token available, skipping conversation load');
            return;
        }

        setLoading(true);
        try {
            const searchToUse = search !== null ? search : searchTerm;
            const response = await fetchCustomerLists(page, pageSize, searchToUse, auth);
            const transformedData = transformMemberData(response.data);

            setChatMembers(prev => ({
                data: reset ? transformedData : [...(prev.data || []), ...transformedData],
                total: response.total
            }));

            const moreAvailable = response?.hasMore ?? transformedData.length > 0;
            setHasMore(moreAvailable);

            if (moreAvailable) setCurrentPage(page);
        } catch (error) {
            console.error('Error loading members:', error);
        } finally {
            setLoading(false);
        }
    }, [loading, pageSize, transformMemberData, searchTerm]);

    useEffect(() => {
        loadMembers(1, true);
        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
        };
    }, []);

    const debouncedSearch = useCallback((value) => {
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }
        searchTimeoutRef.current = setTimeout(() => {
            loadMembers(1, true, value);
        }, 500);
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
            debouncedSearch(value);
        }
    };

    const handleScroll = useCallback(() => {
        if (!containerRef.current || loading || !hasMore) return;

        const { scrollTop, scrollHeight, clientHeight } = containerRef.current;

        if (scrollTop + clientHeight >= scrollHeight - 80) {
            console.log('Scroll triggered - Loading page:', currentPage + 1);
            loadMembers(currentPage + 1, false);
        }
    }, [loading, hasMore, currentPage, loadMembers]);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        container.addEventListener('scroll', handleScroll, { passive: true });
        return () => container.removeEventListener('scroll', handleScroll);
    }, [handleScroll]);

    const handleTabChange = (newValue) => {
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
                // Hide currently logged in user
                const myId = Number(auth?.id ?? auth?.userId);
                const memberId = Number(member?.UserId ?? member?.id);
                return myId !== memberId;
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
            })

    return (
        <div className="customer_lists_mainDiv_2">
            <div className="customer_lists_header">
                <Box className="add_conv_box">
                    {onBack && (
                        <IconButton onClick={onBack} size="small" className='add_conv'>
                            <ArrowBack size={20} />
                        </IconButton>
                    )}
                    <Typography variant="h6" className="header_title">New Chat</Typography>
                </Box>
                {onClose && (
                    <IconButton onClick={onClose} size="small" className='add_conv'>
                        <X size={20} />
                    </IconButton>
                )}
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

            {/* Filters - match inbox customer_lists_filters */}
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

            <div className="customer_lists_main">
                <ul ref={containerRef}>
                    <>
                        {loading && (!chatMembers?.data || chatMembers?.data.length === 0) ? (
                            <li style={{ textAlign: 'center', padding: '20px' }}>
                                <Typography variant="body2" color="textSecondary">
                                    Loading conversations...
                                </Typography>
                            </li>
                        ) : filteredMembers?.length > 0 ? (
                            filteredMembers.map((member) => {
                                const isSelected = selectedCustomer?.UserId === member.UserId;

                                return (
                                    <li key={member.UserId}>
                                        <div
                                            className={`member-item ${isSelected ? 'active' : ''}`}
                                            onClick={() => onCustomerSelect(member)}
                                        >
                                            <div className="member-avatar">
                                                {member.ProfileImageUrl ? (
                                                    <Avatar src={member.ProfileImageUrl} />
                                                ) : (
                                                    !hasCustomerName(member) ? (
                                                        <Avatar
                                                            {...getWhatsAppAvatarConfig(getCustomerAvatarSeed(member))}
                                                        >
                                                            <PersonIcon fontSize="small" />
                                                        </Avatar>
                                                    ) : (
                                                        <Avatar {...member.avatarConfig} />
                                                    )
                                                )}
                                            </div>
                                            <div className="member-info">
                                                <div className="member-header">
                                                    <Typography variant="subtitle1" className="member-name">
                                                        {member.name}
                                                    </Typography>
                                                </div>
                                                <div className="member-message">
                                                    <Typography variant="body2" className="last-message">
                                                        {member.email || member.UserEmail || ''}
                                                    </Typography>
                                                </div>
                                            </div>
                                        </div>
                                    </li>
                                );
                            })
                        ) : (
                            <li style={{ textAlign: 'center', padding: '20px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                                    <ChatBubbleOutline sx={{ fontSize: 34, color: 'rgba(0,0,0,0.35)' }} />
                                    <Typography variant="body2" color="textSecondary">
                                        No conversations found.
                                    </Typography>
                                </div>
                            </li>
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
                    </>
                </ul>
            </div>
        </div>
    )
}

export default AddConversation
