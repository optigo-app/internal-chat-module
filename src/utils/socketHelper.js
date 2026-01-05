import { emitInternalStoreSocketData } from '../socket';

export const registerSocketId = async (data) => {
    try {
        const response = emitInternalStoreSocketData(data);

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
