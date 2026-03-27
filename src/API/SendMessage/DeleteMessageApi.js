import { CommonAPI, buildCommonBody } from "../InitialApi/CommonApi";

/**
 * Delete an existing message
 * @param {object} auth - Authentication object
 * @param {object} messageId - ID of the message to delete
 */
export const deleteMessageApi = async (auth, messageId, mode) => {
    try {
        if (!auth) {
            throw new Error("auth is required for deleteMessageApi");
        }

        const payload = {
            MessageId: messageId,
            UserId: auth.id ?? auth.userId ?? 0,
            DeleteMode: mode || 1, // 1: Delete for Me, 2: Delete for Everyone
        };

        const body = buildCommonBody("DeleteMessage", auth, payload, "Delete Message");
        const response = await CommonAPI(body);
        return response;
    } catch (error) {
        console.error("deleteMessageApi Error:", error);
        return null;
    }
};
