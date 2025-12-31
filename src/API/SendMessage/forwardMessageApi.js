import { CommonAPI, buildCommonBody } from "../InitialApi/CommonApi";

export const forwardMessageApi = async (
    auth,
    params,
    fLabel = "Forward ( Forward Message To Multiple )",
) => {
    try {
        if (!auth) {
            throw new Error("auth is required for forwardMessageApi");
        }

        const payload = {
            SenderId: auth.id ?? 0,
            ...params
        };

        const body = buildCommonBody("ForwardMessage", auth, payload, fLabel);
        const response = await CommonAPI(body);
        return response;
    } catch (error) {
        console.error("forwardMessageApi Error:", error);
        return null;
    }
};