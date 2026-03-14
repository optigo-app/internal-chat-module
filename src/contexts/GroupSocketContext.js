import React, { createContext, useContext, useEffect, useRef, useCallback } from 'react';
import {
    addGroupEventHandler,
    addGroupMemberHandler,
    addGroupPermissionHandler
} from '../socket';

const GroupSocketContext = createContext();

export const useGroupSocket = () => {
    const context = useContext(GroupSocketContext);
    if (!context) {
        throw new Error('useGroupSocket must be used within a GroupSocketProvider');
    }
    return context;
};

export const GroupSocketProvider = ({ children }) => {
    // Use refs to store listeners without causing re-renders
    const listenersRef = useRef({
        groupEvent: new Map(),
        memberEvent: new Map(),
        permissionEvent: new Map()
    });

    // Handle group events (created, updated, deleted, info_request)
    const handleGroupEvent = useCallback((data) => {
        if (!data || !data.conversationId) return;

        const { conversationId } = data;
        
        // Call all registered listeners for this conversation
        const listener = listenersRef.current.groupEvent.get(conversationId);
        if (listener) {
            try {
                listener(data);
            } catch (error) {
                console.error('Error in group event listener:', error);
            }
        }
    }, []);

    // Handle member events (added, removed, promoted, demoted)
    const handleMemberEvent = useCallback((data) => {
        if (!data || !data.conversationId) return;

        const { conversationId } = data;
        
        // Call all registered listeners for this conversation
        const listener = listenersRef.current.memberEvent.get(conversationId);
        if (listener) {
            try {
                listener(data);
            } catch (error) {
                console.error('Error in member event listener:', error);
            }
        }
    }, []);

    // Handle permission events
    const handlePermissionEvent = useCallback((data) => {
        if (!data || !data.conversationId) return;

        const { conversationId } = data;
        
        // Call all registered listeners for this conversation
        const listener = listenersRef.current.permissionEvent.get(conversationId);
        if (listener) {
            try {
                listener(data);
            } catch (error) {
                console.error('Error in permission event listener:', error);
            }
        }
    }, []);

    // Register socket listeners on mount
    useEffect(() => {
        const cleanup1 = addGroupEventHandler(handleGroupEvent);
        const cleanup2 = addGroupMemberHandler(handleMemberEvent);
        const cleanup3 = addGroupPermissionHandler(handlePermissionEvent);

        return () => {
            if (cleanup1) cleanup1();
            if (cleanup2) cleanup2();
            if (cleanup3) cleanup3();
        };
    }, [handleGroupEvent, handleMemberEvent, handlePermissionEvent]);

    // Register a listener for a specific conversation
    const registerListener = useCallback((conversationId, callbacks) => {
        if (callbacks.onGroupEvent) {
            listenersRef.current.groupEvent.set(conversationId, callbacks.onGroupEvent);
        }
        if (callbacks.onMemberEvent) {
            listenersRef.current.memberEvent.set(conversationId, callbacks.onMemberEvent);
        }
        if (callbacks.onPermissionEvent) {
            listenersRef.current.permissionEvent.set(conversationId, callbacks.onPermissionEvent);
        }
    }, []);

    // Unregister a listener for a specific conversation
    const unregisterListener = useCallback((conversationId) => {
        listenersRef.current.groupEvent.delete(conversationId);
        listenersRef.current.memberEvent.delete(conversationId);
        listenersRef.current.permissionEvent.delete(conversationId);
    }, []);

    const value = {
        registerListener,
        unregisterListener
    };

    return (
        <GroupSocketContext.Provider value={value}>
            {children}
        </GroupSocketContext.Provider>
    );
};
