import { CommonAPI, buildCommonBody } from "../InitialApi/CommonApi";

/**
 * API to remove a member from a group.
 * 
 * @param {Object} auth - Authentication object.
 * @param {Object} params - Parameters for the API.
 * @param {number} params.conversationId - The ID of the conversation (group).
 * @param {number} params.memberId - The ID of the member to be removed.
 * @returns {Promise<Object|null>} The API response.
 */
export const removeMemberApi = async (auth, { conversationId, memberId }) => {
    try {
        const payload = {
            UserId: Number(auth?.id ?? auth?.userId),
            MemberId: Number(memberId),
            ConversationId: Number(conversationId)
        };

        const body = buildCommonBody("RemoveMembers", auth, payload, "Group ( RemoveMembers )");
        const response = await CommonAPI(body);

        return response;
    } catch (error) {
        console.error('Error in removeMemberApi:', error);
        return null;
    }
};
