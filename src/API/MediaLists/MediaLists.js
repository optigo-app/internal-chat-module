import { CommonAPI } from "../InitialApi/CommonApi";

export const fetchMediaLists = async (page = 1, pageSize = 6, conversationId, userId) => {
    try {
        const body = {
            "con": `{\"id\":\"\",\"mode\":\"wa_media_list_chat\",\"appuserid\":\"${userId}\"}`,
            "p": `{\"ConversationId\": ${conversationId},\"Page\": ${page}, \"PageSize\": ${pageSize}}`,
            "f": "Chat ( Media list )"
        }

        const response = await CommonAPI(body);
        if (response?.Data) {
            return {
                data: response?.Data?.rd || [],
                total: response?.Data?.total || response?.Data?.rd?.length || 0,
                currentPage: page,
                hasMore: response?.Data?.rd?.length === pageSize
            };
        } else {
            return {
                data: [],
                total: 0,
                currentPage: page,
                hasMore: false
            };
        }
    } catch (error) {
        console.error('Error:', error);
        return {
            data: [],
            total: 0,
            currentPage: page,
            hasMore: false
        };
    }
};