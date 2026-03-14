import { CommonAPI, buildCommonBody } from "../InitialApi/CommonApi";
import { emitGroupUpdated } from "../../socket";
import { getGroupMemberIds } from "../../utils/groupSocketHelpers";

export const editGroupApi = async (auth, { conversationId, groupName, groupDesc, groupProfile = "" }) => {
    try {
        const payload = {
            UserId: Number(auth?.id ?? auth?.userId),
            ConversationId: Number(conversationId),
            GroupName: groupName,
            GroupDesc: groupDesc,
            GroupProfile: groupProfile
        };

        const body = buildCommonBody("EditGroup", auth, payload, "Group ( EditGroup )");
        const response = await CommonAPI(body);

        // Emit socket event if group updated successfully
        if (response?.Status === "200") {
            const memberIds = await getGroupMemberIds(conversationId, auth);
            
            const changes = {};
            if (groupName) changes.groupName = groupName;
            if (groupDesc) changes.groupDesc = groupDesc;
            if (groupProfile) changes.groupProfile = groupProfile;
            
            emitGroupUpdated({
                ufcc: auth?.ufcc,
                eventType: 'group_updated',
                conversationId: Number(conversationId),
                ReceiverId: memberIds, // Array of all member IDs
                updatedBy: {
                    userId: auth?.id || auth?.userId,
                    name: auth?.username || auth?.name,
                    email: auth?.email
                },
                changes: changes,
                timestamp: new Date().toISOString()
            });
        }

        return response;
    } catch (error) {
        console.error('Error editing group:', error);
        return null;
    }
};
