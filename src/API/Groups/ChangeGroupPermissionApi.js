import { CommonAPI, buildCommonBody } from "../InitialApi/CommonApi";
import { emitPermissionChanged } from "../../socket";
import { getGroupMemberIds } from "../../utils/groupSocketHelpers";

export const changeGroupPermissionApi = async (auth, { conversationId, permissionName, permissionValue, allPermissions = null }) => {
    try {
        const payload = {
            UserId: Number(auth?.id ?? auth?.userId),
            ConversationId: Number(conversationId),
            PermissionName: permissionName,
            PermissionValue: permissionValue ? 1 : 0
        };

        const body = buildCommonBody("ChangeGroupPermission", auth, payload, "Group ( ChangeGroupPermission )");
        const response = await CommonAPI(body);

        // Emit socket event if permission changed successfully
        if (response?.Status === "200") {
            const allMemberIds = await getGroupMemberIds(conversationId, auth);
            
            emitPermissionChanged({
                ufcc: auth?.ufcc,
                eventType: 'permission_changed',
                conversationId: Number(conversationId),
                ReceiverId: allMemberIds, // Array of all member IDs
                changedBy: {
                    userId: auth?.id || auth?.userId,
                    name: auth?.username || auth?.name,
                    email: auth?.email
                },
                permissions: allPermissions || {
                    [permissionName]: permissionValue ? 1 : 0
                },
                changedPermission: {
                    name: permissionName,
                    value: permissionValue ? 1 : 0
                },
                timestamp: new Date().toISOString()
            });
        }

        return response;
    } catch (error) {
        console.error('Error changing group permission:', error);
        return null;
    }
};
