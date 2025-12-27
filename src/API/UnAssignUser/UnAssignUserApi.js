import { CommonAPI } from "../InitialApi/CommonApi";

export const removeAssignUser = async (ConversationId, UserId, email) => {

    try {
        const body = {
            "con": `{\"id\":\"\",\"mode\":\"wa_assign_conv\",\"appuserid\":\"${email}\"}`,
            "p": `{\"ConversationId\": ${ConversationId},\"UserId\": ${UserId}, \"IsAssign\": 0, \"AssignBy\": 1}`,
            "f": "Assign Conversation to Agent ( Assign )"
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
};