import { CommonAPI, buildCommonBody } from "../InitialApi/CommonApi";

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

        return response;
    } catch (error) {
        console.error('Error editing group:', error);
        return null;
    }
};
