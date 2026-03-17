import { CommonAPI, buildCommonBody } from "../InitialApi/CommonApi";

export const readMessageApi = async (
    auth,
    {
        ConversationId,
        IsGroup = 0,
        fLabel = "Read Message",
        signal = null,
    }
) => {
    try {
        if (!auth) {
            throw new Error("auth is required for readMessageApi");
        }

        const payload = {
            ConversationId: ConversationId,
            UserId: auth?.id ?? auth?.userId ?? 0,
            // IsGroup: IsGroup ? 1 : 0
        };

        const body = buildCommonBody("ReadMessage", auth, payload, fLabel);
        const response = await CommonAPI(body, { signal });
        return response;
    } catch (error) {
        console.error("readMessageApi Error:", error);
        return null;
    }
};