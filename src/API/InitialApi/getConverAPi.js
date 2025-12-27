import axios from "axios";
import { GETCONVERSATIONURL, getHeaders } from "./Config";

export const getConverAPi = async (body, whatsappNumber) => {
    try {
        // const init = JSON.parse(sessionStorage.getItem("taskInit")) || {};
        // const headers = getHeaders(init); 
        const headers = getHeaders(whatsappNumber);

        const { data } = await axios.post(GETCONVERSATIONURL, body, { headers });
        return data;
    } catch (error) {
        console.error("API Error:", error);
        return null;
    }
};

