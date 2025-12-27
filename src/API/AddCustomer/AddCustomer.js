import { CommonAPI } from "../InitialApi/CommonApi";

export const addCustomer = async (userPhone, userId = 1, userName = "") => {
    try {
        const body = {
            "con": "{\"id\":\"\",\"mode\":\"wa_add_customer\",\"appuserid\":\"admin@hs.com\"}",
            "p": `{\"UserPhone\": \"${userPhone}\",\"UserId\": \"${userId}\",\"Name\": \"${userName}\"}`,
            "f": "Chat ( Add Customer )"
        };

        const response = await CommonAPI(body);
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