import { MessagesSend } from "../InitialApi/MessagesSend";

export const replyTo = async (userId, customerId, phone, type, contextType, messId, prevUrl, bodyText) => {
    try {
        const body = {
            "userId": userId,
            "customerId": customerId,
            "phoneNo": phone,
            "type": type,
            "ContextType": contextType,
            "context": {
                "message_id": messId
            },
            [type]: {
                "preview_url": prevUrl,
                "body": bodyText
            }
        }

        const response = await MessagesSend(body);
        if (response) {
            return response;
        } else {
            return null;
        }
    } catch (error) {
        console.error('Error:', error);
        return null;
    }
}