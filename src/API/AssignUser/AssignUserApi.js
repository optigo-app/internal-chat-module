import { CommonAPI } from "../InitialApi/CommonApi";

export const addAssignUser = async (ConversationId, UserId, email) => {

    try {
        const body = {
            "con": `{\"id\":\"\",\"mode\":\"wa_assign_conv\",\"appuserid\":\"${email}\"}`,
            "p": `{\"ConversationId\": ${ConversationId},\"UserId\": ${UserId}, \"IsAssign\": 1, \"AssignBy\": 1}`,
            "f": "Assign Conversation to Agent ( Assign )"
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