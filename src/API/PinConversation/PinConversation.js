import { CommonAPI } from "../InitialApi/CommonApi";

export const pinConversationApi = async (ConversationId, UserId, email) => {
    try {
        const body = {
            "con": `{\"id\":\"\",\"mode\":\"wa_bind_user_conv\",\"appuserid\":\"${email}\"}`,
            "p": `{\"ConversationId\": ${ConversationId},\"UserId\": ${UserId}, \"UserBindConvField\": \"IsPin\", \"UserBindConvValue\": 1}`,
            "f": "Conversation pin ( Pin )"
        }
        const response = await CommonAPI(body);
        if (response) {
            return response;
        } else {
            return null;
        }
    } catch (error) {
        console.error('Error:', error);
        return null;
    }
}