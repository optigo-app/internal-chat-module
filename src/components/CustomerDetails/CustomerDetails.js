import { useState, useEffect, useContext, useCallback, useRef } from 'react';
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
import { deleteConversationApi } from '../../API/ConversationView/DeleteConversationApi';
import toast from 'react-hot-toast';
import DetailsHeader from './DetailsHeader';
import DetailsViews from './DetailsViews';
import MemberActions from './MemberActions';
import GroupDialogs from './GroupDialogs';
import ConfirmationDialog from '../ReusableComponent/ConfirmationDialog';
import { getCustomerAvatarSeed, getCustomerDisplayName } from '../../utils/globalFunc';
import { useFavorite } from '../../contexts/FavoriteContext';
import { useRemoveInGroup } from '../../contexts/RemoveInGroupContext';
import { useGroupAdminMode } from '../../contexts/GroupAdminModeContext';
import { addGroupPermissionHandler } from '../../socket';

const CustomerDetails = ({
    customer,
    onClose,
    open,
    variant = 'drawer',
    initialViewState = 'info',
    messageInfo = null,
    messages = [],
    scrollToMessage,
    searchResults = [],
    isSearching = false,
    onSearchMessages,
    containerRef
}) => {
    const [currentViewState, setCurrentViewState] = useState(initialViewState);
    const [direction, setDirection] = useState(''); // Start without animation for initial load
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState('media');
    const [mediaItems, setMediaItems] = useState({
        images: [],
        videos: [],
        documents: []
    });
    const [groupPermissions, setGroupPermissions] = useState({
        editGroupSettings: true,
        sendMessages: true,
        addOtherMembers: true,
        inviteToGroup: false,
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
        name: customer?.ConversationName || '',
        createdBy: null,
        entryDate: null,
        createdById: null
    });

    // Editing states
    const [isEditingName, setIsEditingName] = useState(false);
    const [isEditingDesc, setIsEditingDesc] = useState(false);
    const [editedName, setEditedName] = useState('');
    const [editedDesc, setEditedDesc] = useState('');

    // Add Member Dialog state
    const [isAddMemberDialogOpen, setIsAddMemberDialogOpen] = useState(false);
    const [isParticipantSearchOpen, setIsParticipantSearchOpen] = useState(false);
    const [isEditAdminDialogOpen, setIsEditAdminDialogOpen] = useState(false);

    // Confirmation Modal state for Role Change / Member Removal
    const [confirmationModal, setConfirmationModal] = useState({
        isOpen: false,
        member: null,
        actionType: null // 'roleUpdate' | 'remove' | 'clearChat' | 'deleteGroup'
    });

    const [memberMenuAnchorEl, setMemberMenuAnchorEl] = useState(null);
    const [menuPosition, setMenuPosition] = useState(null);

    // Use Context for global favorite state management
    const { favoriteState, updateFavoriteStatus } = useFavorite();

    // Use Context for RemoveInGroup state management
    const { updateRemoveInGroupStatus, isRemovedFromGroup } = useRemoveInGroup();

    // Use Context for group admin mode state management
    const { updateGroupAdminMode } = useGroupAdminMode();

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
            setMediaItems({ images: [], videos: [], documents: [] });
            setPagination({
                images: { page: 1, hasMore: true, isLoading: false },
                videos: { page: 1, hasMore: true, isLoading: false },
                documents: { page: 1, hasMore: true, isLoading: false }
            });
            inFlightRequestsRef.current.clear();
            fetchedPagesRef.current.clear();
            if (customer.IsGroup === 1) {
                loadGroupInfo();
            }
            fetchMediaData('images', 1);
        }
    }, [customer.ConversationId]);

    // Optimize: Fetch full media list only when user navigates to media view
    useEffect(() => {
        if (currentViewState === 'media' && customer.ConversationId) {
            fetchMediaData('images', 1);
        }
    }, [currentViewState, customer.ConversationId, fetchMediaData]);

    // Real-time group permission updates via socket
    useEffect(() => {
        if (!customer?.ConversationId || customer?.IsGroup !== 1) return;

        const permissionMap = {
            EditGroup: 'editGroupSettings',
            SendNewMessage: 'sendMessages',
            AddOtherMember: 'addOtherMembers',
            ApproveNewMembers: 'approveNewMembers'
        };

        const unsubscribe = addGroupPermissionHandler((data) => {
            if (Number(data?.conversationId) !== Number(customer.ConversationId)) return;
            const { changedPermission, permissions } = data;
            if (permissions) {
                const updated = {};
                Object.entries(permissions).forEach(([apiKey, value]) => {
                    const stateKey = permissionMap[apiKey];
                    if (stateKey) updated[stateKey] = value === 1 || value === true;
                });
                if (Object.keys(updated).length > 0) {
                    setGroupPermissions(prev => ({ ...prev, ...updated }));
                    if (updated.sendMessages !== undefined) {
                        updateGroupAdminMode(customer.ConversationId, updated.sendMessages === false);
                    }
                }
            } else if (changedPermission) {
                const stateKey = permissionMap[changedPermission.name];
                if (stateKey) {
                    const isAllowed = changedPermission.value === 1 || changedPermission.value === true;
                    setGroupPermissions(prev => ({
                        ...prev,
                        [stateKey]: isAllowed
                    }));
                    if (changedPermission.name === 'SendNewMessage') {
                        updateGroupAdminMode(customer.ConversationId, !isAllowed);
                    }
                }
            }
        });

        return () => {
            if (typeof unsubscribe === 'function') unsubscribe();
        };
    }, [customer?.ConversationId, customer?.IsGroup]);

    useEffect(() => {
        if (open && initialViewState) {
            setCurrentViewState(prev => {
                if (prev !== initialViewState) {
                    setDirection('forward');
                    return initialViewState;
                }
                return prev;
            });
        }
    }, [open, initialViewState]);

    const loadGroupInfo = async () => {
        const data = await fetchGroupDetails(customer.ConversationId, auth);
        console.log("data", data)
        if (data) {
            // Update permissions
            if (data.groupDetails) {
                setGroupPermissions({
                    approveNewMembers: data.groupDetails.ApproveNewMembers === 1
                });

                updateGroupAdminMode(customer.ConversationId, data.groupDetails.SendNewMessage === 0);

                // Update local group metadata state
                setLocalGroupData(prev => ({
                    ...prev,
                    description: data.groupDetails.Description || data.groupDetails.GroupDesc,
                    name: data.groupDetails.Name || data.groupDetails.ConversationName,
                    createdBy: data.groupDetails.CreatedByName || data.groupDetails.CreatedBy,
                    entryDate: data.groupDetails.EntryDate,
                    createdById: data.groupDetails.CreatedBy
                }));
            }

            // Update members state
            if (data.members) {
                const mappedMembers = data.members.map(m => ({
                    ...m,
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
        }
    };

    const handlePermissionChange = async (name, value) => {
        console.log(name, value, 'jdhjsh')
        if (name === 'inviteToGroup' || name === 'approveNewMembers') {
            toast(`${name} — coming soon!`);
            return;
        }
        setGroupPermissions(prev => ({ ...prev, [name]: value }));
        const permissionMap = {
            editGroupSettings: 'EditGroup',
            sendMessages: 'SendNewMessage',
            addOtherMembers: 'AddOtherMember',
            inviteToGroup: 'inviteToGroup',
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
                if (response?.Data?.rd?.[0]?.stat === 0) {
                    // Revert state on business logic failure
                    setGroupPermissions(prev => ({ ...prev, [name]: !value }));
                    toast.error(response?.Data?.rd?.[0]?.stat_msg || 'Only group admins can change permissions.');
                    return;
                }
                if (name === 'sendMessages') {
                    updateGroupAdminMode(customer.ConversationId, value === false);
                }
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

    const handleSaveName = async () => {
        if (!editedName.trim() || editedName === localGroupData.name) {
            setIsEditingName(false);
            return;
        }
        if (editedName.length > 50) {
            toast.error('Group name cannot exceed 50 characters');
            return;
        }
        try {
            const response = await editGroupApi(auth, {
                conversationId: customer.ConversationId,
                groupName: editedName,
                groupDesc: "",
                groupProfile: ""
            });
            if (response?.Status === "200") {
                if (response?.Data?.rd?.[0]?.stat === 0) {
                    toast.error(response?.Data?.rd?.[0]?.stat_msg || 'Only group admins can edit this group.');
                    return;
                }
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
        if (editedDesc.length > 256) {
            toast.error('Group description cannot exceed 256 characters');
            return;
        }
        try {
            const response = await editGroupApi(auth, {
                conversationId: customer.ConversationId,
                groupName: "",
                groupDesc: editedDesc,
                groupProfile: ""
            });
            if (response?.Status === "200") {
                if (response?.Data?.rd?.[0]?.stat === 0) {
                    toast.error(response?.Data?.rd?.[0]?.stat_msg || 'Only group admins can edit this group.');
                    return;
                }
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
        setEditedName(customer?.IsGroup === 1 ? (localGroupData?.name || "") : (displayName || ""));
        setIsEditingName(true);
    };

    const startEditingDesc = () => {
        setEditedDesc(localGroupData?.description || "");
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
                if (response?.Data?.rd?.[0]?.stat === 0) {
                    toast.error(response?.Data?.rd?.[0]?.stat_msg || 'Failed to add members');
                    return;
                }
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

    const handleEditAdminsSubmit = async (selectedIds) => {
        if (!selectedIds || selectedIds.length === 0) return;
        setIsEditAdminDialogOpen(false);
        try {
            let hasError = false;
            for (const memberId of selectedIds) {
                const response = await assignRoleApi(auth, {
                    conversationId: customer.ConversationId,
                    memberId: memberId
                });
                if (response?.Status === "200") {
                    if (response?.Data?.rd?.[0]?.stat === 0) {
                        toast.error(response?.Data?.rd?.[0]?.stat_msg || 'Failed to update admin role');
                        hasError = true;
                    }
                } else {
                    hasError = true;
                }
            }
            if (!hasError) {
                toast.success('Admins updated successfully');
            }
            loadGroupInfo();
        } catch (error) {
            console.error('Error updating admins:', error);
            toast.error('Error updating admins');
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
        if (action === 'clearChat') {
            setConfirmationModal({ isOpen: true, member: null, actionType: 'clearChat' });
        } else if (action === 'makeAdmin' || action === 'removeAdmin') {
            setConfirmationModal(prev => ({ ...prev, isOpen: true, actionType: 'roleUpdate' }));
        } else if (action === 'removeMember') {
            setConfirmationModal(prev => ({ ...prev, isOpen: true, actionType: 'remove' }));
        } else if (action === 'messageMember') {
            const member = confirmationModal.member;
            if (member) {
                if (member.ConversationId) {
                    window.dispatchEvent(new CustomEvent('SELECT_CONVERSATION', {
                        detail: { conversationId: member.ConversationId }
                    }));
                } else {
                    window.dispatchEvent(new CustomEvent('SELECT_NEW_CONVERSATION', {
                        detail: {
                            customer: {
                                ...member,
                                UserId: member.UserId,
                                name: member.Name || member.MemberName,
                                ProfileImageUrl: member.ProfileImageUrl || member.ProfileImage,
                                IsGroup: 0
                            }
                        }
                    }));
                }
                onClose?.();
            }
        } else if (action === 'viewMember') {
            toast('Contact info — coming soon!');
        }
    };

    const handleClearChatClick = () => {
        setConfirmationModal({ isOpen: true, member: null, actionType: 'clearChat' });
    };

    const handleDeleteChatClick = () => {
        setConfirmationModal({ isOpen: true, member: null, actionType: 'deleteChat' });
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
            setConfirmationModal({
                isOpen: true,
                member: null,
                actionType: 'deleteGroup'
            });
        } else if (isOnlyAdmin()) {
            setConfirmationModal({
                isOpen: true,
                member: null,
                actionType: 'adminCannotLeave'
            });
        } else {
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

                    // Clear messages from sessionStorage (unified key)
                    const cacheKey = `chat_cache_${customer.ConversationId}`;
                    sessionStorage.removeItem(cacheKey);

                    // Clear other related state if necessary
                    const lastPageKey = `chat_last_page_${customer.ConversationId}`;
                    sessionStorage.removeItem(lastPageKey);

                    setConfirmationModal({ isOpen: false, member: null, actionType: null });

                    // Dispatch event to notify Conversation component to clear its state
                    window.dispatchEvent(new CustomEvent('CLEAR_CONVERSATION_MESSAGES', {
                        detail: { conversationId: customer.ConversationId }
                    }));

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
            setConfirmationModal({ isOpen: false, member: null, actionType: null });
            return;
        }

        if (actionType === 'exitGroup') {
            try {
                const currentUserId = auth?.id || auth?.userId;
                const response = await removeMemberApi(auth, {
                    conversationId: customer.ConversationId,
                    memberId: currentUserId
                });
                if (response?.Status === "200") {
                    toast.success('You have left the group');
                    setConfirmationModal({ isOpen: false, member: null, actionType: null });
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

        if (actionType === 'deleteGroup' || actionType === 'deleteChat') {
            try {
                const response = await deleteConversationApi(auth, {
                    conversationId: customer.ConversationId
                });

                if (response?.Status === "200" || response?.success === true) {
                    toast.success(actionType === 'deleteChat' ? 'Chat deleted successfully' : 'Group conversation deleted');
                    setConfirmationModal({ isOpen: false, member: null, actionType: null });
                    onClose?.();
                    window.dispatchEvent(new CustomEvent('DELETE_CONVERSATION', {
                        detail: { conversationId: customer.ConversationId }
                    }));
                } else {
                    toast.error(response?.Message || `Failed to delete ${actionType === 'deleteChat' ? 'chat' : 'group conversation'}`);
                }
            } catch (error) {
                console.error(`Error deleting ${actionType === 'deleteChat' ? 'chat' : 'group conversation'}:`, error);
                toast.error(`Error deleting ${actionType === 'deleteChat' ? 'chat' : 'group conversation'}`);
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
                if (response?.Data?.rd?.[0]?.stat === 0) {
                    toast.error(response?.Data?.rd?.[0]?.stat_msg || `Failed to ${actionType === 'roleUpdate' ? 'update role' : 'remove member'}`);
                    setConfirmationModal({ isOpen: false, member: null, actionType: null });
                    return;
                }
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
                window.dispatchEvent(new CustomEvent('REFRESH_CONVERSATION_LIST'));
            } else {
                updateFavoriteStatus(customer?.ConversationId, isFavorite ? 1 : 0);
                toast.error("Failed to update favorite status");
            }
        } catch (error) {
            updateFavoriteStatus(customer?.ConversationId, isFavorite ? 1 : 0);
            toast.error("Error updating favorite status");
        }
    };

    const handleProfileUploadComplete = async (imageUrl, file) => {
        try {
            const response = await editGroupApi(auth, {
                conversationId: customer?.ConversationId,
                groupName: "",
                groupDesc: "",
                groupProfile: imageUrl
            });

            if (response?.Status === "200") {
                if (response?.Data?.rd?.[0]?.stat === 0) {
                    toast.error(response?.Data?.rd?.[0]?.stat_msg || 'Only group admins can edit this group.');
                    return;
                }
                toast.success('Group profile photo updated successfully');
                if (customer) {
                    customer.ProfileImageUrl = imageUrl;
                }
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
            const response = await editGroupApi(auth, {
                conversationId: customer?.ConversationId,
                groupName: "",
                groupDesc: "",
                groupProfile: ""
            });

            if (response?.Status === "200") {
                if (response?.Data?.rd?.[0]?.stat === 0) {
                    toast.error(response?.Data?.rd?.[0]?.stat_msg || 'Only group admins can edit this group.');
                    return;
                }
                toast.success('Group profile photo removed successfully');
                if (customer) {
                    customer.ProfileImageUrl = "";
                }
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
                    <DetailsHeader
                        currentViewState={currentViewState}
                        initialViewState={initialViewState}
                        onClose={onClose}
                        onBack={() => {
                            setDirection('backward');
                            setCurrentViewState('info');
                        }}
                        isGroup={customer?.IsGroup === 1}
                    />

                    <div className="content-scroll">
                        <DetailsViews
                            currentViewState={currentViewState}
                            direction={direction}
                            customer={customer}
                            isCurrentUserAdmin={isCurrentUserAdmin}
                            avatarSeed={avatarSeed}
                            localGroupData={localGroupData}
                            displayName={displayName}
                            isEditingName={isEditingName}
                            setIsEditingName={setIsEditingName}
                            editedName={editedName}
                            setEditedName={setEditedName}
                            handleSaveName={handleSaveName}
                            startEditingName={startEditingName}
                            handleProfileUploadComplete={handleProfileUploadComplete}
                            handleProfileRemoveComplete={handleProfileRemoveComplete}
                            handleOpenAddMember={handleOpenAddMember}
                            setDirection={setDirection}
                            setCurrentViewState={setCurrentViewState}
                            isEditingDesc={isEditingDesc}
                            editedDesc={editedDesc}
                            setEditedDesc={setEditedDesc}
                            handleSaveDesc={handleSaveDesc}
                            startEditingDesc={startEditingDesc}
                            setIsEditingDesc={setIsEditingDesc}
                            mediaItems={mediaItems}
                            isRemovedFromCurrentGroup={isRemovedFromCurrentGroup}
                            auth={auth}
                            setIsParticipantSearchOpen={setIsParticipantSearchOpen}
                            handleMemberClick={handleMemberClick}
                            showAllMembers={showAllMembers}
                            setShowAllMembers={setShowAllMembers}
                            isFavorite={isFavorite}
                            handleToggleFavorite={handleToggleFavorite}
                            handleClearChatClick={handleClearChatClick}
                            handleDeleteChatClick={handleDeleteChatClick}
                            handleExitGroupClick={handleExitGroupClick}
                            activeTab={activeTab}
                            setActiveTab={setActiveTab}
                            pagination={pagination}
                            loadMoreMedia={loadMoreMedia}
                            loadMoreDocuments={loadMoreDocuments}
                            handleMediaClick={handleMediaClick}
                            handleDownload={handleDownload}
                            enablePagination={enablePagination}
                            messages={messages}
                            searchQuery={searchQuery}
                            setSearchQuery={setSearchQuery}
                            scrollToMessage={scrollToMessage}
                            groupPermissions={groupPermissions}
                            handlePermissionChange={handlePermissionChange}
                            onEditAdmins={() => setIsEditAdminDialogOpen(true)}
                            messageInfo={messageInfo}
                            onClose={onClose}
                            searchResults={searchResults}
                            isSearching={isSearching}
                            onSearchMessages={onSearchMessages}
                            containerRef={containerRef}
                        />
                    </div>
                </div>

                <GroupDialogs
                    isAddMemberDialogOpen={isAddMemberDialogOpen}
                    setIsAddMemberDialogOpen={setIsAddMemberDialogOpen}
                    handleAddMembersSubmit={handleAddMembersSubmit}
                    localGroupData={localGroupData}
                    isParticipantSearchOpen={isParticipantSearchOpen}
                    setIsParticipantSearchOpen={setIsParticipantSearchOpen}
                    handleMemberClick={handleMemberClick}
                    isEditAdminDialogOpen={isEditAdminDialogOpen}
                    setIsEditAdminDialogOpen={setIsEditAdminDialogOpen}
                    handleEditAdminsSubmit={handleEditAdminsSubmit}
                />

                <MemberActions
                    memberMenuAnchorEl={memberMenuAnchorEl}
                    menuPosition={menuPosition}
                    onCloseMenu={() => {
                        setMemberMenuAnchorEl(null);
                        setMenuPosition(null);
                    }}
                    confirmationModal={confirmationModal}
                    isCurrentUserAdmin={isCurrentUserAdmin}
                    localGroupData={localGroupData}
                    onMenuAction={handleMenuAction}
                    onConfirmAction={handleConfirmMemberAction}
                    onCloseConfirmation={() => setConfirmationModal({ isOpen: false, member: null, actionType: null })}
                />

                <ConfirmationDialog
                    isOpen={confirmationModal.isOpen && !confirmationModal.member}
                    onClose={() => setConfirmationModal({ isOpen: false, member: null, actionType: null })}
                    onConfirm={handleConfirmMemberAction}
                    title={
                        confirmationModal.actionType === 'clearChat'
                            ? 'Clear Chat?'
                            : confirmationModal.actionType === 'deleteGroup'
                                ? 'Delete Group?'
                                : confirmationModal.actionType === 'deleteChat'
                                    ? 'Delete Chat?'
                                    : confirmationModal.actionType === 'adminCannotLeave'
                                        ? 'Cannot Leave Group'
                                        : confirmationModal.actionType === 'exitGroup'
                                            ? 'Exit Group?'
                                            : 'Confirm Action'
                    }
                    description={
                        confirmationModal.actionType === 'clearChat'
                            ? 'Are you sure you want to clear all messages in this chat?'
                            : confirmationModal.actionType === 'deleteGroup'
                                ? 'Are you sure you want to delete this group conversation? This will remove the conversation from your chat list.'
                                : confirmationModal.actionType === 'deleteChat'
                                    ? `Are you sure you want to delete the chat with ${displayName}?`
                                    : confirmationModal.actionType === 'adminCannotLeave'
                                        ? 'You cannot leave the group because you are the only administrator. Please assign another admin before leaving.'
                                        : confirmationModal.actionType === 'exitGroup'
                                            ? 'Are you sure you want to exit this group?'
                                            : 'Are you sure you want to proceed?'
                    }
                    confirmText={
                        confirmationModal.actionType === 'clearChat'
                            ? 'Clear'
                            : confirmationModal.actionType === 'deleteGroup' || confirmationModal.actionType === 'deleteChat'
                                ? 'Delete'
                                : confirmationModal.actionType === 'adminCannotLeave'
                                    ? 'OK'
                                    : confirmationModal.actionType === 'exitGroup'
                                        ? 'Exit'
                                        : 'Confirm'
                    }
                    variant={['clearChat', 'deleteGroup', 'deleteChat', 'exitGroup'].includes(confirmationModal.actionType) ? 'danger' : 'primary'}
                    showCancel={confirmationModal.actionType !== 'adminCannotLeave'}
                />
            </div>
        </>
    );
};
export default CustomerDetails;