import { saveToken } from "../InitialApi/SaveToken";

export const savePlayerId = async (SocketId, userId, id) => {

    try {
        const body = {
            "con": `{\"id\":\"\",\"mode\":\"wa_save_device_tok\",\"appuserid\":\"${userId}\"}`,
            "p": `{\"UserId\": ${id},\"SocketId\":\"${SocketId}\"}`,
            "f": "Agent Information ( Save Device Token )"
        }
        const response = await saveToken(body);
        if (response?.Data) {
            return response?.Data;
        } else {
            return null;
        }
    } catch (error) {
        console.error('Error:', error);
        return null;
    }
};