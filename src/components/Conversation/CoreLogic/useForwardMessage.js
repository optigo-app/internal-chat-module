import { useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { forwardMessageApi } from '../../../API/SendMessage/forwardMessageApi';
import { emitInternalMessageSend } from '../../../socket';
import { MSG } from './conversationReducer';
import { UI } from './uiReducer';
import { getLocalTime } from './messageHelpers';

export function useForwardMessage({ auth, selectedCustomer, uiState, dispatchUI, dispatchMsg }) {

  const handleForward = useCallback((message, event, attachmentId = null) => {
    if (!event) return;
    event.stopPropagation();
    dispatchUI({ type: UI.SET_FORWARD, value: { ...(message || {}), ReplyToAttachmentId: attachmentId || null } });
    dispatchUI({ type: UI.SET_FORWARD_ANCHOR, value: event.currentTarget });
  }, []);

  const handleCloseForward = useCallback(() => {
    dispatchUI({ type: UI.SET_FORWARD, value: null });
    dispatchUI({ type: UI.SET_FORWARD_ANCHOR, value: null });
  }, []);

  const handleSendForward = useCallback(async (selectedContactsArr = []) => {
    if (!selectedContactsArr.length || !uiState.forwardMessage) {
      toast.error('Please select at least one contact.');
      return;
    }

    const conversationIdsArr = [];
    const userIdsArr         = [];
    const orderedRecipients  = [];

    for (const contact of selectedContactsArr) {
      if (contact?.ConversationId) { conversationIdsArr.push(contact.ConversationId); orderedRecipients.push(contact); }
      else if (contact?.UserId || contact?.id) { userIdsArr.push(contact.UserId || contact.id); orderedRecipients.push(contact); }
    }

    const fwdMsg = uiState.forwardMessage;
    const getAttachmentIds = () => {
      if (fwdMsg?.ReplyToAttachmentId) return String(fwdMsg.ReplyToAttachmentId);
      if (Array.isArray(fwdMsg?.mediaItems) && fwdMsg.mediaItems.length) {
        const ids = fwdMsg.mediaItems.map(a => a?.attachmentId || a?.Id).filter(Boolean);
        if (ids.length) return ids.join(',');
      }
      let att = fwdMsg?.Attachments;
      if (att) {
        if (typeof att === 'string') try { att = JSON.parse(att); } catch { att = null; }
        if (Array.isArray(att) && att.length) {
          const ids = att.map(a => a?.Id || a?.id).filter(Boolean);
          if (ids.length) return ids.join(',');
        }
      }
      return null;
    };

    try {
      const response = await forwardMessageApi(auth, {
        MessageId: fwdMsg?.MessageId ?? null,
        ConversationIds: conversationIdsArr.join(',') || null,
        UserIds: userIdsArr.join(',') || null,
        ForwardedAttachmentIds: getAttachmentIds(),
      });

      if (response?.success || response?.Status === '200') {
        toast.success('Message forwarded successfully');

        const rd = response?.Data?.rd?.[0] || response?.rd?.[0];
        if (rd?.ForwardedMessages) {
          try {
            const forwarded = JSON.parse(rd.ForwardedMessages);
            if (Array.isArray(forwarded)) {
              forwarded.forEach((fwdData, index) => {
                const contact    = orderedRecipients[index];
                const receiverId = contact?.UserId || contact?.ReceiverId || contact?.id;
                if (!receiverId || !fwdData) return;

                const { time, date, dateTime } = getLocalTime();
                const convId       = fwdData.ConversationId;
                const realMsgId    = fwdData.MessageId;
                const isMedia      = ['image', 'video', 'document'].includes(fwdMsg?.MessageType);
                let mediaItems     = fwdMsg?.mediaItems || [];
                let previewUrl     = fwdMsg?.previewUrl || null;
                let fileName       = fwdMsg?.fileName || null;
                let fileType       = fwdMsg?.fileType || null;

                if (fwdMsg?.ReplyToAttachmentId && Array.isArray(mediaItems)) {
                  const single = mediaItems.find(i => i.attachmentId === fwdMsg.ReplyToAttachmentId || i.Id === fwdMsg.ReplyToAttachmentId);
                  if (single) { mediaItems = [single]; previewUrl = single.url || previewUrl; fileName = single.filename || fileName; fileType = single.mimeType || fileType; }
                }

                if (selectedCustomer?.ConversationId && Number(convId) === Number(selectedCustomer.ConversationId)) {
                  dispatchMsg({
                    type: MSG.UPSERT, id: realMsgId,
                    msg: {
                      Id: realMsgId, MessageId: realMsgId, SenderId: auth?.id, ConversationId: convId,
                      Message: fwdMsg?.Message || (isMedia ? '' : 'Forwarded Message'),
                      Status: 1, Direction: 1, DateTime: dateTime, MessageType: fwdMsg?.MessageType || 'text',
                      IsForwarded: true, mediaItems, previewUrl, fileName, fileType, Time: time, Date: date,
                    },
                  });
                }

                emitInternalMessageSend({
                  Id: realMsgId, ReceiverId: receiverId, ufcc: auth?.ufcc,
                  SenderId: auth?.id, ConversationId: convId,
                  Message: fwdMsg?.Message || (isMedia ? '' : 'Forwarded Message'),
                  MessageId: realMsgId, Status: 1, MessageStatus: 1, Direction: 2, DateTime: dateTime,
                  MessageType: fwdMsg?.MessageType || 'text', IsForwarded: true,
                  mediaItems, previewUrl, fileName, fileType, Time: time, Date: date,
                });
              });
            }
          } catch (err) { console.error('ForwardedMessages parse error:', err); }
        }

        dispatchUI({ type: UI.SET_FORWARD, value: null });
        dispatchUI({ type: UI.SET_FORWARD_ANCHOR, value: null });
      } else {
        toast.error(response?.error || 'Failed to forward message');
      }
    } catch (err) {
      toast.error(err?.message || 'Something went wrong while forwarding');
    }
  }, [auth, selectedCustomer, uiState.forwardMessage]);

  return { handleForward, handleCloseForward, handleSendForward };
}