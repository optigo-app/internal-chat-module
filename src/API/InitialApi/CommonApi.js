import axios from "axios";
import { APIURL, getApiHeaders } from "./Config";
import { getClientIpAddress } from "../../utils/globalFunc";

// Helper to build standard body with con/p/f fields
export const buildCommonBody = (mode, auth, payloadObject, fLabel) => {
    const appUserId = typeof auth === "string" ? auth : auth?.userId ?? "";
    return {
        con: `{"id":"","mode":"${mode}","appuserid":"${appUserId}"}`,
        p: JSON.stringify(payloadObject ?? {}),
        f: fLabel ?? "",
    };
};

export const buildLoginBody = (mode, appUserId, payloadObject, fLabel) => {
    return buildCommonBody(mode, appUserId ?? "", payloadObject, fLabel);
};

export const CommonAPI = async (body, version, pageName, signal) => {
    try {
        let options = {};

        if (version && typeof version === "object") {
            options = version;
        } else {
            const looksLikeSignal = (value) =>
                value && typeof value === "object" && ("aborted" in value || typeof value.addEventListener === "function");

            if (version === "login") {
                options = { authType: "login", pageName, signal };
            } else if (looksLikeSignal(pageName) && typeof version === "string") {
                options = { authType: "default", pageName: version, signal: pageName };
            } else {
                options = { authType: "default", pageName, signal };
            }
        }

        if (body && typeof body === "object" && typeof body.con === "string") {
            try {
                const ipAddress = await getClientIpAddress();
                const conObj = JSON.parse(body.con);

                if (conObj && typeof conObj === "object" && !Array.isArray(conObj) && !("IPAddress" in conObj)) {
                    body.con = JSON.stringify({ ...conObj, IPAddress: ipAddress ?? "" });
                }
            } catch (e) {
                // Ignore IP injection failures and proceed with the original request body
            }
        }

        const headers = {
            ...getApiHeaders({ version: options?.apiVersion }),
            ...(options?.headers ?? {}),
        };

        const url = options?.url ?? APIURL;

        const { data } = await axios.post(url, body, {
            headers,
            ...(options?.signal && { signal: options.signal }),
        });
        return data;
    } catch (error) {
        if (axios.isCancel(error) || error?.code === "ERR_CANCELED") {
            console.log('Request canceled:', error.message);
            throw new Error('AbortError');
        }
        console.error("API Error:", error);
        return null;
    }
};