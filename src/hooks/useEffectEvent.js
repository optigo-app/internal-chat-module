import { useCallback, useLayoutEffect, useRef } from 'react';

/**
 * Custom implementation of React's experimental useEffectEvent hook.
 * This allows you to access the latest values of props/state in event handlers
 * without causing the effect to re-run.
 * 
 * @example
 * ```js
 * function Component({ userId, onSave }) {
 *   const onSaveEvent = useEffectEvent(onSave);
 *   
 *   useEffect(() => {
 *     // This effect only runs when userId changes
 *     // but onSaveEvent always has the latest onSave function
 *     const subscription = subscribe(userId, (data) => {
 *       onSaveEvent(data);
 *     });
 *     return () => subscription.unsubscribe();
 *   }, [userId]); // onSave is NOT in dependencies
 * }
 * ```
 * 
 * @param {Function} handler - The event handler function
 * @returns {Function} A stable function reference that always calls the latest handler
 */
export function useEffectEvent(handler) {
  const handlerRef = useRef(null);

  // Update the ref with the latest handler after every render
  // useLayoutEffect ensures this happens before any effects run
  useLayoutEffect(() => {
    handlerRef.current = handler;
  });

  // Return a stable callback that always calls the latest handler
  return useCallback((...args) => {
    const fn = handlerRef.current;
    return fn?.(...args);
  }, []);
}

/**
 * Alternative implementation using useInsertionEffect (React 18+)
 * This is slightly more performant as it runs before useLayoutEffect
 */
// import { useCallback, useInsertionEffect, useRef } from 'react';
// 
// export function useEffectEvent(handler) {
//   const handlerRef = useRef(null);
//   
//   useInsertionEffect(() => {
//     handlerRef.current = handler;
//   });
//   
//   return useCallback((...args) => {
//     const fn = handlerRef.current;
//     return fn?.(...args);
//   }, []);
// }
