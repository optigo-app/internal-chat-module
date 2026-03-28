import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { addGroupPermissionHandler } from '../socket';

const GroupAdminModeContext = createContext();

export const useGroupAdminMode = () => {
    const context = useContext(GroupAdminModeContext);
    if (!context) {
        throw new Error('useGroupAdminMode must be used within a GroupAdminModeProvider');
    }
    return context;
};

export const GroupAdminModeProvider = ({ children }) => {
    // State to track all group permissions
    // Format: { conversationId: { permissionName: value } }
    const [groupSettingsState, setGroupSettingsState] = useState({});

    // Unified helper to update any group setting
    const updateGroupSettings = useCallback((conversationId, settings) => {
        setGroupSettingsState(prev => ({
            ...prev,
            [conversationId]: {
                ...(prev[conversationId] || {}),
                ...settings
            }
        }));
    }, []);

    // Helper to get a specific permission
    const getGroupPermission = useCallback((conversationId, permissionName) => {
        return groupSettingsState[conversationId]?.[permissionName];
    }, [groupSettingsState]);

    // Backward compatibility: Update admin mode (who can send messages)
    const updateGroupAdminMode = useCallback((conversationId, isOnlyAdminSend) => {
        // 0 means only admins can send, 1 means everyone can send
        updateGroupSettings(conversationId, { SendNewMessage: isOnlyAdminSend ? 0 : 1 });
    }, [updateGroupSettings]);

    // Backward compatibility: Check if only admins can send
    const isGroupOnlyAdminSend = useCallback((conversationId) => {
        const sendNewMessage = getGroupPermission(conversationId, 'SendNewMessage');
        return sendNewMessage === 0;
    }, [getGroupPermission]);

    // Global Socket Listener for Permission Changes
    useEffect(() => {
        const unsubscribe = addGroupPermissionHandler((data) => {
            if (!data || !data.conversationId) return;
            const { conversationId, permissions, changedPermission } = data;
            
            if (permissions) {
                updateGroupSettings(conversationId, permissions);
            } else if (changedPermission) {
                updateGroupSettings(conversationId, { [changedPermission.name]: changedPermission.value });
            }
        });

        return () => {
            if (typeof unsubscribe === 'function') unsubscribe();
        };
    }, [updateGroupSettings]);

    const value = {
        groupSettingsState,
        updateGroupSettings,
        getGroupPermission,
        updateGroupAdminMode,
        isGroupOnlyAdminSend
    };

    return (
        <GroupAdminModeContext.Provider value={value}>
            {children}
        </GroupAdminModeContext.Provider>
    );
};
