import { CommonAPI } from "../InitialApi/CommonApi";

export const DataSync = async (userId) => {
    try {
        const body = {
            "con": `{\"id\":\"\",\"mode\":\"wa_chat_data_sync\",\"appuserid\":\"${userId}\"}`,
            "p": "",
            "f": "Whatsapp ( Data synce )"
        }

        const response = await CommonAPI(body);
        if (response?.Data) {
            return response?.Data;
        } else {
            return null;
        }
    } catch (error) {
        console.error('Error:', error);
        return null;
    }
};