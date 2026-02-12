import { useEffect, useState, useCallback, useRef, useContext } from 'react';
import {
    Avatar,
    Typography,
    TextField,
    InputAdornment,
    Box,
    Button,
    IconButton,
    Chip,
    Checkbox
} from '@mui/material';
import { Clear, Person as PersonIcon, ArrowBack, ArrowForward, CameraAlt, Check, SentimentSatisfiedAlt as EmojiIcon, Settings as SettingsIcon, Edit as EditIcon, Chat as ChatIcon, PersonAdd as PersonAddIcon, Link as LinkIcon, ManageAccounts as ManageAccountsIcon } from '@mui/icons-material';
import { ChevronRight, X } from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';
import { Popover, Switch, Divider, styled } from '@mui/material';
import './CreateGroup.scss';
import { getCustomerAvatarSeed, getCustomerDisplayName, getWhatsAppAvatarConfig } from '../../utils/globalFunc';
import { fetchCustomerLists } from '../../API/CustomerLists/CustomerLists';
import { LoginContext } from '../../context/LoginData';

const IOSSwitch = styled((props) => (
    <Switch focusVisibleClassName=".Mui-focusVisible" disableRipple {...props} />
))(({ theme }) => ({
    width: 42,
    height: 26,
    padding: 0,
    '& .MuiSwitch-switchBase': {
        padding: 0,
        margin: 2,
        transitionDuration: '300ms',
        '&.Mui-checked': {
            transform: 'translateX(16px)',
            color: '#fff',
            '& + .MuiSwitch-track': {
                backgroundColor: theme.palette.primary.main,
                opacity: 1,
                border: 0,
            },
            '&.Mui-disabled + .MuiSwitch-track': {
                opacity: 0.5,
            },
        },
        '&.Mui-focusVisible .MuiSwitch-thumb': {
            color: theme.palette.primary.main,
            border: '6px solid #fff',
        },
        '&.Mui-disabled .MuiSwitch-thumb': {
            color:
                theme.palette.mode === 'light'
                    ? theme.palette.grey[100]
                    : theme.palette.grey[600],
        },
        '&.Mui-disabled + .MuiSwitch-track': {
            opacity: theme.palette.mode === 'light' ? 0.7 : 0.3,
        },
    },
    '& .MuiSwitch-thumb': {
        boxSizing: 'border-box',
        width: 22,
        height: 22,
    },
    '& .MuiSwitch-track': {
        borderRadius: 26 / 2,
        backgroundColor: theme.palette.mode === 'light' ? '#E9E9EA' : '#39393D',
        opacity: 1,
        transition: theme.transitions.create(['background-color'], {
            duration: 500,
        }),
    },
}));

const CreateGroup = ({ onBack, onClose, onContinue }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [chatMembers, setChatMembers] = useState([]);
    const [selectedMembers, setSelectedMembers] = useState([]);
    const [step, setStep] = useState(1); // 1: Select Members, 2: Group Info
    const [direction, setDirection] = useState('backward'); // 'forward' or 'backward'
    const [groupName, setGroupName] = useState('');
    const [groupIcon, setGroupIcon] = useState(null);
    const [groupIconPreview, setGroupIconPreview] = useState(null);
    const [permissions, setPermissions] = useState({
        editGroupSettings: true,
        sendMessages: true,
        addOtherMembers: true,
        inviteViaLink: false,
        approveNewMembers: false
    });
    const [emojiAnchorEl, setEmojiAnchorEl] = useState(null);
    const [loading, setLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const containerRef = useRef(null);
    const groupNameInputRef = useRef(null);
    const pageSize = 100;
    const searchTimeoutRef = useRef(null);
    const { auth } = useContext(LoginContext);

    const transformMemberData = useCallback((items) => {
        return items?.map((item) => {
            const name = item.UserName || getCustomerDisplayName(item);
            return {
                ...item,
                UserId: item.UserId,
                name,
                email: item.UserEmail || item.email || '',
                avatarConfig: getWhatsAppAvatarConfig(getCustomerAvatarSeed(item)),
            };
        }) || [];
    }, []);

    const loadMembers = useCallback(async (page = 1, reset = false, search = null) => {
        if (loading || (!reset && !hasMore)) return;
        if (!auth?.token || !auth?.userId) return;

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
    }, [loading, hasMore, auth, searchTerm, transformMemberData]);

    useEffect(() => {
        loadMembers(1, true);
    }, []);

    const debouncedSearch = useCallback((value) => {
        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = setTimeout(() => {
            loadMembers(1, true, value);
        }, 500);
    }, [loadMembers]);

    const handleSearchChange = (e) => {
        const value = e.target.value;
        setSearchTerm(value);
        if (value === '') {
            if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
            loadMembers(1, true, '');
        } else {
            debouncedSearch(value);
        }
    };

    const toggleMemberSelection = (member) => {
        setSelectedMembers(prev => {
            const isSelected = prev.find(m => m.UserId === member.UserId);
            if (isSelected) {
                return prev.filter(m => m.UserId !== member.UserId);
            } else {
                return [...prev, member];
            }
        });
    };

    const removeMember = (memberId) => {
        setSelectedMembers(prev => prev.filter(m => m.UserId !== memberId));
    };

    const handleSelectAll = (isSelectAll) => {
        if (isSelectAll) {
            const myId = Number(auth?.id ?? auth?.userId);
            const selectableMembers = chatMembers?.data?.filter(member =>
                Number(member?.UserId ?? member?.id) !== myId
            ) || [];
            setSelectedMembers(selectableMembers);
        } else {
            setSelectedMembers([]);
        }
    };

    const handleScroll = useCallback(() => {
        if (!containerRef.current || loading || !hasMore) return;
        const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
        if (scrollTop + clientHeight >= scrollHeight - 80) {
            loadMembers(currentPage + 1, false);
        }
    }, [loading, hasMore, currentPage, loadMembers]);

    const handleIconChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setGroupIcon(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setGroupIconPreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleBack = () => {
        setDirection('backward');
        if (step === 3) {
            setStep(2);
        } else if (step === 2) {
            setStep(1);
        } else {
            onBack();
        }
    };

    const handleEmojiClick = (event) => {
        setEmojiAnchorEl(event.currentTarget);
    };

    const handleEmojiSelect = (emojiData) => {
        const input = groupNameInputRef.current?.querySelector('input, textarea');
        if (input) {
            const start = input.selectionStart;
            const end = input.selectionEnd;
            const text = groupName;
            const before = text.substring(0, start);
            const after = text.substring(end);
            const newValue = (before + emojiData.emoji + after).slice(0, 100);
            setGroupName(newValue);

            // Set cursor position after emoji in next tick
            setTimeout(() => {
                const newPos = start + emojiData.emoji.length;
                input.setSelectionRange(newPos, newPos);
                input.focus();
            }, 0);
        } else {
            setGroupName(prev => (prev + emojiData.emoji).slice(0, 80));
        }
        setEmojiAnchorEl(null);
    };

    const handlePermissionChange = (name) => (event) => {
        setPermissions(prev => ({ ...prev, [name]: event.target.checked }));
    };

    const handleFinalContinue = () => {
        onContinue({
            name: groupName,
            icon: groupIcon,
            members: selectedMembers,
            permissions
        });
    };

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;
        container.addEventListener('scroll', handleScroll, { passive: true });
        return () => container.removeEventListener('scroll', handleScroll);
    }, [handleScroll]);

    const filteredMembers = chatMembers?.data?.filter(member => {
        const myId = Number(auth?.id ?? auth?.userId);
        const isSelected = selectedMembers.some(sm => sm.UserId === member.UserId);

        const searchLower = searchTerm.toLowerCase();
        const matchesName = member.name.toLowerCase().includes(searchLower);
        const matchesEmail = member.email.toLowerCase().includes(searchLower);

        const isSelf = myId === Number(member?.UserId ?? member?.id);

        return !isSelf && !isSelected && (matchesName || matchesEmail);
    });

    return (
        <div className="customer_lists_mainDiv_2 create_group_container">
            <div className="customer_lists_header">
                <Box className="add_conv_box">
                    <IconButton onClick={handleBack} size="small" className='add_conv'>
                        <ArrowBack size={20} />
                    </IconButton>
                    <Typography variant="h6" className="header_title">
                        {step === 1 ? 'Add group members' : step === 2 ? 'New Group' : 'Group permissions'}
                    </Typography>
                </Box>
                {step === 1 &&
                    <IconButton onClick={onClose} size="small" className='add_conv'>
                        <X size={20} />
                    </IconButton>
                }
            </div>

            <div className={`steps-container step-${step} direction-${direction}`}>
                {step === 1 ? (
                    <div className={`step-content step-1 ${direction}`} key={1}>
                        <div className="selected_members_section">
                            {selectedMembers.length > 0 && (
                                <div className="selected_chips_container">
                                    {selectedMembers.map(member => (
                                        <Chip
                                            key={member.UserId}
                                            avatar={<Avatar {...member.avatarConfig} />}
                                            label={member.name}
                                            onDelete={() => removeMember(member.UserId)}
                                            className="member_chip"
                                        />
                                    ))}
                                </div>
                            )}
                            <div className="customer_lists_search">
                                <TextField
                                    fullWidth
                                    placeholder="Type contact name"
                                    variant="standard"
                                    size="small"
                                    value={searchTerm}
                                    onChange={handleSearchChange}
                                    InputProps={{
                                        disableUnderline: true,
                                        endAdornment: (
                                            <InputAdornment position="end">
                                                {searchTerm && (
                                                    <IconButton size="small" onClick={() => { setSearchTerm(''); loadMembers(1, true, ''); }}>
                                                        <Clear fontSize="small" />
                                                    </IconButton>
                                                )}
                                                <Button
                                                    size="small"
                                                    onClick={() => handleSelectAll(selectedMembers.length === 0)}
                                                    sx={{
                                                        textTransform: 'none',
                                                        fontSize: '12px',
                                                        fontWeight: 600,
                                                        ml: 1,
                                                        minWidth: 'fit-content'
                                                    }}
                                                >
                                                    {selectedMembers.length > 0 ? 'Remove All' : 'Select All'}
                                                </Button>
                                            </InputAdornment>
                                        ),
                                    }}
                                />
                            </div>
                        </div>

                        <div className="customer_lists_main">
                            <ul ref={containerRef}>
                                {filteredMembers?.map((member) => {
                                    const isSelected = selectedMembers.some(m => m.UserId === member.UserId);
                                    return (
                                        <li key={member.UserId} onClick={() => toggleMemberSelection(member)}>
                                            <div className={`member-item ${isSelected ? 'selected' : ''}`}>
                                                <div className="member-avatar">
                                                    <Avatar {...member.avatarConfig} />
                                                </div>
                                                <div className="member-info">
                                                    <Typography variant="subtitle1" className="member-name">{member.name}</Typography>
                                                    <Typography variant="body2" className="member-email" sx={{ color: 'text.secondary', fontSize: '12px' }}>
                                                        {member.email}
                                                    </Typography>
                                                </div>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>

                        {selectedMembers.length > 0 && (
                            <Box className="continue_button_container">
                                <Button
                                    variant="contained"
                                    className="continue_fab"
                                    onClick={() => { setDirection('forward'); setStep(2); }}
                                >
                                    <ArrowForward />
                                </Button>
                            </Box>
                        )}
                    </div>
                ) : step === 2 ? (
                    <div className={`step-content step-2 ${direction}`} key={2}>
                        <div className="group_info_step">
                            <div className="icon_upload_section">
                                <label htmlFor="group-icon-upload" className="icon_label">
                                    <input
                                        accept="image/*"
                                        id="group-icon-upload"
                                        type="file"
                                        hidden
                                        onChange={handleIconChange}
                                    />
                                    <div className="icon_preview_container">
                                        {groupIconPreview ? (
                                            <img src={groupIconPreview} alt="Group Icon" className="preview_img" />
                                        ) : (
                                            <div className="placeholder_icon">
                                                <CameraAlt />
                                            </div>
                                        )}
                                        <div className="hover_overlay">
                                            <CameraAlt />
                                            <Typography variant="caption">CHANGE GROUP ICON</Typography>
                                        </div>
                                    </div>
                                </label>
                            </div>

                            <div className="group_name_section">
                                <TextField
                                    ref={groupNameInputRef}
                                    fullWidth
                                    multiline
                                    maxRows={3}
                                    placeholder="Group Subject"
                                    variant="standard"
                                    value={groupName}
                                    onChange={(e) => setGroupName(e.target.value.slice(0, 100))}
                                    helperText={`${groupName.length}/100`}
                                    InputProps={{
                                        endAdornment: (
                                            <InputAdornment position="end">
                                                <IconButton onClick={handleEmojiClick} size="small" sx={{ mb: 0.5 }}>
                                                    <EmojiIcon />
                                                </IconButton>
                                            </InputAdornment>
                                        ),
                                    }}
                                    sx={{
                                        '& .MuiInput-root': {
                                            fontSize: '16px',
                                            pb: 0.5,
                                            '&:before': {
                                                borderBottomColor: '#685dd8' // default
                                            },
                                            '&:hover:not(.Mui-disabled):before': {
                                                borderBottomColor: '#685dd8' // hover
                                            },
                                            '&:after': {
                                                borderBottomColor: '#685dd8' // focused
                                            }
                                        },
                                        '& .MuiFormHelperText-root': {
                                            textAlign: 'right',
                                            marginRight: 0
                                        }
                                    }}
                                />

                                <Popover
                                    open={Boolean(emojiAnchorEl)}
                                    anchorEl={emojiAnchorEl}
                                    onClose={() => setEmojiAnchorEl(null)}
                                    anchorOrigin={{
                                        vertical: 'bottom',
                                        horizontal: 'left',
                                    }}
                                >
                                    <EmojiPicker onEmojiClick={handleEmojiSelect} />
                                </Popover>
                            </div>

                            <Divider sx={{ width: '100%', my: 2, borderColor: '#5a5a5a0e' }} />

                            <div className="group_permissions_section" onClick={() => { setDirection('forward'); setStep(3); }} style={{ cursor: 'pointer' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', px: 2, justifyContent: 'space-between', width: '100%' }}>
                                    <Typography variant="subtitle2" color="textSecondary">
                                        Group permissions
                                    </Typography>
                                    <IconButton size="small">
                                        <ChevronRight />
                                    </IconButton>
                                </Box>
                            </div>

                            <Divider sx={{ width: '100%', my: 2, borderColor: '#5a5a5a0e' }} />

                            <div className="selected_summary">
                                <Typography variant="subtitle2" color="textSecondary" sx={{ px: 2, mb: 1 }}>
                                    MEMBERS: {selectedMembers.length}
                                </Typography>
                                <div className="summary_member_list">
                                    {selectedMembers.map(member => (
                                        <div key={member.UserId} className="summary-member-item">
                                            <div className="member-avatar">
                                                <Avatar {...member.avatarConfig} />
                                            </div>
                                            <div className="member-info">
                                                <Typography variant="subtitle1" className="member-name">{member.name}</Typography>
                                                <Typography variant="body2" className="member-email" sx={{ color: 'text.secondary', fontSize: '12px' }}>
                                                    {member.email}
                                                </Typography>
                                            </div>
                                            <IconButton size="small" onClick={() => removeMember(member.UserId)}>
                                                <X size={14} />
                                            </IconButton>
                                        </div>
                                    ))}
                                </div>
                            </div>

                        </div>

                        <Box className="continue_button_container">
                            <Button
                                variant="contained"
                                className="continue_fab finalize"
                                disabled={!groupName.trim()}
                                onClick={handleFinalContinue}
                            >
                                <Check />
                            </Button>
                        </Box>
                    </div>
                ) : (
                    <div className={`step-content step-3 ${direction}`} key={3}>
                        <div className="permissions_overlay_step">
                            <div className="permission_group">
                                <Typography className="group_label">Members can:</Typography>

                                <div className="permission_item">
                                    <EditIcon className="item_icon" />
                                    <div className="item_text">
                                        <Typography variant="body1">Edit group settings</Typography>
                                        <Typography variant="caption" color="textSecondary">
                                            This includes the name, icon, description, disappearing message timer, and the ability to pin, keep or unkeep messages.
                                        </Typography>
                                    </div>
                                    <IOSSwitch
                                        checked={permissions.editGroupSettings}
                                        onChange={handlePermissionChange('editGroupSettings')}
                                    />
                                </div>

                                <div className="permission_item">
                                    <ChatIcon className="item_icon" />
                                    <div className="item_text">
                                        <Typography variant="body1">Send new messages</Typography>
                                    </div>
                                    <IOSSwitch
                                        checked={permissions.sendMessages}
                                        onChange={handlePermissionChange('sendMessages')}
                                    />
                                </div>

                                <div className="permission_item">
                                    <PersonAddIcon className="item_icon" />
                                    <div className="item_text">
                                        <Typography variant="body1">Add other members</Typography>
                                    </div>
                                    <IOSSwitch
                                        checked={permissions.addOtherMembers}
                                        onChange={handlePermissionChange('addOtherMembers')}
                                    />
                                </div>

                                <div className="permission_item">
                                    <LinkIcon className="item_icon" />
                                    <div className="item_text">
                                        <Typography variant="body1">Invite via link</Typography>
                                    </div>
                                    <IOSSwitch
                                        checked={permissions.inviteViaLink}
                                        onChange={handlePermissionChange('inviteViaLink')}
                                    />
                                </div>
                            </div>

                            <div className="permission_group">
                                <Typography className="group_label">Admins can:</Typography>

                                <div className="permission_item">
                                    <ManageAccountsIcon className="item_icon" />
                                    <div className="item_text">
                                        <Typography variant="body1">Approve new members</Typography>
                                        <Typography variant="caption" color="textSecondary">
                                            When turned on, admins must approve anyone who wants to join this group. <span className="learn_more">Learn more</span>
                                        </Typography>
                                    </div>
                                    <IOSSwitch
                                        checked={permissions.approveNewMembers}
                                        onChange={handlePermissionChange('approveNewMembers')}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CreateGroup;
