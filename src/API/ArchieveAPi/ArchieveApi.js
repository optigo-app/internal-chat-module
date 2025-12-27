import { CommonAPI } from "../InitialApi/CommonApi";

export const archieveApi = async (ConversationId, UserId, email) => {
    try {
        const body = {
            "con": `{\"id\":\"\",\"mode\":\"wa_bind_user_conv\",\"appuserid\":\"${email}\"}`,
            "p": `{\"ConversationId\": ${ConversationId},\"UserId\": ${UserId}, \"UserBindConvField\": \"IsArchived\", \"UserBindConvValue\": 1}`,
            "f": "Conversation Archived ( Archived )"
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