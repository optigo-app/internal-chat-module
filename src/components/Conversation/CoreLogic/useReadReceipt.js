import { useCallback, useRef } from 'react';
import { readMessageApi } from '../../../API/SendMessage/ReadMessageApi';
import { isSocketConnected } from '../../../socket';
import { emitReadReceipt } from './socketHelpers';

export function useReadReceipt({ auth, selectedCustomerRef, messagesRef, isDrawerOpen, onConversationRead, fetchAndCacheGroupMembers }) {
  const readTimeoutRef   = useRef(null);
  const lastReadConvRef  = useRef(null);
  const lastReadTimeRef  = useRef(0);
  const lastReadMsgIdRef = useRef(null);

  const handleReadMessage = useCallback(async (custConverId, signal = null, force = false, skipDrawerCheck = false) => {
    if (!custConverId) return;
    if (document.visibilityState !== 'visible') return;
    if (!skipDrawerCheck && isDrawerOpen) return;

    const now = Date.now();
    if (!force && lastReadConvRef.current === custConverId && now - lastReadTimeRef.current < 3000) return;

    clearTimeout(readTimeoutRef.current);

    readTimeoutRef.current = setTimeout(async () => {
      try {
        const currentConv   = selectedCustomerRef.current;
        const currentConvId = currentConv?.ConversationId;
        if (Number(currentConvId) !== Number(custConverId)) return;

        const isGroup    = Boolean(currentConv?.IsGroup || currentConv?.isGroup);
        const receiverId = currentConv?.ReceiverId || currentConv?.CustomerId || currentConv?.UserId;

        if (isSocketConnected()) {
          let receiverIdValue = receiverId;
          if (isGroup) {
            const groupData = await fetchAndCacheGroupMembers(custConverId);
            const memberIds = (groupData?.members || []).map(m => Number(m.UserId || m.userId || m.id)).filter(Boolean);
            if (memberIds?.length > 0) receiverIdValue = memberIds;
          }

          if (onConversationRead) onConversationRead(true);

          const msgs   = Array.isArray(messagesRef.current) ? messagesRef.current : (messagesRef.current?.data || []);
          const unread = msgs.filter(m => m.Direction === 0 && m.Status < 3);
          if (unread.length === 0) return;

          const latestId = Math.max(...unread.map(m => Number(m.MessageId || m.Id)).filter(id => !isNaN(id)));
          if (lastReadMsgIdRef.current === latestId && lastReadConvRef.current === custConverId) return;

          emitReadReceipt(auth, receiverIdValue, 2, isGroup, custConverId);

          lastReadConvRef.current  = custConverId;
          lastReadTimeRef.current  = Date.now();
          lastReadMsgIdRef.current = latestId;

          if (onConversationRead) onConversationRead(true);

          const unreadSenderIds = [...new Set(unread.map(m => Number(m.SenderId || m.Sender)).filter(Boolean))];
          const response = await readMessageApi(auth, { ConversationId: custConverId, signal });

          if (response?.Data?.rd?.[0]?.MsgRead === 1 && unreadSenderIds.length > 0) {
            emitReadReceipt(auth, isGroup ? unreadSenderIds : receiverId, 3, isGroup, custConverId);
          }
        } else {
          lastReadConvRef.current = custConverId;
          lastReadTimeRef.current = Date.now();
        }
      } catch (err) {
        console.error('handleReadMessage error:', err);
      }
    }, 1000);
  }, [auth?.token, auth?.userId, isDrawerOpen, onConversationRead, fetchAndCacheGroupMembers]);

  return { handleReadMessage };
}