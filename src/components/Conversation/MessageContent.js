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
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { renderEmojiText } from '../../utils/EmojiRenderer';

// Helper to recursively apply emoji rendering to text nodes
const withEmoji = (children) => {
    return React.Children.map(children, (child) => {
        if (typeof child === 'string') {
            return renderEmojiText(child);
        }
        // If the child is a React element, we could recursively process it, 
        // but react-markdown breaks text into individual string children of elements,
        // so processing just strings at the component level is sufficient.
        return child;
    });
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
    const [isExpanded, setIsExpanded] = useState(false);

    const parsedReactions = React.useMemo(() => parseReactions(msg?.ReactionEmojis), [msg?.ReactionEmojis]);

    const MESSAGE_CHAR_LIMIT = 2000;
    const DISPLAY_CHAR_LIMIT = 1000;
    const messageText = msg.Message || '';
    const shouldTruncate = messageText.length > DISPLAY_CHAR_LIMIT;
    const displayText = shouldTruncate && !isExpanded
        ? messageText.slice(0, DISPLAY_CHAR_LIMIT) + '...'
        : messageText;




    return (
        <div className="message-content" style={{ flexDirection: 'column' }}>
            <MessageBubble
                msg={msg}
                isOutgoing={isOutgoing}
                selectedCustomer={selectedCustomer}
                onContextMenu={(e) => handleContextMenu(e, msg)}
            >
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
                                top: '4px !important',
                                right: '4px !important',
                                padding: '1px !important',
                                color: (isOutgoing ? theme.palette.text.secondary : theme.palette.text.primary) + ' !important',
                                opacity: shouldShowActions ? 1 : 0,
                                transform: shouldShowActions ? 'translateX(0) scale(1)' : 'translateX(8px) scale(0.8)',
                                pointerEvents: shouldShowActions ? 'auto' : 'none',
                                background: `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.95)} 0%, ${alpha(theme.palette.background.paper, 0.6)} 100%) !important`,
                                backdropFilter: 'blur(4px) !important',
                                borderRadius: '50% !important',
                                boxShadow: '0 2px 6px rgba(0,0,0,0.18) !important',
                                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1) !important',
                                zIndex: 10,
                                '&:hover': {
                                    backgroundColor: theme.palette.background.paper + ' !important',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.22) !important',
                                    transform: 'scale(1.1) !important',
                                }
                            },
                        }}
                    >
                        <ChevronDown size={22} style={{ strokeWidth: 2.5 }} />
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
                    <>
                        <Box
                            className="message-text"
                            sx={{
                                color: theme.palette.text.primary,
                                fontSize: 14,
                                lineHeight: 1.45,
                                pr: 1,
                                transition: 'max-height 0.3s ease-in-out, opacity 0.3s ease-in-out',
                                maxHeight: isExpanded ? 'none' : '500px',
                                overflow: 'hidden',
                                opacity: 1,
                                wordBreak: 'break-word',
                                maxWidth: '100%',
                            }}
                        >
                            <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={{
                                    p: ({node, children, ...props}) => <Typography variant="body2" sx={{margin: 0, padding: 0, fontSize: 'inherit', lineHeight: 'inherit'}} {...props}>{withEmoji(children)}</Typography>,
                                    a: ({node, children, ...props}) => <a style={{color: theme.palette.primary.main, textDecoration: 'underline'}} target="_blank" rel="noopener noreferrer" {...props}>{withEmoji(children)}</a>,
                                    strong: ({node, children, ...props}) => <strong {...props}>{withEmoji(children)}</strong>,
                                    em: ({node, children, ...props}) => <em {...props}>{withEmoji(children)}</em>,
                                    del: ({node, children, ...props}) => <del {...props}>{withEmoji(children)}</del>,
                                    code: ({node, inline, children, ...props}) => 
                                        inline 
                                        ? <code style={{ fontFamily: 'monospace', backgroundColor: 'rgba(0,0,0,0.05)', padding: '2px 4px', borderRadius: '4px', wordBreak: 'break-word' }} {...props}>{withEmoji(children)}</code>
                                        : <pre style={{ fontFamily: 'monospace', backgroundColor: 'rgba(0,0,0,0.05)', padding: '8px', borderRadius: '4px', overflowX: 'auto', margin: '4px 0', maxWidth: '100%', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}><code {...props}>{withEmoji(children)}</code></pre>,
                                    blockquote: ({node, children, ...props}) => <blockquote style={{ borderLeft: '4px solid #ccc', paddingLeft: '8px', margin: '4px 0 4px 0', color: '#666' }} {...props}>{withEmoji(children)}</blockquote>,
                                    ul: ({node, children, ...props}) => <ul style={{ padding: 0, margin: '4px 0 4px 24px' }} {...props}>{withEmoji(children)}</ul>,
                                    ol: ({node, children, ...props}) => <ol style={{ padding: 0, margin: '4px 0 4px 24px' }} {...props}>{withEmoji(children)}</ol>,
                                    li: ({node, children, ...props}) => <li style={{ margin: 0, padding: 0 }} {...props}>{withEmoji(children)}</li>,
                                    h1: ({node, children, ...props}) => <strong style={{ fontSize: '1.2em', display: 'block', margin: '4px 0' }} {...props}>{withEmoji(children)}</strong>,
                                    h2: ({node, children, ...props}) => <strong style={{ fontSize: '1.1em', display: 'block', margin: '4px 0' }} {...props}>{withEmoji(children)}</strong>,
                                    h3: ({node, children, ...props}) => <strong style={{ fontSize: '1.05em', display: 'block', margin: '4px 0' }} {...props}>{withEmoji(children)}</strong>,
                                    h4: ({node, children, ...props}) => <strong style={{ fontSize: '1em', display: 'block', margin: '4px 0' }} {...props}>{withEmoji(children)}</strong>,
                                    h5: ({node, children, ...props}) => <strong style={{ fontSize: '0.9em', display: 'block', margin: '4px 0' }} {...props}>{withEmoji(children)}</strong>,
                                    h6: ({node, children, ...props}) => <strong style={{ fontSize: '0.8em', display: 'block', margin: '4px 0' }} {...props}>{withEmoji(children)}</strong>,
                                }}
                            >
                                {displayText}
                            </ReactMarkdown>
                        </Box>
                        {shouldTruncate && (
                            <Typography
                                variant="caption"
                                sx={{
                                    color: theme.palette.primary.main,
                                    cursor: 'pointer',
                                    fontSize: 12,
                                    fontWeight: 500,
                                    ml: 0.5,
                                    transition: 'opacity 0.2s ease-in-out',
                                    '&:hover': { textDecoration: 'underline' }
                                }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsExpanded(!isExpanded);
                                }}
                            >
                                {isExpanded ? 'See less' : 'See more'}
                            </Typography>
                        )}
                    </>
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
                            <>
                                <Box
                                    className="message-text"
                                    sx={{
                                        mt: 0.5,
                                        color: theme.palette.text.primary,
                                        fontSize: 14,
                                        lineHeight: 1.45,
                                        wordBreak: 'break-word',
                                        transition: 'max-height 0.3s ease-in-out, opacity 0.3s ease-in-out',
                                        maxHeight: isExpanded ? 'none' : '500px',
                                        overflow: 'hidden',
                                        opacity: 1,
                                        maxWidth: '100%',
                                    }}
                                >
                                    <ReactMarkdown
                                        remarkPlugins={[remarkGfm]}
                                        components={{
                                            p: ({node, children, ...props}) => <Typography variant="body2" sx={{margin: 0, padding: 0, fontSize: 'inherit', lineHeight: 'inherit'}} {...props}>{withEmoji(children)}</Typography>,
                                            a: ({node, children, ...props}) => <a style={{color: theme.palette.primary.main, textDecoration: 'underline'}} target="_blank" rel="noopener noreferrer" {...props}>{withEmoji(children)}</a>,
                                            strong: ({node, children, ...props}) => <strong {...props}>{withEmoji(children)}</strong>,
                                            em: ({node, children, ...props}) => <em {...props}>{withEmoji(children)}</em>,
                                            del: ({node, children, ...props}) => <del {...props}>{withEmoji(children)}</del>,
                                            code: ({node, inline, children, ...props}) => 
                                                inline 
                                                ? <code style={{ fontFamily: 'monospace', backgroundColor: 'rgba(0,0,0,0.05)', padding: '2px 4px', borderRadius: '4px', wordBreak: 'break-word' }} {...props}>{withEmoji(children)}</code>
                                                : <pre style={{ fontFamily: 'monospace', backgroundColor: 'rgba(0,0,0,0.05)', padding: '8px', borderRadius: '4px', overflowX: 'auto', margin: '4px 0', maxWidth: '100%', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}><code {...props}>{withEmoji(children)}</code></pre>,
                                            blockquote: ({node, children, ...props}) => <blockquote style={{ borderLeft: '4px solid #ccc', paddingLeft: '8px', margin: '4px 0 4px 0', color: '#666' }} {...props}>{withEmoji(children)}</blockquote>,
                                            ul: ({node, children, ...props}) => <ul style={{ padding: 0, margin: '4px 0 4px 24px' }} {...props}>{withEmoji(children)}</ul>,
                                            ol: ({node, children, ...props}) => <ol style={{ padding: 0, margin: '4px 0 4px 24px' }} {...props}>{withEmoji(children)}</ol>,
                                            li: ({node, children, ...props}) => <li style={{ margin: 0, padding: 0 }} {...props}>{withEmoji(children)}</li>,
                                            h1: ({node, children, ...props}) => <strong style={{ fontSize: '1.2em', display: 'block', margin: '4px 0' }} {...props}>{withEmoji(children)}</strong>,
                                            h2: ({node, children, ...props}) => <strong style={{ fontSize: '1.1em', display: 'block', margin: '4px 0' }} {...props}>{withEmoji(children)}</strong>,
                                            h3: ({node, children, ...props}) => <strong style={{ fontSize: '1.05em', display: 'block', margin: '4px 0' }} {...props}>{withEmoji(children)}</strong>,
                                            h4: ({node, children, ...props}) => <strong style={{ fontSize: '1em', display: 'block', margin: '4px 0' }} {...props}>{withEmoji(children)}</strong>,
                                            h5: ({node, children, ...props}) => <strong style={{ fontSize: '0.9em', display: 'block', margin: '4px 0' }} {...props}>{withEmoji(children)}</strong>,
                                            h6: ({node, children, ...props}) => <strong style={{ fontSize: '0.8em', display: 'block', margin: '4px 0' }} {...props}>{withEmoji(children)}</strong>,
                                        }}
                                    >
                                        {displayText}
                                    </ReactMarkdown>
                                </Box>
                                {shouldTruncate && (
                                    <Typography
                                        variant="caption"
                                        sx={{
                                            color: theme.palette.primary.main,
                                            cursor: 'pointer',
                                            fontSize: 12,
                                            fontWeight: 500,
                                            ml: 0.5,
                                            transition: 'opacity 0.2s ease-in-out',
                                            '&:hover': { textDecoration: 'underline' }
                                        }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setIsExpanded(!isExpanded);
                                        }}
                                    >
                                        {isExpanded ? 'See less' : 'See more'}
                                    </Typography>
                                )}
                            </>
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
                                        const displayReactions = uniqueReactions.slice(0, 3);
                                        const remainingCount = uniqueReactions.length - 3;

                                        return (
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                {displayReactions.map((r, idx) => {
                                                    const emojiChar = r?.Reaction || r?.Emoji;
                                                    const unified = r?.Unified || charToUnified(emojiChar);
                                                    return (
                                                        <Box
                                                            key={idx}
                                                            className="emoji-item"
                                                            sx={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: 0.3,
                                                                px: 0.1 // Prevent horizontal cutting
                                                            }}
                                                        >
                                                            {unified ? <Emoji unified={unified} size={18} emojiStyle="apple" /> : emojiChar}
                                                            {r.count > 1 && (
                                                                <Typography
                                                                    variant="caption"
                                                                    sx={{
                                                                        fontSize: '10px',
                                                                        fontWeight: 700,
                                                                        opacity: 0.9,
                                                                        lineHeight: 1,
                                                                        ml: -0.1 // Tighten count to emoji
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
                                                            fontSize: '10px',
                                                            fontWeight: 700,
                                                            color: theme.palette.text.secondary,
                                                            ml: 0.2,
                                                            opacity: 0.8
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
