import { CommonAPI, buildCommonBody } from "../InitialApi/CommonApi";

export const deleteConversationApi = async (
    auth,
    {
        conversationId,
        fLabel = "Conversation ( ConversationDelete )",
    }
) => {
    try {
        if (!auth) {
            throw new Error("auth is required for deleteConversationApi");
        }

        const payload = {
            UserId: auth?.id ?? auth?.userId ?? 0,
            ConversationId: conversationId
        };

        const body = buildCommonBody("ConversationDelete", auth, payload, fLabel);
        const response = await CommonAPI(body);
        return response;
    } catch (error) {
        console.error("deleteConversationApi Error:", error);
        return null;
    }
}
