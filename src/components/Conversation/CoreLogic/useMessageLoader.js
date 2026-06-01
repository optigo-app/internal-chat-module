import { useCallback, useRef } from 'react';
import { conversationView } from '../../../API/ConversationView/ConversationView';
import { MSG } from './conversationReducer';
import { mergeMessages, getMessageId } from './messageHelpers';

export function useMessageLoader({ selectedCustomer, auth, pageSize, msgState, dispatchMsg, normalizeServerMessages, msgDataRef }) {
  const latestRequestRef = useRef(0);
  const abortControllerRef = useRef(null);
  const loadingRef = useRef(false);

  // Keep loadingRef in sync externally (call this from the parent hook)
  const syncLoadingRef = (val) => { loadingRef.current = val; };

  const loadConversation = useCallback(async (page = 1, reset = false, ignoreCache = false) => {
    if (loadingRef.current || !selectedCustomer?.ConversationId) return;

    const requestId = ++latestRequestRef.current;
    const controller = new AbortController();
    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = controller;

    const selectedId = selectedCustomer.ConversationId;
    const cacheKey = `chat_cache_${selectedId}`;
    let didShowCache = false;

    if (page === 1 && reset && !ignoreCache) {
      try {
        const cached = sessionStorage.getItem(cacheKey);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            dispatchMsg({ type: MSG.LOAD, data: parsed, total: parsed.length });
            dispatchMsg({ type: MSG.SET_HAS_MORE, value: false });
            didShowCache = true;
          }

        }
      } catch (e) { /* ignore parse errors */ }
    }

    if (!didShowCache) dispatchMsg({ type: MSG.SET_LOADING, value: true });

    try {
      const response = await conversationView(selectedId, page, pageSize, auth, 'ConvView', controller.signal);
      
      // CRITICAL: Double safety check against race conditions and stale requests
      if (requestId !== latestRequestRef.current || selectedId !== selectedCustomer?.ConversationId) return;

      const raw = Array.isArray(response.data?.rd) ? response.data.rd
        : (Array.isArray(response.data) ? response.data : []);
      const serverMessages = normalizeServerMessages(raw);

      const merged = mergeMessages(serverMessages, msgState.data, selectedId);
      dispatchMsg({ type: MSG.LOAD, data: merged, total: response.total });
      dispatchMsg({ type: MSG.SET_HAS_MORE, value: false });
      dispatchMsg({ type: MSG.SET_PAGE, value: page });
    } catch (err) {
      if (err.name !== 'AbortError') console.error('loadConversation error:', err);
    } finally {
      if (requestId === latestRequestRef.current) dispatchMsg({ type: MSG.SET_LOADING, value: false });
    }
  }, [selectedCustomer?.ConversationId, auth?.userId, pageSize, normalizeServerMessages]);

  const loadOlderMessages = useCallback(async (containerRef) => {
    if (msgState.loadingOlder || !msgState.hasMore || !selectedCustomer?.ConversationId) return;

    const requestId = ++latestRequestRef.current;
    const controller = new AbortController();
    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = controller;

    const nextPage = msgState.currentPage + 1;
    dispatchMsg({ type: MSG.SET_LOADING_OLDER, value: true });

    const container = containerRef?.current;
    const prevScrollHeight = container?.scrollHeight || 0;
    const prevScrollTop = container?.scrollTop || 0;

    const selectedId = selectedCustomer.ConversationId;
    try {
      const response = await conversationView(
        selectedId, nextPage, pageSize, auth, 'ConvView', controller.signal
      );
      
      // CRITICAL: Prevent merging older messages from a previous chat if the user switched while loading
      if (requestId !== latestRequestRef.current || selectedId !== selectedCustomer?.ConversationId) return;

      const raw = Array.isArray(response.data?.rd) ? response.data.rd : (Array.isArray(response.data) ? response.data : []);
      const serverMessages = normalizeServerMessages(raw);

      if (serverMessages.length === 0) {
        dispatchMsg({ type: MSG.SET_HAS_MORE, value: false });
        return;
      }

      const currentData = msgDataRef ? msgDataRef.current : msgState.data;
      const map = new Map();
      for (const m of currentData) { const k = getMessageId(m); if (k) map.set(k, m); }
      for (const m of serverMessages) { const k = getMessageId(m); if (k && !k.startsWith('temp_')) map.set(k, m); }

      const sorted = Array.from(map.values()).sort(
        (a, b) => new Date(a.DateTime).getTime() - new Date(b.DateTime).getTime()
      );

      dispatchMsg({ type: MSG.LOAD, data: sorted, total: response.total });
      dispatchMsg({ type: MSG.SET_HAS_MORE, value: serverMessages.length === pageSize });
      dispatchMsg({ type: MSG.SET_PAGE, value: nextPage });

      requestAnimationFrame(() => {
        if (container && prevScrollHeight > 0) {
          container.scrollTop = prevScrollTop + (container.scrollHeight - prevScrollHeight);
        }
      });
    } catch (err) {
      if (err.name !== 'AbortError') console.error('loadOlderMessages error:', err);
    } finally {
      if (requestId === latestRequestRef.current) dispatchMsg({ type: MSG.SET_LOADING_OLDER, value: false });
    }
  }, [msgState.loadingOlder, msgState.hasMore, msgState.currentPage, selectedCustomer?.ConversationId, pageSize, auth?.userId, normalizeServerMessages]);

  return { loadConversation, loadOlderMessages, abortControllerRef, syncLoadingRef };
}