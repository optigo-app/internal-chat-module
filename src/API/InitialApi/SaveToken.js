import axios from "axios";
import { getHeaders, SAVEPLAYERID } from "./Config";

export const saveToken = async (body) => {
    try {
        const headers = getHeaders();
        const { data } = await axios.post(`${SAVEPLAYERID}`, body, { headers });
        return data;
    } catch (error) {
        console.error("API Error:", error);
        return null;
    }
};

