import { CommonAPI, buildCommonBody } from "../InitialApi/CommonApi";

export const addGroupParticipantApi = async (auth, { conversationId, selectedMembers }) => {
    try {
        const payload = {
            UserId: Number(auth?.id ?? auth?.userId),
            ConversationId: Number(conversationId),
            GroupMembers: JSON.stringify(selectedMembers?.map(id => ({ UserId: id })))
        };

        const body = buildCommonBody("AddMembers", auth, payload, "Group ( AddMembers )");
        const response = await CommonAPI(body);

        return response;
    } catch (error) {
        console.error('Error adding group participant:', error);
        return null;
    }
};
