import axios from "axios";
import { getHeaders, MESSAGEAPIURLBULK } from "./Config";

export const MessagesSendBulk = async (body, whatsappNumber) => {
    try {
        const headers = getHeaders(whatsappNumber);
        const { data } = await axios.post(`${MESSAGEAPIURLBULK}`, body, { headers });
        return data;
    } catch (error) {
        console.error("API Error:", error);
        return null;
    }
};

