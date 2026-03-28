import { useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import { addReactionApi } from '../API/SendMessage/addReactionApi';
import { removeReactionApi } from '../API/SendMessage/removeReactionApi';
import { emitSendReaction, emitRemoveReaction } from '../socket';
import { fetchGroupDetails } from '../API/Groups/FetchGroupDetails';

async function resolveReceiverId(selectedCustomer, auth) {
    if (selectedCustomer?.IsGroup === 1) {
        try {
            const groupData = await fetchGroupDetails(selectedCustomer.ConversationId, auth);
            return groupData?.members ? groupData.members.map(m => m.UserId) : [selectedCustomer?.ReceiverId];
        } catch {
            return [selectedCustomer?.ReceiverId];
        }
    }
    return selectedCustomer?.ReceiverId;
}

function parseReactions(raw) {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    try {
        return JSON.parse(raw);
    } catch {
        return raw.split(',').map(r => ({ Reaction: r, Direction: 1 }));
    }
}

export function useReactions({ auth, selectedCustomer, messagesRef, setMessages }) {
    const inFlightRef = useRef(new Map());

    const emitReaction = useCallback(async ({ messageIdToUse, reactionPayload, emoji, unified }) => {
        const senderId = auth?.id ?? auth?.userId;
        const isGroup = selectedCustomer?.IsGroup === 1;
        const receiverIdValue = await resolveReceiverId(selectedCustomer, auth);

        if (!receiverIdValue || !senderId || !auth?.ufcc) return;

        const socketEmojis = reactionPayload === ''
            ? JSON.stringify([{ Reaction: '', Direction: 0, UserId: senderId }])
            : JSON.stringify([{ Reaction: emoji, Unified: unified, Direction: 0, UserId: senderId }]);

        const payload = {
            ufcc: auth.ufcc,
            userId: senderId,
            SenderId: senderId,
            ReceiverId: receiverIdValue,
            ConversationId: selectedCustomer?.ConversationId,
            MessageId: messageIdToUse,
            ReactionEmojis: socketEmojis,
            ...(isGroup && {
                IsGroup: 1,
                UserName: auth?.username || auth?.name,
                FirstName: auth?.firstName || auth?.FirstName,
                LastName: auth?.lastName || auth?.LastName,
            }),
        };

        emitSendReaction(payload);
    }, [auth, selectedCustomer]);

    const updateLocalReactions = useCallback((messageIdToUse, reactionPayload) => {
        setMessages(prev => {
            const prevData = Array.isArray(prev) ? prev : prev?.data || [];
            const updated = prevData.map(msg =>
                String(msg?.MessageId ?? msg?.Id) === String(messageIdToUse)
                    ? { ...msg, ReactionEmojis: reactionPayload, _isFromCurrentUser: true }
                    : msg
            );
            return Array.isArray(prev) ? updated : { ...prev, data: updated };
        });
    }, [setMessages]);

    const handleMessageEmojiClick = useCallback(async (emojiObject, message) => {
        const emoji = emojiObject?.emoji || emojiObject;
        const unified = emojiObject?.unified;
        const messageIdToUse = message?.MessageId ?? message?.Id;
        if (!messageIdToUse) { toast.error('Failed to send reaction: Message ID missing'); return; }

        const key = String(messageIdToUse);
        const now = Date.now();
        const prev = inFlightRef.current.get(key) || {};
        if (prev.inFlight || now - (prev.lastSentAt || 0) < 700) return;

        inFlightRef.current.set(key, { ...prev, inFlight: true, lastSentAt: now, lastEmoji: emoji });

        try {
            const snapshot = messagesRef.current;
            const list = Array.isArray(snapshot) ? snapshot : snapshot?.data || [];
            const latestMsg = list.find(m => String(m?.MessageId ?? m?.Id) === String(messageIdToUse)) || message;
            const currentReactions = parseReactions(latestMsg?.ReactionEmojis);

            const existingIndex = currentReactions.findIndex(r => r.Direction === 1 && r.Reaction === emoji);
            let reactionPayload;
            let apiEmoji;

            if (existingIndex >= 0) {
                currentReactions.splice(existingIndex, 1);
                reactionPayload = '';
                apiEmoji = '';
            } else {
                const filtered = currentReactions.filter(r => r.Direction !== 1);
                filtered.push({
                    Reaction: emoji, Unified: unified, Direction: 1,
                    UserName: auth?.username || auth?.UserName || auth?.name,
                    UserId: auth?.id || auth?.userId,
                });
                reactionPayload = JSON.stringify(filtered);
                apiEmoji = emoji;
            }

            await addReactionApi(auth, { messageId: messageIdToUse, emoji: apiEmoji });
            await emitReaction({ messageIdToUse, reactionPayload, emoji, unified });
            updateLocalReactions(messageIdToUse, reactionPayload);

            toast(reactionPayload === '' ? 'Reaction removed!' : 'Reaction sent!');
        } catch (err) {
            console.error('Error sending reaction:', err);
            toast.error('Failed to send reaction');
        } finally {
            const state = inFlightRef.current.get(key);
            if (state) inFlightRef.current.set(key, { ...state, inFlight: false });
        }
    }, [auth, messagesRef, emitReaction, updateLocalReactions]);

    const handleRemoveReactionAction = useCallback(async (reaction, message) => {
        const messageIdToUse = message?.MessageId ?? message?.Id;
        if (!messageIdToUse || !auth) return;

        try {
            const response = await removeReactionApi(auth, { messageId: messageIdToUse });
            if (!response) return;

            setMessages(prev => {
                const prevData = Array.isArray(prev) ? prev : prev?.data || [];
                const updated = prevData.map(m => {
                    if (String(m?.MessageId ?? m?.Id) !== String(messageIdToUse)) return m;
                    const reactions = parseReactions(m.ReactionEmojis);
                    const reactionValue = reaction.Emoji || reaction.Reaction;
                    const userId = String(auth?.id ?? auth?.userId);
                    const filtered = reactions.filter(r =>
                        !(String(r.UserId) === userId && (r.Emoji === reactionValue || r.Reaction === reactionValue))
                    );
                    return { ...m, ReactionEmojis: JSON.stringify(filtered), ReactionCount: Math.max(0, (m.ReactionCount || 0) - 1) };
                });
                return Array.isArray(prev) ? updated : { ...prev, data: updated };
            });

            const senderId = auth?.id ?? auth?.userId;
            const receiverIdValue = await resolveReceiverId(selectedCustomer, auth);
            if (receiverIdValue && senderId && auth?.ufcc) {
                emitRemoveReaction({
                    ufcc: auth.ufcc, userId: senderId, SenderId: senderId,
                    ReceiverId: receiverIdValue,
                    ConversationId: selectedCustomer?.ConversationId,
                    MessageId: messageIdToUse,
                    ReactionEmojis: JSON.stringify([{ Reaction: '', Direction: 0, UserId: senderId }]),
                    ...(selectedCustomer?.IsGroup === 1 && {
                        IsGroup: 1, UserName: auth?.username || auth?.name,
                        FirstName: auth?.firstName || auth?.FirstName,
                        LastName: auth?.lastName || auth?.LastName,
                    }),
                });
            }

            toast.success('Reaction removed!');
        } catch (err) {
            console.error('Error removing reaction:', err);
            toast.error('Failed to remove reaction');
        }
    }, [auth, selectedCustomer, setMessages]);

    return { handleMessageEmojiClick, handleRemoveReactionAction };
}
