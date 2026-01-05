import axios from "axios";
import { APIURL, getLoginHeaders } from "./Config";
import { getClientIpAddress } from "../../utils/globalFunc";

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

        const loginHeader = getLoginHeaders();

        const { data } = await axios.post(APIURL, body, { headers: loginHeader });
        return data;
    } catch (error) {
        console.error("API Error:", error);
        return null;
    }
};

