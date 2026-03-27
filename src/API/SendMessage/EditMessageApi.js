import { CommonAPI, buildCommonBody } from "../InitialApi/CommonApi";

/**
 * Edit an existing message
 * @param {object} auth - Authentication object
 * @param {object} payload - { messageId, newMessage }
 */
export const editMessageApi = async (auth, { messageId, newMessage }) => {
    try {
        if (!auth) {
            throw new Error("auth is required for editMessageApi");
        }

        const payload = {
            MessageId: messageId,
            Message: newMessage,
            UserId: auth.id ?? auth.userId ?? 0,
        };

        const body = buildCommonBody("UpdateMessage", auth, payload, "Edit Message ( Update Message Content )");
        const response = await CommonAPI(body);
        return response;
    } catch (error) {
        console.error("editMessageApi Error:", error);
        return null;
    }
};
