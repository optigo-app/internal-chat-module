import { CommonAPI, buildCommonBody } from "../InitialApi/CommonApi";
import { emitMemberPromoted, emitMemberDemoted } from "../../socket";
import { getGroupMemberIds } from "../../utils/groupSocketHelpers";

/**
 * API to assign or remove admin role for a group member.
 * 
 * @param {Object} auth - Authentication object.
 * @param {Object} params - Parameters for the API.
 * @param {number} params.conversationId - The ID of the conversation (group).
 * @param {number} params.memberId - The ID of the member whose role is being changed.
 * @param {number} [params.currentIsAdmin] - Current admin status (0 or 1) to determine promotion/demotion.
 * @param {Object} [params.targetMemberData] - Optional data about the target member.
 * @returns {Promise<Object|null>} The API response.
 */
export const multiAssignRoleApi = async (auth, { conversationId, adminChanges = [] }) => {
    try {
        const payload = {
            UserId: Number(auth?.id ?? auth?.userId),
            ConversationId: Number(conversationId),
            CommonUseJson: JSON.stringify(adminChanges)
        };

        const body = buildCommonBody("MultiAssignRole", auth, payload, "Group ( MultiAssignRole )");
        const response = await CommonAPI(body);

        // Emit socket event if role changed successfully
        if (response?.Status === "200") {
            const rd = response?.Data?.rd?.[0] || (Array.isArray(response?.rd) ? response.rd[0] : (response?.Data?.rd || response?.rd));

            // Only emit socket and proceed if business logic succeeded (stat !== 0)
            if (rd?.stat === 0) {
                return response;
            }

            const allMemberIds = await getGroupMemberIds(conversationId, auth);

            // Enrich conversationData with necessary fields
            const enrichedRd = {
                ...rd,
                ConversationId: Number(conversationId),
                SystemMsg: 1
            };

            // Emit an event for each mapped change
            adminChanges.forEach(change => {
                const isPromotion = change.IsGroupAdmin === 1;
                
                const eventData = {
                    ufcc: auth?.ufcc,
                    eventType: isPromotion ? 'member_promoted' : 'member_demoted',
                    conversationId: Number(conversationId),
                    ReceiverId: allMemberIds, // Array of all member IDs
                    conversationData: enrichedRd, // Pass enriched group record
                    changedBy: {
                        userId: auth?.id || auth?.userId,
                        name: auth?.username || auth?.name,
                        email: auth?.email
                    },
                    targetMember: {
                        userId: change.UserId,
                        name: 'Member'
                    },
                    targetMemberId: Number(change.UserId),
                    newRole: isPromotion ? 'admin' : 'member',
                    isGroupAdmin: isPromotion ? 1 : 0,
                    timestamp: new Date().toISOString()
                };

                // if (isPromotion) {
                //     emitMemberPromoted(eventData);
                // } else {
                //     emitMemberDemoted(eventData);
                // }
            });
        }

        return response;
    } catch (error) {
        console.error('Error in assignRoleApi:', error);
        return null;
    }
};
