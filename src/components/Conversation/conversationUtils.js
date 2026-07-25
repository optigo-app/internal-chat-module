import { formatTime12h } from "../../utils/DateFnc";

// Map numeric MessageType from new API to string types used in UI
export const mapTypeCodeToMessageType = (code) => {
    const normalized = (() => {
        if (typeof code === 'string') {
            const trimmed = code.trim();
            if (/^\d+$/.test(trimmed)) {
                const parsed = parseInt(trimmed, 10);
                return Number.isFinite(parsed) ? parsed : code;
            }
            return trimmed;
        }
        return code;
    })();

    switch (normalized) {
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
            return typeof normalized === 'string' ? normalized : 'text';
    }
};

// Normalize messages coming from conversationView / GetMessages API
export const normalizeServerMessages = (messagesArray, auth) => {
    if (!Array.isArray(messagesArray)) return []

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
            firstAttachment?.FileUrl ||
            firstAttachment?.FileURL ||
            firstAttachment?.url ||
            firstAttachment?.Url ||
            firstAttachment?.fileUrl ||
            firstAttachment?.fileURL ||
            null;
        const attachmentMime =
            firstAttachment?.MimeType ||
            firstAttachment?.mimeType ||
            firstAttachment?.mimetype ||
            firstAttachment?.fileType ||
            msg?.fileType ||
            '';
        const attachmentName =
            firstAttachment?.FileName ||
            firstAttachment?.fileName ||
            firstAttachment?.filename ||
            msg?.fileName ||
            '';

        const parseDim = (val) => {
            const n = Number(val);
            return Number.isFinite(n) && n > 0 ? n : null;
        };
        const attachmentWidth = parseDim(
            firstAttachment?.Width ??
            firstAttachment?.ImageWidth ??
            firstAttachment?.FileWidth ??
            firstAttachment?.width
        );
        const attachmentHeight = parseDim(
            firstAttachment?.Height ??
            firstAttachment?.ImageHeight ??
            firstAttachment?.FileHeight ??
            firstAttachment?.height
        );

        const mediaItems = attachmentsArray
            .map((a) => {
                const url =
                    a?.FileUrl ||
                    a?.FileURL ||
                    a?.url ||
                    a?.Url ||
                    a?.fileUrl ||
                    a?.fileURL ||
                    null;
                if (!url) return null;
                const mimeType = a?.MimeType || a?.mimeType || a?.mimetype || a?.fileType || '';
                const fileName = a?.FileName || a?.fileName || a?.filename || a?.name || '';
                const width = parseDim(a?.Width ?? a?.ImageWidth ?? a?.FileWidth ?? a?.width);
                const height = parseDim(a?.Height ?? a?.ImageHeight ?? a?.FileHeight ?? a?.height);
                return {
                    url,
                    mimeType,
                    filename: fileName,
                    fileName,
                    size: a?.size,
                    width,
                    height,
                    attachmentId: a?.attachmentId || a?.AttachmentId || a?.Id || a?.id
                };
            })
            .filter(Boolean);

        const contextTypeRaw = msg?.ContextType;
        const parsedContextType = typeof contextTypeRaw === 'string'
            ? parseInt(contextTypeRaw, 10)
            : contextTypeRaw;

        const replyToRaw = msg?.ReplyTo;
        const parsedReplyTo = typeof replyToRaw === 'string'
            ? parseInt(replyToRaw, 10)
            : replyToRaw;

        const hasReplyLegacy = parsedContextType === 2;
        const hasReplyNew = Number(parsedReplyTo || 0) !== 0;
        const isReplyMessage = hasReplyNew || hasReplyLegacy;
        const hasTextBody = String(msg?.Message ?? '').trim().length > 0;
        const forceTextReply = isReplyMessage && hasTextBody;

        const isDeletedForEveryone = msg.IsDeletedForEveryone === 1 || msg.isDeletedForEveryone === 1;
        const resolvedMessageType = (forceTextReply || isDeletedForEveryone)
            ? 'text'
            : (() => {
                if (attachmentUrl) {
                    if ((attachmentMime || '').startsWith('image/')) return 'image';
                    if ((attachmentMime || '').startsWith('video/')) return 'video';
                    return 'document';
                }
                return mapTypeCodeToMessageType(msg.MessageType || msg.LastMessageType);
            })();

        // Common normalization for all shapes
        const isMyMessage = Number(msg.SenderId || msg.Sender || msg.LastMessageSender) === Number(auth?.id ?? auth?.userId);

        const dateTime = msg.DateTime || msg.SentAt || msg.LastMessageDate || msg.LastUpdatedDate;
        let date = msg.Date;
        let time = msg.Time;
        if (!date && dateTime) {
            try {
                date = new Date(dateTime).toISOString().split('T')[0];
                time = formatTime12h(new Date(dateTime).toISOString());

            } catch {
                date = undefined;
                time = undefined;
            }
        }

        const senderInfo = (msg.FirstName || msg.LastName)
            ? ((msg.FirstName || '') + ' ' + (msg.LastName || '')).trim()
            : (msg.RecieverName || msg.ReceiverName || msg.SenderName || msg.SenderInfo || '');
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

        // Map backend MessageStatus to internal Status codes (1: sent, 2: delivered, 3: read)
        let normalizedStatus = msg.Status ?? msg.status;
        const rawMessageStatus = msg.MessageStatus !== undefined ? Number(msg.MessageStatus) : undefined;

        if (typeof rawMessageStatus === 'number' && !isNaN(rawMessageStatus)) {
            // Mapping: 0: sent/delivered, 1: sent, 2: read
            if (rawMessageStatus === 2) {
                normalizedStatus = 3; // internal 3 is Read (blue ticks)
            } else if (rawMessageStatus === 1 || rawMessageStatus === 0) {
                normalizedStatus = 1; // internal 1 is Sent (gray ticks)
            }
        }

        const normalizedSystemMsg = msg.SystemMsg !== undefined
            ? (typeof msg.SystemMsg === 'string' ? parseInt(msg.SystemMsg, 10) : msg.SystemMsg)
            : (msg.system_msg !== undefined ? (typeof msg.system_msg === 'string' ? parseInt(msg.system_msg, 10) : msg.system_msg) : 0);

        return {
            ...msg,
            Id: msg.Id ? String(msg.Id) : (msg.MessageId ? String(msg.MessageId) : undefined),
            MessageId: msg.MessageId ? String(msg.MessageId) : (msg.Id ? String(msg.Id) : undefined),
            IsMyMessage: typeof msg.IsMyMessage === 'boolean' ? msg.IsMyMessage : isMyMessage,
            Direction: isMyMessage ? 1 : (typeof msg.Direction === 'number' ? (msg.Direction === 1 || msg.Direction === 2 ? 0 : msg.Direction) : 0),
            MessageType: resolvedMessageType,
            Message: msg.Message ?? msg.LastMessage,
            Message1: msg.Message1,
            Status: normalizedStatus,
            SystemMsg: normalizedSystemMsg,
            DateTime: dateTime,
            Date: date,
            Time: time,
            ReactionEmojis: msg.ReactionEmojis ?? msg.Reactions ?? '[]',
            SenderInfo: trimmedSenderInfo || msg.SenderEmail || '',
            FirstName: msg.FirstName || '',
            LastName: msg.LastName || '',
            SenderProfilePicture: msg.SenderProfilePicture || msg.avatar || '',
            ContextType: contextType,
            ContextId: contextId,
            ReplyContextMsg: replyContextMsg,
            ReplyToAttachmentId: (() => {
                const raw = msg.ReplyToAttachmentId;
                if (!raw) return null;
                const str = String(raw).trim();
                // Handle JSON array format: "[47]" or "[43, 44]"
                if (str.startsWith('[')) {
                    try {
                        const parsed = JSON.parse(str);
                        if (Array.isArray(parsed)) {
                            return parsed.filter(Boolean).join(',') || null;
                        }
                    } catch (_) { /* fall through */ }
                }
                // Already a plain id or comma-separated: "43" or "43,44"
                return str || null;
            })(),
            ReplyToSenderName: msg.ReplyToSenderName || null,
            ...(!forceTextReply && attachmentUrl ? { previewUrl: attachmentUrl } : {}),
            ...(!forceTextReply && attachmentName ? { fileName: attachmentName } : {}),
            ...(!forceTextReply && attachmentMime ? { fileType: attachmentMime } : {}),
            ...(!forceTextReply && mediaItems.length ? { mediaItems } : {}),
            ...(!forceTextReply && attachmentWidth && attachmentHeight ? { mediaWidth: attachmentWidth, mediaHeight: attachmentHeight } : {}),
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
            // Normalize the date format to YYYY-MM-DD
            try {
                const parsedDate = new Date(msg.Date);
                if (!isNaN(parsedDate.getTime())) {
                    date = parsedDate.toISOString().split('T')[0];
                } else {
                    date = msg.Date;
                }
            } catch {
                date = msg.Date;
            }
        } else if (msg.DateTime) {
            try {
                // Extract date in YYYY-MM-DD format
                const parsedDate = new Date(msg.DateTime);
                date = parsedDate.toISOString().split('T')[0];
            } catch {
                date = new Date().toISOString().split('T')[0];
            }
        } else {
            date = new Date().toISOString().split('T')[0];
        }

        if (!grouped[date]) {
            grouped[date] = [];
        }
        grouped[date].push(msg);
    });

    return grouped;
};

/**
 * Centralized utility to update the sessionStorage chat cache.
 * Can be called from useConversation (active chat) or CustomerLists (background chats).
 */
/**
 * Saves a list of messages to the chat cache, truncating to the last 50 messages.
 */
export const saveConversationToCache = (conversationId, messages) => {
    if (!conversationId || !Array.isArray(messages) || messages.length === 0) return;

    const cacheKey = `chat_cache_${conversationId}`;
    try {
        // Limit cache to last 1000 messages to maintain speed and stay within sessionStorage limits
        const truncated = messages.slice(-1000);
        sessionStorage.setItem(cacheKey, JSON.stringify(truncated));
    } catch (e) {
        console.error("Error saving chat cache:", e);
    }
};

export const updateChatCache = (conversationId, rawData, auth, isStatusChange = false) => {
    if (!conversationId || !rawData) return;

    const cacheKey = `chat_cache_${conversationId}`;
    const cachedDataStr = sessionStorage.getItem(cacheKey);

    try {
        let cachedMessages = [];
        if (cachedDataStr) {
            try {
                cachedMessages = JSON.parse(cachedDataStr);
            } catch (e) {
                console.error("Error parsing chat cache:", e);
                cachedMessages = [];
            }
        }
        if (!Array.isArray(cachedMessages)) cachedMessages = [];

        // Normalize the incoming message
        const [normalized] = normalizeServerMessages([rawData], auth) || [];
        if (!normalized) return;

        const incomingId = normalized.Id || normalized.MessageId;
        const index = cachedMessages.findIndex(m =>
            (m.Id && m.Id === incomingId) ||
            (m.MessageId && m.MessageId === incomingId)
        );

        let updatedMessages;
        if (index !== -1) {
            // Update existing message (e.g. status change or reaction)
            updatedMessages = [...cachedMessages];
            const existing = updatedMessages[index];

            // Special handling for reactions to prevent overwriting message content
            const isReactionUpdate = rawData.ReactionEmojis !== undefined && !rawData.Message;

            if (isReactionUpdate) {
                let current = [];
                try {
                    current = typeof existing.ReactionEmojis === 'string'
                        ? JSON.parse(existing.ReactionEmojis || '[]')
                        : (existing.ReactionEmojis || []);
                } catch (e) { current = []; }

                if (!Array.isArray(current)) current = [];

                let incoming = [];
                try {
                    incoming = typeof normalized.ReactionEmojis === 'string'
                        ? JSON.parse(normalized.ReactionEmojis || '[]')
                        : (normalized.ReactionEmojis || []);
                } catch (e) { incoming = []; }

                if (Array.isArray(incoming) && incoming.length > 0) {
                    incoming.forEach(inc => {
                        const sid = inc.UserId || rawData.SenderId || rawData.userId;
                        if (!sid) return;
                        current = current.filter(r => String(r.UserId) !== String(sid));
                        if (inc.Reaction && inc.Reaction !== "") {
                            current.push({ ...inc, UserId: sid });
                        }
                    });
                } else if (rawData.SenderId || rawData.userId) {
                    // It's a removal
                    const sid = rawData.SenderId || rawData.userId;
                    current = current.filter(r => String(r.UserId) !== String(sid));
                }

                updatedMessages[index] = {
                    ...existing,
                    ReactionEmojis: JSON.stringify(current)
                };
            } else {
                // Regular update (status change or edit)
                updatedMessages[index] = {
                    ...existing,
                    ...normalized,
                    // Preserve critical fields if they are missing in the update
                    Message: normalized.Message ?? existing.Message,
                    DateTime: normalized.DateTime ?? existing.DateTime,
                    // Preserve local-only flags
                    isUploading: existing.isUploading,
                    percent: existing.percent,
                };
            }
        } else if (!isStatusChange && !rawData.ReactionEmojis) {
            // Add new message (only if it's not a status change or reaction for a message we don't have)
            updatedMessages = [...cachedMessages, normalized];
            // Sort to ensure correct order
            updatedMessages.sort((a, b) => new Date(a.DateTime).getTime() - new Date(b.DateTime).getTime());
        } else {
            // It's a status change or reaction for a message not in our cache
            return;
        }

        // Limit cache to last 1000 messages
        const truncatedMessages = updatedMessages.slice(-1000);
        sessionStorage.setItem(cacheKey, JSON.stringify(truncatedMessages));
    } catch (e) {
        console.error("Error updating chat cache:", e);
    }
};

