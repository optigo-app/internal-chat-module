# Socket Emit Implementation Summary

## Overview
All socket emit calls have been updated to use `ReceiverId` as an array for groups and a single value for 1-to-1 chats.

## Implementation Status

### ✅ Group Socket Events (All Complete)

#### 1. Group Created (`emitGroupCreated`)
- **File**: `src/API/Groups/CreateGroupApi.js`
- **ReceiverId**: Array of all member IDs
- **Status**: ✅ Implemented
- **Additional Fields**: groupName, groupDesc, groupProfile, createdBy, members, permissions

#### 2. Group Updated (`emitGroupUpdated`)
- **File**: `src/API/Groups/EditGroupApi.js`
- **ReceiverId**: Array of all member IDs (fetched via `getGroupMemberIds`)
- **Status**: ✅ Implemented
- **Additional Fields**: updatedBy, changes (groupName, groupDesc, groupProfile)

#### 3. Member Added (`emitMemberAdded`)
- **File**: `src/API/Groups/AddGroupParticipantApi.js`
- **ReceiverId**: Array of all member IDs including new ones (fetched via `getGroupMemberIds`)
- **Status**: ✅ Implemented
- **Additional Fields**: addedBy, newMembers, newMemberIds

#### 4. Member Removed (`emitMemberRemoved`)
- **File**: `src/API/Groups/RemoveMemberApi.js`
- **ReceiverId**: Array of remaining member IDs (fetched via `getGroupMemberIds`)
- **Status**: ✅ Implemented
- **Additional Fields**: removedBy, removedMember, removedMemberId, reason, removeInGroup

#### 5. Member Promoted (`emitMemberPromoted`)
- **File**: `src/API/Groups/AssignRoleApi.js`
- **ReceiverId**: Array of all member IDs (fetched via `getGroupMemberIds`)
- **Status**: ✅ Implemented
- **Additional Fields**: changedBy, targetMember, targetMemberId, newRole, isGroupAdmin

#### 6. Member Demoted (`emitMemberDemoted`)
- **File**: `src/API/Groups/AssignRoleApi.js`
- **ReceiverId**: Array of all member IDs (fetched via `getGroupMemberIds`)
- **Status**: ✅ Implemented
- **Additional Fields**: changedBy, targetMember, targetMemberId, newRole, isGroupAdmin

#### 7. Permission Changed (`emitPermissionChanged`)
- **File**: `src/API/Groups/ChangeGroupPermissionApi.js`
- **ReceiverId**: Array of all member IDs (fetched via `getGroupMemberIds`)
- **Status**: ✅ Implemented
- **Additional Fields**: changedBy, permissions, changedPermission

### ✅ Message Socket Events (All Complete)

#### 8. Message Send (`emitInternalMessageSend`)
- **File**: `src/components/Conversation/useConversation.js`
- **ReceiverId**: 
  - **Groups**: Array of all member IDs (fetched via `fetchGroupDetails`)
  - **1-to-1**: Single value (selectedCustomer.ReceiverId)
- **Status**: ✅ Implemented
- **Group-Specific Fields**: IsGroup, FirstName, LastName, SenderEmail, SenderProfilePicture
- **Locations**:
  - Text messages (line ~1025)
  - Media messages - multiple documents (line ~800)
  - Media messages - single/images/videos (line ~823)
  - Forward messages (line ~1206)

#### 9. Message Read (`emitInternalMessageRead`)
- **File**: `src/components/Conversation/useConversation.js`
- **ReceiverId**: Single value (selectedCustomer.ReceiverId)
- **Status**: ✅ Implemented (no group-specific logic needed)
- **Note**: Read receipts are per-user, not broadcast to all group members

#### 10. Reaction Send (`emitSendReaction`)
- **File**: `src/components/Conversation/Conversation.js`
- **ReceiverId**: 
  - **Groups**: Array of all member IDs (fetched via `fetchGroupDetails`)
  - **1-to-1**: Single value (selectedCustomer.ReceiverId)
- **Status**: ✅ Implemented
- **Group-Specific Fields**: IsGroup, UserName, FirstName, LastName

## Helper Functions

### `getGroupMemberIds(conversationId, auth)`
- **File**: `src/utils/groupSocketHelpers.js`
- **Purpose**: Fetches all member IDs for a group conversation
- **Returns**: Array of member IDs
- **Used By**: All group API emit calls

### `fetchGroupDetails(conversationId, auth)`
- **File**: `src/API/Groups/FetchGroupDetails.js`
- **Purpose**: Fetches complete group details including members
- **Returns**: Object with members array
- **Used By**: Message and reaction emit calls

## Socket Event Flow

### For Groups:
1. User performs action (create group, send message, etc.)
2. API call is made to backend
3. If successful, fetch all group member IDs
4. Emit socket event with `ReceiverId` as array of all member IDs
5. Server broadcasts to all IDs in the array
6. All group members receive the event

### For 1-to-1 Chats:
1. User performs action (send message, react, etc.)
2. API call is made to backend
3. If successful, use `selectedCustomer.ReceiverId` as single value
4. Emit socket event with `ReceiverId` as single value
5. Server sends to that specific user
6. Recipient receives the event

## Context System

### GroupSocketContext
- **File**: `src/contexts/GroupSocketContext.js`
- **Purpose**: Centralized socket event handling for groups
- **Implementation**: Ref-based callback system (no state updates to avoid infinite loops)
- **Methods**:
  - `registerListener(conversationId, callbacks)`: Register callbacks for a conversation
  - `unregisterListener(conversationId)`: Unregister callbacks when leaving conversation

### Usage in Conversation.js
- Registers callbacks when entering a group conversation
- Callbacks handle toast notifications and refresh logic
- Unregisters when leaving conversation
- No state updates in context = no infinite loops

## Testing Checklist

- [ ] Create group → All members receive notification
- [ ] Update group name/desc/photo → All members receive notification
- [ ] Add member → All members (including new) receive notification
- [ ] Remove member → Remaining members receive notification, removed member gets special notification
- [ ] Promote to admin → All members receive notification
- [ ] Demote from admin → All members receive notification
- [ ] Change permissions → All members receive notification
- [ ] Send message in group → All members receive message
- [ ] Send media in group → All members receive media
- [ ] React to message in group → All members see reaction
- [ ] Send message in 1-to-1 → Only recipient receives
- [ ] React in 1-to-1 → Only recipient receives

## Notes

1. **Server Responsibility**: The server should iterate through the `ReceiverId` array and broadcast to each user's socket connection.

2. **Removed Members**: When a member is removed, they should still receive the removal notification (their ID is in the array before removal).

3. **Self-Messages**: Warnings are logged when sending to self (for debugging).

4. **Group-Specific Fields**: Messages and reactions in groups include additional fields like `IsGroup`, `FirstName`, `LastName`, etc. for proper display.

5. **Error Handling**: If fetching group members fails, fallback to using `selectedCustomer.ReceiverId` as array.

## Future Enhancements

- [ ] Batch socket emissions for multiple operations
- [ ] Optimize group member fetching (cache with TTL)
- [ ] Add typing indicators for groups
- [ ] Add online/offline status for group members
- [ ] Add delivery receipts for group messages
