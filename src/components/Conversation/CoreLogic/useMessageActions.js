import { useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { sendTextMessage } from '../../../API/SendMessage/SendMessageApi';
import { replyToMessageApi } from '../../../API/SendMessage/replyToMessageApi';
import { editMessageApi } from '../../../API/SendMessage/EditMessageApi';
import { deleteMessageApi } from '../../../API/SendMessage/DeleteMessageApi';
import { MSG } from './conversationReducer';
import { UI } from './uiReducer';
import { getLocalTime } from './messageHelpers';
import { emitTextMessage } from './socketHelpers';
import { emitInternalMessageDelete } from '../../../socket';

export function useMessageActions({ auth, selectedCustomer, uiState, dispatchUI, dispatchMsg, fetchAndCacheGroupMembers, onCustomerSelect, tempConversationId, uploadAndSendMedia }) {

  const handleSendMessage = useCallback(async (containerRef, scrollToBottom, messageOverride = null) => {
    const caption = (messageOverride !== null ? messageOverride : uiState.inputValue).trim();
    if (!caption && !uiState.mediaFiles?.length) return;
    const { time, date, dateTime } = getLocalTime();

    // If media files are queued, delegate to uploadAndSendMedia
    if (uiState.mediaFiles?.length) {
      const selected = [...uiState.mediaFiles];
      dispatchUI({ type: UI.SET_INPUT, value: '' });
      dispatchUI({ type: UI.SET_SHOW_MEDIA, value: false });
      dispatchUI({ type: UI.SET_MEDIA_FILES, value: [] });

      const byType = { image: [], video: [], document: [] };
      for (const media of selected) {
        const file = media.file || media;
        if (!(file instanceof File)) continue;
        const t = file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : 'document';
        byType[t].push(file);
      }

      for (const [type, files] of Object.entries(byType).filter(([, list]) => list.length > 0)) {
        const tempId = `${Date.now()}-${type}-batch`;
        dispatchMsg({
          type: MSG.UPSERT, id: tempId,
          msg: {
            Id: tempId, Direction: 1, Status: 'pending', MessageType: type,
            previewUrl: URL.createObjectURL(files[0]), Message: caption,
            isUploading: true, percent: 0, Time: time, Date: date, DateTime: dateTime,
            mediaItems: files.map(f => ({ url: URL.createObjectURL(f), filename: f.name, mimeType: f.type, size: f.size })),
            ConversationId: selectedCustomer?.ConversationId || tempConversationId,
          },
        });
        if (typeof scrollToBottom === 'function') scrollToBottom();
        await uploadAndSendMedia({ files, caption, type, tempId, time, date, dateTime });
      }
      if (typeof scrollToBottom === 'function') scrollToBottom();
      return;
    }

    const replySnapshot    = uiState.replyToMessage;
    const replyToMessageId = uiState.storeMessData?.messageId;
    const tempId = `${Date.now()}-${Math.random()}`;

    dispatchMsg({
      type: MSG.UPSERT, id: tempId,
      msg: {
        Id: tempId, Message: caption, Time: time, Date: date, DateTime: dateTime,
        Direction: 1, Status: 'pending', MessageType: 'text',
        ConversationId: selectedCustomer?.ConversationId || tempConversationId,
        SenderId: auth?.id,
        ...(replySnapshot && replyToMessageId ? {
          ContextType: 2, ContextId: replyToMessageId,
          ReplyContextMsg: replySnapshot.text || 'Media',
          SenderInfo: replySnapshot.sender || '', Sender: replySnapshot.sender || '',
        } : {}),
      },
    });

    dispatchUI({ type: UI.SET_INPUT, value: '' });
    dispatchUI({ type: UI.SET_REPLY, value: null });
    if (typeof scrollToBottom === 'function') scrollToBottom();

    try {
      const isReply = !!(replySnapshot && replyToMessageId);
      const resp = isReply
        ? await replyToMessageApi(auth, {
            conversationId: replySnapshot.ConversationId || selectedCustomer?.ConversationId,
            replyToMessageId: replySnapshot.Id,
            ReplyToAttachmentId: replySnapshot.ReplyToAttachmentId,
            message: caption, messageType: 1,
          })
        : await sendTextMessage(auth, {
            senderId: auth?.id,
            receiverId: selectedCustomer?.CustomerId || selectedCustomer?.UserId,
            conversationId: selectedCustomer?.ConversationId ?? null,
            message: caption,
          });

      const sentId     = resp?.Data?.rd?.[0]?.MessageId;
      const convId     = resp?.Data?.rd?.[0]?.ConversationId || selectedCustomer?.ConversationId;
      const isNewConv  = resp?.Data?.rd?.[0]?.IsNewConversation === true;

      if (sentId) {
        const isGroup   = selectedCustomer?.IsGroup === 1;
        let receiverIds = selectedCustomer?.ReceiverId || selectedCustomer?.UserId;
        if (isGroup) {
          try {
            const groupData = await fetchAndCacheGroupMembers(selectedCustomer.ConversationId);
            const memberIds = (groupData?.members || []).map(m => Number(m.UserId || m.userId || m.id)).filter(Boolean);
            if (memberIds.length > 0) receiverIds = memberIds;
          } catch { /* fallback to single ReceiverId */ }
        }

        // Build reply context fields so receiver can render the reply preview
        const replyExtra = (isReply && replySnapshot) ? {
          ContextType: 2,
          ContextId: replySnapshot.Id,
          ReplyContextMsg: replySnapshot.text || 'Media',
          SenderInfo: replySnapshot.sender || '',
          Sender: replySnapshot.sender || '',
          ReplyToAttachmentId: replySnapshot.ReplyToAttachmentId || null,
        } : {};

        emitTextMessage({
          auth, selectedCustomer, messageId: sentId, message: caption, isEdited: 0, receiverIds,
          extra: {
            Id: auth.SocketId, Status: 1, MessageStatus: 1, MessageType: 'text',
            Time: time, Date: date, DateTime: dateTime,
            ConversationId: convId || tempConversationId,
            dateTime,
            ...replyExtra,
          },
        });
        dispatchMsg({ type: MSG.UPSERT, id: tempId, msg: { Id: sentId, MessageId: sentId, Status: 1, SenderId: auth?.id, Direction: 1 } });
      }

      if (isNewConv && convId && onCustomerSelect) {
        onCustomerSelect({ ...selectedCustomer, ConversationId: convId });
        window.dispatchEvent(new CustomEvent('UPDATE_CONVERSATION_ITEM', { detail: { ...selectedCustomer, ConversationId: convId, Message: caption, DateTime: dateTime } }));
      }
    } catch (err) {
      console.error('sendTextMessage error:', err);
      toast.error('Failed to send message');
      dispatchMsg({ type: MSG.UPSERT, id: tempId, msg: { Status: 4 } });
    }

    if (typeof scrollToBottom === 'function') scrollToBottom();
  }, [auth, selectedCustomer, uiState.inputValue, uiState.replyToMessage, uiState.storeMessData, uiState.mediaFiles, tempConversationId, onCustomerSelect, uploadAndSendMedia, fetchAndCacheGroupMembers]);

  const handleEditMessage = useCallback(async (messageId, newMessage) => {
    if (!messageId || !newMessage?.trim()) return;
    const { time, date } = getLocalTime();
    try {
      const response = await editMessageApi(auth, { messageId, newMessage });
      if (response?.Data?.rd?.[0]?.stat == 1) {
        dispatchMsg({ type: MSG.EDIT, messageId, newMessage: response.Data.rd[0].Message, time, date });
        toast.success('Message edited successfully');
      } else {
        toast.error(response?.Message || 'Failed to edit message');
      }
    } catch (err) {
      console.error('handleEditMessage error:', err);
      toast.error('Error editing message');
    }
  }, [auth]);

  const handleDeleteMessage = useCallback(async (messageId, mode) => {
    if (!messageId) return;
    try {
      const response  = await deleteMessageApi(auth, messageId, mode, selectedCustomer?.ConversationId);
      const deletedInfo = response?.Data?.rd?.[0] || response?.rd?.[0];
      if (deletedInfo?.stat != 0) {
        if (Number(mode) === 2) {
          dispatchMsg({ type: MSG.DELETE_ALL, messageId, deletedInfo });
          const isGroup   = selectedCustomer?.IsGroup === 1;
          const groupData = isGroup ? await fetchAndCacheGroupMembers(selectedCustomer.ConversationId) : null;
          const memberIds = (groupData?.members || []).map(m => Number(m.UserId || m.userId || m.id)).filter(Boolean);
          emitInternalMessageDelete({
            ufcc: auth?.ufcc, UserId: auth?.id, SenderId: auth?.id,
            ReceiverId: isGroup ? (memberIds.length ? memberIds : [selectedCustomer?.ReceiverId]) : selectedCustomer?.ReceiverId,
            ConversationId: selectedCustomer?.ConversationId, MessageId: messageId,
            Message: deletedInfo.Message || 'This message was deleted.', IsDeletedForEveryone: 1,
          });
        } else {
          dispatchMsg({ type: MSG.DELETE_ME, messageId });
        }
        toast.success('Message deleted successfully');
      } else {
        toast.error(response?.Message || 'Failed to delete message');
      }
    } catch (err) {
      console.error('handleDeleteMessage error:', err);
      toast.error('Error deleting message');
    }
  }, [auth, selectedCustomer, fetchAndCacheGroupMembers]);

  const handleReply = useCallback(async (message, attachmentId = null) => {
    dispatchMsg({ type: MSG.SET_STORE_MESS, value: { messageId: message?.MessageId } });
    const mediaCount = Array.isArray(message?.mediaItems) ? message.mediaItems.length : 0;
    const fileName   = message?.fileName || message?.mediaItems?.[0]?.filename || '';
    const replyType  = message?.MessageType;
    const fallback   = replyType === 'image' ? (mediaCount > 1 && !attachmentId ? `${mediaCount} Photos` : 'Photo')
      : replyType === 'video' ? (mediaCount > 1 && !attachmentId ? `${mediaCount} Videos` : 'Video')
      : replyType === 'document' ? (fileName || 'Document') : 'Media';

    const replyText = message?.Message?.trim() ? message.Message : fallback;
    let finalAttachmentId = attachmentId;
    if (!finalAttachmentId && mediaCount > 0) {
      finalAttachmentId = message.mediaItems.map(i => i.attachmentId || i.Id).filter(Boolean).join(',');
    }

    dispatchUI({
      type: UI.SET_REPLY,
      value: {
        Id: message?.Id,
        sender: message?.Direction === 1 ? 'You' : selectedCustomer?.name || 'Customer',
        text: replyText, MessageType: message?.MessageType,
        ReplyToAttachmentId: finalAttachmentId || null,
      },
    });
  }, [selectedCustomer?.name]);

  const handleCancelReply = useCallback(() => {
    dispatchUI({ type: UI.SET_REPLY, value: null });
  }, []);

  return { handleSendMessage, handleEditMessage, handleDeleteMessage, handleReply, handleCancelReply };
}