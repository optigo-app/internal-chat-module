import { useEffect, useRef, useCallback } from 'react';
import {
  addMessageReactionHandler, addInternalMessageHandler,
  addInternalStatusHandler, addInternalMessageDeletionHandler,
} from '../../../socket';
import { MSG } from './conversationReducer';
import { getMessageId } from './messageHelpers';
import { normalizeServerMessages as normalizeServerMessagesHelper } from '../conversationUtils';
import { resolveStatus } from './messageHelpers';

export function useSocketHandlers({ auth, selectedCustomerRef, dispatchMsg, handleReadMessage }) {
  // Stable ref wrappers so the effect deps don't change on every render
  const dispatchRef     = useRef(dispatchMsg);
  const handleReadRef   = useRef(handleReadMessage);
  useEffect(() => { dispatchRef.current   = dispatchMsg;     }, [dispatchMsg]);
  useEffect(() => { handleReadRef.current = handleReadMessage; }, [handleReadMessage]);

  const addUniqueMessage = useCallback((rawData) => {
    if (!rawData || typeof rawData !== 'object') return;
    const [normalized] = normalizeServerMessagesHelper([rawData], auth) || [];
    if (!normalized) return;

    const rawSenderId = Number(rawData?.SenderId ?? rawData?.Sender);
    const myId        = Number(auth?.id ?? auth?.userId);
    const isMyMessage = !!(rawSenderId && myId && rawSenderId === myId);
    const direction   = isMyMessage ? 1 : (normalized?.Direction === 2 ? 0 : (normalized?.Direction ?? 0));
    const msg         = { ...normalized, Direction: direction };
    const id          = getMessageId(msg);
    if (!id) return;

    const isEdit = rawData?.IsEdited === 1 || rawData?.isEdited === 1;
    dispatchRef.current({ type: MSG.UPSERT, msg, id, isEdit });
  }, [auth?.token, auth?.userId]);

  useEffect(() => {
    if (!auth?.token || !auth?.userId) return;

    const handleChangeStatus = (data) => {
      if (!data || typeof data !== 'object') return;
      dispatchRef.current({ type: MSG.SET_MESS_ID, value: data?.MessageId });
      if (data?.MessageId) dispatchRef.current({ type: MSG.SET_STORE_MESS, value: { messageId: data.MessageId } });
      dispatchRef.current({ type: MSG.SET_TEMP_CONV, value: data?.ConversationId });
      dispatchRef.current({
        type: MSG.UPDATE_STATUS,
        messageId: data?.MessageId,
        conversationId: data?.ConversationId,
        status: resolveStatus(data?.MessageStatus ?? data?.status ?? data?.Status),
        extra: { SenderInfo: data.SenderInfo, DateTime: data.DateTime },
      });
    };

    const handleReactionMessage = (data) => {
      if (!data) return;
      const myId     = Number(auth?.id ?? auth?.userId);
      const senderId = Number(data?.SenderId ?? data?.userId ?? data?.UserId);
      const messageId = data?.MessageId || data?.Id || data?.id;
      if (!messageId) return;

      let incomingReactions = [];
      try {
        incomingReactions = data.ReactionEmojis
          ? (typeof data.ReactionEmojis === 'string' ? JSON.parse(data.ReactionEmojis) : data.ReactionEmojis)
          : [];
      } catch (e) {
        console.error('reaction parse error', e);
      }

      // If incomingReactions is empty but we have a senderId, it might be a removal
      // We pass the data to the reducer which will handle the merging/removal logic
      dispatchRef.current({
        type: MSG.UPDATE_REACTION,
        messageId,
        reactions: incomingReactions,
        senderId: senderId
      });
    };

    const handleInternalMessage = (data) => {
      if (!data || typeof data !== 'object') return;
      if (Number(data?.Sender) === auth?.id || Number(data?.SenderId) === auth?.id) return;

      const incomingConvId = data?.ConversationId;
      const activeConvId   = selectedCustomerRef.current?.ConversationId;
      if (activeConvId && incomingConvId && Number(activeConvId) === Number(incomingConvId)) {
        dispatchRef.current({ type: MSG.SET_MESS_ID, value: data?.MessageId });
        addUniqueMessage(data);
        handleReadRef.current(incomingConvId, null, false, true);
      }
    };

    const handleDeleteMessageSocket = (data) => {
      const myId     = Number(auth?.id ?? auth?.userId);
      const senderId = Number(data?.UserId ?? data?.SenderId ?? data?.senderId);
      if (myId && senderId && myId === senderId) return;
      dispatchRef.current({ type: MSG.DELETE_ALL, messageId: data.MessageId, deletedInfo: data });
    };

    const r1 = addMessageReactionHandler(handleReactionMessage);
    const r2 = addInternalStatusHandler(handleChangeStatus);
    const r3 = addInternalMessageHandler(handleInternalMessage);
    const r4 = addInternalMessageDeletionHandler(handleDeleteMessageSocket);

    return () => { r1(); r2(); r3(); r4(); };
  }, [auth?.token, auth?.userId, addUniqueMessage]);

  return { addUniqueMessage };
}