import React, { createContext, useContext, useState, useCallback } from 'react';

const RemoveInGroupContext = createContext();

export const useRemoveInGroup = () => {
    const context = useContext(RemoveInGroupContext);
    if (!context) {
        throw new Error('useRemoveInGroup must be used within a RemoveInGroupProvider');
    }
    return context;
};

export const RemoveInGroupProvider = ({ children }) => {
    // State to track removed status for conversations
    // Format: { conversationId: { isRemoved: boolean } }
    const [removeInGroupState, setRemoveInGroupState] = useState({});

    const updateRemoveInGroupStatus = useCallback((conversationId, isRemoved) => {
        setRemoveInGroupState(prev => ({
            ...prev,
            [conversationId]: {
                isRemoved: isRemoved === 1 || isRemoved === true
            }
        }));
    }, []);

    const isRemovedFromGroup = useCallback((conversationId) => {
        return removeInGroupState[conversationId]?.isRemoved; // Returns undefined if not found
    }, [removeInGroupState]);

    const clearRemoveInGroupStatus = useCallback((conversationId) => {
        setRemoveInGroupState(prev => {
            const newState = { ...prev };
            delete newState[conversationId];
            return newState;
        });
    }, []);

    const value = {
        removeInGroupState,
        updateRemoveInGroupStatus,
        isRemovedFromGroup,
        clearRemoveInGroupStatus
    };

    return (
        <RemoveInGroupContext.Provider value={value}>
            {children}
        </RemoveInGroupContext.Provider>
    );
};