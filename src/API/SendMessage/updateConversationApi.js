import { CommonAPI, buildCommonBody } from "../InitialApi/CommonApi";

export const updateConversationApi = async (
    auth,
    {
        conversationId,
        isPin = 0,
        isStar = 0,
        isArchived = 0,
        fLabel = "Update ( Update Conversation )",
    }
) => {
    try {
        if (!auth) {
            throw new Error("auth is required for updateConversationApi");
        }

        const payload = {
            CommonUseJson: JSON.stringify([conversationId]),
            UserId: auth.id ?? 0,
            IsPin: isPin,
            IsStar: isStar,
            IsArchived: isArchived,
        };

        const body = buildCommonBody("UpdateConversation", auth, payload, fLabel);
        const response = await CommonAPI(body);
        return response;
    } catch (error) {
        console.error("updateConversationApi Error:", error);
        return null;
    }
};