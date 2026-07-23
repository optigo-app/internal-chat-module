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

export function useMessageActions({ auth, selectedCustomer, selectedCustomerRef, uiState, dispatchUI, dispatchMsg, fetchAndCacheGroupMembers, onCustomerSelect, tempConversationId, uploadAndSendMedia }) {
  const handleSendMessage = useCallback(async (containerRef, scrollToBottom, messageOverride = null) => {
    // Always read the latest selected customer to avoid emitting to a stale conversation
    const customer = selectedCustomerRef?.current || selectedCustomer;

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
            ConversationId: customer?.ConversationId || tempConversationId,
          },
        });
        if (typeof scrollToBottom === 'function') scrollToBottom();
        await uploadAndSendMedia({ files, caption, type, tempId, time, date, dateTime });
      }
      if (typeof scrollToBottom === 'function') scrollToBottom();
      return;
    }

    const replySnapshot = uiState.replyToMessage;
    const replyToMessageId = uiState.storeMessData?.messageId;
    const tempId = `${Date.now()}-${Math.random()}`;

    dispatchMsg({
      type: MSG.UPSERT, id: tempId,
      msg: {
        Id: tempId, Message: caption, Time: time, Date: date, DateTime: dateTime,
        Direction: 1, Status: 'pending', MessageType: 'text',
        ConversationId: customer?.ConversationId || tempConversationId,
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
          conversationId: replySnapshot.ConversationId || customer?.ConversationId,
          replyToMessageId: replySnapshot.Id,
          ReplyToAttachmentId: replySnapshot.ReplyToAttachmentId,
          message: caption, messageType: 1,
        })
        : await sendTextMessage(auth, {
          senderId: auth?.id,
          receiverId: customer?.CustomerId || customer?.UserId,
          conversationId: customer?.ConversationId ?? null,
          message: caption,
        });

      const stat = resp?.Data?.rd?.[0]?.stat;
      const statMsg = resp?.Data?.rd?.[0]?.stat_msg;

      if (stat === 0) {
        const errorMsg = statMsg ? statMsg.replace(/^"|"$/g, '') : 'Failed to send message';
        toast.error(errorMsg);
        dispatchMsg({ type: MSG.UPSERT, id: tempId, msg: { Status: 4 } });
        if (typeof scrollToBottom === 'function') scrollToBottom();
        return;
      }

      const sentId = resp?.Data?.rd?.[0]?.MessageId;
      const convId = resp?.Data?.rd?.[0]?.ConversationId || customer?.ConversationId;
      const isNewConv = resp?.Data?.rd?.[0]?.IsNewConversation === true;

      if (sentId) {
        const isGroup = customer?.IsGroup === 1;
        let receiverIds = customer?.ReceiverId || customer?.UserId || customer?.SenderId;
        if (isGroup) {
          try {
            const groupData = await fetchAndCacheGroupMembers(customer.ConversationId);
            const memberIds = (groupData?.members || []).map(m => Number(m.UserId || m.userId || m.id)).filter(Boolean);
            if (memberIds.length > 0) receiverIds = memberIds;
          } catch { /* fallback to single ReceiverId */ }
        }

        // Build reply context fields so receiver can render the reply preview
        // Use the actual original-sender name instead of the local "You" placeholder
        const replyOriginalSenderName = replySnapshot?.sender === 'You'
          ? (auth?.username || auth?.userId || 'You')
          : (replySnapshot?.sender || customer?.name || 'Customer');

        const replyExtra = (isReply && replySnapshot) ? {
          ContextType: 2,
          ContextId: replySnapshot.Id,
          ReplyContextMsg: replySnapshot.text || 'Media',
          SenderInfo: replyOriginalSenderName,
          Sender: replyOriginalSenderName,
          ReplyToAttachmentId: replySnapshot.ReplyToAttachmentId || null,
        } : {};

        emitTextMessage({
          auth, selectedCustomer: customer, messageId: sentId, message: caption, isEdited: 0, receiverIds,
          extra: {
            Id: auth.SocketId, Status: 1, MessageStatus: 1, MessageType: 'text',
            Time: time, Date: date, DateTime: dateTime,
            ConversationId: convId || tempConversationId,
            dateTime,
            ...replyExtra,
          },
        });
        dispatchMsg({ type: MSG.UPSERT, id: tempId, msg: { Id: sentId, MessageId: sentId, Status: 1, SenderId: auth?.id, Direction: 1 } });
      } else {
        toast.error('Failed to send message');
        dispatchMsg({ type: MSG.UPSERT, id: tempId, msg: { Status: 4 } });
      }

      if (isNewConv && convId && onCustomerSelect) {
        onCustomerSelect({ ...customer, ConversationId: convId });
        window.dispatchEvent(new CustomEvent('UPDATE_CONVERSATION_ITEM', {
          detail: { ...customer, ConversationId: convId, Message: caption, DateTime: dateTime, SenderId: auth?.id }
        }));
      }
    } catch (err) {
      console.error('sendTextMessage error:', err);
      toast.error('Failed to send message');
      dispatchMsg({ type: MSG.UPSERT, id: tempId, msg: { Status: 4 } });
    }

    if (typeof scrollToBottom === 'function') scrollToBottom();
  }, [auth, selectedCustomerRef, selectedCustomer, uiState.inputValue, uiState.replyToMessage, uiState.storeMessData, uiState.mediaFiles, tempConversationId, onCustomerSelect, uploadAndSendMedia, fetchAndCacheGroupMembers]);

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
    // Read the latest selected conversation so deletions go to the right chat
    const customer = selectedCustomerRef?.current || selectedCustomer;
    try {
      const response = await deleteMessageApi(auth, messageId, mode, customer?.ConversationId);
      const deletedInfo = response?.Data?.rd?.[0] || response?.rd?.[0];
      if (deletedInfo?.stat != 0) {
        if (Number(mode) === 2) {
          dispatchMsg({ type: MSG.DELETE_ALL, messageId, deletedInfo });
          const isGroup = customer?.IsGroup === 1;
          const groupData = isGroup ? await fetchAndCacheGroupMembers(customer.ConversationId) : null;
          const memberIds = (groupData?.members || []).map(m => Number(m.UserId || m.userId || m.id)).filter(Boolean);
          emitInternalMessageDelete({
            ufcc: auth?.ufcc, UserId: auth?.id, SenderId: auth?.id,
            ReceiverId: isGroup ? (memberIds.length ? memberIds : [customer?.ReceiverId]) : customer?.ReceiverId,
            ConversationId: customer?.ConversationId, MessageId: messageId,
            Message: deletedInfo.Message || 'This message was deleted.',
            Message1: deletedInfo.Message1 || 'You deleted this message.',
            IsDeletedForEveryone: 1,
            DateTime: deletedInfo.DeletedAt || new Date().toISOString(),
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
  }, [auth, selectedCustomerRef, selectedCustomer, fetchAndCacheGroupMembers]);

  const handleReply = useCallback(async (message, attachmentId = null) => {
    dispatchMsg({ type: MSG.SET_STORE_MESS, value: { messageId: message?.MessageId } });
    const mediaCount = Array.isArray(message?.mediaItems) ? message.mediaItems.length : 0;
    const fileName = message?.fileName || message?.mediaItems?.[0]?.filename || '';
    const replyType = message?.MessageType;
    const fallback = replyType === 'image' ? (mediaCount > 1 && !attachmentId ? `${mediaCount} Photos` : 'Photo')
      : replyType === 'video' ? (mediaCount > 1 && !attachmentId ? `${mediaCount} Videos` : 'Video')
        : replyType === 'document' ? (fileName || 'Document') : 'Media';

    const replyText = message?.Message?.trim() ? message.Message : fallback;
    let finalAttachmentId = attachmentId;
    if (!finalAttachmentId && mediaCount > 0) {
      finalAttachmentId = message.mediaItems.map(i => i.attachmentId || i.Id).filter(Boolean).join(',');
    }

    // Prefer the actual message author over the conversation/group name
    const currentCustomer = selectedCustomerRef?.current || selectedCustomer;
    const originalSenderName = (() => {
      if (message?.Direction === 1) return 'You';
      if (message?.FirstName || message?.LastName) {
        return `${message.FirstName || ''} ${message.LastName || ''}`.trim();
      }
      return message?.SenderInfo || message?.SenderName || message?.Sender || currentCustomer?.name || 'Customer';
    })();

    dispatchUI({
      type: UI.SET_REPLY,
      value: {
        Id: message?.Id,
        sender: originalSenderName,
        text: replyText, MessageType: message?.MessageType,
        ReplyToAttachmentId: finalAttachmentId || null,
      },
    });
  }, [selectedCustomerRef, selectedCustomer]);

  const handleCancelReply = useCallback(() => {
    dispatchUI({ type: UI.SET_REPLY, value: null });
  }, []);

  return { handleSendMessage, handleEditMessage, handleDeleteMessage, handleReply, handleCancelReply };
}