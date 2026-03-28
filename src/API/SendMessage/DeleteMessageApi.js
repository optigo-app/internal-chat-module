import { CommonAPI, buildCommonBody } from "../InitialApi/CommonApi";

export const deleteMessageApi = async (auth, messageId, mode, ConvarsationId) => {
    try {
        if (!auth) {
            throw new Error("auth is required for deleteMessageApi");
        }

        const payload = {
            UserId: auth.id ?? auth.userId ?? 0,
            MessageId: messageId,
            DeleteMode: mode || 1, // 1: Delete for Me, 2: Delete for Everyone
            ConversationId: ConvarsationId ?? ''
        };

        const body = buildCommonBody("DeleteMessage", auth, payload, "Delete Message");
        const response = await CommonAPI(body);
        return response;
    } catch (error) {
        console.error("deleteMessageApi Error:", error);
        return null;
    }
};
