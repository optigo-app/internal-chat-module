import { CommonAPI, buildCommonBody } from "../InitialApi/CommonApi";

export const changeGroupPermissionApi = async (auth, { conversationId, permissionName, permissionValue }) => {
    try {
        const payload = {
            UserId: Number(auth?.id ?? auth?.userId),
            ConversationId: Number(conversationId),
            PermissionName: permissionName,
            PermissionValue: permissionValue ? 1 : 0
        };

        const body = buildCommonBody("ChangeGroupPermission", auth, payload, "Group ( ChangeGroupPermission )");
        const response = await CommonAPI(body);

        return response;
    } catch (error) {
        console.error('Error changing group permission:', error);
        return null;
    }
};
