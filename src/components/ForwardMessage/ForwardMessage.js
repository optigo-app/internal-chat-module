import React, { useState, useRef, useEffect, useCallback, useContext, useMemo } from 'react';
import {
    Paper,
    TextField,
    Avatar,
    Box,
    Button,
    Typography,
    IconButton,
    ClickAwayListener,
    MenuList,
    MenuItem,
    ListItemAvatar,
    ListItemText,
    Checkbox,
    InputAdornment,
    Chip,
} from '@mui/material';
import {
    Close as CloseIcon,
    Send as SendIcon,
    Search as SearchIcon,
    ArrowForward as ArrowForwardIcon,
    Person as PersonIcon
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import { LoginContext } from '../../context/LoginData';
import { fetchConversationLists } from '../../API/ConverLists/ConversationLists';
import { getCustomerAvatarSeed, getCustomerDisplayName, getWhatsAppAvatarConfig, hasCustomerName } from '../../utils/globalFunc';

const ForwardDropdown = styled(Paper)(({ theme }) => ({
    width: '320px',
    maxHeight: '400px',
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
    border: '1px solid #e0e0e0',
    overflow: 'hidden',
    zIndex: 1300,
}));

const DropdownHeader = styled(Box)(({ theme }) => ({
    background: theme.palette.importance?.high?.background,
    color: theme.palette.importance?.high?.text,
    padding: '12px 16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
}));

const SearchContainer = styled(Box)(({ theme }) => ({
    padding: '12px 16px',
    borderBottom: '1px solid #f0f0f0',
}));

const ContactsContainer = styled(Box)(({ theme }) => ({
    maxHeight: '600px',
    overflowY: 'auto',
    '&::-webkit-scrollbar': {
        width: '4px',
    },
    '&::-webkit-scrollbar-thumb': {
        backgroundColor: '#c1c1c1',
        borderRadius: '2px',
    },
}));

const ContactItem = styled(MenuItem)(({ theme }) => ({
    padding: '8px 16px',
    minHeight: '48px',
    transition: 'all 0.15s ease',
    '&:hover': {
        backgroundColor: '#f8f9fa',
    },
    '&.selected': {
        backgroundColor: '#f3ecffff',
        borderLeft: '3px solid #8e4ff3',
    },
}));

const SelectedChipsContainer = styled(Box)(({ theme }) => ({
    padding: '8px 16px',
    borderBottom: '1px solid #f0f0f0',
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
    maxHeight: '80px',
    overflowY: 'auto',
}));

const StyledChip = styled(Chip)(({ theme }) => ({
    height: '24px',
    fontSize: '0.75rem',
    backgroundColor: '#8e4ff3',
    color: 'white',
    '& .MuiChip-deleteIcon': {
        color: 'white',
        fontSize: '16px',
        '&:hover': {
            color: '#f0f0f0',
        },
    },
}));

const ActionButtons = styled(Box)(({ theme }) => ({
    padding: '12px 16px',
    borderTop: '1px solid #f0f0f0',
    display: 'flex',
    gap: '8px',
    justifyContent: 'flex-end',
    backgroundColor: 'white',
    position: 'sticky',
    bottom: 0,
    zIndex: 1,
}));

// Custom hook for debouncing
const useDebounce = (value, delay) => {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);

    return debouncedValue;
};

const ForwardMessage = ({ message, onSend, onClose, anchorEl, open }) => {
    const [selectedContacts, setSelectedContacts] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebounce(searchTerm, 500);
    const [position, setPosition] = useState({ top: 0, left: 0 });
    const menuRef = useRef(null);
    const [loading, setLoading] = useState(false);
    const { auth } = useContext(LoginContext);
    const pageSize = 500;
    const [chatMembers, setChatMembers] = useState({ data: [], total: 0, currentPage: 1, hasMore: false });

    const transformMemberData = (items) => {
        return items?.map((item) => {
            return {
                ...item,
                name: getCustomerDisplayName(item),
                avatar: null,
                avatarConfig: getWhatsAppAvatarConfig(getCustomerAvatarSeed(item)),
                CustomerId: item?.CustomerId,
                CustomerPhone: item?.CustomerPhone,
            };
        }) || [];
    };

    const loadMembers = async (page = 1, reset = false) => {
        if (loading) return;

        // Only load if user is authenticated
        if (!auth?.token || !auth?.userId) {
            console.log('⚠️ No auth token available, skipping conversation load');
            return;
        }

        setLoading(true);
        try {
            const response = await fetchConversationLists(
                page,
                pageSize,
                auth.userId,
                debouncedSearchTerm // Use debounced search term for API call
            );

            if (response && response.data) {
                const transformedData = transformMemberData(response.data?.rd);

                setChatMembers(prev => {
                    const newData = reset ? transformedData : [...(prev?.data || []), ...transformedData];
                    return {
                        data: newData,
                        total: response.total || newData.length,
                        currentPage: page,
                        hasMore: response.hasMore || false
                    };
                });
            } else {
                console.error('Invalid response format:', response);
                setChatMembers({ data: [], total: 0, currentPage: 1, hasMore: false });
            }
        } catch (error) {
            console.error('Error loading members:', error);
            setChatMembers({ data: [], total: 0, currentPage: 1, hasMore: false });
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        if (open) {
            loadMembers(1, true);
        }
    }, [open, auth?.token, auth?.userId, debouncedSearchTerm]);

    // Transform API data to match the expected format
    const contacts = useMemo(() => {
        if (!chatMembers.data) return [];
        return chatMembers.data.map((contact, index) => ({
            id: index + 1,
            name: contact.name,
            avatar: contact.avatar === 'icon' ? null : contact.avatar,
            avatarConfig: contact.avatarConfig,
            CustomerId: contact.CustomerId,
            CustomerPhone: contact.CustomerPhone,
        }));
    }, [chatMembers.data]);

    const filteredContacts = useMemo(() => {
        return contacts.filter(contact =>
            contact.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [contacts, searchTerm]);

    const handleContactSelect = (contact) => {
        setSelectedContacts(prev => {
            const isSelected = prev.find(c => c.id === contact.id);
            return isSelected ? prev.filter(c => c.id !== contact.id) : [...prev, contact];
        });
    };

    const handleRemoveContact = (contactId) => {
        setSelectedContacts(prev => prev.filter(c => c.id !== contactId));
    };

    const handleSend = () => {
        if (selectedContacts.length > 0) {
            onSend(selectedContacts);
            onClose();
        }
    };

    useEffect(() => {
        if (open && anchorEl) {
            const rect = anchorEl.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;

            let left = rect.left;
            let top = rect.bottom + window.scrollY + 8;

            if (left + 320 > viewportWidth) left = viewportWidth - 340;
            if (top + 400 > viewportHeight + window.scrollY)
                top = rect.top + window.scrollY - 400 - 8;

            setPosition({ left, top });
        }
    }, [open, anchorEl]);

    const handleClickAway = (event) => {
        if (menuRef.current && !menuRef.current.contains(event.target)) {
            onClose();
        }
    };

    if (!open) return null;

    return (
        <div
            ref={menuRef}
            style={{
                position: 'fixed',
                left: `${position.left}px`,
                top: `${position.top}px`,
                zIndex: 1400,
                width: '320px',
                maxHeight: '400px',
                backgroundColor: 'white',
                borderRadius: '12px',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
                border: '1px solid #e0e0e0',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            <ClickAwayListener onClickAway={handleClickAway}>
                <div>
                    {/* Header */}
                    <DropdownHeader>
                        <Box display="flex" alignItems="center" gap={1}>
                            <ArrowForwardIcon fontSize="small" />
                            <Typography variant="subtitle1" fontWeight={500}>
                                Forward to
                            </Typography>
                        </Box>
                        <IconButton
                            size="small"
                            onClick={onClose}
                            sx={{ color: 'white', '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)' } }}
                        >
                            <CloseIcon fontSize="small" />
                        </IconButton>
                    </DropdownHeader>

                    {/* Search Field */}
                    <SearchContainer sx={{ padding: "10px 5px" }}>
                        <TextField
                            fullWidth
                            size="small"
                            placeholder="Search contacts..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                                    </InputAdornment>
                                ),
                            }}
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: '20px',
                                    fontSize: '0.875rem',
                                },
                            }}
                        />
                    </SearchContainer>

                    {/* Selected Contacts */}
                    {selectedContacts.length > 0 && (
                        <SelectedChipsContainer>
                            {selectedContacts.map(contact => (
                                <StyledChip
                                    key={contact.id}
                                    label={contact.name}
                                    onDelete={() => handleRemoveContact(contact.id)}
                                    size="small"
                                />
                            ))}
                        </SelectedChipsContainer>
                    )}

                    {/* Contact List */}
                    <ContactsContainer>
                        <MenuList dense>
                            {filteredContacts.map(contact => {
                                const isSelected = selectedContacts.find(c => c.id === contact.id);
                                return (
                                    <ContactItem
                                        key={contact.id}
                                        onClick={() => handleContactSelect(contact)}
                                        className={isSelected ? 'selected' : ''}
                                    >
                                        <ListItemAvatar>
                                            {!hasCustomerName(contact) ? (
                                                <Avatar
                                                    sx={{ width: 32, height: 32 }}
                                                    {...getWhatsAppAvatarConfig(getCustomerAvatarSeed(contact), 32)}
                                                >
                                                    <PersonIcon fontSize="small" />
                                                </Avatar>
                                            ) : (
                                                <Avatar
                                                    sx={{ width: 32, height: 32 }}
                                                    {...getWhatsAppAvatarConfig(getCustomerAvatarSeed(contact), 32)}
                                                />
                                            )}
                                        </ListItemAvatar>
                                        <ListItemText
                                            primary={contact.name}
                                            primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: 500 }}
                                        />
                                        <Checkbox
                                            size="small"
                                            checked={!!isSelected}
                                            sx={{
                                                color: '#8e4ff3',
                                                '&.Mui-checked': { color: '#8e4ff3' },
                                            }}
                                        />
                                    </ContactItem>
                                );
                            })}
                        </MenuList>
                    </ContactsContainer>

                    {/* Action Buttons */}
                    <ActionButtons>
                        <Button
                            size="small"
                            onClick={onClose}
                            sx={{ color: 'text.secondary', minWidth: 'auto' }}
                        >
                            Cancel
                        </Button>
                        <Button
                            size="small"
                            onClick={handleSend}
                            disabled={selectedContacts.length === 0}
                            variant="contained"
                            startIcon={<SendIcon fontSize="small" />}
                            sx={{
                                backgroundColor: '#8e4ff3',
                                fontSize: '0.75rem',
                                minWidth: 'auto',
                                px: 2,
                                '&:hover': { backgroundColor: '#8e4ff3' },
                                '&:disabled': { backgroundColor: '#cccccc' },
                            }}
                        >
                            Send
                        </Button>
                    </ActionButtons>
                </div>
            </ClickAwayListener>
        </div>
    );
};

export default ForwardMessage;
