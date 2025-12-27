import axios from "axios";
import { getHeaders, MESSAGEAPIURL } from "./Config";

export const MessagesSend = async (body, whatsappNumber) => {
    try {
        const headers = getHeaders(whatsappNumber);
        const { data } = await axios.post(`${MESSAGEAPIURL}`, body, { headers });
        return data;
    } catch (error) {
        console.error("API Error:", error);
        return null;
    }
};

