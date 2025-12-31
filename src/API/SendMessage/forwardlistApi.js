import { CommonAPI, buildCommonBody } from "../InitialApi/CommonApi";

export const getForwardListApi = async (
    auth,
    {
        fLabel = "forward list ( forward list )",
    }
) => {
    try {
        if (!auth) {
            throw new Error("auth is required for GetForwardList");
        }

        const payload = {
            UserId: auth?.id ?? 0,
        };

        const body = buildCommonBody("GetForwardList", auth, payload, fLabel);
        const response = await CommonAPI(body);
        return response;
    } catch (error) {
        console.error("GetForwardList Error:", error);
        return null;
    }
};