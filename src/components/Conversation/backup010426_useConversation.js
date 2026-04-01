import { useState, useRef, useEffect, useCallback, useMemo, useContext } from 'react';
import { conversationView } from '../../API/ConversationView/ConversationView';
import { sendDocumentMessage, sendImageMessage, sendTextMessage, sendVideoMessage } from '../../API/SendMessage/SendMessageApi';
import { normalizeServerMessages as normalizeServerMessagesHelper, groupMessagesByDateHelper, saveConversationToCache } from './conversationUtils';

import { addMessageReactionHandler, addInternalMessageHandler, emitInternalMessageSend, addInternalStatusHandler, emitInternalMessageRead, addInternalMessageDeletionHandler, emitInternalMessageDelete, isSocketConnected } from '../../socket';
import { buildGroupMessagePayload } from '../../utils/groupSocketHelpers';
import { fetchGroupDetails } from '../../API/Groups/FetchGroupDetails';
import { readMessageApi } from '../../API/SendMessage/ReadMessageApi';
import { uploadMediaAPi } from '../../API/FileUpload/uploadHelpers';
import { toast } from 'react-hot-toast';
import { LoginContext } from '../../context/LoginData';
import { formatDateHeader, formatTime12h } from '../../utils/DateFnc';
import { forwardMessageApi } from '../../API/SendMessage/forwardMessageApi';
import { replyToMessageApi } from '../../API/SendMessage/replyToMessageApi';
import { editMessageApi } from '../../API/SendMessage/EditMessageApi';
import { deleteMessageApi } from '../../API/SendMessage/DeleteMessageApi';
import imageNotFound from '../../assets/image-not-found.jpg';
import { generateMediaFolderName, validateMediaFiles } from '../../utils/globalFunc';
import { showToast } from '../../utils/toastHelper';

// ─── Module-level helpers (no closure needed) ───────────────────────────────

let isAppFirstLoad = true;

/** Stable ID key for a message – works for both server & optimistic messages. */
const getMessageId = (msg) => {
    const primaryId = msg?.MessageId ?? msg?.Id ?? msg?.id;
    if (primaryId) return String(primaryId);
    return `temp_${msg?.Direction}_${msg?.Message}_${msg?.DateTime}`;
};

/** Normalise an array or object-wrapped messages list into a plain array. */
const normalizeMessagesList = (prev) =>
    Array.isArray(prev) ? prev : (prev?.data || []);

/** Return current time components (consistent with backend local-as-UTC pattern). */
const getISTTime = () => {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    const localISO = new Date(now.getTime() - offset).toISOString();

    return {
        time: formatTime12h(localISO),
        date: localISO.split('T')[0],
        dateTime: localISO,
    };
};

// ─── Hook ────────────────────────────────────────────────────────────────────

export const useConversation = (selectedCustomer, onConversationRead, onViewConversationRead, isDrawerOpen = false, onCustomerSelect = null) => {
    const [inputValue, setInputValue] = useState('');
    const [tagsList, setTagsList] = useState([]);
    const [messages, setMessages] = useState([]);
    const [tempConversationId, setTempConversationId] = useState(null);
    const [mediaFiles, setMediaFiles] = useState([]);
    const [assigneeList, setAssigneeList] = useState([]);
    const [selectedAssignees, setSelectedAssignees] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 100;
    const [loading, setLoading] = useState(false);
    const [loadingOlder, setLoadingOlder] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [uploadProgress, setUploadProgress] = useState({});
    const [loadedMedia, setLoadedMedia] = useState({});
    const [replyToMessage, setReplyToMessage] = useState(null);
    const [messId, setMessId] = useState('');
    const [storeMessData, setStoreMessData] = useState({ messageId: '' });
    const [forwardMessage, setForwardMessage] = useState(null);
    const [forwardAnchorEl, setForwardAnchorEl] = useState(null);
    const [blinkMessageId, setBlinkMessageId] = useState(null);
    const [mediaViewerOpen, setMediaViewerOpen] = useState(false);
    const [mediaViewerItems, setMediaViewerItems] = useState([]);
    const [showMedia, setShowMedia] = useState(false);
    const [mediaViewerIndex, setMediaViewerIndex] = useState(0);
    const [mediaViewerMessage, setMediaViewerMessage] = useState(null);
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [groupMembers, setGroupMembers] = useState([]);
    const groupMembersRef = useRef([]); // Stable ref for immediate access in nested callbacks

    const readTimeoutRef = useRef(null);
    const lastReadConvRef = useRef(null);
    const lastReadTimeRef = useRef(0);
    const lastReadMsgIdRef = useRef(null);

    const { auth } = useContext(LoginContext);

    // Refs — stable across renders, no subscription re-creation needed
    const selectedCustomerRef = useRef(selectedCustomer);
    const latestRequestRef = useRef(0);
    const abortControllerRef = useRef(null);
    const loadingRef = useRef(false);               // mirrors `loading` without causing dep cycles
    const processedMessageIds = useRef(new Set());
    const messagesRef = useRef([]);

    // ── Keep refs in sync ────────────────────────────────────────────────────

    useEffect(() => {
        selectedCustomerRef.current = selectedCustomer;
        setMediaFiles([]);
        setShowMedia(false);
    }, [selectedCustomer]);

    useEffect(() => {
        loadingRef.current = loading;
    }, [loading]);

    useEffect(() => {
        groupMembersRef.current = groupMembers;
    }, [groupMembers]);

    useEffect(() => {
        groupMembersRef.current = groupMembers;
    }, [groupMembers]);

    useEffect(() => {
        messagesRef.current = messages;
    }, [messages]);

    // One-time first-load flag reset
    useEffect(() => {
        if (isAppFirstLoad) {
            const timer = setTimeout(() => { isAppFirstLoad = false; }, 1000);
            return () => clearTimeout(timer);
        }
    }, []);

    // ── Memoised helpers ─────────────────────────────────────────────────────

    const markLoaded = useCallback((key) => {
        setLoadedMedia(prev => ({ ...prev, [key]: true }));
    }, []);

    /** Stable reference — only re-creates when `auth` object identity changes. */
    const normalizeServerMessages = useCallback(
        (messagesArray) => normalizeServerMessagesHelper(messagesArray, auth),
        [auth]
    );

    const groupMessagesByDate = useMemo(
        () => groupMessagesByDateHelper(messages),
        [messages]
    );

    const getMediaKey = useCallback(
        (msg, index) => msg?.Id ?? msg?.id ?? msg?.mediaId ?? msg?.MediaUrl ?? msg?.fileName ?? `m-${index}`,
        []
    );

    const fetchAndCacheGroupMembers = useCallback(async (conversationId, force = false) => {
        if (!conversationId || !auth) return [];

        // Return from cache if available and not forced
        if (!force && groupMembersRef.current && groupMembersRef.current.length > 0) {
            return groupMembersRef.current;
        }

        try {
            const groupData = await fetchGroupDetails(conversationId, auth);
            const members = groupData?.members || [];
            const memberIds = members.map(m => Number(m.UserId || m.userId || m.id)).filter(Boolean);

            setGroupMembers(memberIds);
            return memberIds;
        } catch (error) {
            console.error('Error fetching group members:', error);
            return [];
        }
    }, [auth]);

    const getMediaSrcForMessage = useCallback((msg) => {
        if (!msg) return '';
        if (msg.previewUrl) return msg.previewUrl;
        const id = msg.MediaUrl || msg.mediaId || msg.mediaURL || null;
        if (!id) {
            if (['image', 'video'].includes(msg.MessageType)) return imageNotFound;
            return '';
        }
        return '';
    }, []);

    // ── Incoming message deduplication ───────────────────────────────────────

    /**
     * Adds a socket-received message to state, deduplicating by ID.
     * Wrapped in useCallback so socket handler closures stay fresh without
     * re-registering the socket listener on every render.
     */
    const addUniqueMessage = useCallback((rawData) => {
        if (!rawData || typeof rawData !== 'object') return;

        const [normalized] = normalizeServerMessagesHelper([rawData], auth) || [];
        if (!normalized) return;

        const rawSenderId = Number(rawData?.SenderId ?? rawData?.Sender);
        const myId = Number(auth?.id ?? auth?.userId);
        const isMyMessage = !!(rawSenderId && myId && rawSenderId === myId);

        const normalizedDirection = isMyMessage ? 1
            : (normalized?.Direction === 2 ? 0 : (normalized?.Direction ?? 0));

        const normalizedWithDirection = { ...normalized, Direction: normalizedDirection };

        // Use the stable getMessageId helper for both deduplication and storage
        const incomingId = getMessageId(normalizedWithDirection);
        if (!incomingId) return;

        // Fast-path guard: skip if already processed (unless it's an edit)
        const isEdit = rawData?.IsEdited === 1 || rawData?.isEdited === 1;
        if (!isEdit && processedMessageIds.current.has(incomingId)) return;
        if (!isEdit) processedMessageIds.current.add(incomingId);

        setMessages((prevMessages) => {
            const prevData = normalizeMessagesList(prevMessages);
            const idx = prevData.findIndex(msg =>
                msg?.MessageId === incomingId || msg?.Id === incomingId || msg?.id === incomingId
            );

            let nextData;
            if (idx >= 0) {
                const existing = prevData[idx];
                nextData = [...prevData];
                nextData[idx] = {
                    ...existing,
                    ...normalizedWithDirection,
                    isUploading: existing.isUploading,
                    percent: existing.percent,
                };
            } else {
                nextData = [...prevData, normalizedWithDirection];
            }

            return Array.isArray(prevMessages)
                ? nextData
                : { ...prevMessages, data: nextData };
        });
    }, [auth]);

    // ── Read receipt ─────────────────────────────────────────────────────────
    const handleReadMessage = useCallback(async (custConverId, signal = null, force = false, skipDrawerCheck = false) => {
        if (!custConverId) return;
        if (document.visibilityState !== 'visible') return;
        if (!skipDrawerCheck && isDrawerOpen) return;

        const now = Date.now();
        // Skip if same conversation and read within last 3 seconds (unless forced)
        if (!force && lastReadConvRef.current === custConverId && (now - lastReadTimeRef.current < 3000)) {
            return;
        }

        // Helper to send individual socket hits for each participant
        const emitReadReceipt = (recipients, status, isGroup, conversationId) => {
            if (!isSocketConnected()) return;
            const idList = Array.isArray(recipients) ? recipients : [recipients];
            idList.forEach(id => {
                if (!id) return;
                emitInternalMessageRead({
                    ufcc: auth?.ufcc,
                    ReceiverId: Number(id),
                    ConversationId: conversationId,
                    IsGroup: isGroup ? 1 : 0,
                    Status: status,
                    MessageStatus: status,
                });
            });
        };

        // Debounce: wait for 1s of inactivity for sockets (better for large groups)
        if (readTimeoutRef.current) {
            clearTimeout(readTimeoutRef.current);
        }

        readTimeoutRef.current = setTimeout(async () => {
            try {
                const currentConv = selectedCustomerRef.current;
                const currentConvId = currentConv?.ConversationId;
                // Only proceed if still on the same conversation
                if (Number(currentConvId) !== Number(custConverId)) return;

                const isGroup = Boolean(currentConv?.IsGroup || currentConv?.isGroup);
                const receiverId =
                    currentConv?.ReceiverId ||
                    currentConv?.CustomerId ||
                    currentConv?.UserId;

                // Optimization: If socket is connected, we ONLY use the socket.
                // The server should update the DB upon receiving this event.
                if (isSocketConnected()) {
                    let receiverIdValue = receiverId;

                    // For groups, format ReceiverId as an array of member IDs
                    if (isGroup) {
                        try {
                            const memberIds = await fetchAndCacheGroupMembers(custConverId);
                            if (memberIds && memberIds.length > 0) {
                                // Already mapped to Numbers in fetchAndCacheGroupMembers
                                receiverIdValue = memberIds;
                            }
                        } catch (err) {
                            console.error('Error fetching group members for read receipt:', err);
                        }
                    }

                    if (onConversationRead) onConversationRead(true);

                    // Track which senders need a "Fully Read" (blue ticks) notification
                    const incomingUnreadMessages = normalizeMessagesList(messagesRef.current).filter(
                        (msg) => msg.Direction === 0 && msg.Status < 3
                    );

                    // Optimization: If no unread messages, stop here
                    if (incomingUnreadMessages.length === 0) return;

                    // Optimization: If the latest unread message is the same as the last one we processed, skip
                    const latestUnreadId = Math.max(...incomingUnreadMessages.map(msg => Number(msg.MessageId || msg.Id)).filter(id => !isNaN(id)));
                    if (lastReadMsgIdRef.current === latestUnreadId && lastReadConvRef.current === custConverId) {
                        return;
                    }

                    // Update individual seen statuses
                    emitReadReceipt(receiverIdValue, 2, isGroup, custConverId);

                    // Update local last-read tracking
                    lastReadConvRef.current = custConverId;
                    lastReadTimeRef.current = Date.now();
                    lastReadMsgIdRef.current = latestUnreadId;

                    if (onConversationRead) onConversationRead(true);

                    // Process unique sender IDs for full read notification
                    const unreadSenderIds = [...new Set(incomingUnreadMessages.map(msg => Number(msg.SenderId || msg.Sender)).filter(Boolean))];

                    const response = await readMessageApi(auth, {
                        ConversationId: custConverId,
                        signal
                    });

                    // If everyone has read the message (fully read), notify the sender(s)
                    if (response?.Data?.rd?.[0]?.MsgRead === 1 && unreadSenderIds.length > 0) {
                        emitReadReceipt(isGroup ? unreadSenderIds : receiverId, 3, isGroup, custConverId);
                    }
                    return;
                }

                // Fallback: If socket is disconnected, use the REST API

                lastReadConvRef.current = custConverId;
                lastReadTimeRef.current = Date.now();

                // if (response?.rd && onConversationRead) onConversationRead(true);
            } catch (error) {
                console.error('Error in handleReadMessage:', error);
            }
        }, 1000); // 1s debounce to prevent event storms during scroll
    }, [auth, onConversationRead, isDrawerOpen]);

    // ── Socket handlers (registered once per auth token change) ─────────────
    useEffect(() => {
        if (!auth?.token || !auth?.userId) return;

        const handleChangeStatus = (data) => {
            if (!data || typeof data !== 'object') return;
            setMessId(data?.MessageId);

            if (data?.MessageId) {
                setStoreMessData(prev => ({ ...prev, messageId: data.MessageId }));
            }
            setTempConversationId(data?.ConversationId);

            setMessages((prevMessages) => {
                const prevData = normalizeMessagesList(prevMessages);

                const messageExists = (msg) =>
                    msg?.Id === data?.Id ||
                    msg?.id === data?.id ||
                    msg?.MessageId === data?.MessageId ||
                    (msg?.Message === data?.Message &&
                        msg?.Direction === 1 &&
                        Math.abs(
                            new Date(msg?.DateTime || msg?.dateTime) -
                            new Date(data?.DateTime || data?.dateTime)
                        ) < 60000);

                const resolveNextStatus = () => {
                    const raw = data?.MessageStatus ?? data?.status ?? data?.Status;
                    if (typeof raw === 'string') {
                        const lowered = raw.toLowerCase();
                        if (lowered === 'read') return 3;
                        if (lowered === 'sent') return 1;
                        if (lowered === 'delivered') return 2;
                        if (lowered === 'failed') return 4;
                    }
                    const parsed = typeof raw === 'number' ? raw : parseInt(raw, 10);
                    if (Number.isNaN(parsed)) return 0;
                    if (data?.MessageStatus !== undefined && data?.MessageStatus !== null) {
                        if (parsed === 3) return 3;
                        if (parsed === 2) return 2;
                        if (parsed === 1 || parsed === 0) return 1;
                    }
                    return parsed;
                };

                const isValidTransition = (current, next) => {
                    if (current === next) return true;
                    const validTransitions = { 0: [1, 2, 3, 4], 1: [2, 3, 4], 2: [3, 4], 3: [], 4: [] };
                    if (!(current in validTransitions)) return true;
                    return validTransitions[current].includes(next);
                };

                const conversationId = data?.ConversationId;
                const shouldMarkAllInConversation = Boolean(conversationId) && !data?.MessageId;

                return {
                    ...prevMessages,
                    data: prevData.map((msg) => {
                        if (msg?.Direction !== 1) return msg;

                        if (shouldMarkAllInConversation) {
                            if (Number(msg?.ConversationId) !== Number(conversationId)) return msg;
                            const newStatus = resolveNextStatus();
                            const currentStatus = parseInt(msg?.Status, 10);
                            const safeCurrent = Number.isNaN(currentStatus) ? 0 : currentStatus;
                            if (safeCurrent >= newStatus) return msg;
                            return { ...msg, Status: newStatus };
                        }

                        if (!messageExists(msg)) return msg;

                        const newStatus = resolveNextStatus();
                        const currentStatus = parseInt(msg?.Status, 10);
                        const safeCurrent = Number.isNaN(currentStatus) ? 0 : currentStatus;

                        if (!isValidTransition(safeCurrent, newStatus)) return msg;

                        return {
                            ...msg,
                            Status: newStatus,
                            SenderInfo: msg.SenderInfo || data.SenderInfo,
                            ...(data.MessageId && { messageId: data.MessageId }),
                            ...(data.timestamp && { timestamp: data.timestamp }),
                            DateTime: data.DateTime || msg.DateTime,
                        };
                    }),
                };
            });
        };

        const handleReactionMessage = (data) => {
            if (data._isFromCurrentUser) return;

            // Skip if the reaction was sent by the current user — they already applied an
            // optimistic update locally in Conversation.js, so we must not double-apply it.
            const myId = Number(auth?.id ?? auth?.userId);
            const senderId = Number(data?.SenderId ?? data?.userId ?? data?.UserId);
            if (myId && senderId && myId === senderId) return;

            setMessages((prevMessages) => {
                const prevData = normalizeMessagesList(prevMessages);
                let messageUpdated = false;

                const updatedMessagesList = prevData.map(msg => {
                    const msgId = msg?.MessageId || msg?.Id || msg?.id;
                    const dataId = data?.MessageId || data?.Id || data?.id;

                    if (String(msgId) !== String(dataId)) return msg;
                    messageUpdated = true;

                    let existingReactions = [];
                    try { existingReactions = msg.ReactionEmojis ? JSON.parse(msg.ReactionEmojis) : []; }
                    catch (e) { console.error('Error parsing existing reactions:', e); }

                    let newReactions = [];
                    try {
                        newReactions = data.ReactionEmojis
                            ? (typeof data.ReactionEmojis === 'string' ? JSON.parse(data.ReactionEmojis) : data.ReactionEmojis)
                            : [];
                    } catch (e) { console.error('Error parsing new reactions:', e); }

                    const isRemoval = newReactions.some(r => r.Direction === 0 && (!r.Reaction || r.Reaction === ''));
                    if (isRemoval) {
                        // Resolve who removed — prefer UserId embedded in the emoji object, then data fields
                        const removerUserId = String(
                            newReactions.find(r => r.Direction === 0)?.UserId ??
                            data?.SenderId ?? data?.userId ?? data?.UserId ?? ''
                        );
                        // Try UserId-based removal first (works when reactions carry UserId)
                        let filtered = removerUserId
                            ? existingReactions.filter(r => String(r.UserId) !== removerUserId)
                            : existingReactions;
                        // Fallback: if nothing matched (legacy reactions stored without UserId),
                        // remove all Direction=0 reactions so the reaction doesn't stay stuck
                        if (filtered.length === existingReactions.length) {
                            filtered = existingReactions.filter(r => r.Direction !== 0);
                        }
                        return { ...msg, ReactionEmojis: JSON.stringify(filtered) };
                    }
                    if (newReactions.length === 0) return msg;

                    const nonClientReactions = existingReactions.filter(r => r.Direction !== 0);
                    const clientReactions = existingReactions.filter(r => r.Direction === 0);
                    newReactions.forEach(reaction => {
                        if (reaction.Direction === 0 && reaction.Reaction) {
                            const idx = clientReactions.findIndex(r => r.Reaction === reaction.Reaction);
                            if (idx >= 0) clientReactions[idx] = reaction;
                            else clientReactions.push(reaction);
                        }
                    });

                    return { ...msg, ReactionEmojis: JSON.stringify([...nonClientReactions, ...clientReactions]) };
                });

                if (!messageUpdated && data.ReactionEmojis) {
                    try {
                        const newReactions = typeof data.ReactionEmojis === 'string'
                            ? JSON.parse(data.ReactionEmojis)
                            : data.ReactionEmojis;
                        const validReactions = newReactions.filter(r => r.Reaction && r.Reaction.trim() !== '');
                        if (validReactions.length > 0) {
                            updatedMessagesList.push({ ...data, ReactionEmojis: JSON.stringify(validReactions) });
                        }
                    } catch (e) { console.error('Error processing new message with reactions:', e); }
                }

                return Array.isArray(prevMessages)
                    ? updatedMessagesList
                    : { ...prevMessages, data: updatedMessagesList };
            });
        };

        const handleInternalMessage = (data) => {
            if (!data || typeof data !== 'object') return;
            if (Number(data?.Sender) === auth?.id || Number(data?.SenderId) === auth?.id) return;

            const incomingConvId = data?.ConversationId;
            const activeConvId = selectedCustomerRef.current?.ConversationId;

            if (activeConvId && incomingConvId && Number(activeConvId) === Number(incomingConvId)) {
                setMessId(data?.MessageId);
                addUniqueMessage(data);
                handleReadMessage(incomingConvId, null, false, true); // skipDrawerCheck = true for incoming messages
            }
        };

        const handleDeleteMessageSocket = (data) => {
            const myId = Number(auth?.id ?? auth?.userId);
            const senderId = Number(data?.UserId ?? data?.SenderId ?? data?.senderId);
            if (myId && senderId && myId === senderId) return;

            setMessages((prevMessages) => {
                const prevData = normalizeMessagesList(prevMessages);
                const updatedData = prevData.map(msg => {
                    const msgId = msg.MessageId || msg.Id || msg.id;
                    if (String(msgId) === String(data.MessageId)) {
                        return {
                            ...msg,
                            Message: data.Message || "This message was deleted.",
                            Message1: data.Message1 || "You deleted this message.",
                            IsDeletedForEveryone: 1,
                            DeletedAt: data.DeletedAt || new Date().toISOString(),
                            Attachments: null,
                            attachments: null,
                            MediaUrl: null,
                            mediaItems: null,
                            MessageType: 'text',
                        };
                    }
                    return msg;
                });
                return Array.isArray(prevMessages) ? updatedData : { ...prevMessages, data: updatedData };
            });
        };

        const removeMessageReactionHandler = addMessageReactionHandler(handleReactionMessage);
        const removeStatusHandler = addInternalStatusHandler(handleChangeStatus);
        const removeInternalMessageHandler = addInternalMessageHandler(handleInternalMessage);
        const removeDeleteHandler = addInternalMessageDeletionHandler(handleDeleteMessageSocket);

        return () => {
            removeMessageReactionHandler();
            removeStatusHandler();
            removeInternalMessageHandler();
            removeDeleteHandler();
        };
    }, [auth?.token, auth?.userId, addUniqueMessage, handleReadMessage]);

    // ── Conversation loading ─────────────────────────────────────────────────

    const loadConversation = useCallback(
        async (page = 1, reset = false, ignoreCache = false) => {
            // Use ref to read latest loading state without making it a dep
            if (loadingRef.current || !selectedCustomer?.ConversationId) return;

            const requestId = ++latestRequestRef.current;
            if (abortControllerRef.current) abortControllerRef.current.abort();
            const controller = new AbortController();
            abortControllerRef.current = controller;

            const selectedId = selectedCustomer?.ConversationId;
            const cacheKey = `chat_cache_${selectedId}`;
            let didShowCache = false;

            if (page === 1 && reset && !isAppFirstLoad && !ignoreCache) {
                const cachedData = sessionStorage.getItem(cacheKey);
                if (cachedData) {
                    try {
                        const parsed = JSON.parse(cachedData);
                        if (Array.isArray(parsed) && parsed.length > 0) {
                            setMessages({ data: parsed, total: parsed.length });
                            setHasMore(true);
                            didShowCache = true;
                            const unreadCount = Number(selectedCustomer?.unreadCount ?? selectedCustomer?.UnreadCount ?? 0);
                            if (unreadCount === 0) return;
                        }
                    } catch (e) {
                        console.error('Error parsing chat cache:', e);
                    }
                }
            }

            if (!didShowCache) setLoading(true);

            try {
                const response = await conversationView(selectedId, page, pageSize, auth, 'ConvView', controller.signal);
                if (requestId !== latestRequestRef.current) return;

                const rawServerMessages = Array.isArray(response.data?.rd)
                    ? response.data.rd
                    : (Array.isArray(response.data) ? response.data : []);
                const serverMessages = normalizeServerMessages(rawServerMessages);

                setMessages((prevMessages) => {
                    const prevData = Array.isArray(prevMessages?.data)
                        ? prevMessages.data
                        : (Array.isArray(prevMessages) ? prevMessages : []);

                    const recentSocketMessages = reset
                        ? prevData.filter(m => Number(m.ConversationId) === Number(selectedId))
                        : prevData;

                    const optimisticMessages = recentSocketMessages.filter(
                        m => m && m.Direction === 1 && (m.status === 'pending' || m.status === 3)
                    );

                    const messageMap = new Map();

                    for (const sm of serverMessages) {
                        const id = getMessageId(sm);
                        if (id && !id.startsWith('temp_')) messageMap.set(id, sm);
                    }

                    for (const msg of recentSocketMessages) {
                        const id = getMessageId(msg);
                        if (!id || messageMap.has(id)) continue;
                        if (id.startsWith('temp_')) {
                            const msgTs = new Date(msg.DateTime).getTime();
                            const existsOnServer = serverMessages.some(sm => {
                                const smTs = new Date(sm?.DateTime).getTime();
                                return sm?.Direction === msg?.Direction &&
                                    sm?.Message === msg?.Message &&
                                    Math.abs((smTs || 0) - (msgTs || 0)) < 15000;
                            });
                            if (existsOnServer) continue;
                        }
                        messageMap.set(id, msg);
                    }

                    for (const om of optimisticMessages) {
                        const id = getMessageId(om);
                        if (!id || messageMap.has(id)) continue;
                        const omTs = new Date(om.DateTime).getTime();
                        const existsOnServer = serverMessages.some(sm => {
                            const smTs = new Date(sm?.DateTime).getTime();
                            return sm?.Direction === om?.Direction &&
                                sm?.Message === om?.Message &&
                                Math.abs((smTs || 0) - (omTs || 0)) < 15000;
                        });
                        if (!existsOnServer) messageMap.set(id, om);
                    }

                    const merged = Array.from(messageMap.values()).sort(
                        (a, b) => new Date(a?.DateTime).getTime() - new Date(b?.DateTime).getTime()
                    );

                    return { data: merged, total: response.total };
                });

                if (requestId === latestRequestRef.current) {
                    setHasMore(response.hasMore);
                    setCurrentPage(page);
                }
            } catch (error) {
                if (error.name !== 'AbortError' && error.message !== 'AbortError') {
                    console.error('Error loading conversation:', error);
                }
            } finally {
                if (requestId === latestRequestRef.current) setLoading(false);
            }
        },
        // Removed `loading` from deps — use loadingRef.current instead to avoid re-creation on every loading toggle
        [pageSize, selectedCustomer, auth?.userId, normalizeServerMessages]
    );

    const loadOlderMessages = useCallback(async (containerRef) => {
        if (loadingOlder || !hasMore || !selectedCustomer?.ConversationId) return;

        const requestId = ++latestRequestRef.current;
        if (abortControllerRef.current) abortControllerRef.current.abort();
        const controller = new AbortController();
        abortControllerRef.current = controller;

        const nextPage = currentPage + 1;
        setLoadingOlder(true);

        const container = containerRef.current;
        const previousScrollHeight = container ? container.scrollHeight : 0;
        const previousScrollTop = container ? container.scrollTop : 0;

        try {
            const response = await conversationView(
                selectedCustomer?.ConversationId,
                nextPage,
                pageSize,
                auth,
                'ConvView',
                controller.signal
            );
            if (requestId !== latestRequestRef.current) return;

            const rawOlderMessages = Array.isArray(response.data?.rd)
                ? response.data.rd
                : (Array.isArray(response.data) ? response.data : []);

            const serverMessages = normalizeServerMessages(rawOlderMessages);

            setMessages(prevMessages => {
                const prevData = Array.isArray(prevMessages?.data) ? prevMessages.data : [];
                const messageMap = new Map();

                for (const m of prevData) {
                    const key = getMessageId(m);
                    if (key) messageMap.set(key, m);
                }
                for (const m of serverMessages) {
                    const key = getMessageId(m);
                    if (key && !key.startsWith('temp_')) messageMap.set(key, m);
                }

                const unique = Array.from(messageMap.values());
                unique.sort((a, b) => new Date(a?.DateTime).getTime() - new Date(b?.DateTime).getTime());

                return { data: unique, total: response.total };
            });

            setHasMore((serverMessages?.length || 0) === pageSize);
            setCurrentPage(nextPage);

            requestAnimationFrame(() => {
                if (container && previousScrollHeight > 0) {
                    container.scrollTop = previousScrollTop + (container.scrollHeight - previousScrollHeight);
                }
            });
        } catch (error) {
            if (error.name !== 'AbortError' && error.message !== 'AbortError') {
                console.error('Error loading older messages:', error);
            }
        } finally {
            if (requestId === latestRequestRef.current) setLoadingOlder(false);
        }
    }, [loadingOlder, hasMore, selectedCustomer?.ConversationId, currentPage, pageSize, auth?.userId, normalizeServerMessages]);

    // ── Conversation selection effects ───────────────────────────────────────

    useEffect(() => {
        const handleClearMessages = (event) => {
            const { conversationId } = event.detail;
            if (Number(conversationId) === Number(selectedCustomer?.ConversationId)) {
                setMessages({ data: [], total: 0 });
                setCurrentPage(1);
                setHasMore(false);
            }
        };

        window.addEventListener('CLEAR_CONVERSATION_MESSAGES', handleClearMessages);
        return () => {
            window.removeEventListener('CLEAR_CONVERSATION_MESSAGES', handleClearMessages);
        };
    }, [selectedCustomer?.ConversationId]);

    useEffect(() => {
        if (!selectedCustomer?.ConversationId) {
            setMessages({ data: [], total: 0 });
            setCurrentPage(1);
            setHasMore(true);
            setTempConversationId(null);
            return;
        }

        if (selectedCustomer?.ConversationId == tempConversationId) {
            loadConversation(currentPage, true);
        } else {
            loadConversation(1, true);
            setCurrentPage(1);
        }

        // Reset group members when switching conversations
        setGroupMembers([]);

        handleReadMessage(selectedCustomer?.ConversationId, abortControllerRef.current?.signal);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedCustomer?.ConversationId]);

    // Mark as read on window focus / visibility change
    useEffect(() => {
        const handleAutoRead = () => {
            if (document.visibilityState === 'visible' && selectedCustomerRef.current?.ConversationId) {
                handleReadMessage(selectedCustomerRef.current.ConversationId, null, true);
            }
        };

        window.addEventListener('focus', handleAutoRead);
        document.addEventListener('visibilitychange', handleAutoRead);
        return () => {
            window.removeEventListener('focus', handleAutoRead);
            document.removeEventListener('visibilitychange', handleAutoRead);
        };
    }, [handleReadMessage]);

    // Mark as read when drawer/panel is closed
    useEffect(() => {
        if (!isDrawerOpen && selectedCustomer?.ConversationId) {
            handleReadMessage(selectedCustomer.ConversationId, null, true);
        }
    }, [isDrawerOpen, selectedCustomer?.ConversationId, handleReadMessage]);

    // Notify parent about conversation read state
    useEffect(() => {
        if (selectedCustomer && onConversationRead) onConversationRead(true);
        if (selectedCustomer && onViewConversationRead) onViewConversationRead(true);

        return () => {
            if (onConversationRead) onConversationRead(false);
            if (onViewConversationRead) onViewConversationRead(false);
        };
    }, [selectedCustomer, onConversationRead, onViewConversationRead]);

    // Cache sync: persist messages to sessionStorage on change
    useEffect(() => {
        const conversationId = selectedCustomer?.ConversationId;
        const messagesData = Array.isArray(messages) ? messages : messages?.data;
        if (conversationId && Array.isArray(messagesData) && messagesData.length > 0) {
            saveConversationToCache(conversationId, messagesData);
        }
    }, [messages, selectedCustomer?.ConversationId]);

    // ── File/media handlers ──────────────────────────────────────────────────
    const handleAttachClick = useCallback(() => {
        setShowMedia(prev => !prev);
    }, []);

    const processFiles = useCallback(async (files) => {
        if (!files || files.length === 0) return;

        const validation = validateMediaFiles(files);
        const { acceptedFiles, skippedSize, skippedTotal, skippedCount } = validation;

        if (skippedCount > 0) {
            showToast(`Only 30 files are allowed. ${skippedCount} file(s) were removed.`, 'error', { id: 'too-many-files' });
        }
        if (skippedSize.length > 0) {
            const fileList = skippedSize.length > 2
                ? `${skippedSize.slice(0, 2).join(', ')} and ${skippedSize.length - 2} more`
                : skippedSize.join(', ');
            showToast(`Files too large (>100MB): ${fileList}. They were removed.`, 'error', { id: 'file-too-large' });
        }
        if (skippedTotal.length > 0) {
            showToast('Total selection exceeds 100MB. Remaining files were removed.', 'error', { id: 'total-too-large' });
        }
        if (acceptedFiles.length === 0) return;

        const newMediaFiles = acceptedFiles.map(file => ({
            file,
            preview: URL.createObjectURL(file),
            type: file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : 'file',
            name: file.name,
            size: file.size,
        }));

        setMediaFiles(newMediaFiles);
        setShowMedia(true);

        const progressUpdates = {};
        newMediaFiles.forEach(media => {
            progressUpdates[media.name] = { progress: 0, status: 'uploading' };
        });
        setUploadProgress(prev => ({ ...prev, ...progressUpdates }));
    }, []);

    const handleFileChange = useCallback(async (e) => {
        const files = Array.from(e.target.files);
        await processFiles(files);
    }, [processFiles]);

    const handleMediaClick = useCallback((message, index) => {
        if (message.mediaItems && message.mediaItems.length > 0) {
            const mediaItems = message.mediaItems.map(item => ({
                src: item.url,
                type: item.mimeType?.startsWith('image/')
                    ? 'image'
                    : item.mimeType?.startsWith('video/')
                        ? 'video'
                        : 'document',
                name: item.filename || item.fileName || 'Media',
                mimeType: item.mimeType,
                size: item.size,
                attachmentId: item.attachmentId,
            }));
            setMediaViewerItems(mediaItems);
            setMediaViewerIndex(index);
            setMediaViewerMessage(message);
            setMediaViewerOpen(true);
        }
    }, []);

    const handleClosePreview = useCallback(() => {
        setMediaFiles([]);
        setShowMedia(false);
    }, []);

    const emitSocketMessage = useCallback(async ({ messageId, message, isEdited = 0, extra = {} }) => {
        if (!selectedCustomer?.ConversationId || !auth?.ufcc) return;
        const { dateTime } = getISTTime();

        const isGroup = selectedCustomer?.IsGroup === 1;
        let receiverIdValue;
        if (isGroup) {
            try {
                const memberIds = await fetchAndCacheGroupMembers(selectedCustomer.ConversationId);
                receiverIdValue = memberIds.length > 0
                    ? memberIds
                    : [selectedCustomer?.ReceiverId || selectedCustomer?.UserId];
            } catch (error) {
                console.error('Error fetching group members for socket emit:', error);
                receiverIdValue = [selectedCustomer?.ReceiverId || selectedCustomer?.UserId];
            }
        } else {
            receiverIdValue = selectedCustomer?.ReceiverId || selectedCustomer?.UserId;
        }

        const payload = buildGroupMessagePayload({
            message,
            conversationId: selectedCustomer.ConversationId,
            receiverIds: receiverIdValue,
            auth,
            attachments: null,
            replyTo: 0,
            direction: 0,
            messageId,
            isEdited,
            dateTime,
        });

        emitInternalMessageSend({
            ...payload,
            ...extra,
            receiveEvent: 'internal:msg_receive',
        });
    }, [auth, selectedCustomer]);

    const handleEditMessage = useCallback(async (messageId, newMessage) => {
        if (!messageId || !newMessage.trim()) return;
        const { time, date, dateTime } = getISTTime();
        try {
            const response = await editMessageApi(auth, { messageId, newMessage });
            if (response?.Data?.rd?.[0]?.stat == 1) {
                const editedMessage = response.Data.rd[0];
                setMessages(prev => {
                    const prevData = normalizeMessagesList(prev);
                    const updatedData = prevData.map(msg => {
                        const msgId = msg.MessageId || msg.Id || msg.id;
                        if (String(msgId) === String(messageId)) {
                            return {
                                ...msg,
                                Message: editedMessage.Message,
                                IsEdited: 1,
                                Direction: 1,
                                Time: time,
                                Date: date,
                            };
                        }
                        return msg;
                    });
                    return Array.isArray(prev) ? updatedData : { ...prev, data: updatedData };
                });
                await emitSocketMessage({ messageId, message: editedMessage.Message, isEdited: 1 });
                toast.success("Message edited successfully");
            } else {
                toast.error(response?.Message || "Failed to edit message");
            }
        } catch (error) {
            console.error("Error editing message:", error);
            toast.error("Error editing message");
        }
    }, [auth, addUniqueMessage, emitSocketMessage]);

    const handleDeleteMessage = useCallback(async (messageId, mode) => {
        if (!messageId) return;
        try {
            const response = await deleteMessageApi(auth, messageId, mode, selectedCustomer?.ConversationId);
            const deletedInfo = response?.Data?.rd?.[0] || response?.rd?.[0];

            if (deletedInfo?.stat != 0) {
                setMessages(prev => {
                    const prevData = normalizeMessagesList(prev);

                    if (Number(mode) === 2) {
                        // mode 2: Delete for Everyone -> Update message content
                        const updatedData = prevData.map(msg => {
                            const msgId = msg.MessageId || msg.Id || msg.id;
                            if (String(msgId) === String(messageId)) {
                                return {
                                    ...msg,
                                    Message: deletedInfo.Message || "This message was deleted.",
                                    Message1: deletedInfo.Message1 || "You deleted this message.",
                                    IsDeletedForEveryone: 1,
                                    DeletedAt: deletedInfo.DeletedAt || new Date().toISOString(),
                                    // Clear all media/attachments
                                    Attachments: null,
                                    attachments: null,
                                    MediaUrl: null,
                                    mediaId: null,
                                    mediaItems: null,
                                    AttachmentCount: 0,
                                    MessageType: 'text', // Reset to text
                                };
                            }
                            return msg;
                        });

                        // Socket emit for Delete for Everyone
                        if (Number(mode) === 2) {
                            (async () => {
                                const senderId = auth?.id ?? auth?.userId;
                                const isGroup = selectedCustomer?.IsGroup === 1;
                                let receiverIdValue;

                                if (isGroup) {
                                    try {
                                        const memberIds = await fetchAndCacheGroupMembers(selectedCustomer.ConversationId);
                                        receiverIdValue = memberIds.length > 0 ? memberIds : [selectedCustomer?.ReceiverId];
                                    } catch {
                                        receiverIdValue = [selectedCustomer?.ReceiverId];
                                    }
                                } else {
                                    receiverIdValue = selectedCustomer?.ReceiverId;
                                }

                                emitInternalMessageDelete({
                                    ufcc: auth?.ufcc,
                                    UserId: senderId,
                                    SenderId: senderId,
                                    ReceiverId: receiverIdValue,
                                    ConversationId: selectedCustomer?.ConversationId,
                                    MessageId: messageId,
                                    Message: deletedInfo.Message || "This message was deleted.",
                                    Message1: deletedInfo.Message1 || "You deleted this message.",
                                    MessageType: 1,
                                    IsDeletedForEveryone: 1,
                                    DeletedAt: deletedInfo.DeletedAt || new Date().toISOString(),
                                });
                            })();
                        }

                        return Array.isArray(prev) ? updatedData : { ...prev, data: updatedData };
                    } else {
                        // mode 1: Delete for Me -> Remove from list
                        const updatedData = prevData.filter(msg => {
                            const msgId = msg.MessageId || msg.Id || msg.id;
                            return String(msgId) !== String(messageId);
                        });
                        return Array.isArray(prev) ? updatedData : { ...prev, data: updatedData };
                    }
                });
                toast.success("Message deleted successfully");
            } else {
                toast.error(response?.Message || "Failed to delete message");
            }
        } catch (error) {
            console.error("Error deleting message:", error);
            toast.error("Error deleting message");
        }
    }, [auth, selectedCustomer]);

    const uploadAndSendMedia = useCallback(async ({ files, caption, type, tempId, time, date, dateTime }) => {
        const safeFiles = Array.isArray(files) ? files.filter(f => f instanceof File) : [];
        if (!safeFiles.length) return;
        const getUrl = u => u?.url ?? u?.Url ?? u?.fileUrl ?? u?.fileURL ?? u?.FileUrl ?? u?.FileURL ?? u?.path ?? u?.Path ?? null;
        const getName = u => u?.fileName ?? u?.filename ?? u?.FileName ?? u?.name ?? u?.originalName ?? u?.originalname ?? null;
        try {
            const convIdForFolder = selectedCustomer?.ConversationId || tempConversationId || null;
            const folderCategory = type === 'image' ? 'images' : type === 'video' ? 'videos' : 'docs';
            const folderName = generateMediaFolderName(convIdForFolder, folderCategory);

            const resp = await uploadMediaAPi({
                folderName,
                files: safeFiles,
                onProgress: (percent) => {
                    setMessages(prev => ({
                        data: normalizeMessagesList(prev).map(m =>
                            m.Id === tempId
                                ? { ...m, isUploading: true, percent: Math.max(0, Math.min(99, Number(percent) || 0)) }
                                : m
                        ),
                        total: prev?.total || 0,
                    }));
                },
            });

            const uploaded = Array.isArray(resp) ? resp : [];
            const uploadedUrls = safeFiles
                .map((f, i) => {
                    const match = uploaded.find(u => {
                        const n = getName(u);
                        return n && String(n).toLowerCase() === String(f?.name).toLowerCase();
                    });
                    return getUrl(match || uploaded[i]);
                })
                .filter(Boolean);

            if (uploadedUrls.length !== safeFiles.length) throw new Error('Some uploaded urls are missing');

            const attachments = safeFiles.map((f, i) => ({ FileUrl: uploadedUrls[i], FileName: f?.name, MimeType: f?.type }));
            const mediaItems = safeFiles.map((f, i) => ({ url: uploadedUrls[i], filename: f?.name, mimeType: f?.type }));

            const receiverId = selectedCustomer?.CustomerId || selectedCustomer?.UserId;
            const conversationId = selectedCustomer?.ConversationId ?? null;

            const sendFn = type === 'image' ? sendImageMessage
                : type === 'video' ? sendVideoMessage
                    : sendDocumentMessage;

            const res = await sendFn(auth, { senderId: auth?.id, receiverId, conversationId, caption, attachments });
            const sentIdString = res?.Data?.rd?.[0]?.MessageId;
            const conversationIdFromRes = res?.Data?.rd?.[0]?.ConversationId;
            const sentIds = sentIdString ? String(sentIdString).split(',').map(id => id.trim()) : [];

            // Parse server-returned Attachments to get real attachment IDs
            let serverAttachments = [];
            try {
                const rawAttachments = res?.Data?.rd?.[0]?.Attachments;
                if (rawAttachments) {
                    serverAttachments = typeof rawAttachments === 'string'
                        ? JSON.parse(rawAttachments)
                        : (Array.isArray(rawAttachments) ? rawAttachments : []);
                }
            } catch (e) {
                console.error('Error parsing server Attachments:', e);
            }

            // Enrich mediaItems with real attachmentId from server response
            const enrichMediaItems = (items) => items.map((item, i) => ({
                ...item,
                attachmentId: serverAttachments[i]?.Id || serverAttachments[i]?.id || item.attachmentId || null,
            }));

            const enrichedMediaItems = enrichMediaItems(mediaItems);

            // Determine ReceiverId based on group or 1-to-1
            const isGroup = selectedCustomer?.IsGroup === 1;
            let ReceiverId;

            if (isGroup) {
                // For groups, ReceiverId is an array of all member IDs
                try {
                    const memberIds = await fetchAndCacheGroupMembers(selectedCustomer.ConversationId);
                    if (memberIds && memberIds.length > 0) {
                        ReceiverId = memberIds;
                    } else {
                        ReceiverId = [selectedCustomer?.ReceiverId];
                    }
                } catch (error) {
                    console.error('Error fetching group members for media:', error);
                    ReceiverId = [selectedCustomer?.ReceiverId];
                }
            } else {
                // For 1-to-1, ReceiverId is a single value
                ReceiverId = selectedCustomer?.ReceiverId;
            }

            if (type === 'document' && sentIds.length > 1 && sentIds.length === safeFiles.length) {
                // Multiple documents → individual messages
                setMessages(prev => ({
                    data: normalizeMessagesList(prev).filter(m => m.Id !== tempId),
                    total: prev?.total || 0,
                }));

                sentIds.forEach((messageId, index) => {
                    const singleMediaItem = [{
                        url: uploadedUrls[index],
                        filename: safeFiles[index]?.name,
                        mimeType: safeFiles[index]?.type,
                        attachmentId: serverAttachments[index]?.Id || serverAttachments[index]?.id || null,
                    }];

                    setMessages(prev => ({
                        data: [
                            ...normalizeMessagesList(prev),
                            {
                                Id: messageId, MessageId: messageId, Direction: 1, Status: 1,
                                MessageType: type, previewUrl: uploadedUrls[index], Message: caption,
                                Time: time, Date: date, DateTime: dateTime,
                                mediaItems: singleMediaItem, fileName: safeFiles[index]?.name,
                                fileType: safeFiles[index]?.type, isUploading: false, percent: 100,
                                ConversationId: selectedCustomer?.ConversationId || tempConversationId,
                                SenderId: auth?.id,
                            },
                        ],
                        total: (prev?.total || 0) + 1,
                    }));

                    if (ReceiverId) {
                        if (!isGroup && Number(ReceiverId) === Number(auth?.id)) {
                            console.warn('⚠️ Warning: Sending media to SELF (ReceiverId === SenderId).');
                        }

                        const mediaPayload = {
                            ufcc: auth?.ufcc, ReceiverId, Id: messageId, MessageId: messageId,
                            SenderId: auth?.id, Direction: 2, Status: 1, MessageStatus: 1,
                            MessageType: type, Message: caption, Time: time, Date: date, DateTime: dateTime,
                            mediaItems: singleMediaItem, previewUrl: uploadedUrls[index],
                            fileName: safeFiles[index]?.name, fileType: safeFiles[index]?.type,
                            ConversationId: selectedCustomer?.ConversationId || tempConversationId,
                            SenderName: auth?.username || auth?.userId || auth?.name,
                            RecieverName: auth?.username || auth?.userId || auth?.name,
                        };

                        // Add group-specific fields if it's a group
                        if (isGroup) {
                            mediaPayload.IsGroup = 1;
                            mediaPayload.FirstName = auth?.firstName || auth?.FirstName;
                            mediaPayload.LastName = auth?.lastName || auth?.LastName;
                            mediaPayload.SenderEmail = auth?.email;
                            mediaPayload.SenderProfilePicture = auth?.profilePicture;
                        }

                        emitInternalMessageSend(mediaPayload);
                    }
                });
            } else {
                // Images, videos, or single document
                const sentId = sentIds[0] || sentIdString;

                if (ReceiverId) {
                    if (!isGroup && Number(ReceiverId) === Number(auth?.id)) {
                        console.warn('⚠️ Warning: Sending media to SELF (ReceiverId === SenderId).');
                    }

                    const mediaPayload = {
                        ufcc: auth?.ufcc, ReceiverId, Id: sentId || tempId, MessageId: sentId,
                        SenderId: auth?.id, Direction: 2, Status: 1, MessageStatus: 1,
                        MessageType: type, Message: caption, Time: time, Date: date, DateTime: dateTime,
                        mediaItems: enrichedMediaItems, previewUrl: uploadedUrls[0],
                        fileName: enrichedMediaItems?.[0]?.filename, fileType: enrichedMediaItems?.[0]?.mimeType,
                        ConversationId: selectedCustomer?.ConversationId || tempConversationId,
                        SenderName: auth?.username || auth?.userId || auth?.name,
                        RecieverName: auth?.username || auth?.userId || auth?.name,
                    };

                    // Add group-specific fields if it's a group
                    if (isGroup) {
                        mediaPayload.IsGroup = 1;
                        mediaPayload.FirstName = auth?.firstName || auth?.FirstName;
                        mediaPayload.LastName = auth?.lastName || auth?.LastName;
                        mediaPayload.SenderEmail = auth?.email;
                        mediaPayload.SenderProfilePicture = auth?.profilePicture;
                    }

                    emitInternalMessageSend(mediaPayload);
                }

                setMessages(prev => ({
                    data: normalizeMessagesList(prev).map(m =>
                        m.Id === tempId
                            ? {
                                ...m,
                                ...(sentId && { Id: sentId, MessageId: sentId }),
                                previewUrl: uploadedUrls[0] || m.previewUrl,
                                mediaItems: enrichedMediaItems,
                                fileName: enrichedMediaItems[0]?.filename || m.fileName,
                                fileType: enrichedMediaItems[0]?.mimeType || m.fileType,
                                isUploading: false, percent: 100, Status: 1,
                            }
                            : m
                    ),
                    total: (prev?.total || 0) + 1,
                }));
            }
            // Check if it's a new conversation
            const isNewConversation = res?.Data?.rd?.[0]?.IsNewConversation === true;
            if (isNewConversation && conversationIdFromRes && onCustomerSelect) {
                onCustomerSelect({ ...selectedCustomerRef.current, ConversationId: conversationIdFromRes });
                // Silent push: update list without reload
                window.dispatchEvent(new CustomEvent('UPDATE_CONVERSATION_ITEM', {
                    detail: {
                        ...selectedCustomerRef.current,
                        ConversationId: conversationIdFromRes,
                        Message: caption || '',
                        MessageType: type,
                        MessageStatus: 1,
                        DateTime: dateTime,
                        SenderId: auth?.id,
                        LastMessageDate: dateTime,
                        LastUpdatedDate: dateTime
                    }
                }));
            }
        } catch (err) {
            console.error('uploadAndSendMedia error:', err);
            toast.error('Failed to send media');
            setMessages(prev => ({
                data: normalizeMessagesList(prev).map(m =>
                    m.Id === tempId ? { ...m, Status: 3, isUploading: false } : m
                ),
                total: prev?.total || 0,
            }));
        }
    }, [auth, selectedCustomer, tempConversationId, onCustomerSelect]);

    // ── Send message ─────────────────────────────────────────────────────────
    const handleSendMessage = useCallback(async (containerRef, scrollToBottom, messageOverride = null) => {
        const caption = (messageOverride !== null ? messageOverride : inputValue).trim();
        const { time, date, dateTime } = getISTTime();

        if (mediaFiles?.length) {
            const selected = [...mediaFiles];
            setInputValue('');
            setShowMedia(false);
            setMediaFiles([]);

            const byType = { image: [], video: [], document: [] };
            for (const media of selected) {
                const file = media.file || media;
                if (!(file instanceof File)) continue;
                const t = file.type.startsWith('image/') ? 'image'
                    : file.type.startsWith('video/') ? 'video' : 'document';
                byType[t].push(file);
            }

            const groups = Object.entries(byType).filter(([, list]) => list.length > 0);

            for (const [type, files] of groups) {
                const tempId = `${Date.now()}-${type}-batch`;
                const previewUrl = URL.createObjectURL(files[0]);

                setMessages(prev => ({
                    data: [
                        ...normalizeMessagesList(prev),
                        {
                            Id: tempId, Direction: 1, Status: 'pending', MessageType: type,
                            previewUrl, Message: caption, isUploading: true, percent: 0,
                            Time: time, Date: date, DateTime: dateTime,
                            mediaItems: files.map(f => ({
                                url: URL.createObjectURL(f), fileName: f?.name,
                                filename: f?.name, mimeType: f?.type, size: f?.size,
                            })),
                            ConversationId: selectedCustomer?.ConversationId || tempConversationId,
                        },
                    ],
                    total: (prev?.total || 0) + 1,
                }));

                if (typeof scrollToBottom === 'function') scrollToBottom();
                await uploadAndSendMedia({ files, caption, type, tempId, time, date, dateTime });
            }

            if (typeof scrollToBottom === 'function') scrollToBottom();
            return;
        }

        const replySnapshot = replyToMessage;
        const replyToMessageId = storeMessData?.messageId;
        const tempId = `${Date.now()}-${Math.random()}`;

        setMessages(prev => ({
            data: [
                ...normalizeMessagesList(prev),
                {
                    Id: tempId, Message: caption, Time: time, Date: date, DateTime: dateTime,
                    Direction: 1, Status: 'pending', MessageType: 'text',
                    ConversationId: selectedCustomer?.ConversationId || tempConversationId,
                    SenderId: auth?.id,
                    ...(replySnapshot && replyToMessageId ? {
                        ContextType: 2, ContextId: replyToMessageId,
                        ReplyContextMsg: replySnapshot?.text || 'Media',
                        SenderInfo: replySnapshot?.sender || '',
                        Sender: replySnapshot?.sender || '',
                    } : {}),
                },
            ],
            total: (prev?.total || 0) + 1,
        }));

        setInputValue('');
        setReplyToMessage(null);
        if (typeof scrollToBottom === 'function') scrollToBottom();

        try {
            const isReply = !!(replySnapshot && replyToMessageId);

            const resp = isReply
                ? await replyToMessageApi(auth, {
                    conversationId: replySnapshot.ConversationId || selectedCustomer?.ConversationId,
                    replyToMessageId: replySnapshot.Id,
                    ReplyToAttachmentId: replySnapshot.ReplyToAttachmentId,
                    message: caption,
                    messageType: 1,
                })
                : await sendTextMessage(auth, {
                    senderId: auth?.id,
                    receiverId: selectedCustomer?.CustomerId || selectedCustomer?.UserId,
                    conversationId: selectedCustomer?.ConversationId ?? null,
                    message: caption,
                });

            const sentId = resp?.Data?.rd?.[0]?.MessageId;
            const conversationId = resp?.Data?.rd?.[0]?.ConversationId || selectedCustomer?.ConversationId;

            if (sentId) {
                await emitSocketMessage({
                    messageId: sentId,
                    message: caption,
                    isEdited: 0,
                    extra: {
                        Id: auth.SocketId,
                        Status: 1,
                        MessageStatus: 1,
                        MessageType: 'text',
                        Time: time,
                        Date: date,
                        DateTime: dateTime,
                        ConversationId: conversationId || tempConversationId,
                        ...(!selectedCustomer?.ReceiverId ? { ConversationName: auth?.username || auth?.userId } : {}),
                        ...(replySnapshot && replyToMessageId ? {
                            ContextType: 2,
                            ContextId: replyToMessageId,
                            ReplyContextMsg: replySnapshot?.text || 'Media',
                            SenderInfo: replySnapshot?.sender || '',
                            Sender: replySnapshot?.sender || '',
                        } : {}),
                    },
                });

                setMessages(prev => ({
                    data: normalizeMessagesList(prev).map(m =>
                        m.Id === tempId
                            ? { ...m, Id: sentId, MessageId: sentId, Status: 1, SenderId: auth?.id, Direction: 1 }
                            : m
                    ),
                    total: prev?.total || 0,
                }));

                // Check if it's a new conversation
                const isNewConversation = resp?.Data?.rd?.[0]?.IsNewConversation === true;
                if (isNewConversation && conversationId && onCustomerSelect) {
                    onCustomerSelect({ ...selectedCustomer, ConversationId: conversationId });
                    // Silent push: update list without reload
                    window.dispatchEvent(new CustomEvent('UPDATE_CONVERSATION_ITEM', {
                        detail: {
                            ...selectedCustomer,
                            ConversationId: conversationId,
                            Message: caption,
                            MessageType: 'text',
                            MessageStatus: 1,
                            DateTime: dateTime,
                            SenderId: auth?.id,
                            LastMessageDate: dateTime,
                            LastUpdatedDate: dateTime
                        }
                    }));
                }
            }
        } catch (err) {
            console.error('sendTextMessage error:', err);
            toast.error('Failed to send message');
            setMessages(prev => ({
                data: normalizeMessagesList(prev).map(m =>
                    m.Id === tempId ? { ...m, Status: 4 } : m
                ),
                total: prev?.total || 0,
            }));
        }

        if (typeof scrollToBottom === 'function') scrollToBottom();
    }, [auth, selectedCustomer, tempConversationId, inputValue, mediaFiles, replyToMessage, storeMessData, uploadAndSendMedia, onCustomerSelect]);

    // ── Reply / Forward / Scroll ─────────────────────────────────────────────
    const handleReply = useCallback(async (message, attachmentId = null) => {
        setStoreMessData({ messageId: message?.MessageId });

        const replyType = message?.MessageType;
        const mediaCount = Array.isArray(message?.mediaItems) ? message.mediaItems.length : 0;
        const fileName =
            message?.fileName ||
            message?.mediaItems?.[0]?.filename ||
            message?.mediaItems?.[0]?.fileName ||
            '';

        const isSpecificItem = !!attachmentId;
        const fallbackLabel = (() => {
            if (replyType === 'image') return (mediaCount > 1 && !isSpecificItem) ? `${mediaCount} Photos` : 'Photo';
            if (replyType === 'video') return (mediaCount > 1 && !isSpecificItem) ? `${mediaCount} Videos` : 'Video';
            if (replyType === 'document') return fileName || 'Document';
            return 'Media';
        })();

        const replyText = (message?.Message && String(message.Message).trim().length > 0)
            ? message.Message
            : fallbackLabel;

        let mediaUrl = null;
        if (attachmentId && message?.mediaItems) {
            const specificItem = message.mediaItems.find(item =>
                item.attachmentId === attachmentId || item.AttachmentId === attachmentId ||
                item.Id === attachmentId || item.id === attachmentId
            );
            if (specificItem) mediaUrl = specificItem.url || specificItem.src;
        }

        let finalAttachmentId = attachmentId;
        if (!finalAttachmentId && mediaCount > 0) {
            finalAttachmentId = message.mediaItems
                .map(item => item.attachmentId || item.AttachmentId || item.Id || item.id)
                .filter(Boolean)
                .join(',');
        }

        setReplyToMessage({
            Id: message?.Id,
            sender: message?.Direction === 1 ? 'You' : selectedCustomer?.name || 'Customer',
            text: replyText,
            MessageType: message?.MessageType,
            ReplyToAttachmentId: finalAttachmentId || null,
            mediaUrl,
        });
    }, [selectedCustomer?.name]);

    const handleCancelReply = useCallback(() => {
        setReplyToMessage(null);
    }, []);

    const handleForward = useCallback((message, event, attachmentId = null) => {
        if (event) {
            event.stopPropagation();
            setForwardMessage({ ...(message || {}), ReplyToAttachmentId: attachmentId || null });
            setForwardAnchorEl(event.currentTarget);
        }
    }, []);

    const handleCloseForward = useCallback(() => {
        setForwardAnchorEl(null);
        setForwardMessage(null);
    }, []);

    const handleSendForward = useCallback(async (selectedContactsArr = []) => {
        if (!selectedContactsArr.length || !forwardMessage) {
            toast.error('Please select at least one contact to forward message.');
            return;
        }
        const conversationIdsArr = [];
        const userIdsArr = [];
        const orderedRecipients = [];
        for (const contact of selectedContactsArr) {
            if (contact?.ConversationId) {
                conversationIdsArr.push(contact.ConversationId);
                orderedRecipients.push(contact);
            } else if (contact?.UserId || contact?.id) {
                userIdsArr.push(contact.UserId || contact.id);
                orderedRecipients.push(contact);
            }
        }

        if (!userIdsArr.length && !conversationIdsArr.length) {
            toast.error('No valid recipients found.');
            return;
        }

        const params = {
            MessageId: forwardMessage?.MessageId ?? messId ?? null,
            ConversationIds: conversationIdsArr.join(',') || null,
            UserIds: userIdsArr.join(',') || null,
            ForwardedAttachmentIds: (() => {
                if (forwardMessage?.ReplyToAttachmentId) {
                    return String(forwardMessage.ReplyToAttachmentId);
                }
                if (Array.isArray(forwardMessage?.mediaItems) && forwardMessage.mediaItems.length > 0) {
                    const ids = forwardMessage.mediaItems
                        .map(a => a?.attachmentId || a?.AttachmentId || a?.Id || a?.id)
                        .filter(Boolean);
                    if (ids.length) return ids.join(',');
                }
                let attachments = forwardMessage?.Attachments;
                if (attachments) {
                    if (typeof attachments === 'string') {
                        try { attachments = JSON.parse(attachments); } catch { attachments = null; }
                    }
                    if (Array.isArray(attachments) && attachments.length > 0) {
                        const ids = attachments.map(a => a?.Id || a?.id || a?.attachmentId || a?.AttachmentId).filter(Boolean);
                        if (ids.length) return ids.join(',');
                    }
                }
                return null;
            })(),
        };

        try {
            const response = await forwardMessageApi(auth, params);
            if (response?.success || response?.Status === '200') {
                toast.success('Message forwarded successfully');

                const rd = response?.Data?.rd?.[0] || response?.rd?.[0];
                const forwardedMessagesStr = rd?.ForwardedMessages;

                if (forwardedMessagesStr) {
                    try {
                        const forwardedMessages = JSON.parse(forwardedMessagesStr);
                        if (Array.isArray(forwardedMessages)) {
                            forwardedMessages.forEach((fwdMsg, index) => {
                                const contact = orderedRecipients[index];
                                const receiverId = contact?.UserId || contact?.ReceiverId || contact?.id;
                                const fwdData = forwardedMessages[index];

                                if (receiverId && fwdData) {
                                    const convId = fwdData.ConversationId;
                                    const realMessageId = fwdData.MessageId;
                                    const isMedia = ['image', 'video', 'document'].includes(
                                        forwardMessage?.Type || forwardMessage?.MessageType
                                    );

                                    if (Number(receiverId) === Number(auth?.id)) {
                                        console.warn('⚠️ Warning: Forwarding message to SELF.');
                                    }

                                    let mediaItemsToSend = forwardMessage?.mediaItems || [];
                                    let previewUrlToSend = forwardMessage?.previewUrl || null;
                                    let fileNameToSend = forwardMessage?.fileName || null;
                                    let fileTypeToSend = forwardMessage?.fileType || null;

                                    if (forwardMessage?.ReplyToAttachmentId && Array.isArray(mediaItemsToSend)) {
                                        const singleItem = mediaItemsToSend.find(item =>
                                            item.attachmentId === forwardMessage.ReplyToAttachmentId ||
                                            item.AttachmentId === forwardMessage.ReplyToAttachmentId ||
                                            item.Id === forwardMessage.ReplyToAttachmentId ||
                                            item.id === forwardMessage.ReplyToAttachmentId
                                        );
                                        if (singleItem) {
                                            mediaItemsToSend = [singleItem];
                                            previewUrlToSend = singleItem.url || singleItem.src || previewUrlToSend;
                                            fileNameToSend = singleItem.filename || singleItem.fileName || fileNameToSend;
                                            fileTypeToSend = singleItem.mimeType || fileTypeToSend;
                                        }
                                    }

                                    const { time, date, dateTime } = getISTTime();

                                    if (selectedCustomer?.ConversationId && Number(convId) === Number(selectedCustomer.ConversationId)) {
                                        setMessages(prev => {
                                            const normalized = normalizeMessagesList(prev);
                                            if (normalized.some(m => m.MessageId === realMessageId || m.Id === realMessageId)) return prev;

                                            return {
                                                data: [
                                                    ...normalized,
                                                    {
                                                        Id: realMessageId,
                                                        MessageId: realMessageId,
                                                        SenderId: auth?.id,
                                                        ConversationId: convId,
                                                        Message: forwardMessage?.Message || (isMedia ? '' : 'Forwarded Message'),
                                                        Status: 1,
                                                        MessageStatus: 1,
                                                        Direction: 1, // Local direction for sender is 1
                                                        DateTime: dateTime,
                                                        MessageType: forwardMessage?.Type || forwardMessage?.MessageType || 'text',
                                                        Type: forwardMessage?.Type || forwardMessage?.MessageType || 'text',
                                                        IsForwarded: true,
                                                        ForwardedFrom: forwardMessage?.MessageId || forwardMessage?.Id || auth?.id,
                                                        mediaItems: mediaItemsToSend,
                                                        previewUrl: previewUrlToSend,
                                                        fileName: fileNameToSend,
                                                        fileType: fileTypeToSend,
                                                        Time: time,
                                                        Date: date,
                                                    }
                                                ],
                                                total: (prev?.total || 0) + 1
                                            };
                                        });
                                    }

                                    emitInternalMessageSend({
                                        Id: realMessageId, ReceiverId: receiverId, ufcc: auth?.ufcc,
                                        SenderId: auth?.id, Sender: auth?.id, ConversationId: convId,
                                        ConversationName: auth?.username || auth?.userName || auth?.userId,
                                        SenderName: auth?.username || auth?.userId || auth?.name,
                                        FirstName: auth?.firstName || auth?.FirstName,
                                        LastName: auth?.lastName || auth?.LastName,
                                        RecieverName: auth?.username || auth?.userId || auth?.name,
                                        Message: forwardMessage?.Message || (isMedia ? '' : 'Forwarded Message'),
                                        MessageId: realMessageId, Status: 1, MessageStatus: 1,
                                        Direction: 2, DateTime: dateTime,
                                        MessageType: forwardMessage?.Type || forwardMessage?.MessageType || 'text',
                                        Type: forwardMessage?.Type || forwardMessage?.MessageType || 'text',
                                        IsForwarded: true, ForwardedFrom: forwardMessage?.MessageId || forwardMessage?.Id || auth?.id,
                                        mediaItems: mediaItemsToSend, previewUrl: previewUrlToSend,
                                        fileName: fileNameToSend, fileType: fileTypeToSend,
                                        Time: time,
                                        Date: date,
                                    });
                                }
                            });
                        }
                    } catch (parseError) {
                        console.error('Error parsing ForwardedMessages:', parseError);
                    }
                }

                setForwardMessage(null);
                setForwardAnchorEl(null);
            } else {
                const errorMessage = response?.error || 'Failed to forward message';
                toast.error(errorMessage);
                console.error('Forward API Error:', errorMessage);
            }
        } catch (error) {
            console.error('Error in forwarding message:', error);
            toast.error(error?.response?.data?.error || error?.message || 'Something went wrong while forwarding');
        }
    }, [auth, selectedCustomer, forwardMessage, messId]);

    const searchMessages = useCallback(async (query) => {
        if (!selectedCustomer?.ConversationId || !query?.trim()) {
            setSearchResults([]);
            return;
        }

        setIsSearching(true);
        try {
            const response = await conversationView(
                selectedCustomer.ConversationId,
                1,
                100, // Search within first 100 results
                auth,
                'SearchView',
                null,
                query
            );

            const rawResults = Array.isArray(response.data?.rd)
                ? response.data.rd
                : (Array.isArray(response.data) ? response.data : []);

            setSearchResults(normalizeServerMessages(rawResults));
        } catch (error) {
            console.error('Search failed:', error);
            setSearchResults([]);
        } finally {
            setIsSearching(false);
        }
    }, [selectedCustomer?.ConversationId, auth, normalizeServerMessages]);

    const scrollToMessage = useCallback(async (messageId, containerRef, attachmentId = null) => {
        if (!containerRef.current || !messageId) return;

        // Use both string and number for ID matching to be safe
        const sid = String(messageId);
        let messageElement = containerRef.current.querySelector(`[data-message-id="${sid}"]`);

        // If not found, it might even be an older message not loaded. 
        // For now, let's try to reload the conversation if it's missing (jump to message logic)
        if (!messageElement) {
            const messageList = normalizeMessagesList(messages);
            const existsLocally = messageList.some(m => String(m.MessageId || m.Id) === sid);

            if (!existsLocally) {
                setLoading(true);
                await loadConversation(1, true, true); // Reset and reload
                // Wait for render
                await new Promise(r => setTimeout(r, 500));
                messageElement = containerRef.current.querySelector(`[data-message-id="${sid}"]`);
            }
        }

        if (messageElement) {
            messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setBlinkMessageId(sid);

            if (attachmentId) {
                const messageList = normalizeMessagesList(messages);
                const targetMsg = messageList.find(m => String(m.Id || m.MessageId) === sid);
                if (targetMsg?.mediaItems) {
                    const itemIndex = targetMsg.mediaItems.findIndex(item =>
                        String(item.attachmentId || item.AttachmentId || item.Id || item.id) === String(attachmentId)
                    );
                    if (itemIndex >= 0) handleMediaClick(targetMsg, itemIndex);
                }
            }

            setTimeout(() => setBlinkMessageId(null), 3000);
        }
    }, [messages, loadConversation, handleMediaClick]);

    const getMessageStatusIcon = useCallback((msg) => {
        const raw = msg?.Status ?? msg?.status ?? msg?.MessageStatus;
        if (typeof raw === 'string') {
            const lowered = raw.toLowerCase();
            if (lowered === 'read') return 'read';
            if (lowered === 'sent') return 'sent';
        }
        const parsed = typeof raw === 'number' ? raw : parseInt(raw, 10);
        if (parsed === 3) return 'read';
        if (parsed === 2) return 'delivered';
        if (parsed === 1 || parsed === 0) return 'sent';
        return null;
    }, []);

    // ── Public API ───────────────────────────────────────────────────────────

    return {
        inputValue, setInputValue,
        tagsList, setTagsList,
        messages, setMessages,
        mediaFiles,
        showMedia, setShowMedia,
        assigneeList, setAssigneeList,
        selectedAssignees, setSelectedAssignees,
        loading, setLoading,
        loadingOlder, setLoadingOlder,
        hasMore, setHasMore,
        uploadProgress, setUploadProgress,
        loadedMedia, setLoadedMedia,
        replyToMessage, setReplyToMessage,
        forwardMessage, setForwardMessage,
        blinkMessageId, setBlinkMessageId,
        mediaViewerOpen, setMediaViewerOpen,
        mediaViewerItems, setMediaViewerItems,
        mediaViewerIndex, setMediaViewerIndex,
        mediaViewerMessage,
        groupMessagesByDate,
        currentPage, setCurrentPage,
        forwardAnchorEl, setForwardAnchorEl,
        messId,
        searchResults,
        isSearching,
        groupMembers,
        fetchAndCacheGroupMembers,

        // Functions
        loadConversation,
        loadOlderMessages,
        getMediaSrcForMessage,
        getMediaKey,
        markLoaded,
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
        scrollToMessage,
        searchMessages,
        getMessageStatusIcon,
        formatDateHeader,
        addUniqueMessage,
        handleEditMessage,
        handleDeleteMessage,
        refresh: () => loadConversation(1, true, true),
    };
};
