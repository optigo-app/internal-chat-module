import { useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { removeMemberApi } from '../API/Groups/RemoveMemberApi';
import { clearChatApi } from '../API/ClearChat/ClearChatApi';
import { deleteConversationApi } from '../API/ConversationView/DeleteConversationApi';
import { isMessageEditable } from '../utils/globalFunc';

const INITIAL_STATE = { isOpen: false, actionType: null };

export function useConfirmModal({ 
    selectedCustomer, 
    auth, 
    onCustomerSelect, 
    refresh, 
    handleDeleteMessage,
    fetchAndCacheGroupMembers,
    isCurrentUserAdmin,
    getGroupPermission
}) {
    const [confirmationModal, setConfirmationModal] = useState(INITIAL_STATE);
    const [selectedMessageForDelete, setSelectedMessageForDelete] = useState(null);

    const open = useCallback((actionType) => setConfirmationModal({ isOpen: true, actionType }), []);
    const close = useCallback(() => setConfirmationModal(INITIAL_STATE), []);

    const openDeleteMessage = useCallback((message) => {
        setSelectedMessageForDelete(message);
        open('deleteMessage');
    }, [open]);

    const checkAdminStatusAndShowConfirmation = useCallback(async () => {
        try {
            const groupData = await fetchAndCacheGroupMembers(selectedCustomer.ConversationId);
            if (groupData?.members) {
                const currentUserId = auth?.id || auth?.userId;
                const currentUser = groupData.members.find(m => Number(m.UserId) === Number(currentUserId));
                const adminCount = groupData.members.filter(m => m.IsGroupAdmin === 1).length;
                if (currentUser?.IsGroupAdmin === 1 && adminCount === 1) {
                    open('adminCannotLeave');
                } else {
                    open('exitGroup');
                }
            } else {
                open('exitGroup');
            }
        } catch {
            open('exitGroup');
        }
    }, [selectedCustomer, auth, open, fetchAndCacheGroupMembers]);

    const handleConfirmExitGroup = useCallback(async () => {
        try {
            const currentUserId = auth?.id || auth?.userId;
            const response = await removeMemberApi(auth, {
                conversationId: selectedCustomer.ConversationId,
                memberId: currentUserId,
            });
            if (response?.Status === '200') {
                toast.success('You have left the group');
                close();
                onCustomerSelect(null);
                refresh();
            } else {
                close();
                toast.error(response?.Message || 'Failed to exit group');
            }
        } catch {
            close();
            toast.error('Error exiting group');
        }
    }, [selectedCustomer, auth, onCustomerSelect, refresh, close]);

    const handleConfirmDeleteChat = useCallback(async () => {
        try {
            const response = await deleteConversationApi(auth, {
                conversationId: selectedCustomer.ConversationId,
            });
            if (response?.Status === '200' || response?.success === true) {
                toast.success('Conversation deleted');
                close();
                onCustomerSelect(null);
                window.dispatchEvent(new CustomEvent('DELETE_CONVERSATION', {
                    detail: { conversationId: selectedCustomer.ConversationId },
                }));
            } else {
                toast.error(response?.Message || 'Failed to delete conversation');
                close();
            }
        } catch {
            close();
            toast.error('Error deleting conversation');
        }
    }, [selectedCustomer, auth, onCustomerSelect, close]);

    const handleConfirmClearChat = useCallback(async () => {
        try {
            const response = await clearChatApi(auth, {
                conversationId: selectedCustomer.ConversationId,
                userId: auth?.id || auth?.userId,
            });
            if (response?.Status === '200' || response?.success === true) {
                toast.success('Chat cleared successfully');
                const convId = selectedCustomer.ConversationId;
                sessionStorage.removeItem(`chat_cache_${convId}`);
                sessionStorage.removeItem(`chat_last_page_${convId}`);
                window.dispatchEvent(new CustomEvent('CLEAR_CONVERSATION_MESSAGES', {
                    detail: { conversationId: convId },
                }));
                close();
                if (refresh) refresh();
            } else {
                close();
                toast.error(response?.Message || 'Failed to clear chat');
            }
        } catch {
            close();
            toast.error('Error clearing chat');
        }
    }, [selectedCustomer, auth, refresh, close]);

    // Derive the onConfirm handler based on actionType
    const ACTION_CONFIRM_MAP = {
        adminCannotLeave: close,
        exitGroup: handleConfirmExitGroup,
        deleteGroup: handleConfirmDeleteChat,
        deleteChat: handleConfirmDeleteChat,
        clearChat: handleConfirmClearChat,
        deleteMessage: null, // handled via actions[] in ConfirmationDialog
        logout: null, // handled via actions[] in ConfirmationDialog
    };

    const getDeleteMessageActions = useCallback(() => {
        const msg = selectedMessageForDelete;
        if (!msg) return [];
        const isOutgoing = msg?.Direction === 1;
        const timeLimit = parseInt(process.env.REACT_APP_MESSAGE_EDIT_TIME_LIMIT || '15', 10);
        const isWithinTimeLimit = isMessageEditable(msg, timeLimit);

        const canDeleteForAll =
            selectedCustomer?.IsGroup !== 1 ||
            isCurrentUserAdmin ||
            getGroupPermission(selectedCustomer?.ConversationId, 'AllowDeleteForAll') === 1 ||
            selectedCustomer?.AllowDeleteForAll === 1 ||
            selectedCustomer?.AllowDeleteForAll === true;

        return [
            ...(isWithinTimeLimit && isOutgoing && canDeleteForAll
                ? [{
                    label: 'Delete for everyone',
                    onClick: () => {
                        handleDeleteMessage(msg?.MessageId ?? msg?.Id, 2);
                        close();
                    },
                    danger: true,
                    variant: 'btn-action',
                }]
                : []),
            {
                label: 'Delete for me',
                onClick: () => {
                    handleDeleteMessage(msg?.MessageId ?? msg?.Id, 1);
                    close();
                },
                danger: true,
                variant: 'btn-action',
            },
            {
                label: 'Cancel',
                onClick: close,
                variant: 'btn-action',
            },
        ];
    }, [selectedMessageForDelete, handleDeleteMessage, close, selectedCustomer, isCurrentUserAdmin, getGroupPermission]);

    return {
        confirmationModal,
        open,
        close,
        openDeleteMessage,
        checkAdminStatusAndShowConfirmation,
        onConfirm: ACTION_CONFIRM_MAP[confirmationModal.actionType] ?? null,
        getDeleteMessageActions,
    };
}
