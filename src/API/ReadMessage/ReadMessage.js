import { CommonAPI } from "../InitialApi/CommonApi";

export const readMessage = async (ConversationId, userId) => {
    try {
        const body = {
            "con": `{\"id\":\"\",\"mode\":\"wa_read_chat\",\"appuserid\":\"${userId}\"}`,
            "p": `{\"ConversationId\": ${ConversationId}}`,
            "f": "Chat ( Read Message )"
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
}