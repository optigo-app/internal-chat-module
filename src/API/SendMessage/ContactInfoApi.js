import { CommonAPI, buildCommonBody } from "../InitialApi/CommonApi";

export const contactInfoApi = async (auth, { contactUserId } = {}) => {
    try {
        if (!auth) {
            throw new Error("auth is required for contactInfoApi");
        }
        const payload = {
            UserId: contactUserId ?? auth.id ?? auth.userId ?? 0,
        };
        const body = buildCommonBody("ContactInfo", auth, payload, "contactInfoApi");
        const response = await CommonAPI(body);
        return response;
    } catch (error) {
        console.error("contactInfoApi Error:", error);
        return null;
    }
};
