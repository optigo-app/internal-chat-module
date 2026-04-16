import { fetchGroupDetails } from '../API/Groups/FetchGroupDetails';

/**
 * Get all member IDs for a group
 * @param {number} conversationId - Group conversation ID
 * @param {object} auth - Auth object
 * @returns {Promise<number[]>} Array of member user IDs
 */
export const getGroupMemberIds = async (conversationId, auth) => {
    try {
        const groupData = await fetchGroupDetails(conversationId, auth);
        if (groupData && groupData.members) {
            return groupData.members.map(m => m.UserId);
        }
        return [];
    } catch (error) {
        console.error('Error fetching group members:', error);
        return [];
    }
};

/**
 * Format group read receipt display
 * @param {object} message - Message object
 * @param {array} groupMembers - Array of group members
 * @returns {object} Formatted read receipt info
 */
export const formatGroupReadReceipt = (message, groupMembers) => {
    if (!message.ReadBy) return { icon: '✓', count: 0, text: 'Sent' };

    const readCount = Array.isArray(message.ReadBy)
        ? message.ReadBy.length
        : 0;

    const totalMembers = groupMembers.length - 1; // Exclude sender

    if (readCount === 0) return { icon: '✓', count: 0, text: 'Sent' };
    if (readCount === totalMembers) return {
        icon: '✓✓',
        count: readCount,
        text: 'Read by all',
        color: '#53bdeb'
    };

    return {
        icon: '✓✓',
        count: readCount,
        text: `Read by ${readCount}`,
        color: '#53bdeb'
    };
};

/**
 * Check if current user can send messages in group
 * @param {object} groupPermissions - Group permissions object
 * @param {boolean} isAdmin - Whether user is admin
 * @returns {boolean} Can send messages
 */
export const canSendMessageInGroup = (groupPermissions, isAdmin) => {
    if (isAdmin) return true;
    return groupPermissions?.sendMessages === 1;
};

/**
 * Check if current user can edit group info
 * @param {object} groupPermissions - Group permissions object
 * @param {boolean} isAdmin - Whether user is admin
 * @returns {boolean} Can edit group info
 */
export const canEditGroupInfo = (groupPermissions, isAdmin) => {
    if (isAdmin) return true;
    return groupPermissions?.editGroupInfo === 1;
};

/**
 * Check if current user can add members
 * @param {object} groupPermissions - Group permissions object
 * @param {boolean} isAdmin - Whether user is admin
 * @returns {boolean} Can add members
 */
export const canAddMembers = (groupPermissions, isAdmin) => {
    if (isAdmin) return true;
    return groupPermissions?.addMembers === 1;
};

/**
 * Format group notification message
 * @param {string} eventType - Type of event
 * @param {object} data - Event data
 * @returns {string} Formatted notification message
 */
export const formatGroupNotification = (eventType, data) => {
    switch (eventType) {
        case 'group_created':
            return `${data.createdBy?.name || 'Someone'} created the group`;

        case 'group_updated':
            if (data.changes?.groupName) {
                return `${data.updatedBy?.name || 'Someone'} changed the group name`;
            }
            if (data.changes?.groupDesc) {
                return `${data.updatedBy?.name || 'Someone'} changed the group description`;
            }
            if (data.changes?.groupProfile) {
                return `${data.updatedBy?.name || 'Someone'} changed the group photo`;
            }
            return `${data.updatedBy?.name || 'Someone'} updated the group`;

        case 'member_added':
            const addedNames = data.newMembers?.map(m => m.name).join(', ') || 'Someone';
            return `${data.addedBy?.name || 'Someone'} added ${addedNames}`;

        case 'member_removed':
            if (data.reason === 'left') {
                return `${data.removedMember?.name || 'Someone'} left the group`;
            }
            return `${data.removedBy?.name || 'Someone'} removed ${data.removedMember?.name || 'someone'}`;

        case 'member_promoted':
            return `${data.changedBy?.name || 'Someone'} promoted ${data.targetMember?.name || 'someone'} to admin`;

        case 'member_demoted':
            return `${data.changedBy?.name || 'Someone'} removed ${data.targetMember?.name || 'someone'} as admin`;

        case 'permission_changed':
            return `${data.changedBy?.name || 'Someone'} changed group permissions`;

        default:
            return 'Group updated';
    }
};

/**
 * Get notification priority
 * @param {string} eventType - Type of event
 * @returns {number} Priority level (1=highest, 5=lowest)
 */
export const getNotificationPriority = (eventType) => {
    const priorities = {
        'member_removed': 1,      // Critical
        'group_deleted': 1,       // Critical
        'member_added': 2,        // High
        'member_promoted': 2,     // High
        'member_demoted': 3,      // Medium
        'permission_changed': 3,  // Medium
        'group_updated': 4,       // Low
        'group_created': 4        // Low
    };

    return priorities[eventType] || 5;
};

/**
 * Group notifications by time window (5 seconds)
 * @param {array} notifications - Array of notifications
 * @returns {array} Grouped notifications
 */
export const groupNotifications = (notifications) => {
    if (!notifications || notifications.length === 0) return [];

    const grouped = [];
    const timeWindow = 5000; // 5 seconds

    notifications.forEach(notification => {
        const lastGroup = grouped[grouped.length - 1];

        if (lastGroup &&
            lastGroup.type === notification.type &&
            lastGroup.conversationId === notification.conversationId &&
            (notification.timestamp - lastGroup.timestamp) < timeWindow) {
            // Add to existing group
            lastGroup.notifications.push(notification);
        } else {
            // Create new group
            grouped.push({
                type: notification.type,
                conversationId: notification.conversationId,
                timestamp: notification.timestamp,
                notifications: [notification]
            });
        }
    });

    return grouped;
};

/**
 * Build group message payload for socket
 * @param {object} params - Message parameters
 * @returns {object} Socket payload
 */
export const buildGroupMessagePayload = (params) => {
    const {
        auth,
        conversationId,
        receiverIds, // Array of member IDs for groups
        message,
        messageType = 1,
        replyTo = 0,
        attachments = null,
        direction = 1,
        messageId = null,
        isEdited = 0,
        dateTime,
    } = params;

    const messageText = typeof message === 'string' ? message : (message?.Message || message?.message || "");
    const finalMessageId = messageId || message?.MessageId || message?.Id || message?.id || null;
    const finalIsEdited = isEdited || message?.IsEdited || 0;

    return {
        ufcc: auth?.ufcc,
        SenderId: auth?.id || auth?.userId,
        ReceiverId: receiverIds, // Array for groups
        ConversationId: conversationId,
        Message: messageText,
        MessageType: messageType,
        Direction: direction,
        IsGroup: 1,
        SenderName: auth?.username || auth?.name,
        RecieverName: auth?.username || auth?.name, // From user's example
        SenderEmail: auth?.email,
        FirstName: auth?.firstName,
        LastName: auth?.lastName,
        SenderProfilePicture: auth?.ProfileImageUrl || auth?.profilePicture || auth?.profileImage || '',
        ProfileImageUrl: auth?.ProfileImageUrl || auth?.profileImage || auth?.AvatarUrl || '',
        ProfileImage: auth?.ProfileImage || auth?.profileImage || auth?.AvatarUrl || '',
        ReplyTo: replyTo,
        IsEdited: finalIsEdited,
        MessageId: finalMessageId,
        Attachments: attachments,
        SentAt: message?.SentAt || new Date().toISOString(),
        DateTime: dateTime ?? new Date().toISOString()
    };
};

/** 
 * Build group reaction payload for socket
 * @param {object} params - Reaction parameters
 * @returns {object} Socket payload
 */
export const buildGroupReactionPayload = (params) => {
    const {
        auth,
        conversationId,
        receiverIds, // Array of member IDs for groups
        messageId,
        emoji,
        unified,
        direction = 0
    } = params;

    return {
        ufcc: auth?.ufcc,
        SenderId: auth?.id || auth?.userId,
        ReceiverId: receiverIds, // Array for groups
        ConversationId: conversationId,
        MessageId: messageId,
        IsGroup: 1,
        ReactionEmojis: JSON.stringify([{
            Reaction: emoji,
            Unified: unified,
            Direction: direction,
            UserId: auth?.id || auth?.userId,
            UserName: auth?.username || auth?.name,
            FirstName: auth?.firstName,
            LastName: auth?.lastName,
            ReactedAt: new Date().toISOString()
        }])
    };
};
