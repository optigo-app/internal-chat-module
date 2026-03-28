import { CommonAPI, buildCommonBody } from "../InitialApi/CommonApi";

/**
 * Fetches the list of groups in common with a given user context.
 * 
 * @param {Object} auth - Authentication object containing id/userId and token.
 * @param {Object} params - Parameters for the API.
 * @param {number|string} params.conversationId - The active conversation ID for context.
 * @returns {Promise<Object|null>} The API response.
 */
export const CommonGroupListApi = async (auth, { userId, conversationId }) => {
    try {
        const payload = {
            UserId: Number(userId) ?? '',
            ConversationId: Number(conversationId) ?? ''
        };

        const body = buildCommonBody("CommonGroupList", auth, payload, "List ( Common Group List )");
        const response = await CommonAPI(body);

        return response;
    } catch (error) {
        console.error('Error in CommonGroupListApi:', error);
        return null;
    }
};
