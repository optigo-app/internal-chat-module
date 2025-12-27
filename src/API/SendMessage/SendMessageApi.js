import { CommonAPI, buildCommonBody } from "../InitialApi/CommonApi";

// Core generic sender that follows the SendMessage API rules
// mode: "SendMessage"
// p: {
//   Page, PageSize, SenderId, ReceiverId, ConversationId,
//   Message, MessageType, Attachments (optional JSON string)
// }
// f: label passed via fLabel
export const sendMessageApi = async (
    auth,
    {
        page = 1,
        pageSize = 50,
        senderId,
        receiverId,
        conversationId = null,
        message = "",
        messageType = 1,
        attachments = null,
        fLabel = "Message ( Send Message )",
    }
) => {
    try {
        if (!auth) {
            throw new Error("auth is required for sendMessageApi");
        }

        const payload = {
            Page: page,
            PageSize: pageSize,
            SenderId: senderId ?? auth?.id ?? 0,
            ReceiverId: receiverId ?? null,
            ConversationId: conversationId ?? null,
            Message: message,
            MessageType: messageType,
        };

        if (attachments && Array.isArray(attachments) && attachments.length > 0) {
            payload.Attachments = JSON.stringify(attachments);
        }

        const body = buildCommonBody("SendMessage", auth, payload, fLabel);
        const response = await CommonAPI(body);
        return response;
    } catch (error) {
        console.error("sendMessageApi Error:", error);
        return null;
    }
};

// Convenience helpers matching your examples

// Text message
// f: "Message ( Send Message )"
export const sendTextMessage = async (auth, { senderId, receiverId, conversationId = null, message }) => {
    return sendMessageApi(auth, {
        senderId,
        receiverId,
        conversationId,
        message,
        messageType: 1,
        attachments: null,
        fLabel: "Message ( Send Message )",
    });
};

// Image message (MessageType: 1, Attachments present)
// f: "Message ( Send Image )"
export const sendImageMessage = async (auth, {
    senderId,
    receiverId,
    conversationId = null,
    caption = "",
    attachments,
}) => {
    return sendMessageApi(auth, {
        senderId,
        receiverId,
        conversationId,
        message: caption,
        messageType: 1,
        attachments,
        fLabel: "Message ( Send Image )",
    });
};

// Video message (MessageType: 2)
// f: "Message ( Send Video )"
export const sendVideoMessage = async (auth, {
    senderId,
    receiverId,
    conversationId = null,
    caption = "",
    attachments,
}) => {
    return sendMessageApi(auth, {
        senderId,
        receiverId,
        conversationId,
        message: caption,
        messageType: 2,
        attachments,
        fLabel: "Message ( Send Video )",
    });
};

// Document message (MessageType: 3)
// f: "Message ( Send Message )" (as per your example)
export const sendDocumentMessage = async (auth, {
    senderId,
    receiverId,
    conversationId = null,
    caption = "",
    attachments,
}) => {
    return sendMessageApi(auth, {
        senderId,
        receiverId,
        conversationId,
        message: caption,
        messageType: 3,
        attachments,
        fLabel: "Message ( Send Message )",
    });
};
