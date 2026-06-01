import { formatChatTimestamp } from '../../utils/DateFnc';
import { getCustomerAvatarSeed, getCustomerDisplayName, getWhatsAppAvatarConfig } from '../../utils/globalFunc';
import React from 'react';
import { Archive, ArchiveRestore, File, FileText, Image, Pin, PinOff, Star, StarOff, Video } from 'lucide-react';

export const getMessagePreview = (msg) => {
  const isDeleted = msg?.IsDeletedForEveryone === 1;
  const type = msg?.MessageType;
  const text = isDeleted ? (msg?.Message || 'This message was deleted.')
    : type === 'text' ? (msg?.Message || '')
      : type === 'image' ? 'Photo'
        : type === 'video' ? 'Video'
          : type === 'document' ? 'Document'
            : type === 'file' ? 'File'
              : msg?.SystemMsg === 1 ? (msg?.Message || '')
                : 'New message';

  const showIcon = !isDeleted && (type === 'image' || type === 'video' || type === 'document' || type === 'file');
  const Icon = type === 'image' ? Image
    : type === 'video' ? Video
      : type === 'document' ? FileText
        : type === 'file' ? File
          : null;

  if (!text) {
    return { text: '', node: '' };
  }

  const node = showIcon && Icon
    ? React.createElement(
      'span',
      { style: { display: 'inline-flex', alignItems: 'center', gap: 6 } },
      React.createElement(Icon, { size: 14 }),
      React.createElement('span', null, text)
    )
    : text;

  return { text, node };
};

export const processApiResponse = (apiData) => {
  if (!apiData || !Array.isArray(apiData)) return [];

  return apiData.map((conversation) => {
    const rawLastMessage = conversation.LastMessage;

    const mapTypeCodeToMessageType = (code) => {
      switch (code) {
        case 1:
          return 'text';
        case 2:
          return 'image';
        case 3:
          return 'video';
        case 4:
          return 'document';
        case 5:
          return 'file';
        default:
          return 'text';
      }
    };

    const lastMessage = rawLastMessage
      ? {
        MessageType: mapTypeCodeToMessageType(conversation.LastMessageType),
        Message: rawLastMessage,
        DateTime: conversation.LastMessageDate || conversation.LastUpdatedDate,
        Status: conversation.LastMessageStatus,
        Direction: conversation.LastMessageDirection,
        SystemMsg: conversation.LastMessageSystemMsg ?? conversation.SystemMsg,
        IsDeletedForEveryone: conversation.IsDeletedForEveryone,
      }
      : null;


    const preview = lastMessage ? getMessagePreview(lastMessage) : { text: '', node: '' };

    const lastMessageTimeValue =
      lastMessage?.DateTime ||
      conversation.LastMessageDate ||
      conversation.LastUpdatedDate ||
      conversation.DateTime ||
      null;

    return {
      ...conversation,
      ConversationId: conversation.ConversationId ?? conversation.Id,
      ReceiverId: conversation.ReceiverId ?? "",
      LastMessageId: conversation.LastMessageId ?? conversation.MessageId ?? "", // Store the ID of the last message
      lastMessage: preview.node,
      lastMessageText: preview.text,
      lastMessageTimeValue,
      lastMessageTime: formatChatTimestamp(
        lastMessageTimeValue
      ),
      unreadCount: conversation.UnreadCount ?? conversation.UnReadMsgCount ?? 0,
      name: conversation.ConversationName || getCustomerDisplayName(conversation),
      avatar: null,
      avatarConfig: getWhatsAppAvatarConfig(getCustomerAvatarSeed(conversation)),
    };
  });
};

export const getCustomerListMenuItems = (member) => [
  {
    action: member?.IsPin === 1 ? 'UnPin' : 'Pin',
    icon: member?.IsPin === 1 ? React.createElement(PinOff, { size: 18 }) : React.createElement(Pin, { size: 18 }),
    label: member?.IsPin === 1 ? 'Unpin' : 'Pin',
  },
  {
    action: member?.IsStar === 1 ? 'UnStar' : 'Star',
    icon: member?.IsStar === 1 ? React.createElement(StarOff, { size: 18 }) : React.createElement(Star, { size: 18 }),
    label: member?.IsStar === 1 ? 'Unfavorite' : 'Favorite',
  },
  {
    action: member?.IsArchived === 1 ? 'UnArchive' : 'Archive',
    icon: member?.IsArchived === 1
      ? React.createElement(ArchiveRestore, { size: 18 })
      : React.createElement(Archive, { size: 18 }),
    label: member?.IsArchived === 1 ? 'Unarchive' : 'Archive',
  },
];

export const getMemberTimeValue = (member) => {
  const raw = member?.lastMessageTimeValue || member?.LastMessageDate || member?.LastUpdatedDate || member?.lastMessageTime || 0;
  const t = new Date(raw).getTime();
  return Number.isFinite(t) ? t : 0;
};

export const conversationComparator = (a, b) => {
  const aIsSearch = Boolean(a?.isSearchResult);
  const bIsSearch = Boolean(b?.isSearchResult);
  if (aIsSearch !== bIsSearch) return aIsSearch ? 1 : -1;

  const aPinned = Number(a?.IsPin || 0) === 1;
  const bPinned = Number(b?.IsPin || 0) === 1;
  if (aPinned !== bPinned) return aPinned ? -1 : 1;

  const aTime = getMemberTimeValue(a);
  const bTime = getMemberTimeValue(b);
  if (aTime !== bTime) return bTime - aTime;

  return Number(b?.ConversationId ?? 0) - Number(a?.ConversationId ?? 0);
};

export const normalizeMessageType = (type) => {
  if (typeof type === 'string') return type;
  switch (Number(type)) {
    case 1: return 'text';
    case 2: return 'image';
    case 3: return 'video';
    case 4: return 'document';
    case 5: return 'file';
    default: return 'text';
  }
};

export const mapMessageTypeToCode = (type) => {
  const t = normalizeMessageType(type);
  switch (t) {
    case 'text': return 1;
    case 'image': return 2;
    case 'video': return 3;
    case 'document': return 4;
    case 'file': return 5;
    default: return 1;
  }
};

export const mapSearchResults = (rd1) => {
  return (rd1 || []).map(user => ({
    ...user,
    ConversationId: null,
    Id: user.UserId || user.CustomerId || user.id,
    ReceiverId: user.UserId || user.CustomerId,
    name: user.UserName || user.CustomerName || user.CustomerPhone || user.name || 'Unknown',
    email: user.UserEmail || user.DisplayEmail || '',
    lastMessage: '',
    lastMessageText: '',
    lastMessageTimeValue: new Date().toISOString(),
    lastMessageTime: '',
    unreadCount: 0,
    isSearchResult: true
  }));
};

export const resolveConversationName = (incoming, getCustomerDisplayName) => {
  const senderInfo = (incoming?.FirstName || incoming?.LastName)
    ? ((incoming?.FirstName || '') + ' ' + (incoming?.LastName || '')).trim()
    : (incoming?.SenderInfo || incoming?.SenderName || incoming?.senderName || '');

  const candidate = String(
    senderInfo ||
    incoming?.CustomerName ||
    incoming?.ConversationName ||
    incoming?.UserName ||
    incoming?.name ||
    incoming?.DisplayEmail ||
    incoming?.RecieverName ||
    ''
  ).trim();

  return candidate || getCustomerDisplayName(incoming);
};