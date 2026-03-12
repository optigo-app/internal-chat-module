import { CommonAPI, buildCommonBody } from "../InitialApi/CommonApi";

/**
 * API to assign or remove admin role for a group member.
 * 
 * @param {Object} auth - Authentication object.
 * @param {Object} params - Parameters for the API.
 * @param {number} params.conversationId - The ID of the conversation (group).
 * @param {number} params.memberId - The ID of the member whose role is being changed.
 * @returns {Promise<Object|null>} The API response.
 */
export const assignRoleApi = async (auth, { conversationId, memberId }) => {
    try {
        const payload = {
            UserId: Number(auth?.id ?? auth?.userId),
            ConversationId: Number(conversationId),
            MemberId: Number(memberId)
        };

        const body = buildCommonBody("AssignRole", auth, payload, "Group ( AssignRole )");
        const response = await CommonAPI(body);

        return response;
    } catch (error) {
        console.error('Error in assignRoleApi:', error);
        return null;
    }
};
