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
            const rd = response?.Data?.rd?.[0] || (Array.isArray(response?.rd) ? response.rd[0] : (response?.Data?.rd || response?.rd));

            // Only emit socket and proceed if business logic succeeded (stat !== 0)
            if (rd?.stat === 0) {
                return response;
            }

            // Get member IDs after removal, but add the removed member back into broadcast list
            // so they receive the event on their side (to clear state/notify)
            const allMemberIds = await getGroupMemberIds(conversationId, auth);
            const broadcastIds = Array.from(new Set([...allMemberIds, Number(memberId)]));
            

            // Enrich conversationData with necessary fields
            const enrichedRd = {
                ...rd,
                ConversationId: Number(conversationId),
                SystemMsg: 1
            };

            emitMemberRemoved({
                ufcc: auth?.ufcc,
                eventType: 'member_removed',
                conversationId: Number(conversationId),
                ReceiverId: broadcastIds, // Array of remaining member IDs + removed member
                conversationData: enrichedRd, // Pass enriched group record
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
