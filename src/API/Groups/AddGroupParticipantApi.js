import { CommonAPI, buildCommonBody } from "../InitialApi/CommonApi";
import { emitMemberAdded } from "../../socket";
import { getGroupMemberIds } from "../../utils/groupSocketHelpers";

export const addGroupParticipantApi = async (auth, { conversationId, selectedMembers, newMembersData = [] }) => {
    try {
        const payload = {
            UserId: Number(auth?.id ?? auth?.userId),
            ConversationId: Number(conversationId),
            GroupMembers: JSON.stringify(selectedMembers?.map(id => ({ UserId: id })))
        };

        const body = buildCommonBody("AddMembers", auth, payload, "Group ( AddMembers )");
        const response = await CommonAPI(body);

        // Emit socket event if members added successfully
        if (response?.Status === "200") {
            const allMemberIds = await getGroupMemberIds(conversationId, auth);
            // Ensure both existing and new members are in the broadcast list
            const broadcastIds = Array.from(new Set([
                ...allMemberIds,
                ...selectedMembers.map(id => Number(id))
            ]));
            
            const rd = response?.Data?.rd?.[0] || (Array.isArray(response?.rd) ? response.rd[0] : (response?.Data?.rd || response?.rd));
            
            // Enrich conversationData with necessary fields
            const enrichedRd = {
                ...rd,
                ConversationId: Number(conversationId),
                SystemMsg: 1
            };

            emitMemberAdded({
                ufcc: auth?.ufcc,
                eventType: 'member_added',
                conversationId: Number(conversationId),
                ReceiverId: broadcastIds, // Array of all member IDs (including new ones)
                conversationData: enrichedRd, // Pass enriched group record (RemoveInGroup: 0)
                addedBy: {
                    userId: auth?.id || auth?.userId,
                    name: auth?.username || auth?.name,
                    email: auth?.email
                },
                newMembers: newMembersData.length > 0 ? newMembersData : selectedMembers.map(id => ({ userId: id })),
                newMemberIds: selectedMembers,
                timestamp: new Date().toISOString()
            });
        }

        return response;
    } catch (error) {
        console.error('Error adding group participant:', error);
        return null;
    }
};
