import axios from "axios";
import { MEDIAAPIURL } from "./Config";

export const MediaApi = async (authToken, whatsappNumber, fileId) => {
    try {
        const token = authToken;

        const response = await axios.get(`https://crmapp.mpillarapi.com/api/meta/v19.0/${fileId}?phone_number_id=${whatsappNumber}`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
            responseType: "blob", // 🔑 to preview/download media
        });

        return response.data;
    } catch (error) {
        console.error("API Error:", error);
        return null;
    }
};
