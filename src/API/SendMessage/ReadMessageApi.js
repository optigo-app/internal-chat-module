import { CommonAPI, buildCommonBody } from "../InitialApi/CommonApi";

export const readMessageApi = async (
    auth,
    {
        ConversationId,
        fLabel = "Read Message",
    }
) => {
    try {
        if (!auth) {
            throw new Error("auth is required for readMessageApi");
        }

        const payload = {
            ConversationId: ConversationId,
            UserId: auth?.id ?? 0,
        };

        const body = buildCommonBody("ReadMessage", auth, payload, fLabel);
        const response = await CommonAPI(body);
        return response;
    } catch (error) {
        console.error("readMessageApi Error:", error);
        return null;
    }
};