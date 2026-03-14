import { showBrowserNotification } from "./notifications";
import LOGO_ICON from "../assets/logoB.png";

const capitalizeWords = (str) =>
    str
        ? str
            .split(" ")
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ")
        : "";

export const NOTIFICATION_TEMPLATES = {
    // New Message Notification
    NEW_MESSAGE: (data) => {
        return {
            title: `${capitalizeWords(data?.senderName || data?.CustomerName || "New Message")}`,
            body: data?.message || data?.Message || "You have a new message.",
            icon: LOGO_ICON,
            badge: LOGO_ICON,
            tag: `msg-${data?.conversationId || data?.ConversationId}`,
        };
    },

    // Message Reaction Notification
    MESSAGE_REACTION: (data) => {
        let emoji = "👍";
        try {
            const reactions = typeof data?.ReactionEmojis === 'string'
                ? JSON.parse(data.ReactionEmojis)
                : data?.ReactionEmojis;
            if (Array.isArray(reactions) && reactions.length > 0) {
                emoji = reactions[reactions.length - 1].Reaction || "👍";
            }
        } catch (e) { }

        return {
            title: `${capitalizeWords(data?.senderName || "User")} reacted to your message`,
            body: `${emoji} ${data?.messagePreview || "Reacted to your message"}`,
            icon: LOGO_ICON,
            badge: LOGO_ICON,
        };
    },

    // Assigned Conversation Notification
    CONVERSATION_ASSIGNED: (data) => ({
        title: `👤 Conversation Assigned`,
        body: `A conversation with ${capitalizeWords(data?.CustomerName || "a customer")} has been assigned to you.`,
        icon: LOGO_ICON,
        badge: LOGO_ICON,
    }),

    // Session Alerts
    SESSION_LOGOUT: () => ({
        title: `🔒 Session Logged Out`,
        body: `Your account was logged in from another device.`,
        icon: LOGO_ICON,
        badge: LOGO_ICON,
    }),

    // Group Notifications
    GROUP_CREATED: (data) => ({
        title: `👥 New Group Created`,
        body: `${capitalizeWords(data?.createdBy?.name || "Someone")} created "${data?.groupName || "a group"}"`,
        icon: LOGO_ICON,
        badge: LOGO_ICON,
        tag: `group-${data?.conversationId}`,
    }),

    GROUP_UPDATED: (data) => {
        const changes = [];
        if (data?.changes?.groupName) changes.push('name');
        if (data?.changes?.groupDesc) changes.push('description');
        if (data?.changes?.groupProfile) changes.push('photo');
        const changeText = changes.length > 0 ? changes.join(', ') : 'settings';

        return {
            title: `👥 Group Updated`,
            body: `${capitalizeWords(data?.updatedBy?.name || "Someone")} updated group ${changeText}`,
            icon: LOGO_ICON,
            badge: LOGO_ICON,
            tag: `group-${data?.conversationId}`,
        };
    },

    MEMBER_ADDED: (data) => {
        const count = data?.newMemberIds?.length || 1;
        return {
            title: `👥 Member Added`,
            body: `${capitalizeWords(data?.addedBy?.name || "Someone")} added ${count} ${count === 1 ? 'member' : 'members'} to the group`,
            icon: LOGO_ICON,
            badge: LOGO_ICON,
            tag: `group-${data?.conversationId}`,
        };
    },

    MEMBER_REMOVED: (data) => {
        const isSelfExit = data?.reason === 'left';
        const memberName = capitalizeWords(data?.removedMember?.name || "Someone");

        return {
            title: `👥 Member ${isSelfExit ? 'Left' : 'Removed'}`,
            body: isSelfExit
                ? `${memberName} left the group`
                : `${capitalizeWords(data?.removedBy?.name || "Someone")} removed ${memberName}`,
            icon: LOGO_ICON,
            badge: LOGO_ICON,
            tag: `group-${data?.conversationId}`,
        };
    },

    MEMBER_PROMOTED: (data) => ({
        title: `👑 Admin Promoted`,
        body: `${capitalizeWords(data?.targetMember?.name || "Someone")} is now a group admin`,
        icon: LOGO_ICON,
        badge: LOGO_ICON,
        tag: `group-${data?.conversationId}`,
    }),

    MEMBER_DEMOTED: (data) => ({
        title: `👤 Admin Demoted`,
        body: `${capitalizeWords(data?.targetMember?.name || "Someone")} is no longer a group admin`,
        icon: LOGO_ICON,
        badge: LOGO_ICON,
        tag: `group-${data?.conversationId}`,
    }),

    PERMISSION_CHANGED: (data) => {
        const permName = data?.changedPermission?.name || 'settings';
        const permValue = data?.changedPermission?.value ? 'enabled' : 'disabled';

        return {
            title: `⚙️ Group Permissions Updated`,
            body: `${capitalizeWords(data?.changedBy?.name || "Admin")} ${permValue} ${permName}`,
            icon: LOGO_ICON,
            badge: LOGO_ICON,
            tag: `group-${data?.conversationId}`,
        };
    },

    YOU_WERE_REMOVED: (data) => ({
        title: `❌ Removed from Group`,
        body: `You were removed from the group by ${capitalizeWords(data?.removedBy?.name || "an admin")}`,
        icon: LOGO_ICON,
        badge: LOGO_ICON,
        tag: `group-${data?.conversationId}`,
    }),
};

export const notify = (data, templateId, user) => {
    const templateFn = NOTIFICATION_TEMPLATES[templateId];
    if (!templateFn) return console.warn(`Notification template "${templateId}" not found`);

    const notificationOptions = templateFn(data, user);

    let typeGroup = "OTHER";
    if (templateId === "NEW_MESSAGE") typeGroup = "MESSAGE";
    if (templateId === "MESSAGE_REACTION") typeGroup = "REACTION";
    if (templateId === "CONVERSATION_ASSIGNED") typeGroup = "ASSIGNMENT";
    if (templateId === "SESSION_LOGOUT") typeGroup = "AUTH";
    if (templateId.startsWith("GROUP_") || templateId.startsWith("MEMBER_") || templateId.startsWith("PERMISSION_") || templateId === "YOU_WERE_REMOVED") {
        typeGroup = "GROUP";
    }

    showBrowserNotification({
        ...notificationOptions,
        data: {
            ...data,           // original payload
            type: templateId,  // now part of data
            group: typeGroup   // now part of data
        },
    });
};
