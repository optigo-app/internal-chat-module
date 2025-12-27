import { CommonAPI } from "../InitialApi/CommonApi";

export const addConversation = async (userPhone, userId = 1) => {
    try {
        const body = {
            "con": "{\"id\":\"\",\"mode\":\"wa_add_conv\",\"appuserid\":\"admin@hs.com\"}",
            "p": `{\"UserPhone\": \"${userPhone}\",\"UserId\": \"${userId}\"}`,
            "f": "Chat ( Add Conversation )"
        };

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