import React, { createContext, useContext, useEffect, useState } from "react";
import { showToast } from "../utils/toastHelper";

const NotificationContext = createContext();

const LOGO_ICON = "/src/assets/logo.png";

export const NotificationProvider = ({ children }) => {
    const [enabledOpen, setEnabledOpen] = useState(false);

    useEffect(() => {
        if (typeof window === "undefined" || !("Notification" in window)) return;

        if (Notification.permission === "granted") {
            setEnabledOpen(true);
        } else if (Notification.permission === "default") {
            // WhatsApp Web behavior: Prompt for native permission shortly after load
            // This ensures the native browser prompt is shown directly without custom UI masking it
            const t = setTimeout(() => {
                Notification.requestPermission().then(status => {
                    if (status === "granted") setEnabledOpen(true);
                });
            }, 2000);
            return () => clearTimeout(t);
        }
    }, []);

    const requestPermission = async () => {
        if (typeof window === "undefined" || !("Notification" in window)) return;

        try {
            const status = await Notification.requestPermission();

            if (status === "granted") {
                setEnabledOpen(true);
                showToast("Notifications enabled!", "success");

                // Test notification
                new Notification("Notifications enabled!", {
                    body: "You'll receive real-time updates.",
                    icon: LOGO_ICON
                });
            } else if (status === "denied") {
                showToast("Notifications blocked. You can enable them in your browser settings if you wish to see desktop alerts.", "warning");
            }
        } catch (error) {
            console.error("Error requesting notification permission:", error);
        }
    };

    return (
        <NotificationContext.Provider
            value={{
                enabledOpen,
                setEnabledOpen,
                requestPermission,
            }}
        >
            {children}
        </NotificationContext.Provider>
    );
};

export const useNotificationManager = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error("useNotificationManager must be used within a NotificationProvider");
    }
    return context;
};
