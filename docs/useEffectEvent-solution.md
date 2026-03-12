# useEffectEvent Solution for Socket Connection

## Problem

In `App.js`, the socket connection `useEffect` had these dependencies:
```js
}, [auth?.token, auth?.id, auth?.userId, auth?.ufcc, navigate]);
```

This caused the socket to **reconnect every time any auth property changed**, even when only the token should trigger a reconnection. This is inefficient and can cause:
- Unnecessary socket disconnections/reconnections
- Lost messages during reconnection
- Performance issues
- Race conditions

## Root Cause

React's `useEffect` re-runs whenever any dependency changes. The problem is:
- We need the **latest values** of `auth` and `navigate` inside our callbacks
- But we don't want the effect to **re-run** when these values change
- We only want to reconnect when `auth.token` changes (login/logout)

## Solution Approaches

### Approach 1: Using Refs (Current Implementation - Stable)

```js
// Store latest values in refs
const authRef = useRef(auth);
const navigateRef = useRef(navigate);

// Update refs when values change (doesn't trigger useEffect)
useEffect(() => {
  authRef.current = auth;
}, [auth]);

useEffect(() => {
  navigateRef.current = navigate;
}, [navigate]);

// Create stable callbacks that use refs
const emitStoreSocketData = useCallback(async () => {
  const currentAuth = authRef.current;
  // Use currentAuth instead of auth
}, []);

// Socket effect only depends on token
useEffect(() => {
  // ... socket setup
}, [auth?.token, emitStoreSocketData]);
```

**Pros:**
- ✅ Works with current React version
- ✅ Stable and battle-tested pattern
- ✅ No experimental features

**Cons:**
- ❌ More verbose
- ❌ Requires manual ref management
- ❌ Less intuitive

### Approach 2: Using useEffectEvent (Future - Recommended)

```js
import { useEffectEvent } from './hooks/useEffectEvent';

// Create stable event handlers
const emitStoreSocketData = useEffectEvent(async () => {
  // Directly use auth - always gets latest value
  const data = {
    userId: auth?.id ?? auth?.userId,
    ufcc: auth?.ufcc
  };
  // ...
});

const handleSessionLogout = useEffectEvent(() => {
  // Directly use navigate - always gets latest value
  navigate('/login');
  // ...
});

// Socket effect only depends on token
useEffect(() => {
  // ... socket setup using emitStoreSocketData and handleSessionLogout
}, [auth?.token, emitStoreSocketData, handleSessionLogout]);
```

**Pros:**
- ✅ Cleaner, more intuitive code
- ✅ No manual ref management
- ✅ Better TypeScript support
- ✅ Matches React's future official API

**Cons:**
- ⚠️ Uses custom implementation (not official yet)
- ⚠️ Requires understanding of the pattern

## How useEffectEvent Works

```js
export function useEffectEvent(handler) {
  const handlerRef = useRef(null);

  // Update ref with latest handler after every render
  useLayoutEffect(() => {
    handlerRef.current = handler;
  });

  // Return stable callback that calls latest handler
  return useCallback((...args) => {
    const fn = handlerRef.current;
    return fn?.(...args);
  }, []);
}
```

**Key Points:**
1. Returns a **stable function reference** (never changes)
2. Internally stores the **latest handler** in a ref
3. When called, executes the **current version** of the handler
4. Dependencies can be omitted from `useEffect` deps array

## Migration Guide

### Before (Problematic)
```js
useEffect(() => {
  const onConnect = async () => {
    await registerSocketId({
      userId: auth?.id,  // Stale closure
      ufcc: auth?.ufcc   // Stale closure
    });
  };
  
  socket.on('connect', onConnect);
  
  return () => socket.off('connect', onConnect);
}, [auth?.token, auth?.id, auth?.ufcc]); // Re-runs on every auth change
```

### After (Using Refs - Current)
```js
const authRef = useRef(auth);
useEffect(() => { authRef.current = auth; }, [auth]);

const emitStoreSocketData = useCallback(async () => {
  await registerSocketId({
    userId: authRef.current?.id,
    ufcc: authRef.current?.ufcc
  });
}, []);

useEffect(() => {
  const onConnect = async () => {
    await emitStoreSocketData();
  };
  
  socket.on('connect', onConnect);
  
  return () => socket.off('connect', onConnect);
}, [auth?.token, emitStoreSocketData]); // Only re-runs on token change
```

### After (Using useEffectEvent - Future)
```js
const emitStoreSocketData = useEffectEvent(async () => {
  await registerSocketId({
    userId: auth?.id,    // Always latest
    ufcc: auth?.ufcc     // Always latest
  });
});

useEffect(() => {
  const onConnect = async () => {
    await emitStoreSocketData();
  };
  
  socket.on('connect', onConnect);
  
  return () => socket.off('connect', onConnect);
}, [auth?.token, emitStoreSocketData]); // Only re-runs on token change
```

## When to Use Each Approach

### Use Refs When:
- You need maximum stability
- Working with older React versions
- Team is unfamiliar with useEffectEvent pattern

### Use useEffectEvent When:
- You want cleaner, more maintainable code
- Team understands the pattern
- You're okay with custom hooks
- Preparing for future React versions

## Common Pitfalls

### ❌ Don't do this:
```js
useEffect(() => {
  // Using auth directly creates stale closure
  const handler = () => console.log(auth.userId);
  socket.on('event', handler);
}, []); // Empty deps - auth will be stale
```

### ✅ Do this instead:
```js
const handler = useEffectEvent(() => {
  console.log(auth.userId); // Always latest
});

useEffect(() => {
  socket.on('event', handler);
}, [handler]); // handler is stable
```

## Testing

```js
// Test that socket only reconnects on token change
test('socket reconnects only on token change', () => {
  const { rerender } = render(<App />);
  
  // Initial connection
  expect(initializeSocket).toHaveBeenCalledTimes(1);
  
  // Change non-token auth property
  rerender(<App auth={{ ...auth, userId: 'new-id' }} />);
  expect(initializeSocket).toHaveBeenCalledTimes(1); // Still 1
  
  // Change token
  rerender(<App auth={{ ...auth, token: 'new-token' }} />);
  expect(initializeSocket).toHaveBeenCalledTimes(2); // Reconnected
});
```

## References

- [React RFC: useEvent](https://github.com/reactjs/rfcs/blob/useevent/text/0000-useevent.md)
- [React Docs: Separating Events from Effects](https://react.dev/learn/separating-events-from-effects)
- [Dan Abramov's Blog: A Complete Guide to useEffect](https://overreacted.io/a-complete-guide-to-useeffect/)

## Files Created

1. `src/hooks/useEffectEvent.js` - Custom hook implementation
2. `src/hooks/useEffectEvent.example.js` - Usage examples
3. `docs/useEffectEvent-solution.md` - This documentation

## Current Implementation

The current `App.js` uses the **refs approach** for maximum stability. To migrate to `useEffectEvent`:

1. Import the hook: `import { useEffectEvent } from './hooks/useEffectEvent';`
2. Replace ref-based callbacks with `useEffectEvent` calls
3. Remove ref declarations and update effects
4. Test thoroughly

See `src/hooks/useEffectEvent.example.js` for a complete example.
