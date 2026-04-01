import axios from "axios";
import { getHeaders, LOGOUTAPI } from "./Config";

export const logoutApi = async (body, whatsappNumber) => {
    try {
        const headers = getHeaders(whatsappNumber);

        const { data } = await axios.post(LOGOUTAPI, body, { headers });
        return data;
    } catch (error) {
        console.error("API Error:", error);
        return null;
    }
};

