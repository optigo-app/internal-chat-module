import axios from "axios";
import { getHeaders, LOGOUTAPI } from "./Config";

export const logoutApi = async (body, whatsappNumber) => {
    try {
        // const init = JSON.parse(sessionStorage.getItem("taskInit")) || {};
        // const headers = getHeaders(init); 
        const headers = getHeaders(whatsappNumber);

        const { data } = await axios.post(LOGOUTAPI, body, { headers });
        return data;
    } catch (error) {
        console.error("API Error:", error);
        return null;
    }
};

