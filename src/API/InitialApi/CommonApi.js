import axios from "axios";
import { APIURL, getHeaders, getLoginHeaders } from "./Config";

// Helper to build standard body with con/p/f fields
export const buildCommonBody = (mode, auth, payloadObject, fLabel) => {
    return {
        con: `{"id":"","mode":"${mode}","appuserid":"${auth?.userId ?? ""}"}`,
        p: JSON.stringify(payloadObject ?? {}),
        f: fLabel ?? "",
    };
};

export const CommonAPI = async (body, version, pageName, signal) => {
    try {
        const headers = getHeaders();
        const loginHeader = getLoginHeaders();

        const { data } = await axios.post(APIURL, body, { 
            headers: version === "login" ? loginHeader : headers,
            ...(signal && { signal }) 
        });
        return data;
    } catch (error) {
        if (axios.isCancel(error)) {
            console.log('Request canceled:', error.message);
            throw new Error('AbortError');
        }
        console.error("API Error:", error);
        return null;
    }
};