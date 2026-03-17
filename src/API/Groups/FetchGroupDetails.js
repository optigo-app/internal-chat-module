import { CommonAPI, buildCommonBody } from "../InitialApi/CommonApi";

export const fetchGroupDetails = async (conversationId, auth, fLabel = "Group ( GroupDetails )") => {
    try {
        const payload = {
            UserId: Number(auth?.id ?? auth?.userId),
            ConversationId: Number(conversationId),
        };

        const body = buildCommonBody("GroupDetails", auth, payload, fLabel);
        const response = await CommonAPI(body);

        if (response?.Data) {
            return {
                status: response.Status,
                message: response.Message,
                groupDetails: response.Data.rd?.[0] || null,
                members: response.Data.rd1 || []
            };
        }
        return null;
    } catch (error) {
        console.error('Error fetching group details:', error);
        return null;
    }
};
