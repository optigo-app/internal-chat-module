import { CommonAPI } from "../InitialApi/CommonApi";

export const addTagsApi = async (CustomerId, TagName, userId) => {
    try {
        const body = {
            "con": `{\"id\":\"\",\"mode\":\"wa_add_tags\",\"appuserid\":\"${userId}\"}`,
            "p": `{\"CustomerId\":${CustomerId},\"TagName\":\"${TagName}\"}`,
            "f": "WhatsApp Chat ( Add Tags )"
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