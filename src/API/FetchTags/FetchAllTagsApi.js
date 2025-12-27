import { CommonAPI } from "../InitialApi/CommonApi";

export const fetchAllTagsApi = async (userId) => {
    try {
        const body = {
            "con": `{\"id\":\"\",\"mode\":\"wa_list_tags\",\"appuserid\":\"${userId}\"}`,
            "p": ``,
            "f": "WhatsApp Chat ( List Tags )"
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