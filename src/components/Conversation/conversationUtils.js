
// Map numeric MessageType from new API to string types used in UI
export const mapTypeCodeToMessageType = (code) => {
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
            return typeof code === 'string' ? code : 'text';
    }
};

// Normalize messages coming from conversationView / GetMessages API
export const normalizeServerMessages = (messagesArray, auth) => {
    if (!Array.isArray(messagesArray)) return [];

    return messagesArray.map((msg) => {
        if (!msg || typeof msg !== 'object') return msg;

        let parsedAttachments = null;
        if (msg.Attachments) {
            try {
                parsedAttachments = typeof msg.Attachments === 'string'
                    ? JSON.parse(msg.Attachments)
                    : msg.Attachments;
            } catch {
                parsedAttachments = null;
            }
        }

        const attachmentsArray = Array.isArray(parsedAttachments) ? parsedAttachments : [];
        const firstAttachment = attachmentsArray?.[0] || null;
        const attachmentUrl =
            firstAttachment?.url ||
            firstAttachment?.Url ||
            firstAttachment?.fileUrl ||
            firstAttachment?.fileURL ||
            firstAttachment?.FileUrl ||
            firstAttachment?.FileURL ||
            null;
        const attachmentMime =
            firstAttachment?.mimeType ||
            firstAttachment?.mimetype ||
            firstAttachment?.fileType ||
            firstAttachment?.MimeType ||
            msg?.fileType ||
            '';
        const attachmentName =
            firstAttachment?.fileName ||
            firstAttachment?.filename ||
            firstAttachment?.FileName ||
            msg?.fileName ||
            '';

        const mediaItems = attachmentsArray
            .map((a) => {
                const url =
                    a?.url ||
                    a?.Url ||
                    a?.fileUrl ||
                    a?.fileURL ||
                    a?.FileUrl ||
                    a?.FileURL ||
                    null;
                if (!url) return null;
                const mimeType = a?.mimeType || a?.mimetype || a?.fileType || a?.MimeType || '';
                const fileName = a?.fileName || a?.filename || a?.FileName || a?.name || '';
                return {
                    url,
                    mimeType,
                    filename: fileName,
                    fileName,
                    size: a?.size,
                };
            })
            .filter(Boolean);

        const isNewShape = msg.MessageId && msg.SenderId && (msg.SentAt || msg.LastUpdatedDate);
        if (!isNewShape) {
            return {
                ...msg,
                MessageType: (() => {
                    if (attachmentUrl) {
                        if ((attachmentMime || '').startsWith('image/')) return 'image';
                        if ((attachmentMime || '').startsWith('video/')) return 'video';
                        return 'document';
                    }
                    return mapTypeCodeToMessageType(msg.MessageType);
                })(),
                ...(attachmentUrl ? { previewUrl: attachmentUrl } : {}),
                ...(attachmentName ? { fileName: attachmentName } : {}),
                ...(attachmentMime ? { fileType: attachmentMime } : {}),
                ...(mediaItems.length ? { mediaItems } : {}),
            };
        }

        const isMyMessage = msg.SenderId === (auth?.id ?? auth?.userId);

        const dateTime = msg.DateTime || msg.SentAt || msg.LastUpdatedDate;
        let date = msg.Date;
        if (!date && dateTime) {
            try {
                date = new Date(dateTime).toISOString().split('T')[0];
            } catch {
                date = undefined;
            }
        }

        const senderInfo = (msg.FirstName || '') + ' ' + (msg.LastName || '');
        const trimmedSenderInfo = senderInfo.trim();

        const hasReply = !!msg.ReplyTo && msg.ReplyTo !== 0;
        const contextType = hasReply
            ? 2
            : (typeof msg.ContextType === 'number' ? msg.ContextType : 0);
        const contextId = hasReply
            ? msg.ReplyTo
            : (msg.ContextId || null);
        const replyContextMsg = msg.ReplyContextMsg
            || msg.ReplyToMessage
            || null;

        // Map backend MessageStatus (0 = sent, other = read) to internal Status codes
        let normalizedStatus = msg.Status;
        if (typeof msg.MessageStatus === 'number') {
            normalizedStatus = msg.MessageStatus === 0 ? 1 : 3; // 1: sent, 3: read
        }

        return {
            ...msg,
            Id: msg.Id ?? msg.MessageId,
            MessageId: msg.MessageId ?? msg.Id,
            IsMyMessage: typeof msg.IsMyMessage === 'boolean' ? msg.IsMyMessage : isMyMessage,
            Direction: typeof msg.Direction === 'number' ? msg.Direction : (isMyMessage ? 1 : 0),
            MessageType: (() => {
                if (attachmentUrl) {
                    if ((attachmentMime || '').startsWith('image/')) return 'image';
                    if ((attachmentMime || '').startsWith('video/')) return 'video';
                    return 'document';
                }
                return mapTypeCodeToMessageType(msg.MessageType);
            })(),
            Status: normalizedStatus,
            DateTime: dateTime,
            Date: date,
            ReactionEmojis: msg.ReactionEmojis ?? msg.Reactions ?? '[]',
            SenderInfo: msg.SenderInfo || trimmedSenderInfo || msg.SenderEmail || '',
            ContextType: contextType,
            ContextId: contextId,
            ReplyContextMsg: replyContextMsg,
            ...(attachmentUrl ? { previewUrl: attachmentUrl } : {}),
            ...(attachmentName ? { fileName: attachmentName } : {}),
            ...(attachmentMime ? { fileType: attachmentMime } : {}),
            ...(mediaItems.length ? { mediaItems } : {}),
        };
    });
};

// Group messages by date key for UI sections
export const groupMessagesByDateHelper = (messages) => {
    const list = Array.isArray(messages?.data)
        ? messages.data
        : (Array.isArray(messages) ? messages : []);

    const grouped = {};

    list.forEach(msg => {
        if (!msg) return;
        let date;

        if (msg.Date) {
            date = msg.Date;
        } else if (msg.DateTime) {
            try {
                // Use GMT so both sides are consistent
                date = new Date(msg.DateTime).toLocaleDateString('en-GB', { timeZone: 'GMT' });
            } catch {
                date = new Date().toLocaleDateString('en-GB', { timeZone: 'GMT' });
            }
        } else {
            date = new Date().toLocaleDateString('en-GB', { timeZone: 'GMT' });
        }

        if (!grouped[date]) {
            grouped[date] = [];
        }
        grouped[date].push(msg);
    });

    return grouped;
};
