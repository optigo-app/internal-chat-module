import { MessagesSend } from "../InitialApi/MessagesSend";

export const sendMedia = async (media, phoneNo, id, caption, keyName = "media", userId, customerId, whatsappNumber) => {

    try {
        const body = {
            "userId": `${userId}`,
            "customerId": `${customerId}`,
            "phoneNo": `${phoneNo}`,
            "type": media,
            [keyName]: {
                "id": id,
                "caption": caption
            }
        }

        const response = await MessagesSend(body, whatsappNumber);
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
