import { CommonAPI, buildCommonBody } from "../InitialApi/CommonApi";
import { emitGroupCreated } from "../../socket";

/**
 * API to create a new group.
 * 
 * @param {Object} auth - Authentication object containing userId and other credentials.
 * @param {Object} params - The group details.
 * @param {number|string} params.userId - The ID of the user creating the group.
 * @param {string} params.groupName - The name of the group.
 * @param {string} params.groupDesc - The description of the group.
 * @param {string} [params.groupProfile=""] - The profile picture URL or identifier for the group.
 * @param {Object} [params.permissions={}] - The group permissions object.
 * @param {boolean} [params.permissions.editGroupSettings=true] - Allow members to edit group settings.
 * @param {boolean} [params.permissions.sendMessages=true] - Allow members to send messages.
 * @param {boolean} [params.permissions.addOtherMembers=true] - Allow members to add other members.
 * @param {boolean} [params.permissions.approveNewMembers=false] - Require admin approval for new members.
 * @param {Array|string} params.groupMembers - An array of member objects or a JSON string.
 * @param {string} [params.fLabel="Group ( CreateGroup )"] - The label for the request.
 * @returns {Promise<Object|null>} The API response or null on error.
 */
export const createGroupApi = async (auth, {
    userId,
    groupName,
    groupDesc,
    groupProfile = "",
    permissions = {},
    groupMembers = [],
    fLabel = "Group ( CreateGroup )",
}) => {
    try {
        if (!auth) {
            throw new Error("auth is required for createGroupApi");
        }

        // Destructure permissions with default values
        const {
            editGroupSettings = true,
            editGroupAdmins = true,
            sendMessages = true,
            addOtherMembers = true,
            approveNewMembers = false,
            AllowDeleteForAll = true
        } = permissions;

        const payload = {
            UserId: userId ?? auth?.id ?? 0,
            GroupName: groupName,
            GroupDesc: groupDesc,
            GroupProfile: groupProfile,
            EditGroup: editGroupSettings ? 1 : 0,
            SendNewMessage: sendMessages ? 1 : 0,
            AddOtherMember: addOtherMembers ? 1 : 0,
            // ApproveNewMembers: approveNewMembers ? 1 : 0,
            // InviteToGroup: inviteToGroup ? 1 : 0,
            AllowDeleteForAll: AllowDeleteForAll ? 1 : 0,
            GroupMembers: Array.isArray(groupMembers) ? JSON.stringify(groupMembers) : (groupMembers ?? "[]"),
        };

        const body = buildCommonBody("CreateGroup", auth, payload, fLabel);
        const response = await CommonAPI(body);

        // Extract ConversationId correctly from response.Data.rd[0]
        const rd = response?.Data?.rd?.[0] || (Array.isArray(response?.rd) ? response.rd[0] : (response?.Data?.rd || response?.rd));

        // Enrich conversationData with necessary fields
        const enrichedRd = {
            ...rd,
            SystemMsg: 1
        };

        const convId = rd?.ConversationId || response?.rd?.ConversationId;

        // Emit socket event if group created successfully
        if (response?.Status === "200" && convId) {
            const memberIds = Array.isArray(groupMembers)
                ? groupMembers.map(m => Number(m.UserId || m.userId || m.id))
                : [];

            emitGroupCreated({
                ufcc: auth?.ufcc,
                eventType: 'group_created',
                conversationId: convId,
                ReceiverId: memberIds, // Array of all member IDs to notify
                groupName: groupName,
                groupDesc: groupDesc,
                groupProfile: groupProfile,
                conversationData: enrichedRd, // Pass the full group record for immediate UI update
                createdBy: {
                    userId: auth?.id || auth?.userId,
                    name: auth?.username || auth?.name,
                    email: auth?.email
                },
                members: groupMembers,
                permissions: {
                    editGroupSettings: editGroupSettings ? 1 : 0,
                    sendMessages: sendMessages ? 1 : 0,
                    addOtherMembers: addOtherMembers ? 1 : 0,
                    approveNewMembers: approveNewMembers ? 1 : 0
                },
                timestamp: new Date().toISOString(),
                receiveEvent: "internal:group_created"
            });
        }

        return response;
    } catch (error) {
        console.error("createGroupApi Error:", error);
        return null;
    }
};
