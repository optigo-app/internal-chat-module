import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { fetchGroupDetails } from '../API/Groups/FetchGroupDetails';
import { addGroupParticipantApi } from '../API/Groups/AddGroupParticipantApi';
import { useRemoveInGroup } from '../contexts/RemoveInGroupContext';
import { useGroupAdminMode } from '../contexts/GroupAdminModeContext';
import { useGroupSocket } from '../contexts/GroupSocketContext';
import { notify } from '../utils/notificationTemplates';

export function useGroupActions({ selectedCustomer, auth, refresh, addUniqueMessage }) {
    const [isCurrentUserAdmin, setIsCurrentUserAdmin] = useState(false);
    const [isAddMemberDialogOpen, setIsAddMemberDialogOpen] = useState(false);

    const { updateRemoveInGroupStatus, isRemovedFromGroup } = useRemoveInGroup();
    const { updateGroupAdminMode, isGroupOnlyAdminSend } = useGroupAdminMode();
    const { registerListener, unregisterListener } = useGroupSocket();

    const conversationId = selectedCustomer?.ConversationId;
    const isGroup = selectedCustomer?.IsGroup === 1;

    // Sync remove-in-group status from prop
    useEffect(() => {
        if (conversationId && selectedCustomer?.RemoveInGroup !== undefined) {
            updateRemoveInGroupStatus(conversationId, selectedCustomer.RemoveInGroup === 1);
        }
    }, [conversationId, selectedCustomer?.RemoveInGroup, updateRemoveInGroupStatus]);

    // Fetch initial group status and current user's admin role
    useEffect(() => {
        if (!isGroup || !conversationId || !auth) {
            setIsCurrentUserAdmin(false);
            return;
        }
        (async () => {
            try {
                const groupData = await fetchGroupDetails(conversationId, auth);
                if (groupData?.groupDetails) {
                    updateGroupAdminMode(conversationId, groupData.groupDetails.SendNewMessage === 0);
                    const currentUserId = auth?.id || auth?.userId;
                    const me = groupData.members?.find(m => Number(m.UserId) === Number(currentUserId));
                    setIsCurrentUserAdmin(me?.IsGroupAdmin === 1);
                }
            } catch (e) {
                console.error('Error fetching initial group status:', e);
            }
        })();
    }, [conversationId, isGroup, auth, updateGroupAdminMode]);

    // Register group socket listeners
    useEffect(() => {
        if (!isGroup || !conversationId) return;

        const currentUserId = auth?.id || auth?.userId;

        const GROUP_EVENT_LABELS = {
            group_created: 'Group created',
            group_updated: 'Group updated',
            group_deleted: 'Group deleted',
            group_info_request: 'Group info requested',
        };

        const MEMBER_EVENT_LABELS = {
            member_added: (name) => `${name} added to group`,
            member_removed: (name) => `${name} removed from group`,
            member_promoted: (name) => `${name} promoted to admin`,
            member_demoted: (name) => `${name} demoted from admin`,
        };

        const callbacks = {
            onGroupEvent: (data) => {
                if (data.conversationId !== conversationId) return;
                if (data.conversationData) addUniqueMessage?.(data.conversationData);

                const notifKey = { group_created: 'GROUP_CREATED', group_updated: 'GROUP_UPDATED' }[data.eventType];
                if (notifKey) notify(data, notifKey, auth);

                const shouldSkipRefresh = ['group_updated', 'group_created'].includes(data.eventType);
                if (!shouldSkipRefresh) toast(GROUP_EVENT_LABELS[data.eventType] || 'Group event');
                if (refresh && !shouldSkipRefresh) setTimeout(() => refresh(), 500);
            },

            onMemberEvent: (data) => {
                if (data.conversationId !== conversationId) return;
                if (data.conversationData) addUniqueMessage?.(data.conversationData);

                const memberName = data.memberName || 'Member';
                const isCurrentUserRemoved =
                    data.eventType === 'member_removed' &&
                    Number(data.removedMemberId) === Number(currentUserId);

                const notifMap = {
                    member_added: 'MEMBER_ADDED',
                    member_removed: isCurrentUserRemoved ? 'YOU_WERE_REMOVED' : 'MEMBER_REMOVED',
                    member_promoted: 'MEMBER_PROMOTED',
                    member_demoted: 'MEMBER_DEMOTED',
                };
                if (notifMap[data.eventType]) notify(data, notifMap[data.eventType], auth);

                if (isCurrentUserRemoved) {
                    updateRemoveInGroupStatus(conversationId, true);
                    toast.error('You were removed from this group');
                } else if (data.eventType === 'member_added') {
                    const isCurrentUserAdded = data.newMemberIds?.some(
                        id => Number(id) === Number(currentUserId)
                    );
                    if (isCurrentUserAdded) {
                        updateRemoveInGroupStatus(conversationId, false);
                        toast.success('You were added to the group');
                    } else {
                        toast(MEMBER_EVENT_LABELS.member_added(memberName));
                    }
                } else if (data.eventType === 'member_promoted' || data.eventType === 'member_demoted') {
                    if (Number(data.memberId) === Number(currentUserId)) {
                        setIsCurrentUserAdmin(data.eventType === 'member_promoted');
                    }
                    toast(MEMBER_EVENT_LABELS[data.eventType](memberName));
                } else {
                    toast(MEMBER_EVENT_LABELS[data.eventType]?.(memberName) || 'Member event');
                }

                const shouldSkipRefresh = ['member_added', 'member_removed', 'member_promoted', 'member_demoted'].includes(data.eventType);
                if (refresh && !shouldSkipRefresh) setTimeout(() => refresh(), 500);
            },

            onPermissionEvent: (data) => {
                if (Number(data.conversationId) !== Number(conversationId)) return;
                notify(data, 'PERMISSION_CHANGED', auth);
                toast('Group permissions updated');

                if (data.changedPermission?.name === 'SendNewMessage') {
                    updateGroupAdminMode(conversationId, data.changedPermission.value === 0);
                } else if (data.permissions) {
                    updateGroupAdminMode(conversationId, data.permissions.SendNewMessage === 0);
                }

                if (refresh) setTimeout(() => refresh(), 500);
            },
        };

        registerListener(conversationId, callbacks);
        return () => unregisterListener(conversationId);
    }, [
        conversationId, isGroup,
        auth?.id, auth?.userId, auth,
        refresh, addUniqueMessage,
        updateRemoveInGroupStatus, updateGroupAdminMode,
        registerListener, unregisterListener,
    ]);

    const handleAddMembersSubmit = useCallback(async (selectedIds) => {
        if (!selectedIds?.length) return;
        try {
            const response = await addGroupParticipantApi(auth, {
                conversationId,
                selectedMembers: selectedIds,
            });
            if (response?.Status === '200') {
                toast.success('Members added successfully');
                setIsAddMemberDialogOpen(false);
                if (refresh) refresh();
            } else {
                toast.error(response?.Message || 'Failed to add members');
            }
        } catch {
            toast.error('Error adding members');
        }
    }, [auth, conversationId, refresh]);

    // Derive context-aware statuses
    const contextRemovedStatus = isRemovedFromGroup(conversationId);
    const isRemovedFromCurrentGroup =
        contextRemovedStatus !== null && contextRemovedStatus !== undefined
            ? contextRemovedStatus
            : selectedCustomer?.RemoveInGroup === 1;

    const contextAdminMode = isGroupOnlyAdminSend(conversationId);
    const isOnlyAdminSend =
        contextAdminMode !== null && contextAdminMode !== undefined
            ? contextAdminMode
            : selectedCustomer?.IsGroupAdmin === 1;

    return {
        isCurrentUserAdmin,
        isAddMemberDialogOpen,
        setIsAddMemberDialogOpen,
        handleAddMembersSubmit,
        isRemovedFromCurrentGroup,
        isOnlyAdminSend,
    };
}
