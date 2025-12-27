import { CommonAPI } from "../InitialApi/CommonApi";

export const fetchAssignLists = async (userId) => {
    try {
        const body = {
            "con": `{\"id\":\"\",\"mode\":\"wa_chat_agent_list\",\"appuserid\":\"${userId}\"}`,
            "p": "",
            "f": "Whatsapp Agent List ( List )"
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