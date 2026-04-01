import { buildGroupMessagePayload } from '../../../utils/groupSocketHelpers';
import { emitInternalMessageSend, emitInternalMessageRead, isSocketConnected } from '../../../socket';

export const emitReadReceipt = (auth, recipients, status, isGroup, conversationId) => {
  if (!isSocketConnected()) return;
  const ids = Array.isArray(recipients) ? recipients : [recipients];
  ids.forEach(id => {
    if (!id) return;
    emitInternalMessageRead({
      ufcc: auth?.ufcc,
      ReceiverId: Number(id),
      ConversationId: conversationId,
      IsGroup: isGroup ? 1 : 0,
      Status: status,
      MessageStatus: status,
    });
  });
};

export const emitTextMessage = ({ auth, selectedCustomer, messageId, message, isEdited = 0, receiverIds, extra = {} }) => {
  const payload = buildGroupMessagePayload({
    message,
    conversationId: selectedCustomer.ConversationId,
    receiverIds,
    auth,
    attachments: null,
    replyTo: 0,
    direction: 0,
    messageId,
    isEdited,
    dateTime: extra.dateTime,
  });
  emitInternalMessageSend({ ...payload, ...extra, receiveEvent: 'internal:msg_receive' });
};

export const emitMediaMessage = (payload) => {
  emitInternalMessageSend(payload);
};