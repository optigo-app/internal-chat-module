import { CommonAPI } from "../InitialApi/CommonApi";

export const deleteAssignedTags = async (CustomerId, TagId, userId) => {
    try {
        const body = {
            "con": `{\"id\":\"\",\"mode\":\"wa_delete_user_tags\",\"appuserid\":\"${userId}\"}`,
            "p": `{\"CustomerId\":${CustomerId}, \"TagId\":${TagId} }`,
            "f": "WhatsApp Chat ( Delete Tags )"
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