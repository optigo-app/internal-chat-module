import { MessagesSend } from "../InitialApi/MessagesSend";

export const messageReaction = async (userId, customerId, phone, messId, emoji) => {
    try {
        const body = {
            "userId": userId,
            "customerId": customerId,
            "phoneNo": phone,
            "type": "reaction",
            "reaction": {
                "message_id": messId,
                "emoji": emoji,
            }
        }

        const response = await MessagesSend(body);
        if (response?.Data) {
            return response?.Data;
        } else {
            return null;
        }
    } catch (error) {
        console.error('Error:', error);
        return null;
    }
}