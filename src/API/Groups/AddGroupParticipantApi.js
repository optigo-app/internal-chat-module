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
            
            emitMemberAdded({
                ufcc: auth?.ufcc,
                eventType: 'member_added',
                conversationId: Number(conversationId),
                ReceiverId: allMemberIds, // Array of all member IDs (including new ones)
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
