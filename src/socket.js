import { io } from 'socket.io-client';

// Socket server configuration
const SOCKET_URLS = {
    production: 'https://nxtapi.optigoapps.com',
    development: 'http://192.168.1.71:3001', // local server
    // development: 'http://192.168.1.71:3001', // local server
    // development: 'https://apilx.optigoapps.com', // local server
};

// Pick correct URL
const getSocketURL = () => {
    const url = process.env.NODE_ENV == 'production'
        ? SOCKET_URLS.production
        : SOCKET_URLS.development;
    // console.log("🔗 getSocketURL ->", url);
    return url;
};

// Socket state
let socketInstance = null;
let isAuthenticated = false;
let messageHandlers = new Set();
let messageHandlersFromAssigningUser = new Set();
let messageReactionHandlers = new Set();
let statusHandlers = new Set();
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
    // console.log("⚡ initializeSocket called with token:", token);

    // Save the token for reconnection
    if (token) {
        sessionStorage.setItem('socketState', JSON.stringify({ token }));
    }

    // If we already have a working connection, return it
    if (socketInstance?.connected && isAuthenticated) {
        // console.log('✅ Using existing socket connection');
        return socketInstance;
    }

    // Clean up existing connection if any
    if (socketInstance) {
        // console.log('🔄 Cleaning up existing socket instance before re-init');
        socketInstance.disconnect();
        socketInstance = null;
        isAuthenticated = false;
    }

    const socketURL = getSocketURL();
    // console.log('🔄 Creating new socket instance with URL:', socketURL);

    socketInstance = io(socketURL, {
        auth: { token },
        reconnection: true,
    });

    socketInstance.on('connect', () => {
        // console.log('✅ Socket connected with ID:', socketInstance.id);
        isAuthenticated = true;
        reconnectAttempts = 0; // Reset reconnect attempts on successful connection

        // Clear any existing listeners to prevent duplicates
        // socketInstance.removeAllListeners('newMessage');
        // socketInstance.removeAllListeners('changeStatus');

        // Re-attach all message handlers
        messageHandlers.forEach(handler => {
            socketInstance.on('newMessage', handler);
        });

        // session logout
        sessionLogout.forEach(handler => {
            socketInstance.on('sessionLogout', handler);
        });

        // Re-attach all message handlers from assigning users
        messageHandlersFromAssigningUser.forEach(handler => {
            socketInstance.on('sendMessage', handler);
        });

        // Re-attach all message handlers from assigning users
        messageReactionHandlers.forEach(handler => {
            socketInstance.on('sendReaction', handler);
        });

        // Re-attach all status handlers
        statusHandlers.forEach(handler => {
            socketInstance.on('changeStatus', handler);
        });
    });

    socketInstance.on('disconnect', (reason) => {
        // console.log('🔌 Socket disconnected. Reason:', reason);
        isAuthenticated = false;
    });

    socketInstance.on('connect_error', (err) => {
        // console.error('❌ Socket connection error:', err.message);
        isAuthenticated = false;
    });

    socketInstance.on('reconnect', (attemptNumber) => {
        // console.log(`🔄 Socket reconnected after ${attemptNumber} attempts`);
        isAuthenticated = true;
    });

    socketInstance.on('reconnect_attempt', (attemptNumber) => {
        // console.log(`⏳ Socket reconnection attempt: ${attemptNumber}`);
    });

    // Remove existing event listeners to prevent duplicates
    // socketInstance.removeAllListeners('newMessage');
    // socketInstance.removeAllListeners('changeStatus');

    // Handle new messages
    socketInstance.on('newMessage', (data) => {
        // console.log('📩 newMessage event received:', data);
        messageHandlers.forEach(handler => {
            try {
                // console.log('➡️ Calling message handler with data:', data);
                handler(data);
            } catch (error) {
                // console.error('❌ Error in message handler:', error);
            }
        });
    });

    // session logout
    socketInstance.on('sessionLogout', (data) => {
        // console.log('📩 newMessage event received:', data);
        sessionLogout.forEach(handler => {
            try {
                // console.log('➡️ Calling message handler with data:', data);
                handler(data);
            } catch (error) {
                // console.error('❌ Error in message handler:', error);
            }
        });
    });

    // Handle new messages from assigning users
    socketInstance.on('sendMessage', (data) => {
        // console.log('📩 sendMessage event received:', data);
        messageHandlersFromAssigningUser.forEach(handler => {
            try {
                // console.log('➡️ Calling message handler from assigning user with data:', data);
                handler(data);
            } catch (error) {
                // console.error('❌ Error in message handler from assigning user:', error);
            }
        });
    });

    // Handle message reactions
    socketInstance.on('sendReaction', (data) => {
        messageReactionHandlers.forEach((handler) => {
            try {
                handler(data);
            } catch (error) {
                console.error('❌ Error in reaction handler:', error);
            }
        });
    });

    // Handle status changes
    socketInstance.on('changeStatus', (data) => {
        // console.log('🔄 changeStatus event received:', data);
        statusHandlers.forEach(handler => {
            try {
                // console.log('➡️ Calling status handler with data:', data);
                handler(data);
            } catch (error) {
                // console.error('❌ Error in status handler:', error);
            }
        });
    });

    // console.log("✅ initializeSocket completed, socket instance created");
    return socketInstance;
}

/**
 * Get the current socket instance
 */
export const getSocket = () => {
    // console.log("📡 getSocket called. Current instance:", socketInstance);
    return socketInstance;
};

/**
 * Check if socket is connected and authenticated
 */
export const isSocketConnected = () => {
    const state = socketInstance?.connected && isAuthenticated;

    // If not connected but we have a token, try to reconnect
    if (!state && !socketInstance) {
        const savedState = sessionStorage.getItem('socketState');
        if (savedState) {
            try {
                const { token } = JSON.parse(savedState);
                if (token && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
                    reconnectAttempts++;
                    // console.log(`♻️ Attempting to reconnect (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
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
    // console.log("🔑 isSocketAuthenticated ->", isAuthenticated);
    return isAuthenticated;
};

/**
 * Add a handler for new messages
 */
export const addMessageHandler = (handler) => {
    // console.log("➕ addMessageHandler called. Adding handler:", handler);
    messageHandlers.add(handler);
    return () => {
        // console.log("➖ Removing message handler:", handler);
        messageHandlers.delete(handler);
    };
};

/**
 * Add a handler for session logout
 */
export const addSessionLogoutHandler = (handler) => {
    // console.log("➕ addSessionLogoutHandler called. Adding handler:", handler);
    sessionLogout.add(handler);
    return () => {
        // console.log("➖ Removing message handler:", handler);
        sessionLogout.delete(handler);
    };
};

/**
 * Add a handler for new messages coming from assigning users
 */
export const addMessageHandlerFromAssigningUser = (handler) => {
    // console.log("➕ addMessageHandlerFromAssigningUser called. Adding handler:", handler);
    messageHandlersFromAssigningUser.add(handler);
    return () => {
        // console.log("➖ Removing message handler:", handler);
        messageHandlersFromAssigningUser.delete(handler);
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


/**
 * Add a handler for status changes
 */
export const addStatusHandler = (handler) => {
    // console.log("➕ addStatusHandler called. Adding handler:", handler);
    statusHandlers.add(handler);
    return () => {
        // console.log("➖ Removing status handler:", handler);
        statusHandlers.delete(handler);
    };
};

/**
 * Disconnect socket
 */
export const disconnectSocket = (permanent = false) => {
    // console.log("🛑 disconnectSocket called");
    if (socketInstance) {
        // console.log('🔌 Disconnecting socket...');
        socketInstance.disconnect();
        socketInstance = null;
        isAuthenticated = false;
        messageHandlers.clear();
        sessionLogout.clear();
        messageHandlersFromAssigningUser.clear();
        messageReactionHandlers.clear();
        statusHandlers.clear();

        if (permanent) {
            sessionStorage.removeItem('socketState');
            // console.log('✅ Socket permanently disconnected and cleaned up');
        } else {
            // console.log('✅ Socket disconnected but will attempt to reconnect');
        }
    } else {
        // console.log("⚠️ No socket instance found to disconnect");
        if (permanent) {
            sessionStorage.removeItem('socketState');
        }
    }
};
