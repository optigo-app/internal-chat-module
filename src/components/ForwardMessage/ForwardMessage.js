import React, { useState, useRef, useEffect, useContext, useMemo, useCallback, useDeferredValue } from 'react';
import {
    TextField,
    Avatar,
    Box,
    Typography,
    IconButton,
    ClickAwayListener,
    MenuItem,
    ListItemAvatar,
    ListItemText,
    Checkbox,
    InputAdornment,
    useTheme,
} from '@mui/material';
import {
    Close as CloseIcon,
    Send as SendIcon,
    Search as SearchIcon,
    CheckBox as CheckBoxIcon,
    CheckBoxOutlineBlank as CheckBoxOutlineBlankIcon,
} from '@mui/icons-material';
import { FixedSizeList } from 'react-window';
import { LoginContext } from '../../context/LoginData';
import { getForwardListApi } from '../../API/SendMessage/forwardlistApi';
import { getWhatsAppAvatarConfig } from '../../utils/globalFunc';
import './ForwardMessage.scss';

const ForwardMessage = ({ message, onSend, onClose, anchorEl, open, isCentered = false }) => {
    const theme = useTheme();
    const [selectedContacts, setSelectedContacts] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const deferredSearchTerm = useDeferredValue(searchTerm);
    const [position, setPosition] = useState({ top: '50%', left: '50%' });
    const menuRef = useRef(null);
    const contactsContainerRef = useRef(null);
    const listRef = useRef(null);
    const [loading, setLoading] = useState(false);
    const { auth } = useContext(LoginContext);
    const [chatMembers, setChatMembers] = useState({ data: [], total: 0, currentPage: 1, hasMore: false });
    const CONTACTS_LIST_HEIGHT = 320;
    const MENU_WIDTH = 360;
    const MENU_HEIGHT = 560;

    const listHeight = useMemo(() => {
        return selectedContacts.length > 0 ? Math.max(180, CONTACTS_LIST_HEIGHT - 60) : CONTACTS_LIST_HEIGHT;
    }, [CONTACTS_LIST_HEIGHT, selectedContacts.length]);

    const selectedIds = useMemo(() => {
        return new Set((selectedContacts || []).map((c) => c?.id).filter(Boolean));
    }, [selectedContacts]);

    const loadMembers = async (reset = false) => {
        if (loading) return;
        if (!auth?.token || (!auth?.userId && !auth?.id)) {
            console.log('⚠️ No auth token available, skipping conversation load');
            return;
        }
        setLoading(true);
        try {
            const response = await getForwardListApi(auth, {
                fLabel: "Forward Message"
            });

            const rawItems = response?.Data?.rd || response?.Data || response?.rd || [];
            const safeItems = Array.isArray(rawItems) ? rawItems : [];

            const mappedContacts = safeItems.map((item) => {

                return {
                    Type: item.Type,
                    ConversationId: item.ConversationId,
                    UserId: item.ReceiverId,
                    DisplayName: (item.UserName || item.DisplayName) ?? '',
                    ProfileImageUrl: item.ProfileImageUrl,
                    id: item.ReceiverId || item.ConversationId,
                    subtitle: item.DisplayName ?? '',
                };
            });

            setChatMembers((prev) => {
                const newData = reset ? mappedContacts : [...(prev?.data || []), ...mappedContacts];
                return {
                    data: newData,
                    total: newData.length,
                    currentPage: 1,
                    hasMore: false
                };
            });
        } catch (error) {
            console.error('Error loading members:', error);
            setChatMembers({ data: [], total: 0, currentPage: 1, hasMore: false });
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        if (open) {
            loadMembers(true);
        } else {
            setSelectedContacts([]);
            setSearchTerm('');
        }
    }, [open, auth?.token, auth?.userId, auth?.id]);

    const contacts = useMemo(() => {
        if (!chatMembers.data) return [];
        return chatMembers.data;
    }, [chatMembers.data]);

    const normalizedSearchTerm = useMemo(() => {
        return String(deferredSearchTerm || '').trim().toLowerCase();
    }, [deferredSearchTerm]);

    const filteredContacts = useMemo(() => {
        if (!normalizedSearchTerm) return contacts;
        return contacts.filter((contact) =>
            String(contact?.DisplayName || '')
                .toLowerCase()
                .includes(normalizedSearchTerm)
        );
    }, [contacts, normalizedSearchTerm]);

    const handleContactSelect = useCallback((contact) => {
        setSelectedContacts(prev => {
            const isSelected = prev.find(c => c.id === contact.id);
            return isSelected ? prev.filter(c => c.id !== contact.id) : [...prev, contact];
        });
    }, []);

    const selectedSummaryText = useMemo(() => {
        return (selectedContacts || [])
            .map((c) => c?.DisplayName)
            .filter(Boolean)
            .join(', ');
    }, [selectedContacts]);

    const handleSend = useCallback(() => {
        if (selectedContacts.length > 0) {
            onSend(selectedContacts);
            onClose();
        }
    }, [onClose, onSend, selectedContacts]);

    useEffect(() => {
        const el = contactsContainerRef.current;
        if (!open) {
            listRef.current = null;
            return;
        }
        if (!el) return;
        if (filteredContacts.length === 0) return;

        const rafId = window.requestAnimationFrame(() => {
            const api = listRef.current;
            if (!api) return;

            if (api.scrollToRow) {
                try {
                    api.scrollToRow({ index: 0, align: 'start' });
                } catch (e1) {
                    try {
                        api.scrollToRow(0);
                    } catch (e2) {
                        // ignore
                    }
                }
            } else if (api.scrollToItem) {
                api.scrollToItem(0, 'start');
            } else if (api.scrollTo) {
                api.scrollTo(0);
            }
        });

        return () => {
            window.cancelAnimationFrame(rafId);
        };
    }, [open, normalizedSearchTerm, filteredContacts.length]);

    const ROW_HEIGHT = 64;

    const Row = useCallback(({ index, style }) => {
        const contact = filteredContacts?.[index];
        if (!contact) return null;
        const isSelected = selectedIds.has(contact.id);

        return (
            <MenuItem
                onClick={() => handleContactSelect(contact)}
                className={`fm-contactItem ${isSelected ? 'isSelected' : ''}`}
                style={style}
            >
                <Checkbox
                    size="small"
                    checked={isSelected}
                    className="fm-rowCheckbox"
                    disableRipple
                    icon={<CheckBoxOutlineBlankIcon fontSize="small" />}
                    checkedIcon={<CheckBoxIcon fontSize="small" />}
                    sx={{
                        color: 'rgba(0,0,0,0.35)',
                        '&.Mui-checked': {
                            color: theme.palette.primary.main
                        }
                    }}
                />
                <ListItemAvatar sx={{ minWidth: 40 }}>
                    <Avatar
                        src={contact?.ProfileImageUrl || undefined}
                        {...getWhatsAppAvatarConfig(contact?.DisplayName, 32)}
                    />
                </ListItemAvatar>
                <ListItemText
                    primary={contact.DisplayName}
                    secondary={contact?.subtitle || ''}
                    primaryTypographyProps={{ fontSize: '0.95rem', fontWeight: 600 }}
                    secondaryTypographyProps={{ fontSize: '0.8rem' }}
                />
            </MenuItem>
        );
    }, [filteredContacts, selectedIds, handleContactSelect, theme]);

    useEffect(() => {
        if (open) {
            if (isCentered || !anchorEl) {
                setPosition({ top: '50%', left: '50%' });
                return;
            }

            const rect = anchorEl.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;

            let left = rect.left;
            let top = rect.bottom + window.scrollY + 8;

            if (left + MENU_WIDTH > viewportWidth) left = Math.max(8, viewportWidth - MENU_WIDTH - 8);
            if (top + MENU_HEIGHT > viewportHeight + window.scrollY)
                top = Math.max(8, rect.top + window.scrollY - MENU_HEIGHT - 8);

            setPosition({ left, top });
        }
    }, [open, anchorEl, MENU_HEIGHT, MENU_WIDTH, isCentered]);

    const handleClickAway = (event) => {
        if (menuRef.current && !menuRef.current.contains(event.target)) {
            onClose();
        }
    };

    if (!open) return null;

    return (
        <div
            ref={menuRef}
            className={`forwardMessageMenu ${isCentered || !anchorEl ? 'isCentered' : ''}`}
            style={{
                left: typeof position.left === 'string' ? position.left : `${position.left}px`,
                top: typeof position.top === 'string' ? position.top : `${position.top}px`
            }}
        >
            <ClickAwayListener onClickAway={handleClickAway}>
                <div>
                    {/* Header */}
                    <div className="fm-header">
                        <div className="fm-headerLeft">
                            <IconButton size="small" onClick={onClose} className="fm-closeBtn">
                                <CloseIcon fontSize="small" />
                            </IconButton>
                            <Typography className="fm-title">Forward message to</Typography>
                        </div>
                    </div>

                    {/* Search Field */}
                    <div className="fm-search">
                        <TextField
                            fullWidth
                            size="small"
                            placeholder="Search name or number"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon fontSize="small" />
                                    </InputAdornment>
                                ),
                            }}
                        />
                    </div>

                    {/* Selected Contacts */}
                    {null}

                    <div className="fm-sectionTitle">Recent chats</div>

                    {/* Contact List */}
                    <Box className="fm-contacts" ref={contactsContainerRef}>
                        {filteredContacts.length === 0 ? (
                            <div className="fm-empty">
                                <div className="fm-emptyText">No matches found</div>
                            </div>
                        ) : (
                            <>
                                <FixedSizeList
                                    ref={listRef}
                                    height={listHeight}
                                    itemCount={filteredContacts.length}
                                    itemSize={ROW_HEIGHT}
                                    width="100%"
                                >
                                    {Row}
                                </FixedSizeList>
                            </>
                        )}
                    </Box>

                    {/* Action Buttons */}
                    {selectedContacts.length > 0 && (
                        <div className="fm-actions">
                            <div className="fm-selectedFooterText" title={selectedSummaryText}>
                                {selectedSummaryText}
                            </div>
                            <IconButton className="fm-sendFab" onClick={handleSend}>
                                <SendIcon fontSize="small" />
                            </IconButton>
                        </div>
                    )}
                </div>
            </ClickAwayListener>
        </div>
    );
};

export default ForwardMessage;
