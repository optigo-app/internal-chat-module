import React, { useEffect, useState } from 'react';
import { Box, IconButton, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { ChevronDown, Forward, CheckCheck, CircleMinus } from 'lucide-react';
import { Emoji } from 'emoji-picker-react';
import { FormatDateIST } from '../../utils/DateFnc';
import ReactionDetailsMenu from './ReactionMenu';
import { handleDownloadFile, getDocumentMeta, renderTextWithLinks } from '../../utils/globalFunc';
import { charToUnified, parseReactions } from '../../utils/EmojiUtils';
import imageNotFound from '../../assets/image-not-found.jpg';
import MessageBubble from '../chat/messages/MessageBubble';
import ReplyPreview from '../chat/messages/ReplyPreview';
import MessageActions from '../chat/messages/MessageActions';
import MediaMessage from '../chat/messages/MediaMessage';



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
    getMediaKey,
    getMediaSrcForMessage,
    loadedMedia,
    markLoaded,
    handleMediaClick,
    getMessageStatusIcon,
    getMessageById,
    handleForward,
    selectedCustomer,
    setDrawerViewState,
    setDrawerOpen,
}) => {

    const theme = useTheme();

    const linkifyText = (value) => renderTextWithLinks(value, {
        linkStyle: { color: theme.palette.primary.main },
    });


    const [anchorEl, setAnchorEl] = React.useState(null);
    const [videoLoadError, setVideoLoadError] = useState(false);

    const parsedReactions = React.useMemo(() => parseReactions(msg?.ReactionEmojis), [msg?.ReactionEmojis]);




    return (
        <div className="message-content" style={{ flexDirection: 'column' }}>
            <MessageBubble msg={msg} isOutgoing={isOutgoing} selectedCustomer={selectedCustomer}>
                <MessageActions
                    msg={msg}
                    isOutgoing={isOutgoing}
                    shouldShowActions={shouldShowActions}
                    handleForward={handleForward}
                    isReactionMenuOpenForCurrent={isReactionMenuOpenForCurrent}
                    reactionMenuAnchorEl={reactionMenuAnchorEl}
                    setHoveredMessageId={setHoveredMessageId}
                    currentHoverId={currentHoverId}
                    setReactionMenuAnchorEl={setReactionMenuAnchorEl}
                    setReactionMenuMessageId={setReactionMenuMessageId}
                    closeReactionMenu={closeReactionMenu}
                    handleMessageEmojiClick={handleMessageEmojiClick}
                />

                {!msg.IsDeletedForEveryone && (
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
                )}

                {/* Forwarded Indicator */}
                {(!!msg?.ForwardedFrom && msg?.ForwardedFrom !== "0") && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5, opacity: 0.7, color: theme.palette.text.secondary }}>
                        <Forward size={14} />
                        <Typography variant="caption" sx={{ fontSize: '11.5px', fontStyle: 'italic', fontWeight: 500 }}>
                            Forwarded
                        </Typography>
                    </Box>
                )}

                {/* Group Sender Name */}
                {(selectedCustomer?.IsGroup === 1 && !isOutgoing) && (
                    <Typography
                        variant="caption"
                        sx={{
                            fontWeight: 700,
                            color: theme.palette.primary.main,
                            display: 'block',
                            fontSize: '12.5px',
                            cursor: 'pointer',
                            '&:hover': { textDecoration: 'underline' }
                        }}
                        onClick={(e) => {
                            e.stopPropagation();
                            const memberData = {
                                id: msg?.SenderId,
                                UserId: msg.SenderEmail,
                                UserName: msg.SenderInfo || msg.Sender,
                                FirstName: msg.FirstName,
                                LastName: msg.LastName,
                                ProfileImageUrl: msg.SenderProfilePicture,
                                IsGroup: 0,
                                ConversationId: selectedCustomer?.ConversationId
                            };
                            window.dispatchEvent(new CustomEvent('SHOW_MEMBER_INFO', { detail: memberData }));
                            if (setDrawerViewState) setDrawerViewState('info');
                            if (setDrawerOpen) setDrawerOpen(true);
                        }}
                    >
                        {msg.SenderInfo || (msg.FirstName ? `${msg.FirstName} ${msg.LastName || ''}` : msg.Sender) || 'Member'}
                    </Typography>
                )}

                {/* Reply Preview */}
                {msg.ContextType === 2 && (
                    <ReplyPreview
                        msg={msg}
                        original={typeof getMessageById === 'function' && msg?.ContextId ? getMessageById(msg.ContextId) : null}
                        isOutgoing={isOutgoing}
                        scrollToMessage={scrollToMessage}
                        containerRef={containerRef}
                    />
                )}

                {/* Main Message Content */}
                {msg.IsDeletedForEveryone === 1 ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, opacity: 0.6, fontStyle: 'italic', pr: 1 }}>
                        <CircleMinus size={16} />
                        <Typography variant="body2" sx={{ fontSize: 13.5 }}>
                            {msg.IsMyMessage ? (msg.Message1 || msg.Message) : msg.Message}
                        </Typography>
                    </Box>
                ) : msg.MessageType === 'text' ? (
                    <Typography variant="body2" className="message-text" sx={{ color: theme.palette.text.primary, fontSize: 14, lineHeight: 1.45, pr: 1 }}>
                        {linkifyText(msg.Message)}
                    </Typography>
                ) : (
                    <Box sx={{ maxWidth: msg.MessageType === 'document' ? 350 : 250, width: '100%' }}>
                        <MediaMessage
                            msg={msg}
                            handleMediaClick={handleMediaClick}
                            getMediaKey={getMediaKey}
                            getMediaSrcForMessage={getMediaSrcForMessage}
                            loadedMedia={loadedMedia}
                            markLoaded={markLoaded}
                            imageNotFound={imageNotFound}
                            theme={theme}
                            videoLoadError={videoLoadError}
                            setVideoLoadError={setVideoLoadError}
                            getDocumentMeta={getDocumentMeta}
                            handleDownloadFile={handleDownloadFile}
                        />

                        {/* Caption under media */}
                        {msg?.Message && (
                            <Typography
                                variant="body2"
                                className="message-text"
                                sx={{
                                    mt: 0.5,
                                    color: theme.palette.text.primary,
                                    fontSize: 14,
                                    lineHeight: 1.45,
                                    wordBreak: 'break-word',
                                    whiteSpace: 'pre-wrap'
                                }}
                            >
                                {linkifyText(msg.Message)}
                            </Typography>
                        )}
                    </Box>
                )}

                {/* Footer Status & Time */}
                <Box
                    className="message-status"
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        gap: 0.5,
                        whiteSpace: 'nowrap',
                        mt: msg.MessageType === 'text' && msg.ContextType === 2 ? 0 : 0.5
                    }}
                >
                    {msg?.IsEdited == 1 && (
                        <Typography variant="caption" sx={{ fontSize: 11, color: alpha(theme.palette.text.primary, 0.65), ml: 0.5 }}>
                            Edited
                        </Typography>
                    )}
                    <Typography variant="caption" className="message-time" sx={{ color: alpha(theme.palette.text.primary, 0.65), fontSize: 11, display: 'inline-flex', alignItems: 'center', lineHeight: 1 }}>
                        {msg?.Time || msg.dateTime || (msg.DateTime && FormatDateIST(msg.DateTime, "dd-mm-yyyy").time)}
                    </Typography>

                    {msg.Direction == 1 && !msg.isUploading && (
                        <Box sx={{ display: "flex", alignItems: "center", lineHeight: 1 }}>
                            {(() => {
                                const statusKey = getMessageStatusIcon(msg);
                                const isVisible = ['sent', 'read', 'delivered'].includes(statusKey);
                                const color = statusKey === 'read' ? theme.palette.primary.blue : alpha(theme.palette.text.primary, 0.6);
                                return <CheckCheck size={18} style={{ marginLeft: 4, color, visibility: isVisible ? 'visible' : 'hidden' }} />;
                            })()}
                        </Box>
                    )}
                </Box>

                {/* Reactions */}
                {msg?.ReactionEmojis && msg.ReactionEmojis !== "" && msg.ReactionEmojis !== "[]" && (
                    <Box
                        className={`message-reaction ${isOutgoing ? 'outgoing' : 'incoming'}`}
                        onClick={(e) => { e.stopPropagation(); setAnchorEl(e.currentTarget); }}
                    >
                        <span>
                            {(() => {
                                try {
                                    const reactions = JSON.parse(msg.ReactionEmojis);
                                    if (Array.isArray(reactions)) {
                                        const emojiGroups = new Map();
                                        reactions.forEach(r => {
                                            const emojiChar = r?.Reaction || r?.Emoji;
                                            if (!emojiGroups.has(emojiChar)) {
                                                emojiGroups.set(emojiChar, { ...r, count: 1 });
                                            } else {
                                                emojiGroups.get(emojiChar).count++;
                                            }
                                        });

                                        const uniqueReactions = Array.from(emojiGroups.values());
                                        const displayReactions = uniqueReactions.slice(0, 2);
                                        const remainingCount = uniqueReactions.length - 2;

                                        return (
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
                                                {displayReactions.map((r, idx) => {
                                                    const emojiChar = r?.Reaction || r?.Emoji;
                                                    const unified = r?.Unified || charToUnified(emojiChar);
                                                    return (
                                                        <Box key={idx} className="emoji-item" sx={{ display: 'flex', alignItems: 'center', gap: 0.2 }}>
                                                            {unified ? <Emoji unified={unified} size={18} emojiStyle="apple" /> : emojiChar}
                                                            {r.count > 1 && (
                                                                <Typography
                                                                    variant="caption"
                                                                    sx={{
                                                                        fontSize: '10.5px',
                                                                        fontWeight: 700,
                                                                        opacity: 0.85,
                                                                        lineHeight: 1
                                                                    }}
                                                                >
                                                                    {r.count}
                                                                </Typography>
                                                            )}
                                                        </Box>
                                                    );
                                                })}
                                                {remainingCount > 0 && (
                                                    <Typography
                                                        variant="caption"
                                                        sx={{
                                                            fontSize: '11px',
                                                            fontWeight: 600,
                                                            ml: 0.2,
                                                            color: 'inherit',
                                                            opacity: 0.9
                                                        }}
                                                    >
                                                        +{remainingCount}
                                                    </Typography>
                                                )}
                                            </Box>
                                        );
                                    }
                                } catch (e) { console.error("ReactionEmojis parse error:", e); }
                                return "";
                            })()}
                        </span>
                    </Box>
                )}
            </MessageBubble>

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
        </div>
    );
};



export default React.memo(MessageContent);
