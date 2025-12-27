import { savePlayerId } from '../API/SavePlayerId/SavePlayerId';

/**
 * Register the new socket ID with the backend after connection
 * @param {string} socketId - The new socket ID
 * @param {string} userId - The user ID
 * @returns {Promise} API response
 */
export const registerSocketId = async (socketId, userId, id) => {
    try {
        console.log('📤 Registering new socket ID with backend:', { socketId, userId });

        const response = await savePlayerId(socketId, userId, id);

        if (response) {
            console.log('✅ Socket ID registered successfully:', response);
            return response;
        } else {
            console.warn('⚠️ Socket ID registration returned empty response');
            return null;
        }
    } catch (error) {
        console.error('❌ Failed to register socket ID:', error);
        throw error;
    }
};

/**
 * Alternative socket registration function (if you have a different API endpoint)
 * @param {string} socketId - The new socket ID
 * @param {string} userId - The user ID
 * @returns {Promise} API response
 */
export const updateUserSocketId = async (socketId, userId) => {
    try {
        console.log('📤 Updating user socket ID:', { socketId, userId });

        // If you have a specific API for socket ID updates, use it here
        // const response = await fetch('/api/user/socket-id', {
        //     method: 'POST',
        //     headers: {
        //         'Content-Type': 'application/json',
        //     },
        //     body: JSON.stringify({ socketId, userId })
        // });

        // For now, use the savePlayerId API as fallback
        return await registerSocketId(socketId, userId);

    } catch (error) {
        console.error('❌ Failed to update user socket ID:', error);
        throw error;
    }
};