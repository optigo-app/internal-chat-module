import React, { useEffect, useState } from 'react';
import { Box, CircularProgress, IconButton, Skeleton, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { ChevronDown, Download, FileText, CheckCheck, Image as ImageIcon, Video as VideoIcon, Play, FileType, FileSpreadsheet, FileArchive, FileCode, Forward, ArrowBigDownDash, ArrowBigDown } from 'lucide-react';
import { Emoji } from 'emoji-picker-react';
import { FormatDateIST } from '../../utils/DateFnc';
import DynamicTemplate from '../DynamicTemplate/DynamicTemplate';
import QuickReactionMenu from './QuickReactionMenu';
import ReactionDetailsMenu from './ReactionMenu';
import { handleDownloadFile, getDocumentMeta, renderTextWithLinks } from '../../utils/globalFunc';
import imageNotFound from '../../assets/image-not-found.jpg';

const imageDimsCache = new Map();

/**
 * Converts a raw emoji character into its unified hex string format.
 * Handles ZWJ sequences and skin tone variations.
 */
const charToUnified = (char) => {
    if (!char) return null;
    return Array.from(char)
        .map(c => c.codePointAt(0).toString(16))
        .filter(hex => hex !== 'fe0f')
        .join('-');
};

const MessageContent = ({
    auth,
    handleRemoveReaction,
    msg,
    isOutgoing,
    shouldShowActions,
    isReactionMenuOpenForCurrent,
    reactionMenuAnchorEl,
    setHoveredMessageId,
    currentHoverId,
    setReactionMenuAnchorEl,
    setReactionMenuMessageId,
    closeReactionMenu,
    handleMessageEmojiClick,
    handleMenuClick,
    handleContextMenu,
    scrollToMessage,
    containerRef,
    parseTemplateData,
    getMediaKey,
    getMediaSrcForMessage,
    loadedMedia,
    markLoaded,
    handleMediaClick,
    getMessageStatusIcon,
    getMessageById,
    handleForward
}) => {

    const theme = useTheme();

    const linkifyText = (value) => renderTextWithLinks(value, {
        linkStyle: { color: theme.palette.primary.main },
    });

    const [imageDims, setImageDims] = useState(null);
    const [anchorEl, setAnchorEl] = React.useState(null);
    const [videoLoadError, setVideoLoadError] = useState(false);

    const parsedReactions = React.useMemo(() => {
        try {
            if (!msg?.ReactionEmojis || msg.ReactionEmojis === "" || msg.ReactionEmojis === "[]") return [];
            const raw = JSON.parse(msg.ReactionEmojis);
            return Array.isArray(raw) ? raw : [];
        } catch (e) {
            console.error("Error parsing reactions:", e);
            return [];
        }
    }, [msg?.ReactionEmojis]);

    useEffect(() => {
        setImageDims(null);
    }, [msg?.Id, msg?.MediaUrl, msg?.fileName]);

    const UploadProgressOverlay = ({ percent, size = 52 }) => {
        const safePercent = Math.max(0, Math.min(100, Number(percent) || 0));
        const thickness = size <= 40 ? 4.5 : 4;
        const labelFontSize = size <= 40 ? 10 : 12;
        return (
            <Box
                className="progress-overlay"
                sx={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 2,
                    backgroundColor: alpha(theme.palette.common.black, 0.35),
                    backdropFilter: 'blur(2px)',
                    border: `1px solid ${alpha(theme.palette.common.white, 0.18)}`,
                    borderRadius: 2,
                }}
            >
                <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                    <CircularProgress
                        variant="determinate"
                        value={100}
                        size={size}
                        thickness={thickness}
                        sx={{ color: alpha(theme.palette.text.primary, 0.12) }}
                    />
                    <CircularProgress
                        variant="determinate"
                        value={safePercent}
                        size={size}
                        thickness={thickness}
                        sx={{
                            color: theme.palette.primary.main,
                            position: 'absolute',
                            left: 0,
                            top: 0,
                        }}
                    />
                    <Box
                        sx={{
                            position: 'absolute',
                            inset: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <Typography
                            variant="caption"
                            sx={{
                                fontWeight: 700,
                                color: theme.palette.common.white,
                                textShadow: '0 1px 2px rgba(0,0,0,0.65)',
                                lineHeight: 1,
                                fontSize: labelFontSize,
                            }}
                        >
                            {Math.round(safePercent)}%
                        </Typography>
                    </Box>
                </Box>
            </Box>
        );
    };

    return (
        <div className="message-content" style={{ flexDirection: 'column' }}>
            <Box
                className="message-bubble"
                sx={{
                    '&&': {
                        display: msg?.MessageType === 'text' ? 'flex' : 'block',
                        flexDirection: 'column',
                        gap: 0.5,
                        position: 'relative',
                        zIndex: 1,
                        overflow: 'visible !important',
                        maxWidth: { xs: '90%', sm: 420 },
                        padding: (msg?.MessageType === 'text' ? '10px 12px 8px 12px' : '8px') + ' !important',
                        borderRadius: (isOutgoing
                            ? '18px 18px 0px 18px'
                            : '18px 18px 18px 0px') + ' !important',
                        backgroundColor: (isOutgoing
                            ? alpha(theme.palette.primary.main, 0.15)
                            : theme.palette.background.paper) + ' !important',
                        color: theme.palette.text.primary + ' !important',
                        boxShadow: (`0 2px 10px ${alpha('#000', 0.08)}`) + ' !important',
                    },

                    '&& .message-text': {
                        color: theme.palette.text.primary + ' !important',
                        fontWeight: 500,
                        marginRight: '0px !important',
                        ...(msg?.MessageType !== 'template' ? { paddingRight: '28px' } : {}),
                    },
                    '&& .message-time': {
                        color: alpha(theme.palette.text.primary, 0.65) + ' !important',
                    },
                }}
            >
                <Box
                    className="message-actions"
                    sx={{
                        '&&': {
                            position: 'absolute !important',
                            top: '50% !important',
                            left: isOutgoing ? '0px !important' : 'auto !important',
                            right: isOutgoing ? 'auto !important' : '0px !important',
                            marginRight: '0px !important',
                            transform: `translate(${isOutgoing ? '-110%' : '110%'}, -50%) !important`,
                            display: 'flex',
                            // Reverse order for outgoing so Forward button stays closest to the bubble
                            flexDirection: isOutgoing ? 'row-reverse' : 'row',
                            alignItems: 'center',
                            gap: '6px', // Increased gap for separated bubbles
                            zIndex: '6 !important',
                            pointerEvents: 'none !important', // Let clicks pass through the container gap
                            opacity: '1 !important', // Override CSS opacity: 0
                            boxShadow: 'none'
                        },
                    }}
                >
                    {/* Forward Action: Always Visible */}
                    {['image', 'video', 'document'].includes(msg?.MessageType) && (
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                padding: '2px',
                                borderRadius: '999px',
                                backgroundColor: alpha(theme.palette.background.paper, 0.92),
                                border: `1px solid ${theme.palette.borderColor?.extraLight || theme.palette.divider}`,
                                boxShadow: `0 6px 14px ${alpha('#000', 0.12)}`,
                                pointerEvents: 'auto',
                            }}
                        >
                            <IconButton
                                size="small"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleForward(msg, e);
                                }}
                                sx={{
                                    width: 28,
                                    height: 28,
                                    color: theme.palette.text.secondary,
                                    transition: 'all 0.2s ease',
                                    '&:hover': {
                                        backgroundColor: alpha(theme.palette.primary.main, 0.12),
                                        color: theme.palette.primary.main,
                                    },
                                }}
                            >
                                <Forward size={16} />
                            </IconButton>
                        </Box>
                    )}

                    {/* Reaction Menu: Visible on Hover */}
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            padding: '2px',
                            borderRadius: '999px',
                            backgroundColor: alpha(theme.palette.background.paper, 0.92),
                            border: `1px solid ${theme.palette.borderColor?.extraLight || theme.palette.divider}`,
                            boxShadow: `0 6px 14px ${alpha('#000', 0.12)}`,
                            opacity: shouldShowActions ? 1 : 0,
                            pointerEvents: shouldShowActions ? 'auto' : 'none',
                            transition: 'opacity 160ms ease, transform 160ms ease',
                            transform: shouldShowActions ? 'scale(1)' : 'scale(0.8)', // Subtle pop animation
                        }}
                    >
                        <QuickReactionMenu
                            open={isReactionMenuOpenForCurrent}
                            anchorEl={reactionMenuAnchorEl}
                            onOpen={(e) => {
                                e.stopPropagation();
                                setHoveredMessageId(currentHoverId);
                                setReactionMenuAnchorEl(e.currentTarget);
                                setReactionMenuMessageId(currentHoverId);
                            }}
                            onClose={(e) => {
                                e?.stopPropagation?.();
                                closeReactionMenu();
                            }}
                            onSelectEmoji={(emoji) => {
                                if (typeof handleMessageEmojiClick === 'function') {
                                    handleMessageEmojiClick(emoji, msg);
                                }
                                closeReactionMenu();
                            }}
                        />
                    </Box>

                </Box>

                <IconButton
                    className="menu-btn"
                    size="small"
                    onClick={(e) => {
                        handleMenuClick(e, msg);
                        handleContextMenu(e, msg);
                    }}
                    sx={{
                        '&&': {
                            position: 'absolute !important',
                            top: '3px !important',
                            right: '3px !important',
                            left: 'auto !important',
                            padding: '0px !important',
                            color: theme.palette.text.secondary + ' !important',
                            opacity: shouldShowActions ? 1 : 0,
                            pointerEvents: shouldShowActions ? 'auto' : 'none',
                            backgroundColor: alpha(theme.palette.primary.main, 0.10),
                            boxShadow: '0 6px 14px ' + alpha('#000', 0.12),
                            transition: 'opacity 160ms ease',
                            zIndex: 3,
                        },
                    }}
                >
                    <ChevronDown size={24} />
                </IconButton>
                {/* Forwarded Indicator */}
                {(!!msg?.ForwardedFrom && msg?.ForwardedFrom !== "0") && (
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.5,
                            mb: 0.5,
                            opacity: 0.7,
                            '&&': {
                                color: theme.palette.text.secondary,
                            }
                        }}
                    >
                        <Forward size={14} />
                        <Typography
                            variant="caption"
                            sx={{
                                fontSize: '11.5px',
                                fontStyle: 'italic',
                                fontWeight: 500,
                            }}
                        >
                            Forwarded
                        </Typography>
                    </Box>
                )}
                {/* Reply Preview (Quoted message) */}
                {msg.ContextType === 2 && (
                    <div className="">
                        {(() => {
                            const original = typeof getMessageById === 'function' && msg?.ContextId
                                ? getMessageById(msg.ContextId)
                                : null;

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
                                : (original?.SenderInfo || original?.Sender || (msg.SenderInfo != '' ? msg.SenderInfo : msg.Sender));

                            const specificMedia = (msg.ReplyToAttachmentId && original?.mediaItems)
                                ? original.mediaItems.find(item =>
                                    (item.attachmentId === msg.ReplyToAttachmentId || item.AttachmentId === msg.ReplyToAttachmentId || item.Id === msg.ReplyToAttachmentId || item.id === msg.ReplyToAttachmentId)
                                )
                                : null;
                            const specificMediaUrl = specificMedia?.url || specificMedia?.src;
                            const fallbackMediaUrl = original?.previewUrl || original?.mediaItems?.[0]?.url || original?.mediaItems?.[0]?.src;
                            const replyMediaUrl = specificMediaUrl || fallbackMediaUrl;

                            return (
                                <div className="reply-preview" style={{
                                    display: 'flex',
                                    flexDirection: "row", // Changed to row to allow image on right
                                    gap: '8px',
                                    padding: '8px',
                                    backgroundColor: alpha(theme.palette.primary.main, isOutgoing ? 0.12 : 0.08),
                                    borderRadius: '8px',
                                    marginBottom: '8px',
                                    borderLeft: `3px solid ${theme.palette.primary.main}`,
                                    cursor: msg.ContextId ? 'pointer' : 'default',
                                    opacity: msg.ContextId ? 1 : 0.7,
                                    alignItems: 'center'
                                }}
                                    onClick={() => msg.ContextId && scrollToMessage(msg.ContextId, containerRef, msg.ReplyToAttachmentId)}  // Jump to original message
                                >
                                    <div className="reply-content" style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                        <div className="reply-sender" style={{
                                            fontSize: '12px',
                                            fontWeight: 600,
                                            color: theme.palette.text.primary,
                                            marginBottom: '2px'
                                        }}>
                                            {computedSender}
                                        </div>
                                        <div className="reply-text" style={{
                                            fontSize: '12px',
                                            color: theme.palette.text.secondary,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 6,
                                        }}>
                                            {computedIcon && (
                                                <span style={{ flex: '0 0 auto', display: 'inline-flex', alignItems: 'center' }}>
                                                    {React.createElement(computedIcon, { size: 14 })}
                                                </span>
                                            )}
                                            <span style={{
                                                minWidth: 0,
                                                flex: '1 1 auto',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap'
                                            }}>
                                                {computedReplyText?.length > 50
                                                    ? `${computedReplyText.substring(0, 50)}...`
                                                    : computedReplyText}
                                            </span>
                                        </div>
                                        {!msg.ContextId && (
                                            <div className="original-not-available" style={{ fontSize: '10px', color: theme.palette.error.main, marginTop: '2px' }}>
                                                Original message not available
                                            </div>
                                        )}
                                    </div>

                                    {replyMediaUrl && originalType === 'image' && (() => {
                                        const allThumbs = Array.isArray(original?.mediaItems) && original.mediaItems.length
                                            ? original.mediaItems
                                                .map((item) => item?.url || item?.src)
                                                .filter(Boolean)
                                            : [replyMediaUrl];

                                        const thumbsToShow = isSpecificItem ? [replyMediaUrl] : allThumbs.slice(0, 2);
                                        const overflowCount = isSpecificItem ? 0 : (allThumbs.length - 2);

                                        return (
                                            <Box
                                                sx={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 0.5,
                                                    flexShrink: 0,
                                                }}
                                            >
                                                {thumbsToShow.map((thumbSrc, idx) => {
                                                    const showOverflow = idx === 1 && overflowCount > 0;
                                                    return (
                                                        <Box
                                                            key={`${msg?.Id || msg?.MessageId || msg?.ContextId || 'reply'}-thumb-${idx}`}
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
                                                            <img
                                                                src={thumbSrc}
                                                                alt="preview"
                                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                            />
                                                            {showOverflow && (
                                                                <Box
                                                                    sx={{
                                                                        position: 'absolute',
                                                                        inset: 0,
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'center',
                                                                        backgroundColor: alpha('#000', 0.45),
                                                                        color: '#fff',
                                                                        fontWeight: 700,
                                                                        fontSize: 14,
                                                                    }}
                                                                >
                                                                    +{overflowCount}
                                                                </Box>
                                                            )}
                                                        </Box>
                                                    );
                                                })}
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
                                            {specificMedia?.mimeType?.startsWith('video/') || String(replyMediaUrl).includes('.mp4') ? (
                                                <video
                                                    src={replyMediaUrl}
                                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                />
                                            ) : (
                                                <img
                                                    src={replyMediaUrl}
                                                    alt="preview"
                                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                />
                                            )}
                                        </Box>
                                    )}
                                </div>
                            );
                        })()}
                        {msg?.MessageType === "text" && (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1.5rem' }}>
                                <Typography variant="body2" className="message-text" style={{ flex: 1, marginRight: 0 }}>
                                    {linkifyText(msg.Message)}
                                </Typography>
                                {/* Message status inline for reply messages */}
                                <Box
                                    className="message-status"
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'flex-end',
                                        gap: 0.5,
                                        flexShrink: 0,
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    <Typography
                                        variant="caption"
                                        className="message-time"
                                        sx={{
                                            '&&': {
                                                display: 'inline-flex !important',
                                                alignItems: 'center',
                                                marginTop: '0px !important',
                                                lineHeight: 1,
                                                color: alpha(theme.palette.text.primary, 0.65) + ' !important',
                                            },
                                            fontSize: 11,
                                        }}
                                    >
                                        {msg?.Time || msg.dateTime
                                            ? msg?.Time || msg.dateTime
                                            : msg.DateTime && FormatDateIST(msg.DateTime, "dd-mm-yyyy").time}
                                    </Typography>
                                    {msg.Direction == 1 && !msg.isUploading && (
                                        <Box sx={{ display: "flex", alignItems: "center", lineHeight: 1 }}>
                                            {(() => {
                                                const statusKey = getMessageStatusIcon(msg);
                                                const isVisible = statusKey === 'sent' || statusKey === 'read';
                                                const color = statusKey === 'read'
                                                    ? theme.palette.primary.blue
                                                    : alpha(theme.palette.text.primary, 0.6);

                                                return (
                                                    <CheckCheck
                                                        size={18}
                                                        style={{
                                                            marginLeft: 4,
                                                            color,
                                                            visibility: isVisible ? 'visible' : 'hidden',
                                                        }}
                                                    />
                                                );
                                            })()}
                                        </Box>
                                    )}
                                </Box>
                            </div>
                        )}
                    </div>
                )}

                {/* Text - Only show when NOT a reply (ContextType !== 2) */}
                {msg.ContextType !== 2 && msg?.MessageType === "text" && (
                    <Typography
                        variant="body2"
                        className="message-text"
                        sx={{
                            '&&': {
                                color: theme.palette.text.primary + ' !important',
                            },
                            fontSize: 14,
                            lineHeight: 1.45,
                            pr: 1,
                        }}
                    >
                        {linkifyText(msg.Message)}
                    </Typography>
                )}



                {/* Image */}
                {msg?.MessageType === "image" && ((_, index) => {
                    const mediaKey = getMediaKey(msg, index);
                    const src = getMediaSrcForMessage(msg);

                    const mediaItems = Array.isArray(msg?.mediaItems) ? msg.mediaItems : [];
                    const hasGrid = mediaItems.length > 1;
                    const gridRows = mediaItems.length <= 2 ? '1fr' : '1fr 1fr';
                    const gridHeight = mediaItems.length <= 2 ? 160 : 250;

                    const cachedDims = src ? imageDimsCache.get(src) : null;
                    const dimsForCalc = imageDims || cachedDims;

                    const mediaWidth = 250;
                    const computedHeight = dimsForCalc?.w && dimsForCalc?.h
                        ? Math.max('100%', Math.min(250, Math.round(mediaWidth * (dimsForCalc.h / dimsForCalc.w))))
                        : '100%';

                    return (
                        <div style={{ position: 'relative' }}>
                            <div
                                className="message-image"
                                style={{
                                    position: 'relative',
                                    width: mediaWidth,
                                    height: hasGrid ? gridHeight : computedHeight,
                                    borderRadius: 12,
                                    overflow: 'hidden',
                                }}
                            >
                                {hasGrid ? (
                                    <div
                                        style={{
                                            display: 'grid',
                                            gridTemplateColumns: '1fr 1fr',
                                            gridTemplateRows: gridRows,
                                            gap: 2,
                                            width: '100%',
                                            height: '100%',
                                            cursor: 'pointer',
                                            backgroundColor: 'rgba(0,0,0,0.04)',
                                        }}
                                    >
                                        {mediaItems.slice(0, 4).map((item, tileIndex) => {
                                            const tileKey = `${mediaKey}-${tileIndex}`;
                                            const tileSrc = item?.url;
                                            const overflowCount = mediaItems.length - 4;
                                            const showOverflow = tileIndex === 3 && overflowCount > 0;

                                            return (
                                                <div
                                                    key={tileKey}
                                                    style={{
                                                        position: 'relative',
                                                        width: '100%',
                                                        height: '100%',
                                                        overflow: 'hidden',
                                                        borderRadius: 8,
                                                    }}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        e.preventDefault();
                                                        handleMediaClick(msg, tileIndex);
                                                    }}
                                                >
                                                    {!loadedMedia[tileKey] && (
                                                        <Skeleton
                                                            variant="rounded"
                                                            className="media-skeleton"
                                                            sx={{
                                                                borderRadius: 0,
                                                                position: 'absolute',
                                                                inset: 0,
                                                                width: '100%',
                                                                height: '100%',
                                                            }}
                                                        />
                                                    )}

                                                    {tileSrc && (
                                                        <img
                                                            src={tileSrc}
                                                            alt="sent-img"
                                                            onLoad={() => markLoaded(tileKey)}
                                                            onError={(e) => {
                                                                if (e.target.src !== imageNotFound) {
                                                                    e.target.src = imageNotFound;
                                                                }
                                                                markLoaded(tileKey);
                                                            }}
                                                            style={{
                                                                display: 'block',
                                                                width: '100%',
                                                                height: '100%',
                                                                objectFit: 'cover',
                                                                opacity: loadedMedia[tileKey] ? 1 : 0,
                                                            }}
                                                        />
                                                    )}

                                                    {showOverflow && (
                                                        <div
                                                            style={{
                                                                position: 'absolute',
                                                                inset: 0,
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                backgroundColor: 'rgba(0,0,0,0.45)',
                                                                color: '#fff',
                                                                fontWeight: 600,
                                                                fontSize: 22,
                                                            }}
                                                        >
                                                            +{overflowCount}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <>
                                        {!loadedMedia[mediaKey] && (
                                            <Skeleton
                                                variant="rounded"
                                                className="media-skeleton"
                                                sx={{
                                                    borderRadius: 0,
                                                    position: 'absolute',
                                                    inset: 0,
                                                    width: '100%',
                                                    height: '100%',
                                                }}
                                            />
                                        )}

                                        <div onClick={(e) => {
                                            e.stopPropagation();
                                            e.preventDefault();
                                            if (msg?.mediaItems?.length) {
                                                handleMediaClick(msg, 0);
                                            } else {
                                                handleMediaClick({
                                                    mediaItems: [{
                                                        url: src,
                                                        mimeType: 'image/*',
                                                        filename: 'image'
                                                    }]
                                                }, 0);
                                            }
                                        }} style={{ cursor: 'pointer' }}>
                                            {src &&
                                                <img
                                                    src={src}
                                                    alt="sent-img"
                                                    onLoad={(e) => {
                                                        const w = e?.currentTarget?.naturalWidth || 0;
                                                        const h = e?.currentTarget?.naturalHeight || 0;
                                                        if (w > 0 && h > 0) {
                                                            const nextDims = { w, h };
                                                            setImageDims(nextDims);
                                                            if (src) {
                                                                imageDimsCache.set(src, nextDims);
                                                            }
                                                        }
                                                        markLoaded(mediaKey);
                                                    }}
                                                    onError={(e) => {
                                                        if (e.target.src !== imageNotFound) {
                                                            e.target.src = imageNotFound;
                                                        }
                                                        markLoaded(mediaKey);
                                                    }}
                                                    style={{
                                                        display: 'block',
                                                        width: '100%',
                                                        height: '100%',
                                                        objectFit: 'cover',
                                                        opacity: loadedMedia[mediaKey] ? 1 : 0,
                                                    }}
                                                />
                                            }
                                        </div>
                                    </>
                                )}

                                {msg.isUploading && (
                                    <UploadProgressOverlay percent={msg.percent} />
                                )}
                            </div>
                        </div>
                    );
                })()}

                {/* Video */}
                {msg?.MessageType === "video" && ((_, index) => {
                    const mediaKey = getMediaKey(msg, index);
                    const src = getMediaSrcForMessage(msg);

                    const mediaItems = Array.isArray(msg?.mediaItems) ? msg.mediaItems : [];
                    const hasGrid = mediaItems.length > 1;
                    const gridRows = mediaItems.length <= 2 ? '1fr' : '1fr 1fr';
                    const gridHeight = mediaItems.length <= 2 ? 160 : 220;

                    return (
                        <div style={{ position: 'relative' }}>
                            <div
                                className="message-video"
                                style={{
                                    position: 'relative',
                                    width: 220,
                                    height: hasGrid ? gridHeight : 'auto',
                                    borderRadius: 12,
                                    overflow: 'hidden',
                                }}
                            >
                                {hasGrid ? (
                                    <div
                                        style={{
                                            display: 'grid',
                                            gridTemplateColumns: '1fr 1fr',
                                            gridTemplateRows: gridRows,
                                            gap: 2,
                                            width: '100%',
                                            height: '100%',
                                            cursor: 'pointer',
                                            backgroundColor: 'rgba(0,0,0,0.04)',
                                        }}
                                    >
                                        {mediaItems.slice(0, 4).map((item, tileIndex) => {
                                            const tileKey = `${mediaKey}-${tileIndex}`;
                                            const tileSrc = item?.url;
                                            const overflowCount = mediaItems.length - 4;
                                            const showOverflow = tileIndex === 3 && overflowCount > 0;

                                            return (
                                                <div
                                                    key={tileKey}
                                                    style={{
                                                        position: 'relative',
                                                        width: '100%',
                                                        height: '100%',
                                                        overflow: 'hidden',
                                                        borderRadius: 8,
                                                    }}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        e.preventDefault();
                                                        handleMediaClick(msg, tileIndex);
                                                    }}
                                                >
                                                    {!loadedMedia[tileKey] && (
                                                        <Skeleton
                                                            variant="rounded"
                                                            className="media-skeleton"
                                                            sx={{
                                                                borderRadius: 0,
                                                                position: 'absolute',
                                                                inset: 0,
                                                                width: '100%',
                                                                height: '100%',
                                                            }}
                                                        />
                                                    )}

                                                    {tileSrc && (
                                                        <video
                                                            src={tileSrc}
                                                            muted
                                                            playsInline
                                                            preload="metadata"
                                                            onLoadedData={() => markLoaded(tileKey)}
                                                            onError={() => markLoaded(tileKey)}
                                                            style={{
                                                                display: 'block',
                                                                width: '100%',
                                                                height: '100%',
                                                                objectFit: 'cover',
                                                                opacity: loadedMedia[tileKey] ? 1 : 0,
                                                                pointerEvents: 'none',
                                                            }}
                                                        />
                                                    )}

                                                    {tileSrc && !showOverflow && (
                                                        <div
                                                            style={{
                                                                position: 'absolute',
                                                                inset: 0,
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                backgroundColor: 'rgba(0,0,0,0.45)',
                                                                color: '#fff',
                                                                borderRadius: '4px',
                                                            }}
                                                        >
                                                            <IconButton
                                                                size="small"
                                                                sx={{
                                                                    backgroundColor: 'rgba(255,255,255,0.9)',
                                                                    color: '#000',
                                                                    '&:hover': {
                                                                        backgroundColor: 'rgba(255,255,255,1)',
                                                                    },
                                                                }}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    e.preventDefault();
                                                                    handleMediaClick(msg, tileIndex);
                                                                }}
                                                            >
                                                                <Play size={16} />
                                                            </IconButton>
                                                        </div>
                                                    )}

                                                    {showOverflow && (
                                                        <div
                                                            style={{
                                                                position: 'absolute',
                                                                inset: 0,
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                backgroundColor: 'rgba(0,0,0,0.45)',
                                                                color: '#fff',
                                                                fontWeight: 600,
                                                                fontSize: 22,
                                                            }}
                                                        >
                                                            +{overflowCount}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <>
                                        {(!loadedMedia[mediaKey] && src !== imageNotFound && !videoLoadError) && (
                                            <Skeleton
                                                variant="rounded"
                                                className="media-skeleton"
                                                sx={{
                                                    borderRadius: 0,
                                                    position: 'absolute',
                                                    inset: 0,
                                                    width: '100%',
                                                    height: '100%',
                                                }}
                                            />
                                        )}

                                        <div onClick={(e) => {
                                            e.stopPropagation();
                                            e.preventDefault();
                                            if (msg?.mediaItems?.length) {
                                                handleMediaClick(msg, 0);
                                            } else {
                                                handleMediaClick({
                                                    mediaItems: [{
                                                        url: src,
                                                        mimeType: 'video/*',
                                                        filename: 'video'
                                                    }]
                                                }, 0);
                                            }
                                        }} style={{ cursor: 'pointer', position: 'relative' }}>
                                            {(src === imageNotFound || videoLoadError) ? (
                                                <img
                                                    src={imageNotFound}
                                                    alt="Video not found"
                                                    style={{
                                                        width: '100%',
                                                        height: '100%',
                                                        objectFit: 'cover',
                                                        borderRadius: 12,
                                                    }}
                                                />
                                            ) : (
                                                src && (
                                                    <video
                                                        src={src}
                                                        muted
                                                        playsInline
                                                        preload="metadata"
                                                        onLoadedData={() => markLoaded(mediaKey)}
                                                        onError={() => {
                                                            markLoaded(mediaKey);
                                                            setVideoLoadError(true);
                                                        }}
                                                        style={{
                                                            width: '100%',
                                                            height: '100%',
                                                            objectFit: 'cover',
                                                            opacity: loadedMedia[mediaKey] ? 1 : 0,
                                                            pointerEvents: 'none',
                                                        }}
                                                    />
                                                )
                                            )}
                                            {src && (src !== imageNotFound) && !videoLoadError && (
                                                <div
                                                    style={{
                                                        position: 'absolute',
                                                        inset: 0,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        backgroundColor: 'rgba(0,0,0,0.45)',
                                                        color: '#fff',
                                                        borderRadius: '4px',
                                                    }}
                                                >
                                                    <IconButton
                                                        size="small"
                                                        sx={{
                                                            backgroundColor: 'rgba(255,255,255,0.9)',
                                                            color: '#000',
                                                            '&:hover': {
                                                                backgroundColor: 'rgba(255,255,255,1)',
                                                            },
                                                        }}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            e.preventDefault();
                                                            if (msg?.mediaItems?.length) {
                                                                handleMediaClick(msg, 0);
                                                            } else {
                                                                handleMediaClick({
                                                                    mediaItems: [{
                                                                        url: src,
                                                                        mimeType: 'video/*',
                                                                        filename: 'video'
                                                                    }]
                                                                }, 0);
                                                            }
                                                        }}
                                                    >
                                                        <Play size={20} />
                                                    </IconButton>
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}

                                {msg.isUploading && (
                                    <UploadProgressOverlay percent={msg.percent} />
                                )}
                            </div>
                        </div>
                    );
                })()}

                {/* Document */}
                {msg?.MessageType === "document" && (() => {
                    const mediaItems = Array.isArray(msg?.mediaItems) ? msg.mediaItems : [];

                    const renderDocumentItem = (itemProps, index) => {
                        const { url: href, filename, fileName, mimeType, fileType } = itemProps;
                        const name = filename || fileName || 'Document';
                        const meta = getDocumentMeta(name);

                        // Map iconName to Lucide components
                        const IconMap = {
                            FileText,
                            FileType,
                            FileSpreadsheet,
                            FileArchive,
                            FileCode,
                            File
                        };
                        const DocIcon = IconMap[meta.iconName] || File;

                        return (
                            <Box
                                key={index}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    handleDownloadFile(href, name);
                                }}
                                sx={{
                                    position: 'relative',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1.5,
                                    width: 350, // Fixed width for all document cards
                                    padding: '12px 16px',
                                    borderRadius: '12px',
                                    backgroundColor: msg.Direction == 1 ? alpha(theme.palette.background.default, 0.2) : theme.palette.background.default,
                                    backdropFilter: 'blur(1px)',
                                    cursor: 'pointer',
                                    color: theme.palette.text.primary,
                                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                }}
                            >
                                <Box
                                    className="doc-icon-box"
                                    sx={{
                                        width: 30,
                                        height: 30,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flex: '0 0 auto',
                                        transition: 'all 0.2s ease',
                                        overflow: 'hidden'
                                    }}
                                >
                                    {meta.iconUrl ? (
                                        <img
                                            src={meta.iconUrl}
                                            alt={meta.label}
                                            style={{
                                                width: '100%',
                                                height: '100%',
                                                objectFit: 'contain',
                                            }}
                                        />
                                    ) : (
                                        <DocIcon size={24} />
                                    )}
                                </Box>

                                <Box sx={{ minWidth: 0, flex: '1 1 auto', display: 'flex', flexDirection: 'column', gap: 0.2 }}>
                                    <Typography
                                        variant="body2"
                                        sx={{
                                            fontWeight: 500,
                                            color: theme.palette.text.primary,
                                            lineHeight: 1.2,
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                        }}
                                        title={name}
                                    >
                                        {name}
                                    </Typography>
                                    <Typography
                                        variant="caption"
                                        sx={{
                                            color: alpha(theme.palette.text.primary, 0.8),
                                            fontWeight: 500,
                                            letterSpacing: '0.02em',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 0.8
                                        }}
                                    >
                                        <span style={{
                                            fontSize: '0.6rem',
                                        }}>
                                            {meta.label}
                                        </span>
                                        {itemProps.size && <span>• {itemProps.size}</span>}
                                    </Typography>
                                </Box>

                                <IconButton
                                    component="a"
                                    href={href}
                                    download={name}
                                    size="small"
                                    className="doc-download-btn"
                                    onClick={(e) => e.stopPropagation()}
                                    sx={{
                                        color: theme.palette.text.primary,
                                        flex: '0 0 auto',
                                        opacity: 0.6,
                                        transform: 'translateX(4px)',
                                        transition: 'all 0.2s ease',
                                        border: '1px solid',
                                        borderColor: theme.palette.text.primary,
                                        borderRadius: '50%',
                                    }}
                                    title="Download"
                                >
                                    <ArrowBigDown size={20} />
                                </IconButton>
                            </Box>
                        );
                    };

                    if (mediaItems.length === 0) {
                        return (
                            <div className="message-document" style={{ position: 'relative', maxWidth: 350, width: '100%' }}>

                                {renderDocumentItem({
                                    url: getMediaSrcForMessage(msg),
                                    fileName: msg.fileName,
                                    fileType: msg.fileType,
                                    percent: msg.percent
                                }, 0)}
                                {msg.isUploading && (
                                    <UploadProgressOverlay percent={msg.percent} size={40} />
                                )}
                            </div>
                        );
                    }

                    return (
                        <div className="message-document-group" style={{ position: 'relative', maxWidth: 350, width: '100%', display: 'flex', flexDirection: 'column', gap: 4 }}>

                            {mediaItems.map((item, index) => renderDocumentItem(item, index))}
                            {msg.isUploading && (
                                <UploadProgressOverlay percent={msg.percent} size={40} />
                            )}
                        </div>
                    );
                })()}

                {/* Optional caption under media */}
                {msg?.MessageType !== 'text' && msg?.Message && (
                    <Typography
                        variant="body2"
                        className="message-text"
                        sx={{
                            mt: 0.5,
                            '&&': {
                                color: theme.palette.text.primary + ' !important',
                            },
                        }}
                    >
                        {msg?.MessageType === 'template' ? "" : msg.Message}
                    </Typography>
                )}

                {/* Footer - Only show when NOT a reply (ContextType !== 2) */}
                {msg.ContextType !== 2 && (
                    <Box
                        className="message-status"
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'flex-end',
                            gap: 0.5,
                            mt: '4px !important',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        <Typography
                            variant="caption"
                            className="message-time"
                            sx={{
                                '&&': {
                                    color: alpha(theme.palette.text.primary, 0.65) + ' !important',
                                    display: 'inline-flex !important',
                                    alignItems: 'center',
                                    marginTop: '0px !important',
                                    lineHeight: 1,
                                },
                                fontSize: 11,
                            }}
                        >
                            {msg?.Time || msg.dateTime
                                ? msg?.Time || msg.dateTime
                                : msg.DateTime && FormatDateIST(msg.DateTime, "dd-mm-yyyy").time}
                        </Typography>

                        {msg.Direction == 1 && !msg.isUploading && (
                            <Box sx={{ display: "flex", alignItems: "center", lineHeight: 1 }}>
                                {(() => {
                                    const statusKey = getMessageStatusIcon(msg);
                                    const isVisible = statusKey === 'sent' || statusKey === 'read';
                                    const color = statusKey === 'read'
                                        ? theme.palette.primary.blue
                                        : alpha(theme.palette.text.primary, 0.6);

                                    return (
                                        <CheckCheck
                                            size={18}
                                            style={{
                                                marginLeft: 4,
                                                color,
                                                visibility: isVisible ? 'visible' : 'hidden',
                                            }}
                                        />
                                    );
                                })()}
                            </Box>
                        )}
                    </Box>
                )}

                {msg?.ReactionEmojis && msg.ReactionEmojis !== "" && msg.ReactionEmojis !== "[]" && (
                    <div
                        className="message-reaction"
                        onClick={(e) => {
                            e.stopPropagation();
                            setAnchorEl(e.currentTarget);
                        }}
                        style={{ cursor: 'pointer' }}
                    >
                        <span>
                            {(() => {
                                try {
                                    const reactions = JSON.parse(msg.ReactionEmojis);

                                    if (Array.isArray(reactions)) {
                                        return reactions.map((r, idx) => {
                                            const emojiChar = r?.Reaction || r?.Emoji;
                                            const unified = r?.Unified || charToUnified(emojiChar);
                                            return (
                                                <React.Fragment key={idx}>
                                                    {unified ? (
                                                        <Emoji unified={unified} size={18} emojiStyle="apple" />
                                                    ) : (
                                                        emojiChar
                                                    )}
                                                </React.Fragment>
                                            );
                                        });
                                    }

                                    return "";
                                } catch (e) {
                                    console.error("ReactionEmojis parse error:", e);
                                    return "";
                                }
                            })()}
                        </span>
                    </div>
                )}

            </Box>
            {
                msg?.ReactionEmojis && (
                    <ReactionDetailsMenu
                        anchorEl={anchorEl}
                        onClose={() => setAnchorEl(null)}
                        reactions={parsedReactions}
                        auth={auth}
                        onRemoveReaction={(reaction) => {
                            if (typeof handleRemoveReaction === 'function') {
                                handleRemoveReaction(reaction, msg);
                            }
                            setAnchorEl(null);
                        }}
                    />
                )
            }
            {/* {msg?.Direction == 1 && (
                <Box className="message-username-sendinfo" sx={{
                    marginTop: msg?.Direction === 1 && msg?.ReactionEmojis && msg?.ReactionEmojis !== "" && msg.ReactionEmojis !== "[]" ? "20px" : "0px"
                }}>
                    @{msg?.SenderInfo}
                </Box>
            )} */}
        </div>
    );
};



export default React.memo(MessageContent);
