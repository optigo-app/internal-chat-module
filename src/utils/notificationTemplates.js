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

    showBrowserNotification({
        ...notificationOptions,
        data: {
            ...data,           // original payload
            type: templateId,  // now part of data
            group: typeGroup   // now part of data
        },
    });
};
