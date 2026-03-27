import React, { createContext, useContext, useState, useCallback } from 'react';

const GroupAdminModeContext = createContext();

export const useGroupAdminMode = () => {
    const context = useContext(GroupAdminModeContext);
    if (!context) {
        throw new Error('useGroupAdminMode must be used within a GroupAdminModeProvider');
    }
    return context;
};

export const GroupAdminModeProvider = ({ children }) => {
    // State to track if ONLY admins can send messages in a group
    // Format: { conversationId: boolean }
    const [adminModeState, setAdminModeState] = useState({});

    const updateGroupAdminMode = useCallback((conversationId, isOnlyAdminSend) => {
        setAdminModeState(prev => ({
            ...prev,
            [conversationId]: isOnlyAdminSend === 1 || isOnlyAdminSend === true
        }));
    }, []);

    const isGroupOnlyAdminSend = useCallback((conversationId) => {
        return adminModeState[conversationId]; // Returns undefined if not found
    }, [adminModeState]);

    const value = {
        adminModeState,
        updateGroupAdminMode,
        isGroupOnlyAdminSend
    };

    return (
        <GroupAdminModeContext.Provider value={value}>
            {children}
        </GroupAdminModeContext.Provider>
    );
};
