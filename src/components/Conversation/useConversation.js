import { useState, useRef, useEffect, useCallback, useMemo, useContext } from 'react';
import { conversationView } from '../../API/ConversationView/ConversationView';
import { sendDocumentMessage, sendImageMessage, sendTextMessage, sendVideoMessage } from '../../API/SendMessage/SendMessageApi';
import { normalizeServerMessages as normalizeServerMessagesHelper, groupMessagesByDateHelper } from './conversationUtils';

import { addMessageReactionHandler, addInternalMessageHandler, emitInternalMessageSend, addInternalStatusHandler, emitInternalMessageRead } from '../../socket';
import { readMessage } from '../../API/ReadMessage/ReadMessage';
import { uploadMediaAPi } from '../../API/FileUpload/uploadHelpers';
import { toast } from 'react-hot-toast';
import { LoginContext } from '../../context/LoginData';
import { formatDateHeader } from '../../utils/DateFnc';

import { forwardMessageApi } from '../../API/SendMessage/forwardMessageApi';
import { replyToMessageApi } from '../../API/SendMessage/replyToMessageApi';

export const useConversation = (selectedCustomer, onConversationRead, onViewConversationRead) => {
    const [inputValue, setInputValue] = useState("");
    const [tagsList, setTagsList] = useState([]);
    const [messages, setMessages] = useState([]);
    const [tempConversationId, setTempConversationId] = useState(null);
    const [mediaFiles, setMediaFiles] = useState([]);
    const [assigneeList, setAssigneeList] = useState([]);
    const [escalatedLists, setEscalatedLists] = useState([]);
    const [selectedAssignees, setSelectedAssignees] = useState([]);
    const [selectedEscalated, setSelectedEscalate] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 100;
    const [loading, setLoading] = useState(false);
    const [loadingOlder, setLoadingOlder] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [uploadProgress, setUploadProgress] = useState({});
    const [mediaCache, setMediaCache] = useState({});
    const [loadedMedia, setLoadedMedia] = useState({});
    const [replyToMessage, setReplyToMessage] = useState(null);
    const [messId, setMessId] = useState("");
    const [storeMessData, setStoreMessData] = useState({
        messageId: "",
    });
    const [forwardMessage, setForwardMessage] = useState(null);
    const [forwardAnchorEl, setForwardAnchorEl] = useState(null);
    const [blinkMessageId, setBlinkMessageId] = useState(null);
    const [mediaViewerOpen, setMediaViewerOpen] = useState(false);
    const [mediaViewerItems, setMediaViewerItems] = useState([]);
    const [showMedia, setShowMedia] = useState(false);
    const [mediaViewerIndex, setMediaViewerIndex] = useState(0);
    const [mediaViewerMessage, setMediaViewerMessage] = useState(null);
    const { auth } = useContext(LoginContext);
    const selectedCustomerRef = useRef(selectedCustomer);
    const latestRequestRef = useRef(0);
    const abortControllerRef = useRef(null);

    useEffect(() => {
        selectedCustomerRef.current = selectedCustomer;
        setMediaFiles([]);
        setShowMedia(false);
    }, [selectedCustomer]);

    const markLoaded = useCallback((key) => {
        setLoadedMedia(prev => ({ ...prev, [key]: true }));
    }, []);

    const getMediaKey = (msg, index) =>
        msg?.Id ?? msg?.id ?? msg?.mediaId ?? msg?.MediaUrl ?? msg?.fileName ?? `m-${index}`;

    const normalizeServerMessages = useCallback(
        (messagesArray) => normalizeServerMessagesHelper(messagesArray, auth),
        [auth]
    );

    const groupMessagesByDate = useMemo(
        () => groupMessagesByDateHelper(messages),
        [messages]
    );

    const getMediaSrcForMessage = useCallback((msg) => {
        if (!msg) return '';
        if (msg.previewUrl) return msg.previewUrl;

        const id = msg.MediaUrl || msg.mediaId || msg.mediaURL || null;
        if (!id) return '';

        return mediaCache[id] || '';
    }, [mediaCache]);

    useEffect(() => {
        if (!selectedCustomer?.CustomerId) return;
    }, [selectedCustomer?.CustomerId]);

    useEffect(() => {
        if (!selectedCustomer?.CustomerId) return;
    }, [selectedCustomer?.CustomerId]);

    const processedMessageIds = useRef(new Set());

    const addUniqueMessage = (rawData) => {
        if (!rawData || typeof rawData !== 'object') return;

        const [normalized] = normalizeServerMessagesHelper([rawData], auth) || [];
        if (!normalized) return;

        const rawSenderId = Number(rawData?.SenderId ?? rawData?.Sender);
        const myId = Number(auth?.id ?? auth?.userId);
        const derivedDirection = (rawSenderId && myId && rawSenderId === myId) ? 1 : 0;
        const normalizedDirection = (typeof normalized?.Direction === 'number')
            ? (normalized.Direction === 1 ? 1 : 0)
            : derivedDirection;
        const normalizedWithDirection = {
            ...normalized,
            Direction: normalizedDirection,
        };

        const incomingId = normalizedWithDirection.MessageId || normalizedWithDirection.Id;
        if (!incomingId) return;

        if (processedMessageIds.current.has(incomingId)) return;
        processedMessageIds.current.add(incomingId);

        setMessages((prevMessages) => {
            const prevData = Array.isArray(prevMessages)
                ? prevMessages
                : prevMessages?.data || [];

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
    };

    const handleReactionMessage = (data) => {
        if (data._isFromCurrentUser) {
            return;
        }
        setMessages((prevMessages) => {
            const prevData = Array.isArray(prevMessages) ? prevMessages : prevMessages?.data || [];
            const updatedMessages = [...prevData];
            let messageUpdated = false;
            const updatedMessagesList = updatedMessages.map(msg => {
                if (msg?.MessageId === data?.MessageId) {
                    messageUpdated = true;
                    let existingReactions = [];
                    try {
                        existingReactions = msg.ReactionEmojis
                            ? JSON.parse(msg.ReactionEmojis)
                            : [];
                    } catch (e) {
                        console.error("Error parsing existing reactions:", e);
                        existingReactions = [];
                    }
                    let newReactions = [];
                    try {
                        newReactions = data.ReactionEmojis
                            ? typeof data.ReactionEmojis === 'string'
                                ? JSON.parse(data.ReactionEmojis)
                                : data.ReactionEmojis
                            : [];
                    } catch (e) {
                        console.error("Error parsing new reactions:", e);
                        newReactions = [];
                    }
                    const isRemoval = newReactions.some(r =>
                        r.Direction === 0 && (!r.Reaction || r.Reaction === "")
                    );

                    if (isRemoval) {
                        const filteredReactions = existingReactions.filter(
                            r => r.Direction !== 0
                        );
                        return {
                            ...msg,
                            ReactionEmojis: JSON.stringify(filteredReactions)
                        };
                    }
                    if (newReactions.length === 0) {
                        return msg;
                    }
                    const nonClientReactions = existingReactions.filter(r => r.Direction !== 0);
                    let clientReactions = existingReactions.filter(r => r.Direction === 0);
                    newReactions.forEach(reaction => {
                        if (reaction.Direction === 0 && reaction.Reaction) {
                            const existingIndex = clientReactions.findIndex(
                                r => r.Reaction === reaction.Reaction
                            );

                            if (existingIndex >= 0) {
                                clientReactions[existingIndex] = reaction;
                            } else {
                                clientReactions.push(reaction);
                            }
                        }
                    });
                    const mergedReactions = [...nonClientReactions, ...clientReactions];

                    return {
                        ...msg,
                        ReactionEmojis: JSON.stringify(mergedReactions)
                    };
                }
                return msg;
            });
            if (!messageUpdated && data.ReactionEmojis) {
                try {
                    const newReactions = typeof data.ReactionEmojis === 'string'
                        ? JSON.parse(data.ReactionEmojis)
                        : data.ReactionEmojis;

                    const validReactions = newReactions.filter(
                        reaction => reaction.Reaction && reaction.Reaction.trim() !== ""
                    );

                    if (validReactions.length > 0) {
                        updatedMessagesList.push({
                            ...data,
                            ReactionEmojis: JSON.stringify(validReactions)
                        });
                    }
                } catch (e) {
                    console.error("Error processing new message with reactions:", e);
                }
            }
            return Array.isArray(prevMessages)
                ? updatedMessagesList
                : { ...prevMessages, data: updatedMessagesList };
        });
    };

    useEffect(() => {
        if (!auth?.token || !auth?.userId) {
            return;
        }

        // Handler for status changes - only update when backend sends status changes
        const handleChangeStatus = (data) => {
            if (!data || typeof data !== "object") return;
            setMessId(data?.MessageId);

            // Store message data for later use
            if (data?.MessageId) {
                setStoreMessData(prev => ({
                    ...prev,
                    messageId: data.MessageId
                }));
            }

            setTempConversationId(data?.ConversationId);
            const currentSelectedCustomer = selectedCustomerRef.current;

            setMessages((prevMessages) => {
                const prevData = Array.isArray(prevMessages) ? prevMessages : prevMessages?.data || [];

                const messageExists = (msg) => {
                    return (
                        msg?.Id === data?.Id ||
                        msg?.id === data?.id ||
                        msg?.MessageId === data?.MessageId ||
                        (msg?.Message === data?.Message &&
                            msg?.Direction === 1 &&
                            Math.abs(new Date(msg?.DateTime || msg?.dateTime) - new Date(data?.DateTime || data?.dateTime)) < 60000)
                    );
                };

                const conversationId = data?.ConversationId;
                const shouldMarkAllInConversation = Boolean(conversationId) && !data?.MessageId;

                return {
                    ...prevMessages,
                    data: prevData.map((msg) => {
                        if (msg?.Direction !== 1) {
                            return msg;
                        }

                        if (shouldMarkAllInConversation) {
                            if (Number(msg?.ConversationId) !== Number(conversationId)) return msg;
                            const currentStatus = typeof msg?.Status === 'number' ? msg.Status : parseInt(msg?.Status, 10);
                            if (currentStatus === 3) return msg;
                            return { ...msg, Status: 3 };
                        }

                        if (!messageExists(msg)) {
                            return msg;
                        }

                        const rawStatus = data?.status ?? data?.Status;
                        const parsed = typeof rawStatus === 'number'
                            ? rawStatus
                            : parseInt(rawStatus, 10);

                        const isRead = parsed === 3 || String(rawStatus || '').toLowerCase() === 'read';
                        const nextStatus = isRead ? 3 : 1;

                        const currentStatus = typeof msg?.Status === 'number' ? msg.Status : parseInt(msg?.Status, 10);
                        if (currentStatus === 3) {
                            return msg;
                        }

                        if (nextStatus === 1) {
                            return {
                                ...msg,
                                Status: 1,
                                SenderInfo: msg.SenderInfo || data.SenderInfo,
                                DateTime: data.DateTime || msg.DateTime
                            };
                        }

                        return {
                            ...msg,
                            Status: 3,
                            SenderInfo: msg.SenderInfo || data.SenderInfo,
                            DateTime: data.DateTime || msg.DateTime
                        };
                    })
                };
            });
            if (currentSelectedCustomer?.ConversationId === data?.ConversationId) {
                handleReadMessage(data?.ConversationId);
            }
        };

        const handleInternalMessage = (data) => {
            debugger;
            if (!data || typeof data !== 'object') return;
            if (Number(data?.Sender) === auth?.id || Number(data?.SenderId) === auth?.id) return;
            if (selectedCustomerRef.current?.ConversationId == data[0]?.ConversationId) {
                setMessId(data?.MessageId);
                addUniqueMessage(data);
                handleReadMessage(data?.ConversationId);
            }
        };

        // Add handlers using the new optimized approach
        const removeMessageReactionHandler = addMessageReactionHandler(handleReactionMessage);
        const removeStatusHandler = addInternalStatusHandler(handleChangeStatus);
        const removeInternalMessageHandler = addInternalMessageHandler(handleInternalMessage);

        // Cleanup function
        return () => {
            removeMessageReactionHandler();
            removeStatusHandler();
            removeInternalMessageHandler();
        };
    }, [auth?.token, auth?.userId]);

    const handleReadMessage = async (custConverId) => {
        if (!custConverId) return;
        const response = await readMessage(custConverId, auth?.userId);

        const currentConvId = selectedCustomerRef.current?.ConversationId;
        const receiverId = selectedCustomerRef.current?.ReceiverId || selectedCustomer?.ReceiverId;
        if (receiverId && currentConvId && Number(currentConvId) === Number(custConverId)) {
            emitInternalMessageRead({
                ufcc: auth?.ufcc,
                ReceiverId: receiverId,
                ConversationId: custConverId,
                Status: 3,
            });
        }
        if (response?.rd) {
            return response?.rd;
        } else {
            return null;
        }
    };

    const loadConversation = useCallback(
        async (page = 1, reset = false) => {
            if (loading || !selectedCustomer?.ConversationId) return;
            const requestId = ++latestRequestRef.current;
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
            const controller = new AbortController();
            abortControllerRef.current = controller;
            setLoading(true);

            try {
                const response = await conversationView(
                    selectedCustomer?.ConversationId,
                    page,
                    pageSize,
                    auth,
                    "ConvView",
                    controller.signal
                );
                if (requestId !== latestRequestRef.current) {
                    return;
                }
                const rawServerMessages = Array.isArray(response.data?.rd)
                    ? response.data.rd
                    : Array.isArray(response.data)
                        ? response.data
                        : [];
                const serverMessages = normalizeServerMessages(rawServerMessages);
                setMessages((prevMessages) => {
                    const prevData = reset ? [] : prevMessages?.data || [];
                    const optimisticMessages = prevData.filter(
                        (m) =>
                            m &&
                            m.Direction === 1 &&
                            (m.status === "pending" || m.status === 3)
                    );
                    const messageMap = new Map();
                    const getId = (msg) => msg?.Id ?? msg?.id ?? `${msg?.Direction}_${msg?.Message}_${msg?.DateTime}`;
                    for (const msg of prevData) {
                        const id = getId(msg);
                        if (!messageMap.has(id)) messageMap.set(id, msg);
                    }
                    for (const sm of serverMessages) {
                        const id = getId(sm);
                        const existing = messageMap.get(id);
                        if (!existing || new Date(sm.DateTime) > new Date(existing.DateTime)) {
                            messageMap.set(id, sm);
                        }
                    }
                    for (const om of optimisticMessages) {
                        const id = getId(om);
                        if (!messageMap.has(id)) {
                            const omTs = new Date(om.DateTime).getTime();
                            const existsOnServer = serverMessages.some((sm) => {
                                const smTs = new Date(sm?.DateTime).getTime();
                                return (
                                    sm?.Direction === om?.Direction &&
                                    sm?.Message === om?.Message &&
                                    Math.abs((smTs || 0) - (omTs || 0)) < 15000
                                );
                            });

                            if (!existsOnServer) messageMap.set(id, om);
                        }
                    }
                    const merged = Array.from(messageMap.values()).sort(
                        (a, b) =>
                            new Date(a?.DateTime).getTime() - new Date(b?.DateTime).getTime()
                    );

                    return { data: merged, total: response.total };
                });
                if (requestId === latestRequestRef.current) {
                    setHasMore(response.hasMore);
                    setCurrentPage(page);
                }
            } catch (error) {
                if (error.name === "AbortError" || error.message === "AbortError") {
                } else {
                    console.error("Error loading conversation:", error);
                }
            } finally {
                if (requestId === latestRequestRef.current) {
                    setLoading(false);
                }
            }
        },
        [loading, pageSize, selectedCustomer, auth?.userId]
    );

    const loadOlderMessages = useCallback(async (containerRef) => {
        if (loadingOlder || !hasMore || !selectedCustomer?.ConversationId) return;
        const requestId = ++latestRequestRef.current;
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
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
                "ConvView",
                controller.signal
            );
            if (requestId !== latestRequestRef.current) {
                return;
            }
            const rawOlderMessages = Array.isArray(response.data?.rd)
                ? response.data.rd
                : Array.isArray(response.data)
                    ? response.data
                    : [];

            const serverMessages = normalizeServerMessages(rawOlderMessages);
            setMessages(prevMessages => {
                const prevData = Array.isArray(prevMessages?.data) ? prevMessages.data : [];
                const merged = [...serverMessages, ...prevData];
                const seen = new Set();
                const unique = [];
                for (const m of merged) {
                    const key = (m?.Id ?? m?.id ?? `${m?.Direction}-${m?.DateTime}-${m?.Message}`);
                    if (!seen.has(key)) {
                        seen.add(key);
                        unique.push(m);
                    }
                }

                unique.sort((a, b) => new Date(a?.DateTime).getTime() - new Date(b?.DateTime).getTime());
                return { data: unique, total: response.total };
            });
            setHasMore((serverMessages?.length || 0) === pageSize);
            setCurrentPage(nextPage);
            requestAnimationFrame(() => {
                if (container && previousScrollHeight > 0) {
                    const newScrollHeight = container.scrollHeight;
                    const delta = newScrollHeight - previousScrollHeight;
                    container.scrollTop = previousScrollTop + delta;
                }
            });
        } catch (error) {
            if (error.name === "AbortError" || error.message === "AbortError") {
            } else {
                console.error('Error loading older messages:', error);
            }
        } finally {
            if (requestId === latestRequestRef.current) {
                setLoadingOlder(false);
            }
        }
    }, [loadingOlder, hasMore, selectedCustomer?.ConversationId, currentPage, pageSize, auth?.userId]);

    useEffect(() => {
        if (!selectedCustomer || !selectedCustomer?.ConversationId) {
            setMessages({ data: [], total: 0 });
            setCurrentPage(1);
            setHasMore(true);
            setTempConversationId(null);
            return;
        }

        if (selectedCustomer?.ConversationId == tempConversationId) {
            loadConversation(currentPage, true);
            setCurrentPage(currentPage);
        } else {
            loadConversation(1, true);
            setCurrentPage(1);
        }
    }, [selectedCustomer]);

    useEffect(() => {
        if (selectedCustomer && onConversationRead) {
            onConversationRead(true);
        }

        if (selectedCustomer && onViewConversationRead) {
            onViewConversationRead(true);
        }

        return () => {
            if (onConversationRead) {
                onConversationRead(false);
            }
            if (onViewConversationRead) {
                onViewConversationRead(false);
            }
        };
    }, [selectedCustomer, onConversationRead, onViewConversationRead]);

    const handleAttachClick = (event) => {
        setShowMedia((prev) => !prev);
    };

    const handleFileChange = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        const newMediaFiles = files.map(file => ({
            file,
            preview: URL.createObjectURL(file),
            type: file.type.startsWith('image/') ? 'image' :
                file.type.startsWith('video/') ? 'video' : 'file',
            name: file.name,
            size: file.size
        }));

        setMediaFiles(newMediaFiles);
        setShowMedia(true);

        const progressUpdates = {};
        newMediaFiles.forEach((media) => {
            progressUpdates[media.name] = {
                progress: 0,
                status: 'uploading'
            };
        });

        setUploadProgress(prev => ({ ...prev, ...progressUpdates }));
    };

    const handleMediaClick = (message, index) => {
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
                attachmentId: item.attachmentId
            }));
            setMediaViewerItems(mediaItems);
            setMediaViewerIndex(index);
            setMediaViewerMessage(message);
            setMediaViewerOpen(true);
        }
    };

    const handleClosePreview = () => {
        setMediaFiles([]);
        setShowMedia(false);
    };

    const getISTTime = () => {
        const now = new Date();
        return {
            time: now.toLocaleTimeString("en-IN", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
                timeZone: "Asia/Kolkata"
            }),
            date: new Date(
                now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
            ).toISOString().split("T")[0],
            dateTime: now.toISOString()
        };
    };

    const normalizeMessages = (prev) =>
        Array.isArray(prev) ? prev : (prev?.data || []);

    const uploadAndSendMedia = async ({ files, caption, type, tempId, time, date, dateTime }) => {
        const safeFiles = Array.isArray(files) ? files.filter(f => f instanceof File) : [];
        if (!safeFiles.length) return;

        const getUrl = u => u?.url ?? u?.Url ?? u?.fileUrl ?? u?.fileURL ?? u?.FileUrl ?? u?.FileURL ?? u?.path ?? u?.Path ?? null;
        const getName = u => u?.fileName ?? u?.filename ?? u?.FileName ?? u?.name ?? u?.originalName ?? u?.originalname ?? null;

        try {
            const resp = await uploadMediaAPi({ folderName: "ChatMedia", files: safeFiles });
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

            if (uploadedUrls.length !== safeFiles.length) throw new Error("Some uploaded urls are missing");

            const attachments = safeFiles.map((f, i) => ({ FileUrl: uploadedUrls[i], FileName: f?.name, MimeType: f?.type }));
            const mediaItems = safeFiles.map((f, i) => ({ url: uploadedUrls[i], filename: f?.name, mimeType: f?.type }));

            const receiverId = selectedCustomer?.CustomerId || selectedCustomer?.UserId;
            const conversationId = selectedCustomer?.ConversationId ?? null;

            const sendFn =
                type === "image" ? sendImageMessage :
                    type === "video" ? sendVideoMessage :
                        sendDocumentMessage;

            const res = await sendFn(auth, { senderId: auth?.id, receiverId, conversationId, caption, attachments });
            const sentId = res?.Data?.rd?.[0]?.MessageId;

            const ReceiverId = selectedCustomer?.ReceiverId;
            if (ReceiverId) {
                emitInternalMessageSend({
                    ReceiverId,
                    Id: sentId || tempId,
                    ufcc: auth?.ufcc,
                    MessageId: sentId,
                    SenderId: auth?.id,
                    Direction: 2,
                    Status: 1,
                    MessageType: type,
                    Message: caption,
                    Time: time,
                    Date: date,
                    DateTime: dateTime,
                    mediaItems,
                    previewUrl: uploadedUrls[0],
                    fileName: mediaItems?.[0]?.filename,
                    fileType: mediaItems?.[0]?.mimeType,
                    ConversationId: selectedCustomer?.ConversationId || tempConversationId,
                });
            }

            setMessages(prev => ({
                data: normalizeMessages(prev).map(m =>
                    m.Id === tempId
                        ? {
                            ...m,
                            ...(sentId && { Id: sentId, MessageId: sentId }),
                            previewUrl: uploadedUrls[0] || m.previewUrl,
                            mediaItems,
                            fileName: mediaItems[0]?.filename || m.fileName,
                            fileType: mediaItems[0]?.mimeType || m.fileType,
                            isUploading: false,
                            percent: 100,
                            Status: 1
                        }
                        : m
                ),
                total: (prev?.total || 0) + 1,
            }));
        } catch (err) {
            console.error("uploadAndSendMedia error:", err);
            toast.error("Failed to send media");
            setMessages(prev => ({
                data: normalizeMessages(prev).map(m =>
                    m.Id === tempId ? { ...m, Status: 3, isUploading: false } : m
                ),
                total: prev?.total || 0
            }));
        }
    };

    const handleSendMessage = async (containerRef, scrollToBottom, messageOverride = null) => {
        debugger;
        const caption = (messageOverride !== null ? messageOverride : inputValue).trim();
        const { time, date, dateTime } = getISTTime();
        console.log("Sending message:", { date, time, dateTime });
        if (mediaFiles?.length) {
            const selected = [...mediaFiles];
            setInputValue("");
            setShowMedia(false);
            setMediaFiles([]);

            const byType = { image: [], video: [], document: [] };
            for (const media of selected) {
                const file = media.file || media;
                if (!(file instanceof File)) continue;
                const t = file.type.startsWith("image/")
                    ? "image"
                    : file.type.startsWith("video/")
                        ? "video"
                        : "document";
                byType[t].push(file);
            }

            const groups = Object.entries(byType).filter(([, list]) => list.length > 0);

            for (const [type, files] of groups) {
                const tempId = `${Date.now()}-${type}-batch`;
                const previewUrl = URL.createObjectURL(files[0]);

                setMessages((prev) => ({
                    data: [
                        ...normalizeMessages(prev),
                        {
                            Id: tempId,
                            Direction: 1,
                            Status: "pending",
                            MessageType: type,
                            previewUrl,
                            Message: caption,
                            isUploading: true,
                            percent: 0,
                            Time: time,
                            Date: date,
                            DateTime: dateTime,
                            mediaItems: files.map((f) => ({
                                url: URL.createObjectURL(f),
                                fileName: f?.name,
                                filename: f?.name,
                                mimeType: f?.type,
                                size: f?.size,
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

        const tempId = Date.now();
        setMessages((prev) => ({
            data: [
                ...normalizeMessages(prev),
                {
                    Id: tempId,
                    Message: caption,
                    Time: time,
                    Date: date,
                    DateTime: dateTime,
                    Direction: 1,
                    Status: "pending",
                    MessageType: "text",
                    ConversationId: selectedCustomer?.ConversationId || tempConversationId,
                    ...(replySnapshot && replyToMessageId
                        ? {
                            ContextType: 2,
                            ContextId: replyToMessageId,
                            ReplyContextMsg: replySnapshot?.text || 'Media',
                            SenderInfo: replySnapshot?.sender || '',
                            Sender: replySnapshot?.sender || '',
                        }
                        : {}),
                },
            ],
            total: (prev?.total || 0) + 1,
        }));
        setInputValue("");
        setReplyToMessage(null);
        if (typeof scrollToBottom === 'function') scrollToBottom();

        try {
            const isReply = !!(replySnapshot && replyToMessageId);
            const targetType = replySnapshot?.MessageType;
            const messageTypeToSend = targetType === 'image' ? 2 : targetType === 'video' ? 3 : targetType === 'document' ? 4 : 1;

            const resp = isReply
                ? await replyToMessageApi(auth, {
                    conversationId: replySnapshot.ConversationId || selectedCustomer?.ConversationId,
                    replyToMessageId: replySnapshot.Id,
                    ReplyToAttachmentId: replySnapshot.ReplyToAttachmentId,
                    message: caption,
                    messageType: messageTypeToSend,
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
                const ReceiverId = selectedCustomer?.ReceiverId || selectedCustomer?.UserId;
                if (ReceiverId) {
                    emitInternalMessageSend({
                        ReceiverId,
                        ufcc: auth?.ufcc,
                        Id: auth.SocketId,
                        MessageId: sentId,
                        SenderId: auth?.id,
                        Direction: 2,
                        Status: 1,
                        MessageType: "text",
                        Message: caption,
                        Time: time,
                        Date: date,
                        DateTime: dateTime,
                        ConversationId: conversationId || tempConversationId,
                        ...(!selectedCustomer?.ReceiverId
                            ? { ConversationName: auth?.username || auth?.userId }
                            : {}),
                        ...(replySnapshot && replyToMessageId
                            ? {
                                ContextType: 2,
                                ContextId: replyToMessageId,
                                ReplyContextMsg: replySnapshot?.text || 'Media',
                                SenderInfo: replySnapshot?.sender || '',
                                Sender: replySnapshot?.sender || '',
                            }
                            : {}),
                    });
                }
                setMessages((prev) => ({
                    data: normalizeMessages(prev).map((m) =>
                        m.Id === tempId ? { ...m, Id: sentId, Status: 1 } : m
                    ),
                    total: prev?.total || 0,
                }));
            }
        } catch (err) {
            console.error("sendTextMessage error:", err);
            toast.error("Failed to send message");
            setMessages((prev) => ({
                data: normalizeMessages(prev).map((m) =>
                    m.Id === tempId ? { ...m, Status: 3 } : m
                ),
                total: prev?.total || 0,
            }));
        }

        if (typeof scrollToBottom === 'function') scrollToBottom();
    };

    const handleReply = async (message, attachmentId = null) => {
        setStoreMessData({
            messageId: message?.MessageId,
        })
        const replyType = message?.MessageType;
        const mediaCount = Array.isArray(message?.mediaItems) ? message.mediaItems.length : 0;
        const fileName =
            message?.fileName ||
            message?.mediaItems?.[0]?.filename ||
            message?.mediaItems?.[0]?.fileName ||
            '';

        const fallbackLabel = (() => {
            if (replyType === 'image') return mediaCount > 1 ? `${mediaCount} Photos` : 'Photo';
            if (replyType === 'video') return mediaCount > 1 ? `${mediaCount} Videos` : 'Video';
            if (replyType === 'document') return fileName || 'Document';
            return 'Media';
        })();

        const replyText = (message?.Message && String(message.Message).trim().length > 0)
            ? message.Message
            : fallbackLabel;

        let mediaUrl = null;
        if (attachmentId && message?.mediaItems) {
            const specificItem = message.mediaItems.find(item =>
                (item.attachmentId === attachmentId || item.AttachmentId === attachmentId || item.Id === attachmentId || item.id === attachmentId)
            );
            if (specificItem) {
                mediaUrl = specificItem.url || specificItem.src;
            }
        }

        setReplyToMessage({
            Id: message?.Id,
            sender: message?.Direction === 1 ? 'You' : selectedCustomer?.name || 'Customer',
            text: replyText,
            MessageType: message?.MessageType,
            ReplyToAttachmentId: attachmentId,
            mediaUrl: mediaUrl
        });
    };

    const handleCancelReply = () => {
        setReplyToMessage(null);
    };

    const handleForward = (message, event) => {
        if (event) {
            event.stopPropagation();
            setForwardMessage(message);
            setForwardAnchorEl(event.currentTarget);
        }
    };

    const handleCloseForward = () => {
        setForwardAnchorEl(null);
        setForwardMessage(null);
    };

    const handleSendForward = useCallback(async (selectedContacts = []) => {
        if (!selectedContacts.length || !forwardMessage) {
            toast.error("Please select at least one contact to forward message.");
            return;
        }

        let userIds = [];
        let conversationIds = [];
        for (const contact of selectedContacts) {
            if (contact?.Type === "user" && contact.UserId) {
                userIds.push(contact.UserId);
            }
            else if (contact?.Type === "conversation" && contact.ConversationId) {
                conversationIds.push(contact.ConversationId);
            }
        }
        if (!userIds.length && !conversationIds.length) {
            toast.error("No valid recipients found.");
            return;
        }
        const params = {
            MessageId: forwardMessage?.MessageId ?? messId ?? null,
            ConversationIds: conversationIds.join(",") ?? null,
            UserIds: userIds.join(",") ?? null,
        };
        try {
            const response = await forwardMessageApi(auth, params);
            if (response?.success) {
                toast.success("Message forwarded successfully");
                setForwardMessage(null);
            } else {
                const errorMessage = response?.error || "Failed to forward message";
                toast.error(errorMessage);
                console.error("Forward API Error:", errorMessage);
            }
        } catch (error) {
            console.error("Error in forwarding message:", error);
            toast.error(
                error?.response?.data?.error ||
                error?.message ||
                "Something went wrong while forwarding"
            );
        }
    }, [auth, selectedCustomer, forwardMessage, messId]);

    const scrollToMessage = useCallback(async (messageId, containerRef, attachmentId = null) => {
        if (!containerRef.current || !messageId) return;
        const messageElement = containerRef.current.querySelector(`[data-message-id="${messageId}"]`);

        if (messageElement) {
            messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setBlinkMessageId(messageId);

            // If there's an attachmentId, try to open the MediaViewer at that specific item
            if (attachmentId) {
                const messageList = normalizeMessages(messages);
                const targetMsg = messageList.find(m => (m.Id === messageId || m.MessageId === messageId));

                if (targetMsg && targetMsg.mediaItems) {
                    const itemIndex = targetMsg.mediaItems.findIndex(item =>
                        (item.attachmentId === attachmentId || item.AttachmentId === attachmentId || item.Id === attachmentId || item.id === attachmentId)
                    );

                    if (itemIndex >= 0) {
                        // Small delay to ensure scroll finishes or just open it directly
                        handleMediaClick(targetMsg, itemIndex);
                    }
                }
            }

            setTimeout(() => {
                setBlinkMessageId(null);
            }, 3000);
        }
    }, [messages, handleMediaClick]);

    const getMessageStatusIcon = (msg) => {
        const raw = msg?.Status ?? msg?.status ?? msg?.MessageStatus;

        // Accept numeric or string statuses, but UI supports only 2 states
        if (typeof raw === 'string') {
            const lowered = raw.toLowerCase();
            if (lowered === 'read') return 'read';
            if (lowered === 'sent') return 'sent';
        }

        const parsed = typeof raw === 'number' ? raw : parseInt(raw, 10);

        // In some payloads MessageStatus=0 means sent
        if (parsed === 3) return 'read';
        if (parsed === 1 || parsed === 0) return 'sent';
        return null;
    };

    return {
        inputValue,
        setInputValue,
        tagsList,
        setTagsList,
        messages,
        setMessages,
        mediaFiles,
        showMedia,
        setShowMedia,
        assigneeList,
        setAssigneeList,
        escalatedLists,
        setEscalatedLists,
        selectedAssignees,
        setSelectedAssignees,
        selectedEscalated,
        setSelectedEscalate,
        loading,
        setLoading,
        loadingOlder,
        setLoadingOlder,
        hasMore,
        setHasMore,
        uploadProgress,
        setUploadProgress,
        loadedMedia,
        setLoadedMedia,
        replyToMessage,
        setReplyToMessage,
        forwardMessage,
        setForwardMessage,
        blinkMessageId,
        setBlinkMessageId,
        mediaViewerOpen,
        setMediaViewerOpen,
        mediaViewerItems,
        setMediaViewerItems,
        mediaViewerIndex,
        setMediaViewerIndex,
        mediaViewerMessage,
        groupMessagesByDate,
        currentPage,
        setCurrentPage,
        forwardAnchorEl,
        setForwardAnchorEl,
        messId,

        // Functions
        handleCloseForward,
        loadConversation,
        loadOlderMessages,
        getMediaSrcForMessage,
        getMediaKey,
        markLoaded,
        handleAttachClick,
        handleFileChange,
        handleMediaClick,
        handleClosePreview,
        handleSendMessage,
        handleReply,
        handleCancelReply,
        handleForward,
        handleSendForward,
        scrollToMessage,
        getMessageStatusIcon,
        formatDateHeader,
    };
}