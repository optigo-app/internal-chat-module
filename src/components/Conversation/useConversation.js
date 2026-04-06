import { useReducer, useRef, useCallback, useEffect, useMemo, useContext } from 'react';
import { LoginContext } from '../../context/LoginData';
import { messagesReducer, msgInitialState, MSG } from './CoreLogic/conversationReducer';
import { uiReducer, uiInitialState, UI } from './CoreLogic/uiReducer';
import { normalizeServerMessages as normalizeServerMessagesHelper, groupMessagesByDateHelper, saveConversationToCache } from './conversationUtils';
import { conversationView } from '../../API/ConversationView/ConversationView';
import { fetchGroupDetails } from '../../API/Groups/FetchGroupDetails';
import { formatDateHeader } from '../../utils/DateFnc';
import imageNotFound from '../../assets/image-not-found.jpg';

import { useMessageLoader } from './CoreLogic/useMessageLoader';
import { useSocketHandlers } from './CoreLogic/useSocketHandlers';
import { useReadReceipt } from './CoreLogic/useReadReceipt';
import { useMediaHandlers } from './CoreLogic/useMediaHandlers';
import { useMessageActions } from './CoreLogic/useMessageActions';
import { useForwardMessage } from './CoreLogic/useForwardMessage';

export const useConversation = (selectedCustomer, onConversationRead, onViewConversationRead, isDrawerOpen = false, onCustomerSelect = null) => {
  const { auth } = useContext(LoginContext);
  const [msgState, dispatchMsg] = useReducer(messagesReducer, msgInitialState);
  const [uiState, dispatchUI] = useReducer(uiReducer, uiInitialState);

  // ── Stable refs ────────────────────────────────────────────────────────────
  const selectedCustomerRef = useRef(selectedCustomer);
  const messagesRef = useRef(msgState.data);
  const groupMembersRef = useRef([]);
  const isAppFirstLoad = useRef(true);
  const cacheWriteTimer = useRef(null);
  const processedMsgIds = useRef(new Set());

  useEffect(() => { selectedCustomerRef.current = selectedCustomer; dispatchUI({ type: UI.SET_MEDIA_FILES, value: [] }); dispatchUI({ type: UI.SET_SHOW_MEDIA, value: false }); }, [selectedCustomer]);
  useEffect(() => { messagesRef.current = msgState.data; }, [msgState.data]);

  useEffect(() => {
    const timer = setTimeout(() => { isAppFirstLoad.current = false; }, 1000);
    return () => clearTimeout(timer);
  }, []);

  // ── Group members ──────────────────────────────────────────────────────────
  const fetchAndCacheGroupMembers = useCallback(async (conversationId, force = false) => {
    if (!conversationId || !auth) return { members: [], groupDetails: null };
    if (!force && groupMembersRef.current?.length > 0) {
      return { members: groupMembersRef.current, groupDetails: null };
    }
    try {
      const groupData = await fetchGroupDetails(conversationId, auth);
      const members = groupData?.members || [];
      groupMembersRef.current = members;
      return { members, groupDetails: groupData?.groupDetails };
    } catch {
      return { members: [], groupDetails: null };
    }
  }, [auth?.token, auth?.userId]);

  // ── Normalise helper (memoised by auth identity) ───────────────────────────
  const normalizeServerMessages = useCallback(
    (arr) => normalizeServerMessagesHelper(arr, auth),
    [auth?.token, auth?.userId]
  );

  const groupMessagesByDate = useMemo(
    () => groupMessagesByDateHelper(msgState.data),
    [msgState.data]
  );

  // ── Sub-hooks ──────────────────────────────────────────────────────────────
  const { loadConversation, loadOlderMessages, abortControllerRef } = useMessageLoader({
    selectedCustomer, auth, pageSize: 1000, msgState, dispatchMsg, normalizeServerMessages,
  });

  const { handleReadMessage } = useReadReceipt({
    auth, selectedCustomerRef, messagesRef, isDrawerOpen, onConversationRead, fetchAndCacheGroupMembers,
  });

  const { addUniqueMessage } = useSocketHandlers({
    auth, selectedCustomerRef, dispatchMsg, handleReadMessage,
  });

  const { handleAttachClick, processFiles, handleFileChange, handleMediaClick, handleClosePreview, uploadAndSendMedia } = useMediaHandlers({
    auth, selectedCustomer, uiState, dispatchUI, dispatchMsg, fetchAndCacheGroupMembers,
    onCustomerSelect, selectedCustomerRef, tempConversationId: msgState.tempConversationId,
  });

  const { handleSendMessage, handleEditMessage, handleDeleteMessage, handleReply, handleCancelReply } = useMessageActions({
    auth, selectedCustomer, uiState: { ...uiState, storeMessData: msgState.storeMessData }, dispatchUI, dispatchMsg,
    fetchAndCacheGroupMembers, onCustomerSelect, tempConversationId: msgState.tempConversationId, uploadAndSendMedia,
  });

  const { handleForward, handleCloseForward, handleSendForward } = useForwardMessage({
    auth, selectedCustomer, uiState, dispatchUI, dispatchMsg,
  });

  // ── Conversation-switch effects ────────────────────────────────────────────
  useEffect(() => {
    if (!selectedCustomer?.ConversationId) {
      dispatchMsg({ type: MSG.CLEAR });
      return;
    }
    loadConversation(1, true);
    groupMembersRef.current = [];
    processedMsgIds.current.clear();
    handleReadMessage(selectedCustomer.ConversationId, abortControllerRef.current?.signal);
  }, [selectedCustomer?.ConversationId]);

  useEffect(() => {
    const handleClear = (e) => {
      if (Number(e.detail.conversationId) === Number(selectedCustomer?.ConversationId)) {
        dispatchMsg({ type: MSG.CLEAR });
      }
    };
    window.addEventListener('CLEAR_CONVERSATION_MESSAGES', handleClear);
    return () => window.removeEventListener('CLEAR_CONVERSATION_MESSAGES', handleClear);
  }, [selectedCustomer?.ConversationId]);

  // ── Auto-read on focus / visibility ───────────────────────────────────────
  useEffect(() => {
    const fn = () => { if (document.visibilityState === 'visible' && selectedCustomerRef.current?.ConversationId) handleReadMessage(selectedCustomerRef.current.ConversationId, null, true); };
    window.addEventListener('focus', fn);
    document.addEventListener('visibilitychange', fn);
    return () => { window.removeEventListener('focus', fn); document.removeEventListener('visibilitychange', fn); };
  }, [handleReadMessage]);

  useEffect(() => {
    if (!isDrawerOpen && selectedCustomer?.ConversationId) handleReadMessage(selectedCustomer.ConversationId, null, true);
  }, [isDrawerOpen, selectedCustomer?.ConversationId, handleReadMessage]);

  useEffect(() => {
    if (selectedCustomer && onConversationRead) onConversationRead(true);
    if (selectedCustomer && onViewConversationRead) onViewConversationRead(true);
    return () => { if (onConversationRead) onConversationRead(false); if (onViewConversationRead) onViewConversationRead(false); };
  }, [selectedCustomer]);

  // ── Debounced cache write ──────────────────────────────────────────────────
  useEffect(() => {
    const id = selectedCustomer?.ConversationId;
    if (!id || !msgState.data.length) return;
    clearTimeout(cacheWriteTimer.current);
    cacheWriteTimer.current = setTimeout(() => saveConversationToCache(id, msgState.data), 800);
    return () => clearTimeout(cacheWriteTimer.current);
  }, [msgState.data, selectedCustomer?.ConversationId]);

  // ── Stable helpers missing from sub-hooks ─────────────────────────────────
  const getMediaSrcForMessage = useCallback((msg) => {
    if (!msg) return '';
    if (msg.previewUrl) return msg.previewUrl;
    if (!msg.MediaUrl && !msg.mediaId && !msg.mediaURL) {
      if (['image', 'video'].includes(msg.MessageType)) return imageNotFound;
      return '';
    }
    return '';
  }, []);

  // parseTemplateData — stub kept for API compatibility (template rendering handled downstream)
  const parseTemplateData = useCallback((msg) => msg, []);
  const searchMessages = useCallback(async (query) => {
    if (!selectedCustomer?.ConversationId || !query?.trim()) { dispatchUI({ type: UI.SET_SEARCH_RESULTS, value: [] }); return; }
    dispatchUI({ type: UI.SET_SEARCHING, value: true });
    try {
      const response = await conversationView(selectedCustomer.ConversationId, 1, 100, auth, 'SearchView', null, query);
      const raw = Array.isArray(response.data?.rd) ? response.data.rd : (Array.isArray(response.data) ? response.data : []);
      dispatchUI({ type: UI.SET_SEARCH_RESULTS, value: normalizeServerMessages(raw) });
    } catch { dispatchUI({ type: UI.SET_SEARCH_RESULTS, value: [] }); }
    finally { dispatchUI({ type: UI.SET_SEARCHING, value: false }); }
  }, [selectedCustomer?.ConversationId, auth?.token, normalizeServerMessages]);

  const scrollToMessage = useCallback(async (messageId, containerRef, attachmentId = null) => {
    if (!containerRef.current || !messageId) return;
    const sid = String(messageId);
    let el = containerRef.current.querySelector(`[data-message-id="${sid}"]`);

    if (!el) {
      const exists = msgState.data.some(m => String(m.MessageId || m.Id) === sid);
      if (!exists) {
        await loadConversation(1, true, true);
        await new Promise(resolve => {
          let attempts = 0;
          const check = () => {
            const found = containerRef.current?.querySelector(`[data-message-id="${sid}"]`);
            if (found || attempts++ > 30) return resolve(found);
            requestAnimationFrame(check);
          };
          requestAnimationFrame(check);
        });
        el = containerRef.current?.querySelector(`[data-message-id="${sid}"]`);
      }
    }

    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      dispatchUI({ type: UI.SET_BLINK, value: sid });
      if (attachmentId) {
        const msg = msgState.data.find(m => String(m.Id || m.MessageId) === sid);
        if (msg?.mediaItems) {
          const idx = msg.mediaItems.findIndex(i => String(i.attachmentId || i.Id) === String(attachmentId));
          if (idx >= 0) handleMediaClick(msg, idx);
        }
      }
      setTimeout(() => dispatchUI({ type: UI.SET_BLINK, value: null }), 3000);
    }
  }, [msgState.data, loadConversation, handleMediaClick]);

  const getMessageStatusIcon = useCallback((msg) => {
    const raw = msg?.Status ?? msg?.status ?? msg?.MessageStatus;
    if (typeof raw === 'string') { const l = raw.toLowerCase(); if (l === 'read') return 'read'; if (l === 'sent') return 'sent'; }
    const p = typeof raw === 'number' ? raw : parseInt(raw, 10);
    if (p === 3) return 'read'; if (p === 2) return 'delivered'; if (p === 1 || p === 0) return 'sent';
    return null;
  }, []);

  const getMediaKey = useCallback((msg, index) => msg?.Id ?? msg?.id ?? msg?.mediaId ?? msg?.MediaUrl ?? `m-${index}`, []);
  const markLoaded = useCallback((key) => dispatchUI({ type: UI.SET_LOADED_MEDIA, key }), []);

  // ── Public API ─────────────────────────────────────────────────────────────
  return {
    // State (flattened for drop-in compatibility)
    inputValue: uiState.inputValue,
    setInputValue: (v) => dispatchUI({ type: UI.SET_INPUT, value: v }),
    messages: { data: msgState.data, total: msgState.total },
    setMessages: (updater) => {
      const next = typeof updater === 'function' ? updater({ data: msgState.data, total: msgState.total }) : updater;
      dispatchMsg({ type: MSG.LOAD, data: Array.isArray(next) ? next : (next?.data ?? []), total: next?.total ?? 0 });
    },
    mediaFiles: uiState.mediaFiles,
    setMediaFiles: (v) => dispatchUI({ type: UI.SET_MEDIA_FILES, value: typeof v === 'function' ? v(uiState.mediaFiles) : v }),
    showMedia: uiState.showMedia,
    setShowMedia: (v) => dispatchUI({ type: UI.SET_SHOW_MEDIA, value: v }),
    loading: msgState.loading,
    loadingOlder: msgState.loadingOlder,
    hasMore: msgState.hasMore,
    currentPage: msgState.currentPage,
    uploadProgress: uiState.uploadProgress,
    loadedMedia: uiState.loadedMedia,
    setLoadedMedia: (v) => dispatchUI({ type: UI.SET_LOADED_MEDIA, key: v }),
    replyToMessage: uiState.replyToMessage,
    setReplyToMessage: (v) => dispatchUI({ type: UI.SET_REPLY, value: v }),
    forwardMessage: uiState.forwardMessage,
    forwardAnchorEl: uiState.forwardAnchorEl,
    setForwardAnchorEl: (v) => dispatchUI({ type: UI.SET_FORWARD_ANCHOR, value: v }),
    blinkMessageId: uiState.blinkMessageId,
    setBlinkMessageId: (v) => dispatchUI({ type: UI.SET_BLINK, value: v }),
    mediaViewerOpen: uiState.mediaViewerOpen,
    setMediaViewerOpen: (v) => dispatchUI({ type: UI.SET_VIEWER, open: v }),
    mediaViewerItems: uiState.mediaViewerItems,
    mediaViewerIndex: uiState.mediaViewerIndex,
    setMediaViewerIndex: (v) => dispatchUI({ type: UI.SET_VIEWER, index: v }),
    mediaViewerMessage: uiState.mediaViewerMessage,
    searchResults: uiState.searchResults,
    isSearching: uiState.isSearching,
    groupMessagesByDate,
    messId: msgState.messId,
    groupMembers: groupMembersRef.current,

    // Functions
    loadConversation,
    loadOlderMessages,
    handleAttachClick,
    handleFileChange,
    processFiles,
    handleMediaClick,
    handleClosePreview,
    handleSendMessage,
    handleReply,
    handleCancelReply,
    handleForward,
    handleCloseForward,
    handleSendForward,
    handleEditMessage,
    handleDeleteMessage,
    searchMessages,
    scrollToMessage,
    getMessageStatusIcon,
    getMediaSrcForMessage,
    parseTemplateData,
    getMediaKey,
    markLoaded,
    addUniqueMessage,
    formatDateHeader,
    fetchAndCacheGroupMembers,
    refresh: () => loadConversation(1, true, true),
  };
};