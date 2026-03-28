import React, { useEffect, useState } from 'react';
import { Typography, Box, Skeleton, Avatar } from '@mui/material';
import { getWhatsAppAvatarConfig } from '../../utils/globalFunc';
import { CommonGroupListApi } from '../../API/Groups/CommonGroupListApi';

const CommonGroupsSection = ({ customer, auth, open }) => {
    const [loading, setLoading] = useState(true);
    const [groups, setGroups] = useState([]);

    useEffect(() => {
        const fetchCommonGroups = async () => {
            if (!open || !customer?.ConversationId) return;
            setLoading(true);
            try {
                const response = await CommonGroupListApi(auth, { userId: (customer.ReceiverId || customer.id), conversationId: customer.ConversationId });
                if (response?.Status === "200" || response?.success) {
                    const fetchedGroups = response?.Data?.rd || response?.rd || [];
                    setGroups(fetchedGroups);
                } else {
                    setGroups([]);
                }
            } catch (error) {
                console.error('Error fetching common groups:', error);
                setGroups([]);
            } finally {
                setLoading(false);
            }
        };

        fetchCommonGroups();
    }, [customer?.ConversationId, customer?.ReceiverId, customer?.UserId, customer?.id, auth, open]);

    const handleGroupClick = (group) => {
        window.dispatchEvent(new CustomEvent('SELECT_CONVERSATION', {
            detail: { conversationId: group.ConversationId }
        }));
    };

    const renderMembersPreview = (membersStr) => {
        if (!membersStr) return 'No members';
        try {
            const membersList = JSON.parse(membersStr);
            const names = membersList.map(m => {
                const id = m.UserId || m.Id || m.id;
                const authId = auth?.id || auth?.userId;
                return Number(id) === Number(authId) ? 'You' : (m.UserName || m.MemberName || 'User');
            });
            // If the current user ("You") isn't explicitly identified as the first,
            // push "You" to the front if it exists.
            const youIndex = names.findIndex(n => n === 'You');
            if (youIndex > 0) {
                names.splice(youIndex, 1);
                names.unshift('You');
            }
            return names.join(', ');
        } catch (e) {
            console.error('Error parsing CommonGroups members:', e);
            return 'Unknown members';
        }
    };

    if (loading) {
        return (
            <div className="info-block contact-info-block" style={{ marginTop: '8px', borderTop: 'none', borderBottom: 'none' }}>
                <Typography sx={{ color: '#667781', fontSize: '14px', fontWeight: 500, mb: 1, pl: 0 }}>
                    Groups in common
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, p: 1.5, ml: -1.5, mr: -1.5 }}>
                    {[1, 2, 3].map((i) => (
                        <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Skeleton variant="circular" width={48} height={48} sx={{ bgcolor: '#e0e0e0' }} />
                            <Box sx={{ flex: 1 }}>
                                <Skeleton variant="text" width={120} height={20} sx={{ bgcolor: '#e0e0e0' }} />
                                <Skeleton variant="text" width={80} height={16} sx={{ bgcolor: '#e0e0e0' }} />
                            </Box>
                        </Box>
                    ))}
                </Box>
            </div>
        );
    }

    if (!groups || groups.length === 0) {
        return null;
    }

    return (
        <div className="info-block contact-info-block" style={{ marginTop: '8px', borderTop: 'none', borderBottom: 'none' }}>
            <Typography sx={{ color: '#667781', fontSize: '14px', fontWeight: 500, mb: 1, pl: 0 }}>
                {groups.length} group{groups.length !== 1 ? 's' : ''} in common
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {groups.map((group) => (
                    <Box
                        key={group.ConversationId}
                        onClick={() => handleGroupClick(group)}
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 2,
                            p: 1.5,
                            ml: -1.5,
                            mr: -1.5,
                            cursor: 'pointer',
                            borderRadius: '8px',
                            '&:hover': {
                                backgroundColor: '#f0f2f5'
                            }
                        }}
                    >
                        <Avatar
                            {...getWhatsAppAvatarConfig(group.Name || 'Group', 48)}
                            src={group.ProfileUrl}
                        />
                        <Box sx={{ flex: 1, overflow: 'hidden' }}>
                            <Typography sx={{
                                fontSize: '16px',
                                color: '#111b21',
                                fontWeight: 400,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                            }}>
                                {group.Name || 'Unnamed Group'}
                            </Typography>
                            <Typography sx={{
                                fontSize: '14px',
                                color: '#667781',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                mt: 0.2
                            }}>
                                {renderMembersPreview(group.Members)}
                            </Typography>
                        </Box>
                    </Box>
                ))}
            </Box>
        </div>
    );
};

export default CommonGroupsSection;
