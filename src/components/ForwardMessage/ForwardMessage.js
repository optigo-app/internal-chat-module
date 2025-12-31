import React, { useState, useRef, useEffect, useContext, useMemo, useCallback, useDeferredValue } from 'react';
import {
    TextField,
    Avatar,
    Box,
    Button,
    Chip,
    Typography,
    IconButton,
    ClickAwayListener,
    MenuItem,
    ListItemAvatar,
    ListItemText,
    Checkbox,
    InputAdornment,
} from '@mui/material';
import {
    Close as CloseIcon,
    Send as SendIcon,
    Search as SearchIcon,
    ArrowForward as ArrowForwardIcon,
    KeyboardArrowUp as KeyboardArrowUpIcon,
    KeyboardArrowDown as KeyboardArrowDownIcon,
} from '@mui/icons-material';
import { List } from 'react-window';
import { LoginContext } from '../../context/LoginData';
import { getForwardListApi } from '../../API/SendMessage/forwardlistApi';
import { getWhatsAppAvatarConfig } from '../../utils/globalFunc';
import './ForwardMessage.scss';

const ForwardMessage = ({ message, onSend, onClose, anchorEl, open }) => {
    const [selectedContacts, setSelectedContacts] = useState([]);
    const [chipsExpanded, setChipsExpanded] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const deferredSearchTerm = useDeferredValue(searchTerm);
    const [position, setPosition] = useState({ top: 0, left: 0 });
    const menuRef = useRef(null);
    const contactsContainerRef = useRef(null);
    const listRef = useRef(null);
    const [loading, setLoading] = useState(false);
    const { auth } = useContext(LoginContext);
    const [chatMembers, setChatMembers] = useState({ data: [], total: 0, currentPage: 1, hasMore: false });
    const CONTACTS_LIST_HEIGHT = 220;

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

            const mappedContacts = safeItems.map((item) => ({
                Type: item.Type,
                ConversationId: item.ConversationId,
                UserId: item.UserId,
                DisplayName: item.DisplayName,
                ProfileImageUrl: item.ProfileImageUrl,
                id: item.UserId || item.ConversationId,
            }));

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

    const handleRemoveContact = useCallback((contactId) => {
        setSelectedContacts(prev => prev.filter(c => c.id !== contactId));
    }, []);

    const MAX_VISIBLE_CHIPS = 3;
    const displayedSelectedContacts = useMemo(() => {
        return chipsExpanded ? selectedContacts : selectedContacts.slice(0, MAX_VISIBLE_CHIPS);
    }, [chipsExpanded, selectedContacts]);
    const hiddenSelectedCount = selectedContacts.length - displayedSelectedContacts.length;

    const handleExpandChips = useCallback(() => {
        setChipsExpanded(true);
    }, []);

    const handleCollapseChips = useCallback(() => {
        setChipsExpanded(false);
    }, []);

    useEffect(() => {
        if (selectedContacts.length <= MAX_VISIBLE_CHIPS && chipsExpanded) {
            setChipsExpanded(false);
        }
        if (selectedContacts.length === 0 && chipsExpanded) {
            setChipsExpanded(false);
        }
    }, [chipsExpanded, selectedContacts.length]);

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

    const ROW_HEIGHT = 44;

    const Row = useCallback(({ index, style, items, selectedIds, onSelect }) => {
        const contact = items?.[index];
        if (!contact) return null;
        const isSelected = selectedIds.has(contact.id);

        return (
            <MenuItem
                onClick={() => onSelect(contact)}
                className={`fm-contactItem ${isSelected ? 'isSelected' : ''}`}
                style={style}
            >
                <ListItemAvatar sx={{ minWidth: 40 }}>
                    <Avatar
                        src={contact?.ProfileImageUrl || undefined}
                        {...getWhatsAppAvatarConfig(contact?.DisplayName, 32)}
                    />
                </ListItemAvatar>
                <ListItemText
                    primary={contact.DisplayName}
                    primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: 500 }}
                />
                <Checkbox
                    size="small"
                    checked={isSelected}
                />
            </MenuItem>
        );
    }, []);

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
            className="forwardMessageMenu"
            style={{ left: `${position.left}px`, top: `${position.top}px` }}
        >
            <ClickAwayListener onClickAway={handleClickAway}>
                <div>
                    {/* Header */}
                    <div className="fm-header">
                        <div className="fm-headerLeft">
                            <ArrowForwardIcon fontSize="small" className="fm-headerIcon" />
                            <Typography className="fm-title">Forward to</Typography>
                        </div>
                        <IconButton size="small" onClick={onClose} className="fm-closeBtn">
                            <CloseIcon fontSize="small" />
                        </IconButton>
                    </div>

                    {/* Search Field */}
                    <div className="fm-search">
                        <TextField
                            fullWidth
                            size="small"
                            placeholder="Search contacts..."
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
                    {selectedContacts.length > 0 && (
                        <div className={`fm-selected ${chipsExpanded ? 'isExpanded' : 'isCollapsed'}`}>
                            {displayedSelectedContacts.map((contact) => (
                                <Chip
                                    key={contact.id}
                                    label={contact.DisplayName}
                                    onDelete={() => handleRemoveContact(contact.id)}
                                    size="small"
                                    className="fm-chip"
                                />
                            ))}

                            {!chipsExpanded && hiddenSelectedCount > 0 && (
                                <Chip
                                    size="small"
                                    label={`+${hiddenSelectedCount} more`}
                                    onClick={handleExpandChips}
                                    className="fm-chip fm-chipMore"
                                />
                            )}

                            {chipsExpanded && selectedContacts.length > MAX_VISIBLE_CHIPS && (
                                <Chip
                                    size="small"
                                    label="Show less"
                                    onClick={handleCollapseChips}
                                    className="fm-chip fm-chipMore"
                                />
                            )}
                        </div>
                    )}

                    {/* Contact List */}
                    <Box className="fm-contacts" ref={contactsContainerRef}>
                        {filteredContacts.length === 0 ? (
                            <div className="fm-empty">
                                <div className="fm-emptyText">No matches found</div>
                            </div>
                        ) : (
                            <>
                                <List
                                    listRef={listRef}
                                    rowComponent={Row}
                                    rowCount={filteredContacts.length}
                                    rowHeight={ROW_HEIGHT}
                                    rowProps={{
                                        items: filteredContacts,
                                        selectedIds,
                                        onSelect: handleContactSelect,
                                    }}
                                    style={{ height: CONTACTS_LIST_HEIGHT, width: '100%' }}
                                />
                            </>
                        )}
                    </Box>

                    {/* Action Buttons */}
                    <div className="fm-actions">
                        <Button
                            size="small"
                            onClick={onClose}
                            variant="contained"
                            className="secondaryBtnClassname"
                        >
                            Cancel
                        </Button>
                        <Button
                            size="small"
                            onClick={handleSend}
                            disabled={selectedContacts.length === 0}
                            startIcon={<SendIcon fontSize="small" />}
                            variant="contained"
                            className="primaryBtnClassname fm-sendBtn"
                        >
                            Send
                        </Button>
                    </div>
                </div>
            </ClickAwayListener>
        </div>
    );
};

export default ForwardMessage;
