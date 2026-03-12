import { io } from 'socket.io-client';

const isLocal = ["localhost", "nzen", 'tecochat.web', 'web'].includes(window.location.hostname);

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

        if (permanent) {
            sessionStorage.removeItem('socketState');
        }
    } else {
        if (permanent) {
            sessionStorage.removeItem('socketState');
        }
    }
};
