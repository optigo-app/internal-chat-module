import { MessagesSendBulk } from "../InitialApi/MessagesSendBulk";

export const forwardTo = async (userId, contactsArray, type, contextType, messId, prevUrl, bodyText) => {
    try {
        const body = {
            userId,
            Customers: contactsArray.map(contact => ({
                customerId: contact.CustomerId,
                phoneNo: contact.CustomerPhone
            })),
            type,
            ContextType: contextType,
            context: {
                message_id: messId
            },
            [type]: {
                preview_url: prevUrl,
                body: bodyText
            }
        };

        const response = await MessagesSendBulk(body);
        if (response) {
            return response;
        } else {
            return null;
        }
    } catch (error) {
        console.error("Error in forwardTo:", error);
        return null;
    }
};
