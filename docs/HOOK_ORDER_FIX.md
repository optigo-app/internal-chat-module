# Hook Initialization Order Fix

## Problem
```
Uncaught ReferenceError: Cannot access 'drawerOpen' before initialization
```

## Root Cause
The `useConversation` hook was being called with `drawerOpen` as a parameter before `drawerOpen` was defined by the `useDrawerState` hook.

### Before (Incorrect Order)
```javascript
// useConversation called first (line 92)
const { ... } = useConversation(
    selectedCustomer, 
    onConversationRead, 
    onViewConversationRead, 
    drawerOpen,  // ❌ Not defined yet!
    onCustomerSelect
);

// useDrawerState called later
const { drawerOpen, ... } = useDrawerState(selectedCustomer?.ConversationId);
```

## Solution
Reordered the hooks so that `useDrawerState` is called before `useConversation`.

### After (Correct Order)
```javascript
// 1. Initialize drawer state first
const {
    drawerOpen,
    setDrawerOpen,
    drawerViewState,
    setDrawerViewState,
    selectedMessageForInfo,
    infoMember,
    openInfo: handleOpenInfo,
    openSearch: handleOpenSearch,
    openMessageInfo: handleMessageInfo,
    closeDrawer
} = useDrawerState(selectedCustomer?.ConversationId);

// 2. Now useConversation can access drawerOpen
const {
    inputValue, setInputValue,
    messages, setMessages,
    // ... other returns
} = useConversation(
    selectedCustomer, 
    onConversationRead, 
    onViewConversationRead, 
    drawerOpen,  // ✅ Now defined!
    onCustomerSelect
);

// 3. Other hooks follow
const typingStatus = useTypingIndicator(...);
```

## Key Takeaway
When one hook depends on values from another hook, the dependent hook must be called after the hook that provides those values. This follows React's Rules of Hooks and JavaScript's variable scoping rules.

## Verification
✅ No diagnostics errors
✅ Proper hook initialization order
✅ All dependencies are defined before use
