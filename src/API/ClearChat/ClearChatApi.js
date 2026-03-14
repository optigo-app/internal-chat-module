import { CommonAPI, buildCommonBody } from "../InitialApi/CommonApi";

export const clearChatApi = async (
    auth,
    {
        conversationId,
        fLabel = "Clear Chat",
    }
) => {
    try {
        if (!auth) {
            throw new Error("auth is required for clearChatApi");
        }

        const payload = {
            UserId: auth?.id ?? 0,
            ConversationId: conversationId
        };

        const body = buildCommonBody("ClearChat", auth, payload, fLabel);
        const response = await CommonAPI(body);
        return response;
    } catch (error) {
        console.error("clearChatApi Error:", error);
        return null;
    }
}
