import React, { useState, useEffect, useContext } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Typography,
    IconButton,
    TextField,
    InputAdornment,
    Box,
    List,
    ListItem,
    ListItemAvatar,
    ListItemText,
    Avatar,
    Checkbox,
    CircularProgress
} from '@mui/material';
import debounce from 'lodash.debounce';
import { Search, X as Clear, Check } from 'lucide-react';
import { fetchCustomerLists } from '../../API/CustomerLists/CustomerLists';
import { PastParticipantListApi } from '../../API/Groups/PastParticipantListApi';
import { LoginContext } from '../../context/LoginData';
import { getCustomerDisplayName, getWhatsAppAvatarConfig } from '../../utils/globalFunc';

const AddMemberDialog = ({ open, onClose, onSubmit, existingMemberIds = [], mode = 'add', groupMembers = [], onMemberClick, preSelectedIds = [], disabledIds = [], conversationId }) => {
    const { auth } = useContext(LoginContext);
    const [searchTerm, setSearchTerm] = useState('');
    const [availableCustomers, setAvailableCustomers] = useState([]);
    const [selectedMembers, setSelectedMembers] = useState([]);
    const pastMembersCacheRef = React.useRef(null);
    const [isLoading, setIsLoading] = useState(false);

    const fetchCustomers = async (search = '') => {
        setIsLoading(true);
        if (mode === 'search' || mode === 'editAdmins') {
            const lowerSearch = search.toLowerCase();
            const filtered = groupMembers.filter(m => {
                const name = getCustomerDisplayName(m).toLowerCase();
                const phone = m.Phone || m.MobileNo || '';
                return name.includes(lowerSearch) || phone.includes(search);
            });
            const transformed = filtered.map(item => ({
                ...item,
                UserId: item.UserId || item.Id || item.id
            }));
            // Sort: admins (disabled/pre-selected) first
            if (mode === 'editAdmins') {
                transformed.sort((a, b) => {
                    const aIsAdmin = disabledIds.includes(a.UserId) ? 1 : 0;
                    const bIsAdmin = disabledIds.includes(b.UserId) ? 1 : 0;
                    return bIsAdmin - aIsAdmin;
                });
            }
            setAvailableCustomers(transformed);
            setIsLoading(false);
            return;
        }

        if (mode === 'viewPastParticipants') {
             let data = pastMembersCacheRef.current;
             if (!data && conversationId) {
                 try {
                     const response = await PastParticipantListApi(auth, { conversationId });
                     data = response?.Data?.rd || response?.rd || [];
                     pastMembersCacheRef.current = data;
                 } catch (err) {
                     data = [];
                 }
             }
             const lowerSearch = search.toLowerCase();
             const filtered = (data || []).filter(m => {
                 const name = (m.MemberName || m.DisplayName || m.Name || '').toLowerCase();
                 const email = (m.DisplayEmail || m.Email || '').toLowerCase();
                 return name.includes(lowerSearch) || email.includes(lowerSearch);
             });
             const transformed = filtered.map(item => ({
                 ...item,
                 UserId: item.UserId || item.Id || item.id,
                 DisplayName: item.MemberName || item.Name || 'User',
                 DisplayEmail: item.DisplayEmail || item.Email || ''
             }));
             setAvailableCustomers(transformed);
             setIsLoading(false);
             return;
        }

        try {
            const res = await fetchCustomerLists(1, 100, search, auth);
            if (res?.data) {
                const transformed = res.data.map(item => ({
                    ...item,
                    UserId: item.UserId || item.Id || item.id
                }));
                setAvailableCustomers(transformed);
            }
        } catch (error) {
            console.error('Error fetching customers:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const debouncedFetch = React.useCallback(
        debounce((val) => fetchCustomers(val), 500),
        [auth]
    );

    useEffect(() => {
        if (open) {
            setSearchTerm('');
            pastMembersCacheRef.current = null;
            fetchCustomers();
            setSelectedMembers(preSelectedIds || []);
        }
    }, [open]);

    const handleToggleMember = React.useCallback((userId) => {
        if (disabledIds.includes(userId)) return; // locked admin
        setSelectedMembers(prev =>
            prev.includes(userId) ? prev.filter(mid => mid !== userId) : [...prev, userId]
        );
    }, [disabledIds]);

    const handleSearchChange = (e) => {
        const val = e.target.value;
        setSearchTerm(val);
        debouncedFetch(val);
    };

    const handleSubmit = () => {
        if (mode === 'editAdmins') {
            onSubmit(selectedMembers);
        } else {
            const newlySelected = selectedMembers.filter(id => !disabledIds.includes(id));
            onSubmit(newlySelected);
        }
        onClose();
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            fullWidth
            maxWidth="xs"
            className="add-member-dialog"
            PaperProps={{
                sx: { borderRadius: '16px', height: '80vh' }
            }}
        >
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 2, pb: 1 }}>
                <IconButton onClick={onClose} size="small">
                    <Clear size={20} />
                </IconButton>
                <Typography variant="h6" fontWeight="600">
                    {mode === 'search' ? 'Search participants' : mode === 'editAdmins' ? 'Edit group admins' : mode === 'viewPastParticipants' ? 'Past participants' : 'Add member'}
                </Typography>
            </DialogTitle>
            <DialogContent sx={{ p: '0 24px' }}>
                <Box sx={{ mt: 1, mb: 2 }}>
                    <TextField
                        fullWidth
                        variant="outlined"
                        placeholder="Search name or number"
                        size="small"
                        value={searchTerm}
                        onChange={handleSearchChange}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <Search size={18} style={{ color: '#667781' }} />
                                </InputAdornment>
                            ),
                            sx: {
                                borderRadius: '24px',
                                backgroundColor: '#f0f2f5',
                                border: 'none',
                                '& fieldset': { border: 'none' }
                            }
                        }}
                    />
                </Box>
                <Typography variant="caption" sx={{ color: '#667781', fontWeight: 500, mb: 1, display: 'block' }}>
                    Contacts
                </Typography>
                {isLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                        <CircularProgress size={24} sx={{ color: 'primary.main' }} />
                    </Box>
                ) : (
                    <List sx={{ width: '100%' }}>
                        {availableCustomers
                            .filter(cust => mode === 'search' || mode === 'viewPastParticipants' ? true : mode === 'editAdmins' ? true : !existingMemberIds.includes(cust.UserId))
                            .map((cust) => {
                                const isSelected = selectedMembers.includes(cust.UserId);
                                const isDisabled = disabledIds.includes(cust.UserId);
                                return (
                                    <ListItem
                                        key={cust.UserId}
                                        onClick={(e) => mode === 'search' ? onMemberClick?.(e, cust) : mode === 'viewPastParticipants' ? null : handleToggleMember(cust.UserId)}
                                        sx={{
                                            borderRadius: '8px',
                                            mb: 0.5,
                                            cursor: mode === 'viewPastParticipants' ? 'default' : isDisabled ? 'default' : 'pointer',
                                            opacity: isDisabled ? 0.7 : 1,
                                            '&:hover': {
                                                backgroundColor: mode === 'viewPastParticipants' ? 'transparent' : isDisabled ? 'transparent' : 'rgba(115, 103, 240, 0.04)',
                                                borderRadius: 2
                                            }
                                        }}
                                    >
                                        {mode !== 'search' && mode !== 'viewPastParticipants' && (
                                            <Checkbox
                                                edge="start"
                                                checked={isSelected}
                                                disabled={isDisabled}
                                                tabIndex={-1}
                                                disableRipple
                                                sx={{
                                                    color: '#d1d5db',
                                                    '&.Mui-checked': { color: 'primary.main' },
                                                    '&.Mui-disabled': { color: '#b0bec5' }
                                                }}
                                            />
                                        )}
                                        <ListItemAvatar sx={{ ml: mode === 'search' || mode === 'viewPastParticipants' ? 0 : 1 }}>
                                            <Avatar {...getWhatsAppAvatarConfig(cust.DisplayName || cust.CustomerName || cust.Name || cust.UserName || 'User', 40)} src={cust.ProfileImage || cust.ProfileImageUrl} />
                                        </ListItemAvatar>
                                        <ListItemText
                                            primary={getCustomerDisplayName(cust)}
                                            secondary={(cust.UserEmail ?? cust.DisplayEmail) ?? ''}
                                        />
                                    </ListItem>
                                );
                            })}
                    </List>
                )}
            </DialogContent>
            <DialogActions sx={{ p: 2, justifyContent: 'center' }}>
                {mode !== 'search' && mode !== 'viewPastParticipants' && (mode === 'editAdmins' || selectedMembers.filter(id => !disabledIds.includes(id)).length > 0) && (
                    <IconButton
                        onClick={handleSubmit}
                        sx={{
                            backgroundColor: 'primary.main',
                            color: '#fff',
                            width: '56px',
                            height: '56px',
                            '&:hover': { backgroundColor: 'primary.dark' },
                            boxShadow: '0 4px 12px rgba(115, 103, 240, 0.3)'
                        }}
                    >
                        <Check size={24} />
                    </IconButton>
                )}
            </DialogActions>
        </Dialog>
    );
};

export default AddMemberDialog;
