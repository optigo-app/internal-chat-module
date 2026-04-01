# Group Notifications Implementation Summary

## Overview
Browser notifications have been implemented for all group socket events, following the same pattern as message notifications.

## Notification Templates Added

### 1. GROUP_CREATED
- **Title**: 👥 New Group Created
- **Body**: `{creator name} created "{group name}"`
- **Trigger**: When a new group is created
- **Shows to**: All group members

### 2. GROUP_UPDATED
- **Title**: 👥 Group Updated
- **Body**: `{updater name} updated group {changes}` (name, description, photo)
- **Trigger**: When group settings are modified
- **Shows to**: All group members

### 3. MEMBER_ADDED
- **Title**: 👥 Member Added
- **Body**: `{adder name} added {count} member(s) to the group`
- **Trigger**: When new members are added
- **Shows to**: All group members (including new ones)

### 4. MEMBER_REMOVED
- **Title**: 👥 Member Removed/Left
- **Body**: 
  - If left: `{member name} left the group`
  - If removed: `{remover name} removed {member name}`
- **Trigger**: When a member is removed or leaves
- **Shows to**: All remaining group members

### 5. YOU_WERE_REMOVED
- **Title**: ❌ Removed from Group
- **Body**: `You were removed from the group by {admin name}`
- **Trigger**: When the current user is removed from a group
- **Shows to**: Only the removed user
- **Special**: Shows error toast instead of regular toast

### 6. MEMBER_PROMOTED
- **Title**: 👑 Admin Promoted
- **Body**: `{member name} is now a group admin`
- **Trigger**: When a member is promoted to admin
- **Shows to**: All group members

### 7. MEMBER_DEMOTED
- **Title**: 👤 Admin Demoted
- **Body**: `{member name} is no longer a group admin`
- **Trigger**: When an admin is demoted to regular member
- **Shows to**: All group members

### 8. PERMISSION_CHANGED
- **Title**: ⚙️ Group Permissions Updated
- **Body**: `{admin name} {enabled/disabled} {permission name}`
- **Trigger**: When group permissions are changed
- **Shows to**: All group members

## Implementation Locations

### 1. Notification Templates (`src/utils/notificationTemplates.js`)
- Added 8 new notification templates for group events
- Updated `notify()` function to recognize GROUP type events
- Templates use capitalizeWords for proper name formatting

### 2. Conversation Component (`src/components/Conversation/Conversation.js`)
- Integrated notifications into group socket event callbacks
- Shows browser notifications when events occur in the current conversation
- Shows toast notifications for in-app feedback
- Triggers refresh after events to update UI

### 3. CustomerLists Component (`src/components/CustomerLists/CustomerLists.js`)
- Added group socket event handlers
- Shows browser notifications when events occur in OTHER conversations
- Refreshes conversation list to show updated group info
- Prevents duplicate notifications (only shows if not in the conversation)

## Notification Behavior

### When User is IN the Group Conversation:
1. Socket event received
2. Browser notification shown (if tab not focused)
3. Toast notification shown (in-app feedback)
4. Conversation refreshed to show changes
5. Sound played (if enabled)

### When User is NOT in the Group Conversation:
1. Socket event received in CustomerLists
2. Browser notification shown (if tab not focused)
3. Conversation list refreshed to show badge/update
4. Sound played (if enabled)
5. No toast shown (to avoid clutter)

### Special Case: User Removed from Group
1. `YOU_WERE_REMOVED` notification shown
2. Error toast displayed
3. `RemoveInGroup` status updated in context
4. User can no longer send messages
5. "Delete group" option shown instead of "Exit group"

## Notification Permissions

Notifications follow the existing permission system:
- User must grant browser notification permission
- Handled by `NotificationContext`
- Permission modal shown on first visit
- Can be re-enabled from settings

## Sound Integration

All group notifications play the notification sound:
- Uses `playNotificationSound()` from `src/utils/sound.js`
- Same sound as message notifications
- Only plays if tab not focused (WhatsApp-like behavior)

## Testing Checklist

### Group Events
- [ ] Create group → All members receive notification
- [ ] Update group name → All members receive notification
- [ ] Update group description → All members receive notification
- [ ] Update group photo → All members receive notification

### Member Events
- [ ] Add member → All members (including new) receive notification
- [ ] Remove member → Remaining members receive notification
- [ ] Member leaves → All members receive notification
- [ ] Current user removed → Special "YOU_WERE_REMOVED" notification

### Admin Events
- [ ] Promote to admin → All members receive notification
- [ ] Demote from admin → All members receive notification

### Permission Events
- [ ] Change any permission → All members receive notification

### Notification Behavior
- [ ] Notifications show when tab not focused
- [ ] Notifications don't show when tab focused (only toast)
- [ ] Sound plays with notifications
- [ ] Clicking notification focuses tab
- [ ] No duplicate notifications (Conversation vs CustomerLists)
- [ ] Notifications respect user permission settings

## Code Flow

```
1. Group Action (API Call)
   ↓
2. Socket Event Emitted (with ReceiverId array)
   ↓
3. Server Broadcasts to All Members
   ↓
4. Client Receives Event
   ↓
5. Event Handler Triggered
   ├─→ In Conversation: Conversation.js callback
   └─→ Not in Conversation: CustomerLists.js handler
   ↓
6. Notification Template Selected
   ↓
7. notify() Function Called
   ↓
8. showBrowserNotification() Executed
   ↓
9. Browser Notification Shown (if tab not focused)
   ↓
10. Toast Shown (if in conversation)
    ↓
11. UI Refreshed
```

## Future Enhancements

- [ ] Notification preferences per group
- [ ] Mute notifications for specific groups
- [ ] Custom notification sounds per group
- [ ] Notification history/log
- [ ] Batch notifications (multiple events)
- [ ] Rich notifications with action buttons
- [ ] Desktop notification center integration

## Notes

1. **No Duplicate Notifications**: The system checks if the user is in the conversation before showing notifications in CustomerLists to prevent duplicates.

2. **Notification Grouping**: Notifications use `tag` parameter to group by conversation, so multiple events in the same group replace each other.

3. **Permission Handling**: If user hasn't granted notification permission, only toast notifications are shown.

4. **Focus Detection**: Notifications only show when tab is not focused, following WhatsApp Web behavior.

5. **Sound Consistency**: All notifications use the same sound as message notifications for consistency.

6. **Error Handling**: If notification fails, it falls back gracefully to toast-only mode.
