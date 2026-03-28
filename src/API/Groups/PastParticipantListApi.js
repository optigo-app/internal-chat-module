import { CommonAPI, buildCommonBody } from "../InitialApi/CommonApi";

/**
 * Fetches the list of past participants for a given group conversation.
 * 
 * @param {Object} auth - Authentication object.
 * @param {Object} params - Parameters for the API.
 * @param {number|string} params.conversationId - The ID of the conversation.
 * @returns {Promise<Object|null>} The API response.
 */
export const PastParticipantListApi = async (auth, { conversationId }) => {
    try {
        const payload = {
            UserId: Number(auth?.id ?? auth?.userId),
            ConversationId: Number(conversationId)
        };

        const body = buildCommonBody("PastParticipantList", auth, payload, "List ( Past Participant List )");
        const response = await CommonAPI(body);

        return response;
    } catch (error) {
        console.error('Error in PastParticipantListApi:', error);
        return null;
    }
};
