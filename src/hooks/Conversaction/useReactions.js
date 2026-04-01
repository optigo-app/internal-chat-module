import { useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import { addReactionApi } from '../../API/SendMessage/addReactionApi';
import { removeReactionApi } from '../../API/SendMessage/removeReactionApi';
import { emitSendReaction, emitRemoveReaction } from '../../socket';

export const useReactions = ({ auth, selectedCustomer, setMessages, messagesRef, fetchAndCacheGroupMembers }) => {
    const reactionRequestStateRef = useRef(new Map());

    const handleMessageEmojiClick = useCallback(async (emojiObject, message) => {
        try {
            const emoji = emojiObject?.emoji || emojiObject;
            const unified = emojiObject?.unified;
            const messageIdToUse = message?.MessageId ?? message?.Id;
            
            if (!messageIdToUse) {
                toast.error("Failed to send reaction: Message ID missing");
                return;
            }

            const key = String(messageIdToUse);
            const now = Date.now();
            const prevState = reactionRequestStateRef.current.get(key) || { inFlight: false, lastSentAt: 0, lastEmoji: null };
            
            if (prevState.inFlight) return;
            if (now - (prevState.lastSentAt || 0) < 700) return;

            prevState.inFlight = true;
            prevState.lastSentAt = now;
            prevState.lastEmoji = emoji;
            reactionRequestStateRef.current.set(key, prevState);

            const processOnce = async ({ emoji: nextEmoji, unified: nextUnified }) => {
                const snapshot = messagesRef.current;
                const list = Array.isArray(snapshot) ? snapshot : (snapshot?.data || []);
                const latestMsg = list.find(
                    (m) => String(m?.MessageId ?? m?.Id) === String(messageIdToUse)
                ) || message;

                let currentReactions = [];
                if (latestMsg?.ReactionEmojis) {
                    if (typeof latestMsg.ReactionEmojis === "string") {
                        try {
                            currentReactions = JSON.parse(latestMsg.ReactionEmojis);
                        } catch (e) {
                            currentReactions = latestMsg.ReactionEmojis.split(",").map(r => ({
                                Reaction: r,
                                Direction: 1
                            }));
                        }
                    } else if (Array.isArray(latestMsg.ReactionEmojis)) {
                        currentReactions = latestMsg.ReactionEmojis;
                    }
                }

                const existingIndex = currentReactions.findIndex(
                    r => r.Direction === 1 && r.Reaction === nextEmoji
                );

                let updatedReactions;
                let reactionPayload;
                let apiEmoji;

                if (existingIndex >= 0) {
                    currentReactions.splice(existingIndex, 1);
                    updatedReactions = currentReactions;
                    reactionPayload = "";
                    apiEmoji = "";
                } else {
                    const filtered = currentReactions.filter(r => r.Direction !== 1);
                    const newReaction = {
                        Reaction: nextEmoji,
                        Unified: nextUnified,
                        Direction: 1,
                        UserName: auth?.username || auth?.UserName || auth?.name,
                        UserId: auth?.id || auth?.userId
                    };
                    updatedReactions = [...filtered, newReaction];
                    reactionPayload = JSON.stringify(updatedReactions);
                    apiEmoji = nextEmoji;
                }

                await addReactionApi(auth, { messageId: messageIdToUse, emoji: apiEmoji });

                const senderId = auth?.id ?? auth?.userId;
                const isGroup = selectedCustomer?.IsGroup === 1;
                let receiverIdValue;

                if (isGroup) {
                    try {
                        const memberIds = await fetchAndCacheGroupMembers(selectedCustomer.ConversationId);
                        receiverIdValue = memberIds.length > 0 ? memberIds : [selectedCustomer?.ReceiverId];
                    } catch (error) {
                        console.error('Error fetching group members for reaction:', error);
                        receiverIdValue = [selectedCustomer?.ReceiverId];
                    }
                } else {
                    receiverIdValue = selectedCustomer?.ReceiverId;
                }

                if (receiverIdValue && senderId && auth?.ufcc) {
                    const socketReactionEmojis = reactionPayload === ""
                        ? JSON.stringify([{ Reaction: "", Direction: 0, UserId: senderId }])
                        : JSON.stringify([{ Reaction: nextEmoji, Unified: nextUnified, Direction: 0, UserId: senderId }]);

                    const reactionPayloadData = {
                        ufcc: auth?.ufcc,
                        userId: senderId,
                        SenderId: senderId,
                        ReceiverId: receiverIdValue,
                        ConversationId: selectedCustomer?.ConversationId,
                        MessageId: messageIdToUse,
                        ReactionEmojis: socketReactionEmojis,
                    };

                    if (isGroup) {
                        reactionPayloadData.IsGroup = 1;
                        reactionPayloadData.UserName = auth?.username || auth?.name;
                        reactionPayloadData.FirstName = auth?.firstName || auth?.FirstName;
                        reactionPayloadData.LastName = auth?.lastName || auth?.LastName;
                    }

                    emitSendReaction(reactionPayloadData);
                }

                setMessages(prev => {
                    const prevData = Array.isArray(prev) ? prev : prev?.data || [];
                    const updatedData = prevData.map(msg => {
                        if (String(msg?.MessageId ?? msg?.Id) === String(messageIdToUse)) {
                            return {
                                ...msg,
                                ReactionEmojis: reactionPayload,
                                _isFromCurrentUser: true
                            };
                        }
                        return msg;
                    });
                    return Array.isArray(prev)
                        ? updatedData
                        : { ...prev, data: updatedData };
                });

                if (reactionPayload === "") {
                    toast("Reaction removed!");
                } else {
                    toast.success("Reaction sent!");
                }
            };

            await processOnce({ emoji, unified });

            const finalState = reactionRequestStateRef.current.get(key);
            if (finalState) {
                finalState.inFlight = false;
                reactionRequestStateRef.current.set(key, finalState);
            }
        } catch (error) {
            console.error("Error sending reaction:", error);
            toast.error("Failed to send reaction");
            const messageIdToUse = message?.MessageId ?? message?.Id;
            if (messageIdToUse != null) {
                const key = String(messageIdToUse);
                const state = reactionRequestStateRef.current.get(key);
                if (state) {
                    state.inFlight = false;
                    reactionRequestStateRef.current.set(key, state);
                }
            }
        }
    }, [auth, selectedCustomer, setMessages, messagesRef, fetchAndCacheGroupMembers]);

    const handleRemoveReaction = useCallback(async (reaction, message) => {
        try {
            const messageIdToUse = message?.MessageId ?? message?.Id;
            if (!messageIdToUse || !auth) return;

            const response = await removeReactionApi(auth, { messageId: messageIdToUse });
            if (response) {
                setMessages(prev => {
                    const prevData = Array.isArray(prev) ? prev : prev?.data || [];
                    const updatedData = prevData.map(m => {
                        if (String(m?.MessageId ?? m?.Id) === String(messageIdToUse)) {
                            let currentReactions = [];
                            try {
                                currentReactions = JSON.parse(m.ReactionEmojis || "[]");
                            } catch (e) {
                                currentReactions = [];
                            }

                            const newReactions = currentReactions.filter(r =>
                                !(String(r.UserId) === String(auth?.id ?? auth?.userId) && 
                                  (r.Emoji === (reaction.Emoji || reaction.Reaction) || 
                                   r.Reaction === (reaction.Emoji || reaction.Reaction)))
                            );

                            return {
                                ...m,
                                ReactionEmojis: JSON.stringify(newReactions),
                                ReactionCount: Math.max(0, (m.ReactionCount || 0) - 1)
                            };
                        }
                        return m;
                    });
                    return Array.isArray(prev) ? updatedData : { ...prev, data: updatedData };
                });

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

                if (receiverIdValue && senderId && auth?.ufcc) {
                    emitRemoveReaction({
                        ufcc: auth?.ufcc,
                        userId: senderId,
                        SenderId: senderId,
                        ReceiverId: receiverIdValue,
                        ConversationId: selectedCustomer?.ConversationId,
                        MessageId: messageIdToUse,
                        ReactionEmojis: JSON.stringify([{ Reaction: '', Direction: 0, UserId: senderId }]),
                        ...(isGroup && {
                            IsGroup: 1,
                            UserName: auth?.username || auth?.name,
                            FirstName: auth?.firstName || auth?.FirstName,
                            LastName: auth?.lastName || auth?.LastName,
                        }),
                    });
                }

                toast.success("Reaction removed!");
            }
        } catch (error) {
            console.error("Error removing reaction:", error);
            toast.error("Failed to remove reaction");
        }
    }, [auth, selectedCustomer, setMessages, fetchAndCacheGroupMembers]);

    return {
        handleMessageEmojiClick,
        handleRemoveReaction
    };
};
