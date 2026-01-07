import { CommonAPI, buildCommonBody } from "../InitialApi/CommonApi";

export const replyToMessageApi = async (
    auth,
    {
        conversationId,
        replyToMessageId,
        ReplyToAttachmentId,
        message,
        messageType = 1,
        fLabel = "Reply ( Reply to Message )",
    }
) => {
    try {
        if (!auth) {
            throw new Error("auth is required for replyToMessageApi");
        }

        const payload = {
            SenderId: auth.id ?? 0,
            ConversationId: conversationId,
            ReplyToMessageId: replyToMessageId,
            ReplyToAttachmentId: ReplyToAttachmentId || null,
            Message: message,
            MessageType: messageType,
        };

        const body = buildCommonBody("ReplyToMessage", auth, payload, fLabel);
        const response = await CommonAPI(body);
        return response;
    } catch (error) {
        console.error("replyToMessageApi Error:", error);
        return null;
    }
};