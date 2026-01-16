import { showToast } from "./toastHelper";
import { playNotificationSound } from "./sound";

/**
 * Show a browser notification or fallback to in-app toast
 */
export const showBrowserNotification = async ({
    title,
    body,
    icon = "/ic_stat_o.png",
    badge = "/ic_stat_o.png",
    data,
    tag,
}) => {
    // If not in a browser environment or Notification API not supported
    if (typeof window === "undefined" || !("Notification" in window)) {
        playNotificationSound();
        showToast(body, "info", { title, data });
        return;
    }

    const isFocused = typeof document !== "undefined" && document.hasFocus();

    // If permission not granted, we can't show browser alerts
    // (Permission is handled by NotificationContext on load)
    if (Notification.permission !== "granted") {
        playNotificationSound();
        return;
    }

    const options = {
        body,
        icon,
        badge,
        data,
        tag: tag || `msg-${data?.conversationId || data?.ConversationId}`,
        vibrate: [200, 100, 200],
        requireInteraction: false, // WhatsApp notifications usually disappear after a few seconds
        renotify: true, // Pulse/sound again if a new message comes in for the same conversation
        silent: false, // browser will use system default sound if true, but we play our own
    };

    // WhatsApp Web behavior: Only show browser notifications if tab is hidden or user is in a different chat.
    // We don't show in-app toasts for messages.
    if (!isFocused) {
        playNotificationSound();

        // Use Service Worker if available
        if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
            const reg = await navigator.serviceWorker.ready;
            reg.showNotification(title, options);
        } else {
            // Fallback to standard Browser Notification
            const notification = new Notification(title, options);
            notification.onclick = (e) => {
                e.preventDefault();
                window.focus();
                const conversationId = data?.conversationId || data?.ConversationId;
                if (conversationId) {
                    window.dispatchEvent(new CustomEvent('SELECT_CONVERSATION', {
                        detail: { conversationId }
                    }));
                }
                notification.close();
            };
        }
    } else {
        // If focused, we still play the sound if the chat is not open
        // (This is handled by the calling logic in CustomerLists.js)
        playNotificationSound();
    }
};
