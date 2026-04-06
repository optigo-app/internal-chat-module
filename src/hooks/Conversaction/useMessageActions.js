import { useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { updateConversationApi } from '../../API/SendMessage/updateConversationApi';

export const useMessageActions = ({ selectedCustomer, auth, refresh, updateFavoriteStatus, isFavorite }) => {
    const [messageContextMenu, setMessageContextMenu] = useState(null);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [selectedMessageForEdit, setSelectedMessageForEdit] = useState(null);
    const [isForwardFromViewer, setIsForwardFromViewer] = useState(false);

    const handleContextMenu = useCallback((event, message) => {
        event.preventDefault();
        setMessageContextMenu(
            messageContextMenu === null
                ? { mouseX: event.clientX - 2, mouseY: event.clientY - 4, message }
                : null
        );
    }, [messageContextMenu]);

    const handleEditAction = useCallback((message) => {
        setSelectedMessageForEdit(message);
        setEditDialogOpen(true);
        setMessageContextMenu(null);
    }, []);

    const handleToggleFavorite = useCallback(async () => {
        const newIsStar = isFavorite ? 0 : 1;
        updateFavoriteStatus(selectedCustomer?.ConversationId, newIsStar);

        try {
            const response = await updateConversationApi(auth, {
                page: 1,
                pageSize: 50,
                conversationId: selectedCustomer?.ConversationId,
                isPin: selectedCustomer?.IsPin || 0,
                isStar: newIsStar,
                isArchived: selectedCustomer?.IsArchived || 0,
            });

            if (response?.Status === "200" || response?.success === true) {
                toast.success(newIsStar ? "Added to favorites" : "Removed from favorites");
                if (selectedCustomer) {
                    selectedCustomer.IsStar = newIsStar;
                }
                if (refresh) refresh();
            } else {
                updateFavoriteStatus(selectedCustomer?.ConversationId, isFavorite ? 1 : 0);
                toast.error("Failed to update favorite status");
            }
        } catch (error) {
            updateFavoriteStatus(selectedCustomer?.ConversationId, isFavorite ? 1 : 0);
            toast.error("Error updating favorite status");
        }
    }, [selectedCustomer, auth, isFavorite, updateFavoriteStatus, refresh]);

    const handleMemberRedirect = useCallback((member) => {
        toast("Member Message Comming Soon...", {
            icon: "⏳",
        });
        return;
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
        }
    }, []);

    return {
        messageContextMenu,
        setMessageContextMenu,
        editDialogOpen,
        setEditDialogOpen,
        selectedMessageForEdit,
        setSelectedMessageForEdit,
        isForwardFromViewer,
        setIsForwardFromViewer,
        handleContextMenu,
        handleEditAction,
        handleToggleFavorite,
        handleMemberRedirect
    };
};
