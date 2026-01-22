import React, { createContext, useContext, useEffect, useState } from "react";
import { showToast } from "../utils/toastHelper";
import LOGO_ICON from "../assets/logoB.png";

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
    const [enabledOpen, setEnabledOpen] = useState(false);
    const [showGuide, setShowGuide] = useState(false);
    const [permissionStatus, setPermissionStatus] = useState(
        typeof window !== "undefined" ? Notification.permission : "default"
    );

    useEffect(() => {
        if (typeof window === "undefined" || !("Notification" in window)) return;

        if (Notification.permission === "granted") {
            setEnabledOpen(true);
        }
        setPermissionStatus(Notification.permission);
    }, []);

    const requestPermission = async () => {
        if (typeof window === "undefined" || !("Notification" in window)) return;

        if (Notification.permission === 'default') {
            setShowGuide(true);
        } else {
            // If already blocked or granted, don't show guide, just try to request (browser will handle)
            executeNativeRequest();
        }
    };

    const executeNativeRequest = async () => {
        try {
            const status = await Notification.requestPermission();
            setPermissionStatus(status);
            setShowGuide(false);

            if (status === "granted") {
                setEnabledOpen(true);
                showToast("Notifications enabled!", "success");

                new Notification("Notifications enabled!", {
                    body: "You'll receive real-time updates.",
                    icon: LOGO_ICON
                });
            } else if (status === "denied") {
                showToast("Notifications blocked. You can enable them in your browser settings if you wish to see desktop alerts.", "warning");
            }
        } catch (error) {
            console.error("Error requesting notification permission:", error);
            setShowGuide(false);
        }
    };

    return (
        <NotificationContext.Provider
            value={{
                enabledOpen,
                permissionStatus,
                showGuide,
                setEnabledOpen,
                setShowGuide,
                requestPermission,
                executeNativeRequest,
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
