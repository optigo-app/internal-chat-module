import { io } from 'socket.io-client';

const isLocal = ["localhost", "nzen", 'tecochat.web', 'web', '5svsmvp4-4000.inc1.devtunnels.ms'].includes(window.location.hostname);

// Base URLs
const API_SOCKETBASE_URL = isLocal ? "http://newnextjs.web" : "https://apilx.optigoapps.com";

// Pick correct URL
const getSocketURL = () => {
    return API_SOCKETBASE_URL;
};

// Socket state
let socketInstance = null;
let isAuthenticated = false;
let messageReactionHandlers = new Set();
let internalMessageHandlers = new Set();
let internalStatusHandlers = new Set();
let internalTypingHandlers = new Set();
let sessionLogout = new Set();
let groupEventHandlers = new Set();
let groupMemberHandlers = new Set();
let groupPermissionHandlers = new Set();
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

// Restore connection state if available
const restoreConnection = () => {
    const savedState = sessionStorage.getItem('socketState');
    if (savedState) {
        try {
            const { token } = JSON.parse(savedState);
            if (token) {
                initializeSocket(token);
            }
        } catch (e) {
            console.error('Error restoring socket state:', e);
            sessionStorage.removeItem('socketState');
        }
    }
};

// Initialize on module load
restoreConnection();

/**
 * Initialize socket connection with token
 * @param {string} token - Authentication token
 * @returns {object} Socket instance
 */
export function initializeSocket(token) {
    if (token) {
        sessionStorage.setItem('socketState', JSON.stringify({ token }));
    }
    if (socketInstance?.connected && isAuthenticated) {
        return socketInstance;
    }

    if (socketInstance) {
        socketInstance.disconnect();
        socketInstance = null;
        isAuthenticated = false;
    }

    const socketURL = getSocketURL();

    socketInstance = io(socketURL, {
        auth: { token },
        reconnection: true,
        // transports: ['websocket', 'polling']
    });

    socketInstance.on('connect', () => {
        isAuthenticated = true;
        reconnectAttempts = 0;
    });

    socketInstance.on('disconnect', (reason) => {
        isAuthenticated = false;
    });

    socketInstance.on('connect_error', (err) => {
        isAuthenticated = false;
    });

    socketInstance.on('reconnect', (attemptNumber) => {
        isAuthenticated = true;
    });

    socketInstance.on('reconnect_attempt', (attemptNumber) => {
    });

    // session logout
    socketInstance.on('sessionLogout', (data) => {
        sessionLogout.forEach(handler => {
            try {
                handler(data);
            } catch (error) {
            }
        });
    });

    // Handle message reactions
    const dispatchReactionEvent = (data) => {
        messageReactionHandlers.forEach((handler) => {
            try {
                handler(data);
            } catch (error) {
                console.error('❌ Error in reaction handler:', error);
            }
        });
    };

    socketInstance.on('internal:reaction_receive', dispatchReactionEvent);
    socketInstance.on('internal:reaction_send', dispatchReactionEvent);

    socketInstance.on('internal:msg_receive', (data) => {
        internalMessageHandlers.forEach(handler => {
            try {
                handler(data);
            } catch (error) {
            }
        });
    });

    socketInstance.on('internal:msg_read', (data) => {
        internalStatusHandlers.forEach(handler => {
            try {
                handler(data);
            } catch (error) {
            }
        });
    });

    // Group event handlers
    const dispatchGroupEvent = (data) => {
        groupEventHandlers.forEach((handler) => {
            try {
                handler(data);
            } catch (error) {
                console.error('❌ Error in group event handler:', error);
            }
        });
    };

    const dispatchGroupMemberEvent = (data) => {
        groupMemberHandlers.forEach((handler) => {
            try {
                handler(data);
            } catch (error) {
                console.error('❌ Error in group member handler:', error);
            }
        });
    };

    const dispatchGroupPermissionEvent = (data) => {
        groupPermissionHandlers.forEach((handler) => {
            try {
                handler(data);
            } catch (error) {
                console.error('❌ Error in group permission handler:', error);
            }
        });
    };

    // Register group socket listeners
    socketInstance.on('internal:group_created', dispatchGroupEvent);
    socketInstance.on('internal:group_updated', dispatchGroupEvent);
    socketInstance.on('internal:group_deleted', dispatchGroupEvent);
    socketInstance.on('internal:member_added', dispatchGroupMemberEvent);
    socketInstance.on('internal:member_removed', dispatchGroupMemberEvent);
    socketInstance.on('internal:member_promoted', dispatchGroupMemberEvent);
    socketInstance.on('internal:member_demoted', dispatchGroupMemberEvent);
    socketInstance.on('internal:permission_changed', dispatchGroupPermissionEvent);
    socketInstance.on('internal:group_info_request', dispatchGroupEvent);

    return socketInstance;
}

/**
 * Get the current socket instance
 */
export const getSocket = () => {
    return socketInstance;
};

/**
 * Check if socket is connected and authenticated
 */
export const isSocketConnected = () => {
    const state = socketInstance?.connected && isAuthenticated;
    if (!state && !socketInstance) {
        const savedState = sessionStorage.getItem('socketState');
        if (savedState) {
            try {
                const { token } = JSON.parse(savedState);
                if (token && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
                    reconnectAttempts++;
                    initializeSocket(token);
                }
            } catch (e) {
                console.error('Error during reconnection attempt:', e);
            }
        }
    }

    return state;
};

/**
 * Check if user is authenticated
 */
export const isSocketAuthenticated = () => {
    return isAuthenticated;
};

/**
 * Add a handler for session logout
 */
export const addSessionLogoutHandler = (handler) => {
    sessionLogout.add(handler);
    return () => {
        sessionLogout.delete(handler);
    };
};

/**
 * Add reaction message handler
 */
export const addMessageReactionHandler = (handler) => {
    if (typeof handler === 'function') {
        messageReactionHandlers.add(handler);
        return () => messageReactionHandlers.delete(handler);
    }
};

export const addInternalMessageHandler = (handler) => {
    internalMessageHandlers.add(handler);
    return () => {
        internalMessageHandlers.delete(handler);
    };
};

export const addInternalStatusHandler = (handler) => {
    internalStatusHandlers.add(handler);
    return () => {
        internalStatusHandlers.delete(handler);
    };
};

export const addInternalTypingHandler = (handler) => {
    internalTypingHandlers.add(handler);
    return () => {
        internalTypingHandlers.delete(handler);
    };
};

/**
 * Add group event handler (created, updated, deleted, info_request)
 */
export const addGroupEventHandler = (handler) => {
    if (typeof handler === 'function') {
        groupEventHandlers.add(handler);
        return () => groupEventHandlers.delete(handler);
    }
};

/**
 * Add group member event handler (added, removed, promoted, demoted)
 */
export const addGroupMemberHandler = (handler) => {
    if (typeof handler === 'function') {
        groupMemberHandlers.add(handler);
        return () => groupMemberHandlers.delete(handler);
    }
};

/**
 * Add group permission event handler
 */
export const addGroupPermissionHandler = (handler) => {
    if (typeof handler === 'function') {
        groupPermissionHandlers.add(handler);
        return () => groupPermissionHandlers.delete(handler);
    }
};

export const emitInternalMessageSend = (payload) => {
    if (!socketInstance) return false;
    socketInstance.emit('internal:msg_send', { ...payload, receiveEvent: "internal:msg_receive" });

    // Manually trigger local handlers for optimized update (as server might not echo back to sender)
    internalMessageHandlers.forEach(handler => {
        try {
            handler(payload);
        } catch (error) {
            console.error('Error dispatching local send event:', error);
        }
    });

    return true;
};

export const emitInternalMessageRead = (payload) => {
    if (!socketInstance) return false;
    socketInstance.emit('internal:msg_read', { ...payload, receiveEvent: "internal:msg_read" });
    return true;
};

export const emitSendReaction = (payload) => {
    if (!socketInstance) return false;
    socketInstance.emit('internal:reaction_send', { ...payload, receiveEvent: "internal:reaction_receive" });
    return true;
};

export const emitInternalStoreSocketData = (payload) => {
    if (!socketInstance) return false;
    socketInstance.emit('internal.store_sockets', payload);
    return true;
};

/**
 * Emit group created event
 */
export const emitGroupCreated = (payload) => {
    if (!socketInstance) return false;
    socketInstance.emit('internal:group_created', {
        ...payload,
        receiveEvent: 'internal:group_created'
    });
    return true;
};

/**
 * Emit group updated event
 */
export const emitGroupUpdated = (payload) => {
    if (!socketInstance) return false;
    socketInstance.emit('internal:group_updated', {
        ...payload,
        receiveEvent: 'internal:group_updated'
    });
    return true;
};

/**
 * Emit group deleted event
 */
export const emitGroupDeleted = (payload) => {
    if (!socketInstance) return false;
    socketInstance.emit('internal:group_deleted', {
        ...payload,
        receiveEvent: 'internal:group_deleted'
    });
    return true;
};

/**
 * Emit member added event
 */
export const emitMemberAdded = (payload) => {
    if (!socketInstance) return false;
    socketInstance.emit('internal:member_added', {
        ...payload,
        receiveEvent: 'internal:member_added'
    });
    return true;
};

/**
 * Emit member removed event
 */
export const emitMemberRemoved = (payload) => {
    if (!socketInstance) return false;
    socketInstance.emit('internal:member_removed', {
        ...payload,
        receiveEvent: 'internal:member_removed'
    });
    return true;
};

/**
 * Emit member promoted event
 */
export const emitMemberPromoted = (payload) => {
    if (!socketInstance) return false;
    socketInstance.emit('internal:member_promoted', {
        ...payload,
        receiveEvent: 'internal:member_promoted'
    });
    return true;
};

/**
 * Emit member demoted event
 */
export const emitMemberDemoted = (payload) => {
    if (!socketInstance) return false;
    socketInstance.emit('internal:member_demoted', {
        ...payload,
        receiveEvent: 'internal:member_demoted'
    });
    return true;
};

/**
 * Emit permission changed event
 */
export const emitPermissionChanged = (payload) => {
    if (!socketInstance) return false;
    socketInstance.emit('internal:permission_changed', {
        ...payload,
        receiveEvent: 'internal:permission_changed'
    });
    return true;
};

/**
 * Emit group info request event
 */
export const emitGroupInfoRequest = (payload) => {
    if (!socketInstance) return false;
    socketInstance.emit('internal:group_info_request', {
        ...payload,
        receiveEvent: 'internal:group_info_request'
    });
    return true;
};

/**
 * Disconnect socket
 */
export const disconnectSocket = (permanent = false) => {
    if (socketInstance) {
        socketInstance.disconnect();
        socketInstance = null;
        isAuthenticated = false;
        sessionLogout.clear();
        messageReactionHandlers.clear();
        internalMessageHandlers.clear();
        internalStatusHandlers.clear();
        internalTypingHandlers.clear();
        groupEventHandlers.clear();
        groupMemberHandlers.clear();
        groupPermissionHandlers.clear();

        if (permanent) {
            sessionStorage.removeItem('socketState');
        }
    } else {
        if (permanent) {
            sessionStorage.removeItem('socketState');
        }
    }
};
