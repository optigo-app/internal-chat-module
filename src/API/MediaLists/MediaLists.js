import { CommonAPI } from "../InitialApi/CommonApi";

export const fetchMediaLists = async (page = 1, pageSize = 6, conversationId, auth, userId) => {
    try {
        const conObj = { id: "", mode: "FilesList", appuserid: auth?.userId || "" };
        const pObj = { ConversationId: conversationId };
        
        // Only include UserId if it's provided and non-zero
        if (userId) {
            pObj.UserId = userId;
        }

        const body = {
            "con": JSON.stringify(conObj),
            "p": JSON.stringify(pObj),
            "f": "Chat ( File list )"
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
