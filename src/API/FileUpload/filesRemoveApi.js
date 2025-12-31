import axios from 'axios';
import { REMOVE_FILE_URL } from '../InitialApi/Config';

export const removeFileApi = async ({ attachments }) => {
    const data = {
        imageUrl: attachments,
    };
    try {
        const response = await axios.post(REMOVE_FILE_URL, data, {
            headers: {
                'Content-Type': 'application/json',
            },
            maxBodyLength: Infinity,
        });
        return response
    } catch (error) {
        console.error('File remove failed:', error);
    }
};
