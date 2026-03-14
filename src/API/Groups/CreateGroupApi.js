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
            sendMessages = true,
            addOtherMembers = true,
            approveNewMembers = false
        } = permissions;

        const payload = {
            UserId: userId ?? auth?.id ?? 0,
            GroupName: groupName,
            GroupDesc: groupDesc,
            GroupProfile: groupProfile,
            EditGroup: editGroupSettings ? 1 : 0,
            SendNewMessage: sendMessages ? 1 : 0,
            AddOtherMember: addOtherMembers ? 1 : 0,
            ApproveNewMembers: approveNewMembers ? 1 : 0,
            GroupMembers: Array.isArray(groupMembers) ? JSON.stringify(groupMembers) : (groupMembers ?? "[]"),
        };

        const body = buildCommonBody("CreateGroup", auth, payload, fLabel);
        const response = await CommonAPI(body);
        
        // Emit socket event if group created successfully
        if (response?.Status === "200" && response?.rd?.ConversationId) {
            const memberIds = Array.isArray(groupMembers) 
                ? groupMembers.map(m => m.UserId || m.userId || m.id)
                : [];
            
            emitGroupCreated({
                ufcc: auth?.ufcc,
                eventType: 'group_created',
                conversationId: response.rd.ConversationId,
                ReceiverId: memberIds, // Array of all member IDs
                groupName: groupName,
                groupDesc: groupDesc,
                groupProfile: groupProfile,
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
                timestamp: new Date().toISOString()
            });
        }
        
        return response;
    } catch (error) {
        console.error("createGroupApi Error:", error);
        return null;
    }
};
