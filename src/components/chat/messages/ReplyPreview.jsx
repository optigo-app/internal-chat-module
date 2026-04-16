import React from "react";
import { Box, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { Image as ImageIcon, Video as VideoIcon, FileText } from "lucide-react";

const ReplyPreview = ({ msg, original, isOutgoing, scrollToMessage, containerRef }) => {
    const theme = useTheme();

    if (!msg?.ContextId) return null;

    const isGenericReply = !msg?.ReplyContextMsg || String(msg.ReplyContextMsg).trim() === '' || String(msg.ReplyContextMsg).trim().toLowerCase() === 'media';
    const mediaCount = Array.isArray(original?.mediaItems) ? original.mediaItems.length : 0;
    const originalType = original?.MessageType;
    const originalFileName = original?.fileName || original?.mediaItems?.[0]?.filename || original?.mediaItems?.[0]?.fileName;

    const computedIcon = (() => {
        if (!original) return null;
        if (originalType === 'image') return ImageIcon;
        if (originalType === 'video') return VideoIcon;
        if (originalType === 'document') return FileText;
        return null;
    })();

    const isSpecificItem = !!msg.ReplyToAttachmentId;
    const computedReplyText = (() => {
        if (!original) return msg?.ReplyContextMsg;
        if (!isGenericReply) return msg?.ReplyContextMsg;

        if (originalType === 'image') {
            const suffix = (mediaCount > 1 && !isSpecificItem) ? `${mediaCount} Photos` : 'Photo';
            return `Media ${suffix}`;
        }
        if (originalType === 'video') {
            const suffix = (mediaCount > 1 && !isSpecificItem) ? `${mediaCount} Videos` : 'Video';
            return `Media ${suffix}`;
        }
        if (originalType === 'document') return originalFileName || 'Document';
        if (originalType === 'text') return original?.Message || msg?.ReplyContextMsg;
        return msg?.ReplyContextMsg;
    })();

    const computedSender = original?.Direction === 1
        ? 'You'
        : (original?.FirstName || original?.LastName
            ? `${original.FirstName || ''} ${original.LastName || ''}`.trim()
            : original?.SenderInfo || original?.Sender || (msg.SenderInfo != '' ? msg.SenderInfo : msg.Sender));

    // --- Reply Thumbnail Resolution ---
    const replyAttachIds = msg.ReplyToAttachmentId
        ? String(msg.ReplyToAttachmentId).split(',').map(s => s.trim()).filter(Boolean)
        : [];

    const firstReplyAttachId = replyAttachIds[0] || null;

    const parseAttachments = (raw) => {
        if (!raw) return [];
        try {
            const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
            return Array.isArray(parsed) ? parsed : [];
        } catch (_) { return []; }
    };

    const findByReplyId = (arr) => arr.find(a => {
        const id = String(a?.Id || a?.id || a?.attachmentId || a?.AttachmentId || '');
        return replyAttachIds.includes(id);
    });

    let replyMediaUrl = null;
    if (firstReplyAttachId) {
        const msgAttachments = parseAttachments(msg.Attachments);
        const matched = findByReplyId(msgAttachments);
        if (matched) replyMediaUrl = matched.FileUrl || matched.fileUrl || matched.Url || matched.url;
    }

    if (!replyMediaUrl && firstReplyAttachId && original?.mediaItems) {
        const matchedItem = original.mediaItems.find(item => {
            const id = String(item.attachmentId || item.AttachmentId || item.Id || item.id || '');
            return replyAttachIds.includes(id);
        });
        replyMediaUrl = matchedItem?.url || matchedItem?.src || null;
    }

    if (!replyMediaUrl && firstReplyAttachId && original?.Attachments) {
        const origAttachments = parseAttachments(original.Attachments);
        const matched = findByReplyId(origAttachments);
        if (matched) replyMediaUrl = matched.FileUrl || matched.fileUrl || matched.url || matched.Url;
    }

    if (!replyMediaUrl) {
        replyMediaUrl = original?.previewUrl || original?.mediaItems?.[0]?.url || original?.mediaItems?.[0]?.src || null;
    }

    return (
        <Box
            onClick={() => msg.ContextId && scrollToMessage(msg.ContextId, containerRef, msg.ReplyToAttachmentId)}
            sx={{
                display: 'flex',
                gap: 1,
                padding: '8px',
                backgroundColor: alpha(theme.palette.primary.main, isOutgoing ? 0.12 : 0.08),
                borderRadius: '8px',
                marginBottom: '8px',
                borderLeft: `3px solid ${theme.palette.primary.main}`,
                cursor: msg.ContextId ? 'pointer' : 'default',
                opacity: msg.ContextId ? 1 : 0.7,
                alignItems: 'center'
            }}
        >
            <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                <Typography variant="caption" sx={{ fontWeight: 600, color: theme.palette.text.primary, mb: '2px' }}>
                    {computedSender}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    {computedIcon && React.createElement(computedIcon, { size: 14 })}
                    <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{
                            minWidth: 0,
                            flex: 1,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                        }}
                    >
                        {computedReplyText?.length > 50 ? `${computedReplyText.substring(0, 50)}...` : computedReplyText}
                    </Typography>
                </Box>
                {!msg.ContextId && (
                    <Typography variant="caption" sx={{ color: theme.palette.error.main, fontSize: '10px', mt: '2px' }}>
                        Original message not available
                    </Typography>
                )}
            </Box>

            {replyMediaUrl && originalType === 'image' && (() => {
                const allThumbs = Array.isArray(original?.mediaItems) && original.mediaItems.length
                    ? original.mediaItems.map(item => item?.url || item?.src).filter(Boolean)
                    : [replyMediaUrl];

                const thumbsToShow = isSpecificItem ? [replyMediaUrl] : allThumbs.slice(0, 2);
                const overflowCount = isSpecificItem ? 0 : (allThumbs.length - 2);

                return (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
                        {thumbsToShow.map((thumbSrc, idx) => (
                            <Box
                                key={idx}
                                sx={{
                                    position: 'relative',
                                    width: 40,
                                    height: 40,
                                    borderRadius: 1,
                                    overflow: 'hidden',
                                    backgroundColor: alpha(theme.palette.text.primary, 0.05),
                                    border: `1px solid ${alpha(theme.palette.text.primary, 0.08)}`,
                                }}
                            >
                                <img src={thumbSrc} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} draggable="false" />
                                {idx === 1 && overflowCount > 0 && (
                                    <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: alpha('#000', 0.45), color: '#fff', fontWeight: 700, fontSize: 14 }}>
                                        +{overflowCount}
                                    </Box>
                                )}
                            </Box>
                        ))}
                    </Box>
                );
            })()}

            {replyMediaUrl && originalType !== 'image' && (
                <Box
                    sx={{
                        width: 40,
                        height: 40,
                        borderRadius: 1,
                        overflow: 'hidden',
                        flexShrink: 0,
                        backgroundColor: alpha(theme.palette.text.primary, 0.05),
                        border: `1px solid ${alpha(theme.palette.text.primary, 0.08)}`
                    }}
                >
                    {String(replyMediaUrl).match(/\.(mp4|webm|ogg|mov)(\?|$)/i) ? (
                        <video src={replyMediaUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                        <img src={replyMediaUrl} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} draggable="false" />
                    )}
                </Box>
            )}
        </Box>
    );
};


export default ReplyPreview;