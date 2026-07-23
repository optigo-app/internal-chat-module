import React, { createContext, useContext, useEffect, useState } from "react";
import { showToast } from "../utils/toastHelper";
import LOGO_ICON from "../assets/logoB.png";

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
    const [enabledOpen, setEnabledOpen] = useState(false);
    const [showGuide, setShowGuide] = useState(false);
    const [permissionStatus, setPermissionStatus] = useState(
        (typeof window !== "undefined" && window.Notification?.permission) || "default"
    );

    useEffect(() => {
        if (typeof window === "undefined" || !("Notification" in window)) return;

        // Initial check
        setPermissionStatus(Notification.permission);
        if (Notification.permission === "granted") {
            setEnabledOpen(true);
        }

        // Listen for changes (e.g. user changes settings via browser UI)
        if (navigator.permissions && navigator.permissions.query) {
            navigator.permissions.query({ name: 'notifications' }).then((permissionStatus) => {
                permissionStatus.onchange = () => {
                    console.log("Permission changed to:", permissionStatus.state);
                    setPermissionStatus(permissionStatus.state);

                    if (permissionStatus.state === 'granted') {
                        setEnabledOpen(true);
                        setShowGuide(false); // Close modal if open
                        showToast("Notifications enabled!", "success");
                        try {
                            if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
                                new Notification("Notifications enabled!", {
                                    body: "You'll receive real-time updates.",
                                    icon: LOGO_ICON
                                });
                            }
                        } catch (e) {
                            console.warn("Browser does not support desktop notifications:", e);
                        }
                    } else if (permissionStatus.state === 'denied') {
                        setShowGuide(false); // Optionally close modal or keep basic blocked UI
                    }
                };
            }).catch(err => {
                console.error("Permission query error:", err);
            });
        }
    }, []);

    const requestPermission = async () => {
        if (typeof window === "undefined" || !("Notification" in window)) return;

        if (Notification.permission === 'default') {
            setShowGuide(true);
        } else if (Notification.permission === 'denied') {
            // New behavior: Show guide even if denied, so we can instruct them to unblock
            setShowGuide(true);
        } else {
            executeNativeRequest();
        }
    };

    const executeNativeRequest = async (fromModal = false) => {
        try {
            const status = await Notification.requestPermission();
            setPermissionStatus(status);
            if (!fromModal) setShowGuide(false); // Only close if not from modal (modal handles its own closing/state)

            if (status === "granted") {
                setEnabledOpen(true);
                setShowGuide(false);
                showToast("Notifications enabled!", "success");

                try {
                    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
                        new Notification("Notifications enabled!", {
                            body: "You'll receive real-time updates.",
                            icon: LOGO_ICON
                        });
                    }
                } catch (e) {
                    console.warn("Browser does not support desktop notifications:", e);
                }
            } else if (status === "denied") {
                // Only show toast if NOT from the modal (because modal already explains it's blocked)
                if (!fromModal) {
                    showToast("Notifications blocked. You can enable them in your browser settings if you wish to see desktop alerts.", "warning");
                }
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
