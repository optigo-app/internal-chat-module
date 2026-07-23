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
    // If not in a browser environment or Notification API not supported, fall back to in-app toast
    if (typeof window === "undefined" || !("Notification" in window)) {
        playNotificationSound();
        showToast(body, "info", { title, data });
        return;
    }

    const isFocused = typeof document !== "undefined" && document.hasFocus();

    // If permission not granted, play sound but don't spam toasts (user has blocked or not decided yet)
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
        requireInteraction: false, // WhatsApp notifications usually disappear after a few seconds
        renotify: true, // Pulse/sound again if a new message comes in for the same conversation
        silent: false, // browser will use system default sound if true, but we play our own
    };

    // Vibrate is not supported on desktop or iOS; only add it where it makes sense
    if ("vibrate" in navigator) {
        options.vibrate = [200, 100, 200];
    }

    // WhatsApp Web behavior: Only show browser notifications if tab is hidden or user is in a different chat.
    if (!isFocused) {
        playNotificationSound();

        try {
            // Use Service Worker if available and supports showNotification
            if ("serviceWorker" in navigator && navigator.serviceWorker.controller && typeof ServiceWorkerRegistration !== "undefined" && "showNotification" in ServiceWorkerRegistration.prototype) {
                const reg = await navigator.serviceWorker.ready;
                if (reg && typeof reg.showNotification === "function") {
                    reg.showNotification(title, options);
                    return;
                }
            }

            // Fallback to standard Browser Notification
            if (typeof Notification === "function") {
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
            } else {
                showToast(body, "info", { title, data });
            }
        } catch (error) {
            console.warn("Browser notification failed, falling back to toast:", error);
            playNotificationSound();
            showToast(body, "info", { title, data });
        }
    } else {
        // If focused, we still play the sound if the chat is not open
        // (This is handled by the calling logic in CustomerLists.js)
        playNotificationSound();
    }
};
