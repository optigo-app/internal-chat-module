import { MediaApi } from "../InitialApi/MediaApi";

export const GetMediaFile = async (fileId) => {
    try {
        const response = await MediaApi(fileId);
        if (response?.Data) {
            return response?.Data;
        } else {
            return null;
        }
    } catch (error) {
        console.error('Error:', error);
        return null;
    }
}
