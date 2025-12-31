import { formatChatTimestamp } from '../../utils/DateFnc';
import { getCustomerAvatarSeed, getCustomerDisplayName, getWhatsAppAvatarConfig } from '../../utils/globalFunc';
import React from 'react';
import { Archive, ArchiveRestore, File, FileText, Image, Pin, PinOff, Star, StarOff, Video } from 'lucide-react';

export const getMessagePreview = (msg) => {
  const type = msg?.MessageType;
  const text = type === 'text' ? (msg?.Message || '')
    : type === 'image' ? 'Photo'
      : type === 'video' ? 'Video'
        : type === 'document' ? 'Document'
          : type === 'file' ? 'File'
            : 'New message';

  const showIcon = type === 'image' || type === 'video' || type === 'document' || type === 'file';
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
      }
      : null;

    let tags = [];
    if (conversation.TagList) {
      try {
        tags =
          typeof conversation.TagList === 'string'
            ? JSON.parse(conversation.TagList)
            : conversation.TagList;
      } catch (e) {
        console.error('Error parsing TagList:', e);
      }
    }

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
      lastMessage: preview.node,
      lastMessageText: preview.text,
      lastMessageTimeValue,
      lastMessageTime: formatChatTimestamp(
        lastMessageTimeValue
      ),
      lastMessageStatus: lastMessage?.Status,
      lastMessageDirection: lastMessage?.Direction,
      unreadCount: conversation.UnreadCount ?? conversation.UnReadMsgCount ?? 0,
      tags: tags,
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