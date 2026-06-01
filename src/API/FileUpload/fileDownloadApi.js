import axios from 'axios';
import { getHeaders, DOWNLOAD_FILE_URL } from '../InitialApi/Config';

export const downloadFileApi = async ({ fileUrl, fileName }) => {
    const data = {
        fileUrl,
        fileName,
    };

    try {
        const response = await axios.post(DOWNLOAD_FILE_URL, data, {
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                ...getHeaders(),
            },
            maxBodyLength: Infinity,
        });

        return response;
    } catch (error) {
        console.error('File download failed:', error);
        throw error;
    }
};