import axios from "axios";
import { APIURL, getLoginHeaders } from "./Config";

// Helper to build standard login body with con/p/f fields
export const buildLoginBody = (mode, appUserId, payloadObject, fLabel) => {
    return {
        con: `{"id":"","mode":"${mode}","appuserid":"${appUserId ?? ""}"}`,
        p: JSON.stringify(payloadObject ?? {}),
        f: fLabel ?? "",
    };
};

export const CommonAPI1 = async (body, version) => {
    try {
        const loginHeader = getLoginHeaders();

        const { data } = await axios.post(APIURL, body, { headers: loginHeader });
        return data;
    } catch (error) {
        console.error("API Error:", error);
        return null;
    }
};

