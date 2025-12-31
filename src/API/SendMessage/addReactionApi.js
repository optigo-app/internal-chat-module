import { CommonAPI, buildCommonBody } from "../InitialApi/CommonApi";

export const addReactionApi = async (
    auth,
    {
        messageId,
        emoji,
        fLabel = "Reaction ( Add Reaction )",
    }
) => {
    try {
        if (!auth) {
            throw new Error("auth is required for addReactionApi");
        }

        const payload = {
            MessageId: messageId,
            UserId: auth?.id ?? 0,
            Emoji: emoji,
        };

        const body = buildCommonBody("AddReaction", auth, payload, fLabel);
        const response = await CommonAPI(body);
        return response;
    } catch (error) {
        console.error("addReactionApi Error:", error);
        return null;
    }
};