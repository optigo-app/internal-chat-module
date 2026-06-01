import React from 'react';
import { Typography, Badge, IconButton, Tooltip } from '@mui/material';
import { CheckCheck, Image, Video, FileText, Pin, Star, ChevronDown } from 'lucide-react';
import ConversationAvatar from '../ReusableComponent/ConversationAvatar';
import { renderEmojiText } from '../../utils/EmojiRenderer';
import { highlightText } from '../../utils/globalFunc';

const ConversationItem = React.memo(({ 
    member, 
    isSelected, 
    isSelectedAndReading, 
    isKeyboardSelected, 
    isMenuOpen, 
    shouldShowUnreadBadge,
    typingStates,
    drafts,
    hoveredId,
    searchTerm,
    handleCustomerClick,
    setHoveredId,
    setAnchorEl,
    setSelectMember,
    onConversationList,
    chatMembersData,
    favoriteState
}) => {
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
            className={`member-item ${isSelected ? 'active' : ''} ${isSelectedAndReading ? 'reading' : ''} ${isMenuOpen ? 'menu-open' : ''} ${isKeyboardSelected ? 'keyboard-selected' : ''}`}
            onClick={() => handleCustomerClick(member)}
            onMouseEnter={() => setHoveredId(member.ConversationId)}
            onMouseLeave={() => setHoveredId(null)}
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
                            {typingStates[member.ConversationId] ? (
                                <span className='typing_indecator'>
                                    <div className="typing-dots-container sidebar-dots">
                                        <div className="typing-dot"></div>
                                        <div className="typing-dot"></div>
                                        <div className="typing-dot"></div>
                                    </div>
                                    {member.IsGroup === 1
                                        ? `${typingStates[member.ConversationId].userName} is typing...`
                                        : 'typing...'}
                                </span>
                            ) : (drafts[member.ConversationId] && !isSelected) ? (
                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <span style={{ color: '#7367f0', fontWeight: 600 }}>Draft: </span>
                                    <span style={{ color: '#4b4b4b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {renderEmojiText(drafts[member.ConversationId], { size: 16 })}
                                    </span>
                                </span>
                            ) : (
                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    {getMessageStatusIcon(member)}

                                    {/* TEXT MESSAGE */}
                                    {member.LastMessageType === 1 && (
                                        renderEmojiText(member.LastMessage || 'Text', { size: 16 })
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
                                {((favoriteState[member.ConversationId]?.isStar ?? member?.IsStar) === 1) &&
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