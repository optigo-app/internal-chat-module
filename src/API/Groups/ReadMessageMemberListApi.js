import { CommonAPI, buildCommonBody } from "../InitialApi/CommonApi";

export const readMessageMemberList = async (messageId, auth, fLabel = "Group (ReadMessageMemberList)") => {
    try {
        const payload = {
            MessageId: Number(messageId),
        };

        const body = buildCommonBody("ReadMessageMemberList", auth, payload, fLabel);
        const response = await CommonAPI(body);

        if (response?.Data) {
            return {
                status: response.Status,
                message: response.Message,
                readBy: response.Data.rd || [],
                deliveredTo: response.Data.rd1 || []
            };
        }
        return { readBy: [], deliveredTo: [] };
    } catch (error) {
        console.error('Error fetching message member list:', error);
        return { readBy: [], deliveredTo: [] };
    }
};
