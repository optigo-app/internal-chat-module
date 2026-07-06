import React, { useState, useCallback, useRef } from 'react';
import { Typography, Badge, IconButton, Tooltip } from '@mui/material';
import { CheckCheck, Image, Video, FileText, Pin, Star, ChevronDown } from 'lucide-react';
import ConversationAvatar from '../ReusableComponent/ConversationAvatar';
import { renderEmojiText } from '../../utils/EmojiRenderer';
import { highlightText } from '../../utils/globalFunc';
import { queueDroppedFiles } from '../../utils/dropFileQueue';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const withEmoji16 = (children) => {
    return React.Children.map(children, (child) => {
        if (typeof child === 'string') {
            return renderEmojiText(child, { size: 16 });
        }
        return child;
    });
};

const ConversationItem = React.memo(({ 
    member, 
    isSelected, 
    isSelectedAndReading, 
    isKeyboardSelected, 
    isMenuOpen, 
    shouldShowUnreadBadge,
    typingState,
    draftText,
    hoveredId,
    searchTerm,
    handleCustomerClick,
    setHoveredId,
    setAnchorEl,
    setSelectMember,
    onConversationList,
    chatMembersData,
    isFavorite
}) => {
    const [isDragOver, setIsDragOver] = useState(false);
    const dragCounter = useRef(0);

    const isExternalFileDrag = useCallback((e) => {
        const types = e.dataTransfer.types;
        if (!types?.includes('Files')) return false;
        if (types.includes('text/uri-list') || types.includes('text/html')) return false;
        return true;
    }, []);

    const handleDragEnter = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!isExternalFileDrag(e)) return;
        dragCounter.current++;
        if (e.dataTransfer.items?.length > 0) setIsDragOver(true);
    }, [isExternalFileDrag]);

    const handleDragLeave = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!isExternalFileDrag(e)) return;
        if (--dragCounter.current === 0) setIsDragOver(false);
    }, [isExternalFileDrag]);

    const handleDragOver = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter.current = 0;
        setIsDragOver(false);
        if (!isExternalFileDrag(e)) return;
        if (e.dataTransfer.files?.length > 0) {
            const files = Array.from(e.dataTransfer.files);
            queueDroppedFiles(member.ConversationId, files);
            handleCustomerClick(member);
        }
    }, [member, handleCustomerClick, isExternalFileDrag]);

    const getMessageStatusIcon = (member) => {
        const direction = Number(member?.LastMessageDirection ?? member?.lastMessageDirection);
        if (direction !== 1) return null;
        const raw = member?.LastMessageStatus ?? member?.lastMessageStatus ?? member?.Status;
        let statusKey = null;
        if (typeof raw === 'string') {
            const lowered = raw.toLowerCase();
            if (lowered === 'read') statusKey = 'read';
            if (lowered === 'sent') statusKey = 'sent';
        } else {
            const parsed = typeof raw === 'number' ? raw : parseInt(raw, 10);
            if (parsed === 3) statusKey = 'read';
            if (parsed === 1 || parsed === 0) statusKey = 'sent';
        }
        if (!statusKey) return null;
        return (
            <CheckCheck
                size={16}
                style={{ marginRight: 5, color: statusKey === 'read' ? "#1F51FF" : "#9e9e9e" }}
            />
        );
    };

    return (
        <li
            className={`member-item ${isSelected ? 'active' : ''} ${isSelectedAndReading ? 'reading' : ''} ${isMenuOpen ? 'menu-open' : ''} ${isKeyboardSelected ? 'keyboard-selected' : ''} ${isDragOver ? 'drag-over' : ''}`}
            onClick={() => handleCustomerClick(member)}
            onMouseEnter={() => setHoveredId(member.ConversationId)}
            onMouseLeave={() => setHoveredId(null)}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
        >
            <div className={`member-item ${isSelected ? 'active' : ''} ${isSelectedAndReading ? 'reading' : ''}`}>
                <div className="member-avatar">
                    <ConversationAvatar member={member} />
                </div>

                <div className="member-info">
                    <div className="member-header">
                        <Typography
                            variant="subtitle1"
                            className={shouldShowUnreadBadge ? 'member-name-unread' : 'member-name'}
                        >
                            {highlightText(member.name, searchTerm)}
                        </Typography>

                        <Typography variant="caption" className="member-time">
                            {member?.lastMessageTime}
                        </Typography>
                    </div>

                    <div className="member-message">
                        <Typography
                            variant="body2"
                            className={shouldShowUnreadBadge ? 'last-message-unread' : 'last-message'}
                            style={{ display: 'flex', alignItems: 'center' }}
                        >
                            {typingState ? (
                                <span className='typing_indecator'>
                                    <div className="typing-dots-container sidebar-dots">
                                        <div className="typing-dot"></div>
                                        <div className="typing-dot"></div>
                                        <div className="typing-dot"></div>
                                    </div>
                                    {member.IsGroup === 1
                                        ? `${typingState.userName} is typing...`
                                        : 'typing...'}
                                </span>
                            ) : (draftText && !isSelected) ? (
                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <span style={{ color: '#7367f0', fontWeight: 600 }}>Draft: </span>
                                    <span style={{ color: '#4b4b4b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {renderEmojiText(draftText, { size: 16 })}
                                    </span>
                                </span>
                            ) : (
                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    {getMessageStatusIcon(member)}

                                    {/* TEXT MESSAGE */}
                                    {member.LastMessageType === 1 && (
                                        <ReactMarkdown
                                            remarkPlugins={[remarkGfm]}
                                            components={{
                                                p: ({node, children, ...props}) => <span {...props}>{withEmoji16(children)} </span>,
                                                a: ({node, children, ...props}) => <span {...props}>{withEmoji16(children)}</span>,
                                                strong: ({node, children, ...props}) => <strong {...props}>{withEmoji16(children)}</strong>,
                                                em: ({node, children, ...props}) => <em {...props}>{withEmoji16(children)}</em>,
                                                del: ({node, children, ...props}) => <del {...props}>{withEmoji16(children)}</del>,
                                                code: ({node, children, ...props}) => <span style={{ fontFamily: 'monospace' }} {...props}>{withEmoji16(children)}</span>,
                                                pre: ({node, children, ...props}) => <span {...props}>{children}</span>,
                                                blockquote: ({node, children, ...props}) => <span style={{ fontStyle: 'italic', opacity: 0.8 }} {...props}>"{withEmoji16(children)}" </span>,
                                                ul: ({node, children, ...props}) => <span {...props}>{children}</span>,
                                                ol: ({node, children, ...props}) => <span {...props}>{children}</span>,
                                                li: ({node, children, ...props}) => <span {...props}>• {withEmoji16(children)} </span>,
                                                h1: ({node, children, ...props}) => <strong {...props}>{withEmoji16(children)} </strong>,
                                                h2: ({node, children, ...props}) => <strong {...props}>{withEmoji16(children)} </strong>,
                                                h3: ({node, children, ...props}) => <strong {...props}>{withEmoji16(children)} </strong>,
                                                h4: ({node, children, ...props}) => <strong {...props}>{withEmoji16(children)} </strong>,
                                                h5: ({node, children, ...props}) => <strong {...props}>{withEmoji16(children)} </strong>,
                                                h6: ({node, children, ...props}) => <strong {...props}>{withEmoji16(children)} </strong>,
                                            }}
                                        >
                                            {(member.LastMessage || 'Text').replace(/\\n/g, ' ')}
                                        </ReactMarkdown>
                                    )}

                                    {/* IMAGE */}
                                    {member.LastMessageType === 2 && (
                                        <>
                                            <Image size={12} />
                                            <span>Image</span>
                                        </>
                                    )}

                                    {/* VIDEO */}
                                    {member.LastMessageType === 3 && (
                                        <>
                                            <Video size={14} />
                                            <span>Video</span>
                                        </>
                                    )}

                                    {/* DOCUMENT */}
                                    {member.LastMessageType === 4 && (
                                        <>
                                            <FileText size={12} />
                                            <span>Document</span>
                                        </>
                                    )}

                                    {/* FALLBACK */}
                                    {!member.LastMessageType && <span>Text</span>}
                                </span>
                            )}

                        </Typography>

                        <div className="member-trailing">
                            {shouldShowUnreadBadge && (
                                <Badge
                                    badgeContent={member?.unreadCount ?? member?.UnreadCount}
                                    color="primary"
                                    className="unread-badge"
                                />
                            )}

                            <div className="member-actions-bar">
                                {member?.IsPin === 1 &&
                                    <Tooltip title={member?.IsPin === 1 ? "Unpin" : "Pin"} arrow>
                                        <IconButton
                                            size="small"
                                            className={`action-btn ${member?.IsPin === 1 ? 'is-on' : ''}`}
                                        >
                                            <Pin size={17} />
                                        </IconButton>
                                    </Tooltip>
                                }
                                {isFavorite &&
                                    <Tooltip title="Unfavorite" arrow>
                                        <IconButton
                                            size="small"
                                            className="action-btn is-on"
                                        >
                                            <Star size={17} />
                                        </IconButton>
                                    </Tooltip>
                                }
                                {(hoveredId === member.ConversationId || isSelected || isMenuOpen) &&
                                    <Tooltip
                                        title="More"
                                        arrow
                                    >
                                        <IconButton
                                            className={'action-btn'}
                                            size="small"
                                            tabIndex={(hoveredId === member.ConversationId || isSelected || isMenuOpen) ? 0 : -1}
                                            aria-hidden={!(hoveredId === member.ConversationId || isSelected || isMenuOpen)}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (!(hoveredId === member.ConversationId || isSelected || isMenuOpen)) return;
                                                setAnchorEl(e.currentTarget);
                                                setSelectMember(member);
                                                onConversationList(Array.isArray(chatMembersData) ? chatMembersData : []);
                                            }}
                                        >
                                            <ChevronDown size={17} />
                                        </IconButton>
                                    </Tooltip>
                                }
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </li>
    );
});

export default ConversationItem;