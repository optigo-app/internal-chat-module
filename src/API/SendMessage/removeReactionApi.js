import { CommonAPI, buildCommonBody } from "../InitialApi/CommonApi";

export const removeReactionApi = async (
    auth,
    {
        messageId,
        fLabel = "Reaction ( Remove Reaction )",
    }
) => {
    try {
        if (!auth) {
            throw new Error("auth is required for removeReactionApi");
        }

        const payload = {
            MessageId: messageId,
            UserId: auth?.id ?? 0,
        };

        const body = buildCommonBody("RemoveReaction", auth, payload, fLabel);
        const response = await CommonAPI(body);
        return response;
    } catch (error) {
        console.error("removeReactionApi Error:", error);
        return null;
    }
};