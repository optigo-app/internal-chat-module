import { CommonAPI, buildCommonBody } from "../InitialApi/CommonApi";
import { emitMemberRemoved } from "../../socket";
import { getGroupMemberIds } from "../../utils/groupSocketHelpers";

/**
 * API to remove a member from a group.
 * 
 * @param {Object} auth - Authentication object.
 * @param {Object} params - Parameters for the API.
 * @param {number} params.conversationId - The ID of the conversation (group).
 * @param {number} params.memberId - The ID of the member to be removed.
 * @param {Object} [params.removedMemberData] - Optional data about the removed member.
 * @returns {Promise<Object|null>} The API response.
 */
export const removeMemberApi = async (auth, { conversationId, memberId, removedMemberData = null }) => {
    try {
        const currentUserId = auth?.id || auth?.userId;
        const isSelfExit = Number(currentUserId) === Number(memberId);
        
        const payload = {
            UserId: Number(currentUserId),
            MemberId: Number(memberId),
            ConversationId: Number(conversationId)
        };

        const body = buildCommonBody("RemoveMembers", auth, payload, "Group ( RemoveMembers )");
        const response = await CommonAPI(body);

        // Emit socket event if member removed successfully
        if (response?.Status === "200") {
            // Get member IDs before removal for broadcasting
            const allMemberIds = await getGroupMemberIds(conversationId, auth);
            
            emitMemberRemoved({
                ufcc: auth?.ufcc,
                eventType: 'member_removed',
                conversationId: Number(conversationId),
                ReceiverId: allMemberIds, // Array of remaining member IDs
                removedBy: {
                    userId: currentUserId,
                    name: auth?.username || auth?.name,
                    email: auth?.email
                },
                removedMember: removedMemberData || {
                    userId: memberId,
                    name: isSelfExit ? (auth?.username || auth?.name) : 'Member'
                },
                removedMemberId: Number(memberId),
                reason: isSelfExit ? 'left' : 'removed',
                removeInGroup: 1,
                timestamp: new Date().toISOString()
            });
        }

        return response;
    } catch (error) {
        console.error('Error in removeMemberApi:', error);
        return null;
    }
};
