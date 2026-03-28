import { useState } from 'react';
import { Typography, Avatar } from '@mui/material';
import { Search, UserPlus, ChevronDown, Clock } from 'lucide-react';
import { getWhatsAppAvatarConfig } from '../../utils/globalFunc';

const GroupMembersSection = ({
    members = [],
    isCurrentUserAdmin,
    auth,
    onAddMemberClick,
    onSearchClick,
    onMemberClick,
    showAllMembers,
    setShowAllMembers,
    groupPermissions,
    onPastParticipantsClick
}) => {
    const [hoveredMemberId, setHoveredMemberId] = useState(null);
    const canAddMembers = isCurrentUserAdmin || groupPermissions?.addOtherMembers;

    const visibleMembers = showAllMembers ? members : members.slice(0, 10);
    const hasMoreMembers = members.length > 10;

    return (
        <div className="info-block members-block">
            <div className="block-header">
                <Typography className="block-label">
                    {members.length} participants
                </Typography>
                <Search
                    size={16}
                    style={{ color: '#667781', cursor: 'pointer' }}
                    onClick={onSearchClick}
                />
            </div>

            <div className="settings-list members-list">
                {canAddMembers && (
                    <div className="setting-item no-border member-item add-member-row" onClick={onAddMemberClick}>
                        <div className="setting-left">
                            <div className="action-circle-small add-member-circle">
                                <UserPlus size={20} color='#fff' />
                            </div>
                            <span className="member-name action-text">Add members</span>
                        </div>
                    </div>
                )}

                {visibleMembers?.map((member, idx) => (
                    <div
                        key={member.UserId || idx}
                        className={`setting-item no-border member-item ${member.UserId !== (auth?.id || auth?.userId) ? 'clickable-member' : ''}`}
                        onClick={(e) => onMemberClick(e, member)}
                        onContextMenu={(e) => onMemberClick(e, member)}
                        onMouseEnter={() => setHoveredMemberId(member.UserId)}
                        onMouseLeave={() => setHoveredMemberId(null)}
                        style={{ cursor: isCurrentUserAdmin && member.UserId !== (auth?.id || auth?.userId) ? 'pointer' : 'default' }}
                    >
                        <div className="setting-left">
                            <Avatar
                                {...getWhatsAppAvatarConfig(member.Name || 'User', 42)}
                                src={member.ProfileImageUrl}
                            />
                            <div className="text-stack" style={{ flex: 1 }}>
                                <div className="member-name-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                                    <span className="member-name">{member.Name || 'User'}</span>
                                    {member.IsAdmin && (
                                        <div className="admin-badge">
                                            Group Admin
                                        </div>
                                    )}
                                </div>
                                <div className="member-id-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                                    <Typography variant="caption" className="sub-text">
                                        {member.DisplayEmail ?? ''}
                                    </Typography>
                                    {isCurrentUserAdmin && member.UserId !== (auth?.id || auth?.userId) && (
                                        <ChevronDown
                                            size={18}
                                            className={`member-chevron ${hoveredMemberId === member.UserId ? 'visible' : ''}`}
                                            style={{ color: '#667781', opacity: hoveredMemberId === member.UserId ? 1 : 0, transition: 'opacity 0.2s' }}
                                        />
                                    )}
                                </div>
                                {member.About && (
                                    <Typography variant="caption" className="sub-text">
                                        {member.About}
                                    </Typography>
                                )}
                            </div>
                        </div>
                        <div className="member-right-actions">
                        </div>
                    </div>
                ))}

                {hasMoreMembers && (
                    <div className="setting-item no-border view-all-btn" onClick={() => setShowAllMembers(!showAllMembers)}>
                        <div className="setting-left" style={{ justifyContent: 'center' }}>
                            <Typography sx={{ color: 'primary.main', fontSize: '14px', fontWeight: 500 }}>
                                {showAllMembers ? 'Show less' : `View ${members.length - 10} more`}
                            </Typography>
                        </div>
                    </div>
                )}

                <div className="setting-item no-border member-item add-member-row" onClick={onPastParticipantsClick} style={{ marginTop: '5px' }}>
                    <div className="setting-left">
                        <div className="action-circle-small" style={{ backgroundColor: '#f0f2f5', color: '#54656f' }}>
                            <Clock size={20} />
                        </div>
                        <span className="member-name action-text" style={{ color: '#54656f' }}>Past participants</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GroupMembersSection;
