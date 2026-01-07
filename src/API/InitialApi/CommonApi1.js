import { CommonAPI, buildLoginBody as unifiedBuildLoginBody } from "./CommonApi";

// Helper to build standard login body with con/p/f fields
export const buildLoginBody = (mode, appUserId, payloadObject, fLabel) => {
    return unifiedBuildLoginBody(mode, appUserId, payloadObject, fLabel);
};

export const CommonAPI1 = async (body, version) => {
    return CommonAPI(body, { authType: "login" });
};

