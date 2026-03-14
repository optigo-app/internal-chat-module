import React, { useState, useEffect, useContext, useCallback, useRef } from 'react';
import { Typography, Avatar, IconButton, Tabs, Tab, TextField, Box, InputAdornment, Tooltip, Menu, MenuItem, ListItemIcon, ListItemText, CircularProgress } from '@mui/material';
import { X, User, Search, ChevronRight, ArrowLeft, Settings, UserPlus, LogOut, Heart, Pencil, Camera, Check, ChevronDown, Shield, UserMinus, MessageCircle, Image as ImageIcon, CircleMinus, Upload, Star } from 'lucide-react';
import './CustomerDetails.scss';
import { LoginContext } from '../../context/LoginData';
import { fetchMediaLists } from '../../API/MediaLists/MediaLists';
import { fetchGroupDetails } from '../../API/Groups/FetchGroupDetails';
import { changeGroupPermissionApi } from '../../API/Groups/ChangeGroupPermissionApi';
import { editGroupApi } from '../../API/Groups/EditGroupApi';
import { addGroupParticipantApi } from '../../API/Groups/AddGroupParticipantApi';
import { assignRoleApi } from '../../API/Groups/AssignRoleApi';
import { removeMemberApi } from '../../API/Groups/RemoveMemberApi';
import { updateConversationApi } from '../../API/SendMessage/updateConversationApi';
import { clearChatApi } from '../../API/ClearChat/ClearChatApi';
import toast from 'react-hot-toast';
import MediaSection from './MediaSection';
import DocumentsSection from './DocumentsSection';
import GroupPermissions from './GroupPermissions';
import AddMemberDialog from '../ReusableComponent/AddMemberDialog';
import ConfirmationDialog from '../ReusableComponent/ConfirmationDialog';
import WhatsAppMenu from '../ReusableComponent/WhatsAppMenu';
import ProfileAvatarUpload from '../ReusableComponent/ProfileAvatarUpload';
import { getCustomerAvatarSeed, getCustomerDisplayName, getWhatsAppAvatarConfig, hasCustomerName } from '../../utils/globalFunc';
import { useFavorite } from '../../contexts/FavoriteContext';
import { useRemoveInGroup } from '../../contexts/RemoveInGroupContext';

const CustomerDetails = ({ customer, onClose, open, variant = 'panel' }) => {
    const [currentViewState, setCurrentViewState] = useState('info'); // 'info', 'media', 'permissions', or 'search'
    const [direction, setDirection] = useState('forward'); // 'forward' or 'backward'
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState('media');
    const [mediaItems, setMediaItems] = useState({
        images: [],
        videos: [],
        documents: []
    });
    console.log(customer);
    const [groupPermissions, setGroupPermissions] = useState({
        editGroupSettings: true,
        sendMessages: true,
        addOtherMembers: true,
        approveNewMembers: false
    });
    const [pagination, setPagination] = useState({
        images: { page: 1, hasMore: true, isLoading: false },
        videos: { page: 1, hasMore: true, isLoading: false },
        documents: { page: 1, hasMore: true, isLoading: false }
    });
    const [showAllMembers, setShowAllMembers] = useState(false);
    const [localGroupData, setLocalGroupData] = useState({
        members: customer?.GroupMembers || [],
        description: customer?.GroupDesc || '',
        name: customer?.ConversationName || ''
    });

    // Editing states
    const [isEditingName, setIsEditingName] = useState(false);
    const [isEditingDesc, setIsEditingDesc] = useState(false);
    const [editedName, setEditedName] = useState('');
    const [editedDesc, setEditedDesc] = useState('');

    // Add Member Dialog state
    const [isAddMemberDialogOpen, setIsAddMemberDialogOpen] = useState(false);
    const [isParticipantSearchOpen, setIsParticipantSearchOpen] = useState(false);

    // Confirmation Modal state for Role Change / Member Removal
    const [confirmationModal, setConfirmationModal] = useState({
        isOpen: false,
        member: null,
        actionType: null // 'roleUpdate' | 'remove' | 'clearChat' | 'deleteGroup'
    });

    const [memberMenuAnchorEl, setMemberMenuAnchorEl] = useState(null);
    const [menuPosition, setMenuPosition] = useState(null);
    const [hoveredMemberId, setHoveredMemberId] = useState(null);

    // Use Context for global favorite state management
    const { favoriteState, updateFavoriteStatus } = useFavorite();

    // Use Context for RemoveInGroup state management
    const { updateRemoveInGroupStatus, isRemovedFromGroup } = useRemoveInGroup();

    // Get favorite status from Context state or fallback to customer prop
    const isFavorite = favoriteState[customer?.ConversationId]?.isStar ?? (customer?.IsStar === 1);

    // Get removed from group status from Context state or fallback to customer prop
    const isRemovedFromCurrentGroup = isRemovedFromGroup(customer?.ConversationId) || (customer?.RemoveInGroup === 1);

    // Update RemoveInGroup context when customer data changes
    useEffect(() => {
        if (customer?.ConversationId && customer?.RemoveInGroup !== undefined) {
            updateRemoveInGroupStatus(customer.ConversationId, customer.RemoveInGroup === 1);
        }
    }, [customer?.ConversationId, customer?.RemoveInGroup, updateRemoveInGroupStatus]);

    const { auth } = useContext(LoginContext);
    const pageSize = 6;

    // Flag for enabling/disabling pagination for testing
    const enablePagination = true;

    const inFlightRequestsRef = useRef(new Set());
    const fetchedPagesRef = useRef(new Set());

    const avatarMenuItems = [
        {
            label: "Take Photo",
            action: "takePhoto",
            icon: <Camera size={20} />,
        },
        {
            label: "Upload Photo",
            action: "uploadPhoto",
            icon: <Upload size={20} />,
        }
    ];

    const getItemKey = (item) => item?.Id ?? item?.FileUrl;
    const mergeUniqueByKey = (prevList, nextList) => {
        const map = new Map();
        (prevList || []).forEach((it) => {
            const k = getItemKey(it);
            if (k != null) map.set(k, it);
        });
        (nextList || []).forEach((it) => {
            const k = getItemKey(it);
            if (k != null) map.set(k, it);
        });
        return Array.from(map.values());
    };

    const processMediaItems = (items) => {
        const categorized = {
            images: [],
            videos: [],
            documents: []
        };

        items.forEach(item => {
            const mimeType = item.MimeType || '';
            const mediaItem = {
                ...item,
                src: item.FileUrl,
                name: item.FileName,
                type: mimeType
            };

            if (mimeType.startsWith('image/')) {
                categorized.images.push(mediaItem);
            } else if (mimeType.startsWith('video/')) {
                categorized.videos.push(mediaItem);
            } else {
                categorized.documents.push(mediaItem);
            }
        });

        console.log('Categorized items:', categorized);
        return categorized;
    };

    const fetchMediaData = async (type, page = 1) => {
        if (!customer?.ConversationId) return;
        const requestKey = `${customer.ConversationId}:all:${page}`;
        if (inFlightRequestsRef.current.has(requestKey) || fetchedPagesRef.current.has(requestKey)) return;
        inFlightRequestsRef.current.add(requestKey);
        if (pagination[type]?.isLoading) {
            inFlightRequestsRef.current.delete(requestKey);
            return;
        }
        setPagination(prev => ({
            ...prev,
            [type]: { ...prev[type], isLoading: true }
        }));

        try {
            const response = await fetchMediaLists(page, pageSize, customer.ConversationId, auth.userId);
            if (response?.data) {
                const categorized = processMediaItems(response.data);
                setMediaItems(prev => ({
                    images: page === 1 ? categorized.images : mergeUniqueByKey(prev.images, categorized.images),
                    videos: page === 1 ? categorized.videos : mergeUniqueByKey(prev.videos, categorized.videos),
                    documents: page === 1 ? categorized.documents : mergeUniqueByKey(prev.documents, categorized.documents)
                }));

                const hasMoreItems = response.data.length === pageSize;
                setPagination(prev => ({
                    images: {
                        ...prev.images,
                        page,
                        hasMore: hasMoreItems,
                        isLoading: false
                    },
                    videos: {
                        ...prev.videos,
                        page,
                        hasMore: hasMoreItems,
                        isLoading: false
                    },
                    documents: {
                        ...prev.documents,
                        page,
                        hasMore: hasMoreItems,
                        isLoading: false
                    }
                }));

                fetchedPagesRef.current.add(requestKey);
            }
        } catch (error) {
            console.error(`Error fetching ${type}:`, error);
            setPagination(prev => ({
                ...prev,
                [type]: { ...prev[type], hasMore: false, isLoading: false }
            }));
        } finally {
            inFlightRequestsRef.current.delete(requestKey);
        }
    };

    // Updated version to handle combined data
    const loadMoreMedia = () => {
        if (!pagination.images.isLoading && pagination.images.hasMore) {
            const nextPage = pagination.images.page + 1;
            fetchMediaData('images', nextPage);
        }
    };

    const loadMoreDocuments = () => {
        if (!pagination.documents.isLoading && pagination.documents.hasMore) {
            const nextPage = pagination.documents.page + 1;
            fetchMediaData('documents', nextPage);
        }
    };

    useEffect(() => {
        if (customer.ConversationId) {
            // Reset state when customer changes
            setMediaItems({ images: [], videos: [], documents: [] });
            setPagination({
                images: { page: 1, hasMore: true, isLoading: false },
                videos: { page: 1, hasMore: true, isLoading: false },
                documents: { page: 1, hasMore: true, isLoading: false }
            });

            inFlightRequestsRef.current.clear();
            fetchedPagesRef.current.clear();

            // Initial fetch for all media types
            fetchMediaData('images', 1);

            if (customer.IsGroup === 1) {
                loadGroupInfo();
            }
        }
    }, [customer.ConversationId]);

    const loadGroupInfo = async () => {
        const data = await fetchGroupDetails(customer.ConversationId, auth);
        if (data) {
            // Update permissions
            if (data.groupDetails) {
                setGroupPermissions({
                    editGroupSettings: data.groupDetails.EditGroup === 1,
                    sendMessages: data.groupDetails.SendNewMessage === 1,
                    addOtherMembers: data.groupDetails.AddOtherMember === 1,
                    approveNewMembers: data.groupDetails.ApproveNewMembers === 1
                });

                // Update local group metadata state
                setLocalGroupData(prev => ({
                    ...prev,
                    description: data.groupDetails.Description,
                    name: data.groupDetails.Name
                }));
            }

            // Update members state
            if (data.members) {
                const mappedMembers = data.members.map(m => ({
                    UserId: m.UserId,
                    Name: m.MemberName,
                    ProfileImageUrl: m.ProfileImage,
                    IsAdmin: m.IsGroupAdmin === 1,
                    About: ""
                }));
                setLocalGroupData(prev => ({
                    ...prev,
                    members: mappedMembers
                }));
            }

            // Update media preview if rd2 has data
            if (data.media?.length > 0) {
                const categorized = processMediaItems(data.media);
                setMediaItems(prev => ({
                    images: mergeUniqueByKey(prev.images, categorized.images),
                    videos: mergeUniqueByKey(prev.videos, categorized.videos),
                    documents: mergeUniqueByKey(prev.documents, categorized.documents)
                }));
            }
        }
    };

    const handlePermissionChange = async (name, value) => {
        setGroupPermissions(prev => ({ ...prev, [name]: value }));
        const permissionMap = {
            editGroupSettings: 'EditGroup',
            sendMessages: 'SendNewMessage',
            addOtherMembers: 'AddOtherMember',
            approveNewMembers: 'ApproveNewMembers'
        };

        const apiPermissionName = permissionMap[name];
        if (!apiPermissionName) return;

        try {
            const response = await changeGroupPermissionApi(auth, {
                conversationId: customer.ConversationId,
                permissionName: apiPermissionName,
                permissionValue: value
            });

            if (response?.Status === "200") {
                toast.success('Permission updated successfully');
            } else {
                // Revert state on failure
                setGroupPermissions(prev => ({ ...prev, [name]: !value }));
                toast.error(response?.Message || 'Failed to update permission');
            }
        } catch (error) {
            // Revert state on error
            setGroupPermissions(prev => ({ ...prev, [name]: !value }));
            toast.error('Internal server error occurred');
        }
    };

    // PARTIAL UPDATE STRATEGY FOR EDITGROUP API
    // Each field is sent separately to prevent unintentional overwrites:
    // - Image updates: Only groupProfile is sent, name and description are empty
    // - Name updates: Only groupName is sent, description and profile are empty  
    // - Description updates: Only groupDesc is sent, name and profile are empty
    // This ensures the API handles partial updates correctly without affecting other fields

    const handleSaveName = async () => {
        if (!editedName.trim() || editedName === localGroupData.name) {
            setIsEditingName(false);
            return;
        }

        // Validate name length
        if (editedName.length > 50) {
            toast.error('Group name cannot exceed 50 characters');
            return;
        }

        try {
            // Send only the group name field, with empty description and profile
            const response = await editGroupApi(auth, {
                conversationId: customer.ConversationId,
                groupName: editedName,
                groupDesc: "", // Empty description for name-only update
                groupProfile: "" // Empty profile for name-only update
            });
            if (response?.Status === "200") {
                setLocalGroupData(prev => ({ ...prev, name: editedName }));
                setIsEditingName(false);
                toast.success('Group name updated');
            } else {
                toast.error(response?.Message || 'Failed to update name');
            }
        } catch (error) {
            toast.error('Error updating name');
        }
    };

    const handleSaveDesc = async () => {
        if (editedDesc === localGroupData.description) {
            setIsEditingDesc(false);
            return;
        }

        // Validate description length
        if (editedDesc.length > 256) {
            toast.error('Group description cannot exceed 256 characters');
            return;
        }

        try {
            // Send only the group description field, with empty name and profile
            const response = await editGroupApi(auth, {
                conversationId: customer.ConversationId,
                groupName: "", // Empty name for description-only update
                groupDesc: editedDesc,
                groupProfile: "" // Empty profile for description-only update
            });
            if (response?.Status === "200") {
                setLocalGroupData(prev => ({ ...prev, description: editedDesc }));
                setIsEditingDesc(false);
                toast.success('Group description updated');
            } else {
                toast.error(response?.Message || 'Failed to update description');
            }
        } catch (error) {
            toast.error('Error updating description');
        }
    };

    const startEditingName = () => {
        setEditedName(customer?.IsGroup === 1 ? localGroupData.name : displayName);
        setIsEditingName(true);
    };

    const startEditingDesc = () => {
        setEditedDesc(localGroupData.description);
        setIsEditingDesc(true);
    };

    const handleOpenAddMember = () => {
        setIsAddMemberDialogOpen(true);
    };

    const handleAddMembersSubmit = async (selectedIds) => {
        if (!selectedIds || selectedIds.length === 0) return;
        try {
            const response = await addGroupParticipantApi(auth, {
                conversationId: customer.ConversationId,
                selectedMembers: selectedIds
            });

            if (response?.Status === "200") {
                toast.success('Members added successfully');
                setIsAddMemberDialogOpen(false);
                loadGroupInfo();
            } else {
                toast.error(response?.Message || 'Failed to add members');
            }
        } catch (error) {
            toast.error('Error adding members');
        }
    };

    const isCurrentUserAdmin = localGroupData.members.find(m => m.UserId === (auth?.id || auth?.userId))?.IsAdmin;

    const handleMemberClick = (event, member) => {
        if (member.UserId === (auth?.id || auth?.userId)) return;

        event.preventDefault();
        setConfirmationModal(prev => ({ ...prev, member: member }));

        if (event.type === 'contextmenu') {
            setMenuPosition({ top: event.clientY, left: event.clientX });
            setMemberMenuAnchorEl(null);
        } else {
            setMenuPosition(null);
            setMemberMenuAnchorEl(event.currentTarget);
        }
    };

    const handleMenuAction = (action) => {
        if (action === 'makeAdmin' || action === 'removeAdmin') {
            setConfirmationModal(prev => ({ ...prev, isOpen: true, actionType: 'roleUpdate' }));
        } else if (action === 'removeMember') {
            setConfirmationModal(prev => ({ ...prev, isOpen: true, actionType: 'remove' }));
        } else if (action === 'messageMember') {
            toast('Message — coming soon!');
        } else if (action === 'viewMember') {
            toast('Contact info — coming soon!');
        }
    };

    const handleClearChatClick = () => {
        setConfirmationModal({ isOpen: true, member: null, actionType: 'clearChat' });
    };

    // Helper function to check if current user is the only admin
    const isOnlyAdmin = () => {
        const currentUserId = auth?.id || auth?.userId;
        const currentUser = localGroupData.members.find(m => m.UserId === currentUserId);
        const isCurrentUserAdmin = currentUser?.IsAdmin;
        const adminCount = localGroupData.members.filter(m => m.IsAdmin).length;
        return isCurrentUserAdmin && adminCount === 1;
    };

    const handleExitGroupClick = () => {
        if (isRemovedFromCurrentGroup) {
            // Show delete group confirmation when user is removed from group
            setConfirmationModal({
                isOpen: true,
                member: null,
                actionType: 'deleteGroup'
            });
        } else if (isOnlyAdmin()) {
            // Show warning dialog for only admin
            setConfirmationModal({
                isOpen: true,
                member: null,
                actionType: 'adminCannotLeave'
            });
        } else {
            // Normal exit confirmation
            setConfirmationModal({
                isOpen: true,
                member: null,
                actionType: 'exitGroup'
            });
        }
    };

    const handleConfirmMemberAction = async () => {
        const { member, actionType } = confirmationModal;
        if (!actionType) return;

        if (actionType === 'clearChat') {
            try {
                const response = await clearChatApi(auth, {
                    conversationId: customer.ConversationId,
                    userId: auth?.id || auth?.userId
                });

                if (response?.Status === "200" || response?.success === true) {
                    toast.success('Chat cleared successfully');
                    setConfirmationModal({ isOpen: false, member: null, actionType: null });
                    // Refresh the conversation to show cleared state
                    window.dispatchEvent(new CustomEvent('REFRESH_CONVERSATION_LIST'));
                } else {
                    toast.error(response?.Message || 'Failed to clear chat');
                }
            } catch (error) {
                console.error('Error clearing chat:', error);
                toast.error('Error clearing chat');
            }
            setConfirmationModal({ isOpen: false, member: null, actionType: null });
            return;
        }

        if (actionType === 'adminCannotLeave') {
            // Just close the dialog, no action needed
            setConfirmationModal({ isOpen: false, member: null, actionType: null });
            return;
        }

        if (actionType === 'exitGroup') {
            try {
                const currentUserId = auth?.id || auth?.userId;
                const response = await removeMemberApi(auth, {
                    conversationId: customer.ConversationId,
                    memberId: currentUserId // Self-exit: userId and memberId are the same
                });

                if (response?.Status === "200") {
                    toast.success('You have left the group');
                    setConfirmationModal({ isOpen: false, member: null, actionType: null });
                    // Close the details panel and refresh conversation list
                    onClose?.();
                    window.dispatchEvent(new CustomEvent('REFRESH_CONVERSATION_LIST'));
                } else {
                    toast.error(response?.Message || 'Failed to exit group');
                }
            } catch (error) {
                console.error('Error exiting group:', error);
                toast.error('Error exiting group');
            }
            return;
        }

        if (actionType === 'deleteGroup') {
            try {
                // For now, just close the conversation and show success message
                // In the future, this could call a delete conversation API
                toast.success('Group conversation deleted');
                setConfirmationModal({ isOpen: false, member: null, actionType: null });
                // Close the details panel and refresh conversation list
                onClose?.();
                window.dispatchEvent(new CustomEvent('REFRESH_CONVERSATION_LIST'));
            } catch (error) {
                console.error('Error deleting group conversation:', error);
                toast.error('Error deleting group conversation');
            }
            return;
        }

        if (!member) return;
        try {
            let response;
            if (actionType === 'roleUpdate') {
                response = await assignRoleApi(auth, {
                    conversationId: customer.ConversationId,
                    memberId: member.UserId
                });
            } else if (actionType === 'remove') {
                response = await removeMemberApi(auth, {
                    conversationId: customer.ConversationId,
                    memberId: member.UserId
                });
            }
            if (response?.Status === "200") {
                const actionMsg = actionType === 'roleUpdate'
                    ? `${member.Name} is now ${member.IsAdmin ? 'no longer an admin' : 'an admin'}`
                    : `${member.Name} removed from group`;

                toast.success(actionMsg);
                setConfirmationModal({ isOpen: false, member: null, actionType: null });
                loadGroupInfo();
            } else {
                toast.error(response?.Message || `Failed to ${actionType === 'roleUpdate' ? 'update role' : 'remove member'}`);
            }
        } catch (error) {
            toast.error(`Error during ${actionType === 'roleUpdate' ? 'role update' : 'member removal'}`);
        }
    };

    const handleMediaClick = (media) => {
        if (media.type?.startsWith('image/') || media.type?.startsWith('video/')) {
            window.open(media.src || media.FileUrl, '_blank');
        } else {
            handleDownload(media.src || media.FileUrl, media.name || media.FileName || `document_${media.Id}`);
        }
    };

    const handleDownload = async (url, filename) => {
        try {
            const link = document.createElement('a');
            link.href = url;
            link.download = filename || 'download';
            link.target = '_blank';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error('Download failed:', error);
        }
    };

    useEffect(() => {
        if (!open) return;
        const onKeyDown = (e) => {
            if (e.key === 'Escape') {
                onClose?.();
            }
        };
        window.addEventListener('keydown', onKeyDown);
        if (variant !== 'panel') {
            const prevOverflow = document.body.style.overflow;
            document.body.style.overflow = 'hidden';
            return () => {
                document.body.style.overflow = prevOverflow;
                window.removeEventListener('keydown', onKeyDown);
            };
        }
        return () => {
            window.removeEventListener('keydown', onKeyDown);
        };
    }, [open, onClose, variant]);

    const handleToggleFavorite = async () => {
        const newIsStar = isFavorite ? 0 : 1;

        // Optimistically update Context state
        updateFavoriteStatus(customer?.ConversationId, newIsStar);

        try {
            const response = await updateConversationApi(auth, {
                page: 1,
                pageSize: 50,
                conversationId: customer?.ConversationId,
                isPin: customer?.IsPin || 0,
                isStar: newIsStar,
                isArchived: customer?.IsArchived || 0,
            });
            if (response?.Status === "200" || response?.success === true) {
                toast.success(newIsStar ? "Added to favorites" : "Removed from favorites");
                if (customer) {
                    customer.IsStar = newIsStar;
                }
                // Dispatch event for conversation list refresh
                window.dispatchEvent(new CustomEvent('REFRESH_CONVERSATION_LIST'));
            } else {
                // Revert on failure
                updateFavoriteStatus(customer?.ConversationId, isFavorite ? 1 : 0);
                toast.error("Failed to update favorite status");
            }
        } catch (error) {
            // Revert on error
            updateFavoriteStatus(customer?.ConversationId, isFavorite ? 1 : 0);
            toast.error("Error updating favorite status");
        }
    };

    const handleProfileUploadComplete = async (imageUrl, file) => {
        try {
            // Send only the group profile field, with empty name and description
            const response = await editGroupApi(auth, {
                conversationId: customer?.ConversationId,
                groupName: "", // Empty name for profile-only update
                groupDesc: "", // Empty description for profile-only update
                groupProfile: imageUrl
            });

            if (response?.Status === "200") {
                toast.success('Group profile photo updated successfully');
                // Update local state
                if (customer) {
                    customer.ProfileImageUrl = imageUrl;
                }
                // Refresh group info
                loadGroupInfo();
            } else {
                toast.error(response?.Message || 'Failed to update group profile');
            }
        } catch (error) {
            console.error('Error updating group profile:', error);
            toast.error('Error updating group profile');
        }
    };

    const handleProfileRemoveComplete = async () => {
        try {
            // Send empty profile field to clear the image
            const response = await editGroupApi(auth, {
                conversationId: customer?.ConversationId,
                groupName: "", // Empty name for profile-only update
                groupDesc: "", // Empty description for profile-only update
                groupProfile: "" // Empty profile to remove image
            });

            if (response?.Status === "200") {
                toast.success('Group profile photo removed successfully');
                // Update local state
                if (customer) {
                    customer.ProfileImageUrl = "";
                }
                // Refresh group info
                loadGroupInfo();
            } else {
                toast.error(response?.Message || 'Failed to remove group profile');
            }
        } catch (error) {
            console.error('Error removing group profile:', error);
            toast.error('Error removing group profile');
        }
    };

    const displayName = getCustomerDisplayName(customer);
    const avatarSeed = getCustomerAvatarSeed(customer);

    return (
        <>
            {variant !== 'panel' ? (
                <div
                    className={`customer-details-backdrop ${open ? 'open' : ''}`}
                    onClick={onClose}
                />
            ) : null}
            <div
                className={`customer-details-container ${variant === 'panel' ? 'panel' : ''} ${open ? 'slide-in' : ''} ${open ? 'visible' : ''}`}
                role="dialog"
                aria-modal={open ? 'true' : 'false'}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="details-content">
                    {/* Dynamic Header */}
                    <div className="header-section">
                        {currentViewState === 'info' ? (
                            <>
                                <IconButton className="back-button" onClick={onClose} size="small">
                                    <X size={20} />
                                </IconButton>
                                <Typography className="header-title">
                                    {customer?.IsGroup === 1 ? 'Group info' : 'Contact info'}
                                </Typography>
                            </>
                        ) : currentViewState === 'media' ? (
                            <>
                                <IconButton className="back-button" onClick={() => { setDirection('backward'); setCurrentViewState('info'); }} size="small">
                                    <ArrowLeft size={20} />
                                </IconButton>
                                <Typography className="header-title">Media, docs and video</Typography>
                            </>
                        ) : currentViewState === 'search' ? (
                            <>
                                <IconButton className="back-button" onClick={() => { setDirection('backward'); setCurrentViewState('info'); }} size="small">
                                    <ArrowLeft size={20} />
                                </IconButton>
                                <Typography className="header-title">Search messages</Typography>
                            </>
                        ) : currentViewState === 'permissions' ? (
                            <>
                                <IconButton className="back-button" onClick={() => { setDirection('backward'); setCurrentViewState('info'); }} size="small">
                                    <ArrowLeft size={20} />
                                </IconButton>
                                <Typography className="header-title">Group permissions</Typography>
                            </>
                        ) : null}
                    </div>

                    <div className="content-scroll">
                        <div className={`views-container view-${currentViewState} direction-${direction}`}>
                            {currentViewState === 'info' ? (
                                <div className={`view-content info-view ${direction}`} key="info">
                                    <div className="info-view-container">
                                        {/* Profile Section */}
                                        <div className={`profile-section ${customer?.IsGroup === 1 ? 'group-profile' : ''}`}>
                                            {customer?.IsGroup === 1 && isCurrentUserAdmin ? (
                                                <ProfileAvatarUpload
                                                    size={130}
                                                    currentImageUrl={customer?.ProfileImageUrl}
                                                    avatarSeed={avatarSeed}
                                                    showOverlay={true}
                                                    overlayText={customer?.ProfileImageUrl ? "Change group\nicon" : "Add group\nicon"}
                                                    onUploadComplete={handleProfileUploadComplete}
                                                    onRemoveComplete={handleProfileRemoveComplete}
                                                    className="group-avatar-container"
                                                    folderName="tecochat/profileImage"
                                                />
                                            ) : (
                                                <div className={`avatar-container ${customer?.IsGroup === 1 ? 'group-avatar-container' : ''}`}>
                                                    {!hasCustomerName(customer) ? (
                                                        <Avatar
                                                            {...getWhatsAppAvatarConfig(avatarSeed, 130)}
                                                            className="profile-avatar"
                                                            src={customer?.ProfileImageUrl}
                                                        >
                                                            <User size={80} />
                                                        </Avatar>
                                                    ) : (
                                                        <Avatar
                                                            {...(getWhatsAppAvatarConfig(avatarSeed, 130))}
                                                            className="profile-avatar"
                                                            src={customer?.ProfileImageUrl}
                                                        />
                                                    )}
                                                </div>
                                            )}
                                            <div className="name-row">
                                                {isEditingName ? (
                                                    <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', px: 2 }}>
                                                        <TextField
                                                            fullWidth
                                                            variant="standard"
                                                            value={editedName}
                                                            onChange={(e) => setEditedName(e.target.value.slice(0, 50))}
                                                            autoFocus
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') handleSaveName();
                                                                if (e.key === 'Escape') {
                                                                    setEditedName(customer?.IsGroup === 1 ? localGroupData.name : displayName);
                                                                    setIsEditingName(false);
                                                                }
                                                            }}
                                                            InputProps={{
                                                                endAdornment: (
                                                                    <InputAdornment position="end">
                                                                        <Typography variant="caption" sx={{ color: '#667781', mr: 1 }}>
                                                                            {editedName.length}/50
                                                                        </Typography>
                                                                        <IconButton size="small" onClick={() => {
                                                                            setEditedName(customer?.IsGroup === 1 ? localGroupData.name : displayName);
                                                                            setIsEditingName(false);
                                                                        }} sx={{ color: '#667781', mr: 0.5 }}>
                                                                            <X size={18} />
                                                                        </IconButton>
                                                                        <IconButton size="small" onClick={handleSaveName} sx={{ color: 'primary.main' }}>
                                                                            <Check size={20} />
                                                                        </IconButton>
                                                                    </InputAdornment>
                                                                ),
                                                            }}
                                                        />
                                                    </Box>
                                                ) : (
                                                    <>
                                                        <Typography className="customer-name">
                                                            {customer?.IsGroup === 1 ? localGroupData.name : displayName}
                                                        </Typography>
                                                        {customer?.IsGroup === 1 && isCurrentUserAdmin && (
                                                            <IconButton size="small" className="edit-icon-btn" onClick={startEditingName}>
                                                                <Pencil size={20} />
                                                            </IconButton>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                            {customer?.IsGroup === 1 ? (
                                                <Typography className="group-subtext">
                                                    Group · <span className="accent-text">{localGroupData.members.length} members</span>
                                                </Typography>
                                            ) : (
                                                <Typography className="customer-phone">
                                                    {customer?.DisplayEmail || ''}
                                                </Typography>
                                            )}
                                        </div>
                                        {customer?.IsGroup === 1 ? (
                                            <div className="action-buttons group-block-actions">
                                                <Tooltip
                                                    title={isCurrentUserAdmin ? '' : 'Only group admins can add members'}
                                                    placement="top"
                                                    arrow
                                                >
                                                    <div
                                                        className={`action-block-item ${!isCurrentUserAdmin ? 'disabled' : ''}`}
                                                        onClick={isCurrentUserAdmin ? handleOpenAddMember : undefined}
                                                        style={{ cursor: isCurrentUserAdmin ? 'pointer' : 'not-allowed' }}
                                                    >
                                                        <IconButton className="action-circle" disabled={!isCurrentUserAdmin} tabIndex={-1}>
                                                            <UserPlus size={20} />
                                                        </IconButton>
                                                        <span>Add</span>
                                                    </div>
                                                </Tooltip>
                                                <div className="action-block-item" onClick={() => {
                                                    setDirection('forward');
                                                    setTimeout(() => setCurrentViewState('search'), 0);
                                                }}>
                                                    <IconButton className="action-circle">
                                                        <Search size={20} />
                                                    </IconButton>
                                                    <span>Search</span>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="action-buttons group-block-actions">
                                                <div className="action-block-item" onClick={() => {
                                                    setDirection('forward');
                                                    setTimeout(() => setCurrentViewState('search'), 0);
                                                }}>
                                                    <IconButton className="action-circle">
                                                        <Search size={20} />
                                                    </IconButton>
                                                    <span>Search</span>
                                                </div>
                                            </div>
                                        )}

                                        {/* Group Description Section (Groups only) */}
                                        {customer?.IsGroup === 1 && (
                                            <div className="info-block desc-block">
                                                <div className="desc-header">
                                                    <Typography className="block-label accent-label">
                                                        {localGroupData.description ? 'Group description' : 'Add group description'}
                                                    </Typography>
                                                    {!isEditingDesc && isCurrentUserAdmin && (
                                                        <IconButton size="small" className="edit-icon-btn" onClick={startEditingDesc}>
                                                            <Pencil size={20} />
                                                        </IconButton>
                                                    )}
                                                </div>

                                                {isEditingDesc ? (
                                                    <Box sx={{ mt: 1 }}>
                                                        <TextField
                                                            fullWidth
                                                            multiline
                                                            variant="standard"
                                                            value={editedDesc}
                                                            onChange={(e) => setEditedDesc(e.target.value.slice(0, 256))}
                                                            autoFocus
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Escape') {
                                                                    setEditedDesc(localGroupData.description);
                                                                    setIsEditingDesc(false);
                                                                }
                                                            }}
                                                            helperText={`${editedDesc.length}/256`}
                                                            InputProps={{
                                                                endAdornment: (
                                                                    <InputAdornment position="end">
                                                                        <IconButton size="small" onClick={() => {
                                                                            setEditedDesc(localGroupData.description);
                                                                            setIsEditingDesc(false);
                                                                        }} sx={{ color: '#667781', mr: 0.5 }}>
                                                                            <X size={18} />
                                                                        </IconButton>
                                                                        <IconButton size="small" onClick={handleSaveDesc} sx={{ color: 'primary.main' }}>
                                                                            <Check size={20} />
                                                                        </IconButton>
                                                                    </InputAdornment>
                                                                ),
                                                            }}
                                                        />
                                                    </Box>
                                                ) : (
                                                    <Typography
                                                        className="block-value"
                                                        style={{ cursor: isCurrentUserAdmin ? 'pointer' : 'default' }}
                                                        onClick={isCurrentUserAdmin ? startEditingDesc : undefined}
                                                    >
                                                        {localGroupData.description || ''}
                                                    </Typography>
                                                )}
                                            </div>
                                        )}

                                        {/* Media Preview Trigger — only shown when media exists */}
                                        {(mediaItems.images.length + mediaItems.videos.length + mediaItems.documents.length) > 0 && (
                                            <div className="info-block clickable" onClick={() => { setDirection('forward'); setCurrentViewState('media'); }}>
                                                <div className="block-header">
                                                    <Typography className="block-label">Media, docs and video</Typography>
                                                    <div className="header-right">
                                                        <Typography className="count">
                                                            {mediaItems.images.length + mediaItems.videos.length + mediaItems.documents.length}
                                                        </Typography>
                                                        <ChevronRight size={20} className="chevron" />
                                                    </div>
                                                </div>

                                                {mediaItems.images.length > 0 && (
                                                    <div className="media-preview-grid">
                                                        {mediaItems.images.slice(0, 3).map((img, i) => (
                                                            <div key={i} className="preview-item">
                                                                <img src={img.src} alt="" />
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Show removed from group message */}
                                        {customer?.IsGroup === 1 && isRemovedFromCurrentGroup && (
                                            <div className="removed-from-group-message" style={{
                                                textAlign: 'center'
                                            }}>
                                                <Typography style={{
                                                    color: '#856404',
                                                    fontSize: '14px',
                                                    fontWeight: 500
                                                }}>
                                                    You're no longer a member of this group
                                                </Typography>
                                            </div>
                                        )}

                                        {/* Group Members Section (Groups only) */}
                                        {customer?.IsGroup === 1 && (
                                            <div className="info-block members-block">
                                                <div className="block-header">
                                                    <Typography className="block-label">
                                                        {localGroupData.members.length} participants
                                                    </Typography>
                                                    <Search size={16} style={{ color: '#667781', cursor: 'pointer' }} onClick={() => setIsParticipantSearchOpen(true)} />
                                                </div>

                                                <div className="settings-list members-list">
                                                    {(isCurrentUserAdmin) && (
                                                        <div className="setting-item no-border member-item add-member-row" onClick={handleOpenAddMember}>
                                                            <div className="setting-left">
                                                                <div className="action-circle-small add-member-circle">
                                                                    <UserPlus size={20} color='#fff' />
                                                                </div>
                                                                <span className="member-name action-text">Add members</span>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {(localGroupData.members || []).slice(0, showAllMembers ? undefined : 10).map((member, idx) => (
                                                        <div
                                                            key={member.UserId || idx}
                                                            className={`setting-item no-border member-item ${member.UserId !== (auth?.id || auth?.userId) ? 'clickable-member' : ''}`}
                                                            onClick={(e) => handleMemberClick(e, member)}
                                                            onContextMenu={(e) => handleMemberClick(e, member)}
                                                            onMouseEnter={() => setHoveredMemberId(member.UserId)}
                                                            onMouseLeave={() => setHoveredMemberId(null)}
                                                            style={{ cursor: isCurrentUserAdmin && member.UserId !== (auth?.id || auth?.userId) ? 'pointer' : 'default' }}
                                                        >
                                                            <div className="setting-left">
                                                                <Avatar
                                                                    {...getWhatsAppAvatarConfig(member.Name || 'User', 42)}
                                                                    src={member.ProfileImageUrl}
                                                                />
                                                                <div className="text-stack">
                                                                    <span className="member-name">{member.Name || 'User'}</span>
                                                                    {member.About && <Typography variant="caption" className="sub-text">{member.About}</Typography>}
                                                                </div>
                                                            </div>
                                                            <div className="member-right-actions">
                                                                {member.IsAdmin && <div className="admin-badge">Group Admin</div>}
                                                                {isCurrentUserAdmin && member.UserId !== (auth?.id || auth?.userId) && (
                                                                    <ChevronDown
                                                                        size={18}
                                                                        className={`member-chevron ${hoveredMemberId === member.UserId ? 'visible' : ''}`}
                                                                    />
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}

                                                    {(localGroupData?.members?.length > 10) && (
                                                        <div className="setting-item no-border view-all-btn" onClick={() => setShowAllMembers(!showAllMembers)}>
                                                            <div className="setting-left" style={{ justifyContent: 'center' }}>
                                                                <Typography sx={{ color: 'primary.main', fontSize: '14px', fontWeight: 500 }}>
                                                                    {showAllMembers ? 'Show less' : `View ${localGroupData.members.length - 10} more`}
                                                                </Typography>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* Settings Items */}
                                        <div className="settings-list">
                                            <div className="setting-item clickable-member" onClick={handleToggleFavorite} style={{ cursor: 'pointer' }}>
                                                <div className="setting-left">
                                                    <Star size={20} fill={isFavorite ? '#FFD700' : 'none'} color={isFavorite ? '#FFD700' : 'currentColor'} />
                                                    <span>{isFavorite ? 'Remove from favorites' : 'Add to favorites'}</span>
                                                </div>
                                            </div>
                                            {customer?.IsGroup === 1 && isCurrentUserAdmin && (
                                                <div className="setting-item no-border" onClick={() => {
                                                    setDirection('forward');
                                                    setTimeout(() => setCurrentViewState('permissions'), 0);
                                                }}>
                                                    <div className="setting-left">
                                                        <Settings size={20} />
                                                        <span>Group permissions</span>
                                                    </div>
                                                    <ChevronRight size={20} className="chevron" />
                                                </div>
                                            )}
                                        </div>

                                        {/* Danger Zone */}
                                        <div className="danger-zone">
                                            <div className="danger-item" onClick={handleClearChatClick} style={{ cursor: 'pointer' }}>
                                                <CircleMinus size={20} />
                                                <span>Clear chat</span>
                                            </div>
                                            {customer?.IsGroup === 1 && (
                                                <div className="danger-item" onClick={handleExitGroupClick} style={{ cursor: 'pointer' }}>
                                                    <LogOut size={20} />
                                                    <span>{isRemovedFromCurrentGroup ? 'Delete group' : 'Exit group'}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ) : currentViewState === 'media' ? (
                                <div className={`view-content media-view ${direction}`} key="media">
                                    <div className="media-panel-view">
                                        <Tabs
                                            value={activeTab}
                                            onChange={(e, val) => setActiveTab(val)}
                                            variant="fullWidth"
                                            className="mui-tabs-container"
                                            sx={{
                                                borderBottom: 1,
                                                borderColor: 'divider',
                                                '& .MuiTab-root': {
                                                    minHeight: '48px',
                                                    textTransform: 'uppercase',
                                                    fontWeight: 600,
                                                    fontSize: '14px',
                                                    letterSpacing: '0.5px',
                                                    color: '#667781',
                                                    '&.Mui-selected': {
                                                        color: 'primary.main',
                                                    }
                                                },
                                                '& .MuiTabs-indicator': {
                                                    backgroundColor: 'primary.main',
                                                    height: 3
                                                }
                                            }}
                                        >
                                            <Tab label="Media" value="media" />
                                            <Tab label="Docs" value="docs" />
                                            <Tab label="Video" value="videos" />
                                        </Tabs>
                                        <div className="tab-content">
                                            {activeTab === 'media' && (
                                                <MediaSection
                                                    mediaItems={{ images: mediaItems.images, videos: [] }}
                                                    isLoading={pagination.images.isLoading}
                                                    hasMore={pagination.images.hasMore}
                                                    onLoadMore={loadMoreMedia}
                                                    onMediaClick={handleMediaClick}
                                                    paginationFlag={enablePagination}
                                                />
                                            )}
                                            {activeTab === 'docs' && (
                                                <DocumentsSection
                                                    documents={mediaItems.documents}
                                                    isLoading={pagination.documents.isLoading}
                                                    hasMore={pagination.documents.hasMore}
                                                    onLoadMore={loadMoreDocuments}
                                                    onDocumentClick={handleMediaClick}
                                                    onDownload={handleDownload}
                                                    paginationFlag={enablePagination}
                                                />
                                            )}
                                            {activeTab === 'videos' && (
                                                <MediaSection
                                                    mediaItems={{ images: [], videos: mediaItems.videos }}
                                                    isLoading={pagination.videos.isLoading}
                                                    hasMore={pagination.videos.hasMore}
                                                    onLoadMore={loadMoreMedia}
                                                    onMediaClick={handleMediaClick}
                                                    paginationFlag={enablePagination}
                                                />
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ) : currentViewState === 'search' ? (
                                <div className={`view-content search-view ${direction}`} key="search">
                                    <div className="search-panel-view" style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#ffffff', height: '100%' }}>
                                        <Box sx={{ p: 2, pb: 1, backgroundColor: '#ffffff' }}>
                                            <TextField
                                                fullWidth
                                                placeholder="Search messages..."
                                                variant="outlined"
                                                size="small"
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                autoFocus
                                                InputProps={{
                                                    startAdornment: (
                                                        <InputAdornment position="start">
                                                            <Search size={18} color="#8696a0" style={{ marginLeft: 4 }} />
                                                        </InputAdornment>
                                                    ),
                                                    sx: {
                                                        borderRadius: '16px',
                                                        backgroundColor: '#f0f2f5',
                                                        '& fieldset': { border: 'none' },
                                                        '& input': { padding: '9px 0', fontSize: '15px' }
                                                    }
                                                }}
                                            />
                                        </Box>
                                        <Box sx={{ p: 4, textAlign: 'center', color: '#667781' }}>
                                            <Typography variant="body2">Search for messages in this chat.</Typography>
                                        </Box>
                                    </div>
                                </div>
                            ) : currentViewState === 'permissions' ? (
                                <div className={`view-content permissions-view ${direction}`} key="permissions">
                                    <GroupPermissions
                                        permissions={groupPermissions}
                                        onPermissionChange={handlePermissionChange}
                                        onBack={() => { setDirection('backward'); setCurrentViewState('info'); }}
                                    />
                                </div>
                            ) : null}
                        </div>
                    </div>
                </div>

                {/* Add Member Dialog */}
                <AddMemberDialog
                    open={isAddMemberDialogOpen}
                    onClose={() => setIsAddMemberDialogOpen(false)}
                    onSubmit={handleAddMembersSubmit}
                    existingMemberIds={localGroupData.members.map(m => m.UserId)}
                />

                <AddMemberDialog
                    open={isParticipantSearchOpen}
                    onClose={() => setIsParticipantSearchOpen(false)}
                    onSubmit={() => { }}
                    mode="search"
                    groupMembers={localGroupData.members}
                    onMemberClick={(e, member) => {
                        handleMemberClick(e, member);
                    }}
                />

                <WhatsAppMenu
                    anchorEl={memberMenuAnchorEl}
                    open={Boolean(memberMenuAnchorEl) || Boolean(menuPosition)}
                    onClose={() => {
                        setMemberMenuAnchorEl(null);
                        setMenuPosition(null);
                    }}
                    sx={{ px: 1 }}
                    anchorReference={menuPosition ? "anchorPosition" : "anchorEl"}
                    anchorPosition={menuPosition}
                    items={[
                        {
                            label: `Message ${confirmationModal.member?.Name?.split(' ')[0] || 'member'}`,
                            action: 'messageMember',
                            icon: <MessageCircle size={18} />
                        },
                        {
                            label: `View ${confirmationModal.member?.Name?.split(' ')[0] || 'contact'}`,
                            action: 'viewMember',
                            icon: <User size={18} />
                        },
                        ...(isCurrentUserAdmin ? [
                            {
                                label: confirmationModal.member?.IsAdmin ? 'Remove as admin' : 'Make group admin',
                                action: confirmationModal.member?.IsAdmin ? 'removeAdmin' : 'makeAdmin',
                                icon: <Shield size={18} />
                            },
                            {
                                label: `Remove ${confirmationModal.member?.Name || 'member'}`,
                                action: 'removeMember',
                                danger: true,
                                icon: <UserMinus size={18} />
                            }
                        ] : [])
                    ]}
                    onAction={handleMenuAction}
                    transformOrigin={menuPosition ? { horizontal: "left", vertical: "top" } : { horizontal: "right", vertical: "top" }}
                    anchorOrigin={menuPosition ? { horizontal: "left", vertical: "bottom" } : { horizontal: "right", vertical: "bottom" }}
                />

                <ConfirmationDialog
                    isOpen={confirmationModal.isOpen}
                    onClose={() => setConfirmationModal({ isOpen: false, member: null, actionType: null })}
                    onConfirm={handleConfirmMemberAction}
                    title={
                        confirmationModal.actionType === 'roleUpdate'
                            ? (confirmationModal.member?.IsAdmin ? 'Remove Admin?' : 'Make Admin?')
                            : confirmationModal.actionType === 'remove'
                                ? 'Remove Participant?'
                                : confirmationModal.actionType === 'clearChat'
                                    ? 'Clear Chat?'
                                    : confirmationModal.actionType === 'adminCannotLeave'
                                        ? 'Cannot Leave Group'
                                        : confirmationModal.actionType === 'deleteGroup'
                                            ? 'Delete Group?'
                                            : 'Exit Group?'
                    }
                    description={
                        confirmationModal.actionType === 'roleUpdate'
                            ? (confirmationModal.member?.IsAdmin
                                ? `Are you sure you want to remove ${confirmationModal.member?.Name} from group admins?`
                                : `Are you sure you want to make ${confirmationModal.member?.Name} a group admin?`)
                            : confirmationModal.actionType === 'remove'
                                ? `Are you sure you want to remove ${confirmationModal.member?.Name} from this group?`
                                : confirmationModal.actionType === 'clearChat'
                                    ? 'Are you sure you want to clear all messages in this chat?'
                                    : confirmationModal.actionType === 'adminCannotLeave'
                                        ? 'You cannot leave the group because you are the only administrator. Please assign another admin before leaving.'
                                        : confirmationModal.actionType === 'deleteGroup'
                                            ? 'Are you sure you want to delete this group conversation? This will remove the conversation from your chat list.'
                                            : 'Are you sure you want to exit this group?'
                    }
                    confirmText={
                        confirmationModal.actionType === 'roleUpdate'
                            ? (confirmationModal.member?.IsAdmin ? 'Remove admin' : 'Make admin')
                            : confirmationModal.actionType === 'remove'
                                ? 'Remove'
                                : confirmationModal.actionType === 'clearChat'
                                    ? 'Clear'
                                    : confirmationModal.actionType === 'adminCannotLeave'
                                        ? 'OK'
                                        : confirmationModal.actionType === 'deleteGroup'
                                            ? 'Delete'
                                            : 'Exit'
                    }
                    variant={['remove', 'clearChat', 'exitGroup', 'deleteGroup'].includes(confirmationModal.actionType) ? 'danger' : 'primary'}
                    showCancel={confirmationModal.actionType !== 'adminCannotLeave'}
                />

            </div>
        </>
    );
};
export default CustomerDetails;